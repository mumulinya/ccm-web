<script setup>
import { computed, ref } from 'vue'
import {
  ArrowUpRight,
  Bookmark,
  Bot,
  ChevronDown,
  ChevronUp,
  Copy,
  FileCode2,
  FileText,
  MessageSquare,
  MessagesSquare,
  Music,
  Paperclip,
  Send,
  User,
} from '@lucide/vue'
import SafeHighlightedText from './SafeHighlightedText.vue'

const props = defineProps({
  item: { type: Object, required: true },
  terms: { type: Array, default: () => [] },
  favorite: { type: Boolean, default: false },
})
defineEmits(['open', 'task', 'favorite', 'copy', 'copy-markdown'])

const showContext = ref(false)

const location = computed(() => {
  if (props.item.conversationType === 'global') return '全局助手'
  if (props.item.conversationType === 'group') return props.item.groupName || props.item.groupId || '群聊'
  if (props.item.conversationType === 'music') return '音乐助手'
  if (props.item.conversationType === 'feishu') return '飞书协作'
  return props.item.project || '未命名项目'
})

const sourceIcon = computed(() => {
  switch (props.item.conversationType) {
    case 'global': return Bot
    case 'group': return MessagesSquare
    case 'music': return Music
    case 'feishu': return Send
    default: return MessageSquare
  }
})

const sourceThemeClass = computed(() => {
  switch (props.item.conversationType) {
    case 'global': return 'source-global'
    case 'group': return 'source-group'
    case 'music': return 'source-music'
    case 'feishu': return 'source-feishu'
    default: return 'source-project'
  }
})

const roleLabel = computed(() => props.item.role === 'user' ? '用户' : props.item.role === 'assistant' ? props.item.agent || 'Agent' : '系统')

const snippet = computed(() => {
  const content = String(props.item.content || '')
  if (content.length <= 360) return content
  const indexes = props.terms.map(term => content.toLowerCase().indexOf(String(term).toLowerCase())).filter(index => index >= 0)
  const start = indexes.length ? Math.max(0, Math.min(...indexes) - 100) : 0
  return `${start ? '...' : ''}${content.slice(start, start + 360)}${start + 360 < content.length ? '...' : ''}`
})

