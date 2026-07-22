import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

const channelSource = read('backend/modules/collaboration/feishu-channel.ts')
const routesSource = read('backend/modules/collaboration/feishu-routes.ts')
const feishuSource = read('backend/modules/collaboration/feishu.ts')
const globalAgentSource = read('backend/modules/global/global-agent.ts')
const globalAgentRuntimeSource = read('backend/modules/global/global-agent-agentic-runtime.ts')
const globalAgentRelaySource = read('backend/modules/global/global-agent-test-agent-relay.ts')
const collaborationSource = read('backend/modules/collaboration/collaboration.ts')
const collaborationQueueSource = read('backend/modules/collaboration/collaboration-runtime-task-queue-part-02.ts')
const cronSource = read('backend/modules/scheduling/cron.ts')
const cronRuntimeSource = read('backend/modules/scheduling/cron-part-02.ts')
const reportsSource = read('backend/modules/scheduling/cron-dev-reports.ts')
const acpSource = read('backend/integrations/control-bot-acp.ts')

const compiledChannel = path.join(root, 'ccm-package/dist/modules/collaboration/feishu-channel.js')
assert.ok(fs.existsSync(compiledChannel), '请先运行 npm run build:backend')
const channel = await import(`${pathToFileURL(compiledChannel).href}?selftest=${Date.now()}`)
const runtimeSelfTest = channel.runFeishuChannelSelfTest()

const checks = {
  runtime_contract_passes: runtimeSelfTest.pass === true,
  originating_chat_resolution:
    channelSource.includes('store.active_session')
    && channelSource.includes('store.user_sessions')
    && channelSource.includes('agent_session_id'),
  durable_binding_and_outbox:
    channelSource.includes('feishu-channel-state.json')
    && channelSource.includes('dedupe_key')
    && channelSource.includes('attempts >= 5')
    && (cronSource.includes('tickFeishuNotificationOutbox(now)') || cronRuntimeSource.includes('tickFeishuNotificationOutbox(now)')),
  complete_stage_projection:
    channelSource.includes('stage: "dispatch"')
    && channelSource.includes('stage: "test"')
    && channelSource.includes('stage: "execution"')
    && channelSource.includes('stage: "completion"')
    && globalAgentSource.includes('notifyFeishuTaskStage')
    && (globalAgentSource.includes('mission:${record.mission_id}:completed') || globalAgentRuntimeSource.includes('mission:${record.mission_id}:completed'))
    && (globalAgentSource.includes('mission:${record.mission_id}:actions:') || globalAgentRuntimeSource.includes('mission:${record.mission_id}:actions:')),
  test_agent_stays_group_owned:
    (globalAgentSource.includes('relayGlobalTestAgentEventFromGroup') || globalAgentRelaySource.includes('relayGlobalTestAgentEventFromGroup'))
    && (globalAgentSource.includes('test_agent_review_ready') || globalAgentRelaySource.includes('test_agent_review_ready')),
  duplicate_webhook_is_suppressed:
    (collaborationSource.includes('hasFeishuTaskBinding({ taskId: task?.id') || collaborationQueueSource.includes('hasFeishuTaskBinding({ taskId: task?.id'))
    && (collaborationSource.includes('legacy fallback') || collaborationQueueSource.includes('legacy fallback')),
  config_credentials_are_masked:
    routesSource.includes('webhook_url: config.webhook_url ? "******" : ""')
    && routesSource.includes('updates.webhook_url !== "******"')
    && !routesSource.includes('webhook_url: config.webhook_url || ""'),
  real_health_probe_is_exposed:
    feishuSource.includes('/open-apis/bot/v3/info')
    && routesSource.includes('/api/feishu/health/probe')
    && routesSource.includes('/api/feishu/channel/deliveries'),
  reports_are_scheduled_retried_and_audited:
    reportsSource.includes('daily_time: normalizeClock(input.daily_time, "18:30")')
    && reportsSource.includes('weekly_time: normalizeClock(input.weekly_time, "18:40")')
    && reportsSource.includes('retry_limit')
    && reportsSource.includes('recordFeishuReportDelivery'),
  attachment_boundary_is_explicit:
    acpSource.includes('promptCapabilities: { image: false, audio: false')
    && acpSource.includes('附件不会被当作已读取或已验收'),
  user_messages_are_redacted:
    runtimeSelfTest.checks?.secrets_redacted === true,
}

const baseUrl = String(process.env.CCM_FEISHU_BASE_URL || '').replace(/\/$/, '')
let live = null
let liveAcceptance = null
if (baseUrl) {
  const request = async (pathname, method = 'GET') => {
    const response = await fetch(`${baseUrl}${pathname}`, { method, signal: AbortSignal.timeout(15_000) })
    const body = await response.json()
    return { status: response.status, body }
  }
  const [selfTest, config, health, deliveries] = await Promise.all([
    request('/api/feishu/channel/self-test'),
    request('/api/feishu/config'),
    request('/api/feishu/health'),
    request('/api/feishu/channel/deliveries?limit=5'),
  ])
  assert.equal(selfTest.status, 200, '运行中服务的飞书自测接口失败')
  assert.equal(selfTest.body.pass, true, '运行中服务的飞书自测未通过')
  assert.ok(['', '******'].includes(config.body.config?.webhook_url), 'Webhook URL 未脱敏')
  assert.equal(typeof health.body.process_alive, 'boolean', '健康接口缺少进程状态')
  assert.ok(Array.isArray(deliveries.body.deliveries), '投递审计接口不可用')
  live = { self_test: selfTest.body, config: config.body.config, health: health.body, deliveries: deliveries.body }
}

const acceptanceSessionId = String(process.env.CCM_FEISHU_ACCEPTANCE_SESSION_ID || '').trim()
if (process.env.CCM_FEISHU_SEND_ACCEPTANCE === '1') {
  assert.ok(acceptanceSessionId, '真实定向验收需要 CCM_FEISHU_ACCEPTANCE_SESSION_ID')
  const destination = channel.resolveFeishuDestination({}, acceptanceSessionId)
  assert.ok(destination?.receive_id, '无法从 cc-connect 会话解析原飞书会话')
  channel.bindFeishuTaskContext({ sessionId: acceptanceSessionId, destination, source: 'feishu-production-acceptance' })
  liveAcceptance = await channel.notifyFeishuTaskStage({
    stage: 'acceptance',
    title: 'CCM 飞书通道验收',
    markdown: '飞书原会话定向通知已通过真实发送验证。计划、派发、执行、TestAgent、返工、验收和最终总结会继续回到任务发起会话。',
    sessionId: acceptanceSessionId,
    dedupeKey: 'feishu-production-acceptance:2026-07-13:v1',
  })
  assert.equal(liveAcceptance.success, true, `真实定向消息发送失败：${liveAcceptance.delivery?.error || liveAcceptance.reason || '未知错误'}`)
}

const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name)
assert.deepEqual(failed, [], `Feishu production channel regression: ${failed.join(', ')}`)

console.log(JSON.stringify({ pass: true, checks, runtime_self_test: runtimeSelfTest, live, live_acceptance: liveAcceptance }, null, 2))
