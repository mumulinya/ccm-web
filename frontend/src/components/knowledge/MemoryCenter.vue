<script setup>
import { computed, onMounted, ref } from 'vue'
import { toast, confirmDialog } from '../../utils/toast.js'

const loading = ref(false)
const overview = ref({ groups: [], projects: [], globals: [], alerts: [], totals: {}, metrics: { rates: {}, counters: {}, events: [] } })
const selectedScope = ref('')
const selectedId = ref('')
const detail = ref(null)
const activeView = ref('memory')
const activeType = ref('all')
const query = ref('')
const audit = ref([])
const evidence = ref([])
const evidenceOpen = ref(false)
const editState = ref(null)
const operationState = ref(null)
const qualityReport = ref(null)
const qualityLoading = ref(false)

const scopes = computed(() => [
  ...(overview.value.globals || []).map(item => ({ ...item, scope: 'global' })),
  ...(overview.value.groups || []).map(item => ({ ...item, scope: 'group' })),
  ...(overview.value.projects || []).map(item => ({ ...item, scope: 'project' }))
])

const selectedSummary = computed(() => scopes.value.find(item => item.scope === selectedScope.value && item.id === selectedId.value) || null)
const itemGroups = computed(() => detail.value?.itemGroups || [])
const visibleGroups = computed(() => itemGroups.value.map(group => {
  const matched = (group.items || []).filter(item => {
    if (activeType.value !== 'all' && group.type !== activeType.value) return false
    const text = `${item.text || ''} ${item.originalText || ''} ${item.itemId || ''}`.toLowerCase()
    return !query.value.trim() || text.includes(query.value.trim().toLowerCase())
  })
  const limit = activeType.value === 'all' && !query.value.trim() ? 8 : 40
  return { ...group, totalMatched: matched.length, items: matched.slice(0, limit) }
}).filter(group => group.items.length))

const memoryStats = computed(() => {
  const groups = itemGroups.value
  const items = groups.flatMap(group => group.items || [])
  return {
    total: items.length,
    pinned: items.filter(item => item.pinned && !item.deprecated).length,
    edited: items.filter(item => item.text !== item.originalText && !item.deprecated).length,
    deprecated: items.filter(item => item.deprecated).length
  }
})

const metricCards = computed(() => {
  const rates = overview.value.metrics?.rates || {}
  return [
    { label: '历史召回率', value: rates.recallRate, good: true, note: '找到相关原始证据的查询比例' },
    { label: '遗忘率', value: rates.forgettingRate, good: false, note: '上下文检查中遗漏约束的比例' },
    { label: '误派发率', value: rates.misdispatchRate, good: false, note: '被纠正为错误派发的任务比例' },
    { label: '恢复成功率', value: rates.recoverySuccessRate, good: true, note: '备份恢复与回滚成功比例' }
  ]
})

const qualityChecks = computed(() => qualityReport.value?.checks || [])
const qualityStatusText = computed(() => {
  const status = qualityReport.value?.status
  if (status === 'ok') return '质量稳定'
  if (status === 'warn') return '需要关注'
  if (status === 'fail') return '存在风险'
  return '等待采样'
})

const typeLabels = {
  persistentRequirements: '用户约束', factAnchors: '事实锚点', decisions: '架构决策',
  conclusions: '任务结论', completed: '已完成', blocked: '阻塞事项', workerLedger: 'Agent 回执',
  openQuestions: '开放问题', nextActions: '下一步', decisionsArchive: '历史决策', conclusionsArchive: '历史结论',
  user: '用户画像', feedback: '工作偏好', authorization: '授权边界', missions: '全局任务结论',
  unresolved: '未完成事项', references: '资源索引', sessionArchives: '加密会话归档'
}

const formatNumber = value => Number(value || 0).toLocaleString('zh-CN')
const formatRate = value => value === null || value === undefined ? '待采样' : `${value}%`
const formatTime = value => value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '暂无记录'
const compactDisplay = (value, max = 620) => {
  const text = String(value || '')
  return text.length > max ? `${text.slice(0, max)}…` : text
}

const requestJson = async (url, options) => {
  const res = await fetch(url, options)
  const data = await res.json()
  if (!res.ok || data.success === false) throw new Error(data.error || '请求失败')
  return data
}

const loadOverview = async (preserveSelection = true) => {
  loading.value = true
  try {
    overview.value = await requestJson('/api/memory-center/overview')
    await loadQuality(false)
    const stillExists = scopes.value.some(item => item.scope === selectedScope.value && item.id === selectedId.value)
    if (!preserveSelection || !stillExists) {
      const preferred = scopes.value.find(item => item.alerts > 0)
        || scopes.value.reduce((best, item) => Number(item.beforeTokens || 0) > Number(best?.beforeTokens || 0) ? item : best, null)
        || scopes.value[0]
      if (preferred) {
        selectedScope.value = preferred.scope
        selectedId.value = preferred.id
      }
    }
    if (selectedId.value) await loadDetail()
  } catch (error) {
    toast.error(error.message || '读取记忆控制中心失败')
  } finally {
    loading.value = false
  }
}

const loadQuality = async (showToast = false) => {
  qualityLoading.value = true
  try {
    const data = await requestJson('/api/memory-center/quality')
    qualityReport.value = data.quality || null
    if (showToast) toast.success('记忆压缩质量已刷新')
  } catch (error) {
    if (showToast) toast.error(error.message || '读取记忆质量失败')
  } finally {
    qualityLoading.value = false
  }
}

const runQuality = async () => {
  qualityLoading.value = true
  try {
    const data = await requestJson('/api/memory-center/quality', { method: 'POST' })
    qualityReport.value = data.quality || null
    toast.success(`压缩质量评估完成：${qualityReport.value?.overallScore ?? '待采样'}%`)
  } catch (error) {
    toast.error(error.message || '压缩质量评估失败')
  } finally {
    qualityLoading.value = false
  }
}

