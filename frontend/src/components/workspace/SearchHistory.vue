<script setup>
import { computed, nextTick, onUnmounted, ref } from 'vue'
import {
  Bot,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FolderKanban,
  Layers3,
  LoaderCircle,
  MessageSquareText,
  MessagesSquare,
  RefreshCw,
  Search,
  Send,
  SlidersHorizontal,
  Trash2,
  X,
} from '@lucide/vue'
import ConversationSearchResult from './search/ConversationSearchResult.vue'
import { toast } from '../../utils/toast.js'

const emit = defineEmits(['go-to'])
const RECENT_KEY = 'ccm-conversation-search-recent-v2'
const FAVORITES_KEY = 'ccm-conversation-search-favorites-v2'

const query = ref('')
const source = ref('all')
const role = ref('')
const agent = ref('')
const location = ref('')
const timeRange = ref('all')
const startDate = ref('')
const endDate = ref('')
const matchMode = ref('all')
const sort = ref('newest')
const showFilters = ref(false)
const viewMode = ref('results')
const loading = ref(false)
const searched = ref(false)
const errorMessage = ref('')
const response = ref({ results: [], total: 0, page: 1, page_count: 0, facets: {}, query: { terms: [] } })
const sourceCounts = ref({})
const sourceFilters = [
  { id: 'all', label: '全部', icon: Layers3 },
  { id: 'global', label: '全局助手', icon: Bot },
  { id: 'group', label: '群聊', icon: MessagesSquare },
  { id: 'project', label: '项目', icon: FolderKanban },
  { id: 'feishu', label: '飞书', icon: Send },
]
const pageSize = 25
let activeRequest = null
let requestSequence = 0

const readStored = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch { return [] }
}

const recentSearches = ref(readStored(RECENT_KEY))
const favorites = ref(readStored(FAVORITES_KEY))
const results = computed(() => response.value.results || [])
const terms = computed(() => response.value.query?.terms || query.value.trim().split(/\s+/).filter(Boolean))
const locationOptions = computed(() => {
  const facets = response.value.facets || {}
  const projects = Object.entries(facets.projects || {}).filter(([name]) => name && name !== '未标记').map(([name, count]) => ({ value: `project:${name}`, label: `项目 · ${name}`, count }))
  const groups = Object.entries(facets.groups || {}).filter(([name]) => name && name !== '未标记').map(([name, count]) => ({ value: `group-name:${name}`, label: `群聊 · ${name}`, count }))
  return [...projects, ...groups]
})
const activeFilterCount = computed(() => [role.value, agent.value, location.value, timeRange.value !== 'all' ? timeRange.value : '', matchMode.value !== 'all' ? matchMode.value : '', sort.value !== 'newest' ? sort.value : ''].filter(Boolean).length)
const favoriteIds = computed(() => new Set(favorites.value.map(item => item.id)))

const persist = (key, value) => localStorage.setItem(key, JSON.stringify(value))

const dateBounds = () => {
  const now = new Date()
  if (timeRange.value === 'today') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return { start: start.toISOString(), end: '' }
  }
  if (['3days', 'week', 'month'].includes(timeRange.value)) {
    const days = timeRange.value === '3days' ? 3 : timeRange.value === 'week' ? 7 : 30
    return { start: new Date(now.getTime() - days * 86_400_000).toISOString(), end: '' }
  }
  if (timeRange.value === 'custom') {
    const start = startDate.value ? new Date(`${startDate.value}T00:00:00`).toISOString() : ''
    const end = endDate.value ? new Date(new Date(`${endDate.value}T00:00:00`).getTime() + 86_400_000).toISOString() : ''
    return { start, end }
  }
  return { start: '', end: '' }
}

const buildParams = (page = 1) => {
  const params = new URLSearchParams({ q: query.value.trim(), page: String(page), page_size: String(pageSize), source: source.value, match: matchMode.value, sort: sort.value })
  if (role.value) params.set('role', role.value)
  if (agent.value.trim()) params.set('agent', agent.value.trim())
  if (location.value.startsWith('project:')) params.set('project', location.value.slice(8))
  if (location.value.startsWith('group:')) params.set('group_id', location.value.slice(6))
  if (location.value.startsWith('group-name:')) params.set('group_name', location.value.slice(11))
  const bounds = dateBounds()
  if (bounds.start) params.set('start', bounds.start)
  if (bounds.end) params.set('end', bounds.end)
  return params
}

