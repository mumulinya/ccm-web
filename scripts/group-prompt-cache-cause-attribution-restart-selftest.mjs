import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase335-cache-attribution-"));
process.env.USERPROFILE = tempRoot;
process.env.HOME = tempRoot;

const require = createRequire(import.meta.url);
const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
const trackerPath = dist("modules", "collaboration", "group-prompt-cache-break-detection.js");
let tracker = require(trackerPath);
const client = require(dist("modules", "collaboration", "group-orchestrator-llm-client.js"));
const storage = require(dist("modules", "collaboration", "storage.js"));
const memory = require(dist("modules", "collaboration", "memory.js"));
const center = require(dist("modules", "knowledge", "memory-control-center.js"));

const nonce = `${process.pid}-${Date.now().toString(36)}`;
const groupId = `phase335-${nonce}`;
const sessionA = `gcs_phase335_a_${nonce}`;
const sessionB = `gcs_phase335_b_${nonce}`;
const sessionClient = `gcs_phase335_client_${nonce}`;
const sessionCompact = `gcs_phase335_compact_${nonce}`;
const sessionHaiku = `gcs_phase335_haiku_${nonce}`;
const secret = `PHASE335_PROMPT_BODY_MUST_NOT_PERSIST_${nonce}`;

function snapshotInput(groupSessionId, at, overrides = {}) {
  return {
    groupId,
    groupSessionId,
    source: "group_main_planning",
    provider: "anthropic",
    model: "claude-sonnet-phase335",
    system: [{ type: "text", text: `${secret} stable coordinator policy`, cache_control: { type: "ephemeral", ttl: "5m" } }],
    toolSchemas: [{ name: `mcp__private_${secret}`, description: secret, input_schema: { type: "object", properties: { path: { type: "string" } } } }],
    betaHeaders: ["context-management-2025-06-27"],
    extraBodyParams: { private: secret },
    at,
    ...overrides,
  };
}

function usage(groupSessionId, cacheReadInputTokens, at, source = "group_main_planning", model = "claude-sonnet-phase335") {
  return tracker.recordGroupPromptCacheUsage({
    groupId,
    groupSessionId,
    source,
    provider: "anthropic",
    model,
    usage: { directInputTokens: 100, cacheCreationInputTokens: 500, cacheReadInputTokens },
    at,
  });
}

function summaryShape() {
  return {
    primaryRequest: "Preserve exact-session memory behavior",
    userMessages: ["Continue memory parity"],
    keyConcepts: ["prompt cache attribution"],
    filesAndCode: ["group-prompt-cache-break-detection.ts"],
    errorsAndFixes: [],
    decisions: ["Keep body-free fingerprints"],
    completedWork: ["Prompt state captured"],
    pendingTasks: [],
    currentWork: "Verify compaction query source",
    nextStep: "Run regression",
    participantState: ["coordinator active"],
    taskStates: ["phase335 in progress"],
  };
}

