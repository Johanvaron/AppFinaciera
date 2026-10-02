import { Hono } from 'hono'
import { bulkCategorizeSchema, transactionInputSchema, transactionQuerySchema } from '../../shared/contract.ts'
import type { Services } from '../container.ts'
import { idParam, parseBody, parseQuery } from '../lib/validate.ts'

export function transactionRoutes({ transactions }: Services): Hono {
  const router = new Hono()
  router.get('/', (c) => c.json(transactions.list(parseQuery(c, transactionQuerySchema))))
  router.post('/', async (c) => c.json(transactions.create(await parseBody(c, transactionInputSchema)), 201))
  router.post('/bulk-categorize', async (c) =>
    c.json(transactions.bulkCategorize(await parseBody(c, bulkCategorizeSchema))),
  )
  router.patch('/:id', async (c) => c.json(transactions.update(idParam(c), await parseBody(c, transactionInputSchema))))
  router.delete('/:id', (c) => {
    transactions.remove(idParam(c))
    return c.body(null, 204)
  })
  return router
}
