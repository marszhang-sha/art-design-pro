<template>
  <div class="art-full-height">
    <ElCard class="art-table-card" :style="{ 'margin-top': '0' }">
      <ElAlert
        class="mb-3"
        title="模板内容先建后配（003-1）；套用入口在「功能开通」页。停用模板不可套用，已授代理商不受影响（BR-IAM-051）"
        type="info"
        :closable="false"
      />

      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton
              v-auth="'system:entitlement-template:create'"
              type="primary"
              @click="openCreate"
            >
              创建模板
            </ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <!-- 全量列表接口：无服务端分页，不渲染分页栏 -->
      <ArtTable :loading="loading" :data="data" :columns="columns"> </ArtTable>
    </ElCard>

    <!-- 新建模板 -->
    <ElDialog v-model="createVisible" title="新建授权模板" width="480px">
      <ElForm label-width="80px">
        <ElFormItem label="标识" required>
          <ElInput v-model="form.code" />
        </ElFormItem>
        <ElFormItem label="名称" required>
          <ElInput v-model="form.name" placeholder="如：CSO 标准套餐" />
        </ElFormItem>
        <ElFormItem label="描述">
          <ElInput v-model="form.description" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="createVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="submitCreate">创建</ElButton>
      </template>
    </ElDialog>

    <!-- 权限项编辑 Drawer -->
    <ElDrawer v-model="itemsVisible" :title="`权限项 — ${current?.name ?? ''}`" size="480px">
      <ElSelect
        v-model="pickedPermId"
        filterable
        style="width: 100%"
        placeholder="添加权限（DEPRECATED 灰置）"
        @change="onAddItem"
      >
        <ElOption
          v-for="p in selectablePerms"
          :key="p.id"
          :value="p.id"
          :label="`${p.code}（${p.name}）`"
          :disabled="p.status === 'DEPRECATED'"
        />
      </ElSelect>
      <ArtTable :data="itemRows" class="mt-3" border size="small" :show-table-header="false">
        <ElTableColumn prop="code" label="权限码" min-width="180" />
        <ElTableColumn label="操作" width="80">
          <template #default="{ row }">
            <ElButton
              v-auth="'system:entitlement-template:update'"
              link
              type="danger"
              @click="onRemoveItem(row.permissionId)"
            >
              移除
            </ElButton>
          </template>
        </ElTableColumn>
      </ArtTable>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { computed, h, onMounted, ref } from 'vue'
  import { ElMessage, ElMessageBox, ElTag } from 'element-plus'
  import { ButtonMoreItem } from '@/components/core/forms/art-button-more/index.vue'
  import ArtButtonMore from '@/components/core/forms/art-button-more/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import {
    iamPermissionApi,
    iamTemplateApi,
    type IamEntitlementTemplate,
    type IamPermission
  } from '@/api/iam'
  import { wrapAll } from '@/views/iam/table'

  defineOptions({ name: 'IamEntitlementTemplate' })

  // 权限字典（Drawer 添加/移除权限项用），随页面挂载加载一次
  const permissions = ref<IamPermission[]>([])

  const selectablePerms = computed(() => permissions.value)

  onMounted(async () => {
    permissions.value = await iamPermissionApi.list()
  })

  /** 全量列表接口：apiFn 内用 wrapAll 归一为标准信封并显式标注返回类型，
   *  useTable 的 InferRecordType 才能推出 TRecord = IamEntitlementTemplate
   *  （内联箭头函数会退化 TRecord = unknown；responseAdapter 则退化为 never） */
  function fetchTemplates(): Promise<Api.Common.PaginatedResponse<IamEntitlementTemplate>> {
    return iamTemplateApi.list().then(wrapAll)
  }

  const { columns, columnChecks, data, loading, refreshData } = useTable({
    core: {
      apiFn: fetchTemplates,
      columnsFactory: () => [
        {
          prop: 'code',
          label: '标识',
          minWidth: 140,
          sortable: true
        },
        {
          prop: 'name',
          label: '名称',
          minWidth: 160,
          sortable: true
        },
        {
          prop: 'description',
          label: '描述',
          minWidth: 200,
          showOverflowTooltip: true
        },
        {
          prop: 'permissionIds',
          label: '权限项',
          width: 100,
          formatter: (row: IamEntitlementTemplate) => `${row.permissionIds.length} 项`
        },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          sortable: true,
          formatter: (row: IamEntitlementTemplate) =>
            h(ElTag, { type: row.status === 'ACTIVE' ? 'success' : 'info' }, () =>
              row.status === 'ACTIVE' ? '启用' : '停用'
            )
        },
        {
          prop: 'operation',
          label: '操作',
          width: 90,
          fixed: 'right',
          formatter: (row: IamEntitlementTemplate) =>
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
   *  停用/启用共用种子按钮码 system:entitlement-template:disable（种子仅设停用按钮节点） */
  function operationList(row: IamEntitlementTemplate): ButtonMoreItem[] {
    const list: ButtonMoreItem[] = [
      {
        key: 'items',
        label: '编辑权限项',
        icon: 'ri:list-settings-line',
        auth: 'system:entitlement-template:update'
      }
    ]
    if (row.status === 'ACTIVE') {
      list.push({
        key: 'disable',
        label: '停用',
        icon: 'ri:forbid-line',
        color: '#f56c6c',
        auth: 'system:entitlement-template:disable'
      })
    } else {
      list.push({
        key: 'enable',
        label: '启用',
        icon: 'ri:play-circle-line',
        color: '#67c23a',
        auth: 'system:entitlement-template:disable'
      })
    }
    return list
  }

  function buttonMoreClick(item: ButtonMoreItem, row: IamEntitlementTemplate) {
    switch (item.key) {
      case 'items':
        openItems(row)
        break
      case 'disable':
        onDisable(row)
        break
      case 'enable':
        onEnable(row)
        break
    }
  }

  // ---------- 新建 ----------
  const createVisible = ref(false)
  const submitting = ref(false)
  const form = ref({ code: '', name: '', description: '' })

  function openCreate() {
    form.value = { code: '', name: '', description: '' }
    createVisible.value = true
  }

  async function submitCreate() {
    submitting.value = true
    try {
      await iamTemplateApi.create({
        code: form.value.code,
        name: form.value.name,
        description: form.value.description || undefined
      })
      ElMessage.success('模板已创建（权限项请在「编辑权限项」中添加）')
      createVisible.value = false
      refreshData()
    } finally {
      submitting.value = false
    }
  }

  // ---------- 状态 ----------

  async function withReload(fn: () => Promise<unknown>, successMsg?: string) {
    await fn()
    if (successMsg) ElMessage.success(successMsg)
    refreshData()
  }

  function onDisable(row: IamEntitlementTemplate) {
    ElMessageBox.confirm(
      '停用后模板不可套用；已授代理商不受影响（快照制，BR-IAM-051）。确认停用？',
      '停用确认',
      { type: 'warning' }
    )
      .then(() => withReload(() => iamTemplateApi.updateStatus(row.id, 'DISABLED'), '已停用'))
      .catch(() => undefined)
  }

  function onEnable(row: IamEntitlementTemplate) {
    withReload(() => iamTemplateApi.updateStatus(row.id, 'ACTIVE'), '已启用')
  }

  // ---------- 权限项编辑 ----------

  const itemsVisible = ref(false)
  const current = ref<IamEntitlementTemplate | null>(null)
  const pickedPermId = ref<number | null>(null)
  const itemRows = ref<{ permissionId: number; code: string }[]>([])

  async function openItems(row: IamEntitlementTemplate) {
    current.value = row
    const tpl = await iamTemplateApi.get(row.id)
    itemRows.value = []
    for (const pid of tpl.permissionIds) {
      const p = permissions.value.find((x) => x.id === pid)
      itemRows.value.push({ permissionId: pid, code: p ? p.code : String(pid) })
    }
    itemsVisible.value = true
  }

  async function onAddItem(permissionId: number) {
    if (!current.value || permissionId == null) return
    await iamTemplateApi.addItem(current.value.id, permissionId)
    itemRows.value.push({
      permissionId,
      code: permissions.value.find((p) => p.id === permissionId)?.code ?? String(permissionId)
    })
    pickedPermId.value = null
    ElMessage.success('已添加')
  }

  async function onRemoveItem(permissionId: number) {
    if (!current.value) return
    await iamTemplateApi.removeItem(current.value.id, permissionId)
    itemRows.value = itemRows.value.filter((r) => r.permissionId !== permissionId)
    ElMessage.success('已移除')
  }
</script>
