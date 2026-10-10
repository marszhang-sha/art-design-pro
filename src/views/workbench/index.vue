<template>
  <!-- UI-IAM-003 工作台（无码公共页，sortOrder 全树最小 = 登录落地页）：
       欢迎头部 / 公告 feed 主区 / 通知摘要卡片 / 快捷入口卡片 / 最新资料卡片。只读既有 API，无新后端端点。 -->
  <div class="workbench p-4">
    <!-- ① 欢迎头部 -->
    <ElCard shadow="never" class="mb-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 class="m-0 text-xl font-semibold">
            {{ greeting }}，{{ displayName }}
            <ElTag v-if="accountTypeLabel" size="small" class="ml-2">{{ accountTypeLabel }}</ElTag>
          </h2>
          <p class="mb-0 mt-1 text-sm text-gray-400">{{ todayText }}</p>
        </div>
        <!-- 当日天气：Open-Meteo 固定上海；加载中占位「—」，失败整块隐藏（见 loadWeather） -->
        <div v-if="weather" class="flex items-center gap-2.5">
          <ArtSvgIcon :icon="weather.icon" class="text-3xl text-warning" />
          <div class="text-sm leading-5">
            <div>{{ weather.text }} {{ weather.temp }}°C</div>
            <div class="text-xs text-gray-400">今日 {{ weather.min }}~{{ weather.max }}°C</div>
          </div>
        </div>
        <span v-else-if="weatherLoading" class="text-2xl font-light text-gray-300">—</span>
      </div>
    </ElCard>

    <!-- ②a 快捷入口：按菜单可见性过滤；无可见项整卡隐藏（横排，移至欢迎卡下） -->
    <ElCard v-if="quickEntries.length" shadow="never" class="mb-4">
      <template #header>
        <span class="font-medium">快捷入口</span>
      </template>
      <div class="flex flex-wrap gap-3">
        <div
          v-for="entry in quickEntries"
          :key="entry.path"
          class="quick-entry min-w-40"
          @click="router.push(entry.path)"
        >
          <ArtSvgIcon :icon="entry.icon" class="text-xl text-primary" />
          <span class="text-sm">{{ entry.label }}</span>
        </div>
      </div>
    </ElCard>

    <ElRow :gutter="16">
      <!-- ② 公告 feed 主区：点击开详情抽屉，打开即标已读（BR-ANC 与通知共行） -->
      <ElCol :xs="24" :md="15" :lg="16">
        <ElCard shadow="never" class="workbench-card">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-medium">公告</span>
              <ElTag v-if="bySourceType.ANNOUNCEMENT > 0" type="danger" size="small" effect="plain">
                {{ bySourceType.ANNOUNCEMENT }} 条未读
              </ElTag>
            </div>
          </template>

          <div v-loading="feedLoading" class="feed-list">
            <template v-if="feedError">
              <ElResult icon="error" title="公告加载失败">
                <template #extra>
                  <ElButton type="primary" @click="() => loadFeed()">重试</ElButton>
                </template>
              </ElResult>
            </template>
            <template v-else-if="feedItems.length">
              <div
                v-for="item in feedItems"
                :key="item.entryId"
                class="feed-item"
                @click="openAnnouncement(item.announcementId, item.entryId)"
              >
                <span v-if="!item.readAt" class="unread-dot"></span>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <span class="truncate" :class="item.readAt ? 'text-gray-500' : 'font-medium'">
                      {{ item.title }}
                    </span>
                    <ElTag v-if="item.pinned" type="warning" size="small">置顶</ElTag>
                  </div>
                  <div class="mt-0.5 text-xs text-gray-400">
                    {{ formatDateTime(item.publishAt) }}
                    <span v-if="item.attachmentCount > 0" class="ml-2">
                      附件 {{ item.attachmentCount }}
                    </span>
                  </div>
                </div>
                <ArtSvgIcon icon="ri:arrow-right-s-line" class="text-gray-300" />
              </div>
              <div v-if="feedHasMore" class="pt-1 text-center">
                <ElButton link type="primary" @click="loadMoreFeed">加载更多</ElButton>
              </div>
            </template>
            <ElEmpty v-else-if="!feedLoading" description="暂无公告" :image-size="80" />
          </div>
        </ElCard>

        <!-- ⑤ 最新资料：代理商可见最新 10 条（GET /me/materials，默认 createdAt desc）；
             点行/「查看」就地弹详情抽屉，「更多资料」进资料库 -->
        <ElCard shadow="never" class="mt-4">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-medium">最新资料</span>
              <ElLink type="primary" :underline="false" @click="goLibrary()">
                更多资料
                <ArtSvgIcon icon="ri:arrow-right-s-line" />
              </ElLink>
            </div>
          </template>

          <div v-loading="matLoading">
            <template v-if="matError">
              <ElResult icon="error" title="最新资料加载失败">
                <template #extra>
                  <ElButton type="primary" @click="loadLatestMaterials">重试</ElButton>
                </template>
              </ElResult>
            </template>
            <template v-else-if="matItems.length">
              <div class="grid grid-cols-1">
                <div v-for="m in matItems" :key="m.id" class="mat-item" @click="openMatDetail(m)">
                  <span class="min-w-0 flex-[2] truncate text-sm font-medium" :title="m.name">{{
                    m.name
                  }}</span>
                  <span
                    class="min-w-0 flex-1 truncate text-xs text-gray-400"
                    :title="dimensionLabel(m.buId, m.productLineId)"
                  >
                    {{ dimensionLabel(m.buId, m.productLineId) }}
                  </span>
                  <span class="flex-1 text-xs text-gray-400">
                    {{ m.currentVersion ? `v${m.currentVersion.versionNo}` : '—' }}
                  </span>
                  <span class="min-w-0 flex-1 truncate text-right text-xs text-gray-400">
                    {{ formatDateTime(m.createdAt) }}
                  </span>
                  <ElButton link type="primary" class="shrink-0" @click.stop="openMatDetail(m)"
                    >查看</ElButton
                  >
                </div>
              </div>
            </template>
            <ElEmpty v-else-if="!matLoading" description="暂无资料" :image-size="60" />
          </div>
        </ElCard>
      </ElCol>

      <ElCol :xs="24" :md="9" :lg="8">
        <!-- ②b 工作日历（T30）：月度视图，假期/月报日/申诉日标注；数据源 /masterdata/work-calendar（只读镜像） -->
        <ElCard shadow="never" class="mb-4 workbench-card">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-medium">工作日历</span>
              <div class="flex items-center gap-2">
                <ElButton size="small" text @click="shiftMonth(-1)">
                  <ElIcon><ArrowLeft /></ElIcon>
                </ElButton>
                <span class="text-sm font-medium">{{ calMonth }}</span>
                <ElButton size="small" text @click="shiftMonth(1)">
                  <ElIcon><ArrowRight /></ElIcon>
                </ElButton>
              </div>
            </div>
          </template>
          <div v-loading="calLoading">
            <ElCalendar v-model="calDate" class="md-cal">
              <template #header>
                <span class="text-xs text-gray-400">
                  图例：<ElTag size="small" type="danger" effect="plain">休</ElTag> 休息日 ·
                  <ElTag size="small" type="warning" effect="plain">报</ElTag> 月报日 ·
                  <ElTag size="small" type="primary" effect="plain">申诉</ElTag> 申诉日
                </span>
              </template>
              <template #date-cell="{ data }">
                <div
                  class="cal-cell"
                  :class="{ 'cal-other': !data.isSelected && !inCurrentMonth(data.day) }"
                >
                  <div class="cal-day">{{ Number(data.day.slice(8)) }}</div>
                  <div v-if="inCurrentMonth(data.day)" class="cal-marks">
                    <ElTag v-if="marks(data.day).holiday" size="small" type="danger" effect="plain"
                      >休</ElTag
                    >
                    <ElTag v-if="marks(data.day).report" size="small" type="warning" effect="plain"
                      >报</ElTag
                    >
                    <ElTag v-if="marks(data.day).appeal" size="small" type="primary" effect="plain"
                      >申诉</ElTag
                    >
                  </div>
                </div>
              </template>
            </ElCalendar>
            <div v-if="calEmpty && !calLoading" class="py-1 text-center text-xs text-gray-400">
              该月暂无日历数据（等待同步）
            </div>
          </div>
        </ElCard>

        <!-- ③ 通知摘要：未读总数 + 最近 5 条；查看全部 → 通知中心 -->
        <ElCard shadow="never" class="mb-4">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-medium">通知</span>
              <ElLink type="primary" :underline="false" @click="goNotifications">
                查看全部
                <ArtSvgIcon icon="ri:arrow-right-s-line" />
              </ElLink>
            </div>
          </template>

          <div v-loading="ntfLoading">
            <template v-if="ntfError">
              <ElResult icon="error" title="通知加载失败">
                <template #extra>
                  <ElButton type="primary" @click="loadNtfSummary">重试</ElButton>
                </template>
              </ElResult>
            </template>
            <template v-else-if="ntfEntries.length">
              <div
                v-for="entry in ntfEntries"
                :key="entry.id"
                class="ntf-item"
                :class="{ 'c-p': entry.notification.sourceType === 'ANNOUNCEMENT' }"
                @click="onNtfClick(entry)"
              >
                <ElTag
                  size="small"
                  :type="entry.notification.sourceType === 'ANNOUNCEMENT' ? 'primary' : 'info'"
                >
                  {{ sourceLabel(entry.notification.sourceType) }}
                </ElTag>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <span
                      class="truncate text-sm"
                      :class="entry.readAt ? 'text-gray-500' : 'font-medium'"
                    >
                      {{ entry.notification.title }}
                    </span>
                    <span v-if="!entry.readAt" class="unread-dot"></span>
                  </div>
                </div>
                <span class="shrink-0 text-xs text-gray-400">
                  {{ formatDateTime(entry.notification.publishedAt) }}
                </span>
              </div>
            </template>
            <ElEmpty v-else-if="!ntfLoading" description="暂无通知" :image-size="60" />
          </div>
        </ElCard>
      </ElCol>
    </ElRow>

    <!-- 资料详情抽屉（与资料库共用组件）：预览 + 版本链 + 下载 -->
    <MaterialDetailDrawer v-model="matDetailVisible" :material-id="matDetailId" />

    <!-- 公告详情抽屉（与通知中心共用组件）：打开即标已读并回刷红点 -->
    <AncAnnouncementDetail
      v-model="drawerVisible"
      :announcement-id="drawerAnnouncementId"
      :entry-id="drawerEntryId"
      @read="onAnnouncementRead"
    />
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue'
  import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
  import { ElButton, ElIcon, ElTag } from 'element-plus'
  import { mdRegistryApi, type MdWorkCalendarRow } from '@/api/md'

  import { useRouter } from 'vue-router'
  import { storeToRefs } from 'pinia'
  import { iamAuthApi, type IamAccount } from '@/api/iam'
  import { ancApi, type AncMyAnnouncementItem } from '@/api/anc'
  import { ntfApi, type NtfInboxEntry, type NtfSourceType } from '@/api/ntf'
  import { pmMyApi, PM_DIMENSIONS_PLACEHOLDER, type PmMaterialListItem } from '@/api/pm'
  import MaterialDetailDrawer from '@/views/pm/components/material-detail-drawer.vue'
  import { useMenuStore } from '@/store/modules/menu'
  import AncAnnouncementDetail from '@/components/business/anc-announcement-detail/index.vue'
  import { useNtfUnread } from '@/components/business/notification-bell/use-ntf-unread'

  defineOptions({ name: 'Workbench' })

  const router = useRouter()
  const menuStore = useMenuStore()
  const { menuList } = storeToRefs(menuStore)
  const { bySourceType, refresh } = useNtfUnread()

  // ---------- ① 欢迎头部（GET /me） ----------

  const me = ref<IamAccount | null>(null)

  const displayName = computed(() => me.value?.displayName || me.value?.username || '')
  const accountTypeLabel = computed(() =>
    me.value?.accountType === 'AGENT_USER'
      ? '代理商'
      : me.value?.accountType === 'PLATFORM_USER'
        ? '平台用户'
        : ''
  )

  const greeting = computed(() => {
    const h = new Date().getHours()
    if (h < 12) return '早上好'
    if (h < 18) return '下午好'
    return '晚上好'
  })
  const todayText = computed(() =>
    new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  )

  // ---------- ①' 当日天气（Open-Meteo 免费接口，固定上海，不做地理定位） ----------

  /** Open-Meteo 响应中实际用到的字段（forecast_days=1，daily 数组仅取 [0]） */
  interface OpenMeteoResp {
    current?: { weather_code?: number; temperature_2m?: number }
    daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[] }
  }

  interface WorkbenchWeather {
    text: string
    icon: string
    temp: number
    min: number
    max: number
  }

  const WEATHER_API_URL =
    'https://api.open-meteo.com/v1/forecast?latitude=31.2304&longitude=121.4737&current=weather_code,temperature_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1'

  /** WMO weather_code 分组映射（文案 + 图标）；未命中回退「未知 / 云图标」 */
  const WEATHER_GROUPS: Array<{ codes: number[]; text: string; icon: string }> = [
    { codes: [0], text: '晴', icon: 'ri:sun-line' },
    { codes: [1, 2], text: '多云', icon: 'ri:cloudy-line' },
    { codes: [3], text: '阴', icon: 'ri:cloudy-fill' },
    { codes: [45, 48], text: '雾', icon: 'ri:haze-line' },
    { codes: [51, 53, 55, 56, 57], text: '毛毛雨', icon: 'ri:drizzle-line' },
    { codes: [61, 63, 65, 66, 67], text: '雨', icon: 'ri:rainy-line' },
    { codes: [71, 73, 75, 77], text: '雪', icon: 'ri:snowy-line' },
    { codes: [80, 81, 82], text: '阵雨', icon: 'ri:showers-line' },
    { codes: [85, 86], text: '阵雪', icon: 'ri:snowy-line' },
    { codes: [95], text: '雷雨', icon: 'ri:thunderstorms-line' },
    { codes: [96, 99], text: '雷雨冰雹', icon: 'ri:hail-line' }
  ]

  const weatherLoading = ref(true)
  const weather = ref<WorkbenchWeather | null>(null)

  /** 原生 fetch 直连 Open-Meteo（无 key、CORS 开放，与后端 baseURL 无关，勿走 @/utils/http） */
  async function loadWeather() {
    try {
      const res = await fetch(WEATHER_API_URL)
      if (!res.ok) return
      const data = (await res.json()) as OpenMeteoResp
      const cur = data.current
      const max = data.daily?.temperature_2m_max?.[0]
      const min = data.daily?.temperature_2m_min?.[0]
      if (!cur || typeof cur.weather_code !== 'number' || typeof cur.temperature_2m !== 'number')
        return
      if (typeof max !== 'number' || typeof min !== 'number') return
      const code = cur.weather_code
      const group = WEATHER_GROUPS.find((g) => g.codes.includes(code))
      weather.value = {
        text: group?.text ?? '未知',
        icon: group?.icon ?? 'ri:cloud-line',
        temp: Math.round(cur.temperature_2m),
        min: Math.round(min),
        max: Math.round(max)
      }
    } catch {
      // 失败静默：weather 保持 null → 模板整块隐藏，不弹窗不影响页面其他区域
    } finally {
      weatherLoading.value = false
    }
  }

  // ---------- ② 公告 feed（GET /me/announcements，加载更多式分页） ----------

  const FEED_PAGE_SIZE = 10
  const feedLoading = ref(false)
  const feedError = ref(false)
  const feedItems = ref<AncMyAnnouncementItem[]>([])
  const feedPage = ref(1)
  const feedTotal = ref(0)

  const feedHasMore = computed(() => feedItems.value.length < feedTotal.value)

  async function loadFeed(reset = true) {
    feedLoading.value = true
    feedError.value = false
    if (reset) feedPage.value = 1
    try {
      const page = await ancApi.myAnnouncements({
        page: feedPage.value,
        size: FEED_PAGE_SIZE,
        unreadOnly: 'false'
      })
      feedItems.value = reset ? page.items : [...feedItems.value, ...page.items]
      feedTotal.value = page.total
    } catch {
      feedError.value = true
    } finally {
      feedLoading.value = false
    }
  }

  function loadMoreFeed() {
    feedPage.value += 1
    loadFeed(false)
  }

  // ---------- ③ 通知摘要（unread-count + 最近 5 条） ----------

  const NTF_SUMMARY_SIZE = 5
  const ntfLoading = ref(false)
  const ntfError = ref(false)
  const ntfEntries = ref<NtfInboxEntry[]>([])

  async function loadNtfSummary() {
    ntfLoading.value = true
    ntfError.value = false
    try {
      const page = await ntfApi.list({ page: 1, size: NTF_SUMMARY_SIZE, unreadOnly: 'false' })
      ntfEntries.value = page.items
    } catch {
      ntfError.value = true
    } finally {
      ntfLoading.value = false
    }
  }

  function sourceLabel(type: NtfSourceType): string {
    return type === 'ANNOUNCEMENT' ? '公告' : '账号'
  }

  /** ANNOUNCEMENT 条目 → 公告详情抽屉（sourceId 即公告 id，entry id 用于标已读）；ACCOUNT_EVENT 不跳转 */
  function onNtfClick(entry: NtfInboxEntry) {
    if (entry.notification.sourceType !== 'ANNOUNCEMENT') return
    openAnnouncement(entry.notification.sourceId, entry.id)
  }

  // ---------- ④ 快捷入口（按菜单可见性过滤） ----------

  const QUICK_ENTRY_CANDIDATES = [
    { path: '/org/organizations', label: '组织管理', icon: 'ri:building-2-line' },
    { path: '/org/employees', label: '员工管理', icon: 'ri:team-line' },
    { path: '/anc/announcement', label: '公告管理', icon: 'ri:megaphone-line' },
    { path: '/iam/sub-account', label: '子账号管理', icon: 'ri:user-settings-line' }
  ]

  interface MenuLike {
    path: string
    children?: MenuLike[]
  }

  function flattenMenuPaths(routes: MenuLike[], parentPath = ''): string[] {
    const out: string[] = []
    for (const r of routes) {
      const p = r.path.startsWith('/')
        ? r.path
        : parentPath
          ? `${parentPath}/${r.path}`.replace(/\/{2,}/g, '/')
          : `/${r.path}`
      out.push(p)
      if (r.children?.length) out.push(...flattenMenuPaths(r.children, p))
    }
    return out
  }

  const quickEntries = computed(() => {
    const visible = new Set(flattenMenuPaths(menuList.value))
    return QUICK_ENTRY_CANDIDATES.filter((c) => visible.has(c.path))
  })

  // ---------- ⑤ 最新资料（GET /me/materials，最新 10 条；默认排序 createdAt desc） ----------

  const MAT_LATEST_SIZE = 10
  const matLoading = ref(false)
  const matError = ref(false)
  const matItems = ref<PmMaterialListItem[]>([])

  async function loadLatestMaterials() {
    matLoading.value = true
    matError.value = false
    try {
      const page = await pmMyApi.list({ page: 1, size: MAT_LATEST_SIZE })
      matItems.value = page.items
    } catch {
      matError.value = true
    } finally {
      matLoading.value = false
    }
  }

  /** BU/产品线 id → 占位名称（与资料库页同源映射；id 空间独立各查各域，未命中兜底「未知(id)」） */
  function buName(id: string | number): string {
    return PM_DIMENSIONS_PLACEHOLDER.find((b) => b.id === Number(id))?.name ?? `未知(${id})`
  }

  function plName(id: string | number): string {
    const num = Number(id)
    for (const b of PM_DIMENSIONS_PLACEHOLDER) {
      const pl = b.productLines.find((p) => p.id === num)
      if (pl) return pl.name
    }
    return `未知(${id})`
  }

  function dimensionLabel(buId: string, productLineId: string): string {
    return `${buName(buId)} / ${plName(productLineId)}`
  }

  // ---------- 公告详情抽屉 ----------

  const drawerVisible = ref(false)
  const drawerAnnouncementId = ref<string | null>(null)
  const drawerEntryId = ref<string | null>(null)

  function openAnnouncement(announcementId: string, entryId: string) {
    drawerAnnouncementId.value = announcementId
    drawerEntryId.value = entryId
    drawerVisible.value = true
  }

  /** 详情载入即已读：回刷 feed 未读态与铃铛/摘要红点 */
  async function onAnnouncementRead() {
    await Promise.all([loadFeed(), loadNtfSummary(), refresh()])
  }

  function goNotifications() {
    router.push('/ntf/notifications')
  }

  /** 更多资料 → 代理商资料库 */
  function goLibrary() {
    router.push('/pm/library')
  }

  // 最新资料：就地弹详情抽屉（与资料库共用组件）
  const matDetailVisible = ref(false)
  const matDetailId = ref<string | null>(null)

  function openMatDetail(item: PmMaterialListItem) {
    matDetailId.value = item.id
    matDetailVisible.value = true
  }

  function formatDateTime(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN', { hour12: false })
  }

  // ---------- 初始化 ----------

  onMounted(async () => {
    iamAuthApi.me().then((res) => {
      me.value = res
    }) // 头部失败不阻塞三卡片区
    loadWeather() // 天气失败同样静默，不阻塞页面
    loadFeed()
    loadNtfSummary()
    loadLatestMaterials()
    refresh()
  })

  // ---------- 工作日历（T30：数据源 /masterdata/work-calendar，只读镜像零推导 BR-MD-009） ----------

  function fmtDate(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const calLoading = ref(false)
  const calMonth = ref(fmtDate(new Date()).slice(0, 7)) // YYYY-MM
  const calEmpty = ref(false)
  const calMap = ref(new Map<string, MdWorkCalendarRow>())

  /** ElCalendar 受控：展示月随 calMonth；选择日期仅联动月份 */
  const calDate = computed({
    get: () =>
      new Date(Number(calMonth.value.slice(0, 4)), Number(calMonth.value.slice(5, 7)) - 1, 1),
    set: (v: Date) => {
      calMonth.value = fmtDate(v).slice(0, 7)
    }
  })

  function shiftMonth(delta: number) {
    const d = new Date(
      Number(calMonth.value.slice(0, 4)),
      Number(calMonth.value.slice(5, 7)) - 1 + delta,
      1
    )
    calMonth.value = fmtDate(d).slice(0, 7)
  }

  function inCurrentMonth(day: string): boolean {
    return day.slice(0, 7) === calMonth.value
  }

  function marks(day: string): { holiday: boolean; report: boolean; appeal: boolean } {
    const r = calMap.value.get(day)
    return {
      holiday: !!r?.isHoliday,
      report: !!r?.isMonthlyReportDate,
      appeal: !!r?.isSalesAppealDate
    }
  }

  async function loadWorkCalendar() {
    calLoading.value = true
    try {
      const [y, m] = calMonth.value.split('-').map(Number)
      const dateFrom = `${calMonth.value}-01`
      const dateTo = fmtDate(new Date(y, m, 0)) // 月末
      const res = await mdRegistryApi.calendar({ dateFrom, dateTo, size: 31 })
      calMap.value = new Map(res.items.map((r) => [r.theDate, r]))
      calEmpty.value = res.items.length === 0
    } finally {
      calLoading.value = false
    }
  }

  watch(calMonth, loadWorkCalendar)
  onMounted(loadWorkCalendar)
</script>

<style lang="scss" scoped>
  .workbench-card {
    min-height: 320px;
  }

  .feed-item {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 10px 4px;
    cursor: pointer;
    border-bottom: 1px solid var(--el-border-color-extra-light);

    &:last-of-type {
      border-bottom: none;
    }

    &:hover {
      background: var(--el-fill-color-light);
    }
  }

  .ntf-item {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 8px 4px;

    &.c-p:hover {
      background: var(--el-fill-color-light);
    }
  }

  .mat-item {
    display: flex;
    flex-wrap: nowrap;
    gap: 4px 8px;
    align-items: center;
    padding: 4px;
    cursor: pointer;
    border-bottom: 1px solid var(--el-border-color-extra-light);

    &:last-of-type {
      border-bottom: none;
    }

    &:hover {
      background: var(--el-fill-color-light);
    }
  }

  .unread-dot {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    background: var(--el-color-danger);
    border-radius: 50%;
  }

  .quick-entry {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 12px;
    cursor: pointer;
    border: 1px solid var(--el-border-color-extra-light);
    border-radius: 6px;

    &:hover {
      background: var(--el-fill-color-light);
      border-color: var(--el-color-primary-light-5);
    }
  }
</style>

<style scoped lang="scss">
  .md-cal :deep(.el-calendar__header) {
    padding: 8px 12px;
  }

  .md-cal :deep(.el-calendar-table .el-calendar-day) {
    height: auto;
    min-height: 56px;
    padding: 4px;
  }

  .cal-cell {
    min-height: 48px;
  }

  .cal-day {
    font-size: 12px;
    line-height: 16px;
  }

  .cal-marks {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    margin-top: 2px;
  }

  .cal-marks :deep(.el-tag) {
    height: 16px;
    padding: 0 3px;
    font-size: 10px;
  }

  .cal-other {
    opacity: 0.35;
  }
</style>
