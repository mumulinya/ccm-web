#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8')
const shared = read('../frontend/src/components/common/ConversationFindBar.vue')
const projectPanel = read('../frontend/src/components/projects/ProjectManagerPanel.vue')
const projectTemplate = read('../frontend/src/components/projects/ProjectManager.template.html')
const groupHeader = read('../frontend/src/components/collaboration/GroupChatHeader.vue')
const groupTemplate = read('../frontend/src/components/collaboration/GroupChat.template.html')
const globalAgent = read('../frontend/src/components/global/GlobalAgent.vue')
const musicPlayer = read('../frontend/src/components/music/MusicPlayer.vue')
const musicPanel = read('../frontend/src/components/music/MusicPlayerPanel.vue')
const musicTemplate = read('../frontend/src/components/music/MusicPlayer.template.html')
const app = read('../frontend/src/App.vue')

const checks = {
  sharedCtrlFAndEscape: shared.includes("event.key.toLocaleLowerCase() === 'f'") && shared.includes("event.key === 'Escape'"),
  sharedMatchCountAndCycling: shared.includes('matchIndices') && shared.includes('resultLabel') && shared.includes('% count'),
  sharedScrollAndHighlight: shared.includes('scrollIntoView') && shared.includes('conversation-find-match') && shared.includes('conversation-find-active'),
  exactScopeReset: shared.includes('watch(() => props.scopeKey, closeFind)') && shared.includes('watch(() => props.active'),
  safeTextExtraction: shared.includes('collectText') && !shared.includes('v-html'),
  projectSessionIntegrated: projectPanel.includes('ConversationFindBar') && projectTemplate.includes('target-id-prefix="msg-"') && projectTemplate.includes('currentProject ||') && projectTemplate.includes('currentSession ||'),
  groupSessionIntegrated: groupHeader.includes('ConversationFindBar') && groupHeader.includes('target-id-prefix="gc-msg-"') && groupTemplate.includes(':is-message-searchable="shouldShowGroupMessage"') && groupTemplate.includes('currentGroupSessionId'),
  globalSessionIntegrated: globalAgent.includes('<ConversationFindBar') && globalAgent.includes('target-id-prefix="msg-"') && globalAgent.includes(':scope-key="currentSessionId"'),
  musicSingletonIntegrated: musicPanel.includes('ConversationFindBar') && musicTemplate.includes('target-id-prefix="music-agent-msg-"') && musicTemplate.includes("'music-agent-msg-' + index") && musicTemplate.includes('scope-key="music-agent"'),
  onlyVisiblePageOwnsShortcut: app.includes('<MusicPlayer :active="currentTab === \'music\'"') && musicPlayer.includes(':active="props.active"') && musicTemplate.includes('props.active && musicAssistantOpen'),
}

for (const [name, passed] of Object.entries(checks)) assert.equal(passed, true, `${name} failed`)
console.log(JSON.stringify({ pass: true, checks, paidProviderCalls: 0 }, null, 2))
