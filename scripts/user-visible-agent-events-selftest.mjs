import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-visible-agent-events-'))
process.env.CCM_USER_VISIBLE_AGENT_EVENT_DIR = root

const require = createRequire(import.meta.url)
const events = require('../ccm-package/dist/system/user-visible-agent-events.js')
const projections = require('../ccm-package/dist/system/user-visible-agent-projections.js')
const taskStages = require('../ccm-package/dist/system/task-execution-stage-projection.js')
const providerTools = require('../ccm-package/dist/system/provider-native-tools.js')
const replyStyle = require('../ccm-package/dist/agents/conversational-reply-style.js')
const runtimeEvents = require('../ccm-package/dist/agents/runtime-structured-events.js')

const builtIn = events.runUserVisibleAgentEventSelfTest()
assert.equal(builtIn.pass, true, JSON.stringify(builtIn, null, 2))
const runtimeBuiltIn = runtimeEvents.runAgentRuntimeStructuredEventSelfTest()
assert.equal(runtimeBuiltIn.pass, true, JSON.stringify(runtimeBuiltIn, null, 2))

const identity = { scope: 'project', scopeId: 'demo', exactSessionId: 'session-visible-1', generation: 2 }
const progress = events.appendAssistantProgress({
  ...identity,
  turnId: 'turn-visible-1',
  text: '我先定位相关代码和配置，再根据结果继续判断。',
  kind: 'before_tools',
  modelCallIndex: 1,
  relatedToolCallIds: ['tool-1'],
})
events.appendAssistantProgress({
  ...identity,
  turnId: 'turn-visible-1',
  text: '我先定位相关代码和配置，再根据结果继续判断。',
  kind: 'before_tools',
  modelCallIndex: 1,
  relatedToolCallIds: ['tool-1'],
})
const semanticDuplicate = events.appendAssistantProgress({
  ...identity,
  turnId: 'turn-visible-1',
  text: '我先定位相关代码和配置，再根据结果继续判断。',
  kind: 'before_tools',
  modelCallIndex: 1,
  relatedToolCallIds: ['tool-replayed-with-new-id'],
})
assert.equal(semanticDuplicate.eventId, progress.eventId, '重复读取批次更换toolCallId后也不应重复播报同一业务说明')
const started = events.appendToolProjection({
  ...identity,
  eventId: 'visible-tool-start',
  eventType: 'tool_started',
  toolName: 'find_definition',
  toolCallId: 'tool-1',
  arguments: { symbol: 'runAgent', api_key: 'EVENT_SECRET_SENTINEL' },
})
const completed = events.appendToolProjection({
  ...identity,
  eventId: 'visible-tool-complete',
  eventType: 'tool_completed',
  toolName: 'find_definition',
  toolCallId: 'tool-1',
  observation: { content: 'SOURCE_BODY_SENTINEL', output: 'TOOL_OUTPUT_SENTINEL', locations: [{ path: 'src/agent.ts', line: 12 }] },
  durationMs: 1250,
})
events.appendToolProjection({ ...identity, eventId: 'visible-tool-complete', eventType: 'tool_completed', toolName: 'find_definition', toolCallId: 'tool-1' })

const listed = events.listUserVisibleAgentEvents({ ...identity, cursor: 0, limit: 100 })
assert.equal(listed.events.length, 3, '进度和工具事件必须持久化，重复进度按里程碑幂等去重')
assert.equal(progress.eventType, 'assistant_progress')
assert.equal(progress.detail?.progress?.text, '我先定位相关代码和配置，再根据结果继续判断。')
assert.match(progress.detail?.progress?.batchId || '', /^batch_[a-f0-9]{24}$/, '进度说明必须绑定稳定工具批次')
assert.equal(started.sequence, 2)
assert.equal(completed.sequence, 3)
assert.equal(listed.nextCursor, 3)
assert.equal(listed.contentStored, false)
const serialized = JSON.stringify(listed)
assert.equal(serialized.includes('EVENT_SECRET_SENTINEL'), false, '密钥不得出现在事件投影')
assert.equal(serialized.includes('SOURCE_BODY_SENTINEL'), false, '源码正文不得出现在事件投影')
assert.equal(serialized.includes('TOOL_OUTPUT_SENTINEL'), false, '通用output字段不得把工具正文带进事件投影')
assert.equal(completed.detail?.toolDisplay?.schema, 'ccm-tool-display-detail-v1')
assert.equal(completed.detail?.toolDisplay?.result?.kind, 'locations')
assert.equal(/toolKind|resultChecksum|outputChecksum|aliases/.test(JSON.stringify(completed.detail?.toolDisplay)), false, '用户工具详情不得包含内部运行回执')

