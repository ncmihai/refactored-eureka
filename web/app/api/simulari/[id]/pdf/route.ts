import config from "@payload-config";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { auditPdfExport } from "@/lib/audit-log";
import { buildSimulationPdf } from "@/lib/pdf";
import { canReadSimulation, type SimulariUserLike } from "@/lib/simulari-access";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const payload = await getPayload({ config });
  const auth = await payload.auth({ headers: req.headers });
  const user = auth.user as SimulariUserLike;
  if (!user) {
    return NextResponse.json({ error: "login_required" }, { status: 401 });
  }
  if (user.role !== "super_admin" && user.accountStatus && user.accountStatus !== "active") {
    return NextResponse.json({ error: "account_pending_approval" }, { status: 403 });
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
    user?: string | number | { id?: string | number } | null;
    firm?: string | number | { id?: string | number } | null;
  };

  if (!canReadSimulation(simulation, user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!["credit", "optimizare"].includes(String(simulation.tool))) {
    return NextResponse.json({ error: "pdf_not_available" }, { status: 400 });
  }
  Sentry.addBreadcrumb({
    category: "simulari.pdf",
    message: "export saved simulation pdf",
    level: "info",
    data: {
      tool: simulation.tool,
      role: user.role,
      accountStatus: user.accountStatus ?? "active",
    },
  });

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
  await auditPdfExport(payload, user, {
    documentId: id,
    tool: String(simulation.tool),
    hash,
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="simulare-${simulation.tool}-${id}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
