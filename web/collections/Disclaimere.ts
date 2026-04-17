import type { CollectionConfig } from 'payload'

export const Disclaimere: CollectionConfig = {
  slug: 'disclaimere',
  access: {
    read: ({ req }) => {
      if (req.user) return true
      return { activ: { equals: true } }
    },
  },
  admin: {
    useAsTitle: 'nume',
    defaultColumns: ['nume', 'modul', 'limba', 'versiune', 'activ'],
    description:
      'Disclaimere versionate per modul (Credit, Optimizare, Depozit etc.) — afișate în UI și în PDF.',
    group: 'Conținut',
  },
  fields: [
    {
      name: 'nume',
      type: 'text',
      required: true,
      admin: { description: 'Ex: "Disclaimer Simulator Credit RO v2"' },
    },
    {
      name: 'modul',
      type: 'select',
      required: true,
      options: [
        { label: 'General', value: 'general' },
        { label: 'Simulator Credit', value: 'credit' },
        { label: 'Optimizare Credit', value: 'optimizare' },
        { label: 'Depozit Bancar', value: 'depozit' },
        { label: 'Investiții UL', value: 'ul' },
        { label: 'Investiții ETF', value: 'etf' },
        { label: 'Pensie / Decumulation', value: 'pensie' },
      ],
    },
    {
      name: 'limba',
      type: 'select',
      required: true,
      defaultValue: 'ro',
      options: [
        { label: 'Română', value: 'ro' },
        { label: 'English', value: 'en' },
      ],
    },
    {
      name: 'versiune',
      type: 'text',
      required: true,
      admin: { description: 'Ex: "v1", "2026-04-17"' },
    },
    {
      name: 'continut',
      type: 'richText',
      required: true,
    },
    { name: 'activ', type: 'checkbox', defaultValue: true },
  ],
  versions: { drafts: false, maxPerDoc: 50 },
}
