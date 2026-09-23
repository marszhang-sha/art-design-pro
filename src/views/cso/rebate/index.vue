<template>
  <div class="cso-page">
    <header class="cso-page-header">
      <div>
        <div class="cso-eyebrow">REBATE</div>
        <h1 class="cso-title">返利计算</h1>
        <p class="cso-subtitle"
          >按产品线匹配政策版本计算返利;支持版本重算、差异留痕与自然人返利拆分。</p
        >
      </div>
      <div class="header-actions">
        <ElButton @click="policyVisible = true">
          <ArtSvgIcon icon="ri:settings-3-line" class="mr-1" />政策配置
        </ElButton>
        <ElButton
          type="primary"
          @click="ElMessage.success('已创建 2026 Q3 试算任务,计算完成后通知')"
        >
          <ArtSvgIcon icon="ri:calculator-line" class="mr-1" />新建试算
        </ElButton>
      </div>
    </header>

    <section class="cso-panel calc-panel">
      <div class="cso-panel__header">
        <div>
          <span class="cso-panel__title">计算主线</span>
          <span class="cso-panel__note"
            >CSO 类型/级别 × BU × 产品线 × 有效期版本 = 当期唯一有效政策</span
          >
        </div>
        <span class="health"><i></i>2026 Q3 试算已完成</span>
      </div>
      <div class="calc-flow">
        <template v-for="(step, index) in calcSteps" :key="step.title">
          <article :class="['calc-step', `calc-step--${step.state}`]">
            <span class="calc-no">{{ index + 1 }}</span>
            <div
              ><strong>{{ step.title }}</strong
              ><small>{{ step.detail }}</small></div
            >
          </article>
          <ArtSvgIcon
            v-if="index < calcSteps.length - 1"
            icon="ri:arrow-right-line"
            class="calc-arrow"
          />
        </template>
      </div>
    </section>

    <section v-for="sheet in rebateSheets" :key="sheet.id" class="cso-panel sheet-panel">
      <div class="cso-panel__header">
        <div>
          <span class="cso-panel__title">{{ sheet.quarter }} 返利试算 · {{ sheet.cso }}</span>
          <span class="cso-panel__note"
            >{{ sheet.id }} · 版本 {{ sheet.version }} · {{ sheet.bu }}</span
          >
        </div>
        <div class="sheet-head-right">
          <span
            v-if="sheet.diff"
            :class="['cso-badge', sheet.diff < 0 ? 'cso-badge--warning' : 'cso-badge--success']"
          >
            {{ sheet.diff < 0 ? '' : '+' }}{{ formatCurrency(sheet.diff) }} 差异
          </span>
          <span
            :class="[
              'cso-badge',
              sheet.status === '已重算' ? 'cso-badge--warning' : 'cso-badge--primary'
            ]"
            >{{ sheet.status }}</span
          >
        </div>
      </div>
      <div class="sheet-body">
        <div class="sheet-main">
          <ElTable :data="sheet.lines" class="cso-table" size="small">
            <ElTableColumn prop="product" label="产品线" width="105" />
            <ElTableColumn prop="policy" label="匹配政策" width="165" />
            <ElTableColumn prop="rule" label="返利规则" min-width="200" />
            <ElTableColumn label="锁定销量" width="120" align="right">
              <template #default="scope">{{ formatCurrency(scope.row.lockedSales) }}</template>
            </ElTableColumn>
            <ElTableColumn label="应发返利" width="110" align="right">
              <template #default="scope"
                ><strong>{{ formatCurrency(scope.row.rebate) }}</strong></template
              >
            </ElTableColumn>
          </ElTable>
          <div v-if="sheet.split" class="split-block">
            <div class="cso-section-label">自然人返利拆分 · 分笔支付</div>
            <div class="split-row">
              <article
                ><span>三方公司服务费</span
                ><strong>{{ formatCurrency(sheet.split.serviceFee) }}</strong
                ><small>{{ sheet.split.thirdParty }}</small></article
              >
              <article
                ><span>自然人实收</span><strong>{{ formatCurrency(sheet.split.personal) }}</strong
                ><small>分别生成支付单</small></article
              >
            </div>
          </div>
        </div>
        <aside class="sheet-side">
          <div class="total-block">
            <span>理论应发返利</span>
            <strong>{{ formatCurrency(sheet.total) }}</strong>
            <small>来自已锁定销量(确认与异议处理结果)</small>
          </div>
          <div v-if="sheet.diffReason" class="recalc-block">
            <div class="cso-section-label">可重算机制</div>
            <p>{{ sheet.diffReason }}</p>
            <div class="recalc-diff">
              <span
                >{{ sheet.previousVersion.split(' · ')[0]
                }}<b>{{ sheet.previousVersion.split(' · ')[1] }}</b></span
              >
              <ArtSvgIcon icon="ri:arrow-right-line" />
              <span
                >{{ sheet.version }}<b>{{ formatCurrency(sheet.total) }}</b></span
              >
            </div>
            <small>版本 · 日志 · 差异全留痕</small>
          </div>
          <div v-else class="recalc-block recalc-block--ok">
            <div class="cso-section-label">汇总与校验</div>
            <p>产品线汇总 · 金额校验通过 · 计算日志已记录;待CSO确认后进入结算流程。</p>
          </div>
        </aside>
      </div>
    </section>

    <div class="cso-grid-2 policy-layout">
      <section class="cso-panel">
        <div class="cso-panel__header">
          <div>
            <span class="cso-panel__title">政策版本</span>
            <span class="cso-panel__note">配置修改留痕 · 生效维度可组合</span>
          </div>
          <span class="table-note">Business 变化 → 改配置,不改代码</span>
        </div>
        <ElTable :data="rebatePolicies" class="cso-table" size="small">
          <ElTableColumn prop="code" label="政策编码" width="175" />
          <ElTableColumn prop="scope" label="适用范围" min-width="150" />
          <ElTableColumn prop="mode" label="模式" width="90" align="center" />
          <ElTableColumn prop="detail" label="规则" min-width="210" />
          <ElTableColumn prop="effective" label="生效日" width="95" align="center" />
          <ElTableColumn label="状态" width="90" align="center">
            <template #default="scope">
              <span
                :class="['cso-badge', scope.row.current ? 'cso-badge--success' : 'cso-badge--info']"
                >{{ scope.row.current ? '当前有效' : '历史版本' }}</span
              >
            </template>
          </ElTableColumn>
        </ElTable>
      </section>

      <section class="cso-panel engine-panel">
        <div class="cso-panel__header"
          ><span class="cso-panel__title">Policy Engine · 输入 / 规则 / 输出</span></div
        >
        <div class="engine-grid">
          <article>
            <h4>输入</h4>
            <p>锁定销量</p><p>CSO类型/级别</p><p>BU × 产品线</p><p>计算周期</p><p>有效期版本</p>
          </article>
          <article class="engine-core">
            <h4>规则</h4>
            <p>固定比例</p><p>阶梯返利</p><p>达标激励 / 准入奖</p><p>产品线独立计算</p
            ><p>自然人拆分规则</p>
          </article>
          <article>
            <h4>输出</h4>
            <p>理论应发返利</p><p>计算明细</p><p>政策版本</p><p>重算差异</p><p>计算日志</p>
          </article>
        </div>
        <ElAlert
          title="关键控制:Policy Version + Effective Date + Recalculation,全程可复算、可审计。"
          type="warning"
          :closable="false"
          show-icon
        />
      </section>
    </div>

    <ElDrawer v-model="policyVisible" title="返利政策配置" size="520px">
      <ElAlert
        title="政策按 BU × 产品线 × CSO类型/级别 × 有效期 配置,修改全程留痕。"
        type="info"
        :closable="false"
        show-icon
        class="mb-4"
      />
      <ElForm label-position="top">
        <ElFormItem label="政策模式">
          <ElRadioGroup model-value="阶梯返利">
            <ElRadioButton value="固定比例">固定比例</ElRadioButton>
            <ElRadioButton value="阶梯返利">阶梯返利</ElRadioButton>
            <ElRadioButton value="达标激励">达标激励</ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="适用范围">
          <ElSelect model-value="BU A · Product A · 一级" class="w-full">
            <ElOption label="BU A · Product A · 一级" value="BU A · Product A · 一级" />
            <ElOption label="BU A · Product B · 二级" value="BU A · Product B · 二级" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="阶梯区间(示例)">
          <div class="ladder-demo">
            <span>≥ ¥3,000,000 → 1%</span><span>≥ ¥2,000,000 → 0.8%</span><span>其他 → 0.6%</span>
          </div>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="policyVisible = false">取消</ElButton>
        <ElButton type="primary" @click="ElMessage.success('政策版本已保存,生成新版本并留痕')"
          >保存新版本</ElButton
        >
      </template>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { formatCurrency, rebatePolicies, rebateSheets } from '../mock'

  defineOptions({ name: 'CsoRebate' })

  const policyVisible = ref(false)

  const calcSteps = [
    { title: '锁定销量事实', detail: '来自确认结果 · 自然人已标识', state: 'done' },
    { title: '确定计算维度', detail: 'CSO × BU × 产品线 × 周期', state: 'done' },
    { title: '匹配有效政策', detail: '类型/级别 × 有效期版本', state: 'done' },
    { title: 'Policy Engine', detail: '固定比例 · 阶梯 · 激励', state: 'active' },
    { title: '汇总与校验', detail: '产品线汇总 · 金额校验', state: 'pending' },
    { title: '理论应发返利', detail: '版本化 · 可追溯可重算', state: 'pending' }
  ]
