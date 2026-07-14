<script setup>
import { computed } from 'vue'
import { Activity, ArrowRight, CheckCircle2, CircleAlert, RefreshCw, ShieldCheck } from '@lucide/vue'

const props = defineProps({
  toolStatus: { type: Object, default: () => ({ servers: [] }) },
  authorization: { type: Object, default: () => ({ summary: {} }) },
  verification: { type: Object, default: () => ({ summary: {}, rows: [] }) },
  runtime: { type: Object, default: () => ({ summary: {} }) },
  goalAudit: { type: Object, default: () => ({ requirements: [] }) },
  loading: Boolean,
})

const emit = defineEmits(['open', 'refresh'])
const auth = computed(() => props.authorization?.summary || {})
const chain = computed(() => props.verification?.summary || {})
const runtime = computed(() => props.runtime?.summary || {})
const configured = computed(() => Number(chain.value.configuredScopes ?? auth.value.configuredScopes ?? 0))
const verified = computed(() => Number(chain.value.verified || 0))
const pending = computed(() => Math.max(0, configured.value - verified.value))
const servers = computed(() => Array.isArray(props.toolStatus?.servers) ? props.toolStatus.servers : [])
const connected = computed(() => servers.value.filter(item => item.connected || item.state === 'connected').length)
const connectionIssues = computed(() => servers.value.filter(item => item.enabled !== false && !(item.connected || item.state === 'connected')).length)
const requirements = computed(() => Array.isArray(props.goalAudit?.requirements) ? props.goalAudit.requirements : [])
const proven = computed(() => requirements.value.filter(item => item.status === 'proven').length)
const configuredRows = computed(() => (Array.isArray(props.verification?.rows) ? props.verification.rows : []).filter(row => Number(row?.counts?.mcp || 0) + Number(row?.counts?.skill || 0) > 0))
const businessRuntimeTotal = computed(() => configuredRows.value.reduce((sum, row) => sum + Number(row?.runtime?.summary?.total || 0), 0))
const businessRuntimeReady = computed(() => configuredRows.value.reduce((sum, row) => sum + Number(row?.runtime?.summary?.overallReady || 0), 0))
const scopeComplete = computed(() => configured.value > 0 && pending.value === 0 && Number(chain.value.needsAttention || 0) === 0)
const healthy = computed(() => scopeComplete.value && connectionIssues.value === 0)
const headline = computed(() => healthy.value ? '工具链路运行正常' : (scopeComplete.value ? '业务工具链已验证，仍有连接需处理' : '工具链路仍有待完成项'))
const description = computed(() => healthy.value
  ? '项目和群聊已完成授权、运行时同步与真实调用验证。'
  : (scopeComplete.value ? '已配置业务范围可以正常使用，处理剩余连接后工具中心将全部恢复。' : '配置已经接入，继续完成下方待办后即可稳定交给 Agent 使用。'))
const nextAction = computed(() => {
  if (connectionIssues.value > 0) return { label: '处理 MCP 连接', target: 'mcp' }
  if (Number(auth.value.needsAttention || 0) > 0) return { label: '处理授权问题', target: 'authorization' }
  if (Number(chain.value.runtimeNeedsResync || 0) > 0) return { label: '同步运行时', target: 'runtime' }
  if (pending.value > 0) return { label: '完成真实调用验收', target: 'chain-verification' }
  return { label: '查看链路验收', target: 'chain-verification' }
})
</script>

