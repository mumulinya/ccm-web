<script setup>
import { ref, onMounted, nextTick, computed } from 'vue'
import { terminalApi, projectsApi } from '../../api/index.js'

const projects = ref([])
const systemInfo = ref(null)

// 终端多窗口状态
const terminals = ref([
  {
    id: 1,
    name: '终端会话 1',
    selectedProject: '',
    terminalOutput: [],
    command: '',
    history: [],
    historyIndex: -1,
    currentCwd: ''
  }
])
const activeTerminalId = ref(1)
const isSplitMode = ref(false)

// 过滤和搜索抽屉状态
const logFilter = ref('')
const showHistoryDrawer = ref(false)
const historySearch = ref('')

const loadProjects = async () => {
  const data = await projectsApi.list()
  projects.value = data.projects || []
}

const getActiveTerminal = () => {
  return terminals.value.find(t => t.id === activeTerminalId.value) || terminals.value[0]
}

const loadSystemInfo = async () => {
  const data = await terminalApi.info()
  if (data.success) {
    systemInfo.value = data
    terminals.value.forEach(t => {
      if (!t.currentCwd) {
        t.currentCwd = data.home
      }
    })
    appendOutputToActive(`[系统: ${data.platform} | 用户: ${data.user} | Shell: ${data.shell}]`, 'system')
    appendOutputToActive(`[工作目录: ${data.home}]`, 'system')
    appendOutputToActive('', 'system')
  }
}

const appendOutputToActive = (text, type = 'output') => {
  const term = getActiveTerminal()
  term.terminalOutput.push({ text, type, time: new Date().toLocaleTimeString() })
  scrollToBottom(term.id)
}

const scrollToBottom = (termId) => {
  nextTick(() => {
    const el = document.getElementById(`terminal-output-${termId}`)
    if (el) el.scrollTop = el.scrollHeight
  })
}

const executeCommand = async () => {
  const term = getActiveTerminal()
  const cmd = term.command.trim()
  if (!cmd) return

  term.command = ''
  // 避免连续重复指令
  if (term.history[term.history.length - 1] !== cmd) {
    term.history.push(cmd)
  }
  term.historyIndex = -1

  term.terminalOutput.push({ text: `$ ${cmd}`, type: 'command', time: new Date().toLocaleTimeString() })
  scrollToBottom(term.id)

  if (cmd === 'clear' || cmd === 'cls') {
    term.terminalOutput = []
    return
  }

  const workDir = term.currentCwd || undefined

  try {
    const res = await terminalApi.exec({ command: cmd, cwd: workDir })
    if (res.cwd) {
      term.currentCwd = res.cwd
    }
    if (res.output) {
      term.terminalOutput.push({ text: res.output, type: 'output', time: new Date().toLocaleTimeString() })
    }
    if (res.error) {
      term.terminalOutput.push({ text: res.error, type: 'error', time: new Date().toLocaleTimeString() })
    }
  } catch (e) {
    term.terminalOutput.push({ text: `错误: ${e.message}`, type: 'error', time: new Date().toLocaleTimeString() })
  }
  scrollToBottom(term.id)
}

const handleKeydown = (e, term) => {
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (term.historyIndex < term.history.length - 1) {
      term.historyIndex++
      term.command = term.history[term.history.length - 1 - term.historyIndex]
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (term.historyIndex > 0) {
      term.historyIndex--
      term.command = term.history[term.history.length - 1 - term.historyIndex]
    } else {
      term.historyIndex = -1
      term.command = ''
    }
  }
}

const clearActiveTerminal = () => {
  const term = getActiveTerminal()
  term.terminalOutput = []
  term.terminalOutput.push({ text: '[已清屏]', type: 'system', time: new Date().toLocaleTimeString() })
}

const resetTerminal = () => {
  const term = getActiveTerminal()
  term.terminalOutput = []
  term.currentCwd = systemInfo.value?.home || ''
  term.selectedProject = ''
  appendOutputToActive('[终端会话已重置]', 'system')
}

