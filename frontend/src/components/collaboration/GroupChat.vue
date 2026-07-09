<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch, inject, computed } from 'vue'
import { groupsApi, projectsApi } from '../../api/index.js'
import { toast, confirmDialog } from '../../utils/toast.js'
import ChatComposer from '../common/ChatComposer.vue'
import CommandResultCard from '../common/CommandResultCard.vue'
import MessageNavigator from '../common/MessageNavigator.vue'
import ConflictPlanMessage from './ConflictPlanMessage.vue'
import ProjectTaskIntakeMessage from './ProjectTaskIntakeMessage.vue'
import TaskCollaborationCard from './TaskCollaborationCard.vue'
import AgentCodeChangeDrawer from '../agents/AgentCodeChangeDrawer.vue'
import AgentExecutionMessage from '../agents/AgentExecutionMessage.vue'
import AgentQaMessage from '../agents/AgentQaMessage.vue'
import GroupMainAgentStatusCard from './GroupMainAgentStatusCard.vue'
import MainAgentDecisionCard from '../agents/MainAgentDecisionCard.vue'
import GroupChatHeader from './GroupChatHeader.vue'
import GroupLogsModal from './GroupLogsModal.vue'
import GroupToolsModal from './GroupToolsModal.vue'
import GroupSharedFilesModal from './GroupSharedFilesModal.vue'
import GroupMembersModal from './GroupMembersModal.vue'
import GroupCreateModal from './GroupCreateModal.vue'
import GroupRenameModal from './GroupRenameModal.vue'
import UnifiedDiffModal from '../common/UnifiedDiffModal.vue'
import TemplateVariablesModal from '../common/TemplateVariablesModal.vue'
import AgentPipelineModal from '../agents/AgentPipelineModal.vue'
import { useSlashCommands } from '../../composables/useSlashCommands.js'
import { createGroupTaskCardActionHandler } from '../../composables/useGroupTaskCardActions.js'
import { useChatTemplates } from '../../composables/useChatTemplates.js'
import { useCodeChangeDrawer } from '../../composables/useCodeChangeDrawer.js'
import { useMessageNavigation } from '../../composables/useMessageNavigation.js'
import { usePinnedScroll } from '../../composables/usePinnedScroll.js'
import { downloadCommandJson } from '../../utils/commandExport.js'
import { buildGroupConversationKnowledgePayload, postKnowledgeCapture } from '../../utils/knowledgeCapture.js'
import { normalizeTestAgentExecutionPlanSummary, sanitizeUserFacingAgentText, sanitizeUserFacingLegacyTerminology, sanitizeUserFacingPlanText, sanitizeUserFacingStructure } from '../../utils/agentDisplay.js'

const props = defineProps({ navigateTo: { type: Object, default: null } })
const emit = defineEmits(['navigated'])

const GROUP_VISIBLE_INTERNAL_TEXT_PATTERN = /CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|<\s*\/?\s*task-notification|task-notification|receipt[-_\s]*status|trace_id|session_id|WorkerContextPacket|raw\s+receipt|raw\s+payload|raw_report|scratchpad|Runtime Kernel|workflow_timeline/i
const GROUP_INTERNAL_PROTOCOL_FALLBACK = '执行成员已提交技术执行信息，我正在整理用户可读结论。'
const sanitizeGroupVisibleText = (value, fallback = '我正在处理当前请求。', max = 4000) => {
  const raw = String(value || '')
  if (!raw) return ''
  if (GROUP_VISIBLE_INTERNAL_TEXT_PATTERN.test(raw)) {
    const visible = sanitizeUserFacingLegacyTerminology(sanitizeUserFacingAgentText(raw, GROUP_INTERNAL_PROTOCOL_FALLBACK, Math.min(max, 1200)))
    return sanitizeUserFacingPlanText(visible, fallback || GROUP_INTERNAL_PROTOCOL_FALLBACK, Math.min(max, 1200))
  }
  const text = sanitizeUserFacingPlanText(raw, fallback, max)
  return text.length > max ? `${text.slice(0, max)}...` : text
}
function getVisibleGroupMessageContent(msg, fallback = '我已整理这条消息。') {
  if (!msg) return ''
  if (msg.role === 'user') return String(msg.content || '')
  return sanitizeGroupVisibleText(msg.content, fallback, 4000)
}

