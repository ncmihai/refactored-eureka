# Database Operations

This project uses more than one Neon branch. Before imports or migrations, verify the target.

## Identify the Current Target

Run:

```bash
cd web
npm run db:whoami
```

The script prints only safe connection metadata:

- database host
- database name
- whether a user is configured
- SSL mode
- row counts for key collections
- `indici_istorici` count/range grouped by index

Do not rely on `.env.local` being production. On 2026-05-16, `.env.local` pointed at a different Neon host than the live Vercel deployment.

## Import Historical Index Returns

The import script now requires an explicit target:

```bash
npm run import:index-returns -- \
  --file ./data/index-returns/sp500-shiller-monthly-total-return.csv \
  --indice SP500 \
  --moneda USD \
  --target staging
```

Production imports require a second confirmation flag:

```bash
npm run import:index-returns -- \
  --file ./data/index-returns/sp500-shiller-monthly-total-return.csv \
  --indice SP500 \
  --moneda USD \
  --target production \
  --confirm-production \
  --update
```

Use production imports only after checking `db:whoami` and the Vercel deployment database host.

## Current Production Index Datasets

Imported on 2026-05-16:

- `SP500`: 1,863 rows, Feb 1871 to Apr 2026
- `MSCI_WORLD`: 199 rows, Oct 2009 to Apr 2026
- `STOXX_600`: 219 rows, Feb 2008 to Apr 2026
- `FTSE_ALL_WORLD`: 81 rows, Aug 2019 to Apr 2026

`BET` is not imported yet because no local BET CSV exists in `web/data/index-returns`.
