import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const backendRoot = path.join(root, 'backend')
const baseUrl = process.env.CCM_TASK_DISPATCH_URL || 'http://127.0.0.1:3082'

const routeContracts = [
  '/api/agent-runs',
  '/api/agent-runs/cancel',
  '/api/orchestrator/agent-cli-probe/batch',
  '/api/orchestrator/diagnostics',
  '/api/reliability/traces',
  '/api/tasks',
  '/api/tasks/bulk',
  '/api/tasks/cancel',
  '/api/tasks/continue',
  '/api/tasks/continue-from-gaps',
  '/api/tasks/create',
  '/api/tasks/create-daily-dev',
  '/api/tasks/daily-dev-backlog',
  '/api/tasks/daily-dev-backlog/dispatch',
  '/api/tasks/daily-dev-backlog/dispatch-ready',
  '/api/tasks/daily-dev-backlog/import-shared',
  '/api/tasks/daily-dev-backlog/status',
  '/api/tasks/delete',
  '/api/tasks/execution-dashboard',
  '/api/tasks/execution/cleanup',
  '/api/tasks/execution/merge',
  '/api/tasks/execution/rollback',
  '/api/tasks/executions',
  '/api/tasks/logs',
  '/api/tasks/purge',
  '/api/tasks/queue',
  '/api/tasks/queue-batch',
  '/api/tasks/queue/resume',
  '/api/tasks/queue/status',
  '/api/tasks/restore',
  '/api/tasks/retry',
  '/api/tasks/retry-runtime-failures',
  '/api/tasks/runtime-debt/cleanup',
  '/api/tasks/update',
  '/api/tasks/watchdog',
  '/api/tasks/watchdog/resume',
]

function collectSource(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).map(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return collectSource(full)
    if (entry.isFile() && /\.(ts|js)$/.test(entry.name)) return fs.readFileSync(full, 'utf8')
    return ''
  }).join('\n')
}

const backendSource = collectSource(backendRoot)
const missingRoutes = routeContracts.filter(route => !backendSource.includes(route))

const liveContracts = [
  { path: '/api/tasks', check: data => Array.isArray(data.tasks), summary: data => ({ tasks: data.tasks.length }) },
  { path: '/api/tasks/execution-dashboard?limit=12', check: data => data.success === true && Array.isArray(data.items), summary: data => ({ items: data.items.length }) },
  { path: '/api/tasks/queue/status', check: data => Number.isFinite(Number(data.total_queued)), summary: data => ({ queued: Number(data.total_queued || 0) }) },
  { path: '/api/tasks/watchdog', check: data => Array.isArray(data.stale_pending) && Array.isArray(data.runtime_failed), summary: data => ({ stale: data.stale_pending.length, failed: data.runtime_failed.length }) },
  { path: '/api/tasks/daily-dev-backlog', check: data => data.success === true && Array.isArray(data.items), summary: data => ({ items: data.items.length }) },
  { path: '/api/agent-runs', check: data => data.success === true && Array.isArray(data.runs), summary: data => ({ runs: data.runs.length }) },
  { path: '/api/tasks/replay?limit=5', check: data => data.success === true && data.index && typeof data.index === 'object', summary: data => ({ replayAvailable: true }) },
]

const live = []
for (const contract of liveContracts) {
  try {
    const response = await fetch(`${baseUrl}${contract.path}`, { signal: AbortSignal.timeout(15_000) })
    const data = await response.json()
    const pass = response.ok && contract.check(data)
    live.push({ path: contract.path, pass, status: response.status, ...contract.summary(data) })
  } catch (error) {
    live.push({ path: contract.path, pass: false, error: error.message })
  }
}

const pass = missingRoutes.length === 0 && live.every(item => item.pass)
console.log(JSON.stringify({
  pass,
  routeContracts: routeContracts.length,
  missingRoutes,
  live,
}, null, 2))
if (!pass) process.exitCode = 1
