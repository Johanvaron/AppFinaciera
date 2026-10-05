<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { usePeriodStore } from '@/stores/period'

const period = usePeriodStore()
</script>

<template>
  <div class="flex items-center gap-1">
    <button type="button" class="flex size-10 items-center justify-center rounded-lg text-muted hover:bg-fill hover:text-ink sm:size-8" aria-label="Mes anterior" @click="period.previous()">
      <ChevronLeft class="size-4" aria-hidden="true" />
    </button>
    <span class="min-w-[9.5rem] text-center text-[15px] font-semibold" aria-live="polite">{{ period.label }}</span>
    <button type="button" class="flex size-10 items-center justify-center rounded-lg text-muted hover:bg-fill hover:text-ink sm:size-8" aria-label="Mes siguiente" @click="period.next()">
      <ChevronRight class="size-4" aria-hidden="true" />
    </button>
    <button v-if="!period.isCurrent" type="button" class="ml-1 h-10 rounded-lg px-2 text-xs font-medium text-primary hover:bg-primary-soft sm:h-8" @click="period.goToCurrent()">
      Ir a hoy
    </button>
  </div>
</template>
