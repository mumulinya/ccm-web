<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  FolderKanban,
  Globe2,
  MessagesSquare,
  Pencil,
  Pin,
  PinOff,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Trash2,
} from '@lucide/vue'
import { toast } from '../../utils/toast.js'

const presets = [
  { id: 'default', label: '自动', window: 0, threshold: 0 },
  { id: '516k', label: '516K', window: 516000, threshold: 460000 },
  { id: '1m', label: '1M', window: 1000000, threshold: 900000 },
  { id: 'custom', label: '自定义', window: null, threshold: null },
]

const loading = ref(false)
const saving = ref(false)
const activePage = ref('memory')
const overview = ref({ groups: [], projects: [], globals: [], tasks: [], alerts: [], totals: {} })
const selectedScope = ref('')
const selectedId = ref('')
const detail = ref(null)
const query = ref('')
const audit = ref([])
const showAudit = ref(false)
const editState = ref(null)

const config = ref({
  memoryContextPreset: 'default',
  modelContextWindow: 0,
  modelAutoCompactTokenLimit: 0,
  typedMemoryDeliveryMaxDocuments: 5,
  typedMemoryDeliveryMaxTokens: 5000,
  sessionMemoryCompactMaxSectionTokens: 2000,
  sessionMemoryCompactMaxTotalTokens: 12000,
  groupSessionRetentionDays: 30,
  groupSessionMaxArchived: 20,
  groupSessionAutoPruneEnabled: false,
})
const capacity = ref(null)
const capabilities = ref([])
const capabilityForm = ref({ provider: '', model: '', contextWindow: 200000, maxOutputTokens: 20000 })
const customizationMode = ref('prompt')
const customizationTarget = ref('')
const customContent = ref('')
const customProfile = ref(null)
const customizationLoading = ref(false)

const scopes = computed(() => [
  ...(overview.value.globals || []).map(item => ({ ...item, scope: item.scope || 'global' })),
  ...(overview.value.groups || []).map(item => ({ ...item, scope: item.scope || 'group' })),
  ...(overview.value.projects || []).map(item => ({ ...item, scope: item.scope || 'project' })),
  ...(overview.value.tasks || []).map(item => ({ ...item, scope: item.scope || 'task_agent' })),
])
const groupScopes = computed(() => scopes.value.filter(item => item.scope === 'group'))
const projectScopes = computed(() => scopes.value.filter(item => item.scope === 'project' || item.scope === 'project_session'))
const globalLongTermScopes = computed(() => scopes.value.filter(item => item.scope === 'global'))
const globalSessionScopes = computed(() => scopes.value.filter(item => item.scope === 'global_session'))
const taskScopes = computed(() => scopes.value.filter(item => item.scope === 'task_agent'))
const taskProjectTrees = computed(() => {
  const projects = new Map()
  for (const item of taskScopes.value) {
    const fallbackProject = String(item.label || '').split('/')[0]?.trim()
    const id = item.projectId || item.project || fallbackProject || 'unassigned'
    if (!projects.has(id)) projects.set(id, {
      id,
      label: item.projectLabel || (id === 'unassigned' ? '未关联项目' : id),
      sessions: [],
    })
    projects.get(id).sessions.push(item)
  }
  return [...projects.values()]
    .map(project => ({
      ...project,
      sessions: project.sessions.sort((left, right) => String(right.lastUsedAt || right.updatedAt || '').localeCompare(String(left.lastUsedAt || left.updatedAt || ''))),
    }))
    .sort((left, right) => left.label.localeCompare(right.label, 'zh-CN'))
})
const globalTree = computed(() => ({
  id: 'global-agent',
  label: '全局 Agent',
  longTerm: globalLongTermScopes.value,
  sessions: globalSessionScopes.value,
}))
const groupTrees = computed(() => {
  const groups = new Map()
  for (const item of groupScopes.value) {
    const id = item.groupId || String(item.id || '').split('::')[0]
    if (!groups.has(id)) groups.set(id, { id, label: item.groupLabel || id, sessions: [] })
    groups.get(id).sessions.push(item)
  }
  return [...groups.values()]
})
const projectTrees = computed(() => {
  const projects = new Map()
  for (const item of projectScopes.value) {
    const id = item.projectId || (item.scope === 'project' ? item.id : String(item.id || '').split('::')[0])
    if (!projects.has(id)) projects.set(id, { id, label: id, longTerm: [], sessions: [] })
    if (item.scope === 'project') projects.get(id).longTerm.push(item)
    else projects.get(id).sessions.push(item)
  }
  return [...projects.values()]
})
const itemGroups = computed(() => (detail.value?.itemGroups || []).map(group => ({
  ...group,
  items: (group.items || []).filter(item => !query.value || `${item.text} ${item.itemId}`.toLowerCase().includes(query.value.toLowerCase())),
})).filter(group => group.items.length))
const selectedSummary = computed(() => {
  const overviewSummary = scopes.value.find(item => item.scope === selectedScope.value && item.id === selectedId.value)
  return overviewSummary ? { ...overviewSummary, ...(detail.value?.summary || {}), label: overviewSummary.label } : null
})
const isSessionDetail = computed(() => ['group', 'global_session', 'project_session', 'task_agent'].includes(selectedScope.value)
  && !(selectedScope.value === 'group' && !String(selectedId.value).includes('::')))

