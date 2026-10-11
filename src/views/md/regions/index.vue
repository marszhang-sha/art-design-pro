<template>
  <!-- UI-MD-004 行政区划（/md/regions）：三级合并单表镜像；服务器端分页（契约 §3.2 r2）。 -->
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
  import { ref } from 'vue'
  import { useTable } from '@/hooks/core/useTable'
  import { toPaginated } from '@/views/iam/table'
  import { mdRegistryApi, type MdRegionRow } from '@/api/md'

  const showSearchBar = ref(true)

  defineOptions({ name: 'MdRegions' })

  const SIZE = 20

  const searchForm = ref<{ level?: 'PROVINCE' | 'CITY' | 'COUNTY'; name?: string }>({})
  const searchItems = [
    {
      label: '名称',
      key: 'name',
      type: 'input',
      props: { placeholder: '名称模糊查询', clearable: true }
    },
    {
      label: '级别',
      key: 'level',
      type: 'select',
      props: {
        placeholder: '全部',
        clearable: true,
        options: [
          { label: '省', value: 'PROVINCE' },
          { label: '市', value: 'CITY' },
          { label: '区县', value: 'COUNTY' }
        ]
      }
    }
  ]

  function fetchRegions(params: Record<string, unknown>) {
    const clean: Record<string, unknown> = {}
    if (params.level) clean.level = params.level
    if (params.name) clean.name = params.name
    if (params.page !== undefined) clean.page = params.page
    if (params.size !== undefined) clean.size = params.size
    return mdRegistryApi.regions(clean).then(toPaginated)
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
      apiFn: fetchRegions,
      apiParams: { page: 1, size: SIZE },
      paginationKey: { current: 'page', size: 'size' },
      columnsFactory: () => [
        { prop: 'code', label: '编码', width: 120 },
        { prop: 'name', label: '名称', minWidth: 160 },
        {
          prop: 'level',
          label: '级别',
          width: 100,
          formatter: (r: MdRegionRow) =>
            r.level === 'PROVINCE' ? '省' : r.level === 'CITY' ? '市' : '区县'
        },
        { prop: 'parentCode', label: '上级编码', width: 120 },
        { prop: 'provinceAbbr', label: '省简称', width: 100 }
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
