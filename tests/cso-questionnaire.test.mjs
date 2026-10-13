import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  SURVEY_TITLE,
  SURVEY_VERSION,
  SURVEY_QUESTIONS,
  emptySurveyAnswers,
  surveyAnswerError,
  surveyIntentionInput,
  normalizeSurveyAnswers,
  isSurveyResponse,
  createSeedState,
  currentSurveyDefinition,
  applyCommand
} from '../src/views/cso/domain.ts'

function validAnswers() {
  return {
    province: '江苏省',
    city: '南京市江宁区',
    company: '问卷验证公司',
    principal: '测试负责人',
    companyScale: '500万-1000万',
    directTeam: '0',
    recruitmentTeam: '3',
    products: '品种甲、品种乙',
    coveredCities: '南京市\n苏州市',
    departments: '妇科',
    hospitalCount: '2',
    hospitals: '测试医院甲\n测试医院乙',
    experts: '测试专家甲（测试单位甲）\n测试专家乙（测试单位乙）',
    gynecologySales: '1250.50',
    sales2025: '3200',
    contractQuantity: '500',
    productManager: '有，2名讲师',
    cooperationRegion: '浙江省杭州市',
    contactDetails: 'test@example.invalid'
  }
}

test('all 19 required source questions and all five choices are retained verbatim', () => {
  const source = JSON.parse(
    readFileSync(new URL('./fixtures/wjx-questionnaire-20261004.json', import.meta.url), 'utf8')
  )
  assert.equal(SURVEY_TITLE, source.title)
  assert.equal(SURVEY_QUESTIONS.length, 19)
  assert.equal(new Set(SURVEY_QUESTIONS.map((q) => q.key)).size, 19)
  for (const question of SURVEY_QUESTIONS) {
    const original = source.questions.find((q) => q.number === question.number)
    assert.equal(question.label, original.label)
    assert.equal(original.required, true)
    assert.deepEqual(question.options ?? [], original.options)
  }
  assert.equal(SURVEY_QUESTIONS.find((q) => q.key === 'sales2025').label, '2025年销售额')
})

test('submission preserves every answer through JSON persistence and OA callback', () => {
  const original = createSeedState()
  const before = JSON.stringify(original)
  const answers = validAnswers()
  let state = applyCommand(original, null, {
    type: 'submitIntention',
    input: surveyIntentionInput(answers)
  })
  state = JSON.parse(JSON.stringify(state))
  const item = state.intentions.at(-1)
  assert.deepEqual(item.questionnaire.answers, answers)
  assert.equal(item.questionnaire.version, SURVEY_VERSION)
  assert.ok(isSurveyResponse(item.questionnaire))
  assert.equal(item.product, '希维她')
  assert.equal(item.phone, answers.contactDetails)
  assert.equal(item.province, '江苏省')
  assert.equal(item.questionnaire.answers.cooperationRegion, '浙江省杭州市')
  assert.equal(item.result, '待洽谈')
  assert.equal(item.partnerId, '')
  assert.equal(state.partners.length, original.partners.length)
  assert.equal(JSON.stringify(original), before, 'existing records remain untouched')
  const admin = { role: 'admin' }
  state = applyCommand(state, admin, {
    type: 'recordIntention',
    id: item.id,
    result: '合作',
    note: '问卷核验'
  })
  state = applyCommand(state, admin, {
    type: 'receiveOa',
    intentionId: item.id,
    supplierCode: 'TEST-Q19',
    creditCode: 'TEST-CREDIT-Q19'
  })
  assert.deepEqual(state.intentions.at(-1).questionnaire.answers, answers)
  assert.equal(state.partners.at(-1).phone, 'test@example.invalid')
})

