import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-command-live-progress-'))
process.env.CCM_TASK_COMMAND_RUN_DIR = path.join(root, 'runs')
const require = createRequire(import.meta.url)
const events = require('../ccm-package/dist/system/user-visible-agent-events.js')
const runtime = require('../ccm-package/dist/integrations/task-command-runtime.js')
const seen = []
const unsubscribe = events.subscribeUserVisibleAgentEvents(event => {
  if (event.eventType === 'tool_progress' && event.exactSessionId === 'session-live-command-test') seen.push(event)
})

try {
  const context = {
    schema: 'ccm-internal-mcp-task-context-v1',
    taskId: 'task-live-command-test', groupId: '', project: 'demo', projectSessionId: 'session-live-command-test',
    role: 'test-agent', workDir: root, baseWorkDir: root,
    communicationGeneration: 3, communicationAttempt: 2, anchorMessageId: 'message-live-command-test',
    issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString(),
  }
  const script = `console.log('Compiled 328 modules'); console.log('API_TOKEN=secret-value'); console.log(${JSON.stringify(path.join(root, 'private.log'))})`
  const result = await runtime.runTaskBoundCommand(context, {
    command: `"${process.execPath}" -e ${JSON.stringify(script)}`,
    description: '运行项目构建', timeout_ms: 20_000,
  })
  assert.equal(result.success, true)
  assert.ok(seen.length >= 2, '长命令必须发送运行进度和终态更新')
  assert.equal(seen.every(event => event.eventId === seen[0].eventId && event.toolCallId === seen[0].toolCallId), true, '长命令必须使用稳定事件和工具调用身份原位更新')
  const serialized = JSON.stringify(seen)
  assert.equal(serialized.includes('secret-value'), false, '公开进度不得包含密钥')
  assert.equal(serialized.includes(root), false, '公开进度不得包含绝对路径')
  assert.equal(events.listUserVisibleAgentEvents({ scope: 'project', scopeId: 'demo', exactSessionId: 'session-live-command-test' }).events.length, 0, '实时命令进度不得持久化')
  console.log(JSON.stringify({ pass: true, updates: seen.map(event => event.detail?.liveProgress), contentStored: false }, null, 2))
} finally {
  unsubscribe()
  fs.rmSync(root, { recursive: true, force: true })
}
