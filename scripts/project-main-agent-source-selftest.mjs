import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceModule = await import(pathToFileURL(path.join(
  root,
  'ccm-package/dist/modules/projects/project-main-agent-source.js',
)).href)

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-project-main-source-'))
const projectRoot = path.join(fixtureRoot, 'project')
const outsideFile = path.join(fixtureRoot, 'outside.ts')

try {
  fs.mkdirSync(path.join(projectRoot, 'src'), { recursive: true })
  fs.mkdirSync(path.join(projectRoot, 'node_modules'), { recursive: true })
  fs.mkdirSync(path.join(projectRoot, 'dist'), { recursive: true })
  fs.writeFileSync(path.join(projectRoot, 'package.json'), '{"scripts":{"test":"node test.js"}}\n')
  fs.writeFileSync(path.join(projectRoot, 'src', 'service.ts'), [
    'export const serviceName = "demo"',
    'apiKey = secret-value',
    'export function run() { return serviceName }',
    '',
  ].join('\n'))
  fs.writeFileSync(path.join(projectRoot, '.env'), 'PASSWORD=must-not-leak\n')
  fs.writeFileSync(path.join(projectRoot, 'node_modules', 'ignored.js'), 'throw new Error("ignored")\n')
  fs.writeFileSync(path.join(projectRoot, 'dist', 'ignored.js'), 'throw new Error("ignored")\n')
  fs.writeFileSync(outsideFile, 'export const outside = true\n')

  const manifest = sourceModule.buildProjectSourceManifest('demo', projectRoot)
  const manifestPaths = manifest.files.map(item => item.path)
  const evidence = sourceModule.readProjectSourceEvidence({
    project: 'demo',
    workDir: projectRoot,
    manifest,
    selectedPaths: ['src/service.ts', '.env', '../outside.ts'],
  })
  const sourceContent = evidence.files.find(item => item.path === 'src/service.ts')?.content || ''

  const checks = {
    includesProjectConfig: manifestPaths.includes('package.json'),
    includesProjectSource: manifestPaths.includes('src/service.ts'),
    excludesEnvironmentSecrets: !manifestPaths.includes('.env'),
    excludesDependencies: !manifestPaths.includes('node_modules/ignored.js'),
    excludesBuildArtifacts: !manifestPaths.includes('dist/ignored.js'),
    readsOnlyManifestSource: evidence.selectedPaths.join(',') === 'src/service.ts',
    rejectsSensitiveAndOutsidePaths: evidence.rejectedPaths.some(item => item.path === '.env')
      && evidence.rejectedPaths.some(item => item.path === '../outside.ts'),
    redactsInlineSecretValues: sourceContent.includes('apiKey = [REDACTED]')
      && !sourceContent.includes('secret-value'),
    bindsEvidenceToProject: evidence.project === 'demo'
      && evidence.manifestChecksum === manifest.checksum,
  }

  for (const [name, pass] of Object.entries(checks)) {
    console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`)
  }
  if (!Object.values(checks).every(Boolean)) process.exitCode = 1
  else console.log(`Project main Agent source isolation self-test passed (${Object.keys(checks).length} checks).`)
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true })
}
