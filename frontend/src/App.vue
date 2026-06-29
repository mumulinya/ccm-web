<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch, provide } from 'vue'
import ProjectManager from './components/ProjectManager.vue'
import GroupChat from './components/GroupChat.vue'
import ToolsConfig from './components/ToolsConfig.vue'
import TaskManager from './components/TaskManager.vue'
import AutoDevOps from './components/AutoDevOps.vue'
import Terminal from './components/Terminal.vue'
import Settings from './components/Settings.vue'
import CodeChanges from './components/CodeChanges.vue'
import CronJobs from './components/CronJobs.vue'
import Templates from './components/Templates.vue'
import Dashboard from './components/Dashboard.vue'
import AgentMetrics from './components/AgentMetrics.vue'
import SearchHistory from './components/SearchHistory.vue'
import MusicPlayer from './components/MusicPlayer.vue'
import MenuManager from './components/MenuManager.vue'
import PetMenu from './components/pets/PetMenu.vue'
import GlobalAgent from './components/GlobalAgent.vue'
import KnowledgeBase from './components/KnowledgeBase.vue'
import MemoryCenter from './components/MemoryCenter.vue'
import SystemDiagnostics from './components/SystemDiagnostics.vue'

const currentTab = ref('')
const projects = ref([])
const MUSIC_PET_AGENT_NAME = 'music-agent'
const DEFAULT_MUSIC_PET_LABEL = '乖乖'
const musicPetLabel = ref(DEFAULT_MUSIC_PET_LABEL)
const musicPetAgent = computed(() => ({
  name: MUSIC_PET_AGENT_NAME,
  displayName: musicPetLabel.value,
  petLabel: musicPetLabel.value,
  virtual: true,
  type: 'music'
}))
const petAgents = computed(() => [...projects.value, musicPetAgent.value])
const isMobile = ref(window.innerWidth <= 768)
const isDark = ref(localStorage.getItem('theme') === 'dark')

// 全局对话模板分发总线
const activeSelectedTemplate = ref(null)
provide('activeSelectedTemplate', activeSelectedTemplate)
provide('applyTemplate', (template, targetTab, targetId) => {
  currentTab.value = targetTab
  if (targetTab === 'groups') {
    navigateTo.value = { tab: 'groups', groupId: targetId }
  } else if (targetTab === 'projects') {
    navigateTo.value = { tab: 'projects', project: targetId }
  }
  activeSelectedTemplate.value = { template, targetTab, targetId }
})

// 搜索结果跳转目标
const navigateTo = ref(null)
const goToResult = async (item) => {
  // 先清空再设置，确保 watch 能触发
  navigateTo.value = null
  await nextTick()
  if (item.isGroup) {
    navigateTo.value = { tab: 'groups', groupId: item.sessionId, keyword: item._keyword || '' }
  } else {
    navigateTo.value = { tab: 'projects', project: item.project, sessionId: item.sessionId, keyword: item._keyword || '' }
  }
  switchTab(navigateTo.value.tab)
}

let petStatusSource = null
let petNavigationReconnectTimer = null

const cleanNavigationUrl = () => {
  const url = new URL(window.location.href)
  const navigationKeys = ['tab', 'project', 'sessionId', 'groupId', 'keyword']
  let changed = false
  for (const key of navigationKeys) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }
  if (changed) {
    const nextUrl = url.pathname + (url.search ? url.search : '') + url.hash
    window.history.replaceState({}, '', nextUrl)
  }
}

const readNavigationTargetFromUrl = () => {
  const params = new URLSearchParams(window.location.search)
  const tab = params.get('tab')
  if (!tab) return null
  if (tab === 'music') return { tab: 'music' }
  if (tab === 'groups') {
    return {
      tab: 'groups',
      groupId: params.get('groupId') || '',
      keyword: params.get('keyword') || ''
    }
  }
  if (tab === 'projects') {
    return {
      tab: 'projects',
      project: params.get('project') || '',
      sessionId: params.get('sessionId') || '',
      keyword: params.get('keyword') || ''
    }
  }
  return { tab }
}

