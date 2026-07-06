<script setup>
import { ref, computed, nextTick } from 'vue'
import { toast } from '../../utils/toast.js'

const emit = defineEmits(['go-to'])

const keyword = ref('')
const results = ref([])
const loading = ref(false)
const searched = ref(false)
const filterProject = ref('')

// 高级过滤与分析状态
const showFilters = ref(false)
const filterRole = ref('')
const filterTimeRange = ref('')
const sortOrder = ref('newest')
const hotWords = ref([])

// 搜索对话历史
const search = async () => {
  if (!keyword.value.trim()) return
  loading.value = true
  searched.value = true
  try {
    const params = new URLSearchParams({ q: keyword.value.trim(), limit: '50' })
    if (filterProject.value) params.set('project', filterProject.value)
    const res = await fetch(`/api/search?${params}`)
    const data = await res.json()
    results.value = data.results || []
    
    // 生成频次分析热词
    extractHotWords()
  } catch (e) {
    results.value = []
    hotWords.value = []
  }
  loading.value = false
}

// 级联级前端多条件计算过滤
const processedResults = computed(() => {
  let list = [...results.value]
  
  // 1. 角色过滤
  if (filterRole.value) {
    list = list.filter(item => item.role === filterRole.value)
  }
  
  // 2. 时间范围过滤
  if (filterTimeRange.value) {
    const now = Date.now()
    let rangeMs = 0
    if (filterTimeRange.value === 'today') {
      rangeMs = 24 * 60 * 60 * 1000
    } else if (filterTimeRange.value === '3days') {
      rangeMs = 3 * 24 * 60 * 60 * 1000
    } else if (filterTimeRange.value === 'week') {
      rangeMs = 7 * 24 * 60 * 60 * 1000
    }
    
    if (rangeMs > 0) {
      list = list.filter(item => {
        const itemTime = new Date(item.timestamp).getTime()
        return (now - itemTime) <= rangeMs
      })
    }
  }
  
  // 3. 升降序排列
  list.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime()
    const timeB = new Date(b.timestamp).getTime()
    return sortOrder.value === 'newest' ? timeB - timeA : timeA - timeB
  })
  
  return list
})

// 常见非特征停用词
const STOP_WORDS = new Set([
  '的', '了', '是', '我', '你', '他', '她', '它', '在', '有', '和', '也', '而', '及', '与', 
  '这', '那', '我们', '你们', '他们', '这个', '那个', '一个', '一些', '请', '帮', '给', '就',
  '要', '去', '来', '到', '用', '做', '写', '说', '看', '听', '想', '对于', '关于', '已经',
  '可以', '能够', '会', '将', '被', '让', '使', '通过', '使用', '进行', '如何', '怎么',
  'the', 'to', 'and', 'of', 'a', 'in', 'is', 'that', 'it', 'for', 'on', 'with', 'as', 'at',
  'by', 'an', 'be', 'this', 'are', 'from', 'or', 'you', 'your', 'i', 'we', 'they', 'he', 'she'
])

// 统计词频并提取前8个热词
const extractHotWords = () => {
  if (results.value.length === 0) {
    hotWords.value = []
    return
  }
  
  const wordFreq = {}
  results.value.forEach(item => {
    const content = item.content || ''
    const regex = /[\u4e00-\u9fa5]{2,4}|[a-zA-Z]+/g
    let match
    while ((match = regex.exec(content)) !== null) {
      const word = match[0].toLowerCase()
      if (word.length < 2) continue
      if (STOP_WORDS.has(word)) continue
      if (/^\d+$/.test(word)) continue
      wordFreq[word] = (wordFreq[word] || 0) + 1
    }
  })
  
  const sorted = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(entry => entry[0])
    
  hotWords.value = sorted
}

// 点击标签热词追加回填
const appendHotWord = (word) => {
  if (keyword.value.trim()) {
    keyword.value = keyword.value.trim() + ' ' + word
  } else {
    keyword.value = word
  }
  search()
}

// 复制消息全文
const copyContent = (item) => {
  navigator.clipboard.writeText(item.content).then(() => {
    toast.success('已复制对话文本内容')
  }).catch(() => {
    toast.error('复制失败，请手动复制')
  })
}

