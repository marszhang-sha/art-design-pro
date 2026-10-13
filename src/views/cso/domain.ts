/** Local prototype only: identities, events and files are simulated. */
export type DemoRole = 'admin' | 'manager' | 'operator' | 'agent'
export interface DemoIdentity {
  role: DemoRole
  partnerId?: string
}
export interface Attachment {
  storageKey?: string
  id: string
  name: string
  size: number
  mime: string
  addedAt: string
}
export interface CsoEvent {
  id: string
  at: string
  actor: string
  text: string
}
export interface Intention {
  id: string
  name: string
  contact: string
  phone: string
  province: string
  city: string
  product: string
  remark: string
  result: '待洽谈' | '合作' | '不合作'
  notes: CsoEvent[]
  partnerId: string
  surveyCode?: string
  questionnaire?: {
    version: string
    submittedAt: string
    answers: SurveyAnswers
    definition?: SurveyDefinition
  }
}
export interface OaAdmissionFields {
  contacts?: { name: string; email: string; position: string; mobile: string }[]
  bankAccounts?: {
    accountName: string
    accountNumber: string
    bankName: string
    bankAddress: string
    currency: string
    taxRate: string
  }[]
  qualifications?: {
    id: string
    project: string
    validity: string
    validUntil: string
    files: Attachment[]
  }[]
  applicationScenario: string
  companyWebsite: string
  supplierGroups: string[]
  legalRepresentative: string
  establishedDate: string
  operatingTerm: string
  operatingUntil: string
  registeredCapital: string
  employeeCount: string
  country: string
  province: string
  city: string
  address: string
  paymentTerms: string
  lastYearRevenue: string
  companyPhone: string
  mainBusiness: string
}
export interface OaAdmissionPayload {
  supplierCode: string
  companyName: string
  creditCode: string
  approvalStatus: string
  fields: OaAdmissionFields
}
export interface Partner {
  businessContacts?: BusinessContact[]
  contactRecycleBin?: { record: BusinessContact; deletedAt: string; deletedBy: string }[]
  id: string
  oaCode: string
  name: string
  creditCode: string
  contact: string
  phone: string
  address: string
  scope: string
  complianceNotes: string
  oaPassed: boolean
  enabled: boolean
  cooperationId: string
  currentContractId: string
  documents: Attachment[]
  events: CsoEvent[]
  oaAdmission?: OaAdmissionFields
  supplementCompleted?: boolean
  representatives?: MedicalRepresentative[]
  representativeRecycleBin?: {
    record: MedicalRepresentative
    deletedAt: string
    deletedBy: string
  }[]
}
export interface MedicalRepresentative {
  attachments?: Attachment[]
  id: string
  name: string
  phone: string
  email: string
  gender: string
  education: string
  major: string
  employmentStatus: '在岗' | '离岗'
  registrationStatus: '待核实' | '未备案' | '已备案' | '已注销'
  registrationNumber: string
  marketingHolder: string
  products: string
  therapeuticArea: string
  region: string
  authorizationStart: string
  authorizationEnd: string
  trainingStatus: '待核实' | '未完成' | '考核合格'
  trainingDate: string
  certificateName: string
  certificateNumber: string
  note: string
  createdAt: string
  updatedAt: string
}
export type MedicalRepresentativeInput = Omit<
  MedicalRepresentative,
  'id' | 'createdAt' | 'updatedAt'
>
export function normalizeMedicalRepresentative(
  input: MedicalRepresentativeInput
): MedicalRepresentativeInput {
  const data = {} as MedicalRepresentativeInput
  for (const key of [
    'name',
    'phone',
    'email',
    'gender',
    'education',
    'major',
    'employmentStatus',
    'registrationStatus',
    'registrationNumber',
    'marketingHolder',
    'products',
    'therapeuticArea',
    'region',
    'authorizationStart',
    'authorizationEnd',
    'trainingStatus',
    'trainingDate',
    'certificateName',
    'certificateNumber',
    'note'
  ] as const) {
    const value = clean(input[key])
    if (
      value.length > (['products', 'therapeuticArea', 'region', 'note'].includes(key) ? 1000 : 200)
    )
      throw new Error('输入内容过长，请缩短后保存')
    Object.assign(data, { [key]: value })
  }
  required(data.name, '姓名')
  if (!/^1[3-9]\d{9}$/.test(data.phone)) throw new Error('请填写11位有效手机号')
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    throw new Error('邮箱格式不正确')
  if (!['在岗', '离岗'].includes(data.employmentStatus)) throw new Error('任职状态无效')
  if (!['待核实', '未备案', '已备案', '已注销'].includes(data.registrationStatus))
    throw new Error('备案状态无效')
  if (!['待核实', '未完成', '考核合格'].includes(data.trainingStatus))
    throw new Error('培训考核状态无效')
  if (data.registrationStatus === '已备案') {
    required(data.registrationNumber, '医药代表备案号')
    required(data.marketingHolder, '备案药品上市许可持有人')
  }
  for (const key of ['authorizationStart', 'authorizationEnd', 'trainingDate'] as const)
    if (data[key]) date(data[key], '日期')
  if (
    data.authorizationStart &&
    data.authorizationEnd &&
    data.authorizationStart > data.authorizationEnd
  )
    throw new Error('授权结束日期不能早于开始日期')
  if (input.attachments !== undefined) data.attachments = attachments(input.attachments)
  return data
}
export function isMedicalRepresentative(value: unknown): value is MedicalRepresentative {
  if (!value || typeof value !== 'object') return false
  const item = value as MedicalRepresentative
  try {
    const data = normalizeMedicalRepresentative(item)
    return (
      Object.keys(data)
        .filter((key) => key !== 'attachments')
        .every((key) => typeof Reflect.get(item, key) === 'string') &&
      !!item.id &&
      typeof item.id === 'string' &&
      Number.isFinite(Date.parse(item.createdAt)) &&
      Number.isFinite(Date.parse(item.updatedAt))
    )
  } catch {
    return false
  }
}
export const BUSINESS_CONTACT_TYPES = [
  '合同联系人',
  '资料收件人',
  '财务联系人',
  '其他联系人'
] as const
export interface BusinessContact {
  id: string
  types: (typeof BUSINESS_CONTACT_TYPES)[number][]
  name: string
  mobile: string
  email: string
  position: string
  address: string
  note: string
  createdAt: string
  updatedAt: string
}
export type BusinessContactInput = Omit<BusinessContact, 'id' | 'createdAt' | 'updatedAt'>
export function normalizeBusinessContact(input: BusinessContactInput): BusinessContactInput {
  if (
    !Array.isArray(input.types) ||
    !input.types.length ||
    input.types.some((type) => !BUSINESS_CONTACT_TYPES.includes(type))
  )
    throw new Error('请选择有效的联系人类型')
  const data = {
    types: [...new Set(input.types)],
    name: required(input.name, '姓名'),
    mobile: clean(input.mobile),
    email: clean(input.email),
    position: clean(input.position),
    address: clean(input.address),
    note: clean(input.note)
  }
  if (!/^1[3-9]\d{9}$/.test(data.mobile)) throw new Error('请填写11位有效手机号码')
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    throw new Error('联系邮箱格式不正确')
  if (data.types.includes('资料收件人') && !data.address)
    throw new Error('资料收件人必须填写收件地址')
  if (
    data.name.length > 60 ||
    data.position.length > 100 ||
    data.address.length > 300 ||
    data.note.length > 1000 ||
    data.email.length > 200
  )
    throw new Error('联系人内容过长，请缩短后保存')
  return data
}
export function isBusinessContact(value: unknown): value is BusinessContact {
  try {
    const item = value as BusinessContact
    normalizeBusinessContact(item)
    return (
      typeof item.id === 'string' &&
      !!item.id &&
      Number.isFinite(Date.parse(item.createdAt)) &&
      Number.isFinite(Date.parse(item.updatedAt))
    )
  } catch {
    return false
  }
}
export function isAttachment(value: unknown): value is Attachment {
  if (!value || typeof value !== 'object') return false
  const item = value as Attachment
  return (
    ['id', 'name', 'mime', 'addedAt'].every((key) => typeof Reflect.get(item, key) === 'string') &&
    !!item.id &&
    !!item.name &&
    Number.isFinite(item.size) &&
    item.size >= 0 &&
    (item.storageKey === undefined || typeof item.storageKey === 'string')
  )
}
export interface AuthorizationGrant {
  product: string
  province: string
  city: string
  mode: '城市授权' | '指定医院' | '排除医院'
  facilities: string
}
export interface AgreementTerms {
  wh?: {
    targetHospitals: ContractHospital[]
    admissionHospitals: ContractHospital[]
    baseBudget: number
    additionalBudget: number
    accountName: string
    bankName: string
    accountNumber: string
  }
  issuer: string
  issuerContact: string
  issuerPhone: string
  issuerEmail: string
  partnerAddress: string
  partnerContact: string
  partnerPhone: string
  partnerEmail: string
  reviewDate: string
  reviewYear: string
  activities: number
  visits: number
  meetings: number
  grants: AuthorizationGrant[]
  monthlyTargets: { month: string; quantity: number }[]
}
export interface ContractHospital {
  province: string
  city: string
  name: string
  level: string
  deadline: string
}
export interface ContractSupplement {
  clauses: { article: string; content: string }[]
  changeGrants: boolean
  effectiveDate: string
  baseSnapshot?: string
}
export type ContractFileKind = 'main' | 'commitment' | 'supplement'
export interface ContractDocument {
  kind: ContractFileKind
  pdf: ContractPdf
}
export interface ContractPdf {
  name: string
  dataUrl: string
  digest: string
  generatedAt: string
  storageKey?: string
}
export interface Contract {
  template?: 'OBU' | 'WH'
  supplement?: ContractSupplement
  documents?: ContractDocument[]
  signingHistory?: { signing: NonNullable<Contract['signing']>; documents: ContractDocument[] }[]
  id: string
  partnerId: string
  cooperationId: string
  code: string
  title: string
  product: string
  province: string
  city: string
  authMode: '城市授权' | '指定医院' | '排除医院'
  hospitals: string
  startDate: string
  endDate: string
  depositRequired: number
  status: '草稿' | '待签署' | '已签署' | 'OA审批中' | 'OA已通过' | '已生效'
  kind: '新签' | '续签' | '变更'
  sourceContractId: string
  terms?: AgreementTerms
  pdf?: ContractPdf
  signing?: {
    formalNumber?: string
    approval?: '已通过' | '已退回'
    approvalAt?: string
    reason?: string
    documents?: ContractDocument[]
    requestId: string
    sentAt: string
    oaNumber?: string
    signedAt?: string
    receivedAt?: string
    signedPdf?: ContractPdf
  }
}
export interface Deposit {
  id: string
  partnerId: string
  cooperationId: string
  amount: number
  payer: string
  reference: string
  paidAt: string
  attachments: Attachment[]
  status: '待确认' | '已到账' | '退回'
  reason: string
}
export interface CsoState {
  surveyDefinition?: SurveyDefinition
  surveyDefinitions?: Record<string, SurveyDefinition>
  intentions: Intention[]
  partners: Partner[]
  contracts: Contract[]
  deposits: Deposit[]
  intentionRecycleBin?: { record: Intention; deletedAt: string; deletedBy: string }[]
  maintenance?: {
    partnerReview20261011?: { appliedAt: string; addedId: string }
    partnerReviewData20261011?: { appliedAt: string; addedIds: string[] }
    agentPortalV1?: { appliedAt: string; addedIds: string[] }
    intentionSurvey20261005?: { appliedAt: string; removedIds: string[] }
    intentionExamples20261008?: { appliedAt: string; addedIds: string[] }
    partnerOa20261008?: { appliedAt: string; updatedIds: string[] }
    partnerStages20261008?: { appliedAt: string; addedIds: string[] }
  }
}

