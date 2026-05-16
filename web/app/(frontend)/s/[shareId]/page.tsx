import config from "@payload-config";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import { CreditReport, OptimizareReport } from "@/components/reports/SavedSimulationReports";
import { PageHeader } from "@/components/ui";
import {
  compactDate,
  toolLabel,
  type SavedSimulationReport,
} from "@/lib/report-data";

export default async function SharedSimulationPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "simulari",
    where: {
      and: [
        { shareId: { equals: shareId } },
        { status: { equals: "active" } },
      ],
    },
    depth: 1,
    limit: 1,
    overrideAccess: true,
  });
  const doc = result.docs[0] as SavedSimulationReport | undefined;
  if (!doc) notFound();
  if (new Date(String(doc.shareExpiresAt)).getTime() < Date.now()) notFound();

  return (
    <main className="flex-1 max-w-6xl mx-auto px-6 py-10 md:py-14 space-y-8">
      <PageHeader
        eyebrow="Raport client"
        title={`${toolLabel(String(doc.tool))} · ${doc.clientAlias ?? "Client demo"}`}
        description="Link public read-only. Datele sunt snapshot-uri salvate la momentul simulării."
      />

      <div className="card p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted-2)]">
            Creat
          </div>
          <div className="mt-1">{compactDate(doc.createdAt)}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted-2)]">
            Expiră
          </div>
          <div className="mt-1">{compactDate(doc.shareExpiresAt)}</div>
        </div>
        <div className="text-[var(--muted)]">
          Exportul PDF este disponibil doar din contul autentificat al consultantului.
        </div>
      </div>

      {doc.tool === "credit" ? (
        <CreditReport doc={doc} />
      ) : doc.tool === "optimizare" ? (
        <OptimizareReport doc={doc} />
      ) : (
        <div className="card p-6 text-sm text-[var(--muted)]">
          Raportul public detaliat este disponibil momentan pentru Credit și Optimizare.
        </div>
      )}

      <p className="text-xs text-[var(--muted)] italic leading-relaxed">
        Acest raport este educațional și nu constituie consultanță financiară, fiscală sau de investiții.
      </p>
    </main>
  );
}
