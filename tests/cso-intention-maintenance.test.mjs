import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createSeedState,
  applyCommand,
  SURVEY_QUESTIONS,
  surveyIntentionInput,
  normalizeSurveyAnswers
} from '../src/views/cso/domain.ts'
import {
  prepareIntentionMaintenance,
  persistIntentionMaintenance,
  INTENTION_BACKUP_KEY
} from '../src/views/cso/intention-maintenance.ts'

function legacyState() {
  const state = createSeedState()
  state.intentions.forEach((item) => {
    delete item.questionnaire
    item.product = '示例产品'
    item.remark = '演示数据，不代表真实客户资料'
  })
  return state
}
function addOnes(state, suffix = '') {
  // 防重键=企业名称（BR-COOP-037）：后缀只加在公司名，保证多次提交企业互异
  const answers = Object.fromEntries(
    SURVEY_QUESTIONS.map((q) => [
      q.key,
      q.key === 'company' ? '1' + suffix : (q.options?.[0] ?? '1')
    ])
  )
  return applyCommand(state, null, {
    type: 'submitIntention',
    input: surveyIntentionInput(answers)
  })
}
function memoryStorage(state) {
  const values = new Map([['business', JSON.stringify(state)]])
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  }
}

test('both sample records get 19 valid answers without changing existing business associations', () => {
  const old = legacyState()
  old.intentions[0].phone = 'edited@example.invalid'
  const snapshot = JSON.stringify(old)
  const next = prepareIntentionMaintenance(old)
  for (const item of next.intentions)
    assert.deepEqual(normalizeSurveyAnswers(item.questionnaire.answers), item.questionnaire.answers)
  assert.equal(next.intentions[0].questionnaire.answers.contactDetails, 'edited@example.invalid')
  assert.deepEqual(
    next.intentions.map((i) => [i.id, i.result, i.partnerId, i.notes]),
    old.intentions.map((i) => [i.id, i.result, i.partnerId, i.notes])
  )
  assert.deepEqual(next.partners, old.partners)
  assert.deepEqual(next.contracts, old.contracts)
  assert.deepEqual(next.deposits, old.deposits)
  assert.equal(JSON.stringify(old), snapshot)
  assert.equal(prepareIntentionMaintenance(next), next)
})

test('only one unprocessed all-ones record is removed, later similar records survive', () => {
  const old = addOnes(legacyState())
  const targetId = old.intentions.at(-1).id
  const next = prepareIntentionMaintenance(old)
  assert.equal(next.intentions.length, 2)
  assert.deepEqual(next.maintenance.intentionSurvey20261005.removedIds, [targetId])
  const later = addOnes(next, 'x')
  assert.equal(prepareIntentionMaintenance(later).intentions.length, 3)
})

test('different answers, existing surveys, linked records and ambiguous matches are preserved', () => {
  const old = addOnes(createSeedState())
  old.intentions.at(-1).questionnaire.answers.experts = '正常填写内容'
  const originalSurvey = structuredClone(old.intentions[0].questionnaire)
  assert.equal(prepareIntentionMaintenance(old).intentions.length, 3)
  assert.deepEqual(prepareIntentionMaintenance(old).intentions[0].questionnaire, originalSurvey)
  const linked = addOnes(legacyState())
  linked.intentions.at(-1).partnerId = 'p001'
  assert.equal(prepareIntentionMaintenance(linked).intentions.length, 3)
  const ambiguous = addOnes(addOnes(legacyState(), 'a'), 'b')
  assert.equal(prepareIntentionMaintenance(ambiguous).intentions.length, 4)
})

test('backup precedes atomic save and can restore the exact original state', () => {
  const old = addOnes(legacyState())
  const storage = memoryStorage(old)
  const before = storage.getItem('business')
  const next = persistIntentionMaintenance(old, storage, 'business')
  assert.equal(storage.getItem(INTENTION_BACKUP_KEY), before)
  assert.deepEqual(JSON.parse(storage.getItem('business')), next)
  const persisted = storage.getItem('business')
  persistIntentionMaintenance(next, storage, 'business')
  assert.equal(storage.getItem('business'), persisted)
  assert.deepEqual(JSON.parse(storage.getItem(INTENTION_BACKUP_KEY)), old)
})

test('storage failure never modifies original saved records or the in-memory source', () => {
  for (const failingKey of [INTENTION_BACKUP_KEY, 'business']) {
    const old = addOnes(legacyState())
    const before = JSON.stringify(old)
    const storage = memoryStorage(old)
    const set = storage.setItem
    storage.setItem = (key, value) => {
      if (key === failingKey) throw new Error('quota')
      set(key, value)
    }
    assert.throws(() => persistIntentionMaintenance(old, storage, 'business'), /quota/)
    assert.equal(storage.getItem('business'), before)
    assert.equal(JSON.stringify(old), before)
  }
})