/** Correct generated role labels without rewriting user-entered business content. */
export function normalizeRoleTerminology(state: CsoState): CsoState {
  let changed = false
  const normalizeEvent = (entry: CsoEvent, allowSystemText: boolean): CsoEvent => {
    const actor = entry.actor === '示例业务待办' ? '示例业务代办' : entry.actor
    const text =
      allowSystemText &&
      actor === '示例业务代办' &&
      entry.text === '业务待办人工确认业务启用（本地演示）。'
        ? '业务代办人工确认业务启用（本地演示）。'
        : entry.text
    if (actor === entry.actor && text === entry.text) return entry
    changed = true
    return { ...entry, actor, text }
  }
  const intentions = state.intentions.map((item) => ({
    ...item,
    notes: item.notes.map((entry) => normalizeEvent(entry, false))
  }))
  const partners = state.partners.map((item) => ({
    ...item,
    events: item.events.map((entry) => normalizeEvent(entry, true))
  }))
  return changed ? { ...state, intentions, partners } : state
}

export type IntentionInput = Pick<
  Intention,
  'name' | 'contact' | 'phone' | 'province' | 'city' | 'product' | 'remark'
> & { surveyAnswers?: SurveyAnswers; surveyDefinition?: SurveyDefinition }

export const SURVEY_VERSION = 'wjx-t0byQI5-20261004'
export const SURVEY_TITLE = '希维她代理商合作意向调查问卷'
export type SurveyKey =
  | 'province'
  | 'city'
  | 'company'
  | 'principal'
  | 'companyScale'
  | 'directTeam'
  | 'recruitmentTeam'
  | 'products'
  | 'coveredCities'
  | 'departments'
  | 'hospitalCount'
  | 'hospitals'
  | 'experts'
  | 'gynecologySales'
  | 'sales2025'
  | 'contractQuantity'
  | 'productManager'
  | 'cooperationRegion'
  | 'contactDetails'