<template>
  <section class="control-overview" data-testid="tool-control-overview">
    <header class="overview-head">
      <div class="health-icon" :class="{ healthy }"><ShieldCheck v-if="healthy" :size="22" /><CircleAlert v-else :size="22" /></div>
      <div>
        <h2>{{ headline }}</h2>
        <p>{{ description }}</p>
      </div>
      <button class="icon-button" type="button" title="刷新运行状态" :disabled="loading" @click="emit('refresh')"><RefreshCw :size="17" :class="{ spin: loading }" /></button>
    </header>

    <div class="metric-grid">
      <button type="button" @click="emit('open', 'mcp')"><Activity :size="17" /><strong>{{ connected }}/{{ servers.length }}</strong><span>MCP 已连接</span></button>
      <button type="button" @click="emit('open', 'authorization')"><ShieldCheck :size="17" /><strong>{{ configured }}</strong><span>已配置范围</span></button>
      <button type="button" @click="emit('open', 'chain-verification')"><CheckCircle2 :size="17" /><strong>{{ verified }}/{{ configured }}</strong><span>真实调用已验证</span></button>
      <button type="button" @click="emit('open', 'runtime')"><Activity :size="17" /><strong>{{ businessRuntimeReady }}/{{ businessRuntimeTotal }}</strong><span>业务运行时就绪</span></button>
    </div>

    <div class="next-step" :class="{ done: pending === 0 && configured > 0 }">
      <div>
        <strong>{{ pending > 0 ? `还有 ${pending} 个范围尚未完成真实调用验证` : (connectionIssues > 0 ? `${connectionIssues} 个 MCP 连接需要处理` : '当前配置范围已完成验证') }}</strong>
        <span>目标验收 {{ proven }}/{{ requirements.length || 7 }} 项通过</span>
      </div>
      <button type="button" @click="emit('open', nextAction.target)">{{ nextAction.label }}<ArrowRight :size="16" /></button>
    </div>

    <details class="technical-overview">
      <summary>技术详情</summary>
      <div>授权异常 {{ auth.needsAttention || 0 }} · 待重同步 {{ chain.runtimeNeedsResync || 0 }} · 越权记录 {{ chain.unauthorizedAttempts || 0 }}</div>
      <div>运行时快照 {{ runtime.total || 0 }} · CLI 就绪 {{ runtime.runtimeReady || 0 }} · 交付就绪 {{ runtime.deliveryReady || 0 }}</div>
    </details>
  </section>
</template>

<style scoped>
.control-overview { display: grid; gap: 18px; }
.overview-head { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 13px; padding: 18px 0; border-bottom: 1px solid var(--border-color, rgba(0,0,0,.08)); }
.health-icon { width: 42px; height: 42px; display: grid; place-items: center; color: #b45309; background: rgba(245,158,11,.1); border-radius: 8px; }
.health-icon.healthy { color: #047857; background: rgba(16,185,129,.1); }
h2 { margin: 0; color: var(--text-primary); font-size: 17px; letter-spacing: 0; }
p { margin: 5px 0 0; color: var(--text-muted); font-size: 12px; line-height: 1.5; }
.icon-button { width: 34px; height: 34px; border: 1px solid var(--border-color, rgba(0,0,0,.1)); background: transparent; color: var(--text-secondary); border-radius: 6px; display: grid; place-items: center; cursor: pointer; }
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border: 1px solid var(--border-color, rgba(0,0,0,.08)); border-radius: 8px; overflow: hidden; }
.metric-grid button { min-width: 0; min-height: 88px; padding: 14px; display: grid; grid-template-columns: auto 1fr; gap: 4px 8px; align-items: center; text-align: left; border: 0; border-right: 1px solid var(--border-color, rgba(0,0,0,.08)); background: rgba(255,255,255,.25); color: var(--text-secondary); cursor: pointer; }
.metric-grid button:last-child { border-right: 0; }
.metric-grid strong { color: var(--text-primary); font-size: 19px; }
.metric-grid span { grid-column: 1 / -1; color: var(--text-muted); font-size: 11px; }
.next-step { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 16px; border-left: 3px solid #d97706; background: rgba(245,158,11,.07); }
.next-step.done { border-left-color: #059669; background: rgba(16,185,129,.07); }
.next-step div { display: grid; gap: 4px; }
.next-step strong { color: var(--text-primary); font-size: 13px; }
.next-step span { color: var(--text-muted); font-size: 11px; }
.next-step button { display: inline-flex; align-items: center; gap: 6px; border: 0; background: transparent; color: var(--accent-blue, #2563eb); font-weight: 600; cursor: pointer; white-space: nowrap; }
.technical-overview { padding-top: 4px; color: var(--text-muted); font-size: 11px; line-height: 1.7; }
.technical-overview summary { cursor: pointer; color: var(--text-secondary); }
.spin { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 720px) {
  .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .metric-grid button:nth-child(2) { border-right: 0; }
  .metric-grid button:nth-child(-n+2) { border-bottom: 1px solid var(--border-color, rgba(0,0,0,.08)); }
  .next-step { align-items: flex-start; flex-direction: column; }
}
</style>
