import config from "@payload-config";
import { NextRequest, NextResponse } from "next/server";
import { getPayload, type Where } from "payload";
import {
  relationId,
  type AccountStatus,
  type RelationRef,
  type SimulariRole,
  type SimulariUserLike,
} from "@/lib/simulari-access";

const MANAGED_ROLES = new Set<SimulariRole>(["consultant", "admin_firma"]);

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function isActiveManager(user: SimulariUserLike) {
  if (!user?.id) return false;
  if (user.role !== "super_admin" && user.accountStatus && user.accountStatus !== "active") {
    return false;
  }
  return user.role === "super_admin" || user.role === "admin_firma";
}

async function current(req: NextRequest) {
  const payload = await getPayload({ config });
  const auth = await payload.auth({ headers: req.headers });
  return { payload, user: auth.user as SimulariUserLike };
}

function firmName(firm: unknown) {
  if (firm && typeof firm === "object" && "nume" in firm) {
    return String((firm as { nume?: unknown }).nume ?? "-");
  }
  return firm ? String(firm) : "-";
}

function safeUser(doc: Record<string, unknown>) {
  return {
    id: doc.id,
    email: doc.email,
    nume: doc.nume,
    role: doc.role,
    accountStatus: doc.accountStatus,
    firm: relationId(doc.firm as RelationRef),
    firmName: firmName(doc.firm),
    createdAt: doc.createdAt,
    invitedBy: relationId(doc.invitedBy as RelationRef),
    approvedBy: relationId(doc.approvedBy as RelationRef),
    approvedAt: doc.approvedAt,
  };
}

export async function GET(req: NextRequest) {
  const { payload, user } = await current(req);
  if (!user?.id) return jsonError("login_required", 401);
  if (!isActiveManager(user)) return jsonError("forbidden", 403);

  const firmId = relationId(user?.firm);
  let where: Where | undefined;
  if (user?.role !== "super_admin") {
    where = firmId ? { firm: { equals: firmId } } : { id: { equals: "__none__" } };
  }

  const result = await payload.find({
    collection: "users",
    where,
    sort: "-createdAt",
    depth: 1,
    limit: 50,
    overrideAccess: true,
  });

  return NextResponse.json({
    docs: result.docs.map((doc) => safeUser(doc as Record<string, unknown>)),
    totalDocs: result.totalDocs,
  });
}

export async function POST(req: NextRequest) {
  const { payload, user } = await current(req);
  if (!user?.id) return jsonError("login_required", 401);
  if (!isActiveManager(user)) return jsonError("forbidden", 403);

  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const requestedRole = String(body.role ?? "consultant") as SimulariRole;
  const role = MANAGED_ROLES.has(requestedRole) ? requestedRole : "consultant";
  const name = String(body.nume ?? "").trim();

  if (!email || !email.includes("@")) return jsonError("invalid_email", 400);
  if (password.length < 6) return jsonError("password_too_short", 400);

  const existing = await payload.find({
    collection: "users",
    where: { email: { equals: email } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  });
  if (existing.totalDocs > 0) return jsonError("email_exists", 409);

  const firmId =
    user?.role === "super_admin"
      ? relationId(body.firm)
      : relationId(user?.firm);

  if (!firmId) return jsonError("missing_firm", 400);

  const accountStatus: AccountStatus = user?.role === "super_admin" ? "active" : "pending_approval";

  const doc = await payload.create({
    collection: "users",
    data: {
      email,
      password,
      nume: name || undefined,
      role,
      firm: firmId,
      accountStatus,
      invitedBy: user?.id,
      approvedBy: user?.role === "super_admin" ? user.id : undefined,
      approvedAt: user?.role === "super_admin" ? new Date().toISOString() : undefined,
    },
    depth: 1,
    overrideAccess: true,
  });

  return NextResponse.json(safeUser(doc as Record<string, unknown>), { status: 201 });
}
