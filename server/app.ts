/** Builds the whole HTTP app for a database. Tests call it with an in-memory one. */
import { Hono } from 'hono'
import type { DatabaseSync } from 'node:sqlite'
import type { ApiError } from '../shared/contract.ts'
import { buildServices, type AppOptions } from './container.ts'
import { AppError } from './lib/errors.ts'
import { accountRoutes } from './routes/accounts.ts'
import { backupRoutes } from './routes/backup.ts'
import { categoryRoutes } from './routes/categories.ts'
import { debtRoutes } from './routes/debts.ts'
import { fixedRoutes } from './routes/fixed.ts'
import { budgetRoutes, reportRoutes, summaryRoutes } from './routes/insights.ts'
import { transactionRoutes } from './routes/transactions.ts'

export function createApp(db: DatabaseSync, options: AppOptions = {}): Hono {
  const services = buildServices(db, options)
  const app = new Hono()

  // Writes must be JSON. A cross-site page can only send "simple" content types without a CORS
  // preflight, so this keeps any website the user visits from writing to (or replacing) the database.
  app.use('/api/*', async (c, next) => {
    const hasBody = c.req.method === 'POST' || c.req.method === 'PUT' || c.req.method === 'PATCH'
    const type = (c.req.header('Content-Type') ?? '').split(';')[0]?.trim().toLowerCase()
    if (hasBody && type !== 'application/json') {
      return c.json<ApiError>({ error: 'El cuerpo debe enviarse como application/json' }, 415)
    }
    return next()
  })

  app.route('/api/accounts', accountRoutes(services))
  app.route('/api/categories', categoryRoutes(services))
  app.route('/api/transactions', transactionRoutes(services))
  app.route('/api/fixed', fixedRoutes(services))
  app.route('/api/debts', debtRoutes(services))
  app.route('/api/budgets', budgetRoutes(services))
  app.route('/api/summary', summaryRoutes(services))
  app.route('/api/reports', reportRoutes(services))
  app.route('/api/backup', backupRoutes(services))

  app.notFound((c) => c.json<ApiError>({ error: 'Ruta no encontrada' }, 404))

  // The single error handler: known errors become their ApiError, anything else is a logged 500.
  app.onError((error, c) => {
    if (error instanceof AppError) {
      const body: ApiError = error.fields ? { error: error.message, fields: error.fields } : { error: error.message }
      return c.json(body, error.status)
    }
    console.error('Unhandled error on', c.req.method, c.req.path, error)
    return c.json<ApiError>({ error: 'Error interno del servidor' }, 500)
  })

  return app
}
