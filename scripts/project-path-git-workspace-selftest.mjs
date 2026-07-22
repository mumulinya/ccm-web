import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-path-git-workspace-'))
const ccmDir = path.join(tempHome, '.cc-connect')
const workspaceParent = path.join(tempHome, 'workspaces')
const remoteDir = path.join(tempHome, 'remote.git')
const seedDir = path.join(tempHome, 'seed')
const workDir = path.join(workspaceParent, 'office-project')
const project = 'office-project'
const port = 31993
const baseUrl = `http://127.0.0.1:${port}`
let child

const git = (cwd, args) => {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } })
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`)
  return String(result.stdout || '').trim()
}

const request = async (pathname, options = {}) => {
  const response = await fetch(`${baseUrl}${pathname}`, options)
  return { response, data: await response.json().catch(() => ({})) }
}
const post = (pathname, body) => request(pathname, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

const waitForServer = async () => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await request('/api/projects')).response.ok) return } catch {}
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  throw new Error('isolated server did not start')
}

try {
  fs.mkdirSync(path.join(ccmDir, 'configs'), { recursive: true })
  fs.mkdirSync(workspaceParent, { recursive: true })
  fs.mkdirSync(seedDir, { recursive: true })
  git(tempHome, ['init', '--bare', remoteDir])
  git(seedDir, ['init', '-b', 'main'])
  git(seedDir, ['config', 'user.email', 'selftest@ccm.local'])
  git(seedDir, ['config', 'user.name', 'CCM Selftest'])
  fs.writeFileSync(path.join(seedDir, 'README.md'), '# office project\n')
  git(seedDir, ['add', 'README.md'])
  git(seedDir, ['commit', '-m', 'initial'])
  git(seedDir, ['remote', 'add', 'origin', remoteDir])
  git(seedDir, ['push', '-u', 'origin', 'main'])
  git(workspaceParent, ['clone', '--branch', 'main', remoteDir, workDir])
  git(workDir, ['config', 'user.email', 'selftest@ccm.local'])
  git(workDir, ['config', 'user.name', 'CCM Selftest'])
  fs.writeFileSync(path.join(ccmDir, 'configs', `config-${project}.toml`), `language = "zh"\n[[projects]]\nname = "${project}"\nwork_dir = "${workDir.replace(/\\/g, '\\\\')}"\n[projects.agent]\ntype = "codex"\n[[projects.platforms]]\ntype = "feishu"\n`)

  child = spawn(process.execPath, [path.join(root, 'ccm-package', 'dist', 'server.js'), String(port)], {
    cwd: root,
    env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  await waitForServer()

  const createdFolder = await post('/api/filesystem/directory', { parent: workspaceParent, name: 'new-client-project' })
  assert.equal(createdFolder.response.ok, true)
  assert.equal(createdFolder.data.success, true)
  assert.equal(fs.statSync(createdFolder.data.path).isDirectory(), true)
  const duplicateFolder = await post('/api/filesystem/directory', { parent: workspaceParent, name: 'new-client-project' })
  assert.equal(duplicateFolder.response.status, 409)
  const traversalFolder = await post('/api/filesystem/directory', { parent: workspaceParent, name: '../escape' })
  assert.equal(traversalFolder.response.status, 400)
  const reservedFolder = await post('/api/filesystem/directory', { parent: workspaceParent, name: 'CON' })
  assert.equal(reservedFolder.response.status, 400)
  const missingParentFolder = await post('/api/filesystem/directory', { name: 'accidental-root-folder' })
  assert.equal(missingParentFolder.response.status, 400)

  let status = await request(`/api/git/status?project=${encodeURIComponent(project)}`)
  assert.equal(status.data.success, true)
  assert.equal(status.data.repository.branch, 'main')
  assert.equal(status.data.repository.canFetch, true)
  assert.equal(status.data.repository.canPull, true)
  assert.equal(status.data.repository.canPush, true)

  const invalidOperation = await post('/api/git/remote-operation', { project, operation: 'force-push', confirmed: true })
  assert.equal(invalidOperation.response.status, 400)
  const unconfirmedPush = await post('/api/git/remote-operation', { project, operation: 'push' })
  assert.equal(unconfirmedPush.response.status, 409)
  assert.equal(unconfirmedPush.data.confirmationRequired, true)
  const fetched = await post('/api/git/remote-operation', { project, operation: 'fetch', confirmed: true })
  assert.equal(fetched.data.success, true)

  fs.writeFileSync(path.join(seedDir, 'remote.txt'), 'from remote\n')
  git(seedDir, ['add', 'remote.txt'])
  git(seedDir, ['commit', '-m', 'remote change'])
  git(seedDir, ['push'])
  await post('/api/git/remote-operation', { project, operation: 'fetch', confirmed: true })
  status = await request(`/api/git/status?project=${encodeURIComponent(project)}`)
  assert.equal(status.data.repository.behind, 1)
  const pulled = await post('/api/git/remote-operation', { project, operation: 'pull', confirmed: true })
  assert.equal(pulled.data.success, true)
  assert.equal(fs.readFileSync(path.join(workDir, 'remote.txt'), 'utf8').replace(/\r\n/g, '\n'), 'from remote\n')

  fs.writeFileSync(path.join(workDir, 'local.txt'), 'from local\n')
  git(workDir, ['add', 'local.txt'])
  git(workDir, ['commit', '-m', 'local change'])
  status = await request(`/api/git/status?project=${encodeURIComponent(project)}`)
  assert.equal(status.data.repository.ahead, 1)
  const pushed = await post('/api/git/remote-operation', { project, operation: 'push', confirmed: true })
  assert.equal(pushed.data.success, true)
  assert.equal(git(workDir, ['rev-parse', 'HEAD']), git(tempHome, ['--git-dir', remoteDir, 'rev-parse', 'refs/heads/main']))

  fs.appendFileSync(path.join(workDir, 'README.md'), 'dirty\n')
  const blockedPull = await post('/api/git/remote-operation', { project, operation: 'pull', confirmed: true })
  assert.equal(blockedPull.response.status, 409)
  assert.match(blockedPull.data.error, /未提交文件/)

  console.log(JSON.stringify({
    pass: true,
    checks: {
      createsFolderInsideCurrentDirectory: true,
      rejectsDuplicateTraversalAndReservedNames: true,
      reportsRealRemoteBranchState: true,
      rejectsUnknownAndUnconfirmedOperations: true,
      fetchesRemoteReferences: true,
      pullsFastForwardUpdate: true,
      pushesLocalCommit: true,
      blocksPullWithDirtyWorktree: true,
    },
  }, null, 2))
} finally {
  if (child && !child.killed) child.kill('SIGTERM')
  await new Promise(resolve => setTimeout(resolve, 250))
  fs.rmSync(tempHome, { recursive: true, force: true })
}
