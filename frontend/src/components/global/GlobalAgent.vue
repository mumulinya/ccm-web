<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { BookOpen, Bot, Gauge, MoreHorizontal, RefreshCw } from '@lucide/vue'
import { toast, confirmDialog } from '../../utils/toast.js'
import TaskExperienceCard from '../tasks/TaskExperienceCard.vue'
import AgentCodeChangeDrawer from '../agents/AgentCodeChangeDrawer.vue'
import MessageNavigator from '../common/MessageNavigator.vue'
import ConversationTurnControls from '../common/ConversationTurnControls.vue'
import CommandResultCard from '../common/CommandResultCard.vue'
import SlashCommandMenu from '../common/SlashCommandMenu.vue'
import GlobalAgentSessionSidebar from './GlobalAgentSessionSidebar.vue'
import { useCodeChangeDrawer } from '../../composables/useCodeChangeDrawer.js'
import { useGlobalAgentAttachments } from '../../composables/useGlobalAgentAttachments.js'
import { useGlobalAgentControlCenter } from '../../composables/useGlobalAgentControlCenter.js'
import { globalMissionConversationState, upsertGlobalMissionConversationNotification, useGlobalAgentSessions } from '../../composables/useGlobalAgentSessions.js'
import { useMessageNavigation } from '../../composables/useMessageNavigation.js'
import { usePinnedScroll } from '../../composables/usePinnedScroll.js'
import { useConversationTurnControl } from '../../composables/useConversationTurnControl.js'
import { useSlashCommands } from '../../composables/useSlashCommands.js'
import { createSlashCommandClientActions } from '../../composables/useSlashCommandClientActions.js'
import { globalAgentRunTaskCard, globalMissionTaskCard } from '../../utils/taskExperience.js'
import { buildGlobalConversationKnowledgePayload, buildGlobalTaskKnowledgePayload, postKnowledgeCapture } from '../../utils/knowledgeCapture.js'
import { getDeliveryReport, getTechnicalDetailSections, normalizeTestAgentExecutionPlanSummary, sanitizeUserFacingAgentText, sanitizeUserFacingLegacyTerminology, sanitizeUserFacingPlanText, sanitizeUserFacingStructure } from '../../utils/agentDisplay.js'

const props = defineProps({ navigateTo: { type: Object, default: null } })
const emit = defineEmits(['switch-tab', 'set-navigation', 'navigated'])

const RANDOM_MUSIC_KEYWORD = '__random__'

const DEFAULT_WELCOME = {
  role: 'assistant',
  content: '你好！我是您的全局助手。我负责系统级入口、管理操作和任务路由；涉及开发落地时，会把需求交给协作群和项目执行成员一起完成。\n\n例如，您可以对我说：\n- 🎵 *"我想听 颜人中 的 晚安"* \n- 🐾 *"帮我把桌面宠物打开"* \n- 📂 *"帮我跳转到项目管理页面"* \n- 📋 *"创建一个开发任务：实现用户登录"* \n- 🛠️ *"帮我修改 smart-live-Cloud 项目，在登录接口加个日志"* \n- 💬 *"给 智评生活开发群安排一下：修改前端首页适配的 bug"*',
  timestamp: new Date().toISOString()
}

const isSidebarOpen = ref(window.innerWidth > 768)
const {
  codeChangeDrawer,
  openCodeChangeDrawer,
  closeCodeChangeDrawer,
} = useCodeChangeDrawer({ title: '全局 Agent 代码改动' })

const {
  sessions,
  currentSessionId,
  currentSession,
  messages,
  loadHistory,
  saveHistory,
  syncHistoryFromServer,
  createNewSession,
  selectSession,
  deleteSession,
  clearAllSessions,
} = useGlobalAgentSessions({
  defaultWelcome: DEFAULT_WELCOME,
  confirmDelete: (sessionName) => confirmDialog(`确定要删除会话「${sessionName}」吗？`),
  confirmClear: () => confirm('确定清空所有的全局助手会话吗？此操作无法撤销。'),
  onCreated: () => {
    toast.success('新建会话成功')
    scrollToBottom()
  },
  onSelected: () => {
    isPinnedToBottom.value = true
    scrollToBottom({ force: true })
    setTimeout(() => scrollToBottom({ force: true }), 60)
    setTimeout(() => scrollToBottom({ force: true }), 200)
  },
  onDeleted: () => {
    toast.success('会话已删除')
    scrollToBottom()
  },
  onCleared: () => {
    toast.success('所有会话历史已清空！')
    scrollToBottom()
  },
})

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
} = usePinnedScroll(chatBody, { observeRef: chatContentInner })
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
  removeSelectedFile,
  formatSize,
  zoomImage,
  closeZoom,
  toggleReport,
  isReportOpen,
} = useGlobalAgentAttachments({
  onToggleReport: () => nextTick(() => {
    scrollToBottom(true)
  })
})

const GLOBAL_SUPERVISION_CONTINUATION_PATTERN = /^(?:再)?(?:补充|继续(?:当前|这个|刚才|上面)?|接着(?:处理)?|目标调整|调整目标|改成|改为|换成|不要再|不再|先别|停止当前|忽略之前|重新规划|(?:这个任务|刚才的任务|上面的任务).{0,12}(?:继续|补充|调整|改|加|删|不要|停止|保留|只做))/i

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

const isExplicitSupervisionContinuation = (value = '') => GLOBAL_SUPERVISION_CONTINUATION_PATTERN.test(String(value || '').trim())
const isSupervisionContinuationInput = computed(() => {
  return !isSending.value
    && (Boolean(pendingGlobalMissionInput.value)
      || (!!currentSupervisedRunMessage.value && isExplicitSupervisionContinuation(chatInput.value)))
})

const activeGlobalExecutionConfirmed = ref(false)
const globalTurnBusy = computed(() => isSending.value || !!currentSupervisedRunMessage.value)
const globalActiveRunId = computed(() => activeGlobalRunId.value || currentSupervisedRunMessage.value?.agenticRun?.id || '')
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
  if (!target || target.tab !== 'global-agent' || !target.sessionId) return
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
  if (!globalTurnBusy.value) {
    if (pendingGlobalMissionInput.value) return '补充当前任务需要的信息，发送后会继续原任务...'
    if (pendingGlobalClarificationInput.value) return '回答主 Agent 刚才的问题，发送后会接着原请求继续...'
    return isSupervisionContinuationInput.value
      ? '补充要求或调整当前任务...'
      : '对全局助手说点什么... (例如: 帮我把桌宠打开)'
  }
  return globalTurnControl.mode.value === 'queue'
    ? '输入下一条消息，当前回复结束后会自动发送...'
    : '补充要求或调整当前目标...'
})

const globalSendButtonLabel = computed(() => {
  if (isSteering.value) return '接收中'
  if (globalTurnBusy.value) return globalTurnControl.mode.value === 'queue' ? '排队' : '引导'
  if (pendingGlobalMissionInput.value) return '提交并继续'
  if (pendingGlobalClarificationInput.value) return '提交补充'
  return isSupervisionContinuationInput.value ? '更新任务' : '发送'
})

const canSendGlobalMessage = computed(() => {
  if (isSteering.value) return false
  if (globalTurnBusy.value) return !!chatInput.value.trim()
  return !!chatInput.value.trim() || selectedFiles.value.length > 0
})

