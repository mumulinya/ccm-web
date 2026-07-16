import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const scratch = path.join(root, 'scratch', 'group-coordination-chain-selftest')
if (!scratch.startsWith(path.join(root, 'scratch') + path.sep)) throw new Error('unsafe scratch path')
fs.rmSync(scratch, { recursive:true, force:true })
fs.mkdirSync(scratch, { recursive:true })
const home = path.join(scratch, 'home')
const ccmHome = path.join(home, '.cc-connect')
const frontendDir = path.join(scratch, 'frontend-project')
const backendDir = path.join(scratch, 'backend-project')
let cleanupPassedArtifacts = false
process.on('exit', () => {
  if (!cleanupPassedArtifacts) return
  for (const target of [home, frontendDir, backendDir]) fs.rmSync(target, { recursive:true, force:true })
})
for (const dir of [ccmHome, path.join(ccmHome, 'configs'), frontendDir, backendDir]) fs.mkdirSync(dir, { recursive: true })
const git = (cwd, args) => {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || `git ${args.join(' ')} failed`)
  return result.stdout.trim()
}
for (const dir of [frontendDir, backendDir]) {
  git(dir, ['init'])
  git(dir, ['config', 'user.email', 'coordination-selftest@example.invalid'])
  git(dir, ['config', 'user.name', 'Coordination Selftest'])
  fs.writeFileSync(path.join(dir, 'README.md'), `${path.basename(dir)}\n`)
  git(dir, ['add', 'README.md'])
  git(dir, ['commit', '-m', 'initial'])
}
process.env.HOME = home
process.env.USERPROFILE = home
process.env.CCM_GROUP_COORDINATION_FILE = path.join(ccmHome, 'group-coordination-requests.json')

const escapeToml = value => String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
for (const [name, workDir, agent] of [['frontend-agent', frontendDir, 'claudecode'], ['backend-agent', backendDir, 'codex']]) {
  fs.writeFileSync(path.join(ccmHome, 'configs', `config-${name}.toml`), `
language = "zh"
[[projects]]
name = "${name}"
[projects.agent]
type = "${agent}"
[projects.agent.options]
work_dir = "${escapeToml(workDir)}"
`.trimStart())
}
for (const [file, value] of [['tasks.json', []], ['groups.json', []], ['agent-qa.json', []]]) fs.writeFileSync(path.join(ccmHome, file), JSON.stringify(value, null, 2))

const require = createRequire(import.meta.url)
const collaboration = require(path.join(root, 'ccm-package', 'dist', 'modules', 'collaboration', 'collaboration.js'))
const integration = require(path.join(root, 'ccm-package', 'dist', 'integrations', 'group-coordination-mcp.js'))
const store = require(path.join(root, 'ccm-package', 'dist', 'modules', 'collaboration', 'group-coordination-store.js'))
const { McpClient } = require(path.join(root, 'ccm-package', 'dist', 'tools', 'mcp-client.js'))

const group = {
  id: 'group-business-chain',
  name: '协作链验收群',
  members: [
    { project: 'coordinator', role: 'coordinator', agent: 'coded-orchestrator' },
    { project: 'frontend-agent', agent: 'claudecode' },
    { project: 'backend-agent', agent: 'codex' },
  ],
}
fs.writeFileSync(path.join(ccmHome, 'groups.json'), JSON.stringify([group], null, 2))
const parent = collaboration.createTask({
  title: '完成订单提交流程',
  description: '前端完成订单提交，后端提供接口',
  target_project: 'frontend-agent',
  group_id: group.id,
  assign_type: 'group',
  workflow_type: 'daily_dev',
  requires_code_changes: true,
  requires_verification: true,
})
const existingBackendTask = collaboration.createTask({
  title: '后端正在处理的既有任务',
  description: '保持当前原生会话运行，用于验证协作会话不会打断它',
  target_project: 'backend-agent',
  assign_type: 'project',
  workflow_type: 'general',
  auto_execute: true,
  child_agent_isolation: 'worktree',
  requires_code_changes: true,
  requires_verification: true,
})

