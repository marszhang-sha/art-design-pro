<template>
  <!-- UI-PM-001 资料管理（管理端）：
       左侧分类树（全树含停用灰显，节点维护挂 system:material:category）
       右侧 Tabs：资料库（列表/上传/版本链）· 下载统计（三维度聚合，挂 system:material:report）
       布局：根被布局层强制 .art-page-view 纵向，树/Tabs 包内层 flex 行容器实现左右结构 -->
  <div class="art-full-height art-page-view">
    <div class="flex gap-3 min-w-0 flex-1" style="align-items: stretch">
      <!-- ── 左：分类树面板 ── -->
      <ElCard class="w-72 shrink-0" shadow="never">
        <template #header>
          <div class="flex items-center justify-between">
            <span class="font-medium">分类</span>
            <ElButton
              v-auth="'system:material:category'"
              size="small"
              type="primary"
              link
              @click="openCreate(null)"
            >
              新建根分类
            </ElButton>
          </div>
        </template>
        <ElTree
          ref="treeRef"
          :data="treeData"
          node-key="id"
          :props="{ label: 'name', children: 'children' }"
          default-expand-all
          highlight-current
          :expand-on-click-node="false"
          @node-click="handleNodeClick"
        >
          <template #default="{ data }">
            <div class="group flex w-full items-center justify-between">
              <span :class="{ 'opacity-40': data.status === 'DISABLED' }">
                {{ data.name }}
                <ElTag v-if="data.status === 'DISABLED'" size="small" type="info">停用</ElTag>
              </span>
              <ElDropdown
                v-auth="'system:material:category'"
                trigger="click"
                class="opacity-0 group-hover:opacity-100"
                @command="(cmd: string) => handleNodeCommand(cmd, data)"
              >
                <ElIcon class="cursor-pointer"><MoreFilled /></ElIcon>
                <template #dropdown>
                  <ElDropdownMenu>
                    <ElDropdownItem command="create">新建子分类</ElDropdownItem>
                    <ElDropdownItem command="rename">改名 / 排序</ElDropdownItem>
                    <ElDropdownItem command="move">移动</ElDropdownItem>
                    <ElDropdownItem v-if="data.status === 'ACTIVE'" command="disable"
                      >停用</ElDropdownItem
                    >
                    <ElDropdownItem v-else command="enable">启用</ElDropdownItem>
                    <ElDropdownItem command="delete" divided>
                      <span :class="canDelete(data) ? 'text-red-500' : 'opacity-40'">删除</span>
                    </ElDropdownItem>
                  </ElDropdownMenu>
                </template>
              </ElDropdown>
            </div>
          </template>
        </ElTree>
      </ElCard>

      <!-- ── 右：Tabs ── -->
      <ElCard class="art-table-card min-w-0 flex-1" shadow="never" :style="{ 'margin-top': '0' }">
        <ElTabs v-model="activeTab">
          <!-- 资料库 Tab -->
          <ElTabPane label="资料库" name="materials">
            <ArtSearchBar
              v-model="searchForm"
              :items="searchItems"
              @search="handleSearch"
              @reset="handleReset"
            />
            <ArtTableHeader
              v-model:columns="columnChecks"
              v-model:showSearchBar="showSearchBar"
              :loading="loading"
              @refresh="refreshData"
            >
              <template #left>
                <ElButton v-auth="'system:material:upload'" type="primary" @click="openUpload"
                  >上传资料</ElButton
                >
              </template>
            </ArtTableHeader>
            <ArtTable
              :loading="loading"
              :data="data"
              :columns="columns"
              :pagination="pagination"
              empty-text="暂无资料"
              @pagination:size-change="handleSizeChange"
              @pagination:current-change="handleCurrentChange"
              @sort-change="handleSortChange"
            />
          </ElTabPane>

          <!-- 下载统计 Tab -->
          <ElTabPane v-auth="'system:material:report'" label="下载统计" name="stats">
            <ElForm inline class="mb-3">
              <ElFormItem label="维度">
                <ElRadioGroup v-model="stats.dimension" @change="fetchStats">
                  <ElRadioButton value="BU">BU</ElRadioButton>
                  <ElRadioButton value="PRODUCT_LINE">产品线</ElRadioButton>
                  <ElRadioButton value="MATERIAL">资料</ElRadioButton>
                </ElRadioGroup>
              </ElFormItem>
              <ElFormItem v-if="stats.dimension !== 'BU'" label="BU">
                <ElSelect
                  v-model="stats.buId"
                  clearable
                  placeholder="全部"
                  class="w-36"
                  @change="onStatsBuChange"
                >
                  <ElOption
                    v-for="b in PM_DIMENSIONS_PLACEHOLDER"
                    :key="b.id"
                    :label="b.name"
                    :value="b.id"
                  />
                </ElSelect>
              </ElFormItem>
              <ElFormItem v-if="stats.dimension === 'MATERIAL'" label="产品线">
                <ElSelect v-model="stats.productLineId" clearable placeholder="全部" class="w-40">
                  <ElOption
                    v-for="pl in statsProductLines"
                    :key="pl.id"
                    :label="pl.name"
                    :value="pl.id"
                  />
                </ElSelect>
              </ElFormItem>
              <ElFormItem label="日期">
                <ElDatePicker
                  v-model="stats.range"
                  type="daterange"
                  value-format="YYYY-MM-DD"
                  start-placeholder="开始"
                  end-placeholder="结束"
                />
              </ElFormItem>
              <ElFormItem>
                <ElButton type="primary" @click="fetchStats">查询</ElButton>
              </ElFormItem>
            </ElForm>
            <ElTable :data="stats.rows" v-loading="stats.loading" empty-text="暂无下载记录">
              <ElTableColumn prop="name" :label="statsNameLabel" min-width="200" />
              <ElTableColumn prop="downloadCount" label="下载次数" width="140" />
            </ElTable>
          </ElTabPane>
        </ElTabs>
      </ElCard>
    </div>

    <!-- ── 上传 Drawer ── -->
    <ElDrawer v-model="uploadVisible" title="上传资料" size="480px" :close-on-click-modal="false">
      <ElForm ref="uploadFormRef" :model="uploadForm" :rules="uploadRules" label-width="80px">
        <ElFormItem label="名称" prop="name">
          <ElInput
            v-model="uploadForm.name"
            maxlength="200"
            show-word-limit
            placeholder="资料名称（必填）"
          />
        </ElFormItem>
        <ElFormItem label="BU" prop="buId">
          <ElSelect
            v-model="uploadForm.buId"
            placeholder="选择 BU"
            class="w-full"
            @change="uploadForm.productLineId = undefined"
          >
            <ElOption
              v-for="b in PM_DIMENSIONS_PLACEHOLDER"
              :key="b.id"
              :label="b.name"
              :value="b.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="产品线" prop="productLineId">
          <ElSelect
            v-model="uploadForm.productLineId"
            placeholder="随 BU 联动"
            class="w-full"
            :disabled="!uploadForm.buId"
          >
            <ElOption
              v-for="pl in uploadProductLines"
              :key="pl.id"
              :label="pl.name"
              :value="pl.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="分类" prop="categoryId">
          <ElTreeSelect
            v-model="uploadForm.categoryId"
            :data="activeTreeData"
            node-key="id"
            check-strictly
            :props="{ label: 'name', children: 'children' }"
            placeholder="选择分类（任意层级）"
            class="w-full"
          />
        </ElFormItem>
        <ElFormItem label="文件" prop="file">
          <ElUpload
            :show-file-list="true"
            :limit="1"
            :auto-upload="false"
            :on-change="onFileChange"
            :on-remove="() => (uploadForm.file = undefined)"
            drag
          >
            <div class="p-4">拖拽或点击选择文件（≤100 MB）</div>
          </ElUpload>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="uploadVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="uploading" @click="submitUpload">上传</ElButton>
      </template>
    </ElDrawer>

    <!-- ── 版本链 Drawer ── -->
    <ElDrawer
      v-model="versionVisible"
      :title="`版本链 · ${versionMaterial?.name ?? ''}`"
      size="560px"
    >
      <div v-if="canUpload" class="mb-3">
        <ElUpload :show-file-list="false" :before-upload="beforeAppend" :http-request="doAppend">
          <ElButton type="primary" icon="ri:upload-2-line" :loading="appending">追加版本</ElButton>
        </ElUpload>
      </div>
      <ElTable
        :data="versionMaterial?.versions ?? []"
        v-loading="versionLoading"
        empty-text="暂无版本"
      >
        <ElTableColumn prop="versionNo" label="版本" width="70" />
        <ElTableColumn label="文件" min-width="200">
          <template #default="{ row }">
            {{ row.fileName }}
            <ElTag v-if="row.isCurrent" size="small" type="success" class="ml-1">当前版</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="大小" width="100">
          <template #default="{ row }">{{ formatSize(row.fileSize) }}</template>
        </ElTableColumn>
        <ElTableColumn label="上传时间" width="170">
          <template #default="{ row }">{{ formatDateTime(row.uploadedAt) }}</template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="downloadVersion(versionMaterial!, row)"
              >下载</ElButton
            >
          </template>
        </ElTableColumn>
      </ElTable>
    </ElDrawer>

    <!-- ── 分类新建/改名 Dialog ── -->
    <ElDialog
      v-model="categoryDialogVisible"
      :title="categoryForm.id ? '改名 / 排序' : '新建分类'"
      width="420px"
    >
      <ElForm :model="categoryForm" label-width="80px">
        <ElFormItem label="上级">
          <span>{{ categoryForm.parentName || '（根）' }}</span>
        </ElFormItem>
        <ElFormItem label="名称">
          <ElInput v-model="categoryForm.name" maxlength="100" placeholder="同级不可重名" />
        </ElFormItem>
        <ElFormItem label="排序">
          <ElInputNumber v-model="categoryForm.sortOrder" :min="0" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="categoryDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="categorySaving" @click="submitCategory">保存</ElButton>
      </template>
    </ElDialog>

    <!-- ── 分类移动 Dialog ── -->
    <ElDialog v-model="moveDialogVisible" title="移动分类" width="420px">
      <ElTreeSelect
        v-model="moveTarget"
        :data="moveTreeData"
        node-key="id"
        check-strictly
        :props="{ label: 'name', children: 'children' }"
        placeholder="选择目标父分类"
        class="w-full"
      />
      <template #footer>
        <ElButton @click="moveDialogVisible = false">取消</ElButton>
        <ElButton type="primary" :loading="categorySaving" @click="submitMove">移动</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { MoreFilled } from '@element-plus/icons-vue'
  import { h, computed, onMounted, reactive, ref } from 'vue'
  import {
    ElButton,
    ElMessage,
    ElMessageBox,
    type UploadFile,
    type UploadRawFile
  } from 'element-plus'

  import { useTable } from '@/hooks/core/useTable'
  import { toPaginated } from '@/views/iam/table'
  import {
    pmCategoryApi,
    pmMaterialApi,
    pmStatsApi,
    PM_DIMENSIONS_PLACEHOLDER,
    type PmCategoryNode,
    type PmMaterialDetail,
    type PmMaterialListItem,
    type PmMaterialListParams,
    type PmStatsDimension
  } from '@/api/pm'

  defineOptions({ name: 'PmMaterials' })

  const MAX_FILE_SIZE = 100 * 1024 * 1024 // G2-PM-2：100 MB
  const MAX_FILE_NAME = 200

  function formatDateTime(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN', { hour12: false })
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  // ── 维度占位清单（待 MD-2 业务清单 API 替换，与 BE dimensions.py 同源） ──

  const buOptions = PM_DIMENSIONS_PLACEHOLDER.map((b) => ({ label: b.name, value: b.id }))
  // 占位清单 BU 与产品线 id 空间独立（各自域内查名，避免撞号误显）
  const buName = (id: string | number): string =>
    PM_DIMENSIONS_PLACEHOLDER.find((b) => b.id === Number(id))?.name ?? `未知(${id})`
  const plName = (id: string | number): string => {
    const num = Number(id)
    for (const b of PM_DIMENSIONS_PLACEHOLDER) {
      const pl = b.productLines.find((p) => p.id === num)
      if (pl) return pl.name
    }
    return `未知(${id})`
  }

  // ── 分类树 ──

  const treeData = ref<PmCategoryNode[]>([])
  const selectedNodeId = ref<number | undefined>(undefined)
  const treeLoading = ref(false)

  /** 上传/移动可选树：剔除 DISABLED 分支（挂载校验 PM-2002 的前端前移） */
  const activeTreeData = computed(() => pruneDisabled(treeData.value))
  const moveTreeData = computed(() => pruneDisabled(excludeSubtree(treeData.value, moveForm.id)))

  function pruneDisabled(nodes: PmCategoryNode[]): PmCategoryNode[] {
    return nodes
      .filter((n) => n.status === 'ACTIVE')
      .map((n) => ({ ...n, children: pruneDisabled(n.children) }))
  }

  /** 移动目标剔除自身子树（成环 PM-4001 的前端前移） */
  function excludeSubtree(nodes: PmCategoryNode[], rootId?: number): PmCategoryNode[] {
    if (!rootId) return nodes
    return nodes
      .filter((n) => n.id !== String(rootId))
      .map((n) => ({ ...n, children: excludeSubtree(n.children, rootId) }))
  }
  /** 删除仅空叶子可用（PM-2001 前端前移；后端兜底） */
  function canDelete(node: PmCategoryNode): boolean {
    return node.status === 'ACTIVE' && node.children.length === 0
  }

  async function loadTree() {
    treeLoading.value = true
    try {
      treeData.value = await pmCategoryApi.tree()
    } finally {
      treeLoading.value = false
    }
  }

  function handleNodeClick(data: PmCategoryNode) {
    selectedNodeId.value = Number(data.id)
    replaceSearchParams({ ...searchForm, categoryId: Number(data.id) })
    getData()
  }

  // ── 分类节点操作 ──

  const categoryDialogVisible = ref(false)
  const categorySaving = ref(false)
  const categoryForm = reactive({
    id: undefined as number | undefined,
    parentId: null as number | null,
    parentName: '',
    name: '',
    sortOrder: 0
  })
  const moveDialogVisible = ref(false)
  const moveForm = reactive({ id: undefined as number | undefined, name: '' })
  const moveTarget = ref<number | undefined>(undefined)

  function openCreate(parent: PmCategoryNode | null) {
    Object.assign(categoryForm, {
      id: undefined,
      parentId: parent ? Number(parent.id) : null,
      parentName: parent?.name ?? '',
      name: '',
      sortOrder: 0
    })
    categoryDialogVisible.value = true
  }

  function handleNodeCommand(cmd: string, node: PmCategoryNode) {
    const id = Number(node.id)
    if (cmd === 'create') return openCreate(node)
    if (cmd === 'rename') {
      Object.assign(categoryForm, {
        id,
        parentId: null,
        parentName: node.name,
        name: node.name,
        sortOrder: node.sortOrder
      })
      categoryDialogVisible.value = true
      return
    }
    if (cmd === 'move') {
      Object.assign(moveForm, { id, name: node.name })
      moveTarget.value = undefined
      moveDialogVisible.value = true
      return
    }
    if (cmd === 'disable') {
      ElMessageBox.confirm(
        `停用「${node.name}」：该分支将不可再挂新资料，代理商侧隐藏（已挂资料不受影响）`,
        '停用分类',
        { type: 'warning' }
      )
        .then(() => pmCategoryApi.disable(id))
        .then(() => {
          ElMessage.success('已停用')
          return loadTree()
        })
        .catch(() => undefined)
      return
    }
    if (cmd === 'enable') {
      pmCategoryApi
        .enable(id)
        .then(() => {
          ElMessage.success('已启用')
          return loadTree()
        })
        .catch(() => undefined)
      return
    }
    if (cmd === 'delete') {
      if (!canDelete(node)) {
        ElMessage.warning('仅无子节点且无挂载资料的节点可删除')
        return
      }
      ElMessageBox.confirm(`确认删除「${node.name}」？`, '删除分类', { type: 'warning' })
        .then(() => pmCategoryApi.remove(id))
        .then(() => {
          ElMessage.success('已删除')
          return loadTree()
        })
        .catch(() => undefined)
    }
  }

  async function submitCategory() {
    if (!categoryForm.name.trim()) {
      ElMessage.warning('分类名不能为空')
      return
    }
    categorySaving.value = true
    try {
      if (categoryForm.id) {
        await pmCategoryApi.update(categoryForm.id, {
          name: categoryForm.name,
          sortOrder: categoryForm.sortOrder
        })
      } else {
        await pmCategoryApi.create({
          parentId: categoryForm.parentId ?? undefined,
          name: categoryForm.name,
          sortOrder: categoryForm.sortOrder
        })
      }
      ElMessage.success('已保存')
      categoryDialogVisible.value = false
      await loadTree()
    } finally {
      categorySaving.value = false
    }
  }

  async function submitMove() {
    if (!moveForm.id || !moveTarget.value) {
      ElMessage.warning('请选择目标父分类')
      return
    }
    categorySaving.value = true
    try {
      await pmCategoryApi.move(moveForm.id, moveTarget.value)
      ElMessage.success(`已移动「${moveForm.name}」`)
      moveDialogVisible.value = false
      await loadTree()
    } finally {
      categorySaving.value = false
    }
  }

  // ── 资料库列表（服务端分页 + 排序；分类子级聚合由 BE 承载 BR-PM-009） ──

  interface PmSearchFormParams {
    keyword?: string
    buId?: number
    productLineId?: number
  }

  const activeTab = ref('materials')
  const searchForm = ref<PmSearchFormParams>({})
  const sortBy = ref<PmMaterialListParams['sortBy']>(undefined)
  const sortOrder = ref<'asc' | 'desc' | undefined>(undefined)
  const showSearchBar = ref(true)

  const searchItems = [
    {
      label: 'BU',
      key: 'buId',
      type: 'select',
      props: { placeholder: '全部', options: buOptions, clearable: true }
    },
    {
      label: '产品线',
      key: 'productLineId',
      type: 'select',
      props: {
        placeholder: '全部',
        options: PM_DIMENSIONS_PLACEHOLDER.flatMap((b) =>
          b.productLines.map((pl) => ({ label: pl.name, value: pl.id }))
        ),
        clearable: true
      }
    },
    {
      label: '关键词',
      key: 'keyword',
      type: 'input',
      props: { placeholder: '资料名称', clearable: true }
    }
  ]

  function fetchMaterials(
    params: Record<string, unknown>
  ): Promise<Api.Common.PaginatedResponse<PmMaterialListItem>> {
    const clean: Record<string, unknown> = {
      categoryId: selectedNodeId.value,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value
    }
    for (const [k, v] of Object.entries(params)) {
      if (v !== '' && v !== undefined && v !== null) clean[k] = v
    }
    return pmMaterialApi.list(clean).then(toPaginated)
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
      apiFn: fetchMaterials,
      apiParams: { page: 1, size: 20 },
      paginationKey: { current: 'page', size: 'size' },
      columnsFactory: () => [
        { prop: 'name', label: '名称', minWidth: 220 },
        {
          prop: 'buId',
          label: 'BU',
          width: 90,
          formatter: (row: PmMaterialListItem) => buName(row.buId)
        },
        {
          prop: 'productLineId',
          label: '产品线',
          width: 130,
          formatter: (row: PmMaterialListItem) => plName(row.productLineId)
        },
        {
          prop: 'currentVersion',
          label: '当前版本',
          minWidth: 200,
          formatter: (row: PmMaterialListItem) =>
            row.currentVersion
              ? h('span', [
                  `v${row.currentVersion.versionNo} · ${row.currentVersion.fileName}`,
                  h('span', { class: 'opacity-60 ml-1' }, formatSize(row.currentVersion.fileSize))
                ])
              : '—'
        },
        {
          prop: 'createdAt',
          label: '上传时间',
          minWidth: 170,
          formatter: (row: PmMaterialListItem) => formatDateTime(row.createdAt)
        },
        {
          prop: 'operation',
          label: '操作',
          width: 170,
          fixed: 'right',
          formatter: (row: PmMaterialListItem) =>
            h('div', [
              h(
                ElButton,
                { link: true, type: 'primary', onClick: () => openVersions(row) },
                () => '版本链'
              ),
              h(
                ElButton,
                {
                  link: true,
                  type: 'primary',
                  onClick: () => downloadRow(row)
                },
                () => '下载'
              )
            ])
        }
      ]
    }
  })

  function handleSearch() {
    replaceSearchParams({ ...searchForm, categoryId: selectedNodeId.value })
    getData()
  }

  function handleReset() {
    searchForm.value = {}
    selectedNodeId.value = undefined
    resetSearchParams()
    getData()
  }

  const handleSortChange = ({
    prop,
    order
  }: {
    prop: string
    order: 'ascending' | 'descending' | null
  }) => {
    sortBy.value = order ? (prop as NonNullable<PmMaterialListParams['sortBy']>) : undefined
    sortOrder.value = order === 'ascending' ? 'asc' : order === 'descending' ? 'desc' : undefined
    handleSearch()
  }

  // ── 上传 Drawer ──

  const uploadVisible = ref(false)
  const uploading = ref(false)
  const uploadFormRef = ref()
  const uploadForm = reactive<{
    name: string
    buId: number | undefined
    productLineId: number | undefined
    categoryId: number | undefined
    file: UploadRawFile | undefined
  }>({
    name: '',
    buId: undefined,
    productLineId: undefined,
    categoryId: undefined,
    file: undefined
  })

  const uploadProductLines = computed(
    () => PM_DIMENSIONS_PLACEHOLDER.find((b) => b.id === uploadForm.buId)?.productLines ?? []
  )

  const uploadRules = {
    name: [{ required: true, message: '资料名称必填（G2-PM-4）', trigger: 'blur' }],
    buId: [{ required: true, message: '选择 BU', trigger: 'change' }],
    productLineId: [{ required: true, message: '选择产品线', trigger: 'change' }],
    categoryId: [{ required: true, message: '选择分类', trigger: 'change' }]
  }

  const canUpload = computed(() => true)

  function openUpload() {
    Object.assign(uploadForm, {
      name: '',
      buId: undefined,
      productLineId: undefined,
      categoryId: selectedNodeId.value,
      file: undefined
    })
    uploadVisible.value = true
  }

  function onFileChange(file: UploadFile) {
    uploadForm.file = file.raw
  }

  function submitUpload() {
    uploadFormRef.value?.validate().then(async (valid: boolean) => {
      if (!valid) return
      if (!uploadForm.file) {
        ElMessage.warning('请选择文件')
        return
      }
      if (uploadForm.file.size > MAX_FILE_SIZE) {
        ElMessage.error('文件超过 100 MB 上限')
        return
      }
      if (uploadForm.file.name.length > MAX_FILE_NAME) {
        ElMessage.error('文件名不超过 200 字符')
        return
      }
      uploading.value = true
      try {
        await pmMaterialApi.upload(
          {
            name: uploadForm.name,
            buId: uploadForm.buId!,
            productLineId: uploadForm.productLineId!,
            categoryId: uploadForm.categoryId!
          },
          uploadForm.file
        )
        ElMessage.success('上传成功')
        uploadVisible.value = false
        getData()
      } finally {
        uploading.value = false
      }
    })
  }

  // ── 版本链 Drawer ──

  const versionVisible = ref(false)
  const versionLoading = ref(false)
  const versionMaterial = ref<PmMaterialDetail | null>(null)
  const appending = ref(false)

  async function openVersions(row: PmMaterialListItem) {
    versionVisible.value = true
    versionLoading.value = true
    try {
      versionMaterial.value = await pmMaterialApi.get(row.id)
    } finally {
      versionLoading.value = false
    }
  }

  function beforeAppend(file: UploadRawFile) {
    if (file.size > MAX_FILE_SIZE) {
      ElMessage.error('文件超过 100 MB 上限')
      return false
    }
    if (file.name.length > MAX_FILE_NAME) {
      ElMessage.error('文件名不超过 200 字符')
      return false
    }
    return true
  }

  async function doAppend(options: { file: UploadRawFile }) {
    if (!versionMaterial.value) return
    appending.value = true
    try {
      await pmMaterialApi.appendVersion(versionMaterial.value.id, options.file)
      ElMessage.success('版本已追加')
      versionMaterial.value = await pmMaterialApi.get(versionMaterial.value.id)
      getData()
    } finally {
      appending.value = false
    }
  }

  // ── 下载 ──

  function saveBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }

  function downloadRow(row: PmMaterialListItem) {
    if (!row.currentVersion) return
    pmMaterialApi
      .downloadVersion(row.id, row.currentVersion.versionNo)
      .then((blob) => saveBlob(blob, row.currentVersion!.fileName))
      .catch(() => undefined)
  }

  function downloadVersion(detail: PmMaterialDetail, v: { versionNo: number; fileName: string }) {
    pmMaterialApi
      .downloadVersion(detail.id, v.versionNo)
      .then((blob) => saveBlob(blob, v.fileName))
      .catch(() => undefined)
  }

  // ── 下载统计 Tab ──

  const stats = reactive<{
    dimension: PmStatsDimension
    buId: number | undefined
    productLineId: number | undefined
    range: [string, string] | undefined
    rows: { id: string; name: string; downloadCount: number }[]
    loading: boolean
  }>({
    dimension: 'BU',
    buId: undefined,
    productLineId: undefined,
    range: undefined,
    rows: [],
    loading: false
  })

  const statsProductLines = computed(
    () =>
      PM_DIMENSIONS_PLACEHOLDER.find((b) => b.id === stats.buId)?.productLines ??
      PM_DIMENSIONS_PLACEHOLDER.flatMap((b) => b.productLines)
  )

  const statsNameLabel = computed(() =>
    stats.dimension === 'BU' ? 'BU' : stats.dimension === 'PRODUCT_LINE' ? '产品线' : '资料'
  )

  function onStatsBuChange() {
    stats.productLineId = undefined
  }

  async function fetchStats() {
    stats.loading = true
    try {
      const res = await pmStatsApi.stats({
        dimension: stats.dimension,
        buId: stats.dimension === 'BU' ? undefined : stats.buId,
        productLineId: stats.dimension === 'MATERIAL' ? stats.productLineId : undefined,
        dateFrom: stats.range?.[0],
        dateTo: stats.range?.[1]
      })
      stats.rows = res.items
    } finally {
      stats.loading = false
    }
  }

  onMounted(() => {
    loadTree()
  })
</script>
