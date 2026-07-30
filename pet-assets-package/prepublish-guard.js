#!/usr/bin/env node

'use strict'

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const packageRoot = __dirname
const packageFile = path.join(packageRoot, 'package.json')
const packageInfo = JSON.parse(fs.readFileSync(packageFile, 'utf8'))
const attestationFile = String(process.env.CCM_PET_ASSET_RELEASE_ATTESTATION || '').trim()
const releaseManifestFile = String(process.env.CCM_RELEASE_MANIFEST || '').trim()
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')

if (!attestationFile || !path.isAbsolute(attestationFile) || !fs.existsSync(attestationFile)) {
  console.error('[CCM pet assets] Refusing an unattested pack/publish. Use npm run release:artifact.')
  process.exit(1)
}

const attestation = JSON.parse(fs.readFileSync(attestationFile, 'utf8'))
const valid = attestation?.schema === 'ccm-release-build-attestation-v1'
  && attestation?.package_name === packageInfo.name
  && attestation?.version === packageInfo.version
  && attestation?.package_json_sha256 === sha256(packageFile)
  && attestation?.source_root === path.resolve(packageRoot, '..')
  && Date.parse(attestation?.expires_at || 0) > Date.now()

if (!valid) {
  console.error('[CCM pet assets] Release attestation is missing, expired, or does not match package.json.')
  process.exit(1)
}

if (process.argv.includes('--publish')) {
  if (!releaseManifestFile || !path.isAbsolute(releaseManifestFile) || !fs.existsSync(releaseManifestFile)) {
    console.error('[CCM pet assets] Refusing publish without a tested release manifest.')
    process.exit(1)
  }
  const releaseManifest = JSON.parse(fs.readFileSync(releaseManifestFile, 'utf8'))
  if (
    releaseManifest?.schema !== 'ccm-release-artifact-manifest-v1'
    || releaseManifest?.pet_assets?.package_name !== packageInfo.name
    || releaseManifest?.pet_assets?.version !== packageInfo.version
    || releaseManifest?.tested !== true
  ) {
    console.error('[CCM pet assets] The matching core release has not passed the platform matrix.')
    process.exit(1)
  }
}

process.stderr.write(`[CCM pet assets] Verified ${packageInfo.name}@${packageInfo.version} build attestation.\n`)
