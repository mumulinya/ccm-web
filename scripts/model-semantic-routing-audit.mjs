#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const body = (source, start, end) => {
  const from = source.indexOf(start)
  if (from < 0) return ''
  const to = end ? source.indexOf(end, from + start.length) : source.length
  return source.slice(from, to < 0 ? source.length : to)
}
const checks = {}

const semanticRuntime = read('backend/system/semantic-decision-runtime.ts')
checks.unifiedSemanticRuntime = semanticRuntime.includes('runSemanticDecision')
  && semanticRuntime.includes('ccm-semantic-decision-receipt-v1')
  && semanticRuntime.includes('providerContextCache')
  && semanticRuntime.includes('inFlight')
  && semanticRuntime.includes('semanticDecisionChecksum')
  && semanticRuntime.includes('SEMANTIC_DECISION_CONTEXT_OVER_CAPACITY')

const workflow = read('backend/agents/workflow-decision.ts')
checks.mainWorkflowUsesSemanticRuntime = workflow.includes('runSemanticDecision({')
  && workflow.includes('kind: "workflow"')
  && workflow.includes('semanticDecisionReceipt')
  && workflow.includes('Never classify by keyword, regex, message length')

const projectIntent = read('backend/modules/projects/project-chat-intent.ts')
const groupIntake = read('backend/modules/collaboration/collaboration-task-intake.ts')
const localGlobal = read('backend/modules/global/global-agent-local-intent.ts')
checks.primaryIntentRoutesFailClosed = projectIntent.includes('同步关键词项目意图分类已停用')
  && groupIntake.includes('同步关键词群聊意图分类已停用')
  && /inferLocalGlobalAction\([^)]*\)[\s\S]{0,180}return null;/.test(localGlobal)
  && /hasExplicitGlobalWriteAuthorization\([^)]*\)[\s\S]{0,100}return false;/.test(localGlobal)

const collaborationProtocol = read('backend/agents/collaboration-protocol.ts')
const crossAgentRuntime = read('backend/modules/collaboration/collaboration-runtime-cross-agent-runtime.ts')
const crossAgentRoute = body(crossAgentRuntime, 'async function resolveAgentQaSemanticRoute', 'export async function resumeAgentQaFromStoredContinuation')
const arbitration = body(crossAgentRuntime, 'function arbitrateAgentQaRequest', 'async function resolveAgentQaSemanticRoute')
checks.crossAgentAutoRouteIsModelOnly = crossAgentRoute.includes('runSemanticDecision({')
  && crossAgentRoute.includes('kind: "agent_collaboration_route"')
  && !crossAgentRuntime.includes('selectCollaborationTarget({ request: rawRequest')
  && !collaborationProtocol.includes('query.includes(')
  && collaborationProtocol.includes('strategy: "model_required"')
checks.crossAgentEscalationIsStructured = !/用户确认\|业务方确认\|产品确认|生产数据\|密钥|支付\|扣款/.test(arbitration)
  && arbitration.includes('routeDecision?.action === "ask_user"')
  && arbitration.includes('request.kind === "risk"')

const autoChecks = read('backend/test-agent/browser/auto-checks.ts')
const liveBrowserBuilder = body(autoChecks, 'export function buildBrowserChecksForProject')
const testPlanner = read('backend/test-agent/agentic-planner.ts')
const commandPlanner = read('backend/test-agent/command-planner.ts')
checks.testAgentNaturalLanguageHasSingleCompiler = liveBrowserBuilder.includes('const explicit =')
  && !liveBrowserBuilder.includes('buildAcceptanceFlowBrowserChecks')
  && !liveBrowserBuilder.includes('buildAcceptancePathBrowserSmokeChecks')
  && testPlanner.includes('ccm-test-agent-semantic-plan-v2')
  && testPlanner.includes('criterionCoverage')
  && testPlanner.includes('semantic_acceptance_unsupported')
checks.testAgentRequiredChecksAreEnums = commandPlanner.includes('requiredCheckEnabled')
  && !commandPlanner.includes('hasRequiredCheck(requiredChecks')
