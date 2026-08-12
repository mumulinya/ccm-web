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
  throw new Error('must not refresh a complete stale guard')
})
assert.equal(fetchCount, 0)
assert.deepEqual(stale, { expected_revision: 80, generation: 3 })

const taskManager = fs.readFileSync(path.join(root, 'frontend/src/components/tasks/useTaskManager.js'), 'utf8')
assert.match(taskManager, /if \(action\.kind === 'cancel'\) return cancelTask\(task\)/, 'dashboard cancel action must reach the task cancellation flow')
assert.match(taskManager, /taskCancelBusyId/, 'task cancellation must expose an in-flight state')

const groupActions = fs.readFileSync(path.join(root, 'frontend/src/composables/useGroupTaskCardActions.js'), 'utf8')
const projectActions = fs.readFileSync(path.join(root, 'frontend/src/components/projects/useProjectManager.js'), 'utf8')
assert.match(groupActions, /resolveTaskMutationGuard\(id, card\)/)
assert.match(projectActions, /resolveTaskMutationGuard\(id, card\)/)
assert.doesNotMatch(groupActions, /Math\.max\(0, Number\(card\.revision \|\| 0\)\)/)
assert.doesNotMatch(projectActions, /Math\.max\(0, Number\(card\.revision \|\| 0\)\)/)

console.log(JSON.stringify({
  pass: true,
  dashboardCancel: true,
  busyState: true,
  legacyGuardFallback: true,
  projectAndGroupCards: true,
}, null, 2))
