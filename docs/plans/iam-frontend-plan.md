# IAM 前端实施计划（art-design-pro）

> Artifact ID: PLAN-IAM-FE Status: Approved（用户 2026-09-26 批准框架与页面架构；逐任务一 commit）依据：blueprint 仓库 docs/design/ui/iam-ui-spec.md（UI-IAM）+ docs/design/api/iam-api-contract.md（API-IAM）分支：feat/iam-management（自 feat/cso-management-prototype 切出）验证口径：`pnpm lint` + `pnpm build` + dev server 冒烟（关键页 200）

## Global Constraints

- 技术栈沿用框架：Vue 3 + Element Plus + Pinia + Vue Router；不新增 UI 库
- 新增依赖仅限：pyjwt 对应的 `jwt-decode`（如需）等最小集，逐任务声明
- API 字段 camelCase；错误 RFC 7807 + 业务码 IAM-xxxx；Base `/api/v1`
- 后端地址可配置：`.env.development.local` → `VITE_API_PROXY_URL`（不入库）
- 所有管理端动作挂 `v-perm` 权限码；后端为唯一权威（BR-IAM-047）

## 任务序列

| Task | 内容 | 依赖 |
| --- | --- | --- |
| FE-T0 | 分支 + 开发环境变量（可配置后端地址） | — |
| FE-T1 | API 层 `src/api/iam.ts`（全部端点封装，camelCase）+ http 拦截器增强（401→refresh 重放一次、IAM-1006→登出、RFC 7807 detail 提取） | T0 |
| FE-T2 | 登录/登出对接 + 三源引导（/me、/me/permissions、/me/menus）+ 首登强制改密跳转 | T1 |
| FE-T3 | 动态菜单注册（/me/menus → RouteTransformer）+ `v-perm` 指令 + 权限码 store | T2 |
| FE-T4 | 账号管理页 `/iam/account`（UI-IAM-004：主账号级四动作/级联提示/角色授予/开户 Modal） | T3 |
| FE-T5 | 子账号管理页 `/iam/sub-account`（UI-IAM-005：创建/重置/授权/四动作，主账号令牌） | T4 |
| FE-T6 | 角色管理页 `/iam/role`（UI-IAM-007：权限树勾选、builtIn 保护、⊆ 校验提示） | T3 |
| FE-T7 | 授权管理页 `/iam/permission`（UI-IAM-006：注册/废弃/治理看板） | T3 |
| FE-T8 | 授权模板页 `/iam/entitlement-template`（UI-IAM-008） | T3 |
| FE-T9 | 功能开通页 `/iam/entitlement`（UI-IAM-009：双路径授予/吊销/历史/快照确认） | T8 |
| FE-T10 | 认证配置页 `/iam/authn-config`（UI-IAM-010：realm/provider/policy 三 tab） | T1 |
| FE-T11 | 菜单资源管理页 `/iam/ui-resource`（UI-IAM-011：树 CRUD/换绑/环防护） | T3 |
| FE-T12 | 个人中心自助改密 + 密码找回页（UI-IAM-002/012） | T1 |

## 每任务验收

1. `pnpm lint` 通过；2. `pnpm build` 通过；3. dev server 冒烟（页面可达、核心动作请求发出）；4. 独立 commit（`feat(iam-fe): …`）。

## 收尾

- 全部页面 → dev server 全路由冒烟 + 手工过一遍 UI-IAM 各节状态
- 与后端联调记录（设密链接交付、级联停用确认文案等）
