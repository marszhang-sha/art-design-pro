import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { DEMO_STORAGE_KEY, readDemoIdentity, writeDemoIdentity } from '@/utils/cso-demo'
import { persistIntentionMaintenance } from './intention-maintenance'
import { persistIntentionExamples } from './intention-examples'
import {
  applyCommand,
  canAccessPartner,
  createSeedState,
  getBalance,
  getReadiness,
  getRequirement,
  normalizeRoleTerminology,
  isSurveyResponse,
  validateSurveyDefinition,
  isOaAdmissionFields,
  isPartnerSupplementComplete,
  getPartnerBusinessStatus,
  isMedicalRepresentative,
  isBusinessContact,
  type Command,
  type CsoState,
  type DemoIdentity
} from './domain'

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
function matchesShape(value: unknown, sample: unknown): boolean {
  if (Array.isArray(sample))
    return (
      Array.isArray(value) &&
      (!sample.length || value.every((item) => matchesShape(item, sample[0])))
    )
  if (isRecord(sample))
    return (
      isRecord(value) &&
      Object.entries(sample).every(([key, item]) => matchesShape(value[key], item))
    )
  return typeof value === typeof sample && (typeof value !== 'number' || Number.isFinite(value))
}
function isState(value: unknown): value is CsoState {
  const seed = createSeedState()
  // Survey answers are optional on historical intentions, even when seeds have them.
  seed.intentions.forEach((item) => {
    delete item.questionnaire
  })
  seed.partners.forEach((item) => {
    delete item.oaAdmission
  })
  if (!matchesShape(value, seed)) return false
  const candidate = value as CsoState
  if (candidate.surveyDefinition) {
    try {
      validateSurveyDefinition(candidate.surveyDefinition)
    } catch {
      return false
    }
  }
  const idsValid = [
    candidate.intentions,
    candidate.partners,
    candidate.contracts,
    candidate.deposits
  ].every((items) => new Set(items.map((item) => item.id)).size === items.length)
  const attachmentSample = seed.deposits[0].attachments[0]
  const eventSample = seed.partners[0].events[0]
  return (
    idsValid &&
    candidate.partners.every(
      (item) =>
        (item.oaAdmission === undefined || isOaAdmissionFields(item.oaAdmission)) &&
        (item.supplementCompleted === undefined || typeof item.supplementCompleted === 'boolean') &&
        (item.businessContacts === undefined ||
          (Array.isArray(item.businessContacts) &&
            item.businessContacts.every(isBusinessContact) &&
            new Set(item.businessContacts.map((c) => c.id)).size ===
              item.businessContacts.length)) &&
        (item.representatives === undefined ||
          (Array.isArray(item.representatives) &&
            item.representatives.every(isMedicalRepresentative) &&
            new Set(item.representatives.map((rep) => rep.id)).size ===
              item.representatives.length)) &&
        item.documents.every((file) => matchesShape(file, attachmentSample)) &&
        item.events.every((entry) => matchesShape(entry, eventSample))
    ) &&
    candidate.intentions.every(
      (item) =>
        ['待洽谈', '合作', '不合作'].includes(item.result) &&
        (item.questionnaire === undefined || isSurveyResponse(item.questionnaire)) &&
        (!item.partnerId || candidate.partners.some((partner) => partner.id === item.partnerId))
    ) &&
    candidate.contracts.every(
      (item) =>
        ['草稿', '待签署', '已签署', 'OA审批中', 'OA已通过', '已生效'].includes(item.status) &&
        item.depositRequired >= 0 &&
        candidate.partners.some(
          (partner) => partner.id === item.partnerId && partner.cooperationId === item.cooperationId
        )
    ) &&
    candidate.deposits.every(
      (item) =>
        ['待确认', '已到账', '退回'].includes(item.status) &&
        item.amount > 0 &&
        candidate.partners.some(
          (partner) => partner.id === item.partnerId && partner.cooperationId === item.cooperationId
        )
    )
  )
}

