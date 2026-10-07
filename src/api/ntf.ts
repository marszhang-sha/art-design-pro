/**
 * NTF 通知 API 封装（契约 anc-ntf-api-contract §3.3/§4.4，Base /api/v1）
 *
 * 覆盖：本人收件箱、未读计数、已读/全部已读、软删。
 * /me 前缀、无权限码，身份取 JWT；错误 RFC 7807 → HttpError('NTF-xxxx')。
 */

import request from '@/utils/http'
import { type IamPage } from './iam'

const BASE = '/api/v1'

// ---------- 类型 ----------

export type NtfSourceType = 'ANNOUNCEMENT' | 'ACCOUNT_EVENT'

export interface NtfNotification {
  id: string
  sourceType: NtfSourceType
  sourceId: string
  title: string
  summary: string | null
  link: string | null
  publishedAt: string
}

export interface NtfInboxEntry {
  id: string
  notification: NtfNotification
  readAt: string | null
}

export interface NtfUnreadCount {
  total: number
  bySourceType: { ANNOUNCEMENT: number; ACCOUNT_EVENT: number }
}

export interface NtfListParams {
  page?: number
  size?: number
  /** 白名单 "true"/"false"，非法 400 NTF-4001 */
  unreadOnly?: 'true' | 'false'
}

// ---------- API ----------

export const ntfApi = {
  /** 固定发布时点倒序（用户端不开放 sortBy） */
  list(params?: NtfListParams) {
    return request.get<IamPage<NtfInboxEntry>>({ url: `${BASE}/me/notifications`, params })
  },
  unreadCount() {
    return request.get<NtfUnreadCount>({
      url: `${BASE}/me/notifications/unread-count`,
      showErrorMessage: false // 铃铛后台静默刷新，不打扰用户
    })
  },
  /** INV-5 幂等；非本人/不存在/已删 404 NTF-4002（撤回清理竞态下容忍失败） */
  markRead(entryId: string | number) {
    return request.post<{ ok: boolean }>({
      url: `${BASE}/me/notifications/${entryId}/read`,
      showErrorMessage: false
    })
  },
  readAll() {
    return request.post<{ updatedCount: number }>({
      url: `${BASE}/me/notifications/read-all`
    })
  },
  /** INV-6 软删不可恢复；已删再删 404 NTF-4002 */
  remove(entryId: string | number) {
    return request.del<{ ok: boolean }>({ url: `${BASE}/me/notifications/${entryId}` })
  }
}
