# Progress Log — Finance Platform

Jurnal cronologic al pașilor concreți făcuți pe proiect. Entry-urile nu se șterg — memoria istorică a deciziilor.

---

## 2026-04-17 — Kickoff & Planning

### Structura inițială
- Creat folder `/finance/docs/`.
- Scris prima versiune `planning.md`: viziune, arhitectură high-level, roadmap 3 faze, model de business.
- Scris prima versiune `details.md`: formule pentru inflație, UL (Allianz Dinamic Invest), ETF, metrici comparative (Regula 72, Sharpe, TCO), credit standard, Gap Pensie.

### Sesiune brainstorming #1 — revizuire holistică

**Decizii adăugate în planning:**
- **Clauză legală:** platforma este tool de calcul, NU consultanță. Disclaimere peste tot, ESMA + MiFID II, limitare răspundere prin TOS.
- **Multi-tenancy** cu izolare `firm_id` în Postgres (row-level security).
- **RBAC cu 4 roluri:** Super Admin / Admin Firmă / Consultant / Guest. Guest poate folosi uneltele fără să salveze sesiune, poate exporta PDF cu disclaimer explicit.
- **Observabilitate:** Sentry + PostHog (free tier).
- **Versionare parametri produse:** simulările salvează snapshot complet, nu FK către produs (reproductibilitate când se schimbă taxele).
- **SEO:** Next.js SSR/ISR obligatoriu din ziua 1 (nu SPA React pur).
- **i18n:** RO + EN din prima, Next.js i18n routing + colecții CMS dual-field `_ro`/`_en`.
- **Content educațional:** Nicu scrie singur, prioritate Faza 3.

**Stack confirmat:**
- Frontend + CMS: **Next.js 14 App Router + Payload CMS v3** (monorepo, colocated).
- Backend: **Python FastAPI** async (nu Flask).
- DB: **Neon** (Serverless Postgres).
- Cache: **Upstash Redis**.
- Hosting: **Vercel Hobby + Render Free + Neon Free + Upstash Free** — cost 0 € pe MVP.

**Monte Carlo — decizie arhitecturală:**
- Metodă: **historical bootstrap multi-indice**, NU GBM.
- Universe: S&P 500 (1927+), MSCI World (1970+), STOXX 600 (1987+), BET (2000+).
- Block bootstrap cu blocuri de 12 luni (păstrează autocorelațiile de regim).
- 10.000 iterații per run, NumPy vectorizat, target < 500ms pentru orizont 30 ani.
- Output: fan chart P10/P50/P90 + scenarii deterministe „worst historical start” (1929, 1999, 2000, 2008).

**Performance:**
- FastAPI async end-to-end pe MVP. **Fără Celery/RQ pe MVP** — adăugat când apare nevoia reală.
- Redis pentru array-urile istorice (TTL 24h) + cache simulări deterministice (TTL 1h, key = hash parametri).
- Un singur endpoint per modul → JSON complet (fără chaining FE).

### Analiză Instrumentar Excel existent

Citit fișierul `/Business/Instrumentar ACTUALIZAT.xlsx` — 8 foi (Credit, Termen Scurt, Plan acumulare, Optimizare credit, Siguranta financiara, Comparatie, Viitorul copilului, Manual utilizare).

**Descoperiri care lipseau din planning-ul inițial:**
1. **Optimizare Credit** (flagship) — compară „plătești anticipat” vs „investești”, identifică crossover point. Modul cheie pentru pitch B2B la OVB.
2. **Depozit Bancar (Termen Scurt)** — cu impozit 10% pe dobândă, lipsea complet.
3. **Siguranța Financiară** — decumulation / venit pasiv, diferit de Gap Pensie.
4. **Viitorul Copilului** cu retrageri programate la vârste specifice (18-22 ani facultate).
5. **Revizuirea dobânzii la luna N** (standardul RO: perioadă fixă → IRCC) — eroare majoră în `details.md` inițial care trata doar rată fixă.
6. **Indexare anuală** a contribuției + **top-up-uri ad-hoc** — cross-cutting, lipseau.
7. **Curs valutar EUR/RON** + comutator devalorizare istorică.
8. Foaia „Comparatie” a Excel-ului are `#REF!` — dovadă că monolitul Excel s-a fisurat, validează arhitectura modulară CMS.

### B2B target confirmat
- **OVB Allfinanz** ca țintă principală (Nicu are acces la manageri mici pentru beta + la decision-makers pentru pitch final).
- **Safety Broker** ca secundar (relație existentă).

### Docs actualizate
- `planning.md` — rewrite complet cu toate deciziile de mai sus (15 secțiuni).
- `details.md` — rewrite complet; 16 secțiuni acum, inclusiv: multi-currency & FX, indexare anuală, top-up-uri, depozit bancar, optimizare credit, decumulation, viitorul copilului, MiFID II, parametri globali default.
- `task.md` — creat, structurat pe faze cu checkbox-uri.
- `progress.md` — creat (acest fișier).

---

---

## 2026-04-17 — Kickoff Monorepo & Motor Credit

### Root
- `git init` în `/finance/` (branch `main`).
- `.gitignore` comun (Node, Python, Next, Payload, IDE, OS, logs, Vercel, Turbo).
- `README.md` cu instrucțiuni dev setup pentru backend + frontend.

