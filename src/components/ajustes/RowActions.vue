<script setup lang="ts">
/** Edit / archive-restore / delete buttons of one account or category row. */
import { Archive, ArchiveRestore, Pencil, Trash2 } from 'lucide-vue-next'
import UiButton from '@/components/ui/UiButton.vue'

defineProps<{ name: string; archived: boolean; busy?: boolean }>()
defineEmits<{ edit: []; toggleArchive: []; remove: [] }>()
</script>

<template>
  <div class="flex shrink-0 items-center gap-1">
    <UiButton variant="ghost" icon :aria-label="`Editar ${name}`" title="Editar" @click="$emit('edit')">
      <Pencil class="size-4" aria-hidden="true" />
    </UiButton>
    <UiButton
      variant="ghost"
      icon
      :disabled="busy"
      :aria-label="archived ? `Restaurar ${name}` : `Archivar ${name}`"
      :title="archived ? 'Restaurar' : 'Archivar'"
      @click="$emit('toggleArchive')"
    >
      <component :is="archived ? ArchiveRestore : Archive" class="size-4" aria-hidden="true" />
    </UiButton>
    <UiButton variant="ghost" icon :aria-label="`Eliminar ${name}`" title="Eliminar" @click="$emit('remove')">
      <Trash2 class="size-4" aria-hidden="true" />
    </UiButton>
  </div>
</template>
