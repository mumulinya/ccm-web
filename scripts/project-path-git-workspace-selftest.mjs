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
let authSession = null

const git = (cwd, args) => {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } })
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`)
  return String(result.stdout || '').trim()
}

const request = async (pathname, options = {}) => {
  const headers = { 'User-Agent': 'CCM-Git-Workspace-Selftest/1', 'Accept-Language': 'zh-CN', Origin: baseUrl, Referer: `${baseUrl}/`, ...(options.headers || {}) }
  if (authSession?.cookie) headers.Cookie = authSession.cookie
  if (authSession?.csrf && !['GET', 'HEAD', 'OPTIONS'].includes(String(options.method || 'GET').toUpperCase())) headers['X-CCM-CSRF'] = authSession.csrf
  const response = await fetch(`${baseUrl}${pathname}`, { ...options, headers })
  return { response, data: await response.json().catch(() => ({})) }
}
const post = (pathname, body) => request(pathname, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

const waitForServer = async () => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await request('/api/auth/session')).response.ok) return } catch {}
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
  fs.writeFileSync(path.join(seedDir, 'rename-source.txt'), 'rename fixture\n')
  git(seedDir, ['add', 'README.md', 'rename-source.txt'])
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
  const setupCode = fs.readFileSync(path.join(ccmDir, 'auth', 'setup-code.txt'), 'utf8').trim()
  const registration = await request('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'git-admin', password: 'Git-Admin-123!', setup_code: setupCode }) })
  assert.equal(registration.response.status, 201)
  authSession = { cookie: (registration.response.headers.get('set-cookie') || '').split(';')[0], csrf: registration.data.csrf || registration.data.session?.csrf }

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
  assert.equal(status.data.repository.canPush, false)
  assert.equal(status.data.repository.pushState, 'up_to_date')

  const noOpPush = await post('/api/git/remote-operation', { project, operation: 'push', confirmed: true })
  assert.equal(noOpPush.data.success, true)
  assert.equal(noOpPush.data.noop, true)
  assert.equal(noOpPush.data.outcome, 'up_to_date')

  fs.mkdirSync(path.join(workDir, 'docs'), { recursive: true })
  git(workDir, ['mv', 'rename-source.txt', 'docs/中文 文件.txt'])
  fs.appendFileSync(path.join(workDir, 'README.md'), 'staged version\n')
  git(workDir, ['add', 'README.md'])
  fs.appendFileSync(path.join(workDir, 'README.md'), 'working version\n')
  fs.writeFileSync(path.join(workDir, 'staged-then-deleted.txt'), 'temporary\n')
  git(workDir, ['add', 'staged-then-deleted.txt'])
  fs.rmSync(path.join(workDir, 'staged-then-deleted.txt'))
  const detailedStatus = await request(`/api/git/status?project=${encodeURIComponent(project)}`)
  const renamed = detailedStatus.data.files.find(file => file.path === 'docs/中文 文件.txt')
  const doubleModified = detailedStatus.data.files.find(file => file.path === 'README.md')
  const stagedThenDeleted = detailedStatus.data.files.find(file => file.path === 'staged-then-deleted.txt')
  assert.equal(renamed.originalPath, 'rename-source.txt')
  assert.equal(renamed.statusText, '已暂存重命名')
  assert.equal(doubleModified.statusCode, 'MM')
  assert.equal(doubleModified.statusText, '已暂存修改，工作区又修改')
  assert.equal(stagedThenDeleted.statusCode, 'AD')
  assert.equal(stagedThenDeleted.statusText, '已暂存新增，工作区又删除')
  assert.equal(stagedThenDeleted.indexResidual, true)
  assert.equal(detailedStatus.data.summary.indexResidual, 1)
  assert.equal(detailedStatus.data.summary.total, 2)
  assert.equal(detailedStatus.data.total, 2)
  assert.equal(detailedStatus.data.rawTotal, 3)
  assert.equal(detailedStatus.data.repository.changedFiles, 2)
  assert.equal(detailedStatus.data.repository.indexResidualFiles, 1)
  const unconfirmedResidualCleanup = await post('/api/git/index-residuals/cleanup', { project, files: ['staged-then-deleted.txt'] })
  assert.equal(unconfirmedResidualCleanup.response.status, 409)
  const cleanedResidual = await post('/api/git/index-residuals/cleanup', { project, files: ['staged-then-deleted.txt'], confirmed: true })
  assert.equal(cleanedResidual.data.success, true)
  assert.deepEqual(cleanedResidual.data.cleanedFiles, ['staged-then-deleted.txt'])
  assert.equal(fs.existsSync(path.join(workDir, 'staged-then-deleted.txt')), false)
  const statusAfterResidualCleanup = await request(`/api/git/status?project=${encodeURIComponent(project)}`)
  assert.equal(statusAfterResidualCleanup.data.summary.indexResidual, 0)
  assert.equal(statusAfterResidualCleanup.data.files.some(file => file.path === 'staged-then-deleted.txt'), false)
  fs.writeFileSync(path.join(workDir, 'staged-then-deleted.txt'), 'temporary\n')
  git(workDir, ['add', 'staged-then-deleted.txt'])
  fs.rmSync(path.join(workDir, 'staged-then-deleted.txt'))
  const noNetCommit = await post('/api/git/commit', { project, message: 'must become a no-op', files: ['staged-then-deleted.txt'], action: 'commit', verification: 'passed', reviewed: true })
  assert.equal(noNetCommit.data.success, true)
  assert.equal(noNetCommit.data.outcome, 'no_changes')
  assert.equal(noNetCommit.data.commit.noop, true)
  git(workDir, ['add', '-A'])
  git(workDir, ['commit', '-m', 'status parsing fixtures'])
  git(workDir, ['push'])
  git(seedDir, ['pull', '--ff-only'])

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

  const emptyCommit = await post('/api/git/commit', { project, message: 'must not commit everything', files: [] })
  assert.equal(emptyCommit.response.status, 400)
  assert.match(emptyCommit.data.error, /明确选择/)

  fs.writeFileSync(path.join(workDir, 'local.txt'), 'from local\n')
  const committed = await post('/api/git/commit', { project, message: 'local commit', files: ['local.txt'], action: 'commit', verification: 'passed', reviewed: true })
  assert.equal(committed.data.success, true)
  assert.equal(committed.data.outcome, 'committed')
  assert.notEqual(git(workDir, ['rev-parse', 'HEAD']), git(tempHome, ['--git-dir', remoteDir, 'rev-parse', 'refs/heads/main']))
  status = await request(`/api/git/status?project=${encodeURIComponent(project)}`)
  assert.equal(status.data.repository.ahead, 1)
  const pushed = await post('/api/git/remote-operation', { project, operation: 'push', confirmed: true })
  assert.equal(pushed.data.success, true)
  assert.equal(git(workDir, ['rev-parse', 'HEAD']), git(tempHome, ['--git-dir', remoteDir, 'rev-parse', 'refs/heads/main']))

  fs.writeFileSync(path.join(workDir, 'combined.txt'), 'commit and push\n')
  const combined = await post('/api/git/commit', { project, message: 'combined change', files: ['combined.txt'], action: 'commit_and_push', verification: 'passed', reviewed: true })
  assert.equal(combined.data.success, true)
  assert.equal(combined.data.outcome, 'committed_and_pushed')
  assert.equal(combined.data.commit.success, true)
  assert.equal(combined.data.push.success, true)
  assert.equal(git(workDir, ['rev-parse', 'HEAD']), git(tempHome, ['--git-dir', remoteDir, 'rev-parse', 'refs/heads/main']))

  fs.appendFileSync(path.join(workDir, 'README.md'), 'dirty\n')
  const blockedPull = await post('/api/git/remote-operation', { project, operation: 'pull', confirmed: true })
  assert.equal(blockedPull.response.status, 409)
  assert.match(blockedPull.data.error, /未提交文件/)

  git(seedDir, ['pull', '--ff-only'])
  fs.writeFileSync(path.join(seedDir, 'remote-after-local.txt'), 'remote moved\n')
  git(seedDir, ['add', 'remote-after-local.txt'])
  git(seedDir, ['commit', '-m', 'remote moved again'])
  git(seedDir, ['push'])
  fs.writeFileSync(path.join(workDir, 'partial.txt'), 'local commit survives failed push\n')
  const partial = await post('/api/git/commit', { project, message: 'partial push case', files: ['partial.txt'], action: 'commit_and_push', verification: 'passed', reviewed: true })
  assert.equal(partial.data.success, true)
  assert.equal(partial.data.partialSuccess, true)
  assert.equal(partial.data.outcome, 'committed_push_failed')
  assert.equal(partial.data.commit.success, true)
  assert.equal(partial.data.push.success, false)
  assert.equal(partial.data.push.errorCode, 'remote_ahead')
  assert.ok(git(workDir, ['log', '-1', '--pretty=%s']).includes('partial push case'))

  console.log(JSON.stringify({
    pass: true,
    checks: {
      createsFolderInsideCurrentDirectory: true,
      rejectsDuplicateTraversalAndReservedNames: true,
      reportsRealRemoteBranchState: true,
      reportsDetailedDualStateAndRenameFiles: true,
      separatesAndCleansIndexResiduals: true,
      resolvesSelectedFilesWithoutNetChanges: true,
      skipsNoopPushes: true,
      rejectsUnknownAndUnconfirmedOperations: true,
      fetchesRemoteReferences: true,
      pullsFastForwardUpdate: true,
      rejectsImplicitCommitAll: true,
      commitsSelectedFilesLocally: true,
      pushesExistingLocalCommit: true,
      commitsAndPushesInOneFlow: true,
      blocksPullWithDirtyWorktree: true,
      preservesCommitWhenCombinedPushFails: true,
    },
  }, null, 2))
} finally {
  if (child && !child.killed) child.kill('SIGTERM')
  await new Promise(resolve => setTimeout(resolve, 250))
  fs.rmSync(tempHome, { recursive: true, force: true })
}
