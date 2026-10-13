import { computed, shallowRef } from 'vue'

export type CsoDetailKind = 'intentions' | 'partners' | 'contracts' | 'deposits'
interface DetailSelection {
  kind: CsoDetailKind
  id: string
}

const stack = shallowRef<DetailSelection[]>([])
export const activeCsoDetail = computed(() => stack.value.at(-1))
export const canGoBackCsoDetail = computed(() => stack.value.length > 1)

export function openCsoDetail(kind: CsoDetailKind, id: string) {
  if (activeCsoDetail.value?.kind === kind && activeCsoDetail.value.id === id) return
  stack.value = [...stack.value, { kind, id }]
}

export function backCsoDetail() {
  stack.value = stack.value.slice(0, -1)
}

export function closeCsoDetail() {
  stack.value = []
}
