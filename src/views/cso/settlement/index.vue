<template>
  <div class="cso-page">
    <header class="cso-page-header">
      <div>
        <div class="cso-eyebrow">CALCULATED ≠ PAYABLE</div>
        <h1 class="cso-title">费用结算</h1>
        <p class="cso-subtitle"
          >以Locked Sales为事实、Policy
          Version为规则、Evidence为支付资格，形成可解释、可追溯的最终实发金额。</p
        >
      </div>
      <div class="header-actions"
        ><ElButton @click="policyVisible = true"
          ><ArtSvgIcon icon="ri:settings-3-line" class="mr-1" />查看政策版本</ElButton
        ><ElButton type="primary" @click="ElMessage.success('已创建2026Q3预计算任务')"
          >新建结算批次</ElButton
        ></div
      >
    </header>

    <section class="settlement-flow cso-panel">
      <template v-for="(item, index) in settlementFlow" :key="item.title">
        <article :class="[`flow-item`, `flow-item--${item.tone}`]"
          ><span><ArtSvgIcon :icon="item.icon" /></span
          ><div
            ><small>{{ item.kicker }}</small
            ><strong>{{ item.title }}</strong
            ><p>{{ item.detail }}</p></div
          ></article
        >
        <div v-if="index < settlementFlow.length - 1" class="flow-arrow"
          ><ArtSvgIcon icon="ri:arrow-right-line" /><small>{{ item.operator }}</small></div
        >
      </template>
    </section>

    <section class="cso-stat-grid">
      <div v-for="item in stats" :key="item.label" class="cso-stat-card"
        ><span class="cso-stat-label">{{ item.label }}</span
        ><strong class="settlement-value">{{ item.value }}</strong
        ><div class="cso-stat-foot"
          ><span>{{ item.note }}</span
          ><span :class="item.tone">{{ item.trend }}</span></div
        ></div
      >
    </section>

    <div class="cso-filter-bar">
      <ElSelect v-model="quarter" style="width: 135px"
        ><ElOption label="2026 Q2" value="2026 Q2" /><ElOption label="2026 Q1" value="2026 Q1"
      /></ElSelect>
      <ElSelect v-model="bu" style="width: 130px"
        ><ElOption label="全部BU" value="全部" /><ElOption label="BU A" value="BU A" /><ElOption
          label="BU B"
          value="BU B" /><ElOption label="BU C" value="BU C"
      /></ElSelect>
      <ElSelect v-model="status" style="width: 150px"
        ><ElOption label="全部结算状态" value="全部" /><ElOption
          v-for="item in statuses"
          :key="item"
          :label="item"
          :value="item"
      /></ElSelect>
      <ElInput v-model="keyword" clearable placeholder="搜索结算单 / CSO" style="width: 240px"
        ><template #prefix><ArtSvgIcon icon="ri:search-line" /></template
      ></ElInput>
      <div class="filter-spacer"></div>
      <ElButton @click="ElMessage.success('已导出结算明细')"
        ><ArtSvgIcon icon="ri:download-2-line" class="mr-1" />导出明细</ElButton
      >
    </div>

    <section class="cso-panel settlement-table-panel">
      <div class="cso-panel__header"
        ><div
          ><span class="cso-panel__title">结算单清单</span
          ><span class="cso-panel__note">分BU、分产品线独立核算</span></div
        ><span class="table-note"
          >Payable = min(Calculated − Deductions, Evidence Eligible)</span
        ></div
      >
      <ElTable :data="filteredSettlements" class="cso-table" style="width: 100%">
        <ElTableColumn prop="id" label="结算单号" width="150" fixed />
        <ElTableColumn label="CSO / 范围" min-width="230"
          ><template #default="scope"
            ><button class="settlement-link" type="button" @click="openDetail(scope.row)"
              ><strong>{{ scope.row.cso }}</strong
              ><small
                >{{ scope.row.bu }} · {{ scope.row.product }} · {{ scope.row.policy }}</small
              ></button
            ></template
          ></ElTableColumn
        >
        <ElTableColumn label="Locked Sales" width="125" align="right"
          ><template #default="scope">{{
            formatCurrency(scope.row.lockedSales)
          }}</template></ElTableColumn
        >
        <ElTableColumn label="Calculated" width="115" align="right"
          ><template #default="scope"
            ><strong>{{ formatCurrency(scope.row.calculated) }}</strong></template
          ></ElTableColumn
        >
        <ElTableColumn label="费用扣减" width="105" align="right"
          ><template #default="scope"
            ><span class="deduction">− {{ formatCurrency(scope.row.deductions) }}</span></template
          ></ElTableColumn
        >
        <ElTableColumn label="Evidence" width="115" align="right"
          ><template #default="scope">{{
            formatCurrency(scope.row.evidence)
          }}</template></ElTableColumn
        >
        <ElTableColumn label="Payable" width="120" align="right"
          ><template #default="scope"
            ><strong class="payable-text">{{ formatCurrency(scope.row.payable) }}</strong></template
          ></ElTableColumn
        >
        <ElTableColumn label="状态" width="110" align="center"
          ><template #default="scope"
            ><span :class="['cso-badge', statusTone(scope.row.status)]">{{
              scope.row.status
            }}</span></template
          ></ElTableColumn
        >
        <ElTableColumn label="操作" width="85" fixed="right"
          ><template #default="scope"
            ><ElButton link type="primary" @click="openDetail(scope.row)">查看</ElButton></template
          ></ElTableColumn
        >
      </ElTable>
      <div class="table-total"
        ><span>当前筛选汇总</span
        ><div
          ><small>Calculated</small><strong>{{ formatCurrency(totals.calculated) }}</strong></div
        ><div
          ><small>Deductions</small
          ><strong class="deduction">− {{ formatCurrency(totals.deductions) }}</strong></div
        ><div
          ><small>Payable</small
          ><strong class="payable-text">{{ formatCurrency(totals.payable) }}</strong></div
        ></div
      >
    </section>

    <div class="cso-grid-equal lower-grid">
      <section class="cso-panel">
        <div class="cso-panel__header"
          ><span class="cso-panel__title">政策版本与重算控制</span
          ><ElButton link type="primary" @click="policyVisible = true"
            >查看Policy Engine</ElButton
          ></div
        >
        <div class="policy-list"
          ><article v-for="item in policies" :key="item.version"
            ><span class="policy-version">{{ item.version }}</span
            ><div
              ><strong>{{ item.name }}</strong
              ><small>{{ item.scope }} · 生效日 {{ item.effective }}</small></div
            ><span
              :class="['cso-badge', item.current ? 'cso-badge--success' : 'cso-badge--info']"
              >{{ item.current ? '当前有效' : '历史版本' }}</span
            ></article
          ></div
        >
      </section>
      <section class="cso-panel">
        <div class="cso-panel__header"
          ><span class="cso-panel__title">结算控制检查</span
          ><span class="cso-badge cso-badge--success">4 / 5通过</span></div
        >
        <div class="control-list"
          ><article v-for="item in controls" :key="item.title"
            ><span
              :class="['control-icon', item.pass ? 'control-icon--pass' : 'control-icon--warning']"
              ><ArtSvgIcon
                :icon="item.pass ? 'ri:checkbox-circle-line' : 'ri:alarm-warning-line'" /></span
            ><div
              ><strong>{{ item.title }}</strong
              ><small>{{ item.detail }}</small></div
            ></article
          ></div
        >
      </section>
    </div>

    <ElDrawer v-model="detailVisible" title="结算单详情" size="620px">
      <div v-if="selectedSettlement" class="detail-drawer">
        <div class="settlement-cover"
          ><span>SETTLEMENT</span><strong>{{ selectedSettlement.id }}</strong
          ><small>{{ selectedSettlement.status }}</small></div
        >
        <div class="amount-waterfall">
          <article
            ><span>Calculated</span
            ><strong>{{ formatCurrency(selectedSettlement.calculated) }}</strong
            ><small>Locked Sales × {{ selectedSettlement.policy }}</small></article
          ><ArtSvgIcon icon="ri:subtract-line" /><article class="negative"
            ><span>Deductions</span
            ><strong>{{ formatCurrency(selectedSettlement.deductions) }}</strong
            ><small>资源费用 + DDI费用</small></article
          ><ArtSvgIcon icon="ri:arrow-right-line" /><article class="eligible"
            ><span>Evidence Eligible</span
            ><strong>{{ formatCurrency(selectedSettlement.evidence) }}</strong
            ><small>材料审核通过金额</small></article
          ><ArtSvgIcon icon="ri:arrow-right-line" /><article class="payable"
            ><span>Payable</span><strong>{{ formatCurrency(selectedSettlement.payable) }}</strong
            ><small>最终实发金额</small></article
          >
        </div>
        <ElAlert
          title="Calculated不等于Payable"
          description="本结算单以扣减后金额与Evidence Eligible的较小值作为最终可支付金额。"
          type="info"
          :closable="false"
          show-icon
          class="mb-4"
        />
        <div class="cso-section-label">计算与证据依据</div>
        <dl class="cso-kv-grid two-cols"
          ><div class="cso-kv"
            ><dt>Locked Sales</dt><dd>{{ formatCurrency(selectedSettlement.lockedSales) }}</dd></div
          ><div class="cso-kv"
            ><dt>政策版本</dt><dd>{{ selectedSettlement.policy }}</dd></div
          ><div class="cso-kv"><dt>有效日期</dt><dd>2026-04-01</dd></div
          ><div class="cso-kv"><dt>计算时间</dt><dd>2026-08-20 20:16</dd></div
          ><div class="cso-kv"><dt>Evidence审核单</dt><dd>EV-202608-0236</dd></div
          ><div class="cso-kv"><dt>重算记录</dt><dd>Version 2</dd></div></dl
        >
        <ElDivider />
        <div class="cso-section-label">审计轨迹</div>
        <ElTimeline
          ><ElTimelineItem timestamp="2026-08-20 20:16" type="primary"
            >按Policy Version生成理论返利</ElTimelineItem
          ><ElTimelineItem timestamp="2026-08-21 09:30" type="warning"
            >扣除DDI费用与资源费用</ElTimelineItem
          ><ElTimelineItem timestamp="2026-08-21 14:05" type="success"
            >Evidence审核完成，确定Payable</ElTimelineItem
          ></ElTimeline
        >
      </div>
      <template #footer
        ><ElButton @click="detailVisible = false">关闭</ElButton
        ><ElButton type="primary" @click="ElMessage.success('结算单已推送CSO确认')"
          >推送CSO确认</ElButton
        ></template
      >
    </ElDrawer>

    <ElDrawer v-model="policyVisible" title="Policy Engine" size="560px">
      <div class="policy-drawer"
        ><div class="policy-engine"
          ><span>INPUTS</span><strong>Policy Engine</strong><span>OUTPUTS</span></div
        ><div class="engine-columns"
          ><article
            ><h3>输入</h3><p>Locked Sales</p><p>CSO级别</p><p>产品线</p><p>合同周期</p
            ><p>有效政策</p></article
          ><article class="engine-core"
            ><h3>规则</h3><p>固定比例</p><p>阶梯返利</p><p>增量激励</p><p>产品线独立计算</p
            ><p>自然人拆分</p></article
          ><article
            ><h3>输出</h3><p>Calculated Rebate</p><p>计算明细</p><p>规则版本</p><p>重算结果</p
            ><p>差异记录</p></article
          ></div
        ><ElAlert
          title="关键控制：Policy Version + Effective Date + Recalculation"
          type="warning"
          :closable="false"
          show-icon
      /></div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { formatCurrency, settlements } from '../mock'

  defineOptions({ name: 'CsoSettlement' })
  const quarter = ref('2026 Q2')
  const bu = ref('全部')
  const status = ref('全部')
  const keyword = ref('')
  const detailVisible = ref(false)
  const policyVisible = ref(false)
  const selectedSettlement = ref<(typeof settlements)[number] | null>(null)

  const settlementFlow = [
    {
      kicker: 'BUSINESS FACT',
      title: 'Locked Sales',
      detail: '已确认并锁定的经营事实',
      icon: 'ri:lock-2-line',
      tone: 'primary',
      operator: '× Policy'
    },
    {
      kicker: 'POLICY ENGINE',
      title: 'Calculated',
      detail: '理论应发返利与计算明细',
      icon: 'ri:calculator-line',
      tone: 'navy',
      operator: '− Deductions'
    },
    {
      kicker: 'ELIGIBILITY',
      title: 'Evidence',
      detail: '审核金额与合规校验',
      icon: 'ri:file-shield-2-line',
      tone: 'warning',
      operator: 'min( )'
    },
    {
      kicker: 'PAYMENT',
      title: 'Payable',
      detail: '最终实发金额与支付依据',
      icon: 'ri:bank-card-line',
      tone: 'success',
      operator: ''
    }
  ]
  const stats = [
    {
      label: 'Q2 Calculated Rebate',
      value: '¥ 1,272万',
      note: '基于4个政策版本',
      trend: '+12.8%',
      tone: 'cso-trend-up'
    },
    {
      label: '费用扣减',
      value: '¥ 86万',
      note: 'DDI费用 / 资源费用',
      trend: '占比 6.8%',
      tone: 'deduction'
    },
    {
      label: 'Evidence Eligible',
      value: '¥ 1,205万',
      note: '覆盖率 94.8%',
      trend: '缺口 ¥ 67万',
      tone: 'warning-text'
    },
    {
      label: '最终Payable',
      value: '¥ 1,186万',
      note: '结算转化率 93.2%',
      trend: '待确认 4单',
      tone: 'payable-text'
    }
  ]
  const statuses = [...new Set(settlements.map((item) => item.status))]
  const policies = [
    {
      version: 'V2',
      name: 'BU A · 一级CSO返利政策',
      scope: 'Product A / 华东',
      effective: '2026-04-01',
      current: true
    },
    {
      version: 'V1',
      name: 'BU A · 二级CSO返利政策',
      scope: 'Product B / 全国',
      effective: '2026-01-01',
      current: true
    },
    {
      version: 'V3',
      name: 'BU B · 自然人代理拆分政策',
      scope: 'Product C / 全国',
      effective: '2026-06-01',
      current: true
    },
    {
      version: 'V1',
      name: 'BU C · 基础返利政策',
      scope: 'Product E / 华南',
      effective: '2025-01-01',
      current: false
    }
  ]
  const controls = [
    { title: 'Locked Sales已锁定', detail: '事实版本 Version 3，不允许直接修改', pass: true },
    { title: '政策版本与生效日匹配', detail: '全部记录命中当期有效政策', pass: true },
    { title: 'Evidence审核完成', detail: '3项已完成，1项待补传', pass: false },
    { title: '费用扣减已确认', detail: 'DDI与资源费用均已确认', pass: true },
    { title: '金额取小值校验', detail: 'Payable未超过审核可支付上限', pass: true }
  ]

  const filteredSettlements = computed(() =>
    settlements.filter((item) => {
      const matchesKeyword =
        !keyword.value ||
        `${item.id}${item.cso}`.toLowerCase().includes(keyword.value.toLowerCase())
      return (
        matchesKeyword &&
        (bu.value === '全部' || item.bu === bu.value) &&
        (status.value === '全部' || item.status === status.value)
      )
    })
  )
  const totals = computed(() =>
    filteredSettlements.value.reduce(
      (acc, item) => ({
        calculated: acc.calculated + item.calculated,
        deductions: acc.deductions + item.deductions,
        payable: acc.payable + item.payable
      }),
      { calculated: 0, deductions: 0, payable: 0 }
    )
  )
  const statusTone = (value: string) =>
    value === '可支付'
      ? 'cso-badge--success'
      : value === '待Evidence'
        ? 'cso-badge--danger'
        : value === '审批中'
          ? 'cso-badge--warning'
          : 'cso-badge--primary'
  const openDetail = (item: (typeof settlements)[number]) => {
    selectedSettlement.value = item
    detailVisible.value = true
  }
