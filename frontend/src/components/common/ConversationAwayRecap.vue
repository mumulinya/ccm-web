<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { AlertTriangle, CheckCircle2, Clock3, X } from '@lucide/vue'

const props = defineProps({
  events: { type: Array, default: () => [] },
  scope: { type: String, required: true },
  scopeId: { type: String, default: '' },
  exactSessionId: { type: String, default: '' },
})

const recap = ref(null)
let dismissTimer = null
const sequenceBySession = new Map()
const storageKey = computed(() => `ccm:conversation-away:${props.scope}:${props.scopeId}:${props.exactSessionId}`)
const relevantEvents = computed(() => props.events.filter(event => (
  !props.exactSessionId || String(event?.exactSessionId || '') === String(props.exactSessionId)
)))
const latestSequence = computed(() => relevantEvents.value.reduce((max, event) => Math.max(max, Number(event?.sequence || 0)), 0))

const rememberDeparture = () => {
  if (!props.exactSessionId || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(storageKey.value, JSON.stringify({ hiddenAt: Date.now(), lastSequence: latestSequence.value }))
  } catch {}
}

const safeFileCount = events => {
  const paths = new Set()
  for (const event of events) {
    for (const file of event?.detail?.fileChanges || []) {
      const path = typeof file === 'string' ? file : file?.path
      if (path) paths.add(String(path))
    }
    const count = Number(event?.detail?.resultSummary?.filesChanged || event?.detail?.fileStats?.changedFiles || 0)
    if (count > paths.size) for (let index = paths.size; index < count; index += 1) paths.add(`count:${index}`)
  }
  return paths.size
}

const buildRecap = events => {
  if (!events.length) return null
  const currentGeneration = relevantEvents.value.reduce((max, event) => Math.max(max, Number(event?.generation || 0)), 0)
  const currentAttempt = relevantEvents.value.filter(event => Number(event?.generation || 0) === currentGeneration)
    .reduce((max, event) => Math.max(max, Number(event?.attempt || event?.detail?.agentDisplay?.attempt || 0)), 0)
  const active = events.filter(event => Number(event?.generation || 0) === currentGeneration && (!currentAttempt || Number(event?.attempt || event?.detail?.agentDisplay?.attempt || currentAttempt) === currentAttempt))
  const completedIds = new Set(active.filter(event => (
    ['agent_completed', 'tool_completed'].includes(event?.eventType) && event?.display?.status !== 'failed'
  )).map(event => event?.workItemId || event?.agentRunId || event?.toolCallId || event?.eventId).filter(Boolean))
  const failed = active.filter(event => event?.display?.status === 'failed' || ['agent_failed', 'tool_failed'].includes(event?.eventType)).length
  const paused = active.some(event => event?.detail?.pauseMilestone?.kind === 'paused')
  const needsAction = active.some(event => event?.eventType === 'permission_required' || ['blocked', 'waiting_permission'].includes(String(event?.display?.status || '')))
  const terminal = [...active].reverse().find(event => event?.eventType === 'result')
  const stage = [...active].reverse().find(event => event?.detail?.executionStage?.label || event?.detail?.executionStage?.kind)?.detail?.executionStage
  const files = safeFileCount(active)
  const facts = []
  if (completedIds.size) facts.push(`完成${completedIds.size}个执行项`)
  if (files) facts.push(`修改${files}个文件`)
  if (failed) facts.push(`${failed}项执行失败`)
  if (paused) facts.push('任务已暂停')
  else if (needsAction) facts.push('当前需要处理')
  else if (terminal?.display?.status === 'success') facts.push('任务已经完成')
  else if (terminal) facts.push('本轮执行已经结束')
  else if (stage?.label) facts.push(`当前处于${stage.label}`)
  else if (stage?.kind) facts.push(`当前仍在${String(stage.kind).replace(/_/g, ' ')}`)
  if (!facts.length) return null
  return { text: `离开期间：${facts.join('，')}。`, persistent: failed > 0 || paused || needsAction }
}