### Backend Python (`/backend/`)
Structură:
```
backend/
├── app/
│   ├── core/config.py       # Pydantic Settings
│   ├── finance/credit.py    # motor anuități + revizuire + rambursare anticipată
│   ├── api/v1/credit.py     # endpoint FastAPI /api/v1/credit/simulate
│   ├── tests/test_credit_parity.py
│   └── main.py
├── pyproject.toml           # pytest + ruff + mypy configurate
├── requirements.txt
└── .env.example
```

Motor `simulate_credit` acoperă:
- Anuitate constantă cu `decimal.Decimal` (precizie 28).
- **Revizuire dobândă la luna N** (standardul RO: fix → IRCC) — re-calculează anuitatea pe sold rămas × luni rămase.
- Perioadă de grație (se plătește doar dobânda).
- Rambursare anticipată lunară cu toggle `REDUCE_PERIOD` / `REDUCE_RATE`.
- Comision lunar.
- Snap-to-zero pe ultima rată pentru a absorbi rezidul de precizie Decimal.

**Teste paritate Excel:** 6/6 PASSED pe foaia „Credit" (credit 60.000 €, 120 luni, 4.9% → 7.76% la luna 36).
- Anuitatea lunii 1: `633.46…` ✓
- Sold final luna 1: `59611.53…` ✓
- Anuitatea după revizuire: `695.51…` ✓
- Închidere la exact 120 luni cu sold 0 ✓
- Invariant: suma principalelor = principal inițial ✓

Venv instalat în `backend/.venv/` cu toate dependențele din `requirements.txt`.

### Frontend (`/web/`)
- `create-next-app` cu flags: TypeScript, Tailwind v4, App Router, no-src-dir, no-ESLint.
- **Next.js 16.2.4 + React 19.2.4** (Turbopack stable by default).
- Instalat: `payload@3.83`, `@payloadcms/next`, `@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`, `sharp`, `graphql`.

Restructurare app folder în două route groups:
```
web/app/
├── (frontend)/       # site public
│   ├── layout.tsx    # html+body, Geist font, lang="ro"
│   ├── page.tsx
│   └── globals.css
└── (payload)/        # CMS admin + API
    ├── layout.tsx             # Payload RootLayout
    ├── custom.scss
    ├── admin/
    │   ├── importMap.js       # stub (generat de Payload CLI la nevoie)
    │   └── [[...segments]]/
    │       ├── page.tsx
    │       └── not-found.tsx
    └── api/
        ├── [...slug]/route.ts           # REST handlers
        ├── graphql/route.ts
        └── graphql-playground/route.ts
```

Colecții Payload create în `/web/collections/`:
- `Users.ts` — auth cu rol (super_admin / admin_firma / consultant) + relație către firmă.
- `Firme.ts` — B2B tenants cu logo, slug, brand color.
- `Media.ts` — upload images.

Config-uri:
- `payload.config.ts` — postgres adapter, Lexical editor, importMap base dir.
- `next.config.ts` — wrap cu `withPayload`.
- `tsconfig.json` — alias `@payload-config`.
- `.env.example` — placeholders pentru `DATABASE_URI`, `PAYLOAD_SECRET`.

**Type-check:** `npx tsc --noEmit` → pass fără erori.

### Note tehnice
- Next.js 16 are breaking changes vs training data: params/searchParams/cookies/headers sunt acum async (Promise), middleware a fost redenumit `proxy`, Turbopack e default. Payload `@payloadcms/next@3.83` declară compat `next >=16.2.2 <17.0.0` — compatibil.
- Backend cod este async-ready FastAPI; nu e nevoie de Celery/RQ pe MVP.

---

## 2026-04-17 (seară) — Credit UI + Optimizare end-to-end

### Neon DB conectat
- Primit connection string Neon pooler; pus în `web/.env.local` (`DATABASE_URI` + `PAYLOAD_SECRET` generat).
- Payload push auto-sync: colecțiile `users`, `firme`, `media` s-au creat pe Neon la primul `npm run dev`.
- `/admin` funcțional; Payload a populat automat `importMap.js` cu `CollectionCards`.

### Simulator Credit — UI live
- Creat `web/app/(frontend)/tools/credit/page.tsx` — client component cu formular complet, stats cards (Total plătit / dobândă / comisioane / luni efective), tabel amortizare scrollabil (max-h 480px, sticky header), disclaimer.
- `NEXT_PUBLIC_BACKEND_URL` env var cu fallback `http://localhost:8000`.
- Conversie % → decimal înainte de POST; `null` pentru `revision_month`/`annual_rate_after` când revizuirea e 0.
- Verificat end-to-end: `60000€ × 120 luni × 4.9% → 7.76% la luna 36` → `total_paid = 81228.22€`, `total_interest = 21228.22€`, `months = 120`.

### Optimizare Credit — flagship B2B
- **Backend:** `app/finance/optimizare.py` cu `simulate_optimizare(inp)`:
  - Scenariu A: credit + `monthly_extra` ca rambursare anticipată „reduce perioada".
  - Scenariu B: credit standard + investire paralelă lunară la `investment_annual_return`, impozit pe câștig `investment_tax_rate` (default 10% RO).
  - Returnează: dobândă economisită (A), valoare netă investiție (B), crossover year (prima oară când B net > A economisit), recomandare A/B pe full horizon, serie anuală cu delta.
