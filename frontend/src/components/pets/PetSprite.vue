<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import PetV2Sprite from './PetV2Sprite.vue'

const props = defineProps({
  type: { type: String, default: 'yuexinmiao' },
  state: { type: String, default: 'idle' },
  size: { type: Number, default: 64 },
  name: { type: String, default: 'Pet' },
  skin: { type: Object, default: null }
})

const frame = ref(0)
let animTimer = null

const petTypes = {
  clawd: { emoji: '🦀', color: '#f97316' },
  yuexinmiao: { emoji: '🐱', color: '#22c55e' },
  cloudling: { emoji: '☁️', color: '#38bdf8' },
  calico: { emoji: '🐱', color: '#d97706' },
  robot: { emoji: '🤖', color: '#607D8B' },
  ghost: { emoji: '👻', color: '#B39DDB' },
}

const clawdStateFiles = {
  idle: 'clawd-idle-follow.svg',
  yawning: 'clawd-idle-yawn.svg',
  dozing: 'clawd-idle-doze.svg',
  collapsing: 'clawd-collapse-sleep.svg',
  thinking: 'clawd-working-thinking.svg',
  planning: 'clawd-working-ultrathink.svg',
  working: 'clawd-working-typing.svg',
  building: 'clawd-working-building.svg',
  debugging: 'clawd-working-debugger.svg',
  reviewing: 'clawd-working-wizard.svg',
  waiting: 'clawd-notification.svg',
  juggling: 'clawd-headphones-groove.svg',
  sweeping: 'clawd-working-sweeping.svg',
  error: 'clawd-error.svg',
  attention: 'clawd-happy.svg',
  happy: 'clawd-happy.svg',
  notification: 'clawd-notification.svg',
  carrying: 'clawd-working-carrying.svg',
  drag: 'clawd-react-drag.svg',
  sleeping: 'clawd-sleeping.svg',
  waking: 'clawd-wake.svg',
}

const stateAliases = {
  planning: 'thinking',
  building: 'working',
  debugging: 'sweeping',
  reviewing: 'attention',
  waiting: 'notification',
}

const BUILTIN_FALLBACK_PET_TYPE = 'yuexinmiao'
const isV2 = computed(() => Number(props.skin?.spriteVersionNumber) === 2)
const failedSupplemental = ref('')
const supplementalStateFile = computed(() => (
  String(props.skin?.supplementalStateFiles?.[props.state] || '').replace(/^\/+/, '')
))
const useSupplementalState = computed(() => (
  isV2.value
  && supplementalStateFile.value
  && failedSupplemental.value !== supplementalStateFile.value
))
const supplementalStateUrl = computed(() => `/pets/${supplementalStateFile.value}`)
const isGeneratedSvg = computed(() => (
  String(props.skin?.format || '').toLowerCase() === 'svg'
  || props.skin?.generationEngine === 'global-agent-svg'
))
const normalizePetType = (type) => (
  petTypes[type] || (props.skin?.id && props.skin.id === type)
    ? type
    : BUILTIN_FALLBACK_PET_TYPE
)
const pet = computed(() => petTypes[normalizePetType(props.type)])

const specialStateFiles = {
  clawd: {
    dir: 'clawd',
    files: clawdStateFiles,
  },
  yuexinmiao: {
    dir: '',
    files: {
      idle: 'yuexinmiao-idle.svg',
      thinking: 'yuexinmiao-thinking.svg',
      planning: 'yuexinmiao-thinking.svg',
      working: 'yuexinmiao-working.svg',
      building: 'yuexinmiao-working.svg',
      debugging: 'yuexinmiao-working.svg',
      reviewing: 'yuexinmiao-thinking.svg',
      waiting: 'yuexinmiao-notification.svg',
      drag: 'yuexinmiao-react-drag.svg',
      error: 'yuexinmiao-error.svg',
      happy: 'yuexinmiao-happy.svg',
      sleeping: 'yuexinmiao-sleeping.svg',
      attention: 'yuexinmiao-attention.svg',
      notification: 'yuexinmiao-notification.svg',
      carrying: 'yuexinmiao-carrying.svg',
      sweeping: 'yuexinmiao-sweeping.svg',
      juggling: 'yuexinmiao-juggling.svg',
      yawning: 'yuexinmiao-yawning.svg',
      dozing: 'yuexinmiao-dozing.svg',
      collapsing: 'yuexinmiao-collapsing.svg',
      waking: 'yuexinmiao-waking.svg',
    },
  },
  cloudling: {
    dir: 'cloudling',
    files: {
      idle: 'cloudling-idle.svg',
      thinking: 'cloudling-thinking.svg',
      planning: 'cloudling-thinking.svg',
      working: 'cloudling-typing.svg',
      building: 'cloudling-building.svg',
      debugging: 'cloudling-sweeping.svg',
      reviewing: 'cloudling-conducting.svg',
      waiting: 'cloudling-notification.svg',
      drag: 'cloudling-react-drag.svg',
      error: 'cloudling-error.svg',
      happy: 'cloudling-attention.svg',
      sleeping: 'cloudling-sleeping.svg',
      attention: 'cloudling-attention.svg',
      notification: 'cloudling-notification.svg',
      carrying: 'cloudling-carrying.svg',
      sweeping: 'cloudling-sweeping.svg',
      juggling: 'cloudling-juggling.svg',
      yawning: 'cloudling-idle-to-dozing.svg',
      dozing: 'cloudling-dozing.svg',
      collapsing: 'cloudling-dozing-to-sleeping.svg',
      waking: 'cloudling-sleeping-to-idle.svg',
    },
  },
  calico: {
    dir: 'calico',
    files: {
      idle: 'calico-idle-follow.svg',
      thinking: 'calico-thinking.apng',
      planning: 'calico-thinking.apng',
      working: 'calico-working-typing.apng',
      building: 'calico-working-building.apng',
      debugging: 'calico-working-sweeping.apng',
      reviewing: 'calico-working-conducting.apng',
      waiting: 'calico-notification.apng',
      drag: 'calico-react-drag.apng',
      error: 'calico-error.apng',
      happy: 'calico-happy.apng',
      sleeping: 'calico-sleeping.apng',
      attention: 'calico-happy.apng',
      notification: 'calico-notification.apng',
      carrying: 'calico-working-carrying.apng',
      sweeping: 'calico-working-sweeping.apng',
      juggling: 'calico-working-juggling.apng',
      yawning: 'calico-yawning.apng',
      dozing: 'calico-dozing.apng',
      collapsing: 'calico-collapsing.apng',
      waking: 'calico-waking.apng',
    },
  },
}

