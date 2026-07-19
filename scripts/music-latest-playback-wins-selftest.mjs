import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { computed, ref } from '../frontend/node_modules/vue/index.mjs'
import { createMusicPlaybackCoordinator } from '../frontend/src/composables/useMusicPlaybackCoordinator.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const playbackModulePath = path.join(root, 'frontend/src/composables/useMusicPlayback.js')
const playbackSource = fs.readFileSync(playbackModulePath, 'utf8')
globalThis.__ccMusicPlaybackVue = await import('../frontend/node_modules/vue/index.mjs')
globalThis.__ccMusicPlaybackToast = { error() {} }
let isolatedPlaybackSource = playbackSource
  .replace("import { ref, watch } from 'vue'", 'const { ref, watch } = globalThis.__ccMusicPlaybackVue')
  .replace("import { toast } from '../utils/toast.js'", 'const toast = globalThis.__ccMusicPlaybackToast')
  .replace(
    "import { formatTrackLabel, pickRandomTrack, rememberPlayedTrack } from '../utils/musicTrackHelpers.js'",
    "const formatTrackLabel = (track) => track?.title || track?.filename || ''; const pickRandomTrack = (rows) => rows?.[0]; const rememberPlayedTrack = () => {}",
  )
const { useMusicPlayback } = await import(`data:text/javascript;base64,${Buffer.from(isolatedPlaybackSource).toString('base64')}`)

function createFakeChannelBus() {
  const channels = new Map()
  return (name) => {
    const peers = channels.get(name) || new Set()
    const channel = {
      onmessage: null,
      postMessage(data) {
        for (const peer of peers) {
          if (peer !== channel) peer.onmessage?.({ data })
        }
      },
      close() { peers.delete(channel) },
    }
    peers.add(channel)
    channels.set(name, peers)
    return channel
  }
}

function createWindowStub() {
  const values = new Map()
  return {
    addEventListener() {},
    removeEventListener() {},
    localStorage: {
      getItem(key) { return values.get(key) || null },
      setItem(key, value) { values.set(key, String(value)) },
      removeItem(key) { values.delete(key) },
    },
  }
}

function createSharedStorageWindows() {
  const values = new Map()
  const createWindow = () => ({
    addEventListener() {},
    removeEventListener() {},
    localStorage: {
      getItem(key) { return values.get(key) || null },
      setItem(key, value) { values.set(key, String(value)) },
      removeItem(key) { values.delete(key) },
    },
  })
  return { createWindow }
}

const channelFactory = createFakeChannelBus()
const tabA = createMusicPlaybackCoordinator({
  tabId: 'tab-a',
  now: () => 1_000,
  windowRef: createWindowStub(),
  channelFactory,
})
const tabB = createMusicPlaybackCoordinator({
  tabId: 'tab-b',
  now: () => 1_000,
  windowRef: createWindowStub(),
  channelFactory,
})

let tabAStops = 0
let tabBStops = 0
tabA.registerLocalStop(() => { tabAStops += 1 })
tabB.registerLocalStop(() => { tabBStops += 1 })

const intentA = tabA.beginPlaybackIntent({ keyword: 'song-a' })
assert.equal(tabA.isCurrent(intentA), true)
const intentB = tabB.beginPlaybackIntent({ keyword: 'song-b' })
assert.equal(tabA.isCurrent(intentA), false, 'a newer tab must invalidate the older tab token')
assert.equal(tabB.isCurrent(intentB), true)
assert.equal(tabA.currentIntent()?.id, intentB.id)
assert.ok(tabAStops >= 2, 'tab A should stop for its own request and the newer remote request')
assert.ok(tabBStops >= 1)

const stopIntent = tabA.stopEverywhere({ source: 'selftest' })
assert.equal(stopIntent.kind, 'stop')
assert.equal(tabA.isCurrent(intentB), false)
assert.equal(tabB.isCurrent(intentB), false)
assert.equal(tabB.currentIntent()?.kind, 'stop')

tabA.dispose()
tabB.dispose()

