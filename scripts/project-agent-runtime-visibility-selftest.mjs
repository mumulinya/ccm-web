import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-project-agent-runtime-visibility-'))
process.env.CCM_USER_VISIBLE_AGENT_EVENT_DIR = root

const require = createRequire(import.meta.url)
const visible = require('../ccm-package/dist/system/user-visible-agent-events.js')
const runtime = require('../ccm-package/dist/agents/runtime-structured-events.js')
const progress = require('../ccm-package/dist/system/agent-runtime-progress.js')

const identity = {
  taskId: 'task-runtime-visible',
  workItemId: 'work-runtime-visible',
  scope: 'project',
  scopeId: 'demo',
  exactSessionId: 'session-runtime-visible',
  anchorMessageId: 'message-runtime-visible',
  agentRunId: 'agent-run-runtime-visible',
  generation: 0,
  attempt: 26,
  leaseId: 'lease-runtime-visible',
  project: 'demo',
}

visible.appendUserVisibleAgentEvent({
  ...identity,
  attempt: 25,
  eventId: 'old-attempt-result',
  eventType: 'result',
  display: { title: '旧执行失败', status: 'failed' },
})

const parser = runtime.createAgentRuntimeStructuredEventParser({
  runtime: 'codex',
  runtimeVersion: 'fixture',
  identity,
  onEvent: progress.projectAgentRuntimeStructuredEvent,
})

const lines = [
  { type: 'item.completed', item: { id: 'message-1', type: 'agent_message', text: '我先运行构建，再根据结果继续检查。' } },
  { type: 'item.started', item: { id: 'command-1', type: 'command_execution', command: 'npm run build', status: 'in_progress' } },
  { type: 'item.completed', item: { id: 'command-1', type: 'command_execution', command: 'npm run build', status: 'completed', exit_code: 0 } },
  { type: 'item.started', item: { id: 'mcp-1', type: 'mcp_tool_call', server: 'ccm_workspace_readonly', tool: 'read_file', arguments: { path: 'README.md', api_key: 'RUNTIME_SECRET_SENTINEL' }, status: 'in_progress' } },
  { type: 'item.completed', item: { id: 'mcp-1', type: 'mcp_tool_call', server: 'ccm_workspace_readonly', tool: 'read_file', arguments: { path: 'README.md', api_key: 'RUNTIME_SECRET_SENTINEL' }, status: 'completed' } },
  { type: 'item.started', item: { id: 'mcp-batch-1', type: 'mcp_tool_call', server: 'ccm_workspace_readonly', tool: 'read_files', arguments: { paths: [{ path: 'package.json', offset: 1, limit: 20 }, 'README.md'] }, status: 'in_progress' } },
  { type: 'item.completed', item: { id: 'mcp-batch-1', type: 'mcp_tool_call', server: 'ccm_workspace_readonly', tool: 'read_files', arguments: { paths: [{ path: 'package.json', offset: 1, limit: 20 }, 'README.md'] }, status: 'completed' } },
  { type: 'item.started', item: { id: 'command-read-1', type: 'command_execution', command: 'Get-Content package.json', status: 'in_progress' } },
  { type: 'item.completed', item: { id: 'command-read-1', type: 'command_execution', command: 'Get-Content package.json', status: 'completed', exit_code: 0, duration_ms: 25 } },
  { type: 'item.started', item: { id: 'command-pipe-1', type: 'command_execution', command: 'cat README.md | findstr CCM', status: 'in_progress' } },
  { type: 'item.completed', item: { id: 'command-pipe-1', type: 'command_execution', command: 'cat README.md | findstr CCM', status: 'completed', exit_code: 0 } },
  { type: 'item.completed', item: { id: 'message-final', type: 'agent_message', text: '构建和文件核对已经完成。' } },
  { type: 'turn.completed', usage: { input_tokens: 100, output_tokens: 20 } },
]
for (const line of lines) parser.push(`${JSON.stringify(line)}\n`)
parser.flush()

const listed = visible.listUserVisibleAgentEvents({
  scope: identity.scope,
  scopeId: identity.scopeId,
  exactSessionId: identity.exactSessionId,
  cursor: 0,
  limit: 100,
}).events
const toolRows = listed.filter(event => String(event.eventType).startsWith('tool_'))
const progressRows = listed.filter(event => event.eventType === 'assistant_progress')

assert.equal(toolRows.length, 5, '工具开始和结束必须原位合并为五个真实调用')
assert.equal(new Set(toolRows.map(event => event.toolCallId)).size, 5)
assert.equal(toolRows.every(event => event.eventType === 'tool_completed'), true)
assert.equal(toolRows.some(event => event.toolName === 'run_command' && event.display?.title === '运行项目命令' && event.display?.target === 'npm run build'), true)
assert.equal(toolRows.some(event => event.toolName === 'mcp__ccm__ccm_workspace_readonly__read_file' && event.display?.title === '读取文件' && event.display?.target === 'README.md'), true)
const batchRead = toolRows.find(event => event.toolCallId === 'mcp-batch-1')
assert.equal(batchRead?.display?.title, '批量读取文件')
assert.equal(batchRead?.detail?.safeArguments?.project_id, 'demo')
assert.deepEqual(batchRead?.detail?.safeArguments?.paths, [{ path: 'package.json', offset: 1, limit: 20 }, 'README.md'])
assert.equal(batchRead?.detail?.toolDisplay?.result?.rows?.length, 2)
const inferredRead = toolRows.find(event => event.toolCallId === 'command-read-1')
assert.equal(inferredRead?.toolName, 'run_command', '命令原始身份必须保留')
assert.equal(inferredRead?.display?.title, '读取文件', '安全纯读取命令应投影为读取文件')
assert.equal(inferredRead?.display?.target, 'package.json')
assert.deepEqual(inferredRead?.detail?.fileReadEvidence, { project: 'demo', path: 'package.json', ranges: [{ start: 1, end: 2000 }], source: 'safe_command_inference', contentStored: false })
assert.equal(inferredRead?.detail?.toolDisplay?.sensitiveCommand, 'Get-Content package.json', '读取文件主投影应保留脱敏技术命令')
const pipedCommand = toolRows.find(event => event.toolCallId === 'command-pipe-1')
assert.equal(pipedCommand?.display?.title, '运行项目命令', '含管道命令不得推断为纯读取')
assert.equal(pipedCommand?.detail?.fileReadEvidence, undefined)
assert.equal(pipedCommand?.detail?.toolDisplay?.sensitiveCommand, 'cat README.md | findstr CCM')
assert.equal(pipedCommand?.detail?.toolDisplay?.result?.commandExecution?.exitCode, 0)
assert.equal(toolRows.every(event => event.detail?.toolDisplay?.schema === 'ccm-tool-display-detail-v1'), true)
assert.equal(progressRows.length, 1, '新attempt的关键文本不得被旧attempt终态过滤')
assert.equal(progressRows[0].attempt, 26)
assert.match(progressRows[0].detail?.progress?.text || '', /先运行构建/)
assert.equal(progressRows.some(event => String(event.detail?.progress?.text || '').includes('已经完成')), false, '最终Agent结论不得重复成为运行进展')
assert.equal(JSON.stringify(listed).includes('RUNTIME_SECRET_SENTINEL'), false)
assert.equal(JSON.stringify(listed).includes('command_execution'), false)
assert.equal(JSON.stringify(listed).includes('mcp_tool_call'), false)

fs.rmSync(root, { recursive: true, force: true })
console.log(JSON.stringify({ pass: true, schema: 'ccm-project-agent-runtime-visibility-selftest-v1' }, null, 2))
