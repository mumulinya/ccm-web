import { computed, ref } from 'vue'

const STORAGE_KEY = 'ccm:usability-workbench:preferences:v1'
const DEFAULT_SECTIONS = {
  command: true,
  quickActions: true,
  attention: true,
  active: true,
  completed: true,
  resources: true,
}

export function useWorkbenchPreferences(quickActionIds = []) {
  const sections = ref({ ...DEFAULT_SECTIONS })
  const quickActionOrder = ref([...quickActionIds])

  const save = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sections: sections.value, quickActionOrder: quickActionOrder.value }))
    } catch {}
  }

  const load = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      if (stored?.sections) sections.value = { ...DEFAULT_SECTIONS, ...stored.sections }
      const storedOrder = Array.isArray(stored?.quickActionOrder) ? stored.quickActionOrder : []
      quickActionOrder.value = [...storedOrder.filter(id => quickActionIds.includes(id)), ...quickActionIds.filter(id => !storedOrder.includes(id))]
    } catch {}
  }

  const setSection = (key, visible) => {
    sections.value = { ...sections.value, [key]: !!visible }
    save()
  }

  const moveQuickAction = (id, direction) => {
    const order = [...quickActionOrder.value]
    const index = order.indexOf(id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= order.length) return
    ;[order[index], order[target]] = [order[target], order[index]]
    quickActionOrder.value = order
    save()
  }

  const reset = () => {
    sections.value = { ...DEFAULT_SECTIONS }
    quickActionOrder.value = [...quickActionIds]
    save()
  }

  const visibleSectionCount = computed(() => Object.values(sections.value).filter(Boolean).length)

  load()
  return { sections, quickActionOrder, visibleSectionCount, setSection, moveQuickAction, reset }
}
