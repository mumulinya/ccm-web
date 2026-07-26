import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const historySource = read('backend/modules/global/global-agent-history.ts')
const channelSource = read('backend/modules/collaboration/feishu-channel.ts')
const messageSource = read('backend/modules/collaboration/feishu.ts')
const apiSource = read('backend/modules/global/global-agent-api.ts')
const permissionSource = read('backend/modules/collaboration/task-permission-broker.ts')
const settingsSource = read('frontend/src/components/settings/SettingsFeishuPanel.vue')

const compiledAccess = path.join(root, 'ccm-package/dist/modules/collaboration/feishu-access.js')
assert.ok(fs.existsSync(compiledAccess), '请先运行 npm run build:backend')
const access = await import(`${pathToFileURL(compiledAccess).href}?selftest=${Date.now()}`)

const config = {
  control_bot_access_mode: 'mapped',
  control_bot_app_secret: 'selftest-card-secret',
  control_bot_users: [
    { open_id: 'ou_viewer', role: 'viewer', enabled: true },
    { open_id: 'ou_operator', role: 'operator', enabled: true },
    { open_id: 'ou_admin', role: 'admin', enabled: true },
  ],
}
const viewer = access.resolveFeishuUserAccess({ open_id: 'ou_viewer' }, config)
const operator = access.resolveFeishuUserAccess({ open_id: 'ou_operator' }, config)
const admin = access.resolveFeishuUserAccess({ open_id: 'ou_admin' }, config)
const denied = access.resolveFeishuUserAccess({ open_id: 'ou_unknown' }, config)
const cardValue = {
  ccm_action: 'permission_decision', request_id: 'perm_selftest', decision: 'approve',
  binding_id: 'binding_selftest', expires_at: new Date(Date.now() + 60_000).toISOString(),
}
cardValue.signature = access.signFeishuCardAction(cardValue, config)

const checks = {
  exact_feishu_session_isolation:
    historySource.includes('if (explicitConversationId && explicitConversationId.startsWith("feishu:"))')
    && historySource.includes('return buildFeishuConversationId(payload)')
    && historySource.includes('source === "feishu" ? []'),
  original_message_reply_and_thread:
    messageSource.includes('/reply`')
    && messageSource.includes('payload.reply_in_thread = true')
    && channelSource.includes('reply_to_message_id'),
  single_task_card_updates:
    messageSource.includes('method: updateMessageId ? "PATCH" : "POST"')
    && channelSource.includes('renderTaskCardMarkdown')
    && channelSource.includes('card_key'),
  interactive_permission_actions:
    permissionSource.includes('createFeishuPermissionActions')
    && apiSource.includes('card.action.trigger')
    && apiSource.includes('processFeishuCardAction'),
  signed_card_action_verified:
    access.verifyFeishuCardAction(cardValue, config) === true
    && access.verifyFeishuCardAction({ ...cardValue, decision: 'reject' }, config) === false,
  role_boundaries:
    viewer.allowed && !viewer.canOperate && !viewer.canApprove
    && operator.canOperate && !operator.canApprove
    && admin.canOperate && admin.canApprove
    && !denied.allowed,
  exhausted_delivery_recovery:
    channelSource.includes('feishu.delivery_exhausted')
    && channelSource.includes('retryFeishuNotificationDelivery')
    && channelSource.includes('channelAlertHandler'),
  settings_exposes_users_and_retries:
    settingsSource.includes('用户身份与权限')
    && settingsSource.includes('任务消息投递')
    && settingsSource.includes('retryDelivery'),
}

const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name)
assert.deepEqual(failed, [], `Feishu conversation security regression: ${failed.join(', ')}`)
console.log(JSON.stringify({ pass: true, checks, paid_provider_calls: 0 }, null, 2))
