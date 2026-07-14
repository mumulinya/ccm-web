import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const baseUrl = String(process.env.CCM_BASE_URL || 'http://127.0.0.1:3082').replace(/\/+$/, '')
const outputDir = path.join(root, 'scratch', 'settings-production-selftest')
fs.mkdirSync(outputDir, { recursive: true })
const checks = []

const read = file => fs.readFileSync(path.join(root, file), 'utf-8')
const request = async (pathname, options = {}) => {
  const response = await fetch(`${baseUrl}${pathname}`, options)
  return { response, data: await response.json().catch(() => ({})) }
}

try {
  const settingsSource = read('frontend/src/components/settings/Settings.vue')
  const modelSource = read('frontend/src/components/settings/SettingsModelPanel.vue')
  const systemSource = read('frontend/src/components/settings/SettingsSystemPanel.vue')
  assert.doesNotMatch(settingsSource, /orchestratorDiagnostics|dailyDev|loadKnowledgeFiles|testOrchestrator|clearSystemCache/)
  assert.match(modelSource, /connection-test/)
  assert.match(modelSource, /全局 Agent/)
  assert.match(modelSource, /群聊主 Agent/)
  assert.match(modelSource, /音乐 Agent/)
  assert.match(systemSource, /Agent 配置、项目、任务、会话及知识库不会被删除/)
  assert.doesNotMatch(systemSource, /localStorage\.clear/)
  checks.push({ name: 'settings source removes hidden diagnostics and uses scoped reset', pass: true })

  const status = await request('/api/system/settings-status')
  assert.equal(status.response.ok, true)
  assert.equal(status.data.success, true)
  assert.equal(status.data.service.status, 'online')
  assert.equal(status.data.version, JSON.parse(read('package.json')).version)
  assert.equal(status.data.credentials.protected, true)
  checks.push({ name: 'system status exposes real version, process and credential protection', pass: true })

  const modelConfig = await request('/api/orchestrator/config')
  assert.equal(modelConfig.response.ok, true)
  assert.equal(modelConfig.data.success, true)
  assert.equal('apiKey' in modelConfig.data.config, false)
  assert.deepEqual(modelConfig.data.config.consumers, ['global-agent', 'group-main-agent', 'music-agent'])
  assert.equal(modelConfig.data.config.credentialProtected, modelConfig.data.config.hasKey)
  checks.push({ name: 'public unified model config is redacted and declares all consumers', pass: true })

  const invalidModelConfig = await request('/api/orchestrator/config', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiUrl: 'file:///tmp/model' })
  })
  assert.equal(invalidModelConfig.response.status, 400)
  assert.match(invalidModelConfig.data.error, /http:\/\/|https:\/\//)
  checks.push({ name: 'unified model API rejects non-HTTP provider URLs', pass: true })

  const feishu = await request('/api/feishu/config')
  assert.equal(feishu.response.ok, true)
  assert.equal(feishu.data.config.webhook_url === '' || feishu.data.config.webhook_url === '******', true)
  assert.equal(feishu.data.config.control_bot_app_secret === '' || feishu.data.config.control_bot_app_secret === '******', true)
  checks.push({ name: 'feishu settings API never returns channel secrets', pass: true })

  const configFile = path.join(os.homedir(), '.cc-connect', 'group-orchestrator-config.json')
  const stored = JSON.parse(fs.readFileSync(configFile, 'utf-8'))
  assert.equal(!stored.apiKey || String(stored.apiKey).startsWith('ccm-secret://'), true)
  checks.push({ name: 'legacy unified model key migrated to encrypted credential reference', pass: true })

  if (process.env.CCM_SETTINGS_SKIP_REAL_MODEL !== '1' && modelConfig.data.config.hasKey) {
    const modelTest = await request('/api/orchestrator/connection-test', { method: 'POST' })
    assert.equal(modelTest.response.ok, true, modelTest.data.message || 'real model connection failed')
    assert.equal(modelTest.data.success, true)
    assert.equal(modelTest.data.consumers.every(item => item.ready === true), true)
    checks.push({ name: 'real unified model connection serves all three agent consumers', pass: true })
  }

  const report = { pass: true, generatedAt: new Date().toISOString(), baseUrl, checks }
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  const report = { pass: false, generatedAt: new Date().toISOString(), baseUrl, checks, error: error?.stack || String(error) }
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.error(report.error)
  process.exitCode = 1
}
