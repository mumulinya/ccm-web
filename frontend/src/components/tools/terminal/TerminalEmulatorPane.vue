<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { SearchAddon } from '@xterm/addon-search'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { terminalApi } from '../../../api/index.js'
import { confirmDialog, toast } from '../../../utils/toast.js'

const props = defineProps({
  session: { type: Object, required: true },
  active: { type: Boolean, default: false },
})
const emit = defineEmits(['status', 'ready', 'exit'])

const host = ref(null)
const connecting = ref(true)
const connectionState = ref('connecting')
let xterm = null
let fitAddon = null
let searchAddon = null
let eventSource = null
let resizeObserver = null
let inputQueue = ''
let inputTimer = null
let inputChain = Promise.resolve()
let disposed = false

const terminalTheme = () => {
  const styles = getComputedStyle(document.documentElement)
  const dark = document.documentElement.getAttribute('data-theme') === 'dark'
  return {
    background: dark ? '#0b1018' : '#0d1420',
    foreground: '#d7e0ea',
    cursor: '#5eead4',
    cursorAccent: '#0d1420',
    selectionBackground: '#2563eb66',
    black: '#101826', red: '#fb7185', green: '#4ade80', yellow: '#facc15',
    blue: '#60a5fa', magenta: '#c084fc', cyan: '#2dd4bf', white: '#e2e8f0',
    brightBlack: '#64748b', brightRed: '#fda4af', brightGreen: '#86efac', brightYellow: '#fde047',
    brightBlue: '#93c5fd', brightMagenta: '#d8b4fe', brightCyan: '#5eead4', brightWhite: styles.getPropertyValue('--text-primary').trim() || '#f8fafc',
  }
}

const writeSystem = text => xterm?.writeln(`\r\n\x1b[36m[CCM] ${text}\x1b[0m`)

const flushInput = () => {
  clearTimeout(inputTimer)
  const data = inputQueue
  inputQueue = ''
  if (!data || disposed) return
  inputChain = inputChain.then(async () => {
    const response = await terminalApi.input(props.session.id, data)
    if (response.status === 409) {
      const payload = await response.json().catch(() => ({}))
      if (payload.code !== 'confirmation_required') throw new Error(payload.error || '终端输入被拒绝')
      const accepted = await confirmDialog(`该命令会修改或删除本地状态，确定继续？\n\n${payload.command}`)
      if (accepted) {
        await terminalApi.confirmInput(props.session.id, payload.challenge)
        toast.success('高风险命令已确认执行')
      } else {
        writeSystem('已取消高风险命令')
      }
      return
    }
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.error || `终端输入失败：HTTP ${response.status}`)
    }
  }).catch(error => {
    writeSystem(error.message || '终端输入失败')
    emit('status', { id: props.session.id, status: 'error', error: error.message })
  })
}

const queueInput = data => {
  inputQueue += data
  if (inputQueue.length >= 4096 || /[\r\n]/.test(data)) flushInput()
  else {
    clearTimeout(inputTimer)
    inputTimer = setTimeout(flushInput, 18)
  }
}

const resizeTerminal = () => {
  if (!xterm || !fitAddon || !host.value || host.value.clientWidth < 30 || host.value.clientHeight < 30) return
  try {
    fitAddon.fit()
    terminalApi.resize(props.session.id, xterm.cols, xterm.rows).catch(() => {})
  } catch {}
}

const connectEvents = () => {
  eventSource?.close()
  eventSource = new EventSource(`/api/terminal/session/events?id=${encodeURIComponent(props.session.id)}`)
  eventSource.onopen = () => {
    connectionState.value = 'connected'
    emit('status', { id: props.session.id, status: 'running' })
  }
  eventSource.onmessage = event => {
    let payload
    try { payload = JSON.parse(event.data) } catch { return }
    if (payload.type === 'ready') {
      connecting.value = false
      emit('ready', payload.session)
    } else if (payload.type === 'snapshot') {
      xterm.reset()
      xterm.write(payload.data || '')
    } else if (payload.type === 'data') {
      xterm.write(payload.data || '')
    } else if (payload.type === 'exit') {
      connectionState.value = 'exited'
      writeSystem(`Shell 已退出，退出码 ${payload.exitCode ?? 1}`)
      emit('exit', { id: props.session.id, exitCode: payload.exitCode ?? 1 })
      eventSource?.close()
    }
  }
  eventSource.onerror = () => {
    if (connectionState.value === 'exited' || disposed) return
    connectionState.value = 'reconnecting'
    emit('status', { id: props.session.id, status: 'reconnecting' })
  }
}

const ensureSession = async () => {
  connecting.value = true
  connectionState.value = 'connecting'
  const result = await terminalApi.createSession({
    sessionId: props.session.id,
    name: props.session.name,
    shell: props.session.shell,
    cwd: props.session.currentCwd,
    project: props.session.selectedProject,
    cols: xterm?.cols || 120,
    rows: xterm?.rows || 30,
  })
  emit('ready', result.session)
  connectEvents()
  await nextTick()
  resizeTerminal()
}

