<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { PiggyBank, Tags } from 'lucide-vue-next'
import PageHeader from '@/components/layout/PageHeader.vue'
import BudgetList from '@/components/presupuesto/BudgetList.vue'
import BudgetSummary from '@/components/presupuesto/BudgetSummary.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { errorMessage, useBudgets } from '@/lib/queries'
import { usePeriodStore } from '@/stores/period'

const period = usePeriodStore()
const { data, error, isPending, isFetching, refetch } = useBudgets(() => period.month)
</script>

<template>
  <div class="page">
    <PageHeader title="Presupuesto" :icon="PiggyBank" />

    <template v-if="data">
      <template v-if="data.rows.length > 0">
        <BudgetSummary :data="data" />
        <BudgetList :rows="data.rows" />
      </template>
      <div v-else class="card">
        <EmptyState :icon="Tags" title="Aún no tienes categorías de gasto" text="Crea tus categorías y después ponle un tope a las que quieras controlar.">
          <RouterLink to="/ajustes" class="inline-flex h-10 items-center rounded-lg bg-primary px-3 text-[14px] font-medium text-primary-ink hover:bg-primary/90 sm:h-8">
            Ir a Ajustes
          </RouterLink>
        </EmptyState>
      </div>
    </template>

    <div v-else-if="isPending" class="flex flex-col gap-4" role="status" aria-label="Cargando presupuesto">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div v-for="n in 4" :key="n" class="h-[72px] animate-pulse rounded-card bg-fill" />
      </div>
      <div class="h-64 animate-pulse rounded-card bg-fill" />
    </div>

    <div v-else class="card flex flex-col items-center gap-3 py-8 text-center" role="alert">
      <p class="font-medium">No se pudo cargar el presupuesto</p>
      <p class="text-xs text-muted">{{ errorMessage(error) }}</p>
      <UiButton variant="primary" :loading="isFetching" @click="refetch()">Reintentar</UiButton>
    </div>
  </div>
</template>