// 处理搜索结果跳转
const handleGroupNavigation = async () => {
  const target = props.navigateTo
  if (!target || target.tab !== 'groups') return
  await nextTick()
  if (target.groupId) {
    await selectGroup(target.groupId)
    
    if (target.autoMessage) {
      await nextTick()
      newMessage.value = target.autoMessage
      await nextTick()
      sendMessage()
    } else if (target.keyword) {
      await nextTick()
      const kw = target.keyword.toLowerCase()
      const idx = messages.value.findIndex(m => (m.content || '').toLowerCase().includes(kw))
      if (idx !== -1) {
        highlightMsgIndex.value = idx
        const el = document.getElementById(`gc-msg-${idx}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => { highlightMsgIndex.value = -1 }, 3000)
      }
    }
  }
  emit('navigated')
}

watch(() => props.navigateTo, () => {
  if (props.navigateTo) setTimeout(handleGroupNavigation, 100)
}, { immediate: true })

const highlightMsgIndex = ref(-1)

// 数据
const groups = ref([])
const projects = ref([])
const currentGroup = ref(null)
const messages = ref([])
const groupMemory = ref(null)
const mainAgentStatus = ref(null)
const groupAgentQa = ref([])
const collaborationProtocol = ref(null)
const groupMessagesEl = ref(null)
const groupMessagesContentEl = ref(null)
const {
  isPinnedToBottom: isGroupMessagesPinnedToBottom,
  updateScrollState: updateGroupMessageScrollState,
  scrollToBottom,
  attachResizeObserver: attachGroupMessagesResizeObserver,
  detachResizeObserver: detachGroupMessagesResizeObserver,
} = usePinnedScroll(groupMessagesEl, { observeRef: groupMessagesContentEl })
const { navMessages } = useMessageNavigation(messages, { getAssistantContent: (message) => getVisibleGroupMessageContent(message, '这条回复已整理，技术细节已放入技术详情。') })

const scrollToMessage = (originalIndex) => {
  const el = document.getElementById(`gc-msg-${originalIndex}`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}
const newMessage = ref('')
const slashNavigate = inject('slashNavigate', () => {})
const runGroupClientCommand = async (action) => {
  if (action === 'context') {
    const chars = messages.value.reduce((sum, item) => sum + String(item.content || '').length, 0)
    return {
      success: true,
      summary: `群聊“${currentGroup.value?.name || '未选择'}”当前加载了 ${messages.value.length} 条消息。`,
      metrics: { 群聊: currentGroup.value?.name, 群聊ID: currentGroup.value?.id, 消息: messages.value.length, 成员: currentGroup.value?.members?.length || 0, 估算Token: Math.ceil(chars / 4) },
      items: messages.value.slice(-8).reverse().map(item => ({ title: item.agent || item.role || '消息', detail: String(item.content || item.type || '').slice(0, 180), status: item.timestamp || '' }))
    }
  }
  if (action === 'export_context') {
    downloadCommandJson(`ccm-group-${currentGroup.value?.id || 'context'}`, { group: currentGroup.value, messages: messages.value })
    return { success: true, summary: '当前群聊上下文已导出为 JSON。', metrics: { 消息: messages.value.length } }
  }
  throw new Error(`当前群聊不支持客户端命令：${action}`)
}
const slash = useSlashCommands({
  scope: 'group',
  input: newMessage,
  context: () => ({ group: currentGroup.value?.name || '', groupId: currentGroup.value?.id || '', target: targetAgent.value }),
  focus: () => nextTick(() => document.getElementById('groupChatInput')?.focus()),
  onNavigate: (tab) => slashNavigate(tab),
  onPrompt: async (prompt) => {
    newMessage.value = prompt
    await nextTick()
    await sendMessage()
  },
  onClientAction: runGroupClientCommand,
  onResult: (result) => {
    messages.value.push({ role: 'assistant', agent: 'command-center', type: 'command_result', commandResult: result, content: '', timestamp: new Date().toISOString() })
    nextTick(() => scrollToBottom())
  },
  onError: (message) => toast.error(message),
  onConfirm: (message) => confirmDialog(message)
})
const focusGroupInput = () => {
  const el = document.getElementById('groupChatInput')
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
  input: newMessage,
  focusInput: focusGroupInput,
  onError: (message) => toast.error(message),
})
const messageFiles = ref([])
const targetAgent = ref('all')
const messageMode = ref('conversation')
let activeAgentStreamMsgs = {}
const diffViewer = ref({ visible: false, file: null })
const {
  codeChangeDrawer,
  openCodeChangeDrawer,
  openSingleFileChange,
  closeCodeChangeDrawer,
} = useCodeChangeDrawer({ title: '群聊代码改动' })

const pipelineViewer = ref({ visible: false, assignments: [], coordinationPlan: null, fileChanges: null, receipts: [], deliverySummary: null, status: 'pending', title: 'Agent 协作流' })
const agentQaActionLoading = ref({})
const openPipelineViewer = (msg) => {
  pipelineViewer.value = {
    visible: true,
    assignments: msg.assignments || [],
    coordinationPlan: msg.coordinationPlan || null,
    fileChanges: msg.fileChanges || null,
    receipts: msg.receipts || [],
    deliverySummary: msg.delivery_summary || msg.deliverySummary || null,
    status: msg.status || (msg.streaming ? 'running' : 'done'),
    title: 'Agent 协同流看板'
  }
}
const openMainAgentPipeline = () => {
  if (!mainAgentStatus.value?.latest_delivery_summary) return
  openPipelineViewer({
    delivery_summary: mainAgentStatus.value.latest_delivery_summary,
    status: mainAgentStatus.value.latest_delivery_summary.status || 'waiting'
  })
}
const hasMainAgentStatusDetail = computed(() => {
  const status = mainAgentStatus.value || {}
  return !!currentGroup.value && (
    latestMainAgentDecision.value ||
    status.phase ||
    status.running_child_agents?.length ||
    status.open_qa_count ||
    status.failed_gates?.length ||
    status.blockers?.length ||
    status.needs?.length
  )
})
const latestMainAgentDecisionEntry = computed(() => {
  for (let i = messages.value.length - 1; i >= 0; i--) {
    const card = getTaskCard(messages.value[i])
    const decision = card?.mainAgentDecision || card?.main_agent_decision || card?.technical?.mainAgentDecision || card?.technical?.main_agent_decision || getMainAgentDecision(messages.value[i])
    if (decision) return { decision, index: i, msg: messages.value[i] }
  }
  return null
})
const latestMainAgentDecision = computed(() => latestMainAgentDecisionEntry.value?.decision || null)
const scrollToLatestMainDecision = () => {
  const entry = latestMainAgentDecisionEntry.value
  if (!entry) return
  scrollToMessage(entry.index)
}

const isCoordinatorProject = (project) => String(project || '') === 'coordinator'
const getCoordinatorMember = (group = currentGroup.value) => {
  return group?.members?.find(m => m.role === 'coordinator' || isCoordinatorProject(m.project)) || null
}
const getRoutableMembers = (group = currentGroup.value) => {
  return (group?.members || []).filter(m => !isCoordinatorProject(m.project) && m.role !== 'coordinator')
}
const getMemberCountLabel = (group) => {
  const count = getRoutableMembers(group).length
  return `${count}成员 + 协调者`
}
const getMemoryCompression = () => groupMemory.value?.messageCompression || {}
const getAgentMemoryCount = () => Object.keys(groupMemory.value?.agentMemories || {}).filter(Boolean).length
const hasCompressedMemory = () => Number(getMemoryCompression().compressedMessages || 0) > 0 || getAgentMemoryCount() > 0
const getMemoryCompressionLabel = () => {
  const stats = getMemoryCompression()
  const total = Number(stats.totalMessages || messages.value.length || 0)
  const compressed = Number(stats.compressedMessages || 0)
  const recent = Number(stats.recentMessages || stats.recentLimit || 0)
  return compressed > 0
    ? '上下文已压缩'
    : `上下文 ${total || messages.value.length} 条`
}
const getMemoryCompressionMeta = () => {
  const stats = getMemoryCompression()
  const compressed = Number(stats.compressedMessages || 0)
  const recent = Number(stats.recentMessages || stats.recentLimit || 0)
  return compressed > 0 ? `${compressed} → ${recent}` : '原文'
}
const getMemoryCompressionTitle = () => {
  const stats = getMemoryCompression()
  return `总消息 ${stats.totalMessages || messages.value.length || 0}；旧消息压缩 ${stats.compressedMessages || 0}；近期原文 ${stats.recentMessages || stats.recentLimit || 0}；执行成员记忆 ${getAgentMemoryCount()} 个`
}
const getAgentDisplayName = (agent) => {
  if (agent === 'system') return '系统'
  if (isCoordinatorProject(agent)) return '协调者'
  return agent || 'Agent'
}
const getWorkEvents = (msg) => Array.isArray(msg?.workEvents) ? msg.workEvents.filter(Boolean) : []
const agentAccentPalette = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#be185d', '#4f46e5']
const hashAgent = (agent) => String(agent || 'agent').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
const getAgentAccent = (agent) => agentAccentPalette[hashAgent(agent) % agentAccentPalette.length]
const getAgentAccentStyle = (agent) => ({ '--agent-accent': getAgentAccent(agent) })
const getAgentInitials = (agent) => {
  const name = getAgentDisplayName(agent).replace(/[（）()]/g, ' ').trim()
  const parts = name.split(/\s+|[-_/]/).filter(Boolean)
  if (!parts.length) return 'A'
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase()
}
const getWorkPanelState = (msg) => {
  const events = getWorkEvents(msg)
  if (events.some(event => event.kind === 'error')) return { tone: 'fail', label: '失败' }
  if (msg?.streaming) return { tone: 'running', label: '执行中' }
  if (events.some(event => event.kind === 'done')) return { tone: 'ok', label: '完成' }
  return { tone: 'idle', label: events.length ? '等待结果说明' : '待执行' }
}
const getAgentMessageStatus = (msg) => {
  if (msg?.agent === 'system') return { tone: 'fail', label: '系统' }
  const state = getWorkPanelState(msg)
  if (getWorkEvents(msg).length) return state
  if (msg?.streaming) return { tone: 'running', label: '思考中' }
  return { tone: 'idle', label: '回复' }
}
const isGroupMainAgentMessage = (msg) => isCoordinatorProject(msg?.agent) || msg?.type === 'project_task_intake'
const getTaskRuntime = (msg) => msg?.taskRuntime || msg?.task_runtime || null
const isLegacyNonTaskCard = (card) => {
  if (!card) return false
  const text = String(`${card.title || ''} ${card.goal || ''}`).replace(/\s+/g, '')
  const greetingOnly = /^(你好|您好|hi|hello|hey|在吗|在不在|早上好|下午好|晚上好|谢谢|感谢|ok|好的|嗯|哦|哈喽)+[。.!！?？]*$/i.test(text)
  const hasEvidence = card.delivery?.files?.length || card.delivery?.verification?.length || card.completed?.length || card.agents?.some?.(agent => ['done', 'running', 'failed', 'partial', 'reviewing'].includes(String(agent.status || '')))
  return greetingOnly && !hasEvidence
}
const getTaskCard = (msg) => {
  const card = msg?.taskCard || msg?.task_card || getTaskRuntime(msg)?.taskCard || getTaskRuntime(msg)?.task_card || null
  if (card?.visible === false) return null
  if (isLegacyNonTaskCard(card)) return null
  return card
}
const shouldShowOrchestrationPlan = (msg) => {
  if (!msg || getTaskCard(msg)) return false
  const assignments = Array.isArray(msg.assignments) ? msg.assignments : []
  if (assignments.length > 0) return true
  if (msg.coordinationPlan?.phases?.length) return true
  const action = String(msg.dispatchPolicy?.action || '')
  return action === 'delegate'
}
const isInternalProtocolMessage = (msg) => {
  const content = String(msg?.content || '')
  if (msg?.task_id && ['agent_qa', 'agent_qa_resume', 'conflict_plan', 'task_rehearsal'].includes(String(msg?.type || ''))) return true
  const protocolPayload = /CCM_AGENT_RECEIPT|"ccm_receipt"|<task-notification>|【主 Agent 业务开发工作单】|主 Agent 返工工作单|任务前沙盘演练|主 Agent 派发修复|【任务需要继续处理】|📋\s*\*{0,2}(?:规则)?协调复盘/i.test(content)
  const generatedContinuation = /^任务补充说明[：:]\s*请继续推进任务/.test(content)
    || (content.includes('需要补齐的主 Agent 协作证据') && content.includes('继续执行要求'))
  return protocolPayload || generatedContinuation
}
const getMessageTaskId = (msg) => msg?.task_id || msg?.task?.id || ''
const isPrimaryTaskMessage = (msg, index) => {
  const taskId = getMessageTaskId(msg)
  if (!taskId || isInternalProtocolMessage(msg)) return false
  return messages.value.findIndex((item) => getMessageTaskId(item) === taskId && !isInternalProtocolMessage(item)) === index
}
const shouldShowGroupMessage = (msg, index) => {
  if (isInternalProtocolMessage(msg)) return false
  const taskId = getMessageTaskId(msg)
  if (!taskId) return true
  if (isPrimaryTaskMessage(msg, index)) return true
  // 用户主动补充仍属于对话；Agent 工作单、结果说明、执行输出统一进入任务卡技术详情。
  return msg.role === 'user' && !/【主 Agent 业务开发工作单】|任务前沙盘演练|CCM_AGENT_RECEIPT|task-notification/i.test(String(msg.content || ''))
}
const isPrimaryTaskCard = (msg, index) => {
  return !!getTaskCard(msg) && isPrimaryTaskMessage(msg, index)
}
const handleTaskCardAction = createGroupTaskCardActionHandler({
  getTaskCard,
  getCurrentGroup: () => currentGroup.value,
  openCodeChangeDrawer: (...args) => openCodeChangeDrawer(...args),
  openPipelineViewer,
  openTraceReplay: (target = {}) => {
    localStorage.setItem('trace-replay-target', JSON.stringify({ scope: target.scope || 'orchestrator', trace_id: target.trace_id || '', at: Date.now() }))
    slashNavigate?.('trace-replay')
    window.dispatchEvent(new CustomEvent('trace-replay-target', { detail: { scope: target.scope || 'orchestrator', trace_id: target.trace_id || '' } }))
  },
  loadMessages: () => loadMessages(),
})
const taskRuntimeStatusLabel = (status) => ({ pending: '待执行', in_progress: '执行中', blocked: '受阻', done: '已完成', failed: '失败', cancelled: '已取消' }[status] || status || '执行中')
const taskRuntimeAgentState = (state) => ({ queued: '排队', spawning: '启动', ready: '就绪', prompt_accepted: '已接单', running: '执行中', reviewing: '验收', succeeded: '完成', failed: '失败', cancel_requested: '停止中', cancelled: '已取消' }[state] || state || '等待')
const taskRuntimeGreenLabel = (green) => ({ none: '未验收', targeted: '局部绿', project: '项目绿', workspace: '工作区绿', merge_ready: '可合并' }[green] || green || '未验收')
const applyTransientTaskRuntime = (taskId, updater) => {
  if (!taskId) return
  messages.value.forEach((msg) => {
    if (msg.task_id !== taskId) return
    const current = getTaskRuntime(msg) || { taskId, status: msg.task?.status || 'in_progress', counts: {}, agents: [], sessions: [] }
    const next = updater({ ...current, agents: [...(current.agents || [])], sessions: [...(current.sessions || [])] })
    msg.taskRuntime = next
    msg.task_runtime = next
    msg.taskCard = next?.taskCard || next?.task_card || msg.taskCard || msg.task_card || null
    msg.task_card = next?.task_card || next?.taskCard || msg.task_card || msg.taskCard || null
  })
}
let latestTestAgentFallbackTaskId = ''
const resolveTestAgentFallbackTaskId = (data = {}, source = {}, prefix = 'test-agent-review') => {
  const explicit = data.taskId
    || data.task_id
    || data.workOrderId
    || data.work_order_id
    || source?.workOrderId
    || source?.work_order_id
    || ''
  if (explicit) {
    latestTestAgentFallbackTaskId = explicit
    return explicit
  }
  if (latestTestAgentFallbackTaskId && prefix === 'test-agent-review') return latestTestAgentFallbackTaskId
  const generated = `${prefix}-${data.trace_id || data.traceId || Date.now()}`
  latestTestAgentFallbackTaskId = generated
  return generated
}
const createTestAgentExecutionPlanFallbackMessage = (data = {}, summary = {}, plan = null) => {
  const taskId = resolveTestAgentFallbackTaskId(data, plan, 'test-agent-plan')
  const blocked = summary.status === 'blocked'
  const headline = sanitizeGroupVisibleText(summary.headline || data.detail, 'TestAgent 复核计划已整理。', 360)
  const nextAction = sanitizeGroupVisibleText(summary.next_action || summary.nextAction || (blocked ? '先修复复核计划里的阻塞项。' : '按计划启动 TestAgent 独立复核。'), blocked ? '先修复复核计划里的阻塞项。' : '按计划启动 TestAgent 独立复核。', 260)
  const taskCard = {
    version: 1,
    visible: true,
    task_id: taskId,
    title: data.title || 'TestAgent 复核计划',
    goal: data.goal || '展示 TestAgent 复核计划，并跟进后续独立复核结果。',
    phase: blocked ? 'blocked' : 'reviewing',
    phase_label: blocked ? '需修复' : '复核准备中',
    progress: blocked ? 38 : 58,
    active_agents: [blocked ? '等待修复复核计划' : '等待 TestAgent 复核'],
    agents: [{ name: 'TestAgent', status: blocked ? 'blocked' : 'reviewing', summary: headline }],
    completed: ['已生成 TestAgent 复核计划'],
    blockers: blocked ? [...(Array.isArray(summary.issues) ? summary.issues : [])].slice(0, 4) : [],
    next_action: nextAction,
    test_agent_execution_plan: plan,
    testAgentExecutionPlan: plan,
    test_agent_execution_plan_summary: summary,
    testAgentExecutionPlanSummary: summary,
    test_agent_execution_plan_detail: data.detail || '',
    testAgentExecutionPlanDetail: data.detail || '',
    display_stream: {
      schema: 'ccm-streamlined-display-v2',
      user_visible_text: headline,
      tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: 'TestAgent 复核计划已返回' },
    },
    technical: {
      trace_id: data.trace_id || data.traceId || '',
      test_agent_execution_plan: plan,
      raw_event_type: 'test_agent_execution_plan_ready',
    },
  }
  const taskRuntime = {
    taskId,
    status: blocked ? 'blocked' : 'in_progress',
    statusText: headline,
    taskCard,
    task_card: taskCard,
    testAgentExecutionPlan: plan,
    test_agent_execution_plan: plan,
    testAgentExecutionPlanSummary: summary,
    test_agent_execution_plan_summary: summary,
  }
  return {
    id: `test-agent-plan-${taskId}`,
    role: 'assistant',
    agent: 'coordinator',
    type: 'project_task_intake',
    content: headline,
    timestamp: new Date().toISOString(),
    task_id: taskId,
    task: {
      id: taskId,
      title: taskCard.title,
      status: taskRuntime.status,
      status_detail: headline,
      workflow_type: 'test_agent_review',
    },
    taskCard,
    task_card: taskCard,
    taskRuntime,
    task_runtime: taskRuntime,
  }
}
const applyTestAgentExecutionPlanReady = (data = {}) => {
  const plan = data.test_agent_execution_plan || data.testAgentExecutionPlan || data.technical?.test_agent_execution_plan || null
  const summary = normalizeTestAgentExecutionPlanSummary(plan, data.test_agent_execution_plan_summary || data.testAgentExecutionPlanSummary || data.detail || null, data.detail || '')
  if (!summary) return false
  const runtimeStatus = summary.status === 'blocked' ? 'blocked' : 'in_progress'
  const taskId = data.taskId || data.task_id || ''
  let applied = false
  applyTransientTaskRuntime(taskId, (runtime) => {
    const currentCard = runtime.taskCard || runtime.task_card || {}
    const nextCard = {
      ...currentCard,
      test_agent_execution_plan: plan,
      testAgentExecutionPlan: plan,
      test_agent_execution_plan_summary: summary,
      testAgentExecutionPlanSummary: summary,
      test_agent_execution_plan_detail: data.detail || '',
      testAgentExecutionPlanDetail: data.detail || '',
    }
    applied = true
    return {
      ...runtime,
      status: runtimeStatus,
      statusText: summary.headline,
      taskCard: nextCard,
      task_card: nextCard,
      testAgentExecutionPlan: plan,
      test_agent_execution_plan: plan,
      testAgentExecutionPlanSummary: summary,
      test_agent_execution_plan_summary: summary,
    }
  })
  if (!applied) {
    mergeIncomingMessage(createTestAgentExecutionPlanFallbackMessage(data, summary, plan))
    applied = true
  }
  return applied
}
const getTestAgentReviewPayload = (data = {}) => {
  const summary = data.test_agent_review_summary
    || data.testAgentReviewSummary
    || data.independent_review_summary
    || data.independentReviewSummary
    || null
  const rows = Array.isArray(data.independent_review)
    ? data.independent_review
    : Array.isArray(data.independentReview)
      ? data.independentReview
      : []
  if (!summary && !rows.length) return null
  return {
    summary: summary ? sanitizeUserFacingStructure(summary, { fallback: 'TestAgent 独立复核结论已整理。', max: 420 }) : null,
    rows: sanitizeUserFacingStructure(rows, { fallback: 'TestAgent 独立复核证据已整理。', max: 240 }),
    report: data.test_agent_report || data.testAgentReport || data.technical?.test_agent_report || null,
    detail: data.detail || data.message || data.text || '',
  }
}

const testAgentReviewPhase = (status) => {
  const value = String(status || '').toLowerCase()
  if (value === 'needs_rework') return { phase: 'failed', phaseLabel: '需返工', runtimeStatus: 'blocked', agentStatus: 'failed' }
  if (value === 'needs_user') return { phase: 'needs_user', phaseLabel: '等你确认', runtimeStatus: 'blocked', agentStatus: 'blocked' }
  if (value === 'passed') return { phase: 'reviewing', phaseLabel: '复核已返回', runtimeStatus: 'in_progress', agentStatus: 'done' }
  return { phase: 'reviewing', phaseLabel: '复核已记录', runtimeStatus: 'in_progress', agentStatus: 'reviewing' }
}

const createTestAgentReviewFallbackMessage = (data = {}, summary = {}, payload = {}) => {
  const taskId = resolveTestAgentFallbackTaskId(data, payload.report, 'test-agent-review')
  const phase = testAgentReviewPhase(summary.status)
  const rows = Array.isArray(payload.rows) && payload.rows.length ? payload.rows : Array.isArray(summary.rows) ? summary.rows : []
  const headline = sanitizeGroupVisibleText(summary.headline || payload.detail, 'TestAgent 独立复核结论已整理。', 360)
  const nextAction = sanitizeGroupVisibleText(summary.next_action || summary.nextAction || '继续等待完整复核证据或最终总结。', '继续等待完整复核证据或最终总结。', 260)
  const taskCard = {
    version: 1,
    visible: true,
    task_id: taskId,
    title: data.title || 'TestAgent 独立复核',
    goal: data.goal || '展示 TestAgent 返回的独立复核结论，并等待后续验收或返工。',
    phase: phase.phase,
    phase_label: phase.phaseLabel,
    progress: phase.phase === 'failed' || phase.phase === 'needs_user' ? 72 : 84,
    active_agents: phase.phase === 'failed'
      ? ['正在安排返工']
      : phase.phase === 'needs_user'
        ? ['等待你确认复核问题']
        : ['正在纳入复核结论'],
    agents: [{ name: 'TestAgent', status: phase.agentStatus, summary: headline }],
    completed: ['已收到 TestAgent 独立复核结论'],
    blockers: phase.phase === 'failed' || phase.phase === 'needs_user' ? rows.slice(0, 4) : [],
    next_action: nextAction,
    independent_review_summary: summary,
    independentReviewSummary: summary,
    test_agent_review_summary: summary,
    testAgentReviewSummary: summary,
    independent_review: rows,
    independentReview: rows,
    test_agent_report: payload.report || null,
    testAgentReport: payload.report || null,
    display_stream: {
      schema: 'ccm-streamlined-display-v2',
      user_visible_text: headline,
      tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: 'TestAgent 独立复核结论已返回' },
    },
    technical: {
      trace_id: data.trace_id || data.traceId || '',
      test_agent_report: payload.report || data.test_agent_report || data.testAgentReport || null,
      raw_event_type: 'test_agent_review_ready',
    },
  }
  const taskRuntime = {
    taskId,
    status: phase.runtimeStatus,
    statusText: headline,
    taskCard,
    task_card: taskCard,
    independent_review_summary: summary,
    independentReviewSummary: summary,
    test_agent_review_summary: summary,
    testAgentReviewSummary: summary,
  }
  return {
    id: `test-agent-review-${taskId}`,
    role: 'assistant',
    agent: 'coordinator',
    type: 'project_task_intake',
    content: headline,
    timestamp: new Date().toISOString(),
    task_id: taskId,
    task: {
      id: taskId,
      title: taskCard.title,
      status: phase.runtimeStatus,
      status_detail: headline,
      workflow_type: 'test_agent_review',
    },
    taskCard,
    task_card: taskCard,
    taskRuntime,
    task_runtime: taskRuntime,
  }
}

const applyTestAgentReviewReady = (data = {}) => {
  const payload = getTestAgentReviewPayload(data)
  if (!payload) return false
  const summary = payload.summary || {
    schema: 'ccm-main-agent-independent-review-summary-v1',
    title: '独立复核',
    status: 'recorded',
    status_label: '已记录',
    headline: sanitizeGroupVisibleText(payload.detail, 'TestAgent 独立复核结论已整理。', 360),
    rows: payload.rows,
    next_action: '继续等待完整复核证据或最终总结。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
  }
  const taskId = data.taskId || data.task_id || ''
  const runtimeStatus = summary.status === 'needs_rework'
    ? 'blocked'
    : summary.status === 'needs_user'
      ? 'blocked'
      : summary.status === 'passed'
        ? 'in_progress'
        : 'in_progress'
  let applied = false
  applyTransientTaskRuntime(taskId, (runtime) => {
    const currentCard = runtime.taskCard || runtime.task_card || {}
    const existingRows = Array.isArray(currentCard.independent_review)
      ? currentCard.independent_review
      : Array.isArray(currentCard.independentReview)
        ? currentCard.independentReview
        : []
    const nextRows = payload.rows.length ? payload.rows : existingRows
    const nextCard = {
      ...currentCard,
      independent_review_summary: summary,
      independentReviewSummary: summary,
      test_agent_review_summary: summary,
      testAgentReviewSummary: summary,
      independent_review: nextRows,
      independentReview: nextRows,
      test_agent_report: payload.report || currentCard.test_agent_report || currentCard.testAgentReport || null,
      testAgentReport: payload.report || currentCard.testAgentReport || currentCard.test_agent_report || null,
    }
    applied = true
    return {
      ...runtime,
      status: runtimeStatus,
      statusText: summary.headline,
      taskCard: nextCard,
      task_card: nextCard,
      independent_review_summary: summary,
      independentReviewSummary: summary,
      test_agent_review_summary: summary,
      testAgentReviewSummary: summary,
    }
  })
  if (!applied) {
    mergeIncomingMessage(createTestAgentReviewFallbackMessage(data, summary, payload))
    applied = true
  }
  return applied
}
const appendAgentWorkEvent = (agent, event) => {
  if (!agent || !event) return
  let streamMsg = activeAgentStreamMsgs[agent]
  if (!streamMsg) {
    streamMsg = {
      role: 'assistant',
      agent,
      content: '',
      streaming: true,
      workEvents: [],
      timestamp: new Date().toISOString()
    }
    activeAgentStreamMsgs[agent] = streamMsg
    messages.value.push(streamMsg)
  }
  if (!Array.isArray(streamMsg.workEvents)) streamMsg.workEvents = []
  const key = event.id || `${event.kind}:${event.time}:${event.text}`
  if (!streamMsg.workEvents.some(item => (item.id || `${item.kind}:${item.time}:${item.text}`) === key)) {
    streamMsg.workEvents.push(event)
    if (streamMsg.workEvents.length > 80) streamMsg.workEvents.splice(0, streamMsg.workEvents.length - 80)
  }
  streamMsg.timestamp = event.time || streamMsg.timestamp
}
const getTargetDisplayName = (target) => {
  if (target === 'all' || isCoordinatorProject(target)) return '协调者'
  return target || 'Agent'
}

const isAgentQaMessage = (msg) => msg?.type === 'agent_qa' || msg?.type === 'agent_qa_resume'
const runAgentQaAction = async (msg, action) => {
  const qa = msg?.qa || {}
  if (!qa.id) return
  if (action === 'retry') {
    const confirmed = await confirmDialog(`确定重试 ${getAgentDisplayName(qa.to_agent)} 的回答？`)
    if (!confirmed) return
  }
  if (action === 'manual') {
    const confirmed = await confirmDialog('确定将这条协作问答标记为人工接手？')
    if (!confirmed) return
  }
  const key = `${qa.id}:${action}`
  agentQaActionLoading.value = { ...agentQaActionLoading.value, [key]: true }
  try {
    const endpoint = action === 'retry'
      ? '/api/agent-qa/retry'
      : action === 'manual'
        ? '/api/agent-qa/manual-takeover'
        : '/api/agent-qa/arbitrate'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: qa.id, decision: action, reason: action === 'accept' ? '用户在群聊界面采纳该回答' : action === 'reject' ? '用户在群聊界面拒绝该回答' : '用户在群聊界面接管该问答' })
    })
    const data = await res.json()
    if (!res.ok || data.success === false) throw new Error(data.error || '操作失败')
    toast.success(action === 'retry' ? '已重试协作问答' : action === 'manual' ? '已标记人工接手' : action === 'accept' ? '已采纳回答' : '已拒绝回答')
    await loadMessages()
  } catch (err) {
    toast.error((action === 'retry' ? '重试失败：' : '接管失败：') + (err?.message || err))
  } finally {
    const next = { ...agentQaActionLoading.value }
    delete next[key]
    agentQaActionLoading.value = next
  }
}
const appendAgentQaMessage = (payload) => {
  const qa = payload?.qa || {}
  if (!qa.id && !qa.content) return
  const kind = payload.kind || qa.kind || 'question'
  const id = `${qa.id || Date.now().toString(36)}-${kind}`
  const msg = {
    id,
    role: 'assistant',
    agent: kind === 'answer' ? qa.to_agent : qa.from_agent,
    type: kind === 'resume' ? 'agent_qa_resume' : 'agent_qa',
    content: qa.content || qa.answer || qa.question || '',
    timestamp: new Date().toISOString(),
    qa: { ...qa, kind }
  }
  mergeIncomingMessage(msg)
}

const applyMainAgentProgressCheckpoint = (payload = {}) => {
  const checkpoint = payload.progressCheckpoint || payload.progress_checkpoint || payload.latest_progress_checkpoint || payload.latestProgressCheckpoint || null
  if (!checkpoint?.label) return false
  const current = mainAgentStatus.value || {}
  const existing = Array.isArray(current.progress_checkpoints || current.progressCheckpoints)
    ? [...(current.progress_checkpoints || current.progressCheckpoints)]
    : []
  const key = checkpoint.id || `${checkpoint.label}:${checkpoint.detail || ''}:${checkpoint.phase || ''}`
  const nextItems = [...existing.filter(item => (item.id || `${item.label}:${item.detail || ''}:${item.phase || ''}`) !== key), checkpoint].slice(-6)
  mainAgentStatus.value = {
    ...current,
    schema: current.schema || 'ccm-group-main-agent-status-v1',
    phase: checkpoint.phase || current.phase || 'running',
    label: current.label || checkpoint.label || '正在处理',
    task_id: payload.taskId || payload.task_id || checkpoint.task_id || current.task_id || '',
    latest_progress_checkpoint: checkpoint,
    latestProgressCheckpoint: checkpoint,
    recent_progress_checkpoints: nextItems.slice(-3),
    recentProgressCheckpoints: nextItems.slice(-3),
    progress_checkpoints: nextItems,
    progressCheckpoints: nextItems,
    updated_at: checkpoint.at || new Date().toISOString(),
  }
  return true
}

const groupMessageKeyMap = new WeakMap()
let groupMessageKeySeq = 0
const getGroupMessageKey = (msg) => {
  if (!msg || typeof msg !== 'object') return `empty-${groupMessageKeySeq++}`
  const existing = groupMessageKeyMap.get(msg)
  if (existing) return existing
  const explicit = msg.id || msg.client_message_id
  const key = explicit
    ? `msg-${explicit}`
    : `local-${Date.now().toString(36)}-${groupMessageKeySeq++}`
  groupMessageKeyMap.set(msg, key)
  return key
}

// 弹窗状态
const showCreate = ref(false)
const showRename = ref(false)
const showMembers = ref(false)
const showTools = ref(false)
const showSharedFiles = ref(false)
const showLogs = ref(false)
const groupTools = ref({ mcp: [], skill: [] })
const groupAllTools = ref({ mcp: [], skill: [] })
const groupToolAudit = ref(null)
const groupAuthorizationReadiness = ref(null)

// 表单
const newGroupName = ref('')
const renameName = ref('')
const mentionDropdown = ref(false)
const mentionFilter = ref('')
const mentionIndex = ref(0)

// 加载数据
const loadGroups = async () => {
  const data = await groupsApi.list()
  groups.value = data.groups || []
  // 自动选择第一个群聊
  if (groups.value.length > 0 && !currentGroup.value) {
    selectGroup(groups.value[0].id)
  }
}

const loadProjects = async () => {
  const data = await projectsApi.list()
  projects.value = data.projects || []
}

// 选择群聊
let selectGroup = async (id) => {
  currentGroup.value = groups.value.find(g => g.id === id)
  isGroupMessagesPinnedToBottom.value = true
  await loadMessages()
  // 如果有挂起的待使用模板，在此应用
  if (pendingTemplateToApply.value) {
    selectChatTemplate(pendingTemplateToApply.value)
    pendingTemplateToApply.value = null
    if (activeSelectedTemplate) {
      activeSelectedTemplate.value = null
    }
  }
}

// 加载消息
const loadMessages = async () => {
  if (!currentGroup.value) return
  const data = await groupsApi.messages(currentGroup.value.id)
  try {
    const protocolRes = await fetch(`/api/agent-collaboration/protocol?group_id=${encodeURIComponent(currentGroup.value.id)}&limit=100`)
    collaborationProtocol.value = protocolRes.ok ? await protocolRes.json() : null
  } catch {
    collaborationProtocol.value = null
  }
  groupMemory.value = data.memory || null
  mainAgentStatus.value = data.mainAgentStatus || null
  groupAgentQa.value = data.agentQa || []
  messages.value = (data.messages || []).filter(m => !m.content?.startsWith('📤'))
  scrollToBottom({ force: true })
  // 延迟多次滚动，防范 Markdown/Diff 渲染等重排引起的高度时差
  setTimeout(() => scrollToBottom({ force: true }), 60)
  setTimeout(() => scrollToBottom({ force: true }), 220)
}

const createLocalMessageId = () => `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const normalizeMessageContent = (content) => String(content || '').replace(/\s+/g, ' ').trim()

const isEquivalentMessage = (a, b) => {
  if (!a || !b) return false
  if (a.role !== b.role) return false
  if (a.role === 'user' && a.target !== b.target) return false
  if (a.role !== 'user' && (a.agent || '') !== (b.agent || '')) return false
  if (normalizeMessageContent(a.content) !== normalizeMessageContent(b.content)) return false
  const at = new Date(a.timestamp || 0).getTime()
  const bt = new Date(b.timestamp || 0).getTime()
  return !at || !bt || Math.abs(at - bt) < 120000
}

const mergeIncomingMessage = (msg) => {
  if (!msg || msg.content?.startsWith('📤')) return false
  const existingIndex = messages.value.findIndex(m => (msg.id && m.id === msg.id) || isEquivalentMessage(m, msg))
  if (existingIndex >= 0) {
    const current = messages.value[existingIndex]
    const currentKey = getGroupMessageKey(current)
    const next = {
      ...current,
      ...msg,
      fileChanges: msg.fileChanges || current.fileChanges,
      workEvents: msg.workEvents || current.workEvents,
      assignments: Array.isArray(msg.assignments) ? msg.assignments : current.assignments,
      executionOrder: msg.executionOrder || current.executionOrder,
      runtime: msg.runtime || current.runtime,
      dispatchPolicy: msg.dispatchPolicy || current.dispatchPolicy,
      coordinationPlan: msg.coordinationPlan || current.coordinationPlan,
      workflow: msg.workflow || current.workflow,
      mainAgentDecision: msg.mainAgentDecision || msg.main_agent_decision || current.mainAgentDecision || current.main_agent_decision,
      main_agent_decision: msg.main_agent_decision || msg.mainAgentDecision || current.main_agent_decision || current.mainAgentDecision,
      clarificationSummary: msg.clarificationSummary || msg.clarification_summary || current.clarificationSummary || current.clarification_summary,
      clarification_summary: msg.clarification_summary || msg.clarificationSummary || current.clarification_summary || current.clarificationSummary,
      taskRuntime: msg.taskRuntime || msg.task_runtime || current.taskRuntime || current.task_runtime,
      task_runtime: msg.task_runtime || msg.taskRuntime || current.task_runtime || current.taskRuntime,
      delivery_summary: msg.delivery_summary || current.delivery_summary,
      deliverySummary: msg.deliverySummary || current.deliverySummary,
      receipts: msg.receipts || current.receipts,
      streaming: current.streaming && !msg.content ? current.streaming : false
    }
    groupMessageKeyMap.set(next, currentKey)
    messages.value[existingIndex] = next
    return false
  }
  messages.value.push(msg)
  return true
}

const getMainAgentDecision = (msg) => msg?.mainAgentDecision || msg?.main_agent_decision || null
const attachMainAgentDecision = (decision) => {
  if (!decision) return false
  const messageId = decision.reply?.message_id || decision.message_id || ''
  const taskId = decision.task_id || ''
  let index = -1
  if (messageId) index = messages.value.findIndex(m => m.id === messageId)
  if (index < 0 && taskId) index = messages.value.findIndex(m => getMessageTaskId(m) === taskId)
  if (index < 0) index = [...messages.value].reverse().findIndex(m => m.role === 'assistant')
  if (index < 0) return false
  if (!messageId && !taskId) index = messages.value.length - 1 - index
  const current = messages.value[index]
  messages.value[index] = {
    ...current,
    mainAgentDecision: decision,
    main_agent_decision: decision,
  }
  return true
}

const formatFileSize = (size) => {
  if (!size) return '0 B'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

const onMessageFilesSelected = (files) => {
  messageFiles.value = [...messageFiles.value, ...files]
}

const removeMessageFile = (index) => {
  messageFiles.value.splice(index, 1)
}

const openFileDiff = (file) => {
  openSingleFileChange(file)
}

const openDrawerChangesTab = (project) => {
  if (project) toast.info(`已在抽屉展示 ${project} 的本轮改动`)
}


const closeFileDiff = () => {
  diffViewer.value = { visible: false, file: null }
}

const getFileChangesTitle = (fileChanges) => {
  const files = fileChanges?.files || []
  const counts = files.reduce((acc, file) => {
    const kind = file.statusKind || ''
    if (kind === 'added') acc.added++
    else if (kind === 'deleted') acc.deleted++
    else acc.modified++
    return acc
  }, { added: 0, modified: 0, deleted: 0 })
  const parts = []
  if (counts.added) parts.push(`新增 ${counts.added}`)
  if (counts.modified) parts.push(`修改 ${counts.modified}`)
  if (counts.deleted) parts.push(`删除 ${counts.deleted}`)
  return parts.length ? `📁 变更了 ${files.length} 个文件（${parts.join('，')}）` : `📁 变更了 ${fileChanges?.count || 0} 个文件`
}

const getExecutionOrderLabel = (order) => {
  if (order === 'backend_first') return '后端优先'
  if (order === 'sequential') return '顺序执行'
  return '并行执行'
}

const workflowSteps = [
  { key: 'understanding', label: '理解' },
  { key: 'dispatching', label: '拆分' },
  { key: 'executing', label: '执行' },
  { key: 'reviewing', label: '验收' },
  { key: 'complete', label: '完成' }
]

const getWorkflowPhase = (msg) => {
  const explicit = msg?.workflow?.phase
  if (explicit) return explicit
  const assignments = msg?.assignments || []
  if (!assignments.length) return 'understanding'
  const statuses = assignments.map(item => item.status || 'pending')
  if (statuses.some(status => ['failed', 'blocked', 'needs_info', 'partial'].includes(status))) return 'needs_rework'
  if (statuses.some(status => status === 'running')) return 'executing'
  if (statuses.every(status => status === 'done')) return 'reviewing'
  return 'dispatching'
}

const getWorkflowStepState = (msg, stepKey) => {
  const phase = getWorkflowPhase(msg)
  if (phase === 'rework' || phase === 'needs_rework') {
    if (stepKey === 'reviewing') return 'active warning'
    if (['understanding', 'dispatching', 'executing'].includes(stepKey)) return 'done'
    return ''
  }
  if (phase === 'needs_user') {
    if (stepKey === 'reviewing') return 'active warning'
    if (['understanding', 'dispatching', 'executing'].includes(stepKey)) return 'done'
    return ''
  }
  const order = workflowSteps.map(step => step.key)
  const current = order.indexOf(phase)
  const idx = order.indexOf(stepKey)
  if (current === -1 || idx === -1) return ''
  if (idx < current) return 'done'
  if (idx === current) return 'active'
  return ''
}

const getWorkflowLabel = (msg) => {
  const phase = getWorkflowPhase(msg)
  if (msg?.workflow?.label) return msg.workflow.label
  if (phase === 'rework' || phase === 'needs_rework') return '验收返工'
  if (phase === 'needs_user') return '等待用户'
  if (phase === 'reviewing') return '最终验收'
  if (phase === 'complete') return '协作完成'
  if (phase === 'executing') return '执行成员执行中'
  if (phase === 'dispatching') return '任务拆分'
  return '需求理解'
}

const getDispatchActionLabel = (action) => {
  if (action === 'delegate') return '安排执行成员'
  if (action === 'ask_user') return '先问用户'
  if (action === 'hold') return '暂不执行'
  if (action === 'direct_answer') return '直接回复'
  return '派发决策'
}

const getPlanTitle = (msg) => {
  if (getWorkflowPhase(msg) === 'rework' || (msg.assignments || []).some(item => item.rework)) return '返工计划'
  if (msg?.workflow?.label) return msg.workflow.label
  return '执行计划'
}

const compactPlanText = (text, max = 180) => {
  const value = sanitizeGroupVisibleText(text, '计划详情已整理，可在技术详情查看。', max).replace(/\s+/g, ' ').trim()
  return value.length > max ? value.slice(0, max) + '...' : value
}

const getAssignmentStatusLabel = (status) => {
  if (status === 'running') return '执行中'
  if (status === 'done') return '已完成'
  if (status === 'partial') return '部分完成'
  if (status === 'blocked') return '阻塞'
  if (status === 'needs_info') return '需补充信息'
  if (status === 'failed') return '失败'
  return '待处理'
}

const getAssignmentStatusClass = (status) => {
  if (status === 'running') return 'running'
  if (status === 'done') return 'done'
  if (status === 'partial') return 'partial'
  if (status === 'blocked') return 'blocked'
  if (status === 'needs_info') return 'needs-info'
  if (status === 'failed') return 'failed'
  return 'pending'
}

const getAssignmentIdentity = (item = {}) => ({
  assignmentId: String(item.assignmentId || item.assignment_id || item.id || ''),
  dispatchKey: String(item.dispatchKey || item.dispatch_key || ''),
  project: String(item.project || item.agent || item.target_project || item.targetName || '')
})

const findAssignmentMessageIndex = (data) => {
  if (data?.planMessageId) {
    const idx = messages.value.findIndex(m => m.id === data.planMessageId)
    if (idx !== -1) return idx
  }
  const identity = getAssignmentIdentity(data || {})
  for (let i = messages.value.length - 1; i >= 0; i--) {
    const assignments = messages.value[i]?.assignments
    if (!Array.isArray(assignments)) continue
    if (identity.assignmentId && assignments.some(item => getAssignmentIdentity(item).assignmentId === identity.assignmentId)) return i
    if (identity.dispatchKey && assignments.some(item => getAssignmentIdentity(item).dispatchKey === identity.dispatchKey)) return i
    if (identity.project && assignments.filter(item => getAssignmentIdentity(item).project === identity.project).length === 1) return i
  }
  return -1
}

const getAssignmentKey = (msg, item) => `${msg?.id || getGroupMessageKey(msg)}-${item?.assignmentId || item?.dispatchKey || `${item?.project || 'agent'}-${item?.attempt || 1}-${item?.task || ''}`}`

const applyAssignmentStatus = (data) => {
  if (!data?.project && !data?.assignmentId && !data?.dispatchKey) return false
  const msgIndex = findAssignmentMessageIndex(data)
  if (msgIndex === -1) return false
  const msg = messages.value[msgIndex]
  if (!Array.isArray(msg.assignments)) return false
  let changed = false
  const incoming = getAssignmentIdentity(data)
  const projectMatches = msg.assignments.filter(item => getAssignmentIdentity(item).project === incoming.project).length
  const assignments = msg.assignments.map(item => {
    const current = getAssignmentIdentity(item)
    const matchesIdentity = incoming.assignmentId && current.assignmentId === incoming.assignmentId
    const matchesDispatch = !incoming.assignmentId && incoming.dispatchKey && current.dispatchKey === incoming.dispatchKey
    const matchesProject = !incoming.assignmentId && !incoming.dispatchKey && incoming.project && current.project === incoming.project && projectMatches === 1
    if (!matchesIdentity && !matchesDispatch && !matchesProject) return item
    changed = true
    return {
      ...item,
      status: data.status || item.status || 'pending',
      statusText: data.statusText || getAssignmentStatusLabel(data.status || item.status),
      updated_at: new Date().toISOString()
    }
  })
  if (!changed) return false
  const currentKey = getGroupMessageKey(msg)
  const next = { ...msg, assignments }
  if (data.workflow) next.workflow = data.workflow
  groupMessageKeyMap.set(next, currentKey)
  messages.value[msgIndex] = next
  return true
}

const getDiffLineClass = (line) => {
  if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) return 'meta'
  if (line.startsWith('+')) return 'add'
  if (line.startsWith('-')) return 'remove'
  return 'context'
}

// @提及处理
const handleInput = (e) => {
  const value = e.target.value
  const cursorPos = e.target.selectionStart
  const beforeCursor = value.substring(0, cursorPos)

  if (slash.onInput()) {
    mentionDropdown.value = false
    hideTemplateAssist()
    return
  }
  if (value.startsWith('/')) {
    mentionDropdown.value = false
    hideTemplateAssist()
    return
  }

  // @提及指令拦截
  const atIndex = beforeCursor.lastIndexOf('@')
  if (atIndex >= 0 && !beforeCursor.substring(atIndex).includes(' ')) {
    mentionFilter.value = beforeCursor.substring(atIndex + 1).toLowerCase()
    mentionDropdown.value = true
    mentionIndex.value = 0
    hideTemplateAssist()
  } else {
    mentionDropdown.value = false
    showTemplateSelector.value = false
    detectRecommendation(value)
  }
}

const insertMention = (agent) => {
  const value = newMessage.value
  const atIndex = value.lastIndexOf('@')
  newMessage.value = value.substring(0, atIndex) + `@${agent} `
  mentionDropdown.value = false
  nextTick(() => document.getElementById('groupChatInput')?.focus())
}

const handleKeydown = async (e) => {
  if (await slash.onKeydown(e)) return
  // 1. 处理 @提及下拉菜单键盘控制
  if (mentionDropdown.value) {
    const agents = getFilteredAgents()
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      mentionIndex.value = (mentionIndex.value + 1) % agents.length
      return
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      mentionIndex.value = (mentionIndex.value - 1 + agents.length) % agents.length
      return
    } else if (e.key === 'Enter' && !e.shiftKey) {
      if (agents.length > 0) {
        e.preventDefault()
        insertMention(agents[mentionIndex.value])
        return
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      mentionDropdown.value = false
      return
    }
  } 
  
  if (handleTemplateKeydown(e)) return

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

const getFilteredAgents = () => {
  if (!currentGroup.value) return []
  return getRoutableMembers()
    .map(m => m.project)
    .filter(p => p.toLowerCase().includes(mentionFilter.value))
}

// 高亮 @mentions
const highlightMentions = (text) => {
  if (!text) return ''
  return text.replace(/@([\w-]+)/g, (_match, name) => {
    const label = getAgentDisplayName(name)
    return `<span style="color:var(--accent-blue);font-weight:600">@${label}</span>`
  })
}

const updateCreateGroupProjectSelection = ({ name, selected }) => {
  const project = projects.value.find(p => p.name === name)
  if (project) project.selected = selected
}

// 创建群聊
const submitCreateGroup = async () => {
  if (!newGroupName.value.trim()) { toast.warning('请输入群聊名称'); return }

  const selectedProjects = projects.value.filter(p => p.selected).map(p => ({
    project: p.name,
    agent: p.agent || 'claudecode'
  }))

  const res = await groupsApi.create({ name: newGroupName.value, members: selectedProjects })
  if (res.success) {
    showCreate.value = false
    newGroupName.value = ''
    await loadGroups()
    selectGroup(res.group.id)
    toast.success('群聊创建成功！')
  } else {
    toast.error('创建失败: ' + (res.error || '未知错误'))
  }
}

// 重命名群聊
const submitRename = async () => {
  if (!renameName.value.trim()) { toast.warning('请输入名称'); return }
  await groupsApi.rename({ id: currentGroup.value.id, name: renameName.value })
  currentGroup.value.name = renameName.value
  showRename.value = false
  loadGroups()
  toast.success('群聊已重命名')
}

// 删除群聊
const deleteGroup = async () => {
  const confirmed = await confirmDialog(`确定删除群聊 "${currentGroup.value.name}"？删除后无法恢复。`)
  if (!confirmed) return
  await groupsApi.delete(currentGroup.value.id)
  currentGroup.value = null
  messages.value = []
  groupMemory.value = null
  loadGroups()
  toast.success('群聊已删除')
}

const clearGroupMessages = async () => {
  if (!currentGroup.value) return
  const clearMemory = await confirmDialog(`是否同时清空群聊“${currentGroup.value.name}”的压缩记忆？\n选择“确定”会清消息和记忆；选择“取消”只清消息。`)
  const confirmed = clearMemory || await confirmDialog(`确定只清空群聊“${currentGroup.value.name}”的聊天消息？`)
  if (!confirmed) return
  const res = await fetch('/api/groups/messages/clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ group_id: currentGroup.value.id, clear_memory: clearMemory })
  })
  const data = await res.json()
  if (!res.ok || !data.success) {
    toast.error(data.error || '清空群聊失败')
    return
  }
  messages.value = []
  if (data.memory_cleared) groupMemory.value = null
  toast.success(`已清空 ${data.cleared || 0} 条群聊消息`)
}

const saveCurrentGroupConversationKnowledge = async () => {
  if (!currentGroup.value || messages.value.length === 0) return toast.info('当前群聊还没有可沉淀的内容')
  try {
    const data = await postKnowledgeCapture(buildGroupConversationKnowledgePayload({
      group: currentGroup.value,
      messages: messages.value,
    }))
    toast.success(`已保存到知识库：${data.entry?.title || '群聊对话'}`)
  } catch (error) {
    toast.error(error?.message || '保存群聊知识失败')
  }
}

// 发送消息
const isStreaming = ref(false)
const thinkingMessages = ref([])

const sendMessage = async () => {
  if ((!newMessage.value.trim() && messageFiles.value.length === 0) || !currentGroup.value) return
  const msg = newMessage.value.trim()
  const filesToSend = [...messageFiles.value]
  const clientMessageId = createLocalMessageId()
  newMessage.value = ''
  messageFiles.value = []
  mentionDropdown.value = false

  const attachmentText = filesToSend.length
    ? `

[附件]
${filesToSend.map(f => `- ${f.name}（${formatFileSize(f.size)}）`).join('\n')}`
    : ''
  messages.value.push({
    id: clientMessageId,
    role: 'user',
    target: targetAgent.value === 'all' ? 'coordinator' : targetAgent.value,
    content: `${msg || '请处理附件'}${attachmentText}`,
    timestamp: new Date().toISOString()
  })
  scrollToBottom()

  // 创建思考过程消息
  const thinkingMsg = {
    role: 'thinking',
    content: '',
    timestamp: new Date().toISOString()
  }
  messages.value.push(thinkingMsg)

  // 创建 Agent 回复消息
  const agentMsg = {
    role: 'assistant',
    agent: targetAgent.value === 'all' ? 'coordinator' : targetAgent.value,
    content: '',
    timestamp: new Date().toISOString()
  }

  isStreaming.value = true
  thinkingMessages.value = []

  // 跟踪每个 Agent 的流式消息
  activeAgentStreamMsgs = {}
  const agentStreamMsgs = activeAgentStreamMsgs
  const agentStreamRawBuffers = {}
  const agentStreamHiddenBuffers = {}
  let hasMention = false
  let agentMsgAdded = false
  let singleStreamRawBuffer = ''
  let singleStreamHiddenBuffer = false

  let payload
  if (filesToSend.length > 0) {
    payload = new FormData()
    payload.append('group_id', currentGroup.value.id)
    payload.append('target_project', targetAgent.value === 'all' ? 'all' : targetAgent.value)
    payload.append('message', msg)
    payload.append('client_message_id', clientMessageId)
    payload.append('message_mode', messageMode.value)
    filesToSend.forEach(file => payload.append('files', file))
  } else {
    payload = {
      group_id: currentGroup.value.id,
      target_project: targetAgent.value === 'all' ? undefined : targetAgent.value,
      message: msg,
      client_message_id: clientMessageId,
      message_mode: messageMode.value
    }
  }

  const res = await groupsApi.send(payload)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let sseBuffer = ''

  const handleStreamLine = (line) => {
    if (!line.startsWith('data: ')) return
    try {
      const data = JSON.parse(line.slice(6))
      if (data.type === 'status') {
        applyMainAgentProgressCheckpoint(data)
        // 更新思考状态
        thinkingMsg.content = sanitizeGroupVisibleText(data.text, '我正在整理当前进展。', 600)
        if (String(data.text || '').includes('分派') || String(data.text || '').includes('等待')) {
          waitingCrossReply.value = true
        }
        scrollToBottom()
      } else if (data.type === 'test_agent_execution_plan_ready') {
        applyTestAgentExecutionPlanReady(data)
        thinkingMsg.content = sanitizeGroupVisibleText(data.detail || 'TestAgent 复核计划已生成。', 'TestAgent 复核计划已整理。', 600)
        waitingCrossReply.value = true
        scrollToBottom()
      } else if (data.type === 'test_agent_review_ready') {
        const applied = applyTestAgentReviewReady(data)
        const payload = getTestAgentReviewPayload(data)
        const headline = payload?.summary?.headline || data.detail || 'TestAgent 独立复核结论已整理。'
        thinkingMsg.content = sanitizeGroupVisibleText(headline, 'TestAgent 独立复核结论已整理。', 600)
        waitingCrossReply.value = applied || waitingCrossReply.value
        scrollToBottom()
      } else if (data.type === 'task_created') {
        applyMainAgentProgressCheckpoint(data)
        const taskMessage = {
          id: data.messageId,
          role: 'assistant',
          agent: data.agent || 'coordinator',
          type: 'project_task_intake',
          content: data.text || '我已接管项目任务',
          timestamp: new Date().toISOString(),
          task_id: data.task?.id,
          task: data.task || null,
          queue: data.queue || null,
          intakeSummary: data.intakeSummary || data.intake_summary || null,
          intake_summary: data.intake_summary || data.intakeSummary || null,
          workflow: data.workflow || null,
          planMode: data.planMode || data.plan_mode || null,
          plan_mode: data.plan_mode || data.planMode || null,
          taskCard: data.taskCard || data.task_card || null,
          task_card: data.task_card || data.taskCard || null,
          taskRuntime: data.taskRuntime || data.task_runtime || null,
          task_runtime: data.task_runtime || data.taskRuntime || null,
          mainAgentDecision: data.mainAgentDecision || data.main_agent_decision || null,
          main_agent_decision: data.main_agent_decision || data.mainAgentDecision || null
        }
        mergeIncomingMessage(taskMessage)
        waitingCrossReply.value = true
        toast.success('项目任务已创建：' + (data.task?.id || ''))
        scrollToBottom()
      } else if (data.type === 'main_agent_decision') {
        if (attachMainAgentDecision(data.decision)) {
          scrollToBottom()
        }
      } else if (data.type === 'assignment_status') {
        if (applyAssignmentStatus(data)) {
          scrollToBottom()
        }
      } else if (data.type === 'native_session') {
        applyTransientTaskRuntime(data.taskId, (runtime) => {
          const sessions = runtime.sessions || []
          const index = sessions.findIndex(item => item.project === data.session?.project && item.agentType === data.session?.agentType)
          const session = { ...data.session, status: 'open', native: data.session?.mode === 'native', degraded: data.session?.mode !== 'native' }
          if (index >= 0) sessions[index] = { ...sessions[index], ...session }
          else sessions.push(session)
          return { ...runtime, status: 'in_progress', sessions, statusText: `${data.agent} ${data.session?.resumed ? '恢复原生会话' : '创建原生会话'}` }
        })
        scrollToBottom()
      } else if (data.type === 'runtime_fallback') {
        const fallbackText = sanitizeGroupVisibleText(data.text, 'Agent 执行通道正在切换，排障信息已放入技术详情。', 600)
        applyTransientTaskRuntime(data.taskId, (runtime) => {
          const agents = runtime.agents || []
          const index = agents.findIndex(item => item.project === data.agent)
          const patch = { project: data.agent, state: 'spawning', runtimeFallbacks: Number(agents[index]?.runtimeFallbacks || 0) + 1, runtime: data.toRuntime }
          if (index >= 0) agents[index] = { ...agents[index], ...patch }
          else agents.push(patch)
          return { ...runtime, status: 'in_progress', agents, statusText: fallbackText }
        })
        appendAgentWorkEvent(data.agent, { id: `fallback-${Date.now()}`, time: new Date().toISOString(), kind: 'warning', text: fallbackText })
        scrollToBottom()
      } else if (data.type === 'conflict_plan') {
        messages.value.push({
          id: `conflict-${Date.now()}`,
          role: 'assistant',
          agent: 'system',
          type: 'conflict_plan',
          content: data.text,
          conflictPlan: data.conflictPlan,
          task_id: data.taskId,
          timestamp: new Date().toISOString()
        })
        waitingCrossReply.value = true
        scrollToBottom()
      } else if (data.type === 'agent_work_event') {
        appendAgentWorkEvent(data.agent, data.event)
        waitingCrossReply.value = true
        scrollToBottom()
      } else if (data.type === 'agent_qa') {
        appendAgentQaMessage(data)
        waitingCrossReply.value = true
        scrollToBottom()
      } else if (data.type === 'chunk' && data.agent) {
        // 流式 chunk：为每个 Agent 创建独立的流式消息
        const agentKey = data.agent
        if (!agentStreamMsgs[agentKey]) {
          const streamMsg = {
            role: 'assistant',
            agent: agentKey,
            content: '',
            streaming: true,
            workEvents: [],
            timestamp: new Date().toISOString()
          }
          agentStreamMsgs[agentKey] = streamMsg
          messages.value.push(streamMsg)
        }
        const chunkText = String(data.text || '')
        const nextRaw = `${agentStreamRawBuffers[agentKey] || ''}${chunkText}`
        agentStreamRawBuffers[agentKey] = nextRaw
        if (agentStreamHiddenBuffers[agentKey] || GROUP_VISIBLE_INTERNAL_TEXT_PATTERN.test(nextRaw)) {
          agentStreamHiddenBuffers[agentKey] = true
          agentStreamMsgs[agentKey].content = sanitizeGroupVisibleText(nextRaw, '执行成员已提交技术执行信息，我正在整理用户可读结论。', 1200)
        } else {
          agentStreamMsgs[agentKey].content += sanitizeGroupVisibleText(chunkText)
        }
        if (chunkText.includes('@')) {
          hasMention = true
          waitingCrossReply.value = true
        }
        scrollToBottom()
      } else if (data.type === 'agent_done') {
        // 某个 Agent 完成：用最终完整内容替换流式消息
        const agentKey = data.agent
        const streamMsg = agentStreamMsgs[agentKey]
        const finalText = sanitizeGroupVisibleText(data.text || agentStreamRawBuffers[agentKey], '执行成员已提交结果说明，我正在汇总验收。', 3000)
        if (streamMsg) {
          if (data.messageId) streamMsg.id = data.messageId
          streamMsg.content = finalText
          streamMsg.streaming = false
          if (Array.isArray(data.assignments)) streamMsg.assignments = data.assignments
          streamMsg.executionOrder = data.executionOrder || streamMsg.executionOrder || ''
          streamMsg.runtime = data.runtime || streamMsg.runtime || ''
          streamMsg.dispatchPolicy = data.dispatchPolicy || streamMsg.dispatchPolicy || null
          streamMsg.coordinationPlan = data.coordinationPlan || streamMsg.coordinationPlan || null
          streamMsg.workflow = data.workflow || streamMsg.workflow
          streamMsg.mainAgentDecision = data.mainAgentDecision || data.main_agent_decision || streamMsg.mainAgentDecision || streamMsg.main_agent_decision
          streamMsg.main_agent_decision = data.main_agent_decision || data.mainAgentDecision || streamMsg.main_agent_decision || streamMsg.mainAgentDecision
          streamMsg.clarificationSummary = data.clarificationSummary || data.clarification_summary || streamMsg.clarificationSummary || streamMsg.clarification_summary
          streamMsg.clarification_summary = data.clarification_summary || data.clarificationSummary || streamMsg.clarification_summary || streamMsg.clarificationSummary
          streamMsg.workEvents = data.workEvents || streamMsg.workEvents
          if (data.fileChanges && data.fileChanges.count > 0) {
            streamMsg.fileChanges = data.fileChanges
          }
        } else {
          if ((finalText && finalText.trim()) || (data.fileChanges && data.fileChanges.count > 0)) {
            messages.value.push({
              id: data.messageId,
              role: 'assistant',
              agent: data.agent,
              content: finalText,
              timestamp: new Date().toISOString(),
              assignments: data.assignments || null,
              executionOrder: data.executionOrder || '',
              runtime: data.runtime || '',
              dispatchPolicy: data.dispatchPolicy || null,
              coordinationPlan: data.coordinationPlan || null,
              workflow: data.workflow || null,
              mainAgentDecision: data.mainAgentDecision || data.main_agent_decision || null,
              main_agent_decision: data.main_agent_decision || data.mainAgentDecision || null,
              clarificationSummary: data.clarificationSummary || data.clarification_summary || null,
              clarification_summary: data.clarification_summary || data.clarificationSummary || null,
              fileChanges: data.fileChanges || null,
              workEvents: data.workEvents || []
            })
          }
        }
        delete agentStreamRawBuffers[agentKey]
        delete agentStreamHiddenBuffers[agentKey]
        if (String(data.text || '').includes('@')) {
          hasMention = true
          waitingCrossReply.value = true
        }
        scrollToBottom()
      } else if (data.type === 'chunk') {
        // 单 Agent 模式的 chunk
        if (!agentMsgAdded) {
          messages.value.push(agentMsg)
          agentMsgAdded = true
        }
        const chunkText = String(data.text || '')
        singleStreamRawBuffer += chunkText
        if (singleStreamHiddenBuffer || GROUP_VISIBLE_INTERNAL_TEXT_PATTERN.test(singleStreamRawBuffer)) {
          singleStreamHiddenBuffer = true
          agentMsg.content = sanitizeGroupVisibleText(singleStreamRawBuffer, '执行成员已提交技术执行信息，我正在整理用户可读结论。', 1200)
        } else {
          agentMsg.content += sanitizeGroupVisibleText(chunkText)
        }
        if (chunkText.includes('@')) hasMention = true
        scrollToBottom()
      } else if (data.type === 'done') {
        isStreaming.value = false
        const thinkingIdx = messages.value.indexOf(thinkingMsg)
        if (thinkingIdx !== -1) messages.value.splice(thinkingIdx, 1)
        // 附加文件变更到当前 Agent 消息
        if (data.messageId) {
          agentMsg.id = data.messageId
        }
        if (data.fileChanges && data.fileChanges.count > 0) {
          agentMsg.fileChanges = data.fileChanges
        }
      } else if (data.type === 'error') {
        messages.value.push({
          role: 'assistant',
          agent: 'system',
          content: '错误：' + sanitizeGroupVisibleText(data.text, '请求处理失败，排障信息已放入技术详情。', 800),
          timestamp: new Date().toISOString()
        })
        isStreaming.value = false
      }
    } catch {}
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    sseBuffer += decoder.decode(value, { stream: true })
    const lines = sseBuffer.split('\n')
    sseBuffer = lines.pop() || ''
    for (const line of lines) {
      handleStreamLine(line.trimEnd())
    }
  }
  sseBuffer += decoder.decode()
  if (sseBuffer.trim()) {
    for (const line of sseBuffer.split('\n')) {
      handleStreamLine(line.trimEnd())
    }
  }

  isStreaming.value = false
  const thinkingIdx = messages.value.indexOf(thinkingMsg)
  if (thinkingIdx !== -1) messages.value.splice(thinkingIdx, 1)

  // 既然所有协作已经在同一个 SSE 请求中同步完成，重置等待标志，并主动拉取一次做最终同步
  waitingCrossReply.value = false
  if (currentGroup.value) {
    await pullNewMessages()
  }
  // 更新轮询基准计数
  if (currentGroup.value) {
    try {
      const res = await fetch(`/api/groups/messages?id=${currentGroup.value.id}&limit=100`)
      const data = await res.json()
      mainAgentStatus.value = data.mainAgentStatus || mainAgentStatus.value
      groupAgentQa.value = data.agentQa || groupAgentQa.value
      lastGroupMsgCount.value = (data.messages || []).length
    } catch {}
  }
}

// 等待跨 Agent 回复状态
const waitingCrossReply = ref(false)

// 主动拉取新消息（带去重）
const pullNewMessages = async () => {
  if (!currentGroup.value) return
  try {
    const res = await fetch(`/api/groups/messages?id=${currentGroup.value.id}&limit=100`)
    const data = await res.json()
    mainAgentStatus.value = data.mainAgentStatus || mainAgentStatus.value
    groupAgentQa.value = data.agentQa || groupAgentQa.value
    const msgs = data.messages || []
    let appended = 0
    for (const m of msgs) {
      if (mergeIncomingMessage(m)) appended++
    }
    if (appended > 0) {
      scrollToBottom()
      // 收到新消息后停止等待提示
      waitingCrossReply.value = false
    }
    lastGroupMsgCount.value = msgs.length
  } catch {}
}

// 加载群聊日志
const logs = ref([])
const logFilter = ref('')
let logEventSource = null
let logsResizeObserver = null

watch(showLogs, (newVal) => {
  if (newVal) {
    nextTick(() => {
      if (typeof ResizeObserver === 'undefined') return
      const outer = document.getElementById('logsContent')
      const inner = document.getElementById('logsContentInner')
      if (outer && inner) {
        if (logsResizeObserver) logsResizeObserver.disconnect()
        logsResizeObserver = new ResizeObserver(() => {
          outer.scrollTop = outer.scrollHeight
        })
        logsResizeObserver.observe(inner)
      }
    })
  } else {
    if (logsResizeObserver) {
      logsResizeObserver.disconnect()
      logsResizeObserver = null
    }
  }
})

const scrollLogsToBottom = () => {
  nextTick(() => {
    const el = document.getElementById('logsContent')
    if (el) el.scrollTop = el.scrollHeight
  })
  setTimeout(() => {
    const el = document.getElementById('logsContent')
    if (el) el.scrollTop = el.scrollHeight
  }, 60)
  setTimeout(() => {
    const el = document.getElementById('logsContent')
    if (el) el.scrollTop = el.scrollHeight
  }, 220)
}

watch(logFilter, () => {
  scrollLogsToBottom()
})

const loadLogs = async () => {
  if (!currentGroup.value) return

  // 加载历史日志
  const res = await fetch(`/api/groups/logs?id=${currentGroup.value.id}&limit=100`)
  const data = await res.json()
  logs.value = data.logs || []
  showLogs.value = true

  // 启动实时日志流
  startLogStream()

  scrollLogsToBottom()
}

const startLogStream = () => {
  if (logEventSource) logEventSource.close()
  if (!currentGroup.value) return

  logEventSource = new EventSource(`/api/groups/logs/stream?id=${currentGroup.value.id}`)

  logEventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'log') {
        logs.value.push(data.log)
        // 滚动到底部
        nextTick(() => {
          const el = document.getElementById('logsContent')
          if (el) el.scrollTop = el.scrollHeight
        })
      }
    } catch {}
  }

  logEventSource.onerror = () => {
    console.log('日志流连接断开')
  }
}

const stopLogStream = () => {
  if (logEventSource) {
    logEventSource.close()
    logEventSource = null
  }
}

const clearLogs = async () => {
  const confirmed = await confirmDialog('确定清空群聊日志？清空后无法恢复。')
  if (!confirmed) return
  await fetch('/api/groups/logs/clear', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ group_id: currentGroup.value.id })
  })
  logs.value = []
  toast.success('日志已清空')
}