const planIdentity = { ...identity, exactSessionId: 'session-visible-plan' }
const visiblePlan = events.appendUserVisibleRequirementPlan({
  ...planIdentity,
  taskId: 'task-visible-plan',
  plan: {
    planId: 'task-visible-plan', revision: 1, title: '需求实施计划',
    goal: '完善后台管理功能，让运营人员可以管理商家和订单。',
    steps: [
      { id: 'step_1', title: '确认功能范围', description: '梳理当前能力和缺失功能。', outcome: '得到明确的实施范围', project: 'smart-live-ui', status: 'completed' },
      { id: 'step_2', title: '完善后台页面', description: '补齐主要管理页面。', outcome: '运营人员可以完成日常管理', project: 'smart-live-ui', dependsOn: ['step_1'], status: 'running' },
    ],
    scope: ['后台管理页面', '业务接口'], expectedResults: ['主要管理流程可用'], exclusions: ['不执行生产发布'], status: 'executing',
  },
})
assert.equal(visiblePlan.eventType, 'requirement_plan')
assert.equal(visiblePlan.detail?.requirementPlan?.schema, 'ccm-user-visible-requirement-plan-v1')
assert.equal(visiblePlan.detail?.requirementPlan?.steps?.length, 2)
assert.equal(visiblePlan.detail?.requirementPlan?.contentStored, false)
assert.equal(typeof visiblePlan.detail?.requirementPlan?.planChecksum, 'string')
assert.equal(JSON.stringify(visiblePlan).includes('sourceCode'), false, '用户需求计划不得保存内部源码正文')

const directory = events.appendToolProjection({
  ...identity,
  eventId: 'visible-directory-complete',
  eventType: 'tool_completed',
  toolName: 'mcp__ccm__ccm_workspace_readonly__list_directory',
  toolCallId: 'tool-directory',
  arguments: { project_id: 'demo', path: '', limit: 100 },
  result: {
    name: 'mcp__ccm__ccm_workspace_readonly__list_directory', toolKind: 'internal_mcp', source: 'ccm__workspace_readonly', loaded: true,
    output: JSON.stringify({ project: 'demo', path: '', items: [{ name: 'src', path: 'src', type: 'directory' }, { name: 'package.json', path: 'package.json', type: 'file' }], total: 2, truncated: false }),
    outputTokens: 200, resultChecksum: 'INTERNAL_CHECKSUM_SENTINEL', ok: true,
  },
})
assert.equal(directory.display.title, 'List directory')
assert.equal(directory.detail?.toolDisplay?.tool?.serverLabel, 'ccm_workspace_readonly')
assert.equal(directory.detail?.toolDisplay?.result?.rows?.length, 2)
assert.match(directory.detail?.toolDisplay?.result?.summary || '', /1 个目录，1 个文件/)
assert.match(directory.display?.summary || '', /1 个目录，1 个文件/, '工具行必须直接展示业务结果摘要')
assert.equal(directory.display?.tokenType, 'tool_output')
assert.equal(directory.display?.tokenAccuracy, 'estimated')
assert.equal(JSON.stringify(directory).includes('INTERNAL_CHECKSUM_SENTINEL'), false)

const nativeTextAndTools = providerTools.turnForLegacyJsonLoop({
  text: '我先检查相关目录。',
  toolCalls: [{ id: 'native-call-1', name: 'list_directory', arguments: { path: '' } }],
  toolReferences: ['list_directory'], stopReason: 'tool_use', usage: {},
})
const nativeProjected = JSON.parse(nativeTextAndTools)
assert.equal(nativeProjected.progressUpdate, '我先检查相关目录。', 'Provider普通文本必须与工具调用同时保留')
assert.equal(nativeProjected.toolRequests.length, 1, 'Provider文本不得覆盖原生工具调用')

