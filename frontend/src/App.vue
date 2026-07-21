<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch, provide, defineAsyncComponent } from 'vue'
import {
  Activity,
  Bot,
  BookOpen,
  Brain,
  ChevronDown,
  Clock3,
  FileDiff,
  FolderKanban,
  History,
  LayoutDashboard,
  Link,
  ListTodo,
  Menu,
  MessageSquare,
  Moon,
  Music2,
  PawPrint,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  SquareTerminal,
  Sun,
  Trash2,
  Wrench,
  Workflow,
  X,
} from '@lucide/vue'
import UsabilityWorkbench from './components/common/UsabilityWorkbench.vue'
import PageLoadingOverlay from './components/common/PageLoadingOverlay.vue'
import PageLoadError from './components/common/PageLoadError.vue'
import {
  MENU_CONFIG_EVENT,
  MENU_CONFIG_KEY,
  buildConfiguredTabs,
  loadMenuConfiguration,
} from './utils/menuConfiguration.js'

const definePageComponent = loader => defineAsyncComponent({
  loader,
  loadingComponent: PageLoadingOverlay,
  errorComponent: PageLoadError,
  delay: 0,
  timeout: 30_000,
  onError(error, retry, fail, attempts) {
    if (attempts < 2 && /fetch|network|loading|chunk/i.test(String(error?.message || error))) {
      window.setTimeout(retry, 350)
      return
    }
    fail()
  },
})

const PAGE_LOADERS = {
  projects: () => import('./components/projects/ProjectManager.vue'),
  groups: () => import('./components/collaboration/GroupChat.vue'),
  tools: () => import('./components/tools/ToolsConfig.vue'),
  tasks: () => import('./components/tasks/TaskManager.vue'),
  autodev: () => import('./components/tools/AutoDevOps.vue'),
  terminal: () => import('./components/tools/Terminal.vue'),
  settings: () => import('./components/settings/Settings.vue'),
  changes: () => import('./components/tools/CodeChanges.vue'),
  cron: () => import('./components/tools/CronJobs.vue'),
  metrics: () => import('./components/agents/AgentMetrics.vue'),
  search: () => import('./components/workspace/SearchHistory.vue'),
  music: () => import('./components/music/MusicPlayer.vue'),
  menumanager: () => import('./components/workspace/MenuManager.vue'),
  pets: () => import('./components/pets/PetMenu.vue'),
  'global-agent': () => import('./components/global/GlobalAgent.vue'),
  knowledge: () => import('./components/knowledge/KnowledgeBase.vue'),
  'memory-center': () => import('./components/knowledge/MemoryCenter.vue'),
  'cleanup-center': () => import('./components/system/cleanup/CleanupCenter.vue'),
  'trace-replay': () => import('./components/system/TraceReplay.vue'),
}
const ProjectManager = definePageComponent(PAGE_LOADERS.projects)
const GroupChat = definePageComponent(PAGE_LOADERS.groups)
const ToolsConfig = definePageComponent(PAGE_LOADERS.tools)
const TaskManager = definePageComponent(PAGE_LOADERS.tasks)
const AutoDevOps = definePageComponent(PAGE_LOADERS.autodev)
const Terminal = definePageComponent(PAGE_LOADERS.terminal)
const Settings = definePageComponent(PAGE_LOADERS.settings)
const CodeChanges = definePageComponent(PAGE_LOADERS.changes)
const CronJobs = definePageComponent(PAGE_LOADERS.cron)
const AgentMetrics = definePageComponent(PAGE_LOADERS.metrics)
const SearchHistory = definePageComponent(PAGE_LOADERS.search)
const MusicPlayer = definePageComponent(PAGE_LOADERS.music)
const MusicRemoteHost = defineAsyncComponent(() => import('./components/music/MusicRemoteHost.vue'))
const MenuManager = definePageComponent(PAGE_LOADERS.menumanager)
const PetMenu = definePageComponent(PAGE_LOADERS.pets)
const GlobalAgent = definePageComponent(PAGE_LOADERS['global-agent'])
const KnowledgeBase = definePageComponent(PAGE_LOADERS.knowledge)
const MemoryCenter = definePageComponent(PAGE_LOADERS['memory-center'])
const CleanupCenter = definePageComponent(PAGE_LOADERS['cleanup-center'])
const TraceReplay = definePageComponent(PAGE_LOADERS['trace-replay'])

