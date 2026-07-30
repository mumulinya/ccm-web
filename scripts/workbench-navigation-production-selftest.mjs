import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const backend = read('backend/modules/system/usability.ts')
const taskStore = read('backend/core/task-store.ts')
const navigation = read('backend/modules/system/navigation-config.ts')
const access = read('backend/modules/system/api-access-control.ts')
const workbench = read('frontend/src/components/common/UsabilityWorkbench.vue')
const live = read('frontend/src/composables/useUsabilityWorkbenchLive.js')
const app = read('frontend/src/App.vue')
const manager = read('frontend/src/components/workspace/MenuManager.vue')

for (const [name, source, marker] of [
  ['V3 workbench snapshot', backend, 'ccm-usability-workbench-snapshot-v3'],
  ['read-only project status', backend, 'isRunningReadOnly'],
  ['read-only runtime status', backend, 'getProjectRuntimeSummaryReadOnly'],
  ['cursor pages', backend, '/api/usability/workbench/items'],
  ['structured task action', backend, 'taskActionMatch'],
  ['task revision CAS', backend, 'updateTaskByIdCas'],
  ['archive candidate query', taskStore, 'listUsabilityArchiveCandidatesFromSqlite'],
  ['navigation workspace default', navigation, '/api/navigation/default'],
  ['navigation per-user override', navigation, 'store.users[userId]'],
  ['navigation revision gate', navigation, 'state_drift'],
  ['controlled icons', navigation, 'cleanIcon'],
  ['operator usability authorization', access, '/^\\/api\\/usability'],
  ['abortable refresh', live, 'AbortController'],
  ['request generation guard', live, 'requestGeneration'],
  ['user-scoped cache', live, 'ccm:usability-workbench:snapshot:v3:'],
  ['separate Agent connection', workbench, '/api/projects/agent-connection'],
  ['separate source runtime', workbench, '/api/projects/runtime/action'],
  ['blocker-aware task endpoint', workbench, '/api/usability/tasks/${encodeURIComponent(task.id)}/action'],
  ['server navigation load', app, 'loadServerMenuConfiguration'],
  ['multi-tab navigation sync', app, 'subscribeMenuConfigurationBroadcast'],
  ['personal/workspace mode', manager, "configurationMode === 'workspace'"],
  ['keyboard-visible row actions', manager, '.group-row:focus-within .row-actions'],
]) assert.ok(source.includes(marker), `${name} is missing`)

assert.ok(!workbench.includes("operation === 'start' ? '/api/start' : '/api/stop'"), 'workbench must not use legacy project start/stop')
assert.ok(!workbench.includes("api('/api/tasks/bulk'"), 'workbench must not bypass blocker-aware task actions')
assert.ok(!backend.includes('saveTasks('), 'workbench governance must not rewrite the complete task collection')
assert.ok(navigation.includes('withFileLock(STORE_FILE'), 'navigation writes must be serialized')
assert.ok(navigation.includes('parsed.username || parsed.password'), 'credential-bearing custom URLs must be rejected')

console.log(JSON.stringify({
  success: true,
  checks: 27,
  paid_provider_calls: 0,
}, null, 2))
