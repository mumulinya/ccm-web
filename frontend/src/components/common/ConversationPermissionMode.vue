<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Check, ChevronDown, ShieldCheck } from '@lucide/vue'

const props = defineProps({
  scope: { type: String, required: true },
  scopeId: { type: String, default: '' },
  exactSessionId: { type: String, default: '' },
  generation: { type: Number, default: 0 },
  disabled: Boolean,
})

const modes = [
  { value: 'full_access', label: '子 Agent 自动执行', detail: '项目内修改、构建和测试无需逐次审核' },
  { value: 'main_agent_only', label: '主 Agent 审核', detail: '由主 Agent审核项目子 Agent的权限，必要时再询问你' },
  { value: 'ask_before_edit', label: '子 Agent 修改前询问', detail: '首次修改代码前询问你，本任务返工继续有效' },
]
const policy = ref(null)
const open = ref(false)
const loading = ref(false)
const error = ref('')
const root = ref(null)
const selected = computed(() => modes.find(item => item.value === policy.value?.mode) || modes[2])

const identity = () => ({
  scope: props.scope,
  scopeId: props.scopeId || (props.scope === 'global' ? 'global' : ''),
  exactSessionId: props.exactSessionId,
})

const load = async () => {
  if (!props.exactSessionId) return
  loading.value = true
  error.value = ''
  try {
    const query = new URLSearchParams(identity()).toString()
    const response = await fetch(`/api/conversations/permission-mode?${query}`)
    const data = await response.json().catch(() => ({}))
    if (!response.ok || data?.success === false) throw new Error(data?.error || '权限模式读取失败')
    policy.value = data.result || data
  } catch (reason) {
    error.value = reason?.message || '权限模式读取失败'
  } finally { loading.value = false }
}

const selectMode = async mode => {
  if (!policy.value || mode === policy.value.mode || loading.value) { open.value = false; return }
  loading.value = true
  error.value = ''
  try {
    const response = await fetch('/api/conversations/permission-mode', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...identity(), mode, revision: policy.value.revision, generation: Math.max(props.generation, policy.value.generation || 0) }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || data?.success === false) throw new Error(data?.error || '权限模式修改失败')
    policy.value = data.result || data
    open.value = false
  } catch (reason) {
    error.value = reason?.message || '权限模式修改失败'
  } finally { loading.value = false }
}

const onDocumentClick = event => {
  if (open.value && root.value && !root.value.contains(event.target)) open.value = false
}
watch(() => [props.scope, props.scopeId, props.exactSessionId], load, { immediate: true })
watch(open, value => value ? document.addEventListener('pointerdown', onDocumentClick) : document.removeEventListener('pointerdown', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentClick))
</script>

<template>
  <div ref="root" class="permission-mode">
    <button
      type="button"
      class="permission-mode__trigger"
      :disabled="disabled || loading || !exactSessionId"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="open = !open"
    >
      <ShieldCheck :size="14" />
      <span>{{ loading && !policy ? '读取权限…' : selected.label }}</span>
      <ChevronDown :size="13" />
    </button>
    <div v-if="open" class="permission-mode__menu" role="menu" aria-label="会话权限模式">
      <button v-for="item in modes" :key="item.value" type="button" role="menuitemradio" :aria-checked="policy?.mode === item.value" @click="selectMode(item.value)">
        <span class="permission-mode__copy"><strong>{{ item.label }}</strong><small>{{ item.detail }}</small></span>
        <Check v-if="policy?.mode === item.value" :size="15" />
      </button>
      <p>这里控制项目子 Agent。主 Agent不直接写代码；发布、密钥、提权、强推等高风险操作始终询问你。</p>
    </div>
    <span v-if="error" class="permission-mode__error" role="alert">{{ error }}</span>
  </div>
</template>

<style scoped>
.permission-mode{position:relative;display:inline-flex;align-items:center;gap:7px}.permission-mode__trigger{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 8px;border:1px solid var(--border-color);border-radius:8px;background:transparent;color:var(--text-secondary);font-size:11px;cursor:pointer}.permission-mode__trigger:hover:not(:disabled){color:var(--text-primary);background:var(--bg-secondary)}.permission-mode__trigger:disabled{opacity:.55;cursor:not-allowed}.permission-mode__menu{position:absolute;z-index:80;bottom:34px;left:0;width:min(330px,calc(100vw - 32px));padding:6px;border:1px solid var(--border-color);border-radius:12px;background:var(--surface);box-shadow:0 14px 40px rgba(15,23,42,.16)}.permission-mode__menu>button{display:flex;align-items:center;justify-content:space-between;width:100%;padding:9px 10px;border:0;border-radius:8px;background:transparent;color:var(--text-primary);text-align:left;cursor:pointer}.permission-mode__menu>button:hover,.permission-mode__menu>button:focus-visible{background:var(--bg-secondary);outline:none}.permission-mode__copy{display:grid;gap:2px}.permission-mode__copy strong{font-size:12px}.permission-mode__copy small,.permission-mode__menu>p{color:var(--text-muted);font-size:10px;line-height:1.45}.permission-mode__menu>p{margin:5px 8px 3px;padding-top:7px;border-top:1px solid var(--border-color)}.permission-mode__error{max-width:260px;color:var(--accent-red);font-size:10px}@media(max-width:560px){.permission-mode__menu{position:fixed;right:12px;bottom:78px;left:12px;width:auto}.permission-mode__error{display:none}}
</style>
