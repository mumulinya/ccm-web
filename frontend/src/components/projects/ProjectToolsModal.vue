<script setup>
import { FileCheck2, ShieldCheck, TerminalSquare } from '@lucide/vue'
import AgentToolsModal from '../common/AgentToolsModal.vue'

const props = defineProps({
  projectName: { type: String, default: '' },
  allTools: { type: Object, required: true },
  projectTools: { type: Object, required: true },
  toolAudit: { type: Object, default: null },
  authorizationReadiness: { type: Object, default: null },
  connectionPreflight: { type: Object, default: null },
  verificationStatus: { type: Object, default: null },
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
const updateField = (field, event) => emit('update-field', { field, value: event.target.value })
</script>

<template>
  <AgentToolsModal
    open
    :title="`项目工具配置${projectName ? ` - ${projectName}` : ''}`"
    description="授权项目主 Agent 与开发 Agent 可用的 MCP、Skill，并维护项目执行边界。"
    :all-tools="allTools"
    :selected-tools="projectTools"
    :readiness="authorizationReadiness"
    :preflight="connectionPreflight"
    scope-note="授权和执行约束只作用于当前项目；群聊引用该项目时读取这里的项目级配置。"
    @close="emit('close')"
    @save="emit('save')"
    @toggle-tool="(type, name) => emit('toggle-tool', type, name)"
  >
    <template #details>
      <section class="project-constraints">
        <div class="constraint-heading">
          <ShieldCheck :size="17" />
          <span><strong>项目执行约束</strong><small>随任务派发给开发 Agent，并参与主 Agent 验收</small></span>
        </div>

        <div class="constraint-grid">
          <label class="wide">
            <span>项目职责</span>
            <textarea :value="responsibility" rows="2" placeholder="说明该项目负责的业务边界" @input="updateField('responsibility', $event)"></textarea>
          </label>
          <label>
            <span>能力清单</span>
            <textarea :value="capabilities" rows="4" placeholder="每行一个，例如：前端页面、支付接口" @input="updateField('capabilities', $event)"></textarea>
          </label>
          <label>
            <span>允许写入路径</span>
            <textarea class="mono" :value="writablePaths" rows="4" placeholder="留空不限制，例如：src/**" @input="updateField('writablePaths', $event)"></textarea>
          </label>
          <label>
            <span>禁止触碰路径</span>
            <textarea class="mono" :value="forbiddenPaths" rows="4" placeholder="例如：.env、dist/**" @input="updateField('forbiddenPaths', $event)"></textarea>
          </label>
          <label>
            <span>交付规范</span>
            <textarea :value="deliveryContract" rows="4" placeholder="说明交付必须包含的证据、截图、接口验证和风险" @input="updateField('deliveryContract', $event)"></textarea>
          </label>
        </div>

        <div class="verification-panel">
          <div class="verification-title">
            <TerminalSquare :size="16" />
            <span><strong>项目验证命令</strong><small>TestAgent 和项目主 Agent 只采信真实执行结果</small></span>
          </div>
          <textarea
            class="mono"
            :value="verificationCommands"
            rows="4"
            placeholder="每行一条，例如：npm run check、npm test、npm run build"
            @input="updateField('verificationCommands', $event)"
          ></textarea>
          <div v-if="inferredCommands.length" class="inferred-commands">
            <div><FileCheck2 :size="15" /><span>{{ verificationSource === 'configured' ? '系统还识别到这些可用命令' : '系统识别到可采用的验证命令' }}</span></div>
            <button type="button" @click="emit('apply-inferred')">采用推断命令</button>
            <code v-for="command in inferredCommands" :key="command">{{ command }}</code>
          </div>
        </div>
      </section>
    </template>
  </AgentToolsModal>
</template>

<style scoped>
.project-constraints{display:grid;gap:12px;margin-top:14px;padding-top:14px;border-top:1px solid var(--border-color)}
.constraint-heading,.verification-title{display:flex;align-items:center;gap:8px;color:var(--accent-blue)}
.constraint-heading span,.verification-title span{display:grid;gap:2px}.constraint-heading strong,.verification-title strong{color:var(--text-primary);font-size:12px}.constraint-heading small,.verification-title small{color:var(--text-muted);font-size:9.5px}
.constraint-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.constraint-grid label{display:grid;gap:5px}.constraint-grid .wide{grid-column:1/-1}.constraint-grid label>span{color:var(--text-secondary);font-size:10.5px;font-weight:700}
textarea{width:100%;resize:vertical;box-sizing:border-box;border:1px solid var(--border-color);border-radius:7px;padding:9px 10px;background:var(--control-bg);color:var(--text-primary);font:inherit;font-size:11px;line-height:1.5}textarea:focus{outline:2px solid color-mix(in srgb,var(--accent-blue) 18%,transparent);border-color:var(--accent-blue)}.mono{font-family:var(--font-mono,monospace)}
.verification-panel{display:grid;gap:8px;padding:11px;border:1px solid var(--border-color);border-radius:7px;background:var(--surface-raised)}
.inferred-commands{display:flex;flex-wrap:wrap;align-items:center;gap:6px}.inferred-commands>div{display:flex;align-items:center;gap:6px;margin-right:auto;color:var(--text-secondary);font-size:10px}.inferred-commands button{border:1px solid var(--border-color);border-radius:6px;padding:5px 8px;background:var(--control-bg);color:var(--text-secondary);font-size:10px;cursor:pointer}.inferred-commands code{padding:4px 6px;border-radius:5px;background:var(--panel-muted);color:var(--text-secondary);font-size:9.5px}
@media(max-width:720px){.constraint-grid{grid-template-columns:1fr}.constraint-grid .wide{grid-column:auto}}
</style>
