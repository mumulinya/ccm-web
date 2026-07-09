<script setup>
import { computed } from 'vue'
import { sanitizeUserFacingAgentText } from '../../utils/agentDisplay.js'

const props = defineProps({
  msg: { type: Object, required: true },
  accentStyle: { type: Object, default: () => ({}) },
  actionLoading: { type: Object, default: () => ({}) },
  highlightMentions: { type: Function, default: (value) => value || '' },
  getAgentDisplayName: { type: Function, default: (agent) => agent || 'Agent' },
})

const emit = defineEmits(['action'])

const qa = computed(() => props.msg?.qa || {})
const userPreview = computed(() => qa.value.user_preview || qa.value.userPreview || {})
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
  const parts = Array.isArray(userPreview.value.badges) && userPreview.value.badges.length
    ? userPreview.value.badges.slice(0, 6)
    : []
  if (!parts.length) {
    if (qa.value.type === 'request_review') parts.push('评审请求')
    else parts.push('工作询问')
    if (qa.value.blocking !== false) parts.push('影响续跑')
    if (qa.value.retry_count) parts.push(`已重试 ${qa.value.retry_count} 次`)
    if (qa.value.injected_at) parts.push('已注入上下文')
    if (qa.value.resumed_at) parts.push('已续跑')
    if (qa.value.permission_contract?.mode === 'advisory_read_only') parts.push('只读问答')
  }
  return parts.join(' · ')
})
const visibleSummary = computed(() => userPreview.value.summary || sanitizeUserFacingAgentText(props.msg.display_content || props.msg.content || qa.value.content || '', 'Agent 问答进展已更新。', 260))
const visibleQuestion = computed(() => userPreview.value.question || (qa.value.question ? sanitizeUserFacingAgentText(qa.value.question, '问题原文已放入技术详情。', 180) : ''))
const visibleAnswer = computed(() => userPreview.value.answer || (qa.value.answer ? sanitizeUserFacingAgentText(qa.value.answer, '回答详情已放入技术详情。', 220) : ''))
const visibleNextAction = computed(() => userPreview.value.next_action || '')
const contentHtml = computed(() => props.highlightMentions(visibleSummary.value || ''))
const evidenceText = computed(() => Array.isArray(qa.value.answer_evidence) ? qa.value.answer_evidence.slice(0, 4).join(' · ') : '')
const technicalRows = computed(() => [
  { label: '问题 ID', value: qa.value.id },
  { label: '执行', value: qa.value.execution_id },
  { label: '路由', value: qa.value.routing?.strategy },
  { label: '证据评分', value: qa.value.acceptance?.score != null ? qa.value.acceptance.score : '' },
  { label: '权限模式', value: qa.value.permission_contract?.mode },
  { label: '证据', value: evidenceText.value },
  { label: '仲裁状态', value: qa.value.arbitration?.decision || qa.value.acceptance?.status },
].filter(item => item.value !== undefined && item.value !== null && String(item.value).trim()))
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
    <div class="agent-qa-content" v-html="contentHtml"></div>
    <div v-if="visibleQuestion" class="agent-qa-question">问：{{ visibleQuestion }}</div>
    <div v-if="visibleAnswer" class="agent-qa-answer">答：{{ visibleAnswer }}</div>
    <div v-if="qa.acceptance?.reason" class="agent-qa-meta">仲裁结论：{{ sanitizeUserFacingAgentText(qa.acceptance.reason, '问答仲裁已完成。', 180) }}</div>
    <div v-if="visibleNextAction" class="agent-qa-meta">下一步：{{ visibleNextAction }}</div>
    <div v-if="qa.permission_boundary?.pass === false" class="agent-qa-question">权限门禁：检测到问答外副作用，回答未采纳。</div>
    <details v-if="technicalRows.length" class="agent-qa-details">
      <summary>技术详情</summary>
      <dl>
        <template v-for="row in technicalRows" :key="row.label">
          <dt>{{ row.label }}</dt>
          <dd>{{ row.value }}</dd>
        </template>
      </dl>
    </details>
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
      >采纳</button>
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
.agent-qa-question,
.agent-qa-answer {
  margin: 8px 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.04);
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}
.agent-qa-answer {
  background: rgba(34, 197, 94, 0.08);
}
.agent-qa-content {
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}
.agent-qa-details {
  margin-top: 8px;
  color: var(--text-muted);
  font-size: 11px;
}
.agent-qa-details summary {
  cursor: pointer;
  font-weight: 800;
}
.agent-qa-details dl {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 5px 8px;
  margin: 8px 0 0;
  padding: 8px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.56);
}
.agent-qa-details dt {
  font-weight: 800;
}
.agent-qa-details dd {
  margin: 0;
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
:global([data-theme="dark"]) .agent-qa-question,
:global([data-theme="dark"]) .agent-qa-answer {
  background: rgba(255, 255, 255, 0.06);
}
:global([data-theme="dark"]) .agent-qa-details dl {
  background: rgba(15, 23, 42, 0.45);
  border-color: rgba(255, 255, 255, 0.08);
}
:global([data-theme="dark"]) .agent-qa-actions {
  border-top-color: rgba(255, 255, 255, 0.08);
}
</style>
