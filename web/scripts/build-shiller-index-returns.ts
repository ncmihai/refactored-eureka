/**
 * Build a monthly S&P long-history return CSV from Robert Shiller's workbook.
 *
 * Download source:
 *   curl -L -o ./data/sources/ie_data.xls \
 *     http://www.econ.yale.edu/~shiller/data/ie_data.xls
 *
 * Example:
 *   npm run build:shiller-returns -- \
 *     --input ./data/sources/ie_data.xls \
 *     --output ./data/index-returns/sp500-shiller-monthly-total-return.csv \
 *     --through 2026-04
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import * as XLSX from 'xlsx'

type Args = {
  input?: string
  output?: string
  through?: string
}

type MonthlyPoint = {
  date: string
  totalReturnPrice: number
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

function parseDate(value: unknown): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null

  const year = Math.floor(value)
  const month = Math.round((value - year) * 100 + 1e-6)
  if (year < 1800 || month < 1 || month > 12) return null

  return `${year}-${String(month).padStart(2, '0')}`
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null

  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function buildCsv(points: MonthlyPoint[]): string {
  if (points.length < 2) throw new Error('Need at least two monthly points to calculate returns')

  const lines = ['date,return']

  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1]
    const current = points[i]
    const monthlyReturn = ((current.totalReturnPrice / previous.totalReturnPrice) - 1) * 100

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

  const workbook = XLSX.read(readFileSync(input), { type: 'buffer' })
  const dataSheet = workbook.Sheets.Data
  if (!dataSheet) throw new Error('Workbook is missing the "Data" sheet')

  const rows = XLSX.utils.sheet_to_json<unknown[]>(dataSheet, {
    header: 1,
    raw: true,
    blankrows: false,
  })

  const points = rows
    .map((row): MonthlyPoint | null => {
      const date = parseDate(row[0])
      const totalReturnPrice = parseNumber(row[9])
      if (!date || totalReturnPrice === null || totalReturnPrice <= 0) return null
      return { date, totalReturnPrice }
    })
    .filter((point): point is MonthlyPoint => point !== null)
    .filter((point) => !args.through || point.date <= args.through)

  mkdirSync(dirname(output), { recursive: true })
  writeFileSync(output, buildCsv(points), 'utf8')

  const firstReturn = points[1]?.date ?? 'n/a'
  const lastReturn = points[points.length - 1]?.date ?? 'n/a'
  console.log(
    `Wrote ${points.length - 1} monthly returns to ${output} (${firstReturn} -> ${lastReturn})`,
  )
}

main()
