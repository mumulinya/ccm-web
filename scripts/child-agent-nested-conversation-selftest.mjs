import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  liveAssistantProvisionalText,
  latestAssistantProgressText,
} from '../frontend/src/utils/agentExecutionEvents.js'
import {
  childAgentCardTitle,
  displayedChildAgentDialogue,
  isChildAgentDialogueProgress,
  nestChildAgentConversation,
} from '../frontend/src/utils/nestChildAgentConversation.js'

const at = offset => new Date(Date.UTC(2026, 7, 14, 16, 0, offset)).toISOString()

const mainProgress = (id, text, sequence) => ({
  eventId: id,
  sequence,
  eventType: 'assistant_progress',
  display: { status: 'running', summary: text },
  detail: { progress: { kind: 'before_tools', text } },
  createdAt: at(sequence),
  anchorMessageId: 'a1',
})

const childProgress = (id, runId, text, sequence) => ({
  eventId: id,
  sequence,
  eventType: 'assistant_progress',
  agentRunId: runId,
  parentEventId: runId,
  display: { status: 'running', summary: text },
  detail: { progress: { kind: 'key_finding', text, source: 'runtime_structured' } },
  createdAt: at(sequence),
  anchorMessageId: 'a1',
})

const childAgent = (runId, project, sequence, extra = {}) => ({
  eventId: `agent:${runId}`,
  sequence,
  eventType: extra.eventType || 'agent_started',
  agentRunId: runId,
  display: { status: extra.status || 'running', title: `${project} · Codex`, summary: extra.summary || '正在执行' },
  detail: {
    agentDisplay: {
      projectId: project,
      projectName: project,
      runtimeLabel: extra.runtimeLabel || 'Codex',
      workItemTitle: extra.workItemTitle || '改登录页',
      phase: extra.phase || 'executing',
      attempt: 1,
    },
    executionStage: { kind: extra.stageKind || 'project_execution' },
    fileChanges: extra.fileChanges || [{ path: 'src/login.vue', status: '修改' }],
  },
  createdAt: at(sequence),
  generation: 1,
  anchorMessageId: 'a1',
})

const childTool = (id, runId, name, sequence) => ({
  eventId: id,
  sequence,
  eventType: 'tool_completed',
  toolCallId: id,
  toolName: name,
  agentRunId: runId,
  parentEventId: runId,
  display: { status: 'success', title: name },
  createdAt: at(sequence),
  anchorMessageId: 'a1',
})

const user = { role: 'user', content: '帮我改登录页', timestamp: at(0) }
const liveAssistant = { role: 'assistant', content: '', streaming: true, timestamp: at(1), id: 'a1' }

const rows = [
  { eventId: 'turn', sequence: 1, eventType: 'turn_started', display: { status: 'running' }, createdAt: at(1), anchorMessageId: 'a1' },
  mainProgress('main-1', '我先把登录页交给「shop」去做。', 2),
  childAgent('run-shop', 'shop', 3),
  childProgress('child-1', 'run-shop', '已改好登录页，正在跑构建。', 4),
  childTool('tool-1', 'run-shop', 'apply_patch', 5),
  childProgress('child-2', 'run-shop', '构建过了，接着补测试。', 6),
  childAgent('run-pay', 'pay', 7, { fileChanges: [{ path: 'src/pay.ts', status: '修改' }] }),
  childProgress('child-pay', 'run-pay', '正在改支付回调。', 8),
  {
    eventId: 'agent:summary',
    sequence: 9,
    eventType: 'agent_started',
    agentRunId: 'task-main-summary:task-1',
    display: { status: 'running', title: '项目主 Agent' },
    detail: {
      agentDisplay: { projectId: '', projectName: '', runtimeLabel: '项目主 Agent', phase: 'executing', attempt: 1 },
      executionStage: { kind: 'main_agent_summary' },
    },
    createdAt: at(9),
    anchorMessageId: 'a1',
  },
]

const nested = nestChildAgentConversation(rows)
const shop = nested.find(event => event.__childAgentConversation && event.agentRunId === 'run-shop')
const pay = nested.find(event => event.__childAgentConversation && event.agentRunId === 'run-pay')
const summary = nested.find(event => event.agentRunId === 'task-main-summary:task-1')

assert.ok(shop, 'shop 项目必须收成嵌套卡')
assert.ok(pay, 'pay 项目必须收成另一张卡')
assert.ok(summary && !summary.__childAgentConversation, '主 Agent 总结行不得收成子 Agent 卡')
assert.equal(childAgentCardTitle(shop), 'shop')
assert.equal(childAgentCardTitle(pay), 'pay')
assert.deepEqual(shop.dialogue.map(line => line.text), ['已改好登录页，正在跑构建。', '构建过了，接着补测试。'])
assert.equal(pay.dialogue[0].text, '正在改支付回调。')
assert.equal(shop.tools.length, 1)
assert.equal(shop.tools[0].toolName, 'apply_patch')
assert.equal(shop.files[0].path, 'src/login.vue')
assert.equal(nested.filter(event => event.eventType === 'assistant_progress').length, 1, '主 Agent 进度必须留在卡外')
assert.equal(nested.find(event => event.eventType === 'assistant_progress')?.detail?.progress?.text, '我先把登录页交给「shop」去做。')
assert.equal(nested.some(event => event.toolName === 'apply_patch' && !event.__childAgentConversation), false, '子 Agent 工具不得平铺在主列表')
const testAgent = nestChildAgentConversation([
  childAgent('run-test', 'shop', 1, { runtimeLabel: 'TestAgent', stageKind: 'independent_verification', fileChanges: [] }),
  childProgress('test-1', 'run-test', '正在核对登录验收。', 2),
])
assert.equal(childAgentCardTitle(testAgent.find(event => event.__childAgentConversation)), 'TestAgent · shop')

