import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const scratch = path.join(root, 'scratch', 'internal-mcp-catalog-selftest')
fs.rmSync(scratch, { recursive: true, force: true })
fs.mkdirSync(path.join(scratch, '.cc-connect', 'mcp'), { recursive: true })
process.env.HOME = scratch
process.env.USERPROFILE = scratch
fs.writeFileSync(path.join(scratch, '.cc-connect', 'feishu-config.json'), JSON.stringify({
  control_bot_app_id: 'cli_internal_mcp_test',
  control_bot_app_secret: 'internal_mcp_test_secret',
}, null, 2))

const require = createRequire(import.meta.url)
const registry = require(path.join(root, 'ccm-package', 'dist', 'tools', 'internal-mcp-registry.js'))
const db = require(path.join(root, 'ccm-package', 'dist', 'core', 'db.js'))
const toolRoutes = require(path.join(root, 'ccm-package', 'dist', 'modules', 'tools', 'tools.js'))
const marketplace = require(path.join(root, 'ccm-package', 'dist', 'modules', 'tools', 'marketplace.js'))

const registryResult = registry.runInternalMcpRegistrySelfTest(path.join(root, 'ccm-package'))
assert.equal(registryResult.pass, true, JSON.stringify(registryResult.checks))
const arbitraryCwdProbe = spawnSync(process.execPath, ['-e', `
const registry = require(${JSON.stringify(path.join(root, 'ccm-package', 'dist', 'tools', 'internal-mcp-registry.js'))});
process.stdout.write(registry.findCcmPackageRoot());
`], { cwd: scratch, encoding: 'utf8', windowsHide: true })
assert.equal(arbitraryCwdProbe.status, 0, arbitraryCwdProbe.stderr)
assert.equal(path.resolve(arbitraryCwdProbe.stdout.trim()), path.join(root, 'ccm-package'))

const runtimeTools = db.loadMcpTools()
const bundledFeishu = runtimeTools.find(item => item.name === 'mcp-feishu')
assert.equal(bundledFeishu?.origin, 'internal')
assert.equal(bundledFeishu?.immutable, true)
assert.equal(bundledFeishu?.enabled, true)
assert.equal(fs.existsSync(bundledFeishu?.args?.[0] || ''), true)

const request = (pathname, method = 'GET', payload = null) => new Promise((resolve, reject) => {
  const req = new EventEmitter()
  req.method = method
  const response = {
    status: 200,
    headers: {},
    writeHead(status, headers) { this.status = status; this.headers = headers || {} },
    end(body = '') {
      try { resolve({ status: this.status, body: body ? JSON.parse(String(body)) : null }) }
      catch (error) { reject(error) }
    },
  }
  const handled = toolRoutes.handleToolsAndMetricsApi(pathname, req, response, { query: {} })
  if (!handled) return reject(new Error(`route not handled: ${method} ${pathname}`))
  if (method !== 'GET') queueMicrotask(() => {
    if (payload !== null) req.emit('data', Buffer.from(JSON.stringify(payload)))
    req.emit('end')
  })
})

const catalogResponse = await request('/api/tools/internal-mcp')
assert.equal(catalogResponse.status, 200)
assert.equal(catalogResponse.body.read_only, true)
const expectedInternalMcps = ['ccm__group_coordinator', 'mcp-feishu', 'ccm__task_runtime', 'ccm__knowledge_context', 'ccm__test_acceptance', 'ccm__delivery_workspace', 'ccm__task_evidence', 'ccm__permission_broker']
for (const name of expectedInternalMcps) assert.equal(catalogResponse.body.items.some(item => item.name === name), true, `catalog missing ${name}`)
assert.equal(catalogResponse.body.summary.total, 8)
assert.equal(catalogResponse.body.summary.tools, 42)
assert.equal(catalogResponse.body.items.every(item => item.protected === true && item.immutable === true), true)
assert.equal(JSON.stringify(catalogResponse.body).includes('internal_mcp_test_secret'), false)

const externalResponse = await request('/api/mcp')
assert.equal(externalResponse.body.tools.some(item => item.name === 'mcp-feishu'), false)
const editResponse = await request('/api/mcp', 'POST', { name: 'mcp-feishu', command: 'bad-command' })
assert.equal(editResponse.status, 409)
const deleteResponse = await request('/api/mcp/delete', 'POST', { name: 'mcp-feishu' })
assert.equal(deleteResponse.status, 409)
await assert.rejects(
  marketplace.installMarketplaceItemWithStore({ name: 'mcp-feishu', type: 'mcp', command: 'bad-command', source: { id: 'test', label: 'test', kind: 'direct', trust: 'custom' } }),
  /随项目安装/
)

const npmCli = process.env.npm_execpath
assert.ok(npmCli, 'npm_execpath missing')
const pack = spawnSync(process.execPath, [npmCli, 'pack', '--dry-run', '--json', '--ignore-scripts'], {
  cwd: path.join(root, 'ccm-package'),
  encoding: 'utf8',
  windowsHide: true,
})
assert.equal(pack.status, 0, pack.stderr || pack.stdout)
const packRows = JSON.parse(pack.stdout)
const packedFiles = new Set((packRows[0]?.files || []).map(item => item.path.replace(/\\/g, '/')))
const requiredPackedFiles = [
  'dist/tools/internal-mcp-registry.js',
  'dist/integrations/agent-internal-mcp.js',
  'dist/integrations/internal-mcp-runtime.js',
  'dist/integrations/internal-mcp-task-store.js',
  'dist/integrations/internal-mcp-test-store.js',
  'dist/integrations/test-acceptance-worker.js',
  'mcp-feishu/internal-mcp.json',
  'mcp-feishu/dist/index.js',
  'mcp-task-runtime/internal-mcp.json',
  'dist/integrations/task-runtime-mcp.js',
  'mcp-knowledge-context/internal-mcp.json',
  'dist/integrations/knowledge-context-mcp.js',
  'mcp-test-acceptance/internal-mcp.json',
  'dist/integrations/test-acceptance-mcp.js',
  'mcp-delivery-workspace/internal-mcp.json',
  'dist/integrations/delivery-workspace-mcp.js',
  'mcp-task-evidence/internal-mcp.json',
  'dist/integrations/task-evidence-mcp.js',
  'mcp-permission-broker/internal-mcp.json',
  'dist/integrations/permission-broker-mcp.js',
]
for (const required of requiredPackedFiles) {
  assert.equal(packedFiles.has(required), true, `npm package missing ${required}`)
}

const report = {
  pass: true,
  internal_mcp_count: catalogResponse.body.summary.total,
  tools_count: catalogResponse.body.summary.tools,
  bundled_feishu_runtime_registered: true,
  internal_mcp_hidden_from_external_catalog: true,
  edit_and_delete_protected: true,
  secrets_hidden: true,
  npm_package_contains_registry_and_manifests: true,
  package_discovery_independent_of_working_directory: true,
  packed_files_checked: requiredPackedFiles.length,
}
fs.writeFileSync(path.join(scratch, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
