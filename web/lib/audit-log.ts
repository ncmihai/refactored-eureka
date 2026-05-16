import type { Payload, PayloadRequest, TypeWithID } from 'payload'
import { relationId, type RelationRef } from './simulari-access'

type AuditUser = {
  id?: string | number | null
  role?: string | null
  firm?: string | number | { id?: string | number | null } | null
}

type AuditEntry = {
  action: string
  collectionSlug: string
  documentId: string
  metadata?: Record<string, unknown>
}

type AuditAfterChangeHook = (args: {
  doc: TypeWithID | Record<string, unknown>
  operation: 'create' | 'update'
  previousDoc?: Record<string, unknown>
  req: PayloadRequest
}) => unknown | Promise<unknown>

function textId(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  return undefined
}

function docId(doc: TypeWithID | Record<string, unknown>) {
  return textId(doc.id) ?? 'unknown'
}

async function createAuditLog(payload: Payload, user: AuditUser | undefined, entry: AuditEntry) {
  const actorId = textId(user?.id)
  const firmId = relationId(user?.firm)

  await payload.create({
    collection: 'audit-logs',
    data: {
      ...entry,
      actor: actorId,
      firm: firmId,
      metadata: {
        ...entry.metadata,
        actorRole: user?.role ?? null,
      },
    },
    overrideAccess: true,
  })
}

export async function writeAuditLog(req: PayloadRequest, entry: AuditEntry) {
  await createAuditLog(req.payload, req.user as AuditUser | undefined, entry)
}

export function auditCollectionChange(
  collectionSlug: string,
  actionPrefix: string,
): AuditAfterChangeHook {
  return async ({ doc, operation, req }) => {
    await writeAuditLog(req, {
      action: `${actionPrefix}_${operation === 'create' ? 'created' : 'updated'}`,
      collectionSlug,
      documentId: docId(doc),
      metadata: { operation },
    })
    return doc
  }
}

export const auditPdfExport = (
  payload: Payload,
  user: AuditUser | undefined,
  args: { documentId: string; tool: string; hash: string },
) =>
  createAuditLog(payload, user, {
    action: 'pdf_exported',
    collectionSlug: 'simulari',
    documentId: args.documentId,
    metadata: {
      tool: args.tool,
      hash: args.hash,
    },
  })

export const userAuditHook: AuditAfterChangeHook = async ({ doc, operation, previousDoc, req }) => {
  const previous = previousDoc as Record<string, unknown> | undefined
  const current = doc as Record<string, unknown>
  let action = operation === 'create' ? 'user_created' : 'user_updated'

  if (operation === 'update') {
    if (previous?.accountStatus !== current.accountStatus) {
      action =
        current.accountStatus === 'active'
          ? 'user_approved'
          : current.accountStatus === 'rejected'
            ? 'user_rejected'
            : current.accountStatus === 'disabled'
              ? 'user_disabled'
              : 'user_status_changed'
    } else if (previous?.role !== current.role) {
      action = 'user_role_changed'
    } else if (relationId(previous?.firm as RelationRef) !== relationId(current.firm as RelationRef)) {
      action = 'user_firm_changed'
    }
  }

  await writeAuditLog(req, {
    action,
    collectionSlug: 'users',
    documentId: docId(current),
    metadata: {
      operation,
      previousRole: previous?.role ?? null,
      nextRole: current.role ?? null,
      previousStatus: previous?.accountStatus ?? null,
      nextStatus: current.accountStatus ?? null,
    },
  })

  return doc
}
