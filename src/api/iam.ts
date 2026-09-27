/**
 * IAM API 封装（API-IAM 契约，Base /api/v1）
 *
 * 覆盖：认证会话、账号、角色、权限、授权边界、授权模板、认证配置、菜单资源。
 * 错误：RFC 7807 → HttpError(detail, 'IAM-xxxx')，由 http 层统一解析。
 */

import request from '@/utils/http'

const BASE = '/api/v1'

// ---------- 类型 ----------

export interface IamAccount {
  id: string
  username: string
  displayName: string | null
  mobile: string | null
  email: string | null
  accountType: 'PLATFORM_USER' | 'AGENT_USER'
  agentId: string | null
  parentAccountId: string | null
  isMaster: boolean
  status: 'ACTIVE' | 'DISABLED' | 'LOCKED'
}

export interface IamLoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  account: Pick<IamAccount, 'id' | 'username' | 'accountType' | 'agentId'>
}

export interface IamPermission {
  id: number
  namespace: string
  resource: string
  action: string
  code: string
  name: string
  description: string | null
  status: 'ACTIVE' | 'DEPRECATED'
}

export interface IamRole {
  id: number
  code: string
  name: string
  scope: 'PLATFORM' | 'AGENT'
  agentId: string | null
  builtIn: boolean
  status: 'ACTIVE' | 'DISABLED'
  permissionIds: number[]
}

export interface IamAccountRole {
  roleId: number
  code: string
  name: string
  scope: string
  agentId: string | null
  builtIn: boolean
  permissions: { id: number; code: string; name: string }[]
}

export interface IamRealm {
  id: number
  code: string
  name: string
  description: string | null
  status: 'ACTIVE' | 'DISABLED'
}

export interface IamProvider {
  id: number
  realmId: number
  code: string
  name: string
  providerType: string
  config: Record<string, unknown> | null
  currentPasswordPolicyId: number | null
  status: 'ACTIVE' | 'DISABLED'
}

export interface IamPasswordPolicy {
  id: number
  code: string
  name: string
  algorithm: string
  algorithmVersion: string
  parameters: Record<string, unknown> | null
  status: 'ACTIVE' | 'RETIRED'
}

export interface IamEntitlement {
  id: number
  agentId: string
  permissionId: number
  grantedVia: 'MANUAL' | 'TEMPLATE'
  templateId: number | null
  status: 'ACTIVE' | 'REVOKED'
}

export interface IamEntitlementTemplate {
  id: number
  code: string
  name: string
  description: string | null
  status: 'ACTIVE' | 'DISABLED'
  permissionIds: number[]
}

export interface IamUiResource {
  id: number
  code: string
  name: string
  resourceType: 'MENU' | 'BUTTON'
  parentId: number | null
  route: string | null
  component: string | null
  icon: string | null
  sortOrder: number
  permissionId: number | null
  status: 'ACTIVE' | 'DISABLED'
}

// ---------- 认证与会话 ----------

export const iamAuthApi = {
  login(username: string, password: string) {
    return request.post<IamLoginResponse>({
      url: `${BASE}/auth/login`,
      params: { username, password },
      showErrorMessage: false // 模糊提示由页面定制（002-3）
    })
  },
  wecomCallback(state: string, code: string) {
    return request.post<IamLoginResponse>({
      url: `${BASE}/auth/wecom/callback`,
      params: { state, code }
    })
  },
  refresh(refreshToken: string) {
    return request.post<IamLoginResponse>({
      url: `${BASE}/auth/refresh`,
      params: { refreshToken }
    })
  },
  logout() {
    return request.del({ url: `${BASE}/auth/tokens/current` })
  },
  selfChangePassword(oldPassword: string, newPassword: string) {
    return request.post({
      url: `${BASE}/auth/password/self-change`,
      params: { oldPassword, newPassword }
    })
  },
  requestPasswordReset(username: string) {
    return request.post<{ requestId: number }>({
      url: `${BASE}/auth/password-reset-requests`,
      params: { username }
    })
  },
  confirmPasswordReset(requestId: number, token: string, newPassword: string) {
    return request.post({
      url: `${BASE}/auth/password-reset-requests/${requestId}/confirmation`,
      params: { token, newPassword }
    })
  },
  me() {
    return request.get<IamAccount & { status: string }>({ url: `${BASE}/me` })
  },
  myPermissions() {
    return request.get<{ permissions: string[] }>({ url: `${BASE}/me/permissions` })
  },
  myMenus() {
    return request.get<{ menus: IamMenuNode[] }>({ url: `${BASE}/me/menus` })
  }
}

