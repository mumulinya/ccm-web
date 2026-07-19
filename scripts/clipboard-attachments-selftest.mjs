import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import {
  attachmentFileKey,
  countNewAttachmentFiles,
  extractClipboardAttachmentFiles,
  mergeUniqueAttachmentFiles,
} from '../frontend/src/utils/clipboardAttachments.js'

const root = process.cwd()
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

const screenshot = {
  name: 'image.png',
  size: 4096,
  type: 'image/png',
  lastModified: 100,
}
const documentFile = {
  name: 'requirements.md',
  size: 512,
  type: 'text/markdown',
  lastModified: 200,
}

const textOnly = extractClipboardAttachmentFiles({
  clipboardData: {
    items: [{ kind: 'string', type: 'text/plain' }],
    files: [],
  },
})
assert.deepEqual(textOnly, [], '普通文本粘贴不得被识别为附件')

const mixedClipboard = extractClipboardAttachmentFiles({
  clipboardData: {
    items: [
      { kind: 'file', type: 'image/png', getAsFile: () => screenshot },
      { kind: 'string', type: 'text/html' },
      { kind: 'string', type: 'text/plain' },
    ],
    files: [screenshot],
  },
})
assert.equal(mixedClipboard.length, 1, 'items/files 暴露同一图片时只能加入一次')
assert.equal(mixedClipboard[0], screenshot, '必须保留原始 File 对象和图片字节')

const merged = mergeUniqueAttachmentFiles([screenshot], [screenshot, documentFile])
assert.deepEqual(merged, [screenshot, documentFile], '重复粘贴不得产生重复附件')
assert.equal(countNewAttachmentFiles([screenshot], [screenshot]), 0)
assert.equal(countNewAttachmentFiles([screenshot], [documentFile]), 1)
assert.match(attachmentFileKey(screenshot), /image\.png:4096:image\/png/)

const composer = read('frontend/src/components/common/ChatComposer.vue')
const globalAgent = read('frontend/src/components/global/GlobalAgent.vue')
const globalAttachments = read('frontend/src/composables/useGlobalAgentAttachments.js')
const groupChat = read('frontend/src/components/collaboration/useGroupChat.js')
const projectChat = read('frontend/src/components/projects/useProjectManager.js')

assert.match(composer, /@paste="onPaste"/, '群聊和项目共用输入框必须监听 paste')
assert.match(composer, /if \(!files\.length\) return[\s\S]*event\.preventDefault\(\)/, '只有文件粘贴才能阻止浏览器默认文本粘贴')
assert.match(composer, /emit\('files-selected', additions\)/, '粘贴文件必须复用 files-selected 附件链路')
assert.match(globalAgent, /@paste="handleAttachmentPaste"/, '全局 Agent 输入框必须监听 paste')
assert.match(globalAttachments, /extractClipboardAttachmentFiles\(event\)[\s\S]*addFiles\(files\)/, '全局 Agent 必须复用统一提取器和现有附件对象')
assert.match(groupChat, /mergeUniqueAttachmentFiles\(messageFiles\.value, files\)/, '群聊附件必须去重')
assert.match(projectChat, /mergeUniqueAttachmentFiles\(chatFiles\.value, files\)/, '项目附件必须去重')

console.log(JSON.stringify({
  pass: true,
  checks: {
    plain_text_native_paste: true,
    mixed_image_html_single_attachment: true,
    duplicate_paste_deduplicated: true,
    original_file_preserved: true,
    group_chat_integrated: true,
    project_chat_integrated: true,
    global_agent_integrated: true,
  },
}, null, 2))
