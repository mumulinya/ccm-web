<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: { type: Object, default: () => ({}) },
  embedding: { type: Object, default: () => ({}) },
  documentCount: { type: Number, default: 0 },
  watchCount: { type: Number, default: 0 },
  rebuilding: { type: Boolean, default: false }
})

const emit = defineEmits(['rebuild', 'open-settings'])

const semanticReady = computed(() => props.embedding?.enabled && props.embedding?.hasKey && props.embedding?.model)
const healthTone = computed(() => props.status?.state === 'failed' ? 'danger' : props.status?.parseFailures?.length ? 'warning' : 'ready')
const healthTitle = computed(() => {
  if (props.status?.state === 'building') return '正在整理知识资料'
  if (props.status?.state === 'failed') return '知识索引需要处理'
  if (!props.documentCount) return '知识库等待导入资料'
  return '知识资料可以使用'
})

const formatTime = value => {
  if (!value) return '尚未完成'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false })
}
</script>

<template>
  <section class="overview">
    <div class="overview-main">
      <div class="title-block">
        <div class="product-mark">KB</div>
        <div>
          <h1>知识库与文档</h1>
          <p>集中管理业务资料，让全局 Agent、群聊主 Agent 和项目工作流按范围检索可信来源。</p>
        </div>
      </div>
      <div class="overview-actions">
        <button class="icon-button" type="button" title="知识库设置" @click="emit('open-settings')">⚙</button>
        <button class="primary-button" type="button" :disabled="rebuilding || status?.state === 'building'" @click="emit('rebuild')">
          <span class="refresh-icon" :class="{ spinning: rebuilding || status?.state === 'building' }">↻</span>
          {{ rebuilding || status?.state === 'building' ? '正在更新' : '更新索引' }}
        </button>
      </div>
    </div>

    <div class="status-strip">
      <div class="health-copy" :data-tone="healthTone">
        <span class="health-dot"></span>
        <div>
          <strong>{{ healthTitle }}</strong>
          <span v-if="status?.state === 'building'">已处理 {{ status.processedDocuments || 0 }}/{{ status.totalDocuments || 0 }} 份文档</span>
          <span v-else-if="status?.state === 'failed'">{{ status.error || '索引更新失败，请查看技术详情' }}</span>
          <span v-else-if="!semanticReady">当前使用本地混合检索；配置向量模型后可提升语义匹配</span>
          <span v-else>语义检索已启用，回答会附带可追溯来源</span>
        </div>
      </div>

      <div class="metrics" aria-label="知识库状态概览">
        <div class="metric"><strong>{{ documentCount }}</strong><span>文档</span></div>
        <div class="metric"><strong>{{ status?.chunks || 0 }}</strong><span>知识分片</span></div>
        <div class="metric"><strong>{{ watchCount }}</strong><span>同步目录</span></div>
        <div class="metric"><strong>{{ semanticReady ? '已启用' : '本地模式' }}</strong><span>语义检索</span></div>
      </div>
    </div>

    <details class="technical-details">
      <summary>技术详情</summary>
      <dl>
        <div><dt>索引状态</dt><dd>{{ status?.state || 'idle' }}</dd></div>
        <div><dt>最后完成</dt><dd>{{ formatTime(status?.lastSuccessfulAt) }}</dd></div>
        <div><dt>缓存命中</dt><dd>{{ status?.cacheHits || 0 }} 份</dd></div>
        <div><dt>向量模型</dt><dd>{{ semanticReady ? embedding.model : '未启用，使用 hashing 回退' }}</dd></div>
        <div><dt>语义向量</dt><dd>{{ status?.semanticReady || 0 }} 成功 / {{ status?.semanticFailed || 0 }} 失败</dd></div>
        <div><dt>解析失败</dt><dd>{{ status?.parseFailures?.length || 0 }} 份</dd></div>
      </dl>
      <div v-if="status?.parseFailures?.length" class="failure-list">
        <div v-for="item in status.parseFailures" :key="item.filename">
          <strong>{{ item.filename }}</strong><span>{{ item.error }}</span>
        </div>
      </div>
    </details>
  </section>
</template>

