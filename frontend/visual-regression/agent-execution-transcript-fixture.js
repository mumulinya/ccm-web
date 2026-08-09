import { createApp } from 'vue/dist/vue.esm-bundler.js'
import AgentExecutionTranscript from '../src/components/common/AgentExecutionTranscript.vue'
import ConversationProcessingState from '../src/components/common/ConversationProcessingState.vue'

const fixtureAnchor = Date.now() - 25_000
const at = offset => new Date(fixtureAnchor + (offset * 1000)).toISOString()
const base = { schema:'ccm-user-visible-agent-event-v1', scope:'project', scopeId:'demo', exactSessionId:'session-demo', generation:1, contentStored:false, visibility:'default' }
const rows = [
  { ...base, eventId:'turn', sequence:1, eventType:'turn_started', display:{ title:'项目主 Agent', summary:'正在准备上下文', status:'running' }, createdAt:at(1) },
  { ...base, eventId:'thinking', sequence:2, eventType:'thinking_status', display:{ title:'正在思考', summary:'正在核对验收条件', status:'running', durationMs:800 }, createdAt:at(2) },
  { ...base, eventId:'progress-before-tools', sequence:2.5, eventType:'assistant_progress', display:{ title:'项目主 Agent', summary:'我先定位相关代码和配置，再根据结果继续判断。', status:'running' }, createdAt:at(2), detail:{ progress:{ kind:'before_tools', text:'我先定位相关代码和配置，再根据结果继续判断。', modelCallIndex:1, relatedToolCallIds:['definition','references'], milestoneChecksum:'fixture-progress-1' } } },
  { ...base, eventId:'tool-start', sequence:3, eventType:'tool_started', toolCallId:'definition', parallelGroupId:'parallel-1', display:{ title:'Find definition', target:'executeFeature', summary:'正在查找', status:'running' }, createdAt:at(3), detail:{ safeArguments:{ symbol:'executeFeature' } } },
  { ...base, eventId:'tool-start-2', sequence:4, eventType:'tool_started', toolCallId:'references', parallelGroupId:'parallel-1', display:{ title:'Find references', target:'executeFeature', summary:'正在查找', status:'running' }, createdAt:at(3), detail:{ safeArguments:{ symbol:'executeFeature' } } },
  { ...base, eventId:'tool-done', sequence:5, eventType:'tool_completed', toolCallId:'definition', parallelGroupId:'parallel-1', display:{ title:'Find definition', target:'src/feature.ts:12', summary:'找到 1 个定义', status:'success', durationMs:1250, tokenCount:240, tokenType:'tool_output', tokenAccuracy:'estimated' }, createdAt:at(4), detail:{ safeResult:{ locations:[{ path:'src/feature.ts', line:12 }], contentStored:false } } },
  { ...base, eventId:'tool-done-2', sequence:6, eventType:'tool_completed', toolCallId:'references', parallelGroupId:'parallel-1', display:{ title:'Find references', target:'src/feature.test.ts:8', summary:'找到 2 个引用', status:'success', durationMs:900, tokenCount:180, tokenType:'tool_output', tokenAccuracy:'estimated' }, createdAt:at(4), detail:{ safeResult:{ locations:[{ path:'src/feature.test.ts', line:8 }], contentStored:false } } },
  { ...base, eventId:'progress-key-finding', sequence:6.5, eventType:'assistant_progress', display:{ title:'项目主 Agent', summary:'已经定位到实现入口，我继续交给项目 Agent 修改并等待独立验收。', status:'running' }, createdAt:at(4), detail:{ progress:{ kind:'key_finding', text:'已经定位到实现入口，我继续交给项目 Agent 修改并等待独立验收。', modelCallIndex:2, relatedToolCallIds:[], milestoneChecksum:'fixture-progress-2' } } },
  { ...base, eventId:'requirement-plan-initial', sequence:6.7, eventType:'requirement_plan', taskId:'fixture-task', display:{ title:'需求实施计划', summary:'完善后台管理端，让运营人员可以管理商家、商品和订单。', status:'running' }, createdAt:at(4.2), detail:{ requirementPlan:{ schema:'ccm-user-visible-requirement-plan-v1', planId:'fixture-task', revision:1, title:'需求实施计划', goal:'完善后台管理端，让运营人员可以管理商家、商品和订单，并保证前后端数据、权限和异常状态正确衔接。', steps:[
    { id:'step_1', title:'确认后台功能范围', description:'梳理现有商家、商品和订单功能，确认本次需要补充的部分。', outcome:'得到明确的功能清单和处理顺序', project:'smart-live-ui', dependsOn:[], status:'completed' },
    { id:'step_2', title:'完善后台管理页面', description:'补齐列表、详情、编辑和状态操作。', outcome:'后台页面覆盖主要管理场景', project:'smart-live-ui', dependsOn:['step_1'], status:'running' },
    { id:'step_3', title:'对接业务接口与权限', description:'连接现有后端能力并处理权限和失败提示。', outcome:'页面可以真实读取和更新业务数据', project:'smart-live-Cloud', dependsOn:['step_2'], status:'pending' },
    { id:'step_4', title:'独立测试并交付', description:'验证主要流程，未通过时返回原项目 Agent 修正。', outcome:'提供测试结论、修改文件和交付说明', project:'TestAgent', dependsOn:['step_3'], status:'pending' },
  ], scope:['后台管理页面','业务接口','权限与状态处理'], expectedResults:['运营人员可以管理商家、商品和订单','页面数据与后端业务状态保持一致','关键流程通过独立测试'], exclusions:['不执行生产发布或数据迁移'], status:'executing', createdAt:at(4.2), updatedAt:at(4.2), planChecksum:'fixture-plan-initial', contentStored:false } } },
  { ...base, eventId:'worker-start', agentRunId:'agent-run-worker', parallelGroupId:'agent-parallel-1', sequence:7, eventType:'agent_started', taskId:'fixture-task', workItemId:'worker', display:{ title:'smart-live-ui · Codex', target:'实现后台前端', summary:'正在执行', status:'running' }, createdAt:at(5), detail:{ agentDisplay:{ projectId:'smart-live-ui', projectName:'smart-live-ui', runtimeLabel:'Codex', workItemTitle:'实现后台前端', phase:'executing', attempt:1, isParallel:true } } },
  { ...base, eventId:'worker-result', agentRunId:'agent-run-worker', parallelGroupId:'agent-parallel-1', sequence:8, eventType:'agent_progress', taskId:'fixture-task', workItemId:'worker', display:{ title:'smart-live-ui · Codex', target:'实现后台前端', summary:'已提交结果，等待 CCM 验收', status:'waiting', toolUseCount:4, tokenCount:1820 }, createdAt:at(6), detail:{ agentDisplay:{ projectId:'smart-live-ui', projectName:'smart-live-ui', runtimeLabel:'Codex', workItemTitle:'实现后台前端', phase:'verifying', attempt:1, isParallel:true } } },
  { ...base, eventId:'worker-terminal', agentRunId:'agent-run-worker', parallelGroupId:'agent-parallel-1', sequence:9, eventType:'agent_completed', taskId:'fixture-task', workItemId:'worker', display:{ title:'smart-live-ui · Codex', target:'实现后台前端', summary:'CCM 已完成终态验收', status:'success', durationMs:9300 }, createdAt:at(7), detail:{ agentDisplay:{ projectId:'smart-live-ui', projectName:'smart-live-ui', runtimeLabel:'Codex', workItemTitle:'实现后台前端', phase:'completed', attempt:1, isParallel:true }, fileChanges:[{ path:'src/feature.ts' }], evidenceIds:['evidence-worker'] } },
  { ...base, eventId:'test-terminal', sequence:10, eventType:'agent_completed', taskId:'fixture-task', workItemId:'test', display:{ title:'TestAgent', summary:'独立验收通过', status:'success', durationMs:4200 }, createdAt:at(8), detail:{ evidenceIds:['evidence-test'] } },
  { ...base, eventId:'progress-before-summary', sequence:10.2, eventType:'assistant_progress', taskId:'fixture-task', display:{ title:'项目主 Agent', summary:'独立验收已经通过，我正在做最后的差异核对并整理交付总结。', status:'running' }, createdAt:at(8.1), detail:{ progress:{ kind:'before_summary', text:'独立验收已经通过，我正在做最后的差异核对并整理交付总结。', modelCallIndex:3, relatedToolCallIds:[], milestoneChecksum:'fixture-progress-summary' } } },
  { ...base, eventId:'main-summary-start', agentRunId:'main-summary-run', sequence:10.4, eventType:'agent_started', taskId:'fixture-task', workItemId:'main-summary', display:{ title:'项目主 Agent', target:'最终验收与交付总结', summary:'正在整理交付总结', status:'running' }, createdAt:at(8.2), detail:{ agentDisplay:{ projectId:'', projectName:'', runtimeLabel:'项目主 Agent', workItemTitle:'最终验收与交付总结', phase:'executing', attempt:1, isParallel:false }, executionStage:{ kind:'main_agent_summary', stageRunId:'main-summary', attempt:1, startedAt:at(8.2) } } },
  { ...base, eventId:'main-summary-complete', agentRunId:'main-summary-run', sequence:10.6, eventType:'agent_completed', taskId:'fixture-task', workItemId:'main-summary', display:{ title:'项目主 Agent', target:'最终验收与交付总结', summary:'最终交付总结已完成', status:'success', durationMs:700 }, createdAt:at(8.9), detail:{ agentDisplay:{ projectId:'', projectName:'', runtimeLabel:'项目主 Agent', workItemTitle:'最终验收与交付总结', phase:'completed', attempt:1, isParallel:false }, executionStage:{ kind:'main_agent_summary', stageRunId:'main-summary', attempt:1, startedAt:at(8.2), completedAt:at(8.9), activeDurationMs:700 } } },
  { ...base, eventId:'requirement-plan-completed', sequence:10.8, eventType:'requirement_plan', taskId:'fixture-task', display:{ title:'需求实施计划', summary:'计划中的功能实现和验收均已完成。', status:'success' }, createdAt:at(8.95), detail:{ requirementPlan:{ schema:'ccm-user-visible-requirement-plan-v1', planId:'fixture-task', revision:1, title:'需求实施计划', goal:'完善后台管理端，让运营人员可以管理商家、商品和订单，并保证前后端数据、权限和异常状态正确衔接。', steps:[
    { id:'step_1', title:'确认后台功能范围', description:'梳理现有商家、商品和订单功能，确认本次需要补充的部分。', outcome:'得到明确的功能清单和处理顺序', project:'smart-live-ui', dependsOn:[], status:'completed' },
    { id:'step_2', title:'完善后台管理页面', description:'补齐列表、详情、编辑和状态操作。', outcome:'后台页面覆盖主要管理场景', project:'smart-live-ui', dependsOn:['step_1'], status:'completed' },
    { id:'step_3', title:'对接业务接口与权限', description:'连接现有后端能力并处理权限和失败提示。', outcome:'页面可以真实读取和更新业务数据', project:'smart-live-Cloud', dependsOn:['step_2'], status:'completed' },
    { id:'step_4', title:'独立测试并交付', description:'验证主要流程，未通过时返回原项目 Agent 修正。', outcome:'提供测试结论、修改文件和交付说明', project:'TestAgent', dependsOn:['step_3'], status:'completed' },
  ], scope:['后台管理页面','业务接口','权限与状态处理'], expectedResults:['运营人员可以管理商家、商品和订单','页面数据与后端业务状态保持一致','关键流程通过独立测试'], exclusions:['不执行生产发布或数据迁移'], status:'completed', createdAt:at(4.2), updatedAt:at(8.95), planChecksum:'fixture-plan-completed', contentStored:false } } },
  { ...base, eventId:'result', sequence:11, eventType:'result', taskId:'fixture-task', display:{ title:'任务已完成', summary:'代码修改和独立验收均已通过', status:'success', toolUseCount:5, tokenCount:2480, tokenType:'provider_total', tokenAccuracy:'reported', durationMs:16800 }, createdAt:at(9), detail:{ safeResult:{ status:'success', contentStored:false }, fileChanges:[
    { project:'smart-live-ui', path:'src/feature.ts', status:'modified', additions:44, deletions:10 },
    { project:'smart-live-ui', path:'src/feature.test.ts', status:'modified', additions:18, deletions:2 },
    { project:'smart-live-ui', path:'src/components/FeaturePanel.vue', status:'modified', additions:27, deletions:4 },
    { project:'smart-live-ui', path:'docs/FEATURE.md', status:'added', additions:31, deletions:0 },
  ], usage:{ inputTokens:1940, outputTokens:540 }, timing:{ totalMs:16800, modelMs:9100, toolWallMs:1250, dependencyWaitMs:4200, otherMs:2250 } } },
]
const runningRows = rows.filter(event => event.sequence <= 8)
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
  data:() => ({ rows, runningRows, messages, conversationRows, conversationMessages, openedFile:'', openedBatch:0 }),
  template:`<main>
    <h1 class="fixture-title">项目会话</h1>
    <section class="message pending-message"><ConversationProcessingState compact title="正在思考…" detail="" /></section>
    <section class="message ordinary-message"><AgentExecutionTranscript :events="conversationRows" :messages="conversationMessages" :message-index="1" presentation="completed" /><p class="answer">整体方向不错。</p></section>
    <section class="message running-task-message"><AgentExecutionTranscript :events="runningRows" :messages="messages" :message-index="1" stage-grouped presentation="live" /></section>
    <section class="message task-message">
      <p class="answer">代码修改和独立验收均已通过。</p>
      <AgentExecutionTranscript :events="rows" :messages="messages" :message-index="1" stage-grouped presentation="completed" @open-file-change="openedFile = $event.path" @open-file-changes="openedBatch = $event.count" />
      <output class="opened-file">{{ openedFile }}</output><output class="opened-batch">{{ openedBatch }}</output>
    </section>
  </main>`,
}).mount('#app')
