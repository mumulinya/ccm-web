<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed, watch, inject } from 'vue'
import { api, projectsApi, sessionsApi } from '../api/index.js'
import { toast, confirmDialog } from '../utils/toast.js'

const props = defineProps({ navigateTo: { type: Object, default: null } })
const emit = defineEmits(['navigated'])

// 搜索跳转高亮
const highlightMsgIndex = ref(-1)

// 处理搜索结果跳转（延迟执行，确保组件完全就绪）
const handleNavigation = async () => {
  const target = props.navigateTo
  if (!target || target.tab !== 'projects') return
  await nextTick()
  if (target.project) {
    await selectProject(target.project)
    
    // 如果没有会话，则自动创建一个会话以载入输入框
    if (!currentSession.value && sessions.value.length === 0) {
      await createSession()
    }
    
    if (target.autoMessage) {
      await nextTick()
      chatInput.value = target.autoMessage
      await nextTick()
      sendMessage()
    } else if (target.sessionId) {
      await nextTick()
      await selectSession(target.sessionId)
      if (target.keyword) {
        await nextTick()
        const kw = target.keyword.toLowerCase()
        const idx = messages.value.findIndex(m => (m.content || '').toLowerCase().includes(kw))
        if (idx !== -1) {
          highlightMsgIndex.value = idx
          const el = document.getElementById(`msg-${idx}`)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setTimeout(() => { highlightMsgIndex.value = -1 }, 3000)
        }
      }
    }
  }
  emit('navigated')
}

watch(() => props.navigateTo, () => {
  if (props.navigateTo) setTimeout(handleNavigation, 100)
}, { immediate: true })

