<template>
  <!-- UI-MD-003 药店医院（/md/drug-stores）：INSCode 唯一；Attr1=业态（G-MD-8）；Status 随 MDM。 -->
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
        empty-text="暂无数据（等待同步）"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { h, ref } from 'vue'
  import { ElTag } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import { toPaginated } from '@/views/iam/table'
  import { mdRegistryApi, type MdDrugStoreRow } from '@/api/md'

  const showSearchBar = ref(true)

  defineOptions({ name: 'MdDrugStores' })

  const SIZE = 20
  const ATTR1_OPTIONS = ['医院', '药店', '商业'] // G-MD-8（数据现值：医院/药店）

  const searchForm = ref<{
    keyword?: string
    instType?: 'HP' | 'DS'
    attr1?: string
    status?: 'ACTIVE' | 'INACTIVE'
  }>({})
  const searchItems = [
    {
      label: '关键词',
      key: 'keyword',
      type: 'input',
      props: { placeholder: '编码 / 名称', clearable: true }
    },
    {
      label: '业态',
      key: 'instType',
      type: 'select',
      props: {
        placeholder: '全部',
        clearable: true,
        options: [
          { label: '医疗卫生机构', value: 'HP' },
          { label: '门店', value: 'DS' }
        ]
      }
    },
    {
      label: 'Attr1',
      key: 'attr1',
      type: 'select',
      props: {
        placeholder: '全部',
        clearable: true,
        options: ATTR1_OPTIONS.map((a) => ({ label: a, value: a }))
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
          { label: '可用', value: 'ACTIVE' },
          { label: '停用', value: 'INACTIVE' }
        ]
      }
    }
  ]

  function pick(params: Record<string, unknown>, keys: string[]): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const k of keys) {
      if (params[k] !== undefined) out[k] = params[k]
    }
    return out
  }

  function fetchStores(params: Record<string, unknown>) {
    return mdRegistryApi
      .drugStores({
        page: 1,
        size: SIZE,
        sortBy: 'insCode',
        sortOrder: 'asc',
        ...dropEmpty(params),
        ...pick(params, ['page', 'size'])
      })
      .then(toPaginated)
  }

  function dropEmpty(params: Record<string, unknown>): Record<string, unknown> {
    const clean: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(params)) {
      if (v !== '' && v !== undefined && v !== null) clean[k] = v
    }
    return clean
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
      apiFn: fetchStores,
      apiParams: { page: 1, size: SIZE },
      paginationKey: { current: 'page', size: 'size' },
      columnsFactory: () => [
        { prop: 'insCode', label: '编码', width: 120 },
        { prop: 'insName', label: '名称', minWidth: 220, showOverflowTooltip: true },
        { prop: 'instTypeName', label: '业态类型', width: 120 },
        { prop: 'attr1', label: '业态', width: 90 },
        {
          prop: 'region',
          label: '省市区',
          minWidth: 180,
          showOverflowTooltip: true,
          formatter: (r: MdDrugStoreRow) => `${r.provinceName} ${r.cityName} ${r.countyName}`
        },
        {
          prop: 'status',
          label: '状态',
          width: 80,
          formatter: (r: MdDrugStoreRow) =>
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
    searchForm.value = {}
    resetSearchParams()
    getData()
  }
</script>
