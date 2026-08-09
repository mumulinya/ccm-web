import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = path.resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)
const projection = require(path.join(root, 'ccm-package', 'dist', 'system', 'context-source-tool-result-projection.js'))
const continuity = require(path.join(root, 'ccm-package', 'dist', 'system', 'main-agent-context-source-continuity.js'))
const maintenance = require(path.join(root, 'ccm-package', 'dist', 'system', 'context-source-history-maintenance.js'))
const { CCM_DIR } = require(path.join(root, 'ccm-package', 'dist', 'core', 'utils.js'))

const sentinel = `SOURCE_BODY_SENTINEL_${Date.now()}`
const identity = { agentKind: 'project', scope: 'project', scopeId: `promotion-selftest-${Date.now()}`, exactSessionId: 'session-1', generation: 0 }
const maintenanceProject = `source-maintenance-selftest-${Date.now()}`
const maintenanceSession = 'session-1'
const maintenanceDir = path.join(CCM_DIR, 'web-sessions', maintenanceProject)
const maintenanceFile = path.join(maintenanceDir, `${maintenanceSession}.json`)
let maintenancePlanChecksum = ''
let maintenanceJobId = ''

try {
  const projectionResult = projection.contextSourceToolResultProjectionSelfTest()
  assert.equal(projectionResult.pass, true)

  continuity.recordContextSourceReceipts(identity, [{
    sourceKind: 'knowledge', sourceId: 'guide.md', documentName: 'guide.md', chunkIds: ['guide.md#0'],
    revision: '1', checksum: 'doc-checksum', tokenCount: 20, injected: true, state: 'injected', content: sentinel,
  }])
  const promoted = continuity.promoteContextSourceReceipts({
    identity,
    sourceRefs: [{ sourceKind: 'knowledge', sourceId: 'guide.md', chunkIds: ['guide.md#0'], revision: '1', checksum: 'doc-checksum' }],
    memoryKind: 'project_durable_memory',
    memoryId: 'memory-1',
    admissionChecksum: 'admission-1',
  })
  assert.equal(promoted.matched, 1)
  const duplicate = continuity.promoteContextSourceReceipts({
    identity,
    sourceRefs: [{ sourceKind: 'knowledge', sourceId: 'guide.md', chunkIds: ['guide.md#0'], revision: '1', checksum: 'doc-checksum' }],
    memoryKind: 'project_durable_memory',
    memoryId: 'memory-1',
    admissionChecksum: 'admission-1',
  })
  assert.equal(duplicate.alreadyPromoted, 1)
  const snapshot = continuity.readContextSourceContinuity(identity)
  assert.equal(snapshot.receipts[0].schema, 'ccm-context-source-read-receipt-v2')
  assert.equal(snapshot.receipts[0].state, 'promoted')
  assert.equal(snapshot.receipts[0].promotionEvidence.length, 1)
  assert.equal(JSON.stringify(snapshot).includes(sentinel), false)

  const maintenanceResult = maintenance.contextSourceHistoryMaintenanceSelfTest()
  assert.equal(maintenanceResult.pass, true)
  fs.mkdirSync(maintenanceDir, { recursive: true })
  const historical = { id: maintenanceSession, executionEvents: [{ type: 'tool_result', toolName: 'query_knowledge', payload: { context: sentinel, results: [{ filename: 'legacy.md', citation: 'legacy.md#0', text: sentinel }] } }] }
  fs.writeFileSync(maintenanceFile, JSON.stringify(historical, null, 2))
  const preview = maintenance.previewContextSourceMaintenance({ scope: 'project', scopeId: maintenanceProject, sessionId: maintenanceSession })
  maintenancePlanChecksum = preview.planChecksum
  assert.equal(preview.affectedRecordCount, 1)
  fs.writeFileSync(maintenanceFile, JSON.stringify({ ...historical, drift: true }, null, 2))
  assert.throws(() => maintenance.applyContextSourceMaintenance({ scope: 'project', scopeId: maintenanceProject, sessionId: maintenanceSession, planChecksum: preview.planChecksum, reason: 'drift-test' }), /source_drift/)
  fs.writeFileSync(maintenanceFile, JSON.stringify(historical, null, 2))
  const freshPreview = maintenance.previewContextSourceMaintenance({ scope: 'project', scopeId: maintenanceProject, sessionId: maintenanceSession })
  maintenancePlanChecksum = freshPreview.planChecksum
  const applied = maintenance.applyContextSourceMaintenance({ scope: 'project', scopeId: maintenanceProject, sessionId: maintenanceSession, planChecksum: freshPreview.planChecksum, reason: 'selftest' })
  maintenanceJobId = applied.jobId
  assert.equal(fs.readFileSync(maintenanceFile, 'utf8').includes(sentinel), false)
  const rolledBack = maintenance.rollbackContextSourceMaintenance({ jobId: applied.jobId, reason: 'selftest rollback' })
  assert.equal(rolledBack.status, 'rolled_back')
  assert.equal(fs.readFileSync(maintenanceFile, 'utf8').includes(sentinel), true)
  console.log(JSON.stringify({ pass: true, projection: projectionResult.pass, promotion: { matched: promoted.matched, idempotent: duplicate.alreadyPromoted }, maintenance: { ...maintenanceResult.projected, applyRollback: true } }))
} finally {
  continuity.clearContextSourceContinuity(identity)
  try { fs.rmSync(maintenanceDir, { recursive: true, force: true }) } catch {}
  try { if (maintenancePlanChecksum) fs.rmSync(path.join(CCM_DIR, 'memory-control', 'context-source-maintenance', 'plans', `${maintenancePlanChecksum}.json`), { force: true }) } catch {}
  try { if (maintenanceJobId) fs.rmSync(path.join(CCM_DIR, 'memory-control', 'context-source-maintenance', 'jobs', maintenanceJobId), { recursive: true, force: true }) } catch {}
}