const typeLabels = {
  persistentRequirements: '长期要求', factAnchors: '事实', decisions: '决策', completed: '已完成',
  durableMemories: '有效长期记忆',
  blocked: '阻塞', workerLedger: '子 Agent 记录', openQuestions: '待确认', nextActions: '下一步',
  conclusions: '结论', user: '用户偏好', feedback: '反馈', authorization: '授权', missions: '任务',
  unresolved: '未解决', references: '引用', sessionSummary: '当前会话摘要', legacySessionSummary: '历史会话摘要（待模型验证）', sessionArchives: '本会话压缩归档',
  recentMessages: '近期原文（只读）',
}

const formatNumber = value => Number(value || 0).toLocaleString('zh-CN')
const formatTime = value => value ? new Date(value).toLocaleString('zh-CN') : '未记录'
const summarySourceLabel = value => ({ model: '模型摘要', session_memory: '模型 Session Memory', 'session-memory': '模型 Session Memory' }[value] || '尚未生成')
const sessionMemoryStatusLabel = value => ({
  ready: '模型记忆已就绪',
  waiting_model: '等待模型抽取',
  waiting_initialization_tokens: '等待达到抽取阈值',
  invalid: '模型记忆校验失败',
  waiting: '未就绪',
}[value] || '未就绪')
const taskAgentRuntimeLabel = value => ({
  claudecode: 'Claude Code',
  claude: 'Claude Code',
  codex: 'Codex',
  cursor: 'Cursor',
  gemini: 'Gemini CLI',
  geminicli: 'Gemini CLI',
  opencode: 'OpenCode',
}[String(value || '').toLowerCase()] || '开发 Agent')
const shortTaskAgentId = value => {
  const id = String(value || '')
  return id.length > 16 ? `${id.slice(0, 12)}…` : id
}
const taskAgentSessionLabel = item => `${taskAgentRuntimeLabel(item.agentType)} · ${shortTaskAgentId(item.taskAgentSessionId || item.id)}`
const taskAgentSessionMeta = item => {
  const turns = Number(item.turnCount || 0)
  const state = item.status === 'open' ? '运行中' : item.status === 'closed' ? '已结束' : ''
  return [state, turns ? `${turns} 轮` : ''].filter(Boolean).join(' · ')
}

async function requestJson(url, options) {
  const response = await fetch(url, options)
  const data = await response.json()
  if (!response.ok || data.success === false) throw new Error(data.error || '请求失败')
  return data
}

async function loadDetail() {
  if (!selectedId.value) return
  detail.value = await requestJson(`/api/memory-center/scope?scope=${encodeURIComponent(selectedScope.value)}&id=${encodeURIComponent(selectedId.value)}`)
  if (showAudit.value) await loadAudit()
}

async function selectScope(item) {
  selectedScope.value = item.scope
  selectedId.value = item.id
  query.value = ''
  showAudit.value = false
  await loadDetail()
}

async function loadOverview(preserveSelection = true) {
  loading.value = true
  try {
    overview.value = await requestJson('/api/memory-center/overview')
    const exists = scopes.value.some(item => item.scope === selectedScope.value && item.id === selectedId.value)
    if (!preserveSelection || !exists) {
      const preferred = globalSessionScopes.value.find(item => item.currentSession)
        || groupScopes.value.find(item => item.alerts)
        || globalSessionScopes.value[0]
        || groupScopes.value[0]
        || projectScopes.value[0]
        || globalLongTermScopes.value[0]
      selectedScope.value = preferred?.scope || ''
      selectedId.value = preferred?.id || ''
    }
    await loadDetail()
  } catch (error) {
    toast.error(error.message || '读取记忆失败')
  } finally {
    loading.value = false
  }
}

async function loadAudit() {
  if (!selectedId.value) return
  const data = await requestJson(`/api/memory-center/audit?scope=${encodeURIComponent(selectedScope.value)}&id=${encodeURIComponent(selectedId.value)}&limit=100`)
  audit.value = data.audit || []
}

async function toggleAudit() {
  showAudit.value = !showAudit.value
  if (showAudit.value) await loadAudit()
}

async function controlItem(item, action, extra = {}) {
  try {
    await requestJson('/api/memory-center/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: selectedScope.value,
        scopeId: selectedId.value,
        itemType: item.type,
        itemId: item.itemId,
        action,
        ...extra,
      }),
    })
    editState.value = null
    await loadOverview(true)
    toast.success('记忆已更新')
  } catch (error) {
    toast.error(error.message || '记忆更新失败')
  }
}

function openEdit(item, action) {
  editState.value = { item, action, text: item.text || '', reason: '' }
}

async function submitEdit() {
  const state = editState.value
  if (!state?.reason.trim()) return toast.error('请填写修改原因')
  if (state.action === 'edit' && !state.text.trim()) return toast.error('记忆内容不能为空')
  await controlItem(state.item, state.action, { text: state.text, reason: state.reason })
}