test('each required answer and numeric/option validation are enforced in the domain', () => {
  for (const question of SURVEY_QUESTIONS) {
    assert.throws(
      () => normalizeSurveyAnswers({ ...validAnswers(), [question.key]: ' ' }),
      /请填写/
    )
  }
  for (const invalid of ['-1', 'NaN', 'Infinity', '1e9']) {
    assert.throws(() => normalizeSurveyAnswers({ ...validAnswers(), sales2025: invalid }))
  }
  assert.throws(() => normalizeSurveyAnswers({ ...validAnswers(), directTeam: '1.5' }))
  assert.throws(() => normalizeSurveyAnswers({ ...validAnswers(), companyScale: '其他' }))
  assert.equal(normalizeSurveyAnswers(validAnswers()).directTeam, '0')
  assert.throws(() =>
    applyCommand(createSeedState(), null, {
      type: 'submitIntention',
      input: { ...surveyIntentionInput(validAnswers()), surveyAnswers: emptySurveyAnswers() }
    })
  )
})

test('legacy intentions remain supported and malformed answer structures are rejected', () => {
  const state = applyCommand(createSeedState(), null, {
    type: 'submitIntention',
    input: {
      name: '旧版意向',
      contact: '联系人',
      phone: '13800000000',
      province: '江苏省',
      city: '南京市',
      product: '旧产品',
      remark: '保留原备注'
    }
  })
  assert.equal(state.intentions.at(-1).questionnaire, undefined)
  assert.equal(state.intentions.at(-1).remark, '保留原备注')
  assert.equal(
    isSurveyResponse({ version: SURVEY_VERSION, submittedAt: '2026-10-04', answers: {} }),
    false
  )
})

test('multiple surveys coexist; dedup is scoped per survey (BR-COOP-037)', () => {
  let state = createSeedState()
  const admin = { role: 'admin' }
  // 在 default 基础上新建第二份问卷 campus
  state = applyCommand(state, admin, {
    type: 'saveSurveyDefinition',
    code: 'campus',
    definition: {
      ...JSON.parse(JSON.stringify(currentSurveyDefinition(state))),
      version: 'survey-campus-v1',
      title: '校园代理问卷'
    },
    expectedVersion: currentSurveyDefinition(state).version
  })
  const answers = Object.fromEntries(
    currentSurveyDefinition(state).questions.map((q) => [q.key, q.options?.[0] ?? '1'])
  )
  // 种子自带 2 条意向（无 surveyCode → 计入 default）
  const seedCount = state.intentions.length
  // 同一企业在两份问卷各提交一次——均成功（防重粒度＝问卷维度）
  state = applyCommand(state, admin, {
    type: 'submitIntention',
    surveyCode: 'default',
    input: surveyIntentionInput(answers, currentSurveyDefinition(state))
  })
  state = applyCommand(state, admin, {
    type: 'submitIntention',
    surveyCode: 'campus',
    input: surveyIntentionInput(answers, currentSurveyDefinition(state, 'campus'))
  })
  const byScope = (code) =>
    state.intentions.filter((i) => (i.surveyCode ?? 'default') === code).length
  assert.equal(byScope('default'), seedCount + 1)
  assert.equal(byScope('campus'), 1)
  // 同问卷内同名第三次提交 → 拒绝
  assert.throws(
    () =>
      applyCommand(state, admin, {
        type: 'submitIntention',
        surveyCode: 'default',
        input: surveyIntentionInput(answers, currentSurveyDefinition(state))
      }),
    /该企业已提交过合作意向/
  )
})

test('答案文本长度上限：单行 200/多行 2000（暂定口径）', () => {
  const base = {
    key: 'custom_len',
    number: 1,
    label: '长度题',
    section: 'company',
    required: true,
    placeholder: '',
    description: ''
  }
  const long = (n) => 'x'.repeat(n)
  assert.match(surveyAnswerError({ ...base, type: 'text' }, long(201)), /不能超过200字/)
  assert.equal(surveyAnswerError({ ...base, type: 'text' }, long(200)), '')
  assert.match(surveyAnswerError({ ...base, type: 'multiline' }, long(2001)), /不能超过2000字/)
  assert.equal(surveyAnswerError({ ...base, type: 'multiline' }, long(2000)), '')
})