export interface IamMenuNode {
  id: number
  code: string
  name: string
  parentId: number | null
  route: string | null
  children: IamMenuNode[]
}

// ---------- 账号管理 ----------

export interface IamAccountCreatePayload {
  scenario: 'PLATFORM' | 'AGENT_MASTER' | 'AGENT_SUB'
  agentId?: number
  masterId?: number
  username: string
  displayName?: string
  mobile?: string
  email?: string
  admissionSource?: string
}

export const iamAccountApi = {
  create(payload: IamAccountCreatePayload) {
    return request.post<IamAccount>({ url: `${BASE}/accounts`, params: payload })
  },
  list(params?: { agentId?: number; status?: string; type?: string; keyword?: string }) {
    return request.get<IamAccount[]>({ url: `${BASE}/accounts`, params })
  },
  get(id: string | number) {
    return request.get<IamAccount>({ url: `${BASE}/accounts/${id}` })
  },
  update(
    id: string | number,
    payload: Partial<Pick<IamAccount, 'displayName' | 'mobile' | 'email'>>
  ) {
    return request.put<IamAccount>({ url: `${BASE}/accounts/${id}`, params: payload })
  },
  disable(id: string | number) {
    return request.post<{ account: IamAccount; cascaded: { id: number; status: string }[] }>({
      url: `${BASE}/accounts/${id}/disable`
    })
  },
  enable(id: string | number) {
    return request.post<{ account: IamAccount }>({ url: `${BASE}/accounts/${id}/enable` })
  },
  lock(id: string | number) {
    return request.post<{ account: IamAccount }>({ url: `${BASE}/accounts/${id}/lock` })
  },
  unlock(id: string | number) {
    return request.post<{ account: IamAccount }>({ url: `${BASE}/accounts/${id}/unlock` })
  },
  adminResetPassword(id: string | number) {
    return request.post<{ temporaryPassword: string }>({
      url: `${BASE}/accounts/${id}/admin-reset-password`
    })
  },
  listRoles(id: string | number) {
    return request.get<IamAccountRole[]>({ url: `${BASE}/accounts/${id}/roles` })
  },
  assignRole(id: string | number, roleId: number) {
    return request.post({ url: `${BASE}/accounts/${id}/roles`, params: { roleId } })
  },
  revokeRole(id: string | number, roleId: number) {
    return request.del({ url: `${BASE}/accounts/${id}/roles/${roleId}` })
  }
}

// ---------- 认证配置 ----------

export const iamAuthnConfigApi = {
  listRealms() {
    return request.get<IamRealm[]>({ url: `${BASE}/realms` })
  },
  createRealm(payload: { code: string; name: string; description?: string }) {
    return request.post<IamRealm>({ url: `${BASE}/realms`, params: payload })
  },
  listProviders() {
    return request.get<IamProvider[]>({ url: `${BASE}/providers` })
  },
  createProvider(payload: {
    realmId: number
    code: string
    name: string
    providerType: string
    config?: Record<string, unknown>
    currentPasswordPolicyId?: number
  }) {
    return request.post<IamProvider>({ url: `${BASE}/providers`, params: payload })
  },
  listPasswordPolicies() {
    return request.get<IamPasswordPolicy[]>({ url: `${BASE}/password-policies` })
  },
  createPasswordPolicy(payload: {
    code: string
    name: string
    algorithm: string
    algorithmVersion: string
    parameters?: Record<string, unknown>
  }) {
    return request.post<IamPasswordPolicy>({ url: `${BASE}/password-policies`, params: payload })
  }
}

// ---------- 角色 / 权限 ----------

