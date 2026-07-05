<script setup>
import { ref, onMounted } from 'vue'
import { confirmDialog } from '../utils/toast'

const emit = defineEmits(['navigate'])
const loading = ref(false)
const running = ref(false)
const summary = ref(null)
const preview = ref(null)
const error = ref('')
const lastResult = ref(null)
const selectedCardId = ref('')

const navigationMap = {
  tasks: { tab: 'tasks', label: '打开任务派发' },
  cron: { tab: 'cron', label: '打开定时任务' },
  group_messages: { tab: 'groups', label: '打开群聊协作' },
  global_sessions: { tab: 'global-agent', label: '打开全局助手' },
  project_runs: { tab: 'projects', label: '打开项目管理' },
  project_sessions: { tab: 'projects', label: '打开项目管理' },
  execution_artifacts: { tab: 'diagnostics', label: '打开系统自检' },
}

const loadSummary = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await fetch('/api/cleanup/summary')
    const data = await res.json()
    if (!res.ok || data.success === false) throw new Error(data.error || '加载清理摘要失败')
    summary.value = data
  } catch (err) {
    error.value = err?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

const previewAction = async (action) => {
  preview.value = null
  lastResult.value = null
  error.value = ''
  try {
    const res = await fetch('/api/cleanup/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action.id })
    })
    const data = await res.json()
    if (!res.ok || data.success === false) throw new Error(data.error || '预览失败')
    preview.value = data
  } catch (err) {
    error.value = err?.message || '预览失败'
  }
}

const runAction = async () => {
  if (!preview.value?.action?.id) return
  const action = preview.value.action
  if (action.target_count <= 0) return
  const confirmed = await confirmDialog(`确定执行「${action.label}」？\n影响数量：${action.target_count}\n${preview.value.preview?.irreversible ? '这是永久清除，无法撤销。' : '这是归档/整理操作。'}`)
  if (!confirmed) return
  running.value = true
  error.value = ''
  try {
    const res = await fetch('/api/cleanup/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action.id, confirm: true })
    })
    const data = await res.json()
    if (!res.ok || data.success === false) throw new Error(data.error || '执行失败')
    lastResult.value = data
    preview.value = null
    await loadSummary()
  } catch (err) {
    error.value = err?.message || '执行失败'
  } finally {
    running.value = false
  }
}

const fmt = (value) => Number(value || 0).toLocaleString()
const selectCard = (card) => {
  selectedCardId.value = card.id
}
const selectedDetailTitle = () => summary.value?.cards?.find(card => card.id === selectedCardId.value)?.title || '详细统计'
const selectedDetail = () => {
  const details = summary.value?.details || {}
  if (!selectedCardId.value) return null
  return details[selectedCardId.value] || null
}
const selectedRows = () => {
  if (!selectedCardId.value) return []
  return summary.value?.rows?.[selectedCardId.value] || []
}
const rowColumns = () => {
  const rows = selectedRows()
  if (!rows.length) return []
  const preferred = ['id', 'title', 'status', 'project', 'target', 'schedule', 'messages', 'files', 'bytes', 'updated_at', 'archived']
  const keys = Array.from(new Set(rows.flatMap(row => Object.keys(row || {}))))
  return preferred.filter(key => keys.includes(key)).concat(keys.filter(key => !preferred.includes(key))).slice(0, 9)
}
const cellText = (value) => {
  if (value === true) return '是'
  if (value === false) return '否'
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}
const navigateSelected = () => {
  const target = navigationMap[selectedCardId.value]
  if (target?.tab) emit('navigate', target.tab)
}

onMounted(loadSummary)
</script>

