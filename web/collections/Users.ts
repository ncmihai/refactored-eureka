import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'firm'],
    description: 'Utilizatori platformă — super admin, admin firmă, consultant.',
    group: 'Cont & Acces',
  },
  auth: true,
  fields: [
    {
      name: 'nume',
      type: 'text',
      admin: { description: 'Nume afișat (opțional — folosit în UI consultant)' },
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'consultant',
      options: [
        { label: 'Super Admin', value: 'super_admin' },
        { label: 'Admin Firmă', value: 'admin_firma' },
        { label: 'Consultant', value: 'consultant' },
      ],
    },
    {
      name: 'firm',
      type: 'relationship',
      relationTo: 'firme',
      required: false,
      admin: {
        description:
          'Firma la care aparține utilizatorul. Super Admin poate fi nealocat.',
      },
    },
  ],
}