export const iamRoleApi = {
  list() {
    return request.get<IamRole[]>({ url: `${BASE}/roles` })
  },
  create(payload: {
    scope: 'PLATFORM' | 'AGENT'
    agentId?: number
    code: string
    name: string
    permissionIds: number[]
  }) {
    return request.post<IamRole>({ url: `${BASE}/roles`, params: payload })
  },
  get(id: number) {
    return request.get<IamRole>({ url: `${BASE}/roles/${id}` })
  },
  update(
    id: number,
    payload: {
      name?: string
      status?: 'ACTIVE' | 'DISABLED'
      code?: string
      scope?: string
      addPermissionId?: number
      removePermissionId?: number
    }
  ) {
    return request.put<IamRole>({ url: `${BASE}/roles/${id}`, params: payload })
  },
  listPermissions(roleId: number) {
    return request.get<number[]>({ url: `${BASE}/roles/${roleId}/permissions` })
  },
  addPermission(roleId: number, permissionId: number) {
    return request.post({ url: `${BASE}/roles/${roleId}/permissions`, params: { permissionId } })
  },
  removePermission(roleId: number, permissionId: number) {
    return request.del({ url: `${BASE}/roles/${roleId}/permissions?permissionId=${permissionId}` })
  }
}

export const iamPermissionApi = {
  list() {
    return request.get<IamPermission[]>({ url: `${BASE}/permissions` })
  },
  create(payload: {
    namespace: string
    resource: string
    action: string
    name: string
    description?: string
  }) {
    return request.post<IamPermission>({ url: `${BASE}/permissions`, params: payload })
  },
  updateStatus(id: number, status: 'ACTIVE' | 'DEPRECATED') {
    return request.put<IamPermission>({ url: `${BASE}/permissions/${id}`, params: { status } })
  },
  deprecatedGrants() {
    return request.get<{ permissionId: number; code: string; activeGrants: number }[]>({
      url: `${BASE}/authz/deprecated-grants`
    })
  }
}

// ---------- 授权边界 / 模板 ----------

export const iamEntitlementApi = {
  listByAgent(agentId: number | string, includeRevoked = false) {
    return request.get<IamEntitlement[]>({
      url: `${BASE}/agents/${agentId}/entitlements`,
      params: includeRevoked ? { includeRevoked: true } : undefined
    })
  },
  grant(agentId: number | string, payload: { permissionIds: number[] } | { templateId: number }) {
    return request.post<IamEntitlement[]>({
      url: `${BASE}/agents/${agentId}/entitlements`,
      params: payload
    })
  },
  revoke(entitlementId: number) {
    return request.post({ url: `${BASE}/entitlements/${entitlementId}/revocation` })
  }
}

export const iamTemplateApi = {
  list() {
    return request.get<IamEntitlementTemplate[]>({ url: `${BASE}/entitlement-templates` })
  },
  create(payload: { code: string; name: string; description?: string }) {
    return request.post<IamEntitlementTemplate>({
      url: `${BASE}/entitlement-templates`,
      params: payload
    })
  },
  get(id: number) {
    return request.get<IamEntitlementTemplate>({ url: `${BASE}/entitlement-templates/${id}` })
  },
  updateStatus(id: number, status: 'ACTIVE' | 'DISABLED') {
    return request.put<IamEntitlementTemplate>({
      url: `${BASE}/entitlement-templates/${id}`,
      params: { status }
    })
  },
  addItem(id: number, permissionId: number) {
    return request.post({
      url: `${BASE}/entitlement-templates/${id}/items`,
      params: { permissionId }
    })
  },
  removeItem(id: number, permissionId: number) {
    return request.del({
      url: `${BASE}/entitlement-templates/${id}/items?permissionId=${permissionId}`
    })
  }
}

// ---------- UI 资源 ----------

export const iamUiResourceApi = {
  list() {
    return request.get<IamUiResource[]>({ url: `${BASE}/ui-resources` })
  },
  create(payload: {
    code: string
    name: string
    resourceType: 'MENU' | 'BUTTON'
    parentId?: number
    route?: string
    component?: string
    icon?: string
    sortOrder?: number
    permissionId?: number
  }) {
    return request.post<IamUiResource>({ url: `${BASE}/ui-resources`, params: payload })
  },
  update(
    id: number,
    payload: {
      name?: string
      parentId?: number
      route?: string
      component?: string
      icon?: string
      sortOrder?: number
      permissionId?: number
      status?: 'ACTIVE' | 'DISABLED'
    }
  ) {
    return request.put<IamUiResource>({ url: `${BASE}/ui-resources/${id}`, params: payload })
  },
  tree() {
    return request.get<IamUiResource[]>({ url: `${BASE}/ui-resources/tree` })
  }
}
