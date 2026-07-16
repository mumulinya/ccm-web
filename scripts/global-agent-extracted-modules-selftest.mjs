import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const require = createRequire(import.meta.url)
const historyModule = require(path.join(root, 'ccm-package/dist/modules/global/global-agent-history.js'))
const feishuActionsModule = require(path.join(root, 'ccm-package/dist/modules/global/global-agent-feishu-actions.js'))
const feishuChannelModule = require(path.join(root, 'ccm-package/dist/modules/global/global-agent-feishu-channel.js'))
const agenticRuntimeModule = require(path.join(root, 'ccm-package/dist/modules/global/global-agent-agentic-runtime.js'))
const apiModule = require(path.join(root, 'ccm-package/dist/modules/global/global-agent-api.js'))
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-global-modules-'))
const historyFile = path.join(tempDir, 'global-agent-history.json')

const writeJsonAtomic = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8')
const buildVisibleReply = ({ value, rawSource, fallback }) => {
  const raw = String(rawSource || value || '')
  const internal = /CCM_AGENT_RECEIPT|task-notification|test-agent-artifacts|artifact-manifest\.json|report\.md/i.test(raw)
  return { text: internal ? fallback : String(value || fallback || ''), technical_content: internal ? raw : '' }
}
const historyRuntime = historyModule.createGlobalAgentHistoryRuntime({
  GLOBAL_AGENT_HISTORY_FILE: historyFile,
  GLOBAL_AGENT_HISTORY_LIMIT: 120,
  GLOBAL_AGENT_SESSION_LIMIT: 40,
  buildGlobalVisibleReplyContent: buildVisibleReply,
  ingestGlobalAgentConversation: () => ({ success: true }),
  writeGlobalJsonAtomic: writeJsonAtomic,
})

