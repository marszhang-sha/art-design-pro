<template>
  <div class="p-4">
    <ElCard shadow="never">
      <div class="mb-4">
        <ElSelect
          v-model="agentId"
          filterable
          placeholder="选择代理商"
          style="width: 320px"
          @change="onAgentChange"
        >
          <ElOption
            v-for="a in agentOptions"
            :key="a.agentId"
            :value="a.agentId"
            :label="`代理商 #${a.agentId}`"
          />
        </ElSelect>
        <ElAlert
          title="快照提示：套用模板按当前权限集复制生成，此后模板变更不影响已授代理商（BR-IAM-051）"
          type="info"
          :closable="false"
          class="mt-3"
          v-if="agentId"
        />
      </div>

      <ElTabs v-model="activeTab">
        <ElTabPane label="当前边界" name="active">
          <ElTable :data="activeRows" v-loading="loading" border stripe>
            <ElTableColumn label="权限码" min-width="220">
              <template #default="{ row }">{{ codeOf(row.permissionId) }}</template>
            </ElTableColumn>
            <ElTableColumn label="来源" width="110">
              <template #default="{ row }">
                <ElTag :type="row.grantedVia === 'TEMPLATE' ? 'warning' : 'primary'" size="small">
                  {{ row.grantedVia === 'TEMPLATE' ? `模板#${row.templateId}` : '手动' }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="状态" width="100">
              <template #default="{ row }">
                <ElTag :type="row.status === 'ACTIVE' ? 'success' : 'info'">
                  {{ row.status === 'ACTIVE' ? '有效' : '已吊销' }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="操作" width="100">
              <template #default="{ row }">
                <ElButton
                  v-if="row.status === 'ACTIVE'"
                  v-auth="'system:entitlement:revoke'"
                  link
                  type="danger"
                  @click="onRevoke(row)"
                >
                  吊销
                </ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>

        <ElTabPane label="授予" name="grant">
          <div class="p-2">
            <ElRadioGroup v-model="grantMode">
              <ElRadioButton value="MANUAL">逐条授予</ElRadioButton>
              <ElRadioButton value="TEMPLATE">模板套用</ElRadioButton>
            </ElRadioGroup>

            <div v-if="grantMode === 'MANUAL'" class="mt-4">
              <ElSelect
                v-model="manualPermIds"
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
            </div>
            <div v-else class="mt-4">
              <ElSelect
                v-model="grantTemplateId"
                filterable
                style="width: 100%"
                placeholder="选择授权模板"
              >
                <ElOption
                  v-for="t in activeTemplates"
                  :key="t.id"
                  :value="t.id"
                  :label="`${t.name}（${t.permissionIds.length} 项权限）`"
                  :disabled="t.status !== 'ACTIVE'"
                />
              </ElSelect>
              <ElAlert
                class="mt-2"
                title="套用即按模板当前权限集复制生成（快照制），模板后续变更不影响已授代理商"
                type="info"
                :closable="false"
              />
            </div>
            <ElButton
              class="mt-4"
              type="primary"
              :disabled="grantMode === 'MANUAL' ? !manualPermIds.length : !grantTemplateId"
              :loading="granting"
              @click="onGrant"
            >
              授予
            </ElButton>
          </div>
        </ElTabPane>

        <ElTabPane label="历史" name="history">
          <ElTable :data="revokedRows" v-loading="loading" border stripe>
            <ElTableColumn label="权限码" min-width="220">
              <template #default="{ row }">{{ codeOf(row.permissionId) }}</template>
            </ElTableColumn>
            <ElTableColumn prop="grantedVia" label="来源" width="110" />
            <ElTableColumn label="状态" width="100">
              <template #default>
                <ElTag type="info">REVOKED</ElTag>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>
      </ElTabs>
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import {
    iamAccountApi,
    iamEntitlementApi,
    iamPermissionApi,
    iamTemplateApi,
    type IamEntitlement,
    type IamPermission,
    type IamEntitlementTemplate
  } from '@/api/iam'

  defineOptions({ name: 'IamEntitlement' })

  const loading = ref(false)
  const agentId = ref<number | null>(null)
  const agentOptions = ref<{ agentId: number }[]>([])
  const activeTab = ref('active')

  const rows = ref<IamEntitlement[]>([])
  const permissions = ref<IamPermission[]>([])
  const templates = ref<IamEntitlementTemplate[]>([])

  const grantMode = ref<'MANUAL' | 'TEMPLATE'>('MANUAL')
  const manualPermIds = ref<number[]>([])
  const grantTemplateId = ref<number | null>(null)
  const granting = ref(false)

  const activeRows = computed(() => rows.value.filter((r) => r.status === 'ACTIVE'))
  const revokedRows = computed(() => rows.value.filter((r) => r.status === 'REVOKED'))
  const activeTemplates = computed(() => templates.value.filter((t) => t.status === 'ACTIVE'))
  const selectablePerms = computed(() => permissions.value)

  function codeOf(permissionId: number) {
    return permissions.value.find((p) => p.id === permissionId)?.code ?? String(permissionId)
  }

  async function load() {
    loading.value = true
    try {
      permissions.value = await iamPermissionApi.list()
      templates.value = await iamTemplateApi.list()
      // 代理商选项：从账号列表提取 distinct agentId
      const accounts = await iamAccountApi.list()
      const ids = new Set<string>()
      for (const a of accounts) if (a.agentId) ids.add(a.agentId)
      agentOptions.value = [...ids].map((id) => ({ agentId: Number(id) }))
      if (agentId.value) await loadEntitlements()
    } finally {
      loading.value = false
    }
  }

  async function loadEntitlements() {
    if (!agentId.value) return
    rows.value = await iamEntitlementApi.listByAgent(agentId.value, true)
  }

  function onAgentChange() {
    rows.value = []
    loadEntitlements()
  }

  async function onGrant() {
    if (!agentId.value) return
    granting.value = true
    try {
      if (grantMode.value === 'TEMPLATE' && grantTemplateId.value != null) {
        const tpl = templates.value.find((t) => t.id === grantTemplateId.value)
        await ElMessageBox.confirm(
          `按模板「${tpl?.name ?? ''}」当前 ${tpl?.permissionIds.length ?? 0} 项权限复制生成（快照制）。确认套用？`,
          '模板套用确认',
          { type: 'info' }
        )
      }
      await iamEntitlementApi.grant(agentId.value, {
        permissionIds: grantMode.value === 'MANUAL' ? manualPermIds.value : undefined,
        templateId: grantMode.value === 'TEMPLATE' ? grantTemplateId.value! : undefined
      })
      ElMessage.success('已授予')
      manualPermIds.value = []
      grantTemplateId.value = null
      await loadEntitlements()
    } finally {
      granting.value = false
    }
  }

  function onRevoke(row: IamEntitlement) {
    ElMessageBox.confirm(
      `吊销该权限边界？吊销保留历史，重新授予为新记录（BR-IAM-035 语境）。`,
      '吊销确认',
      { type: 'warning' }
    )
      .then(async () => {
        await iamEntitlementApi.revoke(row.id)
        ElMessage.success('已吊销')
        await loadEntitlements()
      })
      .catch(() => undefined)
  }

  onMounted(load)
</script>