const applyPetNavigationTarget = async (target) => {
  if (!target || !target.tab) return
  navigateTo.value = null
  await nextTick()
  if (target.tab === 'music') {
    switchTab('music')
    return
  }
  if (target.tab === 'groups') {
    navigateTo.value = {
      tab: 'groups',
      groupId: target.groupId || '',
      keyword: target.keyword || ''
    }
    switchTab('groups')
    return
  }
  if (target.tab === 'projects') {
    navigateTo.value = {
      tab: 'projects',
      project: target.project || '',
      sessionId: target.sessionId || '',
      keyword: target.keyword || ''
    }
    switchTab('projects')
    return
  }
  switchTab(target.tab)
}

const updateMusicPetLabelFromAgent = (agent) => {
  if (!agent || agent.name !== MUSIC_PET_AGENT_NAME) return
  const label = String(agent.petLabel || agent.displayName || agent.label || '').trim()
  musicPetLabel.value = label || DEFAULT_MUSIC_PET_LABEL
}

const refreshMusicPetAgent = async () => {
  try {
    const res = await fetch('/api/pets/agents')
    const data = await res.json()
    const agent = (data.agents || []).find(a => a.name === MUSIC_PET_AGENT_NAME)
    updateMusicPetLabelFromAgent(agent)
  } catch {}
}

const connectPetNavigationStream = () => {
  if (petNavigationReconnectTimer) {
    clearTimeout(petNavigationReconnectTimer)
    petNavigationReconnectTimer = null
  }
  if (petStatusSource) petStatusSource.close()
  petStatusSource = new EventSource('/api/status/stream?client=workspace')
  petStatusSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.type === 'snapshot') {
        const agent = (data.agents || []).find(a => a.name === MUSIC_PET_AGENT_NAME)
        updateMusicPetLabelFromAgent(agent)
      } else if (data.type === 'state' && data.agent === MUSIC_PET_AGENT_NAME) {
        updateMusicPetLabelFromAgent({ name: data.agent, displayName: data.displayName })
      } else if (data.type === 'config') {
        refreshMusicPetAgent()
      }
      if (data.type === 'navigate') {
        applyPetNavigationTarget(data.target)
        window.focus()
      }
    } catch {}
  }
  petStatusSource.onerror = () => {
    if (petStatusSource) {
      petStatusSource.close()
      petStatusSource = null
    }
    petNavigationReconnectTimer = setTimeout(connectPetNavigationStream, 3000)
  }
}

window.addEventListener('resize', () => { isMobile.value = window.innerWidth <= 768 })

// Ctrl+K 快捷键跳转搜索
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    switchTab('search')
  }
})

const toggleTheme = () => {
  isDark.value = !isDark.value
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')

  // 若处于自定义的科技霓虹预设主题中，切换明暗时自动平滑退回到默认主题，保障全站色彩渲染无错
  const preset = localStorage.getItem('theme-preset') || 'default'
  if (preset !== 'default') {
    localStorage.setItem('theme-preset', 'default')
    document.documentElement.setAttribute('data-theme-preset', 'default')
    window.dispatchEvent(new Event('storage'))
  }
}

// 防止页面滚动（音乐播放器等场景）
const preventPageScroll = () => {
  window.scrollTo(0, 0)
}
watch(currentTab, () => {
  if (currentTab.value === 'music') {
    window.addEventListener('scroll', preventPageScroll)
  } else {
    window.removeEventListener('scroll', preventPageScroll)
  }
})

const handleSettingsStorage = (e) => {
  if (!e || e.key === 'theme-preset') {
    const preset = localStorage.getItem('theme-preset') || 'default'
    document.documentElement.setAttribute('data-theme-preset', preset)
  }
  if (!e || e.key === 'app-low-perf') {
    const lowPerf = localStorage.getItem('app-low-perf') === 'true'
    document.documentElement.classList.toggle('low-perf', lowPerf)
  }
}

