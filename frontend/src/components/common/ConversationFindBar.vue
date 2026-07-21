<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { ChevronDown, ChevronUp, Search, X } from '@lucide/vue'

const props = defineProps({
  messages: { type: Array, default: () => [] },
  scrollContainer: { type: Object, default: null },
  targetIdPrefix: { type: String, default: 'msg-' },
  scopeKey: { type: String, default: '' },
  active: { type: Boolean, default: true },
  isMessageSearchable: { type: Function, default: null },
  getMessageText: { type: Function, default: null },
})

const open = ref(false)
const query = ref('')
const activeMatch = ref(0)
const inputRef = ref(null)

const collectText = (value, depth = 0) => {
  if (depth > 4 || value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(item => collectText(item, depth + 1)).join(' ')
  if (typeof value !== 'object') return ''
  const preferredKeys = [
    'content', 'text', 'title', 'summary', 'reply', 'message', 'reason', 'description',
    'taskTitle', 'task_title', 'filename', 'name', 'artist', 'role',
  ]
  const preferred = preferredKeys.map(key => collectText(value[key], depth + 1)).filter(Boolean)
  if (preferred.length) return preferred.join(' ')
  return Object.values(value).slice(0, 24).map(item => collectText(item, depth + 1)).join(' ')
}

const normalizedQuery = computed(() => String(query.value || '').normalize('NFKC').trim().toLocaleLowerCase())
const matchIndices = computed(() => {
  if (!normalizedQuery.value) return []
  const matches = []
  props.messages.forEach((message, index) => {
    if (props.isMessageSearchable && !props.isMessageSearchable(message, index)) return
    const raw = props.getMessageText ? props.getMessageText(message, index) : collectText(message)
    if (String(raw || '').normalize('NFKC').toLocaleLowerCase().includes(normalizedQuery.value)) matches.push(index)
  })
  return matches
})

const currentMatchIndex = computed(() => matchIndices.value[activeMatch.value] ?? -1)
const resultLabel = computed(() => matchIndices.value.length
  ? `${activeMatch.value + 1} / ${matchIndices.value.length}`
  : '0 / 0')

const targetFor = index => document.getElementById(`${props.targetIdPrefix}${index}`)

const clearHighlights = () => {
  for (const index of props.messages.map((_, messageIndex) => messageIndex)) {
    targetFor(index)?.classList.remove('conversation-find-match', 'conversation-find-active')
  }
}

const paintHighlights = () => {
  clearHighlights()
  if (!open.value || !normalizedQuery.value) return
  for (const index of matchIndices.value) targetFor(index)?.classList.add('conversation-find-match')
  const activeTarget = targetFor(currentMatchIndex.value)
  if (activeTarget) activeTarget.classList.add('conversation-find-active')
}

const revealCurrent = (behavior = 'smooth') => {
  nextTick(() => {
    paintHighlights()
    const target = targetFor(currentMatchIndex.value)
    if (target && target.offsetParent !== null) target.scrollIntoView({ behavior, block: 'center' })
  })
}

const move = (direction) => {
  const count = matchIndices.value.length
  if (!count) return
  activeMatch.value = (activeMatch.value + direction + count) % count
  revealCurrent()
}

const openFind = async () => {
  if (!props.active) return
  open.value = true
  await nextTick()
  inputRef.value?.focus({ preventScroll: true })
  inputRef.value?.select()
}

const closeFind = () => {
  open.value = false
  query.value = ''
  activeMatch.value = 0
  clearHighlights()
}

const onInputKeydown = (event) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    move(event.shiftKey ? -1 : 1)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closeFind()
  }
}

const onWindowKeydown = (event) => {
  if (!props.active) return
  if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === 'f') {
    event.preventDefault()
    openFind()
    return
  }
  if (open.value && event.key === 'Escape') {
    event.preventDefault()
    closeFind()
  }
}

watch(normalizedQuery, () => {
  activeMatch.value = 0
  revealCurrent('auto')
})
watch(() => matchIndices.value.join(','), () => {
  if (activeMatch.value >= matchIndices.value.length) activeMatch.value = 0
  nextTick(paintHighlights)
})
watch(() => props.scopeKey, closeFind)
watch(() => props.active, value => { if (!value) closeFind() })