const scrollToMessage = (idx) => {
  nextTick(() => {
    const el = document.getElementById(`msg-${idx}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })
}

// 数据
const projects = ref([])
const currentProject = ref(null)
const currentSession = ref(null)
const sessions = ref([])
const messages = ref([])
const messagesEl = ref(null)
const isMessagesPinnedToBottom = ref(true)
const chatInput = ref('')
const userMessages = computed(() => {
  return messages.value
    .map((m, idx) => ({ ...m, originalIndex: idx }))
    .filter(m => m.role === 'user')
})

const chatFiles = ref([])
const chatFileInput = ref(null)
const diffViewer = ref({ visible: false, file: null })
const pageInfo = ref('')

const fallbackAgents = [
  { type: 'claudecode', name: 'Claude Code' },
  { type: 'cursor', name: 'Cursor' },
  { type: 'gemini', name: 'Gemini CLI' },
  { type: 'codex', name: 'Codex' },
  { type: 'qoder', name: 'Qoder CLI' }
]
const agentOptions = ref([...fallbackAgents])

const loadAgentOptions = async () => {
  try {
    const data = await api('/api/agents')
    const agents = Array.isArray(data.agents) ? data.agents : []
    agentOptions.value = agents.length ? agents : [...fallbackAgents]
  } catch {
    agentOptions.value = [...fallbackAgents]
  }
}

const messageKeyMap = new WeakMap()
let messageKeySeq = 0
const getMessageKey = (msg) => {
  if (!msg || typeof msg !== 'object') return `empty-${messageKeySeq++}`
  const existing = messageKeyMap.get(msg)
  if (existing) return existing
  const explicit = msg.id || msg.client_message_id
  const key = explicit
    ? `msg-${explicit}`
    : `local-${Date.now().toString(36)}-${messageKeySeq++}`
  messageKeyMap.set(msg, key)
  return key
}

const isNearMessageBottom = () => {
  const el = messagesEl.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight <= 120
}

const updateMessageScrollState = () => {
  isMessagesPinnedToBottom.value = isNearMessageBottom()
}

let messagesResizeObserver = null
const attachMessagesResizeObserver = () => {
  if (!messagesEl.value || messagesResizeObserver || typeof ResizeObserver === 'undefined') return
  messagesResizeObserver = new ResizeObserver(() => {
    if (isMessagesPinnedToBottom.value && messagesEl.value?.clientHeight > 0) {
      scrollToBottom({ force: true })
    }
  })
  messagesResizeObserver.observe(messagesEl.value)
}

// 弹窗状态
const showCreate = ref(false)
const showEdit = ref(false)
const showSwitchAgent = ref(false)
const showTools = ref(false)
const showSharedFiles = ref(false)

const showFeishuQr = ref(false)
const editProject = ref(null)

// 飞书扫码状态
const feishuQrUrl = ref('')
const feishuQrStatus = ref('')
const feishuQrLoading = ref(false)

// 文件夹浏览器
const browsePath = ref('')
const browseItems = ref([])
const browseTarget = ref('')
const drives = ref([])
const showFolderBrowser = ref(false)
// 表单数据
const form = ref({
  name: '',
  work_dir: '',
  agent: 'claudecode',
  platform: 'feishu'
})

// 平台选项
const platforms = [
  { value: 'feishu', label: '飞书', hasQr: true },
  { value: 'lark', label: 'Lark', hasQr: true },
  { value: 'weixin', label: '微信', hasQr: false },
  { value: 'telegram', label: 'Telegram', hasQr: false },
  { value: 'slack', label: 'Slack', hasQr: false },
  { value: 'discord', label: 'Discord', hasQr: false }
]

// 加载项目列表
const loadProjects = async () => {
  const data = await projectsApi.list()
  projects.value = data.projects || []
  pageInfo.value = `${projects.value.length} 个项目 · ${projects.value.filter(p => p.running).length} 个运行中`
  // 自动选择第一个项目
  if (projects.value.length > 0 && !currentProject.value) {
    selectProject(projects.value[0].name)
  }
}

// 全局对话模板分发总线
const activeSelectedTemplate = inject('activeSelectedTemplate', null)
const pendingTemplateToApply = ref(null)

if (activeSelectedTemplate) {
  watch(activeSelectedTemplate, (newVal) => {
    if (newVal && newVal.targetTab === 'projects' && newVal.projectName) {
      if (currentProject.value === newVal.projectName) {
        selectChatTemplate(newVal.template)
        activeSelectedTemplate.value = null
      } else {
        pendingTemplateToApply.value = newVal.template
      }
    }
  })
}

// 选择项目
const selectProject = async (name) => {
  currentProject.value = name
  currentSession.value = null
  await loadSessions(name)
  // 如果会话列表非空，且没有选中会话，则默认选中第一个会话，以便载入单聊输入框
  if (sessions.value.length > 0 && !currentSession.value) {
    await selectSession(sessions.value[0].id)
  }
  // 如果有挂起的待使用模板，在此应用
  if (pendingTemplateToApply.value) {
    selectChatTemplate(pendingTemplateToApply.value)
    pendingTemplateToApply.value = null
    if (activeSelectedTemplate) {
      activeSelectedTemplate.value = null
    }
  }
}

// 加载会话列表
const loadSessions = async (project) => {
  if (!project) return
  const data = await sessionsApi.list(project)
  sessions.value = data.sessions || []
}

// 选择会话
const selectSession = async (sessionId) => {
  currentSession.value = sessionId
  const data = await sessionsApi.detail(currentProject.value, sessionId)
  messages.value = data.history || []
  scrollToBottom({ force: true })
}

// 启动项目
const startProject = async (name) => {
  await projectsApi.start(name)
  setTimeout(loadProjects, 1500)
}

// 停止项目
const stopProject = async (name) => {
  await projectsApi.stop(name)
  setTimeout(loadProjects, 500)
}

// 删除项目
const deleteProject = async (name) => {
  const confirmed = await confirmDialog(`确定删除项目 "${name}"？删除后无法恢复。`)
  if (!confirmed) return
  await projectsApi.delete(name)
  if (currentProject.value === name) {
    currentProject.value = null
    sessions.value = []
    messages.value = []
  }
  loadProjects()
  toast.success('项目已删除')
}

// 显示创建弹窗
const openCreateModal = () => {
  form.value = { name: '', work_dir: '', agent: 'claudecode', platform: 'feishu' }
  showCreate.value = true
}

// 提交创建
const submitCreate = async () => {
  if (!form.value.name || !form.value.work_dir) {
    toast.warning('请填写项目名称和目录')
    return
  }
  const res = await projectsApi.create(form.value)
  if (res.success) {
    showCreate.value = false
    loadProjects()
    toast.success('项目创建成功！')
  } else {
    toast.error('创建失败: ' + (res.error || '未知错误'))
  }
}

// 显示编辑弹窗
const openEditModal = (project) => {
  editProject.value = project
  const platformMap = { '飞书': 'feishu', '微信': 'weixin', 'Lark': 'lark', 'Telegram': 'telegram', 'Slack': 'slack', 'Discord': 'discord' }
  const rawPlatform = project.platform || 'feishu'
  const mappedPlatform = platformMap[rawPlatform] || rawPlatform
  form.value = {
    name: project.name,
    work_dir: project.work_dir || '',
    agent: project.agent || 'claudecode',
    platform: mappedPlatform
  }
  showEdit.value = true
}

// 提交编辑
const submitEdit = async () => {
  const res = await projectsApi.update(form.value)
  if (res.success) {
    showEdit.value = false
    loadProjects()
    toast.success('项目已更新！')
  } else {
    toast.error('更新失败: ' + (res.error || '未知错误'))
  }
}

// 显示切换 Agent 弹窗
const openSwitchAgent = (project) => {
  editProject.value = project
  showSwitchAgent.value = true
}

// 切换 Agent
const switchAgent = async (agentType) => {
  await stopProject(editProject.value.name)
  setTimeout(() => {
    startProject(editProject.value.name, agentType)
    showSwitchAgent.value = false
  }, 1000)
}

// 启动项目（指定 Agent）
const startProjectWithAgent = async (name, agent) => {
  await projectsApi.start(name, agent)
  setTimeout(loadProjects, 1500)
}

// 创建会话
const createSession = async () => {
  if (!currentProject.value) {
    alert('请先选择项目')
    return
  }
  const res = await sessionsApi.create({ project: currentProject.value })
  if (res.success) {
    await loadSessions(currentProject.value)
    selectSession(res.sessionId)
  }
}

// 重命名会话
const renameSession = async (sessionId) => {
  const name = prompt('输入新名称：')
  if (!name) return
  await sessionsApi.rename({ project: currentProject.value, sessionId, name })
  loadSessions(currentProject.value)
}

// 删除会话
const deleteSession = async (sessionId) => {
  if (!confirm('确定删除此会话？')) return
  await sessionsApi.delete({ project: currentProject.value, sessionId })
  if (currentSession.value === sessionId) {
    currentSession.value = null
    messages.value = []
  }
  loadSessions(currentProject.value)
}

const getWorkEvents = (msg) => Array.isArray(msg?.workEvents) ? msg.workEvents.filter(Boolean) : []
const compactWorkText = (value, max = 320) => {
  const text = String(value || '').trim()
  return text.length > max ? `${text.slice(0, max)}...` : text
}
const workEventLabel = (kind) => ({ status: '状态', output: '输出', tool: '工具', done: '完成', error: '错误' }[kind || 'status'] || kind)
const workEventTone = (kind) => {
  if (kind === 'done') return 'ok'
  if (kind === 'error') return 'fail'
  if (kind === 'output') return 'output'
  return 'status'
}

// 发送消息
const isStreaming = ref(false)
const thinkingMessages = ref([]) // 存储思考过程消息

const sendMessage = async () => {
  if ((!chatInput.value.trim() && chatFiles.value.length === 0) || !currentProject.value) return
  const msg = chatInput.value.trim()
  const filesToSend = [...chatFiles.value]
  chatInput.value = ''
  chatFiles.value = []

  const attachmentText = filesToSend.length
    ? `\n\n[附件]\n${filesToSend.map(f => `- ${f.name}（${formatFileSize(f.size)}）`).join('\n')}`
    : ''
  const userMsg = { role: 'user', content: `${msg || '请处理附件'}${attachmentText}`, timestamp: new Date().toISOString() }
  messages.value.push(userMsg)

  // 保存用户消息到会话
  if (currentSession.value) {
    sessionsApi.saveMessage({ project: currentProject.value, sessionId: currentSession.value, message: userMsg }).catch(() => {})
  }

  // 创建思考过程消息
  const thinkingMsg = {
    role: 'thinking',
    content: '',
    timestamp: new Date().toISOString()
  }
  messages.value.push(thinkingMsg)
  scrollToBottom({ force: true })

  // 创建 Agent 回复消息
  const agentMsg = { role: 'assistant', content: '', workEvents: [], timestamp: new Date().toISOString() }

  isStreaming.value = true
  thinkingMessages.value = []

  let res
  if (filesToSend.length > 0) {
    const formData = new FormData()
    formData.append('project', currentProject.value)
    formData.append('message', msg)
    filesToSend.forEach(file => formData.append('files', file))
    res = await fetch('/api/send-stream', { method: 'POST', body: formData })
  } else {
    res = await fetch('/api/send-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: currentProject.value, message: msg })
    })
  }

  if (!res.ok || !res.body) {
    agentMsg.content = `❌ 错误: 发送失败：${res.status}`
    messages.value.push(agentMsg)
    isStreaming.value = false
    const thinkingIdx = messages.value.indexOf(thinkingMsg)
    if (thinkingIdx !== -1) messages.value.splice(thinkingIdx, 1)
    scrollToBottom()
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let agentMsgAdded = false
  let sseBuffer = ''

  const handleSseEvent = (rawEvent) => {
    const dataText = rawEvent
      .split(/\r?\n/)
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trimStart())
      .join('\n')
    if (!dataText) return
    try {
      const data = JSON.parse(dataText)
      if (data.type === 'status') {
        // 更新思考过程
        thinkingMessages.value.push(data.text)
        thinkingMsg.content = thinkingMessages.value.join('\n')
        scrollToBottom()
      } else if (data.type === 'work_event') {
        if (!Array.isArray(agentMsg.workEvents)) agentMsg.workEvents = []
        const event = data.event
        if (event && !agentMsg.workEvents.some(item => (item.id || `${item.kind}:${item.time}:${item.text}`) === (event.id || `${event.kind}:${event.time}:${event.text}`))) {
          agentMsg.workEvents.push(event)
          if (agentMsg.workEvents.length > 80) agentMsg.workEvents.splice(0, agentMsg.workEvents.length - 80)
        }
        if (!agentMsgAdded) {
          messages.value.push(agentMsg)
          agentMsgAdded = true
        }
        scrollToBottom()
      } else if (data.type === 'chunk') {
        // 添加 Agent 回复消息（如果还没添加）
        if (!agentMsgAdded) {
          messages.value.push(agentMsg)
          agentMsgAdded = true
        }
        agentMsg.content += data.text
        scrollToBottom()
      } else if (data.type === 'done') {
        isStreaming.value = false
        // 移除思考消息，保留 Agent 回复
        const thinkingIdx = messages.value.indexOf(thinkingMsg);
        if (thinkingIdx !== -1) {
          messages.value.splice(thinkingIdx, 1);
        }
        if (data.fileChanges && data.fileChanges.count > 0) {
          agentMsg.fileChanges = data.fileChanges
        }
        agentMsg.workEvents = data.workEvents || agentMsg.workEvents
      } else if (data.type === 'error') {
        if (!agentMsgAdded) {
          messages.value.push(agentMsg)
          agentMsgAdded = true
        }
        agentMsg.content = '❌ 错误: ' + data.text
        isStreaming.value = false
      }
    } catch {}
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    sseBuffer += decoder.decode(value, { stream: true })
    const events = sseBuffer.split(/\r?\n\r?\n/)
    sseBuffer = events.pop() || ''
    for (const event of events) {
      handleSseEvent(event)
    }
  }
  sseBuffer += decoder.decode()
  if (sseBuffer.trim()) handleSseEvent(sseBuffer)

  isStreaming.value = false
  // 确保移除思考消息
  const thinkingIdx = messages.value.indexOf(thinkingMsg);
  if (thinkingIdx !== -1) {
    messages.value.splice(thinkingIdx, 1);
  }

  // 保存 Agent 回复到会话
  if (currentSession.value && agentMsg.content) {
    sessionsApi.saveMessage({
      project: currentProject.value,
      sessionId: currentSession.value,
      message: { role: 'assistant', content: agentMsg.content, timestamp: new Date().toISOString(), fileChanges: agentMsg.fileChanges || null, workEvents: agentMsg.workEvents || [] }
    }).catch(() => {})
  }

  // 会话自动命名
  if (currentSessionNew.value && currentSession.value && agentMsg.content) {
    autoNameSession(currentProject.value, currentSession.value, msg)
  }
}

const scrollToBottom = ({ force = false } = {}) => {
  nextTick(() => {
    const el = messagesEl.value
    if (!el) return
    if (force || isMessagesPinnedToBottom.value) {
      el.scrollTop = el.scrollHeight
      isMessagesPinnedToBottom.value = true
    }
  })
}

const formatFileSize = (size) => {
  if (!size) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

const chooseChatFiles = () => {
  chatFileInput.value?.click()
}

const onChatFilesSelected = (event) => {
  const files = Array.from(event.target.files || [])
  chatFiles.value = [...chatFiles.value, ...files]
  event.target.value = ''
}

const removeChatFile = (index) => {
  chatFiles.value.splice(index, 1)
}

const openFileDiff = (file) => {
  diffViewer.value = { visible: true, file }
}

const diffSearchQuery = ref('')

const closeFileDiff = () => {
  diffViewer.value = { visible: false, file: null }
  diffSearchQuery.value = ''
}

// =================== 算法与高亮辅助逻辑 ===================

// HTML 转义
const escapeHtml = (text) => {
  return String(text || "")
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 单词/字符级 Token 分割
const tokenize = (str) => {
  return str.match(/[a-zA-Z0-9_]+|[^a-zA-Z0-9_]/g) || []
}

// LCS 词级 Diff 算法
const diffTokens = (oldStr, newStr) => {
  const oldTokens = tokenize(oldStr)
  const newTokens = tokenize(newStr)
  
  const n = oldTokens.length
  const m = newTokens.length
  
  const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0))
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldTokens[i - 1] === newTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }
  
  const oldResult = []
  const newResult = []
  
  let i = n, j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      const tok = oldTokens[i - 1]
      oldResult.unshift({ text: tok, type: 'same' })
      newResult.unshift({ text: tok, type: 'same' })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      newResult.unshift({ text: newTokens[j - 1], type: 'add' })
      j--
    } else {
      oldResult.unshift({ text: oldTokens[i - 1], type: 'remove' })
      i--
    }
  }
  
  return { oldResult, newResult }
}

// 简易正则语法高亮
const highlightCode = (code, ext) => {
  const escaped = escapeHtml(code)
  if (!ext) return escaped
  
  const lowerExt = ext.toLowerCase()
  if (!['js', 'ts', 'jsx', 'tsx', 'vue', 'json', 'html', 'css', 'py', 'toml', 'sh', 'bat', 'md'].includes(lowerExt)) {
    return escaped
  }
  
  const placeholders = []
  let working = escaped
  
  let commentRegex = null
  if (['py', 'toml', 'sh', 'yaml'].includes(lowerExt)) {
    commentRegex = /#.*/g
  } else {
    commentRegex = /(\/\/.*|\/\*[\s\S]*?\*\/)/g
  }
  
  working = working.replace(commentRegex, (match) => {
    const id = `___COMMENT_PLACEHOLDER_${placeholders.length}___`
    placeholders.push({ id, content: `<span class="hl-comment">${match}</span>` })
    return id
  })
  
  const stringRegex = /(&quot;[\s\S]*?&quot;|&#039;[\s\S]*?&#039;|`[\s\S]*?`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g
  working = working.replace(stringRegex, (match) => {
    const id = `___STRING_PLACEHOLDER_${placeholders.length}___`
    placeholders.push({ id, content: `<span class="hl-string">${match}</span>` })
    return id
  })
  
  let keywords = []
  if (['js', 'ts', 'jsx', 'tsx', 'vue'].includes(lowerExt)) {
    keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'break', 'continue', 'switch', 'case', 'default', 'class', 'import', 'export', 'from', 'as', 'true', 'false', 'null', 'undefined', 'this', 'new', 'typeof', 'instanceof', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'extends', 'interface', 'type', 'public', 'private', 'protected', 'readonly', 'static', 'get', 'set', 'keyof', 'any', 'void', 'never', 'unknown', 'string', 'number', 'boolean']
  } else if (lowerExt === 'py') {
    keywords = ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'break', 'continue', 'import', 'from', 'as', 'True', 'False', 'None', 'try', 'except', 'finally', 'raise', 'assert', 'in', 'is', 'not', 'and', 'or', 'lambda', 'with', 'pass', 'global', 'nonlocal']
  } else if (lowerExt === 'css') {
    keywords = ['@media', '@import', '@keyframes', '@font-face', 'important', 'root']
  } else if (lowerExt === 'toml') {
    keywords = ['true', 'false']
  }
  
  if (keywords.length > 0) {
    const kwRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g')
    working = working.replace(kwRegex, '<span class="hl-keyword">$1</span>')
  }
  
  working = working.replace(/\b(\d+)\b/g, '<span class="hl-number">$1</span>')
  
  if (lowerExt === 'css') {
    working = working.replace(/\b(\d+(px|em|rem|%|vh|vw|ms|s|deg))\b/g, '<span class="hl-number">$1</span>')
  }
  
  for (let i = placeholders.length - 1; i >= 0; i--) {
    const p = placeholders[i]
    working = working.replace(p.id, p.content)
  }
  
  return working
}

// 搜索关键字高亮
const highlightSearch = (htmlText, query) => {
  if (!query || !query.trim()) return htmlText
  const escapedQuery = escapeHtml(query.trim())
  const regex = new RegExp(`(<[^>]*>)|(${escapedQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi')
  return htmlText.replace(regex, (match, p1, p2) => {
    if (p1) return p1
    if (p2) return `<span class="hl-match">${p2}</span>`
    return match
  })
}

// 解析 Unified Diff 为分栏对比的对齐行数据 (升级版)
const parseSplitDiff = (rawDiff) => {
  const lines = (rawDiff || '').split('\n')
  const hunks = []
  let currentHunk = null

  for (const line of lines) {
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@(.*)/)
      if (match) {
        if (currentHunk) hunks.push(currentHunk)
        currentHunk = {
          header: line,
          oldStart: parseInt(match[1]),
          newStart: parseInt(match[3]),
          splitLines: []
        }
      }
    } else if (currentHunk) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        currentHunk.splitLines.push({ type: 'add', content: line.substring(1) })
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        currentHunk.splitLines.push({ type: 'remove', content: line.substring(1) })
      } else if (!line.startsWith('---') && !line.startsWith('+++')) {
        currentHunk.splitLines.push({ type: 'context', content: line.startsWith(' ') ? line.substring(1) : line })
      }
    }
  }
  if (currentHunk) hunks.push(currentHunk)

  const ext = diffViewer.value.file?.path ? diffViewer.value.file.path.split('.').pop() : ''

  return hunks.map(hunk => {
    const aligned = []
    let leftIdx = hunk.oldStart
    let rightIdx = hunk.newStart

    let i = 0
    const rawLines = hunk.splitLines
    while (i < rawLines.length) {
      const removes = []
      const adds = []

      while (i < rawLines.length && rawLines[i].type === 'remove') {
        removes.push(rawLines[i])
        i++
      }
      while (i < rawLines.length && rawLines[i].type === 'add') {
        adds.push(rawLines[i])
        i++
      }

      if (removes.length > 0 || adds.length > 0) {
        const maxLen = Math.max(removes.length, adds.length)
        for (let k = 0; k < maxLen; k++) {
          const hasLeft = k < removes.length
          const hasRight = k < adds.length
          
          let leftContent = hasLeft ? removes[k].content : ''
          let rightContent = hasRight ? adds[k].content : ''
          
          let leftHtml = ''
          let rightHtml = ''
          
          if (hasLeft && hasRight) {
            const { oldResult, newResult } = diffTokens(leftContent, rightContent)
            leftHtml = oldResult.map(tok => {
              const esc = escapeHtml(tok.text)
              return tok.type === 'remove' ? `<span class="word-remove">${esc}</span>` : esc
            }).join('')
            rightHtml = newResult.map(tok => {
              const esc = escapeHtml(tok.text)
              return tok.type === 'add' ? `<span class="word-add">${esc}</span>` : esc
            }).join('')
          } else {
            if (hasLeft) leftHtml = highlightCode(leftContent, ext)
            if (hasRight) rightHtml = highlightCode(rightContent, ext)
          }

          const leftRow = hasLeft ? {
            type: 'remove',
            content: leftHtml,
            isHtml: true,
            lineNum: leftIdx++
          } : { type: 'empty', content: '', isHtml: false, lineNum: '' }

          const rightRow = hasRight ? {
            type: 'add',
            content: rightHtml,
            isHtml: true,
            lineNum: rightIdx++
          } : { type: 'empty', content: '', isHtml: false, lineNum: '' }

          aligned.push({ left: leftRow, right: rightRow })
        }
      } else {
        const ctx = rawLines[i]
        const ctxHtml = highlightCode(ctx.content, ext)
        aligned.push({
          left: { type: 'context', content: ctxHtml, isHtml: true, lineNum: leftIdx++ },
          right: { type: 'context', content: ctxHtml, isHtml: true, lineNum: rightIdx++ }
        })
        i++
      }
    }
    return {
      header: hunk.header,
      lines: aligned
    }
  })
}

// 处理单栏 Unified Diff (Modal 专用)
const processModalUnifiedLines = computed(() => {
  const rawDiff = diffViewer.value.file?.diff?.diff || ''
  const lines = rawDiff ? rawDiff.split('\n') : []
  const processed = []
  const ext = diffViewer.value.file?.path ? diffViewer.value.file.path.split('.').pop() : ''
  
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const nextLine = lines[i + 1]
    const isMeta = line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@') || line.startsWith('diff') || line.startsWith('index')
    
    if (isMeta) {
      processed.push({ type: 'meta', sign: ' ', htmlContent: escapeHtml(line) })
      i++
    } else if (line.startsWith('-') && !line.startsWith('---') && nextLine && nextLine.startsWith('+') && !nextLine.startsWith('+++')) {
      const { oldResult, newResult } = diffTokens(line.substring(1), nextLine.substring(1))
      const leftHtml = oldResult.map(tok => {
        const esc = escapeHtml(tok.text)
        return tok.type === 'remove' ? `<span class="word-remove">${esc}</span>` : esc
      }).join('')
      const rightHtml = newResult.map(tok => {
        const esc = escapeHtml(tok.text)
        return tok.type === 'add' ? `<span class="word-add">${esc}</span>` : esc
      }).join('')
      
      processed.push({ type: 'remove', sign: '-', htmlContent: leftHtml })
      processed.push({ type: 'add', sign: '+', htmlContent: rightHtml })
      i += 2
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      processed.push({ type: 'add', sign: '+', htmlContent: highlightCode(line.substring(1), ext) })
      i++
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      processed.push({ type: 'remove', sign: '-', htmlContent: highlightCode(line.substring(1), ext) })
      i++
    } else {
      const content = line.startsWith(' ') ? line.substring(1) : line
      processed.push({ type: 'context', sign: ' ', htmlContent: highlightCode(content, ext) })
      i++
    }
  }
  return processed
})

