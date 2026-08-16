<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import {
  Bookmark,
  Bot,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  FolderKanban,
  Layers3,
  LoaderCircle,
  MessageSquareText,
  MessagesSquare,
  Music2,
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
  { id: 'music', label: '音乐助手', icon: Music2 },
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
const favorites = ref([])
const results = computed(() => response.value.results || [])
const terms = computed(() => response.value.query?.terms || query.value.trim().split(/\s+/).filter(Boolean))

const locationOptions = computed(() => {
  const facets = response.value.facets || {}
  const projects = Object.entries(facets.projects || {}).filter(([name]) => name && name !== '未标记').map(([name, count]) => ({ value: `project:${name}`, label: `项目 · ${name}`, count }))
  const groups = Object.entries(facets.groups || {}).filter(([name]) => name && name !== '未标记').map(([name, count]) => ({ value: `group-name:${name}`, label: `群聊 · ${name}`, count }))
  return [...projects, ...groups]
})

const activeFilterCount = computed(() => [
  role.value,
  agent.value,
  location.value,
  timeRange.value !== 'all' ? timeRange.value : '',
  matchMode.value !== 'all' ? matchMode.value : '',
  sort.value !== 'newest' ? sort.value : '',
].filter(Boolean).length)

const favoriteIds = computed(() => new Set(favorites.value.map(item => item.rowId)))

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
  const params = new URLSearchParams({
    q: query.value.trim(),
    page: String(page),
    page_size: String(pageSize),
    source: source.value,
    match: matchMode.value,
    sort: sort.value,
  })
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
  const item = {
    id: `${query.value.trim()}|${source.value}|${role.value}|${timeRange.value}|${matchMode.value}`,
    query: query.value.trim(),
    source: source.value,
    role: role.value,
    agent: agent.value,
    location: location.value,
    timeRange: timeRange.value,
    startDate: startDate.value,
    endDate: endDate.value,
    matchMode: matchMode.value,
    sort: sort.value,
    searchedAt: new Date().toISOString(),
  }
  recentSearches.value = [item, ...recentSearches.value.filter(row => row.id !== item.id)].slice(0, 12)
  persist(RECENT_KEY, recentSearches.value)
}

const removeRecent = (id, event) => {
  event?.stopPropagation?.()
  recentSearches.value = recentSearches.value.filter(row => row.id !== id)
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

const loadFavorites = async () => {
  const res = await fetch('/api/search/favorites')
  const data = await res.json().catch(() => ({}))
  if (res.ok && data.success !== false) favorites.value = data.favorites || []
}

const toggleFavorite = async (item) => {
  const selected = favoriteIds.value.has(item.rowId)
  const url = selected ? `/api/search/favorites?row_id=${encodeURIComponent(item.rowId)}` : '/api/search/favorites'
  const res = await fetch(url, selected ? { method: 'DELETE' } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ row_id: item.rowId }) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.success === false) return toast.error(data.error || '收藏操作失败')
  await loadFavorites()
  toast[selected ? 'info' : 'success'](selected ? '已取消收藏' : '已收藏这条消息')
}

const copyText = async (value, message) => {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(message)
  } catch { toast.error('复制失败') }
}

const copyResult = item => copyText(item.content || '', '已复制消息')
const copyMarkdown = item => copyText(`### ${item.sourceLabel} · ${item.sessionName}\n\n- 时间：${formatTime(item.timestamp)}\n- 角色：${item.role === 'user' ? '用户' : item.agent || 'Agent'}\n${item.taskId ? `- 关联任务：${item.taskTitle || item.taskId}\n` : ''}\n${item.content || ''}`, '已复制 Markdown')

const goTo = async (item) => {
  const params = new URLSearchParams({ generation: item.indexGeneration || '', row_id: item.rowId || '', before: '12', after: '12' })
  const res = await fetch(`/api/conversations/message-window?${params}`)
  const data = await res.json().catch(() => ({}))
  emit('go-to', { ...item, messageWindow: res.ok ? data.window : null, query: query.value.trim() || (item.matchTerms || []).join(' ') })
}

const goToTask = item => emit('go-to', { conversationType: 'task', taskId: item.taskId })

