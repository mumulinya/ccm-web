<script setup>
import { computed, ref } from 'vue'
import { Archive, Bot, ChevronDown, Files, FolderArchive, Pencil, Play, Plus, Settings2, Square, Wrench } from '@lucide/vue'

const props = defineProps({
  projects: { type: Array, default: () => [] },
  modelValue: { type: String, default: '' },
  pageInfo: { type: String, default: '' },
  busyAction: { type: String, default: '' },
  hasSession: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'select', 'start', 'stop', 'switch-agent', 'edit', 'tools', 'files', 'save-knowledge', 'archive', 'open-archives', 'create'])
const menuOpen = ref(false)
const project = computed(() => props.projects.find((item) => item.name === props.modelValue) || null)
const runAction = (name) => {
  menuOpen.value = false
  emit(name, project.value)
}
const selectProject = (event) => {
  emit('update:modelValue', event.target.value)
  emit('select', event.target.value)
}
</script>

<template>
  <header class="workspace-header">
    <div class="project-identity">
      <label for="project-workspace-select">项目</label>
      <select id="project-workspace-select" :value="modelValue" @change="selectProject">
        <option value="">选择项目...</option>
        <option v-for="item in projects" :key="item.name" :value="item.name">{{ item.running ? '运行中 · ' : '' }}{{ item.name }}</option>
      </select>
      <span v-if="project" :class="['status', project.running ? 'running' : 'stopped']">
        <span class="status-dot"></span>{{ project.running ? 'Agent 运行中' : 'Agent 已停止' }}
      </span>
    </div>

    <div class="workspace-actions">
      <button
        v-if="project?.running"
        class="primary stop"
        :disabled="!!busyAction"
        title="停止项目 Agent"
        @click="emit('stop', project)"
      ><Square :size="15" />{{ busyAction === 'stop' ? '正在停止' : '停止 Agent' }}</button>
      <button
        v-else-if="project"
        class="primary"
        :disabled="!!busyAction"
        title="启动项目 Agent"
        @click="emit('start', project)"
      ><Play :size="15" />{{ busyAction === 'start' ? '正在启动' : '启动 Agent' }}</button>

      <div v-if="project" class="more-wrap">
        <button class="icon-button" title="更多项目操作" @click="menuOpen = !menuOpen"><Settings2 :size="18" /><ChevronDown :size="14" /></button>
        <div v-if="menuOpen" class="more-menu">
          <button v-if="project.running" @click="runAction('switch-agent')"><Bot :size="16" />切换 Agent</button>
          <button @click="runAction('edit')"><Pencil :size="16" />编辑项目</button>
          <button @click="runAction('tools')"><Wrench :size="16" />工具与能力</button>
          <button @click="runAction('files')"><Files :size="16" />共享文件</button>
          <button :disabled="!hasSession" @click="runAction('save-knowledge')"><FolderArchive :size="16" />保存会话知识</button>
          <button class="danger" @click="runAction('archive')"><Archive :size="16" />归档项目</button>
        </div>
      </div>

      <button class="icon-button archives" title="归档项目管理" @click="emit('open-archives')"><FolderArchive :size="18" /></button>
      <button class="create" @click="emit('create')"><Plus :size="16" />新建项目</button>
      <span class="page-info">{{ pageInfo }}</span>
    </div>
  </header>
</template>

<style scoped>
.workspace-header { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:12px 20px; border-bottom:1px solid rgba(15,23,42,.08); background:color-mix(in srgb,var(--surface,#fff) 92%,transparent); z-index:20; }
.project-identity,.workspace-actions { display:flex; align-items:center; gap:10px; min-width:0; }
label { font-size:12px; color:var(--text-muted); font-weight:700; }
select { min-width:180px; max-width:300px; height:36px; padding:0 32px 0 11px; border:1px solid rgba(15,23,42,.12); border-radius:7px; background:var(--surface,#fff); color:var(--text-primary); }
.status { display:inline-flex; align-items:center; gap:6px; white-space:nowrap; font-size:12px; color:var(--text-muted); }
.status-dot { width:7px; height:7px; border-radius:50%; background:#94a3b8; }
.status.running .status-dot { background:#16a34a; box-shadow:0 0 0 3px rgba(22,163,74,.12); }
button { display:inline-flex; align-items:center; justify-content:center; gap:7px; height:36px; border-radius:7px; border:1px solid rgba(15,23,42,.1); background:var(--surface,#fff); color:var(--text-primary); cursor:pointer; font-weight:650; white-space:nowrap; }
button:disabled { opacity:.5; cursor:not-allowed; }
.primary,.create { padding:0 13px; border-color:#2563eb; background:#2563eb; color:white; }
.primary.stop { border-color:#dc2626; background:#fff; color:#dc2626; }
.icon-button { width:42px; padding:0; }
.more-wrap { position:relative; }
.more-menu { position:absolute; top:42px; right:0; width:190px; padding:6px; border:1px solid rgba(15,23,42,.12); border-radius:8px; background:var(--surface,#fff); box-shadow:0 14px 34px rgba(15,23,42,.16); z-index:40; }
.more-menu button { width:100%; justify-content:flex-start; border:0; background:transparent; padding:0 10px; font-weight:550; }
.more-menu button:hover { background:rgba(37,99,235,.07); }
.more-menu .danger { color:#dc2626; }
.page-info { font-size:12px; color:var(--text-muted); white-space:nowrap; }
@media (max-width:900px) { .workspace-header { align-items:flex-start; flex-direction:column; } .project-identity,.workspace-actions { width:100%; } .workspace-actions { flex-wrap:wrap; } .page-info { margin-left:auto; } }
@media (max-width:520px) { .workspace-header { padding:10px 12px; } .project-identity { display:grid; grid-template-columns:auto minmax(0,1fr); } .project-identity .status { grid-column:2; } select { min-width:0; width:100%; } .workspace-actions { gap:7px; } .page-info { display:none; } .create { margin-left:auto; } }
</style>
