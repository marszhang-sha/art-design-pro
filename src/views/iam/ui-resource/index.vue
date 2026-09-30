<template>
  <div class="art-full-height">
    <ElCard class="art-table-card" :style="{ 'margin-top': '0' }">
      <ElAlert
        class="mb-3"
        title="后端种子先行（003-3）：核心菜单由启动补种创建；本页为调整工具。按钮不转路由，折叠进父页面 meta.authList"
        type="info"
        :closable="false"
      />

      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElButton v-auth="'system:ui-resource:create'" type="primary" @click="openCreate(null)">
              新建资源
            </ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <!-- 全量列表接口：扁平展示（parentId 列保留层级可读性），无服务端分页 -->
      <ArtTable :loading="loading" :data="data" :columns="columns"> </ArtTable>
    </ElCard>

    <!-- 创建/编辑 -->
    <ElDialog v-model="dialogVisible" :title="dialogTitle" width="560px">
      <ElForm label-width="100px">
        <ElFormItem label="标识" required>
          <ElInput v-model="form.code" :disabled="editing" />
        </ElFormItem>
        <ElFormItem label="名称" required>
          <ElInput v-model="form.name" />
        </ElFormItem>
        <ElFormItem label="类型" required>
          <ElRadioGroup v-model="form.resourceType">
            <ElRadioButton value="MENU">菜单</ElRadioButton>
            <ElRadioButton value="BUTTON">按钮</ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="父节点">
          <ElTreeSelect
            v-model="form.parentId"
            :data="parentOptions"
            check-strictly
            style="width: 100%"
            placeholder="无（根节点）"
            clearable
          />
        </ElFormItem>
        <ElFormItem label="绑定权限">
          <ElSelect
            v-model="form.permissionId"
            clearable
            filterable
            style="width: 100%"
            placeholder="目录留空；页面/按钮至多一个（044）"
          >
            <ElOption
              v-for="p in activePerms"
              :key="p.id"
              :value="p.id"
              :label="p.code"
              :disabled="p.status === 'DEPRECATED'"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="路由">
          <ElInput v-model="form.route" placeholder="如 /iam/account" />
        </ElFormItem>
        <ElFormItem label="排序">
          <ElInputNumber v-model="form.sortOrder" :min="0" />
        </ElFormItem>
        <ElFormItem label="状态">
          <ElRadioGroup v-model="form.status">
            <ElRadioButton value="ACTIVE">启用</ElRadioButton>
            <ElRadioButton value="DISABLED">停用</ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="submit">保存</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { computed, h, onMounted, ref } from 'vue'
  import { ElMessage, ElTag } from 'element-plus'
  import { ButtonMoreItem } from '@/components/core/forms/art-button-more/index.vue'
  import ArtButtonMore from '@/components/core/forms/art-button-more/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import {
    iamPermissionApi,
    iamUiResourceApi,
    type IamPermission,
    type IamUiResource
  } from '@/api/iam'
  import { wrapAll } from '@/views/iam/table'

  defineOptions({ name: 'IamUiResource' })

  // 权限字典（绑定权限列显示与下拉用），随页面挂载加载一次
  const permissions = ref<IamPermission[]>([])
  const activePerms = computed(() => permissions.value.filter((p) => p.status === 'ACTIVE'))

  onMounted(async () => {
    permissions.value = await iamPermissionApi.list()
  })

  function permCode(permissionId: number | null) {
    if (permissionId == null) return null
    return permissions.value.find((p) => p.id === permissionId)?.code ?? String(permissionId)
  }

  /** 全量列表接口：apiFn 内用 wrapAll 归一为标准信封并显式标注返回类型，
   *  useTable 的 InferRecordType 才能推出 TRecord = IamUiResource
   *  （内联箭头函数会退化 TRecord = unknown；responseAdapter 则退化为 never） */
  function fetchUiResources(): Promise<Api.Common.PaginatedResponse<IamUiResource>> {
    return iamUiResourceApi.list().then(wrapAll)
  }

  const { columns, columnChecks, data, loading, refreshData } = useTable({
    core: {
      apiFn: fetchUiResources,
      columnsFactory: () => [
        {
          prop: 'code',
          label: '标识',
          minWidth: 160,
          sortable: true
        },
        {
          prop: 'name',
          label: '名称',
          minWidth: 200,
          sortable: true
        },
        {
          prop: 'resourceType',
          label: '类型',
          width: 100,
          sortable: true,
          formatter: (row: IamUiResource) =>
            h(ElTag, { type: row.resourceType === 'MENU' ? 'primary' : 'warning' }, () =>
              row.resourceType === 'MENU' ? '菜单' : '按钮'
            )
        },
        {
          prop: 'parentId',
          label: '父节点ID',
          width: 100,
          sortable: true,
          formatter: (row: IamUiResource) => (row.parentId == null ? '—' : String(row.parentId))
        },
        {
          prop: 'route',
          label: '路由',
          minWidth: 140,
          showOverflowTooltip: true,
          formatter: (row: IamUiResource) => row.route ?? '—'
        },
        {
          prop: 'sortOrder',
          label: '排序',
          width: 90,
          sortable: true
        },
        {
          prop: 'permissionId',
          label: '绑定权限',
          minWidth: 200,
          showOverflowTooltip: true,
          formatter: (row: IamUiResource) => permCode(row.permissionId) ?? '—（目录）'
        },
        {
          prop: 'status',
          label: '状态',
          width: 90,
          sortable: true,
          formatter: (row: IamUiResource) =>
            h(ElTag, { type: row.status === 'ACTIVE' ? 'success' : 'info' }, () =>
              row.status === 'ACTIVE' ? '启用' : '停用'
            )
        },
        {
          prop: 'operation',
          label: '操作',
          width: 90,
          fixed: 'right',
          formatter: (row: IamUiResource) =>
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
   *  状态启停在编辑弹窗内（走 update 码，ui-resource 无独立状态按钮码） */
  function operationList(row: IamUiResource): ButtonMoreItem[] {
    const list: ButtonMoreItem[] = []
    if (row.resourceType === 'MENU') {
      list.push({
        key: 'addChild',
        label: '加子节点',
        icon: 'ri:add-line',
        auth: 'system:ui-resource:create'
      })
    }
    list.push({
      key: 'edit',
      label: '编辑',
      icon: 'ri:edit-2-line',
      auth: 'system:ui-resource:update'
    })
    return list
  }

  function buttonMoreClick(item: ButtonMoreItem, row: IamUiResource) {
    switch (item.key) {
      case 'addChild':
        openCreate(row.id)
        break
      case 'edit':
        openEdit(row)
        break
    }
  }

  // ---------- 创建 / 编辑 ----------

  const dialogVisible = ref(false)
  const editing = ref(false)
  const saving = ref(false)
  const editingId = ref<number | null>(null)
  const dialogTitle = ref('新增')
  const form = ref({
    code: '',
    name: '',
    resourceType: 'MENU' as 'MENU' | 'BUTTON',
    parentId: null as number | null,
    route: '',
    component: '',
    icon: '',
    sortOrder: 0,
    permissionId: null as number | null,
    status: 'ACTIVE' as 'ACTIVE' | 'DISABLED'
  })

  const parentOptions = computed(() =>
    data.value
      .filter((n) => n.resourceType === 'MENU' && n.id !== editingId.value)
      .map((n) => ({ value: n.id, label: `${n.name}（${n.code}）` }))
  )

  function openCreate(parentId: number | null) {
    editing.value = false
    editingId.value = null
    form.value = {
      code: '',
      name: '',
      resourceType: 'MENU',
      parentId,
      route: '',
      component: '',
      icon: '',
      sortOrder: 0,
      permissionId: null,
      status: 'ACTIVE'
    }
    dialogTitle.value = parentId == null ? '新增根菜单' : '新增子节点'
    dialogVisible.value = true
  }

  function openEdit(row: IamUiResource) {
    editing.value = true
    editingId.value = row.id
    form.value = {
      code: row.code,
      name: row.name,
      resourceType: row.resourceType,
      parentId: row.parentId,
      route: row.route ?? '',
      component: row.component ?? '',
      icon: row.icon ?? '',
      sortOrder: row.sortOrder,
      permissionId: row.permissionId,
      status: row.status
    }
    dialogTitle.value = `编辑：${row.name}`
    dialogVisible.value = true
  }

  async function submit() {
    if (!form.value.code || !form.value.name) {
      ElMessage.warning('标识与名称必填')
      return
    }
    saving.value = true
    try {
      if (editing.value && editingId.value != null) {
        await iamUiResourceApi.update(editingId.value, {
          name: form.value.name,
          parentId: form.value.parentId === null ? undefined : form.value.parentId,
          route: form.value.route || undefined,
          component: form.value.component || undefined,
          icon: form.value.icon || undefined,
          sortOrder: form.value.sortOrder,
          permissionId: form.value.permissionId ?? undefined,
          status: form.value.status
        })
        ElMessage.success('已保存')
      } else {
        await iamUiResourceApi.create({
          code: form.value.code,
          name: form.value.name,
          resourceType: form.value.resourceType,
          parentId: form.value.parentId === null ? undefined : form.value.parentId,
          route: form.value.route || undefined,
          component: form.value.component || undefined,
          icon: form.value.icon || undefined,
          sortOrder: form.value.sortOrder,
          permissionId: form.value.permissionId ?? undefined
        })
        ElMessage.success('已创建')
      }
      dialogVisible.value = false
      refreshData()
    } finally {
      saving.value = false
    }
  }
</script>
