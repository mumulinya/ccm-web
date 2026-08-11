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
assert.match(projectMessage, /title="正在思考…"/)
assert.match(executionTranscript, /if \(isLivePresentation\.value\) \{\s*return \{ stage, rows: groupedRows \}/)
assert.match(executionTranscript, /return \{ stage, rows: groupedRows \}/)

assert.match(globalMessaging, /ensureGlobalStreamMessage\(agentMsg, agentMsgAdded\)\s*\r?\n\s*saveHistory\(\)/)
assert.match(globalMessages, /msg\.streaming && !String\(msg\.content \|\| ''\)\.trim\(\)/)
assert.match(globalMessages, /title="正在思考…"/)
assert.match(globalApi, /streamBufferedGlobalReply\(run\.final_reply\)/)

assert.match(groupStream, /messages\.value\.push\(agentMsg\)/)
assert.match(groupStream, /streaming: true/)
assert.doesNotMatch(groupStream, /thinkingMsg/)
assert.match(groupTemplate, /msg\.role === 'assistant' && msg\.streaming && !String\(msg\.content \|\| ''\)\.trim\(\)/)
assert.match(groupTemplate, /title="正在思考…"/)
assert.match(groupApi, /streamBufferedCoordinatorReply\(outputText\)/)

console.log(JSON.stringify({
  pass: true,
  schema: 'ccm-multi-scope-thinking-stream-regression-v1',
  scopes: {
    project: { immediateThinking: true, streamedReply: true },
    global: { immediateThinking: true, streamedReply: true },
    group: { immediateThinking: true, streamedReply: true, singleEnvelope: true },
  },
}, null, 2))
