import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const baseUrl = String(process.env.CCM_BASE_URL || 'http://127.0.0.1:3082').replace(/\/+$/, '')
const reportDir = path.join(root, 'scratch', 'knowledge-api-selftest')
fs.mkdirSync(reportDir, { recursive: true })

const request = async (pathname, options = {}) => {
  const response = await fetch(`${baseUrl}${pathname}`, options)
  const data = await response.json().catch(() => ({}))
  return { response, data }
}

const checks = []
try {
  const status = await request('/api/rag/status')
  assert.equal(status.response.ok, true)
  assert.equal(status.data.success, true)
  assert.match(status.data.status.state, /ready|building/)
  checks.push({ name: 'status exposes persisted index health', pass: true })

  const documents = await request('/api/rag/documents')
  assert.equal(documents.response.ok, true)
  assert.equal(Array.isArray(documents.data.documents), true)
  assert.equal(documents.data.documents.every(item => item.scope && item.parseStatus && item.source), true)
  checks.push({ name: 'documents expose scope, parse state and provenance', pass: true })

  const traversal = await request('/api/rag/document-content?name=..%5Cconfig.toml')
  assert.equal(traversal.response.status, 400)
  assert.match(traversal.data.error, /不合法|超出/)
  checks.push({ name: 'document path traversal is blocked', pass: true })

  const query = await request('/api/rag/query', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: '密钥如何获取', limit: 3 })
  })
  assert.equal(query.response.ok, true)
  assert.equal(query.data.success, true)
  assert.equal(Array.isArray(query.data.debugChunks), true)
  assert.equal(query.data.debugChunks.every(item => item.citation && Number.isInteger(item.chunkIndex)), true)
  assert.equal(typeof query.data.retrieval.fallback, 'boolean')
  checks.push({ name: 'query endpoint performs retrieval without model chat', pass: true })

  const report = { pass: true, generatedAt: new Date().toISOString(), baseUrl, checks }
  fs.writeFileSync(path.join(reportDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  const report = { pass: false, generatedAt: new Date().toISOString(), baseUrl, checks, error: error?.stack || String(error) }
  fs.writeFileSync(path.join(reportDir, 'report.json'), JSON.stringify(report, null, 2))
  console.error(report.error)
  process.exitCode = 1
}

