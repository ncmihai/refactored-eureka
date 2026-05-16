import { fmt } from "@/lib/format";

export type ReportChartSeries = {
  label: string;
  color: string;
  points: Array<{ x: number; y: number }>;
};

export function ReportChart({
  title,
  series,
}: {
  title: string;
  series: ReportChartSeries[];
}) {
  const allPoints = series.flatMap((item) => item.points);
  const maxX = Math.max(1, ...allPoints.map((point) => point.x));
  const maxY = Math.max(1, ...allPoints.map((point) => point.y)) * 1.08;
  const width = 760;
  const height = 280;
  const padX = 54;
  const padTop = 24;
  const padBottom = 42;
  const innerW = width - padX - 20;
  const innerH = height - padTop - padBottom;
  const toSvg = (point: { x: number; y: number }) => {
    const x = padX + (point.x / maxX) * innerW;
    const y = padTop + innerH - (point.y / maxY) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  };

  return (
    <div className="card p-5 space-y-3">
      <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted-2)]">
        {title}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img">
        {[0, 1, 2, 3, 4].map((tick) => {
          const y = padTop + (innerH * tick) / 4;
          const value = maxY * (1 - tick / 4);
          return (
            <g key={tick}>
              <line x1={padX} x2={padX + innerW} y1={y} y2={y} stroke="var(--border)" />
              <text x={padX - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
                {fmt(value, 0)}
              </text>
            </g>
          );
        })}
        <line x1={padX} x2={padX} y1={padTop} y2={padTop + innerH} stroke="var(--border)" />
        <line x1={padX} x2={padX + innerW} y1={padTop + innerH} y2={padTop + innerH} stroke="var(--border)" />
        {series.map((item) => (
          <polyline
            key={item.label}
            fill="none"
            stroke={item.color}
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={item.points.map(toSvg).join(" ")}
          />
        ))}
        <text x={padX} y={height - 12} fontSize="11" fill="var(--muted)">
          Start
        </text>
        <text x={padX + innerW} y={height - 12} textAnchor="end" fontSize="11" fill="var(--muted)">
          Final
        </text>
      </svg>
      <div className="flex flex-wrap gap-4 text-xs text-[var(--muted)]">
        {series.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
