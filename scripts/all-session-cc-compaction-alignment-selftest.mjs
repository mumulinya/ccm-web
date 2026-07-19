import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const core = await import("../ccm-package/dist/system/session-compaction-core.js");
const windowing = await import("../ccm-package/dist/system/session-memory-window.js");
const runtime = await import("../ccm-package/dist/agents/runtime-kernel.js");
const recovery = await import("../ccm-package/dist/system/session-recovery-context.js");

const usage = core.normalizeSessionProviderUsage({
  provider: "anthropic",
  model: "mock-model",
  inputTokens: 100,
  directInputTokens: 100,
  cacheCreationInputTokens: 20,
  cacheReadInputTokens: 30,
  outputTokens: 10,
  anchorMessageId: "m1",
  boundaryGeneration: 0,
});
assert.equal(core.providerObservedContextTokens(usage), 160, "directInputTokens must not double count inputTokens");

const messages = [
  { id: "m1", role: "assistant", content: "baseline" },
  { id: "m2", role: "user", content: "x".repeat(400) },
];
const anchored = core.measureSessionContextTokens({
  messages,
  latestProviderUsage: usage,
  provider: "anthropic",
  model: "mock-model",
  boundaryGeneration: 0,
});
assert.equal(anchored.baselineValid, true);
assert.equal(anchored.method, "latest_provider_usage_plus_new_message_estimate");
assert.ok(anchored.activeTokens > 160);

const stale = core.measureSessionContextTokens({
  messages,
  latestProviderUsage: usage,
  provider: "anthropic",
  model: "different-model",
  boundaryGeneration: 0,
});
assert.equal(stale.baselineValid, false);
assert.equal(stale.method, "model_visible_payload_estimate");
assert.ok(stale.baselineIssues.includes("usage_identity_stale"));

const summary = { primaryRequest: "keep authorization and unfinished work" };
const completePayload = core.buildModelVisiblePayloadSnapshot({
  scope: "project",
  sessionId: "payload-a",
  system: "system ".repeat(200),
  tools: [{ name: "read_file", schema: { path: "string" } }],
  activeSummary: summary,
  recentMessages: messages,
  currentRequest: { role: "user", content: "pending request ".repeat(80) },
  recoveryContext: { files: ["src/a.ts"], plan: "continue tests" },
  hookResults: [{ phase: "session_start", content: "restored hook context" }],
});
for (const key of ["system", "tools", "summary", "recentMessages", "currentRequest", "recoveryContext", "hookResults"]) {
  assert.ok(completePayload.tokenBreakdown[key] > 0, `${key} must be measured`);
}
const payloadUsage = core.normalizeSessionProviderUsage({
  scope: "project",
  sessionId: "payload-a",
  provider: "mock",
  model: "mock-200k",
  providerObservedContextTokens: 12_000,
  estimatedContextTokens: completePayload.totalTokens,
  estimatedPayloadTokens: completePayload.totalTokens,
  fixedContextChecksum: completePayload.fixedContextChecksum,
  boundaryGeneration: 2,
});
const payloadMeasured = core.measureSessionContextTokens({
  scope: "project",
  sessionId: "payload-a",
  provider: "mock",
  model: "mock-200k",
  boundaryGeneration: 2,
  latestProviderUsage: payloadUsage,
  modelVisiblePayload: completePayload,
});
assert.equal(payloadMeasured.baselineValid, true);
const changedFixedPayload = core.buildModelVisiblePayloadSnapshot({ ...completePayload, system: "changed system" });
const changedFixedMeasurement = core.measureSessionContextTokens({
  scope: "project",
  sessionId: "payload-a",
  provider: "mock",
  model: "mock-200k",
  boundaryGeneration: 2,
  latestProviderUsage: payloadUsage,
  modelVisiblePayload: changedFixedPayload,
});
assert.equal(changedFixedMeasurement.baselineValid, false);

const longMessages = [
  { id: "long-user", role: "user", content: "目标与约束 ".repeat(6000) },
  { id: "long-assistant", role: "assistant", content: "实现与验证 ".repeat(6000) },
];
const initialCadence = core.evaluateSessionMemoryCadence(longMessages, {});
assert.equal(initialCadence.shouldExtract, true);
assert.equal(initialCadence.reason, "initial_due");

