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
  /** 账号列表搜索（契约 §3.2：过滤 agentId,status,type,keyword） */
  interface AccountSearchFormParams {
    keyword?: string
    status?: string
    type?: string
    agentId?: number
  }

  interface Props {
    modelValue: AccountSearchFormParams
  }

  interface Emits {
    (e: 'update:modelValue', value: AccountSearchFormParams): void
    (e: 'search', params: AccountSearchFormParams): void
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

  const typeOptions = [
    { label: '平台账号', value: 'PLATFORM_USER' },
    { label: '代理商账号', value: 'AGENT_USER' }
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
    },
    {
      label: '类型',
      key: 'type',
      type: 'select',
      props: {
        placeholder: '请选择类型',
        options: typeOptions,
        clearable: true
      }
    },
    {
      label: '代理商ID',
      key: 'agentId',
      type: 'number',
      props: {
        placeholder: '请输入代理商ID',
        min: 1,
        controlsPosition: 'right'
      }
    }
  ])

  const handleReset = () => {
    emit('reset')
  }

  const handleSearch = async (params: AccountSearchFormParams) => {
    await searchBarRef.value.validate()
    emit('search', params)
  }
</script>
