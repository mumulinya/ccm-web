<script setup>
import { ArrowUpRight, Database, FileCheck2, FolderClock, HardDrive, MessageSquare, TimerReset } from '@lucide/vue'

const props = defineProps({
  cards: { type: Array, default: () => [] },
  totalBytes: { type: Number, default: 0 },
  selectedId: { type: String, default: '' },
  selectedCard: { type: Object, default: null },
  rows: { type: Array, default: () => [] },
  navigationLabel: { type: String, default: '' },
})

defineEmits(['select', 'navigate'])

const icons = {
  tasks: FolderClock,
  cron: TimerReset,
  project_runs: Database,
  conversations: MessageSquare,
  execution_artifacts: HardDrive,
  quality_evidence: FileCheck2,
}

const formatBytes = (value) => {
  const bytes = Number(value || 0)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes >= 10240 ? 0 : 1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false })
}

const statusLabel = (value) => ({
  done: '已完成', failed: '失败', pending: '等待开始', running: '进行中', archived: '已归档',
  disabled: '已停用', enabled: '已启用', completed: '已完成', cancelled: '已取消',
}[value] || value || '-')

const storageShare = (bytes) => props.totalBytes > 0 ? Math.max(1, Math.min(100, Math.round(Number(bytes || 0) / props.totalBytes * 100))) : 0
</script>

<template>
  <section class="cleanup-panel-heading">
    <div>
      <h2>当前存储概览</h2>
      <p>这里统计与任务执行和回放直接相关的数据，不会触碰知识库、项目源码或上传资料。</p>
    </div>
    <span class="cleanup-total-size">已统计 {{ formatBytes(totalBytes) }}</span>
  </section>

  <section class="cleanup-storage-grid">
    <button
      v-for="card in cards"
      :key="card.id"
      class="cleanup-storage-tile"
      :class="{ active: selectedId === card.id }"
      :style="{ '--storage-share': `${storageShare(card.bytes)}%` }"
      @click="$emit('select', card.id)"
    >
      <span class="cleanup-storage-icon"><component :is="icons[card.id] || HardDrive" :size="17" /></span>
      <span class="cleanup-storage-copy">
        <span class="cleanup-storage-label">{{ card.title }}</span>
        <strong>{{ Number(card.count || 0).toLocaleString() }}</strong>
        <small>{{ card.detail }}</small>
        <span class="cleanup-storage-foot"><span>{{ formatBytes(card.bytes) }}</span><span>{{ storageShare(card.bytes) }}%</span></span>
        <span class="cleanup-storage-meter" aria-hidden="true"><i></i></span>
      </span>
    </button>
  </section>

  <section class="cleanup-data-section">
    <div class="cleanup-section-head">
      <div class="cleanup-detail-title">
        <span class="cleanup-storage-icon"><component :is="icons[selectedCard?.id] || HardDrive" :size="16" /></span>
        <div>
        <h3>{{ selectedCard?.title || '数据明细' }}</h3>
        <p>最多显示最近 200 条，永久删除时仍会再次生成精确清单。</p>
        </div>
      </div>
      <button v-if="navigationLabel" class="cleanup-button" @click="$emit('navigate')">
        {{ navigationLabel }} <ArrowUpRight :size="14" />
      </button>
    </div>

    <div v-if="rows.length" class="cleanup-table-wrap">
      <table class="cleanup-table">
        <thead>
          <tr>
            <th>名称</th>
            <th>类型或项目</th>
            <th>状态或数量</th>
            <th>占用空间</th>
            <th>更新时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id || row.title">
            <td><span class="cleanup-cell-title" :title="row.title || row.id">{{ row.title || row.id }}</span></td>
            <td>{{ row.type || row.project || '-' }}</td>
            <td>{{ row.count !== undefined ? Number(row.count).toLocaleString() : statusLabel(row.status) }}</td>
            <td>{{ row.bytes !== undefined ? formatBytes(row.bytes) : '-' }}</td>
            <td>{{ formatDate(row.updated_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="cleanup-empty">当前分类没有可显示的数据</div>
  </section>
</template>
