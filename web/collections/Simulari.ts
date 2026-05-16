import { randomBytes } from 'crypto'
import type { Access, CollectionBeforeChangeHook, CollectionConfig } from 'payload'
import { relationId, simulariReadWhereForUser } from '../lib/simulari-access'

const roles = ['super_admin', 'admin_firma', 'consultant'] as const

type AppUser = {
  id: string
  role?: (typeof roles)[number]
  firm?: string | { id?: string } | null
}

function shareId() {
  return randomBytes(12).toString('base64url')
}

const loggedIn: Access = ({ req }) => Boolean(req.user)

const readAccess: Access = ({ req }) => {
  const user = req.user as AppUser | undefined
  return simulariReadWhereForUser(user)
}

const updateAccess: Access = (args) => readAccess(args)

const setOwnershipAndShare: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (operation !== 'create') return data

  const user = req.user as AppUser | undefined
  const firmId = relationId(user?.firm)
  const expires = new Date()
  expires.setDate(expires.getDate() + 90)

  return {
    ...data,
    user: data.user ?? user?.id,
    firm: data.firm ?? firmId,
    shareId: data.shareId ?? shareId(),
    shareExpiresAt: data.shareExpiresAt ?? expires.toISOString(),
    status: data.status ?? 'active',
  }
}

export const Simulari: CollectionConfig = {
  slug: 'simulari',
  access: {
    create: loggedIn,
    read: readAccess,
    update: updateAccess,
    delete: updateAccess,
  },
  admin: {
    useAsTitle: 'clientAlias',
    defaultColumns: ['tool', 'clientAlias', 'firm', 'user', 'status', 'createdAt'],
    description: 'Simulări salvate cu snapshot de input/output pentru share links și PDF.',
    group: 'SaaS Beta',
  },
  hooks: {
    beforeChange: [setOwnershipAndShare],
  },
  fields: [
    {
      name: 'tool',
      type: 'select',
      required: true,
      options: [
        { label: 'Credit', value: 'credit' },
        { label: 'Optimizare Credit', value: 'optimizare' },
        { label: 'Depozit', value: 'depozit' },
        { label: 'Investiții ETF', value: 'investitii' },
        { label: 'Unit-Linked', value: 'unit_linked' },
        { label: 'Comparator', value: 'comparator' },
      ],
    },
    {
      name: 'clientAlias',
      type: 'text',
      required: true,
      defaultValue: 'Client demo',
      admin: { description: 'Pseudonim intern. Nu introduce PII.' },
    },
    { name: 'inputSnapshot', type: 'json', required: true },
    { name: 'outputSummary', type: 'json', required: true },
    { name: 'productSnapshots', type: 'json' },
    {
      name: 'firm',
      type: 'relationship',
      relationTo: 'firme',
      admin: { description: 'Setat automat din user pentru consultanți/admin firmă.' },
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      admin: { description: 'Consultantul care a salvat simularea.' },
    },
    {
      name: 'shareId',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'ID opac pentru link public read-only.' },
    },
    {
      name: 'shareExpiresAt',
      type: 'date',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: [
        { label: 'Activ', value: 'active' },
        { label: 'Arhivat', value: 'archived' },
      ],
    },
    { name: 'pdfExportedAt', type: 'date' },
    { name: 'pdfHash', type: 'text' },
    { name: 'pdfVersion', type: 'text' },
  ],
  timestamps: true,
  versions: { drafts: false, maxPerDoc: 10 },
}