// 群聊成员管理
const normalizeGroupTools = (tools = {}) => ({
  mcp: Array.from(new Set((Array.isArray(tools.mcp) ? tools.mcp : []).map(item => String(item || '').trim()).filter(Boolean))),
  skill: Array.from(new Set((Array.isArray(tools.skill) ? tools.skill : []).map(item => String(item || '').trim()).filter(Boolean)))
})

const loadAvailableGroupTools = async () => {
  const options = await fetch('/api/tools/authorization-options').then(r => r.json()).catch(() => ({ mcp: [], skill: [] }))
  groupAllTools.value = {
    mcp: options.mcp || [],
    skill: options.skill || []
  }
}

const loadGroupTools = async () => {
  if (!currentGroup.value) return
  const [data] = await Promise.all([
    fetch(`/api/groups/tools?id=${currentGroup.value.id}`).then(r => r.json()),
    loadAvailableGroupTools()
  ])
  groupTools.value = normalizeGroupTools(data.tools)
  groupToolAudit.value = data.tool_audit || null
  groupAuthorizationReadiness.value = data.authorization_readiness || null
  showTools.value = true
}

const toggleGroupTool = (type, name) => {
  const normalized = normalizeGroupTools(groupTools.value)
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
  groupTools.value = normalized
}

const saveGroupTools = async () => {
  groupTools.value = normalizeGroupTools(groupTools.value)
  const res = await fetch('/api/groups/tools', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ group_id: currentGroup.value.id, tools: groupTools.value })
  })
  const data = await res.json()
  if (!data.success) {
    toast.error('工具配置保存失败: ' + (data.error || '未知错误'))
    return
  }
  groupTools.value = normalizeGroupTools(data.tools)
  groupToolAudit.value = data.tool_audit || null
  groupAuthorizationReadiness.value = data.authorization_readiness || null
  showTools.value = false
  if (data.authorization_readiness && data.authorization_readiness.dispatchReady === false) {
    toast.warning('工具配置已保存，但有授权项当前不可用')
  } else {
    toast.success('工具配置已保存')
  }
}

