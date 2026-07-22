<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  Activity, Bot, Braces, ChevronRight, CircleStop, Columns2, Copy, Download,
  FolderGit2, GitBranch, ListTree, PanelRightOpen, Play, Plus, RefreshCw,
  Search, Send, SquareTerminal, Trash2, X,
} from '@lucide/vue'
import { terminalApi, projectsApi, groupsApi } from '../../api/index.js'
import { confirmDialog, toast } from '../../utils/toast.js'
import TerminalEmulatorPane from './terminal/TerminalEmulatorPane.vue'

const emit = defineEmits(['analyze-output'])

const projects = ref([])
const groups = ref([])
const systemInfo = ref(null)
const shells = ref([])
const persistentTerminal = ref({ available: true, mode: 'pty', reason: '' })
const terminals = ref([])
const activeTerminalId = ref('')
const isSplitMode = ref(false)
const isMobile = ref(window.innerWidth <= 768)
const hydrated = ref(false)
const showCommandDrawer = ref(false)
const showProcessDrawer = ref(false)
const showAgentDrawer = ref(false)
const showFindBar = ref(false)
const commandSearch = ref('')
const terminalSearch = ref('')
const fallbackCommand = ref('')
const fallbackOutput = ref('')
const fallbackRunning = ref(false)
const processSessions = ref([])
const projectActions = ref({ scripts: [], repository: null })
const actionsLoading = ref(false)
const paneRefs = new Map()
let persistTimer = null
let processTimer = null

