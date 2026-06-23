<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { toast } from '../utils/toast.js'

const emit = defineEmits(['switch-tab', 'set-navigation'])

const SESSIONS_STORAGE_KEY = 'cc_global_assistant_sessions_v2'
const CURRENT_ID_STORAGE_KEY = 'cc_global_assistant_current_id_v2'

const DEFAULT_WELCOME = {
  role: 'assistant',
  content: '你好！我是您的全局助手。我可以帮您控制这整套系统。\n\n例如，您可以对我说：\n- 🎵 *"我想听 颜人中 的 晚安"* \n- 🐾 *"帮我把桌面宠物打开"* \n- 📂 *"帮我跳转到项目管理页面"* \n- 📋 *"创建一个开发任务：实现用户登录"* \n- 🛠️ *"帮我修改 smart-live-Cloud 项目，在登录接口加个日志"* \n- 💬 *"给 智评生活开发群 派发指令：修改前端首页适配的 bug"*',
  timestamp: new Date().toISOString()
}

const sessions = ref([])
const currentSessionId = ref('')
const isSidebarOpen = ref(true)

const currentSession = computed(() => {
  return sessions.value.find(s => s.id === currentSessionId.value) || null
})

const messages = computed(() => {
  return currentSession.value ? currentSession.value.messages : []
})

const loadHistory = () => {
  try {
    const savedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY)
    const savedCurrentId = localStorage.getItem(CURRENT_ID_STORAGE_KEY)
    
    if (savedSessions) {
      sessions.value = JSON.parse(savedSessions)
    }
    
    if (sessions.value.length === 0) {
      const defaultId = 'session_' + Date.now()
      sessions.value = [{
        id: defaultId,
        name: '默认会话',
        messages: [DEFAULT_WELCOME],
        createdAt: new Date().toISOString()
      }]
      currentSessionId.value = defaultId
    } else {
      currentSessionId.value = savedCurrentId || sessions.value[0].id
      if (!sessions.value.some(s => s.id === currentSessionId.value)) {
        currentSessionId.value = sessions.value[0].id
      }
    }
  } catch {
    const defaultId = 'session_' + Date.now()
    sessions.value = [{
      id: defaultId,
      name: '默认会话',
      messages: [DEFAULT_WELCOME],
      createdAt: new Date().toISOString()
    }]
    currentSessionId.value = defaultId
  }
}

const saveHistory = () => {
  try {
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions.value))
    localStorage.setItem(CURRENT_ID_STORAGE_KEY, currentSessionId.value)
    fetch('/api/global-agent/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessions: sessions.value, currentSessionId: currentSessionId.value })
    }).catch(() => {})
  } catch {}
}

const createNewSession = () => {
  const newId = 'session_' + Date.now()
  const newSession = {
    id: newId,
    name: '新会话',
    messages: [DEFAULT_WELCOME],
    createdAt: new Date().toISOString()
  }
  sessions.value.unshift(newSession)
  currentSessionId.value = newId
  saveHistory()
  toast.success('新建会话成功')
  scrollToBottom()
}

const selectSession = (id) => {
  currentSessionId.value = id
  saveHistory()
  isPinnedToBottom.value = true
  scrollToBottom({ force: true })
  setTimeout(() => scrollToBottom({ force: true }), 60)
  setTimeout(() => scrollToBottom({ force: true }), 200)
}

const deleteSession = (id, event) => {
  if (event) event.stopPropagation()
  
  const targetSession = sessions.value.find(s => s.id === id)
  const sessionName = targetSession ? targetSession.name : '该会话'
  
  if (confirm(`确定要删除会话「${sessionName}」吗？`)) {
    const idx = sessions.value.findIndex(s => s.id === id)
    if (idx !== -1) {
      sessions.value.splice(idx, 1)
      if (sessions.value.length === 0) {
        const defaultId = 'session_' + Date.now()
        sessions.value = [{
          id: defaultId,
          name: '默认会话',
          messages: [DEFAULT_WELCOME],
          createdAt: new Date().toISOString()
        }]
        currentSessionId.value = defaultId
      } else if (currentSessionId.value === id) {
        currentSessionId.value = sessions.value[0].id
      }
      saveHistory()
      toast.success('会话已删除')
      scrollToBottom()
    }
  }
}

const clearAllSessions = () => {
  if (confirm('确定清空所有的全局助手会话吗？此操作无法撤销。')) {
    const defaultId = 'session_' + Date.now()
    sessions.value = [{
      id: defaultId,
      name: '默认会话',
      messages: [DEFAULT_WELCOME],
      createdAt: new Date().toISOString()
    }]
    currentSessionId.value = defaultId
    saveHistory()
    toast.success('所有会话历史已清空！')
    scrollToBottom()
  }
}

const chatInput = ref('')
const isSending = ref(false)
const executingAction = ref(null)
const chatBody = ref(null)
const chatContentInner = ref(null)
const isPinnedToBottom = ref(true)
let globalAgentResizeObserver = null

// 附件上传与预览管理
const selectedFiles = ref([])
const fileInput = ref(null)
const zoomedImage = ref(null)
const openReports = ref({})

const triggerFileUpload = () => {
  if (fileInput.value) fileInput.value.click()
}

const handleFileChange = (e) => {
  const files = Array.from(e.target.files || [])
  files.forEach(f => {
    if (!selectedFiles.value.some(existing => existing.name === f.name && existing.size === f.size)) {
      if (f.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (event) => {
          selectedFiles.value.push({
            file: f,
            name: f.name,
            size: f.size,
            type: f.type,
            preview: event.target.result
          })
        }
        reader.readAsDataURL(f)
      } else {
        selectedFiles.value.push({
          file: f,
          name: f.name,
          size: f.size,
          type: f.type,
          preview: null
        })
      }
    }
  })
  e.target.value = ''
}

const removeSelectedFile = (idx) => {
  selectedFiles.value.splice(idx, 1)
}

const formatSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

const zoomImage = (url) => {
  zoomedImage.value = url
}

const closeZoom = () => {
  zoomedImage.value = null
}

const toggleReport = (key) => {
  openReports.value[key] = !openReports.value[key]
  nextTick(() => {
    scrollToBottom(true)
  })
}

const isReportOpen = (key) => {
  return !!openReports.value[key]
}

const isSystemReceipt = (content) => {
  return content && content.includes('[系统回执]')
}

const isProjectReport = (content) => {
  return content && (content.includes('的运行报告]:') || content.includes('[项目 Agent 运行失败]'))
}

