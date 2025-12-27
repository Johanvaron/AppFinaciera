<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-300">
    <!-- Sidebar para desktop -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 w-72 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-2xl transform transition-all duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:translate-x-0'
      ]"
    >
      <div class="flex flex-col h-full">
        <!-- Logo mejorado -->
        <div class="flex items-center gap-3 px-6 py-6 border-b border-gray-100 dark:border-gray-700">
          <div class="relative">
            <div class="w-12 h-12 bg-gradient-to-br from-blue-500/90 to-blue-700/90 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300">
              <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div>
            <h2 class="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">FinanzApp</h2>
            <p class="text-xs text-gray-500 dark:text-gray-400 font-medium">Dashboard Pro v2.0</p>
          </div>
        </div>

        <!-- Navigation mejorada -->
        <nav class="flex-1 px-4 py-6 space-y-2">
          <router-link
            to="/dashboard"
            v-slot="{ isActive }"
            custom
          >
            <a
              href="/dashboard"
              @click.prevent="$router.push('/dashboard')"
              :class="[
                'flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-300 group relative overflow-hidden',
                isActive
                  ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/50'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-900/30 dark:hover:to-blue-800/30 hover:text-blue-600 dark:hover:text-blue-400'
              ]"
            >
              <ChartBarIcon :class="['w-5 h-5 transition-transform duration-300', isActive ? 'scale-110' : 'group-hover:scale-110']" />
              <span>Dashboard</span>
              <div v-if="isActive" class="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full"></div>
            </a>
          </router-link>

          <router-link
            to="/add-transaction"
            v-slot="{ isActive }"
            custom
          >
            <a
              href="/add-transaction"
              @click.prevent="$router.push('/add-transaction')"
              :class="[
                'flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-300 group relative overflow-hidden',
                isActive
                  ? 'bg-gradient-to-r from-green-500 to-green-700 text-white shadow-lg shadow-green-500/50'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-green-50 hover:to-green-100 dark:hover:from-green-900/30 dark:hover:to-green-800/30 hover:text-green-600 dark:hover:text-green-400'
              ]"
            >
              <PlusCircleIcon :class="['w-5 h-5 transition-transform duration-300', isActive ? 'scale-110' : 'group-hover:scale-110']" />
              <span>Nueva Transacción</span>
              <div v-if="isActive" class="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full"></div>
            </a>
          </router-link>

          <router-link
            to="/transactions"
            v-slot="{ isActive }"
            custom
          >
            <a
              href="/transactions"
              @click.prevent="$router.push('/transactions')"
              :class="[
                'flex items-center gap-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-300 group relative overflow-hidden',
                isActive
                  ? 'bg-gradient-to-r from-purple-500 to-purple-700 text-white shadow-lg shadow-purple-500/50'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-purple-100 dark:hover:from-purple-900/30 dark:hover:to-purple-800/30 hover:text-purple-600 dark:hover:text-purple-400'
              ]"
            >
              <CreditCardIcon :class="['w-5 h-5 transition-transform duration-300', isActive ? 'scale-110' : 'group-hover:scale-110']" />
              <span>Transacciones</span>
              <div v-if="isActive" class="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full"></div>
            </a>
          </router-link>
        </nav>

        <!-- User section mejorada -->
        <div class="p-4 border-t border-gray-100 dark:border-gray-700">
          <!-- Theme Toggle -->
          <div class="mb-4 px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl">
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">Modo Nocturno</span>
              <button
                @click="themeStore.toggleTheme()"
                :class="[
                  'relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300',
                  themeStore.isDark ? 'bg-blue-600' : 'bg-gray-300'
                ]"
              >
                <span
                  :class="[
                    'inline-flex h-6 w-6 items-center justify-center transform rounded-full bg-white shadow-lg transition-transform duration-300',
                    themeStore.isDark ? 'translate-x-7' : 'translate-x-1'
                  ]"
                >
                  <MoonIcon v-if="themeStore.isDark" class="h-4 w-4 text-blue-600" />
                  <SunIcon v-else class="h-4 w-4 text-yellow-500" />
                </span>
              </button>
            </div>
          </div>

          <div class="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl mb-3 hover:shadow-md transition-shadow duration-300">
            <div class="relative">
              <img
                :src="authStore.user?.avatar || 'https://ui-avatars.com/api/?name=User&background=667eea&color=fff'"
                :alt="authStore.user?.name"
                class="w-11 h-11 rounded-full ring-2 ring-white dark:ring-gray-500 shadow-md"
              />
              <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white dark:border-gray-700"></div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {{ authStore.user?.name }}
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate">
                {{ authStore.user?.email }}
              </p>
            </div>
          </div>
          
          <button
            @click="handleLogout"
            class="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-all duration-300 hover:shadow-md"
          >
            <ArrowRightOnRectangleIcon class="w-5 h-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- Overlay para mobile -->
    <div
      v-if="sidebarOpen"
      @click="sidebarOpen = false"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
    ></div>

    <!-- Main content -->
    <div class="lg:pl-72">
      <!-- Top bar mejorada -->
      <header class="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div class="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
          <div class="flex items-center gap-4">
            <button
              @click="sidebarOpen = !sidebarOpen"
              class="p-2.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl lg:hidden transition-all duration-300"
            >
              <Bars3Icon class="w-6 h-6" />
            </button>
            
            <div>
              <h1 class="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
                {{ pageTitle }}
              </h1>
            </div>
          </div>

          <!-- Mobile user avatar -->
          <div class="flex items-center gap-2 lg:hidden">
            <img
              :src="authStore.user?.avatar || 'https://ui-avatars.com/api/?name=User&background=667eea&color=fff'"
              :alt="authStore.user?.name"
              class="w-9 h-9 rounded-full ring-2 ring-blue-500"
            />
          </div>
        </div>
      </header>

      <!-- Page content -->
      <main class="p-4 sm:p-6 lg:p-8">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  Bars3Icon,
  ChartBarIcon,
  CreditCardIcon,
  PlusCircleIcon,
  ArrowRightOnRectangleIcon,
  MoonIcon,
  SunIcon
} from '@heroicons/vue/24/outline'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const themeStore = useThemeStore()

const sidebarOpen = ref(false)

onMounted(() => {
  themeStore.initTheme()
})

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    dashboard: 'Dashboard',
    'add-transaction': 'Nueva Transacción',
    transactions: 'Transacciones',
  }
  return titles[route.name as string] || 'Dashboard'
})

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>
