import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-acceptance-mode-'))
process.env.CCM_TEST_AGENT_SETTINGS_FILE = path.join(scratch, 'test-agent-settings.json')
fs.writeFileSync(process.env.CCM_TEST_AGENT_SETTINGS_FILE, JSON.stringify({ version: 1, enabled: false, updated_at: '2026-07-29T00:00:00.000Z' }))

const importDist = relative => import(`${pathToFileURL(path.join(root, 'ccm-package', 'dist', relative)).href}?t=${Date.now()}-${Math.random()}`)
const policyModule = await importDist('modules/collaboration/task-acceptance-policy.js')
const selfVerificationModule = await importDist('modules/collaboration/main-agent-self-verification.js')
const taskServiceModule = await importDist('modules/collaboration/collaboration-task-service.js')
const taskServiceSource = fs.readFileSync(path.join(root, 'backend/modules/collaboration/collaboration-task-service.ts'), 'utf8')
const executorSource = fs.readFileSync(path.join(root, 'backend/modules/collaboration/collaboration-task-executor.ts'), 'utf8')
const coordinatorSource = fs.readFileSync(path.join(root, 'backend/modules/collaboration/collaboration-runtime-coordinator-review.ts'), 'utf8')

const workDir = path.join(scratch, 'project')
fs.mkdirSync(workDir, { recursive: true })
fs.writeFileSync(path.join(workDir, 'changed.txt'), 'changed')
const task = {
  id: 'task-self-verification',
  workflow_type: 'project_main_agent',
  assign_type: 'project',
  orchestration_scope: 'project_session',
  target_project: 'demo',
  project_session_id: 'pchat_demo',
  exact_session_id: 'pchat_demo',
  title: '验证真实证据门禁',
  business_goal: '完成改动并通过验证',
  acceptance_criteria: '安全验证命令成功',
  requires_code_changes: true,
  requires_verification: true,
  acceptance_mode: 'main_agent_self_verification',
  test_agent_enabled: false,
}
const policy = policyModule.buildTaskAcceptancePolicySnapshot(task)
task.acceptance_policy_snapshot = policy

const config = { enabled: true, apiUrl: 'http://mock.invalid', apiKey: 'mock', model: 'mock-model', format: 'openai-compatible', timeoutMs: 120000 }
const successfulModel = async () => ({
  summary: '真实命令和文件证据已覆盖验收标准',
  criterion_coverage: [{ criterion: '安全验证命令成功', status: 'verified', evidence_ids: ['command:demo:1'], reason: '命令退出码为0' }],
  risks: [],
  gaps: [],
  confidence: 0.99,
})
const common = {
  task,
  policy,
  acceptanceCriteria: ['安全验证命令成功'],
  changedFiles: [{ path: 'changed.txt', project: 'demo', status: 'modified' }],
  projects: [{ name: 'demo', workDir, verificationCommands: ['node -e "process.exit(0)"'] }],
  workerOutputs: ['开发 Agent声称任务已经完成'],
  semanticConfig: config,
}

const passed = await selfVerificationModule.runMainAgentSelfVerification({ ...common, semanticModelCall: successfulModel })
assert.equal(passed.canAccept, true)
assert.equal(passed.deterministic_gate.pass, true)
assert.equal(selfVerificationModule.validateMainAgentSelfVerificationReceipt(task, policy, passed).valid, true)

const inventedAccepted = await selfVerificationModule.runMainAgentSelfVerification({
  ...common,
  sourceSnapshotChecksum: 'invented-evidence-case',
  semanticModelCall: async () => ({ accepted: true, summary: '模型声称通过', criterion_coverage: [{ criterion: '安全验证命令成功', status: 'verified', evidence_ids: ['invented:evidence'], reason: '虚构证据' }], confidence: 1 }),
})
assert.equal(inventedAccepted.canAccept, false)
assert.equal(inventedAccepted.criterion_coverage[0].status, 'unverified')

