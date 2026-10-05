<script setup lang="ts">
/** Actions over the selected rows: change category (same kind only) and delete. */
import { computed, ref } from 'vue'
import { Trash2, X } from 'lucide-vue-next'
import { CATEGORY_GROUP_LABELS, CATEGORY_GROUPS, type Category, type Transaction } from '@shared/contract'
import UiButton from '@/components/ui/UiButton.vue'
import { applicableCategories, bulkCategoryRule } from './transactions'

const props = defineProps<{ selected: Transaction[]; categories: Category[]; busy: boolean }>()
const emit = defineEmits<{ categorize: [categoryId: number]; remove: []; clear: [] }>()

const rule = computed(() => bulkCategoryRule(props.selected))
const categoryGroups = computed(() => {
  const usable = applicableCategories(props.selected, props.categories)
  return CATEGORY_GROUPS.map((group) => ({
    label: CATEGORY_GROUP_LABELS[group],
    items: usable.filter((c) => c.group === group),
  })).filter((g) => g.items.length > 0)
})

/** The select works as a menu: it goes back to its placeholder after each pick. */
const picked = ref<number | null>(null)
function onPick() {
  if (picked.value != null) emit('categorize', picked.value)
  picked.value = null
}
</script>

<template>
  <div class="flex min-w-0 flex-wrap items-center gap-2 rounded-lg bg-primary-soft px-3 py-2" role="region" aria-label="Acciones sobre la selección">
    <p class="mr-auto text-[14px] font-medium text-primary" aria-live="polite">
      {{ selected.length === 1 ? '1 seleccionado' : `${selected.length} seleccionados` }}
    </p>
    <p v-if="rule.reason" id="bulk-category-reason" class="min-w-0 text-xs text-muted">{{ rule.reason }}</p>
    <select
      v-model="picked"
      class="control !w-auto max-w-full"
      aria-label="Cambiar categoría de la selección"
      :aria-describedby="rule.reason ? 'bulk-category-reason' : undefined"
      :disabled="!rule.kind || busy"
      @change="onPick"
    >
      <option :value="null" disabled>Cambiar categoría</option>
      <optgroup v-for="group in categoryGroups" :key="group.label" :label="group.label">
        <option v-for="category in group.items" :key="category.id" :value="category.id">{{ category.name }}</option>
      </optgroup>
    </select>
    <UiButton variant="danger" :disabled="busy" @click="$emit('remove')">
      <Trash2 class="size-4" aria-hidden="true" />
      Eliminar
    </UiButton>
    <UiButton variant="ghost" icon aria-label="Quitar selección" @click="$emit('clear')">
      <X class="size-4" aria-hidden="true" />
    </UiButton>
  </div>
</template>
