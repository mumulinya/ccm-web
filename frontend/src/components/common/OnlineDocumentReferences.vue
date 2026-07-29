<script setup>
import { computed } from 'vue'
import { CircleCheck, FileText, Link2, LockKeyhole, TriangleAlert } from '@lucide/vue'

const props = defineProps({
  text: { type: String, default: '' },
  sources: { type: Array, default: () => [] },
  pendingLabel: { type: String, default: '发送后读取' },
  compact: { type: Boolean, default: false },
})

const extractedUrls = computed(() => {
  const matches = String(props.text || '').match(/https?:\/\/[^\s<>"'，。；！？）\]]+/gi) || []
  return [...new Set(matches.map(value => value.replace(/[),.;]+$/, '')))].slice(0, 3)
})

const rows = computed(() => {
  const sourceRows = Array.isArray(props.sources) ? props.sources : []
  const byUrl = new Map(sourceRows.map(item => [String(item?.url || ''), item]))
  const urls = [...new Set([...extractedUrls.value, ...sourceRows.map(item => String(item?.url || '')).filter(Boolean)])].slice(0, 3)
  return urls.map(url => {
    let parsed
    try { parsed = new URL(url) } catch { parsed = null }
    const source = byUrl.get(url) || {}
    const tencent = parsed?.hostname === 'docs.qq.com' || parsed?.hostname?.endsWith('.docs.qq.com')
    const status = source.status || 'pending'
    return {
      url,
      name: tencent ? '腾讯文档' : '在线文档',
      detail: parsed ? `${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}` : url,
      status,
      readable: source.readable === true,
      error: source.error || source.summary || '',
    }
  })
})

const statusLabel = row => {
  if (row.readable || row.status === 'parsed' || row.status === 'partial') return '已读取'
  if (row.status === 'needs_authorization') return '需要授权'
  if (row.status === 'failed' || row.status === 'unsupported') return '读取失败'
  return props.pendingLabel
}
</script>

<template>
  <div v-if="rows.length" class="online-document-references" :class="{ compact }">
    <article v-for="row in rows" :key="row.url" :class="['online-document-reference', row.status]">
      <span class="online-document-icon"><FileText :size="14" /></span>
      <span class="online-document-copy">
        <strong>{{ row.name }}</strong>
        <small :title="row.url">{{ row.detail }}</small>
      </span>
      <span class="online-document-state">
        <CircleCheck v-if="row.readable || row.status === 'parsed' || row.status === 'partial'" :size="13" />
        <LockKeyhole v-else-if="row.status === 'needs_authorization'" :size="13" />
        <TriangleAlert v-else-if="row.status === 'failed' || row.status === 'unsupported'" :size="13" />
        <Link2 v-else :size="13" />
        {{ statusLabel(row) }}
      </span>
    </article>
    <small v-if="!compact" class="online-document-note">私有腾讯文档需要公开分享，或在设置中心配置显式授权。</small>
  </div>
</template>

<style scoped>
.online-document-references{display:grid;gap:5px}.online-document-reference{display:grid;grid-template-columns:26px minmax(0,1fr) auto;align-items:center;gap:7px;min-width:0;padding:6px 8px;border:1px solid color-mix(in srgb,var(--accent-blue) 18%,var(--border-color));border-radius:6px;background:color-mix(in srgb,var(--accent-blue) 4%,var(--surface));color:var(--accent-blue)}.online-document-icon{width:24px;height:24px;display:grid;place-items:center;border-radius:5px;background:color-mix(in srgb,var(--accent-blue) 10%,var(--surface))}.online-document-copy{display:grid;min-width:0;gap:1px}.online-document-copy strong{color:var(--text-primary);font-size:10.5px}.online-document-copy small{overflow:hidden;color:var(--text-muted);font-size:9.5px;text-overflow:ellipsis;white-space:nowrap}.online-document-state{display:inline-flex;align-items:center;gap:4px;color:var(--text-secondary);font-size:9.5px;white-space:nowrap}.online-document-reference.needs_authorization .online-document-state,.online-document-reference.failed .online-document-state,.online-document-reference.unsupported .online-document-state{color:var(--accent-yellow)}.online-document-reference.parsed .online-document-state,.online-document-reference.partial .online-document-state{color:var(--accent-green)}.online-document-note{color:var(--text-muted);font-size:9.5px;line-height:1.4}.compact .online-document-note{display:none}@media(max-width:560px){.online-document-reference{grid-template-columns:24px minmax(0,1fr)}.online-document-state{grid-column:2}}
</style>
