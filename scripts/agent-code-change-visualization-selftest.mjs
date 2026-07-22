import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import { globalMissionTaskCard } from '../frontend/src/utils/taskExperience.js'
import { buildSplitHunks, buildUnifiedHunks } from '../frontend/src/components/tools/code-changes/codeDiff.js'

const root = process.cwd()
const require = createRequire(import.meta.url)
const read = (path) => readFileSync(join(root, path), 'utf-8')

const component = read('frontend/src/components/agents/AgentCodeChangeDrawer.vue')
const project = [
  read('frontend/src/components/projects/ProjectManagerPanel.vue'),
  read('frontend/src/components/projects/ProjectManager.template.html'),
  read('frontend/src/components/projects/useProjectManager.js'),
].join('\n')
const group = [
  read('frontend/src/components/collaboration/GroupChatPanel.vue'),
  read('frontend/src/components/collaboration/GroupChat.template.html'),
  read('frontend/src/components/collaboration/useGroupChat.js'),
].join('\n')
const groupTaskActions = read('frontend/src/composables/useGroupTaskCardActions.js')
const global = read('frontend/src/components/global/GlobalAgent.vue')
const gitModule = read('backend/modules/tools/git.ts')
const workspace = read('frontend/src/components/tools/CodeChanges.vue')
const summaryComponent = read('frontend/src/components/tools/code-changes/CodeChangeSummary.vue')
const fileListComponent = read('frontend/src/components/tools/code-changes/CodeChangeFileList.vue')
const commitPanel = read('frontend/src/components/tools/code-changes/CodeCommitPanel.vue')

const transpiledGit = ts.transpileModule(gitModule, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const gitExports = {}
vm.runInNewContext(transpiledGit, {
  exports: gitExports,
  module: { exports: gitExports },
  require: id => {
    if (id === 'fs') return require('node:fs')
    if (id === 'path') return require('node:path')
    if (id === 'child_process') return require('node:child_process')
    if (id === '../../core/utils') return { CCM_DIR: root, createUnifiedDiff: () => '', readWorkingFileText: () => ({ exists: false }), sendJson: () => true }
    if (id === '../../core/db') return { getConfigs: () => [], getConfigInfo: () => [] }
    throw new Error(`unexpected require: ${id}`)
  },
  Buffer,
  console,
})

const checks = {
  drawerComponentExists: component.includes('Agent 代码改动') && component.includes('完整文件') && component.includes('/api/git/diff'),
  drawerCanReadFullFile: component.includes('/api/git/file') && component.includes('file-preview'),
  projectChatUsesDrawer: project.includes("import AgentCodeChangeDrawer") && project.includes('<AgentCodeChangeDrawer') && project.includes('openCodeChangeDrawer(msg.fileChanges'),
  groupChatUsesDrawer: group.includes("import AgentCodeChangeDrawer") && group.includes('<AgentCodeChangeDrawer') && groupTaskActions.includes("action.kind === 'view_changes'"),
  groupViewChangesPrefersCode: groupTaskActions.includes('openCodeChangeDrawer?.(msg.fileChanges') && groupTaskActions.includes('return openPipelineViewer?.(msg)'),
  globalChatUsesDrawer: global.includes("import AgentCodeChangeDrawer") && global.includes('<AgentCodeChangeDrawer') && global.includes('openCodeChangeDrawer'),
  backendFilePreviewEndpointExists: gitModule.includes('pathname === "/api/git/file"') && gitModule.includes('非法文件路径') && gitModule.includes('readWorkingFileText'),
  workspaceHasUserSummary: workspace.includes('<CodeChangeSummary') && summaryComponent.includes('任务来源') && summaryComponent.includes('查看任务回放'),
  workspaceGroupsFileState: workspace.includes('<CodeChangeFileList') && fileListComponent.includes('同时存在暂存与工作区改动') && fileListComponent.includes('未跟踪'),
  workspaceHasSafeCommitPreview: workspace.includes('/api/git/commit-preview') && commitPanel.includes('只提交你明确选择的文件') && commitPanel.includes('验证状态'),
  workspaceHasDiffUtilities: workspace.includes('downloadPatch') && workspace.includes('navigateHunk') && workspace.includes('compactDiff') && workspace.includes("diffMode = 'split'"),
  backendHasWriteGuards: gitModule.includes('resolveSafeProjectFile') && gitModule.includes('validatePatchPaths') && gitModule.includes('"--check"') && gitModule.includes('"--only"'),
  backendHasProvenanceContext: gitModule.includes('buildChangeContext') && gitModule.includes('test-agent-runs') && gitModule.includes('project_recent'),
}

const parsedStatus = gitExports.parseGitStatus(' M frontend/src/App.vue\n?? docs/new.md\nUU backend/conflict.ts')
checks.statusParserKeepsStagedWorkingAndConflictState = parsedStatus.length === 3
  && parsedStatus[0].unstaged === true && parsedStatus[0].staged === false
  && parsedStatus[1].untracked === true && parsedStatus[2].conflict === true
const numstat = gitExports.parseNumstat('12\t3\tfrontend/src/App.vue\n-\t-\tpublic/logo.png')
checks.numstatParserKeepsTextAndBinaryStats = numstat.get('frontend/src/App.vue').additions === 12 && numstat.get('public/logo.png').binary === true
checks.pathGuardRejectsTraversal = (() => { try { gitExports.resolveSafeProjectFile(root, '../secret.txt'); return false } catch { return true } })()
checks.patchGuardRejectsTraversal = (() => { try { gitExports.validatePatchPaths('--- a/../secret.txt\n+++ b/../secret.txt\n@@ -1 +1 @@\n-a\n+b'); return false } catch { return true } })()
const sampleHunks = [{ header: '@@ -1,2 +1,2 @@', oldStart: 1, newStart: 1, changes: [{ type: 'remove', content: 'const value = 1' }, { type: 'add', content: 'const value = 2' }, { type: 'context', content: 'return value' }] }]
checks.diffRendererHasLineNumbersAndCompactMode = buildUnifiedHunks(sampleHunks, 'src/a.js')[0].rows[0].oldLine === 1
  && buildUnifiedHunks(sampleHunks, 'src/a.js', true)[0].rows.every(row => row.type !== 'context')
  && buildSplitHunks('@@ -1,2 +1,2 @@\n-const value = 1\n+const value = 2\n return value', 'src/a.js').length === 1

const tempRepo = mkdtempSync(join(tmpdir(), 'ccm-selected-commit-'))
try {
  const git = args => execFileSync('git', args, { cwd: tempRepo, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] })
  git(['init'])
  git(['config', 'user.email', 'test@example.com'])
  git(['config', 'user.name', 'CCM Test'])
  writeFileSync(join(tempRepo, 'selected.txt'), 'base\n')
  writeFileSync(join(tempRepo, 'outside.txt'), 'base\n')
  git(['add', '-A'])
  git(['commit', '-m', 'base'])
  writeFileSync(join(tempRepo, 'selected.txt'), 'selected\n')
  writeFileSync(join(tempRepo, 'outside.txt'), 'outside\n')
  git(['add', '--', 'outside.txt'])
  git(['add', '-A', '--', 'selected.txt'])
  git(['commit', '--only', '-m', 'selected only', '--', 'selected.txt'])
  checks.selectedCommitLeavesOutsideStagedFileUntouched = git(['show', '--name-only', '--pretty=format:', 'HEAD']).trim() === 'selected.txt'
    && git(['diff', '--cached', '--name-only']).trim() === 'outside.txt'
} finally {
  rmSync(tempRepo, { recursive: true, force: true })
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