// 切换分屏
const toggleSplitScreen = () => {
  if (isSplitMode.value) {
    // 合并为单屏，只留第一个
    terminals.value = [terminals.value[0]]
    activeTerminalId.value = terminals.value[0].id
    isSplitMode.value = false
  } else {
    // 增加分会话
    const newId = Date.now()
    terminals.value.push({
      id: newId,
      name: '终端会话 2',
      selectedProject: '',
      terminalOutput: [
        { text: '[终端会话 2 已启动]', type: 'system', time: new Date().toLocaleTimeString() },
        { text: `[工作目录: ${systemInfo.value?.home || ''}]`, type: 'system', time: new Date().toLocaleTimeString() }
      ],
      command: '',
      history: [],
      historyIndex: -1,
      currentCwd: systemInfo.value?.home || ''
    })
    isSplitMode.value = true
    activeTerminalId.value = newId
  }
}

const switchProject = (term) => {
  if (term.selectedProject) {
    term.currentCwd = term.selectedProject
    term.terminalOutput.push({ text: `[切换到项目目录: ${term.currentCwd}]`, type: 'system', time: new Date().toLocaleTimeString() })
  } else {
    term.currentCwd = systemInfo.value?.home || ''
    term.terminalOutput.push({ text: `[返回工作目录: ${term.currentCwd}]`, type: 'system', time: new Date().toLocaleTimeString() })
  }
  scrollToBottom(term.id)
}

// 一键执行快捷指令
const runPresetCommand = (cmdText) => {
  const term = getActiveTerminal()
  term.command = cmdText
  executeCommand()
}

// 历史记录计算
const filteredHistory = computed(() => {
  const term = getActiveTerminal()
  const allHistory = Array.from(new Set(term.history)).reverse()
  if (!historySearch.value.trim()) return allHistory
  const q = historySearch.value.toLowerCase().trim()
  return allHistory.filter(cmd => cmd.toLowerCase().includes(q))
})

const selectHistory = (cmd) => {
  const term = getActiveTerminal()
  term.command = cmd
  showHistoryDrawer.value = false
  historySearch.value = ''
  nextTick(() => {
    const el = document.querySelector(`.terminal-container.active .terminal-input`)
    if (el) el.focus()
  })
}

// 行过滤输出
const getFilteredOutput = (term) => {
  if (!logFilter.value.trim()) return term.terminalOutput
  const q = logFilter.value.toLowerCase().trim()
  return term.terminalOutput.filter(line => line.text.toLowerCase().includes(q))
}

// 智能行样式配色
const getLineClass = (line) => {
  let cls = line.type
  if (cls === 'output') {
    const text = line.text.toLowerCase()
    if (text.includes('error') || text.includes('failed') || text.includes('exception')) {
      cls += ' output-error'
    } else if (text.includes('warning') || text.includes('warn')) {
      cls += ' output-warning'
    } else if (text.includes('success') || text.includes('ok') || text.includes('successfully') || text.includes('done')) {
      cls += ' output-success'
    } else if (text.includes('info') || text.includes('debug')) {
      cls += ' output-info'
    }
  }
  return cls
}

onMounted(() => {
  loadProjects()
  loadSystemInfo()
})
</script>