const context = {
  groupId: group.id,
  taskId: parent.id,
  sourceProject: 'frontend-agent',
  sourceAgentType: 'claudecode',
  sourceTaskAgentSessionId: 'tas-business-frontend',
  sourceNativeSessionId: 'native-business-frontend',
  sourceWorkDir: frontendDir,
}
const server = integration.buildGroupCoordinationMcpServerConfig(context)
const client = new McpClient(server.command, server.args, { ...server.env, CCM_GROUP_COORDINATION_FILE: process.env.CCM_GROUP_COORDINATION_FILE })
assert.equal(await client.connect(), true)
const result = await client.callTool('request_coordination', {
  kind: 'implementation',
  summary: '实现订单创建接口',
  question: '新增 POST /api/orders，返回 orderId 供前端继续联调',
  reason: '前端当前被后端接口阻塞',
  blocking: true,
  required_capabilities: ['backend', 'api'],
  target_hint: 'backend-agent',
  requested_write_paths: ['src/orders-api.ts'],
  acceptance_criteria: ['接口返回 orderId', '运行接口测试'],
  idempotency_key: 'business-chain-order-api',
})
assert.notEqual(result.isError, true)
client.disconnect()

const calls = []
const parallelEvents = []
let releaseExisting
let markExistingStarted
let markDependencyStarted
const existingRelease = new Promise(resolve => { releaseExisting = resolve })
const existingStarted = new Promise(resolve => { markExistingStarted = resolve })
const dependencyStarted = new Promise(resolve => { markDependencyStarted = resolve })
const ctx = {
  setAgentActivity() {},
  broadcastPetSpeech() {},
  toolManager: {
    buildToolPrompt() { return '' },
    buildScopeAudit() { return { mcp: [], skill: [] } },
  },
  createFileChangeSnapshot(workDir) { return { workDir } },
  getFileChanges(project, snapshot) {
    if (project === 'backend-agent' && fs.existsSync(path.join(snapshot.workDir, 'src', 'orders-api.ts'))) {
      return [{ path: 'src/orders-api.ts', agent: project, status: 'modified' }]
    }
    if (project === 'frontend-agent' && fs.existsSync(path.join(snapshot.workDir, 'orders-client.ts'))) {
      return [{ path: 'orders-client.ts', agent: project, status: 'modified' }]
    }
    return []
  },
  async callAgent(project, prompt, workDir, agentType, _timeoutMs, options = {}) {
    calls.push({ project, prompt, workDir, agentType, taskId: options.taskId, session: options.agentSession, transport: 'task-queue' })
    if (project !== 'backend-agent') throw new Error(`unexpected queued project ${project}`)
    if (options.taskId === existingBackendTask.id) {
      parallelEvents.push('existing-started')
      markExistingStarted()
      await existingRelease
      fs.mkdirSync(path.join(workDir, 'src'), { recursive: true })
      fs.writeFileSync(path.join(workDir, 'src', 'existing-task.ts'), 'export const existingTask = true\n')
      parallelEvents.push('existing-finished')
      options.onDone?.({ nativeSessionId: 'native-existing-backend', isError: false, runnerStarted: true, nativeContinuationEvidence: { nativeResumeRequested: false } })
      return `既有任务已完成。\nCCM_AGENT_RECEIPT: ${JSON.stringify({ status: 'done', summary: '既有任务已完成', actions: ['完成既有任务'], filesChanged: ['src/existing-task.ts'], verification: ['existing task test passed'], blockers: [], needs: [] })}`
    }
    parallelEvents.push('coordination-started')
    markDependencyStarted()
    const file = path.join(workDir, 'src', 'orders-api.ts')
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, "export const createOrder = () => ({ orderId: 'order-1' })\n")
    options.onDone?.({ nativeSessionId: 'native-business-backend-isolated', isError: false, runnerStarted: true, nativeContinuationEvidence: { nativeResumeRequested: false } })
    return `后端接口已实现并验证。\nCCM_AGENT_RECEIPT: ${JSON.stringify({ status: 'done', summary: 'POST /api/orders 已返回 orderId', actions: ['实现订单接口'], filesChanged: ['src/orders-api.ts'], verification: ['node --test orders-api.test.js passed'], blockers: [], needs: [] })}`
  },
  async callAgentForGroupStream(project, prompt, workDir, agentType, options = {}) {
    calls.push({ project, prompt, workDir, agentType, taskId: options.taskId, session: options.agentSession, transport: 'source-resume' })
    if (project === 'frontend-agent') {
      fs.writeFileSync(path.join(frontendDir, 'orders-client.ts'), "export const endpoint = '/api/orders'\n")
      options.onDone?.({ nativeSessionId: 'native-business-frontend', isError: false, nativeContinuationEvidence: { nativeResumeRequested: true, nativeContinuationAcknowledged: true } })
      return `已拿到后端接口并继续完成前端联调。\nCCM_AGENT_RECEIPT: ${JSON.stringify({ status: 'done', summary: '前端已接入订单接口', actions: ['接入接口'], filesChanged: ['orders-client.ts'], verification: ['frontend integration passed'], blockers: [], needs: [] })}`
    }
    throw new Error(`unexpected project ${project}`)
  },
}

