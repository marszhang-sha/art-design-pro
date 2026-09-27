<template>
  <div class="p-4">
    <ElCard shadow="never">
      <ElTabs v-model="activeTab">
        <!-- 认证域 -->
        <ElTabPane label="认证域" name="realms">
          <div class="mb-3 flex justify-end">
            <ElButton v-auth="'system:realm:create'" type="primary" @click="realmVisible = true">
              新建认证域
            </ElButton>
          </div>
          <ElTable :data="realms" v-loading="loading" border stripe>
            <ElTableColumn prop="code" label="标识" width="120" />
            <ElTableColumn prop="name" label="名称" min-width="140" />
            <ElTableColumn prop="description" label="描述" min-width="200" />
            <ElTableColumn label="状态" width="100">
              <template #default="{ row }">
                <ElTag :type="row.status === 'ACTIVE' ? 'success' : 'info'">
                  {{ row.status === 'ACTIVE' ? '启用' : '停用' }}
                </ElTag>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>

        <!-- Provider -->
        <ElTabPane label="Provider" name="providers">
          <div class="mb-3 flex justify-end">
            <ElButton
              v-auth="'system:provider:create'"
              type="primary"
              @click="providerVisible = true"
            >
              新建 Provider
            </ElButton>
          </div>
          <ElTable :data="providers" v-loading="loading" border stripe>
            <ElTableColumn prop="code" label="标识" width="140" />
            <ElTableColumn prop="name" label="名称" min-width="120" />
            <ElTableColumn prop="providerType" label="类型" width="160" />
            <ElTableColumn label="所属域" width="100">
              <template #default="{ row }">{{ realmName(row.realmId) }}</template>
            </ElTableColumn>
            <ElTableColumn label="密码策略" min-width="140">
              <template #default="{ row }">
                {{ policyName(row.currentPasswordPolicyId) ?? '—（非密码通道）' }}
              </template>
            </ElTableColumn>
            <ElTableColumn label="状态" width="100">
              <template #default="{ row }">
                <ElTag :type="row.status === 'ACTIVE' ? 'success' : 'info'">
                  {{ row.status === 'ACTIVE' ? '启用' : '停用' }}
                </ElTag>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>

        <!-- 密码策略 -->
        <ElTabPane label="密码策略" name="policies">
          <div class="mb-3 flex justify-end">
            <ElButton v-auth="'system:policy:create'" type="primary" @click="policyVisible = true">
              新建密码策略
            </ElButton>
          </div>
          <ElTable :data="policies" v-loading="loading" border stripe>
            <ElTableColumn prop="code" label="标识" width="140" />
            <ElTableColumn prop="name" label="名称" min-width="140" />
            <ElTableColumn prop="algorithm" label="算法" width="140" />
            <ElTableColumn prop="algorithmVersion" label="版本" width="100" />
            <ElTableColumn label="状态" width="110">
              <template #default="{ row }">
                <ElTag :type="row.status === 'ACTIVE' ? 'success' : 'info'">
                  {{ row.status === 'ACTIVE' ? '启用' : '退役' }}
                </ElTag>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>
      </ElTabs>
    </ElCard>

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
              v-for="r in realms"
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
              v-for="p in policies"
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
  import { onMounted, ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import {
    iamAuthnConfigApi,
    type IamPasswordPolicy,
    type IamProvider,
    type IamRealm
  } from '@/api/iam'

  defineOptions({ name: 'IamAuthnConfig' })

  const PROVIDER_TYPES = ['LOCAL_PASSWORD', 'WECOM', 'OIDC', 'SAML', 'LDAP', 'OTP']

  const loading = ref(false)
  const saving = ref(false)
  const activeTab = ref('realms')

  const realms = ref<IamRealm[]>([])
  const providers = ref<IamProvider[]>([])
  const policies = ref<IamPasswordPolicy[]>([])

  function realmName(realmId: number) {
    return realms.value.find((r) => r.id === realmId)?.code ?? String(realmId)
  }

  function policyName(policyId: number | null) {
    if (policyId == null) return null
    return policies.value.find((p) => p.id === policyId)?.code ?? String(policyId)
  }

  async function load() {
    loading.value = true
    try {
      realms.value = await iamAuthnConfigApi.listRealms()
      providers.value = await iamAuthnConfigApi.listProviders()
      policies.value = await iamAuthnConfigApi.listPasswordPolicies()
    } finally {
      loading.value = false
    }
  }

  onMounted(load)

  // ---------- 认证域 ----------
  const realmVisible = ref(false)
  const realmForm = ref({ code: '', name: '', description: '' })

  async function saveRealm() {
    saving.value = true
    try {
      await iamAuthnConfigApi.createRealm(realmForm.value)
      ElMessage.success('认证域已创建')
      realmVisible.value = false
      await load()
    } finally {
      saving.value = false
    }
  }

  // ---------- Provider ----------
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
      await load()
    } finally {
      saving.value = false
    }
  }

  // ---------- 密码策略 ----------
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
      await load()
    } finally {
      saving.value = false
    }
  }
</script>
