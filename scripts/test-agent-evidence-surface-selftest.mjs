import assert from "node:assert/strict"
import path from "node:path"
import { pathToFileURL } from "node:url"

const root = path.resolve(import.meta.dirname, "..")
const load = (...parts) => import(pathToFileURL(path.join(root, "ccm-package", "dist", ...parts)).href)
const projection = await load("test-agent", "evidence-projection.js")
const surface = await load("test-agent", "surface-audit.js")
const runtime = await load("test-agent", "runtime-fingerprint.js")

const results = {
  projection: projection.runTestAgentEvidenceProjectionSelfTest(),
  surface: surface.runTestAgentSurfaceAuditSelfTest(),
  runtime: runtime.runTestAgentRuntimeFingerprintSelfTest(),
}
for (const [name, result] of Object.entries(results)) assert.equal(result?.pass, true, `${name} self-test failed`)
console.log(JSON.stringify({ schema: "ccm-test-agent-evidence-surface-selftest-v1", results, pass: true }, null, 2))
