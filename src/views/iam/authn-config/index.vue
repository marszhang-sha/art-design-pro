<template>
  <div class="art-full-height">
    <ElTabs v-model="activeTab" class="authn-tabs">
      <!-- 认证域 -->
      <ElTabPane label="认证域" name="realms">
        <ElCard class="art-table-card">
          <ArtTableHeader
            v-model:columns="realmColumnChecks"
            :loading="realmLoading"
            @refresh="refreshRealmData"
          >
            <template #left>
              <ElSpace wrap>
                <ElButton
                  v-auth="'system:realm:create'"
                  type="primary"
                  @click="realmVisible = true"
                >
                  创建域
                </ElButton>
              </ElSpace>
            </template>
          </ArtTableHeader>

          <ArtTable :loading="realmLoading" :data="realmData" :columns="realmColumns" />
        </ElCard>
      </ElTabPane>

      <!-- Provider -->
      <ElTabPane label="Provider" name="providers">
        <ElCard class="art-table-card">
          <ArtTableHeader
            v-model:columns="providerColumnChecks"
            :loading="providerLoading"
            @refresh="refreshProviderData"
          >
            <template #left>
              <ElSpace wrap>
                <ElButton
                  v-auth="'system:provider:create'"
                  type="primary"
                  @click="providerVisible = true"
                >
                  创建 Provider
                </ElButton>
              </ElSpace>
            </template>
          </ArtTableHeader>

          <ArtTable :loading="providerLoading" :data="providerData" :columns="providerColumns" />
        </ElCard>
      </ElTabPane>

      <!-- 密码策略 -->
      <ElTabPane label="密码策略" name="policies">
        <ElCard class="art-table-card">
          <ArtTableHeader
            v-model:columns="policyColumnChecks"
            :loading="policyLoading"
            @refresh="refreshPolicyData"
          >
            <template #left>
              <ElSpace wrap>
                <ElButton
                  v-auth="'system:policy:create'"
                  type="primary"
                  @click="policyVisible = true"
                >
                  创建密码策略
                </ElButton>
              </ElSpace>
            </template>
          </ArtTableHeader>

          <ArtTable :loading="policyLoading" :data="policyData" :columns="policyColumns" />
        </ElCard>
      </ElTabPane>
    </ElTabs>

    <!-- 新建认证域 -->
    <ElDialog v-model="realmVisible" title="新建认证域" width="460px">
      <ElForm label-width="80px">
        <ElFormItem label="标识" required>
          <ElInput v-model="realmForm.code" placeholder="如：PHARMA / AGENT" />
        </ElFormItem>
        <ElFormItem label="名称" required>
          <ElInput v-model="realmForm.name" />
        </ElFormItem>
        <ElFormItem label="描述">
          <ElInput v-model="realmForm.description" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="realmVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="saveRealm">创建</ElButton>
      </template>
    </ElDialog>

    <!-- 新建 Provider -->
    <ElDialog v-model="providerVisible" title="新建 Provider" width="520px">
      <ElForm label-width="110px">
        <ElFormItem label="所属域" required>
          <ElSelect v-model="providerForm.realmId" style="width: 100%">
            <ElOption
              v-for="r in realmData"
              :key="r.id"
              :value="r.id"
              :label="`${r.code}（${r.name}）`"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="标识" required>
          <ElInput v-model="providerForm.code" />
        </ElFormItem>
        <ElFormItem label="名称" required>
          <ElInput v-model="providerForm.name" />
        </ElFormItem>
        <ElFormItem label="类型" required>
          <ElSelect v-model="providerForm.providerType" style="width: 100%">
            <ElOption v-for="t in PROVIDER_TYPES" :key="t" :value="t" :label="t" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="密码策略">
          <ElSelect
            v-model="providerForm.currentPasswordPolicyId"
            clearable
            style="width: 100%"
            :disabled="providerForm.providerType !== 'LOCAL_PASSWORD'"
          >
            <ElOption
              v-for="p in policyData"
              :key="p.id"
              :value="p.id"
              :label="`${p.code}（${p.algorithm}）`"
            />
          </ElSelect>
          <div class="mt-1 text-xs text-gray-400"
            >仅 LOCAL_PASSWORD 类型可配置（BR-IAM-023/024）</div
          >
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="providerVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="saveProvider">创建</ElButton>
      </template>
    </ElDialog>

    <!-- 新建密码策略 -->
    <ElDialog v-model="policyVisible" title="新建密码策略" width="520px">
      <ElForm label-width="90px">
        <ElFormItem label="标识" required>
          <ElInput v-model="policyForm.code" />
        </ElFormItem>
        <ElFormItem label="名称" required>
          <ElInput v-model="policyForm.name" />
        </ElFormItem>
        <ElFormItem label="算法" required>
          <ElSelect v-model="policyForm.algorithm" style="width: 100%">
            <ElOption value="ARGON2ID" label="ARGON2ID（推荐）" />
            <ElOption value="PBKDF2_SHA256" label="PBKDF2_SHA256" />
            <ElOption value="BCRYPT" label="BCRYPT" />
            <ElOption value="SM3_KDF" label="SM3_KDF（国密，扩展点）" disabled />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="版本" required>
          <ElInput v-model="policyForm.algorithmVersion" placeholder="如 v1" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="policyVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="savePolicy">创建</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { h, ref } from 'vue'
  import { ElMessage, ElTag } from 'element-plus'
  import { useTable } from '@/hooks/core/useTable'
  import {
    iamAuthnConfigApi,
    type IamPasswordPolicy,
    type IamProvider,
    type IamRealm
  } from '@/api/iam'
  import { wrapAll } from '@/views/iam/table'

  defineOptions({ name: 'IamAuthnConfig' })

  const PROVIDER_TYPES = ['LOCAL_PASSWORD', 'WECOM', 'OIDC', 'SAML', 'LDAP', 'OTP']

  const activeTab = ref('realms')

  /** 三个资源种类各自独立 useTable。apiFn 必须是显式标注返回类型的具名函数
   * （内联箭头会退化 TRecord = unknown；responseAdapter 会退化为 never），
   * 全量列表经 wrapAll 包装为标准分页信封，分页栏不渲染。 */
  function fetchRealms(): Promise<Api.Common.PaginatedResponse<IamRealm>> {
    return iamAuthnConfigApi.listRealms().then(wrapAll)
  }

  function fetchProviders(): Promise<Api.Common.PaginatedResponse<IamProvider>> {
    return iamAuthnConfigApi.listProviders().then(wrapAll)
  }

  function fetchPasswordPolicies(): Promise<Api.Common.PaginatedResponse<IamPasswordPolicy>> {
    return iamAuthnConfigApi.listPasswordPolicies().then(wrapAll)
  }

  // ---------- 认证域 ----------

  const {
    columns: realmColumns,
    columnChecks: realmColumnChecks,
    data: realmData,
    loading: realmLoading,
    refreshData: refreshRealmData
  } = useTable({
    core: {
      apiFn: fetchRealms,
      columnsFactory: () => [
        { prop: 'code', label: '标识', width: 120, sortable: true },
        { prop: 'name', label: '名称', minWidth: 140, sortable: true },
        { prop: 'description', label: '描述', minWidth: 200, sortable: true },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          sortable: true,
          formatter: (row: IamRealm) =>
            h(ElTag, { type: row.status === 'ACTIVE' ? 'success' : 'info' }, () =>
              row.status === 'ACTIVE' ? '启用' : '停用'
            )
        }
      ]
    }
  })

  // ---------- Provider ----------

  const {
    columns: providerColumns,
    columnChecks: providerColumnChecks,
    data: providerData,
    loading: providerLoading,
    refreshData: refreshProviderData
  } = useTable({
    core: {
      apiFn: fetchProviders,
      columnsFactory: () => [
        { prop: 'code', label: '标识', width: 140, sortable: true },
        { prop: 'name', label: '名称', minWidth: 120, sortable: true },
        { prop: 'providerType', label: '类型', width: 160, sortable: true },
        {
          prop: 'realmId',
          label: '所属域',
          width: 100,
          sortable: true,
          formatter: (row: IamProvider) => realmName(row.realmId)
        },
        {
          prop: 'currentPasswordPolicyId',
          label: '密码策略',
          minWidth: 140,
          sortable: true,
          formatter: (row: IamProvider) =>
            policyName(row.currentPasswordPolicyId) ?? '—（非密码通道）'
        },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          sortable: true,
          formatter: (row: IamProvider) =>
            h(ElTag, { type: row.status === 'ACTIVE' ? 'success' : 'info' }, () =>
              row.status === 'ACTIVE' ? '启用' : '停用'
            )
        }
      ]
    }
  })

  // ---------- 密码策略 ----------

  const {
    columns: policyColumns,
    columnChecks: policyColumnChecks,
    data: policyData,
    loading: policyLoading,
    refreshData: refreshPolicyData
  } = useTable({
    core: {
      apiFn: fetchPasswordPolicies,
      columnsFactory: () => [
        { prop: 'code', label: '标识', width: 140, sortable: true },
        { prop: 'name', label: '名称', minWidth: 140, sortable: true },
        { prop: 'algorithm', label: '算法', width: 140, sortable: true },
        { prop: 'algorithmVersion', label: '版本', width: 100, sortable: true },
        {
          prop: 'status',
          label: '状态',
          width: 110,
          sortable: true,
          formatter: (row: IamPasswordPolicy) =>
            h(ElTag, { type: row.status === 'ACTIVE' ? 'success' : 'info' }, () =>
              row.status === 'ACTIVE' ? '启用' : '已退役'
            )
        }
      ]
    }
  })

  function realmName(realmId: number) {
    return realmData.value.find((r) => r.id === realmId)?.code ?? String(realmId)
  }

  function policyName(policyId: number | null) {
    if (policyId == null) return null
    return policyData.value.find((p) => p.id === policyId)?.code ?? String(policyId)
  }

  // ---------- 认证域：创建 ----------

  const realmVisible = ref(false)
  const saving = ref(false)
  const realmForm = ref({ code: '', name: '', description: '' })

  async function saveRealm() {
    saving.value = true
    try {
      await iamAuthnConfigApi.createRealm(realmForm.value)
      ElMessage.success('认证域已创建')
      realmVisible.value = false
      await refreshRealmData()
    } finally {
      saving.value = false
    }
  }

  // ---------- Provider：创建 ----------

  const providerVisible = ref(false)
  const providerForm = ref({
    realmId: undefined as number | undefined,
    code: '',
    name: '',
    providerType: 'LOCAL_PASSWORD',
    currentPasswordPolicyId: undefined as number | undefined
  })

  async function saveProvider() {
    if (!providerForm.value.realmId) {
      ElMessage.warning('请选择所属域')
      return
    }
    saving.value = true
    try {
      await iamAuthnConfigApi.createProvider({
        realmId: providerForm.value.realmId,
        code: providerForm.value.code,
        name: providerForm.value.name,
        providerType: providerForm.value.providerType,
        currentPasswordPolicyId: providerForm.value.currentPasswordPolicyId
      })
      ElMessage.success('Provider 已创建')
      providerVisible.value = false
      await refreshProviderData()
    } finally {
      saving.value = false
    }
  }

  // ---------- 密码策略：创建 ----------

  const policyVisible = ref(false)
  const policyForm = ref({
    code: '',
    name: '',
    algorithm: 'ARGON2ID',
    algorithmVersion: 'v1'
  })

  async function savePolicy() {
    saving.value = true
    try {
      await iamAuthnConfigApi.createPasswordPolicy(policyForm.value)
      ElMessage.success('密码策略已创建')
      policyVisible.value = false
      await refreshPolicyData()
    } finally {
      saving.value = false
    }
  }
</script>

<style lang="scss" scoped>
  /* Tab 链路高度透传：art-full-height → tabs → content → pane，
     使各 pane 内的 art-table-card（flex:1）与 ArtTable 高度自适应 */
  .authn-tabs {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;

    :deep(.el-tabs__content) {
      flex: 1;
      min-height: 0;
    }

    :deep(.el-tab-pane) {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
  }
</style>
