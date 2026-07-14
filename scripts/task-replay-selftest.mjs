import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  listTestAgentArtifactCatalogForTasks,
  resolveTestAgentArtifactForTask,
} from '../ccm-package/dist/test-agent/artifact-retention.js'
import {
  buildCompleteTaskReplay,
  buildTaskReplayIndex,
  runTaskReplayContractSelfTest,
} from '../ccm-package/dist/modules/collaboration/task-replay.js'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-task-replay-'))
try {
  const runDir = path.join(root, 'run-safe')
  fs.mkdirSync(runDir, { recursive: true })
  const screenshot = path.join(runDir, 'page.png')
  fs.writeFileSync(screenshot, Buffer.from('89504e470d0a1a0a', 'hex'))
  fs.writeFileSync(path.join(runDir, 'report.json'), JSON.stringify({ id: 'report-safe', taskId: 'task-safe', groupId: 'group-safe', status: 'passed', recommendation: 'accept', summary: '浏览器验证通过', startedAt: '2026-07-13T01:00:00.000Z', finishedAt: '2026-07-13T01:01:00.000Z' }))
  fs.writeFileSync(path.join(runDir, 'artifact-manifest.json'), JSON.stringify({ files: [{ type: 'screenshot', title: '完成页面', path: screenshot, project: 'web', status: 'passed', integrity: { sha256: 'test' } }, { type: 'unsafe', title: '越界文件', path: path.join(root, '..', 'outside.txt') }] }))

  const catalog = listTestAgentArtifactCatalogForTasks(['task-safe'], { rootDir: root, retentionDays: 14 })
  assert.equal(catalog.length, 1)
  assert.equal(catalog[0].artifacts.length, 2)
  const safeItem = catalog[0].artifacts.find(item => item.type === 'screenshot')
  const unsafeItem = catalog[0].artifacts.find(item => item.type === 'unsafe')
  assert.equal(safeItem.available, true)
  assert.equal(unsafeItem.available, false)
  assert.equal(JSON.stringify(catalog).includes(screenshot), false, 'catalog must not expose local paths')
  assert.ok(resolveTestAgentArtifactForTask({ taskId: 'task-safe', runId: 'report-safe', artifactId: safeItem.id, rootDir: root }))
  assert.equal(resolveTestAgentArtifactForTask({ taskId: 'wrong-task', runId: 'report-safe', artifactId: safeItem.id, rootDir: root }), null)
  assert.equal(resolveTestAgentArtifactForTask({ taskId: 'task-safe', runId: 'report-safe', artifactId: unsafeItem.id, rootDir: root }), null)

  const contract = runTaskReplayContractSelfTest()
  assert.equal(contract.pass, true)
  const index = buildTaskReplayIndex(3)
  assert.equal(index.schema, 'ccm-task-replay-index-v1')
  if (index.tasks.length) {
    const replay = buildCompleteTaskReplay(index.tasks[0].id)
    assert.equal(replay?.schema, 'ccm-complete-task-replay-v1')
    assert.equal(replay?.replay_capabilities?.raw_machine_paths_exposed, false)
    assert.equal(JSON.stringify(replay).includes('C:\\Users\\'), false, 'public replay must redact Windows user paths')
  }

  console.log(JSON.stringify({ pass: true, contract, catalogItems: catalog[0].artifacts.length, replayIndexRows: index.tasks.length }, null, 2))
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
