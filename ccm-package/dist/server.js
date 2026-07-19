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
const child_process_1 = require("child_process");
const tool_manager_1 = require("./tools/tool-manager");
const tool_call_loop_1 = require("./tools/tool-call-loop");
const runtime_1 = require("./agents/runtime");
const provider_tool_access_evidence_1 = require("./agents/provider-tool-access-evidence");
const native_continuation_1 = require("./agents/native-continuation");
const provider_memory_channel_1 = require("./agents/provider-memory-channel");
const memory_context_consumption_receipt_1 = require("./integrations/memory-context-consumption-receipt");
const memory_context_consumption_recovery_1 = require("./integrations/memory-context-consumption-recovery");
const model_capability_cache_1 = require("./modules/collaboration/model-capability-cache");
const agent_sessions_1 = require("./tasks/agent-sessions");
const runtime_tool_sync_1 = require("./tools/runtime-tool-sync");
const tool_authorization_1 = require("./tools/tool-authorization");
const runtime_tool_real_cli_matrix_1 = require("./tools/runtime-tool-real-cli-matrix");
const execution_kernel_1 = require("./agents/execution-kernel");
const memory_1 = require("./projects/memory");
const direct_dispatch_spool_1 = require("./agents/direct-dispatch-spool");
const conversation_turn_control_1 = require("./agents/conversation-turn-control");
// 导入底座与持久层
const utils_1 = require("./core/utils");
const db_1 = require("./core/db");
const server_instance_lock_1 = require("./core/server-instance-lock");
const task_store_1 = require("./core/task-store");
// 导入子模块控制器
const projects_1 = require("./modules/projects/projects");
const project_chat_intent_1 = require("./modules/projects/project-chat-intent");
const sessions_1 = require("./modules/projects/sessions");
const conversation_search_1 = require("./modules/search/conversation-search");
const git_1 = require("./modules/tools/git");
const marketplace_1 = require("./modules/tools/marketplace");
const templates_1 = require("./modules/templates/templates");
const cron_1 = require("./modules/scheduling/cron");
const tools_1 = require("./modules/tools/tools");
const terminal_1 = require("./modules/tools/terminal");
const pets_1 = require("./modules/pets/pets");
const pet_activity_coordinator_1 = require("./modules/pets/pet-activity-coordinator");
const pet_generation_1 = require("./modules/pets/pet-generation");
const music_1 = require("./modules/music/music");
const collaboration_1 = require("./modules/collaboration/collaboration");
const storage_1 = require("./modules/collaboration/storage");
const group_session_lifecycle_head_1 = require("./modules/collaboration/group-session-lifecycle-head");
const feishu_channel_1 = require("./modules/collaboration/feishu-channel");
const group_session_maintenance_1 = require("./modules/collaboration/group-session-maintenance");
const memory_2 = require("./modules/collaboration/memory");
const group_memory_index_1 = require("./modules/collaboration/group-memory-index");
const task_agent_invocation_lineage_1 = require("./tasks/task-agent-invocation-lineage");
const task_agent_continuation_soak_1 = require("./tasks/task-agent-continuation-soak");
const reliability_drills_1 = require("./system/reliability-drills");
const soak_test_1 = require("./system/soak-test");
const process_lifecycle_1 = require("./system/process-lifecycle");
const session_compaction_hooks_1 = require("./system/session-compaction-hooks");
const global_agent_1 = require("./modules/global/global-agent");
const rag_1 = require("./modules/knowledge/rag");
const slash_commands_1 = require("./modules/tools/slash-commands");
const credential_store_1 = require("./core/credential-store");
const usability_1 = require("./modules/system/usability");
const settings_1 = require("./modules/system/settings");
const role_skills_1 = require("./skills/role-skills");
const chat_runs_1 = require("./projects/chat-runs");
const cleanup_center_1 = require("./system/cleanup-center");
const sessions_2 = require("./modules/projects/sessions");
const project_session_agent_binding_1 = require("./modules/projects/project-session-agent-binding");
const project_session_compaction_1 = require("./modules/projects/project-session-compaction");
const server_pet_activity_1 = require("./server-pet-activity");
const server_agent_runner_1 = require("./server-agent-runner");
const server_static_1 = require("./server-static");
const server_bootstrap_1 = require("./server-bootstrap");
// === 运行时内存状态与心跳推送 ===
let PORT = 3080;
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
    setPetGenerationLifecycleNotifier: pet_generation_1.setPetGenerationLifecycleNotifier,
    url
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
    // CORS 头支持
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }
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
        getSessions: sessions_2.getSessions,
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
                });
                (0, utils_1.sendJson)(res, result, result.success === false ? 400 : 200);
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 400);
            }
        });
        return;
    }
    // === 流式发送消息给 Agent（SSE）===
    if (pathname === "/api/send-stream" && req.method === "POST") {
        const contentType = req.headers["content-type"] || "";
        const handleStreamSend = async (project, message, files = [], parentRunId = "", projectSessionId = "") => {
            const finalMessage = files && files.length > 0
                ? `${message || ""}${(0, utils_1.buildUploadedFilesContext)(files, "本次消息附件")}`
                : (message || "");
            if (!project || !finalMessage.trim())
                return (0, utils_1.sendJson)(res, { error: "参数不足" }, 400);
            const configs = (0, db_1.getConfigs)();
            const config = configs.find(c => c.name === project);
            if (!config)
                return (0, utils_1.sendJson)(res, { error: "项目不存在" }, 400);
            const exactProjectSessionId = String(projectSessionId || "").trim();
            if (exactProjectSessionId && !(0, sessions_2.getSessionDetail)(project, exactProjectSessionId)) {
                return (0, utils_1.sendJson)(res, { error: "项目会话不存在" }, 404);
            }
            if (exactProjectSessionId && parentRunId) {
                const parentRun = chat_runs_1.projectChatRuns.get(String(parentRunId));
                if (!parentRun)
                    return (0, utils_1.sendJson)(res, { error: "续跑来源不存在" }, 404);
                if (String(parentRun.project || "") !== project || String(parentRun.project_session_id || "") !== exactProjectSessionId) {
                    return (0, utils_1.sendJson)(res, { error: "续跑来源不属于当前项目会话" }, 409);
                }
            }
            const info = (0, db_1.getConfigInfo)(config.path);
            const workDir = info[0]?.workDir;
            const configuredAgentType = info[0]?.agent || "claudecode";
            const resolvedRuntime = (0, runtime_1.resolveAvailableAgentRuntime)(configuredAgentType);
            const agentType = resolvedRuntime.selected;
            let chatIntent;
            try {
                chatIntent = await (0, project_chat_intent_1.classifyProjectChatIntentWithModel)(message, files, { forceTask: !!parentRunId, project });
            }
            catch (error) {
                return (0, utils_1.sendJson)(res, {
                    success: false,
                    error: `统一大模型无法形成可靠工作流决策，本轮未启动项目 Agent：${error?.message || error}`,
                }, 503);
            }
            const toolContext = buildProjectToolContext(project, workDir, agentType);
            if (toolContext.dispatchGate?.dispatchReady === false)
                return sendRuntimeToolDispatchBlocked(res, toolContext);
            if (resolvedRuntime.switched) {
                toolContext.workEvent.text = `${project} 执行器自动切换：配置为 ${resolvedRuntime.preferred}，当前可用执行器为 ${agentType}；候选链 ${resolvedRuntime.chain.join(" → ")}`;
                toolContext.workEvent.runtimeFallback = resolvedRuntime;
            }
            if (exactProjectSessionId) {
                try {
                    const compaction = await (0, project_session_compaction_1.compactProjectSessionWithModel)(project, exactProjectSessionId, {
                        reason: "auto_model",
                        currentRequest: finalMessage,
                        fixedContext: { project, workDir, agentType, runtimePrompt: toolContext.prompt },
                        tools: { allowedTools: toolContext.allowedTools, runtimeToolSnapshot: toolContext.runtimeToolSnapshot },
                        provider: agentType,
                    });
                    if (compaction?.reason === "circuit_breaker") {
                        return (0, utils_1.sendJson)(res, { error: "项目会话记忆压缩已熔断，本轮未启动第三方 Agent", consecutive_failures: compaction.consecutive_failures || 3 }, 503);
                    }
                }
                catch (error) {
                    return (0, utils_1.sendJson)(res, { error: `项目会话自动压缩失败，本轮未启动第三方 Agent：${error?.message || error}` }, 503);
                }
            }
            const fullMessage = `${toolContext.prompt}\n\n${finalMessage}`;
            const projectSessionContext = exactProjectSessionId ? (0, project_session_compaction_1.buildProjectSessionPostCompactContext)(project, exactProjectSessionId, agentType) : "";
            const dispatchLease = exactProjectSessionId ? (0, project_session_agent_binding_1.acquireProjectSessionAgentDispatch)(project, exactProjectSessionId) : { acquired: true, scopeId: "" };
            const dispatchScope = dispatchLease.scopeId;
            if (!dispatchLease.acquired) {
                return (0, utils_1.sendJson)(res, { error: "当前项目会话已有 Agent 工作正在执行，请排队或等待本轮完成" }, 409);
            }
            let released = false;
            const releaseDispatch = () => {
                if (released || !dispatchScope)
                    return;
                released = true;
                (0, project_session_agent_binding_1.releaseProjectSessionAgentDispatch)(dispatchScope);
            };
            res.once?.("finish", releaseDispatch);
            res.once?.("close", releaseDispatch);
            try {
                callAgentStream(project, fullMessage, workDir, agentType, res, {
                    allowedTools: toolContext.allowedTools,
                    mcpConfigPath: toolContext.audit.mcpConfigPath,
                    runtimeToolSnapshot: toolContext.runtimeToolSnapshot,
                    runtimeToolDispatchGate: toolContext.dispatchGate,
                    initialWorkEvents: [toolContext.workEvent],
                    userMessage: finalMessage,
                    parentRunId,
                    projectSessionId: exactProjectSessionId,
                    projectSessionContext,
                    messageMode: chatIntent.mode,
                    workflowDecision: chatIntent.workflowDecision,
                });
            }
            catch (error) {
                releaseDispatch();
                throw error;
            }
        };
        if (contentType.includes("multipart/form-data")) {
            (0, utils_1.collectRequestBuffer)(req).then((buffer) => {
                try {
                    const boundary = (0, utils_1.getMultipartBoundary)(contentType);
                    if (!boundary)
                        return (0, utils_1.sendJson)(res, { error: "无效请求" }, 400);
                    const { files, fields } = (0, utils_1.parseMultipart)(buffer, boundary);
                    void handleStreamSend(fields.project, fields.message, files, String(fields.parent_run_id || fields.parentRunId || ""), String(fields.session_id || fields.sessionId || ""));
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
                const { project, message, parent_run_id, parentRunId, session_id, sessionId } = JSON.parse(body);
                void handleStreamSend(project, message, [], String(parent_run_id || parentRunId || ""), String(session_id || sessionId || ""));
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
            const promptWithTools = `${toolContext.prompt}\n\n${fullMessage}`;
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
            const chunks = [];
            req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            req.on("end", async () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    const boundary = (0, utils_1.getMultipartBoundary)(contentType);
                    if (!boundary)
                        return (0, utils_1.sendJson)(res, { error: "无效请求" }, 400);
                    const { files, fields } = (0, utils_1.parseMultipart)(buffer, boundary);
                    await handleSend(fields.project, fields.message, files);
                }
                catch (e) {
                    (0, utils_1.sendJson)(res, { error: e.message }, 400);
                }
            });
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
    if ((0, templates_1.handleTemplatesApi)(pathname, req, res, parsed))
        return;
    if ((0, cron_1.handleCronApi)(pathname, req, res, parsed, collabCtx))
        return;
    if ((0, tools_1.handleToolsAndMetricsApi)(pathname, req, res, parsed))
        return;
    if ((0, pets_1.handlePetsApi)(pathname, req, res, parsed, petsCtx))
        return;
    if ((0, music_1.handleMusicApi)(pathname, req, res, parsed, musicCtx))
        return;
    if ((0, collaboration_1.handleCollaborationApi)(pathname, req, res, parsed, collabCtx))
        return;
    if ((0, global_agent_1.handleGlobalAgentApi)(pathname, req, res, parsed, collabCtx))
        return;
    if ((0, rag_1.handleRagApi)(pathname, req, res, parsed))
        return;
    if ((0, slash_commands_1.handleSlashCommandsApi)(pathname, req, res, parsed))
        return;
    if ((0, usability_1.handleUsabilityApi)(pathname, req, res))
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
        reconcileTaskAgentContinuationSoak: task_agent_continuation_soak_1.reconcileTaskAgentContinuationSoak,
        reconcileTaskAgentInvocationRecovery: task_agent_invocation_lineage_1.reconcileTaskAgentInvocationRecovery,
        recoverChildTypedMemoryDispatchWal: memory_2.recoverChildTypedMemoryDispatchWal,
        recoverGroupTypedMemoryArtifactTransactionsFleet: group_memory_index_1.recoverGroupTypedMemoryArtifactTransactionsFleet,
        recoverPetGenerationJobs: pet_generation_1.recoverPetGenerationJobs,
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
function startServer(port) {
    PORT = port;
    const instanceLock = (0, server_instance_lock_1.acquireCcmServerInstanceLock)(port);
    const startupCollabCtx = createCollabCtx();
    const server = http.createServer(handleRequest);
    server.on("error", () => (0, server_instance_lock_1.releaseCcmServerInstanceLock)(instanceLock));
    server.on("close", () => {
        (0, terminal_1.stopAllTerminalRuns)();
        (0, cron_1.stopCronScheduler)();
        (0, collaboration_1.stopTaskWatchdog)();
        (0, collaboration_1.stopAgentRecoveryMonitor)();
        (0, global_agent_1.stopGlobalMissionSupervisionForServer)();
        (0, global_agent_1.stopFeishuConversationTurnRecoveryForServer)();
        (0, reliability_drills_1.stopReliabilityDrillScheduler)();
        (0, usability_1.stopUsabilityArchiveScheduler)();
        (0, group_session_maintenance_1.stopGroupSessionRetentionMaintenanceScheduler)();
        (0, model_capability_cache_1.stopModelCapabilityRefreshScheduler)();
        (0, runtime_tool_real_cli_matrix_1.stopRuntimeToolRealCliMatrixScheduler)();
        (0, soak_test_1.shutdownSoakMonitor)();
        (0, task_store_1.closeSqliteTaskStore)();
        (0, server_instance_lock_1.releaseCcmServerInstanceLock)(instanceLock);
    });
    server.listen(port, () => {
        // Port ownership and the data-directory lock are the fail-closed singleton
        // gates. No mutable startup work may run before both have succeeded.
        bootstrapServerRuntime(startupCollabCtx, port);
        (0, model_capability_cache_1.startModelCapabilityRefreshScheduler)();
        (0, runtime_tool_real_cli_matrix_1.startRuntimeToolRealCliMatrixScheduler)();
        console.log(`\n╔══════════════════════════════════════╗`);
        console.log(`║     ccm Web 控制台                    ║`);
        console.log(`╚══════════════════════════════════════╝\n`);
        console.log(`  地址: http://localhost:${port}`);
        console.log(`  按 Ctrl+C 停止\n`);
        void (0, global_agent_1.resumeGlobalAgentLoopsForServer)(startupCollabCtx, port)
            .then(result => {
            if (result.total > 0)
                console.log(`[全局 Agent] 启动恢复 ${result.resumed}/${result.total} 个运行`);
        })
            .catch(error => console.warn(`[全局 Agent] 启动恢复失败：${error?.message || error}`))
            .finally(() => (0, global_agent_1.startFeishuConversationTurnRecoveryForServer)(`http://127.0.0.1:${port}`, startupCollabCtx));
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
    });
    process.once("exit", () => (0, server_instance_lock_1.releaseCcmServerInstanceLock)(instanceLock));
    return server;
}
if (require.main === module) {
    PORT = parseInt(process.argv[2]) || 3080;
    (0, process_lifecycle_1.installProcessLifecycleFaultHandlers)();
    const server = startServer(PORT);
    let lifecycleHeartbeat = null;
    server.prependOnceListener("listening", () => {
        (0, process_lifecycle_1.initializeProcessLifecycle)();
        lifecycleHeartbeat = setInterval(() => (0, process_lifecycle_1.touchProcessLifecycle)(), 30_000);
        lifecycleHeartbeat.unref?.();
    });
    let shuttingDown = false;
    const shutdown = (signal) => {
        if (shuttingDown)
            return;
        shuttingDown = true;
        if (lifecycleHeartbeat)
            clearInterval(lifecycleHeartbeat);
        (0, process_lifecycle_1.markProcessShutdown)({ category: "system_shutdown", reason: `收到 ${signal}，执行受控退出`, signal, exit_code: 0 });
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 5_000).unref?.();
    };
    process.once("SIGINT", () => shutdown("SIGINT"));
    process.once("SIGTERM", () => shutdown("SIGTERM"));
    process.once("exit", code => (0, process_lifecycle_1.markProcessShutdown)({ category: code === 0 ? "system_shutdown" : "unexpected_crash", reason: `进程退出，exit code ${code}`, exit_code: code }));
}
module.exports = { startServer };
//# sourceMappingURL=server.js.map