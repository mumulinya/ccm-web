import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-project-plan-closure-'))
process.env.HOME = sandbox
process.env.USERPROFILE = sandbox
process.env.CCM_TASK_STORE_DIR = path.join(sandbox, '.cc-connect')

const ccmDir = path.join(sandbox, '.cc-connect')
const configsDir = path.join(ccmDir, 'configs')
fs.mkdirSync(configsDir, { recursive: true })
fs.writeFileSync(path.join(configsDir, 'config-demo.toml'), '[[projects]]\nname = "demo"\nwork_dir = "."\ntype = "claudecode"\n')

const importDist = relative => import(pathToFileURL(path.join(root, 'ccm-package', 'dist', relative)).href)
const sessions = await importDist('modules/projects/sessions.js')
const main = await importDist('modules/projects/project-main-agent.js')
const workflow = await importDist('agents/workflow-decision.js')
const taskStore = await importDist('core/task-store.js')

const session = sessions.createProjectSessionRecord('demo', '计划恢复验证')
const sessionId = session.sessionId
sessions.upsertProjectSessionTaskMessage('demo', sessionId, {
  id: 'revision-message-1', role: 'user', content: '调整登录流程', task_id: 'task-preview', source: 'test',
})
sessions.upsertProjectSessionTaskMessage('demo', sessionId, {
  id: 'revision-message-1', role: 'user', content: '调整登录流程', task_id: 'task-preview', source: 'test',
})
sessions.upsertProjectSessionTaskMessage('demo', sessionId, {
  id: 'project-main-task:task-preview', role: 'assistant', content: '计划中', task_id: 'task-preview',
  messageMode: 'task', taskExperience: { task_id: 'task-preview', phase: 'planning' }, source: 'test',
})
sessions.upsertProjectSessionTaskMessage('demo', sessionId, {
  id: 'project-main-task:task-preview', role: 'assistant', content: '等待确认', task_id: 'task-preview',
  messageMode: 'task', taskExperience: { task_id: 'task-preview', phase: 'paused' }, source: 'test',
})
const upsertedHistory = sessions.getSessionDetail('demo', sessionId).history
assert.equal(upsertedHistory.filter(row => row.id === 'revision-message-1').length, 1, 'same client message must be idempotent')
assert.equal(upsertedHistory.filter(row => row.task_id === 'task-preview' && row.role === 'assistant').length, 1, 'task projection must use one assistant bubble')
assert.equal(upsertedHistory.find(row => row.role === 'assistant').content, '等待确认', 'task projection must update in place')

const decision = workflow.explicitWorkflowDecision('plan_task', '测试同任务计划修订', {
  actionRequired: true,
  needsPlanning: true,
  requiresCodeChanges: true,
  requiresIndependentReview: true,
  verificationModes: ['commands'],
  riskLevel: 'write',
})
const makePlan = (title, workItemId, checksum) => ({
  schema: 'ccm-project-main-plan-v1',
  title,
  summary: `${title}摘要`,
  project: 'demo',
  projectSessionId: sessionId,
  requiresConfirmation: true,
  acceptanceCriteria: [`${title}验收`],
  acceptanceEvidencePlan: [{
    criterion: `${title}验收`, observableOutcome: `${title}结果可见`, evidenceTypes: ['command'], target: 'demo', required: true,
  }],
  verificationProfile: { tier: 'standard', changeClass: 'code', reason: '测试计划修订' },
  permissionBoundaries: ['只修改当前项目'],
  sourceEvidence: { manifestChecksum: checksum, manifestFiles: 2, selectedPaths: ['src/app.ts'], rejectedPaths: [], totalChars: 120, truncated: false },
  runtimeEvidence: { manifestChecksum: '', profiles: 0, toolCalls: [] },
  workItems: [{ id: workItemId, title, objective: `${title}目标`, acceptanceCriteria: [`${title}验收`], dependsOn: [], status: 'pending', attempts: 0 }],
  createdAt: new Date().toISOString(),
})

const originalPlan = makePlan('原计划', 'original-step', 'source-a')
const created = main.createProjectMainTask({
  project: 'demo', projectSessionId: sessionId, projectMainRunId: 'run-plan-closure', userMessage: '完成登录功能', plan: originalPlan, workflowDecision: decision,
})
let plannerCalls = 0
const revisedPlan = makePlan('修订计划', 'revised-step', 'source-b')
const firstRevision = await main.reviseProjectMainTask({
  taskId: created.id,
  project: 'demo',
  projectSessionId: sessionId,
  feedback: '增加退出登录验收',
  clientMessageId: 'revision-client-1',
  planBuilder: async () => { plannerCalls += 1; return revisedPlan },
})
assert.equal(firstRevision.task.id, created.id, 'revision must preserve the original task id')
assert.equal(firstRevision.task.work_items[0].id, 'revised-step', 'successful revision must replace executable work items')
assert.equal(firstRevision.task.plan_revisions.length, 1, 'successful revision must append history')
assert.equal(firstRevision.task.intake_state, 'awaiting_confirmation', 'revised plan must wait for confirmation')

const duplicateRevision = await main.reviseProjectMainTask({
  taskId: created.id,
  project: 'demo',
  projectSessionId: sessionId,
  feedback: '增加退出登录验收',
  clientMessageId: 'revision-client-1',
  planBuilder: async () => { plannerCalls += 1; return makePlan('不应执行', 'wrong-step', 'source-wrong') },
})
assert.equal(duplicateRevision.duplicate, true, 'same client message id must return the existing revision')
assert.equal(plannerCalls, 1, 'idempotent duplicate must not call the planning model again')

await assert.rejects(() => main.reviseProjectMainTask({
  taskId: created.id,
  project: 'demo',
  projectSessionId: sessionId,
  feedback: '这个调整会失败',
  clientMessageId: 'revision-client-failed',
  planBuilder: async () => { throw new Error('mock planner unavailable') },
}), /mock planner unavailable/)
const afterFailure = main.getProjectMainTask(created.id)
assert.equal(afterFailure.workflow_meta.project_main_plan.title, '修订计划', 'failed revision must preserve the last valid plan')
assert.equal(afterFailure.work_items[0].id, 'revised-step', 'failed revision must preserve executable work items')
assert.equal(afterFailure.plan_revisions.length, 1, 'failed revision must not append false history')
assert.equal(afterFailure.plan_revision_pending, null, 'failed revision must clear transient pending state')

const publicTask = main.projectMainTaskPublic(afterFailure)
assert.equal(publicTask.message_id, `project-main-task:${created.id}`, 'public task must expose a stable message id')
assert.equal(publicTask.plan_revision_count, 1, 'public task must expose revision count for recovery')
assert.equal(publicTask.acceptance_mode, 'test_agent', 'public task must preserve the configured acceptance role')

taskStore.closeSqliteTaskStore?.()
for (let attempt = 0; attempt < 5; attempt += 1) {
  try { fs.rmSync(sandbox, { recursive: true, force: true }); break } catch {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 40 * (attempt + 1))
  }
}

console.log('project plan production closure self-test passed')
