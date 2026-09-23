<template>
  <div class="cso-page">
    <header class="cso-page-header">
      <div>
        <div class="cso-eyebrow">CONTRACTS</div>
        <h1 class="cso-title">合同管理</h1>
        <p class="cso-subtitle"
          >合同台账、电子签署进度、变更管理与保证金管理;多产品线可合并签署框架合同。</p
        >
      </div>
      <div class="header-actions">
        <ElButton @click="templateVisible = true">
          <ArtSvgIcon icon="ri:file-copy-2-line" class="mr-1" />合同模板库
        </ElButton>
        <ElButton type="primary" @click="openCreate">
          <ArtSvgIcon icon="ri:draft-line" class="mr-1" />新建合同
        </ElButton>
      </div>
    </header>

    <ElTabs v-model="activeTab" class="contract-tabs">
      <ElTabPane label="合同清单" name="list">
        <div class="cso-filter-bar">
          <ElInput
            v-model="keyword"
            clearable
            placeholder="搜索合同编号 / CSO"
            style="width: 250px"
          >
            <template #prefix><ArtSvgIcon icon="ri:search-line" /></template>
          </ElInput>
          <ElSelect v-model="statusFilter" style="width: 140px">
            <ElOption label="全部状态" value="全部" />
            <ElOption v-for="item in contractStatuses" :key="item" :label="item" :value="item" />
          </ElSelect>
          <ElSelect v-model="buFilter" style="width: 130px">
            <ElOption label="全部BU" value="全部" />
            <ElOption label="BU A" value="BU A" />
            <ElOption label="BU B" value="BU B" />
            <ElOption label="BU C" value="BU C" />
          </ElSelect>
          <div class="filter-spacer"></div>
          <ElButton @click="ElMessage.success('已导出合同清单(PDF)')">
            <ArtSvgIcon icon="ri:download-2-line" class="mr-1" />导出
          </ElButton>
        </div>

        <section class="cso-panel">
          <div class="cso-panel__header">
            <div>
              <span class="cso-panel__title">合同台账</span>
              <span class="cso-panel__note"
                >共 {{ filteredContracts.length }} 份 · 多产品线可合并签署框架合同</span
              >
            </div>
            <span class="table-note"
              >模板按 BU × 产品线 × 主体类型 自动匹配 · 自然人合同含合规承诺条款</span
            >
          </div>
          <ElTable :data="filteredContracts" class="cso-table" style="width: 100%">
            <ElTableColumn prop="id" label="合同编号" width="135" fixed />
            <ElTableColumn label="CSO / 合同要素" min-width="260">
              <template #default="scope">
                <button
                  class="cso-link contract-link"
                  type="button"
                  @click="openContract(scope.row)"
                >
                  <strong>{{ scope.row.cso }}</strong>
                  <small>{{ contractScope(scope.row) }}</small>
                </button>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="period" label="有效期" min-width="180" />
            <ElTableColumn label="签署进度" min-width="210">
              <template #default="scope">
                <div class="sign-track">
                  <span
                    v-for="(step, index) in scope.row.signSteps"
                    :key="step.title"
                    :class="['sign-dot', { 'sign-dot--done': index < scope.row.signProgress }]"
                    :title="`${step.title} ${step.date}`"
                  ></span>
                  <em
                    >{{ scope.row.signProgress }}/5 ·
                    {{ scope.row.signSteps[scope.row.signProgress - 1]?.title ?? '待发起' }}</em
                  >
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn label="状态" width="105" align="center">
              <template #default="scope">
                <span :class="['cso-badge', contractTone(scope.row.status)]">{{
                  scope.row.status
                }}</span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="变更" width="70" align="center">
              <template #default="scope">
                <span v-if="scope.row.changes" class="cso-link" @click="activeTab = 'changes'"
                  >{{ scope.row.changes }} 次</span
                >
                <span v-else class="cso-empty-note">—</span>
              </template>
            </ElTableColumn>
            <ElTableColumn label="操作" width="85" fixed="right" align="center">
              <template #default="scope">
                <ElButton link type="primary" @click="openContract(scope.row)">合同卡</ElButton>
              </template>
            </ElTableColumn>
          </ElTable>
        </section>
      </ElTabPane>

      <ElTabPane label="变更管理" name="changes">
        <section class="cso-panel">
          <div class="cso-panel__header">
            <div>
              <span class="cso-panel__title">合同变更记录</span>
              <span class="cso-panel__note"
                >变更需指定产品线并经审批 · 仅可从申请当月或之后生效,不支持追溯生效</span
              >
            </div>
            <ElButton type="primary" link @click="openChange()">发起变更</ElButton>
          </div>
          <ElTable :data="changeRows" class="cso-table" style="width: 100%">
            <ElTableColumn prop="id" label="变更单号" width="135" />
            <ElTableColumn prop="contract" label="合同编号" width="120" />
            <ElTableColumn prop="type" label="变更类型" width="110" />
            <ElTableColumn prop="product" label="产品线" width="100" />
            <ElTableColumn label="变更前 → 变更后" min-width="280">
              <template #default="scope">
                <div class="change-cell">
                  <span class="change-before">{{ scope.row.before }}</span>
                  <ArtSvgIcon icon="ri:arrow-right-line" />
                  <span class="change-after">{{ scope.row.after }}</span>
                </div>
              </template>
            </ElTableColumn>
            <ElTableColumn prop="effective" label="生效规则" min-width="160" />
            <ElTableColumn prop="approver" label="审批" min-width="180" />
            <ElTableColumn label="状态" width="90" align="center">
              <template #default="scope">
                <span
                  :class="[
                    'cso-badge',
                    scope.row.status === '已生效' ? 'cso-badge--success' : 'cso-badge--warning'
                  ]"
                  >{{ scope.row.status }}</span
                >
              </template>
            </ElTableColumn>
          </ElTable>
          <div class="change-note">
            <ArtSvgIcon icon="ri:time-line" />
            <span
              >变更历史完整保留变更前后对比,支持按合同维度查看变更时间线;返利按生效月份分段计算。</span
            >
          </div>
        </section>
      </ElTabPane>

      <ElTabPane label="保证金管理" name="deposits">
        <div class="cso-grid-equal deposit-grid">
          <section v-for="item in deposits" :key="item.cso" class="cso-panel deposit-panel">
            <div class="deposit-head">
              <div
                ><strong>{{ item.cso }}</strong
                ><small
                  >应缴 {{ formatCurrency(item.amount) }} · 缴纳于 {{ item.paidAt }}</small
                ></div
              >
              <span
                :class="[
                  'cso-badge',
                  item.status === '正常' ? 'cso-badge--success' : 'cso-badge--danger'
                ]"
                >{{ item.status }}</span
              >
            </div>
            <div class="deposit-amounts">
              <div
                ><span>累计扣除</span
                ><strong class="deduction">− {{ formatCurrency(item.deducted) }}</strong></div
              >
              <div
                ><span>当前余额</span
                ><strong :class="item.status === '正常' ? '' : 'danger-text'">{{
                  formatCurrency(item.balance)
                }}</strong></div
              >
              <div
                ><span>余额比例</span
                ><strong>{{ Math.round((item.balance / item.amount) * 100) }}%</strong></div
              >
            </div>
            <ElProgress
              :percentage="Math.round((item.balance / item.amount) * 100)"
              :stroke-width="7"
              :show-text="false"
              :color="item.status === '正常' ? '#2a9b65' : '#d94b4b'"
            />
            <div class="deposit-records">
              <article v-for="(record, index) in item.records" :key="index">
                <span
                  :class="[
                    'record-tag',
                    record.type === '缴纳' ? 'record-tag--in' : 'record-tag--out'
                  ]"
                  >{{ record.type }}</span
                >
                <div
                  ><small>{{ record.date }}</small
                  ><p>{{ record.note }}</p></div
                >
                <strong :class="record.amount > 0 ? '' : 'deduction'"
                  >{{ record.amount > 0 ? '+' : '' }}{{ formatCurrency(record.amount) }}</strong
                >
              </article>
            </div>
            <ElAlert
              v-if="item.status !== '正常'"
              title="保证金不足,请及时补足"
              description="系统已自动提醒CSO与相关人员;逾期未补足将触发返利发放延迟。"
              type="error"
              :closable="false"
              show-icon
            />
          </section>
        </div>
      </ElTabPane>
    </ElTabs>

    <ElDrawer v-model="contractVisible" title="合同卡" size="620px">
      <div v-if="selectedContract" class="contract-card">
        <div class="contract-cover">
          <span>CT</span>
          <strong>市场推广服务框架合同 · {{ selectedContract.lines.length }} 条产品线授权</strong>
          <small>{{ selectedContract.id }} · {{ selectedContract.cso }} · 版本 V1.0</small>
          <div class="contract-cover__badges">
            <span class="cso-badge cso-badge--primary"
              ><ArtSvgIcon icon="ri:pen-nib-line" />电子签</span
            >
            <span :class="['cso-badge', contractTone(selectedContract.status)]">{{
              selectedContract.status
            }}</span>
          </div>
        </div>

        <div class="cso-section-label">授权明细 · 每行构成一条合作关系</div>
        <ElTable :data="selectedContract.lines" class="cso-table" size="small">
          <ElTableColumn prop="bu" label="BU" width="80" />
          <ElTableColumn prop="product" label="产品线" width="110" />
          <ElTableColumn prop="region" label="授权区域" width="110" />
          <ElTableColumn label="合作类型" min-width="130">
            <template #default="scope">市场推广服务 · {{ scope.row.level }}</template>
          </ElTableColumn>
          <ElTableColumn prop="policy" label="政策版本" width="100" align="center" />
        </ElTable>

        <dl class="cso-kv-grid two-cols mt-4">
          <div class="cso-kv"
            ><dt>合同有效期</dt><dd>{{ selectedContract.period }}</dd></div
          >
          <div class="cso-kv"
            ><dt>产品线授权数</dt><dd>{{ selectedContract.lines.length }} 条</dd></div
          >
        </dl>

        <div class="cso-section-label">签署进度 · CA电子签章</div>
        <div class="sign-flow">
          <template v-for="(step, index) in selectedContract.signSteps" :key="step.title">
            <article :class="{ done: index < selectedContract.signProgress }">
              <span
                ><ArtSvgIcon
                  :icon="
                    index < selectedContract.signProgress
                      ? 'ri:checkbox-circle-fill'
                      : 'ri:time-line'
                  "
              /></span>
              <strong>{{ step.title }}</strong>
              <small>{{ step.date }}</small>
            </article>
            <ArtSvgIcon
              v-if="index < selectedContract.signSteps.length - 1"
              icon="ri:arrow-right-line"
            />
          </template>
        </div>
        <div class="final-file">
          <ArtSvgIcon icon="ri:file-pdf-2-line" />
          <span>Signed Contract_{{ selectedContract.id }}.pdf</span>
          <ElButton link type="primary" @click="ElMessage.success('已下载签章版合同PDF')"
            >下载</ElButton
          >
        </div>
      </div>
      <template #footer>
        <ElButton @click="contractVisible = false">关闭</ElButton>
        <ElButton
          v-if="selectedContract?.status === '内部审批中'"
          type="primary"
          @click="advanceContract('待甲方签署', 2, '内部审批通过,签署版PDF已生成并发送甲方签署')"
          >审批通过,生成签署文件</ElButton
        >
        <ElButton
          v-else-if="selectedContract?.status === '待甲方签署'"
          type="primary"
          @click="advanceContract('待CSO签署', 3, '甲方已签署,签署任务已推送CSO(CA电子签)')"
          >发送CSO签署</ElButton
        >
        <ElButton
          v-else-if="selectedContract?.status === '待CSO签署'"
          type="primary"
          @click="advanceContract('已生效', 5, 'CSO已完成电子签署,合同归档生效')"
          >CSO已签署,归档生效</ElButton
        >
        <ElButton
          v-else-if="selectedContract?.status === '已生效'"
          type="primary"
          @click="openChange(selectedContract)"
          >发起变更</ElButton
        >
      </template>
    </ElDrawer>

    <ElDialog v-model="createVisible" title="新建合同" width="720px">
      <ElAlert
        title="一份框架合同可覆盖多BU、多产品线;每行授权明细构成一条独立合作关系(主体×BU×产品线×区域×级别×有效期)。自然人主体自动附加合规承诺条款。"
        type="info"
        :closable="false"
        show-icon
        class="mb-4"
      />
      <ElForm label-position="top" :model="createForm">
        <ElRow :gutter="14">
          <ElCol :span="12">
            <ElFormItem label="合作主体(准入通过)" required>
              <ElSelect
                v-model="createForm.cso"
                filterable
                class="w-full"
                placeholder="选择准入通过的CSO"
              >
                <ElOption
                  v-for="item in eligibleCsos"
                  :key="item.cso"
                  :label="item.cso"
                  :value="item.cso"
                />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="6">
            <ElFormItem label="匹配模板">
              <ElInput v-model="matchedTemplate" readonly />
            </ElFormItem>
          </ElCol>
          <ElCol :span="6">
            <ElFormItem label="合同有效期" required>
              <ElDatePicker
                v-model="createForm.period"
                type="daterange"
                value-format="YYYY.MM.DD"
                start-placeholder="开始"
                end-placeholder="结束"
                class="w-full"
              />
            </ElFormItem>
          </ElCol>
        </ElRow>

        <div class="cso-section-label">授权明细 · 每行 = BU × 产品线 × 授权区域 × 级别</div>
        <div v-for="(line, index) in createForm.lines" :key="index" class="line-row">
          <ElSelect v-model="line.bu" placeholder="BU">
            <ElOption label="BU A" value="BU A" /><ElOption label="BU B" value="BU B" /><ElOption
              label="BU C"
              value="BU C"
            />
          </ElSelect>
          <ElSelect v-model="line.product" placeholder="产品线">
            <ElOption
              v-for="item in productsByBu(line.bu)"
              :key="item"
              :label="item"
              :value="item"
            />
          </ElSelect>
          <ElSelect v-model="line.region" placeholder="授权区域">
            <ElOption label="华东区域" value="华东区域" /><ElOption
              label="华中区域"
              value="华中区域"
            /><ElOption label="华南区域" value="华南区域" /><ElOption
              label="西南区域"
              value="西南区域"
            />
          </ElSelect>
          <ElSelect v-model="line.level" placeholder="级别">
            <ElOption label="一级代理" value="一级代理" /><ElOption
              label="二级代理"
              value="二级代理"
            /><ElOption label="非独家" value="非独家" />
          </ElSelect>
          <ElSelect v-model="line.policy" placeholder="政策版本">
            <ElOption label="Policy A" value="Policy A" /><ElOption
              label="Policy B"
              value="Policy B"
            /><ElOption label="Policy C" value="Policy C" />
          </ElSelect>
          <ElButton
            link
            type="danger"
            :disabled="createForm.lines.length <= 1"
            @click="createForm.lines.splice(index, 1)"
            ><ArtSvgIcon icon="ri:delete-bin-line"
          /></ElButton>
        </div>
        <ElButton link type="primary" @click="addLine"
          ><ArtSvgIcon
            icon="ri:add-line"
            class="mr-1"
          />添加产品线授权(多BU/多产品线合并签署一份框架合同)</ElButton
        >
      </ElForm>
      <template #footer>
        <ElButton @click="createVisible = false">取消</ElButton>
        <ElButton @click="submitCreate('草稿')">保存草稿</ElButton>
        <ElButton type="primary" @click="submitCreate('审批')">提交审批</ElButton>
      </template>
    </ElDialog>

    <ElDialog v-model="changeVisible" title="发起合同变更" width="560px">
      <ElAlert
        title="变更需指定产品线并经审批;仅可从申请当月或之后生效,不支持追溯生效。"
        type="warning"
        :closable="false"
        show-icon
        class="mb-4"
      />
      <ElForm label-position="top" :model="changeForm">
        <ElRow :gutter="14">
          <ElCol :span="12">
            <ElFormItem label="合同" required>
              <ElSelect v-model="changeForm.contract" class="w-full" placeholder="选择生效中的合同">
                <ElOption
                  v-for="item in activeContracts"
                  :key="item.id"
                  :label="`${item.id} · ${item.cso}`"
                  :value="item.id"
                />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="变更类型"
              ><ElSelect v-model="changeForm.type" class="w-full"
                ><ElOption label="指标变更" value="指标变更" /><ElOption
                  label="授权区域变更"
                  value="授权区域变更" /><ElOption label="退出终止" value="退出终止" /></ElSelect
            ></ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="指定产品线" required>
              <ElSelect v-model="changeForm.product" class="w-full" placeholder="变更生效的产品线">
                <ElOption
                  v-for="line in changeContractLines"
                  :key="`${line.bu}-${line.product}`"
                  :label="`${line.bu} · ${line.product}`"
                  :value="line.product"
                />
              </ElSelect>
            </ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="变更内容(变更后)" required
              ><ElInput v-model="changeForm.after" placeholder="如:年度承诺 ¥3,600,000 / 增加安徽"
            /></ElFormItem>
          </ElCol>
          <ElCol :span="12">
            <ElFormItem label="生效月份(当月或之后)" required>
              <ElDatePicker
                v-model="changeForm.effective"
                type="month"
                value-format="YYYY-MM"
                :disabled-date="disablePastMonth"
                class="w-full"
              />
            </ElFormItem>
          </ElCol>
        </ElRow>
      </ElForm>
      <template #footer>
        <ElButton @click="changeVisible = false">取消</ElButton>
        <ElButton type="primary" @click="submitChange">提交变更审批</ElButton>
      </template>
    </ElDialog>

    <ElDrawer v-model="templateVisible" title="合同模板库" size="520px">
      <div class="template-list">
        <article v-for="tpl in templates" :key="tpl.name">
          <span class="template-icon"><ArtSvgIcon icon="ri:file-text-line" /></span>
          <div
            ><strong>{{ tpl.name }}</strong
            ><small>{{ tpl.scope }} · 含反商业贿赂条款 v{{ tpl.version }}</small></div
          >
          <span :class="['cso-badge', tpl.enabled ? 'cso-badge--success' : 'cso-badge--info']">{{
            tpl.enabled ? '启用中' : '停用'
          }}</span>
        </article>
      </div>
      <ElAlert
        title="模板按 BU × 产品线 × 主体类型 维护;条款变更走合规审查流程并保留版本。"
        type="info"
        :closable="false"
        show-icon
        class="mt-4"
      />
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { computed, reactive, ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import {
    contractChanges,
    contracts,
    deposits,
    formatCurrency,
    onboardingApplications,
    type ContractRecord
  } from '../mock'

  defineOptions({ name: 'CsoContracts' })

  const activeTab = ref('list')
  const keyword = ref('')
  const statusFilter = ref('全部')
  const buFilter = ref('全部')
  const contractVisible = ref(false)
  const templateVisible = ref(false)
  const createVisible = ref(false)
  const changeVisible = ref(false)
  const selectedContract = ref<ContractRecord | null>(null)

  const contractRows = ref(
    contracts.map((item) => ({ ...item, signSteps: item.signSteps.map((step) => ({ ...step })) }))
  )
  const changeRows = ref(contractChanges.map((item) => ({ ...item })))

  const contractStatuses = computed(() => [
    ...new Set(contractRows.value.map((item) => item.status))
  ])

  const filteredContracts = computed(() =>
    contractRows.value.filter((item) => {
      const matchesKeyword =
        !keyword.value ||
        `${item.id}${item.cso}`.toLowerCase().includes(keyword.value.toLowerCase())
      const matchesStatus = statusFilter.value === '全部' || item.status === statusFilter.value
      const matchesBu =
        buFilter.value === '全部' || item.lines.some((line) => line.bu === buFilter.value)
      return matchesKeyword && matchesStatus && matchesBu
    })
  )

  const eligibleCsos = onboardingApplications
    .filter((item) => item.stage === '已生效' || item.stage === '合规终审')
    .map((item) => ({ cso: item.cso, type: item.type }))
  const activeContracts = computed(() =>
    contractRows.value.filter((item) => item.status === '已生效')
  )

  const buProducts: Record<string, string[]> = {
    'BU A': ['Product X', 'Product A', 'Product B', 'Product D'],
    'BU B': ['Product C', 'Product F'],
    'BU C': ['Product E']
  }
  const productsByBu = (bu: string) => buProducts[bu] ?? ['Product X']

  const createForm = reactive({
    cso: '',
    period: ['2026.10.01', '2026.12.31'] as string[],
    lines: [
      {
        bu: 'BU A',
        product: 'Product X',
        region: '华东区域',
        level: '一级代理',
        policy: 'Policy A'
      }
    ]
  })
  const matchedTemplate = computed(() => {
    const isNatural = eligibleCsos.find((item) => item.cso === createForm.cso)?.type === '自然人'
    return isNatural
      ? '市场推广服务合同(自然人·含三方公司) v1.4'
      : '市场推广服务框架合同(公司主体) v2.1'
  })

  const addLine = () => {
    createForm.lines.push({
      bu: 'BU B',
      product: 'Product C',
      region: '华南区域',
      level: '二级代理',
      policy: 'Policy C'
    })
  }

  const today = () => {
    const d = new Date()
    return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const openCreate = () => {
    createForm.cso = eligibleCsos[0]?.cso ?? ''
    createForm.lines = [
      {
        bu: 'BU A',
        product: 'Product X',
        region: '华东区域',
        level: '一级代理',
        policy: 'Policy A'
      }
    ]
    createVisible.value = true
  }

  const submitCreate = (mode: '草稿' | '审批') => {
    if (!createForm.cso) {
      ElMessage.warning('请选择合作主体')
      return
    }
    if (createForm.lines.some((line) => !line.bu || !line.product || !line.region || !line.level)) {
      ElMessage.warning('授权明细存在未填完整的行')
      return
    }
    const id = `CT2026${String(120 + contractRows.value.length).padStart(3, '0')}`
    const steps = ['内部审批', 'PDF生成', '甲方签署', 'CSO签署', '归档生效'].map((title) => ({
      title,
      date: '—'
    }))
    contractRows.value.unshift({
      id,
      cso: createForm.cso,
      period: `${createForm.period?.[0] ?? '2026.10.01'} – ${createForm.period?.[1] ?? '2026.12.31'}`,
      status: mode === '草稿' ? '草稿' : '内部审批中',
      signProgress: 0,
      signSteps: steps,
      changes: 0,
      lines: createForm.lines.map((line) => ({ ...line }))
    })
    createVisible.value = false
    ElMessage.success(
      mode === '草稿'
        ? `合同 ${id} 草稿已保存(${createForm.lines.length} 条产品线授权)`
        : `合同 ${id} 已生成(${createForm.lines.length} 条产品线授权)并提交内部审批`
    )
  }

  const advanceContract = (status: string, progress: number, message: string) => {
    if (!selectedContract.value) return
    selectedContract.value.status = status
    selectedContract.value.signProgress = progress
    for (let i = 0; i < progress; i += 1)
      selectedContract.value.signSteps[i].date =
        selectedContract.value.signSteps[i].date === '—'
          ? today()
          : selectedContract.value.signSteps[i].date
    ElMessage.success(message)
  }

  const changeForm = reactive({
    contract: '',
    product: '',
    type: '指标变更',
    after: '',
    effective: ''
  })

  const changeContractLines = computed(() => {
    const target = contractRows.value.find((item) => item.id === changeForm.contract)
    return target?.lines ?? []
  })

  const openChange = (row?: ContractRecord) => {
    if (row) changeForm.contract = row.id
    changeForm.product = ''
    changeForm.after = ''
    changeForm.effective = ''
    changeVisible.value = true
  }

  const disablePastMonth = (date: Date) => {
    const now = new Date()
    return date.getTime() < new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  }

  const submitChange = () => {
    if (
      !changeForm.contract ||
      !changeForm.product ||
      !changeForm.after.trim() ||
      !changeForm.effective
    ) {
      ElMessage.warning('请填写合同、产品线、变更内容与生效月份')
      return
    }
    const target = contractRows.value.find((item) => item.id === changeForm.contract)
    changeRows.value.unshift({
      id: `CHG-2026-${String(30 + changeRows.value.length).padStart(3, '0')}`,
      contract: changeForm.contract,
      type: changeForm.type,
      product: changeForm.product,
      before: '见合同原文',
      after: changeForm.after,
      effective: `${changeForm.effective}-01 起`,
      status: '审批中',
      approver: '区域初审(进行中)'
    })
    if (target) target.changes += 1
    changeVisible.value = false
    activeTab.value = 'changes'
    ElMessage.success('变更已提交审批,审批通过后进入变更时间线')
  }

  const templates = [
    {
      name: '市场推广服务框架合同(公司主体)',
      scope: 'BU A/B/C · 全产品线',
      version: '2.1',
      enabled: true
    },
    {
      name: '市场推广服务合同(自然人·含三方公司)',
      scope: 'BU B · Product C/F',
      version: '1.4',
      enabled: true
    },
    {
      name: '市场推广服务合同(公司主体·简易)',
      scope: 'BU C · Product E',
      version: '1.2',
      enabled: false
    }
  ]

  const contractTone = (value: string) =>
    value === '已生效'
      ? 'cso-badge--success'
      : value === '已终止'
        ? 'cso-badge--info'
        : value === '草稿'
          ? 'cso-badge--info'
          : value === '待CSO签署' || value === '内部审批中'
            ? 'cso-badge--warning'
            : 'cso-badge--primary'
  const contractScope = (row: ContractRecord) => {
    const bus = [...new Set(row.lines.map((line: ContractRecord['lines'][number]) => line.bu))]
    return `${bus.join('、')} · ${row.lines.length} 条产品线授权`
  }
  const openContract = (row: ContractRecord) => {
    selectedContract.value = row
    contractVisible.value = true
  }
</script>

<style lang="scss" scoped>
  @use '../shared';

  .header-actions {
    display: flex;
    gap: 10px;
  }

  .line-row {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-bottom: 8px;
  }

  .line-row .el-select {
    flex: 1;
  }

  .contract-tabs :deep(.el-tabs__header) {
    margin-bottom: 16px;
  }

  .filter-spacer {
    flex: 1;
  }

  .table-note {
    font-size: 12px;
    color: var(--cso-muted);
  }

  .contract-link {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0;
    text-align: left;
  }

  .contract-link strong {
    font-size: 13px;
    color: var(--cso-text);
  }

  .contract-link small {
    font-size: 12px;
    color: var(--cso-muted);
  }

  .sign-track {
    display: flex;
    gap: 5px;
    align-items: center;
  }

  .sign-dot {
    width: 16px;
    height: 7px;
    background: #dbe4f0;
    border-radius: 4px;
  }

  .sign-dot--done {
    background: var(--cso-green);
  }

  .sign-track em {
    margin-left: 6px;
    font-size: 12px;
    font-style: normal;
    color: var(--cso-muted);
    white-space: nowrap;
  }

  .change-cell {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .change-cell svg {
    flex: 0 0 14px;
    color: var(--cso-blue);
  }

  .change-before {
    padding: 4px 8px;
    font-size: 12px;
    color: #53657c;
    background: #eef2f7;
    border-radius: 6px;
  }

  .change-after {
    padding: 4px 8px;
    font-size: 12px;
    font-weight: 650;
    color: #135abd;
    background: var(--cso-blue-soft);
    border-radius: 6px;
  }

  .change-note {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 13px 18px;
    font-size: 12px;
    color: var(--cso-muted);
    border-top: 1px solid var(--cso-line);
  }

  .deposit-grid {
    align-items: start;
  }

  .deposit-panel {
    padding: 18px;
  }

  .deposit-head {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    justify-content: space-between;
  }

  .deposit-head strong {
    display: block;
    font-size: 14px;
  }

  .deposit-head small {
    display: block;
    margin-top: 5px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .deposit-amounts {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin: 15px 0 10px;
  }

  .deposit-amounts span {
    display: block;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .deposit-amounts strong {
    display: block;
    margin-top: 5px;
    font-size: 16px;
  }

  .deduction {
    color: var(--cso-red);
  }

  .danger-text {
    color: var(--cso-red);
  }

  .deposit-records {
    display: grid;
    gap: 9px;
    margin: 15px 0;
  }

  .deposit-records article {
    display: flex;
    gap: 11px;
    align-items: center;
    padding: 11px;
    background: #f7f9fc;
    border-radius: 9px;
  }

  .record-tag {
    display: grid;
    place-items: center;
    width: 40px;
    height: 22px;
    font-size: 12px;
    font-weight: 700;
    border-radius: 6px;
  }

  .record-tag--in {
    color: var(--cso-green);
    background: var(--cso-green-soft);
  }

  .record-tag--out {
    color: var(--cso-red);
    background: var(--cso-red-soft);
  }

  .deposit-records article div {
    flex: 1;
  }

  .deposit-records small {
    display: block;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .deposit-records p {
    margin: 3px 0 0;
    font-size: 12px;
  }

  .deposit-records article > strong {
    font-size: 13px;
    white-space: nowrap;
  }

  .contract-card {
    padding: 0 4px;
  }

  .contract-cover {
    padding: 18px;
    margin-bottom: 18px;
    color: #fff;
    background: linear-gradient(135deg, #0b2c4d, #14529c);
    border-radius: 12px;
  }

  .contract-cover span {
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.16em;
    opacity: 0.75;
  }

  .contract-cover strong {
    display: block;
    margin-top: 6px;
    font-size: 16px;
    line-height: 1.4;
  }

  .contract-cover small {
    display: block;
    margin-top: 5px;
    font-size: 12px;
    opacity: 0.85;
  }

  .contract-cover__badges {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }

  .contract-cover__badges .cso-badge {
    color: #fff;
    background: rgb(255 255 255 / 18%);
  }

  .sign-flow {
    display: flex;
    gap: 4px;
    align-items: center;
  }

  .sign-flow article {
    flex: 1;
    padding: 11px 6px;
    text-align: center;
    background: #fafbfc;
    border: 1px solid var(--cso-line);
    border-radius: 9px;
  }

  .sign-flow article.done {
    background: #f5fcf8;
    border-color: #cdeadc;
  }

  .sign-flow span {
    display: inline-flex;
    color: #b6c1cf;
  }

  .sign-flow article.done span {
    color: var(--cso-green);
  }

  .sign-flow strong {
    display: block;
    margin-top: 6px;
    font-size: 12px;
  }

  .sign-flow small {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .sign-flow svg[class*='arrow'] {
    color: #aab6c5;
  }

  .final-file {
    display: flex;
    gap: 9px;
    align-items: center;
    padding: 12px;
    margin-top: 14px;
    font-size: 12px;
    background: #f4f7fb;
    border-radius: 9px;
  }

  .final-file svg {
    color: var(--cso-blue);
  }

  .final-file span {
    flex: 1;
  }

  .template-list {
    display: grid;
    gap: 10px;
  }

  .template-list article {
    display: flex;
    gap: 11px;
    align-items: center;
    padding: 13px;
    border: 1px solid var(--cso-line);
    border-radius: 10px;
  }

  .template-icon {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    color: var(--cso-blue);
    background: var(--cso-blue-soft);
    border-radius: 9px;
  }

  .template-list article div {
    flex: 1;
  }

  .template-list strong {
    display: block;
    font-size: 13px;
  }

  .template-list small {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  @media (width <= 720px) {
    .header-actions {
      flex-direction: column;
    }

    .sign-flow {
      flex-direction: column;
    }

    .sign-flow svg[class*='arrow'] {
      transform: rotate(90deg);
    }
  }
</style>
