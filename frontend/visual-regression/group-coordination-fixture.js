import { createApp } from 'vue/dist/vue.esm-bundler.js'
import '../src/style.css'
import AgentQaMessage from '../src/components/agents/AgentQaMessage.vue'

const style = document.createElement('style')
style.textContent = `
body { margin:0; background:#edf1f5; color:#172033; font-family:Inter,"Microsoft YaHei",system-ui,sans-serif; }
.fixture { width:min(760px,calc(100vw - 24px)); margin:24px auto; display:grid; gap:16px; }
.fixture-header { display:grid; gap:4px; padding:0 2px; }
.fixture-header h1 { margin:0; font-size:18px; letter-spacing:0; }
.fixture-header p { margin:0; color:#667085; font-size:12px; }
.chat-surface { display:grid; gap:12px; padding:16px; border:1px solid #dbe2ea; border-radius:8px; background:#fff; box-shadow:0 6px 22px rgba(15,23,42,.06); }
.ordinary { justify-self:end; max-width:82%; padding:9px 12px; border-radius:8px; background:#e7f0ff; color:#1d3f72; font-size:13px; }
.ordinary-answer { max-width:82%; padding:9px 12px; border-left:3px solid #98a2b3; color:#344054; font-size:13px; }
@media (max-width:520px) { .fixture { margin:12px auto; gap:12px; }.chat-surface { padding:10px; }.ordinary,.ordinary-answer { max-width:94%; } }
`
document.head.appendChild(style)

const baseQa = {
  id: 'qa-friendly-preview',
  coordination_request_id: 'gcr_technical_only',
  coordination_kind: 'implementation',
  from_agent: 'frontend-agent',
  to_agent: 'backend-agent',
  blocking: true,
  question: '新增订单创建接口并返回 orderId',
  permission_contract: { mode: 'formal_work_item_write' },
  user_preview: {
    question: '新增订单创建接口并返回 orderId',
    display_policy: { technical_default_collapsed: true, hide_internal_protocols: true },
  },
}

createApp({
  components: { AgentQaMessage },
  data: () => ({
    working: {
      id: 'message-working', type: 'agent_qa', agent: 'frontend-agent',
      qa: {
        ...baseQa,
        kind: 'progress', status: 'executing', work_item_task_id: 'task_dependency_technical_only',
        user_preview: {
          ...baseQa.user_preview,
          label: '正在并行处理', status: 'executing',
          summary: '后端成员已在独立会话和工作区中并行处理前端成员的工作依赖。',
          next_action: '目标 Agent 正在并行实现；完成后由主 Agent 验收。',
          badges: ['协作工作项', '影响续跑', '正式可写工作项'],
        },
      },
    },
    merging: {
      id: 'message-merging', type: 'agent_qa', agent: 'frontend-agent',
      qa: {
        ...baseQa,
        kind: 'progress', status: 'merging', work_item_task_id: 'task_dependency_technical_only',
        coordination_execution: { native_session_id: 'native_technical_only', worktree_branch: 'ccm/technical-only' },
        user_preview: {
          ...baseQa.user_preview,
          label: '正在安全合并', status: 'merging',
          summary: '后端成员已完成实现和验证，主 Agent 正在安全合并代码。',
          next_action: '等待代码安全合并；完成后自动唤醒原 Agent。',
          badges: ['协作工作项', '验证已完成', '技术信息已收起'],
        },
      },
    },
    resumed: {
      id: 'message-resumed', type: 'agent_qa_resume', agent: 'frontend-agent',
      qa: {
        ...baseQa,
        kind: 'resume', status: 'resumed', work_item_task_id: 'task_dependency_technical_only',
        answer: '订单接口已实现并通过验证。', answer_evidence: ['src/orders-api.ts', '接口测试通过'],
        acceptance: { accepted: true, score: 100, status: 'accepted', reason: '代码变更和验证证据均已通过验收。' },
        user_preview: {
          ...baseQa.user_preview,
          label: '原任务已继续', status: 'resumed',
          summary: '后端成员已完成协作工作项并通过主 Agent 验收，前端正从原任务继续。',
          answer: '订单接口已实现并通过验证。',
          next_action: '继续原任务执行，后续由主 Agent 汇总验收。',
          badges: ['协作工作项', '已建立任务依赖', '已续跑'],
        },
      },
    },
  }),
  methods: {
    displayName(value) { return ({ 'frontend-agent':'前端成员', 'backend-agent':'后端成员' })[value] || value },
  },
  template: `
    <main class="fixture">
      <header class="fixture-header"><h1>群聊任务进度</h1><p>主 Agent 统一协调、验收并恢复原任务</p></header>
      <section id="task-case" class="chat-surface">
        <AgentQaMessage :msg="working" :get-agent-display-name="displayName" />
        <AgentQaMessage :msg="merging" :get-agent-display-name="displayName" />
        <AgentQaMessage :msg="resumed" :get-agent-display-name="displayName" />
      </section>
      <section id="ordinary-case" class="chat-surface">
        <div class="ordinary">今天完成了哪些工作？</div>
        <div class="ordinary-answer">今天完成了订单流程联调，并补充了接口验证。</div>
      </section>
    </main>
  `,
}).mount('#app')
