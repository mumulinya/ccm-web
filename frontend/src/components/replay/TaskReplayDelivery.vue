<script setup>
import { computed } from 'vue'
import { sanitizeReplayText } from '../../utils/taskReplayPresentation.js'

const props = defineProps({
  deliveries: { type: Array, default: () => [] },
  tasks: { type: Array, default: () => [] },
})

const REVIEW_STATUS = { complete: '验收通过', completed: '验收通过', partial: '部分通过', failed: '未通过', blocked: '受阻', pending: '待验收' }
const showTaskTags = computed(() => (props.tasks || []).length > 1)
const taskLabelFor = (taskId) => {
  if (!showTaskTags.value) return ''
  const task = (props.tasks || []).find(item => String(item.id) === String(taskId))
  if (!task) return ''
  return task.is_root ? '主任务' : (task.project || task.title || '')
}
const reviewStatusLabel = (review) => REVIEW_STATUS[review?.status] || review?.status || ''
const displayText = value => sanitizeReplayText(value)
const hasRequirement = (row) => !!(row.business_goal || row.acceptance_criteria?.length || row.source_documents || row.followups?.length)
const hasProcess = (row) => !!(row.agents?.length || row.actions?.length || row.rework_count || row.verification?.executed?.length || row.verification?.required?.length || row.blockers?.length || row.needs?.length || row.recovery?.watchdog_count)
const recoveryText = (recovery) => {
  const rows = []
  if (recovery?.watchdog_count) rows.push(`系统自动恢复 ${recovery.watchdog_count} 次`)
  if (recovery?.auto_gap_continue_count) rows.push(`按缺口自动续跑 ${recovery.auto_gap_continue_count} 次`)
  if (recovery?.continuation_count) rows.push(`续跑 ${recovery.continuation_count} 轮`)
  return rows.join(' · ')
}
</script>

<template>
  <section v-if="deliveries.length" class="task-replay-delivery" aria-label="需求与交付">
    <article v-for="row in deliveries" :key="row.task_id" class="delivery-card">
      <header>
        <strong>需求与交付</strong>
        <em v-if="taskLabelFor(row.task_id)" class="task-tag">{{ taskLabelFor(row.task_id) }}</em>
        <span v-if="row.headline" class="delivery-headline">{{ displayText(row.headline) }}</span>
      </header>

      <div class="delivery-grid">
        <div v-if="hasRequirement(row)" class="delivery-block">
          <h4>用户要的是什么</h4>
          <p v-if="row.business_goal" class="block-goal">{{ displayText(row.business_goal) }}</p>
          <div v-if="row.acceptance_criteria?.length" class="block-row">
            <b>验收标准</b>
            <ul><li v-for="item in row.acceptance_criteria" :key="item">{{ displayText(item) }}</li></ul>
          </div>
          <div v-if="row.source_documents" class="block-row"><b>需求材料</b><p>{{ row.source_documents }}</p></div>
          <details v-if="row.followups?.length" class="block-followups">
            <summary>执行中追加了 {{ row.followups.length }} 次要求</summary>
            <ul><li v-for="(item, index) in row.followups" :key="index"><span>{{ item.source || '用户' }}</span>{{ item.message }}</li></ul>
          </details>
        </div>

        <div v-if="row.final_report || row.user_report || row.review" class="delivery-block">
          <h4>最后交付了什么</h4>
          <pre v-if="row.final_report" class="block-report">{{ displayText(row.final_report) }}</pre>
          <details v-if="row.user_report" class="block-followups"><summary>另一份交付报告</summary><pre class="block-report">{{ row.user_report }}</pre></details>
          <div v-if="row.review" class="block-review">
            <b>主 Agent 验收<span v-if="reviewStatusLabel(row.review)"> · {{ reviewStatusLabel(row.review) }}</span></b>
            <pre v-if="row.review.content" class="block-report">{{ displayText(row.review.content) }}</pre>
            <p v-if="row.review.gaps?.length" class="block-gap">遗留缺口：{{ row.review.gaps.join('；') }}</p>
            <p v-if="row.review.follow_ups?.length" class="block-gap">后续事项：{{ row.review.follow_ups.join('；') }}</p>
            <p v-if="row.review.conflicts?.length" class="block-gap">冲突：{{ row.review.conflicts.join('；') }}</p>
          </div>
        </div>
      </div>

      <details v-if="hasProcess(row)" class="delivery-process">
        <summary>过程结论（参与者、动作、验证、返工与恢复）</summary>
        <div class="process-grid">
          <div v-if="row.agents?.length"><b>参与成员</b><p>{{ row.agents.join('、') }}</p></div>
          <div v-if="row.actions?.length"><b>执行动作</b><ul><li v-for="item in row.actions" :key="item">{{ item }}</li></ul></div>
          <div v-if="row.verification?.executed?.length"><b>已执行验证</b><ul><li v-for="item in row.verification.executed" :key="item">{{ item }}</li></ul></div>
          <div v-if="row.verification?.missing?.length" class="process-warn"><b>未覆盖的必需验证</b><ul><li v-for="item in row.verification.missing" :key="item">{{ item }}</li></ul></div>
          <div v-if="row.verification?.failed?.length" class="process-warn"><b>验证未通过</b><ul><li v-for="item in row.verification.failed" :key="item">{{ item }}</li></ul></div>
          <div v-if="row.rework_count"><b>返工 {{ row.rework_count }} 次</b><ul><li v-for="(item, index) in row.rework_rounds" :key="index">{{ item.project }}：{{ item.summary }}</li></ul></div>
          <div v-if="row.blockers?.length" class="process-warn"><b>需要处理</b><ul><li v-for="item in row.blockers" :key="item">{{ item }}</li></ul></div>
          <div v-if="row.needs?.length" class="process-warn"><b>待补信息</b><ul><li v-for="item in row.needs" :key="item">{{ item }}</li></ul></div>
          <div v-if="recoveryText(row.recovery)"><b>中断与恢复</b><p>{{ recoveryText(row.recovery) }}</p></div>
        </div>
      </details>
    </article>
  </section>
