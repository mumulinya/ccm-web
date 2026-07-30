import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf-8')
const checks = []

const style = read('frontend/src/style.css')
assert.match(style, /:where\(\.modal-overlay > \.modal\)[\s\S]+width:\s*min\(560px, calc\(100vw - 32px\)\)/)
assert.match(style, /\.modal-overlay > \.modal\s*\{[\s\S]+min-width:\s*0\s*!important/)
assert.match(style, /\.modal \.form-group input:not\(\[type="checkbox"\]\)[\s\S]+width:\s*100%/)
checks.push({ name: 'legacy modal base constrains desktop width and forcibly clears mobile min-width', pass: true })

const responsiveContracts = [
  ['frontend/src/components/projects/ProjectFeishuQrModal.vue', /@media \(max-width: 640px\)[\s\S]+\.qr-layout[\s\S]+flex-direction:\s*column/],
  ['frontend/src/components/projects/ProjectFolderBrowserModal.vue', /@media\s*\(max-width:\s*680px\)[\s\S]+\.secondary-button,\.primary-button\s*\{\s*flex:\s*1/],
  ['frontend/src/components/projects/ProjectSharedFilesModal.vue', /@media \(max-width: 640px\)[\s\S]+\.shared-file-head[\s\S]+flex-direction:\s*column/],
  ['frontend/src/components/pets/PetCreateModal.vue', /width:\s*min\(380px, calc\(100vw - 32px\)\)/],
  ['frontend/src/components/pets/PetSkinCreateModal.vue', /width:\s*min\(380px, calc\(100vw - 32px\)\)/],
  ['frontend/src/components/music/MusicAgentSettingsModal.vue', /@media \(max-width: 600px\)[\s\S]+\.settings-modal[\s\S]+width:\s*100%/],
]
for (const [file, pattern] of responsiveContracts) assert.match(read(file), pattern, `${file} responsive contract missing`)
checks.push({ name: 'complex project, pet, and music modals own their responsive inner-layout rules', pass: true })

const modalFiles = []
const walk = directory => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (entry.name.endsWith('.vue') && fs.readFileSync(full, 'utf-8').includes('modal-overlay')) modalFiles.push(full)
  }
}
walk(path.join(root, 'frontend', 'src', 'components'))
const expectedModalFiles = [
  'agents/AgentPipelineModal.vue',
  'collaboration/GroupCreateModal.vue',
  'collaboration/GroupLogsModal.vue',
  'collaboration/GroupMembersModal.vue',
  'collaboration/GroupRenameModal.vue',
  'collaboration/GroupSharedFilesModal.vue',
  'common/UnifiedDiffModal.vue',
  'pets/PetCreateModal.vue',
  'pets/PetSkinCreateModal.vue',
  'projects/ProjectAgentSwitchModal.vue',
  'projects/ProjectSharedFilesModal.vue',
  'settings/ControlBotQrModal.vue',
  'tasks/AutomatedTaskIntakeModal.vue',
  'tasks/DailyDevTaskModal.vue',
  'tasks/TaskBacklogModal.vue',
  'tools/code-changes/CodeCommitPanel.vue',
]
const actualModalFiles = modalFiles.map(file => path.relative(path.join(root, 'frontend', 'src', 'components'), file).replaceAll('\\', '/')).sort()
assert.deepEqual(actualModalFiles, expectedModalFiles.slice().sort(), 'active modal inventory drifted without an explicit review')
assert.equal(
  modalFiles.some(file => /Template(?:Picker|VariablesModal)\.vue$/i.test(file)),
  false,
  'retired template modals must not return to the active modal inventory',
)
const scopedToolModal = read('frontend/src/components/common/AgentToolsModal.vue')
assert.match(scopedToolModal, /<Teleport to="body">/)
assert.match(scopedToolModal, /class="agent-tools-overlay"/)
assert.match(scopedToolModal, /class="tool-column"/)
checks.push({ name: `audited ${modalFiles.length} active modal-overlay components plus the shared scoped tool modal`, pass: true })

const projectForm = read('frontend/src/components/projects/ProjectFormModal.vue')
const projectFeishu = read('frontend/src/components/projects/ProjectFeishuQrModal.vue')
assert.match(projectForm, /class="project-form-modal"[\s\S]+role="dialog"[\s\S]+aria-modal="true"/)
assert.match(projectForm, /hasValidPlatform[\s\S]+请选择通知平台/)
assert.match(projectForm, /data-project-feishu-modal/)
assert.match(projectFeishu, /<Teleport to="body">/)
assert.match(projectFeishu, /z-index:\s*10100/)
assert.match(projectFeishu, /data-project-feishu-modal/)
checks.push({ name: 'project form remains self-contained while Feishu setup owns a higher body-level modal layer', pass: true })

const report = { pass: true, generatedAt: new Date().toISOString(), checks }
const outputDir = path.join(root, 'scratch', 'modal-layout-reliability')
fs.mkdirSync(outputDir, { recursive: true })
fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
