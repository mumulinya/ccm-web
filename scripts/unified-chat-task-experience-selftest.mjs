import assert from 'node:assert/strict'
import {
  globalAgentRunTaskCard,
  globalMissionTaskCard,
  projectExecutionTaskCard,
  taskPhasePresentation,
} from '../frontend/src/utils/taskExperience.js'

const checks = {}

const ordinaryGlobal = globalAgentRunTaskCard({
  role: 'assistant',
  content: '这是一个普通回答',
  agenticRun: {
    id: 'run_question',
    status: 'completed',
    tool_calls: 0,
    decision_summary: { intent: { category: 'question', confidence: 0.96 } },
  },
})
checks.globalOrdinaryQuestionStaysDirect = ordinaryGlobal === null

const missionCard = globalMissionTaskCard({
  role: 'assistant',
  type: 'global_mission',
  globalMission: {
    id: 'mission_demo',
    title: '跨项目支付改造',
    status: 'in_progress',
    business_goal: '让前后端支付链路可用',
    mission_summary: { total: 2, passed: 1, blocked: 0 },
  },
  globalMissionChildren: [
    { task: { id: 'task_api', status: 'done', target_project: 'api' }, target: { type: 'project', name: 'api' } },
    { task: { id: 'task_web', status: 'in_progress', target_project: 'web' }, target: { type: 'project', name: 'web' } },
  ],
})
checks.globalMissionUsesUnifiedCard = missionCard?.version === 1 && missionCard?.phase === 'executing' && missionCard?.agents?.length === 2
checks.globalMissionTechnicalCollapsedDataOnly = !!missionCard?.technical?.execution_ids?.includes('task_api')
checks.globalMissionHasCancelAction = missionCard?.actions?.some(action => action.kind === 'cancel')
const pausedMissionCard = globalMissionTaskCard({
  role: 'assistant',
  type: 'global_mission',
  globalMission: { id: 'mission_paused', title: '暂停任务', status: 'in_progress', mission_summary: { total: 1, passed: 0 } },
  globalMissionSupervisor: { id: 'gms_paused', status: 'paused' },
  globalMissionChildren: [{ task: { id: 'task_wait', status: 'pending', target_project: 'web' }, target: { type: 'project', name: 'web' } }],
})
checks.pausedGlobalMissionShowsResume = pausedMissionCard?.phase === 'needs_user' && pausedMissionCard?.actions?.some(action => action.kind === 'resume')

const projectOrdinary = projectExecutionTaskCard({
  role: 'assistant',
  content: '这个项目使用 Vue 和 Node。',
  streaming: false,
  workEvents: [{ kind: 'done', text: '回答完成' }],
}, 'demo')
checks.projectOrdinaryQuestionStaysDirect = projectOrdinary === null

const projectCard = projectExecutionTaskCard({
  role: 'assistant',
  requestText: '给登录页加 loading',
  streaming: false,
  task_id: 'pchat_demo',
  taskExperience: {
    task_id: 'pchat_demo',
    phase: 'completed',
    status: 'done',
    rollback_available: true,
    trace_id: 'project_chat_demo',
    requires_card: true,
  },
  projectRun: { id: 'pchat_demo', trace_id: 'project_chat_demo', parent_run_id: 'pchat_parent' },
  workEvents: [{ kind: 'done', text: '项目 Agent 已完成' }],
  fileChanges: { count: 1, files: [{ path: 'src/Login.vue', statusText: '修改' }] },
}, 'demo')
checks.projectExecutionUsesUnifiedCard = projectCard?.version === 1 && projectCard?.phase === 'completed' && projectCard?.delivery?.files?.includes('src/Login.vue')
checks.projectExecutionHasSafeActions = ['view_changes', 'continue', 'rollback'].every(kind => projectCard?.actions?.some(action => action.kind === kind))
checks.projectContinuationIdentityIsTraceable = projectCard?.technical?.run_id === 'pchat_demo' && projectCard?.technical?.parent_run_id === 'pchat_parent'

checks.naturalPhaseLabels = taskPhasePresentation('waiting_confirmation').label === '需要你确认'

assert.equal(Object.values(checks).every(Boolean), true, JSON.stringify(checks, null, 2))
console.log(JSON.stringify({ success: true, checks }, null, 2))
