import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const mainModule = await import(pathToFileURL(path.join(root, 'ccm-package/dist/modules/projects/project-main-agent.js')).href)
const targetModule = await import(pathToFileURL(path.join(root, 'ccm-package/dist/modules/projects/project-test-targets.js')).href)
const gateModule = await import(pathToFileURL(path.join(root, 'ccm-package/dist/modules/projects/project-test-agent-gate.js')).href)
const authModule = await import(pathToFileURL(path.join(root, 'ccm-package/dist/modules/projects/project-test-auth.js')).href)
const sourceModule = await import(pathToFileURL(path.join(root, 'ccm-package/dist/modules/projects/project-main-agent-source.js')).href)
const runtimeDiagnosticsModule = await import(pathToFileURL(path.join(root, 'ccm-package/dist/modules/projects/project-main-agent-runtime-diagnostics.js')).href)

const contract = mainModule.runProjectMainAgentContractSelfTest()
const targets = targetModule.runProjectTestTargetsSelfTest()
const projectAuth = authModule.runProjectTestAuthContractSelfTest()
const sourceContract = sourceModule.runProjectMainSourceContractSelfTest()
const runtimeDiagnosticsContract = runtimeDiagnosticsModule.runProjectRuntimeDiagnosticsContractSelfTest()
const server = fs.readFileSync(path.join(root, 'backend/server.ts'), 'utf8')
const projectRoutes = fs.readFileSync(path.join(root, 'backend/modules/projects/projects.ts'), 'utf8')
const runner = fs.readFileSync(path.join(root, 'backend/modules/projects/project-main-agent.ts'), 'utf8')
const sourceReader = fs.readFileSync(path.join(root, 'backend/modules/projects/project-main-agent-source.ts'), 'utf8')
const projectTestGate = fs.readFileSync(path.join(root, 'backend/modules/projects/project-test-agent-gate.ts'), 'utf8')
const serverBootstrap = fs.readFileSync(path.join(root, 'backend/server-bootstrap.ts'), 'utf8')
const taskService = fs.readFileSync(path.join(root, 'backend/modules/collaboration/collaboration-task-service.ts'), 'utf8')
const unifiedScheduler = fs.readFileSync(path.join(root, 'backend/system/unified-task-scheduler.ts'), 'utf8')
const projectUi = fs.readFileSync(path.join(root, 'frontend/src/components/projects/useProjectManager.js'), 'utf8')
const targetUi = fs.readFileSync(path.join(root, 'frontend/src/components/collaboration/GroupTestTargetsModal.vue'), 'utf8')
const projectFormUi = fs.readFileSync(path.join(root, 'frontend/src/components/projects/ProjectFormModal.vue'), 'utf8')
const groupTargets = fs.readFileSync(path.join(root, 'backend/modules/collaboration/group-test-targets.ts'), 'utf8')
const credentialBrowserChecks = gateModule.buildProjectTestTargetBrowserChecks({
  id: 'web-login', project: 'demo', name: 'Web 用户端', kind: 'web', environment: 'test', enabled: true, required: true,
  baseUrl: 'http://127.0.0.1:5173', startupCommand: '', verificationCommands: [], notes: '', checksum: 'demo', env: {},
  auth: {
    mode: 'credentials', loginPath: '/login', submitLabel: '登录', successText: '工作台', successUrlIncludes: '/dashboard',
    storageStatePath: '', existingSessionProvider: 'auto',
    fields: [
      { id: 'username', label: '用户名', envName: 'TEST_USERNAME', inputLabel: '用户名', valueRef: 'protected' },
      { id: 'password', label: '密码', envName: 'TEST_PASSWORD', inputLabel: '密码', valueRef: 'protected' },
    ],
  },
  createdAt: '', updatedAt: '',
}, root)
const storageBrowserChecks = gateModule.buildProjectTestTargetBrowserChecks({
  id: 'web-state', project: 'demo', name: '管理端', kind: 'web', environment: 'test', enabled: true, required: false,
  baseUrl: 'http://127.0.0.1:5174', startupCommand: '', verificationCommands: [], notes: '', checksum: 'demo', env: {},
  auth: { mode: 'storage_state', loginPath: '', submitLabel: '', successText: '', successUrlIncludes: '', storageStatePath: '.ccm/test-auth/admin.json', existingSessionProvider: 'auto', fields: [] },
  createdAt: '', updatedAt: '',
}, root)

