import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"

const root = process.cwd()
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-test-agent-maintenance-"))
process.env.USERPROFILE = scratch
process.env.HOME = scratch
process.env.CCM_TASK_STORE_DIR = scratch

const importDist = relative => import(`${pathToFileURL(path.join(root, "ccm-package", "dist", relative)).href}?selftest=${Date.now()}-${Math.random()}`)
const db = await importDist("core/db.js")
const taskStore = await importDist("core/task-store.js")
const maintenance = await importDist("test-agent/maintenance.js")
const sentinel = "TEST_AGENT_MAINTENANCE_BODY_SENTINEL"
const identity = {
  taskId: "maintenance-task",
  scope: "project",
  scopeId: "demo-project",
  exactSessionId: "project-session-maintenance",
}

db.saveTasks([{
  id: identity.taskId,
  workflow_type: "project_main_agent",
  assign_type: "project",
  orchestration_scope: "project_session",
  target_project: identity.scopeId,
  project_session_id: identity.exactSessionId,
  exact_session_id: identity.exactSessionId,
  test_agent_review: {
    schema: "ccm-test-agent-review-v1",
    canAccept: false,
    rawOutput: sentinel,
    stdout: sentinel,
  },
}])

const handoffDir = path.join(scratch, "test-agent-handoffs")
fs.mkdirSync(handoffDir, { recursive: true })
const handoffFile = path.join(handoffDir, "maintenance-task.json")
fs.writeFileSync(handoffFile, JSON.stringify({
  schema: "ccm-test-agent-handoff-v1",
  taskId: identity.taskId,
  rawOutput: sentinel,
  prompt: sentinel,
}), "utf8")

const preview = maintenance.previewTestAgentMaintenance(identity)
assert.equal(preview.success, true)
assert.equal(preview.contentStored, false)
assert.ok(preview.affectedRecordCount >= 2)
assert.equal(JSON.stringify(preview).includes(sentinel), false)

await assert.rejects(
  async () => maintenance.applyTestAgentMaintenance({ ...identity, planChecksum: "wrong", reason: "selftest wrong checksum" }),
  /plan_missing|plan_invalid|source_drift/,
)

const applied = maintenance.applyTestAgentMaintenance({ ...identity, planChecksum: preview.planChecksum, reason: "selftest projection" })
assert.equal(applied.success, true)
assert.equal(applied.contentStored, false)
assert.equal(JSON.stringify(db.loadTasks()).includes(sentinel), false)
assert.equal(fs.readFileSync(handoffFile, "utf8").includes(sentinel), false)

const rolledBack = maintenance.rollbackTestAgentMaintenance({ jobId: applied.jobId, reason: "selftest rollback" })
assert.equal(rolledBack.success, true)
assert.equal(rolledBack.status, "rolled_back")
assert.equal(JSON.stringify(db.loadTasks()).includes(sentinel), true)
assert.equal(fs.readFileSync(handoffFile, "utf8").includes(sentinel), true)
const repeatedRollback = maintenance.rollbackTestAgentMaintenance({ jobId: applied.jobId, reason: "selftest idempotency" })
assert.equal(repeatedRollback.idempotent, true)

console.log(JSON.stringify({
  schema: "ccm-test-agent-maintenance-selftest-v1",
  pass: true,
  checks: {
    previewContainsNoBody: true,
    checksumMismatchRejected: true,
    applyProjectsTaskAndRunnerData: true,
    rollbackRestoresBackup: true,
    rollbackIsIdempotent: true,
  },
  paidProviderCalls: 0,
}, null, 2))

taskStore.closeSqliteTaskStore()
fs.rmSync(scratch, { recursive: true, force: true })