const currentTab = ref('')
const musicPlayerActivated = ref(false)
const preloadedTabs = new Set()
const preloadTab = tabId => {
  const loader = PAGE_LOADERS[tabId]
  if (!loader || preloadedTabs.has(tabId)) return
  preloadedTabs.add(tabId)
  loader().catch(() => preloadedTabs.delete(tabId))
}
const RETIRED_TAB_REDIRECTS = {
  diagnostics: 'settings',
  templates: 'dashboard',
}
const projects = ref([])
const GLOBAL_PET_AGENT_NAME = 'global-agent'
const MUSIC_PET_AGENT_NAME = 'music-agent'
const DEFAULT_MUSIC_PET_LABEL = '乖乖'
const musicPetLabel = ref(DEFAULT_MUSIC_PET_LABEL)
const runtimePetAgents = ref([])
const globalPetAgent = computed(() => ({
  name: GLOBAL_PET_AGENT_NAME,
  displayName: '全局 Agent',
  petLabel: '全局 Agent',
  virtual: true,
  type: 'global',
  state: 'idle',
  stateDetail: '等待全局指令',
  ...(runtimePetAgents.value.find(agent => agent.name === GLOBAL_PET_AGENT_NAME) || {})
}))
const musicPetAgent = computed(() => ({
  name: MUSIC_PET_AGENT_NAME,
  displayName: musicPetLabel.value,
  petLabel: musicPetLabel.value,
  virtual: true,
  type: 'music',
  state: 'idle',
  stateDetail: '等待音乐指令',
  ...(runtimePetAgents.value.find(agent => agent.name === MUSIC_PET_AGENT_NAME) || {})
}))
const petAgents = computed(() => [globalPetAgent.value, musicPetAgent.value])
const isMobile = ref(window.innerWidth <= 768)
const isDark = ref(localStorage.getItem('theme') === 'dark')
const showMobileMenu = ref(false)

