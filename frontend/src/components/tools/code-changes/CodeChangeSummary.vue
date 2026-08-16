<script setup>
import { computed } from 'vue'
import { AlertTriangle, Bot, CheckCircle2, GitBranch, ListFilter, ShieldCheck, TestTube2, Trash2 } from '@lucide/vue'

const props = defineProps({
  summary: { type: Object, default: () => ({}) },
  context: { type: Object, default: () => ({}) },
  branch: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  residualCleanupBusy: { type: Boolean, default: false },
})
defineEmits(['open-replay', 'view-residuals', 'cleanup-residuals'])

const latestTask = computed(() => props.context?.tasks?.[0] || null)
const testAgent = computed(() => props.context?.latestTestAgent || null)
const exactAttribution = computed(() => props.context?.attribution === 'exact')
const originLabel = computed(() => exactAttribution.value ? '任务来源' : latestTask.value ? '历史任务关联（当前内容未核验）' : '任务来源')
const verificationLabel = computed(() => {
  const exactTestAgent = testAgent.value && (testAgent.value.association === 'exact' || exactAttribution.value && (!testAgent.value.taskId || testAgent.value.taskId === latestTask.value?.taskId))
  if (exactTestAgent) return /pass|accept|completed/i.test(testAgent.value.status + testAgent.value.recommendation) ? 'TestAgent 已通过' : 'TestAgent 需复检'
  if (exactAttribution.value && latestTask.value?.acceptancePassed) return '主 Agent 已验收'
  if (exactAttribution.value && latestTask.value?.verification?.length) return '已有验证记录'
  return '尚未关联验证'
})
</script>

<template>
  <section class="change-summary" aria-label="变更总览">
    <div class="summary-heading">
      <div>
        <span class="eyebrow">工作区变更</span>
        <h3>{{ loading ? '正在读取 Git 状态' : summary.total ? `${summary.total} 个文件等待处理` : '工作区没有未提交改动' }}</h3>
      </div>
      <span v-if="branch" class="branch"><GitBranch :size="14" />{{ branch }}</span>
    </div>

    <!-- 7 格现代化 KPI 微卡片 -->
    <div class="metrics" aria-label="变更统计">
      <div class="metric-item">
        <span class="metric-label">文件总数</span>
        <strong class="font-mono">{{ summary.total || 0 }}</strong>
      </div>
      <div class="metric-item addition">
        <span class="metric-label">新增行</span>
        <strong class="font-mono">+{{ summary.additions || 0 }}</strong>
      </div>
      <div class="metric-item deletion">
        <span class="metric-label">删除行</span>
        <strong class="font-mono">-{{ summary.deletions || 0 }}</strong>
      </div>
      <div class="metric-item">
        <span class="metric-label">已暂存</span>
        <strong class="font-mono">{{ summary.staged || 0 }}</strong>
      </div>
      <div class="metric-item">
        <span class="metric-label">工作区</span>
        <strong class="font-mono">{{ summary.unstaged || 0 }}</strong>
      </div>
      <div class="metric-item" :class="{ residue: summary.indexResidual }">
        <span class="metric-label">索引残留</span>
        <strong class="font-mono">{{ summary.indexResidual || 0 }}</strong>
      </div>
      <div class="metric-item" :class="{ danger: summary.conflicts }">
        <span class="metric-label">冲突</span>
        <strong class="font-mono">{{ summary.conflicts || 0 }}</strong>
      </div>
    </div>

    <div v-if="summary.indexResidual" class="index-residual-notice">
      <div>
        <AlertTriangle :size="15" />
        <span><strong>{{ summary.indexResidual }} 个索引残留</strong>已从正常变更中分离，不会混入主变更数量。</span>
      </div>
      <div class="residual-actions">
        <button type="button" @click="$emit('view-residuals')"><ListFilter :size="13" />查看</button>
        <button type="button" class="cleanup-button" :disabled="residualCleanupBusy" @click="$emit('cleanup-residuals')"><Trash2 :size="13" />{{ residualCleanupBusy ? '清理中' : '清理残留' }}</button>
      </div>
    </div>

    <div v-if="summary.total" class="summary-details">
      <div class="impact">
        <span class="detail-label">影响范围</span>
        <span>{{ summary.modules?.join('、') || '根目录' }}</span>
      </div>
      <div class="risk" :class="`risk-${summary.riskLevel || 'low'}`">
        <AlertTriangle v-if="summary.warnings?.length" :size="14" />
        <ShieldCheck v-else :size="14" />
        <span>{{ summary.warnings?.[0] || '未发现冲突、大文件或二进制风险' }}</span>
      </div>
    </div>

    <div v-if="summary.total" class="work-origin">
      <div class="origin-main">
        <span class="origin-icon"><Bot :size="16" /></span>
        <div>
          <span class="detail-label">{{ originLabel }}</span>
          <strong>{{ latestTask?.title || '当前改动没有可验证的任务归因' }}</strong>
          <small v-if="latestTask">
            {{ latestTask.agent }} · {{ context.attribution === 'exact' ? 'HEAD与文件内容证据一致' : latestTask.matchingFiles?.length ? '仅文件路径曾出现，不能证明当前改动已验收' : '按项目匹配的最近任务' }}
          </small>
          <small v-else>手工改动或第三方工具尚未写入任务链记录</small>
        </div>
      </div>
      <div class="verification" :class="{ passed: /通过|已验收|已有/.test(verificationLabel) }">
        <TestTube2 v-if="testAgent && exactAttribution" :size="14" />
        <CheckCircle2 v-else :size="14" />
        <span>{{ verificationLabel }}</span>
      </div>
      <button v-if="latestTask?.taskId" class="text-button" @click="$emit('open-replay', latestTask)">查看任务回放</button>
    </div>
  </section>