<style scoped>
.overview { border-bottom: 1px solid var(--border-color, #e2e8f0); background: var(--surface, #fff); }
.overview-main { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 22px 24px 18px; }
.title-block { display: flex; align-items: center; gap: 14px; min-width: 0; }
.product-mark { width: 42px; height: 42px; flex: 0 0 42px; display: grid; place-items: center; border-radius: 8px; background: #172554; color: #fff; font-size: 13px; font-weight: 800; }
h1 { margin: 0; color: var(--text-primary, #0f172a); font-size: 20px; letter-spacing: 0; }
p { margin: 5px 0 0; color: var(--text-secondary, #64748b); font-size: 13px; line-height: 1.5; }
.overview-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
button { font: inherit; }
.icon-button, .primary-button { height: 36px; border-radius: 7px; cursor: pointer; }
.icon-button { width: 36px; border: 1px solid var(--border-color, #dbe2ea); background: var(--surface, #fff); color: var(--text-primary, #334155); font-size: 16px; }
.primary-button { display: inline-flex; align-items: center; gap: 7px; padding: 0 14px; border: 1px solid #1d4ed8; background: #1d4ed8; color: #fff; font-size: 13px; font-weight: 600; }
.primary-button:disabled { opacity: .6; cursor: wait; }
.refresh-icon { font-size: 17px; line-height: 1; }
.spinning { animation: spin .9s linear infinite; }
.status-strip { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 12px 24px; background: var(--bg-primary, #f8fafc); border-top: 1px solid var(--border-color, #eef2f7); }
.health-copy { display: flex; align-items: flex-start; gap: 9px; min-width: 240px; }
.health-dot { width: 8px; height: 8px; margin-top: 5px; border-radius: 50%; background: #16a34a; box-shadow: 0 0 0 3px rgba(22,163,74,.12); }
.health-copy[data-tone="warning"] .health-dot { background: #d97706; box-shadow: 0 0 0 3px rgba(217,119,6,.12); }
.health-copy[data-tone="danger"] .health-dot { background: #dc2626; box-shadow: 0 0 0 3px rgba(220,38,38,.12); }
.health-copy div { display: flex; flex-direction: column; gap: 2px; }
.health-copy strong { color: var(--text-primary, #0f172a); font-size: 13px; }
.health-copy span { color: var(--text-secondary, #64748b); font-size: 11.5px; }
.metrics { display: grid; grid-template-columns: repeat(4, minmax(82px, 1fr)); gap: 2px; }
.metric { display: flex; flex-direction: column; min-width: 82px; padding: 0 12px; border-left: 1px solid var(--border-color, #e2e8f0); }
.metric strong { color: var(--text-primary, #0f172a); font-size: 13px; white-space: nowrap; }
.metric span { margin-top: 2px; color: var(--text-secondary, #64748b); font-size: 10.5px; }
.technical-details { padding: 0 24px; background: var(--bg-primary, #f8fafc); border-top: 1px solid var(--border-color, #eef2f7); }
.technical-details summary { padding: 9px 0 11px; color: var(--text-secondary, #64748b); font-size: 11.5px; cursor: pointer; }
.technical-details dl { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 20px; margin: 0; padding: 0 0 14px; }
.technical-details dl div { display: flex; justify-content: space-between; gap: 10px; font-size: 11px; }
dt { color: var(--text-secondary, #64748b); } dd { margin: 0; color: var(--text-primary, #334155); text-align: right; word-break: break-word; }
.failure-list { padding: 0 0 14px; display: grid; gap: 6px; }
.failure-list div { display: grid; grid-template-columns: minmax(140px, .4fr) 1fr; gap: 12px; padding: 8px 10px; border-left: 3px solid #dc2626; background: rgba(220,38,38,.05); font-size: 11px; }
.failure-list span { color: var(--text-secondary, #64748b); }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 860px) { .status-strip { align-items: flex-start; flex-direction: column; } .metrics { width: 100%; } }
@media (max-width: 600px) { .overview-main { align-items: flex-start; padding: 16px; } .title-block { align-items: flex-start; } .product-mark { width: 36px; height: 36px; flex-basis: 36px; } h1 { font-size: 17px; } .title-block p { font-size: 12px; } .primary-button { padding: 0 10px; } .status-strip { padding: 12px 16px; } .metrics { grid-template-columns: repeat(2, 1fr); row-gap: 12px; } .metric:nth-child(3) { border-left: none; } .technical-details { padding: 0 16px; } .technical-details dl { grid-template-columns: 1fr; } }
:global([data-theme='dark']) .product-mark { background: #e2e8f0; color: #0f172a; }
</style>
