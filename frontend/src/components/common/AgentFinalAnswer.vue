<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronDown, ChevronUp } from '@lucide/vue'
import { renderSafeMarkdown } from '../../utils/safeMarkdown.js'

const props = defineProps({
  content: { type: String, default: '' },
  streaming: Boolean,
  mentions: { type: Array, default: () => [] },
  collapsible: { type: Boolean, default: true },
  storageKey: { type: String, default: '' },
})

const root = ref(null)
const expanded = ref(true)
const isLong = ref(false)
let resizeObserver = null

const storageId = computed(() => props.storageKey ? `ccm.agent-final-answer.collapsed.${props.storageKey}` : '')
const html = computed(() => renderSafeMarkdown(props.content, { mentions: props.mentions }))
const collapsed = computed(() => isLong.value && !expanded.value)

const measure = () => {
  if (!root.value || props.streaming) return
  isLong.value = props.collapsible && (String(props.content || '').length > 1600 || root.value.scrollHeight > 560)
  if (!isLong.value) expanded.value = true
}

const restore = () => {
  if (!storageId.value || typeof sessionStorage === 'undefined') return
  expanded.value = sessionStorage.getItem(storageId.value) !== '1'
}

const toggle = () => {
  expanded.value = !expanded.value
  if (storageId.value && typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(storageId.value, expanded.value ? '0' : '1')
  }
}

watch(storageId, restore, { immediate: true })
watch(() => [props.content, props.streaming], () => nextTick(measure), { flush: 'post' })
onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(measure)
    if (root.value) resizeObserver.observe(root.value)
  }
})
onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <section
    class="agent-final-answer"
    :class="{ 'agent-final-answer--collapsed': collapsed, 'agent-final-answer--streaming': streaming }"
    :aria-live="streaming ? 'polite' : undefined"
    :aria-busy="streaming ? 'true' : undefined"
  >
    <div ref="root" class="agent-final-answer__content" v-html="html"></div>
    <span v-if="streaming" class="agent-final-answer__cursor" aria-hidden="true">▌</span>
    <div v-if="collapsed" class="agent-final-answer__fade" aria-hidden="true"></div>
    <button
      v-if="isLong && !streaming"
      type="button"
      class="agent-final-answer__toggle"
      :aria-expanded="expanded"
      @click="toggle"
    >
      <ChevronUp v-if="expanded" :size="14" />
      <ChevronDown v-else :size="14" />
      {{ expanded ? '收起长回答' : '展开全文' }}
    </button>
  </section>
</template>

<style scoped>
.agent-final-answer{position:relative;width:min(100%,860px);min-width:0;color:var(--text-primary);font-size:14px;line-height:1.72;overflow-wrap:anywhere}.agent-final-answer__content{min-width:0}.agent-final-answer--collapsed .agent-final-answer__content{max-height:420px;overflow:hidden}.agent-final-answer__fade{position:absolute;right:0;bottom:32px;left:0;height:72px;pointer-events:none;background:linear-gradient(transparent,var(--bg-primary,white))}.agent-final-answer__toggle{display:inline-flex;align-items:center;gap:5px;margin-top:7px;padding:4px 7px;border:0;border-radius:5px;background:transparent;color:var(--text-muted);font-size:10.5px;font-weight:700;cursor:pointer}.agent-final-answer__toggle:hover,.agent-final-answer__toggle:focus-visible{background:var(--control-hover);color:var(--text-primary)}.agent-final-answer__toggle:focus-visible{outline:2px solid var(--accent-blue);outline-offset:2px}.agent-final-answer__cursor{display:inline-block;margin-left:2px;color:var(--accent-blue);font-weight:800;animation:answer-cursor 1s ease-in-out infinite}
.agent-final-answer :deep(p){margin:0 0 .72em}.agent-final-answer :deep(p:last-child){margin-bottom:0}.agent-final-answer :deep(h1),.agent-final-answer :deep(h2),.agent-final-answer :deep(h3),.agent-final-answer :deep(h4),.agent-final-answer :deep(h5),.agent-final-answer :deep(h6){margin:1.18em 0 .48em;color:var(--text-primary);font-weight:780;line-height:1.35}.agent-final-answer :deep(h1:first-child),.agent-final-answer :deep(h2:first-child),.agent-final-answer :deep(h3:first-child){margin-top:0}.agent-final-answer :deep(h1){font-size:1.38em}.agent-final-answer :deep(h2){font-size:1.23em}.agent-final-answer :deep(h3){font-size:1.1em}.agent-final-answer :deep(h4),.agent-final-answer :deep(h5),.agent-final-answer :deep(h6){font-size:1em}.agent-final-answer :deep(ul),.agent-final-answer :deep(ol){margin:.4em 0 .82em;padding-left:1.55em}.agent-final-answer :deep(li){margin:.24em 0}.agent-final-answer :deep(li>p){margin:.18em 0}.agent-final-answer :deep(blockquote){margin:.8em 0;padding:.15em 0 .15em .9em;border-left:3px solid var(--border-strong,var(--accent-blue));color:var(--text-secondary)}.agent-final-answer :deep(a){color:var(--accent-blue);text-decoration-thickness:1px;text-underline-offset:2px}.agent-final-answer :deep(code){padding:.12em .34em;border:1px solid color-mix(in srgb,var(--border-color) 76%,transparent);border-radius:4px;background:var(--panel-muted);color:var(--text-primary);font: .9em/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}.agent-final-answer :deep(pre){max-width:100%;margin:.8em 0;padding:12px 13px;overflow-x:auto;overflow-y:visible;border:1px solid var(--border-color);border-radius:7px;background:color-mix(in srgb,var(--panel-muted) 72%,var(--bg-primary));white-space:pre}.agent-final-answer :deep(pre code){padding:0;border:0;background:transparent;white-space:pre}.agent-final-answer :deep(hr){margin:1.1em 0;border:0;border-top:1px solid var(--border-color)}.agent-final-answer :deep(table){display:block;max-width:100%;margin:.8em 0;border-collapse:collapse;overflow-x:auto}.agent-final-answer :deep(th),.agent-final-answer :deep(td){padding:6px 9px;border:1px solid var(--border-color);text-align:left}.agent-final-answer :deep(th){background:var(--panel-muted);font-weight:750}.agent-final-answer :deep(.agent-final-answer__mention){color:var(--accent-blue);font-weight:700}.agent-final-answer :deep(.agent-markdown-image-alt){color:var(--text-muted);font-size:.9em}
@keyframes answer-cursor{0%,100%{opacity:.2}50%{opacity:1}}@media(prefers-reduced-motion:reduce){.agent-final-answer__cursor{animation:none}}@media(max-width:560px){.agent-final-answer{width:100%;font-size:13.5px;line-height:1.68}.agent-final-answer :deep(pre){padding:10px}}
</style>