const loadDetail = async () => {
  if (!selectedId.value) return
  try {
    detail.value = await requestJson(`/api/memory-center/scope?scope=${encodeURIComponent(selectedScope.value)}&id=${encodeURIComponent(selectedId.value)}`)
    if (activeView.value === 'audit') await loadAudit()
  } catch (error) {
    detail.value = null
    toast.error(error.message || '读取记忆详情失败')
  }
}

const selectScope = async item => {
  selectedScope.value = item.scope
  selectedId.value = item.id
  activeType.value = 'all'
  query.value = ''
  await loadDetail()
}

const setView = async view => {
  activeView.value = view
  if (view === 'audit') await loadAudit()
}

const loadAudit = async () => {
  if (!selectedId.value) return
  try {
    const data = await requestJson(`/api/memory-center/audit?scope=${encodeURIComponent(selectedScope.value)}&id=${encodeURIComponent(selectedId.value)}&limit=300`)
    audit.value = data.audit || []
  } catch (error) {
    toast.error(error.message || '读取审计记录失败')
  }
}

const controlItem = async (item, action, extra = {}) => {
  try {
    await requestJson('/api/memory-center/control', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: selectedScope.value, scope_id: selectedId.value, item_type: item.type, item_id: item.itemId, action, ...extra })
    })
    toast.success(action === 'pin' ? '记忆已固定' : action === 'unpin' ? '已取消固定' : action === 'restore' ? '已恢复原始记忆' : '记忆已更新')
    editState.value = null
    await loadOverview(true)
  } catch (error) {
    toast.error(error.message || '记忆操作失败')
  }
}

const openEdit = (item, mode) => {
  editState.value = { item, mode, text: item.text || '', reason: '' }
}

const submitEdit = async () => {
  if (!editState.value) return
  const { item, mode, text, reason } = editState.value
  await controlItem(item, mode, { text, reason })
}

const openEvidence = async item => {
  const ref = item.evidence || {}
  if (!ref.messageId && !ref.taskId) return toast.info('这条记忆来自结构化状态，没有可定位的消息 ID')
  try {
    const params = new URLSearchParams()
    if (ref.groupId) params.set('group_id', ref.groupId)
    if (selectedScope.value === 'global') params.set('scope', 'global')
    if (ref.sessionId) params.set('session_id', ref.sessionId)
    if (ref.missionId) params.set('mission_id', ref.missionId)
    if (ref.messageId) params.set('message_id', ref.messageId)
    if (ref.taskId) params.set('task_id', ref.taskId)
    const data = await requestJson(`/api/memory-center/evidence?${params}`)
    evidence.value = data.evidence || []
    evidenceOpen.value = true
  } catch (error) {
    toast.error(error.message || '读取原始证据失败')
  }
}

const openOperation = operation => {
  operationState.value = { operation, reason: '', pattern: '' }
}

const removeBlockedPattern = async pattern => {
  operationState.value = { operation: 'remove_block_pattern', reason: '用户删除禁记规则', pattern }
  await runOperation()
}

const runOperation = async () => {
  const state = operationState.value
  if (!state) return
  if (state.operation === 'rollback') {
    const ok = await confirmDialog('回滚会用最近有效备份替换当前记忆，同时保留回滚前快照。确定继续？')
    if (!ok) return
  }
  loading.value = true
  try {
    await requestJson('/api/memory-center/operation', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: selectedScope.value, scope_id: selectedId.value, operation: state.operation, reason: state.reason, pattern: state.pattern })
    })
    toast.success(state.operation === 'compact' ? '手动压缩完成' : state.operation === 'rebuild' ? '记忆已从原始数据重建' : state.operation === 'disable' ? '全局记忆写入已禁用' : state.operation === 'enable' ? '全局记忆写入已启用' : state.operation === 'block_pattern' ? '禁记规则已添加' : state.operation === 'remove_block_pattern' ? '禁记规则已删除' : '已从备份回滚')
    operationState.value = null
    await loadOverview(true)
  } catch (error) {
    toast.error(error.message || '维护操作失败')
  } finally {
    loading.value = false
  }
}

const submitFeedback = async type => {
  try {
    const data = await requestJson('/api/memory-center/feedback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, scope: selectedScope.value, scope_id: selectedId.value, reason: '控制中心人工验收' })
    })
    overview.value.metrics = data.metrics
    toast.success('验收反馈已计入长期指标')
  } catch (error) {
    toast.error(error.message || '记录反馈失败')
  }
}

