import assert from "node:assert/strict";
import {
  buildUnifiedCompactionReceipt,
  buildUnifiedRecoveryContext,
  orchestrateUnifiedCompaction,
  projectUnifiedCompactionReceipt,
} from "../ccm-package/dist/system/unified-session-compaction.js";

const scopes = ["global", "group", "project"];
for (const scope of scopes) {
  const exactSessionId = `${scope}:selftest`;
  const recovery = buildUnifiedRecoveryContext({
    scope,
    exactSessionId,
    fileReferences: ["src/example.ts"],
    verificationEvidence: ["typecheck"],
    pendingActions: ["run tests"],
    permissionBoundary: scope,
  });
  const result = orchestrateUnifiedCompaction({
    scope,
    exactSessionId,
    activeTokens: 120_000,
    threshold: 100_000,
    microCompactApplied: true,
    microCompactTrigger: "pressure",
    summarySource: "model",
    afterTokens: 40_000,
    boundaryGeneration: 2,
    recoveryContextChecksum: recovery.checksum,
    summaryQuality: { pass: true },
  });
  assert.equal(result.receipt.strategy, "cc_two_stage");
  assert.equal(result.projection?.contentStored, false);
  assert.equal(result.projection?.scope, scope);
  assert.equal(result.receipt.checksum.length, 64);
  assert.equal(projectUnifiedCompactionReceipt(result.receipt)?.contentStored, false);
}
console.log("unified session compaction selftest passed");
