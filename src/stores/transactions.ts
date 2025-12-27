import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { startOfMonth, endOfMonth, format, parseISO, isWithinInterval, subMonths } from 'date-fns'
import { getTransactions as getTransactionsApi, addTransaction as addTransactionApi, deleteTransaction as deleteTransactionApi } from '@/services/api'

export type TransactionType = 'income' | 'expense'

export interface Transaction {
  id: string
  description: string
  amount: number
  type: TransactionType
  category: string
  date: string
  createdAt: string
}

export const useTransactionsStore = defineStore('transactions', () => {
  const transactions = ref<Transaction[]>([])
  const loading = ref(false)
  const currentMonth = ref(new Date())
  let hasLoadedOnce = false
  let inflightLoad: Promise<void> | null = null

  // Computed: Transacciones filtradas por mes actual
  const filteredTransactions = computed(() => {
    const start = startOfMonth(currentMonth.value)
    const end = endOfMonth(currentMonth.value)

    const filtered = transactions.value.filter(t => {
      const tDate = parseISO(t.date)
      const isInRange = isWithinInterval(tDate, { start, end })
      return isInRange
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return filtered
  })

  // Computed: Total ingresos
  const totalIncome = computed(() => {
    return filteredTransactions.value
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
  })

  // Computed: Total gastos
  const totalExpenses = computed(() => {
    return filteredTransactions.value
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
  })

  // Computed: Balance mensual
  const balance = computed(() => totalIncome.value - totalExpenses.value)

  // Computed: Transacciones por categoría
  const transactionsByCategory = computed(() => {
    const grouped: Record<string, { total: number; count: number; type: TransactionType }> = {}

    filteredTransactions.value.forEach(t => {
      if (!grouped[t.category]) {
        grouped[t.category] = { total: 0, count: 0, type: t.type }
      }
      grouped[t.category]!.total += t.amount
      grouped[t.category]!.count++
    })

    return grouped
  })

  // Computed: Datos para gráfico mensual (últimos 6 meses)
  const monthlyChartData = computed(() => {
    const months: { month: string; income: number; expense: number }[] = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const date = subMonths(now, i) as Date
      const start = startOfMonth(date) as Date
      const end = endOfMonth(date) as Date

      const monthTransactions = transactions.value.filter(t => {
        const tDate = parseISO(t.date)
        return isWithinInterval(tDate, { start, end })
      })

      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)

      const expense = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)

      months.push({
        month: format(date, 'MMM yy'),
        income,
        expense,
      })
    }

    return months
  })

  // Computed: Tendencia (comparación con mes anterior)
  const trends = computed(() => {
    const previousMonth = subMonths(currentMonth.value, 1)
    const start = startOfMonth(previousMonth)
    const end = endOfMonth(previousMonth)

    const previousTransactions = transactions.value.filter(t => {
      const tDate = parseISO(t.date)
      return isWithinInterval(tDate, { start, end })
    })

    const prevIncome = previousTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)

    const prevExpense = previousTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)

    const prevBalance = prevIncome - prevExpense

    const incomeTrend = prevIncome > 0 
      ? ((totalIncome.value - prevIncome) / prevIncome) * 100 
      : 0

    const expenseTrend = prevExpense > 0 
      ? ((totalExpenses.value - prevExpense) / prevExpense) * 100 
      : 0

    const balanceTrend = prevBalance !== 0 
      ? ((balance.value - prevBalance) / Math.abs(prevBalance)) * 100 
      : 0

    return {
      income: Math.round(incomeTrend * 10) / 10,
      expense: Math.round(expenseTrend * 10) / 10,
      balance: Math.round(balanceTrend * 10) / 10,
    }
  })

  // Actions
  const loadTransactions = async (options: { force?: boolean } = {}) => {
    const { force = false } = options
    if (loading.value) {
      return inflightLoad ?? Promise.resolve()
    }
    if (!force && hasLoadedOnce) {
      return Promise.resolve()
    }

    loading.value = true
    inflightLoad = (async () => {
      try {
        const data = await getTransactionsApi()
        transactions.value = data
        hasLoadedOnce = true
      } catch (error) {
        console.error('❌ Error loading transactions:', error)
        throw error
      } finally {
        loading.value = false
        inflightLoad = null
      }
    })()

    return inflightLoad
  }

  const loadMockData = (options?: { force?: boolean }) => loadTransactions(options)

  // Cargar datos automáticamente al crear el store
  void loadTransactions()

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    try {
      const newTransaction = await addTransactionApi(transaction)
      // Recargar todos los datos desde localStorage para asegurar sincronización
      await loadTransactions({ force: true })
      return newTransaction
    } catch (error) {
      console.error('Error adding transaction:', error)
      throw error
    }
  }

  const deleteTransaction = async (id: string) => {
    try {
      const success = await deleteTransactionApi(id)
      if (success) {
        transactions.value = transactions.value.filter(t => t.id !== id)
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
    }
  }

  const setCurrentMonth = (date: Date) => {
    currentMonth.value = date
  }

  return {
    transactions,
    loading,
    currentMonth,
    filteredTransactions,
    totalIncome,
    totalExpenses,
    balance,
    transactionsByCategory,
    monthlyChartData,
    trends,
    loadTransactions,
    loadMockData,
    addTransaction,
    deleteTransaction,
    setCurrentMonth,
  }
})
