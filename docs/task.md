# Task Tracker — Finance Platform

**Format:** `- [ ]` to-do, `- [/]` în progres, `- [x]` done.
Task-urile sunt grupate pe faze (vezi `planning.md §15`).

---

## În progres

- [x] Setup Payload CMS — producție live (Neon + Vercel)
- [x] Simulator Credit Avansat — motor + endpoint + UI + grafic + dropdown CMS
- [x] Optimizare Credit — motor + endpoint + UI + grafic + dropdown CMS + paritate matematică (16/16, bias B rezolvat prin comparație gain_net vs interest_saved)
- [x] Depozit Bancar — motor + endpoint + UI + grafic + dropdown CMS + paritate matematică (13/13)
- [x] Investiții ETF — motor SIP + TER + capital gains + paritate matematică (19/19) + UI complet
- [x] Deploy producție — Vercel (instrumentar.vercel.app) + Render (FastAPI) + Neon Postgres, CORS OK
- [x] Observabilitate live — Sentry FE+BE (ingestion verificată) + PostHog EU GDPR-safe (4 unelte trimit `captureSimulation`)
- [x] CI verde pe fiecare push — GitHub Actions (ruff + mypy + pytest BE, tsc FE) în ~46s
- [x] Admin dark theme — brand green, login glass card, fix CSS Turbopack prod (`@payloadcms/next/css`)

## Production URLs

- Frontend + Payload admin: https://instrumentar.vercel.app
- FastAPI backend: https://refactored-eureka-h7bs.onrender.com
- DB: Neon pooled, regiune `eu-central-1`
- Analytics: PostHog EU cloud (`eu.i.posthog.com`)
- Errors: Sentry (DSN pe Vercel × 3 scope-uri + Render)

---

## Next up — Faza 1 (MVP, cost 0 €)

### Infra & Setup
- [x] Init monorepo: Next.js 16 App Router + Payload CMS v3 integrat (cost 0)
- [x] Setup proiect Python FastAPI în `/backend` + venv + dependențe
- [x] `.env.example` pentru web + backend
- [x] Neon DB — proiect prod (schema auto-push Payload; branching dev deferred)
- [x] Deploy skeleton: Vercel (frontend+CMS) + Render Free (backend) + Python 3.13 pinned
- [x] Secrets management (`PAYLOAD_SECRET` generat, env vars pe Vercel+Render)
- [x] Rotate Neon password — ALTER ROLE + env vars rotite pe Vercel (3/3 envs) + local
- [x] Upstash Redis instance — `eu-central-1`, TLS, wire cache layer în FastAPI, `/health/redis` reachable în prod
- [x] Endpoint BNR `/api/v1/bnr/rates` — 1h TTL fresh + 30d stale-while-revalidate, multiplier-aware parsing, 6.2× speedup (222ms → 36ms local, <5ms Render↔Upstash)
- [x] Setup Sentry (FE + BE) — BE FastAPI (`telemetry.py`, FastApi/Starlette/Httpx integrations, 10% sampling, PII off), FE Next.js 16 App Router (`@sentry/nextjs` 10.49, instrumentation.ts + instrumentation-client.ts, sentry.{server,edge}.config.ts, global-error.tsx, `withSentryConfig` cu tunnelRoute `/monitoring` + source-maps upload), DSN-uri setate pe Vercel (3 scope-uri) + Render, ingestion verificată cap-coadă (backend `/debug/sentry-crash` + FE throw)
- [x] PostHog (product analytics) — EU cloud, `person_profiles: 'identified_only'`, autocapture off, replay off, respect_dnt, `captureSimulation()` pe cele 4 tool-uri, pageview manual pe router transition. `lib/posthog.ts` centralizat (niciun alt fișier nu importă `posthog-js`).
- [x] GitHub CI (lint, pytest, type-check) — `.github/workflows/ci.yml`, 2 job-uri paralele (ruff+mypy+pytest backend, tsc frontend), concurrency cancel-in-progress, rulează pe push+PR, verde în ~46s
- [x] Neon branching dev — branch `dev` (id `br-old-recipe-al9j8dru`) creat din `production`, `.env.local` local pointează pe dev, Vercel rămâne pe prod; `.env.example` actualizat cu instrucțiuni

### Auth & RBAC
- [ ] Auth bazat pe Payload CMS (JWT httpOnly cookie)
- [ ] Roluri: Super Admin / Admin Firmă / Consultant / Guest
- [ ] Row-level security multi-tenancy pe Postgres (`firm_id`)
- [ ] Flow invitație consultant (email link) — opțional Faza 1, dacă timpul permite

