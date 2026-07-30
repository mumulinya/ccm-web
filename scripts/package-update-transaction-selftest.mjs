import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  switchPreparedUpdate,
  validateInstalledPackage,
  verifyIntegrity,
} = require('../ccm-package/bin/update-runtime.js')

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-update-transaction-'))
const npm = { command: 'npm', prefix: [] }
const packageName = '@mumulinya167/cc-web'

function stagedTransaction(name) {
  const staging = path.join(root, name)
  fs.mkdirSync(staging, { recursive: true })
  const tarball = path.join(staging, 'target.tgz')
  fs.writeFileSync(tarball, 'target')
  return {
    schema: 'ccm-package-update-transaction-v1',
    id: name,
    state: 'staged',
    package_name: packageName,
    previous_version: '1.0.26',
    target_version: '1.0.27',
    staging_directory: staging,
    tarball,
    history: [],
  }
}

async function runSwitchCase(name, options = {}) {
  const transaction = stagedTransaction(name)
  const transactionFile = path.join(transaction.staging_directory, 'transaction.json')
  let installedVersion = '1.0.26'
  const starts = []
  const context = {
    npm,
    packageName,
    transactionFile,
    launchConfiguration: {
      schema: 'ccm-service-launch-config-v2',
      host: '0.0.0.0',
      port: 3080,
      public_origin: 'https://example.test',
      launch_mode: 'background',
    },
    stopService: async () => 0,
    startService: async (_packageRoot, launchConfiguration) => {
      starts.push({ installedVersion, launchConfiguration })
      if (installedVersion === '1.0.27' && options.failTargetStart) return 1
      if (installedVersion === '1.0.26' && options.failRollbackStart) return 1
      return 0
    },
    installGlobalTarball: (_npm, tarball) => {
      if (options.failRollbackInstall && tarball.includes('previous')) throw new Error('rollback install failed')
      installedVersion = tarball.includes('previous') ? '1.0.26' : '1.0.27'
    },
    resolveGlobalPackageRoot: () => path.join(root, `installed-${installedVersion}`),
    validateInstalledPackage: (_packageRoot, _packageName, version) => {
      assert.equal(version, installedVersion)
    },
    packExactVersion: (_npm, _packageName, version, destination) => {
      const tarball = path.join(destination, 'previous.tgz')
      fs.writeFileSync(tarball, version)
      return tarball
    },
  }
  const result = await switchPreparedUpdate(context, transaction)
  return { result, starts, persisted: JSON.parse(fs.readFileSync(transactionFile, 'utf8')) }
}

try {
  const artifact = path.join(root, 'artifact.tgz')
  fs.writeFileSync(artifact, 'verified artifact')
  const digest = crypto.createHash('sha512').update(fs.readFileSync(artifact)).digest('base64')
  assert.doesNotThrow(() => verifyIntegrity(artifact, `sha512-${digest}`))
  assert.throws(() => verifyIntegrity(artifact, `sha512-${Buffer.alloc(64).toString('base64')}`), /不一致/)

  const invalidPackage = path.join(root, 'invalid-package')
  fs.mkdirSync(path.join(invalidPackage, 'bin'), { recursive: true })
  fs.writeFileSync(path.join(invalidPackage, 'bin', 'ccm.js'), '#!/usr/bin/env node\n')
  fs.chmodSync(path.join(invalidPackage, 'bin', 'ccm.js'), 0o755)
  fs.writeFileSync(path.join(invalidPackage, 'package.json'), JSON.stringify({
    name: packageName,
    version: '1.0.27',
    bin: { ccm: 'bin/ccm.js' },
    dependencies: { unsafe: 'file:..' },
  }))
  assert.throws(() => validateInstalledPackage(invalidPackage, packageName, '1.0.27'), /本地引用/)

  const success = await runSwitchCase('success')
  assert.equal(success.result.state, 'completed')
  assert.equal(success.persisted.state, 'completed')
  assert.equal(success.starts.length, 1)
  assert.equal(success.starts[0].launchConfiguration.public_origin, 'https://example.test')

  const rolledBack = await runSwitchCase('rolled-back', { failTargetStart: true })
  assert.equal(rolledBack.result.state, 'rolled_back')
  assert.equal(rolledBack.persisted.state, 'rolled_back')
  assert.deepEqual(rolledBack.starts.map(item => item.installedVersion), ['1.0.27', '1.0.26'])

  const recovery = await runSwitchCase('recovery-required', {
    failTargetStart: true,
    failRollbackInstall: true,
  })
  assert.equal(recovery.result.state, 'recovery_required')
  assert.equal(recovery.persisted.state, 'recovery_required')
  assert.match(recovery.result.rollback_error, /rollback install failed/)

  console.log(JSON.stringify({
    success: true,
    cases: ['integrity', 'local_dependency_rejection', 'completed', 'rolled_back', 'recovery_required'],
    provider_calls: 0,
  }))
} finally {
  fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}
