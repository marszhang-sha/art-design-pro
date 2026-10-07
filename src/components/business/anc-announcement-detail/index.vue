<template>
  <!-- UI-ANC-002 公告详情抽屉：工作台 feed 与通知中心共用。
       正文为后端 nh3 净化后的白名单 HTML（契约 §7.3），可安全 v-html 渲染。 -->
  <ElDrawer v-model="visible" title="公告详情" size="560px">
    <div v-loading="loading" class="anc-detail-body">
      <template v-if="detail">
        <div class="mb-4">
          <h3 class="m-0 text-lg font-semibold">
            {{ detail.title }}
            <ElTag v-if="detail.pinned" type="warning" size="small" class="ml-2">置顶</ElTag>
          </h3>
          <div class="mt-1 text-xs text-gray-400">
            发布于 {{ formatDateTime(detail.publishAt) }}
          </div>
        </div>

        <!-- WITHDRAWN 下线态（BR-ANC-010）：标题留存、无正文/附件 -->
        <ElAlert
          v-if="detail.status === 'WITHDRAWN'"
          :title="`该公告已撤回${detail.withdrawnAt ? '（' + formatDateTime(detail.withdrawnAt) + '）' : ''}`"
          type="warning"
          :closable="false"
          show-icon
        />
        <template v-else>
          <div class="anc-content" v-html="detail.content"></div>

          <div v-if="detail.attachments.length" class="mt-6">
            <div class="mb-2 text-sm font-medium">附件（{{ detail.attachments.length }}）</div>
            <div
              v-for="att in detail.attachments"
              :key="att.id"
              class="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
            >
              <span class="truncate" :title="att.fileName">{{ att.fileName }}</span>
              <span class="ml-3 flex shrink-0 items-center gap-3">
                <span class="text-xs text-gray-400">{{ formatFileSize(att.fileSize) }}</span>
                <ElButton
                  link
                  type="primary"
                  :loading="downloadingId === att.id"
                  @click="download(att)"
                >
                  下载
                </ElButton>
              </span>
            </div>
          </div>
        </template>
      </template>

      <!-- 快照外/未发布 404 ANC-4002（防探测） -->
      <ElResult v-else-if="notFound" icon="warning" title="公告不存在或不可见" />
      <ElResult v-else-if="loadError" icon="error" title="公告加载失败" :sub-title="loadError" />
    </div>
  </ElDrawer>
</template>

<script setup lang="ts">
  import { ref, watch } from 'vue'
  import { ancApi, type AncAttachment, type AncMyAnnouncementDetail } from '@/api/anc'
  import { ntfApi } from '@/api/ntf'
  import { HttpError } from '@/utils/http/error'

  defineOptions({ name: 'AncAnnouncementDetail' })

  const props = defineProps<{
    /** 公告 id（通知中心按 sourceId 打开） */
    announcementId: string | null
    /** 通知收件箱条目 id：提供则在详情载入后标记已读（公告 readAt 与通知共行） */
    entryId?: string | null
  }>()

  const emit = defineEmits<{
    /** 详情载入成功（含已读标记尝试）后触发，父级据此刷新列表/红点 */
    (e: 'read'): void
  }>()

  const visible = defineModel<boolean>({ default: false })

  const loading = ref(false)
  const detail = ref<AncMyAnnouncementDetail | null>(null)
  const notFound = ref(false)
  const loadError = ref('')
  const downloadingId = ref<string | null>(null)

  async function fetchDetail() {
    if (!props.announcementId) return
    loading.value = true
    detail.value = null
    notFound.value = false
    loadError.value = ''
    try {
      detail.value = await ancApi.myAnnouncementDetail(props.announcementId)
      // 打开详情即标已读；须等写库完成再通知父级回刷，否则回刷竞速读到写前状态（未读点滞留）。
      // 撤回清理等竞态下 404 静默容忍（NTF-4002），失败不阻断详情展示
      if (props.entryId) {
        await ntfApi.markRead(props.entryId).catch(() => undefined)
      }
      emit('read')
    } catch (e) {
      if (
        e instanceof HttpError &&
        (e.code === 404 || (e.data as { code?: string } | undefined)?.code === 'ANC-4002')
      ) {
        notFound.value = true
      } else {
        loadError.value = e instanceof Error ? e.message : String(e)
      }
    } finally {
      loading.value = false
    }
  }

  watch([visible, () => props.announcementId], ([show]) => {
    if (show && props.announcementId) fetchDetail()
  })

  async function download(att: AncAttachment) {
    if (!props.announcementId) return
    downloadingId.value = att.id
    try {
      const blob = await ancApi.downloadAttachment(props.announcementId, att.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = att.fileName // 响应头 Content-Disposition 被包装层丢弃，文件名取载荷
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      downloadingId.value = null
    }
  }

  function formatDateTime(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN', { hour12: false })
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }
</script>

<style lang="scss" scoped>
  .anc-detail-body {
    min-height: 200px;
  }

  // 净化白名单禁内联样式（§7.3），此处补基础排版
  .anc-content {
    font-size: 14px;
    line-height: 1.8;
    word-break: break-word;

    :deep(p) {
      margin: 0 0 10px;
    }

    :deep(h2),
    :deep(h3),
    :deep(h4) {
      margin: 16px 0 8px;
      font-weight: 600;
    }

    :deep(blockquote) {
      padding: 4px 12px;
      margin: 8px 0;
      color: var(--el-text-color-secondary);
      border-left: 3px solid var(--el-border-color);
    }

    :deep(ul),
    :deep(ol) {
      padding-left: 22px;
      margin: 0 0 10px;
    }

    :deep(code) {
      padding: 1px 4px;
      background: var(--el-fill-color-light);
      border-radius: 3px;
    }

    :deep(pre) {
      padding: 10px;
      margin: 8px 0;
      overflow-x: auto;
      background: var(--el-fill-color-light);
      border-radius: 4px;

      code {
        padding: 0;
        background: none;
      }
    }

    :deep(a) {
      color: var(--el-color-primary);
    }
  }
</style>
