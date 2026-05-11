/**
 * Seed script pentru populare CMS cu date exemplu din piața RO.
 *
 * Rulare: npm run seed
 *
 * NOTĂ: Valorile sunt ilustrative, bazate pe gama tipică a pieței RO 2025-2026.
 * ÎNAINTE DE PRODUCȚIE / ÎNAINTE DE PITCH, verifică fiecare produs cu banca
 * sursă și actualizează prin /admin/collections/produse-credit.
 */

import 'dotenv/config'
import { getPayload } from 'payload'

import config from '../payload.config'

const today = new Date().toISOString()

const produseCredit = [
  {
    nume: 'Prima Casă 5 ani fix',
    banca: 'BCR',
    tipDobanda: 'fix_variabil' as const,
    dobandaInitiala: 5.4,
    perioadaFixa: 60,
    spread: 2.5,
    comisionLunar: 0,
    moneda: 'EUR' as const,
    sumaMinima: 10000,
    sumaMaxima: 300000,
    perioadaMaxima: 360,
    note: 'Date exemplu 2026-04 — verifică pe site-ul BCR.',
  },
  {
    nume: 'Credit Ipotecar 3 ani fix',
    banca: 'Banca Transilvania',
    tipDobanda: 'fix_variabil' as const,
    dobandaInitiala: 4.9,
    perioadaFixa: 36,
    spread: 2.2,
    comisionLunar: 0,
    moneda: 'EUR' as const,
    sumaMinima: 10000,
    sumaMaxima: 500000,
    perioadaMaxima: 360,
    note: 'Date exemplu 2026-04.',
  },
  {
    nume: 'ING Home Bank 7 ani fix',
    banca: 'ING',
    tipDobanda: 'fix_variabil' as const,
    dobandaInitiala: 5.9,
    perioadaFixa: 84,
    spread: 2.0,
    comisionLunar: 0,
    moneda: 'EUR' as const,
    sumaMinima: 20000,
    sumaMaxima: 400000,
    perioadaMaxima: 360,
    note: 'Date exemplu 2026-04.',
  },
  {
    nume: 'Raiffeisen Flexi 10 ani fix',
    banca: 'Raiffeisen',
    tipDobanda: 'fix_variabil' as const,
    dobandaInitiala: 6.2,
    perioadaFixa: 120,
    spread: 2.3,
    comisionLunar: 5,
    moneda: 'EUR' as const,
    sumaMinima: 15000,
    sumaMaxima: 350000,
    perioadaMaxima: 360,
    note: 'Date exemplu 2026-04.',
  },
  {
    nume: 'Credit Nevoi Personale',
    banca: 'BCR',
    tipDobanda: 'fix' as const,
    dobandaInitiala: 10.5,
    comisionLunar: 0,
    moneda: 'RON' as const,
    sumaMinima: 1000,
    sumaMaxima: 150000,
    perioadaMaxima: 60,
    note: 'Consumer loan — date exemplu 2026-04.',
  },
  {
    nume: 'Ipotecar IRCC Variabil',
    banca: 'Banca Transilvania',
    tipDobanda: 'variabil' as const,
    dobandaInitiala: 7.8,
    spread: 2.0,
    comisionLunar: 0,
    moneda: 'RON' as const,
    sumaMinima: 50000,
    sumaMaxima: 1500000,
    perioadaMaxima: 360,
    note: 'IRCC + spread — date exemplu 2026-04 (IRCC ~5.8%).',
  },
]

const dobanziDepozit = [
  {
    nume: 'BT EUR 3 luni',
    banca: 'Banca Transilvania',
    moneda: 'EUR' as const,
    scadentaLuni: 3,
    dobandaBruta: 1.2,
    capitalizare: 'at_maturity' as const,
    sumaMinima: 500,
  },
  {
    nume: 'BT EUR 12 luni',
    banca: 'Banca Transilvania',
    moneda: 'EUR' as const,
    scadentaLuni: 12,
    dobandaBruta: 2.0,
    capitalizare: 'at_maturity' as const,
    sumaMinima: 500,
  },
  {
    nume: 'BT RON 12 luni',
    banca: 'Banca Transilvania',
    moneda: 'RON' as const,
    scadentaLuni: 12,
    dobandaBruta: 6.25,
    capitalizare: 'at_maturity' as const,
    sumaMinima: 1000,
  },
  {
    nume: 'ING EUR 6 luni',
    banca: 'ING',
    moneda: 'EUR' as const,
    scadentaLuni: 6,
    dobandaBruta: 1.8,
    capitalizare: 'at_maturity' as const,
    sumaMinima: 1000,
  },
  {
    nume: 'ING RON 24 luni',
    banca: 'ING',
    moneda: 'RON' as const,
    scadentaLuni: 24,
    dobandaBruta: 6.5,
    capitalizare: 'monthly' as const,
    sumaMinima: 1000,
  },
  {
    nume: 'BCR EUR 12 luni',
    banca: 'BCR',
    moneda: 'EUR' as const,
    scadentaLuni: 12,
    dobandaBruta: 1.5,
    capitalizare: 'at_maturity' as const,
    sumaMinima: 500,
  },
  {
    nume: 'BCR RON 6 luni',
    banca: 'BCR',
    moneda: 'RON' as const,
    scadentaLuni: 6,
    dobandaBruta: 5.8,
    capitalizare: 'at_maturity' as const,
    sumaMinima: 500,
  },
  {
    nume: 'Raiffeisen USD 12 luni',
    banca: 'Raiffeisen',
    moneda: 'USD' as const,
    scadentaLuni: 12,
    dobandaBruta: 3.0,
    capitalizare: 'at_maturity' as const,
    sumaMinima: 1000,
  },
]

