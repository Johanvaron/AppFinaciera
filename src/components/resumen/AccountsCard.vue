<script setup lang="ts">
/** Balance of every active account, with the total on top. */
import { computed } from 'vue'
import { ACCOUNT_TYPE_LABELS, type Account } from '@shared/contract'
import { formatMoney } from '@/lib/format'
import CardHeader from './CardHeader.vue'

const props = defineProps<{ accounts: Account[]; totalBalance: number }>()

const rows = computed(() =>
  props.accounts
    .filter((account) => !account.archived)
    .map((account) => ({ id: account.id, name: account.name, type: ACCOUNT_TYPE_LABELS[account.type], balance: formatMoney(account.balance), negative: account.balance < 0 })),
)
</script>

<template>
  <section class="card flex min-w-0 flex-col gap-3">
    <CardHeader title="Cuentas" to="/ajustes" link-label="Administrar" />
    <div class="min-w-0">
      <p class="text-xs font-medium text-muted">Saldo total</p>
      <p :class="['num truncate text-[22px] font-semibold leading-tight', totalBalance < 0 ? 'text-danger' : '']">{{ formatMoney(totalBalance) }}</p>
    </div>
    <ul v-if="rows.length" class="flex flex-col">
      <li v-for="row in rows" :key="row.id" class="flex min-w-0 items-center justify-between gap-3 py-2">
        <div class="min-w-0">
          <p class="truncate text-[14px] font-medium">{{ row.name }}</p>
          <p class="truncate text-xs text-muted">{{ row.type }}</p>
        </div>
        <span :class="['num shrink-0 text-[14px] font-semibold', row.negative ? 'text-danger' : '']">{{ row.balance }}</span>
      </li>
    </ul>
    <p v-else class="py-4 text-center text-[14px] text-muted">Aún no tienes cuentas activas</p>
  </section>
</template>