const inspectReturn = () => {
  if (!props.exactSessionId || typeof localStorage === 'undefined') return
  if (recap.value) return
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey.value) || 'null')
    if (!saved || Date.now() - Number(saved.hiddenAt || 0) < 180000) return
    const newer = relevantEvents.value.filter(event => Number(event?.sequence || 0) > Number(saved.lastSequence || 0))
    const next = buildRecap(newer)
    if (!next) return
    recap.value = next
    localStorage.setItem(storageKey.value, JSON.stringify({ hiddenAt: Date.now(), lastSequence: latestSequence.value }))
    if (!next.persistent) {
      if (dismissTimer) window.clearTimeout(dismissTimer)
      dismissTimer = window.setTimeout(() => { recap.value = null }, 12000)
    }
  } catch {}
}

const onVisibilityChange = () => {
  if (document.visibilityState === 'hidden') rememberDeparture()
  else inspectReturn()
}
const dismiss = () => { recap.value = null; if (dismissTimer) window.clearTimeout(dismissTimer) }

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', rememberDeparture)
  inspectReturn()
})
onBeforeUnmount(() => {
  rememberDeparture()
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('pagehide', rememberDeparture)
  if (dismissTimer) window.clearTimeout(dismissTimer)
})
watch([relevantEvents, storageKey], inspectReturn, { deep: false })
watch([storageKey, latestSequence], ([key, sequence]) => { if (key) sequenceBySession.set(key, Number(sequence || 0)) }, { immediate: true })
watch(storageKey, (next, previous) => {
  if (previous && previous !== next && typeof localStorage !== 'undefined') {
    try { localStorage.setItem(previous, JSON.stringify({ hiddenAt: Date.now(), lastSequence: sequenceBySession.get(previous) || 0 })) } catch {}
  }
  recap.value = null
  inspectReturn()
})
</script>

<template>
  <aside v-if="recap" class="cc-away-recap" :class="{ attention: recap.persistent }" role="status" aria-live="polite">
    <AlertTriangle v-if="recap.persistent" :size="15" aria-hidden="true" />
    <CheckCircle2 v-else :size="15" aria-hidden="true" />
    <div><strong>欢迎回来</strong><p>{{ recap.text }}</p></div>
    <Clock3 :size="13" aria-hidden="true" class="cc-away-clock" />
    <button type="button" title="关闭离开期间摘要" aria-label="关闭离开期间摘要" @click="dismiss"><X :size="14" /></button>
  </aside>
</template>

<style scoped>
.cc-away-recap { display: grid; grid-template-columns: 18px minmax(0, 1fr) auto 28px; align-items: center; gap: 8px; margin: 7px 12px; padding: 8px 10px; border: 1px solid color-mix(in srgb, var(--primary-color, #2563eb) 28%, var(--border-color, #cbd5e1)); border-radius: 9px; color: var(--text-secondary); background: color-mix(in srgb, var(--primary-color, #2563eb) 5%, var(--surface, #fff)); }
.cc-away-recap.attention { border-color: color-mix(in srgb, #d97706 42%, var(--border-color, #cbd5e1)); background: color-mix(in srgb, #f59e0b 7%, var(--surface, #fff)); }
.cc-away-recap > svg:first-child { color: var(--primary-color, #2563eb); }
.cc-away-recap.attention > svg:first-child { color: #d97706; }
.cc-away-recap strong { display: block; color: var(--text-primary); font-size: 11px; }
.cc-away-recap p { margin: 1px 0 0; font-size: 11px; line-height: 1.45; }
.cc-away-clock { color: var(--text-muted); }
.cc-away-recap button { width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border: 0; border-radius: 6px; color: var(--text-muted); background: transparent; cursor: pointer; }
.cc-away-recap button:hover { color: var(--text-primary); background: color-mix(in srgb, var(--text-primary, #0f172a) 6%, transparent); }
@media (max-width: 720px) { .cc-away-recap { margin-inline: 8px; grid-template-columns: 18px minmax(0, 1fr) 28px; } .cc-away-clock { display: none; } }
</style>
