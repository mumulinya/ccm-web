<script setup>
import { computed } from 'vue'

const props = defineProps({
  card: { type: Object, required: true },
  context: { type: String, default: 'task' },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['action'])

const kicker = computed(() => props.card.kicker || ({
  group: 'AI 编程任务',
  project: '项目 Agent 任务',
  global: '跨项目 AI 任务',
}[props.context] || 'AI 编程任务'))

const agentLabel = (status) => ({
  done: '已完成', completed: '已完成', succeeded: '已完成',
  running: '执行中', in_progress: '执行中', reviewing: '检查中',
  pending: '等待中', queued: '等待中', blocked: '受阻',
  failed: '失败', partial: '需修复', cancelled: '已取消',
}[status] || status || '等待中')

const hasDelivery = computed(() => {
  const delivery = props.card.delivery || {}
  return delivery.acceptance_passed || delivery.headline || delivery.files?.length || delivery.verification?.length || delivery.risks?.length
})
</script>

<template>
  <section class="task-experience-card" :class="[`context-${context}`, `phase-${card.phase}`]">
    <header class="task-card-head">
      <div>
        <span class="task-card-kicker">{{ kicker }}</span>
        <h4>{{ card.title || '开发任务' }}</h4>
      </div>
      <span class="task-card-phase">{{ card.phase_label || '正在处理' }}</span>
    </header>

    <div v-if="card.goal" class="task-card-goal">{{ card.goal }}</div>
    <div class="task-card-progress"><span :style="{ width: `${Math.max(0, Math.min(100, Number(card.progress || 0)))}%` }"></span></div>
    <div class="task-card-progress-label"><span>总体进度</span><strong>{{ Math.max(0, Math.min(100, Number(card.progress || 0))) }}%</strong></div>

    <div v-if="card.active_agents?.length" class="task-card-section">
      <label>正在工作</label>
      <div class="task-card-pills"><span v-for="agent in card.active_agents" :key="agent">{{ agent }}</span></div>
    </div>

    <div v-if="card.agents?.length" class="task-card-agents">
      <div v-for="agent in card.agents" :key="agent.id || agent.name" class="task-card-agent">
        <strong>{{ agent.name }}</strong><span>{{ agentLabel(agent.status) }}</span>
        <small v-if="agent.summary">{{ agent.summary }}</small>
      </div>
    </div>

    <div v-if="card.completed?.length" class="task-card-section completed">
      <label>已完成</label>
      <ul><li v-for="item in card.completed" :key="item">{{ item }}</li></ul>
    </div>

    <div v-if="card.blockers?.length" class="task-card-section blockers">
      <label>{{ card.phase === 'needs_user' ? '需要你的决定' : '当前阻塞' }}</label>
      <ul><li v-for="item in card.blockers" :key="item">{{ item }}</li></ul>
    </div>

    <div v-if="card.next_action" class="task-card-next"><span>下一步</span><strong>{{ card.next_action }}</strong></div>

    <div v-if="hasDelivery" class="task-card-delivery">
      <span>{{ card.delivery?.headline || (card.delivery?.acceptance_passed ? '改动和检查均已完成' : '已有交付进展') }}</span>
      <strong>{{ card.delivery?.files?.length || 0 }} 个文件 · {{ card.delivery?.verification?.length || 0 }} 项检查</strong>
    </div>

    <div v-if="card.delivery?.risks?.length" class="task-card-section blockers">
      <label>需要留意</label>
      <ul><li v-for="item in card.delivery.risks" :key="item">{{ item }}</li></ul>
    </div>

    <div v-if="card.actions?.length" class="task-card-actions">
      <button v-for="action in card.actions" :key="action.id" type="button" :disabled="busy" :class="['task-card-button', action.tone]" @click="emit('action', action)">{{ action.label }}</button>
    </div>

    <details v-if="card.technical" class="task-card-technical">
      <summary>技术详情</summary>
      <div v-if="card.task_id"><span>Task</span><code>{{ card.task_id }}</code></div>
      <div v-if="card.technical.trace_id"><span>Trace</span><code>{{ card.technical.trace_id }}</code></div>
      <div v-if="card.technical.execution_ids?.length"><span>执行</span><code>{{ card.technical.execution_ids.join('、') }}</code></div>
      <div v-if="card.technical.session_ids?.length"><span>会话</span><code>{{ card.technical.session_ids.join('、') }}</code></div>
      <div v-if="card.technical.run_id"><span>Run</span><code>{{ card.technical.run_id }}</code></div>
      <div v-if="card.technical.supervisor_id"><span>监工</span><code>{{ card.technical.supervisor_id }}</code></div>
      <div v-if="card.technical.gap_fingerprint"><span>缺口指纹</span><code>{{ card.technical.gap_fingerprint }}</code></div>
    </details>
  </section>
</template>

<style scoped>
.task-experience-card { margin-top:12px; padding:16px; border:1px solid rgba(37,99,235,.22); border-radius:14px; background:linear-gradient(145deg,rgba(255,255,255,.96),rgba(239,246,255,.88)); color:var(--text-primary); box-shadow:0 10px 30px rgba(15,23,42,.05); }
.context-global { border-color:rgba(124,58,237,.24); background:linear-gradient(145deg,rgba(255,255,255,.97),rgba(245,243,255,.9)); }
.context-project { border-color:rgba(5,150,105,.24); background:linear-gradient(145deg,rgba(255,255,255,.97),rgba(236,253,245,.9)); }
.task-card-head,.task-card-progress-label,.task-card-next,.task-card-delivery { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.task-card-head h4 { margin:3px 0 0; font-size:15px; }.task-card-kicker { font-size:11px; color:#64748b; }
.task-card-phase { padding:4px 9px; border-radius:999px; background:#dbeafe; color:#1d4ed8; font-size:12px; font-weight:700; white-space:nowrap; }
.phase-needs_user .task-card-phase,.phase-blocked .task-card-phase { background:#fef3c7; color:#92400e; }.phase-completed .task-card-phase { background:#dcfce7; color:#166534; }.phase-failed .task-card-phase { background:#fee2e2; color:#991b1b; }.phase-reverted .task-card-phase,.phase-cancelled .task-card-phase { background:#e2e8f0; color:#475569; }
.task-card-goal { margin-top:10px; color:#334155; line-height:1.55; }.task-card-progress { height:7px; margin-top:13px; overflow:hidden; border-radius:999px; background:#e2e8f0; }.task-card-progress span { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,#2563eb,#06b6d4); transition:width .25s ease; }.context-global .task-card-progress span { background:linear-gradient(90deg,#7c3aed,#2563eb); }.context-project .task-card-progress span { background:linear-gradient(90deg,#059669,#06b6d4); }
.task-card-progress-label { margin-top:5px; font-size:11px; color:#64748b; }.task-card-section { margin-top:13px; }.task-card-section label { display:block; margin-bottom:6px; font-size:12px; font-weight:700; color:#475569; }.task-card-pills { display:flex; gap:6px; flex-wrap:wrap; }.task-card-pills span { padding:4px 8px; border-radius:999px; background:#e0f2fe; color:#0369a1; font-size:12px; }
.task-card-agents { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:7px; margin-top:12px; }.task-card-agent { display:grid; grid-template-columns:1fr auto; gap:3px 8px; padding:8px 10px; border-radius:9px; background:rgba(255,255,255,.82); border:1px solid #e2e8f0; font-size:12px; }.task-card-agent small { grid-column:1/-1; color:#64748b; }.task-card-section ul { margin:0; padding-left:18px; color:#475569; font-size:12px; line-height:1.65; }.task-card-section.completed li::marker { color:#16a34a; }.task-card-section.blockers { padding:10px; border-radius:9px; background:#fff7ed; }
.task-card-next { margin-top:13px; padding:10px 12px; border-radius:9px; background:#eff6ff; font-size:12px; }.task-card-next span { color:#64748b; }.task-card-next strong { color:#1e40af; text-align:right; }.task-card-delivery { margin-top:10px; color:#166534; font-size:12px; }.task-card-delivery span { max-width:70%; }.task-card-actions { display:flex; flex-wrap:wrap; gap:7px; margin-top:13px; }.task-card-button { padding:6px 10px; border:1px solid #cbd5e1; border-radius:7px; background:#fff; color:#334155; cursor:pointer; font-size:12px; }.task-card-button:disabled { opacity:.55; cursor:not-allowed; }.task-card-button.primary { background:#2563eb; border-color:#2563eb; color:#fff; }.task-card-button.danger { color:#b91c1c; border-color:#fecaca; }.task-card-button.warning { color:#92400e; border-color:#fde68a; background:#fffbeb; }
.task-card-technical { margin-top:12px; font-size:11px; color:#64748b; }.task-card-technical summary { cursor:pointer; }.task-card-technical div { display:grid; grid-template-columns:70px 1fr; gap:8px; margin-top:6px; }.task-card-technical code { overflow-wrap:anywhere; color:#475569; }
:global([data-theme="dark"]) .task-experience-card { background:linear-gradient(145deg,rgba(15,23,42,.96),rgba(30,41,59,.92)); border-color:rgba(96,165,250,.3); }.context-global:global([data-theme="dark"]) { border-color:rgba(167,139,250,.35); }.context-project:global([data-theme="dark"]) { border-color:rgba(52,211,153,.32); }.task-experience-card :is(.task-card-goal,.task-card-agent,.task-card-section ul,.task-card-next strong,.task-card-technical code) { color:inherit; }
</style>
