<template>
  <div class="cso-page">
    <header class="cso-page-header">
      <div>
        <div class="cso-eyebrow">CSO 360° · ONE FILE PER CSO</div>
        <h1 class="cso-title">一户一档</h1>
        <p class="cso-subtitle"
          >从主体档案进入完整合作历史,贯通资质、合同、人员、经营事实、结算与风险。</p
        >
      </div>
      <div class="header-actions">
        <ElButton @click="router.push('/cso/relationship/partners')"
          ><ArtSvgIcon icon="ri:arrow-left-line" class="mr-1" />返回清单</ElButton
        >
        <ElButton type="primary" @click="ElMessage.success('已发起合同变更流程')"
          >发起合同变更</ElButton
        >
      </div>
    </header>

    <section class="cso-panel hero-panel">
      <div class="hero-top">
        <div class="hero-brand">
          <div class="building-mark"><ArtSvgIcon icon="ri:building-2-fill" /></div>
          <div>
            <div class="name-row">
              <h2>{{ partner.name }}</h2>
              <span class="cso-badge cso-badge--success">{{ partner.relationshipStatus }}</span>
              <span class="cso-badge cso-badge--info">{{ partner.risk }}</span>
              <span class="cso-badge cso-badge--primary">当前状态:合同生效中</span>
            </div>
            <p class="hero-sub">每一笔业务数据,天生归档在这一户里:{{ partner.code }}</p>
          </div>
        </div>
        <div class="archive-chain">
          <template v-for="(node, index) in archiveNodes" :key="node">
            <span>{{ node }}</span>
            <ArtSvgIcon v-if="index < archiveNodes.length - 1" icon="ri:arrow-right-line" />
          </template>
        </div>
      </div>
      <dl class="hero-kv">
        <div class="cso-kv"><dt>统一社会信用代码</dt><dd>91310115MA1XXXXXX0X</dd></div>
        <div class="cso-kv"
          ><dt>CSO编码</dt><dd>{{ partner.code }}</dd></div
        >
        <div class="cso-kv"
          ><dt>主体类型</dt><dd>{{ partner.type }}</dd></div
        >
        <div class="cso-kv"
          ><dt>合作BU</dt><dd>{{ partner.bu.join('、') }}</dd></div
        >
        <div class="cso-kv"
          ><dt>合作产品线</dt><dd>{{ partner.products.join('、') }}</dd></div
        >
        <div class="cso-kv"
          ><dt>主体评级</dt><dd>{{ partner.level }}</dd></div
        >
        <div class="cso-kv"><dt>合作年限</dt><dd>2 年 8 个月</dd></div>
        <div class="cso-kv"
          ><dt>合作区域</dt><dd>{{ partner.region }}</dd></div
        >
      </dl>
    </section>

    <section class="cso-panel detail-panel">
      <ElTabs v-model="activeTab">
        <ElTabPane label="概览" name="overview">
          <div class="cso-panel__subhead">
            <span class="cso-section-label">合作关系总览</span>
            <ElButton link type="primary" @click="activeTab = 'relationship'"
              >全部 {{ relationships.length }} 条</ElButton
            >
          </div>
          <ElTable :data="relationships" class="cso-table" size="small">
            <ElTableColumn prop="bu" label="BU" width="80" />
            <ElTableColumn prop="product" label="产品线" width="110" />
            <ElTableColumn prop="region" label="区域" width="110" />
            <ElTableColumn prop="model" label="合作类型" min-width="120" />
            <ElTableColumn prop="level" label="代理级别" width="80" align="center" />
            <ElTableColumn prop="contract" label="合同编号" width="120">
              <template #default="scope"
                ><ElButton link type="primary" @click="showContract(scope.row)">{{
                  scope.row.contract
                }}</ElButton></template
              >
            </ElTableColumn>
            <ElTableColumn prop="period" label="有效期" min-width="190" />
            <ElTableColumn prop="contractStatus" label="合同状态" width="90" align="center" />
            <ElTableColumn label="关系状态" width="80" align="center">
              <template #default="scope"
                ><span
                  :class="[
                    'cso-badge',
                    scope.row.status === '有效' ? 'cso-badge--success' : 'cso-badge--info'
                  ]"
                  >{{ scope.row.status }}</span
                ></template
              >
            </ElTableColumn>
          </ElTable>

          <div class="overview-grid">
            <article class="detail-card">
              <div class="cso-section-label">关键预警</div>
              <div class="alert-row alert-row--warning"
                ><ArtSvgIcon icon="ri:alarm-warning-line" /><span
                  ><strong>《药品经营许可证》将于 2026-10-05 到期(剩 46 天)</strong
                  ><small>已通知CSO管理员,请尽快发起换证</small></span
                ><ElButton link type="primary">去处理</ElButton></div
              >
              <div class="alert-row"
                ><ArtSvgIcon icon="ri:information-line" /><span
                  ><strong>合同 CT202600017 已于 2026-06-30 到期</strong
                  ><small>对应合作关系已自动终止,历史数据可查看</small></span
                ><ElButton link type="primary">查看</ElButton></div
              >
              <div class="alert-row alert-row--success"
                ><ArtSvgIcon icon="ri:checkbox-circle-line" /><span
                  ><strong>医药代表备案 26 人,均在有效期内</strong><small>备案信息完整</small></span
                ></div
              >
            </article>
            <article class="detail-card">
              <div class="cso-section-label">尽调与风险</div>
              <div class="dd-row"
                ><ArtSvgIcon icon="ri:search-eye-line" />尽调结论:通过(2026-01-10)</div
              >
              <div class="dd-row"><ArtSvgIcon icon="ri:forbid-line" />黑名单检查:无异常</div>
              <div class="dd-row"><ArtSvgIcon icon="ri:alert-line" />历史处罚:无</div>
              <div class="dd-row"><ArtSvgIcon icon="ri:graduation-cap-line" />合规培训:已完成</div>
            </article>
            <article class="detail-card">
              <div class="cso-section-label">快捷操作</div>
              <div class="quick-grid">
                <button
                  v-for="item in quickActions"
                  :key="item.label"
                  type="button"
                  @click="runQuickAction(item.action)"
                  ><ArtSvgIcon :icon="item.icon" /><span>{{ item.label }}</span></button
                >
              </div>
            </article>
            <article class="detail-card">
              <div class="cso-section-label">文档中心</div>
              <div class="document-list">
                <div v-for="item in documents" :key="item.label"
                  ><span><ArtSvgIcon icon="ri:folder-3-line" />{{ item.label }}</span
                  ><b>{{ item.count }}</b></div
                >
              </div>
              <ElButton link type="primary" @click="activeTab = 'documents'"
                >进入文档与证照</ElButton
              >
            </article>
          </div>
        </ElTabPane>

        <ElTabPane label="合作关系" name="relationship">
          <ElTable :data="relationships" class="cso-table">
            <ElTableColumn prop="bu" label="BU" width="90" />
            <ElTableColumn prop="product" label="产品线" width="120" />
            <ElTableColumn prop="region" label="区域" width="130" />
            <ElTableColumn prop="model" label="合作类型" min-width="130" />
            <ElTableColumn prop="level" label="代理级别" width="100" align="center" />
            <ElTableColumn prop="contract" label="合同编号" width="130">
              <template #default="scope"
                ><ElButton link type="primary" @click="showContract(scope.row)">{{
                  scope.row.contract
                }}</ElButton></template
              >
            </ElTableColumn>
            <ElTableColumn prop="period" label="有效期" min-width="200" />
            <ElTableColumn prop="contractStatus" label="合同状态" width="100" align="center" />
            <ElTableColumn label="关系状态" width="90" align="center">
              <template #default="scope"
                ><span
                  :class="[
                    'cso-badge',
                    scope.row.status === '有效' ? 'cso-badge--success' : 'cso-badge--info'
                  ]"
                  >{{ scope.row.status }}</span
                ></template
              >
            </ElTableColumn>
          </ElTable>
        </ElTabPane>

        <ElTabPane label="主体与资质" name="qualification">
          <div class="qual-grid">
            <article class="detail-card">
              <div class="cso-section-label">主体信息</div>
              <dl class="cso-kv-grid two-cols">
                <div class="cso-kv"
                  ><dt>公司名称</dt><dd>{{ partner.name }}</dd></div
                >
                <div class="cso-kv"
                  ><dt>公司类型</dt><dd>{{ partner.type }}</dd></div
                >
                <div class="cso-kv"><dt>成立日期</dt><dd>2016-06-18</dd></div>
                <div class="cso-kv"><dt>注册资本</dt><dd>500万元</dd></div>
                <div class="cso-kv"><dt>统一社会信用代码</dt><dd>91310115MA1XXXXXX0X</dd></div>
                <div class="cso-kv"
                  ><dt>风险评级</dt><dd class="success-text">{{ partner.risk }}</dd></div
                >
              </dl>
            </article>
            <article class="detail-card">
              <div class="cso-section-label">资质证照({{ qualifications.length }})</div>
              <div v-for="item in qualifications" :key="item.name" class="qualification-row">
                <span
                  ><strong>{{ item.name }}</strong
                  ><small>有效期至:{{ item.expiry }}</small></span
                >
                <span
                  :class="['cso-badge', item.warning ? 'cso-badge--warning' : 'cso-badge--success']"
                  >{{ item.warning ? '临期 46 天' : '有效' }}</span
                >
              </div>
            </article>
            <article class="detail-card">
              <div class="cso-section-label">尽调与风险</div>
              <div class="dd-row"
                ><ArtSvgIcon icon="ri:search-eye-line" />尽调结论:通过(2026-01-10)</div
              >
              <div class="dd-row"><ArtSvgIcon icon="ri:forbid-line" />黑名单检查:无异常</div>
              <div class="dd-row"><ArtSvgIcon icon="ri:alert-line" />历史处罚:无</div>
              <div class="dd-row"><ArtSvgIcon icon="ri:graduation-cap-line" />合规培训:已完成</div>
            </article>
          </div>
        </ElTabPane>

        <ElTabPane label="人员与代表" name="representatives">
          <ElAlert
            title="代表信息用于备案、资质与合规管理,不设置代表销量KPI或销售排名。"
            type="warning"
            :closable="false"
            show-icon
            class="mb-4"
          />
          <ElTable :data="representatives" class="cso-table">
            <ElTableColumn prop="name" label="姓名" width="100" />
            <ElTableColumn prop="maskedId" label="身份证号(脱敏)" min-width="160" />
            <ElTableColumn prop="education" label="医药相关学历" min-width="150" />
            <ElTableColumn prop="educationStatus" label="学历核验" width="100"
              ><template #default="scope"
                ><span class="cso-badge cso-badge--success">{{
                  scope.row.educationStatus
                }}</span></template
              ></ElTableColumn
            >
            <ElTableColumn prop="filing" label="备案状态" width="100"
              ><template #default="scope"
                ><span class="cso-badge cso-badge--success">{{ scope.row.filing }}</span></template
              ></ElTableColumn
            >
            <ElTableColumn prop="blacklist" label="黑名单" width="100"
              ><template #default="scope"
                ><span class="cso-badge cso-badge--info">{{ scope.row.blacklist }}</span></template
              ></ElTableColumn
            >
          </ElTable>
        </ElTabPane>

        <ElTabPane label="经营表现" name="operations">
          <div class="operation-grid">
            <article
              ><span>7月Locked Sales</span><strong>{{ formatCurrency(partner.sales) }}</strong
              ><small>确认并锁定 · Version 3</small></article
            >
            <article
              ><span>DDI归属率</span><strong>98.7%</strong><small>异常 4 条待处理</small></article
            >
            <article
              ><span>销量确认及时率</span><strong>100%</strong
              ><small>连续 6 个月按时确认</small></article
            >
            <article
              ><span>Evidence覆盖率</span><strong>96%</strong><small>1份材料待补传</small></article
            >
          </div>
        </ElTabPane>

        <ElTabPane label="费用与结算" name="settlement">
          <div class="settlement-callout">
            <div
              ><span>Calculated Rebate</span
              ><strong>{{ formatCurrency(partner.rebate) }}</strong></div
            >
            <ArtSvgIcon icon="ri:arrow-right-line" />
            <div><span>Evidence Eligible</span><strong>¥ 1,120,000</strong></div>
            <ArtSvgIcon icon="ri:arrow-right-line" />
            <div class="payable"><span>Payable</span><strong>¥ 1,120,000</strong></div>
          </div>
        </ElTabPane>

        <ElTabPane label="风险与合规" name="risk">
          <ElResult
            icon="success"
            title="当前风险评级:低风险"
            sub-title="主体尽调通过,代表备案完整;仍有1项资质到期预警需要处理。"
          />
        </ElTabPane>

        <ElTabPane label="审批与变更" name="approvals">
          <ElTimeline class="approval-timeline">
            <ElTimelineItem
              v-for="(item, index) in lifecycle"
              :key="index"
              :timestamp="item.date"
              :type="
                item.tone === 'success'
                  ? 'success'
                  : item.tone === 'warning'
                    ? 'warning'
                    : item.tone === 'info'
                      ? 'info'
                      : 'primary'
              "
            >
              <strong>{{ item.title }}</strong
              ><small>{{ item.detail }}</small>
            </ElTimelineItem>
          </ElTimeline>
        </ElTabPane>

        <ElTabPane label="文档与证照" name="documents">
          <div class="doc-grid">
            <article class="detail-card">
              <div class="cso-section-label">文档中心</div>
              <div class="document-list">
                <div v-for="item in documents" :key="item.label"
                  ><span><ArtSvgIcon icon="ri:folder-3-line" />{{ item.label }}</span
                  ><b>{{ item.count }}</b></div
                >
              </div>
            </article>
            <article class="detail-card">
              <div class="cso-section-label">资质证照({{ qualifications.length }})</div>
              <div v-for="item in qualifications" :key="item.name" class="qualification-row">
                <span
                  ><strong>{{ item.name }}</strong
                  ><small>有效期至:{{ item.expiry }}</small></span
                >
                <span
                  :class="['cso-badge', item.warning ? 'cso-badge--warning' : 'cso-badge--success']"
                  >{{ item.warning ? '临期 46 天' : '有效' }}</span
                >
              </div>
            </article>
          </div>
        </ElTabPane>

        <ElTabPane label="操作日志" name="logs">
          <ElTable :data="operationLogs" class="cso-table">
            <ElTableColumn prop="time" label="时间" width="160" />
            <ElTableColumn prop="operator" label="操作人" width="110" />
            <ElTableColumn prop="action" label="操作内容" min-width="180" />
            <ElTableColumn prop="detail" label="说明" min-width="240" />
            <ElTableColumn prop="result" label="结果" width="90" align="center">
              <template #default="scope"
                ><span class="cso-badge cso-badge--success">{{ scope.row.result }}</span></template
              >
            </ElTableColumn>
          </ElTable>
        </ElTabPane>
      </ElTabs>
    </section>

    <ElDrawer v-model="contractVisible" title="结构化合同" size="520px">
      <div v-if="selectedContract" class="contract-drawer">
        <div class="contract-title"
          ><span>CONTRACT</span><strong>{{ selectedContract.contract }}</strong
          ><small>{{ selectedContract.status }}</small></div
        >
        <div class="cso-section-label">授权与业务规则</div>
        <dl class="cso-kv-grid two-cols">
          <div class="cso-kv"
            ><dt>BU</dt><dd>{{ selectedContract.bu }}</dd></div
          ><div class="cso-kv"
            ><dt>产品</dt><dd>{{ selectedContract.product }}</dd></div
          ><div class="cso-kv"
            ><dt>区域</dt><dd>{{ selectedContract.region }}</dd></div
          ><div class="cso-kv"
            ><dt>级别</dt><dd>{{ selectedContract.level }}</dd></div
          ><div class="cso-kv"
            ><dt>有效期</dt><dd>{{ selectedContract.period }}</dd></div
          ><div class="cso-kv"><dt>返利政策</dt><dd>Policy-2026-V2</dd></div>
        </dl>
        <ElDivider />
        <div class="cso-section-label">驱动后续业务</div>
        <div class="rule-list"
          ><span>授权生效</span><span>销量归属</span><span>政策匹配</span><span>Evidence要求</span
          ><span>结算依据</span></div
        >
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
  const activeTab = ref('overview')
  const contractVisible = ref(false)
  const selectedContract = ref<(typeof relationships)[number] | null>(null)
  const partner = computed(() => partners.find((item) => item.id === route.query.id) || partners[0])

  const archiveNodes = ['准入', '合同', '流向', '返利', '证据', '结算', '一户一档']

  const qualifications = [
    { name: '《营业执照》', expiry: '2029-05-20', warning: false },
    { name: '《医疗器械经营备案凭证》', expiry: '2027-09-30', warning: false },
    { name: '《药品经营许可证》', expiry: '2026-10-05', warning: true }
  ]
  const representatives = [
    {
      name: '张**',
      maskedId: '310***********4821',
      education: '药学 / 本科',
      educationStatus: '核验通过',
      filing: '已备案',
      blacklist: '无记录'
    },
    {
      name: '李**',
      maskedId: '320***********1736',
      education: '临床医学 / 本科',
      educationStatus: '核验通过',
      filing: '已备案',
      blacklist: '无记录'
    },
    {
      name: '王**',
      maskedId: '310***********6254',
      education: '药学 / 硕士',
      educationStatus: '核验通过',
      filing: '已备案',
      blacklist: '无记录'
    }
  ]
  const quickActions = [
    { label: '新建合作关系', icon: 'ri:git-branch-line', action: 'relationship' },
    { label: '发起合同', icon: 'ri:file-add-line', action: 'contract' },
    { label: '查看DDI归属', icon: 'ri:flow-chart', action: 'ddi' },
    { label: '发起结算', icon: 'ri:funds-box-line', action: 'settlement' },
    { label: '发起尽调', icon: 'ri:search-eye-line', action: 'dd' },
    { label: '新增代表', icon: 'ri:user-add-line', action: 'representative' }
  ]
  const documents = [
    { label: '合同文件', count: 8 },
    { label: '资质证照', count: 15 },
    { label: '尽调报告', count: 3 },
    { label: 'SOW / 附件', count: 6 },
    { label: '其他文件', count: 12 }
  ]
  const operationLogs = [
    {
      time: '2026-08-20 14:22',
      operator: '李四(商务)',
      action: '证照更新审核',
      detail: '《药品经营许可证》换证材料审核通过',
      result: '成功'
    },
    {
      time: '2026-08-18 10:05',
      operator: '系统',
      action: 'DDI归属',
      detail: '8月批次归属本CSO明细 1,284 条',
      result: '成功'
    },
    {
      time: '2026-08-15 23:59',
      operator: '系统',
      action: '销量锁定',
      detail: '7月销量确认锁定,进入返利计算',
      result: '成功'
    },
    {
      time: '2026-07-25 16:40',
      operator: '张三(区域)',
      action: '合同变更审批',
      detail: 'CHG-2026-018 指标变更审批通过',
      result: '成功'
    },
    {
      time: '2026-07-20 09:30',
      operator: '王五(合规)',
      action: '尽调记录',
      detail: '年度尽调结论:通过',
      result: '成功'
    }
  ]

  const showContract = (contract: (typeof relationships)[number]) => {
    selectedContract.value = contract
    contractVisible.value = true
  }
  const runQuickAction = (action: string) => {
    if (action === 'ddi') router.push('/cso/performance/ddi')
    else if (action === 'settlement') router.push('/cso/performance/settlement')
    else ElMessage.success('流程已发起,当前为原型模拟')
  }
