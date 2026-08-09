import * as path from "path";
import { getTaskById } from "../core/db";
import {
  createAgentCommunicationEnvelope,
  getAgentCommunication,
  heartbeatAgentCommunication,
  listAgentCommunications,
  recordAgentCommunicationReceipt,
} from "../system/agent-communication-v2";
import { submitGroupCoordinationRequest } from "../modules/collaboration/group-coordination-store";
import {
  buildInternalMcpServerConfig,
  InternalMcpTaskContext,
  runInternalMcpServer,
} from "./internal-mcp-runtime";

export const AGENT_COMMUNICATION_MCP_SERVER_NAME = "ccm__agent_communication";
export const AGENT_COMMUNICATION_ACK_MCP_TOOL_ALIASES = [
  "mcp__ccm__agent_communication__acknowledge_assignment",
];
const terminal = new Set(["completed", "done", "failed", "cancelled", "archived"]);

function exactSessionId(context: InternalMcpTaskContext) {
  return String(context.groupSessionId || context.projectSessionId || context.taskId || "");
}

function senderAgentId(context: InternalMcpTaskContext) {
  return String(context.project || context.role || "third-party-agent");
}

function validate(context: InternalMcpTaskContext) {
  if (!context.taskId || !context.project || !exactSessionId(context)) throw new Error("Agent Communication MCP缺少精确任务、项目或会话绑定");
  const task = getTaskById(context.taskId);
  if (!task) throw new Error("Agent Communication MCP绑定的任务不存在");
  if (terminal.has(String(task.status || "").toLowerCase())) throw new Error(`任务已结束，不能继续通信：${task.status}`);
  if (context.groupId && String(task.group_id || task.groupId || "") !== context.groupId) throw new Error("Agent Communication MCP群聊绑定不一致");
  if (context.groupSessionId && String(task.group_session_id || task.groupSessionId || "") !== context.groupSessionId) throw new Error("Agent Communication MCP精确群聊会话已失效");
  if (String(task.target_project || task.targetProject || context.project) !== context.project && context.role === "project-child-agent") throw new Error("Agent Communication MCP项目绑定不一致");
  return task;
}

export function buildAgentCommunicationMcpServerConfig(context: Omit<InternalMcpTaskContext, "schema" | "issuedAt" | "expiresAt">) {
  if (!context.taskId || !context.project || !context.workDir) throw new Error("Agent Communication MCP缺少正式任务绑定");
  return buildInternalMcpServerConfig(path.join(__dirname, "agent-communication-mcp.js"), context);
}

const tools = [
  { name: "acknowledge_assignment", description: "确认已收到并理解CCM工作单；正式执行前调用。", inputSchema: { type: "object", required: ["message_id", "understood_goal"], properties: {
    message_id: { type: "string" }, understood_goal: { type: "string" }, planned_scope: { type: "array", items: { type: "string" } }, forbidden_scope: { type: "array", items: { type: "string" } }, verification_plan: { type: "array", items: { type: "string" } }, unclear: { type: "array", items: { type: "string" } },
  }, additionalProperties: false } },
  { name: "report_progress", description: "报告当前阶段、进度、阻塞和副作用状态。", inputSchema: { type: "object", required: ["message_id", "phase"], properties: {
    message_id: { type: "string" }, phase: { type: "string" }, progress: { type: "number" }, summary: { type: "string" }, blockers: { type: "array", items: { type: "string" } }, side_effect_state: { type: "string", enum: ["none", "known", "uncertain"] },
  }, additionalProperties: false } },
  { name: "heartbeat", description: "续租当前CCM执行并记录系统心跳。", inputSchema: { type: "object", required: ["message_id"], properties: {
    message_id: { type: "string" }, phase: { type: "string" }, progress: { type: "number" }, side_effect_state: { type: "string", enum: ["none", "known", "uncertain"] },
  }, additionalProperties: false } },
  { name: "request_coordination", description: "向CCM提交信息、实现、评审或风险协作请求；不能直接命令其他Agent。", inputSchema: { type: "object", required: ["kind", "summary"], properties: {
    message_id: { type: "string" }, kind: { type: "string", enum: ["information", "implementation", "review", "risk"] }, summary: { type: "string" }, question: { type: "string" }, reason: { type: "string" }, blocking: { type: "boolean" }, required_capabilities: { type: "array", items: { type: "string" } }, target_hint: { type: "string" }, evidence: { type: "array", items: { type: "string" } }, acceptance_criteria: { type: "array", items: { type: "string" } }, requested_write_paths: { type: "array", items: { type: "string" } }, idempotency_key: { type: "string" },
  }, additionalProperties: false } },
  { name: "request_review", description: "请求CCM选择另一个Agent进行只读评审。", inputSchema: { type: "object", required: ["summary"], properties: {
    message_id: { type: "string" }, summary: { type: "string" }, question: { type: "string" }, reason: { type: "string" }, evidence: { type: "array", items: { type: "string" } }, acceptance_criteria: { type: "array", items: { type: "string" } }, required_capabilities: { type: "array", items: { type: "string" } }, idempotency_key: { type: "string" },
  }, additionalProperties: false } },
  { name: "report_blocker", description: "向CCM报告权限、环境、风险或用户决策阻塞。", inputSchema: { type: "object", required: ["summary"], properties: {
    message_id: { type: "string" }, summary: { type: "string" }, reason: { type: "string" }, evidence: { type: "array", items: { type: "string" } }, needs_user: { type: "boolean" }, idempotency_key: { type: "string" },
  }, additionalProperties: false } },
  { name: "get_assignment_status", description: "查询当前精确任务会话中的CCM通信状态。", inputSchema: { type: "object", properties: { message_id: { type: "string" } }, additionalProperties: false } },
  { name: "submit_result", description: "提交结构化任务结果；这只是Agent声明，最终终态由CCM验收后生成。", inputSchema: { type: "object", required: ["message_id", "status", "summary"], properties: {
    message_id: { type: "string" }, status: { type: "string", enum: ["done", "partial", "blocked", "failed", "needs_info"] }, summary: { type: "string" }, actions: { type: "array", items: { type: "string" } }, files_changed: { type: "array", items: { type: "string" } }, verification_results: { type: "array", items: { type: "object" } }, blockers: { type: "array", items: { type: "string" } }, needs: { type: "array", items: { type: "string" } }, source_refs: { type: "array", items: { type: "object" } }, artifact_refs: { type: "array", items: { type: "object" } }, side_effect_state: { type: "string", enum: ["none", "known", "uncertain"] },
  }, additionalProperties: false } },
];

