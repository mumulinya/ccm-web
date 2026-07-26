<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { SearchAddon } from '@xterm/addon-search'
import '@xterm/xterm/css/xterm.css'
import { ArrowDownToLine, Copy, Pause, Play, RotateCcw, Search, Trash2, X } from '@lucide/vue'
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
const terminalEl = ref(null)
const query = ref('')
const follow = ref(true)
const paused = ref(false)
const connection = ref('disconnected')
const snapshotState = ref('idle')
let terminal = null
let fitAddon = null
let searchAddon = null
let eventSource = null
let resizeObserver = null
let queued = ''

const normalize = value => String(value || '').replace(/\r?\n/g, '\r\n')
const write = value => {
  if (!terminal || !value) return
  if (paused.value) {
    queued = (queued + value).slice(-1_000_000)
    return
  }
  terminal.write(normalize(value), () => { if (follow.value) terminal.scrollToBottom() })
}
const reset = value => {
  terminal?.reset()
  queued = ''
  write(value)
}
const disposeStream = () => {
  eventSource?.close()
  eventSource = null
  connection.value = 'disconnected'
}
let connectionGeneration = 0
const connect = async () => {
  disposeStream()
  if (!props.open || !props.project || !props.profileId) return
  const generation = ++connectionGeneration
  connection.value = 'connecting'
  const params = new URLSearchParams({ project: props.project, profile_id: props.profileId, kind: props.kind })
  snapshotState.value = 'loading'
  try {
    const response = await fetch(`/api/projects/runtime/logs?${params}&lines=2000`)
    const payload = await response.json()
    if (generation !== connectionGeneration || !props.open) return
    if (!response.ok || payload.success === false) throw new Error(payload.error || '读取日志失败')
    reset(payload.logs || '')
    snapshotState.value = payload.logs ? 'ready' : 'empty'
  } catch {
    if (generation === connectionGeneration) snapshotState.value = 'failed'
  }
  if (generation !== connectionGeneration || !props.open) return
  eventSource = new EventSource(`/api/projects/runtime/log-stream?${params}`)
  eventSource.onopen = () => { connection.value = 'connected' }
  eventSource.onmessage = event => {
    try {
      const payload = JSON.parse(event.data || '{}')
      if (payload.type === 'snapshot' || payload.type === 'reset') {
        reset(payload.content)
        snapshotState.value = payload.content ? 'ready' : 'empty'
      } else if (payload.type === 'chunk') {
        write(payload.content)
        if (payload.content) snapshotState.value = 'ready'
      }
    } catch {}
  }
  eventSource.onerror = () => { connection.value = 'reconnecting' }
}
const mountTerminal = async () => {
  await nextTick()
  if (!terminalEl.value) return
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
    write(pending)
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
onBeforeUnmount(() => {
  disposeStream()
  resizeObserver?.disconnect()
  terminal?.dispose()
})
</script>

<template>
  <section v-if="open" class="run-console" aria-label="项目运行控制台">
    <header>
      <div class="console-title"><span class="run-mark"></span><strong>{{ title }}</strong><small>{{ project }}</small></div>
      <div class="console-state" :class="[status, connection]"><span></span>{{ status === 'starting' ? '准备依赖' : status === 'running' ? '运行中' : status === 'failed' ? '已失败' : status === 'unknown' ? '待确认' : '已停止' }}</div>
      <label class="console-search"><Search :size="14" /><input v-model="query" placeholder="查找日志" @keydown.enter="findNext"><button title="查找下一个" @click="findNext">Enter</button></label>
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
    <div v-if="snapshotState !== 'ready'" class="console-placeholder">
      {{ snapshotState === 'loading' ? '正在读取运行日志...' : snapshotState === 'failed' ? '日志连接失败，正在等待实时流恢复' : '进程尚未输出日志' }}
    </div>
  </section>
</template>

<style scoped>
.run-console { position:relative; height:clamp(260px,42vh,520px); flex:0 0 auto; display:flex; flex-direction:column; min-height:0; border-top:1px solid var(--border-color); background:#111318; box-shadow:0 -8px 24px rgba(0,0,0,.12); }
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
.console-search { margin-left:auto; width:min(220px,22vw); height:28px; display:flex; align-items:center; gap:6px; padding:0 7px; border:1px solid #343842; border-radius:5px; background:#14161b; color:#7f8797; }
.console-search input { min-width:0; flex:1; border:0; outline:0; background:transparent; color:#d7dae0; font:10.5px 'JetBrains Mono',Consolas,monospace; }
.console-search button { width:auto; padding:0; border:0; background:transparent; color:#626a78; font-size:8px; }
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
    height:min(48dvh,420px);
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
