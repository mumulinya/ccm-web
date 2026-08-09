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
globalThis.__ccMusicPlaybackToast = { error() {}, warning() {} }
let isolatedPlaybackSource = playbackSource
  .replace("import { ref, watch } from 'vue'", 'const { ref, watch } = globalThis.__ccMusicPlaybackVue')
  .replace("import { toast } from '../utils/toast.js'", 'const toast = globalThis.__ccMusicPlaybackToast')
  .replace(
    "import { formatTrackLabel, rememberPlayedTrack, selectNextPlaybackTrack } from '../utils/musicTrackHelpers.js'",
    "const formatTrackLabel = (track) => track?.title || track?.filename || ''; const rememberPlayedTrack = () => {}; const selectNextPlaybackTrack = (rows, options = {}) => rows?.[(Number(options.currentIndex ?? -1) + 1 + (rows?.length || 1)) % (rows?.length || 1)]",
  )
const { useMusicPlayback } = await import(`data:text/javascript;base64,${Buffer.from(isolatedPlaybackSource).toString('base64')}`)
const lyricsModulePath = path.join(root, 'frontend/src/composables/useMusicLyrics.js')
const lyricsSource = fs.readFileSync(lyricsModulePath, 'utf8')
globalThis.__ccMusicLyricsVue = await import('../frontend/node_modules/vue/index.mjs')
let isolatedLyricsSource = lyricsSource
  .replace("import { computed, onMounted, onUnmounted, ref } from 'vue'", 'const { computed, ref } = globalThis.__ccMusicLyricsVue; const onMounted = () => {}; const onUnmounted = () => {}')
  .replace("import { toast } from '../utils/toast.js'", 'const toast = { error() {} }')
  .replace("import { formatTrackLabel, rememberPlayedTrack, selectNextPlaybackTrack } from '../utils/musicTrackHelpers.js'", 'const formatTrackLabel = () => \'\'; const rememberPlayedTrack = () => {}; const selectNextPlaybackTrack = () => null;')
const { useMusicLyrics } = await import(`data:text/javascript;base64,${Buffer.from(isolatedLyricsSource).toString('base64')}`)

globalThis.localStorage = {
  getItem() { return null },
  setItem() {},
  removeItem() {},
}

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

let retryAttempts = 0
const retryHistory = []
const retryFailures = []
const retryAudio = {
  src: '', currentSrc: '', paused: true, ended: false, currentTime: 0, duration: 180, volume: 0.7,
  addEventListener() {}, pause() { this.paused = true }, load() {},
  async play() {
    retryAttempts += 1
    if (retryAttempts < 3) throw Object.assign(new Error('temporary media error'), { name: 'NotSupportedError' })
    this.paused = false
  },
}
const retryPlaylist = ref([tracks[0]])
const retryIndex = ref(-1)
const retryPlayback = useMusicPlayback({
  audioEl: ref(retryAudio), audioCtx: ref(null), playlist: retryPlaylist, currentIndex: retryIndex,
  currentTrack: computed(() => retryPlaylist.value[retryIndex.value] || null), activePlaybackFilename: ref(''),
  isPlaying: ref(false), currentTime: ref(0), duration: ref(0), volume: ref(0.7), playMode: ref('list'),
  nextRecommendTrack: ref(null), loadLyrics() {}, resetLyrics() {}, resetPetLyricIndex() {}, updateCurrentLyrics() {},
  notifyMusicPetPlaying() {}, notifyMusicPetIdle() {}, notifyMusicPet() {}, updatePreselectedTrack() {}, loadDanmaku() {},
  initAnalyser() {}, drawSpectrums() {}, danmakuItems: ref([]), addBubbleComment() {},
  recordPlaybackHistory(track) { retryHistory.push(track.filename) },
  markTrackPlaybackFailure(track) { retryFailures.push(track.filename) },
})
const retryResult = await retryPlayback.play(tracks[0], { maxAttempts: 3 })
assert.equal(retryResult.success, true)
assert.equal(retryResult.attempts, 3, 'temporary playback errors should retry before succeeding')
assert.deepEqual(retryHistory, [tracks[0].filename], 'history should only record a successful playback once')
assert.deepEqual(retryFailures, [], 'a recovered track should not be marked failed')

