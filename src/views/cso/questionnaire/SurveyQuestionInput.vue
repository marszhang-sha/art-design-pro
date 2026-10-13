<template>
  <div v-if="question.key === 'contactDetails'" class="contact-fields">
    <label class="contact-field">
      <span><span class="required-mark" aria-hidden="true">*</span> 手机号码</span>
      <ElInput
        :model-value="contact.mobile"
        @update:model-value="updateContact('mobile', $event)"
        type="tel"
        autocomplete="tel"
        placeholder="请填写手机号码"
        aria-label="手机号码"
        aria-required="true"
      />
    </label>
    <label class="contact-field">
      <span>联系邮箱</span>
      <ElInput
        :model-value="contact.email"
        @update:model-value="updateContact('email', $event)"
        type="email"
        autocomplete="email"
        placeholder="请填写联系邮箱"
        aria-label="联系邮箱"
      />
    </label>
  </div>
  <ElSelect
    v-else-if="question.key === 'province'"
    v-model="model"
    filterable
    clearable
    placeholder="请选择所在省份"
    :aria-label="question.label"
  >
    <ElOption v-for="name in Object.keys(regions)" :key="name" :label="name" :value="name" />
  </ElSelect>
  <ElSelect
    v-else-if="question.key === 'city'"
    v-model="model"
    filterable
    clearable
    :disabled="!province"
    placeholder="请选择所在城市（选填）"
    :aria-label="question.label"
  >
    <ElOption v-for="name in cities" :key="name" :label="name" :value="name" />
  </ElSelect>
  <ElRadioGroup
    v-else-if="question.type === 'radio'"
    v-model="model"
    class="survey-options"
    :aria-label="question.label"
  >
    <ElRadio v-for="option in question.options" :key="option" :value="option" border>{{
      option
    }}</ElRadio>
  </ElRadioGroup>
  <ElCheckboxGroup
    v-else-if="question.type === 'checkbox'"
    v-model="selected"
    class="survey-options"
    :aria-label="question.label"
  >
    <ElCheckbox v-for="option in question.options" :key="option" :value="option" border>{{
      option
    }}</ElCheckbox>
  </ElCheckboxGroup>
  <ElInput
    v-else
    v-model="model"
    :type="question.type === 'multiline' ? 'textarea' : 'text'"
    :maxlength="question.type === 'multiline' ? 2000 : 200"
    :rows="3"
    :inputmode="
      question.type === 'integer' ? 'numeric' : question.type === 'decimal' ? 'decimal' : 'text'
    "
    :placeholder="question.placeholder"
    :aria-label="question.label"
  />
</template>
<script setup lang="ts">
  import { computed } from 'vue'
  import { readSurveyContact, type SurveyQuestion } from '../domain'
  import provinceCities from './province-cities.json'
  const props = defineProps<{ question: SurveyQuestion; province: string }>()
  const model = defineModel<string>({ required: true })
  const contact = computed(() => readSurveyContact(model.value) ?? { email: '', mobile: '' })
  function updateContact(key: 'email' | 'mobile', value: string) {
    model.value = JSON.stringify({ kind: 'email-mobile', ...contact.value, [key]: value })
  }
  const regions = provinceCities as Record<string, string[]>
  const cities = computed(() =>
    ['北京市', '天津市', '上海市', '重庆市'].includes(props.province)
      ? [props.province]
      : (regions[props.province] ?? [])
  )
  const selected = computed<string[]>({
    get: () => {
      try {
        return JSON.parse(model.value || '[]')
      } catch {
        return []
      }
    },
    set: (value) => {
      model.value = JSON.stringify(value)
    }
  })
</script>
<style scoped>
  .contact-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px 24px;
    width: 100%;
  }

  .contact-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 14px;
    color: var(--el-text-color-regular);
  }

  .required-mark {
    color: var(--el-color-danger);
  }

  @media (width <= 650px) {
    .contact-fields {
      grid-template-columns: 1fr;
    }
  }

  .el-select {
    width: 100%;
  }

  .survey-options {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .survey-options :deep(.el-radio),
  .survey-options :deep(.el-checkbox) {
    margin: 0;
  }
</style>
