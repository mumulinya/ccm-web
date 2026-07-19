<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  state: { type: String, default: 'idle' },
  size: { type: Number, default: 64 },
  direction: { type: String, default: '' },
  rows: { type: Number, default: 11 },
})

const ROWS = {
  idle: { row: 0, durations: [280, 110, 110, 140, 140, 320] },
  'running-right': { row: 1, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  'running-left': { row: 2, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  waving: { row: 3, durations: [140, 140, 140, 280] },
  jumping: { row: 4, durations: [140, 140, 140, 140, 280] },
  failed: { row: 5, durations: [140, 140, 140, 140, 140, 140, 140, 240] },
  waiting: { row: 6, durations: [150, 150, 150, 150, 150, 260] },
  running: { row: 7, durations: [120, 120, 120, 120, 120, 220] },
  review: { row: 8, durations: [150, 150, 150, 150, 150, 280] },
}

const STATE_ROWS = {
  idle: 'idle', sleeping: 'idle', dozing: 'idle', collapsing: 'idle', yawning: 'idle',
  drag: 'running-right',
  attention: 'waving', waking: 'waving', notification: 'waving', happy: 'jumping',
  error: 'failed', debugging: 'failed', waiting: 'waiting',
  working: 'running', building: 'running', carrying: 'running', sweeping: 'running', juggling: 'running',
  thinking: 'review', planning: 'review', reviewing: 'review',
}

const frame = ref(0)
let timer = null

const rowSpec = computed(() => {
  const mapped = props.state === 'drag' && props.direction === 'left'
    ? 'running-left'
    : STATE_ROWS[props.state] || 'idle'
  return ROWS[mapped]
})

const frameStyle = computed(() => ({
  width: `${Math.round(props.size * 192 / 208)}px`,
  height: `${props.size}px`,
  backgroundImage: `url("${props.src.replace(/["\\]/g, '')}")`,
  backgroundSize: `800% ${Math.max(9, props.rows) * 100}%`,
  backgroundPosition: `${(frame.value / 7) * 100}% ${(rowSpec.value.row / (Math.max(9, props.rows) - 1)) * 100}%`,
}))

function stop() {
  if (timer) clearTimeout(timer)
  timer = null
}

function schedule() {
  stop()
  const durations = rowSpec.value.durations
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduced) {
    frame.value = 0
    return
  }
  frame.value %= durations.length
  timer = setTimeout(() => {
    frame.value = (frame.value + 1) % durations.length
    schedule()
  }, durations[frame.value])
}

watch(() => [props.state, props.direction, props.src], () => {
  frame.value = 0
  schedule()
})
onMounted(schedule)
onUnmounted(stop)
</script>

<template>
  <span class="pet-v2-sprite" :style="frameStyle" aria-hidden="true"></span>
</template>

<style scoped>
.pet-v2-sprite {
  display: block;
  flex: none;
  margin: 0 auto;
  background-repeat: no-repeat;
  image-rendering: auto;
}
</style>