const formatTime = (value) => {
  if (!value) return '时间未记录'
  const date = new Date(value)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
</script>

<template>
  <article class="search-result-card">
    <!-- 卡片头部元数据 -->
    <header class="card-header">
      <div class="result-identity">
        <span class="source-badge" :class="sourceThemeClass">
          <component :is="sourceIcon" :size="11" />
          {{ item.sourceLabel || location }}
        </span>
        <strong class="location-name">{{ location }}</strong>
        <span v-if="item.sessionName" class="session-crumb" :title="item.sessionName">/ {{ item.sessionName }}</span>
      </div>
      <time class="time-stamp">{{ formatTime(item.timestamp) }}</time>
    </header>

    <!-- 角色与正文 -->
    <div class="card-body">
      <div class="role-indicator">
        <span class="role-pill" :class="item.role">
          <User v-if="item.role === 'user'" :size="10" />
          <Bot v-else-if="item.role === 'assistant'" :size="10" />
          <span v-else class="system-dot"></span>
          {{ roleLabel }}
        </span>
      </div>
      <button class="message-preview-btn" title="点击进入此会话" @click="$emit('open', item)">
        <SafeHighlightedText :text="snippet" :terms="terms" />
      </button>
    </div>

    <!-- 关联任务与附件 -->
    <div v-if="item.taskId || item.attachments?.length" class="relations-bar">
      <button v-if="item.taskId" type="button" class="relation-chip task-chip" @click="$emit('task', item)">
        <FileText :size="11" />
        <span>{{ item.taskTitle || item.taskId }}</span>
      </button>
      <span v-for="attachment in item.attachments || []" :key="attachment.name" class="relation-chip attachment-chip">
        <Paperclip :size="11" />
        <span>{{ attachment.name }}</span>
      </span>
    </div>

    <!-- 前后文折叠展开（气泡流水线） -->
    <div v-if="item.context?.before?.length || item.context?.after?.length" class="context-section">
      <button type="button" class="context-toggle-btn" @click="showContext = !showContext">
        <span>{{ showContext ? '收起前后文' : '查看前后文' }}</span>
        <ChevronUp v-if="showContext" :size="12" />
        <ChevronDown v-else :size="12" />
      </button>

      <div v-if="showContext" class="context-stream">
        <div
          v-for="row in item.context.before || []"
          :key="`before-${row.messageId}-${row.timestamp}`"
          class="context-msg before"
        >
          <span class="ctx-role">{{ row.role === 'user' ? '用户' : row.agent || 'Agent' }}</span>
          <p class="ctx-text">{{ row.content }}</p>
        </div>

        <div class="context-msg current-msg">
          <span class="ctx-role">{{ roleLabel }}</span>
          <p class="ctx-text"><SafeHighlightedText :text="snippet" :terms="terms" /></p>
        </div>

        <div
          v-for="row in item.context.after || []"
          :key="`after-${row.messageId}-${row.timestamp}`"
          class="context-msg after"
        >
          <span class="ctx-role">{{ row.role === 'user' ? '用户' : row.agent || 'Agent' }}</span>
          <p class="ctx-text">{{ row.content }}</p>
        </div>
      </div>
    </div>

    <!-- 卡片底部动作栏 -->
    <footer class="card-footer">
      <button type="button" class="open-session-btn" @click="$emit('open', item)">
        <span>进入会话</span>
        <ArrowUpRight :size="13" />
      </button>
      <div class="action-buttons">
        <button
          type="button"
          class="action-btn"
          :class="{ 'is-favorite': favorite }"
          :title="favorite ? '取消收藏' : '收藏消息'"
          @click="$emit('favorite', item)"
        >
          <Bookmark :size="13" :fill="favorite ? 'currentColor' : 'none'" />
          <span>{{ favorite ? '已收藏' : '收藏' }}</span>
        </button>
        <button type="button" class="action-btn" title="复制消息文本" @click="$emit('copy', item)">
          <Copy :size="12" />
          <span>复制</span>
        </button>
        <button type="button" class="action-btn" title="复制为 Markdown" @click="$emit('copy-markdown', item)">
          <FileCode2 :size="12" />
          <span>Markdown</span>
        </button>
      </div>
    </footer>
  </article>
</template>

<style scoped>
.search-result-card {
  padding: 14px 16px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.15s ease;
}

.search-result-card:hover {
  border-color: color-mix(in srgb, var(--accent-blue) 35%, var(--border-color));
  box-shadow: var(--shadow-md, 0 4px 14px rgba(0, 0, 0, 0.05));
}

/* 头部信息 */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.result-identity {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.source-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  line-height: 1.2;
  flex-shrink: 0;
}

.source-badge.source-global { background: rgba(37, 99, 235, 0.1); color: var(--accent-blue, #2563eb); }
.source-badge.source-group { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.source-badge.source-project { background: rgba(245, 158, 11, 0.1); color: #d97706; }
.source-badge.source-music { background: rgba(236, 72, 153, 0.1); color: #ec4899; }
.source-badge.source-feishu { background: rgba(16, 185, 129, 0.1); color: #10b981; }

.location-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-crumb {
  font-size: 11.5px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time-stamp {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--font-mono, monospace);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

/* 主体内容 */
.card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.role-indicator {
  display: flex;
  align-items: center;
}

.role-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 1px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}

.role-pill.user { background: rgba(37, 99, 235, 0.08); color: var(--accent-blue, #2563eb); }
.role-pill.assistant { background: rgba(16, 185, 129, 0.08); color: var(--accent-green, #10b981); }
.role-pill.system { background: var(--panel-muted); color: var(--text-muted); }
.system-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--text-muted); }

.message-preview-btn {
  display: block;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: var(--panel-muted, rgba(148, 163, 184, 0.05));
  color: var(--text-secondary);
  font-size: 12.5px;
  line-height: 1.6;
  text-align: left;
  white-space: pre-wrap;
  word-break: break-word;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.message-preview-btn:hover {
  background: var(--accent-soft, rgba(37, 99, 235, 0.06));
  border-color: color-mix(in srgb, var(--accent-blue) 20%, transparent);
  color: var(--text-primary);
}

/* 关联项 */
.relations-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.relation-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 5px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  font-size: 11px;
  color: var(--text-secondary);
  max-width: 100%;
}

.relation-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-chip {
  color: var(--accent-blue);
  cursor: pointer;
  transition: border-color 0.15s ease;
}

.task-chip:hover {
  border-color: var(--accent-blue);
}

/* 前后文流水线 */
.context-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.context-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  padding: 2px 0;
  width: fit-content;
}

.context-toggle-btn:hover {
  color: var(--accent-blue);
}

.context-stream {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
}

.context-msg {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr);
  gap: 8px;
  padding: 4px 6px;
  border-radius: 4px;
  font-size: 11.5px;
  line-height: 1.45;
}

.context-msg.current-msg {
  background: rgba(37, 99, 235, 0.08);
  border-left: 2px solid var(--accent-blue);
  font-weight: 500;
}

.ctx-role {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
}

.ctx-text {
  margin: 0;
  color: var(--text-secondary);
  word-break: break-word;
}

/* 底部操作 */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 6px;
  border-top: 1px solid var(--border-color);
}

.open-session-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--accent-blue) 40%, var(--border-color));
  background: var(--accent-soft, rgba(37, 99, 235, 0.08));
  color: var(--accent-blue);
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.open-session-btn:hover {
  background: var(--accent-blue);
  color: #fff;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 5px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: var(--panel-muted);
  color: var(--text-primary);
  border-color: var(--border-color);
}

.action-btn.is-favorite {
  color: #d97706;
  background: rgba(245, 158, 11, 0.1);
}

@media (max-width: 640px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .card-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
  }
  .open-session-btn {
    justify-content: center;
  }
  .action-buttons {
    justify-content: flex-end;
  }
}
</style>
