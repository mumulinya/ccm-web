import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "../../core/utils";
import { ensureTraceId } from "../../system/reliability-ledger";
import { normalizeAgentReasoningState } from "../reasoning-loop";
import type { GlobalAgentDecisionState, GlobalAgentRun, GlobalAgentRunStatus, GlobalAgentToolRisk, GlobalAgentToolSpec, GlobalAgentUserSteer, GlobalAgentUserSteerStatus } from "./loop";

export const STORE_DIR = path.join(CCM_DIR, "global-agent-runs");
export const STORE_FILE = path.join(STORE_DIR, "runs.json");
export const STORE_BACKUP = `${STORE_FILE}.bak`;
export const MAX_STORED_RUNS = 120;
export const MAX_OBSERVATION_CHARS = 4_000;
export const GLOBAL_DISPATCH_TOOL_NAMES = ["orchestrate_development", "create_requirement_epic", "send_group_cmd", "send_project_cmd", "create_task"];
/** 浏览器 UI 副作用：按轻量 reply 展示，不挂交付脚手架 */
export const LIGHT_UI_TOOL_NAMES = ["play_music", "stop_music", "navigate"];
export type GlobalAgentRunPresentation = "reply" | "plan" | "delivery";
export const activeRuns = new Set<string>();
export const pauseRequests = new Set<string>();
export const cancelRequests = new Set<string>();
export const volatileRuns = new Map<string, GlobalAgentRun>();
export const activeRunObjects = new Map<string, GlobalAgentRun>();

let runStoreCache: { version: 1; runs: GlobalAgentRun[]; mtimeMs: number } | null = null;

export function invalidateGlobalAgentRunStoreCache() {
  runStoreCache = null;
}

function truncateStepObservation(step: any) {
  if (!step || typeof step !== "object" || step.observation === undefined) return step;
  let serialized = "";
  try {
    serialized = typeof step.observation === "string" ? step.observation : JSON.stringify(step.observation);
  } catch {
    serialized = String(step.observation);
  }
  if (serialized.length <= MAX_OBSERVATION_CHARS) return step;
  return {
    ...step,
    observation: {
      truncated: true,
      preview: serialized.slice(0, MAX_OBSERVATION_CHARS),
      original_chars: serialized.length,
    },
  };
}

export function destructiveOperation(args: any) {
  return ["delete", "remove", "remove_member", "purge", "drop"].includes(String(args?.operation || "").toLowerCase());
}


