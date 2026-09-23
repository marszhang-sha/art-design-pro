<template>
  <div class="cso-page">
    <header class="cso-page-header">
      <div>
        <div class="cso-eyebrow">EVIDENCE MANAGEMENT</div>
        <h1 class="cso-title">Evidence审核</h1>
        <p class="cso-subtitle"
          >将服务材料结构化为可分类、可校验、可审核、可关联结算的业务对象，回答每一笔支付“凭什么”。</p
        >
      </div>
      <ElButton type="primary" @click="ElMessage.success('已创建Evidence补传任务')"
        ><ArtSvgIcon icon="ri:file-upload-line" class="mr-1" />发起补传</ElButton
      >
    </header>

    <section class="cso-stat-grid">
      <div v-for="item in stats" :key="item.label" class="cso-stat-card">
        <span :class="['evidence-icon', `evidence-icon--${item.tone}`]"
          ><ArtSvgIcon :icon="item.icon"
        /></span>
        <div class="stat-copy"
          ><span class="cso-stat-label">{{ item.label }}</span
          ><strong>{{ item.value }}</strong
          ><small>{{ item.note }}</small></div
        >
      </div>
    </section>

    <div class="cso-filter-bar">
      <ElInput v-model="keyword" clearable placeholder="搜索Evidence编号 / CSO" style="width: 260px"
        ><template #prefix><ArtSvgIcon icon="ri:search-line" /></template
      ></ElInput>
      <ElSelect v-model="bu" style="width: 130px"
        ><ElOption label="全部BU" value="全部" /><ElOption label="BU A" value="BU A" /><ElOption
          label="BU B"
          value="BU B" /><ElOption label="BU C" value="BU C"
      /></ElSelect>
      <ElSelect v-model="reviewStatus" style="width: 150px"
        ><ElOption label="全部审核状态" value="全部" /><ElOption
          v-for="item in statuses"
          :key="item"
          :label="item"
          :value="item"
      /></ElSelect>
      <ElDatePicker
        v-model="period"
        type="month"
        value-format="YYYY-MM"
        placeholder="服务周期"
        style="width: 145px"
      />
      <div class="filter-spacer"></div>
      <ElButton @click="ElMessage.success('已导出审核清单')"
        ><ArtSvgIcon icon="ri:download-2-line" class="mr-1" />导出</ElButton
      >
    </div>

    <div class="cso-grid-2">
      <section class="cso-panel">
        <div class="cso-panel__header">
          <div
            ><span class="cso-panel__title">Evidence审核清单</span
            ><span class="cso-panel__note">共 {{ filteredItems.length }} 项</span></div
          >
          <div class="header-legend"
            ><span><i class="dot dot--warning"></i>材料不完整</span
            ><span><i class="dot dot--danger"></i>价格偏离</span></div
          >
        </div>
        <ElTable :data="filteredItems" class="cso-table" height="520">
          <ElTableColumn prop="id" label="Evidence编号" width="145" />
          <ElTableColumn label="CSO / 服务项目" min-width="245">
            <template #default="scope"
              ><button class="evidence-link" type="button" @click="openDetail(scope.row)"
                ><strong>{{ scope.row.cso }}</strong
                ><small
                  >{{ scope.row.service }} · {{ scope.row.product }} · {{ scope.row.period }}</small
                ></button
              ></template
            >
          </ElTableColumn>
          <ElTableColumn prop="bu" label="BU" width="72" />
          <ElTableColumn label="材料" width="105" align="center"
            ><template #default="scope"
              ><div class="file-cell"
                ><strong>{{ scope.row.files }}份</strong
                ><ElProgress
                  :percentage="scope.row.completeness"
                  :stroke-width="5"
                  :show-text="false"
                  :color="scope.row.completeness < 80 ? '#ed9518' : '#2a9b65'" /></div></template
          ></ElTableColumn>
          <ElTableColumn label="申报金额" width="115" align="right"
            ><template #default="scope"
              ><strong>{{ formatCurrency(scope.row.declared) }}</strong></template
            ></ElTableColumn
          >
          <ElTableColumn label="审核状态" width="105" align="center"
            ><template #default="scope"
              ><span :class="['cso-badge', statusTone(scope.row.status)]">{{
                scope.row.status
              }}</span></template
            ></ElTableColumn
          >
          <ElTableColumn label="操作" width="118" fixed="right"
            ><template #default="scope"
              ><ElButton link type="primary" @click="openDetail(scope.row)">查看</ElButton
              ><ElButton
                v-if="scope.row.status === '待审核' || scope.row.status === '风险复核'"
                link
                type="primary"
                @click="openReview(scope.row)"
                >审核</ElButton
              ></template
            ></ElTableColumn
          >
        </ElTable>
      </section>

      <aside class="right-stack">
        <section class="cso-panel rule-panel">
          <div class="cso-panel__header"
            ><span class="cso-panel__title">自动校验规则</span
            ><span class="cso-badge cso-badge--success">6项启用</span></div
          >
          <div class="rule-list">
            <article v-for="rule in rules" :key="rule.title"
              ><span :class="['rule-icon', `rule-icon--${rule.tone}`]"
                ><ArtSvgIcon :icon="rule.icon" /></span
              ><div
                ><strong>{{ rule.title }}</strong
                ><small>{{ rule.detail }}</small></div
              ><ElSwitch v-model="rule.enabled" size="small"
            /></article>
          </div>
        </section>
        <section class="cso-panel coverage-panel">
          <div class="cso-panel__header"
            ><span class="cso-panel__title">覆盖率与金额校验</span></div
          >
          <div class="coverage-ring"
            ><ElProgress
              type="dashboard"
              :percentage="94.8"
              :width="132"
              :stroke-width="10"
              color="#1768e5"
              ><template #default
                ><strong>94.8%</strong><span>Evidence覆盖率</span></template
              ></ElProgress
            ></div
          >
          <div class="coverage-list"
            ><div><span>Calculated Rebate</span><strong>¥ 1,272万</strong></div
            ><div><span>Evidence金额</span><strong>¥ 1,205万</strong></div
            ><div><span>金额缺口</span><strong class="danger-text">¥ 67万</strong></div></div
          >
        </section>
      </aside>
    </div>

    <section class="cso-panel process-panel">
      <div class="cso-panel__header"
        ><span class="cso-panel__title">Evidence处理链路</span
        ><span class="cso-panel__note">本期边界：先把结算证据管理清楚，不扩展完整SFA</span></div
      >
      <div class="process-flow">
        <template v-for="(item, index) in process" :key="item.title"
          ><article
            ><span>{{ index + 1 }}</span
            ><div
              ><strong>{{ item.title }}</strong
              ><small>{{ item.detail }}</small></div
            ></article
          ><ArtSvgIcon v-if="index < process.length - 1" icon="ri:arrow-right-line"
        /></template>
      </div>
    </section>

    <ElDrawer v-model="detailVisible" title="Evidence详情" size="560px">
      <div v-if="selectedItem" class="detail-drawer">
        <div class="evidence-cover"
          ><span>EVIDENCE</span><strong>{{ selectedItem.id }}</strong
          ><small>Hash: {{ selectedItem.hash }}</small></div
        >
        <dl class="cso-kv-grid two-cols">
          <div class="cso-kv"
            ><dt>CSO主体</dt><dd>{{ selectedItem.cso }}</dd></div
          ><div class="cso-kv"
            ><dt>BU / 产品线</dt><dd>{{ selectedItem.bu }} / {{ selectedItem.product }}</dd></div
          ><div class="cso-kv"
            ><dt>服务项目</dt><dd>{{ selectedItem.service }}</dd></div
          ><div class="cso-kv"
            ><dt>服务周期</dt><dd>{{ selectedItem.period }}</dd></div
          ><div class="cso-kv"
            ><dt>申报金额</dt><dd>{{ formatCurrency(selectedItem.declared) }}</dd></div
          ><div class="cso-kv"
            ><dt>合理区间</dt><dd>{{ selectedItem.reasonableRange }}</dd></div
          >
        </dl>
        <ElDivider />
        <div class="cso-section-label">材料清单</div>
        <div class="material-list"
          ><article v-for="index in Math.min(selectedItem.files, 5)" :key="index"
            ><span
              ><ArtSvgIcon icon="ri:file-pdf-2-line" />{{ selectedItem.service }}材料_{{
                String(index).padStart(2, '0')
              }}.pdf</span
            ><small>哈希校验通过</small></article
          ></div
        >
        <ElButton
          v-if="selectedItem.status === '待审核' || selectedItem.status === '风险复核'"
          type="primary"
          class="w-full mt-4"
          @click="openReview(selectedItem)"
          >进入审核</ElButton
        >
      </div>
    </ElDrawer>

    <ElDialog v-model="reviewVisible" title="Evidence审核" width="620px">
      <div v-if="reviewItem" class="review-dialog">
        <ElAlert
          v-if="reviewItem.status === '风险复核'"
          title="申报金额超出合理区间上限，需重点核验服务内容与定价依据。"
          type="error"
          :closable="false"
          show-icon
          class="mb-4"
        />
        <div class="review-summary"
          ><div
            ><span>Evidence</span><strong>{{ reviewItem.id }}</strong></div
          ><div
            ><span>申报金额</span><strong>{{ formatCurrency(reviewItem.declared) }}</strong></div
          ><div
            ><span>完整性</span><strong>{{ reviewItem.completeness }}%</strong></div
          ></div
        >
        <ElForm label-position="top" :model="reviewForm">
          <ElFormItem label="审核结果"
            ><ElRadioGroup v-model="reviewForm.result"
              ><ElRadioButton value="pass">通过</ElRadioButton
              ><ElRadioButton value="supplement">退回补传</ElRadioButton
              ><ElRadioButton value="reject">不通过</ElRadioButton></ElRadioGroup
            ></ElFormItem
          >
          <ElFormItem label="确认Evidence金额"
            ><ElInputNumber v-model="reviewForm.amount" :min="0" :step="1000" class="w-full"
          /></ElFormItem>
          <ElFormItem label="审核意见"
            ><ElInput
              v-model="reviewForm.comment"
              type="textarea"
              :rows="4"
              placeholder="不通过或退回补传时必须填写原因"
          /></ElFormItem>
        </ElForm>
      </div>
      <template #footer
        ><ElButton @click="reviewVisible = false">取消</ElButton
        ><ElButton type="primary" @click="submitReview">提交审核</ElButton></template
      >
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { computed, reactive, ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { evidenceItems, formatCurrency } from '../mock'

  defineOptions({ name: 'CsoEvidence' })
  const keyword = ref('')
  const bu = ref('全部')
  const reviewStatus = ref('全部')
  const period = ref('2026-07')
  const items = ref(evidenceItems.map((item) => ({ ...item })))
  const detailVisible = ref(false)
  const reviewVisible = ref(false)
  const selectedItem = ref<(typeof evidenceItems)[number] | null>(null)
  const reviewItem = ref<(typeof evidenceItems)[number] | null>(null)
  const reviewForm = reactive({ result: 'pass', amount: 0, comment: '' })

  const stats = [
    {
      label: '本期Evidence',
      value: '286',
      note: '关联 82 家CSO',
      tone: 'primary',
      icon: 'ri:file-list-3-line'
    },
    {
      label: '待审核',
      value: '17',
      note: '其中风险复核 2 项',
      tone: 'warning',
      icon: 'ri:time-line'
    },
    {
      label: '材料完整率',
      value: '94.8%',
      note: '较上月 +2.1%',
      tone: 'success',
      icon: 'ri:checkbox-circle-line'
    },
    {
      label: '金额偏离预警',
      value: '5',
      note: '超区间金额 ¥ 18.6万',
      tone: 'danger',
      icon: 'ri:alarm-warning-line'
    }
  ]
  const statuses = [...new Set(evidenceItems.map((item) => item.status))]
  const rules = reactive([
    {
      title: '材料完整性',
      detail: '必传项与服务明细逐项校验',
      tone: 'primary',
      icon: 'ri:file-check-line',
      enabled: true
    },
    {
      title: '文件防篡改',
      detail: '上传时计算哈希，替换自动预警',
      tone: 'success',
      icon: 'ri:shield-keyhole-line',
      enabled: true
    },
    {
      title: '价格合理区间',
      detail: '超出服务价格上下限进入复核',
      tone: 'warning',
      icon: 'ri:price-tag-3-line',
      enabled: true
    },
    {
      title: '金额取小值',
      detail: 'Payable不超过Evidence审核金额',
      tone: 'danger',
      icon: 'ri:scales-3-line',
      enabled: true
    }
  ])
  const process = [
    { title: '提交与分类', detail: '服务类型 / 文件哈希' },
    { title: '关联业务对象', detail: 'CSO / 产品 / 周期' },
    { title: '完整性检查', detail: '必传项 / 服务明细' },
    { title: '第三方/内部审核', detail: '通过 / 补传 / 驳回' },
    { title: '金额确认', detail: '合理区间 / 取小值' },
    { title: '结算引用', detail: '形成可支付依据' }
  ]

  const filteredItems = computed(() =>
    items.value.filter((item) => {
      const matchesKeyword =
        !keyword.value ||
        `${item.id}${item.cso}`.toLowerCase().includes(keyword.value.toLowerCase())
      return (
        matchesKeyword &&
        (bu.value === '全部' || item.bu === bu.value) &&
        (reviewStatus.value === '全部' || item.status === reviewStatus.value) &&
        (!period.value || item.period === period.value)
      )
    })
  )
  const statusTone = (value: string) =>
    value === '审核通过'
      ? 'cso-badge--success'
      : value === '风险复核'
        ? 'cso-badge--danger'
        : value === '待补传'
          ? 'cso-badge--warning'
          : 'cso-badge--primary'
  const openDetail = (item: (typeof evidenceItems)[number]) => {
    selectedItem.value = item
    detailVisible.value = true
  }
  const openReview = (item: (typeof evidenceItems)[number]) => {
    reviewItem.value = item
    reviewForm.result = 'pass'
    reviewForm.amount = item.declared
    reviewForm.comment = ''
    detailVisible.value = false
    reviewVisible.value = true
  }
  const submitReview = () => {
    if (reviewForm.result !== 'pass' && !reviewForm.comment.trim()) {
      ElMessage.warning('退回或不通过时请填写审核意见')
      return
    }
    const row = items.value.find((item) => item.id === reviewItem.value?.id)
    if (row)
      row.status =
        reviewForm.result === 'pass'
          ? '审核通过'
          : reviewForm.result === 'supplement'
            ? '待补传'
            : '审核不通过'
    reviewVisible.value = false
    ElMessage.success('审核结果已提交，结算引用状态已同步')
  }
</script>

<style lang="scss" scoped>
  @use '../shared';

  .cso-stat-card {
    display: flex;
    gap: 14px;
    align-items: center;
    min-height: 112px;
  }

  .evidence-icon {
    display: grid;
    flex: 0 0 42px;
    place-items: center;
    width: 42px;
    height: 42px;
    font-size: 20px;
    border-radius: 12px;
  }

  .evidence-icon--primary {
    color: var(--cso-blue);
    background: var(--cso-blue-soft);
  }

  .evidence-icon--success {
    color: var(--cso-green);
    background: var(--cso-green-soft);
  }

  .evidence-icon--warning {
    color: var(--cso-orange);
    background: var(--cso-orange-soft);
  }

  .evidence-icon--danger {
    color: var(--cso-red);
    background: var(--cso-red-soft);
  }

  .stat-copy strong,
  .stat-copy small {
    display: block;
  }

  .stat-copy strong {
    margin: 8px 0;
    font-size: 24px;
  }

  .stat-copy small {
    font-size: 12px;
    color: var(--cso-muted);
  }

  .filter-spacer {
    flex: 1;
  }

  .header-legend {
    display: flex;
    gap: 12px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    margin-right: 4px;
    border-radius: 50%;
  }

  .dot--warning {
    background: var(--cso-orange);
  }

  .dot--danger {
    background: var(--cso-red);
  }

  .evidence-link {
    color: inherit;
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
  }

  .evidence-link strong,
  .evidence-link small {
    display: block;
  }

  .evidence-link strong {
    margin-bottom: 5px;
    font-size: 12px;
  }

  .evidence-link small {
    font-size: 12px;
    color: var(--cso-muted);
  }

  .file-cell {
    min-width: 72px;
  }

  .file-cell strong {
    display: block;
    margin-bottom: 5px;
    font-size: 12px;
  }

  .right-stack {
    display: grid;
    gap: 18px;
  }

  .rule-list {
    padding: 8px 15px;
  }

  .rule-list article {
    display: grid;
    grid-template-columns: 34px 1fr auto;
    gap: 10px;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid var(--cso-line);
  }

  .rule-list article:last-child {
    border-bottom: 0;
  }

  .rule-icon {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 9px;
  }

  .rule-icon--primary {
    color: var(--cso-blue);
    background: var(--cso-blue-soft);
  }

  .rule-icon--success {
    color: var(--cso-green);
    background: var(--cso-green-soft);
  }

  .rule-icon--warning {
    color: var(--cso-orange);
    background: var(--cso-orange-soft);
  }

  .rule-icon--danger {
    color: var(--cso-red);
    background: var(--cso-red-soft);
  }

  .rule-list strong,
  .rule-list small {
    display: block;
  }

  .rule-list strong {
    font-size: 12px;
  }

  .rule-list small {
    margin-top: 4px;
    font-size: 11px;
    color: var(--cso-muted);
  }

  .coverage-ring {
    display: grid;
    place-items: center;
    padding: 14px 0 4px;
  }

  .coverage-ring strong,
  .coverage-ring span {
    display: block;
  }

  .coverage-ring strong {
    font-size: 20px;
  }

  .coverage-ring span {
    margin-top: 4px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .coverage-list {
    padding: 5px 18px 17px;
  }

  .coverage-list div {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 12px;
    border-bottom: 1px solid var(--cso-line);
  }

  .coverage-list div:last-child {
    border-bottom: 0;
  }

  .coverage-list span {
    color: var(--cso-muted);
  }

  .danger-text {
    color: var(--cso-red);
  }

  .process-panel {
    margin-bottom: 18px;
  }

  .process-flow {
    display: flex;
    align-items: center;
    padding: 20px;
  }

  .process-flow article {
    display: flex;
    flex: 1;
    gap: 10px;
    align-items: center;
    min-height: 68px;
    padding: 12px;
    border: 1px solid var(--cso-line);
    border-radius: 10px;
  }

  .process-flow article > span {
    display: grid;
    flex: 0 0 26px;
    place-items: center;
    width: 26px;
    height: 26px;
    font-size: 12px;
    font-weight: 700;
    color: var(--cso-blue);
    background: var(--cso-blue-soft);
    border-radius: 50%;
  }

  .process-flow > :deep(svg) {
    flex: 0 0 24px;
    color: #aab6c5;
  }

  .process-flow strong,
  .process-flow small {
    display: block;
  }

  .process-flow strong {
    font-size: 12px;
  }

  .process-flow small {
    margin-top: 4px;
    font-size: 11px;
    color: var(--cso-muted);
  }

  .detail-drawer {
    padding: 0 8px;
  }

  .evidence-cover {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 26px;
    margin-bottom: 20px;
    color: #fff;
    background: var(--cso-navy);
    border-radius: 14px;
  }

  .evidence-cover span {
    font-size: 12px;
    color: #8fb7e6;
    letter-spacing: 0.2em;
  }

  .evidence-cover strong {
    margin: 9px 0;
    font-size: 22px;
  }

  .evidence-cover small {
    font-size: 12px;
    color: #c9d9eb;
  }

  .two-cols {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .material-list article {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    font-size: 12px;
    border-bottom: 1px solid var(--cso-line);
  }

  .material-list span {
    display: inline-flex;
    gap: 7px;
    align-items: center;
  }

  .material-list span :deep(svg) {
    color: var(--cso-red);
  }

  .material-list small {
    color: var(--cso-green);
  }

  .review-summary {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 18px;
  }

  .review-summary div {
    padding: 12px;
    background: #f6f8fb;
    border-radius: 9px;
  }

  .review-summary span,
  .review-summary strong {
    display: block;
  }

  .review-summary span {
    font-size: 12px;
    color: var(--cso-muted);
  }

  .review-summary strong {
    margin-top: 6px;
    font-size: 13px;
  }

  @media (width <= 840px) {
    .process-flow {
      flex-direction: column;
      align-items: stretch;
    }

    .process-flow > :deep(svg) {
      transform: rotate(90deg);
    }
  }
</style>
