/** Entry point: opens the real database and serves the API on localhost only. */
import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { openDatabase } from './db.ts'
import { seedDatabase } from './seed.ts'

const port = Number(process.env.API_PORT ?? 8787)
const dbPath = process.env.FINANZAS_DB ?? 'data/finanzas.db'

const db = openDatabase(dbPath, { onCreate: seedDatabase })
const app = createApp(db)

serve({ fetch: app.fetch, port, hostname: '127.0.0.1' }, (info) => {
  console.info(`API listening on http://127.0.0.1:${info.port} (database: ${dbPath})`)
})
