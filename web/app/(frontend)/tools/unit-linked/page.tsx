"use client";

import { useState } from "react";
import { useEffect } from "react";
import { fetchProduseUL, type ProdusUL } from "@/lib/cms";
import { fmt } from "@/lib/format";
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
  Stat,
  TableCard,
  Td,
  Th,
} from "@/components/ui";
import { Disclaimer } from "@/components/Disclaimer";
import {
  CurrencyToggle,
  convertAmount,
  currencySymbol,
  type CurrencyState,
} from "@/components/CurrencyToggle";

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

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export default function UnitLinkedPage() {
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
  const [result, setResult] = useState<UnitLinkedResponse | null>(null);
  const [lastInputSnapshot, setLastInputSnapshot] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProdusUL[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [lastProductSnapshots, setLastProductSnapshots] =
    useState<unknown>(undefined);
  const [currency, setCurrency] = useState<CurrencyState>({
    display: "RON",
    rateEurRon: 0,
    source: null,
  });

  useEffect(() => {
    fetchProduseUL().then(setProducts);
  }, []);

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
      const display = product.moneda;
      setCurrency((current) => ({ ...current, display }));
    }
  };

  const update = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const selectedProduct = products.find((x) => String(x.id) === selectedProductId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setLastInputSnapshot(null);
    setLastProductSnapshots(undefined);
    try {
      const requestPayload = {
        initial_contribution: form.initial_contribution,
        monthly_premium: form.monthly_premium,
        months: form.months,
        annual_return: form.annual_return / 100,
        allocation_fee_low_pct: form.allocation_fee_low_pct / 100,
        allocation_fee_high_pct: form.allocation_fee_high_pct / 100,
        allocation_threshold: form.allocation_threshold,
        fixed_insurance_fee: form.fixed_insurance_fee,
        initial_units_months: form.initial_units_months,
        initial_expense_recovery_annual_pct:
          form.initial_expense_recovery_annual_pct / 100,
        admin_fee_annual_pct: form.admin_fee_annual_pct / 100,
        holding_tax: form.holding_tax / 100,
      };
      const res = await fetch(`${BACKEND_URL}/api/v1/unit-linked/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const response = (await res.json()) as UnitLinkedResponse;
      const productSnapshots = selectedProduct
        ? { produsUnitLinked: selectedProduct }
        : undefined;
      setResult(response);
      setLastProductSnapshots(productSnapshots);
      setLastInputSnapshot({
        form,
        selectedProductId,
        productSnapshots,
        requestPayload,
        currency,
      });
      captureSimulation("unit_linked");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Eroare necunoscută");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 max-w-6xl mx-auto px-6 py-10 md:py-14 space-y-10">
      <PageHeader
        eyebrow="Investiții · Unit-Linked"
        title="Simulare Unit-Linked cu taxe explicite."
        description="Modelează prime lunare, taxe de alocare, taxă fixă, unități inițiale/acumulare, recuperare cheltuieli inițiale și valoare netă după impozit."
      />

      <ProductPicker
        label="Produs Unit-Linked"
        hint="Populează automat taxele din CMS."
        items={products}
        value={selectedProductId}
        onChange={applyProduct}
        renderLabel={(product) =>
          `${product.provider} · ${product.nume} · admin ${product.adminFeeAnnual}%`
        }
      />

      <form
        onSubmit={submit}
        className="card p-6 md:p-7 grid grid-cols-1 md:grid-cols-3 gap-5 reveal reveal-4"
      >
        <Field
          label="Contribuție inițială"
          suffix="RON"
          value={form.initial_contribution}
          onChange={(v) => update("initial_contribution", v)}
        />
        <Field
          label="Primă lunară"
          suffix="RON"
          value={form.monthly_premium}
          onChange={(v) => update("monthly_premium", v)}
        />
        <Field
          label="Perioadă"
          suffix="luni"
          value={form.months}
          onChange={(v) => update("months", v)}
        />
        <Field
          label="Randament brut"
          suffix="% /an"
          step={0.1}
          value={form.annual_return}
          onChange={(v) => update("annual_return", v)}
        />
        <Field
          label="Taxă alocare sold mic"
          suffix="%"
          step={0.1}
          value={form.allocation_fee_low_pct}
          onChange={(v) => update("allocation_fee_low_pct", v)}
        />
        <Field
          label="Taxă alocare sold mare"
          suffix="%"
          step={0.1}
          value={form.allocation_fee_high_pct}
          onChange={(v) => update("allocation_fee_high_pct", v)}
        />
        <Field
          label="Prag alocare"
          suffix="RON"
          value={form.allocation_threshold}
          onChange={(v) => update("allocation_threshold", v)}
        />
        <Field
          label="Taxă fixă"
          suffix="RON/lună"
          step={0.1}
          value={form.fixed_insurance_fee}
          onChange={(v) => update("fixed_insurance_fee", v)}
        />
        <Field
          label="Unități inițiale"
          suffix="luni"
          value={form.initial_units_months}
          onChange={(v) => update("initial_units_months", v)}
        />
        <Field
          label="Recuperare cheltuieli"
          suffix="% /an"
          step={0.1}
          value={form.initial_expense_recovery_annual_pct}
          onChange={(v) => update("initial_expense_recovery_annual_pct", v)}
        />
        <Field
          label="Taxă administrare"
          suffix="% /an"
          step={0.01}
          value={form.admin_fee_annual_pct}
          onChange={(v) => update("admin_fee_annual_pct", v)}
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
        return (
          <section className="space-y-6 reveal reveal-fade">
            <CurrencyToggle value={currency} onChange={setCurrency} />

            {lastInputSnapshot !== null && (
              <SaveSimulationPanel
                tool="unit_linked"
                inputSnapshot={lastInputSnapshot}
                outputSummary={result}
                productSnapshots={lastProductSnapshots}
              />
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat
                label="Valoare netă finală"
                value={`${fmt(conv(Number(result.net_value_final)))} ${sym}`}
                hint={`din ${fmt(conv(Number(result.total_premiums)))} ${sym} prime totale`}
                accent
              />
              <Stat
                label="Câștig net"
                value={`${fmt(conv(Number(result.net_gain)))} ${sym}`}
                hint="după taxe și impozit final"
              />
              <Stat
                label="Total investit"
                value={`${fmt(conv(Number(result.total_invested)))} ${sym}`}
                hint="după taxă fixă și alocare"
              />
              <Stat
                label="CAGR net"
                value={`${fmt(Number(result.cagr_net) * 100, 2)}%`}
                hint="raportat la primele brute"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat
                label="Taxe fixe"
                value={`${fmt(conv(Number(result.total_fixed_fees)))} ${sym}`}
              />
              <Stat
                label="Taxe alocare"
                value={`${fmt(conv(Number(result.total_allocation_fees)))} ${sym}`}
              />
              <Stat
                label="Recuperare cheltuieli"
                value={`${fmt(conv(Number(result.total_expense_recovery_fees)))} ${sym}`}
              />
              <Stat
                label="Impozit"
                value={`${fmt(conv(Number(result.tax)))} ${sym}`}
              />
            </div>

            <ChartCard title="Valoare cont vs. prime totale">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={(() => {
                    let premiums = 0;
                    return result.schedule.map((r) => {
                      premiums += Number(r.gross_premium);
                      return {
                        month: r.month,
                        valoare: conv(Number(r.closing_balance)),
                        prime: conv(premiums),
                      };
                    });
                  })()}
                  margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                >
                  <defs>
                    <linearGradient id="gUl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#15543d" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#15543d" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#57534e" }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#57534e" }}
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
                    name="Valoare cont"
                    stroke="#15543d"
                    fill="url(#gUl)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="prime"
                    name="Prime brute"
                    stroke="#a8a29e"
                    strokeDasharray="4 4"
                    dot={false}
                  />
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
                {result.schedule.map((r) => (
                  <tr key={r.month} className="border-t border-[var(--border)]">
                    <Td>{r.month}</Td>
                    <Td>{fmt(conv(Number(r.gross_premium)))}</Td>
                    <Td>{fmt(conv(Number(r.fixed_fee)))}</Td>
                    <Td>{fmt(conv(Number(r.allocation_fee)))}</Td>
                    <Td>{fmt(conv(Number(r.invested_amount)))}</Td>
                    <Td>{fmt(conv(Number(r.expense_recovery_fee)))}</Td>
                    <Td>{fmt(conv(Number(r.closing_balance)))}</Td>
                  </tr>
                ))}
              </tbody>
            </TableCard>

            <Disclaimer modul="ul" />
            <DisclaimerNote>
              Modelul este o aproximare educațională a traseului taxelor
              Unit-Linked. Parametrii produsului trebuie validați din documentele
              contractuale curente înainte de folosire comercială.
            </DisclaimerNote>
          </section>
        );
      })()}
    </main>
  );
}
