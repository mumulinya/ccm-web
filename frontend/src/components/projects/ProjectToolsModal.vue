<script setup>
import { computed } from 'vue'

const props = defineProps({
  projectName: { type: String, default: '' },
  allTools: { type: Object, required: true },
  projectTools: { type: Object, required: true },
  toolAudit: { type: Object, default: null },
  authorizationReadiness: { type: Object, default: null },
  responsibility: { type: String, default: '' },
  capabilities: { type: String, default: '' },
  writablePaths: { type: String, default: '' },
  forbiddenPaths: { type: String, default: '' },
  deliveryContract: { type: String, default: '' },
  verificationCommands: { type: String, default: '' },
  inferredCommands: { type: Array, default: () => [] },
  verificationSource: { type: String, default: 'missing' },
})

const emit = defineEmits(['close', 'save', 'toggle-tool', 'apply-inferred', 'update-field'])

const selectedMcp = computed(() => Array.isArray(props.projectTools.mcp) ? props.projectTools.mcp : [])
const selectedSkills = computed(() => Array.isArray(props.projectTools.skill) ? props.projectTools.skill : [])
const availableMcpNames = computed(() => new Set((props.allTools.mcp || []).map(tool => tool.name)))
const availableSkillNames = computed(() => new Set((props.allTools.skill || []).map(tool => tool.name)))
const selectedToolCount = computed(() => selectedMcp.value.length + selectedSkills.value.length)

