<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, Braces, ChevronDown, ChevronRight,
  CircleAlert, CircleCheck, Copy, Database, Download, FileCode2, FileSearch, FolderTree,
  GitBranch, History, ListTree, LoaderCircle, Network, Play, RefreshCw, RotateCcw,
  Search, Send, Server, Settings2, ShieldCheck, Wrench,
} from '@lucide/vue'
import { toast } from '../../utils/toast.js'

const emit = defineEmits(['navigate'])
const HISTORY_KEY = 'ccm:code-intelligence:query-history:v1'
const OPERATIONS = [
  ['workspace_symbols', '工作区符号'], ['document_symbols', '文件符号'], ['find_definition', '查找定义'],
  ['find_references', '查找引用'], ['find_implementations', '查找实现'], ['find_type_definition', '类型定义'],
  ['find_incoming_calls', '调用者'], ['find_outgoing_calls', '被调用者'], ['read_code_diagnostics', '代码诊断'],
]

const projects = ref([])
const servers = ref([])
const groups = ref([])
const selectedProject = ref('')
const selectedOperation = ref('workspace_symbols')
const queryText = ref('')
const fileQuery = ref('')
const files = ref([])
const filesCursor = ref('')
const filesTotal = ref(0)
const selectedFile = ref('')
const selectedLocation = ref(null)
const results = ref([])
const diagnostics = ref([])
const verificationDiagnostics = ref([])
const resultMeta = ref(null)
const resultCursor = ref('')
const resultSearch = ref('')
const severityFilter = ref([])
const sourcePreview = ref(null)
const sourceLoading = ref(false)
const loading = ref(false)
const querying = ref(false)
const working = ref('')
const error = ref('')
const leftMode = ref('files')
const relationView = ref('tree')
const showServers = ref(false)
const groupPickerOpen = ref(false)
const selectedGroup = ref('')
const history = ref([])
const indexRun = ref(null)
const callTrail = ref([])
let runPoll = null

const request = async (url, options = {}) => {
  const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store', headers: { 'Content-Type': 'application/json' }, ...options })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.success === false) throw new Error(data.error || `HTTP ${response.status}`)
  return data
}

const currentProject = computed(() => projects.value.find(item => item.project === selectedProject.value) || null)
const totals = computed(() => projects.value.reduce((sum, item) => ({ files: sum.files + Number(item.files || 0), symbols: sum.symbols + Number(item.symbols || 0), diagnostics: sum.diagnostics + Number(item.diagnostics || 0) }), { files: 0, symbols: 0, diagnostics: 0 }))
const isDiagnosticMode = computed(() => selectedOperation.value === 'read_code_diagnostics')
const isCallMode = computed(() => ['find_incoming_calls', 'find_outgoing_calls'].includes(selectedOperation.value))
const selectedDiagnostic = computed(() => selectedLocation.value ? diagnostics.value.find(item => item.path === selectedLocation.value.path && item.range?.startLine === selectedLocation.value.range?.startLine && String(item.code) === String(selectedLocation.value.symbol)) : null)
const visibleResults = computed(() => {
  const needle = resultSearch.value.trim().toLowerCase()
  if (!needle) return results.value
  return results.value.filter(item => `${item.symbol} ${item.kind} ${item.container || ''} ${item.path}`.toLowerCase().includes(needle))
})
const sourceLines = computed(() => sourcePreview.value?.lines || [])
const coveragePercent = computed(() => {
  const coverage = currentProject.value?.coverage
  return coverage?.total ? Math.round(Number(coverage.supported || 0) / Number(coverage.total) * 100) : 0
})
const activeHistory = computed(() => history.value.filter(item => item.project === selectedProject.value))
const needsInitialIndex = computed(() => currentProject.value?.status === 'not_indexed')
const projectStatusLabel = status => ({
  not_indexed: '尚未建立索引',
  ready: '索引已就绪',
  stopped: '索引已停止',
  unavailable: '源码路径不可用',
}[String(status || '')] || String(status || '状态未知'))

const loadHistory = () => {
  try { history.value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]').slice(0, 50) } catch { history.value = [] }
}
const saveHistory = item => {
  history.value = [item, ...history.value.filter(row => row.id !== item.id)].slice(0, 50)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [projectData, serverData, groupData] = await Promise.all([
      request('/api/code-intelligence/projects'), request('/api/code-intelligence/language-servers'),
      request('/api/groups').catch(() => ({ groups: [] })),
    ])
    projects.value = projectData.projects || []
    servers.value = serverData.languageServers || []
    groups.value = groupData.groups || []
    if (!selectedProject.value || !projects.value.some(item => item.project === selectedProject.value)) selectedProject.value = projects.value.find(item => item.pathAvailable !== false)?.project || projects.value[0]?.project || ''
  } catch (cause) { error.value = cause.message || String(cause) }
  finally { loading.value = false }
}

async function loadFiles(reset = true) {
  if (!selectedProject.value || currentProject.value?.pathAvailable === false) return
  if (reset) { files.value = []; filesCursor.value = '' }
  try {
    const params = new URLSearchParams({ limit: '200', cursor: reset ? '' : filesCursor.value, query: fileQuery.value.trim() })
    const data = await request(`/api/code-intelligence/projects/${encodeURIComponent(selectedProject.value)}/files?${params}`)
    files.value = reset ? (data.files || []) : [...files.value, ...(data.files || [])]
    filesCursor.value = data.nextCursor || ''
    filesTotal.value = Number(data.total || 0)
  } catch (cause) { if (!/index/i.test(String(cause?.message || ''))) toast.error(cause.message || '读取索引文件失败') }
}

