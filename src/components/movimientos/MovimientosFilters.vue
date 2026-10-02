<script setup lang="ts">
/** Filter row of Movimientos: search, type, category and account. Wraps on phones. */
import { computed, watch } from 'vue'
import { Search, X } from 'lucide-vue-next'
import { CATEGORY_GROUP_LABELS, CATEGORY_GROUPS, type Account, type Category, type TransactionType } from '@shared/contract'
import UiButton from '@/components/ui/UiButton.vue'

const search = defineModel<string>('search', { required: true })
const type = defineModel<TransactionType | ''>('type', { required: true })
const categoryId = defineModel<number | null>('categoryId', { required: true })
const accountId = defineModel<number | null>('accountId', { required: true })

const props = defineProps<{ categories: Category[]; accounts: Account[]; active: boolean }>()
defineEmits<{ clear: [] }>()

/** Categories of the chosen type (all of them when no type is chosen), grouped for the <optgroup>s. */
const categoryGroups = computed(() => {
  const usable = props.categories.filter((c) => type.value === '' || c.kind === type.value)
  return CATEGORY_GROUPS.map((group) => ({
    label: CATEGORY_GROUP_LABELS[group],
    items: usable.filter((c) => c.group === group),
  })).filter((g) => g.items.length > 0)
})

// A transfer has no category, and a category of the other kind would never match.
// A watcher, not @change: the parent owns the model, so inside the event it still holds the previous type.
watch(type, (next) => {
  const chosen = props.categories.find((c) => c.id === categoryId.value)
  if (next === 'transfer' || (chosen && next !== '' && chosen.kind !== next)) categoryId.value = null
})
</script>

<template>
  <div class="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center" role="search" aria-label="Filtros de movimientos">
    <div class="relative col-span-2 min-w-0 sm:min-w-[14rem] sm:flex-1">
      <Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input v-model="search" type="search" class="control pl-9" placeholder="Buscar por descripción o nota" aria-label="Buscar por descripción o nota" maxlength="120" />
    </div>

    <select v-model="type" class="control col-span-2 sm:w-44" aria-label="Tipo">
      <option value="">Todos los tipos</option>
      <option value="expense">Gastos</option>
      <option value="income">Ingresos</option>
      <option value="transfer">Transferencias</option>
    </select>

    <select v-model="categoryId" class="control sm:w-52" aria-label="Categoría" :disabled="type === 'transfer'">
      <option :value="null">Todas las categorías</option>
      <optgroup v-for="group in categoryGroups" :key="group.label" :label="group.label">
        <option v-for="category in group.items" :key="category.id" :value="category.id">{{ category.name }}</option>
      </optgroup>
    </select>

    <select v-model="accountId" class="control sm:w-48" aria-label="Cuenta">
      <option :value="null">Todas las cuentas</option>
      <option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.name }}</option>
    </select>

    <UiButton v-if="active" variant="ghost" class="col-span-2" @click="$emit('clear')">
      <X class="size-4" aria-hidden="true" />
      Limpiar
    </UiButton>
  </div>
</template>
