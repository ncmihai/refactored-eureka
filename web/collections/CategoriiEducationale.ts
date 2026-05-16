import type { Access, CollectionConfig } from 'payload'
import { auditCollectionChange } from '../lib/audit-log'

const formatSlug = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ă/g, 'a')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/ș|ş/g, 's')
    .replace(/ț|ţ/g, 't')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

const superAdminOnly: Access = ({ req }) => {
  const user = req.user as { role?: string | null } | null
  return user?.role === 'super_admin'
}

export const CategoriiEducationale: CollectionConfig = {
  slug: 'categorii-educationale',
  access: {
    read: () => true,
    create: superAdminOnly,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug'],
    description: 'Categorii pentru blogul educațional.',
    group: 'Conținut',
  },
  hooks: {
    afterChange: [auditCollectionChange('categorii-educationale', 'educational_category')],
  },
  fields: [
    { name: 'name', type: 'text', required: true, unique: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: { position: 'sidebar' },
      hooks: {
        beforeValidate: [
          ({ value, data, originalDoc }) => {
            if (typeof value === 'string' && value.length > 0) return formatSlug(value)
            const fallback = data?.name || originalDoc?.name
            return typeof fallback === 'string' ? formatSlug(fallback) : value
          },
        ],
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: { description: 'Descriere scurtă pentru listări și viitoare pagini de categorie.' },
    },
  ],
  timestamps: true,
}