async function loadSettings() {
  loading.value = true
  try {
    const [configData, capacityData, capabilityData] = await Promise.all([
      requestJson('/api/orchestrator/config'),
      requestJson('/api/groups/memory/capacity'),
      requestJson('/api/groups/memory/capabilities'),
    ])
    const current = configData.config || {}
    config.value = {
      ...config.value,
      memoryContextPreset: current.memoryContextPreset || 'default',
      modelContextWindow: Number(current.modelContextWindow || 0),
      modelAutoCompactTokenLimit: Number(current.modelAutoCompactTokenLimit || 0),
      typedMemoryDeliveryMaxDocuments: Number(current.typedMemoryDeliveryMaxDocuments || 5),
      typedMemoryDeliveryMaxTokens: Number(current.typedMemoryDeliveryMaxTokens || 5000),
      sessionMemoryCompactMaxSectionTokens: Number(current.sessionMemoryCompactMaxSectionTokens || 2000),
      sessionMemoryCompactMaxTotalTokens: Number(current.sessionMemoryCompactMaxTotalTokens || 12000),
      groupSessionRetentionDays: Number(current.groupSessionRetentionDays || 30),
      groupSessionMaxArchived: Number(current.groupSessionMaxArchived || 20),
      groupSessionAutoPruneEnabled: current.groupSessionAutoPruneEnabled === true,
    }
    capacity.value = capacityData
    capabilities.value = capabilityData.entries || []
    await loadCustomization()
  } catch (error) {
    toast.error(error.message || '读取设置失败')
  } finally {
    loading.value = false
  }
}

function selectPreset(preset) {
  config.value.memoryContextPreset = preset.id
  if (preset.id !== 'custom') {
    config.value.modelContextWindow = preset.window
    config.value.modelAutoCompactTokenLimit = preset.threshold
  }
}

async function saveSettings() {
  const value = config.value
  if (value.memoryContextPreset === 'custom') {
    if (Number(value.modelContextWindow) < 32000) return toast.error('上下文窗口不能小于 32,000 token')
    if (Number(value.modelAutoCompactTokenLimit) < 18000 || Number(value.modelAutoCompactTokenLimit) >= Number(value.modelContextWindow) - 3000) {
      return toast.error('压缩阈值必须至少比上下文窗口低 3,000 token')
    }
  }
  if (Number(value.sessionMemoryCompactMaxTotalTokens) < Number(value.sessionMemoryCompactMaxSectionTokens)) return toast.error('总记忆预算不能小于单章节预算')
  saving.value = true
  try {
    await requestJson('/api/orchestrator/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value),
    })
    await loadSettings()
    toast.success('上下文设置已保存')
  } catch (error) {
    toast.error(error.message || '保存设置失败')
  } finally {
    saving.value = false
  }
}

async function saveCapability() {
  const value = capabilityForm.value
  if (!value.provider.trim()) return toast.error('请填写 Provider')
  if (Number(value.contextWindow) < 32000) return toast.error('上下文窗口不能小于 32,000 token')
  saving.value = true
  try {
    await requestJson('/api/groups/memory/capabilities', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...value, source: 'user_setting', checkedAt: new Date().toISOString() }),
    })
    await loadSettings()
    toast.success('模型容量已保存')
  } catch (error) {
    toast.error(error.message || '保存模型容量失败')
  } finally {
    saving.value = false
  }
}

async function loadCustomization() {
  customizationLoading.value = true
  try {
    const endpoint = customizationMode.value === 'prompt' ? 'session-memory-custom-prompt' : 'session-memory-custom-template'
    const data = await requestJson(`/api/memory-center/${endpoint}?scope_id=${encodeURIComponent(customizationTarget.value)}`)
    customProfile.value = data.profile || null
    const direct = customizationTarget.value ? data.profile?.exactSession : data.profile?.global
    customContent.value = direct?.present ? direct.content : (customizationTarget.value ? data.profile?.content || '' : '')
  } catch (error) {
    toast.error(error.message || '读取 Session Memory 定制失败')
  } finally {
    customizationLoading.value = false
  }
}

