<template>
  <div class="art-full-height">
    <ElCard class="art-table-card">
      <ArtTableHeader v-model:columns="columnChecks" :loading="loading" @refresh="refreshData">
        <template #left>
          <ElSpace wrap>
            <ElSelect
              v-model="selectedAgentId"
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
            <ElSwitch v-model="includeRevoked" active-text="含已吊销" @change="onFilterChange" />
            <ElButton type="primary" @click="openGrant">授予</ElButton>
          </ElSpace>
          <ElAlert
            v-if="selectedAgentId"
            class="w-full"
            title="快照提示：套用模板按当前权限集复制生成，此后模板变更不影响已授代理商（BR-IAM-051）"
            type="info"
            :closable="false"
          />
        </template>
      </ArtTableHeader>

      <ArtTable :loading="loading" :data="data" :columns="columns"> </ArtTable>
    </ElCard>

    <!-- 授予弹窗（旧页"授予" tab：逐条授予 / 模板套用） -->
    <ElDialog v-model="grantVisible" title="授予权限" width="560px">
      <ElForm label-width="90px">
        <ElFormItem label="授予方式">
          <ElRadioGroup v-model="grantMode">
            <ElRadioButton value="MANUAL">逐条授予</ElRadioButton>
            <ElRadioButton value="TEMPLATE">模板套用</ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem v-if="grantMode === 'MANUAL'" label="权限">
          <ElSelect
            v-model="manualPermIds"
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
        <ElFormItem v-else label="模板">
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
        </ElFormItem>
      </ElForm>
      <ElAlert
        v-if="grantMode === 'TEMPLATE'"
        title="套用即按模板当前权限集复制生成（快照制），模板后续变更不影响已授代理商"
        type="info"
        :closable="false"
      />
      <template #footer>
        <ElButton @click="grantVisible = false">取消</ElButton>
        <ElButton
          type="primary"
          :disabled="grantMode === 'MANUAL' ? !manualPermIds.length : !grantTemplateId"
          :loading="granting"
          @click="onGrant"
        >
          授予
        </ElButton>
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
  import {
    iamAccountApi,
    iamEntitlementApi,
    iamPermissionApi,
    iamTemplateApi,
    type IamEntitlement,
    type IamEntitlementTemplate,
    type IamPermission
  } from '@/api/iam'
  import { wrapAll } from '@/views/iam/table'

  defineOptions({ name: 'IamEntitlement' })

  // ---------- 筛选态（本页无关键字搜索栏，代理商选择即过滤器） ----------

  const selectedAgentId = ref<number | null>(null)
  /** 旧页固定以 includeRevoked=true 拉取并以"历史"tab 展示；
   *  合并为单表（状态列区分）后默认开启，开关可隐藏已吊销 */
  const includeRevoked = ref(true)
  const agentOptions = ref<{ agentId: number }[]>([])

  // 授予弹窗依赖的字典数据
  const permissions = ref<IamPermission[]>([])
  const templates = ref<IamEntitlementTemplate[]>([])
  const activeTemplates = computed(() => templates.value.filter((t) => t.status === 'ACTIVE'))

  /** apiFn 内归一信封：返回类型显式标注为标准 PaginatedResponse，
   *  useTable 的 InferRecordType 才能推出 TRecord = IamEntitlement
   *  （内联箭头函数会退化 TRecord = unknown；数组走 responseAdapter 则退化为 never）。
   *  全量列表（无服务端分页），目标代理商/含已吊销经闭包注入。 */
  function fetchEntitlements(): Promise<Api.Common.PaginatedResponse<IamEntitlement>> {
    const agentId = selectedAgentId.value
    // 旧页 loadEntitlements 同款守卫：未选代理商时不请求（空结果而非报错）
    if (agentId == null) return Promise.resolve(wrapAll<IamEntitlement>([]))
    return iamEntitlementApi.listByAgent(agentId, includeRevoked.value).then(wrapAll)
  }

  const { columns, columnChecks, data, loading, getData, clearData, refreshData } = useTable({
    core: {
      apiFn: fetchEntitlements,
      // 列表依赖用户选定代理商，就绪前不自动请求
      immediate: false,
      columnsFactory: () => [
        {
          prop: 'agentId',
          label: '代理商ID',
          width: 110,
          sortable: true
        },
        {
          prop: 'permissionId',
          label: '权限码',
          minWidth: 220,
          sortable: true,
          // 权限码经权限字典联结（找不到时回退显示 ID）
          formatter: (row: IamEntitlement) => codeOf(row.permissionId)
        },
        {
          prop: 'grantedVia',
          label: '来源',
          width: 110,
          sortable: true,
          formatter: (row: IamEntitlement) =>
            h(ElTag, { type: row.grantedVia === 'TEMPLATE' ? 'warning' : 'primary' }, () =>
              row.grantedVia === 'TEMPLATE' ? '模板' : '手动'
            )
        },
        {
          prop: 'templateId',
          label: '模板',
          width: 100,
          sortable: true,
          formatter: (row: IamEntitlement) =>
            row.templateId != null ? h('span', null, `#${row.templateId}`) : h('span')
        },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          sortable: true,
          formatter: (row: IamEntitlement) =>
            h(ElTag, { type: row.status === 'ACTIVE' ? 'success' : 'info' }, () =>
              row.status === 'ACTIVE' ? '有效' : '已吊销'
            )
        },
        {
          prop: 'operation',
          label: '操作',
          width: 90,
          fixed: 'right',
          formatter: (row: IamEntitlement) =>
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

  // ---------- 初始加载（字典 + 代理商选项） ----------

  onMounted(async () => {
    permissions.value = await iamPermissionApi.list()
    templates.value = await iamTemplateApi.list()
    // 代理商选项：从账号列表提取 distinct agentId
    const accounts = (await iamAccountApi.list({ size: 100 })).items
    const ids = new Set<string>()
    for (const a of accounts) if (a.agentId) ids.add(a.agentId)
    agentOptions.value = [...ids].map((id) => ({ agentId: Number(id) }))
  })

  // ---------- 筛选联动 ----------

  /** 旧页 onAgentChange 同款语义：先清空旧代理商数据再拉取 */
  function onAgentChange() {
    clearData()
    getData()
  }

  /** 含已吊销开关变化 → 重拉列表 */
  function onFilterChange() {
    getData()
  }

  // ---------- 权限码显示 ----------

  function codeOf(permissionId: number) {
    return permissions.value.find((p) => p.id === permissionId)?.code ?? String(permissionId)
  }

  // ---------- 行操作 ----------

  /** 仅 ACTIVE 行可吊销（吊销保留历史，重新授予为新记录）；
   *  ArtButtonMore 内置 per-item auth 过滤，无权限项自动隐藏 */
  function operationList(row: IamEntitlement): ButtonMoreItem[] {
    const list: ButtonMoreItem[] = []
    if (row.status === 'ACTIVE') {
      list.push({
        key: 'revoke',
        label: '吊销',
        icon: 'ri:close-circle-line',
        color: '#f56c6c',
        auth: 'system:entitlement:revoke'
      })
    }
    return list
  }

  function buttonMoreClick(item: ButtonMoreItem, row: IamEntitlement) {
    switch (item.key) {
      case 'revoke':
        onRevoke(row)
        break
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
        refreshData()
      })
      .catch(() => undefined)
  }

  // ---------- 授予弹窗（旧页"授予" tab 迁移为弹窗） ----------

  const grantVisible = ref(false)
  const grantMode = ref<'MANUAL' | 'TEMPLATE'>('MANUAL')
  const manualPermIds = ref<number[]>([])
  const grantTemplateId = ref<number | null>(null)
  const granting = ref(false)

  function openGrant() {
    // 旧页 onGrant 同款守卫：未选代理商不动作
    if (!selectedAgentId.value) return
    grantVisible.value = true
  }

  async function onGrant() {
    if (!selectedAgentId.value) return
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
      const payload =
        grantMode.value === 'TEMPLATE'
          ? { templateId: grantTemplateId.value as number }
          : { permissionIds: manualPermIds.value }
      await iamEntitlementApi.grant(selectedAgentId.value, payload)
      ElMessage.success('已授予')
      manualPermIds.value = []
      grantTemplateId.value = null
      grantVisible.value = false
      refreshData()
    } finally {
      granting.value = false
    }
  }
</script>
