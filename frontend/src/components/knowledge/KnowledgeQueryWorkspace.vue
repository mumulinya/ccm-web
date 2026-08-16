<script setup>
import { computed, ref } from 'vue'
import {
  ArrowUpRight,
  Bot,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  HelpCircle,
  LoaderCircle,
  MessageSquare,
  Search,
  Send,
  Sparkles,
  Zap,
} from '@lucide/vue'
import { toast } from '../../utils/toast.js'

const props = defineProps({
  availableTags: { type: Array, default: () => [] },
})

const emit = defineEmits(['open-source'])

const mode = ref('chat')
const query = ref('')
const loading = ref(false)
const answer = ref('')
const sources = ref([])
const retrieval = ref(null)
const elapsedMs = ref(0)
const selectedTags = ref([])
const scopeType = ref('all')
const scopeId = ref('')
const showSources = ref(false)

const scopeNeedsId = computed(() => ['group', 'project', 'agent'].includes(scopeType.value))
const canSubmit = computed(() => query.value.trim() && (!scopeNeedsId.value || scopeId.value.trim()) && !loading.value)

const toggleTag = (tag) => {
  selectedTags.value = selectedTags.value.includes(tag)
    ? selectedTags.value.filter(item => item !== tag)
    : [...selectedTags.value, tag]
}

const score = value => Number(value || 0).toFixed(3)
const percent = value => `${Math.max(4, Math.min(100, Number(value || 0) / 4.5 * 100))}%`

const run = async () => {
  if (!canSubmit.value) return
  loading.value = true
  answer.value = ''
  sources.value = []
  retrieval.value = null
  showSources.value = false
  const started = performance.now()
  try {
    const endpoint = mode.value === 'chat' ? '/api/rag/chat' : '/api/rag/query'
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query.value.trim(),
        tags: selectedTags.value,
        scopeType: scopeType.value,
        scopeId: scopeId.value.trim(),
        includeGlobal: true,
        limit: 8,
      }),
    })
    const data = await response.json()
    if (!response.ok || !data.success) throw new Error(data.error || '知识检索失败')
    answer.value = data.reply || ''
    sources.value = data.debugChunks || []
    retrieval.value = data.retrieval || null
    elapsedMs.value = Math.round(performance.now() - started)
  } catch (error) {
    toast.error(error?.message || '知识检索失败')
  } finally {
    loading.value = false
  }
}

const openSource = source => emit('open-source', { filename: source.filename, chunkIndex: Number(source.chunkIndex || 0) })
</script>

