<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  type: { type: String, default: 'cat' },
  state: { type: String, default: 'idle' },
  size: { type: Number, default: 64 },
  name: { type: String, default: 'Pet' }
})

const frame = ref(0)
let animTimer = null

const petTypes = {
  cat: { emoji: '🐱', color: '#FF9800' },
  crab: { emoji: '🦀', color: '#FF5722' },
  clawd: { emoji: '🦀', color: '#E4572E' },
  robot: { emoji: '🤖', color: '#607D8B' },
  ghost: { emoji: '👻', color: '#B39DDB' },
  panda: { emoji: '🐼', color: '#3f3f46' },
  fox: { emoji: '🦊', color: '#f97316' },
  rabbit: { emoji: '🐰', color: '#cbd5e1' }
}

const clawdStateFiles = {
  idle: 'clawd-idle-follow.svg',
  yawning: 'clawd-idle-yawn.svg',
  dozing: 'clawd-idle-doze.svg',
  collapsing: 'clawd-collapse-sleep.svg',
  thinking: 'clawd-working-thinking.svg',
  working: 'clawd-working-typing.svg',
  juggling: 'clawd-headphones-groove.svg',
  sweeping: 'clawd-working-sweeping.svg',
  error: 'clawd-error.svg',
  attention: 'clawd-happy.svg',
  happy: 'clawd-happy.svg',
  notification: 'clawd-notification.svg',
  carrying: 'clawd-working-carrying.svg',
  sleeping: 'clawd-sleeping.svg',
  waking: 'clawd-wake.svg',
}

const pet = computed(() => petTypes[props.type] || petTypes.cat)

const getSvgUrl = computed(() => {
  const t = props.type;
  const s = props.state || 'idle';
  
  if (t === 'clawd') {
    const file = clawdStateFiles[s] || clawdStateFiles.idle || 'clawd-static-base.svg';
    return `/pets/clawd/${file}`;
  } else {
    // 映射状态为相应的 SVG 文件
    const fileMap = {
      idle: `${t}-idle.svg`,
      working: `${t}-working.svg`,
      thinking: `${t}-thinking.svg`,
      error: `${t}-error.svg`,
      happy: `${t}-happy.svg`,
      sleeping: `${t}-sleeping.svg`,
      // 回退映射
      attention: `${t}-attention.svg`,
      notification: `${t}-notification.svg`,
      carrying: `${t}-carrying.svg`,
      sweeping: `${t}-sweeping.svg`,
      juggling: `${t}-juggling.svg`,
      yawning: `${t}-yawning.svg`,
      dozing: `${t}-dozing.svg`,
      collapsing: `${t}-collapsing.svg`,
      waking: `${t}-waking.svg`,
    };
    const file = fileMap[s] || `${t}-idle.svg`;
    return `/pets/${file}`;
  }
});

const stateStyles = computed(() => {
  const states = {
    idle: { transform: 'translateY(0)', filter: 'none' },
    working: { transform: 'translateY(-2px)' },
    thinking: { transform: 'translateY(0) scale(1.01)' },
    error: { transform: 'translateY(0)' },
    happy: { transform: 'translateY(-4px)' },
    sleeping: { transform: 'translateY(2px) scale(0.98)' }
  }
  return states[props.state] || states.idle
})

const animClass = computed(() => `pet-anim-${props.state}`)

onMounted(() => {
  animTimer = setInterval(() => { frame.value++ }, 500)
})
onUnmounted(() => { if (animTimer) clearInterval(animTimer) })
</script>

<template>
  <div class="pet-sprite" :class="animClass" :style="{ width: size + 'px', height: size + 'px', ...stateStyles }">
    <img :src="getSvgUrl" :alt="name" :width="size" :height="size" draggable="false" @error="$event.target.src = '/pets/' + type + '.svg'" />
    <!-- 状态指示器 -->
    <div class="state-badge" v-if="state !== 'idle'">
      <span v-if="state === 'working'">⚡</span>
      <span v-else-if="state === 'thinking'">💭</span>
      <span v-else-if="state === 'error'">❌</span>
      <span v-else-if="state === 'happy'">✨</span>
      <span v-else-if="state === 'sleeping'">💤</span>
    </div>
  </div>
</template>

<style scoped>
.pet-sprite {
  position: relative;
  display: inline-block;
  cursor: pointer;
  user-select: none;
  -webkit-user-drag: none;
}

.pet-sprite img {
  image-rendering: pixelated;
  display: block;
}

.state-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  font-size: 14px;
  animation: badge-bounce 1s infinite;
}

@keyframes badge-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

/* 状态动画 */
.pet-anim-idle {
  animation: pet-idle 3s ease-in-out infinite;
}
.pet-anim-working {
  animation: pet-working 0.6s ease-in-out infinite;
}
.pet-anim-thinking {
  animation: pet-thinking 1.5s ease-in-out infinite;
}
.pet-anim-error {
  animation: pet-error 0.3s ease-in-out 3;
}
.pet-anim-happy {
  animation: pet-happy 0.5s ease-in-out infinite;
}
.pet-anim-sleeping {
  animation: pet-sleeping 2s ease-in-out infinite;
}

@keyframes pet-idle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
@keyframes pet-working {
  0%, 100% { transform: translateY(-2px) rotate(-2deg); }
  50% { transform: translateY(-2px) rotate(2deg); }
}
@keyframes pet-thinking {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-2px) scale(1.05); }
}
@keyframes pet-error {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  75% { transform: translateX(3px); }
}
@keyframes pet-happy {
  0%, 100% { transform: translateY(-4px) scale(1); }
  50% { transform: translateY(-8px) scale(1.1); }
}
@keyframes pet-sleeping {
  0%, 100% { transform: translateY(2px) scale(0.95); }
  50% { transform: translateY(4px) scale(0.9); }
}
</style>
