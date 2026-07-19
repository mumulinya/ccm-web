<script setup>
import { LoaderCircle } from '@lucide/vue'
</script>

<template>
  <div class="page-loading-overlay" role="status" aria-live="polite" aria-label="页面加载中">
    <div class="page-loading-content">
      <span class="page-loading-icon"><LoaderCircle :size="24" /></span>
      <strong>正在加载页面</strong>
      <span>正在准备界面和初始数据，请稍候</span>
      <i class="page-loading-track" aria-hidden="true"><b></b></i>
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
  background: color-mix(in srgb, var(--surface, #fff) 96%, var(--bg-primary));
  color: var(--text-primary);
}
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
@keyframes page-loading-spin { to { transform: rotate(360deg); } }
@keyframes page-loading-progress {
  from { transform: translateX(-115%); }
  to { transform: translateX(330%); }
}
@media (prefers-reduced-motion: reduce) {
  .page-loading-icon svg, .page-loading-track b { animation-duration: 2.4s; }
}
</style>