const makeId = () => `pty-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
const createTerminal = (index = terminals.value.length + 1) => ({
  id: makeId(),
  name: `终端 ${index}`,
  selectedProject: '',
  currentCwd: systemInfo.value?.home || '',
  shell: shells.value[0]?.id || '',
  status: 'connecting',
  pid: 0,
  ports: [],
  startedAt: '',
  runtimeVersion: 0,
  _previousProject: '',
  _previousShell: '',
})

const activeTerminal = computed(() => terminals.value.find(item => item.id === activeTerminalId.value) || terminals.value[0] || null)
const visibleTerminals = computed(() => {
  if (isMobile.value || !isSplitMode.value) return activeTerminal.value ? [activeTerminal.value] : []
  const active = activeTerminal.value
  const other = terminals.value.find(item => item.id !== active?.id)
  return [active, other].filter(Boolean)
})
const activeProject = computed(() => projects.value.find(project => project.name === activeTerminal.value?.selectedProject) || null)
const activeRepository = computed(() => projectActions.value.repository || null)
const filteredScripts = computed(() => {
  const query = commandSearch.value.trim().toLowerCase()
  const rows = projectActions.value.scripts || []
  return query ? rows.filter(item => `${item.name} ${item.command}`.toLowerCase().includes(query)) : rows
})
const workspacePayload = () => ({
  activeTerminalId: activeTerminalId.value,
  splitMode: isSplitMode.value,
  sessions: terminals.value.map(terminal => ({
    id: terminal.id,
    name: terminal.name,
    selectedProject: terminal.selectedProject,
    currentCwd: terminal.currentCwd,
    shell: terminal.shell,
    history: [],
    terminalOutput: [],
  })),
})

const pane = terminalId => paneRefs.get(terminalId)
const setPaneRef = (terminalId, instance) => {
  if (instance) paneRefs.set(terminalId, instance)
  else paneRefs.delete(terminalId)
}

const saveWorkspace = async () => {
  if (!hydrated.value) return
  try { await terminalApi.saveWorkspace(workspacePayload()) } catch {}
}
const schedulePersist = () => {
  if (!hydrated.value) return
  clearTimeout(persistTimer)
  persistTimer = setTimeout(saveWorkspace, 300)
}

const loadWorkspace = async () => {
  const [projectData, groupData, infoData, shellData, workspaceData] = await Promise.all([
    projectsApi.list().catch(() => ({ projects: [] })),
    groupsApi.list().catch(() => ({ groups: [] })),
    terminalApi.info().catch(() => null),
    terminalApi.shells().catch(() => ({ shells: [], defaultShell: '' })),
    terminalApi.workspace().catch(() => ({ workspace: null })),
  ])
  projects.value = projectData.projects || []
  groups.value = groupData.groups || groupData || []
  systemInfo.value = infoData?.success ? infoData : null
  shells.value = shellData.shells || []
  persistentTerminal.value = shellData.persistent || { available: true, mode: 'pty', reason: '' }
  const saved = workspaceData?.workspace
  terminals.value = (saved?.sessions || []).map((session, index) => ({
    ...createTerminal(index + 1),
    ...session,
    shell: shells.value.some(shell => shell.id === session.shell) ? session.shell : (shellData.defaultShell || shells.value[0]?.id || ''),
    currentCwd: session.currentCwd || infoData?.home || '',
    status: 'connecting', pid: 0, ports: [], runtimeVersion: 0,
  }))
  if (!terminals.value.length) terminals.value = [createTerminal(1)]
  activeTerminalId.value = terminals.value.some(item => item.id === saved?.activeTerminalId) ? saved.activeTerminalId : terminals.value[0].id
  isSplitMode.value = saved?.splitMode === true && terminals.value.length > 1
  hydrated.value = true
  await refreshProcesses()
  await loadProjectActions()
}

const addTerminal = () => {
  if (terminals.value.length >= 4) return toast.info('最多同时保留 4 个终端会话')
  const terminal = createTerminal(terminals.value.length + 1)
  terminal.currentCwd = activeTerminal.value?.currentCwd || systemInfo.value?.home || ''
  terminal.selectedProject = activeTerminal.value?.selectedProject || ''
  terminal.shell = activeTerminal.value?.shell || shells.value[0]?.id || ''
  terminals.value.push(terminal)
  activeTerminalId.value = terminal.id
  schedulePersist()
  nextTick(() => pane(terminal.id)?.focus())
}

const closeTerminal = async terminal => {
  if (terminals.value.length === 1) return toast.info('至少保留一个终端会话')
  if (!await confirmDialog(`关闭“${terminal.name}”并停止其中运行的进程？`)) return
  await terminalApi.deleteSession(terminal.id).catch(() => {})
  const index = terminals.value.findIndex(item => item.id === terminal.id)
  terminals.value.splice(index, 1)
  if (activeTerminalId.value === terminal.id) activeTerminalId.value = terminals.value[Math.max(0, index - 1)]?.id || terminals.value[0].id
  if (terminals.value.length < 2) isSplitMode.value = false
  schedulePersist()
}

const restartTerminal = async (terminal, { confirm = true } = {}) => {
  if (confirm && !await confirmDialog(`重新启动“${terminal.name}”的 Shell？当前运行进程会停止。`)) return false
  await terminalApi.deleteSession(terminal.id).catch(() => {})
  terminal.status = 'connecting'
  terminal.pid = 0
  terminal.ports = []
  terminal.runtimeVersion += 1
  schedulePersist()
  return true
}

const rememberProject = terminal => { terminal._previousProject = terminal.selectedProject }
const switchProject = async terminal => {
  const previous = terminal._previousProject || ''
  const project = projects.value.find(item => item.name === terminal.selectedProject)
  const nextCwd = project?.work_dir || systemInfo.value?.home || terminal.currentCwd
  if (!await confirmDialog(`切换工作目录并重新启动 Shell？\n\n${nextCwd}`)) {
    terminal.selectedProject = previous
    return
  }
  terminal.currentCwd = nextCwd
  await restartTerminal(terminal, { confirm: false })
  await loadProjectActions()
}

const rememberShell = terminal => { terminal._previousShell = terminal.shell }
const switchShell = async terminal => {
  const previous = terminal._previousShell || shells.value[0]?.id || ''
  if (!await confirmDialog('切换 Shell 会停止当前终端中的运行进程，确定继续？')) {
    terminal.shell = previous
    return
  }
  await restartTerminal(terminal, { confirm: false })
}

const toggleSplit = () => {
  if (isMobile.value) return toast.info('移动端使用单终端视图')
  if (!isSplitMode.value && terminals.value.length < 2) addTerminal()
  isSplitMode.value = !isSplitMode.value
  nextTick(() => visibleTerminals.value.forEach(item => pane(item.id)?.fit()))
}

const updateTerminalStatus = ({ id, status, error }) => {
  const terminal = terminals.value.find(item => item.id === id)
  if (!terminal) return
  terminal.status = status
  if (error) terminal.error = error
}
const updateTerminalReady = state => {
  const terminal = terminals.value.find(item => item.id === state?.id)
  if (!terminal) return
  terminal.status = state.status || 'running'
  terminal.pid = state.pid || 0
  terminal.startedAt = state.startedAt || ''
}
const updateTerminalExit = ({ id }) => updateTerminalStatus({ id, status: 'exited' })

const runFallbackCommand = async (command = fallbackCommand.value) => {
  const value = String(command || '').trim()
  if (!value || fallbackRunning.value) return
  fallbackCommand.value = value
  fallbackRunning.value = true
  fallbackOutput.value = `${fallbackOutput.value}${fallbackOutput.value ? '\n\n' : ''}> ${value}\n`
  try {
    const result = await terminalApi.exec({ command: value, cwd: activeTerminal.value?.currentCwd || systemInfo.value?.home || '' })
    fallbackOutput.value += String(result.output || result.error || '命令执行完成')
    if (result.cwd && activeTerminal.value) activeTerminal.value.currentCwd = result.cwd
  } catch (error) {
    fallbackOutput.value += String(error?.message || '命令执行失败')
  } finally {
    fallbackRunning.value = false
  }
}

const runCommand = (command, terminal = activeTerminal.value) => {
  if (!terminal) return
  if (!persistentTerminal.value.available) {
    void runFallbackCommand(command)
    showCommandDrawer.value = false
    return
  }
  pane(terminal.id)?.runCommand(command)
  showCommandDrawer.value = false
}

const loadProjectActions = async () => {
  const terminal = activeTerminal.value
  if (!terminal?.currentCwd) return
  actionsLoading.value = true
  try { projectActions.value = await terminalApi.projectActions(terminal.currentCwd) }
  catch { projectActions.value = { scripts: [], repository: null } }
  finally { actionsLoading.value = false }
}

const refreshProcesses = async () => {
  try {
    const data = await terminalApi.sessions()
    processSessions.value = data.sessions || []
    for (const state of processSessions.value) {
      const terminal = terminals.value.find(item => item.id === state.id)
      if (terminal) Object.assign(terminal, { status: state.status, pid: state.pid, ports: state.ports || [], startedAt: state.startedAt })
    }
  } catch {}
}

const focusProcess = state => {
  if (!terminals.value.some(item => item.id === state.id)) return
  activeTerminalId.value = state.id
  showProcessDrawer.value = false
  nextTick(() => pane(state.id)?.focus())
}

const stopProcess = async state => {
  const terminal = terminals.value.find(item => item.id === state.id)
  if (!terminal || !await confirmDialog(`停止“${terminal.name}”及其全部子进程？`)) return
  await terminalApi.deleteSession(terminal.id)
  terminal.status = 'exited'
  terminal.pid = 0
  terminal.ports = []
  await refreshProcesses()
}

const openPort = port => window.open(`http://localhost:${port}`, '_blank', 'noopener,noreferrer')

