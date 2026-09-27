import request from '@/utils/http'
import { AppRouteRecord } from '@/types/router'

// 获取用户列表
export function fetchGetUserList(params: Api.SystemManage.UserSearchParams) {
  return request.get<Api.SystemManage.UserList>({
    url: '/api/user/list',
    params
  })
}

// 获取角色列表
export function fetchGetRoleList(params: Api.SystemManage.RoleSearchParams) {
  return request.get<Api.SystemManage.RoleList>({
    url: '/api/role/list',
    params
  })
}

// 获取菜单列表（IAM /me/menus → AppRouteRecord；后端已按权限过滤，默认 HIDE）
export function fetchGetMenuList() {
  interface IamMenuNode {
    id: number
    code: string
    name: string
    parentId: number | null
    route: string | null
    authList?: { title: string; authMark: string }[]
    children: IamMenuNode[]
  }

  // 递归转换：带 route 的视为页面（component=route+index）；目录节点挂布局；
  // 按钮不转路由，已由后端折叠进父页面 meta.authList（v-auth 按钮权限载体）
  const toRecord = (node: IamMenuNode): AppRouteRecord => {
    const meta = {
      title: node.name,
      keepAlive: true,
      authList: node.authList ?? []
    }
    const children = (node.children ?? []).map((child) => toRecord(child))

    if (node.route) {
      return {
        name: node.code,
        path: node.route,
        component: `${node.route}/index`,
        meta,
        ...(children.length ? { children: children.filter((c) => c.path !== node.route) } : {})
      }
    }

    // 目录节点（无 route）：挂布局组件，children 为组内页面
    return {
      name: node.code,
      path: `/${node.code}`,
      component: '/index/index',
      meta,
      children
    }
  }

  return request
    .get<{ menus: IamMenuNode[] } | IamMenuNode[]>({ url: '/api/v1/me/menus' })
    .then((resp) => {
      const roots = Array.isArray(resp) ? resp : resp?.menus
      return Array.isArray(roots) ? roots.map((root) => toRecord(root)) : []
    })
}