const formatTime = (value) => {
  if (!value) return '时间未记录'
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const formatRelativeTime = (value) => {
  if (!value) return ''
  const diff = Date.now() - new Date(value).getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

const sourceLabel = value => ({ all: '全部来源', global: '全局助手', group: '群聊', project: '项目', music: '音乐助手', feishu: '飞书' }[value] || '全部来源')

const recentMeta = item => [
  sourceLabel(item?.source),
  item?.role === 'user' ? '用户消息' : item?.role === 'assistant' ? 'Agent 回复' : '',
  item?.timeRange && item.timeRange !== 'all' ? '限定时间' : '',
].filter(Boolean).join(' · ')

onMounted(loadFavorites)
onUnmounted(() => activeRequest?.abort())
</script>

<template>
  <div class="conversation-search-page">
    <!-- 顶部工作区头部 -->
    <header class="search-workspace-header">
      <div class="header-top-row">
        <div class="search-heading">
          <div class="heading-icon-wrap">
            <MessageSquareText :size="18" />
          </div>
          <div class="heading-text">
            <h2>对话搜索</h2>
            <p>跨会话、全局助手、项目与群聊深度查找历史消息与上下文</p>
          </div>
        </div>
      </div>

      <!-- 搜索主命令栏 -->
      <div class="search-command-bar">
        <div class="search-input-wrap">
          <Search class="search-symbol" :size="16" aria-hidden="true" />
          <input
            v-model="query"
            type="search"
            placeholder="输入关键词搜索对话记录 (按 Enter 搜索)..."
            aria-label="搜索对话"
            autofocus
            @keydown.enter="search(1)"
          >
          <button v-if="query" class="clear-input-btn" title="清空搜索" aria-label="清空搜索" @click="clearSearch">
            <X :size="14" />
          </button>
        </div>

        <button
          type="button"
          class="filter-toggle-btn"
          :class="{ active: showFilters || activeFilterCount }"
          @click="showFilters = !showFilters"
        >
          <SlidersHorizontal :size="14" />
          <span>筛选</span>
          <span v-if="activeFilterCount" class="active-badge">{{ activeFilterCount }}</span>
        </button>

        <button
          type="button"
          class="search-submit-btn"
          :disabled="loading || !query.trim()"
          @click="search(1)"
        >
          <LoaderCircle v-if="loading" :size="14" class="spinning" />
          <Search v-else :size="14" />
          <span>{{ loading ? '搜索中' : '搜索' }}</span>
        </button>
      </div>

      <!-- 范围切换 Segmented Control 药丸栏 -->
      <div class="source-segmented-toolbar">
        <nav class="source-segmented-nav" aria-label="对话来源筛选">
          <div class="segmented-pill-group">
            <button
              v-for="item in sourceFilters"
              :key="item.id"
              type="button"
              class="pill-btn"
              :class="{ active: source === item.id && viewMode !== 'favorites' }"
              @click="selectSource(item.id)"
            >
              <component :is="item.icon" :size="13" />
              <span>{{ item.label }}</span>
              <small v-if="sourceCount(item.id) !== null" class="pill-count">{{ sourceCount(item.id) }}</small>
            </button>
          </div>

          <button
            type="button"
            class="pill-btn favorites-pill-btn"
            :class="{ active: viewMode === 'favorites' }"
            @click="showFavorites"
          >
            <Bookmark :size="13" />
            <span>我的收藏</span>
            <small v-if="favorites.length" class="pill-count fav-count">{{ favorites.length }}</small>
          </button>
        </nav>
      </div>
    </header>

    <!-- 高级筛选面板 -->
    <transition name="filter-slide">
      <section v-if="showFilters" class="filter-drawer-panel">
        <div class="filter-panel-header">
          <div class="filter-title">
            <Filter :size="14" />
            <strong>高级筛选参数</strong>
            <span v-if="activeFilterCount" class="active-filter-hint">已启用 {{ activeFilterCount }} 项过滤</span>
          </div>
          <button type="button" class="reset-filter-btn" :disabled="!activeFilterCount" @click="resetFilters">
            <RefreshCw :size="12" />
            <span>重置筛选</span>
          </button>
        </div>

        <div class="filter-grid">
          <div class="filter-field">
            <label>匹配规则</label>
            <select v-model="matchMode">
              <option value="all">包含全部词 (AND)</option>
              <option value="phrase">完整短语精确匹配</option>
              <option value="any">包含任一词 (OR)</option>
            </select>
          </div>

          <div class="filter-field">
            <label>发送角色</label>
            <select v-model="role">
              <option value="">全部角色</option>
              <option value="user">用户消息</option>
              <option value="assistant">Agent 回复</option>
              <option value="system">系统通知</option>
            </select>
          </div>

          <div class="filter-field">
            <label>Agent 名称</label>
            <input v-model="agent" placeholder="输入 Agent 过滤...">
          </div>

          <div class="filter-field">
            <label>所属位置</label>
            <select v-model="location">
              <option value="">全部位置</option>
              <option v-for="item in locationOptions" :key="item.value" :value="item.value">
                {{ item.label }} ({{ item.count }})
              </option>
            </select>
          </div>

          <div class="filter-field">
            <label>时间范围</label>
            <select v-model="timeRange">
              <option value="all">全部时间</option>
              <option value="today">今天之内</option>
              <option value="3days">最近 3 天</option>
              <option value="week">最近 7 天</option>
              <option value="month">最近 30 天</option>
              <option value="custom">自定义日期范围</option>
            </select>
          </div>

          <div class="filter-field">
            <label>排序方式</label>
            <select v-model="sort">
              <option value="newest">按时间最新在前</option>
              <option value="oldest">按时间最早在前</option>
            </select>
          </div>

          <template v-if="timeRange === 'custom'">
            <div class="filter-field">
              <label>开始日期</label>
              <input v-model="startDate" type="date">
            </div>
            <div class="filter-field">
              <label>结束日期</label>
              <input v-model="endDate" type="date">
            </div>
          </template>
        </div>

        <div class="filter-footer">
          <button type="button" class="apply-filter-btn" :disabled="!query.trim()" @click="search(1)">
            <Search :size="13" />
            <span>应用筛选并搜索</span>
          </button>
        </div>
      </section>
    </transition>

    <!-- 主搜索内容呈现区 -->
    <main class="search-content">
      <!-- 收藏夹模式 -->
      <section v-if="viewMode === 'favorites'" class="view-container">
        <div class="result-summary-bar">
          <div class="summary-left">
            <Bookmark :size="15" />
            <strong>收藏的消息</strong>
            <span class="count-tag">{{ favorites.length }} 条</span>
          </div>
        </div>

        <div v-if="!favorites.length" class="empty-state">
          <div class="empty-icon-wrap">
            <Bookmark :size="28" />
          </div>
          <h3>暂无收藏的消息</h3>
          <p>在搜索结果中点击卡片右下角的“收藏”按钮，便可将常用或重要消息保存至此处</p>
        </div>

        <div v-else class="result-cards-list">
          <ConversationSearchResult
            v-for="item in favorites"
            :key="item.id"
            :item="item"
            :terms="item.matchTerms || []"
            favorite
            @open="goTo"
            @task="goToTask"
            @favorite="toggleFavorite"
            @copy="copyResult"
            @copy-markdown="copyMarkdown"
          />
        </div>
      </section>

      <!-- 普通搜索模式 -->
      <template v-else>
        <!-- 初始空闲状态：显示最近搜索 -->
        <section v-if="!searched" class="view-container">
          <div v-if="recentSearches.length" class="recent-searches-box">
            <div class="result-summary-bar">
              <div class="summary-left">
                <Clock3 :size="15" />
                <strong>最近搜索记录</strong>
                <span class="count-tag">{{ recentSearches.length }} 条</span>
              </div>
              <button type="button" class="clear-recent-all-btn" @click="recentSearches = []; persist(RECENT_KEY, [])">
                <Trash2 :size="12" />
                <span>清空全部记录</span>
              </button>
            </div>

            <div class="recent-grid">
              <div
                v-for="item in recentSearches"
                :key="item.id"
                class="recent-card"
                @click="applyRecent(item)"
              >
                <div class="recent-icon-badge">
                  <Search :size="14" />
                </div>
                <div class="recent-content">
                  <strong class="recent-keyword">{{ item.query }}</strong>
                  <span class="recent-sub">{{ recentMeta(item) }}</span>
                </div>
                <div class="recent-right">
                  <time :title="formatTime(item.searchedAt)">{{ formatRelativeTime(item.searchedAt) }}</time>
                  <button
                    type="button"
                    class="recent-remove-btn"
                    title="移除此条记录"
                    @click="removeRecent(item.id, $event)"
                  >
                    <X :size="12" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="empty-state">
            <div class="empty-icon-wrap">
              <Search :size="28" />
            </div>
            <h3>跨会话全局对话搜索</h3>
            <p>在上方输入关键词即可秒级检索全局助手、群聊及项目会话中的历史对话</p>
          </div>
        </section>

        <!-- 错误提示 -->
        <div v-else-if="errorMessage" class="error-state-box">
          <strong>搜索暂时不可用</strong>
          <span>{{ errorMessage }}</span>
          <button type="button" class="retry-btn" @click="search(response.page || 1, { remember: false })">
            <RefreshCw :size="13" />
            <span>重试</span>
          </button>
        </div>

        <!-- 加载中 -->
        <div v-else-if="loading && !results.length" class="empty-state">
          <LoaderCircle :size="28" class="spinning loading-icon" />
          <h3>正在检索匹配会话...</h3>
          <p>正在全量索引库中扫描消息与上下文</p>
        </div>

        <!-- 搜索结果列表 -->
        <section v-else class="view-container">
          <div class="result-summary-bar">
            <div class="summary-left">
              <Search :size="15" />
              <strong>搜索结果</strong>
              <span class="count-tag">共 {{ response.total || 0 }} 条记录</span>
            </div>
            <span v-if="response.total" class="page-indicator">
              第 {{ response.page }} / {{ response.page_count }} 页
            </span>
          </div>

          <div v-if="!results.length" class="empty-state">
            <div class="empty-icon-wrap">
              <Search :size="28" />
            </div>
            <h3>未找到相关匹配消息</h3>
            <p>请尝试更换关键词，或缩减高级筛选过滤条件后重新搜索</p>
          </div>

          <div v-else class="result-cards-list">
            <ConversationSearchResult
              v-for="item in results"
              :key="item.id"
              :item="item"
              :terms="terms"
              :favorite="favoriteIds.has(item.rowId)"
              @open="goTo"
              @task="goToTask"
              @favorite="toggleFavorite"
              @copy="copyResult"
              @copy-markdown="copyMarkdown"
            />
          </div>

          <!-- 分页器 -->
          <nav v-if="response.page_count > 1" class="pagination-bar" aria-label="搜索结果分页">
            <button
              type="button"
              class="page-btn"
              :disabled="response.page <= 1 || loading"
              @click="search(response.page - 1, { remember: false })"
            >
              <ChevronLeft :size="14" />
              <span>上一页</span>
            </button>
            <span class="page-num-pill">{{ response.page }} / {{ response.page_count }}</span>
            <button
              type="button"
              class="page-btn"
              :disabled="!response.has_more || loading"
              @click="search(response.page + 1, { remember: false })"
            >
              <span>下一页</span>
              <ChevronRight :size="14" />
            </button>
          </nav>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.conversation-search-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* ==================== 顶部工作区头部 ==================== */
.search-workspace-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 24px 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-sm);
  z-index: 10;
}

