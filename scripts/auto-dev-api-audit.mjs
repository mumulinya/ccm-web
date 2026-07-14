import fs from 'node:fs'

const baseUrl = process.env.CCM_AUTO_DEV_URL || 'http://127.0.0.1:3082'
const routeSource = fs.readFileSync('backend/modules/collaboration/orchestrator-routes.ts', 'utf8')
const cronSource = fs.readFileSync('backend/modules/scheduling/cron.ts', 'utf8')

async function readJson(pathname, timeoutMs = 45_000) {
  const response = await fetch(`${baseUrl}${pathname}`, { signal: AbortSignal.timeout(timeoutMs) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.error || data.success === false) {
    throw new Error(`${pathname}: ${data.error || data.message || `HTTP ${response.status}`}`)
  }
  return data
}

try {
  const [overview, diagnostics, feishu, journalAudit, journalEvents, journalEdgeEvents] = await Promise.all([
    readJson('/api/auto-dev/overview'),
    readJson('/api/orchestrator/diagnostics'),
    readJson('/api/feishu/config'),
    readJson('/api/auto-dev/work-journal/audit'),
    readJson('/api/auto-dev/work-journal/events?limit=5'),
    readJson('/api/auto-dev/work-journal/events?start=not-a-date&end=also-invalid&limit=not-a-number'),
  ])

  const checks = {
    overviewContract: !!overview.today
      && Array.isArray(overview.reports)
      && Array.isArray(overview.weekly_reports)
      && Array.isArray(overview.daily_dev_jobs)
      && !!overview.backlog,
    diagnosticsContract: !!diagnostics.autopilot
      && typeof diagnostics.autopilot.mode === 'string'
      && !!diagnostics.autopilot.counts
      && Array.isArray(diagnostics.autopilot.next_actions),
    feishuContract: !!feishu.config && typeof feishu.config.notification_ready === 'boolean',
    evidenceReportContract: overview.today?.schema === 'ccm-evidence-work-report-v2'
      && overview.today?.immutable_source === true
      && !!overview.today?.ownership
      && !!overview.today?.evidence_summary
      && Array.isArray(overview.today?.event_ids),
    journalOverviewContract: overview.journal?.append_only === true
      && Number.isFinite(overview.journal?.total)
      && !!overview.journal?.source_counts
      && !!overview.journal?.actor_counts,
    journalAuditContract: journalAudit.schema === 'ccm-work-journal-audit-v1'
      && journalAudit.append_only === true
      && journalAudit.auto_cleanup === false
      && journalAudit.self_test?.pass === true,
    journalQueryContract: Array.isArray(journalEvents.events)
      && journalEvents.count === journalEvents.events.length
      && journalEvents.events.length <= 5,
    journalQueryBounds: Array.isArray(journalEdgeEvents.events)
      && journalEdgeEvents.count === journalEdgeEvents.events.length
      && journalEdgeEvents.events.length <= 200,
    autopilotRunRoute: routeSource.includes('pathname === "/api/orchestrator/daily-dev-autopilot/run"')
      && routeSource.includes('runDailyDevAutopilotOnce(ctx'),
    reportRoutes: [
      '/api/auto-dev/overview',
      '/api/auto-dev/report/generate',
      '/api/auto-dev/weekly-report/generate',
      '/api/auto-dev/notification/config',
      '/api/auto-dev/notification/send',
      '/api/auto-dev/work-journal/audit',
      '/api/auto-dev/work-journal/events',
    ].every(route => cronSource.includes(route)),
  }
  const pass = Object.values(checks).every(Boolean)
  console.log(JSON.stringify({
    pass,
    checks,
    runtime: {
      readiness: diagnostics.readiness,
      autopilotMode: diagnostics.autopilot.mode,
      reports: overview.reports.length,
      weeklyReports: overview.weekly_reports.length,
      dailyDevJobs: overview.daily_dev_jobs.length,
      notificationReady: feishu.config.notification_ready,
      journalEvents: overview.journal.total,
      reportEvidence: overview.today.evidence_summary,
    },
  }, null, 2))
  if (!pass) process.exitCode = 1
} catch (error) {
  console.error(JSON.stringify({ pass: false, error: error.message }, null, 2))
  process.exitCode = 1
}
