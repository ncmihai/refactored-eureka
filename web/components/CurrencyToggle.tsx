"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchCursuri, type Curs } from "@/lib/cms";

export type Currency = "EUR" | "RON";

export type CurrencyState = {
  display: Currency;
  rateEurRon: number;
  source: string | null;
};

type Props = {
  value: CurrencyState;
  onChange: (next: CurrencyState) => void;
};

export function CurrencyToggle({ value, onChange }: Props) {
  const [cursuri, setCursuri] = useState<Curs[]>([]);

  useEffect(() => {
    fetchCursuri().then(setCursuri);
  }, []);

  const eurRonLatest = useMemo(() => {
    const eurRon = cursuri.filter((c) => c.pereche === "EUR_RON");
    if (!eurRon.length) return null;
    return eurRon.sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
    )[0];
  }, [cursuri]);

  useEffect(() => {
    if (!eurRonLatest) return;
    if (value.source) return;
    onChange({
      display: value.display,
      rateEurRon: eurRonLatest.curs,
      source: `BNR ${eurRonLatest.data.slice(0, 10)}`,
    });
  }, [eurRonLatest, value, onChange]);

  const rate = value.rateEurRon || eurRonLatest?.curs || 5;

  return (
    <div className="card p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-1">
        <div className="text-xs uppercase tracking-[0.14em] text-[var(--muted-2)]">
          Monedă afișare
        </div>
        <div className="text-sm text-[var(--muted)]">
          Sumele rămân identice; se schimbă doar afișarea. Curs EUR/RON ={" "}
          <span className="font-medium text-[var(--foreground)]">
            {rate.toFixed(4)}
          </span>{" "}
          {value.source && (
            <span className="text-[var(--muted-2)]">({value.source})</span>
          )}
        </div>
      </div>

      <div
        className="inline-flex rounded-md border border-[var(--border)] p-0.5 text-sm"
        role="tablist"
        aria-label="Monedă"
      >
        {(["EUR", "RON"] as const).map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={value.display === c}
            onClick={() =>
              onChange({
                display: c,
                rateEurRon: rate,
                source: value.source,
              })
            }
            className={`px-3 py-1 rounded-[4px] transition min-w-[52px] ${
              value.display === c
                ? "bg-[var(--accent)] text-white"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

export function convertAmount(
  valueInEur: number,
  state: CurrencyState,
): number {
  return state.display === "RON"
    ? valueInEur * (state.rateEurRon || 1)
    : valueInEur;
}

export function currencySymbol(state: CurrencyState): string {
  return state.display === "RON" ? "lei" : "€";
}
