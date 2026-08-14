import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const globalMessaging = read('frontend/src/composables/useGlobalAgentMessaging.js')
const globalMessages = read('frontend/src/components/global/GlobalAgentMessageList.vue')
const groupStream = read('frontend/src/components/collaboration/useGroupChatStream.js')
const groupTemplate = read('frontend/src/components/collaboration/GroupChat.template.html')
const globalApi = read('backend/modules/global/global-agent-api.ts')
const groupApi = read('backend/modules/collaboration/group-live-routes.ts')
const projectMessaging = read('frontend/src/components/projects/useProjectManager.js')
const projectMessage = read('frontend/src/components/projects/ProjectAgentMessage.vue')
const executionTranscript = read('frontend/src/components/common/AgentExecutionTranscript.vue')

assert.match(projectMessaging, /addAgentMessage\(\)\s*\r?\n\s*scrollToBottom\(\{ force: true \}\)/)
assert.doesNotMatch(projectMessage, /title="正在思考…"/)
assert.match(executionTranscript, /if \(isLivePresentation\.value\) \{\s*return \{ stage, rows: groupedRows \}/)
assert.match(executionTranscript, /return \{ stage, rows: groupedRows \}/)
assert.match(executionTranscript, /visibleModelActivity/)

assert.match(globalMessaging, /ensureGlobalStreamMessage\(agentMsg, agentMsgAdded\)\s*\r?\n\s*saveHistory\(\)/)
assert.doesNotMatch(globalMessages, /title="正在思考…"/)
assert.match(globalApi, /type: "response_delta"/)
assert.doesNotMatch(globalApi, /streamBufferedGlobalReply/)

assert.match(groupStream, /messages\.value\.push\(agentMsg\)/)
assert.match(groupStream, /streaming: true/)
assert.doesNotMatch(groupStream, /thinkingMsg/)
assert.doesNotMatch(groupTemplate, /title="正在思考…"/)
assert.match(groupApi, /type: "response_delta"/)
assert.doesNotMatch(groupApi, /streamBufferedCoordinatorReply/)

console.log(JSON.stringify({
  pass: true,
  schema: 'ccm-multi-scope-thinking-stream-regression-v1',
  scopes: {
    project: { factualWaitingAfterThreshold: true, nativeReplyDelta: true },
    global: { factualWaitingAfterThreshold: true, nativeReplyDelta: true },
    group: { factualWaitingAfterThreshold: true, nativeReplyDelta: true, singleEnvelope: true },
  },
}, null, 2))
