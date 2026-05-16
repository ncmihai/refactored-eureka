import {
  compactDate,
  getTrustAssumptions,
  getTrustDisclaimer,
  getTrustSources,
  type SavedSimulationReport,
} from "@/lib/report-data";

function SourceTypeLabel({ type }: { type?: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--border)] px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[var(--muted-2)]">
      {type ?? "sursă"}
    </span>
  );
}

export function TrustSnapshotPanel({ doc }: { doc: SavedSimulationReport }) {
  const assumptions = getTrustAssumptions(doc);
  const disclaimer = getTrustDisclaimer(doc);
  const sources = getTrustSources(doc);
  const hasTrustLayer =
    Boolean(assumptions?.items?.length) || Boolean(disclaimer) || Boolean(sources?.entries?.length);

  if (!hasTrustLayer) {
    return (
      <section className="card p-5 text-sm text-[var(--muted)]">
        Metadatele trust layer nu există pentru această simulare salvată anterior.
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="text-xs uppercase tracking-[0.12em] text-[var(--muted-2)]">
        Trust layer
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <h2 className="text-sm font-semibold">Ipoteze</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--muted)] leading-relaxed">
            {(assumptions?.items ?? []).map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
          <div className="mt-4 text-xs text-[var(--muted-2)]">
            Versiune {assumptions?.version ?? "-"} · {compactDate(assumptions?.generatedAt)}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold">Disclaimer capturat</h2>
          <div className="mt-3 space-y-2 text-sm text-[var(--muted)]">
            <p>{disclaimer?.nume ?? "Disclaimer indisponibil"}</p>
            <p>
              Modul {disclaimer?.modul ?? "-"} · versiune{" "}
              {disclaimer?.versiune ?? disclaimer?.version ?? "-"}
            </p>
          </div>
          <div className="mt-4 text-xs text-[var(--muted-2)]">
            Capturat {compactDate(disclaimer?.capturedAt)}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold">Surse și freshness</h2>
          <div className="mt-3 space-y-3 text-sm">
            {(sources?.entries ?? []).length ? (
              sources?.entries?.map((entry, index) => (
                <div key={`${entry.label}-${index}`} className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SourceTypeLabel type={entry.type} />
                    <span className="font-medium">{entry.label ?? "Sursă"}</span>
                  </div>
                  <div className="text-[var(--muted)] break-words">
                    {entry.url ? (
                      <a href={entry.url} className="underline underline-offset-2" target="_blank" rel="noreferrer">
                        {entry.source ?? entry.url}
                      </a>
                    ) : (
                      entry.source ?? "-"
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[var(--muted)]">Nu există surse capturate pentru acest snapshot.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
