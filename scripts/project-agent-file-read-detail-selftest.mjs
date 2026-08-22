import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const kernel = require('../ccm-package/dist/agents/execution-kernel.js')
const sourceDetail = require('../ccm-package/dist/system/event-file-source.js')
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-project-agent-source-detail-'))
const taskId = `source-detail-${process.pid}-${Date.now()}`
const content = 'line one\nline two\nline three\n'

try {
  fs.writeFileSync(path.join(root, 'README.md'), content, 'utf8')
  const task = { id: taskId, title: 'source detail selftest', target_project: 'project-a' }
  const execution = kernel.ensureExecution({ task, project: 'project-a', agent: 'codex', workDir: root, executionId: taskId })
  kernel.attachExecutionWorkspace(execution.id, { mode: 'worktree', originalWorkDir: root, worktreePath: root })
  const event = {
    schema: 'ccm-user-visible-agent-event-v1', eventId: 'event-read', sequence: 1, eventType: 'tool_completed',
    scope: 'project', scopeId: 'project-a', exactSessionId: 'session-a', generation: 1, attempt: 1,
    taskId, workItemId: 'work-a', agentRunId: 'agent-run-a', toolCallId: 'tool-read-a', toolName: 'run_command',
    display: { title: '读取文件', status: 'success' },
    detail: { fileReadEvidence: { project: 'project-a', path: 'README.md', ranges: [{ start: 2, end: 3 }], checksum: crypto.createHash('sha256').update(content).digest('hex'), source: 'safe_command_inference', contentStored: false } },
  }
  const first = sourceDetail.projectEventFileSource(event, 'project-a')
  assert.equal(first.freshness, 'current')
  assert.equal(first.sourceFreshness, 'active_worktree')
  assert.deepEqual(first.lines, [{ line: 2, text: 'line two' }, { line: 3, text: 'line three' }])
  fs.writeFileSync(path.join(root, 'README.md'), `${content}changed\n`, 'utf8')
  const drifted = sourceDetail.projectEventFileSource(event, 'project-a')
  assert.equal(drifted.freshness, 'drifted')
  assert.throws(() => sourceDetail.projectEventFileSource({ ...event, detail: { fileReadEvidence: { ...event.detail.fileReadEvidence, path: '../secret.txt' } } }, 'project-a'), /超出项目边界/)
  assert.throws(() => sourceDetail.projectEventFileSource({ ...event, detail: { fileReadEvidence: { ...event.detail.fileReadEvidence, path: '.env' } } }, 'project-a'), /敏感文件/)
  assert.equal(JSON.stringify(first).includes('contentStored":false'), true)
  console.log(JSON.stringify({ pass: true, schema: 'ccm-project-agent-file-read-detail-selftest-v1' }, null, 2))
} finally {
  try { kernel.purgeTaskExecutionArtifacts(taskId) } catch {}
  fs.rmSync(root, { recursive: true, force: true })
}
