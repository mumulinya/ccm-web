<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Archive, CircleCheck, Database, HardDrive, History, Info, RefreshCw, ShieldAlert, ShieldCheck, Trash2 } from '@lucide/vue'
import { toast } from '../../../utils/toast'
import CleanupStorageOverview from './CleanupStorageOverview.vue'
import CleanupActionPanel from './CleanupActionPanel.vue'
import CleanupPreviewPanel from './CleanupPreviewPanel.vue'
import CleanupHistory from './CleanupHistory.vue'
import './cleanup.css'

const emit = defineEmits(['navigate'])
const loading = ref(false)
const running = ref(false)
const summary = ref(null)
const preview = ref(null)
const error = ref('')
const activeView = ref('overview')
const selectedCardId = ref('tasks')
const selectedIds = ref([])
const confirmationText = ref('')
const retentionDays = ref(30)
const initializedPolicy = ref(false)
const activeTransaction = ref(null)
let transactionPoller = null

const views = [
  { id: 'overview', label: '存储概览', description: '查看运行数据分布', icon: HardDrive },
  { id: 'safe', label: '安全整理', description: '归档数据，可恢复', icon: Archive },
  { id: 'danger', label: '永久删除', description: '不可恢复的清除', icon: Trash2, tone: 'danger' },
  { id: 'history', label: '清理记录', description: '核对操作与结果', icon: History },
]

const navigationMap = {
  tasks: { tab: 'tasks', label: '打开任务派发' },
  cron: { tab: 'cron', label: '打开定时任务' },
  project_runs: { tab: 'projects', label: '打开项目管理' },
  conversations: { tab: 'search', label: '打开对话搜索' },
}

const currentRows = computed(() => summary.value?.rows?.[selectedCardId.value] || [])
const currentCard = computed(() => summary.value?.cards?.find(card => card.id === selectedCardId.value) || null)
const safeActions = computed(() => (summary.value?.actions || []).filter(action => action.risk === 'safe'))
const dangerActions = computed(() => (summary.value?.actions || []).filter(action => action.risk === 'danger'))
const totalRecords = computed(() => (summary.value?.cards || []).reduce((total, card) => total + Number(card.count || 0), 0))
const formatBytes = (value) => {
  const bytes = Number(value || 0)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

const loadSummary = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch('/api/cleanup/summary')
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '加载清理中心失败')
    summary.value = data
    if (!activeTransaction.value && data.active_transactions?.length) {
      activeTransaction.value = data.active_transactions[0]
      startTransactionPolling(activeTransaction.value.transaction_id)
    }
    if (!initializedPolicy.value) {
      retentionDays.value = Number(data.policy?.default_retention_days || 30)
      initializedPolicy.value = true
    }
    if (!data.cards?.some(card => card.id === selectedCardId.value)) selectedCardId.value = data.cards?.[0]?.id || ''
  } catch (err) {
    error.value = err?.message || '清理中心暂时无法使用'
  } finally {
    loading.value = false
  }
}

const terminalTransaction = status => ['completed', 'partial', 'failed', 'cancelled'].includes(String(status || ''))

const pollTransaction = async (transactionId) => {
  try {
    const response = await fetch(`/api/cleanup/transaction?transaction_id=${encodeURIComponent(transactionId)}&limit=100`, { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '读取清理事务失败')
    activeTransaction.value = data.transaction
    if (terminalTransaction(data.transaction?.status)) {
      if (transactionPoller) clearInterval(transactionPoller)
      transactionPoller = null
      running.value = false
      toast[data.transaction.status === 'completed' ? 'success' : data.transaction.status === 'partial' ? 'warning' : 'error'](
        data.transaction.status === 'completed'
          ? `已处理 ${data.transaction.processed_count || 0} 条记录`
          : `清理结束：成功 ${data.transaction.processed_count || 0} 条，失败 ${data.transaction.failed_count || 0} 条`,
      )
      await loadSummary()
      activeTransaction.value = null
      activeView.value = 'history'
    }
  } catch (err) {
    error.value = err?.message || '清理进度加载失败'
  }
}

const startTransactionPolling = (transactionId) => {
  if (transactionPoller) clearInterval(transactionPoller)
  running.value = true
  void pollTransaction(transactionId)
  transactionPoller = setInterval(() => void pollTransaction(transactionId), 1000)
}

const cancelTransaction = async () => {
  const id = activeTransaction.value?.transaction_id
  if (!id || terminalTransaction(activeTransaction.value?.status)) return
  const response = await fetch('/api/cleanup/cancel', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transaction_id: id }),
  })
  const data = await response.json()
  if (!response.ok || data.success === false) error.value = data.error || '取消清理失败'
  else activeTransaction.value = data.transaction
}