</script>

<style lang="scss" scoped>
  @use '../shared';

  .header-actions {
    display: flex;
    gap: 10px;
  }

  .settlement-flow {
    display: flex;
    align-items: stretch;
    padding: 18px;
    margin-bottom: 18px;
  }

  .flow-item {
    display: flex;
    flex: 1;
    gap: 12px;
    align-items: center;
    min-height: 100px;
    padding: 14px;
    border: 1px solid var(--cso-line);
    border-radius: 12px;
  }

  .flow-item > span {
    display: grid;
    flex: 0 0 42px;
    place-items: center;
    width: 42px;
    height: 42px;
    font-size: 20px;
    border-radius: 12px;
  }

  .flow-item small,
  .flow-item strong,
  .flow-item p {
    display: block;
  }

  .flow-item small {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
  }

  .flow-item strong {
    margin-top: 5px;
    font-size: 15px;
  }

  .flow-item p {
    margin: 5px 0 0;
    font-size: 11px;
    line-height: 1.5;
    color: var(--cso-muted);
  }

  .flow-item--primary > span {
    color: var(--cso-blue);
    background: var(--cso-blue-soft);
  }

  .flow-item--primary small {
    color: var(--cso-blue);
  }

  .flow-item--navy {
    color: #fff;
    background: var(--cso-navy);
    border-color: var(--cso-navy);
  }

  .flow-item--navy > span {
    color: #fff;
    background: rgb(255 255 255 / 12%);
  }

  .flow-item--navy small {
    color: #82b5ed;
  }

  .flow-item--navy p {
    color: #c9d9eb;
  }

  .flow-item--warning > span {
    color: var(--cso-orange);
    background: var(--cso-orange-soft);
  }

  .flow-item--warning small {
    color: var(--cso-orange);
  }

  .flow-item--success {
    background: #f5fcf8;
    border-color: #b8dfcf;
  }

  .flow-item--success > span {
    color: var(--cso-green);
    background: var(--cso-green-soft);
  }

  .flow-item--success small {
    color: var(--cso-green);
  }

  .flow-arrow {
    display: flex;
    flex: 0 0 52px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #aab6c5;
  }

  .flow-arrow small {
    margin-top: 4px;
    font-size: 11px;
    color: var(--cso-muted);
  }

  .settlement-value {
    display: block;
    margin-top: 13px;
    font-size: 25px;
  }

  .filter-spacer {
    flex: 1;
  }

  .table-note {
    font-size: 12px;
    font-weight: 650;
    color: var(--cso-orange);
  }

  .settlement-link {
    color: inherit;
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
  }

  .settlement-link strong,
  .settlement-link small {
    display: block;
  }

  .settlement-link strong {
    margin-bottom: 5px;
    font-size: 12px;
  }

  .settlement-link small {
    font-size: 11px;
    color: var(--cso-muted);
  }

  .deduction {
    color: var(--cso-red);
  }

  .warning-text {
    color: var(--cso-orange);
  }

  .payable-text {
    color: var(--cso-green);
  }

  .table-total {
    display: flex;
    gap: 28px;
    align-items: center;
    justify-content: flex-end;
    padding: 15px 18px;
    background: #f8fafc;
    border-top: 1px solid var(--cso-line);
  }

  .table-total > span {
    margin-right: auto;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .table-total div {
    text-align: right;
  }

  .table-total small,
  .table-total strong {
    display: block;
  }

  .table-total small {
    font-size: 11px;
    color: var(--cso-muted);
  }

  .table-total strong {
    margin-top: 4px;
    font-size: 14px;
  }

  .lower-grid {
    margin-top: 18px;
  }

  .policy-list,
  .control-list {
    padding: 8px 16px;
  }

  .policy-list article {
    display: grid;
    grid-template-columns: 34px 1fr auto;
    gap: 10px;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid var(--cso-line);
  }

  .policy-list article:last-child,
  .control-list article:last-child {
    border-bottom: 0;
  }

  .policy-version {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    font-size: 12px;
    font-weight: 750;
    color: var(--cso-blue);
    background: var(--cso-blue-soft);
    border-radius: 8px;
  }

  .policy-list strong,
  .policy-list small,
  .control-list strong,
  .control-list small {
    display: block;
  }

  .policy-list strong,
  .control-list strong {
    font-size: 12px;
  }

  .policy-list small,
  .control-list small {
    margin-top: 4px;
    font-size: 11px;
    color: var(--cso-muted);
  }

  .control-list article {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid var(--cso-line);
  }

  .control-icon {
    display: grid;
    flex: 0 0 32px;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 9px;
  }

  .control-icon--pass {
    color: var(--cso-green);
    background: var(--cso-green-soft);
  }

  .control-icon--warning {
    color: var(--cso-orange);
    background: var(--cso-orange-soft);
  }

  .detail-drawer {
    padding: 0 8px;
  }

  .settlement-cover {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 26px;
    margin-bottom: 20px;
    color: #fff;
    background: var(--cso-navy);
    border-radius: 14px;
  }

  .settlement-cover span {
    font-size: 12px;
    color: #8fb7e6;
    letter-spacing: 0.2em;
  }

  .settlement-cover strong {
    margin: 9px 0;
    font-size: 22px;
  }

  .settlement-cover small {
    font-size: 12px;
    color: #c9d9eb;
  }

  .amount-waterfall {
    display: flex;
    gap: 7px;
    align-items: center;
    margin-bottom: 18px;
    overflow-x: auto;
  }

  .amount-waterfall article {
    min-width: 118px;
    padding: 12px;
    border: 1px solid var(--cso-line);
    border-radius: 9px;
  }

  .amount-waterfall span,
  .amount-waterfall strong,
  .amount-waterfall small {
    display: block;
  }

  .amount-waterfall span {
    font-size: 11px;
    color: var(--cso-muted);
  }

  .amount-waterfall strong {
    margin: 7px 0;
    font-size: 13px;
  }

  .amount-waterfall small {
    font-size: 11px;
    line-height: 1.4;
    color: var(--cso-muted);
  }

  .amount-waterfall .negative {
    background: var(--cso-red-soft);
    border-color: #f0c8c8;
  }

  .amount-waterfall .eligible {
    background: var(--cso-orange-soft);
    border-color: #f4d7a9;
  }

  .amount-waterfall .payable {
    color: #fff;
    background: var(--cso-navy);
    border-color: var(--cso-navy);
  }

  .amount-waterfall .payable span,
  .amount-waterfall .payable small {
    color: #c9d9eb;
  }

  .two-cols {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .policy-drawer {
    padding: 0 8px;
  }

  .policy-engine {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px;
    color: #fff;
    background: var(--cso-navy);
    border-radius: 12px;
  }

  .policy-engine span {
    font-size: 11px;
    color: #8fb7e6;
    letter-spacing: 0.12em;
  }

  .policy-engine strong {
    font-size: 18px;
  }

  .engine-columns {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin: 16px 0;
  }

  .engine-columns article {
    padding: 14px;
    border: 1px solid var(--cso-line);
    border-radius: 10px;
  }

  .engine-columns .engine-core {
    color: #fff;
    background: var(--cso-navy);
    border-color: var(--cso-navy);
  }

  .engine-columns h3 {
    margin: 0 0 10px;
    font-size: 12px;
  }

  .engine-columns p {
    margin: 7px 0;
    font-size: 11px;
    color: var(--cso-muted);
  }

  .engine-columns .engine-core p {
    color: #c9d9eb;
  }

  @media (width <= 940px) {
    .settlement-flow {
      overflow-x: auto;
    }

    .flow-item {
      min-width: 210px;
    }
  }

  @media (width <= 720px) {
    .header-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .table-total {
      flex-direction: column;
      align-items: flex-start;
    }

    .engine-columns {
      grid-template-columns: 1fr;
    }
  }
</style>
