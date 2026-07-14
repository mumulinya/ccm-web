import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const page = read('frontend/src/components/tools/AutoDevOps.vue')
const report = read('frontend/src/components/auto-dev/AutoDevReportDocument.vue')
const app = read('frontend/src/App.vue')
const renderRegression = read('scripts/auto-dev-render-regression.mjs')
const journal = read('backend/modules/scheduling/work-journal.ts')
const cron = read('backend/modules/scheduling/cron.ts')
const cronReports = read('backend/modules/scheduling/cron-dev-reports.ts')
const packageJson = read('package.json')

const checks = {
  threeUserViews: ['overview', 'reports', 'notifications'].every(view => page.includes(`{ id: '${view}'`))
    && page.includes("activeView === 'overview'")
    && page.includes("activeView === 'reports'"),
  realAutopilotConnected: page.includes("fetch('/api/orchestrator/daily-dev-autopilot/run'")
    && page.includes("fetch('/api/orchestrator/diagnostics'")
    && page.includes('continue_gaps: true')
    && page.includes('auto_execute: true'),
  cronOperationsRemoved: !page.includes("fetch('/api/cron/create'")
    && !page.includes("fetch('/api/cron/update'")
    && !page.includes("fetch('/api/cron/run'")
    && !page.includes('createDailyJob')
    && !page.includes('class="job-card"'),
  cronSummaryNavigates: page.includes("emit('navigate', { tab: 'cron' })")
    && app.includes('<AutoDevOps @navigate="handleWorkbenchNavigate" />'),
  friendlyReportRendering: page.includes('<AutoDevReportDocument')
    && page.includes('<summary>技术详情</summary>')
    && page.includes('sanitizeReport')
    && !page.includes('<pre class="report-content"'),
  safeStructuredReportParser: report.includes("type: 'heading'")
    && report.includes("type: 'list'")
    && report.includes("type: 'paragraph'")
    && !report.includes('v-html'),
  singleScrollResponsiveLayout: page.includes('.auto-dev-page {')
    && page.includes('overflow: auto')
    && page.includes('@media (max-width: 640px)')
    && !page.includes('.ops-main, .ops-side'),
  liveOverviewRefresh: page.includes("window.setInterval(() => loadOverview({ silent: true }), 15_000)")
    && page.includes('summary.running_tasks'),
  viewSwitchResetsScroll: page.includes('function switchView(viewId)')
    && page.includes("pageRoot.value?.scrollTo({ top: 0, left: 0 })")
    && page.includes('@click="switchView(view.id)"'),
  renderRegressionRegistered: packageJson.includes('test:auto-dev-render')
    && renderRegression.includes('assertNoHorizontalOverflow')
    && renderRegression.includes('assertNoPanelOverlap')
    && renderRegression.includes('mobileToggleWidths')
    && renderRegression.includes('03-weekly-report-desktop.png')
    && renderRegression.includes('07-weekly-report-mobile.png')
    && renderRegression.includes('08-notifications-mobile.png'),
  evidenceDrivenReports: journal.includes('ccm-work-journal-event-v1')
    && journal.includes('ccm-evidence-work-report-v2')
    && journal.includes('generateEvidenceDailyReport')
    && journal.includes('generateEvidenceWeeklyReport')
    && journal.includes('runWorkJournalSelfTest'),
  journalAuditRoutes: cron.includes('/api/auto-dev/work-journal/audit')
    && cron.includes('/api/auto-dev/work-journal/events')
    && cron.includes('getWorkJournalAudit({ sync: false })'),
  evidenceSummaryVisible: page.includes('class="evidence-strip"')
    && page.includes('工作事件')
    && page.includes('强证据')
    && page.includes('工作归属')
    && page.includes('reportOwnership.test_agent_actions'),
  technicalEvidenceCollapsed: page.includes('<summary>技术详情</summary>')
    && page.includes('reportTechnicalDetails')
    && page.includes('immutable_source'),
  historicalSnapshotsImmutableByDefault: cronReports.includes('options.force !== true && dateKey < localDateKey()')
    && cronReports.includes('options.force !== true && range.end_key < localDateKey()')
    && cron.includes('{ force: payload.force === true }'),
}

const pass = Object.values(checks).every(Boolean)
console.log(JSON.stringify({ pass, checks }, null, 2))
if (!pass) process.exitCode = 1
