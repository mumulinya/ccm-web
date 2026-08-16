<script setup>
import { AlertCircle, CheckCircle2, ChevronRight, History } from '@lucide/vue'

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
  <div class="cleanup-history-root">
    <section class="cleanup-panel-heading">
      <div class="cleanup-heading-with-icon">
        <span class="head-icon"><History :size="18" /></span>
        <div>
          <h2>清理审计记录</h2>
          <p>每次执行均保存处理范围、结果、状态与释放磁盘空间，便于回溯核对。</p>
        </div>
      </div>
      <span class="cleanup-history-count font-mono">{{ records.length }} 条审计记录</span>
    </section>

    <section v-if="records.length" class="cleanup-history-list">
      <article v-for="record in records" :key="record.id" class="cleanup-history-row">
        <span class="cleanup-history-status" :class="record.status">
          <CheckCircle2 v-if="record.status === 'success'" :size="16" />
          <AlertCircle v-else :size="16" />
        </span>
        <div class="cleanup-history-copy">
          <div class="copy-top-row">
            <h3>{{ record.label }}</h3>
            <span class="status-pill" :class="record.status">{{ statusLabel(record.status) }}</span>
          </div>
          <p class="history-stats">
            处理 <strong class="font-mono">{{ record.processed_count || 0 }}</strong> 项
            <span v-if="record.failed_count">，失败 <strong class="font-mono text-danger">{{ record.failed_count }}</strong> 项</span>
            ，释放 <strong class="font-mono text-success">{{ formatBytes(record.released_bytes) }}</strong>
          </p>
          <small class="font-mono text-muted">
            {{ formatDate(record.completed_at) }} · {{ record.retention_days === 0 ? '全部归档数据' : `保留最近 ${record.retention_days} 天` }}
          </small>
          <details v-if="record.cleanup && Object.keys(record.cleanup).length" class="cleanup-technical-details">
            <summary>技术详情</summary>
            <div class="tech-grid font-mono">
              <span v-for="(value, key) in record.cleanup" :key="key">{{ cleanupLabel(key) }}：{{ value }}</span>
            </div>
          </details>
        </div>
      </article>
    </section>
    <div v-else class="cleanup-empty cleanup-history-empty">暂无清理操作记录</div>
  </div>
</template>

<style scoped>
.font-mono {
  font-family: var(--font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

.text-danger { color: var(--accent-red, #ef4444); }
.text-success { color: var(--accent-green, #10b981); }
.text-muted { color: var(--text-muted); }

.copy-top-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-pill {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10.5px;
  font-weight: 600;
}
.status-pill.success { background: rgba(16, 185, 129, 0.1); color: var(--accent-green, #10b981); }
.status-pill.partial,
.status-pill.failed { background: rgba(239, 68, 68, 0.1); color: var(--accent-red, #ef4444); }

.history-stats {
  margin: 3px 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.tech-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin-top: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--surface-raised, var(--panel-muted));
  color: var(--text-secondary);
  font-size: 11px;
}
</style>
