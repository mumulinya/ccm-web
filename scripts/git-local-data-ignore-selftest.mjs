import assert from 'node:assert/strict'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const ignored = [
  'scratch/example/.cc-connect/private/credential-master.key',
  'scratch/render/report.json',
  '.cc-connect/ccm.db-wal',
  '.claude/ccm-runtime/mcp-generated.json',
  '.runtime-logs/server.out',
  '.tmp-cursor-auth-probe/config.json',
  'ccm-package/package-build.tgz.raw',
  'UsersadminAppDataLocalTempccm-browser/.cc-connect/ccm.db',
  'Microsoft/Windows/PowerShell/ModuleAnalysisCache',
  '.env.production',
  'nested/.cc-connect/auth/sessions.json',
]
const retained = [
  'backend/server.ts',
  'frontend/src/Root.vue',
  'scripts/git-local-data-ignore-selftest.mjs',
  'docs/README.md',
  'ccm-package/dist/server.js',
  'ccm-package/public/index.html',
  'ccm-package/mcp-feishu/.env.example',
]

const isIgnored = value => spawnSync('git', ['check-ignore', '--no-index', '--quiet', value], {
  cwd: root, windowsHide: true, stdio: 'ignore',
}).status === 0

for (const value of ignored) assert.equal(isIgnored(value), true, `expected ignored: ${value}`)
for (const value of retained) assert.equal(isIgnored(value), false, `expected retained: ${value}`)

console.log(JSON.stringify({
  success: true,
  ignoredCases: ignored.length,
  retainedCases: retained.length,
  localFilesDeleted: 0,
}, null, 2))
