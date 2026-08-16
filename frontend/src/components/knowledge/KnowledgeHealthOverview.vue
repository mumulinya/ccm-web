<script setup>
import { computed } from 'vue'
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Cpu,
  FileText,
  FolderGit2,
  Layers,
  RefreshCw,
  Settings,
  Sparkles,
} from '@lucide/vue'

const props = defineProps({
  status: { type: Object, default: () => ({}) },
  embedding: { type: Object, default: () => ({}) },
  documentCount: { type: Number, default: 0 },
  watchCount: { type: Number, default: 0 },
  rebuilding: { type: Boolean, default: false },
})

const emit = defineEmits(['rebuild', 'open-settings'])

const semanticReady = computed(() => Number(props.status?.semanticReady || 0) > 0)
const retrievalLabel = computed(() => {
  if (semanticReady.value && Number(props.status?.remoteVectors || 0) > 0) return `外部语义 + 词面混合 (${props.embedding?.model || 'Embedding'})`
  if (semanticReady.value && Number(props.status?.localVectors || 0) > 0) return '本地多语言语义 + 词面混合'
  if (props.status?.localModel?.state === 'downloading') return '本地模型准备中，当前使用词面检索'
  return '本地词面检索 (无语义向量)'
})
const healthTone = computed(() => props.status?.state === 'failed' ? 'danger' : props.status?.parseFailures?.length ? 'warning' : 'ready')
const healthTitle = computed(() => {
  if (props.status?.state === 'building') return '正在整理知识索引'
  if (props.status?.state === 'failed') return '知识索引需要处理'
  if (!props.documentCount) return '知识库等待导入资料'
  return '知识库就绪可用'
})

const formatTime = (value) => {
  if (!value) return '尚未完成'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}
</script>

<template>
  <section class="knowledge-health-overview">
    <!-- 主标题栏 -->
    <div class="overview-header">
      <div class="title-block">
        <div class="product-icon-wrap">
          <BookOpen :size="20" />
        </div>
        <div class="title-copy">
          <div class="title-row">
            <h1>知识库与文档</h1>
            <span class="status-pill" :class="healthTone">
              <span class="status-dot"></span>
              {{ healthTitle }}
            </span>
          </div>
          <p>集中管理业务资料，让全局 Agent、群聊主 Agent 和项目工作流按权限范围检索可信来源。</p>
        </div>
      </div>

      <div class="overview-actions">
        <button class="settings-btn" type="button" title="知识库与模型设置" @click="emit('open-settings')">
          <Settings :size="15" />
          <span>设置</span>
        </button>
        <button
          class="primary-rebuild-btn"
          type="button"
          :disabled="rebuilding || status?.state === 'building'"
          @click="emit('rebuild')"
        >
          <RefreshCw :size="14" :class="{ spinning: rebuilding || status?.state === 'building' }" />
          <span>{{ rebuilding || status?.state === 'building' ? '正在更新' : '更新索引' }}</span>
        </button>
      </div>
    </div>

    <!-- 核心指标卡片条 -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-icon-wrap blue">
          <FileText :size="16" />
        </div>
        <div class="metric-body">
          <span class="metric-label">归档文档</span>
          <strong class="metric-value font-mono">{{ documentCount }}</strong>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon-wrap purple">
          <Layers :size="16" />
        </div>
        <div class="metric-body">
          <span class="metric-label">知识分片</span>
          <strong class="metric-value font-mono">{{ status?.chunks || 0 }}</strong>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon-wrap orange">
          <FolderGit2 :size="16" />
        </div>
        <div class="metric-body">
          <span class="metric-label">同步目录</span>
          <strong class="metric-value font-mono">{{ watchCount }}</strong>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-icon-wrap green">
          <Sparkles :size="16" />
        </div>
        <div class="metric-body">
          <span class="metric-label">语义检索引擎</span>
          <strong class="metric-value" :class="{ 'text-ok': semanticReady }">
            {{ semanticReady ? '已启用语义' : '词面模式' }}
          </strong>
        </div>
      </div>
    </div>

    <!-- 技术详情折叠面板 -->
    <details class="technical-details-box">
      <summary class="details-summary">
        <span>技术详情与向量状态</span>
      </summary>
      <dl class="details-dl">
        <div><dt>索引状态</dt><dd>{{ status?.state || 'idle' }}</dd></div>
        <div><dt>最后完成</dt><dd class="font-mono">{{ formatTime(status?.lastSuccessfulAt) }}</dd></div>
        <div><dt>缓存命中</dt><dd>{{ status?.cacheHits || 0 }} 份</dd></div>
        <div><dt>检索引擎</dt><dd>{{ retrievalLabel }}</dd></div>
        <div><dt>语义向量</dt><dd class="font-mono">{{ status?.semanticReady || 0 }} 成功 / {{ status?.semanticFailed || 0 }} 失败 / {{ status?.semanticPending || 0 }} 等待</dd></div>
        <div><dt>索引代次</dt><dd class="font-mono">{{ status?.activeGeneration || '尚未生成' }}</dd></div>
        <div><dt>降级原因</dt><dd>{{ status?.fallbackReason || '无' }}</dd></div>
        <div><dt>解析失败</dt><dd :class="{ 'text-danger': status?.parseFailures?.length }">{{ status?.parseFailures?.length || 0 }} 份</dd></div>
      </dl>
      <div v-if="status?.parseFailures?.length" class="failure-list">
        <div v-for="item in status.parseFailures" :key="item.filename" class="failure-item">
          <strong>{{ item.filename }}</strong>
          <span>{{ item.error }}</span>
        </div>
      </div>
    </details>
  </section>
