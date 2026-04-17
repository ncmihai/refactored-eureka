import type { CollectionConfig } from 'payload'

export const Inflatii: CollectionConfig = {
  slug: 'inflatii',
  access: {
    read: ({ req }) => {
      if (req.user) return true
      return { activ: { equals: true } }
    },
  },
  admin: {
    useAsTitle: 'nume',
    defaultColumns: ['moneda', 'an', 'rata', 'activ'],
    description: 'Rate de inflație anuale per monedă (pentru toggle nominal ↔ real).',
    group: 'Date Piață',
  },
  fields: [
    {
      name: 'nume',
      type: 'text',
      required: true,
      admin: { description: 'Ex: "RON 2025"' },
    },
    {
      name: 'moneda',
      type: 'select',
      required: true,
      options: [
        { label: 'RON', value: 'RON' },
        { label: 'EUR', value: 'EUR' },
        { label: 'USD', value: 'USD' },
      ],
    },
    {
      name: 'an',
      type: 'number',
      required: true,
      min: 1990,
      max: 2100,
    },
    {
      name: 'rata',
      type: 'number',
      required: true,
      admin: { description: 'Procent anual. Ex: 5.2 pentru 5.2%' },
    },
    {
      name: 'default',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Marchează ca default pentru moneda/anul curent — populează automat în UI.',
      },
    },
    { name: 'activ', type: 'checkbox', defaultValue: true },
  ],
}
