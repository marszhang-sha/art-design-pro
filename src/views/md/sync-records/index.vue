<template>
  <!-- UI-MD-006 同步记录（/md/sync-records）：批次列表＋失败明细 Drawer（A-MD-11 正式侧载体）。 -->
  <div class="art-full-height">
    <ArtSearchBar
      v-show="showSearchBar"
      v-model="searchForm"
      :items="searchItems"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard
      shadow="never"
      class="art-table-card"
      :style="{ 'margin-top': showSearchBar ? '12px' : '0' }"
    >
      <ArtTableHeader
        v-model:columns="columnChecks"
        v-model:showSearchBar="showSearchBar"
        :loading="loading"
        @refresh="getData"
      />
      <ArtTable
        :loading="loading"
        :data="records"
        :columns="columns"
        :pagination="pagination"
        empty-text="暂无同步批次"
        @row-click="openRejections"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>

    <ElDrawer v-model="rejectionVisible" :title="`失败明细（批次 ${rejectionBatchId}）`" size="560">
      <ElTable :data="rejections" v-loading="rejectionLoading" empty-text="该批次无失败行">
        <ElTableColumn prop="bizKey" label="业务键" min-width="180" show-overflow-tooltip />
        <ElTableColumn prop="reason" label="原因" min-width="220" show-overflow-tooltip />
      </ElTable>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { h, ref } from 'vue'
  import { ElTag } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { toPaginated } from '@/views/iam/table'
  import { mdSyncApi, type MdSyncBatch, type MdSyncRejection } from '@/api/md'

  const showSearchBar = ref(true)

  defineOptions({ name: 'MdSyncRecords' })

  const SIZE = 20

  const searchForm = ref<{ object?: MdSyncBatch['object']; status?: MdSyncBatch['status'] }>({})
  const searchItems = [
    {
      label: '对象',
      key: 'object',
      type: 'select',
      props: {
        placeholder: '全部',
        clearable: true,
        options: [
          { label: '工作日历', value: 'WORK_CALENDAR' },
          { label: '药店医院', value: 'DRUG_STORE' },
          { label: '行政区划', value: 'REGION' },
          { label: '辖区组织', value: 'TERRITORY' }
        ]
      }
    },
    {
      label: '状态',
      key: 'status',
      type: 'select',
      props: {
        placeholder: '全部',
        clearable: true,
        options: [
          { label: '成功', value: 'SUCCESS' },
          { label: '部分成功', value: 'PARTIAL' },
          { label: '失败', value: 'FAILED' },
          { label: '进行中', value: 'RUNNING' }
        ]
      }
    }
  ]

  function fetchBatches(params: Record<string, unknown>) {
    const clean: Record<string, unknown> = {}
    if (params.object) clean.object = params.object
    if (params.status) clean.status = params.status
    if (params.page !== undefined) clean.page = params.page
    if (params.size !== undefined) clean.size = params.size
    return mdSyncApi.batches(clean).then(toPaginated)
  }

  const {
    columns,
    columnChecks,
    data: records,
    loading,
    pagination,
    getData,
    replaceSearchParams,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange
  } = useTable({
    core: {
      apiFn: fetchBatches,
      apiParams: { page: 1, size: SIZE },
      paginationKey: { current: 'page', size: 'size' },
      columnsFactory: () => [
        { prop: 'id', label: '批次', width: 80 },
        {
          prop: 'object',
          label: '对象',
          width: 110,
          formatter: (r: MdSyncBatch) =>
            ({
              WORK_CALENDAR: '工作日历',
              DRUG_STORE: '药店医院',
              REGION: '行政区划',
              TERRITORY: '辖区组织'
            })[r.object] ?? r.object
        },
        {
          prop: 'startedAt',
          label: '开始',
          minWidth: 170,
          formatter: (r: MdSyncBatch) => formatDateTime(r.startedAt)
        },
        {
          prop: 'finishedAt',
          label: '结束',
          minWidth: 170,
          formatter: (r: MdSyncBatch) => formatDateTime(r.finishedAt)
        },
        { prop: 'totalRows', label: '总行数', width: 90 },
        { prop: 'acceptedRows', label: '成功', width: 80 },
        { prop: 'rejectedRows', label: '失败', width: 80 },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          formatter: (r: MdSyncBatch) =>
            h(
              ElTag,
              {
                type:
                  r.status === 'SUCCESS'
                    ? 'success'
                    : r.status === 'PARTIAL'
                      ? 'warning'
                      : r.status === 'FAILED'
                        ? 'danger'
                        : 'info',
                size: 'small'
              },
              () =>
                ({ RUNNING: '进行中', SUCCESS: '成功', PARTIAL: '部分成功', FAILED: '失败' })[
                  r.status
                ] ?? r.status
            )
        }
      ]
    }
  })

  function handleSearch() {
    replaceSearchParams({ ...searchForm.value })
    getData()
  }

  function handleReset() {
    searchForm.value = {}
    resetSearchParams()
    getData()
  }

  // ── 失败明细 Drawer ──

  const rejectionVisible = ref(false)
  const rejectionBatchId = ref<string>('')
  const rejections = ref<MdSyncRejection[]>([])
  const rejectionLoading = ref(false)

  async function openRejections(row: MdSyncBatch) {
    rejectionBatchId.value = row.id
    rejectionVisible.value = true
    rejectionLoading.value = true
    try {
      const res = await mdSyncApi.rejections(row.id, { page: 1, size: 100 })
      rejections.value = res.items
    } finally {
      rejectionLoading.value = false
    }
  }

  function formatDateTime(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN', { hour12: false })
  }
</script>