const copyOutput = async terminal => {
  if (await pane(terminal.id)?.copySelection()) return toast.success('已复制选中内容')
  if (await pane(terminal.id)?.copyAll()) toast.success('终端输出已复制')
}

const downloadOutput = terminal => {
  const content = pane(terminal.id)?.getOutput() || ''
  if (!content) return toast.info('当前没有可下载的输出')
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${terminal.name.replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.log`
  link.click()
  URL.revokeObjectURL(link.href)
}

const findNext = (reverse = false) => {
  if (!terminalSearch.value || !activeTerminal.value) return
  const target = pane(activeTerminal.value.id)
  reverse ? target?.findPrevious(terminalSearch.value) : target?.findNext(terminalSearch.value)
}

const analysisPayload = () => {
  const terminal = activeTerminal.value
  if (!terminal) return null
  const emulator = pane(terminal.id)
  const selected = emulator?.getSelection() || ''
  const output = selected || emulator?.getOutput() || ''
  if (!output.trim()) {
    toast.info('请先运行命令或选中需要分析的输出')
    return null
  }
  const body = output.slice(-14_000)
  return {
    project: terminal.selectedProject,
    cwd: terminal.currentCwd,
    draft: `请分析下面的终端${selected ? '选中内容' : '输出'}，定位问题并给出可执行的处理建议。${terminal.selectedProject ? `\n项目：${terminal.selectedProject}` : ''}\n目录：${terminal.currentCwd}\n\n\`\`\`text\n${body}\n\`\`\``,
  }
}

const sendToAgent = (target, extra = {}) => {
  const payload = analysisPayload()
  if (!payload) return
  emit('analyze-output', { target, ...payload, ...extra })
  showAgentDrawer.value = false
}

const statusLabel = status => ({ connecting: '连接中', reconnecting: '重连中', running: '运行中', exited: '已停止', error: '异常' }[status] || status)
const branchLabel = computed(() => activeRepository.value?.branch || '')
const formatAge = value => {
  const elapsed = Date.now() - new Date(value || Date.now()).getTime()
  if (elapsed < 60_000) return `${Math.max(0, Math.round(elapsed / 1000))} 秒`
  if (elapsed < 3_600_000) return `${Math.round(elapsed / 60_000)} 分钟`
  return `${(elapsed / 3_600_000).toFixed(1)} 小时`
}