// 会话自动命名
const currentSessionNew = ref(false)

const autoNameSession = async (project, sessionId, message) => {
  try {
    const res = await api('/api/sessions/auto-name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, sessionId, message })
    })
    if (res.success && res.name) {
      toast.success(`会话已自动命名为: ${res.name}`)
      loadSessions(project)
    }
  } catch (e) {
    console.log('自动命名失败:', e)
  }
}

// 聊天目标提示
const chatTarget = computed(() => {
  if (currentProject.value) {
    return `发送到: ${currentProject.value}`
  }
  return '未选择项目'
})

// 日志面板
const showLogsPanel = ref(false)
const logsContent = ref('')

const toggleLogs = () => {
  showLogsPanel.value = !showLogsPanel.value
  if (showLogsPanel.value && currentProject.value) {
    loadLogs()
  }
}

const loadLogs = async () => {
  if (!currentProject.value) return
  try {
    const res = await api(`/api/projects/${encodeURIComponent(currentProject.value)}/logs?lines=200`)
    logsContent.value = res.logs || '(暂无日志)'
  } catch (e) {
    logsContent.value = '加载日志失败: ' + e.message
  }
}

// 飞书扫码创建机器人
const openFeishuQr = () => {
  showFeishuQr.value = true
  feishuQrUrl.value = ''
  feishuQrStatus.value = ''
  feishuQrLoading.value = false
}

const startFeishuQrSetup = async () => {
  const projectName = form.value.name || currentProject.value || 'default'
  feishuQrLoading.value = true
  feishuQrStatus.value = '正在生成扫码链接...'

  try {
    const res = await fetch('/api/projects/feishu-setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: projectName })
    })
    const data = await res.json()

    if (data.success && data.scan_url) {
      feishuQrUrl.value = data.scan_url
      feishuQrStatus.value = '请用飞书 App 扫码完成授权'

      // 轮询检查配置状态
      let checks = 0
      const poll = setInterval(async () => {
        checks++
        if (checks > 60) {
          clearInterval(poll)
          feishuQrStatus.value = '❌ 扫码超时，请重试'
          feishuQrLoading.value = false
          return
        }

        const configRes = await fetch('/api/feishu/config')
        const configData = await configRes.json()
        if (configData.config?.app_id) {
          clearInterval(poll)
          feishuQrStatus.value = '✅ 飞书机器人配置完成！'
          feishuQrLoading.value = false
          // 自动填入 App ID
          if (document.getElementById('feishuAppId')) {
            document.getElementById('feishuAppId').value = configData.config.app_id
          }
        }
      }, 3000)
    } else {
      feishuQrStatus.value = '❌ ' + (data.error || '生成扫码链接失败')
      feishuQrLoading.value = false
    }
  } catch (e) {
    feishuQrStatus.value = '❌ 请求失败: ' + e.message
    feishuQrLoading.value = false
  }
}

// 高级网页版文件夹浏览器
const openFolderBrowser = async (target) => {
  browseTarget.value = target
  showFolderBrowser.value = true
  await loadDrives()
  await loadFolderContents('')
}

const loadDrives = async () => {
  try {
    const res = await fetch('/api/filesystem/drives')
    const data = await res.json()
    drives.value = data.drives || []
  } catch (e) {
    drives.value = []
  }
}

const loadFolderContents = async (dir) => {
  try {
    const res = await fetch(`/api/filesystem/browse?dir=${encodeURIComponent(dir)}`)
    const data = await res.json()
    if (data.success) {
      browsePath.value = data.path
      browseItems.value = data.items || []
    }
  } catch (e) {
    browseItems.value = []
  }
}

const browseGoUp = () => {
  if (!browsePath.value) return
  const parentPath = browsePath.value.replace(/[/\\][^/\\]+$/, '') || '/'
  loadFolderContents(parentPath)
}

const selectFolder = () => {
  if (browseTarget.value && browsePath.value) {
    form.value.work_dir = browsePath.value
  }
  showFolderBrowser.value = false
}

// 项目工具配置
const projectTools = ref({ mcp: [], skill: [] })
const allTools = ref({ mcp: [], skill: [] })
const projectVerificationCommands = ref('')
const inferredProjectVerificationCommands = ref([])
const projectVerificationSource = ref('missing')

const loadProjectTools = async () => {
  if (!currentProject.value) return

  // 加载项目工具配置
  const projRes = await fetch(`/api/projects/tools?project=${encodeURIComponent(currentProject.value)}`)
  const projData = await projRes.json()
  projectTools.value = projData.tools || { mcp: [], skill: [] }
  projectVerificationCommands.value = Array.isArray(projData.verification_commands)
    ? projData.verification_commands.join('\n')
    : ''
  inferredProjectVerificationCommands.value = Array.isArray(projData.inferred_verification_commands)
    ? projData.inferred_verification_commands
    : []
  projectVerificationSource.value = projData.verification_source || (projectVerificationCommands.value.trim() ? 'configured' : (inferredProjectVerificationCommands.value.length ? 'inferred' : 'missing'))
  projectResponsibility.value = projData.responsibility || ''
  projectCapabilities.value = Array.isArray(projData.capabilities) ? projData.capabilities.join('\n') : ''
  projectWritablePaths.value = Array.isArray(projData.writable_paths) ? projData.writable_paths.join('\n') : ''
  projectForbiddenPaths.value = Array.isArray(projData.forbidden_paths) ? projData.forbidden_paths.join('\n') : ''
  projectDeliveryContract.value = projData.delivery_contract || ''

  // 加载所有可用工具
  const mcpRes = await fetch('/api/mcp')
  const mcpData = await mcpRes.json()
  allTools.value.mcp = mcpData.tools || []

  const skillRes = await fetch('/api/skills')
  const skillData = await skillRes.json()
  allTools.value.skill = skillData.skills || []

  showTools.value = true
}

const saveProjectTools = async () => {
  const verificationCommands = projectVerificationCommands.value
    .split(/\r?\n|[；;]/)
    .map(item => item.trim())
    .filter(Boolean)
  const splitConfigLines = (value) => String(value || '')
    .split(/\r?\n|[；;]/)
    .map(item => item.trim())
    .filter(Boolean)
  const res = await fetch('/api/projects/tools', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      project: currentProject.value,
      tools: projectTools.value,
      verification_commands: verificationCommands,
      responsibility: projectResponsibility.value.trim(),
      capabilities: splitConfigLines(projectCapabilities.value),
      writable_paths: splitConfigLines(projectWritablePaths.value),
      forbidden_paths: splitConfigLines(projectForbiddenPaths.value),
      delivery_contract: projectDeliveryContract.value.trim()
    })
  })
  const data = await res.json()
  if (data.success) {
    showTools.value = false
    toast.success('工具配置已保存')
  } else {
    toast.error('保存失败: ' + (data.error || '未知错误'))
  }
}

const applyInferredVerificationCommands = () => {
  if (!inferredProjectVerificationCommands.value.length) return
  projectVerificationCommands.value = inferredProjectVerificationCommands.value.join('\n')
  projectVerificationSource.value = 'configured'
}

const isToolSelected = (type, name) => {
  return projectTools.value[type]?.includes(name) || false
}

const toggleProjectTool = (type, name) => {
  if (!projectTools.value[type]) projectTools.value[type] = []
  const idx = projectTools.value[type].indexOf(name)
  if (idx >= 0) {
    projectTools.value[type].splice(idx, 1)
  } else {
    projectTools.value[type].push(name)
  }
}

// 项目共享文件
const projectFiles = ref([])
const showAddFile = ref(false)
const showEditFile = ref(false)
const editFileName = ref('')
const editFileContent = ref('')

const loadProjectSharedFiles = async () => {
  if (!currentProject.value) return
  const res = await fetch(`/api/projects/shared?project=${encodeURIComponent(currentProject.value)}`)
  const data = await res.json()
  projectFiles.value = data.files || []
  showSharedFiles.value = true
}

const addProjectFile = async () => {
  editFileName.value = ''
  editFileContent.value = ''
  showAddFile.value = true
}

const submitAddProjectFile = async () => {
  if (!editFileName.value.trim()) { toast.warning('请输入文件名'); return }
  await fetch('/api/projects/shared/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project: currentProject.value, name: editFileName.value.trim(), content: editFileContent.value })
  })
  showAddFile.value = false
  loadProjectSharedFiles()
  toast.success('文件创建成功')
}

const editProjectFile = async (fileName) => {
  const file = projectFiles.value.find(f => f.name === fileName)
  if (!file) return
  editFileName.value = file.name
  editFileContent.value = file.content || ''
  showEditFile.value = true
}

const submitEditProjectFile = async () => {
  await fetch('/api/projects/shared/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project: currentProject.value, name: editFileName.value, content: editFileContent.value })
  })
  showEditFile.value = false
  loadProjectSharedFiles()
  toast.success('文件已保存')
}

const deleteProjectFile = async (fileName) => {
  const confirmed = await confirmDialog(`确定删除文件 "${fileName}"？删除后无法恢复。`)
  if (!confirmed) return
  await fetch('/api/projects/shared/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project: currentProject.value, name: fileName })
  })
  loadProjectSharedFiles()
  toast.success('文件已删除')
}

onMounted(() => {
  loadAgentOptions()
  loadProjects()
  nextTick(attachMessagesResizeObserver)
})

onUnmounted(() => {
  if (messagesResizeObserver) {
    messagesResizeObserver.disconnect()
    messagesResizeObserver = null
  }
})

// --- 对话模板相关逻辑开始 ---
const showTemplateSelector = ref(false)
const allTemplates = ref([])
const templateSearchQuery = ref('')
const activeTemplateIndex = ref(0)

