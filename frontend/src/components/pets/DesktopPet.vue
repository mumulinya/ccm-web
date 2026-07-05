<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import PetSprite from './PetSprite.vue'

const props = defineProps({
  agent: { type: String, required: true },
  label: { type: String, default: '' },
  displayName: { type: String, default: '' },
  petLabel: { type: String, default: '' },
  petType: { type: String, default: 'cat' },
  agentState: { type: String, default: 'idle' },
  initialX: { type: Number, default: null },
  initialY: { type: Number, default: null }
})

const emit = defineEmits(['menu', 'move'])

const x = ref(props.initialX ?? (window.innerWidth - 120 - Math.random() * 100))
const y = ref(props.initialY ?? (window.innerHeight - 160 - Math.random() * 100))
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })
const showBubble = ref(false)
const bubbleText = ref('')
const bubbleTimer = ref(null)

const petSize = 64

const idleMessages = [
  '需要帮忙吗？',
  '我在呢～',
  '有什么任务？',
  '随时待命！',
  '点击我有惊喜~'
]
const workingMessages = [
  '正在努力工作中...',
  '马上就好！',
  '处理中...',
  '专心工作中~'
]
const errorMessages = [
  '出了点问题...',
  '需要检查一下',
  '出错了！',
  '请求支援！'
]
const happyMessages = [
  '完成啦！✨',
  '搞定！',
  '任务完成！',
  '耶！'
]
const planningMessages = [
  '我先拆一下步骤...',
  '正在规划路线...',
  '判断下一步中...'
]
const buildingMessages = [
  '开始动手执行...',
  '正在推进任务...',
  '协调开发中...'
]
const debuggingMessages = [
  '我排查一下问题...',
  '正在定位失败点...',
  '返工修复中...'
]
const reviewingMessages = [
  '正在验收结果...',
  '复盘一下交付...',
  '检查证据中...'
]
const waitingMessages = [
  '需要你确认一下',
  '等你一句话继续',
  '这里需要选择'
]

const stateMessages = computed(() => {
  const map = {
    idle: idleMessages,
    working: workingMessages,
    thinking: workingMessages,
    planning: planningMessages,
    building: buildingMessages,
    debugging: debuggingMessages,
    reviewing: reviewingMessages,
    waiting: waitingMessages,
    notification: waitingMessages,
    attention: reviewingMessages,
    error: errorMessages,
    happy: happyMessages,
    drag: ['被你抓住啦', '换个舒服的位置～', '移动中...'],
    sleeping: ['💤 zzz...']
  }
  return map[effectiveState.value] || idleMessages
})

const effectiveState = computed(() => isDragging.value ? 'drag' : props.agentState)
const displayLabel = computed(() => {
  const value = String(props.petLabel || props.displayName || props.label || props.agent || '').trim()
  const lower = value.toLowerCase()
  if (lower === 'music' || lower === 'music-agent' || lower === 'global' || lower === 'global-agent') return ''
  return value
})

const showRandomBubble = () => {
  const msgs = stateMessages.value
  bubbleText.value = msgs[Math.floor(Math.random() * msgs.length)]
  showBubble.value = true
  if (bubbleTimer.value) clearTimeout(bubbleTimer.value)
  bubbleTimer.value = setTimeout(() => { showBubble.value = false }, 3000)
}

const handleClick = (e) => {
  if (isDragging.value) return
  showRandomBubble()
}

const handleDblClick = () => {
  emit('menu', props.agent)
}

const onMouseDown = (e) => {
  isDragging.value = false
  dragOffset.value = {
    x: e.clientX - x.value,
    y: e.clientY - y.value
  }
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

const onMouseMove = (e) => {
  isDragging.value = true
  const newX = e.clientX - dragOffset.value.x
  const newY = e.clientY - dragOffset.value.y
  x.value = Math.max(0, Math.min(window.innerWidth - petSize, newX))
  y.value = Math.max(0, Math.min(window.innerHeight - petSize, newY))
}

const onMouseUp = () => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  if (isDragging.value) {
    emit('move', { agent: props.agent, x: x.value, y: y.value })
    setTimeout(() => { isDragging.value = false }, 50)
  }
}

// 触屏支持
const onTouchStart = (e) => {
  isDragging.value = false
  const touch = e.touches[0]
  dragOffset.value = {
    x: touch.clientX - x.value,
    y: touch.clientY - y.value
  }
  document.addEventListener('touchmove', onTouchMove, { passive: false })
  document.addEventListener('touchend', onTouchEnd)
}

const onTouchMove = (e) => {
  e.preventDefault()
  isDragging.value = true
  const touch = e.touches[0]
  const newX = touch.clientX - dragOffset.value.x
  const newY = touch.clientY - dragOffset.value.y
  x.value = Math.max(0, Math.min(window.innerWidth - petSize, newX))
  y.value = Math.max(0, Math.min(window.innerHeight - petSize, newY))
}

const onTouchEnd = () => {
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onTouchEnd)
  if (isDragging.value) {
    emit('move', { agent: props.agent, x: x.value, y: y.value })
    setTimeout(() => { isDragging.value = false }, 50)
  }
}

onUnmounted(() => {
  if (bubbleTimer.value) clearTimeout(bubbleTimer.value)
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  document.removeEventListener('touchmove', onTouchMove)
  document.removeEventListener('touchend', onTouchEnd)
})
</script>

<template>
  <div
    class="desktop-pet"
    :style="{ left: x + 'px', top: y + 'px' }"
    @mousedown="onMouseDown"
    @touchstart="onTouchStart"
    @click="handleClick"
    @dblclick="handleDblClick"
  >
    <!-- 气泡 -->
    <transition name="bubble">
      <div v-if="showBubble" class="pet-bubble">
        <span>{{ bubbleText }}</span>
        <div class="bubble-arrow"></div>
      </div>
    </transition>

    <!-- 宠物精灵 -->
    <PetSprite :type="petType" :state="effectiveState" :size="petSize" :name="displayLabel" />
  </div>
</template>

<style scoped>
.desktop-pet {
  position: fixed;
  z-index: 9998;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  transition: filter 0.3s;
}
.desktop-pet:active {
  cursor: grabbing;
}
.desktop-pet:hover {
  filter: brightness(1.1);
}

.pet-bubble {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-secondary, #1e293b);
  border: 1px solid var(--border-color, #334155);
  border-radius: 12px;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--text-primary, #e2e8f0);
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  pointer-events: none;
}

.bubble-arrow {
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid var(--border-color, #334155);
}

.bubble-enter-active { animation: bubble-in 0.3s ease-out; }
.bubble-leave-active { animation: bubble-out 0.2s ease-in; }

@keyframes bubble-in {
  from { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.8); }
  to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
@keyframes bubble-out {
  from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  to { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.8); }
}
</style>
