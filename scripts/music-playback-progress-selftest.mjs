import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { computed, ref } from '../frontend/node_modules/vue/index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const playbackSource = fs.readFileSync(path.join(root, 'frontend/src/composables/useMusicPlayback.js'), 'utf8')
globalThis.__ccMusicPlaybackVue = await import('../frontend/node_modules/vue/index.mjs')
globalThis.__ccMusicPlaybackToast = { error() {}, warning() {} }
const isolatedPlaybackSource = playbackSource
  .replace("import { ref, watch } from 'vue'", 'const { ref, watch } = globalThis.__ccMusicPlaybackVue')
  .replace("import { toast } from '../utils/toast.js'", 'const toast = globalThis.__ccMusicPlaybackToast')
  .replace(
    "import { formatTrackLabel, rememberPlayedTrack, selectNextPlaybackTrack } from '../utils/musicTrackHelpers.js'",
    "const formatTrackLabel = (track) => track?.title || track?.filename || ''; const rememberPlayedTrack = () => {}; const selectNextPlaybackTrack = (rows) => rows?.[0]",
  )
const { useMusicPlayback } = await import(`data:text/javascript;base64,${Buffer.from(isolatedPlaybackSource).toString('base64')}`)

const listeners = new Map()
const audio = {
  src: '',
  currentSrc: '',
  paused: true,
  ended: false,
  currentTime: 0,
  duration: 180,
  volume: 0.7,
  addEventListener(type, handler) {
    const rows = listeners.get(type) || new Set()
    rows.add(handler)
    listeners.set(type, rows)
  },
  removeEventListener(type, handler) {
    listeners.get(type)?.delete(handler)
  },
  async play() {
    this.currentSrc = this.src
    this.paused = false
  },
  pause() {
    this.paused = true
  },
}

const tracks = [
  { filename: 'song-a.mp3', title: 'Song A', durationSec: 180 },
  { filename: 'song-b.mp3', title: 'Song B', durationSec: 180 },
]
const playlist = ref([...tracks])
const currentIndex = ref(-1)
const activePlaybackFilename = ref('')
const currentTrack = computed(() => playlist.value[currentIndex.value] || null)
let initialResumeFilename = 'song-a.mp3'

const playback = useMusicPlayback({
  audioEl: ref(audio),
  audioCtx: ref(null),
  playlist,
  currentIndex,
  currentTrack,
  activePlaybackFilename,
  isPlaying: ref(false),
  currentTime: ref(0),
  duration: ref(0),
  volume: ref(0.7),
  playMode: ref('list'),
  nextRecommendTrack: ref(null),
  loadLyrics() {},
  resetLyrics() {},
  resetPetLyricIndex() {},
  updateCurrentLyrics() {},
  notifyMusicPetPlaying() {},
  notifyMusicPetIdle() {},
  notifyMusicPet() {},
  updatePreselectedTrack() {},
  loadDanmaku() {},
  initAnalyser() {},
  danmakuItems: ref([]),
  addBubbleComment() {},
  getSavedPlaybackProgress(track) {
    return track.filename === 'song-a.mp3' ? 42 : 17
  },
  consumeInitialPlaybackProgress(track) {
    const eligible = initialResumeFilename
    initialResumeFilename = ''
    return eligible === track.filename
  },
})

await playback.play(tracks[0])
assert.equal(audio.currentTime, 42, 'the persisted current track should resume once after page initialization')

audio.currentTime = 64
await playback.play(tracks[1])
assert.equal(audio.currentTime, 0, 'a manual switch to another track must start at zero')

audio.currentTime = 23
await playback.play(tracks[0])
assert.equal(audio.currentTime, 0, 'manually returning to a previously played track must start at zero')

console.log(JSON.stringify({
  passed: true,
  checks: {
    initial_page_resume: true,
    manual_switch_resets_position: true,
    manual_return_resets_position: true,
  },
  paid_provider_calls: 0,
}, null, 2))