const lifecycle = nestChildAgentConversation([
  childAgent('run-lifecycle', 'shop', 1, { fileChanges: [] }),
  {
    ...childTool('tool-start-event', 'run-lifecycle', 'command_execution', 2),
    eventType: 'tool_started',
    toolCallId: 'same-command',
    display: { status: 'running', title: 'command_execution' },
  },
  {
    ...childTool('tool-complete-event', 'run-lifecycle', 'command_execution', 3),
    toolCallId: 'same-command',
    display: { status: 'success', title: 'command_execution', target: 'npm test' },
  },
  childAgent('run-lifecycle', 'shop', 4, { eventType: 'agent_progress', summary: '构建已完成，正在核对测试结果。', fileChanges: [] }),
])
const lifecycleCard = lifecycle.find(event => event.__childAgentConversation)
assert.equal(lifecycleCard.tools.length, 1, '同一toolCallId的开始与完成必须合并成一次工具调用')
assert.equal(lifecycleCard.tools[0].eventType, 'tool_completed')
assert.equal(lifecycleCard.timeline.filter(item => item.kind === 'tool').length, 1)
assert.equal(lifecycleCard.dialogue.some(item => item.text === '构建已完成，正在核对测试结果。'), true, '安全的agent_progress必须补入子Agent文本')

const unsafe = nestChildAgentConversation([
  childAgent('run-bad', 'shop', 1, { fileChanges: [] }),
  {
    eventId: 'json',
    sequence: 2,
    eventType: 'assistant_progress',
    agentRunId: 'run-bad',
    parentEventId: 'run-bad',
    display: { summary: '{"CCM_AGENT_RECEIPT":true}' },
    detail: { progress: { text: '{"CCM_AGENT_RECEIPT":true}', source: 'runtime_structured' } },
  },
])
assert.equal(unsafe.find(event => event.__childAgentConversation)?.dialogue.length, 0, '回执 JSON 不得进对话')

const many = Array.from({ length: 10 }, (_, index) => childProgress(`p${index}`, 'run-shop', `进度 ${index + 1}`, 10 + index))
const liveLines = displayedChildAgentDialogue({ dialogue: many.map(event => ({ eventId: event.eventId, text: event.detail.progress.text })) }, { live: true })
const replayLines = displayedChildAgentDialogue({ dialogue: many.map(event => ({ eventId: event.eventId, text: event.detail.progress.text })) }, { live: false })
assert.equal(liveLines.length, 8)
assert.equal(liveLines[0].text, '进度 3')
assert.equal(replayLines.length, 10)

assert.equal(isChildAgentDialogueProgress(childProgress('x', 'run-shop', '已改好登录页，正在跑构建。', 1)), true)
assert.equal(isChildAgentDialogueProgress(mainProgress('y', '我先定位相关代码。', 1)), false)

const liveMessages = [user, liveAssistant]
assert.equal(latestAssistantProgressText(rows, liveMessages, 1), '我先把登录页交给「shop」去做。')
assert.equal(liveAssistantProvisionalText(rows, liveMessages, 1), '', '主 Agent 短句进交错过程，不覆盖气泡，也不改成子 Agent 短句')

const noChildProgress = rows.filter(event => event.eventId !== 'child-1' && event.eventId !== 'child-2' && event.eventId !== 'child-pay')
assert.equal(liveAssistantProvisionalText(noChildProgress, liveMessages, 1), '')

const root = process.cwd()
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const transcript = read('frontend/src/components/common/AgentExecutionTranscript.vue')
const card = read('frontend/src/components/common/ChildAgentConversation.vue')
assert.match(transcript, /ChildAgentConversation/)
assert.match(transcript, /nestChildAgentConversation/)
assert.match(transcript, /childAgentCardExpanded/)
assert.match(transcript, /__childAgentConversation/)
assert.match(transcript, /return isLivePresentation.value \|\| String\(event\?\.display\?\.status \|\| ''\) === 'failed'/)
assert.doesNotMatch(transcript, /executionDensityOptions/)
assert.match(card, /cc-child-agent-line/)
assert.match(card, /toolsToggleLabel/)
assert.match(transcript, /sourceTimeline/)
assert.match(transcript, /__childAgentProgress/)
assert.match(transcript, /command_execution: '运行命令'/)

console.log(JSON.stringify({
  pass: true,
  schema: 'ccm-child-agent-nested-conversation-selftest-v1',
}, null, 2))