const copySelection = async () => {
  const value = xterm?.getSelection() || ''
  if (!value) return false
  await navigator.clipboard.writeText(value)
  return true
}

const selectedText = () => xterm?.getSelection() || ''

const bufferText = () => {
  if (!xterm) return ''
  const rows = []
  const buffer = xterm.buffer.active
  for (let index = 0; index < buffer.length; index += 1) rows.push(buffer.getLine(index)?.translateToString(true) || '')
  return rows.join('\n').replace(/\n{4,}/g, '\n\n\n').trim()
}

const copyAll = async () => {
  const value = bufferText()
  if (!value) return false
  await navigator.clipboard.writeText(value)
  return true
}

const runCommand = command => {
  const value = String(command || '').trim()
  if (!value) return
  queueInput(`${value}\r`)
  xterm?.focus()
}

const pasteText = text => {
  if (!text) return
  xterm?.paste(String(text))
  xterm?.focus()
}

const focus = () => xterm?.focus()
const findNext = query => searchAddon?.findNext(String(query || ''), { incremental: true, decorations: { matchBackground: '#854d0e', activeMatchBackground: '#2563eb' } })
const findPrevious = query => searchAddon?.findPrevious(String(query || ''), { decorations: { matchBackground: '#854d0e', activeMatchBackground: '#2563eb' } })

defineExpose({ copySelection, copyAll, getSelection: selectedText, getOutput: bufferText, runCommand, pasteText, focus, findNext, findPrevious, fit: resizeTerminal })

onMounted(async () => {
  xterm = new Terminal({
    allowProposedApi: false,
    convertEol: false,
    cursorBlink: true,
    cursorStyle: 'bar',
    fontFamily: 'Cascadia Code, JetBrains Mono, Consolas, monospace',
    fontSize: 13,
    lineHeight: 1.18,
    letterSpacing: 0,
    scrollback: 10_000,
    smoothScrollDuration: 80,
    theme: terminalTheme(),
    windowsMode: navigator.platform.toLowerCase().includes('win'),
  })
  fitAddon = new FitAddon()
  searchAddon = new SearchAddon()
  xterm.loadAddon(fitAddon)
  xterm.loadAddon(searchAddon)
  xterm.loadAddon(new WebLinksAddon((_event, uri) => window.open(uri, '_blank', 'noopener,noreferrer')))
  xterm.open(host.value)
  xterm.onData(queueInput)
  xterm.attachCustomKeyEventHandler(event => {
    if (event.type !== 'keydown') return true
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'c') {
      void copySelection()
      return false
    }
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'v') {
      navigator.clipboard.readText().then(pasteText).catch(() => {})
      return false
    }
    return true
  })
  resizeObserver = new ResizeObserver(() => resizeTerminal())
  resizeObserver.observe(host.value)
  try { await ensureSession() } catch (error) {
    connecting.value = false
    connectionState.value = 'error'
    writeSystem(error.message || '无法创建终端会话')
    emit('status', { id: props.session.id, status: 'error', error: error.message })
  }
  if (props.active) xterm.focus()
})

watch(() => props.active, active => {
  if (active) nextTick(() => { resizeTerminal(); xterm?.focus() })
})

onUnmounted(() => {
  disposed = true
  clearTimeout(inputTimer)
  flushInput()
  eventSource?.close()
  resizeObserver?.disconnect()
  xterm?.dispose()
})
</script>

<template>
  <div class="emulator-shell">
    <div ref="host" class="emulator-host" :aria-busy="connecting"></div>
    <div v-if="connectionState === 'connecting' || connectionState === 'reconnecting'" class="connection-state">
      <span></span>{{ connectionState === 'reconnecting' ? '正在重新连接终端' : '正在启动 Shell' }}
    </div>
  </div>
</template>

<style scoped>
.emulator-shell { position:relative; width:100%; height:100%; min-width:0; min-height:0; overflow:hidden; background:#0d1420; }
.emulator-host { width:100%; height:100%; padding:8px 8px 4px 10px; }
.emulator-host :deep(.xterm) { height:100%; }
.emulator-host :deep(.xterm-viewport) { scrollbar-color:#334155 #0d1420; scrollbar-width:thin; }
.connection-state { position:absolute; top:10px; right:13px; display:flex; align-items:center; gap:6px; padding:5px 8px; border:1px solid rgba(94,234,212,.18); border-radius:5px; background:rgba(13,20,32,.88); color:#94a3b8; font-size:10px; pointer-events:none; }
.connection-state span { width:6px; height:6px; border-radius:50%; background:#2dd4bf; box-shadow:0 0 0 4px rgba(45,212,191,.1); animation:pulse 1s ease-in-out infinite; }
@keyframes pulse { 50% { opacity:.35; } }
</style>
