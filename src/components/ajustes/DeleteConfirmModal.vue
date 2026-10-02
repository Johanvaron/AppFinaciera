<script setup lang="ts">
/**
 * Confirms deleting an account or a category. When the server answers 409
 * (it has movements) it shows the server's message and offers to archive
 * right there instead.
 */
import { ref, watch } from 'vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiModal from '@/components/ui/UiModal.vue'
import { ApiRequestError } from '@/lib/api'
import { errorMessage, useApiMutation } from '@/lib/queries'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{
  title: string
  /** Name of the thing being deleted. */
  name: string
  /** Already archived: on a 409 there is nothing else to offer. */
  archived: boolean
  remove: () => Promise<unknown>
  archive: () => Promise<unknown>
  deletedText: string
  archivedText: string
}>()

const message = ref('')
const inUse = ref(false)

watch(open, (isOpen) => {
  if (isOpen) {
    message.value = ''
    inUse.value = false
  }
})

const removal = useApiMutation(() => props.remove(), { success: props.deletedText, silentError: true })
const archiving = useApiMutation(() => props.archive(), { success: props.archivedText, silentError: true })

async function confirmRemove() {
  message.value = ''
  try {
    await removal.mutateAsync(undefined)
    open.value = false
  } catch (error) {
    message.value = errorMessage(error)
    inUse.value = error instanceof ApiRequestError && error.status === 409
  }
}

async function confirmArchive() {
  try {
    await archiving.mutateAsync(undefined)
    open.value = false
  } catch (error) {
    message.value = errorMessage(error)
  }
}
</script>

<template>
  <UiModal v-model:open="open" :title="title" size="sm">
    <div class="flex flex-col gap-3">
      <p>
        ¿Eliminar <strong class="font-semibold">{{ name }}</strong
        >? Esta acción no se puede deshacer.
      </p>
      <p v-if="message" class="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger" role="alert">{{ message }}</p>
      <p v-if="inUse && archived" class="text-xs text-muted">Ya está archivada: no aparece al registrar movimientos nuevos.</p>
    </div>
    <template #footer>
      <UiButton variant="ghost" @click="open = false">Cancelar</UiButton>
      <UiButton v-if="inUse && !archived" variant="primary" :loading="archiving.isPending.value" @click="confirmArchive">Archivar</UiButton>
      <UiButton v-if="!inUse" variant="danger" :loading="removal.isPending.value" @click="confirmRemove">Eliminar</UiButton>
    </template>
  </UiModal>
</template>
