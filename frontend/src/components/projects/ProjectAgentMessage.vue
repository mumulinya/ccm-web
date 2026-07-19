<script setup>
import { computed } from 'vue'
import TaskExperienceCard from '../tasks/TaskExperienceCard.vue'

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  taskCard: {
    type: Object,
    default: null
  },
  isLastStreaming: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['task-action', 'open-file-diff'])

const workEvents = computed(() => (
  Array.isArray(props.message?.workEvents) ? props.message.workEvents.filter(Boolean) : []
))

const isTaskMessage = computed(() => String(props.message?.messageMode || props.message?.message_mode || '').toLowerCase() === 'task' || !!props.taskCard)

const visibleWorkEvents = computed(() => workEvents.value.slice(-10))

const sanitizeUserVisibleWorkText = (value) => {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/CCM_AGENT_RECEIPT|CCM_AGENT_REQUESTS|scratchpad|trace_id|session_ids|native_session|task_agent_session|shouldDelegate|门禁|回执要求|任务级原生会话/i.test(text)) {
    if (/error|失败|权限|denied|invalid/i.test(text)) return 'Agent 遇到内部执行保护或权限问题，详情已折叠，可在技术详情中排查。'
    if (/done|完成|CCM_AGENT_RECEIPT/i.test(text)) return 'Agent 已提交结构化完成信息，系统正在汇总验收。'
    return 'Agent 正在处理内部执行细节，已为用户视图折叠。'
  }
  return text
}

const compactWorkText = (value, max = 320) => {
  const text = sanitizeUserVisibleWorkText(value)
  return text.length > max ? `${text.slice(0, max)}...` : text
}

const workEventLabel = (kind) => ({ status: '状态', output: '输出', tool: '工具', done: '完成', error: '错误' }[kind || 'status'] || kind)
const workEventTone = (kind) => {
  if (kind === 'done') return 'ok'
  if (kind === 'error') return 'fail'
  if (kind === 'output') return 'output'
  return 'status'
}

const hasFileChanges = computed(() => (
  props.message?.fileChanges?.count > 0 && Array.isArray(props.message?.fileChanges?.files)
))
</script>

<template>
  <TaskExperienceCard
    v-if="taskCard"
    :card="taskCard"
    context="project"
    :busy="!!message.streaming"
    @action="emit('task-action', $event)"
  />
  <div v-else>{{ message.content }}</div>
  <span v-if="isLastStreaming" class="stream-cursor">▌</span>

  <details v-if="workEvents.length && !taskCard && isTaskMessage" class="agent-work-events">
    <summary class="work-events-head">
      <span>技术详情</span>
      <span>{{ workEvents.length }} 条</span>
    </summary>
    <div class="work-events-list">
      <div
        v-for="event in visibleWorkEvents"
        :key="event.id || event.time || event.text"
        :class="['work-event', workEventTone(event.kind)]"
      >
        <span class="work-event-kind">{{ workEventLabel(event.kind) }}</span>
        <pre>{{ compactWorkText(event.text) }}</pre>
      </div>
    </div>
  </details>

  <div v-if="hasFileChanges && !taskCard && isTaskMessage" class="file-changes">
    <div class="file-changes-header">📁 修改了 {{ message.fileChanges.count }} 个文件</div>
    <button
      v-for="file in message.fileChanges.files"
      :key="file.path"
      class="file-change-item"
      @click="emit('open-file-diff', file)"
    >
      <span class="fc-dot" :style="{ background: file.statusColor }"></span>
      <span class="fc-path">{{ file.path }}</span>
      <span v-if="file.diff?.available" class="fc-diff-stat">
        +{{ file.diff.additions || 0 }} -{{ file.diff.deletions || 0 }}
      </span>
      <span class="fc-status" :style="{ color: file.statusColor }">{{ file.statusText }}</span>
    </button>
  </div>
</template>

<style scoped>
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
  }
  50% {
    opacity: 1;
    text-shadow: 0 0 8px var(--accent-blue);
  }
}

.file-changes {
  margin-top: 10px;
  padding: 12px;
  background: rgba(59, 130, 246, 0.03);
  border: 1px solid rgba(59, 130, 246, 0.1);
  border-radius: 10px;
}

.file-changes-header {
  font-size: 11px;
  color: var(--accent-blue);
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

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

.file-change-item:hover {
  background: rgba(59, 130, 246, 0.05);
}

.fc-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.fc-path {
  flex: 1;
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fc-diff-stat {
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  white-space: nowrap;
}

.fc-status {
  font-size: 10px;
  flex-shrink: 0;
  font-weight: 600;
}

.agent-work-events {
  margin-top: 10px;
  border: 1px solid rgba(59, 130, 246, 0.14);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.035);
  overflow: hidden;
}

.work-events-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 9px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}

.work-events-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  max-height: 260px;
  overflow-y: auto;
}

.work-event {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
}

.work-event-kind {
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(100, 116, 139, 0.1);
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 800;
  text-align: center;
}

.work-event pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-secondary);
  font-family: Consolas, 'JetBrains Mono', monospace;
  font-size: 11px;
  line-height: 1.55;
}

.work-event.output pre {
  color: var(--text-primary);
}

.work-event.ok .work-event-kind {
  background: rgba(34, 197, 94, 0.12);
  color: var(--accent-green);
}

.work-event.fail .work-event-kind {
  background: rgba(239, 68, 68, 0.12);
  color: var(--accent-red);
}

.work-event.output .work-event-kind {
  background: rgba(59, 130, 246, 0.1);
  color: var(--accent-blue);
}
</style>
