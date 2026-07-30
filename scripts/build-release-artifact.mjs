import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageRoot = path.join(root, 'ccm-package')
const packageFile = path.join(packageRoot, 'package.json')
const packageInfo = JSON.parse(fs.readFileSync(packageFile, 'utf8'))
const petPackageRoot = path.join(root, 'pet-assets-package')
const petPackageFile = path.join(petPackageRoot, 'package.json')
const petPackageInfo = JSON.parse(fs.readFileSync(petPackageFile, 'utf8'))
const outputRoot = path.resolve(process.argv[2] || path.join(root, 'release-artifacts', packageInfo.version))
fs.mkdirSync(outputRoot, { recursive: true })

const hash = (file, algorithm = 'sha256') => crypto.createHash(algorithm).update(fs.readFileSync(file)).digest('hex')
const npmCli = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
const npmCommand = fs.existsSync(npmCli) ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm')
const npmPrefix = fs.existsSync(npmCli) ? [npmCli] : []
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    env: { ...process.env, ...(options.env || {}) },
    encoding: 'utf8',
    windowsHide: true,
    stdio: options.inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    timeout: options.timeout || 15 * 60_000,
    maxBuffer: 32 * 1024 * 1024,
  })
  if (result.status !== 0) throw new Error(String(result.error?.message || result.stderr || result.stdout || `${command} failed`))
  return String(result.stdout || '')
}

for (const [name, spec] of Object.entries({ ...(packageInfo.dependencies || {}), ...(packageInfo.optionalDependencies || {}) })) {
  if (/^(?:file|link|workspace):/i.test(String(spec))) throw new Error(`Local dependency is forbidden: ${name}`)
}

const previousManifestFile = path.join(outputRoot, 'release-artifact-manifest.json')
if (fs.existsSync(previousManifestFile)) {
  const previousManifest = JSON.parse(fs.readFileSync(previousManifestFile, 'utf8'))
  for (const relative of [previousManifest.tarball, previousManifest.sbom, previousManifest.pet_assets?.tarball]) {
    const baseName = path.basename(String(relative || ''))
    if (!baseName) continue
    for (const suffix of ['', '.raw']) {
      const candidate = path.join(outputRoot, `${baseName}${suffix}`)
      if (fs.existsSync(candidate)) fs.rmSync(candidate, { force: true })
    }
  }
}
for (const fileName of ['release-artifact-manifest.json', 'build-attestation.json', 'pet-assets-build-attestation.json', 'sbom.cdx.json']) {
  const candidate = path.join(outputRoot, fileName)
  if (fs.existsSync(candidate)) fs.rmSync(candidate, { force: true })
}
const expectedTarballName = `${String(packageInfo.name).replace(/^@/, '').replaceAll('/', '-')}-${packageInfo.version}.tgz`
const expectedPetTarballName = `${String(petPackageInfo.name).replace(/^@/, '').replaceAll('/', '-')}-${petPackageInfo.version}.tgz`
for (const fileName of [expectedTarballName, expectedPetTarballName]) {
  for (const suffix of ['', '.raw', '.normalized']) {
    const candidate = path.join(outputRoot, `${fileName}${suffix}`)
    if (fs.existsSync(candidate)) fs.rmSync(candidate, { force: true })
  }
}

run(process.execPath, [path.join(root, 'scripts', 'validate-release-manifests.mjs')], { inherit: true })
run(process.execPath, [path.join(root, 'scripts', 'build-pet-assets-package.mjs')], { inherit: true })

const attestationFile = path.join(outputRoot, 'build-attestation.json')
const attestation = {
  schema: 'ccm-release-build-attestation-v1',
  package_name: packageInfo.name,
  version: packageInfo.version,
  package_json_sha256: hash(packageFile),
  source_root: root,
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 60 * 60_000).toISOString(),
}
fs.writeFileSync(attestationFile, `${JSON.stringify(attestation, null, 2)}\n`, 'utf8')

