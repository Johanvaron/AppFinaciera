import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTransactionsStore } from '../transactions'

describe('Transactions Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should initialize with empty transactions', () => {
    const store = useTransactionsStore()
    expect(store.transactions).toEqual([])
    expect(store.totalIncome).toBe(0)
    expect(store.totalExpenses).toBe(0)
    expect(store.balance).toBe(0)
  })

  it('should load mock data correctly', () => {
    const store = useTransactionsStore()
    store.loadMockData()

    expect(store.transactions.length).toBeGreaterThan(0)
    expect(store.loading).toBe(false)
  })

  it('should calculate total income correctly', () => {
    const store = useTransactionsStore()
    
    store.addTransaction({
      description: 'Salario',
      amount: 3000000,
      type: 'income',
      category: 'Salario',
      date: '2025-12-15',
    })

    store.addTransaction({
      description: 'Freelance',
      amount: 1000000,
      type: 'income',
      category: 'Freelance',
      date: '2025-12-20',
    })

    expect(store.totalIncome).toBe(4000000)
  })

  it('should calculate total expenses correctly', () => {
    const store = useTransactionsStore()
    
    store.addTransaction({
      description: 'Mercado',
      amount: 500000,
      type: 'expense',
      category: 'Alimentación',
      date: '2025-12-15',
    })

    store.addTransaction({
      description: 'Transporte',
      amount: 200000,
      type: 'expense',
      category: 'Transporte',
      date: '2025-12-20',
    })

    expect(store.totalExpenses).toBe(700000)
  })

  it('should calculate balance correctly', () => {
    const store = useTransactionsStore()
    
    store.addTransaction({
      description: 'Salario',
      amount: 3000000,
      type: 'income',
      category: 'Salario',
      date: '2025-12-15',
    })

    store.addTransaction({
      description: 'Gastos',
      amount: 1000000,
      type: 'expense',
      category: 'Varios',
      date: '2025-12-20',
    })

    expect(store.balance).toBe(2000000)
  })

  it('should filter transactions by current month', () => {
    const store = useTransactionsStore()
    
    const currentDate = new Date()
    const currentMonth = currentDate.toISOString().slice(0, 7)
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 15)
      .toISOString()
      .slice(0, 10)

    store.addTransaction({
      description: 'Este mes',
      amount: 100000,
      type: 'income',
      category: 'Test',
      date: currentMonth + '-15',
    })

    store.addTransaction({
      description: 'Mes pasado',
      amount: 200000,
      type: 'income',
      category: 'Test',
      date: lastMonth,
    })

    expect(store.filteredTransactions.length).toBeGreaterThanOrEqual(1)
  })

  it('should group transactions by category', () => {
    const store = useTransactionsStore()
    
    store.addTransaction({
      description: 'Mercado 1',
      amount: 300000,
      type: 'expense',
      category: 'Alimentación',
      date: '2025-12-15',
    })

    store.addTransaction({
      description: 'Mercado 2',
      amount: 200000,
      type: 'expense',
      category: 'Alimentación',
      date: '2025-12-20',
    })

    const categories = store.transactionsByCategory
    expect(categories['Alimentación']).toBeDefined()
    expect(categories['Alimentación'].total).toBe(500000)
    expect(categories['Alimentación'].count).toBe(2)
  })

  it('should delete transaction correctly', () => {
    const store = useTransactionsStore()
    
    store.addTransaction({
      description: 'Test',
      amount: 100000,
      type: 'income',
      category: 'Test',
      date: '2025-12-15',
    })

    const transactionId = store.transactions[0].id
    const initialLength = store.transactions.length

    store.deleteTransaction(transactionId)

    expect(store.transactions.length).toBe(initialLength - 1)
    expect(store.transactions.find(t => t.id === transactionId)).toBeUndefined()
  })

  it('should generate monthly chart data', () => {
    const store = useTransactionsStore()
    store.loadMockData()

    const chartData = store.monthlyChartData
    
    expect(chartData).toBeInstanceOf(Array)
    expect(chartData.length).toBe(6) // últimos 6 meses
    expect(chartData[0]).toHaveProperty('month')
    expect(chartData[0]).toHaveProperty('income')
    expect(chartData[0]).toHaveProperty('expense')
  })

  it('should calculate trends correctly', () => {
    const store = useTransactionsStore()
    store.loadMockData()

    const trends = store.trends
    
    expect(trends).toHaveProperty('income')
    expect(trends).toHaveProperty('expense')
    expect(trends).toHaveProperty('balance')
  })
})
