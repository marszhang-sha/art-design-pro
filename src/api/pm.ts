/**
 * PM 产品资料 API 封装（契约 pm-api-contract，Base /api/v1）
 *
 * 覆盖：分类树维护（§3.1）、资料管理（§3.2）、下载统计（§3.3）、代理商端（§3.4）。
 * 错误：RFC 7807 → HttpError(detail, 'PM-xxxx')，由 http 层统一解析。
 * 下载/预览走 blob（文件名取行数据 fileName，Content-Disposition 仅作语义标注）。
 */

import request from '@/utils/http'
import { type IamPage, type IamSortOrder } from './iam'

const BASE = '/api/v1'

// ---------- 类型 ----------

export type PmNodeStatus = 'ACTIVE' | 'DISABLED'
export type PmStatsDimension = 'BU' | 'PRODUCT_LINE' | 'MATERIAL'

export interface PmCategoryNode {
  id: string
  parentId: string | null
  name: string
  status: PmNodeStatus
  sortOrder: number
  children: PmCategoryNode[]
}

export interface PmVersionView {
  id: string
  versionNo: number
  fileName: string
  fileSize: number
  contentType: string
  uploadedAt: string | null
  uploadedBy: string
  isCurrent: boolean
}

export interface PmMaterialDetail {
  id: string
  name: string
  buId: string
  productLineId: string
  categoryId: string
  versions: PmVersionView[]
  createdBy: string
  createdAt: string | null
}

export interface PmCurrentVersion {
  id: string
  versionNo: number
  fileName: string
  fileSize: number
  contentType: string
  uploadedAt: string | null
}

export interface PmMaterialListItem {
  id: string
  name: string
  buId: string
  productLineId: string
  categoryId: string
  currentVersion: PmCurrentVersion | null
  createdAt: string | null
}

export interface PmMaterialListParams {
  page?: number
  size?: number
  buId?: number
  productLineId?: number
  categoryId?: number
  keyword?: string
  sortBy?: 'createdAt' | 'name'
  sortOrder?: IamSortOrder
}

export interface PmStatsItem {
  id: string
  name: string
  downloadCount: number
}

export interface PmStats {
  dimension: PmStatsDimension
  items: PmStatsItem[]
  dateFrom: string | null
  dateTo: string | null
}

/** 上传表单字段（契约 §4.1：请求内 id 为整数；G2-PM-4 name 必填） */
export interface PmUploadInput {
  name: string
  buId: number
  productLineId: number
  categoryId: number
}

// ---------- MD 占位维度清单（待 MD-2 业务清单 API 替换；与 BE dimensions.py 同源） ----------

export interface PmDimensionProductLine {
  id: number
  name: string
}

export interface PmDimensionBu {
  id: number
  name: string
  productLines: PmDimensionProductLine[]
}

export const PM_DIMENSIONS_PLACEHOLDER: PmDimensionBu[] = [
  { id: 1, name: 'WH', productLines: [{ id: 1, name: 'WH-产品线1' }] },
  { id: 2, name: 'OBU', productLines: [{ id: 2, name: 'OBU-产品线1' }] }
]

// ---------- 分类树维护（system:material:category；§3.1） ----------

export const pmCategoryApi = {
  /** 全树（管理端含 DISABLED；无分页一次返回） */
  tree() {
    return request.get<PmCategoryNode[]>({ url: `${BASE}/material-categories` })
  },
  create(payload: { parentId?: number; name: string; sortOrder?: number }) {
    return request.post<PmCategoryNode>({ url: `${BASE}/material-categories`, data: payload })
  },
  /** 改名/排序；同级重名 409 PM-2004 */
  update(id: string | number, payload: { name?: string; sortOrder?: number }) {
    return request.patch<PmCategoryNode>({
      url: `${BASE}/material-categories/${id}`,
      data: payload
    })
  },
  /** 移动（改父节点）；移入自身子树 400 PM-4001 */
  move(id: string | number, parentId: number) {
    return request.post<PmCategoryNode>({
      url: `${BASE}/material-categories/${id}/move`,
      data: { parentId }
    })
  },
  disable(id: string | number) {
    return request.post<PmCategoryNode>({ url: `${BASE}/material-categories/${id}/disable` })
  },
  enable(id: string | number) {
    return request.post<PmCategoryNode>({ url: `${BASE}/material-categories/${id}/enable` })
  },
  /** 仅空叶子可删；非空 409 PM-2001 */
  remove(id: string | number) {
    return request.del<{ ok: boolean }>({ url: `${BASE}/material-categories/${id}` })
  }
}

