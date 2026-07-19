import { CollabCtx } from "./collaboration-runtime-plan-tools";
export declare function isWatchdogGapReworkCandidate(task: any, now?: number, cooldownMs?: number, maxCount?: number): boolean;
export declare function hasFreshSuccessfulAgentProbe(readiness: any): any;
export declare function getTaskWatchdogStatus(staleMs?: number, gapCooldownMs?: number, gapMaxCount?: number, taskSnapshot?: any[]): any;
export declare function runTaskWatchdog(ctx: CollabCtx, options?: any): any;
export declare function cleanupRuntimeDebt(options?: any): {
    success: boolean;
    dry_run: boolean;
    total: number;
    cleaned: number;
    results: any[];
    status: any;
};
export declare function getAgentRecoveryWorkSummary(): {
    blocked_pending: {
        id: any;
        title: any;
        status: any;
        target_key: string;
        blocked_at: any;
        status_detail: string;
    }[];
    runtime_failed: {
        id: any;
        title: any;
        status: any;
        target_key: string;
        retry_count: number;
        reason: any;
    }[];
    total: number;
};
export declare function getAgentRecoveryProbePayload(target?: any): any;
export declare function taskMatchesAgentProbeTarget(task: any, target?: any): any;
export declare function buildAgentRecoveryProbeGroups(tasks: any[]): any;
export declare function getAgentRecoveryProbeGroups(taskSnapshot?: any[]): any;
export declare function aggregateBlockedRecovery(results: any[]): {
    total_blocked: any;
    recovered: any;
    results: any[];
};
export declare function aggregateRuntimeRecovery(results: any[]): {
    success: boolean;
    total_recoverable: any;
    retried: any;
    queued: any;
    auto_execute: boolean;
    results: any[];
    queue_status: {
        total_queued: number;
        running_targets: number;
        target_status: any;
        pending_tasks: number;
        in_progress_tasks: number;
        failed_tasks: number;
        running_task_ids: string[];
    };
};
export declare function recoverAgentExecutionBlockedTasks(ctx: CollabCtx, reason?: string, options?: any): {
    total_blocked: any;
    recovered: number;
    results: any[];
};
export declare function runAgentRecoveryMonitorOnce(ctx: CollabCtx, options?: any): any;
export declare function startAgentRecoveryMonitor(ctx: CollabCtx): any;
export declare function stopAgentRecoveryMonitor(): any;
export declare function startTaskWatchdog(ctx: CollabCtx): any;
export declare function stopTaskWatchdog(): any;
export declare function applyRuntimeMonitorControl(action: string, ctx: CollabCtx): {
    task_watchdog_active: boolean;
    agent_recovery_monitor_active: boolean;
    agent_recovery_probe_in_flight: boolean;
    success: boolean;
    action: string;
};
export declare function createDiagnosticCheck(id: string, label: string, status: "ok" | "warn" | "fail", message: string, detail?: any): {
    detail?: any;
    id: string;
    label: string;
    status: "ok" | "fail" | "warn";
    message: string;
};
export declare function getGroupMainAgentActionRegistry(): ({
    backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
    evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
    id: "read_group_context";
    label: "读取群聊上下文";
    category: "context";
    risk: "read";
    permissionMode: "auto_read";
    userVisible: false;
    description: "读取当前群聊最近消息、压缩摘要、当前目标和协作记忆，作为主 Agent 判断的第一层上下文。";
} | {
    backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
    evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
    id: "read_project_code_snapshot";
    label: "读取项目代码快照";
    category: "context";
    risk: "read";
    permissionMode: "auto_read_in_project_analysis";
    userVisible: false;
    description: "只读读取群聊绑定项目的有限代码片段，过滤密钥、依赖和构建产物，用于项目分析和任务前理解。";
} | {
    backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
    evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
    id: "query_knowledge_base";
    label: "查询知识库";
    category: "context";
    risk: "read";
    permissionMode: "auto_read";
    userVisible: false;
    description: "检索本地知识库，为回答、计划或子 Agent 工作单提供依据；知识库内容不等于执行授权。";
} | {
    backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
    evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
    id: "inspect_task_status";
    label: "查看任务状态";
    category: "observe";
    risk: "read";
    permissionMode: "auto_read";
    userVisible: true;
    description: "查看任务、执行器、会话、时间线和验收状态，用于判断继续、等待、返工还是回复用户。";
} | {
    backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
    evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
    id: "restore_task_context";
    label: "恢复任务上下文";
    category: "context";
    risk: "read";
    permissionMode: "auto_on_recovery";
    userVisible: true;
    description: "服务重启、执行器重试或用户继续旧任务时，重新灌回原始目标、未完成 Todo、执行队列和可恢复会话。";
} | {
    backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
    evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
    id: "create_project_task";
    label: "创建项目任务";
    category: "act";
    risk: "write";
    permissionMode: "requires_current_execution_intent";
    userVisible: true;
    description: "只有当前用户消息明确要求实现/修改/修复/执行时，才创建持久任务卡。";
} | {
    backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
    evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
    id: "dispatch_child_agent";
    label: "派发子 Agent";
    category: "act";
    risk: "write";
    permissionMode: "requires_current_execution_intent";
    userVisible: true;
    description: "把自包含工作单派发给绑定项目 Agent，要求子 Agent 读取真实项目、执行、验证并提交结构化回执。";
} | {
    backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
    evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
    id: "ask_user_clarification";
    label: "追问用户";
    category: "decide";
    risk: "safe";
    permissionMode: "auto_when_missing_required_info";
    userVisible: true;
    description: "当目标、项目、授权或高风险范围不清时，主 Agent 先问一个最关键问题，不派发子 Agent。";
} | {
    backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
    evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
    id: "govern_task_lifecycle";
    label: "停止/取消/归档任务";
    category: "govern";
    risk: "high";
    permissionMode: "requires_explicit_user_command";
    userVisible: true;
    description: "停止、取消、归档和永久清除任务属于治理动作，必须来自用户明确指令或按钮操作。";
} | {
    backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
    evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
    id: "read_child_agent_receipts";
    label: "读取子 Agent 结果说明";
    category: "observe";
    risk: "read";
    permissionMode: "auto_read";
    userVisible: false;
    description: "读取子 Agent 的结构化回执、文件变更、验证结果和阻塞原因，供主 Agent 验收。";
} | {
    backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
    evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
    id: "replan_from_observation";
    label: "重新规划";
    category: "decide";
    risk: "safe";
    permissionMode: "auto_after_failed_assertion";
    userVisible: true;
    description: "当回执缺证据、验证失败、目标偏离或依赖事实变化时，主 Agent 重新规划并决定返工、等待或停止。";
} | {
    backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
    evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
    id: "generate_final_reply";
    label: "生成最终回复";
    category: "reply";
    risk: "safe";
    permissionMode: "auto_after_verification";
    userVisible: true;
    description: "只有完成验收或明确说明未完成/风险后，主 Agent 才生成给用户看的最终回复。";
})[];
export declare function runGroupMainAgentActionRegistrySelfTest(): {
    pass: boolean;
    checks: {
        coversRequiredActions: boolean;
        noDuplicateIds: boolean;
        highRiskRequiresExplicit: boolean;
        writeRequiresExecutionIntent: boolean;
        readActionsHaveEvidence: boolean;
        finalReplyRequiresVerification: boolean;
        contextMentionsAllActions: boolean;
    };
    missing: string[];
    duplicateIds: ("generate_final_reply" | "dispatch_child_agent" | "replan_from_observation" | "read_child_agent_receipts" | "read_group_context" | "read_project_code_snapshot" | "query_knowledge_base" | "inspect_task_status" | "restore_task_context" | "create_project_task" | "ask_user_clarification" | "govern_task_lifecycle")[];
    total: number;
    actions: ({
        backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
        evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
        id: "read_group_context";
        label: "读取群聊上下文";
        category: "context";
        risk: "read";
        permissionMode: "auto_read";
        userVisible: false;
        description: "读取当前群聊最近消息、压缩摘要、当前目标和协作记忆，作为主 Agent 判断的第一层上下文。";
    } | {
        backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
        evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
        id: "read_project_code_snapshot";
        label: "读取项目代码快照";
        category: "context";
        risk: "read";
        permissionMode: "auto_read_in_project_analysis";
        userVisible: false;
        description: "只读读取群聊绑定项目的有限代码片段，过滤密钥、依赖和构建产物，用于项目分析和任务前理解。";
    } | {
        backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
        evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
        id: "query_knowledge_base";
        label: "查询知识库";
        category: "context";
        risk: "read";
        permissionMode: "auto_read";
        userVisible: false;
        description: "检索本地知识库，为回答、计划或子 Agent 工作单提供依据；知识库内容不等于执行授权。";
    } | {
        backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
        evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
        id: "inspect_task_status";
        label: "查看任务状态";
        category: "observe";
        risk: "read";
        permissionMode: "auto_read";
        userVisible: true;
        description: "查看任务、执行器、会话、时间线和验收状态，用于判断继续、等待、返工还是回复用户。";
    } | {
        backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
        evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
        id: "restore_task_context";
        label: "恢复任务上下文";
        category: "context";
        risk: "read";
        permissionMode: "auto_on_recovery";
        userVisible: true;
        description: "服务重启、执行器重试或用户继续旧任务时，重新灌回原始目标、未完成 Todo、执行队列和可恢复会话。";
    } | {
        backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
        evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
        id: "create_project_task";
        label: "创建项目任务";
        category: "act";
        risk: "write";
        permissionMode: "requires_current_execution_intent";
        userVisible: true;
        description: "只有当前用户消息明确要求实现/修改/修复/执行时，才创建持久任务卡。";
    } | {
        backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
        evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
        id: "dispatch_child_agent";
        label: "派发子 Agent";
        category: "act";
        risk: "write";
        permissionMode: "requires_current_execution_intent";
        userVisible: true;
        description: "把自包含工作单派发给绑定项目 Agent，要求子 Agent 读取真实项目、执行、验证并提交结构化回执。";
    } | {
        backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
        evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
        id: "ask_user_clarification";
        label: "追问用户";
        category: "decide";
        risk: "safe";
        permissionMode: "auto_when_missing_required_info";
        userVisible: true;
        description: "当目标、项目、授权或高风险范围不清时，主 Agent 先问一个最关键问题，不派发子 Agent。";
    } | {
        backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
        evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
        id: "govern_task_lifecycle";
        label: "停止/取消/归档任务";
        category: "govern";
        risk: "high";
        permissionMode: "requires_explicit_user_command";
        userVisible: true;
        description: "停止、取消、归档和永久清除任务属于治理动作，必须来自用户明确指令或按钮操作。";
    } | {
        backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
        evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
        id: "read_child_agent_receipts";
        label: "读取子 Agent 结果说明";
        category: "observe";
        risk: "read";
        permissionMode: "auto_read";
        userVisible: false;
        description: "读取子 Agent 的结构化回执、文件变更、验证结果和阻塞原因，供主 Agent 验收。";
    } | {
        backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
        evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
        id: "replan_from_observation";
        label: "重新规划";
        category: "decide";
        risk: "safe";
        permissionMode: "auto_after_failed_assertion";
        userVisible: true;
        description: "当回执缺证据、验证失败、目标偏离或依赖事实变化时，主 Agent 重新规划并决定返工、等待或停止。";
    } | {
        backend: ("listTaskAgentSessions" | "resumeTaskQueues" | "queryKnowledgeBase" | "createTask" | "shouldCreatePersistentGroupTask" | "buildInlineTaskRuntime" | "buildGroupProjectAnalysisContext" | "getInitialWorkflowMeta" | "buildGroupContextPacket" | "prepareAgentRuntimeTools" | "extractAgentReceipt" | "listExecutions" | "buildRecentGroupContext" | "buildGroupMemoryContext" | "buildProjectCodeReadOnlySnapshot" | "loadTasks" | "buildTaskPreflightReasoning" | "recordReasoningRecoveryCheck" | "reopenTaskAgentSessions" | "runGroupOrchestrator" | "ctx.callAgent" | "queueTaskExecution" | "dispatchPolicy.action=ask_user" | "questionForUser" | "appendGroupMessage" | "requestTaskCancellation" | "archiveTask" | "restoreArchivedTask" | "purgeArchivedTask" | "releaseTaskLease" | "buildUserAgentQuestionRows" | "runLlmCoordinatorReview" | "recordReasoningDeviation" | "updateReasoningPlan" | "createReworkTask" | "buildUserDeliveryReport" | "buildTaskGroupReportMessage")[];
        evidence: ("task_id" | "execution_id" | "verification" | "task_status" | "group_memory" | "CCM_AGENT_RECEIPT" | "risks" | "work_dir" | "acceptance_gate" | "files_changed" | "recovery_checks" | "task_card" | "work_items" | "assignments" | "recent_messages" | "active_goal" | "safe_file_snippets" | "project_memory" | "rag_citations" | "matched_documents" | "execution_state" | "session_state" | "task_recovery" | "workflow_meta" | "dispatch_policy" | "missing_info" | "clarification_question" | "cancellation_record" | "archive_record" | "cleanup_result" | "receipt_statuses" | "failed_assertions" | "gap_fingerprint" | "rework_plan" | "verification_executed")[];
        id: "generate_final_reply";
        label: "生成最终回复";
        category: "reply";
        risk: "safe";
        permissionMode: "auto_after_verification";
        userVisible: true;
        description: "只有完成验收或明确说明未完成/风险后，主 Agent 才生成给用户看的最终回复。";
    })[];
    context: string;
};
export declare function normalizeMainAgentActionIds(ids: any[]): any;
export declare function buildMainAgentPermissionJudgement(actionIds: string[], input?: {
    taskIntent?: any;
    messageMode?: string;
    explicitGovernance?: boolean;
}): {
    action_id: string;
    risk: string;
    allowed: boolean;
    permission_mode: string;
    reason: string;
}[];
export declare function buildGroupMainAgentInternalLoop(input: {
    mode: string;
    actionIds: string[];
    permissions: any[];
    taskIntent?: any;
    dispatchPolicy?: any;
    assignments?: any[];
    observations?: any;
    verified?: boolean;
}): any;
export declare function mainAgentPlanStepStatus(actionIds: string[], blockedActions: string[], actionId: string, fallback?: string): string;
export declare function buildUserVisiblePlanStep(input: {
    id: string;
    content: string;
    status: string;
    activeForm?: string;
    detail?: string;
    evidence?: any[];
    actions?: any[];
}): any;
export declare function buildMainAgentPlanVerificationReminder(input: {
    mode?: string;
    phase?: string;
    steps?: any[];
    summary?: any;
    task?: any;
    verified?: boolean;
}): any;