export function writeJsonAtomic(file: string, value: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(2).toString("hex")}.tmp`;
  if (fs.existsSync(file)) {
    try { fs.copyFileSync(file, `${file}.bak`); } catch {}
  }
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

export function normalizeGlobalAgentUserSteer(value: any): GlobalAgentUserSteer | null {
  const message = String(value?.message || "").trim().slice(0, 8_000);
  if (!message) return null;
  const kind = String(value?.kind || "") === "revise_goal" ? "revise_goal" : "supplement";
  const status = String(value?.status || "") === "applied" ? "applied" : "queued";
  return {
    id: String(value?.id || `steer_${Date.now().toString(36)}_${crypto.randomBytes(3).toString("hex")}`),
    message,
    kind,
    source: String(value?.source || "user").trim().slice(0, 120) || "user",
    request_id: String(value?.request_id || value?.requestId || "").trim().slice(0, 160) || undefined,
    at: String(value?.at || new Date().toISOString()),
    status,
    applied_at: status === "applied" ? String(value?.applied_at || value?.appliedAt || value?.at || new Date().toISOString()) : undefined,
    authorization_preserved: value?.authorization_preserved === true || value?.authorizationPreserved === true,
  };
}

export function normalizeGlobalAgentUserSteers(value: any, status?: GlobalAgentUserSteerStatus, limit = 30) {
  return (Array.isArray(value) ? value : [])
    .map(normalizeGlobalAgentUserSteer)
    .filter((item): item is GlobalAgentUserSteer => !!item && (!status || item.status === status))
    .slice(-limit);
}

export function normalizeRun(run: any): GlobalAgentRun {
  const pendingUserMessages = normalizeGlobalAgentUserSteers(run?.pending_user_messages || run?.pendingUserMessages, "queued", 20);
  const userSteerHistory = normalizeGlobalAgentUserSteers(run?.user_steer_history || run?.userSteerHistory, undefined, 40);
  const lastUserSteer = normalizeGlobalAgentUserSteer(run?.last_user_steer || run?.lastUserSteer);
  return {
    version: 1,
    id: String(run?.id || ""),
    trace_id: ensureTraceId(run?.trace_id, "global-agent"),
    session_id: String(run?.session_id || "default"),
    source: String(run?.source || "web"),
    user_message: String(run?.user_message || "").slice(0, 50_000),
    history: Array.isArray(run?.history) ? run.history.slice(-12).map((item: any) => ({ role: item.role === "assistant" ? "assistant" : "user", content: String(item.content || "").slice(0, 8_000) })) : [],
    status: (["running", "supervising", "paused", "waiting_confirmation", "waiting_clarification", "completed", "failed", "cancelled"].includes(run?.status) ? run.status : "failed") as GlobalAgentRunStatus,
    phase: (["answer", "investigate", "plan", "execute", "needs_confirmation", "complete"].includes(run?.phase) ? run.phase : "plan") as GlobalAgentDecisionState,
    explicit_write_authorization: run?.explicit_write_authorization === true,
    created_at: run?.created_at || new Date().toISOString(),
    updated_at: run?.updated_at || new Date().toISOString(),
    started_at: run?.started_at || run?.created_at || new Date().toISOString(),
    completed_at: run?.completed_at,
    metrics_recorded: run?.metrics_recorded === true,
    usage: run?.usage && typeof run.usage === "object" ? {
      inputTokens: Math.max(0, Math.floor(Number(run.usage.inputTokens ?? run.usage.input_tokens ?? 0) || 0)),
      outputTokens: Math.max(0, Math.floor(Number(run.usage.outputTokens ?? run.usage.output_tokens ?? 0) || 0)),
      totalTokens: Math.max(0, Math.floor(Number(run.usage.totalTokens ?? run.usage.total_tokens ?? 0) || 0)),
      reported: run.usage.reported !== false,
      directInputTokens: Math.max(0, Math.floor(Number(run.usage.directInputTokens ?? run.usage.direct_input_tokens ?? 0) || 0)),
      cacheCreationInputTokens: Math.max(0, Math.floor(Number(run.usage.cacheCreationInputTokens ?? run.usage.cache_creation_input_tokens ?? 0) || 0)),
      cacheReadInputTokens: Math.max(0, Math.floor(Number(run.usage.cacheReadInputTokens ?? run.usage.cache_read_input_tokens ?? 0) || 0)),
      totalCostUsd: Math.max(0, Number(run.usage.totalCostUsd ?? run.usage.total_cost_usd ?? 0) || 0),
    } : null,
    input_tokens: Math.max(0, Math.floor(Number(run?.input_tokens ?? run?.inputTokens ?? run?.usage?.inputTokens ?? 0) || 0)),
    output_tokens: Math.max(0, Math.floor(Number(run?.output_tokens ?? run?.outputTokens ?? run?.usage?.outputTokens ?? 0) || 0)),
    total_cost_usd: Math.max(0, Number(run?.total_cost_usd ?? run?.totalCostUsd ?? run?.usage?.totalCostUsd ?? 0) || 0),
    deadline_at: run?.deadline_at || new Date(Date.now() + 10 * 60_000).toISOString(),
    max_steps: Math.max(1, Math.min(16, Number(run?.max_steps || 8))),
    steps: Array.isArray(run?.steps) ? run.steps.slice(-32).map(truncateStepObservation) : [],
    pending_tool: run?.pending_tool || null,
    approved_tool_signatures: Array.isArray(run?.approved_tool_signatures) ? run.approved_tool_signatures.slice(-20) : [],
    final_reply: String(run?.final_reply || ""),
    error: String(run?.error || ""),
    resume_count: Number(run?.resume_count || 0),
    model_calls: Number(run?.model_calls || 0),
    tool_calls: Number(run?.tool_calls || 0),
    consecutive_failures: Number(run?.consecutive_failures || 0),
    client_effects: Array.isArray(run?.client_effects) ? run.client_effects.slice(-20) : [],
    presentation: (["reply", "plan", "delivery"].includes(String(run?.presentation || ""))
      ? String(run.presentation)
      : undefined) as GlobalAgentRunPresentation | undefined,
    mission_id: String(run?.mission_id || ""),
    supervisor_id: String(run?.supervisor_id || ""),
    supervision_state: String(run?.supervision_state || ""),
    final_delivery_report: run?.final_delivery_report || null,
    final_report: run?.final_report || null,
    display_stream: run?.display_stream || null,
    workchain: run?.workchain || null,
    todo_plan: run?.todo_plan || run?.todoPlan || run?.workchain?.todo_plan || run?.workchain?.todoPlan || null,
    todoPlan: run?.todoPlan || run?.todo_plan || run?.workchain?.todoPlan || run?.workchain?.todo_plan || null,
    test_agent_execution_plan: run?.test_agent_execution_plan || run?.testAgentExecutionPlan || null,
    testAgentExecutionPlan: run?.testAgentExecutionPlan || run?.test_agent_execution_plan || null,
    test_agent_execution_plan_summary: run?.test_agent_execution_plan_summary || run?.testAgentExecutionPlanSummary || null,
    testAgentExecutionPlanSummary: run?.testAgentExecutionPlanSummary || run?.test_agent_execution_plan_summary || null,
    test_agent_execution_plan_detail: String(run?.test_agent_execution_plan_detail || run?.testAgentExecutionPlanDetail || ""),
    testAgentExecutionPlanDetail: String(run?.testAgentExecutionPlanDetail || run?.test_agent_execution_plan_detail || ""),
    test_agent_review_summary: run?.test_agent_review_summary || run?.testAgentReviewSummary || run?.independent_review_summary || run?.independentReviewSummary || null,
    testAgentReviewSummary: run?.testAgentReviewSummary || run?.test_agent_review_summary || run?.independentReviewSummary || run?.independent_review_summary || null,
    independent_review_summary: run?.independent_review_summary || run?.independentReviewSummary || run?.test_agent_review_summary || run?.testAgentReviewSummary || null,
    independentReviewSummary: run?.independentReviewSummary || run?.independent_review_summary || run?.testAgentReviewSummary || run?.test_agent_review_summary || null,
    independent_review: Array.isArray(run?.independent_review) ? run.independent_review : Array.isArray(run?.independentReview) ? run.independentReview : [],
    independentReview: Array.isArray(run?.independentReview) ? run.independentReview : Array.isArray(run?.independent_review) ? run.independent_review : [],
    test_agent_report: run?.test_agent_report || run?.testAgentReport || null,
    testAgentReport: run?.testAgentReport || run?.test_agent_report || null,
    decision_summary: run?.decision_summary || null,
    workflow_decision: run?.workflow_decision || run?.workflowDecision || null,
    workflowDecision: run?.workflowDecision || run?.workflow_decision || null,
    clarification_question: String(run?.clarification_question || ""),
    clarification_summary: run?.clarification_summary || run?.clarificationSummary || null,
    confirmation_summary: run?.confirmation_summary || run?.confirmationSummary || null,
    plan_mode: run?.plan_mode || run?.planMode || null,
    plan_accept_feedback: String(run?.plan_accept_feedback || run?.planAcceptFeedback || ""),
    last_plan_accept_feedback: String(run?.last_plan_accept_feedback || run?.lastPlanAcceptFeedback || ""),
    last_plan_accept_feedback_at: String(run?.last_plan_accept_feedback_at || run?.lastPlanAcceptFeedbackAt || ""),
    resume_feedback: String(run?.resume_feedback || run?.resumeFeedback || ""),
    resumeFeedback: String(run?.resumeFeedback || run?.resume_feedback || ""),
    last_resume_feedback: String(run?.last_resume_feedback || run?.lastResumeFeedback || ""),
    lastResumeFeedback: String(run?.lastResumeFeedback || run?.last_resume_feedback || ""),
    last_resume_feedback_at: String(run?.last_resume_feedback_at || run?.lastResumeFeedbackAt || ""),
    lastResumeFeedbackAt: String(run?.lastResumeFeedbackAt || run?.last_resume_feedback_at || ""),
    resume_feedback_history: Array.isArray(run?.resume_feedback_history) ? run.resume_feedback_history.slice(-20) : Array.isArray(run?.resumeFeedbackHistory) ? run.resumeFeedbackHistory.slice(-20) : [],
    resumeFeedbackHistory: Array.isArray(run?.resumeFeedbackHistory) ? run.resumeFeedbackHistory.slice(-20) : Array.isArray(run?.resume_feedback_history) ? run.resume_feedback_history.slice(-20) : [],
    pending_user_messages: pendingUserMessages,
    pendingUserMessages,
    user_steer_history: userSteerHistory,
    userSteerHistory,
    last_user_steer: lastUserSteer,
    lastUserSteer,
    shadow_mode: run?.shadow_mode === true,
    original_user_message: String(run?.original_user_message || run?.user_message || "").slice(0, 50_000),
    reasoning_loop: normalizeAgentReasoningState(run?.reasoning_loop, run?.original_user_message || run?.user_message || ""),
  };
}

export function loadStore(): { version: 1; runs: GlobalAgentRun[] } {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const mtimeMs = fs.statSync(STORE_FILE).mtimeMs;
      if (runStoreCache && runStoreCache.mtimeMs === mtimeMs) {
        return { version: 1, runs: runStoreCache.runs.slice() };
      }
      const data = JSON.parse(fs.readFileSync(STORE_FILE, "utf-8"));
      const runs = (Array.isArray(data?.runs) ? data.runs : []).map(normalizeRun);
      runStoreCache = { version: 1, runs, mtimeMs };
      return { version: 1, runs: runs.slice() };
    }
  } catch {}
  for (const file of [STORE_BACKUP]) {
    try {
      if (!fs.existsSync(file)) continue;
      const data = JSON.parse(fs.readFileSync(file, "utf-8"));
      const runs = (Array.isArray(data?.runs) ? data.runs : []).map(normalizeRun);
      runStoreCache = { version: 1, runs, mtimeMs: 0 };
      return { version: 1, runs: runs.slice() };
    } catch {}
  }
  runStoreCache = { version: 1, runs: [], mtimeMs: 0 };
  return { version: 1, runs: [] };
}

export function saveRun(run: GlobalAgentRun, persist = true) {
  if (!persist) {
    volatileRuns.set(run.id, normalizeRun(run));
    if (volatileRuns.size > 50) volatileRuns.delete(volatileRuns.keys().next().value as string);
    return;
  }
  const store = loadStore();
  const normalized = normalizeRun(run);
  const index = store.runs.findIndex(item => item.id === run.id);
  if (index >= 0) store.runs[index] = normalized;
  else store.runs.unshift(normalized);
  store.runs = store.runs
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
    .slice(0, MAX_STORED_RUNS);
  writeJsonAtomic(STORE_FILE, store);
  let mtimeMs = Date.now();
  try { mtimeMs = fs.statSync(STORE_FILE).mtimeMs; } catch {}
  runStoreCache = { version: 1, runs: store.runs.slice(), mtimeMs };
}

export function getGlobalAgentRun(id: string) {
  return activeRunObjects.get(id) || volatileRuns.get(id) || loadStore().runs.find(run => run.id === id) || null;
}


export function listGlobalAgentRuns(options: { sessionId?: string; status?: string; limit?: number } = {}) {
  return loadStore().runs
    .filter(run => !options.sessionId || run.session_id === options.sessionId)
    .filter(run => !options.status || run.status === options.status)
    .slice(0, Math.max(1, Math.min(100, Number(options.limit || 30))));
}

export function findWaitingGlobalAgentRun(sessionId: string) {
  return listGlobalAgentRuns({ sessionId, status: "waiting_confirmation", limit: 1 })[0] || null;
}

export function findClarifyingGlobalAgentRun(sessionId: string, maxAgeMs = 30 * 60_000) {
  const run = listGlobalAgentRuns({ sessionId, status: "waiting_clarification", limit: 1 })[0] || null;
  if (!run) return null;
  return Date.now() - Date.parse(run.updated_at) <= maxAgeMs ? run : null;
}

export function getGlobalAgentToolSpec(name: string) {
  return GLOBAL_AGENT_TOOL_SPECS.find(item => item.name === name) || null;
}

export function classifyGlobalAgentToolRisk(name: string, args: any): GlobalAgentToolRisk {
  const spec = getGlobalAgentToolSpec(name);
  if (!spec) throw new Error(`未知工具：${name}`);
  return typeof spec.risk === "function" ? spec.risk(args || {}) : spec.risk;
}

export function hasUserVisibleGlobalPlan(run: GlobalAgentRun | any) {
  const plan = run?.plan_mode || run?.planMode || null;
  if (plan) {
    const steps = Array.isArray(plan.steps) ? plan.steps : Array.isArray(plan.plan_steps) ? plan.plan_steps : [];
    if (steps.length) return true;
    if (String(plan.content || plan.summary || plan.markdown || plan.title || plan.next_step || "").trim()) return true;
    if (Array.isArray(plan.clarification_questions) && plan.clarification_questions.length) return true;
  }
  const todo = run?.todo_plan || run?.todoPlan || run?.workchain?.todo_plan || run?.workchain?.todoPlan || null;
  if (todo) {
    const steps = Array.isArray(todo.steps) ? todo.steps : Array.isArray(todo.items) ? todo.items : Array.isArray(todo.todos) ? todo.todos : [];
    if (steps.length) return true;
  }
  const decision = run?.main_agent_decision || run?.mainAgentDecision || null;
  if (Array.isArray(decision?.user_plan_steps) && decision.user_plan_steps.length) return true;
  return false;
}

export function classifyGlobalAgentRunPresentation(run: GlobalAgentRun | any, status: GlobalAgentRunStatus | string = run?.status): GlobalAgentRunPresentation {
  const explicit = String(run?.presentation || "").trim().toLowerCase();
  if (explicit === "reply" || explicit === "plan" || explicit === "delivery") return explicit as GlobalAgentRunPresentation;

  const normalizedStatus = String(status || run?.status || "").toLowerCase();
  if (run?.mission_id || run?.supervisor_id) return "delivery";
  if (normalizedStatus === "supervising") return "delivery";

  const tools = (Array.isArray(run?.steps) ? run.steps : [])
    .map((step: any) => step?.tool)
    .filter(Boolean)
    .concat(run?.pending_tool ? [run.pending_tool] : []);
  const hasWriteOrDispatch = tools.some((tool: any) => {
    const risk = String(tool?.risk || "").toLowerCase();
    const name = String(tool?.name || "");
    return risk === "write" || risk === "high" || GLOBAL_DISPATCH_TOOL_NAMES.includes(name);
  });
  if (hasWriteOrDispatch) return "delivery";

  if (["waiting_confirmation", "waiting_clarification"].includes(normalizedStatus)) {
    return hasUserVisibleGlobalPlan(run) ? "plan" : "delivery";
  }

  const toolCalls = Number(run?.tool_calls || 0);
  if (toolCalls === 0 && !tools.length) return "reply";
  const allLight = tools.length > 0 && tools.every((tool: any) => {
    const risk = String(tool?.risk || "").toLowerCase();
    const name = String(tool?.name || "");
    return risk === "read" || LIGHT_UI_TOOL_NAMES.includes(name);
  });
  // 轻量 UI/只读工具优先 reply；勿因误挂的 plan_mode 升成 plan 卡
  if (allLight) return "reply";
  if (Array.isArray(run?.client_effects) && run.client_effects.length && !hasWriteOrDispatch) return "reply";
  if (hasUserVisibleGlobalPlan(run)) return "plan";
  return "reply";
}

export function isReadOnlyGlobalConsultation(run: GlobalAgentRun, status: GlobalAgentRunStatus) {
  if (status !== "completed" || run.mission_id) return false;
  // 点歌/导航等 UI 副作用与只读查询统一按轻量咨询，不受 intent.category=execution 误伤
  return classifyGlobalAgentRunPresentation(run, status) === "reply";
}

export function stable(value: any): any {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}

export function toolSignature(name: string, args: any) {
  return crypto.createHash("sha256").update(`${name}:${JSON.stringify(stable(args || {}))}`).digest("hex").slice(0, 24);
}

export function validateTool(name: string, args: any) {
  const spec = getGlobalAgentToolSpec(name);
  if (!spec) throw new Error(`模型选择了未注册工具：${name}`);
  const values = args && typeof args === "object" && !Array.isArray(args) ? args : {};
  const missing = (spec.required || []).filter(key => values[key] === undefined || values[key] === null || values[key] === "" || (Array.isArray(values[key]) && values[key].length === 0));
  if (missing.length) throw new Error(`${name} 缺少参数：${missing.join("、")}`);
  return values;
}


export const GLOBAL_AGENT_TOOL_SPECS: GlobalAgentToolSpec[] = [
  { name: "inspect_system", description: "读取 CCM 服务、项目、群聊、任务、定时任务和执行器概况。", risk: "read" },
  { name: "list_projects", description: "列出真实项目及 Agent 配置。", risk: "read" },
  { name: "inspect_project", description: "读取指定项目的路由配置；项目记忆由群聊主 Agent 和项目子 Agent 使用。", required: ["project"], risk: "read" },
  { name: "list_groups", description: "列出群聊、成员项目及协调配置。", risk: "read" },
  { name: "list_tasks", description: "查询开发任务；可按 id 或 status 过滤。", risk: "read" },
  { name: "list_cron", description: "查询定时任务。", risk: "read" },
  { name: "query_knowledge", description: "查询本地知识库，只用于获取回答或规划依据。", required: ["query"], risk: "read" },
  { name: "query_global_memory", description: "查询全局 Agent 的长期记忆、历史任务结论和来源引用。", required: ["query"], risk: "read" },
  { name: "manage_global_memory", description: "查询状态、压缩、重建、启用或禁用全局 Agent 长期记忆；变更操作必须提供 reason。", required: ["operation"], risk: args => String(args?.operation || "").toLowerCase() === "status" ? "read" : ["disable", "rebuild"].includes(String(args?.operation || "").toLowerCase()) ? "high" : "write" },
  { name: "inspect_mission", description: "查询全局开发任务及子任务交付状态。", required: ["id"], risk: "read" },
  { name: "inspect_supervision", description: "查询长期任务跟进、恢复动作、交付验收和等待人工事项。", required: ["id"], risk: "read" },
  { name: "decompose_requirement_epic", description: "由你在完整理解用户语义后选择调用：当需求来自 PRD/需求文档、跨项目或包含多个可独立验收子目标时，按需生成结构化 Epic/DAG 任务图。该工具只读，不创建任务；普通问答、方案咨询和简单单项目修复不要调用。", risk: "read" },
  { name: "create_requirement_epic", description: "按用户已确认的需求文档拆解计划，原子创建 Epic 父任务和多个持久子任务并开始依赖调度。计划含 clarification_questions 时必须先逐项获得用户答案，再传已按答案更新且清空阻断问题的 decomposition_plan 与 clarifications_resolved=true；不得用普通确认绕过阻断问题。", risk: "write" },
  { name: "orchestrate_development", description: "创建跨项目开发任务并持久派发给真实群聊或项目 Agent。", required: ["business_goal", "targets"], risk: "write" },
  { name: "manage_supervision", description: "暂停、恢复、立即检查、修改目标、取消、归档或人工接管长期任务跟进。", required: ["id", "operation"], risk: args => ["cancel", "archive"].includes(String(args?.operation || "").toLowerCase()) ? "high" : "write" },
  { name: "create_task", description: "创建并派发单群聊开发任务。", required: ["title", "business_goal", "group_id"], risk: "write" },
  { name: "send_project_cmd", description: "把单项目需求交给该项目所属的群聊主 Agent，由其计划、派发项目子 Agent、验收并调用 TestAgent。", required: ["project", "message"], risk: "write" },
  { name: "send_group_cmd", description: "向指定群聊主 Agent 下发协作任务。", required: ["group_id", "message"], risk: "write" },
  { name: "manage_cron", description: "管理定时任务。", required: ["operation"], risk: args => destructiveOperation(args) ? "high" : "write" },
  { name: "manage_group", description: "管理群聊和成员。", required: ["operation"], risk: args => destructiveOperation(args) ? "high" : "write" },
  { name: "manage_project", description: "管理项目及其 Agent 进程。", required: ["operation"], risk: args => destructiveOperation(args) ? "high" : "write" },
  { name: "manage_task", description: "暂停、恢复、续跑、重试、排队或删除任务。", required: ["operation"], risk: args => destructiveOperation(args) ? "high" : "write" },
  { name: "manage_tool", description: "管理 MCP 和 Skill。", required: ["operation"], risk: args => destructiveOperation(args) ? "high" : "write" },
  { name: "git_review", description: "读取并审查指定项目的 Git 变更。", required: ["project"], risk: "read" },
  { name: "git_commit", description: "提交指定项目的代码变更。", required: ["project"], risk: "write" },
  { name: "create_template", description: "创建全局对话模板。", required: ["name", "content"], risk: "write" },
  { name: "play_music", description: "理解用户的点歌、歌手、心情或场景请求并播放音乐（浏览器 UI 副作用，自动执行，不需要写授权确认）。keyword 可为歌名、歌手、风格、情绪搜索主题，或 __random__ 表示随机播放。", required: ["keyword"], risk: "read" },
  { name: "stop_music", description: "停止当前正在播放的音乐（浏览器 UI 副作用，自动执行，不需要写授权确认）。用于用户说关闭/停止/关掉音乐、停歌等。", required: [], risk: "read" },
  { name: "toggle_pet", description: "打开或关闭桌面宠物。", required: ["action"], risk: "write" },
  { name: "navigate", description: "通知 Web 客户端切换页面；不改变项目数据。", required: ["tab"], risk: "read" },
];
