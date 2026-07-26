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
  fs.writeFileSync(path.join(binDir, 'gemini.cmd'), [
    '@echo off',
    'if "%1"=="--version" (echo gemini-cli test& exit /b 0)',
    'echo Please visit the following URL to authorize the application:',
    'echo https://accounts.google.com/o/oauth2/v2/auth?state=ccm-test',
    '<nul set /p="Enter the authorization code: "',
    'set /p AUTH_CODE=',
    'if "%AUTH_CODE%"=="" exit /b 1',
    'if not exist "%USERPROFILE%/.gemini" mkdir "%USERPROFILE%/.gemini"',
    'echo {"access_token":"mock"}>"%USERPROFILE%/.gemini/oauth_creds.json"',
    'echo Authentication succeeded',
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
  const gemini = path.join(binDir, 'gemini')
  fs.writeFileSync(gemini, [
    '#!/bin/sh',
    'if [ "$1" = "--version" ]; then echo "gemini-cli test"; exit 0; fi',
    'echo "Please visit the following URL to authorize the application:"',
    'echo "https://accounts.google.com/o/oauth2/v2/auth?state=ccm-test"',
    'printf "Enter the authorization code: "',
    'read AUTH_CODE',
    '[ -n "$AUTH_CODE" ] || exit 1',
    'mkdir -p "$HOME/.gemini"',
    'printf "{\\"access_token\\":\\"mock\\"}" > "$HOME/.gemini/oauth_creds.json"',
    'echo "Authentication succeeded"',
  ].join('\n'))
  fs.chmodSync(gemini, 0o755)
}

process.env.PATH = `${binDir}${path.delimiter}${process.env.PATH || ''}`

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

  const geminiStarted = settings.startAgentProviderLogin('gemini')
  let geminiSession = geminiStarted
  const codeDeadline = Date.now() + 4_000
  while (!geminiSession.requiresCode && Date.now() < codeDeadline) {
    await new Promise(resolve => setTimeout(resolve, 80))
    geminiSession = settings.getAgentProviderLoginSession('gemini', geminiStarted.sessionId)
  }
  assert.equal(geminiSession.requiresCode, true)
  assert.match(geminiSession.authUrl, /^https:\/\/accounts\.google\.com\//)
  settings.submitAgentProviderLoginCode('gemini', geminiStarted.sessionId, 'mock-google-code')
  const successDeadline = Date.now() + 4_000
  while (geminiSession.status !== 'succeeded' && Date.now() < successDeadline) {
    await new Promise(resolve => setTimeout(resolve, 80))
    geminiSession = settings.getAgentProviderLoginSession('gemini', geminiStarted.sessionId)
  }
  assert.equal(geminiSession.status, 'succeeded')
  assert.equal(fs.existsSync(path.join(testHome, '.gemini', 'oauth_creds.json')), true)
  checks.push({ name: 'Gemini browser authorization code returns only to its waiting CLI session and completes login', pass: true })

  const report = { pass: true, generatedAt: new Date().toISOString(), platform: os.platform(), checks, paidProviderCalls: 0 }
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  const report = { pass: false, generatedAt: new Date().toISOString(), checks, error: error?.stack || String(error), paidProviderCalls: 0 }
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.error(report.error)
  process.exitCode = 1
}