const recommendedTemplate = ref(null)
const showRecommendation = ref(false)

const activeTemplate = ref(null)
const templateVariables = ref({})
const showVariableModal = ref(false)

const loadAllTemplates = async () => {
  try {
    const res = await fetch('/api/templates')
    const data = await res.json()
    allTemplates.value = data.templates || []
  } catch (e) {
    toast.error('加载模板列表失败')
  }
}

const openTemplateSelector = async () => {
  await loadAllTemplates()
  templateSearchQuery.value = ''
  activeTemplateIndex.value = 0
  showTemplateSelector.value = !showTemplateSelector.value
}

const selectChatTemplate = (tpl) => {
  showTemplateSelector.value = false
  showRecommendation.value = false
  
  const regex = /\{([a-zA-Z0-9_\u4e00-\u9fa5\s]+)\}/g
  const matches = []
  let match
  while ((match = regex.exec(tpl.prompt)) !== null) {
    if (!matches.includes(match[1])) {
      matches.push(match[1])
    }
  }

  if (matches.length > 0) {
    activeTemplate.value = tpl
    templateVariables.value = {}
    matches.forEach(m => {
      templateVariables.value[m] = ''
    })
    showVariableModal.value = true
  } else {
    insertPromptToChat(tpl.prompt)
  }
}

const applyTemplateVariables = () => {
  let promptText = activeTemplate.value.prompt
  Object.keys(templateVariables.value).forEach(key => {
    const val = templateVariables.value[key] || `{${key}}`
    promptText = promptText.replaceAll(`{${key}}`, val)
  })
  insertPromptToChat(promptText)
  showVariableModal.value = false
  activeTemplate.value = null
}

