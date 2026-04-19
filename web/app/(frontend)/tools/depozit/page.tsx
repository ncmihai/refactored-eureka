"use client";

import { useEffect, useState } from "react";
import { fetchDobanziDepozit, type DobandaDepozit } from "@/lib/cms";
import { captureSimulation } from "@/lib/posthog";
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
import { InflationToggle, deflate, type InflationState } from "@/components/InflationToggle";
import {
  CurrencyToggle,
  convertAmount,
  currencySymbol,
  type CurrencyState,
} from "@/components/CurrencyToggle";

type DepozitRow = {
  month: number;
  opening_balance: string;
  contribution: string;
  gross_interest: string;
  tax: string;
  net_interest: string;
  closing_balance: string;
};

type DepozitResponse = {
  schedule: DepozitRow[];
  total_contributions: string;
  total_gross_interest: string;
  total_tax: string;
  total_net_interest: string;
  final_balance: string;
  effective_annual_yield_net: string;
};

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

const fmt = (v: string | number, digits = 2) =>
  Number(v).toLocaleString("ro-RO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export default function DepozitBancar() {
  const [form, setForm] = useState({
    principal: 10000,
    months: 12,
    annual_rate: 6,
    monthly_contribution: 0,
    tax_rate: 10,
    capitalization: "monthly" as "monthly" | "at_maturity",
  });
  const [result, setResult] = useState<DepozitResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deposits, setDeposits] = useState<DobandaDepozit[]>([]);
  const [selectedDepositId, setSelectedDepositId] = useState<string>("");
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
    fetchDobanziDepozit().then(setDeposits);
  }, []);

  const applyDeposit = (id: string) => {
    setSelectedDepositId(id);
    if (!id) return;
    const d = deposits.find((x) => x.id === id);
    if (!d) return;
    setForm((f) => ({
      ...f,
      annual_rate: d.dobandaBruta,
      months: d.scadentaLuni,
      capitalization: d.capitalizare,
      principal:
        d.sumaMinima && f.principal < d.sumaMinima ? d.sumaMinima : f.principal,
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
      const res = await fetch(`${BACKEND_URL}/api/v1/depozit/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          principal: form.principal,
          months: form.months,
          annual_rate: form.annual_rate / 100,
          monthly_contribution: form.monthly_contribution,
          tax_rate: form.tax_rate / 100,
          capitalization: form.capitalization,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      setResult(await res.json());
      captureSimulation("depozit");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 max-w-6xl mx-auto px-6 py-10 md:py-14 space-y-10">
      <PageHeader
        eyebrow="Economii · Depozit"
        title="Evoluția unui depozit cu impozit pe dobândă."
        description="Capitalizare lunară sau la scadență, impozit 10% pe dobândă (standard RO), contribuții recurente opționale. Vezi sold lună de lună și randamentul efectiv net."
      />

      <ProductPicker
        label="Depozit bancar"
        hint="Populează automat dobânda, scadența și capitalizarea."
        items={deposits}
        value={selectedDepositId}
        onChange={applyDeposit}
        renderLabel={(d) =>
          `${d.banca} · ${d.moneda} ${d.scadentaLuni}L · ${d.dobandaBruta}% brut`
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
          label="Dobândă anuală"
          suffix="% brut"
          step={0.01}
          value={form.annual_rate}
          onChange={(v) => update("annual_rate", v)}
        />
        <Field
          label="Contribuție lunară"
          suffix="€"
          value={form.monthly_contribution}
          onChange={(v) => update("monthly_contribution", v)}
        />
        <Field
          label="Impozit pe dobândă"
          suffix="%"
          step={0.1}
          value={form.tax_rate}
          onChange={(v) => update("tax_rate", v)}
        />
        <Select
          label="Capitalizare"
          value={form.capitalization}
          onChange={(v) => update("capitalization", v)}
          options={[
            { value: "monthly", label: "Lunară (compus)" },
            { value: "at_maturity", label: "La scadență (simplu)" },
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

      {result && (
        <section className="space-y-6 reveal reveal-fade">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InflationToggle value={inflation} onChange={setInflation} />
            <CurrencyToggle value={currency} onChange={setCurrency} />
          </div>

          {(() => {
            const years = form.months / 12;
            const sym = currencySymbol(currency);
            const conv = (v: number) => convertAmount(v, currency);
            const nominalFinal = Number(result.final_balance);
            const nominalNet = Number(result.total_net_interest);
            const realFinal =
              inflation.mode === "real" && inflation.rate > 0
                ? deflate(nominalFinal, inflation.rate, years)
                : nominalFinal;
            const realNet =
              inflation.mode === "real" && inflation.rate > 0
                ? deflate(nominalNet, inflation.rate, years)
                : nominalNet;
            const realSuffix =
              inflation.mode === "real"
                ? `real (deflatat ${inflation.rate}%/an)`
                : undefined;
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat
                  label="Sold final"
                  value={`${fmt(conv(realFinal))} ${sym}`}
                  hint={
                    realSuffix ??
                    `din ${fmt(conv(Number(result.total_contributions)))} ${sym} depuși`
                  }
                  accent
                />
                <Stat
                  label="Dobândă netă"
                  value={`${fmt(conv(realNet))} ${sym}`}
                  hint={
                    realSuffix ??
                    `brut ${fmt(conv(Number(result.total_gross_interest)))} ${sym}`
                  }
                />
                <Stat
                  label="Impozit plătit"
                  value={`${fmt(conv(Number(result.total_tax)))} ${sym}`}
                  hint={`${form.tax_rate}% din dobândă`}
                />
                <Stat
                  label="Randament efectiv net"
                  value={`${fmt(Number(result.effective_annual_yield_net) * 100, 3)}%`}
                  hint="pe an, după impozit"
                />
              </div>
            );
          })()}

          <ChartCard title="Evoluție sold depozit și depuneri cumulate">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={(() => {
                  let cumContrib = Number(form.principal);
                  return result.schedule.map((r) => {
                    cumContrib += Number(r.contribution);
                    return {
                      month: r.month,
                      sold: convertAmount(Number(r.closing_balance), currency),
                      depuneri: convertAmount(cumContrib, currency),
                    };
                  });
                })()}
                margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
              >
                <defs>
                  <linearGradient id="gDep" x1="0" y1="0" x2="0" y2="1">
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
                <Area
                  type="monotone"
                  dataKey="sold"
                  name="Sold depozit"
                  stroke="#15543d"
                  fill="url(#gDep)"
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
                <Th>Contribuție</Th>
                <Th>Dobândă brută</Th>
                <Th>Impozit</Th>
                <Th>Dobândă netă</Th>
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
                  <Td>{fmt(convertAmount(Number(r.opening_balance), currency))}</Td>
                  <Td>{fmt(convertAmount(Number(r.contribution), currency))}</Td>
                  <Td>{fmt(convertAmount(Number(r.gross_interest), currency))}</Td>
                  <Td>{fmt(convertAmount(Number(r.tax), currency))}</Td>
                  <Td>{fmt(convertAmount(Number(r.net_interest), currency))}</Td>
                  <Td>{fmt(convertAmount(Number(r.closing_balance), currency))}</Td>
                </tr>
              ))}
            </tbody>
          </TableCard>

          <Disclaimer modul="depozit" />
          <DisclaimerNote>
            Acest instrument nu constituie consultanță financiară. Dobânzile și
            impozitul pot diferi între bănci; verifică întotdeauna condițiile
            contractuale înainte de a deschide un depozit.
          </DisclaimerNote>
        </section>
      )}
    </main>
  );
}
