<script setup>
import { computed, ref } from 'vue'

const props = defineProps({ result: { type: Object, required: true } })
const technicalOpen = ref(false)
const showAllRows = ref(false)

const implementationLabel = (value) => ({
  'local-query': '本地读取',
  'local-mutation': '本地操作',
  client: '当前会话',
  navigation: '页面导航',
  'agent-workflow': 'Agent 工作流',
}[value] || 'CCM 命令')

const normalized = computed(() => {
  const source = props.result || {}
  const stats = source.stats || source.metrics || []
  const sections = source.sections?.length
    ? source.sections
    : source.items?.length
      ? [{ id: 'legacy-primary', title: '', kind: 'list', rows: source.items }]
      : []
  const tone = source.tone || (source.success === false ? 'danger' : 'neutral')
  return {
    ...source,
    schema: source.schema || 'ccm-command-result-v1',
    variant: source.variant || 'compact',
    tone,
    headline: source.headline || source.summary || source.title || '命令已执行',
    stats,
    sections,
    actions: source.actions || [],
  }
})

const scopeLabel = computed(() => normalized.value.technicalDetails?.scopeId || normalized.value.technicalDetails?.scope || '')
const technicalText = computed(() => {
  const result = normalized.value
  const details = result.schema === 'ccm-command-result-v2'
    ? result.technicalDetails || {}
    : {
        schema: 'ccm-command-legacy-safe-projection-v1',
        command: result.command,
        success: result.success !== false,
        metrics: result.stats.length,
        sections: result.sections.length,
        note: '历史原始响应已按安全策略隐藏。',
      }
  return JSON.stringify(details, null, 2)
})

const visibleRows = rows => showAllRows.value ? rows : rows.slice(0, 8)
const statusGlyph = tone => ({ success: '●', warning: '▲', danger: '×', neutral: '•' }[tone] || '•')

function runAction(action) {
  if (!action?.tab || typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('ccm-command-result-action', { detail: action }))
}
</script>

<template>
  <section class="command-result-v2" :class="[`tone-${normalized.tone}`, `variant-${normalized.variant}`, `display-${normalized.displayMode || 'transcript'}`]">
    <header class="command-head">
      <span class="command-icon" aria-hidden="true">{{ normalized.icon || '/' }}</span>
      <div class="command-identity">
        <div class="command-eyebrow">
          <span>/{{ normalized.command }}</span>
          <span v-if="scopeLabel" class="scope-name">{{ scopeLabel }}</span>
        </div>
        <strong>{{ normalized.title || normalized.headline }}</strong>
      </div>
      <span class="implementation-badge">{{ implementationLabel(normalized.implementation) }}</span>
    </header>

    <div class="command-summary">
      <span class="summary-state" aria-hidden="true">{{ statusGlyph(normalized.tone) }}</span>
      <p>{{ normalized.headline }}</p>
    </div>

    <div v-if="normalized.stats.length" class="command-stats" :aria-label="`${normalized.command} 关键状态`">
      <div v-for="stat in normalized.stats" :key="stat.label" class="stat" :class="`tone-${stat.tone || 'neutral'}`">
        <span>{{ stat.label }}</span>
        <strong>{{ stat.value }}</strong>
      </div>
    </div>

    <div v-for="section in normalized.sections" :key="section.id || section.title" class="command-section" :class="`section-${section.kind || 'list'}`">
      <div v-if="section.title" class="section-title">{{ section.title }}</div>
      <div v-if="section.rows?.length" class="command-rows">
        <div v-for="(row, index) in visibleRows(section.rows)" :key="`${row.title}-${index}`" class="command-row" :class="`tone-${row.tone || 'neutral'}`">
          <span class="row-state" aria-hidden="true">{{ statusGlyph(row.tone || 'neutral') }}</span>
          <div class="row-copy">
            <strong>{{ row.title }}</strong>
            <span v-if="row.detail">{{ row.detail }}</span>
            <small v-if="row.meta">{{ row.meta }}</small>
          </div>
          <em v-if="row.status">{{ row.status }}</em>
        </div>
      </div>
    </div>

    <button v-if="normalized.sections.some(section => section.rows?.length > 8)" type="button" class="show-more" @click="showAllRows = !showAllRows">
      {{ showAllRows ? '收起明细' : '展开全部明细' }}
    </button>

    <div v-if="normalized.actions.length" class="command-actions">
      <button v-for="action in normalized.actions" :key="`${action.kind}-${action.label}`" type="button" @click="runAction(action)">
        {{ action.label }}
      </button>
    </div>

    <footer>
      <span>{{ normalized.durationMs || 0 }} ms · {{ new Date(normalized.at || Date.now()).toLocaleTimeString('zh-CN') }}</span>
      <button type="button" :aria-expanded="technicalOpen" @click="technicalOpen = !technicalOpen">
        {{ technicalOpen ? '收起技术详情' : '技术详情' }}
      </button>
    </footer>
    <pre v-if="technicalOpen">{{ technicalText }}</pre>
  </section>
</template>