let recoveryNotice = ''
function maintainPrototypeState(state: CsoState): CsoState {
  let updated = state
  try {
    updated = persistIntentionMaintenance(updated, localStorage, DEMO_STORAGE_KEY)
    updated = persistIntentionExamples(updated, localStorage, DEMO_STORAGE_KEY)
    return updated
  } catch {
    recoveryNotice = '本地数据更新未能保存，已保留原有记录，请检查浏览器存储空间。'
    return updated
  }
}
function loadState(): CsoState {
  try {
    const saved = localStorage.getItem(DEMO_STORAGE_KEY)
    if (!saved) return maintainPrototypeState(createSeedState())
    const parsed: unknown = JSON.parse(saved)
    if (!isState(parsed)) throw new Error('数据结构无效')
    const normalized = normalizeRoleTerminology(parsed)
    if (normalized !== parsed) {
      try {
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(normalized))
      } catch {
        recoveryNotice = '角色名称已在当前页面更正，但本地存储写入失败；原有业务记录仍保留。'
      }
    }
    return maintainPrototypeState(normalized)
  } catch {
    recoveryNotice = '本地演示数据损坏或无法读取，已恢复示例数据；下次保存将覆盖旧演示数据。'
    return createSeedState()
  }
}

const state = ref<CsoState>(loadState())
// 原型 demo 身份在正式分支不存在（登录态/可见性由 IAM 动态菜单权限码承载）——默认内部管理员
const identity = ref<DemoIdentity | null>(readDemoIdentity() ?? { role: 'admin' })
const visiblePartners = computed(() =>
  state.value.partners.filter((item) => canAccessPartner(identity.value, item.id))
)
const visibleIntentions = computed(() =>
  state.value.intentions.filter(() => !!identity.value && identity.value.role !== 'agent')
)
const visibleContracts = computed(() =>
  state.value.contracts.filter((item) => canAccessPartner(identity.value, item.partnerId))
)
const visibleDeposits = computed(() =>
  state.value.deposits.filter((item) => canAccessPartner(identity.value, item.partnerId))
)

function persist(next: CsoState) {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next))
  } catch {
    throw new Error('数据保存失败，请检查浏览器存储空间或权限；本次操作未保存。')
  }
  state.value = next
}
function dispatch(command: Command): void {
  const saved = localStorage.getItem(DEMO_STORAGE_KEY)
  const latest: unknown = saved ? JSON.parse(saved) : state.value
  if (!isState(latest)) throw new Error('当前保存的数据无效，请刷新后重试')
  identity.value = readDemoIdentity() ?? { role: 'admin' }
  persist(applyCommand(latest, identity.value, command))
}
function act(command: Command, successMessage = '操作已保存'): boolean {
  try {
    dispatch(command)
    ElMessage.success(successMessage)
    return true
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '操作失败，请重试')
    return false
  }
}
function setIdentity(next: DemoIdentity | null) {
  if (
    next?.role === 'agent' &&
    !state.value.partners.some((p) => p.id === next.partnerId && p.oaPassed)
  )
    throw new Error('代理商档案不存在或尚未完成OA准入')
  writeDemoIdentity(next)
  identity.value = next
}
window.addEventListener('storage', (event) => {
  if (event.key !== DEMO_STORAGE_KEY || !event.newValue) return
  try {
    const next: unknown = JSON.parse(event.newValue)
    if (isState(next)) state.value = next
  } catch {
    /* Keep the last valid view on malformed external storage updates. */
  }
})
function reset() {
  persist(createSeedState())
}
export function useCsoStore() {
  if (recoveryNotice) {
    const notice = recoveryNotice
    recoveryNotice = ''
    queueMicrotask(() => ElMessage.warning({ message: notice, duration: 9000, showClose: true }))
  }
  return {
    state,
    identity,
    visiblePartners,
    visibleIntentions,
    visibleContracts,
    visibleDeposits,
    setIdentity,
    reset,
    dispatch,
    act,
    refresh: () => {
      state.value = loadState()
    },
    balance: (id: string) => getBalance(state.value, id),
    requirement: (id: string) => getRequirement(state.value, id),
    readiness: (id: string) => getReadiness(state.value, id),
    supplementComplete: (id: string) => isPartnerSupplementComplete(state.value, id),
    partnerStatus: (id: string) => getPartnerBusinessStatus(state.value, id)
  }
}
