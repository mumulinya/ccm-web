import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(file), "..");
const resultPrefix = "PHASE325_RESULT=";

function modules() {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  return {
    compact: require(dist("modules", "collaboration", "group-memory-compaction.js")),
    memory: require(dist("modules", "collaboration", "memory.js")),
    storage: require(dist("modules", "collaboration", "storage.js")),
    center: require(dist("modules", "knowledge", "memory-control-center.js")),
    handoff: require(dist("agents", "worker-handoff.js")),
    db: require(dist("core", "db.js")),
  };
}

function catalogA(suffix) {
  return {
    tools: [
      { name: "tool:alpha", line: `alpha: ALPHA_${suffix}_DESCRIPTION` },
      { name: "tool:beta", line: `beta: BETA_${suffix}_DESCRIPTION` },
    ],
    skills: [{ name: "skill:review", line: `skill:review: REVIEW_${suffix}_DESCRIPTION` }],
    agents: [
      { name: "api", line: `api (claudecode): API_${suffix}_AGENT` },
      { name: "web", line: `web (cursor): WEB_${suffix}_AGENT` },
    ],
    mcpInstructions: [{ name: "docs", block: `## docs\nDOCS_${suffix}_INSTRUCTIONS` }],
  };
}

function catalogB(suffix) {
  return {
    tools: [
      { name: "tool:alpha", line: `alpha: ALPHA_${suffix}_CHANGED_DESCRIPTION` },
      { name: "tool:gamma", line: `gamma: GAMMA_${suffix}_DESCRIPTION` },
    ],
    skills: [{ name: "skill:review", line: `skill:review: REVIEW_${suffix}_DESCRIPTION` }],
    agents: [
      { name: "api", line: `api (claudecode): API_${suffix}_AGENT` },
      { name: "qa", line: `qa (codex): QA_${suffix}_AGENT` },
    ],
    mcpInstructions: [{ name: "browser", block: `## browser\nBROWSER_${suffix}_INSTRUCTIONS` }],
  };
}

