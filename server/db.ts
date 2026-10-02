/** Opens the SQLite database and applies pending migrations. */
import { mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const MIGRATIONS_DIR = fileURLToPath(new URL('./migrations/', import.meta.url))
/** NNN-name.sql, with a hyphen. Anything else is rejected loudly instead of silently skipped. */
const MIGRATION_NAME = /^\d{3}-[a-z0-9-]+\.sql$/

export interface OpenOptions {
  /** Called once, right after the schema is created for the first time. */
  onCreate?: (db: DatabaseSync) => void
}

/** Runs `fn` inside one SQL transaction; rolls back if it throws. */
export type Transact = <R>(fn: () => R) => R

export function transact<R>(db: DatabaseSync, fn: () => R): R {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = fn()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function listMigrations(): string[] {
  const files = readdirSync(MIGRATIONS_DIR).filter((file) => file.endsWith('.sql'))
  const misnamed = files.filter((file) => !MIGRATION_NAME.test(file))
  if (misnamed.length > 0) {
    throw new Error(`Migration files must be named NNN-name.sql (hyphen): ${misnamed.join(', ')}`)
  }
  return files.sort()
}

/** Applies pending migrations in order. Returns the names applied in this run. */
function migrate(db: DatabaseSync): string[] {
  db.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)')
  const done = new Set(db.prepare('SELECT name FROM _migrations').all().map((row) => String(row.name)))
  const applied: string[] = []
  for (const file of listMigrations()) {
    if (done.has(file)) continue
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8')
    transact(db, () => {
      db.exec(sql)
      db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(file, new Date().toISOString())
    })
    applied.push(file)
  }
  return applied
}

/** Opens (and creates if needed) the database. Pass ':memory:' for tests. */
export function openDatabase(path: string, options: OpenOptions = {}): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA foreign_keys = ON')
  const applied = migrate(db)
  const created = applied.some((name) => name.startsWith('001-'))
  if (created && options.onCreate) options.onCreate(db)
  return db
}
