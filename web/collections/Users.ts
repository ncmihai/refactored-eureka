import type { Access, CollectionBeforeChangeHook, CollectionConfig } from 'payload'
import { userAuditHook } from '../lib/audit-log'
import { relationId } from '../lib/simulari-access'

type AppUser = {
  id?: string | number
  role?: 'super_admin' | 'admin_firma' | 'consultant' | null
  firm?: string | number | { id?: string | number | null } | null
}

const userFirmWhere = (user: AppUser | undefined) => {
  const firmId = relationId(user?.firm)
  return firmId ? { firm: { equals: firmId } } : false
}

const readAccess: Access = ({ req }) => {
  const user = req.user as AppUser | undefined
  if (!user?.id) return false
  if (user.role === 'super_admin') return true
  if (user.role === 'admin_firma') return userFirmWhere(user)
  return { id: { equals: user.id } }
}

const createAccess: Access = ({ req }) => {
  const user = req.user as AppUser | undefined
  return user?.role === 'super_admin' || user?.role === 'admin_firma'
}

const updateAccess: Access = ({ req }) => {
  const user = req.user as AppUser | undefined
  if (!user?.id) return false
  if (user.role === 'super_admin') return true
  if (user.role === 'admin_firma') return userFirmWhere(user)
  return { id: { equals: user.id } }
}

const enforceBetaApprovalFlow: CollectionBeforeChangeHook = ({ data, operation, originalDoc, req }) => {
  const user = req.user as AppUser | undefined
  const now = new Date().toISOString()

  if (!user?.id) return data

  if (user.role === 'admin_firma') {
    const firmId = relationId(user.firm)
    return {
      ...data,
      firm: firmId,
      role: data.role === 'admin_firma' ? 'admin_firma' : 'consultant',
      accountStatus: operation === 'create' ? 'pending_approval' : originalDoc?.accountStatus,
      invitedBy: operation === 'create' ? user.id : originalDoc?.invitedBy,
      approvedBy: originalDoc?.approvedBy,
      approvedAt: originalDoc?.approvedAt,
    }
  }

  if (user.role === 'super_admin') {
    const previousStatus = originalDoc?.accountStatus
    const nextStatus = data.accountStatus ?? previousStatus ?? 'active'
    const justActivated = nextStatus === 'active' && previousStatus !== 'active'

    return {
      ...data,
      accountStatus: nextStatus,
      approvedBy: justActivated ? user.id : data.approvedBy,
      approvedAt: justActivated ? now : data.approvedAt,
    }
  }

  return data
}

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    create: createAccess,
    read: readAccess,
    update: updateAccess,
    delete: ({ req }) => (req.user as AppUser | undefined)?.role === 'super_admin',
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'firm', 'accountStatus'],
    description: 'Utilizatori platformă — super admin, admin firmă, consultant.',
    group: 'Cont & Acces',
  },
  auth: true,
  hooks: {
    beforeChange: [enforceBetaApprovalFlow],
    afterChange: [userAuditHook],
  },
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
      name: 'accountStatus',
      type: 'select',
      required: true,
      defaultValue: 'active',
      admin: {
        description:
          'Beta comercială: Admin Firmă poate crea utilizatori în pending_approval; Super Admin activează sau respinge.',
      },
      options: [
        { label: 'Activ', value: 'active' },
        { label: 'În așteptare aprobare', value: 'pending_approval' },
        { label: 'Respins', value: 'rejected' },
        { label: 'Dezactivat', value: 'disabled' },
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
    {
      name: 'invitedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Setat automat când Admin Firmă propune un membru nou.',
      },
    },
    {
      name: 'approvedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Super Admin care a activat utilizatorul.',
      },
    },
    {
      name: 'approvedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
}
