import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { CursuriValutare } from './collections/CursuriValutare'
import { Disclaimere } from './collections/Disclaimere'
import { DobanziDepozit } from './collections/DobanziDepozit'
import { Firme } from './collections/Firme'
import { Inflatii } from './collections/Inflatii'
import { Media } from './collections/Media'
import { ProduseCredit } from './collections/ProduseCredit'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' — Finance Platform',
    },
    // Force dark theme across the admin. The alternative `'all'` would let
    // users toggle light/dark in their profile, but for a single-brand
    // consultant tool the toggle adds UI noise and inconsistent screenshots.
    // If we ever need light back, change to `'all'` and remove nothing else —
    // the custom.scss overrides are scoped per data-theme attribute.
    theme: 'dark',
  },
  collections: [
    Users,
    Firme,
    Media,
    ProduseCredit,
    DobanziDepozit,
    CursuriValutare,
    Inflatii,
    Disclaimere,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  sharp,
})
