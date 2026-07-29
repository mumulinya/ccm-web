<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { SearchAddon } from '@xterm/addon-search'
import '@xterm/xterm/css/xterm.css'
import { ArrowDownToLine, ChevronDown, Copy, GripHorizontal, Pause, Play, RotateCcw, Search, Trash2, X } from '@lucide/vue'
import { toast } from '../../utils/toast.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '运行控制台' },
  project: { type: String, default: '' },
  profileId: { type: String, default: '' },
  kind: { type: String, default: 'run' },
  status: { type: String, default: 'stopped' },
  busy: { type: String, default: '' },
})
const emit = defineEmits(['close', 'action'])
const consoleEl = ref(null)
const terminalEl = ref(null)
const query = ref('')
const follow = ref(true)
const paused = ref(false)
const connection = ref('disconnected')
const snapshotState = ref('idle')
const connectionError = ref('')
const hasContent = ref(false)
const resizing = ref(false)
const storedPanelHeight = Number(localStorage.getItem('project-run-console-height') || 0)
const panelHeight = ref(Number.isFinite(storedPanelHeight) && storedPanelHeight > 0 ? storedPanelHeight : 0)
let terminal = null
let fitAddon = null
let searchAddon = null
let eventSource = null
let resizeObserver = null
let queued = ''
let renderedContent = ''
let fallbackPollTimer = null
let activeBindingKey = ''
let resizeStartY = 0
let resizeStartHeight = 0

const heightBounds = () => {
  const mobile = window.matchMedia('(max-width: 760px)').matches
  const parentHeight = consoleEl.value?.parentElement?.clientHeight || window.innerHeight
  return mobile
    ? { min: 180, max: Math.max(240, Math.floor(window.innerHeight * 0.78)) }
    : { min: 180, max: Math.max(280, parentHeight - 170) }
}
const defaultPanelHeight = () => {
  const { min, max } = heightBounds()
  const preferred = window.matchMedia('(max-width: 760px)').matches
    ? window.innerHeight * 0.48
    : window.innerHeight * 0.42
  return Math.round(Math.min(max, Math.max(min, preferred)))
}
const setPanelHeight = (value, persist = false) => {
  const { min, max } = heightBounds()
  panelHeight.value = Math.round(Math.min(max, Math.max(min, Number(value) || defaultPanelHeight())))
  if (persist) localStorage.setItem('project-run-console-height', String(panelHeight.value))
}
const panelStyle = computed(() => ({
  '--run-console-height': `${panelHeight.value || defaultPanelHeight()}px`,
}))
const stopResize = () => {
  if (!resizing.value) return
  resizing.value = false
  document.body.classList.remove('is-resizing-run-console')
  window.removeEventListener('pointermove', onResizeMove)
  window.removeEventListener('pointerup', stopResize)
  window.removeEventListener('pointercancel', stopResize)
  setPanelHeight(panelHeight.value, true)
}
const onResizeMove = (event) => {
  if (!resizing.value) return
  setPanelHeight(resizeStartHeight + resizeStartY - event.clientY)
}
const startResize = (event) => {
  if (event.button !== undefined && event.button !== 0) return
  event.preventDefault()
  resizeStartY = event.clientY
  resizeStartHeight = consoleEl.value?.getBoundingClientRect().height || panelHeight.value || defaultPanelHeight()
  resizing.value = true
  document.body.classList.add('is-resizing-run-console')
  window.addEventListener('pointermove', onResizeMove)
  window.addEventListener('pointerup', stopResize)
  window.addEventListener('pointercancel', stopResize)
}
const resetPanelHeight = () => {
  panelHeight.value = defaultPanelHeight()
  localStorage.removeItem('project-run-console-height')
}
const resizeByKeyboard = (event) => {
  const step = event.shiftKey ? 80 : 32
  if (event.key === 'ArrowUp') setPanelHeight((panelHeight.value || defaultPanelHeight()) + step, true)
  else if (event.key === 'ArrowDown') setPanelHeight((panelHeight.value || defaultPanelHeight()) - step, true)
  else if (event.key === 'Home') setPanelHeight(heightBounds().min, true)
  else if (event.key === 'End') setPanelHeight(heightBounds().max, true)
  else return
  event.preventDefault()
}
const clampPanelHeight = () => {
  if (props.open) setPanelHeight(panelHeight.value || defaultPanelHeight())
}

