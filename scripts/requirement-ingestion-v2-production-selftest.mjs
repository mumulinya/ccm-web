import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { createRequire } from 'node:module'

const root = path.resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)
const { UPLOAD_DIR } = require('../ccm-package/dist/core/utils.js')
const { parseSecureMultipartRequest, cleanupSecureMultipartFiles } = require('../ccm-package/dist/system/secure-multipart.js')
const { assertPublicUrl } = require('../ccm-package/dist/modules/requirements/source-ingestion.js')
const {
  attachSourceManifests,
  assertRequirementPlanEvidence,
  buildRequirementCoverageReceipt,
  chunkRequirementSource,
  evidenceForSource,
} = require('../ccm-package/dist/modules/requirements/source-evidence-v2.js')
const { listOrphanAttachments, purgeOrphanAttachment } = require('../ccm-package/dist/system/attachment-reference-registry.js')

fs.mkdirSync(UPLOAD_DIR, { recursive: true })
const cleanup = []

function multipartRequest(boundary, body) {
  const req = new PassThrough()
  req.headers = {
    'content-type': `multipart/form-data; boundary=${boundary}`,
    'content-length': String(Buffer.byteLength(body)),
  }
  queueMicrotask(() => req.end(body))
  return req
}

try {
  const boundary = `ccm-${Date.now()}`
  const body = [
    `--${boundary}\r\nContent-Disposition: form-data; name="requirement"\r\n\r\n实现附件要求\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="files"; filename="requirement.txt"\r\nContent-Type: text/plain\r\n\r\nfull-source-marker\r\n`,
    `--${boundary}--\r\n`,
  ].join('')
  const uploaded = await parseSecureMultipartRequest(multipartRequest(boundary, body))
  cleanup.push(...uploaded.files)
  assert.equal(uploaded.files.length, 1)
  assert.equal(uploaded.fields.requirement, '实现附件要求')
  assert.equal(fs.readFileSync(uploaded.files[0].savedPath, 'utf8'), 'full-source-marker')

  const oversized = new PassThrough()
  oversized.headers = { 'content-type': `multipart/form-data; boundary=${boundary}`, 'content-length': String(65 * 1024 * 1024) }
  await assert.rejects(() => parseSecureMultipartRequest(oversized), /64 MB/)
  await assert.rejects(() => assertPublicUrl('http://127.0.0.1/private'), /本机|局域网/)
  await assert.rejects(() => assertPublicUrl('http://[::ffff:127.0.0.1]/private'), /本机|局域网/)

  const longText = Array.from({ length: 9000 }, (_, index) => `段落 ${index}：需求事实 source-tail-${index}`).join('\n\n')
  const chunks = chunkRequirementSource(longText, 'source-long', 1000)
  assert.ok(chunks.length > 20)
  assert.match(chunks.at(-1).content, /source-tail-8999/)
  const [source] = attachSourceManifests([{
    id: 'source-long', name: '长需求.txt', kind: 'text', source_type: 'file', status: 'parsed', parser: 'utf8-text', readable: true, required: true, content: longText,
  }])
  const coverage = buildRequirementCoverageReceipt([source])
  const evidence = evidenceForSource(source)
  assert.equal(coverage.complete, true)
  assert.equal(source.manifest.char_count, longText.length)
  assert.doesNotThrow(() => assertRequirementPlanEvidence({ source_evidence_v2: [evidence], items: [] }, [source.manifest], coverage))
  assert.throws(() => assertRequirementPlanEvidence({ source_evidence_v2: [{ ...evidence, source_checksum: 'stale' }], items: [] }, [source.manifest], coverage), /失效/)

  const orphanName = `${Date.now()}-${'a'.repeat(16)}.txt`
  const orphanPath = path.join(UPLOAD_DIR, orphanName)
  fs.writeFileSync(orphanPath, 'orphan-upload-selftest')
  const old = new Date(Date.now() - 25 * 60 * 60_000)
  fs.utimesSync(orphanPath, old, old)
  assert.ok(listOrphanAttachments().some(item => item.id === orphanName))
  assert.equal(purgeOrphanAttachment(orphanName).removed, true)
  assert.equal(fs.existsSync(orphanPath), false)

  const routeSource = fs.readFileSync(path.join(root, 'backend/modules/collaboration/collaboration-routes.ts'), 'utf8')
  const uiSource = fs.readFileSync(path.join(root, 'frontend/src/components/common/OnlineDocumentReferences.vue'), 'utf8')
  assert.match(routeSource, /\/api\/requirements\/sources\/retry/)
  assert.match(routeSource, /assertRequirementPlanEvidence/)
  assert.match(uiSource, /部分读取/)

  console.log(JSON.stringify({
    pass: true,
    paidProviderCalls: 0,
    checks: {
      streamingMultipart: true,
      requestAndFileLimits: true,
      pinnedSsrfGate: true,
      completeTokenChunks: true,
      sourceEvidenceGate: true,
      orphanAttachmentCleanup: true,
      retryRefreshApi: true,
      partialUiState: true,
    },
  }, null, 2))
} finally {
  cleanupSecureMultipartFiles(cleanup)
}
