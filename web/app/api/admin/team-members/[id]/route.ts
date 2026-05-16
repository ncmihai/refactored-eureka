import config from "@payload-config";
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import { relationId, type AccountStatus, type SimulariUserLike } from "@/lib/simulari-access";

const DECISIONS = new Set<AccountStatus>(["active", "rejected", "disabled", "pending_approval"]);

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const payload = await getPayload({ config });
  const auth = await payload.auth({ headers: req.headers });
  const user = auth.user as SimulariUserLike;

  if (!user?.id) return jsonError("login_required", 401);
  if (user.role !== "super_admin") return jsonError("super_admin_required", 403);

  const body = await req.json();
  const accountStatus = String(body.accountStatus ?? "") as AccountStatus;
  if (!DECISIONS.has(accountStatus)) return jsonError("invalid_status", 400);

  const target = await payload.findByID({
    collection: "users",
    id,
    depth: 0,
    overrideAccess: true,
  });

  if (String(target.role) === "super_admin" && String(target.id) !== String(user.id)) {
    return jsonError("cannot_manage_super_admin", 403);
  }

  const data: Record<string, unknown> = { accountStatus };
  if (accountStatus === "active") {
    data.approvedBy = user.id;
    data.approvedAt = new Date().toISOString();
  }

  const doc = await payload.update({
    collection: "users",
    id,
    data,
    depth: 1,
    overrideAccess: true,
  });

  return NextResponse.json({
    id: doc.id,
    email: doc.email,
    role: doc.role,
    accountStatus: doc.accountStatus,
    firm: relationId(doc.firm),
  });
}
