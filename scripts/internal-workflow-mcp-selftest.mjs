import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = path.resolve(import.meta.dirname, '..')
const scratch = path.join(root, 'scratch', 'internal-workflow-mcp-selftest')
fs.rmSync(scratch, { recursive: true, force: true })
fs.mkdirSync(scratch, { recursive: true })
process.env.HOME = scratch
process.env.USERPROFILE = scratch

const ccmHome = path.join(scratch, '.cc-connect')
const project = path.join(scratch, 'demo-project')
fs.mkdirSync(ccmHome, { recursive: true })
fs.mkdirSync(project, { recursive: true })
fs.writeFileSync(path.join(project, 'package.json'), `${JSON.stringify({ name: 'internal-mcp-demo', private: true, scripts: { check: 'node -e "process.stdout.write(\'check-ok\')"' } }, null, 2)}\n`)
fs.writeFileSync(path.join(project, 'README.md'), '# Demo\n')
for (const args of [['init'], ['config', 'user.email', 'ccm-test@example.com'], ['config', 'user.name', 'CCM Test'], ['add', '.'], ['commit', '-m', 'init']]) {
  const result = spawnSync('git', args, { cwd: project, encoding: 'utf8', windowsHide: true })
  assert.equal(result.status, 0, result.stderr || result.stdout)
}

const task = {
  id: 'task-internal-mcp-e2e',
  group_id: 'group-internal-mcp-e2e',
  group_session_id: 'session-internal-mcp-e2e',
  title: '内部 MCP 真实链路验证',
  business_goal: '验证任务、知识、TestAgent、交付工作区与证据 MCP 能被第三方 Agent 调用',
  acceptance_criteria: ['npm run check 成功', '任务时间线保存内部 MCP 事件'],
  target_project: 'demo-project',
  status: 'in_progress',
  workflow_timeline: [],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}
fs.writeFileSync(path.join(ccmHome, 'tasks.json'), `${JSON.stringify([task], null, 2)}\n`)
fs.writeFileSync(path.join(ccmHome, 'project-configs.json'), '{}\n')

const require = createRequire(import.meta.url)
const { McpClient } = require(path.join(root, 'ccm-package', 'dist', 'tools', 'mcp-client.js'))
const { buildTaskBoundInternalMcpServers } = require(path.join(root, 'ccm-package', 'dist', 'integrations', 'agent-internal-mcp.js'))
const { rebuildKnowledgeIndex } = require(path.join(root, 'ccm-package', 'dist', 'modules', 'knowledge', 'knowledge-index.js'))
const { storeKnowledgeBuffer } = require(path.join(root, 'ccm-package', 'dist', 'modules', 'knowledge', 'knowledge-files.js'))
const registry = require(path.join(root, 'ccm-package', 'dist', 'tools', 'internal-mcp-registry.js'))
const { syncRuntimeToolsWithCatalog } = require(path.join(root, 'ccm-package', 'dist', 'tools', 'runtime-tool-sync.js'))

storeKnowledgeBuffer('demo-guide.md', Buffer.from('# 交付规范\n\n内部 MCP 交付必须执行 npm run check，并保存任务时间线。\n'), { scope: { type: 'project', id: 'demo-project' }, visibility: 'shared', tags: ['delivery'] })
await rebuildKnowledgeIndex('internal-workflow-mcp-selftest')

const projectBinding = { name: 'demo-project', workDir: project, verificationCommands: ['npm run check'] }
const baseContext = {
  taskId: task.id,
  groupId: task.group_id,
  groupSessionId: task.group_session_id,
  agentType: 'codex',
  workDir: project,
  baseWorkDir: project,
  projects: [projectBinding],
}
const childServers = buildTaskBoundInternalMcpServers({ ...baseContext, project: 'demo-project', role: 'project-child-agent', taskAgentSessionId: 'child-session' })
const mainServers = buildTaskBoundInternalMcpServers({ ...baseContext, project: 'coordinator', role: 'group-main-agent', taskAgentSessionId: 'main-session' })
const globalServers = buildTaskBoundInternalMcpServers({ ...baseContext, groupId: '', project: 'global', role: 'global-agent', taskAgentSessionId: 'global-session' })
const testAgentServers = buildTaskBoundInternalMcpServers({ ...baseContext, project: 'demo-project', role: 'test-agent', taskAgentSessionId: 'test-session' })

