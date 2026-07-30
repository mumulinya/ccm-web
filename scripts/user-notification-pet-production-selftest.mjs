import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const distRoot = process.env.CCM_BACKEND_DIST_DIR || path.join(root, 'ccm-package', 'dist')
const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-user-notifications-'))
process.env.USERPROFILE = tempHome
process.env.HOME = tempHome

const authDir = path.join(tempHome, '.cc-connect', 'auth')
fs.mkdirSync(authDir, { recursive: true })
fs.writeFileSync(path.join(authDir, 'users.json'), JSON.stringify({
  schema: 'ccm-local-auth-users-v2',
  users: [{
    id: 'usr_notification_admin',
    username: 'notification-admin',
    normalizedUsername: 'notification-admin',
    role: 'admin',
    password: { algorithm: 'scrypt', salt: 'test', hash: 'test' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    securityAudit: [],
  }],
  registrationEnabled: false,
  onboardingCompleted: true,
  updatedAt: new Date().toISOString(),
}, null, 2))

const notifications = require(path.join(distRoot, 'system', 'user-notifications.js'))
const observability = require(path.join(distRoot, 'system', 'observability-database.js'))

try {
  const input = {
    recipient_user_ids: ['usr_notification_admin'],
    source_type: 'task_terminal',
    source_channel: 'web',
    scope_type: 'project',
    scope_id: 'project-a',
    exact_session_id: 'session-a',
    task_id: 'task-a',
    notification_type: 'task_completed',
    severity: 'success',
    state: 'resolved',
    title: '任务已完成',
    summary: 'API Key=secret-value C:\\private\\project\\file.ts 已完成',
    action: { kind: 'task', task_id: 'task-a', scope_type: 'project', scope_id: 'project-a' },
    dedupe_key: 'task-a:completed',
  }
  const first = notifications.createUserNotification(input)
  const duplicate = notifications.createUserNotification(input)
  assert.equal(first.length, 1)
  assert.equal(duplicate.length, 1)
  assert.equal(first[0].notification_id, duplicate[0].notification_id)

  const listed = notifications.listUserNotifications('usr_notification_admin')
  assert.equal(listed.items.length, 1)
  assert.equal(notifications.unreadUserNotificationCount('usr_notification_admin'), 1)
  assert.doesNotMatch(JSON.stringify(listed.items), /secret-value|private\\project/)

  const pending = notifications.listPendingPetDeliveries({
    channel: 'desktop_pet',
    recipient_user_ids: ['usr_notification_admin'],
  })
  assert.equal(pending.length, 1)
  assert.equal(pending[0].delivery.state, 'pending')
  assert.equal(notifications.claimPetDelivery(pending[0].delivery.delivery_id, 'desktop-pet:test'), true)
  assert.equal(notifications.acknowledgePetDelivery(pending[0].delivery.delivery_id, 'desktop-pet:test'), true)
  assert.equal(notifications.listPendingPetDeliveries({
    channel: 'desktop_pet',
    recipient_user_ids: ['usr_notification_admin'],
  }).length, 0)

  assert.equal(notifications.mutateUserNotification('usr_notification_admin', first[0].notification_id, 'read'), true)
  assert.equal(notifications.unreadUserNotificationCount('usr_notification_admin'), 0)
  assert.equal(notifications.runUserNotificationSelfTest().pass, true)

  const db = observability.getObservabilityDatabase()
  assert.equal(Number(db.prepare('SELECT COUNT(*) count FROM user_notifications_v2').get().count), 1)
  assert.equal(Number(db.prepare("SELECT COUNT(*) count FROM user_notification_deliveries_v2 WHERE state='delivered'").get().count), 2)
  console.log(JSON.stringify({
    pass: true,
    checks: 13,
    notification_id: first[0].notification_id,
    paid_provider_calls: 0,
  }, null, 2))
} finally {
  observability.closeObservabilityDatabaseForTests?.()
  fs.rmSync(tempHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}
