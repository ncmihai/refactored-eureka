import type { Access, CollectionConfig } from 'payload'
import { revalidatePath } from 'next/cache'
import { auditCollectionChange } from '../lib/audit-log'

const relatedToolOptions = [
  { label: 'Simulator Credit', value: 'credit' },
  { label: 'Optimizare Credit', value: 'optimizare' },
  { label: 'Depozit Bancar', value: 'depozit' },
  { label: 'Investiții ETF', value: 'investitii' },
  { label: 'Unit-Linked', value: 'unit_linked' },
  { label: 'Comparator', value: 'comparator' },
  { label: 'General', value: 'general' },
] as const

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

export const ContinutEducational: CollectionConfig = {
  slug: 'continut-educational',
  access: {
    read: ({ req }) => {
      const user = req.user as { role?: string | null } | null
      if (user?.role === 'super_admin') return true
      return { _status: { equals: 'published' } }
    },
    create: superAdminOnly,
    update: superAdminOnly,
    delete: superAdminOnly,
    readVersions: superAdminOnly,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'relatedTool', 'publishedAt', '_status'],
    description: 'Articole educaționale RO pentru blog, SEO și funnel demo.',
    group: 'Conținut',
  },
  hooks: {
    afterChange: [
      auditCollectionChange('continut-educational', 'educational_content'),
      ({ doc, req }) => {
        if (req?.method !== 'GET') {
          revalidatePath('/blog')
          if (doc?.slug) revalidatePath(`/blog/${doc.slug}`)
          revalidatePath('/sitemap.xml')
        }
        return doc
      },
    ],
    afterDelete: [
      ({ doc, req }) => {
        if (req?.method !== 'GET') {
          revalidatePath('/blog')
          if (doc?.slug) revalidatePath(`/blog/${doc.slug}`)
          revalidatePath('/sitemap.xml')
        }
        return doc
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
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
            const fallback = data?.title || originalDoc?.title
            return typeof fallback === 'string' ? formatSlug(fallback) : value
          },
        ],
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      required: true,
      admin: { description: 'Rezumat scurt pentru listări, meta description fallback și share cards.' },
    },
    { name: 'content', type: 'richText', required: true },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categorii-educationale',
      admin: { position: 'sidebar' },
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Imagine principală pentru articol și OpenGraph.' },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      admin: { position: 'sidebar' },
    },
    {
      name: 'publishedAt',
      type: 'date',
      index: true,
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: { position: 'sidebar', description: 'Folosit pentru evidențiere în indexul blogului.' },
    },
    {
      name: 'relatedTool',
      type: 'select',
      defaultValue: 'general',
      options: [...relatedToolOptions],
      admin: { position: 'sidebar', description: 'CTA-ul calculatorului recomandat la finalul articolului.' },
    },
    {
      type: 'group',
      name: 'seo',
      label: 'SEO',
      fields: [
        { name: 'title', type: 'text', admin: { description: 'Fallback: titlul articolului.' } },
        {
          name: 'description',
          type: 'textarea',
          admin: { description: 'Fallback: excerpt.' },
        },
        { name: 'canonicalUrl', type: 'text' },
        {
          name: 'noIndex',
          type: 'checkbox',
          defaultValue: false,
          admin: { description: 'Exclude articolul din indexare și sitemap.' },
        },
      ],
    },
  ],
  timestamps: true,
  versions: { drafts: true, maxPerDoc: 50 },
}