onMounted(async () => {
  // 应用保存的主题
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  
  // 应用保存的个性化预设主题及硬件加速模式
  const preset = localStorage.getItem('theme-preset') || 'default'
  document.documentElement.setAttribute('data-theme-preset', preset)
  const lowPerf = localStorage.getItem('app-low-perf') === 'true'
  document.documentElement.classList.toggle('low-perf', lowPerf)
  window.addEventListener('storage', handleSettingsStorage)

  try {
    const res = await fetch('/api/projects')
    const data = await res.json()
    projects.value = data.projects || []
  } catch {}
  await refreshMusicPetAgent()
  const initialNavigation = readNavigationTargetFromUrl()
  if (initialNavigation) {
    await applyPetNavigationTarget(initialNavigation)
    cleanNavigationUrl()
  }
  connectPetNavigationStream()
})

onUnmounted(() => {
  if (petStatusSource) {
    petStatusSource.close()
    petStatusSource = null
  }
  if (petNavigationReconnectTimer) {
    clearTimeout(petNavigationReconnectTimer)
    petNavigationReconnectTimer = null
  }
  window.removeEventListener('scroll', preventPageScroll)
  window.removeEventListener('storage', handleSettingsStorage)
})

const DEFAULT_TABS = [
  { id: 'projects', icon: '📂', label: '项目管理' },
  { id: 'groups', icon: '💬', label: '群聊协作' },
  { id: 'global-agent', icon: '🤖', label: '全局助手' },
  { id: 'tools', icon: '🔧', label: '工具配置' },
  { id: 'pets', icon: '🐾', label: '宠物空间' },
  { id: 'changes', icon: '📝', label: '代码变更' },
  { id: 'tasks', icon: '📋', label: '任务派发' },
  { id: 'autodev', icon: '🧭', label: '自动开发' },
  { id: 'diagnostics', icon: '🩺', label: '系统自检与体检' },
  { id: 'knowledge', icon: '📖', label: '知识库与文档' },
  { id: 'memory-center', icon: '🧠', label: '记忆控制中心' },
  { id: 'cron', icon: '⏰', label: '定时任务' },
  { id: 'terminal', icon: '💻', label: '内置终端' },
  { id: 'templates', icon: '📚', label: '对话模板' },
  { id: 'dashboard', icon: '📊', label: '协作仪表盘' },
  { id: 'metrics', icon: '📈', label: '性能监控' },
  { id: 'search', icon: '🔍', label: '对话搜索' },
  { id: 'music', icon: '🎵', label: '音乐播放' },
  { id: 'settings', icon: '⚙️', label: '系统设置' },
  { id: 'menumanager', icon: '📋', label: '菜单管理' },
]

function getMergedTabs() {
  let custom = []
  try {
    const saved = localStorage.getItem('menu-custom-links')
    if (saved) custom = JSON.parse(saved)
  } catch {}
  return [...DEFAULT_TABS, ...custom]
}

const tabs = ref(loadTabOrder())
currentTab.value = tabs.value[0]?.id || 'projects'

function loadTabOrder() {
  const merged = getMergedTabs()
  try {
    const saved = localStorage.getItem('tab-order')
    if (saved) {
      const order = JSON.parse(saved)
      if (Array.isArray(order)) {
        const ordered = order.map((id) => merged.find(t => t.id === id)).filter(Boolean)
        const remaining = merged.filter(t => !ordered.find(o => o.id === t.id))
        const result = [...ordered, ...remaining]
        if (result.length > 0) return result
      }
    }
  } catch {}
  return merged.map(t => ({ ...t }))
}

function saveTabOrder() {
  localStorage.setItem('tab-order', JSON.stringify(tabs.value.map(t => t.id)))
}

const currentTabInfo = () => tabs.value.find(t => t.id === currentTab.value)

