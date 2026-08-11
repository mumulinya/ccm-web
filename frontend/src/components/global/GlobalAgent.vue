<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { BookOpen, Bot, Gauge, MoreHorizontal, RefreshCw, Wrench } from '@lucide/vue'
import { toast, confirmDialog } from '../../utils/toast.js'
import AgentCodeChangeDrawer from '../agents/AgentCodeChangeDrawer.vue'
import ConversationTurnControls from '../common/ConversationTurnControls.vue'
import ConversationFindBar from '../common/ConversationFindBar.vue'
import LoadingSkeleton from '../common/LoadingSkeleton.vue'
import SlashCommandMenu from '../common/SlashCommandMenu.vue'
import SlashCommandPanel from '../common/SlashCommandPanel.vue'
import SessionContextUsage from '../common/SessionContextUsage.vue'
import PermissionApprovalCards from '../common/PermissionApprovalCards.vue'
import ActiveTaskPlanDock from '../common/ActiveTaskPlanDock.vue'
import GlobalAgentSessionSidebar from './GlobalAgentSessionSidebar.vue'
import GlobalAgentFeishuBindingModal from './GlobalAgentFeishuBindingModal.vue'
import GlobalAgentMessageList from './GlobalAgentMessageList.vue'
import AgentToolsModal from '../common/AgentToolsModal.vue'
import OnlineDocumentReferences from '../common/OnlineDocumentReferences.vue'
import ScopeTargetSelect from '../common/ScopeTargetSelect.vue'
import { useAgentExecutionEvents } from '../../composables/useAgentExecutionEvents.js'
import { useCodeChangeDrawer } from '../../composables/useCodeChangeDrawer.js'
import { useGlobalAgentAttachments } from '../../composables/useGlobalAgentAttachments.js'
import { useGlobalAgentControlCenter } from '../../composables/useGlobalAgentControlCenter.js'
import { useGlobalMissionTracking } from '../../composables/useGlobalMissionTracking.js'
import { useGlobalAgentTurnRuntime } from '../../composables/useGlobalAgentTurnRuntime.js'
import { useGlobalAgentSessions } from '../../composables/useGlobalAgentSessions.js'
import { useGlobalAgentMessaging } from '../../composables/useGlobalAgentMessaging.js'
import { useGlobalAgentActions } from '../../composables/useGlobalAgentActions.js'
import { useMessageNavigation } from '../../composables/useMessageNavigation.js'
import { usePinnedScroll } from '../../composables/usePinnedScroll.js'
import { useConversationTurnControl } from '../../composables/useConversationTurnControl.js'
import { useSlashCommands } from '../../composables/useSlashCommands.js'
import { createSlashCommandClientActions } from '../../composables/useSlashCommandClientActions.js'
import { notifySessionContextUsage, useSessionContextUsage } from '../../composables/useSessionContextUsage.js'
import { usePermissionApprovals } from '../../composables/usePermissionApprovals.js'
import { getDeliveryReport } from '../../utils/agentDisplay.js'
import { subscribeRuntimeEvents } from '../../utils/runtimeEventBus.js'
import { getEditableUserMessageText, hasMessageAttachments } from '../../utils/messageActions.js'
import {
  classifyGlobalAgentRunPresentation,
  PRESENTATION_REPLY,
  stripDeliveryScaffoldSections,
} from '../../utils/resultPresentation.js'
import {
  mergeGlobalRunTestAgentExecutionPlan,
  visibleGlobalPlanText,
  visibleGlobalText,
} from "../../utils/globalAgentExecutionStream.js";


const props = defineProps({
  navigateTo: { type: Object, default: null },
  active: { type: Boolean, default: true },
})
const emit = defineEmits(['switch-tab', 'set-navigation', 'navigated'])

const RANDOM_MUSIC_KEYWORD = '__random__'

const DEFAULT_WELCOME = {
  role: 'assistant',
  content: '你好！我是您的全局助手。我负责系统级入口、管理操作和任务路由；涉及开发落地时，会把需求交给协作群和项目执行成员一起完成。\n\n例如，您可以对我说：\n- 🎵 *"我想听 颜人中 的 晚安"* \n- 🐾 *"帮我把桌面宠物打开"* \n- 📂 *"帮我跳转到项目管理页面"* \n- 📋 *"创建一个开发任务：实现用户登录"* \n- 🛠️ *"帮我修改 smart-live-Cloud 项目，在登录接口加个日志"* \n- 💬 *"给 智评生活开发群安排一下：修改前端首页适配的 bug"*',
  timestamp: new Date().toISOString()
}

const isSidebarOpen = ref(window.innerWidth > 768)
const syncGlobalSidebarForViewport = () => {
  if (window.innerWidth <= 768) isSidebarOpen.value = false
}
const {
  codeChangeDrawer,
  openCodeChangeDrawer,
  openSingleFileChange,
  closeCodeChangeDrawer,
} = useCodeChangeDrawer({ title: '全局 Agent 代码改动' })

const {
  sessions,
  currentSessionId,
  currentSession,
  isCurrentSessionDraft,
  messages,
  loadHistory,
  saveHistory,
  syncHistoryFromServer,
  createNewSession,
  materializeCurrentSession,
  insertServerSession,
  replaceFeishuSessions,
  selectSession,
  deleteSession,
  clearAllSessions,
} = useGlobalAgentSessions({
  defaultWelcome: DEFAULT_WELCOME,
  confirmDelete: (sessionName) => confirmDialog(`确定要删除会话「${sessionName}」吗？`),
  beforeDelete: (session) => session?.source === 'feishu' ? deleteFeishuSessionOnServer(session.id) : true,
  confirmClear: () => confirm('确定清空所有网页会话吗？飞书会话和飞书绑定不会被删除。'),
  onCreated: () => {
    scrollToBottom()
  },
  onDraftCreated: () => {
    syncGlobalSidebarForViewport()
    nextTick(() => document.getElementById('globalChatInput')?.focus())
  },
  onSelected: () => {
    syncGlobalSidebarForViewport()
    isPinnedToBottom.value = true
    scrollToBottom({ force: true })
    setTimeout(() => scrollToBottom({ force: true }), 60)
    setTimeout(() => scrollToBottom({ force: true }), 200)
  },
  onDeleted: (deleted) => {
    toast.success('会话已删除')
    scrollToBottom()
  },
  onCleared: () => {
    toast.success('网页会话历史已清空')
    scrollToBottom()
  },
})

const {
  events: globalAgentExecutionEvents,
  enabled: globalAgentExecutionEnabled,
  meaningfulRevision: globalMeaningfulRevision,
  latestMeaningfulKey: globalLatestMeaningfulKey,
} = useAgentExecutionEvents({
  scope: computed(() => 'global'),
  scopeId: computed(() => 'global'),
  exactSessionId: currentSessionId,
  active: computed(() => props.active !== false && !!currentSessionId.value && !isCurrentSessionDraft.value),
})

const feishuBindings = ref([])
const bindingSession = ref(null)
const feishuBindingOpen = ref(false)
const feishuBindingBusy = ref(false)
let unsubscribeFeishuSessionEvents = null

const globalToolsOpen = ref(false)
const globalToolsBusy = ref(false)
const globalTools = ref({ mcp: [], skill: [] })
const globalToolOptions = ref({ mcp: [], skill: [] })
const globalToolReadiness = ref(null)
const globalToolPreflight = ref(null)
const globalToolCount = computed(() => (globalTools.value.mcp?.length || 0) + (globalTools.value.skill?.length || 0))
const globalDispatchTargets = ref([])
const globalDispatchTargetsLoading = ref(false)
const globalDispatchTargetsError = ref('')
const selectedGlobalTargetKeys = ref([])
const globalDispatchTargetOptions = computed(() => globalDispatchTargets.value.map(target => ({
  value: `${target.scope}:${target.scopeId}`,
  label: target.displayName || target.canonicalName || target.scopeId,
  scope: target.scope,
  disabled: target.ready === false,
  reason: target.unavailableReason || '',
})))
const selectedGlobalTargetKey = computed({
  get: () => selectedGlobalTargetKeys.value[0] || '',
  set: value => { selectedGlobalTargetKeys.value = value ? [String(value)] : [] },
})
const selectedGlobalTargetRefs = computed(() => globalDispatchTargets.value
  .filter(target => selectedGlobalTargetKeys.value.includes(`${target.scope}:${target.scopeId}`) && target.ready !== false)
  .map(target => ({ scope: target.scope, scopeId: target.scopeId, name: target.displayName || target.canonicalName || target.scopeId })))

