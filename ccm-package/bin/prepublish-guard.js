#!/usr/bin/env node

"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const packageFile = path.join(packageRoot, "package.json");
const packageInfo = JSON.parse(fs.readFileSync(packageFile, "utf-8"));
const attestationFile = String(process.env.CCM_RELEASE_ATTESTATION || "").trim();
const releaseManifestFile = String(process.env.CCM_RELEASE_MANIFEST || "").trim();

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

if (!attestationFile || !path.isAbsolute(attestationFile) || !fs.existsSync(attestationFile)) {
  console.error("[CCM release] Refusing an unattested pack/publish. Use npm run release:artifact.");
  process.exit(1);
}

const attestation = JSON.parse(fs.readFileSync(attestationFile, "utf-8"));
const valid = attestation?.schema === "ccm-release-build-attestation-v1"
  && attestation?.package_name === packageInfo.name
  && attestation?.version === packageInfo.version
  && attestation?.package_json_sha256 === sha256(packageFile)
  && attestation?.source_root === path.resolve(packageRoot, "..")
  && Date.parse(attestation?.expires_at || 0) > Date.now();

if (!valid) {
  console.error("[CCM release] Release attestation is missing, expired, or does not match package.json.");
  process.exit(1);
}

if (process.argv.includes("--publish")) {
  if (!releaseManifestFile || !path.isAbsolute(releaseManifestFile) || !fs.existsSync(releaseManifestFile)) {
    console.error("[CCM release] Refusing publish without a tested release manifest.");
    process.exit(1);
  }
  const releaseManifest = JSON.parse(fs.readFileSync(releaseManifestFile, "utf-8"));
  if (
    releaseManifest?.schema !== "ccm-release-artifact-manifest-v1"
    || releaseManifest?.package_name !== packageInfo.name
    || releaseManifest?.version !== packageInfo.version
    || releaseManifest?.tested !== true
    || !Array.isArray(releaseManifest?.test_evidence)
    || releaseManifest.test_evidence.length < 4
  ) {
    console.error("[CCM release] The release manifest has not passed the full platform matrix.");
    process.exit(1);
  }
}

process.stderr.write(`[CCM release] Verified ${packageInfo.name}@${packageInfo.version} build attestation.\n`);