// 菜单分组（始终从 localStorage 读取，保证刷新后生效）
const DEFAULT_GROUPS = [
  { id: 'core', label: '核心功能', icon: '⭐' },
  { id: 'dev', label: '开发工具', icon: '🛠️' },
  { id: 'collab', label: '协作管理', icon: '🤝' },
  { id: 'data', label: '数据监控', icon: '📊' },
  { id: 'system', label: '系统', icon: '⚙️' },
]
const DEFAULT_TAB_GROUPS = {
  projects: 'core', groups: 'collab', tasks: 'collab', autodev: 'collab', 'global-agent': 'core',
  tools: 'dev', changes: 'dev', terminal: 'dev', templates: 'dev',
  dashboard: 'data', metrics: 'data', search: 'data', 'memory-center': 'data', knowledge: 'data', diagnostics: 'data',
  cron: 'system', pets: 'system', music: 'system', settings: 'system',
}

const collapsedGroups = ref({})
const dragGroupIndex = ref(-1)
const menuVersion = ref(0) // 用于触发 computed 刷新

function getMenuGroups() {
  try {
    const saved = localStorage.getItem('menu-groups')
    if (saved) { const d = JSON.parse(saved); if (Array.isArray(d) && d.length > 0) return d }
  } catch {}
  return DEFAULT_GROUPS
}
function getMenuTabGroups() {
  try {
    const saved = localStorage.getItem('menu-tab-groups')
    if (saved) { const d = JSON.parse(saved); if (d && typeof d === 'object') return d }
  } catch {}
  return DEFAULT_TAB_GROUPS
}

// 用 computed 保证每次渲染都从 localStorage 读取最新值
const menuGroups = computed(() => { menuVersion.value; return getMenuGroups() })
const menuTabGroups = computed(() => { menuVersion.value; return getMenuTabGroups() })

const getGroupTabs = (groupId) => tabs.value.filter(t => (menuTabGroups.value[t.id] || 'ungrouped') === groupId)
const toggleGroup = (groupId) => { collapsedGroups.value[groupId] = !collapsedGroups.value[groupId] }

const updateMenuGroups = (data) => {
  localStorage.setItem('menu-groups', JSON.stringify(data.groups))
  localStorage.setItem('menu-tab-groups', JSON.stringify(data.tabGroups))
  menuVersion.value++
  tabs.value = loadTabOrder() // 动态重新加载，以同步自定义外部 Tab
}

// 父菜单拖拽排序
const groupDragIndex = ref(-1)
const startGroupDrag = (index) => { groupDragIndex.value = index }
const onGroupDragOver = (e, index) => {
  e.preventDefault()
  if (groupDragIndex.value === -1 || groupDragIndex.value === index) return
  const groups = getMenuGroups()
  const item = groups.splice(groupDragIndex.value, 1)[0]
  groups.splice(index, 0, item)
  localStorage.setItem('menu-groups', JSON.stringify(groups))
  groupDragIndex.value = index
  menuVersion.value++ // 触发 computed 刷新
}
const endGroupDrag = () => { groupDragIndex.value = -1 }

// 菜单管理
const showMenuManager = ref(false)
const dragIndex = ref(-1)

const startDrag = (index) => { dragIndex.value = index }
const onDragOver = (e, index) => {
  e.preventDefault()
  if (dragIndex.value === -1 || dragIndex.value === index) return
  const item = tabs.value.splice(dragIndex.value, 1)[0]
  tabs.value.splice(index, 0, item)
  dragIndex.value = index
}
const endDrag = () => { dragIndex.value = null; saveTabOrder() }
const resetTabOrder = () => { tabs.value = [...DEFAULT_TABS]; saveTabOrder() }

// 浏览器风格标签页管理
const openTabs = ref([tabs.value[0]]) // 默认打开项目管理

const switchTab = (tabId) => {
  currentTab.value = tabId
  if (!openTabs.value.find(t => t.id === tabId)) {
    const tabInfo = tabs.value.find(t => t.id === tabId)
    if (tabInfo) openTabs.value.push(tabInfo)
  }
}

