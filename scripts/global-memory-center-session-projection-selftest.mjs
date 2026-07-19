import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptFile = fileURLToPath(import.meta.url)

if (process.argv.includes('--child')) {
  const home = path.join(os.homedir(), '.cc-connect')
  const writeJson = (relative, value) => {
    const file = path.join(home, relative)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(value, null, 2))
  }
  const session = (sessionId, summary) => ({
    sessionId,
    summary,
    summarySource: 'model',
    lastCompactedAt: '2026-07-18T12:00:00.000Z',
    compaction: {
      v2: {
        activeSummary: summary,
        activeSummaryChecksum: `checksum-${sessionId}`,
        lastCompactedMessageId: `${sessionId}-m2`,
        lastCompactedAt: '2026-07-18T12:00:00.000Z',
        tokenMeasurement: { activeTokens: 12000, source: 'provider_usage_plus_estimate' },
      },
    },
  })

  writeJson('global-agent-history.json', {
    current_session_id: 'global-live',
    sessions: [{ id: 'global-live', name: '产品讨论', source: 'web', messages: [] }],
  })
  writeJson('global-agent-memory/memory.json', {
    version: 1,
    scope: 'global',
    sessions: [
      session('global-live', { primaryRequest: '当前会话只讨论产品发布计划。', unresolved: ['等待最终验收'] }),
      session('orphan-selftest', '不应展示。'),
    ],
    archives: [{
      id: 'archive-live-1',
      sessionId: 'global-live',
      from: '2026-07-18T11:00:00.000Z',
      count: 12,
      summary: { primaryRequest: '确认发布日期', latestOutcome: '等待最终验收' },
    }],
    user: [{ id: 'user-1', text: '全局长期偏好：使用中文。' }],
    feedback: [], authorization: [], decisions: [], missions: [], unresolved: [], references: [],
    privacy: { encryptedTranscripts: true },
    integrity: { pass: true, corruptedArchives: [] },
  })

  const { buildMemoryCenterOverview } = await import('../ccm-package/dist/modules/knowledge/memory-control-center-handler.js')
  const { getMemoryCenterScope } = await import('../ccm-package/dist/modules/knowledge/memory-control-center-api.js')
  const overview = buildMemoryCenterOverview()
  const longTerm = overview.globals.find(item => item.scope === 'global')
  const sessions = overview.globals.filter(item => item.scope === 'global_session')
  const detail = getMemoryCenterScope('global_session', 'session:global-live')
  const longTermDetail = getMemoryCenterScope('global', 'global')
  const checks = {
    longTermIsSeparate: longTerm?.memoryKind === 'long_term',
    onlyLiveWebSessionsProjected: sessions.length === 1 && sessions[0].id === 'session:global-live',
    currentSessionMarked: sessions[0]?.currentSession === true,
    userSessionNameUsed: sessions[0]?.label === '产品讨论',
    orphanSessionHidden: !overview.globals.some(item => item.id === 'session:orphan-selftest'),
    canonicalSummaryVisible: detail.itemGroups.some(group => group.type === 'sessionSummary' && group.items[0]?.text.includes('产品发布计划')),
    structuredSummaryReadable: detail.itemGroups.some(group => group.type === 'sessionSummary' && group.items[0]?.text.includes('主要目标：') && !group.items[0]?.text.includes('[object Object]')),
    exactArchivesVisible: detail.itemGroups.some(group => group.type === 'sessionArchives' && group.items.length === 1),
    sessionItemsReadOnly: detail.itemGroups.filter(group => ['sessionSummary', 'sessionArchives'].includes(group.type)).flatMap(group => group.items).every(item => item.readOnly === true),
    longTermDoesNotMixSessionArchives: !longTermDetail.itemGroups.some(group => group.type === 'sessionArchives'),
    longTermFactsRemainVisible: longTermDetail.itemGroups.some(group => group.type === 'user' && group.items.length === 1),
  }
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, overview: overview.globals, detail: detail.itemGroups }, null, 2))
  console.log(JSON.stringify({ pass: true, checks: Object.keys(checks).length, checksDetail: checks }))
  process.exit(0)
}

const frontend = fs.readFileSync(new URL('../frontend/src/components/knowledge/MemoryCenterPanel.vue', import.meta.url), 'utf8')
assert.match(frontend, /globalLongTermScopes/)
assert.match(frontend, /globalSessionScopes/)
assert.match(frontend, /globalTree/)
assert.match(frontend, /全局 Agent/)
assert.match(frontend, /item\.currentSession/)
assert.match(frontend, /!item\.readOnly/)

const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-global-memory-center-session-'))
try {
  const child = spawnSync(process.execPath, [scriptFile, '--child'], {
    cwd: path.dirname(path.dirname(scriptFile)),
    env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome },
    encoding: 'utf8',
    timeout: 120_000,
  })
  assert.equal(child.status, 0, child.stderr || child.stdout)
  const result = JSON.parse(String(child.stdout || '').trim().split(/\r?\n/).at(-1))
  assert.equal(result.pass, true)
  console.log(JSON.stringify({ pass: true, checks: result.checks + 5, exactGlobalSessions: true }, null, 2))
} finally {
  fs.rmSync(tempHome, { recursive: true, force: true })
}
