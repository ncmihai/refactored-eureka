import { Stat, TableCard, Td, Th } from "@/components/ui";
import {
  fmt,
  isRecord,
  num,
  recordAt,
  type AmortizationRow,
  type OptimizareYearPoint,
  type SavedSimulationReport,
} from "@/lib/report-data";
import { buildCreditReportModel, buildOptimizareReportModel } from "@/lib/report-view-models";
import { InfoGrid } from "./InfoGrid";
import { ReportChart } from "./ReportChart";

export function CreditReport({ doc }: { doc: SavedSimulationReport }) {
  const model = buildCreditReportModel(doc);
  const { form, output } = model;

  return (
    <section className="space-y-6">
      <InfoGrid
        items={[
          ["Produs", model.productName],
          ["Sumă împrumut", `${fmt(form.principal)} EUR`],
          ["Perioadă", `${form.months ?? "-"} luni`],
          ["Dobândă inițială", `${fmt(form.annual_rate_initial)}%`],
          ["Revizuire", form.revision_month ? `luna ${form.revision_month}` : "fără revizuire"],
          ["Rambursare anticipată", `${fmt(form.monthly_prepayment)} EUR / lună`],
        ]}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Rata lunară inițială" value={`${fmt(model.initialRate)} EUR`} accent />
        <Stat
          label={model.revisedRate === null ? "Luni efective" : "După revizuire"}
          value={model.revisedRate === null ? String(output.months_to_close ?? "-") : `${fmt(model.revisedRate)} EUR`}
          hint={model.revisedRateHint}
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
            points: model.chartRows.map((row) => ({ x: row.month, y: row.sold })),
          },
          {
            label: "Dobândă cumulată",
            color: "#b45309",
            points: model.chartRows.map((row) => ({ x: row.month, y: row.dobanda })),
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
            {model.previewSchedule.map((row: AmortizationRow) => (
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

export function OptimizareReport({ doc }: { doc: SavedSimulationReport }) {
  const model = buildOptimizareReportModel(doc);
  const { form, output, yearly } = model;

  return (
    <section className="space-y-6">
      <InfoGrid
        items={[
          ["Produs", model.productName],
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
          Scenariul {output.recommended ?? "-"} · {model.recommendationText}
        </div>
        <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
          {model.recommendationReasonRo} {model.crossoverTextRo}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Rata standard" value={`${fmt(output.standard_monthly_payment)} EUR`} />
        <Stat label="Efort lunar total" value={`${fmt(model.totalEffort)} EUR`} hint="rata + suma extra" accent />
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

export function InvestmentReport({ doc }: { doc: SavedSimulationReport }) {
  const form = recordAt(doc.inputSnapshot, "form") ?? {};
  const output = isRecord(doc.outputSummary) ? doc.outputSummary : {};
  const input = isRecord(doc.inputSnapshot) ? doc.inputSnapshot : {};
  const productType = String(input.productType ?? (doc.tool === "unit_linked" ? "unit_linked" : "etf"));
  const isMonteCarlo = input.mode === "monte_carlo";
  const productSnapshots = isRecord(doc.productSnapshots)
    ? doc.productSnapshots
    : recordAt(doc.inputSnapshot, "productSnapshots");
  const product = productType === "unit_linked"
    ? recordAt(productSnapshots, "produsUnitLinked")
    : recordAt(productSnapshots, "fondETF");
  const currencySnapshot = recordAt(input, "currency");
  const currency =
    typeof currencySnapshot?.display === "string"
      ? currencySnapshot.display
      : typeof product?.moneda === "string"
        ? product.moneda
        : productType === "unit_linked"
          ? "RON"
          : "EUR";
  const productLabel = product
    ? `${product.provider ?? ""} ${product.nume ?? product.ticker ?? ""}`.trim()
    : "Parametri custom";

  const finalDistribution = recordAt(output, "final_distribution");
  const schedule = Array.isArray(output.schedule) ? output.schedule : [];
  const percentileRows = Array.isArray(output.percentiles) ? output.percentiles : [];

  const finalValue =
    finalDistribution?.p50 ??
    output.net_value_final ??
    output.final_value_net ??
    output.gross_value_final ??
    "-";
  const cagr = output.cagr_median_net ?? output.cagr_net;
  const lossProbability = output.probability_of_loss;
  const targetProbability = output.probability_target_reached;

  return (
    <section className="space-y-6">
      <InfoGrid
        items={[
          ["Tip produs", productType === "unit_linked" ? "Unit-Linked" : "ETF"],
          ["Mod", isMonteCarlo ? "Monte Carlo" : "Determinist"],
          ["Produs", productLabel],
          ["Perioadă", `${form.months ?? "-"} luni`],
          ["Contribuție", `${form.monthly_contribution ?? form.monthly_premium ?? "-"} / lună`],
          ["Indice", String(input.selectedIndex ?? "-")],
        ]}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label={isMonteCarlo ? "Mediană finală P50" : "Valoare netă finală"} value={`${fmt(finalValue)} ${currency}`} accent />
        <Stat label="CAGR net" value={typeof cagr === "number" ? `${fmt(cagr * 100)}%` : `${fmt(num(cagr) * 100)}%`} />
        {typeof lossProbability === "number" && (
          <Stat label="Probabilitate pierdere" value={`${fmt(lossProbability * 100, 1)}%`} />
        )}
        {typeof targetProbability === "number" && (
          <Stat label="Probabilitate target" value={`${fmt(targetProbability * 100, 1)}%`} />
        )}
        {output.total_fee_drag_median !== undefined && (
          <Stat label="Fee drag median" value={`${fmt(output.total_fee_drag_median)} ${currency}`} />
        )}
        {output.total_broker_fees !== undefined && (
          <Stat label="Comisioane broker" value={`${fmt(output.total_broker_fees)} ${currency}`} />
        )}
      </div>

      {percentileRows.length > 0 ? (
        <ReportChart
          title="Traiectorie mediană Monte Carlo"
          series={[
            {
              label: "P50",
              color: "#15543d",
              points: percentileRows.map((row) => ({
                x: num(isRecord(row) ? row.month : 0),
                y: num(isRecord(row) ? row.p50 : 0),
              })),
            },
            {
              label: "P10",
              color: "#a85555",
              points: percentileRows.map((row) => ({
                x: num(isRecord(row) ? row.month : 0),
                y: num(isRecord(row) ? row.p10 : 0),
              })),
            },
            {
              label: "P90",
              color: "#78716c",
              points: percentileRows.map((row) => ({
                x: num(isRecord(row) ? row.month : 0),
                y: num(isRecord(row) ? row.p90 : 0),
              })),
            },
          ]}
        />
      ) : schedule.length > 0 ? (
        <ReportChart
          title="Evoluție valoare cont"
          series={[
            {
              label: "Valoare",
              color: "#15543d",
              points: schedule.map((row) => ({
                x: num(isRecord(row) ? row.month : 0),
                y: num(isRecord(row) ? row.closing_balance : 0),
              })),
            },
          ]}
        />
      ) : null}

      {schedule.length > 0 && (
        <TableCard>
          <thead className="bg-[var(--background)] sticky top-0 border-b border-[var(--border)]">
            <tr>
              <Th>Luna</Th>
              <Th>Contribuție / primă</Th>
              <Th>Taxe / comisioane</Th>
              <Th>Sold final</Th>
            </tr>
          </thead>
          <tbody>
            {schedule.slice(0, 24).map((row) => {
              const record = isRecord(row) ? row : {};
              const contribution = record.contribution_gross ?? record.gross_premium ?? 0;
              const fees = num(record.broker_fee) + num(record.fixed_fee) + num(record.allocation_fee);
              return (
                <tr key={String(record.month)} className="border-t border-[var(--border)]">
                  <Td>{String(record.month ?? "-")}</Td>
                  <Td>{fmt(contribution)}</Td>
                  <Td>{fmt(fees)}</Td>
                  <Td>{fmt(record.closing_balance)}</Td>
                </tr>
              );
            })}
          </tbody>
        </TableCard>
      )}
    </section>
  );
}
