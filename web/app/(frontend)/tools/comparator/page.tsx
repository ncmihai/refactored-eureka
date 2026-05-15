"use client";

import { useState } from "react";
import { captureSimulation } from "@/lib/posthog";
import { SaveSimulationPanel } from "@/components/SaveSimulationPanel";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
  Stat,
} from "@/components/ui";
import {
  CurrencyToggle,
  convertAmount,
  currencySymbol,
  type CurrencyState,
} from "@/components/CurrencyToggle";

type ProductSummary = {
  final_value_net: string;
  total_contributed: string;
  total_fees: string;
  net_gain: string;
  cagr_net: string;
};

type ComparatorResponse = {
  deposit: ProductSummary;
  etf: ProductSummary;
  unit_linked: ProductSummary;
  leader: "deposit" | "etf" | "unit_linked";
  series: {
    month: number;
    deposit: string;
    etf: string;
    unit_linked: string;
  }[];
};

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const fmt = (v: string | number, digits = 2) =>
  Number(v).toLocaleString("ro-RO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const labels = {
  deposit: "Depozit",
  etf: "ETF",
  unit_linked: "Unit-Linked",
};

export default function ComparatorPage() {
  const [form, setForm] = useState({
    principal: 5000,
    monthly_contribution: 300,
    months: 120,
    deposit_annual_rate: 5,
    etf_annual_return: 7,
    etf_ter: 0.22,
    ul_annual_return: 6,
    ul_admin_fee_annual_pct: 1.29,
    holding_tax: 10,
  });
  const [result, setResult] = useState<ComparatorResponse | null>(null);
  const [lastInputSnapshot, setLastInputSnapshot] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<CurrencyState>({
    display: "EUR",
    rateEurRon: 0,
    source: null,
  });

  const update = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setLastInputSnapshot(null);
    try {
      const requestPayload = {
        principal: form.principal,
        monthly_contribution: form.monthly_contribution,
        months: form.months,
        deposit_annual_rate: form.deposit_annual_rate / 100,
        etf_annual_return: form.etf_annual_return / 100,
        etf_ter: form.etf_ter / 100,
        ul_annual_return: form.ul_annual_return / 100,
        ul_admin_fee_annual_pct: form.ul_admin_fee_annual_pct / 100,
        holding_tax: form.holding_tax / 100,
      };
      const res = await fetch(`${BACKEND_URL}/api/v1/comparator/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const response = (await res.json()) as ComparatorResponse;
      setResult(response);
      setLastInputSnapshot({
        form,
        requestPayload,
        currency,
      });
      captureSimulation("comparator");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setLoading(false);
    }
  };

  const summaryCard = (
    key: "deposit" | "etf" | "unit_linked",
    summary: ProductSummary,
  ) => {
    const sym = currencySymbol(currency);
    const conv = (v: number) => convertAmount(v, currency);
    return (
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted-2)]">
            {labels[key]}
          </div>
          {result?.leader === key && <span className="pill">lider numeric</span>}
        </div>
        <div className="stat-value mt-3 text-3xl text-[var(--accent)]">
          {fmt(conv(Number(summary.final_value_net)))} {sym}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
          <div>
            <div className="text-[var(--muted-2)] uppercase tracking-[0.08em]">
              Câștig net
            </div>
            <div className="tabular-nums mt-1">
              {fmt(conv(Number(summary.net_gain)))} {sym}
            </div>
          </div>
          <div>
            <div className="text-[var(--muted-2)] uppercase tracking-[0.08em]">
              Taxe
            </div>
            <div className="tabular-nums mt-1">
              {fmt(conv(Number(summary.total_fees)))} {sym}
            </div>
          </div>
          <div>
            <div className="text-[var(--muted-2)] uppercase tracking-[0.08em]">
              Depus
            </div>
            <div className="tabular-nums mt-1">
              {fmt(conv(Number(summary.total_contributed)))} {sym}
            </div>
          </div>
          <div>
            <div className="text-[var(--muted-2)] uppercase tracking-[0.08em]">
              CAGR
            </div>
            <div className="tabular-nums mt-1">
              {fmt(Number(summary.cagr_net) * 100, 2)}%
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="flex-1 max-w-6xl mx-auto px-6 py-10 md:py-14 space-y-10">
      <PageHeader
        eyebrow="Comparator · Depozit / ETF / Unit-Linked"
        title="Trei produse, același cash-flow."
        description="Compară depozit bancar, ETF și Unit-Linked pe aceeași sumă inițială, contribuție lunară și perioadă. Rezultatul este numeric, nu recomandare personalizată."
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
          label="Contribuție lunară"
          suffix="€"
          value={form.monthly_contribution}
          onChange={(v) => update("monthly_contribution", v)}
        />
        <Field
          label="Perioadă"
          suffix="luni"
          value={form.months}
          onChange={(v) => update("months", v)}
        />
        <Field
          label="Dobândă depozit"
          suffix="%"
          step={0.1}
          value={form.deposit_annual_rate}
          onChange={(v) => update("deposit_annual_rate", v)}
        />
        <Field
          label="Randament ETF"
          suffix="%"
          step={0.1}
          value={form.etf_annual_return}
          onChange={(v) => update("etf_annual_return", v)}
        />
        <Field
          label="TER ETF"
          suffix="%"
          step={0.01}
          value={form.etf_ter}
          onChange={(v) => update("etf_ter", v)}
        />
        <Field
          label="Randament UL"
          suffix="%"
          step={0.1}
          value={form.ul_annual_return}
          onChange={(v) => update("ul_annual_return", v)}
        />
        <Field
          label="Taxă admin UL"
          suffix="%"
          step={0.01}
          value={form.ul_admin_fee_annual_pct}
          onChange={(v) => update("ul_admin_fee_annual_pct", v)}
        />
        <Field
          label="Impozit câștig"
          suffix="%"
          step={0.1}
          value={form.holding_tax}
          onChange={(v) => update("holding_tax", v)}
        />
        <div className="md:col-span-3 flex items-center gap-4 pt-2 border-t border-[var(--border)]">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Calculez…" : "Compară"}
          </button>
          {error && (
            <span className="text-sm text-[var(--danger)]">{error}</span>
          )}
        </div>
      </form>

      {result && (
        <section className="space-y-6 reveal reveal-fade">
          <CurrencyToggle value={currency} onChange={setCurrency} />
          {lastInputSnapshot !== null && (
            <SaveSimulationPanel
              tool="comparator"
              inputSnapshot={lastInputSnapshot}
              outputSummary={result}
            />
          )}
          <Stat
            label="Lider numeric"
            value={labels[result.leader]}
            hint="cea mai mare valoare finală netă în scenariul introdus"
            accent
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {summaryCard("deposit", result.deposit)}
            {summaryCard("etf", result.etf)}
            {summaryCard("unit_linked", result.unit_linked)}
          </div>
          <ChartCard title="Evoluție valoare netă comparativă">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart
                data={result.series.map((r) => ({
                  month: r.month,
                  deposit: convertAmount(Number(r.deposit), currency),
                  etf: convertAmount(Number(r.etf), currency),
                  unit_linked: convertAmount(Number(r.unit_linked), currency),
                }))}
                margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e0" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#57534e" }} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#57534e" }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                />
                <Tooltip
                  formatter={(v) => `${fmt(Number(v))} ${currencySymbol(currency)}`}
                  labelFormatter={(m) => `Luna ${m}`}
                  contentStyle={{
                    background: "#fff",
                    border: "1px solid #e7e5e0",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line type="monotone" dataKey="deposit" name="Depozit" stroke="#78716c" dot={false} />
                <Line type="monotone" dataKey="etf" name="ETF" stroke="#15543d" strokeWidth={2.4} dot={false} />
                <Line type="monotone" dataKey="unit_linked" name="Unit-Linked" stroke="#2563eb" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <DisclaimerNote>
            Comparatorul normalizează cash-flow-ul pentru discuție educațională.
            Nu include toate clauzele contractuale posibile, lichiditatea,
            profilul MiFID sau toleranța individuală la risc.
          </DisclaimerNote>
        </section>
      )}
    </main>
  );
}
