<script setup>
import { computed } from 'vue'
import SafeHighlightedText from './SafeHighlightedText.vue'

const props = defineProps({ item: { type: Object, required: true }, terms: { type: Array, default: () => [] }, favorite: { type: Boolean, default: false } })
defineEmits(['open', 'task', 'favorite', 'copy', 'copy-markdown'])

const location = computed(() => props.item.conversationType === 'global' ? '全局助手' : props.item.conversationType === 'group' ? props.item.groupName || props.item.groupId : props.item.project)
const roleLabel = computed(() => props.item.role === 'user' ? '你' : props.item.role === 'assistant' ? props.item.agent || 'Agent' : '系统')
const snippet = computed(() => {
  const content = String(props.item.content || '')
  if (content.length <= 360) return content
  const indexes = props.terms.map(term => content.toLowerCase().indexOf(String(term).toLowerCase())).filter(index => index >= 0)
  const start = indexes.length ? Math.max(0, Math.min(...indexes) - 100) : 0
  return `${start ? '...' : ''}${content.slice(start, start + 360)}${start + 360 < content.length ? '...' : ''}`
})
const formatTime = value => value ? new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '时间未记录'
</script>

<template>
  <article class="search-result-row">
    <header>
      <div class="result-identity">
        <span class="source-label">{{ item.sourceLabel }}</span>
        <strong>{{ location }}</strong>
        <span>{{ item.sessionName }}</span>
      </div>
      <time>{{ formatTime(item.timestamp) }}</time>
    </header>
    <div class="role-line"><span :class="['role-dot', item.role]"></span><strong>{{ roleLabel }}</strong></div>
    <button class="message-preview" @click="$emit('open', item)"><SafeHighlightedText :text="snippet" :terms="terms" /></button>

    <div v-if="item.taskId || item.attachments?.length" class="relations">
      <button v-if="item.taskId" class="relation-button" @click="$emit('task', item)">任务 · {{ item.taskTitle || item.taskId }}</button>
      <span v-for="attachment in item.attachments || []" :key="attachment.name" class="attachment-chip">附件 · {{ attachment.name }}</span>
    </div>

    <details v-if="item.context?.before?.length || item.context?.after?.length" class="context-details">
      <summary>查看前后文</summary>
      <div class="context-list">
        <p v-for="row in item.context.before || []" :key="`before-${row.messageId}-${row.timestamp}`"><strong>{{ row.role === 'user' ? '你' : row.agent || 'Agent' }}</strong><span>{{ row.content }}</span></p>
        <p class="current"><strong>{{ roleLabel }}</strong><span>{{ snippet }}</span></p>
        <p v-for="row in item.context.after || []" :key="`after-${row.messageId}-${row.timestamp}`"><strong>{{ row.role === 'user' ? '你' : row.agent || 'Agent' }}</strong><span>{{ row.content }}</span></p>
      </div>
    </details>

    <footer>
      <button class="open-button" @click="$emit('open', item)">进入会话</button>
      <div>
        <button class="icon-action" :title="favorite ? '取消收藏' : '收藏消息'" :aria-label="favorite ? '取消收藏' : '收藏消息'" @click="$emit('favorite', item)">{{ favorite ? '★' : '☆' }}</button>
        <button class="text-action" @click="$emit('copy', item)">复制</button>
        <button class="text-action" @click="$emit('copy-markdown', item)">Markdown</button>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.search-result-row { min-width: 0; padding: 14px 4px 13px; border-bottom: 1px solid var(--border-color); }
header, footer, .result-identity, footer > div, .relations, .role-line { display: flex; align-items: center; }
header { justify-content: space-between; gap: 12px; }
.result-identity { min-width: 0; gap: 7px; color: var(--text-muted); font-size: 11px; }
.result-identity strong { overflow: hidden; color: var(--text-primary); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.source-label { flex: 0 0 auto; padding: 2px 6px; border: 1px solid var(--border-color); border-radius: 4px; color: var(--accent-blue); }
time { flex: 0 0 auto; color: var(--text-muted); font-size: 10.5px; }
.role-line { gap: 6px; margin-top: 9px; font-size: 11px; }
.role-dot { width: 7px; height: 7px; border-radius: 50%; background: #94a3b8; }
.role-dot.user { background: #3b82f6; }.role-dot.assistant { background: #22c55e; }
.message-preview { display: block; width: 100%; margin-top: 7px; padding: 0; border: 0; background: transparent; color: var(--text-secondary); font: inherit; font-size: 12.5px; line-height: 1.65; text-align: left; white-space: pre-wrap; overflow-wrap: anywhere; cursor: pointer; }
.relations { flex-wrap: wrap; gap: 6px; margin-top: 9px; }
.relation-button, .attachment-chip { max-width: 100%; padding: 3px 7px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-secondary); color: var(--text-secondary); font: inherit; font-size: 10.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.relation-button { color: var(--accent-blue); cursor: pointer; }
.context-details { margin-top: 9px; }
.context-details summary { color: var(--text-muted); font-size: 10.5px; font-weight: 700; cursor: pointer; }
.context-list { display: grid; gap: 0; margin-top: 7px; border-left: 2px solid var(--border-color); }
.context-list p { display: grid; grid-template-columns: 80px minmax(0, 1fr); gap: 8px; margin: 0; padding: 6px 9px; color: var(--text-muted); font-size: 10.5px; line-height: 1.5; }
.context-list p.current { background: color-mix(in srgb, var(--accent-blue) 6%, transparent); color: var(--text-secondary); }
.context-list span { overflow-wrap: anywhere; }
footer { justify-content: space-between; gap: 12px; margin-top: 10px; }
footer > div { gap: 3px; }
footer button { min-height: 28px; border: 0; background: transparent; color: var(--text-muted); font: inherit; font-size: 10.5px; cursor: pointer; }
.open-button { padding: 4px 9px; border: 1px solid var(--border-color) !important; border-radius: 5px; color: var(--accent-blue) !important; font-weight: 700 !important; }
.icon-action { width: 28px; padding: 0; font-size: 16px !important; }
.text-action { padding: 4px 6px; }
@media (max-width: 640px) {
  header { align-items: flex-start; }
  .result-identity { flex-wrap: wrap; }
  .result-identity > span:last-child { flex-basis: 100%; }
  .context-list p { grid-template-columns: 60px minmax(0, 1fr); }
}
</style>