.header-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.search-heading {
  display: flex;
  align-items: center;
  gap: 10px;
}

.heading-icon-wrap {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: rgba(37, 99, 235, 0.1);
  color: var(--accent-blue, #2563eb);
  flex-shrink: 0;
}

.heading-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.heading-text h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.heading-text p {
  margin: 0;
  font-size: 11.5px;
  color: var(--text-muted);
}

/* 搜索主命令栏 */
.search-command-bar {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto auto;
  gap: 8px;
  width: 100%;
}

.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
}

.search-symbol {
  position: absolute;
  left: 12px;
  color: var(--text-muted);
  pointer-events: none;
}

.search-input-wrap input {
  width: 100%;
  height: 38px;
  padding: 0 36px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 6px);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.search-input-wrap input:focus {
  border-color: var(--accent-blue);
  box-shadow: var(--focus-ring, 0 0 0 3px rgba(37, 99, 235, 0.12));
}

.clear-input-btn {
  position: absolute;
  right: 8px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.clear-input-btn:hover {
  background: var(--control-hover);
  color: var(--text-primary);
}

.filter-toggle-btn {
  height: 38px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 14px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 6px);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-toggle-btn:hover {
  background: var(--control-hover);
  color: var(--text-primary);
}

.filter-toggle-btn.active {
  border-color: color-mix(in srgb, var(--accent-blue) 40%, transparent);
  background: var(--accent-soft, rgba(37, 99, 235, 0.08));
  color: var(--accent-blue);
}

.active-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--accent-blue);
  color: #fff;
  font-size: 10.5px;
  font-weight: 700;
}

