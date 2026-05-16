import type { Access, CollectionConfig } from 'payload'
import { auditCollectionChange } from '../lib/audit-log'

const superAdminOnly: Access = ({ req }) => {
  const user = req.user as { role?: string | null } | null
  return user?.role === 'super_admin'
}

export const DemoRequests: CollectionConfig = {
  slug: 'demo-requests',
  access: {
    create: superAdminOnly,
    read: superAdminOnly,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['name', 'email', 'company', 'status', 'createdAt'],
    description: 'Lead-uri B2B din pagina de demo.',
    group: 'SaaS Beta',
  },
  hooks: {
    afterChange: [auditCollectionChange('demo-requests', 'demo_request')],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true, index: true },
    { name: 'company', type: 'text' },
    { name: 'phone', type: 'text' },
    { name: 'message', type: 'textarea' },
    {
      name: 'sourcePath',
      type: 'text',
      admin: { description: 'Pagina din care a venit cererea.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      options: [
        { label: 'Nou', value: 'new' },
        { label: 'Contactat', value: 'contacted' },
        { label: 'Calificat', value: 'qualified' },
        { label: 'Închis', value: 'closed' },
      ],
    },
  ],
  timestamps: true,
}
