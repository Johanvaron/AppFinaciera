import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import router from './router'
import App from './App.vue'
import { useThemeStore } from './stores/theme'
import { z } from 'zod'
import { es } from 'zod/locales'
import './style.css'

// Forms validate with the contract's schemas: Zod's built-in messages must be in Spanish, like the API's.
z.config(es())

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(VueQueryPlugin, {
  queryClientConfig: {
    // Local API on the same machine: refetching is cheap, stale data is not worth it.
    defaultOptions: { queries: { staleTime: 5_000, retry: 1, refetchOnWindowFocus: true } },
  },
})

useThemeStore().initTheme()

app.mount('#app')
