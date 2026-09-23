<template>
  <div class="cso-page">
    <header class="cso-page-header">
      <div>
        <div class="cso-eyebrow">PLATFORM EVOLUTION</div>
        <h1 class="cso-title">{{ current.title }}</h1>
        <p class="cso-subtitle">{{ current.subtitle }}</p>
      </div>
      <span class="cso-badge cso-badge--warning">规划中 · {{ current.iteration }}</span>
    </header>

    <section class="cso-panel evolution-panel">
      <div class="cso-panel__header">
        <div>
          <span class="cso-panel__title">整体系统演进策略</span>
          <span class="cso-panel__note">以V1为核心闭环,持续迭代业务能力</span>
        </div>
        <span class="table-note">Platform Governance 能力从 V1 开始建立,随业务发展持续增强</span>
      </div>
      <div class="evolution-strip">
        <template v-for="(item, index) in evolution" :key="item.name">
          <article :class="['evolution-card', item.state]">
            <span class="evolution-name">{{ item.name }}</span>
            <strong>{{ item.theme }}</strong>
            <small>{{ item.goal }}</small>
            <p>{{ item.modules }}</p>
          </article>
          <ArtSvgIcon
            v-if="index < evolution.length - 1"
            icon="ri:arrow-right-line"
            class="evolution-arrow"
          />
        </template>
      </div>
    </section>

    <div class="cso-grid-equal plan-grid">
      <section v-for="mod in current.modules" :key="mod.name" class="cso-panel plan-panel">
        <div class="plan-head">
          <span class="plan-no">{{ mod.no }}</span>
          <div
            ><h3>{{ mod.name }}</h3
            ><p>{{ mod.desc }}</p></div
          >
        </div>
        <ul class="plan-list">
          <li v-for="item in mod.items" :key="item">
            <ArtSvgIcon icon="ri:checkbox-multiple-blank-line" />{{ item }}
          </li>
        </ul>
      </section>
    </div>

    <section class="cso-panel value-panel">
      <div class="cso-panel__header"><span class="cso-panel__title">核心价值</span></div>
      <div class="value-grid">
        <article v-for="item in current.values" :key="item">
          <ArtSvgIcon icon="ri:award-line" /><span>{{ item }}</span>
        </article>
      </div>
    </section>

    <ElAlert
      title="本模块在当前版本(V1)暂未建设,菜单保留五大业务架构占位"
      description="V1 聚焦需求模块 1+2+4+5,建立合作关系、业绩归属、返利计算与合规结算的完整闭环;后续迭代按本规划扩展。"
      type="info"
      :closable="false"
      show-icon
    />
  </div>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useRoute } from 'vue-router'

  defineOptions({ name: 'CsoRoadmap' })

  const route = useRoute()

  const evolution = [
    {
      name: 'V1',
      theme: '核心闭环',
      goal: '合作有依据 · 业绩有事实 · 结算有规则',
      modules: '模块 1 + 2 + 4 + 5',
      state: 'done'
    },
    {
      name: 'Iteration 2',
      theme: '市场经营',
      goal: '管到终端与资源',
      modules: '模块 3 + 6',
      state: 'current-future'
    },
    {
      name: 'Iteration 3',
      theme: '过程与绩效',
      goal: '管到执行与评价',
      modules: '模块 7 + 8 + 9',
      state: 'current-future'
    },
    {
      name: 'Iteration 4',
      theme: '协同与洞察',
      goal: '提升运营效率与经营视角',
      modules: '模块 10 + 11 + 12',
      state: 'future'
    }
  ]

  const plans: Record<
    string,
    {
      iteration: string
      title: string
      subtitle: string
      modules: { no: string; name: string; desc: string; items: string[] }[]
      values: string[]
    }
  > = {
    CsoMarketRoadmap: {
      iteration: 'Iteration 2',
      title: '市场与资源管理',
      subtitle:
        '将经营范围从CSO扩展到终端市场,并管理市场资源投入与使用:终端关系、名单与铺货、资源申请、预算与费用。',
      modules: [
        {
          no: '03',
          name: '终端管理(医院/药店)',
          desc: '模块三 · 医院药店名单管理',
          items: [
            '终端基础信息与分级分层',
            '终端关系管理与名单审批',
            '医院开发任务与完成率预警',
            '铺货需求、执行确认与全流程跟踪',
            'DDI直连费用与免费额度'
          ]
        },
        {
          no: '06',
          name: '资源管理(申请/预算/费用)',
          desc: '模块六 · 资源申请与扣除管理',
          items: [
            '标准化资源申请与发货确认',
            '市场活动报名与费用确认',
            '按产品线免费额度配置',
            '费用返利联动扣除',
            '资源效果评估'
          ]
        }
      ],
      values: ['覆盖终端与渠道', '提升经营效率', '规范资源投入', '建立市场运营基础']
    },
    CsoExecutionRoadmap: {
      iteration: 'Iteration 3',
      title: '业务执行管理',
      subtitle: '沉淀执行过程数据,建立绩效评价体系,实现结果、过程与合规三线管理:执行、考核、培训。',
      modules: [
        {
          no: '07/09',
          name: '执行管理(签到/周报)',
          desc: '模块七 · 指标考核 + 模块九 · 签到与周报',
          items: [
            '指标考核与季度完成率',
            '分级处置建议自动生成',
            '销售移动签到(GPS+水印照片)',
            '周报模板与审阅',
            '考核进度看板'
          ]
        },
        {
          no: '08',
          name: '培训管理与绩效评价',
          desc: '模块八 · 培训管理',
          items: [
            '培训任务指派与在线学习',
            '随机抽题考试与自动判卷',
            '证书有效期管理与到期预警',
            '合规培训年度必修与签约拦截',
            '培训数据看板'
          ]
        }
      ],
      values: ['看结果 + 看过程', '驱动行为管理与能力提升', '绩效评价体系落地', '支撑精细化经营']
    }
  }

  const current = computed(() => plans[route.name as string] ?? plans.CsoMarketRoadmap)
