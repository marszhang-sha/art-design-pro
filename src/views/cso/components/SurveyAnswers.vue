<template>
  <ElCollapse class="survey-answers" :model-value="['answers']">
    <ElCollapseItem name="answers" :title="`问卷填答（${questions.length}项）`">
      <section v-for="section in sections" :key="section.id" class="answer-section">
        <h4>{{ section.title }}</h4>
        <ElDescriptions :column="2" direction="vertical" border>
          <ElDescriptionsItem
            v-for="question in questions.filter((q) => q.section === section.id)"
            :key="question.key"
            :label="`${question.number}. ${question.label}`"
            :span="
              question.type === 'multiline' ||
              question.type === 'radio' ||
              question.key === 'hospitalCount' ||
              question.key === 'contactDetails'
                ? 2
                : 1
            "
          >
            <span class="answer-text">{{
              formatSurveyAnswer(question, answers[question.key])
            }}</span>
          </ElDescriptionsItem>
        </ElDescriptions>
      </section>
    </ElCollapseItem>
  </ElCollapse>
</template>
<script setup lang="ts">
  import { computed } from 'vue'
  import {
    SURVEY_QUESTIONS,
    SURVEY_SECTIONS,
    formatSurveyAnswer,
    type SurveyAnswers,
    type SurveyDefinition
  } from '../domain'
  const props = defineProps<{ answers: SurveyAnswers; definition?: SurveyDefinition }>()
  const questions = computed(() => props.definition?.questions ?? SURVEY_QUESTIONS)
  const sections = computed(() => props.definition?.sections ?? SURVEY_SECTIONS)
</script>
<style scoped>
  .survey-answers {
    --el-collapse-border-color: transparent;
  }

  .survey-answers :deep(.el-collapse-item__header) {
    font-size: 17px;
    font-weight: 600;
  }

  .answer-section {
    margin: 14px 0 24px;
  }

  .answer-section h4 {
    margin: 0 0 12px;
    font-size: 14px;
    color: var(--el-color-primary);
  }

  .answer-text {
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }

  .answer-section :deep(.el-descriptions__label) {
    font-weight: 400;
    color: var(--el-text-color-secondary);
  }
</style>