const insertPromptToChat = (text) => {
  if (chatInput.value && !chatInput.value.startsWith('/')) {
    chatInput.value += '\n' + text
  } else {
    chatInput.value = text
  }
  nextTick(() => {
    const el = document.getElementById('projectChatInput')
    if (el) {
      el.focus()
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  })
}

// 智能意图匹配推荐
const detectRecommendation = (val) => {
  if (!val || val.startsWith('/') || val.length < 5) {
    showRecommendation.value = false
    recommendedTemplate.value = null
    return
  }
  
  const text = val.toLowerCase()
  let tplId = null
  
  if (text.includes('bug') || text.includes('报错') || text.includes('崩溃') || text.includes('报错') || text.includes('闪退') || text.includes('卡顿') || text.includes('异常')) {
    tplId = 'tpl_bug_fix'
  } else if (text.includes('前端') || text.includes('页面') || text.includes('组件') || text.includes('写个页面') || text.includes('开发页面') || text.includes('ui')) {
    tplId = 'tpl_frontend_dev'
  } else if (text.includes('接口') || text.includes('api') || text.includes('后端') || text.includes('服务') || text.includes('路由')) {
    tplId = 'tpl_backend_api'
  } else if (text.includes('重构') || text.includes('优化') || text.includes('改写') || text.includes('整理')) {
    tplId = 'tpl_refactor'
  } else if (text.includes('审查') || text.includes('review') || text.includes('看下代码') || text.includes('质量')) {
    tplId = 'tpl_code_review'
  }

  if (tplId) {
    const tpl = allTemplates.value.find(t => t.id === tplId)
    if (tpl) {
      recommendedTemplate.value = tpl
      showRecommendation.value = true
      return
    }
  }
  showRecommendation.value = false
  recommendedTemplate.value = null
}

// 应用智能推荐：将用户输入的原始口语代入到模板的第一个占位符中并以表单弹窗展示
const applyRecommendation = () => {
  const tpl = recommendedTemplate.value
  if (!tpl) return
  
  const userOriginalText = chatInput.value.trim()
  const regex = /\{([a-zA-Z0-9_\u4e00-\u9fa5\s]+)\}/g
  const matches = []
  let match
  while ((match = regex.exec(tpl.prompt)) !== null) {
    if (!matches.includes(match[1])) {
      matches.push(match[1])
    }
  }
  
  if (matches.length > 0) {
    activeTemplate.value = tpl
    templateVariables.value = {}
    matches.forEach((m, idx) => {
      if (idx === 0) {
        templateVariables.value[m] = userOriginalText
      } else {
        templateVariables.value[m] = ''
      }
    })
    showRecommendation.value = false
    recommendedTemplate.value = null
    showVariableModal.value = true
  } else {
    chatInput.value = tpl.prompt
    showRecommendation.value = false
    recommendedTemplate.value = null
  }
}

const getFilteredTemplates = () => {
  return allTemplates.value.filter(t => 
    !templateSearchQuery.value || 
    t.name.toLowerCase().includes(templateSearchQuery.value.toLowerCase())
  )
}

const handleInput = (e) => {
  const value = e.target.value
  
  if (value.startsWith('/')) {
    templateSearchQuery.value = value.substring(1)
    showTemplateSelector.value = true
    activeTemplateIndex.value = 0
    showRecommendation.value = false
  } else {
    showTemplateSelector.value = false
    detectRecommendation(value)
  }
}

const handleKeydown = (e) => {
  // 1. 处理斜杠指令模板下拉菜单键盘控制
  if (showTemplateSelector.value) {
    const filtered = getFilteredTemplates()
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      activeTemplateIndex.value = (activeTemplateIndex.value + 1) % filtered.length
      return
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      activeTemplateIndex.value = (activeTemplateIndex.value - 1 + filtered.length) % filtered.length
      return
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (filtered.length > 0) {
        e.preventDefault()
        selectChatTemplate(filtered[activeTemplateIndex.value])
        return
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      showTemplateSelector.value = false
      return
    }
  }

  // 2. 默认发送消息
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}
// --- 对话模板相关逻辑结束 ---
</script>

<template>
  <div class="project-manager">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <span class="label">项目：</span>
        <div class="project-select-wrapper">
          <select v-model="currentProject" @change="selectProject(currentProject)" class="select">
            <option value="">选择项目...</option>
            <option v-for="p in projects" :key="p.name" :value="p.name">
              {{ p.running ? '🟢' : '⚪' }} {{ p.name }}
            </option>
          </select>
          <!-- 项目操作按钮 -->
          <div v-if="currentProject" class="project-actions-inline">
            <template v-if="projects.find(p => p.name === currentProject)?.running">
              <button class="btn btn-stop btn-sm" @click="stopProject(currentProject)">⏹ 停止</button>
              <button class="btn btn-outline btn-sm" @click="openSwitchAgent(projects.find(p => p.name === currentProject))">🔄 切换</button>
            </template>
            <template v-else>
              <button class="btn btn-start btn-sm" @click="startProject(currentProject)">▶ 启动</button>
            </template>
            <button class="btn btn-outline btn-sm" @click="openEditModal(projects.find(p => p.name === currentProject))">✏️ 编辑</button>
            <button class="btn btn-outline btn-sm" @click="loadProjectTools()">🔧 工具</button>
            <button class="btn btn-outline btn-sm" @click="loadProjectSharedFiles()">📁 文件</button>
            <button class="btn btn-danger btn-sm" @click="deleteProject(currentProject)">🗑️ 删除</button>
          </div>
        </div>
      </div>
      <div class="toolbar-right">
        <span class="info">{{ pageInfo }}</span>
        <button class="btn btn-primary" @click="openCreateModal">+ 新建项目</button>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <!-- 左侧会话列表 -->
      <div class="sidebar">
        <div class="sidebar-header">
          <span>💬 会话列表</span>
          <div style="display:flex;gap:6px">
            <button class="btn btn-primary btn-sm" @click="createSession">+ 新建</button>
            <button class="btn btn-outline btn-sm" @click="loadSessions(currentProject)">↻</button>
          </div>
        </div>
        <div class="session-list">
          <div v-if="!currentProject" class="empty-sm">
            <span>💬</span>
            <span>选择项目查看会话</span>
          </div>
          <div v-else-if="sessions.length === 0" class="empty-sm">
            <span>💬</span>
            <span>暂无会话</span>
          </div>
          <div v-else>
            <div v-for="s in sessions" :key="s.id"
              class="session-item"
              :class="{ active: currentSession === s.id }"
              @click="selectSession(s.id)">
              <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div style="flex:1;min-width:0">
                  <div class="session-name">{{ s.name || s.id }}</div>
                  <div class="session-meta">
                    <span>{{ s.message_count }} 条</span>
                    <span>{{ s.id }}</span>
                  </div>
                </div>
                <div class="session-actions">
                  <button class="btn-icon" @click.stop="renameSession(s.id)" title="重命名">✏️</button>
                  <button class="btn-icon" @click.stop="deleteSession(s.id)" title="删除">🗑️</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧内容区 -->
      <div class="content">
        <div class="content-header">
          <span>{{ currentSession ? `${currentProject} - 消息记录` : '消息记录' }}</span>
        </div>
        <div id="messages" ref="messagesEl" class="messages" @scroll="updateMessageScrollState">
          <div v-if="!currentSession" class="empty">
            <span class="icon">💬</span>
            <span>选择一个会话开始对话</span>
          </div>
          <template v-else>
            <div v-for="(msg, i) in messages" :key="getMessageKey(msg)" :id="'msg-' + i" class="message" :class="[msg.role, { 'msg-highlight': highlightMsgIndex === i }]">
              <!-- 思考过程消息 -->
              <div v-if="msg.role === 'thinking'" class="thinking-bubble">
                <div class="thinking-header">
                  <span class="thinking-icon">🧠</span>
                  <span>Agent 思考中...</span>
                </div>
                <div class="thinking-content">{{ msg.content }}</div>
                <span class="stream-cursor">▌</span>
              </div>
              <!-- 用户消息 -->
              <div v-else-if="msg.role === 'user'" class="bubble">
                <div>{{ msg.content }}</div>
              </div>
              <!-- Agent 回复 -->
              <div v-else class="bubble">
                <span class="agent-label">🤖 Agent</span>
                <div>{{ msg.content }}</div>
                <span v-if="isStreaming && i === messages.length - 1" class="stream-cursor">▌</span>
                <div v-if="getWorkEvents(msg).length" class="agent-work-events">
                  <div class="work-events-head">
                    <span>Agent 工作输出</span>
                    <span>{{ getWorkEvents(msg).length }} 条</span>
                  </div>
                  <div class="work-events-list">
                    <div
                      v-for="event in getWorkEvents(msg).slice(-10)"
                      :key="event.id || event.time || event.text"
                      :class="['work-event', workEventTone(event.kind)]"
                    >
                      <span class="work-event-kind">{{ workEventLabel(event.kind) }}</span>
                      <pre>{{ compactWorkText(event.text) }}</pre>
                    </div>
                  </div>
                </div>
                <div v-if="msg.fileChanges && msg.fileChanges.count > 0" class="file-changes">
                  <div class="file-changes-header">📁 修改了 {{ msg.fileChanges.count }} 个文件</div>
                  <button v-for="f in msg.fileChanges.files" :key="f.path" class="file-change-item" @click="openFileDiff(f)">
                    <span class="fc-dot" :style="{ background: f.statusColor }"></span>
                    <span class="fc-path">{{ f.path }}</span>
                    <span v-if="f.diff?.available" class="fc-diff-stat">
                      +{{ f.diff.additions || 0 }} -{{ f.diff.deletions || 0 }}
                    </span>
                    <span class="fc-status" :style="{ color: f.statusColor }">{{ f.statusText }}</span>
                  </button>
                </div>
              </div>
              <div class="msg-meta">{{ new Date(msg.timestamp).toLocaleString('zh-CN') }}</div>
            </div>
          </template>
        </div>
        <!-- 消息锚点导航条 -->
        <div v-if="userMessages.length > 1" class="msg-navigator">
          <div 
            v-for="msg in userMessages" 
            :key="msg.originalIndex" 
            class="navigator-dot"
            @click="scrollToMessage(msg.originalIndex)"
            :title="msg.content.slice(0, 30) + (msg.content.length > 30 ? '...' : '')"
          >
            <span class="dot-bar"></span>
          </div>
        </div>
        <div class="chat-bar">
          <input ref="chatFileInput" type="file" multiple class="hidden-file-input" @change="onChatFilesSelected">
          <button class="btn btn-outline attach-btn" title="添加附件" @click="chooseChatFiles">📎</button>
          <button class="btn btn-outline attach-btn" title="插入对话模板" style="margin-left: 4px;" @click="openTemplateSelector">📚</button>
          <div class="chat-input-wrap">
            <!-- 💡 智能模板推荐气泡 -->
            <div v-if="showRecommendation && recommendedTemplate" class="recommendation-bubble" @click="applyRecommendation">
              <span class="bulb">💡</span>
              <span class="text">意图检测：建议使用模板 <strong>{{ recommendedTemplate.name }}</strong></span>
              <span class="action">一键格式化提示词 ➤</span>
            </div>
            <div v-if="chatFiles.length" class="attachment-row">
              <span v-for="(file, index) in chatFiles" :key="`${file.name}-${index}`" class="attachment-chip">
                <span>{{ file.name }}</span>
                <small>{{ formatFileSize(file.size) }}</small>
                <button title="移除附件" @click="removeChatFile(index)">×</button>
              </span>
            </div>
            <textarea id="projectChatInput" v-model="chatInput" placeholder="输入消息发送给 Agent... (Enter 发送，输入 / 唤起快捷模板)" rows="1"
              @keydown="handleKeydown" @input="handleInput"></textarea>
            <!-- 📚 模板快捷选择浮层 -->
            <div v-if="showTemplateSelector" class="template-dropdown">
              <div style="padding: 8px; border-bottom: 1px solid rgba(0,0,0,0.05); display:flex; gap:6px;">
                <input v-model="templateSearchQuery" placeholder="搜索对话模板..." class="search-input" style="flex:1; padding: 6px 10px; font-size:12px; border-radius: 6px; border: 1px solid rgba(0,0,0,0.08); outline:none;">
              </div>
              <div style="max-height: 200px; overflow-y: auto; padding: 4px 0;">
                <div v-for="(t, idx) in allTemplates.filter(t => !templateSearchQuery || t.name.toLowerCase().includes(templateSearchQuery.toLowerCase()))" 
                     :key="t.id" 
                     class="mention-item" 
                     :data-id="t.id"
                     :class="{ active: idx === activeTemplateIndex }"
                     style="display:flex; align-items:center; gap:8px; justify-content:space-between;"
                     @click="selectChatTemplate(t)">
                  <div style="display:flex; align-items:center; gap:8px; overflow:hidden;">
                    <span style="font-size: 16px;">{{ t.icon || '📝' }}</span>
                    <div style="display:flex; flex-direction:column; overflow:hidden; text-align:left;">
                      <span style="font-weight: 500; font-size: 12.5px; color: var(--text-primary);">{{ t.name }}</span>
                      <span style="font-size: 10.5px; color: var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ t.description || '暂无描述' }}</span>
                    </div>
                  </div>
                  <span class="tag" style="font-size: 9px; padding: 1px 5px; background: rgba(59, 130, 246, 0.08); color: var(--accent-blue); border-radius: 4px;">{{ t.category }}</span>
                </div>
                <div v-if="allTemplates.filter(t => !templateSearchQuery || t.name.toLowerCase().includes(templateSearchQuery.toLowerCase())).length === 0" style="text-align:center; padding:12px; color:var(--text-muted); font-size:11px;">
                  无匹配的模板
                </div>
              </div>
            </div>
          </div>
          <button class="btn btn-primary chat-send" @click="sendMessage">发送 ➤</button>
        </div>
        <!-- 日志面板 -->
        <div v-if="showLogsPanel" class="logs-panel">
          <div class="logs-header" @click="showLogsPanel = false">
            <span>📋 运行日志</span>
            <span style="font-size:12px;color:var(--text-muted)">{{ currentProject }}</span>
          </div>
          <div class="logs-content">{{ logsContent }}</div>
        </div>
      </div>
    </div>

    <!-- 文件 Diff 弹窗 -->
    <div v-if="diffViewer.visible" class="modal-overlay diff-overlay" @click.self="closeFileDiff">
      <div class="modal diff-modal">
        <button class="modal-close" @click="closeFileDiff">&times;</button>
        <div class="diff-header" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h3>{{ diffViewer.file?.path }}</h3>
            <div class="diff-sub">
              <span :style="{ color: diffViewer.file?.statusColor }">{{ diffViewer.file?.statusText }}</span>
              <span v-if="diffViewer.file?.diff?.available">+{{ diffViewer.file?.diff?.additions || 0 }} -{{ diffViewer.file?.diff?.deletions || 0 }}</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <input v-if="diffViewer.file?.diff?.available" v-model="diffSearchQuery" class="diff-search-input" placeholder="在 diff 中搜索..." />
          </div>
        </div>
        <div v-if="diffViewer.file?.diff?.available" class="diff-viewer">
          <div v-for="(line, index) in processModalUnifiedLines" :key="index" 
            class="diff-line" 
            :class="{ 'diff-add': line.type === 'add', 'diff-remove': line.type === 'remove', 'diff-context': line.type === 'context', 'diff-meta': line.type === 'meta' }">
            <span class="diff-sign">{{ line.sign }}</span>
            <span class="diff-text" v-html="highlightSearch(line.htmlContent, diffSearchQuery)"></span>
          </div>
        </div>
        <div v-else class="diff-empty">
          {{ diffViewer.file?.diff?.reason || '没有可展示的文本差异' }}
        </div>
      </div>
    </div>


    <!-- 创建项目弹窗 -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <button class="modal-close" @click="showCreate = false">&times;</button>
        <h3>新建项目</h3>
        <div class="form-group">
          <label>项目名称</label>
          <input v-model="form.name" placeholder="如 my-app">
        </div>
        <div class="form-group">
          <label>代码目录路径</label>
          <div style="display:flex;gap:8px">
            <input v-model="form.work_dir" placeholder="如 D:\projects\my-app" style="flex:1">
            <button class="btn btn-outline btn-sm" @click="openFolderBrowser('work_dir')">📁 浏览</button>
          </div>
        </div>
        <div class="form-group">
          <label>Agent</label>
          <select v-model="form.agent">
            <option v-for="agent in agentOptions" :key="agent.type" :value="agent.type">{{ agent.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>平台</label>
          <select v-model="form.platform">
            <option v-for="p in platforms" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
        </div>
        <div v-if="form.platform === 'feishu' || form.platform === 'lark'" style="margin-bottom:16px">
          <button class="btn btn-outline" @click="openFeishuQr()" style="width:100%">🤖 扫码创建飞书机器人</button>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;text-align:center">自动配置飞书机器人并获取凭证</div>
        </div>
        <div class="form-actions">
          <button class="btn btn-cancel" @click="showCreate = false">取消</button>
          <button class="btn btn-primary" @click="submitCreate">创建</button>
        </div>
      </div>
    </div>

    <!-- 编辑项目弹窗 -->
    <div v-if="showEdit" class="modal-overlay" @click.self="showEdit = false">
      <div class="modal">
        <button class="modal-close" @click="showEdit = false">&times;</button>
        <h3>编辑项目 - {{ editProject?.name }}</h3>
        <div class="form-group">
          <label>代码目录</label>
          <div style="display:flex;gap:8px">
            <input v-model="form.work_dir" placeholder="项目代码目录路径" style="flex:1">
            <button class="btn btn-outline btn-sm" @click="openFolderBrowser('work_dir')">📁 浏览</button>
          </div>
        </div>
        <div class="form-group">
          <label>Agent 类型</label>
          <select v-model="form.agent">
            <option v-for="agent in agentOptions" :key="agent.type" :value="agent.type">{{ agent.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label>平台</label>
          <select v-model="form.platform">
            <option v-for="p in platforms" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
        </div>
        <div v-if="form.platform === 'feishu' || form.platform === 'lark'" style="margin-bottom:16px">
          <button class="btn btn-outline" @click="openFeishuQr()" style="width:100%">🤖 扫码创建飞书机器人</button>
          <div style="font-size:11px;color:var(--text-muted);margin-top:4px;text-align:center">自动配置飞书机器人并获取凭证</div>
        </div>
        <div class="form-actions">
          <button class="btn btn-cancel" @click="showEdit = false">取消</button>
          <button class="btn btn-primary" @click="submitEdit">保存修改</button>
        </div>
      </div>
    </div>

    <!-- 飞书扫码创建机器人弹窗 -->
    <div v-if="showFeishuQr" class="modal-overlay" @click.self="showFeishuQr = false">
      <div class="modal" style="min-width:500px">
        <button class="modal-close" @click="showFeishuQr = false">&times;</button>
        <h3>🤖 飞书扫码创建机器人</h3>

        <div style="display:flex;gap:24px;margin-top:16px">
          <!-- 左侧说明 -->
          <div style="flex:1">
            <div style="font-size:13px;color:var(--text-secondary);line-height:1.8;margin-bottom:16px">
              <div style="font-weight:500;color:var(--text-primary);margin-bottom:8px">扫码配置步骤：</div>
              <ol style="padding-left:20px">
                <li>点击"生成扫码链接"</li>
                <li>用飞书 App 扫描二维码</li>
                <li>授权后自动完成配置</li>
              </ol>
            </div>
            <div style="padding:12px;background:rgba(56,189,248,0.05);border:1px solid rgba(56,189,248,0.2);border-radius:8px">
              <div style="font-size:12px;color:var(--accent-blue)">💡 提示</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:4px">
                扫码配置会自动创建飞书应用并获取 App ID 和 Secret，无需手动填写。
              </div>
            </div>
            <button class="btn btn-primary" @click="startFeishuQrSetup()" style="width:100%;margin-top:16px" :disabled="feishuQrLoading">
              {{ feishuQrLoading ? '生成中...' : '📱 生成扫码链接' }}
            </button>
          </div>

          <!-- 右侧二维码区域 -->
          <div style="width:220px;display:flex;flex-direction:column;align-items:center">
            <div id="feishuQrArea" style="width:200px;height:200px;border:2px dashed var(--border-color);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px">
              <template v-if="feishuQrUrl">
                <img :src="'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(feishuQrUrl)" style="width:180px;height:180px;border-radius:8px" alt="飞书扫码">
              </template>
              <template v-else>
                <span style="font-size:48px;opacity:0.3">📱</span>
                <span style="font-size:11px;color:var(--text-muted)">等待生成二维码</span>
              </template>
            </div>
            <div v-if="feishuQrUrl" style="margin-top:8px">
              <a :href="feishuQrUrl" target="_blank" style="font-size:11px;color:var(--accent-blue)">🔗 点击打开授权页面</a>
            </div>
            <div v-if="feishuQrStatus" style="margin-top:8px;font-size:11px;color:var(--text-muted);text-align:center">{{ feishuQrStatus }}</div>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;margin-top:16px;padding-top:12px;border-top:1px solid var(--border-color)">
          <button class="btn btn-primary" @click="showFeishuQr = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 高级网页版文件夹浏览器 -->
    <div v-if="showFolderBrowser" class="modal-overlay" style="backdrop-filter: blur(12px); background: rgba(0,0,0,0.6);" @click.self="showFolderBrowser = false">
      <div class="modal" style="min-width:650px;max-height:85vh;display:flex;flex-direction:column; background: rgba(20,20,25,0.85); border: 1px solid rgba(56,189,248,0.3); box-shadow: 0 0 30px rgba(56,189,248,0.1), inset 0 0 20px rgba(255,255,255,0.02); border-radius: 12px; overflow: hidden; backdrop-filter: blur(20px);">
        <div style="padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center; background: linear-gradient(90deg, rgba(56,189,248,0.1) 0%, transparent 100%);">
          <h3 style="margin: 0; display: flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 600; text-shadow: 0 0 10px rgba(56,189,248,0.5);"><span style="font-size:20px;">📂</span> 选择项目目录</h3>
          <button class="modal-close" style="position: static; margin: 0; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); color: var(--text-muted); border: none; cursor: pointer; transition: all 0.2s;" @click="showFolderBrowser = false" @mouseover="$event.target.style.background='rgba(239,68,68,0.2)';$event.target.style.color='#ef4444'" @mouseout="$event.target.style.background='rgba(255,255,255,0.05)';$event.target.style.color='var(--text-muted)'">&times;</button>
        </div>

        <div style="padding: 20px; flex: 1; display: flex; flex-direction: column; gap: 16px;">
          <!-- 磁盘快捷导航 -->
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button v-for="d in drives" :key="d.name" class="btn btn-outline" @click="loadFolderContents(d.path)" style="padding:6px 14px;font-size:12px; border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); border-radius: 6px; transition: all 0.2s;" @mouseover="$event.target.style.borderColor='var(--accent-blue)';$event.target.style.boxShadow='0 0 10px rgba(56,189,248,0.2)'" @mouseout="$event.target.style.borderColor='rgba(255,255,255,0.1)';$event.target.style.boxShadow='none'">
              <span style="color:var(--accent-blue)">💽</span> {{ d.name }}:
            </button>
            <button class="btn btn-outline" @click="loadFolderContents('/')" style="padding:6px 14px;font-size:12px; border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); border-radius: 6px; transition: all 0.2s;" @mouseover="$event.target.style.borderColor='var(--accent-blue)';$event.target.style.boxShadow='0 0 10px rgba(56,189,248,0.2)'" @mouseout="$event.target.style.borderColor='rgba(255,255,255,0.1)';$event.target.style.boxShadow='none'">
              <span style="color:var(--accent-blue)">🌐</span> / 根目录
            </button>
          </div>

          <!-- 路径面包屑 -->
          <div style="padding:12px 16px;background:rgba(0,0,0,0.3);border-radius:8px;font-size:13px;color:var(--text-primary);font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; border: 1px solid rgba(255,255,255,0.05); box-shadow: inset 0 2px 4px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 8px;">
            <span style="color:var(--accent-blue); opacity: 0.7;">>_</span>
            <span style="letter-spacing: 0.5px;">{{ browsePath || '正在加载...' }}</span>
          </div>

          <!-- 文件列表区 -->
          <div style="flex:1;overflow-y:auto;min-height:300px;max-height:45vh;background: rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.05);border-radius:8px;padding:8px; box-shadow: inset 0 0 10px rgba(0,0,0,0.5);">
            <div v-if="browseItems.length === 0" style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color:var(--text-muted); opacity: 0.5;">
              <span style="font-size: 32px; margin-bottom: 8px;">🕳️</span>
              <span>空空如也</span>
            </div>
            
            <div v-for="item in browseItems" :key="item.path"
              style="display:flex;align-items:center;gap:12px;padding:10px 16px;cursor:pointer;border-radius:6px;transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1); border: 1px solid transparent; margin-bottom: 2px;"
              :style="{ cursor: item.isDirectory ? 'pointer' : 'default', opacity: item.isDirectory ? 1 : 0.4 }"
              @click="item.isDirectory && loadFolderContents(item.path)"
              @mouseover="if(item.isDirectory){$event.currentTarget.style.background='linear-gradient(90deg, rgba(56,189,248,0.1) 0%, transparent 100%)';$event.currentTarget.style.borderColor='rgba(56,189,248,0.2)';$event.currentTarget.style.transform='translateX(4px)'}"
              @mouseout="if(item.isDirectory){$event.currentTarget.style.background='transparent';$event.currentTarget.style.borderColor='transparent';$event.currentTarget.style.transform='translateX(0)'}">
              <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.03); display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                {{ item.isDirectory ? '📁' : '📄' }}
              </div>
              <span style="font-size:14px;color:var(--text-primary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; letter-spacing: 0.3px;">{{ item.name }}</span>
              <span v-if="item.isDirectory" style="font-size: 12px; color: var(--accent-blue); opacity: 0.5;">进入</span>
            </div>
          </div>

          <!-- 底部操作栏 -->
          <div style="display:flex;gap:12px;margin-top:4px;align-items:center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 16px;">
            <button class="btn btn-outline" @click="browseGoUp()" style="padding: 8px 16px; border-radius: 8px; border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); transition: all 0.2s;" @mouseover="$event.target.style.background='rgba(255,255,255,0.05)'" @mouseout="$event.target.style.background='rgba(255,255,255,0.02)'">
              <span style="margin-right: 4px;">⬆</span> 返回上级
            </button>
            <button class="btn btn-outline" @click="loadFolderContents(browsePath)" style="padding: 8px 16px; border-radius: 8px; border-color: rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); transition: all 0.2s;" @mouseover="$event.target.style.background='rgba(255,255,255,0.05)'" @mouseout="$event.target.style.background='rgba(255,255,255,0.02)'">
              <span style="margin-right: 4px;">🔄</span> 刷新
            </button>
            <div style="flex:1"></div>
            <button class="btn btn-cancel" @click="showFolderBrowser = false" style="padding: 8px 20px; border-radius: 8px;">取消</button>
            <button class="btn btn-primary" @click="selectFolder()" style="padding: 8px 24px; border-radius: 8px; font-weight: 600; box-shadow: 0 0 15px rgba(56,189,248,0.3); transition: all 0.2s;" @mouseover="$event.target.style.boxShadow='0 0 25px rgba(56,189,248,0.5)'" @mouseout="$event.target.style.boxShadow='0 0 15px rgba(56,189,248,0.3)'">
              ✓ 选择此目录
            </button>
          </div>
        </div>
      </div>
    </div>



    <!-- 切换 Agent 弹窗 -->
    <div v-if="showSwitchAgent" class="modal-overlay" @click.self="showSwitchAgent = false">
      <div class="modal">
        <button class="modal-close" @click="showSwitchAgent = false">&times;</button>
        <h3>切换 Agent - {{ editProject?.name }}</h3>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">
          当前: {{ editProject?.agent }} · 需要先停止再切换
        </div>
        <div class="agent-list">
          <div v-for="agent in agentOptions" :key="agent.type"
            class="agent-option"
            :class="{ active: editProject?.agent === agent.type }"
            @click="switchAgent(agent.type)">
            <span class="agent-name">{{ agent.name }} {{ editProject?.agent === agent.type ? '← 当前' : '' }}</span>
            <span class="agent-type">{{ agent.type }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 工具配置弹窗 -->
    <div v-if="showTools" class="modal-overlay" @click.self="showTools = false">
      <div class="modal" style="min-width:500px;max-height:80vh;display:flex;flex-direction:column">
        <button class="modal-close" @click="showTools = false">&times;</button>
        <h3>🔧 项目工具配置 - {{ currentProject }}</h3>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">配置此项目可用的工具，Agent 将能使用这些工具</div>

        <div style="flex:1;overflow-y:auto">
          <div style="margin-bottom:20px">
            <div style="font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:10px">🔌 MCP 服务器</div>
            <div v-if="allTools.mcp.length === 0" style="font-size:12px;color:var(--text-muted);padding:8px">暂无 MCP 服务器，请先在工具配置页面添加</div>
            <label v-for="tool in allTools.mcp" :key="tool.name"
              style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;border-radius:6px;margin-bottom:4px;border:1px solid var(--border-color);transition:all 0.2s"
              :style="{ borderColor: isToolSelected('mcp', tool.name) ? 'var(--accent-blue)' : 'var(--border-color)', background: isToolSelected('mcp', tool.name) ? 'rgba(56,189,248,0.05)' : 'transparent' }">
              <input type="checkbox" :checked="isToolSelected('mcp', tool.name)" @change="toggleProjectTool('mcp', tool.name)" style="accent-color:var(--accent-blue)">
              <span>🔌</span>
              <div style="flex:1">
                <div style="font-size:13px;color:var(--text-primary)">{{ tool.name }}</div>
                <div style="font-size:11px;color:var(--text-muted)">{{ tool.description || '' }}</div>
              </div>
            </label>
          </div>

          <div>
            <div style="font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:10px">⚡ Skills</div>
            <div v-if="allTools.skill.length === 0" style="font-size:12px;color:var(--text-muted);padding:8px">暂无 Skills，请先在工具配置页面添加</div>
            <label v-for="tool in allTools.skill" :key="tool.name"
              style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;border-radius:6px;margin-bottom:4px;border:1px solid var(--border-color);transition:all 0.2s"
              :style="{ borderColor: isToolSelected('skill', tool.name) ? 'var(--accent-blue)' : 'var(--border-color)', background: isToolSelected('skill', tool.name) ? 'rgba(56,189,248,0.05)' : 'transparent' }">
              <input type="checkbox" :checked="isToolSelected('skill', tool.name)" @change="toggleProjectTool('skill', tool.name)" style="accent-color:var(--accent-blue)">
              <span>⚡</span>
              <div style="flex:1">
                <div style="font-size:13px;color:var(--text-primary)">{{ tool.name }}</div>
                <div style="font-size:11px;color:var(--text-muted)">{{ tool.description || '' }}</div>
              </div>
            </label>
          </div>

          <div style="margin-top:20px">
            <div style="font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:8px">项目 Agent 能力边界</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
              <div>
                <label style="display:block;font-size:11px;color:var(--text-muted);margin-bottom:5px">职责范围</label>
                <textarea v-model="projectResponsibility" rows="3" style="width:100%;padding:9px 10px;border-radius:8px;border:1px solid var(--border-color);background:rgba(255,255,255,0.85);color:var(--text-primary);font-size:12px;resize:vertical;outline:none" placeholder="说明这个项目 Agent 负责哪些业务、模块或技术栈"></textarea>
              </div>
              <div>
                <label style="display:block;font-size:11px;color:var(--text-muted);margin-bottom:5px">能力标签</label>
                <textarea v-model="projectCapabilities" rows="3" style="width:100%;padding:9px 10px;border-radius:8px;border:1px solid var(--border-color);background:rgba(255,255,255,0.85);color:var(--text-primary);font-size:12px;resize:vertical;outline:none" placeholder="每行一个，如：前端页面\n支付接口\n数据库迁移"></textarea>
              </div>
              <div>
                <label style="display:block;font-size:11px;color:var(--text-muted);margin-bottom:5px">允许写入路径</label>
                <textarea v-model="projectWritablePaths" rows="3" style="width:100%;padding:9px 10px;border-radius:8px;border:1px solid var(--border-color);background:rgba(255,255,255,0.85);color:var(--text-primary);font-family:monospace;font-size:12px;resize:vertical;outline:none" placeholder="留空不限制；如：src/**\npackage.json"></textarea>
              </div>
              <div>
                <label style="display:block;font-size:11px;color:var(--text-muted);margin-bottom:5px">禁止触碰路径</label>
                <textarea v-model="projectForbiddenPaths" rows="3" style="width:100%;padding:9px 10px;border-radius:8px;border:1px solid var(--border-color);background:rgba(255,255,255,0.85);color:var(--text-primary);font-family:monospace;font-size:12px;resize:vertical;outline:none" placeholder="如：.env\nnode_modules/**\ndist/**"></textarea>
              </div>
            </div>
            <label style="display:block;font-size:11px;color:var(--text-muted);margin-bottom:5px">交付规范</label>
            <textarea v-model="projectDeliveryContract" rows="3" style="width:100%;padding:9px 10px;border-radius:8px;border:1px solid var(--border-color);background:rgba(255,255,255,0.85);color:var(--text-primary);font-size:12px;resize:vertical;outline:none" placeholder="说明这个 Agent 回执里必须包含的业务证据、截图、接口验证或风险说明"></textarea>
            <div style="margin-top:6px;font-size:11px;color:var(--text-muted);line-height:1.45">
              主 Agent 派发任务时会把这些配置写入子 Agent 工作单；如果配置了路径边界，交付验收会检查实际文件变更是否越界。
            </div>
          </div>

          <div style="margin-top:20px">
            <div style="font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:8px">✅ 项目验证命令</div>
            <textarea
              v-model="projectVerificationCommands"
              rows="4"
              style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border-color);background:rgba(255,255,255,0.85);color:var(--text-primary);font-family:monospace;font-size:12px;resize:vertical;outline:none"
              placeholder="每行一条，例如：&#10;npm run check&#10;npm test&#10;npm run build"
            ></textarea>
            <div style="margin-top:6px;font-size:11px;color:var(--text-muted);line-height:1.45">
              子 Agent 执行 daily_dev 任务时会优先参考这些命令；留空时系统会尝试从 package.json、pom.xml、Gradle、Python、Go、Rust 项目文件推断。
            </div>
            <div v-if="inferredProjectVerificationCommands.length" style="margin-top:8px;padding:8px;border:1px solid rgba(59,130,246,0.16);border-radius:8px;background:rgba(59,130,246,0.06)">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
                <span style="font-size:11px;font-weight:700;color:var(--text-secondary)">
                  {{ projectVerificationSource === 'configured' ? '系统也推断出以下验证命令' : '可采用系统推断的验证命令' }}
                </span>
                <button class="btn btn-outline btn-sm" @click="applyInferredVerificationCommands">采用推断命令</button>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:5px">
                <code v-for="cmd in inferredProjectVerificationCommands" :key="cmd" style="font-size:10.5px;color:#075985;background:rgba(255,255,255,0.72);border:1px solid rgba(59,130,246,0.12);border-radius:6px;padding:3px 6px;overflow-wrap:anywhere">{{ cmd }}</code>
              </div>
            </div>
            <div v-else style="margin-top:8px;padding:8px;border:1px solid rgba(234,179,8,0.2);border-radius:8px;background:rgba(234,179,8,0.06);font-size:11px;color:var(--text-secondary);line-height:1.45">
              当前工作目录没有推断出验证命令，建议手动填写最小可用的检查命令，例如构建、类型检查或测试命令。
            </div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:12px;border-top:1px solid var(--border-color)">
          <div style="font-size:12px;color:var(--text-muted)">已选择 {{ (projectTools.mcp?.length || 0) + (projectTools.skill?.length || 0) }} 个工具 · {{ projectCapabilities.split(/\r?\n|[；;]/).filter(Boolean).length }} 个能力 · {{ projectVerificationCommands.split(/\r?\n|[；;]/).filter(Boolean).length }} 条验证命令</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-cancel" @click="showTools = false">取消</button>
            <button class="btn btn-primary" @click="saveProjectTools">保存配置</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 共享文件弹窗 -->
    <div v-if="showSharedFiles" class="modal-overlay" @click.self="showSharedFiles = false">
      <div class="modal" style="min-width:500px;max-height:80vh;display:flex;flex-direction:column">
        <button class="modal-close" @click="showSharedFiles = false">&times;</button>
        <h3>📁 项目共享文件 - {{ currentProject }}</h3>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">项目共享文件，Agent 可以直接读取这些文件内容</div>

        <div style="margin-bottom:12px">
          <button class="btn btn-primary btn-sm" @click="addProjectFile">+ 新建文件</button>
        </div>

        <div style="flex:1;overflow-y:auto">
          <div v-if="projectFiles.length === 0" style="text-align:center;padding:40px;color:var(--text-muted)">暂无共享文件</div>
          <div v-for="f in projectFiles" :key="f.name" style="padding:12px;border:1px solid var(--border-color);border-radius:8px;margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:16px">📄</span>
                <span style="font-size:14px;font-weight:500;color:var(--text-primary)">{{ f.name }}</span>
              </div>
              <div style="display:flex;gap:4px">
                <button class="btn btn-outline btn-sm" @click="editProjectFile(f.name)">编辑</button>
                <button class="btn btn-danger btn-sm" @click="deleteProjectFile(f.name)">删除</button>
              </div>
            </div>
            <div style="font-size:12px;color:var(--text-muted);white-space:pre-wrap;max-height:60px;overflow:hidden">{{ f.content?.substring(0, 150) }}{{ f.content?.length > 150 ? '...' : '' }}</div>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color)">
          <button class="btn btn-primary" @click="showSharedFiles = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 新建文件弹窗 -->
    <div v-if="showAddFile" class="modal-overlay" @click.self="showAddFile = false">
      <div class="modal" style="min-width:500px">
        <button class="modal-close" @click="showAddFile = false">&times;</button>
        <h3>新建项目共享文件</h3>
        <div class="form-group">
          <label>文件名</label>
          <input v-model="editFileName" placeholder="如 api-docs.md">
        </div>
        <div class="form-group">
          <label>文件内容</label>
          <textarea v-model="editFileContent" rows="10" style="width:100%;padding:12px;border-radius:8px;border:1px solid var(--border-color);background:rgba(255,255,255,0.85);color:var(--text-primary);font-family:monospace;font-size:13px;resize:vertical;outline:none" placeholder="输入文件内容..."></textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-cancel" @click="showAddFile = false">取消</button>
          <button class="btn btn-primary" @click="submitAddProjectFile">创建</button>
        </div>
      </div>
    </div>

    <!-- 编辑文件弹窗 -->
    <div v-if="showEditFile" class="modal-overlay" @click.self="showEditFile = false">
      <div class="modal" style="min-width:500px">
        <button class="modal-close" @click="showEditFile = false">&times;</button>
        <h3>编辑文件 - {{ editFileName }}</h3>
        <div class="form-group">
          <label>文件内容</label>
          <textarea v-model="editFileContent" rows="15" style="width:100%;padding:12px;border-radius:8px;border:1px solid var(--border-color);background:rgba(255,255,255,0.85);color:var(--text-primary);font-family:monospace;font-size:13px;resize:vertical;outline:none"></textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-cancel" @click="showEditFile = false">取消</button>
          <button class="btn btn-primary" @click="submitEditProjectFile">保存</button>
        </div>
      </div>
    </div>
    <!-- 模板变量填写弹窗 -->
    <div v-if="showVariableModal && activeTemplate" class="modal-overlay" @click.self="showVariableModal = false">
      <div class="modal" style="min-width: 450px; max-width: 90vw; display: flex; flex-direction: column;">
        <button class="modal-close" @click="showVariableModal = false">&times;</button>
        <h3>📝 填写模板变量 - {{ activeTemplate.name }}</h3>
        <div style="font-size: 12px; color: var(--text-muted); margin: 6px 0 16px;">检测到该模板包含参数占位符，请为其填写具体内容：</div>
        
        <div style="max-height: 250px; overflow-y: auto; padding-right: 4px;">
          <div v-for="(val, key) in templateVariables" :key="key" class="form-group" style="margin-bottom: 14px;">
            <label style="display:block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px; font-weight: 600;">{{ key }}</label>
            <textarea v-model="templateVariables[key]" rows="2" style="width:100%; padding:8px 12px; border-radius:8px; border:1px solid rgba(0,0,0,0.08); background:rgba(255,255,255,0.85); color:var(--text-primary); font-size:13px; resize:vertical; outline:none;" placeholder="请输入相应的内容..."></textarea>
          </div>
        </div>
        
        <div class="form-actions" style="margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.05);">
          <button class="btn btn-cancel" @click="showVariableModal = false">取消</button>
          <button class="btn btn-primary" @click="applyTemplateVariables">插入输入框</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

/* 顶部卡片化工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.01);
  z-index: 10;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-select-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 按钮组淡入与滑入动画 */
.project-actions-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  animation: action-slide-in 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
}

@keyframes action-slide-in {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.project-actions-inline .btn {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.project-actions-inline .btn:hover {
  transform: translateY(-1.5px);
  border-color: rgba(59, 130, 246, 0.25);
  color: var(--accent-blue);
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.05);
}

.btn-start {
  background: rgba(16, 185, 129, 0.06) !important;
  border: 1px solid rgba(16, 185, 129, 0.15) !important;
  color: var(--accent-green) !important;
}
.btn-start:hover {
  background: var(--accent-green) !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2) !important;
}

.btn-stop {
  background: rgba(239, 68, 68, 0.06) !important;
  border: 1px solid rgba(239, 68, 68, 0.15) !important;
  color: var(--accent-red) !important;
}
.btn-stop:hover {
  background: var(--accent-red) !important;
  color: white !important;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2) !important;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.label {
  font-size: 13.5px;
  color: var(--text-muted);
  white-space: nowrap;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
}

.select {
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.85);
  color: var(--text-primary);
  font-size: 14.5px;
  outline: none;
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
  cursor: pointer;
}

.select:focus {
  border-color: rgba(59, 130, 246, 0.35);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.06);
  background: #ffffff;
}

