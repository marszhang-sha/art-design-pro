/**
 * MD 主数据 API 封装（契约 md-api-contract，Base /api/v1）
 *
 * 覆盖：自建对象维护（§3.1）、同步对象查看（§3.2）、同步对账（§3.3）。
 * 错误：RFC 7807 → HttpError(detail, 'MD-xxxx')，由 http 层统一解析。
 * 写/更新 API（§3.4）保留备用一期不实现（G-MD-15），此处无对应封装。
 * 同步对象全只读（G-MD-13：查看列表页面，无任何维护入口）。
 */

import request from '@/utils/http'
import { type IamPage, type IamSortOrder } from './iam'

const BASE = '/api/v1'

// ---------- 类型 ----------

export type MdStatus = 'ACTIVE' | 'INACTIVE'

export interface MdBu {
  id: string
  code: string
  name: string
  status: MdStatus
  createdAt: string | null
}

export interface MdProductLine {
  id: string
  code: string
  name: string
  buId: string
  status: MdStatus
  createdAt: string | null
}

export interface MdWorkCalendarRow {
  theDate: string
  year: number
  month: number
  day: number
  isHoliday: boolean
  isMonthlyReportDate: boolean | null
  isSalesAppealDate: boolean | null
  weekDay: string
  dayInWeek: number
  weekSid: number
  quarterWorkDay: number | null
  monthWorkDay: number | null
  monthEnd: boolean
}

export interface MdDrugStoreRow {
  insCode: string
  insName: string
  instTypeCode: 'HP' | 'DS'
  instTypeName: string
  attr1: string
  provinceName: string
  cityName: string
  countyName: string
  address: string
  status: MdStatus
}

export interface MdRegionRow {
  code: string
  name: string
  level: 'PROVINCE' | 'CITY' | 'COUNTY'
  parentCode: string | null
  provinceAbbr: string | null
}

export interface MdTerritoryRow {
  yyyymm: string
  terrCode: string
  terrName: string
  terrLevel: string
  staffCode: string | null
  staffName: string | null
  upperTerrCode: string
  buCode: string
  status: MdStatus
}

export interface MdSyncBatch {
  id: string
  object: 'WORK_CALENDAR' | 'DRUG_STORE' | 'REGION' | 'TERRITORY'
  startedAt: string
  finishedAt: string | null
  totalRows: number
  acceptedRows: number
  rejectedRows: number
  status: 'RUNNING' | 'SUCCESS' | 'PARTIAL' | 'FAILED'
}

export interface MdSyncRejection {
  id: string
  object: MdSyncBatch['object']
  bizKey: string
  reason: string
  createdAt: string
}

// ---------- 自建对象维护（§3.1；view 读 / manage 写） ----------

export const mdBuApi = {
  list(params?: { status?: MdStatus }) {
    return request.get<MdBu[]>({ url: `${BASE}/masterdata/bus`, params })
  },
  create(payload: { code: string; name: string }) {
    return request.post<MdBu>({ url: `${BASE}/masterdata/bus`, data: payload })
  },
  /** 改名；展示名实时生效（A-MD-12） */
  update(id: string | number, payload: { name: string }) {
    return request.patch<MdBu>({ url: `${BASE}/masterdata/bus/${id}`, data: payload })
  },
  /** 软停用（BR-MD-003）：禁新增引用、存量保留；隶属链传导（A-MD-10）；幂等 */
  disable(id: string | number) {
    return request.post<MdBu>({ url: `${BASE}/masterdata/bus/${id}/disable` })
  },
  enable(id: string | number) {
    return request.post<MdBu>({ url: `${BASE}/masterdata/bus/${id}/enable` })
  }
}

