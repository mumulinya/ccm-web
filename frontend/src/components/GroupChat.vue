<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch, inject, computed } from 'vue'
import { groupsApi, projectsApi } from '../api/index.js'
import AgentPipeline from './AgentPipeline.vue'
import { toast, confirmDialog } from '../utils/toast.js'
import SlashCommandMenu from './SlashCommandMenu.vue'
import CommandResultCard from './CommandResultCard.vue'
import TaskCollaborationCard from './TaskCollaborationCard.vue'
import AgentCodeChangeDrawer from './AgentCodeChangeDrawer.vue'
import AgentWorkEventDetails from './AgentWorkEventDetails.vue'
import MainAgentDecisionCard from './MainAgentDecisionCard.vue'
import { useSlashCommands } from '../composables/useSlashCommands.js'
import { createGroupTaskCardActionHandler } from '../composables/useGroupTaskCardActions.js'
import { compactStatusText, mainDecisionActionSummary, mainDecisionModeLabel, mainDecisionNextStep, mainDecisionPlanSummary, mainDecisionTone } from '../composables/useMainAgentDisplay.js'
import { downloadCommandJson } from '../utils/commandExport.js'
import { buildGroupConversationKnowledgePayload, postKnowledgeCapture } from '../utils/knowledgeCapture.js'

const props = defineProps({ navigateTo: { type: Object, default: null } })
const emit = defineEmits(['navigated'])

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
const isGroupMessagesPinnedToBottom = ref(true)
const userMessages = computed(() => {
  return messages.value
    .map((m, idx) => ({ ...m, originalIndex: idx }))
    .filter(m => m.role === 'user')
})
const navMessages = computed(() => {
  const turns = [];
  let currentTurn = null;
  messages.value.forEach((m, idx) => {
    if (m.role === 'user') {
      if (currentTurn) turns.push(currentTurn);
      currentTurn = {
        originalIndex: idx,
        userContent: m.content || '',
        assistantContent: '',
        role: 'user',
        files: m.files || []
      };
    } else if (m.role === 'assistant' && currentTurn) {
      if (!currentTurn.assistantContent) {
        currentTurn.assistantContent = m.content || (m.agenticRun ? (m.agenticRun.final_reply || m.agenticRun.status) : '');
      }
    }
  });
  if (currentTurn) turns.push(currentTurn);
  return turns.length > 40 ? turns.slice(-40) : turns;
})


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
const messageFiles = ref([])
const messageFileInput = ref(null)
const targetAgent = ref('all')
const messageMode = ref('conversation')
let activeAgentStreamMsgs = {}
const diffViewer = ref({ visible: false, file: null })
const codeChangeDrawer = ref({ visible: false, title: '', subtitle: '', project: '', fileChanges: null, files: [], selectedPath: '' })

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
  return `总消息 ${stats.totalMessages || messages.value.length || 0}；旧消息压缩 ${stats.compressedMessages || 0}；近期原文 ${stats.recentMessages || stats.recentLimit || 0}；子 Agent 记忆 ${getAgentMemoryCount()} 个`
}
const getAgentDisplayName = (agent) => {
  if (agent === 'system') return '系统'
  if (isCoordinatorProject(agent)) return '协调者（主 Agent）'
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
  return { tone: 'idle', label: events.length ? '等待回执' : '待执行' }
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
  const card = getTaskRuntime(msg)?.taskCard || getTaskRuntime(msg)?.task_card || null
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
  // 用户主动补充仍属于对话；Agent 工作单、回执、执行输出统一进入任务卡技术详情。
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
const taskRuntimeStatusLabel = (status) => ({ pending: '待执行', in_progress: '执行中', done: '已完成', failed: '失败', cancelled: '已取消' }[status] || status || '执行中')
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
  })
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
  if (target === 'all' || isCoordinatorProject(target)) return '协调者（主 Agent）'
  return target || 'Agent'
}

const isAgentQaMessage = (msg) => msg?.type === 'agent_qa' || msg?.type === 'agent_qa_resume'
const getQaKindLabel = (msg) => {
  const kind = msg?.qa?.kind || (msg?.type === 'agent_qa_resume' ? 'resume' : '')
  if (kind === 'question') return '提问'
  if (kind === 'answer') return '回答'
  if (kind === 'resume') return '续跑'
  return '问答'
}
const getQaTitle = (msg) => {
  const qa = msg?.qa || {}
  const from = getAgentDisplayName(qa.from_agent || msg.agent)
  const to = getAgentDisplayName(qa.to_agent || qa.target || '')
  if ((qa.kind || '') === 'answer') return `${to} 回答 ${from}`
  if ((qa.kind || '') === 'resume' || msg?.type === 'agent_qa_resume') return `${from} 已拿到回答并继续执行`
  return `${from} 向 ${to} 提问`
}
const qaStatusLabelMap = {
  waiting: '等待目标 Agent',
  asking: '目标 Agent 工作中',
  answered: '已回答',
  injected: '已注入原 Agent',
  resumed: '原 Agent 已续跑',
  failed: '回答失败',
  timeout: '已超时',
  needs_user: '等待用户确认',
  manual: '人工接管',
  rejected: '已拒绝'
}
const getQaStatusLabel = (status) => qaStatusLabelMap[status] || status || '问答中'
const getQaStatusTone = (status) => {
  if (['answered', 'injected', 'resumed'].includes(status)) return 'ok'
  if (['failed', 'timeout', 'rejected'].includes(status)) return 'fail'
  if (['needs_user', 'manual'].includes(status)) return 'warn'
  return 'running'
}
const getQaMeta = (msg) => {
  const qa = msg?.qa || {}
  const parts = []
  if (qa.type === 'request_review') parts.push('评审请求')
  else parts.push('工作询问')
  if (qa.blocking !== false) parts.push('阻塞续跑')
  if (qa.retry_count) parts.push(`重试 ${qa.retry_count} 次`)
  if (qa.injected_at) parts.push('已注入上下文')
  if (qa.resumed_at) parts.push('已续跑')
  if (qa.routing?.strategy === 'capability_and_load') parts.push('能力路由')
  if (qa.execution_id) parts.push(`Execution ${qa.execution_id}`)
  if (qa.acceptance?.score != null) parts.push(`证据评分 ${qa.acceptance.score}`)
  if (qa.permission_contract?.mode === 'advisory_read_only') parts.push('只读问答')
  if (qa.arbitration?.decision) parts.push(`仲裁：${qa.arbitration.decision}`)
  return parts.join(' · ')
}
const canRetryAgentQa = (msg) => ['failed', 'timeout', 'manual'].includes(msg?.qa?.status)
const canTakeoverAgentQa = (msg) => ['waiting', 'asking', 'timeout', 'needs_user'].includes(msg?.qa?.status)
const canArbitrateAgentQa = (msg) => msg?.qa?.status === 'rejected' || ['conflict', 'needs_evidence'].includes(msg?.qa?.acceptance?.status)
const runAgentQaAction = async (msg, action) => {
  const qa = msg?.qa || {}
  if (!qa.id) return
  if (action === 'retry') {
    const confirmed = await confirmDialog(`确定重试 ${getAgentDisplayName(qa.to_agent)} 的回答？`)
    if (!confirmed) return
  }
  if (action === 'manual') {
    const confirmed = await confirmDialog('确定将这条 Agent 问答标记为人工接管？')
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
      body: JSON.stringify({ id: qa.id, decision: action, reason: action === 'accept' ? '主 Agent 在群聊界面采纳该回答' : action === 'reject' ? '主 Agent 在群聊界面拒绝该回答' : '用户在群聊界面接管该问答' })
    })
    const data = await res.json()
    if (!res.ok || data.success === false) throw new Error(data.error || '操作失败')
    toast.success(action === 'retry' ? '已重试 Agent 问答' : action === 'manual' ? '已标记人工接管' : action === 'accept' ? '主 Agent 已采纳回答' : '主 Agent 已拒绝回答')
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

const isNearGroupMessageBottom = () => {
  const el = groupMessagesEl.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight <= 120
}

const updateGroupMessageScrollState = () => {
  isGroupMessagesPinnedToBottom.value = isNearGroupMessageBottom()
}

let groupMessagesResizeObserver = null
const attachGroupMessagesResizeObserver = () => {
  if (!groupMessagesContentEl.value || groupMessagesResizeObserver || typeof ResizeObserver === 'undefined') return
  groupMessagesResizeObserver = new ResizeObserver(() => {
    if (isGroupMessagesPinnedToBottom.value && groupMessagesEl.value?.clientHeight > 0) {
      scrollToBottom({ force: true })
    }
  })
  groupMessagesResizeObserver.observe(groupMessagesContentEl.value)
}

// 弹窗状态
const showCreate = ref(false)
const showRename = ref(false)
const showMembers = ref(false)
const showTools = ref(false)
const showSharedFiles = ref(false)
const showLogs = ref(false)

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

