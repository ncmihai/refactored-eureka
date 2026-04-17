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