async function loadGlobalDispatchTargets() {
  globalDispatchTargetsLoading.value = true
  globalDispatchTargetsError.value = ''
  try {
    const response = await fetch('/api/global-agent/dispatch-targets', { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '读取可投放目标失败')
    globalDispatchTargets.value = Array.isArray(data.targets) ? data.targets : []
    const valid = new Set(globalDispatchTargets.value.filter(item => item.ready !== false).map(item => `${item.scope}:${item.scopeId}`))
    selectedGlobalTargetKeys.value = selectedGlobalTargetKeys.value.filter(key => valid.has(key))
  } catch (error) {
    console.warn('[全局助手] 可投放目标加载失败：', error)
    globalDispatchTargets.value = []
    globalDispatchTargetsError.value = error?.message || '读取可投放目标失败'
  } finally {
    globalDispatchTargetsLoading.value = false
  }
}

const normalizeGlobalTools = (tools = {}) => ({
  mcp: Array.from(new Set((Array.isArray(tools.mcp) ? tools.mcp : []).map(item => String(item || '').trim()).filter(Boolean))),
  skill: Array.from(new Set((Array.isArray(tools.skill) ? tools.skill : []).map(item => String(item || '').trim()).filter(Boolean))),
})

async function loadGlobalTools(open = true) {
  try {
    const response = await fetch('/api/global-agent/tools', { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '读取全局 Agent 工具配置失败')
    globalTools.value = normalizeGlobalTools(data.tools)
    globalToolOptions.value = { mcp: data.options?.mcp || [], skill: data.options?.skill || [] }
    globalToolReadiness.value = data.authorization_readiness || null
    globalToolPreflight.value = data.connection_preflight || null
    if (open) globalToolsOpen.value = true
  } catch (error) {
    if (open) toast.error(error?.message || '读取全局 Agent 工具配置失败')
  }
}

function toggleGlobalTool(type, name) {
  const normalized = normalizeGlobalTools(globalTools.value)
  const list = type === 'mcp' ? normalized.mcp : normalized.skill
  const selected = list.includes(name)
  let next = selected ? list.filter(item => item !== name) : [...list, name]
  if (type === 'mcp' && !name.includes('/')) next = next.filter(item => item === name || !item.startsWith(`${name}/`))
  globalTools.value = { ...normalized, [type]: next }
}

async function saveGlobalTools() {
  if (globalToolsBusy.value) return
  globalToolsBusy.value = true
  try {
    const response = await fetch('/api/global-agent/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tools: normalizeGlobalTools(globalTools.value), actor: 'global-agent-web' }),
    })
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '保存全局 Agent 工具配置失败')
    globalTools.value = normalizeGlobalTools(data.tools)
    globalToolReadiness.value = data.authorization_readiness || null
    globalToolPreflight.value = data.connection_preflight || null
    globalToolsOpen.value = false
    if (data.authorization_readiness?.dispatchReady === false) toast.warning('配置已保存，但有工具当前不可用')
    else toast.success('全局 Agent 工具配置已保存')
  } catch (error) {
    toast.error(error?.message || '保存全局 Agent 工具配置失败')
  } finally {
    globalToolsBusy.value = false
  }
}

async function loadFeishuSessionState() {
  try {
    const response = await fetch('/api/global-agent/feishu-sessions', { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '读取飞书会话失败')
    feishuBindings.value = Array.isArray(data.bindings) ? data.bindings : []
    const incoming = replaceFeishuSessions(data.sessions || [])
    if (bindingSession.value) {
      bindingSession.value = incoming.find(session => session.id === bindingSession.value.id) || null
      if (!bindingSession.value) feishuBindingOpen.value = false
    }
    return true
  } catch (error) {
    console.warn('[全局助手] 飞书会话加载失败：', error)
    return false
  }
}

async function createFeishuSession() {
  try {
    const response = await fetch('/api/global-agent/feishu-sessions/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '创建飞书会话失败')
    const session = insertServerSession(data.session, true, false)
    await loadFeishuSessionState()
    bindingSession.value = sessions.value.find(item => item.id === session?.id) || session
    feishuBindingOpen.value = true
    toast.success('飞书会话已创建，请选择要绑定的飞书目标')
    syncGlobalSidebarForViewport()
  } catch (error) {
    toast.error(error?.message || '创建飞书会话失败')
  }
}

function openFeishuBinding(session) {
  bindingSession.value = session
  feishuBindingOpen.value = true
}

async function updateFeishuBinding(bindingId, action) {
  if (!bindingSession.value?.id || !bindingId) return
  feishuBindingBusy.value = true
  try {
    const response = await fetch('/api/global-agent/feishu-sessions/bind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ binding_id: bindingId, session_id: bindingSession.value.id, action }),
    })
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '更新飞书绑定失败')
    await loadFeishuSessionState()
    toast.success(action === 'unbind' ? '飞书目标已解除绑定' : '飞书目标已绑定到当前会话')
  } catch (error) {
    toast.error(error?.message || '更新飞书绑定失败')
  } finally {
    feishuBindingBusy.value = false
  }
}

