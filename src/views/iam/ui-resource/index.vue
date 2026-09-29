<template>
  <div class="p-4">
    <ElCard shadow="never">
      <div class="mb-4 flex items-center justify-between">
        <ElAlert
          title="后端种子先行（003-3）：核心菜单由启动补种创建；本页为调整工具。按钮不转路由，折叠进父页面 meta.authList"
          type="info"
          :closable="false"
          style="flex: 1; margin-right: 16px"
        />
        <ElButton v-auth="'system:ui-resource:create'" type="primary" @click="openCreate(null)">
          新增根节点
        </ElButton>
      </div>

      <ArtTable
        :data="flat"
        :loading="loading"
        border
        row-key="id"
        default-expand-all
        :show-table-header="false"
      >
        <ElTableColumn prop="name" label="名称" min-width="200" />
        <ElTableColumn prop="code" label="标识" min-width="160" />
        <ElTableColumn label="类型" width="100">
          <template #default="{ row }">
            <ElTag :type="row.resourceType === 'MENU' ? 'primary' : 'info'" size="small">
              {{ row.resourceType }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="绑定权限" min-width="200">
          <template #default="{ row }">{{ permCode(row.permissionId) ?? '—（目录）' }}</template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="90">
          <template #default="{ row }">
            <ElTag :type="row.status === 'ACTIVE' ? 'success' : 'info'">
              {{ row.status === 'ACTIVE' ? '启用' : '停用' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <ElButton
              v-if="row.resourceType === 'MENU'"
              v-auth="'system:ui-resource:create'"
              link
              type="primary"
              @click="openCreate(row.id)"
            >
              加子节点
            </ElButton>
            <ElButton
              v-auth="'system:ui-resource:update'"
              link
              type="primary"
              @click="openEdit(row)"
            >
              编辑
            </ElButton>
          </template>
        </ElTableColumn>
      </ArtTable>
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
  import { computed, onMounted, ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import {
    iamPermissionApi,
    iamUiResourceApi,
    type IamPermission,
    type IamUiResource
  } from '@/api/iam'

  defineOptions({ name: 'IamUiResource' })

  const loading = ref(false)
  const flat = ref<IamUiResource[]>([])
  const permissions = ref<IamPermission[]>([])
  const activePerms = computed(() => permissions.value.filter((p) => p.status === 'ACTIVE'))

  function permCode(permissionId: number | null) {
    if (permissionId == null) return null
    return permissions.value.find((p) => p.id === permissionId)?.code ?? String(permissionId)
  }

  async function load() {
    loading.value = true
    try {
      flat.value = await iamUiResourceApi.list()
      permissions.value = await iamPermissionApi.list()
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

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
    flat.value
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
      await load()
    } finally {
      saving.value = false
    }
  }
</script>
