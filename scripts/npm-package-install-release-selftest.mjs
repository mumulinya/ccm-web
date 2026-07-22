import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const packageInfo = JSON.parse(fs.readFileSync(path.join(root, 'ccm-package', 'package.json'), 'utf8'))
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

try {
  const packed = JSON.parse(run(['pack', './ccm-package', '--ignore-scripts', '--json', '--pack-destination', temporaryRoot]))
  const tarball = path.join(temporaryRoot, packed[0].filename)
  run(['install', tarball, '--omit=dev', '--no-audit', '--no-fund', '--prefer-offline'], { cwd: installRoot, inherit: true })
  run([path.join(root, 'scripts', 'npm-installed-package-selftest.mjs'), installRoot, packageInfo.version], { command: process.execPath, inherit: true })
  console.log(JSON.stringify({ success: true, version: packageInfo.version, platform: process.platform, node: process.version, paidProviderCalls: 0 }, null, 2))
} finally {
  if (process.env.CCM_PRESERVE_RELEASE_INSTALL !== '1') fs.rmSync(temporaryRoot, { recursive: true, force: true })
}
