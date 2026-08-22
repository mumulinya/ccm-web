import assert from 'node:assert/strict'
import fs from 'node:fs'
import { useGlobalAgentSessions } from '../frontend/src/composables/useGlobalAgentSessions.js'

const storage = new Map()
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key),
}

const historyWrites = []
globalThis.fetch = async (_url, options = {}) => {
  if (options.body) historyWrites.push(JSON.parse(options.body))
  return {
    ok: true,
    json: async () => ({ success: true, sessions: [] }),
  }
}

const globalSessions = useGlobalAgentSessions({
  defaultWelcome: { role: 'assistant', content: 'welcome' },
})
globalSessions.loadHistory()
assert.equal(globalSessions.isCurrentSessionDraft.value, true)
assert.equal(globalSessions.messages.value.length, 0)

globalSessions.createNewSession()
globalSessions.saveHistory()
assert.equal(JSON.parse(storage.get('cc_global_assistant_sessions_v2')).length, 0)
assert.equal(historyWrites.at(-1).sessions.length, 0)

globalSessions.materializeCurrentSession()
globalSessions.currentSession.value.messages.push({
  role: 'user',
  content: 'first message',
  timestamp: new Date().toISOString(),
})
globalSessions.saveHistory()
assert.equal(JSON.parse(storage.get('cc_global_assistant_sessions_v2')).length, 1)
assert.equal(historyWrites.at(-1).sessions.length, 1)

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const project = read('frontend/src/components/projects/useProjectManager.js')
const projectStream = project.slice(project.indexOf('const sendMessage = async'), project.indexOf('const formatFileSize =', project.indexOf('const sendMessage = async')))
assert.match(project, /currentSessionDraft\.value = true/)
assert.match(project, /resolvedSource === 'web'/)
assert.match(projectStream, /await materializeProjectSessionDraft\(\)/)

const group = read('frontend/src/components/collaboration/useGroupChat.js')
const groupCreate = group.slice(group.indexOf('const createGroupSession = async'), group.indexOf('const renameGroupSession = async'))
assert.match(groupCreate, /isGroupSessionDraft\.value = true/)
assert.doesNotMatch(groupCreate, /groupsApi\.createSession/)
const groupMaterialize = group.slice(group.indexOf('const materializeGroupSessionDraft = async'), group.indexOf('const refreshWritableGroupSession = async'))
assert.doesNotMatch(groupMaterialize, /if \(!isGroupSessionDraft\.value/, '缺少精确会话 ID 时发送动作必须能够创建规范会话')
assert.match(groupMaterialize, /isGroupSessionDraft\.value = true[\s\S]*groupsApi\.createSession\(groupId\)/)
const groupLoad = group.slice(group.indexOf('const loadMessages = async'), group.indexOf('const openTraceReplay ='))
assert.match(groupLoad, /const data = await groupsApi\.messages[\s\S]*if \(isGroupSessionDraft\.value\) return false/, '迟到的群聊读取不能把草稿会话覆盖回旧绑定')
const groupRefresh = group.slice(group.indexOf('const refreshWritableGroupSession = async'), group.indexOf('const createGroupSession = async'))
assert.match(groupRefresh, /activeCandidate\.startsWith\('gcs_'\)/, '普通消息重绑定不能把 legacy default 当作可写会话')
assert.match(groupRefresh, /groupsApi\.createSession\(groupId\)/, '没有规范群聊会话时必须创建新的 gcs 会话')

const groupStream = read('frontend/src/components/collaboration/useGroupChatStream.js')
assert.match(groupStream, /await ensureGroupSession\?\.\(\)/)
assert.match(groupStream, /if \(!currentGroupSessionId\.value\)/)
assert.match(groupStream, /if \(!res\.ok\)/, '群聊 SSE 非成功响应必须先作为 JSON 错误处理')
assert.match(groupStream, /GROUP_SESSION_UNAVAILABLE/, '群聊会话冲突必须保留稳定错误码')
assert.match(groupStream, /messages\.value\.splice\(assistantIdx, 1\)/, '群聊 SSE 提交失败必须撤回空白助手占位')

console.log(JSON.stringify({
  pass: true,
  checks: 17,
  scopes: ['global', 'project', 'group'],
  paidProviderCalls: 0,
}, null, 2))
