import { isDevelopmentTaskWorkflowDecision } from "../../agents/workflow-decision";
import {
  COORDINATOR_EMPTY_REPLY_FALLBACK,
  coordinatorVisibleFallbackContent,
} from "../collaboration/group-coordinator-visible-reply";
import {
  hasPresentedGroupPlan,
  presentedPlanFromParsed,
} from "../collaboration/group-presented-plan";

export type ProjectFirstTurnVisiblePresentation = {
  present: boolean;
  messageMode: "conversation";
  reply: string;
  presentedPlan: any | null;
  responseKind: string;
};

export function presentedPlanFromProjectFirstTurn(firstTurn: any) {
  if (firstTurn?.presentedPlan && typeof firstTurn.presentedPlan === "object" && Array.isArray(firstTurn.presentedPlan.steps) && firstTurn.presentedPlan.steps.length) {
    return firstTurn.presentedPlan;
  }
  if (!hasPresentedGroupPlan(firstTurn?.parsed)) return null;
  return presentedPlanFromParsed({
    parsed: firstTurn.parsed,
    planId: firstTurn?.turnDecision?.turnId || firstTurn?.turnReceipt?.turnId || "project-plan",
    goalFallback: firstTurn?.reply || firstTurn?.turnDecision?.reply,
  });
}

export function projectFirstTurnShouldEnterTask(firstTurn: any, options: { treatAsTask?: boolean } = {}) {
  return options.treatAsTask === true || isDevelopmentTaskWorkflowDecision(firstTurn?.workflowDecision);
}

export function projectFirstTurnVisiblePresentation(firstTurn: any, options: { treatAsTask?: boolean } = {}): ProjectFirstTurnVisiblePresentation {
  const responseKind = String(firstTurn?.responseType || firstTurn?.turnDecision?.responseKind || "");
  const presentedPlan = presentedPlanFromProjectFirstTurn(firstTurn);
  const parsed = {
    ...(firstTurn?.parsed && typeof firstTurn.parsed === "object" ? firstTurn.parsed : {}),
    reply: firstTurn?.reply || firstTurn?.turnDecision?.reply || firstTurn?.parsed?.reply,
    responseType: responseKind || firstTurn?.parsed?.responseType,
    workflowDecision: firstTurn?.workflowDecision || firstTurn?.parsed?.workflowDecision,
  };
  const reply = coordinatorVisibleFallbackContent({
    parsed,
    observationCount: Array.isArray(firstTurn?.toolResults) ? firstTurn.toolResults.length : 0,
    analysis: { workflowDecision: parsed.workflowDecision },
  }) || COORDINATOR_EMPTY_REPLY_FALLBACK;
  if (projectFirstTurnShouldEnterTask(firstTurn, options)) {
    return { present: false, messageMode: "conversation", reply: "", presentedPlan: null, responseKind };
  }
  return {
    present: true,
    messageMode: "conversation",
    reply,
    presentedPlan,
    responseKind,
  };
}

/** @deprecated use projectFirstTurnVisiblePresentation */
export function projectFirstTurnVisibleCompletion(firstTurn: any, options: { treatAsTask?: boolean } = {}) {
  const visible = projectFirstTurnVisiblePresentation(firstTurn, options);
  return {
    complete: visible.present,
    mode: visible.present ? visible.messageMode : "",
    reply: visible.reply,
    presentedPlan: visible.presentedPlan,
    responseKind: visible.responseKind,
  };
}

export function runProjectMainTurnCompleteSelfTest() {
  const replyTurn = { responseType: "reply", reply: "这是问候。", workflowDecision: { actionRequired: false, requiresCodeChanges: false } };
  const clarifyTurn = { responseType: "clarify", reply: "首版范围是什么？", workflowDecision: { actionRequired: false, requiresCodeChanges: false } };
  const planTurn = {
    responseType: "plan",
    reply: "请看计划",
    turnDecision: { turnId: "turn-plan-1", responseKind: "plan", reply: "请看计划" },
    parsed: { responseType: "plan", plan: { title: "登录", goal: "修好登录过期", steps: [{ title: "改 auth.ts" }] } },
    workflowDecision: { actionRequired: false, requiresCodeChanges: false },
  };
  const emptyAnalysis = { responseType: "reply", reply: "", workflowDecision: { actionRequired: false, requiresCodeChanges: false } };
  const devTask = {
    responseType: "plan",
    reply: "请看计划",
    parsed: { plan: { title: "登录", goal: "修好登录", steps: [{ title: "改 auth.ts" }] } },
    workflowDecision: { actionRequired: true, requiresCodeChanges: true },
  };
  const replyVisible = projectFirstTurnVisiblePresentation(replyTurn);
  const clarifyVisible = projectFirstTurnVisiblePresentation(clarifyTurn);
  const planVisible = projectFirstTurnVisiblePresentation(planTurn);
  const empty = projectFirstTurnVisiblePresentation(emptyAnalysis);
  const task = projectFirstTurnVisiblePresentation(devTask);
  const parentTaskPlan = projectFirstTurnVisiblePresentation(planTurn, { treatAsTask: true });
  const checks = {
    replyPresents: replyVisible.present === true && replyVisible.reply === "这是问候。" && replyVisible.messageMode === "conversation",
    clarifyPresents: clarifyVisible.present === true && clarifyVisible.responseKind === "clarify",
    planCardPresents: planVisible.present === true && planVisible.presentedPlan?.steps?.[0]?.title === "改 auth.ts",
    emptyAnalysisPresentsFallback: empty.present === true
      && empty.messageMode === "conversation"
      && empty.reply === COORDINATOR_EMPTY_REPLY_FALLBACK,
    developmentTaskDoesNotPresent: task.present === false,
    parentTaskPlanDoesNotPresent: parentTaskPlan.present === false,
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
