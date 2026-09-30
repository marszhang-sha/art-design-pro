<template>
  <div class="art-full-height">
    <AccountSearch
      v-show="showSearchBar"
      v-model="searchForm"
      @search="handleSearch"
      @reset="handleReset"
    ></AccountSearch>

    <ElCard class="art-table-card" :style="{ 'margin-top': showSearchBar ? '12px' : '0' }">
      <ArtTableHeader
        v-model:columns="columnChecks"
        v-model:showSearchBar="showSearchBar"
        :loading="loading"
        @refresh="refreshData"
      >
        <template #left>
          <ElSpace wrap>
            <ElButton v-auth="'system:account:create'" type="primary" @click="openCreate">
              创建账号
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

    <!-- 创建账号 -->
    <ElDialog v-model="createVisible" title="创建账号" width="520px">
      <ElForm label-width="90px">
        <ElFormItem label="场景">
          <ElRadioGroup v-model="form.scenario">
            <ElRadioButton value="PLATFORM">平台账号</ElRadioButton>
            <ElRadioButton value="AGENT_MASTER">代理商主账号</ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem v-if="form.scenario === 'AGENT_MASTER'" label="代理商ID">
          <ElInputNumber v-model="form.agentId" :min="1" />
        </ElFormItem>
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
          v-if="form.scenario === 'AGENT_MASTER'"
          title="前置条件：该代理商需已完成 OA 准入；初始凭据经一次性设密链接发送（24h 有效）"
          type="info"
          :closable="false"
          class="mb-2"
        />
      </ElForm>
      <template #footer>
        <ElButton @click="createVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="submitCreate">创建</ElButton>
      </template>
    </ElDialog>

    <!-- 临时密码弹窗（管理员重置） -->
    <ElDialog v-model="tempVisible" title="重置成功" width="420px">
      <ElAlert
        :title="`临时密码（仅显示一次，请线下交付；首登强制改密）：`"
        type="warning"
        :closable="false"
      />
      <p class="mt-2 select-all font-mono text-lg">{{ tempPassword }}</p>
      <template #footer>
        <ElButton type="primary" @click="tempVisible = false">我已保存</ElButton>
      </template>
    </ElDialog>

    <!-- 授权角色 Drawer -->
    <ElDrawer v-model="rolesVisible" title="授权角色" size="420px">
      <ElCheckboxGroup v-model="selectedRoleIds">
        <div v-for="r in allRoles" :key="r.id" class="mb-2">
          <ElCheckbox :value="r.id" :disabled="r.builtIn && r.code === 'agent-admin'">
            {{ r.name }}（{{ r.scope }}{{ r.agentId ? `#${r.agentId}` : '' }}
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
  import { h, ref } from 'vue'
  import { ElMessage, ElMessageBox, ElTag } from 'element-plus'
  import { ButtonMoreItem } from '@/components/core/forms/art-button-more/index.vue'
  import ArtButtonMore from '@/components/core/forms/art-button-more/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import {
    iamAccountApi,
    iamRoleApi,
    type IamAccount,
    type IamAccountListParams,
    type IamRole,
    type IamSortOrder
  } from '@/api/iam'
  import { toPaginated } from '@/views/iam/table'
  import AccountSearch from './modules/account-search.vue'

  defineOptions({ name: 'IamAccount' })

  interface AccountSearchFormParams {
    keyword?: string
    status?: string
    type?: string
    agentId?: number
  }

  // 搜索表单 + 服务端排序状态（sortBy 白名单见契约 §3.2：
  // id,username,displayName,accountType,agentId,status,createdAt）
  const searchForm = ref<AccountSearchFormParams>({})
  const activeFilters = ref<AccountSearchFormParams>({})
  const sortBy = ref<string | undefined>(undefined)
  const sortOrder = ref<IamSortOrder | undefined>(undefined)
  const showSearchBar = ref(true)

  /** apiFn 内归一信封：返回类型显式标注为标准 PaginatedResponse，
   *  useTable 的 InferRecordType 才能推出 TRecord = IamAccount
   *  （内联箭头函数会退化 TRecord = unknown；IamPage 走 responseAdapter 则退化为 never） */
  function fetchAccountList(
    params: IamAccountListParams
  ): Promise<Api.Common.PaginatedResponse<IamAccount>> {
    return iamAccountApi.list(params).then(toPaginated)
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
      apiFn: fetchAccountList,
      apiParams: {
        page: 1,
        size: 20
      },
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
          prop: 'accountType',
          label: '类型',
          width: 110,
          sortable: 'custom',
          formatter: (row: IamAccount) =>
            h(ElTag, { type: row.accountType === 'PLATFORM_USER' ? 'danger' : 'primary' }, () =>
              row.accountType === 'PLATFORM_USER' ? '平台' : '代理商'
            )
        },
        {
          prop: 'agentId',
          label: '代理商ID',
          width: 100,
          sortable: 'custom'
        },
        {
          prop: 'isMaster',
          label: '主账号',
          width: 90,
          formatter: (row: IamAccount) =>
            row.isMaster ? h(ElTag, { type: 'warning', size: 'small' }, () => '主账号') : h('span')
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

  /** 按行状态构造操作项（ArtButtonMore 内置 per-item auth 过滤，无权限项自动隐藏） */
  function operationList(row: IamAccount): ButtonMoreItem[] {
    const list: ButtonMoreItem[] = []
    if (row.status === 'ACTIVE') {
      list.push({
        key: 'disable',
        label: '停用',
        icon: 'ri:forbid-line',
        color: '#f56c6c',
        auth: 'system:account:disable'
      })
      list.push({
        key: 'lock',
        label: '锁定',
        icon: 'ri:lock-line',
        color: '#e6a23c',
        auth: 'system:account:lock'
      })
    }
    if (row.status === 'DISABLED') {
      list.push({
        key: 'enable',
        label: '启用',
        icon: 'ri:play-circle-line',
        color: '#67c23a',
        auth: 'system:account:enable'
      })
    }
    if (row.status === 'LOCKED') {
      list.push({
        key: 'unlock',
        label: '解锁',
        icon: 'ri:lock-unlock-line',
        color: '#67c23a',
        auth: 'system:account:unlock'
      })
    }
    list.push({
      key: 'resetPassword',
      label: '重置密码',
      icon: 'ri:key-2-line',
      auth: 'system:account:reset-password'
    })
    list.push({
      key: 'roles',
      label: '授权角色',
      icon: 'ri:user-settings-line',
      auth: 'system:role:assign'
    })
    return list
  }

  function buttonMoreClick(item: ButtonMoreItem, row: IamAccount) {
    switch (item.key) {
      case 'disable':
        onDisable(row)
        break
      case 'enable':
        onEnable(row)
        break
      case 'lock':
        onLock(row)
        break
      case 'unlock':
        onUnlock(row)
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

  const handleSearch = (params: AccountSearchFormParams) => {
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
  const form = ref({
    scenario: 'PLATFORM' as 'PLATFORM' | 'AGENT_MASTER',
    agentId: undefined as number | undefined,
    username: '',
    displayName: '',
    mobile: '',
    email: ''
  })

  function openCreate() {
    form.value = {
      scenario: 'PLATFORM',
      agentId: undefined,
      username: '',
      displayName: '',
      mobile: '',
      email: ''
    }
    createVisible.value = true
  }

  async function submitCreate() {
    submitting.value = true
    try {
      await iamAccountApi.create({
        scenario: form.value.scenario,
        agentId: form.value.agentId,
        username: form.value.username,
        displayName: form.value.displayName || undefined,
        mobile: form.value.mobile || undefined,
        email: form.value.email || undefined,
        admissionSource: form.value.scenario === 'AGENT_MASTER' ? 'OA_ADMISSION' : undefined
      })
      ElMessage.success('创建成功')
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
    const isMaster = row.isMaster
    ElMessageBox.confirm(
      isMaster ? '停用主账号将级联停用其全部子账号，确认？' : `确认停用账号 ${row.username}？`,
      '停用确认',
      { type: 'warning' }
    )
      .then(() => withReload(() => iamAccountApi.disable(row.id), '已停用'))
      .catch(() => undefined)
  }

  function onEnable(row: IamAccount) {
    withReload(() => iamAccountApi.enable(row.id), '已启用')
  }

  function onLock(row: IamAccount) {
    ElMessageBox.confirm(`确认锁定账号 ${row.username}？`, '锁定确认', { type: 'warning' })
      .then(() => withReload(() => iamAccountApi.lock(row.id), '已锁定'))
      .catch(() => undefined)
  }

  function onUnlock(row: IamAccount) {
    withReload(() => iamAccountApi.unlock(row.id), '已解锁')
  }

  // ---------- 重置密码 ----------

  const tempVisible = ref(false)
  const tempPassword = ref('')

  function onResetPassword(row: IamAccount) {
    ElMessageBox.confirm(`确认重置 ${row.username} 的密码？重置后首登强制改密。`, '重置确认', {
      type: 'warning'
    })
      .then(async () => {
        const resp = await iamAccountApi.adminResetPassword(row.id)
        tempPassword.value = resp.temporaryPassword
        tempVisible.value = true
      })
      .catch(() => undefined)
  }

  // ---------- 授权角色 ----------

  const allRoles = ref<IamRole[]>([])
  const rolesVisible = ref(false)
  const savingRoles = ref(false)
  const rolesAccount = ref<IamAccount | null>(null)
  const selectedRoleIds = ref<number[]>([])
  const originalRoleIds = ref<number[]>([])

  async function openRoles(row: IamAccount) {
    rolesAccount.value = row
    const [assigned, all] = await Promise.all([iamAccountApi.listRoles(row.id), iamRoleApi.list()])
    allRoles.value = all
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
      for (const roleId of toAdd) await iamAccountApi.assignRole(target, roleId)
      for (const roleId of toRemove) await iamAccountApi.revokeRole(target, roleId)
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
