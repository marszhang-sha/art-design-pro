<template>
  <div class="cso-page">
    <header class="cso-page-header">
      <div>
        <div class="cso-eyebrow">REPRESENTATIVE GOVERNANCE</div>
        <h1 class="cso-title">代表管理</h1>
        <p class="cso-subtitle">
          代表信息用于备案、资质与合规管理:学历真实性核验、医药代表备案、黑名单跨代理商拦截——不设置代表销量KPI或销售排名。
        </p>
      </div>
      <ElButton type="primary" @click="ElMessage.success('已通知CSO上传新增代表信息')">
        <ArtSvgIcon icon="ri:user-add-line" class="mr-1" />新增代表
      </ElButton>
    </header>

    <ElAlert
      title="合规红线:严禁向医药代表分配药品销售任务,严禁统计医生处方,严禁任何形式的统方。"
      type="warning"
      :closable="false"
      show-icon
      class="mb-4 redline-alert"
    />

    <section class="cso-stat-grid">
      <div v-for="item in stats" :key="item.label" class="cso-stat-card rep-stat">
        <span :class="['rep-icon', `rep-icon--${item.tone}`]"
          ><ArtSvgIcon :icon="item.icon"
        /></span>
        <div class="stat-copy">
          <span class="cso-stat-label">{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small>{{ item.note }}</small>
        </div>
      </div>
    </section>

    <div class="cso-filter-bar">
      <ElInput v-model="keyword" clearable placeholder="搜索姓名 / CSO" style="width: 230px">
        <template #prefix><ArtSvgIcon icon="ri:search-line" /></template>
      </ElInput>
      <ElSelect v-model="verifyFilter" style="width: 140px">
        <ElOption label="全部核验状态" value="全部" />
        <ElOption label="待核验" value="待核验" />
        <ElOption label="通过" value="通过" />
        <ElOption label="不通过" value="不通过" />
      </ElSelect>
      <ElSelect v-model="filingFilter" style="width: 140px">
        <ElOption label="全部备案状态" value="全部" />
        <ElOption label="已备案" value="已备案" />
        <ElOption label="待备案" value="待备案" />
        <ElOption label="备案过期" value="备案过期" />
      </ElSelect>
      <ElSelect v-model="cohortFilter" style="width: 135px">
        <ElOption label="存量+新增" value="全部" />
        <ElOption label="存量代表" value="存量代表" />
        <ElOption label="新增代表" value="新增代表" />
      </ElSelect>
      <div class="filter-spacer"></div>
      <ElButton @click="ElMessage.success('已导出代表清单(按核验状态)')">
        <ArtSvgIcon icon="ri:download-2-line" class="mr-1" />导出
      </ElButton>
    </div>

    <div class="cso-grid-2 rep-layout">
      <section class="cso-panel">
        <div class="cso-panel__header">
          <div>
            <span class="cso-panel__title">代表清单</span>
            <span class="cso-panel__note"
              >共 {{ filteredReps.length }} 人 · 新增代表核验通过后方可生效</span
            >
          </div>
          <span class="view-hint">身份证号默认脱敏,查看完整信息需授权</span>
        </div>
        <ElTable :data="filteredReps" class="cso-table" style="width: 100%">
          <ElTableColumn prop="name" label="姓名" width="80" fixed />
          <ElTableColumn label="所属CSO / 学历" min-width="230">
            <template #default="scope">
              <div class="rep-cell">
                <strong>{{ scope.row.cso }}</strong>
                <small>{{ scope.row.education }}</small>
              </div>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="maskedId" label="身份证号(脱敏)" min-width="160" />
          <ElTableColumn label="学历核验" width="95" align="center">
            <template #default="scope">
              <span :class="['cso-badge', verifyTone(scope.row.verifyStatus)]">{{
                scope.row.verifyStatus
              }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn label="备案状态" width="95" align="center">
            <template #default="scope">
              <span :class="['cso-badge', filingTone(scope.row.filing)]">{{
                scope.row.filing
              }}</span>
            </template>
          </ElTableColumn>
          <ElTableColumn prop="cohort" label="批次" width="90" align="center" />
          <ElTableColumn label="操作" width="80" fixed="right" align="center">
            <template #default="scope">
              <ElButton link type="primary" @click="openDetail(scope.row)">详情</ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
      </section>

      <aside class="right-stack">
        <section class="cso-panel">
          <div class="cso-panel__header">
            <div>
              <span class="cso-panel__title">黑名单 · 跨代理商拦截</span>
              <span class="cso-panel__note">同一代表复用时自动预警</span>
            </div>
            <span class="cso-badge cso-badge--danger">2 人</span>
          </div>
          <div class="blacklist-list">
            <article v-for="item in blacklistRecords" :key="item.maskedId">
              <span class="blacklist-icon"><ArtSvgIcon icon="ri:forbid-line" /></span>
              <div>
                <strong>{{ item.name }} · {{ item.maskedId }}</strong>
                <small>{{ item.reason }} · {{ item.date }}</small>
                <p>{{ item.source }}</p>
              </div>
              <span class="cso-badge cso-badge--danger">{{ item.status }}</span>
            </article>
          </div>
        </section>
        <section class="cso-panel">
          <div class="cso-panel__header"><span class="cso-panel__title">核验与备案规则</span></div>
          <div class="rule-steps">
            <article v-for="(rule, index) in rules" :key="rule.title">
              <span>{{ index + 1 }}</span>
              <div
                ><strong>{{ rule.title }}</strong
                ><small>{{ rule.detail }}</small></div
              >
            </article>
          </div>
        </section>
      </aside>
    </div>

    <ElDrawer v-model="detailVisible" title="代表详情" size="500px">
      <div v-if="selectedRep" class="rep-detail">
        <div class="rep-detail__head">
          <span class="rep-avatar">{{ selectedRep.name.slice(0, 1) }}</span>
          <div>
            <strong>{{ selectedRep.name }}</strong>
            <small>{{ selectedRep.cso }} · {{ selectedRep.cohort }}</small>
          </div>
          <span :class="['cso-badge', verifyTone(selectedRep.verifyStatus)]">{{
            selectedRep.verifyStatus
          }}</span>
        </div>
        <dl class="cso-kv-grid two-cols">
          <div class="cso-kv"
            ><dt>身份证号(脱敏)</dt><dd>{{ selectedRep.maskedId }}</dd></div
          >
          <div class="cso-kv"
            ><dt>医药相关学历</dt><dd>{{ selectedRep.education }}</dd></div
          >
          <div class="cso-kv"
            ><dt>学历证书</dt><dd>{{ selectedRep.diploma }}</dd></div
          >
          <div class="cso-kv"
            ><dt>备案状态</dt><dd>{{ selectedRep.filing }}({{ selectedRep.filingNo }})</dd></div
          >
          <div class="cso-kv"
            ><dt>黑名单</dt
            ><dd :class="selectedRep.blacklist === '无' ? 'success-text' : 'danger-text'">{{
              selectedRep.blacklist
            }}</dd></div
          >
          <div class="cso-kv"
            ><dt>核验状态</dt><dd>{{ selectedRep.verifyStatus }}</dd></div
          >
        </dl>
        <ElAlert
          v-if="selectedRep.note"
          :title="selectedRep.note"
          type="warning"
          :closable="false"
          show-icon
        />
        <ElAlert
          v-if="selectedRep.blacklist !== '无'"
          title="黑名单命中:该代表已跨代理商复用拦截,不可开展业务。"
          type="error"
          :closable="false"
          show-icon
          class="mt-4"
        />
      </div>
      <template #footer>
        <ElButton @click="detailVisible = false">关闭</ElButton>
        <ElButton
          v-if="selectedRep?.verifyStatus === '待核验'"
          type="primary"
          @click="ElMessage.success('学历在线核验已发起,结果将回写核验状态')"
          >发起学历核验</ElButton
        >
      </template>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { blacklistRecords, representativeRecords, type RepresentativeRecord } from '../mock'

  defineOptions({ name: 'CsoRepresentatives' })

  const keyword = ref('')
  const verifyFilter = ref('全部')
  const filingFilter = ref('全部')
  const cohortFilter = ref('全部')
  const detailVisible = ref(false)
  const selectedRep = ref<RepresentativeRecord | null>(null)

  const stats = [
    {
      label: '在册代表',
      value: '76 人',
      note: '覆盖 5 家CSO',
      icon: 'ri:group-line',
      tone: 'blue'
    },
    {
      label: '学历核验通过',
      value: '68 人',
      note: '5 人待核验 · 3 人不通过',
      icon: 'ri:verified-badge-line',
      tone: 'green'
    },
    {
      label: '备案有效',
      value: '62 人',
      note: '9 人待备案 · 5 人过期',
      icon: 'ri:registered-line',
      tone: 'teal'
    },
    {
      label: '黑名单拦截',
      value: '2 人',
      note: '跨代理商复用自动预警',
      icon: 'ri:forbid-line',
      tone: 'red'
    }
  ]

  const rules = [
    { title: '学历真实性核验', detail: '上传学历证书扫描件,在线核验通过后方可生效' },
    { title: '存量与新增分开管理', detail: '新增代表须核验通过后方可用;存量代表定期复核' },
    { title: '备案状态管理', detail: '上传备案截图或备案号,商务核验后方可开展业务' },
    { title: '黑名单管理', detail: '违规终止代表入库,跨代理商复用时自动预警拦截' }
  ]

  const filteredReps = computed(() =>
    representativeRecords.filter((item) => {
      const matchesKeyword =
        !keyword.value ||
        `${item.name}${item.cso}`.toLowerCase().includes(keyword.value.toLowerCase())
      const matchesVerify =
        verifyFilter.value === '全部' || item.verifyStatus === verifyFilter.value
      const matchesFiling = filingFilter.value === '全部' || item.filing === filingFilter.value
      const matchesCohort = cohortFilter.value === '全部' || item.cohort === cohortFilter.value
      return matchesKeyword && matchesVerify && matchesFiling && matchesCohort
    })
  )

  const verifyTone = (value: string) =>
    value === '通过'
      ? 'cso-badge--success'
      : value === '不通过'
        ? 'cso-badge--danger'
        : 'cso-badge--warning'
  const filingTone = (value: string) =>
    value === '已备案'
      ? 'cso-badge--success'
      : value === '备案过期'
        ? 'cso-badge--danger'
        : 'cso-badge--warning'
  const openDetail = (row: RepresentativeRecord) => {
    selectedRep.value = row
    detailVisible.value = true
  }
</script>

<style lang="scss" scoped>
  @use '../shared';

  .redline-alert {
    margin-bottom: 16px;
  }

  .rep-stat {
    display: flex;
    gap: 13px;
    align-items: center;
    padding: 18px;
  }

  .rep-icon {
    display: grid;
    flex: 0 0 40px;
    place-items: center;
    width: 40px;
    height: 40px;
    font-size: 19px;
    border-radius: 11px;
  }

  .rep-icon--blue {
    color: var(--cso-blue);
    background: var(--cso-blue-soft);
  }

  .rep-icon--green {
    color: var(--cso-green);
    background: var(--cso-green-soft);
  }

  .rep-icon--teal {
    color: var(--cso-teal);
    background: var(--cso-teal-soft);
  }

  .rep-icon--red {
    color: var(--cso-red);
    background: var(--cso-red-soft);
  }

  .stat-copy strong {
    display: block;
    margin: 6px 0 5px;
    font-size: 21px;
  }

  .stat-copy small {
    font-size: 12px;
    color: var(--cso-muted);
  }

  .filter-spacer {
    flex: 1;
  }

  .view-hint {
    font-size: 12px;
    color: var(--cso-muted);
  }

  .rep-cell strong {
    display: block;
    font-size: 13px;
  }

  .rep-cell small {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .right-stack {
    display: grid;
    gap: 18px;
    align-content: start;
  }

  .blacklist-list {
    padding: 10px 15px;
  }

  .blacklist-list article {
    display: flex;
    gap: 11px;
    align-items: flex-start;
    padding: 13px 0;
    border-bottom: 1px solid var(--cso-line);
  }

  .blacklist-list article:last-child {
    border-bottom: 0;
  }

  .blacklist-icon {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    color: var(--cso-red);
    background: var(--cso-red-soft);
    border-radius: 9px;
  }

  .blacklist-list article > div {
    flex: 1;
  }

  .blacklist-list strong {
    display: block;
    font-size: 12px;
  }

  .blacklist-list small {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: #b83333;
  }

  .blacklist-list p {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .rule-steps {
    display: grid;
    gap: 10px;
    padding: 14px 15px;
  }

  .rule-steps article {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .rule-steps article > span {
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

  .rule-steps strong {
    display: block;
    font-size: 13px;
  }

  .rule-steps small {
    display: block;
    margin-top: 3px;
    font-size: 12px;
    line-height: 1.55;
    color: var(--cso-muted);
  }

  .rep-detail__head {
    display: flex;
    gap: 12px;
    align-items: center;
    padding: 16px;
    margin-bottom: 16px;
    background: #f4f7fb;
    border-radius: 11px;
  }

  .rep-avatar {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    font-size: 17px;
    font-weight: 750;
    color: var(--cso-blue);
    background: var(--cso-blue-soft);
    border-radius: 12px;
  }

  .rep-detail__head > div {
    flex: 1;
  }

  .rep-detail__head strong {
    display: block;
    font-size: 15px;
  }

  .rep-detail__head small {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .success-text {
    color: var(--cso-green);
  }

  .danger-text {
    color: var(--cso-red);
  }

  @media (width <= 1180px) {
    .cso-grid-2.rep-layout {
      grid-template-columns: 1fr;
    }
  }
</style>
