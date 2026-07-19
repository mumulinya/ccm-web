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
exports.runAgentCliProbe = runAgentCliProbe;
exports.taskRequiresAgentQa = taskRequiresAgentQa;
exports.getTaskAgentQaGate = getTaskAgentQaGate;
exports.runRuntimeFallbackProbe = runRuntimeFallbackProbe;
exports.normalizeStringArray = normalizeStringArray;
exports.buildEvidenceGateFollowUps = buildEvidenceGateFollowUps;
exports.isReviewLikeAgentName = isReviewLikeAgentName;
exports.inferIndependentReviewSubject = inferIndependentReviewSubject;
exports.getReceiptTestAgentHandoff = getReceiptTestAgentHandoff;
exports.getReceiptIndependentReviewSubject = getReceiptIndependentReviewSubject;
exports.findLatestTestAgentReviewReceipt = findLatestTestAgentReviewReceipt;
exports.buildTestAgentReviewRecheckFollowUp = buildTestAgentReviewRecheckFollowUp;
exports.buildIndependentReviewGateFollowUps = buildIndependentReviewGateFollowUps;
exports.buildFailedIndependentReviewReworkFollowUps = buildFailedIndependentReviewReworkFollowUps;
exports.buildPostReviewSpotCheckFollowUps = buildPostReviewSpotCheckFollowUps;
exports.buildCodedCoordinatorReview = buildCodedCoordinatorReview;
exports.writeSse = writeSse;
exports.emitAssignmentStatus = emitAssignmentStatus;
// Behavior-freeze split from collaboration-runtime-daily-dev.ts (part 2/2).
// Behavior-freeze split from collaboration-runtime.ts (part 3/9).
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const db_1 = require("../../core/db");
const group_orchestrator_1 = require("./group-orchestrator");
const memory_1 = require("./memory");
const agent_qa_service_1 = require("./agent-qa-service");
const post_review_spot_check_1 = require("../../agents/post-review-spot-check");
const runtime_1 = require("../../agents/runtime");
const collaboration_resilience_1 = require("./collaboration-resilience");
const collaboration_runtime_task_queue_1 = require("./collaboration-runtime-task-queue");
const collaboration_runtime_status_helpers_1 = require("./collaboration-runtime-status-helpers");
const collaboration_runtime_cross_agent_runtime_1 = require("./collaboration-runtime-cross-agent-runtime");
const collaboration_runtime_plan_tools_1 = require("./collaboration-runtime-plan-tools");
const collaboration_runtime_runtime_tools_1 = require("./collaboration-runtime-runtime-tools");
const collaboration_runtime_daily_dev_part_01_1 = require("./collaboration-runtime-daily-dev-part-01");
async function runAgentCliProbe(payload, ctx) {
    const target = (0, collaboration_runtime_daily_dev_part_01_1.selectDailyDevSmokeTarget)(payload);
    const selectedProject = target.selectedMember.project;
    const runtime = (0, group_orchestrator_1.resolveMemberRuntime)(selectedProject, target.group, (0, db_1.getConfigs)());
    if (!runtime?.workDir)
        throw new Error("未找到探针目标 Agent 的工作目录");
    const requestedAgentType = String(payload.agent_type || payload.agentType || "").trim().toLowerCase();
    const requestedRuntime = requestedAgentType
        ? (0, runtime_1.getPublicAgentRuntimes)().find((item) => item.id === requestedAgentType || item.aliases?.includes(requestedAgentType))
        : null;
    if (requestedAgentType && !requestedRuntime)
        throw new Error(`不支持的 Agent Runtime：${requestedAgentType}`);
    const agentType = requestedRuntime?.id || (0, runtime_1.normalizeAgentRuntimeId)(runtime.agentType || "claudecode");
    const probeTarget = {
        group_id: target.group.id,
        group_name: target.group.name || target.group.id,
        project: selectedProject,
        agent_type: agentType,
        work_dir: runtime.workDir,
    };
    const readiness = (0, collaboration_runtime_plan_tools_1.getAgentProbeExecutionReadiness)(probeTarget);
    if (!readiness.ready) {
        const fixActions = readiness.fix_actions || (0, collaboration_runtime_plan_tools_1.buildAgentExecutionFixActions)({ error: readiness.message, probe: readiness.probe, agentType });
        const result = {
            success: false,
            blocked: true,
            message: readiness.message,
            error: readiness.message,
            fix_actions: fixActions,
            target: probeTarget,
            execution_path: readiness.mode,
            expected_marker: "CCM_AGENT_PROBE_OK",
            readiness,
        };
        (0, collaboration_runtime_plan_tools_1.writeAgentProbeStatus)(result);
        return result;
    }
    const started = Date.now();
    const capabilityWrite = payload.capability_write !== false && payload.capabilityWrite !== false;
    const writeToken = `CCM_WRITE_OK_${crypto.randomBytes(6).toString("hex")}`;
    const writeFileName = `.ccm-permission-probe-${Date.now()}-${crypto.randomBytes(3).toString("hex")}.tmp`;
    const writeFilePath = path.join(runtime.workDir, writeFileName);
    const verifyWriteCapability = () => {
        if (!capabilityWrite)
            return { requested: false, pass: true, file: "", reason: "只读连通性探针" };
        try {
            const content = fs.existsSync(writeFilePath) ? fs.readFileSync(writeFilePath, "utf-8").trim() : "";
            return { requested: true, pass: content === writeToken, file: writeFileName, reason: content === writeToken ? "项目内写入握手通过" : "Agent 未能在项目目录写入握手文件" };
        }
        catch (error) {
            return { requested: true, pass: false, file: writeFileName, reason: `读取握手文件失败：${error?.message || error}` };
        }
    };
    const cleanupWriteProbe = () => { try {
        if (fs.existsSync(writeFilePath))
            fs.unlinkSync(writeFilePath);
    }
    catch { } };
    const prompt = capabilityWrite ? [
        "MANDATORY CCM EXECUTION PROBE.",
        "This is an execution task, not a chat acknowledgement. Do not explain, summarize, or say that you understand.",
        `Current working directory: ${runtime.workDir}`,
        `Create a file named ${writeFileName} in the current working directory.`,
        "The file content must be exactly this single line:",
        writeToken,
        "Do not modify any other file. Do not delete the probe file.",
        "After the file has been written successfully, print exactly this single line and nothing else:",
        "CCM_AGENT_PROBE_OK",
    ].join("\n") : [
        "MANDATORY CCM EXECUTION PROBE.",
        "This is a CLI health probe, not a chat acknowledgement. Do not explain, summarize, or say that you understand.",
        "Do not modify files and do not run write commands.",
        "Print exactly this single line and nothing else:",
        "CCM_AGENT_PROBE_OK",
    ].join("\n");
    try {
        const toolContext = (0, collaboration_runtime_plan_tools_1.buildAgentToolContext)(ctx, target.group, selectedProject);
        const runtimeToolContext = (0, collaboration_runtime_runtime_tools_1.prepareAgentRuntimeTools)(target.group.id, selectedProject, runtime.workDir, agentType, toolContext.allowedTools, null, {
            toolAudit: toolContext.toolAudit,
            authorizationReadiness: toolContext.authorizationReadiness,
        });
        if (runtimeToolContext.dispatchBlocked) {
            cleanupWriteProbe();
            const message = (0, collaboration_runtime_runtime_tools_1.runtimeToolDispatchBlockedMessage)(selectedProject, runtimeToolContext);
            const result = {
                success: false,
                blocked: true,
                message,
                error: message,
                fix_actions: (0, collaboration_runtime_plan_tools_1.buildAgentExecutionFixActions)({ error: message, agentType }),
                execution_path: readiness.mode,
                expected_marker: "CCM_AGENT_PROBE_OK",
                target: probeTarget,
                duration_ms: Date.now() - started,
                output: "",
                readiness,
                runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate,
            };
            (0, collaboration_runtime_plan_tools_1.writeAgentProbeStatus)(result);
            return result;
        }
        const timeoutMs = Math.max(15000, Math.min(300000, Number(payload.timeout_ms || payload.timeoutMs || 120000)));
        if (payload.native_session || payload.nativeSession) {
            const probeTaskId = `native-probe-${agentType}-${Date.now()}`;
            let nativeSessionId = agentType === "claudecode" ? crypto.randomUUID() : "";
            let firstErrored = false;
            const firstMarker = "CCM_NATIVE_SESSION_ROUND_1_OK";
            const firstOutput = await ctx.callAgentForGroupStream(selectedProject, `${prompt}\n本轮改为只回复一行：${firstMarker}`, runtime.workDir, agentType, {
                groupId: target.group.id,
                timeoutMs,
                allowedTools: toolContext.allowedTools,
                mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
                runtimeToolSnapshot: (0, collaboration_runtime_task_queue_1.runtimeToolSnapshotFromAudit)(runtimeToolContext.audit, toolContext.allowedTools),
                runtimeToolDispatchGate: runtimeToolContext.dispatchGate,
                taskId: probeTaskId,
                agentSession: { persistSession: true, sessionId: nativeSessionId, resumeSession: false },
                onDone: (opts) => {
                    firstErrored = opts.isError === true;
                    nativeSessionId = String(opts.nativeSessionId || nativeSessionId || "");
                },
            });
            const writeCapability = verifyWriteCapability();
            cleanupWriteProbe();
            const firstOk = !firstErrored && firstOutput.includes(firstMarker) && !!nativeSessionId && writeCapability.pass;
            let secondErrored = false;
            const secondMarker = "CCM_NATIVE_SESSION_ROUND_2_OK";
            const secondOutput = firstOk
                ? await ctx.callAgentForGroupStream(selectedProject, `继续同一个健康探针会话。不要修改文件，只回复一行：${secondMarker}`, runtime.workDir, agentType, {
                    groupId: target.group.id,
                    timeoutMs,
                    allowedTools: toolContext.allowedTools,
                    mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
                    runtimeToolSnapshot: (0, collaboration_runtime_task_queue_1.runtimeToolSnapshotFromAudit)(runtimeToolContext.audit, toolContext.allowedTools),
                    runtimeToolDispatchGate: runtimeToolContext.dispatchGate,
                    taskId: probeTaskId,
                    agentSession: { persistSession: true, sessionId: nativeSessionId, resumeSession: true },
                    onDone: (opts) => { secondErrored = opts.isError === true; },
                })
                : "";
            const ok = firstOk && !secondErrored && secondOutput.includes(secondMarker);
            const outputFailure = (0, collaboration_runtime_plan_tools_1.getAgentProbeOutputFailure)(firstOutput || secondOutput);
            const explicitPermissionDrift = /(?:sandbox|沙箱).{0,24}(?:read[- ]?only|只读)|blocked by policy|写入.{0,20}(?:拦截|阻止)/i.test(String(firstOutput || secondOutput || ""));
            const nativeFailureMessage = !writeCapability.pass && explicitPermissionDrift
                ? `Agent 实际文件权限与任务声明不一致：${writeCapability.reason}`
                : (!writeCapability.pass && outputFailure.error !== "empty_output"
                    ? outputFailure.message
                    : (!writeCapability.pass ? `Agent 未完成项目写入握手：${writeCapability.reason}` : "Agent 原生会话两轮续跑探针失败"));
            const result = {
                success: ok,
                blocked: false,
                message: ok ? "Agent 原生会话两轮续跑与项目写入握手通过" : nativeFailureMessage,
                error: ok ? "" : (!writeCapability.pass && !explicitPermissionDrift ? outputFailure.error : (!writeCapability.pass ? writeCapability.reason : (0, memory_1.compactMemoryText)(firstOutput || secondOutput || "未捕获探针输出", 500))),
                fix_actions: ok ? [] : (0, collaboration_runtime_plan_tools_1.buildAgentExecutionFixActions)({ error: firstOutput || secondOutput, agentType }),
                execution_path: readiness.mode,
                expected_marker: secondMarker,
                target: probeTarget,
                duration_ms: Date.now() - started,
                native_session: { captured: !!nativeSessionId, session_id: nativeSessionId, first_round: firstOk, second_round: !secondErrored && secondOutput.includes(secondMarker) },
                capabilities: { filesystem: capabilityWrite ? (writeCapability.pass ? "workspace_write" : "read_only") : "read_only", write: writeCapability },
                output: (0, memory_1.compactMemoryText)(secondOutput || firstOutput, 1000),
                readiness,
            };
            (0, collaboration_runtime_plan_tools_1.writeAgentProbeStatus)(result);
            return result;
        }
        const callProbeAgent = (probePrompt) => ctx.callAgent(selectedProject, probePrompt, runtime.workDir, agentType, Number(payload.timeout_ms || payload.timeoutMs || 120000), {
            tab: "groups",
            groupId: target.group.id,
            project: selectedProject,
            probe: true,
            allowedTools: toolContext.allowedTools,
            mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
            runtimeToolSnapshot: (0, collaboration_runtime_task_queue_1.runtimeToolSnapshotFromAudit)(runtimeToolContext.audit, toolContext.allowedTools),
            runtimeToolDispatchGate: runtimeToolContext.dispatchGate,
        });
        let probeAttempts = 1;
        let output = await callProbeAgent(prompt);
        let writeCapability = verifyWriteCapability();
        if ((!/CCM_AGENT_PROBE_OK/i.test(output) || !writeCapability.pass) && payload.disable_probe_retry !== true && payload.disableProbeRetry !== true) {
            probeAttempts++;
            output = await callProbeAgent([
                prompt,
                "The previous probe attempt did not complete both required checks.",
                "Retry the file write now and only print the success marker after the exact file content exists.",
            ].join("\n"));
            writeCapability = verifyWriteCapability();
        }
        cleanupWriteProbe();
        const ok = /CCM_AGENT_PROBE_OK/i.test(output) && writeCapability.pass;
        const outputFailure = (0, collaboration_runtime_plan_tools_1.getAgentProbeOutputFailure)(output);
        const explicitPermissionDrift = /(?:sandbox|沙箱).{0,24}(?:read[- ]?only|只读)|blocked by policy|写入.{0,20}(?:拦截|阻止)/i.test(String(output || ""));
        const failure = ok ? null : (!writeCapability.pass && explicitPermissionDrift)
            ? { message: `Agent 实际文件权限与任务声明不一致：${writeCapability.reason}`, error: writeCapability.reason }
            : (!writeCapability.pass && outputFailure.error === "empty_output")
                ? { message: `Agent 未完成项目写入握手：${writeCapability.reason}`, error: writeCapability.reason }
                : outputFailure;
        const fixActions = ok ? [] : (0, collaboration_runtime_plan_tools_1.buildAgentExecutionFixActions)({
            error: failure?.error || failure?.message || output,
            agentType,
            probe: { target: { agent_type: agentType }, output, message: failure?.message, error: failure?.error },
        });
        const result = {
            success: ok,
            blocked: false,
            message: ok ? "Agent CLI 探针通过" : failure?.message,
            error: ok ? "" : failure?.error,
            fix_actions: fixActions,
            execution_path: readiness.mode,
            expected_marker: "CCM_AGENT_PROBE_OK",
            target: probeTarget,
            duration_ms: Date.now() - started,
            probe_attempts: probeAttempts,
            output: String(output || "").slice(0, 2000),
            capabilities: { filesystem: capabilityWrite ? (writeCapability.pass ? "workspace_write" : "read_only") : "read_only", write: writeCapability },
            readiness,
        };
        (0, collaboration_runtime_plan_tools_1.writeAgentProbeStatus)(result);
        return result;
    }
    catch (e) {
        cleanupWriteProbe();
        const fixActions = (0, collaboration_runtime_plan_tools_1.buildAgentExecutionFixActions)({
            error: e.message || String(e),
            agentType,
            probe: { target: { agent_type: agentType }, message: e.message || String(e), error: e.message || String(e) },
        });
        const result = {
            success: false,
            blocked: false,
            message: e.message || "Agent CLI 探针失败",
            error: e.message || String(e),
            fix_actions: fixActions,
            execution_path: readiness.mode,
            expected_marker: "CCM_AGENT_PROBE_OK",
            target: probeTarget,
            duration_ms: Date.now() - started,
            output: "",
            readiness,
        };
        (0, collaboration_runtime_plan_tools_1.writeAgentProbeStatus)(result);
        return result;
    }
}
function taskRequiresAgentQa(task) {
    if (task?.requires_agent_qa === false || task?.requiresAgentQa === false)
        return false;
    if (task?.requires_agent_qa === true || task?.requiresAgentQa === true)
        return true;
    const text = [task?.title, task?.description, task?.business_goal, task?.acceptance_criteria, task?.source_documents].filter(Boolean).join("\n");
    return /(?:必须|需要|要求).{0,24}(?:Agent[- ]?to[- ]?Agent|Agent\s*QA|ask_agent|子\s*Agent.{0,8}(?:询问|问答)|向.{0,16}Agent.{0,8}(?:提问|询问))/i.test(text);
}
function getTaskAgentQaGate(task) {
    const items = task?.group_id ? (0, agent_qa_service_1.getAgentQaItemsForGroup)(String(task.group_id), 200).filter((item) => item.task_id === task.id) : [];
    const accepted = items.filter((item) => item.acceptance?.accepted === true);
    const resumed = items.filter((item) => item.status === "resumed" || item.resumed_at);
    return {
        required: taskRequiresAgentQa(task),
        pass: !taskRequiresAgentQa(task) || (accepted.length > 0 && resumed.length > 0),
        total: items.length,
        accepted: accepted.length,
        resumed: resumed.length,
        qa_ids: items.map((item) => item.id).filter(Boolean),
    };
}
async function runRuntimeFallbackProbe(payload, ctx) {
    const target = (0, collaboration_runtime_daily_dev_part_01_1.selectDailyDevSmokeTarget)(payload);
    const selectedProject = target.selectedMember.project;
    const runtime = (0, group_orchestrator_1.resolveMemberRuntime)(selectedProject, target.group, (0, db_1.getConfigs)());
    if (!runtime?.workDir)
        throw new Error("未找到探针目标 Agent 的工作目录");
    const normalizeRequestedRuntime = (value, fallback) => {
        const requested = String(value || fallback).trim().toLowerCase();
        const descriptor = (0, runtime_1.getPublicAgentRuntimes)().find((item) => item.id === requested || item.aliases?.includes(requested));
        if (!descriptor)
            throw new Error(`不支持的 Agent Runtime：${requested}`);
        return descriptor.id;
    };
    const primaryRuntime = normalizeRequestedRuntime(payload.primary_runtime || payload.primaryRuntime, "gemini");
    const fallbackRuntime = normalizeRequestedRuntime(payload.fallback_runtime || payload.fallbackRuntime, "codex");
    const timeoutMs = Math.max(15000, Math.min(120000, Number(payload.timeout_ms || payload.timeoutMs || 30000)));
    const marker = "CCM_RUNTIME_FALLBACK_OK";
    const prompt = `这是 cc-connect 执行器切换探针。不要修改任何文件，不要运行写入命令。只回复一行：${marker}`;
    const toolContext = (0, collaboration_runtime_plan_tools_1.buildAgentToolContext)(ctx, target.group, selectedProject);
    const taskId = `fallback-probe-${Date.now()}`;
    const attempts = [];
    let previousOutput = "";
    let switched = false;
    for (const [index, agentType] of [primaryRuntime, fallbackRuntime].entries()) {
        const runtimeToolContext = (0, collaboration_runtime_runtime_tools_1.prepareAgentRuntimeTools)(target.group.id, selectedProject, runtime.workDir, agentType, toolContext.allowedTools, null, {
            toolAudit: toolContext.toolAudit,
            authorizationReadiness: toolContext.authorizationReadiness,
        });
        if (runtimeToolContext.dispatchBlocked) {
            const message = (0, collaboration_runtime_runtime_tools_1.runtimeToolDispatchBlockedMessage)(selectedProject, runtimeToolContext);
            attempts.push({ runtime: agentType, success: false, error: true, output: message, runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate });
            return {
                success: false,
                message,
                error: message,
                switched,
                attempts,
                runtime_tool_dispatch_gate: runtimeToolContext.dispatchGate,
            };
        }
        let errored = false;
        const attemptPrompt = index === 0 ? prompt : (0, collaboration_resilience_1.buildRuntimeRecoveryPrompt)({
            originalPrompt: prompt,
            previousOutput,
            failure: previousOutput,
            fromRuntime: primaryRuntime,
            toRuntime: fallbackRuntime,
            attempt: 2,
        });
        const output = await ctx.callAgentForGroupStream(selectedProject, attemptPrompt, runtime.workDir, agentType, {
            groupId: target.group.id,
            timeoutMs,
            allowedTools: toolContext.allowedTools,
            mcpConfigPath: runtimeToolContext.audit.mcpConfigPath,
            taskId,
            onDone: (opts) => { errored = opts.isError === true; },
        });
        const ok = !errored && output.includes(marker);
        attempts.push({ runtime: agentType, success: ok, error: errored, output: (0, memory_1.compactMemoryText)(output, 500) });
        if (ok) {
            return {
                success: true,
                message: index === 0 ? "主执行器探针通过，未触发切换" : "主执行器失败后已自动切换并续跑成功",
                switched,
                primary_runtime: primaryRuntime,
                final_runtime: agentType,
                attempts,
            };
        }
        previousOutput = output;
        if (index === 0) {
            const decision = (0, collaboration_resilience_1.shouldSwitchRuntime)(errored ? `Agent 进程退出：${output}` : output);
            if (!decision.switchRuntime) {
                return { success: false, message: "主执行器失败但未被判定为可恢复故障", switched: false, primary_runtime: primaryRuntime, final_runtime: primaryRuntime, attempts, decision };
            }
            switched = true;
            attempts[0].decision = decision;
        }
    }
    return { success: false, message: "执行器切换后仍失败", switched, primary_runtime: primaryRuntime, final_runtime: fallbackRuntime, attempts };
}
function normalizeStringArray(value) {
    if (!Array.isArray(value))
        return [];
    return value.map((item) => String(item || "").trim()).filter(Boolean);
}
function buildEvidenceGateFollowUps(group, outputs) {
    return require("./collaboration-acceptance").buildEvidenceGateFollowUps(group, outputs);
}
function isReviewLikeAgentName(value) {
    return /test[-_\s]*agent|qa|test|tester|verify|verification|review|reviewer|audit|checker|quality|测试|验证|复核|审查|检查/i.test(String(value || ""));
}
function inferIndependentReviewSubject(input) {
    const changes = Array.isArray(input.actualFileChanges) ? input.actualFileChanges : [];
    const highRiskProjects = changes
        .filter(collaboration_runtime_status_helpers_1.changeLooksHighRiskForIndependentReview)
        .map((item) => item.project || item.agent || item.target_project || "")
        .filter(Boolean);
    const changedProjects = changes
        .map((item) => item.project || item.agent || item.target_project || "")
        .filter(Boolean);
    const receiptAgents = (input.receipts || [])
        .filter((item) => String(item?.status || "") === "done")
        .map((item) => item.agent || item.project || "")
        .filter(Boolean);
    const assignedProjects = (input.assignmentEvidence || [])
        .map((item) => item.project || item.target || "")
        .filter(Boolean);
    const candidates = (0, collaboration_runtime_status_helpers_1.uniqueStrings)(highRiskProjects, changedProjects, receiptAgents, assignedProjects, input.task?.target_project || input.task?.targetProject || "").filter((item) => !isReviewLikeAgentName(item));
    return candidates[0] || (0, collaboration_runtime_status_helpers_1.uniqueStrings)(changedProjects, receiptAgents, assignedProjects)[0] || "";
}
function getReceiptTestAgentVerdict(receipt) {
    return receipt?.testAgentReport?.verdict
        || receipt?.test_agent_report?.verdict
        || receipt?.testAgentVerdict
        || receipt?.test_agent_verdict
        || null;
}
function getReceiptTestAgentHandoff(receipt) {
    return receipt?.testAgentHandoff
        || receipt?.test_agent_handoff
        || receipt?.testAgentReport?.testAgentHandoff
        || receipt?.test_agent_report?.test_agent_handoff
        || null;
}
function getReceiptIndependentReviewSubject(receipt, fallback = "") {
    const handoff = getReceiptTestAgentHandoff(receipt);
    const reviews = [
        ...(Array.isArray(receipt?.independentReview) ? receipt.independentReview : []),
        ...(Array.isArray(receipt?.independent_review) ? receipt.independent_review : []),
    ];
    return String((0, collaboration_runtime_cross_agent_runtime_1.getTestAgentHandoffReviewSubject)(handoff)
        || reviews[0]?.reviewSubject
        || reviews[0]?.review_subject
        || receipt?.reviewSubject
        || receipt?.review_subject
        || fallback
        || "").trim();
}
function findLatestTestAgentReviewReceipt(receipts = [], route = "") {
    return [...(receipts || [])].reverse().find((receipt) => {
        const verdict = getReceiptTestAgentVerdict(receipt);
        const reviewState = (0, collaboration_runtime_status_helpers_1.independentReviewVerdictState)([
            verdict?.reviewRoute,
            verdict?.status,
            verdict?.recommendation,
            receipt?.status,
            ...(Array.isArray(receipt?.independentReview) ? receipt.independentReview.map((item) => item?.verdict || item?.status || item?.summary) : []),
            ...(Array.isArray(receipt?.independent_review) ? receipt.independent_review.map((item) => item?.verdict || item?.status || item?.summary) : []),
        ].filter(Boolean).join("\n"));
        if (route === "needs_recheck")
            return verdict?.needsRecheck === true || verdict?.reviewRoute === "test_agent_recheck" || reviewState === "needs_recheck";
        if (route === "needs_environment")
            return verdict?.needsEnvironment === true || verdict?.reviewRoute === "environment" || reviewState === "needs_environment";
        if (route === "failed")
            return verdict?.needsRework === true || verdict?.reviewRoute === "implementation_rework" || reviewState === "failed";
        return !!verdict || (0, collaboration_runtime_cross_agent_runtime_1.isCoordinatorTestAgentName)(receipt?.reviewer || receipt?.agent);
    }) || null;
}
function buildTestAgentReviewRecheckFollowUp(input) {
    const subject = String(input.subject || "").trim();
    if (!subject)
        return null;
    const { applyTestAgentProviderGapPlaywrightReroute } = require("./test-agent-independent-review-decision");
    const { buildTestAgentEnvironmentPrepChecklist, applyTestAgentEnvironmentPrepToHandoff, } = require("./test-agent-environment-prep");
    let handoff = applyTestAgentProviderGapPlaywrightReroute(input.handoff || null, {
        report: input.report,
        verdict: input.verdict,
        reason: input.reason,
        reviewRoute: "test_agent_recheck",
    });
    const environmentPrep = handoff?.metadata?.testAgentEnvironmentPrep
        || buildTestAgentEnvironmentPrepChecklist(input.report, input.verdict);
    if (environmentPrep && /environment|补齐|登录条件|运行条件/i.test(String(input.source || input.reason || ""))) {
        handoff = applyTestAgentEnvironmentPrepToHandoff(handoff, environmentPrep);
    }
    const providerGapReroute = handoff?.metadata?.providerGapReroute === true;
    return {
        mention: handoff ? "@test-agent" : `@${subject}`,
        targetName: handoff ? "test-agent" : subject,
        project: handoff ? "test-agent" : subject,
        summary: "重新运行 TestAgent 复验",
        message: [
            `${subject} 的实现或复核条件已更新，请重新执行 TestAgent 独立复核。`,
            "必须基于最新文件、最新运行环境和最新真实输出重新判断；不要复用上一轮结论。",
            "重点补齐上一轮未闭环的操作效果、会话恢复、边界异常或完成前抽查证据。",
            providerGapReroute
                ? "上一轮存在浏览器 Provider 能力缺口：本轮复验已强制改走 Playwright，禁止继续用 MCP/Computer Use 假绿。"
                : "",
            "如果仍无法验证，请明确返回需复验、补条件或待确认；只有新证据完整通过后才能接受交付。",
        ].filter(Boolean).join("\n"),
        reason: input.reason || "上一轮交付或复核条件已更新，需要 TestAgent 基于最新状态重新验证",
        rework_kind: "test_agent_review_recheck",
        testAgentReviewRecheck: true,
        test_agent_review_recheck: true,
        reviewSubject: subject,
        originalTarget: subject,
        independentReviewGate: handoff ? null : {
            required: true,
            pass: false,
            status: "needs_recheck",
            reason: input.reason || "需要重新运行独立 TestAgent 复核",
        },
        testAgentHandoff: handoff,
        test_agent_handoff: handoff,
        userTaskPreview: providerGapReroute
            ? `重新复验 ${subject}：改走 Playwright 后运行 TestAgent`
            : `重新复验 ${subject}：基于最新状态运行 TestAgent`,
        source: input.source || "test_agent_review_recheck",
    };
}
function buildIndependentReviewGateFollowUps(input) {
    return require("./collaboration-acceptance").buildIndependentReviewGateFollowUps(input);
}
function buildFailedIndependentReviewReworkFollowUps(input) {
    return require("./collaboration-acceptance").buildFailedIndependentReviewReworkFollowUps(input);
}
function buildPostReviewSpotCheckFollowUps(input) {
    const task = input.task || (0, collaboration_runtime_task_queue_1.getTaskById)(input.taskId || "");
    if (!task || task.assign_type !== "group")
        return [];
    const outputText = (input.outputs || []).filter(Boolean).join("\n\n---\n\n");
    const receipts = [
        ...(Array.isArray(input.execution?.receipt) ? input.execution.receipt : input.execution?.receipt ? [input.execution.receipt] : []),
        ...(0, collaboration_runtime_status_helpers_1.parseFormattedReceiptsFromText)(outputText),
    ].filter(Boolean);
    const actualFileChanges = (0, collaboration_runtime_status_helpers_1.collectTaskActualFileChanges)(task, input.execution || {});
    const agentQa = task.group_id ? (0, agent_qa_service_1.getAgentQaItemsForGroup)(task.group_id).filter((item) => !task.id || item.task_id === task.id) : [];
    const independentReviewGate = (0, collaboration_runtime_status_helpers_1.buildIndependentReviewGate)(task, actualFileChanges, receipts, agentQa);
    const spotCheckGate = (0, post_review_spot_check_1.buildPostReviewSpotCheckGate)({
        required: independentReviewGate.required && independentReviewGate.pass,
        receipts,
    });
    if (!spotCheckGate.required || spotCheckGate.pass)
        return [];
    const existingText = (input.existingFollowUps || [])
        .map((item) => [item?.summary, item?.reason, item?.message, item?.task, item?.rework_kind, item?.kind].filter(Boolean).join("\n"))
        .join("\n");
    if (/post_review_spot_check|完成前抽查.{0,24}(?:重新复验|补齐|不一致)|TestAgent.{0,24}重新判断/i.test(existingText))
        return [];
    const sourceReceipt = receipts.find((receipt) => receipt?.post_review_spot_check
        || receipt?.postReviewSpotCheck
        || receipt?.testAgentHandoff
        || receipt?.test_agent_handoff) || null;
    const carriedHandoff = sourceReceipt?.testAgentHandoff || sourceReceipt?.test_agent_handoff || null;
    const assignmentEvidence = (0, collaboration_runtime_status_helpers_1.collectTaskAssignmentEvidence)(task, input.execution || {});
    const subject = String(carriedHandoff?.review_subject
        || carriedHandoff?.reviewSubject
        || sourceReceipt?.reviewSubject
        || sourceReceipt?.review_subject
        || sourceReceipt?.independentReview?.[0]?.reviewSubject
        || inferIndependentReviewSubject({ task, actualFileChanges, receipts, assignmentEvidence })
        || task?.target_project
        || "").trim();
    if (!subject)
        return [];
    const reason = spotCheckGate.reason || "TestAgent 通过后，主 Agent 的关键验证抽查尚未通过";
    if (carriedHandoff) {
        return [{
                mention: "@test-agent",
                targetName: "test-agent",
                project: "test-agent",
                summary: "完成前抽查需要 TestAgent 重新复验",
                message: [
                    `TestAgent 已对 ${subject} 给出通过结论，但主 Agent 的完成前抽查尚未一致。`,
                    "请沿用原复核工作单重新执行验证，并根据最新真实输出重新判断；不要复用上一轮 PASS。",
                    "如果重新执行失败，请明确返回失败或需要返工；如果仍然通过，请返回新的命令结果块和实际输出，供主 Agent 再次抽查。",
                ].join("\n"),
                reason,
                rework_kind: "post_review_spot_check_reverify",
                postReviewSpotCheckReverify: true,
                postReviewSpotCheckGate: spotCheckGate,
                reviewSubject: subject,
                originalTarget: subject,
                testAgentHandoff: carriedHandoff,
                test_agent_handoff: carriedHandoff,
                userTaskPreview: `重新复验 ${subject}：完成前抽查尚未一致`,
            }];
    }
    return [{
            mention: `@${subject}`,
            targetName: subject,
            project: subject,
            summary: "补齐 TestAgent 通过后的完成前抽查",
            message: [
                `主 Agent 已收到 ${subject} 的独立复核通过结论，但还没有可供主 Agent 重跑的完整命令结果。`,
                "请重新发起独立 TestAgent 复核，确保通过报告包含实际执行的命令、退出状态和输出；主 Agent 会在 PASS 后抽查关键验证。",
            ].join("\n"),
            reason,
            rework_kind: "post_review_spot_check_missing",
            independentReviewGate: {
                ...independentReviewGate,
                required: true,
                pass: false,
                status: "missing",
                reason,
            },
            postReviewSpotCheckGate: spotCheckGate,
            reviewSubject: subject,
            originalTarget: subject,
            userTaskPreview: `补齐完成前抽查：重新复核 ${subject}`,
        }];
}
function buildCodedCoordinatorReview(group, outputs, options = {}) {
    const coordinator = (0, group_orchestrator_1.getCoordinatorMember)(group);
    const allowFollowUps = options.allowFollowUps !== false;
    const round = Math.max(1, Number(options.round || 1));
    const maxRounds = Math.max(round, Number(options.maxRounds || 3));
    const gateFollowUps = buildEvidenceGateFollowUps(group, outputs);
    const gaps = gateFollowUps.map((item) => String(item.reason || item.message || "").trim()).filter(Boolean);
    const followUps = allowFollowUps ? gateFollowUps : [];
    const status = followUps.length > 0
        ? "needs_followup"
        : gaps.length > 0
            ? "needs_user"
            : "complete";
    const lines = ["📋 **规则协调复盘**", ""];
    if (status === "complete") {
        lines.push("已完成规则验收：子 Agent 结果说明和验证证据未发现必须自动返工的缺口。");
    }
    else {
        lines.push(`第 ${round}/${maxRounds} 轮规则验收发现缺口：${gaps.join("；") || "仍缺少可验收证据"}`);
    }
    if (followUps.length) {
        lines.push("", "我会继续追问：");
        for (const item of followUps) {
            const preview = item.summary ? `${item.summary}：` : "";
            lines.push(`@${item.targetName || item.project} ${preview}${item.message}`);
        }
    }
    else if (gaps.length) {
        lines.push("", "已达到自动返工上限，需要用户确认是否继续派发或人工介入。");
    }
    return {
        agent: coordinator.project,
        status,
        followUps,
        structured_review: {
            schema: "ccm-coded-coordinator-review-v1",
            status,
            follow_ups: followUps.map((item) => ({
                project: item.targetName || item.project || "",
                summary: item.summary || "",
                reason: item.reason || "",
            })),
            gaps,
        },
        gaps,
        conflicts: [],
        content: lines.join("\n").trim(),
        confidence: status === "complete" ? 0.82 : 0.68,
        runtime: "coded-review",
    };
}
function writeSse(res, data) {
    if (!res || res.writableEnded || res.destroyed)
        return;
    try {
        const sequence = Number(res.__ccmSseSequence || 0) + 1;
        res.__ccmSseSequence = sequence;
        const streamId = String(data?.traceId || data?.trace_id || data?.taskId || data?.task_id || "group-stream");
        const eventId = String(data?.event_id || data?.eventId || `${streamId}:${sequence}`);
        res.write(`data: ${JSON.stringify({ ...data, event_id: eventId, eventId, sequence })}\n\n`);
    }
    catch { }
}
(0, agent_qa_service_1.configureAgentQaService)({ getTaskById: collaboration_runtime_task_queue_1.getTaskById, updateTask: collaboration_runtime_runtime_tools_1.updateTask, writeSse });
function emitAssignmentStatus(streamRes, groupId, planMessageId, project, status, statusText = "") {
    if (!planMessageId || !project)
        return;
    const text = statusText || status;
    const workflow = (0, collaboration_runtime_task_queue_1.updateGroupMessageAssignmentStatus)(groupId, planMessageId, project, status, text);
    writeSse(streamRes, {
        type: "assignment_status",
        planMessageId,
        project,
        status,
        statusText: text,
        workflow,
    });
}
//# sourceMappingURL=collaboration-runtime-daily-dev-part-02.js.map