const runAcceptance = async () => {
  loading.value = true
  try {
    const data = await requestJson('/api/memory-center/acceptance', { method: 'POST' })
    overview.value.metrics = data.metrics
    toast.success(`长期验收完成：覆盖 ${data.acceptance?.dataset?.groupMessages || 0} 条真实群聊消息`)
  } catch (error) {
    toast.error(error.message || '长期验收失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => loadOverview(false))
</script>

<template>
  <div class="memory-center">
    <header class="mc-header aura-card">
      <div>
        <div class="eyebrow">MEMORY CONTROL CENTER</div>
        <h2>Agent 记忆控制中心</h2>
        <p>看见 Agent 当前记住了什么、依据什么，并在失真前纠正它。</p>
      </div>
      <div class="header-actions">
        <span class="sync-time">快照 {{ formatTime(overview.generatedAt) }}</span>
        <button class="btn btn-outline" :disabled="qualityLoading" @click="runQuality">{{ qualityLoading ? '评估中' : '评估压缩质量' }}</button>
        <button class="btn btn-outline" :disabled="loading" @click="loadOverview(true)">{{ loading ? '同步中' : '刷新状态' }}</button>
      </div>
    </header>

    <section class="summary-strip">
      <article class="summary-card">
        <span class="summary-label">健康范围</span>
        <strong>{{ overview.totals?.healthy || 0 }} / {{ overview.totals?.scopes || 0 }}</strong>
        <small>群聊与项目记忆</small>
      </article>
      <article class="summary-card" :class="{ warning: overview.totals?.alerts }">
        <span class="summary-label">主动告警</span>
        <strong>{{ overview.totals?.alerts || 0 }}</strong>
        <small>冲突、漂移、恢复与压力</small>
      </article>
      <article v-for="metric in metricCards" :key="metric.label" class="summary-card metric-card" :class="{ risk: !metric.good && metric.value > 0 }">
        <span class="summary-label">{{ metric.label }}</span>
        <strong>{{ formatRate(metric.value) }}</strong>
        <small>{{ metric.note }}</small>
      </article>
    </section>

    <section v-if="overview.alerts?.length" class="global-alerts">
      <div v-for="alert in overview.alerts.slice(0, 5)" :key="alert.id" :class="['global-alert', alert.severity]"><span></span><strong>{{ alert.code }}</strong><p>{{ alert.message }}</p><small>{{ alert.scope === 'system' ? '全局基线' : `${alert.scope} / ${alert.scopeId}` }}</small></div>
    </section>

    <section class="quality-panel aura-card">
      <div class="quality-panel-head">
        <div>
          <span class="panel-kicker">COMPACTION QUALITY</span>
          <h3>记忆压缩质量评估</h3>
          <p>检查约束保留、子 Agent 记忆使用、RAG 召回、长任务目标一致性和来源追溯。</p>
        </div>
        <div :class="['quality-score', qualityReport?.status || 'empty']">
          <strong>{{ qualityReport?.overallScore ?? '—' }}{{ qualityReport?.overallScore !== null && qualityReport?.overallScore !== undefined ? '%' : '' }}</strong>
          <span>{{ qualityStatusText }}</span>
        </div>
      </div>
      <div class="quality-check-grid">
        <article v-for="check in qualityChecks" :key="check.id" :class="['quality-check-card', check.status]">
          <div class="quality-check-top">
            <strong>{{ check.label }}</strong>
            <span>{{ check.score === null || check.score === undefined ? '待采样' : `${check.score}%` }}</span>
          </div>
          <p>{{ check.note }}</p>
          <div class="quality-check-stats">
            <span>检查 {{ check.checked || 0 }}</span>
            <span>通过 {{ check.passed || 0 }}</span>
            <span>缺口 {{ check.failed || 0 }}</span>
          </div>
          <details v-if="check.gaps?.length || check.evidence?.length" class="quality-check-detail">
            <summary>{{ check.gaps?.length ? `查看缺口 ${check.gaps.length}` : `查看证据 ${check.evidence.length}` }}</summary>
            <ul v-if="check.gaps?.length">
              <li v-for="(gap, index) in check.gaps.slice(0, 4)" :key="index">{{ gap.reason || gap.title || gap.item || JSON.stringify(gap) }}</li>
            </ul>
            <ul v-else>
              <li v-for="(item, index) in check.evidence.slice(0, 4)" :key="index">{{ item.title || item.item || item.file || item.source || JSON.stringify(item) }}</li>
            </ul>
          </details>
        </article>
      </div>
      <div v-if="qualityReport?.nextActions?.length" class="quality-next-actions">
        <strong>建议处理</strong>
        <span v-for="action in qualityReport.nextActions" :key="action">{{ action }}</span>
      </div>
    </section>

    <div class="workspace-grid">
      <aside class="scope-panel aura-card">
        <div class="panel-title-row">
          <div><span class="panel-kicker">MEMORY SCOPE</span><h3>记忆范围</h3></div>
          <span class="count-badge">{{ scopes.length }}</span>
        </div>
        <div class="scope-list">
          <button v-for="item in scopes" :key="`${item.scope}:${item.id}`" class="scope-item" :class="{ active: item.scope === selectedScope && item.id === selectedId }" @click="selectScope(item)">
            <span class="scope-mark" :class="[item.scope, item.health]">{{ item.scope === 'global' ? 'A' : item.scope === 'group' ? 'G' : 'P' }}</span>
            <span class="scope-copy"><strong>{{ item.label }}</strong><small>{{ item.scope === 'global' ? '全局 Agent 记忆' : item.scope === 'group' ? '群聊上下文' : '项目长期记忆' }}</small></span>
            <span v-if="item.alerts" class="alert-count">{{ item.alerts }}</span>
            <span v-else class="health-dot"></span>
          </button>
        </div>
      </aside>

      <main class="detail-panel aura-card">
        <template v-if="detail">
          <div class="detail-header">
            <div>
              <div class="scope-meta"><span :class="['status-pill', detail.summary.health]">{{ detail.summary.health === 'healthy' ? '健康' : detail.summary.health === 'warning' ? '需关注' : '严重' }}</span><span>{{ selectedScope === 'global' ? '全局 Agent 记忆' : selectedScope === 'group' ? '群聊记忆' : '项目记忆' }}</span></div>
              <h3>{{ selectedSummary?.label || selectedId }}</h3>
              <p>{{ selectedScope === 'global' ? `已加密保存 ${detail.memory.sessions?.length || 0} 个会话，${detail.memory.archives?.length || 0} 个压缩归档` : selectedScope === 'group' ? (detail.memory.goal || '尚未记录整体目标') : (detail.memory.architecture || '尚未记录架构描述') }}</p>
            </div>
            <div class="maintenance-actions">
              <button v-if="selectedScope === 'group' || selectedScope === 'global'" class="btn btn-sm" @click="openOperation('compact')">手动压缩</button>
              <button class="btn btn-sm btn-outline" @click="openOperation('rebuild')">从原始数据重建</button>
              <button v-if="selectedScope === 'global'" class="btn btn-sm btn-outline" @click="openOperation(detail.policy?.disabled ? 'enable' : 'disable')">{{ detail.policy?.disabled ? '启用记忆' : '禁用记忆' }}</button>
              <button v-if="selectedScope === 'global'" class="btn btn-sm btn-outline" @click="openOperation('block_pattern')">添加禁记规则</button>
              <button class="btn btn-sm btn-danger" :disabled="!detail.backupExists" @click="openOperation('rollback')">备份回滚</button>
            </div>
          </div>

          <div v-if="selectedScope === 'global' && detail.policy?.blockedPatterns?.length" class="memory-policy-strip">
            <span>禁记规则</span>
            <button v-for="pattern in detail.policy.blockedPatterns" :key="pattern" @click="removeBlockedPattern(pattern)">{{ pattern }} ×</button>
          </div>

          <div v-if="detail.alerts?.length" class="alerts-block">
            <div v-for="alert in detail.alerts" :key="alert.id" :class="['alert-row', alert.severity]">
              <span class="alert-signal"></span><strong>{{ alert.code }}</strong><span>{{ alert.message }}</span>
            </div>
          </div>

          <div class="context-meter">
            <div class="meter-copy"><span>Token 上下文占用</span><strong>{{ detail.summary.tokenPressure || 0 }}%</strong></div>
            <div class="meter-track"><span :style="{ width: `${Math.min(100, detail.summary.tokenPressure || 0)}%` }"></span></div>
            <div class="meter-notes"><span>压缩前 {{ formatNumber(detail.summary.beforeTokens) }}</span><span>当前 {{ formatNumber(detail.summary.afterTokens) }}</span><span>{{ detail.memory.compaction?.modelMode || '结构化项目记忆' }}</span></div>
          </div>

          <nav class="view-tabs">
            <button :class="{ active: activeView === 'memory' }" @click="setView('memory')">当前记忆 <span>{{ memoryStats.total }}</span></button>
            <button :class="{ active: activeView === 'context' }" @click="setView('context')">压缩边界</button>
            <button :class="{ active: activeView === 'audit' }" @click="setView('audit')">审计记录</button>
            <button :class="{ active: activeView === 'metrics' }" @click="setView('metrics')">长期验收</button>
          </nav>

          <section v-if="activeView === 'memory'" class="memory-view">
            <div class="memory-toolbar">
              <div class="type-filters">
                <button :class="{ active: activeType === 'all' }" @click="activeType = 'all'">全部</button>
                <button v-for="group in itemGroups" :key="group.type" :class="{ active: activeType === group.type }" @click="activeType = group.type">{{ typeLabels[group.type] || group.type }} <span>{{ group.items?.length || 0 }}</span></button>
              </div>
              <input v-model="query" class="memory-search" placeholder="搜索约束、事实、决策或结论" />
            </div>
            <div class="memory-stats-line"><span>固定 {{ memoryStats.pinned }}</span><span>已纠正 {{ memoryStats.edited }}</span><span>已废弃 {{ memoryStats.deprecated }}</span></div>
            <div v-if="visibleGroups.length" class="memory-groups">
              <section v-for="group in visibleGroups" :key="group.type" class="memory-group">
                <div class="group-heading"><h4>{{ typeLabels[group.type] || group.type }}</h4><span>显示 {{ group.items.length }} / {{ group.totalMatched }}</span></div>
                <article v-for="item in group.items" :key="item.itemId" class="memory-item" :class="{ pinned: item.pinned, deprecated: item.deprecated, edited: item.text !== item.originalText }">
                  <div class="item-state"><span v-if="item.pinned" class="state-tag pin">固定</span><span v-if="item.text !== item.originalText" class="state-tag edit">已纠正</span><span v-if="item.deprecated" class="state-tag off">已废弃</span><span v-if="item.archived" class="state-tag archive">归档</span></div>
                  <p>{{ compactDisplay(item.text || '无文本内容') }}</p>
                  <div v-if="item.text !== item.originalText" class="original-text">原始：{{ compactDisplay(item.originalText, 360) }}</div>
                  <div class="item-footer">
                    <span>{{ item.evidence?.messageId ? `消息 #${item.evidence.messageId}` : item.evidence?.taskId ? `任务 ${item.evidence.taskId}` : '结构化状态' }}</span>
                    <div class="item-actions">
                      <button v-if="item.type !== 'sessionArchives'" @click="controlItem(item, item.pinned ? 'unpin' : 'pin')">{{ item.pinned ? '取消固定' : '固定' }}</button>
                      <button v-if="item.type !== 'sessionArchives'" @click="openEdit(item, 'edit')">修改</button>
                      <button v-if="item.type !== 'sessionArchives' && !item.deprecated" @click="openEdit(item, 'delete')">删除</button>
                      <button v-else-if="item.type !== 'sessionArchives'" @click="controlItem(item, 'restore', { reason: '用户恢复原始记忆' })">恢复</button>
                      <button :disabled="!item.evidence?.messageId && !item.evidence?.taskId && !item.evidence?.sessionId && !item.evidence?.missionId" @click="openEvidence(item)">查看证据</button>
                    </div>
                  </div>
                </article>
              </section>
            </div>
            <div v-else class="empty-state">这个筛选下没有记忆条目。</div>
          </section>

          <section v-else-if="activeView === 'context'" class="context-view">
            <div class="boundary-grid">
              <article><span>压缩策略</span><strong>{{ selectedScope === 'global' ? 'CC-style session-memory + encrypted transcript' : detail.memory.messageCompression?.strategy || (selectedScope === 'project' ? 'lossless-project-archive-v2' : '尚未压缩') }}</strong></article>
              <article><span>摘要边界</span><strong>{{ selectedScope === 'global' ? `${detail.memory.compaction?.boundaries?.length || 0} 个边界` : detail.memory.compactBoundary?.summarizedThroughMessageId || '无' }}</strong></article>
              <article><span>已压缩消息</span><strong>{{ formatNumber(selectedScope === 'global' ? detail.memory.archives?.reduce((sum, item) => sum + Number(item.count || 0), 0) : detail.memory.compaction?.compactedMessageCount || detail.memory.compression?.compressedConclusions) }}</strong></article>
              <article><span>保留原文</span><strong>{{ selectedScope === 'global' ? 'AES-256-GCM 加密转录' : formatNumber(detail.memory.compaction?.preservedRecentMessages || detail.memory.conclusions?.length) }}</strong></article>
              <article><span>事实校验</span><strong>{{ detail.memory.integrity?.pass === false || detail.memory.compaction?.validation?.pass === false ? '失败' : '通过' }}</strong></article>
              <article><span>最近压缩</span><strong>{{ formatTime(detail.memory.compaction?.lastCompactedAt || detail.memory.compression?.lastCompactedAt) }}</strong></article>
            </div>
            <div class="summary-preview">
              <div class="preview-heading"><h4>Agent 当前接收到的核心摘要</h4><span>{{ detail.memory.compaction?.summaryChecksum || '项目结构化记忆' }}</span></div>
              <pre>{{ JSON.stringify(selectedScope === 'global' ? { sessions: detail.memory.sessions?.map(item => ({ sessionId: item.sessionId, summary: item.summary, boundary: item.boundary })), recentMissions: detail.memory.missions?.slice(-5), unresolved: detail.memory.unresolved?.slice(-8) } : detail.memory.conversationSummary || { architecture: detail.memory.architecture, techStack: detail.memory.techStack, recentConclusions: detail.memory.conclusions?.slice(-3), decisions: detail.memory.decisions?.slice(-8) }, null, 2) }}</pre>
            </div>
          </section>

          <section v-else-if="activeView === 'audit'" class="audit-view">
            <article v-for="entry in audit" :key="entry.id" class="audit-item">
              <span class="audit-time">{{ formatTime(entry.at) }}</span>
              <div><strong>{{ entry.action || entry.type }}</strong><p>{{ entry.reason || '系统自动记录' }}</p></div>
              <code>{{ entry.itemType || entry.metricType || entry.scope }}{{ entry.itemId ? ` / ${entry.itemId}` : '' }}</code>
            </article>
            <div v-if="!audit.length" class="empty-state">还没有人工纠正或维护操作。</div>
          </section>

          <section v-else class="metrics-view">
            <div class="metrics-grid">
              <article v-for="metric in metricCards" :key="metric.label"><span>{{ metric.label }}</span><strong>{{ formatRate(metric.value) }}</strong><p>{{ metric.note }}</p></article>
            </div>
            <div class="feedback-panel">
              <div><h4>真实运行验收反馈</h4><p>当你确认一次召回、遗忘或派发结果时，在这里记一票，长期指标会持续累积。</p></div>
              <div class="feedback-actions"><button class="btn btn-sm btn-primary" :disabled="loading" @click="runAcceptance">运行真实项目验收</button><button class="btn btn-sm" @click="submitFeedback('recall_hit')">召回正确</button><button class="btn btn-sm" @click="submitFeedback('recall_miss')">召回失败</button><button class="btn btn-sm" @click="submitFeedback('remembered')">约束记住了</button><button class="btn btn-sm" @click="submitFeedback('forgotten')">发现遗忘</button><button class="btn btn-sm btn-danger" @click="submitFeedback('misdispatch')">错误派发</button></div>
            </div>
            <div v-if="overview.metrics?.latestAcceptance" class="acceptance-note">最近真实验收：{{ formatTime(overview.metrics.latestAcceptance.at) }} · {{ overview.metrics.latestAcceptance.dataset.groupMessages }} 条消息 · {{ overview.metrics.latestAcceptance.dataset.recallChecks }} 个证据锚点 · {{ overview.metrics.latestAcceptance.dataset.dispatches }} 次历史派发</div>
            <div class="counter-table">
              <div><span>召回采样</span><strong>{{ overview.metrics?.counters?.recallAttempts || 0 }}</strong></div><div><span>记忆检查</span><strong>{{ overview.metrics?.counters?.memoryChecks || 0 }}</strong></div><div><span>派发采样</span><strong>{{ overview.metrics?.counters?.dispatches || 0 }}</strong></div><div><span>恢复尝试</span><strong>{{ overview.metrics?.counters?.recoveryAttempts || 0 }}</strong></div>
            </div>
          </section>
        </template>
        <div v-else class="empty-state large">{{ loading ? '正在读取记忆状态…' : '选择一个群聊或项目开始检查。' }}</div>
      </main>
    </div>

    <div v-if="editState" class="mc-modal-overlay" @click.self="editState = null">
      <div class="mc-modal">
        <div><span class="panel-kicker">MEMORY CORRECTION</span><h3>{{ editState.mode === 'edit' ? '修改这条记忆' : '删除这条记忆' }}</h3></div>
        <label v-if="editState.mode === 'edit'">修正后的内容<textarea v-model="editState.text" rows="5"></textarea></label>
        <label>操作原因<textarea v-model="editState.reason" rows="3" placeholder="说明为什么需要纠正，便于以后审计"></textarea></label>
        <div class="modal-actions"><button class="btn" @click="editState = null">取消</button><button class="btn" :class="editState.mode === 'delete' ? 'btn-danger' : 'btn-primary'" :disabled="!editState.reason.trim() || (editState.mode === 'edit' && !editState.text.trim())" @click="submitEdit">确认</button></div>
      </div>
    </div>

    <div v-if="operationState" class="mc-modal-overlay" @click.self="operationState = null">
      <div class="mc-modal">
        <div><span class="panel-kicker">MEMORY MAINTENANCE</span><h3>{{ operationState.operation === 'compact' ? '手动压缩' : operationState.operation === 'rebuild' ? '从原始数据重建' : operationState.operation === 'disable' ? '禁用全局记忆' : operationState.operation === 'enable' ? '启用全局记忆' : operationState.operation === 'block_pattern' ? '添加禁记规则' : '从备份回滚' }}</h3></div>
        <p class="modal-note">{{ operationState.operation === 'compact' ? '按照当前压缩边界收敛上下文，不删除加密原始转录。' : operationState.operation === 'rebuild' ? '忽略旧摘要边界，从加密原始转录重新生成全局记忆。' : operationState.operation === 'disable' ? '停止新的长期记忆写入与提取，已有记忆仍可查看和删除。' : operationState.operation === 'enable' ? '恢复长期记忆写入、压缩和按需召回。' : operationState.operation === 'block_pattern' ? '匹配此文本或正则表达式的内容不会进入长期记忆。' : '使用最近有效备份替换主记忆，并保留回滚前快照。' }}</p>
        <label v-if="operationState.operation === 'block_pattern'">文本或正则规则<input v-model="operationState.pattern" placeholder="例如：客户手机号|内部代号" /></label>
        <label>操作原因<textarea v-model="operationState.reason" rows="3" placeholder="建议记录本次维护的原因"></textarea></label>
        <div class="modal-actions"><button class="btn" @click="operationState = null">取消</button><button class="btn" :class="['rollback','disable'].includes(operationState.operation) ? 'btn-danger' : 'btn-primary'" :disabled="!operationState.reason.trim() || (operationState.operation === 'block_pattern' && !operationState.pattern.trim())" @click="runOperation">执行</button></div>
      </div>
    </div>

    <div v-if="evidenceOpen" class="mc-modal-overlay" @click.self="evidenceOpen = false">
      <div class="mc-modal evidence-modal">
        <div><span class="panel-kicker">SOURCE EVIDENCE</span><h3>原始消息证据</h3></div>
        <article v-for="row in evidence" :key="`${row.groupId}:${row.messageId}`" class="evidence-row"><div><strong>#{{ row.messageId }}</strong><span>{{ row.role }} · {{ row.agent }} · {{ formatTime(row.timestamp) }}</span></div><pre>{{ row.content }}</pre></article>
        <div v-if="!evidence.length" class="empty-state">没有找到对应的原始消息。</div>
        <div class="modal-actions"><button class="btn btn-primary" @click="evidenceOpen = false">关闭</button></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.memory-center{height:100%;overflow:auto;padding:18px 20px 36px;color:var(--text-primary)}
.aura-card{background:var(--bg-card);border:1px solid var(--border-color);box-shadow:var(--shadow-lg);backdrop-filter:blur(24px) saturate(150%)}
.mc-header{border-radius:16px;padding:22px 26px;display:flex;align-items:center;justify-content:space-between;gap:24px}.eyebrow,.panel-kicker{font-family:var(--font-tech);font-size:10px;letter-spacing:1.8px;color:var(--accent-blue);font-weight:700}.mc-header h2{font-size:24px;margin:5px 0 4px}.mc-header p,.detail-header p,.modal-note{color:var(--text-muted);font-size:13px;line-height:1.55}.header-actions{display:flex;align-items:center;gap:12px}.sync-time{font-size:11px;color:var(--text-muted)}
.summary-strip{display:grid;grid-template-columns:repeat(6,minmax(145px,1fr));gap:10px;margin:12px 0}.summary-card{min-height:105px;padding:16px;border-radius:13px;background:rgba(255,255,255,.55);border:1px solid var(--border-color);display:flex;flex-direction:column}.summary-label{font-size:11px;color:var(--text-muted);font-weight:700}.summary-card strong{font-family:var(--font-tech);font-size:24px;margin:9px 0 5px}.summary-card small{font-size:10px;color:var(--text-muted);line-height:1.4}.summary-card.warning strong,.summary-card.risk strong{color:var(--accent-yellow)}
.global-alerts{display:flex;flex-direction:column;gap:6px;margin:-2px 0 12px}.global-alert{display:grid;grid-template-columns:7px auto minmax(0,1fr) auto;align-items:center;gap:9px;padding:9px 12px;border-radius:9px;border:1px solid rgba(245,158,11,.18);background:rgba(245,158,11,.06);font-size:10px}.global-alert>span{width:7px;height:7px;border-radius:50%;background:var(--accent-yellow)}.global-alert strong{font-family:monospace}.global-alert p{color:var(--text-secondary)}.global-alert small{color:var(--text-muted)}.global-alert.critical{border-color:rgba(239,68,68,.2);background:rgba(239,68,68,.06)}.global-alert.critical>span{background:var(--accent-red)}
.quality-panel{border-radius:16px;padding:18px;margin:12px 0}.quality-panel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.quality-panel-head h3{font-size:17px;margin:4px 0}.quality-panel-head p{font-size:11px;color:var(--text-muted);line-height:1.5}.quality-score{min-width:112px;padding:12px 14px;border-radius:13px;background:rgba(100,116,139,.08);text-align:right}.quality-score strong{display:block;font-family:var(--font-tech);font-size:26px}.quality-score span{font-size:10px;color:var(--text-muted)}.quality-score.ok strong{color:var(--accent-green)}.quality-score.warn strong{color:var(--accent-yellow)}.quality-score.fail strong{color:var(--accent-red)}.quality-check-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:14px}.quality-check-card{min-width:0;padding:12px;border-radius:11px;border:1px solid var(--border-color);background:rgba(255,255,255,.42)}.quality-check-card.ok{border-color:rgba(16,185,129,.18);background:rgba(16,185,129,.045)}.quality-check-card.warn{border-color:rgba(245,158,11,.22);background:rgba(245,158,11,.06)}.quality-check-card.fail{border-color:rgba(239,68,68,.2);background:rgba(239,68,68,.055)}.quality-check-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.quality-check-top strong{font-size:12px;color:var(--text-primary)}.quality-check-top span{font-family:var(--font-tech);font-size:13px;color:var(--accent-blue)}.quality-check-card p{min-height:42px;margin:8px 0 10px;font-size:9.5px;line-height:1.45;color:var(--text-muted)}.quality-check-stats{display:flex;gap:5px;flex-wrap:wrap}.quality-check-stats span{padding:3px 6px;border-radius:999px;background:rgba(15,23,42,.055);font-size:9px;color:var(--text-secondary)}.quality-check-detail{margin-top:8px;font-size:9px;color:var(--text-muted)}.quality-check-detail summary{cursor:pointer;font-weight:800}.quality-check-detail ul{margin:6px 0 0;padding-left:16px;line-height:1.45}.quality-next-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}.quality-next-actions strong{font-size:10px;color:var(--text-muted);padding:4px 0}.quality-next-actions span{padding:5px 8px;border-radius:999px;background:rgba(245,158,11,.08);color:#a16207;font-size:9px}
.workspace-grid{display:grid;grid-template-columns:260px minmax(0,1fr);gap:12px;min-height:620px}.scope-panel,.detail-panel{border-radius:16px;min-height:0}.scope-panel{padding:18px 10px}.panel-title-row{display:flex;align-items:center;justify-content:space-between;padding:0 8px 14px}.panel-title-row h3{font-size:17px;margin-top:3px}.count-badge{font-family:var(--font-tech);font-size:11px;padding:4px 8px;border-radius:20px;background:rgba(var(--accent-blue-rgb),.1);color:var(--accent-blue)}.scope-list{display:flex;flex-direction:column;gap:5px;max-height:700px;overflow:auto}.scope-item{border:1px solid transparent;background:transparent;border-radius:10px;padding:10px;display:flex;align-items:center;gap:10px;text-align:left;color:var(--text-primary);cursor:pointer;transition:.2s}.scope-item:hover{background:rgba(var(--accent-blue-rgb),.05)}.scope-item.active{background:rgba(var(--accent-blue-rgb),.1);border-color:rgba(var(--accent-blue-rgb),.18)}.scope-mark{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;font-family:var(--font-tech);font-size:11px;color:white;background:var(--accent-purple)}.scope-mark.project{background:var(--accent-blue)}.scope-mark.warning,.scope-mark.critical{box-shadow:0 0 0 3px rgba(245,158,11,.12)}.scope-copy{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}.scope-copy strong{font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.scope-copy small{font-size:10px;color:var(--text-muted)}.health-dot{width:7px;height:7px;border-radius:50%;background:var(--accent-green)}.alert-count{font-size:10px;color:#fff;background:var(--accent-yellow);padding:2px 6px;border-radius:10px}
.detail-panel{padding:20px;overflow:hidden}.detail-header{display:flex;justify-content:space-between;gap:22px;align-items:flex-start}.detail-header h3{font-size:22px;margin:6px 0 5px}.detail-header>div:first-child{min-width:0}.detail-header>div:first-child>p{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;max-width:760px}.scope-meta{display:flex;align-items:center;gap:8px;font-size:10px;color:var(--text-muted)}.status-pill{padding:3px 7px;border-radius:10px;background:rgba(16,185,129,.1);color:var(--accent-green);font-weight:800}.status-pill.warning{background:rgba(245,158,11,.12);color:var(--accent-yellow)}.status-pill.critical{background:rgba(239,68,68,.1);color:var(--accent-red)}.maintenance-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}
.alerts-block{margin-top:14px;display:flex;flex-direction:column;gap:6px}.alert-row{display:flex;align-items:center;gap:8px;padding:9px 11px;border:1px solid rgba(245,158,11,.18);background:rgba(245,158,11,.06);border-radius:9px;font-size:11px}.alert-row.critical{border-color:rgba(239,68,68,.2);background:rgba(239,68,68,.06)}.alert-signal{width:7px;height:7px;border-radius:50%;background:var(--accent-yellow)}.critical .alert-signal{background:var(--accent-red)}
.context-meter{margin-top:15px;padding:14px;border-radius:11px;background:rgba(var(--accent-blue-rgb),.035);border:1px solid rgba(var(--accent-blue-rgb),.08)}.meter-copy,.meter-notes{display:flex;justify-content:space-between;gap:12px}.meter-copy{font-size:11px}.meter-copy strong{font-family:var(--font-tech);color:var(--accent-blue)}.meter-track{height:5px;background:rgba(var(--accent-blue-rgb),.1);border-radius:4px;margin:9px 0;overflow:hidden}.meter-track span{display:block;height:100%;background:var(--gradient-cyber);border-radius:4px}.meter-notes{font-size:9px;color:var(--text-muted)}
.view-tabs{display:flex;gap:4px;border-bottom:1px solid var(--border-color);margin-top:15px}.view-tabs button{border:0;background:transparent;color:var(--text-muted);padding:10px 13px;font-size:11px;font-weight:700;cursor:pointer;border-bottom:2px solid transparent}.view-tabs button.active{color:var(--accent-blue);border-bottom-color:var(--accent-blue)}.view-tabs span{margin-left:4px;padding:1px 5px;border-radius:8px;background:rgba(var(--accent-blue-rgb),.08)}
.memory-toolbar{display:flex;flex-direction:column;gap:8px;padding:13px 0 8px}.type-filters{display:flex;gap:5px;overflow:auto;padding-bottom:3px}.type-filters button{white-space:nowrap;border:1px solid var(--border-color);background:rgba(255,255,255,.4);border-radius:16px;padding:5px 9px;font-size:10px;color:var(--text-muted);cursor:pointer}.type-filters button.active{border-color:rgba(var(--accent-blue-rgb),.25);background:rgba(var(--accent-blue-rgb),.08);color:var(--accent-blue)}.memory-search{width:100%;padding:7px 10px;font-size:11px}.memory-stats-line{display:flex;gap:14px;font-size:10px;color:var(--text-muted);padding:2px 0 10px}.memory-groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;max-height:560px;overflow:auto;padding-right:4px}.memory-group{border:1px solid var(--border-color);border-radius:11px;padding:10px;background:rgba(255,255,255,.25)}.group-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.group-heading h4{font-size:12px}.group-heading span{font-family:var(--font-tech);font-size:9px;color:var(--text-muted)}.memory-item{padding:10px;border-radius:9px;background:rgba(255,255,255,.55);border:1px solid transparent;margin-top:7px}.memory-item.pinned{border-color:rgba(var(--accent-blue-rgb),.25)}.memory-item.deprecated{opacity:.58;border-style:dashed}.memory-item p{font-size:11px;line-height:1.6;white-space:pre-wrap}.item-state{display:flex;gap:4px;margin-bottom:5px;min-height:14px}.state-tag{font-size:8px;font-weight:800;padding:2px 5px;border-radius:6px}.state-tag.pin{color:var(--accent-blue);background:rgba(var(--accent-blue-rgb),.1)}.state-tag.edit{color:var(--accent-purple);background:rgba(99,102,241,.1)}.state-tag.off{color:var(--accent-red);background:rgba(239,68,68,.08)}.state-tag.archive{color:var(--text-muted);background:rgba(100,116,139,.1)}.original-text{font-size:9px;color:var(--text-muted);padding:6px 8px;margin-top:7px;border-left:2px solid rgba(99,102,241,.2);line-height:1.5}.item-footer{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px;color:var(--text-muted);font-size:8px}.item-actions{display:flex;gap:2px;flex-wrap:wrap;justify-content:flex-end}.item-actions button{border:0;background:transparent;color:var(--text-muted);font-size:8px;padding:3px 4px;cursor:pointer}.item-actions button:hover{color:var(--accent-blue)}.item-actions button:disabled{opacity:.35;cursor:default}
.boundary-grid,.metrics-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin:14px 0}.boundary-grid article,.metrics-grid article{padding:13px;border-radius:10px;border:1px solid var(--border-color);background:rgba(255,255,255,.4);display:flex;flex-direction:column;gap:7px}.boundary-grid span,.metrics-grid span{font-size:9px;color:var(--text-muted)}.boundary-grid strong{font-size:11px;overflow-wrap:anywhere}.metrics-grid strong{font-family:var(--font-tech);font-size:22px;color:var(--accent-blue)}.metrics-grid p{font-size:9px;color:var(--text-muted)}.summary-preview{border:1px solid var(--border-color);border-radius:11px;overflow:hidden}.preview-heading{padding:11px 13px;display:flex;justify-content:space-between;background:rgba(var(--accent-blue-rgb),.035)}.preview-heading h4{font-size:11px}.preview-heading span{font-family:monospace;font-size:9px;color:var(--text-muted)}.summary-preview pre,.evidence-row pre{margin:0;padding:14px;max-height:360px;overflow:auto;font:10px/1.6 'JetBrains Mono',monospace;white-space:pre-wrap;color:var(--text-secondary)}
.audit-view{padding-top:12px;max-height:560px;overflow:auto}.audit-item{display:grid;grid-template-columns:145px minmax(0,1fr) auto;gap:12px;padding:11px;border-bottom:1px solid var(--border-color);align-items:center}.audit-time{font-size:9px;color:var(--text-muted)}.audit-item strong{font-size:11px}.audit-item p{font-size:9px;color:var(--text-muted);margin-top:3px}.audit-item code{font-size:8px;color:var(--accent-blue)}.feedback-panel{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:12px;padding:14px;border-radius:10px;background:rgba(var(--accent-blue-rgb),.04);border:1px solid rgba(var(--accent-blue-rgb),.1)}.feedback-panel h4{font-size:12px;margin-bottom:4px}.feedback-panel p{font-size:9px;color:var(--text-muted)}.feedback-actions{display:flex;gap:5px;flex-wrap:wrap}.counter-table{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}.counter-table div{padding:11px;border-bottom:2px solid rgba(var(--accent-blue-rgb),.12);display:flex;justify-content:space-between;font-size:10px}.counter-table span{color:var(--text-muted)}
.acceptance-note{margin-top:9px;padding:9px 11px;border-radius:8px;background:rgba(16,185,129,.06);color:var(--text-muted);font-size:9px;border:1px solid rgba(16,185,129,.12)}
.empty-state{padding:35px;text-align:center;color:var(--text-muted);font-size:11px}.empty-state.large{padding-top:180px}.mc-modal-overlay{position:fixed;inset:0;background:rgba(15,23,42,.24);backdrop-filter:blur(10px);z-index:200;display:grid;place-items:center}.mc-modal{width:min(520px,calc(100vw - 36px));max-height:80vh;overflow:auto;border:1px solid var(--border-color);background:rgba(255,255,255,.92);box-shadow:0 26px 80px rgba(15,23,42,.18);border-radius:15px;padding:22px}.mc-modal h3{font-size:19px;margin:4px 0 14px}.mc-modal label{display:flex;flex-direction:column;gap:6px;font-size:10px;font-weight:700;color:var(--text-muted);margin-top:13px}.mc-modal textarea{resize:vertical;font-size:12px;line-height:1.5}.modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.evidence-modal{width:min(760px,calc(100vw - 36px))}.evidence-row{border:1px solid var(--border-color);border-radius:10px;margin-top:9px;overflow:hidden}.evidence-row>div{display:flex;justify-content:space-between;padding:9px 12px;background:rgba(var(--accent-blue-rgb),.04);font-size:9px;color:var(--text-muted)}
@media(max-width:1100px){.summary-strip{grid-template-columns:repeat(3,1fr)}.memory-groups{grid-template-columns:1fr}.workspace-grid{grid-template-columns:220px minmax(0,1fr)}.quality-check-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.memory-center{padding:10px}.mc-header,.detail-header,.feedback-panel,.quality-panel-head{flex-direction:column}.summary-strip{grid-template-columns:repeat(2,1fr)}.workspace-grid{grid-template-columns:1fr}.scope-panel{max-height:240px}.detail-panel{padding:13px}.maintenance-actions{justify-content:flex-start}.memory-toolbar{flex-direction:column}.memory-search{width:100%}.boundary-grid,.metrics-grid{grid-template-columns:repeat(2,1fr)}.quality-check-grid{grid-template-columns:1fr}.audit-item{grid-template-columns:1fr}.counter-table{grid-template-columns:repeat(2,1fr)}}
:global([data-theme='dark']) .memory-center .aura-card,:global([data-theme='dark']) .summary-card,:global([data-theme='dark']) .memory-group,:global([data-theme='dark']) .memory-item,:global([data-theme='dark']) .boundary-grid article,:global([data-theme='dark']) .metrics-grid article,:global([data-theme='dark']) .quality-check-card{background:rgba(15,23,42,.54)}:global([data-theme='dark']) .mc-modal{background:rgba(15,23,42,.94)}
.scope-mark.global{background:linear-gradient(135deg,var(--accent-purple),var(--accent-blue))}
.memory-policy-strip{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:8px 0 12px;font-size:10px;color:var(--text-muted)}.memory-policy-strip button{border:1px solid rgba(239,68,68,.18);background:rgba(239,68,68,.06);color:var(--accent-red);border-radius:14px;padding:4px 8px;cursor:pointer}
</style>
