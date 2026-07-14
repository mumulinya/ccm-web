import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-cron-run-api-'))
process.env.USERPROFILE = root
process.env.HOME = root
process.env.CCM_FEISHU_CONTROL_BOT_AUTO_START = '0'
const ccmDir = path.join(root, '.cc-connect')
const artifactDir = path.join(ccmDir, 'test-agent-artifacts', 'run-api-test')
fs.mkdirSync(artifactDir, { recursive: true })

const task = {
  id: 'task-api-test', title: '定时任务接口闭环验证', status: 'in_progress', status_detail: '群聊主 Agent 正在验收',
  group_id: 'group-api-test', target_project: 'coordinator', workflow_type: 'daily_dev', cron_job_id: 'job-api-test',
  cron_run_id: 'run-api-test', trace_id: 'trace-api-test', created_at: '2026-07-13T01:00:00.000Z', updated_at: '2026-07-13T01:02:00.000Z',
  delivery_summary: { headline: '主 Agent 正在验收交付结果', detail: '项目子 Agent 已返回修改。用户本地执行: cd C:\\private && git add .', acceptance_gate_passed: false }
}
const job = {
  id: 'job-api-test', name: '接口闭环验证', target_type: 'group', group_id: 'group-api-test', workflow_type: 'daily_dev',
  schedule: '0 9 * * *', prompt: '执行测试任务', enabled: false, run_count: 1, last_run: '2026-07-13T01:00:00.000Z',
  last_status: 'running_task', last_result: '任务正在验收', last_task_id: task.id, last_task_ids: [task.id],
  run_history: [{ id: 'run-api-test', trigger: 'manual', started_at: '2026-07-13T01:00:00.000Z', status: 'running_task', result: '任务正在验收', task_ids: [task.id], primary_task_id: task.id, task_states: { [task.id]: { status: 'in_progress', result: '主 Agent 计划：内部调度内容' } }, meta: {} }]
}
fs.writeFileSync(path.join(ccmDir, 'tasks.json'), JSON.stringify([task], null, 2))
fs.writeFileSync(path.join(ccmDir, 'cron-jobs.json'), JSON.stringify([job], null, 2))
fs.writeFileSync(path.join(artifactDir, 'page.png'), Buffer.from('89504e470d0a1a0a', 'hex'))
fs.writeFileSync(path.join(artifactDir, 'report.json'), JSON.stringify({ id: 'test-run-api', taskId: task.id, groupId: task.group_id, status: 'passed', recommendation: 'accept', summary: '真实浏览器流程通过', startedAt: '2026-07-13T01:01:00.000Z', finishedAt: '2026-07-13T01:02:00.000Z' }))
fs.writeFileSync(path.join(artifactDir, 'artifact-manifest.json'), JSON.stringify({ files: [{ type: 'screenshot', title: '页面截图', path: 'page.png', status: 'passed' }] }))

const require = createRequire(import.meta.url)
const { startServer } = require('../ccm-package/dist/server.js')
const server = startServer(0)

try {
  await new Promise((resolve, reject) => {
    if (server.listening) return resolve()
    server.once('listening', resolve)
    server.once('error', reject)
  })
  const address = server.address()
  const response = await fetch(`http://127.0.0.1:${address.port}/api/cron`)
  assert.equal(response.ok, true)
  const payload = await response.json()
  const publicTask = payload.jobs?.[0]?.run_history?.[0]?.tasks?.[0]
  assert.equal(publicTask.id, task.id)
  assert.equal(publicTask.todo.total, 5)
  assert.equal(publicTask.test_agent.status, 'passed')
  assert.equal(publicTask.test_agent.screenshot_count, 1)
  assert.equal(publicTask.test_agent.evidence_count, 1)
  assert.equal(publicTask.replay_available, true)
  assert.equal(JSON.stringify(payload).includes(root), false)
  assert.equal(JSON.stringify(publicTask).includes('git add'), false)
  assert.equal(JSON.stringify(payload.jobs[0].run_history[0].task_states).includes('内部调度内容'), false)
  console.log(JSON.stringify({ pass: true, runId: payload.jobs[0].run_history[0].id, todoSteps: publicTask.todo.total, screenshots: publicTask.test_agent.screenshot_count }, null, 2))
} finally {
  await new Promise(resolve => server.close(() => resolve()))
  fs.rmSync(root, { recursive: true, force: true })
}
