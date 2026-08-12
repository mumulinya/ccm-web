import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-task-stop-governance-'))
process.env.USERPROFILE = profile
process.env.HOME = profile
process.env.CCM_FEISHU_CONTROL_BOT_AUTO_START = '0'
const ccmDir = path.join(profile, '.cc-connect')
fs.mkdirSync(ccmDir, { recursive: true })
const now = new Date().toISOString()
fs.writeFileSync(path.join(ccmDir, 'tasks.json'), JSON.stringify([
  { id: 'stop-parent', title: '停止治理主任务', status: 'pending', revision: 1, generation: 1, auto_execute: false, child_task_ids: ['stop-child'], created_at: now, updated_at: now },
  { id: 'stop-child', title: '停止治理子任务', status: 'pending', revision: 1, generation: 1, auto_execute: false, parent_task_id: 'stop-parent', created_at: now, updated_at: now },
], null, 2))

const require = createRequire(import.meta.url)
const { startServer } = require('../ccm-package/dist/server.js')
const { loadTasks } = require('../ccm-package/dist/core/db.js')
const { closeSqliteTaskStore } = require('../ccm-package/dist/core/task-store.js')
const server = startServer(0)
let auth = null
const request = async (port, pathname, body) => {
  const headers = { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }
  if (auth?.cookie) headers.Cookie = auth.cookie
  if (body !== undefined && auth?.csrf) headers['X-CCM-CSRF'] = auth.csrf
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, body === undefined
    ? { headers }
    : { method: 'POST', headers, body: JSON.stringify(body) })
  return { response, data: await response.json().catch(() => ({})) }
}

try {
  await new Promise((resolve, reject) => {
    if (server.listening) return resolve()
    server.once('listening', resolve)
    server.once('error', reject)
  })
  const port = server.address().port
  await request(port, '/api/auth/session')
  const setupCode = fs.readFileSync(path.join(ccmDir, 'auth', 'setup-code.txt'), 'utf8').trim()
  const registration = await request(port, '/api/auth/register', { username: 'stop-admin', password: 'Stop-Admin-123!', setup_code: setupCode })
  assert.equal(registration.response.status, 201)
  auth = {
    cookie: String(registration.response.headers.get('set-cookie') || '').split(';')[0],
    csrf: registration.data.csrf || registration.data.session?.csrf,
  }

  const firstPreview = await request(port, '/api/tasks/cancel/preview', { task_id: 'stop-parent', expected_revision: 1, generation: 1 })
  assert.equal(firstPreview.response.ok, true, JSON.stringify(firstPreview.data))
  assert.equal(firstPreview.data.preview.impact.childTaskCount, 1)
  assert.equal(firstPreview.data.preview.canUndo, true)
  assert.equal(firstPreview.data.preview.recommendedCascade, 'descendants')

  const stopped = await request(port, '/api/tasks/cancel', {
    task_id: 'stop-parent', cascade: 'descendants', preview_token: firstPreview.data.preview.previewToken,
    expected_revision: firstPreview.data.preview.revision, generation: firstPreview.data.preview.generation,
  })
  assert.equal(stopped.response.ok, true, JSON.stringify(stopped.data))
  assert.equal(stopped.data.undoAvailable, true)
  assert.equal(loadTasks().find(task => task.id === 'stop-parent').status, 'cancelled')
  assert.equal(loadTasks().find(task => task.id === 'stop-child').status, 'cancelled')

  const undo = await request(port, '/api/tasks/cancel/undo', {
    task_id: 'stop-parent', expected_revision: stopped.data.task.revision,
    generation: stopped.data.task.generation || stopped.data.task.workflow_generation || 1,
  })
  assert.equal(undo.response.ok, true, JSON.stringify(undo.data))
  assert.equal(loadTasks().find(task => task.id === 'stop-parent').status, 'pending')
  assert.equal(loadTasks().find(task => task.id === 'stop-child').status, 'pending')

  const currentParent = loadTasks().find(task => task.id === 'stop-parent')
  const secondPreview = await request(port, '/api/tasks/cancel/preview', {
    task_id: 'stop-parent', cascade: 'task_only', expected_revision: currentParent.revision, generation: currentParent.generation || 1,
  })
  assert.equal(secondPreview.response.ok, true, JSON.stringify(secondPreview.data))
  assert.equal(secondPreview.data.preview.impact.childTaskCount, 0)
  const parentOnly = await request(port, '/api/tasks/cancel', {
    task_id: 'stop-parent', cascade: 'task_only', preview_token: secondPreview.data.preview.previewToken,
    expected_revision: secondPreview.data.preview.revision, generation: secondPreview.data.preview.generation,
  })
  assert.equal(parentOnly.response.ok, true, JSON.stringify(parentOnly.data))
  assert.equal(loadTasks().find(task => task.id === 'stop-parent').status, 'cancelled')
  assert.equal(loadTasks().find(task => task.id === 'stop-child').status, 'pending')

  const stale = await request(port, '/api/tasks/cancel/preview', { task_id: 'stop-child', expected_revision: 0, generation: 1 })
  assert.equal(stale.response.status, 409)
  assert.equal(stale.data.code, 'TASK_REVISION_CONFLICT')

  console.log(JSON.stringify({ pass: true, preview: true, cascade: true, taskOnly: true, undo: true, revisionFence: true }, null, 2))
} finally {
  await new Promise(resolve => server.close(resolve))
  closeSqliteTaskStore()
  try { fs.rmSync(profile, { recursive: true, force: true }) } catch {}
}
