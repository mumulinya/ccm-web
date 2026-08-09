import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "ccm-vnext-gap-"));
process.env.CCM_EVIDENCE_STORE_DIR = root;
process.env.CCM_OPERATION_REGISTRY_DIR = root;
process.env.CCM_FAILURE_RECORD_DIR = root;
process.env.CCM_TASK_TRANSITION_DIR = root;

const evidence = await import("../ccm-package/dist/system/unified-evidence-registry.js");
const operation = await import("../ccm-package/dist/system/operation-registry.js");
const failures = await import("../ccm-package/dist/system/failure-record.js");
const inheritance = await import("../ccm-package/dist/system/plan-inheritance.js");
const budget = await import("../ccm-package/dist/system/agent-loop-budget.js");
const transitions = await import("../ccm-package/dist/system/task-transition-ledger.js");

const results = {
  evidence: evidence.runUnifiedEvidenceRegistrySelfTest(),
  operation: operation.runOperationRegistrySelfTest(),
  failure: failures.runFailureRecordSelfTest(),
  inheritance: inheritance.runPlanInheritanceSelfTest(),
  budget: budget.runAgentLoopBudgetSelfTest(),
  transitions: transitions.runTaskTransitionLedgerSelfTest(),
};
const failed = Object.entries(results).filter(([, value]) => value?.pass !== true);
console.log(JSON.stringify({ schema: "ccm-vnext-gap-selftest-v1", root, results, pass: failed.length === 0 }, null, 2));
if (failed.length) process.exitCode = 1;