const queryPayload = cursor => ({
  project: selectedProject.value,
  operation: selectedOperation.value,
  query: queryText.value.trim(),
  symbol: selectedLocation.value?.symbol || queryText.value.trim(),
  path: selectedLocation.value?.path || selectedFile.value,
  line: selectedLocation.value?.range?.startLine,
  character: selectedLocation.value?.range?.startCharacter,
  filters: { severity: severityFilter.value, filePattern: fileQuery.value.trim() },
  cursor: cursor || '', limit: 100,
})

async function runQuery({ append = false, payload = null } = {}) {
  if (!selectedProject.value || querying.value) return
  querying.value = true
  error.value = ''
  try {
    const input = payload || queryPayload(append ? resultCursor.value : '')
    if (input.operation === 'document_symbols' && !input.path) throw new Error('请先在左侧选择文件')
    const data = await request('/api/code-intelligence/query', { method: 'POST', body: JSON.stringify(input) })
    const result = data.result || {}
    results.value = append ? [...results.value, ...(result.locations || [])] : (result.locations || [])
    diagnostics.value = append ? [...diagnostics.value, ...(result.diagnostics || [])] : (result.diagnostics || [])
    verificationDiagnostics.value = result.verificationDiagnostics || []
    resultMeta.value = result
    resultCursor.value = result.nextCursor || ''
    const record = { id: `${selectedProject.value}:${result.resultChecksum || Date.now()}`, project: selectedProject.value, operation: input.operation, query: input.query || input.symbol || input.path || '', path: input.path || '', line: input.line || 0, character: input.character || 0, resultChecksum: result.resultChecksum || '', indexGeneration: result.indexGeneration || 0, createdAt: new Date().toISOString(), total: Number(result.total ?? result.locations?.length ?? 0), freshness: result.freshness || 'current' }
    saveHistory(record)
    if (!append && results.value.length) await selectResult(results.value[0])
  } catch (cause) { error.value = cause.message || String(cause); toast.error(error.value) }
  finally { querying.value = false }
}

async function selectResult(item) {
  selectedLocation.value = item
  selectedFile.value = item?.path || selectedFile.value
  if (!item?.path) return
  sourceLoading.value = true
  try {
    const params = new URLSearchParams({ path: item.path, line: String(item.range?.startLine || 1), context: '32' })
    const data = await request(`/api/code-intelligence/projects/${encodeURIComponent(selectedProject.value)}/source?${params}`)
    sourcePreview.value = data.source || null
    const expected = resultMeta.value?.repoStateIdentity
    const current = sourcePreview.value?.repoStateIdentity
    if (expected && current && ['gitHead','gitTreeHash','gitStatusHash','dirtyPatchHash'].some(key => String(expected[key] || '') !== String(current[key] || ''))) {
      resultMeta.value = { ...resultMeta.value, freshness: 'stale', staleReason: '查询后项目代码状态已变化，请重新执行查询' }
    }
  } catch (cause) { sourcePreview.value = null; toast.error(cause.message || '源码位置不可读取') }
  finally { sourceLoading.value = false }
}

async function selectFile(file) {
  selectedFile.value = file.path
  selectedLocation.value = { path: file.path, symbol: '', kind: 'file', range: { startLine: 1, startCharacter: 0, endLine: 1, endCharacter: 0 }, language: file.language, serverId: file.serverId }
  selectedOperation.value = 'document_symbols'
  queryText.value = ''
  await runQuery()
}

async function expandCalls(item, direction) {
  callTrail.value.push({
    operation: selectedOperation.value,
    query: queryText.value,
    file: selectedFile.value,
    location: selectedLocation.value ? JSON.parse(JSON.stringify(selectedLocation.value)) : null,
  })
  selectedLocation.value = item
  selectedOperation.value = direction
  await runQuery()
}

async function returnCallLevel() {
  const previous = callTrail.value.pop()
  if (!previous) return
  selectedOperation.value = previous.operation
  queryText.value = previous.query
  selectedFile.value = previous.file
  selectedLocation.value = previous.location
  await runQuery()
}

const symbolIndent = item => selectedOperation.value === 'document_symbols'
  ? Math.min(4, String(item?.container || '').split('.').filter(Boolean).length) * 14
  : 0

const pollRun = runId => {
  clearInterval(runPoll)
  runPoll = setInterval(async () => {
    try {
      const data = await request(`/api/code-intelligence/index-runs/${encodeURIComponent(runId)}`)
      indexRun.value = data.run
      if (['completed', 'failed'].includes(data.run?.state)) { clearInterval(runPoll); await load(); await loadFiles(true) }
    } catch { clearInterval(runPoll) }
  }, 1000)
}

async function projectAction(project, action) {
  working.value = `${project}:${action}`
  try {
    const endpoint = action === 'repair' ? 'repair' : action
    const data = await request(`/api/code-intelligence/projects/${encodeURIComponent(project)}/${endpoint}`, { method: 'POST', body: JSON.stringify({ reason: action === 'reindex' ? '管理员显式重建代码语义索引' : action === 'repair' ? '管理员修复代码智能能力' : '管理员按需启动代码语义索引' }) })
    indexRun.value = data.run || null
    if (data.run?.runId) pollRun(data.run.runId)
    toast.success(action === 'reindex' ? '索引重建已排队' : action === 'repair' ? '修复任务已启动' : '代码智能启动任务已创建')
  } catch (cause) { toast.error(cause.message || String(cause)) }
  finally { working.value = '' }
}

