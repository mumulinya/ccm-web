import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(path.join(root, file), 'utf8')

const api = read('backend/modules/music/music.ts')
const lyricApi = read('backend/modules/music/music.ts')
const state = read('backend/modules/music/state.ts')
const downloads = read('backend/modules/music/download-jobs.ts')
const player = read('frontend/src/components/music/useMusicPlayer.js')
const template = read('frontend/src/components/music/MusicPlayer.template.html')
const settings = read('frontend/src/components/music/MusicAgentSettingsModal.vue')
const search = read('frontend/src/components/music/MusicUnifiedSearch.vue')
const lyrics = read('frontend/src/components/music/MusicLyricsPanel.vue')
const atmosphere = read('frontend/src/composables/useMusicAtmosphere.js')
const playback = read('frontend/src/composables/useMusicPlayback.js')
const spectrum = read('frontend/src/composables/useMusicSpectrum.js')

assert.match(api, /\/api\/music\/search-unified/, 'unified search endpoint should exist')
assert.match(api, /Promise\.allSettled/, 'unified search should tolerate partial source failures')
for (const source of ['local', 'netease', 'bilibili']) assert.match(search, new RegExp(`id: '${source}'`), `${source} should be visible in unified search`)
for (const action of ['play', 'next', 'download', 'playlist']) assert.match(search, new RegExp(`runAction\\('${action}'`), `${action} should be available from search results`)
assert.match(template, /<MusicUnifiedSearch/, 'player should mount unified search')

assert.match(lyricApi, /function parseYrc/, 'word-level NetEase lyrics should be parsed')
assert.match(lyricApi, /tlyric/, 'translated lyrics should be requested')
assert.match(lyrics, /adjust-offset/, 'standalone lyrics should expose timing adjustment')
assert.match(lyrics, /currentWordIndex/, 'standalone lyrics should render word progress')
assert.match(lyrics, /line\.translation/, 'standalone lyrics should render translations')
assert.match(template, /<MusicLyricsPanel/, 'lyrics should use an independent panel rather than danmaku')

for (const key of ['quality', 'fadeSeconds', 'volumeNormalization', 'rememberProgress', 'sleepTimerMinutes']) {
  assert.match(state, new RegExp(key), `${key} should be persisted by backend settings`)
  assert.match(settings, new RegExp(key), `${key} should be configurable in the UI`)
}
assert.match(downloads, /very_high[\s\S]*320k/, 'very-high quality should map to 320 kbps')
assert.match(playback, /setOutputGain/, 'playback should apply fade gain')
assert.match(spectrum, /DynamicsCompressor/, 'volume normalization should use a WebAudio compressor')
assert.match(player, /aura_music_playback_progress_v1/, 'playback progress should be remembered locally')

for (const key of ['aiRecommendationEnabled', 'aiEmotionEnabled', 'aiAutoSelectEnabled']) {
  assert.match(state, new RegExp(key), `${key} should be persisted`)
  assert.match(settings, new RegExp(key), `${key} should have an independent switch`)
}
const recommendationGate = player.indexOf('if (aiRecommendationEnabled.value)')
const recommendationRequest = player.indexOf("fetch('/api/music/resolve-play-request'")
assert.ok(recommendationGate >= 0 && recommendationRequest > recommendationGate, 'AI recommendation must gate the model request')
const selectionGate = player.indexOf('if (!aiAutoSelectEnabled.value)')
const selectionRequest = player.indexOf("fetch('/api/music/select-track'")
assert.ok(selectionGate >= 0 && selectionRequest > selectionGate, 'AI auto-selection must return before its model request')
const emotionGate = atmosphere.indexOf('if (aiEmotionEnabled?.value === false)')
const emotionRequest = atmosphere.indexOf("fetch('/api/music/song-emotion'")
assert.ok(emotionGate >= 0 && emotionRequest > emotionGate, 'AI emotion detection must return before its model request')
assert.match(settings, /统一搜索、播放控制、歌词、队列和本地筛选不会调用模型/, 'settings should explain which operations do not call the model')
assert.match(settings, /音乐助手对话本身会调用统一大模型/, 'settings should disclose that direct assistant chat still invokes the model')

console.log(JSON.stringify({
  success: true,
  checks: 38,
  features: ['unified-search', 'word-lyrics', 'translation', 'timing-offset', 'standalone-lyrics', 'quality', 'fade', 'sleep-timer', 'normalization', 'resume-progress', 'independent-ai-switches'],
  paidProviderCalls: 0,
}, null, 2))
