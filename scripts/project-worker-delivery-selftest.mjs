import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const moduleUrl = pathToFileURL(path.join(root, 'ccm-package', 'dist', 'modules', 'projects', 'project-worker-delivery.js')).href
const { enqueueProjectWorkerDelivery } = await import(moduleUrl)
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-project-worker-delivery-'))

const git = (cwd, args) => String(execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })).trim()
const write = (file, value) => fs.writeFileSync(file, value, 'utf8')

try {
  git(temp, ['init'])
  git(temp, ['config', 'user.email', 'ccm-selftest@example.invalid'])
  git(temp, ['config', 'user.name', 'CCM Selftest'])
  write(path.join(temp, 'README.md'), 'base\n')
  git(temp, ['add', 'README.md'])
  git(temp, ['commit', '-m', 'base'])
  const baseHead = git(temp, ['rev-parse', 'HEAD'])

  const worktree = path.join(temp, '.worktrees', 'agent-committed')
  const branch = 'ccm/agent-committed'
  fs.mkdirSync(path.dirname(worktree), { recursive: true })
  git(temp, ['worktree', 'add', '-b', branch, worktree, 'HEAD'])
  git(worktree, ['config', 'user.email', 'ccm-selftest@example.invalid'])
  git(worktree, ['config', 'user.name', 'CCM Selftest'])
  write(path.join(worktree, 'AGENT.md'), 'agent committed\n')
  git(worktree, ['add', 'AGENT.md'])
  git(worktree, ['commit', '-m', 'agent commit'])

  const delivery = enqueueProjectWorkerDelivery({
    prepared: { mode: 'worktree', worktreePath: worktree, worktreeBranch: branch, baseHead },
    workItem: { id: 'work_1', title: 'agent committed delivery' },
    mainWorkDir: temp,
    queue: Promise.resolve(),
  })
  const receipt = await delivery.promise
  assert.equal(receipt.merged, true)
  assert.equal(receipt.cleaned, true)
  assert.equal(receipt.commits.length, 1)
  assert.equal(fs.readFileSync(path.join(temp, 'AGENT.md'), 'utf8').trim(), 'agent committed')
  assert.equal(fs.existsSync(worktree), false)

  process.stdout.write(`${JSON.stringify({ pass: true, agentCommittedBranchMerged: true }, null, 2)}\n`)
} finally {
  fs.rmSync(temp, { recursive: true, force: true })
}
