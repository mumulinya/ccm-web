<script setup>
import { computed } from 'vue'

const props = defineProps({
  groupName: { type: String, default: '' },
  tools: { type: Object, default: () => ({ mcp: [], skill: [] }) },
  allTools: { type: Object, default: () => ({ mcp: [], skill: [] }) },
  toolAudit: { type: Object, default: null },
  authorizationReadiness: { type: Object, default: null },
  connectionPreflight: { type: Object, default: null },
  verificationStatus: { type: Object, default: null }
})

const emit = defineEmits(['close', 'save', 'toggle-tool'])

const selectedMcp = computed(() => Array.isArray(props.tools.mcp) ? props.tools.mcp : [])
const selectedSkills = computed(() => Array.isArray(props.tools.skill) ? props.tools.skill : [])
const availableMcpNames = computed(() => new Set((props.allTools.mcp || []).map(tool => tool.name)))
const availableSkillNames = computed(() => new Set((props.allTools.skill || []).map(tool => tool.name)))
const selectedCount = computed(() => selectedMcp.value.length + selectedSkills.value.length)
const runtimeSummary = computed(() => props.verificationStatus?.runtime?.summary || {})
const statusStages = computed(() => [
  {
    label: '授权配置',
    state: selectedCount.value === 0 ? 'empty' : (props.authorizationReadiness?.dispatchReady === false ? 'warning' : 'ready'),
    text: selectedCount.value === 0 ? '尚未配置' : (props.authorizationReadiness?.dispatchReady === false ? '存在不可用项' : '已授权')
  },
  {
    label: '运行时注入',
    state: Number(runtimeSummary.value.overallReady || 0) > 0 ? 'ready' : 'pending',
    text: Number(runtimeSummary.value.overallReady || 0) > 0 ? '已注入' : '等待任务运行'
  },
  {
    label: '真实调用',
    state: props.verificationStatus?.status === 'verified' ? 'ready' : (props.verificationStatus?.status === 'verification_incomplete' ? 'warning' : 'pending'),
    text: props.verificationStatus?.status === 'verified' ? '已验证' : (props.verificationStatus?.status === 'verification_incomplete' ? '调用未通过' : '尚未验证')
  }
])
const connectionText = computed(() => {
  const preflight = props.connectionPreflight || {}
  if (!preflight.schema || selectedCount.value === 0) return ''
  return preflight.ready ? '所选工具当前连接正常' : `有 ${preflight.summary?.needsAttention || 0} 个授权项需要检查连接或认证`
})
const mcpStateLabel = (tool) => tool.connected ? '已连接' : (tool.state === 'auth_required' ? '需要认证' : '连接待检查')

const isSelected = (type, name) => {
  const selected = type === 'mcp' ? selectedMcp.value : selectedSkills.value
  return selected.includes(name)
}

const grantName = (serverName, toolName) => `${serverName}/${toolName}`
const isMcpToolSelected = (serverName, toolName) => {
  return selectedMcp.value.includes(serverName) || selectedMcp.value.includes(grantName(serverName, toolName))
}

const missingMcp = computed(() => selectedMcp.value.filter(name => {
  const server = String(name).split('/')[0]
  return server && !availableMcpNames.value.has(server)
}))