const runGlobalClientCommand = createSlashCommandClientActions({
  scope: 'global',
  messages: () => messages.value,
  sessions: () => sessions.value,
  currentSessionId: () => currentSessionId.value,
  context: () => ({ sessionId: currentSessionId.value }),
  statusSummary: () => `全局 Agent 当前会话“${currentSession.value?.name || '未选择'}”已加载 ${messages.value.length} 条消息。`,
  contextMetrics: () => ({ 会话: currentSession.value?.name || '未选择', 会话ID: currentSessionId.value, 全部会话: sessions.value.length }),
  exportFilename: () => `ccm-global-${currentSessionId.value || 'context'}`,
  newSession: async () => {
    const session = createNewSession()
    return { success: true, summary: '已新建全局 Agent 会话。', metrics: { 会话: session.name, 会话ID: session.id } }
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
    currentSession.value.messages.push({ role: 'assistant', type: 'command_result', commandResult: result, content: result.summary || '命令已执行', timestamp: new Date().toISOString() })
    saveHistory()
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

const globalRequestRetrySignature = ({ sessionId, message, files, clarificationRunId }) => JSON.stringify({
  sessionId,
  message,
  files: (files || []).map(file => [file.name, file.size]),
  clarificationRunId: clarificationRunId || '',
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

const visibleGlobalText = (value, fallback = '信息已整理。', max = 420) => (
  sanitizeUserFacingAgentText(value, fallback, max)
)
const visibleGlobalPlanText = (value, fallback = '计划信息已整理。', max = 420) => (
  sanitizeUserFacingPlanText(value, fallback, max)
)

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

const missionPollTimers = new Map()

const stopMissionTracking = (missionId) => {
  const timer = missionPollTimers.get(missionId)
  if (timer) clearInterval(timer)
  missionPollTimers.delete(missionId)
}

const formatMissionDeliveryReport = (report, fallback) => {
  if (!report) return fallback
  const deliveryReport = getDeliveryReport({ final_report: report, ...report })
  if (deliveryReport?.markdown || deliveryReport?.user_text) return deliveryReport.markdown || deliveryReport.user_text
  const visibleList = (values, empty) => {
    const rows = Array.isArray(values) ? values : values ? [values] : []
    return rows.length ? `\n- ${rows.map(item => visibleGlobalText(item, '信息已整理。', 260)).join('\n- ')}` : empty
  }
  const section = (label, values, empty) => `\n\n${label}：${visibleList(values, empty)}`
  return visibleGlobalText(report.summary || fallback, fallback, 420)
    + section('修改文件', report.files_modified, '无')
    + section('验证结果', report.verification_results, '无已执行验证证据')
    + section('合并结果', report.merge_commits, '无需独立 worktree 合并')
    + section('风险', report.risks, '未发现已知风险')
    + section('遗留项', report.remaining_items, '无')
}

const GLOBAL_RESULT_VISIBLE_FALLBACK = '我已整理这次处理结果，是否已经交付以任务卡验收和最终总结为准。'
const GLOBAL_STREAM_COMPLETED_FALLBACK = '这轮处理结果已整理，最终是否交付以总结和验收结果为准。'

const formatGlobalRunVisibleReply = (run = {}, fallback = GLOBAL_RESULT_VISIBLE_FALLBACK) => {
  const deliveryReport = getDeliveryReport(run)
  if (deliveryReport?.markdown || deliveryReport?.user_text) return deliveryReport.markdown || deliveryReport.user_text
  return sanitizeGlobalVisibleStreamText(run.final_reply || run.finalReply || fallback, fallback, 8000)
}

function getVisibleGlobalMessageContent(msg, fallback = '这条消息已整理。') {
  if (!msg) return ''
  if (msg.role === 'user') return String(msg.content || '')
  const structured = msg.agenticRun ? formatGlobalRunVisibleReply(msg.agenticRun, '') : ''
  return sanitizeGlobalVisibleStreamText(structured || msg.content || fallback, fallback, 8000)
}

const globalMissionNotificationContent = ({ state, mission, supervisor, run }) => {
  const title = visibleGlobalText(mission?.title || mission?.business_goal || '全局任务', '全局任务', 120)
  if (state === 'completed') {
    return run?.id
      ? formatGlobalRunVisibleReply(run, `「${title}」已通过全部交付验收。`)
      : formatMissionDeliveryReport(supervisor?.final_report, `「${title}」已通过全部交付验收。`)
  }
  if (state === 'cancelled') {
    return run?.id
      ? formatGlobalRunVisibleReply(run, `「${title}」已取消，后续执行和监督已经停止。`)
      : `「${title}」已取消，后续执行和监督已经停止。`
  }
  if (state === 'failed') {
    return run?.id
      ? formatGlobalRunVisibleReply(run, `「${title}」未完成，我已保留现有结果和失败原因。`)
      : `「${title}」未完成，我已保留现有结果和失败原因。`
  }
  if (state === 'waiting_user') {
    const reasons = (supervisor?.incidents || [])
      .filter(item => item?.type === 'waiting_user' && !item?.resolved_at && !item?.resolvedAt && item?.reason)
      .slice(-3)
      .map(item => visibleGlobalText(item.reason, '需要你补充一项信息。', 220))
    const fallback = [
      `「${title}」暂时停在需要你处理的位置。`,
      reasons.length ? `需要补充：${reasons.join('；')}` : '请查看任务卡中的待确认项；补充后我会继续执行、复核和总结。',
    ].join('\n')
    return run?.id ? formatGlobalRunVisibleReply(run, fallback) : fallback
  }
  return ''
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
      const message = session.messages.find(item =>
        (item.type === 'global_mission' && item.globalMission?.id === missionId) || item.agenticRun?.mission_id === missionId
      )
      if (!message) return
      message.globalMission = data.mission
      message.globalMissionChildren = (data.children || []).map(task => ({ task, target: task.mission_target || null }))
      message.globalMissionSupervisor = data.supervisor || message.globalMissionSupervisor
      let currentRun = message.agenticRun || null
      if (message.agenticRun?.id) {
        try {
          const runRes = await fetch('/api/global-agent/runs?id=' + encodeURIComponent(message.agenticRun.id))
          const runData = await runRes.json()
          if (runRes.ok && runData.run) {
            message.agenticRun = runData.run
            currentRun = runData.run
          }
        } catch {}
      }
      const state = globalMissionConversationState({ mission: data.mission, supervisor: data.supervisor, run: currentRun })
      if (state !== 'active') {
        const content = globalMissionNotificationContent({ state, mission: data.mission, supervisor: data.supervisor, run: currentRun })
        if (content) message.content = content
        const notification = upsertGlobalMissionConversationNotification(session.messages, {
          missionId,
          state,
          content,
          updatedAt: currentRun?.updated_at || data.supervisor?.updated_at || data.mission?.updated_at,
          extra: {
            globalMission: data.mission,
            globalMissionChildren: (data.children || []).map(task => ({ task, target: task.mission_target || null })),
            globalMissionSupervisor: data.supervisor || null,
          },
        })
        message.missionNotificationState = state
        if (notification.created && state === 'waiting_user') toast.info('有一项全局任务需要你补充信息')
        if (['completed', 'failed', 'cancelled'].includes(state)) {
          message.finalNotified = true
          message.terminalNotified = true
          stopMissionTracking(missionId)
        }
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
  if (summary.blocked > 0) return '待补齐'
  return '执行中'
}

const childStatusLabel = (child) => {
  if (child?.status === 'done' && child?.delivery_summary?.acceptance_gate_passed === true) return '验收通过'
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

const GLOBAL_STREAM_EVENT_LIMIT = 12

const compactStreamText = (value, max = 220) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text.length > max ? text.slice(0, max) + '...' : text
}

const compactVisibleStreamText = (value, fallback = '状态已更新。', max = 220) => visibleGlobalText(value, fallback, max)

const visibleGlobalStreamEventTitle = (value, fallback = '状态更新') => {
  const title = visibleGlobalPlanText(value, fallback, 120)
    .replace(/执行\s*工具/g, '执行动作')
    .replace(/工具\s*完成/g, '动作已返回')
    .replace(/完成\s*工具/g, '动作已返回')
    .replace(/工具\s*执行\s*完成/g, '动作已返回')
    .replace(/工具\s*失败/g, '执行遇到问题')
    .trim()
  return title || fallback
}

const visibleGlobalStreamEventText = (value, fallback = '状态已更新。', max = 220) => {
  const text = compactVisibleStreamText(value, fallback, max + 80)
    .replace(/执行\s*工具/g, '执行动作')
    .replace(/工具\s*执行\s*完成/g, '动作已返回')
    .replace(/工具\s*完成/g, '动作已返回')
    .replace(/完成\s*工具/g, '动作已返回')
    .replace(/已完成[，,]\s*正在检查结果/g, '已返回结果，我正在检查')
    .replace(/执行完成[，,]\s*正在检查结果/g, '已返回结果，我正在检查')
    .trim()
  return text.length > max ? `${text.slice(0, max)}...` : (text || fallback)
}

const globalDispatchLaunchSummary = (msg = {}) => {
  const displayStream = msg.display_stream
    || msg.displayStream
    || msg.agenticRun?.display_stream
    || msg.agenticRun?.displayStream
    || msg.agenticRun?.final_report?.display_stream
    || msg.agenticRun?.finalReport?.displayStream
    || null
  const summary = msg.dispatch_launch_summary
    || msg.dispatchLaunchSummary
    || displayStream?.dispatch_launch_summary
    || displayStream?.dispatchLaunchSummary
    || null
  const visible = sanitizeUserFacingStructure(summary, {
    fallback: '派发进度已整理，技术细节已放入技术详情。',
    max: 260,
  })
  if (!visible) return visible
  return {
    ...visible,
    title: visible.title ? visibleGlobalPlanText(visible.title, '已安排的工作', 120) : visible.title,
    headline: visible.headline ? visibleGlobalPlanText(visible.headline, '安排进度已整理。', 260) : visible.headline,
    next_action: visible.next_action ? visibleGlobalPlanText(visible.next_action, '等待执行结果。', 220) : visible.next_action,
    nextAction: visible.nextAction ? visibleGlobalPlanText(visible.nextAction, '等待执行结果。', 220) : visible.nextAction,
  }
}

const globalDispatchLaunchRows = (msg = {}) => {
  const rows = globalDispatchLaunchSummary(msg)?.rows
  return Array.isArray(rows) ? rows
    .filter(row => row && typeof row === 'object')
    .map(row => ({
      ...row,
      role: visibleGlobalPlanText(row.role || '执行成员', '执行成员', 80),
      task: row.task ? visibleGlobalPlanText(row.task, '执行任务已整理。', 220) : row.task,
      reason: row.reason ? visibleGlobalPlanText(row.reason, '安排原因已整理。', 180) : row.reason,
    })) : []
}

const globalDispatchRowClass = (row = {}) => {
  const status = String(row.status || row.state || row.status_label || '').toLowerCase()
  if (/fail|error|blocked|失败|阻塞|异常/.test(status)) return 'error'
  if (/done|complete|completed|ok|success|通过|完成/.test(status)) return 'ok'
  if (/wait|pending|queue|等待|排队/.test(status)) return 'waiting'
  return 'running'
}

const GLOBAL_TODO_DONE_STATUSES = new Set(['done', 'completed', 'complete', 'success', 'succeeded', 'ok', 'passed'])
const GLOBAL_TODO_ACTIVE_STATUSES = new Set([
  'in_progress',
  'active',
  'running',
  'reviewing',
  'reworking',
  'needs_confirmation',
  'waiting_confirmation',
  'needs_user',
  'waiting_clarification',
  'blocked',
  'failed',
  'error',
])

const globalTodoStatusLabel = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (['failed', 'error'].includes(normalized)) return '失败'
  if (normalized === 'blocked') return '待补齐'
  if (['needs_user', 'waiting_user', 'waiting_clarification'].includes(normalized)) return '等待补充'
  if (['needs_confirmation', 'waiting_confirmation'].includes(normalized)) return '等待确认'
  if (normalized === 'reviewing') return '验收中'
  if (normalized === 'reworking') return '返工中'
  if (GLOBAL_TODO_DONE_STATUSES.has(normalized)) return '完成'
  if (['pending', 'queued', 'waiting'].includes(normalized)) return '等待'
  return '进行中'
}

const globalStreamTodoTone = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (['failed', 'error'].includes(normalized)) return 'failed'
  if (['blocked', 'needs_confirmation', 'waiting_confirmation', 'needs_user', 'waiting_clarification'].includes(normalized)) return 'waiting'
  if (GLOBAL_TODO_DONE_STATUSES.has(normalized)) return 'done'
  return 'active'
}

const globalStreamCurrentTodoTone = (summary = {}) => globalStreamTodoTone(summary.status)
const isGlobalStreamSupervising = (msg = {}) => String(msg.agenticRun?.status || '').toLowerCase() === 'supervising'
const GLOBAL_EXECUTION_STREAM_EVENTS = new Set([
  'tool_started',
  'tool_completed',
  'tool_failed',
  'tool_validation_failed',
  'clarification_required',
  'confirmation_required',
  'dispatch_launch_summary',
  'plan_mode_ready',
  'supervising',
  'test_agent_execution_plan_ready',
  'test_agent_review_ready',
  'post_review_spot_check_ready',
])

const globalEventConfirmsExecution = (event = {}) => {
  const intent = event.step?.decision?.intent
    || event.decision?.intent
    || event.run?.decision_summary?.intent
    || event.run?.decisionSummary?.intent
    || null
  const state = String(event.step?.state || event.state || '').toLowerCase()
  return intent?.action_required === true
    || ['execute', 'needs_confirmation'].includes(state)
    || !!(event.tool?.name || event.pending_tool?.name || event.step?.tool?.name)
    || !!(event.mission_id || event.missionId || event.run?.mission_id || event.run?.missionId)
    || GLOBAL_EXECUTION_STREAM_EVENTS.has(String(event.type || ''))
}

const globalExecutionIntentConfirmed = (msg = {}) => {
  if (msg.executionIntentConfirmed === true) return true
  const run = msg.agenticRun || msg.agentic_run || {}
  const intent = run.decision_summary?.intent || run.decisionSummary?.intent || null
  if (intent?.action_required === true || Number(run.tool_calls || run.toolCalls || 0) > 0) return true
  if (run.mission_id || run.missionId || run.supervisor_id || run.supervisorId || run.pending_tool || run.pendingTool) return true
  if (getGlobalPlanMode(msg) || getGlobalTodoPlan(msg) || globalDispatchLaunchRows(msg).length || globalStreamToolUseSummary(msg)) return true
  return (msg.streamEvents || []).some(event => GLOBAL_EXECUTION_STREAM_EVENTS.has(String(event.eventType || '')))
}
const globalStreamHeaderTitle = (msg = {}) => isGlobalStreamSupervising(msg)
  ? '持续跟进中'
  : msg.streaming
    ? '我正在处理'
    : '处理过程'
const globalStreamHeaderSubtitle = (msg = {}) => isGlobalStreamSupervising(msg)
  ? '正在持续跟踪执行、验收和最终总结'
  : msg.streaming
    ? '正在实时更新理解、规划和工具执行状态'
    : '本轮过程已结束'

const getGlobalDisplayStream = (msg = {}) => msg.display_stream
  || msg.displayStream
  || msg.agenticRun?.display_stream
  || msg.agenticRun?.displayStream
  || msg.agenticRun?.final_report?.display_stream
  || msg.agenticRun?.finalReport?.displayStream
  || null

const getGlobalPlanMode = (msg = {}) => msg.plan_mode
  || msg.planMode
  || msg.agenticRun?.plan_mode
  || msg.agenticRun?.planMode
  || getGlobalDisplayStream(msg)?.plan_mode
  || getGlobalDisplayStream(msg)?.planMode
  || null

const getGlobalTodoPlan = (msg = {}) => {
  const displayStream = getGlobalDisplayStream(msg)
  const mainDecision = msg.main_agent_decision
    || msg.mainAgentDecision
    || msg.agenticRun?.main_agent_decision
    || msg.agenticRun?.mainAgentDecision
    || displayStream?.main_agent_decision
    || displayStream?.mainAgentDecision
    || displayStream?.workchain?.main_agent_decision
    || displayStream?.workchain?.mainAgentDecision
    || msg.agenticRun?.workchain?.main_agent_decision
    || msg.agenticRun?.workchain?.mainAgentDecision
    || null
  return mainDecision?.todo_plan
    || mainDecision?.todoPlan
    || msg.todo_plan
    || msg.todoPlan
    || msg.agenticRun?.todo_plan
    || msg.agenticRun?.todoPlan
    || displayStream?.todo_plan
    || displayStream?.todoPlan
    || displayStream?.workchain?.todo_plan
    || displayStream?.workchain?.todoPlan
    || null
}

const normalizeGlobalTodoStep = (step = {}, index = 0) => {
  if (!step || typeof step !== 'object') return null
  const fallbackLabel = `步骤 ${index + 1}`
  const label = visibleGlobalPlanText(
    step.label || step.title || step.text || step.content || step.name || fallbackLabel,
    fallbackLabel,
    140
  )
  const activeForm = visibleGlobalPlanText(step.active_form || step.activeForm || label, label, 140)
  const detailSource = step.detail || step.description || step.summary || step.reason || ''
  return {
    id: step.id || step.key || `global-todo-step-${index}`,
    label,
    active_form: activeForm,
    detail: detailSource ? visibleGlobalPlanText(detailSource, '当前步骤详情已整理。', 260) : '',
    needs_action: step.needs_action || step.needsAction ? visibleGlobalPlanText(step.needs_action || step.needsAction, '', 220) : '',
    needsAction: step.needs_action || step.needsAction ? visibleGlobalPlanText(step.needs_action || step.needsAction, '', 220) : '',
    status: String(step.status || step.state || (index === 0 ? 'in_progress' : 'pending')).toLowerCase(),
  }
}

const globalTodoTextNeedsUserAction = (value = '', status = '') => {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return false
  const normalizedStatus = String(status || '').toLowerCase()
  if (/需要你|等你|等待你|请你|请确认|确认(?:是否|计划|范围|授权|影响|执行|操作)|补充(?:目标|范围|信息|材料|上下文|账号|环境变量|验收标准|需求)|提供(?:目标|信息|材料|凭证|截图|账号|环境变量)|选择|授权|回复|上传|输入|填写|处理\s*\d+\s*个待确认问答|人工确认|待确认问答|用户确认|是否允许|是否继续|允许继续|确认并继续/i.test(text)) return true
  if (['needs_user', 'waiting_user', 'needs_confirmation', 'waiting_confirmation'].includes(normalizedStatus) && /确认(?:计划|范围|授权|执行|操作)|补充(?:目标|范围|信息|材料|上下文|账号|环境变量|验收标准|需求)|提供(?:目标|信息|材料|凭证|截图|账号|环境变量)|回复|授权|选择|上传|输入|填写|处理\s*\d+\s*个待确认问答/.test(text)) return true
  return false
}

const buildGlobalDispatchTodoSteps = (msg = {}) => {
  const summary = globalDispatchLaunchSummary(msg)
  const rows = globalDispatchLaunchRows(msg)
  if (!rows.length) return null
  const targets = rows
    .map(row => [row.role || '执行成员', row.agent].filter(Boolean).join(' · '))
    .filter(Boolean)
    .slice(0, 4)
    .join('、')
  const terminalStatus = String(summary?.status || summary?.phase || '').toLowerCase()
  const trackStatus = ['failed', 'error', 'cancelled', 'canceled'].includes(terminalStatus)
    ? 'failed'
    : GLOBAL_TODO_DONE_STATUSES.has(terminalStatus)
      ? 'completed'
      : 'in_progress'
  return {
    title: summary?.title || '全局派发进度',
    next_action: summary?.next_action || '等待执行目标更新结果，我会继续验收并总结。',
    steps: [
      {
        id: 'global-dispatch-understand',
        label: '理解并整理需求',
        detail: summary?.headline || '已明确这次需求需要交给执行目标处理。',
        status: 'completed',
      },
      {
        id: 'global-dispatch-launch',
        label: '派发执行目标',
        detail: targets ? `已派发给：${targets}。` : '已把任务交给执行目标。',
        status: 'completed',
      },
      {
        id: 'global-dispatch-track',
        label: '跟踪执行、验收和最终总结',
        active_form: '正在跟踪执行和验收结果',
        detail: summary?.next_action || '等待执行目标更新任务卡，我会汇总最终结果。',
        status: trackStatus,
      },
    ],
  }
}

const GLOBAL_TODO_VERIFICATION_PATTERN = /验证|测试|验收|复核|运行检查|执行检查|检查(?:命令|结果|通过|失败)|verify|verification|test|qa|typecheck|lint|build|check/i
const globalTodoHasVerificationStep = (step = {}) => GLOBAL_TODO_VERIFICATION_PATTERN.test([
  step.label,
  step.title,
  step.detail,
  step.active_form,
  step.activeForm,
  step.content,
].filter(Boolean).join(' '))
const globalTodoDisplayPolicy = (source = {}) => ({
  ...(source?.display || {}),
  ...(source?.display_policy || source?.displayPolicy || {}),
})
const globalTodoHasVerificationEvidence = (source = {}, msg = {}) => {
  const run = msg.agenticRun || {}
  const finalReport = run.final_report || run.finalReport || {}
  const deliveryReport = run.final_delivery_report || run.finalDeliveryReport || finalReport.delivery_report || finalReport.deliveryReport || {}
  const values = [
    source.verification,
    source.verification_executed,
    source.verificationExecuted,
    source.acceptance,
    source.independent_review,
    source.independentReview,
    run.verification,
    finalReport.verification,
    finalReport.verification_executed,
    finalReport.verificationExecuted,
    deliveryReport.verification,
    deliveryReport.acceptance,
    run.independent_review,
    run.independentReview,
    run.independent_review_summary,
    run.independentReviewSummary,
  ]
  return values.some(value => Array.isArray(value) ? value.filter(Boolean).length > 0 : Boolean(value))
    || run.acceptance_gate_passed === true
    || finalReport.acceptance_gate_passed === true
    || finalReport.acceptanceGatePassed === true
    || deliveryReport.acceptance_gate_passed === true
    || deliveryReport.acceptanceGatePassed === true
}
const buildGlobalTodoVerificationReminder = (source = {}, steps = [], msg = {}) => {
  const raw = source.verification_reminder
    || source.verificationReminder
    || msg.verification_reminder
    || msg.verificationReminder
    || msg.agenticRun?.verification_reminder
    || msg.agenticRun?.verificationReminder
    || null
  const legacyNudge = source.verification_nudge === true || source.verificationNudge === true
  const terminalStatus = String(msg.agenticRun?.status || msg.status || '').toLowerCase()
  const allDone = steps.length > 0 && steps.every(step => GLOBAL_TODO_DONE_STATUSES.has(String(step?.status || '').toLowerCase()))
  const hasVerificationEvidence = steps.some(globalTodoHasVerificationStep) || globalTodoHasVerificationEvidence(source, msg)
  const fallback = steps.length >= 3
    && !hasVerificationEvidence
    && (!GLOBAL_TODO_DONE_STATUSES.has(terminalStatus) || allDone)
    ? {
        schema: 'ccm-main-agent-plan-verification-reminder-v1',
        status: 'needs_verification_step',
        title: '还缺验收步骤',
        headline: '完成前需要补一项真实验证，或者说明为什么当前不能验证。',
        next_action: '我会把验收补进计划，再继续跟踪和总结。',
      }
    : null
  const reminder = raw || (legacyNudge ? fallback || {
    schema: 'ccm-main-agent-plan-verification-reminder-v1',
    status: 'needs_verification_step',
    title: '还缺验收步骤',
    headline: '完成前需要补一项真实验证，或者说明为什么当前不能验证。',
    next_action: '我会把验收补进计划，再继续跟踪和总结。',
  } : fallback)
  const policy = reminder?.display_policy || reminder?.displayPolicy || {}
  if (!reminder || policy.user_visible === false) return null
  return sanitizeUserFacingStructure(reminder, {
    fallback: '完成前需要补一项真实验证，或者说明为什么当前不能验证。',
    max: 260,
  })
}

const shouldArchiveGlobalCompletedTodo = (source = {}, steps = [], msg = {}, verificationReminder = null) => {
  if (verificationReminder) return false
  const allDone = steps.length > 0 && steps.every(step => GLOBAL_TODO_DONE_STATUSES.has(String(step?.status || '').toLowerCase()))
  if (!allDone) return false
  const policy = globalTodoDisplayPolicy(source)
  const archiveByPolicy = policy.archive_completed_todo === true
    || policy.archiveCompletedTodo === true
    || policy.archived_when_complete === true
    || policy.archivedWhenComplete === true
    || policy.visible_when_completed === false
    || policy.visibleWhenCompleted === false
  const terminalStatus = String(msg.agenticRun?.status || msg.status || '').toLowerCase()
  const terminal = msg.streaming === false || GLOBAL_TODO_DONE_STATUSES.has(terminalStatus)
  const hasVerificationEvidence = steps.some(globalTodoHasVerificationStep) || globalTodoHasVerificationEvidence(source, msg)
  return archiveByPolicy || (terminal && hasVerificationEvidence)
}

const buildGlobalStreamCurrentTodoSummary = (msg = {}) => {
  if (!msg || msg.role !== 'assistant' || msg.type !== 'global_stream') return null
  const todoPlan = getGlobalTodoPlan(msg)
  const planMode = getGlobalPlanMode(msg)
  const dispatchTodo = buildGlobalDispatchTodoSteps(msg)
  const planModeWaitingConfirmation = planMode
    && planMode.requires_confirmation !== false
    && /await|waiting|pending|confirm|确认|授权/i.test(String(planMode.confirmation_status || planMode.confirmationStatus || ''))
  const planModeSteps = Array.isArray(planMode?.steps)
    ? planMode.steps.map(step => {
        const stepStatus = String(step?.status || step?.state || '').toLowerCase()
        if (GLOBAL_TODO_DONE_STATUSES.has(stepStatus)) return step
        const stepText = `${step?.label || ''} ${step?.title || ''} ${step?.detail || ''}`
        if (planModeWaitingConfirmation && /等待|确认|授权/.test(stepText)) return { ...step, status: 'needs_confirmation' }
        return step
      })
    : []
  const source = Array.isArray(todoPlan?.steps) && todoPlan.steps.length
    ? todoPlan
    : planModeSteps.length
      ? {
          title: planMode.title || '执行前计划',
          next_action: planMode.next_step || planMode.nextAction || planMode.next_action || '',
          steps: planModeSteps,
        }
      : dispatchTodo
  if (!source?.steps?.length) return null
  const steps = source.steps.map(normalizeGlobalTodoStep).filter(Boolean)
  if (!steps.length) return null
  const verificationReminder = buildGlobalTodoVerificationReminder(source, steps, msg)
  if (shouldArchiveGlobalCompletedTodo(source, steps, msg, verificationReminder)) return null
  const activeStep = steps.find(step => GLOBAL_TODO_ACTIVE_STATUSES.has(step.status))
    || steps.find(step => !GLOBAL_TODO_DONE_STATUSES.has(step.status))
    || steps[steps.length - 1]
  const completedCount = steps.filter(step => GLOBAL_TODO_DONE_STATUSES.has(step.status)).length
  const nextAction = source.next_action || source.nextAction || source.next_step || source.nextStep || ''
  const recentStep = [...steps].reverse().find(step => GLOBAL_TODO_DONE_STATUSES.has(step.status) && step !== activeStep)
  const recentAction = visibleGlobalPlanText(
    recentStep?.active_form || recentStep?.activeForm || recentStep?.label || recentStep?.content || '',
    '',
    180,
  )
  const rawNeedsAction = activeStep.needs_action || activeStep.needsAction || source.needs_action || source.needsAction || ''
  const needsActionCandidate = globalTodoTextNeedsUserAction(rawNeedsAction, activeStep.status)
    ? rawNeedsAction
    : globalTodoTextNeedsUserAction(nextAction, activeStep.status)
      ? nextAction
      : ''
  const needsAction = visibleGlobalPlanText(needsActionCandidate, '', 220)
  return {
    schema: 'ccm-global-main-agent-current-todo-v1',
    title: visibleGlobalPlanText(source.title || '当前步骤', '当前步骤', 120),
    task_id: msg.agenticRun?.id || msg.agenticRun?.mission_id || '',
    step_id: activeStep.id,
    label: activeStep.label,
    active_form: activeStep.active_form || activeStep.label,
    detail: activeStep.detail,
    recent_action: recentAction,
    recentAction,
    needs_action: needsAction,
    needsAction,
    status: activeStep.status,
    status_label: globalTodoStatusLabel(activeStep.status),
    progress_label: `${completedCount}/${steps.length}`,
    completed_count: completedCount,
    total_count: steps.length,
    next_action: nextAction ? visibleGlobalPlanText(nextAction, '我会继续执行并在完成后总结。', 260) : '',
    verification_reminder: verificationReminder,
    verificationReminder,
    display_policy: {
      user_text_first: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      show_for_ordinary_conversation: false,
    },
  }
}

const globalStreamProgressRefreshSummary = (msg = {}) => {
  const displayStream = getGlobalDisplayStream(msg)
  const summary = msg.progress_refresh_summary
    || msg.progressRefreshSummary
    || displayStream?.progress_refresh_summary
    || displayStream?.progressRefreshSummary
    || msg.agenticRun?.progress_refresh_summary
    || msg.agenticRun?.progressRefreshSummary
    || msg.agenticRun?.final_report?.progress_refresh_summary
    || msg.agenticRun?.finalReport?.progressRefreshSummary
    || null
  const policy = summary?.display_policy || summary?.displayPolicy || {}
  if (!summary || policy.user_visible === false) return null
  return sanitizeUserFacingStructure(summary, {
    fallback: '进度刷新提醒已整理，技术细节已放入技术详情。',
    max: 260,
  })
}

const globalStreamProgressRefreshTone = (summary = {}) => {
  const status = String(summary.status || '').toLowerCase()
  if (['failed', 'error'].includes(status)) return 'failed'
  if (['needs_refresh', 'stalled', 'blocked', 'waiting'].includes(status)) return 'waiting'
  return 'active'
}

const globalStreamProgressRefreshItems = (summary = {}) => {
  const items = summary.review_items || summary.reviewItems || []
  return Array.isArray(items)
    ? items.map(item => visibleGlobalText(item, '接续要点已整理。', 180)).filter(Boolean).slice(0, 5)
    : []
}

const globalToolLabels = {
  inspect_system: '读取系统状态',
  list_projects: '读取项目列表',
  inspect_project: '读取项目上下文',
  list_groups: '读取群聊列表',
  list_tasks: '读取任务列表',
  list_cron: '读取定时任务',
  query_knowledge: '查询知识库',
  query_global_memory: '查询全局记忆',
  manage_global_memory: '管理全局记忆',
  inspect_mission: '查询全局任务',
  inspect_supervision: '查询持续跟进状态',
  orchestrate_development: '创建跨项目开发任务',
  manage_supervision: '管理持续跟进',
  create_task: '创建开发任务',
  send_project_cmd: '发送项目执行指令',
  send_group_cmd: '发送协作群指令',
  manage_cron: '管理定时任务',
  manage_group: '管理群聊',
  manage_project: '管理项目',
  manage_task: '管理任务',
  manage_tool: '管理工具',
  git_review: '审查代码变更',
  git_commit: '提交代码',
  create_template: '创建模板',
  play_music: '播放音乐',
  toggle_pet: '控制桌面宠物',
  navigate: '切换页面'
}

const getGlobalToolLabel = (name) => globalToolLabels[String(name || '').trim()] || String(name || '工具操作')

const globalToolStatusLabel = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (['done', 'completed', 'ok', 'success'].includes(normalized)) return '已返回'
  if (['failed', 'error', 'blocked'].includes(normalized)) return '待排查'
  return '进行中'
}

const compactGlobalToolLabel = (value, fallback = '执行动作') => {
  const text = visibleGlobalPlanText(value, fallback, 120)
    .replace(/^正在/, '')
    .replace(/已完成.*$/, '')
    .replace(/已返回.*$/, '')
    .replace(/执行遇到问题.*$/, '')
    .replace(/[。.]$/, '')
    .trim()
  return text || fallback
}

const buildGlobalStreamToolUseSummary = (rows = []) => {
  const normalizedRows = rows
    .filter(row => row && typeof row === 'object')
    .map((row, index) => ({
      id: row.id || `global-tool-row-${index}`,
      label: compactGlobalToolLabel(row.label || row.text || row.detail || '', '执行动作'),
      status: String(row.status || 'running').toLowerCase(),
      detail: row.detail ? visibleGlobalPlanText(row.detail, '执行动作已更新。', 180) : '',
    }))
    .filter(row => row.label)
  const visibleRows = [...normalizedRows.reduce((map, row) => map.set(row.label, row), new Map()).values()]
  if (!visibleRows.length) return null
  const runningCount = visibleRows.filter(row => ['running', 'in_progress', 'active'].includes(row.status)).length
  const completedCount = visibleRows.filter(row => ['done', 'completed', 'ok', 'success'].includes(row.status)).length
  const failedCount = visibleRows.filter(row => ['failed', 'error', 'blocked'].includes(row.status)).length
  const latest = visibleRows[visibleRows.length - 1]
  const headline = failedCount
    ? `${failedCount} 项动作待排查`
    : runningCount
      ? `正在执行 ${runningCount} 项动作`
      : `已返回 ${completedCount || visibleRows.length} 项动作，正在检查结果`
  const latestLabel = latest.status === 'done' || latest.status === 'completed'
    ? `${latest.label}已返回，等待检查`
    : ['failed', 'error', 'blocked'].includes(latest.status)
      ? `${latest.label}待排查`
      : `正在${latest.label}`
  return {
    schema: 'ccm-global-main-agent-tool-summary-v1',
    title: '动作摘要',
    headline,
    latest_label: latestLabel,
    running_count: runningCount,
    completed_count: completedCount,
    failed_count: failedCount,
    total_count: visibleRows.length,
    rows: visibleRows.slice(-4).map(row => ({
      ...row,
      status_label: globalToolStatusLabel(row.status),
    })),
    display_policy: {
      user_text_first: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      show_for_ordinary_conversation: false,
    },
  }
}

const globalToolSummaryRowsFromEvents = (streamEvents = []) => {
  const rows = []
  const legacyToolStartedTitle = `执行${'工具'}`
  const legacyToolCompletedTitle = `${'工具'}完成`
  for (const event of Array.isArray(streamEvents) ? streamEvents : []) {
    const title = visibleGlobalStreamEventTitle(event?.title || '', '')
    if (!title.includes('执行动作') && !title.includes('动作已返回') && title !== legacyToolStartedTitle && title !== legacyToolCompletedTitle && !title.includes('执行遇到问题')) continue
    const text = visibleGlobalStreamEventText(event.text || '', '执行动作已更新。', 180)
    const status = title.includes('返回')
      ? 'done'
      : title.includes('问题')
        ? 'failed'
        : 'running'
    rows.push({
      id: `${title}:${text}`,
      label: compactGlobalToolLabel(text, title.includes('返回') ? '已返回动作' : '执行动作'),
      status,
      detail: text,
    })
  }
  return rows
}

const globalStreamToolUseSummary = (msg = {}) => {
  const existing = msg.global_tool_use_summary
    || msg.globalToolUseSummary
    || msg.tool_use_summary
    || msg.toolUseSummary
    || null
  const normalizedExisting = existing?.tool_summary && !existing?.headline
    ? {
        schema: 'ccm-global-main-agent-tool-summary-v1',
        title: '动作摘要',
        headline: existing.tool_summary,
        latest_label: existing.tool_summary,
        running_count: 0,
        completed_count: 0,
        failed_count: 0,
        total_count: 0,
        display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
      }
    : existing
  const summary = normalizedExisting || buildGlobalStreamToolUseSummary(globalToolSummaryRowsFromEvents(msg.streamEvents))
  return sanitizeUserFacingStructure(summary, {
    fallback: '动作摘要已整理，技术细节已放入技术详情。',
    max: 260,
  })
}

const updateGlobalStreamToolUseSummary = (agentMsg, event = {}) => {
  const type = String(event.type || '')
  if (!['tool_started', 'tool_completed', 'tool_failed', 'tool_validation_failed'].includes(type)) return
  const tool = event.tool || event.pending_tool || event.step?.tool || {}
  const toolName = tool.name || event.toolName || event.step?.toolName || ''
  const label = getGlobalToolLabel(toolName)
  const status = type === 'tool_completed'
    ? 'done'
    : (type === 'tool_failed' || type === 'tool_validation_failed')
      ? 'failed'
      : 'running'
  const key = tool.signature || tool.id || event.tool_call_id || event.toolUseId || toolName || label
  const previous = agentMsg.global_tool_use_summary || agentMsg.globalToolUseSummary || {}
  const rows = Array.isArray(previous.rows) ? previous.rows : []
  const nextRows = [
    ...rows.filter(row => (row.id || row.label) !== key),
    {
      id: key,
      label,
      status,
      detail: type === 'tool_completed'
        ? `${label}已返回结果，我正在检查。`
        : status === 'failed'
          ? `${label}执行遇到问题，我正在重新判断下一步。`
          : `正在${label}。`,
    },
  ].slice(-8)
  const summary = buildGlobalStreamToolUseSummary(nextRows)
  if (!summary) return
  agentMsg.global_tool_use_summary = summary
  agentMsg.globalToolUseSummary = summary
}

const getGlobalTestAgentExecutionPlanPayload = (source = {}) => {
  const plan = source.test_agent_execution_plan
    || source.testAgentExecutionPlan
    || source.technical?.test_agent_execution_plan
    || source.technical?.testAgentExecutionPlan
    || null
  const detail = source.detail || source.message || source.text || ''
  const summary = normalizeTestAgentExecutionPlanSummary(
    plan,
    source.test_agent_execution_plan_summary || source.testAgentExecutionPlanSummary || detail || null,
    detail
  )
  if (!plan && !summary) return null
  return { plan, summary, detail }
}

const getGlobalTestAgentReviewPayload = (source = {}) => {
  const summary = source.test_agent_review_summary
    || source.testAgentReviewSummary
    || source.independent_review_summary
    || source.independentReviewSummary
    || null
  const rows = Array.isArray(source.independent_review)
    ? source.independent_review
    : Array.isArray(source.independentReview)
      ? source.independentReview
      : []
  const postReviewSpotCheckSummary = source.post_review_spot_check_summary
    || source.postReviewSpotCheckSummary
    || source.technical?.post_review_spot_check_summary
    || source.technical?.postReviewSpotCheckSummary
    || null
  const postReviewSpotCheck = source.post_review_spot_check
    || source.postReviewSpotCheck
    || source.technical?.post_review_spot_check
    || source.technical?.postReviewSpotCheck
    || null
  if (!summary && !rows.length && !postReviewSpotCheckSummary && !postReviewSpotCheck) return null
  return {
    summary: summary ? sanitizeUserFacingStructure(summary, { fallback: 'TestAgent 独立复核结论已整理。', max: 420 }) : null,
    rows: sanitizeUserFacingStructure(rows, { fallback: 'TestAgent 独立复核证据已整理。', max: 240 }),
    report: source.test_agent_report || source.testAgentReport || source.technical?.test_agent_report || source.technical?.testAgentReport || null,
    postReviewSpotCheckSummary: postReviewSpotCheckSummary
      ? sanitizeUserFacingStructure(postReviewSpotCheckSummary, { fallback: '完成前抽查结论已整理。', max: 420 })
      : null,
    postReviewSpotCheck,
    detail: source.detail || source.message || source.text || '',
  }
}

const mergeGlobalRunTestAgentExecutionPlan = (run = {}, previousRun = {}) => {
  const previousPlan = previousRun.test_agent_execution_plan || previousRun.testAgentExecutionPlan || null
  const previousSummary = previousRun.test_agent_execution_plan_summary || previousRun.testAgentExecutionPlanSummary || null
  const previousReviewSummary = previousRun.test_agent_review_summary || previousRun.testAgentReviewSummary || previousRun.independent_review_summary || previousRun.independentReviewSummary || null
  const previousReviewRows = Array.isArray(previousRun.independent_review) ? previousRun.independent_review : Array.isArray(previousRun.independentReview) ? previousRun.independentReview : []
  const previousReport = previousRun.test_agent_report || previousRun.testAgentReport || null
  const previousPostReviewSpotCheckSummary = previousRun.post_review_spot_check_summary
    || previousRun.postReviewSpotCheckSummary
    || previousRun.technical?.post_review_spot_check_summary
    || previousRun.technical?.postReviewSpotCheckSummary
    || null
  const previousPostReviewSpotCheck = previousRun.post_review_spot_check
    || previousRun.postReviewSpotCheck
    || previousRun.technical?.post_review_spot_check
    || previousRun.technical?.postReviewSpotCheck
    || null
  const next = { ...run }
  if (!next.test_agent_execution_plan && !next.testAgentExecutionPlan) {
    next.test_agent_execution_plan = previousPlan
    next.testAgentExecutionPlan = previousPlan
  }
  if (!next.test_agent_execution_plan_summary && !next.testAgentExecutionPlanSummary) {
    next.test_agent_execution_plan_summary = previousSummary
    next.testAgentExecutionPlanSummary = previousSummary
  }
  if (!next.test_agent_execution_plan_detail && !next.testAgentExecutionPlanDetail) {
    next.test_agent_execution_plan_detail = previousRun.test_agent_execution_plan_detail || previousRun.testAgentExecutionPlanDetail || ''
    next.testAgentExecutionPlanDetail = previousRun.testAgentExecutionPlanDetail || previousRun.test_agent_execution_plan_detail || ''
  }
  if (!next.test_agent_review_summary && !next.testAgentReviewSummary && !next.independent_review_summary && !next.independentReviewSummary && previousReviewSummary) {
    next.test_agent_review_summary = previousReviewSummary
    next.testAgentReviewSummary = previousReviewSummary
    next.independent_review_summary = previousReviewSummary
    next.independentReviewSummary = previousReviewSummary
  }
  if (!next.independent_review && !next.independentReview && previousReviewRows.length) {
    next.independent_review = previousReviewRows
    next.independentReview = previousReviewRows
  }
  if (!next.test_agent_report && !next.testAgentReport && previousReport) {
    next.test_agent_report = previousReport
    next.testAgentReport = previousReport
  }
  const postReviewSpotCheckSummary = next.post_review_spot_check_summary
    || next.postReviewSpotCheckSummary
    || next.technical?.post_review_spot_check_summary
    || next.technical?.postReviewSpotCheckSummary
    || previousPostReviewSpotCheckSummary
  if (postReviewSpotCheckSummary) {
    next.post_review_spot_check_summary = postReviewSpotCheckSummary
    next.postReviewSpotCheckSummary = postReviewSpotCheckSummary
  }
  const postReviewSpotCheck = next.post_review_spot_check
    || next.postReviewSpotCheck
    || next.technical?.post_review_spot_check
    || next.technical?.postReviewSpotCheck
    || previousPostReviewSpotCheck
  if (postReviewSpotCheck) {
    next.post_review_spot_check = postReviewSpotCheck
    next.postReviewSpotCheck = postReviewSpotCheck
  }
  return next
}

const applyGlobalTestAgentExecutionPlanReady = (agentMsg, event = {}) => {
  const payload = getGlobalTestAgentExecutionPlanPayload(event)
  if (!payload?.summary) return null
  const previousRun = agentMsg.agenticRun || {}
  const userMessage = previousRun.user_message || agentMsg.user_message || agentMsg.userMessage || ''
  const run = mergeGlobalRunTestAgentExecutionPlan({
    ...previousRun,
    id: previousRun.id || event.run_id || event.runId || `global-test-agent-plan-${event.task_id || event.taskId || Date.now()}`,
    trace_id: previousRun.trace_id || event.trace_id || event.traceId || '',
    status: previousRun.status || 'running',
    phase: previousRun.phase || 'execute',
    user_message: userMessage,
    original_user_message: previousRun.original_user_message || userMessage,
    final_reply: previousRun.final_reply || '',
    tool_calls: Number(previousRun.tool_calls || 1),
    model_calls: Number(previousRun.model_calls || 0),
    test_agent_execution_plan: payload.plan || previousRun.test_agent_execution_plan || previousRun.testAgentExecutionPlan || null,
    testAgentExecutionPlan: payload.plan || previousRun.testAgentExecutionPlan || previousRun.test_agent_execution_plan || null,
    test_agent_execution_plan_summary: payload.summary,
    testAgentExecutionPlanSummary: payload.summary,
    test_agent_execution_plan_detail: payload.detail || previousRun.test_agent_execution_plan_detail || '',
    testAgentExecutionPlanDetail: payload.detail || previousRun.testAgentExecutionPlanDetail || '',
  }, previousRun)
  agentMsg.agenticRun = run
  return payload.summary
}

const applyGlobalTestAgentReviewReady = (agentMsg, event = {}) => {
  const payload = getGlobalTestAgentReviewPayload(event)
  if (!payload?.summary && !payload?.rows?.length && !payload?.postReviewSpotCheckSummary && !payload?.postReviewSpotCheck) return null
  const previousRun = agentMsg.agenticRun || {}
  const userMessage = previousRun.user_message || agentMsg.user_message || agentMsg.userMessage || ''
  agentMsg.agenticRun = mergeGlobalRunTestAgentExecutionPlan({
    ...previousRun,
    id: previousRun.id || event.run_id || event.runId || `global-test-agent-review-${event.task_id || event.taskId || Date.now()}`,
    trace_id: previousRun.trace_id || event.trace_id || event.traceId || '',
    status: previousRun.status || 'running',
    phase: previousRun.phase || 'execute',
    user_message: userMessage,
    original_user_message: previousRun.original_user_message || userMessage,
    final_reply: previousRun.final_reply || '',
    tool_calls: Number(previousRun.tool_calls || 1),
    model_calls: Number(previousRun.model_calls || 0),
    test_agent_review_summary: payload.summary || previousRun.test_agent_review_summary || previousRun.testAgentReviewSummary || null,
    testAgentReviewSummary: payload.summary || previousRun.testAgentReviewSummary || previousRun.test_agent_review_summary || null,
    independent_review_summary: payload.summary || previousRun.independent_review_summary || previousRun.independentReviewSummary || null,
    independentReviewSummary: payload.summary || previousRun.independentReviewSummary || previousRun.independent_review_summary || null,
    independent_review: payload.rows?.length ? payload.rows : previousRun.independent_review || previousRun.independentReview || [],
    independentReview: payload.rows?.length ? payload.rows : previousRun.independentReview || previousRun.independent_review || [],
    test_agent_report: payload.report || previousRun.test_agent_report || previousRun.testAgentReport || null,
    testAgentReport: payload.report || previousRun.testAgentReport || previousRun.test_agent_report || null,
    post_review_spot_check_summary: payload.postReviewSpotCheckSummary || previousRun.post_review_spot_check_summary || previousRun.postReviewSpotCheckSummary || null,
    postReviewSpotCheckSummary: payload.postReviewSpotCheckSummary || previousRun.postReviewSpotCheckSummary || previousRun.post_review_spot_check_summary || null,
    post_review_spot_check: payload.postReviewSpotCheck || previousRun.post_review_spot_check || previousRun.postReviewSpotCheck || null,
    postReviewSpotCheck: payload.postReviewSpotCheck || previousRun.postReviewSpotCheck || previousRun.post_review_spot_check || null,
  }, previousRun)
  return payload.summary || payload.postReviewSpotCheckSummary
}

const globalEventToVisibleLine = (event = {}) => {
  const type = String(event.type || '')
  if (type === 'user_steer_queued') {
    const steering = event.steering || event.user_steer || event.userSteer || {}
    const revised = steering.kind === 'revise_goal'
    return {
      tone: 'running',
      icon: revised ? '🧭' : '✍️',
      title: revised ? '目标调整已接收' : '补充要求已接收',
      text: revised
        ? '我会在当前任务里先重新核对目标和计划，再继续执行。'
        : '我会把这条要求接到当前任务里继续处理。'
    }
  }
  if (type === 'user_steer_applied') {
    const steering = event.steering || event.user_steer || event.userSteer || {}
    const revised = steering.kind === 'revise_goal' || event.replan_required === true
    return {
      tone: 'running',
      icon: revised ? '🧭' : '✅',
      title: revised ? '目标调整已纳入' : '补充要求已纳入',
      text: compactVisibleStreamText(event.message, revised
        ? '新的目标边界已纳入，下一步会重新核对计划。'
        : '补充要求已纳入当前任务，我会带着它继续处理。')
    }
  }
  if (type === 'user_steer_failed') {
    return {
      tone: 'error',
      icon: '⚠️',
      title: '补充要求未接入',
      text: compactVisibleStreamText(event.message, '这条补充没有接入当前任务，请重新发送。')
    }
  }
  if (type === 'test_agent_execution_plan_ready') {
    const payload = getGlobalTestAgentExecutionPlanPayload(event)
    const summary = payload?.summary || {}
    return {
      tone: summary.status === 'blocked' ? 'waiting' : 'running',
      icon: '✅',
      title: summary.title || 'TestAgent 复核计划',
      text: compactVisibleStreamText(summary.headline || event.detail, 'TestAgent 复核计划已生成，我会继续跟进独立复核。')
    }
  }
  if (type === 'test_agent_review_ready') {
    const payload = getGlobalTestAgentReviewPayload(event)
    const summary = payload?.summary || {}
    return {
      tone: summary.status === 'passed' ? 'ok' : ['needs_rework', 'needs_recheck', 'needs_user'].includes(summary.status) ? 'waiting' : 'running',
      icon: summary.status === 'passed' ? '✅' : '⚠️',
      title: summary.title || '独立复核',
      text: compactVisibleStreamText(summary.headline || event.detail, 'TestAgent 已提交独立复核结论，我会纳入最终验收。')
    }
  }
  if (type === 'post_review_spot_check_ready') {
    const payload = getGlobalTestAgentReviewPayload(event)
    const summary = payload?.postReviewSpotCheckSummary || {}
    return {
      tone: summary.status === 'passed' ? 'ok' : summary.status === 'needs_recheck' ? 'waiting' : 'running',
      icon: summary.status === 'passed' ? '✅' : '⚠️',
      title: summary.title || '完成前抽查',
      text: compactVisibleStreamText(summary.headline || event.detail, '完成前抽查已返回，我正在核对最终验收条件。')
    }
  }
  if (event.ui?.title || event.ui?.text) {
    const icons = {
      understanding: '🧠',
      planning: '🧭',
      answering: '✍️',
      executing: '🛠️',
      dispatching: '📨',
      reviewing: '✅',
      debugging: '⚠️',
      waiting: '⏳',
      paused: '⏸️',
      supervising: '📡',
      completed: '✨',
      failed: '❌',
      cancelled: '🛑'
    }
    return {
      tone: event.ui.tone || 'running',
      icon: event.ui.icon || icons[event.ui.phase] || '•',
      title: event.ui.title || '状态更新',
      text: compactVisibleStreamText(event.ui.text || '', '状态已更新。')
    }
  }
  const toolName = event.tool?.name || event.pending_tool?.name || event.step?.tool?.name || ''
  const toolLabel = getGlobalToolLabel(toolName)
  if (type === 'dispatch_launch_summary') {
    const summary = event.dispatch_launch_summary || event.dispatchLaunchSummary || {}
    const rows = Array.isArray(summary.rows) ? summary.rows : []
    const targets = rows.map(row => [visibleGlobalPlanText(row.role || '执行成员', '执行成员', 80), row.agent].filter(Boolean).join(' · ')).filter(Boolean).slice(0, 4).join('、')
    const text = visibleGlobalPlanText(
      [summary.headline || (targets ? `我已把这次需求交给：${targets}。` : ''), summary.next_action ? `下一步：${summary.next_action}` : ''].filter(Boolean).join(' '),
      '安排已发出，正在等待执行目标更新结果。',
      220
    )
    return { tone: 'ok', icon: '📨', title: summary.title || '已派发的工作', text }
  }
  if (type === 'plan_mode_ready') {
    const planMode = event.plan_mode || event.planMode || {}
    return {
      tone: 'running',
      icon: '🧭',
      title: planMode.title || '执行前计划已整理',
      text: compactVisibleStreamText(planMode.next_step || planMode.risk?.summary || event.message, '我已整理计划，会继续执行并在完成后总结。')
    }
  }
  if (type === 'started') return { tone: 'running', icon: '🧠', title: '理解需求', text: '正在理解你的消息，判断是普通对话还是需要执行操作。' }
  if (type === 'decision') {
    const state = event.step?.state || ''
    const message = compactVisibleStreamText(event.step?.message || event.step?.decision?.intent?.reason || '', '正在规划下一步。')
    if (toolName) return { tone: 'running', icon: '🧭', title: '形成行动计划', text: message || `准备执行：${toolLabel}` }
    if (state === 'answer' || state === 'complete') return { tone: 'running', icon: '✍️', title: '组织回复', text: message || '已经形成回答，正在整理给你。' }
    if (state === 'needs_confirmation') return { tone: 'waiting', icon: '⏳', title: '需要确认', text: message || '需要你确认目标或授权范围。' }
    return { tone: 'running', icon: '🧭', title: '规划下一步', text: message || '正在规划下一步。' }
  }
  if (type === 'tool_started') return { tone: 'running', icon: '🛠️', title: '执行动作', text: `正在${toolLabel}。` }
  if (type === 'tool_completed') return { tone: 'ok', icon: '✅', title: '动作已返回', text: `${toolLabel}已返回结果，我正在检查。` }
  if (type === 'tool_failed' || type === 'tool_validation_failed') {
    return { tone: 'error', icon: '⚠️', title: '执行遇到问题', text: compactVisibleStreamText(event.reply || event.step?.message, `${toolLabel}执行遇到问题，我正在重新判断下一步。`) }
  }
  if (type === 'clarification_required') return { tone: 'waiting', icon: '❓', title: '需要补充信息', text: compactVisibleStreamText(event.reply, '需要你补充目标、范围或验收标准。') }
  if (type === 'confirmation_required') return { tone: 'waiting', icon: '🔐', title: '等待授权确认', text: compactVisibleStreamText(event.reply, '这个操作需要你确认后才会继续。') }
  if (type === 'paused') return { tone: 'waiting', icon: '⏸️', title: '已暂停', text: compactVisibleStreamText(event.reply, '全局 Agent 已暂停。') }
  if (type === 'supervising') return { tone: 'running', icon: '📡', title: '持续跟进中', text: compactVisibleStreamText(event.reply, '已经创建长期任务，正在跟进协作群和项目执行成员交付。') }
  if (type === 'completed') return { tone: 'ok', icon: '✨', title: '处理结果', text: compactVisibleStreamText(event.reply, GLOBAL_STREAM_COMPLETED_FALLBACK) }
  if (type === 'failed') return { tone: 'error', icon: '❌', title: '失败', text: compactVisibleStreamText(event.reply, '任务没有完成，我已整理未完成原因和下一步。') }
  if (type === 'cancelled') return { tone: 'waiting', icon: '🛑', title: '已取消', text: compactVisibleStreamText(event.reply, '本轮处理已取消。') }
  return null
}

const ensureGlobalStreamMessage = (agentMsg, addedRef) => {
  if (!addedRef.value && currentSession.value) {
    currentSession.value.messages.push(agentMsg)
    addedRef.value = true
  }
}

const syncActiveGlobalRunEnvelope = (agentMsg, event = {}) => {
  const runId = event.run_id || event.runId || event.run?.id || ''
  if (!runId) return
  const previousRun = agentMsg.agenticRun || {}
  const steering = event.steering || event.user_steer || event.userSteer || null
  agentMsg.agenticRun = {
    ...previousRun,
    id: previousRun.id || runId,
    trace_id: previousRun.trace_id || event.trace_id || event.traceId || '',
    status: event.status || event.run?.status || previousRun.status || 'running',
    phase: event.phase || event.run?.phase || previousRun.phase || 'plan',
    user_message: previousRun.user_message || agentMsg.user_message || agentMsg.userMessage || '',
    original_user_message: previousRun.original_user_message || agentMsg.user_message || agentMsg.userMessage || '',
    ...(steering ? {
      last_user_steer: steering,
      lastUserSteer: steering,
      pending_user_messages: event.run?.pending_user_messages || previousRun.pending_user_messages || [],
      pendingUserMessages: event.run?.pendingUserMessages || previousRun.pendingUserMessages || [],
    } : {}),
  }
  activeGlobalRunId.value = runId
  activeGlobalRunMessage.value = agentMsg
}

const appendGlobalStreamEvent = (agentMsg, event) => {
  if (globalEventConfirmsExecution(event)) {
    agentMsg.executionIntentConfirmed = true
    activeGlobalExecutionConfirmed.value = true
    if (activeGlobalRunMessage.value) activeGlobalRunMessage.value.executionIntentConfirmed = true
  }
  syncActiveGlobalRunEnvelope(agentMsg, event)
  const visible = globalEventToVisibleLine(event)
  if (!visible) return false
  if (!Array.isArray(agentMsg.streamEvents)) agentMsg.streamEvents = []
  const eventType = String(event.type || '')
  const steering = event.steering || event.user_steer || event.userSteer || null
  const steeringId = String(steering?.id || '')
  if (steeringId && ['user_steer_queued', 'user_steer_applied'].includes(eventType)) {
    const alreadyQueued = agentMsg.streamEvents.some(item => item.eventType === 'user_steer_queued' && item.steeringId === steeringId)
    const alreadyApplied = agentMsg.streamEvents.some(item => item.eventType === 'user_steer_applied' && item.steeringId === steeringId)
    if (eventType === 'user_steer_queued' && (alreadyQueued || alreadyApplied)) return false
    if (eventType === 'user_steer_applied' && alreadyApplied) return false
    if (eventType === 'user_steer_applied' && !alreadyQueued) {
      const queuedVisible = globalEventToVisibleLine({ type: 'user_steer_queued', steering })
      if (queuedVisible) {
        agentMsg.streamEvents.push({
          ...queuedVisible,
          eventType: 'user_steer_queued',
          steeringId,
          at: steering.at || new Date().toISOString()
        })
      }
    }
  }
  updateGlobalStreamToolUseSummary(agentMsg, event)
  if (event.type === 'test_agent_execution_plan_ready') {
    applyGlobalTestAgentExecutionPlanReady(agentMsg, event)
  }
  if (event.type === 'test_agent_review_ready' || event.type === 'post_review_spot_check_ready') {
    applyGlobalTestAgentReviewReady(agentMsg, event)
  }
  const dispatchLaunchSummary = event.dispatch_launch_summary || event.dispatchLaunchSummary || null
  if (dispatchLaunchSummary?.rows?.length) {
    agentMsg.dispatch_launch_summary = dispatchLaunchSummary
    agentMsg.dispatchLaunchSummary = dispatchLaunchSummary
  }
  const clarificationSummary = event.clarification_summary || event.clarificationSummary || null
  if (clarificationSummary) {
    agentMsg.clarification_summary = clarificationSummary
    agentMsg.clarificationSummary = clarificationSummary
  }
  const confirmationSummary = event.confirmation_summary || event.confirmationSummary || null
  if (confirmationSummary) {
    agentMsg.confirmation_summary = confirmationSummary
    agentMsg.confirmationSummary = confirmationSummary
  }
  const planMode = event.plan_mode || event.planMode || null
  if (planMode) {
    agentMsg.plan_mode = planMode
    agentMsg.planMode = planMode
  }
  if ((planMode || confirmationSummary || clarificationSummary) && event.run_id) {
    const previousRun = agentMsg.agenticRun || {}
    const userMessage = previousRun.user_message || agentMsg.user_message || agentMsg.userMessage || planMode?.requirement || ''
    agentMsg.agenticRun = {
      ...previousRun,
      id: previousRun.id || event.run_id,
      trace_id: previousRun.trace_id || event.trace_id || '',
      status: event.status || previousRun.status || (confirmationSummary ? 'waiting_confirmation' : clarificationSummary ? 'waiting_clarification' : 'running'),
      phase: event.phase || previousRun.phase || 'needs_confirmation',
      user_message: userMessage,
      original_user_message: previousRun.original_user_message || userMessage,
      pending_tool: event.pending_tool || previousRun.pending_tool || null,
      final_reply: event.reply || previousRun.final_reply || '',
      clarification_summary: clarificationSummary || previousRun.clarification_summary || null,
      clarificationSummary: clarificationSummary || previousRun.clarificationSummary || null,
      confirmation_summary: confirmationSummary || previousRun.confirmation_summary || null,
      confirmationSummary: confirmationSummary || previousRun.confirmationSummary || null,
      plan_mode: planMode || previousRun.plan_mode || null,
      planMode: planMode || previousRun.planMode || null,
      tool_calls: Number(previousRun.tool_calls || 0),
      model_calls: Number(previousRun.model_calls || 0),
      resume_count: Number(previousRun.resume_count || 0),
    }
  }
  const checkpoint = event.ui?.checkpoint || event.progress_checkpoint || event.progressCheckpoint || null
  if (checkpoint?.label) {
    if (!Array.isArray(agentMsg.progressCheckpoints)) agentMsg.progressCheckpoints = []
    const checkpointKey = checkpoint.id || `${checkpoint.label}:${checkpoint.detail || ''}:${checkpoint.phase || ''}`
    agentMsg.progressCheckpoints = [
      ...agentMsg.progressCheckpoints.filter(item => (item.id || `${item.label}:${item.detail || ''}:${item.phase || ''}`) !== checkpointKey),
      checkpoint,
    ].slice(-12)
    agentMsg.progress_checkpoints = {
      schema: 'ccm-main-agent-live-checkpoints-v1',
      items: agentMsg.progressCheckpoints,
    }
  }
  const key = `${visible.title}:${visible.text}`
  const previous = agentMsg.streamEvents[agentMsg.streamEvents.length - 1]
  if (previous && `${previous.title}:${previous.text}` === key) return false
  agentMsg.streamEvents.push({ ...visible, eventType, steeringId, at: new Date().toISOString() })
  if (agentMsg.streamEvents.length > GLOBAL_STREAM_EVENT_LIMIT) {
    agentMsg.streamEvents.splice(0, agentMsg.streamEvents.length - GLOBAL_STREAM_EVENT_LIMIT)
  }
  const lines = agentMsg.streamEvents.map(item => `${item.icon} ${item.title}：${item.text}`)
  agentMsg.content = lines.join('\n')
  return true
}

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

const findActiveGlobalRunMessage = (runId = activeGlobalRunId.value) => {
  if (activeGlobalRunMessage.value?.agenticRun?.id === runId) return activeGlobalRunMessage.value
  const rows = currentSession.value?.messages || []
  return [...rows].reverse().find(message => message?.role === 'assistant'
    && message?.agenticRun?.id === runId) || null
}

const sendGlobalRunSteer = async (options = {}) => {
  const userText = String(options.userText ?? chatInput.value).trim()
  const runId = options.runId || activeGlobalRunId.value
  if (!userText || !runId || isSteering.value) return
  const agentMsg = options.agentMsg || findActiveGlobalRunMessage(runId)
  if (!agentMsg || !currentSession.value) {
    toast.error('当前任务还没有准备好接收补充要求')
    return { success: false, error: '当前任务还没有准备好接收补充要求' }
  }

  const supervisionSteer = options.supervision === true
  const source = supervisionSteer ? 'global_web_supervision_steer' : 'global_web_mid_turn'
  const requestId = `steer-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const userMessage = {
    role: 'user',
    content: userText,
    timestamp: new Date().toISOString(),
    type: supervisionSteer ? 'global_supervision_steer' : 'global_run_steer',
    run_id: runId,
    delivery_status: 'sending'
  }
  currentSession.value.messages.push(userMessage)
  chatInput.value = ''
  isSteering.value = true
  saveHistory()
  scrollToBottom()
  let accepted = false
  let failure = ''

  try {
    const res = await fetch('/api/global-agent/runs/steer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: runId,
        message: userText,
        kind: 'auto',
        source,
        request_id: requestId
      })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.success === false) throw new Error(data.error || `HTTP ${res.status}`)
    userMessage.delivery_status = 'accepted'
    accepted = true
    if (data.run) {
      agentMsg.agenticRun = mergeGlobalRunTestAgentExecutionPlan(data.run, agentMsg.agenticRun || {})
      activeGlobalRunId.value = agentMsg.agenticRun.id || runId
      activeGlobalRunMessage.value = agentMsg
    }
    if (data.mission) applyGlobalMissionPayload(agentMsg, data)
    else if (data.supervisor) agentMsg.globalMissionSupervisor = data.supervisor
    if (supervisionSteer) {
      agentMsg.type = 'global_stream'
      agentMsg.streaming = false
    }
    appendGlobalStreamEvent(agentMsg, {
      type: data.applied === true ? 'user_steer_applied' : 'user_steer_queued',
      run_id: runId,
      status: data.run?.status || 'running',
      phase: data.run?.phase || 'plan',
      steering: data.steering || { message: userText, kind: 'supplement', status: 'queued' },
      replan_required: data.steering?.kind === 'revise_goal',
      message: data.message || ''
    })
    saveHistory()
    scrollToBottom()
  } catch (error) {
    failure = error?.message || '补充要求发送失败'
    userMessage.delivery_status = 'failed'
    if (!chatInput.value.trim()) chatInput.value = userText
    appendGlobalStreamEvent(agentMsg, {
      type: 'user_steer_failed',
      run_id: runId,
      message: error?.message || '这条补充没有接入当前任务，请重新发送。'
    })
    toast.error(error?.message || '补充要求发送失败')
    saveHistory()
  } finally {
    isSteering.value = false
    if (supervisionSteer) {
      activeGlobalRunId.value = ''
      activeGlobalRunMessage.value = null
    }
    scrollToBottom()
  }
  return { success: accepted, error: failure }
}

const stopGlobalCurrentWork = async () => {
  if (!globalTurnBusy.value || stoppingGlobalTurn.value) return
  stoppingGlobalTurn.value = true
  try {
    let runId = globalActiveRunId.value
    if (!runId && currentSessionId.value) {
      const params = new URLSearchParams({ session_id: currentSessionId.value, limit: '20' })
      const listing = await fetch(`/api/global-agent/runs?${params.toString()}`).then(response => response.json()).catch(() => ({}))
      runId = (listing.runs || []).find(run => ['running', 'supervising', 'paused'].includes(String(run?.status || '')))?.id || ''
    }
    if (runId) {
      await fetch('/api/global-agent/runs/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: runId, reason: '用户从全局 Agent 会话停止当前工作' }),
      }).then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok || data.success === false) throw new Error(data.error || '停止失败')
      }).catch((error) => toast.warning(error?.message || '后端停止请求未完成，正在中断当前连接'))
    }
    globalStreamController.value?.abort()
  } finally {
    stoppingGlobalTurn.value = false
  }
}

const drainGlobalTurnQueue = () => globalTurnControl.drain(async (turn) => {
  const result = await sendMessage({ queueTurn: turn })
  if (result?.success === false) throw new Error(result.error || '全局消息没有完成')
  return { run_id: result?.runId || '' }
})
watch(
  () => [currentSessionId.value, globalTurnBusy.value, globalTurnControl.turns.value.filter(turn => turn.status === 'queued').length],
  ([conversationId, busy, queued]) => {
    if (conversationId && !busy && queued) window.setTimeout(() => drainGlobalTurnQueue().catch(() => {}), 0)
  },
  { flush: 'post' },
)

const submitGlobalMessageWhileBusy = async () => {
  const message = chatInput.value.trim()
  if (!message) return
  const requestedMode = globalTurnControl.mode.value
  const supervisedMessage = currentSupervisedRunMessage.value
  const runId = globalActiveRunId.value
  const canSteer = !!runId && (activeGlobalExecutionConfirmed.value || !!supervisedMessage)
  if (requestedMode === 'steer' && !canSteer) {
    toast.info('当前运行还在启动，这条消息已改为排队，启动完成后不会丢失')
  }
  const effectiveMode = requestedMode === 'steer' && canSteer ? 'steer' : 'queue'
  const turn = await globalTurnControl.enqueue({
    message,
    mode: effectiveMode,
    activeRunId: runId,
    metadata: { session_id: currentSessionId.value, requested_mode: requestedMode },
  })
  chatInput.value = ''
  if (effectiveMode === 'steer') {
    const result = await sendGlobalRunSteer({ userText: message, runId, agentMsg: supervisedMessage || undefined, supervision: !!supervisedMessage })
    await globalTurnControl.settle(turn, result?.success ? 'applied' : 'failed', result?.success ? {} : { error: result?.error || '引导没有接入当前工作' })
  } else {
    toast.success('已加入队列，当前回复结束后会自动发送')
  }
  return turn
}

const beginGlobalMissionInput = async (msg, card = {}) => {
  const missionId = msg?.globalMission?.id || card?.task_id || ''
  const supervisorId = msg?.globalMissionSupervisor?.id || msg?.globalMission?.supervisor_id || missionId
  if (!missionId || !supervisorId) {
    toast.error('当前任务还没有准备好接收补充信息')
    return
  }
  pendingGlobalMissionInput.value = {
    msg,
    missionId,
    supervisorId,
    title: card?.title || msg?.globalMission?.title || '当前任务',
    businessGoal: card?.goal || msg?.globalMission?.business_goal || msg?.globalMission?.title || '',
    acceptance: msg?.globalMissionSupervisor?.acceptance || msg?.globalMission?.acceptance_criteria || '',
  }
  chatInput.value = ''
  selectedFiles.value = []
  await nextTick()
  chatInputElement.value?.focus?.()
  toast.info('请在输入框补充所需信息；发送后我会接着原任务继续执行和验收')
}

const sendGlobalMissionInput = async () => {
  const target = pendingGlobalMissionInput.value
  const userText = chatInput.value.trim()
  if (!target || !userText || isSteering.value || !currentSession.value) return
  const timestamp = new Date().toISOString()
  const requestId = `mission-input-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const userMessage = {
    id: `global-mission-input:${requestId}`,
    role: 'user',
    type: 'global_mission_user_input',
    content: userText,
    timestamp,
    mission_id: target.missionId,
    delivery_status: 'sending',
  }
  currentSession.value.messages.push(userMessage)
  chatInput.value = ''
  pendingGlobalMissionInput.value = null
  isSteering.value = true
  saveHistory()
  scrollToBottom()

  try {
    const businessGoal = String(target.businessGoal || target.title || '继续当前任务').slice(0, 50_000)
    const data = await postJson('/api/global-agent/supervisors/control', {
      id: target.supervisorId,
      mission_id: target.missionId,
      operation: 'update_goal',
      business_goal: businessGoal,
      acceptance: target.acceptance,
      message: userText,
      message_id: userMessage.id,
      message_timestamp: timestamp,
      request_id: requestId,
      continuation_kind: 'supplement',
      resolve_waiting_user: true,
      source: 'global_web_waiting_user_resolution',
      actor: 'global-agent-task-card',
      continuation: {
        kind: 'supplement',
        source: 'global_web_waiting_user_resolution',
        reason: userText,
        title: '补充任务条件',
        resolve_waiting_user: true,
        interrupt_current_run: false,
      },
    })
    userMessage.delivery_status = 'accepted'
    const sessionMessages = currentSession.value?.messages || []
    for (const message of sessionMessages) {
      const sameMission = message?.globalMission?.id === target.missionId
        || message?.globalMissionSupervisor?.mission_id === target.missionId
        || message?.agenticRun?.mission_id === target.missionId
      if (!sameMission) continue
      applyGlobalMissionPayload(message, data)
      if (data.run && message?.agenticRun?.id === data.run.id) message.agenticRun = data.run
    }
    applyGlobalMissionPayload(target.msg, data)
    if (data.run && target.msg?.agenticRun?.id === data.run.id) target.msg.agenticRun = data.run
    target.msg.type = 'global_mission'
    target.msg.missionNotificationState = 'resolved'
    target.msg.mission_notification_state = 'resolved'
    target.msg.content = `已收到你补充的信息，“${visibleGlobalText(target.title, '当前任务', 100)}”会沿用原计划和验收条件继续执行。`
    target.msg.updated_at = data.supervisor?.updated_at || new Date().toISOString()
    saveHistory()
    scrollToBottom()
    toast.success('补充信息已接入原任务，我会继续执行和验收')
  } catch (error) {
    userMessage.delivery_status = 'failed'
    pendingGlobalMissionInput.value = target
    if (!chatInput.value.trim()) chatInput.value = userText
    toast.error(error?.message || '补充信息没有接入当前任务，请重新发送')
    saveHistory()
  } finally {
    isSteering.value = false
    await nextTick()
    if (pendingGlobalMissionInput.value) chatInputElement.value?.focus?.()
    scrollToBottom()
  }
}

const sendMessage = async (options = {}) => {
  const queuedTurn = options?.queueTurn || null
  if (globalTurnBusy.value && !queuedTurn && !pendingGlobalMissionInput.value && !pendingGlobalClarificationInput.value) return submitGlobalMessageWhileBusy()
  if (!queuedTurn && !chatInput.value.trim() && selectedFiles.value.length === 0) return
  if (pendingGlobalMissionInput.value) return sendGlobalMissionInput()
  const supervisionTarget = currentSupervisedRunMessage.value
  if (
    selectedFiles.value.length === 0
    && supervisionTarget?.agenticRun?.id
    && isExplicitSupervisionContinuation(chatInput.value)
  ) {
    return sendGlobalRunSteer({
      runId: supervisionTarget.agenticRun.id,
      agentMsg: supervisionTarget,
      supervision: true,
    })
  }
  if (!currentSession.value) {
    createNewSession()
  }
  
  const userText = queuedTurn ? String(queuedTurn.message || '').trim() : chatInput.value.trim()
  const clarificationTarget = pendingGlobalClarificationInput.value
  const attachedFiles = queuedTurn ? [] : [...selectedFiles.value]
  const retrySignature = globalRequestRetrySignature({
    sessionId: currentSessionId.value,
    message: userText,
    files: attachedFiles,
    clarificationRunId: clarificationTarget?.runId,
  })
  const requestId = pendingGlobalRequestRetry.value?.signature === retrySignature
    ? pendingGlobalRequestRetry.value.requestId
    : `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  pendingGlobalRequestRetry.value = { signature: retrySignature, requestId }
  
  chatInput.value = ''
  selectedFiles.value = []
  
  // 自动命名新会话
  if (currentSession.value.name === '新会话' || currentSession.value.name === '默认会话') {
    const nameSource = userText || (attachedFiles.length > 0 ? `附件: ${attachedFiles[0].name}` : '新会话')
    currentSession.value.name = nameSource.slice(0, 12) + (nameSource.length > 12 ? '...' : '')
  }
  
  // 构建前端渲染的历史消息（带附件）
  const newMessage = {
    id: `global-request:${requestId}`,
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
  const previousRequestMessageIndex = currentSession.value.messages.findIndex(message => message.id === newMessage.id)
  if (previousRequestMessageIndex >= 0) currentSession.value.messages.splice(previousRequestMessageIndex, 1)
  currentSession.value.messages.push(newMessage)
  saveHistory()
  scrollToBottom()
  
  isSending.value = true
  
  try {
    const historyPayload = currentSession.value.messages.slice(0, -1).map(m => ({
      role: m.role,
      content: m.content
    }))
    
    const agentMsg = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      files: [],
      type: 'global_stream',
      streaming: true,
      executionIntentConfirmed: false,
      streamEvents: [],
      user_message: userText,
      userMessage: userText
    }
    activeGlobalRunMessage.value = agentMsg
    activeGlobalRunId.value = ''
    activeGlobalExecutionConfirmed.value = false
    const agentMsgAdded = { value: false }
    
    let res
    if (attachedFiles.length > 0) {
      const formData = new FormData()
      formData.append('message', userText)
      formData.append('history', JSON.stringify(historyPayload))
      formData.append('session_id', currentSessionId.value)
      formData.append('request_id', requestId)
      if (clarificationTarget?.runId) formData.append('clarification_run_id', clarificationTarget.runId)
      formData.append('stream', 'true')
      attachedFiles.forEach((f, idx) => {
        formData.append(`file_${idx}`, f.file)
      })
      const controller = new AbortController()
      globalStreamController.value = controller
      res = await fetch('/api/global-agent/run?stream=true', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })
    } else {
      const controller = new AbortController()
      globalStreamController.value = controller
      res = await fetch('/api/global-agent/run?stream=true', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
        signal: controller.signal,
        body: JSON.stringify({
          message: userText,
          history: historyPayload,
          session_id: currentSessionId.value,
          request_id: requestId,
          clarification_run_id: clarificationTarget?.runId || '',
          stream: true
        })
      })
    }

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(errText || `HTTP ${res.status}`)
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let sseBuffer = ''
    let globalStreamRawBuffer = ''
    let globalStreamHiddenBuffer = false
    const seenGlobalStreamEventIds = new Set()
    let globalResultReceived = false
    let globalStreamFailed = false

    const handleGlobalSseEvent = (rawEvent) => {
      const dataText = rawEvent
        .split(/\r?\n/)
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).trimStart())
        .join('\n')
      if (!dataText) return
      try {
        const data = JSON.parse(dataText)
        const eventId = String(data.event_id || data.eventId || '')
        if (eventId && seenGlobalStreamEventIds.has(eventId)) return
        if (eventId) seenGlobalStreamEventIds.add(eventId)
        if (data.type === 'text') {
          ensureGlobalStreamMessage(agentMsg, agentMsgAdded)
          const chunkText = String(data.text || '')
          globalStreamRawBuffer += chunkText
          if (globalStreamHiddenBuffer || GLOBAL_VISIBLE_INTERNAL_TEXT_PATTERN.test(globalStreamRawBuffer)) {
            globalStreamHiddenBuffer = true
            agentMsg.content = sanitizeGlobalVisibleStreamText(globalStreamRawBuffer, '我已收到技术执行信息，正在整理用户可读结论。', 1200)
          } else {
            agentMsg.content += sanitizeGlobalVisibleStreamText(chunkText)
          }
          scrollToBottom()
        } else if (data.type === 'result') {
          globalResultReceived = true
          ensureGlobalStreamMessage(agentMsg, agentMsgAdded)
          const run = mergeGlobalRunTestAgentExecutionPlan(data.run || {}, agentMsg.agenticRun || {})
          const pendingToolName = sanitizeGlobalVisibleStreamText(run.pending_tool?.name || '写入操作', '写入操作', 80)
          const confirmationHint = run.status === 'waiting_confirmation'
            ? `\n\n⚠️ 等待确认：${pendingToolName}。请使用下方按钮决定是否继续。`
            : ''
          agentMsg.content = sanitizeGlobalVisibleStreamText(run.final_reply || GLOBAL_RESULT_VISIBLE_FALLBACK, GLOBAL_RESULT_VISIBLE_FALLBACK, 8000) + confirmationHint
          agentMsg.files = data.files || []
          agentMsg.agenticRun = run
          activeGlobalRunId.value = run.id || activeGlobalRunId.value
          activeGlobalRunMessage.value = agentMsg
          agentMsg.streaming = false
          agentMsg.type = 'global_agent_result'
          if (run.status === 'supervising' && run.mission_id) trackGlobalMission(run.mission_id, currentSessionId.value)
          for (const effect of (run.client_effects || [])) {
            if (effect?.type === 'navigate' && effect.params?.tab) emit('switch-tab', effect.params.tab)
          }
        } else if (data.type === 'error') {
          globalStreamFailed = true
          ensureGlobalStreamMessage(agentMsg, agentMsgAdded)
          agentMsg.content = `出错啦：${sanitizeGlobalVisibleStreamText(data.text, '这次处理没有完成，排障信息已放入技术详情。', 1200)}`
          agentMsg.streaming = false
          agentMsg.type = 'global_agent_error'
        } else if (data.type !== 'done') {
          ensureGlobalStreamMessage(agentMsg, agentMsgAdded)
          if (appendGlobalStreamEvent(agentMsg, data)) scrollToBottom()
        } else {
          agentMsg.streaming = false
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
        handleGlobalSseEvent(event)
      }
    }
    sseBuffer += decoder.decode()
    if (sseBuffer.trim()) handleGlobalSseEvent(sseBuffer)

    if (globalResultReceived && pendingGlobalRequestRetry.value?.requestId === requestId) {
      pendingGlobalRequestRetry.value = null
    } else if (globalStreamFailed && !chatInput.value.trim()) {
      chatInput.value = userText
    }

    saveHistory()
    return { success: !globalStreamFailed, error: globalStreamFailed ? '全局消息没有完成' : '', runId: agentMsg.agenticRun?.id || '' }

  } catch (err) {
    const stopped = err?.name === 'AbortError'
    if (currentSession.value) {
      const last = currentSession.value.messages[currentSession.value.messages.length - 1]
      if (last?.type === 'global_stream' && last.streaming) {
        last.streaming = false
        last.type = 'global_agent_error'
        last.content = stopped ? '本次处理已停止，你可以调整需求后继续。' : `❌ 连接服务器失败：${err.message || '请检查网络或配置'}`
        if (!chatInput.value.trim()) chatInput.value = userText
        saveHistory()
        scrollToBottom()
        return { success: false, error: stopped ? '当前工作已停止' : (err.message || '连接服务器失败') }
      }
    }
    currentSession.value.messages.push({
      role: 'assistant',
      content: `❌ 连接服务器失败：${err.message || '请检查网络或配置'}`,
      timestamp: new Date().toISOString()
    })
    saveHistory()
    return { success: false, error: err?.message || '连接服务器失败' }
  } finally {
    isSending.value = false
    activeGlobalRunId.value = ''
    activeGlobalRunMessage.value = null
    activeGlobalExecutionConfirmed.value = false
    globalStreamController.value = null
    scrollToBottom()
    if (!queuedTurn) window.setTimeout(() => drainGlobalTurnQueue().catch(() => {}), 0)
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

const controlAgenticRun = async (msg, operation, approved = true, feedback = '', source = '') => {
  const runId = msg?.agenticRun?.id
  if (!runId || msg.agenticRunLoading) return
  msg.agenticRunLoading = true
  try {
    const endpoint = operation === 'confirm'
      ? '/api/global-agent/runs/confirm'
      : `/api/global-agent/runs/${operation}`
    const data = await postJson(endpoint, { id: runId, approved, accept_feedback: String(feedback || '').trim(), source: String(source || '').trim() })
    const run = data.run || {}
    msg.agenticRun = run
    msg.content = formatGlobalRunVisibleReply(run, run.status === 'paused' ? '我已暂停这次运行。' : '运行状态已更新。')
    if (run.status === 'waiting_confirmation') {
      const pendingToolName = sanitizeGlobalVisibleStreamText(run.pending_tool?.name || '写入操作', '写入操作', 80)
      msg.content += `\n\n⚠️ 等待确认：${pendingToolName}。请使用下方按钮决定是否继续。`
    }
    for (const effect of (run.client_effects || [])) {
      if (effect?.type === 'navigate' && effect.params?.tab) emit('switch-tab', effect.params.tab)
    }
    saveHistory()
    toast.success(operation === 'confirm' ? (approved ? '已确认，Agent 继续执行' : '已取消操作') : '运行状态已更新')
  } catch (error) {
    toast.error(error?.message || '全局 Agent 运行控制失败')
  } finally {
    msg.agenticRunLoading = false
    scrollToBottom()
  }
}

const saveCurrentGlobalSessionKnowledge = async () => {
  if (!currentSession.value || messages.value.length <= 1) return toast.info('当前全局会话还没有可沉淀的内容')
  try {
    const data = await postKnowledgeCapture(buildGlobalConversationKnowledgePayload({
      sessionId: currentSessionId.value,
      messages: messages.value,
    }))
    toast.success(`已保存到知识库：${data.entry?.title || '全局会话'}`)
  } catch (error) {
    toast.error(error?.message || '保存全局会话知识失败')
  }
}

const applyGlobalMissionPayload = (msg, payload = {}) => {
  if (!msg) return
  const missionEnvelope = payload.mission?.mission ? payload.mission : payload
  const mission = missionEnvelope.mission || payload.mission
  const children = missionEnvelope.children || payload.children || []
  if (mission?.id) msg.globalMission = mission
  if (Array.isArray(children)) msg.globalMissionChildren = children.map(task => task?.task ? task : ({ task, target: task?.mission_target || null }))
  if (payload.supervisor) msg.globalMissionSupervisor = payload.supervisor
  if (mission?.status === 'cancelled') msg.content = '全局任务已取消。'
  else if (payload.supervisor?.status === 'paused') msg.content = '全局任务跟进已暂停。'
  else if (payload.supervisor?.status === 'monitoring') msg.content = '全局任务跟进已恢复，会继续跟踪执行与验收。'
}

const getGlobalTaskCard = (msg) => {
  if (!msg || msg.role !== 'assistant') return null
  return globalMissionTaskCard(msg) || globalAgentRunTaskCard(msg)
}

const GLOBAL_MISSION_TASK_MESSAGE_TYPES = new Set([
  'global_mission',
  'global_mission_complete',
  'global_mission_waiting_user',
  'global_mission_terminal',
])

const isGlobalMissionTaskMessage = (msg) => GLOBAL_MISSION_TASK_MESSAGE_TYPES.has(String(msg?.type || ''))

const runtimeDebugRows = (msg) => {
  const debug = msg?.agenticRun?.runtime_debug || null
  if (!debug) return []
  const rows = []
  if (msg?.agenticRun?.id) rows.push({ label: '运行 ID', value: msg.agenticRun.id })
  rows.push({ label: '状态', value: `${debug.status || '-'} / ${debug.phase || '-'}` })
  if (debug.pending_tool?.name) rows.push({ label: '待确认工具', value: `${debug.pending_tool.name} · ${debug.pending_tool.risk || ''}` })
  rows.push({ label: '调用', value: `模型 ${debug.model_calls || 0} · 工具 ${debug.tool_calls || 0} · 恢复 ${debug.resume_count || 0}` })
  if (debug.todos?.length) rows.push({ label: 'Todo', value: debug.todos.slice(-4).map(item => `${item.status}:${item.text}`).join(' / ') })
  if (debug.permissions?.length) rows.push({ label: '权限', value: debug.permissions.slice(-2).map(item => item.result?.rule?.decision || (item.result?.allowed ? 'allow' : item.result?.denied ? 'deny' : 'ask')).join(' / ') })
  if (debug.hooks?.length) rows.push({ label: 'Hook', value: debug.hooks.slice(-2).map(item => `${item.phase}:${item.blocked ? 'blocked' : 'ok'}`).join(' / ') })
  if (debug.output_tail?.length) rows.push({ label: '输出', value: debug.output_tail.slice(-2).map(item => item.type || 'event').join(' / ') })
  return rows
}

const runtimeDebugSections = (msg) => {
  if (!globalExecutionIntentConfirmed(msg)) return []
  const debug = msg?.agenticRun?.runtime_debug || null
  if (!debug) return []
  const fallback = {
    run_id: msg?.agenticRun?.id || '',
    blockers: debug.failed_gates || [],
    trace_id: debug.trace_id || msg?.agenticRun?.trace_id || '',
  }
  const sections = getTechnicalDetailSections({ technical: fallback }, fallback)
  const records = sections.find(section => section.id === 'records') || { id: 'records', title: '完整记录', items: [] }
  for (const row of runtimeDebugRows(msg)) {
    if (!records.items.some(item => item.label === row.label && item.value === row.value)) records.items.push(row)
  }
  if (!sections.includes(records)) sections.push(records)
  return sections.map(section => ({
    ...section,
    items: section.items.map(item => ({ ...item, value: sanitizeUserFacingAgentText(item.value, String(item.value || ''), 420) }))
  }))
}

const inferGlobalChangeProject = (msg) => {
  const direct = msg?.agenticRun?.project || msg?.agenticRun?.target_project || msg?.globalMission?.target_project
  if (direct) return direct
  const children = Array.isArray(msg?.globalMissionChildren) ? msg.globalMissionChildren : []
  const projects = [...new Set(children.map(row => row?.target?.name || row?.task?.target_project || row?.task?.mission_target?.name).filter(Boolean))]
  return projects.length === 1 ? projects[0] : ''
}

const openGlobalCodeChangeDrawer = (msg, card, action = {}) => {
  const project = action.project || inferGlobalChangeProject(msg)
  const sourceFiles = action.files?.length
    ? action.files
    : card?.change_summary?.files?.length
      ? card.change_summary.files
      : card?.changeSummary?.files?.length
        ? card.changeSummary.files
        : card?.delivery?.changes?.length
          ? card.delivery.changes
          : card?.delivery?.files || []
  const files = sourceFiles.map(item => {
    if (typeof item === 'string') return { path: item, project, statusText: '变更', statusColor: '#64748b' }
    return { ...item, project: item.project || project, statusText: item.statusText || item.status || '变更', statusColor: item.statusColor || '#64748b' }
  }).filter(item => item.path)
  openCodeChangeDrawer(
    { files, count: files.length },
    {
      title: card?.title || '全局 Agent 代码改动',
      subtitle: card?.goal || '',
      project,
      files,
      selectedPath: action.selectedPath || files[0]?.path || '',
    }
  )
}

const openGlobalChangesTab = () => {
  emit('switch-tab', 'changes')
}

const handleGlobalTaskAction = async (msg, action) => {
  const card = getGlobalTaskCard(msg)
  try {
    if (action.kind === 'view_changes') {
      openGlobalCodeChangeDrawer(msg, card, action)
      return
    }
    if (action.kind === 'save_knowledge') {
      const data = await postKnowledgeCapture(buildGlobalTaskKnowledgePayload({
        msg,
        card,
        sessionId: currentSessionId.value,
      }))
      toast.success(`已保存到知识库：${data.entry?.title || card?.title || '全局任务'}`)
      return
    }
    if (action.kind === 'view_trace') {
      const replayTaskId = action.task_id || action.taskId || card?.task_id || card?.taskId || card?.technical?.task_id || ''
      localStorage.setItem('trace-replay-target', JSON.stringify({ scope: 'global', task_id: replayTaskId, trace_id: action.trace_id || card?.technical?.trace_id || '', at: Date.now() }))
      emit('switch-tab', 'trace-replay')
      window.dispatchEvent(new CustomEvent('trace-replay-target', { detail: { scope: 'global', task_id: replayTaskId, trace_id: action.trace_id || card?.technical?.trace_id || '' } }))
      return
    }
    if (action.kind === 'continue_work_item') {
      const targetLine = `${action.target || '已解锁工作项'}：${action.reason || '继续处理已解锁工作项'}`
      const missionId = msg?.globalMission?.id || card?.task_id || msg?.agenticRun?.mission_id
      const supervisorId = msg?.globalMissionSupervisor?.id || msg?.agenticRun?.supervisor_id || missionId
      if (missionId || supervisorId) {
        const data = await postJson('/api/global-agent/supervisors/control', {
          id: supervisorId || missionId,
          mission_id: missionId,
          operation: 'update_goal',
          business_goal: `${card?.goal || msg?.globalMission?.business_goal || msg?.globalMission?.title || ''}\n继续派发已解锁工作项：${targetLine}`.trim(),
          reason: '用户从全局任务卡继续派发已解锁工作项',
          continuation: {
            rework_kind: 'next_claimable_work_item',
            target: action.target || '',
            reason: action.reason || '',
            title: action.label || '继续派发',
            work_item_id: action.work_item_id || '',
            source: 'user_next_work_item',
          },
          actor: 'global-agent-task-card',
        })
        applyGlobalMissionPayload(msg, data)
        saveHistory()
        scrollToBottom()
        toast.success('已提交，我会继续安排')
        return
      }
      chatInput.value = `继续处理这个全局任务的已解锁工作项：${targetLine}`
      await nextTick()
      return sendMessage()
    }
    if (
      action.kind === 'continue'
      && card?.phase === 'needs_user'
      && (msg?.globalMission?.id || msg?.globalMissionSupervisor?.mission_id)
    ) {
      return beginGlobalMissionInput(msg, card)
    }
    if (msg?.agenticRun?.id) {
      if (action.kind === 'provide_clarification') {
        pendingGlobalClarificationInput.value = {
          runId: msg.agenticRun.id,
          title: msg.agenticRun?.clarification_summary?.question
            || msg.agenticRun?.clarificationSummary?.question
            || msg.agenticRun?.clarification_question
            || card?.next_action
            || '补充当前请求',
        }
        chatInput.value = ''
        await nextTick()
        chatInputElement.value?.focus?.()
        toast.info('请直接在输入框补充目标、范围或验收标准，我会接着同一个运行继续。')
        return
      }
      if (action.kind === 'confirm') return controlAgenticRun(msg, 'confirm', true, action.accept_feedback || action.acceptFeedback || action.feedback || '')
      if (action.kind === 'reject_confirmation') return controlAgenticRun(msg, 'confirm', false)
      if (action.kind === 'cancel') return controlAgenticRun(msg, 'cancel')
      if (action.kind === 'resume' || action.kind === 'continue') {
        const preset = action.kind === 'continue' ? String(action.message || action.prompt || '').trim() : ''
        return controlAgenticRun(msg, 'resume', true, preset, action.source || '')
      }
      if (action.kind === 'retry') {
        chatInput.value = msg.agenticRun.user_message || card?.goal || card?.title || '继续处理这个全局任务'
        await nextTick()
        return sendMessage()
      }
    }
    const missionId = msg?.globalMission?.id || card?.task_id || msg?.agenticRun?.mission_id
    const supervisorId = msg?.globalMissionSupervisor?.id || msg?.agenticRun?.supervisor_id || missionId
    const controlMission = async (operation, extra = {}) => {
      if (!supervisorId && !missionId) throw new Error('当前全局任务没有可控制的任务 ID')
      const data = await postJson('/api/global-agent/supervisors/control', {
        id: supervisorId || missionId,
        mission_id: missionId,
        operation,
        actor: 'global-agent-task-card',
        ...extra,
      })
      applyGlobalMissionPayload(msg, data)
      saveHistory()
      scrollToBottom()
      toast.success(operation === 'cancel' ? '全局任务已取消' : operation === 'resume' ? '全局任务已恢复' : '全局任务已更新')
      return data
    }
    if (action.kind === 'continue') {
      const preset = String(action.message || action.prompt || '').trim()
      const requirement = preset || window.prompt('继续补充什么要求？', '')
      if (!requirement) return
      if (missionId && card?.phase !== 'completed') {
        return controlMission('update_goal', {
          business_goal: `${card?.goal || msg?.globalMission?.business_goal || msg?.globalMission?.title || ''}\n补充要求：${requirement}`.trim(),
          reason: '用户从全局任务卡继续修改',
        })
      }
      chatInput.value = missionId ? `继续全局任务 ${missionId}：${requirement}` : requirement
      await nextTick()
      return sendMessage()
    }
    if (action.kind === 'cancel') {
      if (!await confirmDialog(`确定取消全局任务“${card?.title || missionId}”？`)) return
      return controlMission('cancel', { reason: '用户从全局任务卡取消' })
    }
    if (action.kind === 'retry') {
      if (missionId) return controlMission('resume', { reason: '用户从全局任务卡重新执行/恢复' })
      chatInput.value = card?.goal || card?.title || '重新执行这个全局任务'
      await nextTick()
      return sendMessage()
    }
    if (action.kind === 'resume') {
      return controlMission('resume', { reason: '用户从全局任务卡恢复' })
    }
    if (action.kind === 'rollback') {
      toast.info('跨项目安全撤销需要在具体任务/项目的交付卡中执行，以避免误回滚无关改动。')
    }
  } catch (error) {
    toast.error(error?.message || `${action.label || '操作'}失败`)
  }
}

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
      else if (operation === 'delete') result = await postJson('/api/projects/archive', { name: project })
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
    const completionText = action.type === 'manage_project' && operation === 'delete'
      ? `${result.message || '项目已归档，可随时恢复。'}${result.audit_id ? `\n审计编号：${result.audit_id}` : ''}`
      : '系统管理操作已完成：' + operation + ' ' + target
    addAssistantMessage(completionText, {
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

const inferGlobalProjectCommandRequiresCodeChanges = (message) => {
  const text = String(message || '').trim()
  const explicitCodeChange = /(修改|修复|实现|新增|删除|重构|改代码|开发|接入|对接|bug|页面|接口|字段|schema|配置)/i.test(text)
  const readOnlyOnly = /(只读|仅分析|只分析|不要修改|不修改|不改代码|无需代码|无需修改|运行测试|执行测试|跑测试|检查|审查|review)/i.test(text)
  return !(readOnlyOnly && !explicitCodeChange)
}

const dispatchTrackedGlobalMission = async ({ params = {}, title, businessGoal, source, attachments = [] }) => {
  const missionRes = await fetch('/api/global-agent/orchestrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...params,
      title,
      business_goal: businessGoal,
      source_documents: params.documents || params.source_documents || params.sourceDocuments || '',
      source_attachments: attachments,
      auto_execute: true,
      source,
    })
  })
  const missionData = await missionRes.json()
  if (!missionRes.ok || missionData.success === false) throw new Error(missionData.error || '全局任务创建失败')
  const childRows = (missionData.children || []).map(item => ({
    task: item.task,
    target: item.target,
    queue_result: item.queue_result,
  }))
  addAssistantMessage(
    `全局任务「${visibleGlobalText(missionData.mission?.title || title, '全局任务', 120)}」已进入持续跟进。\n\n当前只是已派发，不代表最终完成；我会继续跟踪执行、独立复核、验收和最终总结。`,
    {
      type: 'global_mission',
      globalMission: missionData.mission,
      globalMissionChildren: childRows,
      globalMissionSupervisor: missionData.supervisor || null,
    }
  )
  trackGlobalMission(missionData.mission.id, currentSessionId.value)
  return { missionData, childRows }
}

const executeAction = async (action, actionFiles = []) => {
  executingAction.value = action
  scrollToBottom()

  try {
    if (managementActionTypes.has(action.type)) {
      await executeManagementAction(action)
    } else if (action.type === 'play_music') {
      const { keyword, isRandom, requestLabel } = normalizeMusicAction(action)
      toast.info(isRandom ? '正在为您随机播放音乐...' : `正在为您后台检索并播放${requestLabel}...`)
      if (typeof window.__cc_global_play_music === 'function') {
        try {
          const result = await window.__cc_global_play_music(keyword)
          if (result.success) {
            const playedTitle = result.title ? `《${result.title}》` : requestLabel
            toast.success(`${isRandom ? '已随机播放' : '找到音乐'}${playedTitle}(${result.source})，已开始播放！`)
            addAssistantMessage(systemResultMessage('🎵', `${isRandom ? '随机播放成功' : '成功点歌'}${playedTitle}！\n- **来源**: ${result.source}\n- **状态**: 正在后台播放中...`))
          } else {
            toast.error(`播放失败: ${result.error}`)
            addAssistantMessage(`❌ [音乐播放失败]: ${result.error || '未找到可播放的音乐'}`)
          }
        } catch (err) {
          toast.error(`播放出错: ${err.message || err}`)
          addAssistantMessage(`❌ [音乐播放失败]: ${err.message || err}`)
        }
      } else {
        try {
          const res = await fetch('/api/music/remote-command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keyword, source: 'global-agent-web' })
          })
          const data = await res.json()
          if (!res.ok || data.success === false) throw new Error(data.error || '创建音乐播放指令失败')
          toast.success('已发送给音乐播放器，打开音乐页后会自动播放')
          addAssistantMessage(systemResultMessage('🎵', `已把${requestLabel}发送给音乐播放器。\n- **状态**: 等待音乐播放器消费指令\n- **指令ID**: ${data.command?.id || '已创建'}`))
          emit('switch-tab', 'music')
        } catch (err) {
          toast.error(`播放出错: ${err.message || err}`)
          addAssistantMessage(`❌ [音乐播放失败]: ${err.message || err}`)
        }
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
        addAssistantMessage(systemResultMessage('🐾', `桌面宠物已成功${isLaunch ? '在您的桌面唤醒且可见' : '从桌面隐藏关闭'}。`))
      } else {
        toast.error(`宠物控制失败: ${petData.error || '未知原因'}`)
        addAssistantMessage(`❌ [宠物控制失败]: ${petData.error || '未知原因'}`)
      }
    } else if (action.type === 'navigate') {
      const tab = getActionParam(action, 'tab')
      toast.success('正在为您跳转页面...')
      addAssistantMessage(systemResultMessage('🧭', `已为您切换到「${tab}」页面。`))
      setTimeout(() => {
        emit('switch-tab', tab)
      }, 300)
    } else if (action.type === 'orchestrate_development') {
      const params = action.params || {}
      const title = getActionParam(action, 'title', 'name') || '全局跨项目开发任务'
      const businessGoal = getActionParam(action, 'business_goal', 'businessGoal', 'goal') || title
      toast.info('全局 Agent正在建立跨项目总计划...')
      const { childRows } = await dispatchTrackedGlobalMission({ params, title, businessGoal, source: 'global-agent-chat', attachments: actionFiles })
      toast.success('全局任务已派发给 ' + childRows.length + ' 个执行目标')
    } else if (action.type === 'create_task') {
      const title = getActionParam(action, 'title', 'name') || '全局助手派发任务'
      const groupId = getActionParam(action, 'group_id', 'groupId') || 'gmps7ha15'
      const businessGoal = getActionParam(action, 'business_goal', 'businessGoal') || title
      const acceptance = getActionParam(action, 'acceptance', 'acceptance_criteria', 'acceptanceCriteria') || '执行成员提供结果说明；我输出最终报告'
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
        addAssistantMessage(systemResultMessage('📋', `协作开发任务已成功派发并进入后台自动执行队列！\n- **任务标题**: ${title}\n- **业务目标**: ${businessGoal}\n- **分发群聊**: ${groupId}\n- **验收标准**: ${acceptance}`))
      } else {
        toast.error(`任务派发失败: ${taskData.error || '未知错误'}`)
        addAssistantMessage(`❌ [任务派发失败]: ${taskData.error || '未知错误'}`)
      }
    } else if (action.type === 'send_project_cmd') {
      const project = getActionParam(action, 'project', 'projectName')
      const message = getActionParam(action, 'message', 'prompt', 'command')
      const requiresCodeChanges = inferGlobalProjectCommandRequiresCodeChanges(message)
      toast.info(`正在为 ${project} 建立持续监督任务...`)
      await dispatchTrackedGlobalMission({
        title: `${project} 项目任务`,
        businessGoal: message,
        source: 'global-agent-chat-single-project',
        attachments: actionFiles,
        params: {
          targets: [{
            type: 'project',
            project,
            task: message,
            reason: '全局主 Agent 指定该项目执行，并持续跟踪独立复核和最终验收。',
            requires_code_changes: requiresCodeChanges,
            requires_verification: true,
            requires_independent_review: true,
          }],
          acceptance: '项目执行成员必须说明实际动作、文件变化、已执行验证和风险；TestAgent 独立复核和主 Agent 完成前抽查通过后才能输出最终总结。',
          requires_code_changes: requiresCodeChanges,
          requires_verification: true,
          requires_independent_review: true,
          single_project_supervision: {
            schema: 'ccm-global-single-project-supervision-v1',
            project,
            independent_review_required: true,
            post_review_spot_check_required: true,
          },
        },
      })
      toast.success(`${project} 已进入持续监督`)
    } else if (action.type === 'send_group_cmd') {
      const groupId = getActionParam(action, 'group_id', 'groupId')
      const message = getActionParam(action, 'message', 'prompt', 'command')
      const targetProject = getActionParam(action, 'target_project', 'targetProject') || 'coordinator'
      toast.info(`正在向群聊协调者 [${groupId}] 安排指令...`)
      addAssistantMessage(systemResultMessage('⚙️', `正在向群聊协作组 [ID: ${groupId}] 安排协作指令：\n> "${message}"`))

      try {
        const groupRes = await fetch('/api/groups/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            group_id: groupId,
            target_project: targetProject,
            message,
            message_mode: 'project_task',
            force_task: true,
            auto_execute: true,
            requires_code_changes: inferGlobalProjectCommandRequiresCodeChanges(message),
            global_direct_dispatch: {
              schema: 'ccm-global-direct-dispatch-v1',
              source: 'global-agent-web-direct-dispatch',
              session_id: currentSessionId.value,
              original_text: message,
              user_goal: message,
            },
          })
        })
        const groupData = await groupRes.json()
        if (groupData.success) {
          addAssistantMessage('协作群已收到任务并进入任务链路。\n\n当前只是已派发，不代表最终完成；计划、执行、验收和最终总结会在任务卡中持续更新。')
        } else {
          addAssistantMessage(`❌ [安排协作指令失败]: ${groupData.error || '未知原因'}`)
        }
      } catch (err) {
        addAssistantMessage('❌ 安排协作指令到群聊时，网络连接出错')
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
        addAssistantMessage(systemResultMessage('⏰', `定时任务「${name}」已成功配置并创建！\n- **周期表达式**: \`${schedule}\`\n- **目标类型**: ${targetType === 'group' ? '群聊' : '项目'}\n- **执行提示词**: "${prompt}"`))
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
        addAssistantMessage(systemResultMessage('🚀', `项目「${project}」已${isStart ? '启动' : '停止'}。\n- **动作**: ${isStart ? '启动项目' : '停止项目'}\n- **运行时**: ${agent}${detail}`))
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
        addAssistantMessage(systemResultMessage('📂', `项目「${action.params.name}」已成功创建并绑定！\n- **物理路径**: \`${action.params.work_dir}\`\n- **内置 Agent 运行时**: \`${action.params.agent || 'claudecode'}\``))
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
        addAssistantMessage(systemResultMessage('📚', `对话模板「${action.params.name}」已成功创建并保存！\n- **分类**: ${action.params.category || 'custom'}\n- **模板内容**:\n> ${templateContent}`))
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
  pollBridgeRequests()
  bridgePollTimer = setInterval(pollBridgeRequests, 1500)
  globalHistorySyncTimer = setInterval(syncGlobalHistoryFromServer, 5000)
})

