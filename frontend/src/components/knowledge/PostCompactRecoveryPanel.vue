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

const countFor = (row) => {
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
      <div class="head-left">
        <small>POST-COMPACT RECOVERY</small>
        <h4>压缩后工作上下文恢复</h4>
      </div>
      <span class="head-note">仅显示核验回执，不展示敏感正文</span>
    </div>
    <div class="recovery-grid">
      <article
        v-for="row in rows"
        :key="row.key"
        class="recovery-card"
        :class="{ invalid: !row.state?.receiptValid }"
      >
        <div class="card-icon-wrap">
          <component :is="row.icon" :size="15" />
        </div>
        <div class="card-copy">
          <strong>{{ row.label }}</strong>
          <small>{{ countFor(row) }} 项 · {{ row.state?.receiptValid ? '回执已核验' : '回执异常' }}</small>
        </div>
        <CheckCircle2 v-if="row.state?.receiptValid" :size="15" class="status-icon ok" />
        <ShieldAlert v-else :size="15" class="status-icon bad" />
      </article>
    </div>
  </section>
</template>

<style scoped>
.recovery-panel {
  margin: 0 0 18px;
  padding: 14px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface, var(--bg-card));
  box-shadow: var(--shadow-sm);
}

.recovery-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 12px;
}

.head-left {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.head-left small {
  color: var(--text-muted);
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.head-left h4 {
  margin: 0;
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text-primary);
}

.head-note {
  color: var(--text-muted);
  font-size: 10.5px;
}

.recovery-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.recovery-card {
  min-width: 0;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  transition: all 0.15s ease;
}

.recovery-card:hover {
  border-color: color-mix(in srgb, var(--accent-blue) 35%, var(--border-color));
}

.card-icon-wrap {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: var(--panel-muted);
  color: var(--accent-blue);
}

.recovery-card.invalid {
  border-color: color-mix(in srgb, var(--accent-red) 40%, var(--border-color));
}

.card-copy {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.card-copy strong {
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-copy small {
  margin-top: 1px;
  color: var(--text-muted);
  font-size: 10.5px;
}

.status-icon.ok { color: var(--accent-green, #10b981); }
.status-icon.bad { color: var(--accent-red, #ef4444); }

@media (max-width: 680px) {
  .recovery-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }
  .recovery-grid {
    grid-template-columns: 1fr;
  }
}
</style>
