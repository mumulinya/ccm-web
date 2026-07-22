import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { UPLOAD_DIR } = require('../ccm-package/dist/core/utils.js')
const {
  buildTaskAttachmentMutation,
  removeUploadedFiles,
  validateTaskUploadedFiles,
} = require('../ccm-package/dist/system/task-attachments.js')
const { buildTaskFromCronJob } = require('../ccm-package/dist/modules/scheduling/cron-part-01.js')
const { buildChildAgentTaskText } = require('../ccm-package/dist/modules/collaboration/collaboration-runtime-task-queue-part-02.js')

fs.mkdirSync(UPLOAD_DIR, { recursive: true })
const token = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const textPath = path.join(UPLOAD_DIR, `${token}.txt`)
const fakeImagePath = path.join(UPLOAD_DIR, `${token}.png`)
fs.writeFileSync(textPath, '验收要求：项目 Agent 必须读取附件正文，并在结果中写明 attachment-e2e-marker。')
fs.writeFileSync(fakeImagePath, 'not-a-real-png')

const uploaded = [{ filename: '需求说明.txt', savedPath: textPath, size: fs.statSync(textPath).size, contentType: 'text/plain' }]
const cleanup = [...uploaded, { filename: '伪装图片.png', savedPath: fakeImagePath }]

try {
  const bundle = await buildTaskAttachmentMutation({ files: uploaded, retainedIds: [], userText: '按附件开发功能' })
  assert.equal(bundle.attachments.length, 1)
  assert.equal(bundle.attachments[0].readable, true)
  assert.match(bundle.attachments[0].checksum, /^[a-f0-9]{64}$/)
  assert.match(bundle.context, /attachment-e2e-marker/)

  const directText = buildChildAgentTaskText('实现任务', {
    workflow_type: 'general',
    source_attachment_context: bundle.context,
  })
  assert.match(directText, /attachment-e2e-marker/)
  assert.match(directText, /必须读取/)

  const cronJob = {
    id: 'cron-attachment-selftest',
    name: '附件快照测试',
    schedule: '0 9 * * *',
    target_type: 'project',
    project: 'demo-project',
    prompt: '执行附件中的需求',
    source_attachments: bundle.attachments,
    source_attachment_contexts: bundle.contexts,
    source_attachment_context: bundle.context,
  }
  const cronResult = buildTaskFromCronJob(cronJob, 'manual')
  const draft = cronResult.drafts[0]
  assert.equal(draft.source_attachments.length, 1)
  assert.match(draft.source_attachment_context, /attachment-e2e-marker/)
  cronJob.source_attachment_context = 'edited-after-run'
  cronJob.source_attachments[0].name = 'edited-after-run.txt'
  assert.match(draft.source_attachment_context, /attachment-e2e-marker/)
  assert.equal(draft.source_attachments[0].name, '需求说明.txt')

  const removed = await buildTaskAttachmentMutation({
    currentAttachments: bundle.attachments,
    currentContexts: bundle.contexts,
    retainedIds: [],
    files: [],
  })
  assert.equal(removed.attachments.length, 0)
  assert.equal(removed.context, '')

  assert.throws(
    () => validateTaskUploadedFiles([{ filename: '伪装图片.png', savedPath: fakeImagePath, size: fs.statSync(fakeImagePath).size }]),
    /图片格式与文件内容不一致/,
  )

  console.log(JSON.stringify({
    success: true,
    checks: {
      text_attachment_parsed: true,
      checksum_persisted: true,
      project_agent_context_injected: true,
      cron_run_snapshot_immutable: true,
      remove_all_supported: true,
      fake_image_rejected: true,
    },
  }, null, 2))
} finally {
  removeUploadedFiles(cleanup)
}
