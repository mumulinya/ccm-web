import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const taskService = read('backend/modules/collaboration/collaboration-task-service.ts')
const taskRoutes = read('backend/modules/collaboration/collaboration-routes.ts')
const queueRuntime = read('backend/modules/collaboration/collaboration-runtime-coordinator-review.ts')
const acceptance = read('backend/modules/collaboration/collaboration-acceptance.ts')
const receipts = read('backend/modules/collaboration/agent-receipts.ts')
const projectMain = read('backend/modules/projects/project-main-agent.ts')
const server = read('backend/server.ts')
const scheduler = read('backend/system/unified-task-scheduler.ts')
const groupRoutes = read('backend/modules/collaboration/group-live-routes.ts')
const taskUi = read('frontend/src/components/tasks/useTaskManager.js')

const occurrenceCount = (text, pattern) => (text.match(pattern) || []).length
const collaborationSources = fs.readdirSync(path.join(root, 'backend/modules/collaboration'))
  .filter(name => name.endsWith('.ts'))
  .map(name => fs.readFileSync(path.join(root, 'backend/modules/collaboration', name), 'utf8'))
  .join('\n')

const checks = {
  everyNewTaskGetsV2Identity: taskService.includes('clientMessageId = suppliedClientMessageId')
    && taskService.includes('server_${crypto.randomUUID()}')
    && taskService.includes('intake_identity_checksum: intakeIdentity?.checksum || null'),
  textDedupeRemoved: !taskService.includes('5 分钟内已存在相同目标')
    && !taskService.includes('semanticGoal && !intakeIdentity'),
  exactAutomationSessions: taskService.includes('ensureProjectAutomationSession(')
    && taskService.includes('resolveWritableGroupChatSession(')
    && taskService.includes('queue_scope: task.queue_scope || task.queueScope || (taskGroupSessionId || taskProjectSessionId ? "conversation_serial" : "")'),
  dailyDevUsesStableIdentity: taskRoutes.includes('scope: "create-daily-dev"')
    && taskRoutes.includes('client_message_id: clientMessageId')
    && taskRoutes.includes('queue_scope: payload.queue_scope || payload.queueScope || "conversation_serial"')
    && taskUi.includes("clientMessageId: createTaskClientMessageId('daily-dev')"),
  projectMainActuallyScheduled: server.includes('scheduleUnifiedTaskOperation({')
    && server.includes('operation: () => executeProjectMainTask({')
    && server.includes('queueKey: `conversation:project:${project}:${exactProjectSessionId}`'),
  sharedWorkspaceMutationLock: queueRuntime.includes('withUnifiedWorkspaceMutationLane(')
    && server.includes('canonicalWorkspaceMutationLane(workDir')
    && scheduler.includes('workspaceTails'),
  terminalGateIsCentral: taskService.includes('validateTaskTerminalTransition(tasks[idx], updates)')
    && taskService.includes('ccm-task-terminal-decision-v2')
    && taskRoutes.includes('/api/tasks/acceptance'),
  noProductionFreeTextTerminalInference: occurrenceCount(collaborationSources, /checkTaskFailure\(/g) === 1
    && occurrenceCount(collaborationSources, /checkTaskCompletion\(/g) === 1
    && acceptance.includes('missing_receipt: true')
    && receipts.includes('status: "missing_receipt"'),
  legacyDecomposeUsesCanonicalQueue: groupRoutes.includes('request_origin: "legacy-group-decompose"')
    && groupRoutes.includes('queue_scope: "conversation_serial"')
    && groupRoutes.includes('enqueueTask(task.id, ctx)'),
  interruptedQueuedProjectTaskFailsClosed: projectMain.includes('["queued", "running"].includes(String(task?.scheduler_state?.state || ""))')
    && projectMain.includes('acceptance_state: "recovery_required"'),
}

const failures = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name)
console.log(JSON.stringify({
  schema: 'ccm-automatic-development-unified-task-v2-audit',
  pass: failures.length === 0,
  checks,
  failures,
  paidProviderCalls: 0,
}, null, 2))
if (failures.length) process.exitCode = 1
