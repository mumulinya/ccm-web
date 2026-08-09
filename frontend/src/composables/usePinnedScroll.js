import { nextTick, ref } from 'vue'

export function usePinnedScroll(scrollRef, options = {}) {
  const threshold = options.threshold || 120
  const observeRef = options.observeRef || scrollRef
  const isPinnedToBottom = ref(true)
  const pendingUpdates = ref(0)
  const lastMeaningfulKey = ref('')
  let resizeObserver = null

  const isNearBottom = () => {
    const el = scrollRef.value
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
  }

  const updateScrollState = () => {
    isPinnedToBottom.value = isNearBottom()
    if (isPinnedToBottom.value) pendingUpdates.value = 0
  }

  const notifyContentUpdate = async input => {
    const source = typeof input === 'string' ? { key: input } : (input || {})
    const key = String(source.key || '')
    if (key && key === lastMeaningfulKey.value) return
    if (key) lastMeaningfulKey.value = key
    if (isNearBottom()) {
      isPinnedToBottom.value = true
      await scrollToBottom()
      pendingUpdates.value = 0
      return
    }
    isPinnedToBottom.value = false
    pendingUpdates.value += Math.max(1, Number(source.count || 1))
  }

  const jumpToLatest = async () => {
    pendingUpdates.value = 0
    await scrollToBottom({ force: true, smooth: true })
  }

  const resetPinnedScroll = () => {
    pendingUpdates.value = 0
    lastMeaningfulKey.value = ''
    isPinnedToBottom.value = true
  }

  const scrollToBottom = async (input = {}) => {
    const optionsObject = typeof input === 'boolean' ? { smooth: input } : input
    await nextTick()
    const el = scrollRef.value
    if (!el) return
    if (optionsObject.force || isPinnedToBottom.value) {
      if (optionsObject.smooth) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      } else {
        el.scrollTop = el.scrollHeight
      }
      isPinnedToBottom.value = true
    }
  }

  const attachResizeObserver = () => {
    if (typeof ResizeObserver === 'undefined' || resizeObserver) return
    const target = observeRef.value
    if (!target) return
    resizeObserver = new ResizeObserver(() => {
      if (isPinnedToBottom.value && scrollRef.value?.clientHeight > 0) {
        scrollRef.value.scrollTop = scrollRef.value.scrollHeight
      }
    })
    resizeObserver.observe(target)
  }

  const detachResizeObserver = () => {
    if (!resizeObserver) return
    resizeObserver.disconnect()
    resizeObserver = null
  }

  return {
    isPinnedToBottom,
    isNearBottom,
    updateScrollState,
    scrollToBottom,
    attachResizeObserver,
    detachResizeObserver,
    pendingUpdates,
    notifyContentUpdate,
    jumpToLatest,
    resetPinnedScroll,
  }
}