<template>
  <div class="terminal">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <span style="font-size:13px;color:var(--text-muted);font-weight:600">🐚 控制台</span>
        <button class="btn btn-outline btn-sm" :class="{ active: isSplitMode }" @click="toggleSplitScreen">
          {{ isSplitMode ? '🖥️ 单屏视图' : '🖥️ 侧边分屏' }}
        </button>
        <button class="btn btn-outline btn-sm" @click="showHistoryDrawer = true">📜 历史指令</button>
        <input v-model="logFilter" class="log-filter-input" placeholder="🔍 实时过滤终端日志..." />
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline btn-sm" @click="clearActiveTerminal">🗑️ 清屏</button>
        <button class="btn btn-primary btn-sm" @click="resetTerminal">↻ 重置</button>
      </div>
    </div>

    <!-- 主工作区 -->
    <div class="main-workspace">
      <!-- 快捷预设指令面板 (Quick Presets) -->
      <div class="presets-panel">
        <div class="presets-header">⚡ 快捷指令</div>
        <div class="presets-list">
          <button class="preset-btn" @click="runPresetCommand('ccm start all')">🟢 启动所有 ccm</button>
          <button class="preset-btn" @click="runPresetCommand('ccm stop all')">🔴 停止所有 ccm</button>
          <button class="preset-btn" @click="runPresetCommand('ccm status')">🔍 运行状态巡检</button>
          <button class="preset-btn" @click="runPresetCommand('git status')">🌿 Git 状态检测</button>
          <button class="preset-btn" @click="runPresetCommand('git log -n 5')">📜 查看提交历史</button>
          <button class="preset-btn" @click="runPresetCommand('node -v')">⚙️ 查看 Node 版本</button>
          <button class="preset-btn" @click="runPresetCommand('dir')">📂 列出工作目录</button>
        </div>
      </div>

      <!-- 终端展示容器 (支持分屏) -->
      <div class="terminals-wrapper" :class="{ 'split-layout': isSplitMode }">
        <div 
          v-for="term in terminals" 
          :key="term.id" 
          class="terminal-container"
          :class="{ active: activeTerminalId === term.id }"
          @click="activeTerminalId = term.id"
        >
          <!-- 终端标题及项目路径选择 -->
          <div class="terminal-container-header">
            <div class="terminal-buttons">
              <span class="dot close"></span>
              <span class="dot minimize"></span>
              <span class="dot expand"></span>
            </div>
            <div class="terminal-project-select">
              <select v-model="term.selectedProject" @change="switchProject(term)" class="mini-select">
                <option value="">绑定工作项目</option>
                <option v-for="p in projects" :key="p.name" :value="p.work_dir">{{ p.name }}</option>
              </select>
            </div>
            <div class="terminal-title">{{ term.name }}</div>
          </div>

          <!-- 终端日志输出 -->
          <div :id="`terminal-output-${term.id}`" class="terminal-output">
            <div v-for="(line, i) in getFilteredOutput(term)" :key="i" :class="['line', getLineClass(line)]">
              <span v-if="line.type === 'output' && getLineClass(line).includes('output-')" class="status-indicator"></span>
              {{ line.text }}
            </div>
          </div>

          <!-- 终端指令输入栏 -->
          <div class="terminal-input-bar">
            <span class="prompt" :title="term.currentCwd">{{ term.currentCwd?.split('\\').pop() || '$' }} ></span>
            <input
              v-model="term.command"
              @keydown="handleKeydown($event, term)"
              @keydown.enter="executeCommand"
              placeholder="输入命令..."
              class="terminal-input"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 历史指令模糊检索侧边抽屉 -->
    <div class="history-drawer-overlay" v-if="showHistoryDrawer" @click.self="showHistoryDrawer = false">
      <div class="history-drawer">
        <div class="drawer-header">
          <h3>📜 历史指令检索</h3>
          <button class="close-btn" @click="showHistoryDrawer = false">&times;</button>
        </div>
        <div class="drawer-search-bar">
          <input v-model="historySearch" placeholder="🔍 检索指令历史..." class="drawer-search-input" />
        </div>
        <div class="drawer-content">
          <div v-if="filteredHistory.length === 0" class="empty-text">无历史执行记录</div>
          <div 
            v-for="(cmd, ci) in filteredHistory" 
            :key="ci" 
            class="history-item"
            @click="selectHistory(cmd)"
          >
            <span class="history-arrow">»</span>
            <span class="history-cmd">{{ cmd }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.terminal { display: flex; flex-direction: column; height: 100%; overflow: hidden; background: transparent; }
.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px; background: rgba(255, 255, 255, 0.25); border-bottom: 1px solid rgba(0, 0, 0, 0.05); flex-wrap: wrap; gap: 12px; }
.log-filter-input { padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(0, 0, 0, 0.08); font-size: 12px; outline: none; background: rgba(255, 255, 255, 0.6); width: 220px; transition: border 0.2s; }
.log-filter-input:focus { border-color: var(--accent-blue); }
[data-theme="dark"] .log-filter-input { background: rgba(0, 0, 0, 0.2); border-color: rgba(255, 255, 255, 0.1); color: var(--text-primary); }