function directChecks(compact, memory, handoff, groupId, groupSessionId, siblingSessionId, suffix) {
  const full = compact.buildGroupPostCompactDynamicContextDeltaProjection(catalogA(suffix), {
    groupId,
    groupSessionId,
    scanMode: "full",
    now: "2026-07-15T10:00:00.000Z",
  });
  const partial = compact.buildGroupPostCompactDynamicContextDeltaProjection(catalogB(suffix), {
    groupId,
    groupSessionId,
    scanMode: "partial",
    priorAttachments: [full.attachment],
    now: "2026-07-15T10:05:00.000Z",
  });
  const noChange = compact.buildGroupPostCompactDynamicContextDeltaProjection(catalogB(suffix), {
    groupId,
    groupSessionId,
    scanMode: "partial",
    priorAttachments: [full.attachment, partial.attachment],
    now: "2026-07-15T10:10:00.000Z",
  });
  const fullAgain = compact.buildGroupPostCompactDynamicContextDeltaProjection(catalogB(suffix), {
    groupId,
    groupSessionId,
    scanMode: "full",
  });
  const integrated = compact.buildPostCompactReinjectionPlan([], {}, {
    groupId,
    groupSessionId,
    dynamicContextCatalog: catalogA(suffix),
    dynamicContextScanMode: "full",
  });
  const hugeHead = `PHASE325_HUGE_HEAD_${suffix}`;
  const hugeTail = `PHASE325_HUGE_TAIL_${suffix}`;
  const huge = compact.buildGroupPostCompactDynamicContextDeltaProjection({
    mcpInstructions: [{ name: "huge", block: `## huge\n${hugeHead}\n${"large instructions ".repeat(120000)}\n${hugeTail}` }],
  }, { groupId, groupSessionId, scanMode: "full" });
  const rendered = memory.renderGroupPostCompactDynamicContextDelta(integrated);
  const memoryContext = memory.buildGroupMemoryContext({
    groupId,
    goal: "phase325 dynamic context",
    compaction: { postCompactReinject: integrated },
  });
  const workerPrompt = handoff.renderSelfContainedWorkerHandoff({
    task: "Use phase325 dynamic context",
    worker_context_packet: { memory: { schema: "ccm-group-memory-context-v1", dynamic_context_delta_text: rendered, rendered_text: "phase325 memory" } },
    references: { memory_context: { dynamic_context_delta_text: rendered, rendered_text: "phase325 memory" } },
    scope: { allowed: [], forbidden: [], dependencies: [] },
    done_criteria: [], verification: {}, ack_gate: {},
  });
  const tamperedReceipt = { ...full.receipt, scan_mode: "partial" };
  const tamperedBody = { ...full.attachment, body: `${full.attachment.body}\nTAMPERED` };
  const receiptJson = JSON.stringify(full.receipt);
  const checks = {
    fullCompactReannouncesCompleteToolSet: full.receipt.scan_mode === "full"
      && full.attachment.deferredTools.addedNames.length === 3
      && full.attachment.deferredTools.removedNames.length === 0,
    fullCompactReannouncesAgentsAndMcp: full.attachment.agentListing.addedNames.join(",") === "api,web"
      && full.attachment.mcpInstructions.addedNames.includes("docs"),
    partialAddsOnlyNewOrChangedTools: partial.attachment.deferredTools.addedNames.includes("tool:alpha")
      && partial.attachment.deferredTools.addedNames.includes("tool:gamma")
      && !partial.attachment.deferredTools.addedNames.includes("skill:review"),
    partialRecordsRemovedTool: partial.attachment.deferredTools.removedNames.includes("tool:beta")
      && partial.attachment.body.includes("tool:beta is no longer available"),
    partialDiffsAgentListing: partial.attachment.agentListing.addedNames.includes("qa")
      && partial.attachment.agentListing.removedNames.includes("web")
      && !partial.attachment.agentListing.addedNames.includes("api"),
    partialDiffsMcpInstructions: partial.attachment.mcpInstructions.addedNames.includes("browser")
      && partial.attachment.mcpInstructions.removedNames.includes("docs")
      && partial.attachment.body.includes(`BROWSER_${suffix}_INSTRUCTIONS`),
    preservedTailSuppressesDuplicateDelta: noChange.attachment === null && noChange.receipt.attachment_count === 0,
    fullIgnoresPriorAndReannouncesCurrent: fullAgain.attachment.deferredTools.addedNames.length === 3
      && fullAgain.attachment.agentListing.addedNames.length === 2
      && fullAgain.attachment.mcpInstructions.addedNames.length === 1,
    receiptValidAndBodyFree: compact.verifyGroupPostCompactDynamicContextDeltaReceipt(full.receipt, {
      groupId, groupSessionId, attachment: full.attachment,
    }).valid === true && full.receipt.body_free === true
      && !receiptJson.includes(`ALPHA_${suffix}_DESCRIPTION`)
      && !receiptJson.includes(`DOCS_${suffix}_INSTRUCTIONS`),
    receiptTamperRejected: compact.verifyGroupPostCompactDynamicContextDeltaReceipt(tamperedReceipt).valid === false,
    attachmentTamperRejected: compact.verifyGroupPostCompactDynamicContextDeltaReceipt(full.receipt, {
      groupId, groupSessionId, attachment: tamperedBody,
    }).valid === false,
    crossSessionRejected: compact.verifyGroupPostCompactDynamicContextDeltaReceipt(full.receipt, {
      groupId, groupSessionId: siblingSessionId,
    }).valid === false,
    crossGroupRejected: compact.verifyGroupPostCompactDynamicContextDeltaReceipt(full.receipt, {
      groupId: `${groupId}-other`, groupSessionId,
    }).valid === false,
    fixedAttachmentBudgetApplied: huge.receipt.max_attachment_tokens === 20000
      && huge.receipt.attachment_token_count <= 20000
      && huge.receipt.truncated === true
      && huge.attachment.body.includes(hugeHead)
      && huge.attachment.body.includes(hugeTail),
    reinjectionPlanCarriesDelta: !!(integrated.dynamicContextDeltaAttachment?.body?.includes(`ALPHA_${suffix}_DESCRIPTION`)
      && integrated.dynamicContextDeltaReceipt?.receipt_checksum),
    mainAgentRendererCarriesDelta: memoryContext.includes(`DOCS_${suffix}_INSTRUCTIONS`),
    workerPromptCarriesDelta: workerPrompt.includes(`DOCS_${suffix}_INSTRUCTIONS`),
  };
  return { full, partial, checks };
}

function messages(groupSessionId, suffix) {
  return Array.from({ length: 12 }, (_, index) => ({
    id: `phase325-message-${index}`,
    group_session_id: groupSessionId,
    role: index % 2 ? "assistant" : "user",
    agent: index % 2 ? "group-main" : undefined,
    target: index % 2 ? undefined : "group-main",
    content: `PHASE325_${suffix}_RAW_${index}`,
  }));
}