const timedResult = events.appendUserVisibleAgentEvent({
  ...identity,
  eventId: 'visible-turn-result',
  eventType: 'result',
  display: { title: '回复完成', status: 'success', durationMs: 43000, tokenCount: 1400, tokenType: 'provider_total', tokenAccuracy: 'reported' },
  result: events.buildUserVisibleAgentResult({
    status: 'success', text: '完成', filesChanged: [
      { project: 'api', path: 'src/shared.ts', additions: 7, deletions: 1, diff: { raw: 'FINAL_DIFF_SENTINEL' } },
      { project: 'web', path: 'src/shared.ts', additions: 4, deletions: 2 },
    ],
  }),
  detail: { timing: { totalMs: 43000, modelMs: 41000, toolWallMs: 100, otherMs: 1900 } },
})
events.appendAssistantProgress({
  ...identity,
  turnId: 'turn-visible-1',
  text: '这条迟到进度不应在Result之后进入账本。',
  kind: 'key_finding',
  modelCallIndex: 9,
})
assert.equal(events.listUserVisibleAgentEvents({ ...identity, cursor: timedResult.sequence, limit: 20 }).events.length, 0, 'Result后不得追加运行中说明')
assert.equal(timedResult.display.tokenType, 'provider_total')
assert.equal(timedResult.display.tokenAccuracy, 'reported')
assert.deepEqual(timedResult.detail?.timing, { totalMs: 43000, modelMs: 41000, toolWallMs: 100, otherMs: 1900 })
assert.equal(timedResult.detail?.fileChanges?.length, 2, '终态Result必须把跨项目同名文件保留为两条安全元数据')
assert.equal(JSON.stringify(timedResult).includes('FINAL_DIFF_SENTINEL'), false, '终态Result不得保存Diff正文')
const normalizedAgentEvent = events.normalizeUserVisibleAgentEvent({
  ...identity,
  eventId: 'visible-agent-progress',
  eventType: 'agent_progress',
  agentRunId: 'acm-safe-id',
  anchorMessageId: 'assistant-message-safe-id',
  originMessageId: 'global-origin-safe-id',
  parallelGroupId: 'agent-batch-safe-id',
  display: { title: 'smart-live-ui · Codex', status: 'waiting' },
  detail: {
    agentDisplay: { projectId: 'smart-live-ui', projectName: 'smart-live-ui', runtimeLabel: 'Codex', workItemTitle: '后台前端', phase: 'verifying', attempt: 2, queuePosition: 3, isParallel: true },
    executionStage: { kind: 'project_execution', stageRunId: 'stage-project-1', attempt: 2, startedAt: '2026-08-09T10:00:00.000Z', activeDurationMs: 9000 },
    fileChanges: [{ path: 'src/admin.ts', project: 'smart-live-ui', additions: 12, deletions: 3, diff: { raw: 'SOURCE_DIFF_SENTINEL', additions: 12, deletions: 3 } }],
  },
}, 1)
assert.equal(normalizedAgentEvent.agentRunId, 'acm-safe-id')
assert.equal(normalizedAgentEvent.anchorMessageId, 'assistant-message-safe-id')
assert.equal(normalizedAgentEvent.originMessageId, 'global-origin-safe-id')
assert.equal(normalizedAgentEvent.detail?.agentDisplay?.projectName, 'smart-live-ui')
assert.equal(normalizedAgentEvent.detail?.agentDisplay?.attempt, 2)
assert.equal(normalizedAgentEvent.detail?.agentDisplay?.queuePosition, 3)
assert.equal(normalizedAgentEvent.detail?.executionStage?.kind, 'project_execution')
assert.equal(normalizedAgentEvent.detail?.executionStage?.activeDurationMs, 9000)
assert.deepEqual(normalizedAgentEvent.detail?.fileChanges, [{ path: 'src/admin.ts', project: 'smart-live-ui', additions: 12, deletions: 3 }])
assert.equal(JSON.stringify(normalizedAgentEvent).includes('SOURCE_DIFF_SENTINEL'), false, '源码Diff不得写入用户可见事件账本')
const guardedFailure = events.normalizeUserVisibleAgentEvent({
  ...identity,
  eventId: 'guarded-failure-actions',
  eventType: 'agent_failed',
  taskId: 'task-guarded',
  display: { title: 'Codex', status: 'failed', summary: '执行失败' },
  detail: {
    availableActions: [
      { id: 'recheck', kind: 'recheck', label: '重新核验', enabled: true, revision: 7, generation: 2, bindingChecksum: 'safe-binding' },
      { id: 'unsafe', kind: 'arbitrary_write', label: '危险操作', enabled: true },
    ],
  },
})
assert.deepEqual(guardedFailure.detail?.availableActions?.map(action => action.kind), ['recheck'], '前端只能收到后端白名单内的失败操作')
assert.equal(guardedFailure.detail?.availableActions?.[0]?.revision, 7)
const cappedFileEvent = events.normalizeUserVisibleAgentEvent({
  ...identity,
  eventId: 'visible-files-cap',
  eventType: 'result',
  display: { title: '任务已完成', status: 'success' },
  fileChanges: Array.from({ length: 105 }, (_, index) => ({ path: `src/file-${index}.ts`, ...(index === 0 ? { deleted: true } : {}) })),
}, 2)
assert.equal(cappedFileEvent.detail?.fileChanges?.length, 100, '终态文件元数据最多持久化100条')
assert.equal(Object.hasOwn(cappedFileEvent.detail?.fileChanges?.[0] || {}, 'additions'), false, '缺少增删统计时不得伪造+0')
assert.equal(cappedFileEvent.detail?.fileChanges?.[0]?.deleted, true)

const stageTaskBase = {
  id: 'task-stage-flow', group_id: 'group-stage', group_session_id: 'session-stage', target_project: 'smart-live-ui',
  generation: 3, created_at: '2026-08-09T09:59:00.000Z', status: 'in_progress', acceptance_state: 'awaiting_test_agent', review_round: 1,
}
const stageStates = [
  { ...stageTaskBase, status: 'reviewing', acceptance_state: 'test_agent_running', updated_at: '2026-08-09T10:00:00.000Z' },
  { ...stageTaskBase, status: 'pending', acceptance_state: 'reworking', review_round: 1, updated_at: '2026-08-09T10:00:20.000Z', status_detail: '路由回归未通过' },
  { ...stageTaskBase, status: 'reviewing', acceptance_state: 'test_agent_running', review_round: 2, updated_at: '2026-08-09T10:00:40.000Z' },
  { ...stageTaskBase, status: 'reviewing', acceptance_state: 'test_agent_passed', review_round: 2, updated_at: '2026-08-09T10:01:00.000Z' },
  { ...stageTaskBase, status: 'reviewing', acceptance_state: 'main_agent_accepting', review_round: 2, updated_at: '2026-08-09T10:01:02.000Z' },
  { ...stageTaskBase, status: 'done', acceptance_state: 'accepted', review_round: 2, updated_at: '2026-08-09T10:01:12.000Z', final_summary: '最终验收与总结完成' },
]
let previousStageTask = stageTaskBase
for (const stageTask of stageStates) {
  taskStages.projectTaskExecutionStageTransition(previousStageTask, stageTask)
  previousStageTask = stageTask
}
const stagedEvents = events.listUserVisibleAgentEvents({ scope: 'group', scopeId: 'group-stage', exactSessionId: 'session-stage', limit: 100 }).events
assert.equal(stagedEvents.filter(event => event.detail?.executionStage?.kind === 'independent_verification').length, 4, '两轮TestAgent必须各有开始与终态证据')
assert.equal(stagedEvents.some(event => event.eventType === 'agent_failed' && event.detail?.executionStage?.attempt === 1), true, '第一轮未通过必须保留为历史失败')
assert.equal(stagedEvents.some(event => event.eventType === 'agent_completed' && event.detail?.executionStage?.attempt === 2), true, '第二轮复验通过后才能继续')
const mainStageEvents = stagedEvents.filter(event => event.detail?.executionStage?.kind === 'main_agent_summary')
assert.deepEqual(mainStageEvents.map(event => event.eventType), ['agent_started', 'agent_completed'], '主Agent总结必须位于复验通过之后且完整收口')
const stagedResult = stagedEvents.find(event => event.eventType === 'result')
assert.equal(stagedResult?.detail?.timing?.totalMs, 132000, '群聊终态必须记录从任务开始到最终总结完成的整轮耗时')

