<script setup>
import { FileText } from '@lucide/vue'

defineProps({
  event: { type: Object, required: true },
})
</script>

<template>
  <div class="context-compaction-event" :title="event.title" role="status">
    <FileText :size="16" aria-hidden="true" />
    <span>{{ event.label }}</span>
  </div>
</template>

<style scoped>
.context-compaction-event {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  margin: 2px 0 18px;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.4;
}

.context-compaction-event svg {
  flex: 0 0 auto;
  color: color-mix(in srgb, var(--text-muted) 82%, transparent);
}
</style>