// 导出 Markdown 对话卡片
const exportMarkdown = (item) => {
  const roleName = item.role === 'user' ? '👤 用户' : `🤖 Agent (${item.agent || '主 Agent'})`
  const formattedTime = formatTime(item.timestamp)
  
  const md = `### ${item.isGroup ? '💬 群聊' : '📂 项目'}: ${item.project} | 会话: ${item.sessionName}
- **时间**: ${formattedTime}
- **说话人**: ${roleName}

---

${item.content}
`
  navigator.clipboard.writeText(md).then(() => {
    toast.success('Markdown 格式会话卡片已复制，可直接粘贴分享！')
  }).catch(() => {
    toast.error('导出失败，请手动复制')
  })
}

// 支持空格分词的多词霓虹高亮
const highlightKeyword = (text, keyword) => {
  if (!text || !keyword) return text
  const words = keyword.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return text
  
  let highlighted = text
  words.forEach(word => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`(${escaped})`, 'gi')
    highlighted = highlighted.replace(regex, '<mark class="hl-neon">$1</mark>')
  })
  return highlighted
}

const truncate = (text, max = 250) => {
  if (!text) return ''
  return text.length > max ? text.substring(0, max) + '...' : text
}

const formatTime = (ts) => {
  if (!ts) return ''
  return new Date(ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const handleKeydown = (e) => {
  if (e.key === 'Enter') search()
}

const goToItem = (item) => {
  emit('go-to', { ...item, _keyword: keyword.value })
}
</script>

<template>
  <div class="search-page">
    <!-- 搜索栏区域 -->
    <div class="search-bar-container">
      <div class="search-bar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input
            v-model="keyword"
            class="search-input"
            placeholder="搜索所有项目的对话历史...（空格分隔可进行多词分词检索）"
            @keydown="handleKeydown"
            autofocus
          />
          <button v-if="keyword" class="clear-btn" @click="keyword = ''; results = []; searched = false; hotWords = []">&times;</button>
        </div>
        <div class="search-actions">
          <button class="btn btn-outline" @click="showFilters = !showFilters" :class="{ active: showFilters || filterRole || filterTimeRange }">
            🛠️ 高级过滤 {{ (filterRole || filterTimeRange) ? '●' : '' }}
          </button>
          <button class="btn btn-primary" @click="search" :disabled="loading || !keyword.trim()">
            {{ loading ? '搜索中...' : '搜索' }}
          </button>
        </div>
      </div>

      <!-- 可收折过滤面板 -->
      <transition name="fade-slide">
        <div v-if="showFilters" class="filters-panel">
          <div class="filter-row">
            <div class="filter-group">
              <label>👤 发送角色</label>
              <select v-model="filterRole" class="select">
                <option value="">全部角色</option>
                <option value="user">👤 用户 (User)</option>
                <option value="assistant">🤖 Agent (Assistant)</option>
                <option value="system">⚠️ 系统消息</option>
              </select>
            </div>
            
            <div class="filter-group">
              <label>📅 时间范围</label>
              <select v-model="filterTimeRange" class="select">
                <option value="">全部时间</option>
                <option value="today">📅 今天内</option>
                <option value="3days">📅 最近 3 天</option>
                <option value="week">📅 最近一周</option>
              </select>
            </div>

            <div class="filter-group">
              <label>⬇️ 时间排序</label>
              <select v-model="sortOrder" class="select">
                <option value="newest">最新在前 ⬇️</option>
                <option value="oldest">最早在前 ⬆️</option>
              </select>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <!-- 检索分析热词标签条 -->
    <div v-if="hotWords.length > 0" class="hot-words-bar">
      <span class="hot-words-title">💡 检索分析热词：</span>
      <div class="hot-words-list">
        <span v-for="word in hotWords" :key="word" class="hot-word-tag" @click="appendHotWord(word)">
          # {{ word }}
        </span>
      </div>
    </div>

    <!-- 结果统计 -->
    <div v-if="searched" class="result-info">
      <span v-if="!loading">在过滤后找到 {{ processedResults.length }} / {{ results.length }} 条匹配结果</span>
      <span v-if="filterProject" class="filter-tag">
        📂 {{ filterProject }}
        <button @click="filterProject = ''; search()">&times;</button>
      </span>
    </div>

    <!-- 结果列表 -->
    <div class="result-list">
      <div v-if="!searched" class="empty-state">
        <span class="icon">🔍</span>
        <p>检索全栈多 Agent 的对话历史</p>
        <p class="sub">实时索引用户提问、Agent 决策及群聊时序记录</p>
      </div>
      <div v-else-if="loading" class="empty-state">
        <span class="icon">⏳</span>
        <p>安全检索并解密日志库中...</p>
      </div>
      <div v-else-if="processedResults.length === 0" class="empty-state">
        <span class="icon">😕</span>
        <p>没有找到符合当前过滤条件的匹配结果</p>
        <p class="sub" v-if="results.length > 0">（已检索到 {{ results.length }} 条记录，但被高级过滤条件拦截）</p>
      </div>
      <div v-else>
        <!-- 玻璃卡片列表 -->
        <div v-for="(item, i) in processedResults" :key="i" class="result-card">
          <!-- 卡片顶栏 -->
          <div class="card-top" @click="goToItem(item)">
            <span class="result-project" @click.stop="filterProject = item.project; search()">
              {{ item.isGroup ? '💬' : '📂' }} {{ item.project }}
            </span>
            <span class="result-session">{{ item.sessionName }}</span>
            <span class="result-time">{{ formatTime(item.timestamp) }}</span>
          </div>

          <!-- 卡片内容 -->
          <div class="card-body" @click="goToItem(item)">
            <div class="role-badge-row">
              <span v-if="item.role === 'user'" class="role-badge user">👤 用户</span>
              <span v-else-if="item.role === 'assistant'" class="role-badge assistant">🤖 {{ item.agent || 'Agent' }}</span>
              <span v-else class="role-badge system">⚠️ {{ item.role }}</span>
            </div>
            <div class="result-content" v-html="highlightKeyword(truncate(item.content, 250), keyword)"></div>
          </div>

          <!-- 卡片底栏操作 -->
          <div class="card-footer">
            <button class="action-btn" title="点击跳转至原始会话上下文" @click="goToItem(item)">
              🔗 进入会话
            </button>
            <div style="margin-left: auto; display: flex; gap: 8px;">
              <button class="action-btn text-btn" @click="copyContent(item)">
                📋 复制文本
              </button>
              <button class="action-btn text-btn primary" @click="exportMarkdown(item)">
                📝 导出 Markdown 卡片
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.search-page { display: flex; flex-direction: column; height: 100%; background: transparent; }

/* 搜索容器 */
.search-bar-container { background: rgba(255, 255, 255, 0.25); backdrop-filter: blur(20px); border-bottom: 1px solid rgba(0, 0, 0, 0.05); padding: 16px 24px; display: flex; flex-direction: column; gap: 12px; }
.search-bar { display: flex; gap: 12px; align-items: center; }
.search-input-wrap { flex: 1; position: relative; display: flex; align-items: center; }
.search-icon { position: absolute; left: 16px; font-size: 16px; pointer-events: none; opacity: 0.6; }
.search-input { width: 100%; padding: 12px 40px 12px 46px; border-radius: 12px; border: 1px solid rgba(0, 0, 0, 0.08); background: rgba(255, 255, 255, 0.85); color: var(--text-primary); font-size: 13.5px; outline: none; transition: all 0.25s ease; box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02); }
.search-input:focus { border-color: var(--accent-blue); box-shadow: 0 0 15px rgba(59, 130, 246, 0.12), inset 0 1px 2px rgba(0, 0, 0, 0.01); }
.clear-btn { position: absolute; right: 14px; background: rgba(0,0,0,0.04); border: none; width: 20px; height: 20px; border-radius: 50%; color: var(--text-muted); font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.clear-btn:hover { background: rgba(0,0,0,0.08); color: var(--text-primary); }

.search-actions { display: flex; gap: 8px; }

/* 过滤面板 */
.filters-panel { background: rgba(255, 255, 255, 0.4); border-radius: 12px; border: 1px solid rgba(0, 0, 0, 0.04); padding: 14px; margin-top: 4px; }
.filter-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.filter-group { display: flex; flex-direction: column; gap: 6px; }
.filter-group label { font-size: 11.5px; font-weight: 600; color: var(--text-secondary); }
.select { padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.08); background: rgba(255, 255, 255, 0.9); color: var(--text-primary); font-size: 12.5px; outline: none; transition: all 0.2s; }
.select:focus { border-color: var(--accent-blue); }

/* 热词气泡 */
.hot-words-bar { display: flex; align-items: center; gap: 8px; padding: 10px 24px; background: rgba(255, 255, 255, 0.1); border-bottom: 1px solid rgba(0, 0, 0, 0.03); }
.hot-words-title { font-size: 11.5px; font-weight: 600; color: var(--text-muted); }
.hot-words-list { display: flex; flex-wrap: wrap; gap: 6px; }
.hot-word-tag { font-size: 11px; padding: 3px 10px; background: rgba(59, 130, 246, 0.08); color: var(--accent-blue); border-radius: 20px; cursor: pointer; border: 1px solid rgba(59, 130, 246, 0.15); transition: all 0.2s ease; font-weight: 500; }
.hot-word-tag:hover { background: var(--gradient-blue); color: white; border-color: transparent; transform: translateY(-1px); box-shadow: 0 4px 10px rgba(59, 130, 246, 0.2); }

/* 结果说明 */
.result-info { padding: 10px 24px; font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 12px; }
.filter-tag { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; background: rgba(59, 130, 246, 0.08); color: var(--accent-blue); border-radius: 6px; font-size: 11px; border: 1px solid rgba(59, 130, 246, 0.15); }
.filter-tag button { background: none; border: none; color: inherit; cursor: pointer; font-size: 14px; padding: 0; display: flex; align-items: center; }

/* 结果卡片 */
.result-list { flex: 1; overflow-y: auto; padding: 12px 24px; }
.result-card { background: rgba(255, 255, 255, 0.45); backdrop-filter: blur(25px); border: 1px solid rgba(0, 0, 0, 0.05); border-radius: 14px; padding: 18px; margin-bottom: 16px; transition: all 0.25s ease; box-shadow: 0 8px 32px 0 rgba(15, 23, 42, 0.03); display: flex; flex-direction: column; gap: 12px; position: relative; overflow: hidden; }
.result-card::before { content: ''; position: absolute; top: 0; left: 0; width: 4px; height: 100%; background: transparent; transition: background 0.2s; }
.result-card:hover { border-color: rgba(59, 130, 246, 0.2); transform: translateY(-2px); box-shadow: 0 12px 30px rgba(59, 130, 246, 0.06); }
.result-card:hover::before { background: var(--accent-blue); }

.card-top { display: flex; align-items: center; gap: 10px; font-size: 12px; padding-bottom: 8px; border-bottom: 1px dashed rgba(0, 0, 0, 0.04); cursor: pointer; }
.result-project { color: var(--accent-blue); cursor: pointer; font-weight: 600; transition: color 0.2s; }
.result-project:hover { text-decoration: underline; color: #2563eb; }
.result-session { color: var(--text-muted); }
.result-time { color: var(--text-muted); margin-left: auto; }

.card-body { cursor: pointer; display: flex; flex-direction: column; gap: 8px; }
.role-badge-row { display: flex; }
.role-badge { font-size: 10.5px; padding: 2px 8px; border-radius: 6px; font-weight: 500; border: 1px solid transparent; }
.role-badge.user { background: rgba(59, 130, 246, 0.08); color: var(--accent-blue); border-color: rgba(59, 130, 246, 0.15); }
.role-badge.assistant { background: rgba(34, 197, 94, 0.08); color: var(--accent-green); border-color: rgba(34, 197, 94, 0.15); }
.role-badge.system { background: rgba(250, 204, 21, 0.08); color: var(--accent-yellow); border-color: rgba(250, 204, 21, 0.15); }

.result-content { font-size: 13px; color: var(--text-secondary); line-height: 1.6; white-space: pre-wrap; word-break: break-word; }

/* 霓虹高亮标记 */
.result-content :deep(.hl-neon) { background: rgba(250, 204, 21, 0.18); color: var(--text-primary); border-radius: 4px; padding: 1px 4px; font-weight: 600; border-bottom: 2px solid rgba(250, 204, 21, 0.8); text-shadow: 0 0 8px rgba(250, 204, 21, 0.15); }

/* 卡片底端动作栏 */
.card-footer { display: flex; align-items: center; border-top: 1px solid rgba(0, 0, 0, 0.04); padding-top: 12px; margin-top: 4px; }
.action-btn { padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.06); background: rgba(0,0,0,0.01); color: var(--text-secondary); cursor: pointer; font-size: 11.5px; font-weight: 500; transition: all 0.2s; display: flex; align-items: center; gap: 4px; }
.action-btn:hover { background: rgba(59, 130, 246, 0.06); border-color: rgba(59, 130, 246, 0.18); color: var(--accent-blue); }
.action-btn.text-btn { background: transparent; border: none; font-size: 11px; color: var(--text-muted); }
.action-btn.text-btn:hover { color: var(--text-primary); text-decoration: underline; background: transparent; }
.action-btn.text-btn.primary { color: var(--accent-blue); }
.action-btn.text-btn.primary:hover { color: #2563eb; }

/* 缺省页 */
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 350px; color: var(--text-muted); }
.empty-state .icon { font-size: 48px; opacity: 0.35; margin-bottom: 16px; }
.empty-state p { font-size: 14.5px; font-weight: 500; color: var(--text-secondary); }
.empty-state .sub { font-size: 12px; color: var(--text-muted); margin-top: 6px; }

/* 按钮通用 */
.btn { padding: 10px 18px; border-radius: 10px; border: 1px solid transparent; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.25s; display: flex; align-items: center; gap: 4px; }
.btn-primary { background: var(--gradient-blue); color: white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15); }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(59, 130, 246, 0.22); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
.btn-outline { background: rgba(255, 255, 255, 0.7); border-color: rgba(0, 0, 0, 0.08); color: var(--text-secondary); }
.btn-outline:hover { background: rgba(255, 255, 255, 0.95); border-color: rgba(0,0,0,0.15); }
.btn-outline.active { background: rgba(59, 130, 246, 0.06); border-color: rgba(59, 130, 246, 0.25); color: var(--accent-blue); box-shadow: 0 0 10px rgba(59, 130, 246, 0.06); }

