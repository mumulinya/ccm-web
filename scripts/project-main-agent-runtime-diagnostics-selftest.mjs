import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const compiled = path.join(root, 'ccm-package/dist/modules/projects/project-main-agent-runtime-diagnostics.js')
assert.ok(fs.existsSync(compiled), '请先运行 npm run build:backend')

const diagnostics = await import(`${pathToFileURL(compiled).href}?selftest=${Date.now()}`)
const contract = diagnostics.runProjectRuntimeDiagnosticsContractSelfTest()
const source = fs.readFileSync(path.join(root, 'backend/modules/projects/project-main-agent-runtime-diagnostics.ts'), 'utf8')
const mainAgent = fs.readFileSync(path.join(root, 'backend/modules/projects/project-main-agent.ts'), 'utf8')
const runtimeReplayStart = mainAgent.indexOf('type: "project_main_runtime_diagnostics"')
const runtimeReplayBlock = runtimeReplayStart >= 0 ? mainAgent.slice(runtimeReplayStart, runtimeReplayStart + 1800) : ''
const sanitized = diagnostics.sanitizeProjectRuntimeLog([
  '\u001b[31mSpring Boot failed\u001b[0m',
  'password=lzy123167',
  'Authorization: Bearer private.jwt.token',
  'https://admin:private@example.com/api',
].join('\n'))

const checks = {
  contract: contract.success === true,
  stripsAnsi: sanitized.includes('Spring Boot failed') && !sanitized.includes('\u001b'),
  redactsSecrets: !sanitized.includes('lzy123167')
    && !sanitized.includes('private.jwt.token')
    && !sanitized.includes(':private@'),
  modelCannotChooseProject: diagnostics.PROJECT_RUNTIME_DIAGNOSTIC_TOOL_SPECS.every(tool => {
    const properties = tool.inputSchema?.properties || {}
    return !Object.prototype.hasOwnProperty.call(properties, 'project')
  }),
  boundedLogRead: source.includes('const MAX_LOG_LINES = 600')
    && source.includes('const MAX_LOG_CHARS = 36_000')
    && source.includes('sanitized.slice(-MAX_LOG_CHARS)'),
  canonicalRuntimeServiceOnly: source.includes('getProjectRuntimeSnapshot(project)')
    && source.includes('getProjectRuntimeLogs(manifest.project, profileId, kind, lines)')
    && !source.includes('fs.readFileSync'),
  exactProfileGate: source.includes('manifest.profiles.find(item => item.id === profileId)')
    && source.includes('运行配置不属于当前项目'),
  modelDrivenToolSelection: mainAgent.includes('hydrateProjectRuntimeDiagnostics({')
    && mainAgent.includes('PROJECT_RUNTIME_DIAGNOSTIC_TOOL_SPECS')
    && mainAgent.includes('toolRequests'),
  planningAndAnalysisReceiveEvidence: mainAgent.includes('current_project_runtime: runtimeHydration.prompt')
    && mainAgent.includes('runtimeEvidence = runtimeHydration.prompt'),
  contextAccountingClassifiesResults: mainAgent.includes('mcpResults: [runtimeHydration.prompt, configuredToolHydration.prompt]')
    && mainAgent.includes('mcpResults: [runtimeEvidence, toolEvidence].filter(Boolean).join'),
  replayPersistsMetadataOnly: runtimeReplayBlock.includes('data: { runtime_evidence: input.plan.runtimeEvidence }')
    && runtimeReplayBlock.includes('input.plan.runtimeEvidence.toolCalls')
    && !runtimeReplayBlock.includes('runtimeHydration.prompt'),
}

for (const [name, pass] of Object.entries(checks)) {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`)
}
assert.deepEqual(Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name), [])
console.log(`Project main Agent runtime diagnostics self-test passed (${Object.keys(checks).length} checks); paid provider calls: 0.`)
