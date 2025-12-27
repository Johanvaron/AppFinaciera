import { computed, type Ref } from 'vue'
import type { Transaction, CategoryStat } from '@/types'

export function useTransactionStats(transactions: Ref<Transaction[]>) {
  const expensesByCategory = computed(() => {
    const grouped: Record<string, { total: number; count: number }> = {}
    
    transactions.value
      .filter(t => t.type === 'expense')
      .forEach(t => {
        if (!grouped[t.category]) {
          grouped[t.category] = { total: 0, count: 0 }
        }
        grouped[t.category]!.total += t.amount
        grouped[t.category]!.count++
      })

    const totalExpenses = Object.values(grouped).reduce((sum, cat) => sum + cat.total, 0)

    const stats: CategoryStat[] = Object.entries(grouped)
      .map(([category, data]) => ({
        category,
        total: data.total,
        count: data.count,
        percentage: totalExpenses > 0 ? (data.total / totalExpenses) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total)

    return stats
  })

  const topCategories = computed(() => 
    expensesByCategory.value.slice(0, 5)
  )

  const recentTransactions = computed(() => 
    [...transactions.value]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8)
  )

  const monthlyStats = computed(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const monthTransactions = transactions.value.filter(t => {
      const date = new Date(t.date)
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })

    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const expenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    return {
      income,
      expenses,
      balance: income - expenses,
      transactionCount: monthTransactions.length
    }
  })

  return {
    expensesByCategory,
    topCategories,
    recentTransactions,
    monthlyStats
  }
}
