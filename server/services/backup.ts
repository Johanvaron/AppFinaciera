import { z } from 'zod'
import { dateSchema, monthSchema, type BackupFile } from '../../shared/contract.ts'
import type { Transact } from '../db.ts'
import { AppError, invalid } from '../lib/errors.ts'
import { isRealDate, type Clock } from '../lib/dates.ts'
import type { BackupKey, BackupRepository } from '../repositories/backup.ts'

const APP = 'app-financiera'
const VERSION = 1

const rowsSchema = z.array(z.record(z.string(), z.union([z.string(), z.number(), z.null()])))

/** What POST /backup/restore accepts: a BackupFile with rows that are flat column -> value objects. */
export const backupRestoreSchema = z.object({
  app: z.literal(APP, 'Este archivo no es un respaldo de esta app'),
  version: z.literal(VERSION, 'Versión de respaldo no soportada'),
  exportedAt: z.string().optional(),
  accounts: rowsSchema,
  categories: rowsSchema,
  transactions: rowsSchema,
  fixedExpenses: rowsSchema,
  fixedMonths: rowsSchema,
  budgets: rowsSchema,
})
type BackupRestore = z.output<typeof backupRestoreSchema>

const TABLE_KEYS: BackupKey[] = ['accounts', 'categories', 'transactions', 'fixedExpenses', 'fixedMonths', 'budgets']

const isDate = (value: unknown): boolean => dateSchema.safeParse(value).success && isRealDate(value as string)
const isMonth = (value: unknown): boolean => monthSchema.safeParse(value).success

/** The date and month columns of each table. SQLite stores them as plain text and would take anything. */
const DATE_COLUMNS: Partial<Record<BackupKey, Record<string, { valid: (value: unknown) => boolean; message: string }>>> = {
  transactions: {
    date: { valid: isDate, message: 'Fecha inválida (YYYY-MM-DD)' },
    fixed_month: { valid: isMonth, message: 'Mes inválido (YYYY-MM)' },
  },
  fixedExpenses: {
    start_month: { valid: isMonth, message: 'Mes inválido (YYYY-MM)' },
    end_month: { valid: isMonth, message: 'Mes inválido (YYYY-MM)' },
  },
  fixedMonths: { month: { valid: isMonth, message: 'Mes inválido (YYYY-MM)' } },
  budgets: { month: { valid: isMonth, message: 'Mes inválido (YYYY-MM)' } },
}

/**
 * A movement with a malformed date would move its account balance without belonging to any month.
 * Null / missing values are left to the table's own NOT NULL constraints.
 */
function checkDates(data: BackupRestore): void {
  const fields: Record<string, string> = {}
  for (const key of TABLE_KEYS) {
    for (const [column, rule] of Object.entries(DATE_COLUMNS[key] ?? {})) {
      data[key].forEach((row, index) => {
        const value = row[column]
        if (value != null && !rule.valid(value)) fields[`${key}.${index}.${column}`] = rule.message
      })
    }
  }
  if (Object.keys(fields).length > 0) throw invalid(fields, 'El respaldo tiene fechas inválidas; no se cambió nada.')
}

export class BackupService {
  private readonly backup: BackupRepository
  private readonly transact: Transact
  private readonly clock: Clock

  constructor(backup: BackupRepository, transact: Transact, clock: Clock) {
    this.backup = backup
    this.transact = transact
    this.clock = clock
  }

  export(): { file: BackupFile; filename: string } {
    const file: BackupFile = { app: APP, version: VERSION, exportedAt: new Date().toISOString(), ...this.backup.dump() }
    return { file, filename: `finanzas-${this.clock()}.json` }
  }

  /** Replaces ALL the data with the backup's, atomically: if any row is rejected nothing changes. */
  restore(data: BackupRestore): { restored: true } {
    this.checkColumns(data)
    checkDates(data)
    try {
      this.transact(() => this.backup.replaceAll(data))
    } catch (error) {
      if (error instanceof AppError) throw error
      console.error('Backup restore rolled back:', error)
      throw new AppError(422, 'El respaldo tiene datos inconsistentes; no se cambió nada.')
    }
    return { restored: true }
  }

  private checkColumns(data: BackupRestore): void {
    const columns = this.backup.columns()
    const fields: Record<string, string> = {}
    for (const key of TABLE_KEYS) {
      const allowed = new Set(columns[key])
      data[key].forEach((row, index) => {
        const unknown = Object.keys(row).find((name) => !allowed.has(name))
        if (unknown !== undefined) fields[`${key}.${index}.${unknown}`] ??= 'Columna desconocida'
      })
    }
    if (Object.keys(fields).length > 0) throw invalid(fields, 'El respaldo no tiene el formato esperado')
  }
}
