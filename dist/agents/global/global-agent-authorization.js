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
exports.buildGlobalWriteAuthorizationReceipt = buildGlobalWriteAuthorizationReceipt;
exports.verifyGlobalWriteAuthorizationReceipt = verifyGlobalWriteAuthorizationReceipt;
exports.globalWriteAuthorizationAllowsTool = globalWriteAuthorizationAllowsTool;
exports.revokeGlobalWriteAuthorization = revokeGlobalWriteAuthorization;
const crypto = __importStar(require("crypto"));
const DISPATCH_TOOLS = new Set([
    "create_requirement_epic",
    "orchestrate_development",
    "create_task",
    "send_project_cmd",
    "send_group_cmd",
]);
function stable(value) {
    if (Array.isArray(value))
        return value.map(stable);
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
    }
    return value;
}
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}
function stringList(value, max = 24) {
    return [...new Set((Array.isArray(value) ? value : []).map((item) => String(item || "").trim()).filter(Boolean))].slice(0, max);
}
function receiptChecksum(value) {
    return checksum(value);
}
function buildGlobalWriteAuthorizationReceipt(input) {
    const decision = input.workflowDecision;
    const directive = decision.authorizationDirective === "grant"
        ? "grant"
        : decision.authorizationDirective === "revoke"
            ? "revoke"
            : "preserve";
    const targetRefs = stringList(decision.targetRefs);
    const impactScope = stringList(decision.impactScope);
    const principal = {
        kind: (input.principal?.kind === "feishu" || input.principal?.kind === "internal" ? input.principal.kind : "browser"),
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
    const base = {
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
function toolTargets(args) {
    const values = [
        args?.project,
        args?.projectName,
        args?.group_id,
        args?.groupId,
        args?.target_project,
        args?.targetProject,
        args?.id,
        args?.name,
        ...(Array.isArray(args?.targets) ? args.targets.flatMap((item) => [item?.project, item?.group_id, item?.groupId, item?.id, item?.name]) : []),
    ];
    return stringList(values, 40).map((item) => item.toLowerCase());
}
function verifyGlobalWriteAuthorizationReceipt(receipt, run) {
    if (!receipt || receipt.schema !== "ccm-global-write-authorization-receipt-v2")
        return { valid: false, reason: "authorization_receipt_missing" };
    const { checksum: actual, ...base } = receipt;
    if (!actual || actual !== receiptChecksum(base))
        return { valid: false, reason: "authorization_receipt_checksum_invalid" };
    if (receipt.session_id !== run.session_id)
        return { valid: false, reason: "authorization_receipt_session_mismatch" };
    if (receipt.valid_for_turn !== String(run.turn_id || ""))
        return { valid: false, reason: "authorization_receipt_turn_mismatch" };
    if (receipt.message_checksum !== checksum(String(run.authorization_message || run.original_user_message || run.user_message || "")))
        return { valid: false, reason: "authorization_receipt_message_mismatch" };
    if (receipt.revoked_at || receipt.directive !== "grant")
        return { valid: false, reason: "authorization_receipt_not_granted" };
    return { valid: true, reason: "authorization_receipt_valid" };
}
function globalWriteAuthorizationAllowsTool(input) {
    if (input.risk === "read")
        return { allowed: true, reason: "read_tool" };
    if (input.risk === "high")
        return { allowed: false, reason: "high_risk_requires_confirmation" };
    const receipt = input.run.write_authorization_receipt || input.run.writeAuthorizationReceipt;
    const verified = verifyGlobalWriteAuthorizationReceipt(receipt, input.run);
    if (!verified.valid || receipt.allowed_risk !== "write")
        return { allowed: false, reason: verified.reason };
    if (receipt.tool_family === "dispatch" && !DISPATCH_TOOLS.has(input.tool))
        return { allowed: false, reason: "authorization_tool_family_mismatch" };
    if (receipt.tool_family === "none")
        return { allowed: false, reason: "authorization_tool_family_missing" };
    const allowedTargets = [...receipt.target_refs, ...receipt.impact_scope].map((item) => item.toLowerCase());
    const targets = toolTargets(input.args);
    const targetGrounded = targets.length > 0 && targets.every((target) => allowedTargets.some((allowed) => allowed === target || allowed.includes(target) || target.includes(allowed)));
    if (!targetGrounded)
        return { allowed: false, reason: "authorization_target_mismatch" };
    return { allowed: true, reason: "authorization_receipt_covers_tool" };
}
function revokeGlobalWriteAuthorization(run, at = new Date().toISOString()) {
    const current = run.write_authorization_receipt || run.writeAuthorizationReceipt;
    if (!current)
        return null;
    const { checksum: _oldChecksum, ...base } = current;
    const revoked = { ...base, directive: "revoke", allowed_risk: "read", tool_family: "none", requires_user_confirmation: true, revoked_at: at };
    const next = { ...revoked, checksum: receiptChecksum(revoked) };
    run.write_authorization_receipt = next;
    run.writeAuthorizationReceipt = next;
    run.explicit_write_authorization = false;
    return next;
}
//# sourceMappingURL=global-agent-authorization.js.map