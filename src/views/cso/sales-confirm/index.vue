<template>
  <div class="cso-page">
    <header class="cso-page-header">
      <div>
        <div class="cso-eyebrow">SALES CONFIRMATION</div>
        <h1 class="cso-title">销量确认与异议</h1>
        <p class="cso-subtitle"
          >月度销量在线确认、截止自动锁定;异议按产品线申诉、BU隔离审批,成立后更正数据并触发重算。</p
        >
      </div>
      <ElButton type="primary" @click="ElMessage.success('2026-08 确认任务已批量推送至CSO')">
        <ArtSvgIcon icon="ri:send-plane-line" class="mr-1" />推送确认任务
      </ElButton>
    </header>

    <div class="cso-grid-equal track-grid">
      <section class="cso-panel track-panel">
        <div class="cso-panel__header">
          <div>
            <span class="cso-panel__title">常态 · 确认主线</span>
            <span class="cso-panel__note">大部分销量走这里</span>
          </div>
          <span class="cso-badge cso-badge--success">8月进度 3 / 5</span>
        </div>
        <div class="track-flow">
          <template v-for="(step, index) in normalTrack" :key="step.title">
            <article :class="{ done: index < 3, current: index === 3 }">
              <span>{{ index + 1 }}</span>
              <div
                ><strong>{{ step.title }}</strong
                ><small>{{ step.detail }}</small></div
              >
            </article>
            <ArtSvgIcon v-if="index < normalTrack.length - 1" icon="ri:arrow-right-line" />
          </template>
        </div>
      </section>

      <section class="cso-panel track-panel track-panel--dispute">
        <div class="cso-panel__header">
          <div>
            <span class="cso-panel__title">例外 · 异议通道</span>
            <span class="cso-panel__note">少量销量走这里</span>
          </div>
          <span class="cso-badge cso-badge--warning">1 项复核中</span>
        </div>
        <div class="track-flow">
          <template v-for="(step, index) in disputeTrack" :key="step.title">
            <article :class="{ done: index < 1, current: index === 1 }">
              <span>{{ index + 1 }}</span>
              <div
                ><strong>{{ step.title }}</strong
                ><small>{{ step.detail }}</small></div
              >
            </article>
            <ArtSvgIcon v-if="index < disputeTrack.length - 1" icon="ri:arrow-right-line" />
          </template>
        </div>
      </section>
    </div>

    <section class="cso-panel">
      <div class="cso-panel__header">
        <div>
          <span class="cso-panel__title">月度确认任务</span>
          <span class="cso-panel__note">按 CSO × BU 生成 · 逾期未确认自动锁定</span>
        </div>
        <span class="table-note">锁定后数据不可改 · 进入返利计算的唯一依据</span>
      </div>
      <ElTable :data="confirmTasks" class="cso-table" style="width: 100%">
        <ElTableColumn label="CSO / BU" min-width="250">
          <template #default="scope">
            <div class="task-cell"
              ><strong>{{ scope.row.cso }}</strong
              ><small>{{ scope.row.bu }} · {{ scope.row.month }}</small></div
            >
          </template>
        </ElTableColumn>
        <ElTableColumn prop="records" label="流向明细" width="95" align="center" />
        <ElTableColumn label="归属金额" width="130" align="right">
          <template #default="scope"
            ><strong>{{ formatCurrency(scope.row.amount) }}</strong></template
          >
        </ElTableColumn>
        <ElTableColumn label="状态" width="100" align="center">
          <template #default="scope">
            <span :class="['cso-badge', taskTone(scope.row.status)]">{{ scope.row.status }}</span>
          </template>
        </ElTableColumn>
        <ElTableColumn prop="deadline" label="确认截止" width="120" align="center" />
        <ElTableColumn label="操作" width="230" fixed="right" align="center">
          <template #default="scope">
            <ElButton link type="primary" @click="openRecords(scope.row)">查看明细</ElButton>
            <ElButton
              v-if="scope.row.status === '待确认'"
              link
              type="primary"
              @click="confirmTask(scope.row)"
              >在线确认</ElButton
            >
            <ElButton
              v-if="scope.row.status !== '已锁定'"
              link
              type="warning"
              @click="openDisputeCreate(scope.row)"
              >发起异议</ElButton
            >
          </template>
        </ElTableColumn>
      </ElTable>
    </section>

    <div class="cso-grid-2 dispute-layout">
      <section class="cso-panel">
        <div class="cso-panel__header">
          <div>
            <span class="cso-panel__title">异议清单</span>
            <span class="cso-panel__note">申诉需指定产品线 · 审批权限按BU隔离</span>
          </div>
          <span class="view-hint">点击编号查看异议处理卡</span>
        </div>
        <ElTable :data="disputes" class="cso-table" style="width: 100%">
          <ElTableColumn label="异议编号" width="160" fixed>
            <template #default="scope">
              <span class="cso-link" @click="openDispute(scope.row)">{{ scope.row.id }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn label="CSO / 产品线" min-width="220">
            <template #default="scope">
              <div class="task-cell"
                ><strong>{{ scope.row.cso }}</strong
                ><small
                  >{{ scope.row.bu }} · {{ scope.row.product }} · {{ scope.row.type }}</small
                ></div
              >
            </template>
          </ElTableColumn>
          <ElTableColumn label="数量 / 金额" width="125" align="right">
            <template #default="scope">
              <div class="number-cell"
                ><strong>{{ scope.row.qty }} 盒</strong
                ><small>{{ formatCurrency(scope.row.amount) }}</small></div
              >
            </template>
          </ElTableColumn>
          <ElTableColumn label="状态" width="110" align="center">
            <template #default="scope">
              <span :class="['cso-badge', disputeTone(scope.row.status)]">{{
                scope.row.status
              }}</span>
            </template>
          </ElTableColumn>
        </ElTable>
      </section>

      <section class="cso-panel rule-panel">
        <div class="cso-panel__header"><span class="cso-panel__title">锁定与重算规则</span></div>
        <div class="lock-rules">
          <article v-for="rule in lockRules" :key="rule.title">
            <span :class="['rule-icon', `rule-icon--${rule.tone}`]"
              ><ArtSvgIcon :icon="rule.icon"
            /></span>
            <div
              ><strong>{{ rule.title }}</strong
              ><small>{{ rule.detail }}</small></div
            >
          </article>
        </div>
        <div class="chain-note">
          <ArtSvgIcon icon="ri:links-line" />
          <span
            >异议成立 → 更正归属 → 重新锁定 → 触发返利重算 → 差异留痕,全链路联动 DDI
            工作台与返利计算。</span
          >
        </div>
      </section>
    </div>

    <ElDrawer v-model="recordsVisible" title="销量明细" size="640px">
      <div v-if="selectedTask" class="records-drawer">
        <div class="records-head">
          <strong>{{ selectedTask.cso }}</strong>
          <span
            >{{ selectedTask.bu }} · {{ selectedTask.month }} · {{ selectedTask.records }} 条 ·
            {{ formatCurrency(selectedTask.amount) }}</span
          >
        </div>
        <ElTable :data="salesRecords" class="cso-table" size="small">
          <ElTableColumn prop="date" label="日期" width="90" />
          <ElTableColumn prop="terminal" label="终端" min-width="140" />
          <ElTableColumn prop="product" label="产品线" width="95" />
          <ElTableColumn prop="qty" label="数量" width="70" align="right" />
          <ElTableColumn label="金额" width="100" align="right">
            <template #default="scope">{{ formatCurrency(scope.row.amount) }}</template>
          </ElTableColumn>
          <ElTableColumn label="置信度" width="80" align="center">
            <template #default="scope">
              <span
                :class="[
                  'cso-badge',
                  scope.row.confidence === '高' ? 'cso-badge--success' : 'cso-badge--warning'
                ]"
                >{{ scope.row.confidence }}</span
              >
            </template>
          </ElTableColumn>
        </ElTable>
        <ElAlert
          title="明细级确认:可逐条勾选或批量确认;确认后进入锁定流程。"
          type="info"
          :closable="false"
          show-icon
          class="mt-4"
        />
      </div>
      <template #footer>
        <ElButton @click="recordsVisible = false">关闭</ElButton>
        <ElButton
          v-if="selectedTask?.status === '待确认'"
          type="primary"
          @click="confirmTask(selectedTask!)"
          >批量确认全部明细</ElButton
        >
      </template>
    </ElDrawer>

    <ElDrawer v-model="disputeVisible" title="异议处理卡" size="560px">
      <div v-if="selectedDispute" class="dispute-card">
        <div class="dispute-cover">
          <span>DIS</span>
          <strong
            >{{ selectedDispute.type }} · {{ selectedDispute.product }} ·
            {{ selectedDispute.terminal }}</strong
          >
          <small
            >{{ selectedDispute.qty }} 盒 · {{ formatCurrency(selectedDispute.amount) }} ·
            {{ selectedDispute.cso }}</small
          >
          <div class="dispute-cover__badges">
            <span class="cso-badge cso-badge--warning">{{ selectedDispute.status }}</span>
          </div>
        </div>

        <div class="cso-section-label">异议信息</div>
        <dl class="cso-kv-grid two-cols">
          <div class="cso-kv"
            ><dt>异议原因</dt><dd>{{ selectedDispute.reason }}</dd></div
          >
          <div class="cso-kv"
            ><dt>期望结果</dt><dd>{{ selectedDispute.expectation }}</dd></div
          >
        </dl>
        <div class="material-row">
          <span>证明材料({{ selectedDispute.materials.length }})</span>
          <article v-for="item in selectedDispute.materials" :key="item">
            <ArtSvgIcon icon="ri:attachment-2" />{{ item }}
          </article>
          <small>证明材料进入证据管线复核</small>
        </div>

        <div class="cso-section-label">复核裁决 · 按BU隔离审批</div>
        <div class="verdict">
          <div
            ><span>复核人</span><strong>{{ selectedDispute.reviewer }}</strong></div
          >
          <div
            ><span>复核结论</span
            ><strong
              >{{ selectedDispute.conclusion
              }}<template v-if="selectedDispute.conclusionDate">
                · {{ selectedDispute.conclusionDate }}</template
              ></strong
            ></div
          >
          <p>{{ selectedDispute.opinion }}</p>
        </div>

        <div class="cso-section-label">状态跟踪</div>
        <ElTimeline class="dispute-timeline">
          <ElTimelineItem
            v-for="(item, index) in selectedDispute.timeline"
            :key="index"
            :timestamp="item.date"
            :type="index === selectedDispute.timeline.length - 1 ? 'primary' : 'success'"
          >
            {{ item.title }}
          </ElTimelineItem>
          <ElTimelineItem timestamp="—" type="info"
            >锁定 → 进入返利计算(异议成立路径)</ElTimelineItem
          >
        </ElTimeline>
      </div>
      <template #footer>
        <ElButton @click="disputeVisible = false">关闭</ElButton>
        <ElButton
          type="primary"
          @click="ElMessage.success('裁决意见已提交:成立将更正归属并触发返利重算')"
          >提交裁决</ElButton
        >
      </template>
    </ElDrawer>

    <ElDialog v-model="disputeCreateVisible" title="发起销量异议" width="520px">
      <ElAlert
        title="异议需指定产品线;证明材料进入证据管线,与Evidence审核联动。"
        type="info"
        :closable="false"
        show-icon
        class="mb-4"
      />
      <ElForm label-position="top" :model="disputeForm">
        <ElFormItem label="产品线">
          <ElSelect v-model="disputeForm.product" class="w-full">
            <ElOption
              v-for="item in ['Product A', 'Product B', 'Product C', 'Product X']"
              :key="item"
              :label="item"
              :value="item"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="异议类型">
          <ElSelect v-model="disputeForm.type" class="w-full">
            <ElOption label="归属异议" value="归属异议" />
            <ElOption label="数量异议" value="数量异议" />
            <ElOption label="金额异议" value="金额异议" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="原因与期望结果">
          <ElInput
            v-model="disputeForm.reason"
            type="textarea"
            :rows="3"
            placeholder="说明异议原因、期望的处理结果"
          />
        </ElFormItem>
        <ElFormItem label="证明材料">
          <ElUpload drag action="#" :auto-upload="false" class="w-full">
            <ArtSvgIcon icon="ri:upload-cloud-2-line" class="text-2xl" />
            <div class="el-upload__text">合同补充协议、往来记录、终端单据等</div>
          </ElUpload>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="disputeCreateVisible = false">取消</ElButton>
        <ElButton type="primary" @click="submitDisputeCreate">提交异议</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { reactive, ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import {
    confirmTasks,
    disputes,
    formatCurrency,
    salesRecords,
    type ConfirmTask,
    type DisputeRecord
  } from '../mock'

  defineOptions({ name: 'CsoSalesConfirm' })

  const taskRows = ref(confirmTasks.map((item) => ({ ...item })))
  const recordsVisible = ref(false)
  const disputeVisible = ref(false)
  const disputeCreateVisible = ref(false)
  const selectedTask = ref<ConfirmTask | null>(null)
  const selectedDispute = ref<DisputeRecord | null>(null)
  const disputeForm = reactive({ product: 'Product A', type: '归属异议', reason: '' })

  const normalTrack = [
    { title: '按月生成确认任务', detail: '待确认销量 · 推送通知' },
    { title: '查看销量明细', detail: '多维查看 · 支持导出' },
    { title: 'CSO在线确认', detail: '明细级 / 批量确认' },
    { title: '截止锁定', detail: '逾期自动锁定 · 不可改' },
    { title: '进入返利计算', detail: '锁定销量为唯一依据' }
  ]
  const disputeTrack = [
    { title: '发起异议', detail: '指定产品线 · 选择类型' },
    { title: '填写异议信息', detail: '原因 · 期望 · 证明材料' },
    { title: '复核裁决', detail: 'BU隔离审批 · 上游核实' },
    { title: '复核结果', detail: '成立:更正+重算 / 维持' },
    { title: '重新确认', detail: 'CSO确认处理结果' }
  ]
  const lockRules = [
    {
      title: '确认即锁定',
      detail: 'CSO确认月度销量后数据锁定,锁定后进入返利计算流程',
      icon: 'ri:lock-2-line',
      tone: 'primary'
    },
    {
      title: '逾期自动锁定',
      detail: '截止时间未确认,系统自动锁定并通知CSO',
      icon: 'ri:timer-2-line',
      tone: 'warning'
    },
    {
      title: '异议触发重算',
      detail: '异议成立更正数据后,自动触发对应产品线返利重算',
      icon: 'ri:refresh-line',
      tone: 'green'
    },
    {
      title: '销量归属到代表(合规)',
      detail: '记录代表贡献明细,仅用于业绩追踪与合规追溯',
      icon: 'ri:user-follow-line',
      tone: 'teal'
    }
  ]

  const taskTone = (value: string) =>
    value === '已锁定'
      ? 'cso-badge--success'
      : value === '已确认'
        ? 'cso-badge--primary'
        : value === '异议中'
          ? 'cso-badge--warning'
          : 'cso-badge--danger'
  const disputeTone = (value: string) =>
    value === '已关闭'
      ? 'cso-badge--info'
      : value === '复核中'
        ? 'cso-badge--warning'
        : 'cso-badge--primary'
  const openRecords = (row: ConfirmTask) => {
    selectedTask.value = row
    recordsVisible.value = true
  }
  const confirmTask = (row: ConfirmTask) => {
    const target = taskRows.value.find((item) => item.cso === row.cso && item.month === row.month)
    if (target) target.status = '已确认'
    recordsVisible.value = false
    ElMessage.success('销量已确认,到达截止时间后自动锁定并进入返利计算')
  }
  const openDispute = (row: DisputeRecord) => {
    selectedDispute.value = row
    disputeVisible.value = true
  }
  const openDisputeCreate = (row: ConfirmTask) => {
    selectedTask.value = row
    disputeForm.product = row.bu === 'BU A' ? 'Product A' : 'Product C'
    disputeCreateVisible.value = true
  }
  const submitDisputeCreate = () => {
    disputeCreateVisible.value = false
    ElMessage.success('异议已提交,进入BU隔离审批链;状态可实时跟踪')
  }
</script>

<style lang="scss" scoped>
  @use '../shared';

  .track-grid {
    margin-bottom: 18px;
  }

  .track-panel--dispute :deep(.el-tabs__header) {
    display: none;
  }

  .track-flow {
    display: flex;
    gap: 3px;
    align-items: stretch;
    padding: 16px;
  }

  .track-flow article {
    display: flex;
    flex: 1;
    gap: 9px;
    align-items: center;
    min-height: 62px;
    padding: 9px;
    background: #fafbfc;
    border: 1px solid var(--cso-line);
    border-radius: 9px;
  }

  .track-flow article.done {
    background: #f5fcf8;
    border-color: #cdeadc;
  }

  .track-flow article.current {
    background: #f2f7ff;
    border-color: #94bdf4;
    box-shadow: inset 0 -3px var(--cso-blue);
  }

  .track-flow article > span {
    display: grid;
    flex: 0 0 24px;
    place-items: center;
    width: 24px;
    height: 24px;
    font-size: 12px;
    font-weight: 700;
    color: var(--cso-blue);
    background: var(--cso-blue-soft);
    border-radius: 50%;
  }

  .track-flow article.done > span {
    color: var(--cso-green);
    background: var(--cso-green-soft);
  }

  .track-flow strong {
    display: block;
    font-size: 12px;
  }

  .track-flow small {
    display: block;
    margin-top: 3px;
    font-size: 11px;
    color: var(--cso-muted);
  }

  .track-flow > svg {
    flex: 0 0 18px;
    align-self: center;
    color: #aab6c5;
  }

  .table-note {
    font-size: 12px;
    color: var(--cso-muted);
  }

  .cso-table :deep(.el-button + .el-button) {
    margin-left: 4px;
  }

  .cso-table :deep(.el-button.is-link) {
    padding: 2px 4px;
  }

  .task-cell strong {
    display: block;
    font-size: 13px;
  }

  .task-cell small {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .number-cell strong,
  .number-cell small {
    display: block;
  }

  .number-cell small {
    margin-top: 3px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .view-hint {
    font-size: 12px;
    color: var(--cso-muted);
  }

  .dispute-layout {
    align-items: start;
  }

  .lock-rules {
    display: grid;
    gap: 10px;
    padding: 14px 15px;
  }

  .lock-rules article {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .rule-icon {
    display: grid;
    flex: 0 0 30px;
    place-items: center;
    width: 30px;
    height: 30px;
    border-radius: 8px;
  }

  .rule-icon--primary {
    color: var(--cso-blue);
    background: var(--cso-blue-soft);
  }

  .rule-icon--warning {
    color: var(--cso-orange);
    background: var(--cso-orange-soft);
  }

  .rule-icon--green {
    color: var(--cso-green);
    background: var(--cso-green-soft);
  }

  .rule-icon--teal {
    color: var(--cso-teal);
    background: var(--cso-teal-soft);
  }

  .lock-rules strong {
    display: block;
    font-size: 13px;
  }

  .lock-rules small {
    display: block;
    margin-top: 3px;
    font-size: 12px;
    line-height: 1.55;
    color: var(--cso-muted);
  }

  .chain-note {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 12px 15px;
    font-size: 12px;
    line-height: 1.6;
    color: #51617a;
    background: #f4f7fb;
    border-top: 1px solid var(--cso-line);
  }

  .chain-note svg {
    flex: 0 0 16px;
    color: var(--cso-blue);
  }

  .records-drawer .records-head {
    display: flex;
    gap: 12px;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  .records-head strong {
    font-size: 15px;
  }

  .records-head span {
    font-size: 12px;
    color: var(--cso-muted);
  }

  .dispute-card {
    padding: 0 2px;
  }

  .dispute-cover {
    padding: 18px;
    margin-bottom: 18px;
    color: #fff;
    background: linear-gradient(135deg, #6b4a0a, #b07714);
    border-radius: 12px;
  }

  .dispute-cover span {
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.16em;
    opacity: 0.75;
  }

  .dispute-cover strong {
    display: block;
    margin-top: 6px;
    font-size: 16px;
    line-height: 1.45;
  }

  .dispute-cover small {
    display: block;
    margin-top: 5px;
    font-size: 12px;
    opacity: 0.85;
  }

  .dispute-cover__badges {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }

  .dispute-cover__badges .cso-badge {
    color: #fff;
    background: rgb(255 255 255 / 20%);
  }

  .material-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin: 12px 0 4px;
  }

  .material-row > span {
    font-size: 12px;
    color: var(--cso-muted);
  }

  .material-row article {
    display: inline-flex;
    gap: 5px;
    align-items: center;
    padding: 5px 9px;
    font-size: 12px;
    color: #135abd;
    background: var(--cso-blue-soft);
    border-radius: 6px;
  }

  .material-row article svg {
    font-size: 13px;
  }

  .material-row small {
    width: 100%;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .verdict {
    padding: 14px;
    background: #f7f9fc;
    border-radius: 10px;
  }

  .verdict div {
    display: flex;
    gap: 10px;
    align-items: baseline;
  }

  .verdict div + div {
    margin-top: 9px;
  }

  .verdict span {
    font-size: 12px;
    color: var(--cso-muted);
  }

  .verdict strong {
    font-size: 13px;
  }

  .verdict p {
    margin: 10px 0 0;
    font-size: 12px;
    line-height: 1.6;
    color: #51617a;
  }

  @media (width <= 1180px) {
    .dispute-layout {
      grid-template-columns: 1fr;
    }
  }

  @media (width <= 1080px) {
    .track-flow {
      overflow-x: auto;
    }

    .track-flow article {
      min-width: 190px;
    }
  }
</style>
