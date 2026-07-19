import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptFile = fileURLToPath(import.meta.url);

if (process.argv.includes("--exact-session-child")) {
  const ccmDir = path.join(os.homedir(), ".cc-connect");
  const writeJson = (relative, value) => {
    const file = path.join(ccmDir, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(value, null, 2));
  };
  const state = (tokens, failures = 0) => ({
    summary_source: "model",
    v2: {
      activeSummary: `model summary ${tokens}`,
      activeSummaryChecksum: `checksum-${tokens}`,
      tokenMeasurement: { activeTokens: tokens, source: "provider_usage_plus_estimate" },
      preservedRecentTokens: 10_000,
      preservedRecentMessageIds: ["m1", "m2", "m3", "m4", "m5"],
      sessionMemoryState: { summary: `session memory ${tokens}`, status: "ready", tokensAtLastExtraction: tokens - 5_000 },
      postCompactGate: { pass: failures === 0, afterTokens: tokens },
      consecutiveFailures: failures,
      boundaryGeneration: 2,
    },
  });

  writeJson("global-agent-memory/memory.json", {
    version: 1,
    scope: "global",
    sessions: [{ sessionId: "global-s1", title: "Global S1", compaction: state(11_001, 1) }],
    archives: [], user: [], feedback: [], authorization: [], decisions: [], missions: [], unresolved: [], references: [],
    privacy: { encryptedTranscripts: true }, integrity: { pass: true, corruptedArchives: [] },
  });
  writeJson("groups.json", [{ id: "group-a", name: "Group A" }]);
  writeJson("group-memory-sessions/group-a/gcs_group_a.json", {
    groupId: "group-a", groupSessionId: "gcs_group_a", compaction: state(12_002),
    sessionMemory: { schema: "ccm-session-memory-test-v1", summary: "group session memory", status: "ready" },
  });
  writeJson("project-memory/proj-a.json", { project: "proj-a", decisions: [], conclusions: [], compaction: state(1_000) });
  writeJson("web-sessions/proj-a/project-s1.json", { id: "project-s1", title: "Project S1", messages: [], compaction: state(13_003) });
  writeJson("task-agent-sessions.json", { sessions: [{ id: "tas_exact_1", project: "proj-a", compaction: state(14_004, 3) }] });

  const { buildMemoryCenterOverview } = await import("../ccm-package/dist/modules/knowledge/memory-control-center-handler.js");
  const { getMemoryCenterScope } = await import("../ccm-package/dist/modules/knowledge/memory-control-center-api.js");
  const overview = buildMemoryCenterOverview();
  const rows = [
    overview.globals.find(item => item.scope === "global_session" && item.id === "session:global-s1"),
    overview.groups.find(item => item.scope === "group" && item.id === "group-a::gcs_group_a"),
    overview.projects.find(item => item.scope === "project_session" && item.id === "proj-a::project-s1"),
    overview.tasks.find(item => item.scope === "task_agent" && item.id === "tas_exact_1"),
  ];
  const expectedTokens = [11_001, 12_002, 13_003, 14_004];
  const details = rows.map(row => row && getMemoryCenterScope(row.scope, row.id));
  const checks = {
    allExactSessionRowsListed: rows.every(Boolean),
    exactTokensRemainIndependent: rows.every((row, index) => row.currentTokens === expectedTokens[index]),
    thresholdsExposedForEveryScope: rows.every(row => row.autoCompactThreshold > 0),
    modelSummarySourceExposed: rows.every(row => row.summarySource === "model"),
    recentWindowExposed: rows.every(row => row.preservedRecentTokens === 10_000 && row.preservedRecentMessages === 5),
    sessionMemoryExposed: rows.every(row => row.sessionMemory?.status === "ready"),
    postCompactGateExposed: rows.every(row => row.postCompactGate),
    taskCircuitIsExact: rows[3].circuitOpen === true && rows.slice(0, 3).every(row => row.circuitOpen === false),
    exactDetailsResolve: details.every((detail, index) => detail?.summary?.currentTokens === expectedTokens[index]),
  };
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, rows }, null, 2));
  console.log(JSON.stringify({ pass: true, checks: Object.keys(checks).length, checksDetail: checks }));
  process.exit(0);
}

const { memorySummary, resolveMemoryCenterTokenState } = await import("../ccm-package/dist/modules/knowledge/memory-control-center-api.js");

const memory = {
  groupId: "token-display-group",
  groupSessionId: "gcs_token_display",
  compaction: {
    health: "recent-window-only",
    preCompactTokenCount: 0,
    postCompactTokenCount: 0,
    contextPressureWarning: {
      schema: "ccm-group-compact-warning-v1",
      tokenUsage: 2166,
      activeMessageCount: 10,
      createdAt: "2026-07-18T00:00:00.000Z",
      thresholds: {
        effectiveContextWindow: 496000,
        autoCompactThreshold: 460000,
      },
    },
  },
};

const tokenState = resolveMemoryCenterTokenState("group", "token-display-group::gcs_token_display", memory, {
  config: { modelContextWindow: 516000, modelAutoCompactTokenLimit: 460000 },
});
assert.equal(tokenState.currentTokens, 2166);
assert.equal(tokenState.currentMessageCount, 10);
assert.equal(tokenState.autoCompactThreshold, 460000);
assert.equal(tokenState.remainingTokens, 457834);
assert.equal(tokenState.tokenSource, "context_pressure_sample");
assert.equal(tokenState.sampledAutoCompactThreshold, 460000);

const summary = memorySummary("group", "token-display-group::gcs_token_display", memory, "Token display");
assert.equal(summary.currentTokens, 2166);
assert.ok(summary.autoCompactThreshold > 0);
assert.equal(summary.beforeTokens, 0);
assert.equal(summary.afterTokens, 0);

const frontend = fs.readFileSync(new URL("../frontend/src/components/knowledge/MemoryCenterPanel.vue", import.meta.url), "utf8");
assert.match(frontend, /item\.currentTokens/);
assert.match(frontend, /selectedSummary\.autoCompactThreshold/);
assert.match(frontend, /selectedSummary\.remainingTokens/);
assert.match(frontend, /最近压缩/);

const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-memory-center-exact-sessions-"));
try {
  const child = spawnSync(process.execPath, [scriptFile, "--exact-session-child"], {
    cwd: path.dirname(path.dirname(scriptFile)),
    env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome },
    encoding: "utf8",
    timeout: 120_000,
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);
  const exactSessionResult = JSON.parse(String(child.stdout || "").trim().split(/\r?\n/).at(-1));
  assert.equal(exactSessionResult.pass, true);
  console.log(JSON.stringify({ pass: true, checks: 14 + exactSessionResult.checks, current_tokens_without_compaction: true, exact_session_scopes: 4 }, null, 2));
} finally {
  fs.rmSync(tempHome, { recursive: true, force: true });
}
