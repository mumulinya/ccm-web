#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const http = __importStar(require("http"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const url = __importStar(require("url"));
const os = __importStar(require("os"));
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
const tool_manager_1 = require("./tools/tool-manager");
const tool_call_loop_1 = require("./tools/tool-call-loop");
const runtime_1 = require("./agents/runtime");
const provider_tool_access_evidence_1 = require("./agents/provider-tool-access-evidence");
const native_continuation_1 = require("./agents/native-continuation");
const provider_memory_channel_1 = require("./agents/provider-memory-channel");
const memory_context_consumption_receipt_1 = require("./integrations/memory-context-consumption-receipt");
const agent_internal_mcp_1 = require("./integrations/agent-internal-mcp");
const third_party_memory_snapshot_1 = require("./integrations/third-party-memory-snapshot");
const memory_context_consumption_recovery_1 = require("./integrations/memory-context-consumption-recovery");
const model_capability_cache_1 = require("./modules/collaboration/model-capability-cache");
const agent_sessions_1 = require("./tasks/agent-sessions");
const runtime_tool_sync_1 = require("./tools/runtime-tool-sync");
const tool_authorization_1 = require("./tools/tool-authorization");
const runtime_tool_real_cli_matrix_1 = require("./tools/runtime-tool-real-cli-matrix");
const execution_kernel_1 = require("./agents/execution-kernel");
const memory_1 = require("./projects/memory");
const worktree_1 = require("./agents/worktree");
const project_worker_delivery_1 = require("./modules/projects/project-worker-delivery");
const task_conversation_links_1 = require("./system/task-conversation-links");
const direct_dispatch_spool_1 = require("./agents/direct-dispatch-spool");
const conversation_turn_control_1 = require("./agents/conversation-turn-control");
const conversation_message_routing_1 = require("./agents/conversation-message-routing");
const secure_multipart_1 = require("./system/secure-multipart");
const user_visible_agent_events_1 = require("./system/user-visible-agent-events");
const workflow_decision_1 = require("./agents/workflow-decision");
const implementation_plan_1 = require("./agents/implementation-plan");
// 导入底座与持久层
const utils_1 = require("./core/utils");
const db_1 = require("./core/db");
const server_instance_lock_1 = require("./core/server-instance-lock");
const task_store_1 = require("./core/task-store");
const context_engine_recovery_1 = require("./system/context-engine-recovery");
const unified_task_scheduler_1 = require("./system/unified-task-scheduler");
// 导入子模块控制器
const projects_1 = require("./modules/projects/projects");
const project_git_1 = require("./modules/projects/project-git");
const git_workspace_runtime_1 = require("./modules/tools/git-workspace-runtime");
const project_main_agent_1 = require("./modules/projects/project-main-agent");
const project_main_turn_complete_1 = require("./modules/projects/project-main-turn-complete");
const sessions_1 = require("./modules/projects/sessions");
const conversation_search_1 = require("./modules/search/conversation-search");
const pre_plan_clarification_1 = require("./agents/pre-plan-clarification");
const conversation_search_index_1 = require("./modules/search/conversation-search-index");
const git_1 = require("./modules/tools/git");
const marketplace_1 = require("./modules/tools/marketplace");
const cron_1 = require("./modules/scheduling/cron");
const task_templates_1 = require("./modules/collaboration/task-templates");
const task_intake_preflight_1 = require("./modules/collaboration/task-intake-preflight");
const tools_1 = require("./modules/tools/tools");
const shared_files_api_1 = require("./modules/tools/shared-files-api");
const shared_files_v2_1 = require("./modules/tools/shared-files-v2");
const terminal_1 = require("./modules/tools/terminal");
const project_runtime_1 = require("./modules/projects/project-runtime");
const pets_1 = require("./modules/pets/pets");
const pet_activity_coordinator_1 = require("./modules/pets/pet-activity-coordinator");
const music_1 = require("./modules/music/music");
const collaboration_1 = require("./modules/collaboration/collaboration");
const task_permission_routes_1 = require("./modules/collaboration/task-permission-routes");
const collaboration_task_service_1 = require("./modules/collaboration/collaboration-task-service");
const task_permission_broker_1 = require("./modules/collaboration/task-permission-broker");
const storage_1 = require("./modules/collaboration/storage");
const group_session_lifecycle_head_1 = require("./modules/collaboration/group-session-lifecycle-head");
const feishu_channel_1 = require("./modules/collaboration/feishu-channel");
const feishu_conversation_v2_1 = require("./modules/collaboration/feishu-conversation-v2");
const group_session_maintenance_1 = require("./modules/collaboration/group-session-maintenance");
const memory_2 = require("./modules/collaboration/memory");
const group_memory_index_1 = require("./modules/collaboration/group-memory-index");
const task_agent_invocation_lineage_1 = require("./tasks/task-agent-invocation-lineage");
const task_agent_continuation_soak_1 = require("./tasks/task-agent-continuation-soak");
const reliability_drills_1 = require("./system/reliability-drills");
const soak_test_1 = require("./system/soak-test");
const process_lifecycle_1 = require("./system/process-lifecycle");
const runtime_events_1 = require("./system/runtime-events");
const agent_communication_api_1 = require("./system/agent-communication-api");
const code_intelligence_api_1 = require("./system/code-intelligence-api");
const user_visible_agent_events_api_1 = require("./system/user-visible-agent-events-api");
const automation_session_bindings_api_1 = require("./system/automation-session-bindings-api");
const agent_communication_v2_1 = require("./system/agent-communication-v2");
const execution_kernel_2 = require("./agents/execution-kernel");
const user_notifications_1 = require("./system/user-notifications");
const session_compaction_hooks_1 = require("./system/session-compaction-hooks");
const context_budget_1 = require("./system/context-budget");
const global_agent_1 = require("./modules/global/global-agent");
const rag_1 = require("./modules/knowledge/rag");
const knowledge_model_startup_1 = require("./modules/knowledge/knowledge-model-startup");
const source_ingestion_1 = require("./modules/requirements/source-ingestion");
const knowledge_access_1 = require("./modules/knowledge/knowledge-access");
const group_orchestrator_config_1 = require("./modules/collaboration/group-orchestrator-config");
const group_compaction_strategy_1 = require("./modules/collaboration/group-compaction-strategy");
const main_agent_context_policy_1 = require("./tools/main-agent-context-policy");
const main_agent_context_source_continuity_1 = require("./system/main-agent-context-source-continuity");
const main_agent_post_compact_continuity_1 = require("./system/main-agent-post-compact-continuity");
const slash_commands_1 = require("./modules/tools/slash-commands");
const slash_command_conversations_1 = require("./modules/tools/slash-command-conversations");
const credential_store_1 = require("./core/credential-store");
const feishu_reaction_feedback_1 = require("./integrations/feishu-reaction-feedback");
const feishu_inbound_attachments_1 = require("./integrations/feishu-inbound-attachments");
const usability_1 = require("./modules/system/usability");
const navigation_config_1 = require("./modules/system/navigation-config");
const settings_1 = require("./modules/system/settings");
const agent_provider_settings_1 = require("./modules/system/agent-provider-settings");
const local_auth_1 = require("./modules/system/local-auth");
const access_policy_1 = require("./modules/system/access-policy");
const api_access_control_1 = require("./modules/system/api-access-control");
const role_skills_1 = require("./skills/role-skills");
const chat_runs_1 = require("./projects/chat-runs");
const cleanup_center_1 = require("./system/cleanup-center");
const storage_index_1 = require("./system/storage-index");
const project_session_agent_binding_1 = require("./modules/projects/project-session-agent-binding");
const project_feishu_turn_queue_1 = require("./modules/projects/project-feishu-turn-queue");
const project_session_compaction_1 = require("./modules/projects/project-session-compaction");
const server_pet_activity_1 = require("./server-pet-activity");
const pet_agent_milestones_1 = require("./system/pet-agent-milestones");
const pet_asset_pack_1 = require("./modules/pets/pet-asset-pack");
const server_agent_runner_1 = require("./server-agent-runner");
const server_static_1 = require("./server-static");
const server_bootstrap_1 = require("./server-bootstrap");
// === 运行时内存状态与心跳推送 ===
let PORT = 3080;
let LISTEN_HOST = "127.0.0.1";
let SERVICE_LIFECYCLE_STATE = "starting";
let REQUEST_SERVICE_DRAIN = null;
const CCM_RUNTIME_VERSION = (() => {
    try {
        return String(require("../package.json")?.version || "dev");
    }
    catch {
        return "dev";
    }
})();
const { AGENT_RUNNER_DIR, AGENT_RUNNER_REQUESTS_DIR, AGENT_RUNNER_RESULTS_DIR, MUSIC_PET_AGENT_NAME, bindProjectRunAgentSession, broadcastPetConfigChanged, broadcastPetNavigation, broadcastPetSpeech, getAgentRunActivityDuration, getAgentState, getMusicPetAgent, getPetAgents, getPetNavigationTarget, getProjectPetActionStrategy, petStatusClients, petWorkspaceClients, setAgentActivity, setMusicPetState, writeSse } = (0, server_pet_activity_1.createPetActivityRuntime)({
    getPort: () => PORT,
    CCM_DIR: utils_1.CCM_DIR,
    GlobalPetActivityCoordinator: pet_activity_coordinator_1.GlobalPetActivityCoordinator,
    PETS_FILE: utils_1.PETS_FILE,
    PID_DIR: utils_1.PID_DIR,
    bindProjectSessionAgentExecution: project_session_agent_binding_1.bindProjectSessionAgentExecution,
    fs,
    getConfigs: db_1.getConfigs,
    getTaskAgentSessionOptions: agent_sessions_1.getTaskAgentSessionOptions,
    loadProjectChatRuns: chat_runs_1.loadProjectChatRuns,
    openTaskAgentSession: agent_sessions_1.openTaskAgentSession,
    path,
    projectChatRuns: chat_runs_1.projectChatRuns,
    saveProjectChatRuns: chat_runs_1.saveProjectChatRuns,
    createPetSpeechNotification: user_notifications_1.createPetSpeechNotification,
    sanitizePetNotificationText: user_notifications_1.sanitizePetNotificationText,
    url
});
const petAgentMilestoneProjector = (0, pet_agent_milestones_1.createPetAgentMilestoneProjector)({
    getMode: () => (0, pets_1.readPetConfig)().settings.agentProgressMode,
    fallbackTimeoutMs: 60_000,
    emit: milestone => {
        const role = milestone.petState === "error" ? "error" : milestone.petState === "waiting" ? "ask" : "status";
        broadcastPetSpeech(milestone.projectName || milestone.scopeId || "global-agent", {
            role,
            title: milestone.title,
            text: milestone.summary,
            mode: "replace",
            source: "agent-milestone",
            petState: milestone.petState,
            holdMs: role === "ask" ? 30_000 : role === "error" ? 18_000 : 8_000,
            action: milestone.action,
            petMilestone: true,
            milestone,
        });
    },
    persist: milestone => {
        (0, user_notifications_1.createUserNotification)({
            source_type: "pet_agent_milestone",
            source_channel: milestone.scope,
            scope_type: milestone.scope,
            scope_id: milestone.scopeId,
            exact_session_id: milestone.exactSessionId,
            task_id: milestone.taskId,
            notification_type: milestone.kind === "completed" ? "task_completed"
                : milestone.kind === "failed" ? "task_failed"
                    : milestone.kind === "cancelled" ? "task_cancelled" : "needs_user",
            severity: milestone.kind === "completed" ? "success"
                : milestone.kind === "failed" ? "error"
                    : milestone.kind === "cancelled" ? "info" : "warning",
            state: milestone.kind === "needs_user" ? "active" : "resolved",
            title: milestone.title,
            summary: milestone.summary,
            action: milestone.action,
            dedupe_key: milestone.dedupeKey,
        });
    },
});
// === Agent 并行/同步调用底座 ===
const { buildProjectToolContext, callAgent, callAgentForGroupStream, callAgentStream, sendRuntimeToolDispatchBlocked } = (0, server_agent_runner_1.createAgentRunnerRuntime)({
    AGENT_RUNNER_DIR,
    AGENT_RUNNER_REQUESTS_DIR,
    AGENT_RUNNER_RESULTS_DIR,
    UPLOAD_DIR: utils_1.UPLOAD_DIR,
    acknowledgeProviderMemoryChannelLaunch: provider_memory_channel_1.acknowledgeProviderMemoryChannelLaunch,
    appendDirectAgentDispatchTranscript: direct_dispatch_spool_1.appendDirectAgentDispatchTranscript,
    bindProjectRunAgentSession,
    bindProviderMemoryChannelLaunch: provider_memory_channel_1.bindProviderMemoryChannelLaunch,
    broadcastPetSpeech,
    buildAgentCommand: runtime_1.buildAgentCommand,
    buildNativeSessionContinuationEvidence: native_continuation_1.buildNativeSessionContinuationEvidence,
    buildProjectConversationBrief: memory_1.buildProjectConversationBrief,
    buildProjectExecutionBrief: memory_1.buildProjectExecutionBrief,
    buildRuntimeToolDispatchGate: runtime_tool_sync_1.buildRuntimeToolDispatchGate,
    buildRuntimeToolSyncPrompt: runtime_tool_sync_1.buildRuntimeToolSyncPrompt,
    buildToolAuthorizationPayload: tool_authorization_1.buildToolAuthorizationPayload,
    captureAgentRuntimeVersionSnapshot: runtime_1.captureAgentRuntimeVersionSnapshot,
    completeDirectAgentDispatch: direct_dispatch_spool_1.completeDirectAgentDispatch,
    createDirectAgentDispatchRequest: direct_dispatch_spool_1.createDirectAgentDispatchRequest,
    createFileChangeSnapshot: utils_1.createFileChangeSnapshot,
    createProjectChatRun: chat_runs_1.createProjectChatRun,
    detectAgentCommandFailure: runtime_1.detectAgentCommandFailure,
    extractNativeModelCapabilityReceipt: runtime_1.extractNativeModelCapabilityReceipt,
    extractProviderToolAccessEvidence: provider_tool_access_evidence_1.extractProviderToolAccessEvidence,
    fs,
    getAgentCommandLabel: runtime_1.getAgentCommandLabel,
    getAgentRunActivityDuration,
    getAgentRuntime: runtime_1.getAgentRuntime,
    getFileChanges: utils_1.getFileChanges,
    getRuntimeExecutionEnv: runtime_tool_sync_1.getRuntimeExecutionEnv,
    isSafeVerificationCommand: execution_kernel_1.isSafeVerificationCommand,
    loadProjectConfigs: db_1.loadProjectConfigs,
    markDirectAgentDispatchStarted: direct_dispatch_spool_1.markDirectAgentDispatchStarted,
    normalizeAgentCommandOutput: runtime_1.normalizeAgentCommandOutput,
    normalizeAgentRuntimeId: runtime_1.normalizeAgentRuntimeId,
    path,
    persistBoundedOutput: execution_kernel_1.persistBoundedOutput,
    prepareProviderMemoryChannel: provider_memory_channel_1.prepareProviderMemoryChannel,
    publicProjectChatRun: chat_runs_1.publicProjectChatRun,
    readMemoryContextConsumptionReceipt: memory_context_consumption_receipt_1.readMemoryContextConsumptionReceipt,
    recordMetric: db_1.recordMetric,
    recordProjectSessionProviderUsage: project_session_compaction_1.recordProjectSessionProviderUsage,
    recordModelCapabilityRefreshOutcome: model_capability_cache_1.recordModelCapabilityRefreshOutcome,
    recordRuntimeToolSyncAudit: runtime_tool_sync_1.recordRuntimeToolSyncAudit,
    recordTaskAgentSessionTurn: agent_sessions_1.recordTaskAgentSessionTurn,
    recordVerifiedNativeModelCapabilityReceipt: model_capability_cache_1.recordVerifiedNativeModelCapabilityReceipt,
    recoverMemoryContextConsumptionReceipt: memory_context_consumption_recovery_1.recoverMemoryContextConsumptionReceipt,
    registerExternalRunnerRequest: execution_kernel_1.registerExternalRunnerRequest,
    runManagedCommand: execution_kernel_1.runManagedCommand,
    runToolCallLoop: tool_call_loop_1.runToolCallLoop,
    sanitizeExecutionEnv: execution_kernel_1.sanitizeExecutionEnv,
    saveProjectChatRuns: chat_runs_1.saveProjectChatRuns,
    sendJson: utils_1.sendJson,
    setAgentActivity,
    spawn: child_process_1.spawn,
    syncRuntimeTools: runtime_tool_sync_1.syncRuntimeTools,
    terminateManagedChildProcess: execution_kernel_1.terminateManagedChildProcess,
    toolManager: tool_manager_1.toolManager,
    trackManagedChildProcess: execution_kernel_1.trackManagedChildProcess,
    verifyNativeSessionContinuationEvidence: native_continuation_1.verifyNativeSessionContinuationEvidence,
    verifyProviderMemoryChannelEvidence: provider_memory_channel_1.verifyProviderMemoryChannelEvidence,
    writeSse
});
// === HTTP 静态服务逻辑 ===
function createCollabCtx() {
    return {
        PORT,
        callAgent,
        callAgentForGroupStream,
        setAgentActivity,
        broadcastPetSpeech,
        createFileChangeSnapshot: utils_1.createFileChangeSnapshot,
        getFileChanges: utils_1.getFileChanges,
        recordMetric: db_1.recordMetric,
        toolManager: tool_manager_1.toolManager,
        buildUploadedFilesContext: utils_1.buildUploadedFilesContext,
        summarizeUploadedFiles: utils_1.summarizeUploadedFiles,
        buildFilesContext: utils_1.buildFilesContext,
        collectRequestBuffer: utils_1.collectRequestBuffer,
        getMultipartBoundary: utils_1.getMultipartBoundary,
        parseMultipart: utils_1.parseMultipart,
        getSharedFilePath: utils_1.getSharedFilePath,
        createSharedFileRecord: utils_1.createSharedFileRecord,
        normalizeSharedFileList: utils_1.normalizeSharedFileList,
        onTaskStatusChange: async (task, status, result = "") => {
            (0, cron_1.syncCronTaskStatus)(task, status, result);
            const normalizedStatus = String(status || "").toLowerCase();
            if (["done", "completed", "failed", "blocked", "cancelled", "waiting"].includes(normalizedStatus)) {
                const isSuccess = normalizedStatus === "done" || normalizedStatus === "completed";
                const needsUser = normalizedStatus === "blocked" || normalizedStatus === "waiting";
                const projectId = String(task?.target_project || task?.project_id || task?.project || "");
                const groupId = String(task?.group_id || task?.groupId || "");
                const exactSessionId = String(task?.exact_session_id
                    || task?.origin_session_id
                    || task?.project_session_id
                    || task?.group_session_id
                    || "");
                const anchorMessageId = String(task?.anchor_message_id || task?.anchorMessageId || task?.message_id || task?.messageId || "");
                const originMessageId = String(task?.origin_message_id || task?.originMessageId || task?.source_message_id || task?.sourceMessageId || "");
                try {
                    (0, user_notifications_1.createUserNotification)({
                        recipient_user_ids: [
                            task?.requester_user_id,
                            task?.created_by_user_id,
                            task?.origin_user_id,
                            task?.user_id,
                        ].map(String).filter(Boolean),
                        source_type: "task_terminal",
                        source_channel: String(task?.source_channel || task?.origin_channel || "workspace"),
                        scope_type: projectId ? "project" : groupId ? "group" : "task",
                        scope_id: projectId || groupId || String(task?.id || ""),
                        exact_session_id: exactSessionId,
                        task_id: String(task?.id || ""),
                        notification_type: needsUser ? "needs_user" : isSuccess ? "task_completed" : `task_${normalizedStatus}`,
                        severity: needsUser ? "warning" : isSuccess ? "success" : normalizedStatus === "cancelled" ? "info" : "error",
                        state: needsUser ? "active" : "resolved",
                        title: needsUser ? "任务需要你处理" : isSuccess ? "任务已完成" : normalizedStatus === "cancelled" ? "任务已取消" : "任务未能完成",
                        summary: result || task?.status_detail || task?.title || `任务状态已更新为 ${normalizedStatus}`,
                        action: {
                            kind: "task",
                            task_id: String(task?.id || ""),
                            scope_type: projectId ? "project" : groupId ? "group" : "task",
                            scope_id: projectId || groupId || String(task?.id || ""),
                            session_id: exactSessionId,
                            project_id: projectId,
                            group_id: groupId,
                            anchor_message_id: anchorMessageId,
                            origin_message_id: originMessageId,
                            generation: String(task?.generation || task?.session_generation || 0),
                        },
                        dedupe_key: `task-terminal:${task?.id || "unknown"}:${needsUser ? "needs_user" : isSuccess ? "completed" : normalizedStatus}`,
                    });
                }
                catch (error) {
                    console.warn("[用户通知]", error?.message || error);
                }
            }
            try {
                await (0, feishu_channel_1.notifyFeishuTaskStatus)(task, status, result);
            }
            catch (error) {
                console.warn("[飞书进度通知]", error?.message || error);
            }
        },
    };
}
// === 主生命周期请求拦截与模块化分流 ===
function handleRequest(req, res) {
    const parsed = url.parse(req.url, true);
    const pathname = parsed.pathname || "/";
    (0, api_access_control_1.applySecurityHeaders)(res);
    if (!(0, api_access_control_1.validateRequestHost)(req, res))
        return;
    // Browser requests stay same-origin. Local Node/Agent clients do not need CORS headers.
    const requestOrigin = String(req.headers.origin || "").trim();
    if (requestOrigin) {
        try {
            if (new URL(requestOrigin).host === String(req.headers.host || "")) {
                res.setHeader("Access-Control-Allow-Origin", requestOrigin);
                res.setHeader("Vary", "Origin");
            }
        }
        catch { }
    }
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-CCM-CSRF, X-CCM-Internal-Caller, X-CCM-Internal-Timestamp, X-CCM-Internal-Nonce, X-CCM-Internal-Signature");
    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }
    if ((0, local_auth_1.handleLocalAuthApi)(pathname, req, res))
        return;
    if (pathname.startsWith("/api/") && !(0, api_access_control_1.authorizeApiRequest)(req, res, String(req.url || pathname)))
        return;
    if ((0, access_policy_1.handleAccessPolicyApi)(pathname, req, res))
        return;
    if (pathname.startsWith("/api/") && !(0, access_policy_1.authorizeResourceQuery)(req, res, parsed))
        return;
    if (pathname === "/api/internal/lifecycle/identity" && req.method === "GET") {
        if (req.ccmAuth?.kind !== "internal" || req.ccmAuth?.caller !== "ccm-cli") {
            (0, utils_1.sendJson)(res, { success: false, code: "INTERNAL_CALLER_REQUIRED" }, 403);
            return;
        }
        const lock = (0, server_instance_lock_1.inspectCcmServerInstanceLock)();
        (0, utils_1.sendJson)(res, {
            success: lock.identity_verified,
            lifecycle_state: SERVICE_LIFECYCLE_STATE,
            identity: lock.owner,
            identity_verified: lock.identity_verified,
        }, lock.identity_verified ? 200 : 409);
        return;
    }
    if (pathname === "/api/internal/lifecycle/ready" && req.method === "GET") {
        if (req.ccmAuth?.kind !== "internal" || req.ccmAuth?.caller !== "ccm-cli") {
            (0, utils_1.sendJson)(res, { success: false, code: "INTERNAL_CALLER_REQUIRED" }, 403);
            return;
        }
        const lock = (0, server_instance_lock_1.inspectCcmServerInstanceLock)();
        const ready = SERVICE_LIFECYCLE_STATE === "ready" && lock.identity_verified;
        (0, utils_1.sendJson)(res, {
            success: ready,
            ready,
            lifecycle_state: SERVICE_LIFECYCLE_STATE,
            identity: lock.owner,
            identity_verified: lock.identity_verified,
        }, ready ? 200 : 503);
        return;
    }
    if (pathname === "/api/internal/lifecycle/drain" && req.method === "POST") {
        if (req.ccmAuth?.kind !== "internal" || req.ccmAuth?.caller !== "ccm-cli") {
            (0, utils_1.sendJson)(res, { success: false, code: "INTERNAL_CALLER_REQUIRED" }, 403);
            return;
        }
        if (!REQUEST_SERVICE_DRAIN) {
            (0, utils_1.sendJson)(res, { success: false, code: "DRAIN_UNAVAILABLE", lifecycle_state: SERVICE_LIFECYCLE_STATE }, 503);
            return;
        }
        (0, utils_1.sendJson)(res, { success: true, accepted: true, lifecycle_state: "draining" }, 202);
        setImmediate(() => REQUEST_SERVICE_DRAIN?.("ccm-cli"));
        return;
    }
    if (pathname === "/api/internal/update/status" && req.method === "GET") {
        if (req.ccmAuth?.kind !== "internal" || req.ccmAuth?.caller !== "ccm-cli") {
            (0, utils_1.sendJson)(res, { success: false, code: "INTERNAL_CALLER_REQUIRED" }, 403);
            return;
        }
        const updateFile = path.join(utils_1.CCM_DIR, "updates", "current.json");
        let transaction = null;
        try {
            transaction = JSON.parse(fs.readFileSync(updateFile, "utf-8"));
        }
        catch { }
        (0, utils_1.sendJson)(res, { success: true, transaction });
        return;
    }
    if (SERVICE_LIFECYCLE_STATE === "draining"
        && !["GET", "HEAD", "OPTIONS"].includes(String(req.method || "GET").toUpperCase())) {
        (0, utils_1.sendJson)(res, {
            success: false,
            error: "CCM正在安全停止，暂不接受新的修改操作",
            code: "SERVICE_DRAINING",
            retryable: true,
        }, 503);
        return;
    }
    if (req.method === "GET" && pathname.endsWith("/self-test")) {
        (0, utils_1.sendJson)(res, {
            success: false,
            error: "诊断接口已迁移为显式POST，GET不会再执行任何自测或写入操作",
            code: "DIAGNOSTIC_ENDPOINT_MOVED",
            endpoint: "/api/reliability/diagnostics/run",
        }, 410);
        return;
    }
    if ((0, feishu_reaction_feedback_1.handleFeishuReactionFeedbackApi)(pathname, req, res))
        return;
    if ((0, runtime_events_1.handleRuntimeEventsApi)(pathname, req, res, parsed))
        return;
    if ((0, user_visible_agent_events_api_1.handleUserVisibleAgentEventsApi)(pathname, req, res, parsed))
        return;
    if ((0, agent_communication_api_1.handleAgentCommunicationApi)(pathname, req, res, parsed, { retryTask: collaboration_1.retryTask, createCollabCtx }))
        return;
    if ((0, code_intelligence_api_1.handleCodeIntelligenceApi)(pathname, req, res))
        return;
    if ((0, user_notifications_1.handleUserNotificationsApi)(pathname, req, res, parsed))
        return;
    if (pathname === "/api/agent-runs" && req.method === "GET") {
        (0, utils_1.sendJson)(res, {
            success: true,
            runs: (0, execution_kernel_1.listActiveAgentRuns)({
                taskId: parsed.query.task_id || parsed.query.taskId,
                project: parsed.query.project,
            }),
            generated_at: new Date().toISOString(),
        });
        return;
    }
    if (pathname === "/api/agent-runs/cancel" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = (0, execution_kernel_1.cancelActiveAgentRun)(payload);
                (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return;
    }
    if (pathname === "/api/conversation-turns/self-test" && req.method === "GET") {
        const result = (0, conversation_turn_control_1.runConversationTurnControlSelfTest)();
        (0, utils_1.sendJson)(res, { success: result.pass, ...result }, result.pass ? 200 : 500);
        return;
    }
    if (pathname === "/api/conversation-turns/stop" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const scope = String(payload.scope || "").trim();
                if (scope !== "group")
                    return (0, utils_1.sendJson)(res, { success: false, error: "该入口请使用对应 Agent 的停止接口" }, 400);
                const cancellation = (0, execution_kernel_1.requestGroupSessionAgentCancellation)({
                    groupId: payload.group_id || payload.groupId,
                    groupSessionId: payload.group_session_id || payload.groupSessionId,
                    taskIds: [payload.task_id || payload.taskId].filter(Boolean),
                    reason: payload.reason || "用户停止群聊主 Agent 当前工作",
                    actor: payload.actor || "conversation-turn-control",
                });
                (0, utils_1.sendJson)(res, { success: true, cancellation });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return;
    }
    if ((0, conversation_turn_control_1.handleConversationTurnControlApi)(pathname, req, res, parsed))
        return;
    if (pathname === "/api/pets/runtime/stream" && req.method === "GET") {
        const isDesktopPet = req.ccmAuth?.kind === "internal" && req.ccmAuth?.caller === "desktop-pet";
        const recipientUserIds = isDesktopPet ? undefined : [String(req.ccmAuth?.userId || "")].filter(Boolean);
        const channel = isDesktopPet ? "desktop_pet" : "web_pet";
        const clientId = String(parsed.query.client_id || `${channel}:${crypto.randomUUID()}`).slice(0, 120);
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        });
        petStatusClients.add(res);
        writeSse(res, { type: "snapshot", agents: getPetAgents(), client_id: clientId });
        const sent = new Set();
        const flushNotifications = () => {
            const pending = (0, user_notifications_1.listPendingPetDeliveries)({ channel, recipient_user_ids: recipientUserIds, limit: 30 });
            for (const item of pending) {
                if (sent.has(item.delivery.delivery_id))
                    continue;
                if (!(0, user_notifications_1.claimPetDelivery)(item.delivery.delivery_id, clientId))
                    continue;
                try {
                    writeSse(res, { type: "notification", notification: (0, user_notifications_1.projectPetNotification)(item.notification, item.delivery) });
                    sent.add(item.delivery.delivery_id);
                }
                catch (error) {
                    (0, user_notifications_1.failPetDelivery)(item.delivery.delivery_id, error);
                }
            }
        };
        flushNotifications();
        const unsubscribe = (0, user_notifications_1.subscribeUserNotifications)(notification => {
            if (recipientUserIds?.length && !recipientUserIds.includes(notification.recipient_user_id))
                return;
            flushNotifications();
        });
        const heartbeat = setInterval(() => {
            try {
                res.write(`: heartbeat ${Date.now()}\n\n`);
                flushNotifications();
            }
            catch { }
        }, 10_000);
        req.on("close", () => {
            clearInterval(heartbeat);
            unsubscribe();
            petStatusClients.delete(res);
        });
        return;
    }
    // 1. SSE 实时状态数据管道单独拦截
    if (pathname === "/api/status/stream" && req.method === "GET") {
        const clientType = String(parsed.query.client || "").trim();
        const isWorkspaceClient = clientType === "workspace";
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        });
        petStatusClients.add(res);
        if (isWorkspaceClient)
            petWorkspaceClients.add(res);
        const snapshot = getPetAgents();
        writeSse(res, { type: "snapshot", agents: snapshot });
        const prevStates = {};
        snapshot.forEach(s => { prevStates[s.name] = s.state; });
        const interval = setInterval(() => {
            try {
                const currentSnapshot = getPetAgents();
                for (const s of currentSnapshot) {
                    if (prevStates[s.name] !== s.state) {
                        prevStates[s.name] = s.state;
                        writeSse(res, {
                            type: "state",
                            agent: s.name,
                            displayName: s.displayName,
                            state: s.state,
                            lastActivity: s.lastActivity,
                            detail: s.stateDetail,
                            track: s.track || null
                        });
                    }
                }
            }
            catch { }
        }, 1000);
        req.on("close", () => {
            clearInterval(interval);
            petStatusClients.delete(res);
            petWorkspaceClients.delete(res);
        });
        return;
    }
    // 2. 静态页面与 React SPA 托管
    if (pathname === "/" || pathname === "/index.html") {
        return (0, server_static_1.sendFile)(res, path.join(utils_1.PUBLIC_DIR, "index.html"));
    }
    if (pathname.startsWith("/assets/") || pathname.startsWith("/public/") ||
        pathname.startsWith("/css/") || pathname.startsWith("/js/") ||
        pathname.startsWith("/pets/") ||
        pathname === "/favicon.svg" || pathname === "/icons.svg" || pathname === "/favicon.ico") {
        const filePath = path.join(utils_1.PUBLIC_DIR, pathname.startsWith("/public/") ? pathname.replace("/public/", "") : pathname);
        if (fs.existsSync(filePath)) {
            return (0, server_static_1.sendFile)(res, filePath);
        }
    }
    // SPA fallback
    if (!pathname.startsWith("/api/") && req.method === "GET") {
        const filePath = path.join(utils_1.PUBLIC_DIR, pathname);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            return (0, server_static_1.sendFile)(res, filePath);
        }
        return (0, server_static_1.sendFile)(res, path.join(utils_1.PUBLIC_DIR, "index.html"));
    }
    // 提供飞书扫码二维码等临时文件访问的动态路由
    if (pathname.startsWith("/api/uploads/") && req.method === "GET") {
        const filename = pathname.split("/").pop();
        if (filename) {
            const filePath = path.join(utils_1.UPLOAD_DIR, filename);
            console.log("[文件访问] 请求文件:", filename, "路径:", filePath, "存在:", fs.existsSync(filePath));
            if (fs.existsSync(filePath)) {
                const ext = path.extname(filename).toLowerCase();
                const types = { ".png": "image/png", ".jpg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml" };
                res.writeHead(200, {
                    "Content-Type": types[ext] || "application/octet-stream",
                    "Access-Control-Allow-Origin": "*",
                    "Cache-Control": "no-cache"
                });
                fs.createReadStream(filePath).pipe(res);
                return;
            }
        }
        (0, utils_1.sendJson)(res, { error: "文件不存在" }, 404);
        return;
    }
    // 3. 构建依赖注入上下文 (Contexts)
    const projectsCtx = {
        PORT,
        getSessions: sessions_1.getSessions,
        getAgentState,
    };
    const petsCtx = {
        PORT,
        getPetAgents: getPetAgents,
        getPetNavigationTarget,
        broadcastPetNavigation,
        broadcastPetConfigChanged,
        getProjectPetActionStrategy,
        petWorkspaceClientsSize: petWorkspaceClients.size,
    };
    const musicCtx = {
        getMusicPetAgent,
        setMusicPetState,
        broadcastPetSpeech,
        MUSIC_PET_AGENT_NAME,
    };
    const collabCtx = createCollabCtx();
    if (pathname === "/api/project-runs/self-test" && req.method === "GET") {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-project-run-"));
        let runForCleanup = null;
        let continuationRunForCleanup = null;
        try {
            (0, child_process_1.execSync)("git init", { cwd: dir, stdio: "ignore" });
            fs.writeFileSync(path.join(dir, "tracked.txt"), "before\n", "utf-8");
            (0, child_process_1.execSync)("git add tracked.txt", { cwd: dir, stdio: "ignore" });
            (0, child_process_1.execSync)("git -c user.name=ccm -c user.email=ccm@example.local commit -m init", { cwd: dir, stdio: "ignore" });
            const run = (0, chat_runs_1.createProjectChatRun)("self-test-project", "修改 tracked.txt", dir);
            runForCleanup = run;
            const firstSession = bindProjectRunAgentSession(run, "self-test-project", "claudecode").session;
            const afterFirstTurn = (0, agent_sessions_1.recordTaskAgentSessionTurn)(firstSession.id, { nativeSessionId: firstSession.nativeSessionId, success: true }) || firstSession;
            const continuationRun = (0, chat_runs_1.createProjectChatRun)("self-test-project", "继续修改 tracked.txt", dir, run.id);
            continuationRunForCleanup = continuationRun;
            const continuationSession = bindProjectRunAgentSession(continuationRun, "self-test-project", "claudecode").session;
            if (!run.checkpoint_id)
                return (0, utils_1.sendJson)(res, { success: false, error: run.checkpoint?.error || "未创建检查点", run: (0, chat_runs_1.publicProjectChatRun)(run), checkpoint: run.checkpoint }, 500);
            fs.writeFileSync(path.join(dir, "tracked.txt"), "after\n", "utf-8");
            const beforeRollback = fs.readFileSync(path.join(dir, "tracked.txt"), "utf-8");
            const rollback = (0, execution_kernel_1.rollbackExecutionCheckpoint)(run.checkpoint_id, "project run self-test", { allowShared: true });
            const afterRollback = fs.readFileSync(path.join(dir, "tracked.txt"), "utf-8");
            const normalizedAfter = afterRollback.replace(/\r\n/g, "\n");
            let persistedBeforeCleanup = false;
            try {
                const persisted = JSON.parse(fs.readFileSync(chat_runs_1.PROJECT_CHAT_RUNS_FILE, "utf-8"));
                persistedBeforeCleanup = (persisted.runs || []).some((item) => item.id === run.id && item.checkpoint_id === run.checkpoint_id);
            }
            catch { }
            const continuationReusesSession = continuationRun.task_session_scope_id === run.id
                && continuationRun.task_agent_session_id === run.task_agent_session_id
                && continuationSession.id === firstSession.id
                && Number(continuationSession.turnCount || 0) >= Number(afterFirstTurn.turnCount || 0);
            (0, utils_1.sendJson)(res, { success: rollback.success && beforeRollback === "after\n" && normalizedAfter === "before\n" && persistedBeforeCleanup && continuationReusesSession, run: (0, chat_runs_1.publicProjectChatRun)(run), continuationRun: (0, chat_runs_1.publicProjectChatRun)(continuationRun), rollback, checks: { hasRunId: !!run.id, hasTrace: !!run.trace_id, hasCheckpoint: !!run.checkpoint_id, rollbackRestored: normalizedAfter === "before\n", persistedRunRecord: persistedBeforeCleanup, continuationReusesTaskAgentSession: continuationReusesSession }, contents: { beforeRollback, afterRollback } });
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 500);
        }
        finally {
            if (continuationRunForCleanup?.checkpoint_id) {
                try {
                    (0, execution_kernel_1.rollbackExecutionCheckpoint)(continuationRunForCleanup.checkpoint_id, "project run continuation self-test cleanup", { allowShared: true });
                }
                catch { }
            }
            if (runForCleanup?.id) {
                chat_runs_1.projectChatRuns.delete(runForCleanup.id);
            }
            if (continuationRunForCleanup?.id)
                chat_runs_1.projectChatRuns.delete(continuationRunForCleanup.id);
            if (runForCleanup?.id || continuationRunForCleanup?.id)
                (0, chat_runs_1.saveProjectChatRuns)();
            try {
                fs.rmSync(dir, { recursive: true, force: true });
            }
            catch { }
        }
        return;
    }
    if (pathname === "/api/project-runs/get" && req.method === "GET") {
        const id = String(parsed.query.id || parsed.query.run_id || "").trim();
        const run = id ? chat_runs_1.projectChatRuns.get(id) : null;
        if (!run)
            return (0, utils_1.sendJson)(res, { success: false, error: "项目执行不存在或服务已重启" }, 404);
        return (0, utils_1.sendJson)(res, { success: true, run: (0, chat_runs_1.publicProjectChatRun)(run), fileChanges: run.fileChanges || null, workEvents: Array.isArray(run.workEvents) ? run.workEvents.slice(-80) : [] });
    }
    if (pathname === "/api/project-runs/cancel" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const id = String(payload.id || payload.run_id || payload.task_id || "").trim();
                const run = chat_runs_1.projectChatRuns.get(id);
                if (!run)
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目执行不存在或服务已重启" }, 404);
                if (run.child) {
                    try {
                        (0, execution_kernel_1.terminateManagedChildProcess)(run.child);
                    }
                    catch {
                        try {
                            run.child.kill();
                        }
                        catch { }
                    }
                }
                run.status = "cancelled";
                run.updated_at = new Date().toISOString();
                (0, chat_runs_1.saveProjectChatRuns)();
                (0, utils_1.sendJson)(res, { success: true, run: (0, chat_runs_1.publicProjectChatRun)(run) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return;
    }
    if (pathname === "/api/project-runs/rollback" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const id = String(payload.id || payload.run_id || payload.task_id || "").trim();
                const run = chat_runs_1.projectChatRuns.get(id);
                if (!run)
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目执行不存在或服务已重启" }, 404);
                if (!run.checkpoint_id)
                    return (0, utils_1.sendJson)(res, { success: false, error: "该项目执行没有可用检查点" }, 409);
                const rollback = (0, execution_kernel_1.rollbackExecutionCheckpoint)(run.checkpoint_id, payload.reason || "用户从项目聊天安全撤销", { allowShared: true });
                run.status = "reverted";
                run.rollback = rollback;
                run.updated_at = new Date().toISOString();
                (0, chat_runs_1.saveProjectChatRuns)();
                (0, utils_1.sendJson)(res, { success: true, run: (0, chat_runs_1.publicProjectChatRun)(run), rollback });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return;
    }
    if (pathname === "/api/project-runs/delete" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const id = String(payload.id || payload.run_id || payload.task_id || "").trim();
                const run = (0, chat_runs_1.archiveProjectChatRun)(id, String(payload.reason || "用户删除项目执行记录").slice(0, 500));
                if (!run)
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目执行不存在或服务已重启" }, 404);
                (0, utils_1.sendJson)(res, { success: true, archived: true, run: (0, chat_runs_1.publicProjectChatRun)(run) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return;
    }
    if (pathname === "/api/project-runs/purge" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const id = String(payload.id || payload.run_id || payload.task_id || "").trim();
                const result = (0, chat_runs_1.purgeProjectChatRun)(id);
                if (!result)
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目执行不存在或服务已重启" }, 404);
                (0, utils_1.sendJson)(res, { success: true, purged: true, run_id: id, cleanup: result.cleanup });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return;
    }
    if (pathname === "/api/cleanup/summary" && req.method === "GET") {
        return (0, utils_1.sendJson)(res, (0, cleanup_center_1.getCleanupSummary)());
    }
    if (pathname.startsWith("/pets/") && req.method === "GET") {
        const downloaded = (0, pet_asset_pack_1.resolveDownloadedPetAsset)(pathname.slice("/pets/".length));
        if (downloaded)
            return (0, server_static_1.sendFile)(res, downloaded);
    }
    if (pathname === "/api/cleanup/transaction" && req.method === "GET") {
        const transaction = (0, cleanup_center_1.getCleanupTransaction)(String(parsed.query?.transaction_id || ""), { offset: parsed.query?.offset, limit: parsed.query?.limit });
        return transaction ? (0, utils_1.sendJson)(res, { success: true, transaction }) : (0, utils_1.sendJson)(res, { success: false, error: "清理事务不存在" }, 404);
    }
    if (pathname === "/api/cleanup/preview" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = (0, cleanup_center_1.previewCleanupAction)(String(payload.action || ""), {
                    retention_days: payload.retention_days,
                });
                (0, utils_1.sendJson)(res, result, result.success === false ? 400 : 200);
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return;
    }
    if (pathname === "/api/cleanup/run" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                if (payload.confirm !== true)
                    return (0, utils_1.sendJson)(res, { success: false, error: "缺少确认参数 confirm=true" }, 400);
                const result = (0, cleanup_center_1.runCleanupAction)(String(payload.action || ""), {
                    preview_token: payload.preview_token,
                    selected_ids: payload.selected_ids,
                    confirmation_phrase: payload.confirmation_phrase,
                    requested_by: req.auth?.username || req.ccmAuth?.username || "admin",
                });
                (0, utils_1.sendJson)(res, result, result.success === false ? (result.code === "state_drift" ? 409 : result.code === "cleanup_busy" ? 423 : 400) : 202);
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return;
    }
    if (["/api/cleanup/cancel", "/api/cleanup/resume"].includes(pathname) && req.method === "POST") {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const id = String(payload.transaction_id || "");
                const result = pathname.endsWith("/cancel") ? (0, cleanup_center_1.cancelCleanupTransaction)(id) : (0, cleanup_center_1.resumeCleanupTransaction)(id);
                (0, utils_1.sendJson)(res, result, result.success ? 200 : 404);
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return;
    }
    if (pathname === "/api/cleanup/storage-index/run" && req.method === "POST") {
        return (0, utils_1.sendJson)(res, { success: true, ...(0, storage_index_1.startStorageIndexScan)({ force: true }) }, 202);
    }
    if (pathname === "/api/projects/main-agent/task" && req.method === "GET") {
        const task = (0, project_main_agent_1.getProjectMainTask)(String(parsed.query?.task_id || parsed.query?.taskId || ""));
        if (!task)
            return (0, utils_1.sendJson)(res, { success: false, error: "项目主 Agent 任务不存在" }, 404);
        return (0, utils_1.sendJson)(res, { success: true, task: (0, project_main_agent_1.projectMainTaskPublic)(task) });
    }
    if (["/api/projects/main-agent/plan-confirm", "/api/projects/main-agent/task-action"].includes(pathname) && req.method === "POST") {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", async () => {
            try {
                const payload = JSON.parse(body || "{}");
                const taskId = String(payload.task_id || payload.taskId || "");
                const project = String(payload.project || "");
                const projectSessionId = String(payload.project_session_id || payload.projectSessionId || payload.session_id || "");
                const action = pathname.endsWith("/plan-confirm") ? "confirm_plan" : String(payload.action || "");
                const guardedProjectTask = (0, project_main_agent_1.getProjectMainTask)(taskId);
                if (!guardedProjectTask)
                    return (0, utils_1.sendJson)(res, { success: false, error: "项目主 Agent 任务不存在" }, 404);
                const guard = (0, task_conversation_links_1.validateTaskMutationGuard)(guardedProjectTask, payload, { requireTarget: ["confirm_plan", "resume_interrupted", "revise_plan"].includes(action) });
                if ("error" in guard)
                    return (0, utils_1.sendJson)(res, { success: false, error: guard.error, code: guard.code, ...guard.details }, guard.status);
                const persistProjectTaskProjection = (taskInput, content, source) => {
                    const task = (0, project_main_agent_1.projectMainTaskPublic)(taskInput);
                    (0, sessions_1.upsertProjectSessionTaskMessage)(project, projectSessionId, {
                        id: task.message_id,
                        role: "assistant",
                        content,
                        timestamp: new Date().toISOString(),
                        messageMode: "task",
                        type: "project_main_task",
                        task_id: taskId,
                        run_id: task.project_main_run_id || "",
                        taskExperience: { ...task, requires_card: true },
                        source,
                    });
                    return task;
                };
                if (action === "confirm_plan") {
                    const storedPlan = guardedProjectTask.workflow_meta?.project_main_plan
                        || guardedProjectTask.workflow_meta?.presentedPlan
                        || guardedProjectTask.workflow_meta?.presented_plan
                        || guardedProjectTask.intake_draft?.project_main_plan
                        || guardedProjectTask.intake_draft?.presentedPlan;
                    if (storedPlan?.schema === "ccm-implementation-plan-v2") {
                        const expectedRevision = payload.plan_revision ?? payload.planRevision;
                        const expectedChecksum = String(payload.plan_checksum || payload.planChecksum || "").trim();
                        if (expectedRevision !== undefined && Number(expectedRevision) !== Number(storedPlan.revision)) {
                            return (0, utils_1.sendJson)(res, { success: false, error: "计划 revision 已变化，请重新加载最新计划", code: "PLAN_REVISION_CONFLICT", revision: storedPlan.revision }, 409);
                        }
                        if (expectedChecksum && expectedChecksum !== String(storedPlan.checksum || "")) {
                            return (0, utils_1.sendJson)(res, { success: false, error: "计划 checksum 已变化，请重新加载最新计划", code: "PLAN_CHECKSUM_CONFLICT", checksum: storedPlan.checksum }, 409);
                        }
                        const quality = (0, implementation_plan_1.validateImplementationPlanV2)(storedPlan);
                        if (!quality.ok)
                            return (0, utils_1.sendJson)(res, { success: false, error: "计划尚未通过质量复核", code: "PLAN_QUALITY_INVALID", issues: quality.issues }, 409);
                    }
                    const confirmedTask = (0, project_main_agent_1.confirmProjectMainTask)(taskId, project, projectSessionId);
                    const task = persistProjectTaskProjection(confirmedTask, "执行计划已经确认，项目主 Agent 将继续安排开发和验收。", "project-main-agent-plan-confirmed");
                    return (0, utils_1.sendJson)(res, { success: true, task, taskExperience: { ...task, requires_card: true }, message_id: task.message_id, resume_required: true, resume_parent_run_id: confirmedTask.id });
                }
                if (action === "cancel") {
                    const cancelledTask = (0, project_main_agent_1.cancelProjectMainTask)(taskId, project, projectSessionId, String(payload.reason || "用户取消项目主 Agent 任务"));
                    const task = persistProjectTaskProjection(cancelledTask, "任务已停止。原计划、修订记录和已经产生的执行证据会继续保留。", "project-main-agent-cancelled");
                    return (0, utils_1.sendJson)(res, { success: true, task, taskExperience: { ...task, requires_card: true }, message_id: task.message_id });
                }
                if (action === "interrupt") {
                    const interruptedTask = (0, project_main_agent_1.interruptProjectMainTask)(taskId, project, projectSessionId, String(payload.reason || "用户停止当前项目主 Agent 执行"));
                    const task = persistProjectTaskProjection(interruptedTask, "当前执行已经停止。任务、计划、源码证据和子 Agent 会话都已保留，可以从这里继续。", "project-main-agent-interrupted");
                    return (0, utils_1.sendJson)(res, { success: true, task, taskExperience: { ...task, requires_card: true }, message_id: task.message_id, recovery_required: true });
                }
                if (action === "resume_interrupted") {
                    const resumedTask = await (0, project_main_agent_1.resumeInterruptedProjectMainTask)(taskId, project, projectSessionId, {
                        reconciliationAction: String(payload.reconciliation_action || payload.reconciliationAction || ""),
                        actor: "project-session-user",
                    });
                    const task = persistProjectTaskProjection(resumedTask, "已经恢复原任务和子 Agent 会话，将从上一个安全检查点继续。", "project-main-agent-recovered");
                    return (0, utils_1.sendJson)(res, { success: true, task, taskExperience: { ...task, requires_card: true }, message_id: task.message_id, resume_required: true, resume_parent_run_id: resumedTask.id });
                }
                if (action === "revise_plan") {
                    const feedback = String(payload.feedback || "").trim();
                    const clientMessageId = String(payload.client_message_id || payload.clientMessageId || "").trim();
                    if (!feedback)
                        return (0, utils_1.sendJson)(res, { success: false, error: "请填写需要调整的计划要求" }, 400);
                    if (!clientMessageId)
                        return (0, utils_1.sendJson)(res, { success: false, error: "缺少计划修订的客户端消息 ID" }, 400);
                    const revisionTask = (0, project_main_agent_1.getProjectMainTask)(taskId);
                    if (!revisionTask)
                        return (0, utils_1.sendJson)(res, { success: false, error: "项目主 Agent 任务不存在" }, 404);
                    if (String(revisionTask.target_project || "") !== project || String(revisionTask.project_session_id || "") !== projectSessionId) {
                        return (0, utils_1.sendJson)(res, { success: false, error: "任务不属于当前项目会话" }, 400);
                    }
                    (0, sessions_1.upsertProjectSessionTaskMessage)(project, projectSessionId, {
                        id: clientMessageId,
                        role: "user",
                        content: feedback,
                        timestamp: new Date().toISOString(),
                        type: "project_plan_revision",
                        task_id: taskId,
                        source: "project-plan-revision",
                    });
                    const result = await (0, project_main_agent_1.reviseProjectMainTask)({ taskId, project, projectSessionId, feedback, clientMessageId });
                    const task = persistProjectTaskProjection(result.task, `我已根据你的修改要求更新执行计划，这是第 ${result.revision.revision} 次修订。确认后会继续执行。`, "project-main-agent-plan-revision");
                    return (0, utils_1.sendJson)(res, {
                        success: true,
                        task,
                        taskExperience: { ...task, requires_card: true },
                        revision: result.revision,
                        duplicate: result.duplicate,
                        message_id: task.message_id,
                    });
                }
                return (0, utils_1.sendJson)(res, { success: false, error: "不支持的项目主 Agent 操作" }, 400);
            }
            catch (error) {
                return (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, /不存在/.test(String(error?.message || "")) ? 404 : 400);
            }
        });
        return;
    }
    // === 流式发送消息给 Agent（SSE）===
    if (pathname === "/api/send-stream" && req.method === "POST") {
        const contentType = req.headers["content-type"] || "";
        const handleStreamSend = async (project, message, files = [], parentRunId = "", projectSessionId = "", source = "web", platformContext = {}, clientMessageId = "", assistantMessageId = "", clarificationPayload = null, ccConnectAttachmentRefs = [], feishuAttachments = [], conversationTurnId = "", resolvedRoute = "", resolvedCandidateTaskId = "") => {
            let projectFeishuEnvelope = null;
            if (source === "feishu") {
                if (String(platformContext?.target_type || "project_agent") !== "project_agent") {
                    return (0, utils_1.sendJson)(res, { error: "飞书项目入口只允许调用项目主 Agent" }, 403);
                }
                try {
                    projectFeishuEnvelope = platformContext?.feishu_inbound_envelope || (0, feishu_conversation_v2_1.buildFeishuInboundEnvelopeV2)({
                        payload: { ...platformContext, project, target_type: "project_agent" },
                        targetType: "project_agent",
                        projectId: project,
                        transport: "acp",
                        messageId: platformContext?.platform_message_id || platformContext?.message_id,
                    });
                    if (projectFeishuEnvelope.target_type !== "project_agent" || projectFeishuEnvelope.project_id !== project) {
                        throw new Error("飞书入站回执与当前项目不匹配");
                    }
                }
                catch (error) {
                    return (0, utils_1.sendJson)(res, { error: `项目飞书身份校验失败：${error?.message || error}` }, 403);
                }
            }
            let controlledFeishuAttachments = Array.isArray(feishuAttachments)
                ? feishuAttachments.filter((item) => item?.schema === "ccm-feishu-inbound-attachment-v1")
                : [];
            if (controlledFeishuAttachments.length && (req.ccmAuth?.kind !== "internal" || !["feishu-acp", "project-feishu-queue"].includes(String(req.ccmAuth?.caller || "")))) {
                return (0, utils_1.sendJson)(res, { error: "飞书附件回执只允许由受信任的内部通道提交" }, 403);
            }
            if (source === "feishu" && Array.isArray(ccConnectAttachmentRefs) && ccConnectAttachmentRefs.length) {
                if (req.ccmAuth?.kind !== "internal" || req.ccmAuth?.caller !== "feishu-acp") {
                    return (0, utils_1.sendJson)(res, { error: "只有飞书 ACP 适配器可以提交本地附件引用" }, 403);
                }
                try {
                    const attachmentConfig = (0, db_1.getConfigs)().find(item => item.name === project);
                    const attachmentWorkDir = attachmentConfig ? String((0, db_1.getConfigInfo)(attachmentConfig.path)[0]?.workDir || "") : "";
                    if (!attachmentWorkDir)
                        throw new Error("无法确认当前项目工作目录");
                    const resolved = await (0, feishu_inbound_attachments_1.resolveFeishuInboundAttachments)({
                        messageId: String(platformContext?.platform_message_id || platformContext?.message_id || ""),
                        localRefs: ccConnectAttachmentRefs,
                        expectedWorkDir: attachmentWorkDir,
                        source: "cc_connect_acp",
                    });
                    if (!resolved.attachments.length)
                        throw new Error(resolved.failures[0]?.reason || "飞书附件未能安全接管");
                    controlledFeishuAttachments = resolved.attachments;
                    platformContext = {
                        ...platformContext,
                        feishu_attachments: controlledFeishuAttachments,
                        feishu_attachment_warnings: resolved.warnings,
                        feishu_attachment_failures: resolved.failures,
                    };
                }
                catch (error) {
                    return (0, utils_1.sendJson)(res, { error: `飞书附件接管失败：${error?.message || error}` }, 400);
                }
            }
            if (source === "feishu" && controlledFeishuAttachments.length) {
                try {
                    files = (0, feishu_inbound_attachments_1.materializeFeishuInboundAttachments)(controlledFeishuAttachments);
                }
                catch (error) {
                    return (0, utils_1.sendJson)(res, { error: `飞书附件受控副本不可用：${error?.message || error}` }, 400);
                }
            }
            const exactProjectSessionId = String(projectSessionId || "").trim();
            if (source === "feishu" && exactProjectSessionId && /^[123]$/.test(String(message || "").trim())) {
                const pendingRoute = conversation_turn_control_1.conversationTurnControl.listInternal({
                    scope: "project",
                    conversation_id: `${project}:${exactProjectSessionId}`,
                    statuses: "needs_route",
                    limit: 20,
                }).turns.at(-1);
                if (pendingRoute?.routing) {
                    const choice = String(message).trim() === "1" ? "continue_original" : String(message).trim() === "2" ? "start_new_task" : "answer_only";
                    if (choice !== "continue_original" || pendingRoute.routing.candidateTaskId) {
                        const resolved = conversation_turn_control_1.conversationTurnControl.resolveRoute({
                            id: pendingRoute.id,
                            revision: pendingRoute.revision,
                            choice,
                            bindingChecksum: pendingRoute.routing.bindingChecksum,
                        });
                        message = resolved.message;
                        conversationTurnId = resolved.id;
                        resolvedRoute = choice;
                        resolvedCandidateTaskId = resolved.routing?.candidateTaskId || "";
                    }
                }
            }
            let effectiveMessage = String(message || "");
            let resolvedProjectClarification = null;
            if (clarificationPayload && exactProjectSessionId) {
                const detail = (0, sessions_1.getSessionDetail)(project, exactProjectSessionId);
                const clarificationId = String(clarificationPayload.id || clarificationPayload.clarification_id || "").trim();
                const clarificationMessageId = String(clarificationPayload.message_id || clarificationPayload.messageId || "").trim();
                const pending = [...(Array.isArray(detail?.history) ? detail.history : [])].reverse().find((item) => {
                    const projection = item?.prePlanClarification || item?.pre_plan_clarification;
                    return item?.role === "assistant" && projection?.status === "pending"
                        && ((!clarificationId || String(projection.id || "") === clarificationId)
                            && (!clarificationMessageId || String(item.id || "") === clarificationMessageId));
                });
                const projection = pending?.prePlanClarification || pending?.pre_plan_clarification;
                if (!pending || !projection)
                    return (0, utils_1.sendJson)(res, { error: "当前项目会话中没有等待回答的这个业务澄清" }, 404);
                if (Number(clarificationPayload.revision || 0) !== Number(projection.revision || 0)
                    || Number(clarificationPayload.generation || 0) !== Number(projection.generation || 0)) {
                    return (0, utils_1.sendJson)(res, { error: "澄清内容已更新，请刷新后重新提交", code: "CLARIFICATION_REVISION_CONFLICT" }, 409);
                }
                const original = String(pending?.clarificationContext?.originalRequest || pending?.clarification_context?.original_request || pending?.requestText || "").trim();
                const checksum = crypto.createHash("sha256").update(original).digest("hex");
                if (projection.originalRequestChecksum && checksum !== projection.originalRequestChecksum) {
                    return (0, utils_1.sendJson)(res, { error: "原始请求绑定已变化，请重新开始规划", code: "CLARIFICATION_BINDING_CONFLICT" }, 409);
                }
                effectiveMessage = [
                    "[原始业务需求]", original,
                    "[用户确认的业务决策]", String(message || "").trim(),
                    "[续接要求]", "请基于上述业务决策生成详细计划和执行清单。计划必须 requiresConfirmation=true，在用户确认前不得启动项目子 Agent或修改代码。",
                ].filter(Boolean).join("\n\n");
                resolvedProjectClarification = { pending, projection };
            }
            const asideMatch = source === "feishu" ? String(message || "").trim().match(/^\/btw(?:\s+([\s\S]+))?$/i) : null;
            if (asideMatch) {
                if (!project || !exactProjectSessionId || !(0, sessions_1.getSessionDetail)(project, exactProjectSessionId)) {
                    return (0, utils_1.sendJson)(res, { error: "当前飞书消息没有精确绑定可读取的项目会话，无法执行临时提问" }, 400);
                }
                const question = String(asideMatch[1] || "").trim();
                if (!question)
                    return (0, utils_1.sendJson)(res, { error: "请在 /btw 后输入临时问题" }, 400);
                try {
                    const result = await (0, slash_command_conversations_1.runConversationAside)({ scope: "project", scopeId: project, exactSessionId: exactProjectSessionId, question });
                    const reply = `临时提问 · 基于提问时上下文\n\n${result.answer}`;
                    await (0, feishu_channel_1.notifyFeishuTaskStage)({
                        stage: "project_agent_aside",
                        title: `${(0, project_runtime_1.projectDisplayName)(project)} · 临时提问`,
                        markdown: reply,
                        sessionId: exactProjectSessionId,
                        forceNewMessage: true,
                        dedupeKey: `project-feishu-aside:${projectFeishuEnvelope?.message_id || crypto.randomUUID()}`,
                    });
                    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "private, no-store", Connection: "keep-alive", "X-Accel-Buffering": "no" });
                    writeSse(res, { type: "chunk", text: reply, ephemeral: true });
                    writeSse(res, { type: "done", ephemeral: true, content_stored: false });
                    res.end();
                    return;
                }
                catch (error) {
                    return (0, utils_1.sendJson)(res, { error: error?.message || "临时提问失败" }, 400);
                }
            }
            let sourceIngestion = null;
            try {
                sourceIngestion = await (0, source_ingestion_1.ingestRequirementSources)({
                    files: Array.isArray(files) ? files : [],
                    userText: effectiveMessage,
                    extractRequirement: false,
                    decomposeRequirement: false,
                });
            }
            catch (error) {
                console.warn(`[项目资料读取] ${project || "unknown"} 统一解析失败：${error?.message || error}`);
            }
            const attachmentSources = Array.isArray(sourceIngestion?.sources) ? sourceIngestion.sources : [];
            const readableAttachmentCount = attachmentSources.filter((item) => item?.readable === true || ["parsed", "partial"].includes(String(item?.status || "").toLowerCase())).length;
            const publicProjectFeishuAttachments = (0, feishu_inbound_attachments_1.publicFeishuInboundAttachments)(controlledFeishuAttachments).map((item) => {
                const parsed = attachmentSources.find((sourceItem) => String(sourceItem?.name || "") === item.name);
                return parsed ? { ...item, status: String(parsed.status || (parsed.readable ? "parsed" : "failed")), readable: parsed.readable === true } : item;
            });
            if (controlledFeishuAttachments.length && readableAttachmentCount === 0
                && /^(?:请读取并处理我刚发送的附件。?|请读取并处理这条飞书附件。?)$/.test(String(message || "").trim())) {
                return (0, utils_1.sendJson)(res, {
                    error: "附件已经收到，但没有可读取的内容。请转换为 PDF、图片或文本后重新发送。",
                    attachment_failures: Array.isArray(platformContext?.feishu_attachment_failures) ? platformContext.feishu_attachment_failures : [],
                }, 400);
            }
            const sourceContext = String(sourceIngestion?.agent_context || "");
            const fallbackFileContext = !sourceContext && files && files.length > 0
                ? (0, utils_1.buildUploadedFilesContext)(files, "本次消息附件")
                : "";
            const finalMessage = `${effectiveMessage}${sourceContext || fallbackFileContext}`;
            if (!project || !finalMessage.trim())
                return (0, utils_1.sendJson)(res, { error: "参数不足" }, 400);
            const configs = (0, db_1.getConfigs)();
            const config = configs.find(c => c.name === project);
            if (!config)
                return (0, utils_1.sendJson)(res, { error: "项目不存在" }, 400);
            if (exactProjectSessionId && !(0, sessions_1.getSessionDetail)(project, exactProjectSessionId)) {
                return (0, utils_1.sendJson)(res, { error: "项目会话不存在" }, 404);
            }
            const safeClientMessageId = /^[A-Za-z0-9:_-]{1,180}$/.test(String(clientMessageId || "").trim())
                ? String(clientMessageId).trim()
                : String(req.headers?.["x-client-message-id"] || "").trim();
            const safeAssistantMessageId = /^[A-Za-z0-9:_-]{1,180}$/.test(String(assistantMessageId || "").trim())
                ? String(assistantMessageId).trim()
                : `project-reply:${Date.now().toString(36)}:${Math.random().toString(16).slice(2, 10)}`;
            let projectFeishuDestination = null;
            let projectFeishuOriginReceipt = null;
            const enqueueCurrentProjectFeishuTurn = () => {
                const requestId = String(projectFeishuEnvelope?.message_id || projectFeishuEnvelope?.checksum || platformContext?.platform_message_id || "").trim();
                const queued = (0, project_feishu_turn_queue_1.enqueueProjectFeishuTurn)({
                    project,
                    projectSessionId: exactProjectSessionId,
                    message,
                    files: controlledFeishuAttachments.length ? controlledFeishuAttachments : files,
                    platformContext: {
                        ...platformContext,
                        target_type: "project_agent",
                        feishu_inbound_envelope: projectFeishuEnvelope,
                        feishu_origin_receipt: projectFeishuOriginReceipt,
                    },
                    requestId,
                });
                const reply = `当前项目会话仍在执行上一项工作，这条消息已排在第 ${queued.position} 位。上一项结束后会自动处理，并把结果回复到当前飞书话题。`;
                res.writeHead(200, {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache, no-transform",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                    "X-Accel-Buffering": "no",
                });
                writeSse(res, { type: "presentation", message_mode: "queued", show_task_card: false, main_agent: "project" });
                writeSse(res, { type: "chunk", text: reply, agent: "project-main-agent" });
                writeSse(res, { type: "done", queued: true, queue_position: queued.position, turn_id: queued.turn.id });
                res.end();
            };
            if (source === "feishu") {
                projectFeishuDestination = (0, feishu_channel_1.recordFeishuInbound)({
                    payload: platformContext,
                    sessionId: exactProjectSessionId,
                    messageId: String(platformContext?.platform_message_id || platformContext?.message_id || ""),
                });
                projectFeishuOriginReceipt = platformContext?.feishu_origin_receipt
                    || (0, feishu_conversation_v2_1.buildFeishuOriginReceiptV2)({ envelope: projectFeishuEnvelope, sessionId: exactProjectSessionId });
                (0, feishu_channel_1.bindFeishuTaskContext)({
                    sessionId: exactProjectSessionId,
                    destination: projectFeishuDestination,
                    source: "project-main-agent-feishu",
                    targetType: "project_agent",
                    projectId: project,
                    originReceipt: projectFeishuOriginReceipt,
                });
                if (controlledFeishuAttachments.length) {
                    const transferFailureCount = Array.isArray(platformContext?.feishu_attachment_failures) ? platformContext.feishu_attachment_failures.length : 0;
                    const unreadable = Math.max(0, controlledFeishuAttachments.length - readableAttachmentCount) + transferFailureCount;
                    const reportedAttachmentCount = controlledFeishuAttachments.length + transferFailureCount;
                    const unreadableNames = [
                        ...attachmentSources.filter((item) => item?.readable !== true).map((item) => String(item?.name || "附件")),
                        ...(Array.isArray(platformContext?.feishu_attachment_failures) ? platformContext.feishu_attachment_failures.map((item) => String(item?.name || "附件")) : []),
                    ].filter(Boolean).slice(0, 5);
                    void (0, feishu_channel_1.notifyFeishuTaskStage)({
                        stage: "project_agent_attachment_ingestion",
                        title: `${(0, project_runtime_1.projectDisplayName)(project)} · 附件读取`,
                        markdown: unreadable
                            ? `已收到 ${reportedAttachmentCount} 个附件，已读取 ${readableAttachmentCount} 个；${unreadable} 个无法解析${unreadableNames.length ? `（${unreadableNames.join("、")}）` : ""}，将继续处理可读内容。`
                            : `已收到并读取 ${reportedAttachmentCount} 个附件，正在整理任务目标。`,
                        sessionId: exactProjectSessionId,
                        forceNewMessage: true,
                        dedupeKey: `project-feishu-attachments:${projectFeishuEnvelope?.message_id || controlledFeishuAttachments.map((item) => item.id).join(":")}`,
                    }).catch(() => { });
                }
                try {
                    const persistedUserMessageId = safeClientMessageId
                        || `feishu-user:${String(platformContext?.platform_message_id || projectFeishuEnvelope?.message_id || crypto.randomUUID()).replace(/[^A-Za-z0-9:_-]/g, "").slice(0, 150)}`;
                    (0, sessions_1.upsertProjectSessionTaskMessage)(project, exactProjectSessionId, {
                        id: persistedUserMessageId,
                        role: "user",
                        content: String(message || "").trim() || "请读取并处理我刚发送的附件。",
                        timestamp: new Date().toISOString(),
                        source: "feishu-project-user",
                        files: publicProjectFeishuAttachments,
                    });
                }
                catch (error) {
                    console.warn(`[项目飞书会话] 用户消息附件投影失败 (${project}/${exactProjectSessionId})：${error?.message || error}`);
                }
                try {
                    (0, sessions_1.applyProjectSessionProvisionalTitle)(project, exactProjectSessionId, {
                        role: "user",
                        content: finalMessage,
                        files: controlledFeishuAttachments.length ? publicProjectFeishuAttachments : files,
                    });
                }
                catch (error) {
                    console.warn(`[项目飞书会话] 临时命名失败 (${project}/${exactProjectSessionId})：${error?.message || error}`);
                }
                if ((0, project_session_agent_binding_1.isProjectSessionAgentDispatchActive)(project, exactProjectSessionId))
                    return enqueueCurrentProjectFeishuTurn();
            }
            const scheduleFeishuSessionTitle = (assistantMessage) => {
                if (source !== "feishu" || !exactProjectSessionId || !String(assistantMessage || "").trim())
                    return;
                void (0, sessions_1.scheduleProjectSessionAutoTitle)(project, exactProjectSessionId, {
                    turn: {
                        userMessage: finalMessage,
                        assistantMessage,
                        attachmentNames: (Array.isArray(files) ? files : [])
                            .map((file) => String(file?.name || file?.filename || "").trim())
                            .filter(Boolean),
                    },
                }).catch((error) => {
                    console.warn(`[项目飞书会话] 自动命名失败 (${project}/${exactProjectSessionId})：${error?.message || error}`);
                });
            };
            let parentProjectMainTask = parentRunId ? (0, project_main_agent_1.getProjectMainTask)(String(parentRunId)) : null;
            if (exactProjectSessionId && parentRunId) {
                const parentRun = chat_runs_1.projectChatRuns.get(String(parentRunId));
                if (!parentRun && !parentProjectMainTask)
                    return (0, utils_1.sendJson)(res, { error: "续跑来源不存在" }, 404);
                const parentProject = String(parentRun?.project || parentProjectMainTask?.target_project || "");
                const parentSession = String(parentRun?.project_session_id || parentProjectMainTask?.project_session_id || "");
                if (parentProject !== project || parentSession !== exactProjectSessionId) {
                    return (0, utils_1.sendJson)(res, { error: "续跑来源不属于当前项目会话" }, 409);
                }
            }
            const dispatchLease = exactProjectSessionId ? (0, project_session_agent_binding_1.acquireProjectSessionAgentDispatch)(project, exactProjectSessionId) : { acquired: true, scopeId: "" };
            const dispatchScope = dispatchLease.scopeId;
            if (!dispatchLease.acquired) {
                if (source === "feishu")
                    return enqueueCurrentProjectFeishuTurn();
                return (0, utils_1.sendJson)(res, { error: "当前项目会话仍在处理上一条消息，请等待原消息完成后再继续", code: "PROJECT_SESSION_TURN_ACTIVE" }, 409);
            }
            let released = false;
            let retainDispatchAfterResponse = false;
            const releaseDispatch = () => {
                if (retainDispatchAfterResponse || released || !dispatchScope)
                    return;
                released = true;
                (0, project_session_agent_binding_1.releaseProjectSessionAgentDispatch)(dispatchScope);
                if (source === "feishu" && exactProjectSessionId) {
                    setImmediate(() => void (0, project_feishu_turn_queue_1.drainProjectFeishuTurns)(`http://127.0.0.1:${PORT}`, project, exactProjectSessionId));
                }
            };
            const persistConversationReply = (content, mode = "conversation", extras = {}) => {
                if (!exactProjectSessionId || !String(content || "").trim())
                    return;
                try {
                    (0, sessions_1.upsertProjectSessionTaskMessage)(project, exactProjectSessionId, {
                        id: safeAssistantMessageId,
                        role: "assistant",
                        content: String(content || ""),
                        requestText: message,
                        timestamp: new Date().toISOString(),
                        messageMode: mode,
                        type: "project_main_reply",
                        task_id: "",
                        run_id: "",
                        interruption: null,
                        ...extras,
                        source: source === "feishu" ? "feishu-project-main-agent-reply" : "web-project-main-agent-reply",
                    });
                }
                catch (error) {
                    console.warn(`[项目会话] 权威回复持久化失败 (${project}/${exactProjectSessionId})：${error?.message || error}`);
                }
            };
            let projectReplyStreamStarted = false;
            let projectReplyDeltaEmitted = false;
            let projectReplySequence = 0;
            const ensureProjectReplyStream = () => {
                if (projectReplyStreamStarted || res.destroyed || res.writableEnded)
                    return;
                projectReplyStreamStarted = true;
                res.writeHead(200, {
                    "Content-Type": "text/event-stream",
                    "Cache-Control": "no-cache, no-transform",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                    "X-Accel-Buffering": "no",
                });
                if (typeof res.flushHeaders === "function")
                    res.flushHeaders();
                writeSse(res, { type: "response_started", agent: "project-main-agent" });
            };
            const emitProjectReplyDelta = (delta) => {
                if (!delta || res.destroyed || res.writableEnded)
                    return;
                ensureProjectReplyStream();
                projectReplyDeltaEmitted = true;
                projectReplySequence += 1;
                writeSse(res, { type: "response_delta", text: delta, agent: "project-main-agent", sequence: projectReplySequence });
                res.flush?.();
            };
            let projectFirstTurn;
            const projectMainMetricStartedAt = Date.now();
            const recoverableProjectCandidates = (0, conversation_message_routing_1.findConversationTaskCandidates)({
                scope: "project",
                scopeId: project,
                exactSessionId: exactProjectSessionId,
            });
            const explicitRouteChoice = ["continue_original", "start_new_task", "answer_only"].includes(String(resolvedRoute || ""))
                ? String(resolvedRoute)
                : "";
            const explicitCandidate = explicitRouteChoice === "continue_original"
                ? recoverableProjectCandidates.find((item) => String(item.id || "") === String(resolvedCandidateTaskId || ""))
                : null;
            try {
                projectFirstTurn = await (0, project_main_agent_1.runProjectMainAgentFirstTurn)({
                    project,
                    projectSessionId: exactProjectSessionId,
                    userMessage: finalMessage,
                    turnId: String(sourceIngestion?.client_message_id || safeClientMessageId || ""),
                    anchorMessageId: String(safeAssistantMessageId || ""),
                    sourceCount: Number(sourceIngestion?.source_count || sourceIngestion?.sources?.length || files?.length || 0),
                    originalRequestChecksum: crypto.createHash("sha256").update(String(message || "")).digest("hex"),
                    clarificationRound: resolvedProjectClarification ? Math.min(2, Number(resolvedProjectClarification.projection.round || 1) + 1) : 1,
                    continuationCandidate: (0, conversation_message_routing_1.buildRecoverableTaskSummary)(explicitCandidate || (recoverableProjectCandidates.length === 1 ? recoverableProjectCandidates[0] : null)),
                    forcedConversationRoute: explicitRouteChoice,
                    onDelta: source === "feishu" ? undefined : emitProjectReplyDelta,
                    onModelActivity: (activity) => {
                        if (!projectReplyStreamStarted || res.destroyed || res.writableEnded)
                            return;
                        writeSse(res, { type: "model_activity", activity });
                    },
                });
            }
            catch (error) {
                // A route choice only makes sense when there is an actual old task to
                // choose. Without a recoverable candidate, surface the model/provider
                // failure and let the user retry instead of showing a misleading
                // "continue or start new" card.
                if (!explicitRouteChoice && source === "web" && exactProjectSessionId && recoverableProjectCandidates.length > 0) {
                    try {
                        let routeTurn = conversationTurnId
                            ? conversation_turn_control_1.conversationTurnControl.listInternal({ scope: "project", conversation_id: `${project}:${exactProjectSessionId}`, limit: 500 }).turns.find(item => item.id === conversationTurnId)
                            : null;
                        if (!routeTurn) {
                            const created = conversation_turn_control_1.conversationTurnControl.enqueue({
                                scope: "project",
                                conversation_id: `${project}:${exactProjectSessionId}`,
                                mode: "queue",
                                message: String(message || ""),
                                request_id: `route:${safeClientMessageId || crypto.randomUUID()}`,
                                owner_id: req.ccmAuth?.kind === "browser" ? req.ccmAuth.userId : "",
                                metadata: { project, session_id: exactProjectSessionId, original_message_id: safeClientMessageId },
                            });
                            routeTurn = conversation_turn_control_1.conversationTurnControl.claim({ scope: "project", conversation_id: `${project}:${exactProjectSessionId}`, id: created.turn.id, revision: created.turn.revision });
                        }
                        if (routeTurn?.status === "sending") {
                            const routed = conversation_turn_control_1.conversationTurnControl.requireRoute({
                                id: routeTurn.id,
                                revision: routeTurn.revision,
                                routing: {
                                    candidateTaskId: String(recoverableProjectCandidates[0]?.id || ""),
                                    candidateTaskIds: recoverableProjectCandidates.map((item) => String(item?.id || "")).filter(Boolean),
                                    candidateSummaries: recoverableProjectCandidates.slice(0, 6).map(conversation_message_routing_1.buildRecoverableTaskSummary).filter(Boolean),
                                    exactSessionId: exactProjectSessionId,
                                    scope: "project",
                                    confidence: 0,
                                    reason: "主 Agent 暂时无法可靠判断这条消息是否续接原任务，请选择处理方式",
                                },
                            });
                            ensureProjectReplyStream();
                            writeSse(res, { type: "route_required", turn: { id: routed.id, revision: routed.revision, status: routed.status, routing: routed.routing }, message_id: safeAssistantMessageId });
                            writeSse(res, { type: "done", route_required: true, message_id: safeAssistantMessageId, message_mode: "conversation", final_text: "" });
                            releaseDispatch();
                            if (!res.writableEnded && !res.destroyed)
                                res.end();
                            return;
                        }
                    }
                    catch { }
                }
                const failedAt = new Date().toISOString();
                const failedDurationMs = Math.max(0, Date.now() - projectMainMetricStartedAt);
                const rawFailure = String(error?.message || error || "");
                const providerUnavailable = /(?:HTTP\s*50[0234]|service temporarily unavailable|timeout|timed out|ECONNRESET|ECONNREFUSED|模型服务.*不可用|provider.*unavailable|模型返回空响应|empty (?:model )?response)/i.test(rawFailure);
                const safeFailureText = providerUnavailable
                    ? "模型服务暂时不可用，自动重试后仍未恢复；本轮没有启动项目 Agent，也没有修改代码。请稍后直接重试。"
                    : "项目主 Agent 暂时无法形成可靠的后续方案；本轮没有启动项目 Agent，也没有修改代码。请重试或检查模型配置。";
                (0, user_visible_agent_events_1.appendUserVisibleAgentEvent)({
                    eventId: `project-turn:${String(sourceIngestion?.client_message_id || safeClientMessageId || Date.now())}:result:failed`,
                    scope: "project",
                    scopeId: project,
                    exactSessionId: exactProjectSessionId,
                    eventType: "result",
                    error: safeFailureText,
                    display: {
                        title: "本轮未完成",
                        summary: "项目主 Agent 未能形成可靠的后续方案",
                        status: "failed",
                        durationMs: failedDurationMs,
                    },
                    result: (0, user_visible_agent_events_1.buildUserVisibleAgentResult)({
                        status: "failed",
                        text: safeFailureText,
                        durationMs: failedDurationMs,
                        stopReason: String(error?.code || "project_main_first_turn_failed"),
                        unfinished: ["本轮未启动项目 Agent"],
                    }),
                    detail: {
                        timing: { totalMs: failedDurationMs },
                        retryable: true,
                        safeRetry: true,
                        sideEffectState: "read_only",
                        failedAt,
                    },
                });
                (0, db_1.recordMetric)("project-main-agent", {
                    success: false,
                    durationMs: failedDurationMs,
                    fileChangeCount: 0,
                    scopeType: "project", projectId: project, role: "main_agent",
                    source: "project-main-turn", runtime: "main-agent-model",
                    taskId: String(parentRunId || ""),
                    executionId: String(sourceIngestion?.client_message_id || safeClientMessageId || ""),
                    usageAnchorId: `project-main:${exactProjectSessionId}:${String(sourceIngestion?.client_message_id || safeClientMessageId || Date.now())}`,
                    usage: error?.usage || { source: "unreported", missingReason: "failed_before_provider" },
                    error: error?.message || String(error),
                });
                releaseDispatch();
                if (projectReplyStreamStarted && !res.destroyed && !res.writableEnded) {
                    writeSse(res, { type: "error", text: safeFailureText, interrupted: projectReplyDeltaEmitted, completed_at: failedAt });
                    res.end();
                    return;
                }
                return (0, utils_1.sendJson)(res, {
                    success: false,
                    error: safeFailureText,
                    completed_at: failedAt,
                }, 503);
            }
            (0, db_1.recordMetric)("project-main-agent", {
                success: true,
                durationMs: Number(projectFirstTurn.metric?.durationMs || Date.now() - projectMainMetricStartedAt),
                fileChangeCount: 0,
                scopeType: "project", projectId: project, role: "main_agent",
                source: "project-main-turn", runtime: "main-agent-model",
                taskId: String(parentRunId || ""),
                executionId: String(sourceIngestion?.client_message_id || safeClientMessageId || projectFirstTurn.metric?.usageAnchorId || ""),
                usageAnchorId: projectFirstTurn.metric?.usageAnchorId,
                usage: projectFirstTurn.metric?.usage || projectFirstTurn.turnReceipt?.usage || { source: "unreported", missingReason: "runtime_unreported" },
                timing: {
                    totalMs: Number(projectFirstTurn.metric?.durationMs || 0),
                    modelMs: Number(projectFirstTurn.metric?.modelMs || 0),
                    toolWallMs: Number(projectFirstTurn.metric?.toolWallMs || 0),
                    firstVisibleFeedbackMs: Number(projectFirstTurn.metric?.firstVisibleFeedbackMs || 0),
                    firstTokenMs: Number(projectFirstTurn.metric?.firstTokenMs || 0),
                    maxSilentGapMs: Number(projectFirstTurn.metric?.maxSilentGapMs || 0),
                },
                streaming: {
                    firstVisibleFeedbackMs: Number(projectFirstTurn.metric?.firstVisibleFeedbackMs || 0),
                    firstTokenMs: Number(projectFirstTurn.metric?.firstTokenMs || 0),
                    maxSilentGapMs: Number(projectFirstTurn.metric?.maxSilentGapMs || 0),
                    providerRetryCount: Number(projectFirstTurn.metric?.retryCount || 0),
                    fallbackStreamCount: Number(projectFirstTurn.metric?.fallbackStreamCount || 0),
                    initialReadFileCount: Number(projectFirstTurn.metric?.initialReadFileCount || 0),
                    initialReadTokens: Number(projectFirstTurn.metric?.initialReadTokens || 0),
                },
            });
            const chatIntent = {
                isTask: (0, workflow_decision_1.isDevelopmentTaskWorkflowDecision)(projectFirstTurn.workflowDecision),
                workflowDecision: projectFirstTurn.workflowDecision,
            };
            const routeDecision = (0, conversation_message_routing_1.decideConversationMessageRoute)({
                workflowDecision: projectFirstTurn.workflowDecision,
                candidates: recoverableProjectCandidates,
                exactSessionId: exactProjectSessionId,
                scope: "project",
            });
            const bindProjectContinuationCandidate = async (candidate) => {
                if (!candidate)
                    return null;
                const summary = (0, conversation_message_routing_1.buildRecoverableTaskSummary)(candidate);
                if (summary?.candidateKind === "recoverable") {
                    const resumed = await (0, project_main_agent_1.resumeInterruptedProjectMainTask)(String(candidate.id || ""), project, exactProjectSessionId, {
                        actor: req.ccmAuth?.kind === "browser" ? String(req.ccmAuth.userId || "local-user") : "project-main-agent-route",
                    });
                    (0, collaboration_task_service_1.updateTask)(String(candidate.id || ""), {
                        continuation_route_kind: "resume_existing_task",
                        last_continue_at: new Date().toISOString(),
                    });
                    return (0, project_main_agent_1.getProjectMainTask)(String(candidate.id || "")) || resumed;
                }
                if (summary?.candidateKind === "completed") {
                    const continuationKind = String(projectFirstTurn.workflowDecision?.continuationKind || "supplement");
                    (0, collaboration_task_service_1.updateTask)(String(candidate.id || ""), {
                        execution_attempt: Math.max(0, Number(candidate.execution_attempt || candidate.attempt || 0)) + 1,
                        continuation_route_kind: continuationKind === "revise_goal" ? "revise_existing_task" : "resume_existing_task",
                        resumed_from_completed_at: new Date().toISOString(),
                        status_detail: continuationKind === "revise_goal" ? "已按用户要求开启返工执行" : "已从正式交付任务继续未完成工作项",
                    });
                }
                else {
                    (0, collaboration_task_service_1.updateTask)(String(candidate.id || ""), {
                        continuation_route_kind: String(projectFirstTurn.workflowDecision?.continuationKind || "supplement") === "revise_goal"
                            ? "revise_existing_task"
                            : "continue_current_session",
                        last_continue_at: new Date().toISOString(),
                        status_detail: "当前会话的补充要求已并入原任务",
                    });
                }
                return (0, project_main_agent_1.getProjectMainTask)(String(candidate.id || "")) || candidate;
            };
            if (explicitRouteChoice === "continue_original") {
                if (!explicitCandidate) {
                    releaseDispatch();
                    return (0, utils_1.sendJson)(res, { success: false, error: "原任务已不可恢复，请重新选择处理方式", code: "CONVERSATION_ROUTE_CANDIDATE_STALE" }, 409);
                }
                parentRunId = String(explicitCandidate.id || "");
                try {
                    parentProjectMainTask = await bindProjectContinuationCandidate(explicitCandidate);
                }
                catch (error) {
                    releaseDispatch();
                    return (0, utils_1.sendJson)(res, {
                        success: false,
                        error: error?.message || "恢复前需要核对原任务现场",
                        code: error?.code || "TASK_RECOVERY_PREFLIGHT_FAILED",
                        recovery_preflight: error?.recovery_preflight || null,
                    }, 409);
                }
            }
            else if (explicitRouteChoice === "start_new_task" || explicitRouteChoice === "answer_only") {
                parentRunId = "";
                parentProjectMainTask = null;
            }
            else if (["resume_task", "revise_task"].includes(routeDecision.decision) && routeDecision.candidate) {
                parentRunId = String(routeDecision.candidate.id || "");
                try {
                    parentProjectMainTask = await bindProjectContinuationCandidate(routeDecision.candidate);
                }
                catch (error) {
                    releaseDispatch();
                    return (0, utils_1.sendJson)(res, {
                        success: false,
                        error: error?.message || "恢复前需要核对原任务现场",
                        code: error?.code || "TASK_RECOVERY_PREFLIGHT_FAILED",
                        recovery_preflight: error?.recovery_preflight || null,
                    }, 409);
                }
            }
            else if (routeDecision.decision === "needs_user") {
                let routeTurn = conversationTurnId
                    ? conversation_turn_control_1.conversationTurnControl.listInternal({ scope: "project", conversation_id: `${project}:${exactProjectSessionId}`, limit: 500 }).turns.find(item => item.id === conversationTurnId)
                    : null;
                if (!routeTurn) {
                    const created = conversation_turn_control_1.conversationTurnControl.enqueue({
                        scope: "project",
                        conversation_id: `${project}:${exactProjectSessionId}`,
                        mode: "queue",
                        message: String(message || ""),
                        request_id: `route:${safeClientMessageId || crypto.randomUUID()}`,
                        owner_id: req.ccmAuth?.kind === "browser" ? req.ccmAuth.userId : "",
                        metadata: { project, session_id: exactProjectSessionId, original_message_id: safeClientMessageId },
                    });
                    routeTurn = conversation_turn_control_1.conversationTurnControl.claim({ scope: "project", conversation_id: `${project}:${exactProjectSessionId}`, id: created.turn.id, revision: created.turn.revision });
                }
                if (!routeTurn || routeTurn.status !== "sending") {
                    releaseDispatch();
                    return (0, utils_1.sendJson)(res, { success: false, error: "消息处理方式已经变化，请刷新后重试", code: "QUEUE_REVISION_CONFLICT" }, 409);
                }
                const routed = conversation_turn_control_1.conversationTurnControl.requireRoute({
                    id: routeTurn.id,
                    revision: routeTurn.revision,
                    routing: {
                        candidateTaskId: String(routeDecision.candidate?.id || ""),
                        candidateTaskIds: routeDecision.candidateTaskIds,
                        candidateSummaries: routeDecision.candidateSummaries,
                        routeKind: routeDecision.routeKind,
                        activeTaskId: routeDecision.activeTaskId,
                        exactSessionId: exactProjectSessionId,
                        scope: "project",
                        confidenceBand: routeDecision.confidenceBand,
                        continuationKind: routeDecision.continuationKind,
                        confidence: routeDecision.confidence,
                        reason: routeDecision.reason,
                    },
                });
                if (source === "feishu") {
                    await (0, feishu_channel_1.notifyFeishuTaskStage)({
                        stage: "conversation_route_required",
                        title: `${(0, project_runtime_1.projectDisplayName)(project)} · 请选择处理方式`,
                        markdown: [
                            "这条消息可能与刚才的任务有关。",
                            routed.routing?.reason || "请确认如何处理这条消息。",
                            routed.routing?.candidateTaskId ? "1. 继续原任务" : "1. 继续原任务（当前不可用）",
                            "2. 作为新任务",
                            "3. 仅回答问题",
                            "请直接回复 1、2 或 3。",
                        ].join("\n"),
                        sessionId: exactProjectSessionId,
                        forceNewMessage: true,
                        dedupeKey: `project-route:${routed.id}:${routed.revision}`,
                    });
                }
                ensureProjectReplyStream();
                writeSse(res, { type: "route_required", turn: { id: routed.id, revision: routed.revision, status: routed.status, routing: routed.routing }, message_id: safeAssistantMessageId });
                writeSse(res, { type: "done", route_required: true, message_id: safeAssistantMessageId, message_mode: "conversation", final_text: "" });
                releaseDispatch();
                if (!res.writableEnded && !res.destroyed)
                    res.end();
                return;
            }
            if (parentProjectMainTask && explicitRouteChoice !== "answer_only")
                chatIntent.isTask = true;
            const visibleProjectTurn = (0, project_main_turn_complete_1.projectFirstTurnVisiblePresentation)(projectFirstTurn, {
                treatAsTask: chatIntent.isTask,
            });
            if (visibleProjectTurn.present) {
                const clarificationProjection = projectFirstTurn.prePlanClarification;
                const visibleProjectReply = source === "feishu" && clarificationProjection
                    ? (0, pre_plan_clarification_1.formatPrePlanClarificationText)(clarificationProjection)
                    : visibleProjectTurn.reply;
                const clarificationSummary = projectFirstTurn.clarificationSummary
                    || (clarificationProjection ? (0, pre_plan_clarification_1.buildConversationClarificationSummary)({
                        schema: "ccm-project-main-agent-clarification-summary-v1",
                        question: visibleProjectReply,
                        prePlanClarification: clarificationProjection,
                    }) : null);
                persistConversationReply(visibleProjectReply, visibleProjectTurn.messageMode, {
                    ...(clarificationProjection ? {
                        prePlanClarification: { ...clarificationProjection, anchorMessageId: safeAssistantMessageId },
                        pre_plan_clarification: { ...clarificationProjection, anchorMessageId: safeAssistantMessageId },
                        clarificationSummary,
                        clarification_summary: clarificationSummary,
                        clarificationContext: { schema: "ccm-project-clarification-context-v1", originalRequest: message, status: "pending" },
                        clarification_context: { schema: "ccm-project-clarification-context-v1", original_request: message, status: "pending" },
                    } : {}),
                    ...(visibleProjectTurn.presentedPlan ? { presentedPlan: visibleProjectTurn.presentedPlan } : {}),
                });
                if (!res.destroyed && !res.writableEnded) {
                    ensureProjectReplyStream();
                    writeSse(res, { type: "turn_decision", decision: projectFirstTurn.turnDecision, receipt: projectFirstTurn.turnReceipt });
                    for (const item of projectFirstTurn.toolResults || [])
                        writeSse(res, { type: "tool_activity", phase: item.ok === false ? "failed" : "completed", tool: item.name, scope: item.scope || "project", source: item.source || item.toolKind || "", loaded: item.loaded !== false, output_tokens: item.outputTokens || 0, duration_ms: item.durationMs || 0, result_checksum: item.resultChecksum || "", error: item.error || "" });
                    writeSse(res, { type: "presentation", message_mode: visibleProjectTurn.messageMode, show_task_card: false, main_agent: "project", direct_reply_fast_path: true, prePlanClarification: clarificationProjection, pre_plan_clarification: clarificationProjection, clarificationSummary, clarification_summary: clarificationSummary, ...(visibleProjectTurn.presentedPlan ? { presentedPlan: visibleProjectTurn.presentedPlan } : {}) });
                    if (!projectReplyDeltaEmitted && visibleProjectReply)
                        emitProjectReplyDelta(visibleProjectReply);
                    if (!res.destroyed && !res.writableEnded) {
                        writeSse(res, { type: "response_completed", sequence: projectReplySequence, final: true });
                        writeSse(res, { type: "done", message_id: safeAssistantMessageId, message_mode: visibleProjectTurn.messageMode, main_agent: "project", taskExperience: null, direct_reply_fast_path: true, final_text: visibleProjectReply, prePlanClarification: clarificationProjection, pre_plan_clarification: clarificationProjection, clarificationSummary, clarification_summary: clarificationSummary, ...(visibleProjectTurn.presentedPlan ? { presentedPlan: visibleProjectTurn.presentedPlan } : {}) });
                    }
                }
                scheduleFeishuSessionTitle(visibleProjectReply);
                releaseDispatch();
                if (!res.writableEnded && !res.destroyed)
                    res.end();
                return;
            }
            if (resolvedProjectClarification && projectFirstTurn.plan) {
                projectFirstTurn.plan.requiresConfirmation = true;
                const resolvedAt = new Date().toISOString();
                (0, sessions_1.upsertProjectSessionTaskMessage)(project, exactProjectSessionId, {
                    ...resolvedProjectClarification.pending,
                    prePlanClarification: { ...resolvedProjectClarification.projection, status: "resolved", revision: Number(resolvedProjectClarification.projection.revision || 1) + 1, resolvedAt },
                    pre_plan_clarification: { ...resolvedProjectClarification.projection, status: "resolved", revision: Number(resolvedProjectClarification.projection.revision || 1) + 1, resolved_at: resolvedAt },
                    clarificationContext: { ...(resolvedProjectClarification.pending.clarificationContext || {}), status: "resolved", resolvedAt },
                    clarification_context: { ...(resolvedProjectClarification.pending.clarification_context || {}), status: "resolved", resolved_at: resolvedAt },
                });
            }
            const info = (0, db_1.getConfigInfo)(config.path);
            const workDir = info[0]?.workDir;
            const configuredAgentType = info[0]?.agent || "claudecode";
            const resolvedRuntime = (0, runtime_1.resolveAvailableAgentRuntime)(configuredAgentType);
            const agentType = resolvedRuntime.selected;
            if (exactProjectSessionId)
                (0, sessions_1.syncSessions)(project);
            const projectKnowledge = { context: "", citations: [], embeddingMode: "not_loaded", fallback: false };
            const projectConfigSnapshot = (0, db_1.loadProjectConfigs)()?.[project] || {};
            const globalContextConfig = (0, group_orchestrator_config_1.loadOrchestratorConfig)();
            const projectContextPolicy = (0, main_agent_context_policy_1.resolveMainAgentContextPolicy)(globalContextConfig, projectConfigSnapshot.context_policy || projectConfigSnapshot.contextPolicy || {}).effective;
            const projectContextWindow = Number((0, group_compaction_strategy_1.resolveGroupModelContextCapacity)(globalContextConfig).effectiveContextWindow || 200_000);
            const projectSourceBudget = (0, main_agent_context_source_continuity_1.calculateContextSourceBudget)({ contextWindow: projectContextWindow, catalogPercent: projectContextPolicy.contextSourceCatalogBudgetPercent, hydrationPercent: projectContextPolicy.contextSourceHydrationBudgetPercent });
            (0, shared_files_v2_1.migrateLegacySharedFilesV2)("project", project, projectConfigSnapshot.shared_files || [], "project-config-v1");
            const projectSharedFiles = (0, shared_files_v2_1.buildSharedFilesContextV2)("project", project, {
                contextWindow: projectContextWindow,
                hydrationBudgetPercent: projectContextPolicy.contextSourceHydrationBudgetPercent,
                remainingSafeTokens: projectSourceBudget.hydrationTargetTokens,
                explicitText: finalMessage,
                title: "以下是当前项目已授权共享文件。规划、开发和验收必须引用对应文件与分片证据：",
            });
            const projectSourceIdentity = exactProjectSessionId ? { agentKind: "project", scope: "project", scopeId: project, exactSessionId: exactProjectSessionId, generation: 0 } : null;
            const projectSourceCatalog = (0, main_agent_context_source_continuity_1.buildContextSourceCatalog)({
                sources: (0, main_agent_context_source_continuity_1.listContextSourceCatalogEntries)({ sharedScope: "project", sharedScopeId: project, knowledgeContext: { role: "project-agent", project } }),
                maxTokens: projectSourceBudget.catalogTargetTokens,
                explicitText: finalMessage,
                recentReceipts: projectSourceIdentity ? (0, main_agent_context_source_continuity_1.readContextSourceContinuity)(projectSourceIdentity).receipts : [],
            });
            if (projectSourceIdentity) {
                (0, main_agent_context_source_continuity_1.recordContextSourceCatalog)(projectSourceIdentity, projectSourceCatalog, projectSourceBudget);
                (0, main_agent_context_source_continuity_1.recordSharedFileProjection)(projectSourceIdentity, projectSharedFiles, { ...projectSourceBudget, catalogUsedTokens: projectSourceCatalog.usedTokens, sharedFileTokens: projectSharedFiles.total_tokens, hydrationUsedTokens: projectSharedFiles.total_tokens });
            }
            if (exactProjectSessionId) {
                if (projectSharedFiles.files.length) {
                    const sharedToolCallId = `shared_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
                    (0, project_session_compaction_1.appendProjectSessionExecutionEvent)(project, exactProjectSessionId, {
                        type: "tool_use",
                        toolName: "read_shared_files",
                        toolCallId: sharedToolCallId,
                        runId: `project-main:${exactProjectSessionId}`,
                        arguments: { scope: "project", manifest_checksum: projectSharedFiles.checksum },
                    });
                    (0, project_session_compaction_1.appendProjectSessionExecutionEvent)(project, exactProjectSessionId, {
                        type: "tool_result",
                        toolName: "read_shared_files",
                        toolCallId: sharedToolCallId,
                        runId: `project-main:${exactProjectSessionId}`,
                        status: "ok",
                        observation: {
                            manifest_checksum: projectSharedFiles.checksum,
                            files: projectSharedFiles.files.map((file) => ({ id: file.id, name: file.name, checksum: file.checksum, chunks: file.chunks?.length || 0 })),
                            selected_chunks: projectSharedFiles.selected_chunks,
                            complete: projectSharedFiles.complete,
                        },
                    });
                }
            }
            const selectedProjectRoleSkills = chatIntent.isTask
                ? (0, role_skills_1.selectRoleSkills)("project-child-agent", finalMessage, {
                    forceWork: true,
                    source: "project-chat",
                    phase: "execution",
                    selectedSkillNames: chatIntent.workflowDecision?.selectedSkills || [],
                    modelDecision: chatIntent.workflowDecision || null,
                })
                : [];
            const buildCurrentProjectToolContext = (internalMcpServers = {}) => buildProjectToolContext(project, workDir, agentType, {
                internalMcpServers,
                selectedRoleSkills: selectedProjectRoleSkills,
                roleSkillPrompt: (0, role_skills_1.buildSelectedSkillUsageDirective)(selectedProjectRoleSkills),
            });
            let toolContext = buildCurrentProjectToolContext();
            let projectRestoredSourceContext = "";
            if (toolContext.dispatchGate?.dispatchReady === false) {
                releaseDispatch();
                return sendRuntimeToolDispatchBlocked(res, toolContext);
            }
            if (resolvedRuntime.switched) {
                toolContext.workEvent.text = `${project} 执行器自动切换：配置为 ${resolvedRuntime.preferred}，当前可用执行器为 ${agentType}；候选链 ${resolvedRuntime.chain.join(" → ")}`;
                toolContext.workEvent.runtimeFallback = resolvedRuntime;
            }
            const projectMemoryPacket = chatIntent.isTask
                ? (0, memory_1.buildProjectMemoryPacket)(project, { workDir, query: finalMessage })
                : "";
            let projectCompaction = null;
            if (exactProjectSessionId) {
                try {
                    projectCompaction = await (0, project_session_compaction_1.compactProjectSessionWithModel)(project, exactProjectSessionId, {
                        reason: "auto_model",
                        activeDispatchScopeId: dispatchScope,
                        currentRequest: finalMessage,
                        fixedContext: { project, workDir, agentType, runtimePrompt: toolContext.prompt, contextSourceCatalog: projectSourceCatalog.context, projectMemoryPacket, projectKnowledge: projectKnowledge.context, projectSharedFiles: projectSharedFiles.context },
                        tools: { allowedTools: toolContext.allowedTools, runtimeToolSnapshot: toolContext.runtimeToolSnapshot },
                        provider: agentType,
                    });
                    if (projectCompaction?.reason === "circuit_breaker") {
                        releaseDispatch();
                        return (0, utils_1.sendJson)(res, { error: "项目会话记忆压缩已熔断，本轮未启动第三方 Agent", consecutive_failures: projectCompaction.consecutive_failures || 3 }, 503);
                    }
                }
                catch (error) {
                    releaseDispatch();
                    return (0, utils_1.sendJson)(res, { error: `项目会话自动压缩失败，本轮未启动第三方 Agent：${error?.message || error}` }, 503);
                }
            }
            let projectMemoryMcp = null;
            if (exactProjectSessionId && chatIntent.isTask) {
                try {
                    const prepareProjectMemoryMcp = () => {
                        const projection = (0, project_session_compaction_1.buildProjectSessionModelContextProjection)(project, exactProjectSessionId, { currentRequest: finalMessage, persistMicroCompactReceipt: true });
                        if (!projection)
                            throw new Error("项目会话连续性不存在");
                        const binding = (0, project_session_agent_binding_1.getProjectSessionAgentBinding)(project, exactProjectSessionId);
                        const nativeGeneration = Number(binding.generation || binding.generation_count + 1 || 1);
                        const snapshot = (0, third_party_memory_snapshot_1.createThirdPartyMemorySnapshot)({
                            bindingKind: "project_session",
                            role: "project-agent",
                            project,
                            projectSessionId: exactProjectSessionId,
                            taskAgentSessionId: binding.task_agent_session_id || "",
                            provider: agentType,
                            nativeGeneration,
                            boundaryGeneration: projection.boundaryGeneration,
                            mode: projection.mode,
                            summary: projection.summary,
                            summarySource: projection.summarySource,
                            messages: projection.visibleMessages,
                            archiveMessages: projection.archiveMessages,
                            memoryItems: [{ kind: "project_memory", source: project, required: true, content: projectMemoryPacket }],
                            modelContextWindow: projectCompaction?.model_context_capacity?.contextWindow || projectCompaction?.resolved_model_capacity?.contextWindow || 0,
                            autoCompactThreshold: projectCompaction?.auto_compact_threshold || 0,
                            requestText: finalMessage,
                        });
                        const challenge = (0, memory_context_consumption_receipt_1.createMemoryContextConsumptionChallenge)({
                            project,
                            executionId: `${project}:${exactProjectSessionId}:generation:${nativeGeneration}`,
                            taskAgentSessionId: binding.task_agent_session_id || "",
                            attempt: nativeGeneration,
                        });
                        const internalMcpServers = (0, agent_internal_mcp_1.buildProjectSessionBoundMemoryMcpServer)({
                            project,
                            projectSessionId: exactProjectSessionId,
                            agentType,
                            workDir,
                            taskAgentSessionId: binding.task_agent_session_id || "",
                            nativeSessionId: binding.native_session_id || "",
                            memoryReceiptChallenge: challenge,
                            memoryReceiptFile: (0, memory_context_consumption_receipt_1.memoryContextConsumptionReceiptFile)(challenge.challenge_id),
                            memorySnapshotId: snapshot.id,
                            memorySnapshotChecksum: snapshot.checksum,
                            boundaryGeneration: snapshot.boundaryGeneration,
                            nativeGeneration: snapshot.nativeGeneration,
                            requestText: finalMessage,
                            memoryReadBudgetTokens: snapshot.autoCompactThreshold,
                        });
                        return { projection, binding, snapshot, challenge, internalMcpServers };
                    };
                    projectMemoryMcp = prepareProjectMemoryMcp();
                    toolContext = buildCurrentProjectToolContext(projectMemoryMcp.internalMcpServers);
                    const knowledgeMcp = (toolContext.audit.internal_mcp || []).find((item) => item.name === "ccm__knowledge_context");
                    projectMemoryMcp.ready = knowledgeMcp?.state === "synced";
                    if (projectMemoryMcp.ready) {
                        const threshold = Number(projectCompaction?.auto_compact_threshold || projectMemoryMcp.snapshot.autoCompactThreshold || 0);
                        let providerUsageBiasTokens = Math.max(0, Number(projectCompaction?.before_tokens || projectCompaction?.token_measurement?.activeTokens || 0)
                            - Number(projectCompaction?.model_visible_payload?.totalTokens || 0));
                        const hydratedPayloadTokens = Number(projectMemoryMcp.snapshot.requiredHydrationTokens || 0)
                            + (0, context_budget_1.estimateTextTokens)(toolContext.prompt)
                            + (0, context_budget_1.estimateTextTokens)(projectKnowledge.context)
                            + (0, context_budget_1.estimateTextTokens)(projectSharedFiles.context)
                            + (0, context_budget_1.estimateTextTokens)(finalMessage)
                            + providerUsageBiasTokens;
                        if (threshold > 0 && hydratedPayloadTokens >= threshold && projectCompaction?.compacted !== true) {
                            projectCompaction = await (0, project_session_compaction_1.compactProjectSessionWithModel)(project, exactProjectSessionId, {
                                force: true,
                                reason: "third_party_memory_mcp_required_hydration",
                                activeDispatchScopeId: dispatchScope,
                                currentRequest: finalMessage,
                                fixedContext: { project, workDir, agentType, runtimePrompt: toolContext.prompt, contextSourceCatalog: projectSourceCatalog.context, projectMemoryPacket, projectKnowledge: projectKnowledge.context, projectSharedFiles: projectSharedFiles.context },
                                tools: { allowedTools: toolContext.allowedTools, runtimeToolSnapshot: toolContext.runtimeToolSnapshot },
                                provider: agentType,
                            });
                            projectMemoryMcp = prepareProjectMemoryMcp();
                            toolContext = buildCurrentProjectToolContext(projectMemoryMcp.internalMcpServers);
                            projectMemoryMcp.ready = (toolContext.audit.internal_mcp || []).some((item) => item.name === "ccm__knowledge_context" && item.state === "synced");
                            providerUsageBiasTokens = Math.max(0, Number(projectCompaction?.before_tokens || projectCompaction?.token_measurement?.activeTokens || 0)
                                - Number(projectCompaction?.model_visible_payload?.totalTokens || 0));
                            const postTokens = Number(projectMemoryMcp.snapshot.requiredHydrationTokens || 0) + (0, context_budget_1.estimateTextTokens)(toolContext.prompt) + (0, context_budget_1.estimateTextTokens)(projectKnowledge.context) + (0, context_budget_1.estimateTextTokens)(projectSharedFiles.context) + (0, context_budget_1.estimateTextTokens)(finalMessage) + providerUsageBiasTokens;
                            if (threshold > 0 && postTokens >= threshold)
                                throw new Error(`项目记忆 MCP 必读上下文压缩后仍超过阈值：${postTokens}/${threshold}`);
                        }
                        const exactThreshold = Number(projectCompaction?.auto_compact_threshold || projectMemoryMcp.snapshot.autoCompactThreshold || 0);
                        const fixedTokens = (0, context_budget_1.estimateTextTokens)(toolContext.prompt)
                            + (0, context_budget_1.estimateTextTokens)(projectKnowledge.context)
                            + (0, context_budget_1.estimateTextTokens)(projectSharedFiles.context)
                            + (0, context_budget_1.estimateTextTokens)(finalMessage)
                            + providerUsageBiasTokens;
                        const memoryReadBudgetTokens = exactThreshold > 0 ? Math.max(0, exactThreshold - fixedTokens) : 0;
                        if (exactThreshold > 0 && Number(projectMemoryMcp.snapshot.requiredHydrationTokens || 0) >= memoryReadBudgetTokens) {
                            throw new Error(`项目记忆 MCP 累计读取预算不足：required=${projectMemoryMcp.snapshot.requiredHydrationTokens || 0}; budget=${memoryReadBudgetTokens}`);
                        }
                        projectMemoryMcp.internalMcpServers = (0, agent_internal_mcp_1.buildProjectSessionBoundMemoryMcpServer)({
                            project,
                            projectSessionId: exactProjectSessionId,
                            agentType,
                            workDir,
                            taskAgentSessionId: projectMemoryMcp.binding.task_agent_session_id || "",
                            nativeSessionId: projectMemoryMcp.binding.native_session_id || "",
                            memoryReceiptChallenge: projectMemoryMcp.challenge,
                            memoryReceiptFile: (0, memory_context_consumption_receipt_1.memoryContextConsumptionReceiptFile)(projectMemoryMcp.challenge.challenge_id),
                            memorySnapshotId: projectMemoryMcp.snapshot.id,
                            memorySnapshotChecksum: projectMemoryMcp.snapshot.checksum,
                            boundaryGeneration: projectMemoryMcp.snapshot.boundaryGeneration,
                            nativeGeneration: projectMemoryMcp.snapshot.nativeGeneration,
                            requestText: finalMessage,
                            memoryReadBudgetTokens,
                        });
                        projectMemoryMcp.memoryReadBudgetTokens = memoryReadBudgetTokens;
                        projectMemoryMcp.providerUsageBiasTokens = providerUsageBiasTokens;
                        toolContext = buildCurrentProjectToolContext(projectMemoryMcp.internalMcpServers);
                        projectMemoryMcp.ready = (toolContext.audit.internal_mcp || []).some((item) => item.name === "ccm__knowledge_context" && item.state === "synced");
                    }
                }
                catch (error) {
                    releaseDispatch();
                    return (0, utils_1.sendJson)(res, { error: `项目会话记忆 MCP 准备失败，本轮未启动第三方 Agent：${error?.message || error}` }, 503);
                }
            }
            if (toolContext.dispatchGate?.dispatchReady === false) {
                releaseDispatch();
                return sendRuntimeToolDispatchBlocked(res, toolContext);
            }
            const resolvedProjectSourceIdentity = projectSourceIdentity ? (0, main_agent_post_compact_continuity_1.resolveMainAgentContinuityIdentity)(projectSourceIdentity) : null;
            if (resolvedProjectSourceIdentity && resolvedProjectSourceIdentity.generation > 0) {
                projectRestoredSourceContext = (0, main_agent_context_source_continuity_1.restoreContextSources)({
                    identity: resolvedProjectSourceIdentity,
                    knowledgeContext: { role: "project-agent", project },
                    explicitText: finalMessage,
                    maxPerItemTokens: projectContextPolicy.postCompactSourcePerItemMaxTokens,
                    maxTotalTokens: projectContextPolicy.postCompactSourceTotalMaxTokens,
                    hydrationTargetTokens: projectSourceBudget.hydrationTargetTokens,
                    remainingSafeTokens: projectSourceBudget.remainingSafeTokens,
                }).context;
            }
            const fullMessage = [toolContext.prompt, projectSourceCatalog.context, projectRestoredSourceContext, projectKnowledge.context, projectSharedFiles.context, finalMessage].filter(Boolean).join("\n\n");
            const memoryMcpEnabled = projectMemoryMcp?.ready === true;
            const projectSessionContext = memoryMcpEnabled
                ? (0, third_party_memory_snapshot_1.buildThirdPartyMemoryBootstrap)(projectMemoryMcp.snapshot, projectMemoryMcp.challenge)
                : exactProjectSessionId ? (0, project_session_compaction_1.buildProjectSessionPostCompactContext)(project, exactProjectSessionId, agentType, { currentRequest: finalMessage }) : "";
            if ((0, api_access_control_1.requestIsReadOnly)(req) && chatIntent.isTask) {
                releaseDispatch();
                return (0, utils_1.sendJson)(res, { success: false, error: "当前账户仅允许项目只读问答；这条需求需要项目管理权限", code: "PROJECT_EXECUTION_FORBIDDEN" }, 403);
            }
            res.once?.("finish", releaseDispatch);
            try {
                let responseDetached = !!(res.writableEnded || res.destroyed);
                // The project main-agent may already have opened the same SSE response
                // while streaming its preamble.  A later dispatch decision must reuse
                // that stream instead of attempting to send a second HTTP status line.
                if (!responseDetached && !res.headersSent) {
                    res.writeHead(200, {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache, no-transform",
                        "Connection": "keep-alive",
                        "Access-Control-Allow-Origin": "*",
                        "X-Accel-Buffering": "no",
                    });
                    if (typeof res.flushHeaders === "function")
                        res.flushHeaders();
                }
                const send = (data) => {
                    if (!responseDetached && !res.writableEnded && !res.destroyed)
                        writeSse(res, data);
                };
                let taskHeartbeatFactory = null;
                const heartbeat = setInterval(() => {
                    if (!res.writableEnded && !res.destroyed) {
                        try {
                            res.write(": keep-alive\n\n");
                            const taskHeartbeat = taskHeartbeatFactory?.();
                            if (taskHeartbeat)
                                send(taskHeartbeat);
                        }
                        catch (error) {
                            console.warn(`[project-main] task heartbeat skipped: ${error?.message || error}`);
                        }
                    }
                }, 15000);
                heartbeat.unref?.();
                send({ type: "turn_decision", decision: projectFirstTurn.turnDecision, receipt: projectFirstTurn.turnReceipt });
                for (const item of projectFirstTurn.toolResults || []) {
                    send({ type: "tool_activity", phase: item.ok === false ? "failed" : "completed", tool: item.name, scope: item.scope || "project", source: item.source || item.toolKind || "", loaded: item.loaded !== false, output_tokens: item.outputTokens || 0, duration_ms: item.durationMs || 0, result_checksum: item.resultChecksum || "", error: item.error || "" });
                }
                const projectRun = (0, chat_runs_1.createProjectChatRun)(project, effectiveMessage, workDir, parentRunId, exactProjectSessionId);
                projectRun.message_mode = "task";
                projectRun.workflow_decision = chatIntent.workflowDecision;
                const bound = bindProjectRunAgentSession(projectRun, project, agentType);
                let activeTaskAgentSession = bound.session;
                let activeAgentSessionOptions = bound.options;
                const existingTask = parentProjectMainTask;
                const plan = existingTask?.workflow_meta?.project_main_plan || projectFirstTurn.plan || await (0, project_main_agent_1.planProjectMainTask)({
                    project,
                    projectSessionId: exactProjectSessionId,
                    userMessage: finalMessage,
                    workflowDecision: chatIntent.workflowDecision,
                    context: [projectKnowledge.context, projectSharedFiles.context].filter(Boolean).join("\n\n"),
                });
                const task = existingTask || (0, project_main_agent_1.createProjectMainTask)({
                    project,
                    projectSessionId: exactProjectSessionId,
                    projectMainRunId: projectRun.id,
                    userMessage: effectiveMessage,
                    plan,
                    workflowDecision: chatIntent.workflowDecision,
                    sourceAttachments: files,
                });
                const workItemAgentSessions = new Map();
                const workItemMemoryReceiptStarted = new Set();
                let worktreeMergeQueue = Promise.resolve();
                projectRun.project_main_task_id = task.id;
                projectRun.status = plan.requiresConfirmation && !existingTask ? "paused" : "queued";
                projectRun.updated_at = new Date().toISOString();
                (0, chat_runs_1.saveProjectChatRuns)();
                const feishuTask = source === "feishu";
                if (feishuTask) {
                    (0, feishu_channel_1.bindFeishuTaskContext)({
                        sessionId: exactProjectSessionId,
                        destination: projectFeishuDestination,
                        runIds: [projectRun.id],
                        taskIds: [task.id],
                        source: "project-main-agent-feishu",
                        targetType: "project_agent",
                        projectId: project,
                        originReceipt: projectFeishuOriginReceipt,
                    });
                }
                const taskSnapshot = () => (0, project_main_agent_1.projectMainTaskPublic)((0, project_main_agent_1.getProjectMainTask)(task.id) || task);
                const taskExperience = () => ({
                    ...taskSnapshot(),
                    requires_card: true,
                    rollback_available: !!projectRun.checkpoint_id,
                    session_ids: [activeTaskAgentSession.id],
                    parent_run_id: projectRun.parent_run_id || "",
                });
                const taskMessageId = `project-main-task:${task.id}`;
                const persistTaskMessage = (content = "", experience = taskExperience()) => (0, sessions_1.upsertProjectSessionTaskMessage)(project, exactProjectSessionId, {
                    id: taskMessageId,
                    role: "assistant",
                    content: String(content || experience.final_summary || experience.status_detail || plan.summary || "项目主 Agent 正在推进任务"),
                    timestamp: new Date().toISOString(),
                    messageMode: "task",
                    type: "project_main_task",
                    task_id: task.id,
                    run_id: projectRun.id,
                    taskExperience: experience,
                    source: source === "feishu" ? "feishu-project-main-agent" : "web-project-main-agent",
                });
                taskHeartbeatFactory = () => {
                    const experience = taskExperience();
                    return {
                        type: "task_heartbeat",
                        message_id: taskMessageId,
                        task_id: task.id,
                        at: new Date().toISOString(),
                        text: experience.runtime_status?.status_detail || experience.phase_label || "项目主 Agent 正在推进任务",
                        taskExperience: experience,
                    };
                };
                send({ type: "presentation", message_mode: "task", show_task_card: true, workflow_decision: chatIntent.workflowDecision, main_agent: "project" });
                send({ type: "planning", status: "completed", plan, task_id: task.id });
                send({ type: "task_runtime", message_id: taskMessageId, run: (0, chat_runs_1.publicProjectChatRun)(projectRun), taskExperience: taskExperience() });
                persistTaskMessage(plan.summary);
                if (plan.requiresConfirmation && !existingTask) {
                    const planText = `我已经整理好执行计划，需要你确认后才会安排开发 Agent。\n\n${plan.summary}\n\n${plan.workItems.map((item, index) => `${index + 1}. ${item.title}：${item.objective}`).join("\n")}`;
                    scheduleFeishuSessionTitle(planText);
                    send({ type: "chunk", text: planText, agent: "project-main-agent" });
                    send({ type: "done", message_id: taskMessageId, message_mode: "task", run: (0, chat_runs_1.publicProjectChatRun)(projectRun), workEvents: [], taskExperience: taskExperience() });
                    clearInterval(heartbeat);
                    releaseDispatch();
                    res.end();
                    return;
                }
                if (feishuTask) {
                    retainDispatchAfterResponse = true;
                    const acceptedText = `项目主 Agent 已完成任务规划并创建正式任务。\n\n任务：${plan.title}\n任务编号：${task.id}\n工作项：${plan.workItems.length} 个\n\n开发 Agent 与 TestAgent 将在后台按顺序执行，完成或阻塞后会回到当前飞书会话。`;
                    scheduleFeishuSessionTitle(acceptedText);
                    send({ type: "chunk", text: acceptedText, agent: "project-main-agent" });
                    send({ type: "done", message_id: taskMessageId, message_mode: "task", accepted: true, detached: true, task_id: task.id, run: (0, chat_runs_1.publicProjectChatRun)(projectRun), taskExperience: taskExperience() });
                    clearInterval(heartbeat);
                    responseDetached = true;
                    res.end();
                }
                let firstMemoryReceiptRequired = memoryMcpEnabled;
                const workerResults = [];
                let finalSummaryStreamed = false;
                const execution = await (0, unified_task_scheduler_1.scheduleUnifiedTaskOperation)({
                    taskId: task.id,
                    queueKey: `conversation:project:${project}:${exactProjectSessionId}`,
                    workspaceLane: (0, unified_task_scheduler_1.canonicalWorkspaceMutationLane)(workDir, `workspace:project:${project}`),
                    priority: task.priority || "normal",
                    onState: schedulerState => {
                        const queued = schedulerState.state === "queued";
                        const running = schedulerState.state === "running";
                        if (queued || running) {
                            projectRun.status = queued ? "queued" : "running";
                            projectRun.updated_at = new Date().toISOString();
                            (0, chat_runs_1.saveProjectChatRuns)();
                        }
                        (0, collaboration_task_service_1.updateTask)(task.id, {
                            scheduler_state: schedulerState,
                            queue_target_key: schedulerState.queue_key,
                            queue_position: schedulerState.position,
                            queue_state: schedulerState.state,
                            ...(queued ? { status: "pending", status_detail: `项目任务已进入会话串行队列，当前位置 ${schedulerState.position}` } : {}),
                            ...(running ? { status: "in_progress", status_detail: "项目主 Agent 已取得会话队列和源码工作区执行权" } : {}),
                        });
                        const latestExperience = taskExperience();
                        if (queued || running) {
                            const text = queued
                                ? `项目任务正在排队，当前位置 ${schedulerState.position}`
                                : "项目主 Agent 已开始执行当前任务";
                            persistTaskMessage(text, latestExperience);
                            send({ type: "status", text, agent: "project-main-agent", scheduler_state: schedulerState });
                            send({ type: "task_runtime", message_id: taskMessageId, run: (0, chat_runs_1.publicProjectChatRun)(projectRun), taskExperience: latestExperience });
                        }
                    },
                    operation: () => (0, project_main_agent_1.executeProjectMainTask)({
                        task,
                        plan,
                        confirmed: !!existingTask || !plan.requiresConfirmation,
                        verificationCommands: Array.isArray((0, db_1.loadProjectConfigs)()?.[project]?.verification_commands)
                            ? (0, db_1.loadProjectConfigs)()[project].verification_commands
                            : [],
                        onEvent: (event) => {
                            const label = {
                                planning: "项目主 Agent 已完成任务规划",
                                work_item: event.status === "running" ? `开发 Agent 正在执行：${event.work_item?.title || "工作项"}` : `开发 Agent 已提交：${event.work_item?.title || "工作项"}`,
                                testing: event.status === "running" ? `TestAgent 正在执行第 ${event.round || 1} 轮验收` : event.status === "passed" ? "TestAgent 验收通过" : "TestAgent 发现验收缺口",
                                reworking: event.status === "running" ? "项目主 Agent 已安排原开发 Agent 返工" : "返工结果已提交，准备重新验收",
                                accepting: event.status === "running" ? "项目主 Agent 正在完成最终验收" : "项目主 Agent 已完成最终验收",
                                blocked: event.summary || "任务存在阻塞",
                            };
                            const text = label[event.type] || event.summary || "项目主 Agent 正在推进任务";
                            const latestExperience = taskExperience();
                            persistTaskMessage(text, latestExperience);
                            send(event);
                            send({ type: "status", text, agent: event.type === "testing" ? "test-agent" : "project-main-agent" });
                            const workEvent = { id: `pma_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, time: new Date().toISOString(), kind: event.status === "failed" || event.status === "blocked" ? "error" : event.status === "completed" || event.status === "passed" ? "done" : "status", agent: event.type === "testing" ? "TestAgent" : "项目主 Agent", text, phase: event.type, data: event };
                            projectRun.workEvents = [...(projectRun.workEvents || []), workEvent].slice(-80);
                            projectRun.updated_at = new Date().toISOString();
                            (0, chat_runs_1.saveProjectChatRuns)();
                            send({ type: "work_event", event: workEvent });
                            send({ type: "task_runtime", message_id: taskMessageId, run: (0, chat_runs_1.publicProjectChatRun)(projectRun), taskExperience: latestExperience });
                        },
                        onDelta: delta => {
                            if (!delta)
                                return;
                            finalSummaryStreamed = true;
                            send({ type: "chunk", text: delta, agent: "project-main-agent" });
                        },
                        executeWorker: async (workItem, round, reworkProblems) => {
                            let doneState = null;
                            let workerSession = workItemAgentSessions.get(String(workItem.id));
                            if (!workerSession) {
                                workerSession = (0, agent_sessions_1.openTaskAgentSession)({ scopeId: `${exactProjectSessionId}:${task.id}:${workItem.id}`, taskId: task.id, groupId: "project-chat", project, agentType });
                                workItemAgentSessions.set(String(workItem.id), workerSession);
                            }
                            let workerSessionOptions = (0, agent_sessions_1.getTaskAgentSessionOptions)(workerSession);
                            const workerExecutionId = `${task.id}:${workItem.id}:attempt:${workItem.attempts}`;
                            const needsMemoryReceipt = firstMemoryReceiptRequired && !workItemMemoryReceiptStarted.has(String(workItem.id));
                            const workerMemoryChallenge = needsMemoryReceipt
                                ? (0, memory_context_consumption_receipt_1.createMemoryContextConsumptionChallenge)({
                                    project,
                                    taskId: task.id,
                                    executionId: workerExecutionId,
                                    taskAgentSessionId: workerSession.id,
                                    attempt: Math.max(1, Number(workItem.attempts || round || 1)),
                                })
                                : projectMemoryMcp?.challenge || null;
                            const workerMemoryServers = memoryMcpEnabled
                                ? (0, agent_internal_mcp_1.buildProjectSessionBoundMemoryMcpServer)({
                                    project,
                                    projectSessionId: exactProjectSessionId,
                                    agentType,
                                    workDir,
                                    taskAgentSessionId: workerSession.id,
                                    nativeSessionId: workerSessionOptions.sessionId || "",
                                    memoryReceiptChallenge: workerMemoryChallenge,
                                    memoryReceiptFile: (0, memory_context_consumption_receipt_1.memoryContextConsumptionReceiptFile)(workerMemoryChallenge?.challenge_id || ""),
                                    memorySnapshotId: projectMemoryMcp?.snapshot?.id || "",
                                    memorySnapshotChecksum: projectMemoryMcp?.snapshot?.checksum || "",
                                    boundaryGeneration: projectMemoryMcp?.snapshot?.boundaryGeneration || 0,
                                    nativeGeneration: projectMemoryMcp?.snapshot?.nativeGeneration || 0,
                                    requestText: finalMessage,
                                    memoryReadBudgetTokens: projectMemoryMcp?.memoryReadBudgetTokens || 0,
                                })
                                : [];
                            const workerToolContext = memoryMcpEnabled
                                ? buildCurrentProjectToolContext(workerMemoryServers)
                                : toolContext;
                            const workerProjectSessionContext = memoryMcpEnabled
                                ? (0, third_party_memory_snapshot_1.buildThirdPartyMemoryBootstrap)(projectMemoryMcp.snapshot, workerMemoryChallenge)
                                : projectSessionContext;
                            const isolatedWorkDir = (0, worktree_1.prepareChildAgentWorkDir)(workDir, {
                                mode: workItem.dispatchContract?.worktree?.strategy === "isolated" ? "worktree" : "shared",
                                failClosed: workItem.dispatchContract?.worktree?.strategy === "isolated",
                                taskId: task.id,
                                agentName: workItem.id,
                                sourceProject: project,
                                reuseKey: `${task.id}-${workItem.id}`,
                            });
                            const workerWorkDir = isolatedWorkDir.workDir;
                            const workerPrompt = [
                                workerToolContext.prompt,
                                projectKnowledge.context,
                                workerProjectSessionContext,
                                (0, memory_1.buildProjectExecutionBrief)(project, workItem.objective, {
                                    workDir: workerWorkDir,
                                    query: finalMessage,
                                    verificationHints: Array.isArray((0, db_1.loadProjectConfigs)()?.[project]?.verification_commands) ? (0, db_1.loadProjectConfigs)()[project].verification_commands : [],
                                    memoryDeliveryMode: memoryMcpEnabled ? "mcp" : "prompt",
                                    memorySnapshotId: projectMemoryMcp?.snapshot?.id || "",
                                }),
                                `你是当前项目唯一的开发 Agent。项目主 Agent 分配给你的工作项如下：\n标题：${workItem.title}\n目标：${workItem.objective}\n验收标准：${workItem.acceptanceCriteria.join("；") || plan.acceptanceCriteria.join("；")}\n${reworkProblems.length ? `这是第 ${round} 轮返工，必须逐项解决 TestAgent 的真实失败证据：\n${reworkProblems.join("\n")}` : ""}\n请实际完成工作、运行适用验证，并在结尾准确列出变更文件、执行过的验证和仍存在的阻塞。不得自行宣布主任务最终验收通过。`,
                                workItem.dispatchContract ? `计划派发合同绑定：${JSON.stringify({ workItemId: workItem.dispatchContract.workItemId, stepId: workItem.dispatchContract.stepId, planRevision: workItem.dispatchContract.planRevision, planChecksum: workItem.dispatchContract.planChecksum, contractChecksum: workItem.dispatchContract.contractChecksum, sourceManifestChecksum: workItem.dispatchContract.sourceManifestChecksum, files: workItem.dispatchContract.files, dependsOn: workItem.dispatchContract.dependsOn, allowedTools: workItem.dispatchContract.allowedTools, forbiddenPaths: workItem.dispatchContract.forbiddenPaths, acceptance: workItem.dispatchContract.acceptance, verification: workItem.dispatchContract.verification, worktree: workItem.dispatchContract.worktree })}` : "",
                            ].filter(Boolean).join("\n\n");
                            if (memoryMcpEnabled) {
                                const bootstrapTokens = (0, context_budget_1.estimateTextTokens)(workerPrompt);
                                const maxBootstrapTokens = Math.max(1_000, Number(projectMemoryMcp?.snapshot?.maxBootstrapTokens || 32_000));
                                if (bootstrapTokens >= maxBootstrapTokens) {
                                    throw new Error(`项目子 Agent Bootstrap 超过独立 Token 门禁：${bootstrapTokens}/${maxBootstrapTokens}`);
                                }
                                projectMemoryMcp.bootstrapTokens = bootstrapTokens;
                                projectMemoryMcp.maxBootstrapTokens = maxBootstrapTokens;
                            }
                            const output = await callAgent(project, workerPrompt, workerWorkDir, agentType, Number(workItem.dispatchContract?.timeoutMs || 300000), {
                                background: true,
                                taskId: task.id,
                                executionId: workerExecutionId,
                                projectSessionId: exactProjectSessionId,
                                role: "project-child-agent",
                                source: "project-main-agent",
                                title: workItem.title,
                                allowedTools: workerToolContext.allowedTools,
                                mcpConfigPath: workerToolContext.audit.mcpConfigPath,
                                runtimeToolSnapshot: workerToolContext.runtimeToolSnapshot,
                                runtimeToolDispatchGate: workerToolContext.dispatchGate,
                                agentSession: workerSessionOptions,
                                taskAgentSessionId: workerSession.id,
                                planDispatchContract: workItem.dispatchContract || null,
                                planId: task.id,
                                planRevision: Number(workItem.dispatchContract?.planRevision || 0),
                                planChecksum: String(workItem.dispatchContract?.planChecksum || ""),
                                contractChecksum: String(workItem.dispatchContract?.contractChecksum || ""),
                                sourceManifestChecksum: String(workItem.dispatchContract?.sourceManifestChecksum || ""),
                                workItemId: String(workItem.dispatchContract?.workItemId || workItem.id),
                                memoryContextConsumptionReceiptRequired: needsMemoryReceipt,
                                memoryContextConsumptionChallenge: needsMemoryReceipt ? workerMemoryChallenge : null,
                                onDone: (state) => { doneState = state; },
                            });
                            workItemMemoryReceiptStarted.add(String(workItem.id));
                            firstMemoryReceiptRequired = false;
                            workerSession = (0, agent_sessions_1.recordTaskAgentSessionTurn)(workerSession.id, {
                                nativeSessionId: doneState?.nativeSessionId || "",
                                nativeContinuationEvidence: doneState?.nativeContinuationEvidence || null,
                                success: doneState?.isError !== true,
                                error: doneState?.error || "",
                                runtimeToolSnapshot: toolContext.runtimeToolSnapshot,
                            }) || workerSession;
                            workItemAgentSessions.set(String(workItem.id), workerSession);
                            workerSessionOptions = (0, agent_sessions_1.getTaskAgentSessionOptions)(workerSession);
                            const result = {
                                success: doneState?.isError !== true && !/^\[[^\]]+\]\s*Agent (?:Runner )?错误:/i.test(String(output || "")),
                                output: String(output || ""),
                                fileChanges: doneState?.fileChanges || { count: 0, files: [] },
                                nativeSessionId: doneState?.nativeSessionId || "",
                                sessionId: workerSession.id,
                                usage: doneState?.usage || null,
                                error: doneState?.error || "",
                            };
                            const deliveryJob = (0, project_worker_delivery_1.enqueueProjectWorkerDelivery)({ prepared: isolatedWorkDir, workItem, mainWorkDir: workDir, queue: worktreeMergeQueue });
                            worktreeMergeQueue = deliveryJob.queue;
                            const delivery = await deliveryJob.promise;
                            if (delivery)
                                result.delivery = delivery;
                            workerResults.push(result);
                            return result;
                        },
                    }),
                });
                if (execution.status === "completed") {
                    try {
                        const memory = (0, memory_1.updateProjectMemoryFromReceipt)({
                            project,
                            workDir,
                            taskId: task.id,
                            agent: project,
                            accepted: true,
                            sourceKind: "accepted_project_main_agent_delivery",
                            contextSourceIdentity: {
                                agentKind: "project",
                                scope: "project",
                                scopeId: project,
                                exactSessionId: String(projectRun.project_session_id || projectRun.session_id || projectRun.id),
                                generation: Math.max(0, Number(projectRun.project_session_generation || projectRun.generation || 0)),
                            },
                            actualFiles: execution.fileChanges?.files || [],
                            receipt: {
                                status: "done",
                                summary: execution.summary,
                                actions: plan.workItems.map((item) => item.title),
                                filesChanged: (execution.fileChanges?.files || []).map((item) => item.path || item.file || item).filter(Boolean),
                                verification: execution.verification,
                                blockers: [],
                                needs: execution.risks,
                            },
                        });
                        projectRun.memory_admission = memory.lastMemoryAdmission || null;
                    }
                    catch (error) {
                        projectRun.memory_admission = { decision: "rejected", error: String(error?.message || error) };
                    }
                }
                projectRun.status = execution.status === "completed" ? "done" : execution.status;
                projectRun.fileChanges = execution.fileChanges;
                projectRun.acceptance_state = execution.task?.acceptance_state || execution.status;
                projectRun.test_agent_review = execution.testAgent || null;
                projectRun.updated_at = new Date().toISOString();
                (0, chat_runs_1.saveProjectChatRuns)();
                if (execution.summary && !finalSummaryStreamed)
                    send({ type: "chunk", text: execution.summary, agent: "project-main-agent" });
                const latestTaskExperience = taskExperience();
                persistTaskMessage(execution.summary, latestTaskExperience);
                if (execution.status === "failed") {
                    send({ type: "error", message_id: taskMessageId, text: execution.summary, message_mode: "task", run: (0, chat_runs_1.publicProjectChatRun)(projectRun), fileChanges: execution.fileChanges, taskExperience: latestTaskExperience });
                }
                else {
                    send({
                        type: "done",
                        message_id: taskMessageId,
                        message_mode: "task",
                        run: (0, chat_runs_1.publicProjectChatRun)(projectRun),
                        fileChanges: execution.fileChanges,
                        workEvents: projectRun.workEvents || [],
                        taskExperience: latestTaskExperience,
                        provider_usage: workerResults.map(result => result.usage).filter(Boolean).slice(-1)[0] || null,
                    });
                }
                clearInterval(heartbeat);
                if (feishuTask) {
                    await (0, feishu_channel_1.notifyFeishuTaskStage)({
                        stage: execution.status === "completed" ? "completion" : "failure",
                        title: execution.status === "completed" ? `${(0, project_runtime_1.projectDisplayName)(project)} · 项目任务完成` : `${(0, project_runtime_1.projectDisplayName)(project)} · 项目任务未完成`,
                        markdown: execution.summary || (execution.status === "completed" ? "项目任务已经通过项目主 Agent 验收。" : "项目任务执行失败或仍有阻塞。"),
                        dedupeKey: `project-main:${task.id}:${execution.status}`,
                        runId: projectRun.id,
                        taskId: task.id,
                        sessionId: exactProjectSessionId,
                        forceNewMessage: true,
                    });
                    retainDispatchAfterResponse = false;
                    releaseDispatch();
                }
                else {
                    releaseDispatch();
                    res.end();
                }
            }
            catch (error) {
                const messageText = String(error?.message || error || "项目主 Agent 执行失败");
                if (source === "feishu" && retainDispatchAfterResponse) {
                    try {
                        await (0, feishu_channel_1.notifyFeishuTaskStage)({
                            stage: "failure",
                            title: `${(0, project_runtime_1.projectDisplayName)(project)} · 项目任务异常`,
                            markdown: `项目主 Agent 后台执行没有完成：${messageText}`,
                            dedupeKey: `project-main-background-failure:${project}:${exactProjectSessionId}:${parentRunId || finalMessage.slice(0, 80)}`,
                            sessionId: exactProjectSessionId,
                            forceNewMessage: true,
                        });
                    }
                    catch { }
                    retainDispatchAfterResponse = false;
                    releaseDispatch();
                    return;
                }
                releaseDispatch();
                throw error;
            }
        };
        if (contentType.includes("multipart/form-data")) {
            (0, secure_multipart_1.parseSecureMultipartRequest)(req).then(({ files, fields }) => {
                try {
                    void handleStreamSend(fields.project, fields.message, files, String(fields.parent_run_id || fields.parentRunId || ""), String(fields.session_id || fields.sessionId || ""), String(fields.source || "web"), {}, String(fields.client_message_id || fields.clientMessageId || ""), String(fields.assistant_message_id || fields.assistantMessageId || ""), fields.clarification_payload ? JSON.parse(String(fields.clarification_payload)) : null, [], [], String(fields.conversation_turn_id || ""), String(fields.resolved_route || ""), String(fields.resolved_candidate_task_id || ""));
                }
                catch (e) {
                    (0, utils_1.sendJson)(res, { error: e.message }, 400);
                }
            }).catch((e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
            return;
        }
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { project, message, files, attachments, cc_connect_attachment_refs, parent_run_id, parentRunId, session_id, sessionId, source, platform_context, platformContext, client_message_id, clientMessageId, assistant_message_id, assistantMessageId, clarification_payload, clarificationPayload, conversation_turn_id, resolved_route, resolved_candidate_task_id } = JSON.parse(body);
                void handleStreamSend(project, message, Array.isArray(files) ? files : [], String(parent_run_id || parentRunId || ""), String(session_id || sessionId || ""), String(source || "web"), platform_context || platformContext || {}, String(client_message_id || clientMessageId || ""), String(assistant_message_id || assistantMessageId || ""), clarification_payload || clarificationPayload || null, Array.isArray(cc_connect_attachment_refs) ? cc_connect_attachment_refs : [], Array.isArray(attachments) ? attachments : [], String(conversation_turn_id || ""), String(resolved_route || ""), String(resolved_candidate_task_id || ""));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // === 发送消息给 Agent（非流式）===
    if (pathname === "/api/send" && req.method === "POST") {
        const contentType = req.headers["content-type"] || "";
        const handleSend = async (project, message, files) => {
            const configs = (0, db_1.getConfigs)();
            const config = configs.find(c => c.name === project);
            if (!config)
                return (0, utils_1.sendJson)(res, { error: "项目不存在" }, 400);
            const info = (0, db_1.getConfigInfo)(config.path);
            const workDir = info[0]?.workDir;
            if (!workDir)
                return (0, utils_1.sendJson)(res, { error: "无法获取项目目录" }, 400);
            let fullMessage = message || "";
            if (files && files.length > 0) {
                const filesContext = (0, utils_1.buildUploadedFilesContext)(files, "本次消息附件");
                fullMessage = fullMessage ? `${fullMessage}${filesContext}` : `请处理以下附件：${filesContext}`;
            }
            if (!fullMessage)
                return (0, utils_1.sendJson)(res, { error: "消息不能为空" }, 400);
            const configuredAgentType = info[0]?.agent || "claudecode";
            const resolvedRuntime = (0, runtime_1.resolveAvailableAgentRuntime)(configuredAgentType);
            const agentType = resolvedRuntime.selected;
            const toolContext = buildProjectToolContext(project, workDir, agentType);
            if (toolContext.dispatchGate?.dispatchReady === false)
                return sendRuntimeToolDispatchBlocked(res, toolContext);
            let projectKnowledge = { context: "" };
            try {
                projectKnowledge = await (0, knowledge_access_1.searchAgentKnowledge)(fullMessage, { role: "project-agent", project }, { limit: 6, maxContextChars: 18000 });
            }
            catch (error) {
                console.warn(`[项目知识检索] ${project} 已使用无知识上下文继续：${error?.message || error}`);
            }
            const promptWithTools = [toolContext.prompt, projectKnowledge.context, fullMessage].filter(Boolean).join("\n\n");
            try {
                const output = await callAgent(project, promptWithTools, workDir, agentType, 120000, {
                    tab: "projects",
                    project,
                    allowedTools: toolContext.allowedTools,
                    mcpConfigPath: toolContext.audit.mcpConfigPath,
                    runtimeToolSnapshot: toolContext.runtimeToolSnapshot,
                    runtimeToolDispatchGate: toolContext.dispatchGate,
                });
                (0, utils_1.sendJson)(res, { success: true, output });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.stdout || e.stderr || e.message || "发送失败" }, 500);
            }
        };
        if (contentType.includes("multipart/form-data")) {
            (0, secure_multipart_1.parseSecureMultipartRequest)(req).then(async ({ files, fields }) => {
                try {
                    await handleSend(fields.project, fields.message, files);
                }
                catch (e) {
                    (0, utils_1.sendJson)(res, { error: e.message }, 400);
                }
            }).catch((e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
            return;
        }
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { project, message } = JSON.parse(body);
                await handleSend(project, message, null);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return;
    }
    // 4. API 子模块分流拦截
    if ((0, projects_1.handleProjectsApi)(pathname, req, res, parsed, projectsCtx))
        return;
    if ((0, conversation_search_1.handleConversationSearchApi)(pathname, req, res, parsed))
        return;
    if ((0, sessions_1.handleSessionsApi)(pathname, req, res, parsed))
        return;
    if ((0, git_1.handleGitApi)(pathname, req, res, parsed))
        return;
    if ((0, marketplace_1.handleMarketplaceApi)(pathname, req, res, parsed))
        return;
    if (pathname.startsWith("/api/templates")) {
        (0, utils_1.sendJson)(res, { success: false, error: "对话模板功能已移除，请使用 Skill、斜杠命令或共享文件", code: "TEMPLATE_FEATURE_REMOVED" }, 410);
        return;
    }
    if ((0, task_templates_1.handleTaskTemplateApi)(pathname, req, res))
        return;
    if ((0, task_intake_preflight_1.handleTaskPreflightApi)(pathname, req, res))
        return;
    if ((0, cron_1.handleCronApi)(pathname, req, res, parsed, collabCtx))
        return;
    if ((0, shared_files_api_1.handleSharedFilesV2Api)(pathname, req, res, parsed))
        return;
    if ((0, tools_1.handleToolsAndMetricsApi)(pathname, req, res, parsed))
        return;
    if ((0, pets_1.handlePetsApi)(pathname, req, res, parsed, petsCtx))
        return;
    if ((0, music_1.handleMusicApi)(pathname, req, res, parsed, musicCtx))
        return;
    if ((0, task_permission_routes_1.handleTaskPermissionRoutes)(pathname, req, res, parsed, collabCtx))
        return;
    if ((0, automation_session_bindings_api_1.handleAutomationSessionBindingsApi)(pathname, req, res, parsed))
        return;
    if ((0, collaboration_1.handleCollaborationApi)(pathname, req, res, parsed, collabCtx))
        return;
    if ((0, global_agent_1.handleGlobalAgentApi)(pathname, req, res, parsed, collabCtx))
        return;
    if ((0, rag_1.handleRagApi)(pathname, req, res, parsed))
        return;
    if ((0, slash_command_conversations_1.handleSlashCommandConversationApi)(pathname, req, res, parsed))
        return;
    if ((0, slash_commands_1.handleSlashCommandsApi)(pathname, req, res, parsed))
        return;
    if ((0, navigation_config_1.handleNavigationConfigApi)(pathname, req, res))
        return;
    if ((0, usability_1.handleUsabilityApi)(pathname, req, res, parsed, {
        ctx: collabCtx,
        archiveTask: collaboration_1.archiveTask,
        continueTaskWithMessage: collaboration_1.continueTaskWithMessage,
        enqueueTask: collaboration_1.enqueueTask,
        removeTaskFromQueues: collaboration_1.removeTaskFromQueues,
        retryTask: collaboration_1.retryTask,
    }))
        return;
    if ((0, settings_1.handleSystemSettingsApi)(pathname, req, res))
        return;
    const { handleMemoryCenterApi } = require("./modules/knowledge/memory-control-center");
    if (handleMemoryCenterApi(pathname, req, res, parsed))
        return;
    // 404 fallback
    (0, utils_1.sendJson)(res, { error: "Not Found" }, 404);
}
// === 启动服务器 ===
function bootstrapServerRuntime(startupCollabCtx, port) {
    (0, session_compaction_hooks_1.initializeBuiltInSessionCompactionHooks)();
    return (0, server_bootstrap_1.bootstrapServerRuntime)(startupCollabCtx, port, {
        CCM_DIR: utils_1.CCM_DIR,
        CONFIGS_DIR: utils_1.CONFIGS_DIR,
        bootstrapGlobalAgentMemoryForServer: global_agent_1.bootstrapGlobalAgentMemoryForServer,
        bootstrapGroupSessionLifecycleJournals: group_session_lifecycle_head_1.bootstrapGroupSessionLifecycleJournals,
        conversationTurnControl: conversation_turn_control_1.conversationTurnControl,
        ensureRoleSkillsInstalled: role_skills_1.ensureRoleSkillsInstalled,
        listTaskAgentInvocationEdges: task_agent_invocation_lineage_1.listTaskAgentInvocationEdges,
        listTaskAgentSessions: agent_sessions_1.listTaskAgentSessions,
        loadFeishuConfig: db_1.loadFeishuConfig,
        migrateConfigDirectory: credential_store_1.migrateConfigDirectory,
        migrateTomlCredentials: credential_store_1.migrateTomlCredentials,
        path,
        reconcileGroupSessionLifecycleAgentCancellations: storage_1.reconcileGroupSessionLifecycleAgentCancellations,
        reconcileMemoryContextConsumptionReceipts: memory_context_consumption_receipt_1.reconcileMemoryContextConsumptionReceipts,
        reconcileMemoryContextConsumptionRecoveries: memory_context_consumption_recovery_1.reconcileMemoryContextConsumptionRecoveries,
        reconcileInterruptedProjectMainTasks: project_main_agent_1.reconcileInterruptedProjectMainTasks,
        reconcileTaskAgentContinuationSoak: task_agent_continuation_soak_1.reconcileTaskAgentContinuationSoak,
        reconcileTaskAgentInvocationRecovery: task_agent_invocation_lineage_1.reconcileTaskAgentInvocationRecovery,
        recoverChildTypedMemoryDispatchWal: memory_2.recoverChildTypedMemoryDispatchWal,
        recoverGroupTypedMemoryArtifactTransactionsFleet: group_memory_index_1.recoverGroupTypedMemoryArtifactTransactionsFleet,
        refreshEnvPath: utils_1.refreshEnvPath,
        resumeSoakTest: soak_test_1.resumeSoakTest,
        resumeTaskQueues: collaboration_1.resumeTaskQueues,
        saveFeishuConfig: db_1.saveFeishuConfig,
        startAgentRecoveryMonitor: collaboration_1.startAgentRecoveryMonitor,
        startCronScheduler: cron_1.startCronScheduler,
        startGlobalMissionSupervisionForServer: global_agent_1.startGlobalMissionSupervisionForServer,
        startGroupSessionRetentionMaintenanceScheduler: group_session_maintenance_1.startGroupSessionRetentionMaintenanceScheduler,
        startReliabilityDrillScheduler: reliability_drills_1.startReliabilityDrillScheduler,
        startTaskWatchdog: collaboration_1.startTaskWatchdog,
        startUsabilityArchiveScheduler: usability_1.startUsabilityArchiveScheduler,
        toolManager: tool_manager_1.toolManager
    });
}
function normalizeListenHost(value) {
    let host = String(value || "127.0.0.1").trim().replace(/^\[|\]$/g, "");
    if (host === "*")
        host = "0.0.0.0";
    if (!host || host.length > 253 || !/^[a-zA-Z0-9._:-]+$/.test(host))
        throw new Error(`监听地址无效：${value}`);
    return host;
}
function formatHostUrl(host, port) {
    return `http://${host.includes(":") ? `[${host}]` : host}:${port}`;
}
function networkAccessUrls(host, port) {
    if (!["0.0.0.0", "::"].includes(host)) {
        return ["127.0.0.1", "localhost", "::1"].includes(host) ? [] : [formatHostUrl(host, port)];
    }
    const addresses = new Set();
    for (const rows of Object.values(os.networkInterfaces())) {
        for (const row of rows || []) {
            if (!row.internal && row.family === "IPv4")
                addresses.add(formatHostUrl(row.address, port));
        }
    }
    return [...addresses];
}
function startServer(port, host = process.env.CCM_HOST || "127.0.0.1") {
    PORT = port;
    LISTEN_HOST = normalizeListenHost(host);
    SERVICE_LIFECYCLE_STATE = "starting";
    const instanceLock = (0, server_instance_lock_1.acquireCcmServerInstanceLock)(port, LISTEN_HOST, {
        publicOrigin: process.env.CCM_PUBLIC_ORIGIN || "",
        launchMode: ["foreground", "background"].includes(String(process.env.CCM_LAUNCH_MODE || ""))
            ? process.env.CCM_LAUNCH_MODE
            : "unknown",
        packageVersion: CCM_RUNTIME_VERSION,
        bootId: (0, process_lifecycle_1.getProcessBootId)(),
    });
    (0, git_workspace_runtime_1.cleanupStaleGitMutationLeases)();
    (0, project_git_1.cleanupStaleProjectCloneArtifacts)();
    (0, context_engine_recovery_1.registerContextEngineRecoveryHook)();
    const startupCollabCtx = createCollabCtx();
    const server = http.createServer(handleRequest);
    let managedShutdownInProgress = false;
    server.on("error", () => {
        SERVICE_LIFECYCLE_STATE = "failed";
        (0, server_instance_lock_1.releaseCcmServerInstanceLock)(instanceLock);
    });
    server.on("close", () => {
        SERVICE_LIFECYCLE_STATE = "stopped";
        (0, projects_1.stopFeishuChannelSupervisorForServer)();
        (0, projects_1.stopControlBotConnection)();
        if (!managedShutdownInProgress) {
            void (0, project_runtime_1.stopManagedProjectRuntimesForShutdown)();
            void (0, terminal_1.stopAllTerminalRuns)();
        }
        (0, cron_1.stopCronScheduler)();
        (0, collaboration_1.stopTaskWatchdog)();
        (0, collaboration_1.stopAgentRecoveryMonitor)();
        (0, global_agent_1.stopGlobalMissionSupervisionForServer)();
        (0, global_agent_1.stopGlobalWebTurnRecoveryForServer)();
        (0, global_agent_1.stopFeishuConversationTurnRecoveryForServer)();
        (0, project_feishu_turn_queue_1.stopProjectFeishuTurnRecoveryForServer)();
        (0, conversation_turn_control_1.stopWebConversationTurnRecoveryForServer)();
        (0, reliability_drills_1.stopReliabilityDrillScheduler)();
        (0, storage_index_1.stopStorageIndexScheduler)();
        (0, conversation_search_index_1.stopConversationSearchIndexScheduler)();
        (0, usability_1.stopUsabilityArchiveScheduler)();
        (0, group_session_maintenance_1.stopGroupSessionRetentionMaintenanceScheduler)();
        (0, model_capability_cache_1.stopModelCapabilityRefreshScheduler)();
        (0, runtime_tool_real_cli_matrix_1.stopRuntimeToolRealCliMatrixScheduler)();
        (0, task_permission_broker_1.stopTaskPermissionNotificationScheduler)();
        (0, agent_communication_v2_1.stopAgentCommunicationWatchdog)();
        petAgentMilestoneProjector.stop();
        (0, soak_test_1.shutdownSoakMonitor)();
        if (!managedShutdownInProgress) {
            (0, task_store_1.closeSqliteTaskStore)();
            (0, server_instance_lock_1.releaseCcmServerInstanceLock)(instanceLock);
        }
    });
    server.listen(port, LISTEN_HOST, () => {
        // Port ownership and the data-directory lock are the fail-closed singleton
        // gates. No mutable startup work may run before both have succeeded.
        SERVICE_LIFECYCLE_STATE = "ready";
        try {
            const marketplaceRecovery = (0, marketplace_1.recoverMarketplaceProductionState)();
            if (marketplaceRecovery.quarantined || marketplaceRecovery.recoveredTransactions) {
                console.log(`[工具市场] 隔离旧外部工具 ${marketplaceRecovery.quarantined} 个，恢复待处理事务 ${marketplaceRecovery.recoveredTransactions} 个`);
            }
        }
        catch (error) {
            console.warn(`[工具市场] 启动恢复失败：${error?.message || error}`);
        }
        bootstrapServerRuntime(startupCollabCtx, port);
        (0, feishu_channel_1.setFeishuChannelAlertHandler)(payload => {
            startupCollabCtx.broadcastPetSpeech?.("global-agent", { role: payload.role, text: payload.text, final: true, source: payload.source });
        });
        (0, task_permission_broker_1.startTaskPermissionNotificationScheduler)(startupCollabCtx);
        (0, agent_communication_v2_1.startAgentCommunicationWatchdog)({
            onSafeRetry: outcome => {
                const reason = `Agent Communication ${outcome.toState}，确认无副作用后自动重试`;
                try {
                    (0, agent_communication_v2_1.performAgentCommunicationAction)(outcome.messageId, "retry", { reason, actor: "agent-communication-watchdog" });
                    (0, execution_kernel_2.requestTaskCancellation)(outcome.taskId, reason, "agent-communication-watchdog");
                }
                catch (error) {
                    console.warn(`[Agent Communication] 自动重试准备失败：${error?.message || error}`);
                    return;
                }
                const deadline = Date.now() + 60_000;
                const retryAfterRunnerStops = () => {
                    const result = (0, collaboration_1.retryTask)(outcome.taskId, startupCollabCtx, reason, true);
                    if (result?.success)
                        return;
                    if (Date.now() < deadline && [409, 429].includes(Number(result?.status || 0))) {
                        const timer = setTimeout(retryAfterRunnerStops, 2_000);
                        timer.unref?.();
                        return;
                    }
                    try {
                        (0, agent_communication_v2_1.performAgentCommunicationAction)(outcome.messageId, "takeover", {
                            reason: `自动重试未能在60秒内安全重新入队：${String(result?.error || "unknown").slice(0, 300)}`,
                            actor: "agent-communication-watchdog",
                        });
                    }
                    catch { }
                };
                const timer = setTimeout(retryAfterRunnerStops, 250);
                timer.unref?.();
            },
        });
        const petAutoStart = (0, pets_1.maybeAutoStartPet)(port);
        if (!petAutoStart.success) {
            console.warn(`[桌面宠物] 自动启动失败：${"error" in petAutoStart ? petAutoStart.error || "未知错误" : "未知错误"}`);
        }
        (0, model_capability_cache_1.startModelCapabilityRefreshScheduler)();
        (0, runtime_tool_real_cli_matrix_1.startRuntimeToolRealCliMatrixScheduler)();
        (0, cleanup_center_1.recoverCleanupTransactions)();
        (0, storage_index_1.startStorageIndexScheduler)();
        (0, conversation_search_index_1.startConversationSearchIndexScheduler)();
        // 预热提供商状态缓存：让首个请求也走缓存路径，避免同步 spawnSync 探测冻结事件循环
        void (0, agent_provider_settings_1.refreshAgentProviderStatusesAsync)().catch(() => { });
        const localEmbeddingStartup = (0, knowledge_model_startup_1.scheduleLocalKnowledgeModelStartupPreparation)();
        if (localEmbeddingStartup.scheduled)
            console.log("[知识库] 本地语义模型将在后台下载或校验，不阻塞 CCM 启动");
        console.log("");
        console.log(`CCM Workspace  v${CCM_RUNTIME_VERSION}`);
        console.log("------------------------------------------------------");
        console.log(`Local URL   http://localhost:${port}`);
        console.log(`Listen      ${LISTEN_HOST}:${port}`);
        for (const accessUrl of networkAccessUrls(LISTEN_HOST, port))
            console.log(`Network URL ${accessUrl}`);
        console.log(`Data        ${utils_1.CCM_DIR}`);
        console.log(`Runtime     ${networkAccessUrls(LISTEN_HOST, port).length ? "remote access enabled; login required" : "local authenticated workspace"}`);
        console.log("Stop        Ctrl+C");
        console.log("");
        void (0, global_agent_1.resumeGlobalAgentLoopsForServer)(startupCollabCtx, port)
            .then(result => {
            if (result.total > 0)
                console.log(`[全局 Agent] 启动恢复 ${result.resumed}/${result.total} 个运行`);
        })
            .catch(error => console.warn(`[全局 Agent] 启动恢复失败：${error?.message || error}`))
            .finally(() => {
            (0, global_agent_1.startGlobalWebTurnRecoveryForServer)(`http://127.0.0.1:${port}`, startupCollabCtx);
            (0, global_agent_1.startFeishuConversationTurnRecoveryForServer)(`http://127.0.0.1:${port}`, startupCollabCtx);
        });
        (0, project_feishu_turn_queue_1.startProjectFeishuTurnRecoveryForServer)(`http://127.0.0.1:${port}`);
        (0, conversation_turn_control_1.reconcileTaskDispatchTurns)();
        (0, conversation_turn_control_1.startWebConversationTurnRecoveryForServer)(`http://127.0.0.1:${port}`);
        try {
            const feishuConfig = (0, db_1.loadFeishuConfig)();
            const hasControlBotCredentials = !!((feishuConfig.control_bot_app_id || feishuConfig.app_id) && (feishuConfig.control_bot_app_secret || feishuConfig.app_secret));
            if (feishuConfig.control_bot_enabled === true && hasControlBotCredentials) {
                const result = (0, projects_1.startControlBotConnection)(port);
                console.log(`[飞书控制机器人] ${result.message || "长连接已启动"}${result.pid ? ` (PID: ${result.pid})` : ""}`);
            }
        }
        catch (error) {
            console.warn(`[飞书控制机器人] 自动启动失败：${error?.message || error}`);
        }
        void (0, projects_1.reconcileProjectFeishuConnections)(port).then(projectChannelResults => {
            const recycledProjectChannels = projectChannelResults.filter((item) => item.recycled).length;
            const failedProjectChannels = projectChannelResults.filter((item) => item.success === false);
            if (recycledProjectChannels > 0)
                console.log(`[项目飞书通道] 已更新并重连 ${recycledProjectChannels} 个旧运行实例`);
            for (const item of failedProjectChannels)
                console.warn(`[项目飞书通道] ${item.project} 协调失败：${item.error}`);
        }).catch(error => console.warn(`[项目飞书通道] 启动协调失败：${error?.message || error}`));
        (0, projects_1.startFeishuChannelSupervisorForServer)(port);
    });
    process.once("exit", () => (0, server_instance_lock_1.releaseCcmServerInstanceLock)(instanceLock));
    server.beginManagedShutdown = () => { managedShutdownInProgress = true; };
    server.finalizeManagedShutdown = () => {
        SERVICE_LIFECYCLE_STATE = "stopped";
        (0, server_instance_lock_1.releaseCcmServerInstanceLock)(instanceLock);
    };
    return server;
}
if (require.main === module) {
    PORT = parseInt(process.argv[2]) || 3080;
    LISTEN_HOST = normalizeListenHost(process.argv[3] || process.env.CCM_HOST || "127.0.0.1");
    const server = startServer(PORT, LISTEN_HOST);
    let lifecycleHeartbeat = null;
    server.prependOnceListener("listening", () => {
        (0, process_lifecycle_1.initializeProcessLifecycle)();
        lifecycleHeartbeat = setInterval(() => (0, process_lifecycle_1.touchProcessLifecycle)(), 30_000);
        lifecycleHeartbeat.unref?.();
    });
    let shuttingDown = false;
    const shutdown = async (signal, exitCode = 0) => {
        if (shuttingDown)
            return;
        shuttingDown = true;
        SERVICE_LIFECYCLE_STATE = "draining";
        server.beginManagedShutdown?.();
        if (lifecycleHeartbeat)
            clearInterval(lifecycleHeartbeat);
        (0, cron_1.stopCronScheduler)();
        (0, collaboration_1.stopTaskWatchdog)();
        (0, collaboration_1.stopAgentRecoveryMonitor)();
        (0, global_agent_1.stopGlobalMissionSupervisionForServer)();
        (0, global_agent_1.stopGlobalWebTurnRecoveryForServer)();
        (0, global_agent_1.stopFeishuConversationTurnRecoveryForServer)();
        (0, project_feishu_turn_queue_1.stopProjectFeishuTurnRecoveryForServer)();
        (0, conversation_turn_control_1.stopWebConversationTurnRecoveryForServer)();
        (0, reliability_drills_1.stopReliabilityDrillScheduler)();
        (0, storage_index_1.stopStorageIndexScheduler)();
        (0, conversation_search_index_1.stopConversationSearchIndexScheduler)();
        (0, usability_1.stopUsabilityArchiveScheduler)();
        (0, group_session_maintenance_1.stopGroupSessionRetentionMaintenanceScheduler)();
        (0, model_capability_cache_1.stopModelCapabilityRefreshScheduler)();
        (0, runtime_tool_real_cli_matrix_1.stopRuntimeToolRealCliMatrixScheduler)();
        (0, task_permission_broker_1.stopTaskPermissionNotificationScheduler)();
        (0, agent_communication_v2_1.stopAgentCommunicationWatchdog)();
        petAgentMilestoneProjector.stop();
        (0, projects_1.stopFeishuChannelSupervisorForServer)();
        (0, projects_1.stopControlBotConnection)();
        const forceExit = setTimeout(() => process.exit(1), 15_000);
        forceExit.unref?.();
        const closed = new Promise(resolve => server.close(() => resolve()));
        await Promise.all([
            (0, project_runtime_1.stopManagedProjectRuntimesForShutdown)().catch(error => console.warn(`[项目运行] 受控退出停止失败：${error?.message || error}`)),
            (0, terminal_1.stopAllTerminalRuns)().catch(error => console.warn(`[终端] 受控退出停止失败：${error?.message || error}`)),
        ]);
        await Promise.race([closed, new Promise(resolve => setTimeout(resolve, 8_000))]);
        (0, process_lifecycle_1.markProcessShutdown)({
            category: exitCode === 0 ? "system_shutdown" : "unexpected_crash",
            reason: `收到 ${signal}，受控排空完成`,
            signal,
            exit_code: exitCode,
        });
        (0, task_store_1.closeSqliteTaskStore)();
        server.finalizeManagedShutdown?.();
        clearTimeout(forceExit);
        process.exit(exitCode);
    };
    REQUEST_SERVICE_DRAIN = reason => { void shutdown(reason || "internal_drain"); };
    (0, process_lifecycle_1.installProcessLifecycleFaultHandlers)((_reason, type) => { void shutdown(type, 1); });
    server.once("error", (error) => {
        SERVICE_LIFECYCLE_STATE = "failed";
        console.error(`[CCM] 服务监听失败：${error?.code || error?.message || error}`);
        process.exitCode = 1;
        setImmediate(() => process.exit(1));
    });
    process.once("SIGINT", () => { void shutdown("SIGINT"); });
    process.once("SIGTERM", () => { void shutdown("SIGTERM"); });
    process.once("exit", code => (0, process_lifecycle_1.markProcessShutdown)({ category: code === 0 ? "system_shutdown" : "unexpected_crash", reason: `进程退出，exit code ${code}`, exit_code: code }));
}
module.exports = { startServer };
//# sourceMappingURL=server.js.map