import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const baseUrl = process.env.CCM_SEARCH_URL || 'http://127.0.0.1:3082'

const findProbe = () => {
  const historyFile = path.join(os.homedir(), '.cc-connect', 'global-agent-history.json')
  const history = JSON.parse(fs.readFileSync(historyFile, 'utf8'))
  for (const session of history.sessions || []) {
    for (const message of session.messages || []) {
      const content = String(message.content || '').replace(/\s+/g, ' ')
      const match = content.match(/[\u4e00-\u9fff]{2,5}|[a-zA-Z]{4,}/)
      if (match) return match[0]
    }
  }
  throw new Error('没有可用于真实全局会话搜索的探针词')
}

async function get(pathname) {
  const response = await fetch(`${baseUrl}${pathname}`, { signal: AbortSignal.timeout(45_000) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.success === false) throw new Error(`${pathname}: ${data.error || response.status}`)
  return data
}

try {
  const probe = findProbe()
  const encoded = encodeURIComponent(probe)
  const [globalResult, bounded, phrase] = await Promise.all([
    get(`/api/search?q=${encoded}&source=global&page=1&page_size=5`),
    get(`/api/search?q=${encoded}&page=invalid&page_size=5000`),
    get(`/api/search?q=${encoded}&source=global&match=phrase&page_size=5`),
  ])
  const first = globalResult.results[0]
  const checks = {
    v2Contract: globalResult.schema === 'ccm-conversation-search-v2' && globalResult.success === true,
    realGlobalHistoryCovered: globalResult.total > 0 && globalResult.results.every(item => item.conversationType === 'global'),
    accuratePagination: globalResult.results.length <= 5 && globalResult.page_size === 5 && Number.isFinite(globalResult.page_count),
    boundsAreEnforced: bounded.page === 1 && bounded.page_size === 100 && bounded.results.length <= 100,
    exactNavigationContract: !!first?.sessionId && Number.isInteger(first?.messageIndex) && typeof first?.messageId === 'string',
    contextAndRelationsContract: !!first?.context && Array.isArray(first.context.before) && Array.isArray(first.context.after) && Array.isArray(first.attachments),
    facetsAndAuditContract: !!globalResult.facets?.conversation_types && Number(globalResult.audit?.scanned_messages || 0) > 0,
    phraseModeWorks: phrase.query?.match === 'phrase' && phrase.total > 0,
  }
  const pass = Object.values(checks).every(Boolean)
  console.log(JSON.stringify({ pass, checks, runtime: { total: globalResult.total, scannedMessages: globalResult.audit.scanned_messages, elapsedMs: globalResult.audit.elapsed_ms, sources: globalResult.audit.sources } }, null, 2))
  if (!pass) process.exitCode = 1
} catch (error) {
  console.error(JSON.stringify({ pass: false, error: error.message }, null, 2))
  process.exitCode = 1
}
