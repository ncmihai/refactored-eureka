import config from "@payload-config";
import { randomBytes } from "crypto";
import { headers as getHeaders } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getPayload, type Where } from "payload";

const TOOLS = new Set([
  "credit",
  "optimizare",
  "depozit",
  "investitii",
  "unit_linked",
  "comparator",
]);

type AppUser = {
  id: string;
  role?: "super_admin" | "admin_firma" | "consultant";
  firm?: string | { id?: string } | null;
};

function relationId(value: AppUser["firm"]): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  return value.id;
}

function newShareId() {
  return randomBytes(12).toString("base64url");
}

async function currentUser() {
  const payload = await getPayload({ config });
  const auth = await payload.auth({ headers: await getHeaders() });
  return { payload, user: auth.user as AppUser | null };
}

export async function GET() {
  const { payload, user } = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const firmId = relationId(user.firm);
  let where: Where | undefined;
  if (user.role === "admin_firma" && firmId) {
    where = { firm: { equals: firmId } };
  } else if (user.role !== "super_admin") {
    where = { user: { equals: user.id } };
  }

  const result = await payload.find({
    collection: "simulari",
    where,
    sort: "-createdAt",
    depth: 1,
    limit: 50,
    overrideAccess: true,
  });

  return NextResponse.json({ docs: result.docs, totalDocs: result.totalDocs });
}

export async function POST(req: NextRequest) {
  const { payload, user } = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const body = await req.json();
  if (!TOOLS.has(body.tool)) {
    return NextResponse.json({ error: "invalid_tool" }, { status: 400 });
  }
  if (!body.inputSnapshot || !body.outputSummary) {
    return NextResponse.json({ error: "missing_snapshot" }, { status: 400 });
  }

  const expires = new Date();
  expires.setDate(expires.getDate() + 90);

  const doc = await payload.create({
    collection: "simulari",
    data: {
      tool: body.tool,
      clientAlias: body.clientAlias || "Client demo",
      inputSnapshot: body.inputSnapshot,
      outputSummary: body.outputSummary,
      productSnapshots: body.productSnapshots ?? null,
      firm: relationId(user.firm),
      user: user.id,
      shareId: newShareId(),
      shareExpiresAt: expires.toISOString(),
      status: "active",
    },
    overrideAccess: true,
  });

  return NextResponse.json(doc, { status: 201 });
}
