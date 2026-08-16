"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COORDINATOR_EMPTY_REPLY_FALLBACK = void 0;
exports.coordinatorUsableReply = coordinatorUsableReply;
exports.coordinatorChoseClarify = coordinatorChoseClarify;
exports.shouldSynthesizeCoordinatorVisibleReply = shouldSynthesizeCoordinatorVisibleReply;
exports.coordinatorShouldFailEmptyVisibleReply = coordinatorShouldFailEmptyVisibleReply;
exports.applySynthesizedCoordinatorReply = applySynthesizedCoordinatorReply;
exports.coordinatorVisibleFallbackContent = coordinatorVisibleFallbackContent;
exports.runGroupCoordinatorVisibleReplySelfTest = runGroupCoordinatorVisibleReplySelfTest;
const group_presented_plan_1 = require("./group-presented-plan");
exports.COORDINATOR_EMPTY_REPLY_FALLBACK = "模型这次没有给出可用回复，本次请求未完成。\n请重试；这不是工具失败，也不需要先改模型配置。";
function coordinatorUsableReply(parsed) {
    return String(parsed?.friendlyResponse
        || parsed?.friendly_response
        || parsed?.reply
        || parsed?.content
        || parsed?.directResponse
        || parsed?.direct_response
        || parsed?.questionForUser
        || parsed?.question_for_user
        || "").trim();
}
function coordinatorChoseClarify(parsed) {
    const kind = String(parsed?.responseType || parsed?.response_type || "").toLowerCase();
    return kind === "clarify"
        || !!String(parsed?.questionForUser || parsed?.question_for_user || "").trim();
}
function shouldSynthesizeCoordinatorVisibleReply(parsed) {
    const kind = String(parsed?.responseType || parsed?.response_type || "reply").toLowerCase();
    if (!["", "reply", "clarify", "plan"].includes(kind))
        return false;
    if ((0, group_presented_plan_1.hasPresentedGroupPlan)(parsed))
        return false;
    return !coordinatorUsableReply(parsed);
}
function coordinatorShouldFailEmptyVisibleReply(input = {}) {
    if (coordinatorUsableReply(input.parsed) || (0, group_presented_plan_1.hasPresentedGroupPlan)(input.parsed))
        return false;
    if (coordinatorChoseClarify(input.parsed))
        return false;
    const mode = String(input.workflowMode || input.parsed?.workflowDecision?.mode || "").toLowerCase();
    return !!(String(input.priorPlanDraft || "").trim()
        || Number(input.observationCount || 0) > 0
        || String(input.parsed?.responseType || "").toLowerCase() === "plan"
        || mode === "plan_task");
}
function applySynthesizedCoordinatorReply(parsed, synthesized) {
    const text = String(synthesized || "").trim();
    if (!text)
        return parsed;
    return {
        ...(parsed && typeof parsed === "object" ? parsed : {}),
        reply: text,
        content: text,
        friendlyResponse: text,
        directResponse: text,
    };
}
function coordinatorVisibleFallbackContent(input) {
    const parsed = input.parsed;
    const response = coordinatorUsableReply(parsed);
    if (response)
        return response;
    if ((0, group_presented_plan_1.hasPresentedGroupPlan)(parsed))
        return group_presented_plan_1.COORDINATOR_PRESENTED_PLAN_HEADLINE;
    const policyLine = String(input.policyLine || "").trim();
    if (policyLine)
        return policyLine;
    if (coordinatorChoseClarify(parsed)) {
        const question = String(input.analysis?.missingInfo?.[0] || parsed?.questionForUser || "请描述更具体的需求").trim();
        return `我理解了你的需求，不过还需要你补充一下：**${question}**`;
    }
    if (coordinatorShouldFailEmptyVisibleReply({
        parsed,
        priorPlanDraft: input.priorPlanDraft,
        observationCount: input.observationCount,
        workflowMode: input.analysis?.workflowDecision?.mode,
    })) {
        return "";
    }
    return exports.COORDINATOR_EMPTY_REPLY_FALLBACK;
}
function runGroupCoordinatorVisibleReplySelfTest() {
    const emptyParsed = { responseType: "reply", reply: "", friendlyResponse: "" };
    const synthesized = applySynthesizedCoordinatorReply(emptyParsed, "按前文做预约排队的实现计划。");
    const checks = {
        emptyReplyNeedsSynthesis: shouldSynthesizeCoordinatorVisibleReply(emptyParsed) === true,
        whitespaceNotUsable: coordinatorUsableReply({ reply: " \n " }) === "",
        replyFieldIsUsable: coordinatorUsableReply({ reply: "计划如下。" }) === "计划如下。",
        synthesisFillsFriendlyResponse: String(synthesized.friendlyResponse).includes("预约排队"),
        emptyReplyIsNotFakeClarify: coordinatorVisibleFallbackContent({ parsed: emptyParsed }) === exports.COORDINATOR_EMPTY_REPLY_FALLBACK,
        clarifyKeepsAsk: coordinatorVisibleFallbackContent({
            parsed: { responseType: "clarify", questionForUser: "首版范围是什么？" },
            analysis: { missingInfo: ["首版范围是什么？"] },
        }).includes("首版范围是什么？"),
        dispatchSkipsSynthesis: shouldSynthesizeCoordinatorVisibleReply({ responseType: "dispatch", reply: "" }) === false,
        presentedPlanSkipsSynthesis: shouldSynthesizeCoordinatorVisibleReply({
            responseType: "plan",
            reply: "",
            plan: { goal: "预约排队", steps: [{ title: "P0 后端" }] },
        }) === false,
        presentedPlanHeadline: coordinatorVisibleFallbackContent({
            parsed: { responseType: "plan", reply: "", plan: { goal: "预约排队", steps: [{ title: "P0 后端" }] } },
        }).includes("实施步骤"),
        emptyChatKeepsFallback: coordinatorShouldFailEmptyVisibleReply({ parsed: emptyParsed }) === false,
        priorPlanEmptyIsFailure: coordinatorShouldFailEmptyVisibleReply({
            parsed: emptyParsed,
            priorPlanDraft: "建议按 P0 后端校验。",
        }) === true,
        toolsEmptyIsFailure: coordinatorShouldFailEmptyVisibleReply({
            parsed: emptyParsed,
            observationCount: 6,
        }) === true,
        priorPlanFallbackNotSuccess: coordinatorVisibleFallbackContent({
            parsed: emptyParsed,
            priorPlanDraft: "建议按 P0 后端校验。",
        }) === "",
    };
    return { pass: Object.values(checks).every(Boolean), checks };
}
//# sourceMappingURL=group-coordinator-visible-reply.js.map