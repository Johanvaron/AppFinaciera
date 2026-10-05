import { Hono } from 'hono'
import { categoryInputSchema } from '../../shared/contract.ts'
import type { Services } from '../container.ts'
import { idParam, parseBody, parsePartialBody } from '../lib/validate.ts'

export function categoryRoutes({ categories }: Services): Hono {
  const router = new Hono()
  router.get('/', (c) => c.json(categories.list()))
  router.post('/', async (c) => c.json(categories.create(await parseBody(c, categoryInputSchema)), 201))
  router.patch('/:id', async (c) =>
    c.json(categories.update(idParam(c), await parsePartialBody(c, categoryInputSchema))),
  )
  router.delete('/:id', (c) => {
    categories.remove(idParam(c))
    return c.body(null, 204)
  })
  return router
}
