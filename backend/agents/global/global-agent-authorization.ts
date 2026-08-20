import * as crypto from "crypto";
import type { WorkflowDecision } from "../workflow-decision";
import type { GlobalAgentRun, GlobalAgentToolRisk } from "./loop";

export type GlobalWriteAuthorizationReceiptV2 = {
  schema: "ccm-global-write-authorization-receipt-v2";
  id: string;
  principal: {
    kind: "browser" | "feishu" | "internal";
    id: string;
    role: string;
    capabilities: string[];
  };
  source: string;
  session_id: string;
  message_checksum: string;
  decision_checksum: string;
  directive: "grant" | "preserve" | "revoke";
  allowed_risk: "read" | "write";
  tool_family: "none" | "dispatch" | "direct";
  target_refs: string[];
  impact_scope: string[];
  requires_user_confirmation: boolean;
  valid_for_turn: string;
  issued_at: string;
  revoked_at?: string;
  checksum: string;
};

const DISPATCH_TOOLS = new Set([
  "create_requirement_epic",
  "orchestrate_development",
  "create_task",
  "send_project_cmd",
  "send_group_cmd",
]);

function stable(value: any): any {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function checksum(value: any) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function stringList(value: any, max = 24) {
  return [...new Set((Array.isArray(value) ? value : []).map((item) => String(item || "").trim()).filter(Boolean))].slice(0, max);
}

function receiptChecksum(value: Omit<GlobalWriteAuthorizationReceiptV2, "checksum">) {
  return checksum(value);
}

export function buildGlobalWriteAuthorizationReceipt(input: {
  turnId: string;
  sessionId: string;
  source: string;
  message: string;
  workflowDecision: WorkflowDecision;
  principal?: any;
  readOnly?: boolean;
}): GlobalWriteAuthorizationReceiptV2 {
  const decision = input.workflowDecision;
  const directive = decision.authorizationDirective === "grant"
    ? "grant"
    : decision.authorizationDirective === "revoke"
      ? "revoke"
      : "preserve";
  const targetRefs = stringList(decision.targetRefs);
  const impactScope = stringList(decision.impactScope);
  const principal = {
    kind: (input.principal?.kind === "feishu" || input.principal?.kind === "internal" ? input.principal.kind : "browser") as "browser" | "feishu" | "internal",
    id: String(input.principal?.id || input.principal?.userId || input.principal?.caller || "unknown"),
    role: String(input.principal?.role || (input.readOnly ? "viewer" : "operator")),
    capabilities: stringList(input.principal?.capabilities, 40),
  };
  const roleCanWrite = !input.readOnly && principal.role !== "viewer";
  const targetGrounded = targetRefs.length > 0 || impactScope.length > 0;
  const canGrant = directive === "grant"
    && decision.actionRequired === true
    && decision.requiresUserConfirmation !== true
    && decision.riskLevel !== "high"
    && roleCanWrite
    && targetGrounded;
  const toolFamily = canGrant
    ? (decision.needsEpicDecomposition === true ? "dispatch" : "direct")
    : "none";
  const base: Omit<GlobalWriteAuthorizationReceiptV2, "checksum"> = {
    schema: "ccm-global-write-authorization-receipt-v2",
    id: `gwar_${Date.now().toString(36)}_${crypto.randomBytes(5).toString("hex")}`,
    principal,
    source: String(input.source || "global-agent"),
    session_id: String(input.sessionId || "default"),
    message_checksum: checksum(String(input.message || "")),
    decision_checksum: checksum(decision),
    directive,
    allowed_risk: canGrant ? "write" : "read",
    tool_family: toolFamily,
    target_refs: targetRefs,
    impact_scope: impactScope,
    requires_user_confirmation: decision.requiresUserConfirmation === true || decision.riskLevel === "high" || !canGrant,
    valid_for_turn: String(input.turnId || ""),
    issued_at: new Date().toISOString(),
    ...(directive === "revoke" ? { revoked_at: new Date().toISOString() } : {}),
  };
  return { ...base, checksum: receiptChecksum(base) };
}

function toolTargets(args: any) {
  const values = [
    args?.project,
    args?.projectName,
    args?.group_id,
    args?.groupId,
    args?.target_project,
    args?.targetProject,
    args?.id,
    args?.name,
    ...(Array.isArray(args?.targets) ? args.targets.flatMap((item: any) => [item?.project, item?.group_id, item?.groupId, item?.id, item?.name]) : []),
  ];
  return stringList(values, 40).map((item) => item.toLowerCase());
}

export function verifyGlobalWriteAuthorizationReceipt(receipt: any, run: GlobalAgentRun) {
  if (!receipt || receipt.schema !== "ccm-global-write-authorization-receipt-v2") return { valid: false, reason: "authorization_receipt_missing" };
  const { checksum: actual, ...base } = receipt;
  if (!actual || actual !== receiptChecksum(base as any)) return { valid: false, reason: "authorization_receipt_checksum_invalid" };
  if (receipt.session_id !== run.session_id) return { valid: false, reason: "authorization_receipt_session_mismatch" };
  if (receipt.valid_for_turn !== String((run as any).turn_id || "")) return { valid: false, reason: "authorization_receipt_turn_mismatch" };
  if (receipt.message_checksum !== checksum(String((run as any).authorization_message || run.original_user_message || run.user_message || ""))) return { valid: false, reason: "authorization_receipt_message_mismatch" };
  if (receipt.revoked_at || receipt.directive !== "grant") return { valid: false, reason: "authorization_receipt_not_granted" };
  return { valid: true, reason: "authorization_receipt_valid" };
}

export function globalWriteAuthorizationAllowsTool(input: {
  run: GlobalAgentRun;
  tool: string;
  args: any;
  risk: GlobalAgentToolRisk;
}) {
  if (input.risk === "read") return { allowed: true, reason: "read_tool" };
  if (input.risk === "high") return { allowed: false, reason: "high_risk_requires_confirmation" };
  const receipt = (input.run as any).write_authorization_receipt || (input.run as any).writeAuthorizationReceipt;
  const verified = verifyGlobalWriteAuthorizationReceipt(receipt, input.run);
  if (!verified.valid || receipt.allowed_risk !== "write") return { allowed: false, reason: verified.reason };
  if (receipt.tool_family === "dispatch" && !DISPATCH_TOOLS.has(input.tool)) return { allowed: false, reason: "authorization_tool_family_mismatch" };
  if (receipt.tool_family === "none") return { allowed: false, reason: "authorization_tool_family_missing" };

  const allowedTargets = [...receipt.target_refs, ...receipt.impact_scope].map((item: string) => item.toLowerCase());
  const targets = toolTargets(input.args);
  const targetGrounded = targets.length > 0 && targets.every((target) => allowedTargets.some((allowed: string) => allowed === target || allowed.includes(target) || target.includes(allowed)));
  if (!targetGrounded) return { allowed: false, reason: "authorization_target_mismatch" };
  return { allowed: true, reason: "authorization_receipt_covers_tool" };
}

export function revokeGlobalWriteAuthorization(run: GlobalAgentRun, at = new Date().toISOString()) {
  const current = (run as any).write_authorization_receipt || (run as any).writeAuthorizationReceipt;
  if (!current) return null;
  const { checksum: _oldChecksum, ...base } = current;
  const revoked = { ...base, directive: "revoke", allowed_risk: "read", tool_family: "none", requires_user_confirmation: true, revoked_at: at };
  const next = { ...revoked, checksum: receiptChecksum(revoked) };
  (run as any).write_authorization_receipt = next;
  (run as any).writeAuthorizationReceipt = next;
  run.explicit_write_authorization = false;
  return next;
}
