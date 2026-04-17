"use client";

import { useEffect, useState } from "react";
import { fetchProduseCredit, type ProdusCredit } from "@/lib/cms";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Disclaimer } from "@/components/Disclaimer";
import {
  ChartCard,
  DisclaimerNote,
  Field,
  PageHeader,
  ProductPicker,
  Stat,
  TableCard,
  Td,
  Th,
} from "@/components/ui";

type YearPoint = {
  year: number;
  scenario_a_interest_saved: string;
  scenario_a_balance: string;
  scenario_b_investment_value: string;
  scenario_b_gain_net: string;
  scenario_b_balance: string;
  delta_b_minus_a: string;
};

type OptimizareResponse = {
  standard_monthly_payment: string;
  scenario_a_total_interest: string;
  scenario_a_months_to_close: number;
  scenario_b_total_interest: string;
  scenario_b_final_investment_net: string;
  scenario_b_gain_net: string;
  interest_saved_by_prepay: string;
  crossover_year: number | null;
  recommended: "A" | "B";
  yearly: YearPoint[];
};

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const fmt = (v: string | number, digits = 2) =>
  Number(v).toLocaleString("ro-RO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export default function OptimizareCredit() {
  const [form, setForm] = useState({
    principal: 60000,
    months: 120,
    annual_rate_initial: 4.9,
    annual_rate_after: 7.76,
    revision_month: 36,
    monthly_fee: 0,
    grace_months: 0,
    monthly_extra: 200,
    investment_annual_return: 7,
    investment_tax_rate: 10,
  });
  const [result, setResult] = useState<OptimizareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProdusCredit[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");

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
      const res = await fetch(`${BACKEND_URL}/api/v1/optimizare/simulate`, {
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
          monthly_extra: form.monthly_extra,
          investment_annual_return: form.investment_annual_return / 100,
          investment_tax_rate: form.investment_tax_rate / 100,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      setResult(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 max-w-6xl mx-auto px-6 py-10 md:py-14 space-y-10">
      <PageHeader
        eyebrow="Flagship · Optimizare"
        title="Rambursare anticipată sau investiție paralelă?"
        description="Compară A (plătești mai mult la credit) cu B (investești aceeași sumă). Vezi anul de crossover și recomandarea matematică pe orizontul ales."
      />

      <ProductPicker
        label="Produs credit"
        hint="Populează automat dobânda și perioada fixă. Poți ajusta după."
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
          label="Sumă extra lunar"
          suffix="€"
          value={form.monthly_extra}
          onChange={(v) => update("monthly_extra", v)}
        />
        <Field
          label="Randament investiție"
          suffix="% /an"
          step={0.1}
          value={form.investment_annual_return}
          onChange={(v) => update("investment_annual_return", v)}
        />
        <Field
          label="Impozit câștig"
          suffix="%"
          step={0.1}
          value={form.investment_tax_rate}
          onChange={(v) => update("investment_tax_rate", v)}
        />

        <div className="md:col-span-3 flex items-center gap-4 pt-2 border-t border-[var(--border)]">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Calculez…" : "Compară scenarii"}
          </button>
          {error && (
            <span className="text-sm text-[var(--danger)]">{error}</span>
          )}
        </div>
      </form>

      {result && (
        <section className="space-y-6 reveal reveal-fade">
          <div
            className={`card p-6 md:p-7 border-l-4 ${
              result.recommended === "B"
                ? "border-l-[var(--accent)]"
                : "border-l-amber-700"
            }`}
          >
            <div className="text-xs uppercase tracking-[0.14em] text-[var(--muted-2)]">
              Recomandare
            </div>
            <div className="font-serif text-2xl md:text-3xl tracking-tight mt-2 leading-tight">
              Scenariu{" "}
              <span className="italic">{result.recommended}</span>
              {" — "}
              {result.recommended === "B"
                ? "investește suma extra"
                : "rambursează anticipat"}
            </div>
            <p className="text-sm text-[var(--muted)] mt-2 leading-relaxed">
              {result.recommended === "B"
                ? "Câștigul net al investiției (după impozit) depășește dobânda economisită pe orizontul analizat."
                : "Dobânda economisită depășește câștigul net al investiției."}{" "}
              {result.crossover_year !== null
                ? `Crossover B > A în anul ${result.crossover_year}.`
                : "Fără crossover — A rămâne superior pe orizontul ales."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Stat
              label="Rata lunară standard"
              value={`${fmt(result.standard_monthly_payment)} €`}
              hint="principal + dobândă + comision"
            />
            <Stat
              label="Efort lunar total (A & B)"
              value={`${fmt(Number(result.standard_monthly_payment) + form.monthly_extra)} €`}
              hint={`rata + ${fmt(form.monthly_extra)} € extra`}
              accent
            />
            <Stat
              label="B · investiție lunară"
              value={`${fmt(form.monthly_extra)} €`}
              hint={`${form.investment_annual_return}% /an · impozit ${form.investment_tax_rate}%`}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat
              label="A · dobândă economisită"
              value={`${fmt(result.interest_saved_by_prepay)} €`}
              hint={`închide în ${result.scenario_a_months_to_close} luni`}
            />
            <Stat
              label="B · câștig net investiție"
              value={`${fmt(result.scenario_b_gain_net)} €`}
              hint="FV − contribuții − impozit"
            />
            <Stat
              label="B · portofoliu final"
              value={`${fmt(result.scenario_b_final_investment_net)} €`}
              hint="capital + câștig net"
            />
            <Stat
              label="B · total dobândă credit"
              value={`${fmt(result.scenario_b_total_interest)} €`}
              hint={`A · dobândă: ${fmt(result.scenario_a_total_interest)} €`}
            />
          </div>

          <ChartCard title="Evoluție câștig net — A (dobândă economisită) vs B (câștig investiție)">
            <ResponsiveContainer width="100%" height={340}>
              <LineChart
                data={result.yearly.map((y) => ({
                  year: y.year,
                  A: Number(y.scenario_a_interest_saved),
                  B: Number(y.scenario_b_gain_net),
                }))}
                margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e0" />
                <XAxis
                  dataKey="year"
                  tick={{ fontSize: 11, fill: "#57534e" }}
                  stroke="#d6d3cd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#57534e" }}
                  stroke="#d6d3cd"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(v) => `${fmt(Number(v))} €`}
                  labelFormatter={(y) => `Anul ${y}`}
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e7e5e0",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                {result.crossover_year && (
                  <ReferenceLine
                    x={result.crossover_year}
                    stroke="#a8a29e"
                    strokeDasharray="4 4"
                    label={{
                      value: `Crossover`,
                      position: "top",
                      fontSize: 11,
                      fill: "#57534e",
                    }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="A"
                  name="A · dobândă economisită"
                  stroke="#b45309"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="B"
                  name="B · câștig net investiție"
                  stroke="#15543d"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <TableCard>
            <thead className="bg-[var(--background)] sticky top-0 border-b border-[var(--border)]">
              <tr>
                <Th>Anul</Th>
                <Th>A · dobândă econ.</Th>
                <Th>A · sold credit</Th>
                <Th>B · câștig net</Th>
                <Th>B · portofoliu</Th>
                <Th>Δ (B − A)</Th>
              </tr>
            </thead>
            <tbody>
              {result.yearly.map((y) => (
                <tr
                  key={y.year}
                  className="border-t border-[var(--border)] hover:bg-[var(--accent-soft)]/30"
                >
                  <Td>{y.year}</Td>
                  <Td>{fmt(y.scenario_a_interest_saved)}</Td>
                  <Td>{fmt(y.scenario_a_balance)}</Td>
                  <Td>{fmt(y.scenario_b_gain_net)}</Td>
                  <Td>{fmt(y.scenario_b_investment_value)}</Td>
                  <Td
                    className={
                      Number(y.delta_b_minus_a) > 0
                        ? "text-[var(--accent)] font-medium"
                        : "text-amber-700 font-medium"
                    }
                  >
                    {fmt(y.delta_b_minus_a)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableCard>

          <Disclaimer modul="optimizare" />
          <DisclaimerNote>
            Acest instrument nu constituie consultanță financiară sau
            investițională. Proiecțiile sunt scenarii ipotetice; performanțele
            trecute nu garantează rezultate viitoare.
          </DisclaimerNote>
        </section>
      )}
    </main>
  );
}
