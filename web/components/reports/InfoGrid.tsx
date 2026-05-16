export function InfoGrid({ items }: { items: Array<[string, string]> }) {
  return (
    <div className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      {items.map(([label, value]) => (
        <div key={label}>
          <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted-2)]">
            {label}
          </div>
          <div className="mt-1 font-medium">{value}</div>
        </div>
      ))}
    </div>
  );
}
