"use client";

import { useEffect, useState } from "react";
import { displayName, roleLabel, type AuthStatus } from "@/lib/auth";
import { capturePdfExport, type ToolSlug } from "@/lib/posthog";
import { fetchAuthStatus, saveSimulation, type SimulareDoc } from "@/lib/simulari";

export function SaveSimulationPanel({
  tool,
  inputSnapshot,
  outputSummary,
  productSnapshots,
  pdfEnabled = false,
}: {
  tool: ToolSlug;
  inputSnapshot: unknown;
  outputSummary: unknown;
  productSnapshots?: unknown;
  pdfEnabled?: boolean;
}) {
  const [clientAlias, setClientAlias] = useState("Client demo");
  const [saved, setSaved] = useState<SimulareDoc | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auth, setAuth] = useState<AuthStatus | null>(null);

  useEffect(() => {
    fetchAuthStatus().then(setAuth).catch(() => {
      setAuth({ authenticated: false, user: null });
    });
  }, []);

  const shareUrl =
    saved && typeof window !== "undefined"
      ? `${window.location.origin}/s/${saved.shareId}`
      : null;

  const handleSave = async () => {
    if (auth && !auth.authenticated) {
      setError("Autentificarea este necesară pentru salvare.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const doc = await saveSimulation({
        tool,
        clientAlias,
        inputSnapshot,
        outputSummary,
        productSnapshots,
      });
      setSaved(doc);
    } catch (err) {
      const message = err instanceof Error ? err.message : "save_failed";
      setError(
        message === "login_required"
          ? "Autentificarea este necesară pentru salvare."
          : message,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-5 flex flex-col gap-4">
      {auth === null ? (
        <div className="text-sm text-[var(--muted)]">
          Verific autentificarea…
        </div>
      ) : auth.authenticated && auth.user ? (
        <>
          <div className="flex items-center justify-between gap-3 text-xs text-[var(--muted)]">
            <span>
              Salvare deblocat pentru {displayName(auth.user)}
            </span>
            <span className="pill">{roleLabel(auth.user.role)}</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-end gap-3">
            <label className="flex flex-col gap-1.5 text-sm flex-1">
              <span className="text-[var(--foreground)] font-medium">
                Alias client
              </span>
              <input
                className="input"
                value={clientAlias}
                onChange={(e) => setClientAlias(e.target.value)}
                placeholder="Client demo"
              />
            </label>
            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? "Salvez…" : "Salvează simularea"}
            </button>
          </div>
        </>
      ) : (
        <div className="text-sm text-[var(--muted)]">
          Salvarea simulărilor, istoricul firmei și exportul PDF sunt disponibile
          după autentificare.{" "}
          <a className="underline" href="/admin">
            Intră în admin
          </a>
          .
        </div>
      )}

      {error && (
        <p className="text-sm text-[var(--danger)]">
          {error} Intră în <a className="underline" href="/admin">admin</a> și
          revino pe unealtă.
        </p>
      )}

      {saved && shareUrl && (
        <div className="flex flex-col md:flex-row md:items-center gap-3 text-sm">
          <a className="btn-secondary" href={shareUrl}>
            Deschide link public
          </a>
          {pdfEnabled && (
            <a
              className="btn-secondary"
              href={`/api/simulari/${saved.id}/pdf`}
              onClick={() => capturePdfExport(tool)}
            >
              Export PDF
            </a>
          )}
          <span className="text-[var(--muted)] break-all">{shareUrl}</span>
        </div>
      )}
    </div>
  );
}
