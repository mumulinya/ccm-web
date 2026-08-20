import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  isDevelopmentTaskWorkflowDecision,
  normalizeWorkflowDecision,
} from '../ccm-package/dist/agents/workflow-decision.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const decision = value => normalizeWorkflowDecision({ reason: 'selftest', confidence: 0.99, ...value })
const cases = {
  answer: isDevelopmentTaskWorkflowDecision(decision({ actionRequired: false, requiresCodeChanges: false })) === false,
  readOnlyAnalysis: isDevelopmentTaskWorkflowDecision(decision({ actionRequired: false, requiresCodeChanges: false })) === false,
  commandWithoutWrite: isDevelopmentTaskWorkflowDecision(decision({ actionRequired: true, requiresCodeChanges: false })) === false,
  codeChange: isDevelopmentTaskWorkflowDecision(decision({ actionRequired: true, requiresCodeChanges: true })) === true,
  epicCodeChange: isDevelopmentTaskWorkflowDecision(decision({ actionRequired: true, requiresCodeChanges: true, needsEpicDecomposition: true })) === true,
}

const transcript = fs.readFileSync(path.join(root, 'frontend/src/components/common/AgentExecutionTranscript.vue'), 'utf8')
const projection = fs.readFileSync(path.join(root, 'frontend/src/utils/agentExecutionEvents.js'), 'utf8')
const ui = {
  queryProcess: transcript.includes("isQueryCompletion.value ? '查询过程' : '执行记录'"),
  noStartDevelopmentSuggestion: !transcript.includes("kind: 'start_development'") && !transcript.includes('>开始修改</button>'),
  noGenericIncompleteTaskCard: !transcript.includes('任务暂未完成') && !transcript.includes('cc-incomplete-terminal'),
  strictGate: projection.includes("gate?.passed === true"),
  replayTaskOnly: transcript.includes('isOfficialCompletion && transcriptExpanded && replayTarget'),
}

const success = Object.values(cases).every(Boolean) && Object.values(ui).every(Boolean)
console.log(JSON.stringify({ success, cases, ui }, null, 2))
if (!success) process.exitCode = 1
