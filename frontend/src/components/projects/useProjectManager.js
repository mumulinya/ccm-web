import { ref, onMounted, onUnmounted, nextTick, computed, watch, inject } from 'vue'
import { api, projectsApi, sessionsApi } from '../../api/index.js'
import { toast, confirmDialog } from '../../utils/toast.js'
import { mergeUniqueAttachmentFiles } from '../../utils/clipboardAttachments.js'
import ChatComposer from '../common/ChatComposer.vue'
import ConversationTurnControls from '../common/ConversationTurnControls.vue'
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
import { useConversationTurnControl } from '../../composables/useConversationTurnControl.js'
import { notifySessionContextUsage } from '../../composables/useSessionContextUsage.js'
import { projectExecutionTaskCard } from '../../utils/taskExperience.js'
import { shouldShowProjectTaskCard } from '../../utils/projectChatPresentation.js'
import { buildProjectSessionKnowledgePayload, buildProjectTaskKnowledgePayload, postKnowledgeCapture } from '../../utils/knowledgeCapture.js'

export function useProjectManager(props, emit) {
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

      if (target.sessionId && target.sessionId !== currentSession.value) {
        await nextTick()
        await selectSession(target.sessionId)
      }

      if (target.draftMessage) {
        await nextTick()
        chatInput.value = String(target.draftMessage)
      } else if (target.autoMessage) {
        await nextTick()
        chatInput.value = target.autoMessage
        await nextTick()
        sendMessage()
      } else if (target.sessionId) {
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
    compactSession: async (payload = {}) => {
      if (!currentProject.value || !currentSession.value) throw new Error('请先选择项目会话')
      const project = currentProject.value
      const sessionId = currentSession.value
      const scopeId = `${project}::${sessionId}`
      notifySessionContextUsage('project_session', scopeId, { active: true, reason: 'manual_compact' })
      try {
        const data = await sessionsApi.compact({
          project,
          sessionId,
          customInstructions: String(payload.args || '').trim(),
        })
        return {
          ...data,
          summary: data.compacted
            ? '当前项目会话已用模型压缩，下一条消息将从新的第三方 Agent 会话世代继续。'
            : '当前项目会话没有可压缩的旧消息。',
          metrics: { 压缩前: data.before_tokens || 0, 压缩后: data.after_tokens || 0, 新世代: data.next_generation || 0 },
        }
      } finally {
        notifySessionContextUsage('project_session', scopeId, { active: false, reason: 'manual_compact_complete' })
      }
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

  const agentOptions = ref([])

  const loadAgentOptions = async () => {
    try {
      const data = await api('/api/agents')
      const agents = Array.isArray(data.agents) ? data.agents : []
      agentOptions.value = agents
    } catch {
      agentOptions.value = []
      toast.error('无法读取开发 Agent 注册表，请检查 CCM 服务')
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
  const browseHome = ref('')
  const browseLoading = ref(false)
  const browseError = ref('')
  const showFolderBrowser = ref(false)
  // 表单数据
  const form = ref({
    name: '',
    work_dir: '',
    agent: 'claudecode',
    platform: 'feishu',
    source_type: 'local',
    repository_url: '',
    repository_original_url: '',
    repository_branch: '',
    initialize_repository: false,
    git_loading: false,
    git_status: null
  })

  const updateProjectFormField = ({ field, value }) => {
    if (!field) return
    form.value[field] = value
    if (field === 'repository_url' && showCreate.value && !String(form.value.name || '').trim()) {
      const match = String(value || '').trim().match(/[/:]([^/:]+?)(?:\.git)?$/)
      if (match?.[1]) form.value.name = match[1]
    }
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
    const defaultAgent = agentOptions.value.find(agent => agent.enabled !== false && agent.ready)?.type
      || agentOptions.value.find(agent => agent.enabled !== false)?.type
      || agentOptions.value[0]?.type
      || ''
    form.value = {
      name: '', work_dir: '', agent: defaultAgent, platform: 'feishu', source_type: 'local',
      repository_url: '', repository_original_url: '', repository_branch: '', initialize_repository: false, git_loading: false, git_status: null
    }
    showCreate.value = true
  }

  // 提交创建
  const submitCreate = async () => {
    if (!form.value.name || !form.value.work_dir) {
      toast.warning('请填写项目名称和目录')
      return
    }
    if (form.value.source_type === 'github' && !String(form.value.repository_url || '').trim()) {
      toast.warning('请填写 GitHub 仓库地址')
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
  const loadProjectGitStatus = async () => {
    if (!editProject.value?.name) return
    form.value.git_loading = true
    try {
      const result = await projectsApi.gitStatus(editProject.value.name)
      const status = result.status || null
      form.value.git_status = status
      form.value.repository_url = status?.remote_url || ''
      form.value.repository_original_url = status?.remote_url || ''
    } catch (error) {
      form.value.git_status = null
      toast.error(error?.message || '读取项目 Git 状态失败')
    } finally {
      form.value.git_loading = false
    }
  }

  const openEditModal = async (project) => {
    editProject.value = project
    const platformMap = { '飞书': 'feishu', '微信': 'weixin', 'Lark': 'lark', 'Telegram': 'telegram', 'Slack': 'slack', 'Discord': 'discord' }
    const rawPlatform = project.platform || 'feishu'
    const mappedPlatform = platformMap[rawPlatform] || rawPlatform
    form.value = {
      name: project.name,
      work_dir: project.work_dir || '',
      agent: project.agent || 'claudecode',
      platform: mappedPlatform,
      source_type: 'local',
      repository_url: '',
      repository_original_url: '',
      repository_branch: '',
      initialize_repository: false,
      git_loading: true,
      git_status: null
    }
    showEdit.value = true
    await loadProjectGitStatus()
  }

  // 提交编辑
  const submitEdit = async () => {
    const repositoryChanged = String(form.value.repository_url || '').trim() !== String(form.value.repository_original_url || '').trim()
    const res = await projectsApi.update({
      ...form.value,
      repository_url: repositoryChanged ? form.value.repository_url : ''
    })
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

  const getProjectTaskCard = (msg) => shouldShowProjectTaskCard(msg) ? projectExecutionTaskCard(msg, currentProject.value) : null
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
  const activeProjectRunId = ref('')
  const stoppingProjectTurn = ref(false)
  const makeProjectMessageId = () => `pmsg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

  const projectTurnConversationId = computed(() => currentProject.value && currentSession.value
    ? `${currentProject.value}:${currentSession.value}`
    : '')
  const projectTurnControl = useConversationTurnControl({
    scope: 'project',
    conversationId: projectTurnConversationId,
    busy: isStreaming,
  })
  const projectComposerSendLabel = computed(() => isStreaming.value
    ? (projectTurnControl.mode.value === 'steer' ? '引导' : '排队')
    : '发送')

  const stopStreaming = async () => {
    if (!isStreaming.value || stoppingProjectTurn.value) return
    stoppingProjectTurn.value = true
    try {
      if (activeProjectRunId.value) {
        await postTaskAction('/api/project-runs/cancel', {
          id: activeProjectRunId.value,
          reason: '用户从项目会话停止当前工作',
        }).catch((error) => toast.warning(error?.message || '后端停止请求未完成，正在中断当前连接'))
      }
      streamController.value?.abort()
    } finally {
      stoppingProjectTurn.value = false
    }
  }

  const drainProjectTurnQueue = () => projectTurnControl.drain(async (turn) => {
    const result = await sendMessage({ queueTurn: turn })
    if (result?.success === false) throw new Error(result.error || '项目消息没有完成')
    return { run_id: result?.runId || '' }
  })
  watch(
    () => [projectTurnConversationId.value, isStreaming.value, projectTurnControl.turns.value.filter(turn => turn.status === 'queued').length],
    ([conversationId, busy, queued]) => {
      if (conversationId && !busy && queued) window.setTimeout(() => drainProjectTurnQueue().catch(() => {}), 0)
    },
    { flush: 'post' },
  )

  const submitProjectMessageWhileBusy = async () => {
    const message = chatInput.value.trim()
    if (!message) return
    if (chatFiles.value.length) {
      toast.info('工作中的排队消息暂不保存本地附件，请停止当前工作后连同附件发送')
      return
    }
    const requestedMode = projectTurnControl.mode.value
    const turn = await projectTurnControl.enqueue({
      message,
      mode: requestedMode,
      activeRunId: activeProjectRunId.value,
      metadata: {
        project: currentProject.value,
        session_id: currentSession.value,
        parent_run_id: activeProjectRunId.value,
        requested_mode: requestedMode,
      },
    })
    chatInput.value = ''
    toast.success(requestedMode === 'steer' ? '已接收引导，正在安全停止当前执行后继续' : '已加入队列，当前回复结束后会自动发送')
    if (requestedMode === 'steer') await stopStreaming()
    window.setTimeout(() => drainProjectTurnQueue().catch(() => {}), 0)
    return turn
  }

  const sendMessage = async (options = {}) => {
    const queuedTurn = options?.queueTurn || null
    if (isStreaming.value && !queuedTurn) return submitProjectMessageWhileBusy()
    if ((!queuedTurn && !chatInput.value.trim() && chatFiles.value.length === 0) || !currentProject.value) return
    if (!currentSession.value) {
      toast.info('请先新建或选择一个会话')
      return
    }
    const projectAtSend = queuedTurn?.metadata?.project || currentProject.value
    const sessionAtSend = queuedTurn?.metadata?.session_id || currentSession.value
    const msg = queuedTurn ? String(queuedTurn.message || '').trim() : chatInput.value.trim()
    const filesToSend = queuedTurn ? [] : [...chatFiles.value]
    const parentRunId = queuedTurn?.metadata?.parent_run_id || pendingProjectParentRunId.value
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
      messageMode: 'conversation',
      timestamp: new Date().toISOString()
    }
    messages.value.push(thinkingMsg)
    scrollToBottom({ force: true })

    const agentMsg = { id: makeProjectMessageId(), role: 'assistant', content: '', workEvents: [], requestText: msg, messageMode: 'conversation', streaming: true, timestamp: new Date().toISOString() }
    const controller = new AbortController()
    streamController.value = controller
    isStreaming.value = true
    thinkingMessages.value = []
    let agentMsgAdded = false
    let responseAccepted = false
    let userPersisted = false
    let backendError = ''
    let requestError = ''

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
        if (data.type === 'presentation') {
          const mode = String(data.message_mode || data.messageMode || 'conversation')
          thinkingMsg.messageMode = mode
          agentMsg.messageMode = mode
        } else if (data.type === 'status') {
          thinkingMessages.value.push(data.text)
          thinkingMsg.content = thinkingMessages.value.join('\n')
          scrollToBottom()
        } else if (data.type === 'task_runtime') {
          agentMsg.projectRun = data.run || agentMsg.projectRun
          activeProjectRunId.value = data.run?.id || activeProjectRunId.value
          agentMsg.task_id = data.taskExperience?.task_id || data.run?.id || agentMsg.task_id
          agentMsg.taskExperience = data.taskExperience || agentMsg.taskExperience
          if (agentMsg.messageMode === 'task') {
            addAgentMessage()
            scrollToBottom()
          }
        } else if (data.type === 'work_event') {
          if (!Array.isArray(agentMsg.workEvents)) agentMsg.workEvents = []
          const event = data.event
          if (event && !agentMsg.workEvents.some(item => (item.id || `${item.kind}:${item.time}:${item.text}`) === (event.id || `${event.kind}:${event.time}:${event.text}`))) {
            agentMsg.workEvents.push(event)
            if (agentMsg.workEvents.length > 80) agentMsg.workEvents.splice(0, agentMsg.workEvents.length - 80)
          }
          if (agentMsg.messageMode === 'task') {
            addAgentMessage()
            scrollToBottom()
          }
        } else if (data.type === 'chunk') {
          addAgentMessage()
          agentMsg.content += data.text
          scrollToBottom()
        } else if (data.type === 'done') {
          removeThinkingMessage()
          if (data.usage_anchor_id) agentMsg.id = data.usage_anchor_id
          if (data.provider_usage) agentMsg.provider_usage = data.provider_usage
          notifySessionContextUsage('project_session', `${projectAtSend}::${sessionAtSend}`, { reason: 'provider_usage_updated' })
          agentMsg.messageMode = data.message_mode || data.messageMode || agentMsg.messageMode
          if (data.fileChanges && data.fileChanges.count > 0) {
            agentMsg.fileChanges = data.fileChanges
          }
          agentMsg.projectRun = data.run || agentMsg.projectRun
          agentMsg.task_id = data.taskExperience?.task_id || data.run?.id || agentMsg.task_id
          agentMsg.taskExperience = data.taskExperience || agentMsg.taskExperience
          agentMsg.workEvents = data.workEvents || agentMsg.workEvents
        } else if (data.type === 'error') {
          addAgentMessage()
          agentMsg.messageMode = data.message_mode || data.messageMode || agentMsg.messageMode
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
        formData.append('session_id', sessionAtSend)
        if (parentRunId) formData.append('parent_run_id', parentRunId)
        filesToSend.forEach(file => formData.append('files', file))
        res = await fetch('/api/send-stream', { method: 'POST', body: formData, signal: controller.signal })
      } else {
        res = await fetch('/api/send-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project: projectAtSend, session_id: sessionAtSend, message: msg, parent_run_id: parentRunId }),
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
      requestError = stopped ? '当前工作已停止' : (error?.message || '连接中断')
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
      const completedRunId = agentMsg.projectRun?.id || activeProjectRunId.value
      if (!agentMsg.projectRun || agentMsg.projectRun?.id === activeProjectRunId.value) activeProjectRunId.value = ''
      const hasAgentResult = agentMsg.content || agentMsg.taskExperience || agentMsg.workEvents.length
      if (hasAgentResult) {
        addAgentMessage()
        if (userPersisted) {
          try {
            await sessionsApi.saveMessage({
              project: projectAtSend,
              sessionId: sessionAtSend,
              message: { id: agentMsg.id, role: 'assistant', content: agentMsg.content, requestText: agentMsg.requestText, messageMode: agentMsg.messageMode, task_id: agentMsg.task_id || '', taskExperience: agentMsg.taskExperience || null, timestamp: agentMsg.timestamp, fileChanges: agentMsg.fileChanges || null, workEvents: agentMsg.workEvents || [], provider_usage: agentMsg.provider_usage || null }
            })
          } catch (error) { toast.warning('回复已显示，但会话保存失败，请刷新后确认') }
        }
      }
      if (currentSessionNew.value && userPersisted && agentMsg.content) {
        currentSessionNew.value = false
        autoNameSession(projectAtSend, sessionAtSend, msg)
      }
      scrollToBottom()
      if (!queuedTurn) window.setTimeout(() => drainProjectTurnQueue().catch(() => {}), 0)
    }
    return { success: !requestError && !backendError, error: requestError || backendError, runId: agentMsg.projectRun?.id || '' }
  }

  const formatFileSize = (size) => {
    if (!size) return '0 B'
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
    return `${(size / 1024 / 1024).toFixed(1)} MB`
  }

  const onChatFilesSelected = (files) => {
    chatFiles.value = mergeUniqueAttachmentFiles(chatFiles.value, files)
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
    const preferred = String(form.value[target] || '').trim()
    await loadFolderContents(preferred || browseHome.value || '')
    if (preferred && browseError.value) await loadFolderContents(browseHome.value || '')
  }

  const loadDrives = async () => {
    try {
      const res = await fetch('/api/filesystem/drives')
      const data = await res.json()
      drives.value = data.drives || []
      browseHome.value = data.home || ''
    } catch (e) {
      drives.value = []
      browseHome.value = ''
    }
  }

  const loadFolderContents = async (dir) => {
    browseLoading.value = true
    browseError.value = ''
    try {
      const res = await fetch(`/api/filesystem/browse?dir=${encodeURIComponent(dir)}`)
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error || '目录读取失败')
      browsePath.value = data.path
      browseItems.value = data.items || []
    } catch (e) {
      browseItems.value = []
      browseError.value = e.message || '目录读取失败'
    } finally {
      browseLoading.value = false
    }
  }

  const createBrowseFolder = async (name) => {
    if (!browsePath.value || !String(name || '').trim()) return
    browseLoading.value = true
    browseError.value = ''
    try {
      const res = await fetch('/api/filesystem/directory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent: browsePath.value, name: String(name).trim() })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.success === false) throw new Error(data.error || '创建文件夹失败')
      toast.success(`已创建文件夹 ${data.name}`)
      await loadFolderContents(data.path)
    } catch (e) {
      browseError.value = e.message || '创建文件夹失败'
      toast.error(browseError.value)
    } finally {
      browseLoading.value = false
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

  return {
    ChatComposer, ConversationTurnControls, CommandResultCard, MessageNavigator, AgentCodeChangeDrawer, ProjectAgentMessage,
    UnifiedDiffModal, TemplateVariablesModal, ProjectFormModal, ProjectFeishuQrModal, ProjectFolderBrowserModal, ProjectToolsModal,
    ProjectSharedFilesModal, ProjectAgentSwitchModal, ProjectWorkspaceHeader, ProjectSessionSidebar, ProjectArchiveManager, PanelLeft,
    highlightMsgIndex, handleNavigation, scrollToMessage, projects, currentProject, currentSession,
    sessions, messages, messagesEl, chatInput, isMessagesPinnedToBottom, updateMessageScrollState,
    scrollToBottom, attachMessagesResizeObserver, detachMessagesResizeObserver, navMessages, codeChangeDrawer, openCodeChangeDrawer,
    openSingleFileChange, closeCodeChangeDrawer, slashNavigate, runProjectClientCommand, slash, focusProjectInput,
    showTemplateSelector, allTemplates, templateSearchQuery, activeTemplateIndex, recommendedTemplate, activeTemplate,
    templateVariables, showVariableModal, openTemplateSelector, selectChatTemplate, applyTemplateVariables, detectRecommendation,
    applyRecommendation, handleTemplateKeydown, hideTemplateAssist, chatFiles, diffViewer, pageInfo,
    agentOptions, loadAgentOptions, messageKeyMap, messageKeySeq, getMessageKey,
    showCreate, showEdit, showSwitchAgent, showTools, showSharedFiles, showArchives,
    mobileSessionsOpen, projectActionBusy, showFeishuQr, editProject, feishuQrUrl, feishuQrStatus,
    feishuQrLoading, feishuProjectSetupToken, browsePath, browseItems, browseTarget, drives, browseHome, browseLoading, browseError,
    showFolderBrowser, form, updateProjectFormField, platforms, loadProjects, activeSelectedTemplate,
    pendingTemplateToApply, selectProject, loadSessions, selectSession, startProject, stopProject,
    deleteProject, handleArchiveNotify, openCreateModal, submitCreate, openEditModal, submitEdit, loadProjectGitStatus,
    openSwitchAgent, switchAgent, startProjectWithAgent, createSession, renameSession, deleteSession,
    saveCurrentProjectSessionKnowledge, getProjectTaskCard, postTaskAction, removeMessageFromCurrentSession, handleProjectTaskAction, isStreaming,
    thinkingMessages, pendingProjectParentRunId, streamController, activeProjectRunId, stoppingProjectTurn, makeProjectMessageId,
    projectTurnConversationId, projectTurnControl, projectComposerSendLabel, stopStreaming, drainProjectTurnQueue, submitProjectMessageWhileBusy,
    sendMessage, formatFileSize, onChatFilesSelected, removeChatFile, openFileDiff, openProjectChangesTab,
    closeFileDiff, currentSessionNew, autoNameSession, chatTarget, showLogsPanel, logsContent,
    toggleLogs, loadLogs, openFeishuQr, startFeishuQrSetup, openFolderBrowser, loadDrives,
    loadFolderContents, browseGoUp, createBrowseFolder, selectFolder, projectTools, allTools, projectToolAudit,
    projectAuthorizationReadiness, projectConnectionPreflight, projectToolVerification, projectVerificationCommands, inferredProjectVerificationCommands, projectVerificationSource,
    projectResponsibility, projectCapabilities, projectWritablePaths, projectForbiddenPaths, projectDeliveryContract, normalizeProjectTools,
    loadProjectTools, saveProjectTools, applyInferredVerificationCommands, updateProjectToolField, toggleProjectTool, projectFiles,
    showAddFile, showEditFile, editFileName, editFileContent, updateProjectSharedFileField, loadProjectSharedFiles,
    addProjectFile, submitAddProjectFile, editProjectFile, submitEditProjectFile, deleteProjectFile, handleInput,
    handleKeydown
  }
}
