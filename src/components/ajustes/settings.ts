/** Pure logic of the Ajustes screen: no Vue, no HTTP. */
import {
  CATEGORY_GROUP_LABELS,
  CATEGORY_GROUPS,
  type Account,
  type BackupFile,
  type Category,
  type CategoryGroup,
  type CategoryKind,
} from '@shared/contract'
import { dateLong } from '@/lib/format'

/** The group decides the kind; the form never asks for it separately. */
export function kindForGroup(group: CategoryGroup): CategoryKind {
  return group === 'ingresos' ? 'income' : 'expense'
}

/** The money input only takes positives: the "es deuda" checkbox carries the sign. */
export function toSignedBalance(amount: number | null, isDebt: boolean): number {
  const value = Math.abs(amount ?? 0)
  return isDebt && value > 0 ? -value : value
}

/** Back from a stored balance to what the form shows when editing. */
export function fromSignedBalance(balance: number): { amount: number; isDebt: boolean } {
  return { amount: Math.abs(balance), isDebt: balance < 0 }
}

export function splitArchived<T extends { archived: boolean }>(items: readonly T[]): { active: T[]; archived: T[] } {
  return { active: items.filter((item) => !item.archived), archived: items.filter((item) => item.archived) }
}

/** "Saldo total": archived accounts do not count. */
export function totalBalance(accounts: readonly Account[]): number {
  return accounts.reduce((sum, account) => (account.archived ? sum : sum + account.balance), 0)
}

export interface CategorySection {
  group: CategoryGroup
  label: string
  items: Category[]
}

/** Active categories by group (every group is listed, even when empty) plus the archived ones apart. */
export function groupCategories(categories: readonly Category[]): { sections: CategorySection[]; archived: Category[] } {
  const { active, archived } = splitArchived(categories)
  return {
    sections: CATEGORY_GROUPS.map((group) => ({
      group,
      label: CATEGORY_GROUP_LABELS[group],
      items: active.filter((category) => category.group === group),
    })),
    archived,
  }
}

const plural = (count: number, one: string, many: string) => `${count.toLocaleString('es-CO')} ${count === 1 ? one : many}`

export interface BackupSummary {
  /** Lines shown in the confirmation, e.g. "3 cuentas". */
  lines: string[]
  /** "2 de octubre de 2026", or "fecha desconocida" when the file has no usable date. */
  dateLabel: string
}

export type BackupCheck = { ok: true; file: BackupFile; summary: BackupSummary } | { ok: false; message: string }

export const BACKUP_ERRORS = {
  json: 'El archivo no se pudo leer: no es un respaldo válido.',
  app: 'Este archivo no es un respaldo de esta aplicación.',
  version: 'Este respaldo es de una versión que esta aplicación no sabe leer.',
  incomplete: 'El respaldo está incompleto: le faltan datos.',
} as const

const COUNTED = ['accounts', 'categories', 'transactions', 'fixedExpenses'] as const

/** Validates the text of a backup file and summarizes what it would restore. */
export function checkBackup(text: string): BackupCheck {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, message: BACKUP_ERRORS.json }
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return { ok: false, message: BACKUP_ERRORS.json }
  const raw = data as Record<string, unknown>
  if (raw.app !== 'app-financiera') return { ok: false, message: BACKUP_ERRORS.app }
  if (raw.version !== 1) return { ok: false, message: BACKUP_ERRORS.version }
  if (COUNTED.some((key) => !Array.isArray(raw[key]))) return { ok: false, message: BACKUP_ERRORS.incomplete }

  const file = data as BackupFile
  const datePart = typeof raw.exportedAt === 'string' ? raw.exportedAt.slice(0, 10) : ''
  return {
    ok: true,
    file,
    summary: {
      lines: [
        plural(file.accounts.length, 'cuenta', 'cuentas'),
        plural(file.categories.length, 'categoría', 'categorías'),
        plural(file.transactions.length, 'movimiento', 'movimientos'),
        plural(file.fixedExpenses.length, 'gasto fijo', 'gastos fijos'),
      ],
      dateLabel: /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? dateLong(datePart) : 'fecha desconocida',
    },
  }
}

export const RESTORE_WORD = 'RESTAURAR'

export function isRestoreConfirmed(typed: string): boolean {
  return typed.trim() === RESTORE_WORD
}
