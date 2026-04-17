"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchInflatii, type Inflatie } from "@/lib/cms";

export type InflationState = {
  mode: "nominal" | "real";
  rate: number;
  currency: "RON" | "EUR" | "USD";
  source: string | null;
};

type Props = {
  currency?: "RON" | "EUR" | "USD";
  value: InflationState;
  onChange: (next: InflationState) => void;
};

export function InflationToggle({ currency = "RON", value, onChange }: Props) {
  const [inflatii, setInflatii] = useState<Inflatie[]>([]);

  useEffect(() => {
    fetchInflatii().then(setInflatii);
  }, []);

  const forCurrency = useMemo(
    () =>
      inflatii
        .filter((i) => i.moneda === currency && i.activ)
        .sort((a, b) => b.an - a.an),
    [inflatii, currency],
  );

  useEffect(() => {
    if (!forCurrency.length) return;
    if (value.source) return;
    const def = forCurrency.find((i) => i.default) ?? forCurrency[0];
    onChange({
      ...value,
      rate: def.rata,
      currency,
      source: `${def.moneda} ${def.an}`,
    });
  }, [forCurrency, currency, value, onChange]);

  return (
    <div className="card p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-1">
        <div className="text-xs uppercase tracking-[0.14em] text-[var(--muted-2)]">
          Inflație
        </div>
        <div className="text-sm text-[var(--muted)]">
          Compară puterea de cumpărare: nominal (valori raw) sau real
          (deflatate la ziua de azi).
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div
          className="inline-flex rounded-md border border-[var(--border)] p-0.5 text-sm"
          role="tablist"
          aria-label="Mod inflație"
        >
          <button
            type="button"
            role="tab"
            aria-selected={value.mode === "nominal"}
            onClick={() => onChange({ ...value, mode: "nominal" })}
            className={`px-3 py-1 rounded-[4px] transition ${
              value.mode === "nominal"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Nominal
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={value.mode === "real"}
            onClick={() => onChange({ ...value, mode: "real" })}
            className={`px-3 py-1 rounded-[4px] transition ${
              value.mode === "real"
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Real
          </button>
        </div>

        <select
          className="input max-w-[240px]"
          value={value.source ?? ""}
          onChange={(e) => {
            const selected = forCurrency.find(
              (i) => `${i.moneda} ${i.an}` === e.target.value,
            );
            if (!selected) return;
            onChange({
              mode: value.mode,
              rate: selected.rata,
              currency,
              source: `${selected.moneda} ${selected.an}`,
            });
          }}
          disabled={!forCurrency.length}
        >
          {forCurrency.length === 0 && <option>— fără date —</option>}
          {forCurrency.map((i) => (
            <option key={i.id} value={`${i.moneda} ${i.an}`}>
              {i.moneda} {i.an} · {i.rata}% /an
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function deflate(
  nominal: number,
  annualInflationPct: number,
  years: number,
): number {
  if (years <= 0) return nominal;
  const rate = annualInflationPct / 100;
  return nominal / Math.pow(1 + rate, years);
}
