import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const checks = [
  ["hardening_metrics", require("../ccm-package/dist/test-agent/hardening-metrics.js").runTestAgentHardeningMetricsSelfTest],
  ["hardening_policy", require("../ccm-package/dist/test-agent/hardening-policy.js").runTestAgentHardeningPolicySelfTest],
  ["planning_fallback", require("../ccm-package/dist/test-agent/planning-fallback.js").runTestAgentPlanningFallbackSelfTest],
  ["evidence_projection", require("../ccm-package/dist/test-agent/evidence-projection.js").runTestAgentEvidenceProjectionSelfTest],
  ["surface_audit", require("../ccm-package/dist/test-agent/surface-audit.js").runTestAgentSurfaceAuditSelfTest],
  ["runtime_fingerprint", require("../ccm-package/dist/test-agent/runtime-fingerprint.js").runTestAgentRuntimeFingerprintSelfTest],
  ["isolation", require("../ccm-package/dist/test-agent/isolation.js").runTestAgentIsolationSelfTest],
  ["readonly_capabilities", require("../ccm-package/dist/test-agent/readonly-capabilities.js").runTestAgentReadonlyCapabilitySelfTest],
  ["completion_gate", require("../ccm-package/dist/test-agent/completion-gate.js").runTestAgentCompletionGateSelfTest],
];

const results = [];
for (const [name, run] of checks) {
  if (typeof run !== "function") {
    results.push({ name, pass: false, reason: "selftest_export_missing" });
    continue;
  }
  try {
    const value = await run();
    results.push({ name, pass: value?.pass === true, value });
  } catch (error) {
    results.push({ name, pass: false, reason: String(error?.message || error) });
  }
}

const output = {
  schema: "ccm-test-agent-v2-hardening-selftest-v1",
  pass: results.every(item => item.pass),
  results,
};
console.log(JSON.stringify(output, null, 2));
if (!output.pass) process.exitCode = 1;
