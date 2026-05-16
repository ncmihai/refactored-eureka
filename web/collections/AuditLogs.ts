import type { Access, CollectionConfig } from 'payload'

type AuditUser = {
  role?: 'super_admin' | 'admin_firma' | 'consultant' | null
}

const superAdminOnly: Access = ({ req }) =>
  (req.user as AuditUser | undefined)?.role === 'super_admin'

export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  access: {
    create: superAdminOnly,
    read: superAdminOnly,
    update: () => false,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['action', 'collectionSlug', 'documentId', 'actor', 'createdAt'],
    description: 'Jurnal pentru acțiuni sensibile în beta comercială.',
    group: 'SaaS Beta',
  },
  fields: [
    { name: 'action', type: 'text', required: true },
    { name: 'collectionSlug', type: 'text', required: true },
    { name: 'documentId', type: 'text', required: true },
    {
      name: 'actor',
      type: 'relationship',
      relationTo: 'users',
      admin: { description: 'Utilizatorul autentificat care a declanșat acțiunea.' },
    },
    {
      name: 'firm',
      type: 'relationship',
      relationTo: 'firme',
      admin: { description: 'Firma actorului, dacă există.' },
    },
    { name: 'metadata', type: 'json' },
  ],
  timestamps: true,
}
