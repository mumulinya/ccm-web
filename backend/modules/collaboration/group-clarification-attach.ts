import { parsedRequestsUserClarification } from "../../agents/clarification-turn";

export function groupTurnNeedsClarificationCards(input: {
  dispatchPolicy?: any;
  mainAgentTurnDecision?: any;
  workflowDecision?: any;
  parsed?: any;
} = {}) {
  if (String(input.dispatchPolicy?.action || "").trim() === "ask_user") return true;
  if (String(input.mainAgentTurnDecision?.responseKind || "").trim() === "clarify") return true;
  const questions = input.dispatchPolicy?.structuredClarificationQuestions
    || input.dispatchPolicy?.structured_clarification_questions
    || input.workflowDecision?.structuredClarificationQuestions
    || input.workflowDecision?.structured_clarification_questions
    || [];
  if (Array.isArray(questions) && questions.length > 0) return true;
  return parsedRequestsUserClarification(input.parsed);
}

export function resolveGroupLiveDispatchPolicy(input: {
  projectAnalysisRequest?: boolean;
  conversationalOnly?: boolean;
  taskIntent?: any;
  coordinatorResult?: any;
}) {
  const native = input.coordinatorResult?.dispatchPolicy || null;
  const needsCards = groupTurnNeedsClarificationCards({
    dispatchPolicy: native,
    mainAgentTurnDecision: input.coordinatorResult?.mainAgentTurnDecision,
    workflowDecision: input.coordinatorResult?.workflowDecision
      || input.coordinatorResult?.analysis?.workflowDecision,
    parsed: input.coordinatorResult,
  });
  if (needsCards) {
    const questions = native?.structuredClarificationQuestions
      || native?.structured_clarification_questions
      || input.coordinatorResult?.workflowDecision?.structuredClarificationQuestions
      || input.coordinatorResult?.analysis?.workflowDecision?.structuredClarificationQuestions
      || [];
    return {
      ...(native && typeof native === "object" ? native : {}),
      action: "ask_user",
      reason: native?.reason || input.coordinatorResult?.mainAgentTurnDecision?.reply || "需要先确认关键业务边界",
      nextStep: native?.nextStep || "等待用户补充信息",
      structuredClarificationQuestions: Array.isArray(questions) ? questions.slice(0, 3) : [],
    };
  }
  if (input.projectAnalysisRequest) {
    return { action: "project_analysis", reason: input.taskIntent?.reason, nextStep: "已基于只读项目上下文回答用户" };
  }
  if (input.conversationalOnly) {
    return { action: "answer", reason: input.taskIntent?.reason, nextStep: "已按普通对话回复用户" };
  }
  return native;
}

export function runGroupClarificationAttachSelfTest() {
  const clarify = resolveGroupLiveDispatchPolicy({
    conversationalOnly: true,
    taskIntent: { reason: "普通对话" },
    coordinatorResult: {
      dispatchPolicy: { action: "direct_answer", reason: "workflow mode is answer" },
      mainAgentTurnDecision: { responseKind: "clarify", reply: "先确认履约方式" },
      workflowDecision: {
        mode: "answer",
        structuredClarificationQuestions: [{ label: "核销方式", options: [{ label: "到店核销" }] }],
      },
    },
  });
  const greeting = resolveGroupLiveDispatchPolicy({
    conversationalOnly: true,
    taskIntent: { reason: "问候" },
    coordinatorResult: {
      dispatchPolicy: { action: "direct_answer" },
      mainAgentTurnDecision: { responseKind: "reply" },
    },
  });
  const nativeAsk = resolveGroupLiveDispatchPolicy({
    conversationalOnly: true,
    coordinatorResult: {
      dispatchPolicy: { action: "ask_user", structuredClarificationQuestions: [{ label: "范围" }] },
      mainAgentTurnDecision: { responseKind: "reply" },
    },
  });
  const checks = {
    clarifyWinsOverConversational: clarify?.action === "ask_user" && clarify?.structuredClarificationQuestions?.[0]?.label === "核销方式",
    greetingStaysAnswer: greeting?.action === "answer",
    nativeAskKept: nativeAsk?.action === "ask_user",
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