async function deleteFeishuSessionOnServer(sessionId) {
  try {
    const response = await fetch('/api/global-agent/feishu-sessions/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '删除飞书会话失败')
    return true
  } catch (error) {
    toast.error(error?.message || '服务端飞书会话删除失败，请刷新后重试')
    await loadFeishuSessionState()
    return false
  }
}

const { navMessages } = useMessageNavigation(messages, { getAssistantContent: (message) => getVisibleGlobalMessageContent(message, '回复已整理，技术细节已放入技术详情。') })

const scrollToMessage = (originalIndex) => {
  const el = document.getElementById(`msg-${originalIndex}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

const chatInput = ref('')
const chatInputElement = ref(null)
const isSending = ref(false)
const isSteering = ref(false)
const activeGlobalRunId = ref('')
const activeGlobalRunMessage = ref(null)
const globalStreamController = ref(null)
const stoppingGlobalTurn = ref(false)
const pendingGlobalMissionInput = ref(null)
const pendingGlobalClarificationInput = ref(null)
const pendingGlobalRequestRetry = ref(null)
const executingAction = ref(null)
const chatBody = ref(null)
const chatContentInner = ref(null)
const {
  isPinnedToBottom,
  updateScrollState,
  scrollToBottom,
  attachResizeObserver: attachGlobalResizeObserver,
  detachResizeObserver: detachGlobalResizeObserver,
  pendingUpdates: pendingGlobalProgressCount,
  notifyContentUpdate: notifyGlobalProgress,
  jumpToLatest: jumpToLatestGlobalProgress,
  resetPinnedScroll: resetGlobalPinnedScroll,
} = usePinnedScroll(chatBody, { observeRef: chatContentInner })
watch(globalMeaningfulRevision, () => notifyGlobalProgress({ key: globalLatestMeaningfulKey.value }))
watch(currentSessionId, () => resetGlobalPinnedScroll())
const {
  qualitySnapshot,
  qualityLoading,
  qualityExpanded,
  controlCenterExpanded,
  controlCenterLoading,
  controlCenter,
  intentPreviewText,
  runtimePermissionForm,
  runtimeHookForm,
  loadQualitySnapshot,
  toggleShadowMode,
  loadGlobalControlCenter,
  toggleControlCenter,
  previewGlobalIntent,
  saveRuntimePermission,
  deleteRuntimePermission,
  saveRuntimeHook,
  deleteRuntimeHook,
  controlSupervisorFromCenter,
} = useGlobalAgentControlCenter({ chatInput, toast })

const {
  selectedFiles,
  fileInput,
  zoomedImage,
  triggerFileUpload,
  handleFileChange,
  handleAttachmentPaste,
  removeSelectedFile,
  formatSize,
  zoomImage,
  closeZoom,
  toggleReport,
  isReportOpen,
} = useGlobalAgentAttachments({
  canAttach: () => !pendingGlobalMissionInput.value,
  onFilesPasted: (files) => toast.success(`已粘贴 ${files.length} 个附件`),
  onToggleReport: () => nextTick(() => {
    scrollToBottom(true)
  })
})

const currentSupervisedRunMessage = computed(() => {
  const rows = Array.isArray(messages.value) ? messages.value : []
  return [...rows].reverse().find(message => {
    const run = message?.agenticRun || {}
    const status = String(run.status || '').toLowerCase()
    const supervisionState = String(run.supervision_state || run.supervisionState || '').toLowerCase()
    return message?.role === 'assistant'
      && !!(run.supervisor_id || run.supervisorId)
      && ['supervising', 'paused'].includes(status)
      && !['completed', 'failed', 'cancelled'].includes(supervisionState)
  }) || null
})

const isSupervisionContinuationInput = computed(() => {
  return !isSending.value
    && Boolean(pendingGlobalMissionInput.value)
})

const activeGlobalExecutionConfirmed = ref(false)
const globalConversationTask = computed(() => {
  const rows = Array.isArray(messages.value) ? messages.value : []
  return [...rows].reverse().find(message => {
    const mission = message?.globalMission || message?.global_mission || null
    const run = message?.agenticRun || message?.agentic_run || null
    const missionStatus = String(mission?.status || '').toLowerCase()
    const runStatus = String(run?.status || '').toLowerCase()
    if (mission?.id && !['done', 'completed', 'success', 'failed', 'cancelled', 'canceled', 'archived'].includes(missionStatus)) return true
    return !!run?.id && [
      'queued', 'running', 'executing', 'supervising', 'paused', 'waiting', 'waiting_user',
      'waiting_clarification', 'blocked', 'interrupted', 'recovering', 'waiting_provider', 'waiting_agent',
    ].includes(runStatus)
  }) || null
})
const globalTurnBusy = computed(() => isSending.value || !!globalConversationTask.value)
const globalActiveRunId = computed(() => activeGlobalRunId.value
  || currentSupervisedRunMessage.value?.agenticRun?.id
  || globalConversationTask.value?.agenticRun?.id
  || globalConversationTask.value?.agentic_run?.id
  || '')
const globalTurnControl = useConversationTurnControl({
  scope: 'global',
  conversationId: currentSessionId,
  busy: globalTurnBusy,
})

const syncPendingGlobalClarificationInput = () => {
  const rows = Array.isArray(messages.value) ? messages.value : []
  const pending = [...rows].reverse().find(message => message?.role === 'assistant') || null
  const pendingRun = pending?.agenticRun || pending?.agentic_run || null
  const isWaiting = !!pendingRun?.id && String(pendingRun.status || '').toLowerCase() === 'waiting_clarification'
  pendingGlobalClarificationInput.value = pending
    && isWaiting
    ? {
        runId: pendingRun.id,
        title: pendingRun.clarification_summary?.question
          || pendingRun.clarificationSummary?.question
          || pendingRun.clarification_question
          || '补充当前请求',
      }
    : null
}

const searchHighlightMsgIndex = ref(-1)
const handleSearchNavigation = async () => {
  const target = props.navigateTo
  if (!target || target.tab !== 'global-agent') return
  if (target.draftMessage) {
    chatInput.value = String(target.draftMessage)
    await nextTick()
    chatInputElement.value?.focus()
    emit('navigated')
    return
  }
  if (!target.sessionId) return
  for (let attempt = 0; attempt < 20 && !sessions.value.some(session => session.id === target.sessionId); attempt += 1) {
    await syncHistoryFromServer()
    if (!sessions.value.some(session => session.id === target.sessionId)) await new Promise(resolve => window.setTimeout(resolve, 100))
  }
  if (!sessions.value.some(session => session.id === target.sessionId)) {
    toast.warning('目标会话暂时无法读取')
    emit('navigated')
    return
  }
  await selectSession(target.sessionId)
  await nextTick()
  const keyword = String(target.keyword || '').toLowerCase()
  let index = target.messageId ? messages.value.findIndex(message => String(message.id || message.message_id || message.messageId || '') === String(target.messageId)) : -1
  if (index < 0 && target.missionId) index = messages.value.findIndex(message => String(message.globalMission?.id || message.missionId || message.mission_id || message.agenticRun?.mission_id || '') === String(target.missionId))
  if (index < 0 && Number.isInteger(target.messageIndex) && target.messageIndex >= 0 && target.messageIndex < messages.value.length) index = target.messageIndex
  if (index < 0 && keyword) index = messages.value.findIndex(message => String(message.content || '').toLowerCase().includes(keyword))
  if (index >= 0) {
    searchHighlightMsgIndex.value = index
    await nextTick()
    document.getElementById(`msg-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => { searchHighlightMsgIndex.value = -1 }, 3000)
  }
  emit('navigated')
}

watch(() => props.navigateTo, () => {
  if (props.navigateTo?.tab === 'global-agent') window.setTimeout(handleSearchNavigation, 100)
}, { immediate: true })

const globalInputPlaceholder = computed(() => {
  if (pendingGlobalMissionInput.value) return '补充当前任务需要的信息，发送后会继续原任务...'
  if (pendingGlobalClarificationInput.value) return '回答主 Agent 刚才的问题，发送后会接着原请求继续...'
  if (!globalTurnBusy.value) {
    return isSupervisionContinuationInput.value
      ? '补充要求或调整当前任务...'
      : '对全局助手说点什么…（输入 / 打开命令中心）'
  }
  return '输入下一条消息，当前回复结束后会自动发送...'
})

const globalSendButtonLabel = computed(() => {
  if (isSteering.value) return '接收中'
  if (pendingGlobalMissionInput.value) return '提交并继续'
  if (pendingGlobalClarificationInput.value) return '提交补充'
  if (globalTurnBusy.value) return '排队'
  return isSupervisionContinuationInput.value ? '更新任务' : '发送'
})

const canSendGlobalMessage = computed(() => {
  if (isSteering.value) return false
  if (globalTurnBusy.value) return !!chatInput.value.trim() || selectedFiles.value.length > 0
  return !!chatInput.value.trim() || selectedFiles.value.length > 0
})

const editGlobalUserMessage = async (message) => {
  if (isSending.value) return toast.info('请先等待当前回复结束或停止执行，再编辑历史消息')
  const text = getEditableUserMessageText(message)
  if (!text) return toast.info('这条消息没有可重新发送的文字内容')
  const hasDifferentDraft = !!chatInput.value.trim() && chatInput.value.trim() !== text
  const hasDirectedInput = !!pendingGlobalMissionInput.value || !!pendingGlobalClarificationInput.value
  if ((hasDifferentDraft || selectedFiles.value.length || hasDirectedInput)
    && !(await confirmDialog('编辑历史消息会替换当前输入框草稿，并退出正在进行的补充输入。是否继续？'))) return
  chatInput.value = text
  selectedFiles.value = []
  pendingGlobalMissionInput.value = null
  pendingGlobalClarificationInput.value = null
  await nextTick()
  chatInputElement.value?.focus?.()
  toast.info(hasMessageAttachments(message)
    ? '原消息文字已载入；历史附件不会自动复用，请重新添加附件后发送'
    : '原消息已载入输入框，修改后发送即可重新请求')
}

