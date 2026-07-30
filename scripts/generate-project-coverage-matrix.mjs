import fs from 'node:fs'
import path from 'node:path'
import {
  DEFAULT_DOCUMENT,
  DEFAULT_MANIFEST,
  readCoverageManifest,
  renderCoverageMatrix,
} from './project-coverage-lib.mjs'

const root = path.resolve(import.meta.dirname, '..')
const manifest = readCoverageManifest(root, DEFAULT_MANIFEST)
const outputPath = path.resolve(root, manifest.generatedDocument || DEFAULT_DOCUMENT)
const content = renderCoverageMatrix(manifest)
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, content, 'utf8')
console.log(JSON.stringify({
  success: true,
  schema: manifest.schema,
  domains: manifest.domains?.length || 0,
  compatibility_entries: manifest.compatibilityEntries?.length || 0,
  output: path.relative(root, outputPath).replaceAll('\\', '/'),
}, null, 2))
