"use client";

import { useEffect, useState } from "react";
import {
  fetchFonduriETF,
  fetchIndiciIstorici,
  type FondETF,
  type RandamentIndice,
} from "@/lib/cms";
import indexReturnMetadata from "@/data/index-returns/metadata.json";
import { captureSimulation } from "@/lib/posthog";
import { SaveSimulationPanel } from "@/components/SaveSimulationPanel";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartCard,
  DisclaimerNote,
  Field,
  PageHeader,
  ProductPicker,
  Select,
  Stat,
  TableCard,
  Td,
  Th,
} from "@/components/ui";
import { Disclaimer } from "@/components/Disclaimer";
import {
  InflationToggle,
  deflate,
  type InflationState,
} from "@/components/InflationToggle";
import {
  CurrencyToggle,
  convertAmount,
  currencySymbol,
  type CurrencyState,
} from "@/components/CurrencyToggle";

type InvestitieRow = {
  month: number;
  opening_balance: string;
  contribution_gross: string;
  broker_fee: string;
  contribution_net: string;
  gross_return: string;
  closing_balance: string;
};

type InvestitieResponse = {
  schedule: InvestitieRow[];
  total_contributions_gross: string;
  total_contributions_net: string;
  total_broker_fees: string;
  gross_value_final: string;
  gross_gain: string;
  tax: string;
  net_value_final: string;
  net_gain: string;
  cagr_net: string;
  effective_annual_return: string;
};

type MonteCarloPercentile = {
  month: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
};

type MonteCarloResponse = {
  percentiles: MonteCarloPercentile[];
  final_distribution: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  probability_of_loss: number;
  probability_target_reached: number | null;
  cagr_median_net: number;
  annualized_volatility_median: number;
  sharpe_median: number | null;
  max_drawdown_median: number;
  iterations: number;
  block_size: number;
  months: number;
  seed: number | null;
  total_contributions_gross: number;
  total_contributions_net: number;
  total_broker_fees: number;
  crisis_scenarios: {
    label: string;
    start_year: number;
    status: "available" | "insufficient_history" | "insufficient_horizon";
    start_date: string | null;
    months_available: number;
    final_net_value: number | null;
    cagr_net: number | null;
    max_drawdown: number | null;
    line: { month: number; value: number }[];
  }[];
};

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const fmt = (v: string | number, digits = 2) =>
  Number(v).toLocaleString("ro-RO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const DEMO_MONTHLY_RETURNS = [
  0.018, -0.021, 0.026, 0.011, -0.014, 0.019, 0.007, -0.006, 0.024, 0.013,
  -0.017, 0.029, 0.004, 0.016, -0.012, 0.021, 0.009, -0.019, 0.027, 0.014,
  -0.008, 0.018, 0.006, 0.023,
];

const INDEX_LABELS: Record<RandamentIndice["indice"], string> = {
  SP500: "S&P 500",
  MSCI_WORLD: "MSCI World",
  FTSE_ALL_WORLD: "FTSE All-World",
  STOXX_600: "STOXX Europe 600",
  BET: "BET",
  OTHER: "Alt indice",
};

type IndexReturnDataset = (typeof indexReturnMetadata.datasets)[number];

