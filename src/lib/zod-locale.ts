/**
 * Forms validate with the contract's schemas: Zod's built-in messages must be
 * in Spanish, like the API's. Imported once for its side effect.
 */
import { z } from 'zod'
import { es } from 'zod/locales'

z.config(es())