const memoryState = core.buildSessionMemoryState({
  scope: "global",
  sessionId: "global-a",
  summary,
  cadence: initialCadence,
  provider: "mock",
  model: "mock-model",
});
assert.equal(core.validateSessionMemoryState(memoryState, {
  scope: "global",
  sessionId: "global-a",
  expectedLastMessageId: "long-assistant",
}).valid, true);
assert.equal(core.validateSessionMemoryState({ ...memoryState, summary: { primaryRequest: "tampered" } }, {
  scope: "global",
  sessionId: "global-a",
  expectedLastMessageId: "long-assistant",
}).valid, false);

const cursorMismatchCadence = core.evaluateSessionMemoryCadence(longMessages, {
  ...memoryState,
  lastExtractedMessageId: "missing-message",
});
assert.equal(cursorMismatchCadence.shouldExtract, false);
assert.equal(cursorMismatchCadence.reason, "cursor_mismatch");

const toolMessages = [
  ...longMessages,
  { id: "t1", role: "assistant", content: [{ type: "tool_use", name: "read" }] },
  { id: "t2", role: "user", content: [{ type: "tool_result", content: "ok" }] },
  { id: "t3", role: "assistant", content: [{ type: "tool_use", name: "test" }] },
];
const toolCadence = core.evaluateSessionMemoryCadence(toolMessages, memoryState);
assert.equal(toolCadence.shouldExtract, true);
assert.ok(toolCadence.toolCallsSinceLastExtraction >= 3);

const timedOut = await core.waitForSessionMemoryExtraction(new Promise(resolve => setTimeout(() => resolve("late"), 50)), 5);
assert.equal(timedOut.status, "timeout");

const gateReady = core.buildSessionPostCompactGate({ afterTokens: 99, threshold: 100 });
const gateBlocked = core.buildSessionPostCompactGate({ afterTokens: 100, threshold: 100 });
assert.equal(gateReady.providerCallAllowed, true);
assert.equal(gateBlocked.providerCallAllowed, false);
const hookOverflowPayload = core.buildModelVisiblePayloadSnapshot({
  scope: "global",
  sessionId: "hook-overflow",
  activeSummary: summary,
  recentMessages: messages,
  hookResults: [{ phase: "session_start", content: "h".repeat(20_000) }],
});
assert.equal(core.buildSessionPostCompactGate({ modelVisiblePayload: hookOverflowPayload, threshold: 1_000 }).providerCallAllowed, false);

let sessionA = core.normalizeSessionCompactionState({}, { scope: "project", sessionId: "a" });
let sessionB = core.normalizeSessionCompactionState({}, { scope: "project", sessionId: "b" });
for (let index = 0; index < 3; index += 1) sessionA = core.recordSessionCompactionFailure(sessionA, "mock failure");
assert.equal(core.sessionCompactionCircuitOpen(sessionA), true);
assert.equal(core.sessionCompactionCircuitOpen(sessionB), false);

const hookOrder = [];
const unregister = [
  core.registerSessionCompactionHook("pre_compact", () => hookOrder.push("pre_compact")),
  core.registerSessionCompactionHook("session_start", () => hookOrder.push("session_start")),
  core.registerSessionCompactionHook("post_compact", () => hookOrder.push("post_compact")),
];
await core.runSessionCompactionHooks("pre_compact", {});
await core.runSessionCompactionHooks("session_start", {});
await core.runSessionCompactionHooks("post_compact", {});
unregister.forEach(dispose => dispose());
assert.deepEqual(hookOrder, ["pre_compact", "session_start", "post_compact"]);

const recentWindow = windowing.calculateSessionMemoryKeepWindow(
  Array.from({ length: 60 }, (_, index) => ({ id: `r${index}`, role: index % 2 ? "assistant" : "user", content: "z".repeat(1200) })),
);
assert.ok(recentWindow.preservedTokenCount >= 10_000);
assert.ok(recentWindow.preservedTokenCount <= 40_000);
assert.ok(recentWindow.preservedTextMessageCount >= 5);

