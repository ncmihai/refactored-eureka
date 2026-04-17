import type { CollectionConfig } from 'payload'

export const ProduseCredit: CollectionConfig = {
  slug: 'produse-credit',
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
    defaultColumns: ['nume', 'banca', 'tipDobanda', 'dobandaInitiala', 'activ'],
    description: 'Produse de creditare bancare — folosite în Simulator Credit & Optimizare.',
    group: 'Date Piață',
  },
  fields: [
    { name: 'nume', type: 'text', required: true, admin: { description: 'Ex: "Prima Casă 5 ani fix"' } },
    { name: 'banca', type: 'text', required: true },
    {
      name: 'tipDobanda',
      type: 'select',
      required: true,
      defaultValue: 'fix_variabil',
      options: [
        { label: 'Fix pe toată perioada', value: 'fix' },
        { label: 'Variabil (IRCC)', value: 'variabil' },
        { label: 'Fix → Variabil', value: 'fix_variabil' },
      ],
    },
    {
      name: 'dobandaInitiala',
      type: 'number',
      required: true,
      min: 0,
      max: 20,
      admin: { description: 'Procent anual. Ex: 4.9 pentru 4.9%' },
    },
    {
      name: 'perioadaFixa',
      type: 'number',
      min: 0,
      max: 360,
      admin: { description: 'Luni cu dobândă fixă (pentru "Fix → Variabil")' },
    },
    {
      name: 'spread',
      type: 'number',
      admin: { description: 'Marja peste IRCC după perioada fixă (procent)' },
    },
    {
      name: 'comisionLunar',
      type: 'number',
      defaultValue: 0,
      admin: { description: 'Comision lunar administrare (EUR/RON)' },
    },
    {
      name: 'moneda',
      type: 'select',
      required: true,
      defaultValue: 'EUR',
      options: [
        { label: 'EUR', value: 'EUR' },
        { label: 'RON', value: 'RON' },
      ],
    },
    {
      name: 'sumaMinima',
      type: 'number',
      admin: { description: 'Sumă minimă împrumutată' },
    },
    {
      name: 'sumaMaxima',
      type: 'number',
    },
    {
      name: 'perioadaMaxima',
      type: 'number',
      admin: { description: 'Luni' },
    },
    {
      name: 'note',
      type: 'textarea',
      admin: { description: 'Observații interne — nu se afișează utilizatorilor finali.' },
    },
    { name: 'activ', type: 'checkbox', defaultValue: true },
    {
      name: 'effectiveFrom',
      type: 'date',
      required: true,
      admin: { description: 'Data de la care parametrii sunt valabili' },
    },
    {
      name: 'effectiveTo',
      type: 'date',
      admin: { description: 'Opțional — dacă produsul este retras' },
    },
  ],
  versions: {
    drafts: false,
    maxPerDoc: 20,
  },
}
