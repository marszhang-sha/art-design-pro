<template>
  <CsoPage title="合作意向池">
    <ElResult v-if="!internal" icon="warning" title="当前身份无权查看合作意向池" />
    <template v-else>
      <ArtSearchBar
        v-show="showSearchBar"
        :model-value="filters"
        @update:model-value="Object.assign(filters, $event)"
        :items="searchItems"
        :is-expand="true"
        :show-expand="false"
        :span="6"
        @search="applyFilters"
        @reset="resetFilters"
      />
      <div class="cso-card cso-list-card cso-intentions-table">
        <ArtTableHeader
          v-model:columns="columnChecks"
          v-model:show-search-bar="showSearchBar"
          :loading="loading"
          full-class="cso-intentions-table"
          @refresh="refreshData"
        >
          <template #left
            ><ElSpace wrap
              ><ElButton type="primary" @click="router.push('/cso/questionnaire')"
                >填写合作意向</ElButton
              >
              <ElButton
                type="primary"
                plain
                :disabled="!selectedRecords.length"
                :loading="exporting"
                @click="exportSelected"
                >导出 Excel</ElButton
              >
              <ElButton
                type="danger"
                plain
                :disabled="!selectedRecords.length"
                :loading="deleting"
                @click="deleteSelected"
                >删除</ElButton
              ></ElSpace
            ></template
          >
          <template #right
            ><span class="cso-list-count"
              >共 {{ pagination.total }} 条 · 已选 {{ selectedRecords.length }} 条</span
            ></template
          >
        </ArtTableHeader>
        <ArtTable
          ref="tableRef"
          @selection-change="handleSelection"
          :data="rows"
          :columns="columns"
          row-key="id"
          :show-table-header="true"
          :loading="loading"
          height="auto"
          empty-text="暂无匹配的合作意向"
          style="min-height: 300px"
          :pagination="pagination"
          @pagination:size-change="handleSizeChange"
          @pagination:current-change="handleCurrentChange"
        >
          <template #name="{ row }"
            ><ElButton
              class="company-link"
              link
              type="primary"
              :title="row.name"
              @click="open(row.id)"
              >{{ row.name }}</ElButton
            ></template
          >
          <template #scale="{ row }">{{ row.questionnaire?.answers.companyScale || '—' }}</template>
          <template #area="{ row }"
            ><span class="cell-wrap">{{
              row.questionnaire?.answers.cooperationRegion || row.province + ' / ' + row.city
            }}</span></template
          >
          <template #resources="{ row }"
            ><template v-if="row.questionnaire"
              ><span
                >自营 {{ row.questionnaire.answers.directTeam || '—' }}人 / 招商
                {{ row.questionnaire.answers.recruitmentTeam || '—' }}人</span
              ></template
            ><span v-else>—</span></template
          >
          <template #hospitalCount="{ row }">{{
            row.questionnaire?.answers.hospitalCount || '—'
          }}</template>
          <template #result="{ row }"
            ><ElTag
              :type="
                row.result === '合作' ? 'success' : row.result === '不合作' ? 'info' : 'warning'
              "
              >{{ row.result === '待洽谈' ? '待约谈' : row.result }}</ElTag
            ></template
          >
          <template #operation="{ row }"
            ><ElButton link type="primary" @click="open(row.id)">查看详情</ElButton></template
          >
        </ArtTable>
      </div>
    </template>
  </CsoPage>