const parseReceipt = (content) => {
  const result = {
    title: '系统回执',
    type: 'default',
    icon: '⚙️',
    details: []
  }
  if (!content) return result
  
  if (content.includes('📋 [系统回执]')) {
    result.title = '协作开发任务已派发'
    result.type = 'task'
    result.icon = '📋'
    const titleMatch = content.match(/-\s+\*\*任务标题\*\*:\s*([^\n]+)/)
    const goalMatch = content.match(/-\s+\*\*业务目标\*\*:\s*([^\n]+)/)
    const groupMatch = content.match(/-\s+\*\*分发群聊\*\*:\s*([^\n]+)/)
    const acceptMatch = content.match(/-\s+\*\*验收标准\*\*:\s*([^\n]+)/)
    if (titleMatch) result.details.push({ label: '任务标题', value: titleMatch[1] })
    if (goalMatch) result.details.push({ label: '业务目标', value: goalMatch[1] })
    if (groupMatch) result.details.push({ label: '目标群聊', value: groupMatch[1] })
    if (acceptMatch) result.details.push({ label: '验收标准', value: acceptMatch[1] })
  } else if (content.includes('⏰ [系统回执]')) {
    result.title = '定时开发任务已配置'
    result.type = 'cron'
    result.icon = '⏰'
    const nameMatch = content.match(/定时任务「([^」]+)」/)
    const scheduleMatch = content.match(/-\s+\*\*周期表达式\*\*:\s*`([^`]+)`/)
    const targetMatch = content.match(/-\s+\*\*目标类型\*\*:\s*([^\n]+)/)
    const promptMatch = content.match(/-\s+\*\*执行提示词\*\*:\s*["“]([^"”]+)["”]/)
    if (nameMatch) result.details.push({ label: '任务名称', value: nameMatch[1] })
    if (scheduleMatch) result.details.push({ label: 'Cron周期', value: scheduleMatch[1] })
    if (targetMatch) result.details.push({ label: '执行目标', value: targetMatch[1] })
    if (promptMatch) result.details.push({ label: '提示词', value: promptMatch[1] })
  } else if (content.includes('🎵 [系统回执]')) {
    result.title = '音乐点歌成功'
    result.type = 'music'
    result.icon = '🎵'
    const songMatch = content.match(/成功点歌《([^》]+)》/)
    const sourceMatch = content.match(/-\s+\*\*来源\*\*:\s*([^\n]+)/)
    const statusMatch = content.match(/-\s+\*\*状态\*\*:\s*([^\n]+)/)
    if (songMatch) result.details.push({ label: '音乐名称', value: songMatch[1] })
    if (sourceMatch) result.details.push({ label: '来源平台', value: sourceMatch[1] })
    if (statusMatch) result.details.push({ label: '播放状态', value: statusMatch[1] })
  } else if (content.includes('🐾 [系统回执]')) {
    result.title = '桌面宠物状态已变更'
    result.type = 'pet'
    result.icon = '🐾'
    const status = content.includes('唤醒') ? '已拉起在桌面显示' : '已在桌面隐藏'
    result.details.push({ label: '动作状态', value: status })
  } else if (content.includes('📂 [系统回执]')) {
    result.title = '项目绑定已完成'
    result.type = 'project'
    result.icon = '📂'
    const nameMatch = content.match(/项目「([^」]+)」/)
    const dirMatch = content.match(/-\s+\*\*物理路径\*\*:\s*`([^`]+)`/)
    const agentMatch = content.match(/-\s+\*\*内置 Agent 运行时\*\*:\s*`([^`]+)`/)
    if (nameMatch) result.details.push({ label: '项目名称', value: nameMatch[1] })
    if (dirMatch) result.details.push({ label: '本地工作目录', value: dirMatch[1] })
    if (agentMatch) result.details.push({ label: '运行内核', value: agentMatch[1] })
  } else if (content.includes('📚 [系统回执]')) {
    result.title = '模版保存成功'
    result.type = 'template'
    result.icon = '📚'
    const nameMatch = content.match(/对话模板「([^」]+)」/)
    const catMatch = content.match(/-\s+\*\*分类\*\*:\s*([^\n]+)/)
    const contentMatch = content.match(/>\s*([\s\S]*)/)
    if (nameMatch) result.details.push({ label: '模板名称', value: nameMatch[1] })
    if (catMatch) result.details.push({ label: '模版分类', value: catMatch[1] })
    if (contentMatch) result.details.push({ label: '模版详情', value: contentMatch[1].trim() })
  } else if (content.includes('⚙️ [系统回执]')) {
    result.title = '正在派发指令...'
    result.type = 'dispatch'
    result.icon = '⚙️'
    const projMatch = content.match(/正在向项目 Agent \[([^\]]+)\]/)
    const cmdMatch = content.match(/>\s*["“]([^"”]+)["”]/)
    if (projMatch) result.details.push({ label: '下发项目', value: projMatch[1] })
    if (cmdMatch) result.details.push({ label: '修改指令', value: cmdMatch[1] })
  } else if (content.includes('💬 [系统回执]')) {
    result.title = '群聊协作指令已下达'
    result.type = 'group'
    result.icon = '💬'
    result.details.push({ label: '状态说明', value: '协作指令派发成功，项目群组 Agent 已开始协同工作。' })
  }
  return result
}

const parseProjectReport = (content) => {
  const result = {
    projectName: '项目 Agent',
    success: true,
    title: '运行报告',
    body: ''
  }
  if (!content) return result
  
  if (content.includes('[项目 Agent 运行失败]')) {
    result.success = false
    result.title = '运行失败'
    const match = content.match(/❌ \[项目 Agent 运行失败\]:\s*([\s\S]*)/)
    result.body = match ? match[1].trim() : content
  } else {
    const nameMatch = content.match(/📂 \[项目 Agent -\s*([^\s\]]+)\s*的运行报告\]:/)
    result.projectName = nameMatch ? nameMatch[1] : '项目 Agent'
    const bodyMatch = content.match(/📂 \[项目 Agent - [^\s\]]+ 的运行报告\]:\s*([\s\S]*)/)
    result.body = bodyMatch ? bodyMatch[1].trim() : content
  }
  return result
}

const scrollToBottom = async (options = {}) => {
  await nextTick()
  if (chatBody.value) {
    const force = typeof options === 'boolean' ? false : !!options.force
    const smooth = typeof options === 'boolean' ? options : !!options.smooth
    
    if (force || isPinnedToBottom.value) {
      if (smooth) {
        chatBody.value.scrollTo({
          top: chatBody.value.scrollHeight,
          behavior: 'smooth'
        })
      } else {
        chatBody.value.scrollTop = chatBody.value.scrollHeight
      }
      isPinnedToBottom.value = true
    }
  }
}

const isNearBottom = () => {
  const el = chatBody.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight <= 120
}

const updateScrollState = () => {
  isPinnedToBottom.value = isNearBottom()
}

const setupResizeObserver = () => {
  if (typeof ResizeObserver === 'undefined') return
  if (globalAgentResizeObserver) {
    globalAgentResizeObserver.disconnect()
  }
  globalAgentResizeObserver = new ResizeObserver(() => {
    if (isPinnedToBottom.value && chatBody.value) {
      chatBody.value.scrollTop = chatBody.value.scrollHeight
    }
  })
  if (chatContentInner.value) {
    globalAgentResizeObserver.observe(chatContentInner.value)
  }
}


const addAssistantMessage = (content, extra = {}) => {
  if (!currentSession.value) return
  currentSession.value.messages.push({
    role: 'assistant',
    content,
    timestamp: new Date().toISOString(),
    ...extra
  })
  saveHistory()
  scrollToBottom(true)
}

const missionPollTimers = new Map()

const stopMissionTracking = (missionId) => {
  const timer = missionPollTimers.get(missionId)
  if (timer) clearInterval(timer)
  missionPollTimers.delete(missionId)
}

const trackGlobalMission = (missionId, sessionId) => {
  if (!missionId || missionPollTimers.has(missionId)) return
  const refresh = async () => {
    try {
      const res = await fetch('/api/global-agent/missions?id=' + encodeURIComponent(missionId))
      const data = await res.json()
      if (!res.ok || data.success === false) return
      const session = sessions.value.find(item => item.id === sessionId)
      if (!session) return
      const message = session.messages.find(item => item.type === 'global_mission' && item.globalMission?.id === missionId)
      if (!message) return
      message.globalMission = data.mission
      message.globalMissionChildren = (data.children || []).map(task => ({ task, target: task.mission_target || null }))
      if (data.mission?.status === 'done' && !message.finalNotified) {
        message.finalNotified = true
        session.messages.push({
          role: 'assistant',
          type: 'global_mission_complete',
          content: '全局任务已通过全部交付门禁：' + (data.mission.title || missionId),
          globalMission: data.mission,
          globalMissionChildren: (data.children || []).map(task => ({ task, target: task.mission_target || null })),
          timestamp: new Date().toISOString()
        })
        stopMissionTracking(missionId)
      }
      saveHistory()
      scrollToBottom()
    } catch {}
  }
  missionPollTimers.set(missionId, setInterval(refresh, 4000))
  refresh()
}

const missionStatusLabel = (mission) => {
  if (mission?.status === 'done') return '全部通过'
  const summary = mission?.mission_summary || {}
  if (summary.failed > 0) return '存在失败'
  if (summary.blocked > 0) return '需要处理'
  return '执行中'
}

const childStatusLabel = (child) => {
  if (child?.status === 'done' && child?.delivery_summary?.acceptance_gate_passed === true) return '门禁通过'
  if (child?.status === 'done') return '等待总验收'
  if (child?.status === 'failed') return '执行失败'
  if (child?.status === 'in_progress') return '执行中'
  return '排队中'
}

const getActionParam = (action, ...keys) => {
  const params = action?.params || {}
  for (const key of keys) {
    const value = params[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return ''
}

watch(messages, () => {
  scrollToBottom()
}, { deep: true, immediate: true, flush: 'post' })

watch(currentSessionId, () => {
  scrollToBottom()
}, { flush: 'post' })

const sendMessage = async () => {
  if ((!chatInput.value.trim() && selectedFiles.value.length === 0) || isSending.value) return
  if (!currentSession.value) {
    createNewSession()
  }
  
  const userText = chatInput.value.trim()
  const attachedFiles = [...selectedFiles.value]
  
  chatInput.value = ''
  selectedFiles.value = []
  
  // 自动命名新会话
  if (currentSession.value.name === '新会话' || currentSession.value.name === '默认会话') {
    const nameSource = userText || (attachedFiles.length > 0 ? `附件: ${attachedFiles[0].name}` : '新会话')
    currentSession.value.name = nameSource.slice(0, 12) + (nameSource.length > 12 ? '...' : '')
  }
  
  // 构建前端渲染的历史消息（带附件）
  const newMessage = {
    role: 'user',
    content: userText,
    timestamp: new Date().toISOString(),
    files: attachedFiles.map(f => ({
      name: f.name,
      size: f.size,
      preview: f.preview,
      type: f.type
    }))
  }
  
  currentSession.value.messages.push(newMessage)
  saveHistory()
  scrollToBottom()
  
  isSending.value = true
  
  try {
    const historyPayload = currentSession.value.messages.slice(0, -1).map(m => ({
      role: m.role,
      content: m.content
    }))
    
    let res
    if (attachedFiles.length > 0) {
      const formData = new FormData()
      formData.append('message', userText)
      formData.append('history', JSON.stringify(historyPayload))
      attachedFiles.forEach((f, idx) => {
        formData.append(`file_${idx}`, f.file)
      })
      res = await fetch('/api/global-agent/chat', {
        method: 'POST',
        body: formData
      })
    } else {
      res = await fetch('/api/global-agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText, history: historyPayload })
      })
    }
    
    const data = await res.json()
    if (data.error) {
      currentSession.value.messages.push({
        role: 'assistant',
        content: `❌ 出错啦: ${data.error}`,
        timestamp: new Date().toISOString()
      })
      saveHistory()
    } else {
      currentSession.value.messages.push({
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toISOString(),
        files: data.files || []
      })
      saveHistory()
      
      if (data.action) {
        await executeAction(data.action, data.files || [])
      }
    }
  } catch (err) {
    currentSession.value.messages.push({
      role: 'assistant',
      content: `❌ 连接服务器失败，请检查网络或配置。`,
      timestamp: new Date().toISOString()
    })
    saveHistory()
  } finally {
    isSending.value = false
    scrollToBottom()
  }
}

const processBridgeRequest = async (request) => {
  if (!request?.id || !request.text || !currentSession.value) return
  const startIndex = currentSession.value.messages.length
  const userText = String(request.text || '').trim()
  currentSession.value.messages.push({
    role: 'user',
    content: userText,
    timestamp: new Date().toISOString(),
    source: 'feishu-control-bot'
  })
  saveHistory()
  scrollToBottom()
  isSending.value = true
  try {
    const historyPayload = currentSession.value.messages.slice(0, -1).map(m => ({ role: m.role, content: m.content }))
    const res = await fetch('/api/global-agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userText, history: historyPayload })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    currentSession.value.messages.push({
      role: 'assistant',
      content: data.reply,
      timestamp: new Date().toISOString(),
      files: data.files || [],
      source: 'feishu-control-bot'
    })
    saveHistory()
    if (data.action) await executeAction(data.action, data.files || [])
    const assistantReplies = currentSession.value.messages.slice(startIndex).filter(m => m.role === 'assistant').map(m => m.content).filter(Boolean)
    await postJson('/api/global-agent/bridge/result', {
      id: request.id,
      success: true,
      reply: assistantReplies.join('\n\n') || data.reply || '已完成'
    })
  } catch (err) {
    const message = err?.message || '全局 Agent 控制台处理飞书消息失败'
    currentSession.value.messages.push({ role: 'assistant', content: `❌ ${message}`, timestamp: new Date().toISOString(), source: 'feishu-control-bot' })
    saveHistory()
    await postJson('/api/global-agent/bridge/result', { id: request.id, success: false, error: message }).catch(() => {})
  } finally {
    isSending.value = false
    scrollToBottom()
  }
}

let bridgePollTimer = null
let bridgeProcessing = false
const pollBridgeRequests = async () => {
  if (bridgeProcessing || !currentSession.value) return
  try {
    const res = await fetch('/api/global-agent/bridge/pending')
    const data = await res.json()
    if (!data.request) return
    bridgeProcessing = true
    await processBridgeRequest(data.request)
  } catch {
  } finally {
    bridgeProcessing = false
  }
}

const managementActionTypes = new Set(['manage_cron', 'manage_group', 'manage_project', 'manage_task', 'manage_tool', 'system_status'])

const requestJson = async (url, options = {}) => {
  const res = await fetch(url, options)
  const data = await res.json()
  if (!res.ok || data.success === false || data.error) throw new Error(data.error || '管理操作失败')
  return data
}

const postJson = (url, body = {}) => requestJson(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
})

const recordManagementAudit = async (action, status, result = {}) => {
  try {
    await postJson('/api/global-agent/audit', {
      action,
      status,
      result,
      session_id: currentSessionId.value
    })
  } catch {}
}

const managementTargetLabel = (action) => {
  const params = action?.params || {}
  return params.name || params.project || params.id || params.group_id || params.kind || 'CCM 系统'
}

const managementDetails = (action, result) => {
  const params = action?.params || {}
  const operation = params.operation || 'inspect'
  const details = [
    { label: '能力', value: action.capability || action.type },
    { label: '操作', value: operation },
    { label: '目标', value: managementTargetLabel(action) }
  ]
  if (action.type === 'system_status') {
    details.push(
      { label: '项目', value: String(result.projects?.projects?.length || 0) + ' 个，运行 ' + String((result.projects?.projects || []).filter(item => item.running).length) + ' 个' },
      { label: '群聊', value: String(result.groups?.groups?.length || 0) + ' 个' },
      { label: '任务', value: String(result.tasks?.tasks?.length || 0) + ' 个，进行中 ' + String((result.tasks?.tasks || []).filter(item => item.status === 'in_progress').length) + ' 个' },
      { label: '定时任务', value: String(result.cron?.jobs?.length || 0) + ' 个，启用 ' + String((result.cron?.jobs || []).filter(item => item.enabled).length) + ' 个' }
    )
  } else if (operation === 'list') {
    const rows = result.jobs || result.groups || result.projects || result.tasks || result.tools || result.skills || []
    details.push({ label: '数量', value: String(rows.length || 0) })
    const names = rows.slice(0, 8).map(item => item.name || item.title || item.id).filter(Boolean)
    if (names.length) details.push({ label: '项目', value: names.join('、') })
  } else if (result.message) {
    details.push({ label: '结果', value: result.message })
  } else {
    details.push({ label: '结果', value: '操作执行成功' })
  }
  return details
}

const executeManagementAction = async (action) => {
  const params = { ...(action.params || {}) }
  const operation = params.operation || (action.type === 'system_status' ? 'inspect' : '')
  const target = managementTargetLabel(action)
  if (action.needs_user_input || action.validated === false) {
    const missing = (action.missing_params || []).join('、') || '必要参数'
    await recordManagementAudit(action, 'invalid', { missing_params: action.missing_params || [] })
    addAssistantMessage('管理操作需要补充参数：' + missing, {
      type: 'management_action',
      managementReceipt: {
        success: false,
        title: '需要补充参数',
        details: [...managementDetails(action, {}), { label: '缺少参数', value: missing }]
      }
    })
    toast.info('请补充管理操作参数')
    return
  }
  if (action.requires_confirmation) {
    const confirmed = window.confirm('高风险操作确认\n\n能力：' + (action.capability || action.type) + '\n操作：' + operation + '\n目标：' + target + '\n\n此操作可能不可恢复，确定继续吗？')
    if (!confirmed) {
      await recordManagementAudit(action, 'cancelled', { reason: 'user_cancelled' })
      addAssistantMessage('管理操作已取消：' + operation + ' ' + target, {
        type: 'management_action',
        managementReceipt: { success: false, cancelled: true, title: '操作已取消', details: managementDetails(action, {}) }
      })
      return
    }
  }

  let result
  try {
    if (action.type === 'system_status') {
      const [projects, groups, tasks, cron, tools] = await Promise.all([
        requestJson('/api/projects'),
        requestJson('/api/groups'),
        requestJson('/api/tasks'),
        requestJson('/api/cron'),
        requestJson('/api/tools/status')
      ])
      result = { success: true, projects, groups, tasks, cron, tools }
    } else if (action.type === 'manage_cron') {
      if (operation === 'list') result = await requestJson('/api/cron')
      else if (operation === 'create') result = await postJson('/api/cron/create', params)
      else if (operation === 'update') result = await postJson('/api/cron/update', params)
      else if (operation === 'enable' || operation === 'disable') result = await postJson('/api/cron/update', { id: params.id, enabled: operation === 'enable' })
      else if (operation === 'run') result = await postJson('/api/cron/run', { id: params.id })
      else if (operation === 'delete') result = await postJson('/api/cron/delete', { id: params.id })
    } else if (action.type === 'manage_group') {
      if (operation === 'list') result = await requestJson('/api/groups')
      else if (operation === 'create') result = await postJson('/api/groups/create', { name: params.name, members: params.members || (params.project ? [{ project: params.project }] : []) })
      else if (operation === 'rename') result = await postJson('/api/groups/rename', { id: params.id || params.group_id, name: params.name })
      else if (operation === 'add_member') result = await postJson('/api/groups/members', { id: params.id || params.group_id, add: params.members || [{ project: params.project }] })
      else if (operation === 'remove_member') result = await postJson('/api/groups/members', { id: params.id || params.group_id, remove: params.projects || [params.project] })
      else if (operation === 'delete') result = await postJson('/api/groups/delete', { id: params.id || params.group_id })
    } else if (action.type === 'manage_project') {
      const project = params.project || params.name
      if (operation === 'list') result = await requestJson('/api/projects')
      else if (operation === 'create') result = await postJson('/api/projects/create', params)
      else if (operation === 'update') result = await postJson('/api/projects/update', { ...params, name: project })
      else if (operation === 'start') result = await postJson('/api/start', { project, agent: params.agent })
      else if (operation === 'stop') result = await postJson('/api/stop', { project })
      else if (operation === 'delete') result = await postJson('/api/projects/delete', { name: project })
    } else if (action.type === 'manage_task') {
      const id = params.id || params.task_id
      if (operation === 'list') result = await requestJson('/api/tasks')
      else if (operation === 'pause') result = await postJson('/api/tasks/update', { id, status: 'paused', status_detail: '由全局 Agent暂停' })
      else if (operation === 'resume') {
        await postJson('/api/tasks/update', { id, status: 'pending', status_detail: '由全局 Agent恢复' })
        result = await postJson('/api/tasks/queue', { task_id: id })
      } else if (operation === 'continue') result = await postJson('/api/tasks/continue', { id, message: params.message || '由全局 Agent继续推进', auto_execute: true })
      else if (operation === 'retry') result = await postJson('/api/tasks/retry', { id, reason: params.message || '由全局 Agent发起重试', auto_execute: true })
      else if (operation === 'queue') result = await postJson('/api/tasks/queue', { task_id: id })
      else if (operation === 'delete') result = await postJson('/api/tasks/delete', { id })
    } else if (action.type === 'manage_tool') {
      const kind = params.kind === 'skill' ? 'skill' : 'mcp'
      if (operation === 'status') result = await requestJson('/api/tools/status')
      else if (operation === 'reload') result = await postJson('/api/tools/reload')
      else if (operation === 'list') result = await requestJson(kind === 'skill' ? '/api/skills' : '/api/mcp')
      else if (operation === 'create') {
        const payload = { ...params }
        delete payload.operation
        delete payload.kind
        result = await postJson(kind === 'skill' ? '/api/skills' : '/api/mcp', payload)
      } else if (operation === 'delete') {
        result = await postJson(kind === 'skill' ? '/api/skills/delete' : '/api/mcp/delete', { name: params.name })
      }
    }
    if (!result) throw new Error('不支持的管理操作：' + action.type + '/' + operation)
    await recordManagementAudit(action, 'success', result)
    addAssistantMessage('系统管理操作已完成：' + operation + ' ' + target, {
      type: 'management_action',
      managementReceipt: { success: true, title: action.capability || '系统管理', details: managementDetails(action, result) }
    })
    toast.success('系统管理操作已完成')
  } catch (error) {
    await recordManagementAudit(action, 'failed', { error: error?.message || String(error) })
    addAssistantMessage('系统管理操作失败：' + (error?.message || error), {
      type: 'management_action',
      managementReceipt: {
        success: false,
        title: (action.capability || '系统管理') + '失败',
        details: [...managementDetails(action, {}), { label: '错误', value: error?.message || String(error) }]
      }
    })
    toast.error(error?.message || '系统管理操作失败')
  }
}

const executeAction = async (action, actionFiles = []) => {
  executingAction.value = action
  scrollToBottom()

  try {
    if (managementActionTypes.has(action.type)) {
      await executeManagementAction(action)
    } else if (action.type === 'play_music') {
      const keyword = getActionParam(action, 'keyword', 'query', 'song')
      toast.info(`正在为您后台检索并播放《${keyword}》...`)
      if (typeof window.__cc_global_play_music === 'function') {
        try {
          const result = await window.__cc_global_play_music(keyword)
          if (result.success) {
            toast.success(`找到音乐《${result.title}》(${result.source})，已开始播放！`)
            addAssistantMessage(`🎵 [系统回执] 成功点歌《${result.title}》！\n- **来源**: ${result.source}\n- **状态**: 正在后台播放中...`)
          } else {
            toast.error(`播放失败: ${result.error}`)
            addAssistantMessage(`❌ [音乐播放失败]: ${result.error || '未找到可播放的音乐'}`)
          }
        } catch (err) {
          toast.error(`播放出错: ${err.message || err}`)
          addAssistantMessage(`❌ [音乐播放失败]: ${err.message || err}`)
        }
      } else {
        toast.error('音乐播放器组件未准备就绪')
        addAssistantMessage('❌ [音乐播放失败]: 音乐播放器组件未准备就绪，请稍后重试。')
      }
    } else if (action.type === 'toggle_pet') {
      const petAction = getActionParam(action, 'action', 'operation')
      const isLaunch = petAction !== 'close'
      toast.info(isLaunch ? '正在拉起桌面宠物...' : '正在关闭桌面宠物...')
      const petRes = await fetch(isLaunch ? '/api/pets/launch' : '/api/pets/close', {
        method: 'POST'
      })
      const petData = await petRes.json()
      if (petData.success) {
        toast.success(isLaunch ? '桌面宠物已成功在桌面唤醒！🐾' : '桌面宠物已成功隐藏。')
        addAssistantMessage(`🐾 [系统回执] 桌面宠物已成功${isLaunch ? '在您的桌面唤醒且可见' : '从桌面隐藏关闭'}。`)
      } else {
        toast.error(`宠物控制失败: ${petData.error || '未知原因'}`)
        addAssistantMessage(`❌ [宠物控制失败]: ${petData.error || '未知原因'}`)
      }
    } else if (action.type === 'navigate') {
      const tab = getActionParam(action, 'tab')
      toast.success('正在为您跳转页面...')
      addAssistantMessage(`🧭 [系统回执] 已为您切换到「${tab}」页面。`)
      setTimeout(() => {
        emit('switch-tab', tab)
      }, 300)
    } else if (action.type === 'orchestrate_development') {
      const params = action.params || {}
      const title = getActionParam(action, 'title', 'name') || '全局跨项目开发任务'
      const businessGoal = getActionParam(action, 'business_goal', 'businessGoal', 'goal') || title
      toast.info('全局 Agent正在建立跨项目总计划...')
      const missionRes = await fetch('/api/global-agent/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          title,
          business_goal: businessGoal,
          source_documents: getActionParam(action, 'documents', 'source_documents', 'sourceDocuments') || '',
          source_attachments: actionFiles,
          auto_execute: true,
          source: 'global-agent-chat'
        })
      })
      const missionData = await missionRes.json()
      if (!missionRes.ok || missionData.success === false) {
        throw new Error(missionData.error || '全局开发任务创建失败')
      }
      const childRows = (missionData.children || []).map(item => ({
        task: item.task,
        target: item.target,
        queue_result: item.queue_result
      }))
      addAssistantMessage(
        '[系统回执] 全局开发任务已创建并完成跨项目派发。\n- 任务编号: ' + missionData.mission.id +
        '\n- 任务标题: ' + missionData.mission.title +
        '\n- 执行目标: ' + childRows.length +
        '\n- 完成条件: 所有子任务通过交付门禁',
        {
          type: 'global_mission',
          globalMission: missionData.mission,
          globalMissionChildren: childRows
        }
      )
      toast.success('全局任务已派发给 ' + childRows.length + ' 个执行目标')
      trackGlobalMission(missionData.mission.id, currentSessionId.value)
    } else if (action.type === 'create_task') {
      const title = getActionParam(action, 'title', 'name') || '全局助手派发任务'
      const groupId = getActionParam(action, 'group_id', 'groupId') || 'gmps7ha15'
      const businessGoal = getActionParam(action, 'business_goal', 'businessGoal') || title
      const acceptance = getActionParam(action, 'acceptance', 'acceptance_criteria', 'acceptanceCriteria') || '子 Agent 提供回执；主 Agent 输出最终报告'
      toast.info(`正在为您派发协作任务: ${title}...`)
      const taskRes = await fetch('/api/tasks/create-daily-dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          group_id: groupId,
          business_goal: businessGoal,
          scope: getActionParam(action, 'scope') || '',
          documents: '',
          acceptance,
          persist_documents: true,
          auto_execute: true
        })
      })
      const taskData = await taskRes.json()
      if (taskData.success) {
        toast.success('任务派发成功！')
        addAssistantMessage(`📋 [系统回执] 协作开发任务已成功派发并进入后台自动执行队列！\n- **任务标题**: ${title}\n- **业务目标**: ${businessGoal}\n- **分发群聊**: ${groupId}\n- **验收标准**: ${acceptance}`)
      } else {
        toast.error(`任务派发失败: ${taskData.error || '未知错误'}`)
        addAssistantMessage(`❌ [任务派发失败]: ${taskData.error || '未知错误'}`)
      }
    } else if (action.type === 'send_project_cmd') {
      const project = getActionParam(action, 'project', 'projectName')
      const message = getActionParam(action, 'message', 'prompt', 'command')
      toast.info(`正在向项目 Agent [${project}] 下发指令...`)
      addAssistantMessage(`⚙️ [系统回执] 正在向项目 Agent [${project}] 下发指令：\n> "${message}"\n\n项目 Agent 正在启动并执行指令。由于需要运行代码分析及构建链验证，此过程通常需要 1 到 2 分钟，请稍候...`)

      isSending.value = true
      try {
        const sendRes = await fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project, message })
        })
        const sendData = await sendRes.json()
        isSending.value = false
        if (sendData.success) {
          addAssistantMessage(`📂 [项目 Agent - ${project} 的运行报告]:\n\n${sendData.output}`)
        } else {
          addAssistantMessage(`❌ [项目 Agent 运行失败]: ${sendData.error || '未知错误'}`)
        }
      } catch (err) {
        isSending.value = false
        addAssistantMessage('❌ 调起项目 Agent 发送指令时，连接超时或失败')
      }
    } else if (action.type === 'send_group_cmd') {
      const groupId = getActionParam(action, 'group_id', 'groupId')
      const message = getActionParam(action, 'message', 'prompt', 'command')
      const targetProject = getActionParam(action, 'target_project', 'targetProject') || 'coordinator'
      toast.info(`正在向群聊协调者 [${groupId}] 派发指令...`)
      addAssistantMessage(`⚙️ [系统回执] 正在向群聊协作组 [ID: ${groupId}] 派发协作指令：\n> "${message}"`)

      try {
        const groupRes = await fetch('/api/groups/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            group_id: groupId,
            target_project: targetProject,
            message
          })
        })
        const groupData = await groupRes.json()
        if (groupData.success) {
          const reply = groupData.reply ? `\n\n主 Agent 回执：\n${groupData.reply}` : ''
          addAssistantMessage(`💬 [系统回执] 协作指令派发成功！群聊主 Agent 已收到指令并开始处理。${reply}`)
        } else {
          addAssistantMessage(`❌ [派发协作指令失败]: ${groupData.error || '未知原因'}`)
        }
      } catch (err) {
        addAssistantMessage('❌ 派发协作指令到群聊时，网络连接出错')
      }
    } else if (action.type === 'create_cron_task') {
      const name = getActionParam(action, 'name', 'title') || '全局助手定时任务'
      const targetType = getActionParam(action, 'target_type', 'targetType') || (getActionParam(action, 'group_id', 'groupId') ? 'group' : 'project')
      const groupId = getActionParam(action, 'group_id', 'groupId') || null
      const project = getActionParam(action, 'project', 'projectName')
      const schedule = getActionParam(action, 'schedule', 'cron')
      const prompt = getActionParam(action, 'prompt', 'message', 'command')
      toast.info(`正在为您自动创建定时任务: ${name}...`)
      const cronRes = await fetch('/api/cron/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          schedule,
          prompt,
          target_type: targetType,
          group_id: groupId,
          project,
          workflow_type: 'general',
          enabled: true
        })
      })
      const cronData = await cronRes.json()
      if (cronData.success) {
        toast.success(`定时任务「${name}」创建成功！`)
        addAssistantMessage(`⏰ [系统回执] 定时任务「${name}」已成功配置并创建！\n- **周期表达式**: \`${schedule}\`\n- **目标类型**: ${targetType === 'group' ? '群聊' : '项目'}\n- **执行提示词**: "${prompt}"`)
      } else {
        toast.error(`创建定时任务失败: ${cronData.error || '未知错误'}`)
        addAssistantMessage(`❌ [定时任务创建失败]: ${cronData.error || '未知错误'}`)
      }
    } else if (action.type === 'control_project') {
      const project = getActionParam(action, 'project', 'projectName')
      const lifecycleAction = getActionParam(action, 'action', 'operation') || 'start'
      const isStart = lifecycleAction !== 'stop'
      const agent = getActionParam(action, 'agent') || 'claudecode'
      toast.info(isStart ? `正在启动项目「${project}」...` : `正在停止项目「${project}」...`)
      const projectRes = await fetch(isStart ? '/api/start' : '/api/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isStart ? { project, agent } : { project })
      })
      const projectData = await projectRes.json()
      if (projectData.success) {
        const detail = isStart && projectData.pid ? `\n- **进程 PID**: ${projectData.pid}` : ''
        toast.success(isStart ? `项目「${project}」已启动` : `项目「${project}」已停止`)
        addAssistantMessage(`🚀 [系统回执] 项目「${project}」已${isStart ? '启动' : '停止'}。\n- **动作**: ${isStart ? '启动项目' : '停止项目'}\n- **运行时**: ${agent}${detail}`)
      } else {
        const reason = projectData.error || '未知错误'
        toast.error(isStart ? `启动项目失败: ${reason}` : `停止项目失败: ${reason}`)
        addAssistantMessage(`❌ [项目${isStart ? '启动' : '停止'}失败]: ${reason}`)
      }
    } else if (action.type === 'create_project') {
      toast.info(`正在为您自动创建项目: ${action.params.name}...`)
      const projRes = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: action.params.name,
          work_dir: action.params.work_dir,
          agent: action.params.agent || 'claudecode',
          platform: '',
          platform_options: {}
        })
      })
      const projData = await projRes.json()
      if (projData.success) {
        toast.success(`项目「${action.params.name}」创建成功！`)
        addAssistantMessage(`📂 [系统回执] 项目「${action.params.name}」已成功创建并绑定！\n- **物理路径**: \`${action.params.work_dir}\`\n- **内置 Agent 运行时**: \`${action.params.agent || 'claudecode'}\``)
      } else {
        toast.error(`创建项目失败: ${projData.error || '未知错误'}`)
        addAssistantMessage(`❌ [项目创建失败]: ${projData.error || '未知错误'}`)
      }
    } else if (action.type === 'create_template') {
      const templateContent = getActionParam(action, 'content', 'prompt', 'message')
      toast.info(`正在为您自动创建对话模板: ${action.params.name}...`)
      const tplRes = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: action.params.name,
          category: action.params.category || 'custom',
          prompt: templateContent
        })
      })
      const tplData = await tplRes.json()
      if (tplData.success) {
        toast.success(`对话模板「${action.params.name}」创建成功！`)
        addAssistantMessage(`📚 [系统回执] 对话模板「${action.params.name}」已成功创建并保存！\n- **分类**: ${action.params.category || 'custom'}\n- **模板内容**:\n> ${templateContent}`)
      } else {
        toast.error(`创建对话模板失败: ${tplData.error || '未知错误'}`)
        addAssistantMessage(`❌ [对话模板创建失败]: ${tplData.error || '未知错误'}`)
      }
    } else if (action.type === 'git_review') {
      const project = getActionParam(action, 'project', 'projectName')
      if (!project) {
        addAssistantMessage('❌ [动作执行失败]: 动作 `git_review` 缺少必须的 `project` 参数。')
        return
      }

      addAssistantMessage('', {
        type: 'git_review',
        project,
        loading: true
      })

      // 释放执行指示器
      setTimeout(() => { executingAction.value = null; }, 500);

      const msgs = currentSession.value.messages
      const lastMsg = msgs[msgs.length - 1]
      try {
        const res = await fetch('/api/global-agent/git-review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project })
        })
        const data = await res.json()
        lastMsg.loading = false
        if (data.success) {
          lastMsg.content = data.review
        } else {
          lastMsg.error = data.error || '未获取到审查报告'
        }
      } catch (err) {
        lastMsg.loading = false
        lastMsg.error = err.message || err || '请求代码审查失败'
      }
      saveHistory()

    } else if (action.type === 'git_commit') {
      const project = getActionParam(action, 'project', 'projectName')
      const defaultMsg = getActionParam(action, 'message', 'commitMessage') || ''
      if (!project) {
        addAssistantMessage('❌ [动作执行失败]: 动作 `git_commit` 缺少必须的 `project` 参数。')
        return
      }

      addAssistantMessage('', {
        type: 'git_commit',
        project,
        commitMessage: defaultMsg,
        loadingFiles: true,
        gitFiles: [],
        submitting: false,
        submitSuccess: false,
        submitError: null
      })

      // 释放执行指示器
      setTimeout(() => { executingAction.value = null; }, 500);

      const msgs = currentSession.value.messages
      const lastMsg = msgs[msgs.length - 1]
      try {
        const res = await fetch(`/api/git/status?project=${encodeURIComponent(project)}`)
        const data = await res.json()
        lastMsg.loadingFiles = false
        if (data.success) {
          lastMsg.gitFiles = (data.files || []).map(f => ({
            path: f.path,
            status: f.status,
            selected: true
          }))
          if (!lastMsg.commitMessage) {
            lastMsg.commitMessage = 'feat: 自动代码变更提交'
          }
        } else {
          lastMsg.fetchError = '获取 Git 状态失败: ' + (data.error || '未知原因')
        }
      } catch (err) {
        lastMsg.loadingFiles = false
        lastMsg.fetchError = '拉取 Git 状态出错: ' + err.message
      }
      saveHistory()
    }
  } catch (err) {
    toast.error('动作执行出错，请检查系统日志')
    addAssistantMessage(`❌ [动作执行出错]: ${err.message || err || '未知错误'}`)
  } finally {
    setTimeout(() => {
      executingAction.value = null
    }, 2000)
  }
}

