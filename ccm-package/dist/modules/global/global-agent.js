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
exports.postLocalSseOrJsonApi = exports.postLocalApi = exports.callLocalApi = exports.getRequestBaseUrl = exports.waitForGlobalAgentBridgeResult = exports.createGlobalAgentBridgeRequest = exports.saveGlobalAgentBridgeStore = exports.loadGlobalAgentBridgeStore = exports.buildGlobalAgentEventUi = exports.runGlobalModelRetrySelfTest = exports.callGlobalModelWithRetry = exports.callLlm = exports.hasExplicitGlobalWriteAuthorization = exports.inferLocalGlobalAction = exports.runGlobalAgentIntentSelfTest = void 0;
exports.runGlobalAgentHistorySyncSelfTest = runGlobalAgentHistorySyncSelfTest;
exports.runFeishuGlobalAgentSessionRoutingSelfTest = runFeishuGlobalAgentSessionRoutingSelfTest;
exports.verifyGlobalAgentContextBoundary = verifyGlobalAgentContextBoundary;
exports.buildGlobalAgentGroupMemoryModelContext = buildGlobalAgentGroupMemoryModelContext;
exports.buildAgenticContext = buildAgenticContext;
exports.resumeGlobalAgentLoopsForServer = resumeGlobalAgentLoopsForServer;
exports.startGlobalMissionSupervisionForServer = startGlobalMissionSupervisionForServer;
exports.bootstrapGlobalAgentMemoryForServer = bootstrapGlobalAgentMemoryForServer;
exports.stopGlobalMissionSupervisionForServer = stopGlobalMissionSupervisionForServer;
exports.parseFeishuConversationTurnCommand = parseFeishuConversationTurnCommand;
exports.startFeishuConversationTurnRecoveryForServer = startFeishuConversationTurnRecoveryForServer;
exports.stopFeishuConversationTurnRecoveryForServer = stopFeishuConversationTurnRecoveryForServer;
exports.runFeishuConversationTurnCommandSelfTest = runFeishuConversationTurnCommandSelfTest;
exports.handleGlobalAgentApi = handleGlobalAgentApi;
const globalAgentTestAgentDisplay = __importStar(require("./global-agent-test-agent-display"));
const globalAgentLocalIntent = __importStar(require("./global-agent-local-intent"));
const globalAgentBridge = __importStar(require("./global-agent-bridge"));
const globalAgentModel = __importStar(require("./global-agent-model"));
const global_agent_self_tests_1 = require("./global-agent-self-tests");
const global_agent_api_1 = require("./global-agent-api");
const global_agent_agentic_runtime_1 = require("./global-agent-agentic-runtime");
const global_agent_feishu_channel_1 = require("./global-agent-feishu-channel");
const global_agent_feishu_actions_1 = require("./global-agent-feishu-actions");
const global_agent_direct_dispatch_1 = require("./global-agent-direct-dispatch");
const global_agent_test_agent_relay_1 = require("./global-agent-test-agent-relay");
const global_agent_history_1 = require("./global-agent-history");
const global_agent_status_1 = require("./global-agent-status");
const session_title_1 = require("../../system/session-title");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const rag_1 = require("../knowledge/rag");
const utils_1 = require("../../core/utils");
const group_orchestrator_1 = require("../collaboration/group-orchestrator");
const db_1 = require("../../core/db");
const collaboration_1 = require("../collaboration/collaboration");
const display_1 = require("../collaboration/display");
const feishu_channel_1 = require("../collaboration/feishu-channel");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const worker_handoff_1 = require("../../agents/worker-handoff");
const memory_1 = require("../collaboration/memory");
const loop_1 = require("../../agents/global/loop");
const conversation_turn_control_1 = require("../../agents/conversation-turn-control");
const mission_supervisor_1 = require("../../agents/global/mission-supervisor");
const memory_2 = require("../../agents/global/memory");
const quality_center_1 = require("../../agents/quality-center");
const test_agent_review_bridge_1 = require("../../agents/test-agent-review-bridge");
const post_review_spot_check_1 = require("../../agents/post-review-spot-check");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const reasoning_loop_1 = require("../../agents/reasoning-loop");
const source_ingestion_1 = require("../requirements/source-ingestion");
const runtime_kernel_1 = require("../../agents/runtime-kernel");
const runtime_1 = require("../../agents/global/runtime");
const control_center_1 = require("../../agents/global/control-center");
const { GLOBAL_PET_AGENT_NAME, GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK, GLOBAL_AGENT_VISIBLE_COMPLETED_EVENT_FALLBACK, compactPetText, globalVisibleText, globalSafeArray, globalUniqueStrings, globalTestAgentCoverageItemKey, globalUniqueCoverageItems, globalTestAgentCoverageLabel, globalTestAgentCoverageByStatus, globalTestAgentSummaryObjects, globalTestAgentSummaryItems, globalTestAgentSummaryByStatus, globalTestAgentAcceptanceWeakReason, globalTestAgentWeakAcceptanceItems, summarizeGlobalTestAgentCoverageGap, collectGlobalTestAgentCoverageGaps, globalTestAgentFailureTypeLabel, scrubGlobalTestAgentEvidencePathText, collectGlobalTestAgentFailureItemsFromSource, collectGlobalTestAgentFailureItems, summarizeGlobalTestAgentFailureItem, summarizeGlobalTestAgentDiagnosticItem, collectGlobalTestAgentFailureSummaries, globalRunVisibleReply, getGlobalPetToolState, getGlobalToolDisplayName, buildGlobalAgentEventUi, relayGlobalPetEvent } = globalAgentTestAgentDisplay;
const { RANDOM_MUSIC_KEYWORD, hasExplicitGlobalWriteAuthorization, normalizeText, stripActionWords, parseMusicKeyword, findProjectName, findGroup, findAllProjectNames, resolveImplicitCurrentProject, findAllGroups, buildLocalDevelopmentTargets, hasExplicitDevelopmentExecutionIntent, chineseNumberToInt, normalizeCronHour, guessCronSchedule, inferLocalConversationFallback, inferLocalGlobalAction, createActionBlockSafeStreamer } = globalAgentLocalIntent;
const { loadGlobalAgentBridgeStore, saveGlobalAgentBridgeStore, createGlobalAgentBridgeRequest, waitForGlobalAgentBridgeResult, getRequestBaseUrl, callLocalApi, postLocalApi, parseSseApiEvents, parseSseApiEventBlock, postLocalSseOrJsonApi } = globalAgentBridge;
const { callLlm, shouldRetryGlobalModelError, callGlobalModelWithRetry, runGlobalModelRetrySelfTest } = globalAgentModel;
const GLOBAL_AGENT_HISTORY_FILE = path.join(utils_1.CCM_DIR, "global-agent-history.json");
const GLOBAL_AGENT_BRIDGE_FILE = path.join(utils_1.CCM_DIR, "global-agent-bridge.json");
const GLOBAL_AGENT_HISTORY_LIMIT = 80;
const GLOBAL_AGENT_SESSION_LIMIT = 30;
function writeGlobalJsonAtomic(file, value) {
    const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(2).toString("hex")}.tmp`;
    if (fs.existsSync(file)) {
        try {
            fs.copyFileSync(file, `${file}.bak`);
        }
        catch { }
    }
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
const globalAgentHistoryRuntime = (0, global_agent_history_1.createGlobalAgentHistoryRuntime)({
    GLOBAL_AGENT_HISTORY_FILE,
    GLOBAL_AGENT_HISTORY_LIMIT,
    GLOBAL_AGENT_SESSION_LIMIT,
    buildGlobalVisibleReplyContent: loop_1.buildGlobalVisibleReplyContent,
    generateSessionTitle: session_title_1.generateSessionTitleWithModel,
    ingestGlobalAgentConversation: memory_2.ingestGlobalAgentConversation,
    isMeaningfulSessionTitleInput: session_title_1.isMeaningfulSessionTitleInput,
    isSessionTitlePlaceholder: session_title_1.isSessionTitlePlaceholder,
    writeGlobalJsonAtomic,
});
function runGlobalAgentHistorySyncSelfTest() {
    return globalAgentHistoryRuntime.runGlobalAgentHistorySyncSelfTest();
}
function mergeGlobalAgentMessages(existing = [], incoming = []) {
    return globalAgentHistoryRuntime.mergeGlobalAgentMessages(existing, incoming);
}
function loadGlobalAgentHistoryStore() {
    return globalAgentHistoryRuntime.loadGlobalAgentHistoryStore();
}
function syncGlobalAgentWebHistory(payload) {
    return globalAgentHistoryRuntime.syncGlobalAgentWebHistory(payload);
}
function getGlobalAgentConversationMessages(sessionId) {
    return globalAgentHistoryRuntime.getGlobalAgentConversationMessages(sessionId);
}
function appendGlobalAgentConversationMessage(sessionId, role, content, source = "feishu") {
    return globalAgentHistoryRuntime.appendGlobalAgentConversationMessage(sessionId, role, content, source);
}
function resolveFeishuGlobalAgentSessionId(payload, store) {
    return globalAgentHistoryRuntime.resolveFeishuGlobalAgentSessionId(payload, store);
}
function runFeishuGlobalAgentSessionRoutingSelfTest() {
    return globalAgentHistoryRuntime.runFeishuGlobalAgentSessionRoutingSelfTest();
}
function getFeishuMessageId(payload) {
    return String(payload?.event?.message?.message_id
        || payload?.message_id
        || payload?.messageId
        || payload?.message?.id
        || payload?.header?.event_id
        || payload?.event_id
        || "").trim();
}
async function waitForIdempotencyResult(scope, key, timeoutMs = 10 * 60 * 1000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        const record = (0, reliability_ledger_1.getIdempotencyRecord)(scope, key);
        if (record?.status === "completed" || record?.status === "failed")
            return record;
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    return (0, reliability_ledger_1.getIdempotencyRecord)(scope, key);
}
const processedFeishuMessageIds = new Set();
const GLOBAL_MANAGEMENT_ACTIONS = {
    manage_cron: { label: "定时任务管理", operations: ["list", "create", "update", "enable", "disable", "run", "delete"], destructive: ["delete"] },
    manage_group: { label: "群聊与成员管理", operations: ["list", "create", "rename", "add_member", "remove_member", "delete"], destructive: ["delete"] },
    manage_project: { label: "项目与 Agent 管理", operations: ["list", "create", "update", "start", "stop", "delete"], destructive: ["delete"] },
    manage_task: { label: "开发任务管理", operations: ["list", "pause", "resume", "continue", "retry", "queue", "delete"], destructive: ["delete"] },
    manage_tool: { label: "MCP 与 Skill 管理", operations: ["list", "create", "delete", "reload", "status"], destructive: ["delete"] },
    system_status: { label: "系统状态检查", operations: ["inspect"], destructive: [] },
};
const GLOBAL_MANAGEMENT_REQUIRED_PARAMS = {
    manage_cron: {
        create: ["name", "schedule", "prompt"],
        update: ["id"],
        enable: ["id"],
        disable: ["id"],
        run: ["id"],
        delete: ["id"],
    },
    manage_group: {
        create: ["name"],
        rename: ["id", "name"],
        add_member: ["id", "project"],
        remove_member: ["id", "project"],
        delete: ["id"],
    },
    manage_project: {
        create: ["name", "work_dir"],
        update: ["project"],
        start: ["project"],
        stop: ["project"],
        delete: ["project"],
    },
    manage_task: {
        pause: ["id"],
        resume: ["id"],
        continue: ["id"],
        retry: ["id"],
        queue: ["id"],
        delete: ["id"],
    },
    manage_tool: {
        create: ["name"],
        delete: ["name"],
    },
};
const GLOBAL_AGENT_BOUNDARY = {
    layer: "global_agent",
    responsibility: "system intent routing, management actions, development mission fan-out",
};
function annotateGlobalAction(action) {
    if (!action || !action.type)
        return action;
    const spec = GLOBAL_MANAGEMENT_ACTIONS[action.type];
    if (!spec)
        return action;
    const operation = String(action.params?.operation || (action.type === "system_status" ? "inspect" : "")).trim().toLowerCase();
    if (!spec.operations.includes(operation))
        throw new Error(spec.label + " 不支持操作: " + (operation || "未填写"));
    const requiresConfirmation = spec.destructive.includes(operation);
    const params = { ...(action.params || {}), operation };
    if (action.type === "manage_task" && !params.id && params.task_id)
        params.id = params.task_id;
    if (action.type === "manage_group" && !params.id && params.group_id)
        params.id = params.group_id;
    if (action.type === "manage_project" && !params.project && params.name)
        params.project = params.name;
    const required = GLOBAL_MANAGEMENT_REQUIRED_PARAMS[action.type]?.[operation] || [];
    const missingParams = required.filter((key) => {
        const value = params[key];
        return value === undefined || value === null || String(value).trim() === "";
    });
    return {
        ...action,
        params,
        management: true,
        agentBoundary: GLOBAL_AGENT_BOUNDARY,
        capability: spec.label,
        risk: requiresConfirmation ? "high" : "normal",
        requires_confirmation: requiresConfirmation,
        validated: missingParams.length === 0,
        missing_params: missingParams,
        needs_user_input: missingParams.length > 0,
    };
}
function redactAuditValue(value, key = "") {
    if (/token|secret|password|api.?key/i.test(key))
        return "[REDACTED]";
    if (Array.isArray(value))
        return value.map(item => redactAuditValue(item));
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redactAuditValue(entryValue, entryKey)]));
    }
    return value;
}
function appendGlobalActionAudit(payload) {
    const record = {
        id: "ga-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        timestamp: new Date().toISOString(),
        action: redactAuditValue(payload.action || {}),
        status: payload.status || "unknown",
        result: redactAuditValue(payload.result || {}),
        session_id: payload.session_id || null,
        source: payload.source || null,
        sender_id: redactAuditValue(payload.sender_id || null, "sender_id"),
        message_id: payload.message_id || null,
    };
    fs.appendFileSync(path.join(utils_1.CCM_DIR, "global-agent-audit.jsonl"), JSON.stringify(record) + String.fromCharCode(10), "utf-8");
    return record;
}
const globalAgentTestAgentRelay = (0, global_agent_test_agent_relay_1.createGlobalAgentTestAgentRelay)({
    buildPostReviewSpotCheckSummary: post_review_spot_check_1.buildPostReviewSpotCheckSummary,
    collectGlobalTestAgentCoverageGaps,
    collectGlobalTestAgentFailureSummaries,
    globalUniqueStrings,
    globalVisibleText,
    summarizeTestAgentAdversarialEvidence: test_agent_review_bridge_1.summarizeTestAgentAdversarialEvidence,
    summarizeTestAgentBrowserActionEffects: test_agent_review_bridge_1.summarizeTestAgentBrowserActionEffects,
    summarizeTestAgentBrowserAuthentication: test_agent_review_bridge_1.summarizeTestAgentBrowserAuthentication,
    summarizeTestAgentBrowserFlows: test_agent_review_bridge_1.summarizeTestAgentBrowserFlows,
    summarizeTestAgentBrowserRecovery: test_agent_review_bridge_1.summarizeTestAgentBrowserRecovery,
    summarizeTestAgentMultiSessionBrowser: test_agent_review_bridge_1.summarizeTestAgentMultiSessionBrowser,
});
function compactGlobalTestAgentExecutionPlanRelayEvent(event = {}, options = {}) {
    return globalAgentTestAgentRelay.compactGlobalTestAgentExecutionPlanRelayEvent(event, options);
}
function compactGlobalTestAgentReviewRelayEvent(event = {}, options = {}) {
    return globalAgentTestAgentRelay.compactGlobalTestAgentReviewRelayEvent(event, options);
}
function relayGlobalTestAgentEventFromGroup(event = {}, options = {}) {
    return globalAgentTestAgentRelay.relayGlobalTestAgentEventFromGroup(event, options);
}
const globalAgentDirectDispatchRuntime = (0, global_agent_direct_dispatch_1.createGlobalAgentDirectDispatchRuntime)({
    buildSelfContainedWorkerHandoff: worker_handoff_1.buildSelfContainedWorkerHandoff,
    compactPetText,
    getConfigInfo: db_1.getConfigInfo,
    getConfigs: db_1.getConfigs,
    normalizeText,
    renderSelfContainedWorkerHandoff: worker_handoff_1.renderSelfContainedWorkerHandoff,
    sanitizeMainAgentUserText: display_1.sanitizeMainAgentUserText,
    summarizeWorkerHandoffForUser: worker_handoff_1.summarizeWorkerHandoffForUser,
});
const { GLOBAL_DIRECT_DISPATCH_INTERNAL_PATTERN, sanitizeGlobalDirectAgentOutput, formatGlobalDevelopmentDispatchVisibleResult, formatGlobalTaskDispatchVisibleResult, resolveGlobalDispatchProject, inferGlobalDirectDispatchRequiresCodeChanges, buildGlobalDirectDispatchHandoff, buildGlobalSingleProjectMissionPayload, renderGlobalDirectGroupWorkOrder, renderGlobalDirectProjectWorkOrder, renderGlobalDirectGroupDispatchAcceptedSummary, } = globalAgentDirectDispatchRuntime;
const globalAgentStatusRuntime = (0, global_agent_status_1.createGlobalAgentStatusRuntime)({
    collectGlobalTestAgentFailureItemsFromSource,
    getConfigs: db_1.getConfigs,
    getGlobalAgentRun: loop_1.getGlobalAgentRun,
    globalSafeArray,
    globalUniqueStrings,
    globalVisibleText,
    hasExplicitDevelopmentExecutionIntent,
    hasExplicitGlobalWriteAuthorization,
    listGlobalAgentRuns: loop_1.listGlobalAgentRuns,
    loadCronJobs: db_1.loadCronJobs,
    loadGroups: collaboration_1.loadGroups,
    loadTasks: db_1.loadTasks,
    normalizeText,
    refreshGlobalDevelopmentMissions: collaboration_1.refreshGlobalDevelopmentMissions,
    sanitizeGlobalDirectAgentOutput,
    scrubGlobalTestAgentEvidencePathText,
    summarizeGlobalTestAgentDiagnosticItem,
    summarizeGlobalTestAgentFailureItem,
});
function isGlobalProgressStatusRequest(message) {
    return globalAgentStatusRuntime.isGlobalProgressStatusRequest(message);
}
function formatMissionStatus(input = {}) {
    return globalAgentStatusRuntime.formatMissionStatus(input);
}
function formatSystemStatus() {
    return globalAgentStatusRuntime.formatSystemStatus();
}
const globalAgentFeishuActions = (0, global_agent_feishu_actions_1.createGlobalAgentFeishuActions)({
    GLOBAL_MANAGEMENT_ACTIONS,
    RANDOM_MUSIC_KEYWORD,
    buildGlobalDirectDispatchHandoff,
    buildGlobalSingleProjectMissionPayload,
    callLocalApi,
    formatGlobalDevelopmentDispatchVisibleResult,
    formatSystemStatus,
    getConfigs: db_1.getConfigs,
    guessCronSchedule,
    inferGlobalDirectDispatchRequiresCodeChanges,
    loadGroups: collaboration_1.loadGroups,
    normalizeText,
    parseMusicKeyword,
    postLocalApi,
    postLocalSseOrJsonApi,
    relayGlobalTestAgentEventFromGroup,
    renderGlobalDirectGroupDispatchAcceptedSummary,
    renderGlobalDirectGroupWorkOrder,
});
const { queueMusicPlayback, executePlayMusic, executeStopMusic, fillCronParams, executeFeishuManagementAction, executeFeishuAction } = globalAgentFeishuActions;
const globalAgentAgenticRuntime = (0, global_agent_agentic_runtime_1.createGlobalAgentAgenticRuntime)({
    GLOBAL_AGENT_TOOL_SPECS: loop_1.GLOBAL_AGENT_TOOL_SPECS,
    GLOBAL_MANAGEMENT_ACTIONS,
    GLOBAL_PET_AGENT_NAME,
    acquireIdempotency: reliability_ledger_1.acquireIdempotency,
    annotateGlobalAction,
    attachGlobalAgentRunSupervision: loop_1.attachGlobalAgentRunSupervision,
    bindFeishuIdentifiersFromValue: feishu_channel_1.bindFeishuIdentifiersFromValue,
    bindFeishuTaskContext: feishu_channel_1.bindFeishuTaskContext,
    buildGlobalAgentMemoryPacket: memory_2.buildGlobalAgentMemoryPacket,
    buildGlobalAgentSessionContinuation: memory_2.buildGlobalAgentSessionContinuation,
    buildGlobalSingleProjectMissionPayload,
    callGlobalModelWithRetry,
    compactGlobalAgentSessionWithModel: memory_2.compactGlobalAgentSessionWithModel,
    compactPetText,
    completeGlobalAgentSupervision: loop_1.completeGlobalAgentSupervision,
    completeIdempotency: reliability_ledger_1.completeIdempotency,
    continueGlobalAgentRunWithClarification: loop_1.continueGlobalAgentRunWithClarification,
    controlGlobalDevelopmentMission: collaboration_1.controlGlobalDevelopmentMission,
    controlGlobalMissionSupervisor: mission_supervisor_1.controlGlobalMissionSupervisor,
    createGlobalDevelopmentMission: collaboration_1.createGlobalDevelopmentMission,
    createRequirementEpicWithChildren: collaboration_1.createRequirementEpicWithChildren,
    executeFeishuAction,
    executePlayMusic,
    executeStopMusic,
    failIdempotency: reliability_ledger_1.failIdempotency,
    findClarifyingGlobalAgentRun: loop_1.findClarifyingGlobalAgentRun,
    formatGlobalMissionFinalReport: mission_supervisor_1.formatGlobalMissionFinalReport,
    getAgentQualityPolicy: quality_center_1.getAgentQualityPolicy,
    getConfigInfo: db_1.getConfigInfo,
    getConfigs: db_1.getConfigs,
    getGlobalAgentBackgroundOutput: runtime_1.getGlobalAgentBackgroundOutput,
    getGlobalAgentMemoryPolicy: memory_2.getGlobalAgentMemoryPolicy,
    getGlobalAgentRun: loop_1.getGlobalAgentRun,
    getGlobalDevelopmentMission: collaboration_1.getGlobalDevelopmentMission,
    getGlobalMissionSupervisor: mission_supervisor_1.getGlobalMissionSupervisor,
    getGlobalMissionSupervisorSchedulerStatus: mission_supervisor_1.getGlobalMissionSupervisorSchedulerStatus,
    globalRunVisibleReply,
    hasExplicitDevelopmentExecutionIntent,
    hasExplicitGlobalWriteAuthorization,
    inferLocalGlobalAction,
    ingestGlobalAgentConversation: memory_2.ingestGlobalAgentConversation,
    listGlobalAgentRuns: loop_1.listGlobalAgentRuns,
    listGlobalMissionSupervisors: mission_supervisor_1.listGlobalMissionSupervisors,
    listTaskAgentSessions: agent_sessions_1.listTaskAgentSessions,
    loadCronJobs: db_1.loadCronJobs,
    loadGlobalAgentHistoryStore,
    loadGlobalAgentHooks: runtime_1.loadGlobalAgentHooks,
    loadGlobalAgentMemory: memory_2.loadGlobalAgentMemory,
    loadGlobalAgentPermissionRules: runtime_1.loadGlobalAgentPermissionRules,
    loadGroups: collaboration_1.loadGroups,
    loadMcpTools: db_1.loadMcpTools,
    loadOrchestratorConfig: group_orchestrator_1.loadOrchestratorConfig,
    loadSkills: db_1.loadSkills,
    loadTasks: db_1.loadTasks,
    normalizeText,
    notifyFeishuTaskStage: feishu_channel_1.notifyFeishuTaskStage,
    postLocalApi,
    queryKnowledgeBase: rag_1.queryKnowledgeBase,
    recallGlobalAgentMemory: memory_2.recallGlobalAgentMemory,
    rebuildGlobalAgentMemory: memory_2.rebuildGlobalAgentMemory,
    recordGlobalAgentRuntimeOutput: runtime_1.recordGlobalAgentRuntimeOutput,
    recordGlobalMissionMemory: memory_2.recordGlobalMissionMemory,
    recordGlobalAgentSessionProviderUsage: memory_2.recordGlobalAgentSessionProviderUsage,
    recoverInterruptedGlobalAgentRuns: loop_1.recoverInterruptedGlobalAgentRuns,
    refreshGlobalDevelopmentMissions: collaboration_1.refreshGlobalDevelopmentMissions,
    renderGlobalGroupMemoryContextBundle: memory_1.renderGlobalGroupMemoryContextBundle,
    resumeGlobalAgentRun: loop_1.resumeGlobalAgentRun,
    sanitizeGlobalDirectAgentOutput,
    sendFeishuReportMessage: collaboration_1.sendFeishuReportMessage,
    setGlobalAgentMemoryPolicy: memory_2.setGlobalAgentMemoryPolicy,
    settleIdempotencyByTrace: reliability_ledger_1.settleIdempotencyByTrace,
    startGlobalAgentRun: loop_1.startGlobalAgentRun,
    startGlobalMissionSupervisor: mission_supervisor_1.startGlobalMissionSupervisor,
    startGlobalMissionSupervisorScheduler: mission_supervisor_1.startGlobalMissionSupervisorScheduler,
    stopGlobalMissionSupervisorScheduler: mission_supervisor_1.stopGlobalMissionSupervisorScheduler,
    superviseGlobalDevelopmentMissionCycle: collaboration_1.superviseGlobalDevelopmentMissionCycle,
    updateGlobalAgentSupervisionState: loop_1.updateGlobalAgentSupervisionState,
    waitForIdempotencyResult,
});
function localActionToAgenticDecision(localIntent, run) { return globalAgentAgenticRuntime.localActionToAgenticDecision(localIntent, run); }
const { createMissionSupervisorRuntime, createAgenticRuntime, runAgenticGlobalRequest } = globalAgentAgenticRuntime;
function verifyGlobalAgentContextBoundary(context = {}) { return globalAgentAgenticRuntime.verifyGlobalAgentContextBoundary(context); }
function buildGlobalAgentGroupMemoryModelContext(bundle, options = {}) { return globalAgentAgenticRuntime.buildGlobalAgentGroupMemoryModelContext(bundle, options); }
function buildAgenticContext(query = "", sessionId = "", options = {}) { return globalAgentAgenticRuntime.buildAgenticContext(query, sessionId, options); }
async function resumeGlobalAgentLoopsForServer(ctx, port) { return globalAgentAgenticRuntime.resumeGlobalAgentLoopsForServer(ctx, port); }
function startGlobalMissionSupervisionForServer(ctx) { return globalAgentAgenticRuntime.startGlobalMissionSupervisionForServer(ctx); }
function bootstrapGlobalAgentMemoryForServer() { return globalAgentAgenticRuntime.bootstrapGlobalAgentMemoryForServer(); }
function stopGlobalMissionSupervisionForServer() { return globalAgentAgenticRuntime.stopGlobalMissionSupervisionForServer(); }
function publicGlobalAgentRunSummary(run) {
    if (!run)
        return null;
    return {
        id: run.id,
        trace_id: run.trace_id,
        session_id: run.session_id,
        source: run.source,
        status: run.status,
        phase: run.phase,
        created_at: run.created_at,
        updated_at: run.updated_at,
        started_at: run.started_at || run.created_at,
        completed_at: run.completed_at,
        deadline_at: run.deadline_at,
        error: String(run.error || "").slice(0, 300),
        model_calls: run.model_calls,
        tool_calls: run.tool_calls,
        usage: run.usage || null,
        input_tokens: Number(run.input_tokens || run.usage?.inputTokens || 0) || 0,
        output_tokens: Number(run.output_tokens || run.usage?.outputTokens || 0) || 0,
        mission_id: run.mission_id || "",
        supervisor_id: run.supervisor_id || "",
        supervision_state: run.supervision_state || "",
        step_count: Array.isArray(run.steps) ? run.steps.length : 0,
        pending_tool: run.pending_tool
            ? { name: run.pending_tool.name, risk: run.pending_tool.risk, signature: run.pending_tool.signature }
            : null,
    };
}
function publicGlobalAgentRun(run, includeObservations = false) {
    if (!run)
        return null;
    const steps = includeObservations ? run.steps : run.steps.map((step) => {
        if (step.observation === undefined)
            return step;
        let serialized = "";
        try {
            serialized = JSON.stringify(step.observation);
        }
        catch {
            serialized = String(step.observation);
        }
        return serialized.length <= 4_000 ? step : { ...step, observation: { truncated: true, preview: serialized.slice(0, 4_000), original_chars: serialized.length } };
    });
    return {
        id: run.id,
        trace_id: run.trace_id,
        session_id: run.session_id,
        source: run.source,
        status: run.status,
        phase: run.phase,
        presentation: run.presentation || null,
        explicit_write_authorization: run.explicit_write_authorization,
        created_at: run.created_at,
        updated_at: run.updated_at,
        completed_at: run.completed_at,
        deadline_at: run.deadline_at,
        max_steps: run.max_steps,
        steps,
        pending_tool: run.pending_tool,
        final_reply: globalRunVisibleReply(run, GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK),
        error: run.error,
        resume_count: run.resume_count,
        model_calls: run.model_calls,
        tool_calls: run.tool_calls,
        usage: run.usage || null,
        input_tokens: Number(run.input_tokens || run.usage?.inputTokens || 0) || 0,
        output_tokens: Number(run.output_tokens || run.usage?.outputTokens || 0) || 0,
        client_effects: run.client_effects,
        mission_id: run.mission_id,
        supervisor_id: run.supervisor_id,
        supervision_state: run.supervision_state,
        final_delivery_report: run.final_delivery_report,
        final_report: run.final_report,
        source_ingestion: run.source_ingestion || null,
        source_attachments: run.source_attachments || [],
        requirement_extraction: run.requirement_extraction || null,
        requirement_decomposition: run.requirement_decomposition || null,
        requirement_content_hash: run.requirement_content_hash || "",
        display_stream: run.display_stream,
        displayStream: run.display_stream,
        workchain: run.workchain,
        todo_plan: run.todo_plan || run.todoPlan || run.workchain?.todo_plan || run.workchain?.todoPlan || null,
        todoPlan: run.todoPlan || run.todo_plan || run.workchain?.todoPlan || run.workchain?.todo_plan || null,
        decision_summary: run.decision_summary,
        clarification_question: run.clarification_question,
        clarification_summary: run.clarification_summary || run.clarificationSummary || null,
        clarificationSummary: run.clarification_summary || run.clarificationSummary || null,
        confirmation_summary: run.confirmation_summary || run.confirmationSummary || null,
        confirmationSummary: run.confirmation_summary || run.confirmationSummary || null,
        plan_mode: run.plan_mode || run.planMode || null,
        planMode: run.plan_mode || run.planMode || null,
        plan_accept_feedback: run.plan_accept_feedback || run.planAcceptFeedback || "",
        planAcceptFeedback: run.planAcceptFeedback || run.plan_accept_feedback || "",
        last_plan_accept_feedback: run.last_plan_accept_feedback || run.lastPlanAcceptFeedback || "",
        lastPlanAcceptFeedback: run.lastPlanAcceptFeedback || run.last_plan_accept_feedback || "",
        last_plan_accept_feedback_at: run.last_plan_accept_feedback_at || run.lastPlanAcceptFeedbackAt || "",
        lastPlanAcceptFeedbackAt: run.lastPlanAcceptFeedbackAt || run.last_plan_accept_feedback_at || "",
        resume_feedback: run.resume_feedback || run.resumeFeedback || "",
        resumeFeedback: run.resumeFeedback || run.resume_feedback || "",
        last_resume_feedback: run.last_resume_feedback || run.lastResumeFeedback || "",
        lastResumeFeedback: run.lastResumeFeedback || run.last_resume_feedback || "",
        last_resume_feedback_at: run.last_resume_feedback_at || run.lastResumeFeedbackAt || "",
        lastResumeFeedbackAt: run.lastResumeFeedbackAt || run.last_resume_feedback_at || "",
        resume_feedback_history: Array.isArray(run.resume_feedback_history) ? run.resume_feedback_history : Array.isArray(run.resumeFeedbackHistory) ? run.resumeFeedbackHistory : [],
        resumeFeedbackHistory: Array.isArray(run.resumeFeedbackHistory) ? run.resumeFeedbackHistory : Array.isArray(run.resume_feedback_history) ? run.resume_feedback_history : [],
        pending_user_messages: Array.isArray(run.pending_user_messages) ? run.pending_user_messages : Array.isArray(run.pendingUserMessages) ? run.pendingUserMessages : [],
        pendingUserMessages: Array.isArray(run.pendingUserMessages) ? run.pendingUserMessages : Array.isArray(run.pending_user_messages) ? run.pending_user_messages : [],
        user_steer_history: Array.isArray(run.user_steer_history) ? run.user_steer_history : Array.isArray(run.userSteerHistory) ? run.userSteerHistory : [],
        userSteerHistory: Array.isArray(run.userSteerHistory) ? run.userSteerHistory : Array.isArray(run.user_steer_history) ? run.user_steer_history : [],
        last_user_steer: run.last_user_steer || run.lastUserSteer || null,
        lastUserSteer: run.lastUserSteer || run.last_user_steer || null,
        test_agent_execution_plan: run.test_agent_execution_plan || run.testAgentExecutionPlan || null,
        testAgentExecutionPlan: run.testAgentExecutionPlan || run.test_agent_execution_plan || null,
        test_agent_execution_plan_summary: run.test_agent_execution_plan_summary || run.testAgentExecutionPlanSummary || null,
        testAgentExecutionPlanSummary: run.testAgentExecutionPlanSummary || run.test_agent_execution_plan_summary || null,
        test_agent_execution_plan_detail: run.test_agent_execution_plan_detail || run.testAgentExecutionPlanDetail || "",
        testAgentExecutionPlanDetail: run.testAgentExecutionPlanDetail || run.test_agent_execution_plan_detail || "",
        test_agent_review_summary: run.test_agent_review_summary || run.testAgentReviewSummary || run.independent_review_summary || run.independentReviewSummary || null,
        testAgentReviewSummary: run.testAgentReviewSummary || run.test_agent_review_summary || run.independentReviewSummary || run.independent_review_summary || null,
        independent_review_summary: run.independent_review_summary || run.independentReviewSummary || run.test_agent_review_summary || run.testAgentReviewSummary || null,
        independentReviewSummary: run.independentReviewSummary || run.independent_review_summary || run.testAgentReviewSummary || run.test_agent_review_summary || null,
        post_review_spot_check: run.post_review_spot_check || run.postReviewSpotCheck || null,
        postReviewSpotCheck: run.postReviewSpotCheck || run.post_review_spot_check || null,
        post_review_spot_check_summary: run.post_review_spot_check_summary || run.postReviewSpotCheckSummary || null,
        postReviewSpotCheckSummary: run.postReviewSpotCheckSummary || run.post_review_spot_check_summary || null,
        independent_review: Array.isArray(run.independent_review) ? run.independent_review : Array.isArray(run.independentReview) ? run.independentReview : [],
        independentReview: Array.isArray(run.independentReview) ? run.independentReview : Array.isArray(run.independent_review) ? run.independent_review : [],
        test_agent_report: run.test_agent_report || run.testAgentReport || null,
        testAgentReport: run.testAgentReport || run.test_agent_report || null,
        shadow_mode: run.shadow_mode,
        original_user_message: run.original_user_message,
        reasoning_loop: run.reasoning_loop,
        runtime_debug: (0, runtime_1.buildGlobalAgentSessionDebug)(run),
    };
}
function buildPublicGlobalStatusRun(input) {
    const now = new Date().toISOString();
    const displayStream = {
        schema: "ccm-global-status-summary-v1",
        user_visible_text: input.reply,
        technical_details: [],
        display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: true },
    };
    return {
        id: `global-status-${crypto.randomBytes(5).toString("hex")}`,
        trace_id: (0, reliability_ledger_1.ensureTraceId)(input.traceId, "global-status"),
        session_id: input.sessionId,
        source: input.source,
        status: "completed",
        phase: "complete",
        explicit_write_authorization: false,
        created_at: now,
        updated_at: now,
        completed_at: now,
        deadline_at: now,
        max_steps: 1,
        steps: [{
                index: 1,
                at: now,
                state: "answer",
                message: input.reply,
                plan: [],
                decision: { intent: { category: "question", action_required: false, reason: "用户询问当前任务进展，直接读取已有状态摘要。" } },
            }],
        pending_tool: null,
        final_reply: input.reply,
        error: "",
        resume_count: 0,
        model_calls: 0,
        tool_calls: 0,
        client_effects: [],
        mission_id: "",
        supervisor_id: "",
        supervision_state: "",
        final_delivery_report: null,
        final_report: null,
        display_stream: displayStream,
        displayStream,
        workchain: null,
        decision_summary: { intent: { category: "question", action_required: false, confidence: 0.99, reason: "用户询问当前任务进展。" } },
        clarification_question: "",
        shadow_mode: false,
        original_user_message: input.message,
        reasoning_loop: null,
        runtime_debug: { technical_details: [] },
    };
}
const globalAgentFeishuChannel = (0, global_agent_feishu_channel_1.createGlobalAgentFeishuChannel)({
    GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK,
    appendGlobalActionAudit,
    appendGlobalAgentConversationMessage,
    appendTraceEvent: reliability_ledger_1.appendTraceEvent,
    bindFeishuIdentifiersFromValue: feishu_channel_1.bindFeishuIdentifiersFromValue,
    bindFeishuTaskContext: feishu_channel_1.bindFeishuTaskContext,
    cancelGlobalAgentRun: loop_1.cancelGlobalAgentRun,
    conversationTurnControl: conversation_turn_control_1.conversationTurnControl,
    createAgenticRuntime,
    ensureTraceId: reliability_ledger_1.ensureTraceId,
    feishuRuntimeEventPresentation: feishu_channel_1.feishuRuntimeEventPresentation,
    findWaitingGlobalAgentRun: loop_1.findWaitingGlobalAgentRun,
    formatMissionStatus,
    getConfigs: db_1.getConfigs,
    getFeishuMessageId,
    getGlobalAgentConversationMessages,
    getGlobalAgentRun: loop_1.getGlobalAgentRun,
    getGlobalDevelopmentMission: collaboration_1.getGlobalDevelopmentMission,
    globalRunVisibleReply,
    isGlobalProgressStatusRequest,
    listGlobalAgentRuns: loop_1.listGlobalAgentRuns,
    loadGroups: collaboration_1.loadGroups,
    notifyFeishuTaskStage: feishu_channel_1.notifyFeishuTaskStage,
    recordFeishuInbound: feishu_channel_1.recordFeishuInbound,
    resolveFeishuGlobalAgentSessionId,
    resumeGlobalAgentRun: loop_1.resumeGlobalAgentRun,
    runAgenticGlobalRequest,
    sendFeishuReportMessage: collaboration_1.sendFeishuReportMessage,
    steerGlobalAgentRun: loop_1.steerGlobalAgentRun,
});
const { normalizeFeishuEventPayload, verifyFeishuEventToken, extractFeishuMessageText, extractCcConnectHookText, processFeishuGlobalAgentMessage, processFeishuControlledMessage } = globalAgentFeishuChannel;
function parseFeishuConversationTurnCommand(value) { return globalAgentFeishuChannel.parseFeishuConversationTurnCommand(value); }
function startFeishuConversationTurnRecoveryForServer(baseUrl, ctx) { return globalAgentFeishuChannel.startFeishuConversationTurnRecoveryForServer(baseUrl, ctx); }
function stopFeishuConversationTurnRecoveryForServer() { return globalAgentFeishuChannel.stopFeishuConversationTurnRecoveryForServer(); }
function runFeishuConversationTurnCommandSelfTest() { return globalAgentFeishuChannel.runFeishuConversationTurnCommandSelfTest(); }
const globalAgentApi = (0, global_agent_api_1.createGlobalAgentApi)({
    GLOBAL_AGENT_TOOL_SPECS: loop_1.GLOBAL_AGENT_TOOL_SPECS,
    GLOBAL_AGENT_VISIBLE_RESULT_FALLBACK,
    GLOBAL_MANAGEMENT_ACTIONS,
    GLOBAL_MANAGEMENT_REQUIRED_PARAMS,
    GLOBAL_PET_AGENT_NAME,
    acquireIdempotency: reliability_ledger_1.acquireIdempotency,
    appendGlobalActionAudit,
    applyGlobalAgentSupervisionSteer: loop_1.applyGlobalAgentSupervisionSteer,
    buildAgentQualitySnapshot: quality_center_1.buildAgentQualitySnapshot,
    buildAgenticContext,
    buildGlobalAgentEventUi,
    buildGlobalAgentGroupMemoryModelContext,
    buildGlobalAgentSessionDebug: runtime_1.buildGlobalAgentSessionDebug,
    buildGlobalAgentToolDefinitions: runtime_1.buildGlobalAgentToolDefinitions,
    buildGlobalControlCenterSnapshot: control_center_1.buildGlobalControlCenterSnapshot,
    buildGlobalDispatchStrategy: control_center_1.buildGlobalDispatchStrategy,
    buildGlobalGroupMemoryContext: memory_1.buildGlobalGroupMemoryContext,
    buildGlobalSystemHealth: control_center_1.buildGlobalSystemHealth,
    buildPublicGlobalStatusRun,
    buildTraceReplaySuite: runtime_kernel_1.buildTraceReplaySuite,
    buildUploadedFilesContext: utils_1.buildUploadedFilesContext,
    callLlm,
    cancelGlobalAgentRun: loop_1.cancelGlobalAgentRun,
    checkGlobalMissionSupervisorNow: mission_supervisor_1.checkGlobalMissionSupervisorNow,
    classifyGlobalAgentUserSteer: loop_1.classifyGlobalAgentUserSteer,
    classifyGlobalControlIntent: control_center_1.classifyGlobalControlIntent,
    collectRequestBuffer: utils_1.collectRequestBuffer,
    compactGlobalAgentSessionWithModel: memory_2.compactGlobalAgentSessionWithModel,
    completeGlobalAgentSupervision: loop_1.completeGlobalAgentSupervision,
    completeIdempotency: reliability_ledger_1.completeIdempotency,
    controlGlobalMissionSupervisor: mission_supervisor_1.controlGlobalMissionSupervisor,
    createAgenticRuntime,
    createGlobalDevelopmentMission: collaboration_1.createGlobalDevelopmentMission,
    createRequirementEpicWithChildren: collaboration_1.createRequirementEpicWithChildren,
    createMissionSupervisorRuntime,
    deleteGlobalAgentHook: runtime_1.deleteGlobalAgentHook,
    deleteGlobalAgentPermissionRule: runtime_1.deleteGlobalAgentPermissionRule,
    ensureTraceId: reliability_ledger_1.ensureTraceId,
    extractCcConnectHookText,
    extractFeishuMessageText,
    failIdempotency: reliability_ledger_1.failIdempotency,
    formatMissionStatus,
    getAgentQualityPolicy: quality_center_1.getAgentQualityPolicy,
    getConfigInfo: db_1.getConfigInfo,
    getConfigs: db_1.getConfigs,
    getFeishuMessageId,
    getGlobalAgentBackgroundOutput: runtime_1.getGlobalAgentBackgroundOutput,
    getGlobalAgentRun: loop_1.getGlobalAgentRun,
    getGlobalDevelopmentMission: collaboration_1.getGlobalDevelopmentMission,
    getGlobalMissionSupervisor: mission_supervisor_1.getGlobalMissionSupervisor,
    getGlobalMissionSupervisorSchedulerStatus: mission_supervisor_1.getGlobalMissionSupervisorSchedulerStatus,
    getIdempotencyRecord: reliability_ledger_1.getIdempotencyRecord,
    getMultipartBoundary: utils_1.getMultipartBoundary,
    getRequestBaseUrl,
    globalRunVisibleReply,
    ingestGlobalAgentConversation: memory_2.ingestGlobalAgentConversation,
    buildGlobalAgentSessionContinuation: memory_2.buildGlobalAgentSessionContinuation,
    recordGlobalAgentSessionProviderUsage: memory_2.recordGlobalAgentSessionProviderUsage,
    ingestRequirementSources: source_ingestion_1.ingestRequirementSources,
    isGlobalProgressStatusRequest,
    listGlobalAgentRuns: loop_1.listGlobalAgentRuns,
    listGlobalMissionSupervisors: mission_supervisor_1.listGlobalMissionSupervisors,
    listTaskAgentSessions: agent_sessions_1.listTaskAgentSessions,
    loadFeishuConfig: db_1.loadFeishuConfig,
    loadGlobalAgentHooks: runtime_1.loadGlobalAgentHooks,
    loadGlobalAgentPermissionRules: runtime_1.loadGlobalAgentPermissionRules,
    loadGlobalAgentBridgeStore,
    loadGlobalAgentHistoryStore,
    loadGroups: collaboration_1.loadGroups,
    loadOrchestratorConfig: group_orchestrator_1.loadOrchestratorConfig,
    loadTasks: db_1.loadTasks,
    normalizeFeishuEventPayload,
    parseMultipart: utils_1.parseMultipart,
    pauseGlobalAgentRun: loop_1.pauseGlobalAgentRun,
    processedFeishuMessageIds,
    processFeishuControlledMessage,
    publicGlobalAgentRun,
    publicGlobalAgentRunSummary,
    refreshGlobalDevelopmentMissions: collaboration_1.refreshGlobalDevelopmentMissions,
    relayGlobalPetEvent,
    replayAgentTrace: runtime_kernel_1.replayAgentTrace,
    resolveFeishuDestination: feishu_channel_1.resolveFeishuDestination,
    resolveFeishuGlobalAgentSessionId,
    resumeGlobalAgentRun: loop_1.resumeGlobalAgentRun,
    runAgentQualityCenterSelfTest: quality_center_1.runAgentQualityCenterSelfTest,
    runAgentReasoningLoopSelfTest: reasoning_loop_1.runAgentReasoningLoopSelfTest,
    runAgentRuntimeKernelSelfTest: runtime_kernel_1.runAgentRuntimeKernelSelfTest,
    runGlobalAgentLoopSelfTest: loop_1.runGlobalAgentLoopSelfTest,
    runGlobalAgentRuntimeSelfTest: runtime_1.runGlobalAgentRuntimeSelfTest,
    runGlobalControlCenterSelfTest: control_center_1.runGlobalControlCenterSelfTest,
    runGlobalGroupMemoryContextSelfTest: memory_1.runGlobalGroupMemoryContextSelfTest,
    runGlobalMissionSupervisorAsyncSelfTest: mission_supervisor_1.runGlobalMissionSupervisorAsyncSelfTest,
    runGlobalMissionSupervisorSelfTest: mission_supervisor_1.runGlobalMissionSupervisorSelfTest,
    runAgenticGlobalRequest,
    saveGlobalAgentBridgeStore,
    saveGlobalAgentHook: runtime_1.saveGlobalAgentHook,
    saveGlobalAgentPermissionRule: runtime_1.saveGlobalAgentPermissionRule,
    sendFeishuReportMessage: collaboration_1.sendFeishuReportMessage,
    sendJson: utils_1.sendJson,
    setAgentQualityPolicy: quality_center_1.setAgentQualityPolicy,
    startGlobalMissionSupervisor: mission_supervisor_1.startGlobalMissionSupervisor,
    steerGlobalAgentRun: loop_1.steerGlobalAgentRun,
    syncGlobalAgentWebHistory,
    updateGlobalAgentSupervisionState: loop_1.updateGlobalAgentSupervisionState,
    verifyFeishuEventToken,
    waitForIdempotencyResult,
});
function handleGlobalAgentApi(pathname, req, res, parsed, ctx) {
    return globalAgentApi.handleGlobalAgentApi(pathname, req, res, parsed, ctx);
}
exports.runGlobalAgentIntentSelfTest = (0, global_agent_self_tests_1.createGlobalAgentIntentSelfTest)({ GLOBAL_AGENT_HISTORY_LIMIT, GLOBAL_DIRECT_DISPATCH_INTERNAL_PATTERN, buildGlobalAgentEventUi, buildGlobalAgentGroupMemoryModelContext, buildGlobalDirectDispatchHandoff, buildGlobalSingleProjectMissionPayload, compactGlobalTestAgentReviewRelayEvent, createActionBlockSafeStreamer, formatGlobalDevelopmentDispatchVisibleResult, formatGlobalTaskDispatchVisibleResult, formatMissionStatus, hasExplicitGlobalWriteAuthorization, inferLocalGlobalAction, isGlobalProgressStatusRequest, localActionToAgenticDecision, mergeGlobalAgentMessages, renderGlobalDirectGroupDispatchAcceptedSummary, renderGlobalDirectGroupWorkOrder, renderGlobalDirectProjectWorkOrder });
var global_agent_local_intent_1 = require("./global-agent-local-intent");
Object.defineProperty(exports, "inferLocalGlobalAction", { enumerable: true, get: function () { return global_agent_local_intent_1.inferLocalGlobalAction; } });
Object.defineProperty(exports, "hasExplicitGlobalWriteAuthorization", { enumerable: true, get: function () { return global_agent_local_intent_1.hasExplicitGlobalWriteAuthorization; } });
var global_agent_model_1 = require("./global-agent-model");
Object.defineProperty(exports, "callLlm", { enumerable: true, get: function () { return global_agent_model_1.callLlm; } });
Object.defineProperty(exports, "callGlobalModelWithRetry", { enumerable: true, get: function () { return global_agent_model_1.callGlobalModelWithRetry; } });
Object.defineProperty(exports, "runGlobalModelRetrySelfTest", { enumerable: true, get: function () { return global_agent_model_1.runGlobalModelRetrySelfTest; } });
var global_agent_test_agent_display_1 = require("./global-agent-test-agent-display");
Object.defineProperty(exports, "buildGlobalAgentEventUi", { enumerable: true, get: function () { return global_agent_test_agent_display_1.buildGlobalAgentEventUi; } });
var global_agent_bridge_1 = require("./global-agent-bridge");
Object.defineProperty(exports, "loadGlobalAgentBridgeStore", { enumerable: true, get: function () { return global_agent_bridge_1.loadGlobalAgentBridgeStore; } });
Object.defineProperty(exports, "saveGlobalAgentBridgeStore", { enumerable: true, get: function () { return global_agent_bridge_1.saveGlobalAgentBridgeStore; } });
Object.defineProperty(exports, "createGlobalAgentBridgeRequest", { enumerable: true, get: function () { return global_agent_bridge_1.createGlobalAgentBridgeRequest; } });
Object.defineProperty(exports, "waitForGlobalAgentBridgeResult", { enumerable: true, get: function () { return global_agent_bridge_1.waitForGlobalAgentBridgeResult; } });
Object.defineProperty(exports, "getRequestBaseUrl", { enumerable: true, get: function () { return global_agent_bridge_1.getRequestBaseUrl; } });
Object.defineProperty(exports, "callLocalApi", { enumerable: true, get: function () { return global_agent_bridge_1.callLocalApi; } });
Object.defineProperty(exports, "postLocalApi", { enumerable: true, get: function () { return global_agent_bridge_1.postLocalApi; } });
Object.defineProperty(exports, "postLocalSseOrJsonApi", { enumerable: true, get: function () { return global_agent_bridge_1.postLocalSseOrJsonApi; } });
//# sourceMappingURL=global-agent.js.map