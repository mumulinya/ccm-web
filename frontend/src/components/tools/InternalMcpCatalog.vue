<script setup>
import { CircleAlert, RefreshCw, Server, Settings, ShieldCheck } from '@lucide/vue'

defineProps({
  items: { type: Array, default: () => [] },
  summary: { type: Object, default: () => ({ total: 0, ready: 0, needs_configuration: 0, unavailable: 0, tools: 0 }) },
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(['refresh', 'configure'])

const stateTone = (state) => {
  if (['ready', 'connected'].includes(state)) return 'ok'
  if (state === 'needs_configuration') return 'warn'
  return 'fail'
}
</script>

<template>
  <section class="internal-mcp-catalog" aria-label="内部 MCP">
    <div class="catalog-summary">
      <div class="summary-copy">
        <ShieldCheck :size="20" aria-hidden="true" />
        <div>
          <strong>随项目安装的内部 MCP</strong>
          <span>{{ summary.ready || 0 }}/{{ summary.total || 0 }} 可用 · {{ summary.tools || 0 }} 个工具</span>
        </div>
      </div>
      <button class="icon-action" type="button" title="刷新内部 MCP 状态" :disabled="loading" @click="emit('refresh')">
        <RefreshCw :size="16" :class="{ spinning: loading }" aria-hidden="true" />
      </button>
    </div>

    <div v-if="loading && items.length === 0" class="catalog-empty">正在读取内部 MCP…</div>
    <div v-else-if="items.length === 0" class="catalog-empty">
      <CircleAlert :size="20" aria-hidden="true" />
      <span>没有发现随当前安装包提供的内部 MCP</span>
    </div>

    <div v-else class="mcp-list">
      <article v-for="item in items" :key="item.name" class="mcp-item" :data-state="item.state">
        <header class="mcp-item-header">
          <div class="mcp-identity">
            <span class="mcp-icon"><Server :size="18" aria-hidden="true" /></span>
            <div>
              <div class="mcp-title-row">
                <h3>{{ item.display_name }}</h3>
                <span class="protected-label"><ShieldCheck :size="12" aria-hidden="true" />系统保护</span>
              </div>
              <div class="mcp-subtitle">{{ item.lifecycle_label }} · v{{ item.version || '内置' }}</div>
            </div>
          </div>
          <span class="state-label" :class="stateTone(item.state)">{{ item.state_label }}</span>
        </header>

        <p class="mcp-description">{{ item.description }}</p>
        <div class="state-detail" :class="stateTone(item.state)">{{ item.state_detail }}</div>

        <div class="scope-row" aria-label="作用范围">
          <span class="section-label">作用范围</span>
          <span v-for="scope in item.scopes" :key="scope" class="scope-value">{{ scope }}</span>
        </div>

        <div class="tool-section">
          <div class="section-label">包含工具</div>
          <div class="tool-grid">
            <div v-for="tool in item.tools" :key="tool.name" class="tool-row">
              <strong>{{ tool.label || tool.name }}</strong>
              <span>{{ tool.description }}</span>
            </div>
          </div>
        </div>

        <div class="mcp-footer">
          <button v-if="item.configuration_route" class="configure-button" type="button" @click="emit('configure', item)">
            <Settings :size="15" aria-hidden="true" />
            前往系统设置
          </button>
          <span v-else class="managed-copy">由系统按任务自动管理</span>
          <details class="technical-details">
            <summary>技术详情</summary>
            <dl>
              <div><dt>内部标识</dt><dd>{{ item.name }}</dd></div>
              <div><dt>发现方式</dt><dd>{{ item.technical?.discovery }}</dd></div>
              <div><dt>入口文件</dt><dd>{{ item.technical?.entry_path }}</dd></div>
              <div v-if="item.runtime"><dt>运行状态</dt><dd>{{ item.runtime.state }}</dd></div>
            </dl>
          </details>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.internal-mcp-catalog { display:grid; gap:12px; width:100%; }
.catalog-summary { min-height:64px; padding:12px 14px; display:flex; align-items:center; justify-content:space-between; gap:16px; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-secondary); }
.summary-copy { display:flex; align-items:center; gap:10px; min-width:0; color:var(--text-primary); }
.summary-copy > div { display:grid; gap:3px; min-width:0; }
.summary-copy strong { font-size:14px; letter-spacing:0; }
.summary-copy span { color:var(--text-secondary); font-size:12px; }
.icon-action { width:32px; height:32px; flex:0 0 32px; display:grid; place-items:center; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-primary); color:var(--text-secondary); cursor:pointer; }
.icon-action:hover:not(:disabled) { color:var(--accent-blue); border-color:var(--accent-blue); }
.icon-action:disabled { opacity:.55; cursor:default; }
.spinning { animation:spin .9s linear infinite; }
.catalog-empty { min-height:160px; display:flex; align-items:center; justify-content:center; gap:8px; color:var(--text-secondary); font-size:13px; }
.mcp-list { display:grid; gap:10px; }
.mcp-item { display:grid; gap:11px; padding:14px; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-primary); }
.mcp-item-header { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; }
.mcp-identity { display:flex; align-items:flex-start; gap:10px; min-width:0; }
.mcp-icon { width:34px; height:34px; flex:0 0 34px; display:grid; place-items:center; border-radius:6px; background:var(--bg-secondary); color:var(--accent-blue); }
.mcp-title-row { display:flex; align-items:center; flex-wrap:wrap; gap:7px; }
.mcp-title-row h3 { margin:0; font-size:14px; line-height:1.35; letter-spacing:0; color:var(--text-primary); }
.protected-label { display:inline-flex; align-items:center; gap:4px; color:#1b7f4b; font-size:11px; }
.mcp-subtitle { margin-top:3px; color:var(--text-tertiary, var(--text-secondary)); font-size:11px; }
.state-label { flex:0 0 auto; padding:3px 7px; border-radius:5px; font-size:11px; font-weight:600; }
.state-label.ok { background:rgba(28,161,90,.1); color:#16834a; }
.state-label.warn { background:rgba(217,133,21,.12); color:#a55e08; }
.state-label.fail { background:rgba(211,59,59,.1); color:#b52d2d; }
.mcp-description { margin:0; color:var(--text-secondary); font-size:12.5px; line-height:1.55; }
.state-detail { padding:7px 9px; border-left:3px solid currentColor; background:var(--bg-secondary); font-size:12px; }
.state-detail.ok { color:#24764c; }.state-detail.warn { color:#9b5a0b; }.state-detail.fail { color:#a73434; }
.scope-row { display:flex; align-items:center; flex-wrap:wrap; gap:7px; }
.section-label { color:var(--text-tertiary, var(--text-secondary)); font-size:11px; font-weight:600; }
.scope-value { padding:2px 6px; border:1px solid var(--border-color); border-radius:4px; color:var(--text-secondary); font-size:11px; }
.tool-section { display:grid; gap:7px; }
.tool-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); border-top:1px solid var(--border-color); border-left:1px solid var(--border-color); }
.tool-row { min-width:0; padding:8px 9px; display:grid; gap:2px; border-right:1px solid var(--border-color); border-bottom:1px solid var(--border-color); }
.tool-row strong { overflow-wrap:anywhere; color:var(--text-primary); font-size:11.5px; letter-spacing:0; }
.tool-row span { color:var(--text-secondary); font-size:11px; line-height:1.4; }
.mcp-footer { min-height:30px; display:flex; align-items:center; justify-content:space-between; gap:12px; }
.configure-button { min-height:30px; padding:5px 9px; display:inline-flex; align-items:center; gap:6px; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-secondary); color:var(--text-primary); font-size:12px; cursor:pointer; }
.configure-button:hover { color:var(--accent-blue); border-color:var(--accent-blue); }
.managed-copy { color:var(--text-tertiary, var(--text-secondary)); font-size:11px; }
.technical-details { max-width:58%; color:var(--text-secondary); font-size:11px; }
.technical-details summary { text-align:right; cursor:pointer; }
.technical-details dl { margin:8px 0 0; padding:8px; display:grid; gap:6px; border:1px solid var(--border-color); border-radius:5px; background:var(--bg-secondary); }
.technical-details dl > div { display:grid; grid-template-columns:64px minmax(0,1fr); gap:7px; }
.technical-details dt { color:var(--text-tertiary, var(--text-secondary)); }
.technical-details dd { margin:0; overflow-wrap:anywhere; color:var(--text-primary); font-family:ui-monospace,SFMono-Regular,Consolas,monospace; }
@keyframes spin { to { transform:rotate(360deg); } }
@media (max-width:680px) {
  .mcp-item { padding:12px; }
  .mcp-item-header { gap:8px; }
  .tool-grid { grid-template-columns:1fr; }
  .mcp-footer { align-items:flex-start; flex-direction:column; }
  .technical-details { width:100%; max-width:none; }
  .technical-details summary { text-align:left; }
}
</style>