const runGlobalClientCommand = createSlashCommandClientActions({
  scope: 'global',
  messages: () => messages.value,
  sessions: () => sessions.value,
  currentSessionId: () => currentSessionId.value,
  context: () => ({ sessionId: currentSessionId.value }),
  selectSession: (sessionId) => selectSession(sessionId),
  refreshSessions: () => syncHistoryFromServer({ preferServerCurrent: true }),
  reloadCurrentSession: () => currentSessionId.value ? syncHistoryFromServer({ replaceSessionId: currentSessionId.value, preferServerCurrent: true }) : undefined,
  statusSummary: () => `全局 Agent 当前会话“${currentSession.value?.name || '未选择'}”已加载 ${messages.value.length} 条消息。`,
  contextMetrics: () => ({ 会话: currentSession.value?.name || '未选择', 会话ID: currentSessionId.value, 全部会话: sessions.value.length }),
  exportFilename: () => `ccm-global-${currentSessionId.value || 'context'}`,
  newSession: async () => {
    const session = createNewSession()
    return { success: true, summary: '已打开空白会话，发送第一条消息后才会创建。', metrics: { 会话: session.name, 状态: '未创建' } }
  },
  compactSession: async (payload = {}) => {
    if (!currentSession.value || !currentSessionId.value) throw new Error('当前没有可压缩的全局 Agent 会话')
    if (currentSession.value.source !== 'feishu') {
      const syncResponse = await fetch('/api/global-agent/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessions: sessions.value.filter(session => session.source !== 'feishu'), currentSessionId: currentSessionId.value }),
      })
      const syncData = await syncResponse.json()
      if (!syncResponse.ok || syncData.success === false) throw new Error(syncData.error || '同步当前全局 Agent 会话失败')
    }
    const sessionId = currentSessionId.value
    const scopeId = `session:${sessionId}`
    notifySessionContextUsage('global_session', scopeId, { active: true, reason: 'manual_compact' })
    try {
      const response = await fetch('/api/global-agent/memory/compact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          custom_instructions: String(payload.args || '').trim(),
        }),
      })
      const data = await response.json()
      if (!response.ok || data.success === false) throw new Error(data.error || '全局 Agent 会话压缩失败')
      return {
        ...data,
        summary: data.compacted
          ? '当前全局 Agent 会话已用模型压缩，最近消息仍会原样保留。'
          : '当前全局 Agent 会话没有可压缩的旧消息。',
        metrics: {
          压缩前: data.before_tokens || 0,
          压缩后: data.after_tokens || 0,
          保留消息: data.preserved_messages || 0,
        },
      }
    } finally {
      notifySessionContextUsage('global_session', scopeId, { active: false, reason: 'manual_compact_complete' })
    }
  },
  clearSession: async () => {
    if (!currentSession.value) throw new Error('当前没有可清空的会话')
    const cleared = currentSession.value.messages.length
    currentSession.value.messages = [{ ...DEFAULT_WELCOME, timestamp: new Date().toISOString() }]
    saveHistory()
    return { success: true, summary: `已清空当前全局 Agent 会话的 ${cleared} 条消息。`, metrics: { 已清空: cleared } }
  },
  renameSession: async (name) => {
    if (!currentSession.value) throw new Error('当前没有可重命名的会话')
    currentSession.value.name = name
    currentSession.value.titleOrigin = 'manual'
    currentSession.value.updatedAt = new Date().toISOString()
    saveHistory()
    return { success: true, summary: `当前全局 Agent 会话已重命名为“${name}”。`, metrics: { 会话ID: currentSessionId.value } }
  },
})

const slash = useSlashCommands({
  scope: 'global',
  input: chatInput,
  context: () => ({ sessionId: currentSessionId.value }),
  focus: () => nextTick(() => chatInputElement.value?.focus()),
  onNavigate: (tab) => emit('switch-tab', tab),
  onPrompt: async (prompt) => {
    chatInput.value = prompt
    await nextTick()
    await sendMessage()
  },
  onClientAction: runGlobalClientCommand,
  onResult: (result) => {
    if (!currentSession.value) return
    currentSession.value.messages.push({ id: result.recordId, role: 'assistant', type: 'command_result', commandResult: result, localCommandRecord: result.localCommandRecord, modelVisible: false, content: result.summary || '命令已执行', timestamp: result.at || new Date().toISOString() })
    nextTick(() => scrollToBottom())
  },
  onError: (message) => toast.error(message),
  onConfirm: (message) => confirmDialog(message),
})

const handleGlobalInput = () => slash.onInput()
const handleGlobalInputKeydown = async (event) => {
  if (await slash.onKeydown(event)) return
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    await sendMessage()
  }
}

const globalRequestRetrySignature = ({ sessionId, message, files, clarificationRunId, targetRefs }) => JSON.stringify({
  sessionId,
  message,
  files: (files || []).map(file => [file.name, file.size]),
  clarificationRunId: clarificationRunId || '',
  targetRefs: (targetRefs || []).map(target => `${target.scope}:${target.scopeId}`).sort(),
})

const SYSTEM_RESULT_MARKER = '[处理结果]'
const LEGACY_SYSTEM_RECEIPT_MARKER = '[系统回执]'
const SYSTEM_RESULT_MARKERS = [SYSTEM_RESULT_MARKER, LEGACY_SYSTEM_RECEIPT_MARKER]

const systemResultMessage = (icon, text) => `${icon ? `${icon} ` : ''}${SYSTEM_RESULT_MARKER} ${text}`

const isSystemReceipt = (content) => {
  const text = String(content || '')
  return SYSTEM_RESULT_MARKERS.some(marker => text.includes(marker))
}

const hasSystemResult = (content, icon = '') => {
  const text = String(content || '')
  return SYSTEM_RESULT_MARKERS.some(marker => text.includes(icon ? `${icon} ${marker}` : marker))
}

const GLOBAL_VISIBLE_INTERNAL_TEXT_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|<\s*\/?\s*task-notification|task-notification|receipt[-_\s]*status|trace_id|session_id|WorkerContextPacket|raw\s+receipt|raw\s+payload|raw_report|scratchpad|Runtime Kernel|workflow_timeline|native_session|task_agent_session|[A-Za-z]:[\\/][^\r\n]*(?:test-agent-artifacts|artifact-manifest\.json|report\.md|report\.json|verdict\.json)|test-agent-artifacts|artifact-manifest\.json|verdict\.json|raw\s+stack|stack\s+trace/i
const sanitizeGlobalVisibleStreamText = (value, fallback = '我正在处理当前请求。', max = 8000) => {
  const raw = String(value || '')
  if (!raw) return ''
  const text = visibleGlobalPlanText(raw, fallback, GLOBAL_VISIBLE_INTERNAL_TEXT_PATTERN.test(raw) ? Math.min(max, 1200) : max)
  return text.length > max ? `${text.slice(0, max)}...` : text
}

const isProjectReport = (content) => {
  return content && (content.includes('的运行报告]:') || content.includes('[项目 Agent 运行失败]'))
}

const parseReceipt = (content) => {
  const result = {
    title: '处理结果',
    type: 'default',
    icon: '⚙️',
    details: []
  }
  if (!content) return result
  
  if (hasSystemResult(content, '📋')) {
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
  } else if (hasSystemResult(content, '⏰')) {
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
  } else if (hasSystemResult(content, '🎵')) {
    result.title = '音乐点歌成功'
    result.type = 'music'
    result.icon = '🎵'
    const songMatch = content.match(/成功点歌《([^》]+)》/)
    const sourceMatch = content.match(/-\s+\*\*来源\*\*:\s*([^\n]+)/)
    const statusMatch = content.match(/-\s+\*\*状态\*\*:\s*([^\n]+)/)
    if (songMatch) result.details.push({ label: '音乐名称', value: songMatch[1] })
    if (sourceMatch) result.details.push({ label: '来源平台', value: sourceMatch[1] })
    if (statusMatch) result.details.push({ label: '播放状态', value: statusMatch[1] })
  } else if (hasSystemResult(content, '🐾')) {
    result.title = '桌面宠物状态已变更'
    result.type = 'pet'
    result.icon = '🐾'
    const status = content.includes('唤醒') ? '已拉起在桌面显示' : '已在桌面隐藏'
    result.details.push({ label: '动作状态', value: status })
  } else if (hasSystemResult(content, '📂')) {
    result.title = '项目绑定已完成'
    result.type = 'project'
    result.icon = '📂'
    const nameMatch = content.match(/项目「([^」]+)」/)
    const dirMatch = content.match(/-\s+\*\*物理路径\*\*:\s*`([^`]+)`/)
    const agentMatch = content.match(/-\s+\*\*内置 Agent 运行时\*\*:\s*`([^`]+)`/)
    if (nameMatch) result.details.push({ label: '项目名称', value: nameMatch[1] })
    if (dirMatch) result.details.push({ label: '本地工作目录', value: dirMatch[1] })
    if (agentMatch) result.details.push({ label: '运行内核', value: agentMatch[1] })
  } else if (hasSystemResult(content, '📚')) {
    result.title = '模版保存成功'
    result.type = 'template'
    result.icon = '📚'
    const nameMatch = content.match(/对话模板「([^」]+)」/)
    const catMatch = content.match(/-\s+\*\*分类\*\*:\s*([^\n]+)/)
    const contentMatch = content.match(/>\s*([\s\S]*)/)
    if (nameMatch) result.details.push({ label: '模板名称', value: nameMatch[1] })
    if (catMatch) result.details.push({ label: '模版分类', value: catMatch[1] })
    if (contentMatch) result.details.push({ label: '模版详情', value: contentMatch[1].trim() })
  } else if (hasSystemResult(content, '⚙️')) {
    result.title = '正在安排指令...'
    result.type = 'dispatch'
    result.icon = '⚙️'
    const projMatch = content.match(/正在向(?:项目 Agent|项目执行成员) \[([^\]]+)\]/)
    const cmdMatch = content.match(/>\s*["“]([^"”]+)["”]/)
    if (projMatch) result.details.push({ label: '下发项目', value: projMatch[1] })
    if (cmdMatch) result.details.push({ label: '修改指令', value: cmdMatch[1] })
  } else if (hasSystemResult(content, '💬')) {
    result.title = '群聊协作指令已下达'
    result.type = 'group'
    result.icon = '💬'
    result.details.push({ label: '状态说明', value: '协作指令已安排，项目群组已开始协同工作。' })
  }
  result.details = result.details.map(detail => ({
    ...detail,
    value: visibleGlobalText(detail.value, '处理结果已整理。', 260)
  }))
  return result
}

