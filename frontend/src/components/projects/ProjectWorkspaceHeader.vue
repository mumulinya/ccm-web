<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { Archive, Bot, Check, ChevronDown, ChevronRight, Files, Folder, FolderArchive, FolderKanban, FolderPlus, MonitorCheck, Pencil, Play, Plus, Search, Settings2, Square, Trash2, Wrench } from '@lucide/vue'
import { confirmDialog, toast } from '../../utils/toast.js'
import { subscribeRuntimeEvents } from '../../utils/runtimeEventBus.js'

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
const selectorOpen = ref(false)
const selectorRoot = ref(null)
const searchQuery = ref('')
const organizeMode = ref(false)
const folderBusy = ref(false)
const folders = ref([])
const assignments = ref({})
const collapsedFolders = ref([])
const creatingFolder = ref(false)
const newFolderName = ref('')
const editingFolderId = ref('')
const editingFolderName = ref('')
const project = computed(() => props.projects.find((item) => item.name === props.modelValue) || null)
const connected = computed(() => project.value?.agent_connection?.running || project.value?.running)
const projectLabel = item => item?.display_name || item?.name || '选择项目...'
const currentFolder = computed(() => folders.value.find(item => item.id === assignments.value[props.modelValue]) || null)
const normalizedSearch = computed(() => searchQuery.value.trim().toLowerCase())
const visibleProjects = computed(() => props.projects.filter(item => {
  const query = normalizedSearch.value
  return !query || `${projectLabel(item)} ${item.name || ''}`.toLowerCase().includes(query)
}))
const folderGroups = computed(() => folders.value.map(folder => ({
  ...folder,
  projects: visibleProjects.value.filter(item => assignments.value[item.name] === folder.id),
})).filter(folder => folder.projects.length || !normalizedSearch.value))
const ungroupedProjects = computed(() => visibleProjects.value.filter(item => !folders.value.some(folder => folder.id === assignments.value[item.name])))
const isCollapsed = id => collapsedFolders.value.includes(id)
const persistCollapsed = () => localStorage.setItem('ccm:project-folders:collapsed', JSON.stringify(collapsedFolders.value))
const toggleFolder = id => {
  collapsedFolders.value = isCollapsed(id) ? collapsedFolders.value.filter(item => item !== id) : [...collapsedFolders.value, id]
  persistCollapsed()
}
const loadFolders = async () => {
  const response = await fetch('/api/projects/folders', { cache: 'no-store' })
  const data = await response.json()
  if (!response.ok || data.success === false) throw new Error(data.error || '读取项目文件夹失败')
  folders.value = data.folders || []
  assignments.value = data.assignments || {}
}
const mutateFolders = async payload => {
  folderBusy.value = true
  try {
    const response = await fetch('/api/projects/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '更新项目文件夹失败')
    folders.value = data.folders || []
    assignments.value = data.assignments || {}
    return data
  } catch (error) {
    toast.error(error?.message || '更新项目文件夹失败')
    return null
  } finally {
    folderBusy.value = false
  }
}
const openSelector = () => {
  selectorOpen.value = !selectorOpen.value
  menuOpen.value = false
  if (selectorOpen.value) nextTick(() => selectorRoot.value?.querySelector('input[type="search"]')?.focus())
}
const chooseProject = name => {
  selectorOpen.value = false
  searchQuery.value = ''
  emit('update:modelValue', name)
  emit('select', name)
}
const submitNewFolder = async () => {
  const name = newFolderName.value.trim()
  if (!name || folderBusy.value) return
  const saved = await mutateFolders({ action: 'create', name })
  if (!saved) return
  newFolderName.value = ''
  creatingFolder.value = false
}
const beginRenameFolder = folder => {
  editingFolderId.value = folder.id
  editingFolderName.value = folder.name
  nextTick(() => selectorRoot.value?.querySelector('.folder-rename-input')?.focus())
}
const submitRenameFolder = async () => {
  const name = editingFolderName.value.trim()
  if (!name || !editingFolderId.value || folderBusy.value) return
  const saved = await mutateFolders({ action: 'rename', folder_id: editingFolderId.value, name })
  if (!saved) return
  editingFolderId.value = ''
  editingFolderName.value = ''
}
const deleteFolder = async folder => {
  if (!await confirmDialog(`删除文件夹“${folder.name}”？其中的项目会移回未分组，项目本身不会删除。`)) return
  await mutateFolders({ action: 'delete', folder_id: folder.id })
}
const assignProject = async (projectName, folderId) => {
  await mutateFolders({ action: 'assign', project: projectName, folder_id: folderId || '' })
}
const runAction = (name) => {
  menuOpen.value = false
  emit(name, project.value)
}
const closeOnOutside = event => {
  if (selectorOpen.value && selectorRoot.value && !selectorRoot.value.contains(event.target)) selectorOpen.value = false
}
let unsubscribeFolders = null
onMounted(() => {
  try { collapsedFolders.value = JSON.parse(localStorage.getItem('ccm:project-folders:collapsed') || '[]') } catch {}
  void loadFolders().catch(() => {})
  document.addEventListener('pointerdown', closeOnOutside)
  unsubscribeFolders = subscribeRuntimeEvents(['project'], event => {
    if (event?.type === 'project.folder.changed') void loadFolders().catch(() => {})
  })
})
onUnmounted(() => {
  document.removeEventListener('pointerdown', closeOnOutside)
  unsubscribeFolders?.()
})
</script>

<template>
  <header class="workspace-header">
    <div class="project-context">
      <span class="project-mark"><FolderKanban :size="18" /></span>
      <div ref="selectorRoot" class="project-selector">
        <span>当前项目</span>
        <button type="button" class="project-selector-trigger" :aria-expanded="selectorOpen" @click="openSelector">
          <span><small v-if="currentFolder">{{ currentFolder.name }}</small><strong>{{ projectLabel(project) }}</strong></span>
          <ChevronDown :size="14" />
        </button>
        <div v-if="selectorOpen" class="project-picker" @keydown.esc="selectorOpen = false">
          <div class="project-picker-search"><Search :size="14" /><input v-model="searchQuery" type="search" placeholder="搜索项目" /></div>
          <div class="project-picker-list">
            <section v-for="folder in folderGroups" :key="folder.id" class="project-folder-group">
              <div class="project-folder-heading">
                <button type="button" class="folder-toggle" @click="toggleFolder(folder.id)">
                  <ChevronRight :size="14" :class="{ expanded: !isCollapsed(folder.id) }" /><Folder :size="15" /><strong>{{ folder.name }}</strong><small>{{ folder.projects.length }}</small>
                </button>
                <template v-if="organizeMode">
                  <button type="button" title="重命名文件夹" @click="beginRenameFolder(folder)"><Pencil :size="13" /></button>
                  <button type="button" title="删除文件夹" @click="deleteFolder(folder)"><Trash2 :size="13" /></button>
                </template>
              </div>
              <form v-if="editingFolderId === folder.id" class="folder-rename" @submit.prevent="submitRenameFolder">
                <input v-model="editingFolderName" class="folder-rename-input" maxlength="40" @keydown.esc="editingFolderId = ''" />
                <button type="submit" title="保存名称"><Check :size="14" /></button>
              </form>
              <div v-if="!isCollapsed(folder.id)" class="project-folder-items">
                <div v-for="item in folder.projects" :key="item.name" :class="['project-picker-row', { active: item.name === modelValue }]">
                  <button type="button" class="project-picker-select" @click="chooseProject(item.name)">
                    <span class="project-row-icon"><FolderKanban :size="14" /></span><span><strong>{{ projectLabel(item) }}</strong><small>{{ item.name }} · {{ item.agent || '未配置 Agent' }}</small></span><i :class="{ running: item.agent_connection?.running || item.running }"></i>
                  </button>
                  <select v-if="organizeMode" :value="assignments[item.name] || ''" aria-label="移动项目到文件夹" @change="assignProject(item.name, $event.target.value)">
                    <option value="">未分组</option><option v-for="target in folders" :key="target.id" :value="target.id">{{ target.name }}</option>
                  </select>
                </div>
              </div>
            </section>
            <section v-if="ungroupedProjects.length || !folders.length" class="project-folder-group ungrouped">
              <div class="project-folder-heading"><button type="button" class="folder-toggle" @click="toggleFolder('__ungrouped')"><ChevronRight :size="14" :class="{ expanded: !isCollapsed('__ungrouped') }" /><FolderArchive :size="15" /><strong>未分组</strong><small>{{ ungroupedProjects.length }}</small></button></div>
              <div v-if="!isCollapsed('__ungrouped')" class="project-folder-items">
                <div v-for="item in ungroupedProjects" :key="item.name" :class="['project-picker-row', { active: item.name === modelValue }]">
                  <button type="button" class="project-picker-select" @click="chooseProject(item.name)"><span class="project-row-icon"><FolderKanban :size="14" /></span><span><strong>{{ projectLabel(item) }}</strong><small>{{ item.name }} · {{ item.agent || '未配置 Agent' }}</small></span><i :class="{ running: item.agent_connection?.running || item.running }"></i></button>
                  <select v-if="organizeMode" :value="''" aria-label="移动项目到文件夹" @change="assignProject(item.name, $event.target.value)"><option value="">未分组</option><option v-for="target in folders" :key="target.id" :value="target.id">{{ target.name }}</option></select>
                </div>
              </div>
            </section>
            <div v-if="!visibleProjects.length" class="project-picker-empty">没有匹配的项目</div>
          </div>
          <form v-if="creatingFolder" class="project-folder-create" @submit.prevent="submitNewFolder"><FolderPlus :size="15" /><input v-model="newFolderName" maxlength="40" placeholder="文件夹名称" autofocus /><button type="submit" :disabled="folderBusy" title="创建文件夹"><Check :size="15" /></button></form>
          <footer class="project-picker-footer">
            <button type="button" @click="creatingFolder = !creatingFolder"><FolderPlus :size="14" />新建文件夹</button>
            <button type="button" :class="{ active: organizeMode }" @click="organizeMode = !organizeMode"><Settings2 :size="14" />{{ organizeMode ? '完成整理' : '整理项目' }}</button>
          </footer>
        </div>
      </div>
      <div v-if="project" :class="['project-status', connected ? 'running' : 'stopped']">
        <span class="status-dot"></span>
        <span><strong>{{ connected ? '协作已连接' : '协作未连接' }}</strong><small>{{ project.agent || '未配置 Agent' }} · {{ project.session_count || 0 }} 个会话</small></span>
      </div>
      <span v-if="project" class="main-agent-label"><Bot :size="13" />项目主 Agent</span>
    </div>

    <div class="workspace-actions">
      <button
        v-if="connected"
        class="primary stop"
        :disabled="!!busyAction"
        title="断开项目 Agent 与协作通道"
        @click="emit('stop', project)"
      ><Square :size="15" />{{ busyAction === 'stop' ? '正在断开' : '断开 Agent' }}</button>
      <button
        v-else-if="project"
        class="primary"
        :disabled="!!busyAction"
        title="连接项目 Agent 与协作通道"
        @click="emit('start', project)"
      ><Play :size="15" />{{ busyAction === 'start' ? '正在连接' : '连接 Agent' }}</button>

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
.project-selector { position:relative; width:min(300px,30vw); min-width:190px; display:grid; gap:2px; }
.project-selector > span { color:var(--text-muted); font-size:9px; font-weight:700; }
.project-selector-trigger { width:100%; height:29px; justify-content:space-between; padding:0; border:0; background:transparent; text-align:left; }
.project-selector-trigger > span { min-width:0; display:flex; align-items:baseline; gap:7px; }
.project-selector-trigger strong { overflow:hidden; font-size:13px; text-overflow:ellipsis; white-space:nowrap; }
.project-selector-trigger small { max-width:92px; overflow:hidden; color:var(--accent-blue); font-size:9px; text-overflow:ellipsis; white-space:nowrap; }
.project-picker { position:absolute; top:48px; left:-45px; width:min(460px,calc(100vw - 32px)); max-height:min(620px,calc(100vh - 120px)); display:flex; flex-direction:column; overflow:hidden; border:1px solid var(--border-color); border-radius:7px; background:var(--surface); box-shadow:var(--shadow-lg); z-index:80; }
.project-picker-search { margin:10px 10px 6px; height:34px; display:flex; align-items:center; gap:8px; padding:0 10px; border:1px solid var(--border-color); border-radius:6px; background:var(--surface-raised); color:var(--text-muted); }
.project-picker-search:focus-within { border-color:var(--accent-blue); }
.project-picker-search input,.folder-rename input,.project-folder-create input { min-width:0; flex:1; border:0; outline:0; background:transparent; color:var(--text-primary); font-size:11px; }
.project-picker-list { min-height:90px; overflow:auto; padding:2px 7px 8px; }
.project-folder-group { padding:3px 0; }
.project-folder-heading { min-height:31px; display:flex; align-items:center; gap:2px; }
.project-folder-heading > button { width:28px; height:28px; flex:0 0 auto; border:0; background:transparent; color:var(--text-muted); }
.project-folder-heading .folder-toggle { width:auto; min-width:0; flex:1; justify-content:flex-start; padding:0 7px; color:var(--text-secondary); }
.folder-toggle svg:first-child { transition:transform .15s ease; }
.folder-toggle svg:first-child.expanded { transform:rotate(90deg); }
.folder-toggle strong { overflow:hidden; font-size:10px; text-overflow:ellipsis; white-space:nowrap; }
.folder-toggle small { margin-left:auto; color:var(--text-muted); font-size:9px; }
.project-folder-items { display:grid; gap:2px; padding-left:15px; }
.project-picker-row { min-width:0; display:flex; align-items:center; gap:5px; border-radius:6px; }
.project-picker-row:hover,.project-picker-row.active { background:var(--control-hover); }
.project-picker-row.active { box-shadow:inset 2px 0 var(--accent-blue); }
.project-picker-select { min-width:0; height:43px; flex:1; justify-content:flex-start; gap:9px; padding:0 8px; border:0; background:transparent; text-align:left; }
.project-picker-select > span:nth-child(2) { min-width:0; display:grid; gap:2px; }
.project-picker-select strong,.project-picker-select small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.project-picker-select strong { font-size:11px; }
.project-picker-select small { color:var(--text-muted); font-size:8.5px; font-weight:500; }
.project-row-icon { width:25px; height:25px; flex:0 0 auto; display:grid; place-items:center; border:1px solid var(--border-color); border-radius:5px; color:var(--accent-blue); background:var(--surface-raised); }
.project-picker-select i { width:6px; height:6px; margin-left:auto; flex:0 0 auto; border-radius:50%; background:var(--text-muted); opacity:.45; }
.project-picker-select i.running { background:#16a34a; opacity:1; box-shadow:0 0 0 3px color-mix(in srgb,#16a34a 12%,transparent); }
.project-picker-row select { width:110px; height:28px; margin-right:5px; padding:0 22px 0 7px; border:1px solid var(--border-color); border-radius:5px; outline:0; background:var(--surface-raised); color:var(--text-secondary); font-size:9px; }
.folder-rename,.project-folder-create { display:flex; align-items:center; gap:7px; margin:0 7px 5px 31px; padding:4px 5px 4px 9px; border:1px solid var(--accent-blue); border-radius:6px; background:var(--surface-raised); }
.folder-rename button,.project-folder-create button { width:26px; height:26px; flex:0 0 auto; border:0; background:transparent; color:var(--accent-blue); }
.project-folder-create { margin:0 10px 8px; }
.project-picker-empty { padding:24px; color:var(--text-muted); font-size:10px; text-align:center; }
.project-picker-footer { display:flex; justify-content:space-between; gap:8px; padding:7px 10px; border-top:1px solid var(--border-color); background:var(--surface-raised); }
.project-picker-footer button { height:30px; padding:0 9px; border:0; background:transparent; color:var(--text-secondary); }
.project-picker-footer button:hover,.project-picker-footer button.active { background:var(--control-hover); color:var(--accent-blue); }
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
@media (max-width:1050px) { .main-agent-label,.page-info { display:none; } .project-selector { width:min(250px,32vw); } }
@media (max-width:760px) { .workspace-header { min-height:auto; align-items:stretch; flex-direction:column; gap:8px; padding:9px 12px; } .project-context,.workspace-actions { width:100%; } .project-selector { width:auto; flex:1; } .project-status { display:none; } .workspace-actions { justify-content:flex-end; } .workspace-actions .primary { margin-right:auto; } }
@media (max-width:440px) { .project-mark,.archives { display:none; } .project-picker { left:0; width:calc(100vw - 24px); } .project-folder-items { padding-left:5px; } .project-picker-row select { width:92px; } .workspace-actions { gap:6px; } .create { width:34px; overflow:hidden; padding:0; font-size:0; gap:0; } .create svg { width:16px; } }
</style>
