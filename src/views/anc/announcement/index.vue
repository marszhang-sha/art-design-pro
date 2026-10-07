<template>
  <!-- UI-ANC-001 公告管理（管理员）：
       DRAFT 编辑/发布/删除 · SCHEDULED 仅撤回 · PUBLISHED 置顶(≤3)/撤回/阅读统计 · WITHDRAWN 终态仅存统计 -->
  <div class="art-full-height">
    <ArtSearchBar
      v-model="searchForm"
      :items="formItems"
      @search="handleSearch"
      @reset="handleReset"
    >
    </ArtSearchBar>

    <ElCard class="art-table-card" :style="{ 'margin-top': showSearchBar ? '12px' : '0' }">
      <ArtTableHeader
        v-model:columns="columnChecks"
        v-model:showSearchBar="showSearchBar"
        :loading="loading"
        @refresh="refreshData"
      >
        <template #left>
          <ElSpace wrap>
            <ElButton v-auth="'system:announcement:create'" type="primary" @click="openCreate">
              新建公告
            </ElButton>
          </ElSpace>
        </template>
      </ArtTableHeader>

      <ArtTable
        :loading="loading"
        :data="data"
        :columns="columns"
        :pagination="pagination"
        empty-text="暂无公告"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
        @sort-change="handleSortChange"
      >
      </ArtTable>
    </ElCard>

    <!-- 新建/编辑 Drawer（仅 DRAFT 可编辑；创建成功后转编辑态以管理附件） -->
    <ElDrawer
      v-model="drawerVisible"
      :title="drawerTitle"
      size="720px"
      :close-on-click-modal="false"
    >
      <ElForm ref="formRef" :model="form" :rules="formRules" label-width="90px">
        <ElFormItem label="标题" prop="title">
          <ElInput v-model="form.title" maxlength="128" show-word-limit />
        </ElFormItem>
        <ElFormItem label="正文" prop="content">
          <!-- 富文本白名单见契约 §7.3：段落/加粗/列表/引用/标题/链接/代码；禁图片与内联样式 -->
          <ArtWangEditor
            v-model="form.content"
            height="300px"
            mode="simple"
            placeholder="支持段落/加粗/列表/引用/标题/链接/代码，不支持图片与内联样式"
            :toolbar-keys="editorToolbarKeys"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="受众组织">
          <ElTreeSelect
            v-model="form.orgNodeIds"
            :data="orgTreeData"
            node-key="id"
            multiple
            check-strictly
            collapse-tags
            collapse-tags-tooltip
            filterable
            clearable
            :props="{ label: 'name', children: 'children' }"
            placeholder="按组织节点投放（可多选）"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="指定账号">
          <ElSelect
            v-model="form.accountIds"
            multiple
            filterable
            remote
            clearable
            collapse-tags
            collapse-tags-tooltip
            :remote-method="searchAccounts"
            :loading="accountSearching"
            placeholder="按用户名/姓名搜索追加账号（可多选）"
            class="w-full"
          >
            <ElOption
              v-for="acc in accountOptions"
              :key="acc.value"
              :label="acc.label"
              :value="acc.value"
            />
          </ElSelect>
        </ElFormItem>
      </ElForm>

      <!-- 附件：创建后（已有公告 id）方可管理；≤10 个/公告、单个 ≤20MB、扩展名白名单（超限 400 ANC-4004） -->
      <template v-if="editingId">
        <ElDivider content-position="left">
          附件（{{ detail?.attachments.length ?? 0 }}/10）
        </ElDivider>
        <ElUpload
          :show-file-list="false"
          :before-upload="beforeAttUpload"
          :http-request="doAttUpload"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
          :disabled="(detail?.attachments.length ?? 0) >= 10"
        >
          <ElButton
            icon="ri:upload-2-line"
            :disabled="(detail?.attachments.length ?? 0) >= 10"
            :loading="attUploading"
          >
            上传附件
          </ElButton>
          <template #tip>
            <div class="el-upload__tip">
              pdf/doc/docx/xls/xlsx/ppt/pptx/png/jpg/jpeg/zip，单个 ≤20MB，至多 10 个
            </div>
          </template>
        </ElUpload>
        <div v-if="detail?.attachments.length" class="mt-3 flex flex-col gap-2">
          <div
            v-for="att in detail.attachments"
            :key="att.id"
            class="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm dark:border-gray-700"
          >
            <span class="truncate" :title="att.fileName">{{ att.fileName }}</span>
            <span class="ml-3 flex shrink-0 items-center gap-3">
              <span class="text-xs text-gray-400">{{ formatFileSize(att.fileSize) }}</span>
              <ElButton
                link
                type="danger"
                v-auth="'system:announcement:delete'"
                @click="onDeleteAttachment(att.id)"
              >
                删除
              </ElButton>
            </span>
          </div>
        </div>
      </template>

      <template #footer>
        <ElButton @click="drawerVisible = false">关闭</ElButton>
        <ElButton type="primary" :loading="submitting" @click="submitForm">保存</ElButton>
      </template>
    </ElDrawer>

    <!-- 发布弹窗：publishAt 省略=立即发布；过去时点禁提交（400 ANC-4005）；空受众禁提交（409 ANC-2006）。
         value-format 末位 Z=本地时区偏移：BE 对无时区串按 UTC 归一，缺偏移会致定时点 +8h 静默后移 -->
    <ElDialog v-model="publishVisible" title="发布公告" width="480px">
      <div v-loading="publishLoadingDetail">
        <template v-if="publishDetail">
          <p class="mt-0">《{{ publishDetail.title }}》</p>
          <ElDescriptions :column="2" border size="small" class="mb-4">
            <ElDescriptionsItem label="受众组织">
              {{ publishDetail.audience.orgNodeIds.length }} 个
            </ElDescriptionsItem>
            <ElDescriptionsItem label="指定账号">
              {{ publishDetail.audience.accountIds.length }} 个
            </ElDescriptionsItem>
          </ElDescriptions>
          <ElAlert
            v-if="publishAudienceEmpty"
            title="受众为空：请先在编辑中设置受众组织或指定账号，再发布"
            type="warning"
            :closable="false"
            show-icon
          />
          <ElFormItem v-else label="定时发布" label-width="90px">
            <ElDatePicker
              v-model="publishAt"
              type="datetime"
              value-format="YYYY-MM-DDTHH:mm:ssZ"
              placeholder="留空=立即发布"
              :disabled-date="disablePastDate"
              class="!w-full"
            />
          </ElFormItem>
          <ElAlert
            v-if="isPublishAtPast"
            title="发布时点已过去，请重新选择或留空立即发布"
            type="error"
            :closable="false"
            show-icon
          />
        </template>
      </div>
      <template #footer>
        <ElButton @click="publishVisible = false">取消</ElButton>
        <ElButton
          type="primary"
          :disabled="publishAudienceEmpty || isPublishAtPast"
          :loading="publishSubmitting"
          @click="doPublish"
        >
          {{ publishAt ? '定时发布' : '立即发布' }}
        </ElButton>
      </template>
    </ElDialog>

    <!-- 阅读统计（PUBLISHED/WITHDRAWN 可看；快照口径） -->
    <ElDialog v-model="statsVisible" title="阅读统计" width="420px">
      <ElDescriptions v-if="stats" :column="1" border>
        <ElDescriptionsItem label="快照受众">{{ stats.snapshotTotal }} 人</ElDescriptionsItem>
        <ElDescriptionsItem label="已读">{{ stats.readCount }} 人</ElDescriptionsItem>
        <ElDescriptionsItem label="未读">{{ stats.unreadCount }} 人</ElDescriptionsItem>
      </ElDescriptions>
      <template #footer>
        <ElButton type="primary" @click="statsVisible = false">关闭</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { computed, h, onMounted, ref } from 'vue'
  import { ElMessage, ElMessageBox, ElTag, type FormInstance, type FormRules } from 'element-plus'
  import ArtButtonMore, {
    type ButtonMoreItem
  } from '@/components/core/forms/art-button-more/index.vue'
  import ArtWangEditor from '@/components/core/forms/art-wang-editor/index.vue'
  import { useTable } from '@/hooks/core/useTable'
  import { toPaginated } from '@/views/iam/table'
  import { iamAccountApi, iamOrgApi, type IamOrgNode } from '@/api/iam'
  import {
    ancApi,
    type AncAttachment,
    type AncDetail,
    type AncListItem,
    type AncListParams,
    type AncReadStats,
    type AncStatus
  } from '@/api/anc'

  defineOptions({ name: 'AncAnnouncement' })

  // ---------- 常量 ----------

  const STATUS_LABEL: Record<AncStatus, string> = {
    DRAFT: '草稿',
    SCHEDULED: '已定时',
    PUBLISHED: '已发布',
    WITHDRAWN: '已撤回'
  }
  const STATUS_TAG: Record<AncStatus, 'info' | 'warning' | 'success' | 'danger'> = {
    DRAFT: 'info',
    SCHEDULED: 'warning',
    PUBLISHED: 'success',
    WITHDRAWN: 'danger'
  }

  /** 富文本工具栏与净化白名单（契约 §7.3）对齐：无图片/颜色/表格项 */
  const editorToolbarKeys = [
    'headerSelect',
    '|',
    'bold',
    '|',
    'bulletedList',
    'numberedList',
    '|',
    'blockquote',
    '|',
    'insertLink',
    'codeBlock',
    '|',
    'undo',
    'redo'
  ]

  const ATT_MAX_COUNT = 10
  const ATT_MAX_SIZE = 20 * 1024 * 1024
  const ATT_EXTENSIONS = [
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.png',
    '.jpg',
    '.jpeg',
    '.zip'
  ]

  // ---------- 组织树（受众选择共用一次拉取） ----------

  const orgTreeData = ref<IamOrgNode[]>([])
  onMounted(async () => {
    orgTreeData.value = await iamOrgApi.tree()
  })

  // ---------- 列表（服务端分页 + 排序） ----------

  interface AncSearchFormParams {
    keyword?: string
    status?: AncStatus
  }

  const searchForm = ref<AncSearchFormParams>({})
  const activeFilters = ref<AncSearchFormParams>({})
  const sortBy = ref<AncListParams['sortBy']>(undefined)
  const sortOrder = ref<'asc' | 'desc' | undefined>(undefined)
  const showSearchBar = ref(true)

  const statusOptions = (Object.keys(STATUS_LABEL) as AncStatus[]).map((s) => ({
    label: STATUS_LABEL[s],
    value: s
  }))

  const formItems = [
    {
      label: '关键词',
      key: 'keyword',
      type: 'input',
      props: { placeholder: '标题', clearable: true }
    },
    {
      label: '状态',
      key: 'status',
      type: 'select',
      props: { placeholder: '全部状态', options: statusOptions, clearable: true }
    }
  ]

  /** apiFn 内归一信封；返回类型显式标注，useTable 的 InferRecordType 才能推出 TRecord */
  function fetchAncList(params: AncListParams): Promise<Api.Common.PaginatedResponse<AncListItem>> {
    const clean: AncListParams = {}
    for (const [k, v] of Object.entries(params)) {
      if (v !== '' && v !== undefined && v !== null) {
        ;(clean as Record<string, unknown>)[k] = v
      }
    }
    return ancApi.list(clean).then(toPaginated)
  }

  const {
    columns,
    columnChecks,
    data,
    loading,
    pagination,
    getData,
    replaceSearchParams,
    resetSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshData
  } = useTable({
    core: {
      apiFn: fetchAncList,
      apiParams: { page: 1, size: 20 },
      paginationKey: { current: 'page', size: 'size' },
      columnsFactory: () => [
        {
          prop: 'title',
          label: '标题',
          minWidth: 240,
          sortable: 'custom',
          formatter: (row: AncListItem) =>
            h('span', [
              row.title,
              row.pinned
                ? h(ElTag, { type: 'warning', size: 'small', class: 'ml-2' }, () => '置顶')
                : null
            ])
        },
        {
          prop: 'status',
          label: '状态',
          width: 100,
          sortable: 'custom',
          formatter: (row: AncListItem) =>
            h(ElTag, { type: STATUS_TAG[row.status] }, () => STATUS_LABEL[row.status])
        },
        {
          prop: 'publishAt',
          label: '发布时点',
          minWidth: 170,
          sortable: 'custom',
          formatter: (row: AncListItem) => formatDateTime(row.publishAt)
        },
        {
          prop: 'createdAt',
          label: '创建时间',
          minWidth: 170,
          sortable: 'custom',
          formatter: (row: AncListItem) => formatDateTime(row.createdAt)
        },
        {
          prop: 'operation',
          label: '操作',
          width: 90,
          fixed: 'right',
          formatter: (row: AncListItem) =>
            h('div', [
              h(ArtButtonMore, {
                list: operationList(row),
                onClick: (item: ButtonMoreItem) => buttonMoreClick(item, row)
              })
            ])
        }
      ]
    }
  })

  /** 状态机门控（UI-ANC-001 §4）：非 DRAFT 不可编辑/发布；置顶仅 PUBLISHED（≤3 由 BE ANC-2005 兜底） */
  function operationList(row: AncListItem): ButtonMoreItem[] {
    const list: ButtonMoreItem[] = []
    if (row.status === 'DRAFT') {
      list.push(
        { key: 'edit', label: '编辑', icon: 'ri:edit-line', auth: 'system:announcement:update' },
        {
          key: 'publish',
          label: '发布',
          icon: 'ri:send-plane-line',
          auth: 'system:announcement:publish'
        },
        {
          key: 'delete',
          label: '删除',
          icon: 'ri:delete-bin-line',
          color: '#f56c6c',
          auth: 'system:announcement:delete'
        }
      )
    }
    if (row.status === 'SCHEDULED' || row.status === 'PUBLISHED') {
      list.push({
        key: 'withdraw',
        label: '撤回',
        icon: 'ri:arrow-go-back-line',
        color: '#f56c6c',
        auth: 'system:announcement:publish'
      })
    }
    if (row.status === 'PUBLISHED') {
      list.push(
        row.pinned
          ? {
              key: 'unpin',
              label: '取消置顶',
              icon: 'ri:pushpin-fill',
              auth: 'system:announcement:update'
            }
          : {
              key: 'pin',
              label: '置顶',
              icon: 'ri:pushpin-line',
              auth: 'system:announcement:update'
            }
      )
    }
    if (row.status === 'PUBLISHED' || row.status === 'WITHDRAWN') {
      // view 码绑 MENU 节点（BR-IAM-045：页面可见⟺持有 system:announcement:view），
      // 不入 authList（BUTTON 码载体）——v-auth 恒 false，此处不挂码；BE 端点仍 require_permission 兜底
      list.push({
        key: 'stats',
        label: '阅读统计',
        icon: 'ri:bar-chart-2-line'
      })
    }
    return list
  }

  function buttonMoreClick(item: ButtonMoreItem, row: AncListItem) {
    if (item.key === 'edit') openEdit(row)
    else if (item.key === 'publish') openPublish(row)
    else if (item.key === 'withdraw') onWithdraw(row)
    else if (item.key === 'pin') onPin(row, true)
    else if (item.key === 'unpin') onPin(row, false)
    else if (item.key === 'delete') onDelete(row)
    else if (item.key === 'stats') openStats(row)
  }

  // ---------- 搜索与排序 ----------

  function applyQuery() {
    replaceSearchParams({
      ...activeFilters.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value
    })
    getData()
  }

  const handleSearch = (params: AncSearchFormParams) => {
    activeFilters.value = { ...params }
    applyQuery()
  }

  const handleReset = () => {
    sortBy.value = undefined
    sortOrder.value = undefined
    activeFilters.value = {}
    resetSearchParams()
  }

  const handleSortChange = ({
    prop,
    order
  }: {
    prop: string
    order: 'ascending' | 'descending' | null
  }) => {
    sortBy.value = order ? (prop as NonNullable<AncListParams['sortBy']>) : undefined
    sortOrder.value = order === 'ascending' ? 'asc' : order === 'descending' ? 'desc' : undefined
    applyQuery()
  }

  // ---------- 新建 / 编辑（DRAFT） ----------

  const drawerVisible = ref(false)
  const drawerTitle = ref('')
  /** 当前编辑的公告 id；null = 尚未创建（新建态无附件区） */
  const editingId = ref<string | null>(null)
  const detail = ref<AncDetail | null>(null)
  const submitting = ref(false)
  const formRef = ref<FormInstance>()
  const accountSearching = ref(false)
  const accountOptions = ref<{ value: number; label: string }[]>([])

  interface AncFormState {
    title: string
    content: string
    orgNodeIds: number[]
    accountIds: number[]
  }

  const emptyForm = (): AncFormState => ({ title: '', content: '', orgNodeIds: [], accountIds: [] })
  const form = ref<AncFormState>(emptyForm())

  const formRules: FormRules = {
    title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
    content: [{ required: true, message: '请输入正文', trigger: 'blur' }]
  }

  /** 账号远程搜索（受众“指定账号”）：id 转数字——请求侧受众 id 为 number（契约 §4） */
  async function searchAccounts(keyword: string) {
    if (!keyword.trim()) {
      accountOptions.value = []
      return
    }
    accountSearching.value = true
    try {
      const page = await iamAccountApi.list({ keyword: keyword.trim(), page: 1, size: 20 })
      accountOptions.value = page.items.map((acc) => ({
        value: Number(acc.id),
        label: acc.displayName ? `${acc.username}（${acc.displayName}）` : acc.username
      }))
    } finally {
      accountSearching.value = false
    }
  }

  function fillFormFromDetail(d: AncDetail) {
    form.value = {
      title: d.title,
      content: d.content ?? '',
      // 响应侧受众 id 为 string（契约 §4），编辑回填转回 number 供提交
      orgNodeIds: d.audience.orgNodeIds.map(Number),
      accountIds: d.audience.accountIds.map(Number)
    }
    accountOptions.value = d.audience.accountIds.map((id) => ({
      value: Number(id),
      label: `账号 #${id}`
    }))
  }

  function openCreate() {
    editingId.value = null
    detail.value = null
    form.value = emptyForm()
    accountOptions.value = []
    drawerTitle.value = '新建公告'
    drawerVisible.value = true
  }

  async function openEdit(row: AncListItem) {
    drawerVisible.value = true
    drawerTitle.value = '编辑公告'
    editingId.value = null
    detail.value = null
    form.value = emptyForm()
    const d = await ancApi.get(row.id)
    detail.value = d
    editingId.value = row.id
    fillFormFromDetail(d)
  }

  async function submitForm() {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) return
    submitting.value = true
    try {
      const audience = {
        orgNodeIds: form.value.orgNodeIds,
        accountIds: form.value.accountIds
      }
      if (editingId.value) {
        const d = await ancApi.update(editingId.value, {
          title: form.value.title.trim(),
          content: form.value.content,
          audience
        })
        detail.value = d
        fillFormFromDetail(d)
        ElMessage.success('保存成功')
      } else {
        // 创建即转编辑态：附件管理依赖公告 id
        const d = await ancApi.create({
          title: form.value.title.trim(),
          content: form.value.content,
          audience
        })
        detail.value = d
        editingId.value = d.id
        fillFormFromDetail(d)
        drawerTitle.value = '编辑公告'
        ElMessage.success('公告已保存为草稿，可继续上传附件或发布')
      }
      refreshData()
    } finally {
      submitting.value = false
    }
  }

  // ---------- 附件（DRAFT） ----------

  const attUploading = ref(false)

  function beforeAttUpload(file: File): boolean {
    if ((detail.value?.attachments.length ?? 0) >= ATT_MAX_COUNT) {
      ElMessage.error(`每个公告至多 ${ATT_MAX_COUNT} 个附件`)
      return false
    }
    if (file.size > ATT_MAX_SIZE) {
      ElMessage.error('单个附件不超过 20MB')
      return false
    }
    if (file.name.length > 128) {
      ElMessage.error('文件名不超过 128 字符')
      return false
    }
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!ATT_EXTENSIONS.includes(ext)) {
      ElMessage.error('仅支持 pdf/doc/docx/xls/xlsx/ppt/pptx/png/jpg/jpeg/zip')
      return false
    }
    return true
  }

  async function doAttUpload(options: { file: File }) {
    if (!editingId.value) return
    attUploading.value = true
    try {
      const att: AncAttachment = await ancApi.uploadAttachment(editingId.value, options.file)
      detail.value?.attachments.push(att)
      ElMessage.success('附件上传成功')
    } finally {
      attUploading.value = false
    }
  }

  function onDeleteAttachment(attachmentId: string) {
    ElMessageBox.confirm('删除后不可恢复，确认删除该附件？', '删除附件', { type: 'warning' })
      .then(async () => {
        if (!editingId.value) return
        await ancApi.deleteAttachment(editingId.value, attachmentId)
        if (detail.value) {
          detail.value.attachments = detail.value.attachments.filter((a) => a.id !== attachmentId)
        }
        ElMessage.success('已删除')
      })
      .catch(() => undefined)
  }

  // ---------- 发布 / 撤回 / 置顶 / 删除 / 统计 ----------

  const publishVisible = ref(false)
  const publishLoadingDetail = ref(false)
  const publishSubmitting = ref(false)
  const publishTarget = ref<AncListItem | null>(null)
  const publishDetail = ref<AncDetail | null>(null)
  const publishAt = ref<string>('')

  const publishAudienceEmpty = computed(
    () =>
      !!publishDetail.value &&
      publishDetail.value.audience.orgNodeIds.length === 0 &&
      publishDetail.value.audience.accountIds.length === 0
  )
  const isPublishAtPast = computed(
    () => !!publishAt.value && new Date(publishAt.value).getTime() <= Date.now()
  )

  function disablePastDate(date: Date): boolean {
    return date.getTime() < Date.now() - 24 * 60 * 60 * 1000
  }

  async function openPublish(row: AncListItem) {
    publishTarget.value = row
    publishDetail.value = null
    publishAt.value = ''
    publishVisible.value = true
    publishLoadingDetail.value = true
    try {
      publishDetail.value = await ancApi.get(row.id)
    } finally {
      publishLoadingDetail.value = false
    }
  }

  async function doPublish() {
    if (!publishTarget.value) return
    publishSubmitting.value = true
    try {
      await ancApi.publish(publishTarget.value.id, publishAt.value || undefined)
      ElMessage.success(publishAt.value ? '已定时发布' : '发布成功')
      publishVisible.value = false
      refreshData()
    } finally {
      publishSubmitting.value = false
    }
  }

  /** 撤回为终态：重发须新建；将移除收件箱投递（inboxEntriesRemoved） */
  function onWithdraw(row: AncListItem) {
    ElMessageBox.confirm(
      '撤回为终态操作，公告将从所有用户收件箱移除（含未读提醒），撤回后不可再编辑或重发。确认撤回？',
      '撤回公告',
      { type: 'warning' }
    )
      .then(async () => {
        const res = await ancApi.withdraw(row.id)
        ElMessage.success(`已撤回，移除 ${res.inboxEntriesRemoved} 条收件箱投递`)
        refreshData()
      })
      .catch(() => undefined)
  }

  async function onPin(row: AncListItem, pinned: boolean) {
    if (pinned) await ancApi.pin(row.id)
    else await ancApi.unpin(row.id)
    ElMessage.success(pinned ? '已置顶' : '已取消置顶')
    refreshData()
  }

  function onDelete(row: AncListItem) {
    ElMessageBox.confirm(`确认删除公告《${row.title}》？删除后不可恢复。`, '删除公告', {
      type: 'warning'
    })
      .then(async () => {
        await ancApi.remove(row.id)
        ElMessage.success('已删除')
        refreshData()
      })
      .catch(() => undefined)
  }

  const statsVisible = ref(false)
  const stats = ref<AncReadStats | null>(null)

  async function openStats(row: AncListItem) {
    statsVisible.value = true
    stats.value = null
    stats.value = await ancApi.readStats(row.id)
  }

  // ---------- 工具 ----------

  function formatDateTime(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN', { hour12: false })
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }
</script>