// 全局对话模板分发总线
const activeSelectedTemplate = ref(null)
provide('activeSelectedTemplate', activeSelectedTemplate)
provide('slashNavigate', (tab) => switchTab(tab))
provide('applyTemplate', (template, targetTab, targetId) => {
  switchTab(targetTab)
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
  if (item.conversationType === 'task') {
    navigateTo.value = { tab: 'tasks', taskId: item.taskId }
  } else if (item.conversationType === 'global') {
    navigateTo.value = { tab: 'global-agent', sessionId: item.sessionId, messageId: item.messageId, messageIndex: item.messageIndex, keyword: item.query || item._keyword || '' }
  } else if (item.conversationType === 'group' || item.isGroup) {
    navigateTo.value = { tab: 'groups', groupId: item.groupId || item.sessionId, groupSessionId: item.conversationType === 'group' ? item.sessionId : '', messageId: item.messageId, messageIndex: item.messageIndex, keyword: item.query || item._keyword || '' }
  } else {
    navigateTo.value = { tab: 'projects', project: item.project, sessionId: item.sessionId, messageId: item.messageId, messageIndex: item.messageIndex, keyword: item.query || item._keyword || '' }
  }
  switchTab(navigateTo.value.tab)
}

let petStatusSource = null
let petNavigationReconnectTimer = null

const cleanNavigationUrl = () => {
  const url = new URL(window.location.href)
  const navigationKeys = ['project', 'sessionId', 'groupId', 'keyword', 'task_id', 'taskId', 'trace_id', 'traceId', 'scope']
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
  if (tab === 'trace-replay') {
    return {
      tab: 'trace-replay',
      task_id: params.get('task_id') || params.get('taskId') || '',
      trace_id: params.get('trace_id') || params.get('traceId') || '',
      scope: params.get('scope') || 'orchestrator'
    }
  }
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

const navigationEntry = typeof performance !== 'undefined'
  ? performance.getEntriesByType?.('navigation')?.[0]
  : null
const isPageReload = navigationEntry?.type === 'reload'

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

const isSystemPetAgent = (name) => [GLOBAL_PET_AGENT_NAME, MUSIC_PET_AGENT_NAME].includes(name)

const syncRuntimePetAgents = (agents = []) => {
  const next = [...runtimePetAgents.value]
  for (const agent of agents || []) {
    if (!agent || !isSystemPetAgent(agent.name)) continue
    const index = next.findIndex(item => item.name === agent.name)
    if (index >= 0) next[index] = { ...next[index], ...agent }
    else next.push(agent)
    if (agent.name === MUSIC_PET_AGENT_NAME) updateMusicPetLabelFromAgent(agent)
  }
  runtimePetAgents.value = next.filter(agent => isSystemPetAgent(agent.name))
}

const patchRuntimePetAgent = (name, patch = {}) => {
  if (!isSystemPetAgent(name)) return
  const normalizedPatch = { ...patch }
  if (normalizedPatch.displayName === name) delete normalizedPatch.displayName
  if (normalizedPatch.petLabel === name) delete normalizedPatch.petLabel
  const current = runtimePetAgents.value.find(agent => agent.name === name) || { name }
  const nextAgent = { ...current, ...normalizedPatch }
  runtimePetAgents.value = [
    ...runtimePetAgents.value.filter(agent => agent.name !== name),
    nextAgent
  ]
  if (name === MUSIC_PET_AGENT_NAME) updateMusicPetLabelFromAgent(nextAgent)
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
    syncRuntimePetAgents(data.agents || [])
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
        syncRuntimePetAgents(data.agents || [])
      } else if (data.type === 'state' && data.agent === MUSIC_PET_AGENT_NAME) {
        patchRuntimePetAgent(data.agent, {
          displayName: data.displayName,
          petLabel: data.displayName,
          state: data.state,
          lastActivity: data.lastActivity,
          stateDetail: data.detail || data.stateDetail || ''
        })
      } else if (data.type === 'state' && data.agent === GLOBAL_PET_AGENT_NAME) {
        patchRuntimePetAgent(data.agent, {
          displayName: data.displayName,
          petLabel: data.displayName,
          state: data.state,
          lastActivity: data.lastActivity,
          stateDetail: data.detail || data.stateDetail || ''
        })
      } else if (data.type === 'speech' && isSystemPetAgent(data.agent)) {
        patchRuntimePetAgent(data.agent, {
          lastActivity: data.timestamp,
          stateDetail: data.text || ''
        })
      } else if (data.type === 'config') {
        refreshMusicPetAgent()
        window.dispatchEvent(new CustomEvent('ccm-pets-config-changed'))
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

/** 深色专用预设；aurora 为浅色专用。default 跟随用户浅/深选择。 */
const DARK_THEME_PRESETS = new Set(['deep-void', 'cyberpunk', 'deep-ocean'])
const LIGHT_THEME_PRESETS = new Set(['aurora'])

const applyStoredThemePreferences = () => {
  const preset = localStorage.getItem('theme-preset') || 'default'
  const storedTheme = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'
  const effectiveTheme = DARK_THEME_PRESETS.has(preset)
    ? 'dark'
    : (LIGHT_THEME_PRESETS.has(preset) ? 'light' : storedTheme)

  isDark.value = effectiveTheme === 'dark'
  document.documentElement.setAttribute('data-theme', effectiveTheme)
  document.documentElement.setAttribute('data-theme-preset', preset)
}

const toggleTheme = () => {
  const nextDark = !isDark.value
  const preset = localStorage.getItem('theme-preset') || 'default'
  // 仅当当前预设锁定了相反色相时才退回 default；其余预设保留
  const conflicts = nextDark
    ? LIGHT_THEME_PRESETS.has(preset)
    : DARK_THEME_PRESETS.has(preset)
  if (conflicts) {
    localStorage.setItem('theme-preset', 'default')
    document.documentElement.setAttribute('data-theme-preset', 'default')
  }
  isDark.value = nextDark
  const theme = nextDark ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('theme', theme)
  window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: theme }))
  if (conflicts) {
    window.dispatchEvent(new StorageEvent('storage', { key: 'theme-preset', newValue: 'default' }))
  }
}

// 防止页面滚动（音乐播放器等场景）
const preventPageScroll = () => {
  window.scrollTo(0, 0)
}
watch(currentTab, () => {
  if (currentTab.value === 'music') {
    musicPlayerActivated.value = true
    window.addEventListener('scroll', preventPageScroll)
  } else {
    window.removeEventListener('scroll', preventPageScroll)
  }
})

const handleSettingsStorage = (e) => {
  if (e?.key === MENU_CONFIG_KEY) handleMenuConfigurationEvent(loadMenuConfiguration(DEFAULT_TABS))
  if (!e || e.key === 'theme' || e.key === 'theme-preset') applyStoredThemePreferences()
  if (!e || e.key === 'app-low-perf') {
    const lowPerf = localStorage.getItem('app-low-perf') === 'true'
    document.documentElement.classList.toggle('low-perf', lowPerf)
  }
}

