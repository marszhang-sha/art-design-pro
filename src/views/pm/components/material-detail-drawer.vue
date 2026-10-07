<template>
  <!-- 资料详情抽屉（共用）：预览（最新版）+ 版本链 + 下载；库页与工作台复用 -->
  <ElDrawer
    :model-value="modelValue"
    :title="detail?.name ?? '资料详情'"
    size="680px"
    @update:model-value="emit('update:modelValue', $event)"
    @closed="clearPreview"
  >
    <div v-loading="loading">
      <template v-if="detail">
        <!-- 预览区：PDF iframe / 图片直出；非预览格式（415 PM-4005）提示仅下载 -->
        <div class="mb-4">
          <div class="mb-2 flex items-center justify-between">
            <span class="font-medium">在线预览（最新版）</span>
            <ElButton type="primary" icon="ri:download-2-line" @click="downloadLatest"
              >下载最新版</ElButton
            >
          </div>
          <div
            v-if="previewDenied"
            class="art-alert art-bg-hover rounded border p-6 text-center opacity-70"
          >
            该格式不支持在线预览，请下载后查看
          </div>
          <div v-else-if="previewUrl" class="rounded border">
            <iframe
              v-if="previewKind === 'pdf'"
              :src="previewUrl"
              class="h-96 w-full"
              title="PDF 预览"
            />
            <img v-else :src="previewUrl" class="max-h-96 w-full object-contain" alt="资料预览" />
          </div>
          <div v-else class="rounded border p-6 text-center opacity-60">预览加载中…</div>
        </div>

        <ElDivider content-position="left">版本链</ElDivider>
        <ElTable :data="detail.versions" empty-text="暂无版本">
          <ElTableColumn prop="versionNo" label="版本" width="70" />
          <ElTableColumn label="文件" min-width="200">
            <template #default="{ row }">
              {{ row.fileName }}
              <ElTag v-if="row.isCurrent" size="small" type="success" class="ml-1">当前版</ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="大小" width="100">
            <template #default="{ row }">{{ formatSize(row.fileSize) }}</template>
          </ElTableColumn>
          <ElTableColumn label="上传时间" width="170">
            <template #default="{ row }">{{ formatDateTime(row.uploadedAt) }}</template>
          </ElTableColumn>
          <ElTableColumn label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <ElButton link type="primary" @click="downloadVersion(row)">下载</ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
      </template>
    </div>
  </ElDrawer>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { ElButton } from 'element-plus'

  import { pmMyApi, type PmMaterialDetail } from '@/api/pm'

  const props = defineProps<{
    modelValue: boolean
    /** 打开时拉取的资料 id；null = 关闭态 */
    materialId: string | null
  }>()

  const emit = defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

  const loading = ref(false)
  const detail = ref<PmMaterialDetail | null>(null)
  const previewUrl = ref<string | null>(null)
  const previewDenied = ref(false)

  const previewKind = computed(() =>
    detail.value?.versions[0]?.contentType === 'application/pdf' ? 'pdf' : 'image'
  )

  function clearPreview() {
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = null
    previewDenied.value = false
  }

  async function load(materialId: string) {
    loading.value = true
    clearPreview()
    try {
      // 范围外 404 PM-4002：http 层全局提示「资源不存在或不可见」（防探测统一口径）
      detail.value = await pmMyApi.get(materialId)
      await loadPreview(materialId)
    } catch {
      detail.value = null
    } finally {
      loading.value = false
    }
  }

  /** 预览固定最新版（裁定 BP-PM-001-6）；415 → 仅下载提示（BR-PM-008） */
  async function loadPreview(materialId: string | number) {
    try {
      const blob = await pmMyApi.preview(materialId)
      previewUrl.value = URL.createObjectURL(blob)
    } catch {
      previewDenied.value = true
    }
  }

  function saveBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadLatest() {
    if (!detail.value) return
    const fileName = detail.value.versions[0]?.fileName ?? detail.value.name
    pmMyApi
      .downloadLatest(detail.value.id)
      .then((blob) => saveBlob(blob, fileName))
      .catch(() => undefined)
  }

  function downloadVersion(v: { versionNo: number; fileName: string }) {
    if (!detail.value) return
    pmMyApi
      .downloadVersion(detail.value.id, v.versionNo)
      .then((blob) => saveBlob(blob, v.fileName))
      .catch(() => undefined)
  }

  function formatDateTime(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN', { hour12: false })
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  watch(
    () => [props.modelValue, props.materialId] as const,
    ([open, id]) => {
      if (open && id) load(id)
    }
  )
</script>