const missingSkills = computed(() => selectedSkills.value.filter(name => !availableSkillNames.value.has(name)))
const readinessLabel = computed(() => {
  const readiness = props.authorizationReadiness || {}
  if (!readiness.schema) return ''
  return readiness.dispatchReady ? '当前授权可派发' : '当前授权需处理缺失项'
})
const readinessDetail = computed(() => {
  const readiness = props.authorizationReadiness || {}
  const missing = readiness.missing || {}
  const total = Number(missing.missing_mcp_servers || 0) + Number(missing.missing_mcp_tools || 0) + Number(missing.missing_skills || 0)
  return readiness.dispatchReady
    ? `MCP ${readiness.available?.mcp || 0}/${readiness.requested?.mcp || 0}，Skill ${readiness.available?.skill || 0}/${readiness.requested?.skill || 0}`
    : `缺失 ${total} 项，保存后任务派发会提示工具不可用`
})
const auditRows = computed(() => {
  const audit = props.toolAudit || {}
  const rows = []
  for (const item of audit.missing_mcp_servers || []) {
    rows.push({ key: `mcp-server:${item.raw || item.server}`, type: 'MCP 服务', value: item.raw || item.server, detail: item.state || 'missing' })
  }
  for (const item of audit.missing_mcp_tools || []) {
    rows.push({ key: `mcp-tool:${item.raw || item.server}:${item.tool}`, type: 'MCP 子工具', value: item.raw || `${item.server}/${item.tool}`, detail: item.state || 'missing_tool' })
  }
  for (const item of audit.missing_skills || []) {
    rows.push({ key: `skill:${item.name}`, type: 'Skill', value: item.name, detail: item.state || 'missing' })
  }
  return rows
})
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal resource-modal">
      <button class="modal-close" @click="emit('close')">&times;</button>
      <h3>🔧 群聊工具配置 - {{ groupName }}</h3>
      <div class="modal-desc">配置此群聊可用的 MCP 和 Skill，执行成员只会收到这里授权的工具。</div>

      <div class="delivery-stages">
        <div v-for="stage in statusStages" :key="stage.label" :class="stage.state">
          <small>{{ stage.label }}</small>
          <strong>{{ stage.text }}</strong>
        </div>
      </div>

      <div class="resource-body">
        <div class="resource-section-title">🔌 MCP 服务器</div>
        <div v-if="(allTools.mcp || []).length === 0" class="resource-empty">暂无 MCP 服务器，请先在工具配置页面安装或启用</div>
        <div v-for="tool in allTools.mcp" :key="tool.name" class="resource-card" :class="{ selected: isSelected('mcp', tool.name) }">
          <label class="resource-row">
            <input type="checkbox" :checked="isSelected('mcp', tool.name)" @change="emit('toggle-tool', 'mcp', tool.name)">
            <span>🔌</span>
            <span class="resource-copy">
              <strong>{{ tool.name }}</strong>
              <small>{{ tool.description || 'MCP server' }}</small>
            </span>
            <span class="tool-state" :class="{ ready: tool.connected, warning: !tool.connected }">{{ mcpStateLabel(tool) }}</span>
          </label>
          <div v-if="tool.tools?.length" class="subtool-list">
            <label v-for="subtool in tool.tools" :key="subtool.name" class="subtool-row" :class="{ selected: isMcpToolSelected(tool.name, subtool.name), disabled: isSelected('mcp', tool.name) }">
              <input
                type="checkbox"
                :disabled="isSelected('mcp', tool.name)"
                :checked="isMcpToolSelected(tool.name, subtool.name)"
                @change="emit('toggle-tool', 'mcp', grantName(tool.name, subtool.name))"
              >
              <span class="subtool-copy">
                <strong>{{ subtool.name }}</strong>
                <small>{{ subtool.description || 'MCP tool' }}</small>
              </span>
            </label>
          </div>
        </div>

        <div v-if="missingMcp.length" class="missing-box">
          <strong>缺失 MCP 授权</strong>
          <span v-for="name in missingMcp" :key="name">{{ name }}</span>
        </div>

        <div class="resource-section-title spaced">⚡ Skills</div>
        <div v-if="(allTools.skill || []).length === 0" class="resource-empty">暂无 Skills，请先在工具配置页面安装或启用</div>
        <label
          v-for="tool in allTools.skill"
          :key="tool.name"
          class="resource-row skill-row"
          :class="{ selected: isSelected('skill', tool.name) }"
        >
          <input type="checkbox" :checked="isSelected('skill', tool.name)" @change="emit('toggle-tool', 'skill', tool.name)">
          <span>⚡</span>
          <span class="resource-copy">
            <strong>{{ tool.name }}</strong>
            <small>{{ tool.description || 'Skill' }}</small>
          </span>
        </label>

        <div v-if="missingSkills.length" class="missing-box">
          <strong>缺失 Skill 授权</strong>
          <span v-for="name in missingSkills" :key="name">{{ name }}</span>
        </div>

        <div v-if="readinessLabel" class="audit-box readiness-box" :class="{ warning: authorizationReadiness && !authorizationReadiness.dispatchReady }">
          <strong>{{ readinessLabel }}</strong>
          <div class="audit-row">
            <span>状态</span>
            <code>{{ authorizationReadiness?.status || '-' }}</code>
            <small>{{ readinessDetail }}</small>
          </div>
        </div>
        <div v-if="connectionText" class="connection-preflight" :class="{ warning: connectionPreflight && !connectionPreflight.ready }">{{ connectionText }}</div>

        <div v-if="auditRows.length" class="audit-box">
          <strong>服务端授权审计</strong>
          <div v-for="row in auditRows" :key="row.key" class="audit-row">
            <span>{{ row.type }}</span>
            <code>{{ row.value }}</code>
            <small>{{ row.detail }}</small>
          </div>
        </div>
      </div>

      <div class="resource-footer">
        <span>已选择 {{ selectedCount }} 个授权项</span>
        <div>
          <button class="btn btn-cancel" @click="emit('close')">取消</button>
          <button class="btn btn-primary" @click="emit('save')">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.18); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 10001; }
