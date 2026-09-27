<template>
  <div class="flex w-full h-screen">
    <LoginLeftView />

    <div class="relative flex-1">
      <AuthTopBar />

      <div class="auth-right-wrap">
        <div class="form">
          <h3 class="title">{{ $t('forgetPassword.title') }}</h3>
          <p class="sub-title">通过账号绑定的手机号/邮箱验证后重设密码</p>

          <!-- 步骤一：发起请求（发送验证码） -->
          <template v-if="step === 1">
            <div class="mt-5">
              <span class="input-label">账号</span>
              <ElInput class="custom-height" v-model.trim="username" placeholder="登录用户名" />
            </div>
            <div style="margin-top: 15px">
              <ElButton
                class="w-full custom-height"
                type="primary"
                :loading="sending"
                @click="sendCode"
                v-ripple
              >
                发送验证码
              </ElButton>
            </div>
            <div style="margin-top: 15px">
              <ElButton class="w-full custom-height" plain @click="toLogin"> 返回登录 </ElButton>
            </div>
          </template>

          <!-- 步骤二：验证码 + 新密码 -->
          <template v-else>
            <div class="mt-5">
              <span class="input-label">验证码</span>
              <div class="flex gap-2">
                <ElInput class="custom-height flex-1" v-model.trim="code" placeholder="验证码" />
                <ElButton :disabled="resendCooldown > 0" @click="resend">
                  {{ resendCooldown > 0 ? `${resendCooldown}s` : '重发' }}
                </ElButton>
              </div>
              <p class="mt-1 text-xs text-gray-400">
                10 分钟内有效；验证错误 5 次后作废；重发频控 60 秒/条、每日 10 条
              </p>
            </div>
            <div class="mt-4">
              <span class="input-label">新密码</span>
              <ElInput
                class="custom-height"
                type="password"
                show-password
                v-model="newPassword"
                placeholder="至少 8 位"
              />
            </div>
            <div style="margin-top: 15px">
              <ElButton
                class="w-full custom-height"
                type="primary"
                :loading="confirming"
                @click="confirmReset"
                v-ripple
              >
                确认重置
              </ElButton>
            </div>
            <div style="margin-top: 15px">
              <ElButton class="w-full custom-height" plain @click="toLogin">返回登录</ElButton>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { defineOptions, ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { iamAuthApi } from '@/api/iam'

  defineOptions({ name: 'ForgetPassword' })

  const router = useRouter()

  const step = ref(1)
  const username = ref('')
  const sending = ref(false)
  const confirming = ref(false)

  const requestId = ref<number | null>(null)
  const code = ref('')
  const newPassword = ref('')
  const resendCooldown = ref(0)
  let cooldownTimer: ReturnType<typeof setInterval> | null = null

  const toLogin = () => {
    router.push({ name: 'Login' })
  }

  async function sendCode() {
    if (!username.value) {
      ElMessage.warning('请输入账号')
      return
    }
    sending.value = true
    try {
      const resp = await iamAuthApi.requestPasswordReset(username.value)
      requestId.value = resp.requestId
      step.value = 2
      startCooldown()
      ElMessage.success('验证码已发送至账号绑定的手机/邮箱')
    } catch {
      // IAM-4002 账号不存在 / IAM-1004 频控：http 层已统一展示
    } finally {
      sending.value = false
    }
  }

  function startCooldown() {
    resendCooldown.value = 60
    cooldownTimer = setInterval(() => {
      resendCooldown.value -= 1
      if (resendCooldown.value <= 0 && cooldownTimer) {
        clearInterval(cooldownTimer)
        cooldownTimer = null
      }
    }, 1000)
  }

  function resend() {
    sendCode()
  }

  async function confirmReset() {
    if (requestId.value == null || !code.value || !newPassword.value) {
      ElMessage.warning('请填写验证码与新密码')
      return
    }
    if (newPassword.value.length < 8) {
      ElMessage.warning('新密码至少 8 位')
      return
    }
    confirming.value = true
    try {
      const ok = await iamAuthApi.confirmPasswordReset(
        requestId.value,
        code.value,
        newPassword.value
      )
      if (ok) {
        ElMessage.success('密码已重置，请使用新密码登录')
        toLogin()
      } else {
        ElMessage.error('验证码错误或已过期，请重新获取')
      }
    } finally {
      confirming.value = false
    }
  }
</script>

<style scoped>
  @import '../login/style.css';
</style>
