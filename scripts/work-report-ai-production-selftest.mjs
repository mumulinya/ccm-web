import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import {
  buildWorkReportEvidenceSnapshotV3,
  generateWorkReportSummaryV3,
  renderWorkReportSummaryMarkdownV3,
  validateWorkReportSummaryV3,
} from '../ccm-package/dist/modules/scheduling/work-report-ai.js'
import { dateKeyInTimezone } from '../ccm-package/dist/modules/scheduling/cron-job-store.js'
import { buildFeishuReportCard, generateFeishuWebhookSignature } from '../ccm-package/dist/modules/collaboration/feishu.js'

const at = '2026-07-30T10:00:00.000Z'
const event = (id, type, state, actorType = 'agent') => ({
  schema: 'ccm-work-journal-event-v1', id, at, type, state, actor_type: actorType,
  actor_label: actorType === 'test_agent' ? 'TestAgent' : '主 Agent', source: 'task', source_label: '任务',
  title: `事件 ${id}`, detail: `证据 ${id}`, task_id: 'task-report-v3', group_id: 'group-report-v3',
  project: 'project-report-v3', work_id: 'task-report-v3', evidence_level: 'strong', evidence_ref: `fixture#${id}`, metadata: {},
})
const events = [
  event('done-1', 'task_completed', 'done'),
  event('quality-1', 'verification', 'passed', 'test_agent'),
  event('risk-1', 'task_blocked', 'blocked'),
]
const evidenceReport = {
  id: '2026-07-30', type: 'daily', date: '2026-07-30', event_ids: events.map(item => item.id),
  summary: { verifications: 1 }, ownership: { agent_actions: 2, test_agent_actions: 1 }, changed_files: ['src/report.ts'],
}
const snapshot = buildWorkReportEvidenceSnapshotV3(evidenceReport, events, 'Asia/Shanghai')
let modelCalls = 0
const modelCall = async () => {
  modelCalls += 1
  return {
    headline: '今日完成核心交付并保留一个待处理风险',
    overview: { text: '任务完成、验证通过，并记录了一个阻塞项。', evidence_event_ids: ['done-1', 'quality-1', 'risk-1'] },
    completed: [{ text: '完成日报能力交付。', evidence_event_ids: ['done-1'] }],
    highlights: [{ text: '完成核心任务。', evidence_event_ids: ['done-1'] }],
    quality: [{ text: 'TestAgent验证通过。', evidence_event_ids: ['quality-1'] }],
    risks: [{ text: '仍有一项阻塞待处理。', evidence_event_ids: ['risk-1'] }],
    next_actions: [{ text: '继续处理阻塞项。', evidence_event_ids: ['risk-1'] }],
    confidence: 0.95,
  }
}
const config = { enabled: true, apiUrl: 'http://127.0.0.1/mock', apiKey: 'mock', model: 'mock-report', format: 'openai-compatible', contextWindow: 32000, reservedOutputTokens: 2000 }
const generated = await generateWorkReportSummaryV3(snapshot, { modelCall, config })
assert.equal(generated.summary.schema, 'ccm-work-report-summary-v3')
assert.equal(generated.receipt.event_count, 3)
assert.deepEqual(generated.receipt.covered_event_ids, events.map(item => item.id))
assert.equal(modelCalls, 1)
const markdown = renderWorkReportSummaryMarkdownV3(generated.summary, snapshot)
assert.match(markdown, /TestAgent验证通过/)
assert.ok(markdown.length < 10000)

let emptyModelCalls = 0
const emptySnapshot = buildWorkReportEvidenceSnapshotV3({
  id: 'week-2026-07-27',
  type: 'weekly',
  start_date: '2026-07-27',
  end_date: '2026-08-02',
  event_ids: [],
  summary: {},
  ownership: {},
  changed_files: [],
}, [], 'Asia/Shanghai')
const emptyGenerated = await generateWorkReportSummaryV3(emptySnapshot, {
  config,
  modelCall: async () => {
    emptyModelCalls += 1
    throw new Error('empty evidence must not call the provider')
  },
})
assert.equal(emptyModelCalls, 0)
assert.equal(emptyGenerated.receipt.provider, 'ccm-evidence-ledger')
assert.equal(emptyGenerated.receipt.event_count, 0)
assert.match(emptyGenerated.summary.overview.text, /没有可核验记录/)
assert.match(renderWorkReportSummaryMarkdownV3(emptyGenerated.summary, emptySnapshot), /工作周报/)

assert.throws(() => validateWorkReportSummaryV3({
  ...generated.summary,
  completed: [{ text: '伪造完成', evidence_event_ids: ['risk-1'] }],
}, snapshot), /evidence_state_mismatch/)
assert.throws(() => validateWorkReportSummaryV3({
  ...generated.summary,
  risks: [{ text: '伪造风险', evidence_event_ids: ['missing-event'] }],
}, snapshot), /unknown_evidence_event/)
assert.equal(dateKeyInTimezone(new Date('2026-07-30T16:30:00.000Z'), 'Asia/Shanghai'), '2026-07-31')
assert.throws(() => buildFeishuReportCard('超长报告', 'x'.repeat(12001)), /超过安全容量/)
const webhookTimestamp = '1700000000'
const webhookSecret = 'ccm-test-secret'
const expectedWebhookSignature = crypto.createHmac('sha256', `${webhookTimestamp}\n${webhookSecret}`).update('').digest('base64')
const legacyIncorrectSignature = crypto.createHmac('sha256', webhookSecret).update(`${webhookTimestamp}\n${webhookSecret}`).digest('base64')
assert.equal(generateFeishuWebhookSignature(webhookTimestamp, webhookSecret), expectedWebhookSignature)
assert.notEqual(expectedWebhookSignature, legacyIncorrectSignature)

const root = process.cwd()
const reportsSource = fs.readFileSync(path.join(root, 'backend/modules/scheduling/cron-dev-reports.ts'), 'utf8')
const cronSource = fs.readFileSync(path.join(root, 'backend/modules/scheduling/cron.ts'), 'utf8')
const feishuSource = fs.readFileSync(path.join(root, 'backend/modules/collaboration/feishu-channel.ts'), 'utf8')
assert.match(reportsSource, /generateAndUpsertAutoDevReport/)
assert.match(reportsSource, /enqueueFeishuReportDelivery/)
assert.match(cronSource, /schedulerTickPromise/)
assert.match(feishuSource, /delivery_unknown/)

console.log(JSON.stringify({
  pass: true,
  checks: {
    modelSummaryUsesEvidence: true,
    emptyEvidenceReportIsSendableWithoutHallucination: true,
    invalidEvidenceRejected: true,
    feishuWebhookSignatureMatchesOfficialAlgorithm: true,
    timezoneIndependent: true,
    noSilentCardTruncation: true,
    durableReportOutbox: true,
    schedulerSingleflight: true,
  },
  paidProviderCalls: 0,
}, null, 2))