/* 折叠面板动画 */
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); max-height: 120px; opacity: 1; overflow: hidden; }
.fade-slide-enter-from, .fade-slide-leave-to { max-height: 0; opacity: 0; transform: translateY(-8px); overflow: hidden; }

/* 暗色适配 */
[data-theme="dark"] .search-bar-container { background: rgba(30, 41, 59, 0.25); border-bottom-color: var(--border-color); }
[data-theme="dark"] .search-input { background: var(--bg-primary); border-color: var(--border-color); color: var(--text-primary); }
[data-theme="dark"] .search-input:focus { box-shadow: 0 0 18px rgba(59, 130, 246, 0.2); }
[data-theme="dark"] .filters-panel { background: rgba(30, 41, 59, 0.4); border-color: var(--border-color); }
[data-theme="dark"] .select { background: var(--bg-primary); border-color: var(--border-color); color: var(--text-primary); }
[data-theme="dark"] .btn-outline { background: var(--surface); border-color: var(--border-color); color: var(--text-primary); }
[data-theme="dark"] .btn-outline:hover { background: var(--bg-primary); }
[data-theme="dark"] .btn-outline.active { background: rgba(59, 130, 246, 0.12); border-color: rgba(59, 130, 246, 0.3); }
[data-theme="dark"] .hot-words-bar { background: rgba(0,0,0,0.2); border-bottom-color: var(--border-color); }
[data-theme="dark"] .hot-word-tag { background: rgba(59, 130, 246, 0.12); border-color: rgba(59, 130, 246, 0.25); }
[data-theme="dark"] .hot-word-tag:hover { background: var(--gradient-blue); }
[data-theme="dark"] .result-card { background: rgba(30, 41, 59, 0.4); border-color: var(--border-color); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2); }
[data-theme="dark"] .result-card:hover { border-color: rgba(59, 130, 246, 0.3); box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35); }
[data-theme="dark"] .card-top { border-bottom-color: var(--border-color); }
[data-theme="dark"] .card-footer { border-top-color: var(--border-color); }
[data-theme="dark"] .action-btn { background: rgba(255,255,255,0.02); border-color: var(--border-color); color: var(--text-secondary); }
[data-theme="dark"] .action-btn:hover { background: rgba(59, 130, 246, 0.12); border-color: rgba(59, 130, 246, 0.3); color: var(--text-primary); }
[data-theme="dark"] .result-content :deep(.hl-neon) { background: rgba(250, 204, 21, 0.25); color: #ffffff; }

@media (max-width: 768px) {
  .search-bar { flex-direction: column; align-items: stretch; }
  .search-actions { justify-content: flex-end; }
  .filter-row { grid-template-columns: 1fr; gap: 10px; }
  .result-card { padding: 14px; }
}
</style>
