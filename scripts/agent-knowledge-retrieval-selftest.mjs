import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-agent-knowledge-'))
process.env.USERPROFILE = tempHome
process.env.HOME = tempHome

const files = require(path.join(root, 'ccm-package', 'dist', 'modules', 'knowledge', 'knowledge-files.js'))
const index = require(path.join(root, 'ccm-package', 'dist', 'modules', 'knowledge', 'knowledge-index.js'))
const access = require(path.join(root, 'ccm-package', 'dist', 'modules', 'knowledge', 'knowledge-access.js'))
const checks = []
const check = (name, fn) => { fn(); checks.push({ name, pass: true }) }

function store(name, text, scope, visibility = 'shared') {
  files.storeKnowledgeBuffer(name, Buffer.from(`# ${name}\n\n${text}`), {
    scope,
    visibility,
    source: { type: 'agent-knowledge-selftest' },
  })
}

try {
  store('global-shared.md', 'GLOBAL-SHARED-731 全体可用规范', { type: 'global', id: '' })
  store('global-restricted.md', 'GLOBAL-RESTRICTED-842 仅全局助手资料', { type: 'global', id: '' }, 'restricted')
  store('group-a.md', 'GROUP-A-953 群聊甲内部规范', { type: 'group', id: 'group-a' }, 'restricted')
  store('group-b.md', 'GROUP-B-164 群聊乙内部规范', { type: 'group', id: 'group-b' })
  store('project-a.md', 'PROJECT-A-275 项目甲内部规范', { type: 'project', id: 'project-a' }, 'restricted')
  store('project-b.md', 'PROJECT-B-386 项目乙共享规范', { type: 'project', id: 'project-b' })
  await index.rebuildKnowledgeIndex('agent-knowledge-selftest')

  const local = await access.searchAgentKnowledge('GLOBAL-SHARED-731', { role: 'project-agent', project: 'project-a' })
  check('no Embedding configuration uses local hybrid retrieval', () => {
    assert.equal(local.embeddingMode, 'hashing')
    assert.equal(local.fallback, true)
    assert.deepEqual(local.citations, ['global-shared.md#0'])
  })

  const globalAgent = await access.searchAgentKnowledge('GLOBAL-RESTRICTED-842', { role: 'global-agent' })
  check('global Agent can read restricted global knowledge', () => assert.ok(globalAgent.citations.includes('global-restricted.md#0')))
  const projectCannotReadRestrictedGlobal = await access.searchAgentKnowledge('GLOBAL-RESTRICTED-842', { role: 'project-agent', project: 'project-a' })
  check('project Agent cannot read restricted global knowledge', () => assert.equal(projectCannotReadRestrictedGlobal.citations.includes('global-restricted.md#0'), false))

  const groupOwn = await access.searchAgentKnowledge('GROUP-A-953', {
    role: 'group-main-agent', project: '__coordinator__', groupId: 'group-a', projects: [{ name: 'project-a' }, { name: 'project-b' }],
  })
  check('group main Agent reads its exact restricted group knowledge', () => assert.ok(groupOwn.citations.includes('group-a.md#0')))
  const groupSibling = await access.searchAgentKnowledge('GROUP-B-164', {
    role: 'group-main-agent', project: '__coordinator__', groupId: 'group-a', projects: [{ name: 'project-a' }, { name: 'project-b' }],
  })
  check('group main Agent cannot read a sibling group', () => assert.equal(groupSibling.citations.includes('group-b.md#0'), false))

  const sharedMemberProject = await access.searchAgentKnowledge('PROJECT-B-386', {
    role: 'group-main-agent', project: '__coordinator__', groupId: 'group-a', projects: [{ name: 'project-a' }, { name: 'project-b' }],
  })
  check('group main Agent reads shared member-project knowledge', () => assert.ok(sharedMemberProject.citations.includes('project-b.md#0')))
  const restrictedMemberProject = await access.searchAgentKnowledge('PROJECT-A-275', {
    role: 'group-main-agent', project: '__coordinator__', groupId: 'group-a', projects: [{ name: 'project-a' }],
  })
  check('group main Agent does not implicitly read restricted member-project knowledge', () => assert.equal(restrictedMemberProject.citations.includes('project-a.md#0'), false))
  const exactProject = await access.searchAgentKnowledge('PROJECT-A-275', { role: 'project-agent', project: 'project-a' })
  check('exact project Agent reads its restricted project knowledge', () => assert.ok(exactProject.citations.includes('project-a.md#0')))

  files.saveRagEmbeddingConfig({ enabled: true, apiUrl: 'http://127.0.0.1:9/v1', apiKey: 'selftest', model: 'unreachable-test-model' })
  const degraded = await access.searchAgentKnowledge('GLOBAL-SHARED-731', { role: 'project-agent', project: 'project-a' })
  check('remote Embedding failure falls back to local retrieval', () => {
    assert.equal(degraded.embeddingMode, 'hashing-fallback')
    assert.equal(degraded.fallback, true)
    assert.ok(degraded.citations.includes('global-shared.md#0'))
    assert.ok(degraded.embeddingError)
  })

  console.log(JSON.stringify({ pass: true, checks }, null, 2))
} catch (error) {
  console.error(error?.stack || String(error))
  process.exitCode = 1
} finally {
  fs.rmSync(tempHome, { recursive: true, force: true })
}
