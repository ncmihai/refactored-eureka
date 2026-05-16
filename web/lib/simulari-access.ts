import type { Where } from "payload";

export type SimulariRole = "super_admin" | "admin_firma" | "consultant";
export type AccountStatus = "active" | "pending_approval" | "rejected" | "disabled";

export type RelationRef =
  | string
  | number
  | { id?: string | number | null }
  | null
  | undefined;

export type SimulariUserLike = {
  id?: string | number | null;
  role?: SimulariRole | null;
  accountStatus?: AccountStatus | null;
  firm?: RelationRef;
} | null | undefined;

export type SimulariDocLike = {
  user?: RelationRef;
  firm?: RelationRef;
} | null | undefined;

export function relationId(value: RelationRef): string | number | undefined {
  if (!value) return undefined;
  if (typeof value === "string" || typeof value === "number") return value;
  return value.id === undefined || value.id === null ? undefined : value.id;
}

export function simulariReadWhereForUser(user: SimulariUserLike): Where | true | false {
  if (!user?.id) return false;
  if (user.role === "super_admin") return true;
  if (user.accountStatus && user.accountStatus !== "active") return false;

  const firmId = relationId(user.firm);
  if (user.role === "admin_firma" && firmId) {
    return { firm: { equals: firmId } };
  }

  return { user: { equals: user.id } };
}

export function canReadSimulation(doc: SimulariDocLike, user: SimulariUserLike) {
  if (!doc || !user?.id) return false;
  if (user.role === "super_admin") return true;
  if (user.accountStatus && user.accountStatus !== "active") return false;
  if (user.role === "admin_firma") {
    const firmId = relationId(user.firm);
    return Boolean(firmId && String(firmId) === String(relationId(doc.firm)));
  }
  return String(relationId(doc.user)) === String(user.id);
}
