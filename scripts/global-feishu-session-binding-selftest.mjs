import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const compiledHistory = path.join(root, 'ccm-package/dist/modules/global/global-agent-history.js')
assert.ok(fs.existsSync(compiledHistory), '请先运行 npm run build:backend')

const { createGlobalAgentHistoryRuntime } = await import(`${pathToFileURL(compiledHistory).href}?selftest=${Date.now()}`)
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-feishu-session-'))
const historyFile = path.join(tempDir, 'history.json')

try {
  const runtime = createGlobalAgentHistoryRuntime({
    GLOBAL_AGENT_HISTORY_FILE: historyFile,
    GLOBAL_AGENT_HISTORY_LIMIT: 120,
    GLOBAL_AGENT_SESSION_LIMIT: 100,
    buildGlobalVisibleReplyContent: input => ({ text: String(input?.value || ''), technical_content: '' }),
    ingestGlobalAgentConversation: () => {},
    writeGlobalJsonAtomic: (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8'),
  })

  runtime.syncGlobalAgentWebHistory({
    currentSessionId: 'session_web_selftest',
    sessions: [{
      id: 'session_web_selftest',
      name: '网页测试会话',
      source: 'web',
      messages: [{ role: 'assistant', content: 'web', timestamp: '2026-07-24T00:00:00.000Z' }],
    }],
  })
  const feishu = runtime.createGlobalAgentConversationSession({ source: 'feishu', name: '飞书测试会话' })
  assert.equal(feishu.source, 'feishu')
  assert.match(feishu.id, /^feishu:manual:/)

  runtime.syncGlobalAgentWebHistory({
    currentSessionId: 'session_web_selftest',
    sessions: [
      {
        id: 'session_web_selftest', name: '网页测试会话', source: 'web',
        messages: [{ role: 'assistant', content: 'web-updated', timestamp: '2026-07-24T00:00:01.000Z' }],
      },
      {
        id: feishu.id, name: '不应覆盖飞书', source: 'feishu',
        messages: [{ role: 'assistant', content: 'malicious-web-sync', timestamp: '2026-07-24T00:00:02.000Z' }],
      },
    ],
  })
  const afterSync = runtime.loadGlobalAgentHistoryStore()
  const preservedFeishu = afterSync.sessions.find(session => session.id === feishu.id)
  assert.equal(preservedFeishu?.source, 'feishu')
  assert.equal(preservedFeishu?.name, '飞书测试会话')
  assert.ok(!preservedFeishu?.messages.some(message => message.content === 'malicious-web-sync'))

  const deleted = runtime.deleteGlobalAgentConversationSession(feishu.id, 'feishu')
  assert.equal(deleted.deleted, true)
  assert.ok(!runtime.loadGlobalAgentHistoryStore().sessions.some(session => session.id === feishu.id))

  const historySource = read('backend/modules/global/global-agent-history.ts')
  const apiSource = read('backend/modules/global/global-agent-api.ts')
  const channelSource = read('backend/modules/collaboration/feishu-channel.ts')
  const globalAgentSource = read('backend/modules/global/global-agent.ts')
  const sessionsSource = read('frontend/src/composables/useGlobalAgentSessions.js')
  const sidebarSource = read('frontend/src/components/global/GlobalAgentSessionSidebar.vue')
  const modalSource = read('frontend/src/components/global/GlobalAgentFeishuBindingModal.vue')
  const apiDependencyBlock = globalAgentSource.slice(
    globalAgentSource.indexOf('const globalAgentApi = createGlobalAgentApi({'),
    globalAgentSource.indexOf('export function handleGlobalAgentApi')
  )

  const checks = {
    web_sync_filters_source: historySource.includes('.filter((session: any) => String(session?.source || "web").toLowerCase() === "web")'),
    backend_create_bind_delete_api:
      apiSource.includes('/api/global-agent/feishu-sessions/create')
      && apiSource.includes('/api/global-agent/feishu-sessions/bind')
      && apiSource.includes('/api/global-agent/feishu-sessions/delete'),
    api_receives_session_management_dependencies:
      apiDependencyBlock.includes('createGlobalAgentConversationSession')
      && apiDependencyBlock.includes('deleteGlobalAgentConversationSession')
      && apiDependencyBlock.includes('bindFeishuGlobalSession'),
    binding_changes_inbound_route:
      channelSource.includes('active_session_id')
      && channelSource.includes('resolveBoundFeishuGlobalSessionId'),
    browser_persistence_excludes_feishu:
      sessionsSource.includes("persistentSessions.filter(session => session.source !== 'feishu')"),
    sidebar_groups_sources:
      sidebarSource.includes('网页会话')
      && sidebarSource.includes('飞书会话')
      && sidebarSource.includes("emit('bind-session', session)"),
    binding_modal_exposes_bind_unbind:
      modalSource.includes("emit('bind', selectedBindingId)")
      && modalSource.includes("emit('unbind', selectedBindingId)"),
    delete_waits_for_server:
      sessionsSource.includes('await options.beforeDelete(targetSession)')
      && read('frontend/src/components/global/GlobalAgent.vue').includes("beforeDelete: (session) => session?.source === 'feishu'"),
  }
  const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name)
  assert.deepEqual(failed, [], `Global Feishu session binding regression: ${failed.join(', ')}`)
  console.log(JSON.stringify({ pass: true, checks, paid_provider_calls: 0 }, null, 2))
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true })
}
