<script setup>
import { computed } from 'vue'
import { CheckCircle2, FileClock, ListChecks, ShieldAlert, Sparkles, Wrench } from '@lucide/vue'

const props = defineProps({ usage: { type: Object, default: null } })

const rows = computed(() => {
  const value = props.usage || {}
  return [
    { key: 'postCompactFileRestoreDedup', label: '文件恢复与去重', icon: FileClock, state: value.postCompactFileRestoreDedup },
    { key: 'postCompactInvokedSkillAttachment', label: '已调用 Skill 恢复', icon: Sparkles, state: value.postCompactInvokedSkillAttachment },
    { key: 'postCompactPlanAttachment', label: '当前计划恢复', icon: ListChecks, state: value.postCompactPlanAttachment },
    { key: 'postCompactDynamicContextDelta', label: 'MCP 与动态工具恢复', icon: Wrench, state: value.postCompactDynamicContextDelta },
    { key: 'toolResultContentReplacement', label: '大结果可恢复替换', icon: FileClock, state: value.toolResultContentReplacement },
    { key: 'postCompactTaskStatusProjection', label: '子任务状态恢复', icon: ListChecks, state: value.postCompactTaskStatusProjection },
  ].filter(row => row.state)
})

const countFor = row => {
  const receipt = row.state?.receipt || {}
  if (row.key === 'postCompactFileRestoreDedup') return Number(receipt.restored_file_candidate_count || 0)
  if (row.key === 'postCompactInvokedSkillAttachment') return Number(row.state?.attachmentCount || receipt.attachment_count || 0)
  if (row.key === 'postCompactPlanAttachment') return row.state?.attached ? 1 : 0
  if (row.key === 'toolResultContentReplacement') return Number(row.state?.replacementCount || 0)
  if (row.key === 'postCompactTaskStatusProjection') return Number(row.state?.itemCount || 0)
  return Number(receipt.attached_count || receipt.loaded_tool_count || (row.state?.attached ? 1 : 0))
}
</script>

<template>
  <section v-if="rows.length" class="recovery-panel">
    <div class="recovery-head">
      <div><small>POST-COMPACT RECOVERY</small><h4>压缩后工作上下文恢复</h4></div>
      <span>仅显示核验回执，不展示敏感正文</span>
    </div>
    <div class="recovery-grid">
      <article v-for="row in rows" :key="row.key" :class="{ invalid: !row.state?.receiptValid }">
        <component :is="row.icon" :size="17" />
        <div><strong>{{ row.label }}</strong><small>{{ countFor(row) }} 项 · {{ row.state?.receiptValid ? '回执已核验' : '回执异常' }}</small></div>
        <CheckCircle2 v-if="row.state?.receiptValid" :size="16" class="ok" />
        <ShieldAlert v-else :size="16" class="bad" />
      </article>
    </div>
  </section>
</template>

<style scoped>
.recovery-panel { margin: 0 0 20px; padding: 15px 16px; border: 1px solid var(--border-color); background: var(--surface); }
.recovery-head { display: flex; align-items: end; justify-content: space-between; gap: 14px; margin-bottom: 12px; }
.recovery-head small { color: var(--text-muted); font-size: 9px; font-weight: 700; }
.recovery-head h4 { margin: 3px 0 0; font-size: 14px; }
.recovery-head > span { color: var(--text-muted); font-size: 10px; }
.recovery-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.recovery-grid article { min-width: 0; min-height: 54px; display: grid; grid-template-columns: 24px minmax(0, 1fr) 18px; align-items: center; gap: 8px; padding: 9px 10px; border: 1px solid var(--border-color); background: var(--surface-muted); color: var(--text-secondary); }
.recovery-grid article.invalid { border-color: color-mix(in srgb, var(--accent-red) 38%, var(--border-color)); }
.recovery-grid strong, .recovery-grid small { display: block; overflow-wrap: anywhere; }
.recovery-grid strong { color: var(--text-primary); font-size: 12px; }
.recovery-grid small { margin-top: 3px; color: var(--text-muted); font-size: 10px; }
.ok { color: var(--accent-green); }.bad { color: var(--accent-red); }
@media (max-width: 720px) { .recovery-head { align-items: flex-start; flex-direction: column; }.recovery-grid { grid-template-columns: 1fr; } }
</style>
