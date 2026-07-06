import * as crypto from "crypto";
import { buildContextBudget } from "./context-budget";
import { appendTraceEvent, getTrace, listTraces } from "./reliability-ledger";

export type AgentRuntimeScope = "global" | "group" | "worker";
export type AgentRuntimeRisk = "read" | "write" | "high" | "agent";
export type AgentRuntimeDecision = "allow" | "ask" | "deny";

export interface AgentRuntimeLifecycleInput {
  scope: AgentRuntimeScope;
  traceId?: string;
  taskId?: string;
  groupId?: string;
  runId?: string;
  agent?: string;
  action: string;
  phase?: string;
  risk?: AgentRuntimeRisk;
  target?: string;
  status?: "planned" | "running" | "ok" | "blocked" | "error" | "skipped";
  message?: string;
  data?: any;
}

export interface AgentRuntimeLifecycleRecord {
  id: string;
  type: "agent_runtime.lifecycle";
  scope: AgentRuntimeScope;
  action: string;
  phase: string;
  risk: AgentRuntimeRisk;
  target: string;
  status: string;
  permission: ReturnType<typeof evaluateAgentRuntimePermission>;
  context_budget: ReturnType<typeof buildContextBudget>;
  artifact_budget: {
    chars: number;
    max_chars: number;
    truncated: boolean;
    artifact_hash: string;
  };
  data: any;
}

export interface AgentPermissionRule {
  id: string;
  scope: AgentRuntimeScope | "all";
  action: string;
  target?: string;
  risk?: AgentRuntimeRisk | "all";
  decision: AgentRuntimeDecision;
  reason: string;
}

const DEFAULT_PERMISSION_RULES: AgentPermissionRule[] = [
  { id: "read-auto", scope: "all", action: "*", risk: "read", decision: "allow", reason: "只读动作默认允许" },
  { id: "worker-dispatch-ask", scope: "group", action: "dispatch_worker", risk: "agent", decision: "ask", reason: "子 Agent 派发需要当前用户消息授权或任务上下文" },
  { id: "high-risk-ask", scope: "all", action: "*", risk: "high", decision: "ask", reason: "高风险动作必须确认" },
];

function compact(value: any, max = 1200) {
  const text = typeof value === "string" ? value : JSON.stringify(value || "");
  return text.length <= max ? text : `${text.slice(0, Math.ceil(max * 0.65))}\n...[truncated ${text.length - max} chars]...\n${text.slice(-Math.floor(max * 0.25))}`;
}

function hash(value: any, len = 12) {
  return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value || {})).digest("hex").slice(0, len);
}

function matchesRule(rule: AgentPermissionRule, input: AgentRuntimeLifecycleInput) {
  const scope = input.scope || "global";
  const action = String(input.action || "");
  const risk = input.risk || "read";
  const target = String(input.target || "");
  const actionMatch = rule.action === "*" || rule.action === action;
  const scopeMatch = rule.scope === "all" || rule.scope === scope;
  const riskMatch = !rule.risk || rule.risk === "all" || rule.risk === risk;
  const targetMatch = !rule.target || target.includes(rule.target);
  return actionMatch && scopeMatch && riskMatch && targetMatch;
}

export function evaluateAgentRuntimePermission(input: AgentRuntimeLifecycleInput, rules: AgentPermissionRule[] = DEFAULT_PERMISSION_RULES) {
  const matched = [...rules].reverse().find(rule => matchesRule(rule, input));
  const risk = input.risk || "read";
  const fallback: AgentPermissionRule = risk === "read"
    ? DEFAULT_PERMISSION_RULES[0]
    : risk === "high"
      ? DEFAULT_PERMISSION_RULES[2]
      : { id: "default-ask", scope: "all", action: "*", risk: "all", decision: "ask", reason: "写入、派发或不确定动作默认进入可审计确认" };
  const rule = matched || fallback;
  return {
    decision: rule.decision,
    allowed: rule.decision === "allow",
    needs_confirmation: rule.decision === "ask",
    denied: rule.decision === "deny",
    rule_id: rule.id,
    reason: rule.reason,
  };
}

export function buildArtifactBudget(value: any, maxChars = 12_000) {
  const text = typeof value === "string" ? value : JSON.stringify(value || {});
  const truncated = text.length > maxChars;
  return {
    chars: text.length,
    max_chars: maxChars,
    truncated,
    artifact_hash: truncated ? hash(text, 16) : "",
    preview: truncated ? compact(text, maxChars) : text,
  };
}

