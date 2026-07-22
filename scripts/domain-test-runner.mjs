import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const config = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'test-domains.json'), 'utf8'))
const legacyFile = path.join(import.meta.dirname, 'legacy-test-aliases.json')
const args = process.argv.slice(2)
const target = args.find(arg => !arg.startsWith('--')) || 'quick'
const noBuild = args.includes('--no-build')

const run = (command, commandArgs, options = {}) => {
  const started = Date.now()
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
    windowsHide: true,
    shell: options.shell === true,
    timeout: options.timeout || 180_000,
  })
  return { ok: result.status === 0, status: result.status, duration_ms: Date.now() - started, error: result.error?.message || '' }
}

if (args.includes('--list')) {
  console.log(JSON.stringify({
    domains: Object.entries(config.domains).map(([id, value]) => ({ id, label: value.label, tests: value.tests.length, build: value.build })),
    quick: config.quick.length,
  }, null, 2))
  process.exit(0)
}

if (target === 'legacy') {
  const legacyName = args[args.indexOf('legacy') + 1]
  const legacyPayload = fs.existsSync(legacyFile) ? JSON.parse(fs.readFileSync(legacyFile, 'utf8')) : {}
  const aliases = legacyPayload.aliases || legacyPayload
  const command = aliases[legacyName]
  if (!legacyName || !command) {
    console.error(`未知旧测试入口：${legacyName || '(empty)'}`)
    process.exit(2)
  }
  const result = run(command, [], { shell: true, timeout: 15 * 60_000 })
  process.exit(result.ok ? 0 : result.status || 1)
}

const selectedDomains = target === 'all'
  ? Object.keys(config.domains)
  : target === 'quick' ? [] : [target]
for (const domain of selectedDomains) {
  if (!config.domains[domain]) {
    console.error(`未知测试领域：${domain}`)
    process.exit(2)
  }
}

const tests = target === 'quick'
  ? config.quick
  : [...new Set(selectedDomains.flatMap(domain => config.domains[domain].tests))]
const buildKinds = new Set(selectedDomains.map(domain => config.domains[domain].build))
if (target === 'quick') buildKinds.add('backend')

if (!noBuild) {
  const buildScript = buildKinds.has('full') ? 'build' : buildKinds.has('backend') && buildKinds.has('frontend') ? 'build' : buildKinds.has('frontend') ? 'build:frontend' : 'build:backend'
  const build = run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', buildScript], { timeout: 10 * 60_000 })
  if (!build.ok) process.exit(build.status || 1)
}

const report = { schema: 'ccm-domain-test-report-v1', target, started_at: new Date().toISOString(), tests: [], passed: 0, failed: 0 }
for (const file of tests) {
  const absolute = path.join(import.meta.dirname, file)
  if (!fs.existsSync(absolute)) {
    report.tests.push({ file, ok: false, error: 'missing_test_file' })
    report.failed++
    continue
  }
  console.log(`\n[domain-test] ${file}`)
  const result = run(process.execPath, [absolute], { timeout: 5 * 60_000 })
  report.tests.push({ file, ...result })
  if (result.ok) report.passed++
  else report.failed++
}
report.completed_at = new Date().toISOString()
report.pass = report.failed === 0
fs.mkdirSync(path.join(root, 'scratch'), { recursive: true })
fs.writeFileSync(path.join(root, 'scratch', 'domain-test-report.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(`\n${JSON.stringify({ pass: report.pass, target, passed: report.passed, failed: report.failed, report: 'scratch/domain-test-report.json' }, null, 2)}`)
process.exit(report.pass ? 0 : 1)