const parseProjectReport = (content) => {
  const result = {
    projectName: '项目执行成员',
    success: true,
    title: '运行报告',
    body: ''
  }
  if (!content) return result
  
  if (/\[(?:项目 Agent|项目执行成员) 运行失败\]/.test(content)) {
    result.success = false
    result.title = '运行失败'
    const match = content.match(/❌ \[(?:项目 Agent|项目执行成员) 运行失败\]:\s*([\s\S]*)/)
    result.body = match ? match[1].trim() : content
  } else {
    const nameMatch = content.match(/📂 \[(?:项目 Agent|项目执行成员) -\s*([^\s\]]+)\s*的运行报告\]:/)
    result.projectName = nameMatch ? visibleGlobalText(nameMatch[1], '项目执行成员', 80) : '项目执行成员'
    const bodyMatch = content.match(/📂 \[(?:项目 Agent|项目执行成员) - [^\s\]]+ 的运行报告\]:\s*([\s\S]*)/)
    result.body = bodyMatch ? bodyMatch[1].trim() : content
  }
  result.body = visibleGlobalText(result.body, result.success ? '项目执行成员已提交运行报告，技术细节已放入详情。' : '项目执行成员执行遇到问题，排障信息已放入技术详情。', 1200)
  return result
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

const GLOBAL_RESULT_VISIBLE_FALLBACK = '我已整理这次处理结果。'

const formatGlobalRunVisibleReply = (run = {}, fallback = GLOBAL_RESULT_VISIBLE_FALLBACK) => {
  const presentation = classifyGlobalAgentRunPresentation(run)
  // 简单业务只用短 final_reply，不把交付报告 markdown 塞进气泡
  if (presentation !== PRESENTATION_REPLY) {
    const deliveryReport = getDeliveryReport(run)
    if (deliveryReport?.markdown || deliveryReport?.user_text) {
      return deliveryReport.markdown || deliveryReport.user_text
    }
  }
  const raw = run.final_reply || run.finalReply || fallback
  const text = presentation === PRESENTATION_REPLY ? stripDeliveryScaffoldSections(raw) : raw
  return sanitizeGlobalVisibleStreamText(text || fallback, fallback, 8000)
}

function getVisibleGlobalMessageContent(msg, fallback = '这条消息已整理。') {
  if (!msg) return ''
  if (msg.role === 'user') return String(msg.content || '')
  const structured = msg.agenticRun ? formatGlobalRunVisibleReply(msg.agenticRun, '') : ''
  const presentation = msg.agenticRun
    ? classifyGlobalAgentRunPresentation(msg.agenticRun, msg)
    : classifyGlobalAgentRunPresentation({}, msg)
  const raw = structured || msg.content || fallback
  const text = presentation === PRESENTATION_REPLY ? stripDeliveryScaffoldSections(raw) : raw
  return sanitizeGlobalVisibleStreamText(text || fallback, fallback, 8000)
}

const {
  trackGlobalMission,
  stopAllMissionTracking,
  disposeMissionTracking,
  missionStatusLabel,
  childStatusLabel,
} = useGlobalMissionTracking({
  sessions,
  saveHistory,
  scrollToBottom,
  formatRunVisibleReply: formatGlobalRunVisibleReply,
  toast,
})

