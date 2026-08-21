import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const transcript = read('frontend/src/components/common/AgentExecutionTranscript.vue')
const taskSummary = read('frontend/src/components/tasks/TaskExperienceSummary.vue')
const design = read('frontend/src/styles/design-system.css')

assert.match(transcript, /assistant_progress/, 'transcript must render assistant progress events')
assert.match(transcript, /agent-progress-row/, 'assistant progress must be a first-class timeline row')
assert.match(transcript, /toolCallId|toolCallIds/, 'tool rows must retain tool call pairing metadata')
assert.match(transcript, /aria-live/, 'live progress must be announced accessibly')
assert.match(transcript, /aria-expanded/, 'execution disclosure must remain keyboard accessible')
assert.match(transcript, /\.cc-execution\.live/, 'live execution styling must be explicit')
assert.match(transcript, /\.cc-execution\.complete/, 'completed execution styling must be explicit')
assert.match(transcript, /--execution-active-accent/, 'timeline must use semantic execution variables')
assert.match(taskSummary, /var\(--execution-(?:surface|divider|text)/, 'task summary must share execution surface tokens')
for (const name of [
  '--execution-surface', '--execution-divider', '--execution-text-primary',
  '--execution-text-secondary', '--execution-text-muted', '--execution-active-accent',
  '--execution-success-accent', '--execution-warning-accent', '--execution-row-height',
  '--execution-indent',
]) assert.match(design, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `${name} must be defined`)

assert.doesNotMatch(transcript, /rawPrompt|hiddenReasoning|PRIVATE_HANDOFF_SENTINEL/i, 'transcript must not expose internal payloads')
console.log(JSON.stringify({
  pass: true,
  schema: 'ccm-agent-text-timeline-style-selftest-v1',
  checks: { progressInline: true, liveAndCompleteVariants: true, sharedTokens: true, accessibleDisclosure: true },
}, null, 2))