</template>

<style scoped>
.font-mono {
  font-family: var(--font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

.change-summary {
  padding: 14px 18px 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--surface, var(--bg-card));
}

.summary-heading, .summary-details, .work-origin {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.eyebrow, .detail-label {
  display: block;
  color: var(--accent-blue);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

h3 {
  margin: 2px 0 0;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--text-primary);
  letter-spacing: 0;
}

.branch {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent-blue);
  font-size: 11px;
  font-weight: 600;
  font-family: var(--font-mono, monospace);
}

/* 7 格 KPI 微卡片 */
.metrics {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
  margin-top: 10px;
}

.metric-item {
  min-width: 0;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-sm);
}

.metric-label {
  font-size: 10px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-item strong {
  margin-top: 2px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.1;
}

.metric-item.addition strong { color: var(--accent-green, #10b981); }
.metric-item.deletion strong, .metric-item.danger strong { color: var(--accent-red, #ef4444); }
.metric-item.residue strong { color: #d97706; }

.index-residual-notice {
  margin-top: 8px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: 1px solid color-mix(in srgb, #d97706 34%, var(--border-color));
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.08);
  color: #d97706;
}

.index-residual-notice > div:first-child {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}

.index-residual-notice strong { color: var(--text-primary); }

.residual-actions { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
.residual-actions button {
  height: 26px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  background: var(--surface);
  color: var(--text-secondary);
  font-size: 10.5px;
  font-weight: 600;
  cursor: pointer;
}

.residual-actions button:disabled { opacity: 0.5; cursor: not-allowed; }
.residual-actions .cleanup-button {
  border-color: color-mix(in srgb, #d97706 38%, var(--border-color));
  color: #d97706;
}

.summary-details {
  margin-top: 10px;
  font-size: 11.5px;
  color: var(--text-secondary);
}

.impact { min-width: 0; }
.impact span:last-child {
  display: block;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.risk, .verification {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 600;
}

.risk-medium { color: #d97706; }
.risk-high { color: var(--accent-red, #ef4444); }
.risk-low { color: var(--accent-green, #10b981); }

.work-origin {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
}

.origin-main {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  flex: 1;
}

.origin-icon {
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: var(--accent-soft);
  color: var(--accent-blue);
}

.origin-main div { min-width: 0; }
.origin-main strong, .origin-main small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.origin-main strong { margin-top: 1px; font-size: 12px; font-weight: 600; color: var(--text-primary); }
.origin-main small { margin-top: 1px; color: var(--text-muted); font-size: 10.5px; }

.verification { color: #d97706; flex-shrink: 0; }
.verification.passed { color: var(--accent-green, #10b981); }

.text-button {
  border: 0;
  background: transparent;
  color: var(--accent-blue);
  padding: 4px;
  cursor: pointer;
  font-size: 11.5px;
  font-weight: 600;
  flex-shrink: 0;
}

.text-button:hover { text-decoration: underline; }

@media (max-width: 768px) {
  .change-summary { padding: 12px; }
  .metrics { grid-template-columns: repeat(2, 1fr); }
  .metrics .metric-item:last-child { grid-column: 1 / -1; }
  .index-residual-notice { align-items: flex-start; flex-direction: column; }
  .residual-actions { width: 100%; }
  .residual-actions button { flex: 1; justify-content: center; }
  .summary-details, .work-origin { align-items: flex-start; flex-direction: column; }
}
</style>