export function recordAgentRuntimeLifecycle(input: AgentRuntimeLifecycleInput) {
  const permission = evaluateAgentRuntimePermission(input);
  const context_budget = buildContextBudget({ context: input.data?.context || input.data?.prompt || input.message || "" });
  const artifact_budget = buildArtifactBudget(input.data?.observation || input.data?.result || input.data || {});
  const record: AgentRuntimeLifecycleRecord = {
    id: `arl_${Date.now().toString(36)}_${hash(input, 8)}`,
    type: "agent_runtime.lifecycle",
    scope: input.scope,
    action: String(input.action || "unknown"),
    phase: String(input.phase || "execute"),
    risk: input.risk || "read",
    target: String(input.target || ""),
    status: input.status || "planned",
    permission,
    context_budget,
    artifact_budget: {
      chars: artifact_budget.chars,
      max_chars: artifact_budget.max_chars,
      truncated: artifact_budget.truncated,
      artifact_hash: artifact_budget.artifact_hash,
    },
    data: input.data || {},
  };
  if (input.traceId) {
    appendTraceEvent(input.traceId, {
      id: record.id,
      type: record.type,
      status: record.status === "ok" ? "ok" : record.status === "error" ? "error" : record.status === "blocked" ? "warning" : "info",
      task_id: input.taskId || "",
      group_id: input.groupId || "",
      agent: input.agent || "",
      message: input.message || `${record.scope}:${record.action}:${record.phase}`,
      data: record,
    });
  }
  return record;
}

export function buildWorkerContextPacket(input: {
  group?: any;
  project: string;
  task: string;
  analysis?: any;
  traceId?: string;
  taskId?: string;
  dependencies?: any[];
  contractInjections?: any[];
  memory?: any;
  verification?: any;
}) {
  const groupMembers = Array.isArray(input.group?.members) ? input.group.members.map((m: any) => m.project).filter(Boolean) : [];
  const contractInjections = Array.isArray(input.contractInjections) ? input.contractInjections : [];
  const packet = {
    packet_id: `wcp_${hash([input.project, input.task, input.traceId, contractInjections], 14)}`,
    version: 1,
    project: input.project,
    task_id: input.taskId || "",
    trace_id: input.traceId || "",
    group: { id: input.group?.id || "", name: input.group?.name || "", members: groupMembers },
    goal: input.analysis?.summary || input.task,
    task: input.task,
    constraints: Array.isArray(input.analysis?.constraints) ? input.analysis.constraints : [],
    document_findings: Array.isArray(input.analysis?.documentFindings) ? input.analysis.documentFindings : [],
    dependencies: Array.isArray(input.dependencies) ? input.dependencies : [],
    contract_injections: contractInjections.map((item: any) => ({
      injection_id: item.injection_id || item.injectionId || `ci_${hash(item, 12)}`,
      source_agent: item.source_agent || item.source || "",
      target_agent: item.target_agent || item.target || input.project,
      endpoint: item.endpoint || item.type || "",
      summary: item.summary || item.change || "",
      required_receipt_reference: true,
    })),
    memory: input.memory || null,
    verification: input.verification || null,
    acceptance: {
      ack_required_before_implementation: true,
      receipt_required: true,
      actual_diff_required: true,
      verification_required: true,
      contract_injection_receipt_required: contractInjections.length > 0,
    },
  };
  return {
    ...packet,
    context_budget: buildContextBudget({ context: packet, maxChars: 36_000, maxTokens: 90_000 }),
  };
}

export function renderWorkerContextPacket(packet: any) {
  const contractLines = Array.isArray(packet?.contract_injections) && packet.contract_injections.length
    ? [
      "contract injection：",
      ...packet.contract_injections.map((item: any) => `- injection_id=${item.injection_id}；endpoint/type=${item.endpoint || "contract"}；source=${item.source_agent || "unknown"}；${item.summary || ""}`),
      "- 回执必须引用 injection_id，并说明是否已适配、已验证或无需适配的证据。",
    ]
    : [];
  return [
    `WorkerContextPacket: ${packet?.packet_id || ""}`,
    `trace_id: ${packet?.trace_id || ""}`,
    `task_id: ${packet?.task_id || ""}`,
    `project: ${packet?.project || ""}`,
    `goal: ${packet?.goal || ""}`,
    "",
    "任务：",
    packet?.task || "",
    "",
    Array.isArray(packet?.document_findings) && packet.document_findings.length ? `文档/验收依据：\n- ${packet.document_findings.slice(0, 8).join("\n- ")}` : "",
    Array.isArray(packet?.constraints) && packet.constraints.length ? `用户约束：\n- ${packet.constraints.join("\n- ")}` : "",
    contractLines.join("\n"),
    "",
    "ACK gate：实现前先给接单 ACK，必须包含 understoodGoal、plannedScope、forbiddenScope、verificationPlan、unclear；ACK 不合格时只重写 ACK，不得继续实现。",
  ].filter(Boolean).join("\n");
}