const sharedStorage = createSharedStorageWindows()
const earlyTab = createMusicPlaybackCoordinator({
  tabId: 'early-tab',
  now: () => 1_500,
  windowRef: sharedStorage.createWindow(),
  channelFactory: () => null,
})
const persistedIntent = earlyTab.beginPlaybackIntent({ keyword: 'persisted-song' })
const lateTab = createMusicPlaybackCoordinator({
  tabId: 'late-tab',
  now: () => 1_500,
  windowRef: sharedStorage.createWindow(),
  channelFactory: () => null,
})
assert.equal(lateTab.currentIntent()?.id, persistedIntent.id, 'a newly opened tab must restore the latest ownership intent')
earlyTab.dispose()
lateTab.dispose()

const localCoordinator = createMusicPlaybackCoordinator({
  tabId: 'single-tab',
  now: (() => { let value = 2_000; return () => ++value })(),
  windowRef: createWindowStub(),
  channelFactory: () => null,
})
const pendingPlays = []
const audio = {
  src: '',
  currentSrc: '',
  paused: true,
  ended: false,
  currentTime: 0,
  duration: 180,
  volume: 0.7,
  addEventListener() {},
  pause() { this.paused = true },
  play() {
    const requestedSrc = this.src
    return new Promise((resolve) => {
      pendingPlays.push({
        requestedSrc,
        resolve: () => {
          this.paused = false
          this.currentSrc = this.src
          resolve()
        },
      })
    })
  },
}
const tracks = [
  { filename: 'song-a.mp3', title: 'Song A', artist: 'A' },
  { filename: 'song-b.mp3', title: 'Song B', artist: 'B' },
]
const playlist = ref([...tracks])
const currentIndex = ref(-1)
const activePlaybackFilename = ref('')
const currentTrack = computed(() => playlist.value[currentIndex.value] || null)
const isPlaying = ref(false)

const playback = useMusicPlayback({
  audioEl: ref(audio),
  audioCtx: ref(null),
  playlist,
  currentIndex,
  currentTrack,
  activePlaybackFilename,
  isPlaying,
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
  drawSpectrums() {},
  danmakuItems: ref([]),
  addBubbleComment() {},
  playbackCoordinator: localCoordinator,
})

const playA = playback.play(tracks[0])
assert.equal(pendingPlays.length, 1)
const playB = playback.play(tracks[1])
assert.equal(pendingPlays.length, 2)

pendingPlays[1].resolve()
const resultB = await playB
assert.equal(resultB.success, true)
pendingPlays[0].resolve()
const resultA = await playA
assert.equal(resultA.skipped, true)
assert.equal(resultA.reason, 'superseded')
assert.equal(activePlaybackFilename.value, 'song-b.mp3')
assert.equal(currentTrack.value?.filename, 'song-b.mp3')
assert.equal(isPlaying.value, true)
localCoordinator.dispose()

const playerSource = fs.readFileSync(path.join(root, 'frontend/src/components/music/useMusicPlayer.js'), 'utf8')
const playerTemplate = fs.readFileSync(path.join(root, 'frontend/src/components/music/MusicPlayer.template.html'), 'utf8')
const waitIndex = playerSource.indexOf('await waitForJob(job.id)')
const waitGuardIndex = playerSource.indexOf('if (!isLatest()) return superseded()', waitIndex)
const finalPlayIndex = playerSource.indexOf('await play(newTrack, { ...options, playbackIntent })', waitIndex)
assert.ok(waitIndex >= 0 && waitGuardIndex > waitIndex && finalPlayIndex > waitGuardIndex)
assert.match(playerSource, /window\.__cc_global_play_music[\s\S]*beginPlaybackIntent/)
assert.match(playbackSource, /await playResult[\s\S]*isPlaybackIntentCurrent\(playbackIntent\)/)
assert.equal((playerTemplate.match(/<audio\b/g) || []).length, 1, 'one page must own exactly one audio element')

console.log(JSON.stringify({
  passed: true,
  checks: {
    cross_tab_latest_wins: true,
    stop_broadcast_invalidates_playback: true,
    late_tab_restores_current_owner: true,
    reverse_completion_keeps_latest_track: true,
    stale_download_autoplay_guarded: true,
    one_audio_element_per_page: true,
  },
  paid_provider_calls: 0,
}, null, 2))
