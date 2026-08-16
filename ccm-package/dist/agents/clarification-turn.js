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
    if (kind === "clarify")
        return true;
    if (String(parsed.questionForUser || parsed.question_for_user || "").trim())
        return true;
    const questions = parsed.dispatchPolicy?.structuredClarificationQuestions
        || parsed.dispatchPolicy?.structured_clarification_questions
        || parsed.workflowDecision?.structuredClarificationQuestions
        || parsed.workflow_decision?.structured_clarification_questions
        || parsed.workflowDecision?.clarificationQuestions
        || parsed.workflow_decision?.clarification_questions
        || [];
    return Array.isArray(questions) && questions.length > 0;
}
function runClarificationTurnSelfTest() {
    const clarify = parsedRequestsUserClarification({
        responseType: "clarify",
        questionForUser: "核销方式？",
        workflowDecision: { mode: "answer", structuredClarificationQuestions: [{ label: "核销方式" }] },
    });
    const reply = parsedRequestsUserClarification({
        responseType: "reply",
        reply: "你好",
        workflowDecision: { mode: "answer" },
    });
    const dispatch = parsedRequestsUserClarification({
        responseType: "dispatch",
        questionForUser: "核销方式？",
        workflowDecision: { structuredClarificationQuestions: [{ label: "核销方式" }] },
    });
    return {
        pass: clarify === true && reply === false && dispatch === false,
        checks: {
            nativeAskMapsClarify: clarify === true,
            ordinaryReplyStaysFalse: reply === false,
            dispatchNotClarify: dispatch === false,
        },
    };
}
//# sourceMappingURL=clarification-turn.js.map