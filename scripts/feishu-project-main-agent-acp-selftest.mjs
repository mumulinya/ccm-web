import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import path from 'node:path'
import readline from 'node:readline'

const root = path.resolve(import.meta.dirname, '..')
const adapter = path.join(root, 'ccm-package', 'dist', 'integrations', 'control-bot-acp.js')
assert.ok(fs.existsSync(adapter), '请先运行 npm run build:backend')

const freePort = () => new Promise((resolve, reject) => {
  const socket = net.createServer()
  socket.once('error', reject)
  socket.listen(0, '127.0.0.1', () => {
    const address = socket.address()
    socket.close(() => resolve(address.port))
  })
})

const waitFor = (messages, predicate, timeoutMs = 5000) => new Promise((resolve, reject) => {
  const deadline = Date.now() + timeoutMs
  const timer = setInterval(() => {
    const found = messages.find(predicate)
    if (found) {
      clearInterval(timer)
      resolve(found)
    } else if (Date.now() >= deadline) {
      clearInterval(timer)
      reject(new Error(`等待 ACP 输出超时：${JSON.stringify(messages)}`))
    }
  }, 20)
})

const port = await freePort()
const calls = []
let sendStreamCount = 0
const server = http.createServer(async (req, res) => {
  let body = ''
  for await (const chunk of req) body += chunk
  const data = body ? JSON.parse(body) : null
  calls.push({ method: req.method, url: req.url, data })
  if (req.url.startsWith('/api/sessions/feishu-targets')) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      success: true,
      targets: [{ id: 'feishu:oc_demo:ou_demo', chat_id: 'oc_demo', open_id: 'ou_demo', active_session_id: 's12' }],
      resolved_target: { id: 'feishu:oc_demo:ou_demo', chat_id: 'oc_demo', open_id: 'ou_demo', active_session_id: 's12' },
      resolution: 'cc_connect_agent_session',
    }))
    return
  }
  if (req.url === '/api/send-stream') {
    sendStreamCount += 1
    res.writeHead(200, { 'Content-Type': 'text/event-stream' })
    res.end(sendStreamCount === 1
      ? 'data: {"type":"status","text":"项目主 Agent 正在回复"}\n\ndata: {"type":"response_delta","delta":"项目会话回复正常"}\n\ndata: {"type":"response_completed","final":true}\n\ndata: {"type":"done","main_agent":"project","final_text":"项目会话回复正常"}\n\n'
      : 'data: {"type":"status","text":"项目主 Agent 正在回复"}\n\ndata: {"type":"done","main_agent":"project","final_text":"项目会话回复正常"}\n\n')
    return
  }
  if (req.url === '/api/projects/session-runtime-event') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ success: true }))
    return
  }
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ success: false, error: 'not found' }))
})
await new Promise(resolve => server.listen(port, '127.0.0.1', resolve))

const child = spawn(process.execPath, [adapter, `--port=${port}`, '--project=demo-project'], {
  cwd: root,
  windowsHide: true,
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, CCM_PROJECT_BOT_REQUEST_TIMEOUT_MS: '3000' },
})
const messages = []
let stderr = ''
readline.createInterface({ input: child.stdout }).on('line', line => {
  try { messages.push(JSON.parse(line)) } catch {}
})
child.stderr.on('data', chunk => { stderr += String(chunk) })
const send = message => child.stdin.write(`${JSON.stringify(message)}\n`)