const closeTab = (tabId, event) => {
  const idx = openTabs.value.findIndex(t => t.id === tabId)
  if (idx === -1) return
  // 关闭的标签数大于1才允许关闭
  if (openTabs.value.length <= 1) return
  openTabs.value.splice(idx, 1)
  // 如果关闭的是当前标签，切换到最后一个打开的标签
  if (currentTab.value === tabId) {
    currentTab.value = openTabs.value[Math.min(idx, openTabs.value.length - 1)].id
  }
}
</script>

<template>
  <div class="app-container">
    <!-- 左侧导航栏 -->
    <nav class="nav-sidebar">
      <div class="nav-logo">
        <h1>cc-web</h1>
        <div class="info">v1.0.0 <button class="menu-edit-btn" @click="showMenuManager = true" title="管理菜单">✏️</button></div>
      </div>
      <div class="nav-menu">
        <template v-for="(group, gi) in menuGroups" :key="group.id">
          <div class="nav-group-header"
            draggable="true"
            @dragstart="startGroupDrag(gi)"
            @dragover.prevent="onGroupDragOver($event, gi)"
            @dragend="endGroupDrag"
            @click="toggleGroup(group.id)">
            <span class="group-arrow" :class="{ collapsed: collapsedGroups[group.id] }">▼</span>
            <span>{{ group.icon }} {{ group.label }}</span>
          </div>
          <div v-show="!collapsedGroups[group.id]" class="nav-group-items">
            <div
              v-for="tab in getGroupTabs(group.id)"
              :key="tab.id"
              class="nav-item"
              :class="{ active: currentTab === tab.id }"
              @click="switchTab(tab.id)"
            >
              <span class="nav-icon">{{ tab.icon }}</span>
              <span>{{ tab.label }}</span>
            </div>
          </div>
        </template>
        <!-- 未分组 -->
        <template v-if="tabs.filter(t => !menuTabGroups[t.id] || !menuGroups.find(g => g.id === menuTabGroups[t.id])).length > 0">
          <div class="nav-group-header" @click="toggleGroup('ungrouped')">
            <span class="group-arrow" :class="{ collapsed: collapsedGroups['ungrouped'] }">▼</span>
            <span>📦 其他</span>
          </div>
          <div v-show="!collapsedGroups['ungrouped']" class="nav-group-items">
            <div
              v-for="tab in tabs.filter(t => !menuTabGroups[t.id] || !menuGroups.find(g => g.id === menuTabGroups[t.id]))"
              :key="tab.id"
              class="nav-item"
              :class="{ active: currentTab === tab.id }"
              @click="switchTab(tab.id)"
            >
              <span class="nav-icon">{{ tab.icon }}</span>
              <span>{{ tab.label }}</span>
            </div>
          </div>
        </template>
      </div>
    </nav>

    <!-- 右侧主内容区 -->
    <main class="main-wrapper">
      <div class="header">
        <h2>{{ currentTabInfo()?.icon }} {{ currentTabInfo()?.label }}</h2>
        <button class="theme-toggle" @click="toggleTheme" :title="isDark ? '切换浅色' : '切换深色'">
          {{ isDark ? '☀️' : '🌙' }}
        </button>
      </div>
      <!-- 浏览器风格标签页栏 -->
      <div class="tab-bar" v-if="openTabs.length > 0">
        <div v-for="tab in openTabs" :key="tab.id"
          class="tab-item" :class="{ active: currentTab === tab.id }"
          @click="switchTab(tab.id)"
          @contextmenu.prevent="closeTab(tab.id, $event)">
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
          <button class="tab-close" @click.stop="closeTab(tab.id)" title="关闭">&times;</button>
        </div>
      </div>

      <div class="content-area" :class="{ 'has-bottom-bar': isMobile }" @wheel.stop>
        <div v-show="currentTab === 'projects'" class="tab-pane"><ProjectManager :navigate-to="navigateTo" @navigated="navigateTo = null" /></div>
        <div v-show="currentTab === 'groups'" class="tab-pane"><GroupChat :navigate-to="navigateTo" @navigated="navigateTo = null" /></div>
        <div v-show="currentTab === 'global-agent'" class="tab-pane"><GlobalAgent @switch-tab="switchTab" @set-navigation="(target) => navigateTo = target" /></div>
        <div v-show="currentTab === 'tools'" class="tab-pane"><ToolsConfig /></div>
        <div v-show="currentTab === 'pets'" class="tab-pane"><PetMenu :agents="petAgents" @agents-updated="refreshMusicPetAgent" /></div>
        <div v-show="currentTab === 'changes'" class="tab-pane"><CodeChanges /></div>
        <div v-show="currentTab === 'tasks'" class="tab-pane"><TaskManager /></div>
        <div v-show="currentTab === 'autodev'" class="tab-pane"><AutoDevOps /></div>
        <div v-show="currentTab === 'diagnostics'" class="tab-pane"><SystemDiagnostics /></div>
        <div v-show="currentTab === 'knowledge'" class="tab-pane"><KnowledgeBase /></div>
        <div v-show="currentTab === 'memory-center'" class="tab-pane"><MemoryCenter /></div>
        <div v-show="currentTab === 'cron'" class="tab-pane"><CronJobs /></div>
        <div v-show="currentTab === 'terminal'" class="tab-pane"><Terminal /></div>
        <div v-show="currentTab === 'templates'" class="tab-pane"><Templates /></div>
        <div v-show="currentTab === 'dashboard'" class="tab-pane"><Dashboard /></div>
        <div v-show="currentTab === 'metrics'" class="tab-pane"><AgentMetrics /></div>
        <div v-show="currentTab === 'search'" class="tab-pane"><SearchHistory @go-to="goToResult" /></div>
        <div v-show="currentTab === 'music'" class="tab-pane"><MusicPlayer :agent-label="musicPetLabel" /></div>
        <div v-show="currentTab === 'settings'" class="tab-pane"><Settings /></div>
        <div v-show="currentTab === 'menumanager'" class="tab-pane"><MenuManager :tabs="tabs" @update-groups="updateMenuGroups" /></div>
        
        <!-- 动态渲染自定义外部链接的 iframe 面板 -->
        <div v-for="tab in tabs.filter(t => t.isExternal)" :key="tab.id" v-show="currentTab === tab.id" class="tab-pane">
          <iframe :src="tab.url" style="width: 100%; height: 100%; border: none; background: var(--bg-secondary); border-radius: 8px;"></iframe>
        </div>
      </div>
    </main>

    <!-- 移动端底部 Tab 栏 -->
    <nav class="bottom-bar" v-if="isMobile">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="bottom-item"
        :class="{ active: currentTab === tab.id }"
        @click="switchTab(tab.id)"
      >
        <span class="bottom-icon">{{ tab.icon }}</span>
        <span class="bottom-label">{{ tab.label.slice(0, 2) }}</span>
      </div>
    </nav>

    <!-- 菜单管理弹窗 -->
    <div v-if="showMenuManager" class="menu-mgr-overlay" @click.self="showMenuManager = false">
      <div class="menu-mgr-modal">
        <div class="menu-mgr-header">
          <span>📋 菜单管理</span>
          <button class="close-btn" @click="showMenuManager = false">&times;</button>
        </div>
        <div class="menu-mgr-body">
          <p class="menu-mgr-hint">拖拽排序菜单项，修改后自动保存</p>
          <div class="menu-mgr-list">
            <div v-for="(tab, i) in tabs" :key="tab.id"
              class="menu-mgr-item"
              :class="{ dragging: dragIndex === i }"
              draggable="true"
              @dragstart="startDrag(i)"
              @dragover.prevent="onDragOver($event, i)"
              @dragend="endDrag">
              <span class="drag-handle">⠿</span>
              <span class="mgr-icon">{{ tab.icon }}</span>
              <span class="mgr-label">{{ tab.label }}</span>
              <span class="mgr-id">{{ tab.id }}</span>
            </div>
          </div>
        </div>
        <div class="menu-mgr-footer">
          <button class="btn btn-outline" @click="resetTabOrder">恢复默认</button>
          <button class="btn btn-primary" @click="showMenuManager = false">完成</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  letter-spacing: 0;
}