async function saveCustomization(reset = false) {
  if (!reset && !customContent.value.trim()) return toast.error('内容不能为空')
  if (!reset && customizationMode.value === 'template') {
    const headers = customContent.value.split(/\r?\n/).filter(line => /^#\s+\S/.test(line))
    if (!headers.length || headers.length > 20) return toast.error('模板需要 1 到 20 个一级章节')
  }
  saving.value = true
  try {
    const endpoint = customizationMode.value === 'prompt' ? 'session-memory-custom-prompt' : 'session-memory-custom-template'
    await requestJson(`/api/memory-center/${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scopeId: customizationTarget.value, content: customContent.value, reset }),
    })
    await loadCustomization()
    toast.success(reset ? '已恢复继承' : 'Session Memory 定制已保存')
  } catch (error) {
    toast.error(error.message || '保存 Session Memory 定制失败')
  } finally {
    saving.value = false
  }
}

watch([customizationMode, customizationTarget], loadCustomization)
watch(activePage, page => page === 'settings' ? loadSettings() : loadOverview(true))
onMounted(() => loadOverview(false))
</script>

<template>
  <div class="memory-center">
    <header class="mc-header">
      <div>
        <span class="eyebrow">MEMORY CENTER</span>
        <h2>记忆中心</h2>
      </div>
      <div class="header-actions">
        <nav class="page-tabs" aria-label="记忆中心视图">
          <button :class="{ active: activePage === 'memory' }" @click="activePage = 'memory'"><MessagesSquare :size="16" />会话记忆</button>
          <button :class="{ active: activePage === 'settings' }" @click="activePage = 'settings'"><Settings2 :size="16" />上下文设置</button>
        </nav>
        <button class="icon-btn" :disabled="loading" title="刷新" @click="activePage === 'memory' ? loadOverview(true) : loadSettings()"><RefreshCw :size="18" /></button>
      </div>
    </header>

    <div v-if="activePage === 'memory'" class="memory-workspace">
      <aside class="scope-list">
        <div v-if="globalTree.longTerm.length || globalTree.sessions.length" class="scope-group">
          <label>全局</label>
          <details class="scope-parent" open>
            <summary><Globe2 :size="16" /><strong>{{ globalTree.label }}</strong><small>{{ globalTree.sessions.length }} 个会话</small></summary>
            <div class="scope-children">
              <button v-for="item in globalTree.longTerm" :key="item.id" :class="{ active: selectedId === item.id && selectedScope === item.scope }" @click="selectScope(item)">
                <Globe2 :size="15" /><span><strong>长期记忆</strong><small>{{ formatNumber(item.currentTokens) }} / {{ formatNumber(item.autoCompactThreshold) }} tokens</small></span>
              </button>
              <button v-for="item in globalTree.sessions" :key="item.id" :class="{ active: selectedId === item.id && selectedScope === item.scope }" @click="selectScope(item)">
                <MessagesSquare :size="15" /><span><strong>{{ item.label }}{{ item.currentSession ? ' · 当前' : '' }}</strong><small>{{ formatNumber(item.currentTokens) }} / {{ formatNumber(item.autoCompactThreshold) }} tokens</small></span>
              </button>
            </div>
          </details>
        </div>
        <div v-if="groupTrees.length" class="scope-group">
          <label>群聊 · {{ groupTrees.length }}</label>
          <details v-for="tree in groupTrees" :key="tree.id" class="scope-parent">
            <summary><MessagesSquare :size="16" /><strong>{{ tree.label }}</strong><small>{{ tree.sessions.length }} 个会话</small></summary>
            <div class="scope-children">
              <button v-for="item in tree.sessions" :key="item.id" :class="{ active: selectedId === item.id && selectedScope === item.scope }" @click="selectScope(item)">
                <MessagesSquare :size="15" /><span><strong>{{ item.sessionLabel || item.label }}</strong><small>{{ formatNumber(item.currentTokens) }} / {{ formatNumber(item.autoCompactThreshold) }} tokens</small></span>
                <AlertTriangle v-if="item.alerts" :size="15" class="warn" />
              </button>
            </div>
          </details>
        </div>
        <div v-if="projectTrees.length" class="scope-group">
          <label>项目 · {{ projectTrees.length }}</label>
          <details v-for="tree in projectTrees" :key="tree.id" class="scope-parent">
            <summary><FolderKanban :size="16" /><strong>{{ tree.label }}</strong><small>{{ tree.sessions.length }} 个会话</small></summary>
            <div class="scope-children">
              <button v-for="item in tree.longTerm" :key="item.id" :class="{ active: selectedId === item.id && selectedScope === item.scope }" @click="selectScope(item)">
                <Globe2 :size="15" /><span><strong>长期记忆</strong><small>{{ item.longTermMemory?.activeCount || 0 }} 条有效 · {{ item.longTermMemory?.taskHistoryCount || 0 }} 条历史</small></span>
              </button>
              <button v-for="item in tree.sessions" :key="item.id" :class="{ active: selectedId === item.id && selectedScope === item.scope }" @click="selectScope(item)">
                <MessagesSquare :size="15" /><span><strong>{{ item.sessionLabel || item.label }}</strong><small>{{ formatNumber(item.currentTokens) }} / {{ formatNumber(item.autoCompactThreshold) }} tokens</small></span>
              </button>
            </div>
          </details>
        </div>
        <div v-if="taskProjectTrees.length" class="scope-group task-agent-group" data-scope-kind="task-agent">
          <label>子 Agent · {{ taskProjectTrees.length }} 个项目</label>
          <details v-for="tree in taskProjectTrees" :key="tree.id" class="scope-parent task-project-parent" :data-project-id="tree.id">
            <summary><FolderKanban :size="16" /><strong :title="tree.label">{{ tree.label }}</strong><small>{{ tree.sessions.length }} 个会话</small></summary>
            <div class="scope-children">
              <button v-for="item in tree.sessions" :key="item.id" :class="{ active: selectedId === item.id && selectedScope === item.scope }" :title="`${tree.label} / ${item.id}`" @click="selectScope(item)">
                <Bot :size="15" /><span><strong>{{ taskAgentSessionLabel(item) }}</strong><small>{{ formatNumber(item.currentTokens) }} / {{ formatNumber(item.autoCompactThreshold) }} tokens<span v-if="taskAgentSessionMeta(item)"> · {{ taskAgentSessionMeta(item) }}</span></small></span>
                <AlertTriangle v-if="item.circuitOpen" :size="15" class="warn" />
              </button>
            </div>
          </details>
        </div>
      </aside>

      <main class="memory-detail">
        <div v-if="detail && selectedSummary" class="detail-content">
          <div class="detail-head">
            <div><span class="eyebrow">{{ selectedScope.toUpperCase() }}</span><h3>{{ selectedSummary.label }}</h3></div>
            <button class="text-btn" @click="toggleAudit">{{ showAudit ? '返回记忆' : '审计记录' }}</button>
          </div>
          <div v-if="selectedScope === 'project'" class="summary-strip">
            <span><small>实际注入估算</small><strong>{{ formatNumber(selectedSummary.currentTokens) }} tokens</strong></span>
            <span><small>有效长期记忆</small><strong>{{ selectedSummary.longTermMemory?.activeCount || 0 }} 条</strong></span>
            <span><small>任务历史</small><strong>{{ selectedSummary.longTermMemory?.taskHistoryCount || 0 }} 条</strong></span>
            <span><small>写入策略</small><strong>验收后提交</strong></span>
          </div>
          <div v-else class="summary-strip">
            <span><small>当前模型上下文</small><strong>{{ formatNumber(selectedSummary.currentTokens) }}</strong></span>
            <span><small>自动压缩线</small><strong>{{ formatNumber(selectedSummary.autoCompactThreshold) }}</strong></span>
            <span><small>距离压缩</small><strong>{{ formatNumber(selectedSummary.remainingTokens) }}</strong></span>
            <span><small>状态</small><strong :class="selectedSummary.health"><CheckCircle2 v-if="selectedSummary.health === 'healthy'" :size="15" />{{ selectedSummary.health }}</strong></span>
          </div>
          <p v-if="selectedScope !== 'project' && (selectedSummary.beforeTokens || selectedSummary.afterTokens)" class="compact-history">最近压缩：{{ formatNumber(selectedSummary.beforeTokens) }} → {{ formatNumber(selectedSummary.afterTokens) }} tokens</p>
          <p v-if="selectedScope !== 'project' && (selectedSummary.summarySource || selectedSummary.sessionMemory || selectedSummary.consecutiveFailures)" class="compact-history">
            正式摘要 {{ summarySourceLabel(selectedSummary.summarySource) }} · 近期原文 {{ formatNumber(selectedSummary.preservedRecentTokens) }} tokens / {{ selectedSummary.preservedRecentMessages || 0 }} 条 · Session Memory {{ sessionMemoryStatusLabel(selectedSummary.sessionMemory?.status) }} · 连续失败 {{ selectedSummary.consecutiveFailures || 0 }}
          </p>
          <p v-if="selectedScope !== 'project' && (selectedSummary.postCompactGate || selectedSummary.resolvedModelCapacity || selectedSummary.ptlRecoveryAttempts)" class="compact-history">
            门禁 {{ selectedSummary.postCompactGate?.status || '未采样' }} · 模型容量 {{ formatNumber(selectedSummary.effectiveContextWindow) }} · 当前请求 {{ formatNumber(selectedSummary.pendingRequestTokens) }} · 恢复 {{ formatNumber(selectedSummary.recoveryContextTokens) }} · Hooks {{ formatNumber(selectedSummary.hookResultTokens) }} · PTL {{ selectedSummary.ptlRecoveryAttempts || 0 }} 次
          </p>

          <template v-if="!showAudit">
            <div v-if="detail.alerts?.length" class="alert-list">
              <p v-for="alert in detail.alerts" :key="alert.id"><AlertTriangle :size="16" />{{ alert.message }}</p>
            </div>
            <p v-if="isSessionDetail && !selectedSummary.summarySource" class="continuity-state">当前会话尚未生成模型压缩摘要，现在使用近期原文保持连续性。</p>
            <label class="search-box"><Search :size="17" /><input v-model.trim="query" :placeholder="isSessionDetail ? '搜索摘要与近期原文' : '搜索当前记忆'" /></label>
            <section v-for="group in itemGroups" :key="group.type" class="memory-section">
              <h4>{{ typeLabels[group.type] || group.type }} <span>{{ group.items.length }}</span></h4>
              <article v-for="item in group.items" :key="item.itemId" :class="['memory-row', { deprecated: item.deprecated }]">
                <div class="memory-copy"><p>{{ item.text || '空记录' }}</p><small>{{ formatTime(item.evidence?.time || item.updatedAt) }}<template v-if="item.reason"> · {{ item.reason }}</template></small></div>
                <div v-if="!item.readOnly" class="row-actions">
                  <button class="icon-btn" :title="item.pinned ? '取消固定' : '固定记忆'" @click="controlItem(item, item.pinned ? 'unpin' : 'pin')"><PinOff v-if="item.pinned" :size="16" /><Pin v-else :size="16" /></button>
                  <button class="icon-btn" title="修改" @click="openEdit(item, 'edit')"><Pencil :size="16" /></button>
                  <button v-if="!item.deprecated" class="icon-btn danger" title="删除" @click="openEdit(item, 'delete')"><Trash2 :size="16" /></button>
                  <button v-else class="icon-btn" title="恢复" @click="controlItem(item, 'restore')"><RotateCcw :size="16" /></button>
                </div>
              </article>
            </section>
            <p v-if="!itemGroups.length" class="empty-state">{{ isSessionDetail ? '当前会话尚未生成模型摘要，也没有可展示的近期原文。' : '当前范围还没有结构化记忆。' }}</p>
          </template>
          <section v-else class="audit-list">
            <article v-for="entry in audit" :key="entry.id"><time>{{ formatTime(entry.at) }}</time><div><strong>{{ entry.action || entry.type }}</strong><p>{{ entry.reason || entry.itemType || '系统记录' }}</p></div></article>
            <p v-if="!audit.length" class="empty-state">暂无审计记录。</p>
          </section>
        </div>
        <p v-else class="empty-state">{{ loading ? '正在读取记忆...' : '请选择一个记忆范围。' }}</p>
      </main>
    </div>

    <main v-else class="settings-page">
      <section class="settings-section">
        <div class="section-head"><div><span class="eyebrow">CONTEXT POLICY</span><h3>上下文与压缩</h3></div><button class="primary-btn" :disabled="saving" @click="saveSettings"><Save :size="16" />{{ saving ? '保存中' : '保存' }}</button></div>
        <div class="preset-control"><button v-for="preset in presets" :key="preset.id" :class="{ active: config.memoryContextPreset === preset.id }" @click="selectPreset(preset)">{{ preset.label }}</button></div>
        <div class="field-grid">
          <label><span>上下文窗口</span><input v-model.number="config.modelContextWindow" type="number" min="0" step="1000" :disabled="config.memoryContextPreset !== 'custom'" /></label>
          <label><span>自动压缩阈值</span><input v-model.number="config.modelAutoCompactTokenLimit" type="number" min="0" step="1000" :disabled="config.memoryContextPreset !== 'custom'" /></label>
          <label><span>每轮记忆文件</span><input v-model.number="config.typedMemoryDeliveryMaxDocuments" type="number" min="1" max="5" /></label>
          <label><span>记忆注入预算</span><input v-model.number="config.typedMemoryDeliveryMaxTokens" type="number" min="500" max="20000" step="100" /></label>
          <label><span>单章节预算</span><input v-model.number="config.sessionMemoryCompactMaxSectionTokens" type="number" min="250" max="20000" step="100" /></label>
          <label><span>会话记忆总预算</span><input v-model.number="config.sessionMemoryCompactMaxTotalTokens" type="number" min="1000" max="100000" step="500" /></label>
          <label><span>归档保留天数</span><input v-model.number="config.groupSessionRetentionDays" type="number" min="1" max="3650" /></label>
          <label><span>每群最大归档</span><input v-model.number="config.groupSessionMaxArchived" type="number" min="1" max="1000" /></label>
        </div>
        <label class="toggle-row"><input v-model="config.groupSessionAutoPruneEnabled" type="checkbox" /><span>自动清理过期归档会话</span></label>
        <div v-if="capacity" class="runtime-strip"><span>摘要方式 <strong>模型</strong></span><span>模型窗口 <strong>{{ formatNumber(capacity.capacity?.contextWindow) }}</strong></span><span>有效窗口 <strong>{{ formatNumber(capacity.capacity?.effectiveContextWindow) }}</strong></span><span>当前触发线 <strong>{{ formatNumber(capacity.effectiveAutoCompactThreshold) }}</strong></span></div>
      </section>

      <section class="settings-section">
        <div class="section-head"><div><span class="eyebrow">PROVIDER CAPACITY</span><h3>子 Agent 模型容量</h3></div><button class="primary-btn" :disabled="saving" @click="saveCapability"><Save :size="16" />保存容量</button></div>
        <div class="field-grid capability-grid">
          <label><span>Provider</span><input v-model.trim="capabilityForm.provider" placeholder="codex" /></label>
          <label><span>模型</span><input v-model.trim="capabilityForm.model" placeholder="可选" /></label>
          <label><span>上下文窗口</span><input v-model.number="capabilityForm.contextWindow" type="number" min="32000" step="1000" /></label>
          <label><span>最大输出</span><input v-model.number="capabilityForm.maxOutputTokens" type="number" min="0" step="1000" /></label>
        </div>
        <div class="capability-list"><div v-for="entry in capabilities.filter(item => !item.revoked).slice(0, 12)" :key="entry.evidenceId || `${entry.provider}:${entry.model}`"><strong>{{ entry.provider }}{{ entry.model ? ` / ${entry.model}` : '' }}</strong><span>{{ formatNumber(entry.contextWindow) }} / 输出 {{ formatNumber(entry.maxOutputTokens) }}</span><small>{{ entry.source }}</small></div></div>
      </section>

      <section class="settings-section">
        <div class="section-head"><div><span class="eyebrow">SESSION MEMORY</span><h3>抽取提示词与模板</h3></div><div class="section-actions"><button class="text-btn" :disabled="customizationLoading" @click="saveCustomization(true)">恢复继承</button><button class="primary-btn" :disabled="saving || customizationLoading" @click="saveCustomization(false)"><Save :size="16" />保存</button></div></div>
        <div class="customization-toolbar">
          <div class="preset-control"><button :class="{ active: customizationMode === 'prompt' }" @click="customizationMode = 'prompt'">提示词</button><button :class="{ active: customizationMode === 'template' }" @click="customizationMode = 'template'">模板</button></div>
          <select v-model="customizationTarget"><option value="">所有群聊默认</option><option v-for="item in groupScopes" :key="item.id" :value="item.id">{{ item.label }}</option></select>
        </div>
        <textarea v-model="customContent" :rows="customizationMode === 'prompt' ? 9 : 14" :maxlength="customizationMode === 'prompt' ? 32000 : 48000" :placeholder="customizationMode === 'prompt' ? '优先保留用户纠正、当前任务和精确文件路径。' : '# Current State\n_Active work and immediate next steps._'" />
        <small class="profile-note">{{ customProfile?.source || 'default' }} · {{ customContent.length }} 字符</small>
      </section>
    </main>

    <div v-if="editState" class="modal-backdrop" @click.self="editState = null">
      <div class="edit-modal">
        <h3>{{ editState.action === 'edit' ? '修改记忆' : '删除记忆' }}</h3>
        <label v-if="editState.action === 'edit'"><span>内容</span><textarea v-model="editState.text" rows="6" /></label>
        <label><span>原因</span><textarea v-model="editState.reason" rows="3" /></label>
        <div><button class="text-btn" @click="editState = null">取消</button><button class="primary-btn" :class="{ danger: editState.action === 'delete' }" @click="submitEdit">确认</button></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.memory-center { height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden; color: var(--text-primary, #17201d); background: #f5f7f6; }
.mc-header { min-height: 76px; padding: 14px 24px; display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between; gap: 20px; border-bottom: 1px solid #dce3df; background: #fff; }
.mc-header h2, .detail-head h3, .section-head h3 { margin: 2px 0 0; font-size: 20px; letter-spacing: 0; }
.eyebrow { color: #62706a; font-size: 10px; font-weight: 700; letter-spacing: 0; }
.header-actions, .section-actions, .row-actions, .section-head, .detail-head { display: flex; align-items: center; gap: 10px; }
.section-head, .detail-head { justify-content: space-between; }
.detail-head .text-btn { flex: 0 0 auto; white-space: nowrap; }
.page-tabs, .preset-control { display: inline-flex; padding: 3px; border: 1px solid #d7dfdb; background: #eef2f0; }
.page-tabs button, .preset-control button { min-height: 34px; padding: 0 12px; display: inline-flex; align-items: center; gap: 7px; border: 0; background: transparent; color: #52605a; cursor: pointer; }
.page-tabs button.active, .preset-control button.active { background: #fff; color: #0e6b4f; box-shadow: 0 1px 2px rgba(20, 40, 32, .12); }
button { font: inherit; }
.icon-btn { width: 34px; height: 34px; display: inline-grid; place-items: center; border: 1px solid #d7dfdb; background: #fff; color: #425149; cursor: pointer; }
.icon-btn:hover { border-color: #8fa69c; color: #0e6b4f; }
.icon-btn.danger:hover, .primary-btn.danger { color: #a92d36; border-color: #d8a4a8; background: #fff5f5; }
.text-btn, .primary-btn { min-height: 34px; padding: 0 12px; border: 1px solid #ccd6d1; background: #fff; color: #34433c; cursor: pointer; }
.primary-btn { display: inline-flex; align-items: center; gap: 7px; border-color: #0e6b4f; background: #0e6b4f; color: #fff; }
button:disabled { opacity: .55; cursor: not-allowed; }
.memory-workspace { min-height: 0; display: grid; flex: 1 1 auto; grid-template-columns: minmax(230px, 280px) 1fr; overflow: hidden; }
.scope-list { min-height: 0; padding: 18px 12px; border-right: 1px solid #dce3df; background: #fafbfa; overflow-y: auto; overscroll-behavior: contain; }
.scope-group + .scope-group { margin-top: 20px; }
.scope-group > label { display: block; padding: 0 8px 7px; color: #75817c; font-size: 11px; font-weight: 700; }
.scope-group > button { width: 100%; min-height: 48px; padding: 7px 8px; display: grid; grid-template-columns: 18px 1fr auto; align-items: center; gap: 8px; border: 0; border-left: 3px solid transparent; background: transparent; color: #48564f; text-align: left; cursor: pointer; }
.scope-group > button.active { border-left-color: #0e6b4f; background: #e8f2ee; color: #124d3c; }
.scope-group strong, .scope-group small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.scope-group strong { font-size: 13px; }.scope-group small { margin-top: 3px; color: #78847e; font-size: 10px; }.warn { color: #ad7217; }
.scope-parent { margin: 0; }
.scope-parent + .scope-parent { margin-top: 4px; }
.scope-parent > summary { min-height: 38px; padding: 6px 8px; display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; align-items: center; gap: 8px; color: #34433c; cursor: pointer; list-style: none; }
.scope-parent > summary::-webkit-details-marker { display: none; }
.scope-parent > summary::after { content: '›'; grid-column: 3; grid-row: 1; margin-left: 6px; color: #829089; transform: rotate(90deg); transition: transform .15s ease; }
.scope-parent:not([open]) > summary::after { transform: rotate(0deg); }
.scope-parent > summary small { grid-column: 3; grid-row: 1; margin: 0 16px 0 0; font-size: 9px; }
.scope-children { margin-left: 9px; border-left: 1px solid #d7dfdb; }
.scope-children > button { width: calc(100% - 4px); min-height: 44px; margin-left: 4px; padding: 6px 7px 6px 10px; display: grid; grid-template-columns: 17px minmax(0, 1fr) auto; align-items: center; gap: 7px; border: 0; border-left: 3px solid transparent; background: transparent; color: #526159; text-align: left; cursor: pointer; }
.scope-children > button.active { border-left-color: #0e6b4f; background: #e8f2ee; color: #124d3c; }
.task-agent-group > label { display: flex; align-items: center; justify-content: space-between; }
.task-project-parent > summary { border-left: 3px solid transparent; }
.task-project-parent[open] > summary { border-left-color: #8aa99c; background: #f0f4f2; }
.task-project-parent > summary strong { min-width: 0; }
.memory-detail { min-width: 0; min-height: 0; padding: 22px clamp(18px, 3vw, 42px) 50px; overflow-y: auto; overscroll-behavior: contain; }
.detail-content { max-width: 1100px; margin: 0 auto; }
.summary-strip, .runtime-strip { margin: 18px 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-block: 1px solid #dce3df; background: #fff; }
.summary-strip > span, .runtime-strip > span { padding: 12px 14px; border-right: 1px solid #e4e9e6; }.summary-strip > span:last-child, .runtime-strip > span:last-child { border-right: 0; }
.summary-strip small, .summary-strip strong { display: block; }.summary-strip small { color: #748079; font-size: 10px; }.summary-strip strong { margin-top: 4px; font-size: 15px; }.summary-strip strong.healthy { color: #0e6b4f; display: flex; align-items: center; gap: 5px; }.summary-strip strong.warning, .summary-strip strong.critical { color: #a15d16; }
.compact-history { margin: -10px 0 18px; color: #6f7c75; font-size: 11px; }
.continuity-state { max-width: 720px; margin: 0 0 14px; padding: 9px 11px; border-left: 3px solid #8aa99c; background: #edf3f0; color: #52635b; font-size: 12px; }
.alert-list { margin-bottom: 14px; }.alert-list p { margin: 0 0 6px; padding: 9px 11px; display: flex; gap: 8px; align-items: center; background: #fff5e7; color: #8c5518; border-left: 3px solid #d89231; font-size: 12px; }
.search-box { max-width: 420px; height: 38px; padding: 0 11px; display: flex; align-items: center; gap: 8px; border: 1px solid #d6deda; background: #fff; }.search-box input { width: 100%; border: 0; outline: 0; background: transparent; }
.memory-section { margin-top: 24px; }.memory-section h4 { margin: 0 0 7px; font-size: 13px; }.memory-section h4 span { color: #7b8781; font-weight: 500; }
.memory-row { min-height: 62px; padding: 11px 8px 11px 12px; display: flex; align-items: center; justify-content: space-between; gap: 18px; border-top: 1px solid #e0e6e3; background: #fff; }.memory-row:last-child { border-bottom: 1px solid #e0e6e3; }.memory-row.deprecated { opacity: .58; }.memory-copy { min-width: 0; }.memory-copy p { margin: 0; line-height: 1.5; overflow-wrap: anywhere; white-space: pre-wrap; }.memory-copy small { color: #7a8780; font-size: 10px; }
.audit-list article { padding: 13px 4px; display: grid; grid-template-columns: 150px 1fr; gap: 18px; border-bottom: 1px solid #dce3df; }.audit-list time { color: #75817b; font-size: 11px; }.audit-list p { margin: 4px 0 0; }
.empty-state { padding: 50px 10px; color: #78847e; text-align: center; }
.settings-page { width: 100%; max-width: 1180px; min-height: 0; margin: 0 auto; padding: 24px clamp(18px, 3vw, 42px) 60px; flex: 1 1 auto; overflow-y: auto; overscroll-behavior: contain; box-sizing: border-box; }.settings-section { padding: 22px 0 28px; border-bottom: 1px solid #d6dfda; }.settings-section:first-child { padding-top: 0; }
.field-grid { margin-top: 18px; display: grid; grid-template-columns: repeat(4, minmax(150px, 1fr)); gap: 14px; }.field-grid label, .edit-modal label { display: grid; gap: 6px; }.field-grid label span, .edit-modal label span { color: #5f6c66; font-size: 11px; font-weight: 600; }.field-grid input, select, textarea { width: 100%; box-sizing: border-box; border: 1px solid #ccd6d1; background: #fff; color: inherit; outline: none; }.field-grid input, select { height: 38px; padding: 0 10px; }.field-grid input:focus, select:focus, textarea:focus { border-color: #0e6b4f; box-shadow: 0 0 0 2px rgba(14, 107, 79, .1); }.field-grid input:disabled { background: #edf1ef; color: #7a8580; }
.toggle-row { margin-top: 16px; display: inline-flex; align-items: center; gap: 8px; }.toggle-row input { width: 16px; height: 16px; accent-color: #0e6b4f; }.runtime-strip { grid-template-columns: repeat(3, 1fr); font-size: 12px; }
.capability-list { margin-top: 16px; border-top: 1px solid #dce3df; }.capability-list > div { min-height: 42px; display: grid; grid-template-columns: 1fr 180px 120px; align-items: center; gap: 14px; border-bottom: 1px solid #e1e7e4; }.capability-list span, .capability-list small { color: #6d7973; }
.customization-toolbar { margin: 16px 0 10px; display: flex; justify-content: space-between; gap: 12px; }.customization-toolbar select { max-width: 420px; }.settings-section textarea { padding: 11px; resize: vertical; line-height: 1.55; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }.profile-note { display: block; margin-top: 6px; color: #78847e; }
.modal-backdrop { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: 20px; background: rgba(16, 24, 21, .48); }.edit-modal { width: min(560px, 100%); padding: 20px; background: #fff; border: 1px solid #ccd6d1; box-shadow: 0 20px 50px rgba(20, 30, 26, .2); }.edit-modal h3 { margin-top: 0; }.edit-modal label + label { margin-top: 12px; }.edit-modal textarea { padding: 10px; }.edit-modal > div:last-child { margin-top: 16px; display: flex; justify-content: flex-end; gap: 8px; }
@media (max-width: 900px) { .mc-header { align-items: flex-start; }.header-actions { align-items: flex-end; flex-direction: column-reverse; }.memory-workspace { grid-template-columns: 1fr; }.scope-list { max-height: 230px; border-right: 0; border-bottom: 1px solid #dce3df; }.field-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.summary-strip { grid-template-columns: repeat(2, 1fr); }.capability-list > div { grid-template-columns: 1fr; gap: 3px; padding: 8px 0; } }
@media (max-width: 560px) { .mc-header { padding: 12px; flex-direction: column; }.header-actions { width: 100%; flex-direction: row; align-items: center; }.page-tabs { width: auto; flex: 1; }.page-tabs button { flex: 1; justify-content: center; }.memory-detail, .settings-page { padding-inline: 12px; }.field-grid { grid-template-columns: 1fr; }.customization-toolbar { flex-direction: column; }.customization-toolbar select { max-width: none; }.memory-row { align-items: flex-start; }.row-actions { flex-direction: column; }.runtime-strip { grid-template-columns: 1fr; } }
</style>
