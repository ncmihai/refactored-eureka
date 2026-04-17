import type { CollectionConfig } from 'payload'

export const CursuriValutare: CollectionConfig = {
  slug: 'cursuri-valutare',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'pereche',
    defaultColumns: ['pereche', 'data', 'curs'],
    description: 'Cursuri valutare EUR/RON, USD/RON (istorice + live).',
    group: 'Date Piață',
  },
  fields: [
    {
      name: 'pereche',
      type: 'select',
      required: true,
      options: [
        { label: 'EUR/RON', value: 'EUR_RON' },
        { label: 'USD/RON', value: 'USD_RON' },
      ],
    },
    { name: 'data', type: 'date', required: true },
    {
      name: 'curs',
      type: 'number',
      required: true,
      admin: { description: 'Curs mediu BNR' },
    },
    {
      name: 'sursa',
      type: 'select',
      defaultValue: 'BNR',
      options: [
        { label: 'BNR', value: 'BNR' },
        { label: 'Manual', value: 'manual' },
        { label: 'Import CSV', value: 'csv' },
      ],
    },
  ],
}