const originalFetch = globalThis.fetch;
let fetchMode = "client";
let clientCall = 0;
try {
  const firstState = tracker.recordGroupPromptCacheState(snapshotInput(sessionA, "2026-07-15T16:00:00.000Z"));
  const firstUsage = usage(sessionA, 90_000, "2026-07-15T16:00:01.000Z");
  const sameState = tracker.recordGroupPromptCacheState(snapshotInput(sessionA, "2026-07-15T16:01:00.000Z"));
  const stableUsage = usage(sessionA, 88_000, "2026-07-15T16:01:01.000Z");

  const cachePolicyState = tracker.recordGroupPromptCacheState(snapshotInput(sessionA, "2026-07-15T16:02:00.000Z", {
    system: [{ type: "text", text: `${secret} stable coordinator policy`, cache_control: { type: "ephemeral", ttl: "1h" } }],
    toolSchemas: [{ name: `mcp__private_${secret}`, description: secret, input_schema: { type: "object", properties: { path: { type: "number" } } } }],
    betaHeaders: ["context-management-2025-06-27", "prompt-caching-scope-2026-01-05"],
  }));
  const clientChangedBreak = usage(sessionA, 60_000, "2026-07-15T16:02:01.000Z");

  const systemChangedState = tracker.recordGroupPromptCacheState(snapshotInput(sessionA, "2026-07-15T16:03:00.000Z", {
    system: [{ type: "text", text: `${secret} changed coordinator policy`, cache_control: { type: "ephemeral", ttl: "1h" } }],
    toolSchemas: [{ name: `mcp__private_${secret}`, description: secret, input_schema: { type: "object", properties: { path: { type: "number" } } } }],
    betaHeaders: ["context-management-2025-06-27", "prompt-caching-scope-2026-01-05"],
  }));
  const systemChangedBreak = usage(sessionA, 40_000, "2026-07-15T16:03:01.000Z");

  const unchanged = snapshotInput(sessionA, "2026-07-15T16:05:00.000Z", {
    system: [{ type: "text", text: `${secret} changed coordinator policy`, cache_control: { type: "ephemeral", ttl: "1h" } }],
    toolSchemas: [{ name: `mcp__private_${secret}`, description: secret, input_schema: { type: "object", properties: { path: { type: "number" } } } }],
    betaHeaders: ["context-management-2025-06-27", "prompt-caching-scope-2026-01-05"],
  });
  tracker.recordGroupPromptCacheState(unchanged);
  const serverSideBreak = usage(sessionA, 20_000, "2026-07-15T16:05:01.000Z");
  tracker.recordGroupPromptCacheState({ ...unchanged, at: "2026-07-15T16:11:02.000Z" });
  const fiveMinuteBreak = usage(sessionA, 10_000, "2026-07-15T16:11:03.000Z");
  tracker.recordGroupPromptCacheState({ ...unchanged, at: "2026-07-15T17:12:04.000Z" });
  const oneHourBreak = usage(sessionA, 3_000, "2026-07-15T17:12:05.000Z");

  tracker.recordGroupPromptCacheState(snapshotInput(sessionB, "2026-07-15T16:00:00.000Z", { system: "sibling public prompt", toolSchemas: [] }));
  usage(sessionB, 77_000, "2026-07-15T16:00:01.000Z");
  const sibling = tracker.readGroupPromptCacheBreakDetection(groupId, sessionB);

  tracker.recordGroupPromptCacheState(snapshotInput(sessionHaiku, "2026-07-15T16:00:00.000Z", { model: "claude-haiku-phase335", system: "haiku prompt", toolSchemas: [] }));
  const haikuUsage = usage(sessionHaiku, 40_000, "2026-07-15T16:00:01.000Z", "group_main_planning", "claude-haiku-phase335");

  globalThis.fetch = async (_url, init = {}) => {
    const body = JSON.parse(String(init.body || "{}"));
    if (fetchMode === "compact") {
      return {
        ok: true,
        status: 200,
        headers: { get: name => String(name || "").toLowerCase().includes("request-id") ? `req_compact_${nonce}` : "" },
        async text() {
          return JSON.stringify({
            id: `msg_compact_${nonce}`,
            model: "claude-sonnet-phase335",
            content: [{ type: "text", text: JSON.stringify(summaryShape()) }],
            usage: { input_tokens: 2_000, cache_creation_input_tokens: 100, cache_read_input_tokens: 30_000, output_tokens: 500 },
            stop_reason: "end_turn",
          });
        },
      };
    }
    clientCall += 1;
    return {
      ok: true,
      status: 200,
      headers: { get: name => String(name || "").toLowerCase().includes("request-id") ? `req_client_${clientCall}_${nonce}` : "" },
      async text() {
        return JSON.stringify({
          id: `msg_client_${clientCall}_${nonce}`,
          model: "claude-sonnet-phase335",
          content: [{ type: "text", text: `client ${clientCall}` }],
          usage: { input_tokens: 100, cache_creation_input_tokens: 100, cache_read_input_tokens: clientCall === 1 ? 80_000 : 30_000, output_tokens: 50 },
        });
      },
      requestBody: body,
    };
  };

  const clientOnUsage = usageValue => tracker.recordGroupPromptCacheUsage({
    groupId,
    groupSessionId: sessionClient,
    source: "group_main_planning",
    provider: "anthropic",
    model: "claude-sonnet-phase335",
    usage: usageValue,
  });
  await client.callAnthropicCompatibleChat({ apiUrl: "https://api.anthropic.com/v1", apiKey: "phase335-key", model: "claude-sonnet-phase335" }, {
    system: `${secret} client system A`,
    messages: [{ role: "user", content: "first" }],
    promptCacheTracking: { groupId, groupSessionId: sessionClient, source: "group_main_planning" },
    onUsage: clientOnUsage,
  });
  await client.callAnthropicCompatibleChat({ apiUrl: "https://api.anthropic.com/v1", apiKey: "phase335-key", model: "claude-sonnet-phase335" }, {
    system: `${secret} client system B`,
    messages: [{ role: "user", content: "second" }],
    promptCacheTracking: { groupId, groupSessionId: sessionClient, source: "group_main_planning" },
    onUsage: clientOnUsage,
  });
  const clientLedger = tracker.readGroupPromptCacheBreakDetection(groupId, sessionClient);

  fetchMode = "compact";
  const compactMessages = Array.from({ length: 130 }, (_, index) => ({
    id: `compact-${index}`,
    group_session_id: sessionCompact,
    role: index % 2 === 0 ? "user" : "assistant",
    timestamp: new Date(Date.UTC(2026, 6, 15, 15, 0, index)).toISOString(),
    content: index === 0 ? "Compact prompt attribution request" : `Phase 335 compact context ${index} ${"memory context ".repeat(60)}`,
  }));
  storage.saveGroupMessages(groupId, compactMessages, sessionCompact);
  const compacted = await memory.runGroupMemoryAutoCompactionNow(groupId, {
    sessionId: sessionCompact,
    force: true,
    rebuild: true,
    reason: "phase335-cause-attribution",
    config: {
      enabled: true,
      format: "anthropic-compatible",
      apiUrl: "https://api.anthropic.com/v1",
      apiKey: "phase335-key",
      model: "claude-sonnet-phase335",
      memoryCompactionUseModel: true,
      minKeepMessages: 5,
      minKeepTokens: 1,
    },
  });
  const compactLedger = tracker.readGroupPromptCacheBreakDetection(groupId, sessionCompact);
  const compactUsageEvent = (compactLedger.recent_events || []).find(event => event.source === "group_main_compact");

  const storedA = memory.createEmptyGroupMemory(groupId, sessionA);
  memory.saveGroupMemory(groupId, storedA, sessionA);
  const packet = memory.buildAgentMemoryPacket(groupId, "api", "inspect cache cause", { groupSessionId: sessionA });
  const detail = center.getMemoryCenterScope("group", `${groupId}::${sessionA}`);
  const centerCache = detail.postCompactUsage?.promptCacheBreakDetection || {};

  const beforeRestart = tracker.readGroupPromptCacheBreakDetection(groupId, sessionA);
  const serialized = fs.readFileSync(beforeRestart.file, "utf8");
  delete require.cache[require.resolve(trackerPath)];
  tracker = require(trackerPath);
  const restarted = tracker.readGroupPromptCacheBreakDetection(groupId, sessionA);

  const checks = {
    firstSnapshotIsExactSessionAndVerified: firstState.recorded === true
      && tracker.verifyGroupPromptCacheStateSnapshot(firstState.snapshot, { groupId, groupSessionId: sessionA }).valid === true,
    bodyFreeSnapshotSanitizesMcpTools: firstState.snapshot.body_free === true
      && firstState.snapshot.tool_names?.[0] === "mcp",
    firstUsageInitializesBaseline: firstUsage.event?.classification === "baseline_initialized"
      && firstUsage.event?.cache_break === false,
    unchangedPromptProducesNoPendingCause: sameState.changes === null
      && stableUsage.event?.classification === "cache_stable",
    cachePolicyAndToolChangesAreSeparated: cachePolicyState.changes?.flags?.system_prompt_changed === false
      && cachePolicyState.changes?.flags?.cache_control_changed === true
      && cachePolicyState.changes?.flags?.tool_schemas_changed === true
      && cachePolicyState.changes?.flags?.betas_changed === true,
    clientPromptChangeExplainsBreak: clientChangedBreak.event?.cache_break_reason === "client_prompt_changed"
      && clientChangedBreak.event?.prompt_change_causes?.includes("cache_control_changed"),
    systemPromptChangeExplainsBreak: systemChangedState.changes?.flags?.system_prompt_changed === true
      && systemChangedBreak.event?.cache_break_reason === "client_prompt_changed",
    unchangedShortGapClassifiesServerSide: serverSideBreak.event?.cache_break_reason === "likely_server_side"
      && serverSideBreak.event?.prompt_changed === false,
    fiveMinuteGapClassifiesTtl: fiveMinuteBreak.event?.cache_break_reason === "possible_5min_ttl_expiry"
      && fiveMinuteBreak.event?.last_api_success_over_5min === true,
    oneHourGapClassifiesTtl: oneHourBreak.event?.cache_break_reason === "possible_1h_ttl_expiry"
      && oneHourBreak.event?.last_api_success_over_1h === true,
    haikuIsExcludedLikeClaudeCode: haikuUsage.event?.classification === "excluded_model"
      && haikuUsage.event?.cache_break === false,
    siblingSessionHasIndependentState: sibling.call_count === 1
      && sibling.prompt_state_call_count === 1
      && sibling.previous_cache_read_tokens === 77_000,
    realAdapterRecordsPreCallStateBeforeUsage: clientLedger.prompt_state_call_count === 2
      && clientLedger.last_event?.cache_break_reason === "client_prompt_changed"
      && clientLedger.last_event?.prompt_state_snapshot_id === clientLedger.prompt_state_baseline?.snapshot_id,
    compactModelSharesAttributionLifecycle: compacted.success === true
      && compacted.compacted === true
      && compactUsageEvent?.prompt_state_snapshot_id
      && compactLedger.prompt_state_call_count === 1,
    memoryCenterExposesCauseState: centerCache.checksum_valid === true
      && centerCache.prompt_state_call_count === 7
      && centerCache.last_event?.cache_break_reason === "possible_1h_ttl_expiry",
    childAgentPacketExposesAttribution: packet.includes("reason=possible_1h_ttl_expiry")
      && packet.includes("promptStates=7"),
    restartPreservesAttribution: restarted.prompt_state_call_count === 7
      && restarted.last_event?.cache_break_reason === "possible_1h_ttl_expiry"
      && restarted.prompt_state_baseline?.snapshot_checksum === beforeRestart.prompt_state_baseline?.snapshot_checksum,
    durableLedgerContainsNoPromptBodies: !serialized.includes(secret)
      && !serialized.includes("phase335-key")
      && !serialized.includes("private_"),
  };

  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, firstState, cachePolicyState, clientChangedBreak: clientChangedBreak.event, systemChangedBreak: systemChangedBreak.event, serverSideBreak: serverSideBreak.event, fiveMinuteBreak: fiveMinuteBreak.event, oneHourBreak: oneHourBreak.event, clientLedger, compacted, compactLedger, restarted }, null, 2));
  process.stdout.write(`PHASE335_RESULT=${JSON.stringify({ checks: Object.keys(checks).length, passed: Object.values(checks).filter(Boolean).length })}\n`);
} finally {
  globalThis.fetch = originalFetch;
  for (const sessionId of [sessionA, sessionB, sessionClient, sessionCompact, sessionHaiku]) {
    try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionId); } catch {}
  }
  try { fs.rmSync(tempRoot, { recursive: true, force: true }); } catch {}
}
