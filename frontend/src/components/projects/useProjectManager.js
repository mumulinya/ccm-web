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
import ProjectFormModal from './ProjectFormModal.vue'
import ProjectFeishuQrModal from './ProjectFeishuQrModal.vue'
import ProjectFolderBrowserModal from './ProjectFolderBrowserModal.vue'
import ProjectToolsModal from './ProjectToolsModal.vue'
import ProjectSharedFilesModal from './ProjectSharedFilesModal.vue'
import ProjectAgentSwitchModal from './ProjectAgentSwitchModal.vue'
import ProjectWorkspaceHeader from './ProjectWorkspaceHeader.vue'
import ProjectSessionSidebar from './ProjectSessionSidebar.vue'
import ProjectArchiveManager from './ProjectArchiveManager.vue'
import ProjectRuntimeBar from './ProjectRuntimeBar.vue'
import ProjectRuntimeConfigModal from './ProjectRuntimeConfigModal.vue'
import ProjectRunConsole from './ProjectRunConsole.vue'
import GroupTestTargetsModal from '../collaboration/GroupTestTargetsModal.vue'
import { PanelLeft } from '@lucide/vue'
import { useSlashCommands } from '../../composables/useSlashCommands.js'
import { createSlashCommandClientActions } from '../../composables/useSlashCommandClientActions.js'
import { useCodeChangeDrawer } from '../../composables/useCodeChangeDrawer.js'
import { useMessageNavigation } from '../../composables/useMessageNavigation.js'
import { usePinnedScroll } from '../../composables/usePinnedScroll.js'
import { useConversationTurnControl } from '../../composables/useConversationTurnControl.js'
import { notifySessionContextUsage } from '../../composables/useSessionContextUsage.js'
import { projectExecutionTaskCard } from '../../utils/taskExperience.js'
import { shouldShowProjectTaskCard } from '../../utils/projectChatPresentation.js'
import { buildProjectSessionKnowledgePayload, buildProjectTaskKnowledgePayload, postKnowledgeCapture } from '../../utils/knowledgeCapture.js'
import { subscribeRuntimeEvents } from '../../utils/runtimeEventBus.js'
import { getEditableUserMessageText, hasMessageAttachments } from '../../utils/messageActions.js'

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
  const currentSessionDraft = ref(false)
  const hasProjectConversation = computed(() => !!currentSession.value || currentSessionDraft.value)
  const sessions = ref([])
  const projectFeishuTargets = ref([])
  const projectFeishuBindingSession = ref(null)
  const projectFeishuBindingOpen = ref(false)
  const projectFeishuBindingBusy = ref(false)
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
      return { success: true, summary: '已打开空白项目会话，发送第一条消息后才会创建。', metrics: { 项目: currentProject.value, 状态: '未创建' } }
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
  const projectCreateBusy = ref(false)
  const projectCloneStatus = ref(null)
  const showEdit = ref(false)
  const showSwitchAgent = ref(false)
  const showTools = ref(false)
  const showProjectTestTargets = ref(false)
  const showSharedFiles = ref(false)
  const showArchives = ref(false)
  const mobileSessionsOpen = ref(false)
  const projectActionBusy = ref('')
  const projectRuntime = ref(null)
  const projectRuntimeLoading = ref(false)
  const projectRuntimeBusy = ref('')
  let projectRuntimeLoadGeneration = 0
  let projectRuntimeLoadController = null
  const selectedRuntimeProfileId = ref('')
  const showRuntimeConfig = ref(false)
  const projectToolchainTestResult = ref(null)
  const selectedRuntimeProcess = computed(() => projectRuntime.value?.processes?.find(row => row.profileId === selectedRuntimeProfileId.value)
    || { status: 'stopped', pid: 0 })
  const preferredRuntimeProfileId = snapshot => snapshot?.selected_profile_id
    || snapshot?.profiles?.find(profile => profile.enabled !== false && !profile.stale && profile.runCommand)?.id
    || snapshot?.profiles?.find(profile => profile.enabled !== false && !profile.stale)?.id
    || ''

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
    display_name: '',
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
      if (match?.[1]) {
        form.value.name = match[1]
        if (!String(form.value.display_name || '').trim()) form.value.display_name = match[1]
      }
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
    const connected = projects.value.filter(project => project.agent_connection?.running || project.running).length
    const running = projects.value.reduce((total, project) => total + Number(project.runtime_summary?.running_count || 0), 0)
    pageInfo.value = `${projects.value.length} 个项目 · ${connected} 个 Agent 已连接 · ${running} 个源码进程`
    // 自动选择第一个项目
    if (projects.value.length > 0 && !currentProject.value) {
      await selectProject(projects.value[0].name)
    }
  }

  const loadProjectRuntime = async (project = currentProject.value) => {
    if (!project) {
      projectRuntimeLoadController?.abort()
      projectRuntimeLoadGeneration += 1
      projectRuntime.value = null
      selectedRuntimeProfileId.value = ''
      return
    }
    const generation = ++projectRuntimeLoadGeneration
    projectRuntimeLoadController?.abort()
    projectRuntimeLoadController = new AbortController()
    projectRuntimeLoading.value = true
    try {
      const snapshot = await projectsApi.runtime(project, { signal: projectRuntimeLoadController.signal })
      if (generation !== projectRuntimeLoadGeneration || project !== currentProject.value) return
      projectRuntime.value = snapshot
      projectToolchainTestResult.value = null
      const currentExists = snapshot.profiles?.some(profile => profile.id === selectedRuntimeProfileId.value && profile.enabled !== false)
      if (!currentExists) selectedRuntimeProfileId.value = preferredRuntimeProfileId(snapshot)
    } catch (error) {
      if (error?.name !== 'AbortError' && generation === projectRuntimeLoadGeneration && project === currentProject.value) {
        projectRuntime.value = null
        toast.error(error?.message || '读取项目运行配置失败')
      }
    } finally {
      if (generation === projectRuntimeLoadGeneration) projectRuntimeLoading.value = false
    }
  }

  const rescanProjectRuntime = async () => {
    if (!currentProject.value || projectRuntimeBusy.value) return
    const targetProject = currentProject.value
    projectRuntimeBusy.value = 'rescan'
    try {
      const snapshot = await projectsApi.runtimeRescan(targetProject)
      if (targetProject !== currentProject.value) return
      projectRuntime.value = snapshot
      selectedRuntimeProfileId.value = preferredRuntimeProfileId(projectRuntime.value)
      toast.success(projectRuntime.value.profiles?.length ? `已识别 ${projectRuntime.value.profiles.length} 个运行配置` : '未识别到可靠命令，可手动添加')
    } catch (error) { toast.error(error?.message || '扫描运行配置失败') }
    finally { projectRuntimeBusy.value = '' }
  }

  const saveProjectRuntime = async data => {
    if (!currentProject.value || projectRuntimeBusy.value) return
    const targetProject = currentProject.value
    projectRuntimeBusy.value = 'save'
    try {
      const snapshot = await projectsApi.runtimeSave(targetProject, data)
      if (targetProject !== currentProject.value) return
      projectRuntime.value = snapshot
      selectedRuntimeProfileId.value = projectRuntime.value.selected_profile_id || ''
      projectToolchainTestResult.value = null
      showRuntimeConfig.value = false
      toast.success('运行配置已保存')
    } catch (error) { toast.error(error?.message || '保存运行配置失败') }
    finally { projectRuntimeBusy.value = '' }
  }

  const testProjectRuntimeToolchain = async toolchain => {
    if (!currentProject.value || projectRuntimeBusy.value) return
    const targetProject = currentProject.value
    projectRuntimeBusy.value = 'toolchain-test'
    projectToolchainTestResult.value = null
    try {
      const result = await projectsApi.runtimeToolchainTest(targetProject, toolchain)
      if (targetProject !== currentProject.value) return
      projectToolchainTestResult.value = result
      if (projectToolchainTestResult.value.success) toast.success('JDK 与 Maven 工具链验证通过')
      else toast.error('工具链验证未通过，请检查检测结果')
    } catch (error) {
      projectToolchainTestResult.value = { success: false, error: error?.message || '工具链验证失败' }
      toast.error(projectToolchainTestResult.value.error)
    } finally {
      projectRuntimeBusy.value = ''
    }
  }

  const runProjectRuntimeAction = async action => {
    if (!currentProject.value || !selectedRuntimeProfileId.value || projectRuntimeBusy.value) return
    const targetProfileId = selectedRuntimeProfileId.value
    const targetProject = currentProject.value
    if (['start', 'restart', 'build'].includes(action)) {
      openProjectRuntimeLogs(action === 'build' ? 'build' : 'run', targetProfileId)
    }
    projectRuntimeBusy.value = action
    try {
      const result = await projectsApi.runtimeAction(targetProject, targetProfileId, action)
      if (targetProject !== currentProject.value) return
      await loadProjectRuntime(targetProject)
      await loadProjects()
      const labels = { start: '源码项目已启动', stop: '源码项目已暂停', restart: '源码项目已重新运行', build: '构建任务已开始' }
      toast.success(result.message || labels[action] || '项目运行操作已执行')
    } catch (error) { toast.error(error?.message || '项目运行操作失败') }
    finally { projectRuntimeBusy.value = '' }
  }

  // 选择项目
  const selectProject = async (name) => {
    if (isStreaming.value) stopStreaming()
    showLogsPanel.value = false
    currentProject.value = name
    currentSession.value = null
    currentSessionDraft.value = false
    selectedRuntimeProfileId.value = ''
    projectTools.value = { mcp: [], skill: [] }
    projectAuthorizationReadiness.value = null
    void loadProjectTools({ open: false })
    await loadProjectRuntime(name)
    if (name !== currentProject.value) return
    const sessionsLoaded = await loadSessions(name)
    if (!sessionsLoaded || name !== currentProject.value) return
    // 如果会话列表非空，且没有选中会话，则默认选中第一个会话，以便载入单聊输入框
    if (sessions.value.length > 0 && !currentSession.value) {
      const remembered = localStorage.getItem(`ccm:project-session:${name}`)
      const target = sessions.value.find(item => item.id === remembered) || sessions.value[0]
      await selectSession(target.id)
    }
  }

  // 加载会话列表
  const loadSessions = async (project) => {
    if (!project) return
    const [data, feishuData] = await Promise.all([
      sessionsApi.list(project),
      sessionsApi.feishuTargets(project).catch(() => ({ targets: [] })),
    ])
    if (project !== currentProject.value) return false
    sessions.value = data.sessions || []
    projectFeishuTargets.value = feishuData.targets || []
    if (projectFeishuBindingSession.value) {
      projectFeishuBindingSession.value = sessions.value.find(item => item.id === projectFeishuBindingSession.value.id) || null
      if (!projectFeishuBindingSession.value) projectFeishuBindingOpen.value = false
    }
    return true
  }

  let projectSessionRefreshSequence = 0
  const projectTaskMessageId = message => String(message?.task_id || message?.taskExperience?.task_id || '').trim()
  const isProjectTaskTerminal = task => ['completed', 'done', 'succeeded', 'failed', 'cancelled', 'canceled', 'reverted'].includes(String(task?.phase || task?.status || '').toLowerCase())
  const hydrateProjectTaskMessages = async (history, project, sessionId) => {
    const rows = Array.isArray(history) ? history : []
    const candidates = rows
      .filter(message => message?.role === 'assistant' && projectTaskMessageId(message) && !isProjectTaskTerminal(message.taskExperience || {}))
      .slice(-12)
    if (!candidates.length) return rows
    const hydrated = await Promise.all(candidates.map(async message => {
      const taskId = projectTaskMessageId(message)
      try {
        const response = await fetch(`/api/projects/main-agent/task?task_id=${encodeURIComponent(taskId)}`)
        const payload = await response.json()
        if (!response.ok || !payload.success || !payload.task) return null
        if (String(payload.task.project || '') !== String(project || '') || String(payload.task.project_session_id || '') !== String(sessionId || '')) return null
        return { message, task: payload.task }
      } catch { return null }
    }))
    const byTask = new Map(hydrated.filter(Boolean).map(item => [String(item.task.task_id), item.task]))
    return rows.map(message => {
      const taskId = projectTaskMessageId(message)
      const task = byTask.get(taskId)
      if (!task) return message
      return {
        ...message,
        id: task.message_id || message.id || `project-main-task:${taskId}`,
        messageMode: 'task',
        task_id: taskId,
        taskExperience: { ...task, requires_card: true },
        fileChanges: task.file_changes || message.fileChanges,
      }
    })
  }
  const refreshCurrentProjectSession = async (expectedSessionId = '') => {
    const project = currentProject.value
    const sessionId = currentSession.value
    if (!project || !sessionId || (expectedSessionId && expectedSessionId !== sessionId)) return false
    const sequence = ++projectSessionRefreshSequence
    const wasPinned = isMessagesPinnedToBottom.value
    const [detail] = await Promise.all([
      sessionsApi.detail(project, sessionId),
      loadSessions(project),
    ])
    if (sequence !== projectSessionRefreshSequence || project !== currentProject.value || sessionId !== currentSession.value) return false
    messages.value = await hydrateProjectTaskMessages(detail.history || [], project, sessionId)
    if (wasPinned) nextTick(() => scrollToBottom({ force: true }))
    return true
  }

  // 选择会话
  const selectSession = async (sessionId, newSession = false) => {
    if (isStreaming.value) stopStreaming()
    const project = currentProject.value
    currentSession.value = sessionId
    currentSessionDraft.value = false
    currentSessionNew.value = newSession
    if (project) localStorage.setItem(`ccm:project-session:${project}`, sessionId)
    const data = await sessionsApi.detail(project, sessionId)
    if (project !== currentProject.value || sessionId !== currentSession.value) return
    messages.value = await hydrateProjectTaskMessages(data.history || [], project, sessionId)
    scrollToBottom({ force: true })
  }

  // 启动项目
  const startProject = async (name) => {
    if (!name || projectActionBusy.value) return
    projectActionBusy.value = 'start'
    try {
      const result = await projectsApi.agentConnection(name, 'connect')
      await loadProjects()
      toast.success(result.message || 'Agent 与协作通道已连接')
    } catch (error) { toast.error(error?.message || 'Agent 连接失败') }
    finally { projectActionBusy.value = '' }
  }

  // 停止项目
  const stopProject = async (name) => {
    if (!name || projectActionBusy.value) return
    projectActionBusy.value = 'stop'
    try {
      const result = await projectsApi.agentConnection(name, 'disconnect')
      await loadProjects()
      toast.success(result.message || 'Agent 与协作通道已断开')
    } catch (error) { toast.error(error?.message || 'Agent 断开失败') }
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
      name: '', display_name: '', work_dir: '', agent: defaultAgent, platform: 'feishu', source_type: 'local',
      repository_url: '', repository_original_url: '', repository_branch: '', initialize_repository: false, git_loading: false, git_status: null,
      clone_request_id: `clone_${crypto.randomUUID().replace(/-/g, '')}`
    }
    projectCreateBusy.value = false
    projectCloneStatus.value = null
    showCreate.value = true
  }

  // 提交创建
  const submitCreate = async () => {
    if (projectCreateBusy.value) return
    if (!form.value.name || !form.value.work_dir) {
      toast.warning('请填写项目名称和目录')
      return
    }
    if (form.value.source_type === 'github' && !String(form.value.repository_url || '').trim()) {
      toast.warning('请填写 GitHub 仓库地址')
      return
    }
    projectCreateBusy.value = true
    projectCloneStatus.value = form.value.source_type === 'github' ? { status: 'queued', stage: '等待克隆' } : null
    let pollTimer = null
    if (form.value.source_type === 'github') {
      const requestId = form.value.clone_request_id
      pollTimer = window.setInterval(async () => {
        try {
          const state = await projectsApi.cloneStatus(requestId)
          if (state?.receipt) projectCloneStatus.value = state.receipt
        } catch {}
      }, 750)
    }
    try {
      const res = await projectsApi.create({ ...form.value, setup_token: feishuProjectSetupToken.value || undefined })
      if (res.success) {
        showCreate.value = false
        feishuProjectSetupToken.value = ''
        await loadProjects()
        toast.success('项目创建成功！')
      } else {
        throw new Error(res.error || '未知错误')
      }
    } catch (error) {
      toast.error('创建失败: ' + (error?.message || '未知错误'))
      if (form.value.source_type === 'github') {
        try {
          const state = await projectsApi.cloneStatus(form.value.clone_request_id)
          projectCloneStatus.value = state?.receipt || projectCloneStatus.value
        } catch {}
      }
    } finally {
      if (pollTimer) window.clearInterval(pollTimer)
      projectCreateBusy.value = false
      if (form.value.source_type === 'github' && projectCloneStatus.value?.status !== 'recovery_required') {
        form.value.clone_request_id = `clone_${crypto.randomUUID().replace(/-/g, '')}`
      }
    }
  }

  const cancelProjectClone = async () => {
    const requestId = String(form.value.clone_request_id || '')
    if (!requestId || !projectCreateBusy.value) return
    try {
      const result = await projectsApi.cloneCancel(requestId)
      projectCloneStatus.value = result.receipt || { status: 'cancel_requested', stage: '正在取消' }
      toast.success('已请求取消克隆，正在安全停止 Git 进程')
    } catch (error) {
      toast.error(error?.message || '取消克隆失败')
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
      display_name: project.display_name || project.name,
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

  let projectDraftCreation = null

  const materializeProjectSessionDraft = async () => {
    if (currentSession.value) return currentSession.value
    if (!currentSessionDraft.value || !currentProject.value) return ''
    if (projectDraftCreation) return projectDraftCreation
    const project = currentProject.value
    projectDraftCreation = (async () => {
      const res = await sessionsApi.create({ project, source: 'web' })
      if (!res?.success || !res.sessionId) throw new Error(res?.error || '创建项目会话失败')
      if (project !== currentProject.value) throw new Error('项目已切换，请在当前项目重新发送')
      currentSession.value = res.sessionId
      currentSessionDraft.value = false
      currentSessionNew.value = true
      localStorage.setItem(`ccm:project-session:${project}`, res.sessionId)
      if (!sessions.value.some(session => session.id === res.sessionId)) {
        sessions.value.unshift({
          id: res.sessionId,
          name: '新会话',
          source: 'web',
          created_at: new Date().toISOString(),
        })
      }
      return res.sessionId
    })()
    try {
      return await projectDraftCreation
    } finally {
      projectDraftCreation = null
    }
  }

  // 网页会话先打开本地草稿；飞书会话需要外部绑定，因此立即创建。
  const createSession = async (source = 'web') => {
    if (!currentProject.value) {
      toast.info('请先选择项目')
      return
    }
    const resolvedSource = source === 'feishu' ? 'feishu' : 'web'
    if (resolvedSource === 'web') {
      if (isStreaming.value) await stopStreaming()
      currentSession.value = null
      currentSessionDraft.value = true
      currentSessionNew.value = true
      messages.value = []
      localStorage.removeItem(`ccm:project-session:${currentProject.value}`)
      await nextTick()
      document.getElementById('projectChatInput')?.focus()
      return { success: true, draft: true }
    }
    const res = await sessionsApi.create({ project: currentProject.value, source: resolvedSource })
    if (res.success) {
      await loadSessions(currentProject.value)
      await selectSession(res.sessionId, true)
      if (resolvedSource === 'feishu') {
        projectFeishuBindingSession.value = sessions.value.find(item => item.id === res.sessionId) || null
        projectFeishuBindingOpen.value = true
        toast.success('飞书会话已创建，请选择当前项目的飞书目标')
      }
    }
  }

  const openProjectFeishuBinding = (session) => {
    projectFeishuBindingSession.value = session
    projectFeishuBindingOpen.value = true
  }

  const updateProjectFeishuBinding = async (targetId, action = 'bind') => {
    if (!currentProject.value || !projectFeishuBindingSession.value?.id || !targetId) return
    projectFeishuBindingBusy.value = true
    try {
      await sessionsApi.bindFeishu({
        project: currentProject.value,
        sessionId: projectFeishuBindingSession.value.id,
        targetId,
        action,
      })
      await loadSessions(currentProject.value)
      toast.success(action === 'unbind' ? '项目飞书目标已解除绑定' : '项目飞书目标已绑定到当前会话')
    } catch (error) {
      toast.error(error?.message || '更新项目飞书绑定失败')
    } finally {
      projectFeishuBindingBusy.value = false
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
    const isProjectMainTask = card?.orchestration_scope === 'project_session'
    const projectMainRunId = card?.project_main_run_id || msg?.projectRun?.id || ''
    try {
      if (action.kind === 'confirm_plan') {
        const data = await postTaskAction('/api/projects/main-agent/plan-confirm', {
          task_id: id,
          project: currentProject.value,
          project_session_id: currentSession.value,
        })
        pendingProjectParentRunId.value = data.resume_parent_run_id || id
        chatInput.value = '我确认按当前计划执行。'
        await nextTick()
        await sendMessage()
        return
      }
      if (action.kind === 'revise_plan') {
        const requirement = window.prompt('需要怎样调整这份计划？', '')
        if (!requirement) return
        msg.taskActionBusy = true
        try {
          const data = await postTaskAction('/api/projects/main-agent/task-action', {
            action: 'revise_plan',
            task_id: id,
            project: currentProject.value,
            project_session_id: currentSession.value,
            feedback: requirement,
            client_message_id: `plan-revision:${makeProjectMessageId()}`,
          })
          msg.id = data.message_id || msg.id
          msg.task_id = id
          msg.messageMode = 'task'
          msg.taskExperience = data.taskExperience || data.task || msg.taskExperience
          await refreshCurrentProjectSession(currentSession.value)
          toast.success(data.duplicate ? '这次计划调整已记录' : `计划已完成第 ${data.revision?.revision || 1} 次修订`)
        } finally {
          msg.taskActionBusy = false
        }
        return
      }
      if (action.kind === 'view_changes') {
        if (msg?.fileChanges?.files?.length) openCodeChangeDrawer(msg.fileChanges, { title: card?.title || '项目 Agent 代码改动', subtitle: card?.goal || '' })
        else toast.info('暂无可查看的文件改动')
        return
      }
      if (action.kind === 'view_trace') {
        const payload = {
          tab: 'trace-replay',
          scope: 'project',
          project: currentProject.value || '',
          project_session_id: currentSession.value || '',
          task_id: action.task_id || action.taskId || id || '',
          trace_id: action.trace_id || action.traceId || card?.technical?.trace_id || '',
          preset: action.preset || 'all',
          event_status: action.event_status || action.eventStatus || '',
          event_query: action.event_query || action.eventQuery || '',
          event_id: action.event_id || action.eventId || '',
          evidence_id: action.evidence_id || action.evidenceId || '',
          at: Date.now(),
        }
        localStorage.setItem('trace-replay-target', JSON.stringify(payload))
        slashNavigate('trace-replay')
        window.dispatchEvent(new CustomEvent('trace-replay-target', { detail: payload }))
        return
      }
      if (action.kind === 'open_test_targets') {
        await loadProjectTestTargets()
        return
      }
      if (action.kind === 'open_project_settings') {
        const project = projects.value.find(item => item.name === currentProject.value)
        if (project) await openEditModal(project)
        else toast.info('请先选择项目')
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
      } else if (action.kind === 'interrupt' || action.kind === 'resume_interrupted') {
        if (!id || !isProjectMainTask) return toast.info('当前任务不支持此恢复操作')
        if (action.kind === 'interrupt' && !await confirmDialog(`确定停止“${card.title}”当前这一轮执行吗？任务和子 Agent 会话会保留。`)) return
        const data = await postTaskAction('/api/projects/main-agent/task-action', {
          action: action.kind,
          task_id: id,
          project: currentProject.value,
          project_session_id: currentSession.value,
          reason: action.kind === 'interrupt' ? '用户从项目任务卡停止当前执行' : undefined,
        })
        msg.taskExperience = data.taskExperience || data.task || msg.taskExperience
        if (action.kind === 'resume_interrupted') pendingProjectParentRunId.value = data.resume_parent_run_id || id
        await refreshCurrentProjectSession(currentSession.value)
        toast.success(action.kind === 'interrupt' ? '当前执行已停止，恢复现场已保留' : '已恢复原任务和子 Agent 会话')
      } else if (action.kind === 'cancel') {
        if (!id) return toast.info('当前项目直连执行暂未绑定任务，无法远程停止')
        if (!await confirmDialog(`确定永久取消任务“${card.title}”？历史会保留，但不会自动恢复。`)) return
        if (isProjectMainTask) {
          await postTaskAction('/api/projects/main-agent/task-action', { action: 'cancel', task_id: id, project: currentProject.value, project_session_id: currentSession.value, reason: '用户从项目聊天任务卡永久取消' })
        } else {
          await postTaskAction(isProjectRun ? '/api/project-runs/cancel' : '/api/tasks/cancel', { id, reason: '用户从项目聊天任务卡永久取消' })
        }
      } else if (action.kind === 'retry') {
        if (isProjectRun || isProjectMainTask) {
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
        const rollbackRunId = isProjectRun ? id : isProjectMainTask ? projectMainRunId : ''
        if (isProjectMainTask && !rollbackRunId) return toast.info('当前项目主任务没有可核验的源码运行检查点，已阻止撤销')
        await postTaskAction(rollbackRunId ? '/api/project-runs/rollback' : '/api/tasks/rollback', { id: rollbackRunId || id, reason: '用户从项目聊天任务卡安全撤销' })
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
  const pendingProjectParentRunId = ref('')
  const streamController = ref(null)
  const activeProjectRunId = ref('')
  const activeProjectMainTaskId = ref('')
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
    ? '排队'
    : '发送')

  const stopStreaming = async () => {
    if (!isStreaming.value || stoppingProjectTurn.value) return
    stoppingProjectTurn.value = true
    try {
      if (activeProjectMainTaskId.value) {
        await postTaskAction('/api/tasks/cancel', {
          id: activeProjectMainTaskId.value,
          reason: '用户从项目会话停止当前项目主 Agent 任务',
        }).catch((error) => toast.warning(error?.message || '后端停止请求未完成，正在中断当前连接'))
      } else if (activeProjectRunId.value) {
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

  const guideProjectQueuedTurn = async (turn) => {
    if (!turn?.id) return
    const guidedTurn = await projectTurnControl.guide(turn)
    toast.success('这条消息已移到队首，将作为当前任务的补充要求')
    if (isStreaming.value) await stopStreaming()
    window.setTimeout(() => drainProjectTurnQueue().catch(() => {}), 0)
    return guidedTurn
  }

  const editProjectUserMessage = async (message) => {
    if (isStreaming.value) return toast.info('请先等待当前回复结束或停止执行，再编辑历史消息')
    const text = getEditableUserMessageText(message)
    if (!text) return toast.info('这条消息没有可重新发送的文字内容')
    const hasDifferentDraft = !!chatInput.value.trim() && chatInput.value.trim() !== text
    if ((hasDifferentDraft || chatFiles.value.length || pendingProjectParentRunId.value)
      && !(await confirmDialog('编辑历史消息会替换当前输入框草稿，并退出当前任务补充状态。是否继续？'))) return
    chatInput.value = text
    chatFiles.value = []
    pendingProjectParentRunId.value = ''
    await nextTick()
    document.getElementById('projectChatInput')?.focus?.()
    toast.info(hasMessageAttachments(message)
      ? '原消息文字已载入；历史附件不会自动复用，请重新添加附件后发送'
      : '原消息已载入输入框，修改后发送即可重新请求')
  }

  const sendMessage = async (options = {}) => {
    const queuedTurn = options?.queueTurn || null
    if (isStreaming.value && !queuedTurn) return submitProjectMessageWhileBusy()
    if ((!queuedTurn && !chatInput.value.trim() && chatFiles.value.length === 0) || !currentProject.value) return
    if (!currentSession.value && currentSessionDraft.value) {
      try {
        await materializeProjectSessionDraft()
      } catch (error) {
        toast.error(error?.message || '创建项目会话失败')
        return { success: false, error: error?.message || '创建项目会话失败' }
      }
    }
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

    scrollToBottom({ force: true })

    const agentMsg = { id: makeProjectMessageId(), role: 'assistant', content: '', workEvents: [], requestText: msg, messageMode: 'conversation', streaming: true, timestamp: new Date().toISOString() }
    const controller = new AbortController()
    streamController.value = controller
    isStreaming.value = true
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
          agentMsg.messageMode = mode
        } else if (data.type === 'task_runtime' || data.type === 'task_heartbeat') {
          if (data.message_id) agentMsg.id = data.message_id
          agentMsg.projectRun = data.run || agentMsg.projectRun
          activeProjectRunId.value = data.run?.id || activeProjectRunId.value
          agentMsg.task_id = data.taskExperience?.task_id || data.run?.id || agentMsg.task_id
          activeProjectMainTaskId.value = data.taskExperience?.orchestration_scope === 'project_session'
            ? (data.taskExperience?.task_id || activeProjectMainTaskId.value)
            : activeProjectMainTaskId.value
          agentMsg.taskExperience = data.taskExperience || agentMsg.taskExperience
          if (data.type === 'task_heartbeat' && agentMsg.taskExperience) {
            agentMsg.taskExperience = {
              ...agentMsg.taskExperience,
              updated_at: data.at || agentMsg.taskExperience.updated_at,
            }
          }
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
          if (data.message_id) agentMsg.id = data.message_id
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
          if (data.message_id) agentMsg.id = data.message_id
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
      agentMsg.streaming = false
      isStreaming.value = false
      if (streamController.value === controller) streamController.value = null
      const completedRunId = agentMsg.projectRun?.id || activeProjectRunId.value
      if (!agentMsg.projectRun || agentMsg.projectRun?.id === activeProjectRunId.value) activeProjectRunId.value = ''
      if (agentMsg.task_id === activeProjectMainTaskId.value) activeProjectMainTaskId.value = ''
      const hasAgentResult = agentMsg.content || agentMsg.taskExperience || agentMsg.workEvents.length
      if (hasAgentResult) {
        addAgentMessage()
        const serverOwnedTaskMessage = agentMsg.messageMode === 'task' && !!agentMsg.task_id
        if (userPersisted && !serverOwnedTaskMessage) {
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
      const project = projects.value.find(item => item.name === currentProject.value)
      return `发送到: ${project?.display_name || currentProject.value}`
    }
    return '未选择项目'
  })

  // 日志面板
  const showLogsPanel = ref(false)
  const logsTitle = ref('Agent 运行日志')
  const logsProfileId = ref('')
  const logsKind = ref('run')
  const logsRuntimeProcess = computed(() => projectRuntime.value?.processes?.find(row => row.profileId === logsProfileId.value)
    || { status: 'stopped', pid: 0 })

  const openProjectRuntimeLogs = (kind, profileId = selectedRuntimeProfileId.value) => {
    if (!currentProject.value || !profileId) return
    const profile = projectRuntime.value?.profiles?.find(item => item.id === profileId)
    logsTitle.value = `${profile?.label || '项目'} · ${kind === 'build' ? '构建日志' : '运行日志'}`
    logsProfileId.value = profileId
    logsKind.value = kind === 'build' ? 'build' : 'run'
    showLogsPanel.value = true
  }
  watch(selectedRuntimeProfileId, profileId => {
    if (!showLogsPanel.value || !profileId || profileId === logsProfileId.value) return
    openProjectRuntimeLogs(logsKind.value, profileId)
  })

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
  const projectContextPolicy = ref({ override: {}, effective: {}, source: 'global_default' })

  const normalizeProjectTools = (tools = {}) => ({
    mcp: Array.from(new Set((Array.isArray(tools.mcp) ? tools.mcp : []).map(item => String(item || '').trim()).filter(Boolean))),
    skill: Array.from(new Set((Array.isArray(tools.skill) ? tools.skill : []).map(item => String(item || '').trim()).filter(Boolean)))
  })

  const loadProjectTools = async (options = {}) => {
    if (!currentProject.value) return
    const project = currentProject.value
    const open = options?.open !== false
    const [projRes, optionsData, verification] = await Promise.all([
      fetch(`/api/projects/tools?project=${encodeURIComponent(project)}`, { cache: 'no-store' }),
      fetch('/api/tools/authorization-options', { cache: 'no-store' }).then(r => r.json()).catch(() => ({ mcp: [], skill: [] })),
      fetch(`/api/tools/chain-verification?project=${encodeURIComponent(project)}`, { cache: 'no-store' }).then(r => r.json()).catch(() => ({ rows: [] })),
    ])
    const projData = await projRes.json()
    if (!projRes.ok || projData.success === false) {
      if (open) toast.error(projData.error || '读取项目工具配置失败')
      return
    }
    if (project !== currentProject.value) return
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
    projectContextPolicy.value = projData.contextPolicy || { override: {}, effective: {}, source: 'global_default' }

    allTools.value.mcp = optionsData.mcp || []
    allTools.value.skill = optionsData.skill || []
    projectToolVerification.value = verification.rows?.[0] || null
    if (open) showTools.value = true
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
        delivery_contract: projectDeliveryContract.value.trim(),
        contextPolicy: projectContextPolicy.value?.override || {}
      })
    })
    const data = await res.json()
    if (data.success) {
      projectTools.value = normalizeProjectTools(data.tools)
      projectToolAudit.value = data.tool_audit || null
      projectAuthorizationReadiness.value = data.authorization_readiness || null
      projectConnectionPreflight.value = data.connection_preflight || null
      projectContextPolicy.value = data.contextPolicy || projectContextPolicy.value
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

  const projectTestTargets = ref([])
  const projectTestAuth = ref(null)
  const projectTestTargetsLoading = ref(false)
  const projectTestTargetsSaving = ref(false)

  const loadProjectTestTargets = async () => {
    if (!currentProject.value) return
    projectTestTargetsLoading.value = true
    try {
      const response = await fetch(`/api/projects/test-targets?project=${encodeURIComponent(currentProject.value)}`)
      const data = await response.json()
      if (!response.ok || data.error) throw new Error(data.error || '测试目标读取失败')
      projectTestTargets.value = data.targets || []
      projectTestAuth.value = data.projectAuth || null
      showProjectTestTargets.value = true
    } catch (error) {
      toast.error(error?.message || '测试目标读取失败')
    } finally {
      projectTestTargetsLoading.value = false
    }
  }

  const saveProjectTestTarget = async (target) => {
    if (!currentProject.value || projectTestTargetsSaving.value) return
    projectTestTargetsSaving.value = true
    try {
      const projectAuthInput = target?.projectAuth || null
      if (projectAuthInput) {
        const authResponse = await fetch('/api/projects/test-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project: currentProject.value, profile: projectAuthInput }),
        })
        const authData = await authResponse.json()
        if (!authResponse.ok || !authData.success) throw new Error(authData.error || '项目登录信息保存失败')
        projectTestAuth.value = authData.profile || projectTestAuth.value
      }
      const { projectAuth: _projectAuth, ...targetInput } = target || {}
      const response = await fetch('/api/projects/test-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: currentProject.value, target: { ...targetInput, project: currentProject.value } }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || '测试目标保存失败')
      const index = projectTestTargets.value.findIndex(item => item.id === data.target.id)
      if (index >= 0) projectTestTargets.value.splice(index, 1, data.target)
      else projectTestTargets.value.push(data.target)
      toast.success(`测试目标“${data.target.name}”已保存`)
    } catch (error) {
      toast.error(error?.message || '测试目标保存失败')
    } finally {
      projectTestTargetsSaving.value = false
    }
  }

  const deleteProjectTestTarget = async (targetId) => {
    const target = projectTestTargets.value.find(item => item.id === targetId)
    if (!await confirmDialog(`确定删除测试目标“${target?.name || targetId}”？`)) return
    try {
      const response = await fetch('/api/projects/test-targets/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: currentProject.value, target_id: targetId }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || '测试目标删除失败')
      projectTestTargets.value = projectTestTargets.value.filter(item => item.id !== targetId)
      toast.success('测试目标已删除')
    } catch (error) {
      toast.error(error?.message || '测试目标删除失败')
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

  const updateProjectContextPolicy = ({ field, value }) => {
    projectContextPolicy.value = {
      ...projectContextPolicy.value,
      override: { ...(projectContextPolicy.value?.override || {}), [field]: value },
    }
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

  let unsubscribeProjectRuntime = null
  let projectSessionRefreshTimer = null
  let projectFeishuFallbackTimer = null
  onMounted(() => {
    loadAgentOptions()
    loadProjects()
    unsubscribeProjectRuntime = subscribeRuntimeEvents(['project'], event => {
      const eventProject = String(event?.data?.project || '')
      if (!eventProject || eventProject !== currentProject.value) return
      if (event?.type === 'project.session_messages_changed') {
        const eventSessionId = String(event?.data?.sessionId || event?.data?.session_id || '')
        const eventTaskId = String(event?.data?.taskId || event?.data?.task_id || '')
        if (isStreaming.value && (!eventTaskId || eventTaskId === activeProjectMainTaskId.value || eventSessionId === currentSession.value)) return
        window.clearTimeout(projectSessionRefreshTimer)
        projectSessionRefreshTimer = window.setTimeout(() => {
          void refreshCurrentProjectSession(eventSessionId)
        }, 120)
        return
      }
      if (String(event?.type || '').startsWith('project.main_agent.')) {
        const eventSessionId = String(event?.data?.sessionId || event?.data?.session_id || '')
        const eventTaskId = String(event?.data?.taskId || event?.data?.task_id || '')
        if (eventSessionId !== currentSession.value) return
        if (isStreaming.value && (!eventTaskId || eventTaskId === activeProjectMainTaskId.value || eventSessionId === currentSession.value)) return
        window.clearTimeout(projectSessionRefreshTimer)
        projectSessionRefreshTimer = window.setTimeout(() => {
          void refreshCurrentProjectSession(eventSessionId)
        }, 120)
        return
      }
      if (event?.type === 'project.feishu_session_binding_changed'
        || event?.type === 'project.session_title_changed') {
        void loadSessions(eventProject)
        return
      }
      window.clearTimeout(loadProjectRuntime._eventTimer)
      loadProjectRuntime._eventTimer = window.setTimeout(() => {
        loadProjectRuntime(eventProject)
        loadProjects()
      }, 180)
    })
    projectFeishuFallbackTimer = window.setInterval(() => {
      const selected = sessions.value.find(item => item.id === currentSession.value)
      if (selected?.source === 'feishu') void refreshCurrentProjectSession(selected.id)
    }, 60000)
    nextTick(attachMessagesResizeObserver)
  })

  onUnmounted(() => {
    projectRuntimeLoadController?.abort()
    stopStreaming()
    unsubscribeProjectRuntime?.()
    window.clearTimeout(loadProjectRuntime._eventTimer)
    window.clearTimeout(projectSessionRefreshTimer)
    window.clearInterval(projectFeishuFallbackTimer)
    detachMessagesResizeObserver()
  })

  const handleInput = () => {
    slash.onInput()
  }

  const handleKeydown = async (e) => {
    if (await slash.onKeydown(e)) return

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return {
    ChatComposer, ConversationTurnControls, CommandResultCard, MessageNavigator, AgentCodeChangeDrawer, ProjectAgentMessage,
    UnifiedDiffModal, ProjectFormModal, ProjectFeishuQrModal, ProjectFolderBrowserModal, ProjectToolsModal,
    ProjectSharedFilesModal, ProjectAgentSwitchModal, ProjectWorkspaceHeader, ProjectSessionSidebar, ProjectArchiveManager, ProjectRuntimeBar, ProjectRuntimeConfigModal, ProjectRunConsole, GroupTestTargetsModal, PanelLeft,
    highlightMsgIndex, handleNavigation, scrollToMessage, projects, currentProject, currentSession, currentSessionDraft, hasProjectConversation,
    sessions, projectFeishuTargets, projectFeishuBindingSession, projectFeishuBindingOpen, projectFeishuBindingBusy,
    messages, messagesEl, chatInput, isMessagesPinnedToBottom, updateMessageScrollState,
    scrollToBottom, attachMessagesResizeObserver, detachMessagesResizeObserver, navMessages, codeChangeDrawer, openCodeChangeDrawer,
    openSingleFileChange, closeCodeChangeDrawer, slashNavigate, runProjectClientCommand, slash,
    chatFiles, diffViewer, pageInfo,
    agentOptions, loadAgentOptions, messageKeyMap, messageKeySeq, getMessageKey,
    showCreate, showEdit, showSwitchAgent, showTools, showProjectTestTargets, showSharedFiles, showArchives,
    projectCreateBusy, projectCloneStatus,
    mobileSessionsOpen, projectActionBusy, projectRuntime, projectRuntimeLoading, projectRuntimeBusy, selectedRuntimeProfileId, selectedRuntimeProcess, showRuntimeConfig, projectToolchainTestResult, showFeishuQr, editProject, feishuQrUrl, feishuQrStatus,
    feishuQrLoading, feishuProjectSetupToken, browsePath, browseItems, browseTarget, drives, browseHome, browseLoading, browseError,
    showFolderBrowser, form, updateProjectFormField, platforms, loadProjects, loadProjectRuntime, rescanProjectRuntime, saveProjectRuntime, testProjectRuntimeToolchain, runProjectRuntimeAction,
    selectProject, loadSessions, selectSession, startProject, stopProject,
    deleteProject, handleArchiveNotify, openCreateModal, submitCreate, cancelProjectClone, openEditModal, submitEdit, loadProjectGitStatus,
    openSwitchAgent, switchAgent, startProjectWithAgent, createSession, openProjectFeishuBinding, updateProjectFeishuBinding, renameSession, deleteSession,
    saveCurrentProjectSessionKnowledge, getProjectTaskCard, postTaskAction, removeMessageFromCurrentSession, handleProjectTaskAction, isStreaming,
    pendingProjectParentRunId, streamController, activeProjectRunId, activeProjectMainTaskId, stoppingProjectTurn, makeProjectMessageId,
    projectTurnConversationId, projectTurnControl, projectComposerSendLabel, stopStreaming, drainProjectTurnQueue, guideProjectQueuedTurn, submitProjectMessageWhileBusy,
    sendMessage, editProjectUserMessage, formatFileSize, onChatFilesSelected, removeChatFile, openFileDiff, openProjectChangesTab,
    closeFileDiff, currentSessionNew, autoNameSession, chatTarget, showLogsPanel, logsTitle, logsProfileId, logsKind, logsRuntimeProcess,
    openProjectRuntimeLogs, openFeishuQr, startFeishuQrSetup, openFolderBrowser, loadDrives,
    loadFolderContents, browseGoUp, createBrowseFolder, selectFolder, projectTools, allTools, projectToolAudit,
    projectAuthorizationReadiness, projectConnectionPreflight, projectToolVerification, projectVerificationCommands, inferredProjectVerificationCommands, projectVerificationSource,
    projectResponsibility, projectCapabilities, projectWritablePaths, projectForbiddenPaths, projectDeliveryContract, projectContextPolicy, normalizeProjectTools,
    projectTestTargets, projectTestAuth, projectTestTargetsLoading, projectTestTargetsSaving, loadProjectTestTargets, saveProjectTestTarget, deleteProjectTestTarget,
    loadProjectTools, saveProjectTools, applyInferredVerificationCommands, updateProjectToolField, updateProjectContextPolicy, toggleProjectTool, projectFiles,
    showAddFile, showEditFile, editFileName, editFileContent, updateProjectSharedFileField, loadProjectSharedFiles,
    addProjectFile, submitAddProjectFile, editProjectFile, submitEditProjectFile, deleteProjectFile, handleInput,
    handleKeydown
  }
}
