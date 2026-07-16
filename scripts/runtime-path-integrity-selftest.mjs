import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const distRoot = path.join(root, 'ccm-package', 'dist')
const publicRoot = path.join(root, 'ccm-package', 'public')

const walk = (dir) => fs.readdirSync(dir).flatMap((name) => {
  const file = path.join(dir, name)
  return fs.statSync(file).isDirectory() ? walk(file) : [file]
})

const missingBackendRequires = []
for (const file of walk(distRoot).filter((item) => item.endsWith('.js'))) {
  const content = fs.readFileSync(file, 'utf8')
  for (const match of content.matchAll(/require\(["'](\.{1,2}\/[^"']+)["']\)/g)) {
    const base = path.resolve(path.dirname(file), match[1])
    const candidates = [base, `${base}.js`, path.join(base, 'index.js')]
    const knownFailureFixture = path.relative(distRoot, file) === path.join('system', 'reliability-drills.js')
      && match[1] === '../src/payment'
    if (!knownFailureFixture && !candidates.some((candidate) => fs.existsSync(candidate))) {
      missingBackendRequires.push({ file: path.relative(distRoot, file), reference: match[1] })
    }
  }
}

const missingPublicReferences = []
for (const file of walk(publicRoot).filter((item) => /\.(?:html|js|css)$/.test(item))) {
  const content = fs.readFileSync(file, 'utf8')
  for (const match of content.matchAll(/(?:from\s*|import\s*\(|src=|href=)["']([^"']+)["']/g)) {
    const reference = match[1]
    const clean = reference.split(/[?#]/)[0]
    const target = reference.startsWith('/') && !reference.startsWith('//')
      ? path.join(publicRoot, clean)
      : reference.startsWith('.')
        ? path.resolve(path.dirname(file), clean)
        : ''
    if (target && !fs.existsSync(target)) {
      missingPublicReferences.push({ file: path.relative(publicRoot, file), reference })
    }
  }
}

const runtimeEntries = [
  'ccm-package/public/index.html',
  'ccm-package/pet/main.js',
  'ccm-package/pet/assets',
  'ccm-package/mcp-feishu/dist/index.js',
  'ccm-package/dist/integrations/control-bot-acp.js',
  'ccm-package/dist/test-agent/cli.js',
  'ccm-package/dist/test-agent/self-test.js',
  'ccm-package/dist/agents/cli-prompt-runner.js',
  'ccm-package/dist/agents/codex-prompt-runner.js',
]
const missingRuntimeEntries = runtimeEntries.filter((entry) => !fs.existsSync(path.join(root, entry)))

const report = {
  pass: missingBackendRequires.length === 0
    && missingPublicReferences.length === 0
    && missingRuntimeEntries.length === 0,
  backendModules: walk(distRoot).filter((item) => item.endsWith('.js')).length,
  publicFiles: walk(publicRoot).length,
  missingBackendRequires,
  missingPublicReferences,
  missingRuntimeEntries,
}

console.log(JSON.stringify(report, null, 2))
if (!report.pass) process.exit(1)
