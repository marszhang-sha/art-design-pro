<template>
  <ElDialog
    v-if="activeCsoDetail"
    :model-value="!!activeCsoDetail"
    :title="activeCsoDetail ? titles[activeCsoDetail.kind] : '详情'"
    width="min(1080px, calc(100vw - 32px))"
    top="5vh"
    class="cso-detail-dialog"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="closeCsoDetail"
  >
    <component
      :is="components[activeCsoDetail.kind]"
      v-if="activeCsoDetail"
      :key="`${activeCsoDetail.kind}-${activeCsoDetail.id}`"
      :record-id="activeCsoDetail.id"
    />
    <template #footer>
      <ElButton v-if="canGoBackCsoDetail" @click="backCsoDetail">返回上一张卡片</ElButton>
      <ElButton @click="closeCsoDetail">关闭详情</ElButton>
    </template>
  </ElDialog>
</template>

<script setup lang="ts">
  import { defineAsyncComponent, onBeforeUnmount, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import {
    activeCsoDetail,
    canGoBackCsoDetail,
    backCsoDetail,
    closeCsoDetail
  } from '../detail-panel'

  const titles: Record<string, string> = {
    intentions: '合作意向详情'
  }
  const components: Record<string, ReturnType<typeof defineAsyncComponent>> = {
    intentions: defineAsyncComponent(() => import('../intentions/detail.vue'))
  }
  const route = useRoute()
  watch(() => route.fullPath, closeCsoDetail)
  onBeforeUnmount(closeCsoDetail)
</script>

<style lang="scss">
  .cso-detail-dialog .el-dialog__body {
    max-height: 72vh;
    padding: 16px;
    overflow-y: auto;
    background: var(--el-fill-color-light);
  }

  .cso-detail-dialog .cso-page--embedded {
    padding: 0;
  }

  .cso-detail-dialog .cso-card {
    padding: 20px;
    margin-bottom: 12px;
    border-color: var(--art-card-border);
    border-radius: calc(var(--custom-radius) / 2 + 2px);
  }

  .cso-detail-dialog .cso-grid {
    gap: 12px;
  }

  .cso-detail-dialog .cso-page--embedded > .cso-card:last-child {
    margin-bottom: 0;
  }
</style>
