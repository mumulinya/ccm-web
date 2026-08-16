const CONTEXT_FAILURE = /CONTEXT|COMPACT|上下文|容量|prompt.{0,20}(?:long|large)|too.{0,10}long|PAYLOAD_BLOCKED|TOOL_RESULT_PAYLOAD_BLOCKED|TOOL_LOOP_|FORMAL_COMPACTION/i;
const EMPTY_REPLY_FAILURE = /模型返回空响应|empty (?:model )?response/i;
const PROVIDER_UNAVAILABLE = /HTTP\s+50[0234]|service temporarily unavailable|fetch failed|network|socket|ECONN|ENOTFOUND|provider.*unavailable/i;
const PROVIDER_FAILURE = /CCM_MODEL_|HTTP\s+\d{3}|fetch|network|socket|timeout|timed out|ECONN|ENOTFOUND|Provider/i;
const WORKFLOW_FAILURE = /无效工作流|workflowDecision|workflow_decision|结构化工作流|有效 JSON|合法 JSON/i;

function withLegacyGuidance<T extends { userGuidance: string }>(failure: T) {
  return {
    ...failure,
    guidance: failure.userGuidance,
  };
}

function observationCount(error: any) {
  const count = Number(error?.observationCount ?? error?.toolResultCount ?? 0);
  if (Number.isFinite(count) && count > 0) return count;
  return error?.hasToolResults === true ? 1 : 0;
}

function afterObservationCopy(kind: "context" | "provider" | "internal" | "empty_reply") {
  return withLegacyGuidance({
    kind,
    userSummary: "只读检查已完成，但没能生成计划。",
    userGuidance: "发送继续或点立即重试，会接着刚才的检查继续。",
  });
}

function emptyReplyCopy() {
  return withLegacyGuidance({
    kind: "empty_reply" as const,
    userSummary: "模型这次没有给出可用回复，本次请求未完成。",
    userGuidance: "请重试；这不是工具失败，也不需要先改模型配置。",
  });
}

export function classifyGroupOrchestratorFailure(error: any) {
  const code = String(error?.code || "").trim();
  const raw = String(error?.message || error || "").trim();
  const haystack = `${code} ${raw}`;
  const hasObservations = observationCount(error) > 0;

  if (code === "CCM_WORKFLOW_DECISION_INVALID" || WORKFLOW_FAILURE.test(raw)) {
    return withLegacyGuidance({
      kind: "workflow_contract",
      userSummary: "主 Agent 没有生成可执行计划，本次请求未完成。",
      userGuidance: "请重试；如果仍然失败，请检查当前模型配置。",
    });
  }
  if (CONTEXT_FAILURE.test(haystack)) {
    if (hasObservations) return afterObservationCopy("context");
    return withLegacyGuidance({
      kind: "context",
      userSummary: "当前会话上下文整理失败，本次请求未完成。",
      userGuidance: "请重试，或先压缩当前会话上下文。",
    });
  }
  if (EMPTY_REPLY_FAILURE.test(haystack)) {
    if (hasObservations) return afterObservationCopy("empty_reply");
    return emptyReplyCopy();
  }
  if (PROVIDER_UNAVAILABLE.test(haystack) || PROVIDER_FAILURE.test(haystack)) {
    if (hasObservations) return afterObservationCopy("provider");
    if (PROVIDER_UNAVAILABLE.test(haystack)) {
      return withLegacyGuidance({
        kind: "provider",
        userSummary: "大模型暂时不可用，本次请求未完成。",
        userGuidance: "请检查模型配置或网络后重试。",
      });
    }
    return withLegacyGuidance({
      kind: "provider",
      userSummary: "模型这次没有完成回复，本次请求未完成。",
      userGuidance: "请重试；如果连续失败，再检查模型配置或网络。",
    });
  }
  if (hasObservations) return afterObservationCopy("internal");
  return withLegacyGuidance({
    kind: "internal",
    userSummary: "主 Agent 暂时无法处理，本次请求未完成。",
    userGuidance: "请重试；如果仍然失败，请查看技术详情。",
  });
}

export function summarizeGroupOrchestratorProviderError(error: any) {
  const raw = String(error?.message || error || "主 Agent Provider 调用失败").trim();
  const status = raw.match(/\bHTTP\s+\d{3}\b/i);
  if (status?.index !== undefined) {
    return raw.slice(0, status.index + status[0].length).replace(/\s+/g, " ").replace(/[:：\s]+$/, "").slice(0, 220);
  }
  const firstLine = raw.split(/\r?\n/, 1)[0]
    .replace(/<!doctype[\s\S]*$/i, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return (firstLine || "主 Agent Provider 调用失败").slice(0, 220);
}

export function runGroupOrchestratorFailureSelfTest() {
  const workflow = classifyGroupOrchestratorFailure(Object.assign(new Error("大模型返回了无效工作流：空"), { code: "CCM_WORKFLOW_DECISION_INVALID" }));
  const payload = classifyGroupOrchestratorFailure(Object.assign(new Error("GROUP_MAIN_TOOL_RESULT_PAYLOAD_BLOCKED:180000/120000"), { observationCount: 8 }));
  const providerAfterTools = classifyGroupOrchestratorFailure(Object.assign(new Error("模型返回空响应"), { observationCount: 9 }));
  const emptyReply = classifyGroupOrchestratorFailure(Object.assign(
    new Error("OpenAI-compatible JSON model call失败：已完成 2 次尝试，总耗时 4630ms；最后错误：模型返回空响应"),
    { code: "CCM_MODEL_RETRY_EXHAUSTED" },
  ));
  const providerCold = classifyGroupOrchestratorFailure(new Error("HTTP 503"));
  const checks = {
    workflowKeepsContract: workflow.kind === "workflow_contract",
    payloadIsContextAfterTools: payload.kind === "context" && /只读检查已完成/.test(payload.userSummary),
    providerAfterToolsDoesNotSayUnavailable: providerAfterTools.kind === "empty_reply"
      && /只读检查已完成/.test(providerAfterTools.userSummary)
      && !/大模型暂时不可用/.test(providerAfterTools.userSummary),
    emptyReplyIsNotUnavailable: emptyReply.kind === "empty_reply"
      && /没有给出可用回复/.test(emptyReply.userSummary)
      && !/大模型暂时不可用/.test(emptyReply.userSummary)
      && !/请检查模型配置/.test(emptyReply.userGuidance),
    coldProviderStillUnavailable: providerCold.kind === "provider" && /大模型暂时不可用/.test(providerCold.userSummary),
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
