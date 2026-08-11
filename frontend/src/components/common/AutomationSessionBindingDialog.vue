<script setup>
import { computed, ref, watch } from 'vue'
import { Link2, ListTodo, X } from '@lucide/vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  scope: { type: String, required: true },
  scopeId: { type: String, required: true },
  session: { type: Object, default: null },
})
const emit = defineEmits(['close', 'saved'])

const sourceOptions = [
  { id: 'requirement_pool', label: '需求池', hint: '需求池派发的任务自动进入此会话' },
  { id: 'workbench', label: '工作台', hint: '工作台创建的任务自动进入此会话' },
  { id: 'global_agent', label: '全局 Agent', hint: '全局 Agent 投放到此目标的任务进入此会话' },
]
const selected = ref([])
const title = ref('')
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const bindings = ref([])
const sessionId = computed(() => String(props.session?.id || props.session?.sessionId || ''))
const currentBinding = computed(() => bindings.value.find(item => String(item.exactSessionId || item.exact_session_id || '') === sessionId.value && item.status !== 'archived') || null)

async function load() {
  if (!props.open || !props.scopeId) return
  loading.value = true
  error.value = ''
  try {
    const query = new URLSearchParams({ scope: props.scope, scope_id: props.scopeId })
    const response = await fetch(`/api/automation-session-bindings?${query}`)
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '读取来源绑定失败')
    bindings.value = Array.isArray(data.bindings) ? data.bindings : []
    const binding = bindings.value.find(item => String(item.exactSessionId || item.exact_session_id || '') === sessionId.value && item.status !== 'archived')
    selected.value = Array.isArray(binding?.sources) ? [...binding.sources] : []
    title.value = String(props.session?.title || props.session?.name || '')
  } catch (cause) {
    error.value = cause?.message || '读取来源绑定失败'
  } finally {
    loading.value = false
  }
}

watch(() => [props.open, props.scope, props.scopeId, sessionId.value], load, { immediate: true })

function toggle(source) {
  selected.value = selected.value.includes(source)
    ? selected.value.filter(item => item !== source)
    : [...selected.value, source]
}

function ownerText(source) {
  const owner = bindings.value.find(item => item.status === 'active' && item.sources?.includes(source))
  if (!owner || String(owner.exactSessionId || '') === sessionId.value) return ''
  return `当前由“${owner.session?.title || owner.exactSessionId}”接收，保存后会转移到这里`
}