<style scoped>
.command-result-v2{--tone:var(--accent-blue);width:min(720px,100%);overflow:hidden;border:1px solid color-mix(in srgb,var(--tone) 24%,var(--border-color));border-radius:14px;background:color-mix(in srgb,var(--tone) 4%,var(--bg-secondary));color:var(--text-primary);box-shadow:0 8px 26px rgba(15,23,42,.04)}
.command-result-v2.tone-success{--tone:#10b981}.command-result-v2.tone-warning{--tone:#d97706}.command-result-v2.tone-danger{--tone:#ef4444}
.command-head{display:flex;align-items:center;gap:11px;padding:12px 14px;border-bottom:1px solid var(--border-color)}
.command-icon{display:grid;flex:0 0 32px;height:32px;place-items:center;border-radius:9px;background:color-mix(in srgb,var(--tone) 86%,#fff);color:#fff;font-weight:800}
.command-identity{display:flex;min-width:0;flex:1;flex-direction:column;gap:3px}.command-identity>strong{overflow:hidden;font-size:12px;text-overflow:ellipsis;white-space:nowrap}
.command-eyebrow{display:flex;align-items:center;gap:7px;color:var(--tone);font:9px var(--font-tech,monospace)}.scope-name{max-width:210px;overflow:hidden;padding-left:7px;border-left:1px solid var(--border-color);color:var(--text-muted);text-overflow:ellipsis;white-space:nowrap}
.implementation-badge{flex:none;padding:4px 8px;border:1px solid color-mix(in srgb,var(--tone) 22%,transparent);border-radius:999px;background:color-mix(in srgb,var(--tone) 8%,transparent);color:var(--tone);font-size:9px;font-weight:700}
.command-summary{display:flex;gap:9px;padding:12px 14px 8px}.command-summary p{margin:0;font-size:12px;line-height:1.65}.summary-state{padding-top:2px;color:var(--tone);font-size:11px}
.command-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:7px;padding:2px 14px 12px}.stat{display:flex;min-width:0;flex-direction:column;gap:4px;padding:8px 9px;border-radius:9px;background:color-mix(in srgb,var(--bg-primary) 78%,transparent)}.stat span{color:var(--text-muted);font-size:9px}.stat strong{overflow-wrap:anywhere;font-size:12px}.stat.tone-success strong{color:#10b981}.stat.tone-warning strong{color:#d97706}.stat.tone-danger strong{color:#ef4444}
.command-section{border-top:1px solid var(--border-color)}.section-title{padding:8px 14px 5px;color:var(--text-muted);font-size:9px;font-weight:700;letter-spacing:.04em}.section-issues{background:rgba(217,119,6,.04)}
.command-row{display:grid;grid-template-columns:12px minmax(0,1fr) auto;gap:8px;align-items:center;padding:9px 14px;border-bottom:1px solid color-mix(in srgb,var(--border-color) 70%,transparent)}.command-row:last-child{border-bottom:0}.row-state{color:var(--text-muted);font-size:9px}.command-row.tone-success .row-state{color:#10b981}.command-row.tone-warning .row-state{color:#d97706}.command-row.tone-danger .row-state{color:#ef4444}
.row-copy{display:flex;min-width:0;flex-direction:column;gap:3px}.row-copy strong{overflow-wrap:anywhere;font-size:10px}.row-copy span{overflow-wrap:anywhere;color:var(--text-muted);font-size:9px;line-height:1.5}.row-copy small{color:var(--text-muted);font-size:8px}.command-row em{padding:3px 7px;border-radius:999px;background:color-mix(in srgb,currentColor 7%,transparent);color:var(--text-muted);font-size:8px;font-style:normal;white-space:nowrap}.command-row.tone-success em{color:#059669}.command-row.tone-warning em{color:#d97706}.command-row.tone-danger em{color:#ef4444}
.show-more{display:block;width:100%;padding:8px;border:0;border-top:1px solid var(--border-color);background:transparent;color:var(--accent-blue);font-size:9px;cursor:pointer}.command-actions{display:flex;flex-wrap:wrap;gap:7px;padding:10px 14px;border-top:1px solid var(--border-color)}.command-actions button{padding:6px 10px;border:1px solid color-mix(in srgb,var(--accent-blue) 28%,var(--border-color));border-radius:8px;background:rgba(var(--accent-blue-rgb),.06);color:var(--accent-blue);font-size:9px;font-weight:700;cursor:pointer}
footer{display:flex;justify-content:space-between;gap:12px;padding:8px 14px;border-top:1px solid var(--border-color);color:var(--text-muted);font-size:8px}footer button{border:0;background:transparent;color:var(--accent-blue);font-size:9px;cursor:pointer}.command-result-v2 pre{max-height:280px;margin:0;padding:12px 14px;overflow:auto;border-top:1px solid var(--border-color);background:rgba(15,23,42,.06);font:9px/1.55 var(--font-tech,monospace);white-space:pre-wrap;overflow-wrap:anywhere}
.variant-compact .command-stats{grid-template-columns:repeat(auto-fit,minmax(130px,1fr))}
.display-transcript{width:min(680px,100%);border-radius:10px;box-shadow:none}.display-transcript .command-head{padding:8px 11px}.display-transcript .command-icon{flex-basis:24px;height:24px;border-radius:7px;font-size:11px}.display-transcript .command-identity>strong{font-size:10px}.display-transcript .command-summary{padding:8px 11px 6px}.display-transcript .command-stats{padding:1px 11px 8px}.display-transcript footer{padding:6px 11px}
@media(max-width:720px){.command-result-v2{width:100%;border-radius:11px}.command-head{align-items:flex-start}.implementation-badge{display:none}.command-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.command-row{grid-template-columns:12px minmax(0,1fr)}.command-row em{grid-column:2;justify-self:start}.scope-name{max-width:110px}.command-actions button{flex:1}.command-summary p{font-size:11px}}
</style>
