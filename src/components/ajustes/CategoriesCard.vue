<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown, Plus, Tags } from 'lucide-vue-next'
import { CATEGORY_GROUP_LABELS, type Category, type CategoryGroup } from '@shared/contract'
import EmptyState from '@/components/ui/EmptyState.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { api } from '@/lib/api'
import { categoryHex } from '@/lib/palette'
import { errorMessage, useApiMutation, useCategories } from '@/lib/queries'
import { useToasts } from '@/lib/toasts'
import CategoryModal from './CategoryModal.vue'
import DeleteConfirmModal from './DeleteConfirmModal.vue'
import RowActions from './RowActions.vue'
import { groupCategories } from './settings'

const toasts = useToasts()
const { data, isPending, isError, error, refetch } = useCategories()

const grouped = computed(() => groupCategories(data.value ?? []))
const showArchived = ref(false)

const formOpen = ref(false)
const editing = ref<Category | null>(null)
const formGroup = ref<CategoryGroup>('variables')
const deleteOpen = ref(false)
const deleting = ref<Category | null>(null)

function openNew(group: CategoryGroup) {
  editing.value = null
  formGroup.value = group
  formOpen.value = true
}

function openEdit(category: Category) {
  editing.value = category
  formGroup.value = category.group
  formOpen.value = true
}

function askDelete(category: Category) {
  deleting.value = category
  deleteOpen.value = true
}

const setArchived = useApiMutation((input: { id: number; archived: boolean }) => api.categories.update(input.id, { archived: input.archived }))

function toggleArchive(category: Category) {
  const archived = !category.archived
  setArchived.mutate({ id: category.id, archived }, { onSuccess: () => toasts.success(archived ? 'Categoría archivada' : 'Categoría restaurada') })
}

const removeDeleting = () => api.categories.remove(deleting.value!.id)
const archiveDeleting = () => api.categories.update(deleting.value!.id, { archived: true })
</script>

<template>
  <section class="card flex min-w-0 flex-col gap-3" aria-labelledby="categories-title">
    <header class="flex flex-wrap items-center justify-between gap-2">
      <h2 id="categories-title" class="text-[16px] font-semibold">Categorías</h2>
      <UiButton variant="primary" @click="openNew('variables')">
        <Plus class="size-4" aria-hidden="true" />
        Agregar categoría
      </UiButton>
    </header>

    <p v-if="isPending" class="py-6 text-center text-xs text-muted">Cargando categorías…</p>

    <div v-else-if="isError" class="flex flex-col items-center gap-2 py-6 text-center" role="alert">
      <p class="text-danger">{{ errorMessage(error) }}</p>
      <UiButton @click="refetch()">Reintentar</UiButton>
    </div>

    <EmptyState v-else-if="(data ?? []).length === 0" :icon="Tags" title="Aún no tienes categorías" text="Las categorías te dicen en qué se va la plata y de dónde llega.">
      <UiButton variant="primary" @click="openNew('variables')">Agregar categoría</UiButton>
    </EmptyState>

    <template v-else>
      <div v-for="section in grouped.sections" :key="section.group" class="flex flex-col gap-1">
        <div class="flex items-center justify-between gap-2 rounded-lg bg-fill py-0.5 pl-3 pr-0.5">
          <h3 class="min-w-0 truncate text-xs font-semibold text-muted">{{ section.label }}</h3>
          <UiButton variant="ghost" icon :aria-label="`Agregar categoría en ${section.label}`" title="Agregar en este grupo" @click="openNew(section.group)">
            <Plus class="size-4" aria-hidden="true" />
          </UiButton>
        </div>
        <p v-if="section.items.length === 0" class="px-3 py-1.5 text-xs text-muted">Sin categorías en este grupo.</p>
        <ul v-else class="flex flex-col">
          <li v-for="category in section.items" :key="category.id" class="flex min-w-0 items-center gap-2 pl-3">
            <span class="size-2.5 shrink-0 rounded-full" :style="{ backgroundColor: categoryHex(category.color) }" aria-hidden="true" />
            <span class="min-w-0 flex-1 truncate">{{ category.name }}</span>
            <RowActions
              :name="category.name"
              :archived="false"
              :busy="setArchived.isPending.value"
              @edit="openEdit(category)"
              @toggle-archive="toggleArchive(category)"
              @remove="askDelete(category)"
            />
          </li>
        </ul>
      </div>

      <div v-if="grouped.archived.length > 0" class="flex flex-col gap-1">
        <button
          type="button"
          class="flex h-10 items-center gap-1.5 self-start rounded-lg px-2 text-xs font-medium text-muted hover:bg-fill hover:text-ink sm:h-8"
          :aria-expanded="showArchived"
          aria-controls="archived-categories"
          @click="showArchived = !showArchived"
        >
          <ChevronDown :class="['size-4 transition-transform', showArchived && 'rotate-180']" aria-hidden="true" />
          Archivadas ({{ grouped.archived.length }})
        </button>
        <ul v-if="showArchived" id="archived-categories" class="flex flex-col">
          <li v-for="category in grouped.archived" :key="category.id" class="flex min-w-0 items-center gap-2 pl-3">
            <span class="size-2.5 shrink-0 rounded-full" :style="{ backgroundColor: categoryHex(category.color) }" aria-hidden="true" />
            <div class="min-w-0 flex-1 text-muted">
              <p class="truncate">{{ category.name }}</p>
              <p class="truncate text-xs">{{ CATEGORY_GROUP_LABELS[category.group] }}</p>
            </div>
            <RowActions
              :name="category.name"
              archived
              :busy="setArchived.isPending.value"
              @edit="openEdit(category)"
              @toggle-archive="toggleArchive(category)"
              @remove="askDelete(category)"
            />
          </li>
        </ul>
      </div>
    </template>

    <CategoryModal v-model:open="formOpen" :category="editing" :default-group="formGroup" />
    <DeleteConfirmModal
      v-model:open="deleteOpen"
      title="Eliminar categoría"
      :name="deleting?.name ?? ''"
      :archived="deleting?.archived ?? false"
      :remove="removeDeleting"
      :archive="archiveDeleting"
      deleted-text="Categoría eliminada"
      archived-text="Categoría archivada"
    />
  </section>
</template>
