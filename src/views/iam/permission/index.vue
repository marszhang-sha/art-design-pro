<template>
  <div class="p-4">
    <ElCard shadow="never">
      <ElTabs v-model="activeTab">
        <ElTabPane label="权限注册表" name="registry">
          <div class="mb-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <ElSelect v-model="nsFilter" placeholder="命名空间" clearable style="width: 160px">
                <ElOption v-for="ns in NAMESPACES" :key="ns" :value="ns" :label="ns" />
              </ElSelect>
              <ElInput
                v-model="keyword"
                placeholder="搜索 code/名称"
                clearable
                style="width: 220px"
              />
            </div>
            <ElButton v-auth="'system:permission:create'" type="primary" @click="openCreate">
              注册权限
            </ElButton>
          </div>

          <ArtTable :data="filtered" :loading="loading" border stripe :show-table-header="false">
            <ElTableColumn prop="code" label="权限码" min-width="220" />
            <ElTableColumn prop="name" label="名称" min-width="140" />
            <ElTableColumn prop="namespace" label="命名空间" width="130" />
            <ElTableColumn label="状态" width="110">
              <template #default="{ row }">
                <ElTag :type="row.status === 'ACTIVE' ? 'success' : 'info'">
                  {{ row.status === 'ACTIVE' ? '有效' : '已废弃' }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <ElButton
                  v-if="row.status === 'ACTIVE'"
                  v-auth="'system:permission:update'"
                  link
                  type="danger"
                  @click="onDeprecate(row)"
                >
                  废弃
                </ElButton>
              </template>
            </ElTableColumn>
          </ArtTable>
        </ElTabPane>

        <ElTabPane label="废弃治理看板" name="dashboard">
          <ElAlert
            title="废弃权限的存量引用需在下一发布周期内清零（003-2）；计数=仍绑定该权限的角色数"
            type="info"
            :closable="false"
            class="mb-3"
          />
          <ArtTable :data="dashboard" :loading="loading" border :show-table-header="false">
            <ElTableColumn prop="code" label="权限码" min-width="220" />
            <ElTableColumn prop="activeGrants" label="存量角色引用数" width="160" />
            <ElTableColumn label="状态" width="140">
              <template #default="{ row }">
                <ElTag :type="row.activeGrants > 0 ? 'warning' : 'success'">
                  {{ row.activeGrants > 0 ? '待清零' : '已清零' }}
                </ElTag>
              </template>
            </ElTableColumn>
          </ArtTable>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <!-- 注册权限 -->
    <ElDialog v-model="createVisible" title="注册权限" width="520px">
      <ElForm label-width="90px">
        <ElFormItem label="命名空间" required>
          <ElSelect v-model="form.namespace" style="width: 100%">
            <ElOption v-for="ns in NAMESPACES" :key="ns" :value="ns" :label="ns" />
          </ElSelect>
          <div class="mt-1 text-xs text-gray-400"
            >封闭清单，新增须经平台管理员注册（BR-IAM-030）</div
          >
        </ElFormItem>
        <ElFormItem label="资源" required>
          <ElInput v-model="form.resource" />
        </ElFormItem>
        <ElFormItem label="动作" required>
          <ElInput v-model="form.action" />
        </ElFormItem>
        <ElFormItem label="权限码">
          <ElInput :model-value="previewCode" disabled />
        </ElFormItem>
        <ElFormItem label="名称" required>
          <ElInput v-model="form.name" />
        </ElFormItem>
        <ElFormItem label="描述">
          <ElInput v-model="form.description" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="createVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="submitCreate">注册</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { iamPermissionApi, type IamPermission } from '@/api/iam'

  defineOptions({ name: 'IamPermission' })

  const NAMESPACES = [
    'system',
    'agent',
    'cooperation',
    'coverage',
    'resource',
    'performance',
    'collaboration',
    'compliance'
  ]

  const loading = ref(false)
  const list = ref<IamPermission[]>([])
  const activeTab = ref('registry')
  const nsFilter = ref('')
  const keyword = ref('')

  const dashboard = ref<{ permissionId: number; code: string; activeGrants: number }[]>([])

  const filtered = computed(() =>
    list.value.filter((p) => {
      if (nsFilter.value && p.namespace !== nsFilter.value) return false
      if (keyword.value && !p.code.includes(keyword.value) && !p.name.includes(keyword.value))
        return false
      return true
    })
  )

  async function load() {
    loading.value = true
    try {
      list.value = await iamPermissionApi.list()
      dashboard.value = await iamPermissionApi.deprecatedGrants()
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

  // ---------- 注册 ----------
  const createVisible = ref(false)
  const submitting = ref(false)
  const form = ref({
    namespace: 'system',
    resource: '',
    action: '',
    name: '',
    description: ''
  })

  const previewCode = computed(
    () => `${form.value.namespace}:${form.value.resource}:${form.value.action}`
  )

  function openCreate() {
    form.value = { namespace: 'system', resource: '', action: '', name: '', description: '' }
    createVisible.value = true
  }

  async function submitCreate() {
    submitting.value = true
    try {
      await iamPermissionApi.create({
        namespace: form.value.namespace,
        resource: form.value.resource,
        action: form.value.action,
        name: form.value.name,
        description: form.value.description || undefined
      })
      ElMessage.success('注册成功')
      createVisible.value = false
      await load()
    } finally {
      submitting.value = false
    }
  }

  // ---------- 废弃 ----------

  function onDeprecate(row: IamPermission) {
    ElMessageBox.confirm(
      `废弃 ${row.code}？废弃后不可用于新授权，存量授权不自动撤销（BR-IAM-034）。`,
      '废弃确认',
      { type: 'warning' }
    )
      .then(async () => {
        await iamPermissionApi.updateStatus(row.id, 'DEPRECATED')
        ElMessage.success('已废弃')
        await load()
      })
      .catch(() => undefined)
  }
</script>
