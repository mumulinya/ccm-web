<script setup>
defineProps({
  title: { type: String, default: '暂无内容' },
  hint: { type: String, default: '' },
  icon: { type: String, default: '∅' },
  large: { type: Boolean, default: false },
})
</script>

<template>
  <div class="ccm-empty-state" :class="{ 'ccm-empty-state--large': large }" role="status">
    <div v-if="icon" class="ccm-empty-state__icon" aria-hidden="true">{{ icon }}</div>
    <p class="ccm-empty-state__title">{{ title }}</p>
    <p v-if="hint" class="ccm-empty-state__hint">{{ hint }}</p>
    <div v-if="$slots.default" class="ccm-empty-state__actions">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.ccm-empty-state--large {
  min-height: 220px;
  padding: 48px 20px;
}
.ccm-empty-state__actions {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}
</style>
