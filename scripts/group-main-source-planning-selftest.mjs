import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceModule = await import(pathToFileURL(path.join(root, 'ccm-package/dist/modules/collaboration/project-analysis.js')).href)
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-group-main-source-plan-'))

try {
  const apiRoot = path.join(tempRoot, 'api')
  const webRoot = path.join(tempRoot, 'web')
  fs.mkdirSync(path.join(apiRoot, 'src'), { recursive: true })
  fs.mkdirSync(path.join(webRoot, 'src'), { recursive: true })
  fs.writeFileSync(path.join(apiRoot, 'package.json'), JSON.stringify({ name: 'api' }))
  fs.writeFileSync(path.join(apiRoot, 'src', 'login.ts'), 'export function login() { return { token: "ok" } }\n')
  fs.writeFileSync(path.join(apiRoot, '.env'), 'API_TOKEN=must-not-leak\n')
  fs.writeFileSync(path.join(webRoot, 'package.json'), JSON.stringify({ name: 'web' }))
  fs.writeFileSync(path.join(webRoot, 'src', 'Login.vue'), '<template><form>login</form></template>\n')

  const configFile = (name, workDir) => {
    const file = path.join(tempRoot, `${name}.toml`)
    fs.writeFileSync(file, [
      '[[projects]]',
      `name = "${name}"`,
      `work_dir = "${workDir.replace(/\\/g, '\\\\')}"`,
      'agent = "claudecode"',
      '',
    ].join('\n'))
    return { name, path: file }
  }
  const configs = [configFile('api', apiRoot), configFile('web', webRoot)]
  const group = {
    id: 'group-source-plan',
    orchestrator: { enabled: true, coordinatorProject: 'coordinator' },
    members: [
      { project: 'coordinator', role: 'coordinator' },
      { project: 'api', role: 'member', agent: 'claudecode' },
      { project: 'web', role: 'member', agent: 'codex' },
    ],
  }
  const evidence = sourceModule.buildGroupMainPlanningSourceContext(
    group,
    '修改登录接口并返回 token',
    configs,
    { targetProjects: ['api'] },
  )

  const executor = fs.readFileSync(path.join(root, 'backend/modules/collaboration/collaboration-task-executor.ts'), 'utf8')
  const orchestrator = fs.readFileSync(path.join(root, 'backend/modules/collaboration/group-orchestrator-llm.ts'), 'utf8')
  const planCore = fs.readFileSync(path.join(root, 'backend/modules/collaboration/main-agent-plan-core.ts'), 'utf8')
  const checks = {
    onlyModelSelectedProjectHydrated: evidence.projects.length === 1 && evidence.projects[0]?.project === 'api',
    currentSourceEvidenceHasChecksums: evidence.projects[0]?.selectedPaths.includes('src/login.ts')
      && evidence.projects[0]?.files.every(file => /^[a-f0-9]{64}$/.test(file.checksum)),
    sensitiveFilesExcluded: !evidence.rendered.includes('must-not-leak') && !evidence.projects[0]?.selectedPaths.includes('.env'),
    snapshotBoundAndReady: evidence.ready === true && /^[a-f0-9]{64}$/.test(evidence.checksum),
    sourceGateFailsClosed: executor.includes('acceptance_state: "source_hydration_blocked"')
      && executor.includes('群聊主 Agent 无法在规划前读取完整的目标项目源码'),
    sourceEvidenceReachesWorker: executor.includes('[主 Agent 只读源码规划依据]')
      && executor.includes('attachGroupPlanningSourceToAssignments'),
    sourceGroundedPlanIsLive: executor.includes('sourceGroundedPlanModeUpdates')
      && executor.includes('grounding: "current_source"')
      && planCore.includes('source === "model"'),
    codeTasksAreSequential: orchestrator.includes('workflowDecision.requiresCodeChanges === true')
      && orchestrator.includes('? "sequential"'),
    architecturePlanRequired: orchestrator.includes('"architecturePlan"')
      && orchestrator.includes('dataRelationships')
      && orchestrator.includes('sourceCitations'),
    existingIndependentReviewRemains: executor.includes('runCoordinatorReviewLoop')
      && executor.includes('TestAgent'),
  }
  for (const [name, pass] of Object.entries(checks)) console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`)
  if (!Object.values(checks).every(Boolean)) process.exitCode = 1
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true })
}
