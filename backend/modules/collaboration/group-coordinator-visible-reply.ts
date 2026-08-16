import { COORDINATOR_PRESENTED_PLAN_HEADLINE, hasPresentedGroupPlan } from "./group-presented-plan";

export const COORDINATOR_EMPTY_REPLY_FALLBACK = "模型这次没有给出可用回复，本次请求未完成。\n请重试；这不是工具失败，也不需要先改模型配置。";

export function coordinatorUsableReply(parsed: any) {
  return String(
    parsed?.friendlyResponse
    || parsed?.friendly_response
    || parsed?.reply
    || parsed?.content
    || parsed?.directResponse
    || parsed?.direct_response
    || parsed?.questionForUser
    || parsed?.question_for_user
    || "",
  ).trim();
}

export function coordinatorChoseClarify(parsed: any) {
  const kind = String(parsed?.responseType || parsed?.response_type || "").toLowerCase();
  return kind === "clarify"
    || !!String(parsed?.questionForUser || parsed?.question_for_user || "").trim();
}

export function shouldSynthesizeCoordinatorVisibleReply(parsed: any) {
  const kind = String(parsed?.responseType || parsed?.response_type || "reply").toLowerCase();
  if (!["", "reply", "clarify", "plan"].includes(kind)) return false;
  if (hasPresentedGroupPlan(parsed)) return false;
  return !coordinatorUsableReply(parsed);
}

export function coordinatorShouldFailEmptyVisibleReply(input: {
  parsed?: any;
  priorPlanDraft?: string;
  observationCount?: number;
  workflowMode?: string;
} = {}) {
  if (coordinatorUsableReply(input.parsed) || hasPresentedGroupPlan(input.parsed)) return false;
  if (coordinatorChoseClarify(input.parsed)) return false;
  const mode = String(input.workflowMode || input.parsed?.workflowDecision?.mode || "").toLowerCase();
  return !!(
    String(input.priorPlanDraft || "").trim()
    || Number(input.observationCount || 0) > 0
    || String(input.parsed?.responseType || "").toLowerCase() === "plan"
    || mode === "plan_task"
  );
}

export function applySynthesizedCoordinatorReply(parsed: any, synthesized: string) {
  const text = String(synthesized || "").trim();
  if (!text) return parsed;
  return {
    ...(parsed && typeof parsed === "object" ? parsed : {}),
    reply: text,
    content: text,
    friendlyResponse: text,
    directResponse: text,
  };
}

export function coordinatorVisibleFallbackContent(input: {
  parsed?: any;
  analysis?: any;
  policyLine?: string;
  priorPlanDraft?: string;
  observationCount?: number;
}) {
  const parsed = input.parsed;
  const response = coordinatorUsableReply(parsed);
  if (response) return response;
  if (hasPresentedGroupPlan(parsed)) return COORDINATOR_PRESENTED_PLAN_HEADLINE;
  const policyLine = String(input.policyLine || "").trim();
  if (policyLine) return policyLine;
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
  return COORDINATOR_EMPTY_REPLY_FALLBACK;
}

export function runGroupCoordinatorVisibleReplySelfTest() {
  const emptyParsed = { responseType: "reply", reply: "", friendlyResponse: "" };
  const synthesized = applySynthesizedCoordinatorReply(emptyParsed, "按前文做预约排队的实现计划。");
  const checks = {
    emptyReplyNeedsSynthesis: shouldSynthesizeCoordinatorVisibleReply(emptyParsed) === true,
    whitespaceNotUsable: coordinatorUsableReply({ reply: " \n " }) === "",
    replyFieldIsUsable: coordinatorUsableReply({ reply: "计划如下。" }) === "计划如下。",
    synthesisFillsFriendlyResponse: String(synthesized.friendlyResponse).includes("预约排队"),
    emptyReplyIsNotFakeClarify: coordinatorVisibleFallbackContent({ parsed: emptyParsed }) === COORDINATOR_EMPTY_REPLY_FALLBACK,
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
    }).includes(COORDINATOR_PRESENTED_PLAN_HEADLINE),
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