try {
  send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: 1 } })
  const initialized = await waitFor(messages, item => item.id === 1)
  assert.match(initialized.result.agentInfo.name, /Project Main Agent/)
  assert.match(initialized.result.agentInfo.version, /^1\.1\.0\+[a-f0-9]{12}$/)
  send({ jsonrpc: '2.0', id: 2, method: 'session/new', params: {} })
  const created = await waitFor(messages, item => item.id === 2)
  assert.match(created.result.sessionId, /^ccm-project-/)
  send({
    jsonrpc: '2.0', id: 3, method: 'session/prompt',
    params: {
      sessionId: created.result.sessionId,
      prompt: [{ type: 'text', text: '你好' }],
    },
  })
  await waitFor(messages, item => item.method === 'session/update' && item.params?.update?.content?.text === '项目会话回复正常')
  const completed = await waitFor(messages, item => item.id === 3)
  assert.equal(completed.result.stopReason, 'end_turn')
  const runtimeEventDeadline = Date.now() + 3000
  while (calls.filter(call => call.url === '/api/projects/session-runtime-event').length < 2 && Date.now() < runtimeEventDeadline) {
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  const updateIndex = messages.findIndex(item => item.method === 'session/update' && item.params?.update?.content?.text === '项目会话回复正常')
  const completionIndex = messages.findIndex(item => item.id === 3)
  assert.ok(updateIndex >= 0 && completionIndex > updateIndex, 'ACP 文本通知必须先于 prompt 完成响应')
  assert.equal(completionIndex, updateIndex + 1, 'ACP 文本通知与 prompt 完成响应必须形成相邻的原子终态帧')
  assert.equal(calls.filter(call => call.url === '/api/sessions/message').length, 0)
  assert.match(calls.find(call => call.url.startsWith('/api/sessions/feishu-targets'))?.url || '', /acp_session_id=ccm-project-/)
  assert.equal(calls.find(call => call.url === '/api/send-stream')?.data?.sessionId, 's12')
  assert.equal(calls.find(call => call.url === '/api/send-stream')?.data?.project, 'demo-project')
  assert.deepEqual(
    calls.filter(call => call.url === '/api/projects/session-runtime-event').map(call => call.data?.status),
    ['inbound', 'reply'],
  )
  const beforeSecondTurn = messages.length
  send({
    jsonrpc: '2.0', id: 4, method: 'session/prompt',
    params: { sessionId: created.result.sessionId, prompt: [{ type: 'text', text: '第二条消息' }] },
  })
  await waitFor(messages, item => item.id === 4 && item.result?.stopReason === 'end_turn')
  const secondTurnMessages = messages.slice(beforeSecondTurn)
  assert.equal(secondTurnMessages[0]?.method, 'session/update')
  assert.equal(secondTurnMessages[0]?.params?.update?.content?.text, '项目会话回复正常')
  assert.equal(secondTurnMessages[1]?.id, 4)
  assert.ok(!secondTurnMessages.some(item => /空响应/.test(item.params?.update?.content?.text || '')))
  send({
    jsonrpc: '2.0', id: 5, method: 'session/prompt',
    params: {
      sessionId: created.result.sessionId,
      prompt: [{ type: 'text', text: '请总结附件\n(Files saved locally, please read them: C:\\demo\\.cc-connect\\attachments\\需求.pdf)\n(Image files saved locally: C:\\demo\\.cc-connect\\attachments\\页面.png)' }],
    },
  })
  await waitFor(messages, item => item.id === 5 && item.result?.stopReason === 'end_turn')
  const attachmentCall = calls.filter(call => call.url === '/api/send-stream').at(-1)
  assert.equal(attachmentCall?.data?.message, '请总结附件')
  assert.deepEqual(attachmentCall?.data?.cc_connect_attachment_refs, [
    { kind: 'image', path: 'C:\\demo\\.cc-connect\\attachments\\页面.png' },
    { kind: 'file', path: 'C:\\demo\\.cc-connect\\attachments\\需求.pdf' },
  ])
  const projectSource = fs.readFileSync(path.join(root, 'backend', 'modules', 'projects', 'projects.ts'), 'utf8')
  assert.match(projectSource, /buildProjectFeishuAcpRuntimeConfig/)
  assert.match(projectSource, /--project=\$\{projectName\}/)
  assert.match(projectSource, /type = "acp"/)
  assert.match(projectSource, /progress_style = "compact"/)
  assert.match(projectSource, /private runtime on the final-text path/)
  assert.match(projectSource, /fs\.openSync\(logFile, "a"\)/)
  console.log(JSON.stringify({
    pass: true,
    checks: {
      project_acp_identity: true,
      exact_feishu_binding_hydration: true,
      project_main_agent_stream: true,
      cc_connect_owned_transcript_writeback: true,
      runtime_config_uses_acp: true,
      private_runtime_uses_compact_progress: true,
      text_update_precedes_turn_completion: true,
      atomic_terminal_frame: true,
      adapter_build_identity: true,
      project_channel_log_is_append_only: true,
      project_session_runtime_events_cover_inbound_and_reply: true,
      consecutive_turns_have_visible_terminal_replies: true,
      native_response_delta_supported: true,
      done_final_text_fallback_supported: true,
      cc_connect_attachment_paths_are_stripped_and_forwarded: true,
    },
    paid_provider_calls: 0,
  }, null, 2))
} finally {
  child.kill()
  await new Promise(resolve => server.close(resolve))
  if (stderr) process.stderr.write(stderr)
}
