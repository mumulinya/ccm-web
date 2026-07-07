import * as crypto from "crypto";

export type ReasoningAssertionStatus = "pending" | "passed" | "failed" | "blocked";

export interface AgentReasoningState {
  version: 1;
  original_goal: string;
  effective_goal: string;
  authorization_scope: string[];
  clarification_chain: Array<{ question: string; answer: string; at: string }>;
  plan_version: number;
  plan: string[];
  replan_required: boolean;
  last_replan_reason: string;
  plan_history: Array<{ version: number; plan: string[]; reason: string; fact_hash: string; at: string }>;
  fact_snapshots: Array<{ id: string; source: string; hash: string; summary: string; at: string }>;
  assertions: Array<{ id: string; label: string; kind: string; status: ReasoningAssertionStatus; evidence: string[]; reason: string; updated_at: string }>;
  deviations: Array<{ id: string; type: string; detail: string; severity: "info" | "warning" | "error"; at: string }>;
  postmortems: Array<{ trigger: string; what_happened: string; correction: string; prevent_repeat: string; at: string }>;
  recovery_checks: Array<{ reason: string; goal_revalidated: boolean; state_revalidated: boolean; acceptance_revalidated: boolean; remaining_gaps: string[]; at: string }>;
  explanations: Array<{ decision: string; reason: string; at: string }>;
  updated_at: string;
}

function now() { return new Date().toISOString(); }
function compact(value: any, limit = 1200) {
  let text = "";
  try { text = typeof value === "string" ? value : JSON.stringify(value); } catch { text = String(value || ""); }
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, limit);
}
function hash(value: any) {
  let text = "";
  const stable = (item: any): any => Array.isArray(item)
    ? item.map(stable)
    : item && typeof item === "object"
      ? Object.fromEntries(Object.keys(item).sort().map(key => [key, stable(item[key])]))
      : item;
  try { text = JSON.stringify(stable(value)); } catch { text = String(value || ""); }
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 20);
}
function strings(value: any, limit = 30) {
  const flattened: any[] = [];
  const visit = (item: any) => Array.isArray(item) ? item.forEach(visit) : flattened.push(item);
  visit(value);
  return [...new Set(flattened.map(item => compact(item, 500)).filter(Boolean))].slice(0, limit);
}

export function createAgentReasoningState(input: { goal?: string; authorizationScope?: string[]; plan?: string[]; assertions?: any[] } = {}): AgentReasoningState {
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
    assertions: (input.assertions || []).slice(0, 30).map((item: any, index: number) => ({
      id: String(item.id || `assertion_${index + 1}`), label: compact(item.label || item, 600), kind: String(item.kind || "goal"),
      status: (["passed", "failed", "blocked"].includes(item.status) ? item.status : "pending") as ReasoningAssertionStatus,
      evidence: strings(item.evidence, 20), reason: compact(item.reason, 800), updated_at: at,
    })),
    deviations: [], postmortems: [], recovery_checks: [], explanations: [], updated_at: at,
  };
}