const petAttestationFile = path.join(outputRoot, 'pet-assets-build-attestation.json')
const petAttestation = {
  schema: 'ccm-release-build-attestation-v1',
  package_name: petPackageInfo.name,
  version: petPackageInfo.version,
  package_json_sha256: hash(petPackageFile),
  source_root: root,
  created_at: attestation.created_at,
  expires_at: attestation.expires_at,
}
fs.writeFileSync(petAttestationFile, `${JSON.stringify(petAttestation, null, 2)}\n`, 'utf8')

const packOutput = JSON.parse(run(npmCommand, [...npmPrefix, 'pack', packageRoot, '--json', '--pack-destination', outputRoot], {
  env: { CCM_RELEASE_ATTESTATION: attestationFile },
}))
const packed = packOutput[0]
const tarball = path.join(outputRoot, packed.filename)
run(process.execPath, [path.join(root, 'scripts', 'normalize-npm-tarball-modes.mjs'), tarball], { inherit: true })
const rawTarball = `${tarball}.raw`
if (fs.existsSync(rawTarball)) fs.rmSync(rawTarball, { force: true })

const petPackOutput = JSON.parse(run(npmCommand, [...npmPrefix, 'pack', petPackageRoot, '--json', '--pack-destination', outputRoot], {
  env: { CCM_PET_ASSET_RELEASE_ATTESTATION: petAttestationFile },
}))
const petPacked = petPackOutput[0]
const petTarball = path.join(outputRoot, petPacked.filename)

const budgets = { compressed_bytes: 20 * 1024 * 1024, unpacked_bytes: 35 * 1024 * 1024, entries: 700 }
const actual = {
  compressed_bytes: fs.statSync(tarball).size,
  unpacked_bytes: Number(packed.unpackedSize || 0),
  entries: Number(packed.entryCount || (packed.files || []).length),
}
for (const [key, limit] of Object.entries(budgets)) {
  if (actual[key] > limit) throw new Error(`Core package budget exceeded: ${key} ${actual[key]} > ${limit}`)
}

const sbom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  serialNumber: `urn:uuid:${crypto.randomUUID()}`,
  version: 1,
  metadata: { timestamp: new Date().toISOString(), component: { type: 'application', name: packageInfo.name, version: packageInfo.version } },
  components: Object.entries({ ...(packageInfo.dependencies || {}), ...(packageInfo.optionalDependencies || {}) })
    .map(([name, version]) => ({ type: 'library', name, version: String(version), scope: packageInfo.optionalDependencies?.[name] ? 'optional' : 'required' })),
}
const sbomFile = path.join(outputRoot, 'sbom.cdx.json')
fs.writeFileSync(sbomFile, `${JSON.stringify(sbom, null, 2)}\n`, 'utf8')

const manifest = {
  schema: 'ccm-release-artifact-manifest-v1',
  package_name: packageInfo.name,
  version: packageInfo.version,
  tarball: path.basename(tarball),
  tarball_sha256: hash(tarball),
  sbom: path.basename(sbomFile),
  sbom_sha256: hash(sbomFile),
  pet_assets: {
    package_name: petPackageInfo.name,
    version: petPackageInfo.version,
    tarball: path.basename(petTarball),
    tarball_sha256: hash(petTarball),
    compressed_bytes: fs.statSync(petTarball).size,
    unpacked_bytes: Number(petPacked.unpackedSize || 0),
    entries: Number(petPacked.entryCount || (petPacked.files || []).length),
  },
  budgets,
  actual,
  executable_entries: ['package/bin/ccm.js', 'package/bin/legacy-project-cli.js', 'package/bin/postinstall.js', 'package/bin/prepublish-guard.js', 'package/bin/setup.js'],
  tested: false,
  created_at: new Date().toISOString(),
}
fs.writeFileSync(path.join(outputRoot, 'release-artifact-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ success: true, outputRoot, tarball, manifest }, null, 2))
