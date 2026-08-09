import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  getCopyableMessageText,
  getEditableUserMessageText,
  hasMessageAttachments,
} from '../frontend/src/utils/messageActions.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')

assert.equal(getEditableUserMessageText({ role: 'user', content: '重新执行这个任务' }), '重新执行这个任务')
assert.equal(
  getEditableUserMessageText({ role: 'user', content: '分析这个文件\n\n  [附件]\n  - report.md（2 KB）' }),
  '分析这个文件',
  '重新发送不能把历史附件说明伪装成当前附件',
)
assert.equal(getEditableUserMessageText({ role: 'assistant', content: '不能编辑' }), '')
assert.equal(hasMessageAttachments({ role: 'user', content: '请求\n[附件]\n- a.txt' }), true)
assert.equal(getCopyableMessageText({ role: 'assistant', content: '回答' }, '安全可见回答'), '安全可见回答')
assert.equal(getCopyableMessageText({ role: 'assistant', type: 'task', content: '内部内容' }, '摘要'), '')
assert.equal(getCopyableMessageText({ role: 'assistant', streaming: true, content: '半截输出' }, '半截输出'), '')

const shell = read('frontend/src/components/common/ConversationMessageShell.vue')
assert.ok(shell.includes("defineEmits(['edit'])"), '公共消息壳必须暴露编辑事件')
assert.ok(shell.includes('title="编辑并重新发送"'), '编辑按钮必须有明确用途')
assert.ok(shell.includes('navigator.clipboard?.writeText'), '消息复制必须使用真实剪贴板能力')
assert.ok(shell.includes('.conversation-message:hover .conversation-message__actions'), '桌面端操作必须在消息悬停时显示')
assert.ok(shell.includes('@media (hover: none)'), '触屏设备必须始终可访问消息操作')

for (const [file, handler] of [
  ['frontend/src/components/global/GlobalAgent.vue', 'editGlobalUserMessage'],
  ['frontend/src/components/projects/ProjectManager.template.html', 'editProjectUserMessage'],
  ['frontend/src/components/collaboration/GroupChat.template.html', 'editGroupUserMessage'],
]) {
  const source = read(file)
  assert.ok(source.includes(handler), `${file} 未接入历史消息编辑`)
}

for (const file of [
  'frontend/src/components/global/GlobalAgentMessageList.vue',
  'frontend/src/components/projects/ProjectManager.template.html',
  'frontend/src/components/collaboration/GroupChat.template.html',
]) {
  const source = read(file)
  assert.ok(source.includes(':copy-text='), `${file} 未接入消息复制`)
  assert.ok(source.includes(':editable='), `${file} 未声明可编辑用户消息`)
  assert.ok(source.includes(':edit-disabled='), `${file} 未在执行中保护历史消息编辑`)
}

console.log(JSON.stringify({
  success: true,
  scopes: ['global', 'project', 'group'],
  actions: ['copy', 'edit_and_resend'],
  attachmentReplay: 'explicit_reselect_required',
}, null, 2))
