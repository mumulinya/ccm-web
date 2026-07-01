<script setup>
import { ref } from 'vue'
defineProps({ result: { type: Object, required: true } })
const expanded = ref(false)
</script>

<template>
  <section class="command-result" :class="{ failed: result.success === false }">
    <header>
      <span class="command-result-icon">{{ result.icon || '/' }}</span>
      <div>
        <small>CCM 本地命令 · /{{ result.command }}</small>
        <strong>{{ result.title }}</strong>
      </div>
      <span class="local-badge">未调用模型</span>
    </header>
    <p>{{ result.summary }}</p>
    <div v-if="result.metrics?.length" class="command-metrics">
      <div v-for="metric in result.metrics" :key="metric.label"><span>{{ metric.label }}</span><strong>{{ metric.value }}</strong></div>
    </div>
    <div v-if="result.items?.length" class="command-items">
      <div v-for="(item, index) in result.items.slice(0, 30)" :key="`${item.title}-${index}`">
        <strong>{{ item.title }}</strong><span>{{ item.detail }}</span><em v-if="item.status">{{ item.status }}</em>
      </div>
    </div>
    <footer>
      <span>{{ result.durationMs || 0 }} ms · {{ new Date(result.at).toLocaleTimeString('zh-CN') }}</span>
      <button type="button" @click="expanded = !expanded">{{ expanded ? '收起原始结果' : '查看原始结果' }}</button>
    </footer>
    <pre v-if="expanded">{{ result.rawPreview }}</pre>
  </section>
</template>

<style scoped>
.command-result{min-width:min(680px,100%);overflow:hidden;border:1px solid rgba(var(--accent-blue-rgb),.2);border-radius:13px;background:rgba(var(--accent-blue-rgb),.035);color:var(--text-primary)}.command-result.failed{border-color:rgba(239,68,68,.28)}header{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--border-color)}header>div{display:flex;min-width:0;flex:1;flex-direction:column;gap:2px}header small{font:9px var(--font-tech,monospace);color:var(--accent-blue)}header strong{font-size:12px}.command-result-icon{display:grid;place-items:center;width:30px;height:30px;border-radius:8px;background:var(--accent-blue);color:white}.local-badge{padding:3px 7px;border-radius:10px;background:rgba(16,185,129,.1);color:#059669;font-size:8px;font-weight:700}.command-result>p{padding:11px 14px;font-size:11px;line-height:1.6}.command-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:6px;padding:0 14px 11px}.command-metrics>div{padding:8px;border-radius:8px;background:rgba(255,255,255,.45);display:flex;flex-direction:column;gap:3px}.command-metrics span{font-size:8px;color:var(--text-muted)}.command-metrics strong{font-size:11px;overflow-wrap:anywhere}.command-items{max-height:270px;overflow:auto;border-top:1px solid var(--border-color)}.command-items>div{display:grid;grid-template-columns:minmax(120px,.8fr) minmax(180px,1.5fr) auto;gap:9px;padding:8px 14px;border-bottom:1px solid var(--border-color);align-items:center}.command-items strong{font-size:10px;overflow-wrap:anywhere}.command-items span{font-size:9px;color:var(--text-muted);overflow-wrap:anywhere}.command-items em{font-size:8px;font-style:normal;color:var(--accent-blue)}footer{display:flex;justify-content:space-between;padding:8px 14px;color:var(--text-muted);font-size:8px}footer button{border:0;background:transparent;color:var(--accent-blue);font-size:9px;cursor:pointer}.command-result pre{max-height:280px;margin:0;padding:12px 14px;overflow:auto;border-top:1px solid var(--border-color);font:9px/1.5 monospace;white-space:pre-wrap;background:rgba(15,23,42,.04)}:global([data-theme="dark"]) .command-metrics>div{background:rgba(15,23,42,.35)}@media(max-width:720px){.command-result{min-width:0}.command-items>div{grid-template-columns:1fr}.local-badge{display:none}}
</style>
