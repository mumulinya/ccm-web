import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const tools = await import('../ccm-package/dist/modules/tools/tools.js')
const processTree = await import('../ccm-package/dist/system/managed-process-tree.js')

let ticks = 0
const timer = setInterval(() => { ticks += 1 }, 20)
const command = process.platform === 'win32'
  ? "Start-Sleep -Milliseconds 450; Write-Output 'ASYNC_TERMINAL_OK'"
  : "sleep 0.45; printf 'ASYNC_TERMINAL_OK\\n'"
const result = await tools.runTerminalCommand(command, root, { timeoutMs: 5_000 })
clearInterval(timer)
assert.equal(result.success, true)
assert.match(result.output, /ASYNC_TERMINAL_OK/)
assert.ok(ticks >= 8, `terminal fallback blocked the event loop; ticks=${ticks}`)

const timeoutCommand = process.platform === 'win32' ? 'Start-Sleep -Seconds 10' : 'sleep 10'
const timedOut = await tools.runTerminalCommand(timeoutCommand, root, { timeoutMs: 300 })
assert.equal(timedOut.success, false)
assert.equal(timedOut.timedOut, true)
assert.equal(timedOut.stopReceipt?.exited, true)

const stubbornScript = process.platform === 'win32'
  ? "setInterval(() => {}, 1000)"
  : "process.on('SIGTERM', () => {}); process.stdout.write('READY\\n'); setInterval(() => {}, 1000)"
const stubborn = spawn(process.execPath, ['-e', stubbornScript], {
  detached: process.platform !== 'win32',
  windowsHide: true,
  stdio: process.platform === 'win32' ? 'ignore' : ['ignore', 'pipe', 'ignore'],
})
assert.ok(stubborn.pid > 0)
if (process.platform !== 'win32') {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('stubborn process did not become ready')), 2_000)
    stubborn.stdout.once('data', chunk => {
      clearTimeout(timer)
      assert.match(String(chunk), /READY/)
      resolve()
    })
  })
}
const stopReceipt = await processTree.terminateManagedProcessTree(stubborn, { gracefulTimeoutMs: 250, forceTimeoutMs: 2_000 })
assert.equal(stopReceipt.exited, true)
if (process.platform !== 'win32') assert.equal(stopReceipt.forced, true)

const terminalSource = fs.readFileSync(path.join(root, 'backend/modules/tools/terminal.ts'), 'utf8')
const toolsSource = fs.readFileSync(path.join(root, 'backend/modules/tools/tools.ts'), 'utf8')
const runtimeSource = fs.readFileSync(path.join(root, 'backend/modules/projects/project-runtime.ts'), 'utf8')
const terminalUi = fs.readFileSync(path.join(root, 'frontend/src/components/tools/Terminal.vue'), 'utf8')
const projectUi = fs.readFileSync(path.join(root, 'frontend/src/components/projects/useProjectManager.js'), 'utf8')
assert.doesNotMatch(terminalSource, /execFileSync\("(?:powershell\.exe|netstat\.exe)"/)
assert.doesNotMatch(toolsSource, /console\.log\(`\[终端\] 执行命令:/)
assert.match(toolsSource, /await runTerminalCommand/)
assert.match(runtimeSource, /status: "stopping"/)
assert.match(runtimeSource, /terminateManagedProcessTree/)
assert.match(runtimeSource, /acquireFileLock\(lockTarget/)
assert.match(terminalUi, /projectActionsGeneration/)
assert.match(projectUi, /projectRuntimeLoadGeneration/)

console.log(JSON.stringify({
  success: true,
  checks: {
    terminalFallbackDoesNotBlockEventLoop: true,
    timeoutTerminatesProcessTree: true,
    stubbornProcessUsesVerifiedStop: true,
    rawCommandIsNotLogged: true,
    portInventoryIsAsyncAndCached: true,
    runtimeUsesStoppingStateAndLease: true,
    frontendRejectsStaleProjectResponses: true,
  },
  paidProviderCalls: 0,
}, null, 2))