async function childCreate(fixtureFile) {
  const { compact, memory, storage, center, handoff, db } = modules();
  const suffix = `${process.pid}_${Date.now().toString(36)}`;
  const groupId = `phase325-dynamic-${suffix}`;
  const groupSessionId = `gcs_phase325_${suffix}`;
  const siblingSessionId = `gcs_phase325_sibling_${suffix}`;
  storage.saveGroups([{
    id: groupId,
    name: "Phase325 dynamic context",
    members: [
      { project: "coordinator", role: "coordinator", agent: "coded-orchestrator" },
      { project: "phase325-api", role: "implementation", agent: "claudecode" },
    ],
    tools: { mcp: [], skill: [] },
  }]);
  db.saveProjectConfigs([{ name: "phase325-api", path: root }]);
  const rawMessages = messages(groupSessionId, suffix);
  storage.saveGroupMessages(groupId, rawMessages, groupSessionId);
  storage.saveGroupMessages(groupId, messages(siblingSessionId, `SIBLING_${suffix}`), siblingSessionId);
  const originalTranscript = JSON.stringify(storage.getGroupMessages(groupId, groupSessionId));
  const direct = directChecks(compact, memory, handoff, groupId, groupSessionId, siblingSessionId, suffix);
  const partialCompacted = await compact.compactGroupConversationMemory({
    groupId,
    groupSessionId,
    messages: rawMessages,
    memory: {
      goal: "phase325 partial compact",
      compaction: { postCompactReinject: {
        schema: "ccm-post-compact-reinjection-v1",
        dynamicContextDeltaAttachment: direct.full.attachment,
        dynamicContextDeltaReceipt: direct.full.receipt,
      } },
    },
    transcriptPath: storage.getGroupChatSessionMessagesFile(groupId, groupSessionId),
    force: true,
    partialCompact: { direction: "range", fromIndex: 2, throughIndex: 6, reason: "phase325_partial_delta" },
    config: {
      minKeepMessages: 2,
      minKeepTokens: 1,
      maxKeepTokens: 500,
      memoryCompactionUseModel: false,
      postCompactDynamicContextCatalog: catalogB(suffix),
    },
  });
  const partialCompactionPlan = (partialCompacted.memory?.compaction?.partialSegments || []).at(-1)?.reinjectionPlan || {};
  memory.saveGroupMemory(groupId, {
    goal: "phase325 dynamic context restart",
    compaction: { postCompactReinject: {
      schema: "ccm-post-compact-reinjection-v1",
      version: 1,
      dynamicContextDeltaAttachment: direct.full.attachment,
      dynamicContextDeltaReceipt: direct.full.receipt,
    } },
  }, groupSessionId);
  memory.saveGroupMemory(groupId, { goal: "phase325 sibling" }, siblingSessionId);
  const persisted = memory.loadGroupMemory(groupId, groupSessionId);
  const mainPrompt = memory.buildGroupMemoryContext(persisted);
  const childBundle = memory.buildAgentMemoryContextBundle(groupId, "phase325-api", "Continue phase325", {
    groupSessionId,
    taskAgentSessionId: "tas_phase325_create",
    nativeSessionId: "native_phase325_create",
    disableTypedMemorySelector: true,
  });
  const workerPrompt = handoff.renderSelfContainedWorkerHandoff({
    task: "Continue phase325",
    worker_context_packet: { memory: childBundle },
    references: { memory_context: childBundle },
    scope: { allowed: [], forbidden: [], dependencies: [] },
    done_criteria: [], verification: {}, ack_gate: {},
  });
  const centerProjection = center.getMemoryCenterScope("group", `${groupId}::${groupSessionId}`).postCompactUsage?.postCompactDynamicContextDelta || {};
  const uiSource = fs.readFileSync(path.join(root, "frontend", "src", "components", "knowledge", "MemoryCenter.vue"), "utf8");
  const checks = {
    ...direct.checks,
    partialCompactPathUsesPreservedDelta: partialCompactionPlan.dynamicContextDeltaReceipt?.scan_mode === "partial"
      && partialCompactionPlan.dynamicContextDeltaAttachment?.deferredTools?.removedNames?.includes("tool:beta")
      && partialCompactionPlan.dynamicContextDeltaAttachment?.agentListing?.removedNames?.includes("web"),
    persistedExactSessionReceiptValid: compact.verifyGroupPostCompactDynamicContextDeltaReceipt(
      persisted.compaction.postCompactReinject.dynamicContextDeltaReceipt,
      { groupId, groupSessionId, attachment: persisted.compaction.postCompactReinject.dynamicContextDeltaAttachment },
    ).valid === true,
    groupMainPromptReceivesStoredDelta: mainPrompt.includes(`DOCS_${suffix}_INSTRUCTIONS`),
    newChildSessionReceivesLiveFullCatalog: String(childBundle.dynamic_context_delta_text || "").includes("phase325-api")
      && childBundle.dynamic_context_delta_receipt?.scan_mode === "full",
    finalWorkerPromptReceivesLiveCatalog: workerPrompt.includes("phase325-api"),
    siblingSessionUnaffected: !memory.loadGroupMemory(groupId, siblingSessionId).compaction?.postCompactReinject?.dynamicContextDeltaReceipt,
    rawTranscriptUntouched: JSON.stringify(storage.getGroupMessages(groupId, groupSessionId)) === originalTranscript,
    memoryCenterBodyFree: centerProjection.status === "applied" && centerProjection.receiptValid === true
      && centerProjection.receipt?.body_free === true && !JSON.stringify(centerProjection).includes(`DOCS_${suffix}_INSTRUCTIONS`),
    memoryCenterPanelPresent: uiSource.includes("Post-compact Dynamic Context Delta")
      && uiSource.includes("postCompactDynamicContextDeltaCards"),
  };
  fs.writeFileSync(fixtureFile, JSON.stringify({
    groupId, groupSessionId, siblingSessionId, suffix, originalTranscript,
    receipt: direct.full.receipt,
  }, null, 2));
  process.stdout.write(`${resultPrefix}${JSON.stringify(checks)}\n`);
}

