<script setup lang="ts">
/** Create or edit a category. The kind (income/expense) follows the group. */
import { reactive, ref, watch } from 'vue'
import {
  CATEGORY_COLORS,
  CATEGORY_GROUP_LABELS,
  CATEGORY_GROUPS,
  categoryInputSchema,
  type Category,
  type CategoryColor,
  type CategoryGroup,
} from '@shared/contract'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiModal from '@/components/ui/UiModal.vue'
import { api } from '@/lib/api'
import { CATEGORY_HEX } from '@/lib/palette'
import { errorFields, errorMessage, useApiMutation } from '@/lib/queries'
import { useToasts } from '@/lib/toasts'
import { kindForGroup } from './settings'

const COLOR_NAMES: Record<CategoryColor, string> = {
  blue: 'Azul',
  teal: 'Verde azulado',
  green: 'Verde',
  lime: 'Lima',
  amber: 'Ámbar',
  orange: 'Naranja',
  rose: 'Rosa',
  pink: 'Fucsia',
  violet: 'Violeta',
  indigo: 'Índigo',
  cyan: 'Cian',
  slate: 'Gris',
}

const open = defineModel<boolean>('open', { required: true })
/** Null = new category, created in `defaultGroup`. */
const props = defineProps<{ category: Category | null; defaultGroup: CategoryGroup }>()

const toasts = useToasts()
const form = reactive({
  name: '',
  group: 'variables' as CategoryGroup,
  color: 'slate' as CategoryColor,
})
const errors = ref<Record<string, string>>({})
const formError = ref('')

watch(
  open,
  (isOpen) => {
    if (!isOpen) return
    form.name = props.category?.name ?? ''
    form.group = props.category?.group ?? props.defaultGroup
    form.color = props.category?.color ?? 'blue'
    errors.value = {}
    formError.value = ''
  },
  { immediate: true },
)

/** Arrow keys move the selection, as in a native radio group. */
function onColorKeydown(event: KeyboardEvent) {
  const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key]
  if (!step) return
  event.preventDefault()
  const index = (CATEGORY_COLORS.indexOf(form.color) + step + CATEGORY_COLORS.length) % CATEGORY_COLORS.length
  form.color = CATEGORY_COLORS[index]!
  const buttons = (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="radio"]')
  buttons[index]?.focus()
}

const save = useApiMutation(
  (input: Parameters<typeof api.categories.create>[0]) =>
    props.category ? api.categories.update(props.category.id, input) : api.categories.create(input),
  { silentError: true },
)

async function submit() {
  errors.value = {}
  formError.value = ''
  const parsed = categoryInputSchema.safeParse({
    name: form.name,
    kind: kindForGroup(form.group),
    group: form.group,
    color: form.color,
    archived: props.category?.archived ?? false,
  })
  if (!parsed.success) {
    for (const issue of parsed.error.issues) errors.value[String(issue.path[0] ?? '')] ??= issue.message
    return
  }
  try {
    await save.mutateAsync(parsed.data)
  } catch (error) {
    const fields = errorFields(error)
    // `kind` has no input of its own: its error belongs to the group select.
    errors.value = { ...fields, group: fields.group ?? fields.kind ?? '' }
    if (!Object.values(errors.value).some(Boolean)) formError.value = errorMessage(error)
    return
  }
  toasts.success(props.category ? 'Categoría actualizada' : 'Categoría creada')
  open.value = false
}
</script>

<template>
  <UiModal v-model:open="open" :title="category ? 'Editar categoría' : 'Agregar categoría'">
    <form id="category-form" class="flex flex-col gap-3" @submit.prevent="submit">
      <UiField label="Nombre" :error="errors.name">
        <input v-model="form.name" type="text" class="control" maxlength="60" placeholder="Ej. Mercado" :aria-invalid="!!errors.name || undefined" />
      </UiField>

      <UiField
        label="Grupo"
        :error="errors.group"
        :hint="category ? 'Una categoría con movimientos no puede pasar de ingreso a gasto ni al revés.' : undefined"
      >
        <select v-model="form.group" class="control" :aria-invalid="!!errors.group || undefined">
          <option v-for="group in CATEGORY_GROUPS" :key="group" :value="group">{{ CATEGORY_GROUP_LABELS[group] }}</option>
        </select>
      </UiField>

      <div class="min-w-0">
        <span id="category-color-label" class="label">Color</span>
        <div class="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="category-color-label" @keydown="onColorKeydown">
          <button
            v-for="color in CATEGORY_COLORS"
            :key="color"
            type="button"
            role="radio"
            :aria-checked="form.color === color"
            :aria-label="COLOR_NAMES[color]"
            :title="COLOR_NAMES[color]"
            :tabindex="form.color === color ? 0 : -1"
            :class="[
              'size-10 rounded-full ring-offset-2 ring-offset-surface transition-shadow sm:size-8',
              form.color === color ? 'ring-2 ring-ink' : 'hover:ring-2 hover:ring-line',
            ]"
            :style="{ backgroundColor: CATEGORY_HEX[color] }"
            @click="form.color = color"
          />
        </div>
        <span v-if="errors.color" class="mt-1 block text-xs text-danger" role="alert">{{ errors.color }}</span>
      </div>

      <p v-if="formError" class="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger" role="alert">{{ formError }}</p>
    </form>

    <template #footer>
      <UiButton variant="ghost" @click="open = false">Cancelar</UiButton>
      <UiButton variant="primary" type="submit" form="category-form" :loading="save.isPending.value">Guardar</UiButton>
    </template>
  </UiModal>
</template>
