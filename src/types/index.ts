export interface Transaction {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
}

export interface CategoryStat {
  category: string
  total: number
  count: number
  percentage: number
}

export type TransactionType = 'income' | 'expense' | 'all'

export type SortOrder = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'

export interface User {
  email: string
  name: string
}

export interface TransactionFilters {
  searchQuery: string
  type: TransactionType
  category: string
  sortOrder: SortOrder
}
