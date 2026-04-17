import type { CollectionConfig } from 'payload'

export const DobanziDepozit: CollectionConfig = {
  slug: 'dobanzi-depozit',
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
    defaultColumns: ['banca', 'moneda', 'scadentaLuni', 'dobandaBruta', 'activ'],
    description: 'Dobânzi depozit bancar per bancă, monedă și scadență.',
    group: 'Date Piață',
  },
  fields: [
    {
      name: 'nume',
      type: 'text',
      required: true,
      admin: { description: 'Ex: "BT EUR 12 luni"' },
    },
    { name: 'banca', type: 'text', required: true },
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
      name: 'scadentaLuni',
      type: 'number',
      required: true,
      admin: { description: 'Scadență în luni (ex: 3, 6, 12, 24)' },
    },
    {
      name: 'dobandaBruta',
      type: 'number',
      required: true,
      min: 0,
      max: 20,
      admin: { description: 'Procent anual brut. Ex: 5.5 pentru 5.5%' },
    },
    {
      name: 'capitalizare',
      type: 'select',
      required: true,
      defaultValue: 'at_maturity',
      options: [
        { label: 'Lunară (compus)', value: 'monthly' },
        { label: 'La scadență (simplu)', value: 'at_maturity' },
      ],
    },
    {
      name: 'sumaMinima',
      type: 'number',
      admin: { description: 'Sumă minimă depozitată' },
    },
    { name: 'activ', type: 'checkbox', defaultValue: true },
    {
      name: 'effectiveFrom',
      type: 'date',
      required: true,
    },
    {
      name: 'effectiveTo',
      type: 'date',
    },
  ],
  versions: { drafts: false, maxPerDoc: 20 },
}
