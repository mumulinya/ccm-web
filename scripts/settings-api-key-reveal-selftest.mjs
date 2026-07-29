import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf-8')

const routes = read('backend/modules/collaboration/orchestrator-routes.ts')
const config = read('backend/modules/collaboration/group-orchestrator-config.ts')
const server = read('backend/server.ts')
const panel = read('frontend/src/components/settings/SettingsModelPanel.vue')
const styles = read('frontend/src/components/settings/settings.css')

assert.match(routes, /\/api\/orchestrator\/credential\/reveal/)
assert.match(routes, /req\.method === "POST"/)
assert.match(routes, /resolveLocalAuthSession\(req\)/)
assert.match(routes, /auth\.user\.role !== "admin"/)
assert.match(routes, /Cache-Control", "private, no-store, max-age=0"/)
assert.match(routes, /loadOrchestratorConfig\(\)\.apiKey/)
assert.match(config, /const \{ apiKey, summaryReviewerApiKey, \.\.\.safe \} = config/)
assert.match(config, /summaryReviewerHasKey: !!summaryReviewerApiKey/)
assert.ok(
  server.indexOf('!browserApiAccessAllowed(req)') < server.indexOf('handleCollaborationApi(pathname, req, res, parsed, collabCtx)'),
  'credential reveal route must remain behind browser authentication',
)

assert.match(panel, /EyeOff/)
assert.match(panel, /apiKeyVisible \? 'text' : 'password'/)
assert.match(panel, /fetch\('\/api\/orchestrator\/credential\/reveal'/)
assert.match(panel, /cache: 'no-store'/)
assert.match(panel, /window\.setTimeout\(hideApiKey, 30_000\)/)
assert.match(panel, /payload\.apiKey === revealedStoredApiKey\.value/)
assert.match(styles, /\.settings-secret-toggle/)

console.log(JSON.stringify({
  pass: true,
  checks: {
    authenticatedOnDemandReveal: true,
    adminOnlyReveal: true,
    publicConfigRemainsRedacted: true,
    responseNotCached: true,
    autoHideClearsDecryptedValue: true,
    revealDoesNotRewriteUnchangedKey: true,
    accessibleEyeControl: true,
  },
}, null, 2))
