import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const globalSidebar = read('frontend/src/components/global/GlobalAgentSessionSidebar.vue')
const projectSidebar = read('frontend/src/components/projects/ProjectSessionSidebar.vue')

for (const [label, source] of [['global', globalSidebar], ['project', projectSidebar]]) {
  assert.match(source, /expandedGroups\s*=\s*ref\(readGroupState\(\)\)/, `${label} sidebar must own persisted expansion state`)
  assert.match(source, /feishu:\s*saved\.feishu\s*===\s*true/, `${label} Feishu group must default closed`)
  assert.match(source, /:aria-expanded="expandedGroups\.feishu"/, `${label} Feishu heading must expose accessible state`)
  assert.match(source, /v-show="expandedGroups\.feishu"/, `${label} Feishu list must be independently collapsible`)
  assert.match(source, /localStorage\.setItem\(groupStorageKey/, `${label} sidebar must remember expansion state`)
}

assert.match(globalSidebar, /web:\s*saved\.web\s*===\s*true/, 'global web group must default closed')
assert.match(globalSidebar, /:aria-expanded="expandedGroups\.web"/, 'global web heading must expose accessible state')
assert.match(globalSidebar, /v-show="expandedGroups\.web"/, 'global web list must be independently collapsible')
assert.match(projectSidebar, /conversation:\s*saved\.conversation\s*===\s*true\s*\|\|\s*saved\.web\s*===\s*true/, 'project conversation group must default closed and read legacy web state')
assert.match(projectSidebar, /automation:\s*saved\.automation\s*===\s*true/, 'project automation group must default closed')
assert.match(projectSidebar, /:aria-expanded="expandedGroups\.conversation"/, 'project conversation heading must expose accessible state')
assert.match(projectSidebar, /:aria-expanded="expandedGroups\.automation"/, 'project automation heading must expose accessible state')
assert.match(projectSidebar, /v-show="expandedGroups\.conversation"/, 'project conversation list must be independently collapsible')
assert.match(projectSidebar, /v-show="expandedGroups\.automation"/, 'project automation list must be independently collapsible')

assert.match(projectSidebar, /class="new-session-button"/, 'project sidebar must expose a full-width new-session button')
assert.match(projectSidebar, /<span>新建会话<\/span>/, 'project new-session button must use the shared visible label')
assert.ok(
  projectSidebar.indexOf('class="new-session-button"') < projectSidebar.indexOf('class="session-list"'),
  'project new-session button must appear above the session list',
)
assert.match(projectSidebar, /currentSessionDraft\.value = true|emit\('create'\)/, 'project new-session entry must preserve delayed session creation')

console.log('collapsible-session-groups-selftest: 20 checks passed')
