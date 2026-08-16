<script setup>
import { computed, onMounted, ref } from 'vue'
import { Check, ChevronDown, ChevronRight, Circle, Copy, RefreshCcw } from '@lucide/vue'
import ToolResultDetail from '../common/ToolResultDetail.vue'

const props = defineProps({ item: { type: Object, required: true } })
const sourceItem = computed(() => {
  if (props.item.source === 'user_visible_agent_event') return props.item
  return (props.item.raw_events || []).find(row => row?.source === 'user_visible_agent_event' && row?.tool_display) || props.item
})
const display = ref(sourceItem.value.tool_display || props.item.tool_display || null)
const loading = ref(false)
const error = ref('')
const notice = ref('')
const expanded = ref(new Set())
const fileRows = computed(() => Array.isArray(display.value?.result?.fileRows) ? display.value.result.fileRows : [])
const toolName = computed(() => String(display.value?.tool?.name || '').toLowerCase())
const isSourceRead = computed(() => ['read_file', 'read_files'].includes(toolName.value))
const range = file => {
  const from = Math.max(1, Number(file?.from || file?.lines?.[0]?.line || 1))
  const to = Math.max(from, Number(file?.to || file?.lines?.at?.(-1)?.line || from))
  return from === to ? `第 ${from} 行` : `第 ${from}–${to} 行`
}
const freshness = file => file?.freshness === 'drifted' ? '文件已变化，下面是当前版本'
  : file?.freshness === 'deleted' ? '文件已删除'
    : file?.freshness === 'permission_revoked' ? '源码读取权限已撤销'
      : file?.observedChecksum && file?.currentChecksum ? '与执行时版本一致' : '当前权威版本'
