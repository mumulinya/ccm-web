import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const outputDir = path.join(root, 'scratch', 'gemini-opencode-agent-integration-selftest')
const workDir = path.join(outputDir, 'project')
const runtimeStorageRoot = path.join(outputDir, 'runtime')
fs.rmSync(outputDir, { recursive: true, force: true })
fs.mkdirSync(workDir, { recursive: true })

const runtime = await import('../ccm-package/dist/agents/runtime.js')
const sync = await import('../ccm-package/dist/tools/runtime-tool-sync.js')
const catalog = await import('../ccm-package/dist/agents/catalog.js')

const fixtureCatalog = {
  runtimeStorageRoot,
  mcpTools: [{
    name: 'memory-context',
    enabled: true,
    command: 'node',
    args: ['memory-context-server.js'],
    env: 'CCM_SCOPE=project-session',
  }],
  skills: [],
}

const requested = { mcp: ['memory-context'], skill: [] }
const geminiAudit = sync.syncRuntimeToolsWithCatalog(workDir, 'gemini', requested, fixtureCatalog)
const openCodeAudit = sync.syncRuntimeToolsWithCatalog(workDir, 'opencode', requested, fixtureCatalog)
const geminiConfig = JSON.parse(fs.readFileSync(geminiAudit.mcpConfigPath, 'utf-8'))
const openCodeConfig = JSON.parse(fs.readFileSync(openCodeAudit.mcpConfigPath, 'utf-8'))

assert.equal(catalog.PROJECT_AGENT_TYPES.includes('gemini'), true)
assert.equal(catalog.PROJECT_AGENT_TYPES.includes('opencode'), true)
assert.equal(runtime.normalizeAgentRuntimeId('gemini-cli'), 'gemini')
assert.equal(runtime.normalizeAgentRuntimeId('open-code'), 'opencode')
assert.equal(geminiAudit.mode, 'native-and-proxy')
assert.equal(geminiAudit.errors.length, 0)
assert.equal(geminiConfig.mcp.allowed.includes('ccm__memory-context'), true)
assert.equal(geminiConfig.mcpServers['ccm__memory-context'].command, 'node')
assert.equal(openCodeAudit.mode, 'native-and-proxy')
assert.equal(openCodeAudit.errors.length, 0)
assert.deepEqual(openCodeConfig.mcp['ccm__memory-context'].command, ['node', 'memory-context-server.js'])
assert.equal(openCodeConfig.mcp['ccm__memory-context'].environment.CCM_SCOPE, 'project-session')

const geminiCommand = runtime.buildAgentCommand('gemini', 'prompt.txt', { mcpConfigPath: geminiAudit.mcpConfigPath })
const openCodeCommand = runtime.buildAgentCommand('opencode', 'prompt.txt', { mcpConfigPath: openCodeAudit.mcpConfigPath })
assert.match(geminiCommand, /cli-prompt-runner\.js/)
assert.match(openCodeCommand, /OPENCODE_CONFIG/)
assert.match(openCodeCommand, /cli-prompt-runner\.js/)

const report = {
  pass: true,
  checks: 15,
  geminiConfig: geminiAudit.mcpConfigPath,
  openCodeConfig: openCodeAudit.mcpConfigPath,
  paidProviderCalls: 0,
}
fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