.nav-sidebar {
  width: 264px;
  min-width: 264px;
  background: var(--surface-nav);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  padding: 14px 10px;
  box-shadow: none;
}

.nav-logo {
  padding: 10px 10px 14px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 10px;
}

.nav-logo h1 {
  font-family: inherit;
  font-size: 18px;
  font-weight: 780;
  text-transform: none;
  color: var(--text-primary);
  background: none;
  -webkit-text-fill-color: currentColor;
  animation: none;
  filter: none;
  letter-spacing: 0;
  line-height: 1.2;
}

.nav-logo .info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-family: inherit;
  font-size: 12px;
  color: var(--text-muted);
  opacity: 1;
  margin-top: 6px;
  letter-spacing: 0;
}

.nav-menu {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0;
  overflow-y: auto;
  scrollbar-width: thin;
}

.nav-item {
  min-height: 36px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  color: var(--text-secondary);
  border: 1px solid transparent;
  border-left: 3px solid transparent;
  margin: 1px 0;
  font-size: 13px;
  font-weight: 560;
  letter-spacing: 0;
}

.nav-item:hover {
  background: var(--control-hover);
  color: var(--text-primary);
  padding-left: 10px;
  box-shadow: none;
}

.nav-item.active {
  background: var(--accent-soft);
  color: var(--accent-blue);
  font-weight: 720;
  border-left: 3px solid var(--accent-blue);
  border-top-color: var(--border-color);
  border-right-color: var(--border-color);
  border-bottom-color: var(--border-color);
  box-shadow: none;
}

