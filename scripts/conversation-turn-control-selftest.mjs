import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import url from 'node:url'
import { createRequire } from 'node:module'

const root = process.cwd()
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-turn-control-home-'))
process.env.HOME = home
process.env.USERPROFILE = home
const require = createRequire(import.meta.url)
const turnModule = require(path.join(root, 'ccm-package', 'dist', 'agents', 'conversation-turn-control.js'))
const globalModule = require(path.join(root, 'ccm-package', 'dist', 'modules', 'global', 'global-agent.js'))

const direct = turnModule.runConversationTurnControlSelfTest()
assert.equal(direct.pass, true, `持久化内核自测失败：${JSON.stringify(direct.checks)}`)
const feishu = globalModule.runFeishuConversationTurnCommandSelfTest()
assert.equal(feishu.pass, true, `飞书控制命令自测失败：${JSON.stringify(feishu.checks)}`)

const source = {
  composer: fs.readFileSync(path.join(root, 'frontend/src/components/common/ChatComposer.vue'), 'utf8'),
  controls: fs.readFileSync(path.join(root, 'frontend/src/components/common/ConversationTurnControls.vue'), 'utf8'),
  global: fs.readFileSync(path.join(root, 'frontend/src/components/global/GlobalAgent.vue'), 'utf8'),
  group: [
    'frontend/src/components/collaboration/GroupChatPanel.vue',
    'frontend/src/components/collaboration/GroupChat.template.html',
    'frontend/src/components/collaboration/useGroupChatStream.js',
  ].map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n'),
  project: [
    'frontend/src/components/projects/ProjectManagerPanel.vue',
    'frontend/src/components/projects/ProjectManager.template.html',
    'frontend/src/components/projects/useProjectManager.js',
  ].map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n'),
  acp: fs.readFileSync(path.join(root, 'backend/integrations/control-bot-acp.ts'), 'utf8'),
}
assert.match(source.composer, /allowInputWhileBusy/, '共享输入框必须支持工作中继续编辑')
assert.match(source.controls, /引导当前[\s\S]*排队下一条[\s\S]*停止/, '共享控件必须提供引导、排队和停止')
assert.match(source.global, /drainGlobalTurnQueue[\s\S]*stopGlobalCurrentWork/, '全局 Agent 必须接入自动续发和停止')
assert.match(source.group, /drainGroupTurnQueue[\s\S]*stopGroupCurrentWork/, '群聊主 Agent 必须接入自动续发和停止')
assert.match(source.project, /project-runs\/cancel[\s\S]*drainProjectTurnQueue/, '项目 Agent 必须真实取消后端运行并续发')
assert.doesNotMatch(source.acp, /inFlightRequests\.get\(sessionId\)\?\.abort\(\)/, '飞书普通新消息不能静默打断上一回合')

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true)
  if (turnModule.handleConversationTurnControlApi(parsed.pathname, req, res, parsed)) return
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'not found' }))
})
await new Promise((resolve, reject) => {
  server.once('error', reject)
  server.listen(0, '127.0.0.1', resolve)
})
const baseUrl = `http://127.0.0.1:${server.address().port}`
const post = async (pathname, body) => {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  assert.equal(response.ok, true, `${pathname}: ${data.error || response.status}`)
  return data
}

try {
  const first = await post('/api/conversation-turns/enqueue', { scope: 'project', conversation_id: 'project:session', mode: 'queue', message: '第一条', request_id: 'api-1' })
  const duplicate = await post('/api/conversation-turns/enqueue', { scope: 'project', conversation_id: 'project:session', mode: 'queue', message: '重复内容', request_id: 'api-1' })
  const second = await post('/api/conversation-turns/enqueue', { scope: 'project', conversation_id: 'project:session', mode: 'queue', message: '第二条', request_id: 'api-2' })
  assert.equal(duplicate.duplicate, true)
  assert.equal(duplicate.turn.id, first.turn.id)
  const listing = await fetch(`${baseUrl}/api/conversation-turns?scope=project&conversation_id=project%3Asession&statuses=queued`).then(response => response.json())
  assert.deepEqual(listing.turns.map(turn => turn.position), [1, 2])
  const claimed = await post('/api/conversation-turns/claim', { scope: 'project', conversation_id: 'project:session' })
  assert.equal(claimed.turn.id, first.turn.id)
  await post('/api/conversation-turns/settle', { id: first.turn.id, status: 'completed', result: { run_id: 'pchat-test' } })
  await post('/api/conversation-turns/cancel', { id: second.turn.id })
  const failed = await post('/api/conversation-turns/enqueue', { scope: 'project', conversation_id: 'project:session', mode: 'steer', message: '失败后重试', request_id: 'api-3' })
  await post('/api/conversation-turns/settle', { id: failed.turn.id, status: 'failed', error: 'fixture failure' })
  const retried = await post('/api/conversation-turns/retry', { id: failed.turn.id })
  assert.equal(retried.turn.status, 'queued')
  assert.equal(retried.turn.retry_count, 1)
  console.log(JSON.stringify({
    pass: true,
    direct: direct.checks,
    feishu: feishu.checks,
    api: { idempotent: true, fifo: true, positions: true, completed: true, cancelled: true, retry: true },
    source: { global: true, group: true, project: true, editable_while_busy: true, acp_no_implicit_abort: true },
  }, null, 2))
} finally {
  await new Promise(resolve => server.close(resolve))
  fs.rmSync(home, { recursive: true, force: true })
}
