import assert from "node:assert/strict";
import { buildPlanDispatchContract, validatePlanForDispatch, validatePlanDispatchContract } from "../ccm-package/dist/agents/plan-dispatch-contract.js";
import { implementationPlanChecksum } from "../ccm-package/dist/agents/implementation-plan.js";

function plan(overrides = {}) {
  const value = {
    schema: "ccm-implementation-plan-v2",
    planId: "plan-selftest",
    revision: 2,
    checksum: "plan-checksum",
    sourceManifestChecksum: "manifest-checksum",
    files: [
      { project: "web", path: "src/a.ts", sourceEvidenceIds: ["e-a"] },
      { project: "web", path: "src/b.ts", sourceEvidenceIds: ["e-b"] },
    ],
    steps: [
      { id: "a", title: "A", objective: "change A", files: ["src/a.ts"], sourceEvidenceIds: ["e-a"], acceptance: ["A passes"], verification: [{ command: "npm test", expected: "pass" }] },
      { id: "b", title: "B", objective: "change B", files: ["src/b.ts"], sourceEvidenceIds: ["e-b"], acceptance: ["B passes"], verification: [{ command: "npm test", expected: "pass" }] },
    ],
    ...overrides,
  };
  value.checksum = implementationPlanChecksum(value);
  return value;
}

const capabilities = { writeScope: true, sessionBinding: true, structuredToolStream: true, structuredReceipt: true, worktree: true };
const contract = buildPlanDispatchContract({ plan: plan(), taskId: "task-1", project: "web", capabilities });
assert.equal(contract.dispatchReady, true);
assert.equal(contract.strategy, "conflict_aware_parallel");
assert.notEqual(contract.workItems[0].parallelGroup, contract.workItems[1].parallelGroup);
assert.equal(validatePlanDispatchContract(contract).valid, true);

const overlap = buildPlanDispatchContract({
  plan: plan({ files: [{ project: "web", path: "src/a.ts", sourceEvidenceIds: ["e-a"] }], steps: [
    { id: "a", title: "A", objective: "change A", files: ["src/a.ts"], sourceEvidenceIds: ["e-a"], acceptance: ["A passes"], verification: [{ expected: "pass" }] },
    { id: "b", title: "B", objective: "change same", files: ["src/a.ts"], sourceEvidenceIds: ["e-a"], acceptance: ["B passes"], verification: [{ expected: "pass" }] },
  ] }), taskId: "task-2", project: "web", capabilities });
assert.equal(overlap.workItems[1].dependsOn.includes(overlap.workItems[0].workItemId), true);

const degraded = buildPlanDispatchContract({ plan: plan(), taskId: "task-3", project: "web", capabilities: { writeScope: true, sessionBinding: true, streaming: true } });
assert.equal(degraded.dispatchReady, true);
assert.equal(degraded.workItems[0].executor.degraded, true);
assert.match(degraded.workItems[0].executor.degradedReason, /CCM|Provider/);
assert.equal(degraded.workItems[0].worktree.strategy, "isolated");

const unbound = buildPlanDispatchContract({ plan: plan(), taskId: "task-3b", project: "web", capabilities: { streaming: true } });
assert.equal(unbound.dispatchReady, false);
assert.ok(unbound.blockers.some(issue => /写入范围|身份绑定/.test(issue)));

const cycle = validatePlanForDispatch(plan({ steps: [
  { id: "a", title: "A", objective: "A", files: ["src/a.ts"], sourceEvidenceIds: ["e-a"], acceptance: ["A"], dependsOn: ["b"], verification: [{ expected: "pass" }] },
  { id: "b", title: "B", objective: "B", files: ["src/b.ts"], sourceEvidenceIds: ["e-b"], acceptance: ["B"], dependsOn: ["a"], verification: [{ expected: "pass" }] },
] }));
assert.equal(cycle.ok, false);
assert.ok(cycle.issues.some(issue => issue.includes("环")));

console.log(JSON.stringify({ pass: true, checks: { parallel: true, overlapSerial: true, degraded: true, cycleBlocked: true } }));
