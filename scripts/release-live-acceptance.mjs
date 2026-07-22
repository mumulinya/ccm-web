import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const root = path.resolve(import.meta.dirname, '..')
const require = createRequire(import.meta.url)
const args = process.argv.slice(2)
const hasFlag = name => args.includes(name)
const option = (name, fallback = '') => {
  const index = args.indexOf(name)
  return index >= 0 && args[index + 1] && !args[index + 1].startsWith('--') ? args[index + 1] : fallback
}
const live = hasFlag('--live')
const requireAll = hasFlag('--require-all')
const liveFeishu = hasFlag('--live-feishu')
const allProviders = ['codex', 'claudecode', 'cursor', 'gemini', 'opencode']
const requested = option('--providers', 'all').split(',').map(value => value.trim().toLowerCase()).filter(Boolean)
const providers = requested.includes('all') ? allProviders : [...new Set(requested)].filter(value => allProviders.includes(value))
if (!providers.length) throw new Error('没有可验收的 Provider；使用 --providers codex,claudecode,cursor,gemini,opencode')

const settingsModule = require('../ccm-package/dist/modules/system/agent-provider-settings.js')
const runtimeModule = require('../ccm-package/dist/agents/runtime.js')
const kernelModule = require('../ccm-package/dist/agents/execution-kernel.js')
const statuses = settingsModule.getAgentProviderStatuses(true)
const configured = settingsModule.loadAgentProviderSettings()
const report = {
  schema: 'ccm-release-live-acceptance-v1',
  startedAt: new Date().toISOString(),
  mode: live ? 'live' : 'preflight',
  platform: process.platform,
  node: process.version,
  providers: [],
  feishu: { requested: liveFeishu, status: liveFeishu ? 'pending' : 'not_requested' },
  paidProviderCalls: 0,
  pass: false,
  releaseReady: false,
}

const directoryDigest = directory => {
  const rows = []
  const walk = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name)
      if (entry.isDirectory()) walk(absolute)
      else rows.push(`${path.relative(directory, absolute).replaceAll(path.sep, '/')}:${crypto.createHash('sha256').update(fs.readFileSync(absolute)).digest('hex')}`)
    }
  }
  walk(directory)
  return crypto.createHash('sha256').update(rows.sort().join('\n')).digest('hex')
}

for (const provider of providers) {
  const status = statuses[provider] || {}
  const selectedModel = String(configured?.[provider]?.model || '')
  const ready = status.installed === true && (provider === 'claudecode' ? status.authState === 'configured' : status.authState === 'logged_in')
  const version = runtimeModule.captureAgentRuntimeVersionSnapshot(provider)
  const row = {
    provider,
    installed: status.installed === true,
    authState: String(status.authState || 'unknown'),
    selectedModel,
    versionStatus: version.status,
    semanticVersion: version.semanticVersion,
    readiness: ready ? 'ready' : 'blocked',
    live: live ? 'pending' : 'not_requested',
  }
  report.providers.push(row)
  if (!live || !ready) {
    if (live) row.live = 'skipped_not_ready'
    continue
  }

  const fixture = path.join(root, 'scratch', 'release-live-acceptance', provider)
  fs.rmSync(fixture, { recursive: true, force: true })
  fs.mkdirSync(fixture, { recursive: true })
  const marker = `CCM_LIVE_ACCEPTANCE_${provider.toUpperCase()}_${Date.now().toString(36)}`
  const promptFile = path.join(fixture, 'acceptance-prompt.txt')
  fs.writeFileSync(promptFile, `Release acceptance only. Do not use tools, access the network beyond the model request, or modify any file. Reply with exactly this marker and nothing else: ${marker}\n`, 'utf8')
  const before = directoryDigest(fixture)
  const command = runtimeModule.buildAgentCommand(provider, promptFile, {})
  const env = {
    ...process.env,
    ...settingsModule.getConfiguredDevelopmentAgentEnv(provider),
    CCM_CLAUDE_PERMISSION_MODE: 'plan',
    CCM_CODEX_SANDBOX: 'read-only',
  }
  try {
    const outcome = await kernelModule.runManagedCommand({
      taskId: `release-live-${provider}-${Date.now().toString(36)}`,
      command,
      cwd: fixture,
      env,
      timeoutMs: Number(option('--provider-timeout-ms', '180000')),
      maxOutputBytes: 512 * 1024,
      agentType: provider,
      source: 'release-live-acceptance',
      commandLabel: runtimeModule.getAgentCommandLabel(provider),
      title: `${provider} release acceptance`,
    })
    const raw = `${outcome.stdout || ''}\n${outcome.stderr || ''}`
    const normalized = runtimeModule.normalizeAgentCommandOutput(provider, raw, { persistSession: false })
    const failure = runtimeModule.detectAgentCommandFailure(provider, raw, outcome.exitCode, '')
    const unchanged = before === directoryDigest(fixture)
    const markerObserved = String(normalized?.output || normalized || raw).includes(marker)
    row.live = !failure?.failed && markerObserved && unchanged ? 'passed' : 'failed'
    row.evidence = {
      markerObserved,
      workspaceUnchanged: unchanged,
      outputBytes: Buffer.byteLength(raw),
      outputChecksum: crypto.createHash('sha256').update(raw).digest('hex'),
      exitCode: outcome.exitCode,
    }
    report.paidProviderCalls += 1
  } catch (error) {
    row.live = 'failed'
    const errorText = String(error?.message || error)
    row.errorEvidence = {
      code: String(error?.code || 'provider_execution_failed').slice(0, 80),
      bytes: Buffer.byteLength(errorText),
      checksum: crypto.createHash('sha256').update(errorText).digest('hex'),
    }
    report.paidProviderCalls += 1
  }
}