async function serverAction(server, action) {
  working.value = `${server.id}:${action}`
  try {
    const data = await request(`/api/code-intelligence/language-servers/${encodeURIComponent(server.id)}/${action}`, { method: 'POST', body: JSON.stringify(action === 'install' ? {} : { reason: `管理员${action}语言服务` }) })
    if (data.requiresConfirmation) toast.info('已生成固定来源与checksum安装预览；配置可信包源后才可执行')
    await load()
  } catch (cause) { toast.error(cause.message || String(cause)) }
  finally { working.value = '' }
}

const locationReference = item => item ? `${selectedProject.value}:${item.path}:${item.range?.startLine || 1}:${(item.range?.startCharacter || 0) + 1}` : selectedProject.value
const copyLocation = async () => {
  if (!selectedLocation.value) return
  await navigator.clipboard.writeText(locationReference(selectedLocation.value))
  toast.success('已复制代码位置引用')
}
const agentDraft = item => {
  const diagnostic = selectedDiagnostic.value
  const lines = [
    '请基于当前权威代码重新核验下面的代码智能发现，并给出处理建议；如需修改，请先制定执行计划。',
    `项目：${selectedProject.value}`,
    `位置：${locationReference(item)}`,
    item?.symbol ? `符号：${item.symbol}${item.container ? `（${item.container}）` : ''}` : '',
    diagnostic ? `诊断：${diagnostic.severity} ${diagnostic.code} · ${diagnostic.messagePreview}` : '',
    resultMeta.value?.evidenceId ? `Evidence：${resultMeta.value.evidenceId}` : '',
    resultMeta.value?.resultChecksum ? `查询校验：${resultMeta.value.resultChecksum}` : '',
    `新鲜度：${resultMeta.value?.freshness || 'current'}；请勿仅依赖此摘要，执行前重新查询代码状态。`,
  ]
  return lines.filter(Boolean).join('\n')
}
const sendToProject = () => {
  if (!selectedLocation.value) return toast.info('请先选择一个符号、诊断或调用位置')
  emit('navigate', { tab: 'projects', project: selectedProject.value, draftMessage: agentDraft(selectedLocation.value) })
}
const openGroupPicker = () => {
  if (!selectedLocation.value) return toast.info('请先选择一个符号、诊断或调用位置')
  selectedGroup.value = selectedGroup.value || groups.value[0]?.id || ''
  groupPickerOpen.value = true
}
const sendToGroup = () => {
  if (!selectedGroup.value) return
  emit('navigate', { tab: 'groups', groupId: selectedGroup.value, draftMessage: agentDraft(selectedLocation.value) })
  groupPickerOpen.value = false
}
const openChanges = () => emit('navigate', { tab: 'changes', project: selectedProject.value })

const escapeCsv = value => `"${String(value ?? '').replace(/"/g, '""')}"`
const exportResults = format => {
  const safe = results.value.map(item => ({ project: selectedProject.value, symbol: item.symbol, kind: item.kind, container: item.container || '', path: item.path, line: item.range?.startLine || 1, character: item.range?.startCharacter || 0, language: item.language || '', serverId: item.serverId || '', resultChecksum: resultMeta.value?.resultChecksum || '', freshness: resultMeta.value?.freshness || 'current' }))
  const content = format === 'csv'
    ? [['project','symbol','kind','container','path','line','character','language','serverId','resultChecksum','freshness'], ...safe.map(row => Object.values(row))].map(row => row.map(escapeCsv).join(',')).join('\n')
    : JSON.stringify({ schema: 'ccm-code-intelligence-export-v1', generatedAt: new Date().toISOString(), rows: safe, contentStored: false }, null, 2)
  const blob = new Blob([content], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8' })
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `code-intelligence-${selectedProject.value}.${format}`; link.click(); URL.revokeObjectURL(link.href)
}
const replayHistory = row => {
  selectedProject.value = row.project; selectedOperation.value = row.operation; queryText.value = row.query || ''; selectedFile.value = row.path || ''; selectedLocation.value = row.path ? { path: row.path, symbol: row.query || '', range: { startLine: row.line || 1, startCharacter: row.character || 0 } } : null
  runQuery()
}
const clearHistory = () => { history.value = history.value.filter(item => item.project !== selectedProject.value); localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value)) }

watch(selectedProject, async () => {
  selectedLocation.value = null; sourcePreview.value = null; results.value = []; diagnostics.value = []; resultMeta.value = null; selectedFile.value = ''; callTrail.value = []
  await loadFiles(true)
})
watch(fileQuery, () => { clearTimeout(window.__ccmCodeFileSearchTimer); window.__ccmCodeFileSearchTimer = setTimeout(() => loadFiles(true), 250) })
onMounted(async () => { loadHistory(); await load(); await nextTick(); await loadFiles(true) })
onBeforeUnmount(() => clearInterval(runPoll))
</script>

