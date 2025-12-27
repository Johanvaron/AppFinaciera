import { ref, computed, onMounted } from 'vue'
import type { Transaction } from '@/types'

export function useTransactions() {
  const transactions = ref<Transaction[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const loadTransactions = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const stored = localStorage.getItem('dashboard-financiero-transactions')
      if (stored) {
        const parsedData = JSON.parse(stored)
        transactions.value = parsedData.transactions || []
      } else {
        const response = await fetch('/api/data.json')
        const data = await response.json()
        transactions.value = data.transactions
      }
    } catch (err) {
      error.value = 'Error al cargar las transacciones'
      console.error('Error:', err)
    } finally {
      isLoading.value = false
    }
  }

  const saveTransactions = () => {
    try {
      localStorage.setItem(
        'dashboard-financiero-transactions',
        JSON.stringify({ transactions: transactions.value })
      )
    } catch (err) {
      console.error('Error al guardar:', err)
    }
  }

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: crypto.randomUUID()
    }
    transactions.value.unshift(newTransaction)
    saveTransactions()
  }

  const totalIncome = computed(() => 
    transactions.value
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
  )

  const totalExpenses = computed(() => 
    transactions.value
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
  )

  const balance = computed(() => totalIncome.value - totalExpenses.value)

  const categories = computed(() => {
    const cats = new Set(transactions.value.map(t => t.category))
    return Array.from(cats).sort()
  })

  onMounted(() => {
    loadTransactions()
  })

  return {
    transactions,
    isLoading,
    error,
    loadTransactions,
    addTransaction,
    totalIncome,
    totalExpenses,
    balance,
    categories
  }
}
