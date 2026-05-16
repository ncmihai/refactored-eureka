import 'dotenv/config'

import { getPayload, type Payload } from 'payload'

import config from '../payload.config'

function databaseIdentity() {
  const raw = process.env.DATABASE_URI ?? process.env.DATABASE_URL
  if (!raw) throw new Error('DATABASE_URI/DATABASE_URL is not set')

  const url = new URL(raw)
  return {
    host: url.hostname,
    database: url.pathname.replace(/^\//, '') || 'unknown',
    user: url.username ? 'set' : 'missing',
    sslMode: url.searchParams.get('sslmode') ?? url.searchParams.get('ssl') ?? 'not-set',
  }
}

async function countCollection(payload: Payload, collection: string) {
  const result = await payload.find({
    collection,
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  return result.totalDocs
}

async function main() {
  const db = databaseIdentity()
  const payload = await getPayload({ config })
  const indexDiagnostics = await payload.find({
    collection: 'indici-istorici',
    depth: 0,
    limit: 0,
    overrideAccess: true,
  })

  const indexGroups = await payload.db.drizzle.execute(`
    SELECT
      indice,
      COUNT(*)::int AS count,
      MIN(data)::date AS first_month,
      MAX(data)::date AS last_month,
      COUNT(*) FILTER (WHERE activ = true)::int AS active_count
    FROM indici_istorici
    GROUP BY indice
    ORDER BY indice
  `)

  console.log(
    JSON.stringify(
      {
        database: db,
        counts: {
          users: await countCollection(payload, 'users'),
          firme: await countCollection(payload, 'firme'),
          simulari: await countCollection(payload, 'simulari'),
          indiciIstorici: indexDiagnostics.totalDocs,
        },
        indiciIstorici: indexGroups.rows,
      },
      null,
      2,
    ),
  )
  process.exit(0)
}

main().catch((err) => {
  console.error('DB whoami failed:', err)
  process.exit(1)
})
