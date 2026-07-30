import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { RANDOM_MUSIC_KEYWORD, resolveMusicIntentDecisionV2, resolveMusicPlaybackRequest } = require('../ccm-package/dist/modules/music/agent.js')
const { selectMusicTrack } = require('../ccm-package/dist/modules/music/select-track.js')
const root = path.resolve(import.meta.dirname, '..')
const source = (file) => fs.readFileSync(path.join(root, file), 'utf8')

let modelCalls = 0
const mockServer = http.createServer(async (req, res) => {
  modelCalls += 1
  let body = ''
  for await (const chunk of req) body += chunk
  let userText = body
  try {
    const payload = JSON.parse(body)
    const messages = Array.isArray(payload?.messages) ? payload.messages : []
    userText = String(messages.filter((item) => item?.role === 'user').at(-1)?.content || body)
  } catch {}
  let content
  if (userText.includes('selectionMode')) {
    content = '{"index":1,"reject":false,"confidence":0.96,"reason":"模型结合歌手与安静偏好选择候选","reply":"已选择周杰伦的《安静》。"}'
  } else if (userText.includes('心情不好')) {
    content = '{"action":"play","strategy":"mood_recommendation","searchQuery":"治愈 温柔","mood":"难过","sourceMode":"netease","confidence":0.95,"reason":"模型识别情绪"}'
  } else if (userText.includes('特别开心')) {
    content = '{"action":"play","strategy":"mood_recommendation","searchQuery":"欢快 庆祝","mood":"开心","sourceMode":"netease","confidence":0.95,"reason":"模型识别情绪"}'
  } else if (userText.includes('周杰伦的晴天')) {
    content = '{"action":"play","strategy":"exact_song","searchQuery":"周杰伦 晴天","artist":"周杰伦","sourceMode":"netease","confidence":0.98,"reason":"模型识别明确歌曲"}'
  } else if (userText.includes('周杰伦的歌')) {
    content = '{"action":"play","strategy":"artist_random","searchQuery":"周杰伦","artist":"周杰伦","sourceMode":"netease","confidence":0.96,"reason":"模型识别歌手范围"}'
  } else if (userText.includes('摇滚')) {
    content = '{"action":"play","strategy":"genre_recommendation","searchQuery":"摇滚","genre":"摇滚","sourceMode":"netease","confidence":0.94,"reason":"模型识别曲风"}'
  } else {
    content = '{"action":"play","strategy":"random","searchQuery":"__random__","sourceMode":"netease","confidence":0.9,"reason":"模型确认无额外限制"}'
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ choices: [{ message: { content } }] }))
})

await new Promise((resolve) => mockServer.listen(0, '127.0.0.1', resolve))
const port = mockServer.address().port
const config = { enabled: true, apiKey: 'mock-key', model: 'mock-model', apiUrl: `http://127.0.0.1:${port}`, format: 'openai', timeoutMs: 5000 }

let plans
let artistSelected
let sourceLockedIntent
try {
  plans = {
    exact: await resolveMusicPlaybackRequest(config, '播放周杰伦的晴天', '周杰伦 晴天'),
    sad: await resolveMusicPlaybackRequest(config, '我心情不好，给我播放一首歌', ''),
    happy: await resolveMusicPlaybackRequest(config, '今天特别开心，放首歌庆祝一下', ''),
    artist: await resolveMusicPlaybackRequest(config, '播放周杰伦的歌', '周杰伦'),
    genre: await resolveMusicPlaybackRequest(config, '来一首摇滚音乐', '摇滚'),
    random: await resolveMusicPlaybackRequest(config, '随便放一首歌', ''),
  }
  artistSelected = await selectMusicTrack({
    keyword: '周杰伦',
    originalRequest: '播放周杰伦的歌，想听一首安静一点的',
    selectionMode: 'artist_random',
    candidates: [
      { title: '周杰伦精选', artist: '未知歌手' },
      { title: '江南', artist: '林俊杰' },
      { title: '晴天', artist: '周杰伦' },
      { title: '安静', artist: '周杰伦' },
    ],
    modelConfig: config,
  })
  sourceLockedIntent = await resolveMusicIntentDecisionV2({
    config,
    message: '随便放一首歌',
    mode: 'local',
    sessionId: `music-source-lock-${Date.now()}`,
  })
} finally {
  await new Promise((resolve) => mockServer.close(resolve))
}

let disabledRejected = false
try {
  await resolveMusicPlaybackRequest({ enabled: false }, '适合写代码时听的歌，播放一首', '')
} catch (error) {
  disabledRejected = /统一大模型/.test(String(error?.message || error))
}
const selectorWithoutModel = await selectMusicTrack({
  keyword: '周杰伦 晴天',
  candidates: [{ title: '晴天', artist: '周杰伦' }],
  allowModel: false,
})

const checks = {
  exactSongIsStrict: plans.exact.strategy === 'exact_song' && plans.exact.strictMatch,
  sadMoodIsModelDecision: plans.sad.strategy === 'mood_recommendation' && plans.sad.searchQuery.includes('治愈'),
  happyMoodIsModelDecision: plans.happy.strategy === 'mood_recommendation' && plans.happy.searchQuery.includes('欢快'),
  artistOnlyStillUsesModel: plans.artist.strategy === 'artist_random' && plans.artist.artist === '周杰伦',
  genreUsesModel: plans.genre.strategy === 'genre_recommendation' && plans.genre.genre === '摇滚',
  randomIsExplicitModelDecision: plans.random.strategy === 'random' && plans.random.searchQuery === RANDOM_MUSIC_KEYWORD,
  modelUnavailableFailsClosed: disabledRejected,
  selectorWithoutModelFailsClosed: selectorWithoutModel.rejected === true && selectorWithoutModel.source === 'reject',
  artistCandidatesFilteredThenModelSelected: artistSelected?.success === true && artistSelected?.source === 'model-artist-selection' && artistSelected?.index === 3,
  pageBrowseModeDoesNotRestrictAiSource: sourceLockedIntent.sourceMode === 'netease',
  mockProviderUsedOnly: modelCalls === 8,
  noLocalSelectionFallback: !source('backend/modules/music/select-track.ts').includes('recommendation-fallback')
    && !source('backend/modules/music/select-track.ts').includes('改用规则选曲'),
  noLocalIntentFallback: source('backend/modules/music/agent.ts').includes('本地音乐语义兜底已停用'),
  noPseudoToolCallProtocol: !source('backend/modules/music/agent.ts').includes('<tool_call>'),
  noFrontendRuleFallback: !source('frontend/src/components/music/useMusicPlayer.js').includes('frontend-fallback')
    && !source('frontend/src/components/music/useMusicPlayer.js').includes('sendToSimpleAgent'),
}

const pass = Object.values(checks).every(Boolean)
console.log(JSON.stringify({ pass, paidProviderCalls: 0, modelCalls, checks, plans, artistSelected, sourceLockedIntent }, null, 2))
if (!pass) process.exitCode = 1
