import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(file), "..");
const resultPrefix = "PHASE326_RESULT=";

function modules() {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  return {
    compact: require(dist("modules", "collaboration", "group-memory-compaction.js")),
    memory: require(dist("modules", "collaboration", "memory.js")),
    storage: require(dist("modules", "collaboration", "storage.js")),
    center: require(dist("modules", "knowledge", "memory-control-center.js")),
    handoff: require(dist("agents", "worker-handoff.js")),
    toolManager: require(dist("tools", "tool-manager.js")).toolManager,
    db: require(dist("core", "db.js")),
  };
}

const toolNames = {
  alpha: "mcp__ccm__alpha__read_project",
  beta: "mcp__ccm__beta__write_patch",
  gamma: "mcp__ccm__gamma__verify_build",
  revoked: "mcp__ccm__revoked__old_tool",
};

function catalog(includeBeta = true) {
  return {
    tools: [
      { name: toolNames.alpha, line: "read_project (alpha): inspect the current project" },
      ...(includeBeta ? [{ name: toolNames.beta, line: "write_patch (beta): apply an authorized patch" }] : []),
      { name: toolNames.gamma, line: "verify_build (gamma): run the required verification" },
    ],
    skills: [],
    agents: [{ name: "phase326-api", line: "phase326-api (claudecode): implementation" }],
    mcpInstructions: [],
  };
}

function messages(groupSessionId, suffix) {
  return [
    {
      id: `phase326-boundary-${suffix}`,
      group_session_id: groupSessionId,
      role: "system",
      content: "Imported compact boundary metadata",
      compactMetadata: { preCompactDiscoveredTools: [toolNames.revoked] },
    },
    {
      id: `phase326-reference-${suffix}`,
      group_session_id: groupSessionId,
      role: "user",
      target: "group-main",
      content: [{
        type: "tool_result",
        tool_use_id: "search-1",
        content: [{ type: "tool_reference", tool_name: toolNames.alpha }],
      }],
    },
    {
      id: `phase326-use-${suffix}`,
      group_session_id: groupSessionId,
      role: "assistant",
      agent: "group-main",
      content: [{ type: "tool_use", id: "tool-2", name: toolNames.beta, input: {} }],
    },
    {
      id: `phase326-call-${suffix}`,
      group_session_id: groupSessionId,
      role: "assistant",
      agent: "group-main",
      content: "Run build verification",
      tool_calls: [{ id: "tool-3", function: { name: toolNames.gamma, arguments: "{}" } }],
    },
    {
      id: `phase326-built-in-${suffix}`,
      group_session_id: groupSessionId,
      role: "assistant",
      agent: "group-main",
      content: [{ type: "tool_use", id: "tool-4", name: "Read", input: { file_path: "README.md" } }],
    },
    ...Array.from({ length: 12 }, (_, index) => ({
      id: `phase326-message-${suffix}-${index}`,
      group_session_id: groupSessionId,
      role: index % 2 ? "assistant" : "user",
      agent: index % 2 ? "group-main" : undefined,
      target: index % 2 ? undefined : "group-main",
      content: `PHASE326_${suffix}_RAW_${index} ${"context ".repeat(30)}`,
    })),
  ];
}

