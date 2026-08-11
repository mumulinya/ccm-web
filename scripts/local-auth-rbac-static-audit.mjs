import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const server = read('backend/server.ts')
const auth = read('backend/modules/system/local-auth.ts')
const access = read('backend/modules/system/api-access-control.ts')
const internal = read('backend/modules/system/internal-api-auth.ts')
const rootVue = read('frontend/src/Root.vue')
const authPage = read('frontend/src/components/auth/AuthPage.vue')
const securityPanel = read('frontend/src/components/settings/SettingsSecurityPanel.vue')

assert.match(server, /authorizeApiRequest\(req, res, String\(req\.url/)
assert.ok(server.indexOf('authorizeApiRequest(req') < server.indexOf('handleRuntimeEventsApi('), 'central authorization must run before business routes')
assert.doesNotMatch(server, /browserApiAccessAllowed/)
assert.match(access, /let allowed = role === "admin"/)
assert.match(access, /featureForApi\(pathname\)/)
assert.match(access, /hasFeatureAccess\(auth\.user\.id, role, feature\)/)
assert.match(access, /task-templates/)
assert.match(access, /matches\(ADMIN_ONLY_MUTATIONS, pathname\)/)
const rag = read('backend/modules/knowledge/rag.ts')
assert.match(rag, /readOnly \? \[\] : debugChunks/, 'viewer(只读)账户的知识问答不能拿到分片原文和检索得分')
assert.match(rag, /handleKnowledgeChat\(payload, res, requestIsReadOnly\(req\)\)/, '/api/rag/chat 必须把 readOnly 主体传给 handleKnowledgeChat')
assert.match(access, /CSRF_INVALID/)
assert.match(access, /HOST_NOT_ALLOWED/)
assert.match(auth, /ccm-local-auth-users-v2/)
assert.match(auth, /ccm-local-auth-sessions-v2/)
assert.match(auth, /setup-code\.json/)
assert.match(auth, /SESSION_CLIENT_MISMATCH/)
assert.match(auth, /MAX_RATE_ENTRIES = 5_000/)
assert.match(internal, /SIGNATURE_TTL_MS = 30_000/)
assert.match(internal, /usedNonces/)
assert.match(rootVue, /X-CCM-CSRF/)
assert.match(authPage, /setup_code/)
assert.doesNotMatch(authPage, /navigator\.onLine/)
assert.match(securityPanel, /\/api\/auth\/users/)
assert.match(securityPanel, /current_revoked/)

for (const file of [
  'backend/modules/global/global-agent-bridge.ts',
  'backend/integrations/control-bot-acp.ts',
  'backend/modules/projects/project-feishu-turn-queue.ts',
]) {
  assert.match(read(file), /buildInternalApiHeaders/, `${file} must sign local API calls`)
}

const productionFiles = [
  'backend/server.ts',
  'backend/integrations/control-bot-acp.ts',
  'backend/modules/projects/project-feishu-turn-queue.ts',
  'backend/integrations/feishu-reaction-feedback.ts',
  'backend/modules/projects/projects.ts',
]
for (const file of productionFiles) assert.doesNotMatch(read(file), /X-CCM-ACP|X-CCM-QUEUED-FEISHU/, `${file} retains a legacy trust header`)

console.log(JSON.stringify({ success: true, checks: { centralDefaultDeny: true, setupCodeV2: true, csrf: true, clientBinding: true, persistentRateLimit: true, internalHmac: true, frontendCapabilities: true, legacyBypassRemoved: true }, paidProviderCalls: 0 }, null, 2))
