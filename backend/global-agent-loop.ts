import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { CCM_DIR } from "./utils";
import { appendTraceEvent, ensureTraceId } from "./reliability-ledger";
import { recordAgentRuntimeLifecycle } from "./agent-runtime-kernel";
import { evaluateAgentDecision, normalizeAgentDecisionIntent, recordAgentDecision, type AgentDecisionIntent } from "./agent-quality-center";
import {
  appendReasoningClarification,
  captureReasoningFacts,
  createAgentReasoningState,
  explainReasoningDecision,
  normalizeAgentReasoningState,
  recordReasoningDeviation,
  recordReasoningPostmortem,
  recordReasoningRecoveryCheck,
  setReasoningAssertion,
  updateReasoningPlan,
  type AgentReasoningState,
} from "./agent-reasoning-loop";
import {
  buildGlobalAgentToolDefinitions,
  evaluateGlobalAgentPermission,
  initializeGlobalAgentRuntimeRun,
  markGlobalAgentToolTodo,
  recordGlobalAgentRuntimeOutput,
  runGlobalAgentHooks,
  updateGlobalAgentTodoLedger,
} from "./global-agent-runtime";

export type GlobalAgentRunStatus = "running" | "supervising" | "paused" | "waiting_confirmation" | "waiting_clarification" | "completed" | "failed" | "cancelled";
export type GlobalAgentDecisionState = "answer" | "investigate" | "plan" | "execute" | "needs_confirmation" | "complete";
export type GlobalAgentToolRisk = "read" | "write" | "high";

export interface GlobalAgentToolSpec {
  name: string;
  description: string;
  required?: string[];
  risk: GlobalAgentToolRisk | ((args: any) => GlobalAgentToolRisk);
}

export interface GlobalAgentDecision {
  state: GlobalAgentDecisionState;
  message?: string;
  plan?: string[];
  tool?: { name: string; arguments?: any } | null;
  intent?: Partial<AgentDecisionIntent>;
  completion?: { summary?: string; evidence?: string[]; risks?: string[]; next_action?: string };
}

export interface GlobalAgentRunStep {
  index: number;
  at: string;
  state: GlobalAgentDecisionState;
  message: string;
  plan: string[];
  tool?: { name: string; arguments: any; risk: GlobalAgentToolRisk; signature: string };
  observation?: any;
  error?: string;
  duration_ms?: number;
  decision?: any;
}

export interface GlobalAgentRun {
  version: 1;
  id: string;
  trace_id: string;
  session_id: string;
  source: string;
  user_message: string;
  history: Array<{ role: string; content: string }>;
  status: GlobalAgentRunStatus;
  phase: GlobalAgentDecisionState;
  explicit_write_authorization: boolean;
  created_at: string;
  updated_at: string;
  started_at: string;
  completed_at?: string;
  deadline_at: string;
  max_steps: number;
  steps: GlobalAgentRunStep[];
  pending_tool?: { name: string; arguments: any; risk: GlobalAgentToolRisk; signature: string } | null;
  approved_tool_signatures: string[];
  final_reply: string;
  error: string;
  resume_count: number;
  model_calls: number;
  tool_calls: number;
  consecutive_failures: number;
  client_effects: any[];
  mission_id?: string;
  supervisor_id?: string;
  supervision_state?: string;
  final_delivery_report?: any;
  decision_summary?: any;
  clarification_question?: string;
  shadow_mode?: boolean;
  original_user_message?: string;
  reasoning_loop: AgentReasoningState;
}

export interface GlobalAgentLoopRuntime {
  callModel: (messages: Array<{ role: string; content: string }>, run: GlobalAgentRun) => Promise<string | GlobalAgentDecision>;
  executeTool: (name: string, args: any, run: GlobalAgentRun) => Promise<any>;
  getContext?: (run: GlobalAgentRun) => Promise<any> | any;
  fallbackDecision?: (run: GlobalAgentRun, error: any) => Promise<GlobalAgentDecision | null> | GlobalAgentDecision | null;
  onEvent?: (event: any, run: GlobalAgentRun) => void;
  persist?: boolean;
  now?: () => number;
  qualityPolicyOverride?: any;
}

const STORE_DIR = path.join(CCM_DIR, "global-agent-runs");
const STORE_FILE = path.join(STORE_DIR, "runs.json");
const STORE_BACKUP = `${STORE_FILE}.bak`;
const MAX_STORED_RUNS = 120;
const MAX_OBSERVATION_CHARS = 12_000;
const activeRuns = new Set<string>();
const pauseRequests = new Set<string>();
const cancelRequests = new Set<string>();
const volatileRuns = new Map<string, GlobalAgentRun>();

export const GLOBAL_AGENT_TOOL_SPECS: GlobalAgentToolSpec[] = [
  { name: "inspect_system", description: "读取 CCM 服务、项目、群聊、任务、定时任务和执行器概况。", risk: "read" },
  { name: "list_projects", description: "列出真实项目及 Agent 配置。", risk: "read" },
  { name: "inspect_project", description: "读取指定项目配置、目录结构和项目记忆。", required: ["project"], risk: "read" },
  { name: "list_groups", description: "列出群聊、成员项目及协调配置。", risk: "read" },
  { name: "list_tasks", description: "查询开发任务；可按 id 或 status 过滤。", risk: "read" },
  { name: "list_cron", description: "查询定时任务。", risk: "read" },
  { name: "query_knowledge", description: "查询本地知识库，只用于获取回答或规划依据。", required: ["query"], risk: "read" },
  { name: "query_global_memory", description: "查询全局 Agent 的长期记忆、历史任务结论和来源引用。", required: ["query"], risk: "read" },
  { name: "manage_global_memory", description: "查询状态、压缩、重建、启用或禁用全局 Agent 长期记忆；变更操作必须提供 reason。", required: ["operation"], risk: args => String(args?.operation || "").toLowerCase() === "status" ? "read" : ["disable", "rebuild"].includes(String(args?.operation || "").toLowerCase()) ? "high" : "write" },
  { name: "inspect_mission", description: "查询全局开发任务及子任务交付状态。", required: ["id"], risk: "read" },
  { name: "inspect_supervision", description: "查询异步任务监工、恢复动作、交付门禁和等待人工事项。", required: ["id"], risk: "read" },
  { name: "orchestrate_development", description: "创建跨项目开发任务并持久派发给真实群聊或项目 Agent。", required: ["business_goal", "targets"], risk: "write" },
  { name: "manage_supervision", description: "暂停、恢复、立即检查、修改目标、取消、归档或人工接管异步任务监工。", required: ["id", "operation"], risk: args => ["cancel", "archive"].includes(String(args?.operation || "").toLowerCase()) ? "high" : "write" },
  { name: "create_task", description: "创建并派发单群聊开发任务。", required: ["title", "business_goal", "group_id"], risk: "write" },
  { name: "send_project_cmd", description: "让指定项目 Agent 执行代码调查、修改或验证。", required: ["project", "message"], risk: "write" },
  { name: "send_group_cmd", description: "向指定群聊主 Agent 下发协作任务。", required: ["group_id", "message"], risk: "write" },
  { name: "manage_cron", description: "管理定时任务。", required: ["operation"], risk: args => destructiveOperation(args) ? "high" : "write" },
  { name: "manage_group", description: "管理群聊和成员。", required: ["operation"], risk: args => destructiveOperation(args) ? "high" : "write" },
  { name: "manage_project", description: "管理项目及其 Agent 进程。", required: ["operation"], risk: args => destructiveOperation(args) ? "high" : "write" },
  { name: "manage_task", description: "暂停、恢复、续跑、重试、排队或删除任务。", required: ["operation"], risk: args => destructiveOperation(args) ? "high" : "write" },
  { name: "manage_tool", description: "管理 MCP 和 Skill。", required: ["operation"], risk: args => destructiveOperation(args) ? "high" : "write" },
  { name: "git_review", description: "读取并审查指定项目的 Git 变更。", required: ["project"], risk: "read" },
  { name: "git_commit", description: "提交指定项目的代码变更。", required: ["project"], risk: "write" },
  { name: "create_template", description: "创建全局对话模板。", required: ["name", "content"], risk: "write" },
  { name: "play_music", description: "搜索并播放音乐。", required: ["keyword"], risk: "write" },
  { name: "toggle_pet", description: "打开或关闭桌面宠物。", required: ["action"], risk: "write" },
  { name: "navigate", description: "通知 Web 客户端切换页面；不改变项目数据。", required: ["tab"], risk: "read" },
];

function destructiveOperation(args: any) {
  return ["delete", "remove", "remove_member", "purge", "drop"].includes(String(args?.operation || "").toLowerCase());
}

function nowIso(runtime?: GlobalAgentLoopRuntime) {
  return new Date(runtime?.now ? runtime.now() : Date.now()).toISOString();
}

