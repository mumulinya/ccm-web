import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const context = await import('../ccm-package/dist/system/session-model-context.js')
const center = await import('../ccm-package/dist/modules/knowledge/memory-control-center-api.js')

const messages = [
  { id: 'u1', role: 'user', content: '检查项目', timestamp: '2026-01-01T00:00:00.000Z' },
  { id: 'a1', role: 'assistant', content: '开始检查', timestamp: '2026-01-01T00:00:01.000Z' },
]
const events = Array.from({ length: 6 }, (_, index) => {
  const base = { runId: 'run', traceId: 'trace', anchorMessageId: 'u1', hidden: true, toolCallId: `tool-${index}`, toolName: 'read_file' }
  return [
    { ...base, id: `use-${index}`, type: 'tool_use', status: 'running', timestamp: `2026-01-01T00:00:${10 + index * 2}.000Z`, payload: { path: `src/${index}.ts` } },
    { ...base, id: `result-${index}`, type: 'tool_result', status: 'ok', timestamp: `2026-01-01T00:00:${11 + index * 2}.000Z`, payload: { content: `result-${index}` } },
  ]
}).flat()

const buildReceipt = (scope, sessionId, scopeId) => context.buildUnifiedSessionModelContextProjection({
  scope,
  sessionId,
  scopeId,
  messages,
  executionEvents: events,
  microCompact: { enabled: true, trigger: 'auto', mainThread: true, now: '2026-01-01T02:00:00.000Z', gapThresholdMinutes: 60, keepRecent: 5 },
}).microCompact

const projectReceipt = buildReceipt('project', 'ps_1', 'demo:ps_1')
const globalReceipt = buildReceipt('global', 'global_1', 'global:global_1')
const projectState = center.memoryCenterMicroCompactState('project_session', 'demo::ps_1', { compaction: { micro_compact_receipt: projectReceipt } })
const globalState = center.memoryCenterMicroCompactState('global_session', 'session:global_1', { compaction: { microCompactReceipt: globalReceipt } })
const historical = center.memoryCenterMicroCompactState('project_session', 'demo::ps_old', { history: messages, compaction: {} })
const longTerm = center.memoryCenterMicroCompactState('project', 'demo', {})
const panelSource = fs.readFileSync(path.join(root, 'frontend/src/components/knowledge/MicroCompactStatusPanel.vue'), 'utf8')
const memoryCenterSource = fs.readFileSync(path.join(root, 'frontend/src/components/knowledge/MemoryCenterPanel.vue'), 'utf8')

const checks = {
  projectReceiptVerified: projectState.status === 'applied' && projectState.receiptValid === true && projectState.clearedToolResultCount === 1,
  globalReceiptVerified: globalState.status === 'applied' && globalState.receiptValid === true && globalState.tokensSaved > 0,
  historicalDataNotFabricated: historical.status === 'historical_unrecorded' && historical.hasReceipt === false && historical.tokensSaved === 0,
  longTermScopeNotApplicable: longTerm.status === 'not_applicable' && longTerm.applicable === false,
  sharedPanelShowsRequiredFacts: ['清理旧结果', '保留近期结果', '节省上下文', '原始会话', '回执'].every(text => panelSource.includes(text)),
  settingsExposeTimePolicy: ['timeBasedMicrocompactEnabled', 'timeBasedMicrocompactGapMinutes', 'timeBasedMicrocompactKeepRecent', '空闲触发间隔（分钟）'].every(text => memoryCenterSource.includes(text)),
}

for (const [name, value] of Object.entries(checks)) assert.equal(value, true, name)
console.log(JSON.stringify({ pass: true, checks }, null, 2))
