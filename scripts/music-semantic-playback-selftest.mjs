import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  RANDOM_MUSIC_KEYWORD,
  resolveMusicPlaybackRequest,
  resolveMusicPlaybackRequestFallback,
} = require('../ccm-package/dist/modules/music/agent.js')
const { selectMusicTrack } = require('../ccm-package/dist/modules/music/select-track.js')

const root = path.resolve(import.meta.dirname, '..')
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const checks = {}

const exact = resolveMusicPlaybackRequestFallback('播放周杰伦的晴天', '周杰伦 晴天')
const sad = resolveMusicPlaybackRequestFallback('我心情不好，给我播放一首歌', RANDOM_MUSIC_KEYWORD)
const happy = resolveMusicPlaybackRequestFallback('今天特别开心，放首歌庆祝一下', RANDOM_MUSIC_KEYWORD)
const artist = resolveMusicPlaybackRequestFallback('播放周杰伦的歌', '周杰伦')
const genre = resolveMusicPlaybackRequestFallback('来一首摇滚音乐', '摇滚')
const random = resolveMusicPlaybackRequestFallback('随便放一首歌', RANDOM_MUSIC_KEYWORD)
const disabledModel = await resolveMusicPlaybackRequest({ enabled: false }, '适合写代码时听的歌，播放一首', '')
const strictReject = await selectMusicTrack({
  keyword: '周杰伦 晴天',
  candidates: [{ title: '江南', artist: '林俊杰' }],
  allowModel: false,
})
const recommendationAccept = await selectMusicTrack({
  keyword: '治愈 温柔',
  originalRequest: '我心情不好，给我播放一首歌',
  selectionMode: 'recommendation',
  candidates: [{ title: '温柔的夜', artist: '示例歌手' }],
  allowModel: false,
})
const artistFiltered = await selectMusicTrack({
  keyword: '周杰伦',
  selectionMode: 'artist_random',
  randomize: true,
  candidates: [{ title: '晴天', artist: '周杰伦' }, { title: '江南', artist: '林俊杰' }],
  allowModel: false,
})
let mockModelCalls = 0
const mockServer = http.createServer((req, res) => {
  mockModelCalls += 1
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ choices: [{ message: { content: '{"index":1,"reject":false,"reason":"结合用户原话选择第二首歌手作品"}' } }] }))
})
await new Promise((resolve) => mockServer.listen(0, '127.0.0.1', resolve))
const mockPort = mockServer.address().port
let artistModelSelected
try {
  artistModelSelected = await selectMusicTrack({
    keyword: '周杰伦',
    originalRequest: '播放周杰伦的歌，想听一首安静一点的',
    selectionMode: 'artist_random',
    randomize: false,
    candidates: [
      { title: '江南', artist: '林俊杰' },
      { title: '晴天', artist: '周杰伦' },
      { title: '安静', artist: '周杰伦' },
    ],
    modelConfig: {
      enabled: true,
      apiKey: 'mock-key',
      model: 'mock-model',
      apiUrl: `http://127.0.0.1:${mockPort}`,
      format: 'openai',
      timeoutMs: 5000,
    },
  })
} finally {
  await new Promise((resolve) => mockServer.close(resolve))
}

checks.exactSongIsStrict = exact.strategy === 'exact_song' && exact.strictMatch && !exact.randomize
checks.sadMoodOverridesPrematureRandom = sad.strategy === 'mood_recommendation' && sad.searchQuery.includes('治愈')
checks.happyMoodIsRecommended = happy.strategy === 'mood_recommendation' && happy.searchQuery.includes('欢快')
checks.artistOnlyIsFilteredRandom = artist.strategy === 'artist_random' && artist.artist === '周杰伦' && artist.randomize
checks.genreIsRecommendation = genre.strategy === 'genre_recommendation' && genre.genre === '摇滚'
checks.genericRequestIsRandom = random.strategy === 'random' && random.searchQuery === RANDOM_MUSIC_KEYWORD
checks.modelUnavailableHasSafeFallback = disabledModel.strategy === 'mood_recommendation' && disabledModel.source === 'fallback'
checks.strictSelectorStillRejectsWrongSong = strictReject.rejected === true && strictReject.index === -1
checks.recommendationSelectorDoesNotRequireExactTitle = recommendationAccept.success === true && recommendationAccept.index === 0
checks.artistSelectorExcludesOtherArtists = artistFiltered.success === true && artistFiltered.index === 0
checks.artistFilteredCandidatesGoThroughModel = mockModelCalls === 1
  && artistModelSelected?.success === true
  && artistModelSelected?.source === 'model-artist-selection'
  && artistModelSelected?.index === 2

const queueSource = source('backend/modules/music/state.ts')
const apiSource = source('backend/modules/music/music-part-01.ts')
const globalSource = source('backend/modules/global/global-agent-feishu-actions.ts')
const remoteSource = source('frontend/src/composables/useMusicRemotePlayback.js')
const playerSource = source('frontend/src/components/music/useMusicPlayer.js')
const selectorSource = source('backend/modules/music/select-track.ts')

checks.remoteQueuePersistsFullRequest = queueSource.includes('request_text?: string') && queueSource.includes('command?.request_text')
checks.globalAgentForwardsFullRequest = globalSource.includes('request_text: requestText')
checks.apiExposesStructuredResolver = apiSource.includes('/api/music/resolve-play-request') && apiSource.includes('resolveMusicPlaybackRequest')
checks.clientEffectAndPollerForwardRequest = remoteSource.includes('takenCommand?.request_text') && remoteSource.includes('requestText: command.request_text')
checks.playerUsesStructuredStrategies = playerSource.includes("playbackPlan.strategy === 'random'") && playerSource.includes("playbackPlan.strategy === 'artist_random'")
checks.exactAndRecommendationStaySeparate = selectorSource.includes('const strictMatch = selectionMode === "exact"') && selectorSource.includes('model-recommendation')
checks.artistCandidatesAreActuallyFiltered = selectorSource.includes('candidateEntries = candidateEntries') && selectorSource.includes('候选中没有歌手')
checks.artistCandidatesReturnToModel = selectorSource.includes('你是歌手作品选曲器') && selectorSource.includes('model-artist-selection') && !selectorSource.includes('source: "random"')

const pass = Object.values(checks).every(Boolean)
console.log(JSON.stringify({ pass, paidProviderCalls: 0, checks, plans: { exact, sad, happy, artist, genre, random } }, null, 2))
if (!pass) process.exitCode = 1