const expectedChildServers = ['ccm__group_coordinator', 'ccm__task_runtime', 'ccm__knowledge_context', 'ccm__test_acceptance', 'ccm__delivery_workspace', 'ccm__task_evidence']
assert.deepEqual(Object.keys(childServers).sort(), expectedChildServers.sort())
assert.equal(Object.keys(mainServers).includes('ccm__group_coordinator'), false)
assert.equal(Object.keys(mainServers).length, 5)
assert.deepEqual(Object.keys(globalServers).sort(), ['ccm__knowledge_context', 'ccm__task_evidence', 'ccm__task_runtime'])
assert.equal(Object.keys(testAgentServers).includes('ccm__delivery_workspace'), true)
assert.equal(Object.keys(testAgentServers).includes('ccm__group_coordinator'), false)

async function connect(config) {
  const client = new McpClient(config.command, config.args, config.env)
  assert.equal(await client.connect(), true, JSON.stringify(client.getDiagnostics()))
  return client
}

async function call(client, name, args = {}) {
  const result = await client.callTool(name, args)
  assert.notEqual(result.isError, true, `${name}: ${result.content?.[0]?.text}`)
  return JSON.parse(result.content?.[0]?.text || '{}')
}

async function waitForTestRun(client, created) {
  const runId = created.run.run_id
  let status = created.run
  const deadline = Date.now() + 90_000
  while (!['completed', 'failed'].includes(status.status) && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 500))
    status = (await call(client, 'get_test_status', { run_id: runId })).run
  }
  assert.equal(status.status, 'completed', JSON.stringify(status))
  assert.ok(status.report, 'real TestAgent report missing')
  return status
}