export type SurveyAnswers = Record<SurveyKey, string> & Record<string, string>
export interface SurveyQuestion {
  key: string
  number: number
  label: string
  section: string
  type: 'text' | 'multiline' | 'integer' | 'decimal' | 'radio' | 'checkbox'
  required?: boolean
  description?: string
  placeholder: string
  options?: string[]
}
export const SURVEY_SECTIONS = [
  { id: 'company', title: '企业基本信息', icon: 'ri:building-line' },
  { id: 'team', title: '团队与经营', icon: 'ri:team-line' },
  { id: 'market', title: '市场覆盖与资源', icon: 'ri:map-pin-line' },
  { id: 'cooperation', title: '销售与合作意向', icon: 'ri:shake-hands-line' }
]
export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    key: 'province',
    number: 1,
    label: '所在省份',
    section: 'company',
    type: 'text',
    placeholder: '请填写所在省份'
  },
  {
    key: 'city',
    number: 2,
    label: '所在城市',
    section: 'company',
    type: 'text',
    placeholder: '请填写所在城市，可包含区县'
  },
  {
    key: 'company',
    number: 3,
    label: '代理商公司',
    section: 'company',
    type: 'text',
    placeholder: '请填写公司全称'
  },
  {
    key: 'principal',
    number: 4,
    label: '代理商负责人',
    section: 'company',
    type: 'text',
    placeholder: '请填写负责人姓名'
  },
  {
    key: 'companyScale',
    number: 5,
    label: '公司规模（年销售额）',
    section: 'company',
    type: 'radio',
    placeholder: '',
    options: ['500万以下', '500万-1000万', '1000万-5000万', '5000万-1亿', '1亿以上']
  },
  {
    key: 'directTeam',
    number: 6,
    label: '自营团队人数',
    section: 'team',
    type: 'integer',
    placeholder: '请填写人数，无则填0'
  },
  {
    key: 'recruitmentTeam',
    number: 7,
    label: '招商团队人数',
    section: 'team',
    type: 'integer',
    placeholder: '请填写人数，无则填0'
  },
  {
    key: 'products',
    number: 8,
    label: '经营品种',
    section: 'team',
    type: 'multiline',
    placeholder: '请填写目前经营的品种'
  },
  {
    key: 'coveredCities',
    number: 9,
    label: '覆盖城市（县以上）',
    section: 'market',
    type: 'multiline',
    placeholder: '请填写覆盖城市，可填写多个'
  },
  {
    key: 'departments',
    number: 10,
    label: '覆盖科室',
    section: 'market',
    type: 'multiline',
    placeholder: '请填写覆盖科室'
  },
  {
    key: 'hospitalCount',
    number: 11,
    label: '已开发医院家数',
    section: 'market',
    type: 'integer',
    placeholder: '请填写家数，无则填0'
  },
  {
    key: 'hospitals',
    number: 12,
    label: '优势医院名称（可填多家）',
    section: 'market',
    type: 'multiline',
    placeholder: '请填写医院名称，可逐行填写'
  },
  {
    key: 'experts',
    number: 13,
    label: '优势妇科领域专家（姓名及单位，可填多位）',
    section: 'market',
    type: 'multiline',
    placeholder: '请填写姓名及单位，可逐行填写'
  },
  {
    key: 'gynecologySales',
    number: 14,
    label: '妇科&HPV领域每年销售金额',
    section: 'cooperation',
    type: 'decimal',
    placeholder: '请填写销售金额'
  },
  {
    key: 'sales2025',
    number: 15,
    label: '2025年销售额',
    section: 'cooperation',
    type: 'decimal',
    placeholder: '请填写2025年销售额'
  },
  {
    key: 'contractQuantity',
    number: 16,
    label: '希维她合约量（单位：盒）',
    section: 'cooperation',
    type: 'integer',
    placeholder: '请填写合约量'
  },
  {
    key: 'productManager',
    number: 17,
    label: '其他-有无产品经理（讲师）',
    section: 'cooperation',
    type: 'text',
    placeholder: '请填写有无及相关情况'
  },
  {
    key: 'cooperationRegion',
    number: 18,
    label: '其他-意向合作区域',
    section: 'cooperation',
    type: 'multiline',
    placeholder: '请填写意向合作区域'
  },
  {
    key: 'contactDetails',
    number: 19,
    label: '联系方式-邮箱或手机',
    section: 'cooperation',
    type: 'text',
    placeholder: '请填写邮箱或手机号码'
  }
]
export interface SurveyDefinition {
  version: string
  title: string
  introduction?: string
  sections: { id: string; title: string; icon: string }[]
  questions: SurveyQuestion[]
}
export const SURVEY_INTRODUCTION = `尊敬的合作伙伴：

您好！

首先衷心感谢您在百忙之中拨冗参与本次调研。本次问卷由上海亚虹医药有限公司发起，旨在精准洞察意向合作代理商的核心业务布局、市场资源优势与深度合作诉求，依托我方创新药研发实力与产品管线优势，搭建合规、高效、长期共赢的医药商务合作体系，携手开拓创新药市场蓝海，共筑行业价值生态。

本问卷实行严格信息保密制度，所有调研数据仅用于合作评估与商务对接，绝不外泄任何企业机密信息。问卷作答时长约5-8分钟，请您结合企业实际情况如实填写，您的每一项反馈，都将成为双方深度合作的重要依据。期待与您强强联合，共赢创新医药未来！`
export const SURVEY_CORE_KEYS = [
  'company',
  'principal',
  'contactDetails',
  'province',
  'city',
  'companyScale',
  'directTeam',
  'recruitmentTeam',
  'hospitalCount',
  'cooperationRegion',
  'coveredCities'
]
export function currentSurveyDefinition(
  state?: Pick<CsoState, 'surveyDefinition' | 'surveyDefinitions'>,
  code = 'default'
): SurveyDefinition {
  const override =
    state?.surveyDefinitions?.[code] ?? (code === 'default' ? state?.surveyDefinition : undefined)
  const definition: SurveyDefinition = JSON.parse(
    JSON.stringify(
      override ?? {
        version: SURVEY_VERSION,
        title: SURVEY_TITLE,
        sections: SURVEY_SECTIONS,
        questions: SURVEY_QUESTIONS.map((q) => ({ ...q, required: q.key !== 'city' }))
      }
    )
  )
  definition.introduction ??= SURVEY_INTRODUCTION
  return definition
}
export function validateSurveyDefinition(value: SurveyDefinition): void {
  if (
    !value ||
    typeof value.version !== 'string' ||
    !value.version ||
    !Array.isArray(value.sections) ||
    !value.sections.length ||
    !Array.isArray(value.questions)
  )
    throw new Error('问卷须至少保留1个章节')
  if (typeof value.title !== 'string' || !value.title.trim()) throw new Error('请填写问卷标题')
  if (
    value.introduction != null &&
    (typeof value.introduction !== 'string' || value.introduction.length > 5000)
  )
    throw new Error('问卷致辞须为不超过5000字的文字')
  const sectionIds = new Set<string>()
  for (const section of value.sections) {
    if (
      !section ||
      typeof section.id !== 'string' ||
      !section.id ||
      sectionIds.has(section.id) ||
      typeof section.title !== 'string' ||
      !section.title.trim() ||
      typeof section.icon !== 'string'
    )
      throw new Error('请检查章节名称和编号')
    sectionIds.add(section.id)
  }
  const keys = new Set<string>()
  for (const question of value.questions) {
    if (
      !question ||
      typeof question.key !== 'string' ||
      !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(question.key) ||
      ['constructor', 'prototype', '__proto__'].includes(question.key) ||
      keys.has(question.key) ||
      !sectionIds.has(question.section) ||
      typeof question.label !== 'string' ||
      !question.label.trim() ||
      typeof question.placeholder !== 'string' ||
      (question.description !== undefined && typeof question.description !== 'string') ||
      typeof question.required !== 'boolean' ||
      !['text', 'multiline', 'integer', 'decimal', 'radio', 'checkbox'].includes(question.type)
    )
      throw new Error('请检查题目名称、类型及所属章节')
    keys.add(question.key)
    if (
      ['radio', 'checkbox'].includes(question.type) &&
      (!Array.isArray(question.options) ||
        !question.options.length ||
        question.options.some((option) => typeof option !== 'string' || !option.trim()) ||
        new Set(question.options).size !== question.options.length)
    )
      throw new Error('选项不能为空或重复')
  }
  for (const key of SURVEY_CORE_KEYS) {
    // 对齐 BE 口径：保护仅约束已存在的核心题（自定义问卷题目自定，可不含核心题）
    const original = SURVEY_QUESTIONS.find((q) => q.key === key)!
    const question = value.questions.find((q) => q.key === key)
    if (!question) continue
    if (question.type !== original.type) throw new Error('核心问题不能改变题型')
    if (['company', 'principal', 'contactDetails', 'province'].includes(key) && !question.required)
      throw new Error('核心身份信息及省份必须填写')
    if (key === 'city' && question.required) throw new Error('所在城市应保持选填')
  }
}
export function readSurveyContact(value: string): { email: string; mobile: string } | null {
  try {
    const parsed = JSON.parse(value)
    return parsed?.kind === 'email-mobile' &&
      typeof parsed.email === 'string' &&
      typeof parsed.mobile === 'string'
      ? { email: parsed.email, mobile: parsed.mobile }
      : null
  } catch {
    return null
  }
}
export function surveyContactSummary(value: string): string {
  const contact = readSurveyContact(value)
  return contact ? [contact.email.trim(), contact.mobile.trim()].filter(Boolean).join(' / ') : value
}
export function formatSurveyAnswer(question: SurveyQuestion, value?: string): string {
  if (!value) return '—'
  if (question.key === 'contactDetails') {
    const contact = readSurveyContact(value)
    if (contact)
      return '联系邮箱：' + (contact.email || '—') + '\n手机号码：' + (contact.mobile || '—')
  }
  if (question.type === 'checkbox') {
    try {
      return JSON.parse(value).join('、') || '—'
    } catch {
      return value
    }
  }
  return value
}
export function emptySurveyAnswers(questions = SURVEY_QUESTIONS): SurveyAnswers {
  return Object.fromEntries(questions.map((q) => [q.key, ''])) as SurveyAnswers
}
export function isSurveyResponse(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  if (
    typeof record.version !== 'string' ||
    typeof record.submittedAt !== 'string' ||
    !record.answers ||
    typeof record.answers !== 'object'
  )
    return false
  const answers = record.answers as Record<string, unknown>
  if (record.definition !== undefined) {
    try {
      validateSurveyDefinition(record.definition as SurveyDefinition)
    } catch {
      return false
    }
    const definition = record.definition as SurveyDefinition
    return (
      definition.version === record.version &&
      definition.questions.every((q) => typeof answers[q.key] === 'string')
    )
  }
  return SURVEY_QUESTIONS.every((q) => typeof answers[q.key] === 'string')
}
export function surveyAnswerError(question: SurveyQuestion, value: unknown): string {
  if (typeof value !== 'string' || !value.trim())
    return question.required === false ? '' : `请填写${question.label}`
  const text = value.trim()
  if (
    (question.type === 'text' && text.length > 200) ||
    (question.type === 'multiline' && text.length > 2000)
  )
    return `${question.label}不能超过${question.type === 'text' ? 200 : 2000}字`
  if (question.key === 'contactDetails' && text.startsWith('{')) {
    const contact = readSurveyContact(text)
    if (!contact) return '请填写有效的联系方式'
    if (!contact.mobile.trim()) return '请填写手机号码'
    if (!contact.email.trim()) return '请填写联系邮箱'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) return '请填写有效的联系邮箱'
    if (contact.mobile.trim() && !/^1[3-9]\d{9}$/.test(contact.mobile.trim()))
      return '请填写11位有效手机号码'
  }
  if (question.type === 'checkbox') {
    try {
      const selected: unknown = JSON.parse(text)
      if (
        !Array.isArray(selected) ||
        selected.some((item) => !question.options?.includes(item)) ||
        new Set(selected).size !== selected.length
      )
        return '请选择有效选项'
      if (!selected.length && question.required !== false) return `请填写${question.label}`
      return ''
    } catch {
      return '请选择有效选项'
    }
  }
  if (question.type === 'radio' && !question.options?.includes(text)) return '请选择有效选项'
  if (question.type === 'integer' && !/^\d+$/.test(text)) return '请填写0或正整数'
  if (question.type === 'decimal' && !/^\d+(\.\d+)?$/.test(text)) return '请填写有效的非负数字'
  return ''
}
export function normalizeSurveyAnswers(
  input: SurveyAnswers,
  questions = SURVEY_QUESTIONS
): SurveyAnswers {
  const answers = emptySurveyAnswers(questions)
  for (const question of questions) {
    const error = surveyAnswerError(question, input?.[question.key])
    if (error) throw new Error(error)
    answers[question.key] =
      typeof input[question.key] === 'string' ? input[question.key].trim() : ''
  }
  return answers
}
export function surveyIntentionInput(
  input: SurveyAnswers,
  definition?: SurveyDefinition
): IntentionInput {
  if (definition) validateSurveyDefinition(definition)
  const answers = normalizeSurveyAnswers(input, definition?.questions)
  return {
    name: answers.company,
    contact: answers.principal,
    // Retain the existing storage key; this survey accepts email OR phone.
    phone: surveyContactSummary(answers.contactDetails),
    province: answers.province,
    city: answers.city,
    product: '希维她',
    remark: '',
    surveyAnswers: answers,
    ...(definition ? { surveyDefinition: JSON.parse(JSON.stringify(definition)) } : {})
  }
}
export type PartnerInput = Partial<
  Pick<Partner, 'contact' | 'phone' | 'address' | 'scope' | 'complianceNotes'>
>
export type ContractInput = Omit<
  Contract,
  | 'id'
  | 'cooperationId'
  | 'status'
  | 'code'
  | 'sourceContractId'
  | 'pdf'
  | 'signing'
  | 'documents'
  | 'signingHistory'
> & { code?: string; sourceContractId?: string }
export type Command =
  | {
      type: 'saveContractClauses'
      id: string
      snapshot: string
      clauses: ContractSupplement['clauses']
    }
  | { type: 'saveBusinessContact'; partnerId: string; id?: string; input: BusinessContactInput }
  | { type: 'deleteBusinessContact'; partnerId: string; id: string }
  | {
      type: 'saveSurveyDefinition'
      code?: string
      definition: SurveyDefinition
      expectedVersion: string
    }
  | { type: 'deleteMedicalRepresentatives'; partnerId: string; ids: string[] }
  | {
      type: 'saveMedicalRepresentative'
      partnerId: string
      id?: string
      input: MedicalRepresentativeInput
    }
  | { type: 'prepareContractPdf'; id: string; snapshot: string; pdf: ContractPdf }
  | {
      type: 'prepareContractDocuments'
      id: string
      snapshot: string
      documents: ContractDocument[]
    }
  | {
      type: 'receiveContractApproval'
      id: string
      requestId: string
      oaNumber: string
      approved: boolean
      reason: string
    }
  | { type: 'sendContractToOa'; id: string; requestId: string; legacyPdf?: ContractPdf }
  | {
      type: 'receiveContractSigned'
      id: string
      requestId: string
      sourceDigest: string
      oaNumber: string
      signedAt: string
      pdf: ContractPdf
      documents?: ContractDocument[]
      formalNumber?: string
    }
  | { type: 'deleteIntentions'; ids: string[] }
  | { type: 'submitIntention'; surveyCode?: string; input: IntentionInput }
  | { type: 'recordIntention'; id: string; result: Intention['result']; note: string }
  | { type: 'receiveOa'; intentionId: string; supplierCode: string; creditCode: string }
  | { type: 'updatePartner'; id: string; input: PartnerInput; attachments?: Attachment[] }
  | {
      type: 'completePartnerSupplement'
      id: string
      input: PartnerInput
      attachments?: Attachment[]
    }
  | { type: 'saveContract'; id?: string; input: ContractInput }
  | { type: 'submitContract' | 'approveContract' | 'effectContract'; id: string }
  | {
      type: 'submitDeposit'
      partnerId: string
      amount: number
      payer: string
      reference: string
      paidAt: string
      attachments: Attachment[]
    }
  | { type: 'confirmDeposit'; id: string }
  | { type: 'returnDeposit'; id: string; reason: string }
  | { type: 'enablePartner'; id: string }

