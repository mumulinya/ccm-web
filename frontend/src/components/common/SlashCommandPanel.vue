<script setup>
import { computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({ panel: { type: Object, default: null } })
const emit = defineEmits(['close', 'action'])
const result = computed(() => props.panel?.result || {})
const command = computed(() => props.panel?.command || {})
const stats = computed(() => result.value.stats || result.value.metrics || [])
const sections = computed(() => result.value.sections?.length
  ? result.value.sections
  : result.value.items?.length ? [{ id: 'primary', rows: result.value.items }] : [])

function onKeydown(event) {
  if (event.key === 'Escape' && props.panel) emit('close')
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div v-if="panel" class="slash-panel-backdrop" role="presentation" @mousedown.self="emit('close')">
      <section class="slash-panel" role="dialog" aria-modal="true" :aria-label="`/${command.name || result.command}`">
        <header>
          <div>
            <small>CCM · {{ command.category || '命令' }}</small>
            <h2>/{{ command.name || result.command }}</h2>
            <p>{{ command.description || result.title }}</p>
          </div>
          <button type="button" aria-label="关闭命令面板" title="Esc 关闭" @click="emit('close')">×</button>
        </header>

        <div class="panel-body">
          <p class="headline">{{ result.headline || result.summary }}</p>
          <div v-if="stats.length" class="panel-stats">
            <div v-for="stat in stats" :key="stat.label">
              <span>{{ stat.label }}</span><strong>{{ stat.value }}</strong>
            </div>
          </div>
          <section v-for="section in sections" :key="section.id || section.title" class="panel-section">
            <h3 v-if="section.title">{{ section.title }}</h3>
            <div v-for="(row, index) in (section.rows || []).slice(0, 80)" :key="`${row.title}-${index}`" class="panel-row">
              <div><strong>{{ row.title }}</strong><span v-if="row.detail">{{ row.detail }}</span><small v-if="row.meta">{{ row.meta }}</small></div>
              <button v-if="row.action" type="button" @click="emit('action', row.action)">{{ row.status || '打开' }}</button>
              <em v-else-if="row.status">{{ row.status }}</em>
            </div>
          </section>
          <div v-if="result.actions?.length" class="panel-actions">
            <button v-for="action in result.actions" :key="`${action.kind}-${action.label}`" type="button" @click="emit('action', action)">{{ action.label }}</button>
          </div>
        </div>
        <footer><span>{{ result.durationMs || 0 }} ms</span><span>Esc 关闭</span></footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.slash-panel-backdrop{position:fixed;inset:0;z-index:10000;display:grid;place-items:center;padding:18px;background:rgba(2,6,23,.48);backdrop-filter:blur(6px)}
.slash-panel{width:min(760px,100%);max-height:min(760px,88vh);display:flex;overflow:hidden;flex-direction:column;border:1px solid color-mix(in srgb,var(--accent-blue) 28%,var(--border-color));border-radius:16px;background:var(--bg-secondary);color:var(--text-primary);box-shadow:0 28px 90px rgba(2,6,23,.35)}
header{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding:18px 20px;border-bottom:1px solid var(--border-color)}header small{color:var(--accent-blue);font-size:10px;font-weight:700}header h2{margin:4px 0 2px;font:700 18px var(--font-tech,monospace)}header p{margin:0;color:var(--text-muted);font-size:11px}header button{width:32px;height:32px;border:0;border-radius:8px;background:var(--control-bg);color:var(--text-secondary);font-size:22px;cursor:pointer}
.panel-body{min-height:150px;padding:16px 20px;overflow:auto}.headline{margin:0 0 14px;font-size:13px;line-height:1.7}.panel-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:14px}.panel-stats div{display:flex;flex-direction:column;gap:4px;padding:10px;border-radius:9px;background:var(--bg-primary)}.panel-stats span{color:var(--text-muted);font-size:9px}.panel-stats strong{font-size:13px}
.panel-section{border-top:1px solid var(--border-color)}.panel-section h3{margin:12px 0 6px;color:var(--text-muted);font-size:10px}.panel-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:9px 2px;border-bottom:1px solid color-mix(in srgb,var(--border-color) 65%,transparent)}.panel-row>div{display:flex;min-width:0;flex-direction:column;gap:3px}.panel-row strong{font-size:11px}.panel-row span,.panel-row small{color:var(--text-muted);font-size:9px;line-height:1.5}.panel-row em{flex:none;color:var(--accent-blue);font-size:9px;font-style:normal}.panel-row>button{flex:none;padding:5px 8px;border:1px solid var(--border-color);border-radius:7px;background:var(--control-bg);color:var(--accent-blue);font-size:9px;cursor:pointer}
.panel-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.panel-actions button,.technical-toggle{padding:7px 11px;border:1px solid var(--border-color);border-radius:8px;background:var(--control-bg);color:var(--accent-blue);font-size:10px;font-weight:700;cursor:pointer}.technical-toggle{margin-top:14px}.panel-body pre{max-height:240px;overflow:auto;padding:12px;border-radius:9px;background:var(--bg-primary);font:9px/1.55 var(--font-tech,monospace);white-space:pre-wrap;overflow-wrap:anywhere}
footer{display:flex;justify-content:space-between;padding:9px 20px;border-top:1px solid var(--border-color);color:var(--text-muted);font-size:9px}
@media(max-width:700px){.slash-panel-backdrop{align-items:end;padding:0}.slash-panel{max-height:92vh;border-radius:16px 16px 0 0}.panel-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
