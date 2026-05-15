/**
 * Build monthly return CSVs from Yahoo Finance chart JSON exports.
 *
 * Download example:
 *   curl -L --user-agent "Mozilla/5.0" \
 *     --header "Accept: application/json,text/plain" \
 *     -o /tmp/yahoo-iwda.json \
 *     "https://query2.finance.yahoo.com/v8/finance/chart/IWDA.AS?period1=0&period2=1778716800&interval=1mo&events=history&includeAdjustedClose=true"
 *
 * Transform example:
 *   npm run build:yahoo-returns -- \
 *     --input /tmp/yahoo-iwda.json \
 *     --output ./data/index-returns/msci-world-iwda-monthly-adjusted-return.csv \
 *     --through 2026-04
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname } from 'path'

type Args = {
  input?: string
  output?: string
  through?: string
}

type YahooChartResponse = {
  chart: {
    error: unknown
    result?: Array<{
      meta?: {
        currency?: string
        exchangeTimezoneName?: string
        symbol?: string
      }
      timestamp?: number[]
      indicators?: {
        adjclose?: Array<{ adjclose?: Array<number | null> }>
        quote?: Array<{ close?: Array<number | null> }>
      }
    }>
  }
}

type MonthlyPoint = {
  date: string
  value: number
}

function parseArgs(argv: string[]): Args {
  const args: Args = {}

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = argv[i + 1]

    if (!next) throw new Error(`Missing value for ${arg}`)

    if (arg === '--input') args.input = next
    else if (arg === '--output') args.output = next
    else if (arg === '--through') args.through = next
    else throw new Error(`Unknown argument: ${arg}`)

    i++
  }

  if (!args.input) throw new Error('Missing required --input')
  if (!args.output) throw new Error('Missing required --output')
  if (args.through && !/^\d{4}-\d{2}$/.test(args.through)) {
    throw new Error('Invalid --through value. Use YYYY-MM.')
  }

  return args
}

function monthInTimezone(timestamp: number, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    month: '2-digit',
    timeZone: timezone,
    year: 'numeric',
  }).formatToParts(new Date(timestamp * 1000))

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  if (!year || !month) throw new Error(`Could not derive month for timestamp ${timestamp}`)

  return `${year}-${month}`
}

function buildCsv(points: MonthlyPoint[]): string {
  if (points.length < 2) throw new Error('Need at least two monthly points to calculate returns')

  const lines = ['date,return']

  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1]
    const current = points[i]
    const monthlyReturn = ((current.value / previous.value) - 1) * 100

    if (!Number.isFinite(monthlyReturn)) {
      throw new Error(`Invalid return for ${current.date}`)
    }

    lines.push(`${current.date},${monthlyReturn.toFixed(6)}`)
  }

  return `${lines.join('\n')}\n`
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const input = args.input
  const output = args.output

  if (!input || !output) throw new Error('Missing required --input or --output')

  const parsed = JSON.parse(readFileSync(input, 'utf8')) as YahooChartResponse
  if (parsed.chart.error) throw new Error(`Yahoo chart error: ${JSON.stringify(parsed.chart.error)}`)

  const result = parsed.chart.result?.[0]
  if (!result) throw new Error('Yahoo chart response has no result')

  const timestamps = result.timestamp ?? []
  const values = result.indicators?.adjclose?.[0]?.adjclose ?? result.indicators?.quote?.[0]?.close ?? []
  const timezone = result.meta?.exchangeTimezoneName ?? 'UTC'

  const points = timestamps
    .map((timestamp, index): MonthlyPoint | null => {
      const value = values[index]
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null

      const date = monthInTimezone(timestamp, timezone)
      if (args.through && date > args.through) return null

      return { date, value }
    })
    .filter((point): point is MonthlyPoint => point !== null)
    .filter((point, index, rows) => index === 0 || point.date !== rows[index - 1].date)

  mkdirSync(dirname(output), { recursive: true })
  writeFileSync(output, buildCsv(points), 'utf8')

  const firstReturn = points[1]?.date ?? 'n/a'
  const lastReturn = points[points.length - 1]?.date ?? 'n/a'
  const symbol = result.meta?.symbol ?? 'unknown symbol'
  const currency = result.meta?.currency ?? 'unknown currency'

  console.log(
    `Wrote ${points.length - 1} monthly returns to ${output} from ${symbol} (${currency}, ${firstReturn} -> ${lastReturn})`,
  )
}

main()
