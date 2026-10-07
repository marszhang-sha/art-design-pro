<template>
  <!-- UI-PORTAL-001：铃铛红点 total>0，无下拉、无轮询；点击直达通知中心 -->
  <div class="ntf-bell-wrap">
    <ArtIconButton icon="ri:notification-2-line" class="notice-button" @click="goToNotifications" />
    <span v-if="total > 0" class="ntf-bell-dot"></span>
  </div>
</template>

<script setup lang="ts">
  import { onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useNtfUnread } from './use-ntf-unread'

  defineOptions({ name: 'NotificationBell' })

  const router = useRouter()
  const { total, refresh } = useNtfUnread()

  function goToNotifications() {
    router.push('/ntf/notifications')
  }

  // 登录后首拉：无轮询，后续由各视图在读/删操作后 refresh()
  onMounted(refresh)
</script>

<style lang="scss" scoped>
  .ntf-bell-wrap {
    position: relative;
    display: inline-flex;
  }

  .ntf-bell-dot {
    position: absolute;
    top: 3px;
    right: 3px;
    width: 8px;
    height: 8px;
    pointer-events: none;
    background: var(--el-color-danger);
    border-radius: 50%;
  }
</style>
