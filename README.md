<p align="center">
  <a href="https://instrumentar.vercel.app">Live</a>
  ·
  <a href="https://instrumentar.vercel.app/admin">Admin</a>
  ·
  <a href="docs/planning.md">Planning</a>
  ·
  <a href="docs/details.md">Details</a>
  ·
  <a href="docs/progress.md">Progress</a>
  ·
  <a href="docs/task.md">Tasks</a>
</p>

# Instrumentar — Finance Platform

Modular financial-analysis platform that replaces a brittle Excel workbook used by independent consultants in Romania. Four calculators live (Credit, Optimizare, Depozit, Investiții ETF), with Monte Carlo, decumulation and multi-tenant white-label on the roadmap. Deterministic math runs in a Python FastAPI engine with parity tests against the original Excel; the CMS-driven admin and public tools live in a Next.js 16 + Payload v3 monorepo.

> [!IMPORTANT]
> If you just opened this repo, start with the docs in this order:
> - [docs/planning.md](docs/planning.md) — vision, architecture, multi-tenancy, 3-phase roadmap, business model.
> - [docs/details.md](docs/details.md) — per-tool formulas and implementation specs (anuity math, IRCC revision, ETF DCA, depozit compound, Monte Carlo plan).
> - [docs/task.md](docs/task.md) — task tracker grouped by phase; current state at a glance.
> - [docs/progress.md](docs/progress.md) — chronological decision log, never pruned.

## Current repository shape

- [`docs/`](docs/) — planning, specs, trackers; 4 living documents, updated on every substantive change.
- [`web/`](web/) — Next.js 16 (App Router, Turbopack) + Payload CMS v3. Public tools under `app/(frontend)/tools/*`, admin at `/admin`, FastAPI consumed via `lib/cms.ts` helpers.
- [`backend/`](backend/) — Python 3.13 FastAPI. Deterministic finance engines in `app/finance/` (`decimal.Decimal`, 60 parity tests), endpoints in `app/api/v1/*`, Redis cache + BNR FX fetch in `app/services/`.
- [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — ruff + mypy + pytest (BE) and `tsc --noEmit` (FE) in parallel on every push and PR; ~46 s green.

## Quick start

> [!WARNING]
> `npx payload generate:importmap` currently crashes on Next.js 16 — Payload v3.83's `loadEnv.js` destructures `loadEnvConfig` as a named export from `@next/env`, but Next 16 moved everything under `.default`. Until upstream patches, hand-edit `web/app/(payload)/admin/importMap.js` when registering admin components (one import + one map entry).

```bash
# 1. Clone
git clone https://github.com/ncmihai/refactored-eureka.git instrumentar
cd instrumentar

# 2. Backend — FastAPI on :8000
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env           # set DATABASE_URI, REDIS_URL, SENTRY_DSN, BNR not required
uvicorn app.main:app --reload --port 8000
pytest                         # 60/60 parity tests green

# 3. Frontend — Next.js 16 + Payload on :3000 (and /admin)
cd ../web
npm install
cp .env.example .env.local     # set DATABASE_URI (Neon dev branch), PAYLOAD_SECRET, POSTHOG/SENTRY keys optional
npm run dev                    # opens Payload schema-push against the dev branch on first request
```

Public site: http://localhost:3000 — admin: http://localhost:3000/admin.

Production mirrors the same split: [instrumentar.vercel.app](https://instrumentar.vercel.app) (Vercel: frontend + Payload admin) calling [refactored-eureka-h7bs.onrender.com](https://refactored-eureka-h7bs.onrender.com) (Render: FastAPI). Schema auto-pushes to the Neon `production` branch on deploy.

> [!NOTE]
> Neon runs two copy-on-write branches in `eu-central-1`. The `dev` branch is for local work (set it in `web/.env.local`); `production` is bound to Vercel's env vars and never touched by `npm run dev`. Reset dev from prod whenever it drifts — there's nothing irreplaceable on it.

## Documentation map

- [docs/planning.md](docs/planning.md) — 15 sections covering legal posture, multi-tenancy, i18n, UI/UX, every module, Payload collections, Monte Carlo architecture, GDPR, observability, SEO, and the 3-phase roadmap.
- [docs/details.md](docs/details.md) — 17 sections: formulas per calculator, cross-cutting inflation/FX/indexation math, Monte Carlo historical-bootstrap spec, metric definitions (Sharpe, CAGR, TCO, Regula 72), MiFID II risk scoring, and operational gotchas (Payload admin CSS loading, `@layer` cascade).
- [docs/task.md](docs/task.md) — checkbox tracker grouped by phase (MVP done / in progress / Faza 2 backlog / Faza 3 backlog / open questions / nice-to-have).
- [docs/progress.md](docs/progress.md) — append-only log; every commit cluster gets an entry with file references and decision context.

## Ecosystem

- **Frontend + CMS** — Next.js 16 (App Router, Turbopack prod) + Payload CMS v3.83 on Vercel Hobby. Dark admin theme, brand-green `--theme-success-*` scale, Fraunces serif for titles.
- **Backend** — FastAPI async on Render Free, Python 3.13.1 pinned. `decimal.Decimal` for deterministic math, NumPy reserved for Monte Carlo (Faza 2).
- **Database** — Neon serverless Postgres, `eu-central-1`, `production` + `dev` branches (copy-on-write; reset-from-parent whenever you want a clean slate).
- **Cache** — Upstash Redis, `eu-central-1`, TLS. BNR FX endpoint uses stale-while-revalidate (1 h fresh, 30 d stale tolerance); simulation results keyed on `hash(params)`.
- **Observability** — Sentry (FE `@sentry/nextjs` + BE `sentry-sdk[fastapi]`, 10 % traces, PII off, tunnel route `/monitoring`). PostHog EU cloud, GDPR-safe defaults (`person_profiles: 'identified_only'`, autocapture off, session replay off, `respect_dnt: true`), events captured via a centralised `lib/posthog.ts` wrapper.
- **Admin analytics widget** — `admin.components.beforeDashboard` RSC queries PostHog Query API server-side and renders 4 KPI tiles + per-tool bar + 14-day sparkline the moment a consultant logs in. See `web/components/admin/DashboardStats/` and `web/lib/posthog-server.ts`.
- **CI** — GitHub Actions, two parallel jobs, concurrency cancel-in-progress on PR.

Monthly infrastructure cost on this stack: **0 €**.

## Legal

Instrumentar is a calculation and visualization tool. It does **not** constitute financial, investment, or insurance advice. All outputs are hypothetical scenarios computed from user-supplied assumptions. Past performance does not guarantee future results. Projections involving market returns are produced under ESMA-aligned disclaimers; product comparisons carry the MiFID II warning. For personalised advice, consult an ESMA/MiFID II-authorised professional.
