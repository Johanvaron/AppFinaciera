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

    <!--
      Two columns from lg: the short cards (accounts, backup, appearance) stack on the left so the
      tall categories card on the right leaves no empty space under them. On phones the left column
      dissolves (`contents`) and `order` keeps categories right after accounts.
    -->
    <!-- Both columns end on the same line: the last card of the left column grows to meet the categories card. -->
    <div class="grid min-w-0 grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
      <div class="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-4">
        <AccountsCard class="order-1" />
        <BackupCard class="order-3" />
        <AppearanceCard class="order-3 lg:flex-1" />
      </div>
      <CategoriesCard class="order-2" />
    </div>
  </div>
</template>
