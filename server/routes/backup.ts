import { Hono } from 'hono'
import type { Services } from '../container.ts'
import { parseBody } from '../lib/validate.ts'
import { backupRestoreSchema } from '../services/backup.ts'

export function backupRoutes({ backup }: Services): Hono {
  const router = new Hono()
  router.get('/', (c) => {
    const { file, filename } = backup.export()
    c.header('Content-Disposition', `attachment; filename="${filename}"`)
    return c.json(file)
  })
  router.post('/restore', async (c) => c.json(backup.restore(await parseBody(c, backupRestoreSchema))))
  return router
}
