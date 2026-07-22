import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const source = fs.readFileSync(path.join(root, 'scripts', 'release-live-acceptance.mjs'), 'utf8')
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'release-matrix.yml'), 'utf8')
const packageInfo = JSON.parse(fs.readFileSync(path.join(root, 'ccm-package', 'package.json'), 'utf8'))

for (const provider of ['codex', 'claudecode', 'cursor', 'gemini', 'opencode']) assert.match(source, new RegExp(`['\"]${provider}['\"]`))
assert.match(source, /--live/)
assert.match(source, /--live-feishu/)
assert.match(source, /workspaceUnchanged/)
assert.match(source, /outputChecksum/)
assert.match(source, /releaseReady/)
assert.match(source, /errorEvidence/)
assert.doesNotMatch(source, /row\.rawOutput|rawOutput:/)
assert.doesNotMatch(source, /row\.error\s*=\s*String/)
assert.match(workflow, /windows-latest/)
assert.match(workflow, /ubuntu-latest/)
assert.match(workflow, /\[20, 22\]/)
assert.match(workflow, /node-pty-degraded-runtime-selftest/)
assert.match(workflow, /npm-package-install-release-selftest/)
assert.equal(packageInfo.optionalDependencies['node-pty'], '1.2.0-beta.14')
assert.equal(packageInfo.dependencies?.['node-pty'], undefined)

console.log(JSON.stringify({
  success: true,
  checks: {
    fiveProviderLiveGate: true,
    feishuEvidenceGate: true,
    noRawProviderOutputInReport: true,
    windowsUbuntuNodeMatrix: true,
    optionalPtyFallback: true,
  },
  paidProviderCalls: 0,
}, null, 2))
