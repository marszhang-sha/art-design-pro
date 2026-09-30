<template>
  <ArtSearchBar
    ref="searchBarRef"
    v-model="formData"
    :items="formItems"
    :rules="rules"
    @reset="handleReset"
    @search="handleSearch"
  >
  </ArtSearchBar>
</template>

<script setup lang="ts">
  /** 子账号列表搜索（契约 §3.6：过滤 status,keyword） */
  interface SubAccountSearchFormParams {
    keyword?: string
    status?: string
  }

  interface Props {
    modelValue: SubAccountSearchFormParams
  }

  interface Emits {
    (e: 'update:modelValue', value: SubAccountSearchFormParams): void
    (e: 'search', params: SubAccountSearchFormParams): void
    (e: 'reset'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const searchBarRef = ref()

  /** 表单数据双向绑定 */
  const formData = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
  })

  const rules = {}

  const statusOptions = [
    { label: '正常', value: 'ACTIVE' },
    { label: '已停用', value: 'DISABLED' },
    { label: '已锁定', value: 'LOCKED' }
  ]

  const formItems = computed(() => [
    {
      label: '关键词',
      key: 'keyword',
      type: 'input',
      placeholder: '用户名/显示名',
      clearable: true
    },
    {
      label: '状态',
      key: 'status',
      type: 'select',
      props: {
        placeholder: '请选择状态',
        options: statusOptions,
        clearable: true
      }
    }
  ])

  const handleReset = () => {
    emit('reset')
  }

  const handleSearch = async (params: SubAccountSearchFormParams) => {
    await searchBarRef.value.validate()
    emit('search', params)
  }
</script>
