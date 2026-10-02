/** The single validation helper: every body/query/param goes through `validate`. */
import type { Context } from 'hono'
import { z } from 'zod'
import { idSchema, monthSchema, type Month } from '../../shared/contract.ts'
import { AppError, invalid, notFound } from './errors.ts'

// User-facing messages are in Spanish, including Zod's built-in ones.
z.config(z.locales.es())

/** Parses `data` with `schema`; throws a 422 AppError with a path -> message map when it fails. */
export function validate<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data)
  if (result.success) return result.data
  const fields: Record<string, string> = {}
  for (const issue of result.error.issues) {
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys) fields[[...issue.path, key].join('.')] ??= 'Campo no reconocido'
      continue
    }
    fields[issue.path.join('.') || '_'] ??= issue.message
  }
  throw invalid(fields)
}

async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json()
  } catch {
    throw new AppError(422, 'El cuerpo de la petición no es un JSON válido')
  }
}

export async function parseBody<S extends z.ZodType>(c: Context, schema: S): Promise<z.output<S>> {
  return validate(schema, await readJson(c))
}

/**
 * For PATCH: validates with every field optional and returns only the keys the
 * client actually sent, so schema defaults never overwrite stored values.
 */
export async function parsePartialBody<S extends z.ZodObject>(c: Context, schema: S): Promise<Partial<z.output<S>>> {
  const raw = await readJson(c)
  const parsed = validate(schema.partial(), raw) as Record<string, unknown>
  const sent: Record<string, unknown> = {}
  for (const key of Object.keys(raw as object)) {
    if (parsed[key] !== undefined) sent[key] = parsed[key]
  }
  return sent as Partial<z.output<S>>
}

export function parseQuery<S extends z.ZodType>(c: Context, schema: S): z.output<S> {
  return validate(schema, c.req.query())
}

/** Plain decimal digits only: Number() alone would read '0x10' as 16 and '1e1' as 10, and hit another row. */
const ID_PARAM = /^[1-9]\d*$/

/** Numeric `:id` path param. A malformed id cannot match any row, so it is a 404. */
export function idParam(c: Context, name = 'id'): number {
  const raw = c.req.param(name) ?? ''
  const result = idSchema.safeParse(ID_PARAM.test(raw) ? Number(raw) : Number.NaN)
  if (!result.success) throw notFound('No encontrado')
  return result.data
}

const monthParamSchema = z.object({ month: monthSchema })

/** `:month` path param. */
export function monthParam(c: Context): Month {
  return validate(monthParamSchema, { month: c.req.param('month') }).month
}

/** `?month=YYYY-MM`, optional: services fall back to the current month. */
export const monthQuerySchema = z.strictObject({ month: monthSchema.optional() })

/** `?month=YYYY-MM`, required: for writes, where guessing the month would touch the wrong one. */
export const requiredMonthQuerySchema = z.strictObject({ month: z.string('Indica el mes (YYYY-MM)').pipe(monthSchema) })
