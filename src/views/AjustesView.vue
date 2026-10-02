<script setup lang="ts">
import { Settings } from 'lucide-vue-next'
import AccountsCard from '@/components/ajustes/AccountsCard.vue'
import AppearanceCard from '@/components/ajustes/AppearanceCard.vue'
import BackupCard from '@/components/ajustes/BackupCard.vue'
import CategoriesCard from '@/components/ajustes/CategoriesCard.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
</script>

<template>
  <div class="page">
    <PageHeader title="Ajustes" :icon="Settings" :month="false" />

    <!-- 1 column on phones, accounts | categories from lg, and a third column for backup + appearance on very wide screens. -->
    <div class="grid min-w-0 grid-cols-1 items-start gap-4 lg:grid-cols-2 min-[1800px]:grid-cols-3">
      <AccountsCard />
      <CategoriesCard />
      <div class="grid min-w-0 grid-cols-1 items-start gap-4 lg:col-span-2 lg:grid-cols-2 min-[1800px]:col-span-1 min-[1800px]:grid-cols-1">
        <BackupCard />
        <AppearanceCard />
      </div>
    </div>
  </div>
</template>
