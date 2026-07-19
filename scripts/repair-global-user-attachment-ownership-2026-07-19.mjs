import fs from 'node:fs'
import path from 'node:path'

const dataRoot = process.env.CC_CONNECT_HOME || path.join(process.env.USERPROFILE || '', '.cc-connect')
const historyFile = path.join(dataRoot, 'global-agent-history.json')
const repairs = [{
  sessionId: 'session_1784034011435',
  messageTimestamp: '2026-07-18T16:20:04.220Z',
  attachment: {
    name: 'image.png',
    size: 2824,
    type: 'image/png',
    upload_url: '/api/uploads/1784391604921-c5wmtl.png',
    attachment_owner: 'user',
  },
}, {
  sessionId: 'session_1782786191998',
  messageTimestamp: '2026-07-18T16:22:23.254Z',
  attachment: {
    name: 'image.png',
    size: 78381,
    type: 'image/png',
    upload_url: '/api/uploads/1784391743927-jaaogs.png',
    attachment_owner: 'user',
  },
}]

if (!fs.existsSync(historyFile)) throw new Error(`历史文件不存在：${historyFile}`)
const store = JSON.parse(fs.readFileSync(historyFile, 'utf8'))
const backupFile = `${historyFile}.attachment-ownership-2026-07-19.bak`
if (!fs.existsSync(backupFile)) fs.copyFileSync(historyFile, backupFile)
for (const repair of repairs) {
  const session = (store.sessions || []).find(item => String(item.id) === repair.sessionId)
  if (!session) throw new Error(`会话不存在：${repair.sessionId}`)
  const message = (session.messages || []).find(item => item.role === 'user' && item.timestamp === repair.messageTimestamp)
  if (!message) throw new Error(`用户消息不存在：${repair.messageTimestamp}`)
  message.files = [repair.attachment]
}
fs.writeFileSync(historyFile, JSON.stringify(store, null, 2), 'utf8')

console.log(JSON.stringify({
  repaired: true,
  repairs,
  backup: backupFile,
}, null, 2))
