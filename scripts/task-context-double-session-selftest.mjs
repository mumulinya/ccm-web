#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-task-context-'))
process.env.USERPROFILE = temp
process.env.HOME = temp
process.env.CCM_USER_VISIBLE_AGENT_EVENT_DIR = path.join(temp, 'events')
const require = createRequire(import.meta.url)
const db = require(path.join(root, 'ccm-package', 'dist', 'core', 'db.js'))
const context = require(path.join(root, 'ccm-package', 'dist', 'tasks', 'task-context.js'))

const make = (id, session, goal) => ({
  id,
  title: goal,
  description: goal,
  business_goal: goal,
  target_project: 'demo',
  group_id: 'group-1',
  group_session_id: session,
  exact_session_id: session,
  origin_session_id: session,
  status: 'failed',
  revision: 1,
  work_items: [{ id: `${id}-wi`, target: 'demo', files: [`src/${id}.ts`], status: 'failed', attempt: 1 }],
  allowed_paths: [`src/${id}.ts`],
  acceptance_criteria: ['通过验证'],
  conversation_permission_snapshot: { checksum: `perm-${id}` },
})

const a = make('task-a', 'gcs-source', '添加登录功能')
const b = make('task-b', 'gcs-source', '添加导出功能')
a.task_context = context.buildTaskContextCapsule(a)
b.task_context = context.buildTaskContextCapsule(b)
db.saveTasks([a, b])

const aUpdated = context.addTaskFileEvidence('task-a', {
  evidenceId: 'evidence-a', project: 'demo', path: 'src/task-a.ts', checksum: 'sha-a',
  readRanges: [{ start: 1, end: 10 }], purpose: 'inspect', workItemIds: ['task-a-wi'],
})
assert.equal(aUpdated.task_context.fileEvidence.length, 1)
assert.equal(aUpdated.task_context.fileEvidence[0].path, 'src/task-a.ts')
assert.equal(aUpdated.task_context.fileEvidence[0].contentStored, false)
assert.equal((db.getTaskById('task-b')).task_context.fileEvidence.length, 0)
assert.notEqual(aUpdated.task_context.checksum, b.task_context.checksum)

const projection = context.projectTaskContext(aUpdated)
assert.equal(projection.taskId, 'task-a')
assert.equal(projection.sourceSessionId, 'gcs-source')
assert.equal(projection.contentStored, false)
assert.equal(JSON.stringify(projection).includes('登录功能'), false)

console.log(JSON.stringify({ pass: true, checks: {
  taskContextsAreIndependent: true,
  fileEvidenceIsMetadataOnly: true,
  sourceSessionIsRetained: true,
  safeProjectionOmitsContent: true,
}}))
