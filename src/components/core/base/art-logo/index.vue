<!-- 系统logo（customer 变体＝亚虹医药品牌头，原型移植 2026-10-12） -->
<template>
  <div v-if="customer" class="flex-cc customer-logo" :style="brandStyle">
    <img
      :style="logoStyle"
      :src="customerLogo"
      alt="亚虹 Logo"
      class="w-full h-full object-contain"
    />
    <span class="customer-name" aria-hidden="true">
      <span v-for="character in '亚虹医药'" :key="character">{{ character }}</span>
    </span>
  </div>
  <div v-else class="flex-cc">
    <span :style="logoStyle" class="cso-logo" aria-label="CSO经营管理平台">CSO</span>
  </div>
</template>

<script setup lang="ts">
  // 官方矢量标识：https://www.asieris.cn/static/CNyahong/images/logo_black.svg
  import customerLogo from '@imgs/common/asieris-logo.svg'

  defineOptions({ name: 'ArtLogo' })

  interface Props {
    /** logo 大小 */
    size?: number | string
    /** 品牌头变体：亚虹医药 logo＋中文名（问卷页用） */
    customer?: boolean
  }

  const props = withDefaults(defineProps<Props>(), {
    size: 36,
    customer: false
  })

  const logoSize = computed(() => Number(props.size ?? (props.customer ? 76 : 36)))
  const brandStyle = computed(() =>
    props.customer ? { '--brand-width': `${logoSize.value}px` } : undefined
  )
  const logoStyle = computed(() => ({
    width: `${logoSize.value}px`,
    height: props.customer ? 'auto' : `${logoSize.value}px`,
    flexShrink: 0
  }))
</script>

<style lang="scss" scoped>
  .cso-logo {
    display: grid;
    place-items: center;
    font-size: 10px;
    font-weight: 800;
    color: #fff;
    letter-spacing: -0.03em;
    background: linear-gradient(145deg, #0b2c4d, #1768e5);
    border-radius: 9px;
    box-shadow: 0 5px 14px rgb(23 104 229 / 24%);
  }

  .customer-logo {
    flex-direction: column;
    flex-shrink: 0;
    justify-content: center;
    width: var(--brand-width);
  }

  .customer-name {
    display: flex;
    justify-content: space-between;
    width: var(--brand-width);
    margin-top: 3px;
    font-family: 'Microsoft YaHei', sans-serif;
    font-size: calc(var(--brand-width) * 0.15);
    font-weight: 700;
    line-height: 1.2;
    color: #0c4d95;
  }
</style>
