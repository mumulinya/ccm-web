import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')

const component = read('frontend/src/components/common/SessionContextUsage.vue')
const composable = read('frontend/src/composables/useSessionContextUsage.js')
const composer = read('frontend/src/components/common/ChatComposer.vue')
const globalAgent = read('frontend/src/components/global/GlobalAgent.vue')
const groupPanel = read('frontend/src/components/collaboration/GroupChatPanel.vue')
const groupTemplate = read('frontend/src/components/collaboration/GroupChat.template.html')
const projectPanel = read('frontend/src/components/projects/ProjectManagerPanel.vue')
const projectTemplate = read('frontend/src/components/projects/ProjectManager.template.html')
const app = read('frontend/src/App.vue')
const globalMemory = read('backend/agents/global/memory.ts')
const projectCompaction = read('backend/modules/projects/project-session-compaction.ts')
const memoryCenterApi = read('backend/modules/knowledge/memory-control-center-api.ts')
const groupChat = read('frontend/src/components/collaboration/useGroupChat.js')
const groupStream = read('frontend/src/components/collaboration/useGroupChatStream.js')
const projectManager = read('frontend/src/components/projects/useProjectManager.js')
const globalMessaging = read('frontend/src/composables/useGlobalAgentMessaging.js')

const checks = {
  percentUsesModelWindow: /currentTokens\.value\s*\/\s*contextWindow\.value/.test(component),
  compactThresholdIsSeparate: /currentTokens\.value\s*\/\s*autoCompactThreshold\.value/.test(component),
  exactTokenPairIsVisible: /formatTokens\(currentTokens\).*formatTokens\(contextWindow\)/s.test(component),
  thresholdAndCircuitStatesVisible: /自动压缩线/.test(component) && /circuitOpen/.test(component),
  apiUsesExactScopeAndId: /memory-center\/scope\?scope=.*scopeId/.test(composable),
  lowFrequencyPolling: /15_000/.test(composable) && /Math\.max\(10_000/.test(composable),
  conversationRefreshIsDebounced: /refreshKey/.test(composable) && /scheduleRefresh/.test(composable),
  composerReservesTextSpace: /has-context-usage/.test(composer) && /padding-right:\s*76px/.test(composer),
  globalExactSessionScope: /scope:\s*'global_session'/.test(globalAgent) && /`session:\$\{currentSessionId\.value\}`/.test(globalAgent),
  groupExactSessionScope: /scope:\s*'group'/.test(groupPanel) && /\$\{currentGroup\.value\.id\}::\$\{currentGroupSessionId\.value\}/.test(groupPanel),
  projectExactSessionScope: /scope:\s*'project_session'/.test(projectPanel) && /\$\{currentProject\.value\}::\$\{currentSession\.value\}/.test(projectPanel),
  allComposersRenderIndicator: globalAgent.includes('<SessionContextUsage')
    && groupTemplate.includes('<SessionContextUsage')
    && projectTemplate.includes('<SessionContextUsage'),
  mobileDetailsAreClickable: /detailsOpen/.test(component) && /aria-expanded/.test(component) && /@click\.stop="toggleDetails"/.test(component),
  sourceAndFreshnessVisible: /tokenSourceLabel/.test(component) && /tokenUpdatedAt/.test(component) && /更新于/.test(component),
  actualBackendActivityExposed: /getGlobalAgentSessionCompactionActivity/.test(globalMemory)
    && /getProjectSessionCompactionActivity/.test(projectCompaction)
    && /readGroupCompactionActivity/.test(memoryCenterApi),
  activityReturnedByMemoryCenter: /compactionActivity/.test(memoryCenterApi) && /compacting:\s*compactionActivity\.active/.test(memoryCenterApi),
  activeRequestsUseTemporaryPolling: /activeRequest/.test(composable) && /2_000/.test(composable),
  hiddenProjectTabDisablesRequests: /ProjectManager :active="currentTab === 'projects'"/.test(app)
    && /props\.active !== false/.test(projectPanel),
  manualCompactEventsAreExact: /notifySessionContextUsage\('group', scopeId/.test(groupChat)
    && /notifySessionContextUsage\('project_session', scopeId/.test(projectManager)
    && /notifySessionContextUsage\('global_session', scopeId/.test(globalAgent),
  providerCompletionRefreshesImmediately: /provider_usage_updated/.test(projectManager)
    && /provider_usage_updated/.test(globalMessaging)
    && /provider_usage_updated/.test(groupStream),
}

assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2))
console.log(JSON.stringify({ pass: true, checks: Object.keys(checks).length, checksDetail: checks }, null, 2))
