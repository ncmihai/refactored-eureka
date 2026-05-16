"use client";

import { useEffect, useState } from "react";
import indexReturnMetadata from "@/data/index-returns/metadata.json";
import { Disclaimer } from "@/components/Disclaimer";
import {
  CurrencyToggle,
  convertAmount,
  currencySymbol,
  type CurrencyState,
} from "@/components/CurrencyToggle";
import { SaveSimulationPanel } from "@/components/SaveSimulationPanel";
import {
  ChartCard,
  DisclaimerNote,
  Field,
  ProductPicker,
  Stat,
  TableCard,
  Td,
  Th,
} from "@/components/ui";
import { hasBetaAccess, type AuthStatus } from "@/lib/auth";
import { fetchFonduriETF, fetchIndiciIstorici, fetchProduseUL, type FondETF, type ProdusUL, type RandamentIndice } from "@/lib/cms";
import { fmt } from "@/lib/format";
import { captureSimulation } from "@/lib/posthog";
import { fetchAuthStatus } from "@/lib/simulari";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type UnitLinkedRow = {
  month: number;
  gross_premium: string;
  fixed_fee: string;
  allocation_fee: string;
  invested_amount: string;
  initial_units_balance: string;
  accumulation_units_balance: string;
  admin_fee_effect: string;
  expense_recovery_fee: string;
  gross_return: string;
  closing_balance: string;
};

type UnitLinkedResponse = {
  schedule: UnitLinkedRow[];
  total_premiums: string;
  total_invested: string;
  total_fixed_fees: string;
  total_allocation_fees: string;
  total_expense_recovery_fees: string;
  total_fee_drag: string;
  gross_value_final: string;
  tax: string;
  net_value_final: string;
  net_gain: string;
  cagr_net: string;
};

