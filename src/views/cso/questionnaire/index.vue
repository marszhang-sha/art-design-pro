<template>
  <main class="questionnaire-page">
    <header class="questionnaire-header">
      <div class="questionnaire-brand"><ArtLogo customer :size="110" /></div>
      <ElButton link @click="router.push('/auth/login')"
        ><ArtSvgIcon icon="ri:arrow-left-line" /> 返回登录</ElButton
      >
    </header>
    <!-- 数字验证码门禁（BR-COOP-029 r2）：通过后方显示问卷内容 -->
    <section v-if="!gatePassed" class="questionnaire-gate">
      <ElCard shadow="never" class="gate-card">
        <h2>合作意向问卷</h2>
        <p class="gate-tip">请输入下方数字验证码，验证通过后打开问卷</p>
        <div class="gate-code" title="点击刷新验证码" @click="makeGateCode">{{ gateCode }}</div>
        <ElInput
          v-model="gateInput"
          placeholder="输入数字验证码"
          size="large"
          @keyup.enter="passGate"
        />
        <ElButton type="primary" size="large" class="gate-btn" @click="passGate">打开问卷</ElButton>
      </ElCard>
    </section>
    <section v-else-if="submitted" class="questionnaire-success">
      <ElResult
        icon="success"
        title="您的合作意向已提交"
        sub-title="感谢关注亚虹医药。我们将根据业务需要与您联系。"
      >
        <template #extra>
          <ElButton @click="router.push('/auth/login')">返回登录</ElButton>
        </template>
      </ElResult>
    </section>
    <section v-else-if="loadError" class="questionnaire-success">
      <ElResult icon="warning" title="问卷加载失败" :sub-title="loadError">
        <template #extra>
          <ElButton type="primary" @click="loadDefinition">重试</ElButton>
        </template>
      </ElResult>
    </section>
    <section v-else-if="!definition" class="questionnaire-success">
      <ElSkeleton :rows="6" animated />
    </section>
    <template v-else>
      <section class="questionnaire-intro">
        <span class="intro-tag">合作意向登记</span>
        <h1>{{ definition.title }}</h1>
        <div v-if="definition.introduction" class="questionnaire-address">{{
          definition.introduction
        }}</div>
        <div class="intro-meta"
          ><span>共 {{ questions.length }} 项</span><span>预计 5–8 分钟</span
          ><span>标 * 的题目为必填</span></div
        >
      </section>
      <div class="questionnaire-layout">
        <aside class="questionnaire-nav" aria-label="问卷章节">
          <div class="completion"
            ><strong>填写进度</strong><span>{{ completed }} / {{ questions.length }}</span></div
          >
          <ElProgress
            :percentage="Math.round((completed / questions.length) * 100)"
            :show-text="false"
            :stroke-width="5"
          />
          <button
            v-for="(section, index) in sections"
            :key="section.id"
            type="button"
            @click="goToSection(section.id)"
          >
            <span class="nav-number">{{ String(index + 1).padStart(2, '0') }}</span>
            <span>{{ section.title }}</span>
            <ArtSvgIcon
              v-if="sectionComplete(section.id)"
              icon="ri:checkbox-circle-line"
              class="section-complete"
            />
          </button>
        </aside>
        <ElForm
          ref="formRef"
          :model="answers"
          :rules="rules"
          label-position="top"
          class="questionnaire-form"
          scroll-to-error
          @submit.prevent="submit"
        >
          <section
            v-for="(section, index) in sections"
            :id="'survey-' + section.id"
            :key="section.id"
            class="questionnaire-section"
          >
            <div class="section-title"
              ><span class="section-icon"><ArtSvgIcon :icon="section.icon" /></span
              ><div
                ><span class="section-number">SECTION {{ String(index + 1).padStart(2, '0') }}</span
                ><h2>{{ section.title }}</h2></div
              ></div
            >
            <div class="question-grid">
              <ElFormItem
                v-for="question in sectionQuestions(section.id)"
                :key="question.key"
                :label="`${question.number}. ${question.key === 'contactDetails' && question.label === '联系方式-邮箱或手机' ? '联系方式' : question.label}`"
                :prop="question.key"
                :class="{
                  'full-row':
                    question.type === 'radio' ||
                    question.type === 'checkbox' ||
                    question.type === 'multiline' ||
                    question.key === 'contactDetails'
                }"
              >
                <SurveyQuestionInput
                  v-model="answers[question.key]"
                  :question="question"
                  :province="answers.province"
                />
                <p v-if="question.description" class="question-description">{{
                  question.description
                }}</p>
              </ElFormItem>
            </div>
          </section>
          <div class="questionnaire-submit">
            <div class="email-verify">
              <ElInput v-model="emailCodeInput" placeholder="邮箱验证码（提交时发送至登记邮箱）">
                <template #append>
                  <ElButton :disabled="emailCooldown > 0" @click="sendEmailCode">{{
                    emailCooldown > 0 ? emailCooldown + 's 后重发' : '发送验证码'
                  }}</ElButton>
                </template>
              </ElInput>
            </div>
            <span>已填写 {{ completed }} / {{ questions.length }} 项</span>
            <ElButton type="primary" size="large" native-type="submit" :loading="submitting"
              >提交合作意向 <ArtSvgIcon icon="ri:arrow-right-line"
            /></ElButton>
          </div>
        </ElForm>
      </div>
    </template>
  </main>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import ArtLogo from '@/components/core/base/art-logo/index.vue'
  import ArtSvgIcon from '@/components/core/base/art-svg-icon/index.vue'
  import { coopIntentSurveyApi, type CoopSurveyDefinition } from '@/api/coop'
  import { emptySurveyAnswers, readSurveyContact, surveyAnswerError } from '../domain'
  import SurveyQuestionInput from './SurveyQuestionInput.vue'
  defineOptions({ name: 'CsoQuestionnaire' })
  const router = useRouter()
  const route = useRoute()
  let surveyCode = (route.query.survey as string) || 'default'

  // ---- 问卷定义：BE 在用版本（填写页渲染即契约 GET definition） ----
  const definition = ref<CoopSurveyDefinition | null>(null)
  const loadError = ref('')
  const sections = computed(() => definition.value?.sections ?? [])
  const questions = computed(() => definition.value?.questions ?? [])
  async function loadDefinition() {
    loadError.value = ''
    definition.value = null
    try {
      definition.value = await coopIntentSurveyApi.getDefinition(surveyCode)
      Object.assign(answers, emptySurveyAnswers(questions.value))
    } catch (error) {
      loadError.value =
        error instanceof Error ? error.message : '问卷加载失败，请稍后重试或联系管理员'
    }
  }
  const answers = reactive<Record<string, string>>({})
  watch(
    () => answers.province,
    () => {
      answers.city = ''
    },
    { flush: 'sync' }
  )
  onMounted(loadDefinition)
  // 同组件路由复用（query.survey 变化不重建实例）：问卷切换时重载定义
  watch(
    () => route.query.survey,
    (next) => {
      const code = (next as string) || 'default'
      if (code !== surveyCode) {
        surveyCode = code
        gatePassed.value = sessionStorage.getItem(GATE_KEY.value) === '1'
        loadDefinition()
      }
    }
  )
  const formRef = ref<FormInstance>()
  const submitted = ref(false)
  const submitting = ref(false)

  // ---- 数字验证码打开门禁（BR-COOP-029 r2；会话级，通过后本会话不再要求） ----
  const GATE_KEY = computed(() => 'asieris-survey-gate-passed:' + surveyCode)
  const gatePassed = ref(sessionStorage.getItem(GATE_KEY.value) === '1')
  const gateCode = ref('')
  const gateInput = ref('')
  function makeGateCode() {
    gateCode.value = String(Math.floor(1000 + Math.random() * 9000))
  }
  if (!gatePassed.value) makeGateCode()
  function passGate() {
    if (gateInput.value.trim() === gateCode.value) {
      sessionStorage.setItem(GATE_KEY.value, '1')
      gatePassed.value = true
    } else {
      ElMessage.error('数字验证码不正确')
      gateInput.value = ''
      makeGateCode()
    }
  }

  // ---- 邮箱验证码：BE 发送（MailPort；60s 频控前端同步禁用，服务端兜底 429） ----
  const emailCodeInput = ref('')
  const emailCooldown = ref(0)
  let cooldownTimer: ReturnType<typeof setInterval> | undefined
  function startCooldown() {
    emailCooldown.value = 60
    cooldownTimer = setInterval(() => {
      emailCooldown.value -= 1
      if (emailCooldown.value <= 0 && cooldownTimer) clearInterval(cooldownTimer)
    }, 1000)
  }
  async function sendEmailCode() {
    if (emailCooldown.value > 0) return
    const contact = readSurveyContact(answers.contactDetails)
    if (!contact?.email.trim()) {
      ElMessage.error('请先在第 4 章节填写联系邮箱')
      document.getElementById('survey-cooperation')?.scrollIntoView({ behavior: 'smooth' })
      return
    }
    try {
      await coopIntentSurveyApi.sendEmailCode(surveyCode, contact.email.trim())
      ElMessage.success(`验证码已发送至 ${contact.email.trim()}，请查收`)
      startCooldown()
    } catch {
      /* 错误提示由 http 层统一弹出（429 频控等） */
    }
  }
  const completed = computed(
    () =>
      questions.value.filter(
        (q) =>
          answers[q.key]?.trim() && answers[q.key] !== '[]' && !surveyAnswerError(q, answers[q.key])
      ).length
  )
  const sectionQuestions = (id: string) => questions.value.filter((q) => q.section === id)
  const sectionComplete = (id: string) =>
    sectionQuestions(id).every((q) => !surveyAnswerError(q, answers[q.key]))
  const rules = computed<FormRules>(() =>
    Object.fromEntries(
      questions.value.map((question) => [
        question.key,
        [
          {
            required: question.required,
            validator: (_rule: unknown, value: unknown, callback: (error?: Error) => void) => {
              const message = surveyAnswerError(question, value)
              callback(message ? new Error(message) : undefined)
            },
            trigger: ['blur', 'change']
          }
        ]
      ])
    )
  )
  function goToSection(id: string) {
    document.getElementById('survey-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  function toSubmitPayload() {
    const d = definition.value!
    const contact = readSurveyContact(answers.contactDetails)
    const num = (key: string) => {
      const value = Number(answers[key])
      return Number.isFinite(value) ? value : 0
    }
    return {
      surveyCode,
      definitionVersion: d.version,
      answers: Object.fromEntries(d.questions.map((q) => [q.key, answers[q.key] ?? ''])),
      company: answers.company.trim(),
      principal: answers.principal.trim(),
      phone: contact?.mobile.trim() || '',
      email: contact?.email.trim() || '',
      emailCode: emailCodeInput.value.trim(),
      province: answers.province.trim(),
      city: answers.city?.trim() || undefined,
      companyScale: answers.companyScale.trim(),
      directTeam: num('directTeam'),
      recruitmentTeam: num('recruitmentTeam'),
      products: answers.products.trim(),
      coveredCities: answers.coveredCities.trim(),
      hospitalCount: num('hospitalCount'),
      gynecologySales: num('gynecologySales'),
      sales2025: num('sales2025'),
      contractQuantity: num('contractQuantity'),
      productManager: answers.productManager.trim(),
      cooperationRegion: answers.cooperationRegion.trim()
    }
  }
  async function submit() {
    if (submitted.value || submitting.value || !formRef.value || !definition.value) return
    submitting.value = true
    try {
      if (!(await formRef.value.validate().catch(() => false))) return
      if (!emailCodeInput.value.trim()) {
        ElMessage.error('请填写邮箱验证码')
        return
      }
      await coopIntentSurveyApi.submitIntention(toSubmitPayload())
      submitted.value = true
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      /* 校验失败/防重 409 等错误提示由 http 层统一弹出 */
    } finally {
      submitting.value = false
    }
  }
</script>

<style scoped lang="scss">
  .questionnaire-gate {
    display: flex;
    justify-content: center;
    padding: 48px 0;
  }

  .gate-card {
    width: 380px;
    text-align: center;

    h2 {
      margin: 8px 0 16px;
    }

    .gate-tip {
      margin-bottom: 12px;
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }

    .gate-code {
      padding: 10px 0;
      margin-bottom: 12px;
      font-size: 32px;
      font-weight: 800;
      color: var(--el-color-primary);
      letter-spacing: 12px;
      cursor: pointer;
      user-select: none;
      background: var(--el-fill-color-light);
      border-radius: 8px;
    }

    .gate-btn {
      width: 100%;
      margin-top: 12px;
    }
  }

  .email-verify {
    flex: 1;
    max-width: 420px;
    margin-right: auto;
  }

  .question-description {
    width: 100%;
    margin: 6px 0 0;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  .questionnaire-page {
    min-height: 100vh;
    padding: 0 32px 64px;
    font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
    color: #243c57;
    background: #f4f7fb;

    --el-color-primary: #1664b1;
  }

  .questionnaire-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1120px;
    height: 88px;
    margin: auto;
  }

  .questionnaire-brand {
    display: flex;
    gap: 20px;
    align-items: center;
  }

  .questionnaire-intro {
    max-width: 1120px;
    padding: 34px 38px;
    margin: 12px auto 28px;
    background: #eaf5fd;
    border: 1px solid #e0edf7;
    border-radius: 12px;
  }

  .intro-tag {
    display: inline-block;
    margin-bottom: 12px;
    font-size: 13px;
    font-weight: 600;
    color: #1765a8;
  }

  h1 {
    margin: 0 0 16px;
    font-size: clamp(24px, 2.6vw, 34px);
    font-weight: 600;
    line-height: 1.4;
    color: #133e69;
  }

  .questionnaire-intro p {
    margin: 0 0 22px;
    font-size: 15px;
    line-height: 1.8;
    color: #52708d;
  }

  .questionnaire-address {
    margin: 20px 0 24px;
    font-size: 15px;
    line-height: 1.9;
    color: #405d78;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }

  .intro-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 24px;
    font-size: 13px;
    color: #668098;
  }

  .questionnaire-layout {
    display: grid;
    grid-template-columns: 224px minmax(0, 1fr);
    gap: 24px;
    align-items: start;
    max-width: 1120px;
    margin: auto;
  }

  .questionnaire-nav {
    position: sticky;
    top: 24px;
    padding: 22px 16px;
    background: #fff;
    border: 1px solid #e1e8f0;
    border-radius: 10px;
  }

  .completion {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    font-size: 13px;
  }

  .completion span {
    color: #647f97;
  }

  .questionnaire-nav .el-progress {
    margin-bottom: 20px;
  }

  .questionnaire-nav button {
    display: flex;
    gap: 10px;
    align-items: center;
    width: 100%;
    padding: 12px 8px;
    margin-top: 8px;
    font-size: 13px;
    color: #435e79;
    text-align: left;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 6px;
  }

  .questionnaire-nav button:hover {
    color: #1664b1;
    background: #f0f6fc;
  }

  .questionnaire-nav button:focus-visible {
    outline: 2px solid #1664b1;
  }

  .nav-number {
    font-size: 12px;
    color: #91a6ba;
  }

  .section-complete {
    margin-left: auto;
    color: #269986;
  }

  .questionnaire-section {
    padding: 28px 32px 12px;
    margin-bottom: 20px;
    background: #fff;
    border: 1px solid #e1e8f0;
    border-radius: 10px;
    scroll-margin-top: 24px;
  }

  .section-title {
    display: flex;
    gap: 14px;
    align-items: center;
    padding-bottom: 20px;
    margin-bottom: 24px;
    border-bottom: 1px solid #edf1f5;
  }

  .section-icon {
    font-size: 25px;
    color: #2269aa;
  }

  .section-number {
    font-size: 10px;
    color: #8c9fb0;
    letter-spacing: 1.5px;
  }

  h2 {
    margin: 3px 0 0;
    font-size: 19px;
    font-weight: 600;
  }

  .question-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 24px;
  }

  .full-row {
    grid-column: 1 / -1;
  }

  .questionnaire-form :deep(.el-form-item__label) {
    height: auto;
    margin-bottom: 10px;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.7;
    color: #354e69;
  }

  .questionnaire-form :deep(.el-form-item) {
    margin-bottom: 25px;
  }

  .questionnaire-form :deep(.el-input__wrapper) {
    min-height: 42px;
  }

  .questionnaire-form :deep(.el-textarea__inner) {
    padding: 10px 12px;
    line-height: 1.8;
  }

  .scale-options {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .scale-options :deep(.el-radio) {
    height: 40px;
    padding: 0 12px;
    margin: 0;
  }

  .scale-options :deep(.el-radio.is-checked) {
    background: #f2f7fc;
  }

  .questionnaire-submit {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
  }

  .questionnaire-submit > span {
    font-size: 13px;
    color: #6f8397;
  }

  .questionnaire-submit .el-button {
    min-width: 210px;
    height: 46px;
  }

  .questionnaire-submit :deep(.art-svg-icon) {
    margin-left: 16px;
  }

  .questionnaire-success {
    max-width: 780px;
    padding: 48px 24px;
    margin: 64px auto;
    background: #fff;
    border: 1px solid #e1e8f0;
    border-radius: 12px;
  }

  @media (width <= 800px) {
    .questionnaire-page {
      padding: 0 16px 40px;
    }

    .questionnaire-header {
      height: 80px;
    }

    .questionnaire-intro {
      padding: 24px;
      margin-bottom: 20px;
    }

    .intro-meta {
      gap: 12px;
    }

    .questionnaire-layout {
      display: block;
    }

    .questionnaire-nav {
      position: static;
      margin-bottom: 20px;
    }

    .questionnaire-nav button {
      display: none;
    }

    .questionnaire-nav .el-progress {
      margin: 0;
    }

    .questionnaire-section {
      padding: 22px 20px 8px;
    }

    .question-grid {
      grid-template-columns: 1fr;
    }

    .questionnaire-submit {
      flex-direction: column;
    }

    .questionnaire-submit .el-button {
      width: 100%;
    }
  }
</style>