const scanStorage = async () => {
  loading.value = true
  try {
    const response = await fetch('/api/cleanup/storage-index/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '启动存储扫描失败')
    toast.info(data.reason === 'already_building' ? '存储扫描正在进行' : '已在后台开始存储扫描')
    setTimeout(() => void loadSummary(), 1000)
  } catch (err) {
    error.value = err?.message || '启动存储扫描失败'
  } finally {
    loading.value = false
  }
}

const previewAction = async (action) => {
  error.value = ''
  preview.value = null
  selectedIds.value = []
  confirmationText.value = ''
  try {
    const response = await fetch('/api/cleanup/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: action.id, retention_days: retentionDays.value }),
    })
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '生成清理预览失败')
    preview.value = data
    selectedIds.value = data.preview?.items?.map(item => item.id) || []
    if (!selectedIds.value.length) toast.info('当前保留范围内没有可处理的记录')
  } catch (err) {
    error.value = err?.message || '生成清理预览失败'
  }
}

const toggleSelected = (id) => {
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter(value => value !== id)
    : [...selectedIds.value, id]
}

const toggleAll = () => {
  const allIds = preview.value?.preview?.items?.map(item => item.id) || []
  selectedIds.value = selectedIds.value.length === allIds.length ? [] : allIds
}

const runAction = async () => {
  if (!preview.value?.action?.id || !selectedIds.value.length) return
  if (preview.value.action.irreversible && confirmationText.value.trim() !== '永久删除') return
  running.value = true
  error.value = ''
  try {
    const response = await fetch('/api/cleanup/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: preview.value.action.id,
        confirm: true,
        preview_token: preview.value.preview_token,
        selected_ids: selectedIds.value,
        confirmation_phrase: confirmationText.value.trim(),
      }),
    })
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '清理执行失败')
    if (!data.transaction_id) throw new Error('服务端未返回清理事务 ID')
    preview.value = null
    selectedIds.value = []
    confirmationText.value = ''
    activeTransaction.value = data.transaction
    startTransactionPolling(data.transaction_id)
  } catch (err) {
    error.value = err?.message || '清理执行失败'
  } finally {
    if (!activeTransaction.value?.transaction_id) running.value = false
  }
}

const closePreview = () => {
  preview.value = null
  selectedIds.value = []
  confirmationText.value = ''
}

const navigateSelected = () => {
  const target = navigationMap[selectedCardId.value]
  if (target?.tab) emit('navigate', target.tab)
}

onMounted(loadSummary)
onUnmounted(() => { if (transactionPoller) clearInterval(transactionPoller) })
</script>

