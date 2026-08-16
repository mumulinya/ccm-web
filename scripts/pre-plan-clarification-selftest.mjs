import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runPrePlanClarificationSelfTest, buildPrePlanClarification, formatPrePlanAnswers, buildConversationClarificationSummary } from '../ccm-package/dist/agents/pre-plan-clarification.js'
import { runClarificationTurnSelfTest } from '../ccm-package/dist/agents/clarification-turn.js'
import { runGroupClarificationAttachSelfTest } from '../ccm-package/dist/modules/collaboration/group-clarification-attach.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const component = read('frontend/src/components/common/PrePlanClarificationDock.vue')
const projectTemplate = read('frontend/src/components/projects/ProjectManager.template.html')
const groupTemplate = read('frontend/src/components/collaboration/GroupChat.template.html')
const globalPage = read('frontend/src/components/global/GlobalAgent.vue')
const globalMessages = read('frontend/src/components/global/GlobalAgentMessageList.vue')
const inlineCards = read('frontend/src/components/common/ConversationClarificationCards.vue')
const execMsg = read('frontend/src/components/agents/AgentExecutionMessage.vue')
const projectManager = read('frontend/src/components/projects/useProjectManager.js')
const groupLive = read('backend/modules/collaboration/group-live-routes.ts')
const streamIdx = globalMessages.indexOf("msg.type === 'global_stream'")
const managementIdx = globalMessages.indexOf("msg.type === 'management_action'")
const streamCardIdx = globalMessages.indexOf('ConversationClarificationCards', streamIdx)

const unit = runPrePlanClarificationSelfTest()
const turn = runClarificationTurnSelfTest()
const attach = runGroupClarificationAttachSelfTest()
const projection = buildPrePlanClarification({
  scope: 'group', scopeId: 'demo', exactSessionId: 'gcs_demo', anchorMessageId: 'm1',
  questions: [{ id: 'flow', label: '退款审核方式', type: 'single', required: true, options: [{ id: 'manual', label: '人工审核', safeDefault: true }, { id: 'auto', label: '自动通过' }] }],
})
const wrapped = buildConversationClarificationSummary({
  schema: 'ccm-project-main-agent-clarification-summary-v1',
  question: '先确认履约方式',
  prePlanClarification: projection,
})
const answer = formatPrePlanAnswers(projection, { flow: 'manual' }, '保留历史记录')
const checks = {
  coreProjection: unit.pass,
  clarificationTurn: turn.pass,
  groupAttach: attach.pass,
  wrappedSummary: wrapped.status === 'waiting_user' && wrapped.prePlanClarification?.id === projection.id,
  safeDefault: projection.safeDefaultsAvailable === true,
  otherOption: projection.questions[0]?.options?.some(option => option.id === 'other' && option.label === '其他'),
  answerFormatting: answer.includes('人工审核') && answer.includes('保留历史记录'),
  sharedDock: /生成详细计划/.test(component) && /采用安全默认值/.test(component) && /AskUserQuestionCards/.test(component),
  projectWired: /PrePlanClarificationDock/.test(projectTemplate),
  groupWired: /PrePlanClarificationDock/.test(groupTemplate),
  globalWired: /PrePlanClarificationDock/.test(globalPage),
  globalStreamRendersCards: streamIdx >= 0 && managementIdx > streamIdx && streamCardIdx > streamIdx && streamCardIdx < managementIdx,
  inlineCardsShowPending: /structuredStatus === 'pending'\) return true/.test(inlineCards),
  groupInlinePendingNotGated: /structured\?\.status === 'pending'\) return true/.test(execMsg)
    && !/purpose \|\| ''\)\.toLowerCase\(\) === 'mid_turn'/.test(execMsg),
  projectCopiesClarificationSummary: /clarification_summary/.test(projectManager) && /pre_plan_clarification/.test(projectManager),
  groupLiveUsesAttachHelper: /resolveGroupLiveDispatchPolicy/.test(groupLive),
}
console.log(JSON.stringify({ pass: Object.values(checks).every(Boolean), checks, attach: attach.checks, turn: turn.checks }, null, 2))
if (!Object.values(checks).every(Boolean)) process.exit(1)