onMounted(() => {
  loadHistory()
  saveHistory()
  for (const session of sessions.value) {
    for (const message of session.messages || []) {
      if (message.type === 'global_mission' && message.globalMission?.id && message.globalMission?.status !== 'done') {
        trackGlobalMission(message.globalMission.id, session.id)
      }
    }
  }
  isPinnedToBottom.value = true
  setupResizeObserver()
  scrollToBottom({ force: true })
  setTimeout(() => scrollToBottom({ force: true }), 80)
  setTimeout(() => scrollToBottom({ force: true }), 250)
  pollBridgeRequests()
  bridgePollTimer = setInterval(pollBridgeRequests, 1500)
})

onUnmounted(() => {
  if (bridgePollTimer) clearInterval(bridgePollTimer)
  for (const timer of missionPollTimers.values()) clearInterval(timer)
  missionPollTimers.clear()
  if (globalAgentResizeObserver) {
    globalAgentResizeObserver.disconnect()
    globalAgentResizeObserver = null
  }
})

const renderMarkdown = (text) => {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  html = html.replace(/```(diff|javascript|typescript|js|ts|json|html|css|bash)?([\s\S]*?)```/g, (match, lang, code) => {
    return `<pre style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); padding: 12px; border-radius: 6px; font-family: monospace; overflow-x: auto; color: #e5c07b; margin: 12px 0;"><code>${code.trim()}</code></pre>`;
  });
  
  html = html.replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #e06c75;">$1</code>');
  html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong style="color: #61afef;">$1</strong>');
  
  html = html.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, title) => {
    const level = hashes.length;
    const sizes = ['20px', '18px', '16px', '15px', '14px', '13px'];
    const size = sizes[level - 1] || '14px';
    return `<h${level} style="font-size: ${size}; font-weight: bold; margin-top: 16px; margin-bottom: 8px; color: #fff;">${title}</h${level}>`;
  });
  
  html = html.replace(/\n/g, '<br>');
  return html;
}

