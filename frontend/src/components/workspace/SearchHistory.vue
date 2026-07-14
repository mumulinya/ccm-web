<script setup>
import { computed, nextTick, onUnmounted, ref } from 'vue'
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

onUnmounted(() => activeRequest?.abort())
</script>

<template>
  <div class="conversation-search-page">
    <header class="search-command-bar">
      <div class="search-input-wrap">
        <span class="search-symbol" aria-hidden="true">⌕</span>
        <input v-model="query" type="search" placeholder="搜索对话" aria-label="搜索对话" autofocus @keydown.enter="search(1)">
        <button v-if="query" class="icon-button" title="清空搜索" aria-label="清空搜索" @click="clearSearch">×</button>
      </div>
      <button class="filter-button" :class="{ active: showFilters || activeFilterCount }" @click="showFilters = !showFilters">
        筛选<span v-if="activeFilterCount"> {{ activeFilterCount }}</span>
      </button>
      <button class="primary-button" :disabled="loading || !query.trim()" @click="search(1)">{{ loading ? '搜索中' : '搜索' }}</button>
    </header>

    <nav class="source-tabs" aria-label="对话来源">
      <button v-for="item in [{ id: 'all', label: '全部' }, { id: 'global', label: '全局助手' }, { id: 'group', label: '群聊' }, { id: 'project', label: '项目' }, { id: 'feishu', label: '飞书' }]" :key="item.id" :class="{ active: source === item.id }" @click="source = item.id; searched && search(1, { remember: false })">
        {{ item.label }}
      </button>
      <button class="favorites-tab" :class="{ active: viewMode === 'favorites' }" @click="viewMode = 'favorites'">收藏 {{ favorites.length || '' }}</button>
    </nav>

    <section v-if="showFilters" class="filter-panel">
      <label><span>匹配方式</span><select v-model="matchMode"><option value="all">包含全部词</option><option value="phrase">完整短语</option><option value="any">包含任一词</option></select></label>
      <label><span>发送角色</span><select v-model="role"><option value="">全部角色</option><option value="user">用户</option><option value="assistant">Agent</option><option value="system">系统</option></select></label>
      <label><span>Agent</span><input v-model="agent" placeholder="全部 Agent"></label>
      <label><span>位置</span><select v-model="location"><option value="">全部位置</option><option v-for="item in locationOptions" :key="item.value" :value="item.value">{{ item.label }} ({{ item.count }})</option></select></label>
      <label><span>时间</span><select v-model="timeRange"><option value="all">全部时间</option><option value="today">今天</option><option value="3days">最近 3 天</option><option value="week">最近 7 天</option><option value="month">最近 30 天</option><option value="custom">自定义</option></select></label>
      <label><span>排序</span><select v-model="sort"><option value="newest">最新在前</option><option value="oldest">最早在前</option></select></label>
      <template v-if="timeRange === 'custom'"><label><span>开始日期</span><input v-model="startDate" type="date"></label><label><span>结束日期</span><input v-model="endDate" type="date"></label></template>
      <div class="filter-actions"><button @click="resetFilters">重置</button><button class="apply-filter" :disabled="!query.trim()" @click="search(1)">应用筛选</button></div>
    </section>

    <main class="search-content">
      <section v-if="viewMode === 'favorites'" class="saved-view">
        <div class="result-summary"><strong>收藏消息</strong><span>{{ favorites.length }} 条</span></div>
        <p v-if="!favorites.length" class="empty-state">还没有收藏消息</p>
        <div v-else class="result-list">
          <ConversationSearchResult v-for="item in favorites" :key="item.id" :item="item" :terms="item.matchTerms || []" favorite @open="goTo" @task="goToTask" @favorite="toggleFavorite" @copy="copyResult" @copy-markdown="copyMarkdown" />
        </div>
      </section>

      <template v-else>
        <section v-if="!searched" class="start-view">
          <div v-if="recentSearches.length" class="recent-section">
            <div class="result-summary"><strong>最近搜索</strong><button @click="recentSearches = []; persist(RECENT_KEY, [])">清除</button></div>
            <div class="recent-list"><button v-for="item in recentSearches" :key="item.id" @click="applyRecent(item)"><span>{{ item.query }}</span><small>{{ formatTime(item.searchedAt) }}</small></button></div>
          </div>
          <p v-else class="empty-state">暂无搜索记录</p>
        </section>

        <p v-else-if="errorMessage" class="error-state">{{ errorMessage }} <button @click="search(response.page || 1, { remember: false })">重试</button></p>
        <p v-else-if="loading && !results.length" class="empty-state">正在搜索...</p>
        <section v-else class="results-view">
          <div class="result-summary"><strong>{{ response.total || 0 }} 条结果</strong><span v-if="response.total">第 {{ response.page }} / {{ response.page_count }} 页</span></div>
          <p v-if="!results.length" class="empty-state">没有找到匹配消息</p>
          <div v-else class="result-list">
            <ConversationSearchResult v-for="item in results" :key="item.id" :item="item" :terms="terms" :favorite="favoriteIds.has(item.id)" @open="goTo" @task="goToTask" @favorite="toggleFavorite" @copy="copyResult" @copy-markdown="copyMarkdown" />
          </div>
          <nav v-if="response.page_count > 1" class="pagination" aria-label="搜索结果分页">
            <button :disabled="response.page <= 1 || loading" @click="search(response.page - 1, { remember: false })">上一页</button>
            <span>{{ response.page }} / {{ response.page_count }}</span>
            <button :disabled="!response.has_more || loading" @click="search(response.page + 1, { remember: false })">下一页</button>
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
.source-tabs { display: flex; gap: 2px; padding: 0 20px; overflow-x: auto; border-bottom: 1px solid var(--border-color); background: var(--surface); }
.source-tabs button { position: relative; flex: 0 0 auto; min-height: 39px; padding: 8px 12px; border: 0; background: transparent; color: var(--text-muted); font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; }
.source-tabs button.active { color: var(--accent-blue); }
.source-tabs button.active::after { position: absolute; right: 8px; bottom: 0; left: 8px; height: 2px; background: var(--accent-blue); content: ''; }
.source-tabs .favorites-tab { margin-left: auto; }
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
  .source-tabs { padding: 0 8px; }
  .source-tabs .favorites-tab { margin-left: 0; }
  .filter-panel { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 10px; }
  .filter-actions { grid-column: 1 / -1; }
  .start-view, .results-view, .saved-view { padding: 10px 10px 90px; }
}
</style>