const saveRecent = () => {
  const item = { id: `${query.value.trim()}|${source.value}|${role.value}|${timeRange.value}|${matchMode.value}`, query: query.value.trim(), source: source.value, role: role.value, agent: agent.value, location: location.value, timeRange: timeRange.value, startDate: startDate.value, endDate: endDate.value, matchMode: matchMode.value, sort: sort.value, searchedAt: new Date().toISOString() }
  recentSearches.value = [item, ...recentSearches.value.filter(row => row.id !== item.id)].slice(0, 10)
  persist(RECENT_KEY, recentSearches.value)
}

const search = async (page = 1, { remember = true } = {}) => {
  if (!query.value.trim()) return
  activeRequest?.abort()
  const controller = new AbortController()
  activeRequest = controller
  const sequence = ++requestSequence
  loading.value = true
  searched.value = true
  viewMode.value = 'results'
  errorMessage.value = ''
  try {
    const res = await fetch(`/api/search?${buildParams(page)}`, { signal: controller.signal })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || data.success === false) throw new Error(data.error || `搜索失败 (${res.status})`)
    if (sequence !== requestSequence) return
    response.value = data
    const facetCounts = data.facets?.conversation_types || {}
    sourceCounts.value = source.value === 'all'
      ? { ...sourceCounts.value, ...facetCounts, all: Number(data.total || 0) }
      : { ...sourceCounts.value, [source.value]: Number(data.total || 0) }
    if (remember && page === 1) saveRecent()
  } catch (error) {
    if (error.name !== 'AbortError' && sequence === requestSequence) {
      errorMessage.value = error.message || '对话搜索暂时不可用'
      toast.error(errorMessage.value)
    }
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

const applyRecent = async (item) => {
  query.value = item.query || ''
  source.value = item.source || 'all'
  role.value = item.role || ''
  agent.value = item.agent || ''
  location.value = item.location || ''
  timeRange.value = item.timeRange || 'all'
  startDate.value = item.startDate || ''
  endDate.value = item.endDate || ''
  matchMode.value = item.matchMode || 'all'
  sort.value = item.sort || 'newest'
  await nextTick()
  search(1)
}

const clearSearch = () => {
  activeRequest?.abort()
  query.value = ''
  searched.value = false
  errorMessage.value = ''
  response.value = { results: [], total: 0, page: 1, page_count: 0, facets: {}, query: { terms: [] } }
}

const resetFilters = () => {
  role.value = ''
  agent.value = ''
  location.value = ''
  timeRange.value = 'all'
  startDate.value = ''
  endDate.value = ''
  matchMode.value = 'all'
  sort.value = 'newest'
  if (searched.value) search(1, { remember: false })
}

const selectSource = (id) => {
  source.value = id
  viewMode.value = 'results'
  if (searched.value) search(1, { remember: false })
}

const showFavorites = () => {
  viewMode.value = 'favorites'
}

const sourceCount = id => searched.value && Number.isFinite(Number(sourceCounts.value[id]))
  ? Number(sourceCounts.value[id])
  : null

const toggleFavorite = (item) => {
  if (favoriteIds.value.has(item.id)) {
    favorites.value = favorites.value.filter(row => row.id !== item.id)
    toast.info('已取消收藏')
  } else {
    favorites.value = [{ ...item, favoriteAt: new Date().toISOString() }, ...favorites.value].slice(0, 50)
    toast.success('已收藏这条消息')
  }
  persist(FAVORITES_KEY, favorites.value)
}

const copyText = async (value, message) => {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(message)
  } catch { toast.error('复制失败') }
}

const copyResult = item => copyText(item.content || '', '已复制消息')
const copyMarkdown = item => copyText(`### ${item.sourceLabel} · ${item.sessionName}\n\n- 时间：${formatTime(item.timestamp)}\n- 角色：${item.role === 'user' ? '用户' : item.agent || 'Agent'}\n${item.taskId ? `- 关联任务：${item.taskTitle || item.taskId}\n` : ''}\n${item.content || ''}`, '已复制 Markdown')
const goTo = item => emit('go-to', { ...item, query: query.value.trim() || (item.matchTerms || []).join(' ') })
const goToTask = item => emit('go-to', { conversationType: 'task', taskId: item.taskId })
const formatTime = value => value ? new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '时间未记录'
const sourceLabel = value => ({ all: '全部来源', global: '全局助手', group: '群聊', project: '项目', feishu: '飞书' }[value] || '全部来源')
const recentMeta = item => [
  sourceLabel(item?.source),
  item?.role === 'user' ? '用户消息' : item?.role === 'assistant' ? 'Agent 回复' : '',
  item?.timeRange && item.timeRange !== 'all' ? '限定时间' : '',
].filter(Boolean).join(' · ')

