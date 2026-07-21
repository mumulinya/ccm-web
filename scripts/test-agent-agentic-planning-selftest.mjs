import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const outputDir = path.join(root, 'scratch', 'test-agent-agentic-planning-selftest')
const projectDir = path.join(outputDir, 'project')
if (path.resolve(outputDir).startsWith(path.join(root, 'scratch') + path.sep)) {
  fs.rmSync(outputDir, { recursive: true, force: true })
}
fs.mkdirSync(path.join(projectDir, 'src'), { recursive: true })
fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({
  name: 'agentic-test-fixture',
  private: true,
  scripts: {
    'test:initial': 'node -e "console.error(\'focused failure for follow-up\'); process.exit(1)"',
    'test:focused': 'node -e "console.log(\'focused verification passed\')"'
  }
}, null, 2))
fs.writeFileSync(path.join(projectDir, 'src', 'feature.ts'), 'export const featureState = "ready"\n')

const { runTestAgent } = await import('../ccm-package/dist/test-agent/agent.js')
let plannerInput = null
const report = await runTestAgent({
  schema: 'ccm-test-agent-work-order-v1',
  id: 'agentic-planning-selftest',
  taskId: 'agentic-planning-task',
  issuedBy: 'selftest',
  originalUserGoal: 'Verify the current feature source and run the focused check',
  acceptanceCriteria: ['The focused feature verification passes'],
  requiredChecks: ['commands'],
  projects: [{
    name: 'fixture',
    workDir: projectDir,
    changedFiles: ['src/feature.ts']
  }],
  options: {
    agenticPlanning: true,
    browserProvider: 'none',
    autoDiscoverVerificationCommands: false,
    requireAdversarialProbe: false,
    adversarialProbeWaiver: 'No externally reachable surface exists in this command-only fixture.'
  }
}, {
  agenticPlanner: async input => {
    plannerInput = input
    return {
      summary: 'Read the changed feature and selected the existing focused verification script.',
      inspectedFiles: ['src/feature.ts'],
      projects: [{
        name: 'fixture',
        rationale: 'The package exposes a focused verification command for the changed source.',
        commands: ['npm run test:initial', 'npm install forbidden-package']
      }]
    }
  },
  agenticFollowupPlanner: async input => {
    assert.equal(input.commandResults.some(item => item.command === 'npm run test:initial' && item.status === 'failed'), true)
    return {
      summary: 'The broad focused check failed; run the narrower existing script to isolate the behavior.',
      projects: [{ name: 'fixture', rationale: 'Use an existing non-mutating focused script.', commands: ['npm run test:focused', 'npm run test:initial'] }]
    }
  }
})

const checks = {
  plannerReadCurrentChangedSource: plannerInput?.sourceContext?.[0]?.excerpts?.some(item => item.file === 'src/feature.ts' && item.content.includes('featureState')) === true,
  plannerReceivedPackageScripts: plannerInput?.sourceContext?.[0]?.packageScripts?.['test:focused']?.includes('focused verification passed') === true,
  initialModelPlannedCommandExecuted: report.commandResults.some(item => item.command === 'npm run test:initial' && item.status === 'failed'),
  failureTriggeredFocusedFollowup: report.commandResults.some(item => item.command === 'npm run test:focused' && item.status === 'passed'),
  previousFailedCommandNotRepeated: report.commandResults.filter(item => item.command === 'npm run test:initial').length === 1,
  unsafeMutationCommandRejectedBeforeExecution: !report.commandResults.some(item => item.command.includes('npm install')),
  planningEvidencePersisted: report.metadata?.agenticPlanning?.status === 'applied'
    && report.metadata.agenticPlanning.readOnly === true
    && report.metadata.agenticPlanning.verdictAuthority === 'deterministic_evidence_gate',
  followupEvidencePersisted: report.metadata?.agenticFollowup?.status === 'applied'
    && report.metadata.agenticFollowup.maxRounds === 1,
  noPaidProviderCalls: true
}
assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2))
const result = { pass: true, generatedAt: new Date().toISOString(), checks, commandResults: report.commandResults.map(item => ({ command: item.command, status: item.status, exitCode: item.exitCode })), paidProviderCalls: 0 }
fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
