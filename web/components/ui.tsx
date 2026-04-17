import React from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="space-y-3">
      <div className="pill reveal reveal-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
        {eyebrow}
      </div>
      <h1 className="reveal reveal-2 font-serif text-4xl md:text-5xl tracking-tight leading-[1.1]">
        {title}
      </h1>
      <p className="reveal reveal-3 text-[var(--muted)] max-w-2xl leading-relaxed">
        {description}
      </p>
    </header>
  );
}

export function Stat({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`card p-5 ${accent ? "bg-[var(--accent-soft)] border-[var(--accent)]/20" : ""}`}
    >
      <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted-2)]">
        {label}
      </div>
      <div
        className={`stat-value mt-2 text-2xl md:text-[28px] leading-none ${accent ? "text-[var(--accent)]" : ""}`}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[11px] text-[var(--muted)] mt-2 leading-snug">
          {hint}
        </div>
      )}
    </div>
  );
}

export function Field({
  label,
  suffix,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  suffix?: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-[var(--foreground)] font-medium">
        {label}
        {suffix && (
          <span className="text-[var(--muted-2)] ml-1 font-normal">
            {suffix}
          </span>
        )}
      </span>
      <input
        type="number"
        step={step}
        className="input tabular-nums"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function Select<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-[var(--foreground)] font-medium">{label}</span>
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ProductPicker<T extends { id: string }>({
  label,
  hint,
  items,
  value,
  onChange,
  renderLabel,
}: {
  label: string;
  hint?: string;
  items: T[];
  value: string;
  onChange: (id: string) => void;
  renderLabel: (item: T) => string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="card p-4 reveal reveal-3 flex items-center gap-4 flex-wrap">
      <div>
        <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted-2)]">
          {label}
        </div>
        {hint && (
          <div className="text-[11px] text-[var(--muted)] mt-0.5">{hint}</div>
        )}
      </div>
      <select
        className="input flex-1 min-w-[260px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— Manual (parametri custom) —</option>
        {items.map((it) => (
          <option key={it.id} value={it.id}>
            {renderLabel(it)}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 font-medium text-[var(--muted)] text-left text-[11px] uppercase tracking-[0.08em]">
      {children}
    </th>
  );
}

export function Td({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-2 tabular-nums ${className}`}>{children}</td>;
}

export function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted-2)] mb-3">
        {title}
      </div>
      {children}
    </div>
  );
}

export function TableCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="card overflow-hidden">
      <div className="max-h-[480px] overflow-auto">
        <table className="w-full text-xs">{children}</table>
      </div>
    </div>
  );
}

export function DisclaimerNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-[var(--muted)] italic leading-relaxed">
      {children}
    </p>
  );
}
