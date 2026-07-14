<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  scrollContainer: { type: Object, default: null },
  targetIdPrefix: { type: String, default: 'msg-' },
})

const emit = defineEmits(['navigate'])

const activeOriginalIndex = ref(null)
const hoveredItem = ref(null)
const tooltipPosition = ref({ left: 52, top: 80 })
const navigatorRoot = ref(null)
const navigatorGeometry = ref({ top: null, maxHeight: null })
let attachedContainer = null
let containerResizeObserver = null
let scrollFrame = 0

const preview = (value, max = 150) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text.slice(0, max) + (text.length > max ? '...' : '')
}

const tooltipStyle = computed(() => ({
  left: `${tooltipPosition.value.left}px`,
  top: `${tooltipPosition.value.top}px`,
}))

const navigatorStyle = computed(() => ({
  ...(navigatorGeometry.value.top === null ? {} : { top: `${navigatorGeometry.value.top}px` }),
  ...(navigatorGeometry.value.maxHeight === null ? {} : { maxHeight: `${navigatorGeometry.value.maxHeight}px` }),
}))

const markerLabel = (item, index) => {
  const summary = preview(item.userContent || '附件内容', 48)
  return `跳转到第 ${index + 1} 条用户消息：${summary}`
}

const findTarget = (item) => document.getElementById(`${props.targetIdPrefix}${item.originalIndex}`)

const keepActiveMarkerVisible = () => {
  const root = navigatorRoot.value
  if (!root || activeOriginalIndex.value === null) return
  const marker = root.querySelector(`[data-message-index="${activeOriginalIndex.value}"]`)
  const track = root.querySelector('.msg-nav-track')
  if (!marker || !track) return
  const markerTop = marker.offsetTop
  const markerBottom = markerTop + marker.offsetHeight
  if (markerTop < track.scrollTop) track.scrollTop = markerTop
  else if (markerBottom > track.scrollTop + track.clientHeight) track.scrollTop = markerBottom - track.clientHeight
}

const updateActiveMessage = () => {
  scrollFrame = 0
  const container = props.scrollContainer
  if (!container || props.items.length === 0) {
    activeOriginalIndex.value = props.items.at(-1)?.originalIndex ?? null
    return
  }

  const containerRect = container.getBoundingClientRect()
  const parentRect = navigatorRoot.value?.offsetParent?.getBoundingClientRect()
  if (parentRect) {
    navigatorGeometry.value = {
      top: containerRect.top - parentRect.top + containerRect.height / 2,
      maxHeight: Math.min(320, Math.max(90, containerRect.height - 16)),
    }
  }
  const anchor = containerRect.top + Math.min(container.clientHeight * 0.38, 240)
  let nearest = null
  let nearestDistance = Number.POSITIVE_INFINITY

  for (const item of props.items) {
    const target = findTarget(item)
    if (!target || target.offsetParent === null) continue
    const rect = target.getBoundingClientRect()
    const distance = Math.abs(rect.top - anchor)
    if (distance < nearestDistance) {
      nearest = item.originalIndex
      nearestDistance = distance
    }
  }

  if (nearest !== null) activeOriginalIndex.value = nearest
  nextTick(keepActiveMarkerVisible)
}

const scheduleActiveMessageUpdate = () => {
  if (scrollFrame) return
  scrollFrame = window.requestAnimationFrame(updateActiveMessage)
}

const detachScrollContainer = () => {
  if (attachedContainer) attachedContainer.removeEventListener('scroll', scheduleActiveMessageUpdate)
  if (containerResizeObserver) containerResizeObserver.disconnect()
  containerResizeObserver = null
  attachedContainer = null
}

const attachScrollContainer = async (container) => {
  detachScrollContainer()
  await nextTick()
  if (!container) return
  attachedContainer = container
  attachedContainer.addEventListener('scroll', scheduleActiveMessageUpdate, { passive: true })
  if (typeof ResizeObserver !== 'undefined') {
    containerResizeObserver = new ResizeObserver(scheduleActiveMessageUpdate)
    containerResizeObserver.observe(attachedContainer)
  }
  updateActiveMessage()
}

const showTooltip = (item, event) => {
  const rect = event.currentTarget.getBoundingClientRect()
  hoveredItem.value = item
  tooltipPosition.value = {
    left: Math.min(rect.right + 12, window.innerWidth - 80),
    top: Math.max(64, Math.min(rect.top + rect.height / 2, window.innerHeight - 64)),
  }
}

const hideTooltip = () => {
  hoveredItem.value = null
}

const navigateToItem = (item) => {
  activeOriginalIndex.value = item.originalIndex
  emit('navigate', item.originalIndex)
}

watch(() => props.scrollContainer, attachScrollContainer, { immediate: true })
watch(() => props.items.map(item => item.originalIndex).join(','), () => nextTick(updateActiveMessage), { immediate: true })

onUnmounted(() => {
  detachScrollContainer()
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame)
})
</script>