let brokenAttempts = 0
const brokenFailures = []
const recoveryHistory = []
const brokenAudio = {
  src: '', currentSrc: '', paused: true, ended: false, currentTime: 0, duration: 180, volume: 0.7,
  addEventListener() {}, pause() { this.paused = true }, load() {},
  async play() {
    if (this.src.includes('song-a.mp3')) {
      brokenAttempts += 1
      throw Object.assign(new Error('damaged file'), { name: 'NotSupportedError' })
    }
    this.paused = false
  },
}
const recoveryPlaylist = ref([...tracks])
const recoveryIndex = ref(-1)
const recoveryPlayback = useMusicPlayback({
  audioEl: ref(brokenAudio), audioCtx: ref(null), playlist: recoveryPlaylist, currentIndex: recoveryIndex,
  currentTrack: computed(() => recoveryPlaylist.value[recoveryIndex.value] || null), activePlaybackFilename: ref(''),
  isPlaying: ref(false), currentTime: ref(0), duration: ref(0), volume: ref(0.7), playMode: ref('list'),
  nextRecommendTrack: ref(null), loadLyrics() {}, resetLyrics() {}, resetPetLyricIndex() {}, updateCurrentLyrics() {},
  notifyMusicPetPlaying() {}, notifyMusicPetIdle() {}, notifyMusicPet() {}, updatePreselectedTrack() {}, loadDanmaku() {},
  initAnalyser() {}, drawSpectrums() {}, danmakuItems: ref([]), addBubbleComment() {},
  recordPlaybackHistory(track) { recoveryHistory.push(track.filename) },
  markTrackPlaybackFailure(track, failure) { brokenFailures.push({ filename: track.filename, ...failure }) },
})
const recoveryResult = await recoveryPlayback.play(tracks[0], { maxAttempts: 2 })
assert.equal(brokenAttempts, 2, 'a damaged file should stop retrying at the configured limit')
assert.equal(recoveryResult.skippedTo, tracks[1].filename, 'terminal playback failure should skip to the next available track')
assert.equal(brokenFailures[0]?.filename, tracks[0].filename)
assert.equal(brokenFailures[0]?.reason, 'damaged file')
assert.deepEqual(recoveryHistory, [tracks[1].filename], 'the recovered next track should become the successful history event')