<template>
  <div class="cleanup-center">
    <header class="page-header">
      <div>
        <h2>🧹 清理中心</h2>
        <p>统一查看任务、会话、项目运行和执行产物；删除前先预览影响范围。</p>
      </div>
      <button class="btn btn-primary" :disabled="loading" @click="loadSummary">刷新</button>
    </header>

    <div v-if="error" class="alert error">{{ error }}</div>
    <div v-if="loading" class="loading">正在扫描数据...</div>

    <section v-if="summary" class="cards">
      <button
        v-for="card in summary.cards"
        :key="card.id"
        class="stat-card"
        :class="{ active: selectedCardId === card.id }"
        @click="selectCard(card)"
      >
        <div class="stat-title">{{ card.title }}</div>
        <div class="stat-count">{{ fmt(card.count) }}</div>
        <div class="stat-detail">{{ card.detail }}</div>
      </button>
    </section>

    <section v-if="summary" class="panel">
      <div class="panel-head">
        <h3>可执行清理</h3>
        <span>{{ summary.updated_at }}</span>
      </div>
      <div class="actions">
        <button
          v-for="action in summary.actions"
          :key="action.id"
          class="cleanup-action"
          :class="action.risk"
          :disabled="!action.target_count || running"
          @click="previewAction(action)"
        >
          <span>{{ action.label }}</span>
          <small>影响 {{ fmt(action.target_count) }} 项 · {{ action.risk === 'high' ? '高风险' : '中风险' }}</small>
        </button>
      </div>
    </section>

    <section v-if="preview" class="panel preview">
      <div class="panel-head">
        <h3>删除预览</h3>
        <span :class="['risk', preview.action.risk]">{{ preview.action.risk }}</span>
      </div>
      <p>动作：{{ preview.action.label }}</p>
      <p>预计影响：{{ fmt(preview.preview.will_affect) }} 项</p>
      <p>是否不可撤销：{{ preview.preview.irreversible ? '是' : '否' }}</p>
      <p class="note">{{ preview.preview.note }}</p>
      <button class="btn btn-danger" :disabled="running || preview.action.target_count <= 0" @click="runAction">
        {{ running ? '执行中...' : '确认执行' }}
      </button>
    </section>

    <section v-if="lastResult" class="panel result">
      <h3>最近清理结果</h3>
      <pre>{{ JSON.stringify(lastResult, null, 2) }}</pre>
    </section>

    <section v-if="summary" class="panel details">
      <div class="panel-head">
        <h3>{{ selectedCardId ? selectedDetailTitle() : '详细统计' }}</h3>
        <button v-if="selectedCardId && navigationMap[selectedCardId]" class="btn" @click="navigateSelected">
          {{ navigationMap[selectedCardId].label }}
        </button>
      </div>
      <div v-if="selectedCardId" class="selected-detail">
        <div class="selected-summary">
          <span>摘要：{{ JSON.stringify(selectedDetail()) }}</span>
          <span>明细 {{ fmt(selectedRows().length) }} 条</span>
        </div>
        <div v-if="selectedRows().length" class="rows-table">
          <table>
            <thead>
              <tr>
                <th v-for="col in rowColumns()" :key="col">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in selectedRows()" :key="row.id || row.title">
                <td v-for="col in rowColumns()" :key="col" :title="cellText(row[col])">
                  {{ cellText(row[col]) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-detail">暂无明细数据</div>
      </div>
      <div class="detail-grid">
        <div>
          <h4>任务</h4>
          <p>总数 {{ fmt(summary.details.tasks.total) }}，已归档 {{ fmt(summary.details.tasks.archived) }}，失败 {{ fmt(summary.details.tasks.failed) }}，完成 {{ fmt(summary.details.tasks.done) }}</p>
        </div>
        <div>
          <h4>定时任务</h4>
          <p>总数 {{ fmt(summary.details.cron.total) }}，已归档 {{ fmt(summary.details.cron.archived) }}，禁用 {{ fmt(summary.details.cron.disabled) }}</p>
        </div>
        <div>
          <h4>项目运行</h4>
          <p>总数 {{ fmt(summary.details.project_runs.total) }}，已归档 {{ fmt(summary.details.project_runs.archived) }}，失败 {{ fmt(summary.details.project_runs.failed) }}</p>
        </div>
        <div>
          <h4>执行产物</h4>
          <p>{{ summary.cards.find(c => c.id === 'execution_artifacts')?.detail }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.cleanup-center {
  height: 100%;
  overflow: auto;
  padding: 24px;
  background: var(--bg-primary);
  color: var(--text-primary);
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
}
.page-header h2 { margin: 0 0 6px; font-size: 24px; }
.page-header p { margin: 0; color: var(--text-secondary); }
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.stat-card, .panel {
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  border-radius: 14px;
  padding: 16px;
}
.stat-card {
  text-align: left;
  cursor: pointer;
  color: var(--text-primary);
  font: inherit;
}
.stat-card:hover {
  border-color: var(--accent-blue);
  transform: translateY(-1px);
}
.stat-card.active {
  border-color: var(--accent-blue);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, .12);
}
.stat-title { color: var(--text-secondary); font-size: 13px; }
.stat-count { font-size: 28px; font-weight: 800; margin: 8px 0; }
.stat-detail { color: var(--text-muted); font-size: 12px; }
.panel { margin-bottom: 16px; }
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.panel h3 { margin: 0; }
.actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 10px;
}
.cleanup-action {
  text-align: left;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 12px;
  padding: 12px;
  cursor: pointer;
}
.cleanup-action span { display: block; font-weight: 700; margin-bottom: 5px; }
.cleanup-action small { color: var(--text-muted); }
.cleanup-action.high { border-color: rgba(239, 68, 68, .45); }
.cleanup-action:disabled { opacity: .5; cursor: not-allowed; }
.risk.high { color: #ef4444; }
.risk.medium { color: #f59e0b; }
.note { color: var(--text-secondary); }
.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.detail-grid h4 { margin: 0 0 6px; }
.detail-grid p { margin: 0; color: var(--text-secondary); }
.alert.error {
  border: 1px solid rgba(239, 68, 68, .4);
  color: #ef4444;
  background: rgba(239, 68, 68, .08);
  border-radius: 12px;
  padding: 10px 12px;
  margin-bottom: 12px;
}
.loading { color: var(--text-secondary); margin-bottom: 12px; }
pre {
  white-space: pre-wrap;
  background: var(--bg-primary);
  border-radius: 10px;
  padding: 12px;
  overflow: auto;
}
.selected-summary {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 13px;
  margin-bottom: 10px;
}
.rows-table {
  overflow: auto;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-primary);
  margin-bottom: 14px;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th, td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  text-align: left;
  max-width: 260px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
th {
  color: var(--text-secondary);
  background: var(--bg-secondary);
  font-weight: 700;
}
tr:last-child td { border-bottom: none; }
.empty-detail {
  color: var(--text-muted);
  padding: 12px;
  border: 1px dashed var(--border-color);
  border-radius: 10px;
  margin-bottom: 14px;
}
.btn {
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: 10px;
  padding: 9px 14px;
  cursor: pointer;
}
.btn-primary { background: var(--accent-blue); border-color: var(--accent-blue); color: white; }
.btn-danger { background: #ef4444; border-color: #ef4444; color: white; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
</style>
