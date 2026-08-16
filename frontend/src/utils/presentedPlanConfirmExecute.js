import { notifyConversationPlanModeChanged } from './conversationPlanMode.js'

export const PRESENTED_PLAN_CONFIRM_EXECUTE_LABEL = '确认并执行'
export const GLOBAL_CONVERSATION_PLAN_MODE_UNSUPPORTED = '全局会话不支持 Plan 模式。全局 Agent 不读取项目代码；实现计划请到群聊或项目主 Agent 会话。'

export function conversationPlanModeSupported(scope) {
  return scope === 'project' || scope === 'group'
}

export function presentedPlanFromMessage(msg) {
  const plan = msg?.presentedPlan || msg?.presented_plan
  const steps = Array.isArray(plan?.steps) ? plan.steps.filter(step => String(step?.title || '').trim()) : []
  if (!plan || !steps.length) return null
  return plan
}

export function isLatestUnansweredPresentedPlan(messages, msg, hasPlan, messageIndex) {
  const list = Array.isArray(messages) ? messages : []
  const check = typeof hasPlan === 'function'
    ? (item, index) => !!hasPlan(item, index)
    : (item) => !!presentedPlanFromMessage(item)
  let lastIndex = -1
  for (let i = 0; i < list.length; i += 1) {
    if (check(list[i], i)) lastIndex = i
  }
  if (lastIndex < 0) return false
  const resolvedIndex = Number.isInteger(messageIndex) && messageIndex >= 0
    ? messageIndex
    : list.findIndex((item) => item === msg || (!!msg?.id && String(item?.id || '') === String(msg.id)))
  if (lastIndex !== resolvedIndex) return false
  for (let i = lastIndex + 1; i < list.length; i += 1) {
    if (String(list[i]?.role || '').toLowerCase() === 'user') return false
  }
  return true
}

export function buildPresentedPlanConfirmExecuteMessage(plan) {
  const title = String(plan?.title || '实施计划').trim()
  const overview = String(plan?.overview || plan?.goal || '').trim()
  const steps = (Array.isArray(plan?.steps) ? plan.steps : [])
    .map(step => String(step?.title || '').trim())
    .filter(Boolean)
  const lines = [
    '用户已确认下面这份计划卡，并授权按该计划开始执行（派发子 Agent / 改代码）。请调用 ccm_dispatch，覆盖已确认切片，不要重写成前端/后端/测试分工。不要把 TestAgent 放进 targets。',
    '',
    '【已确认计划】',
    title,
  ]
  if (overview) lines.push(overview)
  if (steps.length) {
    lines.push('')
    for (const stepTitle of steps) lines.push(`- ${stepTitle}`)
  }
  return lines.join('\n')
}

function planModeIdentity(identity = {}) {
  const scope = String(identity.scope || '').trim()
  return {
    scope,
    scopeId: String(identity.scopeId || '') || (scope === 'global' ? 'global' : ''),
    exactSessionId: String(identity.exactSessionId || ''),
  }
}

async function readConversationPlanMode(identity) {
  const query = new URLSearchParams(planModeIdentity(identity)).toString()
  const response = await fetch(`/api/conversations/plan-mode?${query}`, { cache: 'no-store' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.success === false) throw new Error(data?.error || '会话模式读取失败')
  return {
    enabled: data.planMode?.enabled === true,
    revision: Number(data.revision ?? data.result?.revision ?? 0),
    generation: Number(data.generation ?? data.result?.generation ?? 0),
  }
}

async function patchConversationPlanModeExit(identity, revision, generation) {
  const response = await fetch('/api/conversations/plan-mode', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...planModeIdentity(identity),
      revision: Number(revision || 0),
      generation: Number(generation || 0),
      action: 'exit',
    }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.success === false) throw new Error(data?.error || '退出 Plan 模式失败')
  return data.result || data.planMode || data
}

export async function exitConversationPlanMode(identity) {
  const first = await readConversationPlanMode(identity)
  if (!first.enabled) {
    return { exited: false, alreadyAgent: true, revision: first.revision, generation: first.generation }
  }
  const apply = async (revision, generation) => {
    const result = await patchConversationPlanModeExit(identity, revision, generation)
    notifyConversationPlanModeChanged({
      ...planModeIdentity(identity),
      mode: 'agent',
      enabled: false,
      revision: Number(result.revision ?? revision),
      generation: Number(result.generation ?? generation),
    })
    return {
      exited: true,
      revision: Number(result.revision ?? revision),
      generation: Number(result.generation ?? generation),
    }
  }
  try {
    return await apply(first.revision, first.generation)
  } catch (error) {
    if (!/漂移/.test(String(error?.message || ''))) throw error
    const retry = await readConversationPlanMode(identity)
    if (!retry.enabled) {
      return { exited: false, alreadyAgent: true, revision: retry.revision, generation: retry.generation }
    }
    return apply(retry.revision, retry.generation)
  }
}
