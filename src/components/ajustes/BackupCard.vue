<script setup lang="ts">
/** Download a backup, or replace everything with one. */
import { computed, ref, shallowRef } from 'vue'
import { Download, Upload } from 'lucide-vue-next'
import UiButton from '@/components/ui/UiButton.vue'
import UiField from '@/components/ui/UiField.vue'
import UiModal from '@/components/ui/UiModal.vue'
import { api, ApiRequestError } from '@/lib/api'
import { errorMessage, useApiMutation } from '@/lib/queries'
import { checkBackup, isRestoreConfirmed, RESTORE_WORD, type BackupCheck } from './settings'

type ValidBackup = Extract<BackupCheck, { ok: true }>

const fileInput = ref<HTMLInputElement>()
const fileError = ref('')
// The parsed file can be large: no need to make it deeply reactive.
const pending = shallowRef<ValidBackup | null>(null)
const confirmOpen = ref(false)
const typed = ref('')
const restoreError = ref('')

const confirmed = computed(() => isRestoreConfirmed(typed.value))

async function onFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  // Clear it so picking the same file again fires `change`.
  input.value = ''
  if (!file) return
  fileError.value = ''
  let text: string
  try {
    text = await file.text()
  } catch {
    fileError.value = 'No se pudo leer el archivo. Intenta de nuevo.'
    return
  }
  const result = checkBackup(text)
  if (!result.ok) {
    fileError.value = result.message
    return
  }
  pending.value = result
  typed.value = ''
  restoreError.value = ''
  confirmOpen.value = true
}

const restore = useApiMutation(api.backup.restore, { success: 'Datos restaurados', silentError: true })

async function confirmRestore() {
  if (!confirmed.value || !pending.value) return
  restoreError.value = ''
  try {
    await restore.mutateAsync(pending.value.file)
  } catch (error) {
    // A 422 with field paths is the server's generic form message: say what it means for a file.
    const badShape = error instanceof ApiRequestError && error.status === 422 && Object.keys(error.fields).length > 0
    restoreError.value = badShape ? 'El respaldo no tiene el formato que esta aplicación espera. No se cambió nada.' : errorMessage(error)
    return
  }
  confirmOpen.value = false
  pending.value = null
}
</script>

<template>
  <section class="card flex min-w-0 flex-col gap-3" aria-labelledby="backup-title">
    <h2 id="backup-title" class="text-[16px] font-semibold">Respaldo</h2>
    <div class="flex flex-col gap-1 text-muted">
      <p>Tus datos viven en un archivo en este computador (<code class="break-all text-ink">data/finanzas.db</code>).</p>
      <p>Conviene descargar un respaldo de vez en cuando y guardarlo en otro lugar.</p>
    </div>

    <div class="flex flex-wrap gap-2">
      <a
        :href="api.backup.downloadUrl"
        download
        class="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-[14px] font-medium text-primary-ink transition-colors hover:bg-primary/90 sm:h-8"
      >
        <Download class="size-4" aria-hidden="true" />
        Descargar respaldo
      </a>
      <UiButton @click="fileInput?.click()">
        <Upload class="size-4" aria-hidden="true" />
        Restaurar desde un respaldo
      </UiButton>
      <input ref="fileInput" type="file" accept=".json,application/json" class="sr-only" tabindex="-1" aria-hidden="true" @change="onFilePicked" />
    </div>

    <p v-if="fileError" class="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger" role="alert">{{ fileError }}</p>

    <UiModal v-model:open="confirmOpen" title="Restaurar desde un respaldo">
      <form v-if="pending" id="restore-form" class="flex flex-col gap-3" @submit.prevent="confirmRestore">
        <p>
          Respaldo del <strong class="font-semibold">{{ pending.summary.dateLabel }}</strong
          >. Trae:
        </p>
        <ul class="grid grid-cols-1 gap-x-4 gap-y-1 rounded-lg bg-fill px-3 py-2 sm:grid-cols-2">
          <li v-for="line in pending.summary.lines" :key="line" class="num">{{ line }}</li>
        </ul>
        <p class="font-medium text-danger">Esto REEMPLAZA todos los datos actuales por los del respaldo. No se puede deshacer.</p>
        <UiField :label="`Para confirmar, escribe ${RESTORE_WORD}`">
          <input v-model="typed" type="text" class="control" autocomplete="off" autocapitalize="characters" spellcheck="false" />
        </UiField>
        <p v-if="restoreError" class="rounded-lg bg-danger-soft px-3 py-2 text-xs text-danger" role="alert">{{ restoreError }}</p>
      </form>
      <template #footer>
        <UiButton variant="ghost" @click="confirmOpen = false">Cancelar</UiButton>
        <UiButton variant="danger" type="submit" form="restore-form" :disabled="!confirmed" :loading="restore.isPending.value">Restaurar</UiButton>
      </template>
    </UiModal>
  </section>
</template>
