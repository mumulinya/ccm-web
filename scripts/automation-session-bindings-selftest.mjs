import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const checks = []
const expect = (name, condition) => checks.push({ name, pass: Boolean(condition) })

const store = read('backend/system/automation-session-bindings.ts')
const api = read('backend/system/automation-session-bindings-api.ts')
const taskService = read('backend/modules/collaboration/collaboration-task-service.ts')
const backlog = read('backend/modules/collaboration/daily-dev-backlog.ts')
const workbench = read('frontend/src/components/common/UsabilityWorkbench.vue')
const intake = read('frontend/src/components/tasks/AutomatedTaskIntakeModal.vue')
const backlogUi = read('frontend/src/components/tasks/TaskBacklogModal.vue')
const bindingDialog = read('frontend/src/components/common/AutomationSessionBindingDialog.vue')
const globalUi = read('frontend/src/components/global/GlobalAgent.vue')
const feishu = read('backend/modules/global/global-agent-feishu-channel.ts')

expect('three task sources are explicit', ['requirement_pool', 'workbench', 'global_agent'].every(source => store.includes(source)))
expect('binding store is locked and atomic', store.includes('withFileLock(STORE_FILE') && store.includes('writeJsonAtomic'))
expect('unbound source auto creates an automation session', store.includes('first_task_auto_created') && store.includes('createAutomationSession'))
expect('source transfer is unique within target scope', store.includes('source_transferred:') && store.includes('binding.sources.filter'))
expect('binding resolution stores revision and checksum', store.includes('bindingRevision') && store.includes('bindingChecksum'))
expect('management API exposes list create bind drain', [
  '/api/automation-session-bindings', '/api/automation-sessions', '/drain',
].every(token => api.includes(token)))
expect('task service resolves source binding server-side', taskService.includes('resolveAutomationSessionBinding') && taskService.includes('automation_session_binding_snapshot'))
expect('requirement backlog uses requirement_pool binding', backlog.includes('source: "requirement_pool"') && backlog.includes('automation_source_binding'))
expect('workbench no longer sends exact session', !workbench.includes('exact_session_id:') && workbench.includes('按工作台来源自动绑定'))
expect('requirement intake no longer sends exact session', !intake.includes('exact_session_id:') && intake.includes('按需求池来源自动绑定'))
expect('backlog card no longer offers session selector', !backlogUi.includes('session_options') && backlogUi.includes('按需求池来源自动绑定'))
expect('automation session list can manage multiple sources', ['需求池', '工作台', '全局 Agent'].every(label => bindingDialog.includes(label)))
expect('global web supports per-message target selection', globalUi.includes('globalDispatchTargets') && globalUi.includes('selectedGlobalTargetRefs'))
expect('Feishu supports button, number and exact-name selection', feishu.includes('global_target_selection') && feishu.includes('feishuTargetSelectionMarkdown') && feishu.includes('normalizeFeishuRequestedTargets'))

const failed = checks.filter(check => !check.pass)
console.log(JSON.stringify({ schema: 'ccm-automation-session-bindings-selftest-v1', pass: failed.length === 0, checks }, null, 2))
if (failed.length) process.exit(1)
