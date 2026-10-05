<script setup lang="ts">
import { CreditCard } from 'lucide-vue-next'
import PageHeader from '@/components/layout/PageHeader.vue'
</script>

<template>
  <div class="page">
    <PageHeader title="Deudas" :icon="CreditCard" :month="false" />
  </div>
</template>
