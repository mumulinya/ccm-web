import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const marker = "CCM_MEMORY_CORE=";

if (process.argv[2] === "child") {
  const require = createRequire(import.meta.url);
  const dist = (...parts) => path.join(root, "ccm-package", "dist", ...parts);
  const memory = require(dist("modules", "collaboration", "memory.js"));
  const center = require(dist("modules", "knowledge", "memory-control-center.js"));
  const extraction = require(dist("modules", "collaboration", "group-session-memory-model-extraction.js"));
  const nonce = `${process.pid}-${Date.now().toString(36)}`;
  const groupId = `memory-core-${nonce}`;
  const sessionA = `gcs_memory_a_${nonce}`;
  const sessionB = `gcs_memory_b_${nonce}`;
  const scopeA = `${groupId}::${sessionA}`;
  const scopeB = `${groupId}::${sessionB}`;
  const typedScopeA = `${groupId}--${sessionA}`;
  const typedScopeB = `${groupId}--${sessionB}`;

  try {
    const rowA = memory.createEmptyGroupMemory(groupId, sessionA);
    rowA.persistentRequirements = [{ text: "MEMORY_CORE_A_ONLY", source: { sessionId: sessionA } }];
    memory.saveGroupMemory(groupId, rowA, sessionA);
    const rowB = memory.createEmptyGroupMemory(groupId, sessionB);
    rowB.persistentRequirements = [{ text: "MEMORY_CORE_B_ONLY", source: { sessionId: sessionB } }];
    memory.saveGroupMemory(groupId, rowB, sessionB);

    extraction.saveGroupSessionMemoryCustomPrompt(typedScopeA, "Keep MEMORY_CORE_A_PROMPT.");
    extraction.saveGroupSessionMemoryCustomPrompt(typedScopeB, "Keep MEMORY_CORE_B_PROMPT.");
    const templateA = "# Current State\n_Active work._\n\n# Constraints\n_User constraints._";
    extraction.saveGroupSessionMemoryCustomTemplate(typedScopeA, templateA);

    const detailA = center.getMemoryCenterScope("group", scopeA);
    const detailB = center.getMemoryCenterScope("group", scopeB);
    const overview = center.buildMemoryCenterOverview();
    const bundleA = memory.buildAgentMemoryContextBundle(groupId, "api", "continue A", { groupSessionId: sessionA, includeGlobalClaudeMemory: false });
    const bundleB = memory.buildAgentMemoryContextBundle(groupId, "web", "continue B", { groupSessionId: sessionB, includeGlobalClaudeMemory: false });
    const promptA = extraction.readGroupSessionMemoryCustomPromptProfile(typedScopeA);
    const promptB = extraction.readGroupSessionMemoryCustomPromptProfile(typedScopeB);
    const templateProfileA = extraction.readGroupSessionMemoryCustomTemplateProfile(typedScopeA);
    const detailTextA = JSON.stringify(detailA.itemGroups || []);
    const detailTextB = JSON.stringify(detailB.itemGroups || []);

    const checks = {
      overviewListsBothExactSessions: overview.groups.some(row => row.id === scopeA) && overview.groups.some(row => row.id === scopeB),
      detailAIsExactSession: detailA.groupId === groupId && detailA.groupSessionId === sessionA,
      detailBIsExactSession: detailB.groupId === groupId && detailB.groupSessionId === sessionB,
      structuredMemoryDoesNotCross: detailTextA.includes("MEMORY_CORE_A_ONLY") && !detailTextA.includes("MEMORY_CORE_B_ONLY") && detailTextB.includes("MEMORY_CORE_B_ONLY") && !detailTextB.includes("MEMORY_CORE_A_ONLY"),
      childContextDoesNotCross: String(bundleA.rendered_text).includes("MEMORY_CORE_A_ONLY") && !String(bundleA.rendered_text).includes("MEMORY_CORE_B_ONLY") && String(bundleB.rendered_text).includes("MEMORY_CORE_B_ONLY") && !String(bundleB.rendered_text).includes("MEMORY_CORE_A_ONLY"),
      promptsAreExactSessionBound: promptA.content.includes("MEMORY_CORE_A_PROMPT") && !promptA.content.includes("MEMORY_CORE_B_PROMPT") && promptB.content.includes("MEMORY_CORE_B_PROMPT") && !promptB.content.includes("MEMORY_CORE_A_PROMPT"),
      templateIsExactSessionBound: templateProfileA.content === templateA && templateProfileA.scopeId === typedScopeA,
      overviewHasNoDiagnosticPayloads: !Object.keys(overview).some(key => /repair|replay|diagnostic|endurance|approval/i.test(key)),
    };
    assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, promptA, promptB, templateProfileA }, null, 2));
    process.stdout.write(`${marker}${JSON.stringify({ pass: true, checks })}\n`);
  } finally {
    try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionA); } catch {}
    try { memory.deleteGroupSessionMemoryArtifacts(groupId, sessionB); } catch {}
  }
  process.exit(0);
}

const home = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-memory-core-"));
try {
  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), "child"], {
    cwd: root,
    env: { ...process.env, HOME: home, USERPROFILE: home },
    encoding: "utf8",
    timeout: 120_000,
  });
  assert.equal(child.status, 0, `${child.stdout}\n${child.stderr}`);
  const line = String(child.stdout || "").split(/\r?\n/).find(row => row.startsWith(marker));
  assert.ok(line, child.stdout);
  const result = JSON.parse(line.slice(marker.length));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} finally {
  fs.rmSync(home, { recursive: true, force: true });
}
