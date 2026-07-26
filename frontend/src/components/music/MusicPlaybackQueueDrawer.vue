<script setup>
import { computed, ref } from 'vue'
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  GripVertical,
  ListMusic,
  ListPlus,
  Pause,
  Play,
  PlayCircle,
  RotateCcw,
  Trash2,
  X,
} from '@lucide/vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  tracks: { type: Array, default: () => [] },
  currentFilename: { type: String, default: '' },
  isPlaying: { type: Boolean, default: false },
  queueSources: { type: Object, default: () => ({}) },
  failureMap: { type: Object, default: () => ({}) },
  canUndoClear: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'play', 'play-next', 'play-from-here', 'remove', 'move', 'reorder', 'clear', 'undo-clear'])
const dragIndex = ref(-1)
const currentIndex = computed(() => props.tracks.findIndex(track => track.filename === props.currentFilename))

const sectionLabel = (index) => {
  if (index === currentIndex.value) return '正在播放'
  if (index === 0 && currentIndex.value > 0) return '队列内已播放'
  if (index === currentIndex.value + 1) return '接下来播放'
  if (currentIndex.value < 0 && index === 0) return '接下来播放'
  return ''
}

const sourceLabel = (track) => props.queueSources?.[track.filename]?.label || '本地曲库'
const dropTrack = (toIndex) => {
  if (dragIndex.value >= 0) emit('reorder', dragIndex.value, toIndex)
  dragIndex.value = -1
}
</script>

<template>
  <Transition name="playback-queue">
    <div v-if="open" class="playback-queue-layer">
      <button class="playback-queue-scrim" aria-label="关闭播放队列" @click="$emit('close')"></button>
      <aside class="playback-queue-drawer" role="dialog" aria-modal="true" aria-label="播放队列">
        <header class="playback-queue-header">
          <div class="playback-queue-heading">
            <span class="playback-queue-icon"><ListMusic :size="18" /></span>
            <div>
              <strong>播放队列</strong>
              <span>{{ tracks.length }} 首歌曲</span>
            </div>
          </div>
          <div class="playback-queue-header-actions">
            <button :disabled="!tracks.length" title="清空播放队列" @click="$emit('clear')">
              <Trash2 :size="15" />
              <span>清空</span>
            </button>
            <button title="关闭" aria-label="关闭播放队列" @click="$emit('close')"><X :size="17" /></button>
          </div>
        </header>

        <div v-if="!tracks.length" class="playback-queue-empty">
          <ListMusic :size="34" />
          <strong>播放队列为空</strong>
          <span>从曲库或歌单中选择歌曲，或使用“下一首播放”加入队列</span>
          <button v-if="canUndoClear" class="queue-undo-button" @click="$emit('undo-clear')"><RotateCcw :size="14" />撤销清空</button>
        </div>

        <div v-else class="playback-queue-list">
          <template v-for="(track, index) in tracks" :key="track.filename">
            <div v-if="sectionLabel(index)" class="playback-queue-section">{{ sectionLabel(index) }}</div>
            <article
              class="playback-queue-row"
              :class="{ current: track.filename === currentFilename, failed: failureMap[track.filename] }"
              draggable="true"
              @dragstart="dragIndex = index"
              @dragend="dragIndex = -1"
              @dragover.prevent
              @drop.prevent="dropTrack(index)"
            >
            <span class="queue-drag-handle" title="拖拽排序"><GripVertical :size="14" /></span>
            <button class="playback-queue-main" :title="`播放 ${track.title || track.filename}`" @click="$emit('play', track)">
              <span class="playback-queue-index">
                <Pause v-if="track.filename === currentFilename && isPlaying" :size="13" fill="currentColor" />
                <Play v-else-if="track.filename === currentFilename" :size="13" fill="currentColor" />
                <span v-else>{{ index + 1 }}</span>
              </span>
              <img v-if="track.pic" :src="track.pic" alt="" />
              <span v-else class="playback-queue-cover"><ListMusic :size="15" /></span>
              <span class="playback-queue-copy">
                <strong :title="track.title || track.filename">{{ track.title || track.filename }}</strong>
                <small :title="track.artist || '未知艺术家'">{{ track.artist || '未知艺术家' }} · {{ sourceLabel(track) }}</small>
                <small v-if="failureMap[track.filename]" class="queue-failure"><AlertCircle :size="11" />{{ failureMap[track.filename].reason }}</small>
              </span>
              <span class="playback-queue-duration">{{ track.duration || '--:--' }}</span>
            </button>

            <div class="playback-queue-actions">
              <button title="从这里开始播放" @click="$emit('play-from-here', track)"><PlayCircle :size="14" /></button>
              <button
                title="下一首播放"
                :disabled="track.filename === currentFilename"
                @click="$emit('play-next', track)"
              ><ListPlus :size="14" /></button>
              <button title="上移" :disabled="index === 0" @click="$emit('move', track, -1)"><ChevronUp :size="14" /></button>
              <button title="下移" :disabled="index === tracks.length - 1" @click="$emit('move', track, 1)"><ChevronDown :size="14" /></button>
              <button class="danger" title="移出播放队列" @click="$emit('remove', track)"><X :size="14" /></button>
            </div>
            </article>
          </template>
        </div>
      </aside>
    </div>
  </Transition>
</template>

<style scoped>
.playback-queue-layer {
  position: fixed;
  inset: 0;
  z-index: 1200;
  pointer-events: none;
}

.playback-queue-scrim {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  background: rgba(1, 8, 13, 0.34);
  pointer-events: auto;
}

