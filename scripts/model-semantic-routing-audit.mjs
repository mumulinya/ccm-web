#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8')
const checks = {}

const workflow = read('backend/agents/workflow-decision.ts')
checks.workflowDecisionIsModelBacked = workflow.includes('decideWorkflowWithModel')
  && workflow.includes('不能按关键词、正则或句子长度机械匹配')
  && workflow.includes('selectedSkills')
  && workflow.includes('requiresCodeChanges')
  && workflow.includes('requiresAgentQa')
  && workflow.includes('requiresIndependentReview')
  && workflow.includes('memoryPolicy')
  && workflow.includes('authorizationDirective')

const roleSkills = read('backend/skills/role-skills.ts')
checks.skillSelectionUsesModelIds = roleSkills.includes('selectedSkillNames')
  && !roleSkills.includes('wantsFrontendVisualQa')
  && !roleSkills.includes('wantsIncidentDiagnosis')
  && !roleSkills.includes('wantsReleaseReadiness')

const projectIntent = read('backend/modules/projects/project-chat-intent.ts')
checks.projectIntentFailsClosed = projectIntent.includes('classifyProjectChatIntentWithModel')
  && projectIntent.includes('同步关键词项目意图分类已停用')
  && !projectIntent.includes('GREETING_PATTERN')

const groupIntent = read('backend/modules/collaboration/collaboration-task-intake.ts')
checks.groupIntentFailsClosed = groupIntent.includes('classifyGroupProjectTaskIntentWithAgent')
  && groupIntent.includes('同步关键词群聊意图分类已停用')
  && groupIntent.includes('explicit_task_choice: true')
  && !groupIntent.includes('llm_backed: false, explicit: true')

const groupLive = read('backend/modules/collaboration/group-live-routes.ts')
checks.explicitGroupTasksKeepModelSemantics = groupLive.includes('forceProjectTask: forceProjectTask || !!explicitContinuationTask')
  && groupLive.includes('explicitWorkflowDecision("execute_direct"')
  && !groupLive.includes('workflowDecision: { mode: "execute_direct"')

const groupRuntime = read('backend/modules/collaboration/collaboration-task-executor.ts')
const groupRouting = read('backend/modules/collaboration/group-orchestrator-routing.ts')
checks.groupDispatchHasNoCodedRuntimeFallback = !groupRuntime.includes('runCodedGroupOrchestrator')
  && !groupRouting.includes('runCodedGroupOrchestrator')
  && groupRuntime.includes('daily-dev-model-dispatch-repair')

const groupLlm = read('backend/modules/collaboration/group-orchestrator-llm.ts')
checks.groupPlanningPreservesPreflightDecision = groupLlm.includes('...(fallback?.workflowDecision || {})')
  && groupLlm.includes('...(parsed?.workflowDecision || parsed?.workflow_decision || {})')
  && groupLlm.includes('decomposeRequirementWithModelCoordinator')

const requirements = read('backend/modules/requirements/source-ingestion.ts')
checks.requirementsFailClosed = !requirements.includes('function fallbackRequirement(')
  && !requirements.includes('function fallbackRequirementDecomposition(')
  && !requirements.includes('已改用本地规则整理')
  && !requirements.includes('已生成本地保守拆解计划')
  && requirements.includes('未创建子任务')

const localGlobal = read('backend/modules/global/global-agent-local-intent.ts')
checks.globalLocalRouterDisabled = localGlobal.includes('Natural-language routing is model-only')
  && /inferLocalGlobalAction\([^)]*\)[\s\S]{0,180}return null;/.test(localGlobal)
  && /hasExplicitGlobalWriteAuthorization\([^)]*\)[\s\S]{0,100}return false;/.test(localGlobal)

const feishuActions = read('backend/modules/global/global-agent-feishu-actions.ts')
checks.feishuUsesStructuredModelParams = !feishuActions.includes('parseMusicKeyword(raw)')
  && !feishuActions.includes('guessCronSchedule(originalText)')
  && feishuActions.includes('semantic_params_missing')

const music = read('backend/modules/music/agent.ts')
const musicSelection = read('backend/modules/music/select-track.ts')
checks.musicIsModelOnly = music.includes('本地音乐意图识别已停用')
  && music.includes('本地音乐语义兜底已停用')
  && !musicSelection.includes('recommendation-fallback')
  && !musicSelection.includes('改用规则选曲')
  && musicSelection.includes('未执行本地选曲替代')