async function save() {
  if (!props.scopeId || (!sessionId.value && !selected.value.length)) {
    error.value = sessionId.value ? '' : '新建自动化会话时至少绑定一个来源'
    return
  }
  saving.value = true
  error.value = ''
  try {
    const creating = !sessionId.value
    const response = await fetch(creating ? '/api/automation-sessions' : '/api/automation-session-bindings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: props.scope,
        scope_id: props.scopeId,
        exact_session_id: sessionId.value || undefined,
        sources: selected.value,
        title: creating ? title.value : undefined,
        expected_revision: currentBinding.value?.revision,
        reason: creating ? 'session_list_create' : 'session_list_binding_update',
      }),
    })
    const data = await response.json()
    if (!response.ok || data.success === false) throw new Error(data.error || '保存来源绑定失败')
    emit('saved', data.binding)
    emit('close')
  } catch (cause) {
    error.value = cause?.message || '保存来源绑定失败'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="binding-dialog-backdrop" @click.self="emit('close')">
      <section class="binding-dialog" role="dialog" aria-modal="true" aria-labelledby="automation-binding-title">
        <header>
          <span class="dialog-icon"><ListTodo :size="18" /></span>
          <div>
            <strong id="automation-binding-title">{{ sessionId ? '自动化会话来源绑定' : '新建自动化任务会话' }}</strong>
            <small>任务入口只选择项目或群聊，系统会按这里的来源绑定投递。</small>
          </div>
          <button type="button" title="关闭" @click="emit('close')"><X :size="18" /></button>
        </header>
        <div class="dialog-body">
          <label v-if="!sessionId" class="title-field">
            <span>会话名称</span>
            <input v-model="title" maxlength="80" placeholder="例如：产品需求自动开发" />
          </label>
          <div class="source-heading"><Link2 :size="15" /><strong>接收任务来源</strong><span>可多选</span></div>
          <button
            v-for="option in sourceOptions"
            :key="option.id"
            type="button"
            :class="['source-option', { selected: selected.includes(option.id) }]"
            :aria-pressed="selected.includes(option.id)"
            @click="toggle(option.id)"
          >
            <span class="source-check">{{ selected.includes(option.id) ? '✓' : '' }}</span>
            <span><strong>{{ option.label }}</strong><small>{{ ownerText(option.id) || option.hint }}</small></span>
          </button>
          <p v-if="sessionId && !selected.length" class="drain-hint">保存后此会话停止接收新任务；已进入会话的任务仍在原会话继续。</p>
          <p v-if="loading" class="dialog-state">正在读取绑定…</p>
          <p v-else-if="error" class="dialog-error">{{ error }}</p>
        </div>
        <footer>
          <button type="button" class="secondary" @click="emit('close')">取消</button>
          <button type="button" class="primary" :disabled="loading || saving" @click="save">{{ saving ? '保存中…' : '保存' }}</button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.binding-dialog-backdrop{position:fixed;inset:0;z-index:9000;display:grid;place-items:center;padding:20px;background:rgba(2,6,23,.58);backdrop-filter:blur(2px)}
.binding-dialog{width:min(520px,100%);overflow:hidden;border:1px solid var(--border-color);border-radius:12px;background:var(--surface);box-shadow:0 24px 80px rgba(2,6,23,.34);color:var(--text-primary)}
header{display:grid;grid-template-columns:38px minmax(0,1fr) 32px;align-items:center;gap:10px;padding:15px 16px;border-bottom:1px solid var(--border-color)}
.dialog-icon{width:36px;height:36px;display:grid;place-items:center;border-radius:8px;background:color-mix(in srgb,var(--accent-blue) 12%,var(--surface));color:var(--accent-blue)}
header>div{min-width:0;display:grid;gap:3px}header strong{font-size:14px}header small{color:var(--text-muted);font-size:10.5px;line-height:1.45}header button{width:30px;height:30px;display:grid;place-items:center;border:0;border-radius:6px;background:transparent;color:var(--text-muted);cursor:pointer}header button:hover{background:var(--control-hover);color:var(--text-primary)}
.dialog-body{display:grid;gap:9px;padding:15px 16px}.title-field{display:grid;gap:6px;margin-bottom:4px}.title-field span{font-size:11px;font-weight:750;color:var(--text-secondary)}.title-field input{height:var(--control-height-lg,36px);padding:0 var(--control-padding-x,10px);border:1px solid var(--border-color);border-radius:var(--radius-md,6px);background:var(--control-bg);color:var(--text-primary);outline:none;transition:border-color .15s ease,box-shadow .15s ease}.title-field input:focus{border-color:var(--accent-blue);box-shadow:var(--focus-ring)}
.source-heading{display:flex;align-items:center;gap:6px;margin:2px 0;color:var(--text-secondary);font-size:11px}.source-heading span{margin-left:auto;color:var(--text-muted);font-size:10px}
.source-option{display:grid;grid-template-columns:22px minmax(0,1fr);align-items:center;gap:9px;width:100%;padding:10px;border:1px solid var(--border-color);border-radius:var(--radius-lg,8px);background:var(--panel-muted);color:var(--text-primary);text-align:left;cursor:pointer}.source-option:hover{border-color:color-mix(in srgb,var(--accent-blue) 45%,var(--border-color))}.source-option.selected{border-color:color-mix(in srgb,var(--accent-blue) 58%,var(--border-color));background:color-mix(in srgb,var(--accent-blue) 8%,var(--surface))}.source-check{width:20px;height:20px;display:grid;place-items:center;border:1px solid var(--border-color);border-radius:5px;color:white;font-size:12px}.selected .source-check{border-color:var(--accent-blue);background:var(--accent-blue)}.source-option>span:last-child{display:grid;gap:3px}.source-option strong{font-size:12px}.source-option small{color:var(--text-muted);font-size:10px;line-height:1.4}
.drain-hint,.dialog-state,.dialog-error{margin:2px 0 0;padding:8px;border-radius:6px;font-size:10.5px;line-height:1.45}.drain-hint{background:rgba(245,158,11,.08);color:#b45309}.dialog-state{color:var(--text-muted)}.dialog-error{background:rgba(239,68,68,.08);color:#dc2626}
footer{display:flex;justify-content:flex-end;gap:8px;padding:12px 16px;border-top:1px solid var(--border-color)}footer button{height:var(--control-height,34px);padding:0 14px;border-radius:var(--radius-md,6px);font:inherit;font-size:11px;font-weight:750;cursor:pointer}.secondary{border:1px solid var(--border-color);background:transparent;color:var(--text-secondary)}.primary{border:1px solid var(--accent-blue);background:var(--accent-blue);color:white}.primary:disabled{opacity:.55;cursor:not-allowed}
</style>
