<template>
  <!-- UI-MD-005 辖区组织（/md/territories）：月快照（YYYYMM+TerrCode）；缺省=最新已同步月份（BR-MD-010）。 -->
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
        :empty-text="months.length ? '该月无匹配数据' : '暂无数据（等待同步）'"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { computed, h, onMounted, ref } from 'vue'
  import { ElTag } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { toPaginated } from '@/views/iam/table'
  import { mdBuApi, mdRegistryApi, type MdTerritoryRow } from '@/api/md'

  const showSearchBar = ref(true)

  defineOptions({ name: 'MdTerritories' })

  const SIZE = 20

  const months = ref<string[]>([])
  const bus = ref<{ id: string; code: string; name: string }[]>([])
  const searchForm = ref<{ yyyymm?: string; level?: string; buCode?: string; staffCode?: string }>(
    {}
  )

  const searchItems = computed(() => [
    {
      label: '月份',
      key: 'yyyymm',
      type: 'select',
      props: { options: months.value.map((m) => ({ label: m, value: m })) }
    },
    {
      label: '层级',
      key: 'level',
      type: 'select',
      props: {
        placeholder: '全部',
        clearable: true,
        options: ['2-SD', '3-RM', '4-DM'].map((l) => ({ label: l, value: l }))
      }
    },
    {
      label: 'BU',
      key: 'buCode',
      type: 'select',
      props: {
        placeholder: '全部',
        clearable: true,
        options: bus.value.map((b) => ({ label: b.name, value: b.code }))
      }
    },
    {
      label: '主管编码',
      key: 'staffCode',
      type: 'input',
      props: { placeholder: '如 A0946', clearable: true }
    }
  ])

  function fetchTerritories(params: Record<string, unknown>) {
    const yyyymm = (params.yyyymm as string) || months.value[0] || undefined
    const clean: Record<string, unknown> = { yyyymm, sortBy: 'terrCode', sortOrder: 'asc' }
    if (params.level) clean.level = params.level
    if (params.buCode) clean.buCode = params.buCode
    if (params.staffCode) clean.staffCode = params.staffCode
    if (params.page !== undefined) clean.page = params.page
    if (params.size !== undefined) clean.size = params.size
    return mdRegistryApi.territories(clean).then(toPaginated)
  }

  const {
    columns,
    columnChecks,
    data: records,
    loading,
    pagination,
    getData,
    replaceSearchParams,
    handleSizeChange,
    handleCurrentChange
  } = useTable({
    core: {
      apiFn: fetchTerritories,
      apiParams: { page: 1, size: SIZE },
      paginationKey: { current: 'page', size: 'size' },
      columnsFactory: () => [
        { prop: 'yyyymm', label: '月份', width: 90 },
        { prop: 'terrCode', label: '辖区编码', width: 170 },
        { prop: 'terrName', label: '辖区名称', minWidth: 180, showOverflowTooltip: true },
        { prop: 'terrLevel', label: '层级', width: 90 },
        {
          prop: 'staff',
          label: '主管',
          width: 140,
          formatter: (r: MdTerritoryRow) =>
            r.staffCode ? `${r.staffCode} ${r.staffName ?? ''}` : '—'
        },
        { prop: 'upperTerrCode', label: '上级辖区', width: 170 },
        { prop: 'buCode', label: 'BU', width: 80 },
        {
          prop: 'status',
          label: '状态',
          width: 80,
          formatter: (r: MdTerritoryRow) =>
            h(ElTag, { type: r.status === 'ACTIVE' ? 'success' : 'info', size: 'small' }, () =>
              r.status === 'ACTIVE' ? '可用' : '停用'
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
    searchForm.value = { yyyymm: months.value[0] }
    replaceSearchParams({ ...searchForm.value })
    getData()
  }

  onMounted(async () => {
    try {
      months.value = (await mdRegistryApi.territoryMonths()).months
      if (months.value.length && !searchForm.value.yyyymm) {
        searchForm.value.yyyymm = months.value[0] // 缺省=最新已同步月份（BR-MD-010）
        replaceSearchParams({ ...searchForm.value })
      }
    } catch {
      months.value = [] // 404 MD-4004：暂无已同步月份
    }
    mdBuApi.list().then((rows) => (bus.value = rows))
  })
</script>
