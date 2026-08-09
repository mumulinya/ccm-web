<script setup>
import { computed, ref } from 'vue'
import { Copy, Pencil } from '@lucide/vue'
import ChatAvatar from './ChatAvatar.vue'
import MessageTimestamp from './MessageTimestamp.vue'

const props = defineProps({
  role: { type: String, default: 'assistant' },
  timestamp: { type: [String, Number, Date], default: '' },
  timeLabel: { type: String, default: '' },
  senderLabel: { type: String, default: '' },
  compact: Boolean,
  structured: Boolean,
  streaming: Boolean,
  showAvatar: { type: Boolean, default: true },
  copyText: { type: String, default: '' },
  editable: Boolean,
  editDisabled: Boolean,
})

const emit = defineEmits(['edit'])

const normalizedRole = computed(() => (
  ['user', 'operator'].includes(String(props.role || '').toLowerCase()) ? 'user' : 'assistant'
))

const copied = ref(false)
let copiedTimer = null
const hasCopyText = computed(() => !!String(props.copyText || '').trim())
const hasActions = computed(() => hasCopyText.value || props.editable)

const fallbackCopy = (text) => {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const success = document.execCommand('copy')
  textarea.remove()
  if (!success) throw new Error('copy_failed')
}

const copyMessage = async () => {
  const text = String(props.copyText || '').trim()
  if (!text) return
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text)
    else fallbackCopy(text)
    copied.value = true
    if (copiedTimer) window.clearTimeout(copiedTimer)
    copiedTimer = window.setTimeout(() => { copied.value = false }, 1400)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <article
    class="conversation-message"
    :class="[
      `conversation-message--${normalizedRole}`,
      {
        'conversation-message--compact': compact,
        'conversation-message--structured': structured,
        'conversation-message--streaming': streaming,
      },
    ]"
    :data-role="normalizedRole"
    :aria-busy="streaming ? 'true' : undefined"
  >
    <ChatAvatar
      v-if="showAvatar"
      :role="normalizedRole === 'user' ? 'user' : 'agent'"
      :size="compact ? 28 : 36"
      class="conversation-message__avatar message-avatar avatar"
    />
    <div class="conversation-message__main">
      <span v-if="senderLabel" class="conversation-message__sender">{{ senderLabel }}</span>
      <slot />
      <div v-if="timeLabel || timestamp || hasActions" class="conversation-message__footer">
        <time v-if="timeLabel" class="conversation-message__time" :title="timeLabel">{{ timeLabel }}</time>
        <MessageTimestamp v-else-if="timestamp" class="conversation-message__time" :value="timestamp" />
        <div v-if="hasActions" class="conversation-message__actions" aria-label="消息操作">
          <button
            v-if="hasCopyText"
            type="button"
            class="conversation-message__action"
            :title="copied ? '已复制' : '复制消息'"
            :aria-label="copied ? '已复制消息' : '复制消息'"
            @click="copyMessage"
          >
            <Copy :size="14" />
          </button>
          <button
            v-if="editable"
            type="button"
            class="conversation-message__action"
            title="编辑并重新发送"
            aria-label="编辑并重新发送"
            :disabled="editDisabled"
            @click="emit('edit')"
          >
            <Pencil :size="14" />
          </button>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.conversation-message {
  --conversation-avatar-size: 36px;
  box-sizing: border-box;
  width: fit-content;
  max-width: min(72%, 780px);
  display: flex;
  flex: 0 0 auto;
  align-self: flex-start;
  align-items: flex-start;
  gap: 10px;
  margin: 0 0 16px;
  padding: 0;
  animation: conversation-message-in .18s ease-out;
}

.conversation-message--user {
  align-self: flex-end;
  flex-direction: row-reverse;
  max-width: min(68%, 680px);
}

.conversation-message--structured {
  width: min(86%, 960px);
  max-width: min(86%, 960px);
}

.conversation-message--compact {
  --conversation-avatar-size: 28px;
  max-width: 92%;
  gap: 7px;
  margin-bottom: 10px;
}

.conversation-message__avatar {
  position: static !important;
  inset: auto !important;
  margin: 1px 0 0;
}

.conversation-message__main {
  min-width: 0;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.conversation-message--user .conversation-message__main {
  align-items: flex-end;
}

.conversation-message__sender {
  margin: 0 2px 4px;
  color: var(--text-muted, #94a3b8);
  font-size: 9px;
  font-weight: 800;
  line-height: 1.2;
}

.conversation-message__footer {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 24px;
  margin-top: 3px;
  padding: 0 1px;
}

.conversation-message--user .conversation-message__footer {
  justify-content: flex-end;
}

.conversation-message__time {
  display: block;
  margin: 0;
  padding: 0 1px;
  color: var(--text-muted, #94a3b8);
  font-size: 10px;
  line-height: 1.35;
  letter-spacing: 0;
  opacity: .82;
  white-space: nowrap;
}

.conversation-message--compact .conversation-message__time {
  font-size: 8px;
}

.conversation-message__actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  pointer-events: none;
  transform: translateY(2px);
  transition: opacity .14s ease, transform .14s ease;
}

.conversation-message:hover .conversation-message__actions,
.conversation-message:focus-within .conversation-message__actions {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.conversation-message__action {
  width: 28px;
  height: 28px;
  display: inline-grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: var(--text-muted, #94a3b8);
  background: color-mix(in srgb, var(--panel-bg, #172033) 88%, transparent);
  cursor: pointer;
  transition: color .14s ease, background .14s ease, transform .14s ease;
}

.conversation-message__action:hover:not(:disabled) {
  color: var(--text-primary, #f8fafc);
  background: color-mix(in srgb, var(--accent, #ec4899) 22%, transparent);
  transform: translateY(-1px);
}

.conversation-message__action:focus-visible {
  outline: 2px solid var(--accent, #ec4899);
  outline-offset: 2px;
}

.conversation-message__action:disabled {
  opacity: .4;
  cursor: not-allowed;
}

.conversation-message :deep(.bubble),
.conversation-message :deep(.chat-bubble),
.conversation-message :deep(.chat-bubble-container) {
  box-sizing: border-box;
  width: fit-content;
  min-width: 0;
  max-width: 100%;
  height: auto;
  overflow-wrap: anywhere;
}

.conversation-message--structured :deep(.bubble),
.conversation-message--structured :deep(.chat-bubble),
.conversation-message--structured :deep(.chat-bubble-container) {
  width: 100%;
}

@keyframes conversation-message-in {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 900px) {
  .conversation-message,
  .conversation-message--user,
  .conversation-message--structured {
    max-width: 88%;
  }

  .conversation-message--structured {
    width: 88%;
  }
}

@media (max-width: 560px) {
  .conversation-message {
    --conversation-avatar-size: 30px;
    max-width: 94%;
    gap: 8px;
    margin-bottom: 13px;
  }

  .conversation-message--user,
  .conversation-message--structured {
    max-width: 94%;
  }

  .conversation-message--structured {
    width: 94%;
  }

  .conversation-message__actions {
    opacity: 1;
    pointer-events: auto;
    transform: none;
  }
}

@media (hover: none) {
  .conversation-message__actions {
    opacity: 1;
    pointer-events: auto;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .conversation-message { animation: none; }
}
</style>
