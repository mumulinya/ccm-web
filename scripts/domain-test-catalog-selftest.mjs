import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const scriptsDirectory = path.join(root, 'scripts')
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const domainConfig = JSON.parse(fs.readFileSync(path.join(scriptsDirectory, 'test-domains.json'), 'utf8'))
const legacyConfig = JSON.parse(fs.readFileSync(path.join(scriptsDirectory, 'legacy-test-aliases.json'), 'utf8'))
const coverageManifest = JSON.parse(fs.readFileSync(path.join(scriptsDirectory, 'project-coverage-manifest.json'), 'utf8'))

const checks = []
const check = (name, pass, details = {}) => checks.push({ name, pass, ...details })

const activeTestScripts = Object.keys(packageJson.scripts || {})
  .filter(name => name === 'test' || name.startsWith('test:'))
const legacyAliases = Object.keys(legacyConfig.aliases || {})
const domainEntries = Object.values(domainConfig.domains || {}).flatMap(domain => domain.tests || [])
const quickEntries = domainConfig.quick || []
const helperEntries = (domainConfig.helpers || []).map(entry => typeof entry === 'string' ? entry : entry.file)
const configuredEntries = [...domainEntries, ...quickEntries]
const missingFiles = [...new Set(configuredEntries)]
  .filter(file => !fs.existsSync(path.join(scriptsDirectory, file)))
const duplicateDomainEntries = domainEntries.filter((file, index) => domainEntries.indexOf(file) !== index)
const duplicateQuickEntries = quickEntries.filter((file, index) => quickEntries.indexOf(file) !== index)
const testLikePattern = /(?:selftest|audit|regression|e2e|soak|acceptance|production|attest)/i
const testLikeFiles = fs.readdirSync(scriptsDirectory)
  .filter(file => /\.(?:mjs|cjs|js)$/.test(file) && testLikePattern.test(file))
const legacyReferencedFiles = new Set()
for (const command of Object.values(legacyConfig.aliases || {})) {
  for (const match of String(command).matchAll(/scripts[\\/]([^\s"']+\.(?:mjs|cjs|js))/g)) legacyReferencedFiles.add(match[1])
}
const packageReferencedFiles = new Set()
for (const command of Object.values(packageJson.scripts || {})) {
  for (const match of String(command).matchAll(/scripts[\\/]([^\s"']+\.(?:mjs|cjs|js))/g)) packageReferencedFiles.add(match[1])
}
const inventoriedFiles = new Set([...configuredEntries, ...helperEntries, ...legacyReferencedFiles, ...packageReferencedFiles])
const unclassifiedFiles = testLikeFiles.filter(file => !inventoriedFiles.has(file))
const missingHelperReasons = (domainConfig.helpers || []).filter(entry => typeof entry !== 'object' || !String(entry.reason || '').trim())
const coverageHelpers = new Set((coverageManifest.testHelpers || []).map(entry => entry.file))
const missingCoverageHelpers = [...coverageHelpers].filter(file => !helperEntries.includes(file))

check('active npm test entrypoints remain consolidated', activeTestScripts.length >= 16, {
  minimum: 16,
  actual: activeTestScripts.length,
})
check('legacy npm aliases remain available', legacyAliases.length >= 213, {
  minimum: 213,
  actual: legacyAliases.length,
})
check('configured test files exist', missingFiles.length === 0, { missingFiles })
check('domain entries are unique', duplicateDomainEntries.length === 0, {
  duplicateDomainEntries: [...new Set(duplicateDomainEntries)],
})
check('quick entries are unique', duplicateQuickEntries.length === 0, {
  duplicateQuickEntries: [...new Set(duplicateQuickEntries)],
})
check('all specialized tests and audits are classified', unclassifiedFiles.length === 0, { unclassifiedFiles })
check('parameterized helper exclusions explain their wrapper contract', missingHelperReasons.length === 0, {
  missingHelperReasons,
})
check('coverage manifest helpers match the executable test catalog', missingCoverageHelpers.length === 0, {
  missingCoverageHelpers,
})
check('specialized tests remain preserved', testLikeFiles.length >= 191, {
  minimum: 191,
  actual: testLikeFiles.length,
})

const failures = checks.filter(item => !item.pass)
console.log(JSON.stringify({
  success: failures.length === 0,
  checks,
  inventory: {
    activeTestScripts: activeTestScripts.length,
    legacyAliases: legacyAliases.length,
    domainEntries: domainEntries.length,
    quickEntries: quickEntries.length,
    helperEntries: helperEntries.length,
    unclassifiedFiles: unclassifiedFiles.length,
    testLikeFiles: testLikeFiles.length,
  },
}, null, 2))

if (failures.length) process.exitCode = 1
