import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const group = read('frontend/src/components/collaboration/useGroupChat.js')
const stream = read('frontend/src/components/collaboration/useGroupChatStream.js')
const messaging = read('frontend/src/components/collaboration/useGroupChatMessaging.js')
const panel = read('frontend/src/components/collaboration/GroupChatPanel.vue')

const groupCreate = group.slice(group.indexOf('const createGroupSession = async'), group.indexOf('const renameGroupSession = async'))
const groupSelect = group.slice(group.indexOf('const selectGroupSession = async'), group.indexOf('let groupDraftCreation'))
const groupLoad = group.slice(group.indexOf('const loadMessages = async'), group.indexOf('const openTraceReplay'))
const pull = messaging.slice(messaging.indexOf('const pullNewMessages = async'), messaging.indexOf('const startGroupPolling'))

assert.doesNotMatch(groupCreate, /stopGroupCurrentWork/, '新建会话不能停止另一个会话里正在跑的回复')
assert.match(groupSelect, /restoreLiveGroupStreamIfCurrent\(\)/, '切回正在回复的会话必须立刻接回直播消息')
assert.match(groupLoad, /requestedSessionId/, '拉消息不能用接口返回的 sessionId 把当前选中会话改掉')
assert.match(groupLoad, /restoreLiveGroupStreamIfCurrent\(\)/, '载入历史后必须把进行中的直播回复叠回去')
assert.match(stream, /const sessionAtSend/, '群聊发送必须钉死发起时的会话')
assert.match(stream, /beginLiveGroupStream\(groupAtSend, sessionAtSend/, '直播回复必须绑定发起会话')
assert.match(stream, /isStreaming = computed\(\(\) => groupStreamActive\.value && isViewingGroupStreamSession\(\)\)/, '正在提交只属于正在回复的那个会话')
assert.match(stream, /keepTranscript: !viewingSendSession/, '切走后后台流结束也要保留直播稿，方便再点回来看')
assert.match(pull, /currentGroupSessionId\.value \|\| ''\) !== sessionId/, '轮询回来时如果已经切走，不能把旧会话消息写进当前页')
assert.match(messaging, /current\.streaming === true \|\| current\.__groupTransient === true\) return false/, '轮询不能把正在流式输出的助手消息换成另一份对象')
assert.match(panel, /groupTurnBusy/, '群聊输入条必须使用当前会话的忙碌状态')

console.log(JSON.stringify({
  pass: true,
  checks: 11,
  paidProviderCalls: 0,
}, null, 2))
