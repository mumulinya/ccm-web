import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { applyAgenticTestPlanning, planAgenticTestFollowup } from '../ccm-package/dist/test-agent/agentic-planner.js'
import { buildBrowserChecksForProject } from '../ccm-package/dist/test-agent/browser/auto-checks.js'
import { writePlaywrightEvidenceScreenshot } from '../ccm-package/dist/test-agent/browser/failure-screenshots.js'
import { checkPlaywrightAvailability } from '../ccm-package/dist/test-agent/browser/playwright-provider.js'
import { listTestAgentArtifactCatalogForTasks } from '../ccm-package/dist/test-agent/artifact-retention.js'
import { normalizeTestAgentWorkOrder } from '../ccm-package/dist/test-agent/work-order.js'
import { readInternalMcpTestEvidenceContent } from '../ccm-package/dist/integrations/internal-mcp-test-evidence.js'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-test-agent-browser-orchestration-'))
const projectDir = path.join(root, 'project')
const artifactDir = path.join(root, 'artifacts')
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')

try {
  fs.mkdirSync(projectDir, { recursive: true })
  fs.writeFileSync(path.join(projectDir, 'package.json'), JSON.stringify({ name: 'fixture', private: true }))
  const normalized = normalizeTestAgentWorkOrder({
    schema: 'ccm-test-agent-work-order-v1',
    id: 'browser-orchestration',
    taskId: 'browser-orchestration-task',
    issuedBy: 'selftest',
    originalUserGoal: '验证保存交互',
    acceptanceCriteria: ['点击“保存”后显示“保存成功”'],
    projects: [{
      name: 'fixture',
      workDir: projectDir,
      targetUrl: 'http://127.0.0.1:43119',
      browserScenarios: ['用户点击保存后必须看到保存成功提示'],
    }],
    options: {
      artifactDir,
      browserProvider: 'playwright',
      agenticPlanning: true,
      autoDiscoverVerificationCommands: false,
      requireAdversarialProbe: false,
      adversarialProbeWaiver: 'Isolated browser orchestration fixture.',
    },
  }).workOrder

  const planned = await applyAgenticTestPlanning(normalized, {
    agenticPlanner: async input => {
      assert.deepEqual(input.workOrder.projects[0].browserScenarios, ['用户点击保存后必须看到保存成功提示'])
      return {
        summary: '规划保存场景',
        criterionCoverage: [{
          criterion: '点击“保存”后显示“保存成功”',
          status: 'planned',
          checkNames: ['save-flow'],
          reason: '模型已生成结构化浏览器检查',
        }],
        projects: [{
          name: 'fixture',
          browserChecks: [
            {
              name: 'save-flow',
              url: 'http://127.0.0.1:43119',
              actions: [{ type: 'click', role: 'button', name: '保存', verifyEffect: true }],
              assertions: [{ type: 'text', text: '保存成功' }],
              coversAcceptanceCriteria: ['点击“保存”后显示“保存成功”'],
            },
            { name: 'invalid-flow', actions: [{ type: 'invented-action' }], assertions: [{ type: 'invented-assertion' }] },
          ],
        }],
      }
    },
  })
  assert.equal(planned.workOrder.projects[0].browserChecks.some(item => item.name === 'save-flow' && item.screenshot !== false), true)
  assert.equal(planned.workOrder.projects[0].browserChecks.some(item => item.name === 'invalid-flow'), false)
  assert.equal(planned.issues.some(item => item.code === 'agentic_browser_check_without_assertion'), true)

  const derived = buildBrowserChecksForProject(normalized.projects[0], normalized.acceptanceCriteria)
  assert.equal(derived.some(item => item.probeType === 'acceptance_click_flow'), false)
  assert.equal(derived.some(item => item.probeType === 'auto_target_url_smoke'), true)

  const followup = await planAgenticTestFollowup({
    workOrder: planned.workOrder,
    commandResults: [],
    httpResults: [],
    browserResults: [{ project: 'fixture', name: 'save-flow', status: 'failed' }],
  }, { agenticFollowupPlanner: async () => ({ summary: '重跑失败场景', projects: [] }) })
  assert.equal(followup.workOrder?.projects[0].browserChecks.some(item => item.name === 'save-flow'), true)
  assert.equal(followup.workOrder?.requiredChecks.includes('browser'), true)
  assert.equal(followup.workOrder?.requiredChecks.includes('screenshots'), true)
  assert.equal(followup.workOrder?.requiredChecks.includes('commands'), false)
  assert.notEqual(followup.workOrder?.options.browserProvider, 'none')

  const screenshotRefs = await writePlaywrightEvidenceScreenshot({
    page: { screenshot: async ({ path: file }) => fs.writeFileSync(file, png) },
    artifactDir,
    projectName: 'fixture',
    checkName: 'save-flow',
    index: 0,
    stepName: 'click-save',
    phase: 'after',
  })
  assert.equal(screenshotRefs.length, 1)
  assert.equal(screenshotRefs[0].stepName, 'after:click-save')
  assert.equal(fs.existsSync(screenshotRefs[0].path), true)
  const failedScreenshotRefs = await writePlaywrightEvidenceScreenshot({
    page: { screenshot: async () => { throw new Error('page crashed') } },
    artifactDir,
    projectName: 'fixture',
    checkName: 'save-flow',
    index: 0,
    stepName: 'click-save',
    phase: 'after',
  })
  assert.deepEqual(failedScreenshotRefs, [])

  let launchCount = 0
  const fallbackAvailability = await checkPlaywrightAvailability(() => ({ chromium: { launch: async options => {
    launchCount += 1
    if (!options.channel) throw new Error('bundled revision missing')
    return { close: async () => {} }
  } } }))
  assert.equal(fallbackAvailability.available, true)
  assert.equal(fallbackAvailability.diagnostics.channel, 'msedge')
  assert.match(fallbackAvailability.diagnostics.warning, /playwright install chromium/i)
  assert.equal(launchCount, 2)
  const unavailable = await checkPlaywrightAvailability(() => ({ chromium: { launch: async () => { throw new Error('no browser') } } }))
  assert.equal(unavailable.available, false)
  assert.match(unavailable.reason, /npx playwright install chromium/i)

  const runDir = path.join(root, 'evidence-run')
  fs.mkdirSync(runDir, { recursive: true })
  const screenshot = path.join(runDir, 'proof.png')
  fs.writeFileSync(screenshot, png)
  fs.writeFileSync(path.join(runDir, 'report.json'), JSON.stringify({ id: 'evidence-report', taskId: 'bound-task', status: 'failed' }))
  fs.writeFileSync(path.join(runDir, 'artifact-manifest.json'), JSON.stringify({ files: [{ type: 'screenshot', title: '失败截图', path: screenshot }] }))
  const catalog = listTestAgentArtifactCatalogForTasks(['bound-task'], { rootDir: root })
  const artifactId = catalog.find(item => item.run_id === 'evidence-report')?.artifacts[0]?.id
  assert.ok(artifactId)
  const content = readInternalMcpTestEvidenceContent('bound-task', { run_id: 'evidence-report', artifact_id: artifactId }, { rootDir: root })
  assert.equal(content.content.some(item => item.type === 'image' && item.data === png.toString('base64')), true)
  assert.throws(
    () => readInternalMcpTestEvidenceContent('other-task', { run_id: 'evidence-report', artifact_id: artifactId }, { rootDir: root }),
    /不属于当前任务/,
  )

  console.log('test-agent browser orchestration self-test: 20/20 checks passed; paid provider calls: 0')
} finally {
  fs.rmSync(root, { recursive: true, force: true })
}