<template>
  <nav v-if="props.items.length > 1" ref="navigatorRoot" class="msg-navigator" :style="navigatorStyle" aria-label="会话消息跳转">
    <div class="msg-nav-track">
      <button
        v-for="(item, index) in props.items"
        :key="item.originalIndex"
        type="button"
        class="msg-nav-marker"
        :class="{ active: activeOriginalIndex === item.originalIndex, complete: Boolean(item.assistantContent) }"
        :data-message-index="item.originalIndex"
        :aria-label="markerLabel(item, index)"
        :aria-current="activeOriginalIndex === item.originalIndex ? 'true' : undefined"
        @mouseenter="showTooltip(item, $event)"
        @mouseleave="hideTooltip"
        @focus="showTooltip(item, $event)"
        @blur="hideTooltip"
        @click="navigateToItem(item)"
      >
        <span class="msg-nav-line"></span>
      </button>
    </div>
  </nav>

  <Teleport to="body">
    <Transition name="message-nav-preview">
      <aside v-if="hoveredItem" class="message-nav-preview" :style="tooltipStyle" role="status">
        <strong>{{ preview(hoveredItem.userContent || '附件内容') }}</strong>
        <p v-if="hoveredItem.assistantContent">{{ preview(hoveredItem.assistantContent, 190) }}</p>
        <div v-if="hoveredItem.files?.length" class="message-nav-files">
          <span v-for="file in hoveredItem.files.slice(0, 3)" :key="file.name || file.path">
            {{ file.name || file.path }}
          </span>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.msg-navigator {
  position: absolute;
  left: 10px;
  top: 50%;
  z-index: 100;
  width: 34px;
  max-height: min(320px, calc(100% - 112px));
  transform: translateY(-50%);
  pointer-events: none;
}

.msg-nav-track {
  display: flex;
  max-height: inherit;
  flex-direction: column;
  align-items: flex-start;
  overflow-y: auto;
  padding: 6px 0;
  scrollbar-width: none;
}

.msg-nav-track::-webkit-scrollbar {
  display: none;
}

.msg-nav-marker {
  display: grid;
  width: 34px;
  height: 15px;
  flex: 0 0 15px;
  place-items: center start;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
}

.msg-nav-line {
  display: block;
  width: 9px;
  height: 2px;
  background: rgba(100, 116, 139, 0.34);
  transition: width 150ms ease, height 150ms ease, background 150ms ease;
}

.msg-nav-marker:nth-child(3n) .msg-nav-line { width: 14px; }
.msg-nav-marker:nth-child(4n) .msg-nav-line { width: 7px; }
.msg-nav-marker.complete .msg-nav-line { background: rgba(71, 85, 105, 0.42); }
.msg-nav-marker:hover .msg-nav-line,
.msg-nav-marker:focus-visible .msg-nav-line { width: 21px; background: rgba(15, 23, 42, 0.68); }
.msg-nav-marker.active .msg-nav-line { width: 30px; height: 2px; background: #111827; }
.msg-nav-marker:focus-visible { outline: 2px solid rgba(37, 99, 235, 0.45); outline-offset: 1px; }

:global(.message-nav-preview) {
  position: fixed;
  z-index: 10020;
  width: min(400px, calc(100vw - 72px));
  max-width: calc(100vw - 72px);
  transform: translateY(-50%);
  padding: 12px 14px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.12);
  color: #111827;
  pointer-events: none;
}

:global(.message-nav-preview strong) {
  display: -webkit-box;
  overflow: hidden;
  font-size: 13.5px;
  line-height: 1.45;
  letter-spacing: 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

:global(.message-nav-preview p) {
  display: -webkit-box;
  overflow: hidden;
  margin: 5px 0 0;
  color: #6b7280;
  font-size: 12.5px;
  line-height: 1.5;
  letter-spacing: 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

:global(.message-nav-files) {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}

:global(.message-nav-files span) {
  max-width: 170px;
  overflow: hidden;
  color: #64748b;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:global(.message-nav-preview-enter-active),
:global(.message-nav-preview-leave-active) {
  transition: opacity 120ms ease, transform 120ms ease;
}

:global(.message-nav-preview-enter-from),
:global(.message-nav-preview-leave-to) {
  opacity: 0;
  transform: translate(-4px, -50%);
}

:global([data-theme="dark"] .message-nav-preview) {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(17, 24, 39, 0.98);
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.36);
  color: #f8fafc;
}

:global([data-theme="dark"] .message-nav-preview p),
:global([data-theme="dark"] .message-nav-files span) {
  color: #a8b0bd;
}

:global([data-theme="dark"]) .msg-nav-line { background: rgba(203, 213, 225, 0.34); }
:global([data-theme="dark"]) .msg-nav-marker.complete .msg-nav-line { background: rgba(226, 232, 240, 0.44); }
:global([data-theme="dark"]) .msg-nav-marker:hover .msg-nav-line,
:global([data-theme="dark"]) .msg-nav-marker:focus-visible .msg-nav-line { background: rgba(248, 250, 252, 0.72); }
:global([data-theme="dark"]) .msg-nav-marker.active .msg-nav-line { background: #f8fafc; }

@media (max-width: 720px) {
  .msg-navigator { left: 5px; width: 29px; max-height: min(260px, calc(100% - 100px)); }
  .msg-nav-marker { width: 29px; }
  .msg-nav-marker.active .msg-nav-line { width: 25px; }
  :global(.message-nav-preview) { width: min(330px, calc(100vw - 52px)); max-width: calc(100vw - 52px); }
}

@media (prefers-reduced-motion: reduce) {
  .msg-nav-line,
  :global(.message-nav-preview-enter-active),
  :global(.message-nav-preview-leave-active) { transition: none; }
}
</style>
