import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = path.resolve(import.meta.dirname, '..')
const scratch = path.join(root, 'scratch', 'music-agent-memory-selftest')
fs.rmSync(scratch, { recursive: true, force: true })
fs.mkdirSync(scratch, { recursive: true })
process.env.HOME = scratch
process.env.USERPROFILE = scratch

const require = createRequire(import.meta.url)
const memory = require(path.join(root, 'ccm-package', 'dist', 'modules', 'music', 'memory.js'))
const core = require(path.join(root, 'ccm-package', 'dist', 'system', 'session-compaction-core.js'))

let checks = 0
const check = (condition, message) => {
  assert.equal(Boolean(condition), true, message)
  checks += 1
}

const repeated = value => `${value}${'音乐偏好与点歌上下文'.repeat(180)}`
for (let index = 0; index < 18; index += 1) {
  memory.appendMusicAgentMessage('user', repeated(`用户第 ${index + 1} 轮：`))
  memory.appendMusicAgentMessage('assistant', repeated(`助手第 ${index + 1} 轮：`))
}

const before = memory.buildMusicAgentModelContext('播放下一首')
check(before.mode === 'precompact_full_raw', '未压缩音乐上下文应为完整原文模式')
check(before.visibleMessages.length === 36, '未压缩时必须提供全部音乐对话')
check(before.summary == null, '未压缩时不能伪造摘要')
check(before.tokenMeasurement.activeTokens > 20_000, '测试历史应达到压缩规模')

let firstPrompt = null
const first = await memory.compactMusicAgentMemoryWithModel({
  force: true,
  threshold: 60_000,
  modelCall: async request => {
    firstPrompt = JSON.parse(request.user)
    return {
      summary: {
        userRequests: ['继续推荐适合工作的音乐'],
        preferences: ['偏好轻音乐'],
        dislikes: [],
        artistsAndGenres: ['钢琴'],
        playbackDecisions: ['优先本地曲库'],
        unresolved: ['下一首尚未选择'],
        latestContext: '正在连续点歌',
      },
      provider: 'mock',
      model: 'mock-music-summary',
    }
  },
})
check(first.compacted === true, '第一次音乐压缩应提交')
check(firstPrompt.previousSummary == null, 'S1 不应伪造上一轮摘要')
const afterFirst = memory.buildMusicAgentModelContext('')
check(afterFirst.mode === 'canonical_summary_recent_raw', '压缩后应切换为摘要加近期原文')
check(afterFirst.summary.preferences.includes('偏好轻音乐'), 'S1 应成为正式模型摘要')
check(afterFirst.visibleMessages.length > 0 && afterFirst.visibleMessages.length < 36, '压缩后应保留动态近期完整原文')
check(afterFirst.archiveMessages.length > 0, '边界前原文应保留为可核验档案')
check(afterFirst.boundaryGeneration === 1, '第一次压缩边界 generation 应为 1')

for (let index = 0; index < 12; index += 1) {
  memory.appendMusicAgentMessage('user', repeated(`新增用户轮次 ${index + 1}：`))
  memory.appendMusicAgentMessage('assistant', repeated(`新增助手轮次 ${index + 1}：`))
}

let secondPrompt = null
const second = await memory.compactMusicAgentMemoryWithModel({
  force: true,
  threshold: 60_000,
  modelCall: async request => {
    secondPrompt = JSON.parse(request.user)
    return {
      summary: {
        userRequests: [...(JSON.parse(request.user).previousSummary?.userRequests || []), '继续播放工作音乐'],
        preferences: [...(JSON.parse(request.user).previousSummary?.preferences || []), '不打断当前工作'],
        dislikes: [],
        artistsAndGenres: ['钢琴', '氛围音乐'],
        playbackDecisions: ['优先本地曲库'],
        unresolved: [],
        latestContext: '第二轮连续点歌',
      },
    }
  },
})
check(second.compacted === true, '第二次音乐压缩应提交')
check(secondPrompt.previousSummary?.preferences?.includes('偏好轻音乐'), 'S1 必须进入 S2 模型输入')
const afterSecond = memory.buildMusicAgentModelContext('')
check(afterSecond.summary.preferences.includes('偏好轻音乐'), 'S2 必须保留 S1 的有效偏好')
check(afterSecond.summary.preferences.includes('不打断当前工作'), 'S2 应包含新增偏好')
check(afterSecond.boundaryGeneration === 2, '第二次压缩边界 generation 应为 2')
check(afterSecond.summaryChecksum === core.sessionCompactionChecksum(afterSecond.summary), '正式摘要 checksum 应匹配')

const stateBeforeFailure = memory.loadMusicAgentMemory()
for (let index = 0; index < 8; index += 1) {
  memory.appendMusicAgentMessage('user', repeated(`失败探针用户 ${index + 1}：`))
  memory.appendMusicAgentMessage('assistant', repeated(`失败探针助手 ${index + 1}：`))
}
await assert.rejects(
  () => memory.compactMusicAgentMemoryWithModel({ force: true, threshold: 60_000, modelCall: async () => null }),
  /未返回摘要|摘要不可用/,
)
checks += 1
const stateAfterFailure = memory.loadMusicAgentMemory()
check(stateAfterFailure.compaction.activeSummaryChecksum === stateBeforeFailure.compaction.activeSummaryChecksum, '模型失败不得推进正式摘要')
check(stateAfterFailure.compaction.v2.consecutiveFailures === 1, '模型失败应记录精确音乐作用域失败次数')

const hooks = memory.__musicMemoryTestHooks
const merged = hooks.mergeLongTerm(
  { preferences: ['喜欢夜间轻音乐'], dislikes: [], favoriteArtists: ['旧歌手'] },
  { preferences: ['工作时低音量'], removeFavoriteArtists: ['旧歌手'], favoriteArtists: ['新歌手'] },
  ['u1', 'a1'],
)
check(merged.preferences.includes('喜欢夜间轻音乐') && merged.preferences.includes('工作时低音量'), '长期偏好应增量合并')
check(!merged.favoriteArtists.includes('旧歌手') && merged.favoriteArtists.includes('新歌手'), '用户纠正应删除旧偏好并加入新偏好')
check(hooks.shouldExtractLongTerm('以后默认播放轻音乐') === true, '明确偏好应触发模型长期记忆提取')
check(hooks.shouldExtractLongTerm('播放晴天') === false, '一次点歌不应自动成为长期偏好')

fs.writeFileSync(memory.MUSIC_AGENT_MEMORY_FILE, JSON.stringify({
  ...memory.loadMusicAgentMemory(),
  longTermMemory: merged,
}, null, 2))
memory.clearMusicAgentConversation()
const cleared = memory.loadMusicAgentMemory()
check(cleared.transcript.length === 0, '清空音乐对话应删除单例 transcript')
check(cleared.compaction == null, '清空音乐对话应失效压缩边界')
check(cleared.longTermMemory.preferences.includes('工作时低音量'), '默认清空对话应保留长期音乐偏好')

console.log(JSON.stringify({
  pass: true,
  checks,
  singleton: true,
  userVisibleSessions: false,
  precompactFullRaw: true,
  summaryChain: 'S1 -> S2',
  longTermPreferenceAdmission: 'model_only',
  paidProviderCalls: 0,
}, null, 2))

fs.rmSync(scratch, { recursive: true, force: true })
