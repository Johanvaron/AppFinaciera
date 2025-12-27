// API Service para consumir el backend JSON mock

export interface User {
  id: string
  email: string
  password: string
  name: string
  avatar: string
}

export interface Transaction {
  id: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category: string
  date: string
  createdAt: string
}

interface ApiData {
  users: User[]
  transactions: Transaction[]
}

const STORAGE_KEY = 'dashboard-financiero-transactions'

/**
 * Cargar datos del JSON mock o localStorage
 */
async function loadData(): Promise<ApiData> {
  try {
    // Intentar cargar datos de localStorage primero
    const storedData = localStorage.getItem(STORAGE_KEY)
    if (storedData) {
      const parsed = JSON.parse(storedData)
      console.log('💾 Datos cargados desde localStorage:', {
        transacciones: parsed.transactions.length
      })
      return parsed as ApiData
    }

    // Si no hay datos en localStorage, cargar desde JSON
    const basePath = import.meta.env.BASE_URL ?? '/'
    const normalizedBase = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath
    const dataUrl = `${normalizedBase}/api/data.json`
    console.log('🌐 Cargando datos desde', dataUrl)
    const response = await fetch(dataUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache'
      }
    })
    if (!response.ok) {
      throw new Error('Failed to load data')
    }
    const data = await response.json()
    console.log('✅ Datos cargados exitosamente desde JSON:', {
      usuarios: data.users.length,
      transacciones: data.transactions.length
    })
    
    // Guardar datos iniciales en localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    
    return data as ApiData
  } catch (error) {
    console.error('❌ Error loading data:', error)
    return { users: [], transactions: [] }
  }
}

/**
 * Guardar datos en localStorage
 */
function saveData(data: ApiData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    console.log('💾 Datos guardados en localStorage')
  } catch (error) {
    console.error('❌ Error saving data:', error)
  }
}

/**
 * Simular login
 */
export async function loginApi(email: string, password: string): Promise<User | null> {
  const data = await loadData()
  const user = data.users.find(u => u.email === email && u.password === password)
  
  if (user) {
    // Simular delay de red
    await new Promise(resolve => setTimeout(resolve, 800))
    // No retornar password
    const { password: _, ...userWithoutPassword } = user
    return userWithoutPassword as User
  }
  
  return null
}

/**
 * Obtener todas las transacciones
 */
export async function getTransactions(): Promise<Transaction[]> {
  const data = await loadData()
  console.log('📊 getTransactions - Total transacciones:', data.transactions.length)
  console.log('📊 Primera transacción:', data.transactions[0])
  console.log('📊 Última transacción:', data.transactions[data.transactions.length - 1])
  return data.transactions
}

/**
 * Agregar nueva transacción
 */
export async function addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
  const data = await loadData()
  
  const newTransaction: Transaction = {
    ...transaction,
    id: `txn-${Date.now()}`,
    createdAt: new Date().toISOString()
  }
  
  // Agregar al inicio del array
  data.transactions.unshift(newTransaction)
  
  // Guardar en localStorage
  saveData(data)
  
  console.log('✅ Nueva transacción agregada y guardada:', newTransaction)
  return newTransaction
}

/**
 * Eliminar transacción
 */
export async function deleteTransaction(id: string): Promise<boolean> {
  const data = await loadData()
  
  const initialLength = data.transactions.length
  data.transactions = data.transactions.filter(t => t.id !== id)
  
  if (data.transactions.length < initialLength) {
    saveData(data)
    console.log('✅ Transacción eliminada:', id)
    return true
  }
  
  console.log('⚠️ Transacción no encontrada:', id)
  return false
}
