import assert from "node:assert/strict";
import { runUnifiedScopeCompaction } from "../ccm-package/dist/system/unified-session-compaction.js";

for (const scope of ["global", "group", "project"]) {
  let committed = null;
  let failed = null;
  const result = await runUnifiedScopeCompaction({
    policy: { autoCompactThreshold: 200, maxKeepTokens: 120, minKeepTokens: 20, minKeepTextMessages: 2 },
    hooks: {
      load: () => ({
        scope,
        exactSessionId: `${scope}:engine-selftest`,
        messages: Array.from({ length: 8 }, (_, index) => ({ id: `${scope}-m${index}`, role: index % 2 ? "assistant" : "user", content: `${scope} durable goal ${index} `.repeat(20) })),
        executionEvents: Array.from({ length: 8 }, (_, index) => ({ id: `${scope}-e${index}`, type: "tool_result", toolCallId: `${scope}-tool-${index}`, payload: "x".repeat(5000) })),
        recoveryContext: { permissionBoundary: `${scope}:authorized`, taskBindings: [{ taskId: `${scope}-task`, generation: 2 }] },
        boundaryGeneration: 4,
      }),
      commit: (value) => { committed = value; },
      failure: (error) => { failed = error; },
    },
    modelCall: async ({ scope: currentScope }) => ({
      schema: "ccm-unified-session-summary-v1",
      userGoals: [`goal for ${currentScope}`], corrections: [], decisions: [], authorizationBoundaries: [`${currentScope}:authorized`],
      completedWork: ["read evidence"], pendingWork: ["continue"], risksAndBlockers: [], fileReferences: ["src/example.ts"],
      verificationEvidence: ["selftest"], attachmentReferences: [], nextActions: ["continue"], sourceMessageIds: Array.from({ length: 3 }, (_, index) => `${currentScope}-m${index}`), contentStored: false,
    }),
  });
  assert.equal(result.strategy, "cc_two_stage");
  assert.equal(result.contentStored, false);
  assert.equal(result.receipt.scope, scope);
  assert.equal(result.recoveryContext.contentStored, false);
  assert.ok(committed);
  assert.equal(failed, null);
}
console.log("unified session compaction engine selftest passed");
