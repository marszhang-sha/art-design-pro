/**
 * Cooperation 意向池 API 封装（契约 cooperation-api-contract r2，Base /api/v1）
 *
 * 覆盖：匿名问卷段（定义读取/邮箱验证码/提交）、管理段（问卷配置/意向池分页/
 * 详情/约谈登记/软删）。错误：RFC 7807 → HttpError(detail, 'COOP-xxxx')，
 * 由 http 层统一解析；提交防重 409 COOP-2001、乐观锁 409 COOP-2002、
 * 验证码 400 COOP-4003、频控 429 IAM-1004。
 */

import request from '@/utils/http'
import type { SurveyDefinition, SurveyQuestion } from '@/views/cso/domain'

const BASE = '/api/v1/coop'

// ---------- 类型（BE 响应字段与 domain.ts 同构；result 为服务端枚举） ----------

export type CoopResult = 'PENDING' | 'COOPERATED' | 'REJECTED'

export type CoopSurveySection = { id: string; title: string; icon: string }

export interface CoopSurveyDefinition {
  id?: number
  code?: string
  version: string
  title: string
  introduction?: string
  sections: CoopSurveySection[]
  questions: SurveyQuestion[]
}

export interface CoopSurveySummary {
  code: string
  version: string
  title: string
  created_at: string
}

export interface CoopIntentionListItem {
  id: string
  surveyCode: string
  company: string
  principal: string
  phone: string
  email: string
  province: string
  city: string | null
  companyScale: string
  cooperationRegion: string
  directTeam: number
  recruitmentTeam: number
  hospitalCount: number
  result: CoopResult
  createdAt: string
}

export interface CoopPage<T> {
  items: T[]
  page: number
  size: number
  total: number
}

export interface CoopIntentionDetail extends Omit<CoopIntentionListItem, 'result'> {
  result: CoopResult
  definitionVersion: string
  answers: Record<string, string>
  definitionSnapshot: SurveyDefinition | null
  notes: { actor: string; text: string; createdAt: string }[]
}

/** 提交体（契约 §3.1；数值题为前端字符串答案，此处转数值） */
export interface CoopIntentionSubmitInput {
  surveyCode: string
  definitionVersion: string
  answers: Record<string, string>
  company: string
  principal: string
  phone: string
  email: string
  emailCode: string
  province: string
  city?: string
  companyScale: string
  directTeam: number
  recruitmentTeam: number
  products: string
  coveredCities: string
  departments?: string
  hospitalCount: number
  hospitals?: string
  experts?: string
  gynecologySales: number
  sales2025: number
  contractQuantity: number
  productManager: string
  cooperationRegion: string
}

export const COOP_RESULT_LABEL: Record<CoopResult, string> = {
  PENDING: '待洽谈',
  COOPERATED: '合作',
  REJECTED: '不合作'
}

// ---------- 匿名问卷段 ----------

export const coopIntentSurveyApi = {
  /** 在用问卷定义（填写页渲染/配置编辑读取同端点） */
  getDefinition(code: string) {
    return request.get<CoopSurveyDefinition>({ url: `${BASE}/intent-survey/${code}/definition` })
  },
  /** 发送 6 位邮箱验证码；60s/日 10 条（429 IAM-1004） */
  sendEmailCode(code: string, email: string) {
    return request.post<{ requestId: string }>({
      url: `${BASE}/intent-survey/${code}/email-code`,
      data: { email }
    })
  },
  /** 匿名提交问卷落池；同企业重复 409 COOP-2001 */
  submitIntention(payload: CoopIntentionSubmitInput) {
    return request.post<{ id: string; result: CoopResult; message: string }>({
      url: `${BASE}/intentions`,
      data: payload
    })
  }
}

// ---------- 管理段（cooperation:cso-questionnaire:manage / cso-intention:view） ----------

export const coopSurveyAdminApi = {
  /** 问卷列表（code/在用版本/标题） */
  listSurveys() {
    return request.get<CoopSurveySummary[]>({ url: `${BASE}/intent-survey` })
  },
  /** 配置编辑读取（manage 权限） */
  getDefinition(code: string) {
    return request.get<CoopSurveyDefinition>({
      url: `${BASE}/intent-survey/${code}/definition-manage`
    })
  },
  /** 版本历史（全量保留） */
  listVersions(code: string) {
    return request.get<{ version: string; title: string; createdAt: string | null }[]>({
      url: `${BASE}/intent-survey/${code}/definition-versions`
    })
  },
  /** 保存＝append 新版本；乐观锁 409 COOP-2002（新 code 首存 expectedVersion 传 'none'） */
  saveDefinition(code: string, definition: SurveyDefinition, expectedVersion: string) {
    return request.put<{ code: string; version: string }>({
      url: `${BASE}/intent-survey/${code}/definition`,
      data: { definition, expectedVersion }
    })
  }
}

export interface CoopIntentionListParams {
  page?: number
  size?: number
  keyword?: string
  province?: string
  city?: string
  companyScale?: string
  result?: CoopResult
  surveyCode?: string
}

export const coopIntentionApi = {
  /** 池分页（keyword 模糊：公司/负责人/联系方式） */
  list(params: CoopIntentionListParams) {
    return request.get<CoopPage<CoopIntentionListItem>>({ url: `${BASE}/intentions`, params })
  },
  /** 详情：意向全字段＋答卷快照＋跟进时间线 */
  get(id: string | number) {
    return request.get<CoopIntentionDetail>({ url: `${BASE}/intentions/${id}` })
  },
  /** 约谈登记（note 必填）；已关联 OA 改非合作 409 COOP-2003 */
  registerRecord(id: string | number, result: CoopResult, note: string) {
    return request.post<{ id: string; result: CoopResult }>({
      url: `${BASE}/intentions/${id}/records`,
      data: { result, note }
    })
  },
  /** 软删回收站 */
  remove(id: string | number) {
    return request.del<{ ok: boolean }>({ url: `${BASE}/intentions/${id}` })
  }
}
