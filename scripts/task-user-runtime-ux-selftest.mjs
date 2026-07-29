import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const distModule = path.join(root, 'ccm-package', 'dist', 'agents', 'task-user-runtime.js')
assert.ok(fs.existsSync(distModule), 'build:backend must create the task user runtime projection')

const runtime = await import(pathToFileURL(distModule).href)
const selfTest = runtime.runTaskUserRuntimeSelfTest()
assert.equal(selfTest.pass, true, JSON.stringify(selfTest.checks))
const journeyModule = await import(pathToFileURL(path.join(root, 'frontend', 'src', 'utils', 'taskJourneyPresentation.js')).href)
const globalRole = journeyModule.buildTaskRolePresentation('global', 'executing')
const projectRole = journeyModule.buildTaskRolePresentation('project', 'executing')
const groupRole = journeyModule.buildTaskRolePresentation('group', 'testing')
const projectSelfVerificationRole = journeyModule.buildTaskRolePresentation('project', 'testing', {
  acceptance_mode: 'main_agent_self_verification',
  test_agent_enabled: false,
})
assert.equal(globalRole.phaseMeta.label, '正在跟踪下游执行')
assert.deepEqual(globalRole.stages, ['理解需求', '确定执行位置', '创建或拆分任务', '派发与排队', '跟踪下游', '汇总交付'])
assert.equal(globalRole.stages.some(label => /开发|TestAgent/.test(label)), false)
assert.equal(projectRole.phaseMeta.label, '正在开发')
assert.equal(projectRole.stages.includes('TestAgent（独立验收）'), true)
assert.equal(groupRole.phaseMeta.label, '正在验收')
assert.equal(projectSelfVerificationRole.stages.includes('主 Agent自验'), true)
assert.equal(projectSelfVerificationRole.stages.some(label => /TestAgent|独立验收/.test(label)), false)
assert.equal(journeyModule.taskStageLabelForContext('TestAgent（独立验收）', 'global'), '核对下游验收')
assert.equal(journeyModule.taskStageLabelForContext('TestAgent（独立验收）', 'project'), 'TestAgent（独立验收）')
assert.equal(journeyModule.taskStageLabelForContext('TestAgent（独立验收）', 'project', { test_agent_enabled: false }), '主 Agent自验')

const cases = [
  [{ status: 'in_progress', acceptance_state: 'executing' }, 'executing'],
  [{ status: 'reviewing', acceptance_state: 'test_agent_running' }, 'testing'],
  [{ status: 'in_progress', acceptance_state: 'reworking' }, 'reworking'],
  [{ status: 'reviewing', acceptance_state: 'main_agent_accepting' }, 'accepting'],
  [{ status: 'blocked', acceptance_state: 'environment_blocked' }, 'environment_blocked'],
  [{ status: 'blocked', acceptance_state: 'recovery_required' }, 'recovery_required'],
  [{ status: 'done', acceptance_state: 'accepted' }, 'completed'],
]
for (const [task, expected] of cases) {
  assert.equal(runtime.buildTaskUserRuntimeStatus(task).phase, expected, `phase projection must preserve ${expected}`)
}

const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')
const serverSource = read('backend/server.ts')
const projectUiSource = read('frontend/src/components/projects/useProjectManager.js')
const summarySource = read('frontend/src/components/tasks/TaskExperienceSummary.vue')
const detailSource = read('frontend/src/components/tasks/TaskExperienceDetail.vue')
const replaySource = read('frontend/src/utils/taskReplayEventCompaction.js')
const journeySource = read('frontend/src/utils/taskJourneyPresentation.js')
const globalRuntimeSource = read('backend/modules/global/global-agent-agentic-runtime.ts')
const globalLoopSource = read('backend/agents/global/global-agent-loop-engine.ts')
const feishuSource = read('backend/modules/global/global-agent-feishu-channel.ts')

assert.match(serverSource, /type:\s*"task_heartbeat"/, 'project stream must publish structured task heartbeats')
assert.match(projectUiSource, /data\.type === 'task_runtime' \|\| data\.type === 'task_heartbeat'/, 'project chat must consume task heartbeats')
assert.match(summarySource, /useTaskRuntimeStatus/, 'shared summary must use live runtime status')
assert.match(summarySource, /下一步/, 'shared summary must expose an actionable next step')
assert.match(detailSource, /TestAgent（独立验收）/, 'details must identify independent TestAgent acceptance')
assert.match(detailSource, /执行计划/, 'details must expose the model plan as a first-level section')
assert.match(detailSource, /\/api\/tasks\/replay\?task_id=/, 'details must lazily hydrate the complete replay plan')
assert.match(detailSource, /完整计划暂时无法读取/, 'details must keep an explicit fallback when replay loading fails')
assert.match(detailSource, /overview-live/, 'details must expose live activity')
assert.match(journeySource, /buildTaskSourceCoverage/, 'task journey must expose real source coverage')
assert.match(journeySource, /buildTaskIntervention/, 'task journey must expose strong user intervention')
assert.match(journeySource, /buildTaskReworkOverview/, 'task journey must compact rework rounds')
assert.match(globalRuntimeSource, /sourceExecutionGate/, 'global execution must fail closed when required sources are unread')
assert.match(globalLoopSource, /tool-clarification/, 'source and tool preconditions must pause in the original run')
assert.match(feishuSource, /formatFeishuTaskJourney/, 'Feishu and Web must share the same user-facing task semantics')
assert.match(replaySource, /RETRY_CATEGORY/, 'task replay must recognize retry records')
assert.match(replaySource, /return 'retry'/, 'task replay must compact repeated retries into a user-facing group')

console.log('task user runtime UX self-test passed')
