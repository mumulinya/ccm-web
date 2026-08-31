"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsedRequestsUserClarification = parsedRequestsUserClarification;
exports.runClarificationTurnSelfTest = runClarificationTurnSelfTest;
function parsedRequestsUserClarification(parsed) {
    if (!parsed || typeof parsed !== "object")
        return false;
    const kind = String(parsed.responseType || parsed.response_type || "").trim().toLowerCase();
    if (kind === "dispatch" || kind === "plan" || kind === "execute")
        return false;
    return kind === "clarify";
}
function runClarificationTurnSelfTest() {
    const clarify = parsedRequestsUserClarification({
        responseType: "clarify",
        questionForUser: "核销方式？",
        workflowDecision: { actionRequired: false, requiresCodeChanges: false, structuredClarificationQuestions: [{ label: "核销方式" }] },
    });
    const reply = parsedRequestsUserClarification({
        responseType: "reply",
        reply: "你好",
        workflowDecision: { actionRequired: false, requiresCodeChanges: false },
    });
    const dispatch = parsedRequestsUserClarification({
        responseType: "dispatch",
        questionForUser: "核销方式？",
        workflowDecision: { structuredClarificationQuestions: [{ label: "核销方式" }] },
    });
    const historicalOnly = parsedRequestsUserClarification({
        responseType: "reply",
        workflowDecision: { structuredClarificationQuestions: [{ label: "旧字段" }] },
    });
    return {
        pass: clarify === true && reply === false && dispatch === false && historicalOnly === false,
        checks: {
            nativeAskMapsClarify: clarify === true,
            ordinaryReplyStaysFalse: reply === false,
            dispatchNotClarify: dispatch === false,
            historicalFieldsIgnored: historicalOnly === false,
        },
    };
}
//# sourceMappingURL=clarification-turn.js.map