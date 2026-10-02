import type { DatabaseSync } from 'node:sqlite'
import type { Category } from '../../shared/contract.ts'
import { BaseRepository } from './base.ts'

export class CategoryRepository extends BaseRepository<Category> {
  constructor(db: DatabaseSync) {
    super(db, 'categories', { booleans: ['archived'] })
  }
}
