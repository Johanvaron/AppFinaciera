/** Starter data for a brand-new database: one cash account and generic categories. No personal data. */
import type { DatabaseSync } from 'node:sqlite'
import { CATEGORY_COLORS, type CategoryGroup, type CategoryKind } from '../shared/contract.ts'
import { transact } from './db.ts'
import { AccountRepository } from './repositories/accounts.ts'
import { CategoryRepository } from './repositories/categories.ts'

const CATEGORIES: readonly { group: CategoryGroup; kind: CategoryKind; names: readonly string[] }[] = [
  { group: 'ingresos', kind: 'income', names: ['Salario', 'Negocio', 'Otros ingresos'] },
  {
    group: 'fijos',
    kind: 'expense',
    names: [
      'Vivienda',
      'Servicios',
      'Transporte',
      'Deudas y tarjetas',
      'Seguros',
      'Diezmo y donaciones',
      'Familia',
      'Salud y gimnasio',
    ],
  },
  { group: 'variables', kind: 'expense', names: ['Mercado', 'Restaurantes', 'Compras', 'Entretenimiento', 'Otros gastos'] },
  { group: 'ahorro', kind: 'expense', names: ['Ahorro'] },
]

export function seedDatabase(db: DatabaseSync): void {
  const accounts = new AccountRepository(db)
  const categories = new CategoryRepository(db)
  transact(db, () => {
    accounts.insert({ name: 'Efectivo', type: 'efectivo', initialBalance: 0, archived: false })
    let index = 0
    for (const { group, kind, names } of CATEGORIES) {
      for (const name of names) {
        const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length] ?? 'slate'
        categories.insert({ name, kind, group, color, archived: false })
        index++
      }
    }
  })
}
