import type { Where } from "payload";

export type SimulariRole = "super_admin" | "admin_firma" | "consultant";

export type RelationRef =
  | string
  | number
  | { id?: string | number | null }
  | null
  | undefined;

export type SimulariUserLike = {
  id?: string | number | null;
  role?: SimulariRole | null;
  firm?: RelationRef;
} | null | undefined;

export type SimulariDocLike = {
  user?: RelationRef;
  firm?: RelationRef;
} | null | undefined;

export function relationId(value: RelationRef): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return value.id === undefined || value.id === null ? undefined : String(value.id);
}

export function simulariReadWhereForUser(user: SimulariUserLike): Where | true | false {
  if (!user?.id) return false;
  if (user.role === "super_admin") return true;

  const firmId = relationId(user.firm);
  if (user.role === "admin_firma" && firmId) {
    return { firm: { equals: firmId } };
  }

  return { user: { equals: String(user.id) } };
}

export function canReadSimulation(doc: SimulariDocLike, user: SimulariUserLike) {
  if (!doc || !user?.id) return false;
  if (user.role === "super_admin") return true;
  if (user.role === "admin_firma") {
    const firmId = relationId(user.firm);
    return Boolean(firmId && firmId === relationId(doc.firm));
  }
  return relationId(doc.user) === String(user.id);
}