.info {
  font-size: 12px;
  color: var(--text-muted);
  font-family: 'Share Tech Mono', monospace;
  letter-spacing: 0.5px;
}

/* 主体分栏 */
.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 侧边会话栏 */
.sidebar {
  width: 280px;
  min-width: 280px;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(15px);
  border-right: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  font-size: 14.5px;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 0;
}

.session-item {
  padding: 12px 16px;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
  margin: 4px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.01);
}

.session-item:hover {
  background: rgba(59, 130, 246, 0.03);
  border-color: rgba(59, 130, 246, 0.1);
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.02);
}

.session-item.active {
  background: rgba(59, 130, 246, 0.06);
  border-left-color: var(--accent-blue);
  border-color: rgba(59, 130, 246, 0.15);
  transform: translateX(4px);
  box-shadow: inset 4px 0 16px rgba(59, 130, 246, 0.01), 0 4px 12px rgba(15, 23, 42, 0.03);
}

.session-name {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 4px;
  font-family: 'Share Tech Mono', monospace;
}

.session-actions {
  display: none;
  gap: 6px;
}

.session-item:hover .session-actions {
  display: flex;
  align-items: center;
}

.btn-icon {
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 5px;
  cursor: pointer;
  padding: 4px;
  font-size: 11.5px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.btn-icon:hover {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.18);
  color: #ef4444;
}

