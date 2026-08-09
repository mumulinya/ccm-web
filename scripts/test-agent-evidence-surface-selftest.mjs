import assert from "node:assert/strict"
import path from "node:path"

const root = path.resolve(import.meta.dirname, "..")
const projection = await import(path.join(root, "ccm-package", "dist", "test-agent", "evidence-projection.js"))
const surface = await import(path.join(root, "ccm-package", "dist", "test-agent", "surface-audit.js"))
const runtime = await import(path.join(root, "ccm-package", "dist", "test-agent", "runtime-fingerprint.js"))

const results = {
  projection: projection.runTestAgentEvidenceProjectionSelfTest(),
  surface: surface.runTestAgentSurfaceAuditSelfTest(),
  runtime: runtime.runTestAgentRuntimeFingerprintSelfTest(),
}
for (const [name, result] of Object.entries(results)) assert.equal(result?.pass, true, `${name} self-test failed`)
console.log(JSON.stringify({ schema: "ccm-test-agent-evidence-surface-selftest-v1", results, pass: true }, null, 2))
