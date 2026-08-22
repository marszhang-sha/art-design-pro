<template>
  <div class="cso-page">
    <header class="cso-page-header">
      <div>
        <div class="cso-eyebrow">CSO 360° · SINGLE SOURCE OF TRUTH</div>
        <h1 class="cso-title">一户一档</h1>
        <p class="cso-subtitle">从主体档案进入完整合作历史，贯通资质、合同、人员、经营事实、结算与风险。</p>
      </div>
      <div class="header-actions">
        <ElButton @click="router.push('/cso/partners')"><ArtSvgIcon icon="ri:arrow-left-line" class="mr-1" />返回清单</ElButton>
        <ElButton type="primary" @click="ElMessage.success('已发起合同变更流程')">发起合同变更</ElButton>
      </div>
    </header>

    <section class="partner-hero cso-panel">
      <div class="partner-brand">
        <div class="building-mark"><ArtSvgIcon icon="ri:building-2-fill" /></div>
        <div class="partner-name-block">
          <div class="name-row">
            <h2>{{ partner.name }}</h2>
            <span class="cso-badge cso-badge--success">{{ partner.relationshipStatus }}</span>
          </div>
          <div class="partner-meta">
            <span>{{ partner.code }}</span><i></i><span>{{ partner.type }}</span><i></i><span>{{ partner.level }}</span>
          </div>
          <div class="partner-scope">
            <span><b>合作BU</b>{{ partner.bu.join('、') }}</span>
            <span><b>产品线</b>{{ partner.products.join('、') }}</span>
            <span><b>合作区域</b>{{ partner.region }}</span>
          </div>
        </div>
      </div>
      <div class="hero-metrics">
        <div><span>YTD销量（确认）</span><strong>{{ formatCurrency(partner.sales) }}</strong><small class="cso-trend-up">同比 +18.6%</small></div>
        <div><span>YTD返利（应发）</span><strong>{{ formatCurrency(partner.rebate) }}</strong><small class="cso-trend-up">同比 +15.2%</small></div>
        <div><span>生效合同数</span><strong>3</strong><small>较去年 +1</small></div>
        <div><span>风险与预警</span><strong>2</strong><small class="cso-trend-down">较上月 -1</small></div>
      </div>
    </section>

    <div class="cso-grid-2 overview-grid">
      <div>
        <section class="cso-panel relationships-panel">
          <div class="cso-panel__header">
            <div><span class="cso-panel__title">合作关系总览</span><span class="cso-panel__note">主体信息相对稳定，合作关系持续变化</span></div>
            <ElButton link type="primary" @click="ElMessage.info('已打开全部合作关系')">查看全部</ElButton>
          </div>
          <ElTable :data="relationships" class="cso-table" size="small">
            <ElTableColumn prop="bu" label="BU" width="82" />
            <ElTableColumn prop="product" label="产品线" width="110" />
            <ElTableColumn prop="region" label="区域" width="110" />
            <ElTableColumn prop="model" label="合作类型" min-width="130" />
            <ElTableColumn prop="level" label="级别" width="72" />
            <ElTableColumn prop="contract" label="合同编号" width="120">
              <template #default="scope"><ElButton link type="primary" @click="showContract(scope.row)">{{ scope.row.contract }}</ElButton></template>
            </ElTableColumn>
            <ElTableColumn prop="period" label="有效期" min-width="190" />
            <ElTableColumn label="状态" width="80" align="center">
              <template #default="scope"><span :class="['cso-badge', scope.row.status === '有效' ? 'cso-badge--success' : 'cso-badge--info']">{{ scope.row.status }}</span></template>
            </ElTableColumn>
          </ElTable>
        </section>

        <section class="cso-panel detail-panel">
          <ElTabs v-model="activeTab">
            <ElTabPane label="主体与资质" name="qualification">
              <div class="tab-grid">
                <article class="detail-card">
                  <div class="cso-section-label">主体信息</div>
                  <dl class="cso-kv-grid two-cols">
                    <div class="cso-kv"><dt>公司名称</dt><dd>{{ partner.name }}</dd></div>
                    <div class="cso-kv"><dt>公司类型</dt><dd>{{ partner.type }}</dd></div>
                    <div class="cso-kv"><dt>成立日期</dt><dd>2016-06-18</dd></div>
                    <div class="cso-kv"><dt>注册资本</dt><dd>500万元</dd></div>
                    <div class="cso-kv"><dt>统一社会信用代码</dt><dd>913101XXXXXXXXXXXX</dd></div>
                    <div class="cso-kv"><dt>风险评级</dt><dd class="success-text">低风险</dd></div>
                  </dl>
                </article>
                <article class="detail-card">
                  <div class="cso-section-label">资质证照（3）</div>
                  <div v-for="item in qualifications" :key="item.name" class="qualification-row">
                    <span><strong>{{ item.name }}</strong><small>有效期：{{ item.expiry }}</small></span>
                    <span :class="['cso-badge', item.warning ? 'cso-badge--warning' : 'cso-badge--success']">{{ item.warning ? '即将到期' : '有效' }}</span>
                  </div>
                </article>
                <article class="detail-card warning-card">
                  <div class="cso-section-label">关键预警</div>
                  <div class="alert-row alert-row--warning"><ArtSvgIcon icon="ri:alarm-warning-line" /><span><strong>药品经营许可证将于 2026-10-05 到期</strong><small>剩余 46 天，已通知CSO管理员</small></span></div>
                  <div class="alert-row"><ArtSvgIcon icon="ri:information-line" /><span><strong>合同 CT20260017 已到期</strong><small>对应合作关系已自动终止</small></span></div>
                  <div class="alert-row alert-row--success"><ArtSvgIcon icon="ri:checkbox-circle-line" /><span><strong>医药代表备案信息完整</strong><small>共 26 人，均在有效期内</small></span></div>
                </article>
              </div>
            </ElTabPane>
            <ElTabPane label="合同与授权" name="contract">
              <div class="contract-grid">
                <article v-for="rel in relationships" :key="rel.contract" class="contract-card">
                  <div class="contract-card__top"><span>{{ rel.contract }}</span><span :class="['cso-badge', rel.status === '有效' ? 'cso-badge--success' : 'cso-badge--info']">{{ rel.contractStatus }}</span></div>
                  <h3>{{ rel.bu }} · {{ rel.product }}</h3>
                  <p>{{ rel.region }}｜{{ rel.model }}｜{{ rel.level }}</p>
                  <div class="contract-fields"><span>授权范围</span><b>{{ rel.region }}</b><span>有效期</span><b>{{ rel.period }}</b><span>政策版本</span><b>Policy-2026-V2</b></div>
                  <ElButton link type="primary" @click="showContract(rel)">查看结构化合同</ElButton>
                </article>
              </div>
            </ElTabPane>
            <ElTabPane label="人员与代表" name="representatives">
              <ElAlert title="代表信息用于备案、资质与合规管理，不设置代表销量KPI或销售排名。" type="warning" :closable="false" show-icon class="mb-4" />
              <ElTable :data="representatives" class="cso-table">
                <ElTableColumn prop="name" label="姓名" width="100" />
                <ElTableColumn prop="maskedId" label="身份证号（脱敏）" min-width="160" />
                <ElTableColumn prop="education" label="医药相关学历" min-width="150" />
                <ElTableColumn prop="educationStatus" label="学历核验" width="100"><template #default="scope"><span class="cso-badge cso-badge--success">{{ scope.row.educationStatus }}</span></template></ElTableColumn>
                <ElTableColumn prop="filing" label="备案状态" width="100"><template #default="scope"><span class="cso-badge cso-badge--success">{{ scope.row.filing }}</span></template></ElTableColumn>
                <ElTableColumn prop="blacklist" label="黑名单" width="100"><template #default="scope"><span class="cso-badge cso-badge--info">{{ scope.row.blacklist }}</span></template></ElTableColumn>
              </ElTable>
            </ElTabPane>
            <ElTabPane label="经营表现" name="operations">
              <div class="operation-grid">
                <article><span>7月Locked Sales</span><strong>¥ 328万</strong><small>确认并锁定 · Version 3</small></article>
                <article><span>DDI归属率</span><strong>98.7%</strong><small>异常 4 条待处理</small></article>
                <article><span>销量确认及时率</span><strong>100%</strong><small>连续 6 个月按时确认</small></article>
                <article><span>Evidence覆盖率</span><strong>96%</strong><small>1份材料待补传</small></article>
              </div>
            </ElTabPane>
            <ElTabPane label="费用与结算" name="settlement">
              <div class="settlement-callout"><div><span>Calculated Rebate</span><strong>¥ 328,000</strong></div><ArtSvgIcon icon="ri:arrow-right-line" /><div><span>Evidence Eligible</span><strong>¥ 305,000</strong></div><ArtSvgIcon icon="ri:arrow-right-line" /><div class="payable"><span>Payable</span><strong>¥ 305,000</strong></div></div>
            </ElTabPane>
            <ElTabPane label="风险与合规" name="risk">
              <ElResult icon="success" title="当前风险评级：低风险" sub-title="主体尽调通过，代表备案完整；仍有1项资质到期预警需要处理。" />
            </ElTabPane>
          </ElTabs>
        </section>
      </div>

      <aside class="side-stack">
        <section class="cso-panel quick-panel">
          <div class="cso-panel__header"><span class="cso-panel__title">快捷操作</span></div>
          <button v-for="item in quickActions" :key="item.label" type="button" @click="runQuickAction(item.action)"><ArtSvgIcon :icon="item.icon" /><span>{{ item.label }}</span><ArtSvgIcon icon="ri:arrow-right-s-line" /></button>
        </section>
        <section class="cso-panel document-panel">
          <div class="cso-panel__header"><span class="cso-panel__title">文档中心</span></div>
          <div class="document-list">
            <div v-for="item in documents" :key="item.label"><span><ArtSvgIcon icon="ri:folder-3-line" />{{ item.label }}</span><b>{{ item.count }}</b></div>
          </div>
          <ElButton link type="primary" @click="ElMessage.info('已进入文档中心')">进入文档中心</ElButton>
        </section>
      </aside>
    </div>

    <section class="cso-panel lifecycle-panel">
      <div class="cso-panel__header"><span class="cso-panel__title">合作全生命周期</span><span class="cso-panel__note">所有变更保留业务时间线与审计记录</span></div>
      <div class="lifecycle-flow">
        <template v-for="(item, index) in lifecycle" :key="item.title">
          <article class="lifecycle-node"><span :class="[`node-icon`, `node-icon--${item.tone}`]"><ArtSvgIcon :icon="index === lifecycle.length - 1 ? 'ri:add-line' : 'ri:checkbox-circle-line'" /></span><strong>{{ item.title }}</strong><small>{{ item.date }}</small><p>{{ item.detail }}</p></article>
          <ArtSvgIcon v-if="index < lifecycle.length - 1" icon="ri:arrow-right-line" class="lifecycle-arrow" />
        </template>
      </div>
    </section>

    <ElDrawer v-model="contractVisible" title="结构化合同" size="520px">
      <div v-if="selectedContract" class="contract-drawer">
        <div class="contract-title"><span>CONTRACT</span><strong>{{ selectedContract.contract }}</strong><small>{{ selectedContract.status }}</small></div>
        <div class="cso-section-label">授权与业务规则</div>
        <dl class="cso-kv-grid two-cols">
          <div class="cso-kv"><dt>BU</dt><dd>{{ selectedContract.bu }}</dd></div><div class="cso-kv"><dt>产品</dt><dd>{{ selectedContract.product }}</dd></div><div class="cso-kv"><dt>区域</dt><dd>{{ selectedContract.region }}</dd></div><div class="cso-kv"><dt>级别</dt><dd>{{ selectedContract.level }}</dd></div><div class="cso-kv"><dt>有效期</dt><dd>{{ selectedContract.period }}</dd></div><div class="cso-kv"><dt>返利政策</dt><dd>Policy-2026-V2</dd></div>
        </dl>
        <ElDivider />
        <div class="cso-section-label">驱动后续业务</div>
        <div class="rule-list"><span>授权生效</span><span>销量归属</span><span>政策匹配</span><span>Evidence要求</span><span>结算依据</span></div>
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { formatCurrency, lifecycle, partners, relationships } from '../mock'

  defineOptions({ name: 'CsoPartner360' })
  const route = useRoute()
  const router = useRouter()
  const activeTab = ref('qualification')
  const contractVisible = ref(false)
  const selectedContract = ref<(typeof relationships)[number] | null>(null)
  const partner = computed(() => partners.find((item) => item.id === route.query.id) || partners[0])

  const qualifications = [
    { name: '《营业执照》', expiry: '2029-05-20', warning: false },
    { name: '《医疗器械经营备案凭证》', expiry: '2027-09-30', warning: false },
    { name: '《药品经营许可证》', expiry: '2026-10-05', warning: true }
  ]
  const representatives = [
    { name: '张**', maskedId: '310***********4821', education: '药学 / 本科', educationStatus: '核验通过', filing: '已备案', blacklist: '无记录' },
    { name: '李**', maskedId: '320***********1736', education: '临床医学 / 本科', educationStatus: '核验通过', filing: '已备案', blacklist: '无记录' },
    { name: '王**', maskedId: '310***********6254', education: '药学 / 硕士', educationStatus: '核验通过', filing: '已备案', blacklist: '无记录' }
  ]
  const quickActions = [
    { label: '新建合作关系', icon: 'ri:git-branch-line', action: 'relationship' },
    { label: '发起合同', icon: 'ri:file-add-line', action: 'contract' },
    { label: '查看DDI归属', icon: 'ri:flow-chart', action: 'ddi' },
    { label: '发起结算', icon: 'ri:funds-box-line', action: 'settlement' },
    { label: '新增代表', icon: 'ri:user-add-line', action: 'representative' }
  ]
  const documents = [
    { label: '合同文件', count: 8 }, { label: '资质证照', count: 15 }, { label: '尽调报告', count: 3 }, { label: 'SOW / 附件', count: 6 }, { label: '其他文件', count: 12 }
  ]

  const showContract = (contract: (typeof relationships)[number]) => { selectedContract.value = contract; contractVisible.value = true }
  const runQuickAction = (action: string) => {
    if (action === 'ddi') router.push('/cso/ddi')
    else if (action === 'settlement') router.push('/cso/settlement')
    else ElMessage.success('流程已发起，当前为原型模拟')
  }
