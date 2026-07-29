import path from 'node:path'
import { createRequire } from 'node:module'

if (process.env.CCM_LIVE_LOCAL_EMBEDDING !== '1') {
  console.log(JSON.stringify({ skipped: true, reason: 'Set CCM_LIVE_LOCAL_EMBEDDING=1 to download and verify the pinned local model.' }, null, 2))
  process.exit(0)
}

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const files = require(path.join(root, 'ccm-package', 'dist', 'modules', 'knowledge', 'knowledge-files.js'))
const embedding = require(path.join(root, 'ccm-package', 'dist', 'modules', 'knowledge', 'knowledge-embedding.js'))

const previous = files.loadRagEmbeddingConfig()
files.saveRagEmbeddingConfig({ mode: 'local' })
try {
  const status = await embedding.prepareLocalKnowledgeModel()
  if (status.state !== 'ready') throw new Error(status.error || 'Local model is not ready')
  const vectors = await embedding.embedLocalKnowledgeTexts(['汽车需要定期保养', 'An automobile needs scheduled servicing'], 'passage')
  const left = vectors[0].vector
  const right = vectors[1].vector
  const similarity = left.reduce((sum, value, index) => sum + value * right[index], 0)
  console.log(JSON.stringify({ pass: vectors.every(item => item.state === 'ready' && item.dimension === 384), status, crossLanguageSimilarity: similarity, paidProviderCalls: 0 }, null, 2))
} finally {
  files.saveRagEmbeddingConfig({ mode: previous.mode, apiUrl: previous.apiUrl, model: previous.model, mirrorUrl: previous.mirrorUrl })
}

