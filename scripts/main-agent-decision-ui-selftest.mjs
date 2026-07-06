import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const files = {
  component: path.join(root, 'frontend/src/components/MainAgentDecisionCard.vue'),
  groupChat: path.join(root, 'frontend/src/components/GroupChat.vue'),
  groupTaskActions: path.join(root, 'frontend/src/composables/useGroupTaskCardActions.js'),
  taskCard: path.join(root, 'frontend/src/components/TaskExperienceCard.vue'),
  globalAgent: path.join(root, 'frontend/src/components/GlobalAgent.vue'),
  agentDisplay: path.join(root, 'frontend/src/utils/agentDisplay.js'),
  templates: path.join(root, 'frontend/src/components/Templates.vue'),
  searchHistory: path.join(root, 'frontend/src/components/SearchHistory.vue'),
  backend: path.join(root, 'backend/modules/collaboration.ts'),
  backendDisplay: path.join(root, 'backend/modules/collaboration-display.ts'),
}

const read = (file) => fs.readFileSync(file, 'utf-8')
const component = read(files.component)
const groupChat = read(files.groupChat)
const groupTaskActions = read(files.groupTaskActions)
const taskCard = read(files.taskCard)
const globalAgent = read(files.globalAgent)
const agentDisplay = read(files.agentDisplay)
const templates = read(files.templates)
const searchHistory = read(files.searchHistory)
const backend = read(files.backend)
const backendDisplay = read(files.backendDisplay)