const scrollToBottom = ({ force = false } = {}) => {
  nextTick(() => {
    const el = groupMessagesEl.value
    if (!el) return
    if (force || isGroupMessagesPinnedToBottom.value) {
      el.scrollTop = el.scrollHeight
      isGroupMessagesPinnedToBottom.value = true
    }
  })
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

const chooseMessageFiles = () => {
  messageFileInput.value?.click()
}

const onMessageFilesSelected = (event) => {
  const files = Array.from(event.target.files || [])
  messageFiles.value = [...messageFiles.value, ...files]
  event.target.value = ''
}

const removeMessageFile = (index) => {
  messageFiles.value.splice(index, 1)
}

const openFileDiff = (file) => {
  openCodeChangeDrawer({ files: [file], count: 1 }, { selectedPath: file?.path, title: '查看单文件改动' })
}

const openCodeChangeDrawer = (fileChanges, options = {}) => {
  codeChangeDrawer.value = {
    visible: true,
    title: options.title || '群聊 Agent 代码改动',
    subtitle: options.subtitle || '',
    project: options.project || '',
    fileChanges: fileChanges || null,
    files: options.files || [],
    selectedPath: options.selectedPath || fileChanges?.files?.[0]?.path || '',
  }
}

const closeCodeChangeDrawer = () => {
  codeChangeDrawer.value.visible = false
}

const openDrawerChangesTab = (project) => {
  if (project) toast.info(`已在抽屉展示 ${project} 的本轮改动`)
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
  if (phase === 'reviewing') return '主 Agent 验收'
  if (phase === 'complete') return '协作完成'
  if (phase === 'executing') return '子 Agent 执行中'
  if (phase === 'dispatching') return '任务拆分'
  return '需求理解'
}

const getDispatchActionLabel = (action) => {
  if (action === 'delegate') return '派发子 Agent'
  if (action === 'ask_user') return '先问用户'
  if (action === 'hold') return '暂不执行'
  if (action === 'direct_answer') return '直接回复'
  return '派发决策'
}

const getPlanTitle = (msg) => {
  if (getWorkflowPhase(msg) === 'rework' || (msg.assignments || []).some(item => item.rework)) return '主 Agent 返工计划'
  if (msg?.workflow?.label) return msg.workflow.label
  return '主 Agent 工作计划'
}

const compactPlanText = (text, max = 180) => {
  const value = String(text || '').replace(/\s+/g, ' ').trim()
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
    showTemplateSelector.value = false
    showRecommendation.value = false
    return
  }
  if (value.startsWith('/')) {
    mentionDropdown.value = false
    showTemplateSelector.value = false
    showRecommendation.value = false
    return
  }

  // @提及指令拦截
  const atIndex = beforeCursor.lastIndexOf('@')
  if (atIndex >= 0 && !beforeCursor.substring(atIndex).includes(' ')) {
    mentionFilter.value = beforeCursor.substring(atIndex + 1).toLowerCase()
    mentionDropdown.value = true
    mentionIndex.value = 0
    showTemplateSelector.value = false
    showRecommendation.value = false
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

const getFilteredTemplates = () => {
  return allTemplates.value.filter(t => 
    !templateSearchQuery.value || 
    t.name.toLowerCase().includes(templateSearchQuery.value.toLowerCase())
  )
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
  
  // 2. 处理斜杠指令模板下拉菜单键盘控制
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

  // 3. 默认发送消息
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
  let hasMention = false
  let agentMsgAdded = false

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
        // 更新思考状态
        thinkingMsg.content = data.text
        if (data.text.includes('分派') || data.text.includes('等待')) {
          waitingCrossReply.value = true
        }
        scrollToBottom()
      } else if (data.type === 'task_created') {
        const taskMessage = {
          id: data.messageId,
          role: 'assistant',
          agent: data.agent || 'coordinator',
          type: 'project_task_intake',
          content: data.text || '项目任务已由主 Agent 接管',
          timestamp: new Date().toISOString(),
          task_id: data.task?.id,
          task: data.task || null,
          queue: data.queue || null,
          workflow: data.workflow || null,
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
        applyTransientTaskRuntime(data.taskId, (runtime) => {
          const agents = runtime.agents || []
          const index = agents.findIndex(item => item.project === data.agent)
          const patch = { project: data.agent, state: 'spawning', runtimeFallbacks: Number(agents[index]?.runtimeFallbacks || 0) + 1, runtime: data.toRuntime }
          if (index >= 0) agents[index] = { ...agents[index], ...patch }
          else agents.push(patch)
          return { ...runtime, status: 'in_progress', agents, statusText: data.text }
        })
        appendAgentWorkEvent(data.agent, { id: `fallback-${Date.now()}`, time: new Date().toISOString(), kind: 'warning', text: data.text })
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
        if (!agentStreamMsgs[data.agent]) {
          const streamMsg = {
            role: 'assistant',
            agent: data.agent,
            content: '',
            streaming: true,
            workEvents: [],
            timestamp: new Date().toISOString()
          }
          agentStreamMsgs[data.agent] = streamMsg
          messages.value.push(streamMsg)
        }
        agentStreamMsgs[data.agent].content += data.text
        if (data.text.includes('@')) {
          hasMention = true
          waitingCrossReply.value = true
        }
        scrollToBottom()
      } else if (data.type === 'agent_done') {
        // 某个 Agent 完成：用最终完整内容替换流式消息
        const streamMsg = agentStreamMsgs[data.agent]
        if (streamMsg) {
          if (data.messageId) streamMsg.id = data.messageId
          streamMsg.content = data.text
          streamMsg.streaming = false
          if (Array.isArray(data.assignments)) streamMsg.assignments = data.assignments
          streamMsg.executionOrder = data.executionOrder || streamMsg.executionOrder || ''
          streamMsg.runtime = data.runtime || streamMsg.runtime || ''
          streamMsg.dispatchPolicy = data.dispatchPolicy || streamMsg.dispatchPolicy || null
          streamMsg.coordinationPlan = data.coordinationPlan || streamMsg.coordinationPlan || null
          streamMsg.workflow = data.workflow || streamMsg.workflow
          streamMsg.mainAgentDecision = data.mainAgentDecision || data.main_agent_decision || streamMsg.mainAgentDecision || streamMsg.main_agent_decision
          streamMsg.main_agent_decision = data.main_agent_decision || data.mainAgentDecision || streamMsg.main_agent_decision || streamMsg.mainAgentDecision
          streamMsg.workEvents = data.workEvents || streamMsg.workEvents
          if (data.fileChanges && data.fileChanges.count > 0) {
            streamMsg.fileChanges = data.fileChanges
          }
        } else {
          if ((data.text && data.text.trim()) || (data.fileChanges && data.fileChanges.count > 0)) {
            messages.value.push({
              id: data.messageId,
              role: 'assistant',
              agent: data.agent,
              content: data.text,
              timestamp: new Date().toISOString(),
              assignments: data.assignments || null,
              executionOrder: data.executionOrder || '',
              runtime: data.runtime || '',
              dispatchPolicy: data.dispatchPolicy || null,
              coordinationPlan: data.coordinationPlan || null,
              workflow: data.workflow || null,
              mainAgentDecision: data.mainAgentDecision || data.main_agent_decision || null,
              main_agent_decision: data.main_agent_decision || data.mainAgentDecision || null,
              fileChanges: data.fileChanges || null,
              workEvents: data.workEvents || []
            })
          }
        }
        if (data.text.includes('@')) {
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
        agentMsg.content += data.text
        if (data.text.includes('@')) hasMention = true
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
          content: '❌ 错误: ' + data.text,
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

const filteredLogs = () => {
  if (!logFilter.value) return logs.value
  return logs.value.filter(l => l.category === logFilter.value)
}

// 群聊成员管理
const loadGroupTools = async () => {
  if (!currentGroup.value) return
  const data = await fetch(`/api/groups/tools?id=${currentGroup.value.id}`).then(r => r.json())
  groupTools.value = data.tools || { mcp: [], skill: [] }
  showTools.value = true
}

const saveGroupTools = async () => {
  await fetch('/api/groups/tools', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ group_id: currentGroup.value.id, tools: groupTools.value })
  })
  showTools.value = false
  toast.success('工具配置已保存')
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
  if (groupMessagesResizeObserver) {
    groupMessagesResizeObserver.disconnect()
    groupMessagesResizeObserver = null
  }
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
  if (newMessage.value && !newMessage.value.startsWith('/')) {
    newMessage.value += '\n' + text
  } else {
    newMessage.value = text
  }
  nextTick(() => {
    const el = document.getElementById('groupChatInput')
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

// 应用智能推荐：将用户输入的原始口语代入到模板的第一个占位符中并以弹框展示
const applyRecommendation = () => {
  const tpl = recommendedTemplate.value
  if (!tpl) return
  
  const userOriginalText = newMessage.value.trim()
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
    newMessage.value = tpl.prompt
    showRecommendation.value = false
    recommendedTemplate.value = null
  }
}
// --- 对话模板相关逻辑结束 ---
</script>

<template>
  <div class="group-chat">
    <!-- 顶部群聊选择栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <span class="label">群聊：</span>
        <div class="group-list">
          <div v-for="g in groups" :key="g.id"
            class="group-card"
            :class="{ active: currentGroup?.id === g.id }"
            @click="selectGroup(g.id)">
            <span>💬</span>
            <span>{{ g.name }}</span>
            <span class="badge">{{ getMemberCountLabel(g) }}</span>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" @click="showCreate = true">+ 新建群聊</button>
    </div>

    <!-- 主内容区 -->
    <div class="main-content">
      <div class="content">
        <div class="content-header">
          <div class="group-title-line">
            <span>{{ currentGroup ? '💬 ' + currentGroup.name : '选择或创建一个群聊' }}</span>
            <span v-if="currentGroup" class="memory-chip" :class="{ active: hasCompressedMemory() }" :title="getMemoryCompressionTitle()">
              <span class="memory-chip-dot"></span>
              <span class="memory-chip-label">{{ getMemoryCompressionLabel() }}</span>
              <span class="memory-chip-meta">{{ getMemoryCompressionMeta() }}</span>
            </span>
            <span v-if="currentGroup && collaborationProtocol?.success" class="memory-chip protocol" :title="`开放 ${collaborationProtocol.summary?.open || 0}；采纳 ${collaborationProtocol.summary?.accepted || 0}；权限违规 ${collaborationProtocol.summary?.permission_violations || 0}`">
              <span class="memory-chip-dot"></span>
              <span class="memory-chip-label">Agent 协作 {{ collaborationProtocol.version }}</span>
              <span class="memory-chip-meta">开放 {{ collaborationProtocol.summary?.open || 0 }}</span>
            </span>
          </div>
          <div v-if="currentGroup" style="display:flex;gap:6px">
            <button class="btn btn-outline btn-sm" @click="loadGroupTools()">🔧 工具</button>
            <button class="btn btn-outline btn-sm" @click="loadGroupFiles()">📁 共享文件</button>
            <button class="btn btn-outline btn-sm" @click="loadLogs()">📋 日志</button>
            <button class="btn btn-outline btn-sm" @click="showMembers = true">👥 成员</button>
            <button class="btn btn-outline btn-sm" @click="loadMessages()">↻ 刷新</button>
            <button class="btn btn-outline btn-sm" @click="saveCurrentGroupConversationKnowledge">保存知识</button>
            <button class="btn btn-outline btn-sm" @click="renameName = currentGroup.name; showRename = true">✏️ 重命名</button>
            <button class="btn btn-outline btn-sm" @click="clearGroupMessages">🧹 清空聊天</button>
            <button class="btn btn-danger btn-sm" @click="deleteGroup">🗑️ 删除</button>
          </div>
        </div>

        <!-- 消息区域 -->
        <div id="groupMessages" ref="groupMessagesEl" class="messages" @scroll="updateGroupMessageScrollState">
          <div ref="groupMessagesContentEl" style="display: flex; flex-direction: column; width: 100%; min-height: 100%;">
            <div v-if="!currentGroup" class="empty">
              <span class="icon">💬</span>
              <span>开始群聊协作</span>
              <span class="sub">创建群聊并添加 Agent 成员</span>
            </div>
            <div v-else class="messages-flow" :key="currentGroup?.id" style="width: 100%; display: flex; flex-direction: column;">
              <div v-if="hasMainAgentStatusDetail" class="main-agent-status-card">
                <div class="main-agent-status-head">
                  <div>
                    <span class="main-agent-status-title" title="群聊主 Agent 只负责当前群聊内的计划、派发、回执验收和交付报告；规则兜底协调器是本地运行时，不是新的群成员。">主 Agent 状态</span>
                    <span class="main-agent-phase">{{ mainAgentStatus?.label || '空闲' }}</span>
                  </div>
                  <button v-if="mainAgentStatus?.latest_delivery_summary" class="btn btn-outline btn-xs" @click="openMainAgentPipeline">协作看板</button>
                </div>
                <div class="main-agent-status-grid">
                  <div v-if="latestMainAgentDecision" class="main-agent-status-item latest-decision" :class="mainDecisionTone(latestMainAgentDecision)">
                    <span class="item-label">最近决策</span>
                    <span class="item-value">
                      {{ mainDecisionModeLabel(latestMainAgentDecision.mode) }} · {{ mainDecisionActionSummary(latestMainAgentDecision) }}
                    </span>
                    <small>{{ mainDecisionNextStep(latestMainAgentDecision) }}</small>
                    <small v-if="mainDecisionPlanSummary(latestMainAgentDecision)" class="decision-plan-preview">{{ mainDecisionPlanSummary(latestMainAgentDecision) }}</small>
                    <button class="btn btn-outline btn-xs" @click="scrollToLatestMainDecision">定位到消息</button>
                  </div>
                  <div class="main-agent-status-item">
                    <span class="item-label">执行中</span>
                    <span class="item-value">{{ mainAgentStatus?.running_child_agents?.length ? mainAgentStatus.running_child_agents.join('、') : '无' }}</span>
                  </div>
                  <div class="main-agent-status-item">
                    <span class="item-label">开放问答</span>
                    <span class="item-value">{{ mainAgentStatus?.open_qa_count || groupAgentQa.filter(q => ['waiting','asking','queued','needs_user','timeout','manual'].includes(q.status)).length || 0 }} 个</span>
                  </div>
                  <div class="main-agent-status-item" v-if="mainAgentStatus?.latest_delivery_summary">
                    <span class="item-label">交付进度</span>
                    <span class="item-value">{{ mainAgentStatus.latest_delivery_summary.actual_file_change_count || 0 }} 个文件 · {{ mainAgentStatus.latest_delivery_summary.external_runner_verification_count || 0 }} 项验证</span>
                  </div>
                  <details class="main-agent-technical-detail">
                    <summary>技术详情</summary>
                    <div class="main-agent-status-item" v-if="mainAgentStatus?.latest_delivery_summary?.lifecycle">
                      <span class="item-label">任务阶段</span>
                      <span class="item-value">{{ mainAgentStatus.latest_delivery_summary.lifecycle.state }} · {{ mainAgentStatus.latest_delivery_summary.lifecycle.terminal ? '终态' : '会话保留' }}</span>
                    </div>
                    <div class="main-agent-status-item" v-if="mainAgentStatus?.latest_delivery_summary?.session_continuity?.length">
                      <span class="item-label">执行器 / 会话</span>
                      <span class="item-value">{{ mainAgentStatus.latest_delivery_summary.session_continuity.slice(0, 3).map(s => `${s.project}:${s.executor}/${s.resume_mode}#${s.turn_count}`).join('；') }}</span>
                    </div>
                    <div class="main-agent-status-item" v-if="mainAgentStatus?.latest_delivery_summary">
                      <span class="item-label">文件 / 验证</span>
                      <span class="item-value">{{ mainAgentStatus.latest_delivery_summary.actual_file_change_count || 0 }} 个文件 · {{ mainAgentStatus.latest_delivery_summary.external_runner_verification_count || 0 }} 条外部验证</span>
                    </div>
                    <div class="main-agent-status-item" v-if="mainAgentStatus?.latest_delivery_summary?.reasoning_loop">
                      <span class="item-label">推理闭环</span>
                      <span class="item-value">计划 v{{ mainAgentStatus.latest_delivery_summary.reasoning_loop.plan_version || 0 }} · 待证明 {{ mainAgentStatus.latest_delivery_summary.reasoning_open_assertions || 0 }} · 偏差 {{ mainAgentStatus.latest_delivery_summary.reasoning_deviation_count || 0 }} · 复盘 {{ mainAgentStatus.latest_delivery_summary.reasoning_loop.postmortems?.length || 0 }}</span>
                    </div>
                    <div class="main-agent-status-item warning" v-if="mainAgentStatus?.failed_gates?.length">
                      <span class="item-label">未过门禁</span>
                      <span class="item-value">{{ mainAgentStatus.failed_gates.map(g => g.label || g.id).join('、') }}</span>
                    </div>
                  </details>
                  <div class="main-agent-status-item warning" v-if="mainAgentStatus?.blockers?.length || mainAgentStatus?.needs?.length">
                    <span class="item-label">阻塞/待补</span>
                    <span class="item-value">{{ [...(mainAgentStatus.blockers || []), ...(mainAgentStatus.needs || [])].slice(0, 3).map(x => compactStatusText(x)).join('；') }}</span>
                  </div>
                </div>
              </div>
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
                <div v-else-if="msg.type === 'project_task_intake'" class="bubble project-task-intake" :style="getAgentAccentStyle(msg.agent)">
                  <div class="project-task-head">
                    <div>
                      <span class="project-task-kicker">项目任务</span>
                      <strong>{{ msg.task?.title || '项目开发任务' }}</strong>
                    </div>
                    <span class="project-task-status">{{ msg.queue?.queued === false ? '已保存' : '执行中' }}</span>
                  </div>
                  <div class="project-task-content">{{ msg.content }}</div>
                  <MainAgentDecisionCard v-if="getMainAgentDecision(msg)" :decision="getMainAgentDecision(msg)" compact @step-action="handleTaskCardAction(msg, $event)" />
                  <TaskCollaborationCard v-if="isPrimaryTaskCard(msg, i)" :card="getTaskCard(msg)" :runtime="getTaskRuntime(msg)" @action="handleTaskCardAction(msg, $event)" />
                </div>
                <div v-else-if="msg.type === 'conflict_plan'" class="bubble conflict-plan-bubble">
                  <div class="conflict-plan-head">
                    <strong>跨 Agent 冲突保护</strong>
                    <span>已自动串行</span>
                  </div>
                  <div class="project-task-content">{{ msg.content }}</div>
                  <div v-if="msg.conflictPlan?.conflicts?.length" class="conflict-plan-list">
                    <div v-for="(conflict, conflictIndex) in msg.conflictPlan.conflicts" :key="`${conflict.projects?.join(':')}:${conflictIndex}`">
                      <strong>{{ conflict.projects?.join(' 与 ') }}</strong>
                      <span>{{ conflict.reason }}</span>
                      <code v-if="conflict.scopes?.length">{{ conflict.scopes.join('、') }}</code>
                    </div>
                  </div>
                </div>
                <!-- Agent 问答 -->
                <div v-else-if="isAgentQaMessage(msg)" class="bubble agent-qa-bubble" :style="getAgentAccentStyle(msg.agent)">
                  <div class="agent-qa-head">
                    <div class="agent-qa-heading">
                      <span class="agent-qa-kind">{{ getQaKindLabel(msg) }}</span>
                      <span class="agent-qa-title">{{ getQaTitle(msg) }}</span>
                    </div>
                    <span :class="['agent-qa-status', getQaStatusTone(msg.qa?.status)]">{{ getQaStatusLabel(msg.qa?.status) }}</span>
                  </div>
                  <div v-if="getQaMeta(msg)" class="agent-qa-meta">{{ getQaMeta(msg) }}</div>
                  <div v-if="msg.qa?.question && msg.qa?.kind !== 'question'" class="agent-qa-question">问：{{ msg.qa.question }}</div>
                  <div class="agent-qa-content" v-html="highlightMentions(msg.content)"></div>
                  <div v-if="msg.qa?.answer_evidence?.length" class="agent-qa-meta">证据：{{ msg.qa.answer_evidence.slice(0, 4).join(' · ') }}</div>
                  <div v-if="msg.qa?.acceptance?.reason" class="agent-qa-meta">主 Agent 仲裁：{{ msg.qa.acceptance.reason }}</div>
                  <div v-if="msg.qa?.permission_boundary?.pass === false" class="agent-qa-question">权限门禁：检测到问答外副作用，回答未采纳。</div>
                  <div v-if="canRetryAgentQa(msg) || canTakeoverAgentQa(msg) || canArbitrateAgentQa(msg)" class="agent-qa-actions">
                    <button
                      v-if="canRetryAgentQa(msg)"
                      class="btn btn-sm btn-outline"
                      :disabled="agentQaActionLoading[`${msg.qa.id}:retry`]"
                      @click="runAgentQaAction(msg, 'retry')"
                    >重试</button>
                    <button
                      v-if="canTakeoverAgentQa(msg)"
                      class="btn btn-sm btn-outline"
                      :disabled="agentQaActionLoading[`${msg.qa.id}:manual`]"
                      @click="runAgentQaAction(msg, 'manual')"
                    >人工接管</button>
                    <button
                      v-if="canArbitrateAgentQa(msg)"
                      class="btn btn-sm btn-outline"
                      :disabled="agentQaActionLoading[`${msg.qa.id}:accept`]"
                      @click="runAgentQaAction(msg, 'accept')"
                    >主 Agent 采纳</button>
                    <button
                      v-if="canArbitrateAgentQa(msg)"
                      class="btn btn-sm btn-outline"
                      :disabled="agentQaActionLoading[`${msg.qa.id}:reject`]"
                      @click="runAgentQaAction(msg, 'reject')"
                    >拒绝</button>
                  </div>
                </div>
                <!-- Agent 回复 -->
                <div
                  v-else
                  class="bubble agent-exec-bubble"
                  :class="['agent-state-' + getAgentMessageStatus(msg).tone]"
                  :style="getAgentAccentStyle(msg.agent)"
                >
                  <div class="agent-message-head">
                    <div class="agent-identity">
                      <span class="agent-avatar">{{ msg.agent === 'system' ? '!' : getAgentInitials(msg.agent) }}</span>
                      <span class="agent-title">{{ msg.agent === 'system' ? '系统' : getAgentDisplayName(msg.agent) }}</span>
                    </div>
                    <span :class="['agent-status-pill', getAgentMessageStatus(msg).tone]">
                      {{ getAgentMessageStatus(msg).label }}
                    </span>
                  </div>
                  <div v-if="msg.content" class="agent-message-content" v-html="highlightMentions(msg.content)"></div>
                  <MainAgentDecisionCard v-if="getMainAgentDecision(msg)" :decision="getMainAgentDecision(msg)" compact @step-action="handleTaskCardAction(msg, $event)" />
                  <TaskCollaborationCard v-if="isPrimaryTaskCard(msg, i)" :card="getTaskCard(msg)" :runtime="getTaskRuntime(msg)" @action="handleTaskCardAction(msg, $event)" />
                  <div v-if="(msg.delivery_summary || msg.deliverySummary) && !getTaskCard(msg)" class="delivery-summary-actions">
                    <button class="btn btn-sm btn-outline" @click="openPipelineViewer(msg)">查看交付协作看板</button>
                    <span v-if="(msg.delivery_summary || msg.deliverySummary)?.acceptance_gate_passed === false" class="delivery-gate-warning">验收门禁未通过</span>
                  </div>
                  <div v-if="shouldShowOrchestrationPlan(msg)" class="orchestration-plan">
                    <div class="plan-header">
                      <span>{{ getPlanTitle(msg) }}</span>
                      <span class="plan-order">{{ getExecutionOrderLabel(msg.executionOrder) }}</span>
                    </div>
                    <div v-if="msg.dispatchPolicy" class="dispatch-policy">
                      <div class="dispatch-action">{{ getDispatchActionLabel(msg.dispatchPolicy.action) }}</div>
                      <div v-if="msg.dispatchPolicy.reason" class="dispatch-line">{{ compactPlanText(msg.dispatchPolicy.reason, 160) }}</div>
                      <div v-if="msg.dispatchPolicy.risk" class="dispatch-risk">{{ compactPlanText(msg.dispatchPolicy.risk, 160) }}</div>
                      <div v-if="msg.dispatchPolicy.nextStep" class="dispatch-line">下一步：{{ compactPlanText(msg.dispatchPolicy.nextStep, 140) }}</div>
                      <div v-if="msg.dispatchPolicy.requiresConfirmation" class="dispatch-confirm">需要确认后执行</div>
                    </div>
                    <div v-if="msg.coordinationPlan?.phases?.length" class="coordination-plan">
                      <div class="coordination-title">协作计划</div>
                      <div v-for="phase in msg.coordinationPlan.phases" :key="phase" class="coordination-phase">
                        {{ compactPlanText(phase, 120) }}
                      </div>
                    </div>
                    <div class="workflow-board">
                      <div class="workflow-title">{{ getWorkflowLabel(msg) }}</div>
                      <div class="workflow-steps">
                        <div
                          v-for="step in workflowSteps"
                          :key="step.key"
                          class="workflow-step"
                          :class="getWorkflowStepState(msg, step.key)"
                        >
                          <span class="workflow-dot"></span>
                          <span>{{ step.label }}</span>
                        </div>
                      </div>
                    </div>
                    <div v-for="item in msg.assignments" :key="getAssignmentKey(msg, item)" class="plan-item">
                      <div class="plan-item-top">
                        <span class="plan-project">{{ getAgentDisplayName(item.project) }}</span>
                        <span v-if="item.rework" class="plan-rework">返工 #{{ item.attempt || 2 }}</span>
                        <span v-if="item.dependsOn" class="plan-dep">等待 {{ item.dependsOn }}</span>
                        <span class="plan-status" :class="getAssignmentStatusClass(item.status)">
                          {{ item.statusText || getAssignmentStatusLabel(item.status) }}
                        </span>
                      </div>
                    <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
                      <button class="btn btn-sm" style="display: flex; align-items: center; gap: 6px; padding: 4px 10px; font-size: 11px; background: rgba(0, 188, 212, 0.12); border: 1px solid rgba(0, 188, 212, 0.25); color: #00bcd4; border-radius: 4px; cursor: pointer;" @click="openPipelineViewer(msg)">
                        查看协作看板
                      </button>
                    </div>
                      <div class="plan-task">{{ compactPlanText(item.task) }}</div>
                      <div v-if="item.reason" class="plan-reason">{{ compactPlanText(item.reason, 120) }}</div>
                    </div>
                  </div>
                  <span v-if="msg.streaming" class="stream-cursor">▌</span>
                  <AgentWorkEventDetails
                    v-if="getWorkEvents(msg).length && !getTaskCard(msg)"
                    :msg="msg"
                    :main-agent="isGroupMainAgentMessage(msg)"
                    :accent-style="getAgentAccentStyle(msg.agent)"
                  />
                  <!-- 文件变更 -->
                  <div v-if="msg.fileChanges && msg.fileChanges.count > 0" class="file-changes">
                    <div class="file-changes-header">{{ getFileChangesTitle(msg.fileChanges) }}</div>
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
            </div>
          </div>
        </div>
        <!-- 消息锚点导航条 (Codex 风格) -->
        <div v-if="navMessages.length > 1" class="msg-navigator">
          <div class="msg-nav-track">
            <div 
              v-for="msg in navMessages" 
              :key="msg.originalIndex" 
              class="navigator-dot"
              :class="msg.role"
              @click="scrollToMessage(msg.originalIndex)"
            >
              <div class="dot-cluster">
                  <span class="dot-bar user-bar"></span>
                  <span class="dot-bar assistant-bar" v-if="msg.assistantContent"></span>
                </div>
              <div class="nav-tooltip-card">
                <div class="nav-tt-user">{{ (msg.userContent || '附件内容').slice(0, 80) + ((msg.userContent || '').length > 80 ? '...' : '') }}</div>
                <div class="nav-tt-assistant" v-if="msg.assistantContent">{{ msg.assistantContent.slice(0, 80) + (msg.assistantContent.length > 80 ? '...' : '') }}</div>
                <div class="nav-tt-tags" v-if="msg.files && msg.files.length">
                  <span class="nav-tt-tag" v-for="f in msg.files" :key="f.name">📄 {{ f.name }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="msg-nav-scrollbar">
            <div class="msg-nav-thumb"></div>
          </div>
        </div>

        <!-- 等待跨 Agent 回复提示 -->
        <div v-if="waitingCrossReply" style="padding:6px 16px;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--accent-purple);background:rgba(167,139,250,0.05);border-top:1px solid rgba(167,139,250,0.15)">
          <span style="animation:pulse 1.5s infinite">⏳</span>
          <span>等待其他 Agent 回复中...</span>
          <span style="margin-left:auto;font-size:10px;color:var(--text-muted);cursor:pointer" @click="waitingCrossReply = false">忽略</span>
        </div>

        <!-- 输入栏 -->
        <div v-if="currentGroup" class="chat-bar">
          <div class="message-mode" aria-label="消息模式">
            <button type="button" :class="{ active: messageMode === 'conversation' }" @click="messageMode = 'conversation'">对话</button>
            <button type="button" :class="{ active: messageMode === 'project_analysis' }" @click="messageMode = 'project_analysis'; targetAgent = 'all'">项目分析</button>
            <button type="button" :class="{ active: messageMode === 'project_task' }" @click="messageMode = 'project_task'; targetAgent = 'all'">项目任务</button>
          </div>
          <input ref="messageFileInput" type="file" multiple class="hidden-file-input" @change="onMessageFilesSelected">
          <button class="btn btn-outline attach-btn" title="添加附件" @click="chooseMessageFiles">📎</button>
          <button class="btn btn-outline attach-btn" title="插入对话模板" style="margin-left: 4px;" @click="openTemplateSelector">📚</button>
          <div class="chat-input-wrap">
            <!-- 💡 智能模板推荐气泡 -->
            <div v-if="showRecommendation && recommendedTemplate" class="recommendation-bubble" @click="applyRecommendation">
              <span class="bulb">💡</span>
              <span class="text">意图检测：建议使用模板 <strong>{{ recommendedTemplate.name }}</strong></span>
              <span class="action">一键格式化提示词 ➤</span>
            </div>
            <div v-if="messageFiles.length" class="attachment-row">
              <span v-for="(file, index) in messageFiles" :key="`${file.name}-${index}`" class="attachment-chip">
                <span>{{ file.name }}</span>
                <small>{{ formatFileSize(file.size) }}</small>
                <button title="移除附件" @click="removeMessageFile(index)">×</button>
              </span>
            </div>
            <textarea
              id="groupChatInput"
              v-model="newMessage"
              placeholder="输入消息…（可 @ 项目 Agent，输入 / 打开命令中心）"
              rows="1"
              @keydown="handleKeydown"
              @input="handleInput"
            ></textarea>
            <SlashCommandMenu
              :open="slash.open"
              :commands="slash.filtered"
              :active-index="slash.activeIndex"
              :loading="slash.loading"
              :query="slash.query"
              @select="slash.select"
            />
            <!-- @提及下拉框 -->
            <div v-if="mentionDropdown && getFilteredAgents().length > 0" class="mention-dropdown">
              <div v-for="(agent, i) in getFilteredAgents()" :key="agent"
                class="mention-item"
                :class="{ active: i === mentionIndex }"
                @click="insertMention(agent)">
                <span>@</span>
                <span>{{ agent }}</span>
              </div>
            </div>
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
          <button class="btn btn-primary chat-send" @click="sendMessage()">发送 ➤</button>
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
      @open-changes="openDrawerChangesTab"
    />

    <!-- Agent 协作流看板弹窗 -->
    <div v-if="pipelineViewer.visible" class="modal-overlay" style="z-index: 999; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); backdrop-filter: blur(12px);" @click.self="pipelineViewer.visible = false">
      <div class="modal" style="width: 860px; max-width: 90vw; background: rgba(18, 22, 33, 0.95); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); display: flex; flex-direction: column; max-height: 90vh;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="margin: 0; font-size: 15px; color: #fff; display: flex; align-items: center; gap: 8px;">
            Agent 协作流看板
          </h3>
          <button class="modal-close" style="background: none; border: none; color: #888; font-size: 24px; cursor: pointer; line-height: 1;" @click="pipelineViewer.visible = false">&times;</button>
        </div>
        <div style="flex: 1; overflow-y: auto;">
          <AgentPipeline
            :assignments="pipelineViewer.assignments"
            :coordinationPlan="pipelineViewer.coordinationPlan"
            :taskStatus="pipelineViewer.status"
            :fileChanges="pipelineViewer.fileChanges"
            :receipts="pipelineViewer.receipts"
            :deliverySummary="pipelineViewer.deliverySummary"
            :title="pipelineViewer.title"
          />
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
              <span v-if="diffViewer.file?.diff?.truncated">已截断</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <input v-if="diffViewer.file?.diff?.available" v-model="diffSearchQuery" class="diff-search-input" placeholder="在 diff 中搜索..." />
          </div>
        </div>
        <div v-if="diffViewer.file?.diff?.truncated" class="diff-note">
          文件较大，当前只展示前半部分可读差异。
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


    <!-- 创建群聊弹窗 -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <button class="modal-close" @click="showCreate = false">&times;</button>
        <h3>新建群聊</h3>
        <div class="form-group">
          <label>群聊名称</label>
          <input v-model="newGroupName" placeholder="如：智评生活开发群">
        </div>
        <div class="form-group">
          <label>选择加入的项目 Agent</label>
          <div class="checkbox-list">
            <label v-for="p in projects" :key="p.name" class="checkbox-item">
              <input type="checkbox" v-model="p.selected">
              <span>{{ p.name }}</span>
              <span class="tag">{{ p.agent }}</span>
            </label>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-cancel" @click="showCreate = false">取消</button>
          <button class="btn btn-primary" @click="submitCreateGroup">创建</button>
        </div>
      </div>
    </div>

    <!-- 重命名弹窗 -->
    <div v-if="showRename" class="modal-overlay" @click.self="showRename = false">
      <div class="modal">
        <button class="modal-close" @click="showRename = false">&times;</button>
        <h3>✏️ 重命名群聊</h3>
        <div class="form-group">
          <label>新名称</label>
          <input v-model="renameName" :placeholder="currentGroup?.name">
        </div>
        <div class="form-actions">
          <button class="btn btn-cancel" @click="showRename = false">取消</button>
          <button class="btn btn-primary" @click="submitRename">确定</button>
        </div>
      </div>
    </div>

    <!-- 群聊日志弹窗 -->
    <div v-if="showLogs" class="modal-overlay" @click.self="showLogs = false">
      <div class="modal modal-logs-styled" style="min-width:650px; max-height:85vh; display:flex; flex-direction:column;">
        <button class="modal-close" @click="showLogs = false">&times;</button>
        <h3 class="modal-title-gradient">📋 群聊日志 - {{ currentGroup?.name }}</h3>
        
        <div class="modal-toolbar-row">
          <div class="select-wrapper">
            <select v-model="logFilter" class="custom-select-logs">
              <option value="">全部类别</option>
              <option value="message">💬 消息</option>
              <option value="response">🤖 响应</option>
              <option value="forward">📤 转发</option>
              <option value="error">❌ 错误</option>
            </select>
          </div>
          <div style="flex:1"></div>
          <span class="total-badge">共 {{ filteredLogs().length }} 条</span>
        </div>

        <div class="group-logs-content logs-styled-body" id="logsContent">
          <div id="logsContentInner" style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
            <div v-if="filteredLogs().length === 0" class="logs-empty-state">暂无日志</div>
            <div v-for="(log, i) in filteredLogs()" :key="i" class="log-entry-card" :class="log.level">
              <div class="log-entry-header">
                <span class="log-badge" :class="log.level">
                  <span class="log-badge-dot"></span>
                  {{ log.level?.toUpperCase() }}
                </span>
                <span class="log-time">{{ new Date(log.timestamp).toLocaleString('zh-CN') }}</span>
              </div>
              <div class="log-message-body">{{ log.message }}</div>
            </div>
          </div>
        </div>

        <div class="modal-footer-row">
          <button class="btn-clear-logs" @click="clearLogs">清空日志</button>
          <button class="btn-close-logs" @click="showLogs = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 群聊工具配置弹窗 -->
    <div v-if="showTools" class="modal-overlay" @click.self="showTools = false">
      <div class="modal" style="min-width:500px;max-height:80vh;display:flex;flex-direction:column">
        <button class="modal-close" @click="showTools = false">&times;</button>
        <h3>🔧 群聊工具配置 - {{ currentGroup?.name }}</h3>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">配置此群聊可用的工具</div>
        <div style="flex:1;overflow-y:auto">
          <div style="font-size:13px;font-weight:500;color:var(--text-secondary);margin-bottom:10px">🔌 MCP 服务器</div>
          <div v-for="tool in groupTools.mcp" :key="tool" style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid var(--border-color);border-radius:6px;margin-bottom:6px">
            <input type="checkbox" :checked="true" style="accent-color:var(--accent-blue)">
            <span>🔌</span>
            <span>{{ tool }}</span>
          </div>
          <div v-if="groupTools.mcp.length === 0" style="font-size:12px;color:var(--text-muted);padding:8px">暂无配置</div>

          <div style="font-size:13px;font-weight:500;color:var(--text-secondary);margin:16px 0 10px">⚡ Skills</div>
          <div v-for="tool in groupTools.skill" :key="tool" style="display:flex;align-items:center;gap:8px;padding:8px;border:1px solid var(--border-color);border-radius:6px;margin-bottom:6px">
            <input type="checkbox" :checked="true" style="accent-color:var(--accent-blue)">
            <span>⚡</span>
            <span>{{ tool }}</span>
          </div>
          <div v-if="groupTools.skill.length === 0" style="font-size:12px;color:var(--text-muted);padding:8px">暂无配置</div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color)">
          <button class="btn btn-cancel" @click="showTools = false">取消</button>
          <button class="btn btn-primary" @click="saveGroupTools">保存</button>
        </div>
      </div>
    </div>

    <!-- 群聊共享文件弹窗 -->
    <div v-if="showSharedFiles" class="modal-overlay" @click.self="showSharedFiles = false">
      <div class="modal" style="min-width:500px;max-height:80vh;display:flex;flex-direction:column">
        <button class="modal-close" @click="showSharedFiles = false">&times;</button>
        <h3>📁 群聊共享文件 - {{ currentGroup?.name }}</h3>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Agent 可以直接读取这些文件</div>
        <div style="margin-bottom:12px">
          <button class="btn btn-primary btn-sm" @click="addGroupFile()">+ 新建文件</button>
        </div>
        <div style="flex:1;overflow-y:auto">
          <div v-if="groupFiles.length === 0" style="text-align:center;padding:40px;color:var(--text-muted)">暂无共享文件</div>
          <div v-for="f in groupFiles" :key="f.name" style="display:flex;justify-content:space-between;align-items:center;padding:10px;border:1px solid var(--border-color);border-radius:8px;margin-bottom:8px">
            <div>
              <div style="font-size:13px;color:var(--text-primary)">📄 {{ f.name }}</div>
              <div style="font-size:11px;color:var(--text-muted)">{{ new Date(f.created_at).toLocaleString('zh-CN') }}</div>
            </div>
            <button class="btn btn-danger btn-sm" @click="deleteGroupFile(f.name)">删除</button>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color)">
          <button class="btn btn-primary" @click="showSharedFiles = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 群聊成员管理弹窗 -->
    <div v-if="showMembers" class="modal-overlay" @click.self="showMembers = false">
      <div class="modal" style="min-width:450px">
        <button class="modal-close" @click="showMembers = false">&times;</button>
        <h3>👥 成员管理 - {{ currentGroup?.name }}</h3>

        <div style="margin-bottom:16px">
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">当前成员</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            <span class="tag" style="background:rgba(56,189,248,0.1);color:var(--accent-blue);padding:6px 12px">🎯 协调者（主 Agent，不可移除）</span>
            <template v-for="m in getRoutableMembers()" :key="m.project">
              <span class="tag" style="padding:6px 12px;display:flex;align-items:center;gap:4px">
                {{ m.project }}
                <span style="cursor:pointer;color:var(--accent-red);margin-left:4px" @click="removeGroupMember(m.project)">&times;</span>
              </span>
            </template>
          </div>
        </div>

        <div v-if="getAvailableProjects().length > 0" style="margin-bottom:16px">
          <div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px">添加成员</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            <button v-for="p in getAvailableProjects()" :key="p.name"
              class="btn btn-outline btn-sm"
              @click="addGroupMember(p.name, p.agent || 'claudecode')">
              + {{ p.name }}
            </button>
          </div>
        </div>
        <div v-else style="color:var(--text-muted);font-size:13px;padding:8px 0">所有项目都已加入群聊</div>

        <div style="display:flex;justify-content:flex-end;margin-top:16px;padding-top:12px;border-top:1px solid var(--border-color)">
          <button class="btn btn-primary" @click="showMembers = false">关闭</button>
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
.main-agent-status-card { margin: 0 0 16px; padding: 14px; border-radius: 14px; border: 1px solid rgba(59, 130, 246, 0.18); background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(14, 165, 233, 0.05)); box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); }
.main-agent-status-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; }
.main-agent-status-title { font-size: 12px; font-weight: 900; color: var(--text-primary); margin-right: 8px; }
.main-agent-phase { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 999px; background: rgba(59, 130, 246, 0.12); color: var(--accent-blue); font-size: 11px; font-weight: 800; }
.main-agent-status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; }
.main-agent-technical-detail{grid-column:1/-1;padding:7px 9px;border:1px solid var(--border-color);border-radius:9px;color:var(--text-muted)}
.main-agent-technical-detail>summary{cursor:pointer;font-size:10px;font-weight:800;user-select:none}
.main-agent-technical-detail[open]{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px}
.main-agent-technical-detail[open]>summary{grid-column:1/-1;margin-bottom:2px}
.main-agent-status-item { min-width: 0; padding: 8px 10px; border-radius: 10px; background: rgba(255, 255, 255, 0.55); border: 1px solid rgba(148, 163, 184, 0.16); }
.main-agent-status-item.latest-decision { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 10px; align-items: center; border-color: rgba(59, 130, 246, 0.22); background: linear-gradient(135deg, rgba(255,255,255,.72), rgba(239,246,255,.58)); }
.main-agent-status-item.latest-decision .item-label,
.main-agent-status-item.latest-decision .item-value,
.main-agent-status-item.latest-decision small { grid-column: 1; }
.main-agent-status-item.latest-decision button { grid-column: 2; grid-row: 1 / span 4; align-self: center; }
.decision-plan-preview { color: var(--accent-blue) !important; font-weight: 800; }
.main-agent-status-item.latest-decision.active { border-color: rgba(124, 58, 237, 0.28); background: linear-gradient(135deg, rgba(250,245,255,.82), rgba(239,246,255,.64)); }
.main-agent-status-item.latest-decision.analysis { border-color: rgba(14, 165, 233, 0.25); background: linear-gradient(135deg, rgba(240,249,255,.82), rgba(224,242,254,.58)); }
.main-agent-status-item.latest-decision.idle { border-color: rgba(148, 163, 184, 0.18); background: rgba(255, 255, 255, 0.56); }
.main-agent-status-item.warning { border-color: rgba(245, 158, 11, 0.25); background: rgba(245, 158, 11, 0.08); }
.main-agent-status-item .item-label { display: block; font-size: 10px; color: var(--text-muted); font-weight: 800; margin-bottom: 4px; }
.main-agent-status-item .item-value { display: block; font-size: 12px; color: var(--text-primary); font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.main-agent-status-item small { display:block; color: var(--text-muted); font-size: 11px; line-height: 1.35; overflow-wrap: anywhere; }
.delivery-summary-actions { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.delivery-gate-warning { font-size: 11px; font-weight: 800; color: #d97706; }
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
.chat-bar { display: flex; padding: 16px 20px; border-top: 1px solid rgba(0, 0, 0, 0.05); background: rgba(255, 255, 255, 0.45); backdrop-filter: blur(25px); gap: 10px; align-items: flex-end; }
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
.hidden-file-input { display: none; }
.attach-btn { width: 44px; min-width: 44px; height: 44px; padding: 0; font-size: 16px; border-radius: 10px; border-color: rgba(0, 0, 0, 0.06); background: rgba(255, 255, 255, 0.8); }
.chat-input-wrap { flex: 1; min-width: 0; position: relative; display: flex; flex-direction: column; gap: 8px; }
.attachment-row { display: flex; gap: 6px; flex-wrap: wrap; max-height: 70px; overflow-y: auto; }
.attachment-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 260px;
  padding: 5px 10px;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.85);
  color: var(--text-primary);
  font-size: 11.5px;
}
.attachment-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.attachment-chip small { color: var(--text-muted); white-space: nowrap; font-family: 'Share Tech Mono', monospace; }
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
.attachment-chip button:hover { color: var(--accent-red); }
.chat-bar textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  color: var(--text-primary);
  padding: 12px 16px;
  font-size: 13.5px;
  resize: none;
  outline: none;
  min-height: 44px;
  max-height: 150px;
  line-height: 1.5;
  transition: all 0.25s;
}
.chat-bar textarea:focus {
  border-color: rgba(59, 130, 246, 0.4);
  box-shadow: 0 0 15px rgba(59, 130, 246, 0.08);
  background: #ffffff;
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
.checkbox-list { max-height: 200px; overflow-y: auto; padding: 6px 0; }
.checkbox-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; cursor: pointer; border-radius: 6px; transition: background 0.2s; }
.checkbox-item:hover { background: rgba(0,0,0,0.02); }
.checkbox-item input { accent-color: var(--accent-blue); }
.tag { font-size: 10px; padding: 2px 6px; background: rgba(0,0,0,0.04); border-radius: 4px; color: var(--text-muted); font-family: 'Share Tech Mono', monospace; }
.form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; }