const toggle = file => {
  const next = new Set(expanded.value)
  next.has(file.path) ? next.delete(file.path) : next.add(file.path)
  expanded.value = next
}
const mergeRows = (previous, current) => {
  const byPath = new Map((previous || []).map(file => [file.path, { ...file, lines: [...(file.lines || [])] }]))
  for (const file of current || []) {
    const old = byPath.get(file.path)
    const lines = new Map((old?.lines || []).map(line => [line.line, line]))
    for (const line of file.lines || []) lines.set(line.line, line)
    byPath.set(file.path, { ...old, ...file, lines: [...lines.values()].sort((a, b) => a.line - b.line), from: Math.min(old?.from || file.from, file.from), to: Math.max(old?.to || 0, file.to || 0) })
  }
  return [...byPath.values()]
}
const loadSource = async (continueRead = false) => {
  const link = sourceItem.value.replay_link || props.item.replay_link || {}
  const eventId = sourceItem.value.id || props.item.id
  if (!isSourceRead.value || !eventId || !link.scope || !link.scopeId || !link.exactSessionId || loading.value) return
  loading.value = true
  error.value = ''
  notice.value = continueRead ? '正在继续读取未读内容…' : '正在读取当前源码…'
  try {
    const query = new URLSearchParams({ scope: link.scope, scope_id: link.scopeId, exact_session_id: link.exactSessionId })
    const continuation = display.value?.result?.continuation
    const response = await fetch(`/api/agent-execution/events/${encodeURIComponent(eventId)}/detail?${query}`, {
      method: 'POST', cache: 'no-store', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(continueRead ? { includeSource: true, continue: true, continuation } : { includeSource: true }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || payload.success === false) throw new Error(payload.error || '源码读取失败')
    const current = payload.toolDisplay
    if (continueRead) current.result.fileRows = mergeRows(fileRows.value, current.result?.fileRows)
    display.value = current
    if (!expanded.value.size && fileRows.value[0]) expanded.value = new Set([fileRows.value[0].path])
    notice.value = continueRead ? '已补充读取当前版本内容' : ''
  } catch (cause) {
    error.value = cause?.message || '源码读取失败'
    notice.value = ''
  } finally { loading.value = false }
}
const copy = async file => {
  try { await navigator.clipboard.writeText((file.lines || []).map(line => String(line.text ?? '')).join('\n')); notice.value = `已复制 ${file.path}` }
  catch { error.value = '复制失败，请选择源码后复制' }
}
onMounted(() => { if (isSourceRead.value) void loadSource(false) })
</script>

<template>
  <ToolResultDetail :display="display" :custom-content="fileRows.length > 0" show-technical>
    <template #content>
      <div class="replay-source-list">
        <article v-for="file in fileRows" :key="file.path">
          <button type="button" class="source-toggle" :aria-expanded="expanded.has(file.path)" @click="toggle(file)">
            <span class="source-icon"><Circle v-if="file.status === 'partial'" :size="10" /><RefreshCcw v-else-if="file.status === 'unchanged'" :size="10" /><Check v-else :size="10" /></span>
            <span><strong>{{ file.path }}</strong><small>{{ range(file) }} · 共 {{ file.totalLines }} 行</small></span>
            <ChevronDown v-if="expanded.has(file.path)" :size="12" /><ChevronRight v-else :size="12" />
          </button>
          <div v-if="expanded.has(file.path)" class="source-body">
            <header><span>{{ freshness(file) }}</span><button v-if="file.lines?.length" type="button" @click="copy(file)"><Copy :size="11" />复制</button></header>
            <div class="source-lines"><div v-for="line in file.lines || []" :key="line.line"><span>{{ line.line }}</span><code>{{ line.text || ' ' }}</code></div></div>
          </div>
        </article>
      </div>
    </template>
    <template #actions>
      <button v-if="display?.result?.continuation?.pendingCount" type="button" class="source-action" :disabled="loading" @click="loadSource(true)">{{ loading ? '正在读取…' : '继续读取未读内容' }}</button>
      <button v-else-if="error" type="button" class="source-action" :disabled="loading" @click="loadSource(false)">{{ loading ? '正在重试…' : '重试读取当前源码' }}</button>
      <small v-if="notice">{{ notice }}</small><small v-if="error" class="source-error">{{ error }}</small>
    </template>
  </ToolResultDetail>
</template>

<style scoped>
.replay-source-list{display:grid;gap:2px;border-top:1px solid var(--border-color)}.replay-source-list article{border-bottom:1px solid var(--border-color)}.source-toggle{width:100%;display:grid;grid-template-columns:18px minmax(0,1fr) 16px;align-items:center;gap:7px;padding:8px 4px;border:0;background:transparent;color:var(--text-primary);text-align:left;cursor:pointer}.source-toggle>span:nth-child(2){min-width:0;display:grid;gap:2px}.source-toggle strong,.source-toggle small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.source-toggle strong{font:10.5px/1.4 ui-monospace,monospace}.source-toggle small{color:var(--text-muted);font-size:9.5px}.source-icon{color:#15803d}.source-body{padding:7px 8px 9px 26px}.source-body header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;color:var(--text-muted);font-size:9.5px}.source-body header button,.source-action{display:inline-flex;align-items:center;gap:3px;padding:3px 7px;border:1px solid var(--border-color);border-radius:4px;background:transparent;color:var(--text-secondary);font-size:9.5px;cursor:pointer}.source-lines{overflow-x:auto;background:var(--bg-secondary);border-radius:5px}.source-lines>div{display:grid;grid-template-columns:48px minmax(max-content,1fr);min-height:21px;border-bottom:1px solid var(--border-color)}.source-lines span{padding:3px 7px;color:var(--text-muted);font:9px/1.5 ui-monospace,monospace;text-align:right;user-select:none}.source-lines code{padding:3px 8px;white-space:pre;color:var(--text-secondary);font:9.5px/1.5 ui-monospace,monospace}.source-error{display:block;color:var(--accent-red)}@media(max-width:720px){.source-body{padding-left:0}}
</style>
