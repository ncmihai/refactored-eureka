import type { CollectionConfig } from 'payload'

export const IndiciIstorici: CollectionConfig = {
  slug: 'indici-istorici',
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
    defaultColumns: ['indice', 'data', 'randamentLunar', 'moneda', 'sursa'],
    description: 'Randamente lunare istorice pentru Monte Carlo historical bootstrap.',
    group: 'Date Piață',
  },
  fields: [
    {
      name: 'nume',
      type: 'text',
      required: true,
      admin: { description: 'Cheie lizibilă, ex: "S&P 500 2024-12".' },
    },
    {
      name: 'indice',
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
      name: 'data',
      type: 'date',
      required: true,
      admin: { description: 'Luna randamentului. Folosește prima zi din lună, ex: 2024-12-01.' },
    },
    {
      name: 'randamentLunar',
      type: 'number',
      required: true,
      min: -100,
      max: 100,
      admin: { description: 'Randament lunar în procente. Ex: 2.35 pentru +2.35%.' },
    },
    {
      name: 'moneda',
      type: 'select',
      required: true,
      defaultValue: 'USD',
      options: [
        { label: 'EUR', value: 'EUR' },
        { label: 'RON', value: 'RON' },
        { label: 'USD', value: 'USD' },
      ],
    },
    {
      name: 'sursa',
      type: 'select',
      required: true,
      defaultValue: 'csv',
      options: [
        { label: 'Import CSV', value: 'csv' },
        { label: 'Manual', value: 'manual' },
        { label: 'yfinance', value: 'yfinance' },
        { label: 'Provider / licensed feed', value: 'licensed_feed' },
      ],
    },
    {
      name: 'sourceUrl',
      type: 'text',
      admin: { description: 'URL sursă sau referință dataset.' },
    },
    {
      name: 'checksum',
      type: 'text',
      admin: { description: 'Checksum al fișierului importat pentru audit/reproducibilitate.' },
    },
    {
      name: 'importBatch',
      type: 'text',
      admin: { description: 'ID batch import, ex: import-2026-05-11-sp500.' },
    },
    { name: 'activ', type: 'checkbox', defaultValue: true },
  ],
  indexes: [
    {
      fields: ['indice', 'data'],
      unique: true,
    },
  ],
  versions: { drafts: false, maxPerDoc: 10 },
}
