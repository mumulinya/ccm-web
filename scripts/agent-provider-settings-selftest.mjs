import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const outputDir = path.join(root, 'scratch', 'agent-provider-settings-selftest')
const testHome = path.join(outputDir, 'home')
fs.mkdirSync(outputDir, { recursive: true })
if (path.resolve(testHome).startsWith(path.resolve(outputDir) + path.sep)) {
  fs.rmSync(testHome, { recursive: true, force: true })
}
fs.mkdirSync(testHome, { recursive: true })
process.env.USERPROFILE = testHome
process.env.HOME = testHome

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
  checks.push({ name: 'public settings default to CLI login and never expose Claude credentials', pass: true })

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

  const codexModels = settings.getAgentProviderModels('codex')
  assert.equal(codexModels.allowsCustom, true)
  assert.equal(codexModels.models.some(item => item.id === 'gpt-5.3-codex'), true)
  checks.push({ name: 'model catalog keeps an automatic option and supports explicit custom model IDs', pass: true })

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
  const runtimeSource = fs.readFileSync(path.join(root, 'backend/tools/runtime-tool-sync-part-01.ts'), 'utf-8')
  const catalogSource = fs.readFileSync(path.join(root, 'backend/agents/catalog.ts'), 'utf-8')
  const projectSource = fs.readFileSync(path.join(root, 'frontend/src/components/projects/useProjectManager.js'), 'utf-8')
  assert.match(apiSource, /actionMatch[\s\S]+codex\|cursor\|gemini\|opencode\|claudecode/)
  assert.match(apiSource, /installMatch[\s\S]+startAgentProviderInstall/)
  assert.match(apiSource, /modelsMatch[\s\S]+getAgentProviderModels/)
  assert.match(catalogSource, /Gemini CLI/)
  assert.match(catalogSource, /OpenCode/)
  assert.match(uiSource, /Claude Code API/)
  assert.match(uiSource, /安装 Claude Code/)
  assert.match(uiSource, /任务模型/)
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
