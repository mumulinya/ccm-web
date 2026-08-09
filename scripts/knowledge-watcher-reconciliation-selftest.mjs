import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

// 验证阶段2：CCM 未运行期间监控目录里发生的新增/修改/删除，重启（或首次添加）时
// 必须靠全量扫描 + 差集对账找回，而不是只依赖 fs.watch 事件（离线期间不会有事件）。
const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-knowledge-watcher-selftest-'))
const watchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-knowledge-watcher-source-'))
const reportDir = path.join(root, 'scratch', 'knowledge-watcher-reconciliation-selftest')
fs.mkdirSync(reportDir, { recursive: true })
process.env.USERPROFILE = tempHome

const files = require(path.join(root, 'ccm-package', 'dist', 'modules', 'knowledge', 'knowledge-files.js'))
const index = require(path.join(root, 'ccm-package', 'dist', 'modules', 'knowledge', 'knowledge-index.js'))
const { KnowledgeDirectoryWatcher } = require(path.join(root, 'ccm-package', 'dist', 'modules', 'knowledge', 'knowledge-watcher.js'))
files.saveRagEmbeddingConfig({ mode: 'lexical' })

const checks = []
const check = (name, fn) => { fn(); checks.push({ name, pass: true }) }

try {
  fs.writeFileSync(path.join(watchDir, 'kept.md'), '# 保留文档\n\nWATCHER-KEPT-TOKEN-330 应该始终可以检索到。')
  fs.writeFileSync(path.join(watchDir, 'to-remove.md'), '# 待删除文档\n\nWATCHER-REMOVED-TOKEN-441 模拟离线期间被删除的文件。')

  const watcher = new KnowledgeDirectoryWatcher()
  const firstSync = await watcher.addPath({ path: watchDir, scopeType: 'global', visibility: 'shared' })
  check('initial add-path sync imports every existing file and returns real counts', () => {
    assert.equal(firstSync.sync.files, 2)
    assert.equal(firstSync.sync.synced, 2)
    assert.equal(firstSync.sync.removed, 0)
  })
  check('both files are retrievable right after the initial sync', () => {
    assert.equal(index.queryKnowledgeBase('WATCHER-KEPT-TOKEN-330', 5).includes('WATCHER-KEPT-TOKEN-330'), true)
    assert.equal(index.queryKnowledgeBase('WATCHER-REMOVED-TOKEN-441', 5).includes('WATCHER-REMOVED-TOKEN-441'), true)
  })
  watcher.stopAll()

  // 模拟 CCM 未运行期间：外部新增一个文件、删除一个已导入过的文件。
  // 这期间没有任何进程在跑，所以不会有任何 fs.watch 事件。
  fs.unlinkSync(path.join(watchDir, 'to-remove.md'))
  fs.writeFileSync(path.join(watchDir, 'added-while-offline.md'), '# 离线期间新增\n\nWATCHER-OFFLINE-ADDED-TOKEN-559 模拟离线期间新增的文件。')

  const restoredWatcher = new KnowledgeDirectoryWatcher()
  restoredWatcher.start()
  // start() 内部的对账是 fire-and-forget（不阻塞服务启动），这里等待足够长时间让它完成。
  await new Promise(resolve => setTimeout(resolve, 800))

  check('restart reconciliation removes the file deleted while offline', () => {
    assert.equal(index.queryKnowledgeBase('WATCHER-REMOVED-TOKEN-441', 5).includes('WATCHER-REMOVED-TOKEN-441'), false)
  })
  check('restart reconciliation imports the file added while offline', () => {
    assert.equal(index.queryKnowledgeBase('WATCHER-OFFLINE-ADDED-TOKEN-559', 5).includes('WATCHER-OFFLINE-ADDED-TOKEN-559'), true)
  })
  check('restart reconciliation keeps the file that never changed', () => {
    assert.equal(index.queryKnowledgeBase('WATCHER-KEPT-TOKEN-330', 5).includes('WATCHER-KEPT-TOKEN-330'), true)
  })
  restoredWatcher.stopAll()

  const report = { pass: true, generatedAt: new Date().toISOString(), checks }
  fs.writeFileSync(path.join(reportDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  const report = { pass: false, generatedAt: new Date().toISOString(), checks, error: error?.stack || String(error) }
  fs.writeFileSync(path.join(reportDir, 'report.json'), JSON.stringify(report, null, 2))
  console.error(report.error)
  process.exitCode = 1
} finally {
  fs.rmSync(tempHome, { recursive: true, force: true })
  fs.rmSync(watchDir, { recursive: true, force: true })
}
