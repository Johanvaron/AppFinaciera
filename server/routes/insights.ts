/** Read-mostly views over the movements: budgets, dashboard summary and reports. */
import { Hono } from 'hono'
import { z } from 'zod'
import { CATEGORY_KINDS, budgetInputSchema, monthSchema } from '../../shared/contract.ts'
import type { Services } from '../container.ts'
import { monthQuerySchema, parseBody, parseQuery } from '../lib/validate.ts'

const monthlyReportQuerySchema = z.strictObject({
  months: z.coerce.number().int().min(1).max(36).default(12),
  until: monthSchema.optional(),
})

const categoryReportQuerySchema = z.strictObject({
  from: monthSchema.optional(),
  to: monthSchema.optional(),
  kind: z.enum(CATEGORY_KINDS).default('expense'),
})

export function budgetRoutes({ budgets }: Services): Hono {
  const router = new Hono()
  router.get('/', (c) => c.json(budgets.month(parseQuery(c, monthQuerySchema).month)))
  router.put('/', async (c) => c.json(budgets.set(await parseBody(c, budgetInputSchema))))
  return router
}

export function summaryRoutes({ summary }: Services): Hono {
  const router = new Hono()
  router.get('/', (c) => c.json(summary.month(parseQuery(c, monthQuerySchema).month)))
  return router
}

export function reportRoutes({ reports }: Services): Hono {
  const router = new Hono()
  router.get('/monthly', (c) => {
    const query = parseQuery(c, monthlyReportQuerySchema)
    return c.json(reports.monthly(query.months, query.until))
  })
  router.get('/categories', (c) => c.json(reports.categoryMatrix(parseQuery(c, categoryReportQuerySchema))))
  return router
}
