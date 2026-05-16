import config from "@payload-config";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import { PageHeader, Stat, TableCard, Td, Th } from "@/components/ui";
import {
  fmt,
  getCreditForm,
  getCreditOutput,
  getCreditProduct,
  getCreditSchedule,
  getOptimizareForm,
  getOptimizareOutput,
  num,
  productName,
  recommendationText,
  toolLabel,
  type AmortizationRow,
  type OptimizareYearPoint,
  type SavedSimulationReport,
} from "@/lib/report-data";

function compactDate(value: unknown) {
  const date = new Date(String(value ?? ""));
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ro-RO");
}

function InfoGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      {items.map(([label, value]) => (
        <div key={label}>
          <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted-2)]">
            {label}
          </div>
          <div className="mt-1 font-medium">{value}</div>
        </div>
      ))}
    </div>
  );
}

function ReportChart({
  title,
  series,
}: {
  title: string;
  series: Array<{ label: string; color: string; points: Array<{ x: number; y: number }> }>;
}) {
  const allPoints = series.flatMap((item) => item.points);
  const maxX = Math.max(1, ...allPoints.map((point) => point.x));
  const maxY = Math.max(1, ...allPoints.map((point) => point.y)) * 1.08;
  const width = 760;
  const height = 280;
  const padX = 54;
  const padTop = 24;
  const padBottom = 42;
  const innerW = width - padX - 20;
  const innerH = height - padTop - padBottom;
  const toSvg = (point: { x: number; y: number }) => {
    const x = padX + (point.x / maxX) * innerW;
    const y = padTop + innerH - (point.y / maxY) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  return (
    <div className="card p-5 space-y-3">
      <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted-2)]">
        {title}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img">
        {[0, 1, 2, 3, 4].map((tick) => {
          const y = padTop + (innerH * tick) / 4;
          const value = maxY * (1 - tick / 4);
          return (
            <g key={tick}>
              <line x1={padX} x2={padX + innerW} y1={y} y2={y} stroke="var(--border)" />
              <text x={padX - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
                {fmt(value, 0)}
              </text>
            </g>
          );
        })}
        <line x1={padX} x2={padX} y1={padTop} y2={padTop + innerH} stroke="var(--border)" />
        <line x1={padX} x2={padX + innerW} y1={padTop + innerH} y2={padTop + innerH} stroke="var(--border)" />
        {series.map((item) => (
          <polyline
            key={item.label}
            fill="none"
            stroke={item.color}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={item.points.map(toSvg).join(" ")}
          />
        ))}
        <text x={padX} y={height - 12} fontSize="11" fill="var(--muted)">
          Start
        </text>
        <text x={padX + innerW} y={height - 12} textAnchor="end" fontSize="11" fill="var(--muted)">
          Final
        </text>
      </svg>
      <div className="flex flex-wrap gap-4 text-xs text-[var(--muted)]">
        {series.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function CreditReport({ doc }: { doc: SavedSimulationReport }) {
  const form = getCreditForm(doc);
  const output = getCreditOutput(doc);
  const product = getCreditProduct(doc);
  const schedule = getCreditSchedule(doc);
  const first = schedule[0];
  const initialRate = first ? num(first.annuity) + num(first.fee) : 0;
  const postRevision =
    form.revision_month && form.revision_month > 0 ? schedule[form.revision_month] : undefined;
  const revisedRate = postRevision ? num(postRevision.annuity) + num(postRevision.fee) : null;
  let cumulativeInterest = 0;
  const chartRows = schedule.map((row) => {
    cumulativeInterest += num(row.interest_paid);
    return {
      month: row.month,
      sold: num(row.closing_balance),
      dobanda: cumulativeInterest,
    };
  });
  const preview = schedule.slice(0, 24);

  return (
    <section className="space-y-6">
      <InfoGrid
        items={[
          ["Produs", productName(product)],
          ["Sumă împrumut", `${fmt(form.principal)} EUR`],
          ["Perioadă", `${form.months ?? "-"} luni`],
          ["Dobândă inițială", `${fmt(form.annual_rate_initial)}%`],
          ["Revizuire", form.revision_month ? `luna ${form.revision_month}` : "fără revizuire"],
          ["Rambursare anticipată", `${fmt(form.monthly_prepayment)} EUR / lună`],
        ]}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Rata lunară inițială" value={`${fmt(initialRate)} EUR`} accent />
        <Stat
          label={revisedRate === null ? "Luni efective" : "După revizuire"}
          value={revisedRate === null ? String(output.months_to_close ?? "-") : `${fmt(revisedRate)} EUR`}
          hint={revisedRate === null ? undefined : `luna ${(form.revision_month ?? 0) + 1}`}
        />
        <Stat label="Total de plătit" value={`${fmt(output.total_paid)} EUR`} />
        <Stat label="Total dobândă" value={`${fmt(output.total_interest)} EUR`} />
        <Stat label="Total comisioane" value={`${fmt(output.total_fees)} EUR`} />
        <Stat label="Luni efective" value={String(output.months_to_close ?? "-")} />
      </div>

      <ReportChart
        title="Evoluție sold credit și dobândă cumulată"
        series={[
          {
            label: "Sold rămas",
            color: "#15543d",
            points: chartRows.map((row) => ({ x: row.month, y: row.sold })),
          },
          {
            label: "Dobândă cumulată",
            color: "#b45309",
            points: chartRows.map((row) => ({ x: row.month, y: row.dobanda })),
          },
        ]}
      />

      <div className="space-y-3">
        <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted-2)]">
          Scadențar preview
        </div>
        <TableCard>
          <thead className="bg-[var(--background)] sticky top-0 border-b border-[var(--border)]">
            <tr>
              <Th>Luna</Th>
              <Th>Sold inițial</Th>
              <Th>Anuitate</Th>
              <Th>Principal</Th>
              <Th>Dobândă</Th>
              <Th>Plată ant.</Th>
              <Th>Sold final</Th>
            </tr>
          </thead>
          <tbody>
            {preview.map((row: AmortizationRow) => (
              <tr key={row.month} className="border-t border-[var(--border)]">
                <Td>{row.month}</Td>
                <Td>{fmt(row.opening_balance)}</Td>
                <Td>{fmt(row.annuity)}</Td>
                <Td>{fmt(row.principal_paid)}</Td>
                <Td>{fmt(row.interest_paid)}</Td>
                <Td>{fmt(row.prepayment)}</Td>
                <Td>{fmt(row.closing_balance)}</Td>
              </tr>
            ))}
          </tbody>
        </TableCard>
        <p className="text-xs text-[var(--muted)]">
          Preview-ul public arată primele 24 luni. Exportul PDF autentificat include scadențarul complet.
        </p>
      </div>
    </section>
  );
}

function OptimizareReport({ doc }: { doc: SavedSimulationReport }) {
  const form = getOptimizareForm(doc);
  const output = getOptimizareOutput(doc);
  const product = getCreditProduct(doc);
  const yearly = Array.isArray(output.yearly) ? output.yearly : [];
  const totalEffort = num(output.standard_monthly_payment) + num(form.monthly_extra);

  return (
    <section className="space-y-6">
      <InfoGrid
        items={[
          ["Produs", productName(product)],
          ["Sumă împrumut", `${fmt(form.principal)} EUR`],
          ["Perioadă", `${form.months ?? "-"} luni`],
          ["Dobândă inițială", `${fmt(form.annual_rate_initial)}%`],
          ["Sumă extra lunară", `${fmt(form.monthly_extra)} EUR`],
          ["Randament / impozit", `${fmt(form.investment_annual_return)}% / ${fmt(form.investment_tax_rate)}%`],
        ]}
      />

      <div className="card p-6 border-l-4 border-l-[var(--accent)]">
        <div className="text-xs uppercase tracking-[0.14em] text-[var(--muted-2)]">
          Recomandare
        </div>
        <div className="font-serif text-2xl tracking-tight mt-2">
          Scenariul {output.recommended ?? "-"} · {recommendationText(output)}
        </div>
        <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
          {output.recommended === "B"
            ? "Câștigul net al investiției depășește dobânda economisită pe orizontul analizat."
            : "Dobânda economisită depășește câștigul net al investiției."}{" "}
          {output.crossover_year
            ? `Crossover în anul ${output.crossover_year}.`
            : "Fără crossover pe orizontul ales."}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Rata standard" value={`${fmt(output.standard_monthly_payment)} EUR`} />
        <Stat label="Efort lunar total" value={`${fmt(totalEffort)} EUR`} hint="rata + suma extra" accent />
        <Stat label="A · dobândă economisită" value={`${fmt(output.interest_saved_by_prepay)} EUR`} />
        <Stat label="A · luni până la închidere" value={String(output.scenario_a_months_to_close ?? "-")} />
        <Stat label="B · câștig net" value={`${fmt(output.scenario_b_gain_net)} EUR`} />
        <Stat label="B · portofoliu final" value={`${fmt(output.scenario_b_final_investment_net)} EUR`} />
        <Stat label="B · total dobândă credit" value={`${fmt(output.scenario_b_total_interest)} EUR`} />
        <Stat label="Crossover" value={output.crossover_year ? `Anul ${output.crossover_year}` : "-"} />
      </div>

      <ReportChart
        title="Evoluție câștig net A vs B"
        series={[
          {
            label: "A · dobândă economisită",
            color: "#b45309",
            points: yearly.map((row) => ({ x: row.year, y: num(row.scenario_a_interest_saved) })),
          },
          {
            label: "B · câștig net investiție",
            color: "#15543d",
            points: yearly.map((row) => ({ x: row.year, y: num(row.scenario_b_gain_net) })),
          },
        ]}
      />

      <TableCard>
        <thead className="bg-[var(--background)] sticky top-0 border-b border-[var(--border)]">
          <tr>
            <Th>Anul</Th>
            <Th>A · dobândă econ.</Th>
            <Th>A · sold credit</Th>
            <Th>B · câștig net</Th>
            <Th>B · portofoliu</Th>
            <Th>Δ (B - A)</Th>
          </tr>
        </thead>
        <tbody>
          {yearly.map((row: OptimizareYearPoint) => (
            <tr key={row.year} className="border-t border-[var(--border)]">
              <Td>{row.year}</Td>
              <Td>{fmt(row.scenario_a_interest_saved)}</Td>
              <Td>{fmt(row.scenario_a_balance)}</Td>
              <Td>{fmt(row.scenario_b_gain_net)}</Td>
              <Td>{fmt(row.scenario_b_investment_value)}</Td>
              <Td className={num(row.delta_b_minus_a) >= 0 ? "text-[var(--accent)] font-medium" : "text-amber-700 font-medium"}>
                {fmt(row.delta_b_minus_a)}
              </Td>
            </tr>
          ))}
        </tbody>
      </TableCard>
    </section>
  );
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