</script>

<style lang="scss" scoped>
  @use '../shared';

  .header-actions {
    display: flex;
    gap: 10px;
  }

  .health {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    font-size: 12px;
    color: var(--cso-green);
  }

  .health i {
    width: 7px;
    height: 7px;
    background: var(--cso-green);
    border-radius: 50%;
    box-shadow: 0 0 0 4px var(--cso-green-soft);
  }

  .calc-panel {
    margin-bottom: 18px;
  }

  .calc-flow {
    display: flex;
    align-items: stretch;
    padding: 18px;
  }

  .calc-step {
    display: grid;
    flex: 1;
    grid-template-columns: 28px minmax(95px, 1fr);
    gap: 8px;
    align-items: center;
    min-height: 64px;
    padding: 9px;
    border: 1px solid var(--cso-line);
    border-radius: 9px;
  }

  .calc-step--done {
    background: #f5fcf8;
    border-color: #b8dfcf;
  }

  .calc-step--active {
    background: #f2f7ff;
    border-color: #94bdf4;
    box-shadow: inset 0 -3px var(--cso-blue);
  }

  .calc-step--pending {
    background: #fafbfc;
  }

  .calc-no {
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    font-size: 12px;
    font-weight: 700;
    color: var(--cso-blue);
    background: var(--cso-blue-soft);
    border-radius: 50%;
  }

  .calc-step--done .calc-no {
    color: var(--cso-green);
    background: var(--cso-green-soft);
  }

  .calc-step strong,
  .calc-step small {
    display: block;
  }

  .calc-step strong {
    font-size: 12px;
  }

  .calc-step small {
    margin-top: 4px;
    font-size: 11px;
    color: var(--cso-muted);
  }

  .calc-arrow {
    flex: 0 0 20px;
    align-self: center;
    color: #aab6c5;
  }

  .sheet-panel {
    margin-bottom: 18px;
  }

  .sheet-head-right {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .sheet-body {
    display: grid;
    grid-template-columns: minmax(0, 1.7fr) minmax(280px, 0.75fr);
    gap: 18px;
    padding: 18px;
  }

  .split-block {
    margin-top: 16px;
  }

  .split-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .split-row article {
    padding: 13px;
    background: #fbfcfe;
    border: 1px dashed var(--cso-line);
    border-radius: 10px;
  }

  .split-row span {
    display: block;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .split-row strong {
    display: block;
    margin: 7px 0 5px;
    font-size: 17px;
  }

  .split-row small {
    font-size: 12px;
    color: var(--cso-muted);
  }

  .sheet-side {
    display: grid;
    gap: 14px;
    align-content: start;
  }

  .total-block {
    padding: 18px;
    color: #fff;
    background: linear-gradient(135deg, #0b2c4d, #14529c);
    border-radius: 12px;
  }

  .total-block span {
    font-size: 12px;
    opacity: 0.8;
  }

  .total-block strong {
    display: block;
    margin-top: 8px;
    font-size: 26px;
  }

  .total-block small {
    display: block;
    margin-top: 8px;
    font-size: 12px;
    opacity: 0.75;
  }

  .recalc-block {
    padding: 15px;
    border: 1px solid var(--cso-line);
    border-radius: 11px;
  }

  .recalc-block--ok {
    background: #fafbfc;
  }

  .recalc-block p {
    margin: 0 0 12px;
    font-size: 12px;
    line-height: 1.65;
    color: #51617a;
  }

  .recalc-diff {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .recalc-diff span {
    display: grid;
    gap: 3px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .recalc-diff b {
    font-size: 13px;
    color: var(--cso-text);
  }

  .recalc-diff svg {
    color: var(--cso-blue);
  }

  .recalc-block > small {
    display: block;
    margin-top: 10px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .policy-layout {
    align-items: start;
  }

  .table-note {
    font-size: 12px;
    color: var(--cso-muted);
  }

  .engine-panel :deep(.el-alert) {
    margin: 0 18px 18px;
  }

  .engine-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    padding: 18px;
  }

  .engine-grid article {
    padding: 13px;
    border: 1px solid var(--cso-line);
    border-radius: 10px;
  }

  .engine-grid h4 {
    margin: 0 0 9px;
    font-size: 12px;
    color: var(--cso-muted);
    letter-spacing: 0.08em;
  }

  .engine-grid p {
    margin: 0 0 8px;
    font-size: 12px;
    color: #33445e;
  }

  .engine-grid p:last-child {
    margin-bottom: 0;
  }

  .engine-core {
    background: #f2f7ff;
    border-color: #c6dcfa;
  }

  .ladder-demo {
    display: grid;
    gap: 7px;
    width: 100%;
  }

  .ladder-demo span {
    padding: 8px 11px;
    font-size: 12px;
    background: #f4f7fb;
    border-radius: 7px;
  }

  @media (width <= 1180px) {
    .sheet-body {
      grid-template-columns: 1fr;
    }

    .policy-layout {
      grid-template-columns: 1fr;
    }
  }

  @media (width <= 1080px) {
    .calc-flow {
      overflow-x: auto;
    }

    .calc-step {
      min-width: 150px;
    }
  }

  @media (width <= 720px) {
    .header-actions {
      flex-direction: column;
    }

    .engine-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
