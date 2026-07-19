<script setup>
defineProps({
  rows: { type: Number, default: 4 },
  cards: { type: Number, default: 0 },
  variant: { type: String, default: 'lines' }, // lines | cards | grid
})
</script>

<template>
  <div class="ccm-loading-skeleton" role="status" aria-live="polite" aria-label="加载中">
    <div v-if="variant === 'cards' || variant === 'grid' || cards > 0" class="ccm-skeleton-grid">
      <div v-for="n in (cards || 6)" :key="`card-${n}`" class="ccm-skeleton-card">
        <span class="ccm-skeleton" style="height: 14px; width: 42%" />
        <span class="ccm-skeleton ccm-skeleton-line" />
        <span class="ccm-skeleton ccm-skeleton-line" />
        <span class="ccm-skeleton ccm-skeleton-line" style="width: 48%" />
      </div>
    </div>
    <div v-else class="ccm-skeleton-lines">
      <span
        v-for="n in rows"
        :key="`line-${n}`"
        class="ccm-skeleton ccm-skeleton-line"
        :style="n === rows ? { width: '55%' } : { width: n % 2 === 0 ? '88%' : '96%' }"
      />
    </div>
  </div>
</template>

<style scoped>
.ccm-loading-skeleton {
  width: 100%;
  min-width: 0;
}
.ccm-skeleton-lines {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
}
</style>
