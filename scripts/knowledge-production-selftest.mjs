import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-knowledge-selftest-'))
const reportDir = path.join(root, 'scratch', 'knowledge-production-selftest')
fs.mkdirSync(reportDir, { recursive: true })
process.env.USERPROFILE = tempHome

const files = require(path.join(root, 'ccm-package', 'dist', 'modules', 'knowledge', 'knowledge-files.js'))
const index = require(path.join(root, 'ccm-package', 'dist', 'modules', 'knowledge', 'knowledge-index.js'))
files.saveRagEmbeddingConfig({ mode: 'lexical' })

const checks = []
const check = (name, fn) => {
  const result = fn()
  checks.push({ name, pass: true })
  return result
}

try {
  check('path traversal is rejected', () => assert.throws(() => files.resolveKnowledgeFile('..\\config.toml'), /不合法|超出/))
  check('unsupported extension is rejected', () => assert.throws(() => files.sanitizeKnowledgeFilename('payload.exe'), /暂不支持/))
  check('watched files with the same basename get collision-safe identities', () => {
    assert.notEqual(files.watchedKnowledgeFilename('C:\\project-a', 'docs\\guide.md'), files.watchedKnowledgeFilename('C:\\project-b', 'docs\\guide.md'))
  })

  const chunkSelfTest = index.runKnowledgeIndexSelfTest()
  check('markdown headings create semantic chunks', () => assert.equal(chunkSelfTest.pass, true))

  files.storeKnowledgeBuffer('global-guide.md', Buffer.from('# 全局规范\n\n密钥必须加密保管，不得公开发送。'), {
    scope: { type: 'global', id: '' }, tags: ['security'], source: { type: 'selftest' }
  })
  files.storeKnowledgeBuffer('project-guide.md', Buffer.from('# 项目内部\n\n海棠计划的内部验证码是 TEST-ONLY。'), {
    scope: { type: 'project', id: 'haitang' }, visibility: 'restricted', tags: ['private'], source: { type: 'selftest' }
  })

  const concurrent = await Promise.all([
    index.rebuildKnowledgeIndex('selftest-a'),
    index.rebuildKnowledgeIndex('selftest-b')
  ])
  check('concurrent rebuild requests share a reliable queue', () => {
    assert.equal(concurrent.every(item => item.state === 'ready'), true)
    assert.equal(concurrent.at(-1).documents, 2)
  })

  const cached = await index.rebuildKnowledgeIndex('selftest-cache')
  check('unchanged documents use persistent cache', () => assert.equal(cached.cacheHits, 2))

  const globalResult = index.queryKnowledgeBase('TEST-ONLY 海棠', 5)
  check('default Agent retrieval cannot leak project-restricted documents', () => assert.equal(globalResult.includes('TEST-ONLY'), false))
  const scopedResult = index.queryKnowledgeBase('TEST-ONLY 海棠', 5, ['#project:haitang'])
  check('project-tagged retrieval can access its scoped document', () => assert.equal(scopedResult.includes('TEST-ONLY'), true))

  const debugSearch = await index.searchKnowledgeBase('密钥如何保管', { scopeType: 'global', includeGlobal: false, limit: 3 })
  check('hybrid search returns structured citations', () => {
    assert.equal(debugSearch.results.length > 0, true)
    assert.match(debugSearch.results[0].chunk.id, /^global-guide\.md#[a-f0-9]{10}_\d+$/)
  })

  const updated = files.storeKnowledgeBuffer('global-guide.md', Buffer.from('# 全局规范\n\n密钥必须轮换并加密保管。'), {
    scope: { type: 'global', id: '' }, tags: ['security'], source: { type: 'selftest' }
  })
  check('document updates create an auditable version', () => {
    assert.equal(updated.metadata.version, 2)
    assert.equal(files.listKnowledgeVersions('global-guide.md').length, 1)
  })
  const archived = files.listKnowledgeVersions('global-guide.md')[0]
  const archivedPreview = await files.parseKnowledgeVersion('global-guide.md', archived.file)
  check('archived versions can be previewed safely', () => assert.match(archivedPreview.content, /不得公开发送/))
  const restored = files.restoreKnowledgeVersion('global-guide.md', archived.file)
  check('archived versions can be restored without losing the current version', () => {
    assert.equal(restored.metadata.version, 3)
    assert.equal(files.listKnowledgeVersions('global-guide.md').length, 2)
  })

  // 阶段1第3条：删除文档后即使没有等重建完成，检索也不能再命中它——
  // eligibleKnowledgeChunks 必须按当前 metadata（而不是索引里缓存的旧值）判断。
  files.storeKnowledgeBuffer('deletion-visibility.md', Buffer.from('# 删除可见性\n\nDELETE-VISIBILITY-TOKEN-701 应在删除后立即不可检索。'), {
    scope: { type: 'global', id: '' }, source: { type: 'selftest' }
  })
  await index.rebuildKnowledgeIndex('deletion-visibility-setup')
  check('newly indexed document is retrievable before deletion', () => {
    assert.equal(index.queryKnowledgeBase('DELETE-VISIBILITY-TOKEN-701', 5).includes('DELETE-VISIBILITY-TOKEN-701'), true)
  })
  files.deleteKnowledgeDocument('deletion-visibility.md')
  check('deleted document is unreachable immediately, without waiting for reindex', () => {
    assert.equal(index.queryKnowledgeBase('DELETE-VISIBILITY-TOKEN-701', 5).includes('DELETE-VISIBILITY-TOKEN-701'), false)
  })

  // 阶段1第2条：重建必须每次都从磁盘真实内容算hash，不能信任metadata里存的旧值——
  // 模拟"CCM未运行期间文件被外部直接改写、metadata未同步更新"的场景。
  const externalEditPath = files.resolveKnowledgeFile('global-guide.md', true)
  fs.writeFileSync(externalEditPath, '# 全局规范\n\nEXTERNAL-EDIT-TOKEN-390 未经CCM写入接口直接改写文件内容。')
  await index.rebuildKnowledgeIndex('external-edit-detection')
  check('rebuild detects externally modified file content instead of trusting stale metadata hash', () => {
    assert.equal(index.queryKnowledgeBase('EXTERNAL-EDIT-TOKEN-390', 5).includes('EXTERNAL-EDIT-TOKEN-390'), true)
  })

  // 阶段1第3条：把一份文档从 shared/global 改为 restricted/project 之后，即使没有
  // 触发重建，默认（无范围）检索也不能再看到它——同样依赖 metadata 而不是旧 chunk.scope。
  files.storeKnowledgeBuffer('scope-visibility.md', Buffer.from('# 范围可见性\n\nSCOPE-VISIBILITY-TOKEN-512 用于验证范围收紧立即生效。'), {
    scope: { type: 'global', id: '' }, source: { type: 'selftest' }
  })
  await index.rebuildKnowledgeIndex('scope-visibility-setup')
  check('shared global document is retrievable by default query', () => {
    assert.equal(index.queryKnowledgeBase('SCOPE-VISIBILITY-TOKEN-512', 5).includes('SCOPE-VISIBILITY-TOKEN-512'), true)
  })
  files.updateKnowledgeMetadata('scope-visibility.md', { scope: { type: 'project', id: 'restricted-proj' }, visibility: 'restricted' })
  check('tightened scope/visibility takes effect immediately, without waiting for reindex', () => {
    assert.equal(index.queryKnowledgeBase('SCOPE-VISIBILITY-TOKEN-512', 5).includes('SCOPE-VISIBILITY-TOKEN-512'), false)
  })

  const report = { pass: true, generatedAt: new Date().toISOString(), checks, status: index.getKnowledgeIndexStatus() }
  fs.writeFileSync(path.join(reportDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  const report = { pass: false, generatedAt: new Date().toISOString(), checks, error: error?.stack || String(error) }
  fs.writeFileSync(path.join(reportDir, 'report.json'), JSON.stringify(report, null, 2))
  console.error(report.error)
  process.exitCode = 1
} finally {
  fs.rmSync(tempHome, { recursive: true, force: true })
}
