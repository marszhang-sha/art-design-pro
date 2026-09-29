<template>
  <div class="p-4">
    <ElCard shadow="never">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <ElInput
            v-model="keyword"
            placeholder="搜索用户名/显示名"
            clearable
            style="width: 220px"
          />
          <ElSelect v-model="statusFilter" placeholder="状态" clearable style="width: 140px">
            <ElOption label="ACTIVE" value="ACTIVE" />
            <ElOption label="DISABLED" value="DISABLED" />
            <ElOption label="LOCKED" value="LOCKED" />
          </ElSelect>
          <ElButton @click="load">查询</ElButton>
        </div>
        <ElButton v-auth="'system:account:create'" type="primary" @click="openCreate">
          创建账号
        </ElButton>
      </div>

      <ArtTable :data="filtered" :loading="loading" border stripe :show-table-header="false">
        <ElTableColumn prop="username" label="用户名" min-width="140" />
        <ElTableColumn prop="displayName" label="显示名" min-width="120" />
        <ElTableColumn label="类型" width="130">
          <template #default="{ row }">
            <ElTag :type="row.accountType === 'PLATFORM_USER' ? 'danger' : 'primary'">
              {{ row.accountType === 'PLATFORM_USER' ? '平台' : '代理商' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="agentId" label="代理商ID" width="100" />
        <ElTableColumn label="主账号" width="80">
          <template #default="{ row }">
            <ElTag v-if="row.isMaster" type="warning" size="small">主账号</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="100">
          <template #default="{ row }">
            <ElTag :type="statusTagType(row.status)">{{ statusText(row.status) }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <ElButton
              v-if="row.status === 'ACTIVE'"
              v-auth="'system:account:disable'"
              link
              type="danger"
              @click="onDisable(row)"
            >
              停用
            </ElButton>
            <ElButton
              v-if="row.status === 'DISABLED'"
              v-auth="'system:account:enable'"
              link
              type="success"
              @click="onEnable(row)"
            >
              启用
            </ElButton>
            <ElButton
              v-if="row.status === 'ACTIVE'"
              v-auth="'system:account:lock'"
              link
              type="warning"
              @click="onLock(row)"
            >
              锁定
            </ElButton>
            <ElButton
              v-if="row.status === 'LOCKED'"
              v-auth="'system:account:unlock'"
              link
              type="success"
              @click="onUnlock(row)"
            >
              解锁
            </ElButton>
            <ElButton
              v-auth="'system:account:reset-password'"
              link
              type="primary"
              @click="onResetPassword(row)"
            >
              重置密码
            </ElButton>
            <ElButton v-auth="'system:role:assign'" link type="primary" @click="openRoles(row)">
              授权角色
            </ElButton>
          </template>
        </ElTableColumn>
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
  import { computed, onMounted, ref } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { iamAccountApi, iamRoleApi, type IamAccount, type IamRole } from '@/api/iam'

  defineOptions({ name: 'IamAccount' })

  const loading = ref(false)
  const list = ref<IamAccount[]>([])
  const keyword = ref('')
  const statusFilter = ref('')

  const filtered = computed(() =>
    list.value.filter((a) => {
      if (statusFilter.value && a.status !== statusFilter.value) return false
      if (
        keyword.value &&
        !a.username.includes(keyword.value) &&
        !(a.displayName ?? '').includes(keyword.value)
      )
        return false
      return true
    })
  )

  async function load() {
    loading.value = true
    try {
      list.value = await iamAccountApi.list()
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

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
      await load()
    } finally {
      submitting.value = false
    }
  }

  // ---------- 状态动作 ----------

  async function withReload(fn: () => Promise<unknown>, successMsg?: string) {
    loading.value = true
    try {
      await fn()
      if (successMsg) ElMessage.success(successMsg)
      await load()
    } finally {
      loading.value = false
    }
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
      await load()
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
