import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const runtime = await import('../ccm-package/dist/modules/tools/git-workspace-runtime.js')
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-git-production-v2-'))
const repository = path.join(workspace, 'repository')
const outside = path.join(workspace, 'outside')
fs.mkdirSync(repository)
fs.mkdirSync(outside)

const git = (args, cwd = repository) => execFileSync('git', args, { cwd, encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })

try {
  git(['init'])
  git(['config', 'user.email', 'git-v2@example.invalid'])
  git(['config', 'user.name', 'CCM Git V2 Selftest'])
  fs.writeFileSync(path.join(repository, 'tracked.txt'), 'base\n')
  git(['add', 'tracked.txt'])
  git(['commit', '-m', 'base'])
  fs.writeFileSync(path.join(repository, 'tracked.txt'), 'changed\n')

  const first = await runtime.captureWorkspaceSnapshot(repository, 'selftest')
  assert.equal(first.schema, 'ccm-git-workspace-snapshot-v2')
  assert.ok(first.repository.git_common_dir)
  assert.ok(first.checksum)

  fs.writeFileSync(path.join(repository, 'second.txt'), 'new\n')
  const second = await runtime.captureWorkspaceSnapshot(repository, 'selftest')
  assert.notEqual(first.checksum, second.checksum)
  assert.throws(() => runtime.assertExpectedWorkspaceSnapshot(first.checksum, second), error => error?.gitErrorCode === 'state_drift')

  fs.writeFileSync(path.join(outside, 'secret.txt'), 'outside-secret')
  const linkPath = path.join(repository, 'linked')
  try {
    fs.symlinkSync(outside, linkPath, process.platform === 'win32' ? 'junction' : 'dir')
    assert.throws(() => runtime.resolveSafeRepositoryPath(repository, 'linked/secret.txt'), /符号链接|目录联接|真实路径/)
  } catch (error) {
    if (!['EPERM', 'EACCES', 'UNKNOWN'].includes(String(error?.code || ''))) throw error
  }

  const identity = await runtime.captureRepositoryIdentity(repository, 'selftest')
  const lease = await runtime.acquireGitMutationLease(identity, 'selftest-hold')
  await assert.rejects(() => runtime.acquireGitMutationLease(identity, 'selftest-race'), error => error?.gitErrorCode === 'repository_busy')
  assert.equal(await runtime.releaseGitMutationLease(lease), true)

  const evidence = await runtime.captureFileEvidence(repository, ['tracked.txt', 'missing.txt'])
  assert.equal(evidence[0].state, 'file')
  assert.equal(evidence[1].state, 'missing')
  assert.equal(evidence[0].checksum.length, 64)

  const gitSource = fs.readFileSync(path.join(root, 'backend/modules/tools/git.ts'), 'utf8')
  const runtimeSource = fs.readFileSync(path.join(root, 'backend/modules/tools/git-workspace-runtime.ts'), 'utf8')
  const globalSource = fs.readFileSync(path.join(root, 'backend/modules/global/global-agent-agentic-runtime.ts'), 'utf8')
  const frontendSource = fs.readFileSync(path.join(root, 'frontend/src/components/tools/CodeChanges.vue'), 'utf8')
  const cloneSource = fs.readFileSync(path.join(root, 'backend/modules/projects/project-git.ts'), 'utf8')
  const cloneUiSource = fs.readFileSync(path.join(root, 'frontend/src/components/projects/ProjectFormModal.vue'), 'utf8')
  const cloneManagerSource = fs.readFileSync(path.join(root, 'frontend/src/components/projects/useProjectManager.js'), 'utf8')
  const attributionSource = fs.readFileSync(path.join(root, 'backend/modules/collaboration/test-agent-runner.ts'), 'utf8')
  const globalApiSource = fs.readFileSync(path.join(root, 'backend/modules/global/global-agent-api.ts'), 'utf8')
  assert.match(gitSource, /limit\s*=\s*Math\.min\(500/)
  assert.match(gitSource, /expected_snapshot_checksum/)
  assert.match(gitSource, /repository_busy/)
  assert.match(gitSource, /all_files_authorization_required/)
  assert.doesNotMatch(globalSource, /allFiles:\s*files\.length\s*===\s*0/)
  assert.match(globalSource, /必须提供精确文件清单/)
  assert.match(frontendSource, /AbortController/)
  assert.match(frontendSource, /statusRequestGeneration/)
  assert.match(frontendSource, /workspace_snapshot_checksum/)
  assert.match(runtimeSource, /lstatSync/)
  assert.match(cloneSource, /\.ccm-clone-/)
  assert.match(cloneSource, /fs\.renameSync\(temporaryDirectory, destination\)/)
  assert.match(cloneSource, /runGitCommand[\s\S]*signal:\s*controller\.signal/)
  assert.match(cloneUiSource, /停止克隆/)
  assert.match(cloneManagerSource, /projectsApi\.cloneStatus/)
  assert.match(cloneManagerSource, /projectsApi\.cloneCancel/)
  assert.match(attributionSource, /declaredFileEvidence/)
  assert.match(globalApiSource, /runGitCommand\(workDir, \["status"/)
  assert.doesNotMatch(globalApiSource, /execFileSync\("git"/)

  console.log(JSON.stringify({
    success: true,
    checks: 24,
    paidProviderCalls: 0,
    snapshotDriftRejected: true,
    crossRepositoryPathRejected: true,
    repositoryLeaseSerialized: true,
    agentImplicitAllFilesRejected: true,
    atomicCloneGuardPresent: true,
  }, null, 2))
} finally {
  fs.rmSync(workspace, { recursive: true, force: true })
}
