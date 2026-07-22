import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-permission-broker-'))
const workDir = path.join(tempHome, 'project-a')
fs.mkdirSync(workDir, { recursive: true })
process.env.USERPROFILE = tempHome
process.env.HOME = tempHome

const db = require(path.join(root, 'ccm-package', 'dist', 'core', 'db.js'))
const taskStore = require(path.join(root, 'ccm-package', 'dist', 'core', 'task-store.js'))
const broker = require(path.join(root, 'ccm-package', 'dist', 'modules', 'collaboration', 'task-permission-broker.js'))
const orchestratorConfig = require(path.join(root, 'ccm-package', 'dist', 'modules', 'collaboration', 'group-orchestrator-config.js'))
let mockModelCalls = 0
const mockServer = http.createServer((req, res) => {
  mockModelCalls += 1
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ decision: 'approve', reason: '目标项目测试需要访问指定开发服务', maxUses: 1, expiresInMinutes: 10 }) } }], usage: { prompt_tokens: 20, completion_tokens: 10 } }))
})
await new Promise(resolve => mockServer.listen(0, '127.0.0.1', resolve))
const mockPort = mockServer.address().port
orchestratorConfig.saveOrchestratorConfig({ apiUrl: `http://127.0.0.1:${mockPort}/v1`, apiKey: 'mock-only', model: 'mock-permission-review', format: 'openai-compatible' })

const task = {
  id: 'task-permission-selftest',
  title: '权限审批回归',
  description: '验证主 Agent 与用户分级审批',
  assign_type: 'group',
  group_id: 'group-a',
  target_project: 'project-a',
  status: 'in_progress',
  created_at: new Date().toISOString(),
}
const globalTask = {
  ...task,
  id: 'task-permission-global-selftest',
  workflow_meta: {
    global_direct_dispatch: {
      schema: 'ccm-global-direct-dispatch-v1',
      session_id: 'global-session-selftest',
      global_run_id: 'global-run-selftest',
    },
  },
}
db.saveTasks([task, globalTask])

const context = {
  schema: 'ccm-internal-mcp-task-context-v1',
  bindingKind: 'task',
  taskId: task.id,
  groupId: 'group-a',
  groupSessionId: 'gcs_selftest',
  project: 'project-a',
  projectSessionId: '',
  role: 'project-child-agent',
  agentType: 'codex',
  taskAgentSessionId: 'tas_selftest_a',
  nativeSessionId: 'native-a',
  workDir,
  baseWorkDir: workDir,
  projects: [],
  issuedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
}

const checks = []
const check = (name, fn) => { fn(); checks.push({ name, pass: true }) }

