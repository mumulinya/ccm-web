<script setup>
import { Bot, Check, ChevronDown, ListChecks } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  scope: { type: String, required: true },
  scopeId: { type: String, default: '' },
  exactSessionId: { type: String, default: '' },
  disabled: Boolean,
})

const emit = defineEmits(['changed', 'resolved'])

const modes = [
  {
    value: 'agent',
    label: 'Agent 模式',
    detail: '简单任务直接处理，复杂任务由主 Agent 自动规划',
    icon: Bot,
  },
  {
    value: 'plan',
    label: 'Plan 模式',
    detail: '只分析和制定计划，确认前不修改代码或分派子 Agent',
    icon: ListChecks,
  },
]

const root = ref(null)
const open = ref(false)
const loading = ref(false)
const error = ref('')
const state = ref(null)

const selectedMode = computed(() => state.value?.enabled ? 'plan' : 'agent')
const selected = computed(() => modes.find(item => item.value === selectedMode.value) || modes[0])
const SelectedIcon = computed(() => selected.value.icon)

const identity = () => ({
  scope: props.scope,
  scopeId: props.scopeId || (props.scope === 'global' ? 'global' : ''),
  exactSessionId: props.exactSessionId,
})

const notifyChanged = detail => {
  emit('changed', detail)
  window.dispatchEvent(new CustomEvent('ccm-conversation-plan-mode-changed', {
    detail: { ...identity(), ...detail },
  }))
}

const load = async () => {
  if (!props.exactSessionId) {
    state.value = null
    return
  }
  loading.value = true
  error.value = ''
  try {
    const query = new URLSearchParams(identity()).toString()
    const response = await fetch(`/api/conversations/plan-mode?${query}`, { cache: 'no-store' })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || data?.success === false) throw new Error(data?.error || '会话模式读取失败')
    state.value = {
      ...(data.planMode || data.result || {}),
      revision: Number(data.revision ?? data.result?.revision ?? 0),
      generation: Number(data.generation ?? data.result?.generation ?? 0),
    }
    emit('resolved', { mode: state.value.enabled ? 'plan' : 'agent', enabled: state.value.enabled === true })
  } catch (reason) {
    error.value = reason?.message || '会话模式读取失败'
  } finally {
    loading.value = false
  }
}

const selectMode = async mode => {
  if (!state.value || mode === selectedMode.value || loading.value) {
    open.value = false
    return
  }
  loading.value = true
  error.value = ''
  try {
    const response = await fetch('/api/conversations/plan-mode', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...identity(),
        revision: Number(state.value.revision || 0),
        generation: Number(state.value.generation || 0),
        action: mode === 'plan' ? 'open' : 'exit',
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || data?.success === false) throw new Error(data?.error || '会话模式切换失败')
    const result = data.result || data.planMode || data
    state.value = {
      ...result,
      revision: Number(result.revision ?? data.revision ?? state.value.revision ?? 0),
      generation: Number(result.generation ?? data.generation ?? state.value.generation ?? 0),
    }
    open.value = false
    notifyChanged({ mode, enabled: mode === 'plan', revision: state.value.revision, generation: state.value.generation })
  } catch (reason) {
    error.value = reason?.message || '会话模式切换失败'
    await load()
  } finally {
    loading.value = false
  }
}

const onDocumentClick = event => {
  if (open.value && root.value && !root.value.contains(event.target)) open.value = false
}

const onExternalChange = event => {
  const detail = event?.detail || {}
  if (detail.scope !== props.scope) return
  if (String(detail.scopeId || '') !== String(identity().scopeId || '')) return
  if (String(detail.exactSessionId || '') !== String(props.exactSessionId || '')) return
  void load()
}

watch(() => [props.scope, props.scopeId, props.exactSessionId], load, { immediate: true })
watch(open, value => value
  ? document.addEventListener('pointerdown', onDocumentClick)
  : document.removeEventListener('pointerdown', onDocumentClick))
onMounted(() => window.addEventListener('ccm-conversation-plan-mode-changed', onExternalChange))
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentClick)
  window.removeEventListener('ccm-conversation-plan-mode-changed', onExternalChange)
})
</script>

<template>
  <div ref="root" class="agent-mode">
    <button
      type="button"
      class="agent-mode__trigger"
      :class="{ 'is-plan': selectedMode === 'plan' }"
      :disabled="disabled || loading || !exactSessionId"
      :aria-expanded="open"
      aria-haspopup="menu"
      :title="disabled ? '当前任务运行期间不能切换会话模式' : selected.detail"
      @click="open = !open"
    >
      <component :is="SelectedIcon" :size="14" />
      <span>{{ loading && !state ? '读取模式…' : selected.label }}</span>
      <ChevronDown :size="13" />
    </button>

    <div v-if="open" class="agent-mode__menu" role="menu" aria-label="Agent 工作模式">
      <button
        v-for="item in modes"
        :key="item.value"
        type="button"
        role="menuitemradio"
        :aria-checked="selectedMode === item.value"
        @click="selectMode(item.value)"
      >
        <component :is="item.icon" :size="16" />
        <span class="agent-mode__copy">
          <strong>{{ item.label }}</strong>
          <small>{{ item.detail }}</small>
        </span>
        <Check v-if="selectedMode === item.value" :size="15" />
      </button>
      <p v-if="selectedMode === 'plan'">Plan 模式会保留只读分析能力；确认计划并切回 Agent 模式后，才会启动项目子 Agent。</p>
      <p v-else>Agent 模式仍会为复杂或高风险需求自动生成计划并等待确认。</p>
    </div>

    <span v-if="error" class="agent-mode__error" role="alert">{{ error }}</span>
  </div>
</template>

<style scoped>
.agent-mode{position:relative;display:inline-flex;align-items:center;gap:7px}.agent-mode__trigger{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 8px;border:1px solid var(--border-color);border-radius:8px;background:transparent;color:var(--text-secondary);font-size:11px;cursor:pointer}.agent-mode__trigger:hover:not(:disabled){color:var(--text-primary);background:var(--bg-secondary)}.agent-mode__trigger.is-plan{border-color:color-mix(in srgb,var(--accent-blue) 34%,var(--border-color));background:color-mix(in srgb,var(--accent-blue) 8%,transparent);color:var(--accent-blue)}.agent-mode__trigger:disabled{opacity:.55;cursor:not-allowed}.agent-mode__menu{position:absolute;z-index:82;bottom:34px;left:0;width:min(360px,calc(100vw - 32px));padding:6px;border:1px solid var(--border-color);border-radius:12px;background:var(--surface);box-shadow:0 14px 40px rgba(15,23,42,.16)}.agent-mode__menu>button{display:grid;grid-template-columns:20px minmax(0,1fr) 18px;align-items:center;gap:8px;width:100%;padding:10px;border:0;border-radius:8px;background:transparent;color:var(--text-primary);text-align:left;cursor:pointer}.agent-mode__menu>button:hover,.agent-mode__menu>button:focus-visible{background:var(--bg-secondary);outline:none}.agent-mode__copy{display:grid;gap:2px}.agent-mode__copy strong{font-size:12px}.agent-mode__copy small,.agent-mode__menu>p{color:var(--text-muted);font-size:10px;line-height:1.45}.agent-mode__menu>p{margin:5px 8px 3px;padding-top:7px;border-top:1px solid var(--border-color)}.agent-mode__error{max-width:260px;color:var(--accent-red);font-size:10px}@media(max-width:560px){.agent-mode__menu{position:fixed;right:12px;bottom:78px;left:12px;width:auto}.agent-mode__error{display:none}}
</style>
