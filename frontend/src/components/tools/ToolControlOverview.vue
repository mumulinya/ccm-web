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
      <div class="health-icon" :class="{ healthy }">
        <ShieldCheck v-if="healthy" :size="20" />
        <CircleAlert v-else :size="20" />
      </div>
      <div class="overview-title-copy">
        <h2>{{ headline }}</h2>
        <p>{{ description }}</p>
      </div>
      <button class="icon-button" type="button" title="刷新运行状态" :disabled="loading" @click="emit('refresh')">
        <RefreshCw :size="15" :class="{ spin: loading }" />
      </button>
    </header>

    <!-- 4 格 KPI 微卡片 -->
    <div class="metric-grid">
      <button type="button" class="metric-card" @click="emit('open', 'mcp')">
        <span class="metric-icon mcp-icon"><Activity :size="16" /></span>
        <div class="metric-body">
          <span>MCP 已连接</span>
          <strong class="font-mono">{{ connected }}/{{ servers.length }}</strong>
        </div>
      </button>

      <button type="button" class="metric-card" @click="emit('open', 'authorization')">
        <span class="metric-icon auth-icon"><ShieldCheck :size="16" /></span>
        <div class="metric-body">
          <span>已配置范围</span>
          <strong class="font-mono">{{ configured }}</strong>
        </div>
      </button>

      <button type="button" class="metric-card" @click="emit('open', 'chain-verification')">
        <span class="metric-icon verify-icon"><CheckCircle2 :size="16" /></span>
        <div class="metric-body">
          <span>真实调用已验证</span>
          <strong class="font-mono">{{ verified }}/{{ configured }}</strong>
        </div>
      </button>

      <button type="button" class="metric-card" @click="emit('open', 'runtime')">
        <span class="metric-icon runtime-icon"><Activity :size="16" /></span>
        <div class="metric-body">
          <span>业务运行时就绪</span>
          <strong class="font-mono">{{ businessRuntimeReady }}/{{ businessRuntimeTotal }}</strong>
        </div>
      </button>
    </div>

    <!-- 下一步行动引导条 -->
    <div class="next-step" :class="{ done: pending === 0 && configured > 0 }">
      <div class="next-step-copy">
        <strong>{{ pending > 0 ? `还有 ${pending} 个范围尚未完成真实调用验证` : (connectionIssues > 0 ? `${connectionIssues} 个 MCP 连接需要处理` : '当前配置范围已完成验证') }}</strong>
        <span>目标验收 <strong class="font-mono">{{ proven }}/{{ requirements.length || 7 }}</strong> 项通过</span>
      </div>
      <button type="button" class="next-action-btn" @click="emit('open', nextAction.target)">
        {{ nextAction.label }}<ArrowRight :size="15" />
      </button>
    </div>

    <details class="technical-overview">
      <summary>技术详情</summary>
      <div class="tech-row">授权异常 {{ auth.needsAttention || 0 }} · 待重同步 {{ chain.runtimeNeedsResync || 0 }} · 越权记录 {{ chain.unauthorizedAttempts || 0 }}</div>
      <div class="tech-row">运行时快照 {{ runtime.total || 0 }} · CLI 就绪 {{ runtime.runtimeReady || 0 }} · 交付就绪 {{ runtime.deliveryReady || 0 }}</div>
    </details>
  </section>
</template>

<style scoped>
.font-mono {
  font-family: var(--font-mono, monospace);
  font-variant-numeric: tabular-nums;
}

.control-overview { display: grid; gap: 14px; }

.overview-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px 0 14px;
  border-bottom: 1px solid var(--border-color);
}

.health-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  color: #d97706;
  background: rgba(245, 158, 11, 0.1);
  border-radius: 8px;
}

.health-icon.healthy {
  color: var(--accent-green, #10b981);
  background: rgba(16, 185, 129, 0.1);
}

.overview-title-copy { min-width: 0; }
h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0;
}

p {
  margin: 2px 0 0;
  color: var(--text-muted);
  font-size: 11.5px;
  line-height: 1.45;
}

.icon-button {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  background: var(--surface);
  color: var(--text-secondary);
  border-radius: 6px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.15s ease;
}

.icon-button:hover:not(:disabled) {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.icon-button:disabled { opacity: 0.5; cursor: not-allowed; }

/* 4 格 KPI 微卡片 */
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.metric-card {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface, var(--bg-card));
  text-align: left;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: all 0.15s ease;
}

.metric-card:hover {
  border-color: color-mix(in srgb, var(--accent-blue) 35%, var(--border-color));
}

.metric-icon {
  flex: 0 0 30px;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 6px;
}

.mcp-icon { background: var(--accent-soft); color: var(--accent-blue); }
.auth-icon { background: rgba(147, 51, 234, 0.1); color: #9333ea; }
.verify-icon { background: rgba(16, 185, 129, 0.1); color: var(--accent-green, #10b981); }
.runtime-icon { background: rgba(8, 145, 178, 0.1); color: #0891b2; }

.metric-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.metric-body span {
  color: var(--text-muted);
  font-size: 10.5px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-body strong {
  margin-top: 1px;
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 700;
}

/* 下一步行动 */
.next-step {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 14px;
  border-radius: 7px;
  border-left: 3px solid #d97706;
  background: rgba(245, 158, 11, 0.08);
}

.next-step.done {
  border-left-color: var(--accent-green, #10b981);
  background: rgba(16, 185, 129, 0.08);
}

.next-step-copy { display: grid; gap: 2px; }
.next-step-copy strong { color: var(--text-primary); font-size: 12px; font-weight: 600; }
.next-step-copy span { color: var(--text-muted); font-size: 10.5px; }

.next-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface);
  color: var(--accent-blue);
  font-size: 11.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.next-action-btn:hover {
  border-color: var(--accent-blue);
}

.technical-overview {
  padding-top: 2px;
  color: var(--text-muted);
  font-size: 10.5px;
  line-height: 1.6;
}

.technical-overview summary {
  cursor: pointer;
  color: var(--text-secondary);
  font-weight: 600;
}

.tech-row { margin-top: 2px; }

.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .next-step { align-items: flex-start; flex-direction: column; }
}
</style>