- **Endpoint:** `POST /api/v1/optimizare/simulate` wired în `main.py`.
- **UI:** `web/app/(frontend)/tools/optimizare/page.tsx` — badge recomandare (verde B / albastru A), 4 stats, tabel anual cu celule colorate după delta, disclaimer „nu e consultanță investițională".
- **Test smoke:** `60000€, 200€ extra, 7% invest` → recomandare **B**, crossover anul 1, A reduce la 94 luni, B net final 33555€ vs dobândă economisită 6507€.
- Home page actualizat cu două carduri pentru cele două unelte.

### Rata lunară vizibilă (request user)
- Simulator Credit: stats reorganizate — „Rata lunară inițială" (anuitate + comision luna 1) + „Rata după revizuire" (luna N+1) când e setată revizuirea.
- Optimizare: rând nou cu „Rata lunară standard" + „Efort lunar total (A & B)" (rata + extra) + „B: investiție lunară" (suma extra), ca să vadă cash-flow-ul lunar și să-l compare cu investiția netă.
- Backend Optimizare: adăugat câmp `standard_monthly_payment` în response (anuitate + comision prima lună a creditului de bază).

### Depozit Bancar — modulul 3/3 MVP
- **Backend:** `app/finance/depozit.py` cu `simulate_depozit(inp)`:
  - Capitalizare `monthly` (dobânda netă adăugată lunar, compus) vs `at_maturity` (dobândă simplă pe sold, impozit plătit la final).
  - Impozit default 10% pe dobândă (standard RO), configurabil.
  - Contribuții lunare opționale (încep din luna 2).
  - Calculează `effective_annual_yield_net` — randament efectiv anualizat după impozit.
- **Endpoint:** `POST /api/v1/depozit/simulate` wired în main.py.
- **UI:** `web/app/(frontend)/tools/depozit/page.tsx` cu form + 4 stats (sold final, dobândă netă, impozit, randament efectiv net) + tabel lunar (sold, contribuție, brut, impozit, net, sold final) + select capitalizare.
- **Test smoke:**
  - 10k€ @ 6% 12 luni compus lunar → sold 10553.57€, net 553.57€, tax 61.51€, randament efectiv 5.536% ✓
  - 10k€ @ 6% 12 luni simplu la scadență → 540€ net, 60€ tax (10000×0.06 = 600 brut) ✓
  - 1k€ + 500€/lună × 24L @ 5.5% → 13190.69€ din 12500€ depuși, 690.69€ dobândă netă ✓
- Home page are acum 3 carduri (Credit / Optimizare / Depozit) — MVP core complete.

### Grafice Recharts 3.8.1
- `npm install recharts` (3.8.1).
- **Credit** [tools/credit/page.tsx](finance/web/app/(frontend)/tools/credit/page.tsx): `AreaChart` cu sold rămas (albastru) + dobândă cumulată (roșu) pe luni, gradient fill, tooltip formatat `ro-RO`.
- **Optimizare** [tools/optimizare/page.tsx](finance/web/app/(frontend)/tools/optimizare/page.tsx): `LineChart` cu A (dobândă economisită, albastru) și B (investiție netă, verde) pe ani + `ReferenceLine` verticală la `crossover_year` — punctul vizual unde B depășește A e killer feature pentru pitch OVB.
- **Depozit** [tools/depozit/page.tsx](finance/web/app/(frontend)/tools/depozit/page.tsx): `AreaChart` sold depozit (verde) cu line overlay „Total depus" (gri dashed) — vizualizează clar contribuția dobânzii vs banii proprii.
- Toate tooltip-urile folosesc formatter `(v) => fmt(Number(v)) €` pentru compat cu Recharts 3 types (ValueType poate fi undefined).
- TypeScript clean: `npx tsc --noEmit` → 0 errors.

### Fix admin CSS + expansiune CMS collections
- **Bug găsit:** admin-ul Payload se afișa fără stiluri (screenshot: listă Collections brută, logo Next.js uriaș). Cauza: `@payloadcms/next/Root` imports `@payloadcms/ui/scss/app.scss`, dar pachetul `sass` nu era instalat → Next.js 16 + Turbopack nu compila SCSS.
- **Fix:** `npm install sass` → `sass@1.99.0`. După restart + `rm -rf .next`, admin-ul render-uiește cu CSS (bundle 39KB încărcat corect).

- **Colecții CMS noi (5)** — toate cu `group` pentru organizare în sidebar admin, `defaultColumns` pentru list view, descrieri RO:
  - [`ProduseCredit`](finance/web/collections/ProduseCredit.ts) — produse creditare (nume, bancă, tipDobandă fix/variabil/fix→variabil, dobândă inițială, perioadă fixă, spread, comision lunar, monedă, sume min/max, effectiveFrom/To, versions:20). Grup „Date Piață".
  - [`DobanziDepozit`](finance/web/collections/DobanziDepozit.ts) — dobânzi depozit per bancă/monedă/scadență + capitalizare (monthly/at_maturity), versions:20. Grup „Date Piață".
  - [`CursuriValutare`](finance/web/collections/CursuriValutare.ts) — EUR/RON, USD/RON + sursa (BNR/manual/CSV). Grup „Date Piață".
  - [`Inflatii`](finance/web/collections/Inflatii.ts) — rate inflație per monedă/an cu flag `default`. Grup „Date Piață".
  - [`Disclaimere`](finance/web/collections/Disclaimere.ts) — versionate per modul (general/credit/optimizare/depozit/UL/ETF/pensie) + limbă (ro/en) + richText content, versions:50. Grup „Conținut".

