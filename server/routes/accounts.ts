import { Hono } from 'hono'
import { accountInputSchema } from '../../shared/contract.ts'
import type { Services } from '../container.ts'
import { idParam, parseBody, parsePartialBody } from '../lib/validate.ts'

export function accountRoutes({ accounts }: Services): Hono {
  const router = new Hono()
  router.get('/', (c) => c.json(accounts.list()))
  router.post('/', async (c) => c.json(accounts.create(await parseBody(c, accountInputSchema)), 201))
  router.patch('/:id', async (c) => c.json(accounts.update(idParam(c), await parsePartialBody(c, accountInputSchema))))
  router.delete('/:id', (c) => {
    accounts.remove(idParam(c))
    return c.body(null, 204)
  })
  return router
}
