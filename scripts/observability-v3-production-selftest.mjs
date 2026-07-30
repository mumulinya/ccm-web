#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'

const root = path.resolve(import.meta.dirname, '..')
const dist = process.env.CCM_BACKEND_DIST_DIR || path.join(root, 'ccm-package', 'dist')
const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-observability-v3-'))
const env = { ...process.env, HOME: tempHome, USERPROFILE: tempHome, CCM_TASK_STORE_DIR: path.join(tempHome, '.cc-connect') }
process.env.HOME = tempHome
process.env.USERPROFILE = tempHome
process.env.CCM_TASK_STORE_DIR = env.CCM_TASK_STORE_DIR

const ledgerFile = path.join(dist, 'system', 'reliability-ledger.js')
const childSource = `
const ledger=require(process.argv[1]);
const index=process.argv[2];
const idem=ledger.acquireIdempotency({scope:'cross-process',key:'same-key',leaseMs:10000});
const lease=ledger.acquireTaskLease('same-task','trace-shared',10000);
ledger.appendTraceEvent('trace-shared',{id:'event-'+index,type:'worker.event',status:'ok',message:'worker '+index,data:{index}});
setTimeout(()=>{process.stdout.write(JSON.stringify({idem:idem.acquired,lease:lease.acquired}));},800);
`

const runChild = index => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ['-e', childSource, ledgerFile, String(index)], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  let stdout = ''; let stderr = ''
  child.stdout.on('data', chunk => { stdout += chunk })
  child.stderr.on('data', chunk => { stderr += chunk })
  child.on('error', reject)
  child.on('exit', code => code === 0 ? resolve(JSON.parse(stdout)) : reject(new Error(stderr || `child ${index} exited ${code}`)))
})

try {
  const contenders = await Promise.all(Array.from({ length: 12 }, (_, index) => runChild(index)))
  assert.equal(contenders.filter(item => item.idem).length, 1, 'only one process may acquire the idempotency key')
  assert.equal(contenders.filter(item => item.lease).length, 1, 'only one process may acquire the task lease')

  const require = createRequire(import.meta.url)
  const ledger = require(ledgerFile)
  const metrics = require(path.join(dist, 'system', 'metrics-v3.js'))
  const storage = require(path.join(dist, 'system', 'storage-index.js'))
  const database = require(path.join(dist, 'system', 'observability-database.js'))

  const trace = ledger.getTracePage('trace-shared', { offset: 0, limit: 100 })
  const workerEvents = trace.events.filter(event => String(event.id).startsWith('event-'))
  assert.equal(workerEvents.length, 12)
  assert.equal(new Set(workerEvents.map(event => event.id)).size, 12)
  assert.deepEqual(trace.events.map(event => event.sequence), Array.from({ length: trace.events.length }, (_, index) => index + 1))

  ledger.appendTraceEvent('trace-sensitive', {
    id: 'sensitive', type: 'provider.result', status: 'error', message: 'Bearer secret-token',
    data: { api_key: 'sk-secret', prompt: 'private prompt', nested: { cookie: 'session=secret' }, huge: 'x'.repeat(200000) },
  })
  const sensitive = JSON.stringify(ledger.getTracePage('trace-sensitive', { limit: 10 }))
  assert.doesNotMatch(sensitive, /sk-secret|private prompt|session=secret|secret-token/)
  assert.ok(sensitive.length < 30000)

  metrics.recordMetricV3('project-a', { eventId: 'metric-ok', scopeType: 'project', scopeId: 'project-a', role: 'project_agent', status: 'completed', durationMs: 120 })
  metrics.recordMetricV3('project-a', { eventId: 'metric-blocked', scopeType: 'project', scopeId: 'project-a', role: 'test_agent', status: 'blocked', durationMs: 220 })
  metrics.recordMetricV3('project-a', { eventId: 'metric-unknown', scopeType: 'project', scopeId: 'project-a', role: 'project_agent', durationMs: 40 })
  metrics.recordMetricV3('project-a', { eventId: 'metric-ok', scopeType: 'project', scopeId: 'project-a', role: 'project_agent', status: 'completed', durationMs: 999 })
  const metricPage = metrics.queryMetricEventsV3({ scopeType: 'project', scopeId: 'project-a', pageSize: 20 })
  assert.equal(metricPage.total, 3)
  assert.equal(metricPage.statusCounts.completed, 1)
  assert.equal(metricPage.statusCounts.blocked, 1)
  assert.equal(metricPage.statusCounts.unknown, 1)
  assert.ok(metrics.loadMetricsDashboardV3().scopes['project:project-a'])

  const scan = storage.startStorageIndexScan({ force: true })
  assert.equal(scan.accepted, true)
  let indexStatus = storage.getStorageIndexStatus()
  for (let attempt = 0; attempt < 200 && indexStatus.status === 'index_building'; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 20))
    indexStatus = storage.getStorageIndexStatus()
  }
  assert.equal(indexStatus.status, 'ready')
  assert.ok(indexStatus.active_generation)

  console.log(JSON.stringify({
    pass: true,
    checks: {
      cross_process_idempotency_single_winner: true,
      cross_process_lease_single_winner: true,
      trace_append_is_atomic_and_ordered: true,
      trace_secrets_and_large_results_are_sanitized: true,
      project_metrics_and_structured_terminal_states: true,
      metric_event_deduplication: true,
      asynchronous_storage_index: true,
      provider_calls: 0,
    },
  }, null, 2))
  database.closeObservabilityDatabaseForTests()
} finally {
  try { fs.rmSync(tempHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }) } catch {}
}