const getGitStatusColor = (status) => {
  if (!status) return '#aaa';
  const s = status.trim().toUpperCase();
  if (s === 'M') return '#ff9800';
  if (s === 'A') return '#4caf50';
  if (s === 'D') return '#f44336';
  if (s === '??') return '#9e9e9e';
  return '#e06c75';
}

const toggleSelectAllFiles = (msg) => {
  if (!msg.gitFiles || msg.gitFiles.length === 0) return;
  const allSelected = msg.gitFiles.every(f => f.selected);
  msg.gitFiles.forEach(f => f.selected = !allSelected);
}

const handleGitCommitCardSubmit = async (msg) => {
  const selectedFiles = (msg.gitFiles || [])
    .filter(f => f.selected)
    .map(f => f.path);
  
  if (selectedFiles.length === 0) {
    msg.submitError = '请至少选择一个要提交的文件';
    return;
  }

  msg.submitting = true;
  msg.submitError = null;
  msg.submitSuccess = false;

  try {
    const res = await fetch('/api/git/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project: msg.project,
        message: msg.commitMessage,
        files: selectedFiles
      })
    });
    const data = await res.json();
    msg.submitting = false;
    if (data.success) {
      msg.submitSuccess = true;
      toast.success('代码成功提交到 Git 仓库！');
    } else {
      msg.submitError = data.error || '提交失败';
    }
  } catch (err) {
    msg.submitting = false;
    msg.submitError = '请求出错: ' + err.message;
  }
  saveHistory();
}
</script>

