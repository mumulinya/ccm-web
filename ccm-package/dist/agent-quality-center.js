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
exports.getAgentQualityPolicy = getAgentQualityPolicy;
exports.setAgentQualityPolicy = setAgentQualityPolicy;
exports.normalizeAgentDecisionIntent = normalizeAgentDecisionIntent;
exports.evaluateAgentDecision = evaluateAgentDecision;
exports.recordAgentDecision = recordAgentDecision;
exports.buildAgentQualitySnapshot = buildAgentQualitySnapshot;
exports.runAgentQualityCenterSelfTest = runAgentQualityCenterSelfTest;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const utils_1 = require("./utils");
const QUALITY_DIR = process.env.CCM_AGENT_QUALITY_DIR || path.join(utils_1.CCM_DIR, "agent-quality");
const POLICY_FILE = path.join(QUALITY_DIR, "policy.json");
const DECISIONS_FILE = path.join(QUALITY_DIR, "decisions.jsonl");
const MAX_DECISION_RECORDS = 5000;
function now() { return new Date().toISOString(); }
function clamp(value, fallback = 0) { return Math.max(0, Math.min(1, Number.isFinite(Number(value)) ? Number(value) : fallback)); }
function strings(value, max = 20) {
    return [...new Set((Array.isArray(value) ? value : []).map(item => String(item || "").trim()).filter(Boolean))].slice(0, max);
}
function atomicWrite(file, value) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(temp, typeof value === "string" ? value : JSON.stringify(value, null, 2), "utf-8");
    fs.renameSync(temp, file);
}
function getAgentQualityPolicy() {
    const fallback = {
        version: 1,
        shadowMode: false,
        minWriteConfidence: 0.78,
        requireGroundedTarget: true,
        updatedAt: "",
        updatedBy: "system",
        reason: "",
    };
    try {
        if (!fs.existsSync(POLICY_FILE))
            return fallback;
        const value = JSON.parse(fs.readFileSync(POLICY_FILE, "utf-8"));
        return {
            ...fallback,
            ...value,
            version: 1,
            shadowMode: value?.shadowMode === true,
            minWriteConfidence: clamp(value?.minWriteConfidence, fallback.minWriteConfidence),
            requireGroundedTarget: value?.requireGroundedTarget !== false,
        };
    }
    catch {
        return fallback;
    }
}
function setAgentQualityPolicy(input) {
    if (!String(input.reason || "").trim())
        throw new Error("修改 Agent 质量策略必须填写原因");
    const current = getAgentQualityPolicy();
    const next = {
        ...current,
        shadowMode: input.shadowMode === undefined ? current.shadowMode : input.shadowMode === true,
        minWriteConfidence: input.minWriteConfidence === undefined ? current.minWriteConfidence : clamp(input.minWriteConfidence, current.minWriteConfidence),
        requireGroundedTarget: input.requireGroundedTarget === undefined ? current.requireGroundedTarget : input.requireGroundedTarget !== false,
        updatedAt: now(),
        updatedBy: String(input.actor || "local-user"),
        reason: String(input.reason),
    };
    atomicWrite(POLICY_FILE, next);
    return next;
}
function fallbackIntent(message) {
    const text = String(message || "").trim();
    const deniesAction = /(?:不要|不用|先别|暂时别|只|仅|不|禁止).{0,12}(?:执行|操作|修改|创建|派发|启动|删除|提交)/.test(text);
    const question = /[?？]|(?:怎么|如何|为什么|是什么|原理|介绍|讲讲|说明|建议|觉得|能否|能不能|可不可以|是否|会不会|有哪些|有什么)/.test(text);
    const highRisk = /(?:删除|移除|清空|覆盖|强制|重置|提交|合并|发布|部署到生产)/.test(text);
    const directive = /(?:请|帮我|麻烦|给我|需要你|我要你|直接|立即|马上|开始|继续).{0,40}(?:实现|新增|修改|修复|重构|优化|运行|执行|测试|创建|派发|启动|停止|删除|提交|合并)/.test(text)
        || /^(?:实现|新增|修改|修复|重构|优化|运行|执行|测试|创建|派发|启动|停止|删除|提交|合并)/.test(text);
    const category = deniesAction ? (question ? "question" : "analysis") : directive ? (highRisk ? "high_risk" : "execution") : question ? "question" : text ? "conversation" : "ambiguous";
    return {
        category,
        goal: text.slice(0, 500),
        action_required: category === "execution" || category === "high_risk",
        target_refs: [],
        impact_scope: [],
        confidence: directive || question || deniesAction ? 0.86 : 0.58,
        authorization_basis: directive && !deniesAction ? "current_message" : "none",
        reason: "模型未提供结构化语义时的服务端安全兜底；不用于直接派发",
    };
}
function normalizeAgentDecisionIntent(value, message) {
    const fallback = fallbackIntent(message);
    const category = String(value?.category || fallback.category).toLowerCase();
    return {
        category: ["conversation", "question", "analysis", "execution", "high_risk", "ambiguous"].includes(category) ? category : "ambiguous",
        goal: String(value?.goal || fallback.goal).slice(0, 1200),
        action_required: value?.action_required === undefined ? fallback.action_required : value.action_required === true,
        target_refs: strings(value?.target_refs),
        impact_scope: strings(value?.impact_scope),
        confidence: clamp(value?.confidence, fallback.confidence),
        authorization_basis: ["current_message", "confirmation", "none"].includes(String(value?.authorization_basis))
            ? value.authorization_basis
            : fallback.authorization_basis,
        reason: String(value?.reason || fallback.reason).slice(0, 1600),
    };
}
function targetValues(toolName, args) {
    const direct = [args?.project, args?.projectName, args?.group_id, args?.groupId, args?.id]
        .map(value => String(value || "").trim()).filter(Boolean);
    const nested = Array.isArray(args?.targets)
        ? args.targets.flatMap((item) => [item?.project, item?.group_id, item?.groupId, item?.name]).map((value) => String(value || "").trim()).filter(Boolean)
        : [];
    const requiresTarget = ["inspect_project", "inspect_mission", "inspect_supervision", "orchestrate_development", "create_task", "send_project_cmd", "send_group_cmd", "manage_supervision", "manage_project", "manage_group", "manage_task", "git_review", "git_commit"].includes(toolName);
    return { values: [...new Set([...direct, ...nested])], requiresTarget };
}
function isGrounded(value, message, priorSteps) {
    if (!value)
        return false;
    const haystacks = [message, ...priorSteps.map(step => JSON.stringify(step?.observation || ""))].map(item => String(item || "").toLowerCase());
    return haystacks.some(text => text.includes(value.toLowerCase()));
}
function evaluateAgentDecision(input) {
    const policy = { ...getAgentQualityPolicy(), ...(input.policyOverride || {}) };
    const intent = normalizeAgentDecisionIntent(input.decision?.intent, input.message);
    const risk = input.risk || "read";
    const toolName = String(input.toolName || input.decision?.tool?.name || "");
    const targets = targetValues(toolName, input.args || input.decision?.tool?.arguments || {});
    const wholeWorkspace = /(?:整个|全部|所有)(?:项目|工作区|代码库)|全局开发任务/.test(input.message);
    const grounded = !targets.requiresTarget || (targets.values.length > 0 && (wholeWorkspace || targets.values.every(value => isGrounded(value, input.message, input.priorSteps || [])
        || intent.target_refs.some(ref => ref.toLowerCase() === value.toLowerCase()))));
    const consultationWrite = ["conversation", "question", "analysis"].includes(intent.category) && risk !== "read";
    const actionMismatch = risk !== "read" && intent.action_required !== true;
    const lowConfidence = risk !== "read" && intent.confidence < policy.minWriteConfidence;
    const ungroundedTarget = risk !== "read" && policy.requireGroundedTarget && !grounded;
    const clarificationReasons = [
        consultationWrite ? "当前语义属于咨询或分析，却拟调用写工具" : "",
        actionMismatch ? "决策没有确认用户要求实际执行" : "",
        lowConfidence ? `写操作置信度 ${intent.confidence.toFixed(2)} 低于门槛 ${policy.minWriteConfidence.toFixed(2)}` : "",
        ungroundedTarget ? "目标未在当前消息或读取结果中得到验证" : "",
    ].filter(Boolean);
    const requiresClarification = clarificationReasons.length > 0;
    const shadowed = !requiresClarification && policy.shadowMode && risk !== "read";
    // 授权来源只能由服务端根据当前消息/本轮确认判定，模型和历史记忆无权自报授权。
    const authorizationBasis = input.explicitWriteAuthorization ? "current_message" : "none";
    return {
        intent,
        policy,
        toolName,
        risk,
        targets: targets.values,
        groundedTarget: grounded,
        authorizationBasis,
        requiresClarification,
        clarificationReasons,
        clarificationQuestion: requiresClarification
            ? `我还不能可靠执行这项操作：${clarificationReasons.join("；")}。请明确要操作的项目/群聊、期望动作和允许的影响范围。`
            : "",
        shadowed,
        allowed: !requiresClarification && !shadowed,
    };
}
function readDecisionRecords(limit = MAX_DECISION_RECORDS) {
    try {
        if (!fs.existsSync(DECISIONS_FILE))
            return [];
        return fs.readFileSync(DECISIONS_FILE, "utf-8").split(/\r?\n/).filter(Boolean).slice(-limit).map(line => JSON.parse(line));
    }
    catch {
        return [];
    }
}
function recordAgentDecision(input) {
    fs.mkdirSync(QUALITY_DIR, { recursive: true });
    const record = {
        version: 1,
        id: input.id || `adq_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`,
        at: input.at || now(),
        run_id: String(input.run_id || ""),
        trace_id: String(input.trace_id || ""),
        session_id: String(input.session_id || ""),
        source: String(input.source || "global-agent"),
        message_hash: crypto.createHash("sha256").update(String(input.message || "")).digest("hex").slice(0, 20),
        message_preview: String(input.message || "").slice(0, 500),
        intent: input.intent || null,
        proposed_tool: input.proposed_tool || null,
        risk: input.risk || "read",
        target_grounded: input.target_grounded !== false,
        authorization_basis: input.authorization_basis || "none",
        outcome: input.outcome || "recorded",
        reasons: strings(input.reasons, 30),
        status: input.status || "info",
    };
    fs.appendFileSync(DECISIONS_FILE, JSON.stringify(record) + "\n", "utf-8");
    const records = readDecisionRecords(MAX_DECISION_RECORDS + 500);
    if (records.length > MAX_DECISION_RECORDS)
        atomicWrite(DECISIONS_FILE, records.slice(-MAX_DECISION_RECORDS).map(row => JSON.stringify(row)).join("\n") + "\n");
    return record;
}
function rate(numerator, denominator) { return denominator > 0 ? Math.round(numerator / denominator * 10_000) / 100 : 0; }
function buildAgentQualitySnapshot(input = {}) {
    const decisions = readDecisionRecords();
    const tasks = Array.isArray(input.tasks) ? input.tasks : [];
    const sessions = Array.isArray(input.sessions) ? input.sessions : [];
    const proposedWrites = decisions.filter(item => item.risk === "write" || item.risk === "high");
    const misdispatch = proposedWrites.filter(item => ["conversation", "question", "analysis"].includes(item.intent?.category));
    const executionIntents = decisions.filter(item => ["execution", "high_risk"].includes(item.intent?.category));
    const missedExecution = executionIntents.filter(item => ["answered", "completed_without_action"].includes(item.outcome));
    const unauthorized = proposedWrites.filter(item => item.outcome === "executed" && item.authorization_basis === "none");
    const allDoneTasks = tasks.filter(task => task.status === "done");
    // 5.0 introduced an evidence-bearing delivery summary. Older completed tasks do
    // not contain enough information to score, so keep them visible but do not
    // silently count them as false completions.
    const doneTasks = allDoneTasks.filter(task => typeof task.delivery_summary?.acceptance_gate_passed === "boolean");
    const legacyUnscoredCompleted = allDoneTasks.length - doneTasks.length;
    const falseCompletions = doneTasks.filter(task => task.delivery_summary?.acceptance_gate_passed !== true);
    const recoveredSessions = sessions.filter(session => Number(session.turnCount || 0) > 1);
    const healthyRecovered = recoveredSessions.filter(session => session.resumeMode === "native" && !!session.nativeSessionId && session.lastTurnSucceeded !== false);
    const conflictEvent = (task) => (task.workflow_timeline || task.delivery_summary?.timeline || []).find((event) => event?.type === "conflict_plan" && event?.data?.protected);
    const conflictTasks = tasks.filter(task => task.conflict_plan?.protected || task.workflow_meta?.conflict_plan?.protected || task.delivery_summary?.conflict_plan?.protected || conflictEvent(task));
    const handledConflicts = conflictTasks.filter(task => {
        const plan = task.conflict_plan || task.workflow_meta?.conflict_plan || task.delivery_summary?.conflict_plan || conflictEvent(task)?.data || {};
        return task.status !== "failed" && plan.effectiveOrder === "sequential";
    });
    const firstPass = doneTasks.filter(task => Number(task.delivery_summary?.rework_count || 0) === 0);
    const reasoningTasks = tasks.filter(task => !!(task.reasoning_loop || task.delivery_summary?.reasoning_loop));
    const reasoningState = (task) => task.reasoning_loop || task.delivery_summary?.reasoning_loop || {};
    const recoveredReasoningTasks = reasoningTasks.filter(task => (reasoningState(task).recovery_checks || []).length > 0);
    const fullyRevalidatedRecoveries = recoveredReasoningTasks.filter(task => (reasoningState(task).recovery_checks || []).every((item) => item.goal_revalidated && item.state_revalidated && item.acceptance_revalidated));
    const replannedTasks = reasoningTasks.filter(task => Number(reasoningState(task).plan_version || 0) > 1);
    const tasksWithOpenReasoningErrors = reasoningTasks.filter(task => (reasoningState(task).deviations || []).some((item) => item.severity === "error"));
    const postmortemTasks = reasoningTasks.filter(task => (reasoningState(task).postmortems || []).length > 0);
    return {
        generated_at: now(),
        policy: getAgentQualityPolicy(),
        totals: {
            decisions: decisions.length,
            proposed_writes: proposedWrites.length,
            tasks: tasks.length,
            completed_tasks: allDoneTasks.length,
            scored_completed_tasks: doneTasks.length,
            legacy_unscored_completed: legacyUnscoredCompleted,
            sessions: sessions.length,
        },
        counts: {
            potential_misdispatch: misdispatch.length,
            missed_execution: missedExecution.length,
            unauthorized_write: unauthorized.length,
            false_completion: falseCompletions.length,
            clarification: decisions.filter(item => item.outcome === "clarification_required").length,
            shadowed: decisions.filter(item => item.outcome === "shadowed").length,
            recovered_sessions: recoveredSessions.length,
            healthy_native_recovery: healthyRecovered.length,
            conflict_tasks: conflictTasks.length,
            handled_conflicts: handledConflicts.length,
            first_pass_delivery: firstPass.length,
            reasoning_tasks: reasoningTasks.length,
            recovery_revalidated: fullyRevalidatedRecoveries.length,
            replanned_tasks: replannedTasks.length,
            reasoning_error_tasks: tasksWithOpenReasoningErrors.length,
            postmortem_tasks: postmortemTasks.length,
        },
        rates: {
            misdispatch_rate: rate(misdispatch.length, proposedWrites.length),
            missed_execution_rate: rate(missedExecution.length, executionIntents.length),
            unauthorized_write_rate: rate(unauthorized.length, proposedWrites.length),
            false_completion_rate: rate(falseCompletions.length, doneTasks.length),
            native_session_recovery_rate: rate(healthyRecovered.length, recoveredSessions.length),
            conflict_handling_rate: rate(handledConflicts.length, conflictTasks.length),
            first_pass_delivery_rate: rate(firstPass.length, doneTasks.length),
            recovery_goal_revalidation_rate: rate(fullyRevalidatedRecoveries.length, recoveredReasoningTasks.length),
            dynamic_replan_rate: rate(replannedTasks.length, reasoningTasks.length),
        },
        recent_decisions: decisions.slice(-100).reverse(),
        recent_reasoning_tasks: reasoningTasks.slice().sort((a, b) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || ""))).slice(0, 30).map(task => {
            const reasoning = reasoningState(task);
            return {
                task_id: task.id,
                title: task.title,
                status: task.status,
                plan_version: Number(reasoning.plan_version || 0),
                open_assertions: (reasoning.assertions || []).filter((item) => item.status !== "passed").length,
                deviations: (reasoning.deviations || []).length,
                postmortems: (reasoning.postmortems || []).length,
                replan_required: reasoning.replan_required === true,
                recovery_checks: (reasoning.recovery_checks || []).length,
                last_fact_hash: reasoning.fact_snapshots?.[reasoning.fact_snapshots.length - 1]?.hash || "",
            };
        }),
    };
}
function runAgentQualityCenterSelfTest() {
    const clarifiedAnalysis = normalizeAgentDecisionIntent(null, "帮我优化一下\n澄清：只分析 demo 的性能方向，不执行、不修改代码");
    const consultation = evaluateAgentDecision({
        message: "知识库还可以怎么优化？",
        decision: { intent: { category: "question", action_required: false, confidence: 0.94, reason: "咨询" } },
        toolName: "orchestrate_development",
        args: { business_goal: "优化知识库", targets: [{ project: "demo" }] },
        risk: "write",
        explicitWriteAuthorization: false,
    });
    const grounded = evaluateAgentDecision({
        message: "请修复 demo 项目的登录问题并运行测试",
        decision: { intent: { category: "execution", action_required: true, confidence: 0.95, target_refs: ["demo"], reason: "明确执行" } },
        toolName: "send_project_cmd",
        args: { project: "demo", message: "修复登录" },
        risk: "write",
        explicitWriteAuthorization: true,
    });
    const guessed = evaluateAgentDecision({
        message: "帮我优化一下",
        decision: { intent: { category: "execution", action_required: true, confidence: 0.63, reason: "目标不清" } },
        toolName: "send_project_cmd",
        args: { project: "guessed-project", message: "优化" },
        risk: "write",
        explicitWriteAuthorization: true,
    });
    const shadow = evaluateAgentDecision({
        message: "请修复 demo 项目的登录问题",
        decision: { intent: { category: "execution", action_required: true, confidence: 0.95, target_refs: ["demo"], reason: "明确执行" } },
        toolName: "send_project_cmd",
        args: { project: "demo", message: "修复登录" },
        risk: "write",
        explicitWriteAuthorization: true,
        policyOverride: { shadowMode: true },
    });
    const checks = {
        consultationWriteIsBlocked: consultation.requiresClarification,
        groundedExplicitExecutionPasses: grounded.allowed || grounded.shadowed,
        lowConfidenceGuessIsBlocked: guessed.requiresClarification && !guessed.groundedTarget,
        shadowModeRecordsWithoutExecution: shadow.shadowed && !shadow.allowed,
        historyCannotAuthorize: evaluateAgentDecision({ message: "继续聊聊", decision: { intent: { category: "conversation", action_required: false, confidence: .9, authorization_basis: "none" } }, toolName: "send_group_cmd", args: { group_id: "g1" }, risk: "write", explicitWriteAuthorization: false }).authorizationBasis === "none",
        clarificationDenialOverridesOriginalDirective: clarifiedAnalysis.category === "analysis" && clarifiedAnalysis.action_required === false && clarifiedAnalysis.authorization_basis === "none",
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=agent-quality-center.js.map