const roleNames: Record<DemoRole, string> = {
  admin: 'Admin',
  manager: '大区经理',
  operator: '业务代办',
  agent: '代理商'
}
const clean = (value: unknown) => (typeof value === 'string' ? value.trim() : '')
function required(value: unknown, label: string): string {
  const result = clean(value)
  if (!result) throw new Error(`请填写${label}`)
  return result
}
function money(value: number): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isSafeInteger(Math.round(value * 100)) ||
    Math.abs(value * 100 - Math.round(value * 100)) > 0.000001
  ) {
    throw new Error('金额须为非负有限数字，最多两位小数')
  }
  return Math.round(value * 100) / 100
}
function date(value: string, label: string): string {
  const result = required(value, label)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(result) ||
    Number.isNaN(Date.parse(result)) ||
    new Date(result).toISOString().slice(0, 10) !== result
  )
    throw new Error(`${label}格式无效`)
  return result
}
function attachments(items: Attachment[]): Attachment[] {
  if (!Array.isArray(items)) throw new Error('附件元信息无效')
  return items.map((item) => {
    if (!Number.isFinite(item.size) || item.size < 0) throw new Error('附件大小无效')
    return {
      id: required(item.id, '附件编号'),
      name: required(item.name, '附件名称'),
      size: item.size,
      mime: clean(item.mime),
      ...(item.storageKey ? { storageKey: required(item.storageKey, '文件引用') } : {}),
      addedAt: required(item.addedAt, '附件记录时间')
    }
  })
}
function nextId(prefix: string, items: { id: string }[]) {
  let n = items.length + 1
  while (items.some((item) => item.id === `${prefix}${String(n).padStart(3, '0')}`)) n++
  return `${prefix}${String(n).padStart(3, '0')}`
}
function event(items: CsoEvent[], identity: DemoIdentity | null, text: string) {
  items.push({
    id: nextId('event', items),
    at: new Date().toISOString(),
    actor: identity ? roleNames[identity.role] : '问卷提交人',
    text
  })
}
function mustRole(identity: DemoIdentity | null, ...roles: DemoRole[]) {
  if (!identity || (identity.role !== 'admin' && !roles.includes(identity.role)))
    throw new Error('当前账号无此办理权限')
}
function getPartner(state: CsoState, id: string): Partner {
  const item = state.partners.find((partner) => partner.id === id)
  if (!item) throw new Error('代理商不存在')
  return item
}
export function canAccessPartner(identity: DemoIdentity | null, partnerId: string): boolean {
  return (
    !!identity &&
    (identity.role === 'admin' ||
      identity.role === 'manager' ||
      identity.role === 'operator' ||
      (identity.role === 'agent' && identity.partnerId === partnerId))
  )
}
export function getBalance(state: CsoState, partnerId: string): number {
  return (
    state.deposits
      .filter((item) => item.partnerId === partnerId && item.status === '已到账')
      .reduce((sum, item) => sum + Math.round(item.amount * 100), 0) / 100
  )
}
export function getRequirement(state: CsoState, partnerId: string): number {
  const partner = state.partners.find((item) => item.id === partnerId)
  const current = state.contracts.find((item) => item.id === partner?.currentContractId)
  return current && isContractSigned(current) ? current.depositRequired : 0
}
export const isContractSigned = (contract: Contract) =>
  contract.status === '已签署' || contract.status === '已生效'
export const contractStatusLabel = (contract: Contract) =>
  isContractSigned(contract) ? '已签署' : contract.status === '草稿' ? '草稿' : '待签署'
export function contractSnapshot(contract: Contract): string {
  const data = { ...contract }
  delete data.pdf
  delete data.signing
  delete data.documents
  delete data.signingHistory
  return JSON.stringify(data)
}
export const contractFileLabels: Record<ContractFileKind, string> = {
  main: '主协议（含固定附件）',
  commitment: '承诺函',
  supplement: '补充协议'
}
export function contractFileKinds(contract: Contract): ContractFileKind[] {
  return contract.kind === '变更' && contract.supplement
    ? ['supplement']
    : [
        'main',
        'commitment',
        ...(contract.supplement?.clauses.length ? ['supplement' as const] : [])
      ]
}
export function contractFiles(contract: Contract): ContractDocument[] {
  return contract.documents ?? (contract.pdf ? [{ kind: 'main', pdf: contract.pdf }] : [])
}
export function contractRoot(contracts: Contract[], contract: Contract): Contract {
  const visited = new Set<string>()
  let result = contract
  while (result.kind === '变更' && result.supplement && !visited.has(result.id)) {
    visited.add(result.id)
    const source = contracts.find((item) => item.id === result.sourceContractId)
    if (!source) break
    result = source
  }
  return result
}
/** Latest signed agreement in this framework; a supplement never replaces the original document. */
export function latestContract(
  contracts: Contract[],
  contract: Contract,
  asOf = '9999-12-31'
): Contract {
  let result = contractRoot(contracts, contract)
  const visited = new Set<string>()
  while (!visited.has(result.id)) {
    visited.add(result.id)
    const next = contracts.find(
      (item) =>
        item.sourceContractId === result.id &&
        item.kind === '变更' &&
        item.supplement &&
        isContractSigned(item) &&
        item.supplement.effectiveDate <= asOf
    )
    if (!next) break
    result = next
  }
  return result
}
export function currentAuthorizationEntries(contracts: Contract[], root: Contract, asOf: string) {
  let current = contractRoot(contracts, root)
  let entries = contractGrants(current).map((grant) => ({
    grant,
    contract: current,
    startDate: current.startDate,
    endDate: current.endDate
  }))
  const visited = new Set<string>()
  while (!visited.has(current.id)) {
    visited.add(current.id)
    const next = contracts.find(
      (item) =>
        item.sourceContractId === current.id &&
        item.kind === '变更' &&
        item.supplement &&
        isContractSigned(item) &&
        item.supplement.effectiveDate <= asOf
    )
    if (!next) break
    if (next.supplement!.changeGrants)
      entries = contractGrants(next).map(
        (grant) =>
          entries.find((entry) => JSON.stringify(entry.grant) === JSON.stringify(grant)) ?? {
            grant,
            contract: next,
            startDate: next.supplement!.effectiveDate,
            endDate: next.endDate
          }
      )
    current = next
  }
  return entries
}
export function contractGrants(contract: Contract): AuthorizationGrant[] {
  return (
    contract.terms?.grants ?? [
      {
        product: contract.product,
        province: contract.province,
        city: contract.city,
        mode: contract.authMode,
        facilities: contract.hospitals
      }
    ]
  )
}
export function contractMonths(start: string, end: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end)
    return []
  const months: string[] = []
  let year = Number(start.slice(0, 4)),
    month = Number(start.slice(5, 7))
  if (month < 1 || month > 12) return []
  while (months.length < 120) {
    const key = `${year}-${String(month).padStart(2, '0')}`
    if (key > end.slice(0, 7)) break
    months.push(key)
    if (++month > 12) {
      month = 1
      year++
    }
  }
  return months
}
export function validateAgreementTerms(terms: AgreementTerms, start: string, end: string) {
  if (terms.issuer !== '海南亚虹医药贸易有限公司')
    throw new Error('当前协议模板的签约主体为海南亚虹医药贸易有限公司')
  if (terms.wh) {
    for (const amount of [terms.wh.baseBudget, terms.wh.additionalBudget]) money(amount)
    for (const [name, rows] of [
      ['目标医院', terms.wh.targetHospitals],
      ['准入医院', terms.wh.admissionHospitals]
    ] as const) {
      if (!Array.isArray(rows)) throw new Error(`${name}名单无效`)
      for (const row of rows) {
        required(row.province, `${name}省份`)
        required(row.city, `${name}城市`)
        required(row.name, `${name}名称`)
        if (name === '准入医院') {
          required(row.level, '医院级别')
          const deadline = date(row.deadline, '开发完成期限')
          if (deadline < start || deadline > end) throw new Error('开发完成期限须在合同期间内')
        }
      }
    }
  }
  for (const key of ['activities', 'visits', 'meetings'] as const)
    if (!Number.isSafeInteger(terms[key]) || terms[key] < 0) throw new Error('服务目标须为非负整数')
  if (!terms.grants?.length) throw new Error('请至少填写一条产品及区域授权')
  const seen = new Set<string>()
  for (const grant of terms.grants) {
    required(grant.product, '授权产品')
    required(grant.province, '授权省份')
    required(grant.city, '授权城市')
    if (!['城市授权', '指定医院', '排除医院'].includes(grant.mode)) throw new Error('授权方式无效')
    if (grant.mode !== '城市授权') required(grant.facilities, '医院或药房名单')
    const key = JSON.stringify([grant.product.trim(), grant.province.trim(), grant.city.trim()])
    if (seen.has(key)) throw new Error('同一产品、省份及城市请合并为一条授权')
    seen.add(key)
  }
  const months = contractMonths(start, end)
  if (
    !Array.isArray(terms.monthlyTargets) ||
    terms.monthlyTargets.length !== months.length ||
    terms.monthlyTargets.some(
      (item, i) =>
        item.month !== months[i] || !Number.isSafeInteger(item.quantity) || item.quantity < 0
    )
  )
    throw new Error('请按合同期间完整填写月度目标，数量须为非负整数')
}
function validatePdf(pdf: ContractPdf) {
  if (
    !pdf ||
    !pdf.name?.endsWith('.pdf') ||
    (!/^data:application\/pdf;base64,JVBER/.test(pdf.dataUrl) &&
      !(pdf.dataUrl === '' && pdf.storageKey === pdf.digest)) ||
    pdf.dataUrl.length > 4_000_000 ||
    !/^[a-f0-9]{64}$/.test(pdf.digest) ||
    !Number.isFinite(Date.parse(pdf.generatedAt))
  )
    throw new Error('PDF文件无效或过大（最多约3MB）')
}
export function isPartnerSupplementComplete(state: CsoState, partnerId: string): boolean {
  const partner = state.partners.find((item) => item.id === partnerId)
  if (!partner) return false
  // Older records that already have contracts retain their established progress.
  return partner.supplementCompleted ?? state.contracts.some((item) => item.partnerId === partnerId)
}
export function getPartnerBusinessStatus(state: CsoState, partnerId: string): string {
  const partner = state.partners.find((item) => item.id === partnerId)
  if (partner?.enabled) return '已启用'
  if (
    state.contracts.some(
      (item) =>
        item.id === partner?.currentContractId &&
        item.partnerId === partnerId &&
        isContractSigned(item)
    )
  )
    return '合同已生效'
  return partner?.oaPassed ? '待签署合同' : '待准入'
}

