import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const workspace = path.resolve(scriptDir, '..')
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-sqlite-'))
process.env.CCM_TASK_STORE_DIR = tempRoot

const legacyTasks = [
  { id: 'task-a', title: '迁移任务 A', status: 'pending', group_id: 'group-a', target_project: 'web', workflow_type: 'daily_dev', created_at: '2026-07-15T00:00:00.000Z', updated_at: '2026-07-15T00:00:00.000Z' },
  { id: 'task-b', title: '迁移任务 B', status: 'done', group_id: 'group-a', target_project: 'api', workflow_type: 'daily_dev', created_at: '2026-07-15T00:01:00.000Z', updated_at: '2026-07-15T00:02:00.000Z' },
]
const legacyTaskLogs = {
  'task-a': [
    { timestamp: '2026-07-15T00:00:01.000Z', level: 'info', message: '任务进入队列' },
    { timestamp: '2026-07-15T00:00:02.000Z', level: 'info', message: '任务开始执行' },
  ],
  'task-b': [{ timestamp: '2026-07-15T00:02:00.000Z', level: 'success', message: '任务完成' }],
}
const legacyGroupLogs = {
  'group-a': [
    { timestamp: '2026-07-15T00:00:00.000Z', level: 'info', category: 'task', message: '收到任务', details: { task_id: 'task-a' } },
    { timestamp: '2026-07-15T00:02:00.000Z', level: 'success', category: 'task', message: '任务完成', details: { task_id: 'task-b' } },
  ],
}

fs.writeFileSync(path.join(tempRoot, 'tasks.json'), JSON.stringify(legacyTasks, null, 2))
fs.writeFileSync(path.join(tempRoot, 'task-logs.json'), JSON.stringify(legacyTaskLogs, null, 2))
fs.writeFileSync(path.join(tempRoot, 'group-logs.json'), JSON.stringify(legacyGroupLogs, null, 2))

const taskStore = await import(pathToFileURL(path.join(workspace, 'ccm-package/dist/core/task-store.js')).href)
const db = await import(pathToFileURL(path.join(workspace, 'ccm-package/dist/core/db.js')).href)
const logs = await import(pathToFileURL(path.join(workspace, 'ccm-package/dist/modules/collaboration/logs.js')).href)
const serverLock = await import(pathToFileURL(path.join(workspace, 'ccm-package/dist/core/server-instance-lock.js')).href)

function runWriter(writerId, count) {
  const modulePath = path.join(workspace, 'ccm-package/dist/core/task-store.js')
  const source = `const store=require(${JSON.stringify(modulePath)}); for(let i=0;i<${count};i++) store.appendTaskLogRecord('task-a',{timestamp:new Date().toISOString(),level:'info',message:'writer-${writerId}-'+i},100); store.closeSqliteTaskStore();`
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['-e', source], {
      cwd: workspace,
      env: { ...process.env, CCM_TASK_STORE_DIR: tempRoot },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    })
    let stderr = ''
    child.stderr.on('data', chunk => { stderr += String(chunk) })
    child.on('error', reject)
    child.on('exit', code => code === 0 ? resolve(null) : reject(new Error(`writer ${writerId} failed (${code}): ${stderr}`)))
  })
}

try {
  const migrated = db.loadTasks()
  assert.deepEqual(migrated, legacyTasks)
  assert.equal(logs.getTaskLogs('task-a', 10).length, 2)
  assert.equal(logs.loadGroupLogs()['group-a'].length, 2)

  const firstStatus = taskStore.getSqliteTaskStoreStatus()
  assert.equal(firstStatus.journal_mode.toLowerCase(), 'wal')
  assert.equal(firstStatus.counts.tasks, 2)
  assert.equal(firstStatus.counts.task_logs, 3)
  assert.equal(firstStatus.counts.group_logs, 2)
  assert.equal(firstStatus.integrity.valid, true)
  assert.equal(fs.existsSync(path.join(tempRoot, 'tasks.json')), false)
  assert.ok(fs.readdirSync(path.join(tempRoot, 'legacy-json-backups')).length >= 3)

  const firstLock = serverLock.acquireCcmServerInstanceLock(39001)
  assert.throws(() => serverLock.acquireCcmServerInstanceLock(39002), /已有 CCM 服务运行/)
  assert.equal(serverLock.releaseCcmServerInstanceLock(firstLock), true)
  const secondLock = serverLock.acquireCcmServerInstanceLock(39002)
  assert.equal(serverLock.releaseCcmServerInstanceLock(secondLock), true)

  const updatedTasks = migrated.map(task => task.id === 'task-a' ? { ...task, status: 'in_progress', updated_at: '2026-07-15T00:03:00.000Z' } : task)
  updatedTasks.push({ id: 'task-c', title: '新增任务 C', status: 'pending', group_id: 'group-b', target_project: 'test', workflow_type: 'verification' })
  const saveResult = db.saveTasks(updatedTasks)
  assert.deepEqual(saveResult, { total: 3, inserted: 1, updated: 1, deleted: 0 })
  assert.equal(db.loadTasks().find(task => task.id === 'task-a').status, 'in_progress')

  await Promise.all([runWriter(1, 30), runWriter(2, 30), runWriter(3, 30), runWriter(4, 30)])
  assert.equal(logs.getTaskLogs('task-a', 200).length, 100)

  logs.addGroupLog('group-a', 'info', 'sqlite-test', 'SQLite WAL 并发验证完成', { writers: 4 })
  assert.equal(logs.loadGroupLogs()['group-a'].at(-1).category, 'sqlite-test')

  const backup = taskStore.backupSqliteTaskStore(path.join(tempRoot, 'backups', 'before-change.db'))
  assert.ok(backup.bytes > 0)
  const beforeRestore = db.loadTasks()
  db.saveTasks(beforeRestore.map(task => task.id === 'task-a' ? { ...task, status: 'failed' } : task))
  assert.equal(db.loadTasks().find(task => task.id === 'task-a').status, 'failed')
  const restore = taskStore.restoreSqliteTaskStore(backup.destination)
  assert.equal(restore.status.integrity.valid, true)
  assert.equal(db.loadTasks().find(task => task.id === 'task-a').status, 'in_progress')

  const exported = taskStore.exportSqliteTaskStore(path.join(tempRoot, 'export'))
  assert.equal(JSON.parse(fs.readFileSync(exported.files.tasks, 'utf8')).length, 3)
  assert.equal(Object.keys(JSON.parse(fs.readFileSync(exported.files.task_logs, 'utf8'))).length >= 2, true)
  assert.equal(taskStore.verifySqliteTaskStore().valid, true)

  const finalStatus = taskStore.getSqliteTaskStoreStatus()
  const report = {
    success: true,
    journal_mode: finalStatus.journal_mode,
    migrated: firstStatus.migrations,
    counts: finalStatus.counts,
    concurrent_writers: 4,
    data_directory_singleton_lock: true,
    retained_task_logs: logs.getTaskLogs('task-a', 200).length,
    backup_bytes: backup.bytes,
    restore_verified: true,
    export_verified: true,
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
} finally {
  taskStore.closeSqliteTaskStore()
  fs.rmSync(tempRoot, { recursive: true, force: true })
}