/* 右侧内容区 */
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
  position: relative;
}

.content-header {
  padding: 16px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  font-size: 14.5px;
  font-weight: 700;
  color: var(--text-secondary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.message {
  margin-bottom: 18px;
  max-width: 80%;
  animation: msg-in 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.msg-highlight {
  animation: msg-flash 0.5s ease-in-out 3;
  border-radius: 12px;
}
@keyframes msg-flash {
  0%, 100% { background: transparent; }
  50% { background: rgba(250, 204, 21, 0.15); }
}

@keyframes msg-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  margin-left: auto;
}

.message .bubble {
  padding: 12px 18px;
  border-radius: 14px;
  font-size: 15.0px;
  line-height: 1.65;
  word-break: break-word;
}

.message.user .bubble {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%);
  border: 1px solid rgba(59, 130, 246, 0.15);
  color: var(--text-primary);
  border-bottom-right-radius: 4px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.03);
}

.message.assistant .bubble {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  color: var(--text-secondary);
  border-bottom-left-radius: 4px;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.03);
}

.agent-label {
  color: var(--accent-blue);
  font-size: 12.5px;
  display: block;
  margin-bottom: 6px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  filter: drop-shadow(0 1px 2px rgba(59, 130, 246, 0.05));
}

.msg-meta {
  font-size: 11.5px;
  color: var(--text-muted);
  margin-top: 6px;
  font-family: 'Share Tech Mono', monospace;
}

.file-changes {
  margin-top: 10px;
  padding: 12px;
  background: rgba(59, 130, 246, 0.03);
  border: 1px solid rgba(59, 130, 246, 0.1);
  border-radius: 10px;
}

.file-changes-header {
  font-size: 11px;
  color: var(--accent-blue);
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.file-change-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  transition: background 0.2s;
}

.file-change-item:hover {
  background: rgba(59, 130, 246, 0.05);
}

.fc-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.fc-path {
  flex: 1;
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fc-diff-stat {
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  white-space: nowrap;
}

.fc-status {
  font-size: 10px;
  flex-shrink: 0;
  font-weight: 600;
}

/* 胶囊形悬浮式聊天栏 */
.chat-bar {
  display: flex;
  margin: 16px 24px;
  padding: 12px 18px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(30px);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.6);
  gap: 12px;
  align-items: flex-end;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.chat-bar:focus-within {
  border-color: rgba(59, 130, 246, 0.2);
  box-shadow: 0 16px 40px rgba(59, 130, 246, 0.04), 0 12px 32px rgba(15, 23, 42, 0.03);
}

.hidden-file-input {
  display: none;
}

.attach-btn {
  width: 40px;
  min-width: 40px;
  height: 40px;
  padding: 0;
  font-size: 16px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  background: rgba(255, 255, 255, 0.8);
}

.chat-input-wrap {
  flex: 1;
  min-width: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  max-height: 70px;
  overflow-y: auto;
}

.attachment-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 260px;
  padding: 5px 10px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.95);
  color: var(--text-primary);
  font-size: 13px;
}

.attachment-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-chip small {
  color: var(--text-muted);
  white-space: nowrap;
  font-family: 'Share Tech Mono', monospace;
}

.attachment-chip button {
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 0 2px;
  transition: color 0.2s;
}

.attachment-chip button:hover {
  color: var(--accent-red);
}

.chat-bar textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  color: var(--text-primary);
  padding: 10px 14px;
  font-size: 15.0px;
  resize: none;
  outline: none;
  min-height: 40px;
  max-height: 150px;
  line-height: 1.5;
  transition: all 0.25s;
}

.chat-bar textarea:focus {
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
  background: #ffffff;
}

