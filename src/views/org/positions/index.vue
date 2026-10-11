<template>
  <!-- UI-IAM-015 岗位架构（部门树＋岗位列表，v0.2 岗位功能）：
       左树＝组织层级＋部门树拼接（药厂→业务实体→部门），部门维护挂 system:department:*，
       右上 inline 编辑部门信息，右下维护该部门岗位（汇报线，system:position:*）。
       停用语义（DEP-03/POS-04）：软标注——冻结新建入口与新增分配，存量不动。 -->
  <div class="art-full-height">
    <div class="flex flex-1 min-h-0 gap-3">
      <!-- 左：组织＋部门树（组织节点只读脚手架；BE 节点可新建部门） -->
      <!-- 树区宽度＝原弹性宽（约 723px）的 60%≈27rem；内联 flex 三元组压过全局 .el-card flex:1 规则 -->
      <ElCard
        shadow="never"
        class="art-table-card"
        :style="{ 'margin-top': '0', flex: '0 0 27rem', width: '27rem' }"
      >
        <div class="mb-2 flex items-center gap-2">
          <ElInput
            v-model="deptKeyword"
            placeholder="部门名称/代码"
            clearable
            size="small"
            :prefix-icon="SearchIcon"
          />
          <ElButton
            v-auth="'system:department:create'"
            type="primary"
            size="small"
            @click="openCreateRootUnderFirstBe"
          >
            新建部门
          </ElButton>
        </div>
        <ElTree
          ref="deptTreeRef"
          :data="treeData"
          node-key="key"
          :props="{ label: 'label', children: 'children' }"
          :filter-node-method="filterTreeNode"
          highlight-current
          default-expand-all
          empty-text="请先创建业务实体与部门"
          @node-click="onTreeNodeClick"
        >
          <template #default="{ data }">
            <span class="tree-node-row group">
              <span :class="data.status === 'DISABLED' ? 'text-gray-400 line-through' : ''">
                {{ data.label }}
              </span>
              <ElTag v-if="data.kind === 'ORG'" size="small" type="warning" class="ml-1">
                组织
              </ElTag>
              <ElTag v-else-if="data.status === 'DISABLED'" size="small" type="info" class="ml-1">
                停用
              </ElTag>
              <span class="tree-node-ops">
                <!-- 组织节点：仅 BE 提供「新建部门」入口（部门只能挂 BE，DEP-01） -->
                <template v-if="data.kind === 'ORG'">
                  <ElButton
                    v-if="data.orgType === 'BUSINESS_ENTITY'"
                    v-auth="'system:department:create'"
                    link
                    type="primary"
                    size="small"
                    @click.stop="openCreateDeptUnderBe(data)"
                  >
                    新建部门
                  </ElButton>
                </template>
                <template v-else>
                  <ElButton
                    v-auth="'system:department:create'"
                    link
                    type="primary"
                    size="small"
                    @click.stop="openCreateChildDept(data)"
                  >
                    加子
                  </ElButton>
                  <ElButton
                    v-auth="'system:department:update'"
                    link
                    size="small"
                    @click.stop="onRenameDept(data)"
                  >
                    改名
                  </ElButton>
                  <ElButton
                    v-if="data.status === 'ACTIVE'"
                    v-auth="'system:department:disable'"
                    link
                    type="warning"
                    size="small"
                    @click.stop="onDeptDisable(data)"
                  >
                    停用
                  </ElButton>
                  <ElButton
                    v-else
                    v-auth="'system:department:enable'"
                    link
                    type="success"
                    size="small"
                    @click.stop="onDeptEnable(data)"
                  >
                    启用
                  </ElButton>
                </template>
              </span>
            </span>
          </template>
        </ElTree>
      </ElCard>

      <!-- 右列：部门信息卡＋岗位列表卡 -->
      <div class="flex flex-col flex-1 min-w-0 min-h-0 gap-3">
        <!-- 右上：部门信息 inline 编辑（编码只读；新建/改名共用一卡） -->
        <ElCard shadow="never" :style="{ 'margin-top': '0' }">
          <template #header>
            <span class="font-medium">{{ deptCardTitle }}</span>
          </template>
          <ElForm
            v-if="deptForm"
            ref="deptFormRef"
            :model="deptForm"
            :rules="deptFormRules"
            label-width="100px"
            class="max-w-xl"
          >
            <ElFormItem v-if="deptForm.parentPath" label="上级部门">
              <span class="text-sm">{{ deptForm.parentPath }}</span>
            </ElFormItem>
            <ElFormItem label="部门编码" prop="code">
              <ElInput v-model="deptForm.code" :disabled="deptForm.mode === 'edit'" />
            </ElFormItem>
            <ElFormItem label="部门名称" prop="name">
              <ElInput ref="deptNameInputRef" v-model="deptForm.name" placeholder="同父下唯一" />
            </ElFormItem>
            <ElFormItem label="所属业务实体">
              <span class="text-sm">
                {{ orgPathOf(deptForm.orgNodeId) || `#${deptForm.orgNodeId}` }}
              </span>
            </ElFormItem>
            <ElFormItem>
              <ElButton @click="resetDeptCard">取消</ElButton>
              <ElButton
                v-auth="
                  deptForm.mode === 'edit' ? 'system:department:update' : 'system:department:create'
                "
                type="primary"
                :loading="deptSubmitting"
                @click="submitDept"
              >
                确认
              </ElButton>
            </ElFormItem>
          </ElForm>
          <ElEmpty
            v-else
            :description="
              selectedOrgNode
                ? `已选组织节点「${selectedOrgNode.label}」——点击其下部门节点维护信息，或用节点操作新建部门`
                : '点击左侧部门节点维护信息；或在树上新建部门'
            "
            :image-size="60"
          />
        </ElCard>

        <!-- 右下：岗位列表（当前部门；汇报线树形展示） -->
        <ElCard shadow="never" class="art-table-card flex-1 min-h-0" :style="{ 'margin-top': '0' }">
          <ArtTableHeader
            v-model:columns="columnChecks"
            :loading="loading"
            @refresh="loadPositions"
          >
            <template #left>
              <ElButton
                v-auth="'system:position:create'"
                type="primary"
                :disabled="!selectedDept || selectedDept.status === 'DISABLED'"
                @click="openPositionDialog()"
              >
                新建岗位
              </ElButton>
              <span v-if="selectedDept" class="ml-3 text-sm text-gray-500">
                当前部门：{{ selectedDept.name }}
                <ElTag
                  v-if="selectedDept.status === 'DISABLED'"
                  size="small"
                  type="info"
                  class="ml-1"
                >
                  已停用（新建/分配冻结）
                </ElTag>
              </span>
            </template>
          </ArtTableHeader>
          <ArtTable
            :loading="loading"
            :data="data"
            :columns="columns"
            row-key="id"
            :tree-props="{ children: 'children' }"
            default-expand-all
            empty-text="当前部门暂无岗位"
          />
        </ElCard>
      </div>
    </div>

    <!-- 岗位人员 Drawer（按岗位分配/查看在职人员；走员工侧分配端点） -->
    <ElDrawer
      v-model="membersVisible"
      :title="`岗位人员：${memberPosition?.name ?? ''}`"
      size="520px"
    >
      <div class="mb-3 flex items-center gap-2">
        <ElSelect
          v-model="pickedEmployeeId"
          filterable
          remote
          :remote-method="searchEmployees"
          clearable
          placeholder="搜索并选择在职员工（工号/姓名）"
          class="flex-1"
        >
          <ElOption v-for="o in empOptions" :key="o.id" :label="o.label" :value="o.id" />
        </ElSelect>
        <ElButton type="primary" :loading="memberSubmitting" @click="onAddMember">分配</ElButton>
      </div>
      <ElTable
        :data="holders"
        v-loading="holdersLoading"
        size="small"
        empty-text="该岗位暂无在职人员"
      >
        <ElTableColumn prop="employeeNo" label="工号" width="110" />
        <ElTableColumn prop="name" label="姓名" min-width="100" />
        <ElTableColumn label="主岗" width="70">
          <template #default="{ row }">
            <ElTag v-if="row.isPrimary" type="success" size="small">主岗</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <ElButton
              link
              type="primary"
              size="small"
              :disabled="row.isPrimary"
              @click="onMemberPrimary(row)"
            >
              设主岗
            </ElButton>
            <ElButton link type="danger" size="small" @click="onRemoveMember(row)">解除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElDrawer>

    <!-- 新建/编辑岗位 Dialog（上级岗位 TreeSelect 跨部门可选，POS-02） -->
    <ElDialog v-model="posDialogVisible" :title="posDialogTitle" width="480px">
      <ElForm ref="posFormRef" :model="posForm" :rules="posFormRules" label-width="100px">
        <ElFormItem v-if="!posEditing" label="岗位编码" prop="code">
          <ElInput v-model="posForm.code" placeholder="自由编码，全局唯一" />
        </ElFormItem>
        <ElFormItem v-else label="岗位编码">
          <ElInput :model-value="posEditing.code" disabled />
        </ElFormItem>
        <ElFormItem label="岗位名称" prop="name">
          <ElInput v-model="posForm.name" />
        </ElFormItem>
        <ElFormItem label="上级岗位">
          <ElTreeSelect
            v-model="posForm.parentId"
            :data="posPickTree"
            node-key="id"
            check-strictly
            clearable
            filterable
            :props="{ label: 'label', children: 'children' }"
            placeholder="不选＝无上级（汇报线根）；可跨部门"
            class="w-full"
          />
        </ElFormItem>
        <ElAlert
          v-if="posEditing && posForm.parentId && posEditing.parentId !== posForm.parentId"
          title="将调整汇报线（换父开放；成环会被拦截 400 IAM-5009）"
          type="warning"
          :closable="false"
          show-icon
          class="mb-1"
        />
      </ElForm>
      <template #footer>
        <ElButton @click="posDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="posSubmitting" @click="submitPosition">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { computed, h, nextTick, onMounted, ref, watch } from 'vue'
  import { Search } from '@element-plus/icons-vue'
  import { ElMessage, ElMessageBox, ElTag, type FormInstance, type FormRules } from 'element-plus'
  import ArtButtonMore, {
    type ButtonMoreItem
  } from '@/components/core/forms/art-button-more/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import { wrapAll } from '@/views/iam/table'
  import {
    iamDepartmentApi,
    iamEmployeeApi,
    iamOrgApi,
    iamPositionApi,
    type IamDepartmentNode,
    type IamOrgNode,
    type IamPositionEmployee,
    type IamPositionNode
  } from '@/api/iam'

  defineOptions({ name: 'OrgPositions' })
  const SearchIcon = Search

  // ---------- 左树：组织层级＋部门树拼接（药厂→业务实体→部门） ----------

  /** 展示节点：组织节点＝只读脚手架（无部门操作）；部门节点＝可维护 */
  interface TreeDispNode {
    key: string
    kind: 'ORG' | 'DEPT'
    label: string
    status: 'ACTIVE' | 'DISABLED'
    children: TreeDispNode[]
    /** ORG */
    orgId?: number
    orgType?: IamOrgNode['nodeType']
    /** DEPT */
    dept?: IamDepartmentNode
  }

  const orgTree = ref<IamOrgNode[]>([])
  const deptTree = ref<IamDepartmentNode[]>([])
  const treeData = computed(() => buildComposite(orgTree.value, deptTree.value))

  function buildComposite(orgNodes: IamOrgNode[], depts: IamDepartmentNode[]): TreeDispNode[] {
    // 部门按 orgNodeId 分桶挂到 BE 节点下（DEP-01：部门只挂业务实体）
    const byOrg: Record<number, IamDepartmentNode[]> = {}
    for (const d of depts) {
      const key = Number(d.orgNodeId)
      ;(byOrg[key] ??= []).push(d)
    }

    const buildDept = (d: IamDepartmentNode): TreeDispNode => ({
      key: `dept-${d.id}`,
      kind: 'DEPT',
      label: d.name,
      status: d.status,
      dept: d,
      children: (d.children ?? []).map(buildDept)
    })

    const buildOrg = (n: IamOrgNode): TreeDispNode => {
      const node: TreeDispNode = {
        key: `org-${n.id}`,
        kind: 'ORG',
        label: n.name,
        status: n.status,
        orgId: n.id,
        orgType: n.nodeType,
        children: []
      }
      // 部门挂 BE（DEP-01）；组织子节点递归拼接（药厂→业务实体→…）
      const deptKids = n.nodeType === 'BUSINESS_ENTITY' ? (byOrg[n.id] ?? []).map(buildDept) : []
      const orgKids = (n.children ?? []).filter((c) => c.nodeType !== 'CSO_AGENT').map(buildOrg)
      node.children = [...deptKids, ...orgKids]
      return node
    }

    // CSO_AGENT 不参与部门架构（DEP-01：部门只挂 BE）
    return orgNodes.filter((n) => n.nodeType !== 'CSO_AGENT').map(buildOrg)
  }

  const deptTreeRef = ref()
  const deptKeyword = ref('')

  watch(deptKeyword, (k) => deptTreeRef.value?.filter(k))

  function matchDept(node: TreeDispNode, k: string): boolean {
    // 自身命中 OR 任一后代命中（ElTree 父节点 false 会连带隐藏整个子树）
    const self =
      node.kind === 'DEPT'
        ? node.label.toLowerCase().includes(k) || (node.dept?.code ?? '').toLowerCase().includes(k)
        : false
    return self || node.children.some((c) => matchDept(c, k))
  }

  function filterTreeNode(value: string, data: unknown) {
    if (!value) return true
    return matchDept(data as TreeDispNode, value.toLowerCase())
  }

  /** 部门展示路径（如「业务实体 / 研发部」；组织段取组织树路径） */
  function flattenDeptPaths(
    nodes: TreeDispNode[],
    parentPath = '',
    map: Record<number, string> = {}
  ) {
    for (const n of nodes) {
      if (n.kind === 'ORG') {
        flattenDeptPaths(n.children, parentPath, map)
      } else {
        const path = parentPath ? `${parentPath} / ${n.label}` : n.label
        map[Number(n.dept!.id)] = path
        flattenDeptPaths(n.children, path, map)
      }
    }
    return map
  }

  // ---------- 组织树（路径解析＋首个 ACTIVE 业务实体） ----------

  const orgNameMap = ref<Record<number, string>>({})
  const activeBeId = ref<number | null>(null)

  function flattenOrgNames(nodes: IamOrgNode[], parentPath = '') {
    for (const n of nodes) {
      const path = parentPath ? `${parentPath} / ${n.name}` : n.name
      orgNameMap.value[n.id] = path
      if (n.children?.length) flattenOrgNames(n.children, path)
    }
  }

  function orgPathOf(orgId: number) {
    return orgNameMap.value[orgId] ?? ''
  }

  function findFirstBe(nodes: IamOrgNode[]): IamOrgNode | null {
    for (const n of nodes) {
      if (n.nodeType === 'BUSINESS_ENTITY' && n.status === 'ACTIVE') return n
      const found = findFirstBe(n.children ?? [])
      if (found) return found
    }
    return null
  }

  async function loadOrgTree() {
    orgTree.value = await iamOrgApi.tree()
    flattenOrgNames(orgTree.value)
    const be = findFirstBe(orgTree.value)
    activeBeId.value = be ? Number(be.id) : null
  }

  async function loadDeptTree() {
    deptTree.value = await iamDepartmentApi.tree()
  }

  // ---------- 部门信息 inline 编辑卡 ----------

  const selectedDept = ref<IamDepartmentNode | null>(null)
  const selectedOrgNode = ref<TreeDispNode | null>(null)

  interface DeptFormState {
    mode: 'create' | 'edit'
    code: string
    name: string
    orgNodeId: number
    parentId: number | undefined
    parentPath: string
    editingId?: number
  }

  const deptForm = ref<DeptFormState | null>(null)
  const deptFormRef = ref<FormInstance>()
  const deptNameInputRef = ref()
  const deptSubmitting = ref(false)

  const deptFormRules: FormRules = {
    code: [{ required: true, message: '请输入部门编码', trigger: 'blur' }],
    name: [{ required: true, message: '请输入部门名称', trigger: 'blur' }]
  }

  const deptCardTitle = computed(() => {
    if (!deptForm.value) return '部门信息'
    return deptForm.value.mode === 'create'
      ? deptForm.value.parentId
        ? '新建子部门'
        : '新建根级部门'
      : '编辑部门'
  })

  function resetDeptCard() {
    deptForm.value = null
  }

  function onTreeNodeClick(data: TreeDispNode) {
    if (data.kind === 'ORG') {
      // 组织节点：仅作脚手架选中，载入空表单上下文（可在该 BE 下新建部门）
      selectedDept.value = null
      selectedOrgNode.value = data
      resetDeptCard()
      return
    }
    selectedOrgNode.value = null
    selectedDept.value = data.dept!
    openEditDept(data.dept!)
    loadPositions()
  }

  function openEditDept(dept: IamDepartmentNode) {
    deptForm.value = {
      mode: 'edit',
      code: dept.code,
      name: dept.name,
      orgNodeId: Number(dept.orgNodeId),
      parentId: undefined,
      parentPath: '',
      editingId: Number(dept.id)
    }
  }

  function openCreateChildDept(disp: TreeDispNode) {
    const dept = disp.dept!
    const paths = flattenDeptPaths(treeData.value)
    deptForm.value = {
      mode: 'create',
      code: '',
      name: '',
      orgNodeId: Number(dept.orgNodeId),
      parentId: Number(dept.id),
      parentPath: paths[Number(dept.id)] ?? dept.name
    }
    nextTick(() => deptNameInputRef.value?.focus?.())
  }

  function openCreateDeptUnderBe(disp: TreeDispNode) {
    deptForm.value = {
      mode: 'create',
      code: '',
      name: '',
      orgNodeId: disp.orgId!,
      parentId: undefined,
      parentPath: ''
    }
    nextTick(() => deptNameInputRef.value?.focus?.())
  }

  function openCreateRootUnderFirstBe() {
    if (activeBeId.value === null) {
      ElMessage.warning('请先在组织管理中创建业务实体')
      return
    }
    deptForm.value = {
      mode: 'create',
      code: '',
      name: '',
      orgNodeId: activeBeId.value,
      parentId: undefined,
      parentPath: ''
    }
    nextTick(() => deptNameInputRef.value?.focus?.())
  }

  function onRenameDept(disp: TreeDispNode) {
    onTreeNodeClick(disp)
    nextTick(() => deptNameInputRef.value?.focus?.())
  }

  async function submitDept() {
    if (!deptForm.value) return
    const valid = await deptFormRef.value?.validate().catch(() => false)
    if (!valid) return
    deptSubmitting.value = true
    try {
      const f = deptForm.value
      if (f.mode === 'create') {
        await iamDepartmentApi.create({
          code: f.code.trim(),
          name: f.name.trim(),
          orgNodeId: f.orgNodeId,
          ...(f.parentId !== undefined ? { parentId: f.parentId } : {})
        })
        ElMessage.success('部门已创建')
      } else if (f.editingId !== undefined) {
        await iamDepartmentApi.update(f.editingId, { name: f.name.trim() })
        ElMessage.success('保存成功')
      }
      await loadDeptTree()
      if (f.mode === 'create') {
        resetDeptCard()
      } else if (f.editingId !== undefined) {
        // 改名后回读，保持选中节点与树一致
        const fresh = deptTree.value.find((d) => Number(d.id) === f.editingId)
        selectedDept.value = fresh ?? selectedDept.value
      }
    } finally {
      deptSubmitting.value = false
    }
  }

  function onDeptDisable(disp: TreeDispNode) {
    const dept = disp.dept!
    ElMessageBox.confirm(
      `停用「${dept.name}」后：其下新建子部门/岗位/新分配将被冻结，存量数据保留不动。确认停用？`,
      '停用部门',
      { type: 'warning' }
    )
      .then(async () => {
        await iamDepartmentApi.disable(dept.id)
        ElMessage.success('已停用')
        await loadDeptTree()
      })
      .catch(() => undefined)
  }

  function onDeptEnable(disp: TreeDispNode) {
    const dept = disp.dept!
    ElMessageBox.confirm(`恢复「${dept.name}」为启用状态？`, '启用部门', { type: 'info' })
      .then(async () => {
        await iamDepartmentApi.enable(dept.id)
        ElMessage.success('已启用')
        await loadDeptTree()
      })
      .catch(() => undefined)
  }

  // ---------- 岗位列表（当前部门；全量小表不分页） ----------

  /** apiFn 依赖选中部门（模块级 ref 捕获；切换部门后 getData() 重查） */
  function fetchPositions(): Promise<Api.Common.PaginatedResponse<IamPositionNode>> {
    if (!selectedDept.value) return Promise.resolve(wrapAll([]))
    return iamPositionApi
      .tree({ departmentId: Number(selectedDept.value.id) })
      .then((rows) => wrapAll(rows))
  }

  const {
    columns,
    columnChecks,
    data,
    loading,
    getData: loadPositions
  } = useTable({
    core: {
      apiFn: fetchPositions,
      apiParams: {},
      columnsFactory: () => [
        { prop: 'code', label: '岗位编码', minWidth: 160 },
        { prop: 'name', label: '岗位名称', minWidth: 160 },
        {
          prop: 'status',
          label: '状态',
          width: 90,
          formatter: (row: IamPositionNode) =>
            h(ElTag, { type: row.status === 'ACTIVE' ? 'success' : 'info' }, () =>
              row.status === 'ACTIVE' ? '启用' : '停用'
            )
        },
        {
          prop: 'parentId',
          label: '上级岗位',
          minWidth: 140,
          formatter: (row: IamPositionNode) =>
            h('span', positionNameMap.value[Number(row.parentId)] ?? '—')
        },
        {
          prop: 'operation',
          label: '操作',
          width: 90,
          fixed: 'right',
          formatter: (row: IamPositionNode) =>
            h('div', [
              h(ArtButtonMore, {
                list: positionOps(row),
                onClick: (item: ButtonMoreItem) => onPositionOp(item, row)
              })
            ])
        }
      ]
    }
  })

  /** 全量岗位树 → id→名称映射（上级岗位列；跨部门父也能显示） */
  const positionNameMap = ref<Record<number, string>>({})

  function collectPositionNames(nodes: IamPositionNode[]) {
    for (const n of nodes) {
      positionNameMap.value[Number(n.id)] = n.name
      collectPositionNames(n.children ?? [])
    }
  }

  async function loadPositionTree() {
    const tree = await iamPositionApi.tree()
    positionNameMap.value = {}
    collectPositionNames(tree)
    posPickTree.value = toPosPickNodes(tree)
  }

  interface PosPickNode {
    id: string
    label: string
    disabled?: boolean
    children?: PosPickNode[]
  }

  /** 上级岗位选择器：停用岗置灰（POS-04 冻结挂停用下级）；全树跨部门可选 */
  function toPosPickNodes(nodes: IamPositionNode[]): PosPickNode[] {
    return nodes.map((n) => ({
      id: n.id,
      label: `${n.name}（${n.code}）`,
      disabled: n.status === 'DISABLED',
      children: n.children?.length ? toPosPickNodes(n.children) : undefined
    }))
  }

  const posPickTree = ref<PosPickNode[]>([])

  // ---------- 新建 / 编辑岗位 ----------

  const posDialogVisible = ref(false)
  const posEditing = ref<IamPositionNode | null>(null)
  const posSubmitting = ref(false)
  const posFormRef = ref<FormInstance>()

  interface PositionFormState {
    code: string
    name: string
    parentId: string | undefined
  }

  const posForm = ref<PositionFormState>({ code: '', name: '', parentId: undefined })

  const posFormRules: FormRules = {
    code: [{ required: true, message: '请输入岗位编码', trigger: 'blur' }],
    name: [{ required: true, message: '请输入岗位名称', trigger: 'blur' }]
  }

  const posDialogTitle = computed(() =>
    posEditing.value ? `编辑岗位：${posEditing.value.name}` : '新建岗位'
  )

  function openPositionDialog(row?: IamPositionNode) {
    posEditing.value = row ?? null
    posForm.value = row
      ? { code: row.code, name: row.name, parentId: row.parentId ?? undefined }
      : { code: '', name: '', parentId: undefined }
    posDialogVisible.value = true
  }

  async function submitPosition() {
    const valid = await posFormRef.value?.validate().catch(() => false)
    if (!valid) return
    posSubmitting.value = true
    try {
      const departmentId = selectedDept.value ? Number(selectedDept.value.id) : undefined
      if (posEditing.value) {
        const payload: { name?: string; parentId?: number } = {
          name: posForm.value.name.trim()
        }
        if (posForm.value.parentId) payload.parentId = Number(posForm.value.parentId)
        await iamPositionApi.update(posEditing.value.id, payload)
        ElMessage.success('保存成功')
      } else {
        await iamPositionApi.create({
          code: posForm.value.code.trim(),
          name: posForm.value.name.trim(),
          departmentId: departmentId ?? null,
          ...(posForm.value.parentId ? { parentId: Number(posForm.value.parentId) } : {})
        })
        ElMessage.success('岗位已创建')
      }
      posDialogVisible.value = false
      loadPositions()
      loadPositionTree()
    } finally {
      posSubmitting.value = false
    }
  }

  function positionOps(row: IamPositionNode): ButtonMoreItem[] {
    return [
      {
        key: 'edit',
        label: '编辑',
        icon: 'ri:edit-line',
        auth: 'system:position:update'
      },
      {
        key: 'members',
        label: '人员',
        icon: 'ri:team-line',
        auth: 'system:employee:assign-position'
      },
      row.status === 'ACTIVE'
        ? {
            key: 'disable',
            label: '停用',
            icon: 'ri:pause-circle-line',
            color: '#f56c6c',
            auth: 'system:position:disable'
          }
        : {
            key: 'enable',
            label: '启用',
            icon: 'ri:play-circle-line',
            auth: 'system:position:enable'
          }
    ]
  }

  function onPositionOp(item: ButtonMoreItem, row: IamPositionNode) {
    if (item.key === 'edit') {
      openPositionDialog(row)
    } else if (item.key === 'members') {
      openMembersDrawer(row)
    } else if (item.key === 'disable') {
      ElMessageBox.confirm(
        `停用「${row.name}」后：新建子岗位/新分配/设主岗将被冻结，在岗分配保留不动。确认停用？`,
        '停用岗位',
        { type: 'warning' }
      )
        .then(async () => {
          await iamPositionApi.disable(row.id)
          ElMessage.success('已停用')
          loadPositions()
          loadPositionTree()
        })
        .catch(() => undefined)
    } else if (item.key === 'enable') {
      ElMessageBox.confirm(`恢复「${row.name}」为启用状态？`, '启用岗位', { type: 'info' })
        .then(async () => {
          await iamPositionApi.enable(row.id)
          ElMessage.success('已启用')
          loadPositions()
          loadPositionTree()
        })
        .catch(() => undefined)
    }
  }

  // ---------- 岗位人员 Drawer（按岗位分配员工；走员工侧端点拼装） ----------

  const membersVisible = ref(false)
  const memberPosition = ref<IamPositionNode | null>(null)
  const holders = ref<IamPositionEmployee[]>([])
  const holdersLoading = ref(false)
  const memberSubmitting = ref(false)
  const pickedEmployeeId = ref<number | undefined>(undefined)
  const empOptions = ref<{ id: number; label: string }[]>([])

  async function loadHolders() {
    if (!memberPosition.value) return
    holdersLoading.value = true
    try {
      holders.value = await iamPositionApi.listEmployees(memberPosition.value.id)
    } finally {
      holdersLoading.value = false
    }
  }

  /** 远程搜索在职员工（ACTIVE；空关键词取前 50） */
  async function searchEmployees(keyword: string) {
    const page = await iamEmployeeApi.list({
      keyword: keyword || undefined,
      employmentStatus: 'ACTIVE',
      page: 1,
      size: 50
    })
    empOptions.value = page.items.map((e) => ({ id: e.id, label: `${e.name}（${e.employeeNo}）` }))
  }

  function openMembersDrawer(row: IamPositionNode) {
    memberPosition.value = row
    pickedEmployeeId.value = undefined
    membersVisible.value = true
    loadHolders()
    searchEmployees('')
  }

  async function onAddMember() {
    if (!memberPosition.value) return
    if (!pickedEmployeeId.value) {
      ElMessage.warning('请先选择员工')
      return
    }
    memberSubmitting.value = true
    try {
      await iamEmployeeApi.assignPosition(pickedEmployeeId.value, {
        positionId: Number(memberPosition.value.id)
      })
      ElMessage.success('已分配')
      pickedEmployeeId.value = undefined
      await loadHolders()
    } finally {
      memberSubmitting.value = false
    }
  }

  function onMemberPrimary(row: IamPositionEmployee) {
    if (!memberPosition.value) return
    iamEmployeeApi
      .setPrimaryPosition(Number(row.employeeId), Number(memberPosition.value.id))
      .then(() => {
        ElMessage.success(`已将「${row.name}」设为主岗（其原主岗自动降级）`)
        loadHolders()
      })
      .catch(() => undefined)
  }

  function onRemoveMember(row: IamPositionEmployee) {
    if (!memberPosition.value) return
    ElMessageBox.confirm(
      `解除「${row.name}」的「${memberPosition.value.name}」分配？${row.isPrimary ? '该员工将变为零主岗（EMP-08 合法，不自动晋升）。' : ''}`,
      '解除分配',
      { type: 'warning' }
    )
      .then(async () => {
        await iamEmployeeApi.removePosition(
          Number(row.employeeId),
          Number(memberPosition.value!.id)
        )
        ElMessage.success('已解除')
        await loadHolders()
      })
      .catch(() => undefined)
  }

  // ---------- 初始化 ----------

  onMounted(async () => {
    await Promise.all([loadOrgTree(), loadDeptTree(), loadPositionTree()])
  })
</script>

<style scoped>
  .tree-node-row {
    display: flex;
    flex: 1;
    align-items: center;
    min-width: 0;
    padding-right: 4px;
  }

  .tree-node-ops {
    display: none;
    flex-shrink: 0;
    margin-left: auto;
  }

  .tree-node-row:hover .tree-node-ops {
    display: inline-flex;
  }
</style>