const getSvgUrl = computed(() => {
  const t = normalizePetType(props.type);
  const s = props.state || 'idle';

  if (isGeneratedSvg.value) {
    const idlePhase = Math.floor(frame.value / 16) % 4
    const generatedState = s === 'idle' && idlePhase === 1
      ? 'idle_look'
      : s === 'idle' && idlePhase === 3
        ? 'idle_play'
        : s
    const generatedFiles = {
      idle: `${t}-idle.svg`,
      idle_look: `${t}-idle-action1.svg`,
      idle_play: `${t}-idle-action2.svg`,
      thinking: `${t}-thinking.svg`,
      planning: `${t}-planning.svg`,
      working: `${t}-working.svg`,
      building: `${t}-building.svg`,
      debugging: `${t}-debugging.svg`,
      reviewing: `${t}-reviewing.svg`,
      waiting: `${t}-waiting.svg`,
      drag: `${t}-drag.svg`,
      error: `${t}-error.svg`,
      happy: `${t}-happy.svg`,
      sleeping: `${t}-sleeping.svg`,
      attention: `${t}-attention.svg`,
      notification: `${t}-notification.svg`,
      carrying: `${t}-carrying.svg`,
      sweeping: `${t}-sweeping.svg`,
      juggling: `${t}-juggling.svg`,
      yawning: `${t}-yawning.svg`,
      dozing: `${t}-dozing.svg`,
      collapsing: `${t}-collapsing.svg`,
      waking: `${t}-waking.svg`,
    }
    return `/pets/${generatedFiles[generatedState] || generatedFiles[stateAliases[generatedState]] || generatedFiles.idle}`
  }
  
  if (specialStateFiles[t]) {
    const spec = specialStateFiles[t]
    const file = spec.files[s] || spec.files[stateAliases[s]] || spec.files.idle
    const prefix = spec.dir ? `${spec.dir}/` : ''
    return `/pets/${prefix}${file}`
  } else {
    // 映射状态为相应的 SVG 文件
    const fileMap = {
      idle: `${t}-idle.svg`,
      working: `${t}-working.svg`,
      thinking: `${t}-thinking.svg`,
      planning: `${t}-thinking.svg`,
      building: `${t}-working.svg`,
      debugging: `${t}-sweeping.svg`,
      reviewing: `${t}-attention.svg`,
      waiting: `${t}-notification.svg`,
      drag: `${t}-react-drag.svg`,
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
    const file = fileMap[s] || fileMap[stateAliases[s]] || `${t}-idle.svg`;
    return `/pets/${file}`;
  }
});

const fallbackSvgUrl = computed(() => {
  const t = normalizePetType(props.type)
  const spec = specialStateFiles[t]
  if (spec?.files?.idle) {
    const prefix = spec.dir ? `${spec.dir}/` : ''
    return `/pets/${prefix}${spec.files.idle}`
  }
  return isGeneratedSvg.value ? `/pets/${t}-idle.svg` : `/pets/${t}.svg`
})

const handleImageError = (event) => {
  const target = event.currentTarget
  const fallback = fallbackSvgUrl.value
  if (!target || target.dataset.petFallback === fallback) return
  target.dataset.petFallback = fallback
  target.src = fallback
}

const stateStyles = computed(() => {
  const states = {
    idle: { transform: 'translateY(0)', filter: 'none' },
    working: { transform: 'translateY(-2px)' },
    building: { transform: 'translateY(-2px)' },
    thinking: { transform: 'translateY(0) scale(1.01)' },
    planning: { transform: 'translateY(0) scale(1.02)' },
    debugging: { transform: 'translateY(0)' },
    reviewing: { transform: 'translateY(-1px) scale(1.01)' },
    waiting: { transform: 'translateY(0)' },
    drag: { transform: 'translateY(-2px) rotate(2deg)' },
    error: { transform: 'translateY(0)' },
    happy: { transform: 'translateY(-4px)' },
    sleeping: { transform: 'translateY(2px) scale(0.98)' }
  }
  return states[props.state] || states.idle
})

const animClass = computed(() => `pet-anim-${props.state}`)
const imageRendering = computed(() => (
  normalizePetType(props.type) === 'clawd' || props.skin?.pixelated === true ? 'pixelated' : 'auto'
))
const showStateBadge = computed(() => (
  props.state !== 'idle'
  && !isV2.value
  && !isGeneratedSvg.value
  && !['clawd', 'cloudling', 'calico'].includes(normalizePetType(props.type))
))
const v2Source = computed(() => {
  const source = String(props.skin?.spritesheetPath || '').replace(/^\/+/, '')
  return source ? `/pets/${source}` : `/pets/generated/${props.type}/spritesheet.webp`
})
const v2Rows = computed(() => Math.max(9, Number(props.skin?.spriteRows || 11)))

const handleSupplementalError = () => {
  failedSupplemental.value = supplementalStateFile.value
}

onMounted(() => {
  animTimer = setInterval(() => { frame.value++ }, 500)
})
onUnmounted(() => { if (animTimer) clearInterval(animTimer) })
</script>

<template>
  <div class="pet-sprite" :class="animClass" :style="{ width: size + 'px', height: size + 'px', ...stateStyles }">
    <img v-if="useSupplementalState" :key="supplementalStateUrl" :src="supplementalStateUrl" alt="" aria-hidden="true" :width="size" :height="size" draggable="false" :style="{ imageRendering }" @error="handleSupplementalError" />
    <PetV2Sprite v-else-if="isV2" :src="v2Source" :state="state" :size="size" :rows="v2Rows" />
    <img v-else :key="getSvgUrl" :src="getSvgUrl" alt="" aria-hidden="true" :width="size" :height="size" draggable="false" :style="{ imageRendering }" @error="handleImageError" />
    <!-- 状态指示器 -->
    <div class="state-badge" v-if="showStateBadge">
      <span v-if="state === 'working'">⚡</span>
      <span v-else-if="state === 'building'">🛠️</span>
      <span v-else-if="state === 'thinking'">💭</span>
      <span v-else-if="state === 'planning'">🧠</span>
      <span v-else-if="state === 'debugging'">🧪</span>
      <span v-else-if="state === 'reviewing'">🔎</span>
      <span v-else-if="state === 'waiting'">⌛</span>
      <span v-else-if="state === 'drag'">✋</span>
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
.pet-anim-building {
  animation: pet-building 0.8s ease-in-out infinite;
}
.pet-anim-thinking {
  animation: pet-thinking 1.5s ease-in-out infinite;
}
.pet-anim-planning {
  animation: pet-planning 1.8s ease-in-out infinite;
}
.pet-anim-debugging {
  animation: pet-debugging 0.8s ease-in-out infinite;
}
.pet-anim-reviewing {
  animation: pet-reviewing 1.2s ease-in-out infinite;
}
.pet-anim-waiting {
  animation: pet-waiting 1.6s ease-in-out infinite;
}
.pet-anim-drag {
  animation: pet-drag 0.7s ease-in-out infinite;
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
@keyframes pet-building {
  0%, 100% { transform: translateY(-2px) rotate(-3deg) scale(1); }
  50% { transform: translateY(-4px) rotate(3deg) scale(1.03); }
}
@keyframes pet-thinking {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-2px) scale(1.05); }
}
@keyframes pet-planning {
  0%, 100% { transform: translateY(0) scale(1); filter: saturate(1); }
  50% { transform: translateY(-3px) scale(1.06); filter: saturate(1.2); }
}
@keyframes pet-debugging {
  0%, 100% { transform: translateX(0) rotate(-1deg); }
  25% { transform: translateX(-2px) rotate(1deg); }
  75% { transform: translateX(2px) rotate(-1deg); }
}
@keyframes pet-reviewing {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-2px) rotate(-2deg) scale(1.02); }
}
@keyframes pet-waiting {
  0%, 100% { transform: translateY(0); opacity: 1; }
  50% { transform: translateY(-2px); opacity: 0.78; }
}
@keyframes pet-drag {
  0%, 100% { transform: translateY(-2px) rotate(-4deg); }
  50% { transform: translateY(-5px) rotate(4deg); }
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
