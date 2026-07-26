import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const app = read('frontend/src/App.vue')
const rootView = read('frontend/src/Root.vue')
const overlay = read('frontend/src/components/common/PageLoadingOverlay.vue')
const tracker = read('frontend/src/utils/pageLoadTracker.js')
const main = read('frontend/src/main.js')

const loaderIds = [...app.matchAll(/^\s{2}['"]?([\w-]+)['"]?: \(\) => import\(/gm)].map(match => match[1])
const componentIds = [...app.matchAll(/definePageComponent\(['"]([\w-]+)['"],\s*PAGE_LOADERS/g)].map(match => match[1])

assert.ok(loaderIds.length >= 19, `expected all page loaders, got ${loaderIds.length}`)
assert.deepEqual([...componentIds].sort(), [...loaderIds].sort(), 'every lazy page must use the shared page loader')
assert.equal((app.match(/<PageLoadingOverlay\b/g) || []).length, 1, 'App must render one shared content overlay')
assert.equal((rootView.match(/<PageLoadingOverlay\b/g) || []).length, 1, 'Root must reuse the shared overlay for auth')
assert.doesNotMatch(app, /loadingComponent:\s*PageLoadingOverlay/)
assert.doesNotMatch(rootView, /root-auth-loading|root-auth-mark|auth-loading/)
assert.match(rootView, /applyStoredThemeBeforeAuth\(\)/)
assert.match(app, /subscribePageLoadRequests/)
assert.match(app, /state\.ready \|\| state\.moduleFailed/)
assert.match(app, /PAGE_LOAD_SLOW_MS\s*=\s*8_000/)
assert.match(app, /currentTab\.value === 'dashboard'\) markPageModuleLoaded/)
assert.match(tracker, /method !== 'GET'/)
for (const ignoredPath of ['/api/auth/session', '/api/runtime/events', '/api/status/stream', '/api/usability/workbench/stream']) {
  assert.ok(tracker.includes(`'${ignoredPath}'`), `${ignoredPath} must not block page readiness`)
}
assert.match(main, /beginTrackedPageRequest/)
assert.ok((main.match(/endTrackedPageRequest/g) || []).length >= 3, 'fetch success and failure must both settle tracking')
assert.match(overlay, /data-page-loading/)
assert.match(overlay, /viewport/)
assert.match(overlay, /重新加载/)

console.log(`Global page loading overlay selftest passed: ${loaderIds.length} pages use one initial-load gate`)