const handleWindowResize = () => {
  isMobile.value = window.innerWidth <= 768
  if (isMobile.value) isSplitMode.value = false
}
const handleKeyboard = event => {
  if (!(event.ctrlKey || event.metaKey) || !event.shiftKey) return
  const key = event.key.toLowerCase()
  if (key === 't') { event.preventDefault(); addTerminal() }
  else if (key === 'p') { event.preventDefault(); showCommandDrawer.value = true }
  else if (key === 'f') { event.preventDefault(); showFindBar.value = true; nextTick(() => document.querySelector('.terminal-find input')?.focus()) }
}

watch([terminals, activeTerminalId, isSplitMode], schedulePersist, { deep: true })
watch(() => [activeTerminalId.value, activeTerminal.value?.currentCwd], () => { void loadProjectActions() })

onMounted(async () => {
  await loadWorkspace()
  window.addEventListener('resize', handleWindowResize)
  window.addEventListener('keydown', handleKeyboard)
  processTimer = setInterval(refreshProcesses, 5000)
})
onUnmounted(() => {
  clearTimeout(persistTimer)
  clearInterval(processTimer)
  void saveWorkspace()
  window.removeEventListener('resize', handleWindowResize)
  window.removeEventListener('keydown', handleKeyboard)
})
</script>

