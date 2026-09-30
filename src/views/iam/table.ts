/**
 * IAM 页面共用 useTable 信封归一。
 *
 * 后端列表信封为 {items, page, size, total}（API-IAM 契约 §1），
 * useTable 标准响应为 Api.Common.PaginatedResponse {records, current, size, total}。
 *
 * 用法：在 apiFn 内完成映射（而非 responseAdapter）——
 *   apiFn: (p) => iamAccountApi.list(p).then(toPaginated)
 * 这样 TApiFn 的返回类型即标准信封，useTable 的 InferRecordType
 * 能正确推断出 TRecord，页面侧无需 responseAdapter、无需断言。
 */

import type { IamPage } from '@/api/iam'

/** 服务端分页页（账号/子账号）：{items,page,size,total} → 标准信封。 */
export function toPaginated<T>(page: IamPage<T>): Api.Common.PaginatedResponse<T> {
  return {
    records: page.items,
    current: page.page,
    size: page.size,
    total: page.total
  }
}

/** 全量列表页（角色/权限/授权等）：数组包装为标准信封，分页栏由前端隐藏。 */
export function wrapAll<T>(items: T[]): Api.Common.PaginatedResponse<T> {
  return {
    records: items,
    current: 1,
    size: items.length,
    total: items.length
  }
}