<template>
  <div class="cleanup-page">
    <header class="cleanup-page-header">
      <div class="cleanup-page-title">
        <span class="cleanup-title-icon"><ShieldCheck :size="20" /></span>
        <div>
          <h1>清理中心</h1>
          <p>先预览，再精确处理；任务回放和测试证据会按同一条链路管理。</p>
        </div>
      </div>
      <div class="cleanup-header-actions">
        <span v-if="summary?.updated_at" class="cleanup-last-update">扫描于 {{ new Date(summary.updated_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}</span>
        <span class="cleanup-service-state">
          <CircleCheck :size="15" /> {{ summary?.storage?.index?.status === 'index_building' ? '存储索引构建中' : '已启用安全预览' }}
        </span>
        <button class="cleanup-icon-button" title="刷新清理摘要" :disabled="loading" @click="loadSummary">
          <RefreshCw :size="17" :class="{ spinning: loading }" />
        </button>
        <button class="cleanup-button" title="在后台重新扫描存储" :disabled="loading" @click="scanStorage">重新扫描</button>
      </div>
    </header>

    <div v-if="error" class="cleanup-alert cleanup-page-alert" role="alert">{{ error }}</div>

    <section v-if="activeTransaction" class="cleanup-alert cleanup-transaction-banner">
      <div>
        <strong>{{ activeTransaction.label }} · {{ activeTransaction.status }}</strong>
        <span>已完成 {{ activeTransaction.processed_count || 0 }} / {{ activeTransaction.requested_count || 0 }}，失败 {{ activeTransaction.failed_count || 0 }}</span>
      </div>
      <button v-if="!terminalTransaction(activeTransaction.status)" class="cleanup-button" @click="cancelTransaction">停止后续步骤</button>
    </section>

    <section v-if="summary" class="cleanup-summary-strip" aria-label="清理中心摘要">
      <div><Database :size="16" /><span><strong>{{ totalRecords.toLocaleString() }}</strong><small>条运行数据</small></span></div>
      <div><HardDrive :size="16" /><span><strong>{{ formatBytes(summary.storage?.total_bytes) }}</strong><small>已统计空间</small></span></div>
      <div><Archive :size="16" /><span><strong>{{ safeActions.length }}</strong><small>项可恢复整理</small></span></div>
      <div class="danger"><ShieldAlert :size="16" /><span><strong>{{ dangerActions.length }}</strong><small>项永久操作</small></span></div>
    </section>

    <div v-if="summary" class="cleanup-workspace">
      <nav class="cleanup-segmented" aria-label="清理中心视图">
        <div class="cleanup-nav-heading"><strong>数据治理</strong><small>选择要处理的范围</small></div>
        <button
          v-for="view in views"
          :key="view.id"
          :class="[{ active: activeView === view.id }, view.tone]"
          @click="activeView = view.id; closePreview()"
        >
          <span><component :is="view.icon" :size="16" /></span>
          <span><strong>{{ view.label }}</strong><small>{{ view.description }}</small></span>
        </button>
        <div class="cleanup-boundary-note"><Info :size="14" /><span>不会清理项目源码、知识库和用户上传资料。</span></div>
      </nav>

      <section class="cleanup-stage">
    <main v-if="summary" class="cleanup-content">
      <CleanupStorageOverview
        v-if="activeView === 'overview'"
        :cards="summary.cards"
        :total-bytes="summary.storage?.total_bytes || 0"
        :selected-id="selectedCardId"
        :selected-card="currentCard"
        :rows="currentRows"
        :navigation-label="navigationMap[selectedCardId]?.label || ''"
        @select="selectedCardId = $event"
        @navigate="navigateSelected"
      />

      <template v-else-if="activeView === 'safe' || activeView === 'danger'">
        <div class="cleanup-action-workspace" :class="{ 'has-preview': preview }">
          <div class="cleanup-action-column">
            <CleanupActionPanel
              :mode="activeView"
              :actions="activeView === 'safe' ? safeActions : dangerActions"
              :retention-days="retentionDays"
              :retention-options="summary.policy?.retention_options || [7, 30, 90, 0]"
              :loading="loading || running"
              @update:retention-days="retentionDays = $event; closePreview()"
              @preview="previewAction"
            />
          </div>
          <CleanupPreviewPanel
            v-if="preview"
            :preview="preview"
            :selected-ids="selectedIds"
            :confirmation-text="confirmationText"
            :running="running"
            @toggle="toggleSelected"
            @toggle-all="toggleAll"
            @update:confirmation-text="confirmationText = $event"
            @close="closePreview"
            @execute="runAction"
          />
        </div>
      </template>

      <CleanupHistory v-else :records="summary.history || []" />
    </main>

      </section>
    </div>

    <div v-else-if="loading" class="cleanup-loading">
      <RefreshCw :size="18" class="spinning" /> 正在扫描可整理数据
    </div>
  </div>
</template>