</template>

<style scoped>
.task-replay-delivery { display:grid; gap:12px; margin-bottom:14px; }
.delivery-card { border:1px solid var(--border-color); border-radius:8px; padding:11px 13px; background:var(--surface); }
.delivery-card>header { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-bottom:9px; }
.delivery-card>header strong { font-size:13px; }
.task-tag { padding:2px 5px; border-radius:4px; background:var(--bg-secondary); color:var(--text-muted); font-size:9px; font-style:normal; }
.delivery-headline { color:var(--text-muted); font-size:11px; overflow-wrap:anywhere; }
.delivery-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:12px; align-items:start; }
.delivery-block { min-width:0; }
.delivery-block h4 { margin:0 0 6px; color:var(--text-muted); font-size:10px; font-weight:800; }
.block-goal { margin:0; font-size:12px; line-height:1.6; overflow-wrap:anywhere; }
.block-row { margin-top:8px; }
.block-row b,.block-review b { display:block; margin-bottom:3px; color:var(--text-muted); font-size:10px; }
.block-row p,.block-review p { margin:0; color:var(--text-secondary); font-size:11px; line-height:1.55; overflow-wrap:anywhere; }
.block-row ul,.process-grid ul { margin:0; padding-left:16px; }
.block-row li,.process-grid li { margin:2px 0; color:var(--text-secondary); font-size:11px; line-height:1.55; overflow-wrap:anywhere; }
.block-report { max-height:260px; margin:0; padding:8px 10px; overflow:auto; border-radius:6px; background:var(--bg-secondary); color:var(--text-secondary); font:11px/1.7 inherit; white-space:pre-wrap; overflow-wrap:anywhere; }
.block-review { margin-top:9px; }
.block-review .block-report { margin-top:3px; }
.block-gap { margin-top:5px !important; color:var(--accent-yellow) !important; font-size:10px !important; }
.block-followups { margin-top:8px; }
.block-followups summary,.delivery-process summary { color:var(--text-muted); font-size:10px; font-weight:700; cursor:pointer; }
.block-followups ul { margin:6px 0 0; padding-left:16px; }
.block-followups li { margin:4px 0; color:var(--text-secondary); font-size:10px; line-height:1.55; overflow-wrap:anywhere; }
.block-followups li span { margin-right:5px; padding:1px 4px; border-radius:3px; background:var(--bg-secondary); color:var(--text-muted); font-size:9px; }
.delivery-process { margin-top:10px; padding-top:9px; border-top:1px solid var(--border-color); }
.process-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:10px; margin-top:8px; }
.process-grid>div { min-width:0; }
.process-grid b { display:block; margin-bottom:3px; color:var(--text-muted); font-size:10px; }
.process-grid p { margin:0; color:var(--text-secondary); font-size:11px; overflow-wrap:anywhere; }
.process-warn b { color:var(--accent-yellow); }
@media (max-width:720px) { .delivery-grid,.process-grid { grid-template-columns:1fr; } .block-report { max-height:200px; } }
</style>
