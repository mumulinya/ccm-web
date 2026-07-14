<script setup>
import { computed } from 'vue'

const props = defineProps({ content: { type: String, default: '' } })
const escapeHtml = value => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const safeHref = value => {
  try {
    const url = new URL(String(value || '').trim())
    return ['http:', 'https:'].includes(url.protocol) ? escapeHtml(url.href) : ''
  } catch { return '' }
}
const rendered = computed(() => {
  let html = escapeHtml(props.content.replace(/^---\r?\n[\s\S]*?\r?\n---/, '')).replace(/\r\n/g, '\n')
  const codeBlocks = []
  html = html.replace(/```([^\n]*)\n([\s\S]*?)```/g, (_match, language, code) => {
    const token = `@@CCM_CODE_${codeBlocks.length}@@`
    codeBlocks.push(`<pre class="md-code"><code data-language="${escapeHtml(language.trim())}">${code.trim()}</code></pre>`)
    return token
  })
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    const safe = safeHref(href)
    return safe ? `<a class="md-link" href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>` : `${label} (${escapeHtml(href)})`
  })
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
    .replace(/^### (.*)$/gim, '<h4>$1</h4>')
    .replace(/^## (.*)$/gim, '<h3>$1</h3>')
    .replace(/^# (.*)$/gim, '<h2>$1</h2>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/^\s*-\s+(.*)$/gim, '<li>$1</li>')
  html = html.split('\n\n').map(block => {
    const value = block.trim()
    if (!value) return ''
    if (/^(@@CCM_CODE_|<h|<li)/.test(value)) return value
    return `<p>${value.replace(/\n/g, '<br>')}</p>`
  }).join('\n')
  codeBlocks.forEach((block, index) => { html = html.replace(`@@CCM_CODE_${index}@@`, block) })
  return html
})
</script>

<template><div class="skill-markdown" data-testid="safe-skill-markdown" v-html="rendered"></div></template>

<style scoped>
.skill-markdown { color: var(--text-secondary); font-size: 12.5px; line-height: 1.65; overflow-wrap: anywhere; }
.skill-markdown :deep(h2) { margin: 0 0 14px; padding-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,.06); color: var(--text-primary); font-size: 18px; }
.skill-markdown :deep(h3) { margin: 20px 0 10px; color: var(--text-primary); font-size: 15px; }
.skill-markdown :deep(h4) { margin: 16px 0 8px; color: var(--text-primary); font-size: 13px; }
.skill-markdown :deep(p) { margin: 0 0 12px; }
.skill-markdown :deep(li) { margin: 5px 0 5px 18px; }
.skill-markdown :deep(.md-code) { overflow: auto; padding: 12px 14px; border: 1px solid rgba(0,0,0,.06); border-radius: 6px; background: rgba(0,0,0,.03); white-space: pre; }
.skill-markdown :deep(.md-inline-code) { padding: 2px 5px; border-radius: 4px; background: rgba(0,0,0,.04); }
.skill-markdown :deep(.md-link) { color: var(--accent-blue, #2563eb); }
</style>
