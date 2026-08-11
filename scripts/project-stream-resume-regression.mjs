import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')

const frontend = read('frontend/src/components/projects/useProjectManager.js')
const projectMessage = read('frontend/src/components/projects/ProjectAgentMessage.vue')
const server = read('backend/server.ts')
const sessions = read('backend/modules/projects/sessions.ts')
const streamRoute = server.slice(
  server.indexOf('pathname === "/api/send-stream"'),
  server.indexOf('// === 发送消息给 Agent（非流式）==='),
)

assert.match(frontend, /const explicitlyStoppedStreams = new WeakSet\(\)/)
assert.match(frontend, /const stopped = explicitlyStoppedStreams\.has\(controller\)/)
assert.match(frontend, /const detachProjectStream = \(\) =>/)
assert.match(frontend, /onUnmounted\(\(\) => \{[\s\S]*?detachProjectStream\(\)/)
assert.doesNotMatch(frontend, /onUnmounted\(\(\) => \{[\s\S]*?stopStreaming\(\)/)
assert.match(frontend, /latestRecoverableProjectAssistantMessage\(msg\)/)
assert.match(frontend, /assistant_message_id: agentMsg\.id/)
assert.match(frontend, /PROJECT_SESSION_TURN_ACTIVE/)
assert.match(frontend, /addAgentMessage\(\)\s*\n\s*scrollToBottom\(\{ force: true \}\)/)
assert.match(frontend, /reconcileProjectConversationReply\(eventProject, eventSessionId, eventMessageId\)/)
assert.match(frontend, /agentMsg\.streaming = false/)
assert.match(projectMessage, /title="正在思考…"/)

assert.ok(
  streamRoute.indexOf('acquireProjectSessionAgentDispatch(project, exactProjectSessionId)')
    < streamRoute.indexOf('runProjectMainAgentFirstTurn({'),
  'project session dispatch must be locked before the first model turn',
)
assert.doesNotMatch(streamRoute, /res\.once\?\.\("close", releaseDispatch\)/)
assert.match(streamRoute, /persistConversationReply\(directProjectReply, "conversation"\)/)
assert.match(streamRoute, /persistConversationReply\(answer, chatIntent\.mode\)/)
assert.match(streamRoute, /streamBufferedConversationReply\(directProjectReply\)/)
assert.match(streamRoute, /message_id: safeAssistantMessageId/)
assert.match(streamRoute, /assistant_message_id, assistantMessageId/)
assert.match(sessions, /"interruption"/)

process.stdout.write(`${JSON.stringify({
  pass: true,
  schema: 'ccm-project-stream-resume-regression-v1',
  checks: {
    abortSourceDistinguished: true,
    lifecycleDetachDoesNotCancel: true,
    sessionLockedBeforeFirstTurn: true,
    clientDisconnectDoesNotReleaseExecution: true,
    authoritativeReplyPersisted: true,
    resumeReusesAssistantAnchor: true,
    thinkingPlaceholderRenderedImmediately: true,
    authoritativeConversationReplyReconciled: true,
    bufferedFastReplyStreamedInChunks: true,
  },
}, null, 2)}\n`)