/* 文件变更 */
.file-changes { margin-top: 10px; padding: 10px 12px; background: rgba(59, 130, 246, 0.03); border: 1px solid rgba(59, 130, 246, 0.1); border-radius: 10px; }
.file-changes-header { font-size: 11px; color: var(--accent-blue); font-weight: 600; margin-bottom: 8px; letter-spacing: 0.3px; }
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
.file-change-item:hover { background: rgba(59, 130, 246, 0.05); }
.fc-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.fc-path { flex: 1; color: var(--text-secondary); font-family: 'JetBrains Mono', monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fc-diff-stat { color: var(--text-muted); font-family: 'JetBrains Mono', monospace; font-size: 10.5px; white-space: nowrap; }
.fc-status { font-size: 10px; flex-shrink: 0; font-weight: 500; }
.orchestration-plan {
  margin-top: 12px;
  border: 1px solid rgba(59, 130, 246, 0.16);
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.035);
  overflow: hidden;
}
.plan-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 10px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.12);
  color: var(--accent-blue);
  font-size: 12px;
  font-weight: 700;
}
.plan-order {
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.08);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;
}
.dispatch-policy {
  padding: 10px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
  background: rgba(15, 23, 42, 0.025);
}
.dispatch-action {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  margin-bottom: 6px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.09);
  color: var(--accent-blue);
  font-size: 10px;
  font-weight: 800;
}
.dispatch-line {
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.5;
}
.dispatch-risk,
.dispatch-confirm {
  margin-top: 5px;
  color: #d97706;
  font-size: 11px;
  line-height: 1.45;
}
.dispatch-confirm {
  font-weight: 700;
}
.coordination-plan {
  padding: 9px 10px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
  background: rgba(14, 165, 233, 0.05);
}
.coordination-title {
  margin-bottom: 6px;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 800;
}
.coordination-phase {
  position: relative;
  padding-left: 14px;
  color: var(--text-primary);
  font-size: 11px;
  line-height: 1.45;
}
.coordination-phase::before {
  content: "";
  position: absolute;
  left: 2px;
  top: 8px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent-blue);
}
.workflow-board {
  padding: 10px;
  border-bottom: 1px solid rgba(59, 130, 246, 0.1);
  background: rgba(255, 255, 255, 0.35);
}
.workflow-title {
  margin-bottom: 8px;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
}
.workflow-steps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}
.workflow-step {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 0;
  padding: 5px 4px;
  border: 1px solid rgba(100, 116, 139, 0.12);
  border-radius: 6px;
  color: var(--text-muted);
  background: rgba(100, 116, 139, 0.04);
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}
.workflow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(100, 116, 139, 0.35);
  flex-shrink: 0;
}
.workflow-step.done {
  color: #059669;
  border-color: rgba(16, 185, 129, 0.18);
  background: rgba(16, 185, 129, 0.07);
}
.workflow-step.done .workflow-dot {
  background: #10b981;
}
.workflow-step.active {
  color: var(--accent-blue);
  border-color: rgba(59, 130, 246, 0.25);
  background: rgba(59, 130, 246, 0.09);
}
.workflow-step.active .workflow-dot {
  background: var(--accent-blue);
}
.workflow-step.warning {
  color: #d97706;
  border-color: rgba(245, 158, 11, 0.24);
  background: rgba(245, 158, 11, 0.09);
}
.workflow-step.warning .workflow-dot {
  background: #f59e0b;
}
.plan-item {
  padding: 9px 10px;
  border-top: 1px solid rgba(15, 23, 42, 0.05);
}
.plan-item:first-of-type { border-top: none; }
.plan-item-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
}
.plan-project {
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 700;
}
.plan-dep {
  padding: 2px 6px;
  border-radius: 5px;
  background: rgba(167, 139, 250, 0.1);
  color: var(--accent-purple);
  font-size: 10px;
}
.plan-rework {
  padding: 2px 6px;
  border-radius: 5px;
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
  font-size: 10px;
  font-weight: 700;
}
.plan-status {
  margin-left: auto;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}
