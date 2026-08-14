import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { runPrePlanClarificationSelfTest, buildPrePlanClarification, formatPrePlanAnswers } from '../ccm-package/dist/agents/pre-plan-clarification.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const component = fs.readFileSync(path.join(root, 'frontend/src/components/common/PrePlanClarificationDock.vue'), 'utf8')
const projectTemplate = fs.readFileSync(path.join(root, 'frontend/src/components/projects/ProjectManager.template.html'), 'utf8')
const groupTemplate = fs.readFileSync(path.join(root, 'frontend/src/components/collaboration/GroupChat.template.html'), 'utf8')
const globalPage = fs.readFileSync(path.join(root, 'frontend/src/components/global/GlobalAgent.vue'), 'utf8')

const unit = runPrePlanClarificationSelfTest()
const projection = buildPrePlanClarification({
  scope: 'group', scopeId: 'demo', exactSessionId: 'gcs_demo', anchorMessageId: 'm1',
  questions: [{ id: 'flow', label: '退款审核方式', type: 'single', required: true, options: [{ id: 'manual', label: '人工审核', safeDefault: true }, { id: 'auto', label: '自动通过' }] }],
})
const answer = formatPrePlanAnswers(projection, { flow: 'manual' }, '保留历史记录')
const checks = {
  coreProjection: unit.pass,
  safeDefault: projection.safeDefaultsAvailable === true,
  answerFormatting: answer.includes('人工审核') && answer.includes('保留历史记录'),
  sharedDock: /生成详细计划/.test(component) && /采用安全默认值/.test(component),
  projectWired: /PrePlanClarificationDock/.test(projectTemplate),
  groupWired: /PrePlanClarificationDock/.test(groupTemplate),
  globalWired: /PrePlanClarificationDock/.test(globalPage),
}
console.log(JSON.stringify({ pass: Object.values(checks).every(Boolean), checks }, null, 2))
if (!Object.values(checks).every(Boolean)) process.exit(1)