const getActionParam = (action, ...keys) => {
  const params = action?.params || {}
  for (const key of keys) {
    const value = params[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return ''
}

const normalizeMusicAction = (action) => {
  const params = action?.params || {}
  const rawKeyword = String(getActionParam(action, 'keyword', 'query', 'song')).trim()
  const lowered = rawKeyword.toLowerCase()
  const isRandom = params.random === true || !rawKeyword || ['__random__', 'random', '随机', '随便', '任意', '播放音乐', '听歌'].includes(lowered)
  const keyword = isRandom ? RANDOM_MUSIC_KEYWORD : rawKeyword
  return {
    keyword,
    isRandom,
    requestLabel: isRandom ? '随机播放音乐' : `《${rawKeyword}》`
  }
}

const {
  ensureGlobalStreamMessage,
  appendGlobalStreamEvent,
  findActiveGlobalRunMessage,
} = useGlobalAgentTurnRuntime({
  currentSession,
  activeGlobalRunId,
  activeGlobalRunMessage,
  activeGlobalExecutionConfirmed,
})
watch(messages, () => {
  syncPendingGlobalClarificationInput()
  scrollToBottom()
}, { deep: true, immediate: true, flush: 'post' })

watch(currentSessionId, () => {
  pendingGlobalMissionInput.value = null
  pendingGlobalClarificationInput.value = null
  chatInput.value = ''
  scrollToBottom()
}, { flush: 'post' })

const {
  sendGlobalRunSteer,
  stopGlobalCurrentWork,
  drainGlobalTurnQueue,
  guideGlobalQueuedTurn,
  beginGlobalMissionInput,
  sendMessage,
} = useGlobalAgentMessaging({
  chatInput, isSteering, activeGlobalRunId, findActiveGlobalRunMessage, currentSession, toast,
  applyGlobalMissionPayload: (msg, payload) => applyGlobalMissionPayload(msg, payload),
  appendGlobalStreamEvent, saveHistory, scrollToBottom, globalTurnBusy, stoppingGlobalTurn,
  globalActiveRunId, globalStreamController, currentSessionId, globalTurnControl, currentSupervisedRunMessage,
  activeGlobalRunMessage, activeGlobalExecutionConfirmed,
  pendingGlobalMissionInput, selectedFiles,
  selectedGlobalTargetRefs, selectedGlobalTargetKeys,
  chatInputElement, postJson: (url, body) => postJson(url, body), visibleGlobalText, isSending,
  pendingGlobalClarificationInput, createNewSession, pendingGlobalRequestRetry, globalRequestRetrySignature,
  materializeCurrentSession,
  ensureGlobalStreamMessage, sanitizeGlobalVisibleStreamText, GLOBAL_VISIBLE_INTERNAL_TEXT_PATTERN,
  GLOBAL_RESULT_VISIBLE_FALLBACK, trackGlobalMission, emit,
})

const globalContextScopeId = computed(() => currentSessionId.value && !isCurrentSessionDraft.value ? `session:${currentSessionId.value}` : '')
const {
  usage: globalContextUsage,
  loading: globalContextLoading,
  error: globalContextError,
  compacting: globalContextCompacting,
  refresh: refreshGlobalContextUsage,
} = useSessionContextUsage({
  scope: 'global_session',
  scopeId: globalContextScopeId,
  enabled: computed(() => props.active !== false && !!globalContextScopeId.value),
  refreshKey: computed(() => `${messages.value.length}:${globalTurnBusy.value}`),
  activeRequest: globalTurnBusy,
})

const {
  requests: globalPermissionRequests,
  busyId: globalPermissionBusyId,
  approve: approveGlobalPermission,
  reject: rejectGlobalPermission,
} = usePermissionApprovals({
  scope: computed(() => ({
    originType: 'global',
    originSessionId: currentSessionId.value || '',
  })),
  active: computed(() => props.active !== false && !!currentSessionId.value && !isCurrentSessionDraft.value),
})

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
    const res = await fetch('/api/global-agent/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userText, history: historyPayload, session_id: request.session_id || currentSessionId.value, request_id: request.id })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    const run = data.run || {}
    currentSession.value.messages.push({
      role: 'assistant',
      content: formatGlobalRunVisibleReply(run, GLOBAL_RESULT_VISIBLE_FALLBACK),
      timestamp: new Date().toISOString(),
      files: data.files || [],
      source: 'feishu-control-bot',
      agenticRun: run
    })
    saveHistory()
    const assistantReplies = currentSession.value.messages.slice(startIndex).filter(m => m.role === 'assistant').map(m => m.content).filter(Boolean)
    await postJson('/api/global-agent/bridge/result', {
      id: request.id,
      success: true,
      reply: sanitizeGlobalVisibleStreamText(assistantReplies.join('\n\n') || run.final_reply || GLOBAL_RESULT_VISIBLE_FALLBACK, GLOBAL_RESULT_VISIBLE_FALLBACK, 8000)
    })
    if (!chatInput.value.trim()) chatInput.value = userText
  } catch (err) {
    const message = sanitizeGlobalVisibleStreamText(err?.message, '全局 Agent 控制台处理飞书消息失败', 1200)
    currentSession.value.messages.push({ role: 'assistant', content: `处理失败：${message}`, timestamp: new Date().toISOString(), source: 'feishu-control-bot' })
    saveHistory()
    await postJson('/api/global-agent/bridge/result', { id: request.id, success: false, error: message }).catch(() => {})
  } finally {
    isSending.value = false
    scrollToBottom()
  }
}

let bridgePollTimer = null
let bridgeProcessing = false
let globalHistorySyncTimer = null
let globalHistorySyncing = false
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

const syncGlobalHistoryFromServer = async () => {
  if (globalHistorySyncing || isSending.value) return false
  globalHistorySyncing = true
  try {
    const changed = await syncHistoryFromServer()
    if (changed) {
      scrollToBottom()
      setTimeout(() => scrollToBottom(), 80)
    }
    return changed
  } catch {
    return false
  } finally {
    globalHistorySyncing = false
  }
}

const {
  postJson,
  saveCurrentGlobalSessionKnowledge,
  applyGlobalMissionPayload,
  getGlobalTaskCard,
  isGlobalMissionTaskMessage,
  runtimeDebugSections,
  openGlobalChangesTab,
  handleGlobalTaskAction,
  executeAction,
} = useGlobalAgentActions({
  currentSessionId, currentSession, messages, saveHistory, toast, scrollToBottom, emit, formatGlobalRunVisibleReply,
  sanitizeGlobalVisibleStreamText, chatInput, pendingGlobalClarificationInput, chatInputElement, sendMessage,
  beginGlobalMissionInput, openCodeChangeDrawer, trackGlobalMission, executingAction, addAssistantMessage,
  getActionParam, normalizeMusicAction, systemResultMessage, confirmDialog,
})

const locateGlobalPlanStep = ({ messageIndex }) => {
  if (Number.isInteger(messageIndex) && messageIndex >= 0) scrollToMessage(messageIndex)
}
const handleGlobalPlanAction = ({ messageIndex, action }) => {
  const message = Number.isInteger(messageIndex) && messageIndex >= 0 ? messages.value[messageIndex] : {}
  return handleGlobalTaskAction(message || {}, action)
}

onMounted(() => {
  window.addEventListener('resize', syncGlobalSidebarForViewport)
  syncGlobalSidebarForViewport()
  loadHistory()
  void loadFeishuSessionState()
  void loadGlobalTools(false)
  void loadGlobalDispatchTargets()
  unsubscribeFeishuSessionEvents = subscribeRuntimeEvents(['feishu', 'music', 'global'], event => {
    if (event?.type === 'global.session_title_changed') {
      const sessionId = String(event?.data?.sessionId || '')
      const session = sessions.value.find(item => item.id === sessionId)
      const title = String(event?.data?.title || '').trim()
      if (session && title) {
        session.name = title
        session.titleOrigin = String(event?.data?.titleOrigin || 'provisional')
        saveHistory()
      }
    }
    if (event?.type === 'feishu.session_binding_changed'
      || event?.type === 'feishu.session_title_changed'
      || event?.type === 'feishu.inbound') {
      void loadFeishuSessionState()
    }
    if (event?.topic === 'music' && String(event?.type || '').startsWith('music.playback.')) {
      const commandId = String(event?.data?.commandId || event?.data?.command_id || '')
      const sessionId = String(event?.data?.sessionId || event?.data?.session_id || '')
      if (!commandId || !sessionId) return
      const session = sessions.value.find(item => item.id === sessionId)
      const message = [...(session?.messages || [])].reverse().find(item =>
        (item?.agenticRun?.client_effects || []).some(effect =>
          effect?.type === 'play_music' && String(effect?.params?.command_id || '') === commandId))
      if (!message) return
      const status = String(event?.data?.status || '')
      const title = String(event?.data?.title || '音乐')
      message.content = status === 'completed'
        ? `正在播放：${title}`
        : status === 'needs_user_gesture'
          ? `已准备好：${title}。浏览器需要你点击一次播放按钮。`
          : status === 'superseded'
            ? `原点歌请求已被更新的播放请求替代：${title}`
            : status === 'cancelled'
              ? `已取消播放：${title}`
              : status === 'failed'
                ? `播放失败：${event?.data?.reason || title}`
                : message.content
      message.updatedAt = event.at || new Date().toISOString()
      saveHistory()
    }
  })
  loadQualitySnapshot()
  syncGlobalHistoryFromServer()
  for (const session of sessions.value) {
    for (const message of session.messages || []) {
      if (message.type === 'global_mission' && message.globalMission?.id && !['done', 'completed', 'failed', 'cancelled', 'canceled'].includes(String(message.globalMission?.status || '').toLowerCase())) {
        trackGlobalMission(message.globalMission.id, session.id)
      }
      if (message.agenticRun?.mission_id && !['completed', 'failed', 'cancelled'].includes(message.agenticRun.status)) {
        trackGlobalMission(message.agenticRun.mission_id, session.id)
      }
    }
  }
  isPinnedToBottom.value = true
  attachGlobalResizeObserver()
  scrollToBottom({ force: true })
  setTimeout(() => scrollToBottom({ force: true }), 80)
  setTimeout(() => scrollToBottom({ force: true }), 250)
  if (props.active !== false) {
    pollBridgeRequests()
    bridgePollTimer = setInterval(pollBridgeRequests, 1500)
    globalHistorySyncTimer = setInterval(syncGlobalHistoryFromServer, 5000)
  }
})

const stopGlobalBackgroundPolls = () => {
  if (bridgePollTimer) {
    clearInterval(bridgePollTimer)
    bridgePollTimer = null
  }
  if (globalHistorySyncTimer) {
    clearInterval(globalHistorySyncTimer)
    globalHistorySyncTimer = null
  }
}

const startGlobalBackgroundPolls = () => {
  stopGlobalBackgroundPolls()
  pollBridgeRequests()
  bridgePollTimer = setInterval(pollBridgeRequests, 1500)
  globalHistorySyncTimer = setInterval(syncGlobalHistoryFromServer, 5000)
}

watch(() => props.active, (isActive) => {
  if (isActive === false) {
    stopGlobalBackgroundPolls()
    stopAllMissionTracking()
    return
  }
  startGlobalBackgroundPolls()
  for (const session of sessions.value) {
    for (const message of session.messages || []) {
      if (message.type === 'global_mission' && message.globalMission?.id && !['done', 'completed', 'failed', 'cancelled', 'canceled'].includes(String(message.globalMission?.status || '').toLowerCase())) {
        trackGlobalMission(message.globalMission.id, session.id)
      }
      if (message.agenticRun?.mission_id && !['completed', 'failed', 'cancelled'].includes(message.agenticRun.status)) {
        trackGlobalMission(message.agenticRun.mission_id, session.id)
      }
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', syncGlobalSidebarForViewport)
  stopGlobalBackgroundPolls()
  disposeMissionTracking()
  detachGlobalResizeObserver()
  unsubscribeFeishuSessionEvents?.()
  unsubscribeFeishuSessionEvents = null
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
    <GlobalAgentSessionSidebar
      :sessions="sessions"
      :current-session-id="currentSessionId"
      :open="isSidebarOpen"
      @new-session="createNewSession"
      @new-feishu-session="createFeishuSession"
      @bind-session="openFeishuBinding"
      @toggle="isSidebarOpen = !isSidebarOpen"
      @expand="isSidebarOpen = true"
      @select-session="selectSession"
      @delete-session="deleteSession"
      @clear-all="clearAllSessions"
    />
    <GlobalAgentFeishuBindingModal
      :open="feishuBindingOpen"
      :session="bindingSession"
      :bindings="feishuBindings"
      :busy="feishuBindingBusy"
      @close="feishuBindingOpen = false"
      @bind="updateFeishuBinding($event, 'bind')"
      @unbind="updateFeishuBinding($event, 'unbind')"
    />
    <AgentToolsModal
      :open="globalToolsOpen"
      title="全局 Agent 工具配置"
      description="授权全局 Agent 可按用户语义选择并调用的 MCP 与 Skill。"
      :all-tools="globalToolOptions"
      :selected-tools="globalTools"
      :readiness="globalToolReadiness"
      :preflight="globalToolPreflight"
      :busy="globalToolsBusy"
      @toggle-tool="toggleGlobalTool"
      @save="saveGlobalTools"
      @close="globalToolsOpen = false"
    />
    
    <!-- 右侧聊天区 -->
    <div class="chat-container">
      <div class="chat-header">
        <div class="header-logo"><Bot :size="20" /></div>
        <div class="header-title">
          <h3>全局控制中心</h3>
          <p>
            {{ currentSession ? currentSession.name : '智能编排与命令分发助手' }}
            <span class="message-count" v-if="messages.length > 1">(已保存 {{ messages.length - 1 }} 条对话)</span>
          </p>
        </div>
        <div class="quality-header-actions">
          <ConversationFindBar
            :messages="messages"
            :scroll-container="chatBody"
            target-id-prefix="msg-"
            :scope-key="currentSessionId"
            :active="props.active && !!currentSessionId"
          />
          <button class="btn btn-outline global-tool-button" title="配置全局 Agent 的 MCP 与 Skill" @click="loadGlobalTools(true)"><Wrench :size="14" /><span>工具</span><small>{{ globalToolCount }}</small></button>
          <span :class="['quality-mode', qualitySnapshot?.policy?.shadowMode ? 'shadow' : 'live']">{{ qualitySnapshot?.policy?.shadowMode ? '影子模式' : '真实执行' }}</span>
          <button class="btn btn-outline" @click="saveCurrentGlobalSessionKnowledge"><BookOpen :size="14" />保存知识</button>
          <details class="global-header-menu">
            <summary title="更多全局助手操作" aria-label="更多全局助手操作"><MoreHorizontal :size="17" /></summary>
            <div class="global-header-menu-popover">
              <button type="button" :disabled="controlCenterLoading" @click="toggleControlCenter"><RefreshCw :size="14" />总控面板</button>
              <button type="button" :disabled="qualityLoading" @click="qualityExpanded = !qualityExpanded; qualityExpanded && loadQualitySnapshot()"><Gauge :size="14" />决策评测</button>
            </div>
          </details>
        </div>
      </div>
      <section v-if="controlCenterExpanded" class="global-control-center">
        <div class="control-center-head">
          <div>
            <span>CCM CONTROL BRAIN</span>
            <strong>全局 Agent 总控</strong>
          </div>
          <button class="btn btn-outline" :disabled="controlCenterLoading" @click="loadGlobalControlCenter(intentPreviewText || chatInput)">刷新</button>
        </div>
        <div class="intent-preview-row">
          <input v-model="intentPreviewText" placeholder="输入一句话预览全局 Agent 会如何路由" @keyup.enter="previewGlobalIntent" />
          <button class="btn btn-primary" :disabled="controlCenterLoading" @click="previewGlobalIntent">预览</button>
        </div>
        <LoadingSkeleton v-if="controlCenterLoading && !controlCenter" :rows="5" />
        <template v-else-if="controlCenter">
          <div class="control-metrics">
            <div>
              <span>健康评分</span>
              <strong>{{ controlCenter.health?.score || 0 }}</strong>
              <small>{{ controlCenter.health?.severity || 'ok' }}</small>
            </div>
            <div>
              <span>意图路由</span>
              <strong>{{ controlCenter.intent?.route || '-' }}</strong>
              <small>{{ Math.round((controlCenter.intent?.confidence || 0) * 100) }}%</small>
            </div>
            <div>
              <span>跟进队列</span>
              <strong>{{ controlCenter.supervision?.total || 0 }}</strong>
              <small>全局任务</small>
            </div>
            <div>
              <span>治理规则</span>
              <strong>{{ controlCenter.governance?.summary?.permission_rules || 0 }}/{{ controlCenter.governance?.summary?.hooks || 0 }}</strong>
              <small>权限 / Hook</small>
            </div>
          </div>
          <div class="control-grid">
            <section>
              <div class="control-section-head"><strong>系统健康</strong><span>{{ controlCenter.health?.counts?.projects || 0 }} 项目</span></div>
              <div class="health-list">
                <div v-for="row in controlCenter.health?.rows || []" :key="row.id" :class="['health-row', row.severity]">
                  <span>{{ row.label }}</span>
                  <strong>{{ row.summary }}</strong>
                </div>
              </div>
            </section>
            <section>
              <div class="control-section-head"><strong>意图与调度</strong><span>{{ controlCenter.intent?.recommended_tool || '自然回复' }}</span></div>
              <p class="control-reason">{{ controlCenter.intent?.reason }}</p>
              <div class="dispatch-targets">
                <div v-for="target in controlCenter.dispatch?.targets || []" :key="target.type + target.id">
                  <span>{{ target.type }}</span>
                  <strong>{{ target.name || target.id }}</strong>
                  <small>{{ target.reason }}</small>
                </div>
                <p v-if="!(controlCenter.dispatch?.targets || []).length">{{ (controlCenter.dispatch?.missing || []).join('、') || '当前无需调度' }}</p>
              </div>
            </section>
            <section>
              <div class="control-section-head"><strong>权限治理</strong><span>{{ controlCenter.governance?.summary?.deny_rules || 0 }} 拒绝规则</span></div>
              <div class="governance-form">
                <select v-model="runtimePermissionForm.decision">
                  <option value="deny">拒绝</option>
                  <option value="allow">允许</option>
                </select>
                <input v-model="runtimePermissionForm.tool" placeholder="工具名或 *" />
                <input v-model="runtimePermissionForm.target" placeholder="目标，可空" />
                <button class="btn btn-outline" @click="saveRuntimePermission">保存</button>
              </div>
              <div class="rule-list">
                <div v-for="rule in (controlCenter.governance?.permissions || []).slice(0, 6)" :key="rule.id">
                  <span>{{ rule.decision }}</span>
                  <strong>{{ rule.tool }}{{ rule.target ? ' · ' + rule.target : '' }}</strong>
                  <button @click="deleteRuntimePermission(rule)">删除</button>
                </div>
              </div>
            </section>
            <section>
              <div class="control-section-head"><strong>Hook 治理</strong><span>{{ controlCenter.governance?.summary?.blocking_hooks || 0 }} 阻断 Hook</span></div>
              <div class="governance-form">
                <select v-model="runtimeHookForm.phase">
                  <option value="pre_tool_use">前置</option>
                  <option value="post_tool_use">后置</option>
                </select>
                <select v-model="runtimeHookForm.effect">
                  <option value="annotate">标注</option>
                  <option value="block">阻断</option>
                </select>
                <input v-model="runtimeHookForm.tool" placeholder="工具名或 *" />
                <input v-model="runtimeHookForm.message" placeholder="说明" />
                <button class="btn btn-outline" @click="saveRuntimeHook">保存</button>
              </div>
              <div class="rule-list">
                <div v-for="hook in (controlCenter.governance?.hooks || []).slice(0, 6)" :key="hook.id">
                  <span>{{ hook.effect }}</span>
                  <strong>{{ hook.phase }} · {{ hook.tool || '*' }}</strong>
                  <button @click="deleteRuntimeHook(hook)">删除</button>
                </div>
              </div>
            </section>
          </div>
          <section class="supervision-console">
            <div class="control-section-head"><strong>任务跟进控制台</strong><span>{{ controlCenter.supervision?.total || 0 }} 个跟进任务</span></div>
            <div class="supervision-list">
              <div v-for="row in controlCenter.supervision?.rows || []" :key="row.id" :class="['supervision-row', { waiting: row.waiting, failed: row.failed }]">
                <div>
                  <strong>{{ row.business_goal || row.mission_id }}</strong>
                  <span>{{ row.status }} · {{ row.cycle_count }}/{{ row.max_attempts }} · {{ row.updated_at }}</span>
                </div>
                <div class="supervision-actions">
                  <button @click="controlSupervisorFromCenter(row, 'check_now')">检查</button>
                  <button v-if="row.status === 'paused'" @click="controlSupervisorFromCenter(row, 'resume')">恢复</button>
                  <button v-else @click="controlSupervisorFromCenter(row, 'pause')">暂停</button>
                  <button @click="controlSupervisorFromCenter(row, 'takeover')">接管</button>
                </div>
              </div>
            </div>
          </section>
        </template>
      </section>
      <section v-if="qualityExpanded && qualitySnapshot" class="quality-center-card">
        <div class="quality-center-head">
          <div><span>AGENT QUALITY CENTER</span><strong>决策与真实交付质量</strong></div>
          <button class="btn btn-outline" :disabled="qualityLoading" @click="toggleShadowMode">{{ qualitySnapshot.policy?.shadowMode ? '关闭影子模式' : '启用影子模式' }}</button>
        </div>
        <div class="quality-metrics">
          <div><span>误派发率</span><strong>{{ qualitySnapshot.rates?.misdispatch_rate || 0 }}%</strong></div>
          <div><span>漏执行率</span><strong>{{ qualitySnapshot.rates?.missed_execution_rate || 0 }}%</strong></div>
          <div><span>未授权写入</span><strong>{{ qualitySnapshot.rates?.unauthorized_write_rate || 0 }}%</strong></div>
          <div><span>虚假完成</span><strong>{{ qualitySnapshot.rates?.false_completion_rate || 0 }}%</strong></div>
          <div><span>原生会话恢复</span><strong>{{ qualitySnapshot.rates?.native_session_recovery_rate || 0 }}%</strong></div>
          <div><span>冲突处理</span><strong>{{ qualitySnapshot.rates?.conflict_handling_rate || 0 }}%</strong></div>
          <div><span>一次交付</span><strong>{{ qualitySnapshot.rates?.first_pass_delivery_rate || 0 }}%</strong></div>
        </div>
        <p>写操作置信度门槛 {{ qualitySnapshot.policy?.minWriteConfidence }}；目标必须来自当前消息、模型的当前上下文引用或读取结果。影子模式下所有写工具只记录拟调用，不产生副作用。</p>
      </section>
      
      <GlobalAgentMessageList
        :messages="messages"
        :execution-events="globalAgentExecutionEvents"
        :execution-events-enabled="globalAgentExecutionEnabled"
        :current-session-id="currentSessionId"
        :draft="isCurrentSessionDraft"
        :search-highlight-msg-index="searchHighlightMsgIndex"
        :executing-action="executingAction"
        :is-sending="isSending"
        :current-session="currentSession"
        :nav-messages="navMessages"
        :set-chat-body="(element) => { chatBody = element }"
        :set-chat-content-inner="(element) => { chatContentInner = element }"
        :update-scroll-state="updateScrollState"
        :scroll-to-message="scrollToMessage"
        :scroll-to-bottom="scrollToBottom"
        :get-global-task-card="getGlobalTaskCard"
        :is-global-mission-task-message="isGlobalMissionTaskMessage"
        :handle-global-task-action="handleGlobalTaskAction"
        :runtime-debug-sections="runtimeDebugSections"
        :get-visible-global-message-content="getVisibleGlobalMessageContent"
        :is-system-receipt="isSystemReceipt"
        :parse-receipt="parseReceipt"
        :is-project-report="isProjectReport"
        :parse-project-report="parseProjectReport"
        :toggle-report="toggleReport"
        :is-report-open="isReportOpen"
        :render-markdown="renderMarkdown"
        :toggle-select-all-files="toggleSelectAllFiles"
        :get-git-status-color="getGitStatusColor"
        :handle-git-commit-card-submit="handleGitCommitCardSubmit"
        :zoom-image="zoomImage"
        :format-size="formatSize"
        :pending-progress-count="pendingGlobalProgressCount"
        :jump-to-latest-progress="jumpToLatestGlobalProgress"
        @edit-message="editGlobalUserMessage"
        @open-file-change="openSingleFileChange"
        @open-file-changes="openCodeChangeDrawer($event, { title: '全局任务文件改动' })"
      />

      <div class="chat-footer">
        <PermissionApprovalCards
          :requests="globalPermissionRequests"
          :busy-id="globalPermissionBusyId"
          @approve="approveGlobalPermission"
          @reject="rejectGlobalPermission"
        />
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

        <div v-if="!pendingGlobalMissionInput" class="global-dispatch-target-picker">
          <span class="global-dispatch-target-label">任务投放目标</span>
          <div class="global-dispatch-target-options">
            <p v-if="globalDispatchTargetsLoading" class="dispatch-target-state">正在读取可投放项目和群聊…</p>
            <div v-else-if="globalDispatchTargetsError" class="dispatch-target-load-error" role="alert">
              <span>目标列表加载失败：{{ globalDispatchTargetsError }}</span>
              <button type="button" :disabled="isSending" @click="loadGlobalDispatchTargets">重新读取</button>
            </div>
            <ScopeTargetSelect
              v-else-if="globalDispatchTargets.length"
              v-model="selectedGlobalTargetKey"
              :options="globalDispatchTargetOptions"
              :disabled="isSending"
              placeholder="选择群聊或项目"
              aria-label="选择本次全局 Agent 任务的投放目标"
            />
            <p v-if="!globalDispatchTargetsLoading && !globalDispatchTargetsError && !globalDispatchTargets.length">当前确实没有已配置的项目或群聊。普通问答仍可直接发送。</p>
          </div>
        </div>
        <OnlineDocumentReferences :text="chatInput" compact pending-label="发送后读取" />
        <ActiveTaskPlanDock
          :events="globalAgentExecutionEvents"
          :messages="messages"
          :exact-session-id="currentSessionId || ''"
          :active="globalAgentExecutionEnabled && !!currentSessionId && !isCurrentSessionDraft"
          @locate="locateGlobalPlanStep"
          @execution-action="handleGlobalPlanAction"
        />
        <ConversationTurnControls
          :busy="globalTurnBusy"
          :turns="globalTurnControl.turns.value"
          :stopping="stoppingGlobalTurn"
          compact
          @stop="stopGlobalCurrentWork"
          @cancel="globalTurnControl.cancel"
          @guide="guideGlobalQueuedTurn"
          @retry="(turn) => globalTurnControl.retry(turn).then(() => drainGlobalTurnQueue())"
        />
        <div class="input-wrapper" :class="{ 'steering-mode': (isSending && !!activeGlobalRunId) || isSupervisionContinuationInput }">
          <input 
            type="file" 
            ref="fileInput" 
            multiple 
            style="display: none" 
            @change="handleFileChange"
            accept="image/*,.txt,.md,.json,.csv,.pdf,.docx,.pptx,.xlsx"
            :disabled="!!pendingGlobalMissionInput"
          />
          <button
            class="attach-btn"
            @click="triggerFileUpload"
            :title="pendingGlobalMissionInput ? '当前正在补充任务条件，请先提交文字信息' : globalTurnBusy ? '为下一条待处理消息添加附件' : '上传图片或文件附件'"
            :disabled="!!pendingGlobalMissionInput"
          >
            <svg class="icon-attach" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
          <input 
            type="text" 
            id="globalChatInput"
            ref="chatInputElement"
            v-model="chatInput" 
            :placeholder="globalInputPlaceholder"
            @input="handleGlobalInput"
            @keydown="handleGlobalInputKeydown"
            @paste="handleAttachmentPaste"
          />
          <SlashCommandMenu
            :open="slash.open"
            :commands="slash.filtered"
            :active-index="slash.activeIndex"
            :loading="slash.loading"
            :query="slash.query"
            @select="slash.select"
          />
          <SlashCommandPanel :panel="slash.panel" @close="slash.closePanel" @action="slash.runPanelAction" />
          <SessionContextUsage
            :usage="globalContextUsage"
            :loading="globalContextLoading"
            :error="globalContextError"
            :compacting="globalContextCompacting"
            @refresh="refreshGlobalContextUsage"
          />
          <button
            class="send-btn"
            :class="{ 'pulse-glow': isSending && !isSteering, 'steering-submit': isSending }"
            @click="sendMessage"
            :disabled="!canSendGlobalMessage"
          >
            <svg class="icon-send" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            <span>{{ globalSendButtonLabel }}</span>
          </button>
        </div>
      </div>
    </div>

    <AgentCodeChangeDrawer
      :visible="codeChangeDrawer.visible"
      :title="codeChangeDrawer.title"
      :subtitle="codeChangeDrawer.subtitle"
      :project="codeChangeDrawer.project"
      :fileChanges="codeChangeDrawer.fileChanges"
      :files="codeChangeDrawer.files"
      :selectedPath="codeChangeDrawer.selectedPath"
      @close="closeCodeChangeDrawer"
      @open-changes="openGlobalChangesTab"
    />

    <!-- Lightbox 图片放大查看 -->
    <div v-if="zoomedImage" class="lightbox-overlay" @click="closeZoom">
      <img :src="zoomedImage" />
      <div class="close-lightbox">&times;</div>
    </div>
  </div>
</template>

<style scoped src="./GlobalAgentConversationStyles.css"></style>
<style scoped src="./GlobalAgentChromeStyles.css"></style>