export function getReadiness(state: CsoState, partnerId: string): { label: string; ok: boolean }[] {
  const partner = state.partners.find((item) => item.id === partnerId)
  const contract = state.contracts.find(
    (item) => item.id === partner?.currentContractId && item.partnerId === partnerId
  )
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Shanghai' }).format(new Date())
  const requirement = getRequirement(state, partnerId)
  return [
    { label: 'OA准入已通过', ok: !!partner?.oaPassed },
    {
      label: '当前合同已生效且在有效期内',
      ok:
        !!contract &&
        isContractSigned(contract) &&
        contract.startDate <= today &&
        contract.endDate >= today
    },
    { label: '保证金要求已明确', ok: requirement > 0 },
    {
      label: '已确认到账保证金充足',
      ok: requirement > 0 && getBalance(state, partnerId) >= requirement
    }
  ]
}

const oaTextFields = [
  'applicationScenario',
  'companyWebsite',
  'legalRepresentative',
  'establishedDate',
  'operatingTerm',
  'operatingUntil',
  'registeredCapital',
  'employeeCount',
  'country',
  'province',
  'city',
  'address',
  'paymentTerms',
  'lastYearRevenue',
  'companyPhone',
  'mainBusiness'
] as const

export function isOaAdmissionFields(value: unknown): value is OaAdmissionFields {
  if (!value || typeof value !== 'object') return false
  const fields = value as Record<string, unknown>
  return (
    oaTextFields.every((key) => typeof fields[key] === 'string') &&
    Array.isArray(fields.supplierGroups) &&
    fields.supplierGroups.every((item) => typeof item === 'string') &&
    (fields.contacts === undefined ||
      (Array.isArray(fields.contacts) &&
        fields.contacts.every(
          (item) =>
            item &&
            ['name', 'email', 'position', 'mobile'].every((key) => typeof item[key] === 'string')
        ))) &&
    (fields.bankAccounts === undefined ||
      (Array.isArray(fields.bankAccounts) &&
        fields.bankAccounts.every(
          (item) =>
            item &&
            [
              'accountName',
              'accountNumber',
              'bankName',
              'bankAddress',
              'currency',
              'taxRate'
            ].every((key) => typeof item[key] === 'string')
        ))) &&
    (fields.qualifications === undefined ||
      (Array.isArray(fields.qualifications) &&
        fields.qualifications.every(
          (item) =>
            item &&
            ['id', 'project', 'validity', 'validUntil'].every(
              (key) => typeof item[key] === 'string'
            ) &&
            Array.isArray(item.files) &&
            item.files.every(isAttachment)
        )))
  )
}

export function exampleOaAdmission(index: number): OaAdmissionFields {
  return {
    applicationScenario: 'CSO推广服务合作',
    companyWebsite: 'https://example.invalid',
    supplierGroups: ['推广服务', 'CSO服务', '公司'],
    legalRepresentative: index ? '示例法人乙' : '示例法人甲',
    establishedDate: index ? '2016-09-01' : '2018-05-18',
    operatingTerm: index ? '非永久' : '永久',
    operatingUntil: index ? '2046-08-31' : '',
    registeredCapital: index ? '500 万人民币' : '200 万人民币',
    employeeCount: index ? '38' : '18',
    country: '中国',
    province: '江苏省',
    city: index ? '苏州市' : '南京市',
    address: index ? '江苏省苏州市示例路2号' : '江苏省南京市示例路1号',
    paymentTerms: '按合同约定结算',
    lastYearRevenue: index ? '6800' : '2600',
    companyPhone: index ? '0512-00000002' : '025-00000001',
    mainBusiness: '医药市场推广服务、医学信息咨询及相关商务服务。'
  }
}

/** Prototype representation of an approved OA push, independent of the intention workflow. */
export function applyOaAdmission(source: CsoState, input: OaAdmissionPayload): CsoState {
  if (input.approvalStatus !== '通过') throw new Error('仅接收OA准入审批通过的供应商')
  if (!isOaAdmissionFields(input.fields)) throw new Error('OA准入资料结构不完整')
  const supplierCode = required(input.supplierCode, 'OA供应商编码')
  const companyName = required(input.companyName, '公司名称')
  const creditCode = required(input.creditCode, '统一社会信用代码')
  const fields = Object.fromEntries(
    oaTextFields.map((key) => [key, input.fields[key].trim()])
  ) as unknown as OaAdmissionFields
  fields.supplierGroups = input.fields.supplierGroups.map((item) => item.trim()).filter(Boolean)
  const existing = source.partners.find((item) => item.oaCode === supplierCode)
  for (const key of ['contacts', 'bankAccounts', 'qualifications'] as const) {
    const incoming = input.fields[key] ?? existing?.oaAdmission?.[key]
    if (incoming !== undefined)
      Object.assign(fields, { [key]: JSON.parse(JSON.stringify(incoming)) })
  }
  if (existing && existing.creditCode !== creditCode)
    throw new Error('OA供应商编码对应的信用代码不一致')
  if (source.partners.some((item) => item.creditCode === creditCode && item.id !== existing?.id))
    throw new Error('信用代码已关联其他供应商编码')
  if (
    existing?.oaPassed &&
    existing.name === companyName &&
    existing.oaAdmission &&
    oaTextFields.every((key) => existing.oaAdmission?.[key] === fields[key]) &&
    existing.oaAdmission.supplierGroups.length === fields.supplierGroups.length &&
    existing.oaAdmission.supplierGroups.every(
      (item, index) => item === fields.supplierGroups[index]
    ) &&
    ['contacts', 'bankAccounts', 'qualifications'].every(
      (key) =>
        JSON.stringify(Reflect.get(existing.oaAdmission!, key)) ===
        JSON.stringify(Reflect.get(fields, key))
    )
  )
    return source
  const state: CsoState = JSON.parse(JSON.stringify(source))
  let partner = state.partners.find((item) => item.oaCode === supplierCode)
  if (!partner) {
    const id = nextId('p', state.partners)
    partner = {
      id,
      oaCode: supplierCode,
      name: companyName,
      creditCode,
      contact: '',
      phone: '',
      address: '',
      scope: '',
      complianceNotes: '',
      oaPassed: true,
      enabled: false,
      cooperationId: 'coop-' + id,
      currentContractId: '',
      documents: [],
      events: []
    }
    state.partners.push(partner)
  }
  partner.name = companyName
  partner.oaPassed = true
  partner.oaAdmission = fields
  partner.events.push({
    id: nextId('event', partner.events),
    at: new Date().toISOString(),
    actor: 'OA',
    text: existing ? 'OA准入资料已更新。' : 'OA准入审批通过，代理商档案已同步。'
  })
  return state
}

