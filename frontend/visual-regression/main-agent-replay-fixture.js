import { createApp, computed } from 'vue/dist/vue.esm-bundler.js'
import '../src/style.css'
import MainAgentDecisionCard from '../src/components/agents/MainAgentDecisionCard.vue'
import TaskExperienceCard from '../src/components/tasks/TaskExperienceCard.vue'
import replay from './fixtures/main-agent-replay.json'
import { sanitizeUserFacingAgentText, summarizeWorkEvents } from '../src/utils/agentDisplay.js'

const style = document.createElement('style')
style.textContent = `
  body { margin: 0; background: #eef2f7; color: #0f172a; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .replay-page { width: min(1080px, calc(100vw - 32px)); margin: 0 auto; padding: 22px 0 42px; }
  .replay-head { margin-bottom: 14px; padding: 12px 14px; border: 1px solid rgba(148, 163, 184, .28); border-radius: 10px; background: rgba(255, 255, 255, .82); }
  .replay-head h1 { margin: 0; font-size: 17px; color: #1e293b; }
  .replay-head small { display: block; margin-top: 4px; color: #64748b; }
  .replay-flow { display: grid; gap: 12px; }
  .replay-message { padding: 12px; border: 1px solid rgba(148, 163, 184, .24); border-radius: 10px; background: rgba(255, 255, 255, .76); }
  .replay-message.user { background: rgba(239, 246, 255, .82); }
  .replay-meta { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px; color: #64748b; font-size: 11px; font-weight: 800; }
  .replay-content { color: #334155; font-size: 13px; line-height: 1.5; overflow-wrap: anywhere; }
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

const getTaskCard = (msg) => msg?.taskRuntime?.taskCard || msg?.taskRuntime?.task_card || msg?.task_runtime?.taskCard || msg?.task_runtime?.task_card || null
const getDecision = (msg) => msg?.mainAgentDecision || msg?.main_agent_decision || getTaskCard(msg)?.mainAgentDecision || getTaskCard(msg)?.main_agent_decision || null
const agentStyle = (agent) => ({ '--agent-accent': agent === 'web' ? '#2563eb' : '#059669' })
const timeText = (value) => new Date(value).toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })

const ReplayApp = {
  components: { MainAgentDecisionCard, TaskExperienceCard },
  setup() {
    const messages = computed(() => replay.messages || [])
    const workSummary = (msg) => summarizeWorkEvents(msg.workEvents || [])
    const compactWorkText = (text) => sanitizeUserFacingAgentText(text, '执行成员正在执行。', 220)
    return { replay, messages, getDecision, getTaskCard, workSummary, compactWorkText, agentStyle, timeText }
  },
  template: `
    <main class="replay-page">
      <header class="replay-head">
        <h1>真实结构回放：{{ replay.group.name }}</h1>
        <small>{{ replay.schema }} · {{ messages.length }} 条消息</small>
      </header>
      <section class="replay-flow">
        <article
          v-for="msg in messages"
          :id="'replay-' + msg.id"
          :key="msg.id"
          class="replay-message"
          :class="msg.role"
        >
          <div class="replay-meta">
            <span>{{ msg.role === 'user' ? '用户' : (msg.agent === 'coordinator' ? '协调者' : msg.agent || 'Agent') }}</span>
            <span>{{ msg.type || 'message' }} · {{ timeText(msg.timestamp) }}</span>
          </div>
          <div class="replay-content">{{ msg.content }}</div>
          <MainAgentDecisionCard v-if="getDecision(msg)" :decision="getDecision(msg)" compact />
          <TaskExperienceCard v-if="getTaskCard(msg)" :card="getTaskCard(msg)" />
          <details v-if="msg.workEvents?.length" class="agent-work-events running" :style="agentStyle(msg.agent)">
            <summary class="work-events-head">
              <div class="work-head-main">
                <span class="work-agent-dot"></span>
                <span class="work-title">执行成员执行摘要</span>
                <span class="work-state-pill">执行中</span>
              </div>
              <div class="work-head-meta">
                <span>{{ workSummary(msg).summary }}</span>
                <small v-if="workSummary(msg).hiddenCount">+{{ workSummary(msg).hiddenCount }} 条详情</small>
              </div>
            </summary>
            <div class="work-events-preview">
              <span>{{ timeText(msg.workEvents[msg.workEvents.length - 1].time) }}</span>
              <pre>{{ workSummary(msg).latestText }}</pre>
            </div>
            <div class="work-events-list">
              <div v-for="event in msg.workEvents" :key="event.kind + event.time" class="work-event">
                <div class="work-event-side">
                  <span class="work-event-kind">{{ event.kind }}</span>
                  <span class="work-event-time">{{ timeText(event.time) }}</span>
                </div>
                <pre>{{ compactWorkText(event.text) }}</pre>
              </div>
            </div>
          </details>
        </article>
      </section>
    </main>
  `,
}

createApp(ReplayApp).mount('#app')
