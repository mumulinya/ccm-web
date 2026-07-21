const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const ccmDir = path.join(require('node:os').homedir(), '.cc-connect')
const taskId = 'cleanup-isolated-task'
const oldAt = '2025-01-01T00:00:00.000Z'

const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

fs.mkdirSync(ccmDir, { recursive: true })
writeJson(path.join(ccmDir, 'tasks.json'), [{
  id: taskId,
  title: '隔离清理链路任务',
  status: 'archived',
  archived: true,
  archived_at: oldAt,
  updated_at: oldAt,
}])
writeJson(path.join(ccmDir, 'cron-jobs.json'), [])
writeJson(path.join(ccmDir, 'groups.json'), [])
writeJson(path.join(ccmDir, 'project-chat-runs.json'), [])

const executionFile = path.join(ccmDir, 'execution-kernel', 'executions', 'cleanup-execution.json')
const checkpointFile = path.join(ccmDir, 'execution-kernel', 'checkpoints', 'cleanup-checkpoint.json')
const outputFile = path.join(ccmDir, 'execution-kernel', 'outputs', `${taskId}-output.txt`)
writeJson(executionFile, { id: 'cleanup-execution', taskId, checkpointIds: ['cleanup-checkpoint'], updatedAt: oldAt })
writeJson(checkpointFile, { id: 'cleanup-checkpoint', taskId })
fs.mkdirSync(path.dirname(outputFile), { recursive: true })
fs.writeFileSync(outputFile, 'isolated output', 'utf8')

const artifactDir = path.join(ccmDir, 'test-agent-artifacts', 'cleanup-run')
writeJson(path.join(artifactDir, 'report.json'), { id: 'cleanup-run', taskId, status: 'passed' })
fs.writeFileSync(path.join(artifactDir, 'proof.txt'), 'browser proof', 'utf8')
const testRunFile = path.join(ccmDir, 'test-agent-runs', 'cleanup-run.json')
writeJson(testRunFile, {
  schema: 'ccm-test-agent-runner-record-v1',
  id: 'cleanup-run',
  taskId,
  status: 'passed',
  createdAt: oldAt,
  finishedAt: oldAt,
})
const replayFile = path.join(ccmDir, 'reliability', 'task-replay-journal', `${taskId}.jsonl`)
fs.mkdirSync(path.dirname(replayFile), { recursive: true })
fs.writeFileSync(replayFile, `${JSON.stringify({ schema: 'ccm-task-replay-journal-event-v1', task_id: taskId, recorded_at: oldAt, event: { type: 'task.completed' } })}\n`, 'utf8')

const cleanup = require(path.join(root, 'ccm-package', 'dist', 'system', 'cleanup-center.js'))
const preview = cleanup.previewCleanupAction('purge_archived_tasks', { retention_days: 0 })
assert.equal(preview.success, true)
assert.equal(preview.preview.items.length, 1)
assert.equal(preview.preview.items[0].id, taskId)
assert.equal('fingerprint' in preview.preview.items[0], false)

const invalidSelection = cleanup.runCleanupAction('purge_archived_tasks', {
  preview_token: preview.preview_token,
  selected_ids: ['not-in-preview'],
})
assert.equal(invalidSelection.success, false)
assert.match(invalidSelection.error, /不属于本次预览/)

const freshPreview = cleanup.previewCleanupAction('purge_archived_tasks', { retention_days: 0 })
const result = cleanup.runCleanupAction('purge_archived_tasks', {
  preview_token: freshPreview.preview_token,
  selected_ids: [taskId],
})
assert.equal(result.success, true)
assert.equal(result.receipt.processed_count, 1)
assert.equal(result.receipt.status, 'success')
const remainingTaskFile = path.join(ccmDir, 'tasks.json')
const remainingTasks = fs.existsSync(remainingTaskFile) ? JSON.parse(fs.readFileSync(remainingTaskFile, 'utf8')) : []
assert.equal(remainingTasks.length, 0)
for (const target of [executionFile, checkpointFile, outputFile, artifactDir, testRunFile, replayFile]) {
  assert.equal(fs.existsSync(target), false, `${target} should be removed`)
}
const history = cleanup.getCleanupHistory()
assert.equal(history[0].schema, 'ccm-cleanup-receipt-v1')
assert.equal(history[0].processed_count, 1)

process.stdout.write(JSON.stringify({
  pass: true,
  checks: {
    exactPreviewSelection: true,
    taskRemoved: true,
    executionArtifactsRemoved: true,
    testAgentEvidenceRemoved: true,
    replayRemoved: true,
    auditReceiptPersisted: true,
  },
}))