try {
  const low = await broker.requestTaskPermission(context, { operation: 'dependency_install', command: 'npm install', paths: ['.'], reason: '安装任务要求的项目依赖' })
  check('project-contained routine permission is approved by group-main policy', () => {
    assert.equal(low.state, 'approved')
    assert.equal(low.decidedBy, 'group-main-policy')
    assert.equal(low.maxUses, 1)
  })
  const consumedLow = broker.consumeTaskPermission(context, low.id)
  check('approved grant is consumable once by the exact task Agent session', () => {
    assert.equal(consumedLow.allowed, true)
    assert.equal(consumedLow.grant.state, 'consumed')
  })
  check('consumed grant cannot be reused', () => assert.throws(() => broker.consumeTaskPermission(context, low.id), /不可用|耗尽/))

  const medium = await broker.requestTaskPermission(context, { operation: 'network_access', hosts: ['dev.internal.example'], reason: '调用目标项目的开发环境接口完成验证' })
  check('medium risk is actually adjudicated by the group-main model', () => {
    assert.equal(medium.state, 'approved')
    assert.equal(medium.decidedBy, 'group-main-agent')
    assert.equal(mockModelCalls, 1)
  })

  const commandGrant = await broker.requestTaskPermission(context, { operation: 'build', command: `node -e "process.stdout.write('approved-command-ok')"`, paths: ['.'], reason: '验证受控审批命令执行链' })
  const commandResult = await broker.executeApprovedTaskCommand(context, commandGrant.id)
  check('approved command runs through the CCM managed runner and consumes its lease', () => {
    assert.equal(commandResult.success, true)
    assert.match(commandResult.stdout, /approved-command-ok/)
    assert.equal(mockModelCalls, 2)
    assert.throws(() => broker.consumeTaskPermission(context, commandGrant.id), /不可用|耗尽/)
  })

  const high = await broker.requestTaskPermission(context, { operation: 'publish', command: 'npm publish', paths: ['.'], reason: '发布正式 npm 包' })
  check('publish bypasses group-main approval and waits for user', () => {
    assert.equal(high.risk, 'high')
    assert.equal(high.state, 'awaiting_user')
    assert.equal(high.originType, 'group')
    assert.equal(high.originSessionId, 'gcs_selftest')
  })
  const approvedByUser = broker.decideTaskPermission(high.id, { decision: 'approve', reason: '测试用户明确批准', maxUses: 1, expiresInMinutes: 5 })
  check('user decision creates a bounded lease', () => {
    assert.equal(approvedByUser.state, 'approved')
    assert.equal(approvedByUser.decidedBy, 'local-user')
    assert.equal(approvedByUser.maxUses, 1)
  })
  const siblingContext = { ...context, taskAgentSessionId: 'tas_sibling' }
  check('sibling Agent session cannot consume the grant', () => assert.throws(() => broker.consumeTaskPermission(siblingContext, high.id), /不匹配/))
  const siblingNativeContext = { ...context, nativeSessionId: 'native-sibling' }
  check('a different native Provider session cannot consume the grant', () => assert.throws(() => broker.consumeTaskPermission(siblingNativeContext, high.id), /不匹配/))
  check('exact Agent session can consume the user-approved grant', () => assert.equal(broker.consumeTaskPermission(context, high.id).allowed, true))

  const outside = await broker.requestTaskPermission(context, { operation: 'workspace_write', paths: ['../outside'], reason: '尝试修改项目外文件' })
  check('path escape always requires the user', () => {
    assert.equal(outside.risk, 'high')
    assert.equal(outside.state, 'awaiting_user')
  })

  const globalContext = { ...context, taskId: globalTask.id, taskAgentSessionId: 'tas_global', nativeSessionId: 'native-global' }
  const globalRequest = await broker.requestTaskPermission(globalContext, { operation: 'git_force_push', command: 'git push --force origin main', paths: ['.'], reason: '验证全局来源会话绑定' })
  check('global-dispatched task approval is bound to the exact originating global session', () => {
    assert.equal(globalRequest.originType, 'global')
    assert.equal(globalRequest.originSessionId, 'global-session-selftest')
    assert.equal(globalRequest.globalRunId, 'global-run-selftest')
    assert.equal(broker.listTaskPermissionRequests({ originType: 'global', originSessionId: 'global-session-selftest' }).length, 1)
    assert.equal(broker.listTaskPermissionRequests({ originType: 'global', originSessionId: 'another-session' }).length, 0)
  })

  const projectContext = {
    ...context,
    bindingKind: 'project_session',
    taskId: '',
    groupId: '',
    groupSessionId: '',
    projectSessionId: 'pcs_selftest',
    role: 'project-agent',
    taskAgentSessionId: '',
    nativeSessionId: 'project-native-a',
  }
  const projectRequest = await broker.requestTaskPermission(projectContext, { operation: 'publish', command: 'npm publish --tag selftest', paths: ['.'], reason: '验证独立项目会话权限链' })
  check('independent project Agent can request permission without a fabricated task id', () => {
    assert.equal(projectRequest.taskId, 'project-session:project-a:pcs_selftest')
    assert.equal(projectRequest.originType, 'project')
    assert.equal(projectRequest.originSessionId, 'pcs_selftest')
    assert.equal(projectRequest.originProject, 'project-a')
  })
  broker.decideTaskPermission(projectRequest.id, { decision: 'approve', reason: '项目会话回归批准', maxUses: 1, expiresInMinutes: 5 })
  check('project-session lease is consumable only by the same Provider generation', () => {
    assert.throws(() => broker.consumeTaskPermission({ ...projectContext, nativeSessionId: 'project-native-b' }, projectRequest.id), /不匹配/)
    assert.equal(broker.consumeTaskPermission(projectContext, projectRequest.id).allowed, true)
  })

  const petNotifications = []
  const feishuNotifications = []
  const notificationResult = await broker.deliverPendingTaskPermissionNotifications({
    broadcastPetSpeech: (agent, payload) => petNotifications.push({ agent, payload }),
  }, {
    notifyFeishuTaskStage: async payload => { feishuNotifications.push(payload); return { success: true } },
    sendFeishuReportMessage: async () => ({ success: true }),
  })
  const notificationIds = new Set([outside.id, globalRequest.id])
  check('user-required requests notify both the pet and Feishu with exact origin bindings', () => {
    assert.equal(notificationResult.sent, 2)
    assert.equal(petNotifications.length, 2)
    assert.equal(feishuNotifications.length, 2)
    const globalNotification = feishuNotifications.find(item => item.sessionId === 'global-session-selftest')
    assert.match(globalNotification?.markdown || '', new RegExp(`批准权限 ${globalRequest.id}`))
    assert.match(globalNotification?.markdown || '', new RegExp(`拒绝权限 ${globalRequest.id}`))
    for (const request of broker.listTaskPermissionRequests().filter(item => notificationIds.has(item.id))) {
      assert.equal(request.notificationState, 'sent')
      assert.equal(request.notificationPetSent, true)
      assert.equal(request.notificationFeishuSent, true)
    }
  })
  await broker.deliverPendingTaskPermissionNotifications({
    broadcastPetSpeech: (agent, payload) => petNotifications.push({ agent, payload }),
  }, {
    notifyFeishuTaskStage: async payload => { feishuNotifications.push(payload); return { success: true } },
  })
  check('successful notification channels are not sent twice', () => {
    assert.equal(petNotifications.length, 2)
    assert.equal(feishuNotifications.length, 2)
  })

  const listed = broker.listTaskPermissionRequests({ taskId: task.id })
  check('requests are independently auditable by exact task', () => assert.equal(listed.length, 5))
  console.log(JSON.stringify({ pass: true, checks, paid_provider_calls: 0 }, null, 2))
} catch (error) {
  console.error(error?.stack || String(error))
  process.exitCode = 1
} finally {
  await new Promise(resolve => mockServer.close(resolve))
  taskStore.closeSqliteTaskStore()
  fs.rmSync(tempHome, { recursive: true, force: true })
}
