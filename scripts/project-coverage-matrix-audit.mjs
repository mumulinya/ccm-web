import fs from 'node:fs'
import path from 'node:path'
import {
  auditProjectCoverage,
  DEFAULT_DOCUMENT,
  DEFAULT_MANIFEST,
  readCoverageManifest,
} from './project-coverage-lib.mjs'

const root = path.resolve(import.meta.dirname, '..')
const manifestArgument = process.argv.find(argument => argument.startsWith('--manifest='))
const manifestPath = manifestArgument ? manifestArgument.slice('--manifest='.length) : DEFAULT_MANIFEST
const manifest = readCoverageManifest(root, manifestPath)
const documentPath = path.resolve(root, manifest.generatedDocument || DEFAULT_DOCUMENT)
const generatedDocument = fs.existsSync(documentPath) ? fs.readFileSync(documentPath, 'utf8') : ''
const { receipt } = auditProjectCoverage({ root, manifest, generatedDocument })
const receiptPath = path.join(root, 'scratch', 'project-coverage-audit-receipt.json')
fs.mkdirSync(path.dirname(receiptPath), { recursive: true })
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8')
console.log(JSON.stringify(receipt, null, 2))
if (!receipt.success) process.exitCode = 1
