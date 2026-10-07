/**
 * 未读计数共享状态（UI-PORTAL-001：铃铛红点 + 工作台公告栏红点共用一份）
 *
 * 模块级单例 refs：铃铛挂载时拉取覆盖「登录后」场景；各视图在读/删操作后
 * 调 refresh() 同步。store/ 目录不在 T20 允许路径内，故落在 components 下。
 * 无轮询（裁定）：仅挂载与操作后刷新。
 */

import { ref } from 'vue'
import { ntfApi, type NtfUnreadCount } from '@/api/ntf'

const total = ref(0)
const bySourceType = ref<NtfUnreadCount['bySourceType']>({
  ANNOUNCEMENT: 0,
  ACCOUNT_EVENT: 0
})

let inflight: Promise<void> | null = null

/** 单飞刷新；失败静默保留旧值（铃铛红点不因网络抖动报错） */
async function refresh(): Promise<void> {
  if (inflight) return inflight
  inflight = ntfApi
    .unreadCount()
    .then((res) => {
      total.value = res.total
      bySourceType.value = res.bySourceType
    })
    .catch(() => undefined)
    .finally(() => {
      inflight = null
    })
  return inflight
}

export function useNtfUnread() {
  return { total, bySourceType, refresh }
}
