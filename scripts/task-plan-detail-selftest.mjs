import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { runTaskPlanDetailSelfTest } = require('../ccm-package/dist/modules/collaboration/task-plan-detail.js')
const result = runTaskPlanDetailSelfTest()
assert.equal(result.success, true, JSON.stringify(result.checks, null, 2))
console.log(JSON.stringify({ schema: 'ccm-task-plan-detail-selftest-v1', pass: true, checks: result.checks }, null, 2))
