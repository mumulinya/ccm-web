<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { MessageCircleQuestion, Send, Square, X } from '@lucide/vue'

const props = defineProps({
  scope: { type: String, required: true },
  scopeId: { type: String, default: '' },
  exactSessionId: { type: String, default: '' },
  active: Boolean,
})

const open = ref(false)
const question = ref('')
const answer = ref('')
const error = ref('')
const running = ref(false)
let controller = null

const identityKey = computed(() => `${props.scope}:${props.scopeId || (props.scope === 'global' ? 'global' : '')}:${props.exactSessionId}`)
const canSubmit = computed(() => !!question.value.trim() && !running.value && !!props.exactSessionId)

const openWithQuestion = (value = '') => {
  question.value = String(value || '').trim()
  answer.value = ''
  error.value = ''
  open.value = true
}

const handleExternalOpen = event => {
  if (String(event?.detail?.identityKey || '') !== identityKey.value) return
  openWithQuestion(event.detail?.question || '')
  if (event.detail?.submit === true && String(event.detail?.question || '').trim()) void submit()
}

const handleShortcut = event => {
  if ((!event.ctrlKey && !event.metaKey) || event.altKey || event.shiftKey) return
  if (!(event.code === 'Semicolon' || event.key === ';')) return
  if (event.isComposing || !props.exactSessionId) return
  const target = event.target
  if (target?.closest?.('input, textarea, [contenteditable="true"], [role="dialog"], .terminal, .xterm')) return
  event.preventDefault()
  openWithQuestion()
}

const submit = async () => {
  if (!canSubmit.value) return
  controller = new AbortController()
  running.value = true
  answer.value = ''
  error.value = ''
  try {
    const response = await fetch('/api/conversations/aside?stream=1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        scope: props.scope,
        scopeId: props.scopeId || (props.scope === 'global' ? 'global' : ''),
        exactSessionId: props.exactSessionId,
        question: question.value.trim(),
      }),
    })
    if (!response.ok || !response.body) throw new Error((await response.json().catch(() => null))?.error || '临时提问失败')
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const frames = buffer.split('\n\n')
      buffer = frames.pop() || ''
      for (const frame of frames) {
        const event = frame.match(/^event:\s*(.+)$/m)?.[1]?.trim()
        const raw = frame.match(/^data:\s*(.+)$/m)?.[1]
        if (!raw) continue
        const data = JSON.parse(raw)
        if (event === 'delta') answer.value += String(data.delta || '')
        if (event === 'error') throw new Error(data.error || '临时提问失败')
      }
    }
  } catch (reason) {
    if (reason?.name !== 'AbortError') error.value = reason?.message || '临时提问失败'
  } finally {
    running.value = false
    controller = null
  }
}

const stop = () => controller?.abort()
const close = () => {
  stop()
  open.value = false
  question.value = ''
  answer.value = ''
  error.value = ''
}

onMounted(() => {
  window.addEventListener('ccm:conversation-aside', handleExternalOpen)
  window.addEventListener('keydown', handleShortcut)
})
onBeforeUnmount(() => {
  window.removeEventListener('ccm:conversation-aside', handleExternalOpen)
  window.removeEventListener('keydown', handleShortcut)
  stop()
})
</script>

<template>
  <section v-if="active || open" class="aside-dock" :class="{ expanded: open }">
    <button v-if="!open" type="button" class="aside-trigger" @click="openWithQuestion()">
      <MessageCircleQuestion :size="15" />
      临时提问
      <span>不打断当前任务 · Ctrl+;</span>
    </button>
    <template v-else>
      <header>
        <div><MessageCircleQuestion :size="16" /><strong>临时提问</strong><span>基于提问时上下文</span></div>
        <button type="button" aria-label="关闭临时提问" @click="close"><X :size="15" /></button>
      </header>
      <p v-if="answer" class="aside-answer">{{ answer }}</p>
      <p v-if="error" class="aside-error">{{ error }}</p>
      <div class="aside-input-row">
        <textarea v-model="question" rows="2" maxlength="4000" placeholder="问一个不影响当前任务的问题…" @keydown.ctrl.enter.prevent="submit" />
        <button v-if="running" type="button" class="aside-submit" title="停止" @click="stop"><Square :size="14" /></button>
        <button v-else type="button" class="aside-submit" :disabled="!canSubmit" title="发送临时问题" @click="submit"><Send :size="14" /></button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.aside-dock{margin:0 0 7px}.aside-trigger{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 10px;border:1px solid var(--border-color);border-radius:9px;background:var(--surface);color:var(--text-secondary);font-size:11px;cursor:pointer}.aside-trigger:hover{border-color:color-mix(in srgb,var(--accent-blue) 50%,var(--border-color));color:var(--accent-blue)}.aside-trigger span{color:var(--text-muted);font-size:9px}.aside-dock.expanded{padding:10px;border:1px solid color-mix(in srgb,var(--accent-blue) 32%,var(--border-color));border-radius:12px;background:var(--surface);box-shadow:0 8px 24px rgba(15,23,42,.08)}header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}header>div{display:flex;align-items:center;gap:6px}header strong{font-size:12px}header span{color:var(--text-muted);font-size:9px}header button{display:grid;place-items:center;width:26px;height:26px;border:0;border-radius:7px;background:transparent;color:var(--text-muted);cursor:pointer}.aside-answer{max-height:180px;overflow:auto;margin:0 0 8px;padding:9px 10px;border-radius:8px;background:var(--bg-secondary);color:var(--text-primary);font-size:12px;line-height:1.65;white-space:pre-wrap}.aside-error{margin:0 0 8px;color:var(--accent-red);font-size:11px}.aside-input-row{display:flex;align-items:flex-end;gap:7px}.aside-input-row textarea{box-sizing:border-box;min-height:52px;max-height:120px;flex:1;resize:vertical;padding:8px 10px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-primary);color:var(--text-primary);font:inherit;font-size:12px;outline:0}.aside-input-row textarea:focus{border-color:var(--accent-blue);box-shadow:0 0 0 2px color-mix(in srgb,var(--accent-blue) 14%,transparent)}.aside-submit{display:grid;place-items:center;width:34px;height:34px;border:0;border-radius:9px;background:var(--accent-blue);color:#fff;cursor:pointer}.aside-submit:disabled{opacity:.4;cursor:not-allowed}@media(max-width:560px){.aside-trigger{width:100%;justify-content:center}.aside-dock.expanded{border-radius:10px}.aside-trigger span{display:none}}
</style>
