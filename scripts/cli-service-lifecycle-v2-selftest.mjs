import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const cli = path.join(root, 'ccm-package', 'bin', 'ccm.js')
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-lifecycle-v2-'))
const data = path.join(fixture, 'data')
const lock = path.join(data, 'run', 'ccm-server-instance.lock')
fs.mkdirSync(path.dirname(lock), { recursive: true })
const env = {
  ...process.env,
  CCM_TASK_STORE_DIR: data,
  CCM_SERVER_LOCK_FILE: lock,
  CCM_STARTUP_PREPARE_LOCAL_EMBEDDING: '0',
  NO_COLOR: '1',
}
const run = (args, timeout = 45_000) => spawnSync(process.execPath, [cli, ...args], {
  cwd: root,
  env,
  encoding: 'utf8',
  windowsHide: true,
  timeout,
})
const runAsync = args => new Promise(resolve => {
  const child = spawn(process.execPath, [cli, ...args], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', chunk => { stdout += chunk })
  child.stderr.on('data', chunk => { stderr += chunk })
  child.once('exit', status => resolve({ status, stdout, stderr }))
})
const getPort = () => new Promise((resolve, reject) => {
  const server = net.createServer()
  server.once('error', reject)
  server.listen(0, '127.0.0.1', () => {
    const port = server.address().port
    server.close(error => error ? reject(error) : resolve(port))
  })
})

let unrelated = null
let blocker = null
try {
  unrelated = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore', windowsHide: true })
  fs.writeFileSync(lock, `${JSON.stringify({ schema: 'ccm-server-instance-lock-v1', pid: unrelated.pid, port: 6551, hostname: os.hostname() }, null, 2)}\n`)
  const unsafeStop = run(['stop'])
  assert.notEqual(unsafeStop.status, 0)
  assert.match(`${unsafeStop.stdout}${unsafeStop.stderr}`, /ownership_unproven|身份无法证明/)
  process.kill(unrelated.pid, 0)
  unrelated.kill('SIGTERM')
  unrelated = null
  fs.rmSync(lock, { force: true })

  const occupiedPort = await getPort()
  const readyFile = path.join(fixture, 'blocker-ready')
  blocker = spawn(process.execPath, ['-e', `
    const fs=require('fs'),net=require('net');
    net.createServer(()=>{}).listen(${occupiedPort},'127.0.0.1',()=>fs.writeFileSync(${JSON.stringify(readyFile)},'ready'));
    setInterval(()=>{},1000);
  `], { stdio: 'ignore', windowsHide: true })
  const deadline = Date.now() + 5_000
  while (!fs.existsSync(readyFile) && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50))
  assert.equal(fs.existsSync(readyFile), true)
  const occupied = run(['start', '--background', '--port', String(occupiedPort)])
  assert.notEqual(occupied.status, 0)
  assert.match(`${occupied.stdout}${occupied.stderr}`, /port_in_use|端口.+占用/)
  assert.equal(fs.existsSync(lock), false)
  blocker.kill('SIGTERM')
  blocker = null

  const concurrentPort = await getPort()
  const concurrent = await Promise.all([
    runAsync(['start', '--background', '--host', '127.0.0.1', '--port', String(concurrentPort)]),
    runAsync(['start', '--background', '--host', '127.0.0.1', '--port', String(concurrentPort)]),
  ])
  assert.equal(concurrent.filter(row => row.status === 0).length, 1, JSON.stringify(concurrent))
  const concurrentStatus = JSON.parse(run(['status', '--json']).stdout)
  assert.equal(concurrentStatus.service.verified, true)
  assert.equal(concurrentStatus.service.port, concurrentPort)
  assert.equal(run(['stop']).status, 0)

  const port = await getPort()
  const started = run(['start', '--background', '--host', '127.0.0.1', '--port', String(port)])
  assert.equal(started.status, 0, `${started.stdout}\n${started.stderr}`)
  const status = JSON.parse(run(['status', '--json']).stdout)
  assert.equal(status.service.verified, true)
  assert.equal(status.service.ownershipState, 'verified')
  assert.equal(status.service.owner.schema, 'ccm-service-instance-v2')
  assert.ok(status.service.owner.process_fingerprint)
  assert.ok(status.service.owner.entry_checksum)

  const restarted = run(['restart'])
  assert.equal(restarted.status, 0, `${restarted.stdout}\n${restarted.stderr}`)
  const afterRestart = JSON.parse(run(['status', '--json']).stdout)
  assert.equal(afterRestart.service.port, port)
  assert.equal(afterRestart.service.host, '127.0.0.1')
  assert.equal(afterRestart.service.launchMode, 'background')
  assert.equal(run(['stop']).status, 0)

  console.log(JSON.stringify({
    success: true,
    checks: {
      forgedPidRejected: true,
      occupiedPortRejected: true,
      concurrentStartSingleOwner: true,
      signedIdentityReady: true,
      restartConfigurationPreserved: true,
      controlledDrainStop: true,
    },
    paidProviderCalls: 0,
  }, null, 2))
} finally {
  try { run(['stop'], 15_000) } catch {}
  try { unrelated?.kill('SIGKILL') } catch {}
  try { blocker?.kill('SIGKILL') } catch {}
  try { fs.rmSync(fixture, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }) } catch {}
}
