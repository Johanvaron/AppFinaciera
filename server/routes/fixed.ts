import { Hono } from 'hono'
import {
  fixedExpenseInputSchema,
  fixedMonthOverrideSchema,
  fixedOrderSchema,
  fixedPaySchema,
} from '../../shared/contract.ts'
import type { Services } from '../container.ts'
import {
  idParam,
  monthParam,
  monthQuerySchema,
  parseBody,
  parsePartialBody,
  parseQuery,
  requiredMonthQuerySchema,
} from '../lib/validate.ts'

export function fixedRoutes({ fixed }: Services): Hono {
  const router = new Hono()
  router.get('/', (c) => c.json(fixed.month(parseQuery(c, monthQuerySchema).month)))
  router.post('/', async (c) => c.json(fixed.create(await parseBody(c, fixedExpenseInputSchema)), 201))
  router.put('/order', async (c) => {
    fixed.reorder((await parseBody(c, fixedOrderSchema)).ids)
    return c.body(null, 204)
  })
  router.patch('/:id', async (c) => c.json(fixed.update(idParam(c), await parsePartialBody(c, fixedExpenseInputSchema))))
  router.delete('/:id', (c) => {
    fixed.remove(idParam(c))
    return c.body(null, 204)
  })
  router.put('/:id/months/:month', async (c) =>
    c.json(fixed.setOverride(idParam(c), monthParam(c), await parseBody(c, fixedMonthOverrideSchema))),
  )
  router.post('/:id/pay', async (c) => c.json(fixed.pay(idParam(c), await parseBody(c, fixedPaySchema)), 201))
  router.delete('/:id/pay', (c) => c.json(fixed.unpay(idParam(c), parseQuery(c, requiredMonthQuerySchema).month)))
  return router
}
