/**
 * Repositories are the ONLY layer that talks SQL. `SqlRepository` holds the
 * statement helpers and the row mapping; `BaseRepository` adds the generic CRUD
 * every table repository inherits.
 */
import type { DatabaseSync, SQLInputValue, SQLOutputValue } from 'node:sqlite'

export type Row = Record<string, SQLOutputValue>
export type Param = SQLInputValue

export const toSnake = (name: string): string => name.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`)
export const toCamel = (name: string): string => name.replace(/_([a-z])/g, (_, ch: string) => ch.toUpperCase())

const quote = (identifier: string): string => `"${identifier}"`

export abstract class SqlRepository {
  protected readonly db: DatabaseSync

  constructor(db: DatabaseSync) {
    this.db = db
  }

  protected all(sql: string, ...params: Param[]): Row[] {
    return this.db.prepare(sql).all(...params)
  }

  protected one(sql: string, ...params: Param[]): Row | undefined {
    return this.db.prepare(sql).get(...params)
  }

  /** Runs a write; returns the number of affected rows. */
  protected run(sql: string, ...params: Param[]): number {
    return Number(this.db.prepare(sql).run(...params).changes)
  }

  /** `SELECT COUNT(*)`-style query returning a single number. */
  protected count(sql: string, ...params: Param[]): number {
    const row = this.one(sql, ...params)
    return row ? Number(Object.values(row)[0] ?? 0) : 0
  }
}

/**
 * Generic CRUD over one table with an integer `id`.
 * T is the entity in camelCase; columns are snake_case; booleans are stored as 0/1.
 */
export abstract class BaseRepository<T extends { id: number }, TInsert = Omit<T, 'id'>> extends SqlRepository {
  protected readonly table: string
  private readonly booleans: ReadonlySet<string>
  private readonly orderBy: string

  constructor(db: DatabaseSync, table: string, options: { booleans?: readonly (keyof T & string)[]; orderBy?: string } = {}) {
    super(db)
    this.table = table
    this.booleans = new Set(options.booleans ?? [])
    this.orderBy = options.orderBy ?? 'id'
  }

  protected toEntity(row: Row): T {
    const entity: Record<string, unknown> = {}
    for (const [column, value] of Object.entries(row)) {
      const field = toCamel(column)
      entity[field] = this.booleans.has(field) ? value === 1 : value
    }
    return entity as T
  }

  /** camelCase fields -> quoted snake_case columns and bindable values. Skips undefined. */
  private toColumns(data: object): { columns: string[]; values: Param[] } {
    const columns: string[] = []
    const values: Param[] = []
    for (const [field, value] of Object.entries(data)) {
      if (value === undefined || field === 'id') continue
      columns.push(quote(toSnake(field)))
      values.push(typeof value === 'boolean' ? (value ? 1 : 0) : (value as Param))
    }
    return { columns, values }
  }

  protected select(whereAndOrder: string, ...params: Param[]): T[] {
    return this.all(`SELECT * FROM ${this.table} ${whereAndOrder}`, ...params).map((row) => this.toEntity(row))
  }

  get(id: number): T | undefined {
    return this.select('WHERE id = ?', id)[0]
  }

  exists(id: number): boolean {
    return this.count(`SELECT COUNT(*) FROM ${this.table} WHERE id = ?`, id) > 0
  }

  list(): T[] {
    return this.select(`ORDER BY ${this.orderBy}`)
  }

  insert(data: TInsert): T {
    const { columns, values } = this.toColumns(data as object)
    const placeholders = columns.map(() => '?').join(', ')
    const result = this.db
      .prepare(`INSERT INTO ${this.table} (${columns.join(', ')}) VALUES (${placeholders})`)
      .run(...values)
    return this.get(Number(result.lastInsertRowid)) as T
  }

  /** Updates only the given fields. Returns the fresh entity, or undefined if the id does not exist. */
  update(id: number, data: Partial<TInsert>): T | undefined {
    const { columns, values } = this.toColumns(data)
    if (columns.length > 0) {
      const assignments = columns.map((column) => `${column} = ?`).join(', ')
      this.run(`UPDATE ${this.table} SET ${assignments} WHERE id = ?`, ...values, id)
    }
    return this.get(id)
  }

  delete(id: number): boolean {
    return this.run(`DELETE FROM ${this.table} WHERE id = ?`, id) > 0
  }
}