onUnmounted(() => {
  if (bridgePollTimer) clearInterval(bridgePollTimer)
  if (globalHistorySyncTimer) clearInterval(globalHistorySyncTimer)
  for (const timer of missionPollTimers.values()) clearInterval(timer)
  missionPollTimers.clear()
  detachGlobalResizeObserver()
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
      @toggle="isSidebarOpen = !isSidebarOpen"
      @expand="isSidebarOpen = true"
      @select-session="selectSession"
      @delete-session="deleteSession"
      @clear-all="clearAllSessions"
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
        <div v-if="controlCenterLoading && !controlCenter" class="control-loading">正在读取 CCM 总控状态...</div>
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
      
      <div class="chat-body" ref="chatBody" @scroll="updateScrollState">
        <div ref="chatContentInner" style="display: flex; flex-direction: column; gap: 24px; width: 100%;">
          <div class="chat-flow" :key="currentSessionId" style="display: flex; flex-direction: column; gap: 24px; width: 100%;">
            <div 
              v-for="(msg, index) in messages" 
              :key="index"
              :id="'msg-' + index"
              class="chat-bubble-wrapper"
              :class="[msg.role, { 'search-hit': searchHighlightMsgIndex === index }]"
              :data-message-type="msg.type || undefined"
              :data-message-id="msg.id || undefined"
            >
            <div class="avatar">{{ msg.role === 'user' ? '👤' : '🤖' }}</div>
            <div class="chat-bubble">
              <!-- 助手消息判定 -->
              <template v-if="msg.role === 'assistant'">
                <div
                  v-if="msg.type === 'command_result'"
                  class="global-command-result"
                >
                  <CommandResultCard :result="msg.commandResult" />
                </div>
                <div
                  v-else-if="msg.type === 'global_stream' && !globalExecutionIntentConfirmed(msg)"
                  class="global-stream-replying"
                  :data-run-id="msg.agenticRun?.id || undefined"
                  aria-live="polite"
                >
                  <span class="stream-dot" :class="{ active: msg.streaming }"></span>
                  <span>{{ msg.streaming ? '正在回复...' : '回复已完成' }}</span>
                </div>
                <div
                  v-else-if="msg.type === 'global_stream'"
                  class="global-stream-card"
                  :data-run-id="msg.agenticRun?.id || undefined"
                >
                  <div class="global-stream-head">
                    <span class="stream-dot" :class="{ active: msg.streaming }"></span>
                    <div>
                      <strong>{{ globalStreamHeaderTitle(msg) }}</strong>
                      <p>{{ globalStreamHeaderSubtitle(msg) }}</p>
                    </div>
                  </div>
                  <div
                    v-for="currentTodo in [buildGlobalStreamCurrentTodoSummary(msg)].filter(Boolean)"
                    :key="currentTodo.step_id || currentTodo.label"
                    class="global-stream-current-todo"
                    :class="globalStreamCurrentTodoTone(currentTodo)"
                  >
                    <span class="stream-todo-label">当前步骤</span>
                    <strong>{{ currentTodo.active_form || currentTodo.label }}</strong>
                    <p v-if="currentTodo.detail">{{ currentTodo.detail }}</p>
                    <div v-if="currentTodo.recent_action || currentTodo.recentAction || currentTodo.needs_action || currentTodo.needsAction" class="stream-todo-post-turn">
                      <span v-if="currentTodo.recent_action || currentTodo.recentAction">最近：{{ currentTodo.recent_action || currentTodo.recentAction }}</span>
                      <span v-if="currentTodo.needs_action || currentTodo.needsAction">需要：{{ currentTodo.needs_action || currentTodo.needsAction }}</span>
                    </div>
                    <small v-if="currentTodo.verification_reminder" class="stream-todo-verification">
                      {{ currentTodo.verification_reminder.title || '还缺验收步骤' }}：{{ currentTodo.verification_reminder.headline || '完成前需要补一项真实验证，或者说明为什么当前不能验证。' }}
                    </small>
                    <small v-if="currentTodo.next_action" class="stream-todo-next">下一步：{{ currentTodo.next_action }}</small>
                    <em class="stream-todo-progress">
                      <span>{{ currentTodo.status_label || '进行中' }}</span>
                      <b>{{ currentTodo.progress_label || `${currentTodo.completed_count || 0}/${currentTodo.total_count || 0}` }}</b>
                    </em>
                  </div>
                  <div
                    v-for="refreshSummary in [globalStreamProgressRefreshSummary(msg)].filter(Boolean)"
                    :key="refreshSummary.schema || refreshSummary.title || 'global-progress-refresh'"
                    class="global-stream-progress-refresh"
                    :class="globalStreamProgressRefreshTone(refreshSummary)"
                  >
                    <span class="stream-refresh-label">{{ refreshSummary.title || '进度刷新提醒' }}</span>
                    <strong>{{ refreshSummary.current_state || refreshSummary.currentState || refreshSummary.headline || '我已整理当前进度刷新状态。' }}</strong>
                    <div v-if="globalStreamProgressRefreshItems(refreshSummary).length" class="stream-refresh-items">
                      <span v-for="item in globalStreamProgressRefreshItems(refreshSummary)" :key="item">{{ item }}</span>
                    </div>
                    <small v-if="refreshSummary.next_action || refreshSummary.nextAction" class="stream-refresh-next">下一步：{{ refreshSummary.next_action || refreshSummary.nextAction }}</small>
                    <em>{{ refreshSummary.status_label || refreshSummary.statusLabel || '已整理' }}</em>
                  </div>
                  <div
                    v-for="toolSummary in [globalStreamToolUseSummary(msg)].filter(Boolean)"
                    :key="toolSummary.schema || toolSummary.title"
                    class="global-stream-tool-summary"
                  >
                    <span class="stream-tool-label">动作摘要</span>
                    <strong>{{ toolSummary.headline || toolSummary.title }}</strong>
                    <small v-if="toolSummary.latest_label">最近：{{ toolSummary.latest_label }}</small>
                    <div class="stream-tool-counts">
                      <span v-if="toolSummary.running_count">进行中 {{ toolSummary.running_count }}</span>
                      <span v-if="toolSummary.completed_count">已返回 {{ toolSummary.completed_count }}</span>
                      <span v-if="toolSummary.failed_count" class="failed">待排查 {{ toolSummary.failed_count }}</span>
                    </div>
                  </div>
                  <details v-if="globalDispatchLaunchRows(msg).length" class="global-stream-dispatch" open>
                    <summary>
                      <div>
                        <strong>{{ globalDispatchLaunchSummary(msg)?.title || '已派发的工作' }}</strong>
                        <span>{{ globalDispatchLaunchSummary(msg)?.count_label || `${globalDispatchLaunchRows(msg).length} 个执行目标` }}</span>
                      </div>
                      <small>展开查看每个目标</small>
                    </summary>
                    <p v-if="globalDispatchLaunchSummary(msg)?.headline">{{ globalDispatchLaunchSummary(msg).headline }}</p>
                    <div class="global-stream-dispatch-list">
                      <article
                        v-for="row in globalDispatchLaunchRows(msg)"
                        :key="row.id || row.agent || row.task"
                        :class="globalDispatchRowClass(row)"
                      >
                        <header>
                          <strong>{{ row.role || '执行成员' }} · {{ row.agent || '待确认目标' }}</strong>
                          <em>{{ row.status_label || '已派发' }}</em>
                        </header>
                        <span>{{ row.task || '已进入执行链路。' }}</span>
                        <small v-if="row.reason">{{ row.reason }}</small>
                        <small v-if="row.depends_on?.length">依赖：{{ row.depends_on.join('、') }}</small>
                      </article>
                    </div>
                    <small v-if="globalDispatchLaunchSummary(msg)?.next_action" class="global-stream-dispatch-next">下一步：{{ globalDispatchLaunchSummary(msg).next_action }}</small>
                  </details>
                  <div class="global-stream-events">
                    <div
                      v-for="(event, eventIndex) in msg.streamEvents || []"
                      :key="eventIndex"
                      class="global-stream-event"
                      :class="event.tone"
                    >
                      <span class="event-icon">{{ event.icon }}</span>
                      <div>
                        <strong>{{ visibleGlobalStreamEventTitle(event.title) }}</strong>
                        <p>{{ visibleGlobalStreamEventText(event.text) }}</p>
                      </div>
                    </div>
                    <div v-if="!(msg.streamEvents || []).length" class="global-stream-event running">
                      <span class="event-icon">🧠</span>
                      <div>
                        <strong>准备中</strong>
                        <p>正在连接全局 Agent...</p>
                      </div>
                    </div>
                  </div>
                  <TaskExperienceCard
                    v-if="getGlobalTaskCard(msg)"
                    class="global-stream-plan-card"
                    :card="getGlobalTaskCard(msg)"
                    context="global"
                    :busy="!!msg.agenticRunLoading"
                    @action="handleGlobalTaskAction(msg, $event)"
                  />
                </div>

                <!-- CCM 系统管理处理结果 -->
                <div v-else-if="msg.type === 'management_action'" class="management-action-card" :class="{ failed: !msg.managementReceipt?.success, cancelled: msg.managementReceipt?.cancelled }">
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
                <TaskExperienceCard
                  v-else-if="getGlobalTaskCard(msg) && isGlobalMissionTaskMessage(msg)"
                  :card="getGlobalTaskCard(msg)"
                  context="global"
                  :busy="!!msg.agenticRunLoading"
                  @action="handleGlobalTaskAction(msg, $event)"
                />

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
                  <div v-else class="review-body" v-html="renderMarkdown(getVisibleGlobalMessageContent(msg, '代码审查报告已整理，技术细节已放入技术详情。'))" style="font-size: 14px; line-height: 1.6; color: #ddd; max-height: 450px; overflow-y: auto; background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.05); padding: 16px; border-radius: 8px;"></div>
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

                <template v-else-if="msg.agenticRun">
                  <TaskExperienceCard
                    v-if="getGlobalTaskCard(msg)"
                    :card="getGlobalTaskCard(msg)"
                    context="global"
                    :busy="!!msg.agenticRunLoading"
                    @action="handleGlobalTaskAction(msg, $event)"
                  />
                  <div v-else class="bubble-content">{{ getVisibleGlobalMessageContent(msg) }}</div>
                  <details v-if="runtimeDebugSections(msg).length" class="global-runtime-debug">
                    <summary class="runtime-debug-head">
                      <strong>技术详情</strong>
                      <small>可展开排查</small>
                    </summary>
                    <div class="runtime-debug-grid">
                      <section v-for="section in runtimeDebugSections(msg)" :key="section.id" class="runtime-debug-section">
                        <strong>{{ section.title }}</strong>
                        <div v-for="row in section.items" :key="`${section.id}-${row.label}`">
                          <span>{{ row.label }}</span>
                          <code>{{ row.value }}</code>
                        </div>
                      </section>
                    </div>
                  </details>
                </template>

                <!-- 1. 处理结果高阶卡片 -->
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
                <div v-else class="bubble-content">{{ getVisibleGlobalMessageContent(msg) }}</div>
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
          <div v-if="isSending && (!currentSession?.messages?.length || currentSession.messages[currentSession.messages.length - 1].role !== 'assistant')" class="chat-bubble-wrapper assistant typing">
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

      <MessageNavigator
        :items="navMessages"
        :scroll-container="chatBody"
        target-id-prefix="msg-"
        @navigate="scrollToMessage"
      />
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

        <ConversationTurnControls
          :busy="globalTurnBusy"
          v-model:mode="globalTurnControl.mode.value"
          :turns="globalTurnControl.turns.value"
          :stopping="stoppingGlobalTurn"
          compact
          @stop="stopGlobalCurrentWork"
          @cancel="globalTurnControl.cancel"
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
            :disabled="isSending || !!pendingGlobalMissionInput"
          />
          <button
            class="attach-btn"
            @click="triggerFileUpload"
            :title="pendingGlobalMissionInput ? '当前正在补充任务条件，请先提交文字信息' : isSending ? '当前任务执行中，附件请在下一条消息发送' : '上传图片或文件附件'"
            :disabled="isSending || !!pendingGlobalMissionInput"
          >
            <svg class="icon-attach" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
          <input 
            type="text" 
            ref="chatInputElement"
            v-model="chatInput" 
            :placeholder="globalInputPlaceholder"
            @input="handleGlobalInput"
            @keydown="handleGlobalInputKeydown"
          />
          <SlashCommandMenu
            :open="slash.open"
            :commands="slash.filtered"
            :active-index="slash.activeIndex"
            :loading="slash.loading"
            :query="slash.query"
            @select="slash.select"
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

<style scoped>
.global-assistant-panel {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--surface);
  display: flex;
  font-family: inherit;
  transition: background 0.2s ease;
}

:global([data-theme="dark"] .global-assistant-panel){
  background: var(--surface);
}

/* 右侧主聊天区 */
.chat-container {
  flex: 1;
  position: relative;
  z-index: 1;
  height: 100%;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  min-width: 0;
  transition: background 0.3s;
}
:global([data-theme="dark"] .chat-container){
  background: var(--surface);
}

.chat-header {
  min-height: 58px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--surface);
  z-index: 4;
  transition: background 0.3s;
}
:global([data-theme="dark"] .chat-header){
  background: var(--surface);
  border-bottom-color: var(--border-color);
}

