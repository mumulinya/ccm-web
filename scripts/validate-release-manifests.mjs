import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const workspace = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const core = JSON.parse(fs.readFileSync(path.join(root, 'ccm-package', 'package.json'), 'utf8'))
const pets = JSON.parse(fs.readFileSync(path.join(root, 'pet-assets-package', 'package.json'), 'utf8'))

if (core.version !== pets.version) throw new Error('Core and pet asset package versions must match')
for (const section of ['dependencies', 'optionalDependencies']) {
  for (const [name, spec] of Object.entries(core[section] || {})) {
    if (/^(?:file|link|workspace):/i.test(String(spec))) throw new Error(`Local dependency is forbidden: ${name}`)
    if (workspace[section]?.[name] && workspace[section][name] !== spec) {
      throw new Error(`Dependency version drift for ${name}: workspace=${workspace[section][name]} package=${spec}`)
    }
  }
}
for (const command of ['ccm.js', 'legacy-project-cli.js', 'postinstall.js', 'prepublish-guard.js', 'service-runtime.js', 'update-runtime.js']) {
  if (!fs.existsSync(path.join(root, 'ccm-package', 'bin', command))) throw new Error(`Missing packaged CLI file: ${command}`)
}
for (const distFile of ['server.js', 'core/credential-store.js', 'core/db.js', 'core/utils.js', 'core/task-store.js']) {
  if (!fs.existsSync(path.join(root, 'ccm-package', 'dist', distFile))) throw new Error(`Missing packaged dist file: ${distFile}`)
}
console.log(JSON.stringify({ success: true, core: core.version, petAssets: pets.version }, null, 2))
