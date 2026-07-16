"use strict";
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
exports.handleCollaborationApi = handleCollaborationApi;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("../../core/utils");
const source_ingestion_1 = require("../requirements/source-ingestion");
const db_1 = require("../../core/db");
const group_orchestrator_1 = require("./group-orchestrator");
const memory_1 = require("./memory");
const group_session_memory_model_extraction_1 = require("./group-session-memory-model-extraction");
const group_memory_index_1 = require("./group-memory-index");
const feishu_routes_1 = require("./feishu-routes");
const agent_qa_routes_1 = require("./agent-qa-routes");
const memory_context_consumption_receipt_1 = require("../../integrations/memory-context-consumption-receipt");
const group_coordination_store_1 = require("./group-coordination-store");
const group_live_routes_1 = require("./group-live-routes");
const agent_qa_service_1 = require("./agent-qa-service");
const agent_receipts_1 = require("./agent-receipts");
const logs_1 = require("./logs");
const group_routes_1 = require("./group-routes");
const orchestrator_routes_1 = require("./orchestrator-routes");
const task_governance_routes_1 = require("./task-governance-routes");
const test_agent_runner_1 = require("./test-agent-runner");
const task_replay_1 = require("./task-replay");
const storage_1 = require("./storage");
const daily_dev_backlog_1 = require("./daily-dev-backlog");
const runtime_1 = require("../../agents/runtime");
const execution_kernel_1 = require("../../agents/execution-kernel");
const agent_sessions_1 = require("../../tasks/agent-sessions");
const task_agent_invocation_lineage_1 = require("../../tasks/task-agent-invocation-lineage");
const collaboration_resilience_1 = require("./collaboration-resilience");
const reliability_ledger_1 = require("../../system/reliability-ledger");
const reliability_drills_1 = require("../../system/reliability-drills");
const soak_test_1 = require("../../system/soak-test");
const process_lifecycle_1 = require("../../system/process-lifecycle");
const collaboration_protocol_1 = require("../../agents/collaboration-protocol");
const runtime_kernel_1 = require("../../agents/runtime-kernel");
const worker_handoff_1 = require("../../agents/worker-handoff");
const work_items_1 = require("../../agents/work-items");
const collaboration_1 = require("./collaboration");
function handleCollaborationApi(pathname, req, res, parsed, ctx) {
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
    if (pathname === "/api/usability/intake/preview" && req.method === "POST") {
        const handleIntakePreview = async (payload, files = []) => {
            try {
                const userRequirement = (0, collaboration_1.compactFormText)(payload.requirement || payload.goal || payload.message, "");
                const sourceIngestion = await (0, source_ingestion_1.ingestRequirementSources)({ files, userText: userRequirement, extractRequirement: true });
                const extractedRequirement = sourceIngestion.requirement;
                const requirement = (0, collaboration_1.compactFormText)(extractedRequirement?.business_goal || userRequirement, "");
                if (!requirement && sourceIngestion.sources.length === 0)
                    return (0, utils_1.sendJson)(res, { error: "请先说说你想完成什么，或者上传需求资料" }, 400);
                const groups = (0, storage_1.loadGroups)();
                const group = groups.find((item) => item.id === (payload.group_id || payload.groupId)) || null;
                const requestedProject = (0, collaboration_1.compactFormText)(payload.target_project || payload.targetProject, "");
                const coordinator = group?.members?.find((member) => member.role === "coordinator")?.project || group?.members?.[0]?.project || "";
                const targetProject = requestedProject || coordinator || (0, db_1.getConfigs)()[0]?.name || "";
                if (!targetProject && !group)
                    return (0, utils_1.sendJson)(res, { error: "还没有可执行项目，请先添加项目或开发群聊" }, 409);
                const lower = `${requirement}\n${sourceIngestion.source_documents}`.toLowerCase();
                const areas = [
                    /(页面|前端|ui|组件|样式)/i.test(lower) ? "前端页面与交互" : "",
                    /(接口|后端|服务|数据库|api)/i.test(lower) ? "后端接口与数据" : "",
                    /(测试|修复|bug|报错)/i.test(lower) ? "测试与回归验证" : "",
                ].filter(Boolean);
                if (!areas.length)
                    areas.push(group ? "群聊内相关项目" : "目标项目");
                const acceptanceFallback = (0, collaboration_1.compactFormText)(payload.acceptance_criteria || payload.acceptanceCriteria, "") || [
                    "目标功能按描述完成，并覆盖主要正常流程",
                    "相关项目通过现有构建或测试命令",
                    "交付报告列出实际修改文件、验证结果和剩余风险",
                ].join("；");
                const fallbackRisks = [
                    group ? "多个项目之间的接口或数据契约需要保持一致" : "实现范围可能需要根据现有代码进一步收敛",
                    "涉及既有行为时需要回归验证，避免影响当前功能",
                ];
                const extractedAcceptance = extractedRequirement?.acceptance_criteria || [];
                const acceptance = extractedAcceptance.length ? extractedAcceptance.join("；") : acceptanceFallback;
                const title = (0, collaboration_1.compactFormText)(payload.title, "") || extractedRequirement?.title || requirement.replace(/\s+/g, " ").slice(0, 48) || "处理提交的需求资料";
                const intakeDraft = {
                    ...(0, source_ingestion_1.requirementToIntakeDraft)(extractedRequirement, {
                        requirement,
                        scope: areas,
                        acceptance: acceptance.split("；").filter(Boolean),
                        risks: fallbackRisks,
                    }),
                    project: targetProject,
                    group_id: group?.id || "",
                    group_name: group?.name || "",
                    source_summary: sourceIngestion.user_summary,
                    source_ingestion: sourceIngestion.technical,
                };
                const sourceDocuments = [
                    userRequirement ? `用户输入：\n${userRequirement}` : "",
                    sourceIngestion.source_documents,
                    extractedRequirement ? `结构化需求：\n${JSON.stringify(extractedRequirement, null, 2)}` : "",
                ].filter(Boolean).join("\n\n");
                const task = (0, collaboration_1.createTask)({
                    title,
                    description: requirement,
                    business_goal: requirement,
                    acceptance_criteria: acceptance,
                    source_documents: sourceDocuments,
                    source_attachments: sourceIngestion.attachments,
                    requirement_extraction: extractedRequirement,
                    source_ingestion: sourceIngestion.technical,
                    target_project: targetProject,
                    group_id: group?.id || null,
                    assign_type: group ? "group" : "project",
                    workflow_type: group ? "daily_dev" : "general",
                    requires_code_changes: payload.requires_code_changes !== false,
                    requires_verification: true,
                    auto_execute: false,
                    intake_state: "awaiting_confirmation",
                    intake_draft: intakeDraft,
                });
                const updated = (0, collaboration_1.updateTask)(task.id, { status: "pending", auto_execute: false, intake_state: "awaiting_confirmation", intake_draft: intakeDraft, status_detail: "执行计划已准备好，等待你确认" }) || task;
                (0, reliability_ledger_1.appendTraceEvent)(updated.trace_id, { type: "intake.previewed", status: "ok", task_id: updated.id, group_id: updated.group_id || "", agent: targetProject, message: "已生成执行前确认卡，尚未开始执行", data: intakeDraft });
                (0, logs_1.appendTaskTimelineEvent)(updated.id, {
                    type: "requirement_sources_ingested",
                    title: "需求资料已读取",
                    detail: sourceIngestion.user_summary || "已根据用户文字整理需求",
                    status: sourceIngestion.warnings.length ? "warning" : "completed",
                    data: sourceIngestion.technical,
                });
                (0, utils_1.sendJson)(res, { success: true, task: updated, confirmation: intakeDraft, source_ingestion: sourceIngestion.technical, same_task_trace: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        };
        const contentType = String(req.headers["content-type"] || "");
        if (contentType.includes("multipart/form-data")) {
            (0, utils_1.collectRequestBuffer)(req).then((buffer) => {
                const boundary = (0, utils_1.getMultipartBoundary)(contentType);
                if (!boundary)
                    throw new Error("无效的附件请求");
                const { fields, files } = (0, utils_1.parseMultipart)(buffer, boundary);
                return handleIntakePreview(fields || {}, files || []);
            }).catch((e) => (0, utils_1.sendJson)(res, { error: e.message }, 400));
            return true;
        }
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                handleIntakePreview(body ? JSON.parse(body) : {});
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/usability/intake/confirm" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const taskId = String(payload.task_id || payload.id || "").trim();
                const acceptFeedback = (0, collaboration_1.compactFormText)(payload.accept_feedback || payload.acceptFeedback || payload.feedback || payload.message || "", "");
                const current = (0, db_1.loadTasks)().find((item) => item.id === taskId);
                if (!current)
                    return (0, utils_1.sendJson)(res, { error: "确认卡对应的任务不存在" }, 404);
                if (current.intake_state === "confirmed")
                    return (0, utils_1.sendJson)(res, { success: true, duplicate: true, task: current, trace_id: current.trace_id });
                if (current.intake_state !== "awaiting_confirmation")
                    return (0, utils_1.sendJson)(res, { error: "这张确认卡已经失效" }, 409);
                const confirmedAt = new Date().toISOString();
                const basePlan = (0, collaboration_1.getTaskPlanMode)(current) || current.intake_draft || {};
                const acceptedPlan = (0, collaboration_1.buildAcceptedPlanModeDraft)(basePlan, acceptFeedback, confirmedAt);
                const meta = current.workflow_meta || {};
                const acceptanceText = current.acceptance_criteria || current.acceptanceCriteria || "";
                const nextAcceptance = acceptFeedback
                    ? (0, collaboration_1.uniqueStrings)([...(0, collaboration_1.splitUserAcceptanceText)(acceptanceText), `执行时纳入用户补充要求：${acceptFeedback}`]).join("\n")
                    : acceptanceText;
                const nextSourceDocuments = acceptFeedback
                    ? [
                        current.source_documents || current.sourceDocuments || "",
                        `用户确认执行前计划时补充要求（${confirmedAt}）：${acceptFeedback}`,
                    ].filter(Boolean).join("\n\n")
                    : (current.source_documents || current.sourceDocuments || "");
                const task = (0, collaboration_1.updateTask)(taskId, {
                    intake_state: "confirmed",
                    confirmed_at: confirmedAt,
                    auto_execute: true,
                    status: "pending",
                    status_detail: acceptFeedback ? "你已确认执行计划，并补充了执行要求，正在进入执行队列" : "你已确认执行计划，正在进入执行队列",
                    intake_draft: acceptedPlan,
                    plan_accept_feedback: acceptFeedback,
                    last_plan_accept_feedback: acceptFeedback,
                    last_plan_accept_feedback_at: acceptFeedback ? confirmedAt : "",
                    ...(acceptFeedback ? { acceptance_criteria: nextAcceptance, source_documents: nextSourceDocuments } : {}),
                    workflow_meta: {
                        ...meta,
                        plan_mode: acceptedPlan,
                        intake: {
                            ...(meta.intake || {}),
                            plan_mode: acceptedPlan,
                            accepted_feedback: acceptFeedback,
                            accepted_at: confirmedAt,
                        },
                        project_mission: {
                            ...(meta.project_mission || {}),
                            control_state: "confirmed",
                        },
                    },
                }) || current;
                (0, reliability_ledger_1.appendTraceEvent)(task.trace_id, {
                    type: "intake.confirmed",
                    status: "ok",
                    task_id: task.id,
                    group_id: task.group_id || "",
                    agent: task.target_project || "",
                    message: acceptFeedback ? "用户确认执行，并补充执行要求" : "用户确认执行，复用原 Task/Trace 开始工作",
                    data: { same_task_trace: true, has_accept_feedback: !!acceptFeedback, accept_feedback: acceptFeedback || undefined },
                });
                (0, logs_1.appendTaskTimelineEvent)(task.id, {
                    type: "plan_mode_confirmed",
                    title: "用户已确认执行前计划",
                    detail: acceptFeedback ? `带着补充要求进入执行队列：${(0, memory_1.compactMemoryText)(acceptFeedback, 180)}` : "复用同一任务和 Trace 进入执行队列",
                    status: "ok",
                    phase: "queued",
                    agent: task.target_project || "",
                    data: { same_task_trace: true, has_accept_feedback: !!acceptFeedback },
                });
                if (acceptFeedback)
                    (0, logs_1.addTaskLog)(task.id, "info", `确认执行前计划时补充要求：${acceptFeedback}`);
                const queueResult = (0, collaboration_1.enqueueTask)(task.id, ctx);
                const updated = (0, collaboration_1.updateTask)(task.id, {
                    status_detail: queueResult.message || "已进入执行队列",
                    workflow_meta: {
                        ...(task.workflow_meta || {}),
                        project_mission: {
                            ...((task.workflow_meta || {}).project_mission || {}),
                            control_state: "queued",
                        },
                    },
                }) || task;
                (0, collaboration_1.updateGroupTaskInlineStatus)(updated, updated.status, updated.status_detail || "已进入执行队列");
                (0, utils_1.sendJson)(res, { success: true, task: updated, queued: !!queueResult.queued, queue_result: queueResult, trace_id: task.trace_id, same_task_trace: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/usability/intake/revise" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const taskId = String(payload.task_id || payload.id || "").trim();
                const feedback = (0, collaboration_1.compactFormText)(payload.feedback || payload.message || payload.reason || "", "");
                const current = (0, db_1.loadTasks)().find((item) => item.id === taskId);
                if (!current)
                    return (0, utils_1.sendJson)(res, { error: "确认卡对应的任务不存在" }, 404);
                if (current.intake_state !== "awaiting_confirmation")
                    return (0, utils_1.sendJson)(res, { error: "这张确认卡已经失效，不能调整计划" }, 409);
                if (!feedback)
                    return (0, utils_1.sendJson)(res, { error: "请填写希望主 Agent 调整的地方" }, 400);
                const basePlan = (0, collaboration_1.getTaskPlanMode)(current) || current.intake_draft || {};
                const revisedPlan = (0, collaboration_1.buildRevisedPlanModeDraft)(basePlan, feedback);
                const meta = current.workflow_meta || {};
                const task = (0, collaboration_1.updateTask)(taskId, {
                    intake_state: "awaiting_confirmation",
                    intake_draft: revisedPlan,
                    auto_execute: false,
                    status: "pending",
                    status_detail: "执行前计划已按你的反馈调整，等待你重新确认",
                    plan_revision_count: revisedPlan.revision_count,
                    last_plan_revision_feedback: revisedPlan.last_revision_feedback,
                    last_plan_revision_at: revisedPlan.revised_at,
                    workflow_meta: {
                        ...meta,
                        plan_mode: revisedPlan,
                        intake: { ...(meta.intake || {}), plan_mode: revisedPlan },
                        project_mission: {
                            ...(meta.project_mission || {}),
                            control_state: "plan_revision_requested",
                        },
                    },
                }) || current;
                (0, reliability_ledger_1.appendTraceEvent)(task.trace_id, {
                    type: "intake.revision_requested",
                    status: "ok",
                    task_id: task.id,
                    group_id: task.group_id || "",
                    agent: task.target_project || "",
                    message: "用户退回执行前计划并要求调整",
                    data: { feedback: revisedPlan.last_revision_feedback, revision_count: revisedPlan.revision_count, same_task_trace: true },
                });
                (0, logs_1.appendTaskTimelineEvent)(task.id, {
                    type: "plan_mode_revision_requested",
                    title: "用户要求调整执行前计划",
                    detail: revisedPlan.last_revision_feedback,
                    status: "warn",
                    phase: "planning",
                    agent: task.target_project || "",
                    data: { revision_count: revisedPlan.revision_count, same_task_trace: true },
                });
                (0, logs_1.addTaskLog)(task.id, "info", `执行前计划退回调整：${revisedPlan.last_revision_feedback}`);
                (0, collaboration_1.updateGroupTaskInlineStatus)(task, "pending", task.status_detail || "执行前计划已调整，等待重新确认");
                (0, utils_1.sendJson)(res, { success: true, task, plan_mode: revisedPlan, trace_id: task.trace_id, same_task_trace: true });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/create" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = JSON.parse(body);
                const task = (0, collaboration_1.createTask)(payload);
                let queueResult = null;
                if (payload.auto_execute || payload.autoExecute) {
                    queueResult = (0, collaboration_1.enqueueTask)(task.id, ctx);
                }
                (0, utils_1.sendJson)(res, { success: true, task, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: (0, collaboration_1.getQueueStatus)() });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/create-daily-dev" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            let operationKey = "";
            try {
                const payload = body ? JSON.parse(body) : {};
                operationKey = String(payload.idempotency_key || payload.idempotencyKey || "").trim();
                const traceId = (0, reliability_ledger_1.ensureTraceId)(payload.trace_id || payload.traceId, "daily-dev");
                const groupId = payload.group_id || payload.groupId;
                if (!groupId)
                    return (0, utils_1.sendJson)(res, { error: "请选择目标开发群聊" }, 400);
                const groups = (0, storage_1.loadGroups)();
                const group = groups.find(g => g.id === groupId);
                if (!group)
                    return (0, utils_1.sendJson)(res, { error: "开发群聊不存在" }, 404);
                const groupReadiness = (0, collaboration_1.validateDailyDevGroupReady)(group);
                const goal = (0, collaboration_1.compactFormText)(payload.business_goal || payload.businessGoal || payload.goal || payload.description, "");
                if (!goal)
                    return (0, utils_1.sendJson)(res, { error: "请输入业务目标" }, 400);
                const quality = (0, daily_dev_backlog_1.evaluateDailyDevIntakeQuality)(payload, goal);
                const forceQualityGate = !!(payload.force_quality_gate || payload.forceQualityGate || payload.force);
                if (!quality.pass && !forceQualityGate) {
                    return (0, utils_1.sendJson)(res, {
                        success: false,
                        needs_confirmation: true,
                        error: quality.message,
                        quality,
                    }, 422);
                }
                const operation = operationKey ? (0, reliability_ledger_1.acquireIdempotency)({ scope: "create-daily-dev", key: operationKey, traceId, leaseMs: 60_000 }) : null;
                if (operation && !operation.acquired) {
                    const existingTask = operation.record?.result?.task_id ? (0, db_1.loadTasks)().find((item) => item.id === operation.record.result.task_id) : null;
                    (0, utils_1.sendJson)(res, { success: true, duplicate: true, task: existingTask, trace_id: operation.traceId });
                    return;
                }
                const title = (0, collaboration_1.compactFormText)(payload.title, goal.slice(0, 60));
                const backlogFile = (0, daily_dev_backlog_1.persistDailyDevBacklogFile)(groups, group, payload, title, goal);
                const sourceDocuments = [
                    payload.documents || payload.docs || payload.source_documents || payload.sourceDocuments || "",
                    backlogFile ? `群聊需求池文件：${backlogFile.name}` : "",
                ].filter(Boolean).join("\n\n");
                const taskPayload = { ...payload, documents: sourceDocuments, source_documents: sourceDocuments };
                const task = (0, collaboration_1.createTask)({
                    title,
                    description: (0, daily_dev_backlog_1.buildDailyDevTaskDescription)(taskPayload),
                    target_project: groupReadiness.coordinator.project,
                    group_id: groupId,
                    assign_type: "group",
                    priority: payload.priority || "normal",
                    auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
                    workflow_type: "daily_dev",
                    requires_code_changes: payload.requires_code_changes !== false && payload.requiresCodeChanges !== false,
                    requires_verification: payload.requires_verification !== false && payload.requiresVerification !== false,
                    business_goal: goal,
                    acceptance_criteria: payload.acceptance || payload.acceptance_criteria || payload.acceptanceCriteria || "",
                    source_documents: sourceDocuments,
                    workflow_meta: {
                        ...(payload.workflow_meta || payload.workflowMeta || {}),
                        intake_quality: quality,
                        intake: backlogFile ? {
                            backlog_file: backlogFile.name,
                            persisted_at: new Date().toISOString(),
                            source: "create-daily-dev",
                        } : null,
                    },
                    trace_id: traceId,
                    idempotency_key: operationKey || null,
                });
                if (backlogFile) {
                    (0, daily_dev_backlog_1.markDailyDevBacklogStatus)(groupId, backlogFile.name, "dispatched", {
                        task_id: task.id,
                        result: "业务开发任务已创建并关联此需求池条目",
                    });
                }
                let queueResult = null;
                if (task.auto_execute) {
                    queueResult = (0, collaboration_1.enqueueTask)(task.id, ctx);
                    if (backlogFile && queueResult?.blocked) {
                        (0, daily_dev_backlog_1.markDailyDevBacklogStatus)(groupId, backlogFile.name, "dispatched", {
                            task_id: task.id,
                            result: queueResult.message || "任务已创建，等待执行通道恢复",
                        });
                    }
                }
                if (operationKey)
                    (0, reliability_ledger_1.completeIdempotency)("create-daily-dev", operationKey, { task_id: task.id, queued: !!queueResult?.queued });
                (0, utils_1.sendJson)(res, { success: true, task, backlog_file: backlogFile?.name || null, queued: !!queueResult?.queued, queue_result: queueResult, queue_status: (0, collaboration_1.getQueueStatus)() });
            }
            catch (e) {
                if (operationKey) {
                    try {
                        (0, reliability_ledger_1.failIdempotency)("create-daily-dev", operationKey, e);
                    }
                    catch { }
                }
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/daily-dev-backlog" && req.method === "GET") {
        const groupId = String(parsed.query.group_id || parsed.query.groupId || "");
        const items = (0, daily_dev_backlog_1.listDailyDevBacklogs)(groupId);
        const counts = items.reduce((acc, item) => {
            acc[item.status] = Number(acc[item.status] || 0) + 1;
            return acc;
        }, {});
        (0, utils_1.sendJson)(res, { success: true, items, counts });
        return true;
    }
    if (pathname === "/api/tasks/daily-dev-backlog/status" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const groupId = payload.group_id || payload.groupId;
                const name = payload.name || payload.file || payload.fileName;
                const status = String(payload.status || "").trim();
                if (!groupId || !name || !status)
                    return (0, utils_1.sendJson)(res, { error: "缺少 group_id、name 或 status" }, 400);
                if (!["draft", "needs_user", "ready", "planned", "dispatched", "queued", "in_progress", "running", "reviewing", "blocked", "done", "failed"].includes(status)) {
                    return (0, utils_1.sendJson)(res, { error: "不支持的需求池状态" }, 400);
                }
                const file = (0, daily_dev_backlog_1.markDailyDevBacklogStatus)(groupId, name, status, {
                    result: payload.reason || `用户手动设置为 ${status}`,
                });
                if (!file)
                    return (0, utils_1.sendJson)(res, { error: "需求池文件不存在" }, 404);
                const items = (0, daily_dev_backlog_1.listDailyDevBacklogs)(groupId);
                (0, utils_1.sendJson)(res, { success: true, file, items });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/daily-dev-backlog/import-shared" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = (0, daily_dev_backlog_1.importSharedDocsToDailyDevBacklog)({
                    group_id: payload.group_id || payload.groupId || "",
                    limit: payload.limit || 20,
                    force: !!payload.force,
                    priority: payload.priority || "normal",
                    requires_code_changes: payload.requires_code_changes !== false && payload.requiresCodeChanges !== false,
                });
                (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/daily-dev-backlog/dispatch" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const groupId = payload.group_id || payload.groupId;
                const name = payload.name || payload.file || payload.fileName;
                if (!groupId || !name)
                    return (0, utils_1.sendJson)(res, { error: "缺少 group_id 或 name" }, 400);
                const result = (0, daily_dev_backlog_1.dispatchDailyDevBacklog)(groupId, name, ctx, {
                    auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
                    force: !!payload.force,
                });
                if (!result.success)
                    return (0, utils_1.sendJson)(res, { error: result.error }, result.status || 400);
                (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/daily-dev-backlog/dispatch-ready" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const result = (0, daily_dev_backlog_1.dispatchReadyDailyDevBacklogs)(ctx, {
                    group_id: payload.group_id || payload.groupId || "",
                    limit: payload.limit || 20,
                    auto_execute: payload.auto_execute !== false && payload.autoExecute !== false,
                    only_executable_groups: payload.only_executable_groups !== false && payload.onlyExecutableGroups !== false,
                });
                (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/update" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { id, ...updates } = JSON.parse(body);
                const current = (0, db_1.loadTasks)().find(t => t.id === id);
                if (!current)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                const validationError = (0, collaboration_1.validateTaskManualStatusUpdate)(current, updates);
                if (validationError)
                    return (0, utils_1.sendJson)(res, { error: validationError }, 409);
                const task = (0, collaboration_1.updateTask)(id, updates);
                if (!task)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                (0, collaboration_1.updateGroupTaskInlineStatus)(task, task.status, task.status_detail || "任务状态已更新");
                (0, utils_1.sendJson)(res, { success: true, task });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/reconcile-delivery" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const taskId = String(payload.task_id || payload.taskId || payload.id || "");
                if (!taskId)
                    return (0, utils_1.sendJson)(res, { error: "缺少任务 ID" }, 400);
                const result = (0, collaboration_1.reconcileTaskDeliveryEvidence)(taskId);
                (0, utils_1.sendJson)(res, result, result.success ? 200 : (result.status || 400));
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { success: false, error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/continue" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const taskId = payload.task_id || payload.id;
                const message = (0, collaboration_1.compactFormText)(payload.message || payload.followup || payload.note, "");
                const result = (0, collaboration_1.continueTaskWithMessage)(taskId, message, ctx, {
                    source: payload.source || "user",
                    auto_execute: payload.auto_execute,
                    autoExecute: payload.autoExecute,
                    continuationKind: payload.continuation_kind || payload.continuationKind || "auto",
                    idempotencyKey: payload.idempotency_key || payload.idempotencyKey || payload.request_id || payload.requestId,
                });
                if (!result.success)
                    return (0, utils_1.sendJson)(res, { error: result.error, new_task_suggested: result.new_task_suggested === true, continuation_kind: result.new_task_suggested ? "new_task" : undefined }, result.status || 400);
                (0, utils_1.sendJson)(res, result);
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/continue-from-gaps" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const payload = body ? JSON.parse(body) : {};
                const taskId = payload.task_id || payload.id;
                if (!taskId)
                    return (0, utils_1.sendJson)(res, { error: "缺少任务 ID" }, 400);
                const current = (0, db_1.loadTasks)().find(t => t.id === taskId);
                if (!current)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                if (current.status === "done")
                    return (0, utils_1.sendJson)(res, { error: "已完成任务不需要按缺口继续" }, 409);
                const targeted = payload.rework_kind || payload.reworkKind || payload.work_item_id || payload.workItemId || payload.target || payload.agent || payload.project || payload.reason;
                const message = (0, collaboration_1.compactFormText)(payload.message, "") || (targeted ? (0, collaboration_1.buildTargetedReworkContinuationDraft)(current, payload) : (0, collaboration_1.buildTaskGapContinuationDraft)(current));
                const reworkKind = (0, collaboration_1.compactFormText)(payload.rework_kind || payload.reworkKind || "", "");
                const target = (0, collaboration_1.compactFormText)(payload.target || payload.agent || payload.project || "", "");
                const reason = (0, collaboration_1.compactFormText)(payload.reason || payload.detail || "", "");
                const title = (0, collaboration_1.compactFormText)(payload.title || payload.label || "", "");
                const workItemId = (0, collaboration_1.compactFormText)(payload.work_item_id || payload.workItemId || "", "");
                const isNextWorkItem = reworkKind === "next_claimable_work_item" || /user_next_work_item|next_work_item/i.test(String(payload.source || ""));
                const friendlyStatus = targeted
                    ? isNextWorkItem
                        ? `已接上${target ? ` ${target} 的` : ""}下一步工作项，等待主 Agent 继续派发`
                        : `已接上${target ? ` ${target} 的` : ""}精准返工，等待主 Agent 继续执行`
                    : "已按交付缺口生成返工说明，等待主 Agent 继续执行";
                let claimOwner = target;
                let claimRef = workItemId || target;
                if (isNextWorkItem) {
                    const currentItems = (0, collaboration_1.getTaskWorkItems)(current);
                    const requestedItem = currentItems.find((item) => [item.id, item.target, item.owner, item.subject].some(value => String(value || "").toLowerCase() === String(claimRef || "").toLowerCase()));
                    claimRef = claimRef || requestedItem?.id || "";
                    claimOwner = claimOwner || requestedItem?.owner || requestedItem?.target || "";
                    const preflight = (0, work_items_1.claimMainAgentWorkItem)(currentItems, claimRef, claimOwner, { checkOwnerBusy: true });
                    if (!preflight.ok) {
                        const claimSummary = (0, work_items_1.buildMainAgentWorkItemClaimSummary)(preflight, claimOwner, claimRef);
                        (0, collaboration_1.persistTaskWorkItems)(taskId, preflight.items, {
                            last_claim_summary: claimSummary,
                            last_claim_attempt: { agent: claimOwner, item_id: preflight.item?.id || "", result: "waiting", reason: preflight.reason || "", at: new Date().toISOString() },
                        });
                        (0, logs_1.addTaskLog)(taskId, "warning", claimSummary.headline);
                        return (0, utils_1.sendJson)(res, {
                            success: true,
                            waiting: true,
                            queued: false,
                            work_item_claim_summary: claimSummary,
                            task: (0, collaboration_1.getTaskById)(taskId),
                        });
                    }
                }
                const result = (0, collaboration_1.continueTaskWithMessage)(taskId, message, ctx, {
                    source: payload.source || (targeted ? "targeted_gap_rework" : "auto_gap_rework"),
                    auto_execute: payload.auto_execute,
                    autoExecute: payload.autoExecute,
                    status_detail: friendlyStatus,
                    rework_kind: reworkKind,
                    target,
                    reason,
                    title,
                    work_item_id: workItemId,
                    idempotencyKey: payload.idempotency_key || payload.idempotencyKey || payload.request_id || payload.requestId,
                });
                if (!result.success)
                    return (0, utils_1.sendJson)(res, { error: result.error }, result.status || 400);
                const claimResult = isNextWorkItem
                    ? (0, collaboration_1.claimTaskWorkItemForAgent)(taskId, claimOwner, reason || title, { itemRef: claimRef, checkOwnerBusy: true })
                    : null;
                (0, utils_1.sendJson)(res, {
                    ...result,
                    continuation_message: message,
                    queued: true,
                    work_item_claim_summary: claimResult?.summary || null,
                });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if ((0, task_governance_routes_1.handleTaskGovernanceRoutes)(req, res, parsed, ctx, {
        compactFormText: collaboration_1.compactFormText,
        uniqueStrings: collaboration_1.uniqueStrings,
        archiveTask: collaboration_1.archiveTask,
        restoreArchivedTask: collaboration_1.restoreArchivedTask,
        purgeArchivedTask: collaboration_1.purgeArchivedTask,
        removeTaskFromQueues: collaboration_1.removeTaskFromQueues,
        updateTask: collaboration_1.updateTask,
        enqueueTask: collaboration_1.enqueueTask,
        retryTask: collaboration_1.retryTask,
        retryRuntimeFailedTasks: collaboration_1.retryRuntimeFailedTasks,
        getQueueStatus: collaboration_1.getQueueStatus,
        getTaskWatchdogStatus: collaboration_1.getTaskWatchdogStatus,
        runTaskWatchdog: collaboration_1.runTaskWatchdog,
        cleanupRuntimeDebt: collaboration_1.cleanupRuntimeDebt,
        resumeTaskQueues: collaboration_1.resumeTaskQueues,
        clearTaskQueues: () => collaboration_1.taskQueues.clear(),
        taskWatchdogStaleMs: collaboration_1.TASK_WATCHDOG_STALE_MS,
    }))
        return true;
    // === 群聊主 Agent / Orchestrator API ===
    if ((0, orchestrator_routes_1.handleOrchestratorRoutes)(req, res, parsed, ctx, {
        buildCoordinatorSharedFilesContext: collaboration_1.buildCoordinatorSharedFilesContext,
        runGroupOrchestrator: group_orchestrator_1.runGroupOrchestrator,
        buildDailyDevAgentDiagnostics: collaboration_1.buildDailyDevAgentDiagnostics,
        replayAgentTrace: runtime_kernel_1.replayAgentTrace,
        buildTraceReplaySuite: runtime_kernel_1.buildTraceReplaySuite,
        runAgentRuntimeKernelSelfTest: runtime_kernel_1.runAgentRuntimeKernelSelfTest,
        runWorkerHandoffSelfTest: worker_handoff_1.runWorkerHandoffSelfTest,
        runGroupMainAgentActionRegistrySelfTest: collaboration_1.runGroupMainAgentActionRegistrySelfTest,
        runGroupMainAgentToolLoopSelfTest: collaboration_1.runGroupMainAgentToolLoopSelfTest,
        getGroupMainAgentActionRegistry: collaboration_1.getGroupMainAgentActionRegistry,
        applyRuntimeMonitorControl: collaboration_1.applyRuntimeMonitorControl,
        buildDailyDevWorkflowRehearsal: collaboration_1.buildDailyDevWorkflowRehearsal,
        createDailyDevSmokeTask: collaboration_1.createDailyDevSmokeTask,
        getDailyDevSmokeStatus: collaboration_1.getDailyDevSmokeStatus,
        runAgentCliProbeBatch: collaboration_1.runAgentCliProbeBatch,
        runAgentCliProbe: collaboration_1.runAgentCliProbe,
        switchTaskExecutor: collaboration_1.switchTaskExecutor,
        runRuntimeFallbackProbe: collaboration_1.runRuntimeFallbackProbe,
        runAgentRecoveryMonitorOnce: collaboration_1.runAgentRecoveryMonitorOnce,
    }))
        return true;
    if ((0, group_routes_1.handleBasicGroupRoutes)(req, res, parsed, ctx, {
        getGroupMemoryFile: memory_1.getGroupMemoryFile,
        loadGroupMemory: memory_1.loadGroupMemory,
        saveGroupMemory: memory_1.saveGroupMemory,
        buildGroupMemoryContext: memory_1.buildGroupMemoryContext,
        buildAgentMemoryPacket: memory_1.buildAgentMemoryPacket,
        buildInlineTaskRuntime: collaboration_1.buildInlineTaskRuntime,
        getAgentQaItemsForGroup: agent_qa_service_1.getAgentQaItemsForGroup,
        deleteGroupSessionMemoryArtifacts: memory_1.deleteGroupSessionMemoryArtifacts,
    }))
        return true;
    // === Agent 间问答 API ===
    if ((0, agent_qa_routes_1.handleAgentQaRoutes)(req, res, parsed, ctx, {
        getAgentQaItemsForGroup: agent_qa_service_1.getAgentQaItemsForGroup,
        runAgentCollaborationProtocolSelfTest: collaboration_protocol_1.runAgentCollaborationProtocolSelfTest,
        setAgentQaArbitration: agent_qa_service_1.setAgentQaArbitration,
        resumeAgentQaFromStoredContinuation: collaboration_1.resumeAgentQaFromStoredContinuation,
        setAgentQaManualTakeover: agent_qa_service_1.setAgentQaManualTakeover,
        retryAgentQaItem: collaboration_1.retryAgentQaItem,
        listGroupCoordinationRequests: group_coordination_store_1.listGroupCoordinationRequests,
    }))
        return true;
    if ((0, group_live_routes_1.handleGroupLiveRoutes)(req, res, parsed, ctx, {
        writeSse: collaboration_1.writeSse,
        ensureTraceId: reliability_ledger_1.ensureTraceId,
        classifyGroupProjectTaskIntentWithAgent: collaboration_1.classifyGroupProjectTaskIntentWithAgent,
        shouldCreatePersistentGroupTask: collaboration_1.shouldCreatePersistentGroupTask,
        shouldUseProjectAnalysisMode: collaboration_1.shouldUseProjectAnalysisMode,
        classifyTaskContinuation: collaboration_1.classifyTaskContinuation,
        looksLikeTaskContinuation: collaboration_1.looksLikeTaskContinuation,
        continueTaskWithMessage: collaboration_1.continueTaskWithMessage,
        appendMainAgentDecisionTrace: collaboration_1.appendMainAgentDecisionTrace,
        applyMainAgentDecisionPetState: collaboration_1.applyMainAgentDecisionPetState,
        validateDailyDevGroupReady: collaboration_1.validateDailyDevGroupReady,
        compactMemoryText: memory_1.compactMemoryText,
        buildGroupPlanModePreflight: collaboration_1.buildGroupPlanModePreflight,
        createTask: collaboration_1.createTask,
        updateTask: collaboration_1.updateTask,
        appendTaskTimelineEvent: logs_1.appendTaskTimelineEvent,
        buildWorkflowMeta: collaboration_1.buildWorkflowMeta,
        buildInlineTaskRuntime: collaboration_1.buildInlineTaskRuntime,
        updateGroupMemory: memory_1.updateGroupMemory,
        enqueueTask: collaboration_1.enqueueTask,
        buildCoordinatorSharedFilesContext: collaboration_1.buildCoordinatorSharedFilesContext,
        buildGroupProjectAnalysisContext: collaboration_1.buildGroupProjectAnalysisContext,
        normalizePlanAssignments: collaboration_1.normalizePlanAssignments,
        getInitialWorkflowMeta: collaboration_1.getInitialWorkflowMeta,
        getCoordinatorActionMentions: collaboration_1.getCoordinatorActionMentions,
        processCrossAgents: collaboration_1.processCrossAgents,
        runCoordinatorReviewLoop: collaboration_1.runCoordinatorReviewLoop,
        buildGroupContextPacket: memory_1.buildGroupContextPacket,
        buildAgentToolContext: collaboration_1.buildAgentToolContext,
        prepareAgentRuntimeTools: collaboration_1.prepareAgentRuntimeTools,
        getProjectExtraConfig: collaboration_1.getProjectExtraConfig,
        buildAgentMemoryContextBundle: memory_1.buildAgentMemoryContextBundle,
        buildAgentMemoryContextBundleWithManifestSelection: memory_1.buildAgentMemoryContextBundleWithManifestSelection,
        buildAgentMemoryPacket: memory_1.buildAgentMemoryPacket,
        buildChildAgentDevelopmentContract: collaboration_1.buildChildAgentDevelopmentContract,
        buildProjectVerificationHints: collaboration_1.buildProjectVerificationHints,
        buildAgentQaProtocolInstructions: collaboration_1.buildAgentQaProtocolInstructions,
        getAgentQaItemsForGroup: agent_qa_service_1.getAgentQaItemsForGroup,
        handleAgentQaRequests: collaboration_1.handleAgentQaRequests,
        runtimeToolSnapshotFromAudit: collaboration_1.runtimeToolSnapshotFromAudit,
        extractActionableMentions: collaboration_1.extractActionableMentions,
        extractAgentReceipt: agent_receipts_1.extractAgentReceipt,
    }))
        return true;
    if (pathname === "/api/tasks/auto-assign" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { task_id, group_id } = JSON.parse(body);
                const tasks = (0, db_1.loadTasks)();
                const task = tasks.find(t => t.id === task_id);
                if (!task)
                    return (0, utils_1.sendJson)(res, { error: "任务不存在" }, 404);
                const configs = (0, db_1.getConfigs)();
                const config = configs.find(c => c.name === task.target_project);
                if (!config)
                    return (0, utils_1.sendJson)(res, { error: "项目配置不存在" }, 400);
                const info = (0, db_1.getConfigInfo)(config.path);
                const workDir = info[0]?.workDir;
                const agentType = info[0]?.agent || "claudecode";
                (0, collaboration_1.updateTask)(task_id, { status: "in_progress" });
                const autoAssignGroupId = String(group_id || task.group_id || "");
                const group = autoAssignGroupId ? (0, storage_1.loadGroups)().find(g => g.id === autoAssignGroupId) : null;
                const toolContext = (0, collaboration_1.buildAgentToolContext)(ctx, group, task.target_project, `${task.title || ""}\n${task.description || ""}\n${task.acceptance_criteria || ""}`);
                let runtimeToolContext = (0, collaboration_1.prepareAgentRuntimeTools)(autoAssignGroupId, task.target_project, workDir, agentType, toolContext.allowedTools, null, { taskId: task.id, task, toolAudit: toolContext.toolAudit, authorizationReadiness: toolContext.authorizationReadiness });
                if (runtimeToolContext.dispatchBlocked) {
                    const blockedReceipt = (0, collaboration_1.runtimeToolDispatchBlockedReceipt)(task.target_project, runtimeToolContext);
                    (0, collaboration_1.updateTask)(task_id, { status: "blocked", status_detail: blockedReceipt.summary });
                    (0, logs_1.addTaskLog)(task_id, "warning", blockedReceipt.summary);
                    (0, logs_1.appendTaskTimelineEvent)(task_id, { type: "runtime_tool_dispatch_blocked", title: `${task.target_project} 工具授权派发被阻断`, detail: blockedReceipt.summary, status: "warn", phase: "dispatching", agent: task.target_project, data: { runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate } });
                    return (0, utils_1.sendJson)(res, { success: false, error: blockedReceipt.summary, runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate }, 409);
                }
                const directTaskText = (0, collaboration_1.buildChildAgentTaskText)(`${task.title}\n${task.description || ""}`, task);
                let autoAssignTaskSession = (0, agent_sessions_1.openTaskAgentSession)({
                    scopeId: task.id,
                    taskId: task.id,
                    groupId: autoAssignGroupId,
                    project: task.target_project,
                    agentType,
                });
                const autoAssignMemoryDeliveryAttemptSequence = autoAssignTaskSession ? autoAssignTaskSession.turnCount + 1 : 0;
                const autoAssignGroupSessionId = String(task.group_session_id || task.groupSessionId || "");
                let autoAssignInvocationEdge = autoAssignGroupId && autoAssignTaskSession && autoAssignGroupSessionId.startsWith("gcs_") ? (0, task_agent_invocation_lineage_1.prepareTaskAgentInvocationEdge)({
                    groupId: autoAssignGroupId,
                    groupSessionId: autoAssignGroupSessionId,
                    taskId: task.id,
                    targetProject: task.target_project,
                    taskAgentSessionId: autoAssignTaskSession.id,
                    nativeSessionId: autoAssignTaskSession.nativeSessionId || "",
                    executionId: task.id,
                    attemptSequence: autoAssignMemoryDeliveryAttemptSequence,
                    providerAttempt: 1,
                    invocationKind: autoAssignMemoryDeliveryAttemptSequence > 1 ? "resume" : "spawn",
                    branchKind: "main",
                }) : null;
                let autoAssignGroupMemoryContext = autoAssignGroupId
                    ? await (0, memory_1.buildAgentMemoryContextBundleWithManifestSelection)(autoAssignGroupId, task.target_project, directTaskText, {
                        taskId: task.id,
                        traceId: task.trace_id || "",
                        agentType,
                        taskAgentSessionId: autoAssignTaskSession?.id || "",
                        nativeSessionId: autoAssignTaskSession?.nativeSessionId || "",
                        taskAgentSessionTurn: autoAssignMemoryDeliveryAttemptSequence,
                        modelContextWindow: autoAssignTaskSession?.modelContextWindow || 0,
                        groupSessionId: task.group_session_id || task.groupSessionId || "",
                        requireExactGroupSession: true,
                        task,
                        ...(0, collaboration_1.taskAgentInvocationMemoryOptions)(autoAssignInvocationEdge),
                    })
                    : null;
                const autoAssignCoordinatorProject = group ? String((0, group_orchestrator_1.getCoordinatorMember)(group)?.project || "") : "";
                const autoAssignMemoryConsumptionChallenge = autoAssignGroupMemoryContext
                    && autoAssignTaskSession
                    && task.target_project !== autoAssignCoordinatorProject
                    ? (0, memory_context_consumption_receipt_1.createMemoryContextConsumptionChallenge)({
                        groupId: autoAssignGroupId,
                        groupSessionId: autoAssignGroupSessionId,
                        taskId: task.id,
                        executionId: task.id,
                        project: task.target_project,
                        taskAgentSessionId: autoAssignTaskSession.id,
                        attempt: autoAssignMemoryDeliveryAttemptSequence,
                    })
                    : null;
                if (autoAssignMemoryConsumptionChallenge) {
                    autoAssignGroupMemoryContext = (0, memory_context_consumption_receipt_1.attachMemoryContextConsumptionChallenge)(autoAssignGroupMemoryContext, autoAssignMemoryConsumptionChallenge);
                    runtimeToolContext = (0, collaboration_1.prepareAgentRuntimeTools)(autoAssignGroupId, task.target_project, workDir, agentType, toolContext.allowedTools, null, {
                        taskId: task.id,
                        task,
                        toolAudit: toolContext.toolAudit,
                        authorizationReadiness: toolContext.authorizationReadiness,
                        groupSessionId: autoAssignGroupSessionId,
                        taskAgentSessionId: autoAssignTaskSession.id,
                        nativeSessionId: autoAssignTaskSession.nativeSessionId || "",
                        memoryReceiptChallenge: autoAssignMemoryConsumptionChallenge,
                        memoryReceiptFile: (0, memory_context_consumption_receipt_1.memoryContextConsumptionReceiptFile)(autoAssignMemoryConsumptionChallenge.challenge_id),
                    });
                    (0, collaboration_1.assertRuntimeToolDispatchReady)(task.target_project, runtimeToolContext);
                }
                const autoAssignContinuation = (0, collaboration_1.buildWorkerContinuationHandoff)(task, task.target_project);
                const autoAssignHandoff = (0, collaboration_1.buildChildAgentWorkerHandoff)(task.target_project, directTaskText, {
                    source: task.global_mission_id ? "全局主 Agent 子任务自动派发" : "自动派发",
                    reason: task.mission_target?.reason || "",
                    acceptance: task.acceptance_criteria || "",
                    requires_code_changes: task.requires_code_changes,
                    verification_hints: (0, collaboration_1.buildProjectVerificationHints)(task.target_project, workDir),
                    work_dir: workDir,
                    agent_type: agentType,
                    model: autoAssignTaskSession?.modelId || "",
                    task_id: task.id,
                    task_agent_session_id: autoAssignTaskSession?.id || "",
                    trace_id: task.trace_id || "",
                    task,
                    group,
                    worker_context_packet: task.mission_handoff?.worker_context_packet || null,
                    dependencies: Array.isArray(task.mission_handoff?.global_mission?.depends_on)
                        ? task.mission_handoff.global_mission.depends_on.map((ref) => ({ project: ref, reason: "全局任务前置依赖" }))
                        : [],
                    analysis: {
                        constraints: Array.isArray(task.mission_handoff?.done_criteria) ? task.mission_handoff.done_criteria : [],
                    },
                    memory: autoAssignGroupMemoryContext,
                    continuation: autoAssignContinuation,
                });
                const autoAssignPendingCapacityGate = autoAssignTaskSession?.capacityDowngradeGate || null;
                const autoAssignCapacityRevalidationPreparation = autoAssignTaskSession
                    ? (0, agent_sessions_1.prepareTaskAgentSessionCapacityRevalidation)(autoAssignTaskSession.id, autoAssignHandoff.worker_context_packet)
                    : null;
                if (autoAssignTaskSession?.capacityRevalidationRequired === true && autoAssignCapacityRevalidationPreparation?.prepared !== true) {
                    throw new Error(`模型容量下降后的上下文重建未通过：${autoAssignCapacityRevalidationPreparation?.reason || "packet_capacity_not_revalidated"}`);
                }
                if (autoAssignCapacityRevalidationPreparation?.session)
                    autoAssignTaskSession = autoAssignCapacityRevalidationPreparation.session;
                let autoAssignCapacityRevalidationCommitted = autoAssignCapacityRevalidationPreparation?.required !== true;
                (0, logs_1.addTaskLog)(task.id, "info", `${task.target_project} 自动派发工作单已补齐：目标、范围、验收、ACK 和回执要求已打包`);
                (0, logs_1.appendTaskTimelineEvent)(task.id, {
                    type: "worker_handoff_ready",
                    title: `${task.target_project} 工作单已补齐`,
                    detail: "自动派发已补齐目标、范围、边界、验收、ACK 和回执要求",
                    status: "ok",
                    phase: "dispatching",
                    agent: task.target_project,
                    data: { worker_handoff: (0, worker_handoff_1.summarizeWorkerHandoffForUser)(autoAssignHandoff), worker_context_packet: autoAssignHandoff.worker_context_packet },
                });
                (0, runtime_kernel_1.recordAgentRuntimeLifecycle)({
                    scope: autoAssignGroupId ? "group" : "worker",
                    traceId: task.trace_id || "",
                    taskId: task.id,
                    groupId: autoAssignGroupId,
                    agent: "auto-assign",
                    action: "dispatch_worker",
                    phase: "handoff",
                    risk: "agent",
                    target: task.target_project,
                    status: "planned",
                    message: `${task.target_project} 自动派发自包含工作单已生成`,
                    data: {
                        worker_handoff: (0, worker_handoff_1.summarizeWorkerHandoffForUser)(autoAssignHandoff),
                        worker_context_packet: autoAssignHandoff.worker_context_packet,
                        source: "auto-assign",
                    },
                });
                const developmentContract = (0, collaboration_1.buildChildAgentDevelopmentContract)(task.target_project, directTaskText, {
                    source: task.global_mission_id ? "全局主 Agent 子任务自动派发" : "自动派发",
                    reason: task.mission_target?.reason || "",
                    acceptance: task.acceptance_criteria || "",
                    requires_code_changes: task.requires_code_changes,
                    verification_hints: (0, collaboration_1.buildProjectVerificationHints)(task.target_project, workDir),
                    work_dir: workDir,
                    agent_type: agentType,
                    task_id: task.id,
                    trace_id: task.trace_id || "",
                    task,
                    group,
                    worker_context_packet: task.mission_handoff?.worker_context_packet || null,
                    dependencies: Array.isArray(task.mission_handoff?.global_mission?.depends_on)
                        ? task.mission_handoff.global_mission.depends_on.map((ref) => ({ project: ref, reason: "全局任务前置依赖" }))
                        : [],
                    memory: autoAssignGroupMemoryContext,
                    continuation: autoAssignContinuation,
                    handoff: autoAssignHandoff,
                });
                const executePrompt = `${developmentContract}\n\n📋 执行任务：${task.title}\n${directTaskText}\n\n请直接完成开发工作。完成后必须追加 CCM_AGENT_RECEIPT 结构化回执。`;
                const changeSnapshot = workDir ? ctx.createFileChangeSnapshot(workDir) : null;
                let autoAssignNativeSessionId = "";
                let autoAssignNativeContinuationEvidence = null;
                let autoAssignNativeModelCapabilityReceipt = null;
                let autoAssignModelCapabilityRecord = null;
                let autoAssignProviderMemoryChannelEvidence = null;
                let autoAssignMemoryContextConsumptionReceipt = null;
                let autoAssignMemoryContextConsumptionRecovery = null;
                let autoAssignSucceeded = true;
                let autoAssignError = "";
                let autoAssignRunnerRequestId = "";
                let autoAssignRunnerStarted = false;
                const autoAssignRenderedPrompt = `${toolContext.prompt}${runtimeToolContext.prompt}\n\n${executePrompt}`;
                let autoAssignMemoryContextSnapshot = null;
                if (autoAssignTaskSession) {
                    const bound = (0, agent_sessions_1.bindTaskAgentMemoryContextSnapshot)(autoAssignTaskSession.id, {
                        taskId: task.id,
                        groupId: autoAssignGroupId,
                        project: task.target_project,
                        agentType,
                        nativeSessionId: autoAssignTaskSession.nativeSessionId || "",
                        turn: autoAssignMemoryDeliveryAttemptSequence,
                        executionId: task.id,
                        traceId: task.trace_id || "",
                        workerContextPacket: autoAssignHandoff.worker_context_packet,
                        workerHandoff: autoAssignHandoff,
                        memoryContext: autoAssignGroupMemoryContext,
                        renderedHandoff: developmentContract,
                        renderedPrompt: autoAssignRenderedPrompt,
                        renderedMemoryContext: String(autoAssignGroupMemoryContext?.rendered_text || ""),
                        requireMemoryPromptInjectionProof: true,
                        requireTrustedMemoryPromptEnvelope: true,
                        requireProviderMemoryChannelAcknowledgement: true,
                        requireMemoryContextConsumptionReceipt: !!autoAssignMemoryConsumptionChallenge,
                        memoryContextConsumptionChallenge: autoAssignMemoryConsumptionChallenge,
                        runtimeToolSnapshot: (0, collaboration_1.runtimeToolSnapshotFromAudit)(runtimeToolContext.audit, toolContext.allowedTools),
                        invocationLineage: autoAssignInvocationEdge,
                    });
                    autoAssignMemoryContextSnapshot = bound?.snapshot || null;
                }
                const autoAssignTypedMemoryDispatchAdmission = (0, memory_1.admitChildTypedMemoryDelivery)(autoAssignGroupMemoryContext, {
                    workerContextPacket: autoAssignHandoff.worker_context_packet,
                    renderedPrompt: autoAssignRenderedPrompt,
                    attemptSequence: autoAssignMemoryDeliveryAttemptSequence,
                });
                if (autoAssignTypedMemoryDispatchAdmission.admitted !== true) {
                    throw new Error(`类型化记忆 dispatch-time consume 门禁未通过：${autoAssignTypedMemoryDispatchAdmission.reason || "unknown"}`);
                }
                const autoAssignTypedMemoryDispatchStartedAt = new Date().toISOString();
                const autoAssignTypedMemoryDispatchWal = (0, memory_1.createChildTypedMemoryDispatchWal)(autoAssignTypedMemoryDispatchAdmission, {
                    memoryBundle: autoAssignGroupMemoryContext,
                    workerContextPacket: autoAssignHandoff.worker_context_packet,
                    renderedPrompt: autoAssignRenderedPrompt,
                    snapshotRenderedPrompt: autoAssignRenderedPrompt,
                    executionId: task.id,
                    capacityRevalidationProof: autoAssignCapacityRevalidationPreparation?.proof || null,
                });
                let autoAssignTypedMemoryDispatchWalRecord = (0, memory_1.markChildTypedMemoryDispatchStarted)(autoAssignTypedMemoryDispatchWal, {
                    dispatchStartedAt: autoAssignTypedMemoryDispatchStartedAt,
                    transport: agentType,
                });
                if (!autoAssignCapacityRevalidationCommitted && autoAssignTaskSession && autoAssignCapacityRevalidationPreparation?.proof && autoAssignTypedMemoryDispatchWalRecord) {
                    const capacityCommit = (0, agent_sessions_1.commitTaskAgentSessionCapacityRevalidation)(autoAssignTaskSession.id, autoAssignCapacityRevalidationPreparation.proof, {
                        typedMemoryDispatchWalRecordChecksum: autoAssignTypedMemoryDispatchWalRecord.record_checksum,
                        typedMemoryDispatchWalState: autoAssignTypedMemoryDispatchWalRecord.state,
                    });
                    if (capacityCommit?.acknowledged !== true)
                        throw new Error(`模型容量下降门禁提交失败：${capacityCommit?.reason || "capacity_revalidation_commit_failed"}`);
                    autoAssignTaskSession = capacityCommit.session || autoAssignTaskSession;
                    autoAssignCapacityRevalidationCommitted = true;
                    if (autoAssignPendingCapacityGate) {
                        (0, logs_1.addTaskLog)(task.id, "info", `${task.target_project} 已按下降后的模型容量重建并压缩上下文包，且已绑定 durable dispatch`);
                        (0, logs_1.appendTaskTimelineEvent)(task.id, {
                            type: "task_agent_capacity_revalidated",
                            title: `${task.target_project} 容量降级上下文已重建`,
                            detail: `${autoAssignPendingCapacityGate.previous_context_window || 0} -> ${autoAssignPendingCapacityGate.current_context_window || 0} token`,
                            status: "ok",
                            phase: "dispatching",
                            agent: task.target_project,
                            data: {
                                capacity_downgrade_gate: autoAssignPendingCapacityGate,
                                capacity_revalidation_proof: autoAssignCapacityRevalidationPreparation.proof,
                                capacity_revalidation_commit_receipt: capacityCommit.receipt,
                                worker_context_packet_id: autoAssignHandoff.worker_context_packet?.packet_id || "",
                            },
                        });
                    }
                }
                if (autoAssignInvocationEdge) {
                    autoAssignInvocationEdge = (0, task_agent_invocation_lineage_1.bindTaskAgentInvocationContext)(autoAssignInvocationEdge, {
                        workerContextPacketId: autoAssignHandoff.worker_context_packet?.packet_id || "",
                        memoryContextSnapshotId: autoAssignMemoryContextSnapshot?.snapshot_id || "",
                        memoryContextSnapshotChecksum: autoAssignMemoryContextSnapshot?.checksum || "",
                        groupSessionMemoryBinding: autoAssignMemoryContextSnapshot?.context?.group_session_memory_binding || null,
                        summaryCapsuleChecksum: autoAssignHandoff.worker_context_packet?.post_turn_summary_delivery_capsule?.capsule_checksum || "",
                        typedMemoryDeliveryCapsule: autoAssignHandoff.worker_context_packet?.typed_memory_delivery_capsule || null,
                        renderedPrompt: autoAssignRenderedPrompt,
                    });
                    autoAssignInvocationEdge = (0, task_agent_invocation_lineage_1.dispatchTaskAgentInvocationEdge)(autoAssignInvocationEdge, {
                        transport: agentType,
                        dispatchedAt: autoAssignTypedMemoryDispatchStartedAt,
                        dispatchTicketId: autoAssignTypedMemoryDispatchAdmission.ticket?.ticket_id || "",
                        dispatchTicketChecksum: autoAssignTypedMemoryDispatchAdmission.ticket?.ticket_checksum || "",
                        typedMemoryDispatchWalFile: autoAssignTypedMemoryDispatchWalRecord?.file || "",
                        typedMemoryDispatchWalRecordChecksum: autoAssignTypedMemoryDispatchWalRecord?.record_checksum || "",
                        typedMemoryDispatchWalState: autoAssignTypedMemoryDispatchWalRecord?.state || "",
                        platformDispatchId: autoAssignTypedMemoryDispatchWalRecord?.platform_dispatch_id || "",
                    });
                }
                const taskResult = await ctx.callAgent(task.target_project, autoAssignRenderedPrompt, workDir, agentType, 300000, {
                    tab: autoAssignGroupId ? "groups" : "projects",
                    groupId: autoAssignGroupId,
                    project: task.target_project,
                    allowedTools: toolContext.allowedTools,
                    mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
                    runtimeToolSnapshot: (0, collaboration_1.runtimeToolSnapshotFromAudit)(runtimeToolContext.audit, toolContext.allowedTools),
                    runtimeToolDispatchGate: runtimeToolContext.dispatchGate,
                    taskId: task.id,
                    executionId: task.id,
                    model: autoAssignTaskSession?.modelId || "",
                    taskAgentSessionId: autoAssignTaskSession?.id || "",
                    trustedMemoryProviderChannelRequired: autoAssignMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_bound === true,
                    trustedMemoryProviderAcknowledgementRequired: autoAssignMemoryContextSnapshot?.context?.provider_memory_channel_acknowledgement_required === true,
                    memoryContextConsumptionReceiptRequired: autoAssignMemoryContextSnapshot?.context?.memory_context_consumption_receipt_required === true,
                    memoryContextConsumptionChallenge: autoAssignMemoryContextSnapshot?.context?.memory_context_consumption_challenge || null,
                    trustedMemoryEnvelopeChecksum: autoAssignMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_checksum || "",
                    trustedMemoryEnvelopeSourceChecksum: autoAssignMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_source_checksum || "",
                    ...(0, collaboration_1.taskAgentSessionLifecycleRunnerOptions)(autoAssignMemoryContextSnapshot),
                    agentSession: autoAssignTaskSession ? (0, agent_sessions_1.getTaskAgentSessionOptions)(autoAssignTaskSession) : null,
                    durableDispatch: autoAssignTypedMemoryDispatchAdmission.required === true
                        || autoAssignCapacityRevalidationPreparation?.required === true
                        || autoAssignMemoryContextSnapshot?.context?.memory_prompt_injection_proof?.trusted_envelope_bound === true,
                    onRunnerRequestCreated: (requestId) => {
                        autoAssignRunnerRequestId = String(requestId || "");
                        if (autoAssignTypedMemoryDispatchWalRecord && autoAssignRunnerRequestId) {
                            autoAssignTypedMemoryDispatchWalRecord = (0, memory_1.markChildTypedMemoryDispatchStarted)({ required: true, record: autoAssignTypedMemoryDispatchWalRecord }, {
                                dispatchStartedAt: autoAssignTypedMemoryDispatchStartedAt,
                                transport: autoAssignRunnerRequestId.startsWith("adr_") ? "server_direct_cli" : "external_runner",
                                runnerRequestId: autoAssignRunnerRequestId,
                            });
                        }
                        if (autoAssignInvocationEdge && autoAssignRunnerRequestId) {
                            autoAssignInvocationEdge = (0, task_agent_invocation_lineage_1.bindTaskAgentInvocationRunnerRequest)(autoAssignInvocationEdge, autoAssignRunnerRequestId, {
                                typedMemoryDispatchWalRecordChecksum: autoAssignTypedMemoryDispatchWalRecord?.record_checksum || "",
                                typedMemoryDispatchWalState: autoAssignTypedMemoryDispatchWalRecord?.state || "",
                            });
                        }
                    },
                    onDone: (opts) => {
                        autoAssignNativeSessionId = String(opts?.nativeSessionId || "");
                        autoAssignNativeContinuationEvidence = opts?.nativeContinuationEvidence || null;
                        autoAssignNativeModelCapabilityReceipt = opts?.nativeModelCapabilityReceipt || null;
                        autoAssignModelCapabilityRecord = opts?.nativeModelCapabilityRecord || null;
                        if (opts?.providerMemoryChannelEvidence?.required === true)
                            autoAssignProviderMemoryChannelEvidence = opts.providerMemoryChannelEvidence;
                        if (opts?.memoryContextConsumptionReceipt)
                            autoAssignMemoryContextConsumptionReceipt = opts.memoryContextConsumptionReceipt;
                        if (opts?.memoryContextConsumptionRecovery)
                            autoAssignMemoryContextConsumptionRecovery = opts.memoryContextConsumptionRecovery;
                        autoAssignSucceeded = opts?.isError !== true;
                        autoAssignError = String(opts?.error || opts?.message || "");
                        autoAssignRunnerRequestId = String(opts?.runnerRequestId || autoAssignRunnerRequestId || "");
                        autoAssignRunnerStarted = opts?.runnerStarted === true;
                    },
                });
                if (!autoAssignCapacityRevalidationCommitted && autoAssignTaskSession && autoAssignCapacityRevalidationPreparation?.proof) {
                    const capacityCommit = (0, agent_sessions_1.commitTaskAgentSessionCapacityRevalidation)(autoAssignTaskSession.id, autoAssignCapacityRevalidationPreparation.proof, {
                        runnerRequestId: autoAssignRunnerRequestId,
                        runnerStarted: autoAssignRunnerStarted,
                    });
                    if (capacityCommit?.acknowledged !== true)
                        throw new Error(`模型容量下降门禁缺少 durable dispatch 证明：${capacityCommit?.reason || "capacity_revalidation_commit_failed"}`);
                    autoAssignTaskSession = capacityCommit.session || autoAssignTaskSession;
                    autoAssignCapacityRevalidationCommitted = true;
                    if (autoAssignPendingCapacityGate) {
                        (0, logs_1.addTaskLog)(task.id, "info", `${task.target_project} 已按下降后的模型容量重建并压缩上下文包，且已绑定 runner return`);
                        (0, logs_1.appendTaskTimelineEvent)(task.id, {
                            type: "task_agent_capacity_revalidated",
                            title: `${task.target_project} 容量降级上下文已重建`,
                            detail: `${autoAssignPendingCapacityGate.previous_context_window || 0} -> ${autoAssignPendingCapacityGate.current_context_window || 0} token`,
                            status: "ok",
                            phase: "executing",
                            agent: task.target_project,
                            data: {
                                capacity_downgrade_gate: autoAssignPendingCapacityGate,
                                capacity_revalidation_proof: autoAssignCapacityRevalidationPreparation.proof,
                                capacity_revalidation_commit_receipt: capacityCommit.receipt,
                                worker_context_packet_id: autoAssignHandoff.worker_context_packet?.packet_id || "",
                            },
                        });
                    }
                }
                if (autoAssignInvocationEdge) {
                    const autoAssignFailed = !autoAssignSucceeded || (0, agent_receipts_1.checkTaskFailure)(taskResult);
                    autoAssignInvocationEdge = (0, task_agent_invocation_lineage_1.completeTaskAgentInvocationEdge)(autoAssignInvocationEdge, {
                        success: !autoAssignFailed,
                        nativeSessionId: autoAssignNativeSessionId || autoAssignTaskSession?.nativeSessionId || "",
                        nativeContinuationEvidence: autoAssignNativeContinuationEvidence,
                        nativeModelCapabilityReceipt: autoAssignNativeModelCapabilityReceipt,
                        nativeModelCapabilityRecord: autoAssignModelCapabilityRecord,
                        provider: agentType,
                        runnerRequestId: autoAssignRunnerRequestId,
                        output: taskResult,
                        error: autoAssignError,
                        reason: autoAssignFailed ? "execution_failed" : "execution_completed",
                    });
                }
                let autoAssignMemoryContextDelivery = null;
                if (autoAssignTypedMemoryDispatchWalRecord && autoAssignRunnerStarted) {
                    autoAssignTypedMemoryDispatchWalRecord = (0, memory_1.markChildTypedMemoryRunnerReturned)(autoAssignTypedMemoryDispatchWalRecord, {
                        runnerRequestId: autoAssignRunnerRequestId,
                        runnerSucceeded: autoAssignSucceeded,
                        output: taskResult,
                    });
                }
                const autoAssignFileChanges = workDir ? ctx.getFileChanges(task.target_project, changeSnapshot) : null;
                if (autoAssignTaskSession && autoAssignMemoryContextSnapshot) {
                    const delivery = (0, agent_sessions_1.recordTaskAgentMemoryContextDelivery)(autoAssignTaskSession.id, {
                        snapshotId: autoAssignMemoryContextSnapshot.snapshot_id || autoAssignTaskSession.memoryContextSnapshotId || "",
                        renderedPrompt: autoAssignRenderedPrompt,
                        snapshotRenderedPrompt: autoAssignRenderedPrompt,
                        executionId: task.id,
                        traceId: task.trace_id || "",
                        runtime: agentType,
                        attempt: autoAssignMemoryDeliveryAttemptSequence,
                        nativeSessionId: autoAssignNativeSessionId || autoAssignTaskSession.nativeSessionId || "",
                        runnerRequestId: autoAssignRunnerRequestId,
                        dispatched: autoAssignRunnerStarted,
                        executionSucceeded: autoAssignSucceeded,
                        output: taskResult,
                        fileChanges: autoAssignFileChanges,
                        nativeContinuationEvidence: autoAssignNativeContinuationEvidence,
                        providerMemoryChannelEvidence: autoAssignProviderMemoryChannelEvidence,
                        memoryContextConsumptionReceipt: autoAssignMemoryContextConsumptionReceipt,
                        memoryContextConsumptionRecovery: autoAssignMemoryContextConsumptionRecovery,
                        runnerStarted: autoAssignRunnerStarted,
                        invocationEdgeId: autoAssignInvocationEdge?.invocation_edge_id || "",
                    });
                    autoAssignMemoryContextDelivery = delivery?.receipt || null;
                    if (autoAssignTypedMemoryDispatchWalRecord && autoAssignMemoryContextDelivery?.delivered === true) {
                        autoAssignTypedMemoryDispatchWalRecord = (0, memory_1.markChildTypedMemoryRunnerReturned)(autoAssignTypedMemoryDispatchWalRecord, {
                            runnerRequestId: autoAssignRunnerRequestId,
                            runnerSucceeded: autoAssignSucceeded,
                            output: taskResult,
                            deliveryReceipt: autoAssignMemoryContextDelivery,
                        });
                    }
                }
                if (autoAssignInvocationEdge) {
                    autoAssignInvocationEdge = (0, task_agent_invocation_lineage_1.bindTaskAgentInvocationMemoryDelivery)(autoAssignInvocationEdge, {
                        deliveryReceipt: autoAssignMemoryContextDelivery,
                    });
                }
                const autoAssignTypedMemoryDeliveryCommit = (0, memory_1.commitChildTypedMemoryDelivery)(autoAssignGroupMemoryContext, {
                    workerContextPacket: autoAssignHandoff.worker_context_packet,
                    dispatchEvidence: {
                        renderedPrompt: autoAssignRenderedPrompt,
                        deliveryReceipt: autoAssignMemoryContextDelivery,
                        dispatchTicket: autoAssignTypedMemoryDispatchAdmission.ticket,
                        dispatchStartedAt: autoAssignTypedMemoryDispatchStartedAt,
                        dispatched: autoAssignRunnerStarted,
                        executionReturned: autoAssignRunnerStarted,
                    },
                });
                if (autoAssignTypedMemoryDeliveryCommit.committed === true) {
                    (0, logs_1.addTaskLog)(task.id, "info", `${task.target_project} 自动派发类型化记忆投递租约已提交：${autoAssignTypedMemoryDeliveryCommit.lease?.leaseId || "unknown"}`);
                }
                if (autoAssignTypedMemoryDispatchWalRecord && autoAssignRunnerStarted && autoAssignMemoryContextDelivery?.delivered === true) {
                    autoAssignTypedMemoryDispatchWalRecord = (0, memory_1.markChildTypedMemoryDispatchCommitted)(autoAssignTypedMemoryDispatchWalRecord, autoAssignTypedMemoryDeliveryCommit);
                }
                if (autoAssignTaskSession) {
                    autoAssignTaskSession = (0, agent_sessions_1.recordTaskAgentSessionTurn)(autoAssignTaskSession.id, {
                        nativeSessionId: autoAssignNativeSessionId,
                        nativeContinuationEvidence: autoAssignNativeContinuationEvidence,
                        nativeContinuationUnverified: autoAssignNativeContinuationEvidence?.nativeResumeRequested === true
                            && autoAssignNativeContinuationEvidence?.nativeContinuationAcknowledged !== true,
                        success: autoAssignSucceeded,
                        error: autoAssignError || (!autoAssignSucceeded ? taskResult : ""),
                        nativeModelCapabilityRecord: autoAssignModelCapabilityRecord,
                        runtimeToolSnapshot: (0, collaboration_1.runtimeToolSnapshotFromAudit)(runtimeToolContext.audit, toolContext.allowedTools),
                    }) || autoAssignTaskSession;
                }
                const fileChanges = autoAssignFileChanges;
                const execution = (0, collaboration_1.getTaskExecutionFromReceipt)(taskResult, (0, agent_receipts_1.extractAgentReceipt)(taskResult, task.target_project), { fileChanges });
                const isCompleted = execution.status === "done";
                const legacyDeliverySummary = (0, collaboration_1.buildDeliverySummary)(task, execution, isCompleted ? "done" : "waiting");
                const updatedTask = (0, collaboration_1.updateTask)(task_id, {
                    status: isCompleted ? "done" : "in_progress",
                    result: taskResult.substring(0, 500),
                    final_report: execution.report || taskResult,
                    status_detail: execution.detail || (isCompleted ? "验收通过" : "等待补充信息或返工"),
                    receipt: execution.receipt || null,
                    file_changes: execution.fileChanges || null,
                    delivery_summary: legacyDeliverySummary,
                }) || { ...task, status: isCompleted ? "done" : "in_progress", delivery_summary: legacyDeliverySummary, status_detail: execution.detail || (isCompleted ? "验收通过" : "等待补充信息或返工") };
                if (autoAssignGroupId) {
                    (0, collaboration_1.appendLegacyTaskExecutionGroupReport)({
                        groupId: autoAssignGroupId,
                        task: updatedTask,
                        status: isCompleted ? "done" : "waiting",
                        detail: execution.detail || (isCompleted ? "验收通过" : "等待补充信息或返工"),
                        rawResult: taskResult,
                        fileChanges,
                    });
                }
                (0, utils_1.sendJson)(res, { success: true, task, completed: isCompleted, result: taskResult });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/tasks/auto-execute-all" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const tasks = (0, db_1.loadTasks)().filter(t => t.status === "pending");
                if (tasks.length === 0) {
                    return (0, utils_1.sendJson)(res, { success: true, message: "没有待执行的任务" });
                }
                const results = tasks.map(task => ({
                    task_id: task.id,
                    title: task.title,
                    ...(0, collaboration_1.enqueueTask)(task.id, ctx)
                }));
                const queuedCount = results.filter(r => r.queued).length;
                (0, utils_1.sendJson)(res, {
                    success: true,
                    message: `${queuedCount}/${tasks.length} 个任务已加入队列`,
                    results,
                    queue_status: (0, collaboration_1.getQueueStatus)()
                });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/review" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", async () => {
            try {
                const { group_id, project, diff, reviewers } = JSON.parse(body);
                if (!diff)
                    return (0, utils_1.sendJson)(res, { error: "请提供代码变更内容" }, 400);
                const configs = (0, db_1.getConfigs)();
                const reviewPrompt = `请审查以下代码变更，从你的专业角度给出意见：

项目：${project}
代码变更：
\`\`\`
${diff}
\`\`\`

请从以下角度审查：
1. 代码质量
2. 潜在 bug
3. 安全问题
4. 性能影响
5. 与你的项目的兼容性

返回 JSON 格式：
{
  "issues": [
    {
      "severity": "high/medium/low",
      "description": "问题描述",
      "suggestion": "修改建议"
    }
  ],
  "overall": "总体评价"
}`;
                const reviewResults = [];
                const reviewGroup = group_id ? (0, storage_1.loadGroups)().find(g => g.id === group_id) : null;
                for (const reviewer of (reviewers || [])) {
                    const config = configs.find(c => c.name === reviewer);
                    if (!config)
                        continue;
                    const info = (0, db_1.getConfigInfo)(config.path);
                    const workDir = info[0]?.workDir;
                    const agentType = info[0]?.agent || "claudecode";
                    try {
                        const toolContext = (0, collaboration_1.buildAgentToolContext)(ctx, reviewGroup, reviewer, reviewPrompt);
                        const runtimeToolContext = (0, collaboration_1.prepareAgentRuntimeTools)(group_id || "", reviewer, workDir, agentType, toolContext.allowedTools, null, {
                            toolAudit: toolContext.toolAudit,
                            authorizationReadiness: toolContext.authorizationReadiness,
                        });
                        (0, collaboration_1.assertRuntimeToolDispatchReady)(reviewer, runtimeToolContext);
                        const result = await ctx.callAgent(reviewer, `${toolContext.prompt}${runtimeToolContext.prompt}\n\n${reviewPrompt}`, workDir, agentType, 120000, {
                            tab: group_id ? "groups" : "projects",
                            groupId: group_id,
                            project: reviewer,
                            allowedTools: toolContext.allowedTools,
                            mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
                            runtimeToolSnapshot: (0, collaboration_1.runtimeToolSnapshotFromAudit)(runtimeToolContext.audit, toolContext.allowedTools),
                            runtimeToolDispatchGate: runtimeToolContext.dispatchGate,
                        });
                        reviewResults.push({ reviewer, result });
                    }
                    catch (e) {
                        reviewResults.push({ reviewer, error: e.message });
                    }
                }
                if (group_id) {
                    const groups = (0, storage_1.loadGroups)();
                    const group = groups.find(g => g.id === group_id);
                    const coordinator = group ? (0, group_orchestrator_1.getCoordinatorMember)(group) : { project: "coordinator" };
                    (0, collaboration_1.appendLegacyCodeReviewGroupReport)({
                        groupId: group_id,
                        project,
                        coordinator: coordinator.project,
                        reviewResults,
                    });
                }
                (0, utils_1.sendJson)(res, { success: true, reviews: reviewResults });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 500);
            }
        });
        return true;
    }
    if (pathname === "/api/collaboration/stats" && req.method === "GET") {
        const tasks = (0, db_1.loadTasks)();
        const groups = (0, storage_1.loadGroups)();
        const stats = {
            total_tasks: tasks.length,
            pending_tasks: tasks.filter((t) => t.status === "pending").length,
            in_progress_tasks: tasks.filter((t) => t.status === "in_progress").length,
            done_tasks: tasks.filter((t) => t.status === "done").length,
            failed_tasks: tasks.filter((t) => t.status === "failed").length,
            completion_rate: tasks.length > 0 ? Math.round(tasks.filter((t) => t.status === "done").length / tasks.length * 100) : 0,
            groups_count: groups.length,
            recent_activities: []
        };
        for (const group of groups.slice(0, 3)) {
            const messages = (0, storage_1.getGroupMessages)(group.id).slice(-5);
            for (const msg of messages) {
                stats.recent_activities.push({
                    group: group.name,
                    agent: msg.agent || "user",
                    content: msg.content?.substring(0, 100),
                    timestamp: msg.timestamp
                });
            }
        }
        stats.recent_activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        stats.recent_activities = stats.recent_activities.slice(0, 10);
        (0, utils_1.sendJson)(res, stats);
        return true;
    }
    if (pathname === "/api/test/mentions" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => body += chunk);
        req.on("end", () => {
            try {
                const { text, group_id } = JSON.parse(body);
                let validMentions = [];
                if (group_id) {
                    const groups = (0, storage_1.loadGroups)();
                    const group = groups.find(g => g.id === group_id);
                    if (group) {
                        validMentions = (0, collaboration_1.extractActionableMentions)(text, group, "");
                    }
                }
                (0, utils_1.sendJson)(res, {
                    success: true,
                    input: text,
                    valid_mentions: validMentions.map(m => m.mention),
                    extracted_messages: validMentions.map(m => ({ mention: m.mention, target: m.targetName, message: m.message }))
                });
            }
            catch (e) {
                (0, utils_1.sendJson)(res, { error: e.message }, 400);
            }
        });
        return true;
    }
    if ((0, feishu_routes_1.handleFeishuRoutes)(req, res, parsed))
        return true;
    return false;
}
//# sourceMappingURL=collaboration-routes.js.map