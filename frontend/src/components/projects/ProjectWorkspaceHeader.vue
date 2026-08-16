<script setup>
import { computed, ref } from 'vue'
import { Archive, Bot, Ellipsis, Files, FolderArchive, FolderKanban, MonitorCheck, Pencil, Play, Plus, Square, Wrench } from '@lucide/vue'
import ProjectGroupedSelector from './ProjectGroupedSelector.vue'

const props = defineProps({
  projects: { type: Array, default: () => [] },
  modelValue: { type: String, default: '' },
  pageInfo: { type: String, default: '' },
  busyAction: { type: String, default: '' },
  hasSession: { type: Boolean, default: false },
  toolCounts: { type: Object, default: () => ({ mcp: 0, skill: 0 }) },
  toolsReady: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue', 'select', 'start', 'stop', 'switch-agent', 'edit', 'tools', 'test-targets', 'files', 'save-knowledge', 'archive', 'open-archives', 'create'])
const menuOpen = ref(false)
const project = computed(() => props.projects.find((item) => item.name === props.modelValue) || null)
const connected = computed(() => project.value?.agent_connection?.running || project.value?.running)
const channelLabel = computed(() => {
  const platform = String(project.value?.platform || '').trim().toLowerCase()
  return {
    feishu: '飞书通道',
    '飞书': '飞书通道',
    lark: 'Lark 通道',
    'lark 通道': 'Lark 通道',
    weixin: '微信通道',
    telegram: 'Telegram 通道',
    slack: 'Slack 通道',
    discord: 'Discord 通道',
  }[platform] || '协作通道'
})
const chooseProject = name => {
  menuOpen.value = false
  emit('update:modelValue', name)
  emit('select', name)
}
const runAction = (name) => {
  menuOpen.value = false
  emit(name, project.value)
}
</script>

<template>
  <header class="workspace-header">
    <div class="project-context">
      <span class="project-mark"><FolderKanban :size="18" /></span>
      <ProjectGroupedSelector :projects="projects" :model-value="modelValue" @select="chooseProject" />
      <div v-if="project" :class="['project-status', connected ? 'running' : 'stopped']">
        <span class="status-dot"></span>
        <span><strong>{{ connected ? `${channelLabel}已连接` : `${channelLabel}未连接` }}</strong><small>{{ project.session_count || 0 }} 个会话</small></span>
      </div>
    </div>

    <div class="workspace-actions">
      <button
        v-if="connected"
        class="channel-action stop"
        :disabled="!!busyAction"
        :title="`断开项目${channelLabel}`"
        @click="emit('stop', project)"
      ><Square :size="14" />{{ busyAction === 'stop' ? '正在断开' : `断开${channelLabel}` }}</button>
      <button
        v-else-if="project"
        class="channel-action"
        :disabled="!!busyAction"
        :title="`连接项目${channelLabel}`"
        @click="emit('start', project)"
      ><Play :size="14" />{{ busyAction === 'start' ? '正在连接' : `连接${channelLabel}` }}</button>

      <div v-if="project" class="more-wrap">
        <button class="icon-button menu-trigger" title="更多项目操作" aria-label="更多项目操作" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen"><Ellipsis :size="18" /></button>
        <div v-if="menuOpen" class="more-menu">
          <button v-if="connected" @click="runAction('switch-agent')"><Bot :size="16" />切换 Agent</button>
          <button @click="runAction('edit')"><Pencil :size="16" />编辑项目</button>
          <button :class="{ warning: !toolsReady }" @click="runAction('tools')"><Wrench :size="16" />工具与能力 <small>{{ Number(toolCounts.mcp || 0) + Number(toolCounts.skill || 0) }}</small></button>
          <button @click="runAction('test-targets')"><MonitorCheck :size="16" />测试目标</button>
          <button @click="runAction('files')"><Files :size="16" />共享文件</button>
          <button :disabled="!hasSession" @click="runAction('save-knowledge')"><FolderArchive :size="16" />保存会话知识</button>
          <span class="menu-divider"></span>
          <button @click="menuOpen = false; emit('open-archives')"><FolderArchive :size="16" />归档项目管理</button>
          <button @click="menuOpen = false; emit('create')"><Plus :size="16" />新建项目</button>
          <button class="danger" @click="runAction('archive')"><Archive :size="16" />归档项目</button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.workspace-header {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 6px 18px;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface, var(--bg-card));
  z-index: 20;
}

.project-context, .workspace-actions {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.project-context { flex: 1; }

.project-mark {
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--accent-blue) 20%, var(--border-color));
  border-radius: 8px;
  background: var(--accent-soft);
  color: var(--accent-blue);
}

.project-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.project-status > span:last-child { min-width: 0; display: grid; gap: 1px; }
.project-status strong { color: var(--text-secondary); font-size: 11px; font-weight: 600; white-space: nowrap; }
.project-status small { display: none; }

.status-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #94a3b8;
}

.project-status.running .status-dot {
  background: var(--accent-green, #10b981);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-green, #10b981) 18%, transparent);
}

button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--surface);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.15s ease;
}

button:disabled { opacity: 0.5; cursor: not-allowed; }

.channel-action {
  padding: 0 12px;
  border-color: color-mix(in srgb, var(--accent-blue) 24%, var(--border-color));
  background: var(--surface);
  color: var(--accent-blue);
}

.channel-action:hover {
  border-color: var(--accent-blue);
  background: var(--accent-soft);
}

.channel-action.stop {
  border-color: color-mix(in srgb, var(--accent-red, #ef4444) 28%, var(--border-color));
  color: var(--accent-red, #ef4444);
}

.channel-action.stop:hover {
  background: rgba(239, 68, 68, 0.08);
}

.icon-button { width: 32px; padding: 0; }
.menu-trigger { width: 32px; }

.more-wrap { position: relative; }
.more-menu {
  position: absolute;
  top: 38px;
  right: 0;
  width: 210px;
  padding: 5px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface, #fff);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
  z-index: 40;
}

.more-menu button {
  width: 100%;
  justify-content: flex-start;
  border: 0;
  background: transparent;
  padding: 0 10px;
  font-weight: 500;
  border-radius: 5px;
}

.more-menu button:hover { background: var(--control-hover, rgba(148, 163, 184, 0.08)); }
.more-menu button small {
  margin-left: auto;
  padding: 1px 5px;
  border-radius: 999px;
  background: var(--panel-muted);
  color: var(--text-muted);
  font-size: 9.5px;
  font-family: var(--font-mono, monospace);
}

.more-menu button.warning { color: #d97706; }
.menu-divider { display: block; height: 1px; margin: 4px 4px; background: var(--border-color); }
.more-menu .danger { color: var(--accent-red, #ef4444); }

.page-info {
  max-width: 150px;
  overflow: hidden;
  color: var(--text-muted);
  font-size: 10.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1050px) { .page-info { display: none; } }
@media (max-width: 760px) {
  .workspace-header { min-height: auto; align-items: stretch; flex-direction: column; gap: 8px; padding: 8px 12px; }
  .project-context, .workspace-actions { width: 100%; }
  .project-status { display: none; }
  .workspace-actions { justify-content: flex-end; }
  .workspace-actions .primary { margin-right: auto; }
}
@media (max-width: 520px) {
  .project-mark, .project-status { display: none; }
  .workspace-actions { gap: 6px; }
  .channel-action { width: 32px; overflow: hidden; padding: 0; font-size: 0; gap: 0; }
  .channel-action svg { width: 15px; }
}
</style>
