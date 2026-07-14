#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

if (process.env.CCM_REAL_AGENT_E2E !== '1') {
  throw new Error('Set CCM_REAL_AGENT_E2E=1 to run real Claude Code/Cursor/Codex MCP and Skill acceptance.')
}

const require = createRequire(import.meta.url)
const { runRuntimeToolRealCliMatrix } = require('../ccm-package/dist/tools/runtime-tool-real-cli-matrix.js')
const report = await runRuntimeToolRealCliMatrix({ preserveArtifacts: process.env.CCM_REAL_AGENT_E2E_PRESERVE === '1' })
assert.equal(report.complete, true, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
