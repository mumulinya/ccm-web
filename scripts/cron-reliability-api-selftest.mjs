import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-cron-reliability-'))
process.env.USERPROFILE = root
process.env.HOME = root
process.env.CCM_FEISHU_CONTROL_BOT_AUTO_START = '0'
const ccmDir = path.join(root, '.cc-connect')
fs.mkdirSync(ccmDir, { recursive: true })

const now = Date.now()
const tasks = [
  { id: 'task-failed', title: '失败后重试', status: 'failed', group_id: 'group-rel', target_project: 'missing-project', auto_execute: false, created_at: new Date(now - 60_000).toISOString(), updated_at: new Date(now - 30_000).toISOString(), cron_job_id: 'job-controls', cron_run_id: 'run-failed' },
  { id: 'task-active', title: '取消中的任务', status: 'pending', group_id: 'group-rel', target_project: 'missing-project', auto_execute: false, created_at: new Date(now - 60_000).toISOString(), updated_at: new Date(now - 30_000).toISOString(), cron_job_id: 'job-controls', cron_run_id: 'run-active' },
  { id: 'task-auto', title: '自动重试任务', status: 'failed', group_id: 'group-rel', target_project: 'missing-project', auto_execute: false, created_at: new Date(now - 120_000).toISOString(), updated_at: new Date(now - 60_000).toISOString(), cron_job_id: 'job-auto', cron_run_id: 'run-auto-parent' },
]
const jobs = [
  {
    id: 'job-controls', name: '可靠运行控制', target_type: 'group', group_id: 'group-rel', workflow_type: 'general', schedule: '0 9 * * *', prompt: '执行可靠性测试', enabled: false,
    timezone: 'Asia/Shanghai', retry_limit: 2, retry_interval_minutes: 1, misfire_policy: 'run_once', misfire_grace_minutes: 1440,
    notification_enabled: true, notify_on: ['cancelled'], run_count: 2,
    run_history: [
      { id: 'run-active', trigger: 'manual', attempt: 1, started_at: new Date(now - 30_000).toISOString(), status: 'queued', result: '等待执行', task_ids: ['task-active'], task_states: { 'task-active': { status: 'pending' } } },
      { id: 'run-failed', trigger: 'schedule', attempt: 1, started_at: new Date(now - 60_000).toISOString(), completed_at: new Date(now - 30_000).toISOString(), status: 'failed', result: '执行失败', task_ids: ['task-failed'], task_states: { 'task-failed': { status: 'failed' } } },
    ],
  },
  {
    id: 'job-misfire', name: '错过后跳过', target_type: 'project', project: 'missing-project', schedule: '* * * * *', prompt: '不应创建真实任务', enabled: true,
    timezone: 'Asia/Shanghai', retry_limit: 0, misfire_policy: 'skip', misfire_grace_minutes: 1440, next_run: new Date(now - 5 * 60_000).toISOString(), run_history: [], run_count: 0,
  },
  {
    id: 'job-crash', name: '启动恢复', target_type: 'project', project: 'missing-project', schedule: '0 9 * * *', prompt: '恢复中断记录', enabled: false,
    timezone: 'Asia/Shanghai', retry_limit: 0, run_history: [{ id: 'run-stale', trigger: 'schedule', started_at: new Date(now - 10 * 60_000).toISOString(), status: 'triggering', result: '正在创建任务', task_ids: [] }],
  },
  {
    id: 'job-auto', name: '自动失败重试', target_type: 'group', group_id: 'group-rel', workflow_type: 'general', schedule: '0 9 * * *', prompt: '自动重试失败任务', enabled: true,
    timezone: 'Asia/Shanghai', retry_limit: 1, retry_interval_minutes: 1, misfire_policy: 'run_once', next_run: new Date(now + 60 * 60_000).toISOString(),
    run_history: [{ id: 'run-auto-parent', trigger: 'schedule', attempt: 1, started_at: new Date(now - 120_000).toISOString(), completed_at: new Date(now - 60_000).toISOString(), status: 'retry_waiting', result: '等待自动重试', next_retry_at: new Date(now - 1000).toISOString(), task_ids: ['task-auto'], task_states: { 'task-auto': { status: 'failed' } } }],
  },
]
fs.writeFileSync(path.join(ccmDir, 'tasks.json'), JSON.stringify(tasks, null, 2))
fs.writeFileSync(path.join(ccmDir, 'cron-jobs.json'), JSON.stringify(jobs, null, 2))