checks.testAgentPlannerFailsClosed = testPlanner.includes('agentic_test_planning_blocked')
  && testPlanner.includes('fallback: "none"')

const globalMemory = read('backend/agents/global/memory.ts')
const globalCandidateExtractor = body(globalMemory, 'export function extractGlobalMemoryCandidates', 'function upsertItems')
const globalIngest = body(globalMemory, 'export function ingestGlobalAgentConversation', 'export function recordGlobalMissionMemory')
const musicMemory = read('backend/modules/music/memory.ts')
const musicExtraction = body(musicMemory, 'export function scheduleMusicLongTermMemoryExtraction', 'export function recordMusicAgentAssistantTurn')
const projectCompaction = read('backend/modules/projects/project-session-compaction.ts')
const projectReference = body(projectCompaction, 'function referenceSummary', 'function normalizeSummary')
const groupExtraction = read('backend/modules/collaboration/group-session-memory-model-extraction.ts')
const groupAnchors = body(groupExtraction, 'function extractMergeAnchors', 'function supersessionGraphChecksum')
checks.globalMemoryAdmissionIsModelOnly = globalCandidateExtractor.includes('mode: "confirmed_semantic_facts"')
  && globalCandidateExtractor.includes('semanticStatus === "confirmed"')
  && !globalCandidateExtractor.includes('.test(text)')
  && globalIngest.includes('scheduleGlobalLongTermMemoryExtraction')
  && globalMemory.includes('kind: "memory_extraction"')
const globalRecall = body(globalMemory, 'export function recallGlobalAgentMemory', 'export function buildGlobalAgentMemoryPacket')
checks.globalMemoryRecallDoesNotInferIntent = globalRecall.includes('workflowDecision?.memoryPolicy')
  && !globalRecall.includes('typeBoost')
  && !/忽略\|不要使用|偏好\|习惯|授权\|允许/.test(globalRecall)
checks.musicMemoryAdmissionIsModelOnly = musicExtraction.includes('runSemanticDecision')
  && !musicExtraction.includes('if (!shouldExtractLongTerm')
  && musicExtraction.includes('evidenceMessageIds')
checks.compactionDoesNotClassifyNaturalLanguage = projectReference.includes('structured_memory_facts')
  && !projectReference.includes('.filter(message => /')
  && !projectReference.includes('allText.filter(text => /')
  && !/必须\|禁止|TODO\|FIXME|纠正\|更正/.test(groupAnchors)
const groupProjection = read('backend/modules/collaboration/group-compaction-projections.ts')
const persistentRequirements = body(groupProjection, 'export function extractPersistentRequirements', 'export function mergePersistentRequirements')
const blockedSignals = body(groupProjection, 'export function extractBlockedTaskSignals', 'export function addQualityCheck')
checks.groupCompactionUsesStructuredFacts = persistentRequirements.includes('semantic_memory_facts')
  && persistentRequirements.includes('semanticStatus')
  && !/必须\|不要\|不得\|禁止/.test(persistentRequirements)
  && blockedSignals.includes('["failed", "blocked"')
  && !/失败\|阻塞|error\|failed/.test(blockedSignals)

const globalStatus = read('backend/modules/global/global-agent-status.ts')
const acceptanceStatus = body(globalStatus, 'function isPositiveGlobalAcceptanceText', 'function isBareGlobalAcceptanceMarker')
const verificationStatus = body(globalStatus, 'function isStrongGlobalVerificationText', 'function globalTaskHasStrongAcceptanceEvidence')
const reviewStatus = body(globalStatus, 'function globalIndependentReviewStatusKind', 'function summarizeGlobalStatusIndependentReview')
const delivery = read('backend/agents/delivery-report.ts')
const deliveryVerification = body(delivery, 'export function deliveryVerificationFailureText', 'function formatDeliveryVerificationFailureEvidence')
checks.statusProjectionUsesStructuredEnums = !/未通过\|失败|已通过\|通过|passed\|pass/.test(acceptanceStatus)
  && !/建议\|可运行|已实际执行\|已执行/.test(verificationStatus)
  && !/需返工\|返工|已通过\|通过/.test(reviewStatus)
  && !/验证失败\|测试失败|通过\|成功/.test(deliveryVerification)
  && delivery.includes('验收状态无法证明')