// 群聊共享文件
const groupFiles = ref([])

const loadGroupFiles = async () => {
  if (!currentGroup.value) return
  const data = await fetch(`/api/groups/shared?id=${currentGroup.value.id}`).then(r => r.json())
  groupFiles.value = data.files || []
  showSharedFiles.value = true
}

const addGroupFile = async () => {
  // 使用弹窗代替 prompt
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal">
    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
    <h3>新建共享文件</h3>
    <div class="form-group">
      <label>文件名</label>
      <input type="text" id="newGroupFileName" placeholder="如 api-docs.md">
    </div>
    <div class="form-group">
      <label>文件内容</label>
      <textarea id="newGroupFileContent" rows="8" style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid var(--border-color);background:rgba(15,23,42,0.6);color:var(--text-primary);font-size:13px;resize:vertical;outline:none" placeholder="输入文件内容..."></textarea>
    </div>
    <div class="form-actions">
      <button class="btn btn-cancel" onclick="this.closest('.modal-overlay').remove()">取消</button>
      <button class="btn btn-primary" onclick="submitAddGroupFile()">创建</button>
    </div>
  </div>`;
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}

const submitAddGroupFile = async () => {
  const name = document.getElementById("newGroupFileName")?.value?.trim();
  const content = document.getElementById("newGroupFileContent")?.value || "";
  if (!name) { toast.warning('请输入文件名'); return }

  await fetch('/api/groups/shared/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ group_id: currentGroup.value.id, name, content })
  });
  document.querySelector('.modal-overlay')?.remove();
  loadGroupFiles();
  toast.success('文件创建成功');
}

const deleteGroupFile = async (name) => {
  const confirmed = await confirmDialog(`确定删除文件 "${name}"？删除后无法恢复。`)
  if (!confirmed) return
  await fetch('/api/groups/shared/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ group_id: currentGroup.value.id, name })
  })
  loadGroupFiles()
  toast.success('文件已删除')
}

// 获取可添加的项目
const getAvailableProjects = () => {
  if (!currentGroup.value) return []
  const currentMembers = currentGroup.value.members?.map(m => m.project) || []
  return projects.value.filter(p => !currentMembers.includes(p.name))
}

// 群聊成员管理
const addGroupMember = async (project, agent) => {
  const res = await fetch('/api/groups/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: currentGroup.value.id, add: [{ project, agent }] })
  })
  const data = await res.json()
  if (data.success) {
    currentGroup.value = data.group
    loadGroups()
    toast.success(`已添加 ${project} 到群聊`)
    // 刷新成员列表
    showMembers.value = false
    nextTick(() => { showMembers.value = true })
  } else {
    toast.error('添加失败: ' + (data.error || '未知错误'))
  }
}

const removeGroupMember = async (project) => {
  const confirmed = await confirmDialog(`确定移除 ${project}？`)
  if (!confirmed) return
  const res = await fetch('/api/groups/members', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: currentGroup.value.id, remove: [project] })
  })
  const data = await res.json()
  if (data.success) {
    currentGroup.value = data.group
    loadGroups()
    toast.success(`已移除 ${project}`)
    // 刷新成员列表
    showMembers.value = false
    nextTick(() => { showMembers.value = true })
  } else {
    toast.error('移除失败: ' + (data.error || '未知错误'))
  }
}

// 群聊消息轮询
let groupPollTimer = null
const lastGroupMsgCount = ref(0)

const startGroupPolling = () => {
  if (groupPollTimer) clearInterval(groupPollTimer)
  if (!currentGroup.value) return

  groupPollTimer = setInterval(async () => {
    if (!currentGroup.value) {
      clearInterval(groupPollTimer)
      return
    }
    await pullNewMessages()
  }, 3000) // 每 3 秒检查一次
}

const stopGroupPolling = () => {
  if (groupPollTimer) {
    clearInterval(groupPollTimer)
    groupPollTimer = null
  }
}

onMounted(() => {
  loadGroups()
  loadProjects()
  nextTick(attachGroupMessagesResizeObserver)
})

onUnmounted(() => {
  detachGroupMessagesResizeObserver()
})

// 监听群聊切换，启动/停止轮询和日志流
const origSelectGroup = selectGroup
selectGroup = async (id) => {
  stopGroupPolling()
  stopLogStream()
  await origSelectGroup(id)
  lastGroupMsgCount.value = messages.value.length
  startGroupPolling()
}

// --- 对话模板相关逻辑开始 ---
const activeSelectedTemplate = inject('activeSelectedTemplate', null)
const pendingTemplateToApply = ref(null)

if (activeSelectedTemplate) {
  watch(activeSelectedTemplate, (newVal) => {
    if (newVal && newVal.targetTab === 'groups' && newVal.targetId) {
      if (currentGroup.value?.id === newVal.targetId) {
        selectChatTemplate(newVal.template)
        activeSelectedTemplate.value = null
      } else {
        pendingTemplateToApply.value = newVal.template
      }
    }
  })
}

// --- 对话模板相关逻辑结束 ---
</script>

<template>
  <div class="group-chat">
    <GroupChatHeader
      :groups="groups"
      :current-group="currentGroup"
      :collaboration-protocol="collaborationProtocol"
      :memory-active="hasCompressedMemory()"
      :memory-label="getMemoryCompressionLabel()"
      :memory-meta="getMemoryCompressionMeta()"
      :memory-title="getMemoryCompressionTitle()"
      :get-member-count-label="getMemberCountLabel"
      @select-group="selectGroup"
      @create-group="showCreate = true"
      @load-tools="loadGroupTools"
      @load-files="loadGroupFiles"
      @load-logs="loadLogs"
      @show-members="showMembers = true"
      @refresh="loadMessages"
      @save-knowledge="saveCurrentGroupConversationKnowledge"
      @rename="renameName = $event; showRename = true"
      @clear-messages="clearGroupMessages"
      @delete-group="deleteGroup"
    />

    <!-- 主内容区 -->
    <div class="main-content">
      <div class="content">
        <!-- 消息区域 -->
        <div id="groupMessages" ref="groupMessagesEl" class="messages" @scroll="updateGroupMessageScrollState">
          <div ref="groupMessagesContentEl" style="display: flex; flex-direction: column; width: 100%; min-height: 100%;">
            <div v-if="!currentGroup" class="empty">
              <span class="icon">💬</span>
              <span>开始群聊协作</span>
              <span class="sub">创建群聊并添加 Agent 成员</span>
            </div>
            <div v-else class="messages-flow" :key="currentGroup?.id" style="width: 100%; display: flex; flex-direction: column;">
              <GroupMainAgentStatusCard
                v-if="hasMainAgentStatusDetail"
                :status="mainAgentStatus"
                :group-agent-qa="groupAgentQa"
                :latest-decision="latestMainAgentDecision"
                @open-pipeline="openMainAgentPipeline"
                @locate-decision="scrollToLatestMainDecision"
              />
              <div v-for="(msg, i) in messages" v-show="shouldShowGroupMessage(msg, i)" :key="getGroupMessageKey(msg)" :id="'gc-msg-' + i" class="message" :class="[msg.role, { 'msg-highlight': highlightMsgIndex === i }]">
                <CommandResultCard v-if="msg.type === 'command_result'" :result="msg.commandResult" />
                <!-- 思考过程消息 -->
                <div v-else-if="msg.role === 'thinking'" class="thinking-bubble">
                  <div class="thinking-header">
                    <span class="thinking-icon">🧠</span>
                    <span>正在处理...</span>
                  </div>
                  <div class="thinking-content">{{ msg.content }}</div>
                  <span class="stream-cursor">▌</span>
                </div>
                <!-- 用户消息 -->
                <div v-else-if="msg.role === 'user'" class="bubble">
                  <span class="label">👤 → @{{ getTargetDisplayName(msg.target) }}</span>
                  <div v-html="highlightMentions(msg.content)"></div>
                  <TaskCollaborationCard v-if="isPrimaryTaskCard(msg, i)" :card="getTaskCard(msg)" :runtime="getTaskRuntime(msg)" @action="handleTaskCardAction(msg, $event)" />
                </div>
                <!-- 项目主 Agent 任务接管 -->
                <ProjectTaskIntakeMessage v-else-if="msg.type === 'project_task_intake'" :msg="msg" :display-content="getVisibleGroupMessageContent(msg, '我已接管项目任务。')" :accent-style="getAgentAccentStyle(msg.agent)">
                  <MainAgentDecisionCard v-if="getMainAgentDecision(msg) && !isPrimaryTaskCard(msg, i)" :decision="getMainAgentDecision(msg)" compact @step-action="handleTaskCardAction(msg, $event)" />
                  <TaskCollaborationCard v-if="isPrimaryTaskCard(msg, i)" :card="getTaskCard(msg)" :runtime="getTaskRuntime(msg)" @action="handleTaskCardAction(msg, $event)" />
                </ProjectTaskIntakeMessage>
                <ConflictPlanMessage v-else-if="msg.type === 'conflict_plan'" :msg="msg" />
                <!-- Agent 问答 -->
                <AgentQaMessage
                  v-else-if="isAgentQaMessage(msg)"
                  :msg="msg"
                  :display-content="getVisibleGroupMessageContent(msg, '回复已整理，技术细节已放入技术详情。')"
                  :accent-style="getAgentAccentStyle(msg.agent)"
                  :action-loading="agentQaActionLoading"
                  :highlight-mentions="highlightMentions"
                  :get-agent-display-name="getAgentDisplayName"
                  @action="runAgentQaAction(msg, $event)"
                />
                <!-- Agent 回复 -->
                <AgentExecutionMessage
                  v-else
                  :msg="msg"
                  :accent-style="getAgentAccentStyle(msg.agent)"
                  :status="getAgentMessageStatus(msg)"
                  :agent-initials="getAgentInitials(msg.agent)"
                  :agent-display-name="getAgentDisplayName(msg.agent)"
                  :main-agent-decision="getMainAgentDecision(msg)"
                  :task-card="getTaskCard(msg)"
                  :task-runtime="getTaskRuntime(msg)"
                  :primary-task-card="isPrimaryTaskCard(msg, i)"
                  :show-orchestration-plan="shouldShowOrchestrationPlan(msg)"
                  :work-events="getWorkEvents(msg)"
                  :main-agent="isGroupMainAgentMessage(msg)"
                  :file-changes-title="getFileChangesTitle(msg.fileChanges)"
                  :workflow-steps="workflowSteps"
                  :highlight-mentions="highlightMentions"
                  :get-plan-title="getPlanTitle"
                  :get-execution-order-label="getExecutionOrderLabel"
                  :get-dispatch-action-label="getDispatchActionLabel"
                  :compact-plan-text="compactPlanText"
                  :get-workflow-label="getWorkflowLabel"
                  :get-workflow-step-state="getWorkflowStepState"
                  :get-assignment-key="getAssignmentKey"
                  :get-assignment-status-class="getAssignmentStatusClass"
                  :get-assignment-status-label="getAssignmentStatusLabel"
                  :get-agent-display-name="getAgentDisplayName"
                  @step-action="handleTaskCardAction(msg, $event)"
                  @task-action="handleTaskCardAction(msg, $event)"
                  @open-pipeline="openPipelineViewer(msg)"
                  @open-file-diff="openFileDiff"
                />
                <div class="msg-meta">{{ new Date(msg.timestamp).toLocaleString('zh-CN') }}</div>
              </div>
            </div>
          </div>
        </div>
        <!-- 消息锚点导航条 (Codex 风格) -->
        <MessageNavigator :items="navMessages" @navigate="scrollToMessage" />

        <!-- 等待跨 Agent 回复提示 -->
        <div v-if="waitingCrossReply" style="padding:6px 16px;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--accent-purple);background:rgba(167,139,250,0.05);border-top:1px solid rgba(167,139,250,0.15)">
          <span style="animation:pulse 1.5s infinite">⏳</span>
          <span>等待其他 Agent 回复中...</span>
          <span style="margin-left:auto;font-size:10px;color:var(--text-muted);cursor:pointer" @click="waitingCrossReply = false">忽略</span>
        </div>

        <!-- 输入栏 -->
        <ChatComposer
          v-if="currentGroup"
          v-model="newMessage"
          input-id="groupChatInput"
          placeholder="输入消息...（可 @ 项目执行成员，输入 / 打开命令中心）"
          send-label="发送 ➤"
          :files="messageFiles"
          :slash="slash"
          :templates-open="showTemplateSelector"
          :templates="allTemplates"
          :template-search-query="templateSearchQuery"
          :active-template-index="activeTemplateIndex"
          :recommended-template="recommendedTemplate"
          @files-selected="onMessageFilesSelected"
          @remove-file="removeMessageFile"
          @open-template="openTemplateSelector"
          @update:template-search-query="templateSearchQuery = $event"
          @select-template="selectChatTemplate"
          @apply-recommendation="applyRecommendation"
          @keydown="handleKeydown"
          @input="handleInput"
          @send="sendMessage"
        >
          <template #prefix>
            <div class="message-mode" aria-label="消息模式">
              <button type="button" :class="{ active: messageMode === 'conversation' }" @click="messageMode = 'conversation'">对话</button>
              <button type="button" :class="{ active: messageMode === 'project_analysis' }" @click="messageMode = 'project_analysis'; targetAgent = 'all'">项目分析</button>
              <button type="button" :class="{ active: messageMode === 'project_task' }" @click="messageMode = 'project_task'; targetAgent = 'all'">项目任务</button>
            </div>
          </template>
          <template #overlays>
            <div v-if="mentionDropdown && getFilteredAgents().length > 0" class="mention-dropdown">
              <div
                v-for="(agent, i) in getFilteredAgents()"
                :key="agent"
                class="mention-item"
                :class="{ active: i === mentionIndex }"
                @click="insertMention(agent)"
              >
                <span>@</span>
                <span>{{ agent }}</span>
              </div>
            </div>
          </template>
        </ChatComposer>
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
      @open-changes="openDrawerChangesTab"
    />

    <AgentPipelineModal
      v-if="pipelineViewer.visible"
      :viewer="pipelineViewer"
      @close="pipelineViewer.visible = false"
    />

    <UnifiedDiffModal
      :visible="diffViewer.visible"
      :file="diffViewer.file"
      @close="closeFileDiff"
    />

    <GroupCreateModal
      v-if="showCreate"
      v-model:name="newGroupName"
      :projects="projects"
      @toggle-project="updateCreateGroupProjectSelection"
      @submit="submitCreateGroup"
      @close="showCreate = false"
    />

    <GroupRenameModal
      v-if="showRename"
      v-model:name="renameName"
      :placeholder="currentGroup?.name"
      @submit="submitRename"
      @close="showRename = false"
    />

    <GroupLogsModal
      v-if="showLogs"
      :group-name="currentGroup?.name"
      :logs="logs"
      v-model:filter="logFilter"
      @clear="clearLogs"
      @close="showLogs = false"
    />

    <GroupToolsModal
      v-if="showTools"
      :group-name="currentGroup?.name"
      :tools="groupTools"
      :all-tools="groupAllTools"
      :tool-audit="groupToolAudit"
      :authorization-readiness="groupAuthorizationReadiness"
      @close="showTools = false"
      @toggle-tool="toggleGroupTool"
      @save="saveGroupTools"
    />

    <GroupSharedFilesModal
      v-if="showSharedFiles"
      :group-name="currentGroup?.name"
      :files="groupFiles"
      @add-file="addGroupFile"
      @delete-file="deleteGroupFile"
      @close="showSharedFiles = false"
    />

    <GroupMembersModal
      v-if="showMembers"
      :group-name="currentGroup?.name"
      :members="getRoutableMembers()"
      :available-projects="getAvailableProjects()"
      @add-member="addGroupMember"
      @remove-member="removeGroupMember"
      @close="showMembers = false"
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
.group-chat { display: flex; flex-direction: column; height: 100%; }
.toolbar { display: flex; align-items: center; padding: 14px 20px; background: rgba(255, 255, 255, 0.25); border-bottom: 1px solid rgba(0, 0, 0, 0.05); gap: 12px; }
.toolbar-left { display: flex; align-items: center; gap: 12px; flex: 1; overflow-x: auto; }
.toolbar-left::-webkit-scrollbar { display: none; }
.label { font-size: 12px; color: var(--text-muted); white-space: nowrap; font-weight: 500; }
.group-list { display: flex; gap: 10px; overflow-x: auto; }
.group-list::-webkit-scrollbar { display: none; }
.group-card { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: rgba(255, 255, 255, 0.45); border: 1px solid rgba(0, 0, 0, 0.06); border-radius: 10px; cursor: pointer; white-space: nowrap; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); font-size: 13px; color: var(--text-secondary); }
.group-card:hover { border-color: rgba(59, 130, 246, 0.2); background: rgba(59, 130, 246, 0.02); }
.group-card.active { border-color: rgba(59, 130, 246, 0.35); background: rgba(59, 130, 246, 0.08); color: var(--accent-blue); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.03); }
.badge { font-size: 9.5px; padding: 2px 6px; background: rgba(0,0,0,0.04); border-radius: 4px; color: var(--text-muted); font-family: 'Share Tech Mono', monospace; }
.main-content { flex: 1; display: flex; overflow: hidden; }
.content { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: transparent; position: relative; }
.content-header { padding: 14px 20px; border-bottom: 1px solid rgba(0, 0, 0, 0.05); font-size: 13px; font-weight: 600; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.group-title-line { display: flex; align-items: center; gap: 10px; min-width: 0; flex-wrap: wrap; }
.memory-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 4px 7px 4px 9px;
  border-radius: 999px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255, 255, 255, 0.62);
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.035);
  transition: border-color .18s ease, background .18s ease, box-shadow .18s ease, transform .18s ease;
}
.memory-chip:hover {
  border-color: rgba(15, 23, 42, 0.14);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.055);
  transform: translateY(-1px);
}
.memory-chip.active { color: #334155; }
.memory-chip.protocol { color: #475569; }
.memory-chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(100, 116, 139, 0.44);
  box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.08);
  flex: 0 0 auto;
}
.memory-chip.active .memory-chip-dot {
  background: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.10);
}
.memory-chip.protocol .memory-chip-dot {
  background: #0f172a;
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08);
}
.memory-chip-label { letter-spacing: -0.01em; }
.memory-chip-meta {
  padding: 3px 6px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.055);
  color: var(--text-muted);
  font-size: 10.5px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.messages { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; }
.message { margin-bottom: 18px; max-width: 80%; animation: msg-in 0.35s cubic-bezier(0.25, 0.8, 0.25, 1); }
.msg-highlight { animation: msg-flash 0.5s ease-in-out 3; border-radius: 12px; }
@keyframes msg-flash { 0%,100%{background:transparent} 50%{background:rgba(250,204,21,0.15)} }
@keyframes msg-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
.message.user { margin-left: auto; }
.message .bubble { padding: 12px 16px; border-radius: 14px; font-size: 13.5px; line-height: 1.6; word-break: break-word; }
.message.user .bubble { background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.03) 100%); border: 1px solid rgba(59, 130, 246, 0.15); color: var(--text-primary); border-bottom-right-radius: 4px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.03); }
.message.assistant .bubble { background: rgba(255, 255, 255, 0.55); backdrop-filter: blur(25px); border: 1px solid rgba(0, 0, 0, 0.06); color: var(--text-secondary); border-bottom-left-radius: 4px; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04); }
.label { display: block; font-size: 11px; opacity: 0.7; margin-bottom: 6px; font-weight: 500; }
.label.agent { color: var(--accent-blue); opacity: 1; letter-spacing: 0.5px; }
.label.system { color: var(--accent-red); opacity: 1; letter-spacing: 0.5px; }
.msg-meta { font-size: 10px; color: var(--text-muted); margin-top: 6px; font-family: 'Share Tech Mono', monospace; }
.message-mode {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
}
.message-mode button {
  min-height: 30px;
  padding: 0 11px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: background .16s ease, color .16s ease, box-shadow .16s ease;
}
.message-mode button.active {
  background: var(--accent-blue);
  color: #fff;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.18);
}
.select { padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.08); background: rgba(255, 255, 255, 0.8); color: var(--text-primary); font-size: 13px; outline: none; }
.mention-dropdown { position: absolute; bottom: 100%; left: 0; right: 0; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px); border: 1px solid rgba(0, 0, 0, 0.08); border-radius: 10px; max-height: 200px; overflow-y: auto; z-index: 10001; box-shadow: var(--shadow-lg); margin-bottom: 6px; padding: 6px; }
.mention-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; border-radius: 6px; transition: background 0.15s; font-size: 12.5px; color: var(--text-secondary); }
.mention-item:hover, .mention-item.active { background: rgba(59, 130, 246, 0.08); color: var(--accent-blue); }
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 10px; color: var(--text-muted); }
.sub { font-size: 12px; }
.icon { font-size: 32px; opacity: 0.4; }
.agent-status { color: var(--text-muted); font-style: italic; font-size: 11.5px; }
.stream-cursor {
  animation: pulse-glow 1s infinite ease-in-out;
  color: var(--accent-blue);
  font-weight: bold;
  display: inline;
  margin-left: 2px;
}
@keyframes pulse-glow {
  0%, 100% { opacity: 0.15; text-shadow: 0 0 0px rgba(59, 130, 246, 0); }
  50% { opacity: 1; text-shadow: 0 0 8px rgba(59, 130, 246, 0.6); }
}
.thinking-bubble {
  background: rgba(99, 102, 241, 0.03);
  border: 1px solid rgba(99, 102, 241, 0.15);
  border-radius: 12px;
  padding: 14px 18px;
  margin-bottom: 16px;
  max-width: 85%;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.02);
  animation: fade-in 0.3s ease-out;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.thinking-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--accent-purple);
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: 0.3px;
}
.thinking-icon {
  font-size: 15px;
  display: inline-block;
  animation: rotate-pulse 2s infinite linear;
}
@keyframes rotate-pulse {
  0% { transform: rotate(0deg) scale(1); opacity: 0.8; }
  50% { transform: rotate(180deg) scale(1.15); opacity: 1; }
  100% { transform: rotate(360deg) scale(1); opacity: 0.8; }
}
.thinking-content {
  font-size: 11.5px;
  color: var(--text-muted);
  line-height: 1.6;
  white-space: pre-wrap;
  font-family: 'JetBrains Mono', monospace;
  max-height: 200px;
  overflow-y: auto;
}
.btn { padding: 8px 16px; border-radius: 10px; border: none; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.btn-primary { background: var(--gradient-blue); color: #ffffff; font-weight: 600; }
.btn-outline { background: transparent; border: 1px solid rgba(0, 0, 0, 0.08); color: var(--text-secondary); }
.btn-danger { background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.18); color: #dc2626; }
.btn-cancel { background: rgba(0, 0, 0, 0.02); border: 1px solid rgba(0, 0, 0, 0.06); color: var(--text-secondary); }
.btn-sm { padding: 5px 10px; font-size: 11.5px; border-radius: 8px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.18); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 10001; }
.modal { background: rgba(255, 255, 255, 0.75) !important; backdrop-filter: blur(30px) !important; border: 1px solid rgba(0, 0, 0, 0.06) !important; border-radius: 16px !important; padding: 28px; min-width: 420px; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08), 0 0 30px rgba(59, 130, 246, 0.04) !important; }
.modal-close { position: absolute; top: 16px; right: 16px; width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.05); background: rgba(0,0,0,0.02); color: var(--text-secondary); cursor: pointer; }
.form-group { margin-bottom: 18px; }
.form-group label { display: block; font-size: 12.5px; color: var(--text-secondary); margin-bottom: 8px; font-weight: 500; }
.form-group input { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(0, 0, 0, 0.08); background: rgba(255, 255, 255, 0.8); color: var(--text-primary); font-size: 13px; outline: none; }
.tag { font-size: 10px; padding: 2px 6px; background: rgba(0,0,0,0.04); border-radius: 4px; color: var(--text-muted); font-family: 'Share Tech Mono', monospace; }
.form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; }

/* 移动端适配 */
@media (max-width: 768px) {
  .content-header { flex-wrap: wrap; gap: 6px; }
  .content-header > div { flex-wrap: wrap; }
  .toolbar { overflow-x: auto; flex-wrap: nowrap; }
  .modal-overlay { padding: 0 !important; align-items: flex-end !important; }
  .modal { min-width: 0 !important; width: 100% !important; max-height: 90vh; border-radius: 16px 16px 0 0 !important; }
}

.group-logs-content {
  flex: 1;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  padding: 12px;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-primary);
}

/* === 群聊日志弹窗全新科技风重构 === */
.modal-logs-styled {
  background: rgba(255, 255, 255, 0.82) !important;
  backdrop-filter: blur(25px) !important;
  -webkit-backdrop-filter: blur(25px) !important;
  border: 1px solid rgba(99, 102, 241, 0.16) !important;
  border-radius: 20px !important;
  box-shadow: 0 20px 50px rgba(99, 102, 241, 0.08) !important;
  padding: 24px !important;
  position: relative;
  transition: all 0.3s;
}

[data-theme="dark"] .modal-logs-styled {
  background: rgba(15, 15, 25, 0.85) !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4) !important;
}

.modal-title-gradient {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 800;
  background: linear-gradient(135deg, #4f46e5, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.modal-toolbar-row {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
}

.custom-select-logs {
  padding: 8px 32px 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(99, 102, 241, 0.16);
  background: rgba(255, 255, 255, 0.6);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  transition: all 0.2s;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236366f1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
}
[data-theme="dark"] .custom-select-logs {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}
.custom-select-logs:hover, .custom-select-logs:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.12);
}

.total-badge {
  font-size: 11px;
  color: #6366f1;
  background: rgba(99, 102, 241, 0.08);
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 600;
}

/* 日志卡片容器 */
.logs-styled-body {
  flex: 1;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.45) !important;
  border-radius: 12px !important;
  border: 1px solid rgba(99, 102, 241, 0.08) !important;
  padding: 16px !important;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 50vh;
}
[data-theme="dark"] .logs-styled-body {
  background: rgba(9, 9, 14, 0.5) !important;
  border-color: rgba(255, 255, 255, 0.04) !important;
}

.logs-empty-state {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
  font-size: 13px;
}

.log-entry-card {
  padding: 10px 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(128, 128, 128, 0.08);
  border-left: 4px solid #6366f1;
  box-shadow: 0 2px 6px rgba(0,0,0,0.01);
  transition: all 0.2s ease;
}
[data-theme="dark"] .log-entry-card {
  background: rgba(255, 255, 255, 0.02);
}
.log-entry-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.02);
}

.log-entry-card.success {
  border-left-color: #10b981;
  background: rgba(16, 185, 129, 0.02);
}
.log-entry-card.error {
  border-left-color: #ef4444;
  background: rgba(239, 68, 68, 0.02);
}

.log-entry-header {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 11px;
}

.log-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 700;
  font-size: 10px;
  color: #6366f1;
  text-transform: uppercase;
}
.log-badge-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: currentColor;
}
.log-badge.success { color: #10b981; }
.log-badge.error { color: #ef4444; }

.log-time {
  color: var(--text-muted);
  margin-left: auto;
}

.log-message-body {
  color: var(--text-secondary);
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.modal-footer-row {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(128, 128, 128, 0.08);
}

.btn-clear-logs {
  background: transparent;
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #ef4444;
  border-radius: 10px;
  padding: 8px 18px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-clear-logs:hover {
  background: rgba(239, 68, 68, 0.06);
  border-color: #ef4444;
}

.btn-close-logs {
  background: linear-gradient(135deg, #6366f1, #3b82f6);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 8px 22px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}
.btn-close-logs:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.35);
}

/* ==================== 群聊协作页面深色美化升级 ==================== */
[data-theme="dark"] .toolbar {
  background: rgba(10, 15, 30, 0.4) !important;
  border-bottom-color: rgba(255, 255, 255, 0.05) !important;
}

[data-theme="dark"] .group-card {
  background: rgba(30, 41, 59, 0.5) !important;
  border-color: rgba(255, 255, 255, 0.05) !important;
  color: var(--text-secondary) !important;
}

[data-theme="dark"] .group-card:hover {
  background: rgba(56, 189, 248, 0.05) !important;
  border-color: rgba(56, 189, 248, 0.2) !important;
}

[data-theme="dark"] .group-card.active {
  background: rgba(56, 189, 248, 0.1) !important;
  border-color: var(--accent-blue) !important;
  color: var(--accent-blue) !important;
}

[data-theme="dark"] .badge {
  background: rgba(255, 255, 255, 0.05) !important;
  color: var(--text-muted) !important;
}

[data-theme="dark"] .content-header {
  border-bottom-color: rgba(255, 255, 255, 0.05) !important;
}

[data-theme="dark"] .memory-chip {
  border-color: rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.62);
  color: #cbd5e1;
  box-shadow: none;
}

[data-theme="dark"] .memory-chip:hover {
  background: rgba(30, 41, 59, 0.78);
  border-color: rgba(148, 163, 184, 0.24);
}

[data-theme="dark"] .memory-chip-meta {
  background: rgba(148, 163, 184, 0.12);
  color: #94a3b8;
}

[data-theme="dark"] .message.assistant .bubble {
  background: var(--surface) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
  box-shadow: none !important;
}

[data-theme="dark"] .message-mode {
  background: var(--bg-primary) !important;
  border-color: var(--border-color) !important;
  box-shadow: none !important;
}

[data-theme="dark"] .message-mode button {
  color: var(--text-muted) !important;
}

[data-theme="dark"] .message-mode button.active {
  background: var(--accent-blue) !important;
  color: #fff !important;
}

[data-theme="dark"] .select {
  background: var(--bg-primary) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .mention-dropdown {
  background: var(--surface) !important;
  border-color: var(--border-color) !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
}

[data-theme="dark"] .diff-modal {
  background: var(--surface) !important;
  border-color: var(--border-color) !important;
}

[data-theme="dark"] .diff-header {
  background: var(--surface-nav) !important;
  border-bottom-color: var(--border-color) !important;
}

[data-theme="dark"] .group-logs-content {
  background: var(--bg-primary) !important;
  border-color: var(--border-color) !important;
}

</style>
