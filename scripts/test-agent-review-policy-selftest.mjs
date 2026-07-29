import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const policyModule = await import(pathToFileURL(
  path.join(root, 'ccm-package/dist/modules/collaboration/test-agent-review-policy.js'),
).href)

const contract = policyModule.runTestAgentReviewPolicySelfTest()
const implementationFailure = policyModule.classifyTestAgentReview({
  report: {
    commandResults: [{ command: 'npm run check', status: 'failed' }],
  },
})
const environmentFailure = policyModule.classifyTestAgentReview({
  runner: { status: 'timed_out' },
  verdict: { needsRework: true },
})
const evidenceRecheck = policyModule.classifyTestAgentReview({
  report: {
    acceptanceCoverage: [{ criterion: '页面保存结果可见', status: 'unknown' }],
  },
})
const criticalPolicy = policyModule.deriveTestAgentReviewPolicy({
  profile: { tier: 'critical', changeClass: 'critical', reason: '发布权限变更' },
  workflowDecision: { riskLevel: 'high', requiresCodeChanges: true, verificationModes: ['release'] },
  evidencePlan: [{
    criterion: '未授权用户不能发布',
    observableOutcome: '发布接口拒绝未授权请求',
    evidenceTypes: ['http'],
    target: '发布接口',
  }],
})

const checks = {
  builtInContract: contract.pass === true,
  implementationFailureRoutesToDeveloper: implementationFailure.route === 'implementation_rework',
  environmentWinsOverGenericRework: environmentFailure.route === 'environment',
  unknownEvidenceRoutesToTestAgent: evidenceRecheck.route === 'test_agent_recheck',
  criticalPolicyCannotBeDowngraded: criticalPolicy.tier === 'critical'
    && criticalPolicy.requireAdversarialProbe === true
    && criticalPolicy.httpEnabled === true,
}

for (const [name, pass] of Object.entries(checks)) {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`)
}
if (!Object.values(checks).every(Boolean)) process.exit(1)
console.log(`TestAgent review policy self-test passed (${Object.keys(checks).length} checks).`)
