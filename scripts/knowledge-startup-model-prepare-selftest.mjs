import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = path.resolve(import.meta.dirname, '..')
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-knowledge-startup-'))
process.env.CCM_TASK_STORE_DIR = path.join(tempRoot, '.cc-connect')
process.env.CCM_STARTUP_PREPARE_LOCAL_EMBEDDING = '1'
delete process.env.CCM_DISABLE_LOCAL_EMBEDDING_STARTUP_PREPARE

const require = createRequire(import.meta.url)
const embedding = require('../ccm-package/dist/modules/knowledge/knowledge-embedding.js')
const startup = require('../ccm-package/dist/modules/knowledge/knowledge-model-startup.js')
embedding.setKnowledgeEmbeddingTestAdapter(async texts => texts.map(() => Array.from({ length: 384 }, (_, index) => index === 0 ? 1 : 0)))

try {
  const immediate = await startup.prepareLocalKnowledgeModelAtStartup({ enabled: true, rebuild: false })
  assert.equal(immediate.accepted, true)
  assert.equal(immediate.ready, true)
  assert.equal(immediate.localModel.state, 'ready')

  startup.resetLocalKnowledgeModelStartupForTest()
  const scheduled = startup.scheduleLocalKnowledgeModelStartupPreparation(1)
  assert.equal(scheduled.scheduled, true)
  await new Promise(resolve => setTimeout(resolve, 40))
  assert.equal(embedding.getLocalKnowledgeModelStatus().state, 'ready')

  startup.resetLocalKnowledgeModelStartupForTest()
  process.env.CCM_DISABLE_LOCAL_EMBEDDING_STARTUP_PREPARE = '1'
  const disabled = startup.scheduleLocalKnowledgeModelStartupPreparation(1)
  assert.equal(disabled.scheduled, false)
  delete process.env.CCM_DISABLE_LOCAL_EMBEDDING_STARTUP_PREPARE

  const cliSource = fs.readFileSync(path.join(root, 'ccm-package/bin/ccm.js'), 'utf8')
  const serverSource = fs.readFileSync(path.join(root, 'backend/server.ts'), 'utf8')
  const uiSource = fs.readFileSync(path.join(root, 'frontend/src/components/knowledge/KnowledgeSettingsModal.vue'), 'utf8')
  assert.match(cliSource, /CCM_STARTUP_PREPARE_LOCAL_EMBEDDING/)
  assert.match(serverSource, /scheduleLocalKnowledgeModelStartupPreparation/)
  assert.match(uiSource, /首次运行 ccm start 后会在后台下载并校验约118MB模型/)

  console.log(JSON.stringify({
    pass: true,
    paidProviderCalls: 0,
    checks: {
      ccmStartEnablesPreparation: true,
      preparationRunsInBackground: true,
      fixedModelBecomesReady: true,
      startupDoesNotRequireKnowledgeDocuments: true,
      uiExplainsStartupDownload: true,
      testsCanDisableLiveDownload: true,
    },
  }, null, 2))
} finally {
  startup.resetLocalKnowledgeModelStartupForTest()
  embedding.setKnowledgeEmbeddingTestAdapter(null)
  fs.rmSync(tempRoot, { recursive: true, force: true })
}