<template>
  <section class="terminal-workbench">
    <header class="workbench-toolbar">
      <div class="toolbar-identity">
        <span class="title-icon"><SquareTerminal :size="18" /></span>
        <div><strong>终端工作台</strong><small>持久 Shell · 项目运行环境</small></div>
      </div>
      <div class="session-tabs" role="tablist" aria-label="终端会话">
        <button v-for="terminal in terminals" :key="terminal.id" type="button" :class="['session-tab', { active: terminal.id === activeTerminalId }]" @click="activeTerminalId = terminal.id">
          <span :class="['status-dot', terminal.status]"></span>
          <span>{{ terminal.name }}</span>
          <X v-if="terminals.length > 1" :size="12" class="tab-close" @click.stop="closeTerminal(terminal)" />
        </button>
        <button class="icon-button" type="button" title="新建终端" :disabled="!persistentTerminal.available" @click="addTerminal"><Plus :size="16" /></button>
      </div>
      <div class="toolbar-actions">
        <button class="tool-button" type="button" title="搜索终端输出" @click="showFindBar = !showFindBar"><Search :size="15" /><span>查找</span></button>
        <button class="tool-button" type="button" title="项目命令" @click="showCommandDrawer = true"><ListTree :size="15" /><span>命令</span></button>
        <button class="tool-button" type="button" title="运行进程" :disabled="!persistentTerminal.available" @click="showProcessDrawer = true; refreshProcesses()"><Activity :size="15" /><span>进程</span></button>
        <button class="tool-button" type="button" :class="{ active: isSplitMode }" title="切换分屏" :disabled="!persistentTerminal.available" @click="toggleSplit"><Columns2 :size="15" /><span>分屏</span></button>
        <button class="agent-button" type="button" title="把终端输出交给 Agent" @click="showAgentDrawer = true"><Bot :size="15" /><span>交给 Agent</span></button>
      </div>
    </header>

    <div v-if="showFindBar" class="terminal-find">
      <Search :size="14" />
      <input v-model="terminalSearch" autofocus placeholder="搜索当前终端输出" @keydown.enter.prevent="findNext($event.shiftKey)" />
      <button type="button" title="上一个" @click="findNext(true)">↑</button>
      <button type="button" title="下一个" @click="findNext(false)">↓</button>
      <button type="button" title="关闭" @click="showFindBar = false"><X :size="14" /></button>
    </div>

    <div v-if="!persistentTerminal.available" class="terminal-fallback">
      <div class="fallback-notice">
        <SquareTerminal :size="17" />
        <div><strong>当前使用兼容命令终端</strong><span>系统未加载 node-pty。CCM 其他功能正常可用，命令会逐条执行；安装编译工具或匹配的预编译包后可恢复持久 Shell。</span></div>
      </div>
      <pre class="fallback-output">{{ fallbackOutput || '输入命令后，输出会显示在这里。' }}</pre>
      <form class="fallback-composer" @submit.prevent="runFallbackCommand()">
        <span>&gt;</span><input v-model="fallbackCommand" :disabled="fallbackRunning" autocomplete="off" placeholder="输入命令" />
        <button type="submit" :disabled="fallbackRunning || !fallbackCommand.trim()" title="执行命令"><Play :size="15" /></button>
      </form>
    </div>

    <div v-else :class="['terminal-grid', { split: isSplitMode && !isMobile }]">
      <article v-for="terminal in visibleTerminals" :key="`${terminal.id}:${terminal.runtimeVersion}`" :class="['terminal-pane', { active: terminal.id === activeTerminalId }]" @pointerdown="activeTerminalId = terminal.id">
        <header class="pane-context-bar">
          <div class="context-selectors">
            <label title="工作项目"><FolderGit2 :size="14" /><select v-model="terminal.selectedProject" @focus="rememberProject(terminal)" @change="switchProject(terminal)"><option value="">主目录</option><option v-for="project in projects" :key="project.name" :value="project.name">{{ project.name }}</option></select></label>
            <label title="Shell"><SquareTerminal :size="14" /><select v-model="terminal.shell" @focus="rememberShell(terminal)" @change="switchShell(terminal)"><option v-for="shell in shells" :key="shell.id" :value="shell.id">{{ shell.label }}</option></select></label>
            <span v-if="branchLabel && terminal.id === activeTerminalId" class="branch-state"><GitBranch :size="13" />{{ branchLabel }}</span>
          </div>
          <div class="context-path" :title="terminal.currentCwd">{{ terminal.currentCwd }}</div>
          <div class="pane-actions">
            <span :class="['run-state', terminal.status]">{{ statusLabel(terminal.status) }}<template v-if="terminal.pid"> · PID {{ terminal.pid }}</template></span>
            <button type="button" title="复制选中内容或全部输出" @click.stop="copyOutput(terminal)"><Copy :size="14" /></button>
            <button type="button" title="下载终端日志" @click.stop="downloadOutput(terminal)"><Download :size="14" /></button>
            <button type="button" title="重新启动 Shell" @click.stop="restartTerminal(terminal)"><RefreshCw :size="14" /></button>
          </div>
        </header>
        <TerminalEmulatorPane
          :ref="instance => setPaneRef(terminal.id, instance)"
          :session="terminal"
          :active="terminal.id === activeTerminalId"
          @status="updateTerminalStatus"
          @ready="updateTerminalReady"
          @exit="updateTerminalExit"
        />
      </article>
    </div>

    <div v-if="showCommandDrawer || showProcessDrawer || showAgentDrawer" class="drawer-overlay" @click.self="showCommandDrawer = showProcessDrawer = showAgentDrawer = false">
      <aside v-if="showCommandDrawer" class="workbench-drawer command-drawer">
        <header><div><ListTree :size="17" /><strong>项目命令</strong></div><button title="关闭" @click="showCommandDrawer = false"><X :size="17" /></button></header>
        <div class="drawer-context"><strong>{{ activeProject?.name || '主目录' }}</strong><span>{{ activeTerminal?.currentCwd }}</span></div>
        <label class="drawer-search"><Search :size="14" /><input v-model="commandSearch" placeholder="搜索脚本或命令" /></label>
        <section class="command-section">
          <h3>常用操作</h3>
          <button @click="runCommand('git status')"><GitBranch :size="15" /><span><strong>Git 状态</strong><small>git status</small></span><ChevronRight :size="14" /></button>
          <button @click="runCommand('git log -n 10 --oneline')"><Braces :size="15" /><span><strong>最近提交</strong><small>git log -n 10 --oneline</small></span><ChevronRight :size="14" /></button>
        </section>
        <section class="command-section">
          <h3>项目脚本 <span>{{ filteredScripts.length }}</span></h3>
          <div v-if="actionsLoading" class="drawer-empty">正在读取项目脚本</div>
          <button v-for="script in filteredScripts" :key="script.name" @click="runCommand(script.command)"><Play :size="15" /><span><strong>{{ script.name }}</strong><small>{{ script.command }}</small></span><ChevronRight :size="14" /></button>
          <div v-if="!actionsLoading && !filteredScripts.length" class="drawer-empty">当前目录没有可运行的 package scripts</div>
        </section>
      </aside>

      <aside v-if="showProcessDrawer" class="workbench-drawer process-drawer">
        <header><div><Activity :size="17" /><strong>运行进程</strong></div><button title="关闭" @click="showProcessDrawer = false"><X :size="17" /></button></header>
        <div class="drawer-toolbar"><span>{{ processSessions.filter(item => item.status === 'running').length }} 个 Shell 正在运行</span><button @click="refreshProcesses"><RefreshCw :size="14" />刷新</button></div>
        <div class="process-list">
          <article v-for="state in processSessions" :key="state.id" :class="{ selected: state.id === activeTerminalId }">
            <button class="process-main" @click="focusProcess(state)"><span :class="['status-dot', state.status]"></span><span><strong>{{ state.name }}</strong><small>{{ state.shellLabel }} · PID {{ state.pid || '-' }} · {{ formatAge(state.startedAt) }}</small></span></button>
            <div class="process-ports"><button v-for="port in state.ports || []" :key="port" title="在浏览器打开" @click="openPort(port)">localhost:{{ port }}</button><span v-if="!(state.ports || []).length">未检测到监听端口</span></div>
            <button class="stop-process" title="停止进程树" @click="stopProcess(state)"><CircleStop :size="15" />停止</button>
          </article>
          <div v-if="!processSessions.length" class="drawer-empty">当前没有运行中的终端会话</div>
        </div>
      </aside>

      <aside v-if="showAgentDrawer" class="workbench-drawer agent-drawer">
        <header><div><Bot :size="17" /><strong>交给 Agent 分析</strong></div><button title="关闭" @click="showAgentDrawer = false"><X :size="17" /></button></header>
        <p class="drawer-note">优先使用终端中选中的内容；未选择时使用当前终端的近期输出。内容只会填入目标输入框，不会自动发送。</p>
        <section class="agent-targets">
          <button @click="sendToAgent('global')"><Bot :size="17" /><span><strong>全局助手</strong><small>分析系统环境、工具和跨项目问题</small></span><Send :size="14" /></button>
          <button v-if="activeTerminal?.selectedProject" @click="sendToAgent('project')"><FolderGit2 :size="17" /><span><strong>{{ activeTerminal.selectedProject }} 项目 Agent</strong><small>结合当前项目会话继续定位与修改</small></span><Send :size="14" /></button>
          <button v-for="group in groups" :key="group.id || group.name" @click="sendToAgent('group', { groupId: group.id || group.name })"><PanelRightOpen :size="17" /><span><strong>{{ group.name }} 群聊主 Agent</strong><small>交给当前群聊协作链处理</small></span><Send :size="14" /></button>
        </section>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.terminal-workbench { height:100%; min-height:0; display:flex; flex-direction:column; overflow:hidden; background:var(--bg-primary,#f7f9fb); color:var(--text-primary,#16202a); }
.workbench-toolbar { min-height:60px; display:flex; align-items:center; gap:14px; padding:8px 14px; border-bottom:1px solid var(--border-color,#dfe5ea); background:var(--bg-secondary,#fff); }
.toolbar-identity,.toolbar-identity>div,.session-tabs,.toolbar-actions,.context-selectors,.context-selectors label,.branch-state,.pane-actions,.workbench-drawer header>div,.drawer-search,.drawer-toolbar,.command-section button,.agent-targets button { display:flex; align-items:center; }
.toolbar-identity { flex:0 0 auto; gap:8px; }.title-icon { width:32px;height:32px;display:grid;place-items:center;border:1px solid color-mix(in srgb,#0f766e 20%,transparent);border-radius:6px;background:color-mix(in srgb,#0f766e 8%,transparent);color:#0f766e }.toolbar-identity>div { align-items:flex-start; flex-direction:column; gap:1px }.toolbar-identity strong { font-size:13px }.toolbar-identity small { color:var(--text-muted);font-size:9px }
.session-tabs { min-width:0; flex:1; gap:5px; overflow-x:auto; scrollbar-width:none }.session-tab,.icon-button,.tool-button,.agent-button,.pane-actions button,.terminal-find button,.workbench-drawer header>button { border:1px solid transparent;background:transparent;color:var(--text-secondary);cursor:pointer }.session-tab { height:34px;max-width:165px;display:flex;align-items:center;gap:6px;padding:0 8px;border-radius:6px;font-size:11px;white-space:nowrap }.session-tab:hover { background:var(--hover-bg,#f1f5f9) }.session-tab.active { border-color:color-mix(in srgb,#2563eb 24%,transparent);background:color-mix(in srgb,#2563eb 8%,transparent);color:#1d4ed8 }.tab-close { opacity:.55 }.status-dot { width:7px;height:7px;flex:0 0 auto;border-radius:50%;background:#94a3b8 }.status-dot.running { background:#10b981;box-shadow:0 0 0 3px rgba(16,185,129,.1) }.status-dot.connecting,.status-dot.reconnecting { background:#f59e0b }.status-dot.error,.status-dot.exited { background:#ef4444 }
.icon-button { width:32px;height:32px;display:grid;place-items:center;border-radius:6px }.toolbar-actions { flex:0 0 auto;gap:5px }.tool-button,.agent-button { min-height:32px;padding:0 9px;display:inline-flex;align-items:center;justify-content:center;gap:5px;border-color:var(--border-color,#dfe5ea);border-radius:6px;font-size:10px }.tool-button:hover,.tool-button.active { color:#2563eb;background:color-mix(in srgb,#2563eb 6%,transparent) }.agent-button { border-color:color-mix(in srgb,#0f766e 25%,transparent);background:color-mix(in srgb,#0f766e 7%,transparent);color:#0f766e;font-weight:600 }
.terminal-find { min-height:40px;display:flex;align-items:center;justify-content:flex-end;gap:5px;padding:5px 14px;border-bottom:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-muted) }.terminal-find input { width:min(340px,55vw);height:29px;padding:0 8px;border:1px solid var(--border-color);border-radius:5px;background:var(--bg-primary);color:var(--text-primary);outline:0 }.terminal-find button { width:29px;height:29px;display:grid;place-items:center;border-color:var(--border-color);border-radius:5px }
.terminal-fallback { flex:1;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:0;margin:8px;overflow:hidden;border:1px solid #263244;border-radius:7px;background:#0d1420;color:#d7e0ea }.fallback-notice { display:flex;align-items:flex-start;gap:9px;padding:11px 13px;border-bottom:1px solid #263244;background:#111b29;color:#fbbf24 }.fallback-notice>div { min-width:0 }.fallback-notice strong,.fallback-notice span { display:block }.fallback-notice strong { font-size:11px }.fallback-notice span { margin-top:3px;color:#9fb0c0;font-size:9px;line-height:1.5 }.fallback-output { min-height:0;margin:0;padding:14px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;color:#cbd5e1;font:11px/1.65 ui-monospace,Consolas,monospace }.fallback-composer { min-height:46px;display:flex;align-items:center;gap:8px;padding:7px 10px;border-top:1px solid #263244;background:#111b29;color:#5eead4 }.fallback-composer input { min-width:0;flex:1;border:0;outline:0;background:transparent;color:#e2e8f0;font:11px ui-monospace,Consolas,monospace }.fallback-composer button { width:30px;height:30px;display:grid;place-items:center;border:1px solid #304056;border-radius:5px;background:#172235;color:#7dd3fc;cursor:pointer }.fallback-composer button:disabled,.toolbar-actions button:disabled,.session-tabs button:disabled { opacity:.42;cursor:not-allowed }
.terminal-grid { flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr);gap:8px;padding:8px;background:var(--bg-primary) }.terminal-grid.split { grid-template-columns:repeat(2,minmax(0,1fr)) }.terminal-pane { min-width:0;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr);overflow:hidden;border:1px solid #263244;border-radius:7px;background:#0d1420;box-shadow:0 1px 2px rgba(15,23,42,.08) }.terminal-pane.active { border-color:#3b82f6;box-shadow:0 0 0 1px rgba(59,130,246,.16) }
.pane-context-bar { min-height:44px;display:grid;grid-template-columns:auto minmax(80px,1fr) auto;align-items:center;gap:10px;padding:6px 9px;border-bottom:1px solid #263244;background:#111b29;color:#aebdca }.context-selectors { gap:6px }.context-selectors label { height:30px;gap:5px;padding:0 7px;border:1px solid #304056;border-radius:5px;color:#7dd3fc }.context-selectors select { max-width:150px;border:0;outline:0;background:transparent;color:#d7e0ea;font-size:10px }.context-selectors option { color:#0f172a }.branch-state { max-width:130px;gap:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#5eead4;font-size:9px }.context-path { overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#7890a4;font:10px ui-monospace,Consolas,monospace }.pane-actions { justify-content:flex-end;gap:4px }.run-state { margin-right:3px;color:#94a3b8;font-size:9px;white-space:nowrap }.run-state.running { color:#6ee7b7 }.run-state.error,.run-state.exited { color:#fda4af }.pane-actions button { width:28px;height:28px;display:grid;place-items:center;border-radius:5px;color:#94a3b8 }.pane-actions button:hover { background:#1e293b;color:#e2e8f0 }
.drawer-overlay { position:fixed;inset:0;z-index:10080;display:flex;justify-content:flex-end;background:rgba(15,23,42,.26);backdrop-filter:blur(2px) }.workbench-drawer { width:min(420px,94vw);height:100%;display:flex;flex-direction:column;overflow:hidden;border-left:1px solid var(--border-color);background:var(--bg-secondary,#fff);box-shadow:-16px 0 38px rgba(15,23,42,.12) }.workbench-drawer>header { min-height:58px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid var(--border-color) }.workbench-drawer header>div { gap:7px }.workbench-drawer header>button { width:32px;height:32px;display:grid;place-items:center;border-radius:5px }.drawer-context { padding:11px 16px;border-bottom:1px solid var(--border-color) }.drawer-context strong,.drawer-context span { display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap }.drawer-context strong { font-size:12px }.drawer-context span { margin-top:3px;color:var(--text-muted);font:9px ui-monospace,monospace }.drawer-search { height:36px;margin:12px 16px 4px;padding:0 9px;gap:6px;border:1px solid var(--border-color);border-radius:6px;color:var(--text-muted) }.drawer-search input { min-width:0;flex:1;border:0;outline:0;background:transparent;color:var(--text-primary);font-size:11px }
.command-section { padding:10px 16px }.command-section h3 { margin:0 0 7px;color:var(--text-muted);font-size:10px;font-weight:600;text-transform:uppercase }.command-section h3 span { margin-left:4px }.command-section button,.agent-targets button { width:100%;min-height:48px;gap:9px;padding:7px 9px;border:0;border-bottom:1px solid var(--border-color);background:transparent;color:var(--text-secondary);text-align:left;cursor:pointer }.command-section button:hover,.agent-targets button:hover { background:var(--hover-bg,#f5f8fa) }.command-section button>span,.agent-targets button>span { min-width:0;flex:1 }.command-section strong,.command-section small,.agent-targets strong,.agent-targets small { display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap }.command-section strong,.agent-targets strong { color:var(--text-primary);font-size:11px }.command-section small,.agent-targets small { margin-top:3px;color:var(--text-muted);font:9px ui-monospace,monospace }.drawer-empty { padding:22px;color:var(--text-muted);font-size:11px;text-align:center }
.drawer-toolbar { justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--border-color);font-size:10px;color:var(--text-muted) }.drawer-toolbar button { display:flex;align-items:center;gap:4px;border:0;background:transparent;color:#2563eb;cursor:pointer }.process-list { overflow:auto;padding:8px 14px }.process-list article { position:relative;padding:10px 38px 10px 8px;border-bottom:1px solid var(--border-color) }.process-list article.selected { background:color-mix(in srgb,#2563eb 5%,transparent) }.process-main { width:100%;display:flex;align-items:center;gap:8px;border:0;background:transparent;text-align:left;cursor:pointer }.process-main>span:nth-child(2) { min-width:0 }.process-main strong,.process-main small { display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap }.process-main strong { color:var(--text-primary);font-size:11px }.process-main small { margin-top:3px;color:var(--text-muted);font-size:9px }.process-ports { display:flex;flex-wrap:wrap;gap:4px;margin:8px 0 0 15px }.process-ports button { padding:3px 6px;border:1px solid color-mix(in srgb,#0f766e 20%,transparent);border-radius:4px;background:color-mix(in srgb,#0f766e 6%,transparent);color:#0f766e;font-size:9px;cursor:pointer }.process-ports span { color:var(--text-muted);font-size:9px }.stop-process { position:absolute;right:7px;top:11px;width:28px;height:28px;display:grid;place-items:center;border:0;border-radius:5px;background:transparent;color:#dc2626;cursor:pointer }.stop-process:hover { background:#fef2f2 }
.drawer-note { margin:0;padding:12px 16px;border-bottom:1px solid var(--border-color);color:var(--text-muted);font-size:10px;line-height:1.6 }.agent-targets { overflow:auto;padding:8px 16px }.agent-targets button { min-height:58px }.agent-targets>button>svg:first-child { color:#0f766e }
@media(max-width:1100px){.toolbar-identity small,.tool-button span{display:none}.workbench-toolbar{gap:8px}.pane-context-bar{grid-template-columns:minmax(0,1fr) auto}.context-path{grid-column:1/-1;grid-row:2}.terminal-grid.split{grid-template-columns:minmax(0,1fr)}.terminal-grid.split .terminal-pane:not(.active){display:none}}
@media(max-width:768px){.terminal-workbench{overflow:auto}.workbench-toolbar{position:sticky;top:0;z-index:8;min-height:auto;align-items:stretch;flex-wrap:wrap;padding:7px 9px}.toolbar-identity{display:none}.session-tabs{order:1;width:100%;flex-basis:100%}.toolbar-actions{order:2;width:100%;display:grid;grid-template-columns:repeat(5,minmax(0,1fr))}.tool-button,.agent-button{min-width:0;padding:0 4px}.agent-button span{display:none}.terminal-grid{flex:none;min-height:650px;padding:6px}.terminal-pane{min-height:640px}.pane-context-bar{grid-template-columns:minmax(0,1fr) auto;gap:6px}.context-selectors{min-width:0;overflow-x:auto}.context-selectors label{flex:0 0 auto}.context-selectors select{max-width:112px}.branch-state{display:none}.run-state{display:none}.context-path{grid-column:1/-1}.terminal-find{position:sticky;top:87px;z-index:7;padding:5px 8px}.terminal-find input{width:100%;flex:1}.workbench-drawer{width:100%;border-left:0}.drawer-overlay{align-items:flex-end}.workbench-drawer{height:min(78vh,720px);border-radius:7px 7px 0 0}}
</style>
