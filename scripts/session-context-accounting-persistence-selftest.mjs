import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

if (process.argv.includes("--child")) {
  const globalMemory = await import("../ccm-package/dist/agents/global/memory.js");
  const projectCompaction = await import("../ccm-package/dist/modules/projects/project-session-compaction.js");

  const globalSessionId = "session_accounting_without_usage";
  globalMemory.ingestGlobalAgentConversation({
    sessionId: globalSessionId,
    source: "selftest",
    compact: false,
    messages: [
      { id: "g-u1", role: "user", content: "verify accounting without provider usage" },
      { id: "g-a1", role: "assistant", content: "the payload still needs a component breakdown" },
    ],
  });
  const globalUsage = globalMemory.recordGlobalAgentSessionProviderUsage(globalSessionId, {
    fixedContext: { policy: "exact session only", skills: ["context-accounting"] },
    tools: [{ name: "mcp__ccm__read_session_context" }],
  });
  assert.equal(globalUsage, null);
  const globalSession = globalMemory.loadGlobalAgentMemory().sessions.find(item => item.sessionId === globalSessionId);
  assert.equal(globalSession.compaction.tokenMeasurement.method, "model_visible_payload_estimate");
  assert.ok(globalSession.compaction.modelVisiblePayload.tokenBreakdown.rules > 0);
  assert.ok(globalSession.compaction.modelVisiblePayload.tokenBreakdown.skills > 0);
  assert.ok(globalSession.compaction.modelVisiblePayload.tokenBreakdown.mcpTools > 0);
  assert.ok(globalSession.compaction.modelVisiblePayload.tokenBreakdown.recentMessages > 0);

  const ccmDir = path.join(os.homedir(), ".cc-connect");
  const projectDir = path.join(ccmDir, "web-sessions", "accounting-project");
  fs.mkdirSync(projectDir, { recursive: true });
  fs.writeFileSync(path.join(projectDir, "accounting-session.json"), JSON.stringify({
    id: "accounting-session",
    history: [
      { id: "p-u1", role: "user", content: "project context" },
      { id: "p-a1", role: "assistant", content: "project response" },
    ],
  }, null, 2));
  const projectUsage = projectCompaction.recordProjectSessionProviderUsage("accounting-project", "accounting-session", {
    fixedContext: { rules: ["stay in project scope"] },
    tools: [{ name: "read_file" }],
  });
  assert.equal(projectUsage, null);
  const projectSession = JSON.parse(fs.readFileSync(path.join(projectDir, "accounting-session.json"), "utf8"));
  assert.equal(projectSession.compaction.tokenMeasurement.method, "model_visible_payload_estimate");
  assert.ok(projectSession.compaction.model_visible_payload.tokenBreakdown.rules > 0);
  assert.ok(projectSession.compaction.model_visible_payload.tokenBreakdown.recentMessages > 0);

  console.log(JSON.stringify({ pass: true, global: globalSession.compaction.modelVisiblePayload.tokenBreakdown, project: projectSession.compaction.model_visible_payload.tokenBreakdown }));
  process.exit(0);
}

const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-context-accounting-"));
try {
  const child = spawnSync(process.execPath, [new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/, value => value.slice(1)), "--child"], {
    cwd: path.resolve(import.meta.dirname, ".."),
    env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome },
    encoding: "utf8",
    timeout: 120_000,
  });
  assert.equal(child.status, 0, child.stderr || child.stdout);
  const result = JSON.parse(String(child.stdout || "").trim().split(/\r?\n/).at(-1));
  assert.equal(result.pass, true);
  console.log(JSON.stringify({ pass: true, scopes: ["global", "project"], providerUsageReturned: false }, null, 2));
} finally {
  fs.rmSync(tempHome, { recursive: true, force: true });
}
