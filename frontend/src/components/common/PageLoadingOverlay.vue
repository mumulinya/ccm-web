<script setup>
import { LoaderCircle, RefreshCw } from '@lucide/vue'

defineProps({
  title: { type: String, default: '正在加载页面' },
  description: { type: String, default: '正在准备界面和初始数据，请稍候' },
  slow: { type: Boolean, default: false },
  viewport: { type: Boolean, default: false },
  pageId: { type: String, default: '' },
})

defineEmits(['retry'])
</script>

<template>
  <div
    class="page-loading-overlay"
    :class="{ viewport, slow }"
    role="status"
    aria-live="polite"
    aria-label="页面加载中"
    :data-page-loading="pageId || 'global'"
  >
    <div class="page-loading-content">
      <span class="page-loading-icon"><LoaderCircle :size="24" /></span>
      <strong>{{ title }}</strong>
      <span>{{ slow ? '加载时间比平时更长，请检查网络后继续等待或重试' : description }}</span>
      <i class="page-loading-track" aria-hidden="true"><b></b></i>
      <button v-if="slow" type="button" @click="$emit('retry')"><RefreshCw :size="14" />重新加载</button>
    </div>
  </div>
</template>

<style scoped>
.page-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  min-width: 0;
  min-height: 0;
  background: color-mix(in srgb, var(--surface, #fff) 94%, transparent);
  backdrop-filter: blur(4px);
  color: var(--text-primary);
}
.page-loading-overlay.viewport { position: fixed; z-index: 12000; background: var(--bg-primary, #f6f7f4); }
.page-loading-content {
  width: min(300px, calc(100% - 40px));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
}
.page-loading-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border-color);
  border-radius: 50%;
  background: var(--bg-secondary);
  color: var(--accent-blue);
}
.page-loading-icon svg { animation: page-loading-spin .8s linear infinite; }
.page-loading-content strong { font-size: 13px; letter-spacing: 0; }
.page-loading-content > span:not(.page-loading-icon) { color: var(--text-muted); font-size: 11px; }
.page-loading-track {
  width: 148px;
  height: 3px;
  margin-top: 4px;
  overflow: hidden;
  border-radius: 2px;
  background: color-mix(in srgb, var(--border-color) 75%, transparent);
}
.page-loading-track b {
  display: block;
  width: 44%;
  height: 100%;
  border-radius: inherit;
  background: var(--accent-blue);
  animation: page-loading-progress 1.1s ease-in-out infinite;
}
.page-loading-content button {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 4px;
  padding: 0 11px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--surface-raised, var(--surface));
  color: var(--text-secondary);
  font: inherit;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
}
.page-loading-content button:hover { border-color: var(--border-strong); color: var(--text-primary); }
@keyframes page-loading-spin { to { transform: rotate(360deg); } }
@keyframes page-loading-progress {
  from { transform: translateX(-115%); }
  to { transform: translateX(330%); }
}
@media (prefers-reduced-motion: reduce) {
  .page-loading-icon svg, .page-loading-track b { animation-duration: 2.4s; }
}
</style>
