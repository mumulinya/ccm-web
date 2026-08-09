import { createApp } from 'vue/dist/vue.esm-bundler.js'
import AgentExecutionTranscript from '../src/components/common/AgentExecutionTranscript.vue'
import ConversationProcessingState from '../src/components/common/ConversationProcessingState.vue'

const at = offset => new Date(Date.UTC(2026, 7, 9, 10, 0, offset)).toISOString()
const base = { schema:'ccm-user-visible-agent-event-v1', scope:'project', scopeId:'demo', exactSessionId:'session-demo', generation:1, contentStored:false, visibility:'default' }
const rows = [
  { ...base, eventId:'turn', sequence:1, eventType:'turn_started', display:{ title:'项目主 Agent', summary:'正在准备上下文', status:'running' }, createdAt:at(1) },
  { ...base, eventId:'thinking', sequence:2, eventType:'thinking_status', display:{ title:'正在思考', summary:'正在核对验收条件', status:'running', durationMs:800 }, createdAt:at(2) },
  { ...base, eventId:'tool-start', sequence:3, eventType:'tool_started', toolCallId:'definition', display:{ title:'Find definition', target:'executeFeature', summary:'正在查找', status:'running' }, createdAt:at(3), detail:{ safeArguments:{ symbol:'executeFeature' } } },
  { ...base, eventId:'tool-done', sequence:4, eventType:'tool_completed', toolCallId:'definition', display:{ title:'Find definition', target:'src/feature.ts:12', summary:'找到 1 个定义', status:'success', durationMs:1250 }, createdAt:at(4), detail:{ safeResult:{ locations:[{ path:'src/feature.ts', line:12 }], contentStored:false } } },
  { ...base, eventId:'worker-start', sequence:5, eventType:'agent_started', taskId:'fixture-task', workItemId:'worker', display:{ title:'Codex', summary:'正在执行', status:'running' }, createdAt:at(5) },
  { ...base, eventId:'worker-result', sequence:6, eventType:'agent_progress', taskId:'fixture-task', workItemId:'worker', display:{ title:'Codex', summary:'已提交结果，等待 CCM 验收', status:'waiting', toolUseCount:4, tokenCount:1820 }, createdAt:at(6) },
  { ...base, eventId:'worker-terminal', sequence:7, eventType:'agent_completed', taskId:'fixture-task', workItemId:'worker', display:{ title:'Codex', summary:'CCM 已完成终态验收', status:'success', durationMs:9300 }, createdAt:at(7), detail:{ fileChanges:[{ path:'src/feature.ts' }], evidenceIds:['evidence-worker'] } },
  { ...base, eventId:'test-terminal', sequence:8, eventType:'agent_completed', taskId:'fixture-task', workItemId:'test', display:{ title:'TestAgent', summary:'独立验收通过', status:'success', durationMs:4200 }, createdAt:at(8), detail:{ evidenceIds:['evidence-test'] } },
  { ...base, eventId:'result', sequence:9, eventType:'result', taskId:'fixture-task', display:{ title:'任务已完成', summary:'代码修改和独立验收均已通过', status:'success', toolUseCount:5, tokenCount:2480, durationMs:16800 }, createdAt:at(9), detail:{ safeResult:{ status:'success', contentStored:false }, usage:{ inputTokens:1940, outputTokens:540 } } },
]
const messages = [
  { role:'user', content:'完成这个功能', timestamp:at(0) },
  { role:'assistant', content:'代码修改和独立验收均已通过。', timestamp:at(10), taskId:'fixture-task' },
]
const conversationRows = [
  { ...base, eventId:'conversation-turn', sequence:1, eventType:'turn_started', display:{ title:'项目主 Agent', summary:'已开始处理', status:'running' }, createdAt:at(21) },
  { ...base, eventId:'conversation-thinking', sequence:2, eventType:'thinking_status', display:{ title:'正在思考', summary:'正在组织回复', status:'running', durationMs:500 }, createdAt:at(22) },
  { ...base, eventId:'conversation-result', sequence:3, eventType:'result', display:{ title:'回复完成', summary:'普通对话已完成', status:'success', toolUseCount:0, tokenCount:180 }, createdAt:at(23) },
]
const conversationMessages = [
  { role:'user', content:'你觉得这个项目怎么样', timestamp:at(20) },
  { role:'assistant', content:'整体方向不错。', timestamp:at(24) },
]

createApp({
  components:{ AgentExecutionTranscript, ConversationProcessingState },
  data:() => ({ rows, messages, conversationRows, conversationMessages }),
  template:`<main><h1 class="fixture-title">项目会话</h1><section class="message pending-message"><ConversationProcessingState compact title="正在思考…" detail="" /></section><section class="message ordinary-message"><AgentExecutionTranscript :events="conversationRows" :messages="conversationMessages" :message-index="1" /><p class="answer">整体方向不错。</p></section><section class="message task-message"><AgentExecutionTranscript :events="rows" :messages="messages" :message-index="1" /><p class="answer">代码修改和独立验收均已通过。</p></section></main>`,
}).mount('#app')
