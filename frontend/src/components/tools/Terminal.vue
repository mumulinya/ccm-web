<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  Columns2, Copy, Download, FolderGit2, History, ListTree, Plus, RotateCcw,
  Search, Square, SquareTerminal, Trash2, X,
} from '@lucide/vue'
import { terminalApi, projectsApi } from '../../api/index.js'
import { confirmDialog, toast } from '../../utils/toast.js'

const projects = ref([])
const systemInfo = ref(null)
const terminals = ref([])
const activeTerminalId = ref('')
const isSplitMode = ref(false)
const logFilter = ref('')
const showHistoryDrawer = ref(false)
const historySearch = ref('')
const hydrated = ref(false)
let persistTimer = null

const nowLabel = () => new Date().toLocaleTimeString('zh-CN', { hour12: false })
const makeId = () => `terminal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
const createTerminal = (index = terminals.value.length + 1) => ({
  id: makeId(),
  name: `终端 ${index}`,
  selectedProject: '',
  terminalOutput: [],
  command: '',
  history: [],
  historyIndex: -1,
  currentCwd: systemInfo.value?.home || '',
  status: 'idle',
  runId: '',
  startedAt: 0,
  lastExitCode: null,
  lastDurationMs: 0,
})

const activeTerminal = computed(() => terminals.value.find(item => item.id === activeTerminalId.value) || terminals.value[0] || null)
const visibleTerminals = computed(() => {
  if (!isSplitMode.value) return activeTerminal.value ? [activeTerminal.value] : []
  const active = activeTerminal.value
  const other = terminals.value.find(item => item.id !== active?.id)
  return [active, other].filter(Boolean)
})
const activeRunning = computed(() => activeTerminal.value?.status === 'running')
const filteredHistory = computed(() => {
  const history = Array.from(new Set(activeTerminal.value?.history || [])).reverse()
  const query = historySearch.value.trim().toLowerCase()
  return query ? history.filter(command => command.toLowerCase().includes(query)) : history
})

const presets = [
  { label: '运行状态', command: 'ccm status', tone: 'info' },
  { label: 'Git 状态', command: 'git status', tone: 'success' },
  { label: '最近提交', command: 'git log -n 5 --oneline', tone: 'neutral' },
  { label: 'Node 版本', command: 'node -v', tone: 'neutral' },
  { label: '列出目录', command: 'Get-ChildItem', tone: 'neutral' },
  { label: '启动全部', command: 'ccm start all', tone: 'success', risky: true },
  { label: '停止全部', command: 'ccm stop all', tone: 'danger', risky: true },
]

const riskyCommand = command => /(?:^|\s)(?:rm\s+-rf|del\s+\/|rmdir\s+\/s|format\s+|shutdown\s+|stop-process|taskkill\s+|git\s+reset\s+--hard|git\s+clean\s+-[a-z]*f|ccm\s+stop\s+all)(?:\s|$)/i.test(command)
const formatDuration = milliseconds => milliseconds >= 1000 ? `${(milliseconds / 1000).toFixed(milliseconds >= 10_000 ? 0 : 1)}s` : `${milliseconds || 0}ms`
const shortCwd = cwd => String(cwd || '').split(/[\\/]/).filter(Boolean).at(-1) || '$'

const appendOutput = (terminal, text, type = 'output') => {
  if (!terminal || text == null || text === '') return
  terminal.terminalOutput.push({ text: String(text), type, time: nowLabel() })
  if (terminal.terminalOutput.length > 300) terminal.terminalOutput.splice(0, terminal.terminalOutput.length - 300)
  scrollToBottom(terminal.id)
}

const scrollToBottom = terminalId => nextTick(() => {
  const element = document.getElementById(`terminal-output-${terminalId}`)
  if (element) element.scrollTop = element.scrollHeight
})

const workspacePayload = () => ({
  activeTerminalId: activeTerminalId.value,
  splitMode: isSplitMode.value,
  sessions: terminals.value.map(({ runId, status, startedAt, command, historyIndex, ...terminal }) => terminal),
})

const saveWorkspace = async () => {
  if (!hydrated.value) return
  try { await terminalApi.saveWorkspace(workspacePayload()) } catch {}
}

const schedulePersist = () => {
  if (!hydrated.value) return
  clearTimeout(persistTimer)
  persistTimer = setTimeout(saveWorkspace, 350)
}

const loadWorkspace = async () => {
  const [projectData, infoData, workspaceData] = await Promise.all([
    projectsApi.list().catch(() => ({ projects: [] })),
    terminalApi.info().catch(() => null),
    terminalApi.workspace().catch(() => ({ workspace: null })),
  ])
  projects.value = projectData.projects || []
  systemInfo.value = infoData?.success ? infoData : null
  const saved = workspaceData?.workspace
  terminals.value = (saved?.sessions || []).map((session, index) => ({
    ...createTerminal(index + 1),
    ...session,
    command: '', historyIndex: -1, status: 'idle', runId: '', startedAt: 0,
    currentCwd: session.currentCwd || infoData?.home || '',
  }))
  if (!terminals.value.length) {
    const terminal = createTerminal(1)
    terminal.currentCwd = infoData?.home || ''
    terminal.terminalOutput = [
      { text: `${infoData?.shell || 'shell'} · ${infoData?.user || 'user'}`, type: 'system', time: nowLabel() },
      { text: terminal.currentCwd, type: 'system', time: nowLabel() },
    ]
    terminals.value = [terminal]
  }
  activeTerminalId.value = terminals.value.some(item => item.id === saved?.activeTerminalId) ? saved.activeTerminalId : terminals.value[0].id
  isSplitMode.value = saved?.splitMode === true && terminals.value.length > 1
  hydrated.value = true
}

const handleStreamEvent = (terminal, payload) => {
  if (payload.type === 'started') {
    terminal.runId = payload.runId
    terminal.status = 'running'
    terminal.startedAt = Date.now()
  } else if (payload.type === 'stdout') appendOutput(terminal, payload.text, 'output')
  else if (payload.type === 'stderr') appendOutput(terminal, payload.text, 'error')
  else if (payload.type === 'done') {
    terminal.runId = ''
    terminal.currentCwd = payload.cwd || terminal.currentCwd
    terminal.lastExitCode = Number(payload.exitCode)
    terminal.lastDurationMs = Number(payload.durationMs || 0)
    terminal.status = payload.stopped ? 'stopped' : payload.exitCode === 0 ? 'success' : 'failed'
    appendOutput(terminal, payload.stopped ? `已停止 · ${formatDuration(terminal.lastDurationMs)}` : `退出码 ${payload.exitCode} · ${formatDuration(terminal.lastDurationMs)}`, payload.exitCode === 0 ? 'system' : 'error')
  }
}

const parseSseEvent = (terminal, eventText) => {
  const data = eventText.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')
  if (!data) return
  try { handleStreamEvent(terminal, JSON.parse(data)) } catch {}
}

const executeCommand = async (terminal = activeTerminal.value, options = {}) => {
  if (!terminal || terminal.status === 'running') return
  const command = terminal.command.trim()
  if (!command) return
  if ((options.risky || riskyCommand(command)) && !await confirmDialog(`确定执行高风险命令？\n\n${command}`)) return

  terminal.command = ''
  if (terminal.history.at(-1) !== command) terminal.history.push(command)
  if (terminal.history.length > 200) terminal.history.splice(0, terminal.history.length - 200)
  terminal.historyIndex = -1
  if (/^(clear|cls)$/i.test(command)) {
    terminal.terminalOutput = []
    schedulePersist()
    return
  }
  appendOutput(terminal, `${shortCwd(terminal.currentCwd)}> ${command}`, 'command')
  terminal.status = 'running'
  terminal.startedAt = Date.now()

  try {
    const response = await fetch('/api/terminal/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, cwd: terminal.currentCwd, sessionId: terminal.id }),
    })
    if (!response.ok || !response.body) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || `HTTP ${response.status}`)
    }
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split(/\r?\n\r?\n/)
      buffer = events.pop() || ''
      events.forEach(event => parseSseEvent(terminal, event))
    }
    buffer += decoder.decode()
    if (buffer.trim()) parseSseEvent(terminal, buffer)
  } catch (error) {
    terminal.status = 'failed'
    terminal.runId = ''
    terminal.lastExitCode = 1
    terminal.lastDurationMs = Date.now() - terminal.startedAt
    appendOutput(terminal, error.message || '命令执行失败', 'error')
  } finally {
    if (terminal.status === 'running') terminal.status = 'failed'
    schedulePersist()
  }
}

const stopCommand = async terminal => {
  if (!terminal?.runId) return
  try { await terminalApi.stop(terminal.runId) } catch (error) { toast.warning(error.message || '停止请求未生效') }
}

const addTerminal = () => {
  if (terminals.value.length >= 4) return toast.info('最多保留 4 个终端会话')
  const terminal = createTerminal(terminals.value.length + 1)
  terminal.currentCwd = activeTerminal.value?.currentCwd || systemInfo.value?.home || ''
  terminal.terminalOutput.push({ text: `新会话 · ${terminal.currentCwd}`, type: 'system', time: nowLabel() })
  terminals.value.push(terminal)
  activeTerminalId.value = terminal.id
  if (terminals.value.length === 2) isSplitMode.value = true
}

const closeTerminal = async terminal => {
  if (terminals.value.length === 1) return toast.info('至少保留一个终端会话')
  if (terminal.status === 'running' && !await confirmDialog('这个终端仍在运行命令，确定停止并关闭？')) return
  if (terminal.runId) await stopCommand(terminal)
  const index = terminals.value.findIndex(item => item.id === terminal.id)
  terminals.value.splice(index, 1)
  if (activeTerminalId.value === terminal.id) activeTerminalId.value = terminals.value[Math.max(0, index - 1)]?.id || terminals.value[0].id
  if (terminals.value.length < 2) isSplitMode.value = false
}

const toggleSplit = () => {
  if (!isSplitMode.value && terminals.value.length < 2) addTerminal()
  else isSplitMode.value = !isSplitMode.value
}

const switchProject = terminal => {
  const project = projects.value.find(item => item.name === terminal.selectedProject)
  terminal.currentCwd = project?.work_dir || systemInfo.value?.home || terminal.currentCwd
  appendOutput(terminal, terminal.currentCwd, 'system')
}

const resetTerminal = terminal => {
  terminal.terminalOutput = []
  terminal.command = ''
  terminal.currentCwd = systemInfo.value?.home || ''
  terminal.selectedProject = ''
  terminal.lastExitCode = null
  terminal.lastDurationMs = 0
  terminal.status = 'idle'
  appendOutput(terminal, `已重置 · ${terminal.currentCwd}`, 'system')
}

const runPreset = async preset => {
  if (!activeTerminal.value || activeRunning.value) return
  activeTerminal.value.command = preset.command
  await executeCommand(activeTerminal.value, { risky: preset.risky })
}

const handleKeydown = (event, terminal) => {
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (terminal.historyIndex < terminal.history.length - 1) terminal.historyIndex += 1
    terminal.command = terminal.history[terminal.history.length - 1 - terminal.historyIndex] || terminal.command
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    terminal.historyIndex = Math.max(-1, terminal.historyIndex - 1)
    terminal.command = terminal.historyIndex < 0 ? '' : terminal.history[terminal.history.length - 1 - terminal.historyIndex] || ''
  }
}

const filteredOutput = terminal => {
  const query = logFilter.value.trim().toLowerCase()
  return query ? terminal.terminalOutput.filter(line => line.text.toLowerCase().includes(query)) : terminal.terminalOutput
}

const lineClass = line => {
  const text = line.text.toLowerCase()
  if (line.type !== 'output') return line.type
  if (/error|failed|exception|失败|错误/.test(text)) return 'output error'
  if (/warning|warn|警告/.test(text)) return 'output warning'
  if (/success|passed|done|通过|成功/.test(text)) return 'output success'
  return 'output'
}

const statusLabel = terminal => ({ idle: '就绪', running: '运行中', success: '已完成', failed: '失败', stopped: '已停止' }[terminal.status] || terminal.status)
const selectHistory = command => {
  if (!activeTerminal.value) return
  activeTerminal.value.command = command
  showHistoryDrawer.value = false
  nextTick(() => document.querySelector('.terminal-pane.active .terminal-input')?.focus())
}

const copyOutput = async terminal => {
  await navigator.clipboard.writeText(terminal.terminalOutput.map(line => line.text).join('\n'))
  toast.success('终端输出已复制')
}

const downloadOutput = terminal => {
  const blob = new Blob([terminal.terminalOutput.map(line => `[${line.time}] ${line.text}`).join('\n')], { type: 'text/plain;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${terminal.name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.log`
  link.click()
  URL.revokeObjectURL(link.href)
}

