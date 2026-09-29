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
          <ElButton @click="load">刷新</ElButton>
        </div>
        <ElButton v-auth="'agent:account:create'" type="primary" @click="openCreate">
          创建子账号
        </ElButton>
      </div>

      <ArtTable :data="filtered" :loading="loading" border stripe :show-table-header="false">
        <ElTableColumn prop="username" label="用户名" min-width="140" />
        <ElTableColumn prop="displayName" label="显示名" min-width="120" />
        <ElTableColumn label="状态" width="100">
          <template #default="{ row }">
            <ElTag :type="row.status === 'ACTIVE' ? 'success' : 'danger'">
              {{ row.status === 'ACTIVE' ? '正常' : '已停用' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" min-width="240">
          <template #default="{ row }">
            <ElButton
              v-if="row.status === 'ACTIVE'"
              v-auth="'agent:account:disable'"
              link
              type="danger"
              @click="onDisable(row)"
            >
              停用
            </ElButton>
            <ElButton
              v-auth="'agent:account:reset-password'"
              link
              type="primary"
              @click="onResetPassword(row)"
            >
              重置密码
            </ElButton>
            <ElButton v-auth="'agent:role:assign'" link type="primary" @click="openRoles(row)">
              授权
            </ElButton>
          </template>
        </ElTableColumn>
      </ArtTable>
    </ElCard>

    <!-- 创建子账号 -->
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

    <!-- 临时密码 -->
    <ElDialog v-model="tempVisible" title="重置成功" width="420px">
      <ElAlert title="临时密码（仅显示一次；首登强制改密）" type="warning" :closable="false" />
      <p class="mt-2 select-all font-mono text-lg">{{ tempPassword }}</p>
      <template #footer>
        <ElButton type="primary" @click="tempVisible = false">我已保存</ElButton>
      </template>
    </ElDialog>

    <!-- 授权 Drawer -->
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
  import { computed, onMounted, ref } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import {
    iamAgentRoleApi,
    iamAuthApi,
    iamSubAccountApi,
    type IamAccount,
    type IamRole
  } from '@/api/iam'

  defineOptions({ name: 'IamSubAccount' })

  const loading = ref(false)
  const list = ref<IamAccount[]>([])
  const keyword = ref('')
  const self = ref<IamAccount | null>(null)
  const agentId = computed(() => Number(self.value?.agentId))

  const filtered = computed(() =>
    list.value.filter(
      (a) =>
        !a.isMaster &&
        (!keyword.value ||
          a.username.includes(keyword.value) ||
          (a.displayName ?? '').includes(keyword.value))
    )
  )

  async function load() {
    loading.value = true
    try {
      if (!self.value) {
        self.value = await iamAuthApi.me()
      }
      list.value = await iamSubAccountApi.list(agentId.value)
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

  // ---------- 创建 ----------
  const createVisible = ref(false)
  const submitting = ref(false)
  const form = ref({ username: '', displayName: '', mobile: '', email: '' })

  function openCreate() {
    form.value = { username: '', displayName: '', mobile: '', email: '' }
    createVisible.value = true
  }

  async function submitCreate() {
    if (!self.value) return
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
      await load()
    } finally {
      submitting.value = false
    }
  }

  // ---------- 状态 / 重置 ----------

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
    ElMessageBox.confirm(`确认停用 ${row.username}？（离职/失效停用，不删除）`, '停用确认', {
      type: 'warning'
    })
      .then(() => withReload(() => iamSubAccountApi.disable(agentId.value, row.id), '已停用'))
      .catch(() => undefined)
  }

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

  // ---------- 授权 ----------

  const rolesVisible = ref(false)
  const savingRoles = ref(false)
  const rolesAccount = ref<IamAccount | null>(null)
  const selectedRoleIds = ref<number[]>([])
  const originalRoleIds = ref<number[]>([])
  const assignableRoles = ref<IamRole[]>([])

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
      await load()
    } finally {
      savingRoles.value = false
    }
  }
</script>
