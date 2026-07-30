#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const distRoot = process.env.CCM_TEST_DIST_ROOT || process.env.CCM_BACKEND_DIST_DIR
  ? path.resolve(process.env.CCM_TEST_DIST_ROOT || process.env.CCM_BACKEND_DIST_DIR)
  : path.join(process.cwd(), 'ccm-package', 'dist')
const marketplace = require(path.join(distRoot, 'modules', 'tools', 'marketplace.js'))
const network = require(path.join(distRoot, 'tools', 'secure-public-network.js'))
const runtimeTools = require(path.join(distRoot, 'tools', 'runtime-tool-sync.js'))

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-market-v2-'))
const checks = {}
try {
  const skill = path.join(root, 'skill')
  fs.mkdirSync(skill, { recursive: true })
  fs.writeFileSync(path.join(skill, 'SKILL.md'), '---\nname: demo\n---\nDemo\n')
  fs.mkdirSync(path.join(skill, 'scripts'))
  fs.writeFileSync(path.join(skill, 'scripts', 'run.js'), 'const a = 1;\n')
  const first = marketplace.validateSkillDirectory(skill)
  fs.writeFileSync(path.join(skill, 'scripts', 'run.js'), 'const b = 1;\n')
  const second = marketplace.validateSkillDirectory(skill)
  checks.fullTreeHashCoversSupportingFiles = first.treeHash !== second.treeHash
    && first.totalBytes === second.totalBytes
    && first.manifest.some(row => row.path === 'scripts/run.js')

  const calls = []
  let ownershipCode = ''
  try {
    await marketplace.uninstallMarketplaceItemWithStore({ type: 'mcp', name: 'manual-tool' }, {
      loadInstallations: () => [],
      saveInstallations: () => calls.push('save'),
      deleteMcpTool: () => calls.push('delete'),
      reloadTools: () => calls.push('reload'),
    })
  } catch (error) {
    ownershipCode = error.code
  }
  checks.manualToolsCannotBeDeletedByMarketplace = ownershipCode === 'marketplace_ownership_required' && calls.length === 0

  const blocked = [
    '127.0.0.1', '10.0.0.1', '100.64.0.1', '169.254.169.254', '172.31.0.1',
    '192.168.1.1', '198.18.0.1', '224.0.0.1', '::1', '::ffff:127.0.0.1', 'fc00::1', 'fe80::1', 'ff02::1',
  ]
  checks.privateReservedAndMappedAddressesBlocked = blocked.every(network.isBlockedNetworkAddress)
    && !network.isBlockedNetworkAddress('8.8.8.8')

  let sensitiveQueryRejected = false
  try { await network.resolveSafePublicHttpsUrl('https://example.com/catalog.json?api_key=secret') } catch { sensitiveQueryRejected = true }
  checks.sensitiveSourceQueryRejected = sensitiveQueryRejected

  const nativeServer = runtimeTools.toMcpServer({
    command: 'unapproved-command',
    executablePath: process.execPath,
    args: ['server.mjs'],
    env: { DEMO_TOKEN: 'runtime-only' },
    marketplace: { installationId: 'mkin_demo' },
  })
  checks.childRuntimeUsesApprovedExecutable = nativeServer.command === process.execPath
    && nativeServer.args.length === 1
    && nativeServer.args[0] === 'server.mjs'
  let missingApprovedExecutableRejected = false
  try {
    runtimeTools.toMcpServer({ command: 'node', args: ['server.mjs'], marketplace: { installationId: 'mkin_demo' } })
  } catch {
    missingApprovedExecutableRejected = true
  }
  checks.marketplaceChildRuntimeFailsClosedWithoutApprovedPath = missingApprovedExecutableRejected

  const mcpClientSource = fs.readFileSync(path.join(process.cwd(), 'backend', 'tools', 'mcp-client.ts'), 'utf8')
  const toolManagerSource = fs.readFileSync(path.join(process.cwd(), 'backend', 'tools', 'tool-manager.ts'), 'utf8')
  const accessSource = fs.readFileSync(path.join(process.cwd(), 'backend', 'modules', 'system', 'api-access-control.ts'), 'utf8')
  const marketSource = fs.readFileSync(path.join(process.cwd(), 'backend', 'modules', 'tools', 'marketplace.ts'), 'utf8')
  const runtimeSource = fs.readFileSync(path.join(process.cwd(), 'backend', 'tools', 'runtime-tool-sync.ts'), 'utf8')
  const frontendSource = fs.readFileSync(path.join(process.cwd(), 'frontend', 'src', 'components', 'tools', 'ToolsConfigPanel.vue'), 'utf8')
  checks.stdioUsesShellFalse = /shell:\s*false/.test(mcpClientSource) && !/console\.error\([^\n]*stderrBuffer/.test(mcpClientSource)
  checks.remoteMcpRegisteredForMainAgents = /McpRemoteClient/.test(toolManagerSource)
    && /\(!config\.command && !config\.url\)/.test(toolManagerSource)
    && /StreamableHTTPClientTransport/.test(fs.readFileSync(path.join(process.cwd(), 'backend', 'tools', 'mcp-remote-client.ts'), 'utf8'))
  checks.childRuntimeSnapshotCarriesMarketplaceIdentity = /installationRevision\?: string/.test(runtimeSource)
    && /runtimeMcpInstallationIdentity\(tool\)/.test(runtimeSource)
    && /catalogRevision:\s*audit\.catalogRevision/.test(runtimeSource)
  checks.marketplaceApisAreAdminOnly = /marketplace\|smithery/.test(accessSource)
  checks.publicInstallationsHidePackagePath = /loadInstallations\(\)\.map\(publicInstallationRecord\)/.test(marketSource)
    && !/packagePath:\s*record\.packagePath/.test(marketSource.slice(marketSource.indexOf('function publicInstallationRecord'), marketSource.indexOf('function readJsonObject')))
  checks.frontendUsesQuarantineActivation = /finishMarketplaceTransaction/.test(frontendSource)
    && /activateTransaction/.test(frontendSource)
    && /已保存在隔离区/.test(frontendSource)
    && /历史配置待复核/.test(fs.readFileSync(path.join(process.cwd(), 'frontend', 'src', 'components', 'tools', 'ToolsConfig.template.html'), 'utf8'))
    && /isManualMarketplaceCollision/.test(frontendSource)

  assert.ok(Object.values(checks).every(Boolean), JSON.stringify(checks, null, 2))
  console.log(JSON.stringify({ ok: true, checks }, null, 2))
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