<template>
  <section class="code-intelligence-page">
    <header class="page-head">
      <div><span class="eyebrow">CODE INTELLIGENCE</span><h1>代码智能工作台</h1><p>用真实语言服务精确查找符号、调用关系和诊断；源码只在当前页面按需读取。</p></div>
      <div class="head-actions"><button @click="showServers = !showServers"><Server :size="16" />语言服务</button><button class="icon" :disabled="loading" title="刷新" @click="load"><RefreshCw :size="17" :class="{ spin: loading }" /></button></div>
    </header>

    <div v-if="error" class="banner error"><CircleAlert :size="17" /><span>{{ error }}</span><button v-if="selectedProject" @click="projectAction(selectedProject, 'repair')"><Wrench :size="14" />修复</button></div>
    <div v-if="indexRun && !['completed','failed'].includes(indexRun.state)" class="banner running"><LoaderCircle class="spin" :size="17" /><span>正在{{ indexRun.mode === 'reindex' ? '重建' : '建立' }}索引：{{ indexRun.processedFiles || 0 }} / {{ indexRun.totalFiles || '待统计' }}</span></div>

    <section class="status-strip" aria-label="索引与语义状态">
      <div class="project-picker-card">
        <label>
          <span>当前项目</span>
          <select v-model="selectedProject">
            <option v-for="project in projects" :key="project.project" :value="project.project">
              {{ project.project }} · {{ projectStatusLabel(project.status) }}
            </option>
          </select>
        </label>
        <small class="project-status" :class="currentProject?.status">{{ projectStatusLabel(currentProject?.status) }}</small>
      </div>

      <article class="metric-card">
        <span class="metric-icon files-icon"><Database :size="16" /></span>
        <div class="metric-body">
          <span>文件总数</span>
          <strong class="font-mono">{{ currentProject?.files || 0 }}</strong>
        </div>
      </article>

      <article class="metric-card">
        <span class="metric-icon symbols-icon"><Braces :size="16" /></span>
        <div class="metric-body">
          <span>符号总数</span>
          <strong class="font-mono">{{ currentProject?.symbols || 0 }}</strong>
        </div>
      </article>

      <article class="metric-card">
        <span class="metric-icon diag-icon"><CircleAlert :size="16" /></span>
        <div class="metric-body">
          <span>代码诊断</span>
          <strong class="font-mono">{{ currentProject?.diagnostics || 0 }}</strong>
        </div>
      </article>

      <article class="metric-card">
        <span class="metric-icon coverage-icon"><ShieldCheck :size="16" /></span>
        <div class="metric-body">
          <span>语义覆盖</span>
          <strong class="font-mono">{{ coveragePercent }}%</strong>
        </div>
      </article>

      <div class="status-actions">
        <button :disabled="!!working || currentProject?.pathAvailable === false" @click="projectAction(selectedProject, 'start')"><Play :size="14" />启动</button>
        <button :disabled="!!working || currentProject?.pathAvailable === false" @click="projectAction(selectedProject, 'reindex')"><RotateCcw :size="14" />重建</button>
      </div>
    </section>

    <section v-if="currentProject?.pathAvailable === false" class="project-unavailable"><AlertTriangle :size="18" /><div><strong>项目源码路径不可用</strong><p>{{ currentProject.errorSummary }}</p></div><button @click="emit('navigate', { tab: 'projects', project: selectedProject, configureRuntime: true })">打开项目配置</button></section>

    <section v-if="showServers" class="server-panel">
      <div class="panel-title"><div><h2>语言服务</h2><span>TS/JS随包提供；其他服务按固定来源和checksum受管安装</span></div><button @click="showServers = false">收起</button></div>
      <div class="server-grid"><article v-for="server in servers" :key="server.id"><div><Server :size="17" /><b>{{ server.id }}</b><span class="state" :class="server.status">{{ server.status }}</span></div><p>{{ server.languages.join(' · ') }}</p><small>{{ server.discoveredPath || server.source }}</small><button v-if="server.status !== 'missing'" :disabled="!!working" @click="serverAction(server, 'stop')">停止</button><button v-else :disabled="!!working" @click="serverAction(server, 'install')">安装预览</button></article></div>
    </section>

    <main class="workbench">
      <aside class="left-pane">
        <nav><button :class="{ active: leftMode === 'files' }" @click="leftMode = 'files'"><FolderTree :size="14" />文件</button><button :class="{ active: leftMode === 'history' }" @click="leftMode = 'history'"><History :size="14" />历史</button></nav>
        <template v-if="leftMode === 'files'">
          <label class="search-box"><Search :size="14" /><input v-model="fileQuery" placeholder="搜索文件" /></label>
          <div class="language-coverage">
            <button v-for="item in currentProject?.languages || []" :key="item.language" :class="{ missing: !item.semantic }" @click="fileQuery = ''"><span>{{ item.language }}</span><b>{{ item.files }}</b><small>{{ item.serverState }}</small></button>
          </div>
          <div v-if="currentProject?.coverage?.missingServer || currentProject?.coverage?.unsupported || currentProject?.coverage?.oversized" class="coverage-warnings"><span v-if="currentProject.coverage.missingServer">缺少服务 {{ currentProject.coverage.missingServer }}</span><span v-if="currentProject.coverage.unsupported">暂不支持 {{ currentProject.coverage.unsupported }}</span><span v-if="currentProject.coverage.oversized">文件过大 {{ currentProject.coverage.oversized }}</span></div>
          <div class="file-list"><button v-for="file in files" :key="file.path" :class="{ active: selectedFile === file.path }" @click="selectFile(file)"><FileCode2 :size="14" /><span><strong>{{ file.path.split('/').pop() }}</strong><small>{{ file.path }} · {{ file.language }}</small></span></button><button v-if="filesCursor" class="load-more" @click="loadFiles(false)">继续加载（{{ files.length }}/{{ filesTotal }}）</button><div v-if="!files.length" class="empty index-empty"><p>{{ needsInitialIndex ? '尚未建立索引。建立后即可浏览文件、符号和诊断。' : '当前索引没有可展示的源码文件。' }}</p><button v-if="needsInitialIndex" class="primary" :disabled="!!working || currentProject?.pathAvailable === false" @click="projectAction(selectedProject, 'start')"><Play :size="14" />建立索引</button></div></div>
        </template>
        <template v-else>
          <div class="history-head"><span>{{ activeHistory.length }} 条查询</span><button @click="clearHistory">清除</button></div>
          <div class="history-list"><button v-for="item in activeHistory" :key="item.id" @click="replayHistory(item)"><strong>{{ OPERATIONS.find(row => row[0] === item.operation)?.[1] || item.operation }}</strong><span>{{ item.query || item.path || '全部' }}</span><small :class="{ stale: Number(item.indexGeneration) !== Number(currentProject?.generation || 0) }">{{ item.total }} 项 · generation {{ item.indexGeneration }}{{ Number(item.indexGeneration) !== Number(currentProject?.generation || 0) ? ' · 已陈旧' : '' }}</small></button><p v-if="!activeHistory.length" class="empty">当前项目没有查询历史</p></div>
        </template>
      </aside>

      <section class="result-pane">
        <header class="query-toolbar">
          <select v-model="selectedOperation" @change="callTrail = []"><option v-for="item in OPERATIONS" :key="item[0]" :value="item[0]">{{ item[1] }}</option></select>
          <label><Search :size="14" /><input v-model="queryText" :placeholder="isDiagnosticMode ? '可留空查看全部诊断' : selectedOperation === 'document_symbols' ? '选择文件后可筛选符号' : '输入符号或关键词'" @keydown.enter="runQuery()" /></label>
          <button class="primary" :disabled="querying || !selectedProject" @click="runQuery()"><LoaderCircle v-if="querying" class="spin" :size="14" /><FileSearch v-else :size="14" />查询</button>
        </header>
        <div v-if="isDiagnosticMode" class="filter-row"><span>严重级别</span><label v-for="level in ['error','warning','suggestion','information']" :key="level"><input v-model="severityFilter" type="checkbox" :value="level" />{{ level }}</label></div>
        <div class="result-summary">
          <span>{{ resultMeta ? `${resultMeta.total ?? results.length} 项结果` : '等待查询' }}</span>
          <span v-if="resultMeta" class="freshness" :class="resultMeta.freshness"><CircleCheck v-if="resultMeta.freshness === 'current'" :size="13" /><AlertTriangle v-else :size="13" />{{ resultMeta.freshness === 'current' ? '当前代码状态' : '结果已陈旧' }}</span>
          <label><Search :size="13" /><input v-model="resultSearch" placeholder="筛选结果" /></label>
          <div class="export-actions"><button :disabled="!results.length" @click="exportResults('json')"><Download :size="13" />JSON</button><button :disabled="!results.length" @click="exportResults('csv')">CSV</button></div>
        </div>
        <div v-if="isCallMode && results.length" class="view-switch"><button v-if="callTrail.length" title="返回上一层调用关系" @click="returnCallLevel"><ArrowLeft :size="14" />上一层</button><button :class="{ active: relationView === 'tree' }" @click="relationView = 'tree'"><ListTree :size="14" />树</button><button :class="{ active: relationView === 'graph' }" @click="relationView = 'graph'"><Network :size="14" />图</button><span v-if="callTrail.length">第 {{ callTrail.length + 1 }} 层</span></div>

        <div v-if="relationView === 'graph' && isCallMode && visibleResults.length" class="call-graph"><div class="graph-root">{{ selectedLocation?.symbol || queryText }}</div><div class="graph-edge"></div><div class="graph-nodes"><button v-for="item in visibleResults" :key="`${item.path}:${item.range.startLine}:${item.symbol}`" @click="selectResult(item)"><strong>{{ item.symbol }}</strong><small>{{ item.path }}:{{ item.range.startLine }}</small></button></div></div>
        <div v-else class="result-list">
          <button v-for="item in visibleResults" :key="`${item.path}:${item.range.startLine}:${item.range.startCharacter}:${item.symbol}:${item.kind}`" :class="{ active: selectedLocation === item }" @click="selectResult(item)">
            <span class="kind">{{ item.kind }}</span><span class="result-main" :style="{ paddingLeft: `${symbolIndent(item)}px` }"><strong>{{ item.symbol || '(匿名)' }}</strong><small>{{ item.container ? `${item.container} · ` : '' }}{{ item.path }}:{{ item.range.startLine }}:{{ (item.range.startCharacter || 0) + 1 }}</small><em v-if="isDiagnosticMode">{{ diagnostics.find(row => row.path === item.path && row.range?.startLine === item.range?.startLine && String(row.code) === String(item.symbol))?.messagePreview }}</em></span>
            <span v-if="isCallMode" class="call-actions"><i @click.stop="expandCalls(item, 'find_incoming_calls')">调用者</i><i @click.stop="expandCalls(item, 'find_outgoing_calls')">被调用者</i></span><ChevronRight :size="14" />
          </button>
          <button v-if="resultCursor" class="load-more" :disabled="querying" @click="runQuery({ append: true })">继续加载</button>
          <p v-if="resultMeta && !visibleResults.length" class="empty">没有找到匹配的语义结果；CCM不会用文本搜索伪造定义或引用。</p>
          <div v-if="!resultMeta" class="empty hero"><Network :size="30" /><p>{{ needsInitialIndex ? '先建立当前项目索引，再查询符号、调用关系和诊断。' : '选择查询类型，开始检查代码结构。' }}</p><button v-if="needsInitialIndex" class="primary" :disabled="!!working || currentProject?.pathAvailable === false" @click="projectAction(selectedProject, 'start')"><Play :size="14" />建立索引</button></div>
        </div>
        <section v-if="isDiagnosticMode && verificationDiagnostics.length" class="verification-results"><h3>构建与验证记录</h3><article v-for="item in verificationDiagnostics" :key="item.operationId"><span class="state" :class="item.status">{{ item.status }}</span><strong>{{ item.operationType }}</strong><small>{{ item.evidence?.[0]?.summary || item.updatedAt }}</small></article></section>
      </section>

      <aside class="source-pane">
        <header><div><span>源码定位</span><strong :title="selectedLocation?.path">{{ selectedLocation?.path || '尚未选择位置' }}</strong></div><div><button :disabled="!selectedLocation" @click="copyLocation"><Copy :size="14" /></button><button :disabled="!selectedLocation" @click="selectResult(selectedLocation)"><RefreshCw :size="14" /></button></div></header>
        <div v-if="selectedLocation" class="location-meta"><span>{{ selectedLocation.language || 'source' }}</span><span>{{ selectedLocation.serverId || resultMeta?.languageServer }}</span><span>Ln {{ selectedLocation.range?.startLine || 1 }}</span></div>
        <div v-if="sourceLoading" class="source-loading"><LoaderCircle class="spin" />正在从权威项目目录读取…</div>
        <div v-else-if="sourcePreview" class="source-viewer"><div v-for="row in sourceLines" :key="row.line" :class="{ target: row.line === sourcePreview.targetLine }"><span>{{ row.line }}</span><code>{{ row.text || ' ' }}</code></div></div>
        <div v-else class="source-empty"><FileCode2 :size="32" /><p>点击符号、诊断或调用节点后，在这里查看当前版本的源码位置。</p></div>
        <section v-if="selectedLocation" class="detail-card"><h3>位置详情</h3><dl><dt>符号</dt><dd>{{ selectedLocation.symbol || '—' }}</dd><dt>容器</dt><dd>{{ selectedLocation.container || '—' }}</dd><dt>Evidence</dt><dd>{{ resultMeta?.evidenceId || '—' }}</dd><dt>Generation</dt><dd>{{ resultMeta?.indexGeneration ?? '—' }}</dd><dt>新鲜度</dt><dd>{{ resultMeta?.freshness || '—' }}</dd></dl></section>
        <section v-if="selectedLocation" class="agent-actions"><h3>继续处理</h3><button class="primary" @click="sendToProject"><Send :size="14" />交给项目 Agent</button><button @click="openGroupPicker"><Send :size="14" />交给群聊 Agent</button><button @click="openChanges"><GitBranch :size="14" />打开代码改动页</button><p>只生成带来源引用的草稿，由你确认后发送。</p></section>
      </aside>
    </main>

    <div v-if="groupPickerOpen" class="modal" @click.self="groupPickerOpen = false"><form @submit.prevent="sendToGroup"><header><h3>选择群聊 Agent</h3><button type="button" @click="groupPickerOpen = false">×</button></header><p>查询结果将作为无源码正文的引用草稿带入群聊。</p><select v-model="selectedGroup"><option v-for="group in groups" :key="group.id" :value="group.id">{{ group.name || group.id }}</option></select><footer><button type="button" @click="groupPickerOpen = false">取消</button><button class="primary" type="submit" :disabled="!selectedGroup">带到群聊会话</button></footer></form></div>
  </section>
