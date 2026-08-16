import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const sourceRoot = path.join(root, 'frontend', 'src')
const componentsRoot = path.join(sourceRoot, 'components')
const checks = []

const collect = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const target = path.join(directory, entry.name)
  if (entry.isDirectory()) return collect(target)
  return /\.(?:vue|css)$/.test(entry.name) ? [target] : []
})

const allowedFixedLightSurface = (relative, line) => {
  if (relative === 'auth/AuthPage.vue' && line.includes('[data-auth-theme="light"]')) return true
  if (relative === 'settings/ControlBotQrModal.vue' && line.includes('.qr-preview')) return true
  if (/^settings\/settings\.css$/i.test(relative) && (line.trim() === 'background: #fff;' || line.includes('.settings-switch-track::after'))) return true
  if (relative === 'tools/ToolsConfig.css' && line.trim() === 'background: #ffffff;') return true
  if (relative === 'tools/CronJobs.css' && line.trim() === 'background: white;') return true
  if (relative === 'knowledge/KnowledgeSettingsModal.vue' && line.includes('.toggle-control::after')) return true
  return false
}

const fixedLightPattern = /background(?:-color)?\s*:\s*(?:#fff(?:fff)?\b|white\b|rgba\(255\s*,\s*255\s*,\s*255\s*,\s*(?:0\.[3-9]|1))/i
const unexpected = []
for (const file of collect(componentsRoot)) {
  const relative = path.relative(componentsRoot, file).replaceAll('\\', '/')
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line, index) => {
    if (fixedLightPattern.test(line) && !allowedFixedLightSurface(relative, line)) {
      unexpected.push(`${relative}:${index + 1}`)
    }
  })
}
assert.deepEqual(unexpected, [], `fixed light surfaces bypass the active theme: ${unexpected.join(', ')}`)
checks.push('all application pages reject unapproved fixed white surfaces')

const globalCss = fs.readFileSync(path.join(sourceRoot, 'style.css'), 'utf8')
for (const token of ['--surface-raised', '--surface-translucent', '--surface-subtle', '--control-bg', '--overlay-scrim']) {
  assert.match(globalCss, new RegExp(`${token.replace('-', '\\-')}\\s*:`), `missing ${token}`)
}
checks.push('shared page, panel, control and overlay surface tokens exist')

assert.match(globalCss, /select,\s*\noption,\s*\noptgroup\s*\{[\s\S]*?color-scheme:\s*inherit;/)
assert.match(globalCss, /option:checked\s*\{[\s\S]*?background-color:\s*var\(--accent-soft\)/)
checks.push('native select, option and optgroup surfaces inherit the active color scheme')

assert.match(globalCss, /html\[data-theme-preset\]:not\(\[data-theme-preset="default"\]\)\s*\{[\s\S]*?--surface-raised:[\s\S]*?--warning-soft:/)
checks.push('non-default presets derive raised and semantic surfaces from their own palette')

assert.match(globalCss, /body::after\s*\{\s*display:\s*none;\s*content:\s*none;/)
checks.push('legacy preset glow cannot widen or recolor mobile pages')

const memoryCss = fs.readFileSync(path.join(componentsRoot, 'knowledge', 'MemoryCenterPanel.vue'), 'utf8')
assert.doesNotMatch(memoryCss, fixedLightPattern)
assert.match(memoryCss, /\.memory-center-root[^}]*background:\s*var\(--bg-primary\)/)
checks.push('Memory Center follows page and surface theme tokens')

const groupHeader = fs.readFileSync(path.join(componentsRoot, 'collaboration', 'GroupChatHeader.vue'), 'utf8')
assert.match(groupHeader, /\.group-select-wrap select[^}]*background:\s*transparent/)
assert.match(groupHeader, /\.group-select-wrap[^}]*background:\s*var\(--(?:surface|control-bg)/)
checks.push('group selector inherits its themed wrapper and native option contract')

const contextUsage = fs.readFileSync(path.join(componentsRoot, 'common', 'SessionContextUsage.vue'), 'utf8')
assert.match(contextUsage, /\.context-popover-header strong\s*\{\s*color:\s*var\(--text-primary\)/)
assert.match(contextUsage, /\.context-meter\s*\{[^}]*background:\s*var\(--panel-muted\)/)
checks.push('session context detail popover uses themed text, borders and meter surfaces')

const toolsCss = fs.readFileSync(path.join(componentsRoot, 'tools', 'ToolsConfig.css'), 'utf8')
assert.match(toolsCss, /\.drawer[^}]*background:\s*var\(--surface-translucent\)\s*!important/)
assert.match(toolsCss, /\.marketplace-source-selector select[^}]*background:\s*var\(--control-bg\)/)
checks.push('tool drawers, modals and marketplace controls use theme surfaces')

const workbench = fs.readFileSync(path.join(componentsRoot, 'common', 'UsabilityWorkbench.vue'), 'utf8')
assert.doesNotMatch(workbench, fixedLightPattern)
assert.match(workbench, /\.workbench\s*\{[^}]*color:\s*var\(--text-primary/)
assert.match(workbench, /\.command-surface\s*\{[^}]*background:\s*var\(--surface/)
checks.push('production workbench follows the active workspace palette')

const taskExperience = fs.readFileSync(path.join(componentsRoot, 'tasks', 'TaskExperienceCard.css'), 'utf8')
const mainDecision = fs.readFileSync(path.join(componentsRoot, 'agents', 'MainAgentDecisionCard.vue'), 'utf8')
assert.match(taskExperience, /data-theme="dark"[\s\S]*?\.completion-readiness[\s\S]*?background:var\(--panel-muted\)/)
assert.match(mainDecision, /data-theme="dark"[\s\S]*?\.main-agent-decision-card[\s\S]*?background:var\(--surface\)/)
checks.push('task and main-Agent status surfaces normalize through the selected dark palette')

console.log(`Theme background contract selftest passed: ${checks.length} checks`)
checks.forEach((check, index) => console.log(`${index + 1}. ${check}`))