.modal { background: rgba(255, 255, 255, 0.75) !important; backdrop-filter: blur(30px) !important; border: 1px solid rgba(0, 0, 0, 0.06) !important; border-radius: 16px !important; padding: 28px; width: min(720px, 92vw); box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08), 0 0 30px rgba(59, 130, 246, 0.04) !important; position: relative; }
.modal-close { position: absolute; top: 16px; right: 16px; width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.05); background: rgba(0,0,0,0.02); color: var(--text-secondary); cursor: pointer; }
.resource-modal { max-height: 82vh; display: flex; flex-direction: column; }
.modal h3 { margin: 0 0 8px; font-size: 16px; color: var(--text-primary); }
.modal-desc, .resource-empty { font-size: 12px; color: var(--text-muted); }
.modal-desc { margin-bottom: 16px; }
.delivery-stages { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin:0 0 16px; }
.delivery-stages > div { min-width:0; display:grid; gap:3px; padding:8px 9px; border:1px solid var(--border-color); border-radius:8px; background:rgba(255,255,255,.52); }
.delivery-stages small { color:var(--text-muted); font-size:10px; }
.delivery-stages strong { color:var(--text-secondary); font-size:11.5px; overflow-wrap:anywhere; }
.delivery-stages .ready { border-color:rgba(16,185,129,.24); background:rgba(236,253,245,.72); }
.delivery-stages .ready strong { color:#047857; }
.delivery-stages .warning { border-color:rgba(245,158,11,.25); background:rgba(255,251,235,.78); }
.delivery-stages .warning strong { color:#92400e; }
.resource-body { flex: 1; overflow-y: auto; padding-right: 2px; }
.resource-section-title { font-size: 13px; font-weight: 700; color: var(--text-secondary); margin-bottom: 10px; }
.resource-section-title.spaced { margin-top: 18px; }
.resource-card { border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 8px; overflow: hidden; transition: all 0.2s; }
.resource-card.selected { border-color: var(--accent-blue); background: rgba(56, 189, 248, 0.05); }
.resource-row { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; color: var(--text-secondary); cursor: pointer; }
.resource-row.selected, .skill-row.selected { border-color: var(--accent-blue); background: rgba(56, 189, 248, 0.05); }
.skill-row { border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 6px; }
.resource-row input, .subtool-row input { margin-top: 2px; accent-color: var(--accent-blue); }
.resource-copy, .subtool-copy { min-width: 0; display: grid; gap: 2px; }
.resource-copy strong, .subtool-copy strong { color: var(--text-primary); font-size: 13px; overflow-wrap: anywhere; }
.tool-state { margin-left:auto; flex:0 0 auto; font-size:10px; color:var(--text-muted); }
.tool-state.ready { color:#047857; }
.tool-state.warning { color:#92400e; }
.resource-copy small, .subtool-copy small { color: var(--text-muted); font-size: 11px; line-height: 1.35; overflow-wrap: anywhere; }
.subtool-list { display: grid; gap: 4px; padding: 0 10px 10px 36px; }
.subtool-row { display: flex; align-items: flex-start; gap: 7px; padding: 7px 8px; border-radius: 6px; border: 1px solid rgba(148, 163, 184, 0.18); background: rgba(255, 255, 255, 0.5); cursor: pointer; }
.subtool-row.selected { border-color: rgba(59, 130, 246, 0.28); background: rgba(59, 130, 246, 0.06); }
.subtool-row.disabled { opacity: 0.72; cursor: default; }
.missing-box { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 12px; padding: 8px; border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.22); background: rgba(245, 158, 11, 0.08); color: #92400e; font-size: 11px; }
.missing-box strong { width: 100%; color: #92400e; }
.missing-box span { padding: 2px 6px; border-radius: 5px; background: rgba(255, 255, 255, 0.55); overflow-wrap: anywhere; }
.audit-box { display: grid; gap: 6px; margin: 8px 0 12px; padding: 10px; border: 1px solid rgba(239, 68, 68, 0.18); border-radius: 8px; background: rgba(254, 242, 242, 0.72); }
.audit-box > strong { color: #991b1b; font-size: 12px; }
.readiness-box { border-color: rgba(16, 185, 129, 0.24); background: rgba(236, 253, 245, 0.78); }
.readiness-box > strong, .readiness-box .audit-row span, .readiness-box .audit-row small, .readiness-box .audit-row code { color: #047857; }
.readiness-box.warning { border-color: rgba(239, 68, 68, 0.18); background: rgba(254, 242, 242, 0.72); }
.readiness-box.warning > strong, .readiness-box.warning .audit-row span, .readiness-box.warning .audit-row small, .readiness-box.warning .audit-row code { color: #991b1b; }
.connection-preflight { margin:8px 0 12px; padding:8px 10px; border-radius:8px; border:1px solid rgba(16,185,129,.24); background:rgba(236,253,245,.78); color:#047857; font-size:11px; }
.connection-preflight.warning { border-color:rgba(245,158,11,.25); background:rgba(255,251,235,.78); color:#92400e; }
.audit-row { display: grid; grid-template-columns: 82px minmax(0, 1fr) auto; gap: 8px; align-items: start; font-size: 11px; }
.audit-row span, .audit-row small { color: #991b1b; }
.audit-row code { color: #7f1d1d; overflow-wrap: anywhere; white-space: normal; }
.resource-empty { padding: 8px; }
.resource-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color); color: var(--text-muted); font-size: 12px; }
.resource-footer > div { display: flex; gap: 8px; }
.btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.btn-primary { background: var(--gradient-blue); color: white; }
.btn-cancel { background: transparent; border: 1px solid rgba(0,0,0,0.08); color: var(--text-secondary); }
@media (max-width: 640px) {
  .modal { padding: 22px; width: 94vw; }
  .delivery-stages { grid-template-columns:1fr; }
  .subtool-list { padding-left: 12px; }
  .audit-row { grid-template-columns: 1fr; gap: 3px; }
  .resource-footer { align-items: stretch; flex-direction: column; }
  .resource-footer > div { width: 100%; }
  .resource-footer .btn { flex: 1; }
}
</style>