function directChecks(compact, groupId, groupSessionId, siblingSessionId) {
  const sourceMessages = messages(groupSessionId, "DIRECT");
  const full = compact.buildGroupPostCompactDynamicContextDeltaProjection(catalog(true), {
    groupId,
    groupSessionId,
    scanMode: "full",
    sourceMessages,
    now: "2026-07-15T12:00:00.000Z",
  });
  const partial = compact.buildGroupPostCompactDynamicContextDeltaProjection(catalog(false), {
    groupId,
    groupSessionId,
    scanMode: "partial",
    sourceMessages,
    priorAttachments: [full.attachment],
    now: "2026-07-15T12:05:00.000Z",
  });
  const extracted = compact.extractGroupPreCompactLoadedToolNames(sourceMessages);
  const tamperedState = {
    ...full.receipt,
    loaded_tool_state: {
      ...full.receipt.loaded_tool_state,
      carried_names: [...full.receipt.loaded_tool_state.carried_names, "mcp__ccm__tampered__tool"],
    },
  };
  const receiptJson = JSON.stringify(full.receipt);
  const loaded = full.receipt.loaded_tool_state;
  return {
    full,
    partial,
    checks: {
      extractsToolReference: extracted.includes(toolNames.alpha),
      extractsToolUse: extracted.includes(toolNames.beta),
      extractsExplicitToolCall: extracted.includes(toolNames.gamma),
      readsPriorBoundaryCarry: extracted.includes(toolNames.revoked),
      carriesOnlyCurrentAuthorizedTools: loaded.carried_names.join(",") === [toolNames.alpha, toolNames.beta, toolNames.gamma].sort().join(","),
      dropsRevokedTool: loaded.dropped_names.includes(toolNames.revoked) && !loaded.carried_names.includes(toolNames.revoked),
      ignoresBuiltInToolForDynamicCarry: !loaded.carried_names.includes("Read") && !loaded.dropped_names.includes("Read"),
      fullBoundaryBodyRestoresLoadedState: full.attachment.body.includes("Tools loaded before compact and still authorized")
        && full.attachment.body.includes(toolNames.alpha),
      revokedToolExplicitlyWithdrawn: full.attachment.body.includes(`${toolNames.revoked} was observed before compaction`)
        && full.attachment.body.includes("Do not call it"),
      receiptIsBodyFree: full.receipt.body_free === true
        && !receiptJson.includes("inspect the current project")
        && !receiptJson.includes("apply an authorized patch"),
      receiptValid: compact.verifyGroupPostCompactDynamicContextDeltaReceipt(full.receipt, {
        groupId, groupSessionId, attachment: full.attachment,
      }).valid === true,
      loadedStateTamperRejected: compact.verifyGroupPostCompactDynamicContextDeltaReceipt(tamperedState).valid === false,
      siblingSessionRejected: compact.verifyGroupPostCompactDynamicContextDeltaReceipt(full.receipt, {
        groupId, groupSessionId: siblingSessionId,
      }).valid === false,
      partialDropsAuthorizationShrink: partial.receipt.loaded_tool_state.carried_names.includes(toolNames.alpha)
        && partial.receipt.loaded_tool_state.carried_names.includes(toolNames.gamma)
        && partial.receipt.loaded_tool_state.dropped_names.includes(toolNames.beta)
        && partial.attachment.deferredTools.removedNames.includes(toolNames.beta),
      stateChecksumPresent: /^[a-f0-9]{64}$/.test(loaded.state_checksum),
      manifestBindsLoadedState: full.receipt.attachment_manifest_checksum
        !== compact.buildGroupPostCompactDynamicContextDeltaProjection(catalog(true), {
          groupId,
          groupSessionId,
          scanMode: "full",
          sourceMessages: sourceMessages.filter(message => message.id !== "phase326-use-DIRECT"),
        }).receipt.attachment_manifest_checksum,
    },
  };
}

