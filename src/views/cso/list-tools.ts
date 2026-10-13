import { nextTick, ref } from 'vue'
import { useCsoStore } from './store'

/** Shared toolbar behavior for local prototype lists. */
export function useCsoListTools(clearSelection?: () => void) {
  const showSearchBar = ref(true)
  const loading = ref(false)
  const { refresh } = useCsoStore()
  async function refreshData() {
    loading.value = true
    try {
      clearSelection?.()
      refresh()
      await nextTick()
    } finally {
      loading.value = false
    }
  }
  return { showSearchBar, loading, refreshData }
}
