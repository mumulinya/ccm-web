import assert from 'node:assert/strict'

const baseUrl = String(process.env.CCM_BASE_URL || 'http://127.0.0.1:3082').replace(/\/+$/, '')
const requestedProject = String(process.env.CCM_GIT_TEST_PROJECT || '')
const request = async (url, options = {}) => {
  const response = await fetch(`${baseUrl}${url}`, options)
  const data = await response.json().catch(() => ({}))
  return { response, data }
}

const projectsResult = await request('/api/projects')
assert.equal(projectsResult.response.ok, true, 'projects endpoint should be available')
const projects = projectsResult.data.projects || []
assert.ok(projects.length > 0, 'at least one project is required')
const candidates = requestedProject ? projects.filter(project => project.name === requestedProject) : projects

let selected = null
let status = null
for (const project of candidates) {
  const result = await request(`/api/git/status?project=${encodeURIComponent(project.name)}`)
  if (result.response.ok && result.data.success) {
    selected = project
    status = result.data
    break
  }
}
assert.ok(selected && status, 'a real Git project should expose status')
assert.equal(typeof status.summary?.additions, 'number')
assert.equal(typeof status.summary?.deletions, 'number')
assert.equal(Array.isArray(status.summary?.modules), true)
assert.equal(['exact', 'project_recent', 'none'].includes(status.context?.attribution), true)
assert.equal(status.files.every(file => typeof file.staged === 'boolean' && typeof file.unstaged === 'boolean' && typeof file.conflict === 'boolean'), true)

const textFile = status.files.find(file => !file.binary)
if (textFile) {
  const diffResult = await request(`/api/git/diff?project=${encodeURIComponent(selected.name)}&file=${encodeURIComponent(textFile.path)}`)
  assert.equal(diffResult.response.ok, true)
  assert.equal(diffResult.data.success, true)
  assert.equal(typeof diffResult.data.additions, 'number')
  assert.equal(Array.isArray(diffResult.data.hunks), true)
}

const chosen = status.files.filter(file => !file.conflict).slice(0, 2).map(file => file.path)
if (chosen.length) {
  const previewResult = await request('/api/git/commit-preview', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project: selected.name, files: chosen }),
  })
  assert.equal(previewResult.response.ok, true)
  assert.equal(previewResult.data.success, true)
  assert.deepEqual(previewResult.data.preview.requestedFiles, chosen)
  assert.equal(Array.isArray(previewResult.data.preview.outsideStaged), true)
}

const traversalResult = await request(`/api/git/file?project=${encodeURIComponent(selected.name)}&file=${encodeURIComponent('../config.toml')}`)
assert.equal(traversalResult.response.status, 400)
assert.match(traversalResult.data.error, /非法文件路径|项目目录/)

const patchTraversal = await request('/api/git/apply-patch', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ project: selected.name, patchText: '--- a/../outside.txt\n+++ b/../outside.txt\n@@ -1 +1 @@\n-a\n+b' }),
})
assert.equal(patchTraversal.data.success, false)
assert.match(patchTraversal.data.error, /非法文件路径/)

console.log(JSON.stringify({
  success: true,
  project: selected.name,
  branch: status.branch,
  files: status.files.length,
  summary: status.summary,
  attribution: status.context.attribution,
  checks: {
    realStatusAndStats: true,
    realDiffRead: !!textFile,
    selectedCommitPreview: !!chosen.length,
    traversalRejected: true,
    maliciousPatchRejectedBeforeApply: true,
  },
}, null, 2))