</script>

<style lang="scss" scoped>
  @use '../shared.scss';

  .header-actions { display: flex; gap: 10px; }
  .partner-hero { display: grid; grid-template-columns: minmax(420px, 1.35fr) minmax(500px, 1fr); gap: 22px; padding: 20px; margin-bottom: 18px; background: linear-gradient(118deg, #fff 55%, #f4f8ff); }
  .partner-brand { display: flex; align-items: center; gap: 16px; }
  .building-mark { display: grid; width: 68px; height: 68px; flex: 0 0 68px; color: var(--cso-blue); background: var(--cso-blue-soft); place-items: center; border-radius: 50%; font-size: 34px; }
  .name-row { display: flex; align-items: center; gap: 10px; }
  .name-row h2 { margin: 0; font-size: 20px; }
  .partner-meta { display: flex; align-items: center; gap: 8px; margin-top: 8px; color: var(--cso-muted); font-size: 11px; }
  .partner-meta i { width: 3px; height: 3px; background: #a8b3c2; border-radius: 50%; }
  .partner-scope { display: flex; flex-wrap: wrap; gap: 12px 22px; margin-top: 12px; font-size: 11px; }
  .partner-scope b { margin-right: 7px; color: var(--cso-muted); font-weight: 500; }
  .hero-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border: 1px solid var(--cso-line); border-radius: 12px; overflow: hidden; }
  .hero-metrics > div { display: flex; align-items: center; flex-direction: column; justify-content: center; padding: 12px 8px; text-align: center; border-right: 1px solid var(--cso-line); }
  .hero-metrics > div:last-child { border-right: 0; }
  .hero-metrics span { color: var(--cso-muted); font-size: 10px; }
  .hero-metrics strong { margin: 9px 0; font-size: 16px; }
  .hero-metrics small { color: var(--cso-muted); font-size: 9px; }
  .overview-grid { grid-template-columns: minmax(0, 1fr) 245px; align-items: start; }
  .relationships-panel { margin-bottom: 18px; }
  .detail-panel { padding: 0 16px 16px; }
  .detail-panel :deep(.el-tabs__header) { margin-bottom: 16px; }
  .tab-grid { display: grid; grid-template-columns: 1fr 1.05fr 1.1fr; gap: 12px; }
  .detail-card { min-height: 250px; padding: 15px; border: 1px solid var(--cso-line); border-radius: 11px; }
  .two-cols { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .success-text { color: var(--cso-green); }
  .qualification-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--cso-line); }
  .qualification-row:last-child { border-bottom: 0; }
  .qualification-row strong, .qualification-row small { display: block; }
  .qualification-row strong { font-size: 11px; }
  .qualification-row small { margin-top: 4px; color: var(--cso-muted); font-size: 9px; }
  .alert-row { display: flex; align-items: flex-start; gap: 9px; padding: 10px 0; color: var(--cso-blue); border-bottom: 1px solid var(--cso-line); }
  .alert-row:last-child { border-bottom: 0; }
  .alert-row--warning { color: var(--cso-orange); }
  .alert-row--success { color: var(--cso-green); }
  .alert-row span { color: var(--cso-text); }
  .alert-row strong, .alert-row small { display: block; }
  .alert-row strong { font-size: 10px; }
  .alert-row small { margin-top: 4px; color: var(--cso-muted); font-size: 9px; }
  .side-stack { display: grid; gap: 18px; }
  .quick-panel button { display: grid; grid-template-columns: 22px 1fr 20px; align-items: center; width: 100%; padding: 12px 15px; color: var(--cso-blue); text-align: left; cursor: pointer; background: transparent; border: 0; border-bottom: 1px solid var(--cso-line); }
  .quick-panel button span { color: var(--cso-text); font-size: 11px; font-weight: 550; }
  .document-panel { padding-bottom: 12px; text-align: center; }
  .document-list { padding: 8px 15px; }
  .document-list div { display: flex; align-items: center; justify-content: space-between; padding: 9px 0; font-size: 11px; }
  .document-list span { display: inline-flex; align-items: center; gap: 7px; }
  .document-list span :deep(svg) { color: var(--cso-orange); }
  .document-list b { font-size: 11px; }
  .contract-grid, .operation-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
  .contract-card { padding: 16px; border: 1px solid var(--cso-line); border-radius: 12px; }
  .contract-card__top { display: flex; align-items: center; justify-content: space-between; color: var(--cso-blue); font-size: 11px; font-weight: 700; }
  .contract-card h3 { margin: 14px 0 6px; font-size: 14px; }
  .contract-card p { color: var(--cso-muted); font-size: 10px; }
  .contract-fields { display: grid; grid-template-columns: 65px 1fr; gap: 8px; padding: 12px 0; font-size: 10px; }
  .contract-fields span { color: var(--cso-muted); }
  .contract-fields b { font-weight: 550; }
  .operation-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .operation-grid article { padding: 20px; background: #f7f9fc; border-radius: 12px; }
  .operation-grid span, .operation-grid small { display: block; color: var(--cso-muted); font-size: 10px; }
  .operation-grid strong { display: block; margin: 12px 0; font-size: 22px; }
  .settlement-callout { display: flex; align-items: center; justify-content: center; gap: 20px; padding: 35px; }
  .settlement-callout > div { min-width: 180px; padding: 22px; text-align: center; border: 1px solid var(--cso-line); border-radius: 14px; }
  .settlement-callout span, .settlement-callout strong { display: block; }
  .settlement-callout span { color: var(--cso-muted); font-size: 10px; }
  .settlement-callout strong { margin-top: 10px; font-size: 20px; }
  .settlement-callout .payable { color: #fff; background: var(--cso-navy); border-color: var(--cso-navy); }
  .settlement-callout .payable span { color: #c9d9eb; }
  .lifecycle-panel { margin-bottom: 18px; }
  .lifecycle-flow { display: flex; align-items: flex-start; justify-content: space-between; padding: 24px 26px; overflow-x: auto; }
  .lifecycle-node { min-width: 105px; text-align: center; }
  .node-icon { display: grid; width: 36px; height: 36px; margin: 0 auto 10px; place-items: center; border: 1px solid; border-radius: 50%; }
  .node-icon--primary { color: var(--cso-blue); background: var(--cso-blue-soft); }
  .node-icon--success { color: var(--cso-green); background: var(--cso-green-soft); }
  .node-icon--warning { color: var(--cso-orange); background: var(--cso-orange-soft); }
  .node-icon--info { color: #6a7c91; background: #f2f5f8; border-style: dashed; }
  .lifecycle-node strong, .lifecycle-node small, .lifecycle-node p { display: block; }
  .lifecycle-node strong { font-size: 10px; }
  .lifecycle-node small { margin-top: 8px; color: var(--cso-muted); font-size: 9px; }
  .lifecycle-node p { margin: 5px 0 0; font-size: 9px; }
  .lifecycle-arrow { flex: 0 0 auto; margin-top: 12px; color: #aab6c5; }
  .contract-drawer { padding: 0 8px; }
  .contract-title { display: flex; align-items: center; flex-direction: column; padding: 28px; margin-bottom: 22px; color: #fff; background: var(--cso-navy); border-radius: 14px; }
  .contract-title span { color: #8fb7e6; font-size: 10px; letter-spacing: 0.2em; }
  .contract-title strong { margin: 10px 0; font-size: 24px; }
  .contract-title small { color: #c9d9eb; }
  .rule-list { display: flex; flex-wrap: wrap; gap: 8px; }
  .rule-list span { padding: 8px 10px; color: var(--cso-blue); background: var(--cso-blue-soft); border-radius: 7px; font-size: 10px; }

  @media (max-width: 1280px) {
    .partner-hero { grid-template-columns: 1fr; }
    .overview-grid { grid-template-columns: 1fr; }
    .side-stack { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 900px) {
    .hero-metrics, .tab-grid, .contract-grid, .operation-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
  @media (max-width: 620px) {
    .header-actions, .side-stack { flex-direction: column; grid-template-columns: 1fr; }
    .partner-brand { align-items: flex-start; }
    .hero-metrics, .tab-grid, .contract-grid, .operation-grid { grid-template-columns: 1fr; }
    .settlement-callout { align-items: stretch; flex-direction: column; }
  }
</style>
