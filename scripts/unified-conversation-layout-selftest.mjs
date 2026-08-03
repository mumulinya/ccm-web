import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')

const shell = read('frontend/src/components/common/ConversationMessageShell.vue')
const processing = read('frontend/src/components/common/ConversationProcessingState.vue')
const globalMessages = read('frontend/src/components/global/GlobalAgentMessageList.vue')
const globalStyles = read('frontend/src/components/global/GlobalAgentConversationStyles.css')
const projectPanel = read('frontend/src/components/projects/ProjectManagerPanel.vue')
const projectTemplate = read('frontend/src/components/projects/ProjectManager.template.html')
const projectStyles = read('frontend/src/components/projects/ProjectManager.css')
const groupPanel = read('frontend/src/components/collaboration/GroupChatPanel.vue')
const groupTemplate = read('frontend/src/components/collaboration/GroupChat.template.html')
const groupStyles = read('frontend/src/components/collaboration/GroupChat.css')
const musicPanel = read('frontend/src/components/music/MusicPlayerPanel.vue')
const musicTemplate = read('frontend/src/components/music/MusicPlayer.template.html')

for (const [name, source] of Object.entries({ globalMessages, projectPanel, projectTemplate, groupPanel, groupTemplate, musicPanel, musicTemplate })) {
  assert.match(source, /ConversationMessageShell/, `${name} must use the shared conversation message shell`)
}

for (const [name, source] of Object.entries({ globalMessages, projectPanel, projectTemplate, groupPanel, groupTemplate, musicPanel, musicTemplate })) {
  assert.match(source, /ConversationProcessingState/, `${name} must use the shared processing state`)
}

assert.match(shell, /max-width:\s*min\(72%,\s*780px\)/, 'desktop assistant messages must have a stable reading width')
assert.match(shell, /max-width:\s*min\(68%,\s*680px\)/, 'desktop user messages must stay compact')
assert.match(shell, /@media \(max-width: 560px\)/, 'shared message shell must define a phone layout')
assert.match(shell, /max-width:\s*94%/, 'phone messages must preserve side gutters')
assert.match(processing, /role="status"/, 'processing state must be announced accessibly')
assert.match(processing, /overflow-wrap:\s*anywhere/, 'processing text must not collapse into a narrow vertical strip')
assert.doesNotMatch(globalMessages, /flex-direction:\s*column;\s*gap:\s*24px;\s*width:\s*100%/, 'global chat must not keep the old inline 24px flow')
assert.match(musicTemplate, /:timestamp="msg\.timestamp \|\| ''"/, 'music assistant must prefer complete timestamps')

for (const [name, source] of Object.entries({ globalStyles, projectStyles, groupStyles })) {
  assert.match(source, /--conversation-locator-safe-area:\s*44px/, `${name} must reserve the desktop message navigator rail`)
  assert.match(source, /--conversation-locator-safe-area:\s*34px/, `${name} must reserve the mobile message navigator rail`)
}
assert.match(globalStyles, /\.chat-flow\s*\{[\s\S]*?width:\s*100%[\s\S]*?padding:\s*0 0 0 var\(--conversation-locator-safe-area\)/, 'global messages must use the full conversation width behind the navigator gutter')
assert.match(projectStyles, /\.project-messages-flow\s*\{[\s\S]*?width:\s*100%[\s\S]*?padding:\s*0 0 0 var\(--conversation-locator-safe-area\)/, 'project messages must use the full conversation width behind the navigator gutter')
assert.match(groupStyles, /\.messages-flow\s*\{[\s\S]*?width:\s*100%[\s\S]*?padding:\s*0 0 0 var\(--conversation-locator-safe-area\)/, 'group messages must use the full conversation width behind the navigator gutter')

console.log(JSON.stringify({
  pass: true,
  checks: 25,
  surfaces: ['global', 'project', 'group', 'music'],
  paidProviderCalls: 0,
}, null, 2))