<template>
  <div class="global-assistant-panel">
    <!-- 背景光效装饰 -->
    <div class="glow-bg">
      <div class="glow-ball glow-1"></div>
      <div class="glow-ball glow-2"></div>
    </div>
    
    <!-- 左侧会话侧边栏 -->
    <aside class="assistant-sidebar" :class="{ 'collapsed': !isSidebarOpen }">
      <div class="sidebar-header">
        <button class="new-chat-btn" @click="createNewSession">
          <span class="btn-icon">➕</span>
          <span>新建会话</span>
        </button>
        <button class="toggle-sidebar-btn" @click="isSidebarOpen = !isSidebarOpen" title="折叠侧边栏">
          ◀
        </button>
      </div>
      
      <div class="session-list">
        <div 
          v-for="session in sessions" 
          :key="session.id"
          class="session-item"
          :class="{ 'active': currentSessionId === session.id }"
          @click="selectSession(session.id)"
        >
          <span class="session-icon">💬</span>
          <span class="session-name" :title="session.name">{{ session.name }}</span>
          <button 
            class="delete-session-btn" 
            @click="deleteSession(session.id, $event)" 
            title="删除会话"
          >
            &times;
          </button>
        </div>
      </div>
      
      <div class="sidebar-footer">
        <button class="clear-all-btn" @click="clearAllSessions">
          <span>🧹 清空所有会话</span>
        </button>
      </div>
    </aside>

    <!-- 侧边栏折叠后的展开按钮 -->
    <button 
      v-if="!isSidebarOpen" 
      class="expand-sidebar-btn" 
      @click="isSidebarOpen = true" 
      title="展开侧边栏"
    >
      ▶
    </button>
    
    <!-- 右侧聊天区 -->
    <div class="chat-container">
      <div class="chat-header">
        <div class="header-logo">🤖</div>
        <div class="header-title">
          <h3>全局控制中心</h3>
          <p>
            {{ currentSession ? currentSession.name : '智能编排与命令分发助手' }}
            <span class="message-count" v-if="messages.length > 1">(已保存 {{ messages.length - 1 }} 条对话)</span>
          </p>
        </div>
      </div>
      
      <div class="chat-body" ref="chatBody" @scroll="updateScrollState">
        <div ref="chatContentInner" style="display: flex; flex-direction: column; gap: 24px; width: 100%;">
          <div class="chat-flow" :key="currentSessionId" style="display: flex; flex-direction: column; gap: 24px; width: 100%;">
            <div 
            v-for="(msg, index) in messages" 
            :key="index"
            class="chat-bubble-wrapper"
            :class="msg.role"
          >
            <div class="avatar">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
            <div class="chat-bubble">
              <!-- 助手消息判定 -->
              <template v-if="msg.role === 'assistant'">
                <!-- CCM 系统管理回执 -->
                <div v-if="msg.type === 'management_action'" class="management-action-card" :class="{ failed: !msg.managementReceipt?.success, cancelled: msg.managementReceipt?.cancelled }">
                  <div class="management-action-head">
                    <div>
                      <span class="management-action-kicker">全局 Agent 系统工具</span>
                      <strong>{{ msg.managementReceipt?.title || '系统管理' }}</strong>
                    </div>
                    <span class="management-action-state">{{ msg.managementReceipt?.cancelled ? '已取消' : (msg.managementReceipt?.success ? '已完成' : '失败') }}</span>
                  </div>
                  <div class="management-action-details">
                    <div v-for="(detail, detailIndex) in msg.managementReceipt?.details || []" :key="detailIndex">
                      <span>{{ detail.label }}</span>
                      <strong>{{ detail.value }}</strong>
                    </div>
                  </div>
                </div>

                <!-- 全局总控任务 -->
                <div v-else-if="msg.type === 'global_mission' || msg.type === 'global_mission_complete'" class="global-mission-card">
                  <div class="global-mission-head">
                    <div>
                      <span class="global-mission-kicker">全局总控 Agent</span>
                      <strong>{{ msg.globalMission?.title || '跨项目开发任务' }}</strong>
                    </div>
                    <span class="global-mission-status" :class="msg.globalMission?.status">{{ missionStatusLabel(msg.globalMission) }}</span>
                  </div>
                  <div class="global-mission-progress">
                    <div class="mission-progress-track">
                      <span :style="{ width: ((msg.globalMission?.mission_summary?.passed || 0) / Math.max(1, msg.globalMission?.mission_summary?.total || msg.globalMissionChildren?.length || 1) * 100) + '%' }"></span>
                    </div>
                    <div class="mission-metrics">
                      <span>任务 {{ msg.globalMission?.id }}</span>
                      <span>目标 {{ msg.globalMission?.mission_summary?.total || msg.globalMissionChildren?.length || 0 }}</span>
                      <span>通过 {{ msg.globalMission?.mission_summary?.passed || 0 }}</span>
                      <span v-if="msg.globalMission?.mission_summary?.blocked">阻塞 {{ msg.globalMission.mission_summary.blocked }}</span>
                    </div>
                  </div>
                  <div class="global-mission-targets">
                    <div v-for="row in msg.globalMissionChildren || []" :key="row.task?.id" class="global-mission-target">
                      <div class="mission-target-main">
                        <span class="mission-target-type">{{ (row.target?.type || row.task?.mission_target?.type) === 'group' ? '群聊主 Agent' : '项目 Agent' }}</span>
                        <strong>{{ row.target?.name || row.task?.mission_target?.name || row.task?.target_project }}</strong>
                      </div>
                      <span class="mission-child-status" :class="row.task?.status">{{ childStatusLabel(row.task) }}</span>
                      <small>{{ row.task?.status_detail || row.target?.reason || '等待执行回执' }}</small>
                    </div>
                  </div>
                  <div class="global-mission-gate">
                    {{ msg.globalMission?.status === 'done' ? '所有交付门禁已通过，可以报告完成。' : '全局 Agent正在等待所有子任务完成并通过交付门禁。' }}
                  </div>
                </div>

                <!-- RAG/Git 新增 1: 智能代码审查卡片 -->
                <div v-else-if="msg.type === 'git_review'" class="git-review-card" style="width: 100%;">
                  <div class="card-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <span class="icon" style="font-size: 20px;">🔍</span>
                    <div>
                      <div class="card-title" style="font-size: 15px; font-weight: bold; color: #fff;">智能代码审查报告 ({{ msg.project }})</div>
                    </div>
                  </div>
                  <div v-if="msg.loading" class="skeleton-container" style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
                    <div class="skeleton-line" style="height: 16px; width: 60%; background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%); background-size: 200% 100%; animation: loadingSkeleton 1.5s infinite; border-radius: 4px;"></div>
                    <div class="skeleton-line" style="height: 16px; width: 85%; background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%); background-size: 200% 100%; animation: loadingSkeleton 1.5s infinite; border-radius: 4px;"></div>
                    <div class="skeleton-line" style="height: 16px; width: 45%; background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%); background-size: 200% 100%; animation: loadingSkeleton 1.5s infinite; border-radius: 4px;"></div>
                  </div>
                  <div v-else-if="msg.error" style="color: #f44336; font-size: 14px; background: rgba(244,67,54,0.1); padding: 10px; border-radius: 6px;">
                    ❌ 审查失败: {{ msg.error }}
                  </div>
                  <div v-else class="review-body" v-html="renderMarkdown(msg.content)" style="font-size: 14px; line-height: 1.6; color: #ddd; max-height: 450px; overflow-y: auto; background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.05); padding: 16px; border-radius: 8px;"></div>
                </div>

                <!-- RAG/Git 新增 2: Git 一键提交确认卡片 -->
                <div v-else-if="msg.type === 'git_commit'" class="git-commit-card" style="width: 100%; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); padding: 16px; border-radius: 8px;">
                  <div class="card-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                    <span class="icon" style="font-size: 20px;">🚀</span>
                    <div>
                      <div class="card-title" style="font-size: 15px; font-weight: bold; color: #fff;">代码提交确认卡片</div>
                      <div class="card-desc" style="font-size: 12px; color: #888;">目标项目: <strong>{{ msg.project }}</strong></div>
                    </div>
                  </div>

                  <div v-if="msg.loadingFiles" style="text-align: center; color: #aaa; font-size: 14px; padding: 16px;">
                    🌀 正在读取本地 Git 变更状态...
                  </div>
                  <div v-else-if="msg.fetchError" style="color: #ff9800; font-size: 14px; background: rgba(255,152,0,0.1); padding: 10px; border-radius: 6px; margin-bottom: 12px;">
                    ⚠️ {{ msg.fetchError }}
                  </div>
                  <div v-else>
                    <!-- 变更文件选择 -->
                    <div style="margin-bottom: 12px;">
                      <div style="font-size: 13px; color: #aaa; margin-bottom: 6px; display: flex; justify-content: space-between;">
                        <span>待提交文件 ({{ msg.gitFiles?.length || 0 }})</span>
                        <a href="javascript:;" @click="toggleSelectAllFiles(msg)" style="font-size: 12px; color: #00bcd4; text-decoration: none;">全选/反选</a>
                      </div>
                      <div v-if="!msg.gitFiles || msg.gitFiles.length === 0" style="padding: 12px; text-align: center; color: #888; font-size: 13px; background: rgba(0,0,0,0.15); border-radius: 6px;">
                        没有检测到任何未提交的代码变更。
                      </div>
                      <div v-else style="display: flex; flex-direction: column; gap: 4px; max-height: 150px; overflow-y: auto; background: rgba(0,0,0,0.15); padding: 8px; border-radius: 6px;">
                        <label v-for="file in msg.gitFiles" :key="file.path" style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #ccc; cursor: pointer; padding: 4px 6px; border-radius: 4px; transition: background 0.2s;" class="commit-file-item">
                          <input type="checkbox" v-model="file.selected" style="cursor: pointer;" />
                          <span :style="{ color: getGitStatusColor(file.status) }" style="font-weight: bold; font-family: monospace; width: 18px;">{{ file.status }}</span>
                          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" :title="file.path">{{ file.path }}</span>
                        </label>
                      </div>
                    </div>

                    <!-- 提交注释框 -->
                    <div style="margin-bottom: 12px;">
                      <label style="display: block; font-size: 13px; color: #aaa; margin-bottom: 6px;">提交注释 (Commit Message)</label>
                      <textarea v-model="msg.commitMessage" placeholder="输入提交注释..." style="width: 100%; height: 60px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 8px; border-radius: 6px; font-size: 13px; resize: none; font-family: inherit;"></textarea>
                    </div>

                    <!-- 提交控制 -->
                    <div style="display: flex; justify-content: flex-end; align-items: center; gap: 12px;">
                      <span v-if="msg.submitting" style="font-size: 13px; color: #00bcd4;">🌀 正在提交中...</span>
                      <span v-else-if="msg.submitSuccess" style="font-size: 13px; color: #4caf50;">✅ 提交成功！</span>
                      <span v-else-if="msg.submitError" style="font-size: 13px; color: #f44336; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" :title="msg.submitError">❌ {{ msg.submitError }}</span>
                      
                      <button v-if="!msg.submitSuccess" class="btn btn-primary btn-sm" :disabled="msg.submitting || !msg.commitMessage?.trim()" @click="handleGitCommitCardSubmit(msg)" style="padding: 6px 14px; font-size: 13px;">
                        🚀 确认提交
                      </button>
                    </div>
                  </div>
                </div>

                <!-- 1. 系统回执高阶卡片 -->
                <div v-else-if="isSystemReceipt(msg.content)" class="system-receipt-card" :class="parseReceipt(msg.content).type">
                  <div class="receipt-header">
                    <span class="receipt-icon">{{ parseReceipt(msg.content).icon }}</span>
                    <span class="receipt-title">{{ parseReceipt(msg.content).title }}</span>
                  </div>
                  <div class="receipt-body">
                    <div v-for="(detail, dIdx) in parseReceipt(msg.content).details" :key="dIdx" class="receipt-row">
                      <span class="row-label">{{ detail.label }}:</span>
                      <span class="row-value">{{ detail.value }}</span>
                    </div>
                  </div>
                </div>
  
                <!-- 2. 项目运行报告折叠控制台 -->
                <div v-else-if="isProjectReport(msg.content)" class="project-report-card" :class="{ 'failed': !parseProjectReport(msg.content).success }">
                  <div class="report-header" @click="toggleReport(index)">
                    <div class="header-left">
                      <span class="status-indicator"></span>
                      <span class="project-tag">{{ parseProjectReport(msg.content).projectName }}</span>
                      <span class="report-title">{{ parseProjectReport(msg.content).title }}</span>
                    </div>
                    <span class="fold-arrow">{{ isReportOpen(index) ? '▼' : '▲' }}</span>
                  </div>
                  <div v-show="isReportOpen(index)" class="report-body">
                    <pre><code>{{ parseProjectReport(msg.content).body }}</code></pre>
                  </div>
                </div>
  
                <!-- 3. 普通文本 -->
                <div v-else class="bubble-content">{{ msg.content }}</div>
              </template>
  
              <!-- 用户消息普通渲染 -->
              <template v-else>
                <div class="bubble-content">{{ msg.content }}</div>
              </template>
  
              <!-- 渲染附件列表 -->
              <div v-if="msg.files && msg.files.length > 0" class="bubble-attachments">
                <div 
                  v-for="(file, fIdx) in msg.files" 
                  :key="fIdx"
                  class="attachment-card"
                  :title="file.name"
                >
                  <div v-if="file.type && file.type.startsWith('image/')" class="attachment-preview-img" @click="zoomImage(file.preview || `/api/uploads/${file.name}`)">
                    <img :src="file.preview || `/api/uploads/${file.name}`" @load="scrollToBottom()" />
                  </div>
                  <div v-else class="attachment-preview-file" @click="file.preview ? zoomImage(file.preview) : null">
                    <span class="file-icon">📄</span>
                    <div class="file-info">
                      <span class="file-name">{{ file.name }}</span>
                      <span class="file-size" v-if="file.size">{{ formatSize(file.size) }}</span>
                    </div>
                  </div>
                </div>
              </div>
  
              <div class="bubble-time">{{ new Date(msg.timestamp).toLocaleTimeString() }}</div>
            </div>
          </div>
          
          <!-- 执行系统动作 of 提示效果 -->
          <div v-if="executingAction" class="action-runner-indicator">
            <div class="runner-spinner">
              <div class="double-bounce1"></div>
              <div class="double-bounce2"></div>
            </div>
            <span class="runner-text">
              正在调起系统动作: 
              <strong>{{ executingAction.type }}</strong>
            </span>
          </div>
          
          <!-- 正在分析状态 -->
          <div v-if="isSending" class="chat-bubble-wrapper assistant typing">
            <div class="avatar">🤖</div>
            <div class="chat-bubble">
              <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
      
      <div class="chat-footer">
        <!-- 附件上传预览区 -->
        <div v-if="selectedFiles.length > 0" class="upload-preview-area">
          <div 
            v-for="(f, idx) in selectedFiles" 
            :key="idx" 
            class="preview-item"
          >
            <div v-if="f.preview" class="item-img">
              <img :src="f.preview" />
            </div>
            <div v-else class="item-file">
              <span class="file-icon">📄</span>
              <span class="file-name" :title="f.name">{{ f.name }}</span>
            </div>
            <button class="remove-btn" @click="removeSelectedFile(idx)">&times;</button>
          </div>
        </div>

        <div class="input-wrapper">
          <input 
            type="file" 
            ref="fileInput" 
            multiple 
            style="display: none" 
            @change="handleFileChange"
            accept="image/*,.txt,.md,.json,.pdf,.docx,.xlsx"
          />
          <button class="attach-btn" @click="triggerFileUpload" title="上传图片或文件附件">
            <svg class="icon-attach" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
          <input 
            type="text" 
            v-model="chatInput" 
            placeholder="对全局助手说点什么... (例如: 帮我把桌宠打开)"
            @keydown.enter="sendMessage"
            :disabled="isSending"
          />
          <button class="send-btn" @click="sendMessage" :disabled="isSending || (!chatInput.trim() && selectedFiles.length === 0)">
            <svg class="icon-send" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            <span>发送</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Lightbox 图片放大查看 -->
    <div v-if="zoomedImage" class="lightbox-overlay" @click="closeZoom">
      <img :src="zoomedImage" />
      <div class="close-lightbox">&times;</div>
    </div>
  </div>
