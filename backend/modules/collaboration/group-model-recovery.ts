const CONTINUE_PHRASE = /^(?:继续|接着(?:做|来|干)?|再试(?:一次)?|重试|continue|retry)\s*[。.!！]*$/i;
const RECOVERABLE_RUNTIME = new Set(["llm-error", "llm-not-configured"]);
const CLOSED_RECOVERY_STATES = new Set(["recovered", "cancelled"]);

export function isGroupModelRecoveryContinuePhrase(value: any) {
  return CONTINUE_PHRASE.test(String(value || "").replace(/\s+/g, " ").trim());
}

export function findUnrecoveredGroupModelFailure(messages: any[] = []) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const item = messages[index];
    const runtime = String(item?.runtime || "").toLowerCase();
    const recoveryState = String(item?.recovery?.state || "").toLowerCase();
    if (item?.role === "assistant" && RECOVERABLE_RUNTIME.has(runtime) && !CLOSED_RECOVERY_STATES.has(recoveryState)) {
      return { failure: item, index };
    }
    if (item?.role === "assistant" && String(item?.content || "").trim() && !RECOVERABLE_RUNTIME.has(runtime)) break;
  }
  return { failure: null, index: -1 };
}

export function groupModelRecoveryAnchorId(failure: any) {
  return String(
    failure?.execution_anchor_message_id
      || failure?.executionAnchorMessageId
      || failure?.recovery?.anchorMessageId
      || failure?.recovery?.anchor_message_id
      || failure?.id
      || "",
  ).trim();
}

export function resolveGroupModelRecovery(messages: any[] = [], input: any = {}) {
  const requestedId = String(input?.resumeMessageId || input?.resume_message_id || "").trim();
  const continuePhrase = isGroupModelRecoveryContinuePhrase(input?.message);
  if (!requestedId && !continuePhrase) return null;

  let failureIndex = requestedId
    ? messages.findIndex((item: any) => String(item?.id || item?.message_id || "") === requestedId)
    : -1;
  if (failureIndex < 0) {
    failureIndex = findUnrecoveredGroupModelFailure(messages).index;
  }
  if (failureIndex < 0) return null;
  const failure = messages[failureIndex];
  if (failure?.role !== "assistant" || !RECOVERABLE_RUNTIME.has(String(failure?.runtime || "").toLowerCase())) return null;
  if (CLOSED_RECOVERY_STATES.has(String(failure?.recovery?.state || "").toLowerCase())) return null;

  let originalUser: any = null;
  const originalUserId = String(failure?.recovery?.originalUserMessageId || failure?.recovery?.original_user_message_id || "");
  if (originalUserId) originalUser = messages.find((item: any) => String(item?.id || "") === originalUserId);
  if (!originalUser) {
    for (let index = failureIndex - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === "user") { originalUser = messages[index]; break; }
    }
  }
  if (!originalUser || !String(originalUser.content || "").trim()) return null;
  const anchorMessageId = groupModelRecoveryAnchorId(failure);
  if (!anchorMessageId) return null;
  return {
    failureMessageId: String(failure?.id || ""),
    anchorMessageId,
    originalUserMessageId: String(originalUser?.id || ""),
    originalMessage: String(originalUser.content || "").trim(),
    attempt: Math.max(2, Number(failure?.recovery?.attempt || 1) + 1),
  };
}

export function runGroupModelRecoverySelfTest() {
  const originalUser = { id: "u1", role: "user", content: "加智能推荐和预约排队" };
  const failure = {
    id: "a1",
    role: "assistant",
    runtime: "llm-error",
    execution_anchor_message_id: "u1",
    recovery: { state: "interrupted", originalUserMessageId: "u1", attempt: 1 },
    content: "大模型暂时不可用",
  };
  const messages = [originalUser, failure];
  const byId = resolveGroupModelRecovery(messages, { resumeMessageId: "a1" });
  const byContinue = resolveGroupModelRecovery(messages, { message: "继续" });
  const newRequest = resolveGroupModelRecovery(messages, { message: "改成只做推荐" });
  const recovered = resolveGroupModelRecovery(
    [originalUser, { ...failure, recovery: { ...failure.recovery, state: "recovered" } }],
    { message: "继续" },
  );
  const checks = {
    resumeButtonUsesOriginalTask: byId?.originalMessage === originalUser.content && byId?.anchorMessageId === "u1",
    typedContinueUsesOriginalTask: byContinue?.originalMessage === originalUser.content && byContinue?.anchorMessageId === "u1",
    newRequestDoesNotBindFailure: newRequest == null,
    recoveredFailureIsClosed: recovered == null,
    continuePhraseOnly: isGroupModelRecoveryContinuePhrase("继续")
      && isGroupModelRecoveryContinuePhrase("retry")
      && !isGroupModelRecoveryContinuePhrase("继续加一个功能"),
  };
  return { pass: Object.values(checks).every(Boolean), checks };
}