onUnmounted(() => activeRequest?.abort())
</script>

<template>
  <div class="conversation-search-page">
    <header class="search-workspace-header">
      <div class="search-heading">
        <span class="heading-icon"><MessageSquareText :size="19" /></span>
        <div><strong>对话搜索</strong><span>跨会话查找消息、任务与附件记录</span></div>
      </div>
      <div class="search-command-bar">
        <div class="search-input-wrap">
          <Search class="search-symbol" :size="17" aria-hidden="true" />
          <input v-model="query" type="search" placeholder="输入关键词搜索对话" aria-label="搜索对话" autofocus @keydown.enter="search(1)">
          <button v-if="query" class="icon-button" title="清空搜索" aria-label="清空搜索" @click="clearSearch"><X :size="15" /></button>
        </div>
        <button class="filter-button" :class="{ active: showFilters || activeFilterCount }" @click="showFilters = !showFilters">
          <SlidersHorizontal :size="15" />筛选<span v-if="activeFilterCount" class="filter-count">{{ activeFilterCount }}</span>
        </button>
        <button class="primary-button" :disabled="loading || !query.trim()" @click="search(1)">
          <LoaderCircle v-if="loading" :size="15" class="spinning" /><Search v-else :size="15" />{{ loading ? '搜索中' : '搜索' }}
        </button>
      </div>
      <div class="source-toolbar">
        <span class="source-toolbar-label">范围</span>
        <nav class="source-tabs" aria-label="对话来源">
          <div class="source-filter-group">
            <button v-for="item in sourceFilters" :key="item.id" :class="{ active: source === item.id && viewMode !== 'favorites' }" :aria-pressed="source === item.id && viewMode !== 'favorites'" @click="selectSource(item.id)">
              <component :is="item.icon" :size="13" aria-hidden="true" />
              <span>{{ item.label }}</span>
              <small v-if="sourceCount(item.id) !== null" class="source-count">{{ sourceCount(item.id) }}</small>
            </button>
          </div>
          <button class="favorites-tab" :class="{ active: viewMode === 'favorites' }" :aria-pressed="viewMode === 'favorites'" @click="showFavorites"><Bookmark :size="13" /><span>收藏</span><small v-if="favorites.length" class="tab-count">{{ favorites.length }}</small></button>
        </nav>
      </div>
    </header>

    <section v-if="showFilters" class="filter-panel">
      <div class="filter-panel-head">
        <div><SlidersHorizontal :size="15" /><strong>高级筛选</strong><span v-if="activeFilterCount">已启用 {{ activeFilterCount }} 项</span></div>
        <button :disabled="!activeFilterCount" @click="resetFilters"><RefreshCw :size="13" />重置</button>
      </div>
      <div class="filter-grid">
      <label><span>匹配方式</span><select v-model="matchMode"><option value="all">包含全部词</option><option value="phrase">完整短语</option><option value="any">包含任一词</option></select></label>
      <label><span>发送角色</span><select v-model="role"><option value="">全部角色</option><option value="user">用户</option><option value="assistant">Agent</option><option value="system">系统</option></select></label>
      <label><span>Agent</span><input v-model="agent" placeholder="全部 Agent"></label>
      <label><span>位置</span><select v-model="location"><option value="">全部位置</option><option v-for="item in locationOptions" :key="item.value" :value="item.value">{{ item.label }} ({{ item.count }})</option></select></label>
      <label><span>时间</span><select v-model="timeRange"><option value="all">全部时间</option><option value="today">今天</option><option value="3days">最近 3 天</option><option value="week">最近 7 天</option><option value="month">最近 30 天</option><option value="custom">自定义</option></select></label>
      <label><span>排序</span><select v-model="sort"><option value="newest">最新在前</option><option value="oldest">最早在前</option></select></label>
      <template v-if="timeRange === 'custom'"><label><span>开始日期</span><input v-model="startDate" type="date"></label><label><span>结束日期</span><input v-model="endDate" type="date"></label></template>
      </div>
      <div class="filter-actions"><button class="apply-filter" :disabled="!query.trim()" @click="search(1)"><Search :size="14" />应用筛选</button></div>
    </section>

    <main class="search-content">
      <section v-if="viewMode === 'favorites'" class="saved-view">
        <div class="result-summary"><div><Bookmark :size="16" /><strong>收藏消息</strong></div><span>{{ favorites.length }} 条</span></div>
        <div v-if="!favorites.length" class="empty-state"><Bookmark :size="24" /><strong>还没有收藏消息</strong><span>搜索结果中的收藏内容会出现在这里</span></div>
        <div v-else class="result-list">
          <ConversationSearchResult v-for="item in favorites" :key="item.id" :item="item" :terms="item.matchTerms || []" favorite @open="goTo" @task="goToTask" @favorite="toggleFavorite" @copy="copyResult" @copy-markdown="copyMarkdown" />
        </div>
      </section>

      <template v-else>
        <section v-if="!searched" class="start-view">
          <div v-if="recentSearches.length" class="recent-section">
            <div class="result-summary">
              <div><Clock3 :size="16" /><strong>最近搜索</strong><span>{{ recentSearches.length }} 条</span></div>
              <button class="clear-history" @click="recentSearches = []; persist(RECENT_KEY, [])"><Trash2 :size="13" />清除记录</button>
            </div>
            <div class="recent-list">
              <button v-for="item in recentSearches" :key="item.id" @click="applyRecent(item)">
                <span class="recent-icon"><Search :size="15" /></span>
                <span class="recent-copy"><strong>{{ item.query }}</strong><small>{{ recentMeta(item) }}</small></span>
                <time>{{ formatTime(item.searchedAt) }}</time>
                <ChevronRight :size="16" />
              </button>
            </div>
          </div>
          <div v-else class="empty-state"><Search :size="24" /><strong>输入关键词开始搜索</strong><span>暂无最近搜索记录</span></div>
        </section>

        <div v-else-if="errorMessage" class="error-state"><strong>搜索暂时不可用</strong><span>{{ errorMessage }}</span><button @click="search(response.page || 1, { remember: false })"><RefreshCw :size="14" />重试</button></div>
        <div v-else-if="loading && !results.length" class="empty-state"><LoaderCircle :size="24" class="spinning" /><strong>正在搜索</strong><span>正在整理匹配消息</span></div>
        <section v-else class="results-view">
          <div class="result-summary"><div><Search :size="16" /><strong>搜索结果</strong><span>{{ response.total || 0 }} 条</span></div><span v-if="response.total">第 {{ response.page }} / {{ response.page_count }} 页</span></div>
          <div v-if="!results.length" class="empty-state"><Search :size="24" /><strong>没有找到匹配消息</strong><span>调整关键词或筛选条件后重新搜索</span></div>
          <div v-else class="result-list">
            <ConversationSearchResult v-for="item in results" :key="item.id" :item="item" :terms="terms" :favorite="favoriteIds.has(item.id)" @open="goTo" @task="goToTask" @favorite="toggleFavorite" @copy="copyResult" @copy-markdown="copyMarkdown" />
          </div>
          <nav v-if="response.page_count > 1" class="pagination" aria-label="搜索结果分页">
            <button :disabled="response.page <= 1 || loading" @click="search(response.page - 1, { remember: false })"><ChevronLeft :size="14" />上一页</button>
            <span>{{ response.page }} / {{ response.page_count }}</span>
            <button :disabled="!response.has_more || loading" @click="search(response.page + 1, { remember: false })">下一页<ChevronRight :size="14" /></button>
          </nav>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.conversation-search-page { display: flex; flex-direction: column; height: 100%; min-width: 0; overflow: hidden; background: var(--bg-primary); color: var(--text-primary); }
