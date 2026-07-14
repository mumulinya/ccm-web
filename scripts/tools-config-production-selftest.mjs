#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const catalog = require('../ccm-package/dist/tools/tool-catalog-management.js')
const result = catalog.runToolCatalogManagementSelfTest()
assert.equal(result.pass, true, 'tool catalog helper self-test failed')

const ui = fs.readFileSync(new URL('../frontend/src/components/tools/ToolsConfig.vue', import.meta.url), 'utf8')
const editor = fs.readFileSync(new URL('../frontend/src/components/tools/McpServerEditor.vue', import.meta.url), 'utf8')
const viewer = fs.readFileSync(new URL('../frontend/src/components/tools/SkillMarkdownViewer.vue', import.meta.url), 'utf8')
const backend = fs.readFileSync(new URL('../backend/modules/tools/tools.ts', import.meta.url), 'utf8')
const db = fs.readFileSync(new URL('../backend/core/db.ts', import.meta.url), 'utf8')

const checks = {
  overview: /currentFilter = ref\('overview'\)/.test(ui) && /ToolControlOverview/.test(ui),
  editor: /保存前测试/.test(editor) && /catalogImpact/.test(editor) && /createOnly/.test(editor),
  safeLinks: /\['http:', 'https:'\]/.test(viewer) && /noopener noreferrer/.test(viewer),
  hiddenDrawerUnmounted: /v-if="showDrawer" class="drawer-overlay show"/.test(ui),
  redactedList: /loadMcpTools\(\)\.map\(redactMcpToolForDisplay\)/.test(backend),
  rollback: /rollbackCatalogMutation/.test(backend),
  impactPreflight: /\/api\/tools\/catalog-impact/.test(backend),
  encryptedEnvironment: /protectCredential\(scope, `env\.\$\{key\}`/.test(db),
  feishuMcpInheritsSettingsCredentials: /control_bot_app_id \|\| feishu\?\.app_id/.test(db) && /String\(stored\?\.name \|\| ""\) === "mcp-feishu"/.test(db),
}
assert.ok(Object.values(checks).every(Boolean), `source contracts failed: ${JSON.stringify(checks)}`)

const sample = catalog.redactMcpToolForDisplay({
  name: 'secure-demo',
  command: 'node server.js --api-key command-secret',
  args: ['--token=argument-secret'],
  env: { API_KEY: 'environment-secret' },
})
const serialized = JSON.stringify(sample)
assert.ok(!serialized.includes('command-secret'))
assert.ok(!serialized.includes('argument-secret'))
assert.ok(!serialized.includes('environment-secret'))
assert.deepEqual(sample.envKeys, ['API_KEY'])

console.log(JSON.stringify({ ok: true, checks, helperChecks: result.checks, platform: os.platform(), cwd: path.resolve('.') }, null, 2))