let ephemeral = null
const unsubscribe = events.subscribeUserVisibleAgentEvents(event => { if (event.eventType === 'assistant_text_delta') ephemeral = event })
events.publishEphemeralUserVisibleAgentEvent({
  ...identity,
  eventId: 'delta-live-only',
  eventType: 'assistant_text_delta',
  display: { title: '项目主 Agent', summary: '正在流式回复', status: 'running' },
})
unsubscribe()
assert.equal(ephemeral?.sequence, 0, '文本增量必须是非持久实时事件')
assert.equal(events.listUserVisibleAgentEvents({ ...identity }).events.length, 5, '文本增量不得写入持久投影')

const liveScopes = []
const stopLiveScopeCapture = events.subscribeUserVisibleAgentEvents(event => {
  if (event.eventType === 'assistant_text_delta') liveScopes.push(event.scope)
})
projections.publishUserVisibleAssistantText({ scope:'global', scopeId:'global', exactSessionId:'global-session', turnId:'global-turn', text:'全局回复' })
projections.publishUserVisibleAssistantText({ scope:'group', scopeId:'group-1', exactSessionId:'group-session', turnId:'group-turn', text:'群聊回复' })
stopLiveScopeCapture()
assert.deepEqual(liveScopes, ['global', 'group'], '全局和群聊必须使用同一实时文本事件')
assert.equal(events.listUserVisibleAgentEvents({ scope:'global', scopeId:'global', exactSessionId:'global-session' }).events.length, 0)
assert.equal(events.listUserVisibleAgentEvents({ scope:'group', scopeId:'group-1', exactSessionId:'group-session' }).events.length, 0)

projections.projectCommittedGroupCompaction({
  groupId:'group-1', exactSessionId:'group-session', reason:'selftest',
  result:{ compacted:true, boundary:{ id:'boundary-1', boundaryGeneration:3, post_compact_restore:{ dynamicContextRestoreReceipt:{ restoredTokens:1200 } } } },
})
const groupCompactionEvents = events.listUserVisibleAgentEvents({ scope:'group', scopeId:'group-1', exactSessionId:'group-session' }).events
assert.equal(groupCompactionEvents.length, 1)
assert.equal(groupCompactionEvents[0].eventType, 'context_compacted')
assert.equal(groupCompactionEvents[0].display.tokenCount, 1200)

