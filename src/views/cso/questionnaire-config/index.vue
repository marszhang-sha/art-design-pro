<template>
  <CsoPage title="意向问卷配置">
    <ElResult v-if="identity?.role !== 'admin'" icon="warning" title="当前身份无权配置问卷" />
    <template v-else>
      <div class="config-layout">
        <ElCard shadow="never" class="survey-list-card">
          <template #header><span class="font-medium">问卷列表</span></template>
          <div v-loading="loadingList" class="survey-list">
            <button
              v-for="item in surveySummaries"
              :key="item.code"
              type="button"
              class="survey-row"
              :class="{ active: surveyCode === item.code }"
              @click="selectSurvey(item.code)"
            >
              <span class="survey-title">{{ item.title }}</span>
              <span class="survey-meta">code: {{ item.code }}</span>
            </button>
          </div>
          <ElButton type="primary" plain class="w-full mt-2" @click="creating = true"
            >新建问卷</ElButton
          >
        </ElCard>
        <div v-loading="loadingDraft" class="editor-col">
          <template v-if="draft">
            <section class="cso-card config-heading">
              <div
                ><h2>意向问卷配置</h2
                ><p
                  >共 {{ draft.sections.length }} 个章节、{{ draft.questions.length }} 个问题。</p
                ></div
              >
              <ElSpace wrap>
                <ElButton @click="addSection">新增章节</ElButton>
                <ElButton :disabled="!dirty" @click="discard">放弃修改</ElButton>
                <ElButton type="primary" :disabled="!dirty" @click="save">保存配置</ElButton>
              </ElSpace>
            </section>
            <section class="cso-card">
              <ElForm label-position="top">
                <ElFormItem label="问卷标题" required>
                  <ElInput
                    v-model="draft.title"
                    aria-label="问卷标题"
                    placeholder="请输入问卷标题"
                  />
                </ElFormItem>
                <ElFormItem label="问卷致辞">
                  <ElInput
                    v-model="draft.introduction"
                    type="textarea"
                    :rows="8"
                    maxlength="5000"
                    show-word-limit
                    aria-label="问卷致辞"
                    placeholder="请输入问卷开头的致辞，支持换行"
                  />
                </ElFormItem>
              </ElForm>
            </section>
            <section
              v-for="(section, index) in draft.sections"
              :key="section.id"
              :data-section-id="section.id"
              class="cso-card section-card"
            >
              <div class="section-toolbar">
                <span class="section-order">{{ index + 1 }}</span>
                <ElInput
                  v-model="section.title"
                  maxlength="40"
                  :aria-label="'章节名称' + (index + 1)"
                />
                <ElSpace wrap>
                  <ElButton
                    :disabled="moving || index === 0"
                    @click="moveSection(index, -1, $event)"
                    >上移</ElButton
                  >
                  <ElButton
                    :disabled="moving || index === draft.sections.length - 1"
                    @click="moveSection(index, 1, $event)"
                    >下移</ElButton
                  >
                  <ElButton
                    type="danger"
                    plain
                    :disabled="draft.sections.length === 1"
                    @click="removeSection(section.id)"
                    >删除章节</ElButton
                  >
                  <ElButton type="primary" plain @click="editQuestion(undefined, section.id)"
                    >新增问题</ElButton
                  >
                </ElSpace>
              </div>
              <ElTable
                :data="questionsIn(section.id)"
                row-key="key"
                border
                empty-text="暂无问题，可新增问题或将其他章节的问题移入"
              >
                <ElTableColumn type="index" label="序号" width="65" align="center" />
                <ElTableColumn prop="label" label="问题" min-width="240" header-align="center" />
                <ElTableColumn label="题型" width="110" align="center"
                  ><template #default="{ row }">{{ typeLabel(row) }}</template></ElTableColumn
                >
                <ElTableColumn label="必填" width="70" align="center"
                  ><template #default="{ row }">{{
                    row.required ? '是' : '否'
                  }}</template></ElTableColumn
                >
                <ElTableColumn label="属性" width="90" align="center"
                  ><template #default="{ row }"
                    ><ElTag v-if="isCore(row.key)" size="small">核心问题</ElTag></template
                  ></ElTableColumn
                >
                <ElTableColumn label="操作" width="240" align="center" fixed="right">
                  <template #default="{ row, $index }">
                    <ElButton
                      link
                      :disabled="moving || $index === 0"
                      @click="moveQuestion(row.key, -1, $event)"
                      >上移</ElButton
                    >
                    <ElButton
                      link
                      :disabled="moving || $index === questionsIn(section.id).length - 1"
                      @click="moveQuestion(row.key, 1, $event)"
                      >下移</ElButton
                    >
                    <ElButton link type="primary" @click="editQuestion(row)">修改</ElButton>
                    <ElButton
                      link
                      type="danger"
                      :disabled="isCore(row.key)"
                      @click="removeQuestion(row.key)"
                      >删除</ElButton
                    >
                  </template>
                </ElTableColumn>
              </ElTable>
            </section>
            <ElDialog
              v-model="editing"
              :title="existingKey ? '修改问题' : '新增问题'"
              width="min(640px, 94vw)"
              :close-on-click-modal="false"
            >
              <ElForm label-position="top">
                <ElFormItem label="问题名称" required
                  ><ElInput v-model="question.label" maxlength="120"
                /></ElFormItem>
                <ElFormItem label="所属章节" required
                  ><ElSelect v-model="question.section"
                    ><ElOption
                      v-for="section in draft.sections"
                      :key="section.id"
                      :label="section.title"
                      :value="section.id" /></ElSelect
                ></ElFormItem>
                <ElFormItem label="题型" required>
                  <ElSelect v-model="question.type" :disabled="isCore(question.key)"
                    ><ElOption
                      v-for="item in questionTypes"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                  /></ElSelect>
                </ElFormItem>
                <ElFormItem
                  v-if="question.type === 'integer' || question.type === 'decimal'"
                  label="数字格式"
                  ><ElRadioGroup v-model="question.type" :disabled="isCore(question.key)"
                    ><ElRadio value="integer">非负整数</ElRadio
                    ><ElRadio value="decimal">非负数（可含小数）</ElRadio></ElRadioGroup
                  ></ElFormItem
                >
                <ElFormItem label="必填"
                  ><ElSwitch
                    v-model="question.required"
                    :disabled="fixedRequired.includes(question.key)"
                /></ElFormItem>
                <ElFormItem label="题目说明"
                  ><ElInput
                    v-model="question.description"
                    type="textarea"
                    :rows="2"
                    maxlength="500"
                /></ElFormItem>
                <ElFormItem label="输入提示"
                  ><ElInput v-model="question.placeholder" maxlength="120"
                /></ElFormItem>
                <ElFormItem
                  v-if="['radio', 'checkbox'].includes(question.type)"
                  label="选项（每行一项）"
                  required
                  ><ElInput v-model="optionText" type="textarea" :rows="5"
                /></ElFormItem>
                <p v-if="isCore(question.key)" class="core-hint"
                  >核心问题用于意向池展示和查询，请保持原业务含义。</p
                >
              </ElForm>
              <template #footer
                ><ElButton @click="editing = false">取消</ElButton
                ><ElButton type="primary" @click="saveQuestion">确定</ElButton></template
              >
            </ElDialog>

            <ElDialog v-model="creating" title="新建问卷" width="420px">
              <ElForm label-position="top">
                <ElFormItem label="问卷编码" required>
                  <ElInput
                    v-model="newCode"
                    placeholder="字母开头，字母/数字/下划线（如 campus2027）"
                    maxlength="64"
                  />
                </ElFormItem>
                <ElFormItem label="问卷标题" required>
                  <ElInput v-model="newTitle" placeholder="请输入问卷标题" maxlength="200" />
                </ElFormItem>
              </ElForm>
              <template #footer>
                <ElButton @click="creating = false">取消</ElButton>
                <ElButton type="primary" @click="createSurvey">创建并编辑</ElButton>
              </template>
            </ElDialog>
          </template>
        </div>
      </div>
    </template>
  </CsoPage>
