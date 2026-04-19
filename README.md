# Finance Platform

Platformă modulară de analiză financiară (B2C educație + B2B SaaS pentru consultanți).

## Structură monorepo

```
finance/
├── docs/         # Planning, specificații, task tracker
├── web/          # Next.js 14 + Payload CMS v3 (frontend + admin)
├── backend/      # Python FastAPI (motor de calcul financiar)
└── README.md
```

## Dev setup

### Backend (Python)
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Rulează testele:
```bash
cd backend
source .venv/bin/activate
pytest
```

### Frontend (Next.js + Payload)
```bash
cd web
npm install
npm run dev
```

Admin Payload: http://localhost:3000/admin
Site public: http://localhost:3000

### Baza de date — Neon branching

Proiectul Neon `instrumentar` are două ramuri:

| Ramură | Folosită de | Connection string stocat în |
|---|---|---|
| `production` | Vercel prod + preview + dev deploys | Vercel env vars (`DATABASE_URI`) |
| `dev` | Dev local (npm run dev) | `web/.env.local` |

Branch-ul `dev` e fork copy-on-write din `production`, deci poți rula seed-uri, migrații sau experimenta liber fără să strici datele reale. Când vrei să re-sincronizezi dev cu prod: `mcp__Neon__reset_from_parent` sau din consolă.

## Documentație

- [Planning](docs/planning.md) — viziune, arhitectură, roadmap
- [Details](docs/details.md) — specificații tehnice și formule
- [Tasks](docs/task.md) — tracker activ
- [Progress](docs/progress.md) — jurnal decizii

## Stack

- **Frontend + CMS:** Next.js 14 App Router + Payload CMS v3 (monorepo colocat)
- **Backend:** Python FastAPI async
- **DB:** Neon (Serverless Postgres)
- **Cache:** Upstash Redis
- **Observabilitate:** Sentry + PostHog
- **Hosting MVP:** Vercel Hobby + Render Free + Neon Free + Upstash Free (cost 0 €)

## Licență

Privat.
