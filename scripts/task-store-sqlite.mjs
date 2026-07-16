import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const store = await import(pathToFileURL(path.join(scriptDir, '../ccm-package/dist/core/task-store.js')).href)
const [command = 'status', argument = '', confirmation = ''] = process.argv.slice(2)

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

if (command === 'status' || command === 'migrate') {
  print({ success: true, status: store.getSqliteTaskStoreStatus() })
} else if (command === 'verify') {
  const verification = store.verifySqliteTaskStore()
  print({ success: verification.valid, verification, status: store.getSqliteTaskStoreStatus() })
  if (!verification.valid) process.exitCode = 1
} else if (command === 'backup') {
  print({ success: true, backup: store.backupSqliteTaskStore(argument || undefined) })
} else if (command === 'export') {
  print({ success: true, export: store.exportSqliteTaskStore(argument || undefined) })
} else if (command === 'restore') {
  if (!argument) throw new Error('restore 需要 SQLite 备份文件路径')
  if (confirmation !== '--confirm') throw new Error('恢复会替换当前数据库，请在路径后添加 --confirm')
  print({ success: true, restore: store.restoreSqliteTaskStore(argument) })
} else {
  throw new Error(`未知命令：${command}。可用命令：status、verify、backup、export、restore`)
}

store.closeSqliteTaskStore()
