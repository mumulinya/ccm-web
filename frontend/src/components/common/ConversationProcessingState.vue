<script setup>
import { LoaderCircle } from '@lucide/vue'

defineProps({
  title: { type: String, default: '正在理解你的需求' },
  detail: { type: String, default: '完成后会在当前会话继续回复。' },
  phase: { type: String, default: '处理中' },
})
</script>

<template>
  <div class="conversation-processing" role="status" aria-live="polite">
    <LoaderCircle :size="16" class="conversation-processing__spinner" aria-hidden="true" />
    <div class="conversation-processing__copy">
      <span>{{ phase }}</span>
      <strong>{{ title }}</strong>
      <small v-if="detail">{{ detail }}</small>
    </div>
    <span class="conversation-processing__pulse" aria-hidden="true"><i></i><i></i><i></i></span>
  </div>
</template>

<style scoped>
.conversation-processing {
  box-sizing: border-box;
  width: min(430px, 100%);
  min-width: min(290px, 100%);
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  align-items: start;
  gap: 9px;
  padding: 11px 12px;
  border: 1px solid color-mix(in srgb, var(--accent-blue) 18%, var(--border-color));
  border-radius: 9px;
  background: color-mix(in srgb, var(--accent-soft) 24%, var(--surface));
  color: var(--text-primary);
}

.conversation-processing__spinner {
  margin-top: 2px;
  color: var(--accent-blue);
  animation: conversation-processing-spin 1s linear infinite;
}

.conversation-processing__copy {
  min-width: 0;
  display: grid;
  gap: 2px;
}

.conversation-processing__copy > span {
  color: var(--accent-blue);
  font-size: 9px;
  font-weight: 800;
}

.conversation-processing__copy strong {
  color: var(--text-primary);
  font-size: 12.5px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.conversation-processing__copy small {
  color: var(--text-muted);
  font-size: 10.5px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.conversation-processing__pulse {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-top: 5px;
}

.conversation-processing__pulse i {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--accent-blue);
  opacity: .25;
  animation: conversation-processing-pulse 1.2s infinite ease-in-out;
}

.conversation-processing__pulse i:nth-child(2) { animation-delay: .15s; }
.conversation-processing__pulse i:nth-child(3) { animation-delay: .3s; }

@keyframes conversation-processing-spin { to { transform: rotate(360deg); } }
@keyframes conversation-processing-pulse {
  0%, 70%, 100% { opacity: .22; transform: translateY(0); }
  35% { opacity: 1; transform: translateY(-2px); }
}

@media (max-width: 560px) {
  .conversation-processing {
    min-width: 0;
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .conversation-processing__spinner,
  .conversation-processing__pulse i { animation: none; }
}
</style>
