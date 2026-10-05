<script setup lang="ts">
/** Shown instead of a board of zeros when the month has nothing yet. */
import { useRouter } from 'vue-router'
import { ArrowRight } from 'lucide-vue-next'
import type { Month } from '@shared/contract'
import { useQuickAdd } from '@/stores/quickAdd'
import { WELCOME_STEPS, welcomeDate, type WelcomeStep } from './summary'

const props = defineProps<{ month: Month; monthName: string }>()

const router = useRouter()
const quickAdd = useQuickAdd()

function run(step: WelcomeStep) {
  if (step.key === 'fixed') void router.push('/fijos')
  else if (step.key === 'income') quickAdd.openNew({ type: 'income', date: welcomeDate(props.month) })
  else quickAdd.openNew({ date: welcomeDate(props.month) })
}
</script>

<template>
  <section class="card flex min-w-0 flex-col gap-3">
    <div class="min-w-0">
      <h2 class="text-[18px] font-semibold leading-tight">Empieza tu mes de {{ monthName }}</h2>
      <p class="text-[14px] text-muted">Todavía no hay ingresos, gastos ni gastos fijos. Con estos tres pasos el resumen cobra vida.</p>
    </div>
    <ol class="grid gap-2 md:grid-cols-3">
      <li v-for="(step, index) in WELCOME_STEPS" :key="step.key" class="min-w-0">
        <button type="button" class="flex h-full w-full min-w-0 items-start gap-3 rounded-xl bg-fill p-3 text-left hover:bg-primary-soft" @click="run(step)">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-[14px] font-semibold text-primary-ink">{{ index + 1 }}</span>
          <span class="min-w-0 flex-1">
            <span class="block text-[14px] font-semibold">{{ step.title }}</span>
            <span class="block text-xs text-muted">{{ step.text }}</span>
          </span>
          <ArrowRight class="mt-1 size-4 shrink-0 text-muted" aria-hidden="true" />
        </button>
      </li>
    </ol>
  </section>
</template>
