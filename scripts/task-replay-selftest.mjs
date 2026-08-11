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
  buildTaskReplayIndexFromRecords,
  paginateReplayEventsForView,
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
  const syntheticEvents = Array.from({ length: 8 }, (_, index) => ({
    id: `event-${index}`,
    at: `2026-07-13T01:00:0${index}.000Z`,
    stage: index === 3 ? 'test' : 'execution',
    category: 'fixture',
    status: index === 3 ? 'failed' : 'passed',
    title: index === 3 ? '浏览器验证失败' : `事件 ${index}`,
    summary: '',
    actor: { type: index === 3 ? 'test_agent' : 'project_agent', label: index === 3 ? 'TestAgent' : 'web' },
    task_id: 'task-page',
    parent_task_id: '',
    trace_id: 'trace-page',
    project: 'web',
    source: 'fixture',
    evidence_ids: [],
  }))
  const audienceEvents = [
    { ...syntheticEvents[0], id: 'aud-readable', source: 'execution', status: 'info', audience: 'user', title: 'web 正在修改登录状态恢复逻辑' },
    { ...syntheticEvents[0], id: 'aud-machine', source: 'trace', status: 'info', audience: 'technical', title: 'agent.run', summary: '' },
  ]
  const defaultAudienceView = paginateReplayEventsForView(audienceEvents, { eventLimit: 10 })
  assert.deepEqual(defaultAudienceView.events.map(item => item.id), ['aud-readable'], 'readable low-level events must stay visible by default')
  const allAudienceView = paginateReplayEventsForView(audienceEvents, { eventLimit: 10, includeSystemEvents: true })
  assert.equal(allAudienceView.events.length, 2, 'technical events appear once the toggle is on')

  const tailPage = paginateReplayEventsForView(syntheticEvents, { eventLimit: 3, eventTail: true })
  assert.deepEqual(tailPage.events.map(item => item.id), ['event-5', 'event-6', 'event-7'])
  assert.equal(tailPage.eventPage.offset, 5)
  assert.equal(tailPage.eventPage.has_previous, true)
  const issuePage = paginateReplayEventsForView(syntheticEvents, { eventLimit: 3, preset: 'issues' })
  assert.deepEqual(issuePage.events.map(item => item.id), ['event-3'])
  const incrementalPage = paginateReplayEventsForView(syntheticEvents, { eventLimit: 3, afterEventAt: syntheticEvents[5].at, afterEventId: syntheticEvents[5].id })
  assert.deepEqual(incrementalPage.events.map(item => item.id), ['event-6', 'event-7'])
  const syntheticTasks = [
    { id:'root-a', title:'登录恢复', description:'修复刷新状态', group_id:'group-a', status:'done', created_at:'2026-07-10T01:00:00.000Z', updated_at:'2026-07-13T01:00:00.000Z' },
    { id:'child-a', parent_task_id:'root-a', title:'前端修复', target_project:'web', group_id:'group-a', status:'done', created_at:'2026-07-10T01:01:00.000Z', updated_at:'2026-07-13T01:00:00.000Z' },
    { id:'root-b', title:'接口升级', description:'更新 API', group_id:'group-b', target_project:'api', status:'running', created_at:'2026-07-11T01:00:00.000Z', updated_at:'2026-07-14T01:00:00.000Z' },
  ]
  const syntheticGroups = [{id:'group-a',name:'产品群'},{id:'group-b',name:'服务群'}]
  const filteredIndex = buildTaskReplayIndexFromRecords(syntheticTasks, syntheticGroups, { limit:1, page:1, query:'登录', project:'web', groupId:'group-a', status:'done' })
  assert.equal(filteredIndex.total, 1)
  assert.equal(filteredIndex.total_all, 2)
  assert.equal(filteredIndex.tasks[0].group_name, '产品群')
  assert.deepEqual(filteredIndex.tasks[0].projects, ['web'])
  assert.equal(filteredIndex.facets.groups.length, 2)
  const pagedIndex = buildTaskReplayIndexFromRecords(syntheticTasks, syntheticGroups, { limit:1, page:2 })
  assert.equal(pagedIndex.tasks[0].id, 'root-a')
  assert.equal(pagedIndex.has_previous, true)
  const index = buildTaskReplayIndex(3)
  assert.equal(index.schema, 'ccm-task-replay-index-v1')
  assert.equal(index.page, 1)
  assert.equal(index.page_size, 3)
  assert.ok(index.facets && Array.isArray(index.facets.projects))
  if (index.tasks.length) {
    const replay = buildCompleteTaskReplay(index.tasks[0].id)
    assert.equal(replay?.schema, 'ccm-complete-task-replay-v1')
    assert.equal(replay?.replay_capabilities?.raw_machine_paths_exposed, false)
    assert.equal(replay?.replay_capabilities?.plan_visibility, true)
    assert.equal(replay?.replay_capabilities?.work_item_visibility, true)
    assert.equal(replay?.replay_capabilities?.user_readable_v5, true)
    assert.equal(replay?.presentation?.schema, 'ccm-task-replay-presentation-v5')
    assert.equal(['complete', 'mostly_complete', 'partial', 'legacy'].includes(replay?.presentation?.integrity?.level), true)
    assert.equal(Array.isArray(replay?.presentation?.causalChain?.nodes), true)
    assert.equal(Array.isArray(replay?.presentation?.attemptComparisons), true)
    assert.equal(Array.isArray(replay?.presentation?.actionCenter), true)
    assert.equal(replay?.presentation?.chapters?.length, 6)
    assert.equal(Array.isArray(replay?.presentation?.acceptanceMatrix), true)
    assert.equal(Array.isArray(replay?.presentation?.attempts), true)
    assert.equal(Array.isArray(replay?.presentation?.issues), true)
    assert.equal(replay?.presentation?.contentStored, false)
    assert.equal(Array.isArray(replay?.navigation), true)
    assert.equal(Array.isArray(replay?.plans), true, 'replay must expose plan views')
    assert.equal(Array.isArray(replay?.work_items), true, 'replay must expose work item rows')
    assert.equal(replay?.summary?.plan_count, replay?.plans?.length)
    assert.equal(replay?.summary?.work_item_count, replay?.work_items?.length)
    assert.equal(JSON.stringify(replay).includes('C:\\Users\\'), false, 'public replay must redact Windows user paths')
    const page = buildCompleteTaskReplay(index.tasks[0].id, { eventLimit: 2, eventTail: true, includeSystemEvents: true })
    assert.equal(page?.replay_capabilities?.event_pagination, true)
    assert.ok((page?.events?.length || 0) <= 2)
    assert.equal(page?.event_page?.returned, page?.events?.length)
    assert.equal(page?.event_page?.total_unfiltered, replay?.summary?.event_count)
    const cursor = page?.event_page?.last_cursor
    const incremental = buildCompleteTaskReplay(index.tasks[0].id, { eventLimit: 2, afterEventAt: cursor?.at, afterEventId: cursor?.id, includeSystemEvents: true })
    assert.equal(incremental?.event_page?.mode, 'incremental')
    assert.equal(incremental?.events?.length, 0)
    const firstProject = index.tasks[0].projects?.[0]
    if (firstProject) {
      const projectIndex = buildTaskReplayIndex({ limit: 3, project: firstProject })
      assert.ok(projectIndex.tasks.every(item => item.projects.includes(firstProject)))
    }
  }

  console.log(JSON.stringify({ pass: true, contract, catalogItems: catalog[0].artifacts.length, replayIndexRows: index.tasks.length }, null, 2))
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