const isToolSelected = (type, name) => {
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
const splitCount = (value) => String(value || '').split(/\r?\n|[；;]/).filter(Boolean).length
const updateField = (field, event) => emit('update-field', { field, value: event.target.value })
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal project-tools-modal">
      <button class="modal-close" @click="emit('close')">&times;</button>
      <h3>🔧 项目工具配置 - {{ projectName }}</h3>
      <div class="modal-desc">配置此项目可用的工具，Agent 将能使用这些工具</div>

      <div class="tools-body">
        <div class="tool-section">
          <div class="tool-section-title">🔌 MCP 服务器</div>
          <div v-if="allTools.mcp.length === 0" class="empty-row">暂无 MCP 服务器，请先在工具配置页面添加</div>
          <div
            v-for="tool in allTools.mcp"
            :key="tool.name"
            class="tool-card"
            :class="{ selected: isToolSelected('mcp', tool.name) }"
          >
            <label class="tool-row">
              <input type="checkbox" :checked="isToolSelected('mcp', tool.name)" @change="emit('toggle-tool', 'mcp', tool.name)">
              <span>🔌</span>
              <div>
                <strong>{{ tool.name }}</strong>
                <small>{{ tool.description || '' }}</small>
              </div>
            </label>
            <div v-if="tool.tools?.length" class="subtool-list">
              <label v-for="subtool in tool.tools" :key="subtool.name" class="subtool-row" :class="{ selected: isMcpToolSelected(tool.name, subtool.name), disabled: isToolSelected('mcp', tool.name) }">
                <input
                  type="checkbox"
                  :disabled="isToolSelected('mcp', tool.name)"
                  :checked="isMcpToolSelected(tool.name, subtool.name)"
                  @change="emit('toggle-tool', 'mcp', grantName(tool.name, subtool.name))"
                >
                <div>
                  <strong>{{ subtool.name }}</strong>
                  <small>{{ subtool.description || 'MCP tool' }}</small>
                </div>
              </label>
            </div>
          </div>
          <div v-if="missingMcp.length" class="stale-grants">
            <strong>缺失 MCP 授权</strong>
            <span v-for="name in missingMcp" :key="name">{{ name }}</span>
          </div>
        </div>

        <div class="tool-section">
          <div class="tool-section-title">⚡ Skills</div>
          <div v-if="allTools.skill.length === 0" class="empty-row">暂无 Skills，请先在工具配置页面添加</div>
          <label
            v-for="tool in allTools.skill"
            :key="tool.name"
            class="tool-row"
            :class="{ selected: isToolSelected('skill', tool.name) }"
          >
            <input type="checkbox" :checked="isToolSelected('skill', tool.name)" @change="emit('toggle-tool', 'skill', tool.name)">
            <span>⚡</span>
            <div>
              <strong>{{ tool.name }}</strong>
              <small>{{ tool.description || '' }}</small>
            </div>
          </label>
          <div v-if="missingSkills.length" class="stale-grants">
            <strong>缺失 Skill 授权</strong>
            <span v-for="name in missingSkills" :key="name">{{ name }}</span>
          </div>
        </div>

        <div v-if="readinessLabel" class="audit-box readiness-box" :class="{ warning: authorizationReadiness && !authorizationReadiness.dispatchReady }">
          <strong>{{ readinessLabel }}</strong>
          <div class="audit-row">
            <span>状态</span>
            <code>{{ authorizationReadiness?.status || '-' }}</code>
            <small>{{ readinessDetail }}</small>
          </div>
        </div>

        <div v-if="auditRows.length" class="audit-box">
          <strong>服务端授权审计</strong>
          <div v-for="row in auditRows" :key="row.key" class="audit-row">
            <span>{{ row.type }}</span>
            <code>{{ row.value }}</code>
            <small>{{ row.detail }}</small>
          </div>
        </div>

        <div class="tool-section">
          <div class="tool-section-title">项目 Agent 能力边界</div>
          <div class="boundary-grid">
            <label>
              <span>职责范围</span>
              <textarea :value="responsibility" rows="3" placeholder="说明这个项目 Agent 负责哪些业务、模块或技术栈" @input="updateField('responsibility', $event)"></textarea>
            </label>
            <label>
              <span>能力标签</span>
              <textarea :value="capabilities" rows="3" placeholder="每行一个，如：前端页面&#10;支付接口&#10;数据库迁移" @input="updateField('capabilities', $event)"></textarea>
            </label>
            <label>
              <span>允许写入路径</span>
              <textarea :value="writablePaths" rows="3" class="mono" placeholder="留空不限制；如：src/**&#10;package.json" @input="updateField('writablePaths', $event)"></textarea>
            </label>
            <label>
              <span>禁止触碰路径</span>
              <textarea :value="forbiddenPaths" rows="3" class="mono" placeholder="如：.env&#10;node_modules/**&#10;dist/**" @input="updateField('forbiddenPaths', $event)"></textarea>
            </label>
          </div>
          <label class="delivery-contract">
            <span>交付规范</span>
            <textarea :value="deliveryContract" rows="3" placeholder="说明这个 Agent 结果说明里必须包含的业务证据、截图、接口验证或风险说明" @input="updateField('deliveryContract', $event)"></textarea>
          </label>
          <div class="helper-text">主 Agent 派发任务时会把这些配置写入子 Agent 工作单；如果配置了路径边界，交付验收会检查实际文件变更是否越界。</div>
        </div>

        <div class="tool-section">
          <div class="tool-section-title">✅ 项目验证命令</div>
          <textarea
            :value="verificationCommands"
            rows="4"
            class="mono verification-input"
            placeholder="每行一条，例如：&#10;npm run check&#10;npm test&#10;npm run build"
            @input="updateField('verificationCommands', $event)"
          ></textarea>
          <div class="helper-text">子 Agent 执行 daily_dev 任务时会优先参考这些命令；留空时系统会尝试从项目文件推断。</div>
          <div v-if="inferredCommands.length" class="inferred-box">
            <div class="inferred-head">
              <span>{{ verificationSource === 'configured' ? '系统也推断出以下验证命令' : '可采用系统推断的验证命令' }}</span>
              <button class="btn btn-outline btn-sm" @click="emit('apply-inferred')">采用推断命令</button>
            </div>
            <div class="inferred-list">
              <code v-for="cmd in inferredCommands" :key="cmd">{{ cmd }}</code>
            </div>
          </div>
          <div v-else class="missing-box">当前工作目录没有推断出验证命令，建议手动填写最小可用的检查命令，例如构建、类型检查或测试命令。</div>
        </div>
      </div>

      <div class="tools-footer">
        <div>已选择 {{ selectedToolCount }} 个工具授权 · {{ splitCount(capabilities) }} 个能力 · {{ splitCount(verificationCommands) }} 条验证命令</div>
        <div>
          <button class="btn btn-cancel" @click="emit('close')">取消</button>
          <button class="btn btn-primary" @click="emit('save')">保存配置</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-tools-modal {
  min-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-desc {
  margin-bottom: 16px;
  color: var(--text-muted);
  font-size: 12px;
}

.tools-body {
  flex: 1;
  overflow-y: auto;
}

.tool-section {
  margin-bottom: 20px;
}

.tool-section-title {
  margin-bottom: 10px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
}

.empty-row {
  padding: 8px;
  color: var(--text-muted);
  font-size: 12px;
}

.tool-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
  padding: 10px 12px;
  cursor: pointer;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  transition: all 0.2s;
}

.tool-card {
  margin-bottom: 8px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
}

.tool-card.selected {
  border-color: var(--accent-blue);
  background: rgba(56, 189, 248, 0.05);
}

.tool-card .tool-row {
  margin-bottom: 0;
  border: 0;
  border-radius: 0;
}

.tool-row.selected {
  border-color: var(--accent-blue);
  background: rgba(56, 189, 248, 0.05);
}

.tool-row input {
  accent-color: var(--accent-blue);
}

.tool-row div {
  flex: 1;
  min-width: 0;
}

.tool-row strong {
  display: block;
  color: var(--text-primary);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.tool-row small {
  display: block;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.subtool-list {
  display: grid;
  gap: 4px;
  padding: 0 10px 10px 38px;
}

.subtool-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 7px 8px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.52);
  cursor: pointer;
}

.subtool-row.selected {
  border-color: rgba(59, 130, 246, 0.28);
  background: rgba(59, 130, 246, 0.06);
}

.subtool-row.disabled {
  opacity: 0.72;
  cursor: default;
}

.subtool-row input {
  margin-top: 2px;
  accent-color: var(--accent-blue);
}

.subtool-row div {
  min-width: 0;
}

.subtool-row strong {
  display: block;
  color: var(--text-primary);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.subtool-row small {
  display: block;
  color: var(--text-muted);
  font-size: 10.5px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.stale-grants {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0 12px;
  padding: 8px;
  border: 1px solid rgba(234, 179, 8, 0.2);
  border-radius: 8px;
  background: rgba(234, 179, 8, 0.06);
  color: #92400e;
  font-size: 11px;
}

.stale-grants strong {
  width: 100%;
}

.stale-grants span {
  max-width: 100%;
  padding: 2px 6px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.6);
  overflow-wrap: anywhere;
}

.audit-box {
  display: grid;
  gap: 6px;
  margin-bottom: 20px;
  padding: 10px;
  border: 1px solid rgba(239, 68, 68, 0.18);
  border-radius: 8px;
  background: rgba(254, 242, 242, 0.72);
}

.audit-box > strong {
  color: #991b1b;
  font-size: 12px;
}

.readiness-box {
  border-color: rgba(16, 185, 129, 0.24);
  background: rgba(236, 253, 245, 0.78);
}

.readiness-box > strong,
.readiness-box .audit-row span,
.readiness-box .audit-row small,
.readiness-box .audit-row code {
  color: #047857;
}

.readiness-box.warning {
  border-color: rgba(239, 68, 68, 0.18);
  background: rgba(254, 242, 242, 0.72);
}

.readiness-box.warning > strong,
.readiness-box.warning .audit-row span,
.readiness-box.warning .audit-row small,
.readiness-box.warning .audit-row code {
  color: #991b1b;
}

.audit-row {
  display: grid;
  grid-template-columns: 82px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: start;
  font-size: 11px;
}

.audit-row span,
.audit-row small {
  color: #991b1b;
}

.audit-row code {
  color: #7f1d1d;
  overflow-wrap: anywhere;
  white-space: normal;
}

.boundary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 10px;
}

.boundary-grid label,
.delivery-contract {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.boundary-grid span,
.delivery-contract span {
  color: var(--text-muted);
  font-size: 11px;
}

textarea {
  width: 100%;
  padding: 9px 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.85);
  color: var(--text-primary);
  font-size: 12px;
  resize: vertical;
  outline: none;
}

.mono {
  font-family: monospace;
}

.verification-input {
  padding: 10px 12px;
}

.helper-text {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.45;
}

.inferred-box,
.missing-box {
  margin-top: 8px;
  padding: 8px;
  border-radius: 8px;
  font-size: 11px;
  line-height: 1.45;
}

.inferred-box {
  border: 1px solid rgba(59, 130, 246, 0.16);
  background: rgba(59, 130, 246, 0.06);
}

.inferred-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  color: var(--text-secondary);
  font-weight: 700;
}

.inferred-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.inferred-list code {
  padding: 3px 6px;
  overflow-wrap: anywhere;
  border: 1px solid rgba(59, 130, 246, 0.12);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.72);
  color: #075985;
  font-size: 10.5px;
}

.missing-box {
  border: 1px solid rgba(234, 179, 8, 0.2);
  background: rgba(234, 179, 8, 0.06);
  color: var(--text-secondary);
}

.tools-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.tools-footer > div:first-child {
  color: var(--text-muted);
  font-size: 12px;
}

.tools-footer > div:last-child {
  display: flex;
  gap: 8px;
}
</style>
