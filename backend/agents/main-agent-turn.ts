import * as crypto from "crypto";
import { normalizeWorkflowDecision, type WorkflowDecision } from "./workflow-decision";

export type MainAgentTurnResponseKind = "reply" | "tool_calls" | "clarify" | "plan" | "dispatch";

export type MainAgentTurnDecisionV1 = {
  schema: "ccm-main-agent-turn-decision-v1";
  scope: "global" | "group" | "project";
  scopeId: string;
  exactSessionId: string;
  turnId: string;
  responseKind: MainAgentTurnResponseKind;
  workflowDecision: WorkflowDecision;
  reply: string;
  toolRequests: Array<{ name: string; arguments: Record<string, any>; reason?: string }>;
  planDraft: any;
  dispatchDraft: any;
  checksum: string;
};

export type MainAgentTurnReceiptV1 = {
  schema: "ccm-main-agent-turn-receipt-v1";
  version: 1;
  scope: "global" | "group" | "project";
  scopeId: string;
  exactSessionId: string;
  turnId: string;
  responseKind: MainAgentTurnResponseKind;
  modelCallPurpose: "main_first_turn" | "tool_followup";
  modelCallIndex: number;
  toolRound: number;
  usage: any;
  inputChecksum: string;
  decisionChecksum: string;
  createdAt: string;
  checksum: string;
};

function checksum(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

export function normalizeMainAgentTurnDecision(input: {
  scope: "global" | "group" | "project";
  scopeId?: string;
  exactSessionId?: string;
  turnId?: string;
  parsed?: any;
  workflowDecision?: any;
  reply?: string;
  toolRequests?: any[];
  planDraft?: any;
  dispatchDraft?: any;
}): MainAgentTurnDecisionV1 {
  const parsed = input.parsed && typeof input.parsed === "object" ? input.parsed : {};
  const workflowDecision = normalizeWorkflowDecision(input.workflowDecision || parsed.workflowDecision || parsed.workflow_decision || {});
  const toolRequests = (Array.isArray(input.toolRequests) ? input.toolRequests : Array.isArray(parsed.toolRequests) ? parsed.toolRequests : Array.isArray(parsed.tool_requests) ? parsed.tool_requests : [])
    .slice(0, 2)
    .map((item: any) => ({
      name: String(item?.name || "").trim(),
      arguments: item?.arguments && typeof item.arguments === "object" ? item.arguments : {},
      reason: String(item?.reason || "").trim(),
    }))
    .filter((item: any) => item.name);
  const reply = String(input.reply ?? parsed.directResponse ?? parsed.direct_response ?? parsed.friendlyResponse ?? parsed.friendly_response ?? parsed.message ?? "").trim();
  const planDraft = input.planDraft ?? parsed.plan ?? parsed.coordinationPlan ?? parsed.coordination_plan ?? null;
  const dispatchDraft = input.dispatchDraft ?? parsed.targets ?? parsed.assignments ?? null;
  const explicitResponseKind = String(parsed.responseType || parsed.response_type || "").trim() as MainAgentTurnResponseKind;
  const responseKind: MainAgentTurnResponseKind = toolRequests.length
    ? "tool_calls"
    : workflowDecision.structuredClarificationQuestions.length || workflowDecision.clarificationQuestions.length || String(parsed.questionForUser || parsed.question_for_user || "").trim()
      ? "clarify"
    : ["reply", "clarify", "plan", "dispatch"].includes(explicitResponseKind)
      ? explicitResponseKind
      : workflowDecision.mode === "decompose_epic" || (Array.isArray(dispatchDraft) && dispatchDraft.length)
        ? "dispatch"
        : workflowDecision.mode === "plan_task" || workflowDecision.mode === "execute_direct" || workflowDecision.actionRequired
          ? "plan"
          : "reply";
  const body: Omit<MainAgentTurnDecisionV1, "checksum"> = {
    schema: "ccm-main-agent-turn-decision-v1",
    scope: input.scope,
    scopeId: String(input.scopeId || ""),
    exactSessionId: String(input.exactSessionId || ""),
    turnId: String(input.turnId || ""),
    responseKind,
    workflowDecision,
    reply,
    toolRequests,
    planDraft,
    dispatchDraft,
  };
  return { ...body, checksum: checksum(body) };
}

export function createMainAgentTurnReceipt(input: {
  decision: MainAgentTurnDecisionV1;
  modelCallIndex: number;
  toolRound?: number;
  usage?: any;
  inputIdentity?: any;
  createdAt?: string;
}): MainAgentTurnReceiptV1 {
  const body: Omit<MainAgentTurnReceiptV1, "checksum"> = {
    schema: "ccm-main-agent-turn-receipt-v1",
    version: 1,
    scope: input.decision.scope,
    scopeId: input.decision.scopeId,
    exactSessionId: input.decision.exactSessionId,
    turnId: input.decision.turnId,
    responseKind: input.decision.responseKind,
    modelCallPurpose: input.modelCallIndex <= 1 ? "main_first_turn" : "tool_followup",
    modelCallIndex: Math.max(1, Math.floor(input.modelCallIndex || 1)),
    toolRound: Math.max(0, Math.floor(input.toolRound || 0)),
    usage: input.usage || null,
    inputChecksum: checksum(input.inputIdentity || null),
    decisionChecksum: input.decision.checksum,
    createdAt: input.createdAt || new Date().toISOString(),
  };
  return { ...body, checksum: checksum(body) };
}

export function publicMainAgentTurnDecision(decision: MainAgentTurnDecisionV1) {
  return {
    schema: decision.schema,
    scope: decision.scope,
    scope_id: decision.scopeId,
    exact_session_id: decision.exactSessionId,
    turn_id: decision.turnId,
    response_type: decision.responseKind,
    workflow_decision: decision.workflowDecision,
    tool_count: decision.toolRequests.length,
    checksum: decision.checksum,
  };
}