onMounted(() => window.addEventListener('keydown', onWindowKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onWindowKeydown)
  clearHighlights()
})
</script>

<template>
  <button v-if="active" type="button" class="conversation-find-trigger" title="在当前会话中查找 (Ctrl+F)" aria-label="在当前会话中查找" @click="openFind">
    <Search :size="15" />
  </button>

  <Teleport to="body">
    <Transition name="conversation-find">
      <div v-if="open && active" class="conversation-find-bar" role="search" aria-label="在当前会话中查找">
        <Search :size="16" aria-hidden="true" />
        <input ref="inputRef" v-model="query" type="search" placeholder="搜索当前会话" aria-label="搜索当前会话中的消息" @keydown="onInputKeydown">
        <span class="conversation-find-count" aria-live="polite">{{ resultLabel }}</span>
        <button type="button" :disabled="!matchIndices.length" title="上一个匹配 (Shift+Enter)" aria-label="上一个匹配" @click="move(-1)"><ChevronUp :size="15" /></button>
        <button type="button" :disabled="!matchIndices.length" title="下一个匹配 (Enter)" aria-label="下一个匹配" @click="move(1)"><ChevronDown :size="15" /></button>
        <span class="conversation-find-divider"></span>
        <button type="button" title="关闭" aria-label="关闭会话搜索" @click="closeFind"><X :size="15" /></button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.conversation-find-trigger{width:32px;height:32px;display:inline-grid;flex:0 0 auto;place-items:center;padding:0;border:1px solid var(--border-color);border-radius:6px;background:var(--surface);color:var(--text-secondary);cursor:pointer}
.conversation-find-trigger:hover{border-color:var(--border-strong);background:var(--control-hover);color:var(--text-primary)}
:global(.conversation-find-bar){position:fixed;top:9px;left:50%;z-index:12000;width:min(460px,calc(100vw - 20px));height:44px;display:grid;grid-template-columns:auto minmax(0,1fr) auto auto auto 1px auto;align-items:center;gap:7px;padding:5px 7px 5px 12px;border:1px solid var(--border-color);border-radius:8px;background:var(--surface);box-shadow:0 10px 30px rgba(15,23,42,.16);color:var(--text-muted);transform:translateX(-50%)}
:global(.conversation-find-bar input){width:100%;min-width:0;height:32px;padding:0;border:0;outline:0;background:transparent;color:var(--text-primary);font:inherit;font-size:13px}
:global(.conversation-find-bar input::-webkit-search-cancel-button){display:none}
:global(.conversation-find-count){min-width:42px;color:var(--text-muted);font-size:10.5px;text-align:center;white-space:nowrap}
:global(.conversation-find-bar button){width:28px;height:28px;display:grid;place-items:center;padding:0;border:0;border-radius:5px;background:transparent;color:var(--text-secondary);cursor:pointer}
:global(.conversation-find-bar button:hover:not(:disabled)){background:var(--control-hover);color:var(--text-primary)}
:global(.conversation-find-bar button:disabled){opacity:.35;cursor:not-allowed}
:global(.conversation-find-divider){width:1px;height:22px;background:var(--border-color)}
:global(.conversation-find-match){outline:1px solid color-mix(in srgb,#f59e0b 32%,transparent);outline-offset:2px}
:global(.conversation-find-active){background:color-mix(in srgb,#f59e0b 10%,transparent)!important;outline:2px solid color-mix(in srgb,#f59e0b 60%,transparent);outline-offset:3px;transition:background .15s ease,outline-color .15s ease}
:global(.conversation-find-enter-active),:global(.conversation-find-leave-active){transition:opacity .12s ease,transform .12s ease}
:global(.conversation-find-enter-from),:global(.conversation-find-leave-to){opacity:0;transform:translate(-50%,-6px)}
@media(max-width:640px){:global(.conversation-find-bar){top:6px;width:calc(100vw - 12px);grid-template-columns:auto minmax(0,1fr) auto auto auto 1px auto;gap:4px;padding-left:9px}:global(.conversation-find-count){min-width:36px;font-size:10px}}
@media(prefers-reduced-motion:reduce){:global(.conversation-find-enter-active),:global(.conversation-find-leave-active),:global(.conversation-find-active){transition:none}}
</style>