async function childCreate(fixtureFile) {
  const { compact, memory, storage, center, handoff, toolManager, db } = modules();
  const suffix = `${process.pid}_${Date.now().toString(36)}`;
  const groupId = `phase326-loaded-tools-${suffix}`;
  const groupSessionId = `gcs_phase326_${suffix}`;
  const siblingSessionId = `gcs_phase326_sibling_${suffix}`;
  storage.saveGroups([{
    id: groupId,
    name: "Phase326 loaded tool state",
    members: [
      { project: "coordinator", role: "coordinator", agent: "coded-orchestrator" },
      { project: "phase326-api", role: "implementation", agent: "claudecode" },
    ],
    tools: { mcp: ["alpha", "beta", "gamma"], skill: [] },
  }]);
  db.saveProjectConfigs([{ name: "phase326-api", path: root }]);
  const rawMessages = messages(groupSessionId, suffix);
  storage.saveGroupMessages(groupId, rawMessages, groupSessionId);
  storage.saveGroupMessages(groupId, messages(siblingSessionId, `SIBLING_${suffix}`), siblingSessionId);
  const originalTranscript = JSON.stringify(storage.getGroupMessages(groupId, groupSessionId));
  const direct = directChecks(compact, groupId, groupSessionId, siblingSessionId);
  const compacted = await compact.compactGroupConversationMemory({
    groupId,
    groupSessionId,
    messages: rawMessages,
    memory: { goal: "phase326 loaded tool continuity" },
    transcriptPath: storage.getGroupChatSessionMessagesFile(groupId, groupSessionId),
    force: true,
    config: {
      minKeepMessages: 2,
      minKeepTokens: 1,
      maxKeepTokens: 500,
      memoryCompactionUseModel: false,
      postCompactDynamicContextCatalog: catalog(true),
    },
  });
  memory.saveGroupMemory(groupId, compacted.memory, groupSessionId);
  memory.saveGroupMemory(groupId, { goal: "phase326 sibling" }, siblingSessionId);
  const originalCatalogBuilder = toolManager.getPostCompactDynamicToolCatalog.bind(toolManager);
  toolManager.getPostCompactDynamicToolCatalog = () => ({
    tools: catalog(true).tools,
    skills: [],
    mcpInstructions: [],
  });
  let childBundle;
  try {
    childBundle = memory.buildAgentMemoryContextBundle(groupId, "phase326-api", "Continue with loaded tools", {
      groupSessionId,
      taskAgentSessionId: "tas_phase326_create",
      nativeSessionId: "native_phase326_create",
      disableTypedMemorySelector: true,
    });
  } finally {
    toolManager.getPostCompactDynamicToolCatalog = originalCatalogBuilder;
  }
  const workerPrompt = handoff.renderSelfContainedWorkerHandoff({
    task: "Continue with loaded tools",
    worker_context_packet: { memory: childBundle },
    references: { memory_context: childBundle },
    scope: { allowed: [], forbidden: [], dependencies: [] },
    done_criteria: [], verification: {}, ack_gate: {},
  });
  const persisted = memory.loadGroupMemory(groupId, groupSessionId);
  const loaded = persisted.compaction?.postCompactReinject?.dynamicContextDeltaReceipt?.loaded_tool_state || {};
  const childLoaded = childBundle.dynamic_context_delta_receipt?.loaded_tool_state || {};
  const centerProjection = center.getMemoryCenterScope("group", `${groupId}::${groupSessionId}`).postCompactUsage?.postCompactDynamicContextDelta || {};
  const uiSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf8");
  const checks = {
    ...direct.checks,
    compactBoundaryCarriesLoadedTools: compacted.boundary?.compactMetadata?.preCompactDiscoveredTools?.includes(toolNames.alpha)
      && compacted.boundary.compactMetadata.preCompactDiscoveredTools.includes(toolNames.beta)
      && compacted.boundary.compactMetadata.preCompactDiscoveredTools.includes(toolNames.gamma),
    compactBoundaryRejectsRevokedTool: !compacted.boundary?.compactMetadata?.preCompactDiscoveredTools?.includes(toolNames.revoked),
    compactionStateCarriesLoadedTools: loaded.carried_count === 3 && loaded.dropped_names.includes(toolNames.revoked),
    restoreMetadataCarriesLoadedTools: compacted.boundary?.post_compact_restore?.preCompactDiscoveredTools?.length === 3,
    newChildSessionCarriesLoadedTools: childLoaded.carried_count === 3 && childLoaded.carried_names.includes(toolNames.beta),
    newChildPromptCarriesLoadedTools: String(childBundle.dynamic_context_delta_text || "").includes("remains loaded across this compact boundary"),
    finalWorkerCarriesLoadedTools: workerPrompt.includes(toolNames.gamma) && workerPrompt.includes("remains loaded across this compact boundary"),
    exactSessionReceiptValid: compact.verifyGroupPostCompactDynamicContextDeltaReceipt(
      persisted.compaction.postCompactReinject.dynamicContextDeltaReceipt,
      {
        groupId,
        groupSessionId,
        attachment: persisted.compaction.postCompactReinject.dynamicContextDeltaAttachment,
      },
    ).valid === true,
    siblingSessionUnaffected: !memory.loadGroupMemory(groupId, siblingSessionId).compaction?.preCompactDiscoveredTools,
    rawTranscriptUntouched: JSON.stringify(storage.getGroupMessages(groupId, groupSessionId)) === originalTranscript,
    memoryCenterShowsLoadedState: centerProjection.receiptValid === true && centerProjection.receipt?.loaded_tool_state?.carried_count === 3,
    memoryCenterCardPresent: uiSource.includes("label: 'loaded tools'") && uiSource.includes("pre-compact loaded tool schemas"),
  };
  fs.writeFileSync(fixtureFile, JSON.stringify({
    groupId, groupSessionId, siblingSessionId, originalTranscript,
    receiptChecksum: persisted.compaction.postCompactReinject.dynamicContextDeltaReceipt.receipt_checksum,
  }, null, 2));
  process.stdout.write(`${resultPrefix}${JSON.stringify(checks)}\n`);
}

