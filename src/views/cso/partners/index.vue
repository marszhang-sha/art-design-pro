<template>
  <div class="cso-page">
    <header class="cso-page-header">
      <div>
        <div class="cso-eyebrow">CSO FILES</div>
        <h1 class="cso-title">CSO档案</h1>
        <p class="cso-subtitle">
          准入管资格、合同管关系、档案管主体:本页以主体为中心归集CSO档案,管理资质预警与档案完整度;合作关系明细请进入一户一档查看。
        </p>
      </div>
      <ElButton type="primary" @click="createVisible = true">
        <ArtSvgIcon icon="ri:add-line" class="mr-1" />发起准入申请
      </ElButton>
    </header>

    <section class="cso-stat-grid compact-stats">
      <div v-for="item in summary" :key="item.label" class="cso-stat-card compact-card">
        <span class="cso-stat-label">{{ item.label }}</span>
        <strong class="summary-value">{{ item.value }}</strong>
        <span :class="['cso-badge', `cso-badge--${item.tone}`]">{{ item.note }}</span>
      </div>
    </section>

    <div class="cso-filter-bar">
      <ElInput v-model="keyword" clearable placeholder="搜索CSO名称 / 编码" style="width: 260px">
        <template #prefix><ArtSvgIcon icon="ri:search-line" /></template>
      </ElInput>
      <ElSelect v-model="bu" style="width: 140px">
        <ElOption label="全部BU" value="全部BU" />
        <ElOption label="BU A" value="BU A" />
        <ElOption label="BU B" value="BU B" />
        <ElOption label="BU C" value="BU C" />
      </ElSelect>
      <ElSelect v-model="qualification" style="width: 150px">
        <ElOption label="全部资质状态" value="全部" />
        <ElOption label="有效" value="有效" />
        <ElOption label="即将到期" value="即将到期" />
        <ElOption label="过期" value="过期" />
      </ElSelect>
      <ElSelect v-model="risk" style="width: 140px">
        <ElOption label="全部风险" value="全部" />
        <ElOption label="低风险" value="低风险" />
        <ElOption label="中风险" value="中风险" />
        <ElOption label="高风险" value="高风险" />
      </ElSelect>
      <div class="filter-spacer"></div>
      <ElButton @click="resetFilters">重置</ElButton>
      <ElButton @click="ElMessage.success('已按当前筛选导出档案清单')">
        <ArtSvgIcon icon="ri:download-2-line" class="mr-1" />导出
      </ElButton>
    </div>

    <section class="cso-panel">
      <div class="cso-panel__header">
        <div>
          <span class="cso-panel__title">主体档案清单</span>
          <span class="cso-panel__note">共 {{ filteredPartners.length }} 家</span>
        </div>
        <span class="view-hint">点击CSO名称进入一户一档</span>
      </div>
      <ElTable :data="filteredPartners" class="cso-table" style="width: 100%">
        <ElTableColumn label="CSO主体" min-width="250" fixed>
          <template #default="scope">
            <button class="partner-link" type="button" @click="open360(scope.row.id)">
              <span class="partner-avatar">{{ scope.row.name.slice(0, 1) }}</span>
              <span>
                <strong>{{ scope.row.name }}</strong>
                <small>{{ scope.row.code }} · {{ scope.row.type }}</small>
              </span>
            </button>
          </template>
        </ElTableColumn>
        <ElTableColumn label="资质证照" width="105" align="center">
          <template #default="scope">
            <span
              :class="[
                'cso-badge',
                scope.row.qualificationStatus === '有效'
                  ? 'cso-badge--success'
                  : scope.row.qualificationStatus === '即将到期'
                    ? 'cso-badge--warning'
                    : 'cso-badge--danger'
              ]"
            >
              {{ scope.row.qualificationStatus }}
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="代表在册" width="95" align="center">
          <template #default="scope">
            <div class="rep-cell"
              ><strong>{{ scope.row.representatives }} 人</strong><small>已备案</small></div
            >
          </template>
        </ElTableColumn>
        <ElTableColumn label="合作关系汇总" min-width="220">
          <template #default="scope">
            <div class="scope-cell">
              <span>{{ scope.row.relationshipCount }} 条合作关系</span>
              <small>{{ scope.row.bu.join('、') }} · {{ scope.row.region }}</small>
            </div>
          </template>
        </ElTableColumn>
        <ElTableColumn label="合作状态" width="100" align="center">
          <template #default="scope">
            <span
              :class="[
                'cso-badge',
                scope.row.relationshipStatus === '正常合作'
                  ? 'cso-badge--success'
                  : scope.row.relationshipStatus === '条件合作'
                    ? 'cso-badge--warning'
                    : 'cso-badge--danger'
              ]"
            >
              {{ scope.row.relationshipStatus }}
            </span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="风险" width="90" align="center">
          <template #default="scope">
            <span :class="['risk-dot', riskClass(scope.row.risk)]"></span>{{ scope.row.risk }}
          </template>
        </ElTableColumn>
        <ElTableColumn prop="updatedAt" label="档案更新" width="105" align="center" />
        <ElTableColumn label="操作" width="116" fixed="right" align="center">
          <template #default="scope">
            <ElButton link type="primary" @click="open360(scope.row.id)">一户一档</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
      <div class="pagination-row">
        <span>资质到期前自动提醒,过期自动标记;档案随准入、合同、流向、结算数据自动归档</span>
        <ElPagination background layout="prev, pager, next" :total="48" :page-size="10" />
      </div>
    </section>

    <ElDialog v-model="createVisible" title="发起CSO准入申请" width="620px">
      <ElAlert
        title="新主体通过准入建立资格;档案在准入通过后自动创建"
        type="info"
        :closable="false"
        show-icon
        class="mb-4"
      />
      <ElForm label-position="top" :model="newApplication">
        <ElRow :gutter="16">
          <ElCol :span="14"
            ><ElFormItem label="CSO主体名称"
              ><ElInput
                v-model="newApplication.name"
                placeholder="请输入营业执照主体名称" /></ElFormItem
          ></ElCol>
          <ElCol :span="10"
            ><ElFormItem label="主体类型"
              ><ElSelect v-model="newApplication.type" class="w-full"
                ><ElOption label="有限责任公司" value="有限责任公司" /><ElOption
                  label="自然人代理"
                  value="自然人代理" /></ElSelect></ElFormItem
          ></ElCol>
          <ElCol :span="8"
            ><ElFormItem label="合作BU"
              ><ElSelect v-model="newApplication.bu" class="w-full"
                ><ElOption label="BU A" value="BU A" /><ElOption
                  label="BU B"
                  value="BU B" /><ElOption label="BU C" value="BU C" /></ElSelect></ElFormItem
          ></ElCol>
          <ElCol :span="8"
            ><ElFormItem label="产品线"
              ><ElSelect v-model="newApplication.product" class="w-full"
                ><ElOption label="Product A" value="Product A" /><ElOption
                  label="Product B"
                  value="Product B" /><ElOption
                  label="Product C"
                  value="Product C" /></ElSelect></ElFormItem
          ></ElCol>
          <ElCol :span="8"
            ><ElFormItem label="合作区域"
              ><ElSelect v-model="newApplication.region" class="w-full"
                ><ElOption label="华东" value="华东" /><ElOption
                  label="华南"
                  value="华南" /><ElOption label="西南" value="西南" /></ElSelect></ElFormItem
          ></ElCol>
        </ElRow>
      </ElForm>
      <template #footer>
        <ElButton @click="createVisible = false">取消</ElButton>
        <ElButton type="primary" @click="submitApplication">保存并进入资料提交</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { computed, reactive, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { partners } from '../mock'

  defineOptions({ name: 'CsoPartners' })

  const router = useRouter()
  const keyword = ref('')
  const bu = ref('全部BU')
  const qualification = ref('全部')
  const risk = ref('全部')
  const createVisible = ref(false)
  const newApplication = reactive({
    name: '',
    type: '有限责任公司',
    bu: 'BU A',
    product: 'Product A',
    region: '华东'
  })

  const summary = [
    { label: '主体档案', value: '186', note: '本月新增 12', tone: 'primary' },
    { label: '资质预警', value: '6', note: '2项已过期', tone: 'danger' },
    { label: '代表在册', value: '76 人', note: '黑名单拦截 2', tone: 'warning' },
    { label: '档案完整度', value: '92%', note: '5 份待补全', tone: 'success' }
  ]

  const filteredPartners = computed(() =>
    partners.filter((item) => {
      const matchesKeyword =
        !keyword.value ||
        `${item.name}${item.code}`.toLowerCase().includes(keyword.value.toLowerCase())
      const matchesBu = bu.value === '全部BU' || item.bu.includes(bu.value)
      const matchesQualification =
        qualification.value === '全部' || item.qualificationStatus === qualification.value
      const matchesRisk = risk.value === '全部' || item.risk === risk.value
      return matchesKeyword && matchesBu && matchesQualification && matchesRisk
    })
  )

  const riskClass = (value: string) =>
    value === '低风险'
      ? 'risk-dot--low'
      : value === '中风险'
        ? 'risk-dot--medium'
        : 'risk-dot--high'

  const open360 = (id: string) =>
    router.push({ path: '/cso/relationship/partner-360', query: { id } })
  const resetFilters = () => {
    keyword.value = ''
    bu.value = '全部BU'
    qualification.value = '全部'
    risk.value = '全部'
  }
  const submitApplication = () => {
    createVisible.value = false
    ElMessage.success('已发起准入申请,流程请至准入管理跟进')
  }
</script>

<style lang="scss" scoped>
  @use '../shared';

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

  .partner-link {
    display: flex;
    gap: 10px;
    align-items: center;
    color: inherit;
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
  }

  .partner-avatar {
    display: grid;
    flex: 0 0 36px;
    place-items: center;
    width: 36px;
    height: 36px;
    font-size: 15px;
    font-weight: 750;
    color: var(--cso-blue);
    background: var(--cso-blue-soft);
    border-radius: 10px;
  }

  .partner-link strong {
    display: block;
    margin-bottom: 4px;
    font-size: 13px;
  }

  .partner-link small,
  .scope-cell small {
    display: block;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .scope-cell span {
    display: block;
    margin-bottom: 4px;
    font-size: 13px;
    font-weight: 600;
  }

  .rep-cell strong {
    display: block;
    font-size: 13px;
  }

  .rep-cell small {
    display: block;
    margin-top: 3px;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .risk-dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    margin-right: 5px;
    border-radius: 50%;
  }

  .risk-dot--low {
    background: var(--cso-green);
  }

  .risk-dot--medium {
    background: var(--cso-orange);
  }

  .risk-dot--high {
    background: var(--cso-red);
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

  @media (width <= 720px) {
    .filter-spacer {
      display: none;
    }

    .pagination-row {
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }
  }
</style>
