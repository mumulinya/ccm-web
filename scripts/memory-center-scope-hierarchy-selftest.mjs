import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptFile = fileURLToPath(import.meta.url)

if (process.argv.includes('--child')) {
  const home = path.join(os.homedir(), '.cc-connect')
  const writeJson = (relative, value) => {
    const file = path.join(home, relative)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(value, null, 2))
  }
  const writeText = (relative, value) => {
    const file = path.join(home, relative)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, value)
  }

  writeJson('groups.json', [{ id: 'group-a', name: 'Alpha 开发群' }])
  writeJson('group-messages/sessions/group-a/manifest.json', {
    schema: 'ccm-group-chat-sessions-v1',
    groupId: 'group-a',
    activeSessionId: 'gcs-two',
    sessions: [
      { id: 'gcs-one', title: '需求评审', messageCount: 8, updatedAt: '2026-07-18T10:00:00.000Z' },
      { id: 'gcs-two', title: '新会话', messageCount: 0, updatedAt: '2026-07-18T11:00:00.000Z' },
    ],
  })
  writeJson('group-memory-sessions/group-a/gcs-one.json', {
    groupId: 'group-a',
    groupSessionId: 'gcs-one',
    factAnchors: [{ id: 'raw-fact', text: '不应冒充正式记忆' }],
    decisions: [{ decision: '意图网关内部判断' }],
    nextActions: [{ action: '运行时下一步' }],
    compaction: {
      tokenMeasurement: { activeTokens: 1200, source: 'estimated' },
      compactStrategyDecision: {
        preservedSegment: { preservedTokenEstimate: 42, preservedMessageCount: 2, preservedMessageIds: ['m1', 'm2'] },
      },
    },
  })
  writeJson('group-messages/sessions/group-a/gcs-one.json', [
    { id: 'm1', role: 'user', content: '你好', timestamp: '2026-07-18T09:59:00.000Z' },
    { id: 'm2', role: 'assistant', content: '你好，有什么可以帮你？', timestamp: '2026-07-18T10:00:00.000Z' },
  ])
  writeJson('group-session-memory/group-a--gcs-one/snapshot.json', {
    schema: 'ccm-group-session-memory-snapshot-v1',
    groupId: 'group-a--gcs-one',
    extractionMethod: 'deterministic_structured_fallback',
    modelExtracted: false,
    deterministicFallback: true,
    hasSummary: true,
    markdownChecksum: 'local-reference',
    updateCadence: { status: 'waiting_initialization_tokens' },
  })
  writeText('group-session-memory/group-a--gcs-one/summary.md', '# Local structured reference')
  writeJson('project-memory/project-a.json', {
    project: 'project-a',
    user: [{ id: 'pref-1', text: '项目长期要求' }],
    compaction: {},
  })
  writeJson('web-sessions/project-a/session-one.json', {
    id: 'session-one',
    title: '登录页改造',
    project: 'project-a',
    messages: [],
    compaction: {},
  })
  writeJson('task-agent-sessions.json', {
    schema: 'ccm-task-agent-sessions-v1',
    sessions: [
      { id: 'tas-project-a-one', project: 'project-a', agentType: 'codex', taskId: 'task-a', groupId: 'group-a', status: 'closed', turnCount: 2, lastUsedAt: '2026-07-18T12:00:00.000Z' },
      { id: 'tas-project-a-two', project: 'project-a', agentType: 'cursor', taskId: 'task-b', groupId: 'group-a', status: 'open', turnCount: 1, lastUsedAt: '2026-07-18T13:00:00.000Z' },
      { id: 'tas-project-b-one', project: 'project-b', agentType: 'claudecode', taskId: 'task-c', groupId: 'group-a', status: 'closed', turnCount: 4, lastUsedAt: '2026-07-18T11:00:00.000Z' },
    ],
  })

  const { buildMemoryCenterOverview } = await import('../ccm-package/dist/modules/knowledge/memory-control-center-handler.js')
  const { getMemoryCenterScope } = await import('../ccm-package/dist/modules/knowledge/memory-control-center-api.js')
  const overview = buildMemoryCenterOverview()
  const groupSessions = overview.groups.filter(item => item.groupId === 'group-a')
  const projectItems = overview.projects.filter(item => item.projectId === 'project-a')
  const taskItems = overview.tasks
  const storedDetail = getMemoryCenterScope('group', 'group-a::gcs-one')
  const virtualDetail = getMemoryCenterScope('group', 'group-a::gcs-two')
  const storedTypes = new Set(storedDetail.itemGroups.map(group => group.type))
  const recentItems = storedDetail.itemGroups.find(group => group.type === 'recentMessages')?.items || []
  const checks = {
    allManifestSessionsProjected: groupSessions.length === 2,
    groupIdentityExposed: groupSessions.every(item => item.groupLabel === 'Alpha 开发群'),
    sessionIdentityExposed: new Set(groupSessions.map(item => item.groupSessionId)).size === 2,
    storedStateMarked: groupSessions.find(item => item.groupSessionId === 'gcs-one')?.hasMemoryState === true,
    emptyStateMarked: groupSessions.find(item => item.groupSessionId === 'gcs-two')?.hasMemoryState === false,
    emptySessionDetailWorks: virtualDetail.rawMemory.virtualSession === true,
    runtimeStateNotPresentedAsMemory: !['factAnchors', 'decisions', 'nextActions'].some(type => storedTypes.has(type)),
    recentTranscriptPresentedReadOnly: recentItems.length === 2 && recentItems.every(item => item.readOnly === true),
    localFallbackNotCanonical: storedDetail.summary.sessionMemory?.status === 'waiting_model' && storedDetail.summary.sessionMemory?.canonical === false,
    recentWindowMetricsProjected: storedDetail.summary.preservedRecentTokens === 42 && storedDetail.summary.preservedRecentMessages === 2,
    projectLongTermSeparate: projectItems.some(item => item.memoryKind === 'long_term' && item.scope === 'project'),
    projectSessionSeparate: projectItems.some(item => item.memoryKind === 'session' && item.scope === 'project_session'),
    projectSessionIdentityExposed: projectItems.find(item => item.memoryKind === 'session')?.projectSessionId === 'session-one',
    taskProjectIdentityExposed: taskItems.length === 3 && new Set(taskItems.map(item => item.projectId)).size === 2,
    taskSessionMetadataExposed: taskItems.every(item => item.taskAgentSessionId && item.agentType && item.taskId && item.groupId),
    taskSessionsSortedByRecentUse: taskItems.map(item => item.taskAgentSessionId).join(',') === 'tas-project-a-two,tas-project-a-one,tas-project-b-one',
  }
  assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify({ checks, overview }, null, 2))
  console.log(JSON.stringify({ pass: true, checks: Object.keys(checks).length, checksDetail: checks }))
  process.exit(0)
}