</template>
<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
  import { onBeforeRouteLeave } from 'vue-router'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import CsoPage from '../components/CsoPage.vue'
  import { useCsoStore } from '../store'
  import { coopSurveyAdminApi } from '@/api/coop'
  import {
    validateSurveyDefinition,
    SURVEY_CORE_KEYS,
    type SurveyDefinition,
    type SurveyQuestion
  } from '../domain'
  import '../shared-proto.scss'
  defineOptions({ name: 'CsoQuestionnaireConfig' })
  const { identity } = useCsoStore()
  const surveyCode = ref('default')
  const surveySummaries = ref<{ code: string; title: string }[]>([])
  const loadingList = ref(false)
  const loadingDraft = ref(false)
  const draft = ref<SurveyDefinition | null>(null)
  const initial = ref('')
  const dirty = computed(() => !!draft.value && JSON.stringify(draft.value) !== initial.value)
  const editing = ref(false)
  const moving = ref(false)
  async function loadSurveys() {
    loadingList.value = true
    try {
      const rows = await coopSurveyAdminApi.listSurveys()
      surveySummaries.value = rows
        .map((row) => ({ code: row.code, title: row.title }))
        .sort((a, b) =>
          a.code === 'default' ? -1 : b.code === 'default' ? 1 : a.code.localeCompare(b.code)
        )
    } finally {
      loadingList.value = false
    }
  }
  async function loadSurvey() {
    loadingDraft.value = true
    try {
      const row = await coopSurveyAdminApi.getDefinition(surveyCode.value)
      draft.value = {
        version: row.version,
        title: row.title,
        introduction: row.introduction,
        sections: row.sections,
        questions: row.questions
      }
      initial.value = JSON.stringify(draft.value)
    } finally {
      loadingDraft.value = false
    }
  }
  onMounted(() => {
    loadSurveys()
    loadSurvey()
  })
  function selectSurvey(code: string) {
    surveyCode.value = code
    loadSurvey()
  }
  const animations = new Set<Animation>()
  onBeforeUnmount(() => animations.forEach((animation) => animation.cancel()))
  function animate(element: Element, frames: Parameters<Element['animate']>[0], duration: number) {
    const animation = element.animate(frames, { duration, easing: 'ease-in-out' })
    animations.add(animation)
    const finished = animation.finished.catch(() => {}).finally(() => animations.delete(animation))
    return finished
  }
  async function reorder(elements: Element[], selected: Element | null, update: () => void) {
    if (moving.value) return
    moving.value = true
    const positions = elements.map((element) => ({
      element,
      top: element.getBoundingClientRect().top
    }))
    try {
      update()
      await nextTick()
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const movement = positions.flatMap(({ element, top }) => {
        if (!element.isConnected || reducedMotion) return []
        const distance = top - element.getBoundingClientRect().top
        return distance
          ? [
              animate(
                element,
                [{ transform: `translateY(${distance}px)` }, { transform: 'translateY(0)' }],
                200
              )
            ]
          : []
      })
      if (selected?.isConnected) {
        const targets = selected.matches('tr') ? Array.from(selected.children) : [selected]
        targets.forEach((element) => {
          const style = getComputedStyle(element)
          void animate(
            element,
            [
              { backgroundColor: style.getPropertyValue('--el-color-primary-light-8').trim() },
              { backgroundColor: style.backgroundColor }
            ],
            700
          )
        })
      }
      await Promise.all(movement)
    } finally {
      moving.value = false
    }
  }
  const existingKey = ref('')
  const optionText = ref('')
  const question = ref<SurveyQuestion>({
    key: '',
    number: 0,
    label: '',
    section: '',
    type: 'text',
    required: false,
    placeholder: '',
    description: ''
  })
  const fixedRequired = ['company', 'principal', 'contactDetails', 'province', 'city']
  const questionTypes = [
    { label: '单行文字', value: 'text' },
    { label: '多行文字', value: 'multiline' },
    { label: '数字', value: 'decimal' },
    { label: '数字（整数）', value: 'integer' },
    { label: '单选', value: 'radio' },
    { label: '多选', value: 'checkbox' }
  ]
  const isCore = (key: string) => SURVEY_CORE_KEYS.includes(key)
  const typeLabel = (q: SurveyQuestion) =>
    q.key === 'contactDetails'
      ? '邮箱 / 手机'
      : ['province', 'city'].includes(q.key)
        ? '省市联动'
        : questionTypes.find((item) => item.value === q.type)?.label
  const questionsIn = (id: string) => draft.value?.questions.filter((q) => q.section === id) ?? []
  const creating = ref(false)
  const newCode = ref('')
  const newTitle = ref('')
  async function createSurvey() {
    const code = newCode.value.trim()
    const title = newTitle.value.trim()
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(code)) {
      ElMessage.error('问卷编码须为字母开头的字母/数字/下划线')
      return
    }
    if (!title) {
      ElMessage.error('请填写问卷标题')
      return
    }
    try {
      // 新 code 首存：expectedVersion 'none'（服务端无在用版本行即接受）
      await coopSurveyAdminApi.saveDefinition(
        code,
        {
          version: 'survey-' + crypto.randomUUID(),
          title,
          sections: [{ id: 's1', title: '第一章', icon: 'ri:file-list-3-line' }],
          questions: []
        },
        'none'
      )
    } catch {
      return // 错误提示由 http 层统一弹出（如 code 已存在 409 COOP-2002）
    }
    creating.value = false
    newCode.value = ''
    newTitle.value = ''
    await loadSurveys()
    surveyCode.value = code
    loadSurvey()
  }
  async function discard() {
    try {
      await ElMessageBox.confirm('放弃未保存的问卷修改？', '放弃修改')
      loadSurvey()
    } catch {
      /* Keep edits. */
    }
  }
  function addSection() {
    if (!draft.value) return
    draft.value.sections.push({
      id: 'section_' + crypto.randomUUID().replaceAll('-', ''),
      title: '新章节',
      icon: 'ri:file-list-3-line'
    })
  }
  async function removeSection(id: string) {
    if (!draft.value) return
    if (questionsIn(id).length) {
      ElMessage.warning('请先移动或删除本章节的问题，再删除章节')
      return
    }
    if (draft.value.sections.length <= 1) return
    try {
      await ElMessageBox.confirm('删除这个空章节？', '删除章节')
      if (!draft.value) return
      draft.value.sections = draft.value.sections.filter((s) => s.id !== id)
    } catch {
      /* Cancel. */
    }
  }
  function moveSection(index: number, offset: number, event: MouseEvent) {
    const sections = draft.value?.sections
    if (!sections) return
    const next = index + offset
    if (next < 0 || next >= sections.length) return
    const selected = (event.currentTarget as HTMLElement).closest('.section-card')
    const elements = Array.from(
      selected?.parentElement?.querySelectorAll(':scope > .section-card') ?? []
    )
    void reorder(elements, selected, () => {
      ;[sections[index], sections[next]] = [sections[next], sections[index]]
    })
  }
  function moveQuestion(key: string, offset: number, event: MouseEvent) {
    const all = draft.value?.questions
    if (!all) return
    const index = all.findIndex((q) => q.key === key)
    const siblings = questionsIn(all[index].section)
    const target = siblings[siblings.findIndex((q) => q.key === key) + offset]
    if (!target) return
    const next = all.findIndex((q) => q.key === target.key)
    const selected = (event.currentTarget as HTMLElement).closest('tr')
    const elements = Array.from(selected?.parentElement?.children ?? [])
    void reorder(elements, selected, () => {
      ;[all[index], all[next]] = [all[next], all[index]]
    })
  }
  function editQuestion(row?: SurveyQuestion, section = '') {
    existingKey.value = row?.key || ''
    question.value = row
      ? JSON.parse(JSON.stringify(row))
      : {
          key: 'custom_' + crypto.randomUUID().replaceAll('-', ''),
          number: (draft.value?.questions.length ?? 0) + 1,
          label: '',
          section,
          type: 'text',
          required: false,
          placeholder: '',
          description: ''
        }
    optionText.value = question.value.options?.join('\n') || ''
    editing.value = true
  }
  function saveQuestion() {
    if (!draft.value) return
    const q = JSON.parse(JSON.stringify(question.value)) as SurveyQuestion
    q.label = q.label.trim()
    if (['radio', 'checkbox'].includes(q.type))
      q.options = optionText.value
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
    else delete q.options
    const candidate = JSON.parse(JSON.stringify(draft.value)) as SurveyDefinition
    const index = candidate.questions.findIndex(
      (item: SurveyQuestion) => item.key === existingKey.value
    )
    if (index >= 0) candidate.questions[index] = q
    else candidate.questions.push(q)
    try {
      validateSurveyDefinition(candidate)
      draft.value = candidate
      editing.value = false
    } catch (error) {
      ElMessage.error((error as Error).message)
    }
  }
  async function removeQuestion(key: string) {
    if (isCore(key) || !draft.value) return
    try {
      await ElMessageBox.confirm('删除此问题？已提交答卷不受影响。', '删除问题')
      if (!draft.value) return
      draft.value.questions = draft.value.questions.filter((q) => q.key !== key)
    } catch {
      /* Cancel. */
    }
  }
  async function save() {
    if (!draft.value) return
    try {
      validateSurveyDefinition(draft.value)
    } catch (error) {
      ElMessage.error((error as Error).message)
      return
    }
    try {
      // 服务端生成新版本号；乐观锁冲突 409 COOP-2002（http 层提示重新载入）
      await coopSurveyAdminApi.saveDefinition(surveyCode.value, draft.value, draft.value.version)
      ElMessage.success('问卷配置已保存')
      loadSurveys()
      loadSurvey()
    } catch {
      /* 保存失败提示由 http 层统一弹出 */
    }
  }
  onBeforeRouteLeave(async () => {
    if (!dirty.value) return true
    try {
      await ElMessageBox.confirm('问卷修改尚未保存，确定离开？', '未保存修改')
      return true
    } catch {
      return false
    }
  })
</script>
<style scoped>
  .config-layout {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .survey-list-card {
    flex-shrink: 0;
    width: 240px;
  }

  .survey-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .survey-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
    align-items: flex-start;
    padding: 8px 10px;
    text-align: left;
    cursor: pointer;
    background: var(--el-bg-color);
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
  }

  .survey-row.active {
    border-color: var(--el-color-primary);
  }

  .survey-title {
    font-size: 13px;
    font-weight: 600;
  }

  .survey-meta {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .editor-col {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }

  .config-heading,
  .section-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
  }

  .config-heading h2 {
    margin: 0 0 8px;
    font-size: 18px;
  }

  .config-heading p,
  .core-hint {
    margin: 0;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  .section-toolbar {
    margin-bottom: 18px;
  }

  .section-toolbar > .el-input {
    flex: 1;
    min-width: 180px;
    max-width: 380px;
  }

  .section-order {
    font-weight: 600;
    color: var(--el-color-primary);
  }

  .el-select {
    width: 100%;
  }
</style>
