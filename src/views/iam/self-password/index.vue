<template>
  <div class="p-4 max-w-xl mx-auto">
    <ElCard shadow="never">
      <h3 class="mb-4 font-bold">修改登录密码</h3>
      <ElForm label-width="110px">
        <ElFormItem label="旧密码" required>
          <ElInput v-model="oldPassword" type="password" show-password />
        </ElFormItem>
        <ElFormItem label="新密码" required>
          <ElInput v-model="newPassword" type="password" show-password placeholder="至少 8 位" />
        </ElFormItem>
        <ElFormItem label="确认新密码" required>
          <ElInput v-model="confirmPassword" type="password" show-password />
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" :loading="saving" @click="submit">修改密码</ElButton>
        </ElFormItem>
      </ElForm>
      <ElAlert
        title="修改成功后需使用新密码重新登录（当前会话保留）"
        type="info"
        :closable="false"
      />
    </ElCard>
  </div>
</template>

<script setup lang="ts">
  import { defineOptions, ref } from 'vue'
  import { ElMessage } from 'element-plus'
  import { iamAuthApi } from '@/api/iam'

  defineOptions({ name: 'IamSelfPassword' })

  const oldPassword = ref('')
  const newPassword = ref('')
  const confirmPassword = ref('')
  const saving = ref(false)

  async function submit() {
    if (!oldPassword.value) {
      ElMessage.warning('请输入旧密码')
      return
    }
    if (newPassword.value.length < 8) {
      ElMessage.warning('新密码至少 8 位')
      return
    }
    if (newPassword.value !== confirmPassword.value) {
      ElMessage.warning('两次输入的新密码不一致')
      return
    }
    saving.value = true
    try {
      await iamAuthApi.selfChangePassword(oldPassword.value, newPassword.value)
      ElMessage.success('密码已修改')
      oldPassword.value = ''
      newPassword.value = ''
      confirmPassword.value = ''
    } finally {
      saving.value = false
    }
  }
</script>
