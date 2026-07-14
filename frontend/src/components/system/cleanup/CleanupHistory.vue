<script setup>
import { AlertCircle, CheckCircle2, History } from '@lucide/vue'

defineProps({ records: { type: Array, default: () => [] } })

const formatBytes = (value) => {
  const bytes = Number(value || 0)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const formatDate = (value) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false })
}

const statusLabel = (status) => ({ success: '已完成', partial: '部分完成', failed: '失败' }[status] || status)
const cleanupLabel = (key) => ({
  sessions: '子 Agent 会话', executions: '执行记录', checkpoints: '执行检查点', outputs: '执行输出',
  test_agent_artifacts: 'TestAgent 证据', test_agent_runs: 'TestAgent 运行记录', replay_journal: '任务回放日志',
}[key] || key)
</script>

<template>
  <section class="cleanup-panel-heading">
    <div class="cleanup-heading-with-icon">
      <History :size="19" />
      <div>
        <h2>清理记录</h2>
        <p>每次执行都会保存处理范围、结果和释放空间，便于之后核对。</p>
      </div>
    </div>
  </section>

  <section v-if="records.length" class="cleanup-history-list">
    <article v-for="record in records" :key="record.id" class="cleanup-history-row">
      <span class="cleanup-history-status" :class="record.status">
        <CheckCircle2 v-if="record.status === 'success'" :size="17" />
        <AlertCircle v-else :size="17" />
      </span>
      <div class="cleanup-history-copy">
        <div>
          <h3>{{ record.label }}</h3>
          <span>{{ statusLabel(record.status) }}</span>
        </div>
        <p>处理 {{ record.processed_count || 0 }} 项<span v-if="record.failed_count">，失败 {{ record.failed_count }} 项</span>，释放 {{ formatBytes(record.released_bytes) }}</p>
        <small>{{ formatDate(record.completed_at) }} · {{ record.retention_days === 0 ? '全部归档数据' : `${record.retention_days} 天前的数据` }}</small>
        <details v-if="record.cleanup && Object.keys(record.cleanup).length" class="cleanup-technical-details">
          <summary>技术详情</summary>
          <div>
            <span v-for="(value, key) in record.cleanup" :key="key">{{ cleanupLabel(key) }}：{{ value }}</span>
          </div>
        </details>
      </div>
    </article>
  </section>
  <div v-else class="cleanup-empty cleanup-history-empty">还没有执行过清理操作</div>
</template>
