<template>
  <div class="p-4">
    <ElCard shadow="never">
      <div class="mb-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <ElSelect v-model="scopeFilter" placeholder="范围" clearable style="width: 140px">
            <ElOption label="平台" value="PLATFORM" />
            <ElOption label="代理商" value="AGENT" />
          </ElSelect>
        </div>
        <ElButton v-auth="'system:role:create'" type="primary" @click="openCreate">
          创建角色
        </ElButton>
      </div>

      <ElTable :data="filtered" v-loading="loading" border stripe>
        <ElTableColumn prop="code" label="标识" min-width="150" />
        <ElTableColumn prop="name" label="名称" min-width="140" />
        <ElTableColumn label="范围" width="100">
          <template #default="{ row }">
            <ElTag :type="row.scope === 'PLATFORM' ? 'danger' : 'primary'">
              {{ row.scope === 'PLATFORM' ? '平台' : '代理商' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="agentId" label="代理商ID" width="100" />
        <ElTableColumn label="内置" width="80">
          <template #default="{ row }">
            <ElTag v-if="row.builtIn" size="small">内置</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="权限数" width="90">
          <template #default="{ row }">{{ row.permissionIds.length }}</template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <ElButton
              v-auth="'system:role:update'"
              link
              type="primary"
              @click="openPermissions(row)"
            >
              编辑权限
            </ElButton>
            <ElButton v-if="!row.builtIn" v-auth="'system:role:update'" link @click="openEdit(row)">
              编辑
            </ElButton>
            <ElTooltip v-if="row.builtIn" content="内置角色不可删除（BR-IAM-042）" placement="top">
              <ElButton link disabled>删除</ElButton>
            </ElTooltip>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <!-- 创建角色 -->
    <ElDialog v-model="createVisible" title="创建角色" width="560px">
      <ElForm label-width="90px">
        <ElFormItem label="范围">
          <ElRadioGroup v-model="createForm.scope">
            <ElRadioButton value="PLATFORM">平台</ElRadioButton>
            <ElRadioButton value="AGENT">代理商</ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem v-if="createForm.scope === 'AGENT'" label="代理商ID" required>
          <ElInputNumber v-model="createForm.agentId" :min="1" />
        </ElFormItem>
        <ElFormItem label="标识" required>
          <ElInput v-model="createForm.code" />
        </ElFormItem>
        <ElFormItem label="名称" required>
          <ElInput v-model="createForm.name" />
        </ElFormItem>
        <ElFormItem label="权限">
          <ElSelect
            v-model="checkedPermIds"
            multiple
            filterable
            style="width: 100%"
            placeholder="选择权限（DEPRECATED 灰置）"
          >
            <ElOption
              v-for="p in selectablePerms"
              :key="p.id"
              :value="p.id"
              :label="`${p.code}（${p.name}）`"
              :disabled="p.status === 'DEPRECATED'"
            />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="createVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="submitCreate">创建</ElButton>
      </template>
    </ElDialog>

    <!-- 编辑角色 -->
    <ElDialog v-model="editVisible" title="编辑角色" width="560px">
      <ElForm label-width="90px">
        <ElFormItem label="名称">
          <ElInput v-model="editForm.name" />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElRadioGroup v-model="editForm.status">
            <ElRadioButton value="ACTIVE">启用</ElRadioButton>
            <ElRadioButton value="DISABLED">停用</ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="editVisible = false">取消</ElButton>
        <ElButton type="primary" @click="submitEdit">保存</ElButton>
      </template>
    </ElDialog>

    <!-- 权限编辑 Drawer -->
    <ElDrawer v-model="permVisible" title="编辑角色权限" size="480px">
      <ElAlert
        v-if="currentRole?.builtIn"
        title="内置角色：code/scope 不可改；权限集可调（受授权边界约束）"
        type="info"
        :closable="false"
        class="mb-3"
      />
      <ElSelect
        v-model="drawerPermIds"
        multiple
        filterable
        style="width: 100%"
        placeholder="选择权限"
      >
        <ElOption
          v-for="p in selectablePerms"
          :key="p.id"
          :value="p.id"
          :label="`${p.code}（${p.name}）`"
          :disabled="p.status === 'DEPRECATED'"
        />
      </ElSelect>
      <template #footer>
        <ElButton type="primary" :loading="savingPerms" @click="savePermissions">保存</ElButton>
      </template>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { iamPermissionApi, iamRoleApi, type IamPermission, type IamRole } from '@/api/iam'

  defineOptions({ name: 'IamRole' })

  const loading = ref(false)
  const list = ref<IamRole[]>([])
  const scopeFilter = ref('')
  const permissions = ref<IamPermission[]>([])

  const selectablePerms = computed(() => permissions.value)

  const filtered = computed(() =>
    list.value.filter((r) => !scopeFilter.value || r.scope === scopeFilter.value)
  )

  async function load() {
    loading.value = true
    try {
      list.value = await iamRoleApi.list()
      permissions.value = await iamPermissionApi.list()
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

  // ---------- 创建 ----------
  const createVisible = ref(false)
  const submitting = ref(false)
  const createForm = ref({
    scope: 'PLATFORM' as 'PLATFORM' | 'AGENT',
    agentId: undefined as number | undefined,
    code: '',
    name: '',
    builtIn: false
  })
  const checkedPermIds = ref<number[]>([])

  function openCreate() {
    createForm.value = {
      scope: 'PLATFORM',
      agentId: undefined,
      code: '',
      name: '',
      builtIn: false
    }
    checkedPermIds.value = []
    createVisible.value = true
  }

  async function submitCreate() {
    submitting.value = true
    try {
      await iamRoleApi.create({
        scope: createForm.value.scope,
        agentId: createForm.value.agentId,
        code: createForm.value.code,
        name: createForm.value.name,
        permissionIds: checkedPermIds.value
      })
      ElMessage.success('创建成功')
      createVisible.value = false
      await load()
    } finally {
      submitting.value = false
    }
  }

  // ---------- 编辑 ----------
  const editVisible = ref(false)
  const submittingEdit = ref(false)
  const editRole = ref<IamRole | null>(null)
  const editForm = ref({ name: '', status: 'ACTIVE' as 'ACTIVE' | 'DISABLED' })

  function openEdit(row: IamRole) {
    editRole.value = row
    editForm.value = { name: row.name, status: row.status }
    editVisible.value = true
  }

  async function submitEdit() {
    if (!editRole.value) return
    submittingEdit.value = true
    try {
      await iamRoleApi.update(editRole.value.id, {
        name: editForm.value.name,
        status: editForm.value.status
      })
      ElMessage.success('已保存')
      editVisible.value = false
      await load()
    } finally {
      submittingEdit.value = false
    }
  }

  // ---------- 权限编辑 Drawer ----------

  const permVisible = ref(false)
  const savingPerms = ref(false)
  const currentRole = ref<IamRole | null>(null)
  const drawerPermIds = ref<number[]>([])
  const drawerOriginalIds = ref<number[]>([])

  function openPermissions(row: IamRole) {
    currentRole.value = row
    drawerPermIds.value = [...row.permissionIds]
    drawerOriginalIds.value = [...row.permissionIds]
    permVisible.value = true
  }

  async function savePermissions() {
    if (!currentRole.value) return
    savingPerms.value = true
    try {
      const roleId = currentRole.value.id
      const target = new Set(drawerPermIds.value)
      const current = new Set(drawerOriginalIds.value)
      for (const pid of target) {
        if (!current.has(pid)) await iamRoleApi.addPermission(roleId, pid)
      }
      for (const pid of current) {
        if (!target.has(pid)) await iamRoleApi.removePermission(roleId, pid)
      }
      ElMessage.success('已保存')
      permVisible.value = false
      await load()
    } finally {
      savingPerms.value = false
    }
  }
</script>