</template>

<style scoped>
.global-assistant-panel {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(135deg, #eef2ff 0%, #f8fafc 40%, #e0f2fe 100%);
  display: flex;
  font-family: 'Outfit', 'Inter', system-ui, -apple-system, sans-serif;
  transition: background 0.3s ease;
}

:global([data-theme="dark"]) .global-assistant-panel {
  background: linear-gradient(135deg, #07070a 0%, #0c0d16 50%, #05080e 100%);
}

/* 霓虹背景光效 */
.glow-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  z-index: 1;
  pointer-events: none;
  opacity: 0.22;
  transition: opacity 0.3s ease;
}
:global([data-theme="dark"]) .glow-bg {
  opacity: 0.32;
}
.glow-ball {
  position: absolute;
  border-radius: 50%;
  filter: blur(140px);
}
.glow-1 {
  width: 450px;
  height: 450px;
  background: radial-gradient(circle, #6366f1, transparent);
  top: -80px;
  left: -80px;
  animation: moveGlow1 22s infinite alternate ease-in-out;
}
.glow-2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, #06b6d4, transparent);
  bottom: -100px;
  right: -80px;
  animation: moveGlow2 26s infinite alternate ease-in-out;
}

@keyframes moveGlow1 {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(150px, 100px) scale(1.25); }
}
@keyframes moveGlow2 {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(-120px, -100px) scale(1.15); }
}