export const mdProductLineApi = {
  /** usable=true=可用于新引用（自身 ACTIVE 且所属 BU ACTIVE，BR-MD-004 隶属链口径） */
  list(params?: { buId?: number; status?: MdStatus; usable?: boolean }) {
    return request.get<MdProductLine[]>({ url: `${BASE}/masterdata/product-lines`, params })
  },
  /** 所属 BU 不存在/已停用 → 400 MD-4003 */
  create(payload: { code: string; name: string; buId: number }) {
    return request.post<MdProductLine>({ url: `${BASE}/masterdata/product-lines`, data: payload })
  },
  update(id: string | number, payload: { name: string }) {
    return request.patch<MdProductLine>({
      url: `${BASE}/masterdata/product-lines/${id}`,
      data: payload
    })
  },
  /** 换属（AF-01，A-MD-08）：目标 BU 须 ACTIVE；存量引用原值保留 */
  reparent(id: string | number, buId: number) {
    return request.post<MdProductLine>({
      url: `${BASE}/masterdata/product-lines/${id}/reparent`,
      data: { buId }
    })
  },
  disable(id: string | number) {
    return request.post<MdProductLine>({ url: `${BASE}/masterdata/product-lines/${id}/disable` })
  },
  enable(id: string | number) {
    return request.post<MdProductLine>({ url: `${BASE}/masterdata/product-lines/${id}/enable` })
  }
}

// ---------- 同步对象查看（§3.2；view；全只读） ----------

export interface MdCalendarParams {
  page?: number
  size?: number
  dateFrom?: string
  dateTo?: string
}

export interface MdStoreParams {
  page?: number
  size?: number
  keyword?: string
  instType?: 'HP' | 'DS'
  attr1?: string
  provinceCode?: string
  status?: MdStatus
  sortBy?: 'insCode' | 'insName'
  sortOrder?: IamSortOrder
}

export interface MdTerritoryParams {
  page?: number
  size?: number
  yyyymm?: string
  level?: string
  buCode?: string
  staffCode?: string
  terrName?: string
  terrCode?: string
  upperTerrCode?: string
  keyword?: string
  status?: MdStatus
  sortBy?: 'terrCode' | 'terrName'
  sortOrder?: IamSortOrder
}

export const mdRegistryApi = {
  /** 工作日历（缺省当月；BR-MD-009 口径出参，WeekEndFlag 不出契约） */
  calendar(params?: MdCalendarParams) {
    return request.get<IamPage<MdWorkCalendarRow>>({
      url: `${BASE}/masterdata/work-calendar`,
      params
    })
  },
  drugStores(params?: MdStoreParams) {
    return request.get<IamPage<MdDrugStoreRow>>({ url: `${BASE}/masterdata/drug-stores`, params })
  },
  /** 区划分页（契约 §3.2 r2：全量改服务器端分页） */
  regions(params?: {
    page?: number
    size?: number
    level?: 'PROVINCE' | 'CITY' | 'COUNTY'
    parentCode?: string
  }) {
    return request.get<IamPage<MdRegionRow>>({ url: `${BASE}/masterdata/regions`, params })
  },
  /** 缺省月份=最新已同步（BR-MD-010 收口）；指定月份无快照 → 404 MD-4004 */
  territories(params?: MdTerritoryParams) {
    return request.get<IamPage<MdTerritoryRow>>({ url: `${BASE}/masterdata/territories`, params })
  },
  /** 可用月份清单 DESC；空 → 404 MD-4004 */
  territoryMonths() {
    return request.get<{ months: string[] }>({ url: `${BASE}/masterdata/territories/months` })
  }
}

// ---------- 同步对账（§3.3；view） ----------

export const mdSyncApi = {
  batches(params?: {
    page?: number
    size?: number
    object?: MdSyncBatch['object']
    status?: MdSyncBatch['status']
    dateFrom?: string
    dateTo?: string
  }) {
    return request.get<IamPage<MdSyncBatch>>({ url: `${BASE}/masterdata/sync-batches`, params })
  },
  /** 失败行明细（临时表标记的正式侧登记，A-MD-11/LDM §6-1） */
  rejections(batchId: string | number, params?: { page?: number; size?: number }) {
    return request.get<IamPage<MdSyncRejection>>({
      url: `${BASE}/masterdata/sync-batches/${batchId}/rejections`,
      params
    })
  }
}
