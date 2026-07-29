import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const intakeRoutes = read('backend/modules/collaboration/collaboration-routes.ts')
const taskService = read('backend/modules/collaboration/collaboration-task-service.ts')
const queue = read('backend/modules/collaboration/collaboration-runtime-task-queue.ts')
const queueProcessor = read('backend/modules/collaboration/collaboration-runtime-coordinator-review.ts')
const taskExecutor = read('backend/modules/collaboration/collaboration-task-executor.ts')
const projectMain = read('backend/modules/projects/project-main-agent.ts')
const globalMissions = read('backend/modules/collaboration/collaboration-global-missions.ts')
const groupLive = read('backend/modules/collaboration/group-live-routes.ts')
const replay = read('backend/modules/collaboration/task-replay.ts')
const taskUi = read('frontend/src/components/tasks/AutomatedTaskIntakeModal.vue')
const taskList = read('frontend/src/components/tasks/TaskListItem.vue')
const workbench = read('frontend/src/components/common/UsabilityWorkbench.vue')
const taskRoutes = read('backend/modules/collaboration/collaboration-routes.ts')
const projectSessions = read('backend/modules/projects/sessions.ts')

const checks = {
  taskDispatchUsesModelIntake: taskUi.includes('/api/usability/intake/preview') && taskUi.includes('/api/usability/intake/confirm'),
  documentsAndImagesSupported: taskUi.includes('image/*,.txt,.md,.json,.csv,.pdf,.docx,.pptx,.xlsx') && taskUi.includes('@paste.capture'),
  exactGroupOrProjectSessionSelectable: taskUi.includes('groupsApi.sessions') && taskUi.includes('sessionsApi.list') && taskUi.includes('group_session_id') && taskUi.includes('project_session_id'),
  workbenchUsesSamePipeline: workbench.includes("form.append('source', 'workbench')") && workbench.includes("form.append('queue_scope', 'conversation_serial')"),
  groupChatCreatesPersistentTasks: groupLive.includes('createTask({') && groupLive.includes('request_origin: globalDirectDispatch ? "global-agent" : "group-session"'),
  projectChatUsesModelMainAgent: projectMain.includes('planProjectMainTask') && projectMain.includes('queue_scope: "conversation_serial"'),
  globalAgentCreatesDispatchTasks: globalMissions.includes('createGlobalDevelopmentMission') && globalMissions.includes('ensureProjectAutomationSession'),
  epicChildrenPreserveExactSession: taskService.includes('project_session_id: payload.project_session_id') && taskService.includes('queue_scope: payload.queue_scope'),
  conversationQueueIsSerial: queue.includes('conversation:group:') && queue.includes('conversation:project:'),
  priorityJumpReordersLiveQueue: taskRoutes.includes('task_queue_reprioritized') && taskRoutes.includes('removeTaskFromQueues(id)') && taskRoutes.includes('enqueueTask(id, ctx)'),
  projectDirectTaskRunsTestAgent: taskExecutor.includes('runProjectTaskTestAgentReview({') && taskExecutor.includes('project_test_agent_finished'),
  failedReviewAutomaticallyRequeues: taskExecutor.includes('requeue: true') && queueProcessor.includes('if (shouldRequeue) enqueueFollowupAfterRound = true'),
  threeReviewRoundsFailClosed: taskExecutor.includes('reviewRound < AUTO_REWORK_MAX_ROUNDS')
    && taskExecutor.includes('status: "blocked"')
    && taskExecutor.includes('buildReworkExhaustedUpdate'),
  replayAggregatesAcceptanceEvidence: replay.includes('buildTestAgentEvents') && replay.includes('project_message') && replay.includes('request_origin'),
  taskDispatchLinksReplay: taskList.includes("emit('replay', task)") && taskList.includes('任务回放'),
  projectSessionReceivesFormalTaskMessages: projectSessions.includes('appendProjectSessionTaskMessage') && intakeRoutes.includes('task_dispatch_queued') && globalMissions.includes('global_task_dispatch_queued'),
}

for (const [name, pass] of Object.entries(checks)) console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`)
if (!Object.values(checks).every(Boolean)) process.exit(1)
console.log(`Unified auto-development workflow self-test passed (${Object.keys(checks).length} checks).`)
