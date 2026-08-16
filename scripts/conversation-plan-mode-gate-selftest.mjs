import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ccm-conversation-plan-mode-'))
process.env.CCM_TASK_STORE_DIR = tmp

const require = createRequire(import.meta.url)
const gate = require(path.join(repoRoot, 'ccm-package/dist/system/conversation-plan-mode-gate.js'))
const session = require(path.join(repoRoot, 'ccm-package/dist/system/slash-command-session-state.js'))
const globalPlan = require(path.join(repoRoot, 'ccm-package/dist/agents/global/global-agent-plan-mode.js'))
const intake = require(path.join(repoRoot, 'ccm-package/dist/modules/collaboration/collaboration-task-intake.js'))
const backlog = require(path.join(repoRoot, 'ccm-package/dist/modules/collaboration/daily-dev-backlog.js'))

const builtIn = gate.runConversationPlanModeGateSelfTest()
assert.equal(builtIn.pass, true, JSON.stringify(builtIn.checks, null, 2))
const globalBuiltIn = globalPlan.runGlobalAgentPlanModeSelfTest()
assert.equal(globalBuiltIn.pass, true, JSON.stringify(globalBuiltIn.checks, null, 2))

fs.writeFileSync(path.join(tmp, 'slash-command-conversation-state.json'), JSON.stringify({
  sessions: {
    'group:g1:gcs_1': { revision: 1, generation: 0, planMode: { enabled: true, planId: 'p-group' } },
    'project:api:ps_1': { revision: 1, generation: 0, planMode: { enabled: true, planId: 'p-project' } },
    'global:global:sess_1': { revision: 1, generation: 0, planMode: { enabled: true, planId: 'p-global' } },
  },
}, null, 2))

const groupExit = gate.exitConversationPlanModeForTask({ group_id: 'g1', group_session_id: 'gcs_1', target_project: 'api', project_session_id: 'ps_ignored' })
assert.equal(groupExit.exited, true, '群聊确认应退出该会话 Plan')
assert.equal(session.readSlashCommandSessionState('group', 'g1', 'gcs_1').planMode.enabled, false)
assert.equal(session.readSlashCommandSessionState('project', 'api', 'ps_1').planMode.enabled, true, '不得误关其他会话 Plan')

const projectExit = gate.exitConversationPlanModeForTask({ target_project: 'api', project_session_id: 'ps_1' })
assert.equal(projectExit.exited, true)
assert.equal(session.readSlashCommandSessionState('project', 'api', 'ps_1').planMode.enabled, false)

const globalExit = gate.exitConversationPlanModeForTask({ orchestration_scope: 'global', session_id: 'sess_1' })
assert.equal(globalExit.exited, true)
assert.equal(session.readSlashCommandSessionState('global', 'global', 'sess_1').planMode.enabled, false)

const accepted = intake.buildAcceptedPlanModeDraft({
  title: '登录修复方案',
  steps: [{ id: 's1', label: '改登录校验', detail: '只改 auth.ts' }],
  read_only_exploration: { summary: '已读 auth.ts' },
  impact_scope: { projects: ['api'], areas: ['登录'] },
}, '', '2026-08-15T00:00:00.000Z')
assert.equal(accepted.confirmation_status, 'confirmed')
assert.equal(accepted.requires_confirmation, false)
assert.equal(accepted.steps[0].label, '改登录校验')
const workOrder = backlog.buildDailyDevTaskDescription({
  business_goal: '修复登录过期后无法恢复会话',
  plan_mode: accepted,
  requires_code_changes: true,
})
assert.match(workOrder, /已确认执行步骤/)
assert.match(workOrder, /改登录校验/)
assert.equal(workOrder.includes('buildGroupPlanModePreflight'), false)

const read = relative => fs.readFileSync(path.join(repoRoot, relative), 'utf8')
const groupLoop = read('backend/modules/collaboration/group-orchestrator-llm.ts')
const projectLoop = read('backend/modules/projects/project-main-agent.ts')
const confirmRoutes = read('backend/modules/collaboration/collaboration-routes.ts')
const agentMode = read('frontend/src/components/common/ConversationAgentMode.vue')
const planPanel = read('frontend/src/components/common/PlanConfirmationPanel.vue')
const taskCard = read('frontend/src/components/tasks/TaskExperienceCard.template.html')