const frontendFiles = [
  'frontend/src/components/global/GlobalAgentMessageList.vue',
  'frontend/src/components/projects/ProjectManager.template.html',
  'frontend/src/components/collaboration/GroupChat.template.html',
]
for (const file of frontendFiles) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
  assert.match(source, /AgentExecutionTranscript/, `${file}必须接入统一执行流组件`)
  assert.match(source, /open-file-change/, `${file}必须把执行记录文件变化接入代码Diff抽屉`)
  assert.match(source, /presentation="live"/, `${file}必须在运行中使用实时投影`)
  assert.match(source, /presentation="completed"/, `${file}必须在最终回答后使用完成投影`)
}
const progressTranscriptSource = fs.readFileSync(new URL('../frontend/src/components/common/AgentExecutionTranscript.vue', import.meta.url), 'utf8')
assert.match(progressTranscriptSource, /assistantProgressRows/, '统一执行流组件必须识别主Agent进度说明')
assert.match(progressTranscriptSource, /progressSegments/, '主Agent说明与后续工具批次必须按时序分段')
assert.match(progressTranscriptSource, /cc-progress-text/, '进度说明必须独立于工具详情折叠状态显示')
assert.match(progressTranscriptSource, /cc-completion-files/, '完成投影必须提供独立文件变更卡')
assert.match(progressTranscriptSource, /completionFilesVisible/, '文件变更卡必须默认三项并支持受限展开')
assert.match(progressTranscriptSource, /产生了.*未验收改动/, '失败或阻塞终态必须使用未验收改动警告语义')
assert.match(progressTranscriptSource, /requirementPlan/, '统一执行流组件必须展示用户需求实施计划')
assert.match(progressTranscriptSource, /cc-requirement-plan/, '需求实施计划必须使用独立的可折叠用户界面')
assert.match(progressTranscriptSource, /batchId|__progressBatch/, '说明文字必须与对应工具批次精确绑定')
assert.match(progressTranscriptSource, /sessionStorage/, '展开状态必须按会话消息保存在浏览器会话存储')
assert.match(progressTranscriptSource, /搜索工具、项目、文件或失败原因/, '长执行记录必须支持当前消息内搜索')
assert.match(progressTranscriptSource, /availableActions/, '失败操作必须来自后端授权动作')
assert.match(progressTranscriptSource, /freshness === 'drifted'/, '权威结果变化必须给出漂移提示')
assert.match(progressTranscriptSource, /cc-live-execution-status/, '运行态必须显示Codex风格的处理时间和当前阶段')
assert.match(progressTranscriptSource, /liveRowLabel/, '运行态工具必须使用正在运行或已完成的紧凑文案')
assert.match(progressTranscriptSource, /isLivePresentation/, '运行态与完成态必须使用同一账本的不同投影')
const pinnedScrollSource = fs.readFileSync(new URL('../frontend/src/composables/usePinnedScroll.js', import.meta.url), 'utf8')
assert.match(pinnedScrollSource, /pendingUpdates/, '用户离开底部时必须累计新进度')
assert.match(pinnedScrollSource, /threshold = options\.threshold \|\| 120/, '自动跟随底部阈值必须为120px')

