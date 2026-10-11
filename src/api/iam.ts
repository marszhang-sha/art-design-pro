/**
 * IAM API 封装（API-IAM 契约，Base /api/v1）
 *
 * 覆盖：认证会话、账号、角色、权限、授权边界、授权模板、认证配置、菜单资源。
 * 错误：RFC 7807 → HttpError(detail, 'IAM-xxxx')，由 http 层统一解析。
 */

import request from '@/utils/http'

const BASE = '/api/v1'

// ---------- 类型 ----------

/** IAM 分页响应信封（契约 §1：{items, page, size, total}） */
export interface IamPage<T> {
  items: T[]
  page: number
  size: number
  total: number
}

/** 排序方向（契约 §1：sortBy 各端点白名单 + sortOrder） */
export type IamSortOrder = 'asc' | 'desc'

/** GET /accounts 列表参数（分页 + 过滤 + 排序，契约 §3.2） */
export interface IamAccountListParams {
  page?: number
  size?: number
  agentId?: number
  status?: string
  type?: string
  keyword?: string
  sortBy?: string
  sortOrder?: IamSortOrder
}

/** GET /agents/{agentId}/sub-accounts 列表参数（过滤 status,keyword；排序白名单同 /accounts，契约 §3.6） */
export interface IamSubAccountListParams {
  page?: number
  size?: number
  status?: string
  keyword?: string
  sortBy?: string
  sortOrder?: IamSortOrder
}

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
  account: Pick<IamAccount, 'id' | 'username' | 'accountType' | 'agentId'> & {
    mustChangePassword: boolean
  }
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
  scenario: 'PLATFORM' | 'AGENT_MASTER'
  agentId?: number
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
  list(params?: IamAccountListParams) {
    return request.get<IamPage<IamAccount>>({ url: `${BASE}/accounts`, params })
  },
  get(id: string | number) {
    return request.get<IamAccount>({ url: `${BASE}/accounts/${id}` })
  },
  update(
    id: string | number,
    payload: Partial<Pick<IamAccount, 'displayName' | 'mobile' | 'email'>>
  ) {
    return request.patch<IamAccount>({ url: `${BASE}/accounts/${id}`, params: payload })
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

// ---------- 代理商子账号管理（API-IAM §3.6 agent 路由族 v0.4） ----------
// 仅 agent:* 权限可达；路径 {agentId} 须与调用者 JWT agt 一致（后端三道防线）。

export const iamSubAccountApi = {
  list(agentId: number | string, params?: IamSubAccountListParams) {
    return request.get<IamPage<IamAccount>>({
      url: `${BASE}/agents/${agentId}/sub-accounts`,
      params
    })
  },
  create(
    agentId: number | string,
    payload: {
      username: string
      displayName?: string
      mobile?: string
      email?: string
    }
  ) {
    return request.post<IamAccount>({
      url: `${BASE}/agents/${agentId}/sub-accounts`,
      params: payload
    })
  },
  disable(agentId: number | string, accountId: number | string) {
    return request.post<{ account: IamAccount; cascaded: { id: number; status: string }[] }>({
      url: `${BASE}/agents/${agentId}/sub-accounts/${accountId}/disable`
    })
  },
  adminResetPassword(agentId: number | string, accountId: number | string) {
    return request.post<{ temporaryPassword: string }>({
      url: `${BASE}/agents/${agentId}/sub-accounts/${accountId}/reset-password`
    })
  },
  listRoles(agentId: number | string, accountId: number | string) {
    return request.get<IamAccountRole[]>({
      url: `${BASE}/agents/${agentId}/sub-accounts/${accountId}/roles`
    })
  },
  assignRole(agentId: number | string, accountId: number | string, roleId: number) {
    return request.post({
      url: `${BASE}/agents/${agentId}/sub-accounts/${accountId}/roles`,
      params: { roleId }
    })
  },
  revokeRole(agentId: number | string, accountId: number | string, roleId: number) {
    return request.del({
      url: `${BASE}/agents/${agentId}/sub-accounts/${accountId}/roles/${roleId}`
    })
  }
}

// Agent 自定义/内置角色（后端已过滤：AGENT scope 且属本代理商或全局内置）
export const iamAgentRoleApi = {
  list(agentId: number | string) {
    return request.get<IamRole[]>({ url: `${BASE}/agents/${agentId}/roles` })
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
    return request.patch<IamRole>({ url: `${BASE}/roles/${id}`, params: payload })
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
    return request.patch<IamPermission>({ url: `${BASE}/permissions/${id}`, params: { status } })
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
    return request.patch<IamEntitlementTemplate>({
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
      url: `${BASE}/entitlement-templates/${id}/items/${permissionId}`
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
    return request.patch<IamUiResource>({ url: `${BASE}/ui-resources/${id}`, params: payload })
  },
  tree() {
    return request.get<IamUiResource[]>({ url: `${BASE}/ui-resources/tree` })
  }
}

// ---------- 组织节点（契约 §3.7，v0.5） ----------

export type IamOrgNodeType = 'PHARMA' | 'BUSINESS_ENTITY' | 'CSO_AGENT'

export interface IamOrgNode {
  id: number
  nodeType: IamOrgNodeType
  code: string
  name: string
  shortName: string
  uscc: string
  registeredAddress: string
  contactPerson: string
  contactPhone: string
  registeredCapital: number // 万元（BE NUMERIC(14,2) → 数值出参）
  legalRepresentative: string
  establishedDate: string // ISO 日期
  attributes: Record<string, unknown> | null
  status: 'ACTIVE' | 'DISABLED'
  parentId: number | null
  children?: IamOrgNode[]
}

export interface IamOrgListParams {
  nodeType?: IamOrgNodeType
  status?: 'ACTIVE' | 'DISABLED'
  keyword?: string // code/name/shortName 模糊
}

/** 基础信息九项 + code（ORG-07）；nodeType/parentId 不可经 API 提交（出现即 400 IAM-4001） */
export interface IamOrgPayload {
  code: string
  name: string
  shortName: string
  uscc: string
  registeredAddress: string
  contactPerson: string
  contactPhone: string
  registeredCapital: number
  legalRepresentative: string
  establishedDate: string
  attributes?: Record<string, unknown>
}

export const iamOrgApi = {
  /** 树形全量（不分页）；PHARMA.children=业务实体，CSO_AGENT 恒空 */
  tree(params?: IamOrgListParams) {
    return request.get<IamOrgNode[]>({ url: `${BASE}/orgs`, params })
  },
  get(id: number) {
    return request.get<IamOrgNode>({ url: `${BASE}/orgs/${id}` })
  },
  create(nodeType: 'BUSINESS_ENTITY' | 'CSO_AGENT', payload: IamOrgPayload) {
    return request.post<IamOrgNode>({ url: `${BASE}/orgs`, params: { nodeType, ...payload } })
  },
  update(id: number, payload: Partial<IamOrgPayload>) {
    return request.patch<IamOrgNode>({ url: `${BASE}/orgs/${id}`, params: payload })
  },
  disable(id: number) {
    return request.post<IamOrgNode>({ url: `${BASE}/orgs/${id}/disable` })
  },
  enable(id: number) {
    return request.post<IamOrgNode>({ url: `${BASE}/orgs/${id}/enable` })
  }
}

// ---------- 员工（契约 §3.8，v0.5.1） ----------

export interface IamEmployee {
  id: number
  employeeNo: string
  name: string
  orgNodeId: number
  attributes: Record<string, unknown> | null
  employmentStatus: 'ACTIVE' | 'TERMINATED'
}

export interface IamEmployeeListParams {
  orgNodeId?: number
  employmentStatus?: 'ACTIVE' | 'TERMINATED'
  keyword?: string // employeeNo/name 模糊
  sortBy?: 'id' | 'employeeNo' | 'name' | 'orgNodeId' | 'employmentStatus' | 'createdAt'
  sortOrder?: IamSortOrder
  page?: number
  size?: number
}

export const iamEmployeeApi = {
  list(params?: IamEmployeeListParams) {
    return request.get<IamPage<IamEmployee>>({ url: `${BASE}/employees`, params })
  },
  get(id: number) {
    return request.get<IamEmployee>({ url: `${BASE}/employees/${id}` })
  },
  create(payload: {
    employeeNo: string
    name: string
    orgNodeId: number
    attributes?: Record<string, unknown>
  }) {
    return request.post<IamEmployee>({ url: `${BASE}/employees`, params: payload })
  },
  /** 仅 ACTIVE 可变更（TERMINATED 终态 409 IAM-5002）；employeeNo 不可改；转挂同事务联动账号归属（ACC-08） */
  update(
    id: number,
    payload: { name?: string; orgNodeId?: number; attributes?: Record<string, unknown> }
  ) {
    return request.patch<IamEmployee>({ url: `${BASE}/employees/${id}`, params: payload })
  },
  /** EMP-01 同步联动：同事务置 TERMINATED 并停用关联平台账号；响应含 cascadedAccounts */
  terminate(id: number) {
    return request.post<{
      employee: IamEmployee
      cascadedAccounts: { id: number; status: string }[]
    }>({
      url: `${BASE}/employees/${id}/termination`
    })
  },
  // ---- 岗位分配（契约 §3.11，v0.7；EMP-05…11）----
  /** 分配列表（join 岗位/部门名；主岗优先排序）；TERMINATED 员工只读 */
  listPositions(employeeId: number) {
    return request.get<IamEmployeePosition[]>({ url: `${BASE}/employees/${employeeId}/positions` })
  },
  /** 分配岗位：重复 409 IAM-4090；isPrimary=true 同事务先降旧主岗（EMP-06） */
  assignPosition(employeeId: number, payload: { positionId: number; isPrimary?: boolean }) {
    return request.post({
      url: `${BASE}/employees/${employeeId}/positions`,
      params: payload
    })
  },
  /** 设主岗（先降后升）；停用岗位 400 IAM-5008 */
  setPrimaryPosition(employeeId: number, positionId: number) {
    return request.post({ url: `${BASE}/employees/${employeeId}/positions/${positionId}/primary` })
  },
  /** 解除分配（EMP-08 零主岗合法；审计记 wasPrimary） */
  removePosition(employeeId: number, positionId: number) {
    return request.del({ url: `${BASE}/employees/${employeeId}/positions/${positionId}` })
  }
}

// ---------- 部门 / 岗位（契约 §3.9/§3.10，v0.7；DEP-01…03 / POS-01…06） ----------

/** 部门树节点（树形全量不分页，children[]；命中过滤时孤儿上浮成林） */
export interface IamDepartmentNode {
  id: string
  code: string
  name: string
  parentId: string | null
  orgNodeId: string
  attributes: Record<string, unknown> | null
  status: 'ACTIVE' | 'DISABLED'
  createdAt?: string
  updatedAt?: string
  children: IamDepartmentNode[]
}

/** 岗位树节点＝汇报线（parentId 上级可跨部门；departmentId 可空＝公司级岗位） */
export interface IamPositionNode {
  id: string
  code: string
  name: string
  parentId: string | null
  departmentId: string | null
  attributes: Record<string, unknown> | null
  status: 'ACTIVE' | 'DISABLED'
  createdAt?: string
  updatedAt?: string
  children: IamPositionNode[]
}

/** 员工岗位分配行（GET /employees/{id}/positions） */
export interface IamEmployeePosition {
  id: string
  positionId: string
  positionCode: string
  positionName: string
  departmentName: string | null
  isPrimary: boolean
  createdAt?: string
}

/** 岗位在岗人员行（GET /positions/{id}/employees；BR-POS-06 预留查询，仅在职） */
export interface IamPositionEmployee {
  id: string
  employeeId: string
  employeeNo: string
  name: string
  isPrimary: boolean
  assignedAt?: string
}

export const iamDepartmentApi = {
  /** 树形全量（过滤 orgNodeId/status/keyword，命中子林成林） */
  tree(params?: { orgNodeId?: number; status?: 'ACTIVE' | 'DISABLED'; keyword?: string }) {
    return request.get<IamDepartmentNode[]>({ url: `${BASE}/departments`, params })
  },
  get(id: number | string) {
    return request.get<IamDepartmentNode>({ url: `${BASE}/departments/${id}` })
  },
  /** 创建：挂靠三口（BE 须 ACTIVE）；同父重名/编码冲突 409 IAM-4004 */
  create(payload: {
    code: string
    name: string
    orgNodeId: number
    parentId?: number
    attributes?: Record<string, unknown>
  }) {
    return request.post<IamDepartmentNode>({ url: `${BASE}/departments`, params: payload })
  },
  /** 仅 name/attributes（parentId/orgNodeId 出现即 400 IAM-4001，DEP-02） */
  update(id: number | string, payload: { name: string; attributes?: Record<string, unknown> }) {
    return request.patch({ url: `${BASE}/departments/${id}`, params: payload })
  },
  /** 软停用：沿祖先链冻结新建子部门/岗位/新分配，存量不动；重复停用 409 IAM-5005 */
  disable(id: number | string) {
    return request.post({ url: `${BASE}/departments/${id}/disable` })
  },
  /** 重复启用 409 IAM-5005 */
  enable(id: number | string) {
    return request.post({ url: `${BASE}/departments/${id}/enable` })
  }
}

export const iamPositionApi = {
  /** 汇报线树形全量（过滤 departmentId/status/keyword，父不在结果集则子岗上浮成林） */
  tree(params?: { departmentId?: number; status?: 'ACTIVE' | 'DISABLED'; keyword?: string }) {
    return request.get<IamPositionNode[]>({ url: `${BASE}/positions`, params })
  },
  get(id: number | string) {
    return request.get<IamPositionNode>({ url: `${BASE}/positions/${id}` })
  },
  /** 按岗位查在职人员（BR-POS-06 预留查询；审批域零改造接入） */
  listEmployees(id: number | string) {
    return request.get<IamPositionEmployee[]>({ url: `${BASE}/positions/${id}/employees` })
  },
  /** 创建：departmentId 可空＝公司级岗位（裁定 A）；parentId 可跨部门（POS-02） */
  create(payload: {
    code: string
    name: string
    departmentId?: number | null
    parentId?: number
    attributes?: Record<string, unknown>
  }) {
    return request.post<IamPositionNode>({ url: `${BASE}/positions`, params: payload })
  },
  /** name/attributes/parentId 任意子集；parentId 走 POS-03 成环校验（400 IAM-5009）；departmentId 出现即 400（POS-05） */
  update(
    id: number | string,
    payload: { name?: string; parentId?: number; attributes?: Record<string, unknown> }
  ) {
    return request.patch<IamPositionNode>({ url: `${BASE}/positions/${id}`, params: payload })
  },
  /** 软停用：在岗分配保留；重复停用 409 IAM-5007 */
  disable(id: number | string) {
    return request.post({ url: `${BASE}/positions/${id}/disable` })
  },
  /** 重复启用 409 IAM-5007 */
  enable(id: number | string) {
    return request.post({ url: `${BASE}/positions/${id}/enable` })
  }
}
