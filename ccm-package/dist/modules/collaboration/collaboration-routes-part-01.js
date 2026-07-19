"use strict";
// Behavior-freeze split from collaboration-routes.ts (part 1/4).
// Extracted functional module. The original entry remains a compatibility facade.
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
exports.configureCollaborationRouteExecutors = configureCollaborationRouteExecutors;
exports.handleCollaborationApiReplayAndExecutionRoutes = handleCollaborationApiReplayAndExecutionRoutes;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const requirement_epic_self_tests_1 = require("../requirements/requirement-epic-self-tests");
const db_1 = require("../../core/db");
const group_orchestrator_1 = require("./group-orchestrator");
const group_session_memory_model_extraction_1 = require("./group-session-memory-model-extraction");
const group_memory_index_1 = require("./group-memory-index");
const logs_1 = require("./logs");
const test_agent_runner_1 = require("./test-agent-runner");
const task_replay_1 = require("./task-replay");
const storage_1 = require("./storage");
const runtime_1 = require("../../agents/runtime");
const execution_kernel_1 = require("../../agents/execution-kernel");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const collaboration_resilience_1 = require("./collaboration-resilience");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const reliability_drills_1 = require("../../system/reliability-drills");
const soak_test_1 = require("../../system/soak-test");
const process_lifecycle_1 = require("../../system/process-lifecycle");
const collaboration_1 = require("./collaboration");
function configureCollaborationRouteExecutors(ctx) {
    (0, group_session_memory_model_extraction_1.configureGroupSessionMemoryModelExecutor)(async (request) => {
        const group = (0, storage_1.loadGroups)().find((item) => String(item?.id || "") === String(request.groupId || ""));
        if (!group)
            throw new Error("session_memory_model_group_not_found");
        const coordinator = (0, group_orchestrator_1.getCoordinatorMember)(group);
        const candidates = [coordinator, ...(0, group_orchestrator_1.getRoutableMembers)(group)].filter(Boolean);
        const configs = (0, db_1.getConfigs)();
        let selected = null;
        let config = null;
        for (const candidate of candidates) {
            const match = configs.find((item) => item.name === candidate.project);
            if (match) {
                selected = candidate;
                config = match;
                break;
            }
        }
        if (!selected || !config)
            throw new Error("session_memory_model_executor_not_configured");
        const info = (0, db_1.getConfigInfo)(config.path);
        const agentType = String(info[0]?.agent || selected.agent || "claudecode");
        const sandbox = path.join(utils_1.CCM_DIR, "session-memory-extractor-sandbox", String(request.scopeId || "session").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 180));
        fs.mkdirSync(sandbox, { recursive: true });
        let executionMetadata = {};
        const output = await ctx.callAgent(selected.project, request.prompt, sandbox, agentType, 120_000, {
            tab: "groups",
            groupId: request.groupId,
            group_session_id: request.groupSessionId,
            taskId: request.executionId,
            executionId: request.executionId,
            title: "Session Memory background extraction",
            background: true,
            skipIndependentVerification: true,
            allowedTools: [],
            maxOutputBytes: 1024 * 1024,
            maxContextOutputBytes: 512 * 1024,
            onDone: (metadata) => { executionMetadata = metadata || {}; },
        });
        if (/^\[[^\]]+\]\s+Agent(?:\s+Runner)?\s+(?:错误|响应超时)/i.test(String(output || "").trim())) {
            throw new Error(`session_memory_model_executor_failed:${String(output || "").slice(0, 300)}`);
        }
        if (executionMetadata?.fileChanges?.count > 0) {
            throw new Error("session_memory_model_executor_modified_sandbox");
        }
        return {
            output,
            project: selected.project,
            agentType,
            nativeSessionId: String(executionMetadata.nativeSessionId || ""),
            model: String(executionMetadata.nativeModelCapabilityReceipt?.model || executionMetadata.nativeModelCapabilityRecord?.entry?.model || ""),
        };
    });
    (0, group_memory_index_1.configureGroupTypedMemoryManifestSelector)(async (request) => {
        const group = (0, storage_1.loadGroups)().find((item) => String(item?.id || "") === String(request.groupId || ""));
        if (!group)
            throw new Error("typed_memory_manifest_selector_group_not_found");
        const coordinator = (0, group_orchestrator_1.getCoordinatorMember)(group);
        const candidates = [coordinator, ...(0, group_orchestrator_1.getRoutableMembers)(group)].filter(Boolean);
        const configs = (0, db_1.getConfigs)();
        let selected = null;
        let config = null;
        for (const candidate of candidates) {
            const match = configs.find((item) => item.name === candidate.project);
            if (!match)
                continue;
            selected = candidate;
            config = match;
            break;
        }
        if (!selected || !config)
            throw new Error("typed_memory_manifest_selector_executor_not_configured");
        const info = (0, db_1.getConfigInfo)(config.path);
        const agentType = String(info[0]?.agent || selected.agent || "claudecode");
        const sandbox = path.join(utils_1.CCM_DIR, "memory-manifest-selector-sandbox", String(request.scopeId || "session").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 180));
        fs.mkdirSync(sandbox, { recursive: true });
        let executionMetadata = {};
        const prompt = [
            String(request.systemPrompt || ""),
            "",
            String(request.userPrompt || ""),
            "",
            "Return only one JSON object matching this schema: {\"selected_memories\":[\"filename.md\"]}. Do not use tools, inspect files, or modify the workspace.",
        ].join("\n");
        const output = await ctx.callAgent(selected.project, prompt, sandbox, agentType, 120_000, {
            tab: "groups",
            groupId: request.groupId,
            group_session_id: request.groupSessionId,
            taskId: request.requestId,
            executionId: request.requestId,
            title: "Typed Memory manifest selection",
            background: true,
            skipIndependentVerification: true,
            allowedTools: [],
            maxOutputBytes: 64 * 1024,
            maxContextOutputBytes: 64 * 1024,
            onDone: (metadata) => { executionMetadata = metadata || {}; },
        });
        if (/^\[[^\]]+\]\s+Agent(?:\s+Runner)?\s+(?:错误|响应超时)/i.test(String(output || "").trim())) {
            throw new Error(`typed_memory_manifest_selector_failed:${String(output || "").slice(0, 300)}`);
        }
        if (executionMetadata?.fileChanges?.count > 0)
            throw new Error("typed_memory_manifest_selector_modified_sandbox");
        return {
            output,
            project: selected.project,
            agentType,
            nativeSessionId: String(executionMetadata.nativeSessionId || ""),
            model: String(executionMetadata.nativeModelCapabilityReceipt?.model || executionMetadata.nativeModelCapabilityRecord?.entry?.model || ""),
        };
    });
}
function handleCollaborationApiReplayAndExecutionRoutes(pathname, req, res, parsed, ctx) {
    if (pathname === "/api/tasks/replay/artifact" && req.method === "GET") {
        const taskId = String(parsed.query.task_id || parsed.query.taskId || "").trim();
        const runId = String(parsed.query.run_id || parsed.query.runId || "").trim();
        const artifactId = String(parsed.query.artifact_id || parsed.query.artifactId || "").trim();
        if (!taskId || !runId || !artifactId) {
            (0, utils_1.sendJson)(res, { error: "缺少任务、运行或证据 ID" }, 400);
            return true;
        }
        const artifact = (0, task_replay_1.resolveTaskReplayArtifact)({ taskId, runId, artifactId });
        if (!artifact) {
            (0, utils_1.sendJson)(res, { error: "证据不存在、已过期或不属于该任务" }, 404);
            return true;
        }
        try {
            const stat = fs.statSync(artifact.file_path);
            const disposition = artifact.preview_kind === "download" ? "attachment" : "inline";
            const fileName = path.basename(artifact.file_name).replace(/[\r\n"\\]/g, "_");
            res.writeHead(200, {
                "Content-Type": artifact.mime_type,
                "Content-Length": stat.size,
                "Content-Disposition": `${disposition}; filename="${fileName}"`,
                "Cache-Control": "private, no-store",
                "X-Content-Type-Options": "nosniff",
            });
            const stream = fs.createReadStream(artifact.file_path);
            stream.on("error", () => { if (!res.writableEnded)
                res.end(); });
            stream.pipe(res);
        }
        catch {
            if (!res.headersSent)
                (0, utils_1.sendJson)(res, { error: "证据暂时无法读取" }, 500);
            else if (!res.writableEnded)
                res.end();
        }
        return true;
    }
    if (pathname === "/api/tasks/replay" && req.method === "GET") {
        const taskId = String(parsed.query.id || parsed.query.task_id || parsed.query.taskId || "").trim();
        if (!taskId) {
            const limit = Math.max(1, Math.min(100, Number(parsed.query.limit || 40)));
            (0, utils_1.sendJson)(res, { success: true, index: (0, task_replay_1.buildTaskReplayIndex)(limit) });
            return true;
        }
        const replay = (0, task_replay_1.buildCompleteTaskReplay)(taskId);
        if (!replay) {
            (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
            return true;
        }
        (0, utils_1.sendJson)(res, { success: true, replay });
        return true;
    }
    if (pathname === "/api/tasks/replay/self-test" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, self_test: (0, task_replay_1.runTaskReplayContractSelfTest)() });
        return true;
    }
    if (pathname === "/api/tasks/entity-chain" && req.method === "GET") {
        const taskId = String(parsed.query.id || parsed.query.task_id || parsed.query.taskId || "");
        if (!taskId) {
            (0, utils_1.sendJson)(res, { error: "缺少任务 ID" }, 400);
            return true;
        }
        const chain = (0, collaboration_1.buildTaskEntityChain)(taskId);
        if (!chain) {
            (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
            return true;
        }
        (0, utils_1.sendJson)(res, { success: true, chain });
        return true;
    }
    if (pathname === "/api/tasks/execution-dashboard" && req.method === "GET") {
        const limit = Math.max(1, Math.min(50, Number(parsed.query.limit || 12)));
        (0, utils_1.sendJson)(res, (0, collaboration_1.buildExecutionDashboard)(limit));
        return true;
    }
    if (pathname === "/api/tasks/executions" && req.method === "GET") {
        const executionId = String(parsed.query.execution_id || parsed.query.executionId || "");
        const taskId = String(parsed.query.task_id || parsed.query.taskId || "");
        (0, utils_1.sendJson)(res, { success: true, execution: executionId ? (0, execution_kernel_1.loadExecution)(executionId) : null, executions: executionId ? [] : (0, execution_kernel_1.listExecutions)(taskId ? { taskId } : {}) });
        return true;
    }
    if (pathname === "/api/tasks/native-sessions" && req.method === "GET") {
        const taskId = String(parsed.query.task_id || parsed.query.taskId || "");
        if (!taskId) {
            (0, utils_1.sendJson)(res, { error: "缺少任务 ID" }, 400);
            return true;
        }
        const sessions = (0, agent_sessions_1.listTaskAgentSessions)({ taskId }).map(session => ({ ...session, continuity: (0, agent_sessions_1.getTaskAgentSessionContinuity)(session) }));
        (0, utils_1.sendJson)(res, { success: true, task_id: taskId, sessions });
        return true;
    }
    if (pathname === "/api/orchestrator/resilience" && req.method === "GET") {
        const runtimes = (0, runtime_1.getPublicAgentRuntimes)().map(runtime => ({ id: runtime.id, label: runtime.label, available: (0, collaboration_resilience_1.isRuntimeCommandAvailable)(runtime.id), sessionResume: runtime.capabilities.sessionResume }));
        (0, utils_1.sendJson)(res, { success: true, self_test: (0, collaboration_resilience_1.runCollaborationResilienceSelfTest)(), runtimes });
        return true;
    }
    if (pathname === "/api/reliability/traces" && req.method === "GET") {
        const traceId = String(parsed.query.id || parsed.query.trace_id || "").trim();
        const taskId = String(parsed.query.task_id || "").trim();
        if (traceId) {
            const trace = (0, reliability_ledger_1.getTrace)(traceId);
            if (!trace)
                return (0, utils_1.sendJson)(res, { success: false, error: "Trace 不存在" }, 404);
            (0, utils_1.sendJson)(res, { success: true, trace });
            return true;
        }
        const traces = (0, reliability_ledger_1.listTraces)(Number(parsed.query.limit || 50)).filter((trace) => !taskId || trace.task_id === taskId || trace.events?.some((event) => event.task_id === taskId));
        (0, utils_1.sendJson)(res, { success: true, traces });
        return true;
    }
    if (pathname === "/api/reliability/self-test" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, result: (0, reliability_ledger_1.runReliabilityLedgerSelfTest)() });
        return true;
    }
    if (pathname === "/api/reliability/drills/run" && req.method === "POST") {
        try {
            const outcome = (0, reliability_drills_1.runScheduledProductionReliabilityDrill)({ force: true });
            const result = outcome.result;
            (0, utils_1.sendJson)(res, { success: result.pass, result }, result.pass ? 200 : 500);
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error.message || String(error) }, 500);
        }
        return true;
    }
    if (pathname === "/api/reliability/drills/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, status: (0, reliability_drills_1.getReliabilityDrillStatus)() });
        return true;
    }
    if (pathname === "/api/reliability/soak/status" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, state: (0, soak_test_1.getSoakTestStatus)(), report: (0, soak_test_1.getSoakReport)() });
        return true;
    }
    if (pathname === "/api/reliability/process-lifecycle" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, ...(0, process_lifecycle_1.getProcessLifecycleSnapshot)({ limit: Number(parsed.query?.limit || 5000), event_limit: Number(parsed.query?.event_limit || 100) }) });
        return true;
    }
    if (pathname === "/api/reliability/process-lifecycle/self-test" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, self_test: (0, process_lifecycle_1.runProcessLifecycleSelfTest)() });
        return true;
    }
    if (pathname === "/api/reliability/debt" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, debt: (0, soak_test_1.inspectReliabilityDebt)() });
        return true;
    }
    if (pathname === "/api/reliability/debt/reconcile" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = (0, soak_test_1.reconcileStabilityDebt)(payload.reason || "用户启动生产级稳定性验收前清理历史债务");
                (0, utils_1.sendJson)(res, { success: result.pass, result }, result.pass ? 200 : 409);
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/reliability/restart-intent" && req.method === "POST") {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", () => {
            try {
                (0, utils_1.sendJson)(res, { success: true, intent: (0, process_lifecycle_1.registerRestartIntent)(body ? JSON.parse(body) : {}) });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/reliability/soak/self-test" && req.method === "GET") {
        (0, utils_1.sendJson)(res, { success: true, result: (0, soak_test_1.runSoakTestSelfTest)() });
        return true;
    }
    if (["/api/reliability/soak/start", "/api/reliability/soak/stop", "/api/reliability/soak/sample"].includes(pathname) && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                if (pathname.endsWith("/start"))
                    (0, utils_1.sendJson)(res, { success: true, ...(await (0, soak_test_1.startSoakTest)(payload)) });
                else if (pathname.endsWith("/stop"))
                    (0, utils_1.sendJson)(res, { success: true, state: (0, soak_test_1.stopSoakTest)(payload.reason || "用户停止浸泡测试") });
                else
                    (0, utils_1.sendJson)(res, { success: true, state: await (0, soak_test_1.sampleSoakTestNow)() });
            }
            catch (error) {
                (0, utils_1.sendJson)(res, { success: false, error: error.message || String(error) }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/execution-kernel/self-test" && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, { success: true, ...(0, execution_kernel_1.runExecutionKernelSelfTest)() });
        }
        catch (e) {
            (0, utils_1.sendJson)(res, { success: false, error: e.message }, 500);
        }
        return true;
    }
    if (pathname === "/api/tasks/rollback" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const taskId = String(payload.task_id || payload.taskId || payload.id || "");
                if (!taskId)
                    return (0, utils_1.sendJson)(res, { error: "缺少任务 ID" }, 400);
                const task = (0, db_1.loadTasks)().find((item) => item.id === taskId);
                if (!task)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                if (collaboration_1.runningTaskIds.has(taskId))
                    return (0, utils_1.sendJson)(res, { error: "任务仍在执行，请先停止后再撤销" }, 409);
                const checkpointIds = (0, collaboration_1.uniqueStrings)((0, execution_kernel_1.listExecutions)({ taskId }).flatMap((item) => item.checkpointIds || [])).reverse();
                if (!checkpointIds.length)
                    return (0, utils_1.sendJson)(res, { error: "该任务没有可用的安全检查点" }, 409);
                const reason = (0, collaboration_1.compactFormText)(payload.reason, "用户安全撤销任务改动");
                const rollbacks = checkpointIds.map((checkpointId) => (0, execution_kernel_1.rollbackExecutionCheckpoint)(checkpointId, reason, { allowShared: true }));
                const now = new Date().toISOString();
                const summary = { ...(task.delivery_summary || {}), headline: "最近一轮改动已安全撤销", acceptance_gate_passed: false, reverted: true, reverted_at: now };
                const updated = (0, collaboration_1.updateTask)(taskId, { status: "cancelled", auto_execute: false, rolled_back_at: now, rollback_reason: reason, rollback_results: rollbacks, status_detail: "已安全撤销到任务开始前", delivery_summary: summary });
                (0, agent_sessions_1.closeTaskAgentSessions)({ taskId }, "用户安全撤销任务改动");
                (0, collaboration_1.updateGroupTaskInlineStatus)(updated || task, "cancelled", "已安全撤销到任务开始前");
                (0, logs_1.appendTaskTimelineEvent)(taskId, { type: "task_rollback", title: "安全撤销完成", detail: `已恢复 ${rollbacks.length} 个检查点`, status: "ok", phase: "cancelled", data: { checkpoint_ids: checkpointIds } });
                (0, logs_1.addTaskLog)(taskId, "warning", `安全撤销完成：恢复 ${rollbacks.length} 个检查点`);
                (0, utils_1.sendJson)(res, { success: true, task: updated, rollbacks });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 409);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/cancel" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const taskId = String(payload.task_id || payload.taskId || payload.id || "");
                if (!taskId)
                    return (0, utils_1.sendJson)(res, { error: "缺少任务 ID" }, 400);
                const task = (0, db_1.loadTasks)().find((item) => item.id === taskId);
                if (!task)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                if (task.status === "done")
                    return (0, utils_1.sendJson)(res, { error: "已完成任务不能取消" }, 409);
                for (const queue of collaboration_1.taskQueues.values()) {
                    let index = queue.indexOf(taskId);
                    while (index >= 0) {
                        queue.splice(index, 1);
                        index = queue.indexOf(taskId);
                    }
                }
                const reason = (0, collaboration_1.compactFormText)(payload.reason, "用户主动停止任务");
                const cancellation = (0, execution_kernel_1.requestTaskCancellation)(taskId, reason, String(payload.actor || "local-user"));
                const testAgentRunsCancelled = (0, test_agent_runner_1.cancelTestAgentRunsForTask)(taskId, reason);
                const isRunning = collaboration_1.runningTaskIds.has(taskId);
                const sessions = (0, agent_sessions_1.closeTaskAgentSessions)({ taskId }, "用户取消任务，关闭任务级原生会话");
                const idempotencySettled = task.trace_id ? (0, reliability_ledger_1.settleIdempotencyByTrace)(task.trace_id, "failed", { cancelled: true, task_id: taskId, reason }) : [];
                const worktrees = [];
                for (const execution of (0, execution_kernel_1.listExecutions)({ taskId })) {
                    if (execution.workspace?.mode !== "worktree" || execution.workspace?.cleanedAt)
                        continue;
                    try {
                        worktrees.push({ execution_id: execution.id, ...(0, execution_kernel_1.cleanupExecutionWorktree)(execution.id, true) });
                    }
                    catch (error) {
                        worktrees.push({ execution_id: execution.id, success: false, error: error.message });
                    }
                }
                const updated = (0, collaboration_1.updateTask)(taskId, { status: isRunning ? "in_progress" : "cancelled", auto_execute: false, is_paused: true, paused: true, status_detail: isRunning ? "取消请求已发送，正在终止 Agent 进程" : "任务已取消", cancellation_requested_at: new Date().toISOString(), cancellation_reason: reason, cancellation_cleanup: { sessions_closed: sessions.length, test_agent_runs_cancelled: testAgentRunsCancelled.length, idempotency_settled: Array.isArray(idempotencySettled) ? idempotencySettled.length : Number(idempotencySettled || 0), worktrees }, ...(isRunning ? {} : { cancelled_at: new Date().toISOString() }) });
                if (!isRunning) {
                    (0, reliability_ledger_1.releaseTaskLease)(taskId, "cancelled");
                    (0, execution_kernel_1.clearTaskCancellation)(taskId);
                }
                (0, collaboration_1.updateGroupTaskInlineStatus)(updated || task, isRunning ? "in_progress" : "cancelled", isRunning ? "正在终止 Agent 进程" : "任务已取消");
                (0, logs_1.addTaskLog)(taskId, "warning", isRunning ? "已发送取消请求，正在终止 Agent 进程树" : "已从队列移除并取消任务");
                await ctx.onTaskStatusChange?.(updated || task, isRunning ? "cancelling" : "cancelled", reason);
                (0, utils_1.sendJson)(res, { success: true, task: updated, running: isRunning, cancellation, cleanup: updated?.cancellation_cleanup, queue_status: (0, collaboration_1.getQueueStatus)() });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (["/api/tasks/execution/rollback", "/api/tasks/execution/merge", "/api/tasks/execution/cleanup"].includes(pathname) && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                let result;
                if (pathname.endsWith("/rollback"))
                    result = (0, execution_kernel_1.rollbackExecutionCheckpoint)(String(payload.checkpoint_id || payload.checkpointId || ""), String(payload.reason || ""), { allowShared: payload.allow_shared === true || payload.allowShared === true });
                else if (pathname.endsWith("/merge"))
                    result = (0, execution_kernel_1.mergeExecutionWorktree)(String(payload.execution_id || payload.executionId || ""), { force: !!payload.force, commit: payload.commit !== false, message: payload.message || "" });
                else
                    result = (0, execution_kernel_1.cleanupExecutionWorktree)(String(payload.execution_id || payload.executionId || ""), !!payload.force);
                const executionId = String(payload.execution_id || payload.executionId || result?.executionId || "");
                const executionRecord = executionId ? (0, execution_kernel_1.loadExecution)(executionId) : null;
                const task = executionRecord?.taskId ? (0, db_1.loadTasks)().find((item) => item.id === executionRecord.taskId) : null;
                if (task?.trace_id) {
                    const action = pathname.endsWith("/merge") ? "merge" : pathname.endsWith("/rollback") ? "rollback" : "cleanup";
                    (0, reliability_ledger_1.appendTraceEvent)(task.trace_id, { id: `execution:${executionId}:${action}:${result?.mergeCommit || result?.rolledBackAt || result?.cleanedAt || "done"}`, type: `execution.${action}`, status: "ok", task_id: task.id, group_id: task.group_id || "", agent: executionRecord?.project || "", message: result?.duplicate ? `${action} 重复请求已复用原结果` : `${action} 操作完成`, data: result });
                }
                (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 409);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/execution/checkpoint" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const executionId = String(payload.execution_id || payload.executionId || "").trim();
                if (!executionId)
                    return (0, utils_1.sendJson)(res, { error: "缺少 Execution ID" }, 400);
                const execution = (0, execution_kernel_1.loadExecution)(executionId);
                if (!execution)
                    return (0, utils_1.sendJson)(res, { error: "执行记录不存在" }, 404);
                const workDir = String(execution.workspace?.worktreePath || execution.workspace?.workDir || execution.packet?.workDir || "").trim();
                if (!workDir || !fs.existsSync(workDir))
                    return (0, utils_1.sendJson)(res, { error: "执行工作目录不存在" }, 409);
                const checkpoint = (0, execution_kernel_1.createExecutionCheckpoint)({ executionId, taskId: execution.taskId, workDir, mode: execution.workspace?.mode || execution.packet?.isolation?.mode || "shared", label: String(payload.label || "用户检查点") });
                if (execution.taskId) {
                    const task = (0, db_1.loadTasks)().find((item) => item.id === execution.taskId);
                    if (task?.trace_id)
                        (0, reliability_ledger_1.appendTraceEvent)(task.trace_id, { type: "execution.checkpoint", status: "ok", task_id: task.id, agent: execution.project, message: `已创建检查点 ${checkpoint.id}`, data: { execution_id: executionId, checkpoint_id: checkpoint.id } });
                }
                (0, utils_1.sendJson)(res, { success: true, checkpoint });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 409);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks" && req.method === "GET") {
        const includeArchived = String(parsed.query.include_archived || parsed.query.includeArchived || "") === "true";
        const onlyArchived = String(parsed.query.archived || "") === "true";
        const allTasks = (0, db_1.loadTasks)();
        const tasks = onlyArchived
            ? allTasks.filter((task) => task.archived || task.deleted_at)
            : includeArchived ? allTasks : allTasks.filter((task) => !task.archived && !task.deleted_at);
        (0, utils_1.sendJson)(res, { tasks, archived_count: allTasks.filter((task) => task.archived || task.deleted_at).length });
        return true;
    }
    if (pathname === "/api/tasks/requirement-epic/self-test" && req.method === "GET") {
        try {
            (0, utils_1.sendJson)(res, (0, requirement_epic_self_tests_1.runRequirementEpicSelfTest)());
        }
        catch (error) {
            (0, utils_1.sendJson)(res, { success: false, error: error?.message || String(error) }, 500);
        }
        return true;
    }
    if (pathname === "/api/tasks/requirement-epic/metrics" && req.method === "GET") {
        const tasks = (0, db_1.loadTasks)();
        const epics = tasks.filter((task) => task.workflow_type === "requirement_epic");
        const epicIds = new Set(epics.map((task) => task.id));
        const children = tasks.filter((task) => epicIds.has(task.parent_task_id));
        const durations = epics
            .filter((task) => task.completed_at && task.created_at)
            .map((task) => Math.max(0, Date.parse(task.completed_at) - Date.parse(task.created_at)))
            .filter(Number.isFinite);
        const byStatus = (rows) => rows.reduce((result, row) => {
            const status = String(row.status || "unknown");
            result[status] = Number(result[status] || 0) + 1;
            return result;
        }, {});
        (0, utils_1.sendJson)(res, {
            success: true,
            schema: "ccm-requirement-epic-metrics-v1",
            generated_at: new Date().toISOString(),
            epics: {
                total: epics.length,
                by_status: byStatus(epics),
                awaiting_confirmation: epics.filter((task) => task.intake_state === "awaiting_confirmation").length,
                awaiting_change_review: epics.filter((task) => task.status === "awaiting_change_review").length,
                versioned: epics.filter((task) => Number(task.requirement_version || 1) > 1).length,
                average_completion_ms: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0,
            },
            children: {
                total: children.length,
                by_status: byStatus(children),
                dependency_waiting: children.filter((task) => task.status === "pending" && Array.isArray(task.mission_dependencies) && task.mission_dependencies.length > 0).length,
                reworked: children.filter((task) => Number(task.retry_count || 0) > 0 || Number(task.requirement_version || 1) > 1).length,
            },
        });
        return true;
    }
    return false;
}
//# sourceMappingURL=collaboration-routes-part-01.js.map