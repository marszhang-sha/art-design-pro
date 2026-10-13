import type { CsoState, DemoIdentity } from '@/views/cso/domain'

export const IS_CSO_DEMO =
  import.meta.env.MODE === 'prototype' && import.meta.env.VITE_CSO_DEMO === 'true'
export const DEMO_STORAGE_KEY = 'asieris-cso-prototype-v1'
export const DEMO_IDENTITY_KEY = 'asieris-cso-demo-identity'
export const DEMO_TOKEN = 'cso-demo-local'
export const ROLE_LABELS = {
  admin: 'Admin',
  manager: '大区经理',
  operator: '业务代办',
  agent: '代理商'
} as const
export const ROLE_CODES = {
  admin: 'CSO_ADMIN',
  manager: 'CSO_MANAGER',
  operator: 'CSO_OPERATOR',
  agent: 'CSO_AGENT'
} as const

export function readDemoIdentity(): DemoIdentity | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(DEMO_IDENTITY_KEY) || 'null')
    if (!value || !Object.hasOwn(ROLE_CODES, value.role)) return null
    if (value.role === 'agent') {
      if (typeof value.partnerId !== 'string' || !value.partnerId) return null
      const state = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || 'null') as CsoState | null
      return state?.partners?.some((p) => p.id === value.partnerId && p.oaPassed)
        ? { role: 'agent', partnerId: value.partnerId }
        : null
    }
    return value.role === 'admin' ? { role: 'admin' } : null
  } catch {
    return null
  }
}

export function writeDemoIdentity(identity: DemoIdentity | null): void {
  if (identity) {
    if (identity.role !== 'admin' && !(identity.role === 'agent' && identity.partnerId))
      throw new Error('请选择有效的登录身份')
    sessionStorage.setItem(DEMO_IDENTITY_KEY, JSON.stringify(identity))
  } else sessionStorage.removeItem(DEMO_IDENTITY_KEY)
}

export function getDemoUserInfo(): Api.Auth.UserInfo {
  const identity = readDemoIdentity()
  if (!identity) throw new Error('请先登录')
  const state = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || 'null') as CsoState | null
  const partnerIndex = state?.partners.findIndex((p) => p.id === identity.partnerId) ?? -1
  const partner = partnerIndex >= 0 ? state?.partners[partnerIndex] : undefined
  return {
    userId: identity.role === 'admin' ? 900 : 10000 + partnerIndex,
    userName: identity.role === 'admin' ? 'Admin' : partner!.name,
    email: 'demo@example.invalid',
    roles: [ROLE_CODES[identity.role]],
    buttons: []
  }
}
