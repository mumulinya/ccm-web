<script setup>
import { computed } from 'vue'
import TaskExperienceCard from '../tasks/TaskExperienceCard.vue'
import AgentFinalAnswer from '../common/AgentFinalAnswer.vue'
import ConversationTodo from '../common/ConversationTodo.vue'
import ConversationClarificationCards from '../common/ConversationClarificationCards.vue'
import { taskCardNeedsConversationControl } from '../../utils/taskCardPresentation.js'

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
  },
  suppressThinking: { type: Boolean, default: false },
  hideFileChanges: { type: Boolean, default: false },
  messageKey: { type: String, default: '' },
  liveProgress: { type: String, default: '' },
})

const emit = defineEmits(['task-action', 'open-file-diff', 'clarify-reply'])

const isTaskMessage = computed(() => String(props.message?.messageMode || props.message?.message_mode || '').toLowerCase() === 'task' || !!props.taskCard)
const showTaskControlCard = computed(() => taskCardNeedsConversationControl(props.taskCard))

const hasFileChanges = computed(() => (
  props.message?.fileChanges?.count > 0 && Array.isArray(props.message?.fileChanges?.files)
))
const answerContent = computed(() => {
  const content = String(props.message?.content || '').trim()
  if (content) return content
  return String(props.liveProgress || '').trim()
})
const answerStreaming = computed(() => props.isLastStreaming || (!String(props.message?.content || '').trim() && !!props.liveProgress))
</script>

<template>
  <AgentFinalAnswer
    v-if="answerContent"
    :content="answerContent"
    :streaming="answerStreaming"
    :mentions="message.mentions || []"
    :storage-key="messageKey"
  />
  <ConversationTodo :source="message" :decision="message.mainAgentDecision || message.main_agent_decision" />
  <ConversationClarificationCards :source="message" @submit="emit('clarify-reply', $event)" />
  <TaskExperienceCard
    v-if="showTaskControlCard"
    :card="taskCard"
    context="project"
    compact
    :busy="!!message.streaming || !!message.taskActionBusy"
    @action="emit('task-action', $event)"
  />

  <div v-if="hasFileChanges && !showTaskControlCard && isTaskMessage && !hideFileChanges" class="file-changes">
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
</style>