const require = createRequire(import.meta.url)
const { startServer } = require('../ccm-package/dist/server.js')
const server = startServer(0)

const request = async (port, pathname, body) => {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, body === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await response.json().catch(() => ({}))
  return { response, data }
}

try {
  await new Promise((resolve, reject) => {
    if (server.listening) return resolve()
    server.once('listening', resolve)
    server.once('error', reject)
  })
  const port = server.address().port
  await new Promise(resolve => setTimeout(resolve, 700))

  let list = (await request(port, '/api/cron')).data
  const misfire = list.jobs.find(job => job.id === 'job-misfire')
  const crash = list.jobs.find(job => job.id === 'job-crash')
  const autoRetry = list.jobs.find(job => job.id === 'job-auto')
  assert.equal(misfire.run_history[0].status, 'skipped')
  assert.equal(misfire.run_history[0].trigger, 'recovery')
  assert.equal(crash.run_history[0].status, 'failed')
  assert.equal(crash.run_history[0].recovered_after_restart, true)
  assert.equal(autoRetry.run_history.some(run => run.parent_run_id === 'run-auto-parent' && run.attempt === 2), true)

  const created = await request(port, '/api/cron/create', { name: '时区与通知配置', target_type: 'project', project: 'demo', schedule: '0 9 * * *', prompt: '执行检查', enabled: false, timezone: 'UTC', retry_limit: 4, retry_interval_minutes: 15, misfire_policy: 'run_once', misfire_grace_minutes: 60, notification_enabled: true, notify_on: ['failed', 'done'] })
  assert.equal(created.response.ok, true)
  assert.equal(created.data.job.timezone, 'UTC')
  assert.equal(created.data.job.retry_limit, 4)
  assert.deepEqual(created.data.job.notify_on, ['failed', 'done'])

  const invalid = await request(port, '/api/cron/update', { id: created.data.job.id, timezone: 'Mars/Base' })
  assert.equal(invalid.response.status, 400)

  const retried = await request(port, '/api/cron/run/retry', { job_id: 'job-controls', run_id: 'run-failed' })
  assert.equal(retried.response.ok, true)
  assert.equal(retried.data.run.parent_run_id, 'run-failed')
  assert.equal(retried.data.run.attempt, 2)

  const cancelled = await request(port, '/api/cron/run/cancel', { job_id: 'job-controls', run_id: 'run-active' })
  assert.equal(cancelled.response.ok, true)
  assert.equal(cancelled.data.run.status, 'cancelled')
  await new Promise(resolve => setTimeout(resolve, 100))
  const savedTasks = JSON.parse(fs.readFileSync(path.join(ccmDir, 'tasks.json'), 'utf8'))
  assert.equal(savedTasks.find(task => task.id === 'task-active').status, 'cancelled')

  list = (await request(port, '/api/cron')).data
  const controls = list.jobs.find(job => job.id === 'job-controls')
  assert.equal(controls.run_history.some(run => run.parent_run_id === 'run-failed' && run.attempt === 2), true)
  assert.equal(['failed', 'sending'].includes(controls.run_history.find(run => run.id === 'run-active').notifications?.cancelled?.status), true)

  console.log(JSON.stringify({ pass: true, port, misfire: misfire.run_history[0].status, crashRecovery: crash.run_history[0].status, automaticRetry: true, retryAttempt: retried.data.run.attempt, cancelledTask: 'task-active' }, null, 2))
} finally {
  await new Promise(resolve => server.close(() => resolve()))
  fs.rmSync(root, { recursive: true, force: true })
}
