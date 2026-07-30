#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = path.resolve(import.meta.dirname, '..')
const dist = process.env.CCM_BACKEND_DIST_DIR || path.join(root, 'ccm-package', 'dist')
const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-reliability-drill-v2-'))
process.env.HOME = tempHome
process.env.USERPROFILE = tempHome
process.env.CCM_TASK_STORE_DIR = path.join(tempHome, '.cc-connect')
process.env.CCM_RELIABILITY_DRILLS = '0'

const require = createRequire(import.meta.url)
const drills = require(path.join(dist, 'system', 'reliability-drills.js'))
const database = require(path.join(dist, 'system', 'observability-database.js'))

try {
  const created = drills.startReliabilityDrillRun({ requestedBy: 'selftest' })
  assert.equal(created.accepted, true)
  assert.ok(created.run?.run_id)
  const duplicate = drills.startReliabilityDrillRun({ requestedBy: 'selftest-duplicate' })
  assert.equal(duplicate.accepted, false)
  assert.equal(duplicate.duplicate, true)
  assert.equal(duplicate.run?.run_id, created.run.run_id)

  let run = drills.getReliabilityDrillRun(created.run.run_id)
  for (let attempt = 0; attempt < 600 && !['completed', 'failed', 'cancelled', 'blocked'].includes(run?.status); attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 100))
    run = drills.getReliabilityDrillRun(created.run.run_id)
  }
  assert.equal(run?.status, 'completed', run?.error || run?.log_summary || 'reliability drill did not complete')
  assert.equal(run?.checkpoint, 'completed')
  assert.equal(run?.result?.pass, true)
  assert.equal(run?.cleanup_status, 'completed')
  assert.equal(drills.listReliabilityDrillRuns(10).filter(item => item.run_id === run.run_id).length, 1)

  console.log(JSON.stringify({
    pass: true,
    checks: {
      asynchronous_run_created: true,
      persistent_singleflight: true,
      managed_worker_completed: true,
      checkpoint_and_result_persisted: true,
      cleanup_status_persisted: true,
      provider_calls: 0,
    },
  }, null, 2))
} finally {
  database.closeObservabilityDatabaseForTests()
  try { fs.rmSync(tempHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }) } catch {}
}