function childRestart(fixtureFile) {
  const { compact, memory, storage, center, handoff, toolManager } = modules();
  const fixture = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
  const persisted = memory.loadGroupMemory(fixture.groupId, fixture.groupSessionId);
  const plan = persisted.compaction?.postCompactReinject || {};
  const originalCatalogBuilder = toolManager.getPostCompactDynamicToolCatalog.bind(toolManager);
  toolManager.getPostCompactDynamicToolCatalog = () => ({ tools: catalog(true).tools, skills: [], mcpInstructions: [] });
  let childBundle;
  try {
    childBundle = memory.buildAgentMemoryContextBundle(fixture.groupId, "phase326-api", "Resume loaded tool continuity", {
      groupSessionId: fixture.groupSessionId,
      taskAgentSessionId: "tas_phase326_restart",
      nativeSessionId: "native_phase326_restart",
      disableTypedMemorySelector: true,
    });
  } finally {
    toolManager.getPostCompactDynamicToolCatalog = originalCatalogBuilder;
  }
  const workerPrompt = handoff.renderSelfContainedWorkerHandoff({
    task: "Resume loaded tool continuity",
    worker_context_packet: { memory: childBundle },
    references: { memory_context: childBundle },
    scope: { allowed: [], forbidden: [], dependencies: [] },
    done_criteria: [], verification: {}, ack_gate: {},
  });
  const centerProjection = center.getMemoryCenterScope("group", `${fixture.groupId}::${fixture.groupSessionId}`).postCompactUsage?.postCompactDynamicContextDelta || {};
  const checks = {
    receiptSurvivesRestart: compact.verifyGroupPostCompactDynamicContextDeltaReceipt(plan.dynamicContextDeltaReceipt, {
      groupId: fixture.groupId,
      groupSessionId: fixture.groupSessionId,
      attachment: plan.dynamicContextDeltaAttachment,
    }).valid === true,
    loadedStateChecksumSurvivesRestart: plan.dynamicContextDeltaReceipt?.receipt_checksum === fixture.receiptChecksum
      && /^[a-f0-9]{64}$/.test(plan.dynamicContextDeltaReceipt?.loaded_tool_state?.state_checksum || ""),
    boundaryCarrySurvivesRestart: persisted.compactBoundary?.compactMetadata?.preCompactDiscoveredTools?.length === 3,
    freshChildSessionRestoresCarryAfterRestart: childBundle.dynamic_context_delta_receipt?.loaded_tool_state?.carried_count === 3,
    freshWorkerRestoresCarryAfterRestart: workerPrompt.includes(toolNames.alpha) && workerPrompt.includes(toolNames.gamma),
    memoryCenterSurvivesRestart: centerProjection.receiptValid === true && centerProjection.receipt?.loaded_tool_state?.carried_count === 3,
    rawStillUntouchedAfterRestart: JSON.stringify(storage.getGroupMessages(fixture.groupId, fixture.groupSessionId)) === fixture.originalTranscript,
    siblingStillIsolatedAfterRestart: !memory.loadGroupMemory(fixture.groupId, fixture.siblingSessionId).compaction?.preCompactDiscoveredTools,
  };
  process.stdout.write(`${resultPrefix}${JSON.stringify(checks)}\n`);
}

function runChild(mode, tempHome, fixtureFile) {
  const result = spawnSync(process.execPath, [file, mode, fixtureFile], {
    cwd: root,
    env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome },
    encoding: "utf8",
    timeout: 300000,
  });
  assert.equal(result.status, 0, `${mode} failed\nstdout=${result.stdout}\nstderr=${result.stderr}`);
  const line = String(result.stdout || "").split(/\r?\n/).find(row => row.startsWith(resultPrefix));
  assert.ok(line, `missing ${resultPrefix}: ${result.stdout}`);
  return JSON.parse(line.slice(resultPrefix.length));
}

const mode = process.argv[2] || "parent";
if (mode === "child-create") {
  await childCreate(process.argv[3]);
} else if (mode === "child-restart") {
  childRestart(process.argv[3]);
} else {
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase326-loaded-tools-"));
  const fixtureFile = path.join(tempHome, "phase326-fixture.json");
  try {
    const created = runChild("child-create", tempHome, fixtureFile);
    const restarted = runChild("child-restart", tempHome, fixtureFile);
    const checks = { ...created, ...restarted };
    assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
    process.stdout.write(`${JSON.stringify({
      pass: true,
      schema: "ccm-phase326-pre-compact-loaded-tool-state-restart-selftest-v1",
      count: Object.keys(checks).length,
      checks,
    }, null, 2)}\n`);
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
}