const artistFilter = musicSelection.slice(musicSelection.indexOf('if (selectionMode === "artist_random")'), musicSelection.indexOf('const cfg ='))
checks.artistSelectionUsesArtistFieldsOnly = artistFilter.includes('candidate?.artist')
  && !artistFilter.includes('candidate?.title')
  && !artistFilter.includes('candidate?.name')

const autoChecks = read('backend/test-agent/browser/auto-checks.ts')
const liveBrowserBuilder = autoChecks.slice(autoChecks.indexOf('export function buildBrowserChecksForProject'))
checks.testAgentRunsStructuredChecks = !liveBrowserBuilder.includes('buildAcceptanceClickFlowBrowserChecks')
  && !liveBrowserBuilder.includes('buildAcceptanceFormFlowBrowserChecks')
  && liveBrowserBuilder.includes('project.browserChecks')
const testPlanner = read('backend/test-agent/agentic-planner.ts')
checks.testAgentPlannerFailsClosed = testPlanner.includes('agentic_test_planning_blocked')
  && testPlanner.includes('fallback: "none"')
  && !testPlanner.includes('deterministic_verification_plan')

const templates = read('frontend/src/composables/useChatTemplates.js')
checks.frontendTemplateKeywordsRemoved = !templates.includes('inferTemplateId')
  && templates.includes('modelRecommendation')

const qualityCenter = read('backend/agents/quality-center.ts')
checks.qualityCenterFailsClosedWithoutModelIntent = qualityCenter.includes('category: "ambiguous"')
  && qualityCenter.includes('confidence: 0')
  && !qualityCenter.includes('const deniesAction =')
  && !qualityCenter.includes('const directive =')
  && !qualityCenter.includes('const wholeWorkspace =')
  && !qualityCenter.includes('模型未提供结构化语义时的服务端安全兜底')

const globalLoop = read('backend/agents/global/global-agent-loop-engine.ts')
const globalProjection = read('backend/agents/global/global-agent-run-projection.ts')
checks.globalClarificationAndLoopStayModelBound = globalLoop.includes('clarificationDecision = await decideWorkflowWithModel')
  && !globalLoop.includes('const deniesAction =')
  && globalLoop.includes('parseGlobalAgentDecision(rawDecision, run.workflow_decision')
  && globalProjection.includes('fallbackWorkflowDecision')

const typedMemory = read('backend/modules/collaboration/typed-memory-shared.ts')
const ignoreMemoryBody = typedMemory.slice(typedMemory.indexOf('export function shouldIgnoreGroupMemoryRequest'), typedMemory.indexOf('\n}', typedMemory.indexOf('export function shouldIgnoreGroupMemoryRequest')) + 2)
checks.memoryPolicyIsStructured = ignoreMemoryBody.includes('decision?.memoryPolicy')
  && !ignoreMemoryBody.includes('do not use')
  && !ignoreMemoryBody.includes('(忽略|')

const intakePreview = read('backend/modules/collaboration/collaboration-routes.ts')
checks.intakePreviewFailsClosedAndUsesModelScope = intakePreview.includes('requirement_model_decision_required')
  && intakePreview.includes('const workflowDecision = await decideWorkflowWithModel')
  && intakePreview.includes('extractedRequirement.scope')
  && !intakePreview.includes('/(页面|前端|ui|组件|样式)/i')

const reworkRuntime = read('backend/modules/collaboration/collaboration-test-agent-runtime.ts')
checks.reworkRoutingUsesStructuredSignals = reworkRuntime.includes('const requestedStrategy =')
  && reworkRuntime.includes('item?.goalRevision === true')
  && !reworkRuntime.includes('wrong\\s+(?:direction|approach)')

const reviewHelpers = read('backend/modules/collaboration/collaboration-runtime-status-helpers.ts')
checks.reviewVerdictUsesStructuredStatus = reviewHelpers.includes('["passed", "approved", "success"].includes(normalized)')
  && !reviewHelpers.includes('风险未解决')

const failures = Object.entries(checks).filter(([, value]) => !value).map(([name]) => name)
const report = {
  schema: 'ccm-model-semantic-routing-audit-v1',
  pass: failures.length === 0,
  paidProviderCalls: 0,
  checks,
  failures,
  deterministicBoundary: [
    'command and slash syntax',
    'IDs, paths, URLs and schema validation',
    'permission and risk enforcement',
    'provider error and context-limit detection',
    'structured receipt and status projection',
  ],
}

console.log(JSON.stringify(report, null, 2))
if (!report.pass) process.exitCode = 1
