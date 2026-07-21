import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { runTestAgent } = require('../ccm-package/dist/test-agent/agent.js')
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-test-agent-runtime-env-'))
const projectDir = path.join(root, 'project')
const artifactDir = path.join(root, 'artifacts')
fs.mkdirSync(projectDir, { recursive: true })
fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({
  name: 'runtime-env-selftest', private: true,
  scripts: { 'verify:runtime-env': 'node verify-runtime-env.js' },
}, null, 2))
fs.writeFileSync(path.join(projectDir, 'verify-runtime-env.js'), "process.exit(process.env.TEST_LOGIN_SECRET === 'runtime-only-secret-value' ? 0 : 7)\n")

const secret = 'runtime-only-secret-value'
try {
  const report = await runTestAgent({
    id: 'runtime-env-selftest',
    taskId: 'runtime-env-selftest',
    issuedBy: 'selftest',
    originalUserGoal: 'Verify that runtime-only credentials execute without entering persistent work orders.',
    acceptanceCriteria: ['Runtime credential reaches the verification process without appearing in evidence.'],
    requiredChecks: ['commands'],
    projects: [{
      name: 'product-web [Web 用户端]',
      workDir: projectDir,
      verificationCommands: ['npm run verify:runtime-env'],
    }],
    options: {
      artifactDir,
      agenticPlanning: false,
      requireAdversarialProbe: false,
      collectBrowserArtifacts: false,
      browserProvider: 'none',
    },
  }, {
    runtimeProjectEnvironments: {
      'product-web [Web 用户端]': { TEST_LOGIN_SECRET: secret },
    },
  })
  const serialized = JSON.stringify(report)
  assert.equal(report.commandResults?.[0]?.status, 'passed')
  assert.equal(serialized.includes(secret), false)
  assert.equal(serialized.includes('runtimeProjectEnvironments'), false)
  assert.equal(JSON.stringify(report.metadata?.executionPlan?.metadata?.normalizedWorkOrder || {}).includes(secret), false)
  const files = fs.readdirSync(artifactDir, { recursive: true }).map(String)
  for (const file of files) {
    const absolute = path.join(artifactDir, file)
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) {
      assert.equal(fs.readFileSync(absolute).includes(Buffer.from(secret)), false, `secret leaked to ${file}`)
    }
  }
  console.log('test-agent runtime env self-test: 5/5 checks passed; paid provider calls: 0')
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
