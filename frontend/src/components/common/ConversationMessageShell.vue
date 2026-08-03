<script setup>
import { computed } from 'vue'
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
})

const normalizedRole = computed(() => (
  ['user', 'operator'].includes(String(props.role || '').toLowerCase()) ? 'user' : 'assistant'
))
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
      <time v-if="timeLabel" class="conversation-message__time" :title="timeLabel">{{ timeLabel }}</time>
      <MessageTimestamp v-else-if="timestamp" class="conversation-message__time" :value="timestamp" />
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

.conversation-message__time {
  display: block;
  margin-top: 5px;
  padding: 0 2px;
  color: var(--text-muted, #94a3b8);
  font-size: 10px;
  line-height: 1.35;
  letter-spacing: 0;
  opacity: .82;
  white-space: nowrap;
}

.conversation-message--compact .conversation-message__time {
  margin-top: 3px;
  font-size: 8px;
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
}

@media (prefers-reduced-motion: reduce) {
  .conversation-message { animation: none; }
}
</style>