onMounted(async () => {
  // 预设主题会决定有效明暗模式，避免深色预设与浅色组件样式混用。
  applyStoredThemePreferences()

  // 应用保存的硬件加速模式
  const lowPerf = localStorage.getItem('app-low-perf') === 'true'
  document.documentElement.classList.toggle('low-perf', lowPerf)
  window.addEventListener('storage', handleSettingsStorage)
  window.addEventListener(MENU_CONFIG_EVENT, handleMenuConfigurationEvent)

  await Promise.all([
    fetch('/api/projects').then(res => res.json()).then(data => { projects.value = data.projects || [] }).catch(() => {}),
    refreshMusicPetAgent(),
  ])
  const initialNavigation = startupNavigationTarget
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
  window.removeEventListener(MENU_CONFIG_EVENT, handleMenuConfigurationEvent)
})

const DEFAULT_TABS = [
  { id: 'dashboard', icon: '✨', label: '我的工作台' },
  { id: 'projects', icon: '📂', label: '项目管理' },
  { id: 'groups', icon: '💬', label: '群聊协作' },
  { id: 'global-agent', icon: '🤖', label: '全局助手' },
  { id: 'tools', icon: '🔧', label: '工具配置' },
  { id: 'pets', icon: '🐾', label: '宠物空间' },
  { id: 'changes', icon: '📝', label: '代码变更' },
  { id: 'tasks', icon: '📋', label: '任务派发' },
  { id: 'trace-replay', icon: '🔁', label: '任务回放' },
  { id: 'autodev', icon: '🧭', label: '自动开发' },
  { id: 'knowledge', icon: '📖', label: '知识库与文档' },
  { id: 'memory-center', icon: '🧠', label: '记忆控制中心' },
  { id: 'cleanup-center', icon: '🧹', label: '清理中心' },
  { id: 'cron', icon: '⏰', label: '定时任务' },
  { id: 'terminal', icon: '💻', label: '内置终端' },
  { id: 'metrics', icon: '📈', label: '性能监控' },
  { id: 'search', icon: '🔍', label: '对话搜索' },
  { id: 'music', icon: '🎵', label: '音乐播放' },
  { id: 'settings', icon: '⚙️', label: '系统设置' },
  { id: 'menumanager', icon: '📋', label: '菜单管理' },
]

const TAB_ICONS = {
  dashboard: LayoutDashboard,
  projects: FolderKanban,
  groups: MessageSquare,
  'global-agent': Bot,
  tools: Wrench,
  pets: PawPrint,
  changes: FileDiff,
  tasks: ListTodo,
  'trace-replay': History,
  autodev: Workflow,
  knowledge: BookOpen,
  'memory-center': Brain,
  'cleanup-center': Trash2,
  cron: Clock3,
  terminal: SquareTerminal,
  metrics: Activity,
  search: Search,
  music: Music2,
  settings: Settings2,
  menumanager: Menu,
}

const GROUP_ICONS = {
  core: Sparkles,
  dev: Wrench,
  collab: MessageSquare,
  data: Activity,
  system: Settings2,
  ungrouped: Menu,
}

const menuConfig = ref(loadMenuConfiguration(DEFAULT_TABS))
const tabs = ref(buildConfiguredTabs(DEFAULT_TABS, menuConfig.value))
// 工作台是首页：普通深链接仍可直达，浏览器刷新统一回到工作台。
const startupNavigationTarget = isPageReload ? { tab: 'dashboard' } : readNavigationTargetFromUrl()
const startupTabId = RETIRED_TAB_REDIRECTS[startupNavigationTarget?.tab] || startupNavigationTarget?.tab
const startupTab = tabs.value.find(tab => tab.id === startupTabId && !tab.isExternal)
  || tabs.value.find(tab => tab.id === 'dashboard')
  || tabs.value[0]
currentTab.value = startupTab?.id || 'dashboard'

const currentTabInfo = () => tabs.value.find(t => t.id === currentTab.value)
const getTabIcon = (tabId) => TAB_ICONS[tabId] || Link
const getGroupIcon = (groupId) => GROUP_ICONS[groupId] || Menu
const mobilePrimaryTabs = computed(() => tabs.value.filter(tab => tab.mobilePrimary && !tab.hiddenFromMenu).slice(0, 4))
const mobileMoreTabs = computed(() => tabs.value.filter(tab => (
  !tab.hiddenFromMenu && !tab.mobilePrimary
)))
const mobileMoreActive = computed(() => !mobilePrimaryTabs.value.some(tab => tab.id === currentTab.value))

const openMobileTab = (tabId) => {
  showMobileMenu.value = false
  switchTab(tabId)
}

