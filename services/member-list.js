import { computed, ref } from 'vue'
import { loadMemberPage } from './store.js'
import { isApiMode } from './config.js'

export function useMemberList(domain, { filters = () => ({}), demoRows = () => [], fetchPage = loadMemberPage } = {}) {
  const rows = ref([]), total = ref(0), pageNum = ref(1), pageSize = 20
  const loading = ref(isApiMode()), loadError = ref('')
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
  let sequence = 0
  async function load(targetPage = pageNum.value) {
    const version = ++sequence
    loading.value = true
    loadError.value = ''
    try {
      const name = typeof domain === 'function' ? domain() : domain
      const query = { ...filters(), pageNum: targetPage, pageSize }
      let result
      if (isApiMode()) {
        result = await fetchPage(name, query)
        if (version !== sequence) return
        const lastPage = Math.max(1, Math.ceil(result.total / pageSize))
        if (targetPage > lastPage) {
          targetPage = lastPage
          if (result.total > 0) result = await fetchPage(name, { ...query, pageNum: targetPage })
        }
      } else {
        const source = demoRows()
        targetPage = Math.min(targetPage, Math.max(1, Math.ceil(source.length / pageSize)))
        result = { rows: source.slice((targetPage - 1) * pageSize, targetPage * pageSize), total: source.length }
      }
      if (version !== sequence) return
      rows.value = result.rows
      total.value = result.total
      pageNum.value = targetPage
    } catch (error) {
      if (version === sequence) loadError.value = error.message || '记录暂时无法获取，请稍后重试'
    } finally {
      if (version === sequence) loading.value = false
    }
  }
  return { rows, total, pageNum, pageSize, pageCount, loading, loadError, load }
}
