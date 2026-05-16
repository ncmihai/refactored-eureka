import type { CollectionConfig } from 'payload'
import { auditCollectionChange } from '../lib/audit-log'

export const FonduriETF: CollectionConfig = {
  slug: 'fonduri-etf',
  access: {
    read: ({ req }) => {
      if (req.user) return true
      return {
        activ: { equals: true },
      }
    },
  },
  admin: {
    useAsTitle: 'nume',
    defaultColumns: ['ticker', 'nume', 'provider', 'moneda', 'ter', 'indiceReferinta', 'activ'],
    description: 'Fonduri ETF folosite în simulatorul ETF și viitorul comparator investițional.',
    group: 'Date Piață',
  },
  hooks: {
    afterChange: [auditCollectionChange('fonduri-etf', 'market_data')],
  },
  fields: [
    {
      name: 'nume',
      type: 'text',
      required: true,
      admin: { description: 'Ex: "Vanguard FTSE All-World UCITS ETF"' },
    },
    {
      name: 'ticker',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'Ticker listat, ex: VWCE, SXR8, EUNL.' },
    },
    {
      name: 'isin',
      type: 'text',
      admin: { description: 'ISIN, dacă este disponibil.' },
    },
    {
      name: 'provider',
      type: 'text',
      required: true,
      admin: { description: 'Ex: Vanguard, iShares, Xtrackers.' },
    },
    {
      name: 'moneda',
      type: 'select',
      required: true,
      defaultValue: 'EUR',
      options: [
        { label: 'EUR', value: 'EUR' },
        { label: 'RON', value: 'RON' },
        { label: 'USD', value: 'USD' },
      ],
    },
    {
      name: 'ter',
      type: 'number',
      required: true,
      min: 0,
      max: 5,
      admin: { description: 'TER anual în procente. Ex: 0.22 pentru 0.22%.' },
    },
    {
      name: 'indiceReferinta',
      type: 'select',
      required: true,
      options: [
        { label: 'S&P 500', value: 'SP500' },
        { label: 'MSCI World', value: 'MSCI_WORLD' },
        { label: 'FTSE All-World', value: 'FTSE_ALL_WORLD' },
        { label: 'STOXX Europe 600', value: 'STOXX_600' },
        { label: 'BET', value: 'BET' },
        { label: 'Other / custom', value: 'OTHER' },
      ],
    },
    {
      name: 'exchange',
      type: 'text',
      admin: { description: 'Bursă/listing principal, ex: XETRA, LSE, BVB.' },
    },
    {
      name: 'accumulating',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Bifat pentru clase cu acumulare; debifat pentru distribuție.' },
    },
    {
      name: 'sursaTer',
      type: 'select',
      defaultValue: 'manual',
      options: [
        { label: 'Manual', value: 'manual' },
        { label: 'Provider factsheet', value: 'factsheet' },
        { label: 'yfinance', value: 'yfinance' },
      ],
    },
    {
      name: 'sourceUrl',
      type: 'text',
      admin: { description: 'URL factsheet/sursă pentru audit.' },
    },
    {
      name: 'note',
      type: 'textarea',
      admin: { description: 'Observații interne — sursă, listing alternativ, limitări.' },
    },
    { name: 'activ', type: 'checkbox', defaultValue: true },
    {
      name: 'effectiveFrom',
      type: 'date',
      required: true,
      admin: { description: 'Data de la care parametrii sunt valabili.' },
    },
    {
      name: 'effectiveTo',
      type: 'date',
      admin: { description: 'Opțional — dacă ETF-ul este retras sau parametrul nu mai este valid.' },
    },
  ],
  versions: { drafts: false, maxPerDoc: 20 },
}
