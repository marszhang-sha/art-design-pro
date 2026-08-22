<!-- 系统logo -->
<template>
  <div class="flex-cc">
    <span :style="logoStyle" class="cso-logo" aria-label="CSO经营管理平台">CSO</span>
  </div>
</template>

<script setup lang="ts">
  defineOptions({ name: 'ArtLogo' })

  interface Props {
    /** logo 大小 */
    size?: number | string
  }

  const props = withDefaults(defineProps<Props>(), {
    size: 36
  })

  const logoStyle = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }))
</script>

<style lang="scss" scoped>
  .cso-logo {
    display: grid;
    color: #fff;
    background: linear-gradient(145deg, #0b2c4d, #1768e5);
    place-items: center;
    border-radius: 9px;
    box-shadow: 0 5px 14px rgb(23 104 229 / 24%);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: -0.03em;
  }
</style>
