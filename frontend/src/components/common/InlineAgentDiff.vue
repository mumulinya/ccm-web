<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { AlertTriangle, Check, Copy, ExternalLink, LoaderCircle, RefreshCcw } from '@lucide/vue'

const props = defineProps({
  event: { type: Object, required: true },
  file: { type: Object, required: true },
  showFullAction: { type: Boolean, default: true },
})
const emit = defineEmits(['open-full'])

const loading = ref(false)
const error = ref('')
const detail = ref(null)
const copied = ref(false)

const query = computed(() => new URLSearchParams({
  scope: String(props.event?.scope || ''),
  scope_id: String(props.event?.scopeId || ''),
  exact_session_id: String(props.event?.exactSessionId || ''),
}).toString())

const raw = computed(() => String(detail.value?.diff?.raw || ''))
const rows = computed(() => {
  let oldLine = null
  let newLine = null
  return raw.value.split('\n').map((source, index) => {
    if (source.startsWith('@@')) {
      const match = source.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/)
      oldLine = match ? Number(match[1]) : null
      newLine = match ? Number(match[2]) : null
      return { key: index, kind: 'meta', oldLine: '', newLine: '', sign: '', text: source }
    }
    if (source.startsWith('diff ') || source.startsWith('index ') || source.startsWith('---') || source.startsWith('+++')) {
      return { key: index, kind: 'meta', oldLine: '', newLine: '', sign: '', text: source }
    }
    if (source.startsWith('+')) {
      const row = { key: index, kind: 'add', oldLine: '', newLine: newLine ?? '', sign: '+', text: source.slice(1) }
      if (newLine !== null) newLine += 1
      return row
    }
    if (source.startsWith('-')) {
      const row = { key: index, kind: 'remove', oldLine: oldLine ?? '', newLine: '', sign: '-', text: source.slice(1) }
      if (oldLine !== null) oldLine += 1
      return row
    }
    const row = { key: index, kind: 'context', oldLine: oldLine ?? '', newLine: newLine ?? '', sign: ' ', text: source.startsWith(' ') ? source.slice(1) : source }
    if (oldLine !== null) oldLine += 1
    if (newLine !== null) newLine += 1
    return row
  })
})

const freshnessLabel = computed(() => ({
  active_worktree: '项目子 Agent当前工作区',
  accepted_delivery: '已验收交付版本',
  current_authority: '当前权威仓库',
  drifted: '当前文件已变化',
  unavailable: '差异暂不可用',
})[detail.value?.freshness] || '')

const load = async () => {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const response = await fetch(`/api/agent-execution/events/${encodeURIComponent(props.event.eventId)}/detail?${query.value}`, {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ includeDiff: true, path: props.file.path }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || payload.success === false) throw new Error(payload.error || '读取文件差异失败')
    detail.value = payload
  } catch (cause) {
    error.value = cause?.message || '读取文件差异失败'
  } finally {
    loading.value = false
  }
}

const copy = async () => {
  if (!raw.value) return
  try {
    await navigator.clipboard.writeText(raw.value)
    copied.value = true
    window.setTimeout(() => { copied.value = false }, 1600)
  } catch {
    error.value = '复制失败，请选择差异内容后复制'
  }
}

watch(() => [props.event?.eventId, props.file?.path], () => {
  detail.value = null
  error.value = ''
  void load()
})
onMounted(load)
</script>

<template>
  <section class="inline-agent-diff" :aria-label="`${file.path} 文件差异`">
    <header>
      <div>
        <strong :title="file.path">{{ file.path }}</strong>
        <small v-if="freshnessLabel"><Check v-if="detail?.diff?.available" :size="11" />{{ freshnessLabel }}</small>
      </div>
      <div class="inline-agent-diff-actions">
        <button type="button" :disabled="!raw" @click="copy"><Copy :size="12" />{{ copied ? '已复制' : '复制Diff' }}</button>
        <button v-if="showFullAction" type="button" @click="emit('open-full', file)"><ExternalLink :size="12" />完整审核</button>
      </div>
    </header>

    <div v-if="loading" class="inline-agent-diff-state"><LoaderCircle :size="15" class="spin" />正在读取项目子 Agent产生的差异…</div>
    <div v-else-if="error" class="inline-agent-diff-state error"><AlertTriangle :size="15" />{{ error }}<button type="button" @click="load"><RefreshCcw :size="12" />重试</button></div>
    <div v-else-if="!detail?.diff?.available" class="inline-agent-diff-state"><AlertTriangle :size="15" />{{ detail?.diff?.reason || '当前没有可展示的文本差异' }}</div>
    <div v-else class="inline-agent-diff-code" role="region" tabindex="0" :aria-label="`${file.path} 统一Diff`">
      <div v-for="row in rows" :key="row.key" :class="['inline-agent-diff-line', row.kind]">
        <span class="old">{{ row.oldLine }}</span>
        <span class="new">{{ row.newLine }}</span>
        <span class="sign">{{ row.sign }}</span>
        <code>{{ row.text || ' ' }}</code>
      </div>
    </div>
    <footer v-if="detail?.diff?.truncated">Diff较长，当前仅展示安全截断范围；可进入完整审核页继续查看。</footer>
  </section>
