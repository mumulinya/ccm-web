import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const checks = []
const expect = (name, condition) => checks.push({ name, pass: Boolean(condition) })

const missionSource = read('backend/modules/collaboration/collaboration-global-missions.ts')
const missionCreate = missionSource.slice(missionSource.indexOf('export function createGlobalDevelopmentMission'), missionSource.indexOf('\n\nexport ', missionSource.indexOf('export function createGlobalDevelopmentMission') + 20) || missionSource.length)
const taskService = read('backend/modules/collaboration/collaboration-task-service.ts')
const links = read('backend/system/task-conversation-links.ts')
const globalApi = read('backend/modules/global/global-agent-api.ts')
const routes = read('backend/modules/collaboration/collaboration-routes.ts')
const tracker = read('frontend/src/composables/useGlobalMissionTracking.js')
const globalActions = read('frontend/src/composables/useGlobalAgentActions.js')
const groupActions = read('frontend/src/composables/useGroupTaskCardActions.js')
const projectManager = read('frontend/src/components/projects/useProjectManager.js')

expect('global mission no longer pre-creates target sessions', !missionCreate.includes('resolveWritableGroupChatSession(') && !missionCreate.includes('ensureProjectAutomationSession('))
expect('central task service resolves automation binding once', taskService.includes('resolveAutomationSessionBinding({') && taskService.includes('automation_session_binding_snapshot: bindingResolution?.snapshot'))
expect('global source and target refs are persisted', missionCreate.includes('source_conversation_ref: sourceConversationRef') && missionCreate.includes('target_conversation_ref:'))
expect('group and project intake messages use effective bound session', missionCreate.includes('child.group_session_id') && missionCreate.includes('child.project_session_id') && missionCreate.includes('global-task-queued-${child.id}'))
expect('safe link contract is body free', links.includes('ccm-task-conversation-link-v1') && links.includes('contentStored: false') && !links.includes('nativeSessionId'))
expect('generic conversation links API exists', routes.includes('/conversation-links$/') && routes.includes('buildTaskConversationLinks(taskId)'))
expect('global mission API returns navigation delivery and revision', ['navigation', 'delivery', 'projectionRevision'].every(token => globalApi.includes(token)))
expect('runtime task events are primary refresh signal', tracker.includes("subscribeRuntimeEvents(['task']") && tracker.includes("event?.type !== 'task.changed'"))
expect('polling is fifteen second fallback', tracker.includes('options.pollInterval || 15000'))
expect('terminal state updates original card only', !tracker.includes('upsertGlobalMissionConversationNotification('))
expect('global target opens exact automation session', globalActions.includes("action.kind === 'open_target_session'") && globalActions.includes('groupSessionId: link.exactSessionId'))
expect('group target can return to global source', groupActions.includes("action.kind === 'open_source_session'") && groupActions.includes("tab: 'global-agent'"))
expect('project target can return to global source', projectManager.includes("action.kind === 'open_source_session'") && projectManager.includes("emit('switch-tab', 'global-agent')"))
expect('recovery required offers reconcile and takeover', groupActions.includes("action.kind === 'reconcile_delivery'") && groupActions.includes("action.kind === 'takeover'"))

const failed = checks.filter(check => !check.pass)
console.log(JSON.stringify({ schema: 'ccm-global-task-conversation-closure-selftest-v1', pass: failed.length === 0, paidProviderCalls: 0, checks }, null, 2))
if (failed.length) process.exit(1)