### CMS Collections (Payload) — MVP
- [x] `Users` (auth + rol super_admin/admin_firma/consultant)
- [x] `Firme` (B2B tenants — nume, slug, logo, brand color)
- [x] `Media` (upload images)
- [x] `Produse_Credit` (dobânzi, IRCC, spread, comisioane, effectiveFrom/To, versions)
- [x] `Dobanzi_Depozit_Bancar` (bancă/monedă/scadență, capitalizare, versions)
- [x] `Cursuri_Valutare` (EUR/RON, USD/RON — BNR + manual)
- [x] `Inflatii` (per monedă + an, default flag)
- [x] `Disclaimere` (versionate per modul, richText, RO/EN)
- [x] Seed date piață RO (6 credite, 8 depozite, 5 inflații) — `npm run seed`
- [ ] `Continut_Educational` (stub — blog activat în Faza 3)

### Module MVP — Calcul & UI
- [/] **Simulator Credit Avansat**
  - [x] Endpoint FastAPI + `decimal` math
  - [x] Revizuire dobândă la lună N (perioadă fixă → variabilă)
  - [x] Perioadă de grație
  - [x] Rambursare anticipată cu toggle „Reduce perioada" ↔ „Reduce rata"
  - [x] Comision lunar administrare
  - [x] Paritate la 0.01 RON cu foaia Excel „Credit" (6/6 teste pytest verzi)
  - [x] UI React (formular + tabel amortizare)
  - [x] Wire frontend → backend (fetch direct `NEXT_PUBLIC_BACKEND_URL`)
  - [x] Grafic evoluție sold + dobândă cumulată (Recharts AreaChart)
- [x] **Optimizare Credit** (flagship B2B)
  - [x] Endpoint comparativ A (plată anticipată) vs B (investiție paralelă)
  - [x] Calcul crossover point
  - [x] UI side-by-side + recomandare A/B + tabel anual cu delta
  - [x] Grafic comparativ A vs B cu linie crossover (Recharts LineChart + ReferenceLine)
  - [x] Paritate matematică (16 teste pytest, toate verzi)
  - [x] Fix bias model: recomandarea se bazează acum pe `scen_b_gain_net` (FV − contribuții − tax) vs `interest_saved` — comparație apples-to-apples
- [x] **Depozit Bancar (Termen Scurt)**
  - [x] Endpoint cu impozit 10% pe dobândă
  - [x] Capitalizare lunară vs la scadență + contribuții opționale
  - [x] UI (formular + 4 stats + tabel lunar)
  - [x] Grafic evoluție sold + total depus (Recharts AreaChart + Line)
  - [x] Paritate matematică (13 teste pytest: closed-form compound + simple, invarianți row-by-row)
  - [x] InflationToggle nominal ↔ real integrat
- [x] **Investiții ETF (DCA / SIP)**
  - [x] Motor backend: DCA lunar, compound end-of-month, TER, broker fee (% + fix), tax pe gain la final
  - [x] Endpoint `POST /api/v1/investitii/simulate`
  - [x] UI cu CurrencyToggle + InflationToggle + CMS Disclaimer (modul=etf)
  - [x] Paritate matematică (19 teste pytest: lump-sum closed-form, SIP anuity-due, fee math, CAGR, tax invariants)

### Cross-cutting MVP
- [x] Componenta `InflationToggle` (nominal ↔ real) — integrată în Depozit + Investiții, folosește colecția `Inflatii`, exportă `deflate()` helper
- [x] Componenta `CurrencyToggle` — wire live la BNR via `/api/v1/bnr/rates` (Upstash cached), cascadă BNR → CMS `CursuriValutare` → fallback static 4.9765, arată sursa în UI
- [ ] Tabel devalorizare istorică EUR/RON & USD/RON (extensie pentru CurrencyToggle)
- [ ] Componenta `IndexationInput` (rata indexare anuală)
- [x] Disclaimere persistente în UI (per modul) — component `<Disclaimer modul="..." />` fetch din CMS cu render richText
- [ ] Disclaimere în PDF
- [ ] Export PDF cu logo firmă (white-label)
- [ ] i18n RO/EN (next-intl sau echivalent; conținut dual-field în CMS)
- [x] Typography fluidă (`clamp()` scale h1-h3/body/small) + hero stats strip + „Cum funcționează" steps pe homepage
- [x] Navbar dropdown Tools (scalabil — click-outside + Escape + route-change auto-close)

### QA MVP
- [/] `pytest` — suite paritate cu Excel. Curent: **60 teste verzi** (6 credit + 16 optimizare + 13 depozit + 19 investiții ETF + 5 cross-cutting + 1 bias-fix). Target inițial ≥20/modul încă nu atins pe credit.
- [ ] Property-based tests (Hypothesis) pentru invarianți credit
- [ ] Playwright E2E — flow „consultant deschide sesiune → credit → PDF”

---

