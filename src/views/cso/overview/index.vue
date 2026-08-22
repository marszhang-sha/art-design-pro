<template>
  <div class="cso-page">
    <header class="cso-page-header">
      <div>
        <div class="cso-eyebrow">CSO OPERATIONS · V1</div>
        <h1 class="cso-title">经营驾驶舱</h1>
        <p class="cso-subtitle">
          围绕“合作—事实—结算”统一展示业务状态；数据口径以已确认并锁定的经营事实为准。
        </p>
      </div>
      <ElButton type="primary" @click="router.push('/cso/partners')">
        <ArtSvgIcon icon="ri:contacts-book-3-line" class="mr-1" />
        查看CSO档案
      </ElButton>
    </header>

    <div class="cso-filter-bar">
      <span class="filter-label">数据范围</span>
      <ElSelect v-model="filters.bu" style="width: 150px">
        <ElOption label="全部BU" value="全部BU" />
        <ElOption label="BU A" value="BU A" />
        <ElOption label="BU B" value="BU B" />
        <ElOption label="BU C" value="BU C" />
      </ElSelect>
      <ElSelect v-model="filters.product" style="width: 160px">
        <ElOption label="全部产品线" value="全部产品线" />
        <ElOption label="Product A" value="Product A" />
        <ElOption label="Product B" value="Product B" />
        <ElOption label="Product C" value="Product C" />
      </ElSelect>
      <ElSelect v-model="filters.region" style="width: 150px">
        <ElOption label="全部区域" value="全部区域" />
        <ElOption label="华东" value="华东" />
        <ElOption label="华南" value="华南" />
        <ElOption label="西南" value="西南" />
      </ElSelect>
      <ElDatePicker
        v-model="filters.month"
        type="month"
        value-format="YYYY-MM"
        placeholder="统计月份"
        style="width: 150px"
      />
      <div class="filter-spacer"></div>
      <span class="data-stamp">
        <ArtSvgIcon icon="ri:checkbox-circle-line" />
        数据更新至 2026-08-20 18:00
      </span>
    </div>

    <section class="cso-stat-grid">
      <div v-for="item in stats" :key="item.label" class="cso-stat-card">
        <div class="stat-top">
          <span class="cso-stat-label">{{ item.label }}</span>
          <span class="stat-icon" :class="`stat-icon--${item.tone}`">
            <ArtSvgIcon :icon="item.icon" />
          </span>
        </div>
        <div class="cso-stat-value">{{ item.value }}</div>
        <div class="cso-stat-foot">
          <span>{{ item.note }}</span>
          <span :class="item.trend.startsWith('+') ? 'cso-trend-up' : 'cso-trend-down'">
            {{ item.trend }}
          </span>
        </div>
      </div>
    </section>

    <div class="cso-grid-2">
      <section class="cso-panel">
        <div class="cso-panel__header">
          <div>
            <span class="cso-panel__title">经营闭环运行状态</span>
            <span class="cso-panel__note">三个闭环共享同一合作关系与审计底座</span>
          </div>
          <ElSegmented v-model="cycleView" :options="['本月', '本季度']" size="small" />
        </div>
        <div class="cso-panel__body cycle-grid">
          <article v-for="cycle in cycles" :key="cycle.title" class="cycle-card">
            <div class="cycle-heading">
              <span class="cycle-no">{{ cycle.no }}</span>
              <div>
                <h3>{{ cycle.title }}</h3>
                <p>{{ cycle.subtitle }}</p>
              </div>
            </div>
            <div class="cycle-flow">
              <template v-for="(step, index) in cycle.steps" :key="step">
                <span :class="['cycle-step', { 'cycle-step--active': index < cycle.completed }]">
                  {{ step }}
                </span>
                <ArtSvgIcon
                  v-if="index < cycle.steps.length - 1"
                  icon="ri:arrow-right-s-line"
                  class="cycle-arrow"
                />
              </template>
            </div>
            <div class="cycle-progress">
              <ElProgress
                :percentage="cycle.percent"
                :stroke-width="7"
                :show-text="false"
                :color="cycle.color"
              />
              <strong>{{ cycle.percent }}%</strong>
              <span>{{ cycle.exception }}项待处理</span>
            </div>
          </article>
        </div>
      </section>

      <section class="cso-panel">
        <div class="cso-panel__header">
          <span class="cso-panel__title">风险与待办</span>
          <span class="cso-link" @click="ElMessage.info('已展示全部待办')">全部 12 项</span>
        </div>
        <div class="risk-list">
          <button
            v-for="item in risks"
            :key="item.title"
            class="risk-item"
            type="button"
            @click="router.push(item.path)"
          >
            <span :class="['risk-icon', `risk-icon--${item.tone}`]">
              <ArtSvgIcon :icon="item.icon" />
            </span>
            <span class="risk-content">
              <strong>{{ item.title }}</strong>
              <small>{{ item.detail }}</small>
            </span>
            <span class="risk-count">{{ item.count }}</span>
            <ArtSvgIcon icon="ri:arrow-right-s-line" class="risk-arrow" />
          </button>
        </div>
      </section>
    </div>

    <div class="cso-grid-equal">
      <section class="cso-panel">
        <div class="cso-panel__header">
          <div>
            <span class="cso-panel__title">Locked Sales 与 Payable 趋势</span>
            <span class="cso-panel__note">单位：万元</span>
          </div>
          <div class="legend">
            <span><i class="legend-dot legend-dot--blue"></i>Locked Sales</span>
            <span><i class="legend-dot legend-dot--green"></i>Payable</span>
          </div>
        </div>
        <div class="cso-panel__body trend-chart">
          <div v-for="month in monthlyTrend" :key="month.month" class="trend-column">
            <div class="trend-bars">
              <span class="trend-bar trend-bar--sales" :style="{ height: `${month.sales}%` }"></span>
              <span class="trend-bar trend-bar--payable" :style="{ height: `${month.payable}%` }"></span>
            </div>
            <span>{{ month.month }}</span>
          </div>
        </div>
      </section>

      <section class="cso-panel">
        <div class="cso-panel__header">
          <div>
            <span class="cso-panel__title">Evidence覆盖与结算转化</span>
            <span class="cso-panel__note">Calculated ≠ Payable</span>
          </div>
          <span class="cso-link" @click="router.push('/cso/settlement')">进入结算</span>
        </div>
        <div class="cso-panel__body conversion-body">
          <div v-for="item in conversions" :key="item.label" class="conversion-row">
            <div class="conversion-label">
              <strong>{{ item.label }}</strong>
              <span>{{ item.value }}</span>
            </div>
            <ElProgress
              :percentage="item.percent"
              :stroke-width="10"
              :show-text="false"
              :color="item.color"
            />
            <small>{{ item.note }}</small>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { reactive, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'

  defineOptions({ name: 'CsoOverview' })

  const router = useRouter()
  const cycleView = ref('本月')
  const filters = reactive({ bu: '全部BU', product: '全部产品线', region: '全部区域', month: '2026-08' })

  const stats = [
    { label: '有效CSO合作关系', value: '186', note: '覆盖 3 个BU', trend: '+12', icon: 'ri:shake-hands-line', tone: 'blue' },
    { label: 'YTD Locked Sales', value: '¥ 1.28亿', note: '较去年同期', trend: '+18.6%', icon: 'ri:line-chart-line', tone: 'teal' },
    { label: 'YTD Payable返利', value: '¥ 1,186万', note: '结算转化率 93.2%', trend: '+15.2%', icon: 'ri:funds-line', tone: 'orange' },
    { label: 'Evidence覆盖率', value: '94.8%', note: '待补传 7 份', trend: '-1.4%', icon: 'ri:file-shield-2-line', tone: 'green' }
  ]

  const cycles = [
    { no: '01', title: '合作闭环', subtitle: '资格与授权', steps: ['准入', '合同', '档案', '生效'], completed: 4, percent: 96, exception: 3, color: '#1768e5' },
    { no: '02', title: '数据闭环', subtitle: '可信经营事实', steps: ['DDI', '匹配', '归属', '确认', '锁定'], completed: 4, percent: 91, exception: 18, color: '#199a93' },
    { no: '03', title: '结算闭环', subtitle: '合规可支付', steps: ['事实', '政策', 'Evidence', '审核', '结算'], completed: 3, percent: 84, exception: 9, color: '#ed9518' }
  ]

  const risks = [
    { title: '资质即将到期', detail: '45天内需完成更新', count: 5, tone: 'warning', icon: 'ri:alarm-warning-line', path: '/cso/partners' },
    { title: 'DDI异常待归属', detail: '影响本月事实锁定', count: 18, tone: 'danger', icon: 'ri:git-merge-line', path: '/cso/ddi' },
    { title: 'Evidence待审核', detail: '其中2项价格偏离', count: 7, tone: 'primary', icon: 'ri:file-search-line', path: '/cso/evidence' },
    { title: '结算待CSO确认', detail: '预计金额 ¥ 126万', count: 4, tone: 'success', icon: 'ri:checkbox-multiple-line', path: '/cso/settlement' }
  ]

  const monthlyTrend = [
    { month: '03月', sales: 48, payable: 35 },
    { month: '04月', sales: 60, payable: 44 },
    { month: '05月', sales: 55, payable: 41 },
    { month: '06月', sales: 72, payable: 55 },
    { month: '07月', sales: 80, payable: 62 },
    { month: '08月', sales: 92, payable: 71 }
  ]

  const conversions = [
    { label: 'Calculated Rebate', value: '¥ 1,272万', percent: 100, color: '#1768e5', note: '由Locked Sales × Policy计算' },
    { label: 'Evidence Eligible', value: '¥ 1,205万', percent: 95, color: '#ed9518', note: '证据金额与审核状态共同约束' },
    { label: 'Payable', value: '¥ 1,186万', percent: 93, color: '#2a9b65', note: '扣减后形成最终可支付金额' }
  ]
</script>

<style lang="scss" scoped>
  @use '../shared.scss';

  .filter-label { color: var(--cso-muted); font-size: 12px; font-weight: 650; }
  .filter-spacer { flex: 1; }
  .data-stamp { display: inline-flex; align-items: center; gap: 6px; color: var(--cso-green); font-size: 11px; }
  .stat-top { display: flex; align-items: center; justify-content: space-between; }
  .stat-icon { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 10px; font-size: 17px; }
  .stat-icon--blue { color: var(--cso-blue); background: var(--cso-blue-soft); }
  .stat-icon--teal { color: var(--cso-teal); background: var(--cso-teal-soft); }
  .stat-icon--orange { color: var(--cso-orange); background: var(--cso-orange-soft); }
  .stat-icon--green { color: var(--cso-green); background: var(--cso-green-soft); }
  .cycle-grid { display: grid; gap: 13px; }
  .cycle-card { padding: 14px; border: 1px solid var(--cso-line); border-radius: 12px; }
  .cycle-heading { display: flex; align-items: center; gap: 12px; }
  .cycle-no { display: grid; width: 32px; height: 32px; color: #fff; background: var(--cso-navy); place-items: center; border-radius: 8px; font-size: 11px; font-weight: 750; }
  .cycle-heading h3 { margin: 0; font-size: 14px; }
  .cycle-heading p { margin: 3px 0 0; color: var(--cso-muted); font-size: 11px; }
  .cycle-flow { display: flex; align-items: center; gap: 4px; margin: 14px 0 12px 44px; }
  .cycle-step { min-width: 54px; padding: 5px 8px; color: #7a8798; text-align: center; background: #f1f4f8; border-radius: 6px; font-size: 10px; }
  .cycle-step--active { color: #135abd; background: var(--cso-blue-soft); }
  .cycle-arrow { color: #a8b3c2; }
  .cycle-progress { display: grid; grid-template-columns: minmax(0, 1fr) 38px 72px; gap: 8px; align-items: center; margin-left: 44px; font-size: 10px; }
  .cycle-progress strong { font-size: 11px; }
  .cycle-progress span { color: var(--cso-muted); text-align: right; }
  .risk-list { padding: 8px 14px; }
  .risk-item { display: flex; align-items: center; width: 100%; padding: 13px 4px; color: inherit; text-align: left; cursor: pointer; background: transparent; border: 0; border-bottom: 1px solid var(--cso-line); }
  .risk-item:last-child { border-bottom: 0; }
  .risk-icon { display: grid; width: 34px; height: 34px; margin-right: 10px; place-items: center; border-radius: 10px; }
  .risk-icon--warning { color: #a8680c; background: var(--cso-orange-soft); }
  .risk-icon--danger { color: var(--cso-red); background: var(--cso-red-soft); }
  .risk-icon--primary { color: var(--cso-blue); background: var(--cso-blue-soft); }
  .risk-icon--success { color: var(--cso-green); background: var(--cso-green-soft); }
  .risk-content { display: flex; flex: 1; flex-direction: column; gap: 4px; }
  .risk-content strong { font-size: 12px; }
  .risk-content small { color: var(--cso-muted); font-size: 10px; }
  .risk-count { display: grid; min-width: 26px; height: 24px; margin-right: 4px; color: var(--cso-blue); background: var(--cso-blue-soft); place-items: center; border-radius: 12px; font-size: 11px; font-weight: 700; }
  .risk-arrow { color: #9aa7b8; }
  .legend { display: flex; gap: 14px; color: var(--cso-muted); font-size: 10px; }
  .legend span { display: inline-flex; align-items: center; }
  .legend-dot { width: 7px; height: 7px; margin-right: 5px; border-radius: 50%; }
  .legend-dot--blue { background: var(--cso-blue); }
  .legend-dot--green { background: var(--cso-green); }
  .trend-chart { display: flex; align-items: flex-end; justify-content: space-around; height: 245px; padding-top: 26px; }
  .trend-column { display: flex; align-items: center; flex-direction: column; gap: 10px; width: 12%; color: var(--cso-muted); font-size: 10px; }
  .trend-bars { display: flex; align-items: flex-end; gap: 5px; width: 100%; height: 170px; }
  .trend-bar { flex: 1; min-height: 8px; border-radius: 5px 5px 2px 2px; transition: height 0.25s ease; }
  .trend-bar--sales { background: linear-gradient(180deg, #2d7df0, #1768e5); }
  .trend-bar--payable { background: linear-gradient(180deg, #56bd8b, #2a9b65); }
  .conversion-body { display: grid; gap: 22px; }
  .conversion-label { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
  .conversion-label strong { font-size: 12px; }
  .conversion-label span { font-size: 14px; font-weight: 750; }
  .conversion-row small { display: block; margin-top: 6px; color: var(--cso-muted); font-size: 10px; }

  @media (max-width: 720px) {
    .filter-spacer { display: none; }
    .cycle-flow { flex-wrap: wrap; margin-left: 0; }
    .cycle-progress { margin-left: 0; }
  }
</style>
