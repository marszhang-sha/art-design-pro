<template>
  <div class="cso-page">
    <header class="cso-page-header">
      <div>
        <div class="cso-eyebrow">ADMISSION</div>
        <h1 class="cso-title">准入管理</h1>
        <p class="cso-subtitle">CSO准入申请、资质核验、尽职调查与多级审批;审批权限按BU隔离。</p>
      </div>
      <ElButton type="primary" @click="ElMessage.success('已向CSO开放在线申请入口')">
        <ArtSvgIcon icon="ri:user-add-line" class="mr-1" />邀请CSO在线申请
      </ElButton>
    </header>

    <section class="cso-panel process-panel">
      <div class="cso-panel__header">
        <div>
          <span class="cso-panel__title">业务流程</span>
          <span class="cso-panel__note">本月 6 件申请在办分布</span>
        </div>
      </div>
      <div class="process-flow">
        <template v-for="(step, index) in processSteps" :key="step.name">
          <article :class="['process-node', { 'process-node--active': step.active }]">
            <span class="process-no">{{ index + 1 }}</span>
            <div>
              <strong>{{ step.name }}</strong>
              <small>{{ step.detail }}</small>
            </div>
            <span class="process-count">{{ step.count }} 件</span>
          </article>
          <ArtSvgIcon
            v-if="index < processSteps.length - 1"
            icon="ri:arrow-right-line"
            class="process-arrow"
          />
        </template>
      </div>
    </section>

    <section class="cso-stat-grid compact-stats">
      <div v-for="item in summary" :key="item.label" class="cso-stat-card compact-card">
        <span class="cso-stat-label">{{ item.label }}</span>
        <strong class="summary-value">{{ item.value }}</strong>
        <span :class="['cso-badge', `cso-badge--${item.tone}`]">{{ item.note }}</span>
      </div>
    </section>

    <div class="cso-filter-bar">
      <ElInput
        v-model="keyword"
        clearable
        placeholder="搜索申请编号 / CSO名称"
        style="width: 260px"
      >
        <template #prefix><ArtSvgIcon icon="ri:search-line" /></template>
      </ElInput>
      <ElSelect v-model="stageFilter" style="width: 150px">
        <ElOption label="全部阶段" value="全部" />
        <ElOption v-for="item in stageOptions" :key="item" :label="item" :value="item" />
      </ElSelect>
      <ElSelect v-model="typeFilter" style="width: 140px">
        <ElOption label="全部主体类型" value="全部" />
        <ElOption label="公司主体" value="公司主体" />
        <ElOption label="自然人" value="自然人" />
      </ElSelect>
      <div class="filter-spacer"></div>
      <ElButton @click="ElMessage.success('已导出准入清单')">
        <ArtSvgIcon icon="ri:download-2-line" class="mr-1" />导出
      </ElButton>
    </div>

    <section class="cso-panel">
      <div class="cso-panel__header">
        <div>
          <span class="cso-panel__title">准入申请清单</span>
          <span class="cso-panel__note">共 {{ filteredApplications.length }} 件</span>
        </div>
        <span class="view-hint">点击CSO名称查看详情</span>
      </div>
      <ElTable :data="filteredApplications" class="cso-table" style="width: 100%">
        <ElTableColumn prop="id" label="申请编号" width="140" fixed />
        <ElTableColumn label="申请主体" min-width="230">
          <template #default="scope">
            <button class="cso-link apply-link" type="button" @click="openCard(scope.row)">
              <strong>{{ scope.row.cso }}</strong>
              <small v-if="scope.row.thirdParty">三方公司:{{ scope.row.thirdParty }}</small>
            </button>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="type" label="主体类型" width="95" align="center">
          <template #default="scope">
            <span
              :class="[
                'cso-badge',
                scope.row.type === '自然人' ? 'cso-badge--warning' : 'cso-badge--info'
              ]"
              >{{ scope.row.type }}</span
            >
          </template>
        </ElTableColumn>
        <ElTableColumn label="合作意向" min-width="200">
          <template #default="scope">
            <div class="intention-cell">
              <span>{{ scope.row.bu }} · {{ scope.row.product }}</span>
              <small>{{ scope.row.region }} · {{ scope.row.intention }}</small>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="submittedAt" label="提交日期" width="118" align="center" />
        <ElTableColumn prop="dueDiligence" label="尽调结论" width="145" align="center" />
        <ElTableColumn prop="stage" label="当前阶段" width="105" align="center">
          <template #default="scope">
            <span :class="['cso-badge', stageTone(scope.row.stage)]">{{ scope.row.stage }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn
          label="操作"
          width="300"
          fixed="right"
          align="center"
          class-name="action-col"
        >
          <template #default="scope">
            <ElButton link type="primary" @click="openCard(scope.row)">详情</ElButton>
            <ElButton link type="primary" @click="openVerify(scope.row)">信息核验</ElButton>
            <ElButton link type="primary" @click="openQualify(scope.row)">资质核验</ElButton>
            <ElButton link type="primary" @click="openDd(scope.row)">尽职调查</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <div class="pagination-row">
        <span>尽调结果由商务/合规记录,过程留痕</span>
        <ElPagination background layout="prev, pager, next" :total="26" :page-size="10" />
      </div>
    </section>

    <ElDrawer v-model="cardVisible" title="准入详情" size="560px">
      <div v-if="selected" class="admit-card">
        <div class="admit-cover">
          <span>{{ selected.id }}</span>
          <strong>{{ selected.cso }}</strong>
          <small
            >{{ selected.type
            }}<template v-if="selected.thirdParty">
              · 三方公司:{{ selected.thirdParty }}</template
            ></small
          >
          <div class="admit-cover__badges">
            <span :class="['cso-badge', stageTone(selected.stage)]">{{ selected.stage }}</span>
            <span class="cso-badge cso-badge--info">{{ selected.risk }}</span>
          </div>
        </div>

        <div class="cso-section-label">流程进度</div>
        <div class="mini-steps">
          <template v-for="(step, index) in processSteps" :key="step.name">
            <article
              :class="{ done: index < selectedStepIndex, current: index === selectedStepIndex }"
            >
              <span>{{ index + 1 }}</span>
              <small>{{ step.name }}</small>
            </article>
            <i
              v-if="index < processSteps.length - 1"
              :class="{ done: index < selectedStepIndex }"
            ></i>
          </template>
        </div>

        <div class="cso-section-label">合作意向</div>
        <dl class="cso-kv-grid two-cols">
          <div class="cso-kv"
            ><dt>BU / 产品线</dt><dd>{{ selected.bu }} · {{ selected.product }}</dd></div
          >
          <div class="cso-kv"
            ><dt>区域 / 类型</dt><dd>{{ selected.region }} · {{ selected.intention }}</dd></div
          >
          <div class="cso-kv"
            ><dt>合作周期</dt><dd>{{ selected.period }}</dd></div
          >
          <div class="cso-kv"
            ><dt>提交日期</dt><dd>{{ selected.submittedAt }}</dd></div
          >
        </dl>

        <div class="cso-section-label">核验结果</div>
        <div class="gate-verify-list">
          <article
            :class="[
              'gate-verify',
              selected.gate1 === '通过' ? 'gate-verify--pass' : 'gate-verify--wait'
            ]"
          >
            <span class="gate-verify__icon"><ArtSvgIcon icon="ri:building-2-line" /></span>
            <div
              ><strong>主体真实性核验</strong
              ><small>第三方API核验 · 存续正常 · 信息查重</small></div
            >
            <span
              :class="[
                'cso-badge',
                selected.gate1 === '通过' ? 'cso-badge--success' : 'cso-badge--warning'
              ]"
              >{{ selected.gate1 }}</span
            >
          </article>
          <article
            v-for="check in checks"
            :key="check.name"
            :class="['gate-verify', check.pass ? 'gate-verify--pass' : 'gate-verify--wait']"
          >
            <span class="gate-verify__icon"><ArtSvgIcon :icon="check.icon" /></span>
            <div
              ><strong>{{ check.name }}</strong
              ><small>{{ check.detail }}</small></div
            >
            <span :class="['cso-badge', `cso-badge--${check.badge}`]">{{ check.result }}</span>
          </article>
        </div>

        <div class="cso-section-label">审批链</div>
        <div class="approval-chain">
          <template v-for="(node, index) in approvalNodes" :key="node.name">
            <article>
              <strong>{{ node.name }}</strong>
              <small>{{ node.status }}</small>
            </article>
            <ArtSvgIcon v-if="index < approvalNodes.length - 1" icon="ri:arrow-right-line" />
          </template>
        </div>
      </div>
      <template #footer>
        <ElButton @click="cardVisible = false">关闭</ElButton>
        <ElButton type="primary" @click="ElMessage.success('审批意见已提交并流转下一节点')"
          >提交审批意见</ElButton
        >
      </template>
    </ElDrawer>

    <ElDrawer v-model="verifyVisible" title="信息核验" size="640px">
      <div v-if="selected" class="admit-card">
        <div class="verify-app-bar">
          <strong>{{ selected.cso }}</strong>
          <small>{{ selected.id }} · {{ selected.type }}</small>
        </div>

        <div class="cso-section-label">申请资料(CSO上传)</div>
        <div class="material-grid">
          <article v-for="doc in uploadedMaterials" :key="doc.name">
            <span class="material-icon"><ArtSvgIcon icon="ri:file-pdf-2-line" /></span>
            <div
              ><strong>{{ doc.name }}</strong
              ><small>{{ doc.file }} · {{ doc.size }} · {{ doc.date }}</small></div
            >
            <ElButton link type="primary" @click="ElMessage.info(`正在预览 ${doc.file}(原型模拟)`)"
              >预览</ElButton
            >
          </article>
        </div>

        <div class="cso-section-label">主体信息核验 · 申请信息 vs 自动核验结果</div>
        <div
          :class="[
            'gate-verify',
            'identity-block',
            selected.gate1 === '通过' ? 'gate-verify--pass' : 'gate-verify--wait'
          ]"
        >
          <div class="identity-head">
            <span class="gate-verify__icon"><ArtSvgIcon icon="ri:building-2-line" /></span>
            <div>
              <strong>主体真实性核验</strong>
              <small v-if="selected.identity"
                >数据来源:{{ selected.identity.source }} · {{ selected.identity.time }}</small
              >
              <small v-else>尚未发起自动核验</small>
            </div>
            <span
              :class="[
                'cso-badge',
                selected.gate1 === '通过' ? 'cso-badge--success' : 'cso-badge--warning'
              ]"
              >{{ selected.gate1 }}</span
            >
          </div>

          <div v-if="selected.identity" class="compare-table">
            <header
              ><span>核验字段</span><span>申请信息(CSO上传)</span><span>自动核验结果</span
              ><span>匹配</span></header
            >
            <div
              v-for="row in selected.identity.rows"
              :key="row.label"
              :class="{ mismatch: !row.match }"
            >
              <span>{{ row.label }}</span>
              <span>{{ row.uploaded }}</span>
              <span>{{ row.api }}</span>
              <span
                :class="['cso-badge', row.match ? 'cso-badge--success' : 'cso-badge--danger']"
                >{{ row.match ? '一致' : '不一致' }}</span
              >
            </div>
          </div>
          <div v-else class="compare-empty">
            <ArtSvgIcon icon="ri:scan-2-line" />
            <span>待发起自动核验(第三方API比对工商/三方公司信息)</span>
          </div>

          <ElAlert
            v-if="hasMismatch && !manualResolved"
            title="存在不一致项:注册资本与公示信息不符,请人工核实"
            type="error"
            :closable="false"
            show-icon
            class="mt-3"
          />
          <ElAlert
            v-else-if="hasMismatch && manualResolved"
            title="不一致项已人工核实:注册资本以公示信息为准"
            type="warning"
            :closable="false"
            show-icon
            class="mt-3"
          />
          <div class="identity-actions">
            <ElButton v-if="!selected.identity" type="primary" @click="runAutoVerify"
              >发起自动核验</ElButton
            >
            <ElButton
              v-else-if="hasMismatch && !manualResolved"
              type="warning"
              @click="manualVerify"
              >转人工核实</ElButton
            >
            <ElButton v-if="selected.identity" link type="primary" @click="runAutoVerify"
              >重新核验</ElButton
            >
            <span v-if="selected.identity && selected.gate1 === '通过'" class="identity-hint"
              >✓ 已人工确认核验完成</span
            >
            <span v-else-if="selected.identity && !hasMismatch" class="identity-hint"
              >{{ selected.identity.rows.length }} 项字段全部一致,待人工最终确认</span
            >
          </div>
        </div>

        <div class="cso-section-label">核验与操作记录</div>
        <ElTimeline class="verify-log">
          <ElTimelineItem
            v-for="(log, index) in verifyLogs"
            :key="index"
            :timestamp="log.time"
            :type="log.tone"
          >
            {{ log.text }}
          </ElTimelineItem>
        </ElTimeline>
      </div>
      <template #footer>
        <ElButton @click="verifyVisible = false">关闭</ElButton>
        <ElButton
          type="primary"
          :disabled="!canConfirm || selected?.gate1 === '通过'"
          @click="confirmVerify"
        >
          {{ selected?.gate1 === '通过' ? '已人工确认核验完成' : '人工最终确认核验完成' }}
        </ElButton>
      </template>
    </ElDrawer>

    <ElDrawer v-model="qualifyVisible" title="资质核验" size="620px">
      <div v-if="selected" class="admit-card">
        <div class="verify-app-bar">
          <strong>{{ selected.cso }}</strong>
          <small>{{ selected.id }} · {{ selected.type }}</small>
        </div>

        <div class="cso-section-label">证照审核(按主体类型适用)</div>
        <div class="doc-review-list">
          <article v-for="doc in qualifyDocs" :key="doc.name">
            <span class="material-icon"><ArtSvgIcon icon="ri:file-pdf-2-line" /></span>
            <div
              ><strong>{{ doc.name }}</strong
              ><small>{{ doc.file }} · 有效期至 {{ doc.expiry }}</small></div
            >
            <ElRadioGroup v-model="doc.result" size="small">
              <ElRadioButton value="通过">通过</ElRadioButton>
              <ElRadioButton value="退回">退回</ElRadioButton>
            </ElRadioGroup>
          </article>
        </div>

        <div class="cso-section-label">定级与保证金</div>
        <ElForm label-position="top">
          <ElRow :gutter="14">
            <ElCol :span="8">
              <ElFormItem label="拟定级别">
                <ElSelect v-model="qualifyForm.level" class="w-full">
                  <ElOption label="一级代理" value="一级代理" />
                  <ElOption label="二级代理" value="二级代理" />
                  <ElOption label="非独家" value="非独家" />
                </ElSelect>
              </ElFormItem>
            </ElCol>
            <ElCol :span="8">
              <ElFormItem label="保证金金额(元)">
                <ElInputNumber
                  v-model="qualifyForm.deposit"
                  :min="0"
                  :step="50000"
                  class="w-full"
                />
              </ElFormItem>
            </ElCol>
            <ElCol :span="8">
              <ElFormItem label="年度承诺量(元)">
                <ElInputNumber
                  v-model="qualifyForm.commitment"
                  :min="0"
                  :step="100000"
                  class="w-full"
                />
              </ElFormItem>
            </ElCol>
          </ElRow>
          <ElFormItem label="审核意见">
            <ElInput
              v-model="qualifyForm.note"
              type="textarea"
              :rows="2"
              placeholder="退回时必填退回原因"
            />
          </ElFormItem>
        </ElForm>

        <div class="cso-section-label">操作记录</div>
        <ElTimeline class="verify-log">
          <ElTimelineItem
            v-for="(log, index) in qualifyLogs"
            :key="index"
            :timestamp="log.time"
            :type="log.tone"
          >
            {{ log.text }}
          </ElTimelineItem>
        </ElTimeline>
      </div>
      <template #footer>
        <ElButton @click="qualifyVisible = false">关闭</ElButton>
        <ElButton type="primary" @click="submitQualify">保存资质核验结果</ElButton>
      </template>
    </ElDrawer>

    <ElDrawer v-model="ddVisible" title="尽职调查" size="600px">
      <div v-if="selected" class="admit-card">
        <div class="verify-app-bar">
          <strong>{{ selected.cso }}</strong>
          <small>{{ selected.id }} · {{ selected.type }}</small>
        </div>

        <div class="cso-section-label">尽调项目清单</div>
        <div class="dd-check-list">
          <article v-for="item in ddItems" :key="item.name">
            <span :class="['rule-icon', `rule-icon--${item.tone}`]"
              ><ArtSvgIcon :icon="item.icon"
            /></span>
            <div
              ><strong>{{ item.name }}</strong
              ><small>{{ item.detail }}</small></div
            >
            <span :class="['cso-badge', `cso-badge--${item.badge}`]">{{ item.result }}</span>
          </article>
        </div>

        <div class="cso-section-label">尽调结论</div>
        <ElForm label-position="top">
          <ElFormItem label="结论">
            <ElRadioGroup v-model="ddForm.result">
              <ElRadioButton value="通过">通过</ElRadioButton>
              <ElRadioButton value="需补充">需补充</ElRadioButton>
              <ElRadioButton value="不通过">不通过</ElRadioButton>
            </ElRadioGroup>
          </ElFormItem>
          <ElFormItem label="尽调说明">
            <ElInput
              v-model="ddForm.note"
              type="textarea"
              :rows="3"
              placeholder="背景调查、合规审查、风险评估结论说明"
            />
          </ElFormItem>
          <ElFormItem label="尽调报告">
            <ElUpload drag action="#" :auto-upload="false" class="w-full">
              <ArtSvgIcon icon="ri:upload-cloud-2-line" class="text-2xl" />
              <div class="el-upload__text">上传尽调报告等支撑材料</div>
            </ElUpload>
          </ElFormItem>
        </ElForm>

        <div class="cso-section-label">操作记录</div>
        <ElTimeline class="verify-log">
          <ElTimelineItem
            v-for="(log, index) in ddLogs"
            :key="index"
            :timestamp="log.time"
            :type="log.tone"
          >
            {{ log.text }}
          </ElTimelineItem>
        </ElTimeline>
      </div>
      <template #footer>
        <ElButton @click="ddVisible = false">关闭</ElButton>
        <ElButton type="primary" @click="submitDd">提交尽调结论</ElButton>
      </template>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { computed, reactive, ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { onboardingApplications, type OnboardingApplication } from '../mock'

  defineOptions({ name: 'CsoOnboarding' })

  const keyword = ref('')
  const stageFilter = ref('全部')
  const typeFilter = ref('全部')
  const cardVisible = ref(false)
  const selected = ref<OnboardingApplication | null>(null)

  const summary = [
    { label: '本月申请', value: '6', note: '公司主体 4 · 自然人 2', tone: 'primary' },
    { label: '审批中', value: '2', note: '合规终审 1 · 核验 1', tone: 'warning' },
    { label: '已通过', value: '3', note: '已开通CSO账号', tone: 'success' },
    { label: '已拒绝', value: '1', note: '尽调不通过', tone: 'danger' }
  ]

  const processSteps = [
    { name: '准入申请', detail: 'CSO在线提交', count: 1, active: false },
    { name: '主体识别', detail: '公司主体 / 自然人', count: 0, active: false },
    { name: '资料采集', detail: '资质 · 代表 · 附件', count: 1, active: false },
    { name: '准入核验', detail: '自动核验 + 人工核查', count: 1, active: true },
    { name: '准入审批', detail: '多级审批流', count: 2, active: false },
    { name: '准入生效', detail: '结论与有效期', count: 1, active: false }
  ]

  const stageToStep: Record<string, number> = {
    准入申请: 0,
    主体识别: 1,
    资料补充: 2,
    资料采集: 2,
    准入核验: 3,
    合规终审: 4,
    准入审批: 4,
    已生效: 5
  }

  const selectedStepIndex = computed(() =>
    selected.value ? (stageToStep[selected.value.stage] ?? 0) : 0
  )

  const stageOptions = [...new Set(onboardingApplications.map((item) => item.stage))]

  const filteredApplications = computed(() =>
    onboardingApplications.filter((item) => {
      const matchesKeyword =
        !keyword.value ||
        `${item.id}${item.cso}`.toLowerCase().includes(keyword.value.toLowerCase())
      const matchesStage = stageFilter.value === '全部' || item.stage === stageFilter.value
      const matchesType = typeFilter.value === '全部' || item.type === typeFilter.value
      return matchesKeyword && matchesStage && matchesType
    })
  )

  const checks = computed(() => {
    if (!selected.value) return []
    return [
      {
        name: '合作资格核验',
        detail: '资质证照审核 · 承诺量 · 拟定级别与保证金',
        result: selected.value.gate2,
        pass: selected.value.gate2 === '通过',
        badge:
          selected.value.gate2 === '通过'
            ? 'success'
            : selected.value.gate2 === '需补充'
              ? 'warning'
              : 'info',
        icon: 'ri:file-list-3-line'
      },
      {
        name: '风险与合规尽调',
        detail: '黑名单 · 历史处罚 · 信用评估',
        result: selected.value.dueDiligence,
        pass: selected.value.dueDiligence.startsWith('通过'),
        badge: selected.value.dueDiligence.startsWith('通过') ? 'success' : 'warning',
        icon: 'ri:shield-star-line'
      }
    ]
  })

  const hasMismatch = computed(() => !!selected.value?.identity?.rows.some((row) => !row.match))

  const manualResolved = ref(false)

  const uploadedMaterials = computed(() => {
    if (!selected.value) return []
    const common = [
      {
        name: '合规承诺书',
        file: '合规承诺书_签章版.pdf',
        size: '0.8MB',
        date: selected.value.submittedAt
      }
    ]
    if (selected.value.type === '自然人') {
      return [
        {
          name: '身份证(本人)',
          file: '身份证_人像面.jpg',
          size: '1.2MB',
          date: selected.value.submittedAt
        },
        {
          name: '学历证书',
          file: '学历证书_原件扫描.pdf',
          size: '1.6MB',
          date: selected.value.submittedAt
        },
        {
          name: '三方公司营业执照',
          file: `${selected.value.thirdParty ?? '三方公司'}_营业执照.pdf`,
          size: '2.1MB',
          date: selected.value.submittedAt
        },
        ...common
      ]
    }
    return [
      {
        name: '营业执照',
        file: '营业执照_原件扫描.pdf',
        size: '2.3MB',
        date: selected.value.submittedAt
      },
      {
        name: 'GSP许可证',
        file: '药品经营许可证_GSP.pdf',
        size: '1.4MB',
        date: selected.value.submittedAt
      },
      {
        name: '开户许可信息',
        file: '基本存款账户信息.pdf',
        size: '0.5MB',
        date: selected.value.submittedAt
      },
      ...common
    ]
  })

  const runAutoVerify = () => {
    if (!selected.value) return
    manualResolved.value = false
    if (selected.value.id === 'APP-2026-0108') {
      selected.value.identity = {
        source: '第三方API · 企查查',
        time: now(),
        rows: [
          {
            label: '企业名称',
            uploaded: '武汉XX健康管理股份有限公司',
            api: '武汉XX健康管理股份有限公司',
            match: true
          },
          {
            label: '统一社会信用代码',
            uploaded: '91420100MA4KXXXXXX9A',
            api: '91420100MA4KXXXXXX9A',
            match: true
          },
          { label: '法定代表人', uploaded: '陈某某', api: '陈某某', match: true },
          { label: '注册资本', uploaded: '1000万元', api: '300万元', match: false }
        ]
      }
      verifyLogs.value.unshift({
        text: '系统 · 自动核验完成:3项一致,1项不一致(注册资本)',
        time: now(),
        tone: 'warning'
      })
      ElMessage.warning('自动核验完成:注册资本与公示信息不一致,请人工核实')
    } else {
      selected.value.identity = {
        source: '第三方API · 企查查',
        time: now(),
        rows: [
          { label: '企业名称', uploaded: selected.value.cso, api: selected.value.cso, match: true },
          {
            label: '统一社会信用代码',
            uploaded: '91310115MA1XXXXXX0X',
            api: '91310115MA1XXXXXX0X',
            match: true
          },
          { label: '法定代表人', uploaded: '张某某', api: '张某某', match: true },
          { label: '登记状态', uploaded: '存续(在营)', api: '存续(在营)', match: true }
        ]
      }
      verifyLogs.value.unshift({
        text: `系统 · 自动核验完成:${selected.value.identity.rows.length} 项字段全部一致`,
        time: now(),
        tone: 'success'
      })
      ElMessage.success('自动核验完成:申请信息与核验结果一致')
    }
  }

  const confirmVerify = () => {
    if (!selected.value) return
    selected.value.gate1 = '通过'
    verifyLogs.value.unshift({
      text: `当前用户 · 人工最终确认核验完成:${selected.value.identity?.rows.length ?? 0} 项字段已比对${hasMismatch.value ? ',不一致项已人工核实' : '一致'}`,
      time: now(),
      tone: 'success'
    })
    ElMessage.success('主体真实性核验已人工确认完成')
  }

  const manualVerify = () => {
    manualResolved.value = true
    verifyLogs.value.unshift({
      text: '当前用户 · 人工核实完成:已比对国家企业信用信息公示系统查询截图,注册资本以公示信息为准',
      time: now(),
      tone: 'warning'
    })
    ElMessage.success('人工核实完成并留痕')
  }

  const verifyLogs = ref<{ text: string; time: string; tone: 'success' | 'warning' }[]>([])

  const canConfirm = computed(
    () => !!selected.value?.identity && (!hasMismatch.value || manualResolved.value)
  )

  const now = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const openCard = (row: OnboardingApplication) => {
    selected.value = row
    cardVisible.value = true
  }

  const verifyVisible = ref(false)

  const openVerify = (row: OnboardingApplication) => {
    selected.value = row
    verifyLogs.value = [
      {
        text: '张三 · 工商核验(第三方API):名称与统一社会信用代码一致,存续正常',
        time: `${row.submittedAt} 10:20`,
        tone: 'success'
      },
      { text: '系统 · 信息查重:无重复建档', time: `${row.submittedAt} 10:21`, tone: 'success' },
      { text: '李四 · 黑名单检查:无命中', time: `${row.submittedAt} 14:05`, tone: 'success' }
    ]
    verifyVisible.value = true
  }

  interface QualifyDoc {
    name: string
    file: string
    expiry: string
    result: '通过' | '退回'
  }

  const qualifyVisible = ref(false)
  const qualifyDocs = ref<QualifyDoc[]>([])
  const qualifyForm = reactive({
    level: '一级代理',
    deposit: 200000,
    commitment: 3000000,
    note: ''
  })
  const qualifyLogs = ref<{ text: string; time: string; tone: 'success' | 'warning' }[]>([])

  const openQualify = (row: OnboardingApplication) => {
    selected.value = row
    qualifyDocs.value = (
      row.type === '自然人'
        ? [
            { name: '身份证(本人)', file: '身份证_人像面.jpg', expiry: '2028-05-12' },
            { name: '学历证书', file: '学历证书_原件扫描.pdf', expiry: '长期' },
            {
              name: '三方公司营业执照',
              file: `${row.thirdParty ?? '三方公司'}_营业执照.pdf`,
              expiry: '2027-11-30'
            },
            { name: '三方公司银行账户信息', file: '基本存款账户信息.pdf', expiry: '—' },
            { name: '合规承诺书', file: '合规承诺书_签章版.pdf', expiry: '2026-12-31' }
          ]
        : [
            { name: '营业执照', file: '营业执照_原件扫描.pdf', expiry: '2027-06-30' },
            { name: 'GSP许可证', file: '药品经营许可证_GSP.pdf', expiry: '2026-12-31' },
            { name: '开户许可信息', file: '基本存款账户信息.pdf', expiry: '—' },
            { name: '合规承诺书', file: '合规承诺书_签章版.pdf', expiry: '2026-12-31' }
          ]
    ).map((item) => ({ ...item, result: '通过' as const }))
    qualifyForm.note = ''
    qualifyLogs.value = [
      {
        text: `系统 · 证照清单完整性检查:${row.type === '自然人' ? '自然人证照要求' : '公司主体证照要求'},材料齐全`,
        time: `${row.submittedAt} 11:00`,
        tone: 'success'
      }
    ]
    qualifyVisible.value = true
  }

  const submitQualify = () => {
    const rejected = qualifyDocs.value.filter((item) => item.result === '退回')
    if (!selected.value) return
    if (rejected.length > 0 && !qualifyForm.note.trim()) {
      ElMessage.warning('存在退回项,请填写审核意见(退回原因)')
      return
    }
    selected.value.gate2 = rejected.length > 0 ? '需补充' : '通过'
    if (rejected.length > 0) selected.value.stage = '资料补充'
    qualifyLogs.value.unshift({
      text:
        rejected.length > 0
          ? `当前用户 · 资质审核:退回 ${rejected.length} 项(${rejected.map((item) => item.name).join('、')}) · 原因:${qualifyForm.note}`
          : `当前用户 · 资质审核:全部通过 · 拟定${qualifyForm.level} · 保证金 ¥${qualifyForm.deposit.toLocaleString()} · 年度承诺量 ¥${qualifyForm.commitment.toLocaleString()}`,
      time: now(),
      tone: rejected.length > 0 ? 'warning' : 'success'
    })
    ElMessage.success(
      rejected.length > 0 ? '已退回CSO补充证照,申请回到资料补充' : '资质核验通过,已记录定级与保证金'
    )
    qualifyVisible.value = false
  }

  const ddVisible = ref(false)
  const ddForm = reactive({ result: '通过', note: '' })
  const ddLogs = ref<{ text: string; time: string; tone: 'success' | 'warning' }[]>([])

  const ddItems = computed(() => {
    if (!selected.value) return []
    return [
      {
        name: '企业背景调查',
        detail: '股权结构 · 实际控制人 · 经营范围匹配',
        result: '正常',
        tone: 'green',
        badge: 'success',
        icon: 'ri:search-eye-line'
      },
      {
        name: '黑名单检查',
        detail: '商业贿赂 / 失信 / 严重违法名单',
        result: '无命中',
        tone: 'green',
        badge: 'success',
        icon: 'ri:forbid-line'
      },
      {
        name: '行政处罚与经营异常',
        detail: '市场监管 / 药监 / 税务公示记录',
        result: '无记录',
        tone: 'green',
        badge: 'success',
        icon: 'ri:alert-line'
      },
      {
        name: '信用与风险评级',
        detail: selected.value.risk,
        result: selected.value.risk,
        tone: selected.value.risk === '低风险' ? 'green' : 'warning',
        badge: selected.value.risk === '低风险' ? 'success' : 'warning',
        icon: 'ri:shield-star-line'
      }
    ]
  })

  const openDd = (row: OnboardingApplication) => {
    selected.value = row
    ddForm.note = ''
    ddLogs.value = [
      { text: '系统 · 黑名单检查:无命中', time: `${row.submittedAt} 14:05`, tone: 'success' },
      {
        text: '系统 · 行政处罚/经营异常:近3年无记录',
        time: `${row.submittedAt} 14:06`,
        tone: 'success'
      }
    ]
    ddVisible.value = true
  }

  const submitDd = () => {
    if (!selected.value) return
    selected.value.dueDiligence =
      ddForm.result === '通过' ? `通过 · ${now().slice(0, 10)}` : ddForm.result
    selected.value.gate3 = ddForm.result === '通过' ? '通过' : '需补充'
    if (ddForm.result === '不通过') selected.value.stage = '已拒绝'
    ddLogs.value.unshift({
      text: `当前用户 · 尽调结论:${ddForm.result}${ddForm.note ? ' · ' + ddForm.note : ''}`,
      time: now(),
      tone: ddForm.result === '通过' ? 'success' : 'warning'
    })
    ElMessage.success(
      ddForm.result === '通过'
        ? '尽调通过并留痕;审批走完后系统自动开通CSO账号'
        : ddForm.result === '不通过'
          ? '尽调不通过,申请已标记已拒绝'
          : '尽调结论已提交并留痕'
    )
    ddVisible.value = false
  }

  const approvalNodes = computed(() => {
    if (!selected.value) return []
    const passed = selected.value.approval.match(/✓/g)?.length ?? 0
    const nodes = ['区域初审', '大区复核', '总监审批', '合规终审']
    return nodes.map((name, index) => ({
      name,
      status: index < passed ? '✓ 已通过' : index === passed ? '进行中' : '待流转'
    }))
  })

  const stageTone = (value: string) =>
    value === '已生效'
      ? 'cso-badge--success'
      : value === '资料补充'
        ? 'cso-badge--danger'
        : value === '合规终审' || value === '准入核验'
          ? 'cso-badge--warning'
          : 'cso-badge--primary'
</script>

<style lang="scss" scoped>
  @use '../shared';

  .process-panel {
    margin-bottom: 16px;
  }

  .process-flow {
    display: flex;
    align-items: stretch;
    padding: 16px 18px;
  }

  .process-node {
    display: grid;
    flex: 1;
    grid-template-columns: 26px minmax(80px, 1fr) auto;
    gap: 8px;
    align-items: center;
    min-height: 62px;
    padding: 9px 11px;
    background: #fafbfc;
    border: 1px solid var(--cso-line);
    border-radius: 9px;
  }

  .process-node--active {
    background: #f2f7ff;
    border-color: #94bdf4;
    box-shadow: inset 0 -3px var(--cso-blue);
  }

  .process-no {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    font-size: 12px;
    font-weight: 700;
    color: var(--cso-blue);
    background: var(--cso-blue-soft);
    border-radius: 50%;
  }

  .process-node strong {
    display: block;
    font-size: 12px;
  }

  .process-node small {
    display: block;
    margin-top: 3px;
    font-size: 11px;
    color: var(--cso-muted);
  }

  .process-count {
    font-size: 12px;
    color: var(--cso-muted);
    white-space: nowrap;
  }

  .process-node--active .process-count {
    font-weight: 700;
    color: var(--cso-blue);
  }

  .process-arrow {
    flex: 0 0 18px;
    align-self: center;
    color: #aab6c5;
  }

  .mini-steps {
    display: flex;
    align-items: center;
  }

  .mini-steps article {
    flex: 1;
    text-align: center;
  }

  .mini-steps article > span {
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    margin: 0 auto;
    font-size: 12px;
    font-weight: 700;
    color: #8ea0b5;
    background: #eef2f7;
    border-radius: 50%;
  }

  .mini-steps article.done > span {
    color: var(--cso-green);
    background: var(--cso-green-soft);
  }

  .mini-steps article.current > span {
    color: #fff;
    background: var(--cso-blue);
  }

  .mini-steps article small {
    display: block;
    margin-top: 6px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .mini-steps article.current small {
    font-weight: 650;
    color: var(--cso-blue);
  }

  .mini-steps > i {
    flex: 0 0 14px;
    height: 2px;
    margin: 0 3px 18px;
    background: #e2e9f2;
    border-radius: 1px;
  }

  .mini-steps > i.done {
    background: var(--cso-green);
  }

  .compact-stats {
    margin-bottom: 16px;
  }

  .compact-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    min-height: 106px;
    padding: 15px 18px;
  }

  .summary-value {
    margin: 7px 0 10px;
    font-size: 26px;
    line-height: 1;
  }

  .filter-spacer {
    flex: 1;
  }

  .view-hint {
    font-size: 12px;
    color: var(--cso-muted);
  }

  .apply-link {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0;
    text-align: left;
  }

  .apply-link strong {
    font-size: 13px;
    color: var(--cso-text);
  }

  .apply-link small {
    font-size: 12px;
    color: var(--cso-muted);
  }

  .intention-cell span {
    display: block;
    font-size: 13px;
    font-weight: 600;
  }

  .intention-cell small {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .pagination-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px 18px;
    font-size: 12px;
    color: var(--cso-muted);
    border-top: 1px solid var(--cso-line);
  }

  .cso-table :deep(.action-col .el-button + .el-button) {
    margin-left: 4px;
  }

  .cso-table :deep(.action-col .el-button) {
    padding: 2px 4px;
  }

  .admit-cover {
    padding: 18px;
    margin-bottom: 18px;
    color: #fff;
    background: linear-gradient(135deg, #0b2c4d, #14529c);
    border-radius: 12px;
  }

  .admit-cover span {
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.16em;
    opacity: 0.75;
  }

  .admit-cover strong {
    display: block;
    margin-top: 6px;
    font-size: 17px;
  }

  .admit-cover small {
    display: block;
    margin-top: 5px;
    font-size: 12px;
    opacity: 0.85;
  }

  .admit-cover__badges {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }

  .admit-cover__badges .cso-badge {
    color: #fff;
    background: rgb(255 255 255 / 18%);
  }

  .verify-app-bar {
    display: flex;
    gap: 12px;
    align-items: baseline;
    justify-content: space-between;
    padding: 13px 16px;
    margin-bottom: 16px;
    background: #f4f7fb;
    border-radius: 10px;
  }

  .verify-app-bar strong {
    font-size: 14px;
  }

  .verify-app-bar small {
    font-size: 12px;
    color: var(--cso-muted);
  }

  .gate-verify-list {
    display: grid;
    gap: 10px;
  }

  .gate-verify {
    display: flex;
    gap: 11px;
    align-items: center;
    padding: 12px;
    border: 1px solid var(--cso-line);
    border-radius: 10px;
  }

  .gate-verify--pass {
    background: #f7fcf9;
    border-color: #cdeadc;
  }

  .gate-verify--wait {
    background: #fafbfc;
  }

  .gate-verify__icon {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    color: var(--cso-blue);
    background: var(--cso-blue-soft);
    border-radius: 8px;
  }

  .gate-verify--pass .gate-verify__icon {
    color: var(--cso-green);
    background: var(--cso-green-soft);
  }

  .gate-verify div {
    flex: 1;
  }

  .gate-verify strong {
    display: block;
    font-size: 13px;
  }

  .gate-verify small {
    display: block;
    margin-top: 3px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .identity-block {
    display: block;
  }

  .identity-head {
    display: flex;
    gap: 11px;
    align-items: center;
  }

  .identity-head > div {
    flex: 1;
  }

  .compare-table {
    margin-top: 13px;
    overflow: hidden;
    border: 1px solid var(--cso-line);
    border-radius: 9px;
  }

  .compare-table header,
  .compare-table > div {
    display: grid;
    grid-template-columns: 1.1fr 1.2fr 1.2fr 64px;
    gap: 8px;
    align-items: center;
    padding: 8px 11px;
  }

  .compare-table header {
    font-size: 12px;
    font-weight: 650;
    color: var(--cso-muted);
    background: #f4f7fb;
  }

  .compare-table > div {
    font-size: 12px;
    border-top: 1px solid var(--cso-line);
  }

  .compare-table > div > span:nth-child(2) {
    color: #33445e;
  }

  .compare-table > div > span:nth-child(3) {
    color: var(--cso-blue);
  }

  .compare-table > div.mismatch {
    background: #fff7f7;
  }

  .compare-table > div > :last-child {
    justify-self: end;
  }

  .material-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .material-grid article {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 11px 12px;
    border: 1px solid var(--cso-line);
    border-radius: 9px;
  }

  .material-icon {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    color: var(--cso-blue);
    background: var(--cso-blue-soft);
    border-radius: 8px;
  }

  .material-grid article > div {
    flex: 1;
    min-width: 0;
  }

  .material-grid strong {
    display: block;
    font-size: 12px;
  }

  .material-grid small {
    display: block;
    margin-top: 3px;
    overflow: hidden;
    font-size: 12px;
    color: var(--cso-muted);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .doc-review-list {
    display: grid;
    gap: 9px;
  }

  .doc-review-list article {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 10px 12px;
    border: 1px solid var(--cso-line);
    border-radius: 9px;
  }

  .doc-review-list article > div {
    flex: 1;
    min-width: 0;
  }

  .doc-review-list strong {
    display: block;
    font-size: 12px;
  }

  .doc-review-list small {
    display: block;
    margin-top: 3px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .dd-check-list {
    display: grid;
    gap: 9px;
  }

  .dd-check-list article {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 11px 12px;
    border: 1px solid var(--cso-line);
    border-radius: 9px;
  }

  .dd-check-list article > div {
    flex: 1;
  }

  .dd-check-list strong {
    display: block;
    font-size: 12px;
  }

  .dd-check-list small {
    display: block;
    margin-top: 3px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .rule-icon {
    display: grid;
    flex: 0 0 30px;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 8px;
  }

  .rule-icon--green {
    color: var(--cso-green);
    background: var(--cso-green-soft);
  }

  .rule-icon--warning {
    color: var(--cso-orange);
    background: var(--cso-orange-soft);
  }

  .compare-empty {
    display: flex;
    gap: 9px;
    align-items: center;
    padding: 14px;
    margin-top: 13px;
    font-size: 12px;
    color: var(--cso-muted);
    background: #fafbfc;
    border: 1px dashed var(--cso-line);
    border-radius: 9px;
  }

  .identity-actions {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-top: 13px;
  }

  .identity-hint {
    font-size: 12px;
    color: var(--cso-green);
  }

  .approval-chain {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .approval-chain article {
    flex: 1;
    padding: 11px 8px;
    text-align: center;
    border: 1px solid var(--cso-line);
    border-radius: 9px;
  }

  .approval-chain strong {
    display: block;
    font-size: 12px;
  }

  .approval-chain small {
    display: block;
    margin-top: 5px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .approval-chain svg {
    color: #aab6c5;
  }

  .verify-log {
    padding: 2px 4px 0;
  }

  @media (width <= 1080px) {
    .process-flow {
      overflow-x: auto;
    }

    .process-node {
      min-width: 150px;
    }
  }

  @media (width <= 720px) {
    .compare-table {
      overflow-x: auto;
    }

    .compare-table header,
    .compare-table > div {
      min-width: 460px;
    }
  }

  @media (width <= 720px) {
    .mini-steps {
      flex-wrap: wrap;
      gap: 10px 0;
    }

    .mini-steps > i {
      display: none;
    }

    .mini-steps article {
      flex: 1 1 33%;
    }

    .approval-chain {
      flex-direction: column;
    }

    .approval-chain svg {
      transform: rotate(90deg);
    }
  }
</style>
