import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '../auth'

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('should initialize with no user', () => {
    const store = useAuthStore()
    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('should login successfully with correct credentials', async () => {
    const store = useAuthStore()
    
    const result = await store.login('demo@alegra.com', 'demo123')
    
    expect(result).toBe(true)
    expect(store.user).not.toBeNull()
    expect(store.user?.email).toBe('demo@alegra.com')
    expect(store.token).not.toBeNull()
    expect(store.isAuthenticated).toBe(true)
    expect(localStorage.getItem('token')).not.toBeNull()
  })

  it('should fail login with incorrect credentials', async () => {
    const store = useAuthStore()
    
    const result = await store.login('wrong@email.com', 'wrongpass')
    
    expect(result).toBe(false)
    expect(store.user).toBeNull()
    expect(store.error).toBeTruthy()
    expect(store.isAuthenticated).toBe(false)
  })

  it('should set loading state during login', async () => {
    const store = useAuthStore()
    
    const loginPromise = store.login('demo@alegra.com', 'demo123')
    expect(store.isLoading).toBe(true)
    
    await loginPromise
    expect(store.isLoading).toBe(false)
  })

  it('should logout correctly', async () => {
    const store = useAuthStore()
    
    await store.login('demo@alegra.com', 'demo123')
    expect(store.isAuthenticated).toBe(true)
    
    store.logout()
    
    expect(store.user).toBeNull()
    expect(store.token).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('should restore session from localStorage', () => {
    const mockUser = { id: '1', name: 'Test', email: 'test@test.com', avatar: '' }
    const mockToken = 'mock-token'
    
    localStorage.setItem('token', mockToken)
    localStorage.setItem('user', JSON.stringify(mockUser))
    
    const store = useAuthStore()
    store.initAuth()
    
    expect(store.user).toEqual(mockUser)
    expect(store.token).toBe(mockToken)
    expect(store.isAuthenticated).toBe(true)
  })

  it('should clear error on successful login', async () => {
    const store = useAuthStore()
    
    // First login with wrong credentials
    await store.login('wrong@email.com', 'wrongpass')
    expect(store.error).toBeTruthy()
    
    // Then login with correct credentials
    await store.login('demo@alegra.com', 'demo123')
    expect(store.error).toBeNull()
  })
})
