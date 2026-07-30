import fs from 'node:fs'
import crypto from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const packageInfo = JSON.parse(fs.readFileSync(path.join(root, 'ccm-package', 'package.json'), 'utf8'))
const providedTarball = String(process.argv[2] || '').trim()
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-npm-release-'))
const installRoot = path.join(temporaryRoot, 'install')
fs.mkdirSync(installRoot, { recursive: true })
fs.writeFileSync(path.join(installRoot, 'package.json'), JSON.stringify({ private: true }, null, 2))

const npmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
const npm = fs.existsSync(npmCli) ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm')
const npmPrefix = fs.existsSync(npmCli) ? [npmCli] : []
const run = (args, options = {}) => {
  const useNpm = !options.command
  const result = spawnSync(options.command || npm, useNpm ? [...npmPrefix, ...args] : args, {
    cwd: options.cwd || root,
    env: { ...process.env, ELECTRON_SKIP_BINARY_DOWNLOAD: '1', PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1' },
    encoding: 'utf8',
    stdio: options.inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    timeout: options.timeout || 10 * 60_000,
  })
  if (result.status !== 0) throw new Error(String(result.error?.message || result.stderr || result.stdout || `${args.join(' ')} failed`))
  return String(result.stdout || '')
}

const removeWithRetry = async target => {
  let lastError = null
  for (let attempt = 0; attempt < 24; attempt += 1) {
    try {
      fs.rmSync(target, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 })
      return true
    } catch (error) {
      lastError = error
      if (!['EBUSY', 'ENOTEMPTY', 'EPERM'].includes(error?.code)) throw error
      await new Promise(resolve => setTimeout(resolve, Math.min(1_000, 150 + attempt * 75)))
    }
  }
  throw lastError
}

try {
  if (!providedTarball) {
    run([path.join(root, 'scripts', 'build-release-artifact.mjs'), temporaryRoot], { command: process.execPath, inherit: true })
  }
  const generatedManifest = providedTarball ? null : JSON.parse(fs.readFileSync(path.join(temporaryRoot, 'release-artifact-manifest.json'), 'utf8'))
  const tarball = providedTarball
    ? path.resolve(providedTarball)
    : path.join(temporaryRoot, generatedManifest.tarball)
  if (!fs.existsSync(tarball) || !fs.statSync(tarball).isFile()) throw new Error(`发布 tarball 不存在：${tarball}`)
  const installStartedAt = Date.now()
  run(['install', tarball, '--omit=dev', '--no-audit', '--no-fund', '--prefer-offline'], { cwd: installRoot, inherit: true })
  const installDurationMs = Date.now() - installStartedAt
  run([path.join(root, 'scripts', 'npm-installed-package-selftest.mjs'), installRoot, packageInfo.version], { command: process.execPath, inherit: true })
  const evidence = {
    schema: 'ccm-release-platform-evidence-v1',
    success: true,
    version: packageInfo.version,
    tarball: path.basename(tarball),
    tarball_sha256: crypto.createHash('sha256').update(fs.readFileSync(tarball)).digest('hex'),
    platform: process.platform,
    node: process.versions.node,
    installDurationMs,
    paidProviderCalls: 0,
    verified_at: new Date().toISOString(),
  }
  const evidenceFile = String(process.env.CCM_RELEASE_EVIDENCE_FILE || '').trim()
  if (evidenceFile) {
    fs.mkdirSync(path.dirname(path.resolve(evidenceFile)), { recursive: true })
    fs.writeFileSync(path.resolve(evidenceFile), `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
  }
  console.log(JSON.stringify(evidence, null, 2))
} finally {
  if (process.env.CCM_PRESERVE_RELEASE_INSTALL !== '1') {
    try {
      await removeWithRetry(temporaryRoot)
    } catch (error) {
      console.warn(`[release selftest] 成功验收后临时目录仍被占用：${temporaryRoot} (${String(error?.code || error)})`)
      process.exitCode = 1
    }
  }
}
