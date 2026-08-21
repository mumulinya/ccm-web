import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const capacity = await import(pathToFileURL(path.join(root, "ccm-package", "dist", "system", "ccm-context-accounting-v2.js")).href);
const core = await import(pathToFileURL(path.join(root, "ccm-package", "dist", "system", "session-compaction-core.js")).href);

const totalContext = capacity.normalizeCcmContextCapacity({ provider: "anthropic", model: "verified", rawWindowTokens: 516_000, windowSemantics: "total_context", maxOutputTokens: 20_000, source: "provider_capability", confidence: 1 });
assert.equal(totalContext.effectiveInputWindowTokens, 496_000);
assert.equal(totalContext.autoCompactThresholdTokens, 483_000);

const maxInput = capacity.normalizeCcmContextCapacity({ provider: "openai", model: "responses", rawWindowTokens: 496_000, windowSemantics: "max_input", maxOutputTokens: 20_000, source: "provider_capability", confidence: 1 });
assert.equal(maxInput.effectiveInputWindowTokens, 496_000);
assert.equal(maxInput.reservedOutputTokens, 0);

const fallback = capacity.normalizeCcmContextCapacity({ provider: "unknown", model: "unknown" });
assert.equal(fallback.rawWindowTokens, 200_000);
assert.equal(fallback.effectiveInputWindowTokens, 180_000);

const payload = core.buildModelVisiblePayloadSnapshot({
  scope: "global",
  sessionId: "accounting-selftest",
  provider: "openai",
  model: "responses",
  protocol: "openai-responses",
  system: "system rules",
  tools: [{ type: "function", name: "read_file", description: "read" }],
  recentMessages: [
    { id: "u1", role: "user", content: "inspect" },
    { id: "tool1", role: "assistant", type: "tool_use", hidden_execution: true, content: "call read_file" },
    { id: "result1", role: "user", type: "tool_result", hidden_execution: true, content: "file contents" },
  ],
  activeSummary: { decisions: ["keep ledger"] },
});
assert.equal(payload.accountingSchema, "ccm-context-accounting-v2");
assert.equal(payload.schema, "ccm-model-visible-payload-snapshot-v2");
assert.equal(payload.exactSessionId, "accounting-selftest");
assert.equal(payload.tokenBreakdown.mcpResults, 0);
assert.equal(payload.primaryTokenBreakdown.conversation, payload.tokenBreakdown.recentMessages);
assert.equal(payload.primaryTokenBreakdown.mcpAndDynamicTools, payload.tokenBreakdown.tools + payload.tokenBreakdown.mcpTools);
assert.equal(payload.primaryTokenTotal, Object.values(payload.primaryTokenBreakdown).reduce((sum, value) => sum + value, 0));

const providerMeasurement = core.measureSessionContextTokens({
  scope: "global",
  sessionId: "accounting-selftest",
  provider: "openai",
  model: "responses",
  generation: 1,
  boundaryGeneration: 0,
  messages: [{ id: "u1", role: "user", content: "inspect" }],
  modelVisiblePayload: payload,
  latestProviderUsage: {
    scope: "global",
    sessionId: "accounting-selftest",
    provider: "openai",
    model: "responses",
    generation: 1,
    boundaryGeneration: 0,
    anchorMessageId: "u1",
    inputTokens: 1000,
    outputTokens: 5000,
    fixedContextChecksum: payload.fixedContextChecksum,
    estimatedPayloadTokens: payload.totalTokens,
  },
});
assert.equal(providerMeasurement.activeTokens, 1000);
assert.equal(providerMeasurement.outputTokens, 5000);

const exactMeasurement = core.measureSessionContextTokens({
  scope: "global",
  sessionId: "accounting-selftest",
  provider: "openai",
  model: "responses",
  generation: 1,
  boundaryGeneration: 0,
  messages: [{ id: "u1", role: "user", content: "inspect" }],
  modelVisiblePayload: payload,
  latestProviderUsage: {
    scope: "global",
    sessionId: "accounting-selftest",
    provider: "openai",
    model: "responses",
    generation: 1,
    boundaryGeneration: 0,
    inputTokens: 1000,
    outputTokens: 5000,
    payloadChecksum: payload.payloadChecksum,
    fixedContextChecksum: payload.fixedContextChecksum,
    estimatedContextTokens: payload.totalTokens,
    estimatedPayloadTokens: payload.totalTokens,
  },
});
assert.equal(exactMeasurement.precision, "exact");
assert.equal(exactMeasurement.measurementBasis, "exact_payload_usage");
assert.equal(exactMeasurement.totalModelVisibleTokens, 1000);

const staleMeasurement = core.measureSessionContextTokens({
  scope: "global",
  sessionId: "accounting-selftest",
  provider: "openai",
  model: "changed-model",
  generation: 1,
  boundaryGeneration: 0,
  messages: [{ id: "u1", role: "user", content: "inspect" }],
  modelVisiblePayload: payload,
  latestProviderUsage: {
    scope: "global",
    sessionId: "accounting-selftest",
    provider: "openai",
    model: "responses",
    generation: 1,
    boundaryGeneration: 0,
    inputTokens: 1000,
    fixedContextChecksum: payload.fixedContextChecksum,
    estimatedContextTokens: payload.totalTokens,
  },
});
assert.equal(staleMeasurement.precision, "estimated");
assert.equal(staleMeasurement.baselineValid, false);
console.log(JSON.stringify({ pass: true, checks: { capacity: true, maxInputNoDoubleReserve: true, toolResultsInConversation: true, outputExcludedFromContext: true } }));
