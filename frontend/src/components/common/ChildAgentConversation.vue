<script setup>
import { computed } from 'vue'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  FileCode2,
  LoaderCircle,
} from '@lucide/vue'
import { childAgentCardTitle, displayedChildAgentDialogue } from '../../utils/nestChildAgentConversation.js'
import { eventStatusLabel } from '../../utils/agentExecutionEvents.js'

const props = defineProps({
  card: { type: Object, required: true },
  live: { type: Boolean, default: false },
  expanded: { type: Boolean, default: false },
  toolsExpanded: { type: Boolean, default: false },
  density: { type: String, default: 'standard' },
})

const emit = defineEmits(['toggle', 'toggle-tools', 'open-file-change'])

const title = computed(() => childAgentCardTitle(props.card))
const statusLabel = computed(() => eventStatusLabel(props.card.agent || props.card) || props.card.display?.status || '')
const dialogue = computed(() => displayedChildAgentDialogue(props.card, { live: props.live }))
const lastLine = computed(() => dialogue.value.at(-1)?.text || '')
const files = computed(() => Array.isArray(props.card.files) ? props.card.files : [])
const tools = computed(() => Array.isArray(props.card.tools) ? props.card.tools : [])
const showToolsSection = computed(() => tools.value.length > 0 || files.value.length > 0)
const collapsedPreview = computed(() => {
  if (props.expanded) return ''
  if (lastLine.value) return lastLine.value
  if (files.value.length) return `${files.value.length} 个文件`
  return statusLabel.value
})
const statusClass = computed(() => {
  const status = String(props.card.display?.status || '')
  if (status === 'failed') return 'failed'
  if (status === 'success') return 'success'
  if (status === 'waiting') return 'waiting'
  return 'running'
})
const statusIcon = computed(() => {
  if (statusClass.value === 'failed') return AlertTriangle
  if (statusClass.value === 'success') return Check
  if (statusClass.value === 'waiting' || statusClass.value === 'running') return LoaderCircle
  return Check
})
const toolsToggleLabel = computed(() => {
  const parts = []
  if (tools.value.length) parts.push(tools.value.length === 1 ? '1 项工具' : `${tools.value.length} 项工具`)
  if (files.value.length) parts.push(files.value.length === 1 ? '1 个文件' : `${files.value.length} 个文件`)
  return parts.join(' · ') || '工具与文件'
})
</script>

<template>
  <article
    class="cc-child-agent-card"
    :class="[statusClass, { live, expanded, test: card.isTestAgent, summary: density === 'summary' }]"
    :data-execution-event-id="card.eventId"
  >
    <button
      type="button"
      class="cc-child-agent-head"
      :aria-expanded="expanded"
      @click="emit('toggle', card)"
    >
      <span class="cc-child-agent-mark" aria-hidden="true">
        <component :is="statusIcon" :size="11" />
      </span>
      <div class="cc-child-agent-title">
        <strong>{{ title }}</strong>
        <small>{{ [card.runtimeLabel, statusLabel].filter(Boolean).join(' · ') }}</small>
      </div>
      <span v-if="collapsedPreview" class="cc-child-agent-preview">{{ collapsedPreview }}</span>
      <span class="cc-child-agent-chevron">
        <ChevronDown v-if="expanded" :size="13" />
        <ChevronRight v-else :size="13" />
      </span>
    </button>
    <div v-if="expanded" class="cc-child-agent-body">
      <template v-if="!toolsExpanded">
        <p
          v-for="line in dialogue"
          :key="line.eventId"
          class="cc-child-agent-line"
        >{{ line.text }}</p>
      </template>
      <button
        v-if="showToolsSection"
        type="button"
        class="cc-child-agent-tools-toggle"
        :aria-expanded="toolsExpanded"
        @click.stop="emit('toggle-tools', card)"
      >
        <FileCode2 :size="12" aria-hidden="true" />
        <span>{{ toolsToggleLabel }}</span>
        <ChevronDown v-if="toolsExpanded" :size="12" />
        <ChevronRight v-else :size="12" />
      </button>
      <div v-if="toolsExpanded && files.length" class="cc-child-agent-files" aria-label="项目子 Agent文件变化">
        <button
          v-for="file in files"
          :key="file.path"
          type="button"
          class="cc-child-agent-file"
          @click.stop="emit('open-file-change', file, card.agent || card)"
        >
          <strong>{{ file.status || '已修改' }}</strong>
          <code :title="file.path">{{ file.path }}</code>
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.cc-child-agent-card {
  margin: 4px 0 6px 12px;
  border: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 28%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface-subtle, #f8fafc) 72%, transparent);
}
.cc-child-agent-head {
  width: 100%;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) minmax(0, 1.2fr) 18px;
  align-items: center;
  gap: 7px;
  min-height: 36px;
  padding: 6px 8px;
  border: 0;
  border-radius: 8px;
  color: var(--text-secondary);
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.cc-child-agent-head:hover { background: rgba(100, 116, 139, 0.05); }
.cc-child-agent-mark {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: #2563eb;
  background: rgba(37, 99, 235, 0.1);
}
.cc-child-agent-card.success .cc-child-agent-mark { color: #15803d; background: rgba(34, 197, 94, 0.12); }
.cc-child-agent-card.failed .cc-child-agent-mark { color: #dc2626; background: rgba(239, 68, 68, 0.12); }
.cc-child-agent-card.waiting .cc-child-agent-mark { color: #b45309; background: rgba(245, 158, 11, 0.13); }
.cc-child-agent-title { min-width: 0; display: grid; gap: 1px; }
.cc-child-agent-title strong {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cc-child-agent-title small {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cc-child-agent-preview {
  min-width: 0;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cc-child-agent-chevron { display: inline-flex; color: var(--text-muted); }
.cc-child-agent-body { display: grid; gap: 6px; padding: 0 10px 8px 33px; }
.cc-child-agent-line {
  margin: 0;
  color: var(--text-primary);
  font-size: 12px;
  line-height: 1.55;
}
.cc-child-agent-tools-toggle {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  padding: 3px 0;
  border: 0;
  color: var(--text-muted);
  background: transparent;
  font-size: 10px;
  cursor: pointer;
}
.cc-child-agent-tools-toggle:hover { color: var(--text-secondary); }
.cc-child-agent-files { display: grid; gap: 2px; }
.cc-child-agent-file {
  width: 100%;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding: 3px 2px;
  border: 0;
  border-radius: 5px;
  color: var(--text-secondary);
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.cc-child-agent-file:hover { background: rgba(100, 116, 139, 0.06); }
.cc-child-agent-file strong { color: var(--text-muted); font-size: 10px; font-weight: 650; }
.cc-child-agent-file code {
  min-width: 0;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cc-child-agent-card.live { margin-left: 20px; border-color: transparent; background: transparent; }
.cc-child-agent-card.live .cc-child-agent-head { min-height: 32px; padding: 4px 2px; }
.cc-child-agent-card.live .cc-child-agent-body { padding-left: 25px; }
.cc-child-agent-card.summary .cc-child-agent-body { display: none; }
@media (max-width: 720px) {
  .cc-child-agent-head { grid-template-columns: 18px minmax(0, 1fr) 18px; }
  .cc-child-agent-preview { grid-column: 2; }
  .cc-child-agent-card.live { margin-left: 14px; }
}
</style>
