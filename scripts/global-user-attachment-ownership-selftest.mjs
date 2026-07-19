import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = path.resolve(import.meta.dirname, '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const require = createRequire(import.meta.url)

const apiSource = read('backend/modules/global/global-agent-api.ts')
const historySource = read('backend/modules/global/global-agent-history.ts')
const messagingSource = read('frontend/src/composables/useGlobalAgentMessaging.js')
const sessionsSource = read('frontend/src/composables/useGlobalAgentSessions.js')
const rendererSource = read('frontend/src/components/global/GlobalAgentMessageList.vue')
const frontendAttachmentSource = read('frontend/src/utils/globalAgentAttachments.js')
const frontendAttachments = await import(`data:text/javascript;base64,${Buffer.from(frontendAttachmentSource).toString('base64')}`)
const backendAttachments = require(path.join(root, 'ccm-package/dist/modules/global/global-agent-attachments.js'))

const sourceFiles = backendAttachments.serializeGlobalRequestAttachments([{
  filename: 'image.png',
  savedPath: 'C:\\Users\\admin\\.cc-connect\\uploads\\1784391743927-jaaogs.png',
  size: 78381,
  contentType: 'image/png',
}])
assert.deepEqual(sourceFiles, [{
  name: 'image.png',
  size: 78381,
  type: 'image/png',
  upload_url: '/api/uploads/1784391743927-jaaogs.png',
  attachment_owner: 'user',
}])

const liveFiles = frontendAttachments.mergeGlobalMessageAttachments([{
  name: 'image.png',
  size: 78381,
  type: 'image/png',
  preview: 'data:image/png;base64,preview-only',
  attachment_owner: 'user',
}], sourceFiles, 'user')
assert.equal(liveFiles.length, 1)
assert.equal(liveFiles[0].preview, 'data:image/png;base64,preview-only')
assert.equal(liveFiles[0].upload_url, '/api/uploads/1784391743927-jaaogs.png')

const persistedFiles = frontendAttachments.normalizeGlobalMessageAttachments(liveFiles, 'user', { forPersistence: true })
assert.equal(persistedFiles.length, 1)
assert.equal('preview' in persistedFiles[0], false)
assert.equal('savedPath' in persistedFiles[0], false)
assert.equal(persistedFiles[0].attachment_owner, 'user')
assert.equal(frontendAttachments.globalAttachmentUrl(persistedFiles[0]), '/api/uploads/1784391743927-jaaogs.png')

assert.deepEqual(backendAttachments.sanitizeGlobalHistoryAttachments({ truncated: true }, 'user'), [])
assert.deepEqual(backendAttachments.sanitizeGlobalHistoryAttachments(sourceFiles, 'assistant'), [])
assert.equal(backendAttachments.sanitizeGlobalHistoryAttachments(sourceFiles, 'user').length, 1)
assert.equal(backendAttachments.sanitizeGlobalHistoryAttachments([{
  name: 'report.pdf',
  size: 1024,
  type: 'application/pdf',
  upload_url: '/api/uploads/report-123.pdf',
  attachment_owner: 'user',
}], 'user')[0].type, 'application/pdf')

const checks = {
  backendReturnsSourceFiles: /source_files:\s*sourceFiles/.test(apiSource),
  backendDoesNotExposeSavedPath: !/files\.map\(file\s*=>\s*\(\{[^}]*savedPath/s.test(apiSource),
  historyUsesAttachmentSanitizer: /sanitizeGlobalHistoryAttachments\(message\[key\], message\?\.role\)/.test(historySource),
  userMessageReceivesSourceFiles: /newMessage\.files\s*=\s*mergeGlobalMessageAttachments\(newMessage\.files, sourceFiles, 'user'\)/.test(messagingSource),
  assistantRejectsRequestFiles: !/agentMsg\.files\s*=\s*data\.files/.test(messagingSource)
    && /data\.assistant_files/.test(messagingSource),
  persistenceStripsInlinePreview: /forPersistence:\s*true/.test(sessionsSource)
    && /serializeGlobalSessionsForPersistence/.test(sessionsSource),
  rendererUsesStoredUrl: /globalAttachmentUrl\(file\)/.test(rendererSource)
    && !/`\/api\/uploads\/\$\{file\.name\}`/.test(rendererSource),
  rendererGuardsArrayShape: /Array\.isArray\(msg\.files\)/.test(rendererSource),
}

assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2))
console.log(JSON.stringify({ pass: true, checks: Object.keys(checks).length, checksDetail: checks }, null, 2))
