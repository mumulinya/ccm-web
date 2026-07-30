import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const source = file => fs.readFileSync(path.join(root, file), 'utf8')
const state = require('../ccm-package/dist/modules/music/state.js')
const decisionModule = require('../ccm-package/dist/modules/music/playback-decision.js')

const queue = state.runMusicRemoteCommandQueueSelfTest()
const privateDecision = {
  schema: 'ccm-music-playback-decision-v2',
  version: 2,
  id: 'decision-self-test',
  requestId: 'request-self-test',
  originalRequest: '播放测试歌曲',
  action: 'play',
  strategy: 'exact_song',
  sourceMode: 'netease',
  searchQuery: '测试歌曲',
  status: 'resolved',
  candidates: [{ source: 'netease', sourceId: '1', title: '测试歌曲', artist: '测试歌手', downloadToken: 'secret-token' }],
  selectedCandidate: { source: 'netease', sourceId: '1', title: '测试歌曲', artist: '测试歌手', downloadToken: 'secret-token' },
  reply: '已选择《测试歌曲》。',
  reason: 'self-test',
  intentReceipt: null,
  selectionReceipt: null,
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  checksum: 'self-test',
}
const publicDecision = decisionModule.publicMusicPlaybackDecision(privateDecision)

const stateSource = source('backend/modules/music/state.ts')
const persistenceSource = source('backend/modules/music/music-persistence.ts')
const apiSource = source('backend/modules/music/music.ts')
const agentSource = source('backend/modules/music/agent.ts')
const playerSource = source('frontend/src/components/music/useMusicPlayer.js')
const remoteSource = source('frontend/src/composables/useMusicRemotePlayback.js')
const playbackSource = source('frontend/src/composables/useMusicPlayback.js')

const checks = {
  queueV2Passes: queue.success === true,
  peekDoesNotClaim: queue.checks?.peekDoesNotClaim === true,
  latestSupersedesClaimed: queue.checks?.latestSupersedesClaimed === true,
  heartbeatAndTerminalPersist: queue.checks?.heartbeatRenewsLease === true && queue.checks?.terminalReceiptPersisted === true,
  publicDecisionHidesDownloadToken: !publicDecision.selectedCandidate?.downloadToken && publicDecision.candidates.every(item => !item?.downloadToken),
  shortClaimLease: persistenceSource.includes('Number(input.leaseMs || 15_000)'),
  commandStatesComplete: ['resolving', 'ready', 'claimed', 'playing', 'needs_user_gesture', 'completed', 'superseded', 'cancelled'].every(status => stateSource.includes(`"${status}"`)),
  v2ApiSurfaceComplete: [
    '/api/music/intent/resolve',
    '/api/music/playback/resolve',
    '/api/music/playback/commands/head',
    'claim|heartbeat|complete|cancel',
  ].every(value => apiSource.includes(value)),
  noPseudoToolCallText: !agentSource.includes('<tool_call>'),
  noFrontendSemanticFallback: !playerSource.includes('frontend-fallback') && !playerSource.includes('sendToSimpleAgent'),
  peekBeforeClaim: remoteSource.indexOf("fetch('/api/music/playback/commands/head')") < remoteSource.indexOf('claimMusicRemoteCommandV2(pending)'),
  leaseHeartbeatCancelsSupersededDownload: remoteSource.includes('__cc_global_cancel_music_command') && playerSource.includes("source: 'server-superseded'"),
  terminalStateCannotBeOverwritten: persistenceSource.includes('播放指令已经进入不可修改的终态'),
  userGestureCompletesReceipt: remoteSource.includes('__cc_complete_music_gesture') && playbackSource.includes('__cc_complete_music_gesture'),
  oneAuthoritativeMusicReply: !playerSource.includes('已自动播放'),
  sourceAuthorizationLocked: agentSource.includes('只有用户在当前消息中明确指定') && agentSource.includes('sourceMode: normalizeMusicSourceMode(value?.sourceMode || mode)'),
}

const pass = Object.values(checks).every(Boolean)
console.log(JSON.stringify({ pass, paidProviderCalls: 0, checks, queue }, null, 2))
if (!pass) process.exitCode = 1
