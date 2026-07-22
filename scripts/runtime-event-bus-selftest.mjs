import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = path.resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)
const runtime = require(path.join(root, 'ccm-package', 'dist', 'system', 'runtime-events.js'))
runtime.resetRuntimeEventBusForTest()

const listenerEvents = []
const unsubscribe = runtime.subscribeRuntimeEventListener(['permission'], event => listenerEvents.push(event))
const server = http.createServer((req, res) => {
  const parsed = new URL(req.url, 'http://127.0.0.1')
  const handled = runtime.handleRuntimeEventsApi(parsed.pathname, req, res, { query: Object.fromEntries(parsed.searchParams) })
  if (!handled) { res.writeHead(404); res.end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const port = server.address().port

try {
  const response = await fetch(`http://127.0.0.1:${port}/api/runtime/events?topics=permission`)
  assert.equal(response.status, 200)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  const readUntil = async pattern => {
    const deadline = Date.now() + 3000
    while (!pattern.test(text) && Date.now() < deadline) {
      const { value, done } = await reader.read()
      if (done) break
      text += decoder.decode(value, { stream: true })
    }
  }
  await readUntil(/"type":"ready"/)
  runtime.publishRuntimeEvent('task', 'task.changed', { taskId: 'task-hidden' })
  runtime.publishRuntimeEvent('permission', 'permission.changed', {
    id: 'perm_visible',
    taskId: 'task-a',
    originType: 'global',
    originSessionId: 'session-a',
    state: 'awaiting_user',
    secret: 'must-not-leak',
  })
  await readUntil(/perm_visible/)
  assert.match(text, /permission\.changed/)
  assert.doesNotMatch(text, /task-hidden/)
  assert.doesNotMatch(text, /must-not-leak/)
  assert.equal(listenerEvents.length, 1)
  assert.equal(runtime.runtimeEventBusSnapshot().clients, 1)
  await reader.cancel()

  const permissionClient = fs.readFileSync(path.join(root, 'frontend/src/composables/usePermissionApprovals.js'), 'utf8')
  const workbenchClient = fs.readFileSync(path.join(root, 'frontend/src/composables/useUsabilityWorkbenchLive.js'), 'utf8')
  const eventClient = fs.readFileSync(path.join(root, 'frontend/src/utils/runtimeEventBus.js'), 'utf8')
  const usabilityServer = fs.readFileSync(path.join(root, 'backend/modules/system/usability.ts'), 'utf8')
  assert.match(permissionClient, /subscribeRuntimeEvents/)
  assert.doesNotMatch(permissionClient, /4_000/)
  assert.match(permissionClient, /60_000/)
  assert.match(workbenchClient, /subscribeRuntimeEvents/)
  assert.doesNotMatch(workbenchClient, /workbench\/stream/)
  assert.match(eventClient, /let source = null/)
  assert.match(eventClient, /\/api\/runtime\/events/)
  assert.match(usabilityServer, /subscribeRuntimeEventListener/)
  assert.doesNotMatch(usabilityServer, /}, 5000\)/)

  console.log(JSON.stringify({
    pass: true,
    checks: {
      topic_filtering: true,
      sensitive_payload_allowlist: true,
      internal_listener: true,
      singleton_frontend_stream: true,
      permission_event_refresh: true,
      sixty_second_fallback: true,
      legacy_workbench_stream_event_driven: true,
    },
  }, null, 2))
} finally {
  unsubscribe()
  await new Promise(resolve => server.close(resolve))
}