const taskCard = read('backend/modules/collaboration/collaboration-task-card.ts')
const taskAcceptance = body(taskCard, 'export function isPositiveAcceptanceEvidenceText', 'export function deriveTaskLifecycle')
const globalMission = read('backend/modules/collaboration/global-mission.ts')
const missionAcceptance = body(globalMission, 'function isPositiveMissionAcceptanceText', 'function getMissionDeliverySummary')
checks.taskAndMissionAcceptanceAreStructured = taskAcceptance.includes('typeof value !== "object"')
  && taskAcceptance.includes('verificationFailures.length === 0')
  && !/未通过\|失败|已通过\|通过|passed\|pass/.test(taskAcceptance)
  && missionAcceptance.includes('typeof value !== "object"')
  && !/未通过\|失败|已通过\|通过|passed\|pass/.test(missionAcceptance)

const agentReceipts = read('backend/modules/collaboration/agent-receipts.ts')
const verificationGateSource = read('backend/modules/collaboration/collaboration-runtime-status-helpers.ts')
const verificationGate = body(verificationGateSource, 'export function getVerificationEvidenceGate', 'function normalizeVerificationMatchText')
checks.verificationReceiptsUseStructuredResults = agentReceipts.includes('normalizeVerificationResults')
  && agentReceipts.includes('verificationResults:')
  && verificationGate.includes('verificationResults')
  && !verificationGate.includes('isFailedVerification(item)')

const clarification = body(groupIntake, 'export function buildPlanModeClarificationQuestions', 'export async function buildGroupPlanModePreflight')
checks.planClarificationUsesModelSignals = clarification.includes('risk?.signals')
  && !/支付\|权限\|登录\|订单\|生产\|线上\|部署/.test(clarification)

const memoryCenter = read('backend/modules/knowledge/memory-control-center-api.ts')
const replay = read('backend/modules/collaboration/task-replay.ts')
checks.receiptsReachAuditSurfaces = memoryCenter.includes('semantic_decision_receipt')
  && memoryCenter.includes('legacy_unverified')
  && replay.includes('semantic_decision_receipt')
  && replay.includes('semantic_decision:')
  && crossAgentRuntime.includes('route_checksum')

const roleSkills = read('backend/skills/role-skills.ts')
const music = read('backend/modules/music/agent.ts')
checks.existingModelOnlyBoundariesRemain = roleSkills.includes('selectedSkillNames')
  && !roleSkills.includes('wantsFrontendVisualQa')
  && music.includes('本地音乐意图识别已停用')
  && music.includes('本地音乐语义兜底已停用')

const failures = Object.entries(checks).filter(([, value]) => !value).map(([name]) => name)
const report = {
  schema: 'ccm-model-semantic-routing-audit-v2',
  pass: failures.length === 0,
  paidProviderCalls: 0,
  checks,
  failures,
  productionEdges: {
    workflow: 'user message -> runSemanticDecision(workflow) -> schema validation -> task/answer',
    collaboration: 'coordination request -> runSemanticDecision(agent_collaboration_route) -> scope/security gate -> target/user',
    testAgent: 'acceptance criteria -> runSemanticDecision(test_agent_plan) -> contract validation -> deterministic executor',
    memory: 'complete turn -> runSemanticDecision(memory_extraction) -> evidence validation -> canonical candidate',
  },
  deterministicBoundary: [
    'explicit commands and structured identifiers',
    'paths, URLs, MIME and schema validation',
    'permission, dangerous-command and scope enforcement',
    'provider errors, token limits and checksums',
    'structured execution and terminal-state projection',
  ],
}

console.log(JSON.stringify(report, null, 2))
if (!report.pass) process.exitCode = 1