<template>
  <section class="query-workspace tool-panel">
    <!-- 面板头部 -->
    <div class="workspace-header">
      <div class="header-copy">
        <div class="title-row">
          <Sparkles :size="16" class="sparkle-icon" />
          <h2>知识问答与检索调试</h2>
        </div>
        <span>基于已归档的业务文档与向量语义进行准确回答</span>
      </div>

      <!-- Segmented Pill 模式切换 -->
      <div class="mode-segmented-pills">
        <button
          type="button"
          class="pill-btn"
          :class="{ active: mode === 'chat' }"
          @click="mode = 'chat'"
        >
          <MessageSquare :size="12" />
          <span>智能问答</span>
        </button>
        <button
          type="button"
          class="pill-btn"
          :class="{ active: mode === 'query' }"
          @click="mode = 'query'"
        >
          <Zap :size="12" />
          <span>检索调试</span>
        </button>
      </div>
    </div>

    <!-- 筛选控制栏 -->
    <div class="query-controls">
      <div class="scope-controls">
        <select v-model="scopeType" aria-label="检索范围">
          <option value="all">全部知识库范围</option>
          <option value="global">仅全局知识</option>
          <option value="group">指定群聊知识</option>
          <option value="project">指定项目知识</option>
          <option value="agent">指定 Agent 专属知识</option>
        </select>
        <input
          v-if="scopeNeedsId"
          v-model="scopeId"
          type="text"
          :placeholder="scopeType === 'group' ? '群聊 ID' : scopeType === 'project' ? '项目名称' : 'Agent 名称'"
        >
      </div>

      <div v-if="availableTags.length" class="tag-filter-list">
        <button
          v-for="tag in availableTags"
          :key="tag"
          type="button"
          class="tag-chip"
          :class="{ selected: selectedTags.includes(tag) }"
          @click="toggleTag(tag)"
        >
          {{ tag }}
        </button>
      </div>
    </div>

    <!-- 输入与发送框 -->
    <form class="query-input-container" @submit.prevent="run">
      <textarea
        v-model="query"
        rows="2"
        :placeholder="mode === 'chat' ? '输入你想询问的业务问题 (按 Ctrl+Enter 快速发送)...' : '输入关键词或句子以验证 RAG 召回命中...'"
        @keydown.ctrl.enter.prevent="run"
      ></textarea>
      <button
        type="submit"
        class="send-btn"
        :disabled="!canSubmit"
      >
        <LoaderCircle v-if="loading" :size="14" class="spinning" />
        <Send v-else :size="14" />
        <span>{{ loading ? (mode === 'chat' ? '回答中' : '检索中') : (mode === 'chat' ? '提问' : '检索') }}</span>
      </button>
    </form>
    <p v-if="scopeNeedsId && !scopeId.trim()" class="scope-warning">请填写要检索的范围标识后提问。</p>

    <!-- 结果呈现区 -->
    <div class="result-area" :class="{ empty: !answer && !sources.length && !loading }">
      <div v-if="loading" class="loading-state">
        <LoaderCircle :size="24" class="spinning loading-spinner" />
        <p>{{ mode === 'chat' ? '正在匹配相关文档片段并生成解答...' : '正在计算混合召回相关性得分...' }}</p>
      </div>

      <!-- 1. 问答解答展示 -->
      <div v-else-if="mode === 'chat' && answer" class="answer-result-box">
        <div class="answer-header">
          <div class="assistant-avatar">
            <Bot :size="16" />
          </div>
          <strong>知识助手解答</strong>
          <span class="elapsed-badge font-mono">{{ elapsedMs }}ms</span>
        </div>
        <div class="answer-content-text">{{ answer }}</div>

        <!-- 参考来源折叠 -->
        <div v-if="sources.length" class="sources-container">
          <button type="button" class="source-toggle-btn" @click="showSources = !showSources">
            <span>参考 {{ sources.length }} 处资料片段</span>
            <ChevronUp v-if="showSources" :size="13" />
            <ChevronDown v-else :size="13" />
          </button>
          <div v-if="showSources" class="source-card-grid">
            <div
              v-for="source in sources"
              :key="source.citation"
              class="source-citation-card"
              @click="openSource(source)"
            >
              <div class="source-card-head">
                <strong>{{ source.filename }}</strong>
                <span class="source-chunk-tag">{{ source.heading || `分片 #${Number(source.chunkIndex) + 1}` }}</span>
              </div>
              <p class="source-snippet">{{ source.text }}</p>
              <span class="open-source-link">
                <span>查看分片原文档</span>
                <ArrowUpRight :size="12" />
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. 调试模式分片列表 -->
      <div v-else-if="mode === 'query' && sources.length" class="debug-results-box">
        <div class="debug-header">
          <strong>命中 {{ sources.length }} 个文档分片</strong>
          <span class="elapsed-pill font-mono">耗时 {{ elapsedMs }} ms</span>
        </div>
        <div class="debug-card-list">
          <div
            v-for="source in sources"
            :key="source.citation"
            class="debug-chunk-card"
            @click="openSource(source)"
          >
            <div class="debug-card-top">
              <strong>{{ source.filename }}</strong>
              <span class="chunk-index-tag">{{ source.heading || `分片 #${Number(source.chunkIndex) + 1}` }}</span>
              <span class="score-pill font-mono">{{ source.retrievalMode || 'lexical' }} · 得分 {{ score(source.score) }}</span>
            </div>
            <div class="score-progress-track">
              <div class="score-bar" :style="{ width: percent(source.score) }"></div>
            </div>
            <p class="debug-text">{{ source.text }}</p>
          </div>
        </div>
      </div>

      <!-- 3. 无结果 -->
      <div v-else-if="!loading && (answer || retrieval)" class="no-results">
        <HelpCircle :size="24" />
        <p>未找到与该问题相关的匹配知识资料</p>
      </div>

      <!-- 4. 初始状态提示 -->
      <div v-else-if="!loading" class="initial-state">
        <div class="initial-icon">
          <Sparkles :size="22" />
        </div>
        <strong>{{ mode === 'chat' ? '输入问题开始与知识库对话' : '测试与验证 RAG 召回命中准确度' }}</strong>
        <p>{{ mode === 'chat' ? '系统将根据知识库内容进行严谨总结与来源引用' : '调试模式可实时查看各文档分片的向量得分与耗时' }}</p>
      </div>
    </div>

    <!-- 技术详情 -->
    <details v-if="retrieval" class="retrieval-details-box">
      <summary class="details-summary">RAG 检索引擎技术诊断</summary>
      <dl class="retrieval-dl">
        <div><dt>检索模式</dt><dd>{{ retrieval.mode }}</dd></div>
        <div><dt>向量模型</dt><dd>{{ retrieval.embedding === 'lexical' ? '词面纯文本' : retrieval.embedding }}</dd></div>
        <div><dt>降级状态</dt><dd>{{ retrieval.fallback ? (retrieval.fallbackReason || '词面降级中') : '无降级' }}</dd></div>
        <div><dt>重排策略</dt><dd>{{ retrieval.rerank || '默认' }}</dd></div>
        <div><dt>索引代次</dt><dd class="font-mono">{{ retrieval.indexGeneration || '未记录' }}</dd></div>
        <div><dt>耗时</dt><dd class="font-mono">{{ elapsedMs }} ms</dd></div>
      </dl>
      <p v-if="retrieval.error" class="retrieval-error">{{ retrieval.error }}</p>
    </details>
  </section>
