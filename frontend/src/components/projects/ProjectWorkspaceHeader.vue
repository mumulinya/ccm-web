<script setup>
import { computed, ref } from 'vue'
import { Archive, Bot, ChevronDown, Files, FolderArchive, FolderKanban, MonitorCheck, Pencil, Play, Plus, Settings2, Square, Wrench } from '@lucide/vue'
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
        <span><strong>{{ channelLabel }}{{ connected ? '已连接' : '未连接' }}</strong><small>{{ project.agent || '未配置 Agent' }} · {{ project.session_count || 0 }} 个会话</small></span>
      </div>
      <span v-if="project" class="main-agent-label"><Bot :size="13" />项目主 Agent</span>
    </div>

    <div class="workspace-actions">
      <button
        v-if="connected"
        class="primary stop"
        :disabled="!!busyAction"
        :title="`断开项目${channelLabel}`"
        @click="emit('stop', project)"
      ><Square :size="15" />{{ busyAction === 'stop' ? '正在断开' : `断开${channelLabel}` }}</button>
      <button
        v-else-if="project"
        class="primary"
        :disabled="!!busyAction"
        :title="`连接项目${channelLabel}`"
        @click="emit('start', project)"
      ><Play :size="15" />{{ busyAction === 'start' ? '正在连接' : `连接${channelLabel}` }}</button>

      <button v-if="project" class="tool-shortcut" :class="{ warning: !toolsReady }" title="配置当前项目会话可用的 MCP 与 Skill" @click="emit('tools', project)">
        <Wrench :size="16" /><span>工具</span><small>{{ Number(toolCounts.mcp || 0) + Number(toolCounts.skill || 0) }}</small>
      </button>

      <div v-if="project" class="more-wrap">
        <button class="icon-button menu-trigger" title="更多项目操作" @click="menuOpen = !menuOpen"><Settings2 :size="17" /><ChevronDown :size="13" /></button>
        <div v-if="menuOpen" class="more-menu">
          <button v-if="connected" @click="runAction('switch-agent')"><Bot :size="16" />切换 Agent</button>
          <button @click="runAction('edit')"><Pencil :size="16" />编辑项目</button>
          <button @click="runAction('tools')"><Wrench :size="16" />工具与能力</button>
          <button @click="runAction('test-targets')"><MonitorCheck :size="16" />测试目标</button>
          <button @click="runAction('files')"><Files :size="16" />共享文件</button>
          <button :disabled="!hasSession" @click="runAction('save-knowledge')"><FolderArchive :size="16" />保存会话知识</button>
          <button class="danger" @click="runAction('archive')"><Archive :size="16" />归档项目</button>
        </div>
      </div>

      <button class="icon-button archives" title="归档项目管理" @click="emit('open-archives')"><FolderArchive :size="17" /></button>
      <button class="create" @click="emit('create')"><Plus :size="16" />新建项目</button>
    </div>
  </header>
</template>

<style scoped>
.workspace-header { min-height:66px; display:flex; align-items:center; justify-content:space-between; gap:18px; padding:9px 16px; border-bottom:1px solid var(--border-color); background:var(--surface-nav,var(--surface)); z-index:20; }
.project-context,.workspace-actions { min-width:0; display:flex; align-items:center; gap:9px; }
.tool-shortcut{height:34px;display:inline-flex;align-items:center;gap:6px;padding:0 9px;border:1px solid var(--border-color);border-radius:6px;background:var(--surface-raised);color:var(--text-secondary);font-size:11px}.tool-shortcut:hover{border-color:color-mix(in srgb,var(--accent-blue) 42%,var(--border-color));color:var(--accent-blue)}.tool-shortcut.warning{border-color:color-mix(in srgb,#d97706 38%,var(--border-color));color:#d97706}.tool-shortcut small{min-width:18px;padding:1px 5px;border-radius:5px;background:var(--control-bg);color:var(--text-muted);font-size:9px;text-align:center}
.project-context { flex:1; }
.project-mark { width:36px; height:36px; flex:0 0 auto; display:grid; place-items:center; border:1px solid color-mix(in srgb,var(--accent-blue) 20%,var(--border-color)); border-radius:7px; background:color-mix(in srgb,var(--accent-blue) 7%,var(--surface)); color:var(--accent-blue); }
.project-status { min-width:145px; display:flex; align-items:center; gap:8px; padding-left:10px; border-left:1px solid var(--border-color); }
.project-status > span:last-child { min-width:0; display:grid; gap:2px; }
.project-status strong { color:var(--text-secondary); font-size:11px; white-space:nowrap; }
.project-status small { max-width:190px; overflow:hidden; color:var(--text-muted); font-size:9.5px; text-overflow:ellipsis; white-space:nowrap; }
.main-agent-label { display:inline-flex;align-items:center;gap:5px;padding:5px 7px;border:1px solid color-mix(in srgb,var(--accent-blue) 18%,var(--border-color));border-radius:6px;background:color-mix(in srgb,var(--accent-blue) 6%,var(--surface));color:var(--text-secondary);font-size:10px;font-weight:700;white-space:nowrap; }
.status-dot { width:7px; height:7px; flex:0 0 auto; border-radius:50%; background:#94a3b8; }
.project-status.running .status-dot { background:#16a34a; box-shadow:0 0 0 3px color-mix(in srgb,#16a34a 14%,transparent); }
button { display:inline-flex; align-items:center; justify-content:center; gap:7px; height:34px; border-radius:6px; border:1px solid var(--border-color); background:var(--surface); color:var(--text-primary); cursor:pointer; font-size:11px; font-weight:650; white-space:nowrap; }
button:disabled { opacity:.5; cursor:not-allowed; }
.primary { padding:0 12px; border-color:var(--accent-blue); background:var(--accent-blue); color:white; }
.create { padding:0 11px; color:var(--accent-blue); }
.primary.stop { border-color:var(--accent-red); background:var(--surface-raised); color:var(--accent-red); }
.icon-button { width:34px; padding:0; }
.menu-trigger { width:48px; gap:3px; }
.more-wrap { position:relative; }
.more-menu { position:absolute; top:40px; right:0; width:190px; padding:6px; border:1px solid var(--border-color); border-radius:7px; background:var(--surface); box-shadow:var(--shadow-lg); z-index:40; }
.more-menu button { width:100%; justify-content:flex-start; border:0; background:transparent; padding:0 10px; font-weight:550; }
.more-menu button:hover { background:var(--control-hover); }
.more-menu .danger { color:#dc2626; }
.page-info { max-width:150px; overflow:hidden; color:var(--text-muted); font-size:10px; text-overflow:ellipsis; white-space:nowrap; }
@media (max-width:1050px) { .main-agent-label,.page-info { display:none; } }
@media (max-width:760px) { .workspace-header { min-height:auto; align-items:stretch; flex-direction:column; gap:8px; padding:9px 12px; } .project-context,.workspace-actions { width:100%; } .project-status { display:none; } .workspace-actions { justify-content:flex-end; } .workspace-actions .primary { margin-right:auto; } }
@media (max-width:440px) { .project-mark,.archives { display:none; } .workspace-actions { gap:6px; } .create { width:34px; overflow:hidden; padding:0; font-size:0; gap:0; } .create svg { width:16px; } }
</style>