const checks = {
  planContract: contract.success === true,
  targetContract: targets.success === true,
  projectAuthContract: projectAuth.success === true,
  sourceContract: sourceContract.success === true,
  runtimeDiagnosticsContract: runtimeDiagnosticsContract.success === true,
  projectMainPlansFromCurrentSource: runner.includes('hydrateProjectMainSource({')
    && runner.includes('current_project_source: sourceHydration.prompt')
    && runner.includes('sourceEvidence: projectSourceEvidenceSummary(sourceHydration.evidence)')
    && runner.includes('type: "project_main_source_hydrated"'),
  projectSourceIsReadOnlyAndScoped: sourceReader.includes('fs.realpathSync(resolvedRoot)')
    && sourceReader.includes('isSensitivePath(relativePath)')
    && sourceReader.includes('entry.isSymbolicLink()')
    && !sourceReader.includes('writeFileSync('),
  projectMainUsesRuntimeDiagnostics: runner.includes('hydrateProjectRuntimeDiagnostics({')
    && runner.includes('current_project_runtime: runtimeHydration.prompt')
    && runner.includes('type: "project_main_runtime_diagnostics"'),
  sendStreamUsesProjectMainAgent: server.includes('operation: () => executeProjectMainTask({') && server.includes('answerAsProjectMainAgent({'),
  projectMainUsesUnifiedSerialScheduler: server.includes('scheduleUnifiedTaskOperation({')
    && server.includes('queueKey: `conversation:project:${project}:${exactProjectSessionId}`')
    && unifiedScheduler.includes('withUnifiedWorkspaceMutationLane'),
  directWorkerCompletionIsNotCanonical: runner.includes('acceptance_state: accepted ? "accepted" : "blocked"') && runner.includes('round <= AUTO_REWORK_MAX_ROUNDS'),
  projectMainUsesDurableLease: runner.includes('acquireTaskLease(taskId')
    && runner.includes('renewTaskLease(taskId')
    && runner.includes('releaseTaskLease(taskId'),
  interruptedProjectMainFailsClosed: runner.includes('reconcileInterruptedProjectMainTasks')
    && runner.includes('acceptance_state: "recovery_required"')
    && serverBootstrap.includes('reconcileInterruptedProjectMainTasks()'),
  testAgentReviewCacheBoundToCycle: runner.includes('reviewCycleId')
    && projectTestGate.includes('attemptScope: input.reviewCycleId || ""'),
  testAgentIsRequiredForChanges: runner.includes('input.task.requires_code_changes === true')
    && runner.includes('runProjectTaskTestAgentReview({')
    && projectTestGate.includes('runTestAgentCliJob({'),
  acceptanceCriteriaHaveEvidenceContracts: runner.includes('acceptanceEvidencePlan')
    && runner.includes('normalizeTestAgentAcceptanceEvidencePlan')
    && runner.includes('verificationProfile'),
  testAgentFailureRoutesAreSeparated: runner.includes('reviewDecision.route === "implementation_rework"')
    && runner.includes('reviewDecision.route === "test_agent_recheck"')
    && runner.includes('reviewDecision.route === "environment"'),
  incrementalReviewCarriesPreviousEvidence: runner.includes('previousReview,')
    && projectTestGate.includes('buildTestAgentIncrementalScope')
    && projectTestGate.includes('incrementalScope'),
  exactProjectSessionBinding: runner.includes('orchestration_scope: "project_session"') && runner.includes('project_session_id: input.projectSessionId'),
  siblingSessionDedupeIsolation: taskService.includes('project_session_id: taskProjectSessionId || null')
    && taskService.includes('exact_session_id: exactSessionId')
    && taskService.includes('existingIdentity.checksum === incomingIdentity.checksum'),
  planConfirmationResumesOriginalTask: server.includes('const existingTask = parentProjectMainTask') && projectUi.includes("'/api/projects/main-agent/plan-confirm'"),
  projectTargetsAreIndependent: server.includes('/api/projects/main-agent/task') && fs.existsSync(path.join(root, 'backend/modules/projects/project-test-targets.ts')),
  projectUiShowsTestTargets: projectUi.includes('loadProjectTestTargets') && projectUi.includes('saveProjectTestTarget'),
  projectUiConfiguresLoginFlow: targetUi.includes('登录页面路径') && targetUi.includes('登录后 URL 包含') && targetUi.includes('登录后页面文本'),
  projectTestTargetOwnsSharedCredentials: targetUi.includes('登录用户名')
    && targetUi.includes('登录密码')
    && targetUi.includes('项目 TestAgent和引用该项目的群聊 TestAgent共同读取')
    && !projectFormUi.includes('TestAgent 登录')
    && projectRoutes.includes('/api/projects/test-auth'),
  groupTargetsReuseProjectCredentials: groupTargets.includes('resolveProjectTestAuthProfile(target.project)')
    && targetUi.includes('当前群聊不单独保存用户名或密码'),
  projectCredentialLoginIsExecutable: credentialBrowserChecks.length === 1
    && credentialBrowserChecks[0].url === 'http://127.0.0.1:5173/login'
    && credentialBrowserChecks[0].actions.filter(action => action.type === 'fill').length === 2
    && credentialBrowserChecks[0].actions.some(action => action.valueEnv === 'TEST_PASSWORD')
    && credentialBrowserChecks[0].assertions.some(assertion => assertion.type === 'urlIncludes' && assertion.text === '/dashboard'),
  projectStorageStateIsExecutable: storageBrowserChecks.length === 1
    && storageBrowserChecks[0].storageStatePath === '.ccm/test-auth/admin.json',
  projectMainRollbackUsesSourceCheckpoint: projectUi.includes("isProjectMainTask ? projectMainRunId") && projectUi.includes("'/api/project-runs/rollback'"),
  projectStageEventsRefreshExactSession: projectUi.includes("startsWith('project.main_agent.')")
    && projectUi.includes('eventSessionId !== currentSession.value')
    && projectUi.includes('refreshCurrentProjectSession(eventSessionId)'),
  projectTaskMessageIsServerOwned: server.includes('const taskMessageId = `project-main-task:${task.id}`')
    && server.includes('persistTaskMessage(plan.summary)')
    && server.includes('message_id: taskMessageId')
    && projectUi.includes('serverOwnedTaskMessage'),
  projectTaskHydratesAfterReconnect: projectUi.includes('hydrateProjectTaskMessages')
    && projectUi.includes('/api/projects/main-agent/task?task_id=')
    && projectUi.includes('await hydrateProjectTaskMessages'),
  projectPlanRevisionPreservesTask: runner.includes('reviseProjectMainTask')
    && runner.includes('existingRevisions.find')
    && runner.includes('planBuilder || planProjectMainTask')
    && runner.includes('previous_plan_checksum')
    && projectUi.includes("action: 'revise_plan'"),
  feishuTaskDetachesAfterCanonicalCreation: server.includes('accepted: true, detached: true, task_id: task.id')
    && server.includes('retainDispatchAfterResponse = true')
    && server.includes('开发 Agent 与 TestAgent 将在后台按顺序执行'),
  feishuTaskFinalResultUsesBoundOutbox: server.includes('bindFeishuTaskContext({')
    && server.includes('await notifyFeishuTaskStage({')
    && server.includes('dedupeKey: `project-main:${task.id}:${execution.status}`')
    && server.includes('persistTaskMessage(execution.summary, latestTaskExperience)'),
}

for (const [name, pass] of Object.entries(checks)) console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`)
if (!Object.values(checks).every(Boolean)) process.exit(1)
console.log(`Project main Agent orchestration self-test passed (${Object.keys(checks).length} checks).`)
