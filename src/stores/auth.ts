import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loginApi } from '@/services/api'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!token.value && !!user.value)

  // Login usando API JSON
  const login = async (email: string, password: string): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      const userData = await loginApi(email, password)

      if (userData) {
        const mockToken = 'mock-jwt-token-' + Date.now()

        user.value = userData
        token.value = mockToken
        localStorage.setItem('token', mockToken)
        localStorage.setItem('user', JSON.stringify(userData))

        return true
      }

      throw new Error('Credenciales inválidas. Use demo@alegra.com / demo123')
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al iniciar sesión'
      return false
    } finally {
      isLoading.value = false
    }
  }

  const logout = () => {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  const initAuth = () => {
    const storedToken = localStorage.getItem('token')
    const storedUser = localStorage.getItem('user')

    if (storedToken && storedUser) {
      token.value = storedToken
      user.value = JSON.parse(storedUser)
    }
  }

  return {
    user,
    token,    isLoading,
    error,    isAuthenticated,
    login,
    logout,
    initAuth
  }
})
