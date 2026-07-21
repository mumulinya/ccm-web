import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const reportDir = path.join(root, 'scratch', 'project-github-management-selftest')
const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-project-github-selftest-'))
const repository = path.join(outputDir, 'repository')
const plainDirectory = path.join(outputDir, 'plain-directory')
fs.rmSync(reportDir, { recursive: true, force: true })
fs.mkdirSync(reportDir, { recursive: true })
fs.mkdirSync(repository, { recursive: true })
fs.mkdirSync(plainDirectory, { recursive: true })

const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf-8', windowsHide: true })
git(repository, ['init'])
git(repository, ['config', 'user.email', 'ccm-git-selftest@example.com'])
git(repository, ['config', 'user.name', 'CCM Git Selftest'])
fs.writeFileSync(path.join(repository, 'README.md'), '# repository\n')
git(repository, ['add', 'README.md'])
git(repository, ['commit', '-m', 'initial commit'])
git(repository, ['remote', 'add', 'origin', 'https://github.com/example/first-repository.git'])

const projectGit = await import('../ccm-package/dist/modules/projects/project-git.js')

assert.equal(projectGit.normalizeGitHubRepositoryUrl('https://github.com/openai/codex'), 'https://github.com/openai/codex.git')
assert.equal(projectGit.normalizeGitHubRepositoryUrl('git@github.com:openai/codex.git'), 'git@github.com:openai/codex.git')
assert.throws(() => projectGit.normalizeGitHubRepositoryUrl('https://token@github.com/openai/codex'), /不能包含账号/)
assert.throws(() => projectGit.normalizeGitHubRepositoryUrl('https://gitlab.com/openai/codex'), /仅支持 github\.com/)
assert.equal(projectGit.sanitizeGitRemoteUrl('https://user:secret@github.com/openai/codex.git'), 'https://github.com/openai/codex.git')
assert.equal(projectGit.normalizeGitBranch('feature/github-management'), 'feature/github-management')
assert.throws(() => projectGit.normalizeGitBranch('../unsafe'), /分支名称格式无效/)

const initial = projectGit.inspectProjectGit(repository)
assert.equal(initial.is_repository, true)
assert.equal(initial.remote_web_url, 'https://github.com/example/first-repository')
assert.ok(initial.branch)
assert.equal(initial.dirty, false)
assert.equal(initial.last_commit.summary, 'initial commit')

fs.writeFileSync(path.join(repository, 'changed.txt'), 'dirty\n')
const dirty = projectGit.inspectProjectGit(repository)
assert.equal(dirty.dirty, true)
assert.equal(dirty.untracked_files, 1)

const updated = projectGit.configureProjectRepository({
  workDir: repository,
  repositoryUrl: 'https://github.com/example/second-repository',
})
assert.equal(updated.remote_url, 'https://github.com/example/second-repository.git')

const initialized = projectGit.configureProjectRepository({
  workDir: plainDirectory,
  repositoryUrl: 'git@github.com:example/plain-repository.git',
  initialize: true,
})
assert.equal(initialized.is_repository, true)
assert.equal(initialized.remote_url, 'git@github.com:example/plain-repository.git')

await assert.rejects(
  projectGit.cloneGitHubRepository({ repositoryUrl: 'https://example.com/not-github/repository', destination: path.join(outputDir, 'clone') }),
  /仅支持 github\.com/,
)

const apiSource = fs.readFileSync(path.join(root, 'backend/modules/projects/projects.ts'), 'utf-8')
const formSource = fs.readFileSync(path.join(root, 'frontend/src/components/projects/ProjectFormModal.vue'), 'utf-8')
assert.match(apiSource, /await cloneGitHubRepository/)
assert.match(apiSource, /configureProjectRepository/)
assert.match(formSource, /GitHub 仓库/)
assert.match(formSource, /初始化 Git 仓库/)

const report = { pass: true, checks: 21, paidProviderCalls: 0, networkGitOperations: 0 }
fs.writeFileSync(path.join(reportDir, 'report.json'), JSON.stringify(report, null, 2))
fs.rmSync(outputDir, { recursive: true, force: true })
console.log(JSON.stringify(report, null, 2))
