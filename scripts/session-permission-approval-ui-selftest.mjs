import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const checks = []
const check = (name, fn) => { fn(); checks.push({ name, pass: true }) }

const globalPage = read('frontend/src/components/global/GlobalAgent.vue')
const groupPanel = read('frontend/src/components/collaboration/GroupChatPanel.vue')
const groupTemplate = read('frontend/src/components/collaboration/GroupChat.template.html')
const projectPanel = read('frontend/src/components/projects/ProjectManagerPanel.vue')
const projectTemplate = read('frontend/src/components/projects/ProjectManager.template.html')
const composable = read('frontend/src/composables/usePermissionApprovals.js')
const taskManager = read('frontend/src/components/tasks/useTaskManager.js')
const taskTemplate = read('frontend/src/components/tasks/TaskManager.template.html')
const projectManager = read('frontend/src/components/projects/useProjectManager.js')

check('global Agent approval list is scoped to the exact global session', () => {
  assert.match(globalPage, /originType:\s*'global'/)
  assert.match(globalPage, /originSessionId:\s*currentSessionId\.value/)
  assert.match(globalPage, /<PermissionApprovalCards/)
})
check('group approval list is scoped to the exact group and group session', () => {
  assert.match(groupPanel, /originType:\s*'group'/)
  assert.match(groupPanel, /originSessionId:\s*currentGroupSessionId\.value/)
  assert.match(groupPanel, /originGroupId:\s*currentGroup\.value\?\.id/)
  assert.match(groupTemplate, /<PermissionApprovalCards/)
})
check('project approval list is scoped to the exact project session and resumes that conversation', () => {
  assert.match(projectPanel, /originType:\s*'project'/)
  assert.match(projectPanel, /originSessionId:\s*currentSession\.value/)
  assert.match(projectPanel, /ccm__permission_broker/)
  assert.match(projectTemplate, /<PermissionApprovalCards/)
})
check('shared client always sends exact origin filters and bounded one-use decisions', () => {
  assert.match(composable, /origin_type/)
  assert.match(composable, /origin_session_id/)
  assert.match(composable, /maxUses:\s*1/)
  assert.match(composable, /expiresInMinutes:\s*15/)
})
check('task dispatch remains a unified approval center and resumes the exact project session', () => {
  assert.match(taskManager, /standalonePermissionRequests/)
  assert.match(taskManager, /emit\('resume-project-permission'/)
  assert.match(taskTemplate, /:requests="pendingPermissionRequests"/)
  assert.match(taskTemplate, /:requests="standalonePermissionRequests"/)
  assert.match(projectManager, /target\.sessionId && target\.sessionId !== currentSession\.value/)
})

console.log(JSON.stringify({ pass: true, checks }, null, 2))
