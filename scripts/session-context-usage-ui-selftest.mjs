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
const globalAgentRuntime = read('backend/modules/global/global-agent-agentic-runtime.ts')
const projectCompaction = read('backend/modules/projects/project-session-compaction.ts')
const projectMainAgent = read('backend/modules/projects/project-main-agent.ts')
const memoryCenterApi = read('backend/modules/knowledge/memory-control-center-api.ts')
const collaborationRoutes = read('backend/modules/collaboration/collaboration-routes.ts')
const contextSnapshot = read('backend/system/session-compaction-core.ts')
const mainAgentToolRuntime = read('backend/tools/main-agent-tool-runtime.ts')
const groupOrchestrator = read('backend/modules/collaboration/group-orchestrator-llm.ts')
const agentToolsModal = read('frontend/src/components/common/AgentToolsModal.vue')
const groupToolsModal = read('frontend/src/components/collaboration/GroupToolsModal.vue')
const projectToolsModal = read('frontend/src/components/projects/ProjectToolsModal.vue')
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
  composerReservesTextSpace: /composer-footer-spacer/.test(composer)
    && /composer-context-slot/.test(composer)
    && /composer-inline-footer/.test(composer),
  globalExactSessionScope: /scope:\s*'global_session'/.test(globalAgent) && /`session:\$\{currentSessionId\.value\}`/.test(globalAgent),
  groupExactSessionScope: /scope:\s*'group'/.test(groupPanel) && /\$\{currentGroup\.value\.id\}::\$\{currentGroupSessionId\.value\}/.test(groupPanel),
  projectExactSessionScope: /scope:\s*'project_session'/.test(projectPanel) && /\$\{currentProject\.value\}::\$\{currentSession\.value\}/.test(projectPanel),
  allComposersRenderIndicator: globalAgent.includes('<SessionContextUsage')
    && groupTemplate.includes('<SessionContextUsage')
    && projectTemplate.includes('<SessionContextUsage'),
  runtimeStatusCenterHasTwoViews: /activeTab === 'overview'/.test(component)
    && /activeTab === 'context'/.test(component)
    && /会话状态页签/.test(component),
  runtimeStatusUsesExactConversation: /conversations\/runtime-status/.test(component)
    && /exact_session_id/.test(component)
    && /Cache-Control", "private, no-store"/.test(collaborationRoutes),
  runtimeStatusCoversTrueUsageAndGit: /provider_reported/.test(component)
    && /未提供/.test(component)
    && /workspaceSummary/.test(component)
    && /inspectProjectGit/.test(collaborationRoutes),
  allComposersBindRuntimeIdentity: /scope="global"[\s\S]{0,180}:exact-session-id="currentSessionId/.test(globalAgent)
    && /scope="group"[\s\S]{0,220}:exact-session-id="currentGroupSessionId/.test(groupTemplate)
    && /scope="project"[\s\S]{0,220}:exact-session-id="currentSession/.test(projectTemplate),
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
  detailedContextCategoriesVisible: [
    'System prompt',
    'Tool definitions',
    'Rules',
    'Skills',
    'MCP & dynamic tools',
    'Subagent definitions',
    'Summarized conversation',
    'Conversation',
  ].every(label => component.includes(label)),
  componentRatiosVisible: /usedPercent/.test(component) && /row\.usedPercent/.test(component),
  segmentedCapacityMeterVisible: /context-meter-segment/.test(component) && /row\.capacityPercent/.test(component),
  providerRemainderIsTransparent: /Provider 其余上下文/.test(component) && /历史 Provider 总量（无分项快照）/.test(component),
  latestPayloadAndConversationAreDistinguished: /最近完整模型载荷/.test(component)
    && /会话正文/.test(component)
    && /系统规则和已启用工具保持可用/.test(component)
    && /Skill、知识、源码及工具结果按需加载/.test(component),
  deferredToolsRemainVisibleWithoutInflatingUsage: (/授权可用目录/.test(component)
    || /工具上下文/.test(component))
    && /逐项按真实载荷与调用回执统计/.test(component)
    && /availableContextCatalog/.test(component)
    && /per_item_model_payload_evidence/.test(memoryCenterApi)
    && /scopeConfiguredContextTools/.test(memoryCenterApi),
  exactPerItemToolEvidenceIsPersisted: /ccm-loaded-context-items-v1/.test(contextSnapshot)
    && /loadedContextItemsChecksum/.test(contextSnapshot)
    && /buildMainAgentLoadedContextItems/.test(mainAgentToolRuntime)
    && /itemName/.test(mainAgentToolRuntime)
    && /resultChecksum/.test(mainAgentToolRuntime),
  postCompactToolRestoreIsVisible: /压缩边界恢复/.test(component)
    && /同 Run 加载/.test(component)
    && /固定加载/.test(component)
    && /dropReasons/.test(component)
    && /postCompactRestore/.test(memoryCenterApi)
    && /restoredSkillTokens/.test(memoryCenterApi)
    && /restoredMcpSchemaTokens/.test(memoryCenterApi),
  toolStateDoesNotGuessFromCategoryTokens: !/loadedThisTurn:\s*mcpLoadedTokens\s*>\s*0/.test(memoryCenterApi)
    && !/loadedThisTurn:\s*skillLoadedTokens\s*>\s*0/.test(memoryCenterApi)
    && /evidenceStatus:\s*evidenceAvailable\s*\?\s*"exact"\s*:\s*"unproven"/.test(memoryCenterApi),
  mcpRowCountsSchemasOnly: /mcpTools \?\? breakdown\.mcp \?\? 0\), tone: 'mcp'/.test(component)
    && !/\+ Number\(breakdown\.mcpResults \|\| 0\), tone: 'mcp'/.test(component)
    && /label: '工具结果'/.test(component)
    && /'summary', 'recentMessages', 'currentRequest', 'toolResults'/.test(component),
  catalogLoadedTokensExcludeResults: /const mcpLoadedTokens = Math.max\(0, Number\(breakdown\.mcpTools \?\? breakdown\.mcp \?\? 0\)\);/.test(memoryCenterApi),
  threeMainAgentSurfacesAttachExactEvidence: /buildMainAgentLoadedContextItems/.test(groupOrchestrator)
    && /projectMainLoadedContextItems/.test(projectMainAgent)
    && /loadedContextItems/.test(globalAgentRuntime),
  explicitZeroBucketsDoNotFallback: /hasPayloadBreakdown \? breakdown\.system \|\| 0/.test(component),
  exactGroupScopeRebuildsMissingBreakdown: /rebuildCurrentGroupContextAccounting/.test(memoryCenterApi)
    && /rebuildCurrentPayload:\s*true/.test(memoryCenterApi)
    && /modelVisiblePayloadAccounting/.test(memoryCenterApi),
  completeProviderAccountingBeatsConversationOnlySnapshot: /isCompleteMemoryCenterContextAccounting/.test(memoryCenterApi)
    && /selectMemoryCenterContextAccounting/.test(memoryCenterApi)
    && /provider_payload_accounting/.test(memoryCenterApi),
  globalAndProjectRebuildMissingBreakdown: /rebuildCurrentSessionContextAccounting/.test(memoryCenterApi)
    && /scope === "global_session"/.test(memoryCenterApi)
    && /scope === "project_session"/.test(memoryCenterApi)
    && /model_visible_payload_projection/.test(component),
  projectMainAgentPersistsActualPayload: /projectMainModelCallOptions/.test(projectMainAgent)
    && /recordProjectSessionProviderUsage/.test(projectMainAgent)
    && /modelVisiblePayload:\s*payload/.test(projectMainAgent),
  sharedToolAuthorizationLayout: /class="tool-columns"/.test(agentToolsModal)
    && /class="tool-column"/.test(agentToolsModal)
    && /AgentToolsModal/.test(groupToolsModal)
    && /AgentToolsModal/.test(projectToolsModal),
  projectConstraintsRemainAvailable: /项目执行约束/.test(projectToolsModal)
    && /项目验证命令/.test(projectToolsModal)
    && /update-field/.test(projectToolsModal),
}

assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2))
console.log(JSON.stringify({ pass: true, checks: Object.keys(checks).length, checksDetail: checks }, null, 2))
