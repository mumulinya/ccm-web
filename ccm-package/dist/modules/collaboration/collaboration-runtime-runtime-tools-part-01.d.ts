import { CollabCtx } from "./collaboration-runtime-plan-tools";
export declare function runtimeToolDispatchBlockedMessage(projectName: string, runtimeToolContext?: any): string;
export declare function runtimeToolDispatchBlockedReceipt(projectName: string, runtimeToolContext?: any): any;
export declare function assertRuntimeToolDispatchReady(projectName: string, runtimeToolContext?: any): void;
export declare function prepareAgentRuntimeTools(groupId: string, projectName: string, workDir: string, agentType: string, allowedTools: any, streamRes?: any, options?: any): {
    audit: import("../../tools/runtime-tool-sync-part-01").RuntimeToolSyncAudit;
    workEvent: {
        id: string;
        time: string;
        agent: string;
        kind: string;
        text: string;
        runtimeToolSync: import("../../tools/runtime-tool-sync-part-01").RuntimeToolSyncAudit;
    };
    prompt: string;
    dispatchGate: import("../../tools/runtime-tool-sync-part-01").RuntimeToolDispatchGate;
    dispatchBlocked: boolean;
};
export declare function getConfiguredProjectVerificationCommands(projectName: string): string[];
export declare function getAgentRuntimeConsistencyStatus(): {
    pass: boolean;
    agents: {
        type: string;
        name: string;
    }[];
    runtimes: {
        id: any;
        aliases: any;
        commandLabel: any;
    }[];
    missing: {
        type: string;
        name: string;
    }[];
};
export declare function getProjectVerificationHintDetail(projectName: string, workDir?: string): {
    source: string;
    commands: string[];
};
export declare function buildProjectVerificationHints(projectName: string, workDir?: string): string[];
export declare function compactFormText(value: any, fallback?: string): string;
export declare function buildTaskContinuationBlock(message: string): string;
export declare function createTask(task: any): any;
export declare function createRequirementEpicWithChildren(payload: any): any;
export declare function updateRequirementEpicFromPlan(payload: any): any;
export declare function classifyTaskContinuation(message: string): any;
export declare function looksLikeTaskContinuation(message: string): any;
export declare function getGlobalMissionChildDeliveryEvidence(task: any): {
    strong_acceptance_passed: any;
    acceptance_evidence_status: "missing" | "strong" | "weak";
    acceptance_evidence_detail: string;
    execution_count: number;
    execution_states: {
        execution_id: any;
        agent: any;
        state: any;
        green_level: any;
        green_passed: boolean;
        workspace_mode: any;
        merge_status: string;
        merge_commit: any;
    }[];
    merge_required: boolean;
    merge_passed: boolean;
    merge_pending_execution_ids: any[];
    merge_commits: any[];
};
export declare function globalMissionChildGatePassed(task: any): boolean;
export declare function refreshGlobalMissionParentInTaskList(tasks: any[], parentId: string): any;
export declare function getGlobalDirectDispatchMeta(task: any): any;
export declare function getGlobalDirectDispatchContinuationKey(task: any): any;
export declare function shouldNotifyGlobalDirectDispatchContinuation(task: any, previousStatus?: string): any;
export declare function buildGlobalDirectDispatchContinuationMessage(task: any): any;
export declare function shouldNotifyGlobalDirectDispatchCompletion(task: any, previousStatus?: string): any;
export declare function buildGlobalDirectDispatchCompletionMessage(task: any): any;
export declare function shouldNotifyGlobalDirectDispatchRollback(task: any, previousStatus?: string): any;
export declare function buildGlobalDirectDispatchRollbackMessage(task: any): any;
export declare function appendGlobalDirectDispatchContinuationToHistory(task: any, previousStatus?: string): boolean;
export declare function appendGlobalDirectDispatchCompletionToHistory(task: any, previousStatus?: string): boolean;
export declare function appendGlobalDirectDispatchRollbackToHistory(task: any, previousStatus?: string): boolean;
export declare function updateTask(id: string, updates: any): any;
export declare function refreshGlobalDevelopmentMissions(): any;
export declare function getGlobalDevelopmentMission(id: string): any;
export declare function getMissionDependencyRefs(task: any): string[];
export declare function missionChildMatchesRef(task: any, ref: string): boolean;
export declare function removeTaskFromQueues(taskId: string): any;
export declare function appendGlobalMissionSupervisorTimeline(mission: any, actions?: any[], waitingUser?: any[], terminal?: boolean): {
    id: any;
    at: any;
    type: any;
    title: string;
    detail: string;
    status: any;
    agent: any;
    phase: any;
    data: any;
};
export declare function superviseGlobalDevelopmentMissionCycle(id: string, ctx: CollabCtx, options?: any): any;
export declare function controlGlobalDevelopmentMission(id: string, operation: string, ctx: CollabCtx, payload?: any): Promise<any>;
export declare function targetProjectForMissionTarget(target: any): string;
export declare function buildGlobalMissionTargetHandoff(input: {
    parent: any;
    target: any;
    group?: any;
    businessGoal: string;
    childGoal: string;
    acceptance: string;
    sourceDocuments?: string;
    traceId: string;
    priority?: string;
}): any;
export declare function buildGlobalGroupTestAgentOwnership(): any;
export declare function normalizeGlobalMissionTargetRequirements(payload: any, target: any): any;
export declare function createGlobalDevelopmentMission(payload: any, ctx: CollabCtx): any;
export declare function canCompleteDailyDevFromDeliverySummary(task: any, execution: any, summary: any): any;
export declare function reconcileTaskDeliveryEvidence(taskId: string): {
    success: boolean;
    status: number;
    error: string;
    completed?: undefined;
    task?: undefined;
    delivery_summary?: undefined;
} | {
    success: boolean;
    completed: boolean;
    task: any;
    delivery_summary: any;
    status?: undefined;
    error?: undefined;
};
export declare function validateTaskManualStatusUpdate(current: any, updates: any): string;
export declare function buildTaskGapContinuationDraft(task: any): any;
export declare function buildTargetedReworkContinuationDraft(task: any, payload?: any): string;
export declare function getTaskGapItems(task: any): any;
export declare function getTaskGapFingerprint(task: any): any;
export declare function isAutomaticGapContinuationSource(source: any): boolean;
export declare function canAutoContinueTaskGaps(task: any): any;
export declare function reconcileTaskCollaborationState(task: any, previous?: any): any;