const configs = [
  { name: 'frontend-agent', path: path.join(ccmHome, 'configs', 'config-frontend-agent.toml') },
  { name: 'backend-agent', path: path.join(ccmHome, 'configs', 'config-backend-agent.toml') },
]
const existingQueue = collaboration.enqueueTask(existingBackendTask.id, ctx)
assert.equal(existingQueue.queued, true)
await existingStarted
const turn = await collaboration.runGroupCoordinationBusinessChainTestTurn({
  groupId: group.id,
  group,
  sourceProject: 'frontend-agent',
  sourceOutput: '等待群聊主 Agent 协调后端实现。',
  originalPrompt: '完成订单提交流程',
  sourceWorkDir: frontendDir,
  sourceAgentType: 'claudecode',
  allowedTools: { mcp: [], skill: [] },
  configs,
  ctx,
  taskId: parent.id,
  sourceTaskAgentSessionId: context.sourceTaskAgentSessionId,
  sourceNativeSessionId: context.sourceNativeSessionId,
  qaDepth: 0,
})
await dependencyStarted
assert.deepEqual(parallelEvents.slice(0, 2), ['existing-started', 'coordination-started'])
releaseExisting()

const waitFor = async (predicate, timeoutMs = 30000) => {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const value = predicate()
    if (value) return value
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  throw new Error('coordination chain timeout')
}
await waitFor(() => store.listGroupCoordinationRequests({ groupId: group.id, taskId: parent.id })[0]?.status === 'resumed')
const rows = store.listGroupCoordinationRequests({ groupId: group.id, taskId: parent.id })
assert.equal(rows.length, 1)
assert.equal(rows[0].status, 'resumed')
assert.ok(rows[0].work_item_task_id)
const tasks = JSON.parse(fs.readFileSync(path.join(ccmHome, 'tasks.json'), 'utf8'))
const dependency = tasks.find(task => task.id === rows[0].work_item_task_id)
const refreshedParent = tasks.find(task => task.id === parent.id)
assert.equal(dependency.workflow_type, 'agent_coordination_dependency')
assert.equal(dependency.status, 'done')
assert.equal(dependency.target_project, 'backend-agent')
assert.equal(dependency.receipt.filesChanged.includes('src/orders-api.ts'), true)
assert.equal(refreshedParent.child_task_ids.includes(dependency.id), true)
assert.equal(calls[0].project, 'backend-agent')
assert.equal(calls.at(-1).project, 'frontend-agent')
assert.equal(calls[0].transport, 'task-queue')
assert.equal(calls[0].taskId, existingBackendTask.id)
assert.match(calls[1].prompt, /执行任务|协作依赖/)
assert.equal(turn.resumedOutput, '')
assert.equal(fs.existsSync(path.join(backendDir, 'src', 'orders-api.ts')), true)
assert.equal(fs.existsSync(path.join(frontendDir, 'orders-client.ts')), true)

