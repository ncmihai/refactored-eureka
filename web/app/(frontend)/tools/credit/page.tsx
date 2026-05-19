"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchProduseCredit, type ProdusCredit } from "@/lib/cms";
import { fmt } from "@/lib/format";
import { captureSimulation } from "@/lib/posthog";
import { SaveSimulationPanel } from "@/components/SaveSimulationPanel";
import { Disclaimer } from "@/components/Disclaimer";
import {
  CurrencyToggle,
  convertAmount,
  currencySymbol,
  type CurrencyState,
} from "@/components/CurrencyToggle";
import {
  InflationToggle,
  deflate,
  type InflationState,
} from "@/components/InflationToggle";
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

type AmortizationRow = {
  month: number;
  opening_balance: string;
  annuity: string;
  principal_paid: string;
  interest_paid: string;
  fee: string;
  total_payment: string;
  prepayment: string;
  closing_balance: string;
};

type CreditResponse = {
  schedule: AmortizationRow[];
  total_interest: string;
  total_fees: string;
  total_paid: string;
  months_to_close: number;
};

type PrepaymentSchedule = Record<number, number>;

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";
const DEFAULT_IRCC_RATE = 5.8;

export default function CreditSimulator() {
  const [form, setForm] = useState({
    principal: 60000,
    months: 120,
    annual_rate_initial: 4.9,
    annual_rate_after: 7.76,
    revision_month: 36,
    monthly_fee: 0,
    grace_months: 0,
    monthly_prepayment: 0,
    prepayment_mode: "reduce_period" as "reduce_period" | "reduce_rate",
  });
  const [result, setResult] = useState<CreditResponse | null>(null);
  const [draftPrepayments, setDraftPrepayments] = useState<PrepaymentSchedule>(
    {},
  );
  const [scheduleDirty, setScheduleDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProdusCredit[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [lastInputSnapshot, setLastInputSnapshot] = useState<unknown>(null);
  const [lastProductSnapshots, setLastProductSnapshots] =
    useState<unknown>(undefined);
  const [currency, setCurrency] = useState<CurrencyState>({
    display: "EUR",
    rateEurRon: 0,
    source: null,
  });
  const [inflation, setInflation] = useState<InflationState>({
    mode: "nominal",
    rate: 0,
    currency: "RON",
    source: null,
  });

  useEffect(() => {
    fetchProduseCredit().then(setProducts);
  }, []);

  const applyProduct = (id: string) => {
    setSelectedProductId(id);
    if (!id) return;
    const p = products.find((x) => String(x.id) === id);
    if (!p) return;
    const revisionMonth =
      p.tipDobanda === "fix_variabil" && p.perioadaFixa ? p.perioadaFixa : 0;
    const variableRate =
      p.tipDobanda === "fix_variabil"
        ? DEFAULT_IRCC_RATE + (p.spread ?? 0)
        : 0;
    setForm((f) => ({
      ...f,
      annual_rate_initial: p.dobandaInitiala,
      annual_rate_after: variableRate,
      revision_month: revisionMonth,
      monthly_fee: p.comisionLunar ?? 0,
      principal:
        p.sumaMinima && f.principal < p.sumaMinima
          ? p.sumaMinima
          : f.principal,
      months:
        p.perioadaMaxima && f.months > p.perioadaMaxima
          ? p.perioadaMaxima
          : f.months,
    }));
    if (p.moneda === "RON" || p.moneda === "EUR") {
      setCurrency((current) => ({ ...current, display: p.moneda }));
    }
  };

  const update = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const selectedProduct = products.find((x) => String(x.id) === selectedProductId);

  const prefillDraftPrepayments = (schedule: AmortizationRow[]) => {
    setDraftPrepayments(
      Object.fromEntries(
        schedule.map((row) => [row.month, Number(row.prepayment)]),
      ),
    );
  };

  const runSimulation = async (prepaymentSchedule?: PrepaymentSchedule) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setLastInputSnapshot(null);
    setLastProductSnapshots(undefined);
    try {
      const requestPayload = {
        principal: form.principal,
        months: form.months,
        annual_rate_initial: form.annual_rate_initial / 100,
        annual_rate_after:
          form.revision_month > 0 && form.annual_rate_after > 0
            ? form.annual_rate_after / 100
            : null,
        revision_month: form.revision_month > 0 ? form.revision_month : null,
        monthly_fee: form.monthly_fee,
        grace_months: form.grace_months,
        monthly_prepayment: form.monthly_prepayment,
        prepayment_mode: form.prepayment_mode,
        prepayment_schedule:
          prepaymentSchedule && Object.keys(prepaymentSchedule).length > 0
            ? prepaymentSchedule
            : null,
      };
      const res = await fetch(`${BACKEND_URL}/api/v1/credit/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const response = (await res.json()) as CreditResponse;
      const productSnapshots = selectedProduct
        ? { creditProduct: selectedProduct }
        : undefined;
      setResult(response);
      prefillDraftPrepayments(response.schedule);
      setScheduleDirty(false);
      setLastProductSnapshots(productSnapshots);
      setLastInputSnapshot({
        form,
        requestPayload,
        selectedProductId,
        productSnapshots,
        currency,
        inflation,
      });
      captureSimulation("credit");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDraftPrepayments({});
    setScheduleDirty(false);
    await runSimulation();
  };

  const editPrepayment = (month: number, value: number) => {
    setDraftPrepayments((current) => ({ ...current, [month]: value }));
    setScheduleDirty(true);
  };

  const resetDraftPrepayments = () => {
    if (result) prefillDraftPrepayments(result.schedule);
    setScheduleDirty(false);
  };

  const confirmPrepaymentSchedule = async () => {
    if (!result) return;
    const schedule = Object.fromEntries(
      result.schedule.map((row) => [
        row.month,
        draftPrepayments[row.month] ?? Number(row.prepayment),
      ]),
    );
    await runSimulation(schedule);
  };

  return (
    <main className="flex-1 max-w-6xl mx-auto px-6 py-10 md:py-14 space-y-10">
      <PageHeader
        eyebrow="Credit · Simulator"
        title="Scadențar complet cu revizuire și rambursare anticipată."
        description='Vezi evoluția soldului lună de lună, rata inițială și rata după revizuirea dobânzii. Rambursare anticipată cu toggle „reduce perioada” sau „reduce rata”.'
      />

      <div className="card p-4 reveal reveal-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted-2)]">
            Sub-tool credit
          </div>
          <p className="text-sm text-[var(--muted)] mt-1">
            Compară rambursarea anticipată cu investiția aceleiași sume.
          </p>
        </div>
        <Link href="/tools/optimizare" className="btn-secondary self-start">
          Deschide Optimizare →
        </Link>
      </div>

      <ProductPicker
        label="Produs bancar"
        hint="Populează automat dobânda, perioada fixă și comisionul. Poți ajusta după."
        items={products}
        value={selectedProductId}
        onChange={applyProduct}
        renderLabel={(p) =>
          `${p.banca} · ${p.nume} · ${p.dobandaInitiala}% (${p.moneda})`
        }
      />

      <form
        onSubmit={submit}
        className="card p-6 md:p-7 grid grid-cols-1 md:grid-cols-3 gap-5 reveal reveal-4"
      >
        <Field
          label="Sumă împrumut"
          suffix="€"
          value={form.principal}
          onChange={(v) => update("principal", v)}
          presets={[
            { label: "50k", value: 50000 },
            { label: "100k", value: 100000 },
            { label: "150k", value: 150000 },
            { label: "+10k", value: form.principal + 10000 },
          ]}
        />
        <Field
          label="Perioadă"
          suffix="luni"
          value={form.months}
          onChange={(v) => update("months", v)}
          presets={[
            { label: "120", value: 120 },
            { label: "240", value: 240 },
            { label: "360", value: 360 },
          ]}
        />
        <Field
          label="Dobândă inițială"
          suffix="% p.a."
          step={0.01}
          value={form.annual_rate_initial}
          onChange={(v) => update("annual_rate_initial", v)}
          presets={[
            { label: "4,9%", value: 4.9 },
            { label: "5,9%", value: 5.9 },
            { label: "7,5%", value: 7.5 },
          ]}
        />
        <Field
          label="Revizuire la luna"
          suffix="(0 = fără)"
          value={form.revision_month}
          onChange={(v) => update("revision_month", v)}
          presets={[
            { label: "0", value: 0 },
            { label: "36", value: 36 },
            { label: "60", value: 60 },
          ]}
        />
        <Field
          label="Dobândă după revizuire"
          suffix="% p.a."
          step={0.01}
          value={form.annual_rate_after}
          onChange={(v) => update("annual_rate_after", v)}
          presets={[
            { label: "0%", value: 0 },
            { label: "7,76%", value: 7.76 },
            { label: "9%", value: 9 },
          ]}
        />
        <Field
          label="Perioadă grație"
          suffix="luni"
          value={form.grace_months}
          onChange={(v) => update("grace_months", v)}
          presets={[
            { label: "0", value: 0 },
            { label: "3", value: 3 },
            { label: "6", value: 6 },
          ]}
        />
        <Field
          label="Plată anticipată constantă"
          suffix="€"
          value={form.monthly_prepayment}
          onChange={(v) => update("monthly_prepayment", v)}
          presets={[
            { label: "0", value: 0 },
            { label: "100", value: 100 },
            { label: "250", value: 250 },
            { label: "500", value: 500 },
          ]}
        />
        <Field
          label="Comision lunar"
          suffix="€"
          value={form.monthly_fee}
          onChange={(v) => update("monthly_fee", v)}
          presets={[
            { label: "0", value: 0 },
            { label: "10", value: 10 },
            { label: "25", value: 25 },
          ]}
        />
        <Select
          label="Mod plată anticipată"
          value={form.prepayment_mode}
          onChange={(v) => update("prepayment_mode", v)}
          options={[
            { value: "reduce_period", label: "Reduce perioada" },
            { value: "reduce_rate", label: "Reduce rata" },
          ]}
        />

        <div className="md:col-span-3 flex items-center gap-4 pt-2 border-t border-[var(--border)]">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Calculez…" : "Simulează"}
          </button>
          {error && (
            <span className="text-sm text-[var(--danger)]">{error}</span>
          )}
        </div>
      </form>

      {result &&
        (() => {
          const first = result.schedule[0];
          const rataInitiala = Number(first.annuity) + Number(first.fee);
          const postRevIdx =
            form.revision_month > 0 && form.annual_rate_after > 0
              ? form.revision_month
              : -1;
          const postRev = postRevIdx >= 0 ? result.schedule[postRevIdx] : null;
          const rataPostRev = postRev
            ? Number(postRev.annuity) + Number(postRev.fee)
            : null;
          const sym = currencySymbol(currency);
          const conv = (v: number) => convertAmount(v, currency);
          const years = result.months_to_close / 12;
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
                <CurrencyToggle value={currency} onChange={setCurrency} />
                <InflationToggle value={inflation} onChange={setInflation} />
              </div>

              {lastInputSnapshot !== null && (
                <SaveSimulationPanel
                  tool="credit"
                  inputSnapshot={lastInputSnapshot}
                  outputSummary={result}
                  productSnapshots={lastProductSnapshots}
                  pdfEnabled
                />
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat
                  label="Rata lunară inițială"
                  value={`${fmt(conv(rataInitiala))} ${sym}`}
                  hint="principal + dobândă + comision"
                  accent
                />
                {rataPostRev !== null ? (
                  <Stat
                    label={`După revizuire (luna ${form.revision_month + 1})`}
                    value={`${fmt(conv(rataPostRev))} ${sym}`}
                    hint="recalculată la dobânda nouă"
                  />
                ) : (
                  <Stat
                    label="Luni efective"
                    value={String(result.months_to_close)}
                  />
                )}
                <Stat
                  label="Total de plătit"
                  value={`${fmt(conv(realFactor(Number(result.total_paid))))} ${sym}`}
                  hint={realSuffix}
                />
                <Stat
                  label="Total dobândă"
                  value={`${fmt(conv(realFactor(Number(result.total_interest))))} ${sym}`}
                  hint={realSuffix}
                />
                {rataPostRev !== null && (
                  <Stat
                    label="Luni efective"
                    value={String(result.months_to_close)}
                  />
                )}
                <Stat
                  label="Total comisioane"
                  value={`${fmt(conv(Number(result.total_fees)))} ${sym}`}
                />
              </div>

              <ChartCard title="Evoluție sold credit & dobândă cumulată">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={(() => {
                      let cumInt = 0;
                      return result.schedule.map((r) => {
                        cumInt += Number(r.interest_paid);
                        return {
                          month: r.month,
                          sold: conv(Number(r.closing_balance)),
                          dobanda: conv(cumInt),
                        };
                      });
                    })()}
                    margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                  >
                    <defs>
                      <linearGradient id="gSold" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#15543d"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor="#15543d"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient id="gDob" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#b45309"
                          stopOpacity={0.25}
                        />
                        <stop
                          offset="100%"
                          stopColor="#b45309"
                          stopOpacity={0}
                        />
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
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
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
                      dataKey="sold"
                      name="Sold rămas"
                      stroke="#15543d"
                      fill="url(#gSold)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="dobanda"
                      name="Dobândă cumulată"
                      stroke="#b45309"
                      fill="url(#gDob)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <div className="relative">
                <TableCard>
                  <thead className="bg-[var(--background)] sticky top-0 border-b border-[var(--border)]">
                    <tr>
                      <Th>Luna</Th>
                      <Th>Sold inițial</Th>
                      <Th>Anuitate</Th>
                      <Th>Principal</Th>
                      <Th>Dobândă</Th>
                      <Th>Plată anticipată</Th>
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
                        <Td>{fmt(conv(Number(r.annuity)))}</Td>
                        <Td>{fmt(conv(Number(r.principal_paid)))}</Td>
                        <Td>{fmt(conv(Number(r.interest_paid)))}</Td>
                        <Td>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            className="input h-8 min-w-[96px] py-1 text-xs tabular-nums"
                            aria-label={`Plată anticipată luna ${r.month}`}
                            value={
                              draftPrepayments[r.month] ?? Number(r.prepayment)
                            }
                            onChange={(e) =>
                              editPrepayment(r.month, Number(e.target.value))
                            }
                          />
                        </Td>
                        <Td>{fmt(conv(Number(r.closing_balance)))}</Td>
                      </tr>
                    ))}
                  </tbody>
                </TableCard>

                {scheduleDirty && (
                  <div className="fixed left-1/2 bottom-5 z-50 w-[min(520px,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-strong)] p-3 shadow-2xl backdrop-blur">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium">
                          Scadențar modificat
                        </div>
                        <p className="text-xs text-[var(--muted)] mt-0.5">
                          Confirmă ca să recalculăm soldul și graficul cu
                          plățile anticipate editate.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={resetDraftPrepayments}
                          disabled={loading}
                        >
                          Anulează
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={confirmPrepaymentSchedule}
                          disabled={loading}
                        >
                          {loading ? "Recalculez…" : "Confirmă"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Disclaimer modul="credit" />
              <DisclaimerNote>
                Acest instrument nu constituie consultanță financiară.
                Proiecțiile sunt scenarii ipotetice bazate pe datele introduse.
              </DisclaimerNote>
            </section>
          );
        })()}
    </main>
  );
}
