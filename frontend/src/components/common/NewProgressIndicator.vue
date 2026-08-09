<script setup>
defineProps({ count: { type: Number, default: 0 } })
defineEmits(['activate'])
</script>

<template>
  <button v-if="count > 0" type="button" class="new-progress-indicator" @click="$emit('activate')">
    ↓ {{ count }} 条新进度
  </button>
</template>

<style scoped>
.new-progress-indicator {
  position: sticky;
  z-index: 30;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  display: block;
  width: max-content;
  margin: -42px auto 12px;
  padding: 8px 14px;
  border: 1px solid color-mix(in srgb, var(--accent-color, #ec4899) 58%, transparent);
  border-radius: 999px;
  color: var(--text-primary, #f8fafc);
  background: color-mix(in srgb, var(--surface-raised, #171027) 92%, transparent);
  box-shadow: 0 8px 24px rgb(0 0 0 / 25%);
  cursor: pointer;
}
.new-progress-indicator:hover,
.new-progress-indicator:focus-visible { outline: none; border-color: var(--accent-color, #ec4899); }
</style>