</template>

<style scoped>
.font-mono {
  font-family: var(--font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

.code-intelligence-page {
  --ci-surface: var(--surface, #fff);
  --ci-raised: var(--surface-raised, var(--surface, #fff));
  --ci-subtle: var(--surface-subtle, var(--bg-primary));
  --ci-border: var(--border-color);
  --ci-muted: var(--text-muted);
  --ci-accent-soft: var(--accent-soft);
  height: 100%;
  overflow: auto;
  padding: 16px 20px;
  background: var(--bg-primary);
  color: var(--text-primary);
}

button, select, input { font: inherit; }

.page-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 12px;
}

.page-head h1 {
  margin: 2px 0 4px;
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.page-head p {
  margin: 0;
  color: var(--text-muted);
  font-size: 11.5px;
}

.eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--accent-blue);
  text-transform: uppercase;
}

.head-actions, .status-actions, .export-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.code-intelligence-page button {
  height: 30px;
  border: 1px solid var(--border-color);
  background: var(--surface);
  color: var(--text-secondary);
  border-radius: 6px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.code-intelligence-page button:hover:not(:disabled) {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

button:disabled { opacity: 0.45; cursor: not-allowed; }
.primary {
  background: var(--accent-blue) !important;
  border-color: var(--accent-blue) !important;
  color: #fff !important;
}

.primary:hover:not(:disabled) {
  background: color-mix(in srgb, var(--accent-blue) 88%, #000) !important;
}

.icon { width: 30px; padding: 0 !important; }

.banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 7px;
  margin-bottom: 10px;
  font-size: 11.5px;
}

.banner span { flex: 1; }
.banner.error {
  border: 1px solid color-mix(in srgb, var(--accent-red, #ef4444) 30%, var(--border-color));
  background: var(--danger-soft);
  color: var(--accent-red);
}

.banner.running {
  border: 1px solid color-mix(in srgb, var(--accent-blue) 30%, var(--border-color));
  background: var(--accent-soft);
  color: var(--accent-blue);
}

/* 顶部状态栏与 4 格 KPI 微卡片 */
.status-strip {
  display: grid;
  grid-template-columns: minmax(220px, 1.3fr) repeat(4, minmax(100px, 1fr)) auto;
  gap: 8px;
  margin-bottom: 12px;
}

.project-picker-card {
  min-height: 52px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.project-picker-card label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.project-picker-card label span {
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
  font-weight: 500;
}

.project-picker-card select {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--text-primary);
  font-size: 11px;
  font-weight: 600;
  outline: none;
}

.project-status {
  font-size: 9.5px;
  color: var(--text-muted);
}

.project-status.ready { color: var(--accent-green, #10b981); }

.metric-card {
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.metric-icon {
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 6px;
}

.files-icon { background: var(--accent-soft); color: var(--accent-blue); }
.symbols-icon { background: rgba(147, 51, 234, 0.1); color: #9333ea; }
.diag-icon { background: rgba(245, 158, 11, 0.1); color: #d97706; }
.coverage-icon { background: rgba(16, 185, 129, 0.1); color: var(--accent-green, #10b981); }

.metric-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.metric-body span {
  font-size: 10px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-body strong {
  margin-top: 1px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.1;
}

.project-unavailable {
  display: flex;
  gap: 10px;
  align-items: center;
  border: 1px solid color-mix(in srgb, #d97706 40%, var(--border-color));
  background: rgba(245, 158, 11, 0.08);
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 12px;
  color: var(--text-primary);
}

.project-unavailable div { flex: 1; }
.project-unavailable p { margin: 2px 0 0; color: #d97706; font-size: 11px; }

.server-panel {
  border: 1px solid var(--border-color);
  background: var(--surface);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  box-shadow: var(--shadow-sm);
}

.panel-title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.panel-title h2 { margin: 0; font-size: 14px; font-weight: 700; }
.panel-title span { font-size: 10.5px; color: var(--text-muted); }

.server-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.server-grid article {
  border: 1px solid var(--border-color);
  background: var(--control-bg, var(--bg-primary));
  border-radius: 6px;
  padding: 8px 10px;
}

.server-grid article > div { display: flex; gap: 6px; align-items: center; }
.server-grid .state { margin-left: auto; }
.server-grid p { margin: 4px 0; font-size: 10.5px; }
.server-grid small { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-muted); margin-bottom: 6px; font-size: 9.5px; }

.state {
  font-size: 9.5px;
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--panel-muted);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
}

.state.available, .state.ready, .state.succeeded {
  color: var(--accent-green, #10b981);
  background: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.2);
}

.state.missing, .state.failed {
  color: var(--accent-red, #ef4444);
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
}

/* 三栏布局工作台 */
.workbench {
  display: grid;
  grid-template-columns: minmax(220px, 260px) minmax(380px, 1fr) minmax(300px, 36%);
  height: clamp(540px, calc(100vh - 210px), 860px);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}

.left-pane, .result-pane, .source-pane { min-width: 0; min-height: 0; }
.left-pane {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
  background: var(--control-bg, var(--bg-primary));
}

.left-pane nav {
  display: flex;
  padding: 6px 8px;
  gap: 4px;
  border-bottom: 1px solid var(--border-color);
}

.left-pane nav button { flex: 1; }
.left-pane nav button.active, .view-switch button.active {
  background: var(--surface) !important;
  border-color: var(--accent-blue) !important;
  color: var(--accent-blue) !important;
}

.search-box, .query-toolbar label, .result-summary label {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border-color);
  background: var(--surface);
  border-radius: 6px;
  padding: 0 8px;
  height: 28px;
}

.search-box { margin: 6px 8px; }
.search-box input, .query-toolbar input, .result-summary input {
  min-width: 0;
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--text-primary);
  outline: none;
  font-size: 11px;
}

.language-coverage { display: flex; gap: 4px; overflow: auto; padding: 0 8px 6px; }
.language-coverage button {
  display: grid !important;
  grid-template-columns: auto auto;
  gap: 0 4px;
  padding: 3px 6px !important;
  height: auto !important;
  white-space: nowrap;
}

.language-coverage button small { grid-column: 1 / 3; font-size: 9px; color: var(--accent-green, #10b981); }
.language-coverage button.missing small { color: #d97706; }

.file-list, .history-list { overflow: auto; flex: 1; padding: 0 6px 6px; }
.file-list > button, .history-list > button {
  width: 100%;
  display: flex !important;
  justify-content: flex-start !important;
  text-align: left;
  margin-bottom: 2px;
  border-color: transparent !important;
  background: transparent !important;
  height: auto !important;
  padding: 6px 8px !important;
}

.file-list > button.active { background: var(--accent-soft) !important; color: var(--accent-blue) !important; }
.file-list button span { min-width: 0; }
.file-list strong, .file-list small, .history-list span, .history-list small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.file-list strong { font-size: 11px; font-weight: 600; }
.file-list small, .history-list small { font-size: 9.5px; color: var(--text-muted); }

.history-head { display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; color: var(--text-muted); font-size: 10.5px; }
.history-list > button { display: grid !important; }
.history-list span { font-size: 11px; margin: 1px 0; }

.result-pane {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-color);
  background: var(--surface);
}

.query-toolbar {
  display: grid;
  grid-template-columns: 140px 1fr auto;
  gap: 6px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border-color);
}

.query-toolbar > select {
  height: 28px;
  border: 1px solid var(--border-color);
  background: var(--surface);
  border-radius: 6px;
  padding: 0 8px;
  color: var(--text-primary);
  font-size: 11px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  font-size: 10.5px;
  border-bottom: 1px solid var(--border-color);
  background: var(--control-bg, var(--bg-primary));
}

.filter-row label { display: flex; gap: 4px; align-items: center; cursor: pointer; }

.result-summary {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border-color);
  font-size: 10.5px;
  color: var(--text-muted);
}

.result-summary > label { margin-left: auto; width: 130px; }
.freshness { display: flex; align-items: center; gap: 4px; color: var(--accent-green, #10b981); }
.freshness.stale, .freshness.unavailable { color: #d97706; }
.export-actions button { height: 24px; padding: 0 6px; font-size: 10px; }

.view-switch { display: flex; gap: 4px; padding: 4px 8px; }
.result-list { overflow: auto; flex: 1; padding: 2px 6px 6px; }
.result-list > button {
  width: 100%;
  display: grid !important;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  text-align: left;
  margin-bottom: 2px;
  border-color: transparent !important;
  background: transparent !important;
  padding: 6px 8px !important;
  height: auto !important;
}

.result-list > button.active {
  background: var(--accent-soft) !important;
  border-color: var(--accent-blue) !important;
  color: var(--accent-blue) !important;
}

.kind {
  font-size: 9px;
  padding: 2px 4px;
  border-radius: 4px;
  background: var(--control-bg, var(--bg-primary));
  color: var(--text-muted);
  border: 1px solid var(--border-color);
}

.result-main { min-width: 0; }
.result-main strong, .result-main small, .result-main em { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.result-main strong { font-size: 11.5px; font-weight: 600; }
.result-main small { font-size: 9.5px; color: var(--text-muted); margin-top: 1px; }
.result-main em { font-size: 9.5px; color: #d97706; font-style: normal; margin-top: 2px; }

.call-actions { display: flex; gap: 3px; }
.call-actions i {
  font-size: 9px;
  padding: 2px 4px;
  border-radius: 4px;
  background: var(--control-bg, var(--bg-primary));
  font-style: normal;
  cursor: pointer;
}

.source-pane { display: flex; flex-direction: column; background: var(--control-bg, var(--bg-primary)); }
.source-pane > header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface);
}

.source-pane > header div:first-child { min-width: 0; display: grid; }
.source-pane > header span { font-size: 9.5px; color: var(--text-muted); }
.source-pane > header strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 600; }
.source-pane > header div:last-child { display: flex; gap: 4px; }
.source-pane > header button { height: 26px; padding: 0 6px; }

.location-meta { display: flex; gap: 4px; padding: 4px 8px; font-size: 9px; }
.location-meta span { padding: 2px 5px; border-radius: 4px; background: var(--surface); color: var(--text-muted); border: 1px solid var(--border-color); }

.source-viewer {
  overflow: auto;
  flex: 1;
  background: var(--surface);
  font: 11px/1.55 var(--font-mono, monospace);
}

.source-viewer > div { display: grid; grid-template-columns: 44px 1fr; min-width: max-content; }
.source-viewer > div > span { text-align: right; padding: 0 8px; color: var(--text-muted); user-select: none; }
.source-viewer code { white-space: pre; padding-right: 10px; }
.source-viewer .target { background: rgba(245, 158, 11, 0.12); box-shadow: inset 3px 0 #d97706; }
.source-viewer .target > span { color: #d97706; font-weight: 700; }

.source-loading, .source-empty, .empty { flex: 1; display: grid; place-content: center; justify-items: center; color: var(--text-muted); padding: 20px; text-align: center; }
.detail-card, .agent-actions { border-top: 1px solid var(--border-color); padding: 8px 10px; background: var(--surface); }
.detail-card h3, .agent-actions h3 { margin: 0 0 6px; font-size: 11px; font-weight: 700; }
.detail-card dl { display: grid; grid-template-columns: 65px 1fr; gap: 3px; margin: 0; font-size: 9.5px; }
.detail-card dt { color: var(--text-muted); }
.detail-card dd { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono, monospace); }
.agent-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
.agent-actions h3, .agent-actions p, .agent-actions button:last-of-type { grid-column: 1 / 3; }
.agent-actions p { margin: 0; color: var(--text-muted); font-size: 9px; }

.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media(max-width: 1100px) {
  .status-strip { grid-template-columns: 1fr repeat(2, 0.5fr); }
  .workbench { grid-template-columns: 210px minmax(320px, 1fr); }
  .source-pane { display: none; }
}

@media(max-width: 760px) {
  .code-intelligence-page { padding: 10px; }
  .status-strip { display: flex; flex-direction: column; }
  .workbench { display: block; height: auto; }
  .left-pane, .result-pane { height: 420px; margin-bottom: 8px; }
}
</style>
