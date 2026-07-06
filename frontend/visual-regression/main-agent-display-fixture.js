import { createApp, computed } from 'vue/dist/vue.esm-bundler.js'
import '../src/style.css'
import MainAgentDecisionCard from '../src/components/MainAgentDecisionCard.vue'
import TaskExperienceCard from '../src/components/TaskExperienceCard.vue'
import { summarizeWorkEvents, sanitizeUserFacingAgentText } from '../src/utils/agentDisplay.js'

const style = document.createElement('style')
style.textContent = `
  body { margin: 0; background: #eef2f7; color: #0f172a; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .visual-fixture { display: grid; gap: 18px; width: min(1040px, calc(100vw - 32px)); margin: 0 auto; padding: 24px 0 40px; }
  .fixture-case { padding: 14px; border: 1px solid rgba(148, 163, 184, .28); border-radius: 10px; background: rgba(255, 255, 255, .78); }
  .fixture-case h2 { margin: 0 0 10px; font-size: 14px; color: #334155; }
  .agent-work-events { margin-top: 10px; border: 1px solid color-mix(in srgb, var(--agent-accent) 22%, rgba(15, 23, 42, 0.08)); border-radius: 8px; background: color-mix(in srgb, var(--agent-accent) 5%, rgba(255, 255, 255, 0.7)); overflow: hidden; }
  .agent-work-events > summary { list-style: none; cursor: pointer; user-select: none; }
  .agent-work-events > summary::-webkit-details-marker { display: none; }
  .agent-work-events:not([open]) .work-events-preview, .agent-work-events:not([open]) .work-events-list { display: none; }
  .agent-work-events[open] .work-events-preview { border-bottom: 1px solid rgba(15, 23, 42, 0.06); }
  .work-events-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 10px; border-bottom: 1px solid rgba(15, 23, 42, 0.06); color: #475569; font-size: 11px; font-weight: 800; }
  .work-head-main, .work-head-meta { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .work-head-meta { color: #64748b; font-weight: 700; }
  .work-agent-dot { width: 8px; height: 8px; flex: 0 0 8px; border-radius: 999px; background: var(--agent-accent); box-shadow: 0 0 0 4px color-mix(in srgb, var(--agent-accent) 12%, transparent); }
  .work-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #1e293b; }
  .work-state-pill { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; min-width: 48px; height: 22px; padding: 0 8px; border-radius: 999px; font-size: 11px; font-weight: 800; white-space: nowrap; background: color-mix(in srgb, var(--agent-accent) 13%, transparent); color: var(--agent-accent); }
  .work-events-preview { display: grid; grid-template-columns: 64px minmax(0, 1fr); gap: 8px; padding: 8px 10px; align-items: start; color: #64748b; font-size: 11px; }
  .work-events-preview pre, .work-event pre { margin: 0; white-space: pre-wrap; word-break: break-word; color: #334155; font-family: Consolas, "JetBrains Mono", monospace; line-height: 1.5; }
  .work-events-list { display: flex; flex-direction: column; gap: 7px; padding: 9px; max-height: 300px; overflow-y: auto; }
  .work-event { display: grid; grid-template-columns: 76px minmax(0, 1fr); gap: 9px; align-items: start; }
  .work-event-side { display: flex; flex-direction: column; gap: 3px; color: #64748b; font-size: 10px; font-weight: 800; }
`
document.head.appendChild(style)

const now = '2026-07-06T10:00:00.000Z'

const conversationDecision = {
  version: 2,
  mode: 'conversation',
  trace_id: 'trace-simple-chat',
  decision: {
    selected_actions: ['read_group_context', 'generate_final_reply'],
    dispatch_policy: { action: 'answer', reason: '普通问话', nextStep: '直接回复用户' },
    reason: '普通问话',
  },
  display_stream: {
    schema: 'ccm-streamlined-display-v1',
    user_visible_text: '已判断为普通对话，直接回复用户。',
    tool_use_summary: { tool_summary: '本轮没有需要展示的工具调用' },
  },
  todo_plan: {
    title: '我准备这样处理',
    source: 'cc-style-todo',
    schema: 'cc-style-todo-v2',
    display: { max_visible_steps: 7, quiet_completed: true, show_current_focus: true, user_visible: false, hide_for_simple_conversation: true },
    steps: [
      { id: 'understand_intent', content: '确认用户这句话是普通询问', activeForm: '正在判断用户意图', status: 'completed' },
      { id: 'generate_final_reply', content: '直接回答用户的问题', activeForm: '正在生成回复', status: 'completed' },
    ],
  },
  user_plan_steps: [
    { id: 'understand_intent', content: '确认用户这句话是普通询问', activeForm: '正在判断用户意图', status: 'completed' },
    { id: 'generate_final_reply', content: '直接回答用户的问题', activeForm: '正在生成回复', status: 'completed' },
  ],
  permissions: [],
  observation: { intent_kind: 'chat' },
  verify: { passed: true, blocked_actions: [], conclusion: '普通对话已处理' },
  reply: { kind: 'assistant_message', preview: '你好，我在。' },
}