const qaItems = JSON.parse(fs.readFileSync(path.join(ccmHome, 'agent-qa.json'), 'utf8'))
assert.equal(qaItems.some(item => item.coordination_kind === 'implementation' && item.status === 'resumed'), true)
const { getGroupMessages } = require(path.join(root, 'ccm-package', 'dist', 'modules', 'collaboration', 'storage.js'))
const messages = getGroupMessages(group.id)
assert.equal(messages.some(message => message.type === 'agent_qa_resume'), true)

const completedCoordinationQa = qaItems.find(item => item.coordination_request_id === rows[0].id)
completedCoordinationQa.status = 'answered'
fs.writeFileSync(path.join(ccmHome, 'agent-qa.json'), JSON.stringify(qaItems, null, 2))
store.updateGroupCoordinationRequest(rows[0].id, {
  status: 'merging',
  auditType: 'post_merge_restart_probe',
  auditDetail: '模拟代码已合并且 worktree 已清理后服务重启',
})
const sourceResumeCallsBeforeRecovery = calls.filter(call => call.project === 'frontend-agent').length
await collaboration.recoverGroupCoordinationDependencies(ctx)
const recoveredMergedRequest = store.listGroupCoordinationRequests({ groupId: group.id, taskId: parent.id })[0]
assert.equal(recoveredMergedRequest.status, 'resumed')
assert.equal(calls.filter(call => call.project === 'frontend-agent').length, sourceResumeCallsBeforeRecovery + 1)
assert.equal(fs.existsSync(path.join(backendDir, 'src', 'orders-api.ts')), true)

const conflictRequest = store.submitGroupCoordinationRequest({
  ...context,
  taskId: `${parent.id}-merge-conflict-probe`,
}, {
  kind: 'implementation',
  summary: '合并冲突恢复探针',
  question: '验证合并冲突不会在重启后降级为普通失败',
  targetHint: 'backend-agent',
  requestedWritePaths: ['src/conflict-probe.ts'],
  acceptanceCriteria: ['保留冲突现场'],
  idempotencyKey: 'coordination-merge-conflict-probe',
}).record
const conflictWorkItem = collaboration.createTask({
  title: '协作依赖合并冲突探针',
  description: '验证服务重启后保留 merge_conflict 状态',
  target_project: 'backend-agent',
  group_id: group.id,
  assign_type: 'project',
  workflow_type: 'agent_coordination_dependency',
  parent_task_id: `${parent.id}-merge-conflict-probe`,
  auto_execute: true,
  queue_scope: 'isolated_parallel',
  child_agent_isolation: 'worktree',
  workflow_meta: { coordination_request_id: conflictRequest.id },
})
collaboration.updateTask(conflictWorkItem.id, { status: 'failed', status_detail: '代码合并冲突，等待人工或重做处理' })
store.updateGroupCoordinationRequest(conflictRequest.id, {
  status: 'merge_conflict',
  work_item_task_id: conflictWorkItem.id,
  auditType: 'merge_conflict_probe_persisted',
  auditDetail: '合并冲突现场已保留',
})
await collaboration.recoverGroupCoordinationDependencies(ctx)
assert.equal(store.listGroupCoordinationRequests({ groupId: group.id }).find(item => item.id === conflictRequest.id)?.status, 'merge_conflict')

