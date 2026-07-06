<script setup>
import { computed } from 'vue'
import {
  compactStatusText,
  mainDecisionActionSummary,
  mainDecisionModeLabel,
  mainDecisionNextStep,
  mainDecisionPlanSummary,
  mainDecisionTone,
} from '../../composables/useMainAgentDisplay.js'

const props = defineProps({
  status: { type: Object, default: null },
  groupAgentQa: { type: Array, default: () => [] },
  latestDecision: { type: Object, default: null },
})

const emit = defineEmits(['open-pipeline', 'locate-decision'])

const openQaCount = computed(() => {
  const statusCount = Number(props.status?.open_qa_count || 0)
  if (statusCount) return statusCount
  return props.groupAgentQa.filter(q => ['waiting', 'asking', 'queued', 'needs_user', 'timeout', 'manual'].includes(q.status)).length
})
const runningAgents = computed(() => {
  const agents = props.status?.running_child_agents || []
  return agents.length ? agents.join('、') : '无'
})
const blockerText = computed(() => {
  return [...(props.status?.blockers || []), ...(props.status?.needs || [])]
    .slice(0, 3)
    .map(x => compactStatusText(x))
    .join('；')
})
const sessionContinuityText = computed(() => {
  return props.status?.latest_delivery_summary?.session_continuity
    ?.slice(0, 3)
    .map(s => `${s.project}:${s.executor}/${s.resume_mode}#${s.turn_count}`)
    .join('；') || ''
})
</script>

<template>
  <div class="main-agent-status-card">
    <div class="main-agent-status-head">
      <div>
        <span class="main-agent-status-title" title="群聊主 Agent 只负责当前群聊内的计划、派发、回执验收和交付报告；规则兜底协调器是本地运行时，不是新的群成员。">主 Agent 状态</span>
        <span class="main-agent-phase">{{ status?.label || '空闲' }}</span>
      </div>
      <button v-if="status?.latest_delivery_summary" class="btn btn-outline btn-xs" @click="emit('open-pipeline')">协作看板</button>
    </div>
    <div class="main-agent-status-grid">
      <div v-if="latestDecision" class="main-agent-status-item latest-decision" :class="mainDecisionTone(latestDecision)">
        <span class="item-label">最近决策</span>
        <span class="item-value">
          {{ mainDecisionModeLabel(latestDecision.mode) }} · {{ mainDecisionActionSummary(latestDecision) }}
        </span>
        <small>{{ mainDecisionNextStep(latestDecision) }}</small>
        <small v-if="mainDecisionPlanSummary(latestDecision)" class="decision-plan-preview">{{ mainDecisionPlanSummary(latestDecision) }}</small>
        <button class="btn btn-outline btn-xs" @click="emit('locate-decision')">定位到消息</button>
      </div>
      <div class="main-agent-status-item">
        <span class="item-label">执行中</span>
        <span class="item-value">{{ runningAgents }}</span>
      </div>
      <div class="main-agent-status-item">
        <span class="item-label">开放问答</span>
        <span class="item-value">{{ openQaCount }} 个</span>
      </div>
      <div class="main-agent-status-item" v-if="status?.latest_delivery_summary">
        <span class="item-label">交付进度</span>
        <span class="item-value">{{ status.latest_delivery_summary.actual_file_change_count || 0 }} 个文件 · {{ status.latest_delivery_summary.external_runner_verification_count || 0 }} 项验证</span>
      </div>
      <details class="main-agent-technical-detail">
        <summary>技术详情</summary>
        <div class="main-agent-status-item" v-if="status?.latest_delivery_summary?.lifecycle">
          <span class="item-label">任务阶段</span>
          <span class="item-value">{{ status.latest_delivery_summary.lifecycle.state }} · {{ status.latest_delivery_summary.lifecycle.terminal ? '终态' : '会话保留' }}</span>
        </div>
        <div class="main-agent-status-item" v-if="sessionContinuityText">
          <span class="item-label">执行器 / 会话</span>
          <span class="item-value">{{ sessionContinuityText }}</span>
        </div>
        <div class="main-agent-status-item" v-if="status?.latest_delivery_summary">
          <span class="item-label">文件 / 验证</span>
          <span class="item-value">{{ status.latest_delivery_summary.actual_file_change_count || 0 }} 个文件 · {{ status.latest_delivery_summary.external_runner_verification_count || 0 }} 条外部验证</span>
        </div>
        <div class="main-agent-status-item" v-if="status?.latest_delivery_summary?.reasoning_loop">
          <span class="item-label">推理闭环</span>
          <span class="item-value">计划 v{{ status.latest_delivery_summary.reasoning_loop.plan_version || 0 }} · 待证明 {{ status.latest_delivery_summary.reasoning_open_assertions || 0 }} · 偏差 {{ status.latest_delivery_summary.reasoning_deviation_count || 0 }} · 复盘 {{ status.latest_delivery_summary.reasoning_loop.postmortems?.length || 0 }}</span>
        </div>
        <div class="main-agent-status-item warning" v-if="status?.failed_gates?.length">
          <span class="item-label">未过门禁</span>
          <span class="item-value">{{ status.failed_gates.map(g => g.label || g.id).join('、') }}</span>
        </div>
      </details>
      <div class="main-agent-status-item warning" v-if="status?.blockers?.length || status?.needs?.length">
        <span class="item-label">阻塞/待补</span>
        <span class="item-value">{{ blockerText }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.main-agent-status-card { margin: 0 0 16px; padding: 14px; border-radius: 14px; border: 1px solid rgba(59, 130, 246, 0.18); background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(14, 165, 233, 0.05)); box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06); }
