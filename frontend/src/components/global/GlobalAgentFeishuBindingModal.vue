<script setup>
import { computed, ref, watch } from 'vue'
import { Link2, Send, Unlink, X } from '@lucide/vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  session: { type: Object, default: null },
  bindings: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'bind', 'unbind'])
const selectedBindingId = ref('')

const sessionBindings = computed(() => props.bindings.filter(binding => String(binding.active_session_id || '') === String(props.session?.id || '')))
const targetLabel = (binding) => String(binding?.label || binding?.chat_id || binding?.open_id || '飞书目标')
const targetDetail = (binding) => {
  const channel = binding?.chat_id ? `群聊 ${binding.chat_id}` : `用户 ${binding?.open_id || binding?.user_id || '未知'}`
  const location = binding?.thread_id ? `${channel} · 话题 ${String(binding.thread_id).slice(-8)}` : channel
  if (!binding?.active_session_id) return `${location} · 尚未绑定`
  if (String(binding.active_session_id) === String(props.session?.id || '')) return `${location} · 当前会话`
  return `${location} · 已绑定其他飞书会话`
}

watch(() => props.open, (open) => {
  if (!open) return
  selectedBindingId.value = sessionBindings.value[0]?.id || props.bindings.find(binding => !binding.active_session_id)?.id || props.bindings[0]?.id || ''
})
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="binding-overlay" @click.self="emit('close')">
      <section class="binding-dialog" role="dialog" aria-modal="true" aria-labelledby="feishu-binding-title">
        <header class="binding-header">
          <span class="binding-icon"><Send :size="18" /></span>
          <div>
            <h3 id="feishu-binding-title">绑定飞书会话</h3>
            <p>{{ session?.name || '飞书会话' }}</p>
          </div>
          <button class="icon-button close-button" title="关闭" aria-label="关闭" @click="emit('close')"><X :size="17" /></button>
        </header>

        <div class="binding-body">
          <div class="binding-summary">
            <strong>{{ sessionBindings.length ? `已绑定 ${sessionBindings.length} 个飞书目标` : '当前尚未绑定' }}</strong>
            <span>绑定后，该飞书聊天的新消息和 Agent 回复会连续写入此会话。</span>
          </div>

          <div v-if="bindings.length" class="target-list">
            <label v-for="binding in bindings" :key="binding.id" class="target-row" :class="{ selected: selectedBindingId === binding.id }">
              <input v-model="selectedBindingId" type="radio" name="feishu-target" :value="binding.id">
              <span class="target-main">
                <strong>{{ targetLabel(binding) }}</strong>
                <span>{{ targetDetail(binding) }}</span>
              </span>
              <span v-if="binding.active_session_id === session?.id" class="current-badge">当前绑定</span>
            </label>
          </div>

          <div v-else class="empty-targets">
            <Send :size="22" />
            <strong>尚未发现飞书聊天目标</strong>
            <span>请先在需要绑定的飞书群聊或私聊中向机器人发送一条消息，再回到这里刷新。</span>
          </div>
        </div>

        <footer class="binding-footer">
          <button
            v-if="sessionBindings.some(binding => binding.id === selectedBindingId)"
            class="secondary-button danger-button"
            :disabled="busy"
            @click="emit('unbind', selectedBindingId)"
          >
            <Unlink :size="15" />解除绑定
          </button>
          <span class="footer-spacer" />
          <button class="secondary-button" :disabled="busy" @click="emit('close')">取消</button>
          <button class="primary-button" :disabled="busy || !selectedBindingId" @click="emit('bind', selectedBindingId)">
            <Link2 :size="15" />{{ busy ? '处理中' : '绑定目标' }}
          </button>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.binding-overlay {
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: grid;
  place-items: center;
  padding: 20px;
  background: color-mix(in srgb, #08111f 62%, transparent);
  backdrop-filter: blur(5px);
}

.binding-dialog {
  width: min(560px, 100%);
  max-height: min(700px, calc(100vh - 40px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-primary);
  box-shadow: var(--shadow-lg);
}

.binding-header {
  min-height: 70px;
  display: grid;
  grid-template-columns: 38px 1fr 34px;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-color);
}

.binding-icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  color: #00a870;
  background: color-mix(in srgb, #00a870 11%, var(--surface));
  border: 1px solid color-mix(in srgb, #00a870 25%, var(--border-color));
}

.binding-header h3,
.binding-header p { margin: 0; }
.binding-header h3 { font-size: 16px; }
.binding-header p { margin-top: 3px; font-size: 12px; color: var(--text-muted); }

.icon-button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}
.icon-button:hover { color: var(--text-primary); background: var(--control-hover); }

.binding-body {
  min-height: 250px;
  overflow: auto;
  padding: 16px;
}

.binding-summary {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-color);
}
.binding-summary strong { font-size: 13px; }
.binding-summary span { font-size: 12px; color: var(--text-muted); line-height: 1.6; }

.target-list { display: flex; flex-direction: column; gap: 7px; margin-top: 14px; }
.target-row {
  min-height: 58px;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  cursor: pointer;
  background: var(--panel-muted);
}
.target-row.selected { border-color: #00a870; background: color-mix(in srgb, #00a870 7%, var(--panel-muted)); }
.target-row input { accent-color: #00a870; }
.target-main { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.target-main strong, .target-main span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.target-main strong { font-size: 13px; }
.target-main span { font-size: 11px; color: var(--text-muted); }
.current-badge { color: #00a870; font-size: 10px; font-weight: 700; }

.empty-targets {
  min-height: 190px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-muted);
  text-align: center;
}
.empty-targets strong { color: var(--text-secondary); font-size: 13px; }
.empty-targets span { max-width: 360px; font-size: 12px; line-height: 1.7; }

.binding-footer {
  min-height: 62px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-color);
  background: var(--panel-muted);
}
.footer-spacer { flex: 1; }
.secondary-button, .primary-button {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 13px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.secondary-button { border: 1px solid var(--border-color); color: var(--text-secondary); background: var(--surface); }
.primary-button { border: 1px solid #00a870; color: white; background: #00a870; }
.danger-button { color: #dc2626; }
.secondary-button:disabled, .primary-button:disabled { opacity: .5; cursor: not-allowed; }

@media (max-width: 600px) {
  .binding-overlay { padding: 10px; align-items: end; }
  .binding-dialog { max-height: calc(100vh - 20px); }
  .binding-footer { flex-wrap: wrap; }
  .footer-spacer { display: none; }
  .binding-footer button { flex: 1; }
  .danger-button { flex-basis: 100% !important; }
  .target-row { grid-template-columns: 18px minmax(0, 1fr); }
  .current-badge { grid-column: 2; }
}
</style>
