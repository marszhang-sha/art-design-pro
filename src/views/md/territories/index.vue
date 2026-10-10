<template>
  <!-- UI-MD-005 辖区组织（/md/territories）：月快照（YYYYMM+TerrCode）；缺省=最新已同步月份（BR-MD-010）。
       T29 demo：动态查询条件——条件池由列 search 元数据派生，用户自由增删（仅本页，其余页不切换）。 -->
  <div class="art-full-height">
    <ArtDynamicSearchBar
      v-show="showSearchBar"
      v-model:form="searchForm"
      v-model:selected="selectedKeys"
      :conditions="conditions"
      :loading="loading"
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
  import type { ColumnOption } from '@/types/component'
  import ArtDynamicSearchBar from '@/components/core/forms/art-dynamic-search-bar/index.vue'
  import type { DynamicCondition } from '@/components/core/forms/art-dynamic-search-bar/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import { toPaginated } from '@/views/iam/table'
  import { mdBuApi, mdRegistryApi, type MdTerritoryRow } from '@/api/md'

  defineOptions({ name: 'MdTerritories' })

  const showSearchBar = ref(true)

  const SIZE = 20
  const LEVEL_OPTIONS = ['2-SD', '3-RM', '4-DM']

  const months = ref<string[]>([])
  const bus = ref<{ id: string; code: string; name: string }[]>([])
  const searchForm = ref<{ yyyymm?: string; level?: string; buCode?: string; staffCode?: string }>(
    {}
  )

  // ── 列定义（search 元数据：param=筛选参数别名；props 支持函数取响应式选项）──
  // 主管列（组合展示 staff）筛选参数为 staffCode；层级列 prop=terrLevel 筛选参数为 level。

  const columnsMeta: ColumnOption<MdTerritoryRow>[] = [
    {
      prop: 'yyyymm',
      label: '月份',
      width: 90,
      search: {
        type: 'select',
        param: 'yyyymm',
        label: '月份',
        default: true,
        props: () => ({ options: months.value.map((m) => ({ label: m, value: m })) })
      }
    },
    {
      prop: 'terrCode',
      label: '辖区编码',
      width: 170,
      search: { type: 'input', param: 'terrCode', label: '辖区编码' }
    },
    {
      prop: 'terrName',
      label: '辖区名称',
      minWidth: 180,
      showOverflowTooltip: true,
      search: { type: 'input', param: 'terrName', label: '辖区名称' }
    },
    {
      prop: 'terrLevel',
      label: '层级',
      width: 90,
      search: {
        type: 'select',
        param: 'level',
        label: '层级',
        props: () => ({ options: LEVEL_OPTIONS.map((l) => ({ label: l, value: l })) })
      }
    },
    {
      prop: 'staff',
      label: '主管',
      width: 140,
      search: { type: 'input', param: 'staffCode', label: '主管编码' },
      formatter: (r: MdTerritoryRow) => (r.staffCode ? `${r.staffCode} ${r.staffName ?? ''}` : '—')
    },
    {
      prop: 'upperTerrCode',
      label: '上级辖区',
      width: 170,
      search: { type: 'input', param: 'upperTerrCode', label: '上级辖区' }
    },
    {
      prop: 'buCode',
      label: 'BU',
      width: 80,
      search: {
        type: 'select',
        param: 'buCode',
        label: 'BU',
        props: () => ({ options: bus.value.map((b) => ({ label: b.name, value: b.code })) })
      }
    },
    {
      prop: 'status',
      label: '状态',
      width: 80,
      search: {
        type: 'select',
        param: 'status',
        label: '状态',
        props: () => ({
          options: [
            { label: '可用', value: 'ACTIVE' },
            { label: '停用', value: 'INACTIVE' }
          ]
        })
      },
      formatter: (r: MdTerritoryRow) =>
        h(ElTag, { type: r.status === 'ACTIVE' ? 'success' : 'info', size: 'small' }, () =>
          r.status === 'ACTIVE' ? '可用' : '停用'
        )
    }
  ]

  // ── 动态条件池：由列 search 元数据派生（列驱动，T29）──

  const conditions = computed<DynamicCondition[]>(() =>
    columnsMeta
      .filter((c) => c.search)
      .map((c) => {
        const meta = c.search!
        return {
          key: meta.param ?? c.prop ?? '',
          label: meta.label ?? c.label ?? '',
          type: meta.type,
          props: typeof meta.props === 'function' ? meta.props() : meta.props,
          default: meta.default
        }
      })
  )

  const defaultKeys = columnsMeta
    .filter((c) => c.search?.default)
    .map((c) => c.search!.param ?? c.prop!) as string[]

  const selectedKeys = ref<string[]>([...defaultKeys])

  function dropEmpty(params: Record<string, unknown>): Record<string, unknown> {
    const clean: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(params)) {
      if (v !== '' && v !== undefined && v !== null) clean[k] = v
    }
    return clean
  }

  function fetchTerritories(params: Record<string, unknown>) {
    const yyyymm = (params.yyyymm as string) || months.value[0] || undefined
    const clean: Record<string, unknown> = { yyyymm, sortBy: 'terrCode', sortOrder: 'asc' }
    if (params.level) clean.level = params.level
    if (params.buCode) clean.buCode = params.buCode
    if (params.staffCode) clean.staffCode = params.staffCode
    if (params.terrName) clean.terrName = params.terrName
    if (params.terrCode) clean.terrCode = params.terrCode
    if (params.upperTerrCode) clean.upperTerrCode = params.upperTerrCode
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
      columnsFactory: () => columnsMeta
    }
  })

  function handleSearch() {
    replaceSearchParams(dropEmpty({ ...searchForm.value }))
    getData()
  }

  /** 重置＝恢复默认条件集＋清空取值＋默认月份（BR-MD-010） */
  function handleReset() {
    searchForm.value = { yyyymm: months.value[0] }
    replaceSearchParams(dropEmpty({ ...searchForm.value }))
    getData()
  }

  onMounted(async () => {
    try {
      months.value = (await mdRegistryApi.territoryMonths()).months
      if (months.value.length && !searchForm.value.yyyymm) {
        searchForm.value.yyyymm = months.value[0] // 缺省=最新已同步月份（BR-MD-010）
        replaceSearchParams(dropEmpty({ ...searchForm.value }))
      }
    } catch {
      months.value = [] // 404 MD-4004：暂无已同步月份
    }
    mdBuApi.list().then((rows) => (bus.value = rows))
  })
</script>