function childRestart(fixtureFile) {
  const { compact, memory, storage, center, handoff } = modules();
  const fixture = JSON.parse(fs.readFileSync(fixtureFile, "utf8"));
  const persisted = memory.loadGroupMemory(fixture.groupId, fixture.groupSessionId);
  const plan = persisted.compaction?.postCompactReinject || {};
  const childBundle = memory.buildAgentMemoryContextBundle(fixture.groupId, "phase325-api", "Resume phase325", {
    groupSessionId: fixture.groupSessionId,
    taskAgentSessionId: "tas_phase325_restart",
    nativeSessionId: "native_phase325_restart",
    disableTypedMemorySelector: true,
  });
  const workerPrompt = handoff.renderSelfContainedWorkerHandoff({
    task: "Resume phase325",
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
    checksumsSurviveRestart: plan.dynamicContextDeltaReceipt?.receipt_checksum === fixture.receipt?.receipt_checksum
      && plan.dynamicContextDeltaReceipt?.attachment_manifest_checksum === fixture.receipt?.attachment_manifest_checksum,
    attachmentBodySurvivesRestart: plan.dynamicContextDeltaAttachment?.body?.includes(`DOCS_${fixture.suffix}_INSTRUCTIONS`),
    newChildSessionStillReceivesLiveCatalog: String(childBundle.dynamic_context_delta_text || "").includes("phase325-api"),
    workerPromptSurvivesRestart: workerPrompt.includes("phase325-api"),
    memoryCenterSurvivesRestart: centerProjection.status === "applied" && centerProjection.receiptValid === true,
    rawStillUntouchedAfterRestart: JSON.stringify(storage.getGroupMessages(fixture.groupId, fixture.groupSessionId)) === fixture.originalTranscript,
    siblingStillIsolatedAfterRestart: !memory.loadGroupMemory(fixture.groupId, fixture.siblingSessionId).compaction?.postCompactReinject?.dynamicContextDeltaReceipt,
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
  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-phase325-dynamic-context-"));
  const fixtureFile = path.join(tempHome, "phase325-fixture.json");
  try {
    const created = runChild("child-create", tempHome, fixtureFile);
    const restarted = runChild("child-restart", tempHome, fixtureFile);
    const checks = { ...created, ...restarted };
    assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2));
    process.stdout.write(`${JSON.stringify({ pass: true, schema: "ccm-phase325-post-compact-dynamic-context-delta-restart-selftest-v1", checks }, null, 2)}\n`);
  } finally {
    fs.rmSync(tempHome, { recursive: true, force: true });
  }
}
