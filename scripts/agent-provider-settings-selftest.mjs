import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const root = path.resolve(import.meta.dirname, '..')
const outputDir = path.join(root, 'scratch', 'agent-provider-settings-selftest')
const testHome = path.join(outputDir, 'home')
const binDir = path.join(outputDir, 'bin')
fs.mkdirSync(outputDir, { recursive: true })
if (path.resolve(testHome).startsWith(path.resolve(outputDir) + path.sep)) {
  fs.rmSync(testHome, { recursive: true, force: true })
}
fs.mkdirSync(testHome, { recursive: true })
fs.mkdirSync(binDir, { recursive: true })
process.env.USERPROFILE = testHome
process.env.HOME = testHome
if (process.platform === 'win32') {
  fs.writeFileSync(path.join(binDir, 'codex.cmd'), '@echo off\r\nif "%1"=="--version" (echo codex-selftest 1.0.0& exit /b 0)\r\necho CCM_AGENT_OK\r\nexit /b 0\r\n')
  const fakeCodexEntry = path.join(binDir, 'node_modules', '@openai', 'codex', 'bin', 'codex.js')
  fs.mkdirSync(path.dirname(fakeCodexEntry), { recursive: true })
  fs.writeFileSync(fakeCodexEntry, '#!/usr/bin/env node\nif (process.argv.includes("--version")) console.log("codex-selftest 1.0.0"); else console.log("CCM_AGENT_OK");\n')
} else {
  const command = path.join(binDir, 'codex')
  fs.writeFileSync(command, '#!/bin/sh\nif [ "$1" = "--version" ]; then echo "codex-selftest 1.0.0"; exit 0; fi\necho CCM_AGENT_OK\n')
  fs.chmodSync(command, 0o755)
}
process.env.PATH = `${binDir}${path.delimiter}${process.env.PATH || ''}`

const jwt = claims => `test.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`
fs.mkdirSync(path.join(testHome, '.codex'), { recursive: true })
fs.writeFileSync(path.join(testHome, '.codex', 'auth.json'), JSON.stringify({ tokens: { id_token: jwt({ email: 'codex-user@example.test' }), access_token: 'never-expose-me' } }))
fs.writeFileSync(path.join(testHome, '.codex', 'cockpit-local-access-model-catalog.json'), JSON.stringify({ models: [
  { slug: 'account-codex-model', display_name: 'Account Codex Model', visibility: 'visible' },
  { slug: 'account-hidden-model', display_name: 'Hidden Internal Model', visibility: 'hide' },
] }))
fs.mkdirSync(path.join(testHome, '.cursor'), { recursive: true })
fs.writeFileSync(path.join(testHome, '.cursor', 'cli-config.json'), JSON.stringify({ authInfo: { email: 'cursor-user@example.test' } }))
fs.mkdirSync(path.join(testHome, '.gemini'), { recursive: true })
fs.writeFileSync(path.join(testHome, '.gemini', 'google_accounts.json'), JSON.stringify({ active: 'gemini-user@example.test' }))
fs.writeFileSync(path.join(testHome, '.gemini', 'oauth_creds.json'), JSON.stringify({ id_token: jwt({ email: 'gemini-user@example.test' }), access_token: 'never-expose-me' }))
fs.mkdirSync(path.join(testHome, '.local', 'share', 'opencode'), { recursive: true })
fs.writeFileSync(path.join(testHome, '.local', 'share', 'opencode', 'auth.json'), JSON.stringify({ openai: { type: 'oauth', accountId: 'acct_selftest', access: 'never-expose-me' } }))
const ccSwitchDir = path.join(testHome, '.cc-switch')
fs.mkdirSync(ccSwitchDir, { recursive: true })
fs.writeFileSync(path.join(ccSwitchDir, 'settings.json'), JSON.stringify({ currentProviderClaude: 'claude-provider-selftest' }))
const ccSwitchDb = new Database(path.join(ccSwitchDir, 'cc-switch.db'))
ccSwitchDb.exec('CREATE TABLE providers (id TEXT PRIMARY KEY, app_type TEXT, name TEXT, settings_config TEXT, is_current INTEGER)')
ccSwitchDb.prepare('INSERT INTO providers (id, app_type, name, settings_config, is_current) VALUES (?, ?, ?, ?, 1)').run(
  'claude-provider-selftest',
  'claude',
  'CC-Switch Selftest',
  JSON.stringify({ env: { ANTHROPIC_BASE_URL: 'https://cc-switch.example.test', ANTHROPIC_AUTH_TOKEN: 'cc-switch-secret-never-expose', ANTHROPIC_DEFAULT_SONNET_MODEL: 'claude-external-model' } }),
)
ccSwitchDb.close()

