import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const files = {
  component: path.join(root, 'frontend/src/components/MainAgentDecisionCard.vue'),
  groupChat: path.join(root, 'frontend/src/components/GroupChat.vue'),
  groupTaskActions: path.join(root, 'frontend/src/composables/useGroupTaskCardActions.js'),
  taskCard: path.join(root, 'frontend/src/components/TaskExperienceCard.vue'),
  backend: path.join(root, 'backend/modules/collaboration.ts'),
}

const read = (file) => fs.readFileSync(file, 'utf-8')
const component = read(files.component)
const groupChat = read(files.groupChat)
const groupTaskActions = read(files.groupTaskActions)
const taskCard = read(files.taskCard)
const backend = read(files.backend)

const checks = {
  componentExists: fs.existsSync(files.component),
  userSummaryFields: ['读取内容', '本轮动作', '权限判断', '下一步'].every(text => component.includes(text)),
  technicalDetailsCollapsed: component.includes('<details') && component.includes('技术详情') && component.includes('rawJson'),
  decisionExplanation: component.includes('decisionExplanation') && component.includes('为什么没有派发') === false && component.includes('没有派发：'),
  actionTraceList: component.includes('actionRows') && component.includes('action-trace-list') && component.includes('action-trace-row'),
  userTodoPlanVisible: component.includes('planSteps') && component.includes('我准备这样处理') && component.includes('status-needs_confirmation') && component.includes('status-in_progress'),
  internalLoopVisible: component.includes('internalLoop') && component.includes('内部工作循环') && component.includes('loop-stage') && component.includes('loopStatusText'),
  compactTodoDoesNotHideFinalStep: component.includes('return raw.slice(0, 9)') && !component.includes('raw.slice(0, props.compact ? 6 : 9)'),
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
  groupDoesNotUseDeadPetEvent: !groupChat.includes('ccm-pet-speech') && !groupChat.includes('window.dispatchEvent(new CustomEvent'),
  taskCardRendersDecision: taskCard.includes('MainAgentDecisionCard') && taskCard.includes('mainAgentDecision'),
  taskCardBubblesTodoStepActions: taskCard.includes('@step-action="emit(\'action\', $event)"'),
  taskCardRendersPlanMode: taskCard.includes('planMode') && taskCard.includes('执行前计划') && taskCard.includes('只读探索') && taskCard.includes('验收标准'),
  taskCardRendersWorkOrderExecutionAndAcceptance: taskCard.includes('workOrderPreview') && taskCard.includes('子 Agent 工作单') && taskCard.includes('executionStory') && taskCard.includes('执行过程') && taskCard.includes('acceptanceReview') && taskCard.includes('主 Agent 验收'),
  taskCardRendersAgentCoordinationProtocol: taskCard.includes('agentCoordination') && taskCard.includes('主 Agent ↔ 子 Agent 协作') && taskCard.includes('接单确认') && taskCard.includes('进度心跳') && taskCard.includes('回执质量') && taskCard.includes('精准返工建议') && taskCard.includes('ACK 审核') && taskCard.includes('契约传递') && taskCard.includes('协作事件流') && taskCard.includes("kind: 'targeted_rework'"),
  backendTaskCreatedCarriesDecision: backend.includes('mainAgentDecision,') && backend.includes('main_agent_decision: mainAgentDecision'),
  backendPetLinkage: backend.includes('mainAgentPetStateFromDecision') && backend.includes('applyMainAgentDecisionPetState') && backend.includes('"global-agent"') && backend.includes('workspace-group'),
  backendBuildsUserTodoPlan: backend.includes('buildMainAgentUserPlanSteps') && backend.includes('user_plan_steps') && backend.includes('todo_plan') && backend.includes('cc-style-todo'),
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