</template>
<script setup lang="ts">
  import { computed, onMounted, reactive, ref, watch } from 'vue'
  import { ElMessage, ElMessageBox, type TableInstance } from 'element-plus'
  import { useRouter } from 'vue-router'
  import ArtTable from '@/components/core/tables/art-table/index.vue'
  import type { ColumnOption } from '@/types'
  import CsoPage from '../components/CsoPage.vue'
  import { openCsoDetail } from '../detail-panel'
  import { useCsoStore } from '../store'
  import { type Intention, type SurveyAnswers } from '../domain'
  import {
    COOP_RESULT_LABEL,
    coopIntentionApi,
    type CoopIntentionListItem,
    type CoopResult
  } from '@/api/coop'
  import '../shared-proto.scss'
  import ArtSearchBar from '@/components/core/forms/art-search-bar/index.vue'
  import ArtTableHeader from '@/components/core/tables/art-table-header/index.vue'
  import { useTableColumns } from '@/hooks/core/useTableColumns'
  defineOptions({ name: 'CsoIntentions' })
  const router = useRouter()
  const { identity } = useCsoStore()
  const tableRef = ref<{ elTableRef?: TableInstance }>()
  const selectedIds = ref<string[]>([])
  const exporting = ref(false)
  const deleting = ref(false)
  const internal = computed(() => !!identity.value && identity.value.role !== 'agent')
  const filters = reactive({ keyword: '', province: '', city: '', scale: '', status: '' })
  const applied = reactive({ keyword: '', province: '', city: '', scale: '', status: '' })
  const statuses: { label: string; value: CoopResult }[] = [
    { label: '待约谈', value: 'PENDING' },
    { label: '合作', value: 'COOPERATED' },
    { label: '不合作', value: 'REJECTED' }
  ]
  const RESULT_BY_LABEL: Record<string, CoopResult> = {
    待洽谈: 'PENDING',
    合作: 'COOPERATED',
    不合作: 'REJECTED'
  }
  const rows = ref<Intention[]>([])
  const loading = ref(false)
  const pagination = reactive({ current: 1, size: 20, total: 0, pageSizes: [20, 50, 100] })

  /** BE 列表行 → 页面 Intention 形状（列表列与导出所需字段） */
  function toRow(item: CoopIntentionListItem): Intention {
    return {
      id: item.id,
      name: item.company,
      contact: item.principal,
      phone: item.phone,
      province: item.province,
      city: item.city ?? '',
      product: '希维她',
      remark: '',
      result: COOP_RESULT_LABEL[item.result] as Intention['result'],
      notes: [],
      partnerId: '',
      surveyCode: item.surveyCode,
      questionnaire: {
        version: item.surveyCode,
        submittedAt: item.createdAt ?? '',
        answers: {
          companyScale: item.companyScale,
          cooperationRegion: item.cooperationRegion,
          directTeam: item.directTeam != null ? String(item.directTeam) : '',
          recruitmentTeam: item.recruitmentTeam != null ? String(item.recruitmentTeam) : '',
          hospitalCount: item.hospitalCount != null ? String(item.hospitalCount) : ''
        } as SurveyAnswers
      }
    }
  }
  async function fetchData() {
    if (!internal.value) return
    loading.value = true
    try {
      const page = await coopIntentionApi.list({
        page: pagination.current,
        size: pagination.size,
        keyword: applied.keyword.trim() || undefined,
        province: applied.province || undefined,
        city: applied.city || undefined,
        companyScale: applied.scale || undefined,
        result: applied.status ? RESULT_BY_LABEL[applied.status] : undefined
      })
      rows.value = page.items.map(toRow)
      pagination.total = page.total
    } finally {
      loading.value = false
    }
  }
  const scales = computed(() => [
    ...new Set(rows.value.map((item) => item.questionnaire?.answers.companyScale).filter(Boolean))
  ])
  const provinces = computed(() => [...new Set(rows.value.map((item) => item.province))])
  const cities = computed(() => [
    ...new Set(
      rows.value
        .filter((item) => !filters.province || item.province === filters.province)
        .map((item) => item.city)
        .filter(Boolean)
    )
  ])
  watch(
    () => filters.province,
    () => {
      filters.city = ''
    },
    { flush: 'sync' }
  )
  function applyFilters() {
    Object.assign(applied, {
      keyword: filters.keyword || '',
      province: filters.province || '',
      city: filters.city || '',
      scale: filters.scale || '',
      status: filters.status || ''
    })
    pagination.current = 1
    fetchData()
  }
  function resetFilters() {
    Object.assign(filters, { keyword: '', province: '', city: '', scale: '', status: '' })
    applyFilters()
  }
  const searchItems = computed(() => [
    {
      key: 'keyword',
      label: '关键词',
      type: 'input',
      props: { clearable: true, placeholder: '公司、负责人、联系方式' }
    },
    {
      key: 'province',
      label: '省份',
      type: 'select',
      props: {
        clearable: true,
        filterable: true,
        placeholder: '全部省份',
        options: provinces.value.map((value) => ({ label: value, value }))
      }
    },
    {
      key: 'city',
      label: '城市',
      type: 'select',
      props: {
        clearable: true,
        filterable: true,
        placeholder: '全部城市',
        options: cities.value.map((value) => ({ label: value, value }))
      }
    },
    {
      key: 'scale',
      label: '公司规模',
      type: 'select',
      props: {
        clearable: true,
        filterable: true,
        placeholder: '全部公司规模',
        options: scales.value.map((value) => ({ label: value, value }))
      }
    },
    {
      key: 'status',
      label: '合作结果',
      type: 'select',
      props: {
        clearable: true,
        filterable: true,
        placeholder: '全部合作结果',
        options: statuses
      }
    }
  ])
  const baseColumns: ColumnOption[] = [
    { type: 'selection', width: 48, fixed: 'left' },
    { type: 'index', label: '序号', width: 62, align: 'center', fixed: 'left' },
    { prop: 'name', label: '代理商公司', minWidth: 220, useSlot: true, showOverflowTooltip: true },
    { prop: 'province', label: '省份', minWidth: 110, showOverflowTooltip: true },
    { prop: 'city', label: '城市', minWidth: 120, showOverflowTooltip: true },
    { prop: 'contact', label: '负责人', minWidth: 120, showOverflowTooltip: true },
    { prop: 'phone', label: '联系方式', minWidth: 175, showOverflowTooltip: true },
    { prop: 'scale', label: '公司规模', minWidth: 150, useSlot: true, showOverflowTooltip: true },
    {
      prop: 'area',
      label: '意向合作区域',
      minWidth: 220,
      useSlot: true,
      showOverflowTooltip: true
    },
    {
      prop: 'resources',
      label: '团队',
      minWidth: 180,
      useSlot: true,
      showOverflowTooltip: true
    },
    { prop: 'hospitalCount', label: '已开发医院数', width: 145, align: 'center', useSlot: true },
    { prop: 'result', label: '合作结果', width: 100, fixed: 'right', useSlot: true },
    { prop: 'operation', label: '操作', align: 'center', width: 90, fixed: 'right', useSlot: true }
  ]
  baseColumns.forEach((column: ColumnOption) => {
    column.headerAlign = 'center'
  })
  const { columns, columnChecks } = useTableColumns(() =>
    baseColumns.map((c) => ({ ...c, disabled: !!c.fixed }))
  )
  const showSearchBar = ref(true)
  function refreshData() {
    clearSelection()
    fetchData()
  }
  function handleSizeChange(size: number) {
    pagination.size = size
    pagination.current = 1
    clearSelection()
    fetchData()
  }
  function handleCurrentChange(page: number) {
    pagination.current = page
    clearSelection()
    fetchData()
  }
  const open = (id: string) => openCsoDetail('intentions', id)
  const selectedRecords = computed(() =>
    rows.value.filter((item) => selectedIds.value.includes(item.id))
  )
  function handleSelection(records: Intention[]) {
    selectedIds.value = records.map((item) => item.id)
  }
  function clearSelection() {
    selectedIds.value = []
    tableRef.value?.elTableRef?.clearSelection()
  }
  watch(() => rows.value.map((item) => item.id).join('|'), clearSelection)
  onMounted(fetchData)
  async function exportSelected() {
    const records = selectedRecords.value.slice()
    if (!records.length || exporting.value) return
    exporting.value = true
    try {
      const { exportIntentionDetails } = await import('./export')
      exportIntentionDetails(
        records.map((item) => ({
          ...item,
          sequence: rows.value.findIndex((row) => row.id === item.id) + 1
        })),
        columns.value
          .filter(
            (column: ColumnOption) =>
              column.type === 'index' ||
              (!!column.prop && column.prop !== 'operation' && !column.type)
          )
          .map((column: ColumnOption) => ({
            prop: column.type === 'index' ? 'sequence' : String(column.prop),
            label: String(column.label)
          }))
      )
      ElMessage.success('Excel已生成')
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : '导出失败，请重试')
    } finally {
      exporting.value = false
    }
  }
  async function deleteSelected() {
    const records = selectedRecords.value.slice()
    if (!records.length || deleting.value) return
    deleting.value = true
    try {
      await ElMessageBox.confirm(
        '确定删除选中的 ' +
          records.length +
          ' 条合作意向？关联的代理商档案、合同和保证金记录不受影响。',
        '删除合作意向',
        { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
      )
      for (const record of records) await coopIntentionApi.remove(record.id)
      ElMessage.success('所选意向已删除')
      clearSelection()
      fetchData()
    } catch {
      /* 取消或失败保留原状；失败提示由 http 层统一弹出 */
    } finally {
      deleting.value = false
    }
  }
</script>
<style scoped>
  .intention-filter,
  .intention-list {
    margin-bottom: 16px;
    border-color: var(--art-card-border);
    border-radius: 8px;
  }

  .filter-fields {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }

  .filter-fields > .el-input {
    flex: 1;
    min-width: 220px;
  }

  .filter-fields > .el-select {
    width: 160px;
  }

  .list-heading {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
  }

  .list-heading h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 600;
  }

  .list-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
  }

  .list-actions > span {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  .list-actions .el-button + .el-button {
    margin-left: 0;
  }

  .list-actions :deep(.art-svg-icon) {
    margin-right: 6px;
  }

  .list-heading > span {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .company-link {
    max-width: 100%;
  }

  .company-link :deep(span),
  .intention-list :deep(.el-table .cell),
  .cell-wrap {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .cso-actions :deep(.art-svg-icon) {
    margin-right: 8px;
  }

  @media (width <= 700px) {
    .filter-fields > .el-select {
      flex: 1;
      min-width: 130px;
    }
  }
</style>
