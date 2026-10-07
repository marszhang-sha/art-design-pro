/**
 * ANC 公告 API 封装（契约 anc-ntf-api-contract，Base /api/v1）
 *
 * 覆盖：公告管理端 CRUD/发布/撤回/置顶/附件、用户端 /me 公告。
 * 错误：RFC 7807 → HttpError(detail, 'ANC-xxxx')，由 http 层统一解析。
 */

import request from '@/utils/http'
import { type IamPage, type IamSortOrder } from './iam'

const BASE = '/api/v1'

// ---------- 类型 ----------

export type AncStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'WITHDRAWN'

export interface AncAttachment {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  sortOrder: number
}

/** 受众提交（契约 §4：请求内 id 为整数） */
export interface AncAudienceInput {
  orgNodeIds: number[]
  accountIds: number[]
}

/** 受众出参（契约 §1：响应 id 字符串化） */
export interface AncAudienceOut {
  orgNodeIds: string[]
  accountIds: string[]
  dimensions: Record<string, unknown>[]
}

export interface AncDetail {
  id: string
  title: string
  content: string
  status: AncStatus
  pinned: boolean
  publishAt: string | null
  withdrawnAt: string | null
  updatedAt: string
  audience: AncAudienceOut
  attachments: AncAttachment[]
  /** DRAFT 未解析受众 → 双 null；发布时快照物化 */
  snapshotSummary: { resolvedCount: number | null; resolvedAt: string | null }
  createdBy: string
  createdAt: string
}

export interface AncListItem {
  id: string
  title: string
  status: AncStatus
  pinned: boolean
  publishAt: string | null
  createdAt: string
}

export interface AncListParams {
  page?: number
  size?: number
  status?: AncStatus
  keyword?: string
  sortBy?: 'createdAt' | 'publishAt' | 'title'
  sortOrder?: IamSortOrder
}

export interface AncReadStats {
  snapshotTotal: number
  readCount: number
  unreadCount: number
}

/** 用户端条目：entryId 即通知收件箱条目 id（readAt 与通知共行） */
export interface AncMyAnnouncementItem {
  entryId: string
  announcementId: string
  title: string
  pinned: boolean
  publishAt: string | null
  readAt: string | null
  attachmentCount: number
}

/** WITHDRAWN 下线态：content null、attachments 空，标题留存 */
export interface AncMyAnnouncementDetail {
  announcementId: string
  title: string
  status: AncStatus
  pinned: boolean
  publishAt: string | null
  withdrawnAt: string | null
  content: string | null
  attachments: AncAttachment[]
}

// ---------- 管理端 ----------

export const ancApi = {
  list(params?: AncListParams) {
    return request.get<IamPage<AncListItem>>({ url: `${BASE}/announcements`, params })
  },
  get(id: string | number) {
    return request.get<AncDetail>({ url: `${BASE}/announcements/${id}` })
  },
  create(payload: { title: string; content: string; audience: AncAudienceInput }) {
    return request.post<AncDetail>({ url: `${BASE}/announcements`, data: payload })
  },
  /** 仅 DRAFT 可改（409 ANC-2001）；字段可选提交。PATCH 不在包装层 params→data 搬运之列，必须显式 data */
  update(
    id: string | number,
    payload: { title?: string; content?: string; audience?: AncAudienceInput }
  ) {
    return request.patch<AncDetail>({ url: `${BASE}/announcements/${id}`, data: payload })
  },
  /** publishAt 缺省=立即发布；过去时点 400 ANC-4005，空受众 409 ANC-2006。body 必填，立即发布发 null */
  publish(id: string | number, publishAt?: string) {
    return request.post<{ id: string; status: AncStatus; publishAt: string | null }>({
      url: `${BASE}/announcements/${id}/publish`,
      data: { publishAt: publishAt ?? null }
    })
  },
  /** 撤回进入终态；响应含移除的用户收件箱条目数 */
  withdraw(id: string | number) {
    return request.post<{
      id: string
      status: AncStatus
      withdrawnAt: string | null
      inboxEntriesRemoved: number
    }>({ url: `${BASE}/announcements/${id}/withdraw` })
  },
  /** 仅 PUBLISHED（ANC-2004）；置顶总数 ≤3（ANC-2005） */
  pin(id: string | number) {
    return request.post<{ id: string; pinned: boolean }>({
      url: `${BASE}/announcements/${id}/pin`
    })
  },
  unpin(id: string | number) {
    return request.post<{ id: string; pinned: boolean }>({
      url: `${BASE}/announcements/${id}/unpin`
    })
  },
  readStats(id: string | number) {
    return request.get<AncReadStats>({ url: `${BASE}/announcements/${id}/read-stats` })
  },
  remove(id: string | number) {
    return request.del<{ ok: boolean }>({ url: `${BASE}/announcements/${id}` })
  },

  // ---------- 附件（仅 DRAFT；≤10 个/公告，单个 ≤20MB，ANC-4004） ----------

  /** multipart 字段名 file；FormData 直传（包装层跳过 JSON 序列化与 Content-Type） */
  uploadAttachment(id: string | number, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    return request.post<AncAttachment>({
      url: `${BASE}/announcements/${id}/attachments`,
      data: formData
    })
  },
  deleteAttachment(id: string | number, attachmentId: string | number) {
    return request.del<{ ok: boolean }>({
      url: `${BASE}/announcements/${id}/attachments/${attachmentId}`
    })
  },
  /** 双通道（BR-ANC-012：查看权限或受众成员）；二进制流，文件名取载荷 fileName */
  downloadAttachment(id: string | number, attachmentId: string | number) {
    return request.get<Blob>({
      url: `${BASE}/announcements/${id}/attachments/${attachmentId}/download`,
      responseType: 'blob'
    })
  },

  // ---------- 用户端（/me，仅登录无权限码） ----------

  myAnnouncements(params?: { page?: number; size?: number; unreadOnly?: 'true' | 'false' }) {
    return request.get<IamPage<AncMyAnnouncementItem>>({
      url: `${BASE}/me/announcements`,
      params
    })
  },
  /** 快照外/未发布 404 ANC-4002（防探测） */
  myAnnouncementDetail(id: string | number) {
    return request.get<AncMyAnnouncementDetail>({ url: `${BASE}/me/announcements/${id}` })
  }
}