const restartRequest = store.submitGroupCoordinationRequest({
  ...context,
  taskId: `${parent.id}-restart-probe`,
  sourceTaskAgentSessionId: 'tas-restart-probe',
}, {
  kind: 'implementation',
  summary: '重启后继续处理库存接口依赖',
  question: '新增库存查询接口',
  targetHint: 'backend-agent',
  requestedWritePaths: ['src/inventory-api.ts'],
  acceptanceCriteria: ['返回库存数量'],
  idempotencyKey: 'coordination-restart-probe',
}).record
const restartWorkItem = collaboration.createTask({
  title: '协作依赖重启恢复探针',
  description: '验证服务重启后仍能恢复协调工作项关系',
  business_goal: '新增库存查询接口',
  target_project: 'backend-agent',
  group_id: group.id,
  assign_type: 'project',
  workflow_type: 'agent_coordination_dependency',
  parent_task_id: `${parent.id}-restart-probe`,
  auto_execute: true,
  queue_scope: 'isolated_parallel',
  child_agent_isolation: 'worktree',
  requires_code_changes: true,
  requires_verification: true,
  workflow_meta: { coordination_request_id: restartRequest.id, execution_mode: 'parallel_isolated_native_session' },
})
store.updateGroupCoordinationRequest(restartRequest.id, {
  status: 'work_item_created',
  work_item_task_id: restartWorkItem.id,
  auditType: 'restart_probe_persisted',
  auditDetail: '待执行协调关系已持久化',
})
const restartProbe = spawnSync(process.execPath, ['-e', `
process.env.HOME = ${JSON.stringify(home)};
process.env.USERPROFILE = ${JSON.stringify(home)};
process.env.CCM_GROUP_COORDINATION_FILE = ${JSON.stringify(process.env.CCM_GROUP_COORDINATION_FILE)};
const fs = require('fs');
const store = require(${JSON.stringify(path.join(root, 'ccm-package', 'dist', 'modules', 'collaboration', 'group-coordination-store.js'))});
const collaboration = require(${JSON.stringify(path.join(root, 'ccm-package', 'dist', 'modules', 'collaboration', 'collaboration.js'))});
const request = store.listGroupCoordinationRequests({ groupId: ${JSON.stringify(group.id)} }).find(item => item.id === ${JSON.stringify(restartRequest.id)});
const tasks = JSON.parse(fs.readFileSync(${JSON.stringify(path.join(ccmHome, 'tasks.json'))}, 'utf8'));
const task = tasks.find(item => item.id === request?.work_item_task_id);
if (!request || request.status !== 'work_item_created' || !task || task.status !== 'pending' || task.queue_scope !== 'isolated_parallel' || task.workflow_meta?.coordination_request_id !== request.id || typeof collaboration.recoverGroupCoordinationDependencies !== 'function') process.exit(12);
process.stdout.write(JSON.stringify({ request_id: request.id, task_id: task.id, queue_scope: task.queue_scope }));
`], { encoding: 'utf8', windowsHide: true, env: { ...process.env, HOME: home, USERPROFILE: home } })
assert.equal(restartProbe.status, 0, restartProbe.stderr || 'restart coordination relationship probe failed')
const restartState = JSON.parse(restartProbe.stdout)
assert.equal(restartState.task_id, restartWorkItem.id)

const report = {
  pass: true,
  request_id: rows[0].id,
  parent_task_id: parent.id,
  work_item_task_id: dependency.id,
  lifecycle: rows[0].audit.map(item => item.type),
  dispatch_order: calls.map(call => call.project),
  backend_file_changed: true,
  source_session_resumed: true,
  isolated_worktree_merged: true,
  existing_session_not_interrupted: parallelEvents.indexOf('coordination-started') < parallelEvents.indexOf('existing-finished'),
  parallel_events: parallelEvents,
  restart_dependency_state_preserved: true,
  post_merge_restart_resumed_without_worktree: true,
  merge_conflict_preserved_after_restart: true,
  persisted_for_replay: true,
}
fs.writeFileSync(path.join(scratch, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
for (const target of [home, frontendDir, backendDir]) {
  fs.rmSync(target, { recursive:true, force:true })
}
cleanupPassedArtifacts = true
console.log(JSON.stringify(report, null, 2))
