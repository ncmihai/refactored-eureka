"use client";

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
import { captureSimulation } from "@/lib/posthog";
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

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const fmt = (v: string | number, digits = 2) =>
  Number(v).toLocaleString("ro-RO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProdusCredit[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
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
    const p = products.find((x) => x.id === id);
    if (!p) return;
    setForm((f) => ({
      ...f,
      annual_rate_initial: p.dobandaInitiala,
      revision_month:
        p.tipDobanda === "fix_variabil" && p.perioadaFixa ? p.perioadaFixa : 0,
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
  };

  const update = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/credit/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      setResult(await res.json());
      captureSimulation("credit");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 max-w-6xl mx-auto px-6 py-10 md:py-14 space-y-10">
      <PageHeader
        eyebrow="Credit · Simulator"
        title="Scadențar complet cu revizuire și rambursare anticipată."
        description='Vezi evoluția soldului lună de lună, rata inițială și rata după revizuirea dobânzii. Rambursare anticipată cu toggle „reduce perioada” sau „reduce rata”.'
      />

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
        />
        <Field
          label="Perioadă"
          suffix="luni"
          value={form.months}
          onChange={(v) => update("months", v)}
        />
        <Field
          label="Dobândă inițială"
          suffix="% p.a."
          step={0.01}
          value={form.annual_rate_initial}
          onChange={(v) => update("annual_rate_initial", v)}
        />
        <Field
          label="Revizuire la luna"
          suffix="(0 = fără)"
          value={form.revision_month}
          onChange={(v) => update("revision_month", v)}
        />
        <Field
          label="Dobândă după revizuire"
          suffix="% p.a."
          step={0.01}
          value={form.annual_rate_after}
          onChange={(v) => update("annual_rate_after", v)}
        />
        <Field
          label="Perioadă grație"
          suffix="luni"
          value={form.grace_months}
          onChange={(v) => update("grace_months", v)}
        />
        <Field
          label="Plată anticipată lunară"
          suffix="€"
          value={form.monthly_prepayment}
          onChange={(v) => update("monthly_prepayment", v)}
        />
        <Field
          label="Comision lunar"
          suffix="€"
          value={form.monthly_fee}
          onChange={(v) => update("monthly_fee", v)}
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
                      <Td>{fmt(conv(Number(r.prepayment)))}</Td>
                      <Td>{fmt(conv(Number(r.closing_balance)))}</Td>
                    </tr>
                  ))}
                </tbody>
              </TableCard>

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