const collapsedGroups = ref({})
const menuGroups = computed(() => menuConfig.value.groups || [])
const pinnedTabs = computed(() => tabs.value.filter(tab => !tab.hiddenFromMenu && tab.pinned))
const getGroupTabs = groupId => tabs.value.filter(tab => !tab.hiddenFromMenu && !tab.pinned && (tab.groupId || 'ungrouped') === groupId)
const ungroupedTabs = computed(() => tabs.value.filter(tab => !tab.hiddenFromMenu && !tab.pinned && (!tab.groupId || tab.groupId === 'ungrouped' || !menuGroups.value.some(group => group.id === tab.groupId))))
const toggleGroup = (groupId) => { collapsedGroups.value[groupId] = !collapsedGroups.value[groupId] }

const applyMenuConfiguration = config => {
  menuConfig.value = config || loadMenuConfiguration(DEFAULT_TABS)
  tabs.value = buildConfiguredTabs(DEFAULT_TABS, menuConfig.value)
  if (typeof openTabs !== 'undefined') {
    openTabs.value = openTabs.value.map(open => tabs.value.find(tab => tab.id === open.id)).filter(Boolean)
    if (!openTabs.value.length) openTabs.value = [tabs.value.find(tab => tab.id === 'dashboard') || tabs.value[0]]
  }
}

const syncNavigationTabUrl = tabId => {
  const url = new URL(window.location.href)
  if (url.searchParams.get('tab') === tabId) return
  url.searchParams.set('tab', tabId)
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}
const handleMenuConfigurationEvent = event => applyMenuConfiguration(event?.detail || loadMenuConfiguration(DEFAULT_TABS))
const updateMenuConfiguration = config => applyMenuConfiguration(config)

// 浏览器风格标签页管理
const openTabs = ref([startupTab])

const handleWorkbenchNavigate = (target = {}) => {
  navigateTo.value = target
  if (target.groupId) navigateTo.value = { tab: 'groups', groupId: target.groupId }
  if (target.project) navigateTo.value = { tab: 'projects', project: target.project }
  switchTab(target.tab || 'dashboard')
}

const switchTab = (tabId) => {
  tabId = RETIRED_TAB_REDIRECTS[tabId] || tabId
  const tabInfo = tabs.value.find(t => t.id === tabId)
  if (!tabInfo) return
  if (tabInfo.isExternal) {
    window.open(tabInfo.url, '_blank', 'noopener,noreferrer')
    return
  }
  if (!openTabs.value.find(t => t.id === tabId)) {
    openTabs.value.push(tabInfo)
  }
  currentTab.value = tabId
  syncNavigationTabUrl(tabId)
}

const isTabOpen = (tabId) => openTabs.value.some(tab => tab?.id === tabId)

const closeTab = (tabId, event) => {
  const idx = openTabs.value.findIndex(t => t.id === tabId)
  if (idx === -1) return
  // 关闭的标签数大于1才允许关闭
  if (openTabs.value.length <= 1) return
  openTabs.value.splice(idx, 1)
  // 如果关闭的是当前标签，切换到最后一个打开的标签
  if (currentTab.value === tabId) {
    currentTab.value = openTabs.value[Math.min(idx, openTabs.value.length - 1)].id
    syncNavigationTabUrl(currentTab.value)
  }
}
</script>