const nativeLoop = read('backend/agents/native-query-loop.ts')
const prompts = read('backend/modules/collaboration/group-orchestrator-prompts.ts')
const projectMessages = read('backend/modules/projects/project-native-messages.ts')
const globalProjection = read('backend/agents/global/global-agent-run-projection.ts')
const slashState = read('backend/system/slash-command-session-state.ts')
assert.match(nativeLoop, /applyConversationPlanModeToRound/)
assert.match(nativeLoop, /PRESENTED_PLAN_SHAPE_GUIDANCE/)
assert.match(nativeLoop, /PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE/)
assert.match(groupLoop, /applyConversationPlanModeToRound/)
assert.match(groupLoop, /runGroupMainNativeQueryLoop/)
assert.match(groupLoop, /第一次为当前需求出实现计划/)
assert.match(groupLoop, /展开或重述已有计划稿不要再读项目文件/)
assert.match(groupLoop, /PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE/)
assert.match(groupLoop, /写明落实了哪些已确认计划卡切片/)
assert.match(groupLoop, /即使未点名具体项目/)
assert.equal(groupLoop.includes("即使未明确前端/后端/具体项目"), false)
assert.match(prompts, /PRESENTED_PLAN_SHAPE_GUIDANCE/)
assert.match(prompts, /PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE/)
assert.match(prompts, /第一次为当前需求出实现计划/)
assert.match(prompts, /展开或重述已有计划稿时不要再读项目文件/)
assert.match(projectMessages, /PRESENTED_PLAN_SHAPE_GUIDANCE/)
assert.match(projectMessages, /PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE/)
assert.match(projectMessages, /第一次为当前需求出实现计划/)
assert.match(projectMessages, /展开或重述计划不是派发授权/)
assert.match(projectLoop, /PRESENTED_PLAN_SHAPE_GUIDANCE/)
assert.match(projectLoop, /PRESENTED_PLAN_DISPATCH_HANDOFF_GUIDANCE/)
assert.match(globalProjection, /PRESENTED_PLAN_SHAPE_GUIDANCE/)
assert.match(slashState, /必须调用 ccm_present_plan 出卡/)
assert.match(slashState, /不得派发写任务/)
assert.match(projectLoop, /applyConversationPlanModeToRound/)
assert.match(projectLoop, /runProjectMainNativeQueryLoop/)
assert.match(projectLoop, /applyConversationPlanModeHold\("project"/)
assert.match(confirmRoutes, /exitConversationPlanModeForTask\(task\)/)
assert.match(confirmRoutes, /exitConversationPlanModeForTask\(updatedEpic\)/)
assert.match(agentMode, /确认并执行后会自动切回 Agent/)
assert.match(agentMode, /这是安全闸，不是 Plan 模式/)
assert.equal(agentMode.includes('确认计划并切回 Agent 模式后，才会启动项目子 Agent'), false)
assert.match(planPanel, /查看并修改计划/)
assert.match(planPanel, /需要你确认后才执行/)
assert.match(planPanel, /确认并执行/)
assert.match(taskCard, /canEditPlanSteps/)
assert.match(taskCard, /open_plan_detail/)

const confirmUtil = read('frontend/src/utils/presentedPlanConfirmExecute.js')
const confirmComposable = read('frontend/src/composables/usePresentedPlanConfirmExecute.js')
const presentedCard = read('frontend/src/components/agents/AgentExecutionMessage.vue')
assert.match(confirmUtil, /action: 'exit'/)
assert.match(confirmComposable, /exitConversationPlanMode/)
assert.match(confirmComposable, /queueTurn/)
assert.ok(
  confirmComposable.slice(confirmComposable.indexOf('const confirmExecute')).indexOf('exitConversationPlanMode')
    < confirmComposable.slice(confirmComposable.indexOf('const confirmExecute')).indexOf('queueTurn'),
  '聊天计划卡确认必须先退出 Plan Mode 再发执行授权',
)
assert.match(presentedCard, /确认并执行/)
assert.equal(presentedCard.includes('Build'), false)
assert.equal(confirmUtil.includes('Build'), false)

console.log('conversation-plan-mode-gate selftest passed')
