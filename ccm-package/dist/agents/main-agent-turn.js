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
exports.normalizeMainAgentTurnDecision = normalizeMainAgentTurnDecision;
exports.createMainAgentTurnReceipt = createMainAgentTurnReceipt;
exports.publicMainAgentTurnDecision = publicMainAgentTurnDecision;
const crypto = __importStar(require("crypto"));
const clarification_turn_1 = require("./clarification-turn");
const workflow_decision_1 = require("./workflow-decision");
function checksum(value) {
    return crypto.createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}
function normalizeMainAgentTurnDecision(input) {
    const parsed = input.parsed && typeof input.parsed === "object" ? input.parsed : {};
    const workflowDecision = (0, workflow_decision_1.normalizeWorkflowDecision)(input.workflowDecision || parsed.workflowDecision || parsed.workflow_decision || {});
    const toolRequests = (Array.isArray(input.toolRequests) ? input.toolRequests : Array.isArray(parsed.toolRequests) ? parsed.toolRequests : Array.isArray(parsed.tool_requests) ? parsed.tool_requests : [])
        .slice(0, 2)
        .map((item) => ({
        name: String(item?.name || "").trim(),
        arguments: item?.arguments && typeof item.arguments === "object" ? item.arguments : {},
        reason: String(item?.reason || "").trim(),
    }))
        .filter((item) => item.name);
    const reply = String(input.reply ?? parsed.reply ?? parsed.questionForUser ?? parsed.question_for_user ?? parsed.directResponse ?? parsed.direct_response ?? parsed.friendlyResponse ?? parsed.friendly_response ?? parsed.message ?? "").trim();
    const planDraft = input.planDraft ?? parsed.plan ?? parsed.coordinationPlan ?? parsed.coordination_plan ?? null;
    const dispatchDraft = input.dispatchDraft ?? parsed.targets ?? parsed.assignments ?? null;
    const explicitResponseKind = String(parsed.responseType || parsed.response_type || "").trim();
    const responseKind = ["dispatch", "plan"].includes(explicitResponseKind)
        ? explicitResponseKind
        : (0, clarification_turn_1.parsedRequestsUserClarification)(parsed) || workflowDecision.structuredClarificationQuestions.length || workflowDecision.clarificationQuestions.length
            ? "clarify"
            : toolRequests.length
                ? "tool_calls"
                : ["reply", "clarify"].includes(explicitResponseKind)
                    ? explicitResponseKind
                    : workflowDecision.mode === "decompose_epic" || (Array.isArray(dispatchDraft) && dispatchDraft.length)
                        ? "dispatch"
                        : workflowDecision.mode === "plan_task" || workflowDecision.mode === "execute_direct" || workflowDecision.actionRequired
                            ? "plan"
                            : "reply";
    const body = {
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
function createMainAgentTurnReceipt(input) {
    const body = {
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
function publicMainAgentTurnDecision(decision) {
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
//# sourceMappingURL=main-agent-turn.js.map