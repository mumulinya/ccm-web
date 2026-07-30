#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-cleanup-v2-'))
try {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts', 'cleanup-center-isolated-selftest-child.cjs')], {
    cwd: root,
    env: {
      ...process.env,
      HOME: tempHome,
      USERPROFILE: tempHome,
      CCM_TASK_STORE_DIR: path.join(tempHome, '.cc-connect'),
      CCM_BACKEND_DIST_DIR: process.env.CCM_BACKEND_DIST_DIR || path.join(root, 'ccm-package', 'dist'),
    },
    encoding: 'utf8',
    timeout: 90_000,
  })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  const report = JSON.parse(result.stdout)
  assert.equal(report.pass, true)
  assert.equal(Object.values(report.checks).every(Boolean), true)
  console.log(JSON.stringify({ pass: true, checks: { ...report.checks, isolated_runtime_data: true, provider_calls: 0 } }, null, 2))
} finally {
  try { fs.rmSync(tempHome, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }) } catch {}
}
