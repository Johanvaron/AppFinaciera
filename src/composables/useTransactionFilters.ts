import { ref, computed, type Ref } from 'vue'
import type { Transaction, TransactionFilters } from '@/types'

export function useTransactionFilters(transactions: Ref<Transaction[]>) {
  const filters = ref<TransactionFilters>({
    searchQuery: '',
    type: 'all',
    category: '',
    sortOrder: 'date-desc'
  })

  const currentPage = ref(1)
  const itemsPerPage = ref(10)

  const filteredTransactions = computed(() => {
    let result = transactions.value

    // Filtro de búsqueda
    if (filters.value.searchQuery) {
      const query = filters.value.searchQuery.toLowerCase()
      result = result.filter(t => 
        t.description.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query)
      )
    }

    // Filtro de tipo
    if (filters.value.type !== 'all') {
      result = result.filter(t => t.type === filters.value.type)
    }

    // Filtro de categoría
    if (filters.value.category) {
      result = result.filter(t => t.category === filters.value.category)
    }

    // Ordenamiento
    result = [...result].sort((a, b) => {
      switch (filters.value.sortOrder) {
        case 'date-desc':
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        case 'date-asc':
          return new Date(a.date).getTime() - new Date(b.date).getTime()
        case 'amount-desc':
          return b.amount - a.amount
        case 'amount-asc':
          return a.amount - b.amount
        default:
          return 0
      }
    })

    return result
  })

  const totalPages = computed(() => 
    Math.ceil(filteredTransactions.value.length / itemsPerPage.value)
  )

  const paginatedTransactions = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage.value
    const end = start + itemsPerPage.value
    return filteredTransactions.value.slice(start, end)
  })

  const visiblePages = computed(() => {
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages.value, start + maxVisible - 1)

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1)
    }

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    return pages
  })

  const incomeCount = computed(() => 
    filteredTransactions.value.filter(t => t.type === 'income').length
  )

  const expenseCount = computed(() => 
    filteredTransactions.value.filter(t => t.type === 'expense').length
  )

  const resetPage = () => {
    currentPage.value = 1
  }

  return {
    filters,
    currentPage,
    itemsPerPage,
    filteredTransactions,
    paginatedTransactions,
    totalPages,
    visiblePages,
    incomeCount,
    expenseCount,
    resetPage
  }
}
