<script setup>
const props = defineProps({ policy: { type: Object, default: () => ({ override: {}, effective: {} }) } })
const emit = defineEmits(['update'])
const overrideValue = field => Object.prototype.hasOwnProperty.call(props.policy?.override || {}, field) ? props.policy.override[field] : ''
const effectiveValue = field => props.policy?.effective?.[field] ?? '-'
const update = (field, event, numeric = false) => {
  const raw = event.target.value
  emit('update', { field, value: raw === '' ? null : (numeric ? Number(raw) : raw) })
}
</script>

<template>
  <section class="context-policy-fields">
    <div class="policy-title"><strong>主 Agent 上下文策略</strong><small>留空表示继承全局；当前生效值显示在每项下方</small></div>
    <div class="policy-grid">
      <label><span>MCP Schema 加载</span><select :value="overrideValue('mcpToolLoadingMode')" @change="update('mcpToolLoadingMode', $event)"><option value="">继承全局</option><option value="deferred">延迟加载</option><option value="auto">按容量自动</option><option value="inline">全部内联</option></select><small>生效：{{ effectiveValue('mcpToolLoadingMode') }}</small></label>
      <label><span>MCP 自动阈值（%）</span><input type="number" min="0" max="100" step="1" :value="overrideValue('mcpToolAutoThresholdPercent')" :placeholder="String(effectiveValue('mcpToolAutoThresholdPercent'))" @input="update('mcpToolAutoThresholdPercent', $event, true)" /><small>生效：{{ effectiveValue('mcpToolAutoThresholdPercent') }}%</small></label>
      <label><span>Skill 目录预算（%）</span><input type="number" min="0.1" max="10" step="0.1" :value="overrideValue('skillCatalogBudgetPercent')" :placeholder="String(effectiveValue('skillCatalogBudgetPercent'))" @input="update('skillCatalogBudgetPercent', $event, true)" /><small>生效：{{ effectiveValue('skillCatalogBudgetPercent') }}%</small></label>
      <label><span>单个 Skill 恢复</span><input type="number" min="500" max="20000" step="500" :value="overrideValue('postCompactSkillPerItemMaxTokens')" :placeholder="String(effectiveValue('postCompactSkillPerItemMaxTokens'))" @input="update('postCompactSkillPerItemMaxTokens', $event, true)" /><small>生效：{{ effectiveValue('postCompactSkillPerItemMaxTokens') }} token</small></label>
      <label><span>Skill 恢复总量</span><input type="number" min="1000" max="100000" step="1000" :value="overrideValue('postCompactSkillTotalMaxTokens')" :placeholder="String(effectiveValue('postCompactSkillTotalMaxTokens'))" @input="update('postCompactSkillTotalMaxTokens', $event, true)" /><small>生效：{{ effectiveValue('postCompactSkillTotalMaxTokens') }} token</small></label>
      <label><span>来源目录预算（%）</span><input type="number" min="0.1" max="10" step="0.1" :value="overrideValue('contextSourceCatalogBudgetPercent')" :placeholder="String(effectiveValue('contextSourceCatalogBudgetPercent'))" @input="update('contextSourceCatalogBudgetPercent', $event, true)" /><small>生效：{{ effectiveValue('contextSourceCatalogBudgetPercent') }}%</small></label>
      <label><span>来源正文预算（%）</span><input type="number" min="1" max="50" step="1" :value="overrideValue('contextSourceHydrationBudgetPercent')" :placeholder="String(effectiveValue('contextSourceHydrationBudgetPercent'))" @input="update('contextSourceHydrationBudgetPercent', $event, true)" /><small>生效：{{ effectiveValue('contextSourceHydrationBudgetPercent') }}%</small></label>
      <label><span>单个来源恢复</span><input type="number" min="500" max="20000" step="500" :value="overrideValue('postCompactSourcePerItemMaxTokens')" :placeholder="String(effectiveValue('postCompactSourcePerItemMaxTokens'))" @input="update('postCompactSourcePerItemMaxTokens', $event, true)" /><small>生效：{{ effectiveValue('postCompactSourcePerItemMaxTokens') }} token</small></label>
      <label><span>来源恢复总量</span><input type="number" min="1000" max="100000" step="1000" :value="overrideValue('postCompactSourceTotalMaxTokens')" :placeholder="String(effectiveValue('postCompactSourceTotalMaxTokens'))" @input="update('postCompactSourceTotalMaxTokens', $event, true)" /><small>生效：{{ effectiveValue('postCompactSourceTotalMaxTokens') }} token</small></label>
      <label><span>单项目 Agent 并发</span><input type="number" min="1" max="16" step="1" :value="overrideValue('agentMaxParallelPerProject')" :placeholder="String(effectiveValue('agentMaxParallelPerProject'))" @input="update('agentMaxParallelPerProject', $event, true)" /><small>生效：{{ effectiveValue('agentMaxParallelPerProject') }}（只能降低全局值）</small></label>
      <label><span>作用域 Agent 总并发</span><input type="number" min="1" max="64" step="1" :value="overrideValue('agentMaxParallelGlobal')" :placeholder="String(effectiveValue('agentMaxParallelGlobal'))" @input="update('agentMaxParallelGlobal', $event, true)" /><small>生效：{{ effectiveValue('agentMaxParallelGlobal') }}（只能降低全局值）</small></label>
    </div>
  </section>
</template>

<style scoped>
.context-policy-fields{display:grid;gap:9px;margin-top:14px;padding-top:14px;border-top:1px solid var(--border-color)}
.policy-title{display:grid;gap:2px}.policy-title strong{font-size:12px;color:var(--text-primary)}.policy-title small{font-size:9.5px;color:var(--text-muted)}
.policy-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.policy-grid label{display:grid;gap:4px}.policy-grid span{font-size:10.5px;font-weight:700;color:var(--text-secondary)}.policy-grid small{font-size:9px;color:var(--text-muted)}
input,select{width:100%;box-sizing:border-box;border:1px solid var(--border-color);border-radius:7px;padding:8px 9px;background:var(--control-bg);color:var(--text-primary);font:inherit;font-size:11px}
@media(max-width:720px){.policy-grid{grid-template-columns:1fr}}
</style>
