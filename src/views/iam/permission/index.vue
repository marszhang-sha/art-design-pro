<template>
  <div class="art-full-height">
    <ElCard class="art-table-card" :style="{ 'margin-top': '0' }">
      <ElTabs v-model="activeTab">
        <ElTabPane label="权限注册表" name="registry">
          <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
            <template #left>
              <ElSpace wrap>
                <ElButton v-auth="'system:permission:create'" type="primary" @click="openCreate">
                  新建权限
                </ElButton>
              </ElSpace>
            </template>
          </ArtTableHeader>

          <ArtTable :loading="loading" :data="data" :columns="columns"> </ArtTable>
        </ElTabPane>

        <ElTabPane label="废弃治理看板" name="dashboard">
          <ElAlert
            title="废弃权限的存量引用需在下一发布周期内清零（003-2）；计数=仍绑定该权限的角色数"
            type="info"
            :closable="false"
            class="mb-3"
          />
          <ArtTable :data="dashboard" :loading="dashboardLoading" border :show-table-header="false">
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
  import { computed, h, onMounted, ref } from 'vue'
  import { ElMessage, ElMessageBox, ElTag } from 'element-plus'
  import { ButtonMoreItem } from '@/components/core/forms/art-button-more/index.vue'
  import ArtButtonMore from '@/components/core/forms/art-button-more/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import { iamPermissionApi, type IamPermission } from '@/api/iam'
  import { wrapAll } from '@/views/iam/table'

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

  const activeTab = ref('registry')

  /** 全量列表接口返回裸数组：apiFn 内用 wrapAll 包装为标准信封，
   *  返回类型显式标注后 useTable 的 InferRecordType 才能推出 TRecord = IamPermission
   *  （内联箭头函数会退化 TRecord = unknown；responseAdapter 则退化为 never） */
  function fetchPermissions(): Promise<Api.Common.PaginatedResponse<IamPermission>> {
    return iamPermissionApi.list().then(wrapAll)
  }

  const { columns, columnChecks, data, loading, refreshData } = useTable({
    core: {
      apiFn: fetchPermissions,
      columnsFactory: () => [
        {
          prop: 'code',
          label: '权限码',
          minWidth: 220,
          sortable: true
        },
        {
          prop: 'name',
          label: '名称',
          minWidth: 140,
          sortable: true
        },
        {
          prop: 'namespace',
          label: '命名空间',
          width: 130,
          sortable: true
        },
        {
          prop: 'resource',
          label: '资源',
          minWidth: 120,
          sortable: true
        },
        {
          prop: 'action',
          label: '动作',
          width: 100,
          sortable: true
        },
        {
          prop: 'description',
          label: '描述',
          minWidth: 150,
          sortable: true,
          showOverflowTooltip: true
        },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          sortable: true,
          formatter: (row: IamPermission) =>
            h(ElTag, { type: row.status === 'ACTIVE' ? 'success' : 'info' }, () =>
              row.status === 'ACTIVE' ? '有效' : '已废弃'
            )
        },
        {
          prop: 'operation',
          label: '操作',
          width: 90,
          fixed: 'right',
          formatter: (row: IamPermission) =>
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
   *  仅 ACTIVE 行有「废弃」——契约只定义废弃单向语义（BR-IAM-034/IAM-3006），
   *  无任何规范授权 DEPRECATED→ACTIVE 重新启用，故不提供「启用」项。 */
  function operationList(row: IamPermission): ButtonMoreItem[] {
    const list: ButtonMoreItem[] = []
    if (row.status === 'ACTIVE') {
      list.push({
        key: 'deprecate',
        label: '废弃',
        icon: 'ri:forbid-line',
        color: '#f56c6c',
        auth: 'system:permission:update'
      })
    }
    return list
  }

  function buttonMoreClick(item: ButtonMoreItem, row: IamPermission) {
    switch (item.key) {
      case 'deprecate':
        onDeprecate(row)
        break
    }
  }

  // ---------- 废弃治理看板（003-2：存量引用清零跟踪） ----------

  interface DeprecatedGrantRow {
    permissionId: number
    code: string
    activeGrants: number
  }

  const dashboardLoading = ref(false)
  const dashboard = ref<DeprecatedGrantRow[]>([])

  async function loadDashboard() {
    dashboardLoading.value = true
    try {
      dashboard.value = await iamPermissionApi.deprecatedGrants()
    } finally {
      dashboardLoading.value = false
    }
  }

  onMounted(loadDashboard)

  /** 变更后刷新：旧页 load() 同时重拉注册表与看板，此处等价并行刷新 */
  async function reloadAll() {
    await Promise.all([refreshData(), loadDashboard()])
  }

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
      await reloadAll()
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
        await reloadAll()
      })
      .catch(() => undefined)
  }
</script>

<style lang="scss" scoped>
  // ElTabs 默认无高度约束，会打断 .art-table-card → .el-card__body 的高度链，
  // 导致 .art-table 的 100% 容器高度失效、表格按自然高度渲染被卡片裁剪。
  // 补齐 tabs → content → pane 的 flex/height 链，启用 ElTable 内部滚动（固定表头 + 表体滚动）。
  :deep(.el-tabs) {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  :deep(.el-tabs__content) {
    flex: 1;
    min-height: 0; // 允许收缩，溢出交给内部滚动
  }

  :deep(.el-tab-pane) {
    height: 100%;
  }
</style>