.btn { padding: 8px 16px; border-radius: 10px; border: none; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.btn-primary { background: var(--gradient-blue); color: #ffffff; font-weight: 600; }
.btn-outline { background: transparent; border: 1px solid rgba(0, 0, 0, 0.08); color: var(--text-secondary); }
.btn-outline.active { background: rgba(59, 130, 246, 0.08); border-color: rgba(59, 130, 246, 0.2); color: var(--accent-blue); }
.btn-sm { padding: 5px 10px; font-size: 11.5px; border-radius: 8px; }

/* 页面主工作区左右分栏 */
.main-workspace { flex: 1; display: flex; overflow: hidden; }

/* 左侧快捷按钮面板 */
.presets-panel { width: 200px; background: rgba(255, 255, 255, 0.12); border-right: 1px solid rgba(0, 0, 0, 0.05); display: flex; flex-direction: column; overflow-y: auto; padding: 12px; gap: 10px; }
.presets-header { font-size: 13px; font-weight: 600; color: var(--text-secondary); border-bottom: 1px solid rgba(0, 0, 0, 0.05); padding-bottom: 6px; }
.presets-list { display: flex; flex-direction: column; gap: 8px; }
.preset-btn { background: rgba(255, 255, 255, 0.6); border: 1px solid rgba(0, 0, 0, 0.05); padding: 8px 10px; border-radius: 8px; cursor: pointer; font-size: 11.5px; text-align: left; transition: all 0.2s; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.preset-btn:hover { background: rgba(59, 130, 246, 0.08); border-color: rgba(59, 130, 246, 0.2); transform: translateX(2px); }
[data-theme="dark"] .preset-btn { background: rgba(255, 255, 255, 0.03); color: #cbd5e1; }
[data-theme="dark"] .preset-btn:hover { background: rgba(255, 255, 255, 0.08); }

/* 终端渲染总区域 */
.terminals-wrapper { flex: 1; display: flex; flex-direction: column; padding: 16px; gap: 16px; overflow: hidden; }
.terminals-wrapper.split-layout { display: grid; grid-template-columns: 1fr 1fr; }

/* 单个终端控制容器 */
.terminal-container { flex: 1; display: flex; flex-direction: column; background: var(--code-bg); border-radius: 12px; border: 1px solid var(--border-color); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08); overflow: hidden; transition: border-color 0.2s, box-shadow 0.2s; position: relative; }
.terminal-container.active { border-color: rgba(59, 130, 246, 0.5); box-shadow: 0 8px 24px rgba(59, 130, 246, 0.12), 0 0 10px rgba(59, 130, 246, 0.06); }
.terminal-container-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
.terminal-buttons { display: flex; gap: 6px; width: 60px; }
.terminal-buttons .dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.terminal-buttons .dot.close { background: #f43f5e; opacity: 0.8; }
.terminal-buttons .dot.minimize { background: #fbbf24; opacity: 0.8; }
.terminal-buttons .dot.expand { background: #10b981; opacity: 0.8; }
.terminal-project-select { width: 120px; }
.mini-select { width: 100%; padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(0, 0, 0, 0.2); color: #cbd5e1; font-size: 11px; outline: none; }
.terminal-title { font-size: 11px; color: var(--text-muted); font-family: 'Share Tech Mono', monospace; letter-spacing: 0.8px; text-align: right; width: 80px; }

.terminal-output { flex: 1; padding: 16px; overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; line-height: 1.65; color: #cbd5e1; }
.line { white-space: pre-wrap; word-break: break-all; margin-bottom: 4px; display: flex; align-items: baseline; gap: 6px; }
.line.command { color: var(--accent-blue); text-shadow: 0 0 8px rgba(59, 130, 246, 0.15); }
.line.error { color: var(--accent-red); }
.line.system { color: var(--accent-purple); opacity: 0.8; }

/* 智能等级配色 */
.line.output-error { color: #f43f5e; font-weight: bold; background: rgba(244, 63, 94, 0.04); border-left: 2px solid #f43f5e; padding-left: 4px; }
.line.output-warning { color: #f59e0b; background: rgba(245, 158, 11, 0.04); border-left: 2px solid #f59e0b; padding-left: 4px; }
.line.output-success { color: #10b981; font-weight: bold; background: rgba(16, 185, 129, 0.04); border-left: 2px solid #10b981; padding-left: 4px; }
.line.output-info { color: #3b82f6; opacity: 0.9; }

.status-indicator { width: 6px; height: 6px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
.output-error .status-indicator { background: #f43f5e; box-shadow: 0 0 6px #f43f5e; }
.output-warning .status-indicator { background: #f59e0b; }
.output-success .status-indicator { background: #10b981; box-shadow: 0 0 6px #10b981; }

.terminal-input-bar { display: flex; align-items: center; padding: 10px 16px; border-top: 1px solid rgba(255,255,255,0.03); background: rgba(255, 255, 255, 0.005); }
.prompt { color: var(--accent-blue); font-family: 'JetBrains Mono', monospace; font-size: 12.5px; margin-right: 8px; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex-shrink: 0; }
.terminal-input { flex: 1; background: transparent !important; border: none !important; box-shadow: none !important; color: #f8fafc !important; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; outline: none; padding: 0 !important; }

/* 历史检索侧边抽屉 */
.history-drawer-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.18); backdrop-filter: blur(8px); display: flex; justify-content: flex-end; z-index: 10002; }
.history-drawer { width: 350px; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(25px); border-left: 1px solid rgba(0,0,0,0.06); height: 100%; display: flex; flex-direction: column; box-shadow: -10px 0 30px rgba(0, 0, 0, 0.05); animation: slideIn 0.3s ease-out; }
[data-theme="dark"] .history-drawer { background: rgba(15, 23, 42, 0.85); border-left-color: rgba(255, 255, 255, 0.08); }

@keyframes slideIn {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid rgba(0,0,0,0.05); }
.drawer-header h3 { margin: 0; font-size: 15px; color: var(--text-primary); }
.close-btn { width: 28px; height: 28px; border-radius: 6px; border: 1px solid rgba(0, 0, 0, 0.05); background: rgba(0, 0, 0, 0.02); color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; }
[data-theme="dark"] .close-btn { border-color: rgba(255,255,255,0.08); color: #cbd5e1; }

.drawer-search-bar { padding: 12px 20px; border-bottom: 1px solid rgba(0,0,0,0.04); }
.drawer-search-input { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.08); font-size: 12.5px; outline: none; background: rgba(255,255,255,0.5); }
.drawer-search-input:focus { border-color: var(--accent-blue); }
[data-theme="dark"] .drawer-search-input { background: rgba(0,0,0,0.2); border-color: rgba(255,255,255,0.1); color: var(--text-primary); }

.drawer-content { flex: 1; overflow-y: auto; padding: 12px 20px; display: flex; flex-direction: column; gap: 8px; }
.empty-text { text-align: center; color: var(--text-muted); font-size: 13px; padding-top: 30px; }
.history-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; cursor: pointer; transition: background 0.2s, transform 0.1s; }
.history-item:hover { background: rgba(59, 130, 246, 0.06); transform: translateX(2px); }
.history-arrow { color: var(--accent-blue); font-weight: bold; }
.history-cmd { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
