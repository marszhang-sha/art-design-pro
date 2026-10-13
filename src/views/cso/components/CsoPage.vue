<template>
  <section class="cso-page" :class="{ 'cso-page--embedded': embedded }" :aria-label="title">
    <div v-if="!embedded && $slots.actions" class="cso-actions cso-page-actions">
      <slot name="actions" />
    </div>
    <slot />
    <CsoDetailDialog v-if="!embedded" />
  </section>
</template>
<script setup lang="ts">
  import { defineAsyncComponent } from 'vue'
  import '../shared-proto.scss'
  const CsoDetailDialog = defineAsyncComponent(() => import('./CsoDetailDialog.vue'))
  defineProps<{ title: string; subtitle?: string; embedded?: boolean }>()
</script>
