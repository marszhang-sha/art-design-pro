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
  // T18 载荷（契约 v0.6 §3.1）：id/parentId 为字符串；页面节点带 component/icon/sortOrder
  interface IamMenuNode {
    id: string
    code: string
    name: string
    parentId: string | null
    route: string | null
    component?: string | null
    icon?: string | null
    sortOrder?: number
    authList?: { title: string; authMark: string }[]
    children: IamMenuNode[]
  }

  // 图标名 → 模板惯例 Iconify ri:*（Remix）映射；未命中不渲染（ArtSvgIcon 对空 icon 不渲染）
  const ICON_MAP: Record<string, string> = {
    home: 'ri:home-5-line',
    folder: 'ri:folder-3-line',
    'folder-opened': 'ri:folder-open-line',
    'office-building': 'ri:building-2-line',
    bell: 'ri:notification-4-line',
    notification: 'ri:megaphone-line',
    setting: 'ri:settings-4-line',
    user: 'ri:user-3-line'
  }

  // component 解析：载荷 component 优先（相对 src/views 的视图路径）；
  // 缺失回退 legacy 约定映射（仅 /iam 域短路由，如 account → /iam/account/index）；
  // 非 /iam 域缺失 component → 警告并置空（MenuProcessor.filterEmptyMenus 过滤，不注册）
  const resolveComponent = (node: IamMenuNode, segment: string): string => {
    if (node.component) return node.component
    if (node.route && !node.route.startsWith('/')) return `/iam/${segment}/index`
    console.warn(`[菜单] 节点 ${node.code} 缺失 component 且无 legacy 回退路径，跳过注册`)
    return ''
  }

  // 递归转换：带子节点的视为目录（挂布局）；children 按 sortOrder 升序（载荷已排，
  // 此处兜底）；按钮不转路由，已由后端折叠进父页面 meta.authList（v-auth 按钮权限载体）
  const toRecord = (node: IamMenuNode, isRoot = false): AppRouteRecord => {
    const icon = node.icon ? ICON_MAP[node.icon] : undefined
    const meta = {
      title: node.name,
      keepAlive: true,
      authList: node.authList ?? [],
      ...(icon ? { icon } : {})
    }
    const children = (node.children ?? [])
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((child) => toRecord(child))

    if (node.children?.length) {
      // 目录节点：path 为父前缀（如 /org），children 为相对段
      return {
        name: node.code,
        path: node.route ?? `/${node.code}`,
        component: '/index/index',
        meta,
        children
      }
    }

    if (node.route) {
      const segment = node.route.replace(/^\/+/, '').split('/').pop() ?? node.code
      // 根级页面用完整 route（多段路由如 /ntf/notifications 不折尾段，buildFullPath 补前导 /）；
      // 子级页面用尾段（validateMenuPaths 约束子级 path 不带前导 /，normalizeMenuPaths 拼父前缀）
      const path = isRoot ? (node.route.startsWith('/') ? node.route : `/${node.route}`) : segment
      return {
        name: node.code,
        path,
        component: resolveComponent(node, segment),
        meta
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
      return Array.isArray(roots) ? roots.map((root) => toRecord(root, true)) : []
    })
}
