<template>
  <div class="art-full-height">
    <ArtSearchBar
      v-model="searchForm"
      :items="formItems"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card" style="margin-top: 12px">
      <div class="mb-3 flex justify-end">
        <ElButton v-auth="'system:org:create'" type="primary" @click="openCreate">
          新建节点
        </ElButton>
      </div>

      <!-- 树表：GET /orgs 全量不分页（契约 §3.7），树形 + 默认展开 -->
      <ElTable
        v-loading="loading"
        :data="treeData"
        row-key="id"
        :tree-props="{ children: 'children' }"
        default-expand-all
        border
        empty-text="组织节点为空，请检查种子数据"
      >
        <ElTableColumn prop="name" label="组织名称" min-width="220" />
        <ElTableColumn label="类型" width="110">
          <template #default="{ row }: { row: IamOrgNode }">
            <ElTag :type="NODE_TYPE_TAG[row.nodeType]">{{ NODE_TYPE_TEXT[row.nodeType] }}</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="code" label="编码" min-width="130" />
        <ElTableColumn prop="shortName" label="简称" min-width="110" />
        <ElTableColumn prop="uscc" label="统一社会信用代码" min-width="180" />
        <ElTableColumn prop="contactPerson" label="联系人" width="100" />
        <ElTableColumn prop="contactPhone" label="联系电话" width="130" />
        <ElTableColumn prop="establishedDate" label="成立日期" width="110" />
        <ElTableColumn label="状态" width="90">
          <template #default="{ row }: { row: IamOrgNode }">
            <ElTag :type="row.status === 'ACTIVE' ? 'success' : 'danger'">
              {{ row.status === 'ACTIVE' ? '正常' : '已停用' }}
            </ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="90" fixed="right">
          <template #default="{ row }: { row: IamOrgNode }">
            <ArtButtonMore
              :list="operationList(row)"
              @click="(item: ButtonMoreItem) => buttonMoreClick(item, row)"
            />
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <!-- 新建/编辑 Drawer：九项必填（ORG-07）+ code + attributes；
         PHARMA 为预置占位（不开放创建同型），仅可编辑补全（PATCH） -->
    <ElDrawer v-model="drawerVisible" :title="drawerTitle" size="480px">
      <ElForm ref="formRef" :model="form" :rules="formRules" label-width="110px">
        <ElFormItem label="节点类型">
          <ElRadioGroup v-if="!editingId" v-model="form.nodeType">
            <ElRadioButton value="BUSINESS_ENTITY">业务实体</ElRadioButton>
            <ElRadioButton value="CSO_AGENT">CSO代理商</ElRadioButton>
          </ElRadioGroup>
          <ElTag v-else :type="NODE_TYPE_TAG[form.nodeType]">{{
            NODE_TYPE_TEXT[form.nodeType]
          }}</ElTag>
        </ElFormItem>
        <ElFormItem label="编码" prop="code">
          <ElInput v-model="form.code" placeholder="如 ENT-SH-001" />
        </ElFormItem>
        <ElFormItem label="名称" prop="name">
          <ElInput v-model="form.name" />
        </ElFormItem>
        <ElFormItem label="简称" prop="shortName">
          <ElInput v-model="form.shortName" />
        </ElFormItem>
        <ElFormItem label="信用代码" prop="uscc">
          <ElInput v-model="form.uscc" placeholder="18 位统一社会信用代码" />
        </ElFormItem>
        <ElFormItem label="注册地址" prop="registeredAddress">
          <ElInput v-model="form.registeredAddress" />
        </ElFormItem>
        <ElFormItem label="联系人" prop="contactPerson">
          <ElInput v-model="form.contactPerson" />
        </ElFormItem>
        <ElFormItem label="联系电话" prop="contactPhone">
          <ElInput v-model="form.contactPhone" />
        </ElFormItem>
        <ElFormItem label="注册资本(万元)" prop="registeredCapital">
          <ElInputNumber v-model="form.registeredCapital" :min="0" :precision="2" class="w-full" />
        </ElFormItem>
        <ElFormItem label="法定代表人" prop="legalRepresentative">
          <ElInput v-model="form.legalRepresentative" />
        </ElFormItem>
        <ElFormItem label="成立日期" prop="establishedDate">
          <ElDatePicker
            v-model="form.establishedDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="扩展属性">
          <ElInput
            v-model="form.attributesText"
            type="textarea"
            :rows="3"
            placeholder='JSON 对象，如 {"key":"value"}；留空不提交'
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="drawerVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="submitting" @click="submitForm">保存</ElButton>
      </template>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
  import ArtButtonMore, {
    type ButtonMoreItem
  } from '@/components/core/forms/art-button-more/index.vue'
  import { iamOrgApi, type IamOrgListParams, type IamOrgNode, type IamOrgNodeType } from '@/api/iam'

  defineOptions({ name: 'OrgOrganizations' })

  // ---------- 常量 ----------

  const NODE_TYPE_TEXT: Record<IamOrgNodeType, string> = {
    PHARMA: '药厂',
    BUSINESS_ENTITY: '业务实体',
    CSO_AGENT: 'CSO代理商'
  }
  const NODE_TYPE_TAG: Record<IamOrgNodeType, 'warning' | 'primary' | 'success'> = {
    PHARMA: 'warning',
    BUSINESS_ENTITY: 'primary',
    CSO_AGENT: 'success'
  }

  // ---------- 列表（树形全量） ----------

  const treeData = ref<IamOrgNode[]>([])
  const loading = ref(false)

  interface OrgSearchFormParams {
    nodeType?: string
    status?: string
    keyword?: string
  }

  const searchForm = ref<OrgSearchFormParams>({})
  const activeFilters = ref<OrgSearchFormParams>({})

  const formItems = [
    {
      label: '节点类型',
      key: 'nodeType',
      type: 'select',
      props: {
        placeholder: '全部类型',
        options: [
          { label: '药厂', value: 'PHARMA' },
          { label: '业务实体', value: 'BUSINESS_ENTITY' },
          { label: 'CSO代理商', value: 'CSO_AGENT' }
        ],
        clearable: true
      }
    },
    {
      label: '状态',
      key: 'status',
      type: 'select',
      props: {
        placeholder: '全部状态',
        options: [
          { label: '正常', value: 'ACTIVE' },
          { label: '已停用', value: 'DISABLED' }
        ],
        clearable: true
      }
    },
    {
      label: '关键词',
      key: 'keyword',
      type: 'input',
      props: {
        placeholder: '编码/名称/简称',
        clearable: true
      }
    }
  ]

  /** 剔除空值过滤参数（''/undefined/null 不下发） */
  function cleanParams(params: OrgSearchFormParams): IamOrgListParams {
    const out: IamOrgListParams = {}
    for (const [k, v] of Object.entries(params)) {
      if (v !== '' && v !== undefined && v !== null) {
        ;(out as Record<string, unknown>)[k] = v
      }
    }
    return out
  }

  async function fetchTree() {
    loading.value = true
    try {
      treeData.value = await iamOrgApi.tree(cleanParams(activeFilters.value))
    } finally {
      loading.value = false
    }
  }

  const handleSearch = (params: OrgSearchFormParams) => {
    activeFilters.value = { ...params }
    fetchTree()
  }

  const handleReset = () => {
    activeFilters.value = {}
    fetchTree()
  }

  onMounted(fetchTree)

  // ---------- 行操作（ArtButtonMore 内置 per-item auth 过滤） ----------

  function operationList(row: IamOrgNode): ButtonMoreItem[] {
    const list: ButtonMoreItem[] = [
      { key: 'edit', label: '编辑', icon: 'ri:edit-line', auth: 'system:org:update' }
    ]
    if (row.status === 'ACTIVE') {
      list.push({
        key: 'disable',
        label: '停用',
        icon: 'ri:forbid-line',
        color: '#f56c6c',
        auth: 'system:org:disable'
      })
    } else {
      list.push({
        key: 'enable',
        label: '启用',
        icon: 'ri:play-circle-line',
        color: '#67c23a',
        auth: 'system:org:enable'
      })
    }
    return list
  }

  function buttonMoreClick(item: ButtonMoreItem, row: IamOrgNode) {
    switch (item.key) {
      case 'edit':
        openEdit(row)
        break
      case 'disable':
        onDisable(row)
        break
      case 'enable':
        onEnable(row)
        break
    }
  }

  async function withReload(fn: () => Promise<unknown>, successMsg?: string) {
    await fn()
    if (successMsg) ElMessage.success(successMsg)
    fetchTree()
  }

  /** 停用语义（2026-10-03 裁定）：存量员工/账号不受影响，新挂靠冻结 */
  function onDisable(row: IamOrgNode) {
    ElMessageBox.confirm(
      `停用后「${row.name}」存量员工/账号不受影响，新挂靠将被冻结。确认停用？`,
      '停用确认',
      { type: 'warning' }
    )
      .then(() => withReload(() => iamOrgApi.disable(row.id), '已停用'))
      .catch(() => undefined)
  }

  function onEnable(row: IamOrgNode) {
    withReload(() => iamOrgApi.enable(row.id), '已启用')
  }

  // ---------- 新建 / 编辑 ----------

  const drawerVisible = ref(false)
  const drawerTitle = ref('')
  const editingId = ref<number | null>(null)
  const submitting = ref(false)
  const formRef = ref<FormInstance>()

  interface OrgFormState {
    /** 编辑态可为 PHARMA（占位补全）；仅作只读展示，创建态仅 BUSINESS_ENTITY/CSO_AGENT */
    nodeType: IamOrgNodeType
    code: string
    name: string
    shortName: string
    uscc: string
    registeredAddress: string
    contactPerson: string
    contactPhone: string
    registeredCapital: number | undefined
    legalRepresentative: string
    establishedDate: string
    attributesText: string
  }

  const emptyForm = (): OrgFormState => ({
    nodeType: 'BUSINESS_ENTITY',
    code: '',
    name: '',
    shortName: '',
    uscc: '',
    registeredAddress: '',
    contactPerson: '',
    contactPhone: '',
    registeredCapital: undefined,
    legalRepresentative: '',
    establishedDate: '',
    attributesText: ''
  })

  const form = ref<OrgFormState>(emptyForm())

  const formRules: FormRules = {
    code: [{ required: true, message: '请输入编码', trigger: 'blur' }],
    name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
    shortName: [{ required: true, message: '请输入简称', trigger: 'blur' }],
    uscc: [{ required: true, message: '请输入统一社会信用代码', trigger: 'blur' }],
    registeredAddress: [{ required: true, message: '请输入注册地址', trigger: 'blur' }],
    contactPerson: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
    contactPhone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
    registeredCapital: [{ required: true, message: '请输入注册资本', trigger: 'blur' }],
    legalRepresentative: [{ required: true, message: '请输入法定代表人', trigger: 'blur' }],
    establishedDate: [{ required: true, message: '请选择成立日期', trigger: 'change' }]
  }

  function openCreate() {
    editingId.value = null
    form.value = emptyForm()
    drawerTitle.value = '新建组织节点'
    drawerVisible.value = true
  }

  function openEdit(row: IamOrgNode) {
    editingId.value = row.id
    form.value = {
      nodeType: row.nodeType,
      code: row.code,
      name: row.name,
      shortName: row.shortName,
      uscc: row.uscc,
      registeredAddress: row.registeredAddress,
      contactPerson: row.contactPerson,
      contactPhone: row.contactPhone,
      registeredCapital: row.registeredCapital ?? undefined,
      legalRepresentative: row.legalRepresentative,
      establishedDate: row.establishedDate ?? '',
      attributesText: row.attributes ? JSON.stringify(row.attributes, null, 2) : ''
    }
    drawerTitle.value = '编辑组织节点'
    drawerVisible.value = true
  }

  /** attributes 文本 → 对象；非法 JSON / 非对象返回 null（调用方中止），空串返回 undefined（不提交） */
  function parseAttributes(text: string): Record<string, unknown> | null | undefined {
    const trimmed = text.trim()
    if (!trimmed) return undefined
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        ElMessage.error('扩展属性须为 JSON 对象（如 {"key":"value"}）')
        return null
      }
      return parsed as Record<string, unknown>
    } catch {
      ElMessage.error('扩展属性不是合法 JSON')
      return null
    }
  }

  async function submitForm() {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) return
    const attrs = parseAttributes(form.value.attributesText)
    if (attrs === null) return

    const payload = {
      code: form.value.code.trim(),
      name: form.value.name.trim(),
      shortName: form.value.shortName.trim(),
      uscc: form.value.uscc.trim(),
      registeredAddress: form.value.registeredAddress.trim(),
      contactPerson: form.value.contactPerson.trim(),
      contactPhone: form.value.contactPhone.trim(),
      registeredCapital: form.value.registeredCapital ?? 0,
      legalRepresentative: form.value.legalRepresentative.trim(),
      establishedDate: form.value.establishedDate,
      ...(attrs !== undefined ? { attributes: attrs } : {})
    }

    submitting.value = true
    try {
      if (editingId.value) {
        await iamOrgApi.update(editingId.value, payload)
        ElMessage.success('保存成功')
      } else {
        // 创建态 nodeType 由 radio 限定为 BUSINESS_ENTITY/CSO_AGENT（PHARMA 无创建入口）
        await iamOrgApi.create(form.value.nodeType as 'BUSINESS_ENTITY' | 'CSO_AGENT', payload)
        ElMessage.success('创建成功')
      }
      drawerVisible.value = false
      fetchTree()
    } finally {
      submitting.value = false
    }
  }
</script>
