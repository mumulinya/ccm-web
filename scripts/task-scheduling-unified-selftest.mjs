import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-task-scheduling-'))
process.env.USERPROFILE = root
process.env.HOME = root
process.env.CCM_FEISHU_CONTROL_BOT_AUTO_START = '0'
fs.mkdirSync(path.join(root, '.cc-connect'), { recursive: true })

try {
  const { renderTaskTemplate } = await import('../ccm-package/dist/modules/collaboration/task-templates.js')
  const { normalizeCronJob, cronOccurrenceId } = await import('../ccm-package/dist/modules/scheduling/cron-job-store.js')
  const { previewCronSchedule, cronFailureDecision, occurrenceSlot } = await import('../ccm-package/dist/modules/scheduling/cron-control-plane.js')

  const template = {
    schema: 'ccm-task-template-v1', id: 'template-1', name: '接口开发',
    title: '为 {{project}} 增加 {{feature}}', instructions: '实现 {{feature}}，并完成构建验证。',
    priority: 'normal', variables: [
      { key: 'project', label: '项目', required: true },
      { key: 'feature', label: '功能', required: true },
    ], createdBy: 'user-1', revision: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }
  const missing = renderTaskTemplate(template, { project: 'demo' })
  assert.equal(missing.valid, false)
  assert.deepEqual(missing.missing, ['feature'])
  const rendered = renderTaskTemplate(template, { project: 'demo', feature: '订单查询接口' })
  assert.equal(rendered.valid, true)
  assert.equal(rendered.title, '为 demo 增加 订单查询接口')

  const job = normalizeCronJob({ id: 'cron-1', name: '每日检查', project: 'demo', schedule: '0 9 * * *', prompt: '检查项目', timezone: 'Asia/Shanghai' })
  assert.equal(job.overlap_policy, 'queue')
  assert.equal(job.misfire_policy, 'run_once')
  assert.equal(job.catch_up_limit, 5)
  assert.equal(job.consecutive_failure_limit, 3)
  const preview = previewCronSchedule(job, 5, new Date('2026-08-11T00:00:00.000Z'))
  assert.equal(preview.nextRuns.length, 5)
  assert.equal(preview.policies.overlap, 'queue')

  const slot = occurrenceSlot(job, preview.nextRuns[0])
  const occurrenceA = cronOccurrenceId(job.id, slot, 'project', 'demo')
  const occurrenceB = cronOccurrenceId(job.id, slot, 'project', 'demo')
  assert.equal(occurrenceA, occurrenceB)

  const firstFailure = cronFailureDecision(job)
  assert.equal(firstFailure.paused, false)
  const thirdFailure = cronFailureDecision({ ...job, consecutive_failures: 2 })
  assert.equal(thirdFailure.paused, true)
  assert.equal(thirdFailure.patch.enabled, false)

  console.log(JSON.stringify({
    success: true,
    checks: {
      templateVariables: true,
      previewFiveRuns: preview.nextRuns.length,
      stableOccurrence: occurrenceA,
      defaultOverlap: job.overlap_policy,
      failureCircuitBreaker: true,
    }
  }, null, 2))
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