.main-agent-status-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 10px; }
.main-agent-status-title { font-size: 12px; font-weight: 900; color: var(--text-primary); margin-right: 8px; }
.main-agent-phase { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 999px; background: rgba(59, 130, 246, 0.12); color: var(--accent-blue); font-size: 11px; font-weight: 800; }
.main-agent-status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; }
.main-agent-technical-detail{grid-column:1/-1;padding:7px 9px;border:1px solid var(--border-color);border-radius:9px;color:var(--text-muted)}
.main-agent-technical-detail>summary{cursor:pointer;font-size:10px;font-weight:800;user-select:none}
.main-agent-technical-detail[open]{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px}
.main-agent-technical-detail[open]>summary{grid-column:1/-1;margin-bottom:2px}
.main-agent-status-item { min-width: 0; padding: 8px 10px; border-radius: 10px; background: rgba(255, 255, 255, 0.55); border: 1px solid rgba(148, 163, 184, 0.16); }
.main-agent-status-item.latest-decision { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 10px; align-items: center; border-color: rgba(59, 130, 246, 0.22); background: linear-gradient(135deg, rgba(255,255,255,.72), rgba(239,246,255,.58)); }
.main-agent-status-item.latest-decision .item-label,
.main-agent-status-item.latest-decision .item-value,
.main-agent-status-item.latest-decision small { grid-column: 1; }
.main-agent-status-item.latest-decision button { grid-column: 2; grid-row: 1 / span 4; align-self: center; }
.decision-plan-preview { color: var(--accent-blue) !important; font-weight: 800; }
.main-agent-status-item.latest-decision.active { border-color: rgba(124, 58, 237, 0.28); background: linear-gradient(135deg, rgba(250,245,255,.82), rgba(239,246,255,.64)); }
.main-agent-status-item.latest-decision.analysis { border-color: rgba(14, 165, 233, 0.25); background: linear-gradient(135deg, rgba(240,249,255,.82), rgba(224,242,254,.58)); }
.main-agent-status-item.latest-decision.idle { border-color: rgba(148, 163, 184, 0.18); background: rgba(255, 255, 255, 0.56); }
.main-agent-status-item.warning { border-color: rgba(245, 158, 11, 0.25); background: rgba(245, 158, 11, 0.08); }
.main-agent-status-item .item-label { display: block; font-size: 10px; color: var(--text-muted); font-weight: 800; margin-bottom: 4px; }
.main-agent-status-item .item-value { display: block; font-size: 12px; color: var(--text-primary); font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.main-agent-status-item small { display:block; color: var(--text-muted); font-size: 11px; line-height: 1.35; overflow-wrap: anywhere; }
</style>