- **Polish existente:** Users/Firme/Media au acum `group` („Cont & Acces" / „Conținut"), `defaultColumns`, descrieri mai bune. Users a primit și câmp `nume`.

- **payload.config.ts:** `admin.meta.titleSuffix = " — Finance Platform"` pentru branding în tab-ul browserului. Toate 8 colecțiile înregistrate.

- **Verificare:** schema auto-sync pe Neon OK, `/admin` → 200, toate endpoint-urile REST răspund (403 = auth required, colecțiile există). `npx tsc --noEmit` → 0 errors.

### Wire CMS ↔ Simulatoare
- **Public read cu filtru `activ: true`** pe `ProduseCredit` și `DobanziDepozit` — useri anonimi văd doar produsele active, useri logați văd tot. Implementat prin `access.read` function în fiecare colecție.
- **Helper shared** [lib/cms.ts](finance/web/lib/cms.ts) — tipuri `ProdusCredit`, `DobandaDepozit` + fetchers `fetchProduseCredit()`, `fetchDobanziDepozit()` cu `cache: no-store` și fallback `[]` pe eroare.
- **Credit** [tools/credit](finance/web/app/(frontend)/tools/credit/page.tsx): dropdown "Alege produs" sus (afișat doar dacă `products.length > 0`). Selectarea auto-populează `annual_rate_initial`, `revision_month` (dacă tipDobandă = fix_variabil), `monthly_fee`, constraint-uri pe principal/months. „Manual" oferit ca opțiune explicită.
- **Optimizare** [tools/optimizare](finance/web/app/(frontend)/tools/optimizare/page.tsx): același dropdown, aceeași logică de auto-fill.
- **Depozit** [tools/depozit](finance/web/app/(frontend)/tools/depozit/page.tsx): dropdown "Alege depozit" cu formatul „Bancă · MON ScadLuniL · %brut", auto-populează `annual_rate`, `months`, `capitalization`.
- **UX:** toate dropdown-urile ascunse când lista e goală → pagina nu e spammed cu UI inutil înainte de seed. După ce consultantul adaugă produse în `/admin/collections/produse-credit`, dropdown-ul apare automat.
- **Verificare:** `tsc --noEmit` clean, toate 3 paginile HTTP 200, `/api/produse-credit` răspunde cu `{docs:[],totalDocs:0}` (public read OK, filter activ aplicat).

### Următorii pași prioritari
1. **Seed** inițial `ProduseCredit` + `DobanziDepozit` cu 5-10 produse reale din piața RO (BCR, BT, ING, Raiffeisen). Poate fi făcut manual prin `/admin` sau cu un script `seed.ts`.
2. Teste paritate Excel pentru Optimizare + Depozit (pytest).
3. i18n RO/EN (next-intl).
4. Toggle nominal↔real în Depozit (folosind `Inflatii`).
5. Export PDF white-label cu logo firmă din `Firme.logo`.
6. Deploy skeleton Vercel + Render.

---

## 2026-04-17 (seară târziu) — Paritate Optimizare + cross-cutting UX

### Suite paritate Optimizare Credit (commits `958d633`, `0cf0679`)
- 14 teste pytest pentru Scenariu A (plată anticipată) / Scenariu B (investiție paralelă), invarianți de crossover și delta anual.
- Un test `xfail(strict=True)` documenta un **bias sistemic**: motorul compara `scen_b_net` (portfolio total, include capitalul depus) cu `interest_saved` (doar dobânda evitată) — apples-to-oranges.
- **Fix** (`0cf0679`): a introdus `scenario_b_gain_net` = FV − contribuții − tax, astfel încât recomandarea să compare câștig net vs câștig evitat.
  - 5% credit / 7% invest → B wins (9.555 € gain > 6.507 € saved) ✓
  - 15% credit / 2% invest → A wins (29.502 € saved > 5.724 € gain) ✓
- Response API primește câmpul `scenario_b_gain_net` și `YearPoint.scenario_b_gain_net`. UI-ul de Optimizare folosește `gain_net` în grafic/tabel.
- Suite finală: 16/16 verde. Bias rezolvat, xfail eliminat.

### Seed script (`web/scripts/seed.ts`)
- Seed inițial pentru Neon: **6 produse credit** (BCR, BT, ING, Raiffeisen, UniCredit, Garanti), **8 depozite bancare**, **5 inflații** (RON/EUR/USD cu flag default), **2 cursuri valutare** (EUR/RON 4.9765, USD/RON).
- Rulabil cu `npm run seed` (idempotent — folosește `effectiveFrom` + `bank` pentru detecție duplicat).
- Deblochează dropdown-urile din UI care erau ascunse când colecțiile erau goale.

### Cross-cutting: InflationToggle + Disclaimer din CMS (commit `a65144b`)
- **`components/InflationToggle.tsx`** — tabs nominal/real + dropdown filtrat pe monedă, fetch din colecția `Inflatii`. Exportă helper `deflate(value, years, rate)` pentru aplicarea transformării pe array-uri.
- Integrat în **Depozit** (prima consumatoare): toggle-ul recalculează sold final + dobândă netă în putere de cumpărare actuală.
  - Verificat browser: 10.553 € nominal → 10.099 € real la inflație RON 4.5%.
