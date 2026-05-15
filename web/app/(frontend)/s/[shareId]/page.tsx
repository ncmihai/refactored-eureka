import config from "@payload-config";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import { PageHeader, Stat } from "@/components/ui";

function toolLabel(tool: string) {
  return {
    credit: "Simulator Credit",
    optimizare: "Optimizare Credit",
    depozit: "Depozit Bancar",
    investitii: "Investiții ETF",
    unit_linked: "Unit-Linked",
    comparator: "Comparator",
  }[tool] ?? tool;
}

function fmt(value: unknown) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function summaryStats(tool: string, output: Record<string, unknown>) {
  if (tool === "credit") {
    return [
      ["Luni efective", String(output.months_to_close ?? "—")],
      ["Total de plătit", fmt(output.total_paid)],
      ["Total dobândă", fmt(output.total_interest)],
      ["Total comisioane", fmt(output.total_fees)],
    ];
  }
  if (tool === "optimizare") {
    return [
      ["Recomandare", `Scenariul ${output.recommended ?? "—"}`],
      ["A · dobândă economisită", fmt(output.interest_saved_by_prepay)],
      ["B · câștig net", fmt(output.scenario_b_gain_net)],
      ["Crossover", String(output.crossover_year ?? "—")],
    ];
  }
  return [["Status", "Simulare salvată"]];
}

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
  const doc = result.docs[0];
  if (!doc) notFound();
  if (new Date(String(doc.shareExpiresAt)).getTime() < Date.now()) notFound();

  const output = (doc.outputSummary ?? {}) as Record<string, unknown>;
  const stats = summaryStats(String(doc.tool), output);

  return (
    <main className="flex-1 max-w-5xl mx-auto px-6 py-10 md:py-14 space-y-8">
      <PageHeader
        eyebrow="Simulare salvată"
        title={`${toolLabel(String(doc.tool))} · ${doc.clientAlias}`}
        description="Link public read-only. Datele sunt snapshot-uri salvate la momentul simulării."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(([label, value], index) => (
          <Stat key={label} label={label} value={value} accent={index === 0} />
        ))}
      </div>

      <div className="card p-5 space-y-3">
        <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted-2)]">
          Detalii sesiune
        </div>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-[var(--muted)]">Creată</dt>
            <dd>{new Date(String(doc.createdAt)).toLocaleString("ro-RO")}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Expiră</dt>
            <dd>{new Date(String(doc.shareExpiresAt)).toLocaleString("ro-RO")}</dd>
          </div>
        </dl>
      </div>

      <div className="card p-5">
        <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted-2)] mb-3">
          Snapshot output
        </div>
        <pre className="text-xs overflow-auto whitespace-pre-wrap">
          {JSON.stringify(doc.outputSummary, null, 2)}
        </pre>
      </div>
    </main>
  );
}
