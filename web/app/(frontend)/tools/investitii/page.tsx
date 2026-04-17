"use client";

import { useState } from "react";
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

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const fmt = (v: string | number, digits = 2) =>
  Number(v).toLocaleString("ro-RO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

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
  const [result, setResult] = useState<InvestitieResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      const res = await fetch(`${BACKEND_URL}/api/v1/investitii/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          principal: form.principal,
          months: form.months,
          monthly_contribution: form.monthly_contribution,
          annual_return: form.annual_return / 100,
          ter: form.ter / 100,
          broker_fee_pct: form.broker_fee_pct / 100,
          broker_fee_fixed: form.broker_fee_fixed,
          holding_tax: form.holding_tax / 100,
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
        eyebrow="Investiții · ETF / Fond"
        title="Acumulare pe termen lung: SIP, TER și impozit pe câștig."
        description="Investiție inițială + contribuții lunare (DCA), compunere end-of-month. Randamentul brut e redus de TER; comisioanele broker se scad la fiecare tranzacție; impozitul pe câștig se aplică la final."
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
            {loading ? "Calculez…" : "Simulează"}
          </button>
          {error && (
            <span className="text-sm text-[var(--danger)]">{error}</span>
          )}
        </div>
      </form>

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
