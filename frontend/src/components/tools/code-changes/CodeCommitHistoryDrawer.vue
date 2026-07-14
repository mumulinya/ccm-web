<script setup>
import { History, X } from '@lucide/vue'
defineProps({ visible: Boolean, commits: { type: Array, default: () => [] }, loading: Boolean })
defineEmits(['close'])
</script>
<template>
  <div v-if="visible" class="drawer-overlay" @click.self="$emit('close')">
    <aside class="history-drawer" aria-label="提交历史">
      <header><span><History :size="17" />提交历史</span><button title="关闭" @click="$emit('close')"><X :size="18" /></button></header>
      <div class="history-list">
        <p v-if="loading" class="empty">正在读取历史...</p><p v-else-if="!commits.length" class="empty">没有提交记录</p>
        <article v-for="commit in commits" :key="commit.hash"><code>{{ commit.shortHash }}</code><div><strong>{{ commit.message }}</strong><small>{{ commit.author }} · {{ new Date(commit.timestamp).toLocaleString('zh-CN') }}</small></div></article>
      </div>
    </aside>
  </div>
</template>
<style scoped>
.drawer-overlay{position:fixed;inset:0;z-index:10010;background:rgba(15,23,42,.24)}.history-drawer{position:absolute;top:0;right:0;width:min(480px,100%);height:100%;display:flex;flex-direction:column;background:var(--bg-primary,#fff);border-left:1px solid var(--border-color,rgba(15,23,42,.1));box-shadow:-16px 0 45px rgba(15,23,42,.15)}header{height:58px;padding:0 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border-color,rgba(15,23,42,.09))}header span{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:650;color:var(--text-primary)}header button{border:0;background:transparent;color:var(--text-muted);cursor:pointer}.history-list{flex:1;overflow:auto;padding:8px 16px}.history-list article{display:flex;align-items:flex-start;gap:12px;padding:11px 3px;border-bottom:1px solid var(--border-color,rgba(15,23,42,.07))}.history-list code{padding:2px 5px;border-radius:4px;background:rgba(37,99,235,.08);color:#2563eb;font-size:10px}.history-list div{min-width:0}.history-list strong,.history-list small{display:block}.history-list strong{color:var(--text-primary);font-size:12px;line-height:1.45}.history-list small{margin-top:4px;color:var(--text-muted);font-size:10px}.empty{padding:60px 10px;text-align:center;color:var(--text-muted);font-size:12px}
</style>
