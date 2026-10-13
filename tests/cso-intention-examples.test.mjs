import test from 'node:test'
import assert from 'node:assert/strict'
import { createSeedState, normalizeSurveyAnswers, applyCommand } from '../src/views/cso/domain.ts'
import {
  prepareIntentionExamples,
  persistIntentionExamples,
  EXAMPLES_BACKUP_KEY
} from '../src/views/cso/intention-examples.ts'

test('expand to 20 complete, varied intentions without changing existing records or business', () => {
  const source = createSeedState()
  const original = JSON.stringify(source)
  const next = prepareIntentionExamples(source)
  assert.equal(next.intentions.length, 20)
  assert.equal(new Set(next.intentions.map((item) => item.id)).size, 20)
  assert.deepEqual(next.intentions.slice(0, 2), source.intentions)
  assert.equal(new Set(next.intentions.map((item) => item.result)).size, 3)
  assert.equal(
    new Set(next.intentions.map((item) => item.questionnaire.answers.companyScale)).size,
    5
  )
  assert.ok(new Set(next.intentions.map((item) => item.province)).size >= 10)
  for (const item of next.intentions.slice(2)) {
    assert.deepEqual(normalizeSurveyAnswers(item.questionnaire.answers), item.questionnaire.answers)
    assert.equal(item.partnerId, '')
    assert.ok(item.name.includes('示例'))
  }
  assert.deepEqual(next.partners, source.partners)
  assert.deepEqual(next.contracts, source.contracts)
  assert.deepEqual(next.deposits, source.deposits)
  assert.equal(JSON.stringify(source), original)
})

test('refresh is idempotent and never refills records deleted after adding examples', () => {
  const next = prepareIntentionExamples(createSeedState())
  assert.equal(prepareIntentionExamples(next), next)
  const deleted = applyCommand(
    next,
    { role: 'admin' },
    { type: 'deleteIntentions', ids: [next.intentions[2].id] }
  )
  assert.equal(prepareIntentionExamples(deleted).intentions.length, 19)
  const resetMarker = structuredClone(deleted)
  delete resetMarker.maintenance.intentionExamples20261008
  const renewed = prepareIntentionExamples(resetMarker)
  assert.ok(
    !renewed.intentions.some((item) => item.id === deleted.intentionRecycleBin[0].record.id)
  )
})

test('more than 20 existing records are not trimmed, empty lists can be filled', () => {
  const full = prepareIntentionExamples(createSeedState())
  delete full.maintenance.intentionExamples20261008
  full.intentions.push({ ...structuredClone(full.intentions[0]), id: 'user-owned' })
  const updated = prepareIntentionExamples(full)
  assert.equal(updated.intentions.length, 21)
  assert.deepEqual(updated.intentions, full.intentions)
  const empty = createSeedState()
  empty.intentions = []
  assert.equal(prepareIntentionExamples(empty).intentions.length, 20)
})

test('backup and atomic write preserve original data when storage fails', () => {
  const original = createSeedState()
  const before = JSON.stringify(original)
  for (const fail of [null, EXAMPLES_BACKUP_KEY, 'business']) {
    const map = new Map([['business', before]])
    const storage = {
      getItem: (key) => map.get(key) ?? null,
      setItem: (key, value) => {
        if (key === fail) throw Error('quota')
        map.set(key, value)
      }
    }
    if (fail) {
      assert.throws(() => persistIntentionExamples(original, storage, 'business'), /quota/)
      assert.equal(map.get('business'), before)
    } else {
      const next = persistIntentionExamples(original, storage, 'business')
      assert.equal(map.get(EXAMPLES_BACKUP_KEY), before)
      assert.deepEqual(JSON.parse(map.get('business')), next)
    }
  }
  assert.equal(JSON.stringify(original), before)
})