const frontendExecution = await import('../frontend/src/utils/agentExecutionEvents.js')
const at = offset => new Date(Date.UTC(2026, 7, 9, 10, 0, offset)).toISOString()
const conversationMessages = [
  { role: 'user', content: '你觉得这个项目怎么样', timestamp: at(0) },
  { role: 'assistant', content: '整体方向不错。', timestamp: at(4) },
]
const conversationEvents = [
  { eventId: 'conversation-start', sequence: 1, eventType: 'turn_started', display: { status: 'running' }, createdAt: at(1) },
  { eventId: 'conversation-thinking', sequence: 2, eventType: 'thinking_status', display: { status: 'running' }, createdAt: at(2) },
  { eventId: 'conversation-result', sequence: 3, eventType: 'result', display: { status: 'success', toolUseCount: 0 }, createdAt: at(3) },
]
assert.equal(frontendExecution.shouldRenderExecutionTranscript(conversationEvents, conversationMessages, 1, false), false, '零动作普通对话默认不得显示执行记录')
assert.equal(frontendExecution.shouldRenderExecutionTranscript(conversationEvents, conversationMessages, 1, true), true, 'Ctrl+O展开后普通对话仍可查看技术记录')
const toolEvents = [
  ...conversationEvents.slice(0, 2),
  { eventId: 'progress-before-tools', sequence: 3, eventType: 'assistant_progress', display: { status: 'running', summary: '我先检查项目结构。' }, detail: { progress: { kind: 'before_tools', text: '我先检查项目结构。', modelCallIndex: 1, relatedToolCallIds: ['tool-start'], milestoneChecksum: 'safe' } }, createdAt: at(2) },
  { eventId: 'tool-start', sequence: 4, eventType: 'tool_started', display: { status: 'running' }, createdAt: at(3) },
]
assert.equal(frontendExecution.shouldRenderExecutionTranscript(toolEvents, conversationMessages, 1, false), true, '真实工具动作必须立即显示执行记录')
assert.equal(frontendExecution.coalesceExecutionEvents(toolEvents).some(event => event.eventType === 'assistant_progress'), true, '进度说明必须保留在时序投影中')
const planOnlyEvents = [
  ...conversationEvents.slice(0, 2),
  { eventId: 'requirement-plan', sequence: 3, eventType: 'requirement_plan', display: { status: 'running' }, detail: { requirementPlan: { planId: 'plan-1', revision: 1, goal: '完成业务需求', steps: [{ id: 'step_1', title: '实现功能' }] } }, createdAt: at(3) },
]
assert.equal(frontendExecution.shouldRenderExecutionTranscript(planOnlyEvents, conversationMessages, 1, false), true, '真实需求实施计划必须触发执行流展示')
const lifecycleEvents = [
  ...conversationEvents.slice(0, 2),
  { eventId: 'tool-call-start', toolCallId: 'tool-call-1', sequence: 3, eventType: 'tool_started', display: { title: 'Read', status: 'running' }, createdAt: at(3) },
  { eventId: 'tool-call-complete', toolCallId: 'tool-call-1', sequence: 4, eventType: 'tool_completed', display: { title: 'Read', status: 'success' }, createdAt: at(4) },
]
const projectedLifecycle = frontendExecution.executionEventsForMessage(lifecycleEvents, conversationMessages, 1)
assert.equal(projectedLifecycle.filter(event => event.toolCallId === 'tool-call-1').length, 1, '同一工具调用只能展示一行最新状态')
assert.equal(projectedLifecycle.find(event => event.toolCallId === 'tool-call-1')?.eventType, 'tool_completed', '完成状态必须替换执行中状态')
assert.equal(projectedLifecycle.some(event => event.eventType === 'thinking_status'), false, '出现真实工具后不应继续重复显示正在思考')
const agentLifecycleEvents = [
  ...conversationEvents.slice(0, 2),
  { eventId: 'agent-start', agentRunId: 'agent-run-1', sequence: 3, eventType: 'agent_started', taskId: 'task-agent', workItemId: 'work-agent', generation: 1, display: { title: 'smart-live-ui · Codex', status: 'running', summary: '正在执行' }, detail: { agentDisplay: { projectId: 'smart-live-ui', projectName: 'smart-live-ui', runtimeLabel: 'Codex', workItemTitle: '后台前端', phase: 'executing', attempt: 1, isParallel: true } }, createdAt: at(3) },
  { eventId: 'agent-wait', agentRunId: 'agent-run-1', sequence: 4, eventType: 'agent_progress', taskId: 'task-agent', workItemId: 'work-agent', generation: 1, display: { title: 'smart-live-ui · Codex', status: 'waiting', summary: '等待 CCM 验收', toolUseCount: 4, tokenCount: 1820 }, detail: { agentDisplay: { projectId: 'smart-live-ui', projectName: 'smart-live-ui', runtimeLabel: 'Codex', workItemTitle: '后台前端', phase: 'verifying', attempt: 1, isParallel: true } }, createdAt: at(4) },
  { eventId: 'agent-done', agentRunId: 'agent-run-1', sequence: 5, eventType: 'agent_completed', taskId: 'task-agent', workItemId: 'work-agent', generation: 1, display: { title: 'smart-live-ui · Codex', status: 'success', summary: 'CCM 已完成终态验收', durationMs: 9300 }, detail: { agentDisplay: { projectId: 'smart-live-ui', projectName: 'smart-live-ui', runtimeLabel: 'Codex', workItemTitle: '后台前端', phase: 'completed', attempt: 1, isParallel: true }, fileChanges: [{ path: 'src/admin.ts' }] }, createdAt: at(5) },
]
const projectedAgentLifecycle = frontendExecution.executionEventsForMessage(agentLifecycleEvents, conversationMessages, 1)
const projectedAgentRows = projectedAgentLifecycle.filter(event => event.agentRunId === 'agent-run-1')
assert.equal(projectedAgentRows.length, 1, '同一项目子Agent生命周期只能展示一行')
assert.equal(projectedAgentRows[0]?.eventType, 'agent_completed', '项目子Agent主行必须保留最新终态')
assert.equal(projectedAgentRows[0]?.display?.toolUseCount, 4, '终态必须保留中间回执累计的工具次数')
assert.equal(projectedAgentRows[0]?.display?.tokenCount, 1820, '终态必须保留中间回执累计的Token')
assert.equal(projectedAgentRows[0]?.detail?.agentDisplay?.projectName, 'smart-live-ui', '项目名称必须来自结构化Agent展示身份')
assert.equal(frontendExecution.agentStatusCategory({ eventType: 'agent_progress', detail: { agentDisplay: { phase: 'queued' } } }), 'queued')
assert.equal(frontendExecution.eventStatusLabel({ eventType: 'agent_progress', detail: { agentDisplay: { phase: 'queued' } } }), '排队')
assert.equal(frontendExecution.agentStatusCategory({ eventType: 'agent_started', detail: { agentDisplay: { phase: 'runner_started' } } }), 'ack')
assert.equal(frontendExecution.eventStatusLabel({ eventType: 'agent_started', detail: { agentDisplay: { phase: 'runner_started' } } }), '等待 ACK')
assert.equal(frontendExecution.agentStatusCategory({ eventType: 'agent_progress', detail: { agentDisplay: { phase: 'executing' } } }), 'executing')
assert.equal(frontendExecution.eventStatusLabel({ eventType: 'agent_progress', detail: { agentDisplay: { phase: 'executing' } } }), '执行中')
assert.equal(frontendExecution.eventStatusLabel({ eventType: 'agent_progress', detail: { agentDisplay: { phase: 'waiting_dependency' } } }), '等待依赖')
assert.equal(frontendExecution.eventStatusLabel({ eventType: 'agent_progress', detail: { agentDisplay: { phase: 'permission_required' } } }), '等待权限确认')
assert.equal(frontendExecution.eventStatusLabel({ eventType: 'agent_progress', display: { status: 'waiting' }, detail: { agentDisplay: { phase: 'verifying' } } }), '等待 CCM 验收')
assert.equal(frontendExecution.eventStatusLabel({ eventType: 'agent_failed', detail: { agentDisplay: { phase: 'recovery_required' } } }), '需要接管')
const retriedAgent = frontendExecution.coalesceExecutionEvents([
  ...agentLifecycleEvents.slice(2),
  { eventId: 'agent-retry', agentRunId: 'agent-run-1', sequence: 6, eventType: 'agent_started', taskId: 'task-agent', workItemId: 'work-agent', generation: 1, display: { title: 'smart-live-ui · Codex', status: 'running', summary: '正在增量返工' }, detail: { agentDisplay: { projectId: 'smart-live-ui', projectName: 'smart-live-ui', runtimeLabel: 'Codex', workItemTitle: '后台前端', phase: 'executing', attempt: 2, isParallel: false } }, createdAt: at(6) },
  { eventId: 'agent-late-old', agentRunId: 'agent-run-1', sequence: 7, eventType: 'agent_progress', taskId: 'task-agent', workItemId: 'work-agent', generation: 1, display: { title: 'smart-live-ui · Codex', status: 'waiting', summary: '旧回执迟到' }, detail: { agentDisplay: { projectId: 'smart-live-ui', projectName: 'smart-live-ui', runtimeLabel: 'Codex', phase: 'verifying', attempt: 1, isParallel: true } }, createdAt: at(7) },
]).find(event => event.agentRunId === 'agent-run-1')
assert.equal(retriedAgent?.display?.status, 'running', '旧attempt迟到回执不得覆盖当前重试状态')
assert.equal(retriedAgent?.detail?.agentDisplay?.attempt, 2)
assert.equal(retriedAgent?.detail?.agentAttemptHistory?.length, 1, '旧attempt必须收进展开历史')
const projectedStagedRows = frontendExecution.coalesceExecutionEvents(stagedEvents)
const projectedTestRows = projectedStagedRows.filter(event => /test.?agent/i.test(String(event?.detail?.agentDisplay?.runtimeLabel || '')))
assert.equal(projectedTestRows.length, 1, '通信事件与任务状态投影中的同一TestAgent必须合并为一行')
assert.equal(projectedTestRows[0]?.detail?.agentDisplay?.attempt, 2)
assert.equal(projectedTestRows[0]?.detail?.agentAttemptHistory?.length, 1, 'TestAgent第一轮失败必须折叠进轮次历史')
const delayedCommitMessages = [
  // Reproduces the group persistence path where the user message is committed
  // after the tool lifecycle has already completed.
  { role: 'user', content: '查看后台目录', timestamp: at(9) },
  { role: 'assistant', content: '已经看到后台目录。', timestamp: at(10) },
]
const delayedCommitEvents = [
  { eventId: 'delayed-turn', sequence: 20, eventType: 'turn_started', display: { status: 'running' }, createdAt: at(5) },
  { eventId: 'delayed-tool-start', toolCallId: 'delayed-tool', sequence: 21, eventType: 'tool_started', display: { title: 'List directory', status: 'running' }, createdAt: at(6) },
  { eventId: 'delayed-tool-complete', toolCallId: 'delayed-tool', sequence: 22, eventType: 'tool_completed', display: { title: 'List directory', status: 'success' }, createdAt: at(7) },
  { eventId: 'delayed-result', sequence: 23, eventType: 'result', display: { status: 'success', toolUseCount: 1 }, createdAt: at(8) },
]
const delayedProjection = frontendExecution.executionEventsForMessage(delayedCommitEvents, delayedCommitMessages, 1)
assert.equal(delayedProjection.some(event => event.toolCallId === 'delayed-tool' && event.eventType === 'tool_completed'), true, '消息延迟落库时仍必须按 turn lifecycle 关联工具记录')
assert.equal(frontendExecution.formatExecutionDurationLong(272_000), '耗时 4 分 32 秒', '整轮任务必须展示中文可读耗时')
const transcriptSource = fs.readFileSync(new URL('../frontend/src/components/common/AgentExecutionTranscript.vue', import.meta.url), 'utf8')
assert.match(transcriptSource, /expandedRows/, '工具详情必须逐条独立展开')
assert.match(transcriptSource, /turnDurationLabel/, '执行流必须展示整轮耗时')
assert.match(transcriptSource, /executionSummaryItems/, '执行流标题必须按精确Agent阶段汇总')
assert.match(transcriptSource, /parallelAgentCount\.value >= 2 \? '并行执行'/, '只有两个以上真实执行中的同批Agent才可显示并行执行')
assert.match(transcriptSource, /等待 CCM 验收/, '等待验收必须与排队、启动和执行状态分开展示')
assert.match(transcriptSource, /运行了.*个工具/, '执行流标题必须使用明确的工具数量')
assert.match(transcriptSource, /tokenAccuracy/, '工具Token必须区分真实值和估算值')
assert.match(transcriptSource, /parallelToolCount/, '真实并发工具必须展示并行标识')
assert.match(transcriptSource, /cc-execution-timing/, '展开记录必须提供本轮耗时统计')
assert.doesNotMatch(transcriptSource, /<p v-if="event\.display\?\.summary">/, '工具行不得直接重复通用执行完成摘要')
assert.match(transcriptSource, /const transcriptExpanded = ref\(false\)/, '每条消息必须拥有独立执行记录展开状态')
assert.match(transcriptSource, /const stageMode = computed/, '真实会话必须支持阶段分组展示')
assert.match(transcriptSource, /const expandedStages = reactive/, '四个阶段必须能够独立收起与展开')
assert.match(transcriptSource, /const stageIsExpanded/, '四个阶段必须保留独立展开状态')
assert.match(transcriptSource, /emit\('open-file-change'/, '执行记录文件路径必须能打开权威Diff抽屉')
assert.match(transcriptSource, /查看 Diff/, '文件变化列表必须提供明确的Diff入口')
const completionRows = frontendExecution.completionFileChangesForRows([
  { eventType: 'agent_completed', detail: { fileChanges: [{ project: 'legacy', path: 'stale.ts' }] } },
  { eventType: 'result', detail: { fileChanges: [
    { project: 'api', path: 'src/shared.ts', additions: 7, deletions: 1 },
    { project: 'web', path: 'src/shared.ts', additions: 4, deletions: 2 },
    { project: 'api', path: 'src/shared.ts', additions: 7, deletions: 1 },
  ] } },
])
assert.equal(completionRows.length, 2, '文件投影必须按project+path去重且保留跨项目同名文件')
assert.equal(completionRows.some(file => file.project === 'legacy'), false, '终态文件集合存在时不得混入旧attempt文件')
const generationFenceMessages = [
  { role: 'user', content: '继续任务', timestamp: at(0) },
  { role: 'assistant', content: '正在继续', timestamp: at(4), taskId: 'generation-task' },
]
const generationFenceEvents = [
  { eventId: 'old-result', sequence: 1, eventType: 'result', generation: 1, taskId: 'generation-task', display: { status: 'success' }, detail: { fileChanges: [{ project: 'api', path: 'old.ts' }] }, createdAt: at(1) },
  { eventId: 'new-running', sequence: 2, eventType: 'agent_progress', generation: 2, taskId: 'generation-task', display: { status: 'running' }, createdAt: at(2) },
]
assert.equal(frontendExecution.hasTerminalExecutionForMessage(generationFenceEvents, generationFenceMessages, 1), false, '旧generation终态不得把当前恢复任务切换为完成态')
assert.equal(frontendExecution.completionFileChangesForRows(generationFenceEvents).some(file => file.path === 'old.ts'), false, '旧generation文件不得进入当前交付卡')
assert.doesNotMatch(transcriptSource, /executionTranscriptExpanded/, '执行记录不得继续共享全局展开布尔值')
const failedEvents = [
  ...conversationEvents.slice(0, 2),
  { eventId: 'turn-failed', sequence: 3, eventType: 'result', display: { status: 'failed' }, createdAt: at(3) },
]
assert.equal(frontendExecution.shouldRenderExecutionTranscript(failedEvents, conversationMessages, 1, false), true, '失败事件必须保留排障入口')
assert.match(replyStyle.CONVERSATIONAL_REPLY_STYLE_GUIDANCE, /两至三段短文或少量要点/)
for (const file of [
  'backend/agents/global/global-agent-run-projection.ts',
  'backend/modules/projects/project-main-agent.ts',
  'backend/modules/collaboration/group-orchestrator-llm.ts',
]) {
  assert.match(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), /CONVERSATIONAL_REPLY_STYLE_GUIDANCE/, `${file}必须使用共享普通对话回复风格`)
}
const projectMainSource = fs.readFileSync(new URL('../backend/modules/projects/project-main-agent.ts', import.meta.url), 'utf8')
assert.match(projectMainSource, /project-task:\$\{taskId\}:main-summary:started/, '项目主Agent必须在验收通过后投影最终总结开始事件')
assert.match(projectMainSource, /project-task:\$\{taskId\}:main-summary:completed/, '项目主Agent必须在Result前完成最终总结事件')
assert.match(projectMainSource, /unacceptedFileChanges/, '项目失败或阻塞时必须投影已产生的未验收改动')
const globalLoopSource = fs.readFileSync(new URL('../backend/agents/global/global-agent-loop-engine.ts', import.meta.url), 'utf8')
assert.match(globalLoopSource, /finalFileChanges/, '全局终态必须从Delivery Report投影最终文件集合')