watch([terminals, activeTerminalId, isSplitMode], schedulePersist, { deep: true })
onMounted(loadWorkspace)
onUnmounted(() => { clearTimeout(persistTimer); void saveWorkspace() })
</script>

<template>
  <section class="terminal-workbench">
    <header class="terminal-toolbar">
      <div class="toolbar-main">
        <div class="page-title"><SquareTerminal :size="18" /><strong>内置终端</strong></div>
        <div class="session-tabs" role="tablist" aria-label="终端会话">
          <button v-for="terminal in terminals" :key="terminal.id" type="button" :class="['session-tab', { active: terminal.id === activeTerminalId }]" @click="activeTerminalId = terminal.id">
            <span :class="['status-dot', terminal.status]"></span>
            <span>{{ terminal.name }}</span>
            <X v-if="terminals.length > 1" :size="13" class="tab-close" @click.stop="closeTerminal(terminal)" />
          </button>
          <button class="icon-button" type="button" title="新建终端" @click="addTerminal"><Plus :size="16" /></button>
        </div>
      </div>
      <div class="toolbar-actions">
        <label class="filter-control"><Search :size="15" /><input v-model="logFilter" placeholder="过滤输出" /></label>
        <button class="icon-button" type="button" :class="{ active: isSplitMode }" title="切换分屏" @click="toggleSplit"><Columns2 :size="17" /></button>
        <button class="icon-button" type="button" title="命令历史" @click="showHistoryDrawer = true"><History :size="17" /></button>
        <button class="icon-button" type="button" title="清屏" :disabled="!activeTerminal" @click="activeTerminal.terminalOutput = []"><Trash2 :size="17" /></button>
        <button class="icon-button" type="button" title="重置当前终端" :disabled="!activeTerminal || activeRunning" @click="resetTerminal(activeTerminal)"><RotateCcw :size="17" /></button>
      </div>
    </header>

    <div class="terminal-main">
      <aside class="preset-panel">
        <div class="panel-heading"><ListTree :size="15" /><span>快捷命令</span></div>
        <div class="preset-list">
          <button v-for="preset in presets" :key="preset.command" type="button" :class="['preset-button', preset.tone]" :disabled="activeRunning" @click="runPreset(preset)">
            <span>{{ preset.label }}</span><code>{{ preset.command }}</code>
          </button>
        </div>
      </aside>

      <div :class="['terminal-grid', { split: isSplitMode }]">
        <article v-for="terminal in visibleTerminals" :key="terminal.id" :class="['terminal-pane', { active: terminal.id === activeTerminalId }]" @click="activeTerminalId = terminal.id">
          <header class="pane-header">
            <div class="pane-context">
              <FolderGit2 :size="15" />
              <select v-model="terminal.selectedProject" :disabled="terminal.status === 'running'" @change="switchProject(terminal)">
                <option value="">主目录</option>
                <option v-for="project in projects" :key="project.name" :value="project.name">{{ project.name }}</option>
              </select>
              <span class="cwd" :title="terminal.currentCwd">{{ terminal.currentCwd }}</span>
            </div>
            <div class="pane-meta">
              <span :class="['run-status', terminal.status]">{{ statusLabel(terminal) }}</span>
              <span v-if="terminal.lastExitCode !== null">exit {{ terminal.lastExitCode }}</span>
              <span v-if="terminal.lastDurationMs">{{ formatDuration(terminal.lastDurationMs) }}</span>
              <button class="pane-icon" type="button" title="复制输出" @click.stop="copyOutput(terminal)"><Copy :size="14" /></button>
              <button class="pane-icon" type="button" title="下载日志" @click.stop="downloadOutput(terminal)"><Download :size="14" /></button>
            </div>
          </header>

          <div :id="`terminal-output-${terminal.id}`" class="terminal-output" aria-live="polite">
            <div v-if="filteredOutput(terminal).length === 0" class="output-empty">{{ logFilter ? '没有匹配的输出' : '等待命令' }}</div>
            <div v-for="(line, index) in filteredOutput(terminal)" :key="`${index}-${line.time}`" :class="['terminal-line', lineClass(line)]">
              <span class="line-time">{{ line.time }}</span><pre>{{ line.text }}</pre>
            </div>
          </div>

          <form class="terminal-input-bar" @submit.prevent="executeCommand(terminal)">
            <span class="prompt" :title="terminal.currentCwd">{{ shortCwd(terminal.currentCwd) }}&gt;</span>
            <input v-model="terminal.command" class="terminal-input" :disabled="terminal.status === 'running'" autocomplete="off" spellcheck="false" placeholder="输入命令" @keydown="handleKeydown($event, terminal)" />
            <button v-if="terminal.status === 'running'" class="stop-button" type="button" title="停止命令" @click="stopCommand(terminal)"><Square :size="15" />停止</button>
            <button v-else class="run-button" type="submit" :disabled="!terminal.command.trim()">运行</button>
          </form>
        </article>
      </div>
    </div>

    <div v-if="showHistoryDrawer" class="drawer-overlay" @click.self="showHistoryDrawer = false">
      <aside class="history-drawer">
        <header><div><History :size="17" /><strong>命令历史</strong></div><button class="icon-button" type="button" title="关闭" @click="showHistoryDrawer = false"><X :size="17" /></button></header>
        <label class="drawer-search"><Search :size="15" /><input v-model="historySearch" autofocus placeholder="搜索历史命令" /></label>
        <div class="history-list">
          <button v-for="command in filteredHistory" :key="command" type="button" @click="selectHistory(command)"><code>{{ command }}</code></button>
          <div v-if="filteredHistory.length === 0" class="history-empty">暂无历史命令</div>
        </div>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.terminal-workbench { height:100%; min-height:0; display:flex; flex-direction:column; overflow:hidden; background:var(--bg-primary,#f8fafc); color:var(--text-primary,#0f172a); }
.terminal-toolbar { min-height:58px; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:8px 14px; border-bottom:1px solid var(--border-color,#e2e8f0); background:var(--bg-secondary,#fff); }
.toolbar-main,.toolbar-actions,.page-title,.session-tabs,.filter-control,.pane-context,.pane-meta,.panel-heading,.history-drawer header>div { display:flex; align-items:center; }
.toolbar-main { min-width:0; gap:16px; }.page-title { flex:0 0 auto; gap:7px; font-size:14px; }.session-tabs { min-width:0; gap:5px; overflow-x:auto; }
.session-tab { height:34px; max-width:180px; display:flex; align-items:center; gap:7px; padding:0 9px; border:1px solid transparent; border-radius:7px; background:transparent; color:var(--text-secondary,#475569); cursor:pointer; white-space:nowrap; }
.session-tab>span:nth-child(2) { overflow:hidden; text-overflow:ellipsis; }.session-tab.active { border-color:#bfdbfe; background:#eff6ff; color:#1d4ed8; }.tab-close { flex:0 0 auto; opacity:.58; }.tab-close:hover { opacity:1; }
.status-dot { width:7px; height:7px; flex:0 0 auto; border-radius:50%; background:#94a3b8; }.status-dot.running { background:#2563eb; box-shadow:0 0 0 3px rgba(37,99,235,.13); animation:pulse 1.2s infinite; }.status-dot.success { background:#16a34a; }.status-dot.failed { background:#dc2626; }.status-dot.stopped { background:#f59e0b; }
.toolbar-actions { flex:0 0 auto; gap:6px; }.icon-button,.pane-icon { display:inline-flex; align-items:center; justify-content:center; border:1px solid var(--border-color,#dbe3ee); background:var(--bg-secondary,#fff); color:var(--text-secondary,#475569); cursor:pointer; }.icon-button { width:34px; height:34px; border-radius:7px; }.icon-button:hover,.icon-button.active { border-color:#93c5fd; color:#1d4ed8; background:#eff6ff; }.icon-button:disabled { opacity:.45; cursor:not-allowed; }
.filter-control { width:190px; height:34px; gap:6px; padding:0 9px; border:1px solid var(--border-color,#dbe3ee); border-radius:7px; background:var(--bg-primary,#f8fafc); color:var(--text-muted,#64748b); }.filter-control input,.drawer-search input { min-width:0; flex:1; border:0; outline:0; background:transparent; color:inherit; }
.terminal-main { min-height:0; flex:1; display:grid; grid-template-columns:190px minmax(0,1fr); overflow:hidden; }.preset-panel { min-height:0; padding:12px; border-right:1px solid var(--border-color,#e2e8f0); background:var(--bg-secondary,#fff); overflow-y:auto; }.panel-heading { gap:7px; margin-bottom:10px; color:var(--text-secondary,#475569); font-size:12px; font-weight:800; }.preset-list { display:grid; gap:6px; }
.preset-button { min-width:0; display:grid; gap:2px; padding:8px 9px; border:1px solid var(--border-color,#e2e8f0); border-left:3px solid #94a3b8; border-radius:6px; background:var(--bg-primary,#f8fafc); color:var(--text-primary,#1e293b); text-align:left; cursor:pointer; }.preset-button span { font-size:12px; font-weight:750; }.preset-button code { overflow:hidden; color:var(--text-muted,#64748b); font-size:10px; text-overflow:ellipsis; white-space:nowrap; }.preset-button.info { border-left-color:#2563eb; }.preset-button.success { border-left-color:#16a34a; }.preset-button.danger { border-left-color:#dc2626; }.preset-button:hover { border-color:#93c5fd; }.preset-button:disabled { opacity:.48; cursor:not-allowed; }
.terminal-grid { min-width:0; min-height:0; display:grid; grid-template-columns:minmax(0,1fr); gap:10px; padding:10px; overflow:hidden; }.terminal-grid.split { grid-template-columns:repeat(2,minmax(0,1fr)); }.terminal-pane { min-width:0; min-height:0; display:grid; grid-template-rows:auto minmax(0,1fr) auto; overflow:hidden; border:1px solid #263244; border-radius:7px; background:#10151d; box-shadow:0 5px 18px rgba(15,23,42,.1); }.terminal-pane.active { border-color:#3b82f6; }
.pane-header { min-width:0; min-height:42px; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:6px 9px; border-bottom:1px solid #263244; background:#181f2a; }.pane-context { min-width:0; flex:1; gap:7px; color:#94a3b8; }.pane-context select { max-width:130px; height:28px; border:1px solid #334155; border-radius:5px; background:#10151d; color:#d7e0ea; font-size:11px; }.cwd { min-width:0; overflow:hidden; color:#8fa0b4; font:10.5px Consolas,monospace; text-overflow:ellipsis; white-space:nowrap; }.pane-meta { flex:0 0 auto; gap:7px; color:#8fa0b4; font-size:10.5px; }.run-status { font-weight:800; }.run-status.running { color:#60a5fa; }.run-status.success { color:#4ade80; }.run-status.failed { color:#f87171; }.run-status.stopped { color:#fbbf24; }.pane-icon { width:26px; height:26px; border-color:#334155; border-radius:5px; background:#10151d; color:#94a3b8; }.pane-icon:hover { color:#fff; border-color:#64748b; }
.terminal-output { min-height:0; overflow:auto; padding:11px 12px; color:#d7e0ea; font:12px/1.55 Consolas,'JetBrains Mono',monospace; }.terminal-line { display:grid; grid-template-columns:58px minmax(0,1fr); gap:8px; align-items:start; }.terminal-line+.terminal-line { margin-top:3px; }.line-time { color:#526176; font-size:9.5px; line-height:1.95; }.terminal-line pre { min-width:0; margin:0; white-space:pre-wrap; overflow-wrap:anywhere; font:inherit; }.terminal-line.command pre { color:#7dd3fc; }.terminal-line.error pre { color:#fca5a5; }.terminal-line.warning pre { color:#fcd34d; }.terminal-line.success pre { color:#86efac; }.terminal-line.system pre { color:#c4b5fd; }.output-empty { height:100%; display:grid; place-items:center; color:#526176; font-size:12px; }
.terminal-input-bar { min-width:0; display:flex; align-items:center; gap:8px; min-height:44px; padding:7px 9px; border-top:1px solid #263244; background:#181f2a; }.prompt { max-width:120px; overflow:hidden; color:#67e8f9; font:11.5px Consolas,monospace; text-overflow:ellipsis; white-space:nowrap; }.terminal-input { min-width:0; flex:1; border:0; outline:0; background:transparent; color:#f8fafc; font:12px Consolas,monospace; }.terminal-input:disabled { opacity:.55; }.run-button,.stop-button { min-width:58px; height:30px; display:inline-flex; align-items:center; justify-content:center; gap:5px; border:1px solid transparent; border-radius:6px; cursor:pointer; font-size:11px; font-weight:800; }.run-button { background:#2563eb; color:#fff; }.run-button:disabled { opacity:.4; cursor:not-allowed; }.stop-button { border-color:#ef4444; background:#29181b; color:#fca5a5; }
.drawer-overlay { position:fixed; inset:0; z-index:10002; display:flex; justify-content:flex-end; background:rgba(15,23,42,.28); }.history-drawer { width:min(390px,100%); height:100%; display:flex; flex-direction:column; border-left:1px solid var(--border-color,#e2e8f0); background:var(--bg-secondary,#fff); box-shadow:-12px 0 30px rgba(15,23,42,.12); }.history-drawer header { min-height:58px; display:flex; align-items:center; justify-content:space-between; padding:0 14px; border-bottom:1px solid var(--border-color,#e2e8f0); }.history-drawer header>div { gap:8px; }.drawer-search { height:38px; display:flex; align-items:center; gap:7px; margin:12px; padding:0 10px; border:1px solid var(--border-color,#e2e8f0); border-radius:7px; color:var(--text-muted,#64748b); }.history-list { min-height:0; display:grid; align-content:start; gap:5px; padding:0 12px 12px; overflow:auto; }.history-list button { min-width:0; padding:9px 10px; border:1px solid var(--border-color,#e2e8f0); border-radius:6px; background:var(--bg-primary,#f8fafc); color:var(--text-primary,#1e293b); text-align:left; cursor:pointer; }.history-list code { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.history-empty { padding:32px; color:var(--text-muted,#64748b); text-align:center; }
@keyframes pulse { 50% { opacity:.45; } }
@media (max-width:900px) { .terminal-toolbar { align-items:flex-start; flex-direction:column; }.toolbar-main,.toolbar-actions { width:100%; }.toolbar-main { align-items:flex-start; flex-direction:column; gap:7px; }.toolbar-actions { overflow-x:auto; }.filter-control { flex:1; width:auto; min-width:140px; }.terminal-main { grid-template-columns:minmax(0,1fr); grid-template-rows:auto minmax(0,1fr); }.preset-panel { padding:8px 10px; border-right:0; border-bottom:1px solid var(--border-color,#e2e8f0); overflow-x:auto; }.panel-heading { margin-bottom:6px; }.preset-list { display:flex; }.preset-button { width:126px; flex:0 0 126px; }.terminal-grid.split { grid-template-columns:minmax(0,1fr); grid-template-rows:repeat(2,minmax(260px,1fr)); overflow-y:auto; }.terminal-grid.split .terminal-pane { min-height:260px; } }
@media (max-width:520px) { .terminal-toolbar { padding:8px; }.page-title { display:none; }.session-tabs { width:100%; }.session-tab { max-width:145px; }.terminal-grid { padding:6px; }.pane-header { align-items:flex-start; flex-direction:column; }.pane-context,.pane-meta { width:100%; }.pane-meta { justify-content:flex-end; }.cwd { flex:1; }.terminal-line { grid-template-columns:minmax(0,1fr); }.line-time { display:none; }.prompt { max-width:74px; } }
:global([data-theme='dark'] .terminal-workbench),:global([data-theme='dark'] .terminal-toolbar),:global([data-theme='dark'] .preset-panel),:global([data-theme='dark'] .history-drawer) { background:#0b1017; color:#e2e8f0; }
</style>
