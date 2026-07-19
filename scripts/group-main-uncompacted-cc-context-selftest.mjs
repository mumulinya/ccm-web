import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contextModule = await import(pathToFileURL(path.join(root, "ccm-package/dist/modules/collaboration/group-session-model-context.js")).href);
const routingModule = await import(pathToFileURL(path.join(root, "ccm-package/dist/modules/collaboration/group-orchestrator-routing.js")).href);
const { buildExactGroupSessionModelContextProjection, prepareExactGroupSessionRenderedPayload } = contextModule;
const { prepareExactGroupMainAgentInput } = routingModule;

let checks = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  checks += 1;
};

const group = {
  id: "group-main-cc",
  name: "CC main context",
  orchestrator: { enabled: true, coordinator_project: "coordinator" },
  members: [
    { project: "coordinator", role: "coordinator" },
    { project: "api", role: "member" },
  ],
};
const sessionId = "gcs_group_main_cc";
const config = {
  model: "group-main-test-model",
  format: "openai",
  modelContextWindow: 64_000,
  modelMaxOutputTokens: 20_000,
  memoryCompactionUseModel: true,
  memoryCompactionMode: "model-required",
};
const baseInput = {
  group,
  groupSessionId: sessionId,
  source: "user",
  message: "CURRENT_USER_REQUEST",
  sharedFilesContext: "SHARED_FILE_CONTEXT",
};

const smallMessages = Array.from({ length: 16 }, (_, index) => ({
  id: `small-${index}`,
  role: index % 2 === 0 ? "user" : "assistant",
  agent: index % 2 === 0 ? "user" : "coordinator",
  content: index === 0 ? "OLDEST_RAW_SENTINEL" : `small-message-${index}`,
}));
const smallProjection = buildExactGroupSessionModelContextProjection(smallMessages, {}, {
  groupId: group.id,
  groupSessionId: sessionId,
});
let compactCalls = 0;
const under = await prepareExactGroupMainAgentInput(baseInput, group, sessionId, config, {
  buildProjection: () => smallProjection,
  runCompaction: async () => { compactCalls += 1; return { success: true, compacted: false, reason: "below_threshold" }; },
});
check(under.compacted === false, "an under-threshold group session must not compact");
check(compactCalls === 1, "every group-main turn must run the usage-aware automatic compaction preflight");
check(under.input.context.includes("OLDEST_RAW_SENTINEL"), "the group main model must receive the oldest raw message before compaction");
check(under.input.context.includes("small-message-15"), "the group main model must receive the newest raw message before compaction");
check(under.projection.visibleMessageCount === smallMessages.length, "all uncompressed messages must remain visible");

const largeMessages = Array.from({ length: 30 }, (_, index) => ({
  id: `large-${index}`,
  role: index % 2 === 0 ? "user" : "assistant",
  agent: index % 2 === 0 ? "user" : "coordinator",
  content: `large-message-${index}:${"x".repeat(8_000)}`,
}));
const largeProjection = buildExactGroupSessionModelContextProjection(largeMessages, {}, {
  groupId: group.id,
  groupSessionId: sessionId,
});
const compactedProjection = buildExactGroupSessionModelContextProjection(largeMessages, {
  conversationSummary: { summary: "FORMAL_GROUP_MAIN_SUMMARY", decisions: ["preserve current request"] },
  compaction: {
    summarySource: "model",
    summaryChecksum: "summary-checksum",
    lastCompactedIndex: 24,
    lastCompactedMessageId: "large-24",
    boundaryGeneration: 1,
  },
  compactBoundary: { summarizedThroughMessageId: "large-24", generation: 1 },
  sessionMemory: { lastSummarizedMessageId: "large-24" },
}, { groupId: group.id, groupSessionId: sessionId });
let projectionGeneration = 0;
let compactOptions = null;
const over = await prepareExactGroupMainAgentInput(baseInput, group, sessionId, config, {
  buildProjection: () => projectionGeneration++ === 0 ? largeProjection : compactedProjection,
  runCompaction: async (_groupId, options) => {
    compactCalls += 1;
    compactOptions = options;
    return { success: true, compacted: true, boundary: { id: "boundary-1" } };
  },
});
check(over.compacted === true, "an oversized full group payload must compact before the Provider call");
check(compactOptions?.force !== true, "proactive group-main compaction must respect the automatic circuit breaker");
check(compactOptions?.config?.memoryCompactionMode === "model-required", "group-main canonical compaction must require a model summary");
check(over.input.context.includes("FORMAL_GROUP_MAIN_SUMMARY"), "the same turn must rebuild from the committed formal summary");
check(!over.input.context.includes("large-message-0"), "raw messages before the compact boundary must not be re-injected");
check(over.input.context.includes("large-message-25"), "dynamic recent complete raw messages must remain after compaction");
check(over.measurement.tokens < over.threshold, "the rebuilt full model payload must pass the post-compact gate");