function result(value: any, isError = false) { return { content: [{ type: "text", text: JSON.stringify(value) }], isError }; }

function identity(context: InternalMcpTaskContext, message: any) {
  const signedCommunicationIdentity = !!context.communicationMessageId;
  return {
    taskId: context.taskId,
    workItemId: message?.workItemId || context.taskId,
    exactSessionId: exactSessionId(context),
    generation: Number(signedCommunicationIdentity ? context.communicationGeneration : message?.generation || context.nativeGeneration || 0),
    attempt: Number(signedCommunicationIdentity ? context.communicationAttempt : message?.attempt || 1),
    leaseId: String(signedCommunicationIdentity ? context.communicationLeaseId : message?.leaseId || ""),
    senderAgentId: senderAgentId(context),
    receiverAgentId: String(message?.senderAgentId || "ccm-main-agent"),
  };
}

function messageFor(context: InternalMcpTaskContext, messageId: any) {
  const message = getAgentCommunication(String(messageId || ""), { includeEvents: false, includeReceipts: false });
  if (!message) throw new Error("Agent Communication消息不存在");
  assertAgentCommunicationMcpBinding(context, message, messageId);
  return message;
}

export function assertAgentCommunicationMcpBinding(context: InternalMcpTaskContext, message: any, messageId: any) {
  if (message.taskId !== context.taskId || message.exactSessionId !== exactSessionId(context) || message.receiverAgentId !== senderAgentId(context)) throw new Error("Agent Communication消息与当前任务会话不匹配");
  const strictIdentity = message.payload?.strictPreExecutionAck === true || message.payload?.strict_pre_execution_ack === true;
  if (strictIdentity || context.communicationMessageId) {
    if (!context.communicationMessageId || String(messageId || "") !== context.communicationMessageId) throw new Error("Agent Communication消息未绑定当前签名运行上下文");
    if (Number(message.generation || 0) !== Number(context.communicationGeneration || 0)
      || Number(message.attempt || 0) !== Number(context.communicationAttempt || 0)
      || String(message.leaseId || "") !== String(context.communicationLeaseId || "")) {
      throw new Error("Agent Communication执行身份已过期，请使用当前attempt重新启动");
    }
  }
  return true;
}