const fonduriEtf = [
  {
    nume: 'Vanguard FTSE All-World UCITS ETF Acc',
    ticker: 'VWCE',
    isin: 'IE00BK5BQT80',
    provider: 'Vanguard',
    moneda: 'EUR' as const,
    ter: 0.22,
    indiceReferinta: 'FTSE_ALL_WORLD' as const,
    exchange: 'XETRA',
    accumulating: true,
    sursaTer: 'factsheet' as const,
    sourceUrl: 'https://www.vanguard.co.uk/',
    note: 'Date exemplu — verifică TER/listing în factsheet înainte de pitch.',
  },
  {
    nume: 'iShares Core S&P 500 UCITS ETF Acc',
    ticker: 'SXR8',
    isin: 'IE00B5BMR087',
    provider: 'iShares',
    moneda: 'EUR' as const,
    ter: 0.07,
    indiceReferinta: 'SP500' as const,
    exchange: 'XETRA',
    accumulating: true,
    sursaTer: 'factsheet' as const,
    sourceUrl: 'https://www.ishares.com/',
    note: 'Date exemplu — verifică TER/listing în factsheet înainte de pitch.',
  },
  {
    nume: 'Vanguard S&P 500 UCITS ETF Acc',
    ticker: 'VUAA',
    isin: 'IE00BFMXXD54',
    provider: 'Vanguard',
    moneda: 'EUR' as const,
    ter: 0.07,
    indiceReferinta: 'SP500' as const,
    exchange: 'XETRA',
    accumulating: true,
    sursaTer: 'factsheet' as const,
    sourceUrl: 'https://www.vanguard.co.uk/',
    note: 'Date exemplu — verifică TER/listing în factsheet înainte de pitch.',
  },
  {
    nume: 'iShares Core MSCI World UCITS ETF Acc',
    ticker: 'EUNL',
    isin: 'IE00B4L5Y983',
    provider: 'iShares',
    moneda: 'EUR' as const,
    ter: 0.2,
    indiceReferinta: 'MSCI_WORLD' as const,
    exchange: 'XETRA',
    accumulating: true,
    sursaTer: 'factsheet' as const,
    sourceUrl: 'https://www.ishares.com/',
    note: 'Date exemplu — verifică TER/listing în factsheet înainte de pitch.',
  },
  {
    nume: 'Xtrackers MSCI World UCITS ETF 1C',
    ticker: 'XDWD',
    isin: 'IE00BJ0KDQ92',
    provider: 'Xtrackers',
    moneda: 'EUR' as const,
    ter: 0.19,
    indiceReferinta: 'MSCI_WORLD' as const,
    exchange: 'XETRA',
    accumulating: true,
    sursaTer: 'factsheet' as const,
    sourceUrl: 'https://etf.dws.com/',
    note: 'Date exemplu — verifică TER/listing în factsheet înainte de pitch.',
  },
  {
    nume: 'iShares STOXX Europe 600 UCITS ETF DE',
    ticker: 'EXSA',
    isin: 'DE0002635307',
    provider: 'iShares',
    moneda: 'EUR' as const,
    ter: 0.2,
    indiceReferinta: 'STOXX_600' as const,
    exchange: 'XETRA',
    accumulating: false,
    sursaTer: 'factsheet' as const,
    sourceUrl: 'https://www.ishares.com/',
    note: 'Date exemplu — distribuție, verifică clasă/listing înainte de pitch.',
  },
  {
    nume: 'Xtrackers STOXX Europe 600 UCITS ETF 1C',
    ticker: 'XSX6',
    isin: 'LU0328475792',
    provider: 'Xtrackers',
    moneda: 'EUR' as const,
    ter: 0.2,
    indiceReferinta: 'STOXX_600' as const,
    exchange: 'XETRA',
    accumulating: true,
    sursaTer: 'factsheet' as const,
    sourceUrl: 'https://etf.dws.com/',
    note: 'Date exemplu — verifică TER/listing în factsheet înainte de pitch.',
  },
  {
    nume: 'Patria-TradeVille BET ETF',
    ticker: 'TVBETETF',
    provider: 'Patria Asset Management',
    moneda: 'RON' as const,
    ter: 1.8,
    indiceReferinta: 'BET' as const,
    exchange: 'BVB',
    accumulating: false,
    sursaTer: 'manual' as const,
    sourceUrl: 'https://patriafonduri.ro/',
    note: 'Date exemplu pentru expunere BET — verifică factsheet și costuri curente înainte de pitch.',
  },
]