<template>
  <div class="app-container">
    <!-- 左侧导航栏 -->
    <nav class="nav-sidebar">
      <div class="nav-logo">
        <button class="brand-home" title="返回我的工作台" @click="switchTab('dashboard')">
          <span class="brand-mark"><Sparkles :size="18" /></span>
          <span class="brand-copy"><strong>CCM</strong><small>Agent Workspace</small></span>
        </button>
        <span class="brand-version">v1.0.10</span>
      </div>
      <div class="nav-menu">
        <template v-if="pinnedTabs.length">
          <div class="nav-group-header" @click="toggleGroup('pinned')">
            <ChevronDown class="group-arrow" :class="{ collapsed: collapsedGroups.pinned }" :size="13" />
            <Sparkles class="group-icon" :size="15" />
            <span>常用</span>
          </div>
          <div v-show="!collapsedGroups.pinned" class="nav-group-items">
            <div v-for="tab in pinnedTabs" :key="tab.id" class="nav-item" :class="{ active: currentTab === tab.id }" @mouseenter="preloadTab(tab.id)" @focusin="preloadTab(tab.id)" @click="switchTab(tab.id)">
              <component :is="getTabIcon(tab.id)" class="nav-icon" :size="16" />
              <span>{{ tab.label }}</span>
            </div>
          </div>
        </template>
        <template v-for="group in menuGroups" :key="group.id">
          <div class="nav-group-header" @click="toggleGroup(group.id)">
            <ChevronDown class="group-arrow" :class="{ collapsed: collapsedGroups[group.id] }" :size="13" />
            <component :is="getGroupIcon(group.id)" class="group-icon" :size="15" />
            <span>{{ group.label }}</span>
          </div>
          <div v-show="!collapsedGroups[group.id]" class="nav-group-items">
            <div
              v-for="tab in getGroupTabs(group.id)"
              :key="tab.id"
              class="nav-item"
              :class="{ active: currentTab === tab.id }"
              @mouseenter="preloadTab(tab.id)"
              @focusin="preloadTab(tab.id)"
              @click="switchTab(tab.id)"
            >
              <component :is="getTabIcon(tab.id)" class="nav-icon" :size="16" />
              <span>{{ tab.label }}</span>
            </div>
          </div>
        </template>
        <!-- 未分组 -->
        <template v-if="ungroupedTabs.length > 0">
          <div class="nav-group-header" @click="toggleGroup('ungrouped')">
            <ChevronDown class="group-arrow" :class="{ collapsed: collapsedGroups['ungrouped'] }" :size="13" />
            <Menu class="group-icon" :size="15" />
            <span>其他</span>
          </div>
          <div v-show="!collapsedGroups['ungrouped']" class="nav-group-items">
            <div
              v-for="tab in ungroupedTabs"
              :key="tab.id"
              class="nav-item"
              :class="{ active: currentTab === tab.id }"
              @mouseenter="preloadTab(tab.id)"
              @focusin="preloadTab(tab.id)"
              @click="switchTab(tab.id)"
            >
              <component :is="getTabIcon(tab.id)" class="nav-icon" :size="16" />
              <span>{{ tab.label }}</span>
            </div>
          </div>
        </template>
      </div>
    </nav>

    <!-- 右侧主内容区 -->
    <main class="main-wrapper">
      <div class="header">
        <h2>
          <component :is="getTabIcon(currentTab)" :size="17" />
          <span>{{ currentTabInfo()?.label }}</span>
        </h2>
        <div class="tab-bar" v-if="openTabs.length > 0">
          <div v-for="tab in openTabs" :key="tab.id"
            class="tab-item" :class="{ active: currentTab === tab.id }"
            @mouseenter="preloadTab(tab.id)"
            @focusin="preloadTab(tab.id)"
            @click="switchTab(tab.id)"
            @contextmenu.prevent="closeTab(tab.id, $event)">
            <component :is="getTabIcon(tab.id)" class="tab-icon" :size="14" />
            <span class="tab-label">{{ tab.label }}</span>
            <button class="tab-close" @click.stop="closeTab(tab.id)" :aria-label="`关闭${tab.label}`" title="关闭"><X :size="13" /></button>
          </div>
        </div>
        <button class="theme-toggle" @click="toggleTheme" :title="isDark ? '切换浅色' : '切换深色'">
          <Sun v-if="isDark" :size="17" />
          <Moon v-else :size="17" />
        </button>
      </div>

      <div class="content-area" :class="{ 'has-bottom-bar': isMobile, 'pets-content-area': currentTab === 'pets' }" @wheel.stop>
        <div v-if="isTabOpen('projects')" v-show="currentTab === 'projects'" class="tab-pane"><ProjectManager :active="currentTab === 'projects'" :navigate-to="navigateTo" @navigated="navigateTo = null" /></div>
        <div v-if="isTabOpen('groups')" v-show="currentTab === 'groups'" class="tab-pane"><GroupChat :active="currentTab === 'groups'" :navigate-to="navigateTo" @navigated="navigateTo = null" /></div>
        <div v-if="isTabOpen('global-agent')" v-show="currentTab === 'global-agent'" class="tab-pane"><GlobalAgent :active="currentTab === 'global-agent'" :navigate-to="navigateTo" @navigated="navigateTo = null" @switch-tab="switchTab" @set-navigation="(target) => navigateTo = target" /></div>
        <div v-if="isTabOpen('tools')" v-show="currentTab === 'tools'" class="tab-pane"><ToolsConfig @navigate="applyPetNavigationTarget" /></div>
        <div v-if="isTabOpen('pets')" v-show="currentTab === 'pets'" class="tab-pane pet-tab-pane"><PetMenu :active="currentTab === 'pets'" :agents="petAgents" :projects="projects" @agents-updated="refreshMusicPetAgent" /></div>
        <div v-if="isTabOpen('changes')" v-show="currentTab === 'changes'" class="tab-pane"><CodeChanges /></div>
        <div v-if="isTabOpen('tasks')" v-show="currentTab === 'tasks'" class="tab-pane"><TaskManager :navigate-to="navigateTo" @navigated="navigateTo = null" /></div>
        <div v-if="isTabOpen('trace-replay')" v-show="currentTab === 'trace-replay'" class="tab-pane"><TraceReplay :navigate-to="navigateTo" /></div>
        <div v-if="isTabOpen('autodev')" v-show="currentTab === 'autodev'" class="tab-pane"><AutoDevOps @navigate="handleWorkbenchNavigate" /></div>
        <div v-if="isTabOpen('knowledge')" v-show="currentTab === 'knowledge'" class="tab-pane"><KnowledgeBase /></div>
        <div v-if="isTabOpen('memory-center')" v-show="currentTab === 'memory-center'" class="tab-pane"><MemoryCenter /></div>
        <div v-if="isTabOpen('cleanup-center')" v-show="currentTab === 'cleanup-center'" class="tab-pane"><CleanupCenter @navigate="switchTab" /></div>
        <div v-if="isTabOpen('cron')" v-show="currentTab === 'cron'" class="tab-pane"><CronJobs @navigate="handleWorkbenchNavigate" /></div>
        <div v-if="isTabOpen('terminal')" v-show="currentTab === 'terminal'" class="tab-pane"><Terminal /></div>
        <div v-if="isTabOpen('dashboard')" v-show="currentTab === 'dashboard'" class="tab-pane scrollable-pane"><UsabilityWorkbench @navigate="handleWorkbenchNavigate" /></div>
        <div v-if="isTabOpen('metrics')" v-show="currentTab === 'metrics'" class="tab-pane"><AgentMetrics :active="currentTab === 'metrics'" @navigate="handleWorkbenchNavigate" /></div>
        <div v-if="isTabOpen('search')" v-show="currentTab === 'search'" class="tab-pane"><SearchHistory @go-to="goToResult" /></div>
        <!-- Load the audio engine on first use; keep it mounted afterwards for cross-page playback. -->
        <div v-if="musicPlayerActivated" v-show="currentTab === 'music'" class="tab-pane"><MusicPlayer :active="currentTab === 'music'" :agent-label="musicPetLabel" /></div>
        <MusicRemoteHost @switch-tab="switchTab" />
        <div v-if="isTabOpen('settings')" v-show="currentTab === 'settings'" class="tab-pane"><Settings /></div>
        <div v-if="isTabOpen('menumanager')" v-show="currentTab === 'menumanager'" class="tab-pane"><MenuManager :tabs="tabs" :config="menuConfig" @update-config="updateMenuConfiguration" /></div>
      </div>
    </main>

    <!-- 移动端底部 Tab 栏 -->
    <div v-if="isMobile && showMobileMenu" class="mobile-menu-backdrop" @click="showMobileMenu = false"></div>
    <section v-if="isMobile && showMobileMenu" class="mobile-more-menu" aria-label="更多功能">
      <div class="mobile-more-header">
        <div>
          <strong>更多功能</strong>
          <span>打开项目、工具和系统页面</span>
        </div>
        <button type="button" aria-label="关闭更多功能" title="关闭" @click="showMobileMenu = false"><X :size="18" /></button>
      </div>
      <div class="mobile-more-grid">
        <button
          v-for="tab in mobileMoreTabs"
          :key="tab.id"
          type="button"
          :class="{ active: currentTab === tab.id }"
          @mouseenter="preloadTab(tab.id)"
          @focus="preloadTab(tab.id)"
          @click="openMobileTab(tab.id)"
        >
          <component :is="getTabIcon(tab.id)" :size="19" />
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </section>

    <nav class="bottom-bar" v-if="isMobile" aria-label="移动端主导航">
      <button
        v-for="tab in mobilePrimaryTabs"
        :key="tab.id"
        class="bottom-item"
        :class="{ active: currentTab === tab.id }"
        type="button"
        @mouseenter="preloadTab(tab.id)"
        @focus="preloadTab(tab.id)"
        @click="openMobileTab(tab.id)"
      >
        <component :is="getTabIcon(tab.id)" class="bottom-icon" :size="19" />
        <span class="bottom-label">{{ tab.label.replace('我的', '') }}</span>
      </button>
      <button class="bottom-item" :class="{ active: mobileMoreActive || showMobileMenu }" type="button" @click="showMobileMenu = !showMobileMenu">
        <Menu class="bottom-icon" :size="19" />
        <span class="bottom-label">更多</span>
      </button>
    </nav>

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
  width: 232px;
  min-width: 232px;
  background: var(--surface-nav);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  padding: 10px 8px;
  box-shadow: none;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 14px;
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 10px;
}