const settings = await import('../ccm-package/dist/modules/system/agent-provider-settings.js')
const kernel = await import('../ccm-package/dist/agents/execution-kernel.js')
const runtime = await import('../ccm-package/dist/agents/runtime.js')
const checks = []

try {
  const initial = settings.publicAgentProviderSettings(settings.loadAgentProviderSettings())
  assert.equal(initial.codex.authMode, 'cli_login')
  assert.equal(initial.cursor.authMode, 'cli_login')
  assert.equal(initial.gemini.authMode, 'cli_login')
  assert.equal(initial.opencode.authMode, 'cli_login')
  assert.equal('apiKey' in initial.claudecode, false)
  assert.equal(initial.claudecode.externalManaged, true)
  assert.equal(initial.claudecode.providerName, 'CC-Switch Selftest')
  assert.equal(initial.claudecode.apiUrl, 'https://cc-switch.example.test')
  assert.equal(initial.claudecode.model, 'claude-external-model')
  assert.equal(initial.claudecode.hasKey, true)
  assert.doesNotMatch(JSON.stringify(initial), /cc-switch-secret-never-expose/)
  const externalEnv = settings.getConfiguredDevelopmentAgentEnv('claudecode')
  assert.equal(externalEnv.ANTHROPIC_BASE_URL, 'https://cc-switch.example.test')
  assert.equal(externalEnv.ANTHROPIC_AUTH_TOKEN, 'cc-switch-secret-never-expose')
  settings.saveAgentProviderSettings({ claudecode: { enabled: false, syncExternal: false } })
  const externalDisabled = settings.publicAgentProviderSettings(settings.loadAgentProviderSettings())
  assert.equal(externalDisabled.claudecode.externalManaged, false)
  assert.equal(settings.getConfiguredDevelopmentAgentEnv('claudecode').ANTHROPIC_BASE_URL, '')
  checks.push({ name: 'CC-Switch current Claude Provider is projected without exposing its key and reaches runtime env', pass: true })
  checks.push({ name: 'public settings default to CLI login and never expose Claude credentials', pass: true })

  const cursorLoggedOut = settings.parseCursorAuthStatus('Not logged in. Run cursor-agent login to continue.', 0)
  const cursorLoggedIn = settings.parseCursorAuthStatus('✓ Login successful!\nLogged in (unable to fetch user details)', 0)
  const cursorFailed = settings.parseCursorAuthStatus('Logged in as stale@example.test', 1)
  assert.equal(cursorLoggedOut.loggedIn, false)
  assert.equal(cursorLoggedIn.loggedIn, true)
  assert.equal(cursorFailed.loggedIn, false)
  checks.push({ name: 'Cursor status requires positive CLI evidence and never treats Not logged in as authenticated', pass: true })

  assert.equal(settings.getAgentProviderAccountIdentity('codex'), 'codex-user@example.test')
  assert.equal(settings.getAgentProviderAccountIdentity('cursor'), 'cursor-user@example.test')
  assert.equal(settings.getAgentProviderAccountIdentity('gemini'), 'gemini-user@example.test')
  assert.equal(settings.getAgentProviderAccountIdentity('opencode'), 'openai: acct_selftest')
  assert.doesNotMatch(JSON.stringify([
    settings.getAgentProviderAccountIdentity('codex'),
    settings.getAgentProviderAccountIdentity('gemini'),
    settings.getAgentProviderAccountIdentity('opencode'),
  ]), /never-expose-me/)
  checks.push({ name: 'account projection exposes only current identity labels and never credential tokens', pass: true })

  const codexLogin = settings.parseAgentProviderLoginProgress('codex', 'Open https://auth.openai.com/codex/device\nEnter code: ABCD-EFGH')
  const cursorLogin = settings.parseAgentProviderLoginProgress('cursor', 'Open a browser and navigate to this link: https://cursor.com/loginDeepControl?challenge=test')
  const geminiLogin = settings.parseAgentProviderLoginProgress('gemini', 'Please visit the following URL to authorize the application:\nhttps://accounts.google.com/o/oauth2/v2/auth?state=test\nEnter the authorization code: ')
  const rejectedUrl = settings.parseAgentProviderLoginProgress('cursor', 'Open https://attacker.example.test/login')
  assert.equal(codexLogin.authUrl, 'https://auth.openai.com/codex/device')
  assert.equal(codexLogin.userCode, 'ABCD-EFGH')
  assert.match(cursorLogin.authUrl, /^https:\/\/cursor\.com\//)
  assert.equal(geminiLogin.awaitingCode, true)
  assert.match(geminiLogin.authUrl, /^https:\/\/accounts\.google\.com\//)
  assert.equal(rejectedUrl.authUrl, '')
  checks.push({ name: 'browser login progress exposes only allowlisted one-time URLs, device codes, and Gemini code prompts', pass: true })

  const saved = settings.saveAgentProviderSettings({
    codex: { enabled: true, model: 'gpt-5.3-codex' },
    cursor: { enabled: true, model: 'composer-test' },
    gemini: { enabled: true, model: 'gemini-test' },
    opencode: { enabled: true, model: 'provider/model-test' },
    claudecode: {
      enabled: true,
      apiUrl: 'https://gateway.example.test',
      model: 'claude-test',
      credentialType: 'auth_token',
      apiKey: 'ccm-provider-selftest-secret',
    },
  })
  const publicSaved = settings.publicAgentProviderSettings(saved)
  assert.equal(publicSaved.claudecode.hasKey, true)
  assert.equal(publicSaved.codex.model, 'gpt-5.3-codex')
  assert.equal(publicSaved.cursor.model, 'composer-test')
  assert.equal(publicSaved.gemini.model, 'gemini-test')
  assert.equal(publicSaved.opencode.model, 'provider/model-test')
  assert.equal(publicSaved.claudecode.externalManaged, false)
  assert.equal(publicSaved.claudecode.source, 'ccm')
  assert.equal('apiKey' in publicSaved.claudecode, false)
  const stored = JSON.parse(fs.readFileSync(settings.agentProviderSettingsFile(), 'utf-8'))
  assert.match(stored.claudecode.apiKey, /^ccm-secret:\/\//)
  assert.doesNotMatch(JSON.stringify(stored), /ccm-provider-selftest-secret/)
  checks.push({ name: 'Claude API secret is encrypted and redacted at rest and over public projection', pass: true })

  const env = settings.getConfiguredDevelopmentAgentEnv('claudecode')
  assert.equal(env.ANTHROPIC_BASE_URL, 'https://gateway.example.test')
  assert.equal(env.ANTHROPIC_MODEL, 'claude-test')
  assert.equal(env.ANTHROPIC_API_KEY, '')
  assert.equal(env.ANTHROPIC_AUTH_TOKEN, 'ccm-provider-selftest-secret')
  const sanitized = kernel.sanitizeExecutionEnv(env)
  assert.equal(sanitized.ANTHROPIC_AUTH_TOKEN, 'ccm-provider-selftest-secret')
  assert.equal(sanitized.ANTHROPIC_MODEL, 'claude-test')
  checks.push({ name: 'selected Claude credential type and model reach the sanitized Agent process environment', pass: true })

  const decodeArgs = command => JSON.parse(Buffer.from(command.trim().split(/\s+/).pop(), 'base64').toString('utf-8'))
  const codexArgs = decodeArgs(runtime.buildAgentCommand('codex', 'prompt.txt'))
  const cursorArgs = decodeArgs(runtime.buildAgentCommand('cursor', 'prompt.txt'))
  const claudeCommand = runtime.buildAgentCommand('claudecode', 'prompt.txt')
  const geminiArgs = decodeArgs(runtime.buildAgentCommand('gemini', 'prompt.txt'))
  const openCodeArgs = decodeArgs(runtime.buildAgentCommand('opencode', 'prompt.txt'))
  assert.deepEqual(codexArgs.slice(0, 3), ['exec', '--model', 'gpt-5.3-codex'])
  assert.equal(cursorArgs.includes('--model'), true)
  assert.equal(cursorArgs[cursorArgs.indexOf('--model') + 1], 'composer-test')
  assert.match(claudeCommand, /--model "claude-test"/)
  assert.equal(geminiArgs[geminiArgs.indexOf('--model') + 1], 'gemini-test')
  assert.equal(openCodeArgs[openCodeArgs.indexOf('--model') + 1], 'provider/model-test')
  assert.equal(openCodeArgs.includes('--auto'), true)
  checks.push({ name: 'saved model selection is passed explicitly to all five managed Agent launches', pass: true })

  const codexModels = await settings.getAgentProviderModels('codex')
  assert.equal(codexModels.allowsCustom, true)
  assert.equal(codexModels.source, 'account_catalog')
  assert.equal(codexModels.models.some(item => item.id === 'account-codex-model'), true)
  assert.equal(codexModels.models.some(item => item.id === 'account-hidden-model'), false)
  assert.equal(codexModels.models.some(item => item.id === 'gpt-5.3-codex'), false)
  checks.push({ name: 'Codex model catalog comes from the current account cache instead of a hard-coded list', pass: true })

  const decodeProbeArgs = spec => JSON.parse(Buffer.from(spec.args.at(-1), 'base64').toString('utf-8'))
  const codexProbeArgs = decodeProbeArgs(settings.buildAgentProviderTestSpec('codex', 'account-codex-model'))
  const cursorProbeArgs = decodeProbeArgs(settings.buildAgentProviderTestSpec('cursor', 'cursor-model'))
  const claudeProbeArgs = decodeProbeArgs(settings.buildAgentProviderTestSpec('claudecode', 'claude-model'))
  assert.deepEqual(codexProbeArgs.slice(0, 3), ['exec', '--model', 'account-codex-model'])
  assert.equal(codexProbeArgs.includes('read-only'), true)
  assert.equal(cursorProbeArgs.includes('ask'), true)
  assert.equal(claudeProbeArgs.includes('plan'), true)
  assert.equal(settings.parseAgentProviderTestOutput('{"message":"CCM_AGENT_OK","model":"probe-model"}').usable, true)
  assert.equal(settings.parseAgentProviderTestOutput('{"message":"not-ready"}').usable, false)
  assert.throws(() => settings.buildAgentProviderTestSpec('codex', 'model & echo unsafe'), /不支持的字符/)
  const liveProbe = await settings.testAgentProvider('codex', 'account-codex-model')
  assert.equal(liveProbe.usable, true)
  assert.equal(liveProbe.model, 'account-codex-model')
  assert.equal('stdout' in liveProbe, false)
  assert.equal('stderr' in liveProbe, false)
  checks.push({ name: 'Agent test probes execute the selected model in read-only or planning mode, require the health marker, and hide raw output', pass: true })

  assert.equal(settings.usesCodexCliLogin(), true)
  assert.equal(settings.isDevelopmentAgentEnabled('codex'), true)
  assert.equal(settings.isDevelopmentAgentEnabled('cursor'), true)
  assert.equal(settings.isDevelopmentAgentEnabled('claudecode'), true)
  assert.equal(settings.isDevelopmentAgentEnabled('gemini'), true)
  assert.equal(settings.isDevelopmentAgentEnabled('opencode'), true)
  checks.push({ name: 'all five managed project Agent runtimes resolve their explicit authentication source', pass: true })

  assert.throws(() => settings.saveAgentProviderSettings({ claudecode: { apiUrl: 'file:///secret' } }), /http:\/\/|https:\/\//)
  checks.push({ name: 'non-HTTP Claude provider endpoints are rejected', pass: true })

  const apiSource = fs.readFileSync(path.join(root, 'backend/modules/system/settings.ts'), 'utf-8')
  const uiSource = fs.readFileSync(path.join(root, 'frontend/src/components/settings/SettingsAgentProvidersPanel.vue'), 'utf-8')
  const runtimeSource = fs.readFileSync(path.join(root, 'backend/tools/runtime-tool-sync.ts'), 'utf-8')
  const catalogSource = fs.readFileSync(path.join(root, 'backend/agents/catalog.ts'), 'utf-8')
  const projectSource = fs.readFileSync(path.join(root, 'frontend/src/components/projects/useProjectManager.js'), 'utf-8')
  const appSource = fs.readFileSync(path.join(root, 'frontend/src/App.vue'), 'utf-8')
  const viteSource = fs.readFileSync(path.join(root, 'frontend/vite.config.js'), 'utf-8')
  assert.match(apiSource, /actionMatch[\s\S]+codex\|cursor\|gemini\|opencode\|claudecode/)
  assert.match(apiSource, /installMatch[\s\S]+startAgentProviderInstall/)
  assert.match(apiSource, /modelsMatch[\s\S]+getAgentProviderModels/)
  assert.match(catalogSource, /Gemini CLI/)
  assert.match(catalogSource, /OpenCode/)
  assert.match(uiSource, /Claude Code API/)
  assert.match(uiSource, /安装 Claude Code/)
  assert.match(uiSource, /任务模型/)
  assert.match(uiSource, /当前账号/)
  assert.match(uiSource, /hasModelCatalog/)
  assert.match(uiSource, /<select[\s\S]+modelSelectionValue/)
  assert.match(uiSource, /createLoginPopup/)
  assert.match(uiSource, /openLoginUrl/)
  assert.match(uiSource, /submitLoginCode/)
  assert.match(uiSource, /网页登录已启动/)
  assert.match(uiSource, /网页授权码/)
  assert.match(uiSource, /provider !== 'claudecode'[\s\S]+authState !== 'logged_in'/)
  assert.match(uiSource, /agent-provider-auth-detail/)
  assert.match(apiSource, /startAgentProviderLogin/)
  assert.match(apiSource, /agent-providers[\s\S]+testAgentProvider/)
  assert.match(apiSource, /getAgentProviderLoginSession/)
  assert.match(apiSource, /submitAgentProviderLoginCode/)
  const providerSource = fs.readFileSync(path.join(root, 'backend/modules/system/agent-provider-settings.ts'), 'utf-8')
  const ccSwitchSource = fs.readFileSync(path.join(root, 'backend/modules/system/cc-switch-provider.ts'), 'utf-8')
  assert.match(providerSource, /LOGIN_SESSION_TTL_MS/)
  assert.match(providerSource, /NO_OPEN_BROWSER/)
  assert.match(providerSource, /NO_BROWSER/)
  assert.match(providerSource, /AGENT_TEST_TIMEOUT_MS/)
  assert.match(providerSource, /CCM_AGENT_OK/)
  assert.match(providerSource, /resolveEffectiveClaudeProviderSettings/)
  assert.match(ccSwitchSource, /currentProviderClaude/)
  assert.match(ccSwitchSource, /readonly: true/)
  assert.match(uiSource, /provider-test-button/)
  assert.match(uiSource, /可能产生少量 Provider 用量/)
  assert.match(uiSource, /正在跟随 CC-Switch/)
  assert.match(uiSource, /由 CC-Switch 管理，不复制到 CCM/)
  assert.match(providerSource, /--device-auth/)
  assert.match(providerSource, /timeout: 8_000/)
  assert.doesNotMatch(providerSource, /launchVisibleWindowsLoginTerminal/)
  assert.match(appSource, /v\{\{ appVersion \}\}/)
  assert.doesNotMatch(appSource, /v1\.0\.\d+/)
  assert.match(viteSource, /__CCM_VERSION__/)
  assert.match(runtimeSource, /usesCodexCliLogin\(\)/)
  assert.doesNotMatch(projectSource, /fallbackAgents/)
  assert.match(projectSource, /api\('\/api\/agents'\)/)
  checks.push({ name: 'settings UI, five-provider actions, and registry-driven project choices are wired to production paths', pass: true })

  const report = { pass: true, generatedAt: new Date().toISOString(), checks, paidProviderCalls: 0 }
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  const report = { pass: false, generatedAt: new Date().toISOString(), checks, error: error?.stack || String(error), paidProviderCalls: 0 }
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.error(report.error)
  process.exitCode = 1
}