.search-submit-btn {
  height: 38px;
  min-width: 86px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 16px;
  border: 0;
  border-radius: var(--radius-md, 6px);
  background: var(--accent-blue, #2563eb);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s ease, background-color 0.15s ease;
}

.search-submit-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.search-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 范围切换 Segmented 胶囊栏 */
.source-segmented-toolbar {
  display: flex;
  align-items: center;
  width: 100%;
}

.source-segmented-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 10px;
}

.segmented-pill-group {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--control-bg, var(--bg-primary));
}

.pill-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.pill-btn:hover {
  color: var(--text-primary);
  background: var(--surface);
}

.pill-btn.active {
  background: var(--surface, var(--bg-card));
  color: var(--accent-blue, #2563eb);
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.pill-count {
  font-family: var(--font-mono, monospace);
  font-size: 10px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--panel-muted);
  color: var(--text-muted);
}

.pill-btn.active .pill-count {
  background: rgba(37, 99, 235, 0.12);
  color: var(--accent-blue);
}

.favorites-pill-btn {
  border: 1px solid var(--border-color);
  background: var(--control-bg, var(--bg-primary));
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
}

.favorites-pill-btn.active {
  border-color: color-mix(in srgb, #f59e0b 35%, var(--border-color));
  background: rgba(245, 158, 11, 0.08);
  color: #d97706;
}

.fav-count {
  background: rgba(245, 158, 11, 0.15);
  color: #d97706;
}

/* ==================== 高级筛选抽屉面板 ==================== */
.filter-drawer-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 24px;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-sm);
}

