<script setup>
import { computed } from 'vue'
import { AlertTriangle, Cable, CheckCircle2, Save, Wrench, X, Zap } from '@lucide/vue'
import EmptyState from './EmptyState.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Agent 工具配置' },
  description: { type: String, default: '只允许当前 Agent 使用明确授权且可用的 MCP 与 Skill。' },
  allTools: { type: Object, default: () => ({ mcp: [], skill: [] }) },
  selectedTools: { type: Object, default: () => ({ mcp: [], skill: [] }) },
  readiness: { type: Object, default: null },
  preflight: { type: Object, default: null },
  busy: { type: Boolean, default: false },
  scopeNote: { type: String, default: '授权只作用于当前 Agent，不会继承其他作用域的授权。' },
})

const emit = defineEmits(['close', 'save', 'toggle-tool'])
const selectedMcp = computed(() => Array.isArray(props.selectedTools?.mcp) ? props.selectedTools.mcp : [])
const selectedSkills = computed(() => Array.isArray(props.selectedTools?.skill) ? props.selectedTools.skill : [])
const selectedCount = computed(() => selectedMcp.value.length + selectedSkills.value.length)
const isSelected = (type, name) => (type === 'mcp' ? selectedMcp.value : selectedSkills.value).includes(name)
const grantName = (server, tool) => `${server}/${tool}`
const isSubtoolSelected = (server, tool) => selectedMcp.value.includes(server) || selectedMcp.value.includes(grantName(server, tool))
const stateLabel = tool => tool.connected ? '已连接' : (tool.state === 'auth_required' ? '需要登录' : '不可用')
const ready = computed(() => props.readiness?.dispatchReady !== false)
const configured = computed(() => Number(props.preflight?.summary?.configured ?? selectedCount.value))
const available = computed(() => Number(props.preflight?.summary?.ready ?? 0))
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="agent-tools-overlay" @click.self="emit('close')">
      <section class="agent-tools-modal" role="dialog" aria-modal="true" :aria-label="title">
        <header>
          <span class="modal-mark"><Wrench :size="19" /></span>
          <div><h3>{{ title }}</h3><p>{{ description }}</p></div>
          <button type="button" class="icon-button" title="关闭" @click="emit('close')"><X :size="18" /></button>
        </header>

        <div class="authorization-summary" :class="{ warning: !ready }">
          <component :is="ready ? CheckCircle2 : AlertTriangle" :size="17" />
          <span><strong>{{ ready ? '授权目录可用' : '授权目录需要处理' }}</strong><small>已配置 {{ configured }} 项，当前可用 {{ available }} 项</small></span>
        </div>

        <div class="agent-tools-content">
          <div class="tool-columns">
          <section class="tool-column">
            <div class="section-title"><Cable :size="16" /><span><strong>MCP</strong><small>外部工具与数据能力</small></span><b>{{ selectedMcp.length }}</b></div>
            <EmptyState v-if="!(allTools.mcp || []).length" title="暂无 MCP" hint="请先在工具配置中安装并连接 MCP" />
            <article v-for="tool in allTools.mcp || []" :key="tool.name" class="tool-card" :class="{ selected: isSelected('mcp', tool.name) }">
              <label>
                <input type="checkbox" :checked="isSelected('mcp', tool.name)" @change="emit('toggle-tool', 'mcp', tool.name)" />
                <span><strong>{{ tool.name }}</strong><small>{{ tool.description || 'MCP server' }}</small></span>
                <em :class="{ ready: tool.connected }">{{ stateLabel(tool) }}</em>
              </label>
              <div v-if="tool.tools?.length" class="subtools">
                <label v-for="subtool in tool.tools" :key="subtool.name">
                  <input type="checkbox" :disabled="isSelected('mcp', tool.name)" :checked="isSubtoolSelected(tool.name, subtool.name)" @change="emit('toggle-tool', 'mcp', grantName(tool.name, subtool.name))" />
                  <span><strong>{{ subtool.name }}</strong><small>{{ subtool.description || 'MCP tool' }}</small></span>
                </label>
              </div>
            </article>
          </section>

          <section class="tool-column">
            <div class="section-title"><Zap :size="16" /><span><strong>Skills</strong><small>由模型按语义选择</small></span><b>{{ selectedSkills.length }}</b></div>
            <EmptyState v-if="!(allTools.skill || []).length" title="暂无 Skill" hint="请先在工具配置中安装 Skill" />
            <label v-for="skill in allTools.skill || []" :key="skill.name" class="skill-row" :class="{ selected: isSelected('skill', skill.name) }">
              <input type="checkbox" :checked="isSelected('skill', skill.name)" @change="emit('toggle-tool', 'skill', skill.name)" />
              <span><strong>{{ skill.name }}</strong><small>{{ skill.description || 'Agent Skill' }}</small></span>
            </label>
          </section>
          </div>
          <slot name="details"></slot>
        </div>

        <footer>
          <p>{{ scopeNote }}</p>
          <div><button type="button" class="btn btn-cancel" :disabled="busy" @click="emit('close')">取消</button><button type="button" class="btn btn-primary" :disabled="busy" @click="emit('save')"><Save :size="15" />{{ busy ? '保存中' : '保存配置' }}</button></div>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.agent-tools-overlay{position:fixed;inset:0;z-index:12000;display:grid;place-items:center;padding:20px;background:rgba(3,7,18,.62);backdrop-filter:blur(5px)}
