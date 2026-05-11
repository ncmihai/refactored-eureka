/**
 * Import monthly historical index returns into Payload.
 *
 * Expected CSV headers:
 *   date, return
 *
 * Accepted aliases:
 *   date: data, month, luna
 *   return: randament, randament_lunar, monthly_return
 *
 * Values are stored as percentages in CMS. By default `return=2.35` means
 * +2.35%. Pass `--format decimal` when the CSV uses 0.0235 for +2.35%.
 *
 * Example:
 *   npm run import:index-returns -- \
 *     --file ./data/sp500-monthly.csv \
 *     --indice SP500 \
 *     --moneda USD \
 *     --source-url https://example.com/dataset
 */

import 'dotenv/config'
import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { basename } from 'path'
import { getPayload } from 'payload'

import config from '../payload.config'

const INDEX_LABELS: Record<string, string> = {
  SP500: 'S&P 500',
  MSCI_WORLD: 'MSCI World',
  FTSE_ALL_WORLD: 'FTSE All-World',
  STOXX_600: 'STOXX Europe 600',
  BET: 'BET',
  OTHER: 'Other',
}

type Args = {
  batch?: string
  file?: string
  format: 'decimal' | 'percent'
  indice?: keyof typeof INDEX_LABELS
  moneda: 'EUR' | 'RON' | 'USD'
  source: 'csv' | 'manual' | 'yfinance' | 'licensed_feed'
  sourceUrl?: string
  update: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    format: 'percent',
    moneda: 'USD',
    source: 'csv',
    update: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = argv[i + 1]

    if (arg === '--update') {
      args.update = true
      continue
    }

    if (!next) {
      throw new Error(`Missing value for ${arg}`)
    }

    if (arg === '--file') args.file = next
    else if (arg === '--indice') args.indice = next as Args['indice']
    else if (arg === '--moneda') args.moneda = next as Args['moneda']
    else if (arg === '--source') args.source = next as Args['source']
    else if (arg === '--source-url') args.sourceUrl = next
    else if (arg === '--format') args.format = next as Args['format']
    else if (arg === '--batch') args.batch = next
    else throw new Error(`Unknown argument: ${arg}`)

    i++
  }

  if (!args.file) throw new Error('Missing required --file')
  if (!args.indice) throw new Error('Missing required --indice')
  if (!INDEX_LABELS[args.indice]) throw new Error(`Unknown --indice: ${args.indice}`)
  if (!['EUR', 'RON', 'USD'].includes(args.moneda)) throw new Error(`Unknown --moneda: ${args.moneda}`)
  if (!['csv', 'manual', 'yfinance', 'licensed_feed'].includes(args.source)) {
    throw new Error(`Unknown --source: ${args.source}`)
  }
  if (!['percent', 'decimal'].includes(args.format)) {
    throw new Error(`Unknown --format: ${args.format}`)
  }

  return args
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"' && quoted && next === '"') {
      cell += '"'
      i++
      continue
    }

    if (char === '"') {
      quoted = !quoted
      continue
    }

    if (char === ',' && !quoted) {
      cells.push(cell.trim())
      cell = ''
      continue
    }

    cell += char
  }

  cells.push(cell.trim())
  return cells
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_')
}

function firstPresent(headers: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const index = headers.indexOf(alias)
    if (index >= 0) return index
  }
  return -1
}

function monthStart(value: string): string {
  const trimmed = value.trim()
  const match = /^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?$/.exec(trimmed)
  if (!match) {
    throw new Error(`Invalid date "${value}". Use YYYY-MM or YYYY-MM-DD.`)
  }

  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) throw new Error(`Invalid month in date "${value}"`)

  return `${year}-${String(month).padStart(2, '0')}-01`
}

function parseReturn(value: string, format: Args['format']): number {
  const cleaned = value.trim().replace('%', '').replace(',', '.')
  const raw = Number(cleaned)
  if (!Number.isFinite(raw)) throw new Error(`Invalid return value "${value}"`)
  return format === 'decimal' ? raw * 100 : raw
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const file = args.file
  const indice = args.indice

  if (!file || !indice) throw new Error('Missing required --file or --indice')

  const csv = readFileSync(file, 'utf8')
  const checksum = createHash('sha256').update(csv).digest('hex')
  const batch =
    args.batch ??
    `import-${new Date().toISOString().slice(0, 10)}-${indice.toLowerCase()}-${basename(file)}`

  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))

  if (lines.length < 2) throw new Error('CSV must include a header row and at least one data row')

  const headers = parseCsvLine(lines[0]).map(normalizeHeader)
  const dateIndex = firstPresent(headers, ['date', 'data', 'month', 'luna'])
  const returnIndex = firstPresent(headers, ['return', 'randament', 'randament_lunar', 'monthly_return'])

  if (dateIndex < 0) throw new Error('CSV is missing a date column')
  if (returnIndex < 0) throw new Error('CSV is missing a return/randament column')

  const payload = await getPayload({ config })
  let created = 0
  let updated = 0
  let skipped = 0

  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line)
    const data = monthStart(cells[dateIndex] ?? '')
    const randamentLunar = parseReturn(cells[returnIndex] ?? '', args.format)
    const nume = `${INDEX_LABELS[indice]} ${data.slice(0, 7)}`

    const existing = await payload.find({
      collection: 'indici-istorici',
      where: {
        and: [
          { indice: { equals: indice } },
          { data: { equals: data } },
        ],
      },
      limit: 1,
    })

    const record = {
      nume,
      indice,
      data,
      randamentLunar,
      moneda: args.moneda,
      sursa: args.source,
      sourceUrl: args.sourceUrl,
      checksum,
      importBatch: batch,
      activ: true,
    }

    if (existing.totalDocs > 0) {
      if (!args.update) {
        skipped++
        continue
      }
      await payload.update({
        collection: 'indici-istorici',
        id: existing.docs[0].id,
        data: record,
      })
      updated++
      continue
    }

    await payload.create({
      collection: 'indici-istorici',
      data: record,
    })
    created++
  }

  console.log(
    `Imported ${indice} returns. Created: ${created}, Updated: ${updated}, Skipped: ${skipped}. Batch: ${batch}`,
  )
  process.exit(0)
}

main().catch((err) => {
  console.error('Import failed:', err)
  process.exit(1)
})