</template>

<style scoped>
.inline-agent-diff { margin: 4px 8px 8px 32px; overflow: hidden; border: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 36%, transparent); border-radius: 8px; background: color-mix(in srgb, var(--surface, #fff) 98%, transparent); }
.inline-agent-diff > header { min-height: 36px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 6px 9px; border-bottom: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 24%, transparent); }
.inline-agent-diff > header > div:first-child { min-width: 0; display: grid; gap: 2px; }
.inline-agent-diff strong { overflow: hidden; color: var(--text-primary); font: 600 11px/1.4 var(--font-mono, monospace); text-overflow: ellipsis; white-space: nowrap; }
.inline-agent-diff small { display: inline-flex; align-items: center; gap: 4px; color: var(--text-muted); font-size: 9px; }
.inline-agent-diff-actions { flex: 0 0 auto; display: flex; gap: 5px; }
.inline-agent-diff button { display: inline-flex; align-items: center; gap: 4px; padding: 3px 6px; border: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 38%, transparent); border-radius: 5px; color: var(--text-secondary); background: transparent; font-size: 9px; cursor: pointer; }
.inline-agent-diff button:hover:not(:disabled) { color: var(--accent-blue, #2563eb); border-color: color-mix(in srgb, var(--accent-blue, #2563eb) 42%, transparent); }
.inline-agent-diff button:disabled { opacity: .45; cursor: default; }
.inline-agent-diff-state { min-height: 62px; display: flex; align-items: center; justify-content: center; gap: 7px; padding: 12px; color: var(--text-muted); font-size: 10px; }
.inline-agent-diff-state.error { color: #b45309; }
.inline-agent-diff-code { max-height: 330px; overflow: auto; overscroll-behavior: contain; font: 10px/1.55 var(--font-mono, ui-monospace, monospace); }
.inline-agent-diff-line { min-width: max-content; display: grid; grid-template-columns: 42px 42px 18px minmax(560px, 1fr); min-height: 20px; color: var(--text-secondary); }
.inline-agent-diff-line > span { padding: 2px 6px; color: var(--text-muted); text-align: right; user-select: none; }
.inline-agent-diff-line .sign { text-align: center; }
.inline-agent-diff-line code { padding: 2px 10px 2px 2px; white-space: pre; }
.inline-agent-diff-line.add { background: color-mix(in srgb, #22c55e 12%, transparent); }
.inline-agent-diff-line.add .sign { color: #15803d; }
.inline-agent-diff-line.remove { background: color-mix(in srgb, #ef4444 11%, transparent); }
.inline-agent-diff-line.remove .sign { color: #b91c1c; }
.inline-agent-diff-line.meta { color: var(--text-muted); background: color-mix(in srgb, var(--border-color, #94a3b8) 9%, transparent); }
.inline-agent-diff > footer { padding: 5px 9px; border-top: 1px solid color-mix(in srgb, var(--border-color, #94a3b8) 20%, transparent); color: var(--text-muted); font-size: 9px; }
.spin { animation: inline-diff-spin 1s linear infinite; }
@keyframes inline-diff-spin { to { transform: rotate(360deg); } }
@media (max-width: 720px) {
  .inline-agent-diff { margin-left: 18px; }
  .inline-agent-diff > header { align-items: flex-start; flex-direction: column; }
  .inline-agent-diff-line { grid-template-columns: 34px 34px 16px minmax(420px, 1fr); }
}
@media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
</style>