/* 左侧会话侧边栏 - 玻璃拟态 */
.assistant-sidebar {
  width: 250px;
  border-right: 1px solid rgba(99, 102, 241, 0.08);
  background: rgba(255, 255, 255, 0.45);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  display: flex;
  flex-direction: column;
  z-index: 5;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s;
  position: relative;
}

:global([data-theme="dark"]) .assistant-sidebar {
  background: rgba(12, 12, 20, 0.65);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
}

.assistant-sidebar.collapsed {
  width: 0;
  transform: translateX(-250px);
  overflow: hidden;
  border-right: none;
}

.sidebar-header {
  padding: 20px 16px;
  display: flex;
  gap: 10px;
  align-items: center;
  border-bottom: 1px solid rgba(99, 102, 241, 0.06);
}

.new-chat-btn {
  flex: 1;
  background: linear-gradient(135deg, #6366f1, #06b6d4);
  color: white;
  border: none;
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.25s ease;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.25);
}
.new-chat-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.38);
}

.toggle-sidebar-btn {
  background: transparent;
  border: 1px solid rgba(99, 102, 241, 0.12);
  color: var(--text-secondary);
  border-radius: 10px;
  width: 36px;
  height: 36px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  transition: all 0.2s;
}
.toggle-sidebar-btn:hover {
  background: rgba(99, 102, 241, 0.05);
  color: var(--text-primary);
}

.expand-sidebar-btn {
  position: absolute;
  left: 14px;
  top: 14px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(99, 102, 241, 0.12);
  color: var(--text-secondary);
  border-radius: 10px;
  width: 36px;
  height: 36px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.06);
  transition: all 0.2s;
}
:global([data-theme="dark"]) .expand-sidebar-btn {
  background: rgba(15, 15, 25, 0.7);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
.expand-sidebar-btn:hover {
  background: rgba(99, 102, 241, 0.08);
  color: var(--text-primary);
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  scrollbar-width: thin;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  border: 1px solid transparent;
}

.session-item:hover {
  background: rgba(99, 102, 241, 0.04);
  color: var(--text-primary);
  transform: translateX(2px);
}
:global([data-theme="dark"]) .session-item:hover {
  background: rgba(255, 255, 255, 0.03);
}

.session-item.active {
  background: rgba(99, 102, 241, 0.08);
  color: #4f46e5;
  font-weight: 600;
  border-color: rgba(99, 102, 241, 0.18);
  box-shadow: inset 0 0 8px rgba(99, 102, 241, 0.02);
}
:global([data-theme="dark"]) .session-item.active {
  background: rgba(99, 102, 241, 0.16);
  color: #818cf8;
  border-color: rgba(99, 102, 241, 0.3);
}

.session-icon {
  font-size: 15px;
  opacity: 0.85;
}

.session-name {
  flex: 1;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 18px;
}

.delete-session-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 16px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s, color 0.2s;
  padding: 2px 6px;
  border-radius: 6px;
}

.session-item:hover .delete-session-btn {
  opacity: 1;
}

.delete-session-btn:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.sidebar-footer {
  padding: 14px;
  border-top: 1px solid rgba(99, 102, 241, 0.06);
}

.clear-all-btn {
  width: 100%;
  background: transparent;
  border: 1px dashed rgba(99, 102, 241, 0.15);
  color: var(--text-muted);
  padding: 10px;
  border-radius: 10px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.clear-all-btn:hover {
  border-color: #ef4444;
  color: #ef4444;
  background: rgba(239, 68, 68, 0.04);
}

/* 右侧主聊天区 */
.chat-container {
  flex: 1;
  position: relative;
  z-index: 2;
  height: 100%;
  background: rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);
  display: flex;
  flex-direction: column;
  min-width: 0;
  transition: background 0.3s;
}
:global([data-theme="dark"]) .chat-container {
  background: rgba(9, 9, 14, 0.35);
}

.chat-header {
  padding: 18px 24px;
  border-bottom: 1px solid rgba(99, 102, 241, 0.08);
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(10px);
  z-index: 4;
  transition: background 0.3s;
}
:global([data-theme="dark"]) .chat-header {
  background: rgba(14, 14, 22, 0.6);
  border-bottom-color: rgba(255, 255, 255, 0.05);
}

.header-logo {
  font-size: 28px;
  background: linear-gradient(135deg, #6366f1, #06b6d4);
  width: 44px;
  height: 44px;
  border-radius: 12px;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
}

.header-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.header-title p {
  margin: 3px 0 0;
  font-size: 11px;
  color: var(--text-secondary);
}

.message-count {
  margin-left: 6px;
  opacity: 0.7;
  font-weight: normal;
}

.chat-body {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  scrollbar-width: thin;
}

/* 聊天气泡排版 */
.chat-bubble-wrapper {
  display: flex;
  gap: 16px;
  max-width: 85%;
}
.chat-bubble-wrapper.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}
.chat-bubble-wrapper.assistant {
  align-self: flex-start;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(99, 102, 241, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.04);
}
:global([data-theme="dark"]) .avatar {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.06);
}
.chat-bubble-wrapper.user .avatar {
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white;
  border: none;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
}

