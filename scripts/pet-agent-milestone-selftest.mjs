import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const distRoot = process.env.CCM_BACKEND_DIST_DIR || path.join(root, 'ccm-package', 'dist')
const milestones = require(path.join(distRoot, 'system', 'pet-agent-milestones.js'))

const result = milestones.runPetAgentMilestoneSelfTest()
assert.equal(result.pass, true)
assert.equal(result.started.kind, 'implementation_started')
assert.equal(result.submitted.kind, 'result_submitted')
assert.match(result.submitted.summary, /等待 CCM 验收/)
assert.equal(result.terminal.kind, 'completed')
assert.equal(result.terminal.durable, true)
assert.equal(result.terminal.action.anchor_message_id, 'anchor-1')

const petRuntime = fs.readFileSync(path.join(root, 'backend', 'server-pet-activity.ts'), 'utf8')
assert.match(petRuntime, /payload\.petMilestone !== true/)
assert.match(petRuntime, /旧Runner直连/)
const runner = fs.readFileSync(path.join(root, 'backend', 'server-agent-runner.ts'), 'utf8')
assert.match(runner, /已提交结果，等待 CCM 验收/)
assert.doesNotMatch(runner, /broadcastPetSpeech\s*\(/)
assert.doesNotMatch(petRuntime, /payload\.text[\s\S]{0,200}notification_type:\s*"agent_completed"/)

const webPet = fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'pets', 'WebPetHost.vue'), 'utf8')
assert.match(webPet, /ccm-pet-agent-milestone-v1/)
assert.match(webPet, /data\.milestone\.petState/)
const desktopPet = fs.readFileSync(path.join(root, 'frontend', 'src', 'components', 'pets', 'DesktopPet.vue'), 'utf8')
assert.match(desktopPet, /bubbleTitle/)
assert.match(desktopPet, /hold_ms/)
const electronMain = fs.readFileSync(path.join(root, 'ccm-package', 'pet', 'main.js'), 'utf8')
assert.match(electronMain, /anchor_message_id/)
assert.match(electronMain, /pet_state/)
const electronRenderer = fs.readFileSync(path.join(root, 'ccm-package', 'pet', 'renderer', 'pet.js'), 'utf8')
assert.match(electronRenderer, /hold_ms/)
assert.match(electronRenderer, /data\.pet_state/)

console.log(JSON.stringify({
  pass: true,
  checks: 21,
  schema: milestones.PET_AGENT_MILESTONE_SCHEMA,
  paid_provider_calls: 0,
}, null, 2))