try {
  const historySelfTest = historyRuntime.runGlobalAgentHistorySyncSelfTest()
  assert.equal(historySelfTest.pass, true, JSON.stringify(historySelfTest.checks))
  const persisted = historyRuntime.syncGlobalAgentWebHistory({
    currentSessionId: 'web-session-1',
    sessions: [{
      id: 'web-session-1',
      name: '模块测试',
      messages: [{ role: 'assistant', content: '已完成。', timestamp: '2026-07-16T00:00:00.000Z' }],
    }],
  })
  assert.equal(persisted.current_session_id, 'web-session-1')
  assert.equal(JSON.parse(fs.readFileSync(historyFile, 'utf8')).sessions[0].id, 'web-session-1')
  fs.writeFileSync(historyFile, '{broken', 'utf8')
  fs.writeFileSync(`${historyFile}.bak`, JSON.stringify({ current_session_id: 'backup', sessions: [] }), 'utf8')
  const recovered = historyRuntime.loadGlobalAgentHistoryStore()
  assert.equal(recovered.current_session_id, 'backup')
  assert.equal(recovered.storage_recovery?.recovered_from_backup, true)

  const missionModule = await import(pathToFileURL(path.join(root, 'frontend/src/composables/useGlobalMissionTracking.js')).href)
  const turnModule = await import(pathToFileURL(path.join(root, 'frontend/src/composables/useGlobalAgentTurnRuntime.js')).href)
  const missionMessage = {
    role: 'assistant',
    type: 'global_mission',
    content: '执行中',
    globalMission: { id: 'mission-1', title: '模块验收', status: 'in_progress' },
  }
  const sessions = { value: [{ id: 'session-1', messages: [missionMessage] }] }
  const clearedTimers = []
  let saved = 0
  const missionRuntime = missionModule.useGlobalMissionTracking({
    sessions,
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        success: true,
        mission: { id: 'mission-1', title: '模块验收', status: 'done', updated_at: '2026-07-16T00:01:00.000Z' },
        children: [],
        supervisor: { status: 'completed', final_report: { summary: '模块验收完成。' } },
      }),
    }),
    setIntervalImpl: () => 'timer-1',
    clearIntervalImpl: timer => clearedTimers.push(timer),
    saveHistory: () => { saved += 1 },
    scrollToBottom: () => {},
    formatRunVisibleReply: (_run, fallback) => fallback,
    toast: { info: () => {} },
  })
  await missionRuntime.trackGlobalMission('mission-1', 'session-1')
  assert.equal(missionMessage.finalNotified, true)
  assert.equal(clearedTimers.includes('timer-1'), true)
  assert.equal(saved, 1)
  assert.equal(sessions.value[0].messages.some(message => message.id === 'global-mission-notification:mission-1:completed'), true)
  assert.equal(missionModule.__globalMissionTrackingTestHooks.missionStatusLabel({ status: 'done' }), '全部通过')
  assert.equal(missionModule.__globalMissionTrackingTestHooks.childStatusLabel({ status: 'done', delivery_summary: { acceptance_gate_passed: true } }), '验收通过')

  const currentSession = { value: { messages: [] } }
  const activeGlobalRunId = { value: '' }
  const activeGlobalRunMessage = { value: null }
  const activeGlobalExecutionConfirmed = { value: false }
  const turnRuntime = turnModule.useGlobalAgentTurnRuntime({ currentSession, activeGlobalRunId, activeGlobalRunMessage, activeGlobalExecutionConfirmed })
  const agentMessage = { role: 'assistant', content: '', streamEvents: [], user_message: '完成任务' }
  const added = { value: false }
  turnRuntime.ensureGlobalStreamMessage(agentMessage, added)
  turnRuntime.ensureGlobalStreamMessage(agentMessage, added)
  assert.equal(currentSession.value.messages.length, 1)
  const steering = { id: 'steer-1', message: '补充验收', status: 'applied', at: '2026-07-16T00:00:00.000Z' }
  assert.equal(turnRuntime.appendGlobalStreamEvent(agentMessage, { type: 'user_steer_applied', run_id: 'run-1', steering }), true)
  const eventCount = agentMessage.streamEvents.length
  assert.equal(turnRuntime.appendGlobalStreamEvent(agentMessage, { type: 'user_steer_applied', run_id: 'run-1', steering }), false)
  assert.equal(agentMessage.streamEvents.length, eventCount)
  assert.equal(activeGlobalRunId.value, 'run-1')
  assert.equal(turnRuntime.findActiveGlobalRunMessage('run-1'), agentMessage)

  let musicCommand = null
  const feishuActions = feishuActionsModule.createGlobalAgentFeishuActions({
    RANDOM_MUSIC_KEYWORD: '__random__',
    normalizeText: value => String(value || '').trim(),
    parseMusicKeyword: value => String(value || '').includes('周杰伦') ? '周杰伦' : '',
    postLocalApi: async (_baseUrl, pathname, body) => {
      musicCommand = { pathname, body }
      return { command: { id: 'music-1' } }
    },
  })
  const musicReply = await feishuActions.queueMusicPlayback('http://127.0.0.1:3080', '播放周杰伦')
  assert.equal(musicCommand.pathname, '/api/music/remote-command')
  assert.equal(musicCommand.body.keyword, '周杰伦')
  assert.match(musicReply, /已把「周杰伦」发送给音乐播放器/)

  const feishuChannel = feishuChannelModule.createGlobalAgentFeishuChannel({})
  const feishuTurnTest = feishuChannel.runFeishuConversationTurnCommandSelfTest()
  assert.equal(feishuTurnTest.pass, true, JSON.stringify(feishuTurnTest.checks))

  const agenticRuntime = agenticRuntimeModule.createGlobalAgentAgenticRuntime({
    normalizeText: value => String(value || '').trim(),
    hasExplicitDevelopmentExecutionIntent: () => false,
  })
  assert.equal(agenticRuntime.hasExplicitGlobalWriteAuthorization('请创建一个任务'), true)
  assert.equal(agenticRuntime.verifyGlobalAgentContextBoundary({}).valid, false)
  assert.equal(agenticRuntime.buildGlobalAgentGroupMemoryModelContext('memory text').rendered_text, 'memory text')

  let apiPayload = null
  const apiRuntime = apiModule.createGlobalAgentApi({
    loadGlobalAgentHistoryStore: () => ({ current_session_id: 'session-1', sessions: [{ id: 'session-1' }] }),
    sendJson: (_res, payload, status = 200) => { apiPayload = { payload, status } },
  })
  const apiHandled = apiRuntime.handleGlobalAgentApi('/api/global-agent/history', { method: 'GET' }, {}, { query: {} }, {})
  assert.equal(apiHandled, true)
  assert.equal(apiPayload.status, 200)
  assert.equal(apiPayload.payload.current_session_id, 'session-1')

  console.log(JSON.stringify({
    pass: true,
    history: { self_test: true, persistence: true, backup_recovery: true },
    mission: { terminal_notification: true, timer_cleanup: true, status_labels: true },
    turn: { message_dedup: true, steering_dedup: true, run_envelope: true },
    feishu: { action_dispatch: true, command_parsing: true },
    agentic_runtime: { authorization: true, context_boundary: true, memory_projection: true },
    api: { direct_module_route: true },
  }, null, 2))
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true })
}
