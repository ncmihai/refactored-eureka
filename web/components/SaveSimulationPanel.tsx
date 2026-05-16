"use client";

import { useEffect, useMemo, useState } from "react";
import { accountStatusLabel, displayName, hasBetaAccess, roleLabel, type AuthStatus } from "@/lib/auth";
import { capturePdfExport, type ToolSlug } from "@/lib/posthog";
import { fetchAuthStatus, saveSimulation, type SimulareDoc } from "@/lib/simulari";

function snapshotSignature(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(Date.now());
  }
}

function saveErrorMessage(message: string) {
  const map: Record<string, string> = {
    login_required: "Autentificarea este necesară pentru salvare.",
    invalid_tool: "Unealta curentă nu poate fi salvată.",
    missing_snapshot: "Lipsește snapshot-ul simulării. Rulează din nou simularea și încearcă salvarea.",
    account_pending_approval: "Contul este în așteptare. Un Super Admin trebuie să aprobe accesul înainte de salvare.",
    "HTTP 500": "Nu am putut salva simularea. Verifică sesiunea de admin și reîncearcă.",
  };
  return map[message] ?? (message.startsWith("HTTP 5") ? map["HTTP 500"] : message);
}

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
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [copied, setCopied] = useState(false);

  const currentSignature = useMemo(
    () =>
      snapshotSignature({
        tool,
        clientAlias,
        inputSnapshot,
        outputSummary,
        productSnapshots,
      }),
    [clientAlias, inputSnapshot, outputSummary, productSnapshots, tool],
  );
  const alreadySaved = Boolean(saved && savedSignature === currentSignature);
  const betaAccess = auth?.user ? hasBetaAccess(auth.user) : false;

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
    if (auth?.user && !hasBetaAccess(auth.user)) {
      setError(saveErrorMessage("account_pending_approval"));
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
      setSavedSignature(currentSignature);
      setCopied(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "save_failed";
      setError(saveErrorMessage(message));
    } finally {
      setSaving(false);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
  };

  return (
    <div className="card p-5 flex flex-col gap-4">
      {auth === null ? (
        <div className="text-sm text-[var(--muted)]">
          Verific autentificarea…
        </div>
      ) : auth.authenticated && auth.user && betaAccess ? (
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
              disabled={saving || alreadySaved}
              onClick={handleSave}
            >
              {saving
                ? "Salvez…"
                : alreadySaved
                  ? "Salvat"
                  : saved
                    ? "Salvează versiunea actualizată"
                    : "Salvează simularea"}
            </button>
          </div>
          {alreadySaved && (
            <p className="text-sm text-[var(--accent)]">
              Salvat. Linkul public și exportul sunt pregătite mai jos.
            </p>
          )}
        </>
      ) : (
        <div className="text-sm text-[var(--muted)]">
          {auth.authenticated && auth.user
            ? `Contul este ${accountStatusLabel(auth.user.accountStatus).toLowerCase()}. Salvarea și exportul PDF se activează după aprobarea Super Admin.`
            : "Salvarea simulărilor, istoricul firmei și exportul PDF sunt disponibile după autentificare."}{" "}
          <a className="underline" href="/admin">Intră în admin</a>.
        </div>
      )}

      {error && (
        <p className="text-sm text-[var(--danger)]">
          {error}{" "}
          <a className="underline" href="/admin">
            Intră în admin
          </a>
          .
        </p>
      )}

      {saved && shareUrl && (
        <div className="flex flex-col md:flex-row md:items-center gap-3 text-sm">
          <a className="btn-secondary" href={shareUrl}>
            Deschide raportul
          </a>
          <button type="button" className="btn-secondary" onClick={copyShareUrl}>
            {copied ? "Link copiat" : "Copiază link"}
          </button>
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