.nav-icon {
  font-size: 14px;
  width: 20px;
  text-align: center;
  filter: none;
  opacity: 0.88;
}

.main-wrapper {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-primary);
}

.header {
  min-height: 56px;
  padding: 0 18px;
  background: var(--surface);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: none;
}
.theme-toggle {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
.theme-toggle:hover {
  border-color: var(--accent-blue);
  background: var(--control-hover);
  color: var(--text-primary);
  transform: none;
}

.header h2 {
  font-size: 16px;
  font-weight: 760;
  letter-spacing: 0;
  color: var(--text-primary);
}

.tab-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--surface);
  border-bottom: 1px solid var(--border-color);
  overflow-x: auto;
  min-height: 42px;
  padding: 6px 10px;
  scrollbar-width: none;
}
.tab-bar::-webkit-scrollbar { display: none; }
.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 9px;
  font-size: 12px;
  color: var(--text-secondary);
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
  min-width: 0;
  flex-shrink: 0;
}
.tab-item:hover {
  background: var(--control-hover);
  color: var(--text-primary);
}
.tab-item.active {
  background: var(--bg-secondary);
  color: var(--accent-blue);
  border-color: var(--border-color);
}
.tab-icon { font-size: 13px; }
.tab-label { max-width: 100px; overflow: hidden; text-overflow: ellipsis; }
.tab-close {
  width: 16px; height: 16px;
  border: none; background: none;
  color: var(--text-muted); font-size: 14px;
  cursor: pointer; border-radius: 3px;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: all 0.15s;
}
.tab-item:hover .tab-close { opacity: 1; }
.tab-close:hover { background: var(--danger-soft); color: var(--accent-red); }

.content-area {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  position: relative;
  background: var(--bg-primary);
}
.tab-pane {
  position: absolute;
  inset: 12px;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
}

.empty-state .icon {
  font-size: 48px;
  opacity: 0.22;
  margin-bottom: 16px;
  animation: none;
}

.empty-state p {
  font-size: 15px;
  color: var(--text-secondary);
}

