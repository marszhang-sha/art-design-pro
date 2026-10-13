<template>
  <CsoPage :embedded="!!recordId" title="合作意向详情">
    <template #actions
      ><ElButton @click="router.push('/cso/intentions')">返回意向池</ElButton></template
    >
    <ElResult v-if="!record" icon="warning" title="记录不存在" />
    <template v-else>
      <section class="cso-card intention-heading">
        <div class="heading-line"
          ><div
            ><p class="record-id">{{ record.product }} · {{ record.id }}</p
            ><h2>{{ record.name }}</h2></div
          ><ElTag
            :type="
              record.result === '合作' ? 'success' : record.result === '不合作' ? 'info' : 'warning'
            "
            size="large"
            >{{ record.result === '待洽谈' ? '待约谈' : record.result }}</ElTag
          ></div
        >
        <div class="contact-summary"
          ><span>负责人：{{ record.contact }}</span
          ><span>联系方式：{{ record.phone }}</span
          ><span
            >所在地：{{ [record.province, record.city].filter(Boolean).join(' / ') }}</span
          ></div
        >
      </section>
      <section class="cso-card intention-body">
        <h3>合作结果与跟进</h3>
        <ElForm label-position="top" @submit.prevent="saveResult">
          <ElFormItem label="合作结果"
            ><ElRadioGroup v-model="result" :disabled="!!record.partnerId"
              ><ElRadioButton value="PENDING">待约谈</ElRadioButton
              ><ElRadioButton value="COOPERATED">合作</ElRadioButton
              ><ElRadioButton value="REJECTED">不合作</ElRadioButton></ElRadioGroup
            ></ElFormItem
          >
          <ElFormItem label="线下约谈 / 跟进记录（必填）"
            ><ElInput
              v-model="note"
              type="textarea"
              :rows="4"
              maxlength="1000"
              show-word-limit
              placeholder="记录约谈情况、合作结论及下一步安排"
          /></ElFormItem>
          <ElButton type="primary" native-type="submit">保存处理记录</ElButton>
        </ElForm>
        <div class="followup-history"
          ><h3>处理记录</h3
          ><ElEmpty
            v-if="!record.notes.length"
            description="暂无处理记录"
            :image-size="70"
          /><ElTimeline v-else
            ><ElTimelineItem
              v-for="item in [...record.notes].reverse()"
              :key="item.id"
              :timestamp="formatTime(item.at)"
              ><strong>{{ item.actor }}</strong
              ><p class="event-text">{{ item.text }}</p></ElTimelineItem
            ></ElTimeline
          ></div
        >
      </section>
      <section class="cso-card intention-body">
        <div v-if="record.questionnaire" class="survey-meta"
          ><span>填写时间：{{ formatTime(record.questionnaire.submittedAt) }}</span
          ><span>{{ record.questionnaire.definition?.questions.length ?? 19 }}项</span></div
        >
        <SurveyAnswers
          v-if="record.questionnaire"
          :answers="record.questionnaire.answers"
          :definition="record.questionnaire.definition"
        />
        <ElDescriptions v-else :column="1" border
          ><ElDescriptionsItem label="意向区域"
            >{{ record.province }} / {{ record.city }}</ElDescriptionsItem
          ><ElDescriptionsItem label="意向产品">{{ record.product }}</ElDescriptionsItem
          ><ElDescriptionsItem v-if="record.remark" label="补充说明">{{
            record.remark
          }}</ElDescriptionsItem></ElDescriptions
        >
      </section>
    </template>
  </CsoPage>
</template>
<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import CsoPage from '../components/CsoPage.vue'
  import SurveyAnswers from '../components/SurveyAnswers.vue'
  import { useCsoStore } from '../store'
  import type { SurveyAnswers as SurveyAnswersRecord } from '../domain'
  import {
    coopIntentionApi,
    COOP_RESULT_LABEL,
    type CoopIntentionDetail,
    type CoopResult
  } from '@/api/coop'
  import '../shared-proto.scss'
  defineOptions({ name: 'CsoIntentionDetail' })
  const props = defineProps<{ recordId?: string }>()
  const route = useRoute(),
    router = useRouter()
  const { identity } = useCsoStore()
  const detail = ref<CoopIntentionDetail | null>(null)
  const internal = computed(() => !!identity.value && identity.value.role !== 'agent')
  const id = computed(() => String(props.recordId ?? route.params.id))
  /** 详情响应 → 页面展示形状（questionnaire 快照来自 BE definitionSnapshot） */
  const record = computed(() => {
    const d = detail.value
    if (!d || !internal.value) return undefined
    return {
      id: d.id,
      product: '希维她',
      name: d.company,
      contact: d.principal,
      phone: d.phone,
      province: d.province,
      city: d.city ?? '',
      remark: '',
      result: COOP_RESULT_LABEL[d.result],
      partnerId: '',
      notes: d.notes.map((n) => ({
        id: n.createdAt,
        actor: n.actor,
        at: n.createdAt,
        text: n.text
      })),
      questionnaire: d.definitionSnapshot
        ? {
            version: d.definitionVersion,
            submittedAt: d.createdAt ?? '',
            answers: d.answers as SurveyAnswersRecord,
            definition: d.definitionSnapshot
          }
        : undefined
    }
  })
  async function load() {
    detail.value = null
    try {
      detail.value = await coopIntentionApi.get(id.value)
    } catch {
      /* 记录不存在/已删除 → 模板走 warning 结果态 */
    }
  }
  watch([id, internal], load, { immediate: true })
  const result = ref<CoopResult>('PENDING')
  const note = ref('')
  watch(
    () => detail.value?.id,
    () => {
      result.value = detail.value?.result ?? 'PENDING'
      note.value = ''
    },
    { immediate: true }
  )
  async function saveResult() {
    if (!detail.value) return
    if (!note.value.trim()) {
      ElMessage.error('请填写线下约谈 / 跟进记录')
      return
    }
    try {
      await coopIntentionApi.registerRecord(detail.value.id, result.value, note.value.trim())
      ElMessage.success('合作记录已保存')
      note.value = ''
      load()
    } catch {
      /* 错误提示由 http 层统一弹出（COOP-2003 等） */
    }
  }
  const formatTime = (value: string) =>
    new Date(value).toLocaleString('zh-CN', { hour12: false, timeZone: 'Asia/Shanghai' })
</script>
<style scoped>
  .heading-line {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
  }

  .record-id {
    margin: 0 0 6px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .heading-line h2 {
    margin: 0;
    font-size: 22px;
    line-height: 1.5;
  }

  .contact-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 24px;
    margin-top: 16px;
    font-size: 13px;
    color: var(--el-text-color-regular);
    overflow-wrap: anywhere;
  }

  .intention-highlights {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    padding-top: 18px;
    margin-top: 20px;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .intention-highlights span {
    display: block;
    margin-bottom: 7px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .intention-highlights strong {
    font-size: 19px;
    font-weight: 600;
    color: var(--el-color-primary);
  }

  .intention-highlights small {
    font-size: 12px;
    font-weight: 400;
  }

  .survey-meta {
    display: flex;
    justify-content: space-between;
    margin: 8px 0 16px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .followup-history {
    padding-top: 22px;
    margin-top: 28px;
    border-top: 1px solid var(--el-border-color-lighter);
  }

  .followup-history h3 {
    margin-bottom: 20px;
    font-size: 16px;
  }

  .event-text {
    margin: 8px 0 0;
    white-space: pre-wrap;
  }

  @media (width <= 650px) {
    .intention-highlights {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .heading-line h2 {
      font-size: 19px;
    }
  }
</style>
