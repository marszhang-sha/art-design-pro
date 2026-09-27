import request from '@/utils/http'

/**
 * 登录
 * @param params 登录参数
 * @returns 登录响应
 */
export function fetchLogin(params: Api.Auth.LoginParams) {
  return request.post<Api.Auth.LoginResponse>({
    url: '/api/auth/login',
    params
    // showSuccessMessage: true // 显示成功消息
    // showErrorMessage: false // 不显示错误消息
  })
}

/**
 * 获取用户信息
 * @returns 用户信息
 */
export async function fetchGetUserInfo() {
  // IAM 对接：/me → 框架 UserInfo 形状
  const raw = await request.get<{
    id: string
    username: string
    email: string | null
    accountType: string
  }>({ url: '/api/v1/me' })

  return {
    userId: Number(raw.id),
    userName: raw.username,
    email: raw.email ?? '',
    buttons: [] as string[],
    roles: [] as string[]
  } as Api.Auth.UserInfo
}
