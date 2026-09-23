<template>
  <div class="cso-page">
    <header class="cso-page-header">
      <div>
        <div class="cso-eyebrow">DDI → BUSINESS FACT</div>
        <h1 class="cso-title">DDI归属工作台</h1>
        <p class="cso-subtitle"
          >保留Raw
          Data，完成校验、标准化、主数据匹配、合作关系归属、确认与版本锁定后，形成可信经营事实。</p
        >
      </div>
      <ElButton type="primary" @click="ElMessage.success('已创建DDI文件上传任务')"
        ><ArtSvgIcon icon="ri:upload-cloud-2-line" class="mr-1" />上传DDI文件</ElButton
      >
    </header>

    <section class="cso-panel pipeline-panel">
      <div class="pipeline-top">
        <div
          ><span class="cso-panel__title">2026年08月数据批次</span
          ><span class="cso-panel__note">最后同步：2026-08-20 18:00</span></div
        >
        <span class="health"><i></i>接口运行正常</span>
      </div>
      <div class="pipeline">
        <template v-for="(step, index) in pipeline" :key="step.label">
          <article :class="['pipeline-step', `pipeline-step--${step.state}`]">
            <span class="step-no">{{ index + 1 }}</span>
            <div
              ><strong>{{ step.label }}</strong
              ><small>{{ step.detail }}</small></div
            >
            <span class="step-count">{{ step.count }}</span>
          </article>
          <ArtSvgIcon
            v-if="index < pipeline.length - 1"
            icon="ri:arrow-right-line"
            class="pipeline-arrow"
          />
        </template>
      </div>
      <div class="pipeline-foot">
        <span><ArtSvgIcon icon="ri:database-2-line" />Raw Data 128,462条</span>
        <span><ArtSvgIcon icon="ri:checkbox-circle-line" />标准化成功率 99.3%</span>
        <span><ArtSvgIcon icon="ri:git-merge-line" />自动归属率 98.7%</span>
        <span><ArtSvgIcon icon="ri:lock-2-line" />Locked Sales 12,284条</span>
      </div>
    </section>

    <section class="cso-stat-grid ddi-stats">
      <div v-for="item in stats" :key="item.label" class="cso-stat-card">
        <span class="cso-stat-label">{{ item.label }}</span
        ><strong class="ddi-value">{{ item.value }}</strong
        ><small>{{ item.note }}</small>
      </div>
    </section>

    <div class="cso-grid-2">
      <section class="cso-panel">
        <div class="cso-panel__header"
          ><div
            ><span class="cso-panel__title">异常池</span
            ><span class="cso-panel__note">允许纠错，但必须填写原因并保留依据</span></div
          ><span class="cso-badge cso-badge--danger">3项待处理</span></div
        >
        <div class="table-filters">
          <ElInput
            v-model="keyword"
            placeholder="搜索终端 / 异常编号"
            clearable
            style="width: 240px"
            ><template #prefix><ArtSvgIcon icon="ri:search-line" /></template
          ></ElInput>
          <ElSelect v-model="exceptionType" style="width: 160px"
            ><ElOption label="全部异常类型" value="全部" /><ElOption
              v-for="item in exceptionTypes"
              :key="item"
              :label="item"
              :value="item"
          /></ElSelect>
          <ElSelect v-model="exceptionStatus" style="width: 130px"
            ><ElOption label="全部状态" value="全部" /><ElOption
              label="待处理"
              value="待处理" /><ElOption label="处理中" value="处理中" /><ElOption
              label="已处理"
              value="已处理"
          /></ElSelect>
        </div>
        <ElTable :data="filteredExceptions" class="cso-table" height="430">
          <ElTableColumn prop="id" label="异常编号" width="145" />
          <ElTableColumn label="终端 / 产品" min-width="220">
            <template #default="scope"
              ><div class="terminal-cell"
                ><strong>{{ scope.row.terminal }}</strong
                ><small>{{ scope.row.product }} · {{ scope.row.date }}</small></div
              ></template
            >
          </ElTableColumn>
          <ElTableColumn prop="type" label="异常类型" width="120" />
          <ElTableColumn label="数量 / 金额" width="120" align="right"
            ><template #default="scope"
              ><div class="number-cell"
                ><strong>{{ scope.row.quantity }}</strong
                ><small>{{ formatCurrency(scope.row.amount) }}</small></div
              ></template
            ></ElTableColumn
          >
          <ElTableColumn label="状态" width="90" align="center"
            ><template #default="scope"
              ><span :class="['cso-badge', statusTone(scope.row.status)]">{{
                scope.row.status
              }}</span></template
            ></ElTableColumn
          >
          <ElTableColumn label="操作" width="88" fixed="right"
            ><template #default="scope"
              ><ElButton
                link
                type="primary"
                :disabled="scope.row.status === '已处理'"
                @click="openResolve(scope.row)"
                >处理</ElButton
              ></template
            ></ElTableColumn
          >
        </ElTable>
      </section>

      <aside class="right-stack">
        <section class="cso-panel">
          <div class="cso-panel__header"
            ><span class="cso-panel__title">批次与版本</span
            ><ElButton link type="primary" @click="ElMessage.info('已展示版本历史')"
              >版本历史</ElButton
            ></div
          >
          <div class="batch-list">
            <article v-for="batch in batches" :key="batch.id">
              <span :class="['batch-icon', `batch-icon--${batch.tone}`]"
                ><ArtSvgIcon :icon="batch.icon"
              /></span>
              <div
                ><strong>{{ batch.id }}</strong
                ><small>{{ batch.source }} · {{ batch.rows }}条</small></div
              >
              <span :class="['cso-badge', `cso-badge--${batch.tone}`]">{{ batch.status }}</span>
            </article>
          </div>
        </section>
        <section class="cso-panel lock-panel">
          <div class="lock-icon"><ArtSvgIcon icon="ri:lock-2-line" /></div>
          <h3>经营事实锁定</h3>
          <p>当前批次仍有3项异常未处理，暂不可生成最终Locked Sales版本。</p>
          <ElProgress :percentage="92" :stroke-width="8" color="#2a9b65" />
          <ElButton type="primary" :disabled="true">确认并锁定 Version 4</ElButton>
          <small>锁定后将触发返利重算；操作不可直接回退。</small>
        </section>
      </aside>
    </div>

    <section class="cso-panel audit-panel">
      <div class="cso-panel__header"
        ><span class="cso-panel__title">版本与审计轨迹</span
        ><span class="cso-panel__note"
          >Raw → Auto Result → Manual Adjustment → Final Result</span
        ></div
      >
      <div class="audit-flow">
        <template v-for="(item, index) in auditFlow" :key="item.title">
          <article
            ><span>{{ item.version }}</span
            ><strong>{{ item.title }}</strong
            ><small>{{ item.detail }}</small
            ><p>{{ item.time }}</p></article
          >
          <ArtSvgIcon v-if="index < auditFlow.length - 1" icon="ri:arrow-right-line" />
        </template>
      </div>
    </section>

    <ElDrawer v-model="resolveVisible" title="处理DDI异常" size="520px">
      <div v-if="selectedException" class="resolve-drawer">
        <ElAlert
          :title="selectedException.type"
          :description="selectedException.reason"
          type="warning"
          :closable="false"
          show-icon
        />
        <div class="source-record">
          <div
            ><span>异常编号</span><strong>{{ selectedException.id }}</strong></div
          ><div
            ><span>终端</span><strong>{{ selectedException.terminal }}</strong></div
          ><div
            ><span>产品</span><strong>{{ selectedException.product }}</strong></div
          ><div
            ><span>数量 / 金额</span
            ><strong
              >{{ selectedException.quantity }} /
              {{ formatCurrency(selectedException.amount) }}</strong
            ></div
          >
        </div>
        <ElForm label-position="top" :model="resolveForm">
          <ElFormItem label="处理动作"
            ><ElRadioGroup v-model="resolveForm.action"
              ><ElRadioButton value="manual">人工指定归属</ElRadioButton
              ><ElRadioButton value="master">补充主数据映射</ElRadioButton
              ><ElRadioButton value="reject">剔除异常记录</ElRadioButton></ElRadioGroup
            ></ElFormItem
          >
          <ElFormItem label="归属CSO"
            ><ElSelect v-model="resolveForm.cso" filterable class="w-full"
              ><ElOption label="上海XX医药推广有限公司" value="上海XX医药推广有限公司" /><ElOption
                label="杭州XX市场服务有限公司"
                value="杭州XX市场服务有限公司" /><ElOption
                label="成都XX健康管理有限公司"
                value="成都XX健康管理有限公司" /></ElSelect
          ></ElFormItem>
          <ElFormItem label="处理原因（必填）"
            ><ElInput
              v-model="resolveForm.reason"
              type="textarea"
              :rows="4"
              placeholder="说明谁改、为什么改、依据什么改"
          /></ElFormItem>
          <ElFormItem label="依据附件"
            ><ElUpload drag action="#" :auto-upload="false" class="w-full"
              ><ArtSvgIcon icon="ri:upload-cloud-2-line" class="text-2xl" /><div
                class="el-upload__text"
                >拖入或点击上传合同、审批记录等依据</div
              ></ElUpload
            ></ElFormItem
          >
        </ElForm>
        <div class="version-note"
          ><ArtSvgIcon icon="ri:history-line" /><span
            >提交后将生成新的归属结果版本，并记录操作人、时间、原因和附件哈希。</span
          ></div
        >
      </div>
      <template #footer
        ><ElButton @click="resolveVisible = false">取消</ElButton
        ><ElButton type="primary" @click="submitResolve">提交处理结果</ElButton></template
      >
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { computed, reactive, ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { ddiExceptions, formatCurrency } from '../mock'

  defineOptions({ name: 'CsoDdi' })
  const keyword = ref('')
  const exceptionType = ref('全部')
  const exceptionStatus = ref('全部')
  const resolveVisible = ref(false)
  const exceptionRows = ref(ddiExceptions.map((item) => ({ ...item })))
  const selectedException = ref<(typeof ddiExceptions)[number] | null>(null)
  const resolveForm = reactive({ action: 'manual', cso: '', reason: '' })

  const pipeline = [
    { label: '接入', detail: '原始值保留', count: '128,462', state: 'done' },
    { label: '校验', detail: '格式 / 必填', count: '127,936', state: 'done' },
    { label: '标准化', detail: '产品 / 终端', count: '127,521', state: 'done' },
    { label: '主数据匹配', detail: '编码映射', count: '126,804', state: 'done' },
    { label: '合作归属', detail: '有效关系', count: '125,170', state: 'active' },
    { label: '确认', detail: 'CSO异议', count: '118,426', state: 'pending' },
    { label: '锁定', detail: '事实版本', count: '12,284', state: 'pending' }
  ]
  const stats = [
    { label: '本月接入数据', value: '128,462', note: '3个第三方源 + 1个应急通道' },
    { label: '自动归属成功', value: '125,170', note: '自动归属率 98.7%' },
    { label: '异常池', value: '18', note: '影响金额 ¥ 374,000' },
    { label: '已锁定事实', value: '12,284', note: 'Version 3 · 2026-08-15' }
  ]
  const exceptionTypes = [...new Set(ddiExceptions.map((item) => item.type))]
  const batches = [
    {
      id: 'BATCH-0820-01',
      source: '第三方DDI-华东',
      rows: '52,681',
      status: '已处理',
      tone: 'success',
      icon: 'ri:checkbox-circle-line'
    },
    {
      id: 'BATCH-0820-02',
      source: '第三方DDI-华南',
      rows: '44,206',
      status: '已处理',
      tone: 'success',
      icon: 'ri:checkbox-circle-line'
    },
    {
      id: 'BATCH-0820-03',
      source: '第三方DDI-西南',
      rows: '30,941',
      status: '处理中',
      tone: 'primary',
      icon: 'ri:loader-4-line'
    },
    {
      id: 'BATCH-0820-04',
      source: '应急补录',
      rows: '634',
      status: '待比对',
      tone: 'warning',
      icon: 'ri:alarm-warning-line'
    }
  ]
  const auditFlow = [
    {
      version: 'RAW',
      title: '原始数据',
      detail: '不可覆盖 · 来源可追溯',
      time: '2026-08-20 18:00'
    },
    {
      version: 'AUTO V1',
      title: '自动匹配结果',
      detail: '规则版本 Match-2026.08',
      time: '2026-08-20 18:12'
    },
    {
      version: 'ADJ V2',
      title: '人工调整',
      detail: '4条 · 附件与原因完整',
      time: '2026-08-20 19:36'
    },
    {
      version: 'FINAL V3',
      title: '已确认事实',
      detail: 'CSO确认 · 已锁定',
      time: '2026-08-15 23:59'
    }
  ]

  const filteredExceptions = computed(() =>
    exceptionRows.value.filter((item) => {
      const matchesKeyword =
        !keyword.value ||
        `${item.id}${item.terminal}`.toLowerCase().includes(keyword.value.toLowerCase())
      const matchesType = exceptionType.value === '全部' || item.type === exceptionType.value
      const matchesStatus =
        exceptionStatus.value === '全部' || item.status === exceptionStatus.value
      return matchesKeyword && matchesType && matchesStatus
    })
  )
  const statusTone = (value: string) =>
    value === '待处理'
      ? 'cso-badge--danger'
      : value === '处理中'
        ? 'cso-badge--warning'
        : 'cso-badge--success'
  const openResolve = (row: (typeof ddiExceptions)[number]) => {
    selectedException.value = row
    resolveForm.cso = row.suggestedCso === '待确认' ? '' : row.suggestedCso
    resolveForm.reason = ''
    resolveVisible.value = true
  }
  const submitResolve = () => {
    if (!resolveForm.reason.trim()) {
      ElMessage.warning('请填写处理原因')
      return
    }
    const row = exceptionRows.value.find((item) => item.id === selectedException.value?.id)
    if (row) row.status = '已处理'
    resolveVisible.value = false
    ElMessage.success('处理结果已保存，并生成新的归属版本')
  }
</script>

<style lang="scss" scoped>
  @use '../shared';

  .pipeline-panel {
    padding: 18px;
    margin-bottom: 18px;
  }

  .pipeline-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
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

  .pipeline {
    display: flex;
    align-items: stretch;
  }

  .pipeline-step {
    display: grid;
    flex: 1;
    grid-template-columns: 28px minmax(78px, 1fr);
    gap: 8px;
    align-items: center;
    min-height: 68px;
    padding: 9px;
    border: 1px solid var(--cso-line);
    border-radius: 9px;
  }

  .pipeline-step--done {
    background: #f5fcf8;
    border-color: #b8dfcf;
  }

  .pipeline-step--active {
    background: #f2f7ff;
    border-color: #94bdf4;
    box-shadow: inset 0 -3px var(--cso-blue);
  }

  .pipeline-step--pending {
    background: #fafbfc;
  }

  .step-no {
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

  .pipeline-step--done .step-no {
    color: var(--cso-green);
    background: var(--cso-green-soft);
  }

  .pipeline-step strong,
  .pipeline-step small {
    display: block;
  }

  .pipeline-step strong {
    font-size: 12px;
  }

  .pipeline-step small {
    margin-top: 4px;
    font-size: 11px;
    color: var(--cso-muted);
  }

  .step-count {
    grid-column: 2;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .pipeline-arrow {
    flex: 0 0 20px;
    align-self: center;
    color: #aab6c5;
  }

  .pipeline-foot {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    padding-top: 15px;
    margin-top: 16px;
    font-size: 12px;
    color: var(--cso-muted);
    border-top: 1px solid var(--cso-line);
  }

  .pipeline-foot span {
    display: inline-flex;
    gap: 5px;
    align-items: center;
  }

  .ddi-stats {
    margin-bottom: 18px;
  }

  .ddi-value {
    display: block;
    margin: 13px 0 10px;
    font-size: 24px;
  }

  .ddi-stats small {
    font-size: 12px;
    color: var(--cso-muted);
  }

  .table-filters {
    display: flex;
    gap: 10px;
    padding: 12px 16px;
  }

  .terminal-cell strong,
  .terminal-cell small,
  .number-cell strong,
  .number-cell small {
    display: block;
  }

  .terminal-cell strong,
  .number-cell strong {
    font-size: 12px;
  }

  .terminal-cell small,
  .number-cell small {
    margin-top: 4px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .right-stack {
    display: grid;
    gap: 18px;
  }

  .batch-list {
    padding: 8px 15px;
  }

  .batch-list article {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid var(--cso-line);
  }

  .batch-list article:last-child {
    border-bottom: 0;
  }

  .batch-icon {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 9px;
  }

  .batch-icon--success {
    color: var(--cso-green);
    background: var(--cso-green-soft);
  }

  .batch-icon--primary {
    color: var(--cso-blue);
    background: var(--cso-blue-soft);
  }

  .batch-icon--warning {
    color: var(--cso-orange);
    background: var(--cso-orange-soft);
  }

  .batch-list article div {
    flex: 1;
  }

  .batch-list strong,
  .batch-list small {
    display: block;
  }

  .batch-list strong {
    font-size: 12px;
  }

  .batch-list small {
    margin-top: 4px;
    font-size: 11px;
    color: var(--cso-muted);
  }

  .lock-panel {
    padding: 22px;
    text-align: center;
  }

  .lock-icon {
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    margin: 0 auto;
    font-size: 24px;
    color: var(--cso-green);
    background: var(--cso-green-soft);
    border-radius: 50%;
  }

  .lock-panel h3 {
    margin: 12px 0 6px;
    font-size: 15px;
  }

  .lock-panel p {
    margin: 0 0 16px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--cso-muted);
  }

  .lock-panel :deep(.el-button) {
    width: 100%;
    margin-top: 18px;
  }

  .lock-panel small {
    display: block;
    margin-top: 9px;
    font-size: 11px;
    color: var(--cso-muted);
  }

  .audit-panel {
    margin-bottom: 18px;
  }

  .audit-flow {
    display: flex;
    align-items: center;
    padding: 20px;
  }

  .audit-flow article {
    flex: 1;
    min-height: 104px;
    padding: 14px;
    border: 1px solid var(--cso-line);
    border-radius: 10px;
  }

  .audit-flow > :deep(svg) {
    flex: 0 0 30px;
    color: #aab6c5;
  }

  .audit-flow article > span {
    font-size: 12px;
    font-weight: 750;
    color: var(--cso-blue);
  }

  .audit-flow strong,
  .audit-flow small,
  .audit-flow p {
    display: block;
  }

  .audit-flow strong {
    margin-top: 8px;
    font-size: 12px;
  }

  .audit-flow small {
    margin-top: 5px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .audit-flow p {
    margin: 10px 0 0;
    font-size: 11px;
    color: #8794a5;
  }

  .resolve-drawer {
    padding: 0 8px;
  }

  .source-record {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    padding: 16px;
    margin: 16px 0;
    background: #f6f8fb;
    border-radius: 10px;
  }

  .source-record span,
  .source-record strong {
    display: block;
  }

  .source-record span {
    font-size: 12px;
    color: var(--cso-muted);
  }

  .source-record strong {
    margin-top: 5px;
    font-size: 12px;
  }

  .version-note {
    display: flex;
    gap: 8px;
    padding: 12px;
    font-size: 12px;
    line-height: 1.6;
    color: #75530d;
    background: var(--cso-orange-soft);
    border-radius: 8px;
  }

  @media (width <= 1080px) {
    .pipeline {
      overflow-x: auto;
    }

    .pipeline-step {
      min-width: 135px;
    }
  }

  @media (width <= 720px) {
    .pipeline-top,
    .table-filters,
    .audit-flow {
      flex-direction: column;
      align-items: stretch;
    }

    .audit-flow > :deep(svg) {
      transform: rotate(90deg);
    }
  }
</style>
