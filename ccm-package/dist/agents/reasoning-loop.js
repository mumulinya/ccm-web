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
exports.createAgentReasoningState = createAgentReasoningState;
exports.normalizeAgentReasoningState = normalizeAgentReasoningState;
exports.appendReasoningClarification = appendReasoningClarification;
exports.captureReasoningFacts = captureReasoningFacts;
exports.updateReasoningPlan = updateReasoningPlan;
exports.explainReasoningDecision = explainReasoningDecision;
exports.recordReasoningDeviation = recordReasoningDeviation;
exports.recordReasoningPostmortem = recordReasoningPostmortem;
exports.setReasoningAssertion = setReasoningAssertion;
exports.recordReasoningRecoveryCheck = recordReasoningRecoveryCheck;
exports.buildTaskReasoningState = buildTaskReasoningState;
exports.runAgentReasoningLoopSelfTest = runAgentReasoningLoopSelfTest;
const crypto = __importStar(require("crypto"));
function now() { return new Date().toISOString(); }
function compact(value, limit = 1200) {
    let text = "";
    try {
        text = typeof value === "string" ? value : JSON.stringify(value);
    }
    catch {
        text = String(value || "");
    }
    return String(text || "").replace(/\s+/g, " ").trim().slice(0, limit);
}
function hash(value) {
    let text = "";
    const stable = (item) => Array.isArray(item)
        ? item.map(stable)
        : item && typeof item === "object"
            ? Object.fromEntries(Object.keys(item).sort().map(key => [key, stable(item[key])]))
            : item;
    try {
        text = JSON.stringify(stable(value));
    }
    catch {
        text = String(value || "");
    }
    return crypto.createHash("sha256").update(text).digest("hex").slice(0, 20);
}
function strings(value, limit = 30) {
    const flattened = [];
    const visit = (item) => Array.isArray(item) ? item.forEach(visit) : flattened.push(item);
    visit(value);
    return [...new Set(flattened.map(item => compact(item, 500)).filter(Boolean))].slice(0, limit);
}
function createAgentReasoningState(input = {}) {
    const at = now();
    const plan = strings(input.plan, 20);
    return {
        version: 1,
        original_goal: compact(input.goal, 4000),
        effective_goal: compact(input.goal, 4000),
        authorization_scope: strings(input.authorizationScope, 20),
        clarification_chain: [],
        plan_version: plan.length ? 1 : 0,
        plan,
        replan_required: false,
        last_replan_reason: "",
        plan_history: plan.length ? [{ version: 1, plan, reason: "initial_plan", fact_hash: "", at }] : [],
        fact_snapshots: [],
        assertions: (input.assertions || []).slice(0, 30).map((item, index) => ({
            id: String(item.id || `assertion_${index + 1}`), label: compact(item.label || item, 600), kind: String(item.kind || "goal"),
            status: (["passed", "failed", "blocked"].includes(item.status) ? item.status : "pending"),
            evidence: strings(item.evidence, 20), reason: compact(item.reason, 800), updated_at: at,
        })),
        deviations: [], postmortems: [], recovery_checks: [], explanations: [], updated_at: at,
    };
}
function normalizeAgentReasoningState(value, goal = "") {
    const base = createAgentReasoningState({ goal: value?.original_goal || goal });
    return {
        ...base,
        ...value,
        version: 1,
        original_goal: compact(value?.original_goal || goal, 4000),
        effective_goal: compact(value?.effective_goal || value?.original_goal || goal, 8000),
        authorization_scope: strings(value?.authorization_scope, 20),
        clarification_chain: (Array.isArray(value?.clarification_chain) ? value.clarification_chain : []).slice(-12),
        plan_version: Number(value?.plan_version || 0),
        plan: strings(value?.plan, 20),
        replan_required: value?.replan_required === true,
        last_replan_reason: compact(value?.last_replan_reason, 800),
        plan_history: (Array.isArray(value?.plan_history) ? value.plan_history : []).slice(-20),
        fact_snapshots: (Array.isArray(value?.fact_snapshots) ? value.fact_snapshots : []).slice(-20),
        assertions: (Array.isArray(value?.assertions) ? value.assertions : []).slice(-40),
        deviations: (Array.isArray(value?.deviations) ? value.deviations : []).slice(-40),
        postmortems: (Array.isArray(value?.postmortems) ? value.postmortems : []).slice(-30),
        recovery_checks: (Array.isArray(value?.recovery_checks) ? value.recovery_checks : []).slice(-20),
        explanations: (Array.isArray(value?.explanations) ? value.explanations : []).slice(-40),
        updated_at: value?.updated_at || now(),
    };
}
function appendReasoningClarification(state, input) {
    state.clarification_chain.push({ question: compact(input.question, 1600), answer: compact(input.answer, 3000), at: now() });
    state.clarification_chain = state.clarification_chain.slice(-12);
    state.effective_goal = [state.original_goal, ...state.clarification_chain.map(item => `澄清：${item.answer}`)].filter(Boolean).join("\n").slice(0, 8000);
    state.authorization_scope = strings([state.authorization_scope, input.authorizationScope || []], 20);
    state.updated_at = now();
    return state;
}
function captureReasoningFacts(state, source, facts) {
    const factHash = hash(facts);
    const previous = state.fact_snapshots[state.fact_snapshots.length - 1];
    const previousSameSource = [...state.fact_snapshots].reverse().find(item => item.source === source);
    if (previousSameSource && previousSameSource.hash !== factHash) {
        recordReasoningDeviation(state, "fact_changed", `${source} 的真实状态从 ${previousSameSource.hash} 变化为 ${factHash}，后续计划必须重新核对`, "info");
    }
    if (!previous || previous.hash !== factHash || previous.source !== source) {
        state.fact_snapshots.push({ id: `fact_${Date.now().toString(36)}_${factHash.slice(0, 6)}`, source, hash: factHash, summary: compact(facts, 1600), at: now() });
        state.fact_snapshots = state.fact_snapshots.slice(-20);
    }
    state.updated_at = now();
    return factHash;
}
function updateReasoningPlan(state, plan, reason = "model_plan") {
    const next = strings(plan, 20);
    if (!next.length)
        return state;
    const changed = JSON.stringify(next) !== JSON.stringify(state.plan);
    if (!changed)
        return state;
    state.plan_version += 1;
    state.plan = next;
    state.replan_required = false;
    state.last_replan_reason = compact(reason, 800);
    state.plan_history.push({ version: state.plan_version, plan: next, reason: compact(reason, 800), fact_hash: state.fact_snapshots[state.fact_snapshots.length - 1]?.hash || "", at: now() });
    state.plan_history = state.plan_history.slice(-20);
    state.updated_at = now();
    return state;
}
function explainReasoningDecision(state, decision, reason) {
    const next = { decision: compact(decision, 500), reason: compact(reason, 1200), at: now() };
    const last = state.explanations[state.explanations.length - 1];
    if (last?.decision === next.decision && last?.reason === next.reason)
        return state;
    state.explanations.push(next);
    state.explanations = state.explanations.slice(-40);
    state.updated_at = now();
    return state;
}
function recordReasoningDeviation(state, type, detail, severity = "warning") {
    const normalized = compact(detail, 1600);
    if (!normalized)
        return state;
    const last = state.deviations[state.deviations.length - 1];
    if (last?.type === type && last?.detail === normalized)
        return state;
    state.deviations.push({ id: `dev_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`, type, detail: normalized, severity, at: now() });
    if (severity !== "info" || type === "fact_changed") {
        state.replan_required = true;
        state.last_replan_reason = normalized;
    }
    state.deviations = state.deviations.slice(-40);
    state.updated_at = now();
    return state;
}
function recordReasoningPostmortem(state, input) {
    const next = {
        trigger: compact(input.trigger, 500), what_happened: compact(input.whatHappened, 1200), correction: compact(input.correction, 1200),
        prevent_repeat: compact(input.preventRepeat, 1200), at: now(),
    };
    const last = state.postmortems[state.postmortems.length - 1];
    if (last?.trigger === next.trigger && last?.what_happened === next.what_happened)
        return state;
    state.postmortems.push(next);
    state.postmortems = state.postmortems.slice(-30);
    state.updated_at = now();
    return state;
}
function setReasoningAssertion(state, input) {
    const at = now();
    const index = state.assertions.findIndex(item => item.id === input.id);
    const next = {
        id: input.id, label: compact(input.label || state.assertions[index]?.label || input.id, 600), kind: String(input.kind || state.assertions[index]?.kind || "goal"),
        status: input.status, evidence: strings(input.evidence, 20), reason: compact(input.reason, 800), updated_at: at,
    };
    if (index >= 0)
        state.assertions[index] = next;
    else
        state.assertions.push(next);
    state.assertions = state.assertions.slice(-40);
    state.updated_at = at;
    return state;
}
function recordReasoningRecoveryCheck(state, input) {
    state.recovery_checks.push({
        reason: compact(input.reason, 800), goal_revalidated: input.goalRevalidated, state_revalidated: input.stateRevalidated,
        acceptance_revalidated: input.acceptanceRevalidated, remaining_gaps: strings(input.remainingGaps, 30), at: now(),
    });
    state.recovery_checks = state.recovery_checks.slice(-20);
    state.updated_at = now();
    return state;
}
function buildTaskReasoningState(task, summary = {}) {
    const existing = normalizeAgentReasoningState(task?.reasoning_loop, task?.business_goal || task?.title || "");
    setReasoningAssertion(existing, { id: "goal", label: "业务目标得到满足", kind: "goal", status: summary.acceptance_gate_passed ? "passed" : "pending", evidence: summary.actions || [] });
    setReasoningAssertion(existing, { id: "files", label: "存在系统捕获的真实文件变更", kind: "delivery", status: summary.has_actual_file_changes || task?.requires_code_changes === false ? "passed" : "pending", evidence: summary.files_changed || [] });
    setReasoningAssertion(existing, { id: "verification", label: "独立 Runner 验证通过", kind: "verification", status: summary.verification_source_gate_passed ? "passed" : "pending", evidence: summary.external_runner_verification || [] });
    setReasoningAssertion(existing, { id: "independent_review", label: "复杂变更已由独立 Agent 复核", kind: "verification", status: summary.independent_review_required === true && summary.independent_review_gate_passed !== true ? "pending" : "passed", evidence: summary.independent_review_evidence?.map((item) => item.summary || item.verdict || item.reviewer) || [] });
    setReasoningAssertion(existing, { id: "acceptance", label: "主 Agent 最终验收门禁通过", kind: "acceptance", status: summary.acceptance_gate_passed ? "passed" : "pending", evidence: summary.acceptance_gate?.checks?.filter((item) => item.ok).map((item) => item.label) || [] });
    const gaps = summary.acceptance_gate?.failed_checks?.map((item) => item.label || item.id) || [];
    if (gaps.length)
        recordReasoningDeviation(existing, "acceptance_gap", `仍有 ${gaps.length} 项验收缺口：${gaps.join("、")}`, "warning");
    if (gaps.length)
        recordReasoningPostmortem(existing, { trigger: "acceptance_gap", whatHappened: `子 Agent 交付后仍有 ${gaps.length} 项门禁未通过`, correction: "保持任务和会话，按失败门禁生成返工或等待用户信息", preventRepeat: "下一轮工作单明确注入未通过断言与独立验证要求" });
    explainReasoningDecision(existing, summary.acceptance_gate_passed ? "complete" : "continue_or_rework", summary.acceptance_gate_passed ? "真实文件、独立验证和最终验收断言均已通过" : `仍有 ${gaps.length || "未量化"} 项验收缺口，不能宣告完成`);
    captureReasoningFacts(existing, "delivery_summary", {
        task_status: task?.status, lifecycle: summary.lifecycle?.state, files: summary.actual_file_change_count || 0,
        external_verification: summary.external_runner_verification_count || 0, independent_review: summary.independent_review_gate?.status || "", blockers: summary.blockers || [], needs: summary.needs || [], gaps,
    });
    return existing;
}
function runAgentReasoningLoopSelfTest() {
    const state = createAgentReasoningState({ goal: "给项目加支付", plan: ["确认项目", "实现并验证"] });
    appendReasoningClarification(state, { question: "哪个项目？", answer: "frontend-app，只改支付页面", authorizationScope: ["frontend-app", "支付页面"] });
    captureReasoningFacts(state, "project", { project: "frontend-app", head: "abc" });
    updateReasoningPlan(state, ["读取支付页面", "实现", "外部验证"], "澄清目标后重规划");
    setReasoningAssertion(state, { id: "verification", label: "外部验证", status: "blocked", reason: "测试未运行" });
    recordReasoningDeviation(state, "verification_gap", "测试未运行");
    recordReasoningPostmortem(state, { trigger: "verification_gap", whatHappened: "模型准备交付但测试未运行", correction: "阻止完成并保留验证断言", preventRepeat: "重规划必须包含独立验证步骤" });
    recordReasoningRecoveryCheck(state, { reason: "执行器切换", goalRevalidated: true, stateRevalidated: true, acceptanceRevalidated: true, remainingGaps: ["测试未运行"] });
    return {
        pass: state.original_goal === "给项目加支付" && state.effective_goal.includes("frontend-app") && state.plan_version === 2 && state.authorization_scope.includes("frontend-app") && state.deviations.length === 1 && state.replan_required && state.postmortems.length === 1 && state.recovery_checks[0]?.acceptance_revalidated,
        checks: {
            clarificationPreservesOriginalGoal: state.original_goal === "给项目加支付" && state.effective_goal.includes("frontend-app"),
            planVersionIncrements: state.plan_version === 2,
            authorizationScopeIsExplicit: state.authorization_scope.includes("frontend-app"),
            deviationIsAudited: state.deviations.length === 1,
            deviationRequiresReplan: state.replan_required === true && state.last_replan_reason.includes("测试未运行"),
            misjudgmentCreatesPostmortem: state.postmortems.length === 1 && state.postmortems[0].prevent_repeat.includes("独立验证"),
            recoveryRevalidatesGoalAndAcceptance: state.recovery_checks[0]?.goal_revalidated && state.recovery_checks[0]?.acceptance_revalidated,
        },
        state,
    };
}
//# sourceMappingURL=reasoning-loop.js.map