### Admin UI / UX
- [x] Dark theme forțat (`admin.theme = 'dark'`) — single brand look pentru MVP
- [x] Brand green 19-stop scale pe `--theme-success-*` → primary buttons / focus / active nav
- [x] Warm near-black base (pure `#000` flattenează elevation layers Payload)
- [x] Fraunces serif fallback pe logo + doc/step headers (in-family cu site public)
- [x] Login page glass card peste ambient radial gradient + hairline grid pattern
- [x] Fix CSS Turbopack prod — `import '@payloadcms/next/css'` în `(payload)/layout.tsx`
- [x] Custom Dashboard widget (`admin.components.beforeDashboard`) — `lib/posthog-server.ts` + RSC `components/admin/DashboardStats/` cu 4 KPI tiles + per-tool bar + sparkline SVG inline (fără Recharts, RSC pur). HogQL Query API, cache 60s via `unstable_cache`. Status modes: `ok` / `not_configured` / `error`. `POSTHOG_PROJECT_ID` + `POSTHOG_PERSONAL_API_KEY` configurate în Vercel prod.
- [ ] PostHog `/flags/` 401 — fie enable feature flags în proiect, fie `advanced_disable_feature_flags: true`
- [ ] Payload CLI `generate:importmap` crapă pe Next.js 16 (bug `@next/env` default export) — hand-patched temporar. Fix: fie bump Payload când iese v3.84+, fie PR upstream în `dist/bin/loadEnv.js`.

---

## Backlog — Faza 2 (Investiții & Monte Carlo)

- [ ] Colecție CMS `Produse_UL` (versionate cu `effective_from`/`effective_to`)
- [ ] Colecție CMS `Fonduri_ETF`
- [ ] Colecție CMS `Indici_Istorici` (S&P 500, MSCI World, STOXX 600, BET — CSV randamente lunare)
- [ ] Simulator UL Stand-alone (parametrizat CMS; Allianz Dinamic Invest ca prim produs)
- [ ] Integrare `yfinance` + caching Redis pe ticker/TER
- [ ] Extindere ETF cu Monte Carlo historical bootstrap (block 12 luni, 10k iter) — motorul determinist e live (Faza 1); rămâne partea de distribuție
- [ ] Monte Carlo historical bootstrap — universe S&P/MSCI/STOXX/BET, block 12 luni, 10k iter vectorizat
- [ ] Fan chart P10/P25/P50/P75/P90 în UI
- [ ] Scenarii „cel mai rău caz istoric” (start 1929/1999/2000/2008)
- [ ] Comparator Suprem 3-way (UL / ETF / Depozit)
- [ ] Metrici: Sharpe Ratio, Regula 72, TCO, CAGR net, Drawdown maxim
- [ ] Salvare sesiune cu ID unic + link shareable
- [ ] Snapshot parametri pe simulare (versionare §9)
- [ ] Indexare anuală activă în toate modulele de acumulare
- [ ] Top-up-uri ad-hoc în UL și ETF

---

## Backlog — Faza 3 (Lifecycle & Scalare)

- [ ] Gap Pensie + Monte Carlo pe atingere target
- [ ] Siguranța Financiară (decumulation) — mod „Venit Pasiv Sustenabil” și „Anuitate Fixă”
- [ ] Modelare Piloni II și III (deductibilitate 400 EUR/an)
- [ ] Viitorul Copilului cu retrageri programate (18-22 ani)
- [ ] Analizor Profil Risc MiFID II simplificat
- [ ] Blog educațional activat (Nicu scrie conținutul)
- [ ] SEO polish: schema.org, sitemap, hreflang, OG/Twitter cards
- [ ] Migrare Render Free → Starter
- [ ] Evaluare feed de date plătit (EOD Historical Data / alternativă proprie)

---

## Întrebări deschise / de discutat

- [ ] Licențiere parametri Allianz Dinamic Invest — folosim date publice sau cerem acord formal?
- [ ] Tranziție PFA → SRL: când? (probabil la primul contract B2B semnat)
- [ ] Domeniu final — nume de brand pentru platformă (momentan placeholder Vercel)
- [ ] Bootstrap block size: 12 luni e default, dar merită testat și 3/6/24 după ce avem date
- [ ] Ce manager mic din OVB Allfinanz primește primul acces beta?
- [ ] Strategie abonament B2B: per consultant activ sau forfetar per firmă?

---

## Idei pentru viitor (nice-to-have)

- [ ] Simulator tax optimization (impozit dividende, capital gain RO)
- [ ] Mod „predare-învățare” pentru consultanți noi (tutorial in-app)
- [ ] Integrare CRM (HubSpot) pentru B2B — import clienți
- [ ] Widget embedabil pe site-urile firmelor de consultanță
- [ ] API public pentru devs/terți
- [ ] Asistent AI (GPT / Claude API) care explică graficele în limbaj natural
- [ ] Import extras bancar CSV pentru auto-categorizare cheltuieli
- [ ] Scor „sănătate financiară” personală (credit + economii + pensie)
