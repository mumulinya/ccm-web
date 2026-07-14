import assert from 'node:assert/strict'
import {
  aggregateCronRunStatus,
  normalizeCronRunHistory,
  runCronRunHistoryContractSelfTest,
} from '../ccm-package/dist/modules/scheduling/cron-job-store.js'

const contract = runCronRunHistoryContractSelfTest()
assert.equal(contract.pass, true)
assert.equal(aggregateCronRunStatus({ a: { status: 'done' }, b: { status: 'queued' } }), 'queued')
assert.equal(aggregateCronRunStatus({ a: { status: 'done' }, b: { status: 'failed' } }), 'failed')
const rows = normalizeCronRunHistory({
  id: 'job',
  run_history: Array.from({ length: 45 }, (_, index) => ({ id: `run-${index}`, started_at: new Date(2026, 0, index + 1).toISOString(), status: 'done' }))
})
assert.equal(rows.length, 40)
assert.equal(rows[0].id, 'run-44')
console.log(JSON.stringify({ pass: true, contract, retainedRuns: rows.length }, null, 2))