const normalize = value => String(value || '').replace(/\r?\n/g, '\r\n')
const write = (value, track = true) => {
  if (!terminal || !value) return
  if (track) {
    renderedContent = (renderedContent + String(value)).slice(-4_000_000)
    hasContent.value = renderedContent.length > 0
  }
  if (paused.value) {
    queued = (queued + value).slice(-1_000_000)
    return
  }
  terminal.write(normalize(value), () => { if (follow.value) terminal.scrollToBottom() })
}
const reset = value => {
  terminal?.reset()
  queued = ''
  renderedContent = String(value || '')
  hasContent.value = renderedContent.length > 0
  write(renderedContent, false)
}
const stopFallbackPolling = () => {
  if (fallbackPollTimer) window.clearInterval(fallbackPollTimer)
  fallbackPollTimer = null
}
const disposeStream = () => {
  stopFallbackPolling()
  eventSource?.close()
  eventSource = null
  connection.value = 'disconnected'
}
let connectionGeneration = 0
const loadSnapshot = async (params, generation, quiet = false) => {
  if (!quiet) snapshotState.value = 'loading'
  try {
    const response = await fetch(`/api/projects/runtime/logs?${params}&lines=2000`, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    const payload = await response.json().catch(() => ({}))
    if (generation !== connectionGeneration || !props.open) return false
    if (!response.ok || payload.success === false) throw new Error(payload.error || `读取日志失败（HTTP ${response.status}）`)
    const content = String(payload.logs || '')
    if (content !== renderedContent) reset(content)
    snapshotState.value = content ? 'ready' : 'empty'
    connectionError.value = ''
    return true
  } catch (error) {
    if (generation === connectionGeneration && props.open) {
      connectionError.value = error?.message || '读取日志失败'
      if (!hasContent.value) snapshotState.value = 'failed'
    }
    return false
  }
}
const startFallbackPolling = (params, generation) => {
  if (fallbackPollTimer || generation !== connectionGeneration || !props.open) return
  fallbackPollTimer = window.setInterval(() => {
    void loadSnapshot(params, generation, true)
  }, 2000)
}
const connect = async () => {
  disposeStream()
  if (!props.open || !props.project || !props.profileId) return
  const generation = ++connectionGeneration
  connection.value = 'connecting'
  connectionError.value = ''
  const bindingKey = `${props.project}:${props.profileId}:${props.kind}`
  if (bindingKey !== activeBindingKey) {
    activeBindingKey = bindingKey
    reset('')
    snapshotState.value = 'loading'
  }
  const params = new URLSearchParams({ project: props.project, profile_id: props.profileId, kind: props.kind })
  const snapshotLoaded = await loadSnapshot(params, generation)
  if (!snapshotLoaded) startFallbackPolling(params, generation)
  if (generation !== connectionGeneration || !props.open) return
  eventSource = new EventSource(`/api/projects/runtime/log-stream?${params}`)
  eventSource.onopen = () => {
    if (generation !== connectionGeneration) return
    connection.value = 'connected'
    connectionError.value = ''
    stopFallbackPolling()
  }
  eventSource.onmessage = event => {
    if (generation !== connectionGeneration) return
    try {
      const payload = JSON.parse(event.data || '{}')
      if (payload.type === 'snapshot' || payload.type === 'reset') {
        const content = String(payload.content || '')
        if (content !== renderedContent) reset(content)
        snapshotState.value = content ? 'ready' : 'empty'
      } else if (payload.type === 'chunk') {
        write(payload.content)
        if (payload.content) snapshotState.value = 'ready'
      }
    } catch {}
  }
  eventSource.onerror = () => {
    if (generation !== connectionGeneration) return
    connection.value = 'reconnecting'
    startFallbackPolling(params, generation)
  }
}
const mountTerminal = async () => {
  await nextTick()
  if (!terminalEl.value) return
  setPanelHeight(panelHeight.value || defaultPanelHeight())
  if (!terminal) {
    terminal = new Terminal({
      convertEol: true,
      cursorBlink: false,
      disableStdin: true,
      fontFamily: 'JetBrains Mono, Consolas, monospace',
      fontSize: 12,
      lineHeight: 1.35,
      scrollback: 12000,
      theme: { background: '#111318', foreground: '#d7dae0', cursor: '#7aa2f7', selectionBackground: '#31558a', black: '#1b1d23', red: '#f7768e', green: '#9ece6a', yellow: '#e0af68', blue: '#7aa2f7', magenta: '#bb9af7', cyan: '#7dcfff', white: '#c0caf5', brightBlack: '#565f89' },
    })
    fitAddon = new FitAddon()
    searchAddon = new SearchAddon()
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(searchAddon)
    terminal.open(terminalEl.value)
    resizeObserver = new ResizeObserver(() => fitAddon?.fit())
    resizeObserver.observe(terminalEl.value)
  }
  fitAddon?.fit()
  connect()
}
const togglePaused = () => {
  paused.value = !paused.value
  if (!paused.value && queued) {
    const pending = queued
    queued = ''
    write(pending, false)
  }
}
const findNext = () => { if (query.value) searchAddon?.findNext(query.value, { caseSensitive: false, incremental: true }) }
const copySelection = async () => {
  const selected = terminal?.getSelection() || ''
  if (!selected) return toast.info('请先选择要复制的日志')
  await navigator.clipboard.writeText(selected)
  toast.success('已复制所选日志')
}
const clear = () => terminal?.clear()
const close = () => { disposeStream(); emit('close') }

watch(() => props.open, value => { if (value) mountTerminal(); else disposeStream() })
watch(() => `${props.project}:${props.profileId}:${props.kind}`, () => { if (props.open) connect() })
window.addEventListener('resize', clampPanelHeight)
onBeforeUnmount(() => {
  stopResize()
  window.removeEventListener('resize', clampPanelHeight)
  disposeStream()
  resizeObserver?.disconnect()
  terminal?.dispose()
})
</script>

<template>
  <section
    v-if="open"
    ref="consoleEl"
    class="run-console"
    :class="{ resizing }"
    :style="panelStyle"
    aria-label="项目运行控制台"
  >
    <div
      class="console-resize-handle"
      role="separator"
      aria-label="调整运行日志高度"
      aria-orientation="horizontal"
      :aria-valuenow="panelHeight || defaultPanelHeight()"
      :aria-valuemin="heightBounds().min"
      :aria-valuemax="heightBounds().max"
      tabindex="0"
      title="上下拖动调整日志高度，双击恢复默认"
      @pointerdown="startResize"
      @dblclick="resetPanelHeight"
      @keydown="resizeByKeyboard"
    >
      <GripHorizontal :size="18" />
    </div>
    <header>
      <div class="console-title"><span class="run-mark"></span><strong>{{ title }}</strong><small>{{ project }}</small></div>
      <div class="console-state" :class="[status, connection]"><span></span>{{ status === 'starting' ? '准备依赖' : status === 'running' ? '运行中' : status === 'failed' ? '已失败' : status === 'unknown' ? '待确认' : '已停止' }}</div>
      <div class="console-search" role="search">
        <Search :size="14" />
        <input v-model="query" type="text" aria-label="查找日志" placeholder="查找日志" autocomplete="off" spellcheck="false" @keydown.enter="findNext">
        <button type="button" title="查找下一个（Enter）" aria-label="查找下一个" :disabled="!query" @click="findNext"><ChevronDown :size="14" /></button>
      </div>
      <div class="console-actions">
        <button v-if="kind === 'run' && ['starting', 'running'].includes(status)" title="停止进程" :disabled="!!busy" @click="emit('action', 'stop')"><Pause :size="15" /></button>
        <button v-if="kind === 'run'" title="重新运行" :disabled="!!busy" @click="emit('action', 'restart')"><RotateCcw :size="15" /></button>
        <button title="暂停日志输出" :class="{ active: paused }" @click="togglePaused"><Play v-if="paused" :size="15" /><Pause v-else :size="15" /></button>
        <button title="自动滚动到底部" :class="{ active: follow }" @click="follow = !follow"><ArrowDownToLine :size="15" /></button>
        <button title="复制所选日志" @click="copySelection"><Copy :size="15" /></button>
        <button title="清空当前视图" @click="clear"><Trash2 :size="15" /></button>
        <button title="关闭运行控制台" @click="close"><X :size="16" /></button>
      </div>
    </header>
    <div ref="terminalEl" class="terminal-host"></div>
    <div v-if="snapshotState !== 'ready' && !hasContent" class="console-placeholder" :title="connectionError">
      {{ snapshotState === 'loading' ? '正在读取运行日志...' : snapshotState === 'failed' ? '日志连接暂时不可用，正在自动重试' : '进程尚未输出日志' }}
    </div>
  </section>
</template>

<style scoped>
.run-console { position:relative; height:var(--run-console-height,clamp(260px,42vh,520px)); flex:0 0 auto; display:flex; flex-direction:column; min-height:180px; border-top:1px solid var(--border-color); background:#111318; box-shadow:0 -8px 24px rgba(0,0,0,.12); transition:height .16s ease; }
.run-console.resizing{transition:none;user-select:none}
:global(body.is-resizing-run-console){cursor:ns-resize!important;user-select:none!important}
.console-resize-handle{position:absolute;z-index:4;left:0;right:0;top:-6px;height:12px;display:flex;align-items:center;justify-content:center;border:0;background:transparent;color:#5f6878;cursor:ns-resize;touch-action:none;outline:none}
.console-resize-handle:before{content:"";position:absolute;left:0;right:0;top:5px;height:2px;background:#2c3038;transition:background .15s,box-shadow .15s}
.console-resize-handle svg{position:relative;z-index:1;padding:0 5px;background:#1b1d23;border-radius:4px;opacity:.35;transition:opacity .15s,color .15s}
.console-resize-handle:hover:before,.console-resize-handle:focus-visible:before,.run-console.resizing .console-resize-handle:before{background:#4f8bd8;box-shadow:0 0 0 1px rgba(79,139,216,.18)}
.console-resize-handle:hover svg,.console-resize-handle:focus-visible svg,.run-console.resizing .console-resize-handle svg{opacity:1;color:#8eb9ef}
header { min-height:42px; flex:0 0 42px; display:flex; align-items:center; gap:10px; padding:0 10px 0 13px; border-bottom:1px solid #2c3038; background:#1b1d23; color:#d7dae0; }
.console-title { min-width:0; display:flex; align-items:center; gap:7px; }
.console-title strong { max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11.5px; }
.console-title small { color:#7f8797; font-size:9.5px; }
.run-mark { width:8px; height:8px; border-radius:2px; background:#62b47a; }
.console-state { display:flex; align-items:center; gap:5px; color:#949baa; font-size:9.5px; white-space:nowrap; }
.console-state>span { width:6px; height:6px; border-radius:50%; background:#6b7280; }
.console-state.running>span { background:#64c47b; box-shadow:0 0 0 3px rgba(100,196,123,.12); }
.console-state.starting>span { background:#e0af68; box-shadow:0 0 0 3px rgba(224,175,104,.12); }
.console-state.failed>span { background:#f7768e; }
.console-search { margin-left:auto; width:min(230px,24vw); height:30px; box-sizing:border-box; display:flex; align-items:center; gap:7px; padding:0 4px 0 9px; overflow:hidden; border:1px solid #353b46; border-radius:5px; background:#12151a; color:#778191; transition:border-color .15s,background .15s,box-shadow .15s; }
.console-search:focus-within { border-color:#4f8bd8; background:#171a20; box-shadow:0 0 0 2px rgba(79,139,216,.16); color:#8eb9ef; }
.run-console .console-search input,.run-console .console-search input:focus { min-width:0; height:100%; flex:1; box-sizing:border-box; padding:0!important; border:0!important; border-radius:0!important; outline:0!important; background:transparent!important; box-shadow:none!important; color:#d7dae0!important; caret-color:#8eb9ef; font:10.5px 'JetBrains Mono',Consolas,monospace; }
.run-console .console-search input::placeholder { color:#697282; opacity:1; }
.console-search button { width:23px; height:23px; flex:0 0 auto; display:grid; place-items:center; padding:0; border:0; border-radius:4px; background:transparent; color:#778191; cursor:pointer; }
.console-search button:hover:not(:disabled) { background:#252a33; color:#d7dae0; }
.console-search button:disabled { opacity:.35; cursor:default; }
.console-actions { display:flex; align-items:center; gap:3px; }
.console-actions button { width:28px; height:28px; display:grid; place-items:center; padding:0; border:1px solid transparent; border-radius:4px; background:transparent; color:#949baa; cursor:pointer; }
.console-actions button:hover,.console-actions button.active { border-color:#3b4350; background:#272b33; color:#d7dae0; }
.console-actions button:disabled { opacity:.4; cursor:not-allowed; }
.terminal-host { min-height:0; flex:1; padding:8px 6px 7px 10px; overflow:hidden; }
.console-placeholder { position:absolute; inset:42px 0 0; display:grid; place-items:center; pointer-events:none; background:#111318; color:#7f8797; font:11px 'JetBrains Mono',Consolas,monospace; }
.terminal-host :deep(.xterm-viewport) { scrollbar-color:#454b57 #111318; }
@media(max-width:760px){
  .run-console{
    position:fixed;
    left:0;
    right:0;
    bottom:calc(56px + env(safe-area-inset-bottom,0px));
    z-index:85;
    height:var(--run-console-height,min(48dvh,420px));
    min-height:180px;
    border:1px solid #2c3038;
    border-radius:8px 8px 0 0;
    box-shadow:0 -12px 34px rgba(0,0,0,.3);
  }
  .console-title small,.console-state,.console-search{display:none}
  header{gap:4px}
  .console-actions{margin-left:auto;overflow-x:auto}
  .console-title strong{max-width:130px}
}
</style>
