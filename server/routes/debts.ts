import { Hono } from 'hono'
import { debtEntryInputSchema, debtInputSchema, debtPatchSchema, debtPaySchema } from '../../shared/contract.ts'
import type { Services } from '../container.ts'
import { idParam, parseBody } from '../lib/validate.ts'

export function debtRoutes({ debts }: Services): Hono {
  const router = new Hono()
  router.get('/', (c) => c.json(debts.list()))
  router.post('/', async (c) => c.json(debts.create(await parseBody(c, debtInputSchema)), 201))
  router.get('/:id', (c) => c.json(debts.detail(idParam(c))))
  router.patch('/:id', async (c) => c.json(debts.update(idParam(c), await parseBody(c, debtPatchSchema))))
  router.delete('/:id', (c) => {
    debts.remove(idParam(c))
    return c.body(null, 204)
  })
  router.post('/:id/pay', async (c) => c.json(debts.pay(idParam(c), await parseBody(c, debtPaySchema)), 201))
  router.post('/:id/entries', async (c) => c.json(debts.addEntry(idParam(c), await parseBody(c, debtEntryInputSchema)), 201))
  router.delete('/:id/entries/:entryId', (c) => c.json(debts.removeEntry(idParam(c), idParam(c, 'entryId'))))
  return router
}