export function normalizeAgentReasoningState(value: any, goal = ""): AgentReasoningState {
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

export function appendReasoningClarification(state: AgentReasoningState, input: { question: string; answer: string; authorizationScope?: string[] }) {
  state.clarification_chain.push({ question: compact(input.question, 1600), answer: compact(input.answer, 3000), at: now() });
  state.clarification_chain = state.clarification_chain.slice(-12);
  state.effective_goal = [state.original_goal, ...state.clarification_chain.map(item => `澄清：${item.answer}`)].filter(Boolean).join("\n").slice(0, 8000);
  state.authorization_scope = strings([state.authorization_scope, input.authorizationScope || []], 20);
  state.updated_at = now();
  return state;
}

export function captureReasoningFacts(state: AgentReasoningState, source: string, facts: any) {
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

export function updateReasoningPlan(state: AgentReasoningState, plan: string[], reason = "model_plan") {
  const next = strings(plan, 20);
  if (!next.length) return state;
  const changed = JSON.stringify(next) !== JSON.stringify(state.plan);
  if (!changed) return state;
  state.plan_version += 1;
  state.plan = next;
  state.replan_required = false;
  state.last_replan_reason = compact(reason, 800);
  state.plan_history.push({ version: state.plan_version, plan: next, reason: compact(reason, 800), fact_hash: state.fact_snapshots[state.fact_snapshots.length - 1]?.hash || "", at: now() });
  state.plan_history = state.plan_history.slice(-20);
  state.updated_at = now();
  return state;
}

export function explainReasoningDecision(state: AgentReasoningState, decision: string, reason: string) {
  const next = { decision: compact(decision, 500), reason: compact(reason, 1200), at: now() };
  const last = state.explanations[state.explanations.length - 1];
  if (last?.decision === next.decision && last?.reason === next.reason) return state;
  state.explanations.push(next);
  state.explanations = state.explanations.slice(-40);
  state.updated_at = now();
  return state;
}

export function recordReasoningDeviation(state: AgentReasoningState, type: string, detail: string, severity: "info" | "warning" | "error" = "warning") {
  const normalized = compact(detail, 1600);
  if (!normalized) return state;
  const last = state.deviations[state.deviations.length - 1];
  if (last?.type === type && last?.detail === normalized) return state;
  state.deviations.push({ id: `dev_${Date.now().toString(36)}_${crypto.randomBytes(2).toString("hex")}`, type, detail: normalized, severity, at: now() });
  if (severity !== "info" || type === "fact_changed") {
    state.replan_required = true;
    state.last_replan_reason = normalized;
  }
  state.deviations = state.deviations.slice(-40);
  state.updated_at = now();
  return state;
}

export function recordReasoningPostmortem(state: AgentReasoningState, input: { trigger: string; whatHappened: string; correction: string; preventRepeat: string }) {
  const next = {
    trigger: compact(input.trigger, 500), what_happened: compact(input.whatHappened, 1200), correction: compact(input.correction, 1200),
    prevent_repeat: compact(input.preventRepeat, 1200), at: now(),
  };
  const last = state.postmortems[state.postmortems.length - 1];
  if (last?.trigger === next.trigger && last?.what_happened === next.what_happened) return state;
  state.postmortems.push(next);
  state.postmortems = state.postmortems.slice(-30);
  state.updated_at = now();
  return state;
}

export function setReasoningAssertion(state: AgentReasoningState, input: { id: string; label?: string; kind?: string; status: ReasoningAssertionStatus; evidence?: any[]; reason?: string }) {
  const at = now();
  const index = state.assertions.findIndex(item => item.id === input.id);
  const next = {
    id: input.id, label: compact(input.label || state.assertions[index]?.label || input.id, 600), kind: String(input.kind || state.assertions[index]?.kind || "goal"),
    status: input.status, evidence: strings(input.evidence, 20), reason: compact(input.reason, 800), updated_at: at,
  };
  if (index >= 0) state.assertions[index] = next;
  else state.assertions.push(next);
  state.assertions = state.assertions.slice(-40);
  state.updated_at = at;
  return state;
}

export function recordReasoningRecoveryCheck(state: AgentReasoningState, input: { reason: string; goalRevalidated: boolean; stateRevalidated: boolean; acceptanceRevalidated: boolean; remainingGaps?: any[] }) {
  state.recovery_checks.push({
    reason: compact(input.reason, 800), goal_revalidated: input.goalRevalidated, state_revalidated: input.stateRevalidated,
    acceptance_revalidated: input.acceptanceRevalidated, remaining_gaps: strings(input.remainingGaps, 30), at: now(),
  });
  state.recovery_checks = state.recovery_checks.slice(-20);
  state.updated_at = now();
  return state;
}

export function buildTaskReasoningState(task: any, summary: any = {}) {
  const existing = normalizeAgentReasoningState(task?.reasoning_loop, task?.business_goal || task?.title || "");
  setReasoningAssertion(existing, { id: "goal", label: "业务目标得到满足", kind: "goal", status: summary.acceptance_gate_passed ? "passed" : "pending", evidence: summary.actions || [] });
  setReasoningAssertion(existing, { id: "files", label: "存在系统捕获的真实文件变更", kind: "delivery", status: summary.has_actual_file_changes || task?.requires_code_changes === false ? "passed" : "pending", evidence: summary.files_changed || [] });
  setReasoningAssertion(existing, { id: "verification", label: "独立 Runner 验证通过", kind: "verification", status: summary.verification_source_gate_passed ? "passed" : "pending", evidence: summary.external_runner_verification || [] });
  setReasoningAssertion(existing, { id: "independent_review", label: "复杂变更已由独立 Agent 复核", kind: "verification", status: summary.independent_review_required === true && summary.independent_review_gate_passed !== true ? "pending" : "passed", evidence: summary.independent_review_evidence?.map((item: any) => item.summary || item.verdict || item.reviewer) || [] });
  setReasoningAssertion(existing, { id: "acceptance", label: "主 Agent 最终验收门禁通过", kind: "acceptance", status: summary.acceptance_gate_passed ? "passed" : "pending", evidence: summary.acceptance_gate?.checks?.filter((item: any) => item.ok).map((item: any) => item.label) || [] });
  const gaps = summary.acceptance_gate?.failed_checks?.map((item: any) => item.label || item.id) || [];
  if (gaps.length) recordReasoningDeviation(existing, "acceptance_gap", `仍有 ${gaps.length} 项验收缺口：${gaps.join("、")}`, "warning");
  if (gaps.length) recordReasoningPostmortem(existing, { trigger: "acceptance_gap", whatHappened: `子 Agent 交付后仍有 ${gaps.length} 项门禁未通过`, correction: "保持任务和会话，按失败门禁生成返工或等待用户信息", preventRepeat: "下一轮工作单明确注入未通过断言与独立验证要求" });
  explainReasoningDecision(existing, summary.acceptance_gate_passed ? "complete" : "continue_or_rework", summary.acceptance_gate_passed ? "真实文件、独立验证和最终验收断言均已通过" : `仍有 ${gaps.length || "未量化"} 项验收缺口，不能宣告完成`);
  captureReasoningFacts(existing, "delivery_summary", {
    task_status: task?.status, lifecycle: summary.lifecycle?.state, files: summary.actual_file_change_count || 0,
    external_verification: summary.external_runner_verification_count || 0, independent_review: summary.independent_review_gate?.status || "", blockers: summary.blockers || [], needs: summary.needs || [], gaps,
  });
  return existing;
}

export function runAgentReasoningLoopSelfTest() {
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