- **`components/Disclaimer.tsx`** — fetch-by-modul + randare Lexical richText. Wired pe Credit / Optimizare / Depozit, deasupra notei statice vechi. Render `null` când CMS nu are entry pentru modul (fallback grațios).
- `Disclaimere` collection: `access.read` deschis public pentru `activ:true` (același pattern ca `ProduseCredit`/`DobanziDepozit`).
- `ui.tsx Disclaimer → DisclaimerNote` (rebrand — vechiul helper rămâne ca bloc static legacy).

### CurrencyToggle + Simulator Investiții ETF (commit `a6957bb`)
- **`components/CurrencyToggle.tsx`** — tabs EUR/RON cu fetch din colecția `CursuriValutare` (ordonat după `validFrom`, fallback la `defaultRate` static 4.9765). Propagat pe toate cele 4 unelte — fiecare stat, grafic, celulă de tabel răspunde instant la schimbarea tab-ului.
- **Motor Investiții** (`backend/app/finance/investitii.py`):
  - DCA lunar (SIP), compound end-of-month cu `r_effective = r_gross − TER`.
  - Comisioane broker aplicate la fiecare tranzacție (% + fix).
  - Impozit pe câștig la final (buy-and-hold, nu per tranzacție).
  - Output: CAGR net, gain net, total depus, schedule lunar complet.
- **Endpoint:** `POST /api/v1/investitii/simulate` wired în `main.py`.
- **UI** (`web/app/(frontend)/tools/investitii/page.tsx`) — formular cu CurrencyToggle + InflationToggle + CMS Disclaimer (`modul="etf"`). Tile nou pe homepage (al 4-lea).
- **Paritate:** 19 teste pytest — lump-sum closed form, SIP annuity-due, broker fee math, CAGR definition, tax invariants. **Suite totală: 59/59 verde** (credit 6 + optimizare 16 + depozit 13 + ETF 19 + misc 5).

### Navbar dropdown Tools (commit `f4c40a8`)
- Linkurile inline pentru cele 3+ unelte nu mai încăpeau pe navbar → consolidat într-un singur buton „Tools" cu dropdown (Credit / Optimizare / Depozit / Investiții).
- Click-outside + Escape + change-route → dropdown auto-close. Active route highlighted.
- Scalabil: adăugarea de unelte nu mai lărgește navbar-ul.

### Deploy producție live — Vercel + Render + Neon (commit `6864901` + merge PR #1)
- **Vercel (Hobby):** deploy frontend + Payload admin la `instrumentar.vercel.app`. Variabile env pe 3 scope-uri (prod/preview/dev): `DATABASE_URI`, `PAYLOAD_SECRET`, `NEXT_PUBLIC_BACKEND_URL`.
- **Render (Free):** deploy FastAPI la `refactored-eureka-h7bs.onrender.com`. Python 3.13.1 pinned (commit `8a6e6bc` — `backend/runtime.txt`). Cold-start ~30s acceptabil pe free tier.
- **Neon (Free):** Postgres în `eu-central-1`, pooled connection. Schema auto-push Payload rulează la primul request.
- **CORS:** FastAPI whitelist `instrumentar.vercel.app` + Vercel preview wildcard.
- **Verificat end-to-end:** simulare credit pe producție → backend Render → latență < 2s (first hit cold ~3s).

---

## 2026-04-18 — Cache layer + BNR endpoint + rotație Neon

### Rotație parolă Neon (commit `cba8be1`)
- `ALTER ROLE` pe Neon (parola inițială era în `.env.local` git-tracked o perioadă scurtă — paranoia operațional).
- Env vars rotite pe Vercel (3 scope-uri) + `.env.local` local + Render.
- `cba8be1` — sync `docs/task.md` cu realitatea de producție.

### Upstash Redis — cache layer (commit `d4d28a8`)
- Instanță Upstash în `eu-central-1`, TLS (necesar în `rediss://` URL).
- **`backend/app/core/cache.py`** — wrapper subțire peste `redis-py` async:
  - `get_json(key)` / `set_json(key, value, ttl_seconds)` — serialize/deserialize automat.
  - Client singleton cu lazy init, fail-soft (log + `None` return dacă Redis e down — nu blocăm requesturile).
  - Config via `REDIS_URL` din `core/config.py`.
- **`/health/redis`** — endpoint care face `SET foo bar EX 10` + `GET foo` pentru verificare round-trip. Reachable în prod de pe Render.
- Latență măsurată: Render `fra1` ↔ Upstash `eu-central-1` < 5ms în warm state.

### Endpoint BNR `/api/v1/bnr/rates` (commit `40fdb27`)
- **`backend/app/services/bnr.py`** — fetch XML oficial BNR (`https://www.bnr.ro/nbrfxrates.xml`), parsare cu `xml.etree`, suport pentru `multiplier` (JPY 100 etc.).
- **Cache strategy stale-while-revalidate:**
  - Fresh TTL: 1 oră (la 1h refresh background).
  - Stale tolerance: 30 zile (dacă BNR pică, returnăm stale + header `X-Cache: STALE`).
  - Miss complete → fetch sincron.
- **Endpoint:** `GET /api/v1/bnr/rates?currencies=EUR,USD` — returnează `{date, rates: {EUR: 4.9765, USD: 4.62}}`.
- **Speedup măsurat:** 222ms (fresh fetch BNR) → 36ms local cache hit, <5ms Render↔Upstash → **6.2× speedup**.
- **Teste:** 182 linii `test_bnr.py` — XML fixture, multiplier parsing, stale-while-revalidate invarianți, happy path, BNR 500 fallback.