const checks = {
  componentExists: fs.existsSync(files.component),
  userSummaryFields: ['读取内容', '本轮动作', '权限判断', '下一步'].every(text => component.includes(text)),
  technicalDetailsCollapsed: component.includes('<details') && component.includes('技术详情') && component.includes('rawJson'),
  decisionExplanation: component.includes('decisionExplanation') && component.includes('为什么没有派发') === false && component.includes('没有派发：'),
  actionTraceList: component.includes('actionRows') && component.includes('action-trace-list') && component.includes('action-trace-row'),
  userTodoPlanVisible: component.includes('planSteps') && component.includes('我准备这样处理') && component.includes('status-needs_confirmation') && component.includes('status-in_progress'),
  internalLoopVisible: component.includes('internalLoop') && component.includes('内部工作循环') && component.includes('loop-stage') && component.includes('loopStatusText'),
  compactTodoDoesNotHideFinalStep: component.includes('prioritizePlanSteps') && component.includes('const finalIndex = raw.length - 1') && !component.includes('raw.slice(0, props.compact ? 6 : 9)'),
  simpleConversationTodoHidden: component.includes('shouldHideSimpleConversationPlan') && component.includes("props.decision?.mode !== 'conversation'") && component.includes('hide_for_simple_conversation') && groupChat.includes("decision?.mode === 'conversation'") && groupChat.includes('display.user_visible === false'),
  userTodoFocusVisible: component.includes('plan-focus') && component.includes('currentPlanStep') && component.includes('currentPlanActions') && component.includes('stepActiveText'),
  liveTodoStatusesVisible: ['reviewing', 'reworking', 'failed', 'cancelled'].every(text => component.includes(text)) && component.includes('验收中') && component.includes('返工中'),
  liveVerifyBadgeNotAlwaysNeedsConfirm: component.includes('verifyBadge') && component.includes('进行中') && component.includes('需处理') && component.includes('decision-verify.work'),
  todoEvidenceAndStepActionsVisible: component.includes('plan-step-evidence') && component.includes('evidence-list') && component.includes('step-action-button') && component.includes("defineEmits(['step-action'])"),
  groupImportsComponent: groupChat.includes("import MainAgentDecisionCard"),
  groupHandlesSseEvent: groupChat.includes("data.type === 'main_agent_decision'") && groupChat.includes('attachMainAgentDecision'),
  groupPersistsDecisionInMessage: groupChat.includes('mainAgentDecision') && groupChat.includes('main_agent_decision'),
  groupRendersDecisionCard: groupChat.includes('<MainAgentDecisionCard v-if="getMainAgentDecision(msg)"'),
  groupRendersTopLatestDecision: groupChat.includes('latestMainAgentDecision') && groupChat.includes('latest-decision') && groupChat.includes('scrollToLatestMainDecision'),
  groupRendersTopPlanPreview: groupChat.includes('mainDecisionPlanSummary') && groupChat.includes('decision-plan-preview') && groupChat.includes('card?.mainAgentDecision || card?.main_agent_decision'),
  groupHandlesTodoStepActions: groupChat.includes('@step-action="handleTaskCardAction(msg, $event)"') && groupTaskActions.includes("action.kind === 'confirm_done'") && groupTaskActions.includes('action?.task_id'),
  groupDoesNotUseDeadPetEvent: !groupChat.includes('ccm-pet-speech'),
  groupUsesUserFacingCollaborationLabels: groupChat.includes('协作计划') && groupChat.includes('查看协作看板') && groupChat.includes('正在处理...') && !groupChat.includes('Coordinator 计划') && !groupChat.includes('查看协同 Pipeline'),
  frontendHasSharedDisplaySanitizer: agentDisplay.includes('sanitizeUserFacingAgentText') && agentDisplay.includes('getDisplayStream') && agentDisplay.includes('tool_use_summary') && agentDisplay.includes('getTechnicalDetailSections'),
  groupSummarizesChildAgentEvents: groupChat.includes('summarizeWorkEvents') && groupChat.includes('子 Agent 执行摘要') && groupChat.includes('getWorkEventSummary(msg).summary') && groupChat.includes('<details') && groupChat.includes('+{{ getWorkEventSummary(msg).hiddenCount }} 条详情'),
  userFacingTerminologySanitized: templates.includes('群聊协作（主 Agent）') && searchHistory.includes("item.agent || '主 Agent'") && !templates.includes('群聊协作 (Coordinator)') && !searchHistory.includes("item.agent || 'Coordinator'"),
  taskCardRendersDecision: taskCard.includes('MainAgentDecisionCard') && taskCard.includes('mainAgentDecision'),
  taskCardBubblesTodoStepActions: taskCard.includes('@step-action="emit(\'action\', $event)"'),
  taskCardRendersPlanMode: taskCard.includes('planMode') && taskCard.includes('执行前计划') && taskCard.includes('只读探索') && taskCard.includes('验收标准'),
  taskCardRendersWorkOrderExecutionAndAcceptance: taskCard.includes('workOrderPreview') && taskCard.includes('子 Agent 工作单') && taskCard.includes('executionStory') && taskCard.includes('执行过程') && taskCard.includes('acceptanceReview') && taskCard.includes('主 Agent 验收'),
  taskCardRendersAgentCoordinationProtocol: taskCard.includes('agentCoordination') && taskCard.includes('协作状态') && taskCard.includes('任务交接') && taskCard.includes('进度') && taskCard.includes('回执质量') && taskCard.includes('精准返工建议') && taskCard.includes('回执检查') && taskCard.includes('接口/契约传递') && taskCard.includes('协作记录') && taskCard.includes("kind: 'targeted_rework'"),
  taskCardFoldsRuntimeKernel: taskCard.includes('<details v-if="runtimeKernel"') && taskCard.includes('runtime-kernel-summary') && taskCard.includes('可展开排查'),
  taskCardUsesStreamlinedDisplay: taskCard.includes('getStreamlinedUserText') && taskCard.includes('getStreamlinedToolSummary') && taskCard.includes('technicalSections') && taskCard.includes('task-card-streamlined'),
  globalAgentUsesTechnicalSections: globalAgent.includes('runtimeDebugSections') && globalAgent.includes('getTechnicalDetailSections') && globalAgent.includes('runtime-debug-section'),
  backendTaskCreatedCarriesDecision: backend.includes('mainAgentDecision,') && backend.includes('main_agent_decision: mainAgentDecision'),
  backendPetLinkage: backend.includes('mainAgentPetStateFromDecision') && backend.includes('applyMainAgentDecisionPetState') && backend.includes('"global-agent"') && backend.includes('workspace-group'),
  backendBuildsUserTodoPlan: backend.includes('buildMainAgentUserPlanSteps') && backend.includes('buildUserVisiblePlanStep') && backend.includes('user_visible') && backend.includes('schema: "cc-style-todo-v2"') && backend.includes('show_current_focus: true') && backend.includes('hide_for_simple_conversation'),
  backendBuildsStreamlinedDisplay: backend.includes('buildMainAgentDisplayStream') && backendDisplay.includes('ccm-streamlined-display-v1') && backendDisplay.includes('streamlined_text') && backendDisplay.includes('streamlined_tool_use_summary') && backendDisplay.includes('tool_message_visible: false') && backendDisplay.includes('technical_details'),
  backendBuildsToolUseSummary: backendDisplay.includes('buildStreamlinedToolUseSummary') && backendDisplay.includes('hidden_tool_uses') && backendDisplay.includes('读取/检查') && backendDisplay.includes('协作通道'),
  backendBuildsInternalLoop: backend.includes('buildGroupMainAgentInternalLoop') && backend.includes('observe-think-plan-act-monitor-reflect-respond') && backend.includes('internal_loop') && backend.includes('GROUP_MAIN_AGENT_LOOP_STAGES'),
  backendSelftestCoversTodoPlan: backend.includes('allHaveUserTodoPlan') && backend.includes('conversationTodoSkipsDispatch') && backend.includes('projectTaskTodoTracksExecution') && backend.includes('governanceTodoNeedsConfirmation'),
  backendSelftestCoversInternalLoop: backend.includes('allHaveInternalLoop') && backend.includes('conversationLoopSkipsAct') && backend.includes('projectTaskLoopActsAndMonitors') && backend.includes('governanceLoopBlocksUnauthorizedAct'),
  backendBuildsLiveTodoPlan: backend.includes('buildLiveMainAgentTodoPlan') && backend.includes('ccm-live-task-todo') && backend.includes('buildLiveMainAgentDecisionForTask'),
  backendSelftestCoversLiveTodo: backend.includes('liveTodoReviewing') && backend.includes('liveTodoReworking') && backend.includes('liveTodoCancelled'),
  backendBuildsTodoEvidenceAndActions: backend.includes('buildTodoStepEvidence') && backend.includes('buildTodoStepActions') && backend.includes('liveTodoEvidenceTraceable') && backend.includes('liveTodoFailureHasActions'),
  backendBuildsPlanMode: backend.includes('buildGroupPlanModePreflight') && backend.includes('classifyPlanModeRisk') && backend.includes('planModePreflight.requires_confirmation'),
  backendPlanModeSelftest: backend.includes('planModeHighRiskRequiresConfirmation') && backend.includes('awaitingPlanCardShowsPlan') && backend.includes('planModeLowRiskAutoContinues'),
  backendBuildsWorkOrderExecutionAndAcceptance: backend.includes('buildUserWorkOrderPreview') && backend.includes('buildUserExecutionStory') && backend.includes('buildUserAcceptanceReview') && backend.includes('work_order_preview') && backend.includes('execution_story') && backend.includes('acceptance_review'),
  backendSelftestCoversWorkOrderExecutionAndAcceptance: backend.includes('workOrderPreviewVisible') && backend.includes('executionStoryShowsCodingFlow') && backend.includes('acceptanceReviewHardGateVisible') && backend.includes('missingEvidenceAcceptanceReviewBlocksCompletion'),
  backendBuildsAgentCoordinationProtocol: backend.includes('buildUserAgentCoordinationProtocol') && backend.includes('scoreChildAgentReceipt') && backend.includes('extractContractSyncHints') && backend.includes('main-child-agent-coordination-6.0'),
  backendChildContractMentionsCoordinationProtocol: backend.includes('ACK 结构要求') && backend.includes('contractChanges 结构要求') && backend.includes('回执质量要求'),
  backendSelftestCoversAgentCoordinationProtocol: backend.includes('agentCoordinationProtocolVisible') && backend.includes('agentCoordinationHeartbeatVisible') && backend.includes('agentCoordinationReceiptQualityScores') && backend.includes('agentCoordinationTargetedReworkForMissingEvidence') && backend.includes('agentCoordinationAckReviewApproved') && backend.includes('agentCoordinationContractTransferReady') && backend.includes('agentCoordinationEventStreamVisible') && backend.includes('acceptanceReviewIncludesAckGate') && backend.includes('agentCoordinationContractInjectAction') && backend.includes('contractChanges'),
  backendBuildsAgentCoordination62: backend.includes('buildAckPreflightReview') && backend.includes('buildContractTransferPlan') && backend.includes('buildCoordinationEventStream') && backend.includes('ack_review') && backend.includes('contract_transfer') && backend.includes('coordination_events'),
  backendBuildsAgentCoordination63: backend.includes('ack_gate_passed') && backend.includes('ACK 前置审核') && backend.includes('contract_inject') && backend.includes('注入契约给依赖 Agent'),
  backendBuildsTargetedReworkAction: backend.includes('buildTargetedReworkContinuationDraft') && backend.includes('targeted_gap_rework') && groupTaskActions.includes("action.kind === 'targeted_rework'"),
  groupHandlesPlanConfirmation: groupTaskActions.includes("action.kind === 'confirm_plan'") && groupTaskActions.includes('/api/usability/intake/confirm'),
}

const pass = Object.values(checks).every(Boolean)
console.log(JSON.stringify({ pass, checks }, null, 2))
if (!pass) process.exit(1)
