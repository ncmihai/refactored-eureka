import type { CollectionConfig } from 'payload'

export const Firme: CollectionConfig = {
  slug: 'firme',
  admin: {
    useAsTitle: 'nume',
    defaultColumns: ['nume', 'slug', 'activ'],
    description: 'Firme de consultanță financiară (B2B tenants). Fiecare firmă are propriul branding pentru PDF-uri white-label.',
    group: 'Cont & Acces',
  },
  fields: [
    { name: 'nume', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
      required: false,
    },
    {
      name: 'brandColor',
      type: 'text',
      admin: { description: 'Hex color pentru accent în PDF-uri white-label' },
    },
    { name: 'activ', type: 'checkbox', defaultValue: true },
  ],
}
