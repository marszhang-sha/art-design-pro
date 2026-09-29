<template>
  <div class="p-4">
    <ElCard shadow="never">
      <div class="mb-4 flex items-center justify-between">
        <ElAlert
          title="模板内容先建后配（003-1）；套用入口在「功能开通」页。停用模板不可套用，已授代理商不受影响（BR-IAM-051）"
          type="info"
          :closable="false"
          style="flex: 1; margin-right: 16px"
        />
        <ElButton v-auth="'system:entitlement-template:create'" type="primary" @click="openCreate">
          新建模板
        </ElButton>
      </div>

      <ArtTable :data="list" :loading="loading" border stripe :show-table-header="false">
        <ElTableColumn prop="code" label="标识" min-width="140" />
        <ElTableColumn prop="name" label="名称" min-width="160" />
        <ElTableColumn prop="description" label="描述" min-width="200" />
        <ElTableColumn label="权限项" width="100">
          <template #default="{ row }">{{ row.permissionIds.length }}</template>
        </ElTableColumn>
        <ElTableColumn label="状态" width="100">
          <template #default="{ row }">
            <ElTag :type="row.status === 'ACTIVE' ? 'success' : 'info'">
              {{ row.status === 'ACTIVE' ? '启用' : '停用' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <ElButton
              v-auth="'system:entitlement-template:update'"
              link
              type="primary"
              @click="openItems(row)"
            >
              编辑权限项
            </ElButton>
            <ElButton
              v-if="row.status === 'ACTIVE'"
              v-auth="'system:entitlement-template:disable'"
              link
              type="danger"
              @click="onDisable(row)"
            >
              停用
            </ElButton>
            <ElButton
              v-if="row.status === 'DISABLED'"
              v-auth="'system:entitlement-template:update'"
              link
              type="success"
              @click="onEnable(row)"
            >
              启用
            </ElButton>
          </template>
        </ElTableColumn>
      </ArtTable>
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
  import { computed, onMounted, ref } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import {
    iamPermissionApi,
    iamTemplateApi,
    type IamEntitlementTemplate,
    type IamPermission
  } from '@/api/iam'

  defineOptions({ name: 'IamEntitlementTemplate' })

  const loading = ref(false)
  const list = ref<IamEntitlementTemplate[]>([])
  const permissions = ref<IamPermission[]>([])

  const selectablePerms = computed(() => permissions.value)

  async function load() {
    loading.value = true
    try {
      list.value = await iamTemplateApi.list()
      permissions.value = await iamPermissionApi.list()
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

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
      await load()
    } finally {
      submitting.value = false
    }
  }

  // ---------- 状态 ----------

  async function onDisable(row: IamEntitlementTemplate) {
    ElMessageBox.confirm(
      '停用后模板不可套用；已授代理商不受影响（快照制，BR-IAM-051）。确认停用？',
      '停用确认',
      { type: 'warning' }
    )
      .then(async () => {
        await iamTemplateApi.updateStatus(row.id, 'DISABLED')
        ElMessage.success('已停用')
        await load()
      })
      .catch(() => undefined)
  }

  async function onEnable(row: IamEntitlementTemplate) {
    await iamTemplateApi.updateStatus(row.id, 'ACTIVE')
    ElMessage.success('已启用')
    await load()
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