export function runAgentCommunicationMcpBindingSelfTest() {
  const message = { taskId: "task-1", exactSessionId: "session-1", receiverAgentId: "project-a", generation: 2, attempt: 3, leaseId: "lease-new", payload: { strictPreExecutionAck: true } };
  const base: any = { taskId: "task-1", groupId: "", groupSessionId: "session-1", project: "project-a", role: "project-child-agent", workDir: "C:/tmp", baseWorkDir: "C:/tmp", communicationMessageId: "message-1", communicationGeneration: 2, communicationAttempt: 3, communicationLeaseId: "lease-new" };
  let staleRejected = false;
  try { assertAgentCommunicationMcpBinding({ ...base, communicationAttempt: 2, communicationLeaseId: "lease-old" }, message, "message-1"); }
  catch { staleRejected = true; }
  return { pass: assertAgentCommunicationMcpBinding(base, message, "message-1") === true && staleRejected };
}

function callTool(context: InternalMcpTaskContext, name: string, args: any) {
  const task = validate(context);
  if (name === "get_assignment_status") {
    if (args?.message_id) return result({ success: true, assignment: messageFor(context, args.message_id) });
    return result({ success: true, assignments: listAgentCommunications({ taskId: context.taskId, exactSessionId: exactSessionId(context), limit: 50 }) });
  }
  if (["acknowledge_assignment", "report_progress", "heartbeat", "submit_result"].includes(name)) {
    const message = messageFor(context, args?.message_id);
    const bound = identity(context, message);
    if (name === "heartbeat") return result({ success: true, ...heartbeatAgentCommunication(message.messageId, bound, args) });
    const receiptType = name === "acknowledge_assignment" ? "dispatch_ack" : name === "report_progress" ? "progress" : "result";
    const recorded = recordAgentCommunicationReceipt(message.messageId, receiptType as any, bound, args);
    return result({ success: recorded.accepted === true, ...recorded }, recorded.accepted !== true);
  }
  if (["request_coordination", "request_review", "report_blocker"].includes(name)) {
    if (context.role === "test-agent") throw new Error("TestAgent只能独立验收，不能转派开发或协作任务");
    if (!context.groupId || !context.groupSessionId || context.role !== "project-child-agent") throw new Error("跨项目协作只能由群聊中的项目子Agent提交");
    const kind = name === "request_review" ? "review" : name === "report_blocker" ? (args?.needs_user === true ? "risk" : "information") : args?.kind;
    const legacy = submitGroupCoordinationRequest({
      groupId: context.groupId, taskId: context.taskId, groupSessionId: context.groupSessionId,
      sourceProject: context.project, sourceAgentType: context.agentType,
      sourceTaskAgentSessionId: context.taskAgentSessionId, sourceNativeSessionId: context.nativeSessionId,
      sourceWorkDir: context.workDir,
    }, {
      kind, summary: args?.summary, question: args?.question || args?.summary, reason: args?.reason,
      blocking: name === "report_blocker" ? true : args?.blocking !== false,
      requiredCapabilities: args?.required_capabilities, targetHint: args?.target_hint,
      evidence: args?.evidence, acceptanceCriteria: args?.acceptance_criteria,
      requestedWritePaths: args?.requested_write_paths, idempotencyKey: args?.idempotency_key,
      metadata: { submitted_tool: name, communication_message_id: args?.message_id || "" },
    });
    const parent = args?.message_id ? messageFor(context, args.message_id) : null;
    const communication = createAgentCommunicationEnvelope({
      taskId: context.taskId, workItemId: legacy.record.id, scope: "group", scopeId: context.groupId,
      exactSessionId: context.groupSessionId, generation: Number(parent?.generation || context.nativeGeneration || 0),
      attempt: Number(parent?.attempt || 1), senderAgentId: context.project, receiverAgentId: "ccm-group-main-agent",
      messageType: "coordination_request", correlationId: parent?.correlationId || legacy.record.id,
      parentMessageId: parent?.messageId || "", idempotencyKey: `coordination-v2:${legacy.record.id}`,
      initialState: "queued", payload: { kind, summary: args?.summary, requiredCapabilities: args?.required_capabilities, targetHint: args?.target_hint, acceptanceCriteria: args?.acceptance_criteria, requestedWritePaths: args?.requested_write_paths, legacyRequestId: legacy.record.id },
    });
    return result({ success: true, request_id: legacy.record.id, message_id: communication.envelope.messageId, status: legacy.record.status, deduplicated: legacy.deduplicated || communication.deduplicated, next: "CCM主Agent将统一判断、派发和验收" });
  }
  return result({ success: false, error: `未知工具：${name}` }, true);
}

export function runAgentCommunicationMcpServer() {
  runInternalMcpServer({
    name: AGENT_COMMUNICATION_MCP_SERVER_NAME,
    version: "2.0.0",
    tools: tools.map(tool => ({ ...tool, roles: ["global-agent", "group-main-agent", "project-agent", "project-child-agent", "test-agent"] })),
    callTool,
  });
}

if (require.main === module) runAgentCommunicationMcpServer();
