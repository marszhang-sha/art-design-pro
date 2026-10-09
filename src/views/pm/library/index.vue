<template>
  <!-- UI-PM-002 代理商资料库（登录即可，无权限码）：
       ACTIVE 树（G2-PM-1）+ BU/产品线/关键词交集筛选（BR-PM-011）+ 列表 + 详情（版本链/预览/下载）
       布局：根被布局层强制 .art-page-view 纵向，故树/表包内层 flex 行容器实现左右结构 -->
  <div class="art-full-height">
    <div class="flex gap-3 min-w-0 flex-1" style="align-items: stretch">
      <!-- ── 左：分类树（仅 ACTIVE，G2-PM-1 甲）── -->
      <ElCard class="w-64 shrink-0" shadow="never">
        <template #header><span class="font-medium">分类</span></template>
        <ElTree
          :data="treeData"
          node-key="id"
          :props="{ label: 'name', children: 'children' }"
          default-expand-all
          highlight-current
          :expand-on-click-node="false"
          @node-click="handleNodeClick"
        />
      </ElCard>

      <!-- ── 右：搜索（标准：独立卡外，v-show 联动）+ 列表 ── -->
      <div class="min-w-0 flex-1 flex flex-col">
        <ArtSearchBar
          v-show="showSearchBar"
          v-model="searchForm"
          :items="searchItems"
          @search="handleSearch"
          @reset="handleReset"
        />
        <ElCard
          class="art-table-card min-w-0 flex-1"
          shadow="never"
          :style="{ 'margin-top': showSearchBar ? '12px' : '0' }"
        >
          <ArtTableHeader
            v-model:columns="columnChecks"
            v-model:showSearchBar="showSearchBar"
            :loading="loading"
            @refresh="refreshData"
          />
          <ArtTable
            :loading="loading"
            :data="data"
            :columns="columns"
            :pagination="pagination"
            empty-text="暂无资料"
            @pagination:size-change="handleSizeChange"
            @pagination:current-change="handleCurrentChange"
            @sort-change="handleSortChange"
          />
        </ElCard>
      </div>
    </div>

    <!-- ── 详情 Drawer（共用组件）：预览 + 版本链 + 下载 ── -->
    <MaterialDetailDrawer v-model="detailVisible" :material-id="detailMaterialId" />
  </div>
</template>

