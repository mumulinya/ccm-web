<script setup>
import { computed } from 'vue'
import { AlertTriangle, Bot, CheckCircle2, GitBranch, ShieldCheck, TestTube2 } from '@lucide/vue'

const props = defineProps({
  summary: { type: Object, default: () => ({}) },
  context: { type: Object, default: () => ({}) },
  branch: { type: String, default: '' },
  loading: { type: Boolean, default: false },
})
defineEmits(['open-replay'])

const latestTask = computed(() => props.context?.tasks?.[0] || null)
const testAgent = computed(() => props.context?.latestTestAgent || null)
const exactAttribution = computed(() => props.context?.attribution === 'exact')
const originLabel = computed(() => exactAttribution.value ? '任务来源' : latestTask.value ? '最近项目任务（未确认归因）' : '任务来源')
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
    <div class="metrics" aria-label="变更统计">
      <div><strong>{{ summary.total || 0 }}</strong><span>文件</span></div>
      <div class="addition"><strong>+{{ summary.additions || 0 }}</strong><span>新增</span></div>
      <div class="deletion"><strong>-{{ summary.deletions || 0 }}</strong><span>删除</span></div>
      <div><strong>{{ summary.staged || 0 }}</strong><span>已暂存</span></div>
      <div><strong>{{ summary.unstaged || 0 }}</strong><span>工作区</span></div>
      <div :class="{ danger: summary.conflicts }"><strong>{{ summary.conflicts || 0 }}</strong><span>冲突</span></div>
    </div>
    <div v-if="summary.total" class="summary-details">
      <div class="impact">
        <span class="detail-label">影响范围</span>
        <span>{{ summary.modules?.join('、') || '根目录' }}</span>
      </div>
      <div class="risk" :class="`risk-${summary.riskLevel || 'low'}`">
        <AlertTriangle v-if="summary.warnings?.length" :size="15" />
        <ShieldCheck v-else :size="15" />
        <span>{{ summary.warnings?.[0] || '未发现冲突、大文件或二进制风险' }}</span>
      </div>
    </div>
    <div v-if="summary.total" class="work-origin">
      <div class="origin-main">
        <Bot :size="16" />
        <div>
          <span class="detail-label">{{ originLabel }}</span>
          <strong>{{ latestTask?.title || '当前改动没有可验证的任务归因' }}</strong>
          <small v-if="latestTask">
            {{ latestTask.agent }} · {{ context.attribution === 'exact' ? '文件记录精确匹配' : '按项目匹配的最近任务' }}
          </small>
          <small v-else>手工改动或第三方工具尚未写入任务链记录</small>
        </div>
      </div>
      <div class="verification" :class="{ passed: /通过|已验收|已有/.test(verificationLabel) }">
        <TestTube2 v-if="testAgent && exactAttribution" :size="15" />
        <CheckCircle2 v-else :size="15" />
        <span>{{ verificationLabel }}</span>
      </div>
      <button v-if="latestTask?.taskId" class="text-button" @click="$emit('open-replay', latestTask)">查看任务回放</button>
    </div>
  </section>
</template>

<style scoped>
.change-summary { padding: 18px 20px 14px; border-bottom: 1px solid var(--border-color, rgba(15,23,42,.09)); background: color-mix(in srgb, var(--bg-primary, #fff) 92%, #f1f5f9); }
.summary-heading,.summary-details,.work-origin { display:flex; align-items:center; justify-content:space-between; gap:14px; }
.eyebrow,.detail-label { display:block; color:var(--text-muted); font-size:11px; font-weight:600; }
h3 { margin:3px 0 0; font-size:16px; line-height:1.3; color:var(--text-primary); letter-spacing:0; }
.branch { display:inline-flex; align-items:center; gap:6px; color:#2563eb; font-size:12px; font-family:ui-monospace,monospace; }
.metrics { display:grid; grid-template-columns:repeat(6,minmax(72px,1fr)); margin-top:14px; border:1px solid var(--border-color,rgba(15,23,42,.09)); border-radius:8px; overflow:hidden; }
.metrics div { min-width:0; padding:9px 12px; display:flex; align-items:baseline; gap:6px; border-right:1px solid var(--border-color,rgba(15,23,42,.09)); }
.metrics div:last-child { border-right:0; }.metrics strong { font-size:16px; color:var(--text-primary); }.metrics span { font-size:11px; color:var(--text-muted); }
.metrics .addition strong { color:#047857; }.metrics .deletion strong,.metrics .danger strong { color:#b91c1c; }
.summary-details { margin-top:11px; font-size:12px; color:var(--text-secondary); }.impact { min-width:0; }.impact span:last-child { display:block; margin-top:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.risk,.verification { display:flex; align-items:center; gap:6px; font-size:12px; }.risk-medium { color:#b45309; }.risk-high { color:#b91c1c; }.risk-low { color:#047857; }
.work-origin { margin-top:12px; padding-top:12px; border-top:1px solid var(--border-color,rgba(15,23,42,.08)); }
.origin-main { display:flex; align-items:flex-start; gap:9px; min-width:0; flex:1; }.origin-main div { min-width:0; }.origin-main strong,.origin-main small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.origin-main strong { margin-top:2px; font-size:12px; color:var(--text-primary); }.origin-main small { margin-top:2px; color:var(--text-muted); font-size:11px; }
.verification { color:#b45309; flex-shrink:0; }.verification.passed { color:#047857; }.text-button { border:0; background:transparent; color:#2563eb; padding:5px; cursor:pointer; font-size:12px; flex-shrink:0; }
@media(max-width:768px){.change-summary{padding:14px}.metrics{grid-template-columns:repeat(3,1fr)}.metrics div:nth-child(3){border-right:0}.metrics div:nth-child(-n+3){border-bottom:1px solid var(--border-color,rgba(15,23,42,.09))}.summary-details,.work-origin{align-items:flex-start;flex-direction:column}.verification{margin-left:25px}.text-button{margin-left:20px}.branch{max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
</style>