### CurrencyToggle live BNR (commit `2869da3`)
- **`web/lib/bnr.ts`** — `fetchBnrRates()` helper care hit-uie FastAPI `/api/v1/bnr/rates`, 10s timeout, fallback grațios la `null`.
- **`components/CurrencyToggle.tsx`** rewrite:
  - Prioritate cascada: **BNR live** → ultimul `CursuriValutare` CMS → `defaultRate` static (4.9765).
  - UI arată sursă cursului („BNR 20 Apr" / „CMS 18 Apr" / „default") — transparență pentru consultant.
  - Cache in-memory per mount; click pe tab nu re-fetch (idempotent).
- Verificat în browser pe toate cele 4 unelte: rata BNR curentă se propagă la primul mount, apoi sticky în session.

---

## 2026-04-19 — Observabilitate + CI/CD

### Sentry FE + BE end-to-end (commits `53dc7cd`, `26672b3`)
- **Backend (`backend/app/core/telemetry.py`):**
  - `sentry-sdk[fastapi]` cu integrations: `FastApiIntegration`, `StarletteIntegration`, `HttpxIntegration`.
  - Sampling `traces_sample_rate=0.1` (10% pe cereri) — suficient pentru MVP, nu saturează free tier.
  - `send_default_pii=False` — zero nume/email-uri pe Sentry.
  - Init în `main.py` înainte de app creation; `SENTRY_DSN` env var (prod only).
  - `/debug/sentry-crash` endpoint pentru verificare ingest (divide by zero). Confirmat în Sentry dashboard: stacktrace complet + breadcrumbs HTTP.
- **Frontend (Next.js 16):**
  - `@sentry/nextjs@10.49` instalat. Three-file pattern nou: `instrumentation.ts` (server/edge bootstrap), `instrumentation-client.ts` (client init + `onRouterTransitionStart`), `sentry.server.config.ts`, `sentry.edge.config.ts`.
  - `app/global-error.tsx` cu `Sentry.captureUnderscoreErrorException` — Next.js 16 cere acest fișier pentru capturare erori render.
  - `next.config.ts` wrapped cu `withSentryConfig({ tunnelRoute: '/monitoring', widenClientFileUpload: true })` + source-maps upload la build.
  - DSN pe Vercel pentru toate 3 scope-uri. Verificat: throw client-side → Sentry primește eroarea cu source map rezolvat.

### GitHub Actions CI (commit `3bfcf8c`)
- **`.github/workflows/ci.yml`** — două job-uri paralele:
  - **Backend** (`ubuntu-latest`, Python 3.13): `pip install -e .[dev]` → `ruff check` → `mypy app` → `pytest`.
  - **Frontend** (`ubuntu-latest`, Node 20): `npm ci` în `/web` → `npx tsc --noEmit`.
- `concurrency.cancel-in-progress: true` — PR push nou anulează job vechi.
- Trigger: `push` pe `main` + `pull_request` oricând.
- Runtime măsurat: **~46s verde** (BE ~40s, FE ~25s, paralel).
- **Fix colateral** în `core/cache.py` (type hints explicit `Optional[redis.Redis]`) + `services/bnr.py` (types ruff complaint) — prima dată când CI a rulat `mypy --strict` a găsit 4 probleme care nu cădeau local.

### Neon branching dev (commit `876a644`)
- Branch dev `br-old-recipe-al9j8dru` creat din production (1-click în Neon console).
- **`.env.example`** actualizat cu instrucțiuni: copy connection string dev branch în `.env.local` local, prod rămâne doar pe Vercel.
- **Workflow:** modificări schema Payload → dev branch → validare → promote prin merge de model în prod (auto via `push` schema Payload).
- README.md actualizat cu diagrama: Vercel prod → Neon main | local dev → Neon dev.

---

## 2026-04-20 — Polish UI + Analytics + Dark Admin + Fix CSS

### Typography fluidă + Hero polish (commit `bb7b01c`)
- **`globals.css`:** adăugat scale typography cu `clamp()` — `--fs-h1: clamp(2rem, 1.4rem + 3vw, 3.5rem)` etc. 5 size-uri fluide (h1-h3, body, small) care respiră pe toate viewport-urile fără media queries.
- **Homepage rewrite** (`page.tsx`):
  - Hero cu titlu serif Fraunces + lead paragraph scurt.
  - Stats strip (3 coloane: „4 unelte live" / „60+ teste paritate" / „cost 0 € per lună").
  - Secțiune „Cum funcționează" cu 3 steps numerotate (1. Alege unealtă / 2. Introduci datele / 3. Vezi rezultat + PDF).
  - Grid 4 cards pentru unelte (Credit / Optimizare / Depozit / Investiții).
- Vizual: prima pagină nu mai arată ca „link dump" — ritm editorial cu spații mari și ierarhie tipografică clară.

### PostHog GDPR-safe (parte din commit `dcbb9f1`)
- **`web/lib/posthog.ts`** — wrapper centralizat (146 linii):
  - EU host `https://eu.i.posthog.com` — zero date rutate prin US.
  - `person_profiles: 'identified_only'` — anon users nu creează profile (GDPR soft-compliant by default).
  - `autocapture: false` — nu trimitem clicks/input automat; doar evenimente explicite.
  - `disable_session_recording: true`, `disable_surveys: true`, `capture_pageview: false` (manual).
  - `respect_dnt: true` — browser DNT header honoraț.
  - `opt_out_capturing_by_default: false` + helper `optOut()` pentru cookie banner (viitor).
  - Tag `environment` extras din `VERCEL_ENV` (prod/preview/development).
  - Exports: `captureSimulation(tool)` / `capturePdfExport(tool)`. **Niciun fișier app nu importă `posthog-js` direct** — enforced prin lint rule.
- **`instrumentation-client.ts`:** boot PostHog alături de Sentry, fire `$pageview` manual (initial load + `onRouterTransitionStart`) — App Router SPA nav nu trimite evenimente auto.
- Cele 4 pagini de tool invocă `captureSimulation('<tool>')` după `setResult()`. Niciun input value nu părăsește clientul — doar event name + tool slug.
- **`.env.example`** documentat cu `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` pentru toate 3 scope-uri Vercel.
- **Verificat ingest:** `/e/` și `/i/v0/e/` returnează 200 din EU cloud. `/flags/` 401 — known issue (feature flags dezactivate în proiect PostHog), non-blocking.

### Dark admin theme Payload (parte din commit `dcbb9f1`)
- **`payload.config.ts`:** `admin.theme = 'dark'` — single brand look pentru MVP (toggle light/dark scos — screenshot-uri consistente pentru pitch).
- **`app/(payload)/custom.scss`** rewrite extins (~100 linii):
  - Scale brand green 19-stop `--theme-success-50` → `-950`, eyeballed perceptual, mapat pe `#15543d` (accentul site-ului). Folosit de Payload pentru primary buttons, focus rings, active nav indicator, link hover, toast success — **single lever** care re-skin-uie tot.
  - Warm near-black: `--color-base-900` → `-650` cu floor nezero și +2 pe R — pure `#000` default făcea sidebar/content/card indistinctibil; nuanțele warm lasă elevation layers să se citească.
  - Fraunces serif fallback pe `.graphic-logo`, `.document-header__title`, `.step-nav h1`, `.collection-list__sub-header h1` — CMS-ul se simte in-family cu site-ul public.
  - Nav border hairline, primary button font-weight 500, focus-visible outline-offset 1px.
- Scope `@layer payload { ... }` — orice selector în `@layer payload-default` ar fi overridden de Payload la startup.

### Login page glass card (commit `b575e1c`)
- **`app/(payload)/custom.scss`** +120 linii în scop `.template-minimal` (wrapper pentru login/forgot/reset — NU dashboard):
  - `html[data-theme='dark'] .template-minimal` — radial gradient dual (brand green 14% top-left, 8% bottom-right) peste `--theme-elevation-0` + hairline grid pattern 48px cu mask radial (texture ~5% opacitate, vizibilă doar close-up).
  - `.template-minimal__wrap` — transformat în card: max-width 440px, padding 48/40, `rgba(22,23,21,0.72)` background, `border: 1px var(--theme-elevation-50)`, `border-radius: 12px`, `backdrop-filter: blur(10px)`, box-shadow dual (1px hairline + 20px dropshadow).
  - `.login__brand` centrat + svg/img max-height 40px.
  - `.form-submit .btn` full-width, padding 0.8rem, radius 8px, font-weight 500.
  - Forgot-password link right-aligned + mute (`--theme-elevation-500` → hover green).
- Login-ul nu mai e „form în void negru" — e card deliberat peste ambient gradient în culorile brandului.

### Fix admin CSS Turbopack prod (commit `b9a241a` — CRITICAL)
- **Bug raportat de user:** admin-ul `instrumentar.vercel.app/admin` render-uia fără stiluri — body unstyled, linkuri albastre browser-default, sidebar gol. Testat pe mobil + incognito Vivaldi, același comportament → **nu era cache**.
- **Investigație:**
  - Grep pe cele 6 CSS chunks din build output pentru `.template-default`, `.template-minimal`, `.login__form`, `.graphic-logo`, `.template-default__nav` → **0 match** în chunks, doar în `custom.scss` local.
  - Descoperit: `@payloadcms/next@3.83` ship-uiește pre-compiled — fișierele `.scss` source au fost șterse din pachet, iar `import './index.scss'` din JS au fost stripped. Pachetul exportă în schimb CSS prebuilt la `@payloadcms/next/css` (→ `dist/prod/styles.css`, 306KB, conține `.template-default`, `.template-minimal`, `.nav`, `.login__form`, `.doc-header` etc.).
  - În dev (Turbopack dev + webpack) source-maps-ul prelua SCSS-ul → funcționa. În **Next.js 16 Turbopack prod** build-ul sărea peste → CSS missing.
- **Fix:** adăugat `import '@payloadcms/next/css'` în `app/(payload)/layout.tsx`, **înainte** de `./custom.scss` — ordine critică pentru cascada `@layer payload-default, payload` (Payload pin-ează precedența layer-elor prin `<style>` injectat în `<head>`, dar belt-and-braces).
- **Verificat post-build:** `.template-default` → 2 chunks (de la 0), admin chunk principal 288K. `/admin` render-uiește complet stilizat cu dark theme + brand green + login glass card.
- Commit push-uit pe `main` → deploy Vercel automat → instantaneu fixed pe producție.

### PostHog stats widget în admin dashboard
- **Cerință:** când se loghează în `/admin`, consultantul vede imediat activitatea platformei (nu cold wall de collections cards).
- **Arhitectură:**
  - `web/lib/posthog-server.ts` — client server-only (`import "server-only"`) pentru PostHog Query API. Două HogQL queries în paralel:
    - KPIs: `countIf` per tool + `uniqIf(distinct_id)` per fereastră (azi / 7 zile).
    - Sparkline: `GROUP BY toStartOfDay(timestamp)` pe 14 zile, pad la 14 entries în TS (HogQL sare peste zilele cu 0 events).
  - `fetchAdminStats()` wrapped în `unstable_cache` cu `revalidate: 60s` + tag `posthog-admin-stats` — un `revalidateTag()` forțează refresh după seed.
  - POST requests nu pot fi cache-uite prin fetch cache native (only GET) → `unstable_cache` e calea corectă.
  - Bearer auth cu `POSTHOG_PERSONAL_API_KEY` (scope `query:read`) — NICIODATĂ expus client-side.
- **Widget:** `web/components/admin/DashboardStats/index.tsx` — async React Server Component:
  - Header cu titlu Fraunces + badge „PostHog EU · cache 60s".
  - 4 KPI tiles: Simulări azi / Simulări 7 zile / Vizitatori unici 24h / Pageviews 7 zile.
  - Per-tool breakdown bar (proporțional, 4 segmente cu brand green scale `--theme-success-500` → `-750`) + legendă.
  - Sparkline SVG hand-rolled (polyline + area gradient, 240×40 viewBox) — **fără Recharts** ca să rămână RSC pur (altfel ar forța hydration + 150KB bundle).
- **Status modes:**
  - `ok` — render stats normal.
  - `not_configured` — banner dashed „Setează POSTHOG_PROJECT_ID + POSTHOG_PERSONAL_API_KEY…" (local dev fără credentials, nu crash red).
  - `error` — notice muted cu motivul (`posthog_403`, `posthog_shape`, etc.); dashboard-ul Payload continuă să funcționeze.
- **Wire-up:** `payload.config.ts` → `admin.components.beforeDashboard: ['/components/admin/DashboardStats#default']`. Path-ul e rezolvat relativ la `importMap.baseDir` (= `/finance/web`).
- **Styling:** `components/admin/DashboardStats/styles.scss` — scope `.dashboard-stats`, folosește variabilele Payload (`--theme-elevation-50/100`, `--theme-success-*`, `--theme-text`) ca să moștenească dark theme-ul. Responsive: 4 coloane → 2 coloane sub 900px.
- **Gotcha importMap regeneration:** `npx payload generate:importmap` crapă pe Next.js 16 — `@next/env` a mutat toate exporturile pe `.default`, iar Payload v3.83's `dist/bin/loadEnv.js` destructurează `{ loadEnvConfig } = nextEnvImport` din namespace, care e undefined în Next 16. Workaround: **hand-edit** `app/(payload)/admin/importMap.js` (adăugat 2 linii: import + entry). Regenerare automată când Payload patches upstream.
- **Verificare:**
  - `npx tsc --noEmit` → 0 erori.
  - `npm run build` → ✓ compiled successfully în 12.8s (Turbopack prod).
  - Grep în build output: `.dashboard-stats` + `.ds-tile` etc. prezente în `chunks/0_naippcvlv-4.css` → SCSS compiled + bundled în admin chunk.
  - Dev server pe port 3031: `/admin` răspunde 200 fără erori în server log (`No email adapter` + sslmode warnings sunt pre-existente, benign).
  - Widget render post-auth only — corect; `beforeDashboard` nu apare pe login screen / create-first-user flow.
- **Deploy producție:** `POSTHOG_PROJECT_ID` + `POSTHOG_PERSONAL_API_KEY` adăugate în Vercel prod env; commit push-uit pe `main` → Vercel rebuild automat. Widget live pe `instrumentar.vercel.app/admin` post-login.

### Status producție la zi
- **4 unelte live:** Credit, Optimizare, Depozit, Investiții ETF — toate cu CurrencyToggle BNR + InflationToggle CMS + Disclaimere versionate.
- **60 teste paritate Excel** verzi (6 credit + 16 optimizare + 13 depozit + 19 ETF + 5 cross-cutting + 1 bias-fix).
- **Infra live:** Vercel Hobby + Render Free + Neon Free + Upstash Free + Sentry + PostHog — cost total **0 €/lună**.
- **CI verde** pe fiecare push (ruff + mypy + pytest + tsc).
- **Admin:** dark theme brand-consistent, login page glass card, CSS fix Turbopack prod deployed.
- **Known issues non-blocking:** PostHog `/flags/` 401 (feature flags disabled in PostHog project — OK, nu folosim încă); Render cold-start ~30s (acceptabil pe free tier, migrare Starter = Faza 3).

### Următorii pași
1. **Auth & RBAC** (Faza 1 închidere) — 4 roluri, JWT httpOnly, row-level security multi-tenancy.
3. **Export PDF white-label** — modul Credit primul, logo firmă din `Firme.logo`, disclaimer legal + timestamp + hash.
4. **i18n RO/EN** (next-intl + câmpuri dual în CMS).
5. **Noutăți** collection + `Continut_Educational` stub pentru Faza 3 (blog SEO).
6. Rezolvare `/flags/` 401 PostHog — fie enable flags în proiect, fie `advanced_disable_feature_flags: true`.