.plan-status.pending {
  background: rgba(100, 116, 139, 0.08);
  border-color: rgba(100, 116, 139, 0.14);
  color: var(--text-muted);
}
.plan-status.running {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.2);
  color: var(--accent-blue);
}
.plan-status.done {
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.2);
  color: #059669;
}
.plan-status.partial {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.22);
  color: #d97706;
}
.plan-status.blocked,
.plan-status.needs-info {
  background: rgba(167, 139, 250, 0.1);
  border-color: rgba(167, 139, 250, 0.22);
  color: var(--accent-purple);
}
.plan-status.failed {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.22);
  color: #dc2626;
}
.plan-task {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.55;
}
.plan-reason {
  margin-top: 5px;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.5;
}
.diff-overlay { padding: 24px; background: rgba(15, 23, 42, 0.18); }
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
  font-size: 15px;
  font-family: monospace;
  word-break: break-all;
}
.diff-sub { display: flex; gap: 12px; margin-top: 6px; color: var(--text-muted); font-size: 12px; font-family: monospace; }
.diff-note { padding: 8px 18px; color: #fbbf24; background: rgba(251, 191, 36, 0.08); border-bottom: 1px solid rgba(251, 191, 36, 0.16); font-size: 12px; }
.diff-viewer {
  flex: 1;
  overflow: auto;
  background: rgba(15, 23, 42, 0.95);
  padding: 10px 0;
}
.diff-line {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  min-height: 20px;
  font-family: Consolas, "Courier New", monospace;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre;
}
.diff-line code { padding: 0 12px; overflow: visible; }
.diff-line-no {
  padding-right: 10px;
  color: var(--text-muted);
  text-align: right;
  user-select: none;
  border-right: 1px solid rgba(148,163,184,0.18);
}
.diff-line.add { background: rgba(34,197,94,0.12); color: #bbf7d0; }
.diff-line.remove { background: rgba(239,68,68,0.12); color: #fecaca; }
.diff-line.meta { background: rgba(59, 130, 246, 0.06); color: #7dd3fc; }
.diff-line.context { color: rgba(255, 255, 255, 0.7); }
.diff-empty { padding: 56px 24px; color: var(--text-muted); text-align: center; }

/* 移动端适配 */
@media (max-width: 768px) {
  .content-header { flex-wrap: wrap; gap: 6px; }
  .content-header > div { flex-wrap: wrap; }
  .chat-bar { flex-wrap: wrap; }
  .chat-bar textarea { min-height: 50px; }
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

[data-theme="dark"] .chat-bar {
  background: var(--surface-nav) !important;
  border-top-color: var(--border-color) !important;
}

[data-theme="dark"] .attach-btn {
  background: var(--bg-primary) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .attach-btn:hover {
  background: rgba(56, 189, 248, 0.1) !important;
  border-color: var(--accent-blue) !important;
  color: var(--accent-blue) !important;
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

[data-theme="dark"] .attachment-chip {
  background: var(--bg-primary) !important;
  border-color: var(--border-color) !important;
}

[data-theme="dark"] .chat-bar textarea {
  background: var(--bg-primary) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
}

[data-theme="dark"] .chat-bar textarea:focus {
  background: var(--surface) !important;
  border-color: var(--accent-blue) !important;
  box-shadow: 0 0 15px rgba(56, 189, 248, 0.12) !important;
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
.project-task-intake {
  border-left: 3px solid var(--accent-blue);
  background: rgba(37, 99, 235, 0.045);
}
.project-task-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
}
.project-task-head > div {
  display: grid;
  gap: 3px;
  min-width: 0;
}
.project-task-head strong {
  font-size: 14px;
  overflow-wrap: anywhere;
}
.project-task-kicker {
  color: var(--accent-blue);
  font-size: 10px;
  font-weight: 700;
}
.project-task-status {
  flex: none;
  padding: 3px 7px;
  border-radius: 4px;
  background: rgba(37, 99, 235, 0.1);
  color: var(--accent-blue);
  font-size: 10px;
  font-weight: 700;
}
.project-task-content {
  white-space: pre-wrap;
  line-height: 1.65;
  color: var(--text-secondary);
}
.project-task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-top: 10px;
  color: var(--text-muted);
  font-size: 10px;
}
.project-task-meta code {
  color: var(--accent-blue);
}
.inline-task-runtime {
  margin-top: 10px;
  padding: 10px;
  border: 1px solid rgba(37, 99, 235, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.46);
}
.inline-task-runtime.compact { margin-bottom: 10px; }
.inline-runtime-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 11px; }
.inline-runtime-head strong { color: var(--accent-blue); }
.inline-runtime-head span { color: var(--text-muted); text-align: right; overflow-wrap: anywhere; }
.inline-runtime-counts { display: flex; flex-wrap: wrap; gap: 6px 12px; margin-top: 8px; color: var(--text-secondary); font-size: 10.5px; }
.inline-runtime-agents, .inline-runtime-sessions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.inline-runtime-agents > span, .inline-runtime-sessions > span { padding: 4px 7px; border-radius: 5px; background: rgba(100, 116, 139, 0.09); color: var(--text-secondary); font-size: 10px; }
.inline-agent-state.running, .inline-agent-state.spawning, .inline-agent-state.ready, .inline-agent-state.prompt_accepted, .inline-agent-state.reviewing { background: rgba(37, 99, 235, 0.1); color: var(--accent-blue); }
.inline-agent-state.succeeded { background: rgba(34, 197, 94, 0.11); color: var(--accent-green); }
.inline-agent-state.failed, .inline-agent-state.cancelled { background: rgba(239, 68, 68, 0.1); color: #b91c1c; }
.conflict-plan-bubble { border-left: 3px solid #d97706; background: rgba(245, 158, 11, 0.06); }
.conflict-plan-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.conflict-plan-head span { padding: 3px 7px; border-radius: 5px; background: rgba(245, 158, 11, 0.12); color: #b45309; font-size: 10px; font-weight: 700; }
.conflict-plan-list { display: grid; gap: 7px; margin-top: 9px; }
.conflict-plan-list > div { display: grid; gap: 3px; padding: 7px 8px; border-radius: 6px; background: rgba(255, 255, 255, 0.52); font-size: 10.5px; }
.conflict-plan-list span { color: var(--text-secondary); }
.conflict-plan-list code { color: #92400e; overflow-wrap: anywhere; }

.agent-exec-bubble {
  position: relative;
  border-left: 3px solid var(--agent-accent) !important;
}
.agent-exec-bubble::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 56px;
  pointer-events: none;
  background: linear-gradient(90deg, color-mix(in srgb, var(--agent-accent) 10%, transparent), transparent);
  opacity: 0.7;
}
.agent-exec-bubble.agent-state-fail {
  border-color: rgba(239, 68, 68, 0.36) !important;
  box-shadow: 0 6px 18px rgba(239, 68, 68, 0.08) !important;
}
.agent-exec-bubble.agent-state-running {
  box-shadow: 0 6px 18px color-mix(in srgb, var(--agent-accent) 12%, transparent) !important;
}
.agent-message-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.agent-identity {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.agent-avatar {
  width: 26px;
  height: 26px;
  flex: 0 0 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: color-mix(in srgb, var(--agent-accent) 14%, white);
  color: var(--agent-accent);
  border: 1px solid color-mix(in srgb, var(--agent-accent) 25%, transparent);
  font-size: 10px;
  font-weight: 800;
  line-height: 1;
}
.agent-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 800;
}
.agent-status-pill {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
  background: rgba(100, 116, 139, 0.1);
  color: var(--text-muted);
}
.agent-status-pill.running {
  background: color-mix(in srgb, var(--agent-accent) 13%, transparent);
  color: var(--agent-accent);
}
.agent-status-pill.ok {
  background: rgba(34, 197, 94, 0.12);
  color: var(--accent-green);
}
.agent-status-pill.fail {
  background: rgba(239, 68, 68, 0.12);
  color: var(--accent-red);
}
.agent-message-content {
  position: relative;
  z-index: 1;
}
[data-theme="dark"] .agent-avatar {
  background: color-mix(in srgb, var(--agent-accent) 20%, rgba(15, 23, 42, 0.9));
  border-color: color-mix(in srgb, var(--agent-accent) 32%, rgba(255, 255, 255, 0.08));
}
.agent-qa-bubble {
  border-left: 3px solid var(--agent-accent, #3b82f6) !important;
  background: color-mix(in srgb, var(--agent-accent, #3b82f6) 7%, rgba(255, 255, 255, 0.78)) !important;
}
.agent-qa-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}
.agent-qa-heading {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.agent-qa-kind {
  flex: 0 0 auto;
  padding: 2px 7px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--agent-accent, #3b82f6) 14%, transparent);
  color: var(--agent-accent, #3b82f6);
  font-size: 11px;
  font-weight: 800;
}
.agent-qa-title {
  min-width: 0;
  color: var(--text-primary);
  font-weight: 800;
  overflow-wrap: anywhere;
}
.agent-qa-status {
  flex: 0 0 auto;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}
.agent-qa-status.running { background: rgba(59, 130, 246, 0.12); color: #2563eb; }
.agent-qa-status.ok { background: rgba(34, 197, 94, 0.13); color: #15803d; }
.agent-qa-status.warn { background: rgba(245, 158, 11, 0.16); color: #b45309; }
.agent-qa-status.fail { background: rgba(239, 68, 68, 0.13); color: #dc2626; }
.agent-qa-meta {
  margin-bottom: 8px;
  color: var(--text-muted);
  font-size: 12px;
}
.agent-qa-question {
  margin: 8px 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.04);
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}
.agent-qa-content {
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}
.agent-qa-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
}
[data-theme="dark"] .agent-qa-bubble {
  background: color-mix(in srgb, var(--agent-accent, #60a5fa) 12%, rgba(15, 23, 42, 0.7)) !important;
}
[data-theme="dark"] .agent-qa-question {
  background: rgba(255, 255, 255, 0.06);
}
[data-theme="dark"] .agent-qa-actions {
  border-top-color: rgba(255, 255, 255, 0.08);
}

/* 消息节点锚点导航条 (Codex 风格) */
.msg-navigator {
  position: absolute;
  right: 6px;
  top: 8px;
  bottom: 8px;
  width: 28px;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  z-index: 100;
  overflow: hidden;
  padding: 6px 0;
}

:global([data-theme="dark"]) .msg-navigator {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
}

.msg-nav-track {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 2px 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.msg-nav-track::-webkit-scrollbar { display: none; }

.navigator-dot {
  width: 24px;
  min-height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  flex-shrink: 0;
  padding: 2px 0;
}

.dot-cluster {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
}

.dot-bar {
  width: 10px;
  height: 3px;
  border-radius: 1.5px;
  transition: all 0.2s ease;
}

.user-bar {
  background: var(--accent-blue, #3b82f6);
  opacity: 0.5;
}
.assistant-bar {
  background: var(--text-muted, #94a3b8);
  opacity: 0.35;
}

.navigator-dot:hover {
  transform: scale(1.3);
}
.navigator-dot:hover .dot-bar {
  width: 14px;
  height: 4px;
  opacity: 1;
}
.navigator-dot:hover .user-bar {
  box-shadow: 0 0 6px rgba(59, 130, 246, 0.4);
}
.navigator-dot:hover .assistant-bar {
  box-shadow: 0 0 6px rgba(148, 163, 184, 0.4);
}

/* Tooltip 悬停显示消息摘要 */
.nav-tooltip-card {
  position: absolute;
  right: 28px;
  top: 50%;
  transform: translateY(-50%) scale(0.9);
  background: var(--surface, #ffffff);
  border: 1px solid var(--border-color, rgba(0, 0, 0, 0.08));
  color: var(--text-primary, #333333);
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  max-width: 320px;
  width: max-content;
  opacity: 0;
  pointer-events: none;
  transition: all 0.18s cubic-bezier(0.25, 0.8, 0.25, 1);
  transform-origin: right center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
:global([data-theme="dark"]) .nav-tooltip-card {
  background: rgba(30, 41, 59, 0.95);
  border-color: rgba(255, 255, 255, 0.1);
  color: #f1f5f9;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}
.navigator-dot:hover .nav-tooltip-card {
  opacity: 1;
  transform: translateY(-50%) scale(1);
}
.nav-tt-user {
  font-weight: 600;
  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.nav-tt-assistant {
  font-size: 12px;
  color: var(--text-muted, #777);
  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
:global([data-theme="dark"]) .nav-tt-assistant {
  color: #94a3b8;
}
.nav-tt-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}
.nav-tt-tag {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  color: var(--text-secondary, #555);
}
:global([data-theme="dark"]) .nav-tt-tag {
  background: rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
}
</style>
