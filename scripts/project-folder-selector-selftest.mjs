import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(import.meta.dirname, '..')
const compiled = path.join(root, 'ccm-package', 'dist', 'modules', 'projects', 'project-folders.js')
assert.ok(fs.existsSync(compiled), '请先运行 npm run build:backend')
const runtime = await import(`${pathToFileURL(compiled).href}?selftest=${Date.now()}`)
const backend = runtime.runProjectFolderSelfTest()
const component = fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'projects', 'ProjectWorkspaceHeader.vue'), 'utf8')
const apiSource = fs.readFileSync(path.join(root, 'backend', 'modules', 'projects', 'projects.ts'), 'utf8')
const folderSource = fs.readFileSync(path.join(root, 'backend', 'modules', 'projects', 'project-folders.ts'), 'utf8')

const checks = {
  ...backend.checks,
  project_folder_api_registered: apiSource.includes('"/api/projects/folders"') && apiSource.includes('updateProjectFolderState'),
  folder_delete_only_unassigns_projects: folderSource.includes('state.assignments = Object.fromEntries') && !folderSource.includes('purgeArchivedProject'),
  selector_replaces_native_flat_project_select: component.includes('class="project-picker"') && !component.includes('id="project-workspace-select"'),
  selector_supports_search_and_collapse: component.includes('placeholder="搜索项目"') && component.includes('toggleFolder(folder.id)'),
  selector_supports_create_rename_delete: component.includes('submitNewFolder') && component.includes('submitRenameFolder') && component.includes('deleteFolder(folder)'),
  selector_supports_project_assignment: component.includes("action: 'assign'") && component.includes('移动项目到文件夹'),
  selector_has_ungrouped_fallback: component.includes('未分组') && component.includes('ungroupedProjects'),
  selector_refreshes_from_runtime_events: component.includes("event?.type === 'project.folder.changed'"),
  mobile_picker_is_viewport_bounded: component.includes('width:calc(100vw - 24px)'),
}

const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name)
assert.deepEqual(failed, [], `Project folder selector regression: ${failed.join(', ')}`)
console.log(JSON.stringify({ pass: true, checks, paid_provider_calls: 0 }, null, 2))