.chat-bubble {
  padding: 14px 20px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(99, 102, 241, 0.08);
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.6;
  position: relative;
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.02);
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: background 0.3s;
}
:global([data-theme="dark"]) .chat-bubble {
  background: rgba(20, 20, 30, 0.7);
  border-color: rgba(255, 255, 255, 0.05);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.chat-bubble-wrapper.user .chat-bubble {
  background: linear-gradient(135deg, #4f46e5, #3b82f6);
  color: white;
  border: none;
  border-top-right-radius: 2px;
  box-shadow: 0 4px 18px rgba(99, 102, 241, 0.22);
}
.chat-bubble-wrapper.assistant .chat-bubble {
  border-top-left-radius: 2px;
}

.bubble-content {
  white-space: pre-wrap;
}

.bubble-time {
  font-size: 10px;
  color: var(--text-muted, #8c8c8c);
  text-align: right;
  margin-top: 4px;
}
.chat-bubble-wrapper.user .bubble-time {
  color: rgba(255, 255, 255, 0.7);
}

/* 附件渲染卡片样式 */
.bubble-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
}

.attachment-card {
  background: rgba(128, 128, 128, 0.05);
  border: 1px solid rgba(128, 128, 128, 0.1);
  border-radius: 8px;
  padding: 6px;
  display: flex;
  align-items: center;
  cursor: pointer;
  max-width: 260px;
  transition: all 0.25s ease;
}
.attachment-card:hover {
  background: rgba(99, 102, 241, 0.05);
  border-color: rgba(99, 102, 241, 0.25);
  transform: translateY(-1px);
}
:global([data-theme="dark"]) .attachment-card {
  background: rgba(255, 255, 255, 0.03);
}

.attachment-preview-img {
  width: 64px;
  height: 64px;
  border-radius: 6px;
  overflow: hidden;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.attachment-preview-img img {
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
}

.attachment-preview-file {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  width: 100%;
}
.file-icon {
  font-size: 24px;
}
.file-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.file-name {
  font-size: 12px;
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.chat-bubble-wrapper.user .file-name {
  color: white;
}
.file-size {
  font-size: 10px;
  color: var(--text-secondary);
}
.chat-bubble-wrapper.user .file-size {
  color: rgba(255, 255, 255, 0.7);
}

/* === 系统高阶回执卡片 (System Receipt Card) === */
.system-receipt-card {
  border-left: 4px solid #6366f1;
  background: rgba(99, 102, 241, 0.03);
  border-radius: 6px 12px 12px 6px;
  padding: 12px 16px;
  min-width: 280px;
  max-width: 450px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.01);
}
:global([data-theme="dark"]) .system-receipt-card {
  background: rgba(99, 102, 241, 0.05);
}

.management-action-card {
  width: 100%;
  padding: 15px;
  border: 1px solid rgba(20, 184, 166, 0.22);
  border-left: 3px solid #14b8a6;
  border-radius: 8px;
  background: rgba(20, 184, 166, 0.045);
}
.management-action-card.failed {
  border-left-color: #dc2626;
  background: rgba(220, 38, 38, 0.04);
}
.management-action-card.cancelled {
  border-left-color: #d97706;
  background: rgba(217, 119, 6, 0.04);
}
.management-action-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.management-action-head > div {
  display: grid;
  gap: 3px;
}
.management-action-head strong {
  color: var(--text-primary);
}
.management-action-kicker {
  color: #0f766e;
  font-size: 10px;
  font-weight: 700;
}
.management-action-state {
  flex: none;
  padding: 3px 7px;
  border-radius: 4px;
  background: rgba(20, 184, 166, 0.12);
  color: #0f766e;
  font-size: 10px;
  font-weight: 700;
}
.management-action-card.failed .management-action-state {
  color: #dc2626;
  background: rgba(220, 38, 38, 0.1);
}
.management-action-details {
  display: grid;
  gap: 7px;
  margin-top: 13px;
}
.management-action-details > div {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 10px;
  padding-top: 7px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
  font-size: 11px;
}
.management-action-details span {
  color: var(--text-muted);
}
.management-action-details strong {
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}

.global-mission-card {
  width: 100%;
  padding: 16px;
  border: 1px solid rgba(59, 130, 246, 0.22);
  border-left: 3px solid #3b82f6;
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.045);
}
.global-mission-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}
.global-mission-head > div {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.global-mission-head strong {
  color: var(--text-primary);
  overflow-wrap: anywhere;
}
.global-mission-kicker {
  color: #3b82f6;
  font-size: 10px;
  font-weight: 700;
}
.global-mission-status {
  flex: none;
  padding: 3px 7px;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
  font-size: 10px;
  font-weight: 700;
}
.global-mission-status.done {
  background: rgba(34, 197, 94, 0.12);
  color: #16a34a;
}
.global-mission-progress {
  margin-top: 14px;
}
.mission-progress-track {
  height: 5px;
  overflow: hidden;
  border-radius: 3px;
  background: rgba(148, 163, 184, 0.18);
}
.mission-progress-track span {
  display: block;
  height: 100%;
  background: #22c55e;
  transition: width 0.25s ease;
}
.mission-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 7px;
  color: var(--text-muted);
  font-size: 10px;
}
.global-mission-targets {
  display: grid;
  gap: 7px;
  margin-top: 14px;
}
.global-mission-target {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 3px 12px;
  padding: 9px 10px;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
}
.mission-target-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.mission-target-main strong {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.mission-target-type {
  flex: none;
  color: #3b82f6;
  font-size: 10px;
}
.mission-child-status {
  color: #d97706;
  font-size: 10px;
  font-weight: 700;
}
.mission-child-status.done {
  color: #16a34a;
}
.mission-child-status.failed {
  color: #dc2626;
}
.global-mission-target small {
  grid-column: 1 / -1;
  color: var(--text-muted);
  font-size: 10px;
  overflow-wrap: anywhere;
}
.global-mission-gate {
  margin-top: 12px;
  color: var(--text-secondary);
  font-size: 11px;
}

.system-receipt-card.task { border-left-color: #6366f1; background: rgba(99, 102, 241, 0.03); }
.system-receipt-card.cron { border-left-color: #f59e0b; background: rgba(245, 158, 11, 0.03); }
.system-receipt-card.music { border-left-color: #10b981; background: rgba(16, 185, 129, 0.03); }
.system-receipt-card.pet { border-left-color: #06b6d4; background: rgba(6, 182, 212, 0.03); }
.system-receipt-card.project { border-left-color: #3b82f6; background: rgba(59, 130, 246, 0.03); }
.system-receipt-card.template { border-left-color: #8b5cf6; background: rgba(139, 92, 246, 0.03); }
.system-receipt-card.dispatch { border-left-color: #ec4899; background: rgba(236, 72, 153, 0.03); }
.system-receipt-card.group { border-left-color: #14b8a6; background: rgba(20, 184, 166, 0.03); }

.receipt-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 700;
  font-size: 14px;
  color: var(--text-primary);
}
.receipt-icon {
  font-size: 16px;
}
.receipt-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.receipt-row {
  display: flex;
  font-size: 12px;
  line-height: 1.5;
}
.row-label {
  width: 75px;
  color: var(--text-secondary);
  font-weight: 500;
  flex-shrink: 0;
}
.row-value {
  color: var(--text-primary);
  word-break: break-all;
  flex: 1;
}

/* === 项目运行报告控制台卡片 (Project Report Card) === */
.project-report-card {
  background: #14141e;
  border: 1px solid #232335;
  border-radius: 12px;
  overflow: hidden;
  width: 480px;
  max-width: 100%;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
  font-family: 'Consolas', 'Courier New', Courier, monospace;
}
.report-header {
  background: #1a1a28;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid #232335;
}
.report-header:hover {
  background: #212133;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #10b981;
  box-shadow: 0 0 8px #10b981;
  animation: blinkIndicator 1.8s infinite ease-in-out;
}
.project-report-card.failed .status-indicator {
  background-color: #ef4444;
  box-shadow: 0 0 8px #ef4444;
}

@keyframes blinkIndicator {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

.project-tag {
  background: rgba(99, 102, 241, 0.2);
  color: #818cf8;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: bold;
}
.project-report-card.failed .project-tag {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
}

.report-title {
  color: #e2e8f0;
  font-size: 12px;
  font-weight: 500;
}
.fold-arrow {
  color: #94a3b8;
  font-size: 10px;
  transition: transform 0.25s;
}

.report-body {
  padding: 16px;
  background: #0d0d15;
  max-height: 250px;
  overflow-y: auto;
  scrollbar-width: thin;
}
.report-body pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
.report-body code {
  color: #38bdf8;
  font-size: 12px;
  line-height: 1.5;
}
.project-report-card.failed .report-body code {
  color: #f87171;
}

/* === 输入框及页脚区域 === */
.chat-footer {
  padding: 20px 24px;
  border-top: 1px solid rgba(128, 128, 128, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 附件上传预览区 */
.upload-preview-area {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 2px;
}
.preview-item {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 8px;
  border: 1px solid rgba(128, 128, 128, 0.2);
  background: rgba(128, 128, 128, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.03);
}
.item-img {
  width: 100%;
  height: 100%;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.item-img img {
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
}
.item-file {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100%;
}
.item-file .file-icon {
  font-size: 18px;
}
.item-file .file-name {
  font-size: 9px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  margin-top: 2px;
}
.preview-item .remove-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ef4444;
  color: white;
  border: none;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
  transition: transform 0.2s;
}
.preview-item .remove-btn:hover {
  transform: scale(1.15);
}

.input-wrapper {
  display: flex;
  gap: 12px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(99, 102, 241, 0.16);
  border-radius: 16px;
  padding: 5px 6px 5px 12px;
  align-items: center;
  transition: all 0.25s ease;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.03);
}
:global([data-theme="dark"]) .input-wrapper {
  background: rgba(20, 20, 30, 0.75);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}
.input-wrapper:focus-within {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
  background: rgba(255, 255, 255, 0.9);
}
:global([data-theme="dark"]) .input-wrapper:focus-within {
  background: rgba(20, 20, 30, 0.88);
}

.attach-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  color: var(--text-secondary);
}
.icon-attach {
  width: 20px;
  height: 20px;
  stroke: currentColor;
  transition: transform 0.25s ease, stroke 0.2s;
}
.attach-btn:hover .icon-attach {
  color: #6366f1;
  transform: rotate(15deg) scale(1.1);
}

.input-wrapper input[type="text"] {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  padding: 8px 0;
}

.send-btn {
  background: linear-gradient(135deg, #6366f1, #06b6d4);
  color: white;
  border: none;
  border-radius: 11px;
  padding: 9px 18px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.25s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}
.icon-send {
  width: 14px;
  height: 14px;
  stroke: currentColor;
  transition: transform 0.25s ease;
}
.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.35);
}
.send-btn:hover:not(:disabled) .icon-send {
  transform: translate(2px, -2px);
}
.send-btn:disabled {
  background: var(--border-color);
  color: var(--text-muted);
  cursor: not-allowed;
  box-shadow: none;
}

/* Typing 动画 */
.typing-dots {
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 4px 8px;
}
.typing-dots span {
  width: 7px;
  height: 7px;
  background: var(--text-secondary);
  border-radius: 50%;
  animation: typing 1.4s infinite both;
  opacity: 0.6;
}
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* 动作执行指示器 */
.action-runner-indicator {
  align-self: center;
  background: rgba(6, 182, 212, 0.08);
  border: 1px dashed rgba(6, 182, 212, 0.3);
  padding: 8px 18px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  animation: pulseAction 2.2s infinite ease-in-out;
}
.runner-text {
  font-size: 12px;
  color: #0891b2;
}
:global([data-theme="dark"]) .runner-text {
  color: #22d3ee;
}
.runner-spinner {
  width: 14px;
  height: 14px;
  position: relative;
}
.double-bounce1, .double-bounce2 {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: #06b6d4;
  opacity: 0.6;
  position: absolute;
  top: 0;
  left: 0;
  animation: sk-bounce 2.0s infinite ease-in-out;
}
.double-bounce2 {
  animation-delay: -1.0s;
}

@keyframes sk-bounce {
  0%, 100% { transform: scale(0.0); }
  50% { transform: scale(1.0); }
}
@keyframes pulseAction {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.025); }
}

/* === Lightbox 图片放大遮罩层 === */
.lightbox-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
  animation: fadeIn 0.25s ease-out;
}
.lightbox-overlay img {
  max-width: 90%;
  max-height: 90%;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  transform: scale(0.95);
  animation: scaleUp 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.close-lightbox {
  position: absolute;
  top: 20px;
  right: 30px;
  color: white;
  font-size: 38px;
  cursor: pointer;
  transition: color 0.2s;
  user-select: none;
}
.close-lightbox:hover {
  color: #ef4444;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes scaleUp {
  to { transform: scale(1); }
}

.skeleton-line {
  background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%);
  background-size: 200% 100%;
  animation: loadingSkeleton 1.5s infinite;
  border-radius: 4px;
}

@keyframes loadingSkeleton {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
