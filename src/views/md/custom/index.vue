<template>
  <!-- UI-MD-001 自建主数据管理（管理端 /md/custom）：
       Tabs 业务单元/产品线；写操作全部挂 system:masterdata:manage（v-auth）。
       软停用（BR-MD-003）：禁新增引用、存量保留；BU 停用带隶属链传导提示（A-MD-10）。
       列表为全量（对象量小，BE 无分页）；无删除（A-MD-09）。 -->
  <div class="art-full-height art-page-view">
    <ElCard shadow="never" :style="{ 'margin-top': '0' }">
      <ElTabs v-model="activeTab">
        <!-- 业务单元 Tab -->
        <ElTabPane label="业务单元" name="bu">
          <div class="mb-3 flex items-center justify-between">
            <ElRadioGroup v-model="buStatusFilter" @change="loadBus">
              <ElRadioButton value="">全部</ElRadioButton>
              <ElRadioButton value="ACTIVE">启用</ElRadioButton>
              <ElRadioButton value="INACTIVE">停用</ElRadioButton>
            </ElRadioGroup>
            <ElButton v-auth="'system:masterdata:manage'" type="primary" @click="openBuCreate"
              >新增业务单元</ElButton
            >
          </div>
          <ElTable :data="bus" v-loading="buLoading" empty-text="暂无业务单元，请先创建">
            <ElTableColumn prop="code" label="编码" width="140" />
            <ElTableColumn prop="name" label="名称" min-width="180" />
            <ElTableColumn label="状态" width="100">
              <template #default="{ row }">
                <ElTag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="small">
                  {{ row.status === 'ACTIVE' ? '启用' : '停用' }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn label="创建时间" width="170">
              <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
            </ElTableColumn>
            <ElTableColumn v-if="canManage" label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <ElButton link type="primary" @click="openBuRename(row)">改名</ElButton>
                <ElButton
                  v-if="row.status === 'ACTIVE'"
                  link
                  type="warning"
                  @click="onBuDisable(row)"
                  >停用</ElButton
                >
                <ElButton v-else link type="success" @click="onBuEnable(row)">启用</ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>

        <!-- 产品线 Tab -->
        <ElTabPane label="产品线" name="product-line">
          <div class="mb-3 flex items-center justify-between">
            <ElSelect
              v-model="plBuFilter"
              clearable
              placeholder="所属 BU：全部"
              class="w-44"
              @change="loadProductLines"
            >
              <ElOption v-for="b in bus" :key="b.id" :label="b.name" :value="Number(b.id)" />
            </ElSelect>
            <ElButton v-auth="'system:masterdata:manage'" type="primary" @click="openPlCreate"
              >新增产品线</ElButton
            >
          </div>
          <ElTable :data="productLines" v-loading="plLoading" empty-text="暂无产品线">
            <ElTableColumn prop="code" label="编码" width="140" />
            <ElTableColumn prop="name" label="名称" min-width="180" />
            <ElTableColumn label="所属 BU" width="120">
              <template #default="{ row }">{{ buName(row.buId) }}</template>
            </ElTableColumn>
            <ElTableColumn label="状态" width="100">
              <template #default="{ row }">
                <ElTag :type="row.status === 'ACTIVE' ? 'success' : 'info'" size="small">
                  {{ row.status === 'ACTIVE' ? '启用' : '停用' }}
                </ElTag>
              </template>
            </ElTableColumn>
            <ElTableColumn v-if="canManage" label="操作" width="240" fixed="right">
              <template #default="{ row }">
                <ElButton link type="primary" @click="openPlRename(row)">改名</ElButton>
                <ElButton link type="primary" @click="openReparent(row)">换属</ElButton>
                <ElButton
                  v-if="row.status === 'ACTIVE'"
                  link
                  type="warning"
                  @click="onPlDisable(row)"
                  >停用</ElButton
                >
                <ElButton v-else link type="success" @click="onPlEnable(row)">启用</ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
        </ElTabPane>
      </ElTabs>
    </ElCard>

    <!-- BU 新增/改名 Dialog -->
    <ElDialog
      v-model="buDialogVisible"
      :title="buForm.id ? '改名业务单元' : '新增业务单元'"
      width="420"
    >
      <ElForm label-width="80">
        <ElFormItem label="编码">
          <ElInput
            v-model="buForm.code"
            :disabled="!!buForm.id"
            placeholder="如 WH（大写字母开头）"
          />
        </ElFormItem>
        <ElFormItem label="名称" required>
          <ElInput v-model="buForm.name" maxlength="100" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="buDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="submitBu">保存</ElButton>
      </template>
    </ElDialog>

    <!-- 产品线 新增/改名 Dialog -->
    <ElDialog
      v-model="plDialogVisible"
      :title="plForm.id ? '改名产品线' : '新增产品线'"
      width="440"
    >
      <ElForm label-width="80">
        <ElFormItem label="编码">
          <ElInput v-model="plForm.code" :disabled="!!plForm.id" placeholder="大写字母开头" />
        </ElFormItem>
        <ElFormItem label="名称" required>
          <ElInput v-model="plForm.name" maxlength="100" />
        </ElFormItem>
        <ElFormItem v-if="!plForm.id" label="所属 BU" required>
          <ElSelect v-model="plForm.buId" placeholder="仅启用中的 BU" class="w-full">
            <ElOption v-for="b in activeBus" :key="b.id" :label="b.name" :value="Number(b.id)" />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="plDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="submitPl">保存</ElButton>
      </template>
    </ElDialog>

    <!-- 换属 Dialog（AF-01，A-MD-08：目标 BU 须启用；存量引用原值保留） -->
    <ElDialog v-model="reparentVisible" title="换属业务单元" width="420">
      <ElForm label-width="80">
        <ElFormItem label="产品线">
          <span>{{ reparentRow?.name }}</span>
        </ElFormItem>
        <ElFormItem label="目标 BU" required>
          <ElSelect v-model="reparentTarget" placeholder="仅启用中的 BU" class="w-full">
            <ElOption
              v-for="b in activeBus.filter((x) => x.id !== reparentRow?.buId)"
              :key="b.id"
              :label="b.name"
              :value="Number(b.id)"
            />
          </ElSelect>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="reparentVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="saving" @click="submitReparent">确认换属</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { mdBuApi, mdProductLineApi, type MdBu, type MdProductLine } from '@/api/md'
  import { useAuth } from '@/hooks/core/useAuth'

  defineOptions({ name: 'MdCustom' })

  /** 维护门控（G-MD-3：manage 码；列级 v-if + 按钮级 v-auth 双保险） */
  const { hasAuth } = useAuth()
  const canManage = computed(() => hasAuth('system:masterdata:manage'))

  // ── 业务单元 ──

  const activeTab = ref('bu')
  const bus = ref<MdBu[]>([])
  const buLoading = ref(false)
  const buStatusFilter = ref<'' | 'ACTIVE' | 'INACTIVE'>('')
  const saving = ref(false)

  async function loadBus() {
    buLoading.value = true
    try {
      bus.value = await mdBuApi.list(
        buStatusFilter.value ? { status: buStatusFilter.value } : undefined
      )
    } finally {
      buLoading.value = false
    }
  }

  const activeBus = computed(() => bus.value.filter((b) => b.status === 'ACTIVE'))
  const buName = (id: string | number): string =>
    bus.value.find((b) => b.id === String(id))?.name ?? `未知(${id})`

  const buDialogVisible = ref(false)
  const buForm = reactive({ id: undefined as number | undefined, code: '', name: '' })

  function openBuCreate() {
    Object.assign(buForm, { id: undefined, code: '', name: '' })
    buDialogVisible.value = true
  }

  function openBuRename(row: MdBu) {
    Object.assign(buForm, { id: Number(row.id), code: row.code, name: row.name })
    buDialogVisible.value = true
  }

  async function submitBu() {
    if (!buForm.name.trim()) {
      ElMessage.warning('名称不能为空')
      return
    }
    saving.value = true
    try {
      if (buForm.id) {
        await mdBuApi.update(buForm.id, { name: buForm.name })
      } else {
        if (!buForm.code.trim()) {
          ElMessage.warning('编码不能为空')
          return
        }
        await mdBuApi.create({ code: buForm.code.trim(), name: buForm.name })
      }
      ElMessage.success('已保存')
      buDialogVisible.value = false
      await loadBus()
    } finally {
      saving.value = false
    }
  }

  /** 软停用确认文案含隶属链传导提示（A-MD-10，UI-MD §0） */
  function onBuDisable(row: MdBu) {
    ElMessageBox.confirm(
      `停用「${row.name}」：停用后不可被新业务引用，已有数据不受影响；其下产品线将一并不可被新业务引用`,
      '停用业务单元',
      { type: 'warning' }
    )
      .then(() => mdBuApi.disable(row.id))
      .then(() => {
        ElMessage.success('已停用')
        return loadBus()
      })
      .catch(() => undefined)
  }

  function onBuEnable(row: MdBu) {
    mdBuApi
      .enable(row.id)
      .then(() => {
        ElMessage.success('已启用')
        return loadBus()
      })
      .catch(() => undefined)
  }

  // ── 产品线 ──

  const productLines = ref<MdProductLine[]>([])
  const plLoading = ref(false)
  const plBuFilter = ref<number | undefined>(undefined)

  async function loadProductLines() {
    plLoading.value = true
    try {
      productLines.value = await mdProductLineApi.list(
        plBuFilter.value ? { buId: plBuFilter.value } : undefined
      )
    } finally {
      plLoading.value = false
    }
  }

  const plDialogVisible = ref(false)
  const plForm = reactive({
    id: undefined as number | undefined,
    code: '',
    name: '',
    buId: undefined as number | undefined
  })

  function openPlCreate() {
    Object.assign(plForm, { id: undefined, code: '', name: '', buId: undefined })
    plDialogVisible.value = true
  }

  function openPlRename(row: MdProductLine) {
    Object.assign(plForm, { id: Number(row.id), code: row.code, name: row.name, buId: undefined })
    plDialogVisible.value = true
  }

  async function submitPl() {
    if (!plForm.name.trim()) {
      ElMessage.warning('名称不能为空')
      return
    }
    saving.value = true
    try {
      if (plForm.id) {
        await mdProductLineApi.update(plForm.id, { name: plForm.name })
      } else {
        if (!plForm.code.trim() || !plForm.buId) {
          ElMessage.warning('请填写编码并选择所属 BU')
          return
        }
        await mdProductLineApi.create({
          code: plForm.code.trim(),
          name: plForm.name,
          buId: plForm.buId
        })
      }
      ElMessage.success('已保存')
      plDialogVisible.value = false
      await Promise.all([loadProductLines(), loadBus()])
    } finally {
      saving.value = false
    }
  }

  // ── 换属 ──

  const reparentVisible = ref(false)
  const reparentRow = ref<MdProductLine | null>(null)
  const reparentTarget = ref<number | undefined>(undefined)

  function openReparent(row: MdProductLine) {
    reparentRow.value = row
    reparentTarget.value = undefined
    reparentVisible.value = true
  }

  async function submitReparent() {
    if (!reparentRow.value || !reparentTarget.value) {
      ElMessage.warning('请选择目标业务单元')
      return
    }
    saving.value = true
    try {
      await mdProductLineApi.reparent(reparentRow.value.id, reparentTarget.value)
      ElMessage.success('已换属（存量引用保持原值）')
      reparentVisible.value = false
      await loadProductLines()
    } finally {
      saving.value = false
    }
  }

  function onPlDisable(row: MdProductLine) {
    ElMessageBox.confirm(
      `停用「${row.name}」：停用后不可被新业务引用，已有数据不受影响`,
      '停用产品线',
      { type: 'warning' }
    )
      .then(() => mdProductLineApi.disable(row.id))
      .then(() => {
        ElMessage.success('已停用')
        return loadProductLines()
      })
      .catch(() => undefined)
  }

  function onPlEnable(row: MdProductLine) {
    mdProductLineApi
      .enable(row.id)
      .then(() => {
        ElMessage.success('已启用')
        return loadProductLines()
      })
      .catch(() => undefined)
  }

  // ── 初始化 ──

  onMounted(() => {
    loadBus()
    loadProductLines()
  })

  function formatDateTime(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN', { hour12: false })
  }
</script>
