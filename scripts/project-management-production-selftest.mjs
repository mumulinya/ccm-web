import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const root = path.resolve(import.meta.dirname, '..')
const outputDir = path.join(root, 'scratch', 'project-management-production-selftest')
const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-project-management-'))
const port = 31987
const baseUrl = `http://127.0.0.1:${port}`
const project = 'production-fixture'
const workDir = path.join(tempHome, 'source-project')
const ccmDir = path.join(tempHome, '.cc-connect')
const checks = []
let child

fs.mkdirSync(outputDir, { recursive: true })
fs.mkdirSync(workDir, { recursive: true })
fs.mkdirSync(path.join(ccmDir, 'configs'), { recursive: true })
fs.mkdirSync(path.join(ccmDir, 'web-sessions', project), { recursive: true })
fs.mkdirSync(path.join(ccmDir, 'sessions'), { recursive: true })
fs.mkdirSync(path.join(ccmDir, 'logs'), { recursive: true })
fs.mkdirSync(path.join(ccmDir, 'test-agent-artifacts', 'evidence-1'), { recursive: true })
fs.writeFileSync(path.join(workDir, 'README.md'), '# preserved source')
fs.writeFileSync(path.join(ccmDir, 'tasks.json'), JSON.stringify([{ id: 'task-preserved', project }]))
fs.writeFileSync(path.join(ccmDir, 'test-agent-artifacts', 'evidence-1', 'result.json'), '{"pass":true}')
fs.writeFileSync(path.join(ccmDir, 'project-configs.json'), JSON.stringify({ [project]: { tools: { mcp: ['playwright'] } } }))
fs.writeFileSync(path.join(ccmDir, 'configs', `config-${project}.toml`), `language = "zh"\n[[projects]]\nname = "${project}"\nwork_dir = "${workDir.replace(/\\/g, '\\\\')}"\n[projects.agent]\ntype = "codex"\n[[projects.platforms]]\ntype = "feishu"\n`)
fs.writeFileSync(path.join(ccmDir, 'web-sessions', project, 's1.json'), JSON.stringify({ id: 's1', name: '验收会话', history: [] }))
fs.writeFileSync(path.join(ccmDir, 'sessions', `${project}_a1b2c3d4.json`), JSON.stringify({ sessions: { s1: { id: 's1', history: [] } } }))
fs.writeFileSync(path.join(ccmDir, 'logs', `${project}.log`), 'fixture log')

const request = async (pathname, options = {}) => {
  const response = await fetch(`${baseUrl}${pathname}`, options)
  return { response, data: await response.json().catch(() => ({})) }
}
const post = (pathname, body) => request(pathname, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

const waitForServer = async () => {
  for (let attempt = 0; attempt < 80; attempt++) {
    try { const result = await request('/api/projects'); if (result.response.ok) return } catch {}
    await new Promise(resolve => setTimeout(resolve, 150))
  }
  throw new Error('isolated server did not start')
}

try {
  child = spawn(process.execPath, [path.join(root, 'ccm-package', 'dist', 'server.js'), String(port)], {
    cwd: root,
    env: { ...process.env, HOME: tempHome, USERPROFILE: tempHome },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let serverOutput = ''
  child.stdout.on('data', chunk => { serverOutput += chunk })
  child.stderr.on('data', chunk => { serverOutput += chunk })
  await waitForServer()

  const listed = await request('/api/projects')
  assert.equal(listed.data.projects.some(item => item.name === project), true)
  checks.push({ name: 'active project is listed from isolated runtime', pass: true })

  const duplicate = await post('/api/projects/create', { name: project, work_dir: workDir, agent: 'codex', platform: 'feishu' })
  assert.equal(duplicate.response.status, 409)

  const invalidName = await post('/api/projects/create', { name: '../escape', work_dir: workDir, agent: 'codex', platform: 'feishu' })
  assert.equal(invalidName.response.status, 400)
  const invalidAgent = await post('/api/projects/create', { name: 'bad-agent', work_dir: workDir, agent: 'shell-injection', platform: 'feishu' })
  assert.equal(invalidAgent.response.status, 400)
  const invalidSession = await request(`/api/projects/${project}/sessions/bad..id`)
  assert.equal(invalidSession.response.status, 400)
  const orphanSession = await post('/api/sessions/create', { project: 'missing-project' })
  assert.equal(orphanSession.response.status, 400)
  assert.equal(fs.existsSync(path.join(ccmDir, 'web-sessions', 'missing-project')), false)
  checks.push({ name: 'duplicate project overwrite and unsafe project, agent and session input are rejected', pass: true })

  const archived = await post('/api/projects/archive', { name: project })
  assert.equal(archived.response.ok, true)
  assert.ok(archived.data.audit_id)
  assert.equal((await request('/api/projects')).data.projects.some(item => item.name === project), false)
  assert.equal((await request('/api/projects/archived')).data.projects.some(item => item.name === project), true)
  checks.push({ name: 'archive removes project from active list and returns audit receipt', pass: true })

  const restored = await post('/api/projects/restore', { name: project })
  assert.equal(restored.response.ok, true)
  assert.equal((await request('/api/projects')).data.projects.some(item => item.name === project), true)
  await post('/api/projects/archive', { name: project })
  checks.push({ name: 'archived project can be restored without losing sessions', pass: true })

  const missingPreview = await post('/api/projects/purge', { name: project })
  assert.equal(missingPreview.response.status, 400)
  const preview = await post('/api/projects/purge-preview', { name: project })
  assert.equal(preview.response.ok, true)
  assert.ok(preview.data.preview_token)
  assert.equal(preview.data.session_count, 1)
  assert.equal(preview.data.retained.includes('TestAgent 验收证据'), true)
  const purged = await post('/api/projects/purge', { name: project, preview_token: preview.data.preview_token })
  assert.equal(purged.response.ok, true)
  assert.ok(purged.data.audit_id)
  assert.equal(fs.existsSync(path.join(ccmDir, 'configs', 'archived', `config-${project}.toml`)), false)
  assert.equal(fs.existsSync(path.join(ccmDir, 'web-sessions', project)), false)
  assert.equal(fs.existsSync(path.join(ccmDir, 'sessions', `${project}_a1b2c3d4.json`)), false)
  assert.equal(fs.existsSync(workDir), true)
  assert.equal(fs.existsSync(path.join(ccmDir, 'tasks.json')), true)
  assert.equal(fs.existsSync(path.join(ccmDir, 'test-agent-artifacts', 'evidence-1', 'result.json')), true)
  assert.equal(Object.hasOwn(JSON.parse(fs.readFileSync(path.join(ccmDir, 'project-configs.json'), 'utf8')), project), false)
  checks.push({ name: 'permanent purge requires preview, deletes exact project data and preserves source, tasks and TestAgent evidence', pass: true })

  const audit = await request('/api/projects/lifecycle-audit')
  assert.equal(audit.response.ok, true)
  assert.equal(audit.data.records.some(item => item.action === 'purge' && item.project === project), true)
  checks.push({ name: 'lifecycle history records archive, restore and purge operations', pass: true })

  const report = { pass: true, generatedAt: new Date().toISOString(), checks }
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  const report = { pass: false, generatedAt: new Date().toISOString(), checks, error: error?.stack || String(error) }
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2))
  console.error(report.error)
  process.exitCode = 1
} finally {
  if (child && !child.killed) child.kill('SIGTERM')
  await new Promise(resolve => setTimeout(resolve, 300))
  fs.rmSync(tempHome, { recursive: true, force: true })
}