.filter-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.filter-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-primary);
  font-size: 12.5px;
}

.active-filter-hint {
  font-size: 11px;
  color: var(--accent-blue);
  background: var(--accent-soft);
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.reset-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
}

.reset-filter-btn:hover:not(:disabled) {
  color: var(--accent-red, #ef4444);
}

.reset-filter-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px 14px;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-field label {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
}

.filter-field input,
.filter-field select {
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 6px);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
  transition: border-color 0.15s ease;
}

.filter-field input:focus,
.filter-field select:focus {
  border-color: var(--accent-blue);
}

.filter-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 4px;
}

.apply-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 14px;
  border-radius: 6px;
  border: 0;
  background: var(--accent-blue);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.apply-filter-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ==================== 主内容呈现区 ==================== */
.search-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 24px 36px;
  background: var(--bg-primary);
}

.view-container {
  width: min(100%, 1040px);
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2px;
}

.summary-left {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
  font-size: 13px;
}

.count-tag {
  font-size: 11px;
  color: var(--text-muted);
  padding: 1px 6px;
  background: var(--panel-muted);
  border-radius: 999px;
  font-weight: 600;
}

.page-indicator {
  font-size: 11.5px;
  color: var(--text-muted);
  font-family: var(--font-mono, monospace);
}

.clear-recent-all-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: 11.5px;
  cursor: pointer;
}

.clear-recent-all-btn:hover {
  color: var(--accent-red, #ef4444);
}

/* 最近搜索网格 */
.recent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 10px;
}

.recent-card {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.recent-card:hover {
  border-color: color-mix(in srgb, var(--accent-blue) 35%, var(--border-color));
  box-shadow: var(--shadow-md, 0 3px 10px rgba(0, 0, 0, 0.04));
  transform: translateY(-1px);
}

.recent-icon-badge {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: rgba(37, 99, 235, 0.08);
  color: var(--accent-blue);
}

.recent-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.recent-keyword {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-sub {
  font-size: 10.5px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.recent-right time {
  font-size: 10.5px;
  color: var(--text-muted);
  white-space: nowrap;
}

.recent-remove-btn {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.recent-remove-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* 结果卡片列表 */
.result-cards-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 空状态与错误状态 */
.empty-state {
  padding: 60px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
  color: var(--text-muted);
}

.empty-icon-wrap {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 14px;
  background: var(--panel-muted);
  color: var(--text-muted);
  margin-bottom: 4px;
}

.loading-icon {
  color: var(--accent-blue);
  margin-bottom: 8px;
}

.empty-state h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.empty-state p {
  margin: 0;
  font-size: 12px;
  max-width: 440px;
  line-height: 1.5;
}

.error-state-box {
  padding: 24px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--accent-red) 35%, transparent);
  background: var(--danger-soft, rgba(239, 68, 68, 0.08));
  color: var(--accent-red, #ef4444);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}

.retry-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

/* 分页条 */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px 0 8px;
}

.page-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-num-pill {
  font-family: var(--font-mono, monospace);
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
}

.spinning {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 动效 */
.filter-slide-enter-active,
.filter-slide-leave-active {
  transition: all 0.2s ease;
}

.filter-slide-enter-from,
.filter-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ==================== 响应式适配 ==================== */
@media (max-width: 980px) {
  .filter-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .search-workspace-header {
    padding: 12px 14px 10px;
    gap: 10px;
  }
  .search-command-bar {
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .search-input-wrap {
    grid-column: 1 / -1;
  }
  .source-segmented-nav {
    overflow-x: auto;
    scrollbar-width: none;
  }
  .source-segmented-nav::-webkit-scrollbar {
    display: none;
  }
  .filter-drawer-panel {
    padding: 12px 14px;
  }
  .filter-grid {
    grid-template-columns: 1fr;
  }
  .search-content {
    padding: 12px 14px 28px;
  }
  .recent-grid {
    grid-template-columns: 1fr;
  }
}
</style>