.playback-queue-drawer {
  position: absolute;
  top: 56px;
  right: 14px;
  bottom: 84px;
  width: min(430px, calc(100vw - 28px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(105, 184, 207, 0.22);
  border-radius: 8px;
  background: rgba(8, 20, 27, 0.97);
  box-shadow: 0 18px 52px rgba(0, 0, 0, 0.46);
  color: #dce8ef;
  pointer-events: auto;
}

.playback-queue-header {
  min-height: 64px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(105, 184, 207, 0.14);
}

.playback-queue-heading,
.playback-queue-header-actions,
.playback-queue-actions {
  display: flex;
  align-items: center;
}

.playback-queue-heading { gap: 10px; min-width: 0; }
.playback-queue-heading > div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.playback-queue-heading strong { font-size: 14px; }
.playback-queue-heading span { font-size: 11px; color: #7f9aaa; }

.playback-queue-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid rgba(68, 215, 232, 0.24);
  border-radius: 6px;
  color: #72d8e5;
  background: rgba(68, 215, 232, 0.08);
}

.playback-queue-header-actions { gap: 4px; }
.playback-queue-header-actions button,
.playback-queue-actions button {
  height: 30px;
  min-width: 30px;
  padding: 0 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 1px solid transparent;
  border-radius: 5px;
  color: #91aab8;
  background: transparent;
  cursor: pointer;
}
.playback-queue-header-actions button:hover,
.playback-queue-actions button:hover:not(:disabled) {
  color: #e5f7fb;
  border-color: rgba(105, 184, 207, 0.2);
  background: rgba(105, 184, 207, 0.08);
}
.playback-queue-header-actions button:disabled,
.playback-queue-actions button:disabled { opacity: 0.32; cursor: default; }
.playback-queue-actions button.danger:hover { color: #ff8592; }

.playback-queue-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 7px;
}

.playback-queue-section {
  padding: 10px 9px 6px;
  color: #7293a2;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}

.playback-queue-row {
  min-height: 58px;
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  border-bottom: 1px solid rgba(105, 184, 207, 0.08);
}
.playback-queue-row.current { background: rgba(68, 215, 232, 0.07); }
.playback-queue-row.failed { background: rgba(255, 113, 128, 0.045); }
.queue-drag-handle { display: grid; place-items: center; color: #4f6976; cursor: grab; }
.queue-drag-handle:active { cursor: grabbing; }

.playback-queue-main {
  min-width: 0;
  height: 58px;
  display: grid;
  grid-template-columns: 26px 38px minmax(0, 1fr) 42px;
  align-items: center;
  gap: 8px;
  padding: 0 6px;
  border: 0;
  text-align: left;
  color: inherit;
  background: transparent;
  cursor: pointer;
}
.playback-queue-main img,
.playback-queue-cover {
  width: 36px;
  height: 36px;
  border-radius: 5px;
}
.playback-queue-main img { object-fit: cover; }
.playback-queue-cover { display: grid; place-items: center; color: #6f93a5; background: rgba(105, 184, 207, 0.08); }
.playback-queue-index { display: grid; place-items: center; font-size: 10px; color: #6f8997; }
.current .playback-queue-index,
.current .playback-queue-copy strong { color: #72d8e5; }
.playback-queue-copy { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.playback-queue-copy strong,
.playback-queue-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.playback-queue-copy strong { font-size: 12px; font-weight: 650; }
.playback-queue-copy small,
.playback-queue-duration { font-size: 10px; color: #718c9a; }
.playback-queue-copy .queue-failure { display: flex; align-items: center; gap: 4px; color: #ff8f9b; }
.playback-queue-duration { text-align: right; }
.playback-queue-actions { gap: 1px; padding-right: 4px; opacity: 0; }
.playback-queue-row:hover .playback-queue-actions,
.playback-queue-row:focus-within .playback-queue-actions { opacity: 1; }

.playback-queue-empty {
  flex: 1;
  min-height: 240px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  text-align: center;
  color: #6f8997;
}
.playback-queue-empty strong { color: #cbdce4; font-size: 13px; }
.playback-queue-empty span { max-width: 270px; font-size: 11px; line-height: 1.6; }
.queue-undo-button {
  height: 32px;
  margin-top: 4px;
  padding: 0 11px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(68, 215, 232, .22);
  border-radius: 5px;
  color: #72d8e5;
  background: rgba(68, 215, 232, .07);
  cursor: pointer;
}

.playback-queue-enter-active,
.playback-queue-leave-active { transition: opacity 0.2s ease; }
.playback-queue-enter-active .playback-queue-drawer,
.playback-queue-leave-active .playback-queue-drawer { transition: transform 0.2s ease; }
.playback-queue-enter-from,
.playback-queue-leave-to { opacity: 0; }
.playback-queue-enter-from .playback-queue-drawer,
.playback-queue-leave-to .playback-queue-drawer { transform: translateX(22px); }

@media (max-width: 720px) {
  .playback-queue-drawer {
    top: auto;
    right: 0;
    bottom: 70px;
    left: 0;
    width: 100%;
    height: min(62vh, 520px);
    border-right: 0;
    border-bottom: 0;
    border-left: 0;
    border-radius: 8px 8px 0 0;
  }
  .playback-queue-actions { opacity: 1; }
  .playback-queue-actions button:nth-child(3),
  .playback-queue-actions button:nth-child(4) { display: none; }
  .queue-drag-handle { display: none; }
  .playback-queue-row { grid-template-columns: minmax(0, 1fr) auto; }
}
</style>
