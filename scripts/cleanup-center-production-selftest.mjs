import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const baseUrl = String(process.env.CCM_BASE_URL || 'http://127.0.0.1:3082').replace(/\/+$/, '')
const outputDir = path.join(root, 'scratch', 'cleanup-center-production-selftest')
fs.mkdirSync(outputDir, { recursive: true })
const checks = []

const request = async (pathname, options = {}) => {
  const response = await fetch(`${baseUrl}${pathname}`, options)
  return { response, data: await response.json().catch(() => ({})) }
}

try {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-cleanup-selftest-'))
  const isolated = spawnSync(process.execPath, [path.join(root, 'scripts', 'cleanup-center-isolated-selftest-child.cjs')], {
    cwd: root,
    env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome },
    encoding: 'utf8',
    timeout: 90_000,
  })
  assert.equal(isolated.status, 0, isolated.stderr || isolated.stdout)
  const isolatedReport = JSON.parse(isolated.stdout)
  assert.equal(isolatedReport.pass, true)
  assert.equal(Object.values(isolatedReport.checks).every(Boolean), true)
  checks.push({ name: 'isolated permanent purge removes execution, TestAgent and replay evidence with audit receipt', pass: true })
  fs.rmSync(tempHome, { recursive: true, force: true })

  const summary = await request('/api/cleanup/summary')
  assert.equal(summary.response.ok, true)
  assert.equal(summary.data.success, true)
  assert.deepEqual(summary.data.policy.retention_options, [7, 30, 90, 0])
  assert.ok(Array.isArray(summary.data.cards) && summary.data.cards.length === 6)
  assert.ok(Array.isArray(summary.data.history))
  assert.equal(summary.data.cards.some(card => card.id === 'quality_evidence'), true)
  checks.push({ name: 'summary exposes storage, retention policy, quality evidence and cleanup history', pass: true })

  const preview = await request('/api/cleanup/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'purge_archived_tasks', retention_days: 30 }),
  })
  assert.equal(preview.response.ok, true)
  assert.equal(preview.data.success, true)
  assert.ok(preview.data.preview_token)
  assert.ok(preview.data.expires_at)
  assert.equal(preview.data.preview.items.some(item => 'fingerprint' in item), false)
  checks.push({ name: 'preview creates expiring exact snapshot without exposing internal fingerprints', pass: true })

  const missingConfirmation = await request('/api/cleanup/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'purge_archived_tasks' }),
  })
  assert.equal(missingConfirmation.response.status, 400)
  assert.match(missingConfirmation.data.error, /confirm=true/)

  const missingPreview = await request('/api/cleanup/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'purge_archived_tasks', confirm: true }),
  })
  assert.equal(missingPreview.response.status, 400)
  assert.match(missingPreview.data.error, /先生成清理预览/)
  checks.push({ name: 'run API requires both explicit confirmation and a valid preview snapshot', pass: true })

  const report = { pass: true, generatedAt: new Date().toISOString(), baseUrl, checks }
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  const report = { pass: false, generatedAt: new Date().toISOString(), baseUrl, checks, error: error?.stack || String(error) }
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.error(report.error)
  process.exitCode = 1
}
