import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  parseConversationSearchQuery,
  runConversationSearchSelfTest,
} from '../ccm-package/dist/modules/search/conversation-search.js'
import { __globalAgentSessionTestHooks } from '../frontend/src/composables/useGlobalAgentSessions.js'

const read = file => fs.readFileSync(file, 'utf8')
const contract = runConversationSearchSelfTest()
assert.equal(contract.pass, true)
assert.deepEqual(parseConversationSearchQuery('飞书 "工作周报" Agent').terms, ['工作周报', '飞书', 'agent'])
const welcome = { role: 'assistant', content: '你好！我是您的全局助手。' }
assert.equal(__globalAgentSessionTestHooks.isDisposableDefaultSession({ name: '默认会话', messages: [welcome] }, welcome), true)
assert.equal(__globalAgentSessionTestHooks.isDisposableDefaultSession({ name: '默认会话', messages: [welcome, { role: 'user', content: '真实问题' }] }, welcome), false)

const page = read('frontend/src/components/workspace/SearchHistory.vue')
const result = read('frontend/src/components/workspace/search/ConversationSearchResult.vue')
const highlighter = read('frontend/src/components/workspace/search/SafeHighlightedText.vue')
const app = read('frontend/src/App.vue')
const project = read('frontend/src/components/projects/ProjectManager.vue')
const group = read('frontend/src/components/collaboration/GroupChat.vue')
const globalAgent = read('frontend/src/components/global/GlobalAgent.vue')
const globalSessions = read('frontend/src/composables/useGlobalAgentSessions.js')
const server = read('backend/server.ts')
const legacySessions = read('backend/modules/projects/sessions.ts')

const checks = {
  safeRendering: !page.includes('v-html') && !result.includes('v-html') && !highlighter.includes('v-html') && highlighter.includes('{{ segment.text }}'),
  completeFiltersAndPagination: ['source', 'role', 'agent', 'timeRange', 'matchMode', 'response.page_count'].every(value => page.includes(value)),
  recentAndFavoritesPersist: page.includes('ccm-conversation-search-recent-v2') && page.includes('ccm-conversation-search-favorites-v2'),
  sourceToolbarIsIntegrated: page.includes('class="source-toolbar"') && page.includes('class="source-filter-group"') && page.includes('sourceCounts'),
  sourceSwitchLeavesFavorites: page.includes("viewMode.value = 'results'") && page.includes('const selectSource'),
  contextTaskAttachmentResult: result.includes('查看前后文') && result.includes('item.taskId') && result.includes('item.attachments'),
  unifiedRouteRegistered: server.includes('handleConversationSearchApi') && !legacySessions.includes('pathname === "/api/search"'),
  appRoutesAllConversationTypes: app.includes("item.conversationType === 'global'") && app.includes("item.conversationType === 'group'") && app.includes("item.conversationType === 'task'"),
  exactProjectMessageNavigation: project.includes('target.messageId') && project.includes('target.messageIndex'),
  exactGroupSessionMessageNavigation: group.includes('target.groupSessionId') && group.includes('target.messageId') && group.includes('loadMessages(1000)'),
  exactGlobalSessionMessageNavigation: globalAgent.includes('handleSearchNavigation') && globalAgent.includes('target.messageId') && globalAgent.includes("'search-hit'"),
  emptyGlobalWelcomeSessionNotPersistedAfterSync: globalSessions.includes('isDisposableDefaultSession(sessions.value[0]')
    && __globalAgentSessionTestHooks.isDisposableDefaultSession({ name: '默认会话', messages: [welcome] }, welcome),
}

for (const [name, pass] of Object.entries(checks)) assert.equal(pass, true, `${name} failed`)
console.log(JSON.stringify({ pass: true, contract, checks }, null, 2))