type MonteCarloResponse = {
  percentiles: { month: number; p10: number; p25: number; p50: number; p75: number; p90: number }[];
  final_distribution: { p10: number; p25: number; p50: number; p75: number; p90: number };
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
  total_fee_drag_median: number;
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

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const INDEX_LABELS: Record<RandamentIndice["indice"], string> = {
  SP500: "S&P 500",
  MSCI_WORLD: "MSCI World",
  FTSE_ALL_WORLD: "FTSE All-World",
  STOXX_600: "STOXX Europe 600",
  BET: "BET",
  OTHER: "Alt indice",
};

const crisisStatusLabel: Record<MonteCarloResponse["crisis_scenarios"][number]["status"], string> = {
  available: "Disponibil",
  insufficient_history: "Istoric insuficient",
  insufficient_horizon: "Orizont insuficient",
};

const monthLabel = (value: string) =>
  new Intl.DateTimeFormat("ro-RO", { month: "short", year: "numeric" }).format(new Date(value));

const metadataForIndice = (indice: RandamentIndice["indice"], rows: RandamentIndice[]) =>
  indexReturnMetadata.datasets.find(
    (dataset) => dataset.indice === indice && rows.some((row) => row.importBatch === dataset.importBatch),
  );

export function UnitLinkedTool() {
  const [form, setForm] = useState({
    initial_contribution: 0,
    monthly_premium: 300,
    months: 240,
    annual_return: 6,
    allocation_fee_low_pct: 5,
    allocation_fee_high_pct: 2.5,
    allocation_threshold: 6000,
    fixed_insurance_fee: 13.5,
    initial_units_months: 24,
    initial_expense_recovery_annual_pct: 3,
    admin_fee_annual_pct: 1.29,
    holding_tax: 10,
  });
  const [mcForm, setMcForm] = useState({
    iterations: 10000,
    block_size: 12,
    target_value: 50000,
    seed: 42,
  });
  const [result, setResult] = useState<UnitLinkedResponse | null>(null);
  const [mcResult, setMcResult] = useState<MonteCarloResponse | null>(null);
  const [lastInputSnapshot, setLastInputSnapshot] = useState<unknown>(null);
  const [lastProductSnapshots, setLastProductSnapshots] = useState<unknown>(undefined);
  const [mcInputSnapshot, setMcInputSnapshot] = useState<unknown>(null);
  const [mcProductSnapshots, setMcProductSnapshots] = useState<unknown>(undefined);
  const [loading, setLoading] = useState(false);
  const [mcLoading, setMcLoading] = useState(false);
  const [mcOpen, setMcOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mcError, setMcError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProdusUL[]>([]);
  const [funds, setFunds] = useState<FondETF[]>([]);
  const [indexReturns, setIndexReturns] = useState<RandamentIndice[]>([]);
  const [indexDataLoading, setIndexDataLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [currency, setCurrency] = useState<CurrencyState>({ display: "RON", rateEurRon: 0, source: null });
  const [auth, setAuth] = useState<AuthStatus | null>(null);

  useEffect(() => {
    fetchProduseUL().then(setProducts);
    fetchFonduriETF().then(setFunds);
    fetchIndiciIstorici()
      .then(setIndexReturns)
      .finally(() => setIndexDataLoading(false));
    fetchAuthStatus().then(setAuth).catch(() => setAuth({ authenticated: false, user: null }));
  }, []);

  const selectedProduct = products.find((x) => String(x.id) === selectedProductId);
  const selectedIndex = selectedProduct?.underlyingIndex ?? "MSCI_WORLD";
  const canUseMonteCarlo = auth?.user ? hasBetaAccess(auth.user) : false;
  const selectedIndexReturns = indexReturns
    .filter((row) => row.activ && row.indice === selectedIndex)
    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  const historicalMonthlyReturns = selectedIndexReturns.map((row) => row.randamentLunar / 100);
  const historicalMonthlyReturnDates = selectedIndexReturns.map((row) => row.data.slice(0, 10));
  const selectedDatasetMetadata = metadataForIndice(selectedIndex, selectedIndexReturns);
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
  const hasUlMonteCarloDataset = selectedIndex !== "OTHER" && historicalMonthlyReturns.length > 0;
  const canRunMonteCarlo = !indexDataLoading && !mcLoading && hasUlMonteCarloDataset;

  const applyProduct = (id: string) => {
    setSelectedProductId(id);
    if (!id) return;
    const product = products.find((x) => String(x.id) === id);
    if (!product) return;
    setForm((f) => ({
      ...f,
      allocation_fee_low_pct: product.allocationFeeLow,
      allocation_fee_high_pct: product.allocationFeeHigh,
      allocation_threshold: product.allocationThreshold,
      fixed_insurance_fee: product.fixedInsuranceFee,
      initial_units_months: product.initialUnitsMonths,
      initial_expense_recovery_annual_pct: product.expenseRecoveryAnnual,
      admin_fee_annual_pct: product.adminFeeAnnual,
    }));
    if (product.moneda === "EUR" || product.moneda === "RON") {
      const display: "EUR" | "RON" = product.moneda;
      setCurrency((current) => ({ ...current, display }));
    }
  };

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const updateMc = <K extends keyof typeof mcForm>(key: K, value: (typeof mcForm)[K]) =>
    setMcForm((f) => ({ ...f, [key]: value }));

  const requestPayload = () => ({
    initial_contribution: form.initial_contribution,
    monthly_premium: form.monthly_premium,
    months: form.months,
    annual_return: form.annual_return / 100,
    allocation_fee_low_pct: form.allocation_fee_low_pct / 100,
    allocation_fee_high_pct: form.allocation_fee_high_pct / 100,
    allocation_threshold: form.allocation_threshold,
    fixed_insurance_fee: form.fixed_insurance_fee,
    initial_units_months: form.initial_units_months,
    initial_expense_recovery_annual_pct: form.initial_expense_recovery_annual_pct / 100,
    admin_fee_annual_pct: form.admin_fee_annual_pct / 100,
    holding_tax: form.holding_tax / 100,
  });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setMcResult(null);
    setLastInputSnapshot(null);
    setLastProductSnapshots(undefined);
    setMcInputSnapshot(null);
    setMcProductSnapshots(undefined);
    try {
      const payload = requestPayload();
      const res = await fetch(`${BACKEND_URL}/api/v1/unit-linked/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const response = (await res.json()) as UnitLinkedResponse;
      const linkedEtf = funds.find((fund) => fund.indiceReferinta === selectedIndex);
      const productSnapshots = selectedProduct
        ? { produsUnitLinked: selectedProduct, underlyingEtfExample: linkedEtf ?? null }
        : undefined;
      setResult(response);
      setLastProductSnapshots(productSnapshots);
      setLastInputSnapshot({
        mode: "deterministic",
        productType: "unit_linked",
        form,
        selectedProductId,
        selectedIndex,
        productSnapshots,
        requestPayload: payload,
        currency,
      });
      captureSimulation("unit_linked");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setLoading(false);
    }
  };

  const runMonteCarlo = async () => {
    if (!canUseMonteCarlo) {
      setMcError(auth?.authenticated ? "Contul trebuie să fie activ pentru Monte Carlo." : "Autentificarea este necesară pentru Monte Carlo.");
      return;
    }
    if (!hasUlMonteCarloDataset) {
      setMcError("Produsul UL nu are încă un indice istoric activ pentru Monte Carlo.");
      return;
    }
    setMcLoading(true);
    setMcError(null);
    setMcResult(null);
    setMcInputSnapshot(null);
    setMcProductSnapshots(undefined);
    try {
      const payload = {
        ...requestPayload(),
        monthly_returns: historicalMonthlyReturns,
        monthly_return_dates: historicalMonthlyReturnDates,
        iterations: mcForm.iterations,
        block_size: mcForm.block_size,
        seed: mcForm.seed,
        target_value: mcForm.target_value,
      };
      const res = await fetch("/api/investitii/monte-carlo/unit-linked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const response = (await res.json()) as MonteCarloResponse;
      const linkedEtf = funds.find((fund) => fund.indiceReferinta === selectedIndex);
      const productSnapshots = selectedProduct
        ? { produsUnitLinked: selectedProduct, underlyingEtfExample: linkedEtf ?? null }
        : undefined;
      setMcResult(response);
      setMcProductSnapshots(productSnapshots);
      setMcInputSnapshot({
        mode: "monte_carlo",
        productType: "unit_linked",
        form,
        mcForm,
        selectedProductId,
        selectedIndex,
        selectedDatasetMetadata,
        productSnapshots,
        requestPayload: payload,
        currency,
      });
      captureSimulation("unit_linked");
    } catch (err) {
      setMcError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setMcLoading(false);
    }
  };

  return (
    <section className="space-y-10">
      <ProductPicker
        label="Produs Unit-Linked"
        hint="Populează taxele din CMS și alege indicele istoric pentru Monte Carlo."
        items={products}
        value={selectedProductId}
        onChange={applyProduct}
        renderLabel={(product) =>
          `${product.provider} · ${product.nume} · ${INDEX_LABELS[product.underlyingIndex ?? "MSCI_WORLD"]}`
        }
      />

      <form onSubmit={submit} className="card p-6 md:p-7 grid grid-cols-1 md:grid-cols-3 gap-5 reveal reveal-4">
        <Field label="Contribuție inițială" suffix="RON" value={form.initial_contribution} onChange={(v) => update("initial_contribution", v)} />
        <Field label="Primă lunară" suffix="RON" value={form.monthly_premium} onChange={(v) => update("monthly_premium", v)} />
        <Field label="Perioadă" suffix="luni" value={form.months} onChange={(v) => update("months", v)} />
        <Field label="Randament brut" suffix="% /an" step={0.1} value={form.annual_return} onChange={(v) => update("annual_return", v)} />
        <Field label="Taxă alocare sold mic" suffix="%" step={0.1} value={form.allocation_fee_low_pct} onChange={(v) => update("allocation_fee_low_pct", v)} />
        <Field label="Taxă alocare sold mare" suffix="%" step={0.1} value={form.allocation_fee_high_pct} onChange={(v) => update("allocation_fee_high_pct", v)} />
        <Field label="Prag alocare" suffix="RON" value={form.allocation_threshold} onChange={(v) => update("allocation_threshold", v)} />
        <Field label="Taxă fixă" suffix="RON/lună" step={0.1} value={form.fixed_insurance_fee} onChange={(v) => update("fixed_insurance_fee", v)} />
        <Field label="Unități inițiale" suffix="luni" value={form.initial_units_months} onChange={(v) => update("initial_units_months", v)} />
        <Field label="Recuperare cheltuieli" suffix="% /an" step={0.1} value={form.initial_expense_recovery_annual_pct} onChange={(v) => update("initial_expense_recovery_annual_pct", v)} />
        <Field label="Taxă administrare" suffix="% /an" step={0.01} value={form.admin_fee_annual_pct} onChange={(v) => update("admin_fee_annual_pct", v)} />
        <Field label="Impozit câștig" suffix="%" step={0.1} value={form.holding_tax} onChange={(v) => update("holding_tax", v)} />
        <div className="md:col-span-3 flex items-center gap-4 pt-2 border-t border-[var(--border)]">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Calculez…" : "Simulează Unit-Linked"}
          </button>
          {error && <span className="text-sm text-[var(--danger)]">{error}</span>}
        </div>
      </form>

      <section className="card p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-[var(--muted-2)]">Sub-tool autentificat</div>
            <h2 className="font-serif h-card tracking-tight mt-1">Monte Carlo Unit-Linked</h2>
            <p className="text-sm text-[var(--muted)] mt-2 max-w-3xl">
              Folosește taxele produsului UL și randamentele istorice ale indicelui de bază. Arată intervale posibile, nu garanții.
            </p>
          </div>
          <button type="button" className="btn-primary" onClick={() => setMcOpen(true)}>Deschide Monte Carlo</button>
        </div>
      </section>

      {mcOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Monte Carlo Unit-Linked" onClick={() => setMcOpen(false)}>
          <div className="modal-window" onClick={(event) => event.stopPropagation()}>
            <section className="p-5 md:p-7 space-y-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.14em] text-[var(--muted-2)]">Unit-Linked · Monte Carlo</div>
                  <h2 className="font-serif h-card tracking-tight mt-1">{INDEX_LABELS[selectedIndex]} ca indice de bază</h2>
                  <p className="text-sm text-[var(--muted)] mt-2 max-w-3xl">Produsul păstrează taxele UL; distribuția vine din randamente istorice lunare.</p>
                </div>
                <button type="button" disabled={!canRunMonteCarlo || auth === null} className="btn-primary md:mt-1" onClick={runMonteCarlo}>
                  {mcLoading ? "Rulez Monte Carlo…" : indexDataLoading ? "Încarc istoricul…" : "Rulează Monte Carlo"}
                </button>
                <button type="button" className="btn-secondary md:mt-1" onClick={() => setMcOpen(false)}>Închide</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <Field label="Iterații" value={mcForm.iterations} onChange={(v) => updateMc("iterations", v)} />
                <Field label="Block bootstrap" suffix="luni" value={mcForm.block_size} onChange={(v) => updateMc("block_size", v)} />
                <Field label="Target" suffix={currencySymbol(currency)} value={mcForm.target_value} onChange={(v) => updateMc("target_value", v)} />
                <Field label="Seed" value={mcForm.seed} onChange={(v) => updateMc("seed", v)} />
              </div>

              <div className="border-t border-[var(--border)] pt-4 text-sm text-[var(--muted)]">
                {indexDataLoading ? (
                  <p>Se încarcă randamentele istorice.</p>
                ) : selectedIndexStats ? (
                  <p>
                    Seria folosește <strong className="text-[var(--ink)]">{selectedIndexStats.count.toLocaleString("ro-RO")} randamente lunare</strong> pentru {INDEX_LABELS[selectedIndex]}, interval{" "}
                    <strong className="text-[var(--ink)]">{monthLabel(selectedIndexStats.from)} – {monthLabel(selectedIndexStats.through)}</strong>, {selectedIndexStats.currency}. Sursă:{" "}
                    <strong className="text-[var(--ink)]">{selectedIndexStats.source}</strong>. Tip: {selectedIndexStats.returnType}.
                    {selectedDatasetMetadata?.licenseStatus ? ` Status date: ${selectedDatasetMetadata.licenseStatus}.` : ""}
                    {selectedIndexStats.note ? ` ${selectedIndexStats.note}` : ""}
                  </p>
                ) : (
                  <p>Produsul nu are încă un dataset activ pentru Monte Carlo. Alege un produs cu indice mapat sau actualizează produsul în CMS.</p>
                )}
              </div>
              {!canUseMonteCarlo && <p className="text-sm text-[var(--muted)]">Monte Carlo este disponibil pentru utilizatori autentificați cu cont activ.</p>}
              {mcError && <p className="text-sm text-[var(--danger)]">{mcError}</p>}
            </section>

            {mcResult && (() => {
              const sym = currencySymbol(currency);
              const conv = (v: number) => convertAmount(v, currency);
              const percentileChartData = mcResult.percentiles.map((row) => ({
                month: row.month,
                p10: conv(row.p10),
                p25: conv(row.p25),
                p50: conv(row.p50),
                p75: conv(row.p75),
                p90: conv(row.p90),
              }));
              return (
                <section className="p-5 md:p-7 pt-0 space-y-6">
                  <CurrencyToggle value={currency} onChange={setCurrency} />
                  {mcInputSnapshot !== null && (
                    <SaveSimulationPanel tool="unit_linked" inputSnapshot={mcInputSnapshot} outputSummary={mcResult} productSnapshots={mcProductSnapshots} />
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Stat label="Mediană finală P50" value={`${fmt(conv(mcResult.final_distribution.p50))} ${sym}`} hint={`${mcResult.iterations.toLocaleString("ro-RO")} iterații`} accent />
                    <Stat label="Interval P10–P90" value={`${fmt(conv(mcResult.final_distribution.p10))}–${fmt(conv(mcResult.final_distribution.p90))} ${sym}`} />
                    <Stat label="Probabilitate pierdere" value={`${fmt(mcResult.probability_of_loss * 100, 1)}%`} />
                    <Stat label="Probabilitate target" value={mcResult.probability_target_reached === null ? "—" : `${fmt(mcResult.probability_target_reached * 100, 1)}%`} />
                    <Stat label="CAGR median net" value={`${fmt(mcResult.cagr_median_net * 100, 2)}%`} />
                    <Stat label="Volatilitate mediană" value={`${fmt(mcResult.annualized_volatility_median * 100, 2)}%`} />
                    <Stat label="Drawdown median" value={`${fmt(mcResult.max_drawdown_median * 100, 1)}%`} />
                    <Stat label="Fee drag median" value={`${fmt(conv(mcResult.total_fee_drag_median))} ${sym}`} />
                  </div>

                  <ChartCard title="Fan chart Monte Carlo UL P10 / P25 / P50 / P75 / P90">
                    <ResponsiveContainer width="100%" height={320}>
                      <AreaChart data={percentileChartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#57534e" }} stroke="#d6d3cd" />
                        <YAxis tick={{ fontSize: 11, fill: "#57534e" }} stroke="#d6d3cd" tickFormatter={(v) => `${(Number(v) / 1000).toFixed(1)}k`} />
                        <Tooltip formatter={(v) => `${fmt(Number(v))} ${sym}`} labelFormatter={(m) => `Luna ${m}`} contentStyle={{ background: "#fff", border: "1px solid #e7e5e0", borderRadius: 8, fontSize: 12 }} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                        <Area type="monotone" dataKey="p90" name="P90" stroke="#d6d3cd" fill="#15543d" fillOpacity={0.08} dot={false} />
                        <Area type="monotone" dataKey="p75" name="P75" stroke="#a8a29e" fill="#15543d" fillOpacity={0.12} dot={false} />
                        <Line type="monotone" dataKey="p50" name="P50" stroke="#15543d" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="p25" name="P25" stroke="#78716c" strokeDasharray="4 4" dot={false} />
                        <Line type="monotone" dataKey="p10" name="P10" stroke="#a85555" strokeDasharray="4 4" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <TableCard>
                    <thead className="bg-[var(--background)] sticky top-0 border-b border-[var(--border)]">
                      <tr>
                        <Th>Scenariu</Th>
                        <Th>Start</Th>
                        <Th>Status</Th>
                        <Th>Valoare finală</Th>
                        <Th>CAGR</Th>
                        <Th>Max drawdown</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {mcResult.crisis_scenarios.map((scenario) => (
                        <tr key={scenario.label} className="border-t border-[var(--border)]">
                          <Td>{scenario.label}</Td>
                          <Td>{scenario.start_date ? monthLabel(scenario.start_date) : `${scenario.start_year}`}</Td>
                          <Td>{crisisStatusLabel[scenario.status]}</Td>
                          <Td>{scenario.final_net_value === null ? "—" : `${fmt(conv(scenario.final_net_value))} ${sym}`}</Td>
                          <Td>{scenario.cagr_net === null ? "—" : `${fmt(scenario.cagr_net * 100, 2)}%`}</Td>
                          <Td>{scenario.max_drawdown === null ? "—" : `${fmt(scenario.max_drawdown * 100, 1)}%`}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </TableCard>
                  <DisclaimerNote>Monte Carlo UL folosește indicele de bază mapat în CMS și taxele produsului. Rezultatele sunt ipotetice și nu sunt recomandare de investiții.</DisclaimerNote>
                </section>
              );
            })()}
          </div>
        </div>
      )}

      {result && (() => {
        const sym = currencySymbol(currency);
        const conv = (v: number) => convertAmount(v, currency);
        return (
          <section className="space-y-6 reveal reveal-fade">
            <CurrencyToggle value={currency} onChange={setCurrency} />
            {lastInputSnapshot !== null && (
              <SaveSimulationPanel tool="unit_linked" inputSnapshot={lastInputSnapshot} outputSummary={result} productSnapshots={lastProductSnapshots} />
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat label="Valoare netă finală" value={`${fmt(conv(Number(result.net_value_final)))} ${sym}`} hint={`din ${fmt(conv(Number(result.total_premiums)))} ${sym} prime totale`} accent />
              <Stat label="Câștig net" value={`${fmt(conv(Number(result.net_gain)))} ${sym}`} hint="după taxe și impozit final" />
              <Stat label="Total investit" value={`${fmt(conv(Number(result.total_invested)))} ${sym}`} hint="după taxă fixă și alocare" />
              <Stat label="CAGR net" value={`${fmt(Number(result.cagr_net) * 100, 2)}%`} hint="raportat la primele brute" />
              <Stat label="Taxe fixe" value={`${fmt(conv(Number(result.total_fixed_fees)))} ${sym}`} />
              <Stat label="Taxe alocare" value={`${fmt(conv(Number(result.total_allocation_fees)))} ${sym}`} />
              <Stat label="Recuperare cheltuieli" value={`${fmt(conv(Number(result.total_expense_recovery_fees)))} ${sym}`} />
              <Stat label="Impozit" value={`${fmt(conv(Number(result.tax)))} ${sym}`} />
            </div>
            <ChartCard title="Valoare cont vs. prime totale">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={(() => {
                  let premiums = 0;
                  return result.schedule.map((row) => {
                    premiums += Number(row.gross_premium);
                    return { month: row.month, valoare: conv(Number(row.closing_balance)), prime: conv(premiums) };
                  });
                })()} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <defs>
                    <linearGradient id="gUlHub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#15543d" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#15543d" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#57534e" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#57534e" }} tickFormatter={(v) => `${(Number(v) / 1000).toFixed(1)}k`} />
                  <Tooltip formatter={(v) => `${fmt(Number(v))} ${sym}`} labelFormatter={(m) => `Luna ${m}`} contentStyle={{ background: "#fff", border: "1px solid #e7e5e0", borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="valoare" name="Valoare cont" stroke="#15543d" fill="url(#gUlHub)" strokeWidth={2} />
                  <Line type="monotone" dataKey="prime" name="Prime brute" stroke="#a8a29e" strokeDasharray="4 4" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
            <TableCard>
              <thead className="bg-[var(--background)] sticky top-0 border-b border-[var(--border)]">
                <tr>
                  <Th>Luna</Th>
                  <Th>Primă</Th>
                  <Th>Fix</Th>
                  <Th>Alocare</Th>
                  <Th>Investit</Th>
                  <Th>Recuperare</Th>
                  <Th>Sold final</Th>
                </tr>
              </thead>
              <tbody>
                {result.schedule.map((row) => (
                  <tr key={row.month} className="border-t border-[var(--border)]">
                    <Td>{row.month}</Td>
                    <Td>{fmt(conv(Number(row.gross_premium)))}</Td>
                    <Td>{fmt(conv(Number(row.fixed_fee)))}</Td>
                    <Td>{fmt(conv(Number(row.allocation_fee)))}</Td>
                    <Td>{fmt(conv(Number(row.invested_amount)))}</Td>
                    <Td>{fmt(conv(Number(row.expense_recovery_fee)))}</Td>
                    <Td>{fmt(conv(Number(row.closing_balance)))}</Td>
                  </tr>
                ))}
              </tbody>
            </TableCard>
            <Disclaimer modul="ul" />
            <DisclaimerNote>Modelul este o aproximare educațională a traseului taxelor Unit-Linked. Parametrii produsului trebuie validați din documentele contractuale curente înainte de folosire comercială.</DisclaimerNote>
          </section>
        );
      })()}
    </section>
  );
}
