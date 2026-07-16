import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = path.resolve(import.meta.dirname, '..')
const scratch = path.join(root, 'scratch', 'group-coordination-mcp-selftest')
if (!scratch.startsWith(path.join(root, 'scratch') + path.sep)) throw new Error('unsafe scratch path')
fs.rmSync(scratch, { recursive:true, force:true })
fs.mkdirSync(scratch, { recursive:true })
const storeFile = path.join(scratch, 'group-coordination-requests.json')
const workDir = path.join(scratch, 'work')
const runtimeRoot = path.join(scratch, 'runtime')
fs.mkdirSync(workDir, { recursive: true })
process.env.CCM_GROUP_COORDINATION_FILE = storeFile

const require = createRequire(import.meta.url)
const integration = require(path.join(root, 'ccm-package', 'dist', 'integrations', 'group-coordination-mcp.js'))
const store = require(path.join(root, 'ccm-package', 'dist', 'modules', 'collaboration', 'group-coordination-store.js'))
const { McpClient } = require(path.join(root, 'ccm-package', 'dist', 'tools', 'mcp-client.js'))
const runtimeTools = require(path.join(root, 'ccm-package', 'dist', 'tools', 'runtime-tool-sync.js'))

const context = {
  groupId: 'group-mcp-selftest',
  taskId: 'task-mcp-selftest',
  groupSessionId: 'gcs-mcp-selftest',
  sourceProject: 'frontend-agent',
  sourceAgentType: 'claudecode',
  sourceTaskAgentSessionId: 'tas-mcp-selftest',
  sourceNativeSessionId: 'native-mcp-selftest',
  sourceWorkDir: workDir,
}
const server = integration.buildGroupCoordinationMcpServerConfig(context)
const client = new McpClient(server.command, server.args, { ...server.env, CCM_GROUP_COORDINATION_FILE: storeFile })
assert.equal(await client.connect(), true, 'real stdio MCP server should initialize')
const toolNames = (await client.listTools()).map(tool => tool.name).sort()
assert.deepEqual(toolNames, ['get_coordination_status', 'report_blocker', 'request_coordination', 'request_review'])

const args = {
  kind: 'implementation',
  summary: '新增订单创建接口供前端联调',
  question: '实现 POST /api/orders 并返回 orderId',
  reason: '前端提交流程被接口阻塞',
  blocking: true,
  required_capabilities: ['api', 'backend'],
  target_hint: 'backend-agent',
  evidence: ['src/orders/client.ts'],
  acceptance_criteria: ['返回 201', '响应包含 orderId'],
  requested_write_paths: ['src/orders/api.ts'],
  idempotency_key: 'mcp-selftest-order-api',
}
const first = await client.callTool('request_coordination', args)
const second = await client.callTool('request_coordination', args)
assert.notEqual(first.isError, true)
assert.notEqual(second.isError, true)
const firstPayload = JSON.parse(first.content[0].text)
const secondPayload = JSON.parse(second.content[0].text)
assert.equal(firstPayload.request_id, secondPayload.request_id, 'idempotency should return the original request')
assert.equal(secondPayload.deduplicated, true)
const review = await client.callTool('request_review', {
  summary: '复核订单接口失败分支',
  question: '确认接口测试是否覆盖无权限和参数错误',
  evidence: ['tests/orders-api.test.ts'],
  required_capabilities: ['test'],
  idempotency_key: 'mcp-selftest-review',
})
assert.notEqual(review.isError, true)
const blocker = await client.callTool('report_blocker', {
  summary: '生产支付密钥需要用户确认',
  reason: '子 Agent 不能代替用户批准高风险凭据',
  evidence: ['docs/payment-setup.md'],
  needs_user: true,
  idempotency_key: 'mcp-selftest-risk',
})
assert.notEqual(blocker.isError, true)
const status = await client.callTool('get_coordination_status', {})
assert.equal(JSON.parse(status.content[0].text).requests.length, 3)
client.disconnect()

const submitted = store.listGroupCoordinationRequests(context)
assert.equal(submitted.length, 3)
const implementationRequest = submitted.find(row => row.kind === 'implementation')
assert.ok(implementationRequest)
assert.equal(implementationRequest.status, 'submitted')
assert.equal(implementationRequest.source_task_agent_session_id, context.sourceTaskAgentSessionId)
assert.equal(submitted.some(row => row.kind === 'review'), true)
assert.equal(submitted.some(row => row.kind === 'risk'), true)
const claimed = store.claimSubmittedGroupCoordinationRequests(context, 'group-main-selftest')
assert.equal(claimed.length, 3)
assert.equal(claimed.every(row => row.status === 'triaged'), true)
store.updateGroupCoordinationRequest(implementationRequest.id, { status: 'resolved', auditType: 'selftest_resolved', auditDetail: 'verified' })

const restartProbe = spawnSync(process.execPath, ['-e', `
process.env.CCM_GROUP_COORDINATION_FILE = ${JSON.stringify(storeFile)};
const store = require(${JSON.stringify(path.join(root, 'ccm-package', 'dist', 'modules', 'collaboration', 'group-coordination-store.js'))});
const rows = store.listGroupCoordinationRequests({ groupId: 'group-mcp-selftest' });
const target = rows.find(row => row.kind === 'implementation');
if (rows.length !== 3 || !target || target.status !== 'resolved') process.exit(9);
process.stdout.write(target.id);
`], { encoding: 'utf8', windowsHide: true })
assert.equal(restartProbe.status, 0, restartProbe.stderr || 'restart persistence probe failed')
assert.equal(restartProbe.stdout.trim(), implementationRequest.id)

const runtimeResults = {}
for (const runtime of ['claudecode', 'cursor', 'codex', 'gemini', 'qoder']) {
  const audit = runtimeTools.syncRuntimeToolsWithCatalog(workDir, runtime, { mcp: [], skill: [] }, {
    runtimeStorageRoot: runtimeRoot,
    codexGateway: { apiUrl:'https://gateway.example.invalid/v1', apiKey:'selftest-only', model:'selftest-model', linkAuth:false },
    mcpTools: [],
    skills: [],
  }, {
    internalMcpServers: { [integration.GROUP_COORDINATION_MCP_SERVER_NAME]: server },
  })
  assert.equal(audit.mode, 'native-and-proxy', `${runtime} should accept the protected MCP`) 
  assert.equal(audit.internal_mcp?.[0]?.state, 'synced', `${runtime} should report internal MCP synced`)
  const configText = fs.readFileSync(audit.mcpConfigPath, 'utf8')
  assert.match(configText, /ccm__group_coordinator/)
  assert.match(configText, /CCM_GROUP_COORDINATION_CONTEXT/)
  runtimeResults[runtime] = { snapshot: audit.snapshotId, config: path.relative(root, audit.mcpConfigPath), isolation: audit.isolation }
}

const report = {
  pass: true,
  protocol: 'real-json-rpc-stdio-mcp',
  tools: toolNames,
  idempotency: true,
  restart_persistence: true,
  task_session_bound: true,
  protected_runtime_injection: runtimeResults,
  request_id: implementationRequest.id,
  store: path.relative(root, storeFile),
}
fs.writeFileSync(path.join(scratch, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
for (const target of [runtimeRoot, workDir, storeFile, `${storeFile}.bak`]) {
  fs.rmSync(target, { recursive:true, force:true })
}
console.log(JSON.stringify(report, null, 2))