.agent-tools-modal{width:min(900px,96vw);max-height:min(780px,92vh);display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--border-color);border-radius:8px;background:var(--surface);box-shadow:var(--shadow-lg);color:var(--text-primary)}
header{display:flex;align-items:center;gap:11px;padding:15px 17px;border-bottom:1px solid var(--border-color);background:var(--surface-raised)}
header>div{min-width:0;flex:1}h3,p{margin:0}h3{font-size:15px}header p{margin-top:3px;color:var(--text-muted);font-size:11px}.modal-mark{width:36px;height:36px;display:grid;place-items:center;border:1px solid color-mix(in srgb,var(--accent-blue) 22%,var(--border-color));border-radius:7px;color:var(--accent-blue);background:color-mix(in srgb,var(--accent-blue) 7%,var(--surface))}.icon-button{width:34px;height:34px;border:0;background:transparent;color:var(--text-muted)}
.authorization-summary{display:flex;align-items:center;gap:9px;margin:12px 16px 0;padding:9px 11px;border:1px solid color-mix(in srgb,#16a34a 25%,var(--border-color));border-radius:7px;background:color-mix(in srgb,#16a34a 7%,var(--surface));color:#16a34a}.authorization-summary.warning{border-color:color-mix(in srgb,#d97706 30%,var(--border-color));background:color-mix(in srgb,#d97706 8%,var(--surface));color:#d97706}.authorization-summary span{display:grid;gap:2px}.authorization-summary strong{font-size:11px}.authorization-summary small{color:var(--text-muted);font-size:9.5px}
.agent-tools-content{min-height:0;overflow:auto;padding:12px 16px 16px}.tool-columns{min-height:300px;display:grid;grid-template-columns:1.15fr .85fr;gap:12px}.tool-column{min-width:0;max-height:min(480px,58vh);overflow-y:auto;overscroll-behavior:contain;padding-right:4px}.section-title{position:sticky;top:0;z-index:2;height:40px;display:flex;align-items:center;gap:8px;margin-bottom:7px;padding:0 9px;border-bottom:1px solid var(--border-color);background:var(--surface);color:var(--accent-blue)}.section-title span{min-width:0;display:grid;gap:1px}.section-title strong{color:var(--text-primary);font-size:12px}.section-title small{color:var(--text-muted);font-size:9px}.section-title b{margin-left:auto;min-width:23px;padding:2px 6px;border-radius:5px;background:var(--control-bg);color:var(--text-secondary);font-size:10px;text-align:center}
.tool-card,.skill-row{display:block;margin-bottom:6px;border:1px solid var(--border-color);border-radius:7px;background:var(--surface-raised)}.tool-card.selected,.skill-row.selected{border-color:color-mix(in srgb,var(--accent-blue) 42%,var(--border-color));background:color-mix(in srgb,var(--accent-blue) 6%,var(--surface))}.tool-card>label,.skill-row,.subtools label{display:flex;align-items:flex-start;gap:9px;padding:10px;cursor:pointer}.tool-card input,.skill-row input,.subtools input{margin-top:2px;accent-color:var(--accent-blue)}label>span{min-width:0;flex:1;display:grid;gap:2px}label strong{font-size:11.5px;overflow-wrap:anywhere}label small{color:var(--text-muted);font-size:9.5px;line-height:1.35;overflow-wrap:anywhere}.tool-card em{flex:0 0 auto;color:#d97706;font-size:9px;font-style:normal}.tool-card em.ready{color:#16a34a}.subtools{display:grid;gap:4px;padding:0 9px 9px 32px}.subtools label{padding:7px 8px;border:1px solid color-mix(in srgb,var(--border-color) 75%,transparent);border-radius:6px;background:var(--surface)}
footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 16px;border-top:1px solid var(--border-color);background:var(--surface-raised)}footer p{color:var(--text-muted);font-size:10px}footer>div{display:flex;gap:8px}.btn{display:inline-flex;align-items:center;gap:6px}
@media(max-width:720px){.agent-tools-overlay{padding:8px}.agent-tools-modal{max-height:96vh}.tool-columns{grid-template-columns:1fr}.tool-column{max-height:36vh}footer{align-items:flex-end}footer p{max-width:180px}}
</style>