export function buildContractInjectionEvent(input: { traceId?: string; taskId?: string; sourceAgent?: string; targetAgent: string; contract: any; packetId?: string }) {
  const injectionId = input.contract?.injection_id || input.contract?.injectionId || `ci_${hash([input.taskId, input.sourceAgent, input.targetAgent, input.contract], 16)}`;
  const event = {
    injection_id: injectionId,
    source_agent: input.sourceAgent || "",
    target_agent: input.targetAgent,
    endpoint: input.contract?.endpoint || input.contract?.type || "",
    summary: input.contract?.summary || input.contract?.change || "",
    packet_id: input.packetId || "",
    receipt_reference_required: true,
  };
  if (input.traceId) {
    appendTraceEvent(input.traceId, {
      id: `contract_injection:${injectionId}`,
      type: "agent_runtime.contract_injection",
      status: "info",
      task_id: input.taskId || "",
      agent: input.targetAgent,
      message: `contractChanges 注入 ${input.targetAgent}`,
      data: event,
    });
  }
  return event;
}

export function replayAgentTrace(traceId: string) {
  const trace = getTrace(traceId);
  const events = Array.isArray(trace?.events) ? trace.events : [];
  const lifecycle = events.filter((event: any) => event.type === "agent_runtime.lifecycle");
  const blocked = events.filter((event: any) => /blocked|confirmation|required|failed|error/i.test(`${event.type} ${event.status}`));
  const tools = events.filter((event: any) => /tool|dispatch|agent_runtime\.lifecycle/.test(String(event.type || "")));
  const contractInjections = events.filter((event: any) => event.type === "agent_runtime.contract_injection");
  const ackSignals = events.filter((event: any) => /ack/i.test(`${event.type} ${event.message} ${JSON.stringify(event.data || {})}`));
  return {
    success: !!trace,
    trace_id: traceId,
    event_count: events.length,
    lifecycle_count: lifecycle.length,
    tool_or_dispatch_count: tools.length,
    blocked_count: blocked.length,
    contract_injection_count: contractInjections.length,
    ack_signal_count: ackSignals.length,
    verdict: !trace ? "missing_trace" : blocked.length ? "needs_review" : "pass",
    latest_events: events.slice(-20),
  };
}

export function buildTraceReplaySuite(limit = 20) {
  const traces = listTraces(limit);
  const replays = traces.map((trace: any) => replayAgentTrace(trace.trace_id));
  const pass = replays.every((item: any) => item.verdict === "pass");
  return {
    pass,
    total: replays.length,
    needs_review: replays.filter((item: any) => item.verdict === "needs_review").length,
    replays,
  };
}

export function runAgentRuntimeKernelSelfTest() {
  const read = recordAgentRuntimeLifecycle({ scope: "global", action: "inspect_system", risk: "read", status: "ok", data: { result: { ok: true } } });
  const high = recordAgentRuntimeLifecycle({ scope: "global", action: "delete_task", risk: "high", status: "blocked" });
  const packet = buildWorkerContextPacket({
    project: "frontend",
    task: "适配接口字段",
    analysis: { summary: "前后端契约变更", documentFindings: ["POST /api/demo 新增 name"], constraints: ["不改后端"] },
    contractInjections: [{ source_agent: "backend", target_agent: "frontend", endpoint: "POST /api/demo", summary: "新增 name 字段" }],
  });
  const rendered = renderWorkerContextPacket(packet);
  const replay = buildTraceReplaySuite(3);
  const checks = {
    readAllowed: read.permission.allowed === true,
    highRiskAsks: high.permission.needs_confirmation === true,
    contextBudgetComputed: packet.context_budget.estimated_tokens > 0,
    workerPacketHasAckGate: rendered.includes("ACK gate"),
    contractInjectionHasId: packet.contract_injections[0]?.injection_id,
    replaySuiteShape: Array.isArray(replay.replays),
  };
  return { pass: Object.values(checks).every(Boolean), checks, read, high, packet, replay };
}
