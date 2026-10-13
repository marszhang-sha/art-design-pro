import { createSeedState, SURVEY_QUESTIONS, type CsoState, type Intention } from './domain'

export const INTENTION_BACKUP_KEY = 'asieris-cso-prototype-v1-before-intention-update-20261005'

function isRequestedTestRecord(item: Intention): boolean {
  if (item.partnerId || item.notes.length || item.result !== '待洽谈') return false
  const basicFields = [item.name, item.contact, item.phone, item.province, item.city]
  if (!basicFields.every((value) => value.trim() === '1')) return false
  if (item.questionnaire) {
    return SURVEY_QUESTIONS.filter((q) => q.type !== 'radio').every(
      (q) => item.questionnaire!.answers[q.key]?.trim() === '1'
    )
  }
  return item.product.trim() === '1' && ['', '1'].includes(item.remark.trim())
}

export function prepareIntentionMaintenance(state: CsoState): CsoState {
  if (state.maintenance?.intentionSurvey20261005) return state
  const seeds = createSeedState().intentions
  const candidates = state.intentions.filter(isRequestedTestRecord)
  // Only the single unprocessed all-ones record explicitly requested by the user.
  const removedIds = candidates.length === 1 ? [candidates[0].id] : []
  const intentions = state.intentions
    .filter((item) => !removedIds.includes(item.id))
    .map((item) => {
      const example = seeds.find((seed) => seed.id === item.id && seed.name === item.name)
      if (!example?.questionnaire || item.questionnaire) return item
      return {
        ...item,
        product: item.product === '示例产品' ? '希维她' : item.product,
        remark: item.remark === '演示数据，不代表真实客户资料' ? '' : item.remark,
        questionnaire: {
          ...example.questionnaire,
          answers: {
            ...example.questionnaire.answers,
            company: item.name,
            principal: item.contact,
            contactDetails: item.phone,
            province: item.province,
            city: item.city
          }
        }
      }
    })
  return {
    ...state,
    intentions,
    maintenance: {
      ...state.maintenance,
      intentionSurvey20261005: { appliedAt: new Date().toISOString(), removedIds }
    }
  }
}

export function persistIntentionMaintenance(
  state: CsoState,
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  storageKey: string
): CsoState {
  const next = prepareIntentionMaintenance(state)
  if (next === state) return state
  const saved = storage.getItem(storageKey)
  // Back up before writing; the marker and updated data are one atomic storage value.
  if (saved && !storage.getItem(INTENTION_BACKUP_KEY)) storage.setItem(INTENTION_BACKUP_KEY, saved)
  storage.setItem(storageKey, JSON.stringify(next))
  return next
}
