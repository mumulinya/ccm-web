#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const confirm = await import(pathToFileURL(path.join(root, 'frontend/src/utils/presentedPlanConfirmExecute.js')).href)

const plan = {
  title: '预约排队',
  overview: '占住资源后才能核销；超时释放。',
  steps: [{ title: '占住资源' }, { title: '核销改状态' }, { title: '超时释放' }],
}

assert.equal(confirm.PRESENTED_PLAN_CONFIRM_EXECUTE_LABEL, '确认并执行')
const message = confirm.buildPresentedPlanConfirmExecuteMessage(plan)
assert.match(message, /用户已确认下面这份计划卡/)
assert.match(message, /授权按该计划开始执行/)
assert.match(message, /ccm_dispatch/)
assert.match(message, /不要重写成前端\/后端\/测试分工/)
assert.match(message, /不要把 TestAgent 放进 targets/)
assert.match(message, /【已确认计划】/)
assert.match(message, /占住资源/)
assert.equal(message.includes('Build'), false)

const older = { role: 'assistant', presentedPlan: { title: '旧卡', steps: [{ title: '旧切片' }] } }
const latest = { role: 'assistant', presentedPlan: plan }
const laterUser = { role: 'user', content: '改一下' }
assert.equal(confirm.isLatestUnansweredPresentedPlan([older, latest], latest), true)
assert.equal(confirm.isLatestUnansweredPresentedPlan([older, latest], older), false)
assert.equal(confirm.isLatestUnansweredPresentedPlan([older, latest, laterUser], latest), false)
assert.equal(confirm.presentedPlanFromMessage({ presentedPlan: { title: '空' } }), null)

const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const util = read('frontend/src/utils/presentedPlanConfirmExecute.js')
const composable = read('frontend/src/composables/usePresentedPlanConfirmExecute.js')
const messageCard = read('frontend/src/components/agents/AgentExecutionMessage.vue')
const transcript = read('frontend/src/components/common/AgentExecutionTranscript.vue')
const groupPanel = read('frontend/src/components/collaboration/GroupChatPanel.vue')
const groupTemplate = read('frontend/src/components/collaboration/GroupChat.template.html')
const projectPanel = read('frontend/src/components/projects/ProjectManagerPanel.vue')
const projectTemplate = read('frontend/src/components/projects/ProjectManager.template.html')
const globalAgent = read('frontend/src/components/global/GlobalAgent.vue')
const globalList = read('frontend/src/components/global/GlobalAgentMessageList.vue')
const planPanel = read('frontend/src/components/common/PlanConfirmationPanel.vue')
const taskCard = read('frontend/src/components/tasks/TaskExperienceCard.template.html')

assert.match(util, /action: 'exit'/)
assert.match(util, /\/api\/conversations\/plan-mode/)
assert.match(composable, /exitConversationPlanMode/)
assert.match(composable, /queueTurn/)
const confirmFn = composable.slice(composable.indexOf('const confirmExecute'), composable.indexOf('return {'))
assert.ok(confirmFn.indexOf('exitConversationPlanMode') < confirmFn.indexOf('queueTurn'), '确认并执行必须先退出 Plan Mode 再发用户转')
assert.match(composable, /planModeEnabled/)
assert.match(composable, /isLatestUnansweredPresentedPlan/)
assert.match(composable, /messageCardOwnsPlan/)

assert.match(messageCard, /确认并执行/)
assert.match(messageCard, /canConfirmExecute/)
assert.match(messageCard, /presented-plan-confirm/)
assert.equal(messageCard.includes('Build'), false)
assert.equal(messageCard.includes('查看并修改计划'), false)

assert.match(transcript, /确认并执行/)
assert.match(transcript, /canConfirmExecute/)
assert.match(transcript, /cc-requirement-plan-confirm/)
assert.equal(transcript.includes('Build'), false)

assert.match(groupPanel, /usePresentedPlanConfirmExecute/)
assert.match(groupPanel, /messageCardOwnsPlan: true/)
assert.match(groupTemplate, /canConfirmOnMessageCard\(msg\)/)
assert.match(groupTemplate, /canConfirmOnTranscript\(msg\)/)
assert.match(projectPanel, /usePresentedPlanConfirmExecute/)
assert.match(projectTemplate, /canConfirmOnTranscript\(msg\)/)
assert.match(globalAgent, /usePresentedPlanConfirmExecute/)
assert.match(globalList, /canConfirmPresentedPlan\(msg\)/)

assert.match(planPanel, /确认并执行/)
assert.match(taskCard, /canEditPlanSteps/)
assert.match(taskCard, /open_plan_detail/)

console.log('presented-plan-confirm-execute selftest: pass')
