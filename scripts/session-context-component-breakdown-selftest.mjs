import assert from "node:assert/strict";

const core = await import("../ccm-package/dist/system/session-compaction-core.js");

const snapshot = core.buildModelVisiblePayloadSnapshot({
  scope: "group",
  sessionId: "group-a:gcs_context_breakdown",
  system: {
    prompt: "coordinate the current request",
    rules: ["respect exact session boundaries", "do not invent results"],
    skills: [{ name: "code-review", body: "inspect and verify code changes" }],
    subagentDefinitions: [{ name: "project-agent", project: "ccm" }],
  },
  tools: [
    { name: "read_file", description: "read a workspace file" },
    { name: "mcp__ccm__read_session_context", description: "read signed session context" },
    { name: "task_agent_dispatch", description: "dispatch a bounded worker" },
  ],
  activeSummary: { primaryRequest: "keep the context breakdown accurate" },
  recentMessages: [
    { id: "u1", role: "user", content: "show the current context" },
    { id: "a1", role: "assistant", content: "I will inspect the measured payload" },
  ],
  currentRequest: { role: "user", content: "include proportions" },
  recoveryContext: { files: ["frontend/src/components/common/SessionContextUsage.vue"] },
  hookResults: [{ phase: "session_start", content: "restore verified project instructions" }],
});

for (const key of ["system", "tools", "rules", "skills", "mcpTools", "subagentDefinitions", "summary", "recentMessages", "currentRequest", "recoveryContext", "hookResults"]) {
  assert.ok(snapshot.tokenBreakdown[key] > 0, `${key} should have an independently visible token count`);
}

const accounted = Object.values(snapshot.tokenBreakdown).reduce((sum, value) => sum + Number(value || 0), 0);
assert.equal(accounted, snapshot.totalTokens, "component buckets must exactly conserve the payload total");

const fixedKeys = ["system", "tools", "rules", "skills", "mcpTools", "subagentDefinitions", "recoveryContext", "hookResults"];
const expectedFixed = fixedKeys.reduce((sum, key) => sum + snapshot.tokenBreakdown[key], 0);
assert.equal(core.modelVisibleFixedTokens(snapshot), expectedFixed, "fixed context measurement must include split buckets");

const accounting = core.modelVisiblePayloadAccounting(snapshot);
assert.deepEqual(accounting.tokenBreakdown, snapshot.tokenBreakdown);
assert.equal(accounting.totalTokens, snapshot.totalTokens);
assert.equal(accounting.contentStored, false);
for (const key of ["system", "tools", "activeSummary", "recentMessages", "currentRequest", "recoveryContext", "hookResults"]) {
  assert.equal(Object.hasOwn(accounting, key), false, `accounting snapshot must not duplicate ${key} content`);
}

const explicit = core.buildModelVisiblePayloadSnapshot({
  scope: "global",
  sessionId: "global-context-components",
  system: "system rules skills and agent catalog are rendered into this provider prompt",
  tools: [{ name: "read_file" }],
  contextComponents: {
    rules: "rule one rule two",
    skills: "skill one",
    subagentDefinitions: "project agent A",
  },
});
assert.ok(explicit.tokenBreakdown.rules > 0);
assert.ok(explicit.tokenBreakdown.skills > 0);
assert.ok(explicit.tokenBreakdown.subagentDefinitions > 0);
assert.equal(Object.values(explicit.tokenBreakdown).reduce((sum, value) => sum + Number(value || 0), 0), explicit.totalTokens);

console.log(JSON.stringify({
  pass: true,
  totalTokens: snapshot.totalTokens,
  fixedTokens: expectedFixed,
  buckets: snapshot.tokenBreakdown,
}, null, 2));
