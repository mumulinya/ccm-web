<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { Languages, Minus, Plus, RotateCcw, X } from '@lucide/vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  track: { type: Object, default: null },
  lyrics: { type: Array, default: () => [] },
  currentIndex: { type: Number, default: -1 },
  currentWordIndex: { type: Number, default: -1 },
  timingOffsetMs: { type: Number, default: 0 },
  showTranslation: { type: Boolean, default: true },
})
const emit = defineEmits(['close', 'adjust-offset', 'reset-offset', 'toggle-translation'])
const activeLine = ref(null)
const hasTranslations = computed(() => props.lyrics.some(line => line.translation))

watch(() => props.currentIndex, async () => {
  await nextTick()
  activeLine.value?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
})
</script>

<template>
  <div v-if="open" class="lyrics-panel-layer" role="dialog" aria-modal="true" aria-label="独立歌词模式">
    <section class="lyrics-panel">
      <header>
        <div><strong>{{ track?.title || '歌词' }}</strong><span>{{ track?.artist || 'Aura Music' }}</span></div>
        <div class="lyrics-panel-actions">
          <button title="歌词提前 0.5 秒" @click="emit('adjust-offset', 500)"><Minus :size="14" /></button>
          <span :title="`歌词时间偏移 ${timingOffsetMs} 毫秒`">{{ timingOffsetMs > 0 ? '+' : '' }}{{ (timingOffsetMs / 1000).toFixed(1) }}s</span>
          <button title="歌词延后 0.5 秒" @click="emit('adjust-offset', -500)"><Plus :size="14" /></button>
          <button title="重置歌词偏移" @click="emit('reset-offset')"><RotateCcw :size="14" /></button>
          <button v-if="hasTranslations" :class="{ active: showTranslation }" title="显示或隐藏翻译歌词" @click="emit('toggle-translation')"><Languages :size="15" /></button>
          <button title="关闭独立歌词" @click="emit('close')"><X :size="17" /></button>
        </div>
      </header>
      <div class="lyrics-panel-scroll">
        <div v-if="!lyrics.length" class="lyrics-panel-empty">当前歌曲没有可用歌词</div>
        <div
          v-for="(line, index) in lyrics"
          :key="`${line.time}-${index}`"
          :ref="element => { if (index === currentIndex) activeLine = element }"
          class="lyrics-panel-line"
          :class="{ active: index === currentIndex, past: index < currentIndex }"
        >
          <p>
            <template v-if="line.words?.length">
              <span v-for="(word, wordIndex) in line.words" :key="`${word.start}-${wordIndex}`" :class="{ sung: index < currentIndex || (index === currentIndex && wordIndex <= currentWordIndex) }">{{ word.text }}</span>
            </template>
            <template v-else>{{ line.text }}</template>
          </p>
          <small v-if="showTranslation && line.translation">{{ line.translation }}</small>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.lyrics-panel-layer { position: fixed; inset: 0; z-index: 1230; padding: 24px; background: rgba(2,8,12,.92); backdrop-filter: blur(22px); }
.lyrics-panel { width: min(960px,100%); height: 100%; margin: 0 auto; display: flex; flex-direction: column; overflow: hidden; border: 1px solid rgba(105,184,207,.18); border-radius: 8px; background: rgba(8,20,27,.86); color: #dce8ef; }
.lyrics-panel > header { min-height: 70px; padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; gap: 14px; border-bottom: 1px solid rgba(105,184,207,.12); }
.lyrics-panel > header > div:first-child { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.lyrics-panel > header strong, .lyrics-panel > header span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lyrics-panel > header strong { font-size: 15px; }.lyrics-panel > header span { color: #7892a0; font-size: 10px; }
.lyrics-panel-actions { display: flex; align-items: center; gap: 3px; }.lyrics-panel-actions > span { min-width: 42px; text-align: center; color: #8db0bd; font-size: 10px; }
.lyrics-panel-actions button { width: 31px; height: 31px; display: grid; place-items: center; border: 1px solid transparent; border-radius: 5px; color: #7894a3; background: transparent; cursor: pointer; }
.lyrics-panel-actions button:hover, .lyrics-panel-actions button.active { color: #8ce7ee; border-color: rgba(68,215,232,.2); background: rgba(68,215,232,.07); }
.lyrics-panel-scroll { flex: 1; min-height: 0; overflow-y: auto; scroll-behavior: smooth; padding: 42vh 8vw; }
.lyrics-panel-line { max-width: 760px; margin: 0 auto; padding: 10px 0; color: rgba(183,205,214,.32); transition: color .25s ease, transform .25s ease; }
.lyrics-panel-line p { margin: 0; font-size: 21px; line-height: 1.55; }.lyrics-panel-line small { display: block; margin-top: 5px; color: rgba(132,165,178,.5); font-size: 13px; }
.lyrics-panel-line.past { color: rgba(183,205,214,.2); }.lyrics-panel-line.active { color: #f0fbfd; transform: translateX(8px); }
.lyrics-panel-line p span { color: rgba(183,205,214,.35); transition: color .12s ease, text-shadow .12s ease; }.lyrics-panel-line p span.sung { color: #8ce7ee; text-shadow: 0 0 10px rgba(68,215,232,.28); }
.lyrics-panel-empty { height: 100%; display: grid; place-items: center; color: #708b98; }
@media (max-width: 650px) { .lyrics-panel-layer { padding: 0; }.lyrics-panel { border: 0; border-radius: 0; }.lyrics-panel > header { align-items: flex-start; flex-direction: column; }.lyrics-panel-actions { width: 100%; justify-content: flex-end; }.lyrics-panel-scroll { padding-right: 24px; padding-left: 24px; }.lyrics-panel-line p { font-size: 17px; } }
</style>
