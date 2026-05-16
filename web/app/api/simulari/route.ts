import config from "@payload-config";
import { randomBytes } from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import { relationId, simulariReadWhereForUser, type SimulariUserLike } from "@/lib/simulari-access";
import {
  buildAssumptionsSnapshot,
  buildDisclaimerSnapshot,
  buildSourceSnapshot,
  type TrustTool,
} from "@/lib/trust-snapshots";

const TOOLS = new Set<TrustTool>([
  "credit",
  "optimizare",
  "depozit",
  "investitii",
  "unit_linked",
  "comparator",
]);

function newShareId() {
  return randomBytes(12).toString("base64url");
}

async function currentUser(req: NextRequest) {
  const payload = await getPayload({ config });
  const auth = await payload.auth({ headers: req.headers });
  return { payload, user: auth.user as SimulariUserLike };
}

export async function GET(req: NextRequest) {
  const { payload, user } = await currentUser(req);
  if (!user) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  if (user.role !== "super_admin" && user.accountStatus && user.accountStatus !== "active") {
    return NextResponse.json({ error: "account_not_active" }, { status: 403 });
  }

  const readWhere = simulariReadWhereForUser(user);
  const where = readWhere === true ? undefined : readWhere === false ? { id: { equals: "__none__" } } : readWhere;
  Sentry.addBreadcrumb({
    category: "simulari",
    message: "list saved simulations",
    level: "info",
    data: {
      role: user.role,
      accountStatus: user.accountStatus ?? "active",
      scoped: readWhere !== true,
    },
  });

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
  const { payload, user } = await currentUser(req);
  if (!user) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  if (user.role !== "super_admin" && user.accountStatus && user.accountStatus !== "active") {
    return NextResponse.json({ error: "account_not_active" }, { status: 403 });
  }

  const body = await req.json();
  const tool = String(body.tool) as TrustTool;
  if (!TOOLS.has(tool)) {
    return NextResponse.json({ error: "invalid_tool" }, { status: 400 });
  }
  if (!body.inputSnapshot || !body.outputSummary) {
    return NextResponse.json({ error: "missing_snapshot" }, { status: 400 });
  }
  Sentry.addBreadcrumb({
    category: "simulari",
    message: "create saved simulation",
    level: "info",
    data: {
      tool,
      role: user.role,
      accountStatus: user.accountStatus ?? "active",
      hasFirm: Boolean(relationId(user.firm)),
    },
  });

  const expires = new Date();
  expires.setDate(expires.getDate() + 90);

  const doc = await payload.create({
    collection: "simulari",
    data: {
      tool,
      assumptionsSnapshot:
        body.assumptionsSnapshot ?? buildAssumptionsSnapshot(tool, body.inputSnapshot),
      disclaimerSnapshot:
        body.disclaimerSnapshot ?? (await buildDisclaimerSnapshot(payload, tool)),
      sourceSnapshot:
        body.sourceSnapshot ?? buildSourceSnapshot(body.inputSnapshot, body.productSnapshots ?? null),
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
