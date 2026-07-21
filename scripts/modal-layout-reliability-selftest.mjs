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
  ['frontend/src/components/projects/ProjectFolderBrowserModal.vue', /@media \(max-width: 640px\)[\s\S]+\.folder-actions[\s\S]+grid-template-columns:\s*1fr 1fr/],
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
assert.ok(modalFiles.length >= 21, `expected at least 21 modal components, received ${modalFiles.length}`)
checks.push({ name: `audited ${modalFiles.length} modal-overlay components across the application`, pass: true })

const projectForm = read('frontend/src/components/projects/ProjectFormModal.vue')
assert.match(projectForm, /class="project-form-modal"[\s\S]+role="dialog"[\s\S]+aria-modal="true"/)
assert.match(projectForm, /hasValidPlatform[\s\S]+请选择通知平台/)
checks.push({ name: 'project form remains self-contained and rejects invalid legacy platform values', pass: true })

const report = { pass: true, generatedAt: new Date().toISOString(), checks }
const outputDir = path.join(root, 'scratch', 'modal-layout-reliability')
fs.mkdirSync(outputDir, { recursive: true })
fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