const frontend = fs.readFileSync(new URL('../frontend/src/components/knowledge/MemoryCenterPanel.vue', import.meta.url), 'utf8')
assert.match(frontend, /const globalTree = computed/)
assert.match(frontend, /const groupTrees = computed/)
assert.match(frontend, /const projectTrees = computed/)
assert.match(frontend, /const taskProjectTrees = computed/)
assert.match(frontend, /v-for="tree in groupTrees"/)
assert.match(frontend, /v-for="tree in projectTrees"/)
assert.match(frontend, /v-for="tree in taskProjectTrees"/)
assert.match(frontend, /data-scope-kind="task-agent"/)
assert.doesNotMatch(frontend, /v-for="item in taskScopes"/)
assert.match(frontend, /tree\.sessions\.length/)
assert.match(frontend, /class="scope-children"/)

const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-memory-center-hierarchy-'))
try {
  const child = spawnSync(process.execPath, [scriptFile, '--child'], {
    cwd: path.dirname(path.dirname(scriptFile)),
    env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome },
    encoding: 'utf8',
    timeout: 120_000,
  })
  assert.equal(child.status, 0, child.stderr || child.stdout)
  const result = JSON.parse(String(child.stdout || '').trim().split(/\r?\n/).at(-1))
  assert.equal(result.pass, true)
  console.log(JSON.stringify({ pass: true, checks: result.checks + 11, hierarchy: 'scope -> project -> sessions' }, null, 2))
} finally {
  fs.rmSync(tempHome, { recursive: true, force: true })
}
