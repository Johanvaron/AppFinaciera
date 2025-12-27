<template>
  <UiCard padding="lg" hover>
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">
          Top Gastos por Categoría
        </h3>
        <div class="w-10 h-10 bg-gradient-to-br from-purple-100/80 to-purple-200/80 dark:from-purple-900/50 dark:to-purple-800/50 rounded-xl flex items-center justify-center">
          <svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
      </div>
    </template>

    <div class="space-y-5">
      <CategoryItem 
        v-for="(cat, index) in categories" 
        :key="cat.category"
        :category="cat"
        :index="index"
      />
    </div>
  </UiCard>
</template>

<script setup lang="ts">
import type { CategoryStat } from '@/types'
import UiCard from '@/components/ui/UiCard.vue'
import CategoryItem from '@/components/features/dashboard/CategoryItem.vue'

interface Props {
  categories: CategoryStat[]
}

defineProps<Props>()
</script>