</template>

<style scoped>
.query-workspace {
  background: var(--surface, var(--bg-card));
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
}

.font-mono {
  font-family: var(--font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

.workspace-header {
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 18px;
  border-bottom: 1px solid var(--border-color);
}

.title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.sparkle-icon {
  color: var(--accent-blue);
}

.workspace-header h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
}

.header-copy span {
  display: block;
  margin-top: 2px;
  color: var(--text-muted);
  font-size: 11px;
}

/* 模式切换 Segmented Control */
.mode-segmented-pills {
  display: inline-flex;
  align-items: center;
  gap: 2px;
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

/* 控制筛选 */
.query-controls {
  padding: 12px 18px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scope-controls {
  display: flex;
  gap: 8px;
}

.scope-controls select,
.scope-controls input {
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md, 6px);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  outline: none;
}

.scope-controls select:focus,
.scope-controls input:focus {
  border-color: var(--accent-blue);
}

.tag-filter-list {
  display: flex;
  gap: 5px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: thin;
}

.tag-chip {
  flex: 0 0 auto;
  padding: 2px 8px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tag-chip:hover {
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.tag-chip.selected {
  border-color: var(--accent-blue);
  background: var(--accent-soft, rgba(37, 99, 235, 0.1));
  color: var(--accent-blue);
  font-weight: 600;
}

/* 输入框 */
.query-input-container {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  padding: 10px 18px 12px;
}

.query-input-container textarea {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12.5px;
  line-height: 1.5;
  outline: none;
  transition: border-color 0.15s ease;
}

.query-input-container textarea:focus {
  border-color: var(--accent-blue);
  box-shadow: var(--focus-ring);
}

.send-btn {
  width: 76px;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 0;
  border-radius: 6px;
  background: var(--accent-blue, #2563eb);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.send-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.scope-warning {
  margin: -4px 18px 8px;
  color: var(--accent-red, #ef4444);
  font-size: 11px;
}

/* 结果呈现区 */
.result-area {
  min-height: 280px;
  border-top: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.initial-state,
.loading-state,
.no-results {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
}

.initial-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: var(--panel-muted);
  color: var(--accent-blue);
  margin-bottom: 2px;
}

.initial-state strong {
  color: var(--text-primary);
  font-size: 13px;
}

.initial-state p,
.loading-state p,
.no-results p {
  margin: 0;
  font-size: 11.5px;
  max-width: 360px;
  line-height: 1.5;
}

.loading-spinner {
  color: var(--accent-blue);
}

/* 问答结果卡片 */
.answer-result-box {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.answer-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
  font-size: 13px;
}

.assistant-avatar {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--accent-blue), #7c3aed);
  color: #fff;
}

.elapsed-badge {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-muted);
}

.answer-content-text {
  padding: 12px 14px;
  border-radius: 8px;
  background: var(--surface, var(--bg-card));
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 参考来源列表 */
.sources-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.source-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  width: fit-content;
  transition: all 0.15s ease;
}

.source-toggle-btn:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.source-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 8px;
}

.source-citation-card {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--surface);
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.source-citation-card:hover {
  border-color: var(--accent-blue);
  box-shadow: var(--shadow-sm);
}

.source-card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
}

.source-card-head strong {
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-chunk-tag {
  font-size: 10px;
  color: var(--text-muted);
  background: var(--panel-muted);
  padding: 1px 5px;
  border-radius: 4px;
}

.source-snippet {
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.open-source-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--accent-blue);
  font-size: 10.5px;
  font-weight: 600;
  margin-top: 2px;
}

/* 调试结果 */
.debug-results-box {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--text-primary);
  font-size: 12.5px;
}

.elapsed-pill {
  font-size: 11px;
  color: var(--text-muted);
}

.debug-card-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.debug-chunk-card {
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--surface);
  cursor: pointer;
  transition: border-color 0.15s ease;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.debug-chunk-card:hover {
  border-color: var(--accent-blue);
}

.debug-card-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.debug-card-top strong {
  font-size: 12px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chunk-index-tag {
  font-size: 10.5px;
  color: var(--text-muted);
}

.score-pill {
  margin-left: auto;
  font-size: 10.5px;
  color: var(--accent-blue);
  background: var(--accent-soft);
  padding: 1px 6px;
  border-radius: 4px;
}

.score-progress-track {
  height: 4px;
  border-radius: 999px;
  background: var(--panel-muted);
  overflow: hidden;
}

.score-bar {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent-blue), #10b981);
}

.debug-text {
  margin: 0;
  font-size: 11px;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* 技术诊断折叠 */
.retrieval-details-box {
  padding: 0 18px;
  border-top: 1px solid var(--border-color);
}

.retrieval-dl {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px 12px;
  margin: 0;
  padding-bottom: 12px;
}

.retrieval-dl div {
  display: flex;
  justify-content: space-between;
  font-size: 10.5px;
}

.retrieval-dl dt { color: var(--text-muted); }
.retrieval-dl dd { margin: 0; color: var(--text-primary); font-weight: 600; }

.retrieval-error {
  margin: 0 0 10px;
  padding: 6px 10px;
  border-radius: 4px;
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
  font-size: 11px;
}

.spinning {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 600px) {
  .workspace-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .mode-segmented-pills { width: 100%; justify-content: space-between; }
  .query-input-container { grid-template-columns: 1fr; }
  .send-btn { width: 100%; height: 34px; flex-direction: row; }
  .retrieval-dl { grid-template-columns: 1fr; }
}
</style>