<script setup lang="ts">
  import { h, onMounted, ref } from 'vue'
  import { ElButton } from 'element-plus'

  import { useTable } from '@/hooks/core/useTable'
  import { toPaginated } from '@/views/iam/table'
  import {
    pmMyApi,
    PM_DIMENSIONS_PLACEHOLDER,
    type PmCategoryNode,
    type PmMaterialListItem,
    type PmMaterialListParams
  } from '@/api/pm'
  import MaterialDetailDrawer from '@/views/pm/components/material-detail-drawer.vue'

  defineOptions({ name: 'PmLibrary' })

  // ── 维度占位名称（与 BE 种子清单同源；MD 域就绪后替换；BU/产品线 id 空间独立各查各域） ──

  const buName = (id: string | number): string =>
    PM_DIMENSIONS_PLACEHOLDER.find((b) => b.id === Number(id))?.name ?? `未知(${id})`
  const plName = (id: string | number): string => {
    const num = Number(id)
    for (const b of PM_DIMENSIONS_PLACEHOLDER) {
      const pl = b.productLines.find((p) => p.id === num)
      if (pl) return pl.name
    }
    return `未知(${id})`
  }

  // ── 分类树（仅 ACTIVE，G2-PM-1 甲）──

  const treeData = ref<PmCategoryNode[]>([])
  const selectedNodeId = ref<number | undefined>(undefined)

  async function loadTree() {
    treeData.value = await pmMyApi.categories()
  }

  function handleNodeClick(data: PmCategoryNode) {
    selectedNodeId.value = Number(data.id)
    handleSearch()
  }

  // ── 列表（可见性先验 + 交集筛选 BR-PM-011 由 BE 承载）──

  interface PmSearchFormParams {
    keyword?: string
    buId?: number
    productLineId?: number
  }

  const searchForm = ref<PmSearchFormParams>({})
  const sortBy = ref<PmMaterialListParams['sortBy']>(undefined)
  const sortOrder = ref<'asc' | 'desc' | undefined>(undefined)
  const showSearchBar = ref(true)

  const searchItems = [
    {
      label: 'BU',
      key: 'buId',
      type: 'select',
      props: {
        placeholder: '全部',
        options: PM_DIMENSIONS_PLACEHOLDER.map((b) => ({ label: b.name, value: b.id })),
        clearable: true
      }
    },
    {
      label: '产品线',
      key: 'productLineId',
      type: 'select',
      props: {
        placeholder: '全部',
        options: PM_DIMENSIONS_PLACEHOLDER.flatMap((b) =>
          b.productLines.map((pl) => ({ label: pl.name, value: pl.id }))
        ),
        clearable: true
      }
    },
    {
      label: '关键词',
      key: 'keyword',
      type: 'input',
      props: { placeholder: '资料名称', clearable: true }
    }
  ]

  function fetchList(
    params: Record<string, unknown>
  ): Promise<Api.Common.PaginatedResponse<PmMaterialListItem>> {
    const clean: Record<string, unknown> = {
      categoryId: selectedNodeId.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value
    }
    for (const [k, v] of Object.entries(params)) {
      if (v !== '' && v !== undefined && v !== null) clean[k] = v
    }
    return pmMyApi.list(clean).then(toPaginated)
  }

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    getData,
    replaceSearchParams,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: fetchList,
      apiParams: { page: 1, size: 20 },
      paginationKey: { current: 'page', size: 'size' },
      columnsFactory: () => [
        { prop: 'name', label: '名称', minWidth: 220 },
        {
          prop: 'buId',
          label: 'BU',
          width: 90,
          formatter: (row: PmMaterialListItem) => buName(row.buId)
        },
        {
          prop: 'productLineId',
          label: '产品线',
          width: 130,
          formatter: (row: PmMaterialListItem) => plName(row.productLineId)
        },
        {
          prop: 'currentVersion',
          label: '当前版本',
          minWidth: 180,
          formatter: (row: PmMaterialListItem) =>
            row.currentVersion
              ? `v${row.currentVersion.versionNo} · ${formatSize(row.currentVersion.fileSize)}`
              : '—'
        },
        {
          prop: 'createdAt',
          label: '上传时间',
          minWidth: 170,
          formatter: (row: PmMaterialListItem) => formatDateTime(row.createdAt)
        },
        {
          prop: 'operation',
          label: '操作',
          width: 130,
          fixed: 'right',
          formatter: (row: PmMaterialListItem) =>
            h('div', [
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => openDetail(row) },
                () => '详情'
              ),
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => downloadLatest(row) },
                () => '下载'
              )
            ])
        }
      ]
    }
  })

  function handleSearch() {
    replaceSearchParams({ ...searchForm, categoryId: selectedNodeId.value })
    getData()
  }

  function handleReset() {
    searchForm.value = {}
    selectedNodeId.value = undefined
    resetSearchParams()
    getData()
  }

  const handleSortChange = ({
    prop,
    order
  }: {
    prop: string
    order: 'ascending' | 'descending' | null
  }) => {
    sortBy.value = order ? (prop as NonNullable<PmMaterialListParams['sortBy']>) : undefined
    sortOrder.value = order === 'ascending' ? 'asc' : order === 'descending' ? 'desc' : undefined
    handleSearch()
  }

  // ── 详情（共用抽屉组件承载预览/版本链/下载）──

  const detailVisible = ref(false)
  const detailMaterialId = ref<string | null>(null)

  function openDetail(row: PmMaterialListItem) {
    detailMaterialId.value = row.id
    detailVisible.value = true
  }

  function saveBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadLatest(row: {
    id: string
    name: string
    currentVersion?: { fileName: string } | null
  }) {
    const fileName = row.currentVersion?.fileName ?? row.name
    pmMyApi
      .downloadLatest(row.id)
      .then((blob) => saveBlob(blob, fileName))
      .catch(() => undefined)
  }

  // ── 工具 ──

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

  onMounted(() => {
    loadTree()
  })
</script>
