<template>
  <!-- UI-MD-005 辖区组织（/md/territories）：月快照（YYYYMM+TerrCode）；缺省=最新已同步月份（BR-MD-010）。
       T29 demo：动态查询条件——条件池由列 search 元数据派生，用户自由增删（仅本页，其余页不切换）。
       树表：整月全量一次取全（单月约 27 行小表，不分页），客户端按 upperTerrCode 构树按层级展示。 -->
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
      <!-- 树表：全量小表不分页（frontend.md §3.3）；row-key/tree-props/default-expand-all 透传 ArtTable（§6） -->
      <ArtTable
        :loading="loading"
        :data="treeData"
        :columns="columns"
        row-key="terrCode"
        :tree-props="{ children: 'children' }"
        default-expand-all
        :empty-text="months.length ? '当前月份暂无辖区数据' : '暂无数据（等待同步）'"
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

  /** 整月全量加载（frontend.md §3.3 全量小表不分页）：单月约 27 行，size 取大值一次取全 */
  const FULL_MONTH_SIZE = 100 // BE 分页上限 le=100（契约 §2）；单月约 27 行，一页即全量
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
    getData,
    replaceSearchParams
  } = useTable({
    core: {
      apiFn: fetchTerritories,
      apiParams: { page: 1, size: FULL_MONTH_SIZE },
      paginationKey: { current: 'page', size: 'size' },
      columnsFactory: () => columnsMeta
    }
  })

  // ── 树构建（客户端）：terrCode 建索引，children 由 upperTerrCode 指向父行；
  //    根＝上码为空串／上码在本月行集缺失／祖先链成环（含自指）。月份切换重查后 records 变化即重建。 ──

  /** 树节点：保留原行字段，另挂 children 数组 */
  interface TerritoryTreeNode extends MdTerritoryRow {
    children?: TerritoryTreeNode[]
  }

  function buildTerritoryTree(rows: MdTerritoryRow[]): TerritoryTreeNode[] {
    const byCode = new Map<string, TerritoryTreeNode>()
    const duplicated: TerritoryTreeNode[] = []
    for (const row of rows) {
      const node: TerritoryTreeNode = { ...row, children: [] }
      // 同月同码脏数据（契约上月快照键=YYYYMM+TerrCode，不应出现）：首行入索引，重复行不丢弃——直接作根展示
      if (byCode.has(row.terrCode)) duplicated.push(node)
      else byCode.set(row.terrCode, node)
    }

    /** 沿上码链查脏环（visited 防死循环）；触达空上码/缺失父即链终止＝无环 */
    const isCyclic = (node: TerritoryTreeNode): boolean => {
      const visited = new Set<string>()
      let current: TerritoryTreeNode | undefined = node
      while (current) {
        if (visited.has(current.terrCode)) return true
        visited.add(current.terrCode)
        current = current.upperTerrCode ? byCode.get(current.upperTerrCode) : undefined
      }
      return false
    }

    const roots: TerritoryTreeNode[] = []
    for (const node of byCode.values()) {
      const parent = node.upperTerrCode ? byCode.get(node.upperTerrCode) : undefined
      if (parent && !isCyclic(node)) {
        parent.children ??= []
        parent.children.push(node)
      } else {
        roots.push(node)
      }
    }

    // 叶子行移除空 children（ElTable 以 children 存在性渲染展开箭头）
    for (const node of byCode.values()) {
      if (node.children && node.children.length === 0) delete node.children
    }
    return [...roots, ...duplicated]
  }

  const treeData = computed<TerritoryTreeNode[]>(() => buildTerritoryTree(records.value))

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