const monthLabel = (value: string) =>
  new Intl.DateTimeFormat("ro-RO", {
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const metadataForIndice = (
  indice: RandamentIndice["indice"],
  rows: RandamentIndice[],
) =>
  indexReturnMetadata.datasets.find(
    (dataset) =>
      dataset.indice === indice &&
      rows.some((row) => row.importBatch === dataset.importBatch),
  );

export default function InvestitiiETF() {
  const [form, setForm] = useState({
    principal: 5000,
    months: 120,
    monthly_contribution: 200,
    annual_return: 7,
    ter: 0.22,
    broker_fee_pct: 0.1,
    broker_fee_fixed: 0,
    holding_tax: 10,
  });
  const [mcForm, setMcForm] = useState({
    iterations: 10000,
    block_size: 12,
    target_value: 50000,
    seed: 42,
  });
  const [result, setResult] = useState<InvestitieResponse | null>(null);
  const [mcResult, setMcResult] = useState<MonteCarloResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [mcLoading, setMcLoading] = useState(false);
  const [mcOpen, setMcOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mcError, setMcError] = useState<string | null>(null);
  const [funds, setFunds] = useState<FondETF[]>([]);
  const [indexReturns, setIndexReturns] = useState<RandamentIndice[]>([]);
  const [selectedFundId, setSelectedFundId] = useState("");
  const [deterministicInputSnapshot, setDeterministicInputSnapshot] =
    useState<unknown>(null);
  const [deterministicProductSnapshots, setDeterministicProductSnapshots] =
    useState<unknown>(undefined);
  const [mcInputSnapshot, setMcInputSnapshot] = useState<unknown>(null);
  const [mcProductSnapshots, setMcProductSnapshots] =
    useState<unknown>(undefined);
  const [selectedIndex, setSelectedIndex] =
    useState<RandamentIndice["indice"]>("SP500");
  const [inflation, setInflation] = useState<InflationState>({
    mode: "nominal",
    rate: 0,
    currency: "RON",
    source: null,
  });
  const [currency, setCurrency] = useState<CurrencyState>({
    display: "EUR",
    rateEurRon: 0,
    source: null,
  });

  useEffect(() => {
    fetchFonduriETF().then(setFunds);
    fetchIndiciIstorici().then(setIndexReturns);
  }, []);

  const availableIndices = Array.from(
    new Set(indexReturns.filter((row) => row.activ).map((row) => row.indice)),
  ).sort();

  const selectedIndexReturns = indexReturns
    .filter((row) => row.activ && row.indice === selectedIndex)
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  const historicalMonthlyReturns = selectedIndexReturns.map(
    (row) => row.randamentLunar / 100,
  );
  const historicalMonthlyReturnDates = selectedIndexReturns.map((row) =>
    row.data.slice(0, 10),
  );
  const selectedDatasetMetadata = metadataForIndice(
    selectedIndex,
    selectedIndexReturns,
  ) as IndexReturnDataset | undefined;
  const selectedIndexStats =
    selectedIndexReturns.length > 0
      ? {
          count: selectedIndexReturns.length,
          from: selectedIndexReturns[0].data,
          through: selectedIndexReturns[selectedIndexReturns.length - 1].data,
          currency: selectedIndexReturns[0].moneda,
          source:
            selectedDatasetMetadata?.sourceName ??
            selectedIndexReturns[0].sourceUrl ??
            selectedIndexReturns[0].sursa,
          returnType: selectedDatasetMetadata?.returnType ?? "monthly_return",
          note: selectedDatasetMetadata?.notes,
        }
      : null;

  const monthlyReturnsForMonteCarlo =
    historicalMonthlyReturns.length > 0
      ? historicalMonthlyReturns
      : DEMO_MONTHLY_RETURNS;
  const selectedFund = funds.find((x) => String(x.id) === selectedFundId);

  const applyFund = (id: string) => {
    setSelectedFundId(id);
    if (!id) return;
    const fund = funds.find((x) => String(x.id) === id);
    if (!fund) return;
    setForm((f) => ({
      ...f,
      ter: fund.ter,
    }));
    setSelectedIndex(fund.indiceReferinta);
    if (fund.moneda === "RON") {
      setCurrency((current) => ({ ...current, display: "RON" }));
    } else if (fund.moneda === "EUR") {
      setCurrency((current) => ({ ...current, display: "EUR" }));
    }
  };

  const update = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const updateMc = <K extends keyof typeof mcForm>(
    key: K,
    value: (typeof mcForm)[K],
  ) => setMcForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setMcResult(null);
    setDeterministicInputSnapshot(null);
    setDeterministicProductSnapshots(undefined);
    setMcInputSnapshot(null);
    setMcProductSnapshots(undefined);
    try {
      const payload = {
        principal: form.principal,
        months: form.months,
        monthly_contribution: form.monthly_contribution,
        annual_return: form.annual_return / 100,
        ter: form.ter / 100,
        broker_fee_pct: form.broker_fee_pct / 100,
        broker_fee_fixed: form.broker_fee_fixed,
        holding_tax: form.holding_tax / 100,
      };
      const res = await fetch(`${BACKEND_URL}/api/v1/investitii/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const response = (await res.json()) as InvestitieResponse;
      const productSnapshots = selectedFund ? { fondETF: selectedFund } : undefined;
      setResult(response);
      setDeterministicProductSnapshots(productSnapshots);
      setDeterministicInputSnapshot({
        mode: "deterministic",
        form,
        selectedFundId,
        productSnapshots,
        requestPayload: payload,
        currency,
        inflation,
      });
      captureSimulation("investitii");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setLoading(false);
    }
  };

  const runMonteCarlo = async () => {
    setMcLoading(true);
    setMcError(null);
    setMcResult(null);
    setMcInputSnapshot(null);
    setMcProductSnapshots(undefined);
    try {
      const payload = {
        principal: form.principal,
        months: form.months,
        monthly_contribution: form.monthly_contribution,
        monthly_returns: monthlyReturnsForMonteCarlo,
        monthly_return_dates:
          historicalMonthlyReturns.length > 0 ? historicalMonthlyReturnDates : null,
        ter: form.ter / 100,
        broker_fee_pct: form.broker_fee_pct / 100,
        broker_fee_fixed: form.broker_fee_fixed,
        holding_tax: form.holding_tax / 100,
        iterations: mcForm.iterations,
        block_size: mcForm.block_size,
        seed: mcForm.seed,
        target_value: mcForm.target_value,
      };
      const res = await fetch(`${BACKEND_URL}/api/v1/investitii/monte-carlo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const response = (await res.json()) as MonteCarloResponse;
      const productSnapshots = selectedFund ? { fondETF: selectedFund } : undefined;
      setMcResult(response);
      setMcProductSnapshots(productSnapshots);
      setMcInputSnapshot({
        mode: "monte_carlo",
        form,
        mcForm,
        selectedFundId,
        selectedIndex,
        selectedDatasetMetadata,
        productSnapshots,
        requestPayload: payload,
        currency,
        inflation,
      });
      captureSimulation("investitii");
    } catch (err) {
      setMcError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setMcLoading(false);
    }
  };

  return (
    <main className="flex-1 max-w-6xl mx-auto px-6 py-10 md:py-14 space-y-10">
      <PageHeader
        eyebrow="Investiții · ETF / Fond"
        title="Acumulare ETF: determinist sau Monte Carlo istoric."
        description="Investiție inițială + contribuții lunare (DCA), TER, comisioane broker și impozit pe câștig. Modul Monte Carlo arată distribuții posibile, nu promisiuni de randament."
      />

      <ProductPicker
        label="Fond ETF"
        hint="Populează automat TER-ul și moneda din CMS."
        items={funds}
        value={selectedFundId}
        onChange={applyFund}
        renderLabel={(fund) =>
          `${fund.ticker} · ${fund.provider} · ${fund.indiceReferinta} · TER ${fund.ter}%`
        }
      />

      <form
        onSubmit={submit}
        className="card p-6 md:p-7 grid grid-cols-1 md:grid-cols-3 gap-5 reveal reveal-4"
      >
        <Field
          label="Sumă inițială"
          suffix="€"
          value={form.principal}
          onChange={(v) => update("principal", v)}
        />
        <Field
          label="Perioadă"
          suffix="luni"
          value={form.months}
          onChange={(v) => update("months", v)}
        />
        <Field
          label="Contribuție lunară"
          suffix="€"
          value={form.monthly_contribution}
          onChange={(v) => update("monthly_contribution", v)}
        />
        <Field
          label="Randament brut"
          suffix="% /an"
          step={0.1}
          value={form.annual_return}
          onChange={(v) => update("annual_return", v)}
        />
        <Field
          label="TER (cost anual fond)"
          suffix="%"
          step={0.01}
          value={form.ter}
          onChange={(v) => update("ter", v)}
        />
        <Field
          label="Comision broker"
          suffix="% / tranzacție"
          step={0.01}
          value={form.broker_fee_pct}
          onChange={(v) => update("broker_fee_pct", v)}
        />
        <Field
          label="Comision fix"
          suffix="€ / tranzacție"
          step={0.1}
          value={form.broker_fee_fixed}
          onChange={(v) => update("broker_fee_fixed", v)}
        />
        <Field
          label="Impozit pe câștig"
          suffix="%"
          step={0.1}
          value={form.holding_tax}
          onChange={(v) => update("holding_tax", v)}
        />

        <div className="md:col-span-3 flex items-center gap-4 pt-2 border-t border-[var(--border)]">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Calculez…" : "Simulează determinist"}
          </button>
          {error && (
            <span className="text-sm text-[var(--danger)]">{error}</span>
          )}
        </div>
      </form>

      <section className="card p-5 md:p-6 reveal reveal-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-[var(--muted-2)]">
              Sub-tool investiții
            </div>
            <h2 className="font-serif h-card tracking-tight mt-1">
              Monte Carlo istoric
            </h2>
            <p className="text-sm text-[var(--muted)] mt-2 max-w-3xl">
              Deschide analiza într-o fereastră separată. Proiecția deterministă
              rămâne rapidă și nu rulează bootstrap istoric implicit.
            </p>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setMcOpen(true)}
          >
            Deschide Monte Carlo
          </button>
        </div>
      </section>

      {mcOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Monte Carlo istoric"
          onClick={() => setMcOpen(false)}
        >
          <div className="modal-window" onClick={(event) => event.stopPropagation()}>
            <section className="p-5 md:p-7 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-[var(--muted-2)]">
              Sub-tool investiții
            </div>
            <h2 className="font-serif h-card tracking-tight mt-1">
              Monte Carlo istoric
            </h2>
            <p className="text-sm text-[var(--muted)] mt-2 max-w-3xl">
              Rulează separat bootstrap-ul istoric și distribuția percentilelor.
              Nu se consumă timp de calcul când folosești proiecția deterministă.
            </p>
          </div>
          <button
            type="button"
            disabled={mcLoading}
            className="btn-primary md:mt-1"
            onClick={runMonteCarlo}
          >
            {mcLoading ? "Rulez Monte Carlo…" : "Rulează Monte Carlo"}
          </button>
          <button
            type="button"
            className="btn-secondary md:mt-1"
            onClick={() => setMcOpen(false)}
          >
            Închide
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Select
            label="Indice istoric"
            value={selectedIndex}
            onChange={setSelectedIndex}
            options={(
              availableIndices.length > 0
                ? availableIndices
                : (["SP500", "MSCI_WORLD", "FTSE_ALL_WORLD", "STOXX_600", "BET"] as const)
            ).map((indice) => ({
              value: indice,
              label: `${metadataForIndice(indice, indexReturns)?.label ?? INDEX_LABELS[indice]}${
                selectedIndex === indice && historicalMonthlyReturns.length === 0
                  ? " · demo fallback"
                  : ""
              }`,
            }))}
          />
          <Field
            label="Iterații"
            value={mcForm.iterations}
            onChange={(v) => updateMc("iterations", v)}
          />
          <Field
            label="Block bootstrap"
            suffix="luni"
            value={mcForm.block_size}
            onChange={(v) => updateMc("block_size", v)}
          />
          <Field
            label="Target"
            suffix="€"
            value={mcForm.target_value}
            onChange={(v) => updateMc("target_value", v)}
          />
          <Field
            label="Seed"
            value={mcForm.seed}
            onChange={(v) => updateMc("seed", v)}
          />
        </div>

        <div className="border-t border-[var(--border)] pt-4 text-sm text-[var(--muted)]">
          {selectedIndexStats ? (
            <p>
              Seria Monte Carlo folosește{" "}
              <strong className="text-[var(--ink)]">
                {selectedIndexStats.count.toLocaleString("ro-RO")} randamente
                lunare
              </strong>{" "}
              pentru {INDEX_LABELS[selectedIndex]}, interval{" "}
              <strong className="text-[var(--ink)]">
                {monthLabel(selectedIndexStats.from)} –{" "}
                {monthLabel(selectedIndexStats.through)}
              </strong>
              , {selectedIndexStats.currency}. Sursă:{" "}
              <strong className="text-[var(--ink)]">
                {selectedIndexStats.source}
              </strong>
              . Tip: {selectedIndexStats.returnType}.
              {selectedDatasetMetadata?.licenseStatus
                ? ` Status date: ${selectedDatasetMetadata.licenseStatus}.`
                : ""}
              {selectedIndexStats.note ? ` ${selectedIndexStats.note}` : ""}
            </p>
          ) : (
            <p>
              Nu există încă randamente istorice CMS pentru{" "}
              {INDEX_LABELS[selectedIndex]}; simularea folosește seria demo până
              importăm datasetul.
            </p>
          )}
        </div>

        {mcError && (
          <p className="text-sm text-[var(--danger)]">{mcError}</p>
        )}
            </section>

      {mcResult && (() => {
        const sym = currencySymbol(currency);
        const conv = (v: number) => convertAmount(v, currency);
        const years = form.months / 12;
        const realFactor =
          inflation.mode === "real" && inflation.rate > 0
            ? (v: number) => deflate(v, inflation.rate, years)
            : (v: number) => v;
        const percentileChartData = mcResult.percentiles.map((r) => ({
            month: r.month,
            p10: conv(realFactor(r.p10)),
            p25: conv(realFactor(r.p25)),
            p50: conv(realFactor(r.p50)),
            p75: conv(realFactor(r.p75)),
            p90: conv(realFactor(r.p90)),
        }));
        return (
          <section className="p-5 md:p-7 pt-0 space-y-6 reveal reveal-fade">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InflationToggle value={inflation} onChange={setInflation} />
              <CurrencyToggle value={currency} onChange={setCurrency} />
            </div>

            {mcInputSnapshot !== null && (
              <SaveSimulationPanel
                tool="investitii"
                inputSnapshot={mcInputSnapshot}
                outputSummary={mcResult}
                productSnapshots={mcProductSnapshots}
              />
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat
                label="Mediană finală P50"
                value={`${fmt(conv(realFactor(mcResult.final_distribution.p50)))} ${sym}`}
                hint={`${mcResult.iterations.toLocaleString("ro-RO")} iterații · block ${mcResult.block_size} luni`}
                accent
              />
              <Stat
                label="Interval P10–P90"
                value={`${fmt(conv(realFactor(mcResult.final_distribution.p10)))}–${fmt(conv(realFactor(mcResult.final_distribution.p90)))} ${sym}`}
                hint="distribuție netă finală"
              />
              <Stat
                label="Probabilitate pierdere"
                value={`${fmt(mcResult.probability_of_loss * 100, 1)}%`}
                hint="valoare finală netă sub total depus"
              />
              <Stat
                label="Probabilitate target"
                value={
                  mcResult.probability_target_reached === null
                    ? "—"
                    : `${fmt(mcResult.probability_target_reached * 100, 1)}%`
                }
                hint={`${fmt(conv(mcForm.target_value))} ${sym}`}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat
                label="CAGR median net"
                value={`${fmt(mcResult.cagr_median_net * 100, 2)}%`}
                hint="după TER, comisioane și impozit final"
              />
              <Stat
                label="Volatilitate mediană"
                value={`${fmt(mcResult.annualized_volatility_median * 100, 2)}%`}
                hint="anualizată din seria lunară simulată"
              />
              <Stat
                label="Sharpe simplificat"
                value={
                  mcResult.sharpe_median === null
                    ? "—"
                    : fmt(mcResult.sharpe_median, 2)
                }
                hint="rata fără risc 3% default backend"
              />
              <Stat
                label="Drawdown median"
                value={`${fmt(mcResult.max_drawdown_median * 100, 1)}%`}
                hint="cel mai mare declin pe traiectorie"
              />
            </div>

            <ChartCard title="Fan chart Monte Carlo P10 / P25 / P50 / P75 / P90">
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart
                  data={percentileChartData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#57534e" }}
                    stroke="#d6d3cd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#57534e" }}
                    stroke="#d6d3cd"
                    tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                  />
                  <Tooltip
                    formatter={(v) => `${fmt(Number(v))} ${sym}`}
                    labelFormatter={(m) => `Luna ${m}`}
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e7e5e0",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Area
                    type="monotone"
                    dataKey="p90"
                    name="P90"
                    stroke="#d6d3cd"
                    fill="#15543d"
                    fillOpacity={0.08}
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="p75"
                    name="P75"
                    stroke="#a8a29e"
                    fill="#15543d"
                    fillOpacity={0.12}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="p50"
                    name="P50"
                    stroke="#15543d"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="p25"
                    name="P25"
                    stroke="#78716c"
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="p10"
                    name="P10"
                    stroke="#a85555"
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <Disclaimer modul="etf" />
            <DisclaimerNote>
              Monte Carlo folosește{" "}
              {historicalMonthlyReturns.length > 0
                ? `${historicalMonthlyReturns.length} randamente lunare din CMS pentru ${INDEX_LABELS[selectedIndex]}`
                : "o serie demonstrativă de randamente lunare, deoarece indicele selectat nu are încă date importate în CMS"}
              . Rezultatele sunt scenarii ipotetice și nu constituie
              recomandare de investiții.
            </DisclaimerNote>
          </section>
        );
      })()}
          </div>
        </div>
      )}

      {result && (() => {
        const sym = currencySymbol(currency);
        const conv = (v: number) => convertAmount(v, currency);
        const years = form.months / 12;
        const realFactor =
          inflation.mode === "real" && inflation.rate > 0
            ? (v: number) => deflate(v, inflation.rate, years)
            : (v: number) => v;
        const realSuffix =
          inflation.mode === "real" && inflation.rate > 0
            ? `real (deflatat ${inflation.rate}%/an)`
            : undefined;
        return (
          <section className="space-y-6 reveal reveal-fade">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InflationToggle value={inflation} onChange={setInflation} />
              <CurrencyToggle value={currency} onChange={setCurrency} />
            </div>

            {deterministicInputSnapshot !== null && (
              <SaveSimulationPanel
                tool="investitii"
                inputSnapshot={deterministicInputSnapshot}
                outputSummary={result}
                productSnapshots={deterministicProductSnapshots}
              />
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat
                label="Valoare netă finală"
                value={`${fmt(conv(realFactor(Number(result.net_value_final))))} ${sym}`}
                hint={
                  realSuffix ??
                  `din ${fmt(conv(Number(result.total_contributions_gross)))} ${sym} depuși`
                }
                accent
              />
              <Stat
                label="Câștig net total"
                value={`${fmt(conv(realFactor(Number(result.net_gain))))} ${sym}`}
                hint={realSuffix ?? "după TER, comisioane și impozit"}
              />
              <Stat
                label="Impozit pe câștig"
                value={`${fmt(conv(Number(result.tax)))} ${sym}`}
                hint={`${form.holding_tax}% din câștig brut`}
              />
              <Stat
                label="CAGR net"
                value={`${fmt(Number(result.cagr_net) * 100, 2)}%`}
                hint={`randament efectiv ${fmt(Number(result.effective_annual_return) * 100, 2)}%`}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Stat
                label="Total depus (brut)"
                value={`${fmt(conv(Number(result.total_contributions_gross)))} ${sym}`}
                hint={`${form.months} luni · ${fmt(form.monthly_contribution)} ${sym}/lună`}
              />
              <Stat
                label="Total investit (net)"
                value={`${fmt(conv(Number(result.total_contributions_net)))} ${sym}`}
                hint={`comisioane broker: ${fmt(conv(Number(result.total_broker_fees)))} ${sym}`}
              />
              <Stat
                label="Valoare brută (pre-tax)"
                value={`${fmt(conv(Number(result.gross_value_final)))} ${sym}`}
                hint={`câștig brut: ${fmt(conv(Number(result.gross_gain)))} ${sym}`}
              />
            </div>

            <ChartCard title="Evoluție valoare portofoliu vs. sume depuse">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={(() => {
                    let cumContrib = 0;
                    return result.schedule.map((r) => {
                      cumContrib += Number(r.contribution_gross);
                      return {
                        month: r.month,
                        valoare: conv(Number(r.closing_balance)),
                        depuneri: conv(cumContrib),
                      };
                    });
                  })()}
                  margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#15543d" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#15543d" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#57534e" }}
                    stroke="#d6d3cd"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#57534e" }}
                    stroke="#d6d3cd"
                    tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                  />
                  <Tooltip
                    formatter={(v) => `${fmt(Number(v))} ${sym}`}
                    labelFormatter={(m) => `Luna ${m}`}
                    contentStyle={{
                      background: "#fff",
                      border: "1px solid #e7e5e0",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Area
                    type="monotone"
                    dataKey="valoare"
                    name="Valoare portofoliu"
                    stroke="#15543d"
                    fill="url(#gInv)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="depuneri"
                    name="Total depus"
                    stroke="#a8a29e"
                    strokeDasharray="4 4"
                    strokeWidth={2}
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <TableCard>
              <thead className="bg-[var(--background)] sticky top-0 border-b border-[var(--border)]">
                <tr>
                  <Th>Luna</Th>
                  <Th>Sold inițial</Th>
                  <Th>Contribuție brut</Th>
                  <Th>Comision</Th>
                  <Th>Contribuție netă</Th>
                  <Th>Randament</Th>
                  <Th>Sold final</Th>
                </tr>
              </thead>
              <tbody>
                {result.schedule.map((r) => (
                  <tr
                    key={r.month}
                    className="border-t border-[var(--border)] hover:bg-[var(--accent-soft)]/30"
                  >
                    <Td>{r.month}</Td>
                    <Td>{fmt(conv(Number(r.opening_balance)))}</Td>
                    <Td>{fmt(conv(Number(r.contribution_gross)))}</Td>
                    <Td>{fmt(conv(Number(r.broker_fee)))}</Td>
                    <Td>{fmt(conv(Number(r.contribution_net)))}</Td>
                    <Td>{fmt(conv(Number(r.gross_return)))}</Td>
                    <Td>{fmt(conv(Number(r.closing_balance)))}</Td>
                  </tr>
                ))}
              </tbody>
            </TableCard>

            <Disclaimer modul="etf" />
            <DisclaimerNote>
              Acest instrument nu constituie consultanță investițională.
              Randamentele sunt scenarii ipotetice; performanțele trecute nu
              garantează rezultate viitoare. Verifică întotdeauna fișa cu
              informații-cheie (KID/KIID) a fondului înainte de investire.
            </DisclaimerNote>
          </section>
        );
      })()}
    </main>
  );
}
