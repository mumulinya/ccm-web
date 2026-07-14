<script setup>
import { ref, onMounted, onUnmounted, nextTick, computed, watch, inject } from 'vue'
import { api, projectsApi, sessionsApi } from '../../api/index.js'
import { toast, confirmDialog } from '../../utils/toast.js'
import ChatComposer from '../common/ChatComposer.vue'
import CommandResultCard from '../common/CommandResultCard.vue'
import MessageNavigator from '../common/MessageNavigator.vue'
import AgentCodeChangeDrawer from '../agents/AgentCodeChangeDrawer.vue'
import ProjectAgentMessage from './ProjectAgentMessage.vue'
import UnifiedDiffModal from '../common/UnifiedDiffModal.vue'
import TemplateVariablesModal from '../common/TemplateVariablesModal.vue'
import ProjectFormModal from './ProjectFormModal.vue'
import ProjectFeishuQrModal from './ProjectFeishuQrModal.vue'
import ProjectFolderBrowserModal from './ProjectFolderBrowserModal.vue'
import ProjectToolsModal from './ProjectToolsModal.vue'
import ProjectSharedFilesModal from './ProjectSharedFilesModal.vue'
import ProjectAgentSwitchModal from './ProjectAgentSwitchModal.vue'
import ProjectWorkspaceHeader from './ProjectWorkspaceHeader.vue'
import ProjectSessionSidebar from './ProjectSessionSidebar.vue'
import ProjectArchiveManager from './ProjectArchiveManager.vue'
import { PanelLeft } from '@lucide/vue'
import { useSlashCommands } from '../../composables/useSlashCommands.js'
import { createSlashCommandClientActions } from '../../composables/useSlashCommandClientActions.js'
import { useChatTemplates } from '../../composables/useChatTemplates.js'
import { useCodeChangeDrawer } from '../../composables/useCodeChangeDrawer.js'
import { useMessageNavigation } from '../../composables/useMessageNavigation.js'
import { usePinnedScroll } from '../../composables/usePinnedScroll.js'
import { projectExecutionTaskCard } from '../../utils/taskExperience.js'
import { buildProjectSessionKnowledgePayload, buildProjectTaskKnowledgePayload, postKnowledgeCapture } from '../../utils/knowledgeCapture.js'

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
      if (target.messageId || Number.isInteger(target.messageIndex) || target.keyword) {
        await nextTick()
        const kw = String(target.keyword || '').toLowerCase()
        let idx = target.messageId ? messages.value.findIndex(m => String(m.id || m.message_id || m.messageId || '') === String(target.messageId)) : -1
        if (idx < 0 && Number.isInteger(target.messageIndex) && target.messageIndex >= 0 && target.messageIndex < messages.value.length) idx = target.messageIndex
        if (idx < 0 && kw) idx = messages.value.findIndex(m => (m.content || '').toLowerCase().includes(kw))
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
const chatInput = ref('')
const {
  isPinnedToBottom: isMessagesPinnedToBottom,
  updateScrollState: updateMessageScrollState,
  scrollToBottom,
  attachResizeObserver: attachMessagesResizeObserver,
  detachResizeObserver: detachMessagesResizeObserver,
} = usePinnedScroll(messagesEl)
const { navMessages } = useMessageNavigation(messages)
const {
  codeChangeDrawer,
  openCodeChangeDrawer,
  openSingleFileChange,
  closeCodeChangeDrawer,
} = useCodeChangeDrawer({ title: '项目 Agent 代码改动', project: () => currentProject.value || '' })
const slashNavigate = inject('slashNavigate', () => {})
const runProjectClientCommand = createSlashCommandClientActions({
  scope: 'project',
  messages: () => messages.value,
  sessions: () => sessions.value,
  currentSessionId: () => currentSession.value || '',
  context: () => ({ project: currentProject.value || '', sessionId: currentSession.value || '' }),
  statusSummary: () => `项目 ${currentProject.value || '未选择'} 的当前会话已加载 ${messages.value.length} 条消息。`,
  contextMetrics: () => ({ 项目: currentProject.value || '未选择', 会话: currentSession.value || '未选择' }),
  exportFilename: () => `ccm-project-${currentProject.value || 'unknown'}-${currentSession.value || 'context'}`,
  newSession: async () => {
    if (!currentProject.value) throw new Error('请先选择项目')
    await createSession()
    return { success: true, summary: '已新建项目 Agent 会话。', metrics: { 项目: currentProject.value, 会话: currentSession.value || '新会话' } }
  },
  clearSession: async () => {
    if (!currentProject.value || !currentSession.value) throw new Error('请先选择项目会话')
    const res = await fetch('/api/sessions/clear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project: currentProject.value, sessionId: currentSession.value }) })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || '清空项目会话失败')
    messages.value = []
    await loadSessions(currentProject.value)
    return { success: true, summary: `已清空项目会话 ${currentSession.value}。`, metrics: { 已清空: data.cleared || 0 } }
  },
  renameSession: async (name) => {
    if (!currentProject.value || !currentSession.value) throw new Error('请先选择项目会话')
    await sessionsApi.rename({ project: currentProject.value, sessionId: currentSession.value, name })
    await loadSessions(currentProject.value)
    return { success: true, summary: `当前项目会话已重命名为“${name}”。`, metrics: { 项目: currentProject.value, 会话: currentSession.value } }
  },
})
const slash = useSlashCommands({
  scope: 'project',
  input: chatInput,
  context: () => ({ project: currentProject.value, sessionId: currentSession.value || '' }),
  focus: () => nextTick(() => document.getElementById('projectChatInput')?.focus()),
  onNavigate: (tab) => slashNavigate(tab),
  onPrompt: async (prompt) => {
    chatInput.value = prompt
    await nextTick()
    await sendMessage()
  },
  onClientAction: runProjectClientCommand,
  onResult: (result) => {
    messages.value.push({ role: 'assistant', type: 'command_result', commandResult: result, content: '', timestamp: new Date().toISOString() })
    nextTick(() => scrollToBottom())
  },
  onError: (message) => toast.error(message),
  onConfirm: (message) => confirmDialog(message)
})
const focusProjectInput = () => {
  const el = document.getElementById('projectChatInput')
  if (!el) return
  el.focus()
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}
const {
  showTemplateSelector,
  allTemplates,
  templateSearchQuery,
  activeTemplateIndex,
  recommendedTemplate,
  activeTemplate,
  templateVariables,
  showVariableModal,
  openTemplateSelector,
  selectChatTemplate,
  applyTemplateVariables,
  detectRecommendation,
  applyRecommendation,
  handleTemplateKeydown,
  hideTemplateAssist,
} = useChatTemplates({
  input: chatInput,
  focusInput: focusProjectInput,
  onError: (message) => toast.error(message),
})

const chatFiles = ref([])
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

// 弹窗状态
const showCreate = ref(false)
const showEdit = ref(false)
const showSwitchAgent = ref(false)
const showTools = ref(false)
const showSharedFiles = ref(false)
const showArchives = ref(false)
const mobileSessionsOpen = ref(false)
const projectActionBusy = ref('')

const showFeishuQr = ref(false)
const editProject = ref(null)

// 飞书扫码状态
const feishuQrUrl = ref('')
const feishuQrStatus = ref('')
const feishuQrLoading = ref(false)
const feishuProjectSetupToken = ref('')

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

const updateProjectFormField = ({ field, value }) => {
  if (!field) return
  form.value[field] = value
}

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
    await selectProject(projects.value[0].name)
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
  if (isStreaming.value) stopStreaming()
  currentProject.value = name
  currentSession.value = null
  await loadSessions(name)
  // 如果会话列表非空，且没有选中会话，则默认选中第一个会话，以便载入单聊输入框
  if (sessions.value.length > 0 && !currentSession.value) {
    const remembered = localStorage.getItem(`ccm:project-session:${name}`)
    const target = sessions.value.find(item => item.id === remembered) || sessions.value[0]
    await selectSession(target.id)
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
const selectSession = async (sessionId, newSession = false) => {
  if (isStreaming.value) stopStreaming()
  currentSession.value = sessionId
  currentSessionNew.value = newSession
  if (currentProject.value) localStorage.setItem(`ccm:project-session:${currentProject.value}`, sessionId)
  const data = await sessionsApi.detail(currentProject.value, sessionId)
  messages.value = data.history || []
  scrollToBottom({ force: true })
}

// 启动项目
const startProject = async (name) => {
  if (!name || projectActionBusy.value) return
  projectActionBusy.value = 'start'
  try {
    const result = await projectsApi.start(name)
    await loadProjects()
    toast.success(result.message || '项目 Agent 已启动')
  } catch (error) { toast.error(error?.message || '项目 Agent 启动失败') }
  finally { projectActionBusy.value = '' }
}

// 停止项目
const stopProject = async (name) => {
  if (!name || projectActionBusy.value) return
  projectActionBusy.value = 'stop'
  try {
    const result = await projectsApi.stop(name)
    await loadProjects()
    toast.success(result.message || '项目 Agent 已停止')
  } catch (error) { toast.error(error?.message || '项目 Agent 停止失败') }
  finally { projectActionBusy.value = '' }
}

// 删除项目
const deleteProject = async (name) => {
  const confirmed = await confirmDialog(`确定归档项目“${name}”？项目会从活动列表移除，但会话、任务、回放、验收证据和源码都会保留，可随时恢复。`)
  if (!confirmed) return
  projectActionBusy.value = 'archive'
  try {
    const result = await projectsApi.archive(name)
    if (currentProject.value === name) {
      currentProject.value = null
      currentSession.value = null
      sessions.value = []
      messages.value = []
    }
    await loadProjects()
    toast.success(`${result.message}，审计编号 ${result.audit_id}`)
  } catch (error) { toast.error(error?.message || '项目归档失败') }
  finally { projectActionBusy.value = '' }
}

const handleArchiveNotify = ({ type, text }) => {
  const method = type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'success'
  toast[method](text)
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
  const res = await projectsApi.create({ ...form.value, setup_token: feishuProjectSetupToken.value || undefined })
  if (res.success) {
    showCreate.value = false
    feishuProjectSetupToken.value = ''
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
  if (!editProject.value?.name || projectActionBusy.value) return
  const projectName = editProject.value.name
  projectActionBusy.value = 'switch'
  try {
    await projectsApi.stop(projectName)
    await startProjectWithAgent(projectName, agentType, false)
    showSwitchAgent.value = false
    await loadProjects()
    toast.success(`已切换到 ${agentType} 并重新启动`)
  } catch (error) { toast.error(error?.message || 'Agent 切换失败') }
  finally { projectActionBusy.value = '' }
}

// 启动项目（指定 Agent）
const startProjectWithAgent = async (name, agent, refresh = true) => {
  const result = await projectsApi.start(name, agent)
  if (refresh) await loadProjects()
  return result
}

// 创建会话
const createSession = async () => {
  if (!currentProject.value) {
    toast.info('请先选择项目')
    return
  }
  const res = await sessionsApi.create({ project: currentProject.value })
  if (res.success) {
    await loadSessions(currentProject.value)
    await selectSession(res.sessionId, true)
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
  if (!await confirmDialog('确定删除此会话？会话消息删除后无法恢复。')) return
  await sessionsApi.delete({ project: currentProject.value, sessionId })
  if (currentSession.value === sessionId) {
    currentSession.value = null
    localStorage.removeItem(`ccm:project-session:${currentProject.value}`)
    messages.value = []
  }
  loadSessions(currentProject.value)
}

const saveCurrentProjectSessionKnowledge = async () => {
  if (!currentProject.value || !currentSession.value || messages.value.length === 0) return toast.info('当前项目会话还没有可沉淀的内容')
  try {
    const data = await postKnowledgeCapture(buildProjectSessionKnowledgePayload({
      project: currentProject.value,
      sessionId: currentSession.value,
      messages: messages.value,
    }))
    toast.success(`已保存到知识库：${data.entry?.title || '项目会话'}`)
  } catch (error) {
    toast.error(error?.message || '保存项目会话知识失败')
  }
}

const getProjectTaskCard = (msg) => projectExecutionTaskCard(msg, currentProject.value)
const postTaskAction = async (path, body) => {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
  const payload = await response.json()
  if (!response.ok || payload.success === false || payload.error) throw new Error(payload.error || `操作失败 (${response.status})`)
  return payload
}
const removeMessageFromCurrentSession = async (target) => {
  const index = messages.value.indexOf(target)
  if (index >= 0) messages.value.splice(index, 1)
  if (!currentProject.value || !currentSession.value) return
  await sessionsApi.deleteMessage({
    project: currentProject.value,
    sessionId: currentSession.value,
    id: target?.id || target?.message_id || '',
    task_id: target?.task_id || target?.taskExperience?.task_id || '',
    timestamp: target?.timestamp || '',
  })
}
const handleProjectTaskAction = async (msg, action) => {
  const card = getProjectTaskCard(msg)
  const id = card?.task_id || msg?.task_id
  const isProjectRun = String(id || '').startsWith('pchat_')
  try {
    if (action.kind === 'view_changes') {
      if (msg?.fileChanges?.files?.length) openCodeChangeDrawer(msg.fileChanges, { title: card?.title || '项目 Agent 代码改动', subtitle: card?.goal || '' })
      else toast.info('暂无可查看的文件改动')
      return
    }
    if (action.kind === 'save_knowledge') {
      const data = await postKnowledgeCapture(buildProjectTaskKnowledgePayload({
        msg,
        card,
        project: currentProject.value,
        sessionId: currentSession.value,
      }))
      toast.success(`已保存到知识库：${data.entry?.title || card?.title || '项目任务'}`)
      return
    }
    if (action.kind === 'continue') {
      const requirement = window.prompt('继续修改什么？', '')
      if (!requirement) return
      pendingProjectParentRunId.value = isProjectRun ? id : ''
      chatInput.value = requirement
      await nextTick()
      await sendMessage()
    } else if (action.kind === 'cancel') {
      if (!id) return toast.info('当前项目直连执行暂未绑定任务，无法远程停止')
      if (!await confirmDialog(`确定停止任务“${card.title}”？`)) return
      await postTaskAction(isProjectRun ? '/api/project-runs/cancel' : '/api/tasks/cancel', { id, reason: '用户从项目聊天任务卡停止' })
    } else if (action.kind === 'retry') {
      if (isProjectRun) {
        pendingProjectParentRunId.value = id
        chatInput.value = msg.requestText || card.goal || card.title
        await nextTick()
        await sendMessage()
      } else {
        if (!id) return toast.info('当前任务没有可重试身份')
        await postTaskAction('/api/tasks/retry', { id, reason: '用户从项目聊天任务卡重新执行', auto_execute: true })
      }
    } else if (action.kind === 'rollback') {
      if (!id) return toast.info('当前项目直连执行暂未绑定任务，无法安全撤销')
      if (!await confirmDialog(`确定安全撤销任务“${card.title}”的最近一轮改动？`)) return
      await postTaskAction(isProjectRun ? '/api/project-runs/rollback' : '/api/tasks/rollback', { id, reason: '用户从项目聊天任务卡安全撤销' })
      if (msg.taskExperience) {
        msg.taskExperience.status = 'reverted'
        msg.taskExperience.phase = 'reverted'
      }
    } else if (action.kind === 'archive') {
      if (!id) return toast.info('当前任务没有可删除的记录 ID')
      if (!await confirmDialog(`确定删除任务记录“${card.title}”？记录会移入归档/从当前会话隐藏。`)) return
      await postTaskAction(isProjectRun ? '/api/project-runs/delete' : '/api/tasks/delete', { id, reason: '用户从项目聊天任务卡删除记录' })
      await removeMessageFromCurrentSession(msg)
    } else if (action.kind === 'purge') {
      if (!id) return toast.info('当前任务没有可清除的记录 ID')
      if (!await confirmDialog(`确定永久清除“${card.title}”？这会删除关联执行记录/会话产物，无法撤销。`)) return
      if (isProjectRun) {
        await postTaskAction('/api/project-runs/purge', { id, reason: '用户从项目聊天任务卡永久清除' })
      } else {
        await postTaskAction('/api/tasks/delete', { id, reason: '用户从项目聊天任务卡永久清除前归档' })
        await postTaskAction('/api/tasks/purge', { id, reason: '用户从项目聊天任务卡永久清除' })
      }
      await removeMessageFromCurrentSession(msg)
    }
    toast.success(`${action.label}已提交`)
  } catch (error) {
    toast.error(error?.message || `${action.label}失败`)
  }
}

// 发送消息
const isStreaming = ref(false)
const thinkingMessages = ref([]) // 存储思考过程消息
const pendingProjectParentRunId = ref('')
const streamController = ref(null)
const makeProjectMessageId = () => `pmsg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
const stopStreaming = () => streamController.value?.abort()

const sendMessage = async () => {
  if (isStreaming.value || (!chatInput.value.trim() && chatFiles.value.length === 0) || !currentProject.value) return
  if (!currentSession.value) {
    toast.info('请先新建或选择一个会话')
    return
  }
  const projectAtSend = currentProject.value
  const sessionAtSend = currentSession.value
  const msg = chatInput.value.trim()
  const filesToSend = [...chatFiles.value]
  const parentRunId = pendingProjectParentRunId.value
  pendingProjectParentRunId.value = ''
  chatInput.value = ''
  chatFiles.value = []

  const attachmentText = filesToSend.length
    ? `\n\n[附件]\n${filesToSend.map(f => `- ${f.name}（${formatFileSize(f.size)}）`).join('\n')}`
    : ''
  const userMsg = { id: makeProjectMessageId(), role: 'user', content: `${msg || '请处理附件'}${attachmentText}`, timestamp: new Date().toISOString() }
  messages.value.push(userMsg)

  const thinkingMsg = {
    id: makeProjectMessageId(),
    role: 'thinking',
    content: '',
    timestamp: new Date().toISOString()
  }
  messages.value.push(thinkingMsg)
  scrollToBottom({ force: true })

  const agentMsg = { id: makeProjectMessageId(), role: 'assistant', content: '', workEvents: [], requestText: msg, streaming: true, timestamp: new Date().toISOString() }
  const controller = new AbortController()
  streamController.value = controller
  isStreaming.value = true
  thinkingMessages.value = []
  let agentMsgAdded = false
  let responseAccepted = false
  let userPersisted = false
  let backendError = ''

  const addAgentMessage = () => {
    if (agentMsgAdded) return
    messages.value.push(agentMsg)
    agentMsgAdded = true
  }
  const removeThinkingMessage = () => {
    const index = messages.value.indexOf(thinkingMsg)
    if (index !== -1) messages.value.splice(index, 1)
  }

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
        thinkingMessages.value.push(data.text)
        thinkingMsg.content = thinkingMessages.value.join('\n')
        scrollToBottom()
      } else if (data.type === 'task_runtime') {
        agentMsg.projectRun = data.run || agentMsg.projectRun
        agentMsg.task_id = data.taskExperience?.task_id || data.run?.id || agentMsg.task_id
        agentMsg.taskExperience = data.taskExperience || agentMsg.taskExperience
        addAgentMessage()
        scrollToBottom()
      } else if (data.type === 'work_event') {
        if (!Array.isArray(agentMsg.workEvents)) agentMsg.workEvents = []
        const event = data.event
        if (event && !agentMsg.workEvents.some(item => (item.id || `${item.kind}:${item.time}:${item.text}`) === (event.id || `${event.kind}:${event.time}:${event.text}`))) {
          agentMsg.workEvents.push(event)
          if (agentMsg.workEvents.length > 80) agentMsg.workEvents.splice(0, agentMsg.workEvents.length - 80)
        }
        addAgentMessage()
        scrollToBottom()
      } else if (data.type === 'chunk') {
        addAgentMessage()
        agentMsg.content += data.text
        scrollToBottom()
      } else if (data.type === 'done') {
        removeThinkingMessage()
        if (data.fileChanges && data.fileChanges.count > 0) {
          agentMsg.fileChanges = data.fileChanges
        }
        agentMsg.projectRun = data.run || agentMsg.projectRun
        agentMsg.task_id = data.taskExperience?.task_id || data.run?.id || agentMsg.task_id
        agentMsg.taskExperience = data.taskExperience || agentMsg.taskExperience
        agentMsg.workEvents = data.workEvents || agentMsg.workEvents
      } else if (data.type === 'error') {
        addAgentMessage()
        agentMsg.projectRun = data.run || agentMsg.projectRun
        agentMsg.task_id = data.taskExperience?.task_id || data.run?.id || agentMsg.task_id
        agentMsg.taskExperience = data.taskExperience || agentMsg.taskExperience
        backendError = String(data.text || '项目 Agent 执行失败')
      }
    } catch {}
  }

  try {
    await sessionsApi.saveMessage({ project: projectAtSend, sessionId: sessionAtSend, message: userMsg })
    userPersisted = true

    let res
    if (filesToSend.length > 0) {
      const formData = new FormData()
      formData.append('project', projectAtSend)
      formData.append('message', msg)
      if (parentRunId) formData.append('parent_run_id', parentRunId)
      filesToSend.forEach(file => formData.append('files', file))
      res = await fetch('/api/send-stream', { method: 'POST', body: formData, signal: controller.signal })
    } else {
      res = await fetch('/api/send-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: projectAtSend, message: msg, parent_run_id: parentRunId }),
        signal: controller.signal,
      })
    }
    if (!res.ok || !res.body) throw new Error(`发送失败（HTTP ${res.status}）`)
    responseAccepted = true

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let sseBuffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      sseBuffer += decoder.decode(value, { stream: true })
      const events = sseBuffer.split(/\r?\n\r?\n/)
      sseBuffer = events.pop() || ''
      for (const event of events) handleSseEvent(event)
    }
    sseBuffer += decoder.decode()
    if (sseBuffer.trim()) handleSseEvent(sseBuffer)
    if (backendError) throw new Error(backendError)
  } catch (error) {
    const stopped = error?.name === 'AbortError'
    addAgentMessage()
    if (stopped) {
      agentMsg.content = agentMsg.content
        ? `${agentMsg.content}\n\n本次处理已停止，已保留上面的回复。`
        : '本次处理已停止，你可以调整需求后重新发送。'
    } else {
      const detail = error?.message || '连接中断'
      agentMsg.content = agentMsg.content
        ? `${agentMsg.content}\n\n连接中断，已保留收到的内容。你可以继续追问或重新发送。`
        : `这次没有完成：${detail}。请检查项目 Agent 状态后重试。`
      if (!responseAccepted) {
        chatInput.value = msg
        chatFiles.value = filesToSend
      }
    }
  } finally {
    removeThinkingMessage()
    agentMsg.streaming = false
    isStreaming.value = false
    if (streamController.value === controller) streamController.value = null
    const hasAgentResult = agentMsg.content || agentMsg.taskExperience || agentMsg.workEvents.length
    if (hasAgentResult) {
      addAgentMessage()
      if (userPersisted) {
        try {
          await sessionsApi.saveMessage({
            project: projectAtSend,
            sessionId: sessionAtSend,
            message: { id: agentMsg.id, role: 'assistant', content: agentMsg.content, requestText: agentMsg.requestText, task_id: agentMsg.task_id || '', taskExperience: agentMsg.taskExperience || null, timestamp: agentMsg.timestamp, fileChanges: agentMsg.fileChanges || null, workEvents: agentMsg.workEvents || [] }
          })
        } catch (error) { toast.warning('回复已显示，但会话保存失败，请刷新后确认') }
      }
    }
    if (currentSessionNew.value && userPersisted && agentMsg.content) {
      currentSessionNew.value = false
      autoNameSession(projectAtSend, sessionAtSend, msg)
    }
    scrollToBottom()
  }
}

const formatFileSize = (size) => {
  if (!size) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

const onChatFilesSelected = (files) => {
  chatFiles.value = [...chatFiles.value, ...files]
}

const removeChatFile = (index) => {
  chatFiles.value.splice(index, 1)
}

const openFileDiff = (file) => {
  openSingleFileChange(file)
}

const openProjectChangesTab = () => {
  // 项目管理页内已经在当前项目上下文中，抽屉按钮只负责保留用户在本页继续查看。
  toast.info('当前已经在项目页，可继续在抽屉里查看本轮改动')
}


const closeFileDiff = () => {
  diffViewer.value = { visible: false, file: null }
}

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
  feishuProjectSetupToken.value = ''
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
    feishuProjectSetupToken.value = data.setup_token || ''

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
const projectToolAudit = ref(null)
const projectAuthorizationReadiness = ref(null)
const projectConnectionPreflight = ref(null)
const projectToolVerification = ref(null)
const projectVerificationCommands = ref('')
const inferredProjectVerificationCommands = ref([])
const projectVerificationSource = ref('missing')
const projectResponsibility = ref('')
const projectCapabilities = ref('')
const projectWritablePaths = ref('')
const projectForbiddenPaths = ref('')
const projectDeliveryContract = ref('')

const normalizeProjectTools = (tools = {}) => ({
  mcp: Array.from(new Set((Array.isArray(tools.mcp) ? tools.mcp : []).map(item => String(item || '').trim()).filter(Boolean))),
  skill: Array.from(new Set((Array.isArray(tools.skill) ? tools.skill : []).map(item => String(item || '').trim()).filter(Boolean)))
})

const loadProjectTools = async () => {
  if (!currentProject.value) return

  // 加载项目工具配置
  const projRes = await fetch(`/api/projects/tools?project=${encodeURIComponent(currentProject.value)}`)
  const projData = await projRes.json()
  projectTools.value = normalizeProjectTools(projData.tools)
  projectToolAudit.value = projData.tool_audit || null
  projectAuthorizationReadiness.value = projData.authorization_readiness || null
  projectConnectionPreflight.value = projData.connection_preflight || null
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

  const options = await fetch('/api/tools/authorization-options').then(r => r.json()).catch(() => ({ mcp: [], skill: [] }))
  allTools.value.mcp = options.mcp || []
  allTools.value.skill = options.skill || []
  const verification = await fetch(`/api/tools/chain-verification?project=${encodeURIComponent(currentProject.value)}`).then(r => r.json()).catch(() => ({ rows: [] }))
  projectToolVerification.value = verification.rows?.[0] || null

  showTools.value = true
}

const saveProjectTools = async () => {
  projectTools.value = normalizeProjectTools(projectTools.value)
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
    projectTools.value = normalizeProjectTools(data.tools)
    projectToolAudit.value = data.tool_audit || null
    projectAuthorizationReadiness.value = data.authorization_readiness || null
    projectConnectionPreflight.value = data.connection_preflight || null
    showTools.value = false
    if (data.authorization_readiness && data.authorization_readiness.dispatchReady === false) {
      toast.warning('工具配置已保存，但有授权项当前不可用')
    } else {
      toast.success('工具配置已保存')
    }
  } else {
    toast.error('保存失败: ' + (data.error || '未知错误'))
  }
}

const applyInferredVerificationCommands = () => {
  if (!inferredProjectVerificationCommands.value.length) return
  projectVerificationCommands.value = inferredProjectVerificationCommands.value.join('\n')
  projectVerificationSource.value = 'configured'
}

const updateProjectToolField = ({ field, value }) => {
  const targets = {
    responsibility: projectResponsibility,
    capabilities: projectCapabilities,
    writablePaths: projectWritablePaths,
    forbiddenPaths: projectForbiddenPaths,
    deliveryContract: projectDeliveryContract,
    verificationCommands: projectVerificationCommands,
  }
  if (targets[field]) targets[field].value = value
}

const toggleProjectTool = (type, name) => {
  const normalized = normalizeProjectTools(projectTools.value)
  const list = normalized[type] || []
  const index = list.indexOf(name)
  if (index >= 0) {
    list.splice(index, 1)
  } else {
    list.push(name)
    if (type === 'mcp' && !String(name).includes('/')) {
      normalized.mcp = normalized.mcp.filter(item => item === name || !item.startsWith(`${name}/`))
    }
  }
  projectTools.value = normalized
}

// 项目共享文件
const projectFiles = ref([])
const showAddFile = ref(false)
const showEditFile = ref(false)
const editFileName = ref('')
const editFileContent = ref('')

const updateProjectSharedFileField = ({ field, value }) => {
  if (field === 'name') editFileName.value = value
  if (field === 'content') editFileContent.value = value
}

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
  stopStreaming()
  detachMessagesResizeObserver()
})

const handleInput = (e) => {
  const value = e.target.value
  if (slash.onInput()) {
    hideTemplateAssist()
    return
  }
  if (value.startsWith('/')) {
    hideTemplateAssist()
    return
  }

  showTemplateSelector.value = false
  detectRecommendation(value)
}

const handleKeydown = async (e) => {
  if (await slash.onKeydown(e)) return
  if (handleTemplateKeydown(e)) return

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}
</script>

<template>
  <div class="project-manager">
    <ProjectWorkspaceHeader
      v-model="currentProject"
      :projects="projects"
      :page-info="pageInfo"
      :busy-action="projectActionBusy"
      :has-session="!!currentSession"
      @select="selectProject"
      @start="startProject($event.name)"
      @stop="stopProject($event.name)"
      @switch-agent="openSwitchAgent"
      @edit="openEditModal"
      @tools="loadProjectTools"
      @files="loadProjectSharedFiles"
      @save-knowledge="saveCurrentProjectSessionKnowledge"
      @archive="deleteProject($event.name)"
      @open-archives="showArchives = true"
      @create="openCreateModal"
    />

    <div class="main-content">
      <ProjectSessionSidebar
        :project="currentProject || ''"
        :sessions="sessions"
        :current-session="currentSession || ''"
        :open="mobileSessionsOpen"
        @select="selectSession"
        @create="createSession"
        @refresh="loadSessions(currentProject)"
        @rename="renameSession"
        @delete="deleteSession"
        @close="mobileSessionsOpen = false"
      />

      <div class="content">
        <div class="content-header">
          <button class="mobile-session-trigger" title="打开会话列表" @click="mobileSessionsOpen = true"><PanelLeft :size="18" /></button>
          <span>{{ currentSession ? `${currentProject} · ${sessions.find(item => item.id === currentSession)?.name || '当前会话'}` : '项目对话' }}</span>
        </div>
        <div id="messages" ref="messagesEl" class="messages" @scroll="updateMessageScrollState">
          <div v-if="!currentSession" class="empty">
            <span class="icon">💬</span>
            <span>选择一个会话开始对话</span>
          </div>
          <template v-else>
            <div v-for="(msg, i) in messages" :key="getMessageKey(msg)" :id="'msg-' + i" class="message" :class="[msg.role, { 'msg-highlight': highlightMsgIndex === i }]">
              <CommandResultCard v-if="msg.type === 'command_result'" :result="msg.commandResult" />
              <!-- 思考过程消息 -->
              <div v-else-if="msg.role === 'thinking'" class="thinking-bubble">
                <div class="thinking-header">
                  <span>项目 Agent 正在处理...</span>
                </div>
                <span class="stream-cursor">▌</span>
              </div>
              <!-- 用户消息 -->
              <div v-else-if="msg.role === 'user'" class="bubble">
                <div>{{ msg.content }}</div>
              </div>
              <!-- Agent 回复 -->
              <div v-else class="bubble">
                <ProjectAgentMessage
                  :message="msg"
                  :task-card="getProjectTaskCard(msg)"
                  :is-last-streaming="isStreaming && i === messages.length - 1"
                  @task-action="handleProjectTaskAction(msg, $event)"
                  @open-file-diff="openFileDiff"
                />
              </div>
              <div class="msg-meta">{{ new Date(msg.timestamp).toLocaleString('zh-CN') }}</div>
            </div>
          </template>
        </div>
        <MessageNavigator
          :items="navMessages"
          :scroll-container="messagesEl"
          target-id-prefix="msg-"
          @navigate="scrollToMessage"
        />
        <ChatComposer
          v-model="chatInput"
          input-id="projectChatInput"
          placeholder="向项目 Agent 发送消息..."
          send-label="发送"
          :files="chatFiles"
          :slash="slash"
          :templates-open="showTemplateSelector"
          :templates="allTemplates"
          :template-search-query="templateSearchQuery"
          :active-template-index="activeTemplateIndex"
          :recommended-template="recommendedTemplate"
          :disabled="!currentProject || !currentSession"
          :busy="isStreaming"
          @files-selected="onChatFilesSelected"
          @remove-file="removeChatFile"
          @open-template="openTemplateSelector"
          @update:template-search-query="templateSearchQuery = $event"
          @select-template="selectChatTemplate"
          @apply-recommendation="applyRecommendation"
          @keydown="handleKeydown"
          @input="handleInput"
          @send="sendMessage"
          @stop="stopStreaming"
        />
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

    <UnifiedDiffModal
      :visible="diffViewer.visible"
      :file="diffViewer.file"
      @close="closeFileDiff"
    />

    <AgentCodeChangeDrawer
      :visible="codeChangeDrawer.visible"
      :title="codeChangeDrawer.title"
      :subtitle="codeChangeDrawer.subtitle"
      :project="codeChangeDrawer.project"
      :fileChanges="codeChangeDrawer.fileChanges"
      :files="codeChangeDrawer.files"
      :selectedPath="codeChangeDrawer.selectedPath"
      @close="closeCodeChangeDrawer"
    />

    <ProjectFormModal
      v-if="showCreate"
      mode="create"
      :form="form"
      :agent-options="agentOptions"
      :platforms="platforms"
      @update-field="updateProjectFormField"
      @browse="openFolderBrowser"
      @open-feishu="openFeishuQr"
      @close="showCreate = false"
      @submit="submitCreate"
    />

    <ProjectFormModal
      v-if="showEdit"
      mode="edit"
      :project="editProject"
      :form="form"
      :agent-options="agentOptions"
      :platforms="platforms"
      @update-field="updateProjectFormField"
      @browse="openFolderBrowser"
      @open-feishu="openFeishuQr"
      @close="showEdit = false"
      @submit="submitEdit"
    />

    <ProjectFeishuQrModal
      v-if="showFeishuQr"
      :url="feishuQrUrl"
      :status="feishuQrStatus"
      :loading="feishuQrLoading"
      @start="startFeishuQrSetup"
      @close="showFeishuQr = false"
    />

    <ProjectFolderBrowserModal
      v-if="showFolderBrowser"
      :path="browsePath"
      :items="browseItems"
      :drives="drives"
      @load="loadFolderContents"
      @go-up="browseGoUp"
      @refresh="loadFolderContents(browsePath)"
      @select="selectFolder"
      @close="showFolderBrowser = false"
    />

    <ProjectAgentSwitchModal
      v-if="showSwitchAgent"
      :project="editProject"
      :agent-options="agentOptions"
      @switch-agent="switchAgent"
      @close="showSwitchAgent = false"
    />

    <ProjectToolsModal
      v-if="showTools"
      :project-name="currentProject"
      :all-tools="allTools"
      :project-tools="projectTools"
      :tool-audit="projectToolAudit"
      :authorization-readiness="projectAuthorizationReadiness"
      :connection-preflight="projectConnectionPreflight"
      :verification-status="projectToolVerification"
      :responsibility="projectResponsibility"
      :capabilities="projectCapabilities"
      :writable-paths="projectWritablePaths"
      :forbidden-paths="projectForbiddenPaths"
      :delivery-contract="projectDeliveryContract"
      :verification-commands="projectVerificationCommands"
      :inferred-commands="inferredProjectVerificationCommands"
      :verification-source="projectVerificationSource"
      @update-field="updateProjectToolField"
      @toggle-tool="toggleProjectTool"
      @apply-inferred="applyInferredVerificationCommands"
      @save="saveProjectTools"
      @close="showTools = false"
    />

    <ProjectSharedFilesModal
      :visible="showSharedFiles"
      :project-name="currentProject"
      :files="projectFiles"
      :show-add="showAddFile"
      :show-edit="showEditFile"
      :edit-file-name="editFileName"
      :edit-file-content="editFileContent"
      @update-field="updateProjectSharedFileField"
      @add-file="addProjectFile"
      @edit-file="editProjectFile"
      @delete-file="deleteProjectFile"
      @submit-add="submitAddProjectFile"
      @submit-edit="submitEditProjectFile"
      @close-add="showAddFile = false"
      @close-edit="showEditFile = false"
      @close="showSharedFiles = false"
    />

    <ProjectArchiveManager
      v-if="showArchives"
      @close="showArchives = false"
      @changed="loadProjects"
      @notify="handleArchiveNotify"
    />

    <TemplateVariablesModal
      v-if="showVariableModal && activeTemplate"
      :template="activeTemplate"
      :variables="templateVariables"
      @update-variable="({ key, value }) => { templateVariables[key] = value }"
      @apply="applyTemplateVariables"
      @close="showVariableModal = false"
    />
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
  justify-content: flex-start;
  gap: 10px;
  align-items: center;
}

.mobile-session-trigger { display:none; width:34px; height:34px; align-items:center; justify-content:center; padding:0; border:1px solid rgba(15,23,42,.1); border-radius:7px; background:var(--surface,#fff); color:var(--text-secondary); }

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
  white-space: pre-wrap;
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

.msg-meta {
  font-size: 11.5px;
  color: var(--text-muted);
  margin-top: 6px;
  font-family: 'Share Tech Mono', monospace;
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
  .main-content,.content { min-width:0; width:100%; }
  .content-header { padding:10px 12px; min-height:48px; }
  .mobile-session-trigger { display:inline-flex; }
  .messages { padding:14px 12px; }
  .message { max-width:94%; }
  .message .bubble { padding:10px 12px; border-radius:10px; font-size:14px; }
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
</style>

