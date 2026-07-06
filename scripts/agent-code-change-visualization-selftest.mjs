import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { globalMissionTaskCard } from '../frontend/src/utils/taskExperience.js'

const root = process.cwd()
const read = (path) => readFileSync(join(root, path), 'utf-8')

const component = read('frontend/src/components/agents/AgentCodeChangeDrawer.vue')
const project = read('frontend/src/components/projects/ProjectManager.vue')
const group = read('frontend/src/components/collaboration/GroupChat.vue')
const groupTaskActions = read('frontend/src/composables/useGroupTaskCardActions.js')
const global = read('frontend/src/components/global/GlobalAgent.vue')
const gitModule = read('backend/modules/tools/git.ts')

const checks = {
  drawerComponentExists: component.includes('Agent 代码改动') && component.includes('完整文件') && component.includes('/api/git/diff'),
  drawerCanReadFullFile: component.includes('/api/git/file') && component.includes('file-preview'),
  projectChatUsesDrawer: project.includes("import AgentCodeChangeDrawer") && project.includes('<AgentCodeChangeDrawer') && project.includes('openCodeChangeDrawer(msg.fileChanges'),
  groupChatUsesDrawer: group.includes("import AgentCodeChangeDrawer") && group.includes('<AgentCodeChangeDrawer') && groupTaskActions.includes("action.kind === 'view_changes'"),
  groupViewChangesPrefersCode: groupTaskActions.includes('openCodeChangeDrawer?.(msg.fileChanges') && groupTaskActions.includes('return openPipelineViewer?.(msg)'),
  globalChatUsesDrawer: global.includes("import AgentCodeChangeDrawer") && global.includes('<AgentCodeChangeDrawer') && global.includes('openGlobalCodeChangeDrawer'),
  backendFilePreviewEndpointExists: gitModule.includes('pathname === "/api/git/file"') && gitModule.includes('非法文件路径') && gitModule.includes('readWorkingFileText'),
}

const globalCard = globalMissionTaskCard({
  role: 'assistant',
  globalMission: {
    id: 'mission_cross_project_changes',
    title: '跨项目改动查看',
    status: 'done',
    mission_summary: { total: 2, passed: 2 },
    delivery_summary: {
      acceptance_gate_passed: true,
      actual_file_changes: [
        { project: 'web', path: 'src/App.vue', additions: 2, deletions: 1 },
        { project: 'api', path: 'src/server.ts', additions: 4, deletions: 0 },
      ],
    },
  },
  globalMissionChildren: [],
})
checks.globalMissionKeepsStructuredProjectFiles = globalCard?.delivery?.files?.some(file => file.project === 'web' && file.path === 'src/App.vue')
  && globalCard?.delivery?.files?.some(file => file.project === 'api' && file.path === 'src/server.ts')

assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2))
console.log(JSON.stringify({ success: true, checks }, null, 2))