</script>

<style lang="scss" scoped>
  @use '../shared';

  .evolution-panel {
    margin-bottom: 18px;
  }

  .table-note {
    font-size: 12px;
    color: var(--cso-muted);
  }

  .evolution-strip {
    display: flex;
    align-items: stretch;
    padding: 18px;
  }

  .evolution-card {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 6px;
    min-height: 130px;
    padding: 14px;
    background: #fafbfc;
    border: 1px solid var(--cso-line);
    border-radius: 11px;
  }

  .evolution-card.done {
    background: #f5fcf8;
    border-color: #cdeadc;
    box-shadow: inset 0 -3px var(--cso-green);
  }

  .evolution-card.current-future {
    background: #fffaf2;
    border-color: #f3d9ae;
    box-shadow: inset 0 -3px var(--cso-orange);
  }

  .evolution-name {
    font-size: 12px;
    font-weight: 750;
    color: var(--cso-muted);
    letter-spacing: 0.1em;
  }

  .evolution-card strong {
    font-size: 14px;
  }

  .evolution-card small {
    font-size: 12px;
    color: #33445e;
  }

  .evolution-card p {
    margin: auto 0 0;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .evolution-arrow {
    flex: 0 0 22px;
    align-self: center;
    color: #aab6c5;
  }

  .plan-grid {
    align-items: start;
    margin-bottom: 18px;
  }

  .plan-panel {
    padding: 18px;
  }

  .plan-head {
    display: flex;
    gap: 12px;
    align-items: center;
    padding-bottom: 13px;
    border-bottom: 1px dashed var(--cso-line);
  }

  .plan-no {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    font-size: 13px;
    font-weight: 800;
    color: var(--cso-blue);
    background: var(--cso-blue-soft);
    border-radius: 11px;
  }

  .plan-head h3 {
    margin: 0;
    font-size: 16px;
  }

  .plan-head p {
    margin: 4px 0 0;
    font-size: 12px;
    color: var(--cso-muted);
  }

  .plan-list {
    flex: 1;
    padding: 0;
    margin: 14px 0 0;
    list-style: none;
  }

  .plan-list li {
    display: flex;
    gap: 8px;
    align-items: center;
    padding: 6px 0;
    font-size: 12px;
    color: #33445e;
  }

  .plan-list svg {
    color: var(--cso-blue);
  }

  .value-panel {
    margin-bottom: 18px;
  }

  .value-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    padding: 18px;
  }

  .value-grid article {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 14px;
    font-size: 13px;
    font-weight: 650;
    background: #f7f9fc;
    border-radius: 10px;
  }

  .value-grid svg {
    color: var(--cso-orange);
  }

  @media (width <= 1080px) {
    .evolution-strip {
      overflow-x: auto;
    }

    .evolution-card {
      min-width: 200px;
    }
  }

  @media (width <= 720px) {
    .plan-grid,
    .value-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
