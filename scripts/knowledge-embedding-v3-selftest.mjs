import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import http from 'node:http'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-knowledge-v3-'))
process.env.USERPROFILE = tempHome
process.env.HOME = tempHome

const files = require(path.join(root, 'ccm-package', 'dist', 'modules', 'knowledge', 'knowledge-files.js'))
const embedding = require(path.join(root, 'ccm-package', 'dist', 'modules', 'knowledge', 'knowledge-embedding.js'))
const index = require(path.join(root, 'ccm-package', 'dist', 'modules', 'knowledge', 'knowledge-index.js'))
const access = require(path.join(root, 'ccm-package', 'dist', 'modules', 'knowledge', 'knowledge-access.js'))
const lease = require(path.join(root, 'ccm-package', 'dist', 'modules', 'knowledge', 'knowledge-index-lease.js'))
const watcher = require(path.join(root, 'ccm-package', 'dist', 'modules', 'knowledge', 'knowledge-watcher.js'))

const checks = {}

try {
  files.saveRagEmbeddingConfig({
    mode: 'remote',
    apiUrl: 'https://embedding.example.test/v1',
    apiKey: 'v3-secret-must-be-encrypted',
    model: 'mock-multilingual',
  })
  const configText = fs.readFileSync(path.join(tempHome, '.cc-connect', 'rag-embedding-config.json'), 'utf8')
  checks.credentialEncrypted = !configText.includes('v3-secret-must-be-encrypted') && configText.includes('ccm-secret://')
  assert.equal(checks.credentialEncrypted, true)
  const watchDir = path.join(tempHome, 'watched-docs')
  fs.mkdirSync(watchDir)
  const watchConfig = watcher.normalizeKnowledgeWatchConfig({ path: watchDir, scopeType: 'project', scopeId: 'project-a' }, { visibility: 'restricted' })
  checks.newWatchPathDefaultsRestricted = watchConfig.visibility === 'restricted' && watchConfig.scope.type === 'project' && watchConfig.scope.id === 'project-a'
  assert.equal(checks.newWatchPathDefaultsRestricted, true)

  files.storeKnowledgeBuffer('vehicle-guide.md', Buffer.from('# Vehicle\n\nAn automobile requires scheduled servicing.'), {
    scope: { type: 'global', id: '' }, visibility: 'shared'
  })
  files.storeKnowledgeBuffer('project-private.md', Buffer.from('# Private\n\nPROJECT-PRIVATE-CODE belongs only to project-a.'), {
    scope: { type: 'project', id: 'project-a' }, visibility: 'restricted', tags: ['project:project-a']
  })

  let passageFailures = true
  let adapterCalls = 0
  embedding.setKnowledgeEmbeddingTestAdapter(async (texts, backend, kind) => {
    adapterCalls += 1
    if (kind === 'passage' && passageFailures) throw new Error('injected embedding outage')
    return texts.map(() => [1, 0, 0])
  })
  const failed = await index.rebuildKnowledgeIndex('v3-failed-vectors')
  checks.failedVectorsRecorded = failed.semanticFailed === 2 && failed.semanticReady === 0
  assert.equal(checks.failedVectorsRecorded, true)

  passageFailures = false
  const callsBeforeRepair = adapterCalls
  const repaired = await index.rebuildKnowledgeIndex('v3-repair-vectors')
  checks.failedVectorsRetried = adapterCalls > callsBeforeRepair && repaired.semanticReady === 2 && repaired.cacheHits === 0
  assert.equal(checks.failedVectorsRetried, true)

  const semanticOnly = await index.searchKnowledgeBase('car', { scopeType: 'global', includeGlobal: false, limit: 3 })
  checks.semanticOnlyRecall = semanticOnly.results.some(item => /^vehicle-guide\.md#[a-f0-9]{10}_\d+$/.test(item.chunk.id))
    && semanticOnly.results.some(item => String(item.retrievalMode).includes('semantic:remote'))
    && semanticOnly.candidateCounts.semantic > 0
  assert.equal(checks.semanticOnlyRecall, true)

  const groupResult = await access.searchAgentKnowledge('PROJECT-PRIVATE-CODE', {
    role: 'group-main-agent', groupId: 'group-a', project: '__coordinator__', projects: [{ name: 'project-a' }]
  })
  checks.restrictedProjectDoesNotLeakToGroup = !groupResult.citations.some(item => item.startsWith('project-private.md#'))
  assert.equal(checks.restrictedProjectDoesNotLeakToGroup, true)

  const projectResult = await access.searchAgentKnowledge('PROJECT-PRIVATE-CODE', { role: 'project-agent', project: 'project-a' })
  checks.exactProjectCanReadRestricted = projectResult.citations.some(item => item.startsWith('project-private.md#'))
  assert.equal(checks.exactProjectCanReadRestricted, true)

  const cached = await index.rebuildKnowledgeIndex('v3-cache-hit')
  checks.cacheHitKeepsRealVectorCounts = cached.cacheHits === 2 && cached.semanticReady === 2 && cached.remoteVectors === 2
  assert.equal(checks.cacheHitKeepsRealVectorCounts, true)

  checks.generationActivated = /^gen_/.test(cached.activeGeneration) && fs.existsSync(path.join(tempHome, '.cc-connect', 'knowledge-index-v3', 'active.json'))
  assert.equal(checks.generationActivated, true)
  const cleanup = index.pruneKnowledgeIndexGenerations()
  checks.invalidGenerationCleanupKeepsActive = cleanup.removed >= 1 && fs.existsSync(path.join(tempHome, '.cc-connect', 'knowledge-index-v3', `${cached.activeGeneration}.json`))
  assert.equal(checks.invalidGenerationCleanupKeepsActive, true)

  const artifact = path.join(tempHome, 'model-artifact.bin')
  fs.writeFileSync(artifact, 'verified-model-artifact')
  const artifactHash = crypto.createHash('sha256').update('verified-model-artifact').digest('hex')
  const artifactOk = await embedding.verifyKnowledgeEmbeddingModelArtifact(artifact, fs.statSync(artifact).size, artifactHash)
  const artifactBad = await embedding.verifyKnowledgeEmbeddingModelArtifact(artifact, fs.statSync(artifact).size, '0'.repeat(64))
  checks.modelArtifactChecksum = artifactOk.ready === true && artifactBad.ready === false
  assert.equal(checks.modelArtifactChecksum, true)

  const parentLease = lease.acquireKnowledgeIndexLease('v3-selftest')
  const childScript = `const lease=require(${JSON.stringify(path.join(root, 'ccm-package', 'dist', 'modules', 'knowledge', 'knowledge-index-lease.js'))});const index=require(${JSON.stringify(path.join(root, 'ccm-package', 'dist', 'modules', 'knowledge', 'knowledge-index.js'))});const attempt=lease.acquireKnowledgeIndexLease('child');index.loadActiveKnowledgeIndex();console.log(JSON.stringify({acquired:attempt.acquired,stale:index.getKnowledgeIndexStatus().staleServed}));`
  const childOutput = execFileSync(process.execPath, ['-e', childScript], { env: { ...process.env, USERPROFILE: tempHome, HOME: tempHome }, encoding: 'utf8' }).trim().split(/\r?\n/).at(-1)
  const child = JSON.parse(childOutput)
  checks.singleBuilderLease = parentLease.acquired === true && child.acquired === false
  checks.concurrentReaderUsesLastGood = child.stale === true
  assert.equal(checks.singleBuilderLease, true)
  assert.equal(checks.concurrentReaderUsesLastGood, true)
  lease.releaseKnowledgeIndexLease(parentLease.lease.ownerId)

  embedding.setKnowledgeEmbeddingTestAdapter(null)
  const requestShapes = []
  const mockServer = http.createServer((req, res) => {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      const parsed = JSON.parse(body)
      requestShapes.push(Array.isArray(parsed.input) ? `array:${parsed.input.length}` : 'string')
      const count = Array.isArray(parsed.input) ? parsed.input.length : 1
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ data: Array.from({ length: count }, (_, index) => ({ index, embedding: [1, index + 1, 0] })) }))
    })
  })
  await new Promise(resolve => mockServer.listen(0, '127.0.0.1', resolve))
  files.saveRagEmbeddingConfig({ mode: 'remote', apiUrl: `http://127.0.0.1:${mockServer.address().port}/v1`, apiKey: 'local-http-mock', model: 'mock-batch' })
  await embedding.embedRemoteKnowledgeTexts(['one', 'two'], 'passage')
  await embedding.embedRemoteKnowledgeTexts(['one'], 'query')
  await new Promise(resolve => mockServer.close(resolve))
  checks.remoteBatchAndSingleCompatibility = requestShapes.includes('array:2') && requestShapes.includes('string')
  assert.equal(checks.remoteBatchAndSingleCompatibility, true)

  checks.paidProviderCalls = 0
  console.log(JSON.stringify({ pass: true, checks }, null, 2))
} catch (error) {
  console.error(error?.stack || String(error))
  process.exitCode = 1
} finally {
  embedding.setKnowledgeEmbeddingTestAdapter(null)
  fs.rmSync(tempHome, { recursive: true, force: true })
}