const clients = []
try {
  const childTask = await connect(childServers.ccm__task_runtime); clients.push(childTask)
  const childTaskTools = (await childTask.listTools()).map(tool => tool.name)
  assert.equal(childTaskTools.includes('submit_delivery'), true)
  await call(childTask, 'update_todo', { summary: '开始真实链路验证', items: [{ id: 'inspect', title: '检查任务与知识', status: 'in_progress' }, { id: 'deliver', title: '提交交付证据', status: 'pending' }] })
  await call(childTask, 'report_progress', { summary: '任务上下文已读取，开始检索知识', completed: ['读取任务'], next: ['检索项目知识'], percent: 35 })
  const taskContext = await call(childTask, 'get_task_context')
  assert.equal(taskContext.task.id, task.id)
  assert.equal(taskContext.todo.items.length, 2)
  await call(childTask, 'submit_delivery', { summary: '内部 MCP 子 Agent 交付候选', files_changed: ['README.md'], verification: ['npm run check'], branch: 'ccm/demo' })
  await call(childTask, 'request_user_decision', { question: '是否保留演示证据？', options: ['保留', '清理'], recommendation: '保留', blocking: false })

  const knowledge = await connect(childServers.ccm__knowledge_context); clients.push(knowledge)
  const search = await call(knowledge, 'search_knowledge', { query: '内部 MCP 交付需要执行什么验证', limit: 4 })
  assert.equal(search.results.some(row => row.filename === 'demo-guide.md' && row.text.includes('npm run check')), true)
  const document = await call(knowledge, 'read_knowledge_document', { filename: 'demo-guide.md' })
  assert.equal(document.content.includes('保存任务时间线'), true)

  const evidence = await connect(childServers.ccm__task_evidence); clients.push(evidence)
  const timeline = await call(evidence, 'get_task_timeline', { search: '内部 MCP' })
  assert.equal(timeline.events.length >= 2, true)
  const receipts = await call(evidence, 'get_delivery_receipts')
  assert.equal(receipts.receipts.some(row => row.kind === 'delivery'), true)

  const childTest = await connect(childServers.ccm__test_acceptance); clients.push(childTest)
  const childTestTools = (await childTest.listTools()).map(tool => tool.name)
  assert.equal(childTestTools.includes('create_test_work_order'), false)
  assert.equal(childTestTools.includes('start_test_run'), false)
  assert.equal(childTestTools.includes('get_test_status'), true)

  const testAgentTask = await connect(testAgentServers.ccm__task_runtime); clients.push(testAgentTask)
  const testAgentTaskTools = (await testAgentTask.listTools()).map(tool => tool.name)
  assert.equal(testAgentTaskTools.includes('submit_delivery'), false)

  const mainTest = await connect(mainServers.ccm__test_acceptance); clients.push(mainTest)

  const childWorkspace = await connect(childServers.ccm__delivery_workspace); clients.push(childWorkspace)
  const childWorkspaceTools = (await childWorkspace.listTools()).map(tool => tool.name)
  assert.equal(childWorkspaceTools.includes('merge_approved_delivery'), false)
  assert.equal(childWorkspaceTools.includes('cleanup_delivery_worktree'), false)

  const mainWorkspace = await connect(mainServers.ccm__delivery_workspace); clients.push(mainWorkspace)
  const createdWorkspace = await call(mainWorkspace, 'create_delivery_worktree', { project: 'demo-project', purpose: '验证受控交付闭环' })
  const workspace = createdWorkspace.workspace
  fs.appendFileSync(path.join(workspace.worktree_path, 'README.md'), '\nInternal workflow MCP delivery.\n')
  const diff = await call(mainWorkspace, 'get_delivery_diff', { workspace_id: workspace.id })
  assert.equal(diff.diff.includes('Internal workflow MCP delivery'), true)
  const checks = await call(mainWorkspace, 'run_project_checks', { workspace_id: workspace.id, checks: ['check'] })
  assert.equal(checks.success, true, JSON.stringify(checks.results))
  const committed = await call(mainWorkspace, 'commit_delivery_branch', { workspace_id: workspace.id, message: 'test: internal workflow mcp delivery' })
  assert.match(committed.workspace.commit, /^[a-f0-9]{40}$/)

  const rejectedMerge = await mainWorkspace.callTool('merge_approved_delivery', { workspace_id: workspace.id, test_run_id: 'missing' })
  assert.equal(rejectedMerge.isError, true)

  const testInput = {
    projects: ['demo-project'],
    acceptance_criteria: ['npm run check 成功'],
    required_checks: ['commands'],
    verification_commands: ['npm run check'],
    browser_provider: 'none',
    require_adversarial_probe: false,
    adversarial_probe_waiver: 'This isolated command-only fixture has no external input surface to probe.',
    summary: '验证内部 MCP TestAgent 原生执行',
    start: true,
  }
  const staleCreatedTest = await call(mainTest, 'create_test_work_order', testInput)
  const staleTestStatus = await waitForTestRun(mainTest, staleCreatedTest)
  assert.equal(staleTestStatus.can_accept, true, JSON.stringify(staleTestStatus))
  const staleMerge = await mainWorkspace.callTool('merge_approved_delivery', { workspace_id: workspace.id, test_run_id: staleCreatedTest.run.run_id })
  assert.equal(staleMerge.isError, true)
  assert.match(staleMerge.content?.[0]?.text || '', /未绑定当前交付工作区和提交/)

  const createdTest = await call(mainTest, 'create_test_work_order', { ...testInput, workspace_ids: [workspace.id], summary: '验证绑定交付提交的 TestAgent 原生执行' })
  const realTestRunId = createdTest.run.run_id
  const realTestStatus = await waitForTestRun(mainTest, createdTest)
  assert.equal(realTestStatus.can_accept, true, JSON.stringify(realTestStatus))
  assert.equal(realTestStatus.delivery_bindings.some(binding => binding.workspace_id === workspace.id && binding.commit === committed.workspace.commit), true)
  const realEvidence = await call(mainTest, 'list_test_evidence')
  assert.equal(realEvidence.runs.length >= 2, true)

  const postTestMutation = path.join(workspace.worktree_path, 'post-test-mutation.txt')
  fs.writeFileSync(postTestMutation, 'changed after TestAgent acceptance\n')
  const postTestMutationMerge = await mainWorkspace.callTool('merge_approved_delivery', { workspace_id: workspace.id, test_run_id: realTestRunId })
  assert.equal(postTestMutationMerge.isError, true)
  assert.match(postTestMutationMerge.content?.[0]?.text || '', /验收后交付 worktree 出现新改动/)
  fs.unlinkSync(postTestMutation)

  const merged = await call(mainWorkspace, 'merge_approved_delivery', { workspace_id: workspace.id, test_run_id: realTestRunId })
  assert.equal(merged.workspace.status, 'merged')
  const cleaned = await call(mainWorkspace, 'cleanup_delivery_worktree', { workspace_id: workspace.id })
  assert.equal(cleaned.workspace.status, 'cleaned')
  assert.equal(fs.existsSync(workspace.worktree_path), false)

  const tampered = { ...childServers.ccm__task_runtime, env: { ...childServers.ccm__task_runtime.env, CCM_INTERNAL_MCP_CONTEXT: `${childServers.ccm__task_runtime.env.CCM_INTERNAL_MCP_CONTEXT.slice(0, -1)}x` } }
  const tamperedClient = new McpClient(tampered.command, tampered.args, tampered.env)
  assert.equal(await tamperedClient.connect(), false)
  tamperedClient.disconnect()

  const runtimeAudits = Object.fromEntries(['claudecode', 'codex', 'cursor'].map(agentType => {
    const audit = syncRuntimeToolsWithCatalog(project, agentType, { mcp: [], skill: [] }, {}, { internalMcpServers: childServers })
    assert.equal(audit.internal_mcp.length, expectedChildServers.length, `${agentType} internal MCP count`)
    assert.equal(audit.internal_mcp.every(row => row.state === 'synced' && row.protected === true), true, `${agentType} internal MCP protection`)
    assert.equal(audit.errors.length, 0, `${agentType}: ${audit.errors.join('; ')}`)
    const config = fs.readFileSync(audit.mcpConfigPath, 'utf8')
    for (const name of expectedChildServers) assert.equal(config.includes(name), true, `${agentType} config missing ${name}`)
    return [agentType, audit]
  }))

  const catalog = registry.buildInternalMcpCatalog({ packageRoot: path.join(root, 'ccm-package'), feishuConfig: {} })
  const names = new Set(catalog.items.map(item => item.name))
  for (const name of ['ccm__task_runtime', 'ccm__knowledge_context', 'ccm__test_acceptance', 'ccm__delivery_workspace', 'ccm__task_evidence']) assert.equal(names.has(name), true, `catalog missing ${name}`)
  assert.equal(catalog.summary.total, 7)
  assert.equal(catalog.summary.tools, 39)

  const report = {
    pass: true,
    internal_mcp_catalog_total: catalog.summary.total,
    internal_mcp_tools_total: catalog.summary.tools,
    task_runtime_real_calls: 5,
    knowledge_scope_and_citations: true,
    test_agent_real_background_run: { run_id: realTestRunId, status: realTestStatus.status, can_accept: realTestStatus.can_accept },
    delivery_workspace: { created: true, diff: true, checks: true, committed: true, merge_gate_rejected_without_test: true, stale_accepted_test_rejected: true, test_bound_to_workspace_and_commit: true, post_test_mutation_rejected: true, merged_after_bound_acceptance: true, cleaned: true },
    task_evidence_and_timeline: true,
    role_least_privilege: { global_has_no_test_acceptance: true, child_cannot_start_test_or_merge: true, test_agent_cannot_submit_delivery: true, group_main_owns_acceptance_and_merge: true },
    signed_context_tamper_rejected: true,
    third_party_runtime_injection: Object.fromEntries(Object.entries(runtimeAudits).map(([agentType, audit]) => [agentType, audit.internal_mcp.map(row => row.name)])),
  }
  fs.writeFileSync(path.join(scratch, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report, null, 2))
} finally {
  for (const client of clients) client.disconnect()
}