fs.rmSync(root, { recursive: true, force: true })
console.log(JSON.stringify({
  pass: true,
  schema: events.USER_VISIBLE_AGENT_EVENT_SCHEMA,
  checks: {
    safeProjection: true,
    assistantProgressPersistedAndDeduplicated: true,
    providerTextAndToolCallsPreservedTogether: true,
    progressInterleavedWithCollapsibleBatches: true,
    ccStyleToolDisplayProjection: true,
    explicitTokenAndTimingSemantics: true,
    parallelAndBusinessSummaryDisplay: true,
    idempotentReplay: true,
    ephemeralDeltaNotPersisted: true,
    allScopeTextDeltaProjected: true,
    committedGroupCompactionProjected: true,
    allThreeScopesUseSharedComponent: true,
    ordinaryConversationHiddenByDefault: true,
    ordinaryConversationAvailableWithCtrlO: true,
    meaningfulExecutionShown: true,
    toolLifecycleCoalescedToLatestStatus: true,
    agentLifecycleCoalescedToLatestStatus: true,
    projectAgentIdentityVisible: true,
    staleAttemptCannotOverrideRetry: true,
    testAgentReworkHistoryCoalesced: true,
    mainAgentSummaryAfterVerification: true,
    stagedTotalDurationProjected: true,
    fileChangeOpensAuthoritativeDiff: true,
    diffBodyNotPersisted: true,
    delayedMessageCommitBoundToTurnLifecycle: true,
    perToolDetailExpansion: true,
    turnDurationVisible: true,
    failedExecutionShown: true,
    adaptiveConciseReplySharedAcrossScopes: true,
  },
}, null, 2))
