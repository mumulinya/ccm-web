<script setup>
import { computed, ref } from 'vue'
import { toast } from '../../utils/toast.js'

const props = defineProps({
  availableTags: { type: Array, default: () => [] }
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

const toggleTag = tag => {
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
        limit: 8
      })
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
    <div class="workspace-header">
      <div>
        <h2>知识问答</h2>
        <span>答案与来源分开呈现，检索参数保留在技术详情中</span>
      </div>
      <div class="mode-switch" role="tablist">
        <button type="button" :class="{ active: mode === 'chat' }" @click="mode = 'chat'">问答</button>
        <button type="button" :class="{ active: mode === 'query' }" @click="mode = 'query'">检索调试</button>
      </div>
    </div>

    <div class="query-controls">
      <div class="scope-controls">
        <select v-model="scopeType" aria-label="检索范围">
          <option value="all">全部范围</option>
          <option value="global">仅全局</option>
          <option value="group">指定群聊</option>
          <option value="project">指定项目</option>
          <option value="agent">指定 Agent</option>
        </select>
        <input v-if="scopeNeedsId" v-model="scopeId" type="text" :placeholder="scopeType === 'group' ? '群聊 ID' : scopeType === 'project' ? '项目名称' : 'Agent 名称'">
      </div>
      <div v-if="availableTags.length" class="tag-filter">
        <button v-for="tag in availableTags" :key="tag" type="button" :class="{ selected: selectedTags.includes(tag) }" @click="toggleTag(tag)">{{ tag }}</button>
      </div>
    </div>

    <form class="query-box" @submit.prevent="run">
      <textarea v-model="query" rows="3" :placeholder="mode === 'chat' ? '询问已归档资料中的业务问题' : '输入要验证的检索语句'" @keydown.ctrl.enter.prevent="run"></textarea>
      <button type="submit" :disabled="!canSubmit">{{ loading ? (mode === 'chat' ? '正在回答' : '正在检索') : (mode === 'chat' ? '发送' : '检索') }}</button>
    </form>
    <p v-if="scopeNeedsId && !scopeId.trim()" class="scope-warning">请填写要检索的范围标识。</p>

    <div class="result-area" :class="{ empty: !answer && !sources.length && !loading }">
      <div v-if="loading" class="loading-state"><span></span><p>{{ mode === 'chat' ? '正在查找相关资料并组织回答' : '正在计算相关性' }}</p></div>
      <div v-else-if="mode === 'chat' && answer" class="answer-result">
        <div class="answer-heading"><span class="assistant-mark">AI</span><strong>知识助手</strong></div>
        <div class="answer-text">{{ answer }}</div>
        <button v-if="sources.length" type="button" class="source-toggle" @click="showSources = !showSources">
          {{ showSources ? '收起来源' : `查看 ${sources.length} 个参考来源` }} <span>{{ showSources ? '↑' : '↓' }}</span>
        </button>
        <div v-if="showSources" class="source-list">
          <button v-for="source in sources" :key="source.citation" type="button" class="source-item" @click="openSource(source)">
            <div><strong>{{ source.filename }}</strong><span>{{ source.heading || `分片 ${Number(source.chunkIndex) + 1}` }}</span></div>
            <p>{{ source.text }}</p>
            <span class="open-label">打开来源 →</span>
          </button>
        </div>
      </div>
      <div v-else-if="mode === 'query' && sources.length" class="debug-results">
        <div class="debug-summary"><strong>找到 {{ sources.length }} 个匹配分片</strong><span>{{ elapsedMs }} ms</span></div>
        <button v-for="source in sources" :key="source.citation" type="button" class="debug-item" @click="openSource(source)">
          <div class="debug-line"><strong>{{ source.filename }}</strong><span>{{ source.heading || `分片 ${Number(source.chunkIndex) + 1}` }}</span><code>{{ score(source.score) }}</code></div>
          <div class="score-track"><span :style="{ width: percent(source.score) }"></span></div>
          <p>{{ source.text }}</p>
        </button>
      </div>
      <div v-else-if="!loading && (answer || retrieval)" class="no-results">没有找到匹配资料</div>
      <div v-else-if="!loading" class="initial-state"><strong>{{ mode === 'chat' ? '从业务资料中获得有来源的回答' : '检查检索是否命中正确资料' }}</strong><span>{{ mode === 'chat' ? '普通回答不会展示得分、向量模式等内部信息' : '调试结果会展示分片、得分和检索耗时' }}</span></div>
    </div>

    <details v-if="retrieval" class="retrieval-details">
      <summary>技术详情</summary>
      <dl>
        <div><dt>检索模式</dt><dd>{{ retrieval.mode }}</dd></div>
        <div><dt>检索引擎</dt><dd>{{ retrieval.embedding === 'hashing' ? '本地混合检索' : retrieval.embedding?.includes('fallback') ? '远程失败，已切换本地' : retrieval.embedding }}</dd></div>
        <div><dt>本地检索</dt><dd>{{ retrieval.fallback ? '正在使用' : '作为基础排序' }}</dd></div>
        <div><dt>排序策略</dt><dd>{{ retrieval.rerank }}</dd></div>
        <div><dt>耗时</dt><dd>{{ elapsedMs }} ms</dd></div>
        <div><dt>引用数量</dt><dd>{{ retrieval.citations?.length || 0 }}</dd></div>
      </dl>
      <p v-if="retrieval.error" class="retrieval-error">{{ retrieval.error }}</p>
    </details>
  </section>
</template>

<style scoped>
.tool-panel { background: var(--surface, #fff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 8px; overflow: hidden; }
.workspace-header { min-height: 58px; display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 0 18px; border-bottom: 1px solid var(--border-color, #e2e8f0); }
.workspace-header h2 { margin: 0; color: var(--text-primary, #0f172a); font-size: 14px; letter-spacing: 0; }
.workspace-header > div > span { display: block; margin-top: 3px; color: var(--text-secondary, #64748b); font-size: 10.5px; }
.mode-switch { display: flex; padding: 2px; border: 1px solid var(--border-color, #dbe2ea); border-radius: 7px; background: var(--bg-primary, #f8fafc); }
.mode-switch button { height: 28px; padding: 0 10px; border: none; border-radius: 5px; background: transparent; color: var(--text-secondary, #64748b); font-size: 11px; cursor: pointer; }
.mode-switch button.active { background: var(--surface, #fff); color: #1d4ed8; box-shadow: 0 1px 3px rgba(15,23,42,.12); font-weight: 600; }
.query-controls { padding: 12px 18px 0; }
.scope-controls { display: flex; gap: 8px; }
select, input, textarea { border: 1px solid var(--border-color, #dbe2ea); border-radius: 6px; background: var(--bg-primary, #f8fafc); color: var(--text-primary, #0f172a); font: inherit; font-size: 12px; outline: none; }
select, input { height: 32px; padding: 0 9px; } input { min-width: 180px; }
select:focus, input:focus, textarea:focus { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,.1); }
.tag-filter { display: flex; gap: 5px; overflow-x: auto; padding-top: 9px; scrollbar-width: thin; }
.tag-filter button { flex: 0 0 auto; padding: 3px 7px; border: 1px solid var(--border-color, #dbe2ea); border-radius: 5px; background: transparent; color: var(--text-secondary, #64748b); font-size: 10px; cursor: pointer; }
.tag-filter button.selected { border-color: #2563eb; background: #eff6ff; color: #1d4ed8; }
.query-box { display: grid; grid-template-columns: 1fr auto; align-items: stretch; gap: 8px; padding: 12px 18px; }
textarea { width: 100%; min-height: 72px; box-sizing: border-box; resize: vertical; padding: 10px 11px; line-height: 1.5; }
.query-box > button { width: 74px; border: 1px solid #1d4ed8; border-radius: 6px; background: #1d4ed8; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; }
.query-box > button:disabled { opacity: .5; cursor: not-allowed; }
.scope-warning { margin: -5px 18px 10px; color: #b91c1c; font-size: 10.5px; }
.result-area { min-height: 328px; border-top: 1px solid var(--border-color, #e2e8f0); background: var(--bg-primary, #f8fafc); }
.initial-state, .loading-state, .no-results { min-height: 328px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; padding: 24px; box-sizing: border-box; text-align: center; }
.initial-state strong { color: var(--text-primary, #334155); font-size: 13px; }.initial-state span, .loading-state p, .no-results { color: var(--text-secondary, #64748b); font-size: 11px; }
.loading-state span { width: 18px; height: 18px; border: 2px solid #bfdbfe; border-top-color: #2563eb; border-radius: 50%; animation: spin .8s linear infinite; }
.answer-result, .debug-results { padding: 18px; }
.answer-heading { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; color: var(--text-primary, #0f172a); font-size: 12px; }
.assistant-mark { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 7px; background: #172554; color: #fff; font-size: 9px; font-weight: 800; }
.answer-text { color: var(--text-primary, #1e293b); font-size: 13px; line-height: 1.75; white-space: pre-wrap; overflow-wrap: anywhere; }
.source-toggle { margin-top: 16px; padding: 7px 9px; border: 1px solid var(--border-color, #dbe2ea); border-radius: 6px; background: var(--surface, #fff); color: var(--text-primary, #334155); font-size: 11px; cursor: pointer; }
.source-list { display: grid; gap: 8px; margin-top: 10px; }
.source-item, .debug-item { width: 100%; display: block; padding: 11px; border: 1px solid var(--border-color, #dbe2ea); border-radius: 7px; background: var(--surface, #fff); color: inherit; text-align: left; cursor: pointer; }
.source-item:hover, .debug-item:hover { border-color: #2563eb; }
.source-item > div { display: flex; justify-content: space-between; gap: 10px; }.source-item strong, .debug-line strong { overflow: hidden; text-overflow: ellipsis; color: var(--text-primary, #334155); font-size: 11.5px; white-space: nowrap; }.source-item > div span, .debug-line span { color: var(--text-secondary, #64748b); font-size: 10px; white-space: nowrap; }
.source-item p, .debug-item p { display: -webkit-box; overflow: hidden; margin: 8px 0 0; color: var(--text-secondary, #64748b); font-size: 10.5px; line-height: 1.55; -webkit-box-orient: vertical; -webkit-line-clamp: 3; white-space: pre-wrap; }
.open-label { display: inline-block; margin-top: 8px; color: #1d4ed8; font-size: 10px; }
.debug-summary { display: flex; justify-content: space-between; margin-bottom: 10px; color: var(--text-primary, #334155); font-size: 11.5px; }.debug-summary span { color: var(--text-secondary, #64748b); }
.debug-results { display: grid; gap: 8px; }.debug-line { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 8px; align-items: center; }.debug-line code { color: #1d4ed8; font-size: 10px; }
.score-track { height: 3px; margin-top: 8px; border-radius: 2px; overflow: hidden; background: #e2e8f0; }.score-track span { display: block; height: 100%; background: #2563eb; }
.retrieval-details { border-top: 1px solid var(--border-color, #e2e8f0); padding: 0 18px; }.retrieval-details summary { padding: 10px 0; color: var(--text-secondary, #64748b); font-size: 10.5px; cursor: pointer; }.retrieval-details dl { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 14px; margin: 0; padding-bottom: 13px; }.retrieval-details dl div { display: flex; justify-content: space-between; gap: 8px; font-size: 10px; }dt { color: var(--text-secondary, #64748b); }dd { margin: 0; color: var(--text-primary, #334155); text-align: right; }.retrieval-error { margin: 0 0 13px; padding: 8px; background: rgba(217,119,6,.08); color: #b45309; font-size: 10.5px; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 650px) { .workspace-header { align-items: flex-start; flex-direction: column; padding: 14px; }.mode-switch { width: 100%; }.mode-switch button { flex: 1; }.query-controls { padding: 10px 14px 0; }.scope-controls { flex-direction: column; }.scope-controls input { min-width: 0; }.query-box { grid-template-columns: 1fr; padding: 10px 14px 14px; }.query-box > button { width: 100%; height: 36px; }.answer-result, .debug-results { padding: 14px; }.retrieval-details { padding: 0 14px; }.retrieval-details dl { grid-template-columns: 1fr; } }
</style>