.search-command-bar { display: grid; grid-template-columns: minmax(220px, 1fr) auto auto; gap: 8px; padding: 14px 20px 10px; border-bottom: 1px solid var(--border-color); background: var(--surface); }
.search-input-wrap { position: relative; display: flex; align-items: center; min-width: 0; }
.search-symbol { position: absolute; left: 12px; color: var(--text-muted); font-size: 20px; }
.search-input-wrap input { width: 100%; min-height: 38px; padding: 8px 36px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-primary); color: var(--text-primary); font: inherit; font-size: 13px; }
.search-input-wrap input:focus { border-color: var(--accent-blue); outline: 2px solid color-mix(in srgb, var(--accent-blue) 14%, transparent); }
.icon-button { position: absolute; right: 8px; width: 26px; height: 26px; border: 0; background: transparent; color: var(--text-muted); font-size: 18px; cursor: pointer; }
.filter-button, .primary-button, .filter-actions button, .pagination button { min-height: 38px; padding: 8px 13px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--surface); color: var(--text-secondary); font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
.filter-button.active { border-color: color-mix(in srgb, var(--accent-blue) 45%, var(--border-color)); color: var(--accent-blue); }
.primary-button, .filter-actions .apply-filter { border-color: var(--accent-blue); background: var(--accent-blue); color: white; }
button:disabled { opacity: .5; cursor: not-allowed; }
.source-tabs { display: flex; gap: 6px; max-width: 100%; overflow-x: auto; }
.source-tabs button { flex: 0 0 auto; border: 0; background: transparent; color: var(--text-muted); font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
.source-tabs button.active { color: var(--accent-blue); }
.filter-panel { display: grid; grid-template-columns: repeat(6, minmax(120px, 1fr)); gap: 10px; padding: 12px 20px; border-bottom: 1px solid var(--border-color); background: var(--surface); }
.filter-panel label { display: grid; gap: 5px; min-width: 0; }
.filter-panel label span { color: var(--text-muted); font-size: 10.5px; font-weight: 700; }
.filter-panel input, .filter-panel select { width: 100%; min-width: 0; min-height: 34px; padding: 6px 8px; border: 1px solid var(--border-color); border-radius: 5px; background: var(--bg-primary); color: var(--text-primary); font: inherit; font-size: 11.5px; }
.filter-actions { display: flex; align-items: end; gap: 7px; }
.filter-actions button { min-height: 34px; padding: 6px 10px; }
.search-content { flex: 1; min-height: 0; overflow-y: auto; }
.start-view, .results-view, .saved-view { width: min(100%, 1100px); margin: 0 auto; padding: 14px 20px 40px; }
.result-summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 34px; color: var(--text-muted); font-size: 11.5px; }
.result-summary strong { color: var(--text-primary); font-size: 12.5px; }
.result-summary button { border: 0; background: transparent; color: var(--accent-blue); font: inherit; cursor: pointer; }
.result-list { border-top: 1px solid var(--border-color); }
.recent-section { max-width: 760px; margin: 0 auto; }
.recent-list { display: grid; border-top: 1px solid var(--border-color); }
.recent-list button { display: flex; justify-content: space-between; gap: 16px; padding: 12px 4px; border: 0; border-bottom: 1px solid var(--border-color); background: transparent; color: var(--text-primary); text-align: left; cursor: pointer; }
.recent-list small { flex: 0 0 auto; color: var(--text-muted); }
.empty-state, .error-state { margin: 0; padding: 70px 20px; color: var(--text-muted); text-align: center; }
.error-state { color: #b91c1c; }
.error-state button { margin-left: 8px; border: 0; background: transparent; color: var(--accent-blue); cursor: pointer; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 18px 0 4px; color: var(--text-muted); font-size: 12px; }
.pagination button { min-height: 32px; padding: 5px 10px; }
@media (max-width: 980px) { .filter-panel { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 640px) {
  .search-command-bar { grid-template-columns: minmax(0, 1fr) auto; padding: 10px; }
  .search-command-bar .search-input-wrap { grid-column: 1 / -1; }
  .filter-button, .primary-button { min-height: 34px; }
  .source-tabs { width: 100%; }
  .filter-panel { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 10px; }
  .filter-actions { grid-column: 1 / -1; }
  .start-view, .results-view, .saved-view { padding: 10px 10px 90px; }
}

/* Search workspace redesign */
.conversation-search-page { background:var(--bg-secondary); }
.search-workspace-header { display:grid; gap:14px; padding:18px 24px 14px; border-bottom:1px solid var(--border-color); background:var(--bg-primary); }
.search-heading { display:flex; align-items:center; gap:10px; }
.heading-icon { width:34px; height:34px; display:flex; align-items:center; justify-content:center; flex:0 0 auto; border-radius:7px; color:#0f766e; background:rgba(13,148,136,.09); border:1px solid rgba(13,148,136,.14); }
.search-heading > div { display:grid; gap:2px; min-width:0; }
.search-heading strong { color:var(--text-primary); font-size:14px; }
.search-heading span:not(.heading-icon) { color:var(--text-muted); font-size:10.5px; }
.search-command-bar { width:100%; max-width:1180px; display:grid; grid-template-columns:minmax(240px,1fr) auto auto; gap:8px; padding:0; border:0; background:transparent; }
.search-input-wrap { height:42px; }
.search-symbol { position:absolute; left:13px; color:var(--text-muted); pointer-events:none; }
.search-input-wrap input { min-height:42px; padding:9px 40px; border-radius:7px; background:var(--surface); font-size:12.5px; }
.search-input-wrap input::placeholder { color:var(--text-muted); }
.search-input-wrap input:focus { border-color:rgba(37,99,235,.45); outline:3px solid rgba(37,99,235,.08); }
.icon-button { display:flex; align-items:center; justify-content:center; border-radius:5px; }
.icon-button:hover { background:var(--bg-secondary); color:var(--text-primary); }
.filter-button,.primary-button { min-height:42px; display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:8px 14px; border-radius:7px; }
.filter-button:hover { background:var(--bg-secondary); color:var(--text-primary); }
.filter-count,.tab-count { min-width:18px; height:18px; display:inline-flex; align-items:center; justify-content:center; padding:0 5px; border-radius:9px; background:rgba(37,99,235,.1); color:#2563eb; font-size:9.5px; }
.primary-button { min-width:84px; background:#2563eb; border-color:#2563eb; }
.primary-button:hover:not(:disabled) { background:#1d4ed8; }
.source-toolbar { width:100%; max-width:1180px; display:flex; align-items:center; gap:9px; min-width:0; }
.source-toolbar-label { flex:0 0 auto; color:var(--text-muted); font-size:10px; font-weight:700; }
.source-tabs { min-height:34px; align-items:center; gap:7px; padding:0; border:0; background:transparent; scrollbar-width:none; }
.source-tabs::-webkit-scrollbar { display:none; }
.source-filter-group { display:flex; align-items:center; gap:2px; padding:3px; border:1px solid var(--border-color); border-radius:7px; background:var(--bg-secondary); }
.source-tabs button { min-height:27px; display:inline-flex; align-items:center; justify-content:center; gap:5px; padding:5px 9px; border-radius:5px; font-size:11px; }
.source-tabs button:hover { color:var(--text-primary); background:var(--surface); }
.source-tabs button.active { color:#1d4ed8; background:var(--bg-primary); box-shadow:0 1px 3px rgba(15,23,42,.08); }
.source-tabs .favorites-tab { min-height:34px; padding:6px 10px; border:1px solid var(--border-color); border-radius:7px; background:var(--surface); }
.source-tabs .favorites-tab.active { border-color:rgba(37,99,235,.28); background:rgba(37,99,235,.07); box-shadow:none; }
.source-count { min-width:16px; color:var(--text-muted); font-size:9px; font-weight:600; text-align:center; }
.source-tabs button.active .source-count { color:#2563eb; }
.filter-panel { display:grid; grid-template-columns:1fr auto; gap:12px 16px; padding:14px 24px 16px; background:var(--bg-primary); box-shadow:0 7px 18px rgba(15,23,42,.035); }
.filter-panel-head { grid-column:1 / -1; display:flex; align-items:center; justify-content:space-between; gap:12px; }
.filter-panel-head > div { display:flex; align-items:center; gap:7px; color:var(--text-muted); }
.filter-panel-head strong { color:var(--text-primary); font-size:11.5px; }
.filter-panel-head span { font-size:10px; }
.filter-panel-head button { display:inline-flex; align-items:center; gap:5px; padding:4px 7px; border:0; background:transparent; color:var(--text-muted); font:inherit; font-size:10.5px; cursor:pointer; }
.filter-grid { display:grid; grid-template-columns:repeat(6,minmax(110px,1fr)); gap:10px; min-width:0; }
.filter-panel label { gap:6px; }
.filter-panel label span { font-size:10px; }
.filter-panel input,.filter-panel select { min-height:36px; border-radius:6px; background:var(--surface); }
.filter-actions { align-items:end; }
.filter-actions .apply-filter { min-height:36px; display:inline-flex; align-items:center; gap:6px; white-space:nowrap; border-radius:6px; }
.search-content { background:var(--bg-secondary); scrollbar-gutter:stable; }
.start-view,.results-view,.saved-view { width:min(100%,1040px); padding:22px 24px 48px; }
.result-summary { min-height:38px; margin-bottom:8px; }
.result-summary > div { display:flex; align-items:center; gap:7px; color:var(--text-muted); }
.result-summary strong { font-size:12.5px; }
.result-summary > div > span { padding-left:7px; border-left:1px solid var(--border-color); font-size:10.5px; }
.clear-history { display:inline-flex; align-items:center; gap:5px; padding:5px 7px !important; border-radius:5px !important; color:var(--text-muted) !important; font-size:10.5px !important; }
.clear-history:hover { background:var(--bg-primary) !important; color:#b91c1c !important; }
.recent-section { max-width:900px; }
.recent-list { grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; border:0; }
.recent-list button { min-width:0; display:grid; grid-template-columns:30px minmax(0,1fr) auto 16px; align-items:center; gap:10px; padding:11px 12px; border:1px solid var(--border-color); border-radius:7px; background:var(--bg-primary); transition:border-color .18s,background .18s,transform .18s; }
.recent-list button:hover { border-color:rgba(37,99,235,.26); background:var(--surface); transform:translateY(-1px); }
.recent-icon { width:30px; height:30px; display:flex; align-items:center; justify-content:center; border-radius:6px; color:#0f766e; background:rgba(13,148,136,.08); }
.recent-copy { display:grid; gap:3px; min-width:0; }
.recent-copy strong { overflow:hidden; color:var(--text-primary); font-size:11.5px; text-overflow:ellipsis; white-space:nowrap; }
.recent-copy small { overflow:hidden; color:var(--text-muted); font-size:9.5px; text-overflow:ellipsis; white-space:nowrap; }
.recent-list time { color:var(--text-muted); font-size:9.5px; white-space:nowrap; }
.recent-list button > svg { color:var(--text-muted); }
.result-list { display:grid; gap:9px; border:0; }
.result-list :deep(.search-result-row) { padding:14px 15px 12px; border:1px solid var(--border-color); border-radius:7px; background:var(--bg-primary); transition:border-color .18s,box-shadow .18s; }
.result-list :deep(.search-result-row:hover) { border-color:rgba(37,99,235,.24); box-shadow:0 5px 16px rgba(15,23,42,.035); }
.empty-state,.error-state { min-height:260px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; margin:0; padding:48px 20px; color:var(--text-muted); text-align:center; }
.empty-state > svg { color:#94a3b8; }
.empty-state strong,.error-state strong { color:var(--text-primary); font-size:12.5px; }
.empty-state span,.error-state span { font-size:10.5px; }
.error-state { color:#b91c1c; }
.error-state button { display:inline-flex; align-items:center; gap:5px; margin:5px 0 0; padding:6px 9px; border:1px solid rgba(185,28,28,.18); border-radius:6px; background:rgba(239,68,68,.06); color:#b91c1c; }
.pagination button { display:inline-flex; align-items:center; gap:4px; border-radius:6px; }
.spinning { animation:search-spin .85s linear infinite; }
@keyframes search-spin { to { transform:rotate(360deg); } }

@media (max-width:980px) {
  .filter-panel { grid-template-columns:1fr; }
  .filter-grid { grid-template-columns:repeat(3,minmax(0,1fr)); }
  .filter-actions { justify-content:flex-end; }
}

@media (max-width:640px) {
  .search-workspace-header { padding:12px 10px 10px; gap:10px; }
  .search-heading span:not(.heading-icon) { display:none; }
  .search-command-bar { grid-template-columns:minmax(0,1fr) auto; padding:0; }
  .search-command-bar .search-input-wrap { grid-column:1 / -1; }
  .filter-button,.primary-button { min-height:36px; }
  .source-toolbar { gap:0; }
  .source-toolbar-label { display:none; }
  .source-tabs { width:100%; gap:6px; }
  .source-filter-group { flex:0 0 auto; }
  .source-tabs button { padding:5px 8px; }
  .source-filter-group button > svg,.source-count { display:none; }
  .filter-panel { padding:12px 10px; }
  .filter-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .filter-actions .apply-filter { width:100%; justify-content:center; }
  .start-view,.results-view,.saved-view { padding:14px 10px 90px; }
  .recent-list { grid-template-columns:1fr; }
  .recent-list time { display:none; }
  .result-list :deep(.search-result-row) { padding:12px; }
}
</style>
  FolderKanban,
  Layers3,
  Send,
