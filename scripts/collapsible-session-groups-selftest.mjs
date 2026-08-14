import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const globalSidebar = read('frontend/src/components/global/GlobalAgentSessionSidebar.vue')
const projectSidebar = read('frontend/src/components/projects/ProjectSessionSidebar.vue')
const sharedGroup = read('frontend/src/components/common/ConversationSessionGroup.vue')

for (const [label, source] of [['global', globalSidebar], ['project', projectSidebar]]) {
  assert.match(source, /expandedGroups\s*=\s*ref\(readGroupState\(\)\)/, `${label} sidebar must own persisted expansion state`)
  assert.match(source, /feishu:\s*saved\.feishu\s*===\s*true/, `${label} Feishu group must default closed`)
  assert.match(source, /:expanded="expandedGroups\.feishu"/, `${label} Feishu group must receive its independent expansion state`)
  assert.match(source, /localStorage\.setItem\(groupStorageKey/, `${label} sidebar must remember expansion state`)
}

assert.match(sharedGroup, /:aria-expanded="expanded"/, 'shared group heading must expose accessible state')
assert.match(sharedGroup, /v-show="expanded"/, 'shared group content must be independently collapsible')

assert.match(globalSidebar, /web:\s*saved\.web\s*!==\s*false/, 'global web group must default open unless the user collapsed it')
assert.match(globalSidebar, /:expanded="expandedGroups\.web"/, 'global web group must receive its expansion state')
assert.match(projectSidebar, /hasConversationPreference\s*\?\s*\(saved\.conversation\s*===\s*true\s*\|\|\s*saved\.web\s*===\s*true\)\s*:\s*true/, 'project conversation group must default open and read legacy web state')
assert.match(projectSidebar, /automation:\s*saved\.automation\s*===\s*true/, 'project automation group must default closed')
assert.match(projectSidebar, /:expanded="expandedGroups\.conversation"/, 'project conversation group must receive its expansion state')
assert.match(projectSidebar, /:expanded="expandedGroups\.automation"/, 'project automation group must receive its expansion state')

assert.match(projectSidebar, /class="new-session-button"/, 'project sidebar must expose a full-width new-session button')
assert.match(projectSidebar, /<span>新建会话<\/span>/, 'project new-session button must use the shared visible label')
assert.ok(
  projectSidebar.indexOf('class="new-session-button"') < projectSidebar.indexOf('class="session-list"'),
  'project new-session button must appear above the session list',
)
assert.match(projectSidebar, /currentSessionDraft\.value = true|emit\('create'\)/, 'project new-session entry must preserve delayed session creation')

console.log('collapsible-session-groups-selftest: 20 checks passed')
