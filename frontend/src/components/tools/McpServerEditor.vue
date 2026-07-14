<script setup>
import { computed, ref, watch } from 'vue'
import { Save, ShieldAlert, TestTubeDiagonal, X } from '@lucide/vue'
import { toolsApi } from '../../api/index.js'
import { toast } from '../../utils/toast.js'

const props = defineProps({ open: Boolean, tool: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])
const form = ref({ name: '', description: '', command: '', args: '', env: '', clearEnv: false })
const testing = ref(false)
const saving = ref(false)
const impact = ref(null)
const isEditing = computed(() => !!props.tool?.name)

watch(() => [props.open, props.tool], () => {
  if (!props.open) return
  form.value = {
    name: props.tool?.name || '',
    description: props.tool?.description || '',
    command: props.tool?.command || '',
    args: Array.isArray(props.tool?.args) ? props.tool.args.join('\n') : '',
    env: '',
    clearEnv: false,
  }
  impact.value = null
  if (props.tool?.name) previewImpact()
}, { immediate: true, deep: true })

const payload = () => ({
  name: form.value.name.trim(),
  description: form.value.description.trim(),
  command: form.value.command.trim(),
  args: form.value.args.split(/\r?\n/).map(item => item.trim()).filter(Boolean),
  ...(form.value.env.trim() ? { env: form.value.env } : {}),
  clearEnv: form.value.clearEnv,
  enabled: props.tool?.enabled !== false,
  createOnly: !isEditing.value,
})

async function previewImpact() {
  if (!form.value.name.trim()) return
  try { impact.value = await toolsApi.catalogImpact({ action: isEditing.value ? 'update' : 'create', type: 'mcp', name: form.value.name.trim() }) } catch {}
}

async function testConnection() {
  testing.value = true
  try {
    const result = await toolsApi.mcp.test(payload())
    if (!result.success) throw new Error(result.error || '连接失败')
    toast.success(`连接成功，发现 ${result.tools?.length || 0} 个工具`)
  } catch (error) { toast.error(`连接测试失败：${error.message}`) }
  finally { testing.value = false }
}

async function save() {
  if (!form.value.name.trim() || !form.value.command.trim()) return toast.warning('请填写名称和启动命令')
  saving.value = true
  try {
    await previewImpact()
    const result = await toolsApi.mcp.create(payload())
    toast.success(result.reload?.runtimeResync?.success === false ? '配置已保存，部分运行时同步失败' : 'MCP 配置已保存并同步')
    emit('saved', result)
    emit('close')
  } catch (error) { toast.error(`保存失败：${error.message}`) }
  finally { saving.value = false }
}
</script>

<template>
  <div v-if="open" class="editor-overlay" role="presentation" @click.self="emit('close')">
    <section class="editor" role="dialog" aria-modal="true" :aria-label="isEditing ? '编辑 MCP 服务器' : '添加 MCP 服务器'">
      <header><div><h3>{{ isEditing ? '编辑 MCP 服务器' : '添加 MCP 服务器' }}</h3><p>凭据只保存在本机加密存储中，不会返回浏览器。</p></div><button type="button" title="关闭" @click="emit('close')"><X :size="18" /></button></header>
      <div class="editor-body">
        <label><span>名称</span><input v-model="form.name" :disabled="isEditing" placeholder="例如 mcp-feishu"></label>
        <label><span>描述</span><input v-model="form.description" placeholder="这个连接供 Agent 完成什么工作"></label>
        <label><span>启动命令</span><input v-model="form.command" class="mono" placeholder="例如 npx @modelcontextprotocol/server-filesystem"></label>
        <label><span>启动参数</span><textarea v-model="form.args" class="mono" rows="3" placeholder="每行一个参数"></textarea></label>
        <label><span>环境变量</span><textarea v-model="form.env" class="mono" rows="4" placeholder="KEY=value，每行一项；留空保留已保存凭据"></textarea><small v-if="tool?.envConfigured">已安全保存 {{ tool.envKeys?.length || 0 }} 项：{{ tool.envKeys?.join('、') }}</small></label>
        <label v-if="tool?.envConfigured" class="clear-env"><input v-model="form.clearEnv" type="checkbox"><span>清除所有已保存环境变量</span></label>
        <div v-if="impact?.authorizationImpact?.summary?.scopeCount" class="impact"><ShieldAlert :size="17" /><div><strong>会影响 {{ impact.authorizationImpact.summary.scopeCount }} 个已授权范围</strong><span>保存后系统会自动重载工具并同步相关 Agent 运行时。</span></div></div>
      </div>
      <footer><button type="button" class="secondary" :disabled="testing || saving" @click="testConnection"><TestTubeDiagonal :size="16" />{{ testing ? '测试中' : '保存前测试' }}</button><button type="button" class="primary" :disabled="testing || saving" @click="save"><Save :size="16" />{{ saving ? '保存并同步中' : '保存并同步' }}</button></footer>
    </section>
  </div>
</template>

<style scoped>
.editor-overlay { position: fixed; inset: 0; z-index: 10020; display: grid; place-items: center; padding: 20px; background: rgba(15,23,42,.28); backdrop-filter: blur(8px); }
.editor { width: min(620px, 100%); max-height: min(88vh, 760px); display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--border-color, rgba(0,0,0,.1)); border-radius: 8px; background: var(--bg-primary, #fff); box-shadow: 0 22px 60px rgba(15,23,42,.18); }
header, footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--border-color, rgba(0,0,0,.08)); }
header h3 { margin: 0; color: var(--text-primary); font-size: 15px; }
header p { margin: 4px 0 0; color: var(--text-muted); font-size: 11px; }
header button { width: 32px; height: 32px; display: grid; place-items: center; border: 0; background: transparent; color: var(--text-secondary); cursor: pointer; }
.editor-body { display: grid; gap: 14px; padding: 18px; overflow: auto; }
label { display: grid; gap: 6px; color: var(--text-secondary); font-size: 12px; }
input, textarea { width: 100%; box-sizing: border-box; border: 1px solid var(--border-color, rgba(0,0,0,.1)); border-radius: 6px; padding: 9px 10px; background: var(--bg-secondary, rgba(255,255,255,.7)); color: var(--text-primary); font: inherit; resize: vertical; }
.mono { font-family: 'Share Tech Mono', monospace; }
small { color: var(--text-muted); overflow-wrap: anywhere; }
.clear-env { grid-template-columns: auto 1fr; align-items: center; }
.clear-env input { width: 15px; height: 15px; }
.impact { display: flex; align-items: flex-start; gap: 9px; padding: 11px 12px; border-left: 3px solid #d97706; background: rgba(245,158,11,.08); color: #b45309; }
.impact div { display: grid; gap: 3px; }.impact strong { font-size: 12px; }.impact span { color: var(--text-secondary); font-size: 11px; }
footer { justify-content: flex-end; border-top: 1px solid var(--border-color, rgba(0,0,0,.08)); border-bottom: 0; }
footer button { display: inline-flex; align-items: center; gap: 7px; min-height: 34px; padding: 0 13px; border-radius: 6px; cursor: pointer; }
.secondary { border: 1px solid var(--border-color, rgba(0,0,0,.1)); background: transparent; color: var(--text-secondary); }.primary { border: 0; background: var(--accent-blue, #2563eb); color: #fff; }
@media (max-width: 560px) { .editor-overlay { padding: 0; place-items: end stretch; }.editor { width: 100%; max-height: 94vh; border-radius: 8px 8px 0 0; } footer { display: grid; grid-template-columns: 1fr 1fr; } footer button { justify-content: center; } }
</style>
