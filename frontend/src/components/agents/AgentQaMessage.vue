<script setup>
import { computed } from 'vue'

const props = defineProps({
  msg: { type: Object, required: true },
  accentStyle: { type: Object, default: () => ({}) },
  actionLoading: { type: Object, default: () => ({}) },
  highlightMentions: { type: Function, default: (value) => value || '' },
  getAgentDisplayName: { type: Function, default: (agent) => agent || 'Agent' },
})

const emit = defineEmits(['action'])

const qa = computed(() => props.msg?.qa || {})
const kind = computed(() => qa.value.kind || (props.msg?.type === 'agent_qa_resume' ? 'resume' : ''))
const kindLabel = computed(() => {
  if (kind.value === 'question') return '提问'
  if (kind.value === 'answer') return '回答'
  if (kind.value === 'resume') return '续跑'
  return '问答'
})
const title = computed(() => {
  const from = props.getAgentDisplayName(qa.value.from_agent || props.msg.agent)
  const to = props.getAgentDisplayName(qa.value.to_agent || qa.value.target || '')
  if (kind.value === 'answer') return `${to} 回答 ${from}`
  if (kind.value === 'resume' || props.msg?.type === 'agent_qa_resume') return `${from} 已拿到回答并继续执行`
  return `${from} 向 ${to} 提问`
})
const statusLabelMap = {
  waiting: '等待目标 Agent',
  asking: '目标 Agent 工作中',
  answered: '已回答',
  injected: '已注入原 Agent',
  resumed: '原 Agent 已续跑',
  failed: '回答失败',
  timeout: '已超时',
  needs_user: '等待用户确认',
  manual: '人工接管',
  rejected: '已拒绝',
}
const statusLabel = computed(() => statusLabelMap[qa.value.status] || qa.value.status || '问答中')
const statusTone = computed(() => {
  if (['answered', 'injected', 'resumed'].includes(qa.value.status)) return 'ok'
  if (['failed', 'timeout', 'rejected'].includes(qa.value.status)) return 'fail'
  if (['needs_user', 'manual'].includes(qa.value.status)) return 'warn'
  return 'running'
})
const meta = computed(() => {
  const parts = []
  if (qa.value.type === 'request_review') parts.push('评审请求')
  else parts.push('工作询问')
  if (qa.value.blocking !== false) parts.push('阻塞续跑')
  if (qa.value.retry_count) parts.push(`重试 ${qa.value.retry_count} 次`)
  if (qa.value.injected_at) parts.push('已注入上下文')
  if (qa.value.resumed_at) parts.push('已续跑')
  if (qa.value.routing?.strategy === 'capability_and_load') parts.push('能力路由')
  if (qa.value.execution_id) parts.push(`Execution ${qa.value.execution_id}`)
  if (qa.value.acceptance?.score != null) parts.push(`证据评分 ${qa.value.acceptance.score}`)
  if (qa.value.permission_contract?.mode === 'advisory_read_only') parts.push('只读问答')
  if (qa.value.arbitration?.decision) parts.push(`仲裁：${qa.value.arbitration.decision}`)
  return parts.join(' · ')
})
const contentHtml = computed(() => props.highlightMentions(props.msg.content || ''))
const evidenceText = computed(() => Array.isArray(qa.value.answer_evidence) ? qa.value.answer_evidence.slice(0, 4).join(' · ') : '')
const canRetry = computed(() => ['failed', 'timeout', 'manual'].includes(qa.value.status))
const canTakeover = computed(() => ['waiting', 'asking', 'timeout', 'needs_user'].includes(qa.value.status))
const canArbitrate = computed(() => qa.value.status === 'rejected' || ['conflict', 'needs_evidence'].includes(qa.value.acceptance?.status))
const isLoading = (action) => !!props.actionLoading[`${qa.value.id}:${action}`]
</script>

<template>
  <div class="bubble agent-qa-bubble" :style="accentStyle">
    <div class="agent-qa-head">
      <div class="agent-qa-heading">
        <span class="agent-qa-kind">{{ kindLabel }}</span>
        <span class="agent-qa-title">{{ title }}</span>
      </div>
      <span :class="['agent-qa-status', statusTone]">{{ statusLabel }}</span>
    </div>
    <div v-if="meta" class="agent-qa-meta">{{ meta }}</div>
    <div v-if="qa.question && kind !== 'question'" class="agent-qa-question">问：{{ qa.question }}</div>
    <div class="agent-qa-content" v-html="contentHtml"></div>
    <div v-if="evidenceText" class="agent-qa-meta">证据：{{ evidenceText }}</div>
    <div v-if="qa.acceptance?.reason" class="agent-qa-meta">主 Agent 仲裁：{{ qa.acceptance.reason }}</div>
    <div v-if="qa.permission_boundary?.pass === false" class="agent-qa-question">权限门禁：检测到问答外副作用，回答未采纳。</div>
    <div v-if="canRetry || canTakeover || canArbitrate" class="agent-qa-actions">
      <button
        v-if="canRetry"
        class="btn btn-sm btn-outline"
        :disabled="isLoading('retry')"
        @click="emit('action', 'retry')"
      >重试</button>
      <button
        v-if="canTakeover"
        class="btn btn-sm btn-outline"
        :disabled="isLoading('manual')"
        @click="emit('action', 'manual')"
      >人工接管</button>
      <button
        v-if="canArbitrate"
        class="btn btn-sm btn-outline"
        :disabled="isLoading('accept')"
        @click="emit('action', 'accept')"
      >主 Agent 采纳</button>
      <button
        v-if="canArbitrate"
        class="btn btn-sm btn-outline"
        :disabled="isLoading('reject')"
        @click="emit('action', 'reject')"
      >拒绝</button>
    </div>
  </div>
</template>

<style scoped>
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
:global([data-theme="dark"]) .agent-qa-bubble {
  background: color-mix(in srgb, var(--agent-accent, #60a5fa) 12%, rgba(15, 23, 42, 0.7)) !important;
}
:global([data-theme="dark"]) .agent-qa-question {
  background: rgba(255, 255, 255, 0.06);
}
:global([data-theme="dark"]) .agent-qa-actions {
  border-top-color: rgba(255, 255, 255, 0.08);
}
</style>