.empty-state .sub {
  font-size: 12px;
  margin-top: 8px;
}

/* 移动端底部 Tab 栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: var(--surface);
  border-top: 1px solid var(--border-color);
  display: flex;
  z-index: 1000;
  overflow-x: auto;
  box-shadow: 0 -8px 24px rgba(20, 24, 22, 0.08);
}
.bottom-item {
  flex: 1;
  min-width: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.2s;
  padding: 4px 0;
}
.bottom-item.active {
  color: var(--accent-blue);
  background: var(--accent-soft);
}
.bottom-icon { font-size: 16px; }
.bottom-label { font-size: 11px; white-space: nowrap; }

.content-area.has-bottom-bar {
  padding-bottom: 64px;
}

@media (max-width: 768px) {
  .nav-sidebar {
    display: none !important;
  }
  .header {
    min-height: 50px;
    padding: 0 14px;
  }
  .header h2 {
    font-size: 14px;
  }
  .tab-bar {
    min-height: 40px;
    padding: 5px 8px;
  }
  .tab-pane {
    inset: 8px 8px 64px;
  }
}

.nav-group-header {
  min-height: 28px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 720;
  color: var(--text-muted);
  text-transform: none;
  letter-spacing: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  user-select: none;
  transition: all 0.15s;
  border-radius: 6px;
  border: 1px solid transparent;
}
.nav-group-header:hover { color: var(--text-primary); background: var(--control-hover); }
.nav-group-header[draggable="true"] { cursor: grab; }
.nav-group-header[draggable="true"]:active { cursor: grabbing; opacity: 0.7; border-left-color: var(--accent-blue); }
.group-arrow { font-size: 8px; transition: transform 0.2s; }
.group-arrow.collapsed { transform: rotate(-90deg); }
.nav-group-items { display: flex; flex-direction: column; gap: 2px; }

.menu-edit-btn {
  width: 24px;
  height: 24px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 12px;
  opacity: 1;
  transition: all 0.15s;
  padding: 0;
}
.menu-edit-btn:hover { color: var(--text-primary); border-color: var(--accent-blue); }
.menu-mgr-overlay {
  position: fixed; inset: 0; background: rgba(18, 23, 20, 0.38);
  display: flex; align-items: center; justify-content: center;
  z-index: 10000; backdrop-filter: blur(6px);
}
.menu-mgr-modal {
  background: var(--surface); border: 1px solid var(--border-color);
  border-radius: 8px; width: 420px; max-height: 80vh;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: var(--shadow-lg);
}
.menu-mgr-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid var(--border-color);
  font-size: 16px; font-weight: 760;
}
.close-btn {
  width: 28px; height: 28px; border-radius: 6px; border: none;
  background: var(--bg-secondary); color: var(--text-secondary);
  cursor: pointer; font-size: 18px;
}
.menu-mgr-body { padding: 16px; flex: 1; overflow-y: auto; }
.menu-mgr-hint { font-size: 12px; color: var(--text-muted); margin-bottom: 12px; }
.menu-mgr-list { display: flex; flex-direction: column; gap: 4px; }
.menu-mgr-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 6px;
  background: var(--surface); border: 1px solid var(--border-color);
  cursor: grab; transition: all 0.15s; user-select: none;
}
.menu-mgr-item:hover { border-color: var(--accent-blue); background: var(--control-hover); }
.menu-mgr-item.dragging { opacity: 0.5; border-color: var(--accent-blue); }
.drag-handle { color: var(--text-muted); cursor: grab; font-size: 14px; }
.mgr-icon { font-size: 16px; }
.mgr-label { flex: 1; font-size: 13px; color: var(--text-primary); }
.mgr-id { font-size: 10px; color: var(--text-muted); font-family: monospace; }
.menu-mgr-footer {
  display: flex; gap: 8px; justify-content: flex-end;
  padding: 12px 20px; border-top: 1px solid var(--border-color);
}
</style>
