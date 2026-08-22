import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveTaskMutationGuard, taskMutationGuardFromSource } from '../frontend/src/utils/taskMutationGuard.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

assert.deepEqual(taskMutationGuardFromSource({}), {}, 'legacy cards must not fabricate revision 0 or generation 1')
assert.deepEqual(taskMutationGuardFromSource({ revision: 81, generation: 3 }), {
  expected_revision: 81,
  generation: 3,
})

let fetchCount = 0
const fetched = await resolveTaskMutationGuard('task-current', {}, async () => {
  fetchCount += 1
  return {
    ok: true,
    json: async () => ({ success: true, revision: 81, generation: 3, bindingChecksum: 'binding-current' }),
  }
})
assert.equal(fetchCount, 1)
assert.deepEqual(fetched, { expected_revision: 81, generation: 3, binding_checksum: 'binding-current' })

fetchCount = 0
const stale = await resolveTaskMutationGuard('task-stale', { revision: 80, generation: 3 }, async () => {
  fetchCount += 1
  return {
    ok: true,
    json: async () => ({
      success: true,
      revision: 81,
      generation: 3,
      bindingChecksum: 'binding-current',
      taskContextRevision: 20,
      taskContextChecksum: 'context-current',
      timelineSpanChecksum: 'span-current',
    }),
  }
})
assert.equal(fetchCount, 1)
assert.deepEqual(stale, {
  expected_revision: 80,
  generation: 3,
  binding_checksum: 'binding-current',
  task_context_revision: 20,
  task_context_checksum: 'context-current',
  timeline_span_checksum: 'span-current',
})

fetchCount = 0
const complete = await resolveTaskMutationGuard('task-complete', {
  revision: 81,
  generation: 3,
  bindingChecksum: 'binding-current',
  taskContextRevision: 20,
  taskContextChecksum: 'context-current',
  timelineSpanChecksum: 'span-current',
}, async () => {
  fetchCount += 1
  throw new Error('must not refresh a complete recovery guard')
})
assert.equal(fetchCount, 0)
assert.equal(complete.timeline_span_checksum, 'span-current')

const taskManager = fs.readFileSync(path.join(root, 'frontend/src/components/tasks/useTaskManager.js'), 'utf8')
assert.match(taskManager, /if \(action\.kind === 'cancel'\) return cancelTask\(task\)/, 'dashboard cancel action must reach the task cancellation flow')
assert.match(taskManager, /taskCancelBusyId/, 'task cancellation must expose an in-flight state')
assert.match(taskManager, /if \(action\.kind === 'resume'\)/, 'legacy paused dashboard actions must be routed explicitly')
assert.match(taskManager, /return resumeInterruptedTask\(task\)/, 'cancelled or interrupted dashboard actions must use the guarded recovery endpoint')

const dashboardBackend = fs.readFileSync(path.join(root, 'backend/modules/collaboration/collaboration-runtime-runtime-tools.ts'), 'utf8')
assert.match(dashboardBackend, /interruptedForRecovery/, 'the dashboard must recognize stopped tasks as recoverable')
assert.match(dashboardBackend, /kind: "resume_interrupted"/, 'the dashboard must emit the canonical interrupted recovery action')

const replayPresentationBackend = fs.readFileSync(path.join(root, 'backend/modules/collaboration/task-replay-presentation.ts'), 'utf8')
assert.match(replayPresentationBackend, /"cancelled", "canceled"/, 'cancelled tasks must expose continue-task recovery from replay')

const collaborationRoutes = fs.readFileSync(path.join(root, 'backend/modules/collaboration/collaboration-routes.ts'), 'utf8')
assert.match(collaborationRoutes, /reason: "用户安全停止任务"/, 'safe stop completion must create a recovery receipt')
assert.match(collaborationRoutes, /acceptance_state: "recovery_required"/, 'safe stop completion must preserve a recoverable task state')
assert.match(collaborationRoutes, /resumedAttemptFailed/, 'a failed recovered attempt must rotate to a fresh interruption receipt')
assert.match(collaborationRoutes, /recovery_transaction: null/, 'a failed recovered attempt must not reuse a committed recovery transaction')

const groupActions = fs.readFileSync(path.join(root, 'frontend/src/composables/useGroupTaskCardActions.js'), 'utf8')
const projectActions = fs.readFileSync(path.join(root, 'frontend/src/components/projects/useProjectManager.js'), 'utf8')
assert.match(groupActions, /resolveTaskMutationGuard\(id, card\)/)
assert.match(projectActions, /resolveTaskMutationGuard\(id, card\)/)
assert.doesNotMatch(groupActions, /Math\.max\(0, Number\(card\.revision \|\| 0\)\)/)
assert.doesNotMatch(projectActions, /Math\.max\(0, Number\(card\.revision \|\| 0\)\)/)

console.log(JSON.stringify({
  pass: true,
  dashboardCancel: true,
  dashboardResumeInterrupted: true,
  busyState: true,
  legacyGuardFallback: true,
  projectAndGroupCards: true,
}, null, 2))