function stripNonExecutionReportSections(value: any) {
  return String(value || "")
    .replace(/\n*验证\/证据\s*[:：][\s\S]*?(?=\n+\s*(?:风险|下一步)\s*[:：]|$)/g, "")
    .replace(/\n*风险\s*[:：][\s\S]*?(?=\n+\s*下一步\s*[:：]|$)/g, "")
    .replace(/\n*下一步\s*[:：][^\n]*(?:\n|$)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function writeJsonAtomic(file: string, value: any) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${Date.now()}.${crypto.randomBytes(2).toString("hex")}.tmp`;
  if (fs.existsSync(file)) {
    try { fs.copyFileSync(file, `${file}.bak`); } catch {}
  }
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(temp, file);
}

function normalizeRun(run: any): GlobalAgentRun {
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
    deadline_at: run?.deadline_at || new Date(Date.now() + 10 * 60_000).toISOString(),
    max_steps: Math.max(1, Math.min(16, Number(run?.max_steps || 8))),
    steps: Array.isArray(run?.steps) ? run.steps.slice(-32) : [],
    pending_tool: run?.pending_tool || null,
    approved_tool_signatures: Array.isArray(run?.approved_tool_signatures) ? run.approved_tool_signatures.slice(-20) : [],
    final_reply: String(run?.final_reply || ""),
    error: String(run?.error || ""),
    resume_count: Number(run?.resume_count || 0),
    model_calls: Number(run?.model_calls || 0),
    tool_calls: Number(run?.tool_calls || 0),
    consecutive_failures: Number(run?.consecutive_failures || 0),
    client_effects: Array.isArray(run?.client_effects) ? run.client_effects.slice(-20) : [],
    mission_id: String(run?.mission_id || ""),
    supervisor_id: String(run?.supervisor_id || ""),
    supervision_state: String(run?.supervision_state || ""),
    final_delivery_report: run?.final_delivery_report || null,
    decision_summary: run?.decision_summary || null,
    clarification_question: String(run?.clarification_question || ""),
    shadow_mode: run?.shadow_mode === true,
    original_user_message: String(run?.original_user_message || run?.user_message || "").slice(0, 50_000),
    reasoning_loop: normalizeAgentReasoningState(run?.reasoning_loop, run?.original_user_message || run?.user_message || ""),
  };
}

function loadStore(): { version: 1; runs: GlobalAgentRun[] } {
  for (const file of [STORE_FILE, STORE_BACKUP]) {
    try {
      if (!fs.existsSync(file)) continue;
      const data = JSON.parse(fs.readFileSync(file, "utf-8"));
      return { version: 1, runs: (Array.isArray(data?.runs) ? data.runs : []).map(normalizeRun) };
    } catch {}
  }
  return { version: 1, runs: [] };
}

function saveRun(run: GlobalAgentRun, persist = true) {
  if (!persist) {
    volatileRuns.set(run.id, normalizeRun(run));
    if (volatileRuns.size > 50) volatileRuns.delete(volatileRuns.keys().next().value as string);
    return;
  }
  const store = loadStore();
  const index = store.runs.findIndex(item => item.id === run.id);
  if (index >= 0) store.runs[index] = normalizeRun(run);
  else store.runs.unshift(normalizeRun(run));
  store.runs = store.runs
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
    .slice(0, MAX_STORED_RUNS);
  writeJsonAtomic(STORE_FILE, store);
}

export function getGlobalAgentRun(id: string) {
  return volatileRuns.get(id) || loadStore().runs.find(run => run.id === id) || null;
}

export function attachGlobalAgentRunSupervision(run: GlobalAgentRun, link: { mission_id: string; supervisor_id: string; state?: string }) {
  run.mission_id = String(link.mission_id || "");
  run.supervisor_id = String(link.supervisor_id || "");
  run.supervision_state = String(link.state || "monitoring");
  run.updated_at = new Date().toISOString();
  saveRun(run, !volatileRuns.has(run.id));
  return run;
}

export function completeGlobalAgentSupervision(id: string, report: any, outcome: "completed" | "failed" | "cancelled" = "completed") {
  const stored = getGlobalAgentRun(id);
  if (!stored) return null;
  const run = normalizeRun(stored);
  const completedAt = new Date().toISOString();
  run.supervision_state = outcome;
  run.final_delivery_report = report || null;
  run.status = outcome;
  run.phase = outcome === "completed" ? "complete" : run.phase;
  run.final_reply = report?.formatted || report?.summary || (outcome === "completed" ? "全局任务已通过全部交付门禁。" : `全局任务监督已${outcome === "cancelled" ? "取消" : "失败"}。`);
  run.error = outcome === "failed" ? String(report?.error || "mission_supervision_failed") : "";
  run.completed_at = completedAt;
  run.updated_at = completedAt;
  saveRun(run, !volatileRuns.has(id));
  appendTraceEvent(run.trace_id, { id: `${run.id}:supervision:${outcome}:${completedAt}`, type: `global_agent.supervision_${outcome}`, status: outcome === "completed" ? "ok" : "warning", task_id: run.mission_id || "", message: run.final_reply.slice(0, 1000), data: report || {} });
  return run;
}

export function updateGlobalAgentSupervisionState(id: string, state: string) {
  const stored = getGlobalAgentRun(id);
  if (!stored) return null;
  const run = normalizeRun(stored);
  run.supervision_state = String(state || run.supervision_state || "monitoring");
  if (!["completed", "failed", "cancelled"].includes(run.status)) run.status = state === "paused" ? "paused" : "supervising";
  run.updated_at = new Date().toISOString();
  saveRun(run, !volatileRuns.has(id));
  return run;
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

function stable(value: any): any {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  return value;
}

function toolSignature(name: string, args: any) {
  return crypto.createHash("sha256").update(`${name}:${JSON.stringify(stable(args || {}))}`).digest("hex").slice(0, 24);
}

function validateTool(name: string, args: any) {
  const spec = getGlobalAgentToolSpec(name);
  if (!spec) throw new Error(`模型选择了未注册工具：${name}`);
  const values = args && typeof args === "object" && !Array.isArray(args) ? args : {};
  const missing = (spec.required || []).filter(key => values[key] === undefined || values[key] === null || values[key] === "" || (Array.isArray(values[key]) && values[key].length === 0));
  if (missing.length) throw new Error(`${name} 缺少参数：${missing.join("、")}`);
  return values;
}

function compactObservation(value: any) {
  let text = "";
  try { text = JSON.stringify(value); } catch { text = String(value); }
  if (text.length <= MAX_OBSERVATION_CHARS) return value;
  return { truncated: true, preview: text.slice(0, MAX_OBSERVATION_CHARS), original_chars: text.length };
}

export function parseGlobalAgentDecision(raw: string | GlobalAgentDecision): GlobalAgentDecision {
  if (raw && typeof raw === "object") return normalizeDecision(raw as GlobalAgentDecision);
  const text = String(raw || "").trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const candidates = [fenced, text, text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)].filter(Boolean) as string[];
  let lastError: any;
  for (const candidate of candidates) {
    try { return normalizeDecision(JSON.parse(candidate)); } catch (error) { lastError = error; }
  }
  throw new Error(`Agent 决策不是合法 JSON：${lastError?.message || "无法解析"}`);
}

function normalizeDecision(value: any): GlobalAgentDecision {
  const state = String(value?.state || "").toLowerCase() as GlobalAgentDecisionState;
  if (!["answer", "investigate", "plan", "execute", "needs_confirmation", "complete"].includes(state)) throw new Error(`无效决策状态：${state || "空"}`);
  const tool = value?.tool && value.tool.name ? { name: String(value.tool.name), arguments: value.tool.arguments && typeof value.tool.arguments === "object" ? value.tool.arguments : {} } : null;
  const rawCompletion = value?.completion && typeof value.completion === "object" ? value.completion : null;
  const compactItem = (item: any) => typeof item === "string" ? item : JSON.stringify(item);
  return {
    state,
    message: String(value?.message || "").slice(0, 20_000),
    plan: Array.isArray(value?.plan) ? value.plan.map((item: any) => String(item).slice(0, 500)).slice(0, 12) : [],
    tool,
    intent: value?.intent && typeof value.intent === "object" ? value.intent : undefined,
    completion: rawCompletion ? {
      summary: String(rawCompletion.summary || ""),
      evidence: Array.isArray(rawCompletion.evidence) ? rawCompletion.evidence.map(compactItem).slice(0, 20) : [],
      risks: Array.isArray(rawCompletion.risks) ? rawCompletion.risks.map(compactItem).slice(0, 20) : [],
      next_action: String(rawCompletion.next_action || ""),
    } : undefined,
  };
}

function buildToolPrompt() {
  return buildGlobalAgentToolDefinitions(GLOBAL_AGENT_TOOL_SPECS)
    .map(spec => `- ${spec.name}${spec.required?.length ? `（必填：${spec.required.join("、")}）` : ""}：${spec.description}；schema=${JSON.stringify(spec.inputSchema)}；risk=${spec.risk}`)
    .join("\n");
}

async function buildMessages(run: GlobalAgentRun, runtime: GlobalAgentLoopRuntime) {
  const context = runtime.getContext ? await runtime.getContext(run) : {};
  captureReasoningFacts(run.reasoning_loop, "current_system_context", context);
  const priorSteps = run.steps.map(step => ({
    index: step.index,
    state: step.state,
    message: step.message,
    tool: step.tool ? { name: step.tool.name, arguments: step.tool.arguments, risk: step.tool.risk } : null,
    observation: step.observation,
    error: step.error,
  }));
  const system = `你是 CCM 全局 Agent 的决策内核。你不是关键词触发器，而是根据用户完整语义、真实系统上下文和工具观察结果决定下一步。

状态只能是 answer、investigate、plan、execute、needs_confirmation、complete。
- 普通聊天、知识问答、原理说明、可行性咨询：answer 或 complete，不调用写工具。
- 事实不足时先调用读取工具调查；不得猜测项目、群聊、任务 ID。
- 用户明确要求实际修改、实现、修复、运行、创建或派发时，才可选择写工具。
- 写工具是否获得授权由服务端最终判定；不要试图绕过确认。
- 每轮最多选择一个工具。观察结果返回后再决定下一步。
- 已经获得足够证据时必须 complete，禁止重复调用相同工具和空转。
- 最终回复区分：实际完成、已派发/仍在执行、验证证据、风险、需要用户确认的事项。
- 普通聊天、知识问答和原理说明如果没有调用工具，只给自然、直接的答案；不要附加“验证/证据”“风险”“下一步”等执行报告栏目，也不要向用户展示意图分类、置信度、授权依据、计划版本、断言、偏差或复盘。
- 只有实际执行、派发或调用工具后，最终回复才需要交付证据、风险和后续动作。
- state 为 answer 或 complete 时，message 必须直接写成给用户看的完整答案或完整执行回执，真正回答原问题；禁止只写“基于上下文回答”“准备总结”“已处理”等过程描述。
- state 为 investigate、plan、execute 或 needs_confirmation 时，message 才是简短进度说明。
- 每次都必须输出 intent：category、goal、action_required、target_refs、impact_scope、confidence、authorization_basis、reason。
- 必须核对“推理闭环”：原始目标、澄清链、当前事实快照、计划版本、验证断言和已知偏差。事实变化、工具失败或验收缺口出现后必须重规划，不能机械继续旧计划。
- 完成前必须逐项说明哪些目标断言已被证据证明；执行过写工具却没有可核验观察时不得声称完成。
- category 只能是 conversation、question、analysis、execution、high_risk、ambiguous；confidence 为 0~1。
- 目标没有在用户当前消息或读取工具结果中出现时，不得猜测；confidence 不足时使用 needs_confirmation 并提出一个具体澄清问题。

可用工具：
${buildToolPrompt()}

只输出一个合法 JSON 对象，不要输出 Markdown：
{"state":"investigate|plan|execute|needs_confirmation|answer|complete","message":"非终态写进度；终态写直接回答用户的完整内容","intent":{"category":"conversation|question|analysis|execution|high_risk|ambiguous","goal":"用户真实目标","action_required":false,"target_refs":[],"impact_scope":[],"confidence":0.95,"authorization_basis":"current_message|confirmation|none","reason":"判断依据"},"plan":["步骤"],"tool":{"name":"工具名","arguments":{}},"completion":{"summary":"结论","evidence":[],"risks":[],"next_action":""}}
不调用工具时 tool 必须为 null。`;
  const state = JSON.stringify({
    run: { id: run.id, status: run.status, phase: run.phase, explicit_write_authorization: run.explicit_write_authorization, max_steps: run.max_steps, remaining_steps: Math.max(0, run.max_steps - run.steps.length) },
    reasoning_loop: run.reasoning_loop,
    context,
    prior_steps: priorSteps,
  });
  return [
    { role: "system", content: system },
    ...run.history.slice(-10),
    { role: "user", content: `【用户当前目标】\n${run.user_message}\n\n【当前运行状态】\n${state}\n\n请决定下一步。` },
  ];
}

function emit(runtime: GlobalAgentLoopRuntime, event: any, run: GlobalAgentRun) {
  try { runtime.onEvent?.({ ...event, run_id: run.id, trace_id: run.trace_id, status: run.status, phase: run.phase }, run); } catch {}
}

function completeRun(run: GlobalAgentRun, runtime: GlobalAgentLoopRuntime, status: GlobalAgentRunStatus, reply: string, error = "") {
  if (status === "completed" && run.supervisor_id && run.supervision_state !== "completed") {
    run.status = "supervising";
    run.phase = "execute";
    run.supervision_state = run.supervision_state || "monitoring";
    run.final_reply = `全局任务已派发，持久监工正在跟踪执行与验收。\n\n任务 ID：${run.mission_id || "未知"}\n监工 ID：${run.supervisor_id}\n\n这只是已受理/监督中，不代表任务已经完成。只有文件变更、验证和合并门禁全部通过后才会发送最终交付报告。`;
    run.error = "";
    run.updated_at = nowIso(runtime);
    run.pending_tool = null;
    saveRun(run, runtime.persist !== false);
    recordGlobalAgentRuntimeOutput(run, { type: "supervising", status: run.status, mission_id: run.mission_id, supervisor_id: run.supervisor_id, reply: run.final_reply });
    appendTraceEvent(run.trace_id, { id: `${run.id}:supervising:${run.updated_at}`, type: "global_agent.supervising", status: "info", message: run.final_reply, data: { mission_id: run.mission_id, supervisor_id: run.supervisor_id } });
    emit(runtime, { type: "supervising", reply: run.final_reply, mission_id: run.mission_id, supervisor_id: run.supervisor_id }, run);
    return run;
  }
  run.status = status;
  run.phase = status === "completed" ? "complete" : run.phase;
  run.final_reply = String(reply || run.final_reply || (status === "completed" ? "已完成。" : "执行未完成。"));
  run.error = String(error || "");
  run.completed_at = nowIso(runtime);
  run.updated_at = run.completed_at;
  run.pending_tool = null;
  saveRun(run, runtime.persist !== false);
  recordGlobalAgentRuntimeOutput(run, { type: "run_terminal", status, reply: run.final_reply, error: run.error });
  appendTraceEvent(run.trace_id, { id: `${run.id}:${status}:${run.completed_at}`, type: `global_agent.run_${status}`, status: status === "completed" ? "ok" : status === "cancelled" ? "warning" : "error", message: run.final_reply.slice(0, 1000), data: { steps: run.steps.length, model_calls: run.model_calls, tool_calls: run.tool_calls, error: run.error } });
  emit(runtime, { type: status === "completed" ? "completed" : status, reply: run.final_reply, error: run.error }, run);
  return run;
}

async function continueLoop(run: GlobalAgentRun, runtime: GlobalAgentLoopRuntime): Promise<GlobalAgentRun> {
  if (activeRuns.has(run.id)) return run;
  activeRuns.add(run.id);
  try {
    run.status = "running";
    run.updated_at = nowIso(runtime);
    saveRun(run, runtime.persist !== false);
    initializeGlobalAgentRuntimeRun(run);
    recordGlobalAgentRuntimeOutput(run, { type: "run_started", status: run.status, phase: run.phase });
    emit(runtime, { type: "started" }, run);

    while (run.status === "running") {
      if (cancelRequests.delete(run.id)) return completeRun(run, runtime, "cancelled", "用户已取消本次运行。", "user_cancelled");
      if (pauseRequests.delete(run.id)) {
        run.status = "paused";
        run.updated_at = nowIso(runtime);
        saveRun(run, runtime.persist !== false);
        appendTraceEvent(run.trace_id, { id: `${run.id}:paused:${run.updated_at}`, type: "global_agent.paused", status: "warning", message: "全局 Agent 运行已暂停" });
        emit(runtime, { type: "paused", reply: "全局 Agent 运行已暂停。" }, run);
        return run;
      }
      const now = runtime.now ? runtime.now() : Date.now();
      if (now > Date.parse(run.deadline_at)) return completeRun(run, runtime, "failed", "全局 Agent 已达到执行时间上限，已安全停止。", "deadline_exceeded");
      if (run.steps.length >= run.max_steps) return completeRun(run, runtime, "failed", "全局 Agent 已达到最大步骤数，已停止以避免死循环。", "step_budget_exceeded");

      let decision: GlobalAgentDecision;
      const decisionStarted = now;
      try {
        const messages = await buildMessages(run, runtime);
        run.model_calls += 1;
        decision = parseGlobalAgentDecision(await runtime.callModel(messages, run));
      } catch (error: any) {
        const fallback = runtime.fallbackDecision ? await runtime.fallbackDecision(run, error) : null;
        if (!fallback) return completeRun(run, runtime, "failed", `全局 Agent 无法形成可靠决策：${error?.message || error}`, error?.message || String(error));
        decision = normalizeDecision(fallback);
      }

      run.phase = decision.state;
      const normalizedIntent = normalizeAgentDecisionIntent(decision.intent, run.user_message);
      decision.intent = normalizedIntent;
      updateReasoningPlan(run.reasoning_loop, decision.plan || [], normalizedIntent.reason || `decision:${decision.state}`);
      updateGlobalAgentTodoLedger(run, decision.plan || [], decision.tool?.name || "");
      explainReasoningDecision(run.reasoning_loop, decision.state, normalizedIntent.reason || decision.message || "模型形成下一步决策");
      const step: GlobalAgentRunStep = {
        index: run.steps.length + 1,
        at: nowIso(runtime),
        state: decision.state,
        message: String(decision.message || ""),
        plan: decision.plan || [],
        duration_ms: Math.max(0, (runtime.now ? runtime.now() : Date.now()) - decisionStarted),
        decision: { intent: normalizedIntent },
      };

      if (!decision.tool) {
        const quality = evaluateAgentDecision({ message: run.user_message, decision, risk: "read", explicitWriteAuthorization: run.explicit_write_authorization, priorSteps: run.steps, policyOverride: runtime.qualityPolicyOverride });
        run.decision_summary = quality;
        run.shadow_mode = quality.policy.shadowMode;
        step.decision = quality;
        run.steps.push(step);
        run.updated_at = nowIso(runtime);
        saveRun(run, runtime.persist !== false);
        recordAgentDecision({
          run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
          intent: quality.intent, proposed_tool: null, risk: "read", target_grounded: true,
          authorization_basis: quality.authorizationBasis,
          outcome: decision.state === "needs_confirmation" ? "clarification_required" : ["answer", "complete"].includes(decision.state) ? (run.tool_calls > 0 ? "completed_after_action" : "answered") : "non_terminal_without_action",
          reasons: [quality.intent.reason], status: decision.state === "needs_confirmation" ? "warning" : "ok",
        });
        emit(runtime, { type: "decision", step }, run);
        recordGlobalAgentRuntimeOutput(run, { type: "decision", state: decision.state, message: step.message, intent: quality.intent });
        if (decision.state === "needs_confirmation") {
          markGlobalAgentToolTodo(run, "", "blocked", decision.message || "等待用户澄清");
          setReasoningAssertion(run.reasoning_loop, { id: "clarification", label: "目标与影响范围已澄清", kind: "intent", status: "blocked", reason: decision.message });
          recordReasoningDeviation(run.reasoning_loop, "ambiguous_intent", decision.message || normalizedIntent.reason, "warning");
          run.status = "waiting_clarification";
          run.phase = "needs_confirmation";
          run.clarification_question = decision.message || "请补充要操作的目标、期望动作和允许的影响范围。";
          run.final_reply = run.clarification_question;
          run.updated_at = nowIso(runtime);
          saveRun(run, runtime.persist !== false);
          appendTraceEvent(run.trace_id, { id: `${run.id}:clarification:${step.index}`, type: "global_agent.clarification_required", status: "warning", message: run.final_reply, data: { intent: normalizedIntent } });
          emit(runtime, { type: "clarification_required", reply: run.final_reply, decision: quality }, run);
          return run;
        }
        if (["answer", "complete"].includes(decision.state)) {
          const completion = decision.completion || {};
          const executionIntent = ["execution", "high_risk"].includes(normalizedIntent.category) && normalizedIntent.action_required;
          const failedToolAssertions = run.reasoning_loop.assertions.filter(item => item.kind === "tool_outcome" && item.status === "failed");
          const passedToolAssertions = run.reasoning_loop.assertions.filter(item => item.kind === "tool_outcome" && item.status === "passed");
          if (executionIntent && run.explicit_write_authorization && run.tool_calls === 0) {
            const reason = "已识别明确执行意图，但尚未形成并执行可靠工具行动";
            recordReasoningDeviation(run.reasoning_loop, "missed_execution", reason, "error");
            recordReasoningPostmortem(run.reasoning_loop, { trigger: "missed_execution", whatHappened: reason, correction: "阻止终态并向用户索取可执行目标和验收范围", preventRepeat: "明确执行意图必须产生经过授权的工具行动或明确阻塞证据" });
            setReasoningAssertion(run.reasoning_loop, { id: "goal", label: "用户要求的执行目标已实际完成", kind: "goal", status: "blocked", reason });
            run.status = "waiting_clarification";
            run.phase = "needs_confirmation";
            run.clarification_question = "我识别到你要求实际执行，但当前还没有形成可核验的行动方案。请确认目标对象、允许修改的范围和验收结果；我不会把一段说明冒充已完成。";
            run.final_reply = run.clarification_question;
            run.updated_at = nowIso(runtime);
            saveRun(run, runtime.persist !== false);
            emit(runtime, { type: "clarification_required", reply: run.final_reply, decision: quality }, run);
            return run;
          }
          if (executionIntent && failedToolAssertions.length && !passedToolAssertions.length) {
            recordReasoningDeviation(run.reasoning_loop, "premature_completion", "模型试图结束，但执行结果仍失败；要求重新规划", "error");
            recordReasoningPostmortem(run.reasoning_loop, { trigger: "premature_completion", whatHappened: "模型在所有执行结果仍失败时尝试结束", correction: "拒绝完成并回到计划阶段", preventRepeat: "完成前检查工具断言和验收证据，失败断言未消解时不得结束" });
            if (run.steps.length < run.max_steps) continue;
            return completeRun(run, runtime, "failed", "执行结果仍未通过验证，不能报告完成。", "unverified_completion");
          }
          setReasoningAssertion(run.reasoning_loop, {
            id: "goal", label: "用户目标得到回答或可核验交付", kind: "goal", status: executionIntent ? (passedToolAssertions.length ? "passed" : "blocked") : "passed",
            evidence: [...(completion.evidence || []), ...passedToolAssertions.map(item => item.label)], reason: normalizedIntent.reason,
          });
          const includeDeliveryDetails = executionIntent || run.tool_calls > 0;
          const directReply = decision.message || completion.summary || "已完成。";
          const parts = [includeDeliveryDetails ? directReply : stripNonExecutionReportSections(directReply)];
          if (includeDeliveryDetails && completion.evidence?.length) parts.push(`验证/证据：\n- ${completion.evidence.join("\n- ")}`);
          if (includeDeliveryDetails && completion.risks?.length) parts.push(`风险：\n- ${completion.risks.join("\n- ")}`);
          if (includeDeliveryDetails && completion.next_action) parts.push(`下一步：${completion.next_action}`);
          markGlobalAgentToolTodo(run, "", "done", "全局 Agent 本轮回复完成");
          return completeRun(run, runtime, "completed", parts.filter(Boolean).join("\n\n"));
        }
        markGlobalAgentToolTodo(run, "", "blocked", "非终态决策缺少工具");
        return completeRun(run, runtime, "failed", "全局 Agent 给出了非终态决策但没有选择工具，已停止。", "non_terminal_without_tool");
      }

      let args: any;
      let risk: GlobalAgentToolRisk;
      let signature: string;
      try {
        args = validateTool(decision.tool.name, decision.tool.arguments || {});
        risk = classifyGlobalAgentToolRisk(decision.tool.name, args);
        signature = toolSignature(decision.tool.name, args);
      } catch (error: any) {
        step.error = error?.message || String(error);
        run.steps.push(step);
        run.consecutive_failures += 1;
        run.updated_at = nowIso(runtime);
        saveRun(run, runtime.persist !== false);
        emit(runtime, { type: "tool_validation_failed", step }, run);
        if (run.consecutive_failures >= 2) return completeRun(run, runtime, "failed", `工具参数连续校验失败：${step.error}`, step.error);
        continue;
      }

      step.tool = { name: decision.tool.name, arguments: args, risk, signature };
      const quality = evaluateAgentDecision({
        message: run.user_message,
        decision,
        toolName: decision.tool.name,
        args,
        risk,
        explicitWriteAuthorization: run.explicit_write_authorization,
        priorSteps: run.steps,
        policyOverride: runtime.qualityPolicyOverride,
      });
      run.decision_summary = quality;
      run.shadow_mode = quality.policy.shadowMode;
      step.decision = quality;
      if (quality.requiresClarification) {
        markGlobalAgentToolTodo(run, decision.tool.name, "blocked", quality.clarificationQuestion);
        setReasoningAssertion(run.reasoning_loop, { id: "clarification", label: "目标、授权与影响范围已澄清", kind: "intent", status: "blocked", reason: quality.clarificationReasons.join("；") });
        recordReasoningDeviation(run.reasoning_loop, "decision_quality_gap", quality.clarificationReasons.join("；"), "warning");
        run.steps.push(step);
        run.status = "waiting_clarification";
        run.phase = "needs_confirmation";
        run.clarification_question = quality.clarificationQuestion;
        run.final_reply = quality.clarificationQuestion;
        run.updated_at = nowIso(runtime);
        saveRun(run, runtime.persist !== false);
        recordAgentDecision({
          run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
          intent: quality.intent, proposed_tool: { name: decision.tool.name, arguments: args }, risk,
          target_grounded: quality.groundedTarget, authorization_basis: quality.authorizationBasis,
          outcome: "clarification_required", reasons: quality.clarificationReasons, status: "warning",
        });
        appendTraceEvent(run.trace_id, { id: `${run.id}:quality-block:${signature}`, type: "global_agent.decision_blocked", status: "warning", message: run.final_reply, data: { tool: decision.tool.name, risk, reasons: quality.clarificationReasons, intent: quality.intent } });
        emit(runtime, { type: "clarification_required", reply: run.final_reply, pending_tool: null, decision: quality }, run);
        return run;
      }
      if (quality.shadowed) {
        markGlobalAgentToolTodo(run, decision.tool.name, "done", `影子模式记录 ${decision.tool.name}`);
        recordGlobalAgentRuntimeOutput(run, { type: "tool_shadowed", tool: decision.tool.name, risk, arguments: args });
        step.observation = { success: true, shadowed: true, executed: false, proposed_tool: decision.tool.name, arguments: args };
        run.steps.push(step);
        run.tool_calls += 0;
        recordAgentDecision({
          run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
          intent: quality.intent, proposed_tool: { name: decision.tool.name, arguments: args }, risk,
          target_grounded: quality.groundedTarget, authorization_basis: quality.authorizationBasis,
          outcome: "shadowed", reasons: ["影子模式启用，未产生副作用"], status: "info",
        });
        appendTraceEvent(run.trace_id, { id: `${run.id}:shadow:${signature}`, type: "global_agent.tool_shadowed", status: "info", message: `影子模式记录 ${decision.tool.name}，未执行`, data: { tool: decision.tool.name, risk, arguments: args, intent: quality.intent } });
        recordAgentRuntimeLifecycle({
          scope: "global",
          traceId: run.trace_id,
          runId: run.id,
          action: decision.tool.name,
          phase: "shadow",
          risk,
          target: signature,
          status: "skipped",
          message: `影子模式记录 ${decision.tool.name}，未执行`,
          data: { arguments: args, intent: quality.intent },
        });
        return completeRun(run, runtime, "completed", `${decision.message || "已形成执行方案。"}\n\n当前处于影子模式：拟调用 ${decision.tool.name}，本次没有执行任何写操作。`);
      }
      const priorSame = run.steps.filter(item => item.tool?.signature === signature).length;
      if (priorSame >= 2) {
        step.error = "检测到重复工具调用，已阻止死循环";
        run.steps.push(step);
        markGlobalAgentToolTodo(run, decision.tool.name, "blocked", step.error);
        return completeRun(run, runtime, "failed", step.error, "duplicate_tool_loop");
      }

      const permission = evaluateGlobalAgentPermission({ run, tool: decision.tool.name, args, risk, signature });
      if (permission.denied) {
        step.error = `权限规则拒绝执行 ${decision.tool.name}${permission.rule?.reason ? `：${permission.rule.reason}` : ""}`;
        run.steps.push(step);
        markGlobalAgentToolTodo(run, decision.tool.name, "blocked", step.error);
        recordGlobalAgentRuntimeOutput(run, { type: "permission_denied", tool: decision.tool.name, risk, rule: permission.rule });
        return completeRun(run, runtime, "failed", step.error, "permission_denied");
      }
      const approved = run.approved_tool_signatures.includes(signature) || permission.allowed;
      if ((risk === "write" && !run.explicit_write_authorization && !approved) || (risk === "high" && !approved)) {
        run.steps.push(step);
        run.status = "waiting_confirmation";
        run.phase = "needs_confirmation";
        run.pending_tool = { name: decision.tool.name, arguments: args, risk, signature };
        const confirmationLabel = risk === "high" ? "高风险操作" : "尚未获得明确写入授权的操作";
        run.final_reply = `${decision.message || `准备调用 ${decision.tool.name}`}\n\n${confirmationLabel}尚未执行，需要你确认后才能继续。`;
        run.updated_at = nowIso(runtime);
        saveRun(run, runtime.persist !== false);
        recordAgentDecision({
          run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
          intent: quality.intent, proposed_tool: { name: decision.tool.name, arguments: args }, risk,
          target_grounded: quality.groundedTarget, authorization_basis: quality.authorizationBasis,
          outcome: "confirmation_required", reasons: [confirmationLabel], status: "warning",
        });
        appendTraceEvent(run.trace_id, { id: `${run.id}:confirmation:${signature}`, type: "global_agent.confirmation_required", status: "warning", message: run.final_reply, data: { tool: decision.tool.name, risk, arguments: args } });
        recordAgentRuntimeLifecycle({
          scope: "global",
          traceId: run.trace_id,
          runId: run.id,
          action: decision.tool.name,
          phase: "permission",
          risk,
          target: signature,
          status: "blocked",
          message: confirmationLabel,
          data: { arguments: args, authorization_basis: quality.authorizationBasis },
        });
        emit(runtime, { type: "confirmation_required", pending_tool: run.pending_tool, reply: run.final_reply }, run);
        recordGlobalAgentRuntimeOutput(run, { type: "confirmation_required", tool: decision.tool.name, risk, signature, permission });
        markGlobalAgentToolTodo(run, decision.tool.name, "blocked", run.final_reply);
        return run;
      }

      const preHooks = runGlobalAgentHooks("pre_tool_use", { run, tool: decision.tool.name, args, risk });
      if (preHooks.blocked) {
        step.error = `Hook 阻止执行 ${decision.tool.name}${preHooks.message ? `：${preHooks.message}` : ""}`;
        run.steps.push(step);
        markGlobalAgentToolTodo(run, decision.tool.name, "blocked", step.error);
        recordGlobalAgentRuntimeOutput(run, { type: "hook_blocked", phase: "pre_tool_use", tool: decision.tool.name, risk, hooks: preHooks.fired });
        appendTraceEvent(run.trace_id, { id: `${run.id}:hook_blocked:${signature}`, type: "global_agent.hook_blocked", status: "warning", message: step.error, data: { tool: decision.tool.name, risk, hooks: preHooks.fired } });
        return completeRun(run, runtime, "failed", step.error, "hook_blocked");
      }

      recordAgentRuntimeLifecycle({
        scope: "global",
        traceId: run.trace_id,
        runId: run.id,
        action: decision.tool.name,
        phase: "pre_tool_use",
        risk,
        target: signature,
        status: "running",
        message: step.message,
        data: { arguments: args, context: run.user_message },
      });
      markGlobalAgentToolTodo(run, decision.tool.name, "in_progress", step.message || `执行 ${decision.tool.name}`);
      recordGlobalAgentRuntimeOutput(run, { type: "tool_started", tool: decision.tool.name, risk, arguments: args });
      emit(runtime, { type: "tool_started", tool: step.tool, message: step.message }, run);
      const toolStarted = runtime.now ? runtime.now() : Date.now();
      try {
        const result = await runtime.executeTool(decision.tool.name, args, run);
        step.observation = compactObservation(result);
        captureReasoningFacts(run.reasoning_loop, `tool:${decision.tool.name}`, result);
        const toolSucceeded = result?.success !== false && !result?.error;
        setReasoningAssertion(run.reasoning_loop, {
          id: `tool_${signature}`,
          label: `工具 ${decision.tool.name} 产生可核验结果`,
          kind: "tool_outcome",
          status: toolSucceeded ? "passed" : "failed",
          evidence: [compactObservation(result)],
          reason: toolSucceeded ? "工具返回成功观察" : String(result?.error || "工具结果标记失败"),
        });
        if (toolSucceeded) {
          run.reasoning_loop.replan_required = false;
          run.reasoning_loop.last_replan_reason = "";
        }
        if (!toolSucceeded) recordReasoningDeviation(run.reasoning_loop, "tool_result_mismatch", `${decision.tool.name} 返回失败结果，需要重新规划`, "error");
        if (!toolSucceeded) recordReasoningPostmortem(run.reasoning_loop, { trigger: "tool_result_mismatch", whatHappened: `${decision.tool.name} 返回失败观察`, correction: "把失败观察写入事实快照并要求模型调整计划", preventRepeat: "后续计划必须引用当前事实，不能机械重复旧工具参数" });
        step.duration_ms = Math.max(0, (runtime.now ? runtime.now() : Date.now()) - toolStarted);
        run.tool_calls += 1;
        run.consecutive_failures = 0;
        if (result?.client_effect) run.client_effects.push(result.client_effect);
        recordAgentDecision({
          run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
          intent: quality.intent, proposed_tool: { name: decision.tool.name, arguments: args }, risk,
          target_grounded: quality.groundedTarget, authorization_basis: approved ? "confirmation" : quality.authorizationBasis,
          outcome: "executed", reasons: [quality.intent.reason], status: "ok",
        });
        appendTraceEvent(run.trace_id, { id: `${run.id}:tool:${step.index}:${signature}`, type: "global_agent.tool_completed", status: "ok", message: `${decision.tool.name} 执行完成`, data: { tool: decision.tool.name, risk, duration_ms: step.duration_ms } });
        recordAgentRuntimeLifecycle({
          scope: "global",
          traceId: run.trace_id,
          runId: run.id,
          action: decision.tool.name,
          phase: "post_tool_use",
          risk,
          target: signature,
          status: toolSucceeded ? "ok" : "error",
          message: `${decision.tool.name} 执行完成`,
          data: { duration_ms: step.duration_ms, observation: step.observation },
        });
        runGlobalAgentHooks("post_tool_use", { run, tool: decision.tool.name, args, risk, observation: step.observation });
        recordGlobalAgentRuntimeOutput(run, { type: "tool_completed", tool: decision.tool.name, risk, duration_ms: step.duration_ms, observation: step.observation });
        markGlobalAgentToolTodo(run, decision.tool.name, toolSucceeded ? "done" : "blocked", toolSucceeded ? `${decision.tool.name} 完成` : String(result?.error || `${decision.tool.name} 返回失败`));
        emit(runtime, { type: "tool_completed", tool: step.tool, observation: step.observation }, run);
      } catch (error: any) {
        step.error = error?.message || String(error);
        step.observation = { success: false, error: step.error };
        step.duration_ms = Math.max(0, (runtime.now ? runtime.now() : Date.now()) - toolStarted);
        run.tool_calls += 1;
        run.consecutive_failures += 1;
        setReasoningAssertion(run.reasoning_loop, { id: `tool_${signature}`, label: `工具 ${decision.tool.name} 产生可核验结果`, kind: "tool_outcome", status: "failed", reason: step.error });
        recordReasoningDeviation(run.reasoning_loop, "tool_execution_failed", `${decision.tool.name}: ${step.error}`, "error");
        recordReasoningPostmortem(run.reasoning_loop, { trigger: "tool_execution_failed", whatHappened: `${decision.tool.name}: ${step.error}`, correction: "保存失败断言并进入下一轮重规划或安全停止", preventRepeat: "优先核对当前状态、参数与执行器健康度后再重试" });
        recordAgentDecision({
          run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
          intent: quality.intent, proposed_tool: { name: decision.tool.name, arguments: args }, risk,
          target_grounded: quality.groundedTarget, authorization_basis: approved ? "confirmation" : quality.authorizationBasis,
          outcome: "execution_failed", reasons: [step.error], status: "error",
        });
        appendTraceEvent(run.trace_id, { id: `${run.id}:tool_failed:${step.index}:${signature}`, type: "global_agent.tool_failed", status: "error", message: step.error, data: { tool: decision.tool.name, risk, duration_ms: step.duration_ms } });
        recordAgentRuntimeLifecycle({
          scope: "global",
          traceId: run.trace_id,
          runId: run.id,
          action: decision.tool.name,
          phase: "post_tool_use",
          risk,
          target: signature,
          status: "error",
          message: step.error,
          data: { duration_ms: step.duration_ms, observation: step.observation },
        });
        runGlobalAgentHooks("post_tool_use", { run, tool: decision.tool.name, args, risk, observation: step.observation });
        recordGlobalAgentRuntimeOutput(run, { type: "tool_failed", tool: decision.tool.name, risk, duration_ms: step.duration_ms, error: step.error });
        markGlobalAgentToolTodo(run, decision.tool.name, "blocked", step.error);
        emit(runtime, { type: "tool_failed", tool: step.tool, error: step.error }, run);
      }
      run.steps.push(step);
      run.pending_tool = null;
      run.updated_at = nowIso(runtime);
      saveRun(run, runtime.persist !== false);
      if (run.consecutive_failures >= 2) return completeRun(run, runtime, "failed", `工具连续执行失败，已停止：${step.error}`, step.error || "tool_failures");
    }
    return run;
  } finally {
    activeRuns.delete(run.id);
  }
}

export async function startGlobalAgentRun(input: {
  message: string;
  history?: any[];
  sessionId?: string;
  source?: string;
  explicitWriteAuthorization?: boolean;
  traceId?: string;
  maxSteps?: number;
  timeoutMs?: number;
}, runtime: GlobalAgentLoopRuntime) {
  const createdAt = nowIso(runtime);
  const id = `gar_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
  const run = normalizeRun({
    id,
    trace_id: ensureTraceId(input.traceId, "global-agent"),
    session_id: input.sessionId || "default",
    source: input.source || "web",
    user_message: input.message,
    original_user_message: input.message,
    history: input.history || [],
    status: "running",
    phase: "plan",
    explicit_write_authorization: input.explicitWriteAuthorization === true,
    created_at: createdAt,
    updated_at: createdAt,
    started_at: createdAt,
    deadline_at: new Date((runtime.now ? runtime.now() : Date.now()) + Math.max(10_000, Math.min(30 * 60_000, Number(input.timeoutMs || 10 * 60_000)))).toISOString(),
    max_steps: input.maxSteps || 8,
    steps: [],
    pending_tool: null,
    approved_tool_signatures: [],
    final_reply: "",
    error: "",
    resume_count: 0,
    model_calls: 0,
    tool_calls: 0,
    consecutive_failures: 0,
    client_effects: [],
    reasoning_loop: createAgentReasoningState({
      goal: input.message,
      authorizationScope: input.explicitWriteAuthorization ? ["本次明确请求所涉及的目标与影响范围"] : [],
      assertions: [{ id: "goal", label: "用户目标得到回答或可核验交付", kind: "goal" }],
    }),
  });
  saveRun(run, runtime.persist !== false);
  appendTraceEvent(run.trace_id, { id: `${run.id}:created`, type: "global_agent.run_created", status: "info", message: input.message.slice(0, 1000), data: { session_id: run.session_id, source: run.source, explicit_write_authorization: run.explicit_write_authorization } });
  return continueLoop(run, runtime);
}

export async function resumeGlobalAgentRun(id: string, runtime: GlobalAgentLoopRuntime, options: { approved?: boolean; cancelled?: boolean } = {}) {
  if (activeRuns.has(id)) {
    const started = Date.now();
    while (activeRuns.has(id) && Date.now() - started < 2 * 60_000) await new Promise(resolve => setTimeout(resolve, 100));
    if (activeRuns.has(id)) throw new Error("全局 Agent 当前步骤尚未安全停下，请稍后重试");
  }
  const stored = getGlobalAgentRun(id);
  if (!stored) throw new Error("全局 Agent 运行不存在");
  const run = normalizeRun(stored);
  if (["supervising", "completed", "failed", "cancelled"].includes(run.status)) return run;
  if (run.status === "waiting_clarification") return run;
  if (options.cancelled || options.approved === false) return completeRun(run, runtime, "cancelled", "用户已取消本次操作。", "user_cancelled");
  if (run.status === "waiting_confirmation") {
    if (options.approved !== true) return run;
    if (!run.pending_tool?.signature) throw new Error("等待确认的工具信息不完整");
    const pending = run.pending_tool;
    run.approved_tool_signatures.push(pending.signature);
    run.status = "running";
    run.phase = "execute";
    run.resume_count += 1;
    run.updated_at = nowIso(runtime);
    saveRun(run, runtime.persist !== false);
    appendTraceEvent(run.trace_id, { id: `${run.id}:confirmed:${pending.signature}`, type: "global_agent.confirmed", status: "ok", message: "用户已确认待执行工具", data: { tool: pending.name } });
    const step = [...run.steps].reverse().find(item => item.tool?.signature === pending.signature && item.observation === undefined);
    const started = runtime.now ? runtime.now() : Date.now();
    try {
      const preHooks = runGlobalAgentHooks("pre_tool_use", { run, tool: pending.name, args: pending.arguments, risk: pending.risk });
      if (preHooks.blocked) throw new Error(`Hook 阻止执行 ${pending.name}${preHooks.message ? `：${preHooks.message}` : ""}`);
      markGlobalAgentToolTodo(run, pending.name, "in_progress", `确认后执行 ${pending.name}`);
      recordGlobalAgentRuntimeOutput(run, { type: "tool_started", tool: pending.name, risk: pending.risk, confirmed: true, arguments: pending.arguments });
      emit(runtime, { type: "tool_started", tool: pending, confirmed: true }, run);
      const result = await runtime.executeTool(pending.name, pending.arguments, run);
      captureReasoningFacts(run.reasoning_loop, `confirmed_tool:${pending.name}`, result);
      setReasoningAssertion(run.reasoning_loop, { id: `tool_${pending.signature}`, label: `确认后的工具 ${pending.name} 产生可核验结果`, kind: "tool_outcome", status: result?.success === false || result?.error ? "failed" : "passed", evidence: [result], reason: "用户确认后执行" });
      if (step) {
        step.observation = compactObservation(result);
        step.duration_ms = Math.max(0, (runtime.now ? runtime.now() : Date.now()) - started);
      }
      run.tool_calls += 1;
      run.consecutive_failures = 0;
      if (result?.client_effect) run.client_effects.push(result.client_effect);
      recordAgentDecision({
        run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
        intent: run.decision_summary?.intent || normalizeAgentDecisionIntent(null, run.user_message),
        proposed_tool: { name: pending.name, arguments: pending.arguments }, risk: pending.risk,
        target_grounded: run.decision_summary?.groundedTarget !== false, authorization_basis: "confirmation",
        outcome: "executed", reasons: ["用户确认后执行原待处理工具"], status: "ok",
      });
      appendTraceEvent(run.trace_id, { id: `${run.id}:tool_confirmed:${pending.signature}`, type: "global_agent.tool_completed", status: "ok", message: `${pending.name} 确认后执行完成`, data: { tool: pending.name, risk: pending.risk } });
      runGlobalAgentHooks("post_tool_use", { run, tool: pending.name, args: pending.arguments, risk: pending.risk, observation: result });
      recordGlobalAgentRuntimeOutput(run, { type: "tool_completed", tool: pending.name, risk: pending.risk, confirmed: true, observation: compactObservation(result) });
      markGlobalAgentToolTodo(run, pending.name, result?.success === false || result?.error ? "blocked" : "done", result?.error || `${pending.name} 确认后执行完成`);
      emit(runtime, { type: "tool_completed", tool: pending, observation: result, confirmed: true }, run);
    } catch (error: any) {
      if (step) {
        step.error = error?.message || String(error);
        step.observation = { success: false, error: step.error };
      }
      run.tool_calls += 1;
      run.consecutive_failures += 1;
      setReasoningAssertion(run.reasoning_loop, { id: `tool_${pending.signature}`, label: `确认后的工具 ${pending.name} 产生可核验结果`, kind: "tool_outcome", status: "failed", reason: error?.message || String(error) });
      recordReasoningDeviation(run.reasoning_loop, "confirmed_tool_failed", `${pending.name}: ${error?.message || error}`, "error");
      recordReasoningPostmortem(run.reasoning_loop, { trigger: "confirmed_tool_failed", whatHappened: `${pending.name} 在用户确认后执行失败`, correction: "保留失败证据并重新核对当前状态", preventRepeat: "确认只授权动作，不代表工具结果可跳过验证" });
      recordAgentDecision({
        run_id: run.id, trace_id: run.trace_id, session_id: run.session_id, source: run.source, message: run.user_message,
        intent: run.decision_summary?.intent || normalizeAgentDecisionIntent(null, run.user_message),
        proposed_tool: { name: pending.name, arguments: pending.arguments }, risk: pending.risk,
        target_grounded: run.decision_summary?.groundedTarget !== false, authorization_basis: "confirmation",
        outcome: "execution_failed", reasons: [step?.error || error?.message || String(error)], status: "error",
      });
      appendTraceEvent(run.trace_id, { id: `${run.id}:tool_confirmed_failed:${pending.signature}`, type: "global_agent.tool_failed", status: "error", message: error?.message || String(error), data: { tool: pending.name, risk: pending.risk } });
      runGlobalAgentHooks("post_tool_use", { run, tool: pending.name, args: pending.arguments, risk: pending.risk, observation: { success: false, error: error?.message || String(error) } });
      recordGlobalAgentRuntimeOutput(run, { type: "tool_failed", tool: pending.name, risk: pending.risk, confirmed: true, error: error?.message || String(error) });
      markGlobalAgentToolTodo(run, pending.name, "blocked", error?.message || String(error));
    }
    run.pending_tool = null;
    run.updated_at = nowIso(runtime);
    saveRun(run, runtime.persist !== false);
  } else {
    run.status = "running";
    run.resume_count += 1;
  }
  return continueLoop(run, runtime);
}

export async function continueGlobalAgentRunWithClarification(id: string, answer: string, runtime: GlobalAgentLoopRuntime, options: { explicitWriteAuthorization?: boolean } = {}) {
  if (activeRuns.has(id)) throw new Error("全局 Agent 当前仍在处理上一轮，请稍后再补充");
  const stored = getGlobalAgentRun(id);
  if (!stored) throw new Error("全局 Agent 运行不存在");
  const run = normalizeRun(stored);
  if (run.status !== "waiting_clarification") throw new Error("该运行当前不在等待澄清状态");
  const clarification = String(answer || "").trim();
  if (!clarification) throw new Error("澄清内容不能为空");
  const deniesAction = /(?:不要|不用|先别|暂时别|只分析|仅分析|不执行|不要执行)/.test(clarification);
  const inheritedAuthorization = run.explicit_write_authorization && !deniesAction;
  const currentAuthorization = options.explicitWriteAuthorization === true && !deniesAction;
  appendReasoningClarification(run.reasoning_loop, {
    question: run.clarification_question || run.final_reply || "请补充目标和影响范围",
    answer: clarification,
    authorizationScope: currentAuthorization ? ["本轮澄清消息明确允许的范围"] : inheritedAuthorization ? ["同一澄清链中的原始明确执行范围"] : [],
  });
  if (deniesAction) run.reasoning_loop.authorization_scope = [];
  setReasoningAssertion(run.reasoning_loop, { id: "clarification", label: "目标、授权与影响范围已澄清", kind: "intent", status: "passed", evidence: [clarification], reason: "用户已在同一待澄清运行中补充信息" });
  explainReasoningDecision(run.reasoning_loop, "continue_after_clarification", "合并原始目标与当前澄清，不新开无上下文运行");
  run.history.push({ role: "assistant", content: run.clarification_question || run.final_reply || "请补充信息" }, { role: "user", content: clarification });
  run.history = run.history.slice(-12);
  run.user_message = run.reasoning_loop.effective_goal;
  run.explicit_write_authorization = currentAuthorization || inheritedAuthorization;
  run.status = "running";
  run.phase = "plan";
  run.clarification_question = "";
  run.final_reply = "";
  run.resume_count += 1;
  run.consecutive_failures = 0;
  run.updated_at = nowIso(runtime);
  saveRun(run, runtime.persist !== false);
  appendTraceEvent(run.trace_id, { id: `${run.id}:clarified:${run.resume_count}`, type: "global_agent.clarification_received", status: "ok", message: clarification.slice(0, 1000), data: { plan_version: run.reasoning_loop.plan_version, authorization_inherited: inheritedAuthorization, authorization_current: currentAuthorization } });
  return continueLoop(run, runtime);
}

export function pauseGlobalAgentRun(id: string) {
  const stored = getGlobalAgentRun(id);
  if (!stored) throw new Error("全局 Agent 运行不存在");
  if (stored.status !== "running") return stored;
  pauseRequests.add(id);
  const run = normalizeRun(stored);
  run.status = "paused";
  run.updated_at = new Date().toISOString();
  saveRun(run, !volatileRuns.has(id));
  appendTraceEvent(run.trace_id, { id: `${run.id}:paused:${run.updated_at}`, type: "global_agent.paused", status: "warning", message: "全局 Agent 运行已暂停" });
  return run;
}

export function cancelGlobalAgentRun(id: string) {
  const stored = getGlobalAgentRun(id);
  if (!stored) throw new Error("全局 Agent 运行不存在");
  if (["completed", "failed", "cancelled"].includes(stored.status)) return stored;
  cancelRequests.add(id);
  if (activeRuns.has(id)) return stored;
  const run = normalizeRun(stored);
  run.status = "cancelled";
  run.final_reply = "用户已取消本次运行。";
  run.error = "user_cancelled";
  run.completed_at = new Date().toISOString();
  run.updated_at = run.completed_at;
  saveRun(run, !volatileRuns.has(id));
  appendTraceEvent(run.trace_id, { id: `${run.id}:cancelled:${run.updated_at}`, type: "global_agent.run_cancelled", status: "warning", message: run.final_reply });
  return run;
}

export async function recoverInterruptedGlobalAgentRuns(runtime: GlobalAgentLoopRuntime) {
  const candidates = listGlobalAgentRuns({ status: "running", limit: 20 });
  const results: any[] = [];
  for (const stored of candidates) {
    const run = normalizeRun(stored);
    if (Date.now() > Date.parse(run.deadline_at)) {
      recordReasoningRecoveryCheck(run.reasoning_loop, { reason: "服务重启恢复时已超过截止时间", goalRevalidated: true, stateRevalidated: false, acceptanceRevalidated: false, remainingGaps: ["执行时间预算已耗尽"] });
      results.push(completeRun(run, runtime, "failed", "服务重启后发现运行已超过时间预算，已安全终止。", "recovery_deadline_exceeded"));
      continue;
    }
    const currentContext = runtime.getContext ? await runtime.getContext(run) : {};
    captureReasoningFacts(run.reasoning_loop, "restart_recovery_context", currentContext);
    recordReasoningRecoveryCheck(run.reasoning_loop, { reason: "服务重启后恢复同一运行", goalRevalidated: !!run.reasoning_loop.original_goal, stateRevalidated: true, acceptanceRevalidated: run.reasoning_loop.assertions.length > 0, remainingGaps: run.reasoning_loop.assertions.filter(item => item.status !== "passed").map(item => item.label) });
    run.resume_count += 1;
    results.push(await continueLoop(run, runtime));
  }
  return { total: candidates.length, resumed: results.filter(item => item.status !== "failed").length, results };
}

export async function runGlobalAgentLoopSelfTest() {
  const calls: string[] = [];
  const decisions: GlobalAgentDecision[] = [
    { state: "investigate", message: "先检查系统", tool: { name: "inspect_system", arguments: {} } },
    { state: "execute", message: "建立任务", tool: { name: "orchestrate_development", arguments: { business_goal: "实现支付", targets: [{ type: "project", project: "demo" }] } } },
    { state: "complete", message: "任务已建立", tool: null, completion: { evidence: ["mission-1"] } },
  ];
  const runtime: GlobalAgentLoopRuntime = {
    persist: false,
    callModel: async () => decisions.shift()!,
    executeTool: async (name) => { calls.push(name); return name === "inspect_system" ? { projects: ["demo"] } : { mission_id: "mission-1" }; },
    getContext: () => ({ projects: ["demo"] }),
  };
  const multi = await startGlobalAgentRun({ message: "请给 demo 实现支付", explicitWriteAuthorization: true, maxSteps: 6 }, runtime);

  const supervisedDecisions: GlobalAgentDecision[] = [
    { state: "execute", message: "派发任务", intent: { category: "execution", goal: "给 demo 实现支付", action_required: true, target_refs: ["demo"], confidence: .96, authorization_basis: "current_message", reason: "用户明确要求异步实现" }, tool: { name: "orchestrate_development", arguments: { business_goal: "实现支付", targets: [{ type: "project", project: "demo" }] } } },
    { state: "complete", message: "任务已派发", intent: { category: "execution", goal: "给 demo 实现支付", action_required: true, target_refs: ["demo"], confidence: .96, authorization_basis: "current_message", reason: "派发工具已返回" }, tool: null },
  ];
  const supervised = await startGlobalAgentRun({ message: "异步给 demo 实现支付", explicitWriteAuthorization: true }, {
    persist: false,
    callModel: async () => supervisedDecisions.shift()!,
    executeTool: async (_name, _args, run) => {
      attachGlobalAgentRunSupervision(run, { mission_id: "mission-supervised", supervisor_id: "supervisor-1" });
      return { accepted: true, completed: false, mission_id: "mission-supervised", supervisor_id: "supervisor-1" };
    },
  });
  const supervisedCompleted = completeGlobalAgentSupervision(supervised.id, { summary: "最终交付", acceptance_gate_passed: true }, "completed");

  const consultation = await startGlobalAgentRun({ message: "知识库压缩是怎么实现的" }, {
    persist: false,
    callModel: async () => ({ state: "answer", message: "这是原理说明，不执行任务", tool: null }),
    executeTool: async () => { throw new Error("不应调用工具"); },
  });

  const waiting = await startGlobalAgentRun({ message: "支付功能怎么做" }, {
    persist: false,
    callModel: async () => ({ state: "execute", message: "需要修改代码", tool: { name: "send_project_cmd", arguments: { project: "demo", message: "实现支付" } } }),
    executeTool: async () => ({ success: true }),
  });
  const clarificationDecisions: GlobalAgentDecision[] = [
    { state: "execute", message: "按澄清后的目标执行", plan: ["确认 demo 当前状态", "实现支付", "验证结果"], intent: { category: "execution", goal: "给 demo 实现支付", action_required: true, target_refs: ["demo"], impact_scope: ["支付模块"], confidence: .96, authorization_basis: "current_message", reason: "用户已补充目标和范围" }, tool: { name: "send_project_cmd", arguments: { project: "demo", message: "实现支付并验证" } } },
    { state: "complete", message: "澄清后的任务已执行", intent: { category: "execution", goal: "给 demo 实现支付", action_required: true, target_refs: ["demo"], confidence: .96, authorization_basis: "current_message", reason: "工具已返回可核验结果" }, tool: null, completion: { evidence: ["demo:success"] } },
  ];
  const clarified = await continueGlobalAgentRunWithClarification(waiting.id, "请给 demo 实现支付，只改支付模块并完成验证", {
    persist: false,
    callModel: async () => clarificationDecisions.shift()!,
    executeTool: async () => ({ success: true, project: "demo", verification: "passed" }),
    getContext: () => ({ projects: ["demo"], current_head: "abc" }),
  }, { explicitWriteAuthorization: true });
  const analysisWaiting = await startGlobalAgentRun({ message: "帮我优化一下", explicitWriteAuthorization: true }, {
    persist: false,
    callModel: async () => ({ state: "needs_confirmation", message: "请说明目标和是否执行", intent: { category: "ambiguous", goal: "优化", action_required: true, confidence: .3, reason: "范围不清" }, tool: null }),
    executeTool: async () => { throw new Error("不应执行"); },
  });
  const analysisClarified = await continueGlobalAgentRunWithClarification(analysisWaiting.id, "只分析 demo 的性能方向，不执行、不修改代码", {
    persist: false,
    callModel: async () => ({ state: "answer", message: "只提供分析建议", intent: { category: "analysis", goal: "分析 demo 性能", action_required: false, target_refs: ["demo"], confidence: .96, authorization_basis: "none", reason: "用户明确禁止执行" }, tool: null }),
    executeTool: async () => { throw new Error("不应执行"); },
  }, { explicitWriteAuthorization: false });
  const replanDecisions: GlobalAgentDecision[] = [
    { state: "execute", message: "按初始方案执行", plan: ["直接修复", "验证"], intent: { category: "execution", goal: "修复 demo 登录", action_required: true, target_refs: ["demo"], confidence: .95, reason: "先尝试修复" }, tool: { name: "send_project_cmd", arguments: { project: "demo", message: "按旧入口修复登录" } } },
    { state: "execute", message: "观察变化后重规划", plan: ["重新读取当前入口", "按新入口修复", "验证"], intent: { category: "execution", goal: "修复 demo 登录", action_required: true, target_refs: ["demo"], confidence: .96, reason: "旧入口不存在，依据工具观察调整方案" }, tool: { name: "send_project_cmd", arguments: { project: "demo", message: "读取当前入口后修复登录并验证" } } },
    { state: "complete", message: "已按当前入口修复并验证", intent: { category: "execution", goal: "修复 demo 登录", action_required: true, target_refs: ["demo"], confidence: .97, reason: "重规划后的工具返回成功证据" }, tool: null, completion: { evidence: ["verification:passed"] } },
  ];
  let replanAttempt = 0;
  const replanned = await startGlobalAgentRun({ message: "请修复 demo 登录并验证", explicitWriteAuthorization: true }, {
    persist: false,
    callModel: async () => replanDecisions.shift()!,
    executeTool: async () => (++replanAttempt === 1 ? { success: false, error: "旧登录入口已不存在" } : { success: true, verification: "passed" }),
    getContext: () => ({ project: "demo", current_head: "new-head" }),
  });

  const destructiveDecisions: GlobalAgentDecision[] = [
    { state: "execute", message: "删除前确认", tool: { name: "manage_task", arguments: { operation: "delete", id: "t1" } } },
    { state: "complete", message: "确认后的删除已执行", tool: null, completion: { evidence: ["deleted:t1"] } },
  ];
  let destructiveExecutions = 0;
  const destructiveRuntime: GlobalAgentLoopRuntime = {
    persist: false,
    callModel: async () => destructiveDecisions.shift()!,
    executeTool: async () => { destructiveExecutions += 1; return { success: true, deleted: "t1" }; },
  };
  const destructive = await startGlobalAgentRun({ message: "删除任务 t1" , explicitWriteAuthorization: true }, destructiveRuntime);
  const confirmed = await resumeGlobalAgentRun(destructive.id, destructiveRuntime, { approved: true });

  const invalidDecisions: GlobalAgentDecision[] = [
    { state: "execute", message: "错误工具", tool: { name: "not_registered", arguments: {} } },
    { state: "execute", message: "仍然错误", tool: { name: "not_registered", arguments: {} } },
  ];
  const invalid = await startGlobalAgentRun({ message: "测试错误收敛" }, {
    persist: false,
    callModel: async () => invalidDecisions.shift()!,
    executeTool: async () => ({ success: true }),
  });

  const duplicateDecisions: GlobalAgentDecision[] = [
    { state: "investigate", message: "查一次", tool: { name: "inspect_system", arguments: {} } },
    { state: "investigate", message: "查两次", tool: { name: "inspect_system", arguments: {} } },
    { state: "investigate", message: "查三次", tool: { name: "inspect_system", arguments: {} } },
  ];
  const duplicate = await startGlobalAgentRun({ message: "测试循环保护" }, {
    persist: false,
    callModel: async () => duplicateDecisions.shift()!,
    executeTool: async () => ({ success: true }),
  });

  let pausedRunId = "";
  let releaseFirstDecision: ((value: GlobalAgentDecision) => void) | null = null;
  const pauseDecisions: GlobalAgentDecision[] = [{ state: "complete", message: "恢复后完成", tool: null }];
  const pauseRuntime: GlobalAgentLoopRuntime = {
    persist: false,
    onEvent: event => { if (event.type === "started") pausedRunId = event.run_id; },
    callModel: async () => {
      if (!releaseFirstDecision) return new Promise<GlobalAgentDecision>(resolve => { releaseFirstDecision = resolve; });
      return pauseDecisions.shift()!;
    },
    executeTool: async () => ({ success: true }),
  };
  const pausingPromise = startGlobalAgentRun({ message: "测试暂停恢复" }, pauseRuntime);
  while (!pausedRunId || !releaseFirstDecision) await new Promise(resolve => setTimeout(resolve, 0));
  pauseGlobalAgentRun(pausedRunId);
  releaseFirstDecision({ state: "investigate", message: "暂停前读取", tool: { name: "inspect_system", arguments: {} } });
  const paused = await pausingPromise;
  const resumed = await resumeGlobalAgentRun(paused.id, pauseRuntime);

  const parsedFence = parseGlobalAgentDecision("```json\n{\"state\":\"answer\",\"message\":\"ok\",\"tool\":null}\n```");
  let shadowExecutions = 0;
  const shadow = await startGlobalAgentRun({ message: "请给 demo 修复登录问题", explicitWriteAuthorization: true }, {
    persist: false,
    qualityPolicyOverride: { shadowMode: true },
    callModel: async () => ({
      state: "execute",
      message: "准备修复",
      intent: { category: "execution", goal: "修复 demo 登录", action_required: true, target_refs: ["demo"], confidence: .96, authorization_basis: "current_message", reason: "用户明确要求修复" },
      tool: { name: "send_project_cmd", arguments: { project: "demo", message: "修复登录" } },
    }),
    executeTool: async () => { shadowExecutions += 1; return { success: true }; },
  });

  const checks = {
    multiStepCompletes: multi.status === "completed",
    dispatchIsNotDeliveryCompletion: supervised.status === "supervising" && supervised.final_reply.includes("不代表任务已经完成"),
    finalGateCompletesOriginalRun: supervisedCompleted?.status === "completed" && supervisedCompleted?.supervision_state === "completed",
    modelObservesAndContinues: calls.join(",") === "inspect_system,orchestrate_development",
    consultationDoesNotDispatch: consultation.tool_calls === 0,
    ambiguousConsultationNeedsClarification: waiting.status === "waiting_clarification" && waiting.tool_calls === 0,
    clarificationContinuesSameRun: clarified.id === waiting.id && clarified.status === "completed" && clarified.reasoning_loop.clarification_chain.length === 1,
    clarificationPreservesOriginalGoal: clarified.reasoning_loop.original_goal === "支付功能怎么做" && clarified.reasoning_loop.effective_goal.includes("demo"),
    reasoningPlanAndFactsAreAudited: clarified.reasoning_loop.plan_version >= 1 && clarified.reasoning_loop.fact_snapshots.length >= 1 && clarified.reasoning_loop.assertions.some(item => item.kind === "tool_outcome" && item.status === "passed"),
    clarificationCanRevokeAuthorization: analysisClarified.id === analysisWaiting.id && analysisClarified.status === "completed" && analysisClarified.explicit_write_authorization === false && analysisClarified.reasoning_loop.authorization_scope.length === 0 && analysisClarified.tool_calls === 0,
    toolFailureTriggersAuditedReplan: replanned.status === "completed" && replanned.reasoning_loop.plan_version === 2 && replanned.reasoning_loop.deviations.some(item => item.type === "tool_result_mismatch") && replanned.reasoning_loop.assertions.some(item => item.kind === "tool_outcome" && item.status === "failed") && replanned.reasoning_loop.assertions.some(item => item.kind === "tool_outcome" && item.status === "passed"),
    destructiveAlwaysNeedsConfirmation: destructive.status === "waiting_confirmation",
    confirmationExecutesExactPendingToolOnce: confirmed.status === "completed" && destructiveExecutions === 1,
    invalidToolsConvergeToFailure: invalid.status === "failed" && invalid.error.includes("未注册工具"),
    duplicateLoopIsStopped: duplicate.status === "failed" && duplicate.error === "duplicate_tool_loop",
    pauseAndResumeWorks: paused.status === "paused" && resumed.status === "completed",
    fencedJsonParses: parsedFence.state === "answer",
    shadowModeHasNoSideEffect: shadow.status === "completed" && shadow.shadow_mode === true && shadow.tool_calls === 0 && shadowExecutions === 0,
  };

  return {
    pass: Object.values(checks).every(Boolean),
    ...checks,
  };
}
