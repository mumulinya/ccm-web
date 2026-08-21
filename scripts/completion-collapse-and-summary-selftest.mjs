import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const summary = require('../ccm-package/dist/system/completion-summary.js')
const events = require('../ccm-package/dist/system/user-visible-agent-events.js')

const success = summary.buildCcmCompletionSummary({
  source: 'terminal_gate',
  status: 'success',
  terminalGate: { passed: true, accepted: true },
  text: '已完成实现',
  fileChanges: [{ path: 'src/example.ts', additions: 4, deletions: 2 }],
  verification: [{ status: 'passed' }, { passed: true }],
  durationMs: 250,
})
assert.equal(success.schema, 'ccm-completion-summary-v1')
assert.equal(success.status, 'success')
assert.equal(success.filesChanged, 1)
assert.equal(success.additions, 4)
assert.equal(success.deletions, 2)
assert.equal(success.verificationPassed, 2)
assert.equal(success.contentStored, false)

const blocked = summary.buildCcmCompletionSummary({
  source: 'terminal_gate',
  status: 'blocked',
  terminalGate: { passed: false, accepted: false },
  blockers: ['等待权限确认'],
})
assert.equal(blocked.status, 'blocked')
assert.equal(blocked.blockers[0], '等待权限确认')
assert.equal(blocked.contentStored, false)

const failed = summary.buildCcmCompletionSummary({
  source: 'terminal_gate',
  status: 'failed',
  terminalGate: { passed: false },
  blockers: ['验证命令失败'],
})
assert.equal(failed.status, 'failed')

const result = events.buildUserVisibleAgentResult({
  source: 'terminal_gate',
  terminalGate: { passed: true, accepted: true },
  text: '交付完成',
  fileChanges: [{ path: 'README.md', additions: 1, deletions: 0 }],
  verification: [{ status: 'passed' }],
})
assert.equal(result.completionSummary.schema, 'ccm-completion-summary-v1')
assert.equal(result.completionSummary.source, 'terminal_gate')
assert.equal(result.completionSummary.filesChanged, 1)
assert.equal(result.contentStored, false)

const transcript = fs.readFileSync('frontend/src/components/common/AgentExecutionTranscript.vue', 'utf8')
for (const marker of [
  'terminalCollapseKey',
  'handledTerminalCollapseKey',
  'completionSummaryVisible',
  'presentation === \'completed\') return isTerminal.value && !!resultEvent.value',
  'transcriptExpanded.value = false',
  'cc-completion-summary',
]) {
  assert.ok(transcript.includes(marker), `缺少完成态投影标记: ${marker}`)
}
assert.equal(transcript.includes('raw stdout'), false)

console.log('completion collapse and summary self-test passed')