const failedCommand = await selfVerificationModule.runMainAgentSelfVerification({
  ...common,
  projects: [{ name: 'demo', workDir, verificationCommands: ['node -e "process.exit(2)"'] }],
  semanticModelCall: successfulModel,
})
assert.equal(failedCommand.canAccept, false)
assert.equal(failedCommand.deterministic_gate.checks.find(item => item.id === 'verification_passed').pass, false)

const modelFailure = await selfVerificationModule.runMainAgentSelfVerification({
  ...common,
  sourceSnapshotChecksum: 'model-failure-case',
  semanticModelCall: async () => { throw new Error('mock provider unavailable') },
})
assert.equal(modelFailure.canAccept, false)
assert.equal(modelFailure.model_status, 'failed')

assert.equal(policy.mode, 'main_agent_self_verification')
assert.equal(policy.max_review_rounds, 1)
assert.equal(policyModule.validateTaskAcceptancePolicySnapshot(task, policy).valid, true)
assert.equal(policyModule.validateTaskAcceptancePolicySnapshot(task, { ...policy, mode: 'test_agent' }).valid, false)
const selfAcceptedTask = {
  ...task,
  main_agent_self_verification: passed,
  main_agent_final_acceptance: {
    schema: 'ccm-main-agent-final-acceptance-v1',
    accepted: true,
    mode: 'main_agent_self_verification',
    acceptance_policy_checksum: policy.checksum,
    review_checksum: passed.checksum,
    decided_at: new Date().toISOString(),
  },
}
assert.equal(taskServiceModule.hasStructuredTaskAcceptanceEvidence(selfAcceptedTask), true)
assert.equal(taskServiceModule.hasStructuredTaskAcceptanceEvidence({ ...selfAcceptedTask, main_agent_self_verification: inventedAccepted }), false)
assert.equal(taskServiceModule.hasStructuredTaskAcceptanceEvidence({ ...selfAcceptedTask, main_agent_final_acceptance: null }), false)

const independentTaskBase = { ...task, id: 'task-independent', acceptance_mode: 'test_agent', test_agent_enabled: true }
const independentPolicy = policyModule.buildTaskAcceptancePolicySnapshot(independentTaskBase)
const independentTask = {
  ...independentTaskBase,
  acceptance_policy_snapshot: independentPolicy,
  test_agent_review: {
    canAccept: true,
    runner: { sourceStable: true },
    invocation: { outputValidation: { valid: true }, artifactVerification: { status: 'passed' } },
  },
  main_agent_final_acceptance: {
    accepted: true,
    mode: 'test_agent',
    acceptance_policy_checksum: independentPolicy.checksum,
  },
}
assert.equal(taskServiceModule.hasStructuredTaskAcceptanceEvidence(independentTask), true)
assert.equal(taskServiceModule.hasStructuredTaskAcceptanceEvidence({ ...independentTask, test_agent_review: null }), false)
assert.match(taskServiceSource, /任务验收模式已在创建时固定/)
assert.match(executorSource, /const latestTask = loadTasks\(\)\.find/)
assert.doesNotMatch(executorSource, /isTestAgentEnabled/)
assert.match(coordinatorSource, /群聊主 Agent 自验缺少权威任务记录/)
assert.doesNotMatch(coordinatorSource, /if \(!review\) review = buildCodedCoordinatorReview/)

console.log(JSON.stringify({
  pass: true,
  checks: {
    policySnapshotImmutable: true,
    realCommandEvidencePasses: true,
    inventedEvidenceRejected: true,
    failedCommandRejected: true,
    modelFailureFailsClosed: true,
    terminalGateRequiresMatchingReceipt: true,
    independentModeRequiresTestAgentReceipt: true,
    groupUsesLatestTask: true,
    codedFallbackRemoved: true,
  },
}, null, 2))

fs.rmSync(scratch, { recursive: true, force: true })
