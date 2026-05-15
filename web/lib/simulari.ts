import type { ToolSlug } from "@/lib/posthog";
import type { AuthStatus } from "@/lib/auth";

export type SimulareDoc = {
  id: string;
  tool: ToolSlug;
  clientAlias: string;
  inputSnapshot: unknown;
  outputSummary: unknown;
  productSnapshots?: unknown;
  shareId: string;
  shareExpiresAt: string;
  status: "active" | "archived";
  pdfExportedAt?: string | null;
  pdfHash?: string | null;
  pdfVersion?: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function saveSimulation(input: {
  tool: ToolSlug;
  clientAlias?: string;
  inputSnapshot: unknown;
  outputSummary: unknown;
  productSnapshots?: unknown;
}): Promise<SimulareDoc> {
  const res = await fetch("/api/simulari", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as SimulareDoc;
}

export async function fetchSimulari(): Promise<SimulareDoc[]> {
  const res = await fetch("/api/simulari", { cache: "no-store" });
  if (!res.ok) return [];
  const body = (await res.json()) as { docs?: SimulareDoc[] };
  return body.docs ?? [];
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  if (!res.ok) return { authenticated: false, user: null };
  return (await res.json()) as AuthStatus;
}