const inflatii = [
  { nume: 'RON 2025', moneda: 'RON' as const, an: 2025, rata: 5.2, default: true },
  { nume: 'RON 2026', moneda: 'RON' as const, an: 2026, rata: 4.5, default: true },
  { nume: 'EUR 2025', moneda: 'EUR' as const, an: 2025, rata: 2.4, default: true },
  { nume: 'EUR 2026', moneda: 'EUR' as const, an: 2026, rata: 2.1, default: true },
  { nume: 'USD 2025', moneda: 'USD' as const, an: 2025, rata: 2.9, default: true },
]

const cursuri = [
  { pereche: 'EUR_RON' as const, data: '2026-04-17', curs: 4.9765, sursa: 'manual' as const },
  { pereche: 'USD_RON' as const, data: '2026-04-17', curs: 4.5823, sursa: 'manual' as const },
]

async function existsBySlug(
  payload: Awaited<ReturnType<typeof getPayload>>,
  collection: 'produse-credit' | 'dobanzi-depozit' | 'fonduri-etf' | 'inflatii',
  nume: string,
) {
  const res = await payload.find({
    collection,
    where: { nume: { equals: nume } },
    limit: 1,
  })
  return res.totalDocs > 0
}

async function main() {
  console.log('🌱 Seed start...')
  const payload = await getPayload({ config })

  let created = 0
  let skipped = 0

  for (const p of produseCredit) {
    if (await existsBySlug(payload, 'produse-credit', p.nume)) {
      console.log(`  ⏭  Skip (exists): ${p.nume}`)
      skipped++
      continue
    }
    await payload.create({
      collection: 'produse-credit',
      data: { ...p, activ: true, effectiveFrom: today },
    })
    console.log(`  ✓  Credit: ${p.banca} — ${p.nume}`)
    created++
  }

  for (const d of dobanziDepozit) {
    if (await existsBySlug(payload, 'dobanzi-depozit', d.nume)) {
      console.log(`  ⏭  Skip (exists): ${d.nume}`)
      skipped++
      continue
    }
    await payload.create({
      collection: 'dobanzi-depozit',
      data: { ...d, activ: true, effectiveFrom: today },
    })
    console.log(`  ✓  Depozit: ${d.banca} — ${d.nume}`)
    created++
  }

  for (const etf of fonduriEtf) {
    if (await existsBySlug(payload, 'fonduri-etf', etf.nume)) {
      console.log(`  ⏭  Skip (exists): ${etf.nume}`)
      skipped++
      continue
    }
    await payload.create({
      collection: 'fonduri-etf',
      data: { ...etf, activ: true, effectiveFrom: today },
    })
    console.log(`  ✓  ETF: ${etf.ticker} — ${etf.nume}`)
    created++
  }

  for (const i of inflatii) {
    if (await existsBySlug(payload, 'inflatii', i.nume)) {
      console.log(`  ⏭  Skip (exists): ${i.nume}`)
      skipped++
      continue
    }
    await payload.create({
      collection: 'inflatii',
      data: { ...i, activ: true },
    })
    console.log(`  ✓  Inflație: ${i.nume}`)
    created++
  }

  for (const c of cursuri) {
    const existing = await payload.find({
      collection: 'cursuri-valutare',
      where: {
        and: [
          { pereche: { equals: c.pereche } },
          { data: { equals: c.data } },
        ],
      },
      limit: 1,
    })
    if (existing.totalDocs > 0) {
      console.log(`  ⏭  Skip (exists): Curs ${c.pereche} ${c.data}`)
      skipped++
      continue
    }
    await payload.create({ collection: 'cursuri-valutare', data: c })
    console.log(`  ✓  Curs: ${c.pereche} ${c.data} = ${c.curs}`)
    created++
  }

  console.log(`\n✅ Seed done. Created: ${created}, Skipped: ${skipped}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('❌ Seed error:', err)
  process.exit(1)
})
