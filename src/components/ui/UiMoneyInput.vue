<script setup lang="ts">
/**
 * Pesos input. Accepts what a person types ("200k", "1,5m", "514.381") and
 * emits integer pesos, or null while it is empty or not a number.
 */
import { ref, watch } from 'vue'
import { formatNumber, parseMoney } from '@/lib/format'

const model = defineModel<number | null>({ required: true })
defineProps<{ placeholder?: string; disabled?: boolean; invalid?: boolean }>()
// Attributes (data-autofocus, aria-label, id) belong on the <input>, not on the wrapper.
defineOptions({ inheritAttrs: false })

const text = ref(model.value == null ? '' : formatNumber(model.value))
const input = ref<HTMLInputElement>()

// Reflect outside changes (form reset, editing another row) without fighting the typing.
watch(model, (value) => {
  if (value !== parseMoney(text.value)) text.value = value == null ? '' : formatNumber(value)
})

function onInput(event: Event) {
  text.value = (event.target as HTMLInputElement).value
  model.value = parseMoney(text.value)
}

function onBlur() {
  if (model.value != null) text.value = formatNumber(model.value)
}

defineExpose({ focus: () => input.value?.focus(), select: () => input.value?.select() })
</script>

<template>
  <div class="relative">
    <span class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">$</span>
    <input
      ref="input"
      v-bind="$attrs"
      :value="text"
      type="text"
      inputmode="decimal"
      autocomplete="off"
      :placeholder="placeholder ?? '0'"
      :disabled="disabled"
      :aria-invalid="invalid || undefined"
      :class="['control num pl-7 text-right', invalid && 'border-danger']"
      @input="onInput"
      @blur="onBlur"
    />
  </div>
</template>