const baseUrl = option('--base-url', process.env.CCM_BASE_URL || 'http://127.0.0.1:3080').replace(/\/$/, '')
if (liveFeishu) {
  const cookie = option('--auth-cookie', process.env.CCM_AUTH_COOKIE || '')
  const headers = cookie ? { Cookie: cookie } : {}
  try {
    const healthResponse = await fetch(`${baseUrl}/api/feishu/health/probe`, { method: 'POST', headers })
    const health = await healthResponse.json()
    const permissionsResponse = await fetch(`${baseUrl}/api/tasks/permission-requests?origin_type=global`, { headers })
    const permissions = await permissionsResponse.json()
    const windowMs = Math.max(5, Number(option('--feishu-window-minutes', '30'))) * 60_000
    const recent = value => value && Date.now() - Date.parse(value) <= windowMs
    const recentDecision = (permissions.requests || []).find(item => recent(item.decidedAt) && ['approved', 'rejected', 'consumed'].includes(item.state))
    const inboundRecent = recent(health?.inbound?.last_at)
    const outboundRecent = recent(health?.outbound?.last_at)
    report.feishu = {
      requested: true,
      status: healthResponse.ok && health.healthy && inboundRecent && outboundRecent && !!recentDecision ? 'passed' : 'failed',
      healthy: health.healthy === true,
      apiProbe: health.api_probe?.success === true,
      inboundRecent,
      outboundRecent,
      permissionDecisionObserved: !!recentDecision,
      permissionState: recentDecision?.state || '',
      permissionId: recentDecision?.id || '',
      windowMinutes: windowMs / 60_000,
    }
  } catch (error) {
    report.feishu = { requested: true, status: 'failed', error: String(error?.message || error).slice(0, 300) }
  }
}

const providerFailures = report.providers.filter(row => live ? row.live !== 'passed' : requireAll && row.readiness !== 'ready')
const readinessComplete = report.providers.every(row => row.readiness === 'ready')
report.completedAt = new Date().toISOString()
report.pass = providerFailures.length === 0 && (!liveFeishu || report.feishu.status === 'passed')
report.releaseReady = live
  ? report.pass && report.providers.every(row => row.live === 'passed') && (!liveFeishu || report.feishu.status === 'passed')
  : readinessComplete
const reportFile = path.join(root, 'scratch', 'release-live-acceptance-report.json')
fs.mkdirSync(path.dirname(reportFile), { recursive: true })
fs.writeFileSync(reportFile, `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify({ ...report, reportFile: path.relative(root, reportFile).replaceAll(path.sep, '/') }, null, 2))
if (!report.pass && (live || requireAll || liveFeishu)) process.exitCode = 1
