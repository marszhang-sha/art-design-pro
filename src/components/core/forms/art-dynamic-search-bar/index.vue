<template>
  <!-- 动态查询条件条（T29）：条件池由列 search 元数据驱动，「＋添加条件」逐个添加、
       已选条件各带移除 ×；查询/重置沿用；重置=恢复默认条件集＋清空取值。 -->
  <div class="md-dyn-bar">
    <div v-for="cond in selectedConds" :key="cond.key" class="cond-item">
      <span class="cond-label">{{ cond.label }}</span>
      <ElInput
        v-if="cond.type === 'input'"
        v-model="form[cond.key]"
        clearable
        :placeholder="cond.label"
        style="width: 180px"
        @keyup.enter="emit('search')"
      />
      <ElSelect
        v-else-if="cond.type === 'select'"
        v-model="form[cond.key]"
        clearable
        placeholder="全部"
        style="width: 170px"
        v-bind="cond.props"
      />
      <ElDatePicker
        v-else-if="cond.type === 'daterange'"
        v-model="form[cond.key]"
        type="daterange"
        value-format="YYYY-MM-DD"
        start-placeholder="开始"
        end-placeholder="结束"
        style="width: 260px"
        v-bind="cond.props"
      />
      <ElIcon class="cond-remove" title="移除条件" @click="remove(cond.key)"
        ><CircleClose
      /></ElIcon>
    </div>

    <ElDropdown v-if="pool.length" trigger="click" @command="add">
      <ElButton link type="primary">
        <ElIcon><Plus /></ElIcon>
        添加条件
      </ElButton>
      <template #dropdown>
        <ElDropdownMenu>
          <ElDropdownItem v-for="c in pool" :key="c.key" :command="c.key">{{
            c.label
          }}</ElDropdownItem>
        </ElDropdownMenu>
      </template>
    </ElDropdown>

    <div class="flex-1" />
    <ElButton :disabled="loading" @click="onReset">重置</ElButton>
    <ElButton :disabled="loading" type="primary" @click="emit('search')">查询</ElButton>
  </div>
</template>

<script setup lang="ts">
  import { CircleClose, Plus } from '@element-plus/icons-vue'
  import { computed } from 'vue'
  import {
    ElButton,
    ElDatePicker,
    ElDropdown,
    ElDropdownItem,
    ElDropdownMenu,
    ElIcon,
    ElInput,
    ElSelect
  } from 'element-plus'

  /** 动态条件定义（由列 search 元数据派生，见 ColumnOption.search） */
  export interface DynamicCondition {
    key: string
    label: string
    type: 'input' | 'select' | 'daterange'
    props?: Record<string, any>
    default?: boolean
  }

  defineOptions({ name: 'ArtDynamicSearchBar' })

  const props = defineProps<{
    /** 条件池全集（列 search 元数据派生） */
    conditions: DynamicCondition[]
    loading?: boolean
  }>()

  /** 查询取值（父组件持有对象；组件内原地读写） */
  const form = defineModel<Record<string, any>>('form', { required: true })
  /** 已选条件 key 列表（顺序即渲染顺序） */
  const selected = defineModel<string[]>('selected', { required: true })
  const emit = defineEmits<{ search: []; reset: [] }>()

  const selectedConds = computed(() =>
    selected.value
      .map((key) => props.conditions.find((c) => c.key === key))
      .filter((c): c is DynamicCondition => !!c)
  )

  const pool = computed(() => props.conditions.filter((c) => !selected.value.includes(c.key)))

  function add(key: string) {
    if (!selected.value.includes(key)) selected.value = [...selected.value, key]
    if (!(key in form.value)) form.value[key] = undefined
  }

  function remove(key: string) {
    selected.value = selected.value.filter((k) => k !== key)
    delete form.value[key] // AC-3：移除后取值不残留
  }

  function onReset() {
    selected.value = props.conditions.filter((c) => c.default).map((c) => c.key)
    for (const key of Object.keys(form.value)) form.value[key] = undefined
    emit('reset')
  }
</script>

<style scoped>
  .md-dyn-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
  }

  .cond-item {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .cond-label {
    color: var(--el-text-color-regular);
    white-space: nowrap;
  }

  .cond-remove {
    color: var(--el-text-color-placeholder);
    cursor: pointer;
  }

  .cond-remove:hover {
    color: var(--el-color-danger);
  }

  .flex-1 {
    flex: 1;
  }
</style>
