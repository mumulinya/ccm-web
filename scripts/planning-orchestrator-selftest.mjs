import assert from "node:assert/strict";
import { runPlanningOrchestratorSelfTest, buildPlanningEvidenceManifest, planningEvidenceManifestFromToolResults, planningPromptForTurn, resolvePlanningIntensity } from "../ccm-package/dist/agents/planning-orchestrator.js";

const result = runPlanningOrchestratorSelfTest();
assert.equal(result.pass, true, JSON.stringify(result));
assert.equal(resolvePlanningIntensity({ projectCount: 1, independentModuleCount: 1, riskLevel: "low" }), "focused");
assert.equal(resolvePlanningIntensity({ projectCount: 1, independentModuleCount: 2 }), "coordinated");
assert.equal(resolvePlanningIntensity({ projectCount: 2 }), "critical");
assert.equal(planningPromptForTurn(1).kind, "full");
assert.equal(planningPromptForTurn(5).kind, "sparse");
assert.equal(planningPromptForTurn(6).kind, "full");
const evidence = buildPlanningEvidenceManifest([{ project: "web", path: "src/App.vue", checksum: "sha", from: 1, to: 20, evidenceId: "real-read" }]);
const fromResults = planningEvidenceManifestFromToolResults([{ ok: true, name: "read_file", output: { planningEvidence: evidence.entries[0] } }]);
assert.equal(fromResults.entries[0].evidenceId, "real-read");
assert.equal(fromResults.entries[0].contentStored, false);
console.log("planning-orchestrator selftest: pass");
