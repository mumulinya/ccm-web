<script setup>
import { CircleAlert, RefreshCw } from '@lucide/vue'

defineProps({ error: { type: Error, default: null } })

const reload = () => window.location.reload()
</script>

<template>
  <div class="page-load-error" role="alert">
    <CircleAlert :size="25" />
    <strong>页面加载失败</strong>
    <span>资源暂时没有加载完成，请刷新后重试。</span>
    <button type="button" @click="reload"><RefreshCw :size="15" />刷新页面</button>
  </div>
</template>

<style scoped>
.page-load-error {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 24px;
  background: var(--surface, #fff);
  color: var(--text-primary);
  text-align: center;
}
.page-load-error > svg { color: var(--accent-red); }
.page-load-error strong { font-size: 13px; }
.page-load-error span { color: var(--text-muted); font-size: 11px; }
.page-load-error button {
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  margin-top: 4px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font: inherit;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
}
.page-load-error button:hover { border-color: color-mix(in srgb, var(--accent-blue) 40%, var(--border-color)); }
</style>