export function createSeedState(): CsoState {
  const partners: Partner[] = ['p001', 'p002'].map((id, index) => ({
    id,
    oaCode: `示例-OA-00${index + 1}`,
    name: `示例${index ? '乙' : '甲'}医药服务有限公司`,
    creditCode: `DEMO-CREDIT-00${index + 1}`,
    contact: `示例联系人${index + 1}`,
    phone: `1380000000${index + 1}`,
    address: '',
    scope: '',
    complianceNotes: '',
    oaPassed: true,
    enabled: false,
    cooperationId: `coop-${id}`,
    currentContractId: index ? 'c002' : '',
    oaAdmission: exampleOaAdmission(index),
    documents: [],
    events: [
      {
        id: 'event001',
        at: '2026-10-02T00:00:00.000Z',
        actor: '系统',
        text: 'OA准入已通过，业务尚未启用。'
      }
    ]
  }))
  return {
    partners,
    intentions: partners.map((partner, index) => ({
      id: `i00${index + 1}`,
      name: partner.name,
      contact: partner.contact,
      phone: partner.phone,
      province: '江苏省',
      city: index ? '苏州市' : '南京市',
      product: '希维她',
      remark: '',
      result: '合作',
      partnerId: partner.id,
      questionnaire: {
        version: SURVEY_VERSION,
        submittedAt: '2026-10-02T00:00:00.000Z',
        answers: {
          province: '江苏省',
          city: index ? '苏州市' : '南京市',
          company: partner.name,
          principal: partner.contact,
          companyScale: index ? '5000万-1亿' : '1000万-5000万',
          directTeam: index ? '25' : '12',
          recruitmentTeam: index ? '8' : '4',
          products: index
            ? '妇科诊疗产品、HPV检测产品及妇科创新药'
            : '妇科处方药、HPV检测产品及女性健康相关产品',
          coveredCities: index ? '苏州市、无锡市、常州市' : '南京市、镇江市、扬州市',
          departments: index ? '妇科、妇科肿瘤科、检验科' : '妇科、妇科门诊、检验科',
          hospitalCount: index ? '32' : '18',
          hospitals: index
            ? '苏州示例医院\n无锡示例妇幼医院\n常州示例医院'
            : '南京示例医院\n镇江示例妇幼医院\n扬州示例医院',
          experts: index
            ? '示例专家乙｜苏州示例医院妇科\n示例专家丁｜无锡示例妇幼医院'
            : '示例专家甲｜南京示例医院妇科\n示例专家丙｜镇江示例妇幼医院',
          gynecologySales: index ? '34000000' : '9500000',
          sales2025: index ? '68000000' : '26000000',
          contractQuantity: index ? '7200' : '3000',
          productManager: index ? '有，2名产品经理及3名区域讲师' : '有，1名产品经理及1名区域讲师',
          cooperationRegion: index ? '江苏省苏州市、无锡市' : '江苏省南京市、镇江市',
          contactDetails: partner.phone
        }
      },
      notes: [
        {
          id: 'event001',
          at: '2026-10-02T00:00:00.000Z',
          actor: '大区经理',
          text: '约谈已完成，标记合作。'
        }
      ]
    })),
    contracts: [
      {
        id: 'c002',
        partnerId: 'p002',
        cooperationId: 'coop-p002',
        code: '示例-HT-002',
        title: '示例乙推广服务合同',
        product: '示例产品',
        province: '江苏省',
        city: '苏州市',
        authMode: '城市授权',
        hospitals: '',
        startDate: '2026-01-01',
        endDate: '2027-12-31',
        depositRequired: 20000,
        status: '已生效',
        kind: '新签',
        sourceContractId: ''
      }
    ],
    deposits: [
      {
        id: 'd002',
        partnerId: 'p002',
        cooperationId: 'coop-p002',
        amount: 20000,
        payer: partners[1].name,
        reference: '示例银行流水002',
        paidAt: '2026-10-01',
        attachments: [
          {
            id: 'demo-receipt',
            name: '示例到账凭证.pdf',
            size: 20480,
            mime: 'application/pdf',
            addedAt: '2026-10-01T00:00:00.000Z'
          }
        ],
        status: '待确认',
        reason: ''
      }
    ]
  }
}

