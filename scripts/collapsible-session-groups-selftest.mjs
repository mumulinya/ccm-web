import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const globalSidebar = read('frontend/src/components/global/GlobalAgentSessionSidebar.vue')
const projectSidebar = read('frontend/src/components/projects/ProjectSessionSidebar.vue')

for (const [label, source] of [['global', globalSidebar], ['project', projectSidebar]]) {
  assert.match(source, /expandedGroups\s*=\s*ref\(readGroupState\(\)\)/, `${label} sidebar must own persisted expansion state`)
  assert.match(source, /web:\s*saved\.web\s*===\s*true/, `${label} web group must default closed`)
  assert.match(source, /feishu:\s*saved\.feishu\s*===\s*true/, `${label} Feishu group must default closed`)
  assert.match(source, /:aria-expanded="expandedGroups\.web"/, `${label} web heading must expose accessible state`)
  assert.match(source, /:aria-expanded="expandedGroups\.feishu"/, `${label} Feishu heading must expose accessible state`)
  assert.match(source, /v-show="expandedGroups\.web"/, `${label} web list must be independently collapsible`)
  assert.match(source, /v-show="expandedGroups\.feishu"/, `${label} Feishu list must be independently collapsible`)
  assert.match(source, /localStorage\.setItem\(groupStorageKey/, `${label} sidebar must remember expansion state`)
}

assert.match(projectSidebar, /class="new-session-button"/, 'project sidebar must expose a full-width new-session button')
assert.match(projectSidebar, /<span>新建会话<\/span>/, 'project new-session button must use the shared visible label')
assert.ok(
  projectSidebar.indexOf('class="new-session-button"') < projectSidebar.indexOf('class="session-list"'),
  'project new-session button must appear above the session list',
)
assert.match(projectSidebar, /currentSessionDraft\.value = true|emit\('create'\)/, 'project new-session entry must preserve delayed session creation')

console.log('collapsible-session-groups-selftest: 20 checks passed')
