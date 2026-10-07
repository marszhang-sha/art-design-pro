<template>
  <!-- UI-NTF-001 通知中心（无码公共页 /ntf/notifications）：
       本人收件箱——来源徽标/标题/摘要/时间/未读点；标记已读（幂等）、全部已读、软删（二次确认）。
       固定发布时点倒序，不开放 sortBy；操作后回刷列表与未读数（铃铛+公告红点）。 -->
  <div class="art-full-height">
    <ElCard shadow="never">
      <template #header>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="flex items-center gap-3">
            <span class="text-base font-medium">通知中心</span>
            <ElTag v-if="unreadTotal > 0" type="danger" size="small" effect="plain">
              {{ unreadTotal }} 条未读
            </ElTag>
          </div>
          <div class="flex items-center gap-3">
            <ElRadioGroup v-model="unreadOnly" @change="onFilterChange">
              <ElRadioButton value="false">全部</ElRadioButton>
              <ElRadioButton value="true">未读</ElRadioButton>
            </ElRadioGroup>
            <ElButton :disabled="unreadTotal === 0" @click="onReadAll">全部已读</ElButton>
          </div>
        </div>
      </template>

      <div v-loading="loading" class="ntf-list">
        <template v-if="error">
          <ElResult icon="error" title="通知加载失败">
            <template #extra>
              <ElButton type="primary" @click="() => load()">重试</ElButton>
            </template>
          </ElResult>
        </template>
        <template v-else-if="entries.length">
          <div
            v-for="entry in entries"
            :key="entry.id"
            class="ntf-item"
            :class="{ 'c-p': entry.notification.sourceType === 'ANNOUNCEMENT' }"
            @click="onItemClick(entry)"
          >
            <ElTag
              size="small"
              :type="entry.notification.sourceType === 'ANNOUNCEMENT' ? 'primary' : 'info'"
              class="shrink-0"
            >
              {{ sourceLabel(entry.notification.sourceType) }}
            </ElTag>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="truncate" :class="entry.readAt ? 'text-gray-500' : 'font-medium'">
                  {{ entry.notification.title }}
                </span>
                <span v-if="!entry.readAt" class="unread-dot"></span>
              </div>
              <div v-if="entry.notification.summary" class="mt-0.5 truncate text-xs text-gray-400">
                {{ entry.notification.summary }}
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-4">
              <span class="text-xs text-gray-400">
                {{ formatDateTime(entry.notification.publishedAt) }}
              </span>
              <ElButton
                link
                type="primary"
                :disabled="!!entry.readAt"
                @click.stop="onMarkRead(entry)"
              >
                标记已读
              </ElButton>
              <ElButton link type="danger" @click.stop="onDelete(entry)">删除</ElButton>
            </div>
          </div>
        </template>
        <ElEmpty v-else-if="!loading" description="暂无通知" />
      </div>

      <div v-if="total > 0" class="mt-3 flex justify-end">
        <ElPagination
          layout="total, prev, pager, next"
          :total="total"
          :current-page="page"
          :page-size="PAGE_SIZE"
          @current-change="onPageChange"
        />
      </div>
    </ElCard>

    <!-- 公告类条目 → 公告详情抽屉（打开即标已读并回刷） -->
    <AncAnnouncementDetail
      v-model="drawerVisible"
      :announcement-id="drawerAnnouncementId"
      :entry-id="drawerEntryId"
      @read="onDrawerRead"
    />
  </div>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { ntfApi, type NtfInboxEntry, type NtfSourceType } from '@/api/ntf'
  import AncAnnouncementDetail from '@/components/business/anc-announcement-detail/index.vue'
  import { useNtfUnread } from '@/components/business/notification-bell/use-ntf-unread'

  defineOptions({ name: 'NtfNotifications' })

  const PAGE_SIZE = 20

  /** 未读总数（铃铛红点同源）；total 仅作分页用 */
  const { total: unreadTotal, refresh } = useNtfUnread()

  // ---------- 列表（固定发布时点倒序） ----------

  const loading = ref(false)
  const error = ref(false)
  const entries = ref<NtfInboxEntry[]>([])
  /** 列表总条数（分页；「全部」视图下 ≠ 未读数） */
  const total = ref(0)
  const page = ref(1)
  const unreadOnly = ref<'true' | 'false'>('false')

  async function load(reset = true) {
    loading.value = true
    error.value = false
    if (reset) page.value = 1
    try {
      const res = await ntfApi.list({
        page: page.value,
        size: PAGE_SIZE,
        unreadOnly: unreadOnly.value
      })
      entries.value = res.items
      total.value = res.total
    } catch {
      error.value = true
    } finally {
      loading.value = false
    }
  }

  function onFilterChange() {
    load()
  }

  function onPageChange(p: number) {
    page.value = p
    load(false)
  }

  // ---------- 单条操作（操作后回刷列表与未读数） ----------

  function sourceLabel(type: NtfSourceType): string {
    return type === 'ANNOUNCEMENT' ? '公告' : '账号'
  }

  async function onMarkRead(entry: NtfInboxEntry) {
    // INV-5 幂等；撤回清理竞态下 404 静默容忍
    await ntfApi.markRead(entry.id)
    entry.readAt = new Date().toISOString()
    refresh()
  }

  function onReadAll() {
    ntfApi
      .readAll()
      .then(async (res) => {
        ElMessage.success(`已标记 ${res.updatedCount} 条为已读`)
        await Promise.all([load(), refresh()])
      })
      .catch(() => undefined)
  }

  /** INV-6 软删不可恢复：二次确认；删除后回刷列表与红点 */
  function onDelete(entry: NtfInboxEntry) {
    ElMessageBox.confirm('删除后不可恢复，确认删除该通知？', '删除通知', { type: 'warning' })
      .then(async () => {
        await ntfApi.remove(entry.id)
        ElMessage.success('已删除')
        // 当前页只剩这一条且不在首页时，回退一页避免空页
        if (page.value > 1 && entries.value.length === 1) page.value -= 1
        await Promise.all([load(false), refresh()])
      })
      .catch(() => undefined)
  }

  /** ANNOUNCEMENT → 公告详情（sourceId 即公告 id，entry id 用于标已读）；ACCOUNT_EVENT 不跳转 */
  function onItemClick(entry: NtfInboxEntry) {
    if (entry.notification.sourceType !== 'ANNOUNCEMENT') return
    drawerAnnouncementId.value = entry.notification.sourceId
    drawerEntryId.value = entry.id
    drawerVisible.value = true
  }

  // ---------- 公告详情抽屉 ----------

  const drawerVisible = ref(false)
  const drawerAnnouncementId = ref<string | null>(null)
  const drawerEntryId = ref<string | null>(null)

  async function onDrawerRead() {
    await Promise.all([load(false), refresh()])
  }

  // ---------- 初始化 ----------

  onMounted(() => {
    load()
    refresh()
  })

  function formatDateTime(iso: string): string {
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN', { hour12: false })
  }
</script>

<style lang="scss" scoped>
  .ntf-list {
    min-height: 200px;
  }

  .ntf-item {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 12px 4px;
    border-bottom: 1px solid var(--el-border-color-extra-light);

    &:last-of-type {
      border-bottom: none;
    }

    &.c-p:hover {
      background: var(--el-fill-color-light);
    }
  }

  .unread-dot {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    background: var(--el-color-danger);
    border-radius: 50%;
  }
</style>
