import assert from 'node:assert/strict'
import {
  createTaskPauseRequest,
  createTaskResumeControl,
  runTaskPauseControlSelfTest,
  taskPauseStatusProjection,
  updateTaskPauseProgress,
  validateTaskPauseResume,
} from '../ccm-package/dist/tasks/task-pause-control.js'

const result = runTaskPauseControlSelfTest()
assert.equal(result.pass, true, JSON.stringify(result.checks))

const task = {
  id: 'pause-flow-test', revision: 7, generation: 4, execution_attempt: 2,
  status: 'in_progress', acceptance_state: 'executing',
  workspace_snapshot_checksum: 'workspace-1',
  work_items: [{ id: 'finished', status: 'completed' }, { id: 'next', status: 'pending' }],
}
const requested = createTaskPauseRequest(task, { pendingWriterCount: 2 })
assert.equal(requested.generation, 4)
assert.equal(requested.attempt, 2)
assert.equal(requested.pauseSequence, 1)
assert.equal(createTaskPauseRequest({ ...task, pause_control: requested }).pauseSequence, 1, '重复暂停不得递增序列')

const paused = updateTaskPauseProgress({ ...task, pause_control: requested }, {
  state: 'paused', pendingWriterCount: 0, workspaceChecksum: 'workspace-1', suspendedSessionCount: 1,
})
const pausedTask = { ...task, status: 'paused', pause_control: paused }
assert.equal(taskPauseStatusProjection(pausedTask).availableActions[0]?.kind, 'resume_paused')
assert.equal(validateTaskPauseResume(pausedTask, { currentWorkspaceChecksum: 'workspace-1' }).valid, true)
assert.equal(validateTaskPauseResume(pausedTask, { currentWorkspaceChecksum: 'workspace-drift' }).valid, false)

const resumed = createTaskResumeControl(pausedTask)
assert.equal(resumed.generation, 4)
assert.equal(resumed.attempt, 2)
assert.equal(resumed.pauseSequence, 1)
assert.equal(resumed.state, 'resuming')

console.log('task pause control selftest: PASS')