.chat-send {
  white-space: nowrap;
  height: 40px;
  border-radius: 10px;
  font-weight: 700;
  padding: 0 16px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

/* 文件差异和弹窗等 */
.diff-overlay {
  padding: 24px;
  background: rgba(15, 23, 42, 0.18);
}

.diff-modal {
  position: relative;
  width: min(1100px, 92vw);
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.85) !important;
  border: 1px solid rgba(0, 0, 0, 0.06) !important;
}

.diff-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  background: rgba(255, 255, 255, 0.5);
}

.diff-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 13.5px;
  font-family: 'JetBrains Mono', monospace;
  word-break: break-all;
}

.diff-sub {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
}

.diff-viewer {
  flex: 1;
  overflow: auto;
  background: rgba(15, 23, 42, 0.95);
  padding: 14px 0;
}

.diff-line {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  min-height: 20px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11.5px;
  line-height: 1.6;
  white-space: pre;
}

.diff-line code {
  padding: 0 16px;
  overflow: visible;
}

.diff-line-no {
  padding-right: 12px;
  color: var(--text-muted);
  text-align: right;
  user-select: none;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  opacity: 0.5;
}

.diff-line.add {
  background: rgba(16, 185, 129, 0.08);
  color: #a7f3d0;
}

.diff-line.remove {
  background: rgba(244, 63, 94, 0.08);
  color: #fecaca;
}

.diff-line.meta {
  background: rgba(59, 130, 246, 0.06);
  color: #67e8f9;
}

.diff-line.context {
  color: rgba(255, 255, 255, 0.7);
}

.diff-empty {
  padding: 56px 24px;
  color: var(--text-muted);
  text-align: center;
  font-size: 12px;
}

/* 空白占位态美化 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--text-muted);
  position: relative;
}

.empty::before {
  content: '';
  position: absolute;
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.04) 0%, transparent 70%);
  z-index: 0;
  pointer-events: none;
}

.empty .icon {
  font-size: 40px;
  opacity: 0.25;
  z-index: 1;
  animation: float-slow 4s ease-in-out infinite;
}

.empty span:not(.icon) {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
  z-index: 1;
}

@keyframes float-slow {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

.empty-sm {
  padding: 60px 20px;
  text-align: center;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  position: relative;
}

.empty-sm span:first-child {
  font-size: 24px;
  opacity: 0.3;
  animation: pulse 2.5s infinite ease-in-out;
}

.empty-sm span:last-child {
  color: var(--text-muted);
}

.icon {
  font-size: 32px;
  opacity: 0.4;
}

.agent-status {
  color: var(--text-muted);
  font-style: italic;
  font-size: 11.5px;
}

.stream-cursor {
  animation: pulse-glow 1s infinite ease-in-out;
  color: var(--accent-blue);
  font-weight: bold;
  display: inline;
  margin-left: 2px;
}

@keyframes pulse-glow {
  0%, 100% {
    opacity: 0.15;
    text-shadow: 0 0 0px rgba(59, 130, 246, 0);
  }
  50% {
    opacity: 1;
    text-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
  }
}

.thinking-bubble {
  background: rgba(99, 102, 241, 0.03);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
  padding: 14px 18px;
  margin-bottom: 16px;
  max-width: 85%;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.02);
  position: relative;
  overflow: hidden;
  animation: fade-in 0.3s ease-out;
}

.thinking-bubble::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 10% 10%, rgba(99, 102, 241, 0.05) 0%, transparent 80%);
  pointer-events: none;
  z-index: 0;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.thinking-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--accent-purple);
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
  position: relative;
  z-index: 1;
}

.thinking-icon {
  font-size: 15px;
  display: inline-block;
  animation: rotate-pulse 2.5s infinite linear;
}

@keyframes rotate-pulse {
  0% {
    transform: rotate(0deg) scale(1);
    opacity: 0.8;
  }
  50% {
    transform: rotate(180deg) scale(1.15);
    opacity: 1;
  }
  100% {
    transform: rotate(360deg) scale(1);
    opacity: 0.8;
  }
}

.thinking-content {
  font-size: 11.5px;
  color: var(--text-muted);
  line-height: 1.6;
  white-space: pre-wrap;
  font-family: 'JetBrains Mono', monospace;
  max-height: 200px;
  overflow-y: auto;
  position: relative;
  z-index: 1;
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  font-weight: 600;
}

.btn-primary {
  background: var(--gradient-blue);
  color: #ffffff;
}

.btn-outline {
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.08);
  color: var(--text-secondary);
}

.btn-danger {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.18);
  color: #dc2626;
}

.btn-cancel {
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0, 0, 0, 0.06);
  color: var(--text-secondary);
}

.btn-sm {
  padding: 5px 12px;
  font-size: 11px;
  border-radius: 6px;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.18);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: rgba(255, 255, 255, 0.75) !important;
  backdrop-filter: blur(40px) saturate(180%) !important;
  border: 1px solid rgba(0, 0, 0, 0.06) !important;
  border-radius: 16px !important;
  padding: 28px;
  min-width: 420px;
  position: relative;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08), 0 0 30px rgba(59, 130, 246, 0.04) !important;
}

.modal::before,
.modal::after {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  border: 2px solid rgba(59, 130, 246, 0.45);
  pointer-events: none;
}

.modal::before {
  top: -1px;
  left: -1px;
  border-right: none;
  border-bottom: none;
}

.modal::after {
  bottom: -1px;
  right: -1px;
  border-left: none;
  border-top: none;
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  background: rgba(0, 0, 0, 0.02);
  color: var(--text-secondary);
  cursor: pointer;
}

.form-group {
  margin-bottom: 18px;
}

.form-group label {
  display: block;
  font-size: 12.5px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.8);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
}

.form-group input:focus,
.form-group select:focus {
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.12);
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 24px;
}

.agent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.agent-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.25s;
  background: rgba(255, 255, 255, 0.4);
}

.agent-option:hover {
  border-color: rgba(59, 130, 246, 0.2);
  background: rgba(59, 130, 246, 0.03);
}

.agent-option.active {
  border-color: rgba(59, 130, 246, 0.35);
  background: rgba(59, 130, 246, 0.06);
}

.agent-name {
  font-size: 13.5px;
  color: var(--text-primary);
  font-weight: 600;
}

.agent-type {
  font-size: 11px;
  color: var(--text-muted);
  font-family: 'Share Tech Mono', monospace;
}

.logs-panel {
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  background: rgba(255, 255, 255, 0.65);
  height: 200px;
  overflow: hidden;
  transition: height 0.3s;
}

.logs-header {
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.02);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.logs-content {
  padding: 12px 16px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-muted);
  overflow-y: auto;
  height: calc(100% - 32px);
  white-space: pre-wrap;
  line-height: 1.5;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .pm-container {
    flex-direction: column;
  }
  .pm-sidebar {
    width: 100% !important;
    min-width: 0 !important;
    max-height: 40vh;
    border-right: none !important;
    border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  }
  .pm-sidebar .session-sidebar {
    width: 100% !important;
    min-width: 0 !important;
  }
  .chat-bar {
    flex-wrap: wrap;
    margin: 10px 16px;
    padding: 10px;
  }
  .chat-bar textarea {
    min-height: 60px;
  }
  .toolbar {
    flex-wrap: wrap;
    gap: 6px;
  }
  .modal-overlay {
    padding: 0 !important;
    align-items: flex-end !important;
  }
  .modal {
    min-width: 0 !important;
    width: 100% !important;
    max-height: 90vh;
    border-radius: 16px 16px 0 0 !important;
  }
}

.template-dropdown {
  position: absolute;
  bottom: 100%;
  left: 0;
  width: 400px;
  max-width: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  max-height: 250px;
  overflow: hidden;
  z-index: 10002;
  box-shadow: var(--shadow-lg);
  margin-bottom: 8px;
  display: flex;
  flex-direction: column;
}
[data-theme="dark"] .template-dropdown {
  background: var(--surface) !important;
  border-color: var(--border-color) !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
}

.recommendation-bubble {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.95) 0%, rgba(59, 130, 246, 0.95) 100%);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: white;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.15);
  animation: slide-up-recom 0.25s ease-out;
  z-index: 10003;
  white-space: nowrap;
}
.recommendation-bubble:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 25px rgba(59, 130, 246, 0.25);
  border-color: rgba(255, 255, 255, 0.25);
}
.recommendation-bubble .bulb {
  animation: rotate-pulse 2s infinite linear;
}
.recommendation-bubble .action {
  font-weight: 600;
  margin-left: 8px;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 4px;
}
@keyframes slide-up-recom {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.split-diff-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: transparent;
}
.split-left-pane {
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  overflow-x: auto;
}
.split-right-pane {
  overflow-x: auto;
}
.split-line-row {
  display: flex;
  align-items: center;
  min-height: 22px;
  padding: 0 12px;
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
}
.split-line-row .diff-line-no {
  width: 45px;
  text-align: right;
  padding-right: 8px;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  margin-right: 8px;
  user-select: none;
  color: var(--text-muted);
  opacity: 0.6;
}
.split-line-row .diff-sign {
  width: 14px;
  text-align: center;
  user-select: none;
  margin-right: 4px;
  font-weight: bold;
}
.split-line-row .diff-text {
  flex: 1;
  margin: 0;
  padding: 0;
  background: transparent;
  border: none;
  overflow: visible;
  white-space: pre;
}
.split-line-row .diff-text code {
  font-family: inherit;
  font-size: inherit;
  background: transparent;
  padding: 0;
  color: inherit;
}
.diff-empty-line {
  background: rgba(255, 255, 255, 0.02);
  min-height: 22px;
}

/* 搜索和高亮样式 */
.diff-search-input {
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  font-size: 12px;
  outline: none;
  background: rgba(255, 255, 255, 0.6);
  width: 180px;
}
.diff-search-input:focus { border-color: var(--accent-blue); }
[data-theme="dark"] .diff-search-input {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.word-remove { background-color: rgba(239, 68, 68, 0.28); text-decoration: line-through; border-radius: 2px; padding: 0 1px; }
.word-add { background-color: rgba(16, 185, 129, 0.28); font-weight: bold; border-radius: 2px; padding: 0 1px; }

.hl-comment { color: #6b7280; font-style: italic; }
.hl-string { color: #0d9488; }
.hl-keyword { color: #2563eb; font-weight: bold; }
.hl-number { color: #ea580c; }

[data-theme="dark"] .hl-comment { color: #9ca3af; }
[data-theme="dark"] .hl-string { color: #2dd4bf; }
[data-theme="dark"] .hl-keyword { color: #60a5fa; }
[data-theme="dark"] .hl-number { color: #f97316; }

.hl-match { background-color: rgba(234, 179, 8, 0.4); border-bottom: 2px solid #eab308; color: inherit; font-weight: bold; }
.agent-work-events {
  margin-top: 10px;
  border: 1px solid rgba(59, 130, 246, 0.14);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.035);
  overflow: hidden;
}
.work-events-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 9px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
}
.work-events-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  max-height: 260px;
  overflow-y: auto;
}
.work-event {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
}
.work-event-kind {
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(100, 116, 139, 0.1);
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
  text-align: center;
}
.work-event pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-secondary);
  font-family: Consolas, 'JetBrains Mono', monospace;
  font-size: 11px;
  line-height: 1.55;
}
.work-event.output pre { color: var(--text-primary); }
.work-event.ok .work-event-kind { background: rgba(34, 197, 94, 0.12); color: var(--accent-green); }
.work-event.fail .work-event-kind { background: rgba(239, 68, 68, 0.12); color: var(--accent-red); }
.work-event.output .work-event-kind { background: rgba(59, 130, 246, 0.1); color: var(--accent-blue); }

/* 消息节点锚点导航条 */
.msg-navigator {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 4px;
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.03);
  z-index: 100;
  max-height: 70%;
  overflow-y: auto;
}

:global([data-theme="dark"]) .msg-navigator {
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.navigator-dot {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.dot-bar {
  width: 8px;
  height: 2px;
  background: var(--text-muted);
  border-radius: 1px;
  opacity: 0.5;
  transition: all 0.2s;
}

.navigator-dot:hover .dot-bar {
  width: 14px;
  height: 3px;
  background: var(--accent-blue);
  opacity: 1;
}

/* Tooltip 悬停显示用户消息 */
.navigator-dot::after {
  content: attr(title);
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%) scale(0.85);
  background: rgba(15, 23, 42, 0.9);
  color: #ffffff;
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  transform-origin: right center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.navigator-dot:hover::after {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}
</style>

