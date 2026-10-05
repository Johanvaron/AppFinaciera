import type { BackupFile } from '../../shared/contract.ts'
import { SqlRepository, type Param, type Row } from './base.ts'

export type BackupKey = keyof Omit<BackupFile, 'app' | 'version' | 'exportedAt'>
export type BackupRow = Record<string, string | number | null>
export type BackupTables = Record<BackupKey, BackupRow[]>

/** BackupFile key -> table, in insertion order (parents before children, for the foreign keys). */
const TABLES: readonly (readonly [BackupKey, string])[] = [
  ['accounts', 'accounts'],
  ['categories', 'categories'],
  ['fixedExpenses', 'fixed_expenses'],
  // Debts come before movements: a movement may point at a debt (debt_id).
  ['debts', 'debts'],
  ['debtEntries', 'debt_entries'],
  ['transactions', 'transactions'],
  ['fixedMonths', 'fixed_months'],
  ['budgets', 'budgets'],
]

/** Raw dump / restore of every data table. */
export class BackupRepository extends SqlRepository {
  /** Raw rows of each table, exactly as stored. */
  dump(): Record<BackupKey, Row[]> {
    const tables = {} as Record<BackupKey, Row[]>
    for (const [key, table] of TABLES) tables[key] = this.all(`SELECT * FROM ${table} ORDER BY id`)
    return tables
  }

  /** BackupFile key -> the column names its rows may carry. */
  columns(): Record<BackupKey, string[]> {
    const columns = {} as Record<BackupKey, string[]>
    for (const [key, table] of TABLES) {
      columns[key] = this.all(`PRAGMA table_info(${table})`).map((row) => String(row.name))
    }
    return columns
  }

  /**
   * Deletes everything and inserts the given rows. The caller must run it inside
   * a transaction and must have checked the row keys against `columns()`.
   */
  replaceAll(tables: BackupTables): void {
    for (const [, table] of [...TABLES].reverse()) this.run(`DELETE FROM ${table}`)
    for (const [key, table] of TABLES) {
      for (const row of tables[key]) {
        const names = Object.keys(row)
        const values: Param[] = names.map((name) => row[name] ?? null)
        this.run(
          `INSERT INTO ${table} (${names.map((name) => `"${name}"`).join(', ')}) VALUES (${names.map(() => '?').join(', ')})`,
          ...values,
        )
      }
    }
  }
}