const invariantMessages = [
  { id: "u1", role: "user", content: "start" },
  { id: "a-tool", role: "assistant", response_id: "resp-1", content: [{ type: "tool_use", id: "tool-1", name: "read" }] },
  { id: "tool-result", role: "user", content: [{ type: "tool_result", tool_use_id: "tool-1", content: "ok" }] },
  { id: "a-tail-1", role: "assistant", response_id: "resp-2", content: "part one" },
  { id: "a-tail-2", role: "assistant", response_id: "resp-2", content: "part two" },
];
const adjustedStart = windowing.adjustSessionWindowForApiInvariants(invariantMessages, 2, 0);
assert.equal(adjustedStart, 0, "tool result must retain its tool use and complete user turn");
const assistantAdjusted = windowing.adjustSessionWindowForApiInvariants(invariantMessages, 4, 0);
assert.equal(assistantAdjusted, 0, "same assistant response expansion must re-close tool and user boundaries");

let ptlMessages = Array.from({ length: 8 }, (_, index) => ({
  id: `ptl-${index}`,
  role: index % 2 ? "assistant" : "user",
  content: `round ${Math.floor(index / 2)}`,
}));
for (let attempt = 0; attempt < 3; attempt += 1) {
  const peeled = windowing.peelOldestCompleteConversationRound(ptlMessages);
  assert.equal(peeled.peeled, true);
  ptlMessages = peeled.messages;
}
assert.deepEqual(ptlMessages.map(message => message.id), ["ptl-6", "ptl-7"]);

let extractionCommitted = null;
const scheduled = core.scheduleSessionMemoryExtraction({
  scope: "global",
  sessionId: "async-a",
  identity: { cursor: "m2", boundaryGeneration: 1 },
  extract: async () => ({ summary: "async model summary" }),
  commit: async (value, identity) => { extractionCommitted = { value, identity }; return { committed: true }; },
});
assert.equal(scheduled.scheduled, true);
assert.equal(core.inspectSessionMemoryExtraction("global", "async-a").inFlight, true);
assert.equal((await core.waitForScheduledSessionMemoryExtraction("global", "async-a", 1_000)).status, "ready");
assert.equal(extractionCommitted.identity.cursor, "m2");

const recoveryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-recovery-budget-"));
try {
  const fileReferences = [];
  for (let index = 0; index < 7; index += 1) {
    const file = path.join(recoveryRoot, `file-${index}.txt`);
    fs.writeFileSync(file, `file ${index}\n${"content ".repeat(8_000)}`);
    fileReferences.push(file);
  }
  const verifiedRecovery = recovery.buildVerifiedSessionRecoveryContext({
    rootDir: recoveryRoot,
    fileReferences,
    skills: [
      { name: "verified-skill", verified: true, content: "skill ".repeat(8_000) },
      { name: "unverified-skill", verified: false, content: "must not load" },
    ],
  });
  assert.equal(verifiedRecovery.files.length, 5);
  assert.ok(verifiedRecovery.files.every(file => file.tokens <= 5_000));
  assert.ok(verifiedRecovery.tokens.files <= 50_000);
  assert.deepEqual(verifiedRecovery.skills.map(skill => skill.name), ["verified-skill"]);
  assert.ok(verifiedRecovery.tokens.skills <= 25_000);
} finally {
  fs.rmSync(recoveryRoot, { recursive: true, force: true });
}

const localWorkerCompact = runtime.compactWorkerContextMemoryForRetry({
  schema: "ccm-group-memory-context-v1",
  session_continuity: { schema: "ccm-parent-session-continuity-v2", summary },
  oversized: "q".repeat(100_000),
});
assert.equal(localWorkerCompact.compacted, false);
assert.equal(localWorkerCompact.localCompactionDisabled, true);
assert.equal(localWorkerCompact.memory.session_continuity.summary, summary);

console.log(JSON.stringify({
  pass: true,
  checks: 51,
  providerObservedTokens: core.providerObservedContextTokens(usage),
  sessionMemoryCadence: {
    initial: initialCadence.reason,
    toolUpdate: toolCadence.reason,
    cursorMismatch: cursorMismatchCadence.reason,
  },
  exactSessionCircuitIsolation: true,
  localWorkerSummaryDisabled: true,
  paidProviderCalls: 0,
}, null, 2));