.brand-home {
  min-width: 0;
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.brand-mark {
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--accent-blue) 28%, var(--border-color));
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent-blue) 9%, var(--surface));
  color: var(--accent-blue);
}

.brand-copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.brand-copy strong {
  font-size: 16px;
  line-height: 1;
  font-weight: 820;
}

.brand-copy small {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 10px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand-version {
  flex: 0 0 auto;
  align-self: flex-start;
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 9px;
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
  min-height: 34px;
  padding: 7px 9px;
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
  flex: 0 0 auto;
  width: 20px;
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
  min-height: 48px;
  height: 48px;
  padding: 0 10px 0 16px;
  background: var(--surface);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 12px;
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
  min-width: 142px;
  display: none;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 760;
  letter-spacing: 0;
  color: var(--text-primary);
}

.tab-bar {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: 0;
  overflow-x: auto;
  min-height: 32px;
  padding: 0;
  scrollbar-width: none;
}
.tab-bar::-webkit-scrollbar { display: none; }
.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 8px;
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
  background: var(--accent-soft);
  color: var(--accent-blue);
  border-color: var(--border-color);
}
.tab-icon { flex: 0 0 auto; }
.tab-label { max-width: 100px; overflow: hidden; text-overflow: ellipsis; }
.tab-close {
  width: 16px; height: 16px;
  border: none; background: none;
  color: var(--text-muted);
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

.tab-pane.scrollable-pane {
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.tab-pane.pet-tab-pane {
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.content-area.pets-content-area {
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
}

.content-area.pets-content-area .tab-pane.pet-tab-pane {
  position: relative;
  inset: auto;
  min-height: calc(100% - 24px);
  margin: 12px;
  overflow: visible;
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
  height: calc(58px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--surface);
  border-top: 1px solid var(--border-color);
  display: flex;
  z-index: 1000;
  overflow: hidden;
  box-shadow: 0 -8px 24px rgba(20, 24, 22, 0.08);
}
.bottom-item {
  flex: 1 1 20%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  color: var(--text-muted);
  transition: all 0.2s;
  padding: 4px 0;
  border: 0;
  background: transparent;
  font: inherit;
}
.bottom-item.active {
  color: var(--accent-blue);
  background: var(--accent-soft);
}
.bottom-icon { flex: 0 0 auto; }
.bottom-label { max-width: 100%; overflow: hidden; text-overflow: ellipsis; font-size: 10px; white-space: nowrap; }

.content-area.has-bottom-bar {
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
}

.mobile-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1080;
  background: rgba(18, 24, 20, 0.42);
}

.mobile-more-menu {
  position: fixed;
  left: 8px;
  right: 8px;
  bottom: calc(66px + env(safe-area-inset-bottom));
  z-index: 1090;
  max-height: min(70vh, 560px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow-lg);
}

.mobile-more-header {
  min-height: 56px;
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--border-color);
}

.mobile-more-header > div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mobile-more-header strong { font-size: 14px; }
.mobile-more-header span { color: var(--text-muted); font-size: 11px; }
.mobile-more-header button {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-secondary);
}

.mobile-more-grid {
  padding: 8px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  overflow-y: auto;
}

.mobile-more-grid button {
  min-width: 0;
  min-height: 46px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: var(--panel-muted);
  color: var(--text-secondary);
  font: inherit;
  font-size: 12px;
  text-align: left;
}

.mobile-more-grid button.active {
  border-color: color-mix(in srgb, var(--accent-blue) 28%, transparent);
  background: var(--accent-soft);
  color: var(--accent-blue);
}

.mobile-more-grid button span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .nav-sidebar {
    display: none !important;
  }
  .header {
    min-height: 48px;
    height: 48px;
    padding: 0 14px;
  }
  .header h2 {
    min-width: 0;
    flex: 1;
    display: flex;
    font-size: 14px;
  }
  .tab-bar {
    display: none;
  }
  .tab-pane {
    inset: 0 0 calc(58px + env(safe-area-inset-bottom));
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
.group-arrow { flex: 0 0 auto; transition: transform 0.2s; }
.group-arrow.collapsed { transform: rotate(-90deg); }
.group-icon { flex: 0 0 auto; opacity: 0.82; }
.nav-group-items { display: flex; flex-direction: column; gap: 2px; }

</style>
