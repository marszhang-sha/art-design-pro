<template>
  <!-- UI-MD-002 工作日历（/md/work-calendar）：BR-MD-009 口径出参，WeekEndFlag 不出契约。 -->
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
  import { mdRegistryApi, type MdWorkCalendarRow } from '@/api/md'

  const showSearchBar = ref(true)

  defineOptions({ name: 'MdWorkCalendar' })

  const SIZE = 20

  function boolFormatter(v: boolean | null): string {
    return v ? '是' : '否' // NULL 视为否（LDM §6-6）
  }

  const searchForm = ref<{ range?: [string, string] }>({})
  const searchItems = [
    {
      label: '日期',
      key: 'range',
      type: 'daterange',
      props: { valueFormat: 'YYYY-MM-DD', startPlaceholder: '开始', endPlaceholder: '结束' }
    }
  ]

  function pick(params: Record<string, unknown>, keys: string[]): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const k of keys) {
      if (params[k] !== undefined) out[k] = params[k]
    }
    return out
  }

  function fetchCalendar(params: Record<string, unknown>) {
    const range = params.range as [string, string] | undefined
    const clean: Record<string, unknown> = {}
    if (range?.[0]) clean.dateFrom = range[0]
    if (range?.[1]) clean.dateTo = range[1]
    return mdRegistryApi
      .calendar({ page: 1, size: SIZE, ...clean, ...pick(params, ['page', 'size']) })
      .then(toPaginated)
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
      apiFn: fetchCalendar,
      apiParams: { page: 1, size: SIZE },
      paginationKey: { current: 'page', size: 'size' },
      columnsFactory: () => [
        { prop: 'theDate', label: '日期', width: 110 },
        { prop: 'weekDay', label: '星期', width: 90 },
        {
          prop: 'isHoliday',
          label: '休息日',
          width: 90,
          formatter: (row: MdWorkCalendarRow) =>
            h(ElTag, { type: row.isHoliday ? 'danger' : 'success', size: 'small' }, () =>
              row.isHoliday ? '休' : '班'
            )
        },
        {
          prop: 'isMonthlyReportDate',
          label: '月报日',
          width: 90,
          formatter: (r: MdWorkCalendarRow) => boolFormatter(r.isMonthlyReportDate)
        },
        {
          prop: 'isSalesAppealDate',
          label: '申诉日',
          width: 90,
          formatter: (r: MdWorkCalendarRow) => boolFormatter(r.isSalesAppealDate)
        },
        {
          prop: 'monthWorkDay',
          label: '月内工作日',
          width: 110,
          formatter: (r: MdWorkCalendarRow) => r.monthWorkDay ?? '—'
        },
        {
          prop: 'quarterWorkDay',
          label: '季内工作日',
          width: 110,
          formatter: (r: MdWorkCalendarRow) => r.quarterWorkDay ?? '—'
        },
        {
          prop: 'monthEnd',
          label: '月末',
          width: 80,
          formatter: (r: MdWorkCalendarRow) => boolFormatter(r.monthEnd)
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
