<template>
  <div class="art-full-height">
    <SubAccountSearch
      v-show="showSearchBar"
      v-model="searchForm"
      @search="handleSearch"
      @reset="handleReset"
    ></SubAccountSearch>

    <ElCard class="art-table-card" :style="{ 'margin-top': showSearchBar ? '12px' : '0' }">
      <ArtTableHeader
        v-model:columns="columnChecks"
        v-model:showSearchBar="showSearchBar"
        :loading="loading"
        @refresh="refreshData"
      >
        <template #left>
          <ElSpace wrap>
            <ElButton v-auth="'agent:account:create'" type="primary" @click="openCreate">
              创建子账号
            </ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
        @sort-change="handleSortChange"
      >
      </ArtTable>
    </ElCard>

    <!-- 创建子账号（初始凭据经一次性设密链接发送，24h 有效） -->
    <ElDialog v-model="createVisible" title="创建子账号" width="480px">
      <ElForm label-width="90px">
        <ElFormItem label="用户名" required>
          <ElInput v-model="form.username" />
        </ElFormItem>
        <ElFormItem label="显示名">
          <ElInput v-model="form.displayName" />
        </ElFormItem>
        <ElFormItem label="手机号">
          <ElInput v-model="form.mobile" />
        </ElFormItem>
        <ElFormItem label="邮箱">
          <ElInput v-model="form.email" />
        </ElFormItem>
        <ElAlert
          title="初始凭据将通过一次性设密链接发送（24h 有效）"
          type="info"
          :closable="false"
        />
      </ElForm>
      <template #footer>
        <ElButton @click="createVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="submitCreate">创建</ElButton>
      </template>
    </ElDialog>

    <!-- 临时密码弹窗（管理员重置） -->
    <ElDialog v-model="tempVisible" title="重置成功" width="420px">
      <ElAlert title="临时密码（仅显示一次；首登强制改密）" type="warning" :closable="false" />
      <p class="mt-2 select-all font-mono text-lg">{{ tempPassword }}</p>
      <template #footer>
        <ElButton type="primary" @click="tempVisible = false">我已保存</ElButton>
      </template>
    </ElDialog>

    <!-- 授权角色 Drawer -->
    <ElDrawer v-model="rolesVisible" title="子账号授权" size="420px">
      <ElCheckboxGroup v-model="selectedRoleIds">
        <div v-for="r in assignableRoles" :key="r.id" class="mb-2">
          <ElCheckbox :value="r.id">
            {{ r.name }}（{{ r.scope }}
            <ElTag v-if="r.builtIn" size="small" class="ml-1">内置</ElTag>）
          </ElCheckbox>
        </div>
      </ElCheckboxGroup>
      <template #footer>
        <ElButton type="primary" :loading="savingRoles" @click="saveRoles">保存</ElButton>
      </template>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { h, onMounted, ref } from 'vue'
  import { ElMessage, ElMessageBox, ElTag } from 'element-plus'
  import { ButtonMoreItem } from '@/components/core/forms/art-button-more/index.vue'
  import ArtButtonMore from '@/components/core/forms/art-button-more/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import {
    iamAgentRoleApi,
    iamAuthApi,
    iamSubAccountApi,
    type IamAccount,
    type IamRole,
    type IamSortOrder,
    type IamSubAccountListParams
  } from '@/api/iam'
  import { toPaginated } from '@/views/iam/table'
  import SubAccountSearch from './modules/sub-account-search.vue'

  defineOptions({ name: 'IamSubAccount' })

  interface SubAccountSearchFormParams {
    keyword?: string
    status?: string
  }

  // agentId 取自会话闭环（/me），immediate:false 待其就绪后再触发首载；
  // 须与调用者 JWT agt 一致（后端三道防线，§3.6）
  const agentId = ref<string>('')

  // 搜索表单 + 服务端排序状态（排序白名单同 /accounts，契约 §3.6）
  const searchForm = ref<SubAccountSearchFormParams>({})
  const activeFilters = ref<SubAccountSearchFormParams>({})
  const sortBy = ref<string | undefined>(undefined)
  const sortOrder = ref<IamSortOrder | undefined>(undefined)
  const showSearchBar = ref(true)

  /** apiFn 内归一信封：返回类型显式标注为标准 PaginatedResponse，
   *  useTable 的 InferRecordType 才能推出 TRecord = IamAccount
   *  （内联箭头函数会退化 TRecord = unknown；IamPage 走 responseAdapter 则退化为 never） */
  function fetchSubAccountList(
    params: IamSubAccountListParams
  ): Promise<Api.Common.PaginatedResponse<IamAccount>> {
    return iamSubAccountApi.list(agentId.value, params).then(toPaginated)
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
      apiFn: fetchSubAccountList,
      apiParams: {
        page: 1,
        size: 20
      },
      // agentId 依赖 /me 会话，就绪前不可自动请求
      immediate: false,
      // 契约分页键为 page/size（信封 {items,page,size,total}，§1）
      paginationKey: { current: 'page', size: 'size' },
      columnsFactory: () => [
        {
          prop: 'username',
          label: '用户名',
          minWidth: 140,
          sortable: 'custom'
        },
        {
          prop: 'displayName',
          label: '显示名',
          minWidth: 120,
          sortable: 'custom'
        },
        {
          prop: 'mobile',
          label: '手机号',
          minWidth: 120
        },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          sortable: 'custom',
          formatter: (row: IamAccount) =>
            h(ElTag, { type: statusTagType(row.status) }, () => statusText(row.status))
        },
        {
          prop: 'operation',
          label: '操作',
          width: 90,
          fixed: 'right',
          formatter: (row: IamAccount) =>
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

  // ---------- 初始加载（agentId 来自会话闭环） ----------

  onMounted(async () => {
    const me = await iamAuthApi.me()
    if (!me.agentId) {
      ElMessage.warning('当前账号未关联代理商，无法加载子账号')
      return
    }
    agentId.value = me.agentId
    getData()
  })

  /** 按行状态构造操作项（ArtButtonMore 内置 per-item auth 过滤，无权限项自动隐藏）。
   *  agent 侧无启用/锁定/解锁能力（契约 §3.6），不发明 */
  function operationList(row: IamAccount): ButtonMoreItem[] {
    const list: ButtonMoreItem[] = []
    if (row.status === 'ACTIVE') {
      list.push({
        key: 'disable',
        label: '停用',
        icon: 'ri:forbid-line',
        color: '#f56c6c',
        auth: 'agent:account:disable'
      })
    }
    list.push({
      key: 'resetPassword',
      label: '重置密码',
      icon: 'ri:key-2-line',
      auth: 'agent:account:reset-password'
    })
    list.push({
      key: 'roles',
      label: '授权角色',
      icon: 'ri:user-settings-line',
      auth: 'agent:role:assign'
    })
    return list
  }

  function buttonMoreClick(item: ButtonMoreItem, row: IamAccount) {
    switch (item.key) {
      case 'disable':
        onDisable(row)
        break
      case 'resetPassword':
        onResetPassword(row)
        break
      case 'roles':
        openRoles(row)
        break
    }
  }

  // ---------- 搜索与排序 ----------

  /** 应用查询：过滤 + 排序整包写入 searchParams（replaceSearchParams 会清空旧过滤键） */
  function applyQuery() {
    replaceSearchParams({
      ...activeFilters.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value
    })
    getData()
  }

  const handleSearch = (params: SubAccountSearchFormParams) => {
    activeFilters.value = { ...params }
    applyQuery()
  }

  const handleReset = () => {
    // resetSearchParams 内部会恢复 apiParams 并重新请求；排序态需一并复位
    sortBy.value = undefined
    sortOrder.value = undefined
    activeFilters.value = {}
    resetSearchParams()
  }

  /** 服务端排序：sortable:'custom' 列头点击 → sortBy/sortOrder 参数（契约 §1） */
  const handleSortChange = ({
    prop,
    order
  }: {
    prop: string
    order: 'ascending' | 'descending' | null
  }) => {
    sortBy.value = order ? prop : undefined
    sortOrder.value = order === 'ascending' ? 'asc' : order === 'descending' ? 'desc' : undefined
    applyQuery()
  }

  // ---------- 创建 ----------

  const createVisible = ref(false)
  const submitting = ref(false)
  const form = ref({ username: '', displayName: '', mobile: '', email: '' })

  function openCreate() {
    form.value = { username: '', displayName: '', mobile: '', email: '' }
    createVisible.value = true
  }

  async function submitCreate() {
    if (!agentId.value) return
    submitting.value = true
    try {
      await iamSubAccountApi.create(agentId.value, {
        username: form.value.username,
        displayName: form.value.displayName || undefined,
        mobile: form.value.mobile || undefined,
        email: form.value.email || undefined
      })
      ElMessage.success('创建成功，设密链接已发送')
      createVisible.value = false
      refreshData()
    } finally {
      submitting.value = false
    }
  }

  // ---------- 状态动作 ----------

  async function withReload(fn: () => Promise<unknown>, successMsg?: string) {
    await fn()
    if (successMsg) ElMessage.success(successMsg)
    refreshData()
  }

  function onDisable(row: IamAccount) {
    ElMessageBox.confirm(`确认停用 ${row.username}？（离职/失效停用，不删除）`, '停用确认', {
      type: 'warning'
    })
      .then(() => withReload(() => iamSubAccountApi.disable(agentId.value, row.id), '已停用'))
      .catch(() => undefined)
  }

  // ---------- 重置密码 ----------

  const tempVisible = ref(false)
  const tempPassword = ref('')

  function onResetPassword(row: IamAccount) {
    ElMessageBox.confirm(`确认重置 ${row.username} 的密码？重置后首登强制改密。`, '重置确认', {
      type: 'warning'
    })
      .then(async () => {
        const resp = await iamSubAccountApi.adminResetPassword(agentId.value, row.id)
        tempPassword.value = resp.temporaryPassword
        tempVisible.value = true
      })
      .catch(() => undefined)
  }

  // ---------- 授权角色 ----------

  const assignableRoles = ref<IamRole[]>([])
  const rolesVisible = ref(false)
  const savingRoles = ref(false)
  const rolesAccount = ref<IamAccount | null>(null)
  const selectedRoleIds = ref<number[]>([])
  const originalRoleIds = ref<number[]>([])

  async function openRoles(row: IamAccount) {
    rolesAccount.value = row
    const [all, assigned] = await Promise.all([
      iamAgentRoleApi.list(agentId.value),
      iamSubAccountApi.listRoles(agentId.value, row.id)
    ])
    assignableRoles.value = all
    selectedRoleIds.value = assigned.map((r) => r.roleId)
    originalRoleIds.value = [...selectedRoleIds.value]
    rolesVisible.value = true
  }

  async function saveRoles() {
    if (!rolesAccount.value) return
    savingRoles.value = true
    try {
      const target = rolesAccount.value.id
      const toAdd = selectedRoleIds.value.filter((id) => !originalRoleIds.value.includes(id))
      const toRemove = originalRoleIds.value.filter((id) => !selectedRoleIds.value.includes(id))
      for (const roleId of toAdd) await iamSubAccountApi.assignRole(agentId.value, target, roleId)
      for (const roleId of toRemove)
        await iamSubAccountApi.revokeRole(agentId.value, target, roleId)
      ElMessage.success('已保存')
      rolesVisible.value = false
      refreshData()
    } finally {
      savingRoles.value = false
    }
  }

  // ---------- 状态显示 ----------

  function statusTagType(status: string) {
    if (status === 'ACTIVE') return 'success' as const
    if (status === 'LOCKED') return 'warning' as const
    return 'danger' as const
  }

  function statusText(status: string) {
    if (status === 'ACTIVE') return '正常'
    if (status === 'DISABLED') return '已停用'
    return '已锁定'
  }
</script>