// ---------- 资料管理（§3.2） ----------

export const pmMaterialApi = {
  /** 新建条目＋首版本；multipart 字段 file/name/buId/productLineId/categoryId（FormData 直传） */
  upload(payload: PmUploadInput, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', payload.name)
    formData.append('buId', String(payload.buId))
    formData.append('productLineId', String(payload.productLineId))
    formData.append('categoryId', String(payload.categoryId))
    return request.post<PmMaterialDetail>({ url: `${BASE}/materials`, data: formData })
  },
  /** 追加版本（versionNo 服务端 MAX+1）；并发冲突 409 PM-2003 */
  appendVersion(id: string | number, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return request.post<PmVersionView>({ url: `${BASE}/materials/${id}/versions`, data: formData })
  },
  list(params?: PmMaterialListParams) {
    return request.get<IamPage<PmMaterialListItem>>({ url: `${BASE}/materials`, params })
  },
  /** 详情＋版本链（versions 倒序，首位=当前版） */
  get(id: string | number) {
    return request.get<PmMaterialDetail>({ url: `${BASE}/materials/${id}` })
  },
  /** 管理端下载指定版本（计入日志，G2-PM-3） */
  downloadVersion(id: string | number, versionNo: number) {
    return request.get<Blob>({
      url: `${BASE}/materials/${id}/versions/${versionNo}/download`,
      responseType: 'blob'
    })
  }
}

// ---------- 下载统计（system:material:report；§3.3） ----------

export const pmStatsApi = {
  stats(params: {
    dimension: PmStatsDimension
    buId?: number
    productLineId?: number
    dateFrom?: string
    dateTo?: string
  }) {
    return request.get<PmStats>({ url: `${BASE}/material-download-stats`, params })
  }
}

// ---------- 代理商端（/me，登录即可；§3.4） ----------

export const pmMyApi = {
  /** 全部 ACTIVE 节点（G2-PM-1 甲） */
  categories() {
    return request.get<PmCategoryNode[]>({ url: `${BASE}/me/material-categories` })
  },
  /** 可见性先验＋多维交集（BR-PM-004/011） */
  list(params?: PmMaterialListParams) {
    return request.get<IamPage<PmMaterialListItem>>({ url: `${BASE}/me/materials`, params })
  },
  /** 范围外 404 PM-4002（防探测） */
  get(id: string | number) {
    return request.get<PmMaterialDetail>({ url: `${BASE}/me/materials/${id}` })
  },
  /** 默认最新版（D3）；计入日志 */
  downloadLatest(id: string | number) {
    return request.get<Blob>({ url: `${BASE}/me/materials/${id}/download`, responseType: 'blob' })
  },
  /** 指定历史版本（A-PM-03）；不存在 404（EX-03） */
  downloadVersion(id: string | number, versionNo: number) {
    return request.get<Blob>({
      url: `${BASE}/me/materials/${id}/versions/${versionNo}/download`,
      responseType: 'blob'
    })
  },
  /** 固定最新版；非 PDF/JPG/PNG → 415 PM-4005；不计日志（裁定 PM-2） */
  preview(id: string | number) {
    return request.get<Blob>({ url: `${BASE}/me/materials/${id}/preview`, responseType: 'blob' })
  }
}