</script>

<style lang="scss" scoped>
  @use '../shared';

  .header-actions {
    display: flex;
    gap: 10px;
  }

  .hero-panel {
    padding: 20px;
    margin-bottom: 18px;
  }

  .hero-top {
    display: flex;
    gap: 20px;
    align-items: flex-start;
    justify-content: space-between;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--cso-line);
  }

  .hero-brand {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .building-mark {
    display: grid;
    flex: 0 0 62px;
    place-items: center;
    width: 62px;
    height: 62px;
    font-size: 30px;
    color: var(--cso-blue);
    background: var(--cso-blue-soft);
    border-radius: 50%;
  }

  .name-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .name-row h2 {
    margin: 0;
    font-size: 20px;
  }

  .hero-sub {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .archive-chain {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 10px 14px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    background: #f4f7fb;
    border-radius: 10px;
  }

  .archive-chain svg {
    color: #aab6c5;
  }

  .archive-chain span:last-of-type {
    color: var(--cso-blue);
  }

  .hero-kv {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px 24px;
    margin: 16px 0 0;
  }

  .detail-panel {
    padding: 0 16px 16px;
  }

  .detail-panel :deep(.el-tabs__header) {
    margin-bottom: 16px;
  }

  .cso-panel__subhead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .overview-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-top: 14px;
  }

  .detail-card {
    min-height: 180px;
    padding: 15px;
    border: 1px solid var(--cso-line);
    border-radius: 11px;
  }

  .two-cols {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .success-text {
    color: var(--cso-green);
  }

  .qualification-row {
    display: flex;
    gap: 10px;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid var(--cso-line);
  }

  .qualification-row:last-child {
    border-bottom: 0;
  }

  .qualification-row strong,
  .qualification-row small {
    display: block;
  }

  .qualification-row strong {
    font-size: 12px;
  }

  .qualification-row small {
    margin-top: 4px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .alert-row {
    display: flex;
    gap: 9px;
    align-items: flex-start;
    padding: 10px 0;
    color: var(--cso-blue);
    border-bottom: 1px solid var(--cso-line);
  }

  .alert-row:last-child {
    border-bottom: 0;
  }

  .alert-row--warning {
    color: var(--cso-orange);
  }

  .alert-row--success {
    color: var(--cso-green);
  }

  .alert-row span {
    flex: 1;
    color: var(--cso-text);
  }

  .alert-row strong,
  .alert-row small {
    display: block;
  }

  .alert-row strong {
    font-size: 12px;
  }

  .alert-row small {
    margin-top: 4px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .dd-row {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 9px 0;
    font-size: 12px;
    color: #33445e;
    border-bottom: 1px solid var(--cso-line);
  }

  .dd-row:last-child {
    border-bottom: 0;
  }

  .dd-row svg {
    color: var(--cso-green);
  }

  .quick-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .quick-grid button {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    padding: 14px 8px;
    font-size: 12px;
    font-weight: 550;
    color: var(--cso-text);
    cursor: pointer;
    background: #f7f9fc;
    border: 0;
    border-radius: 10px;
  }

  .quick-grid button:hover {
    background: var(--cso-blue-soft);
  }

  .quick-grid svg {
    font-size: 18px;
    color: var(--cso-blue);
  }

  .document-list {
    padding: 4px 0;
  }

  .document-list div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 12px;
    border-bottom: 1px solid var(--cso-line);
  }

  .document-list div:last-child {
    border-bottom: 0;
  }

  .document-list span {
    display: inline-flex;
    gap: 7px;
    align-items: center;
  }

  .document-list span :deep(svg) {
    color: var(--cso-orange);
  }

  .qual-grid,
  .doc-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .doc-grid {
    grid-template-columns: 1fr 1.2fr;
  }

  .operation-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
  }

  .operation-grid article {
    padding: 20px;
    background: #f7f9fc;
    border-radius: 12px;
  }

  .operation-grid span,
  .operation-grid small {
    display: block;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .operation-grid strong {
    display: block;
    margin: 12px 0;
    font-size: 22px;
  }

  .settlement-callout {
    display: flex;
    gap: 20px;
    align-items: center;
    justify-content: center;
    padding: 35px;
  }

  .settlement-callout > div {
    min-width: 180px;
    padding: 22px;
    text-align: center;
    border: 1px solid var(--cso-line);
    border-radius: 14px;
  }

  .settlement-callout span,
  .settlement-callout strong {
    display: block;
  }

  .settlement-callout span {
    font-size: 12px;
    color: var(--cso-muted);
  }

  .settlement-callout strong {
    margin-top: 10px;
    font-size: 20px;
  }

  .settlement-callout .payable {
    color: #fff;
    background: var(--cso-navy);
    border-color: var(--cso-navy);
  }

  .settlement-callout .payable span {
    color: #c9d9eb;
  }

  .approval-timeline {
    padding: 8px 12px 0;
  }

  .approval-timeline strong {
    font-size: 13px;
  }

  .approval-timeline small {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .contract-drawer {
    padding: 0 8px;
  }

  .contract-title {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 28px;
    margin-bottom: 22px;
    color: #fff;
    background: var(--cso-navy);
    border-radius: 14px;
  }

  .contract-title span {
    font-size: 12px;
    color: #8fb7e6;
    letter-spacing: 0.2em;
  }

  .contract-title strong {
    margin: 10px 0;
    font-size: 24px;
  }

  .contract-title small {
    color: #c9d9eb;
  }

  .rule-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .rule-list span {
    padding: 8px 10px;
    font-size: 12px;
    color: var(--cso-blue);
    background: var(--cso-blue-soft);
    border-radius: 7px;
  }

  @media (width <= 1280px) {
    .hero-kv {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .qual-grid {
      grid-template-columns: 1fr;
    }

    .hero-top {
      flex-direction: column;
    }

    .archive-chain {
      flex-wrap: wrap;
      white-space: normal;
    }
  }

  @media (width <= 900px) {
    .overview-grid,
    .operation-grid,
    .doc-grid {
      grid-template-columns: 1fr;
    }

    .quick-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (width <= 620px) {
    .header-actions {
      flex-direction: column;
    }

    .hero-kv {
      grid-template-columns: 1fr;
    }

    .settlement-callout {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
