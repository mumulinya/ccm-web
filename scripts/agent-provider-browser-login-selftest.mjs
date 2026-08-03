import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const outputDir = path.join(root, 'scratch', 'agent-provider-browser-login-selftest')
const testHome = path.join(outputDir, 'home')
const binDir = path.join(outputDir, 'bin')
fs.rmSync(outputDir, { recursive: true, force: true })
fs.mkdirSync(testHome, { recursive: true })
fs.mkdirSync(binDir, { recursive: true })
fs.mkdirSync(path.join(testHome, '.gemini'), { recursive: true })
fs.writeFileSync(path.join(testHome, '.gemini', 'oauth_creds.json'), JSON.stringify({ access_token: 'stale-login' }))

process.env.HOME = testHome
process.env.USERPROFILE = testHome
delete process.env.GEMINI_API_KEY
delete process.env.GOOGLE_API_KEY
delete process.env.GOOGLE_APPLICATION_CREDENTIALS

if (process.platform === 'win32') {
  fs.writeFileSync(path.join(binDir, 'codex.cmd'), [
    '@echo off',
    'if "%1"=="--version" (echo codex-cli test& exit /b 0)',
    'if "%1"=="login" (',
    '  echo Please visit https://auth.openai.com/codex/device',
    '  echo Enter code: TEST-CODE',
    '  ping 127.0.0.1 -n 3 ^>nul',
    '  exit /b 1',
    ')',
    'exit /b 1',
  ].join('\r\n'))
  fs.writeFileSync(path.join(binDir, 'agy.cmd'), [
    '@echo off',
    'if "%1"=="--version" (echo agy 1.1.9& exit /b 0)',
    'echo Antigravity interactive login',
    'exit /b 0',
  ].join('\r\n'))
} else {
  const command = path.join(binDir, 'codex')
  fs.writeFileSync(command, [
    '#!/bin/sh',
    'if [ "$1" = "--version" ]; then echo "codex-cli test"; exit 0; fi',
    'echo "Please visit https://auth.openai.com/codex/device"',
    'echo "Enter code: TEST-CODE"',
    'sleep 2',
    'exit 1',
  ].join('\n'))
  fs.chmodSync(command, 0o755)
  const gemini = path.join(binDir, 'agy')
  fs.writeFileSync(gemini, [
    '#!/bin/sh',
    'if [ "$1" = "--version" ]; then echo "agy 1.1.9"; exit 0; fi',
    'echo "Antigravity interactive login"',
  ].join('\n'))
  fs.chmodSync(gemini, 0o755)
}

process.env.PATH = `${binDir}${path.delimiter}${process.env.PATH || ''}`
process.env.CCM_ANTIGRAVITY_CLI_COMMAND = process.platform === 'win32' ? path.join(binDir, 'agy.cmd') : path.join(binDir, 'agy')
process.env.CCM_ANTIGRAVITY_DISABLE_INTERACTIVE_LAUNCH = '1'

const settings = await import('../ccm-package/dist/modules/system/agent-provider-settings.js')
const checks = []

try {
  const started = settings.startAgentProviderLogin('codex')
  assert.equal(started.browser, true)
  assert.match(started.sessionId, /^auth_[a-f0-9]+$/)
  checks.push({ name: 'login action creates a browser authentication session', pass: true })

  let session = started
  const deadline = Date.now() + 4_000
  while (!session.authUrl && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 80))
    session = settings.getAgentProviderLoginSession('codex', started.sessionId)
  }
  assert.equal(session.authUrl, 'https://auth.openai.com/codex/device')
  assert.equal(session.userCode, 'TEST-CODE')
  assert.equal(['awaiting_browser', 'failed'].includes(session.status), true)
  assert.equal('output' in session, false)
  assert.equal('pid' in session, false)
  checks.push({ name: 'CLI output becomes a safe browser URL and device code without leaking raw process output', pass: true })

  assert.throws(
    () => settings.getAgentProviderLoginSession('cursor', started.sessionId),
    /不存在|过期/,
  )
  checks.push({ name: 'login session is bound to the exact provider', pass: true })

  const antigravityStarted = settings.startAgentProviderLogin('gemini')
  assert.equal(antigravityStarted.browser, false)
  assert.equal(antigravityStarted.manual, true)
  assert.equal('sessionId' in antigravityStarted, false)
  assert.match(antigravityStarted.command, /agy/i)
  assert.equal(fs.existsSync(path.join(testHome, '.gemini', 'oauth_creds.json')), true)
  assert.throws(() => settings.submitAgentProviderLoginCode('gemini', 'auth_missing', 'legacy-code'), /不存在|过期/)
  checks.push({ name: 'Antigravity authentication stays inside the official interactive CLI and CCM never captures Google authorization codes', pass: true })

  const providerPanelSource = fs.readFileSync(
    path.join(root, 'frontend', 'src', 'components', 'settings', 'SettingsAgentProvidersPanel.vue'),
    'utf-8',
  )
  assert.match(providerPanelSource, /finally\s*\{\s*clearLoginSession\(provider\)/)
  assert.match(providerPanelSource, /data\.status === 'failed'[\s\S]{0,180}closeLoginPopup\(provider\)/)
  assert.match(providerPanelSource, /delete nextTestResults\[provider\]/)
  checks.push({ name: 'the settings page clears completed login prompts and stale test results before a new login', pass: true })

  const report = { pass: true, generatedAt: new Date().toISOString(), platform: os.platform(), checks, paidProviderCalls: 0 }
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  const report = { pass: false, generatedAt: new Date().toISOString(), checks, error: error?.stack || String(error), paidProviderCalls: 0 }
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.error(report.error)
  process.exitCode = 1
}
