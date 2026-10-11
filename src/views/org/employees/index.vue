<template>
  <div class="art-full-height">
    <ArtSearchBar
      v-model="searchForm"
      :items="formItems"
      @search="handleSearch"
      @reset="handleReset"
    >
      <!-- 组织树筛选：整树可选（含停用/代理商节点，便于排查存量挂靠） -->
      <template #orgNodeId="{ modelValue }">
        <ElTreeSelect
          v-model="modelValue.orgNodeId"
          :data="orgTreeData"
          node-key="id"
          check-strictly
          clearable
          filterable
          :props="{ label: 'name', children: 'children' }"
          placeholder="全部组织"
          class="w-full"
        />
      </template>
    </ArtSearchBar>

    <ElCard class="art-table-card" :style="{ 'margin-top': showSearchBar ? '12px' : '0' }">
      <ArtTableHeader
        v-model:columns="columnChecks"
        v-model:showSearchBar="showSearchBar"
        :loading="loading"
        @refresh="refreshData"
      >
        <template #left>
          <ElSpace wrap>
            <ElButton v-auth="'system:employee:create'" type="primary" @click="openCreate">
              新建员工
            </ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        empty-text="暂无员工"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
        @sort-change="handleSortChange"
      >
      </ArtTable>
    </ElCard>

    <!-- 离职结果：同事务联动停用账号（EMP-01），展示 cascadedAccounts -->
    <ElDialog v-model="cascadedVisible" title="离职完成——联动账号" width="440px">
      <template v-if="cascadedAccounts.length">
        <p class="mb-2">以下关联平台账号已在同一事务中停用：</p>
        <ElTable :data="cascadedAccounts" size="small" border>
          <ElTableColumn prop="id" label="账号ID" />
          <ElTableColumn label="状态">
            <template #default="{ row }: { row: { id: number; status: string } }">
              <ElTag type="danger">{{ row.status }}</ElTag>
            </template>
          </ElTableColumn>
        </ElTable>
      </template>
      <p v-else class="text-gray-500">该员工无关联平台账号。</p>
      <template #footer>
        <ElButton type="primary" @click="cascadedVisible = false">知道了</ElButton>
      </template>
    </ElDialog>

    <!-- 新建/编辑 Drawer -->
    <ElDrawer v-model="drawerVisible" :title="drawerTitle" size="440px">
      <ElForm ref="formRef" :model="form" :rules="formRules" label-width="90px">
        <ElFormItem label="员工工号" prop="employeeNo">
          <ElInput v-model="form.employeeNo" :disabled="!!editing" placeholder="如 E0001" />
        </ElFormItem>
        <ElFormItem label="姓名" prop="name">
          <ElInput v-model="form.name" />
        </ElFormItem>
        <ElFormItem label="所属组织" prop="orgNodeId">
          <ElTreeSelect
            v-model="form.orgNodeId"
            :data="orgPickTreeData"
            node-key="id"
            check-strictly
            filterable
            :props="{ label: 'name', children: 'children' }"
            placeholder="限药厂/业务实体（EMP-04）"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="扩展属性">
          <ElInput
            v-model="form.attributesText"
            type="textarea"
            :rows="3"
            placeholder='JSON 对象，如 {"key":"value"}；留空不提交'
          />
        </ElFormItem>
        <!-- 转挂预警：账号归属同事务联动变更（ACC-08） -->
        <ElAlert
          v-if="editing && editing.orgNodeId !== form.orgNodeId"
          title="转挂后其关联平台账号归属将在同一事务中联动变更"
          type="warning"
          :closable="false"
          show-icon
        />
      </ElForm>
      <template #footer>
        <ElButton @click="drawerVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="submitForm">保存</ElButton>
      </template>
    </ElDrawer>

    <!-- 岗位分配 Drawer（UI-IAM-015 配套；EMP-05…11；契约 §3.11） -->
    <ElDrawer
      v-model="assignDrawerVisible"
      :title="`岗位分配：${assignEmployee?.name ?? ''}`"
      size="560px"
    >
      <template v-if="assignEmployee">
        <!-- 组织挂靠 vs 主岗部门并列（EMP-09 独立维护，可不一致不告警） -->
        <div class="mb-3 flex items-stretch gap-2">
          <ElCard shadow="never" class="flex-1">
            <div class="text-xs text-gray-400">组织挂靠（orgNodeId）</div>
            <div class="mt-1 text-sm font-medium">
              {{ orgNameMap[assignEmployee.orgNodeId] ?? `#${assignEmployee.orgNodeId}` }}
            </div>
          </ElCard>
          <ElCard shadow="never" class="flex-1">
            <div class="text-xs text-gray-400">
              主岗部门
              <ElTooltip
                v-if="primaryDeptMismatch"
                content="与组织挂靠不一致（EMP-09：两者独立维护、互不强制）"
                placement="top"
              >
                <ElTag size="small" type="warning" class="ml-1">不一致</ElTag>
              </ElTooltip>
            </div>
            <div class="mt-1 text-sm font-medium">
              {{ primaryDeptName ?? (empPositions.length ? '—（零主岗）' : '未分配岗位') }}
            </div>
          </ElCard>
        </div>

        <ElAlert
          v-if="assignEmployee.employmentStatus === 'TERMINATED'"
          title="员工已离职：分配表只读（EMP-10 历史留存）"
          type="info"
          :closable="false"
          show-icon
          class="mb-3"
        />

        <!-- 已岗列表（Drawer 内非主列表：豁免三件套，仍守高度约束） -->
        <ElTable
          :data="empPositions"
          v-loading="assignLoading"
          size="small"
          empty-text="暂无岗位分配"
        >
          <ElTableColumn
            prop="positionCode"
            label="岗位编码"
            min-width="130"
            show-overflow-tooltip
          />
          <ElTableColumn
            prop="positionName"
            label="岗位名称"
            min-width="120"
            show-overflow-tooltip
          />
          <ElTableColumn prop="departmentName" label="部门" min-width="110" show-overflow-tooltip>
            <template #default="{ row }">{{ row.departmentName ?? '—（公司级）' }}</template>
          </ElTableColumn>
          <ElTableColumn label="主岗" width="70">
            <template #default="{ row }">
              <ElTag v-if="row.isPrimary" type="success" size="small">主岗</ElTag>
            </template>
          </ElTableColumn>
          <ElTableColumn label="操作" width="130" fixed="right">
            <template #default="{ row }">
              <ElButton
                link
                type="primary"
                size="small"
                :disabled="readonlyAssign || row.isPrimary"
                @click="onSetPrimary(row)"
              >
                设主岗
              </ElButton>
              <ElButton
                link
                type="danger"
                size="small"
                :disabled="readonlyAssign"
                @click="onRemovePosition(row)"
              >
                解除
              </ElButton>
            </template>
          </ElTableColumn>
        </ElTable>

        <!-- 添加岗位（跨部门 TreeSelect，仅 ACTIVE 岗位） -->
        <div v-if="!readonlyAssign" class="mt-4 flex items-center gap-2">
          <ElTreeSelect
            v-model="assignPositionId"
            :data="assignPickTree"
            node-key="id"
            check-strictly
            filterable
            :props="{ label: 'label', children: 'children' }"
            placeholder="选择岗位（跨部门可选；仅启用岗位）"
            class="flex-1"
          />
          <ElCheckbox v-model="assignAsPrimary">设为主岗</ElCheckbox>
          <ElButton type="primary" :loading="assignSubmitting" @click="onAssignPosition">
            添加
          </ElButton>
        </div>
      </template>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { computed, h, onMounted, ref } from 'vue'
  import { ElMessage, ElMessageBox, ElTag, type FormInstance, type FormRules } from 'element-plus'
  import ArtButtonMore, {
    type ButtonMoreItem
  } from '@/components/core/forms/art-button-more/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import {
    iamEmployeeApi,
    iamOrgApi,
    iamPositionApi,
    type IamEmployee,
    type IamEmployeeListParams,
    type IamEmployeePosition,
    type IamOrgNode,
    type IamPositionNode,
    type IamSortOrder
  } from '@/api/iam'
  import { toPaginated } from '@/views/iam/table'

  defineOptions({ name: 'OrgEmployees' })

  // ---------- 组织树（筛选 + 名称解析 + 挂靠选择器共用一次拉取） ----------

  const orgTreeData = ref<IamOrgNode[]>([])
  /** 挂靠选择器：限 PHARMA/BUSINESS_ENTITY 且 ACTIVE（EMP-04；停用/代理商置灰不可选） */
  const orgPickTreeData = ref<PickNode[]>([])
  /** id → 路径名（如「药厂 / 实体」），表格列展示用 */
  const orgNameMap = ref<Record<number, string>>({})

  interface PickNode {
    id: number
    name: string
    disabled?: boolean
    children?: PickNode[]
  }

  /** CSO_AGENT 整枝剔除（代理商不可挂靠员工）；停用节点保留但置灰（存量可见、新挂靠冻结） */
  function toPickNodes(nodes: IamOrgNode[]): PickNode[] {
    return nodes
      .filter((n) => n.nodeType !== 'CSO_AGENT')
      .map((n) => ({
        id: n.id,
        name: n.name,
        disabled: n.status === 'DISABLED',
        children: n.children?.length ? toPickNodes(n.children) : undefined
      }))
  }

  function flattenOrgNames(nodes: IamOrgNode[], parentPath = '') {
    for (const n of nodes) {
      const path = parentPath ? `${parentPath} / ${n.name}` : n.name
      orgNameMap.value[n.id] = path
      if (n.children?.length) flattenOrgNames(n.children, path)
    }
  }

  async function loadOrgTree() {
    orgTreeData.value = await iamOrgApi.tree()
    orgPickTreeData.value = toPickNodes(orgTreeData.value)
    orgNameMap.value = {}
    flattenOrgNames(orgTreeData.value)
  }

  onMounted(loadOrgTree)

  // ---------- 列表（服务端分页 + 排序） ----------

  interface EmployeeSearchFormParams {
    keyword?: string
    employmentStatus?: 'ACTIVE' | 'TERMINATED'
    orgNodeId?: number
  }

  const searchForm = ref<EmployeeSearchFormParams>({})
  const activeFilters = ref<EmployeeSearchFormParams>({})
  // sortBy 白名单见契约 §3.8（表格 sortable 列均在其内，断言安全）
  const sortBy = ref<IamEmployeeListParams['sortBy']>(undefined)
  const sortOrder = ref<IamSortOrder | undefined>(undefined)
  const showSearchBar = ref(true)

  const statusOptions = [
    { label: '在职', value: 'ACTIVE' },
    { label: '已离职', value: 'TERMINATED' }
  ]

  const formItems = [
    {
      label: '关键词',
      key: 'keyword',
      type: 'input',
      props: { placeholder: '工号/姓名', clearable: true }
    },
    {
      label: '在职状态',
      key: 'employmentStatus',
      type: 'select',
      props: { placeholder: '全部状态', options: statusOptions, clearable: true }
    },
    { label: '所属组织', key: 'orgNodeId' } // 渲染走 #orgNodeId 具名插槽（树选择）
  ]

  /** apiFn 内归一信封（契约 §3.8 分页 {items,page,size,total}）；
   *  返回类型显式标注，useTable 的 InferRecordType 才能推出 TRecord = IamEmployee */
  function fetchEmployeeList(
    params: IamEmployeeListParams
  ): Promise<Api.Common.PaginatedResponse<IamEmployee>> {
    const clean: IamEmployeeListParams = {}
    for (const [k, v] of Object.entries(params)) {
      if (v !== '' && v !== undefined && v !== null) {
        ;(clean as Record<string, unknown>)[k] = v
      }
    }
    return iamEmployeeApi.list(clean).then(toPaginated)
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
      apiFn: fetchEmployeeList,
      apiParams: { page: 1, size: 20 },
      paginationKey: { current: 'page', size: 'size' },
      columnsFactory: () => [
        { prop: 'employeeNo', label: '工号', minWidth: 140, sortable: 'custom' },
        { prop: 'name', label: '姓名', minWidth: 120, sortable: 'custom' },
        {
          prop: 'orgNodeId',
          label: '所属组织',
          minWidth: 200,
          sortable: 'custom',
          formatter: (row: IamEmployee) =>
            h('span', orgNameMap.value[row.orgNodeId] ?? `#${row.orgNodeId}`)
        },
        {
          prop: 'employmentStatus',
          label: '在职状态',
          width: 110,
          sortable: 'custom',
          formatter: (row: IamEmployee) =>
            h(ElTag, { type: row.employmentStatus === 'ACTIVE' ? 'success' : 'info' }, () =>
              row.employmentStatus === 'ACTIVE' ? '在职' : '已离职'
            )
        },
        {
          prop: 'operation',
          label: '操作',
          width: 90,
          fixed: 'right',
          formatter: (row: IamEmployee) =>
            h('div', [
              h(ArtButtonMore, {
                list: operationList(row),
                onClick: (item: ButtonMoreItem) => buttonMoreClick(item, row)
              })
            ])
        }
      ]
    }
  })

  /** TERMINATED 终态：编辑/离职/岗位分配置灰（ArtButtonMore 支持 per-item disabled + auth） */
  function operationList(row: IamEmployee): ButtonMoreItem[] {
    return [
      {
        key: 'edit',
        label: '编辑',
        icon: 'ri:edit-line',
        auth: 'system:employee:update',
        disabled: row.employmentStatus === 'TERMINATED'
      },
      {
        key: 'positions',
        label: '岗位分配',
        icon: 'ri:sitemap-line',
        auth: 'system:employee:assign-position',
        disabled: row.employmentStatus === 'TERMINATED'
      },
      {
        key: 'terminate',
        label: '离职',
        icon: 'ri:logout-box-r-line',
        color: '#f56c6c',
        auth: 'system:employee:terminate',
        disabled: row.employmentStatus === 'TERMINATED'
      }
    ]
  }

  function buttonMoreClick(item: ButtonMoreItem, row: IamEmployee) {
    if (item.key === 'edit') openEdit(row)
    else if (item.key === 'positions') openAssignDrawer(row)
    else if (item.key === 'terminate') onTerminate(row)
  }

  // ---------- 搜索与排序 ----------

  function applyQuery() {
    replaceSearchParams({
      ...activeFilters.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value
    })
    getData()
  }

  const handleSearch = (params: EmployeeSearchFormParams) => {
    activeFilters.value = { ...params }
    applyQuery()
  }

  const handleReset = () => {
    sortBy.value = undefined
    sortOrder.value = undefined
    activeFilters.value = {}
    resetSearchParams()
  }

  const handleSortChange = ({
    prop,
    order
  }: {
    prop: string
    order: 'ascending' | 'descending' | null
  }) => {
    sortBy.value = order ? (prop as NonNullable<IamEmployeeListParams['sortBy']>) : undefined
    sortOrder.value = order === 'ascending' ? 'asc' : order === 'descending' ? 'desc' : undefined
    applyQuery()
  }

  // ---------- 离职（EMP-01 同事务停号） ----------

  const cascadedVisible = ref(false)
  const cascadedAccounts = ref<{ id: number; status: string }[]>([])

  function onTerminate(row: IamEmployee) {
    ElMessageBox.confirm(
      `离职将把「${row.name}（${row.employeeNo}）」置为已离职，并在同一事务中停用其关联平台账号。确认继续？`,
      '离职确认',
      { type: 'warning' }
    )
      .then(async () => {
        const res = await iamEmployeeApi.terminate(row.id)
        ElMessage.success('离职完成')
        cascadedAccounts.value = res.cascadedAccounts ?? []
        cascadedVisible.value = true
        refreshData()
      })
      .catch(() => undefined)
  }

  // ---------- 新建 / 编辑 ----------

  const drawerVisible = ref(false)
  const drawerTitle = ref('')
  const editing = ref<IamEmployee | null>(null)
  const submitting = ref(false)
  const formRef = ref<FormInstance>()

  interface EmployeeFormState {
    employeeNo: string
    name: string
    orgNodeId: number | undefined
    attributesText: string
  }

  const emptyForm = (): EmployeeFormState => ({
    employeeNo: '',
    name: '',
    orgNodeId: undefined,
    attributesText: ''
  })

  const form = ref<EmployeeFormState>(emptyForm())

  const formRules: FormRules = {
    employeeNo: [{ required: true, message: '请输入工号', trigger: 'blur' }],
    name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
    orgNodeId: [{ required: true, message: '请选择所属组织', trigger: 'change' }]
  }

  function openCreate() {
    editing.value = null
    form.value = emptyForm()
    drawerTitle.value = '新建员工'
    drawerVisible.value = true
  }

  function openEdit(row: IamEmployee) {
    editing.value = row
    form.value = {
      employeeNo: row.employeeNo,
      name: row.name,
      orgNodeId: row.orgNodeId,
      attributesText: row.attributes ? JSON.stringify(row.attributes, null, 2) : ''
    }
    drawerTitle.value = '编辑员工'
    drawerVisible.value = true
  }

  /** attributes 文本 → 对象；非法 JSON / 非对象返回 null（调用方中止），空串返回 undefined（不提交） */
  function parseAttributes(text: string): Record<string, unknown> | null | undefined {
    const trimmed = text.trim()
    if (!trimmed) return undefined
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        ElMessage.error('扩展属性须为 JSON 对象（如 {"key":"value"}）')
        return null
      }
      return parsed as Record<string, unknown>
    } catch {
      ElMessage.error('扩展属性不是合法 JSON')
      return null
    }
  }

  async function submitForm() {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) return
    if (form.value.orgNodeId === undefined) return
    const attrs = parseAttributes(form.value.attributesText)
    if (attrs === null) return

    submitting.value = true
    try {
      if (editing.value) {
        await iamEmployeeApi.update(editing.value.id, {
          name: form.value.name.trim(),
          orgNodeId: form.value.orgNodeId,
          ...(attrs !== undefined ? { attributes: attrs } : {})
        })
        ElMessage.success('保存成功')
      } else {
        await iamEmployeeApi.create({
          employeeNo: form.value.employeeNo.trim(),
          name: form.value.name.trim(),
          orgNodeId: form.value.orgNodeId,
          ...(attrs !== undefined ? { attributes: attrs } : {})
        })
        ElMessage.success('创建成功')
      }
      drawerVisible.value = false
      refreshData()
    } finally {
      submitting.value = false
    }
  }

  // ---------- 岗位分配 Drawer（契约 §3.11；EMP-05…11） ----------

  const assignDrawerVisible = ref(false)
  const assignEmployee = ref<IamEmployee | null>(null)
  const empPositions = ref<IamEmployeePosition[]>([])
  const assignLoading = ref(false)
  const assignSubmitting = ref(false)
  const assignPositionId = ref<string | undefined>(undefined)
  const assignAsPrimary = ref(false)

  /** TERMINATED 只读（EMP-10）：设主岗/解除/添加全部冻结 */
  const readonlyAssign = computed(() => assignEmployee.value?.employmentStatus === 'TERMINATED')

  const primaryDeptName = computed(
    () => empPositions.value.find((p) => p.isPrimary)?.departmentName ?? null
  )

  /** EMP-09：组织挂靠与主岗部门独立维护——两者都有且不一致时标注（不告警） */
  const primaryDeptMismatch = computed(() => {
    const e = assignEmployee.value
    const dept = primaryDeptName.value
    if (!e || !dept) return false
    const orgName = orgNameMap.value[e.orgNodeId]
    return orgName !== undefined && !orgName.endsWith(dept) && orgName !== dept
  })

  interface AssignPickNode {
    id: string
    label: string
    disabled?: boolean
    children?: AssignPickNode[]
  }

  const assignPickTree = ref<AssignPickNode[]>([])

  function toAssignPickNodes(nodes: IamPositionNode[]): AssignPickNode[] {
    return nodes.map((n) => ({
      id: n.id,
      label: `${n.name}（${n.code}）`,
      disabled: n.status === 'DISABLED',
      children: n.children?.length ? toAssignPickNodes(n.children) : undefined
    }))
  }

  async function loadAssignPickTree() {
    const tree = await iamPositionApi.tree({ status: 'ACTIVE' })
    assignPickTree.value = toAssignPickNodes(tree)
  }

  async function loadEmpPositions() {
    if (!assignEmployee.value) return
    assignLoading.value = true
    try {
      empPositions.value = await iamEmployeeApi.listPositions(assignEmployee.value.id)
    } finally {
      assignLoading.value = false
    }
  }

  function openAssignDrawer(row: IamEmployee) {
    assignEmployee.value = row
    assignPositionId.value = undefined
    assignAsPrimary.value = false
    assignDrawerVisible.value = true
    loadEmpPositions()
    loadAssignPickTree()
  }

  async function onAssignPosition() {
    if (!assignEmployee.value || !assignPositionId.value) {
      ElMessage.warning('请先选择岗位')
      return
    }
    assignSubmitting.value = true
    try {
      await iamEmployeeApi.assignPosition(assignEmployee.value.id, {
        positionId: Number(assignPositionId.value),
        isPrimary: assignAsPrimary.value
      })
      ElMessage.success(assignAsPrimary.value ? '已添加并设为主岗' : '已添加')
      assignPositionId.value = undefined
      assignAsPrimary.value = false
      await loadEmpPositions()
    } finally {
      assignSubmitting.value = false
    }
  }

  async function onSetPrimary(row: IamEmployeePosition) {
    if (!assignEmployee.value) return
    await iamEmployeeApi.setPrimaryPosition(assignEmployee.value.id, Number(row.positionId))
    ElMessage.success(`已将「${row.positionName}」设为主岗（原主岗自动降级）`)
    await loadEmpPositions()
  }

  function onRemovePosition(row: IamEmployeePosition) {
    if (!assignEmployee.value) return
    ElMessageBox.confirm(
      `解除「${row.positionName}」分配？${row.isPrimary ? '解除主岗后员工零主岗合法（EMP-08），不自动晋升他岗。' : ''}`,
      '解除岗位分配',
      { type: 'warning' }
    )
      .then(async () => {
        await iamEmployeeApi.removePosition(assignEmployee.value!.id, Number(row.positionId))
        ElMessage.success('已解除')
        await loadEmpPositions()
      })
      .catch(() => undefined)
  }
</script>
