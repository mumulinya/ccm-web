import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const scriptFile = fileURLToPath(import.meta.url)

if (process.argv.includes('--child')) {
  const home = path.join(os.homedir(), '.cc-connect')
  fs.mkdirSync(home, { recursive: true })
  const {
    generateSessionTitleWithModel,
    isMeaningfulSessionTitleInput,
    isSessionTitlePlaceholder,
  } = await import('../ccm-package/dist/system/session-title.js')

  let modelCalls = 0
  const modelCall = async request => {
    modelCalls += 1
    assert.match(request.user, /修复登录页权限校验/)
    assert.match(request.user, /已完成权限校验修复/)
    return '“修复登录权限校验”'
  }

  const storage = await import('../ccm-package/dist/modules/collaboration/storage.js')
  const group = storage.createGroupChatSession('group-title-test', '新会话')
  storage.saveGroupMessages('group-title-test', [
    { id: 'gu1', role: 'user', content: '帮我修复登录页权限校验', timestamp: '2026-07-18T10:00:00.000Z' },
    { id: 'ga1', role: 'assistant', content: '已完成权限校验修复并通过测试', timestamp: '2026-07-18T10:00:05.000Z' },
  ], group.id)
  const groupResult = await storage.scheduleGroupSessionAutoTitle('group-title-test', group.id, { modelCall })
  const groupRenamed = storage.listGroupChatSessions('group-title-test').sessions.find(item => item.id === group.id)
  assert.equal(groupResult.renamed, true, JSON.stringify({ groupResult, groupRenamed }, null, 2))
  assert.equal(groupRenamed.title, '修复登录权限校验')
  assert.equal(groupRenamed.titleOrigin, 'model')
  storage.renameGroupChatSession('group-title-test', group.id, '用户手动标题')
  const protectedGroup = await storage.scheduleGroupSessionAutoTitle('group-title-test', group.id, { modelCall })
  assert.equal(protectedGroup.renamed, false)

  const projectDir = path.join(home, 'web-sessions', 'project-title-test')
  fs.mkdirSync(projectDir, { recursive: true })
  fs.writeFileSync(path.join(projectDir, 's1.json'), JSON.stringify({
    id: 's1', name: '新会话', title_origin: 'placeholder', history: [
      { id: 'pu1', role: 'user', content: '帮我修复登录页权限校验' },
      { id: 'pa1', role: 'assistant', content: '已完成权限校验修复并通过测试' },
    ],
  }, null, 2))
  const projects = await import('../ccm-package/dist/modules/projects/sessions.js')
  const projectResult = await projects.scheduleProjectSessionAutoTitle('project-title-test', 's1', { modelCall })
  const projectSession = JSON.parse(fs.readFileSync(path.join(projectDir, 's1.json'), 'utf8'))
  assert.equal(projectResult.renamed, true)
  assert.equal(projectSession.name, '修复登录权限校验')
  assert.equal(projectSession.title_origin, 'model')
  fs.writeFileSync(path.join(projectDir, 's2.json'), JSON.stringify({
    id: 's2', name: '用户手动项目标题', title_origin: 'manual', history: [
      { role: 'user', content: '帮我修复登录页权限校验' },
      { role: 'assistant', content: '已完成权限校验修复并通过测试' },
    ],
  }, null, 2))
  const protectedProject = await projects.scheduleProjectSessionAutoTitle('project-title-test', 's2', { modelCall })
  assert.equal(protectedProject.renamed, false)

  const historyFile = path.join(home, 'global-agent-history.json')
  const { createGlobalAgentHistoryRuntime } = await import('../ccm-package/dist/modules/global/global-agent-history.js')
  const runtime = createGlobalAgentHistoryRuntime({
    GLOBAL_AGENT_HISTORY_FILE: historyFile,
    GLOBAL_AGENT_HISTORY_LIMIT: 80,
    GLOBAL_AGENT_SESSION_LIMIT: 30,
    buildGlobalVisibleReplyContent: ({ value }) => ({ text: String(value || ''), technical_content: '' }),
    generateSessionTitle: input => generateSessionTitleWithModel(input, { modelCall }),
    ingestGlobalAgentConversation: () => {},
    isSessionTitlePlaceholder,
    writeGlobalJsonAtomic: (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2)),
  })
  runtime.syncGlobalAgentWebHistory({
    currentSessionId: 'global-s1',
    sessions: [{
      id: 'global-s1', name: '新会话', titleOrigin: 'placeholder', messages: [
        { role: 'user', content: '帮我修复登录页权限校验', timestamp: '2026-07-18T10:00:00.000Z' },
        { role: 'assistant', content: '已完成权限校验修复并通过测试', timestamp: '2026-07-18T10:00:05.000Z' },
      ],
    }],
  })
  const globalResult = await runtime.scheduleGlobalSessionAutoTitle('global-s1')
  const globalSession = runtime.loadGlobalAgentHistoryStore().sessions.find(item => item.id === 'global-s1')
  assert.equal(globalResult.renamed, true)
  assert.equal(globalSession.name, '修复登录权限校验')
  assert.equal(globalSession.titleOrigin, 'model')
  runtime.syncGlobalAgentWebHistory({
    currentSessionId: 'global-s1',
    sessions: [{ id: 'global-s1', name: '新会话', titleOrigin: 'placeholder', messages: globalSession.messages }],
  })
  await runtime.scheduleGlobalSessionAutoTitle('global-s1')
  assert.equal(runtime.loadGlobalAgentHistoryStore().sessions.find(item => item.id === 'global-s1').name, '修复登录权限校验')
  runtime.syncGlobalAgentWebHistory({
    currentSessionId: 'global-s1',
    sessions: [{ id: 'global-s1', name: '用户手动全局标题', titleOrigin: 'manual', messages: globalSession.messages }],
  })
  const protectedGlobal = await runtime.scheduleGlobalSessionAutoTitle('global-s1')
  assert.equal(protectedGlobal.renamed, false)
  assert.equal(runtime.loadGlobalAgentHistoryStore().sessions.find(item => item.id === 'global-s1').name, '用户手动全局标题')

  const fallback = await generateSessionTitleWithModel({ scope: 'group', userMessage: '帮我修复登录页权限校验', assistantMessage: '失败回复' }, {
    modelCall: async () => { throw new Error('mock unavailable') },
  })
  assert.equal(fallback.source, 'fallback')
  assert.equal(isMeaningfulSessionTitleInput('111'), false)
  assert.equal(isMeaningfulSessionTitleInput('修复登录页'), true)
  assert.equal(modelCalls, 3)
  console.log(JSON.stringify({ pass: true, checks: 23, modelCalls, paidProviderCalls: 0 }))
  process.exit(0)
}

const globalMessaging = fs.readFileSync(new URL('../frontend/src/composables/useGlobalAgentMessaging.js', import.meta.url), 'utf8')
const globalSessions = fs.readFileSync(new URL('../frontend/src/composables/useGlobalAgentSessions.js', import.meta.url), 'utf8')
const projectSessions = fs.readFileSync(new URL('../backend/modules/projects/sessions.ts', import.meta.url), 'utf8')
assert.doesNotMatch(globalMessaging, /nameSource\.slice/)
assert.match(globalSessions, /titleOrigin: 'placeholder'/)
assert.match(globalSessions, /serverSession\.titleOrigin/)
assert.doesNotMatch(projectSessions, /claude -p/)

const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-session-auto-title-'))
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
  console.log(JSON.stringify({ pass: true, checks: result.checks + 4, scopes: ['global', 'group', 'project'], paidProviderCalls: 0 }, null, 2))
} finally {
  fs.rmSync(tempHome, { recursive: true, force: true })
}