projectionGeneration = 0;
let renderedBuilds = 0;
const directPayload = await prepareExactGroupSessionRenderedPayload({
  groupId: group.id,
  groupSessionId: sessionId,
  modelCapacity: { contextWindow: 64_000, reservedOutputTokens: 20_000, autoCompactBufferTokens: 13_000 },
  buildProjection: () => projectionGeneration++ === 0 ? largeProjection : compactedProjection,
  runCompaction: async () => ({ success: true, compacted: true, boundary: { id: "direct-boundary" } }),
  renderPayload: async projection => {
    renderedBuilds += 1;
    return `DIRECT_SYSTEM_AND_TOOLS\n${projection.rendered}\nCURRENT_USER_REQUEST`;
  },
});
check(directPayload.compacted === true, "direct group member payloads must use the same formal compaction transaction");
check(renderedBuilds === 2, "direct member memory and final prompt must rebuild after compact commit");
check(directPayload.payload.includes("FORMAL_GROUP_MAIN_SUMMARY"), "direct members must receive the committed canonical group summary");
check(directPayload.tokens < directPayload.threshold, "direct member post-compact payload must pass its own model capacity gate");

await assert.rejects(
  () => prepareExactGroupMainAgentInput(baseInput, group, sessionId, config, {
    buildProjection: () => largeProjection,
    runCompaction: async () => ({ success: false, compacted: false, reason: "mock_model_failure" }),
  }),
  /GROUP_MAIN_FORMAL_COMPACTION_FAILED:mock_model_failure/,
);
checks += 1;

const liveRoutesSource = fs.readFileSync(path.join(root, "backend/modules/collaboration/group-live-routes-part-02-part-02.ts"), "utf8");
const taskExecutorSource = fs.readFileSync(path.join(root, "backend/modules/collaboration/collaboration-task-executor.ts"), "utf8");
const routingSource = fs.readFileSync(path.join(root, "backend/modules/collaboration/group-orchestrator-routing.ts"), "utf8");
check(!liveRoutesSource.includes("buildGroupContextPacket("), "live group model routes must not use fixed-count context packets");
check(!taskExecutorSource.includes("buildGroupContextPacket("), "queued group tasks must not use fixed-count context packets");
check((liveRoutesSource.match(/buildExactGroupSessionModelContextPacket\(/g) || []).length >= 2, "group-main live routes must use exact session continuity before central preflight");
check((liveRoutesSource.match(/prepareExactGroupSessionRenderedPayload\(/g) || []).length >= 3, "all direct and broadcast member Provider paths must use full rendered-payload gates");
check(routingSource.includes("prepareExactGroupMainAgentInput"), "the group-main Provider boundary must own exact payload preflight");
check(!routingSource.includes("buildReactiveCompactionContext(enrichedInput.context"), "Provider PTL recovery must not use the legacy character projection");
check(routingSource.includes("group_main_provider_prompt_too_long"), "Provider PTL must retry through formal model compaction");

console.log(`group main uncompacted CC context selftest passed (${checks} checks)`);
