<template>
  <div class="art-full-height">
    <ElCard class="art-table-card" :style="{ 'margin-top': '0' }">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton v-auth="'system:role:create'" type="primary" @click="openCreate">
              创建角色
            </ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <ArtTable :loading="loading" :data="data" :columns="columns"> </ArtTable>
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
              v-for="p in permissions"
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
        <ElButton type="primary" :loading="submittingEdit" @click="submitEdit">保存</ElButton>
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
          v-for="p in permissions"
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
  import { h, onMounted, ref } from 'vue'
  import { ElMessage, ElTag } from 'element-plus'
  import { ButtonMoreItem } from '@/components/core/forms/art-button-more/index.vue'
  import ArtButtonMore from '@/components/core/forms/art-button-more/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import { iamPermissionApi, iamRoleApi, type IamPermission, type IamRole } from '@/api/iam'
  import { wrapAll } from '@/views/iam/table'

  defineOptions({ name: 'IamRole' })

  // 权限全量清单：创建弹窗与权限编辑 Drawer 共用（DEPRECATED 灰置）
  const permissions = ref<IamPermission[]>([])

  async function loadPermissions() {
    permissions.value = await iamPermissionApi.list()
  }

  onMounted(loadPermissions)

  /** 全量列表接口返回裸数组：apiFn 内用 wrapAll 包装为标准信封，
   *  返回类型显式标注后 useTable 的 InferRecordType 才能推出 TRecord = IamRole
   *  （内联箭头函数会退化 TRecord = unknown；responseAdapter 则退化为 never） */
  function fetchRoles(): Promise<Api.Common.PaginatedResponse<IamRole>> {
    return iamRoleApi.list().then(wrapAll)
  }

  const { columns, columnChecks, data, loading, refreshData } = useTable({
    core: {
      apiFn: fetchRoles,
      columnsFactory: () => [
        {
          prop: 'code',
          label: '标识',
          minWidth: 150,
          sortable: true
        },
        {
          prop: 'name',
          label: '名称',
          minWidth: 140,
          sortable: true
        },
        {
          prop: 'scope',
          label: '范围',
          width: 100,
          sortable: true,
          formatter: (row: IamRole) =>
            h(ElTag, { type: row.scope === 'PLATFORM' ? 'danger' : 'primary' }, () =>
              row.scope === 'PLATFORM' ? '平台' : '代理商'
            )
        },
        {
          prop: 'agentId',
          label: '代理商ID',
          width: 100,
          sortable: true
        },
        {
          prop: 'builtIn',
          label: '内置',
          width: 80,
          sortable: true,
          formatter: (row: IamRole) =>
            row.builtIn ? h(ElTag, { size: 'small' }, () => '内置') : h('span')
        },
        {
          prop: 'status',
          label: '状态',
          width: 90,
          sortable: true,
          formatter: (row: IamRole) =>
            h(ElTag, { type: row.status === 'ACTIVE' ? 'success' : 'info' }, () =>
              row.status === 'ACTIVE' ? '启用' : '停用'
            )
        },
        {
          prop: 'permissionIds',
          label: '权限数',
          width: 90,
          sortable: true,
          formatter: (row: IamRole) => `${row.permissionIds.length} 项`
        },
        {
          prop: 'operation',
          label: '操作',
          width: 90,
          fixed: 'right',
          formatter: (row: IamRole) =>
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

  /** 按行状态构造操作项（ArtButtonMore 内置 per-item auth 过滤，无权限项自动隐藏）。
   *  IAM-3007 语义：内置角色不可编辑基本信息（不出现「编辑」项）；
   *  「删除」对内置角色为灰置占位（BR-IAM-042），不可触发。 */
  function operationList(row: IamRole): ButtonMoreItem[] {
    const list: ButtonMoreItem[] = []
    list.push({
      key: 'permissions',
      label: '编辑权限',
      icon: 'ri:shield-keyhole-line',
      auth: 'system:role:update'
    })
    if (!row.builtIn) {
      list.push({
        key: 'edit',
        label: '编辑',
        icon: 'ri:edit-2-line',
        auth: 'system:role:update'
      })
    } else {
      list.push({
        key: 'delete',
        label: '删除',
        icon: 'ri:delete-bin-4-line',
        color: '#f56c6c',
        disabled: true
      })
    }
    return list
  }

  function buttonMoreClick(item: ButtonMoreItem, row: IamRole) {
    switch (item.key) {
      case 'permissions':
        openPermissions(row)
        break
      case 'edit':
        openEdit(row)
        break
      // 'delete' 为内置角色灰置占位项，无操作
    }
  }

  /** 变更后刷新：旧页 load() 同时重拉角色与权限，此处等价并行刷新 */
  async function reloadAll() {
    await Promise.all([refreshData(), loadPermissions()])
  }

  // ---------- 创建 ----------

  const createVisible = ref(false)
  const submitting = ref(false)
  const createForm = ref({
    scope: 'PLATFORM' as 'PLATFORM' | 'AGENT',
    agentId: undefined as number | undefined,
    code: '',
    name: ''
  })
  const checkedPermIds = ref<number[]>([])

  function openCreate() {
    createForm.value = {
      scope: 'PLATFORM',
      agentId: undefined,
      code: '',
      name: ''
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
      await reloadAll()
    } finally {
      submitting.value = false
    }
  }

  // ---------- 编辑（仅非内置角色可编辑基本信息） ----------

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
      await reloadAll()
    } finally {
      submittingEdit.value = false
    }
  }

  // ---------- 权限编辑 Drawer（内置角色权限集可调，受授权边界约束） ----------

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
      await reloadAll()
    } finally {
      savingPerms.value = false
    }
  }
</script>