const taskDecision = {
  version: 2,
  mode: 'project_task',
  trace_id: 'trace-task-visible',
  decision: {
    selected_actions: ['read_group_context', 'create_project_task', 'dispatch_child_agent', 'read_child_agent_receipts', 'generate_final_reply'],
    dispatch_policy: { action: 'delegate', reason: '明确开发任务', nextStep: '等待子 Agent 回执' },
    reason: '明确开发任务',
  },
  display_stream: {
    schema: 'ccm-streamlined-display-v1',
    user_visible_text: '已把明确需求转成项目任务，并进入执行队列。',
    tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: '读取/检查 2 项，协作通道 1 个' },
    technical_details: [
      { id: 'troubleshooting', title: '排障摘要', items: [] },
      { id: 'records', title: '完整记录', items: [{ label: 'Trace', value: 'trace-task-visible' }] },
    ],
  },
  todo_plan: {
    title: '我准备这样处理',
    source: 'cc-style-todo',
    schema: 'cc-style-todo-v2',
    display: { max_visible_steps: 7, quiet_completed: true, show_current_focus: true, user_visible: true },
    steps: [
      { id: 'understand_intent', content: '确认需求目标和涉及范围', activeForm: '正在确认需求目标', status: 'completed' },
      { id: 'create_project_task', content: '创建可跟踪的项目任务卡', activeForm: '正在创建项目任务卡', status: 'completed' },
      { id: 'dispatch_child_agent', content: '派发给 1 个子 Agent 执行', activeForm: '正在派发子 Agent', status: 'in_progress', actions: [{ id: 'cancel', label: '取消任务', kind: 'cancel', tone: 'danger' }] },
      { id: 'verify_and_reply', content: '汇总修改、验证结果和风险，生成最终回复', activeForm: '正在验收并生成最终回复', status: 'pending' },
    ],
  },
  user_plan_steps: [],
  permissions: [],
  observation: { intent_kind: 'task' },
  verify: { passed: true, blocked_actions: [], conclusion: '任务已进入执行链路' },
  reply: { kind: 'task_card', preview: '任务已创建。' },
}
taskDecision.user_plan_steps = taskDecision.todo_plan.steps

const taskCard = {
  version: 1,
  visible: true,
  task_id: 'task-render-1',
  title: '修复登录状态刷新问题',
  goal: '用户登录后刷新页面仍保持登录态。',
  phase: 'executing',
  phase_label: '执行中',
  progress: 55,
  active_agents: ['前端 · web 正在处理'],
  agents: [{ name: '前端 · web', status: 'running', summary: '正在修改登录状态恢复逻辑', blockers: [] }],
  mainAgentDecision: taskDecision,
  main_agent_decision: taskDecision,
  display_stream: taskDecision.display_stream,
  completed: ['已创建任务卡'],
  blockers: [],
  next_action: '完成修改后会自动运行检查',
  delivery: { headline: '', files: [], verification: [], risks: [], acceptance_passed: false },
  actions: [],
  technical: {
    trace_id: 'trace-task-visible',
    execution_ids: ['exec-render-1'],
    session_ids: ['session-render-1'],
    display_stream: taskDecision.display_stream,
  },
}

const childEvents = [
  { kind: 'status', time: now, text: '准备读取相关文件' },
  { kind: 'tool', time: now, text: 'Read LoginStore.vue' },
  { kind: 'output', time: now, text: 'CCM_AGENT_RECEIPT raw payload should be hidden from normal users' },
  { kind: 'done', time: now, text: '完成登录状态恢复修改，等待主 Agent 验收' },
]

const FixtureApp = {
  components: { MainAgentDecisionCard, TaskExperienceCard },
  setup() {
    const childSummary = computed(() => summarizeWorkEvents(childEvents))
    const compactWorkText = (text) => sanitizeUserFacingAgentText(text, '子 Agent 正在执行。', 220)
    return { conversationDecision, taskDecision, taskCard, childEvents, childSummary, compactWorkText }
  },
  template: `
    <main class="visual-fixture">
      <section id="case-simple-conversation" class="fixture-case">
        <h2>普通问话</h2>
        <MainAgentDecisionCard :decision="conversationDecision" />
      </section>

      <section id="case-task-plan" class="fixture-case">
        <h2>任务计划</h2>
        <MainAgentDecisionCard :decision="taskDecision" />
      </section>

      <section id="case-task-card" class="fixture-case">
        <h2>任务卡</h2>
        <TaskExperienceCard :card="taskCard" />
      </section>

      <section id="case-child-agent" class="fixture-case">
        <h2>子 Agent 摘要</h2>
        <details class="agent-work-events running" style="--agent-accent:#2563eb">
          <summary class="work-events-head">
            <div class="work-head-main">
              <span class="work-agent-dot"></span>
              <span class="work-title">子 Agent 执行摘要</span>
              <span class="work-state-pill running">执行中</span>
            </div>
            <div class="work-head-meta">
              <span>{{ childSummary.summary }}</span>
              <small v-if="childSummary.hiddenCount">+{{ childSummary.hiddenCount }} 条详情</small>
            </div>
          </summary>
          <div class="work-events-preview">
            <span>10:00:00</span>
            <pre>{{ childSummary.latestText }}</pre>
          </div>
          <div class="work-events-list">
            <div v-for="event in childEvents" :key="event.kind + event.text" class="work-event">
              <div class="work-event-side">
                <span class="work-event-kind">{{ event.kind }}</span>
                <span class="work-event-time">10:00:00</span>
              </div>
              <pre>{{ compactWorkText(event.text) }}</pre>
            </div>
          </div>
        </details>
      </section>
    </main>
  `,
}

createApp(FixtureApp).mount('#app')