.header-logo {
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  border: 1px solid color-mix(in srgb, var(--accent-blue) 24%, transparent);
  border-radius: 7px;
  background: var(--accent-soft);
  color: var(--accent-blue);
  display: flex;
  align-items: center;
  justify-content: center;
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
:global([data-theme="dark"] .avatar){
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
:global([data-theme="dark"] .chat-bubble){
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

.global-header-menu{position:relative}.global-header-menu summary{width:34px;height:34px;display:grid;place-items:center;list-style:none;border:1px solid var(--border-color);border-radius:6px;background:var(--surface);color:var(--text-secondary);cursor:pointer}.global-header-menu summary::-webkit-details-marker{display:none}.global-header-menu[open] summary,.global-header-menu summary:hover{background:var(--control-hover);border-color:var(--border-strong);color:var(--text-primary)}.global-header-menu-popover{position:absolute;top:calc(100% + 6px);right:0;z-index:30;min-width:156px;padding:5px;border:1px solid var(--border-color);border-radius:7px;background:var(--surface);box-shadow:var(--shadow-md)}.global-header-menu-popover button{width:100%;min-height:32px;display:flex;align-items:center;gap:8px;padding:0 9px;border:0;border-radius:5px;background:transparent;color:var(--text-secondary);font:inherit;font-size:11px;text-align:left;cursor:pointer}.global-header-menu-popover button:hover{background:var(--control-hover);color:var(--text-primary)}.global-header-menu-popover button:disabled{opacity:.55;cursor:not-allowed}

.global-stream-replying {
  display: inline-flex;
  min-width: 112px;
  align-items: center;
  gap: 9px;
  padding: 8px 2px;
  color: var(--text-muted);
  font-size: 13px;
}

.global-stream-card {
  min-width: min(520px, 72vw);
  padding: 13px;
  border: 1px solid rgba(99, 102, 241, 0.18);
  border-radius: 12px;
  background:
    radial-gradient(circle at 12% 0%, rgba(99, 102, 241, 0.13), transparent 34%),
    rgba(15, 23, 42, 0.03);
}

.global-stream-head {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.global-stream-head strong {
  display: block;
  color: var(--text-primary);
  font-size: 13px;
}

.global-stream-head p {
  margin: 2px 0 0;
  color: var(--text-muted);
  font-size: 11px;
}

.global-stream-current-todo {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 3px 12px;
  margin-top: 10px;
  padding: 9px 10px;
  border: 1px solid rgba(37, 99, 235, 0.18);
  border-radius: 10px;
  background: rgba(239, 246, 255, 0.72);
}

.global-stream-current-todo.done {
  border-color: rgba(34, 197, 94, 0.2);
  background: rgba(240, 253, 244, 0.74);
}

.global-stream-current-todo.waiting {
  border-color: rgba(245, 158, 11, 0.24);
  background: rgba(255, 251, 235, 0.78);
}

.global-stream-current-todo.failed {
  border-color: rgba(239, 68, 68, 0.22);
  background: rgba(254, 242, 242, 0.78);
}

.stream-todo-label,
.global-stream-current-todo strong,
.global-stream-current-todo p,
.stream-todo-verification,
.stream-todo-post-turn,
.stream-todo-next {
  grid-column: 1;
  min-width: 0;
}

.stream-todo-label {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 900;
}

.global-stream-current-todo strong {
  color: var(--text-primary);
  font-size: 12.5px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.global-stream-current-todo p,
.stream-todo-next {
  margin: 0;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.stream-todo-next {
  color: var(--accent-blue);
  font-weight: 800;
}

.stream-todo-post-turn {
  display: grid;
  gap: 3px;
}

.stream-todo-post-turn span {
  color: var(--text-muted);
  font-size: 10.5px;
  font-weight: 800;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.stream-todo-verification {
  display: block;
  padding: 5px 7px;
  border-radius: 7px;
  border: 1px solid rgba(245, 158, 11, 0.22);
  background: rgba(255, 251, 235, 0.82);
  color: #92400e;
  font-size: 10.5px;
  line-height: 1.35;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.stream-todo-progress {
  grid-column: 2;
  grid-row: 1 / span 5;
  align-self: start;
  justify-self: end;
  display: grid;
  gap: 3px;
  justify-items: end;
  font-style: normal;
}

.stream-todo-progress span {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 900;
  white-space: nowrap;
}

.stream-todo-progress b {
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--text-primary);
  font-size: 10px;
  font-weight: 900;
  white-space: nowrap;
}

.global-stream-progress-refresh {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px 12px;
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(245, 158, 11, 0.24);
  border-radius: 10px;
  background: rgba(255, 251, 235, 0.78);
}

.global-stream-progress-refresh.active {
  border-color: rgba(37, 99, 235, 0.22);
  background: rgba(239, 246, 255, 0.76);
}

.global-stream-progress-refresh.failed {
  border-color: rgba(239, 68, 68, 0.22);
  background: rgba(254, 242, 242, 0.78);
}

.stream-refresh-label,
.global-stream-progress-refresh strong,
.stream-refresh-next {
  grid-column: 1;
  min-width: 0;
}

.stream-refresh-label {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 900;
}

.global-stream-progress-refresh strong {
  color: var(--text-primary);
  font-size: 12.5px;
  line-height: 1.42;
  overflow-wrap: anywhere;
}

.stream-refresh-items {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 2px;
}

.stream-refresh-items span {
  max-width: 100%;
  padding: 2px 7px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  color: var(--text-muted);
  font-size: 10.5px;
  font-weight: 800;
  overflow-wrap: anywhere;
}

.stream-refresh-next {
  color: var(--accent-blue);
  font-size: 11px;
  font-weight: 800;
  line-height: 1.35;
}

.global-stream-progress-refresh em {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: start;
  justify-self: end;
  color: var(--text-muted);
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
  white-space: nowrap;
}

.global-stream-tool-summary {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 3px 10px;
  margin-top: 8px;
  padding: 8px 10px;
  border: 1px solid rgba(20, 184, 166, 0.18);
  border-radius: 10px;
  background: rgba(240, 253, 250, 0.7);
}

.stream-tool-label,
.global-stream-tool-summary strong,
.global-stream-tool-summary small {
  grid-column: 1;
  min-width: 0;
}

.stream-tool-label {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 900;
}

.global-stream-tool-summary strong {
  color: var(--text-primary);
  font-size: 12px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.global-stream-tool-summary small {
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.stream-tool-counts {
  grid-column: 2;
  grid-row: 1 / span 3;
  align-self: start;
  justify-self: end;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
  max-width: 160px;
}

.stream-tool-counts span {
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  color: #0f766e;
  font-size: 10px;
  font-weight: 900;
  white-space: nowrap;
}

.stream-tool-counts span.failed {
  color: #dc2626;
}

.global-stream-dispatch {
  margin-top: 10px;
  border: 1px solid rgba(14, 165, 233, 0.18);
  border-radius: 10px;
  background: rgba(240, 249, 255, 0.72);
  overflow: hidden;
}

.global-stream-dispatch > summary {
  list-style: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 10px;
  cursor: pointer;
  user-select: none;
}

.global-stream-dispatch > summary::-webkit-details-marker {
  display: none;
}

.global-stream-dispatch > summary::after {
  content: '⌄';
  flex: 0 0 auto;
  color: #0284c7;
  font-size: 13px;
  font-weight: 900;
  transform: rotate(-90deg);
  transition: transform 0.18s ease;
}

.global-stream-dispatch[open] > summary::after {
  transform: rotate(0deg);
}

.global-stream-dispatch summary div {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.global-stream-dispatch summary strong {
  color: #0f172a;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-stream-dispatch summary span {
  flex: 0 0 auto;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(14, 165, 233, 0.12);
  color: #0369a1;
  font-size: 10px;
  font-weight: 900;
  white-space: nowrap;
}

.global-stream-dispatch summary small {
  flex: 0 0 auto;
  color: #64748b;
  font-size: 10.5px;
  font-weight: 800;
  white-space: nowrap;
}

.global-stream-dispatch p {
  margin: 0;
  padding: 0 10px 8px;
  color: #334155;
  font-size: 11.5px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.global-stream-dispatch-list {
  display: grid;
  gap: 7px;
  padding: 0 10px 10px;
}

.global-stream-dispatch article {
  min-width: 0;
  display: grid;
  gap: 4px;
  padding: 8px 9px;
  border: 1px solid rgba(14, 165, 233, 0.14);
  border-left: 3px solid #0ea5e9;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.76);
}

.global-stream-dispatch article.ok {
  border-left-color: #22c55e;
}

.global-stream-dispatch article.waiting {
  border-left-color: #f59e0b;
}

.global-stream-dispatch article.error {
  border-left-color: #ef4444;
}

.global-stream-dispatch header {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.global-stream-dispatch article strong {
  color: #075985;
  font-size: 11.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.global-stream-dispatch article em {
  flex: 0 0 auto;
  color: #0f766e;
  font-size: 10px;
  font-style: normal;
  font-weight: 900;
  white-space: nowrap;
}

.global-stream-dispatch article span,
.global-stream-dispatch article small,
.global-stream-dispatch-next {
  color: #475569;
  font-size: 11px;
  line-height: 1.42;
  overflow-wrap: anywhere;
}

.global-stream-dispatch-next {
  display: block;
  padding: 0 10px 10px;
  color: #1d4ed8;
  font-weight: 800;
}

.stream-dot {
  width: 9px;
  height: 9px;
  margin-top: 4px;
  border-radius: 999px;
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.1);
}

.stream-dot.active {
  animation: streamPulse 1.1s ease-in-out infinite;
}

.global-stream-events {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}

.global-stream-event {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 8px;
  padding: 8px 9px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 10px;
  background: rgba(148, 163, 184, 0.06);
}

.global-stream-event strong {
  display: block;
  color: var(--text-primary);
  font-size: 12px;
}

.global-stream-event p {
  margin: 2px 0 0;
  color: var(--text-secondary);
  font-size: 11.5px;
  line-height: 1.45;
}

.global-stream-event.running { border-color: rgba(59, 130, 246, 0.2); background: rgba(59, 130, 246, 0.07); }
.global-stream-event.ok { border-color: rgba(34, 197, 94, 0.2); background: rgba(34, 197, 94, 0.07); }
.global-stream-event.waiting { border-color: rgba(245, 158, 11, 0.24); background: rgba(245, 158, 11, 0.08); }
.global-stream-event.error { border-color: rgba(239, 68, 68, 0.24); background: rgba(239, 68, 68, 0.08); }

.global-stream-plan-card {
  margin-top: 10px;
}

:global([data-theme="dark"] .global-stream-dispatch){
  border-color: rgba(56, 189, 248, 0.24);
  background: rgba(15, 23, 42, 0.72);
}

:global([data-theme="dark"] .global-stream-current-todo){
  border-color: rgba(96, 165, 250, 0.24);
  background: rgba(30, 41, 59, 0.72);
}

:global([data-theme="dark"] .global-stream-current-todo.done){
  border-color: rgba(34, 197, 94, 0.26);
  background: rgba(20, 83, 45, 0.28);
}

:global([data-theme="dark"] .global-stream-current-todo.waiting){
  border-color: rgba(245, 158, 11, 0.3);
  background: rgba(120, 53, 15, 0.28);
}

:global([data-theme="dark"] .global-stream-current-todo.failed){
  border-color: rgba(248, 113, 113, 0.28);
  background: rgba(127, 29, 29, 0.28);
}

:global([data-theme="dark"] .stream-todo-progress b){
  background: rgba(15, 23, 42, 0.72);
}

:global([data-theme="dark"] .stream-todo-verification){
  border-color: rgba(245, 158, 11, 0.32);
  background: rgba(120, 53, 15, 0.34);
  color: #fde68a;
}

:global([data-theme="dark"] .global-stream-progress-refresh){
  border-color: rgba(245, 158, 11, 0.3);
  background: rgba(120, 53, 15, 0.28);
}

:global([data-theme="dark"] .global-stream-progress-refresh.active){
  border-color: rgba(96, 165, 250, 0.24);
  background: rgba(30, 41, 59, 0.72);
}

:global([data-theme="dark"] .global-stream-progress-refresh.failed){
  border-color: rgba(248, 113, 113, 0.28);
  background: rgba(127, 29, 29, 0.28);
}

:global([data-theme="dark"] .global-stream-progress-refresh :is(strong, .stream-refresh-next)){
  color: #93c5fd;
}

:global([data-theme="dark"] .global-stream-progress-refresh :is(.stream-refresh-label, em, .stream-refresh-items span)){
  color: #cbd5e1;
}

:global([data-theme="dark"] .global-stream-tool-summary){
  border-color: rgba(45, 212, 191, 0.24);
  background: rgba(20, 83, 45, 0.18);
}

:global([data-theme="dark"] .stream-tool-counts span){
  background: rgba(15, 23, 42, 0.72);
  color: #5eead4;
}

:global([data-theme="dark"] .stream-tool-counts span.failed){
  color: #fca5a5;
}

:global([data-theme="dark"] .global-stream-dispatch article){
  border-color: rgba(56, 189, 248, 0.18);
  background: rgba(2, 6, 23, 0.62);
}

:global([data-theme="dark"] .global-stream-dispatch :is(summary strong, article strong, .global-stream-dispatch-next)){
  color: #93c5fd;
}

:global([data-theme="dark"] .global-stream-dispatch :is(summary small, p, article span, article small, article em)){
  color: #cbd5e1;
}

.event-icon {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
}

@keyframes streamPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.35); opacity: 0.68; }
}

@media (max-width: 620px) {
  .global-stream-card {
    min-width: 0;
  }

  .global-stream-current-todo {
    grid-template-columns: minmax(0, 1fr);
  }

  .global-stream-progress-refresh {
    grid-template-columns: minmax(0, 1fr);
  }

  .global-stream-progress-refresh em {
    grid-column: 1;
    grid-row: auto;
    justify-self: start;
  }

  .global-stream-tool-summary {
    grid-template-columns: minmax(0, 1fr);
  }

  .stream-todo-progress {
    grid-column: 1;
    grid-row: auto;
    justify-self: start;
    grid-auto-flow: column;
    align-items: center;
  }

  .stream-tool-counts {
    grid-column: 1;
    grid-row: auto;
    justify-self: start;
    max-width: none;
  }
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
:global([data-theme="dark"] .attachment-card){
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

/* === 处理结果卡片 (System Result Card) === */
.system-receipt-card {
  border-left: 4px solid #6366f1;
  background: rgba(99, 102, 241, 0.03);
  border-radius: 6px 12px 12px 6px;
  padding: 12px 16px;
  min-width: 280px;
  max-width: 450px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.01);
}
:global([data-theme="dark"] .system-receipt-card){
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
:global([data-theme="dark"] .input-wrapper){
  background: rgba(20, 20, 30, 0.75);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}
.input-wrapper:focus-within {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.18);
  background: rgba(255, 255, 255, 0.9);
}
.input-wrapper.steering-mode {
  border-color: rgba(14, 116, 144, 0.48);
  box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.12);
}
:global([data-theme="dark"] .input-wrapper:focus-within){
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
.attach-btn:disabled {
  cursor: not-allowed;
  color: var(--text-muted);
  opacity: 0.55;
}
.attach-btn:disabled .icon-attach {
  transform: none;
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
  min-width: 92px;
  justify-content: center;
}
.send-btn.steering-submit {
  background: linear-gradient(135deg, #0f766e, #0891b2);
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
:global([data-theme="dark"] .runner-text){
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
.quality-header-actions{margin-left:auto;display:flex;align-items:center;gap:8px}.quality-mode{font-size:11px;padding:4px 8px;border-radius:999px;background:rgba(34,197,94,.12);color:#22c55e}.quality-mode.shadow{background:rgba(245,158,11,.14);color:#f59e0b}.quality-center-card,.global-control-center{margin:10px 18px 0;padding:14px;border:1px solid var(--border-color);border-radius:8px;background:var(--surface);position:relative;z-index:2}.quality-center-head,.control-center-head{display:flex;justify-content:space-between;align-items:center;gap:12px}.quality-center-head>div,.control-center-head>div{display:flex;flex-direction:column;gap:3px}.quality-center-head span,.control-center-head span{font-size:9px;letter-spacing:.12em;color:var(--text-muted)}.quality-center-head strong,.control-center-head strong{font-size:15px}.quality-metrics,.control-metrics{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:7px;margin-top:11px}.quality-metrics{grid-template-columns:repeat(7,minmax(90px,1fr))}.quality-metrics>div,.control-metrics>div{padding:9px;border-radius:7px;background:var(--bg-primary);display:flex;flex-direction:column;gap:4px}.quality-metrics span,.control-metrics span{font-size:9px;color:var(--text-muted)}.quality-metrics strong,.control-metrics strong{font-size:16px}.control-metrics small{color:var(--text-muted);font-size:10px}.quality-center-card>p{margin:10px 0 0;font-size:10px;color:var(--text-muted)}
.intent-preview-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-top:12px}.intent-preview-row input,.governance-form input,.governance-form select{min-width:0;border:1px solid var(--border-color);border-radius:7px;background:var(--bg-primary);color:var(--text-primary);font-size:12px;padding:7px 9px}.control-loading{margin-top:12px;color:var(--text-muted);font-size:12px}.control-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px}.control-grid>section,.supervision-console{padding:11px;border:1px solid rgba(148,163,184,.18);border-radius:8px;background:rgba(148,163,184,.045)}.control-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.control-section-head strong{font-size:13px;color:var(--text-primary)}.control-section-head span{font-size:10px;color:var(--text-muted)}.health-list,.dispatch-targets,.rule-list,.supervision-list{display:grid;gap:6px}.health-row,.dispatch-targets>div,.rule-list>div,.supervision-row{display:grid;gap:3px;padding:8px;border-radius:7px;background:rgba(255,255,255,.055);border-left:3px solid rgba(34,197,94,.75)}.health-row.warn,.supervision-row.waiting{border-left-color:#f59e0b}.health-row.error,.supervision-row.failed{border-left-color:#ef4444}.health-row span,.dispatch-targets span,.rule-list span,.supervision-row span{color:var(--text-muted);font-size:10px}.health-row strong,.dispatch-targets strong,.rule-list strong,.supervision-row strong{color:var(--text-secondary);font-size:11.5px;overflow-wrap:anywhere}.dispatch-targets small{color:var(--text-muted);font-size:10px}.dispatch-targets p,.control-reason{margin:0;color:var(--text-secondary);font-size:11px;line-height:1.45}.governance-form{display:grid;grid-template-columns:80px minmax(0,1fr) minmax(0,1fr) auto;gap:6px;margin-bottom:8px}.rule-list>div{grid-template-columns:58px minmax(0,1fr) auto;align-items:center}.rule-list button,.supervision-actions button{border:1px solid var(--border-color);border-radius:6px;background:transparent;color:var(--text-secondary);font-size:10px;padding:4px 7px;cursor:pointer}.supervision-console{margin-top:10px}.supervision-row{grid-template-columns:minmax(0,1fr) auto;align-items:center}.supervision-actions{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}

.agentic-run-card {
  width: 100%;
  padding: 16px;
  border: 1px solid rgba(59, 130, 246, 0.28);
  border-radius: 10px;
  background: transparent;
}
.agentic-run-card.run-waiting_confirmation { border-color: rgba(245, 158, 11, 0.55); }
.agentic-run-card.run-supervising { border-color: rgba(59, 130, 246, 0.58); box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.08) inset; }
.agentic-run-card.run-failed { border-color: rgba(239, 68, 68, 0.55); }
.agentic-run-card.run-completed { border-color: rgba(34, 197, 94, 0.42); }
.agentic-run-head,
.agentic-run-actions,
.agentic-run-metrics {
  display: flex;
  align-items: center;
  gap: 10px;
}
.agentic-run-head { justify-content: space-between; margin-bottom: 12px; }
.agentic-run-head > div { display: flex; flex-direction: column; gap: 3px; }
.agentic-run-head span { color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: .08em; }
.agentic-run-head code { color: var(--text-muted); font-size: 11px; }
.agentic-run-metrics { flex-wrap: wrap; margin-top: 12px; color: var(--text-muted); font-size: 12px; }
.agentic-run-metrics span { padding: 4px 7px; border-radius: 5px; background: rgba(255,255,255,.05); }
.agentic-decision-summary{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;padding:9px;border-radius:7px;background:rgba(59,130,246,.07)}.agentic-decision-summary span{font-size:10px;color:var(--text-muted)}.agentic-decision-summary p{width:100%;margin:2px 0 0;font-size:11px;color:var(--text-secondary)}.agentic-clarification{margin-top:10px;padding:10px;border-radius:7px;background:rgba(245,158,11,.1);color:#f59e0b;font-size:12px;line-height:1.5}
@media (max-width:1100px){.quality-metrics,.control-metrics{grid-template-columns:repeat(2,minmax(90px,1fr))}.control-grid{grid-template-columns:1fr}.governance-form{grid-template-columns:1fr 1fr}.supervision-row{grid-template-columns:1fr}.supervision-actions{justify-content:flex-start}}
@media (max-width:768px){.chat-header{min-height:52px;padding:7px 8px}.header-logo{width:34px;height:34px}.header-title{min-width:0;flex:1}.header-title h3{font-size:14px}.header-title p{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.message-count{display:none}.quality-header-actions{gap:5px}.quality-header-actions>.btn{width:34px;padding:0;font-size:0}.quality-header-actions>.btn svg{width:15px;height:15px}.quality-mode{display:none}.chat-body{padding:14px;gap:16px}}
.agentic-run-actions { justify-content: flex-end; margin-top: 14px; }
.global-runtime-debug {
  width: 100%;
  margin-top: 10px;
  padding: 11px;
  border: 1px solid rgba(20, 184, 166, 0.2);
  border-radius: 8px;
  background: rgba(20, 184, 166, 0.045);
}
.runtime-debug-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 0;
  cursor: pointer;
  user-select: none;
}
.global-runtime-debug[open] .runtime-debug-head { margin-bottom: 9px; }
.runtime-debug-head strong {
  color: var(--text-primary);
  font-size: 12px;
}
.runtime-debug-head small {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 700;
}
.runtime-debug-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 7px;
}
.runtime-debug-section {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 8px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.05);
}
.runtime-debug-section > strong {
  color: var(--text-primary);
  font-size: 11.5px;
}
.runtime-debug-grid div {
  min-width: 0;
  padding: 7px 8px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
}
.runtime-debug-grid span {
  display: block;
  margin-bottom: 3px;
  color: var(--text-muted);
  font-size: 10px;
}
.runtime-debug-grid code {
  display: block;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.4;
  overflow-wrap: anywhere;
  font-family: inherit;
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

.chat-bubble-wrapper.search-hit .chat-bubble {
  outline: 2px solid color-mix(in srgb, var(--accent-blue) 55%, transparent);
  outline-offset: 3px;
}
</style>
