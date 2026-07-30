import assert from 'node:assert/strict'
import path from 'node:path'
import {
  auditProjectCoverage,
  collectCoverageInventory,
  readCoverageManifest,
  renderCoverageMatrix,
} from './project-coverage-lib.mjs'

const root = path.resolve(import.meta.dirname, '..')
const manifest = readCoverageManifest(root)
const inventory = collectCoverageInventory(root)
const clone = value => structuredClone(value)
const codes = result => new Set(result.receipt.errors.map(error => error.code))

const baseline = auditProjectCoverage({
  root,
  manifest,
  inventory,
  generatedDocument: renderCoverageMatrix(manifest),
})
assert.equal(baseline.receipt.success, true, JSON.stringify(baseline.receipt.errors, null, 2))

const pageInventory = clone(inventory)
pageInventory.frontend.pages.push({ id: 'unregistered-page', component: 'frontend/src/components/common/UsabilityWorkbench.vue' })
assert.ok(codes(auditProjectCoverage({ root, manifest, inventory: pageInventory })).has('unmapped_frontend_page'))

const apiInventory = clone(inventory)
apiInventory.api.prefixes.push('/api/unregistered-business')
apiInventory.api.occurrences.set('/api/unregistered-business', ['backend/example.ts:1'])
assert.ok(codes(auditProjectCoverage({ root, manifest, inventory: apiInventory })).has('unmapped_api_prefix'))

const cliInventory = clone(inventory)
cliInventory.cli.commands.push('unregistered-command')
assert.ok(codes(auditProjectCoverage({ root, manifest, inventory: cliInventory })).has('unmapped_cli_command'))

const documentInventory = clone(inventory)
documentInventory.docs.architectureDocs.push('docs/confirmed-project-architecture/UNREGISTERED.md')
assert.ok(codes(auditProjectCoverage({ root, manifest, inventory: documentInventory })).has('orphan_document'))

const duplicateManifest = clone(manifest)
duplicateManifest.domains[1].frontendPages.push(clone(duplicateManifest.domains[0].frontendPages[0]))
assert.ok(codes(auditProjectCoverage({ root, manifest: duplicateManifest, inventory })).has('duplicate_frontend_owner'))

const missingPathManifest = clone(manifest)
missingPathManifest.domains[0].productionEntrypoints.push('backend/does-not-exist.ts')
assert.ok(codes(auditProjectCoverage({ root, manifest: missingPathManifest, inventory })).has('missing_exact_path'))

const testDomainManifest = clone(manifest)
testDomainManifest.domains[0].criticalTests.push('music-semantic-playback-selftest.mjs')
assert.ok(codes(auditProjectCoverage({ root, manifest: testDomainManifest, inventory })).has('critical_test_not_in_domain'))

const drift = auditProjectCoverage({
  root,
  manifest,
  inventory,
  generatedDocument: `${renderCoverageMatrix(manifest)}manual drift`,
})
assert.ok(codes(drift).has('generated_document_drift'))

assert.equal(
  renderCoverageMatrix(manifest),
  renderCoverageMatrix(JSON.parse(JSON.stringify(manifest))),
  'matrix generation must be deterministic',
)
assert.ok(
  manifest.compatibilityEntries.some(entry => entry.apiPrefixes.includes('/api/templates')),
  'retired template endpoint must remain outside active business domains',
)

console.log('Project coverage matrix selftest passed: 10 production gate checks')
