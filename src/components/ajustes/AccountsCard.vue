<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, Plus, Wallet } from 'lucide-vue-next'
import { ACCOUNT_TYPE_LABELS, type Account } from '@shared/contract'
import EmptyState from '@/components/ui/EmptyState.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { api } from '@/lib/api'
import { formatMoney } from '@/lib/format'
import { errorMessage, useAccounts, useApiMutation } from '@/lib/queries'
import { useToasts } from '@/lib/toasts'
import AccountModal from './AccountModal.vue'
import DeleteConfirmModal from './DeleteConfirmModal.vue'
import RowActions from './RowActions.vue'
import { splitArchived, totalBalance } from './settings'

const toasts = useToasts()
const { data, isPending, isError, error, refetch } = useAccounts()

const lists = computed(() => splitArchived(data.value ?? []))
const total = computed(() => totalBalance(data.value ?? []))
const showArchived = ref(false)

const formOpen = ref(false)
const editing = ref<Account | null>(null)
const deleteOpen = ref(false)
const deleting = ref<Account | null>(null)

function openForm(account: Account | null) {
  editing.value = account
  formOpen.value = true
}

function askDelete(account: Account) {
  deleting.value = account
  deleteOpen.value = true
}

const setArchived = useApiMutation((input: { id: number; archived: boolean }) => api.accounts.update(input.id, { archived: input.archived }))

function toggleArchive(account: Account) {
  const archived = !account.archived
  setArchived.mutate({ id: account.id, archived }, { onSuccess: () => toasts.success(archived ? 'Cuenta archivada' : 'Cuenta restaurada') })
}

const removeDeleting = () => api.accounts.remove(deleting.value!.id)
const archiveDeleting = () => api.accounts.update(deleting.value!.id, { archived: true })
</script>

<template>
  <section class="card flex min-w-0 flex-col gap-3" aria-labelledby="accounts-title">
    <header class="flex flex-wrap items-center justify-between gap-2">
      <h2 id="accounts-title" class="text-[16px] font-semibold">Cuentas</h2>
      <UiButton variant="primary" @click="openForm(null)">
        <Plus class="size-4" aria-hidden="true" />
        Agregar cuenta
      </UiButton>
    </header>

    <p v-if="isPending" class="py-6 text-center text-xs text-muted">Cargando cuentas…</p>

    <div v-else-if="isError" class="flex flex-col items-center gap-2 py-6 text-center" role="alert">
      <p class="text-danger">{{ errorMessage(error) }}</p>
      <UiButton @click="refetch()">Reintentar</UiButton>
    </div>

    <EmptyState v-else-if="(data ?? []).length === 0" :icon="Wallet" title="Aún no tienes cuentas" text="Crea la primera para registrar de dónde sale y a dónde entra tu plata.">
      <UiButton variant="primary" @click="openForm(null)">Agregar cuenta</UiButton>
    </EmptyState>

    <template v-else>
      <div class="flex items-baseline justify-between gap-3 rounded-lg bg-fill px-3 py-2">
        <span class="text-xs font-medium text-muted">Saldo total</span>
        <span :class="['num text-[18px] font-semibold', total < 0 && 'text-danger']">{{ formatMoney(total) }}</span>
      </div>

      <p v-if="lists.active.length === 0" class="py-2 text-xs text-muted">Todas tus cuentas están archivadas.</p>
      <ul v-else class="flex flex-col gap-1">
        <li v-for="account in lists.active" :key="account.id" class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div class="min-w-0">
            <p class="truncate font-medium">{{ account.name }}</p>
            <p class="truncate text-xs text-muted">{{ ACCOUNT_TYPE_LABELS[account.type] }}</p>
          </div>
          <span :class="['num text-right font-medium', account.balance < 0 && 'text-danger']">{{ formatMoney(account.balance) }}</span>
          <RowActions
            class="col-span-2 justify-end sm:col-span-1"
            :name="account.name"
            :archived="false"
            :busy="setArchived.isPending.value"
            @edit="openForm(account)"
            @toggle-archive="toggleArchive(account)"
            @remove="askDelete(account)"
          />
        </li>
      </ul>

      <div v-if="lists.archived.length > 0" class="flex flex-col gap-1">
        <button
          type="button"
          class="flex h-10 items-center gap-1.5 self-start rounded-lg px-2 text-xs font-medium text-muted hover:bg-fill hover:text-ink sm:h-8"
          :aria-expanded="showArchived"
          aria-controls="archived-accounts"
          @click="showArchived = !showArchived"
        >
          <ChevronDown :class="['size-4 transition-transform', showArchived && 'rotate-180']" aria-hidden="true" />
          Archivadas ({{ lists.archived.length }})
        </button>
        <ul v-if="showArchived" id="archived-accounts" class="flex flex-col gap-1">
          <li v-for="account in lists.archived" :key="account.id" class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <div class="min-w-0 text-muted">
              <p class="truncate font-medium">{{ account.name }}</p>
              <p class="truncate text-xs">{{ ACCOUNT_TYPE_LABELS[account.type] }}</p>
            </div>
            <span :class="['num text-right', account.balance < 0 ? 'text-danger' : 'text-muted']">{{ formatMoney(account.balance) }}</span>
            <RowActions
              class="col-span-2 justify-end sm:col-span-1"
              :name="account.name"
              archived
              :busy="setArchived.isPending.value"
              @edit="openForm(account)"
              @toggle-archive="toggleArchive(account)"
              @remove="askDelete(account)"
            />
          </li>
        </ul>
      </div>
    </template>

    <AccountModal v-model:open="formOpen" :account="editing" />
    <DeleteConfirmModal
      v-model:open="deleteOpen"
      title="Eliminar cuenta"
      :name="deleting?.name ?? ''"
      :archived="deleting?.archived ?? false"
      :remove="removeDeleting"
      :archive="archiveDeleting"
      deleted-text="Cuenta eliminada"
      archived-text="Cuenta archivada"
    />
  </section>
</template>
