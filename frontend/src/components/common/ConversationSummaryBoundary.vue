<script setup>
import { ChevronDown, FileText } from '@lucide/vue'
defineProps({ message: { type: Object, required: true } })
</script>

<template>
  <details class="summary-boundary">
    <summary>
      <FileText :size="15" />
      <strong>已总结 {{ Number(message.summarizedMessageCount || 0) }} 条消息</strong>
      <span>{{ message.summaryAction === 'summarize_from' ? '从这里开始' : '总结到这里' }}</span>
      <ChevronDown class="summary-boundary__chevron" :size="14" />
    </summary>
    <p>{{ message.summary || String(message.content || '').replace(/^已总结[^\n]*\n*/u, '') }}</p>
    <small>原始消息保存在历史分支中，后续模型只使用此摘要和保留的上下文。</small>
  </details>
</template>

<style scoped>
.summary-boundary{width:100%;border:1px solid color-mix(in srgb,var(--accent-blue) 24%,var(--border-color));border-radius:10px;background:color-mix(in srgb,var(--accent-blue) 4%,var(--surface))}.summary-boundary summary{display:flex;align-items:center;gap:7px;padding:9px 11px;color:var(--text-secondary);cursor:pointer;list-style:none}.summary-boundary summary::-webkit-details-marker{display:none}.summary-boundary summary strong{color:var(--text-primary);font-size:12px}.summary-boundary summary span{font-size:10px;color:var(--text-muted)}.summary-boundary__chevron{margin-left:auto;transition:transform .16s}.summary-boundary[open] .summary-boundary__chevron{transform:rotate(180deg)}.summary-boundary p{margin:0;padding:10px 12px;border-top:1px solid var(--border-color);font-size:12px;line-height:1.65;white-space:pre-wrap}.summary-boundary small{display:block;padding:0 12px 10px;color:var(--text-muted);font-size:10px}
</style>