export function applyCommand(
  source: CsoState,
  identity: DemoIdentity | null,
  command: Command
): CsoState {
  // JSON conversion handles Vue proxies; command values remain intact for finite-number validation.
  const state: CsoState = JSON.parse(JSON.stringify(source))
  switch (command.type) {
    case 'saveBusinessContact':
    case 'deleteBusinessContact': {
      mustRole(identity, 'operator', 'agent')
      if (!canAccessPartner(identity, command.partnerId))
        throw new Error('无权限维护其他代理商联系人')
      const partner = getPartner(state, command.partnerId)
      const records = partner.businessContacts ?? []
      const existing = command.id ? records.find((item) => item.id === command.id) : undefined
      if (command.id && !existing) throw new Error('联系人记录已变化，请刷新后重试')
      if (command.type === 'deleteBusinessContact') {
        if (!existing) throw new Error('联系人不存在')
        partner.contactRecycleBin = [
          ...(partner.contactRecycleBin ?? []),
          {
            record: existing,
            deletedAt: new Date().toISOString(),
            deletedBy: roleNames[identity!.role]
          }
        ]
        partner.businessContacts = records.filter((item) => item.id !== command.id)
        event(partner.events, identity, '删除业务联系人：' + existing.name)
      } else {
        const input = normalizeBusinessContact(command.input)
        const now = new Date().toISOString()
        const record: BusinessContact = {
          ...input,
          id:
            existing?.id ??
            nextId('contact', [
              ...records,
              ...(partner.contactRecycleBin ?? []).map((item) => item.record)
            ]),
          createdAt: existing?.createdAt ?? now,
          updatedAt: now
        }
        partner.businessContacts = existing
          ? records.map((item) => (item.id === existing.id ? record : item))
          : [...records, record]
        event(partner.events, identity, (existing ? '更新' : '新增') + '业务联系人：' + record.name)
      }
      break
    }
    case 'saveSurveyDefinition': {
      if (identity?.role !== 'admin') throw new Error('当前身份没有配置问卷的权限')
      const code = command.code ?? 'default'
      if (command.expectedVersion !== currentSurveyDefinition(state, code).version)
        throw new Error('问卷配置已更新，请重新载入后再保存')
      validateSurveyDefinition(command.definition)
      state.surveyDefinitions ??= {}
      const next = JSON.parse(JSON.stringify(command.definition))
      next.version = 'survey-' + crypto.randomUUID()
      next.questions = next.sections.flatMap((section: { id: string }) =>
        next.questions.filter((q: SurveyQuestion) => q.section === section.id)
      )
      next.questions = next.questions.map((q: SurveyQuestion, index: number) => ({
        ...q,
        number: index + 1
      }))
      state.surveyDefinitions[code] = next
      if (code === 'default') state.surveyDefinition = JSON.parse(JSON.stringify(next))
      break
    }
    case 'submitIntention': {
      const surveyCode = command.surveyCode ?? 'default'
      const definition = command.input.surveyDefinition
      if (
        definition &&
        JSON.stringify(definition) !== JSON.stringify(currentSurveyDefinition(state, surveyCode))
      )
        throw new Error('问卷配置已更新，请重新载入问卷后提交')
      const input = command.input.surveyAnswers
        ? surveyIntentionInput(command.input.surveyAnswers, definition)
        : command.input
      if (
        state.intentions.some(
          (item) =>
            (item.surveyCode ?? 'default') === surveyCode && item.name.trim() === input.name.trim()
        )
      )
        throw new Error('该企业已提交过合作意向，请勿重复提交')
      state.intentions.push({
        id: nextId('i', state.intentions),
        surveyCode,
        name: required(input.name, '企业名称'),
        contact: required(input.contact, '联系人'),
        phone: required(input.phone, '联系方式'),
        province: required(input.province, '意向省份'),
        city: clean(input.city),
        product: required(input.product, '意向产品'),
        remark: clean(input.remark),
        result: '待洽谈',
        notes: [],
        partnerId: '',
        ...(input.surveyAnswers
          ? {
              questionnaire: {
                version: definition?.version ?? SURVEY_VERSION,
                submittedAt: new Date().toISOString(),
                answers: input.surveyAnswers,
                ...(definition ? { definition: JSON.parse(JSON.stringify(definition)) } : {})
              }
            }
          : {})
      })
      break
    }
    case 'deleteIntentions': {
      mustRole(identity, 'manager', 'operator')
      if (!Array.isArray(command.ids) || !command.ids.length)
        throw new Error('请先选择要删除的意向')
      const ids = [...new Set(command.ids)]
      const records = ids.map((id) => state.intentions.find((item) => item.id === id))
      if (records.some((item) => !item)) throw new Error('部分意向已不存在，请刷新后重新选择')
      state.intentionRecycleBin ??= []
      const deletedAt = new Date().toISOString()
      for (const record of records) {
        state.intentionRecycleBin.push({
          record: record!,
          deletedAt,
          deletedBy: roleNames[identity!.role]
        })
      }
      state.intentions = state.intentions.filter((item) => !ids.includes(item.id))
      break
    }
    case 'recordIntention': {
      mustRole(identity, 'manager', 'operator')
      const item = state.intentions.find((item) => item.id === command.id)
      if (!item) throw new Error('合作意向不存在')
      if (!['待洽谈', '合作', '不合作'].includes(command.result)) throw new Error('合作结果无效')
      if (item.partnerId && command.result !== '合作')
        throw new Error('已关联OA档案，不能改为非合作结果')
      const note = required(command.note, '约谈记录')
      item.result = command.result
      event(item.notes, identity, `${command.result}：${note}`)
      break
    }
    case 'receiveOa': {
      // Historical test adapter only; current OA pushes use applyOaAdmission without an intention prerequisite.
      mustRole(identity, 'operator')
      const item = state.intentions.find((item) => item.id === command.intentionId)
      if (!item || item.result !== '合作') throw new Error('仅合作意向可接收OA通过回传')
      const oaCode = required(command.supplierCode, 'OA供应商编码')
      const creditCode = required(command.creditCode, '统一社会信用代码')
      const existing = state.partners.find((partner) => partner.oaCode === oaCode)
      if (item.partnerId) {
        const linked = getPartner(state, item.partnerId)
        if (linked.oaCode !== oaCode || linked.creditCode !== creditCode)
          throw new Error('回传供应商与已关联档案不一致')
        break
      }
      if (existing || state.partners.some((partner) => partner.creditCode === creditCode))
        throw new Error('供应商编码或信用代码与已有档案冲突，请核对意向关联')
      const id = nextId('p', state.partners)
      const partner: Partner = {
        id,
        oaCode,
        creditCode,
        name: item.name,
        contact: item.contact,
        phone: item.phone,
        address: '',
        scope: '',
        complianceNotes: '',
        oaPassed: true,
        enabled: false,
        cooperationId: `coop-${id}`,
        currentContractId: '',
        documents: [],
        events: []
      }
      event(partner.events, identity, 'OA准入已通过。')
      item.partnerId = id
      state.partners.push(partner)
      break
    }
    case 'saveMedicalRepresentative': {
      mustRole(identity, 'operator', 'agent')
      if (!canAccessPartner(identity, command.partnerId))
        throw new Error('无权限维护其他代理商的医药代表')
      const partner = getPartner(state, command.partnerId)
      const records = partner.representatives ?? []
      const existing = command.id ? records.find((item) => item.id === command.id) : undefined
      if (command.id && !existing) throw new Error('医药代表记录不存在')
      const input = normalizeMedicalRepresentative(command.input)
      const files = command.input.attachments ?? existing?.attachments
      if (files !== undefined) {
        input.attachments = attachments(files)
        if (
          input.attachments.some(
            (file) => file.storageKey && file.storageKey !== 'partner:' + partner.id + ':' + file.id
          )
        )
          throw new Error('附件不属于当前代理商')
      }
      if (records.some((item) => item.id !== command.id && item.phone === input.phone))
        throw new Error('该手机号已在本代理商的医药代表中登记，请编辑已有记录')
      const now = new Date().toISOString()
      const record: MedicalRepresentative = {
        ...input,
        id:
          existing?.id ??
          nextId('rep', [
            ...records,
            ...(partner.representativeRecycleBin ?? []).map((item) => item.record)
          ]),
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
      }
      partner.representatives = existing
        ? records.map((item) => (item.id === existing.id ? record : item))
        : [...records, record]
      event(
        partner.events,
        identity,
        `${existing ? '更新' : '新增'}医药代表 ${record.name}（${record.employmentStatus}）。`
      )
      break
    }
    case 'deleteMedicalRepresentatives': {
      mustRole(identity, 'operator', 'agent')
      if (!canAccessPartner(identity, command.partnerId))
        throw new Error('无权限删除其他代理商的医药代表')
      const partner = getPartner(state, command.partnerId)
      if (
        !Array.isArray(command.ids) ||
        !command.ids.length ||
        new Set(command.ids).size !== command.ids.length
      )
        throw new Error('请选择有效的医药代表记录')
      const records = partner.representatives ?? []
      if (command.ids.some((id) => !records.some((record) => record.id === id)))
        throw new Error('部分医药代表记录已变化，请刷新后重新选择')
      const ids = new Set(command.ids)
      const deleted = records.filter((record) => ids.has(record.id))
      partner.representativeRecycleBin = [
        ...(partner.representativeRecycleBin ?? []),
        ...deleted.map((record) => ({
          record,
          deletedAt: new Date().toISOString(),
          deletedBy: roleNames[identity!.role]
        }))
      ]
      partner.representatives = records.filter((record) => !ids.has(record.id))
      event(
        partner.events,
        identity,
        `删除医药代表：${deleted.map((record) => record.name).join('、')}。`
      )
      break
    }
    case 'updatePartner':
    case 'completePartnerSupplement': {
      mustRole(identity, 'operator', 'agent')
      if (!canAccessPartner(identity, command.id)) throw new Error('无权限处理其他代理商档案')
      const partner = getPartner(state, command.id)
      if (command.type === 'completePartnerSupplement' && !partner.oaPassed)
        throw new Error('OA准入尚未通过')
      for (const key of ['contact', 'phone', 'address', 'scope', 'complianceNotes'] as const) {
        if (command.input[key] !== undefined) partner[key] = clean(command.input[key])
      }
      if (command.attachments) partner.documents = attachments(command.attachments)
      if (command.type === 'completePartnerSupplement') {
        partner.supplementCompleted = true
        event(partner.events, identity, '补充资料已确认完成。')
      } else event(partner.events, identity, '保存档案补充资料。')
      break
    }
    case 'saveContractClauses': {
      mustRole(identity, 'manager')
      const contract = state.contracts.find((item) => item.id === command.id)
      if (!contract || contract.status !== '草稿') throw new Error('仅草稿可修改补充协议')
      if (contractSnapshot(contract) !== command.snapshot)
        throw new Error('合同已变化，请重新打开补充协议')
      if (!Array.isArray(command.clauses)) throw new Error('补充协议内容无效')
      const clauses = command.clauses.map((clause) => ({
        article: required(clause.article, '原条款编号'),
        content: required(clause.content, '变更后的完整条款')
      }))
      if (contract.kind === '变更' && !contract.supplement?.changeGrants && !clauses.length)
        throw new Error('补充协议须保留条款或产品区域变更')
      if (JSON.stringify(clauses) === JSON.stringify(contract.supplement?.clauses ?? [])) break
      if (clauses.length || contract.kind === '变更') {
        contract.supplement = {
          changeGrants: false,
          effectiveDate: '',
          ...contract.supplement,
          clauses
        }
      } else delete contract.supplement
      delete contract.pdf
      delete contract.documents
      event(
        getPartner(state, contract.partnerId).events,
        identity,
        `更新补充协议 ${contract.code}。`
      )
      break
    }
    case 'saveContract': {
      mustRole(identity, 'manager')
      const input = command.input
      const partner = getPartner(state, input.partnerId)
      if (!partner.oaPassed) throw new Error('OA准入尚未通过')
      const existing = command.id
        ? state.contracts.find((item) => item.id === command.id)
        : undefined
      if (command.id && !existing) throw new Error('合同不存在')
      if (existing && (existing.status !== '草稿' || existing.partnerId !== partner.id))
        throw new Error('仅可编辑同一代理商的草稿合同')
      if (!['新签', '续签', '变更'].includes(input.kind)) throw new Error('合同类型无效')
      const sourceId = clean(input.sourceContractId)
      if (
        input.kind !== '新签' &&
        !state.contracts.some(
          (item) => item.id === sourceId && item.partnerId === partner.id && isContractSigned(item)
        )
      )
        throw new Error('续签或变更须关联同一代理商的已生效来源合同')
      if (input.kind === '新签' && sourceId) throw new Error('新签不能指定来源合同')
      if (!['城市授权', '指定医院', '排除医院'].includes(input.authMode))
        throw new Error('授权方式无效')
      const startDate = date(input.startDate, '合同开始日期')
      const endDate = date(input.endDate, '合同结束日期')
      if (startDate > endDate) throw new Error('合同结束日期不能早于开始日期')
      if (input.terms) validateAgreementTerms(input.terms, startDate, endDate)
      if (input.template && !['OBU', 'WH'].includes(input.template)) throw new Error('合同模板无效')
      if (input.template === 'WH' && !input.terms?.wh) throw new Error('请补齐WH合同填写项')
      const source = state.contracts.find((item) => item.id === sourceId)
      if (input.supplement) {
        const supplement = input.supplement
        if (!Array.isArray(supplement.clauses)) throw new Error('补充协议内容无效')
        for (const clause of supplement.clauses) {
          required(clause.article, '原条款编号')
          required(clause.content, '变更后条款内容')
        }
        if (input.kind === '变更') {
          if (!source || latestContract(state.contracts, source).id !== source.id)
            throw new Error('原合同已有新的补充协议，请基于最新有效约定重新发起')
          if (supplement.baseSnapshot !== contractSnapshot(source))
            throw new Error('来源合同内容已变化，请重新发起')
          const effective = date(supplement.effectiveDate, '变更生效日期')
          if (
            effective < startDate ||
            effective > endDate ||
            (source.supplement && effective < source.supplement.effectiveDate)
          )
            throw new Error('变更生效日期须在合同期间内且不得早于上一补充协议')
          if (!supplement.changeGrants && !supplement.clauses.length)
            throw new Error('请填写变更内容或调整产品与区域')
          const beforeTerms = { ...source.terms, grants: undefined }
          const afterTerms = { ...input.terms, grants: undefined }
          if (
            startDate !== source.startDate ||
            endDate !== source.endDate ||
            input.depositRequired !== source.depositRequired ||
            (input.template ?? 'OBU') !== (source.template ?? 'OBU') ||
            (source.terms && JSON.stringify(beforeTerms) !== JSON.stringify(afterTerms))
          )
            throw new Error('本次补充协议仅调整文字条款及产品区域，其他结构化约定须保留')
          if (
            !supplement.changeGrants &&
            JSON.stringify(input.terms?.grants) !== JSON.stringify(contractGrants(source))
          )
            throw new Error('未选择产品区域变更，不能修改授权')
        } else if (supplement.changeGrants)
          throw new Error('首次签约条款补充不单独修改授权，请填写主协议授权')
      }
      if (input.authMode !== '城市授权' && !clean(input.hospitals))
        throw new Error('请填写医院名单')
      const id = existing?.id ?? nextId('c', state.contracts)
      const contract: Contract = {
        id,
        partnerId: partner.id,
        cooperationId: partner.cooperationId,
        code: existing?.code ?? (clean(input.code) || `HT-${id}`),
        title: required(input.title, '合同标题'),
        product: required(input.product, '产品'),
        province: required(input.province, '省份'),
        city: required(input.city, '城市'),
        authMode: input.authMode,
        hospitals: input.authMode === '城市授权' ? '' : clean(input.hospitals),
        startDate,
        endDate,
        depositRequired: money(input.depositRequired),
        status: '草稿',
        kind: input.kind,
        sourceContractId: sourceId,
        ...(input.template ? { template: input.template } : {}),
        ...(input.supplement ? { supplement: JSON.parse(JSON.stringify(input.supplement)) } : {}),
        ...(existing?.signingHistory ? { signingHistory: existing.signingHistory } : {}),
        ...(input.terms ? { terms: JSON.parse(JSON.stringify(input.terms)) as AgreementTerms } : {})
      }
      if (existing) state.contracts.splice(state.contracts.indexOf(existing), 1, contract)
      else state.contracts.push(contract)
      event(partner.events, identity, `保存${contract.kind}合同草稿 ${contract.code}。`)
      break
    }
    case 'prepareContractDocuments':
    case 'prepareContractPdf': {
      mustRole(identity, 'manager')
      const contract = state.contracts.find((item) => item.id === command.id)
      if (!contract || contract.status !== '草稿') throw new Error('仅草稿可生成签署PDF')
      if (contractSnapshot(contract) !== command.snapshot)
        throw new Error('合同内容已变更，请重新生成PDF')
      if (!contract.terms) throw new Error('请先编辑草稿，补齐协议及承诺函信息')
      validateAgreementTerms(contract.terms, contract.startDate, contract.endDate)
      if (command.type === 'prepareContractDocuments') {
        const kinds = contractFileKinds(contract)
        if (
          command.documents.length !== kinds.length ||
          kinds.some((kind) => command.documents.filter((item) => item.kind === kind).length !== 1)
        )
          throw new Error('请完整生成本次签约文件')
        command.documents.forEach((item) => validatePdf(item.pdf))
        contract.documents = JSON.parse(JSON.stringify(command.documents))
        contract.pdf = { ...command.documents[0].pdf }
      } else {
        validatePdf(command.pdf)
        contract.pdf = { ...command.pdf }
        delete contract.documents
      }
      event(
        getPartner(state, contract.partnerId).events,
        identity,
        `生成合同PDF ${contract.code}。`
      )
      break
    }
    case 'sendContractToOa': {
      mustRole(identity, 'manager')
      const contract = state.contracts.find((item) => item.id === command.id)
      const legacy =
        contract && ['OA审批中', 'OA已通过'].includes(contract.status) && !contract.signing
      if (legacy && command.legacyPdf) {
        validatePdf(command.legacyPdf)
        contract.pdf = { ...command.legacyPdf }
      }
      if (!contract || !contract.pdf) throw new Error('请先生成合同PDF')
      const requestId = required(command.requestId, '接口请求编号')
      if (contract.signing?.requestId === requestId && contract.status === '待签署') break
      if (contract.status !== '草稿' && !legacy) throw new Error('该合同已发送，请勿重复提交')
      if (state.contracts.some((item) => item.signing?.requestId === requestId))
        throw new Error('接口请求编号重复')
      validatePdf(contract.pdf)
      contract.signing = { requestId, sentAt: new Date().toISOString() }
      contract.status = '待签署'
      event(
        getPartner(state, contract.partnerId).events,
        identity,
        `合同PDF已发送OA，等待签署结果 ${contract.code}。`
      )
      break
    }
    case 'receiveContractApproval': {
      mustRole(identity, 'operator')
      const contract = state.contracts.find((item) => item.id === command.id)
      if (
        !contract?.signing ||
        contract.status !== '待签署' ||
        contract.signing.requestId !== command.requestId
      )
        throw new Error('审批回传与待签署记录不匹配')
      contract.signing.oaNumber = required(command.oaNumber, '外部流程编号')
      contract.signing.approval = command.approved ? '已通过' : '已退回'
      contract.signing.approvalAt = new Date().toISOString()
      if (!command.approved) {
        contract.signing.reason = required(command.reason, '退回原因')
        contract.signingHistory = [
          ...(contract.signingHistory ?? []),
          {
            signing: JSON.parse(JSON.stringify(contract.signing)),
            documents: JSON.parse(JSON.stringify(contractFiles(contract)))
          }
        ]
        delete contract.signing
        contract.status = '草稿'
        delete contract.pdf
        delete contract.documents
      }
      event(
        getPartner(state, contract.partnerId).events,
        identity,
        `外部审批${command.approved ? '通过，仍待签署' : '退回'} ${contract.code}。`
      )
      break
    }
    case 'receiveContractSigned': {
      mustRole(identity, 'operator')
      const contract = state.contracts.find((item) => item.id === command.id)
      if (
        !contract?.signing ||
        !contract.pdf ||
        contract.signing.requestId !== command.requestId ||
        contract.pdf.digest !== command.sourceDigest
      )
        throw new Error('OA回传与合同发送版本不匹配')
      const oaNumber = required(command.oaNumber, 'OA编号')
      const signedAt = date(command.signedAt, '签署完成日期')
      validatePdf(command.pdf)
      if (contract.documents) {
        const signed = command.documents ?? []
        if (
          signed.length !== contract.documents.length ||
          contract.documents.some(
            (item) => signed.filter((file) => file.kind === item.kind).length !== 1
          )
        )
          throw new Error('请按文件类型完整接收签署文件')
        for (const item of signed) {
          validatePdf(item.pdf)
          if (contract.documents.some((file) => file.pdf.digest === item.pdf.digest))
            throw new Error('签署文件不能使用待签PDF')
        }
        if (signed[0]?.pdf.digest !== command.pdf.digest) throw new Error('签署文件清单不一致')
      }
      if (command.pdf.digest === contract.pdf.digest)
        throw new Error('请提供OA回传的签署文件，不能使用待签PDF')
      if (contract.status === '已签署') {
        if (
          contract.signing.signedPdf?.digest === command.pdf.digest &&
          contract.signing.oaNumber === oaNumber &&
          contract.signing.signedAt === signedAt &&
          JSON.stringify(contract.signing.documents) === JSON.stringify(command.documents) &&
          (contract.signing.formalNumber ?? '') === (command.formalNumber ?? '')
        )
          break
        throw new Error('该合同已签署，不能覆盖既有回传记录')
      }
      if (contract.status !== '待签署') throw new Error('仅待签署合同可接收签署结果')
      const partner = getPartner(state, contract.partnerId)
      if (contract.kind === '变更' && contract.supplement) {
        const source = state.contracts.find((item) => item.id === contract.sourceContractId)
        if (
          !source ||
          latestContract(state.contracts, source).id !== source.id ||
          contract.supplement.baseSnapshot !== contractSnapshot(source)
        )
          throw new Error('来源合同已有更新，请核对后重新发起补充协议')
      }
      contract.status = '已签署'
      Object.assign(contract.signing, {
        oaNumber,
        signedAt,
        receivedAt: new Date().toISOString(),
        signedPdf: { ...command.pdf },
        ...(command.documents ? { documents: JSON.parse(JSON.stringify(command.documents)) } : {}),
        ...(command.formalNumber ? { formalNumber: command.formalNumber.trim() } : {})
      })
      if (!(contract.kind === '变更' && contract.supplement))
        partner.currentContractId = contract.id
      event(
        partner.events,
        identity,
        `OA回传签署完成 ${contract.code}；产品、区域授权及保证金约定生效。`
      )
      break
    }
    case 'submitContract':
    case 'approveContract':
    case 'effectContract': {
      mustRole(identity, 'manager')
      const contract = state.contracts.find((item) => item.id === command.id)
      if (!contract) throw new Error('合同不存在')
      const expected = {
        submitContract: '草稿',
        approveContract: 'OA审批中',
        effectContract: 'OA已通过'
      }[command.type]
      if (contract.status !== expected) throw new Error(`仅${expected}合同可执行此动作`)
      const partner = getPartner(state, contract.partnerId)
      if (command.type === 'submitContract') contract.status = 'OA审批中'
      if (command.type === 'approveContract') contract.status = 'OA已通过'
      if (command.type === 'effectContract') {
        if (partner.enabled && partner.currentContractId !== contract.id) {
          throw new Error('当前合作已启用，请先核对合同变更及启用条件')
        }
        contract.status = '已生效'
        partner.currentContractId = contract.id
      }
      event(
        partner.events,
        identity,
        command.type === 'submitContract'
          ? `提交OA合同流程 ${contract.code}。`
          : `合同 ${contract.code} ${contract.status}。`
      )
      break
    }
    case 'submitDeposit': {
      mustRole(identity, 'agent')
      if (!canAccessPartner(identity, command.partnerId))
        throw new Error('无权限提交其他代理商凭证')
      const partner = getPartner(state, command.partnerId)
      const amount = money(command.amount)
      if (amount === 0) throw new Error('缴款金额须大于零')
      const files = attachments(command.attachments)
      if (!files.length) throw new Error('请选择缴款凭证')
      const reference = required(command.reference, '银行流水号')
      if (
        state.deposits.some(
          (item) =>
            item.cooperationId === partner.cooperationId &&
            clean(item.reference) === reference &&
            item.status !== '退回'
        )
      ) {
        throw new Error('该银行流水号已有待确认或已到账记录，请勿重复提交')
      }
      state.deposits.push({
        id: nextId('d', state.deposits),
        partnerId: partner.id,
        cooperationId: partner.cooperationId,
        amount,
        payer: required(command.payer, '付款方'),
        reference,
        paidAt: date(command.paidAt, '付款日期'),
        attachments: files,
        status: '待确认',
        reason: ''
      })
      event(partner.events, identity, `提交缴款凭证，金额 ${amount.toFixed(2)}，尚未确认到账。`)
      break
    }
    case 'confirmDeposit':
    case 'returnDeposit': {
      mustRole(identity, 'operator')
      const deposit = state.deposits.find((item) => item.id === command.id)
      if (!deposit || deposit.status !== '待确认')
        throw new Error('仅待确认凭证可办理，不可重复确认')
      money(deposit.amount)
      if (command.type === 'returnDeposit') {
        deposit.reason = required(command.reason, '退回原因')
        deposit.status = '退回'
      } else deposit.status = '已到账'
      event(
        getPartner(state, deposit.partnerId).events,
        identity,
        `${deposit.status}：缴款 ${deposit.amount.toFixed(2)}${deposit.reason ? `，${deposit.reason}` : ''}。`
      )
      break
    }
    case 'enablePartner': {
      mustRole(identity, 'operator')
      const partner = getPartner(state, command.id)
      if (partner.enabled) throw new Error('该代理商业务已启用，不可重复办理')
      if (getReadiness(state, partner.id).some((item) => !item.ok))
        throw new Error('业务启用条件未满足，请检查OA准入、有效合同及保证金到账')
      partner.enabled = true
      event(partner.events, identity, '确认业务启用。')
      break
    }
    default:
      throw new Error('未知业务命令')
  }
  return state
}
