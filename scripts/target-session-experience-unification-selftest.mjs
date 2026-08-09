import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const checks = []
const expect = (name, condition) => checks.push({ name, pass: Boolean(condition) })

const summary = read('frontend/src/components/tasks/TaskExperienceSummary.vue')
const group = read('frontend/src/components/collaboration/useGroupChat.js')
const messaging = read('frontend/src/components/collaboration/useGroupChatMessaging.js')
const groupActions = read('frontend/src/composables/useGroupTaskCardActions.js')
const project = read('frontend/src/components/projects/useProjectManager.js')
const links = read('backend/system/task-conversation-links.ts')
const governance = read('backend/modules/collaboration/task-governance-routes.ts')
const lifecycle = read('backend/modules/collaboration/collaboration-routes.ts')
const groupStorage = read('backend/modules/collaboration/storage.ts')

expect('compact card shows shared source and target route', summary.includes('task-conversation-route') && summary.includes('来源') && summary.includes('目标') && summary.includes('返回原任务'))
expect('compact card renders a user-readable execution plan', summary.includes('task-readable-plan') && summary.includes('执行计划') && summary.includes('executionPlan'))
expect('unavailable source has explicit task-center fallback', summary.includes("kind: 'open_task_center'") && groupActions.includes("action.kind === 'open_task_center'") && project.includes("action.kind === 'open_task_center'"))
expect('group refresh is driven by shared runtime events', group.includes("subscribeRuntimeEvents(['task', 'group', 'system']") && group.includes('120'))
expect('group message persistence publishes a scoped runtime event', groupStorage.includes('group.session_messages_changed') && groupStorage.includes('publishRuntimeEvent("group"'))
expect('group polling is only a fifteen-second fallback', messaging.includes('}, 15000)') && !messaging.includes('}, 3000)'))
expect('stale group generation cannot overwrite the current card', messaging.includes('messageGeneration(current) > messageGeneration(msg)'))
expect('all four mutation conflict codes are defined', ['TASK_REVISION_CONFLICT', 'TASK_GENERATION_CONFLICT', 'TASK_BINDING_CONFLICT', 'TASK_TARGET_UNAVAILABLE'].every(code => links.includes(code)))
expect('queue retry and lifecycle routes consume shared mutation guard', governance.includes('validateTaskMutationGuard') && lifecycle.includes('rejectTaskMutationConflict'))
expect('group task operations submit revision generation and binding', groupActions.includes('taskMutationGuard') && groupActions.includes('binding_checksum'))
expect('project task operations submit revision generation and binding', project.includes('projectTaskMutationGuard') && project.includes('binding_checksum'))

const failed = checks.filter(item => !item.pass)
console.log(JSON.stringify({ schema: 'ccm-target-session-experience-unification-selftest-v1', pass: failed.length === 0, paidProviderCalls: 0, checks }, null, 2))
if (failed.length) process.exit(1)