const createDeferred = () => {
  let resolve
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

const lyricTrackA = { filename: 'lyric-a.mp3', title: 'Lyric A', artist: 'A' }
const lyricTrackB = { filename: 'lyric-b.mp3', title: 'Lyric B', artist: 'B' }
const activeLyricTrack = ref(lyricTrackA)
const lyricRequests = []
globalThis.fetch = (url, options = {}) => {
  const deferred = createDeferred()
  lyricRequests.push({ url, signal: options.signal, deferred })
  return deferred.promise
}
const lyricRuntime = useMusicLyrics({
  currentTime: ref(0),
  isPlaying: ref(false),
  currentTrack: activeLyricTrack,
})
const lyricsA = lyricRuntime.loadLyrics(lyricTrackA)
activeLyricTrack.value = lyricTrackB
const lyricsB = lyricRuntime.loadLyrics(lyricTrackB)
assert.equal(lyricRequests[0].signal?.aborted, true, 'starting a newer lyric request should abort the previous request')
lyricRequests[1].deferred.resolve({
  async json() { return { success: true, lyrics: [{ time: 0, text: 'B lyric' }] } },
})
await lyricsB
assert.equal(lyricRuntime.lyrics.value[0]?.text, 'B lyric')
lyricRequests[0].deferred.resolve({
  async json() { return { success: true, lyrics: [{ time: 0, text: 'stale A lyric' }] } },
})
await lyricsA
assert.equal(lyricRuntime.lyrics.value[0]?.text, 'B lyric', 'an older lyric response must not overwrite the latest track')

activeLyricTrack.value = lyricTrackA
const stoppedLyrics = lyricRuntime.loadLyrics(lyricTrackA)
const stoppedRequest = lyricRequests.at(-1)
lyricRuntime.invalidateLyricsRequest()
lyricRuntime.resetLyrics()
assert.equal(stoppedRequest.signal?.aborted, true, 'invalidating lyrics should abort the active request')
stoppedRequest.deferred.resolve({
  async json() { return { success: true, lyrics: [{ time: 0, text: 'stopped lyric' }] } },
})
await stoppedLyrics
assert.deepEqual(lyricRuntime.lyrics.value, [], 'a response received after stop must not restore lyrics')

const identityLyrics = lyricRuntime.loadLyrics(lyricTrackA)
const identityRequest = lyricRequests.at(-1)
activeLyricTrack.value = lyricTrackB
identityRequest.deferred.resolve({
  async json() { return { success: true, lyrics: [{ time: 0, text: 'wrong identity lyric' }] } },
})
await identityLyrics
assert.deepEqual(lyricRuntime.lyrics.value, [], 'a response must match the current track identity before committing')

const lyricTrackC = { filename: 'lyric-c.mp3', title: 'Lyric C', artist: 'C' }
const lyricTrackD = { filename: 'lyric-d.mp3', title: 'Lyric D', artist: 'D' }
activeLyricTrack.value = lyricTrackC
const jsonDeferred = createDeferred()
const jsonLyrics = lyricRuntime.loadLyrics(lyricTrackC)
const jsonRequest = lyricRequests.at(-1)
jsonRequest.deferred.resolve({ json: () => jsonDeferred.promise })
await Promise.resolve()
activeLyricTrack.value = lyricTrackD
jsonDeferred.resolve({ success: true, lyrics: [{ time: 0, text: 'stale JSON lyric' }] })
await jsonLyrics
assert.deepEqual(lyricRuntime.lyrics.value, [], 'a track change while json is pending must block the stale response')

activeLyricTrack.value = lyricTrackB
const successfulLyrics = lyricRuntime.loadLyrics(lyricTrackB)
lyricRequests.at(-1).deferred.resolve({
  async json() { return { success: true, lyrics: [{ time: 0, text: 'loaded lyric' }] } },
})
await successfulLyrics
assert.equal(lyricRuntime.lyrics.value[0]?.text, 'loaded lyric')
const failedLyrics = lyricRuntime.loadLyrics(lyricTrackB)
const originalConsoleError = console.error
console.error = () => {}
lyricRequests.at(-1).deferred.reject(new Error('lyric network failed'))
await failedLyrics
console.error = originalConsoleError
assert.deepEqual(lyricRuntime.lyrics.value, [], 'a current lyric request failure should preserve the existing clear-on-error behavior')

let stopInvalidations = 0
const stopOnlyPlayback = useMusicPlayback({
  audioEl: ref(null), audioCtx: ref(null), playlist: ref([]), currentIndex: ref(-1), currentTrack: ref(null),
  activePlaybackFilename: ref(''), isPlaying: ref(false), currentTime: ref(0), duration: ref(0), volume: ref(0.7),
  playMode: ref('list'), nextRecommendTrack: ref(null), loadLyrics() {}, resetLyrics() {},
  invalidateLyricsRequest() { stopInvalidations += 1 }, resetPetLyricIndex() {}, updateCurrentLyrics() {},
  notifyMusicPetPlaying() {}, notifyMusicPetIdle() {}, notifyMusicPet() {}, updatePreselectedTrack() {}, loadDanmaku() {},
  initAnalyser() {}, drawSpectrums() {}, danmakuItems: ref([]), addBubbleComment() {},
})
stopOnlyPlayback.stopPlayback({ broadcast: false })
assert.equal(stopInvalidations, 1, 'stop must invalidate lyrics even before the audio element exists')

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
    playback_retry_then_success: true,
    terminal_failure_skips_next: true,
    latest_lyric_request_wins: true,
    stopped_lyric_request_cannot_restore_state: true,
    lyric_response_requires_current_track_identity: true,
    stop_invalidates_lyrics_without_audio: true,
  },
  paid_provider_calls: 0,
}, null, 2))
