import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { buildSimulationPdf } from "@/lib/pdf";

type AppUser = {
  id: string;
  role?: "super_admin" | "admin_firma" | "consultant";
  firm?: string | { id?: string } | null;
};

type Relation = string | { id?: string } | null | undefined;

function relationId(value: Relation): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  return value.id;
}

function canExport(doc: { user?: Relation; firm?: Relation }, user: AppUser) {
  if (user.role === "super_admin") return true;
  if (user.role === "admin_firma") {
    return Boolean(relationId(user.firm) && relationId(user.firm) === relationId(doc.firm));
  }
  return relationId(doc.user) === user.id;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const payload = await getPayload({ config });
  const auth = await payload.auth({ headers: req.headers });
  const user = auth.user as AppUser | null;
  if (!user) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }

  const doc = await payload.findByID({
    collection: "simulari",
    id,
    depth: 1,
    overrideAccess: true,
  });

  const simulation = doc as unknown as {
    id: string;
    tool: string;
    user?: Relation;
    firm?: Relation;
  };

  if (!canExport(simulation, user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!["credit", "optimizare"].includes(String(simulation.tool))) {
    return NextResponse.json({ error: "pdf_not_available" }, { status: 400 });
  }

  const { buffer, hash } = buildSimulationPdf(doc as never);
  await payload.update({
    collection: "simulari",
    id,
    data: {
      pdfExportedAt: new Date().toISOString(),
      pdfHash: hash,
      pdfVersion: "v1-credit-optimizare",
    },
    overrideAccess: true,
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="simulare-${simulation.tool}-${id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