</template>

<style scoped>
.knowledge-health-overview {
  border-bottom: 1px solid var(--border-color);
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-sm);
}

.font-mono {
  font-family: var(--font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

.text-ok { color: var(--accent-green, #10b981) !important; }
.text-danger { color: var(--accent-red, #ef4444) !important; }

/* 头部 */
.overview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 18px 24px 14px;
}

.title-block {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.product-icon-wrap {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--accent-blue, #2563eb), #7c3aed);
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
}

.title-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-row h1 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-pill.ready {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}
.status-pill.ready .status-dot { background: #10b981; }

.status-pill.warning {
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
}
.status-pill.warning .status-dot { background: #f59e0b; }

.status-pill.danger {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}
.status-pill.danger .status-dot { background: #ef4444; }

.title-copy p {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.overview-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.settings-btn,
.primary-rebuild-btn {
  height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border-radius: var(--radius-md, 6px);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.settings-btn {
  border: 1px solid var(--border-color);
  background: var(--control-bg, var(--bg-primary));
  color: var(--text-primary);
}

.settings-btn:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.primary-rebuild-btn {
  border: 0;
  background: var(--accent-blue, #2563eb);
  color: #fff;
}

.primary-rebuild-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.primary-rebuild-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.spinning {
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 4 格指标卡片条 */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 10px 24px 14px;
  background: var(--bg-primary);
  border-top: 1px solid var(--border-color);
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-sm);
}

.metric-icon-wrap {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  flex-shrink: 0;
}

.metric-icon-wrap.blue { background: rgba(37, 99, 235, 0.1); color: var(--accent-blue); }
.metric-icon-wrap.purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.metric-icon-wrap.orange { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.metric-icon-wrap.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }

.metric-body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.metric-label {
  font-size: 11px;
  color: var(--text-muted);
}

.metric-value {
  font-size: 15px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 技术详情折叠面板 */
.technical-details-box {
  padding: 0 24px;
  background: var(--bg-primary);
  border-top: 1px solid var(--border-color);
}

.details-summary {
  padding: 8px 0;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s ease;
}

.details-summary:hover {
  color: var(--accent-blue);
}

.details-dl {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px 16px;
  margin: 0;
  padding: 6px 0 14px;
}

.details-dl div {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 11px;
}

dt { color: var(--text-muted); }
dd { margin: 0; color: var(--text-primary); font-weight: 600; text-align: right; word-break: break-word; }

.failure-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 12px;
}

.failure-item {
  display: grid;
  grid-template-columns: minmax(140px, 0.3fr) 1fr;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 6px;
  border-left: 3px solid #ef4444;
  background: rgba(239, 68, 68, 0.06);
  font-size: 11px;
}

.failure-item strong { color: var(--text-primary); }
.failure-item span { color: #dc2626; }

@media (max-width: 900px) {
  .metrics-grid { grid-template-columns: repeat(2, 1fr); }
  .details-dl { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 600px) {
  .overview-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 14px 16px;
    gap: 12px;
  }
  .title-row { flex-wrap: wrap; }
  .metrics-grid {
    grid-template-columns: 1fr;
    padding: 10px 16px;
  }
  .details-dl { grid-template-columns: 1fr; }
  .technical-details-box { padding: 0 16px; }
}
</style>
