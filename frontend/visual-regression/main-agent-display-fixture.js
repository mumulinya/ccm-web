import { createApp, computed, nextTick, ref } from 'vue/dist/vue.esm-bundler.js'
import '../src/style.css'
import MainAgentDecisionCard from '../src/components/agents/MainAgentDecisionCard.vue'
import TaskExperienceCard from '../src/components/tasks/TaskExperienceCard.vue'
import GroupMainAgentStatusCard from '../src/components/collaboration/GroupMainAgentStatusCard.vue'
import ProjectTaskIntakeMessage from '../src/components/collaboration/ProjectTaskIntakeMessage.vue'
import TaskCollaborationCard from '../src/components/collaboration/TaskCollaborationCard.vue'
import AgentCodeChangeDrawer from '../src/components/agents/AgentCodeChangeDrawer.vue'
import AgentQaMessage from '../src/components/agents/AgentQaMessage.vue'
import GlobalAgent from '../src/components/global/GlobalAgent.vue'
import ChatComposer from '../src/components/common/ChatComposer.vue'
import AgentExecutionMessage from '../src/components/agents/AgentExecutionMessage.vue'
import { buildGroupClarificationResponseFields, buildWaitingUserTaskContinuationFields, createGroupTaskCardActionHandler } from '../src/composables/useGroupTaskCardActions.js'
import { summarizeWorkEvents, sanitizeUserFacingAgentText } from '../src/utils/agentDisplay.js'
import { globalAgentRunTaskCard } from '../src/utils/taskExperience.js'

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
  .global-agent-fixture-frame { height: 720px; min-height: 720px; overflow: hidden; border: 1px solid rgba(148, 163, 184, .24); border-radius: 10px; }
  .fixture-group-user-message { width: fit-content; max-width: min(720px, 90%); margin: 12px 0 12px auto; padding: 10px 13px; border: 1px solid rgba(37, 99, 235, .16); border-radius: 8px 8px 2px 8px; background: rgba(37, 99, 235, .06); color: #1e293b; font-size: 13px; line-height: 1.55; overflow-wrap: anywhere; }
  .fixture-task-supplement-context { display: flex; min-width: 0; max-width: 250px; height: 38px; align-items: center; gap: 7px; padding: 0 10px; border: 1px solid rgba(37, 99, 235, .18); border-radius: 8px; background: rgba(37, 99, 235, .06); color: #475569; font-size: 11.5px; }
  .fixture-task-supplement-context strong { min-width: 0; overflow: hidden; color: #0f172a; text-overflow: ellipsis; white-space: nowrap; }
`
document.head.appendChild(style)

const now = '2026-07-06T10:00:00.000Z'
const GLOBAL_AGENT_SESSIONS_KEY = 'cc_global_assistant_sessions_v2'
const GLOBAL_AGENT_CURRENT_ID_KEY = 'cc_global_assistant_current_id_v2'
let globalAgentFixtureSessions = []
let globalSteerStreamController = null
let globalSteerFixtureRun = null
let globalOrdinaryStreamController = null
let globalOrdinaryFixtureRun = null
let globalSupervisingFixtureRun = null
let globalSupervisingFixtureMission = null

const encodeSseEvent = (event) => new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
const enqueueGlobalSteerFixtureEvent = (event) => {
  if (globalSteerStreamController) globalSteerStreamController.enqueue(encodeSseEvent(event))
}

window.__ccmFinishGlobalSteerFixtureRun = () => {
  if (!globalSteerStreamController || !globalSteerFixtureRun) return
  const completedRun = {
    ...globalSteerFixtureRun,
    status: 'completed',
    phase: 'complete',
    final_reply: '补充要求已纳入，当前任务已完成。',
    updated_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  }
  enqueueGlobalSteerFixtureEvent({ type: 'result', run: completedRun })
  enqueueGlobalSteerFixtureEvent({ type: 'done' })
  globalSteerStreamController.close()
  globalSteerStreamController = null
  globalSteerFixtureRun = null
}

window.__ccmFinishGlobalOrdinaryFixtureRun = () => {
  if (!globalOrdinaryStreamController || !globalOrdinaryFixtureRun) return
  const completedRun = {
    ...globalOrdinaryFixtureRun,
    status: 'completed',
    phase: 'complete',
    final_reply: '你好！有什么我可以帮你的吗？',
    decision_summary: {
      intent: {
        category: 'conversation',
        goal: '普通问候',
        action_required: false,
        confidence: 1,
        authorization_basis: 'none',
        reason: '普通问候',
      },
    },
    updated_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  }
  globalOrdinaryStreamController.enqueue(encodeSseEvent({
    type: 'decision',
    run_id: completedRun.id,
    status: 'running',
    phase: 'answer',
    step: {
      state: 'answer',
      message: completedRun.final_reply,
      decision: completedRun.decision_summary,
    },
  }))
  globalOrdinaryStreamController.enqueue(encodeSseEvent({ type: 'result', run: completedRun }))
  globalOrdinaryStreamController.enqueue(encodeSseEvent({ type: 'done' }))
  globalOrdinaryStreamController.close()
  globalOrdinaryStreamController = null
  globalOrdinaryFixtureRun = null
}

const jsonResponse = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

const originalFetch = window.fetch.bind(window)
const fixtureConversationTurns = []

window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input?.url || ''
  const parsedUrl = new URL(url, window.location.origin)
  if (parsedUrl.pathname.startsWith('/api/conversation-turns')) {
    const payload = init?.body ? JSON.parse(String(init.body)) : {}
    if (parsedUrl.pathname === '/api/conversation-turns' && String(init?.method || 'GET').toUpperCase() === 'GET') {
      const statuses = String(parsedUrl.searchParams.get('statuses') || '').split(',').filter(Boolean)
      return jsonResponse({
        success: true,
        turns: fixtureConversationTurns.filter(turn =>
          (!parsedUrl.searchParams.get('scope') || turn.scope === parsedUrl.searchParams.get('scope'))
          && (!parsedUrl.searchParams.get('conversation_id') || turn.conversation_id === parsedUrl.searchParams.get('conversation_id'))
          && (!statuses.length || statuses.includes(turn.status))
        ),
      })
    }
    if (parsedUrl.pathname === '/api/conversation-turns/enqueue') {
      const turn = {
        id: `fixture-turn-${fixtureConversationTurns.length + 1}`,
        scope: payload.scope || 'global',
        conversation_id: payload.conversation_id || 'global-stream-fixture',
        mode: payload.mode || 'queue',
        message: payload.message || '',
        active_run_id: payload.active_run_id || '',
        metadata: payload.metadata || {},
        status: 'queued',
        created_at: new Date().toISOString(),
      }
      fixtureConversationTurns.push(turn)
      return jsonResponse({ success: true, turn })
    }
    if (parsedUrl.pathname === '/api/conversation-turns/claim') {
      const turn = fixtureConversationTurns.find(item => item.status === 'queued'
        && (!payload.scope || item.scope === payload.scope)
        && (!payload.conversation_id || item.conversation_id === payload.conversation_id)) || null
      if (turn) turn.status = 'sending'
      return jsonResponse({ success: true, turn })
    }
    const turn = fixtureConversationTurns.find(item => item.id === payload.id) || null
    if (parsedUrl.pathname === '/api/conversation-turns/settle' && turn) {
      turn.status = payload.status || 'completed'
      turn.result = payload.result || null
      turn.error = payload.error || ''
    }
    if (parsedUrl.pathname === '/api/conversation-turns/cancel' && turn) turn.status = 'cancelled'
    if (parsedUrl.pathname === '/api/conversation-turns/retry' && turn) turn.status = 'queued'
    return jsonResponse({ success: true, turn })
  }
  if (url.includes('/api/global-agent/quality')) {
    return jsonResponse({
      success: true,
      quality: {
        policy: { shadowMode: false, minWriteConfidence: 0.72 },
        rates: {},
      },
    })
  }
  if (url.includes('/api/global-agent/history')) {
    if (String(init?.method || 'GET').toUpperCase() === 'POST') return jsonResponse({ success: true })
    return jsonResponse({ success: true, sessions: globalAgentFixtureSessions, currentSessionId: 'global-stream-fixture' })
  }
  if (url.includes('/api/global-agent/bridge/pending')) {
    return jsonResponse({ success: true, requests: [] })
  }
  if (url.includes('/api/global-agent/supervisors/control')) {
    const payload = JSON.parse(String(init?.body || '{}'))
    if (payload.mission_id === 'fixture-mission-waiting' || payload.id === 'fixture-supervisor-waiting-hidden') {
      const resolvedAt = new Date().toISOString()
      return jsonResponse({
        success: true,
        mission: {
          id: 'fixture-mission-waiting',
          trace_id: 'trace-global-waiting-hidden',
          title: '登录恢复真实验收',
          business_goal: payload.business_goal,
          status: 'in_progress',
          status_detail: '补充信息已收到，正在沿用原任务继续复核和验收。',
          mission_summary: { total: 1, passed: 0, blocked: 0 },
          collaboration_state: {
            needs_user: false,
            last_continuation: {
              kind: payload.continuation_kind,
              source: payload.source,
              resolves_waiting_user: payload.resolve_waiting_user === true,
              replan_required: false,
              interrupt_current_run: false,
              reason: payload.message,
              at: resolvedAt,
            },
          },
        },
        children: [],
        supervisor: {
          id: 'fixture-supervisor-waiting-hidden',
          mission_id: 'fixture-mission-waiting',
          status: 'monitoring',
          phase: 'supervising',
          updated_at: resolvedAt,
          last_continuation: {
            kind: payload.continuation_kind,
            source: payload.source,
            resolves_waiting_user: payload.resolve_waiting_user === true,
            replan_required: false,
            interrupt_current_run: false,
          },
          incidents: [{
            type: 'waiting_user',
            reason: '请提供测试环境的登录地址和可用测试账号；收到后我会继续复核和总结。',
            resolved_at: resolvedAt,
          }],
        },
        run: null,
      })
    }
  }
  if (url.includes('/api/global-agent/missions')) {
    const mission = globalSupervisingFixtureMission || {
      id: 'fixture-mission-running',
      status: 'in_progress',
      business_goal: globalSupervisingFixtureRun?.user_message || '修复登录状态恢复逻辑并完成验收',
      status_detail: '正在持续跟踪执行和验收。',
      mission_summary: { all_passed: false, pending: 2 },
    }
    return jsonResponse({
      success: true,
      mission,
      children: [],
      supervisor: {
        id: 'fixture-supervisor-running',
        mission_id: 'fixture-mission-running',
        global_run_id: globalSupervisingFixtureRun?.id || 'global-supervising-goal-revision-run',
        status: 'monitoring',
        phase: globalSupervisingFixtureRun?.supervision_state === 'replanning' ? 'replanning' : 'supervising',
        business_goal: mission.business_goal,
        last_continuation: mission.collaboration_state?.last_continuation || null,
      },
    })
  }
  if (url.includes('/api/global-agent/runs?')) {
    return jsonResponse({ success: true, run: globalSupervisingFixtureRun })
  }
  if (url.includes('/api/global-agent/runs/steer')) {
    const payload = JSON.parse(String(init?.body || '{}'))
    const revised = /目标调整|改为|改成|只做|不再|不要再/.test(String(payload.message || ''))
    if (payload.id === globalSupervisingFixtureRun?.id) {
      const steering = {
        id: 'fixture-supervision-steer',
        message: payload.message,
        kind: revised ? 'revise_goal' : 'supplement',
        source: 'global_web_supervision_steer',
        request_id: payload.request_id,
        at: new Date().toISOString(),
        applied_at: new Date().toISOString(),
        status: 'applied',
        authorization_preserved: false,
      }
      const todoPlan = {
        ...(globalSupervisingFixtureRun.todo_plan || {}),
        source: 'global-supervision-steering',
        title: '调整后的执行计划',
        steps: [
          { id: 'recheck_goal', label: '重新核对目标和范围', active_form: '已接收新的目标边界', status: 'completed' },
          { id: 'interrupt_previous_run', label: '停止旧执行轮', active_form: '旧执行已停止', detail: '旧方向已经停止，不会继续写入。', status: 'completed' },
          { id: 'replan_supervised_mission', label: '按新目标重新规划', active_form: '正在按新目标重新规划', detail: '正在重新核对执行范围和验收标准。', status: 'in_progress' },
          { id: 'rerun_acceptance_review', label: '重新执行验收和复核', active_form: '等待重新执行验收和复核', status: 'pending' },
        ],
        next_action: '重新核对计划后继续派发，并重新运行 TestAgent 复核。',
      }
      const continuation = {
        kind: revised ? 'revise_goal' : 'supplement',
        affected_task_count: 2,
        queued_task_count: 1,
        deferred_task_count: 1,
        interrupted_task_count: revised ? 1 : 0,
        failed_task_count: 0,
        at: new Date().toISOString(),
      }
      const workchain = {
        ...(globalSupervisingFixtureRun.workchain || {}),
        mode: 'plan',
        phase: 'plan',
        status: 'supervising',
        user_visible_text: '目标调整已接收。旧执行已停止，正在按新目标重新规划。',
        todo_plan: todoPlan,
        todoPlan,
        technical_details: [{
          id: 'supervision_continuation',
          title: '持续跟进接续统计',
          items: [
            { label: '受影响子任务', value: '2' },
            { label: '停止旧执行轮', value: '1' },
            { label: '重新排队', value: '1' },
          ],
        }],
      }
      const revisedDecision = {
        ...(globalSupervisingFixtureRun.display_stream?.main_agent_decision || {}),
        mode: revised ? 'goal_revision' : 'followup',
        decision: {
          selected_actions: revised
            ? ['replan_from_observation', 'dispatch_child_agent', 'read_child_agent_receipts', 'generate_final_reply']
            : ['dispatch_child_agent', 'read_child_agent_receipts', 'generate_final_reply'],
          dispatch_policy: {
            action: revised ? 'replan' : 'continue',
            reason: workchain.user_visible_text,
            nextStep: todoPlan.next_action,
          },
          reason: workchain.user_visible_text,
        },
        todo_plan: todoPlan,
        todoPlan,
        user_plan_steps: todoPlan.steps,
        verify: {
          passed: false,
          blocked_actions: [],
          conclusion: revised ? '正在按新目标重新规划' : '正在继续执行和验收',
        },
      }
      globalSupervisingFixtureRun = {
        ...globalSupervisingFixtureRun,
        status: 'supervising',
        phase: 'plan',
        supervision_state: 'replanning',
        final_reply: '目标调整已接收。旧执行已停止，正在按新目标重新规划。',
        last_user_steer: steering,
        lastUserSteer: steering,
        user_steer_history: [...(globalSupervisingFixtureRun.user_steer_history || []), steering],
        userSteerHistory: [...(globalSupervisingFixtureRun.user_steer_history || []), steering],
        todo_plan: todoPlan,
        todoPlan,
        workchain,
        display_stream: {
          ...(globalSupervisingFixtureRun.display_stream || {}),
          user_visible_text: workchain.user_visible_text,
          workchain,
          todo_plan: todoPlan,
          todoPlan,
          technical_details: workchain.technical_details,
          main_agent_decision: revisedDecision,
          mainAgentDecision: revisedDecision,
        },
        final_report: {
          summary: workchain.user_visible_text,
          next_action: todoPlan.next_action,
          supervision_continuation: continuation,
        },
        updated_at: new Date().toISOString(),
      }
      globalSupervisingFixtureMission = {
        ...(globalSupervisingFixtureMission || {}),
        id: 'fixture-mission-running',
        status: 'in_progress',
        business_goal: revised ? '只检查登录恢复，不修改其他模块' : globalSupervisingFixtureRun.user_message,
        status_detail: revised
          ? '旧执行已停止，正在按新目标重新规划。'
          : '补充要求已同步，正在继续执行和验收。',
        mission_summary: { all_passed: false, pending: 2 },
        collaboration_state: {
          ...(globalSupervisingFixtureMission?.collaboration_state || {}),
          last_continuation: continuation,
        },
        todo_plan: todoPlan,
        todoPlan,
      }
      return jsonResponse({
        success: true,
        accepted: true,
        applied: true,
        duplicate: false,
        steering,
        continuation: globalSupervisingFixtureRun.final_report.supervision_continuation,
        supervisor: {
          id: 'fixture-supervisor-running',
          mission_id: 'fixture-mission-running',
          global_run_id: globalSupervisingFixtureRun.id,
          status: 'monitoring',
          phase: 'replanning',
          business_goal: '只检查登录恢复，不修改其他模块',
          last_continuation: continuation,
        },
        mission: globalSupervisingFixtureMission,
        run: globalSupervisingFixtureRun,
        message: revised
          ? '目标调整已接收。旧执行已停止，正在按新目标重新规划。'
          : '补充要求已接收，已并入当前任务继续处理。',
      })
    }
    const steering = {
      id: 'fixture-user-steer',
      message: payload.message,
      kind: revised ? 'revise_goal' : 'supplement',
      source: 'global_web_mid_turn',
      request_id: payload.request_id,
      at: new Date().toISOString(),
      status: 'queued',
      authorization_preserved: false,
    }
    globalSteerFixtureRun = {
      ...(globalSteerFixtureRun || {}),
      pending_user_messages: [steering],
      pendingUserMessages: [steering],
      last_user_steer: steering,
      lastUserSteer: steering,
    }
    setTimeout(() => enqueueGlobalSteerFixtureEvent({
      type: 'user_steer_applied',
      run_id: globalSteerFixtureRun?.id || 'global-mid-turn-steer-run',
      trace_id: globalSteerFixtureRun?.trace_id || 'trace-global-mid-turn-steer',
      status: 'running',
      phase: revised ? 'plan' : 'execute',
      steering: { ...steering, status: 'applied', applied_at: new Date().toISOString() },
      replan_required: revised,
      message: revised
        ? '新的目标边界已纳入，我会先重新核对计划再继续。'
        : '补充要求已纳入当前任务，我会带着它继续处理。',
    }), 0)
    return jsonResponse({
      success: true,
      accepted: true,
      duplicate: false,
      steering,
      run: globalSteerFixtureRun,
      message: revised
        ? '目标调整已接收，会在当前任务中重新核对计划。'
        : '补充要求已接收，会在当前任务中继续处理。',
    })
  }
  if (url.includes('/api/global-agent/run')) {
    const payload = JSON.parse(String(init?.body || '{}'))
    if (String(payload.message || '').trim() === '你好') {
      globalOrdinaryFixtureRun = {
        id: 'global-ordinary-conversation-run',
        trace_id: 'trace-global-ordinary-conversation',
        session_id: payload.session_id || 'global-stream-fixture',
        source: 'web',
        status: 'running',
        phase: 'plan',
        explicit_write_authorization: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deadline_at: new Date(Date.now() + 60_000).toISOString(),
        max_steps: 8,
        steps: [],
        pending_tool: null,
        final_reply: '',
        error: '',
        resume_count: 0,
        model_calls: 0,
        tool_calls: 0,
        client_effects: [],
        user_message: payload.message,
        original_user_message: payload.message,
      }
      return new Response(new ReadableStream({
        start(controller) {
          globalOrdinaryStreamController = controller
          controller.enqueue(encodeSseEvent({
            type: 'started',
            run_id: globalOrdinaryFixtureRun.id,
            trace_id: globalOrdinaryFixtureRun.trace_id,
            status: 'running',
            phase: 'plan',
          }))
        },
      }), {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      })
    }
    globalSteerFixtureRun = {
      id: 'global-mid-turn-steer-run',
      trace_id: 'trace-global-mid-turn-steer',
      session_id: payload.session_id || 'global-stream-fixture',
      source: 'web',
      status: 'running',
      phase: 'execute',
      explicit_write_authorization: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deadline_at: new Date(Date.now() + 60_000).toISOString(),
      max_steps: 8,
      steps: [],
      pending_tool: null,
      final_reply: '',
      error: '',
      resume_count: 0,
      model_calls: 1,
      tool_calls: 0,
      client_effects: [],
      user_message: payload.message,
      original_user_message: payload.message,
      pending_user_messages: [],
      user_steer_history: [],
    }
    return new Response(new ReadableStream({
      start(controller) {
        globalSteerStreamController = controller
        enqueueGlobalSteerFixtureEvent({
          type: 'started',
          run_id: globalSteerFixtureRun.id,
          trace_id: globalSteerFixtureRun.trace_id,
          status: 'running',
          phase: 'execute',
        })
        enqueueGlobalSteerFixtureEvent({
          type: 'decision',
          run_id: globalSteerFixtureRun.id,
          trace_id: globalSteerFixtureRun.trace_id,
          status: 'running',
          phase: 'execute',
          step: {
            state: 'execute',
            message: '我正在处理这项任务，你可以继续补充当前要求。',
            plan: ['确认当前目标', '执行并验证', '整理总结'],
          },
        })
      },
    }), {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })
  }
  return originalFetch(input, init)
}

const renderedChangeFiles = [
  {
    path: 'frontend/src/stores/login.js',
    project: 'web',
    agent: 'web',
    statusText: '修改',
    statusColor: '#2563eb',
    additions: 3,
    deletions: 1,
    diff: {
      available: true,
      additions: 3,
      deletions: 1,
      raw: [
        'diff --git a/frontend/src/stores/login.js b/frontend/src/stores/login.js',
        '--- a/frontend/src/stores/login.js',
        '+++ b/frontend/src/stores/login.js',
        '@@ -8,6 +8,8 @@ export function useLoginStore() {',
        '-  const user = null',
        '+  const user = restoreSessionFromStorage()',
        '+  const ready = Boolean(user)',
        '+  refreshTokenIfNeeded(user)',
      ].join('\n'),
    },
  },
  {
    path: 'frontend/src/views/Login.vue',
    project: 'web',
    agent: 'web',
    statusText: '修改',
    statusColor: '#2563eb',
    additions: 2,
    deletions: 0,
    diff: {
      available: true,
      additions: 2,
      deletions: 0,
      raw: [
        'diff --git a/frontend/src/views/Login.vue b/frontend/src/views/Login.vue',
        '--- a/frontend/src/views/Login.vue',
        '+++ b/frontend/src/views/Login.vue',
        '@@ -20,6 +20,8 @@',
        '+  await loginStore.restore()',
        '+  await router.replace(nextRoute)',
      ].join('\n'),
    },
  },
]

const renderedChangeSummary = {
  schema: 'ccm-main-agent-change-summary-v1',
  title: '改动明细',
  status: 'ready',
  status_label: '2 个文件',
  headline: 'web 产生了 2 个文件改动。',
  file_count: 2,
  additions: 5,
  deletions: 1,
  files: renderedChangeFiles,
  agents: [{ agent: 'web', role: '前端', file_count: 2, additions: 5, deletions: 1, files: renderedChangeFiles }],
  next_action: '可以点开查看具体文件 diff；原始执行记录仍在技术详情里。',
  display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
}

const renderedPlanMode = {
  title: '执行前计划',
  mode: 'cc-style-plan-mode',
  requires_confirmation: false,
  auto_continue: true,
  risk: { level: 'low', summary: '只修改登录状态恢复链路。', reasons: ['范围清晰'] },
  impact_scope: { projects: ['web'], areas: ['登录状态恢复'], file_hints: ['frontend/src/stores/login.js', 'frontend/src/views/Login.vue'] },
  read_only_exploration: { summary: '已确认登录 store 和登录页恢复入口。', projects: ['web'], knowledge_used: true, code_snapshot_used: true },
  acceptance: ['刷新页面后会恢复登录态', '登录状态恢复必须有文件改动', 'npm run test:login-state 必须通过'],
  permission_boundaries: ['不要修改无关登录样式', '不要编造未执行的验证结果'],
}

const groupIntakePlanMode = {
  title: '执行前计划',
  mode: 'cc-style-plan-mode',
  requires_confirmation: true,
  auto_continue: false,
  confirmation_status: 'awaiting_confirmation',
  risk: { level: 'high', summary: '涉及支付数据结构，需要先确认执行边界。', reasons: ['数据结构调整', '多项目协作'] },
  steps: [
    { id: 'understand_goal', label: '理解需求与验收目标', detail: '已锁定相关项目：api、web', status: 'completed' },
    { id: 'read_only_explore', label: '只读探索影响范围', detail: '已检查支付接口、前端结算入口和历史任务记录。', status: 'completed' },
    { id: 'confirm_boundary', label: '确认执行边界', detail: '涉及支付数据结构，等待你确认后执行。', status: 'needs_confirmation' },
    { id: 'dispatch_sub_agents', label: '派发子 Agent 工作单', detail: '确认后会把后端接口和前端结算入口分派给对应子 Agent。', status: 'pending' },
    { id: 'verify_and_summarize', label: '验收结果并总结给用户', detail: '完成后主 Agent 会核对改动、验证、风险和下一步。', status: 'pending' },
  ],
  impact_scope: { projects: ['api', 'web'], areas: ['后端接口与数据契约', '前端页面与交互'], multi_agent: true },
  read_only_exploration: { summary: '只读探索已完成，确认支付表和结算页都在影响范围内。', projects: ['api', 'web'], knowledge_used: true, code_snapshot_used: true },
  acceptance: ['必须有主 Agent 计划和子 Agent 结构化结果说明', '涉及代码时必须有系统捕获的文件变更', '必须有已执行验证记录和最终总结'],
  permission_boundaries: ['确认前不得修改文件', '确认前不得派发子 Agent 执行写入操作', '删除、迁移或部署必须再次等待用户确认'],
}

const groupIntakeTaskCard = {
  version: 1,
  visible: true,
  task_id: 'task-group-intake-plan',
  title: '调整支付流程',
  goal: '调整支付流程，先确认支付数据结构和前端结算入口的影响范围。',
  phase: 'needs_user',
  phase_label: '待确认',
  progress: 16,
  active_agents: [],
  agents: [],
  plan_mode: groupIntakePlanMode,
  completed: ['已理解需求', '已完成只读探索'],
  blockers: ['等待你确认执行前计划'],
  next_action: '请确认执行前计划；确认后主 Agent 才会派发子 Agent。',
  actions: [
    { id: 'confirm_plan', label: '确认执行', kind: 'confirm_plan', tone: 'primary' },
    { id: 'revise_plan', label: '调整计划', kind: 'revise_plan', tone: 'warning' },
  ],
  technical: {
    trace_id: 'trace-group-intake-plan',
    plan_mode: groupIntakePlanMode,
    raw_payload: 'CCM_AGENT_RECEIPT raw payload should stay folded',
  },
}

const groupIntakeMessage = {
  id: 'message-group-intake-plan',
  role: 'assistant',
  agent: 'coordinator',
  type: 'project_task_intake',
  content: '我先按只读方式看了一轮：调整支付流程。这个需求涉及支付数据结构，需要先确认范围，我已经整理好执行前计划。你确认后，我再派发子 Agent 开始修改。',
  timestamp: now,
  task_id: 'task-group-intake-plan',
  task: {
    id: 'task-group-intake-plan',
    title: '调整支付流程',
    status: 'pending',
    status_detail: '执行前计划已准备好，等待你确认后才会派发子 Agent',
    workflow_type: 'daily_dev',
    intake_state: 'awaiting_confirmation',
  },
  queue: { queued: false, message: '任务已创建，等待用户确认执行前计划' },
  intakeSummary: {
    schema: 'ccm-group-task-intake-summary-v1',
    title: '接下来',
    status: 'waiting_confirmation',
    status_label: '等待确认',
    headline: '主 Agent 已完成只读探索；确认计划后才会派发子 Agent 开始修改。',
    items: [
      { label: '负责主 Agent', value: 'coordinator' },
      { label: '执行策略', value: '确认后派发' },
      { label: '风险', value: '高风险' },
    ],
    next_action: '等待用户确认执行前计划',
  },
  intake_summary: null,
  planMode: groupIntakePlanMode,
  plan_mode: groupIntakePlanMode,
  taskCard: groupIntakeTaskCard,
  task_card: groupIntakeTaskCard,
  taskRuntime: {
    taskId: 'task-group-intake-plan',
    status: 'pending',
    statusText: '执行前计划已准备好，等待你确认后才会派发子 Agent',
    taskCard: groupIntakeTaskCard,
    task_card: groupIntakeTaskCard,
  },
  task_runtime: null,
}

const renderedPlanAlignment = {
  schema: 'ccm-main-agent-plan-alignment-v1',
  title: '计划执行核对',
  status: 'aligned',
  status_label: '已对齐',
  headline: '主 Agent 已把执行结果和原计划逐项核对，当前没有发现计划偏离。',
  checks: [
    { id: 'plan_confirmed', label: '计划已进入执行', ok: true, detail: '已按确认后的计划进入执行链路', evidence: [] },
    { id: 'criterion_1', label: '刷新页面后会恢复登录态', ok: true, detail: '主 Agent 已在最终验收中覆盖该计划项', evidence: ['登录状态刷新后的恢复逻辑已经完成。'] },
    { id: 'criterion_2', label: '登录状态恢复必须有文件改动', ok: true, detail: '已捕获 2 个文件改动', evidence: ['frontend/src/stores/login.js', 'frontend/src/views/Login.vue'] },
    { id: 'criterion_3', label: 'npm run test:login-state 必须通过', ok: true, detail: '已执行 1 项验证', evidence: ['npm run test:login-state'] },
  ],
  deviations: [],
  next_action: '可以查看最终总结和改动明细。',
  display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
}

const renderedUserHandoff = {
  schema: 'ccm-main-agent-user-handoff-v1',
  title: '接下来建议',
  status: 'ready',
  status_label: '可验收',
  headline: '这轮任务已经收尾，建议先核对交付总结和改动明细。',
  summary_cards: [
    { id: 'completed', label: '完成内容', value: '登录状态刷新后的恢复逻辑已经完成。', tone: 'ok' },
    { id: 'verification', label: '验证状态', value: '已执行 1 项验证', tone: 'ok' },
    { id: 'attention', label: '待关注', value: '暂无需要额外关注的风险', tone: 'ok' },
    { id: 'next', label: '下一步', value: 'web 产生了 2 个文件改动。', tone: 'ok' },
  ],
  primary_action: { id: 'view_changes', label: '查看改动', detail: 'web 产生了 2 个文件改动。', kind: 'view_changes', tone: 'primary' },
  secondary_actions: [
    { id: 'review_delivery', label: '核对交付总结', detail: '查看完成内容、验证结果和风险提示。', kind: 'review_delivery', tone: 'outline' },
    { id: 'continue_request', label: '继续提出新要求', detail: '如果结果符合预期，可以直接继续补充下一步需求。', kind: 'continue', tone: 'outline' },
  ],
  evidence: ['计划：执行前计划：登录态恢复执行计划', '改动：2 个文件', '验证：1 项已执行', '验收：主 Agent 验收：已通过', '复核：独立复核：已通过', '计划核对：已对齐'],
  unresolved: [],
  next_action: 'web 产生了 2 个文件改动。',
  technical_hint: '底层执行记录和排障信息默认收在技术详情里。',
  display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
}

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
    dispatch_policy: { action: 'delegate', reason: '明确开发任务', nextStep: '等待子 Agent 结果说明' },
    reason: '明确开发任务',
  },
  display_stream: {
    schema: 'ccm-streamlined-display-v1',
    user_visible_text: '已把明确需求转成项目任务，并进入执行队列。',
    tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: '读取/检查 2 项，协作通道 1 个' },
    dispatch_launch_summary: {
      schema: 'ccm-main-agent-dispatch-launch-summary-v1',
      title: '已派发的工作',
      headline: '我已把「修复登录状态刷新问题」拆给 1 个子 Agent：web。',
      rows: [
        {
          id: 'dispatch-web',
          agent: 'web',
          role: '项目 Agent',
          task: '修复登录状态恢复逻辑，并提交结构化结果说明。',
          reason: '前端负责登录状态恢复链路。',
          depends_on: [],
          status: 'dispatched',
          status_label: '已派发',
        },
      ],
      acceptance: ['每个子 Agent 都需要提交结构化结果说明。', '主 Agent 会统一核对文件、验证和阻塞情况。'],
      next_action: '等待子 Agent 返回结果说明；有缺口时主 Agent 会定向补充或请你确认。',
      technical_hint: '子 Agent 的完整工作单、Trace 和底层执行记录默认收在技术详情里。',
    },
    technical_details: [
      { id: 'troubleshooting', title: '排障摘要', items: [] },
      { id: 'records', title: '完整记录', items: [{ label: 'Trace', value: 'trace-task-visible' }] },
    ],
    progress_checkpoints: {
      schema: 'ccm-main-agent-progress-checkpoints-v1',
      title: '关键进展',
      display_policy: { user_visible: true, raw_events_default_collapsed: true },
      items: [
        { id: 'cp-plan', label: '主 Agent 已制定协作计划', detail: '已确认登录态刷新问题由前端状态恢复链路处理。', status: 'done' },
        { id: 'cp-dispatch', label: '已派发给子 Agent', detail: 'web 正在修改登录状态恢复逻辑。', status: 'done' },
        { id: 'cp-review', label: '已检查交付质量', detail: '主 Agent 已核对文件变更和验证结果。', status: 'done' },
        { id: 'cp-complete', label: '任务交付完成', detail: '登录状态刷新后的恢复逻辑已经完成。', status: 'done' },
      ],
    },
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
  dispatch_launch_summary: null,
  permissions: [],
  observation: { intent_kind: 'task' },
  verify: { passed: true, blocked_actions: [], conclusion: '任务已进入执行链路' },
  reply: { kind: 'task_card', preview: '任务已创建。' },
}
taskDecision.user_plan_steps = taskDecision.todo_plan.steps
taskDecision.dispatch_launch_summary = taskDecision.display_stream.dispatch_launch_summary

const taskMissingVerificationDecision = JSON.parse(JSON.stringify(taskDecision))
taskMissingVerificationDecision.trace_id = 'trace-task-missing-verification'
taskMissingVerificationDecision.display_stream.user_visible_text = '已把明确需求转成项目任务，计划仍需要补齐验收步骤。'
taskMissingVerificationDecision.decision.dispatch_policy.nextStep = '先补齐验收步骤'
taskMissingVerificationDecision.verify = { passed: false, blocked_actions: ['generate_final_reply'], conclusion: '计划缺少验收步骤，暂不进入最终总结' }
taskMissingVerificationDecision.todo_plan.steps = [
  { id: 'understand_intent', content: '确认需求目标和涉及范围', activeForm: '正在确认需求目标', status: 'completed' },
  { id: 'change_code', content: '修改登录态恢复逻辑', activeForm: '正在修改登录态恢复逻辑', status: 'in_progress' },
  { id: 'delivery_note', content: '整理交付说明', activeForm: '正在整理交付说明', status: 'pending' },
]
taskMissingVerificationDecision.todo_plan.verification_nudge = true
taskMissingVerificationDecision.todo_plan.verification_reminder = {
  schema: 'ccm-main-agent-plan-verification-reminder-v1',
  status: 'needs_verification_step',
  title: '还缺验收步骤',
  headline: '完成前需要补一项真实验证，或者说明为什么当前不能验证。',
  reason: '计划已有 3 项以上，但没有显式的验证或验收步骤。',
  next_action: '主 Agent 会把验收补进计划，再继续交付总结。',
  display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
}
taskMissingVerificationDecision.user_plan_steps = taskMissingVerificationDecision.todo_plan.steps

const taskCompletedDecision = JSON.parse(JSON.stringify(taskDecision))
taskCompletedDecision.display_stream.user_visible_text = '登录状态刷新后的恢复逻辑已经完成，交付总结已整理。'
taskCompletedDecision.decision.dispatch_policy.nextStep = '交付总结已生成'
taskCompletedDecision.verify.conclusion = '任务已完成并生成交付总结'
taskCompletedDecision.reply.preview = '任务已完成。'
taskCompletedDecision.todo_plan.steps = taskCompletedDecision.todo_plan.steps.map(step => ({ ...step, status: 'completed', actions: [] }))
taskCompletedDecision.user_plan_steps = taskCompletedDecision.todo_plan.steps

const workchainTodoPlan = {
  schema: 'ccm-main-agent-workchain-todo-v1',
  source: 'workchain',
  title: '我准备这样处理',
  display_policy: { user_visible: true, quiet_completed: true, hide_for_ordinary_conversation: false, technical_default_collapsed: true },
  steps: [
    { id: 'plan', content: '确认目标和验收标准', activeForm: '正在确认目标和验收标准', active_form: '正在确认目标和验收标准', status: 'completed' },
    { id: 'dispatch', content: '派发给子 Agent 执行', activeForm: '正在派发子 Agent 执行', active_form: '正在派发子 Agent 执行', status: 'completed' },
    { id: 'review', content: '跟踪 TestAgent 独立复核', activeForm: '正在跟踪 TestAgent 独立复核', active_form: '正在跟踪 TestAgent 独立复核', status: 'in_progress' },
    { id: 'summarize', content: '总结完成内容和下一步', activeForm: '正在整理用户可读总结', active_form: '正在整理用户可读总结', status: 'pending' },
  ],
  current_step: { id: 'review', content: '跟踪 TestAgent 独立复核', activeForm: '正在跟踪 TestAgent 独立复核', active_form: '正在跟踪 TestAgent 独立复核', status: 'in_progress' },
  progress: { completed: 2, total: 4 },
  next_action: '等待 TestAgent 复核结论，主 Agent 再决定是否返工或总结。',
}
const workchainTodoDisplayStream = {
  schema: 'ccm-streamlined-display-v2',
  user_visible_text: '主 Agent 正在按计划推进任务，并等待 TestAgent 的独立复核结论。',
  tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: '协作通道 1 个，验证 1 项' },
  workchain: {
    schema: 'ccm-main-agent-workchain-v1',
    mode: 'project_task',
    user_visible_text: '主 Agent 正在按计划推进任务，并等待 TestAgent 的独立复核结论。',
    stages: [
      { id: 'plan', label: '计划', status: 'completed' },
      { id: 'execute', label: '执行', status: 'completed' },
      { id: 'review', label: '复核', status: 'in_progress' },
      { id: 'summarize', label: '总结', status: 'pending' },
    ],
    todo_plan: workchainTodoPlan,
    todoPlan: workchainTodoPlan,
    progress_checkpoints: {
      schema: 'ccm-main-agent-progress-checkpoints-v1',
      title: '关键进展',
      display_policy: { user_visible: true },
      items: [
        { id: 'cp-workchain-plan', label: '主 Agent 已生成计划', detail: '计划包含执行、复核和总结。', status: 'done' },
        { id: 'cp-workchain-review', label: '正在等待 TestAgent 复核', detail: '复核结论会决定是否返工。', status: 'active' },
      ],
    },
    completion_summary: { evidence: ['已生成计划', '已派发执行', '等待 TestAgent 独立复核'] },
    technical_details: [{ id: 'records', title: '完整记录', items: [{ label: 'Trace', value: 'trace-workchain-todo' }] }],
  },
  todo_plan: workchainTodoPlan,
  todoPlan: workchainTodoPlan,
  progress_checkpoints: {
    schema: 'ccm-main-agent-progress-checkpoints-v1',
    title: '关键进展',
    display_policy: { user_visible: true },
    items: [
      { id: 'cp-workchain-plan', label: '主 Agent 已生成计划', detail: '计划包含执行、复核和总结。', status: 'done' },
      { id: 'cp-workchain-review', label: '正在等待 TestAgent 复核', detail: '复核结论会决定是否返工。', status: 'active' },
    ],
  },
  technical_details: [{ id: 'records', title: '完整记录', items: [{ label: 'Trace', value: 'trace-workchain-todo' }] }],
}
const workchainTodoCard = {
  version: 1,
  visible: true,
  task_id: 'task-workchain-todo',
  title: '主 Agent 与 TestAgent 对接',
  goal: '让主 Agent 等待 TestAgent 独立复核后再总结。',
  phase: 'executing',
  phase_label: '复核中',
  status: 'in_progress',
  progress: 62,
  display_stream: workchainTodoDisplayStream,
  progress_checkpoints: workchainTodoDisplayStream.progress_checkpoints,
  completed: ['已生成计划', '已派发执行'],
  blockers: [],
  next_action: '等待 TestAgent 复核结论。',
  technical: { trace_id: 'trace-workchain-todo', display_stream: workchainTodoDisplayStream },
}
const workchainCompletedArchivedTodoPlan = {
  ...workchainTodoPlan,
  steps: workchainTodoPlan.steps.map(step => ({ ...step, status: 'completed', actions: [] })),
  visible_steps: [],
  visibleSteps: [],
  archived_steps_count: workchainTodoPlan.steps.length,
  archivedStepsCount: workchainTodoPlan.steps.length,
  archive_summary: '计划已全部完成，主视图只保留最终总结；完整步骤和底层记录可在技术详情中查看。',
  archiveSummary: '计划已全部完成，主视图只保留最终总结；完整步骤和底层记录可在技术详情中查看。',
  current_step: null,
  currentStep: null,
  completed_count: workchainTodoPlan.steps.length,
  total_count: workchainTodoPlan.steps.length,
  progress_label: `${workchainTodoPlan.steps.length}/${workchainTodoPlan.steps.length}`,
  display_policy: {
    ...workchainTodoPlan.display_policy,
    archive_completed_todo: true,
    archiveCompletedTodo: true,
    archived_when_complete: true,
    archivedWhenComplete: true,
    visible_when_completed: false,
    visibleWhenCompleted: false,
  },
}
const workchainCompletedArchivedCard = {
  version: 1,
  visible: true,
  task_id: 'task-workchain-completed-archived',
  title: '主 Agent 与 TestAgent 对接',
  goal: '完成主 Agent 与 TestAgent 的计划、复核和总结闭环。',
  phase: 'completed',
  phase_label: '已完成',
  status: 'completed',
  progress: 100,
  display_stream: {
    schema: 'ccm-streamlined-display-v2',
    user_visible_text: '已完成主 Agent 与 TestAgent 的连接闭环，最终总结已整理。',
    workchain: {
      schema: 'ccm-main-agent-workchain-v1',
      mode: 'project_task',
      status: 'completed',
      user_visible_text: '已完成主 Agent 与 TestAgent 的连接闭环，最终总结已整理。',
      stages: workchainTodoDisplayStream.workchain.stages.map(stage => ({ ...stage, status: 'completed' })),
      todo_plan: workchainCompletedArchivedTodoPlan,
      todoPlan: workchainCompletedArchivedTodoPlan,
      completion_summary: {
        evidence: ['主 Agent 已生成计划', 'TestAgent 已完成独立复核', '最终总结已整理'],
        verification: ['TestAgent 独立复核已通过'],
        independent_review: ['TestAgent：已通过'],
        terminal: true,
      },
      technical_details: [{ id: 'records', title: '完整记录', items: [{ label: 'Trace', value: 'trace-workchain-completed-archived' }] }],
    },
    todo_plan: workchainCompletedArchivedTodoPlan,
    todoPlan: workchainCompletedArchivedTodoPlan,
    technical_details: [{ id: 'records', title: '完整记录', items: [{ label: 'Trace', value: 'trace-workchain-completed-archived' }] }],
  },
  todo_plan: workchainCompletedArchivedTodoPlan,
  todoPlan: workchainCompletedArchivedTodoPlan,
  completion_card: {
    schema: 'ccm-main-agent-completion-card-v1',
    title: '最终交付总览',
    status: 'completed',
    status_label: '已完成',
    headline: '已完成主 Agent 与 TestAgent 的连接闭环，最终总结已整理。',
    metrics: [
      { id: 'status', label: '状态', value: '已完成' },
      { id: 'verification', label: '验证', value: 'TestAgent 已复核' },
      { id: 'risk', label: '风险', value: '暂无需要额外关注的风险' },
    ],
    highlights: ['计划、执行、TestAgent 复核和总结都已收尾。'],
    verification: ['TestAgent 独立复核已通过。'],
    acceptance: ['主 Agent 已把复核结论纳入最终验收。'],
    risks: ['暂无需要你额外处理的风险。'],
    next_action: '可以继续补充新要求，主 Agent 会重新形成新的计划。',
    technical_hint: '已完成的 Todo 已归档，完整步骤保留在技术详情里。',
  },
  completed: ['计划已完成', 'TestAgent 复核已完成', '最终总结已整理'],
  blockers: [],
  next_action: '可以继续补充新要求，主 Agent 会重新形成新的计划。',
  technical: { trace_id: 'trace-workchain-completed-archived' },
}
const workchainQualityFollowup = {
  schema: 'ccm-main-agent-quality-followup-v1',
  title: '交付总结还需补齐',
  status: 'needs_attention',
  status_label: '需补齐',
  headline: '这轮任务已经有处理结果，但最终交付总结还缺少可验收的信息。',
  missing: ['交付证据', '验证结果', '验收结论'],
  evidence: ['已整理任务目标', '已看到执行完成信号'],
  next_action: '先补齐交付证据、验证结果和验收结论，再给出最终交付总结。',
  display_policy: { user_visible: true, show_for_ordinary_conversation: false, technical_default_collapsed: true, hide_internal_protocols: true },
}
const workchainQualityFollowupTodoPlan = {
  schema: 'ccm-main-agent-workchain-todo-v1',
  source: 'workchain',
  title: '协作群当前计划',
  display_policy: { user_visible: true, quiet_completed: true, hide_for_ordinary_conversation: false, archive_completed_todo: false, technical_default_collapsed: true },
  steps: [
    ...workchainTodoPlan.steps.map(step => ({ ...step, status: 'completed', actions: [] })),
    { id: 'quality-followup', content: '补齐交付总结', activeForm: '正在补齐交付证据、验证结果、验收结论', active_form: '正在补齐交付证据、验证结果、验收结论', status: 'in_progress', detail: '先补齐交付证据、验证结果和验收结论，再给出最终交付总结。', source: 'final_summary_quality' },
  ],
  current_step: { id: 'quality-followup', content: '补齐交付总结', activeForm: '正在补齐交付证据、验证结果、验收结论', active_form: '正在补齐交付证据、验证结果、验收结论', status: 'in_progress' },
  currentStep: { id: 'quality-followup', content: '补齐交付总结', activeForm: '正在补齐交付证据、验证结果、验收结论', active_form: '正在补齐交付证据、验证结果、验收结论', status: 'in_progress' },
  completed_count: workchainTodoPlan.steps.length,
  total_count: workchainTodoPlan.steps.length + 1,
  progress_label: `${workchainTodoPlan.steps.length}/${workchainTodoPlan.steps.length + 1}`,
  visible_steps: [],
  visibleSteps: [],
  quality_followup_required: true,
  qualityFollowupRequired: true,
  quality_followup: workchainQualityFollowup,
  qualityFollowup: workchainQualityFollowup,
}
workchainQualityFollowupTodoPlan.visible_steps = workchainQualityFollowupTodoPlan.steps
workchainQualityFollowupTodoPlan.visibleSteps = workchainQualityFollowupTodoPlan.steps
const workchainQualityFollowupDisplayStream = {
  schema: 'ccm-streamlined-display-v2',
  user_visible_text: '任务已有处理结果，但最终交付总结还在补齐，还缺少交付证据、验证结果、验收结论。下一步：先补齐交付证据、验证结果和验收结论，再给出最终交付总结。',
  tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: '已处理任务结果，正在补齐总结证据' },
  workchain: {
    schema: 'ccm-main-agent-workchain-v1',
    mode: 'project_task',
    status: 'completed',
    user_visible_text: '任务已有处理结果，但最终交付总结还在补齐，还缺少交付证据、验证结果、验收结论。下一步：先补齐交付证据、验证结果和验收结论，再给出最终交付总结。',
    stages: workchainTodoDisplayStream.workchain.stages.map(stage => ({ ...stage, status: 'completed' })),
    completion_summary: {
      evidence: ['任务已有处理结果'],
      final_summary_quality: { required: true, passed: false, missing: ['交付证据', '验证结果', '验收结论'] },
      quality_followup: workchainQualityFollowup,
    },
    todo_plan: workchainQualityFollowupTodoPlan,
    todoPlan: workchainQualityFollowupTodoPlan,
    progress_checkpoints: {
      schema: 'ccm-main-agent-progress-checkpoints-v1',
      title: '关键进展',
      display_policy: { user_visible: true },
      items: [
        { id: 'final-summary-checkpoint', label: '已整理本轮总结', detail: '任务已有处理结果', status: 'done' },
        { id: 'quality-followup-checkpoint', label: '正在补齐交付总结', detail: '先补齐交付证据、验证结果和验收结论，再给出最终交付总结。', status: 'active' },
      ],
    },
    technical_details: [{ id: 'records', title: '完整记录', items: [{ label: 'Trace', value: 'trace-workchain-quality-followup' }, { label: 'Raw', value: 'CCM_AGENT_RECEIPT raw payload' }] }],
  },
  todo_plan: workchainQualityFollowupTodoPlan,
  todoPlan: workchainQualityFollowupTodoPlan,
  progress_checkpoints: {
    schema: 'ccm-main-agent-progress-checkpoints-v1',
    title: '关键进展',
    display_policy: { user_visible: true },
    items: [
      { id: 'final-summary-checkpoint', label: '已整理本轮总结', detail: '任务已有处理结果', status: 'done' },
      { id: 'quality-followup-checkpoint', label: '正在补齐交付总结', detail: '先补齐交付证据、验证结果和验收结论，再给出最终交付总结。', status: 'active' },
    ],
  },
  technical_details: [{ id: 'records', title: '完整记录', items: [{ label: 'Trace', value: 'trace-workchain-quality-followup' }, { label: 'Raw', value: 'CCM_AGENT_RECEIPT raw payload' }] }],
}
const workchainQualityFollowupCard = {
  version: 1,
  visible: true,
  task_id: 'task-workchain-quality-followup',
  title: '主 Agent 最终总结补齐',
  goal: '确保最终交付总结包含证据、验证和验收结论。',
  phase: 'completed',
  phase_label: '总结待补齐',
  status: 'completed',
  progress: 90,
  display_stream: workchainQualityFollowupDisplayStream,
  todo_plan: workchainQualityFollowupTodoPlan,
  todoPlan: workchainQualityFollowupTodoPlan,
  progress_checkpoints: workchainQualityFollowupDisplayStream.progress_checkpoints,
  quality_followup: workchainQualityFollowup,
  qualityFollowup: workchainQualityFollowup,
  completed: ['任务已有处理结果'],
  blockers: [],
  next_action: '先补齐交付证据、验证结果和验收结论。',
  technical: { trace_id: 'trace-workchain-quality-followup', display_stream: workchainQualityFollowupDisplayStream },
}
const ordinaryWorkchainTodoPlan = {
  ...workchainTodoPlan,
  display_policy: { user_visible: true, quiet_completed: true, hide_for_ordinary_conversation: true, technical_default_collapsed: true },
  steps: [
    { id: 'chat', content: '直接回答普通问话', activeForm: '正在回答普通问话', active_form: '正在回答普通问话', status: 'completed' },
  ],
}
const ordinaryWorkchainTodoCard = {
  version: 1,
  visible: true,
  task_id: 'task-ordinary-workchain-todo',
  title: '普通问话',
  goal: '解释 TestAgent 当前状态。',
  phase: 'completed',
  phase_label: '已回复',
  status: 'completed',
  progress: 100,
  display_stream: {
    schema: 'ccm-streamlined-display-v2',
    user_visible_text: 'TestAgent 的业务流程由另一个 Agent 处理，我只会连接主 Agent 和 TestAgent 的边界。',
    tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: '本轮没有需要展示的工具调用' },
    workchain: { schema: 'ccm-main-agent-workchain-v1', mode: 'conversation', todo_plan: ordinaryWorkchainTodoPlan, todoPlan: ordinaryWorkchainTodoPlan, technical_details: [], completion_summary: { evidence: [] } },
    todo_plan: ordinaryWorkchainTodoPlan,
    todoPlan: ordinaryWorkchainTodoPlan,
    technical_details: [],
  },
  completed: [],
  blockers: [],
  next_action: '继续等待你的下一步要求。',
}

const deliveryReport = {
  schema: 'ccm-main-agent-delivery-report-v1',
  title: '修复登录状态刷新问题',
  status: 'done',
  status_label: '已完成',
  headline: '登录状态刷新后的恢复逻辑已经完成。',
  sections: [
    { id: 'completed', title: '完成内容', items: ['刷新页面后会恢复登录态。'] },
    { id: 'plan_review', title: '计划回顾', items: ['执行前计划：登录态恢复执行计划', '计划步骤：确认登录态恢复范围；修复刷新后恢复逻辑；运行验证', '确认补充要求：刷新后不要打断用户当前页面', '计划核对：已对齐'] },
    { id: 'scope', title: '涉及范围', items: ['frontend/src/stores/login.js', 'frontend/src/views/Login.vue'] },
    { id: 'verification', title: '验证结果', items: ['npm run test:login-state'] },
    { id: 'verification_evidence', title: '验收证据', items: ['已实际执行 1 项验证：npm run test:login-state', '项目配置要求的验证命令：已覆盖。', '外部 Runner 证据 1 项：验证来源已记录。'] },
    { id: 'acceptance', title: '验收结论', items: ['主 Agent 验收：已通过', '计划核对：已对齐'] },
    { id: 'independent_review', title: '复核结论', items: ['独立复核：已通过', 'TestAgent：已通过 - 已复核登录恢复逻辑和验证记录，未发现阻塞风险。', '文件上传：已验证 2 个上传文件（notes.txt、meta.json）', '文件下载：已验证 1 个下载文件（tasks.csv）', '浏览器交互：已执行 2 个操作、3 个断言，未发现失败步骤', '浏览器网络：记录 4 个请求、4 个响应，未发现网络错误'] },
    { id: 'risks', title: '风险与待确认', items: ['暂无需要你额外处理的风险。'] },
    { id: 'user_handoff', title: '接下来建议', items: ['查看改动：web 产生了 2 个文件改动。', '核对交付总结：查看完成内容、验证结果和风险提示。'] },
    { id: 'next', title: '下一步', items: ['可以查看改动详情，或继续补充新的要求。'] },
  ],
  files: ['frontend/src/stores/login.js', 'frontend/src/views/Login.vue'],
  plan_review: ['执行前计划：登录态恢复执行计划', '计划步骤：确认登录态恢复范围；修复刷新后恢复逻辑；运行验证', '确认补充要求：刷新后不要打断用户当前页面', '计划核对：已对齐'],
  planReview: ['执行前计划：登录态恢复执行计划', '计划步骤：确认登录态恢复范围；修复刷新后恢复逻辑；运行验证', '确认补充要求：刷新后不要打断用户当前页面', '计划核对：已对齐'],
  change_summary: renderedChangeSummary,
  verification: ['npm run test:login-state'],
  verification_evidence: {
    schema: 'ccm-main-agent-verification-evidence-v1',
    title: '验收证据',
    status: 'ready',
    status_label: '证据充分',
    metric_value: '1 项实际执行',
    metric_detail: '已实际执行 1 项验证：npm run test:login-state；外部 Runner 证据 1 项：验证来源已记录。',
    metric_tone: 'success',
    executed_count: 1,
    failed_count: 0,
    suggested_count: 0,
    missing_required_count: 0,
    external_runner_count: 1,
    required_gate_passed: true,
    source_gate_passed: true,
    executed: ['npm run test:login-state'],
    failed: [],
    suggested: [],
    missing_required: [],
    items: ['已实际执行 1 项验证：npm run test:login-state', '项目配置要求的验证命令：已覆盖。', '外部 Runner 证据 1 项：验证来源已记录。'],
    next_action: '可以结合改动明细和验收结论一起核对。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
  },
  verificationEvidence: {
    schema: 'ccm-main-agent-verification-evidence-v1',
    title: '验收证据',
    status: 'ready',
    status_label: '证据充分',
    items: ['已实际执行 1 项验证：npm run test:login-state', '项目配置要求的验证命令：已覆盖。', '外部 Runner 证据 1 项：验证来源已记录。'],
  },
  acceptance: ['主 Agent 验收：已通过', '计划核对：已对齐'],
  independent_review: ['独立复核：已通过', 'TestAgent：已通过 - 已复核登录恢复逻辑和验证记录，未发现阻塞风险。', '文件上传：已验证 2 个上传文件（notes.txt、meta.json）', '文件下载：已验证 1 个下载文件（tasks.csv）', '浏览器交互：已执行 2 个操作、3 个断言，未发现失败步骤', '浏览器网络：记录 4 个请求、4 个响应，未发现网络错误'],
  independentReview: ['独立复核：已通过', 'TestAgent：已通过 - 已复核登录恢复逻辑和验证记录，未发现阻塞风险。', '文件上传：已验证 2 个上传文件（notes.txt、meta.json）', '文件下载：已验证 1 个下载文件（tasks.csv）', '浏览器交互：已执行 2 个操作、3 个断言，未发现失败步骤', '浏览器网络：记录 4 个请求、4 个响应，未发现网络错误'],
  independent_review_gate: { required: true, pass: true, reason: '复杂变更已完成独立复核。', evidence: ['TestAgent verdict: passed'] },
  independentReviewGate: { required: true, pass: true, reason: '复杂变更已完成独立复核。', evidence: ['TestAgent verdict: passed'] },
  risks: [],
  next_action: ['可以查看改动详情，或继续补充新的要求。'],
  user_handoff: renderedUserHandoff,
  userHandoff: renderedUserHandoff,
  completion_card: {
    schema: 'ccm-main-agent-completion-card-v1',
    title: '最终交付总览',
    status: 'done',
    status_label: '已完成',
    headline: '登录状态刷新后的恢复逻辑已经完成。',
    metrics: [
      { id: 'status', label: '状态', value: '已完成', tone: 'success' },
      { id: 'scope', label: '涉及范围', value: '2 个文件', detail: 'frontend/src/stores/login.js；frontend/src/views/Login.vue' },
      { id: 'verification', label: '验证', value: '1 项实际执行', detail: '已实际执行 1 项验证：npm run test:login-state；外部 Runner 证据 1 项：验证来源已记录。', tone: 'success' },
      { id: 'acceptance', label: '验收', value: '已通过', detail: '主 Agent 验收：已通过', tone: 'success' },
      { id: 'risk', label: '风险', value: '暂无需要额外关注的风险', tone: 'success' },
    ],
    highlights: ['刷新页面后会恢复登录态。'],
    verification: ['已实际执行 1 项验证：npm run test:login-state', '项目配置要求的验证命令：已覆盖。', '外部 Runner 证据 1 项：验证来源已记录。'],
    verification_evidence: {
      schema: 'ccm-main-agent-verification-evidence-v1',
      title: '验收证据',
      status: 'ready',
      status_label: '证据充分',
      items: ['已实际执行 1 项验证：npm run test:login-state', '项目配置要求的验证命令：已覆盖。', '外部 Runner 证据 1 项：验证来源已记录。'],
    },
    acceptance: ['主 Agent 验收：已通过', '计划核对：已对齐'],
    risks: ['暂无需要你额外处理的风险。'],
    next_action: '可以查看改动详情，或继续补充新的要求。',
    technical_hint: '底层执行记录和排障信息默认收在技术详情里。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
  },
  pickup_summary: {
    schema: 'ccm-main-agent-pickup-summary-v1',
    title: '回来继续看这里',
    status: 'done',
    status_label: '已完成',
    headline: '登录状态刷新后的恢复逻辑已经完成。',
    current_state: '可以直接查看完成内容、涉及范围和验证结果；原始执行记录在技术详情里。',
    review_items: ['复核：独立复核：已通过', '验收：主 Agent 验收：已通过', '计划：执行前计划：登录态恢复执行计划', '改动：frontend/src/stores/login.js', '验证：npm run test:login-state'],
    resume_action: '可以查看改动详情，或继续补充新的要求。',
    technical_hint: '底层执行记录和排障信息默认收在技术详情里。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
  },
}

const planGapDeliveryReport = {
  schema: 'ccm-main-agent-delivery-report-v1',
  title: '登录修复验收缺口',
  status: 'failed',
  status_label: '未完成',
  headline: '登录修复还缺验证证据。',
  sections: [
    { id: 'completed', title: '完成内容', items: ['已整理登录修复当前状态。'] },
    { id: 'plan_review', title: '计划回顾', items: ['执行前计划：登录修复执行计划', '计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）', '计划步骤：修复登录恢复逻辑；运行登录验证', '计划核对：仍有缺口'] },
    { id: 'verification', title: '验证结果', items: ['npm test -- --run login 失败'] },
    { id: 'verification_evidence', title: '验收证据', items: ['失败验证 1 项：npm test -- --run login 失败', '项目必需验证缺口 1 项：web：npm run test:login'] },
    { id: 'acceptance', title: '验收结论', items: ['最终验收：未通过，仍有待补齐项', '计划核对：仍有缺口'] },
    { id: 'risks', title: '未完成原因', items: ['缺少测试环境变量'] },
    { id: 'next_action', title: '下一步', items: ['先补齐计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）'] },
  ],
  files: [],
  plan_review: ['执行前计划：登录修复执行计划', '计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）', '计划步骤：修复登录恢复逻辑；运行登录验证', '计划核对：仍有缺口'],
  planReview: ['执行前计划：登录修复执行计划', '计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）', '计划步骤：修复登录恢复逻辑；运行登录验证', '计划核对：仍有缺口'],
  verification: ['npm test -- --run login 失败'],
  acceptance: ['最终验收：未通过，仍有待补齐项', '计划核对：仍有缺口'],
  risks: ['缺少测试环境变量'],
  next_action: ['先补齐计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）'],
  pickup_summary: {
    schema: 'ccm-main-agent-pickup-summary-v1',
    title: '恢复处理时先看这里',
    status: 'failed',
    status_label: '未完成',
    headline: '登录修复还缺验证证据。',
    current_state: '可以从计划缺口继续处理，原始执行记录在技术详情里。',
    review_items: ['计划：计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）', '待确认：缺少测试环境变量'],
    resume_action: '先补齐计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）',
    technical_hint: '底层执行记录和排障信息默认收在技术详情里。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
  },
  user_handoff: {
    schema: 'ccm-main-agent-user-handoff-v1',
    title: '接下来建议',
    status: 'failed',
    status_label: '未完成',
    headline: '这轮任务没有完整完成，先补齐计划缺口再继续验收。',
    primary_action: {
      id: 'retry_or_continue',
      label: '补齐计划缺口后继续',
      detail: '计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）',
      kind: 'retry',
      tone: 'primary',
    },
    secondary_actions: [{
      id: 'review_verification',
      label: '核对验证结果',
      detail: '已整理 1 项验证记录。',
      kind: 'review_delivery',
      tone: 'outline',
    }],
    evidence: ['计划：执行前计划：登录修复执行计划', '计划缺口：1 项', '验证：1 项已执行', '待确认：1 项'],
    unresolved: ['计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）', '缺少测试环境变量'],
    next_action: '计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）',
    technical_hint: '底层执行记录和排障信息默认收在技术详情里。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
  },
}

const planGapDeliveryCard = {
  version: 1,
  visible: true,
  task_id: 'task-plan-gap-delivery',
  title: '登录修复验收缺口',
  goal: '修复登录恢复并完成验证。',
  phase: 'failed',
  phase_label: '待补齐',
  progress: 78,
  active_agents: [],
  agents: [],
  completed: ['已整理登录修复当前状态'],
  blockers: ['缺少测试环境变量'],
  next_action: '先补齐计划缺口：登录恢复验证通过（还没有系统捕获 npm run test:login 的通过记录）',
  delivery: { headline: planGapDeliveryReport.headline, files: [], verification: planGapDeliveryReport.verification, risks: planGapDeliveryReport.risks, acceptance_passed: false },
  delivery_report: planGapDeliveryReport,
  pickup_summary: planGapDeliveryReport.pickup_summary,
  user_handoff: planGapDeliveryReport.user_handoff,
  technical: { trace_id: 'trace-plan-gap-delivery', user_handoff: planGapDeliveryReport.user_handoff },
  actions: [],
}

const testAgentExecutionPlanFixture = {
  schema: 'ccm-test-agent-execution-plan-v1',
  valid: true,
  workOrderId: 'wo-test-agent-render',
  artifactDir: 'C:/tmp/test-agent-artifacts/render',
  summary: {
    projects: 1,
    commands: 1,
    httpChecks: 1,
    adversarialHttpChecks: 1,
    browserChecks: 2,
    expectedArtifactTypes: ['report_json', 'report_markdown', 'artifact_manifest', 'verdict_json', 'screenshot', 'browser_har', 'download', 'upload_file'],
  },
  commands: [{ command: 'npm run test:login-state' }],
  issues: [],
}

const testAgentExecutionPlanTextSummary = 'TestAgent 复核计划：1 个项目，1 个命令，2 个 HTTP 检查，2 个浏览器检查；预期证据：结构化报告、报告文档、证据清单、复核结论、页面截图、网络归档、文件下载证据、文件上传证据'

const testAgentBlockedExecutionPlanFixture = {
  ...testAgentExecutionPlanFixture,
  valid: false,
  workOrderId: 'wo-test-agent-blocked-render',
  artifactDir: 'C:/tmp/test-agent-artifacts/blocked',
  summary: {
    projects: 1,
    commands: 0,
    httpChecks: 0,
    adversarialHttpChecks: 0,
    browserChecks: 0,
    expectedArtifactTypes: ['report_json', 'artifact_manifest', 'verdict_json'],
  },
  commands: [],
  issues: [
    { severity: 'error', code: 'missing_work_dir', message: 'Project workDir is required. C:/tmp/test-agent-artifacts/blocked' },
  ],
}

const testAgentBlockedPlanCard = {
  version: 1,
  visible: true,
  task_id: 'task-test-agent-plan-blocked',
  title: 'TestAgent 复核计划预检',
  goal: '在真实复核前确认 TestAgent 工作单是否可执行。',
  phase: 'blocked',
  phase_label: '受阻',
  progress: 42,
  active_agents: ['TestAgent 等待交接信息修复'],
  agents: [{ name: 'TestAgent', status: 'blocked', summary: '复核计划预检未通过，等待主 Agent 修复交接信息。' }],
  completed: ['已生成 TestAgent 复核计划'],
  blockers: ['缺少项目工作目录，请补齐 TestAgent 交接信息。'],
  next_action: '主 Agent 会先修复 TestAgent 工作单或项目路径，再重新生成复核计划。',
  test_agent_execution_plan_summary: 'TestAgent 复核计划：1 个项目，0 个命令，0 个 HTTP 检查，0 个浏览器检查；预期证据：结构化报告、证据清单、复核结论',
  testAgentExecutionPlanSummary: 'TestAgent 复核计划：1 个项目，0 个命令，0 个 HTTP 检查，0 个浏览器检查；预期证据：结构化报告、证据清单、复核结论',
  test_agent_execution_plan: testAgentBlockedExecutionPlanFixture,
  testAgentExecutionPlan: testAgentBlockedExecutionPlanFixture,
  technical: {
    trace_id: 'trace-test-agent-plan-blocked',
    test_agent_execution_plan: testAgentBlockedExecutionPlanFixture,
  },
}

const testAgentFailedReviewSummary = {
  schema: 'ccm-main-agent-independent-review-summary-v1',
  title: '独立复核',
  status: 'needs_rework',
  status_label: '需返工',
  headline: '独立复核发现未通过项，我会先安排返工，再重新验收。',
  rows: [
    'TestAgent：未通过，需要返工',
    '登录态浏览器验收：共执行 2 项登录检查，1 项通过、1 项未通过，覆盖 2 个已登录会话。',
    '登录态浏览器验收有 1 项未通过，需要先修复登录流程或会话恢复问题，再重新验证。',
    '操作结果验证：共核对 1 次页面操作，1 次没有产生可见效果。',
    '场景“提交登录表单”中有 1 次操作没有产生可见效果，需要修复交互结果后重新验证。',
    '边界与异常验证：已执行 1 项检查，其中 1 项未通过，需要修复后重新验证。',
    '边界检查“重复提交登录”未通过（验收目标：重复提交不能创建重复会话），需要修复后重新验证。',
    '多人协作浏览器验收：共执行 2 个场景，1 个通过、1 个未通过，覆盖 4 个会话角色，包含 2 组并行动作，核对 2 项跨会话结果。',
    '场景“作者更新后观察方同步刷新”中，观察方未通过，失败步骤已放入技术详情。',
    '真实浏览器验收：共执行 2 个流程，1 个通过、1 个未通过，覆盖 2 条验收条件。',
    '表单流程有 1 个流程未通过（验收目标：登录恢复后进入工作台），失败步骤已放入技术详情。',
    '必检项 命令验证未覆盖：npm test 未通过',
    '验收条件未通过：登录恢复验证必须通过',
    '浏览器网络：发现 1 个网络问题',
    '把失败检查项带回给原实现成员返工',
    '返工完成后，我会自动沿用原工作单重新运行 TestAgent 复核',
  ],
  next_action: '把失败检查项带回给原实现成员返工；返工完成后，我会自动沿用原工作单重新运行 TestAgent 复核。',
  display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
}

const groupLiveTestAgentReviewSummary = {
  schema: 'ccm-main-agent-independent-review-summary-v1',
  title: '独立复核',
  status: 'passed',
  status_label: '已通过',
  headline: 'TestAgent 已检查交付证据，我会继续核对最终总结。',
  rows: [
    'TestAgent：已通过',
    '登录态浏览器验收：共执行 2 项登录检查，2 项通过，覆盖 2 个已登录会话。',
    '多人协作浏览器验收：共执行 2 个场景，2 个通过，覆盖 4 个会话角色，包含 2 组并行动作，核对 2 项跨会话结果。',
    '真实浏览器验收：共执行 2 个流程，2 个通过，覆盖 2 条验收条件。',
    '验证证据：npm run test:login-state',
    '文件上传：已验证 2 个上传文件（notes.txt、meta.json）',
    '文件下载：已验证 1 个下载文件（tasks.csv）',
    '浏览器交互：已执行 2 个操作、3 个断言，未发现失败步骤',
    '浏览器网络：记录 4 个请求、4 个响应，未发现网络错误',
  ],
  next_action: '继续核对交付总结、改动和验证结果。',
  display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
}

const testAgentFailedReviewCard = {
  version: 1,
  visible: true,
  task_id: 'task-test-agent-review-failed',
  title: 'TestAgent 独立复核未通过',
  goal: '修复登录状态恢复后，由 TestAgent 做独立复核；当前复核要求返工。',
  phase: 'failed',
  phase_label: '待返工',
  progress: 72,
  active_agents: ['我正在安排返工'],
  agents: [{ name: 'TestAgent', status: 'failed', summary: '独立复核发现未通过项，需要原实现成员返工。' }],
  completed: ['已完成 TestAgent 独立复核'],
  blockers: ['命令验证未通过', '登录恢复验收条件未通过'],
  next_action: '把失败检查项带回给原实现成员返工；返工完成后，我会自动沿用原工作单重新运行 TestAgent 复核。',
  independent_review_summary: testAgentFailedReviewSummary,
  independentReviewSummary: testAgentFailedReviewSummary,
  independent_review: testAgentFailedReviewSummary.rows,
  independentReview: testAgentFailedReviewSummary.rows,
  delivery_report: {
    schema: 'ccm-main-agent-delivery-report-v1',
    title: 'TestAgent 复核返工',
    status: 'failed',
    status_label: '待返工',
    headline: 'TestAgent 独立复核没有通过，本轮不能直接验收完成。',
    sections: [
      { id: 'completed', title: '已完成检查', items: ['已运行 TestAgent 独立复核。'] },
      { id: 'independent_review', title: '复核结论', items: testAgentFailedReviewSummary.rows },
      { id: 'acceptance', title: '验收结论', items: ['最终验收：未通过，需要先返工。'] },
      { id: 'risks', title: '未完成原因', items: ['命令验证未通过，登录恢复验收条件未通过。'] },
      { id: 'next_action', title: '下一步', items: ['把失败检查项带回给原实现成员返工；返工完成后，我会自动沿用原工作单重新运行 TestAgent 复核。'] },
    ],
    independent_review_summary: testAgentFailedReviewSummary,
    independentReviewSummary: testAgentFailedReviewSummary,
    independent_review: testAgentFailedReviewSummary.rows,
    independentReview: testAgentFailedReviewSummary.rows,
    acceptance: ['最终验收：未通过，需要先返工。'],
    risks: ['命令验证未通过，登录恢复验收条件未通过。'],
    next_action: ['把失败检查项带回给原实现成员返工；返工完成后，我会自动沿用原工作单重新运行 TestAgent 复核。'],
    technical_hint: 'TestAgent 原始报告、裁决文件和证据路径已放入技术详情。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
  },
  display_stream: {
    schema: 'ccm-streamlined-display-v2',
    user_visible_text: 'TestAgent 独立复核没有通过，我会先安排原实现成员返工，再重新复核。',
    tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: '独立复核 1 次，发现 2 个未通过项' },
  },
  technical: {
    trace_id: 'trace-test-agent-review-failed',
    test_agent_report: {
      verdict: 'failed',
      recommendation: 'rework',
      needsRework: true,
      metadata: {
        browserAuthenticationSummary: {
          configuredChecks: 2,
          passedChecks: 1,
          failedChecks: 1,
          blockedChecks: 0,
          authenticatedSessions: 2,
          credentialEnvNames: ['TEST_EMAIL', 'TEST_PASSWORD'],
          storageStateCount: 2,
          sensitiveArtifactSuppressionCount: 2,
        },
      },
      report_json: 'C:/tmp/test-agent-artifacts/failed/report.json',
      verdict_json: 'C:/tmp/test-agent-artifacts/failed/verdict.json',
      artifact_manifest: 'C:/tmp/test-agent-artifacts/failed/artifact-manifest.json',
      browser_artifacts: 'C:/tmp/test-agent-artifacts/failed/browser-artifacts',
      browserActionEffectSummary: {
        provider: 'playwright',
        url: 'http://127.0.0.1:5173/login?token=hidden',
        actionTypes: { click: 1 },
        changedSignals: { page_text: 0, network: 0 },
      },
      adversarialEvidenceSummary: {
        provider: 'playwright',
        probeType: 'duplicate_submit',
        target: 'http://127.0.0.1:5173/login?token=hidden',
        rawSessionId: 'failed-review-session-hidden',
      },
    },
  },
}

const groupLiveTestAgentReviewMergedCard = {
  version: 1,
  visible: true,
  task_id: 'task-group-live-test-agent-review-merged',
  title: '群聊 TestAgent 复核已返回',
  goal: '在群聊流式处理中，把 TestAgent 独立复核结论合并进当前任务卡。',
  phase: 'reviewing',
  phase_label: '复核已返回',
  progress: 84,
  active_agents: ['正在纳入复核结论'],
  agents: [{ name: 'TestAgent', status: 'done', summary: '独立复核已返回，当前没有发现阻塞风险。' }],
  completed: ['已生成 TestAgent 复核计划', '已收到 TestAgent 独立复核结论'],
  blockers: [],
  next_action: '继续核对交付总结、改动和验证结果。',
  test_agent_execution_plan_summary: testAgentExecutionPlanTextSummary,
  testAgentExecutionPlanSummary: testAgentExecutionPlanTextSummary,
  test_agent_execution_plan: testAgentExecutionPlanFixture,
  testAgentExecutionPlan: testAgentExecutionPlanFixture,
  independent_review_summary: groupLiveTestAgentReviewSummary,
  independentReviewSummary: groupLiveTestAgentReviewSummary,
  test_agent_review_summary: groupLiveTestAgentReviewSummary,
  testAgentReviewSummary: groupLiveTestAgentReviewSummary,
  independent_review: groupLiveTestAgentReviewSummary.rows,
  independentReview: groupLiveTestAgentReviewSummary.rows,
  post_review_spot_check_summary: {
    schema: 'ccm-main-agent-post-review-spot-check-summary-v1',
    title: '完成前抽查',
    status: 'passed',
    status_label: '已通过',
    headline: '我已抽查 2 项验证，结果与 TestAgent 的通过结论一致。',
    rows: ['已抽查 2 项验证，2 项结果一致'],
    next_action: '继续核对交付总结并完成最终验收。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
  },
  display_stream: {
    schema: 'ccm-streamlined-display-v2',
    user_visible_text: 'TestAgent 已提交独立复核结论，我会纳入最终验收。',
    tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: '独立复核 1 次，当前没有发现阻塞风险' },
  },
  technical: {
    trace_id: 'trace-group-live-test-agent-review-merged',
    test_agent_report: {
      schema: 'ccm-test-agent-report-v1',
      verdict: 'passed',
      metadata: {
        browserAuthenticationSummary: {
          configuredChecks: 2,
          passedChecks: 2,
          failedChecks: 0,
          blockedChecks: 0,
          authenticatedSessions: 2,
          credentialEnvNames: ['TEST_EMAIL', 'TEST_PASSWORD'],
          storageStateCount: 2,
          sensitiveArtifactSuppressionCount: 2,
        },
      },
      report_json: 'C:/tmp/test-agent-artifacts/live/report.json',
      verdict_json: 'C:/tmp/test-agent-artifacts/live/verdict.json',
      artifact_manifest: 'C:/tmp/test-agent-artifacts/live/artifact-manifest.json',
      browser_artifacts: 'C:/tmp/test-agent-artifacts/live/browser-artifacts',
    },
    post_review_spot_check: {
      schema: 'ccm-main-agent-post-review-spot-check-v1',
      required: true,
      pass: true,
      status: 'passed',
      executed_count: 2,
      passed_count: 2,
      mismatch_count: 0,
      checks: [{
        command: 'node scripts/private-login-check.mjs',
        cwd: 'C:/private/group-project',
        review_exit_code: 0,
        observed_exit_code: 0,
        review_output_preview: 'private group check passed',
        observed_output_preview: 'private group check passed',
        observed_output_file: 'C:/private/group-project/.ccm-output/spot-check.log',
        matches_review: true,
      }],
    },
  },
}

const taskCard = {
  version: 1,
  visible: true,
  task_id: 'task-render-1',
  title: '修复登录状态刷新问题',
  goal: '用户登录后刷新页面仍保持登录态。',
  phase: 'completed',
  phase_label: '已完成',
  progress: 100,
  active_agents: [],
  agents: [{ name: '前端 · web', status: 'done', summary: '已完成登录状态恢复逻辑', blockers: [] }],
  work_items: [
    { id: 'wi-api', subject: '确认登录态接口契约', owner: 'api', target: 'api', status: 'completed', evidence: ['接口契约已确认'], blockedBy: [], attempt: 1 },
    { id: 'wi-web', subject: '修复刷新后登录态恢复', owner: 'web', target: 'web', status: 'completed', evidence: ['登录状态恢复逻辑已完成'], blockedBy: ['api'], attempt: 1 },
  ],
  work_item_summary: { total: 2, counts: { completed: 2 }, all_completed: true },
  agent_progress_summary: {
    schema: 'ccm-child-agent-progress-summary-v1',
    title: '子 Agent 进展摘要',
    status: 'completed',
    status_label: '已收齐',
    headline: '2 个子 Agent 的结果已收齐，主 Agent 正在整理验收和交付总结。',
    rows: [
      { agent: 'api', role: '后端', status: 'completed', status_label: '已完成', summary: '已确认登录态接口契约', current_focus: '确认登录态接口契约', evidence: [{ id: 'result', label: '结果', value: '已完成' }], blockers: [], next_action: '等待主 Agent 纳入验收和最终总结' },
      { agent: 'web', role: '前端', status: 'completed', status_label: '已完成', summary: '登录状态恢复逻辑已完成', current_focus: '修复刷新后登录态恢复', evidence: [{ id: 'files', label: '文件', value: '2 个', detail: 'frontend/src/stores/login.js、frontend/src/views/Login.vue' }, { id: 'verification', label: '验证', value: '1 项', detail: 'npm run test:login-state' }], blockers: [], next_action: '等待主 Agent 纳入验收和最终总结' },
    ],
    next_action: '主 Agent 会把这些结果合并进最终总结',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
  },
  agent_coordination: {
    schema: 'ccm-main-child-agent-coordination-v1',
    title: '协作状态',
    status: 'healthy',
    health: 92,
    child_plan_review: {
      schema: 'ccm-child-agent-plan-review-v1',
      title: '子 Agent 执行计划',
      status: 'approved',
      status_label: '已通过',
      headline: '主 Agent 已检查子 Agent 的接单计划，目标、范围和验证安排清晰。',
      rows: [
        {
          agent: 'web',
          status: 'approved',
          status_label: '计划清晰',
          understood_goal: '修复刷新后登录态恢复。',
          planned_scope: ['frontend/src/stores/login.js', 'frontend/src/views/Login.vue'],
          verification_plan: ['npm run test:login-state'],
          reason: '目标、范围和验证安排清晰。',
        },
      ],
      next_action: '继续跟踪执行结果、文件改动和验证证据。',
      display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
    },
  },
  mainAgentDecision: taskCompletedDecision,
  main_agent_decision: taskCompletedDecision,
  display_stream: taskCompletedDecision.display_stream,
  progress_checkpoints: taskCompletedDecision.display_stream.progress_checkpoints,
  completed: ['已创建任务卡', '已完成登录状态恢复修改'],
  blockers: [],
  next_action: '可以查看改动详情，或继续补充新的要求。',
  delivery: { headline: '登录状态刷新后的恢复逻辑已经完成。', files: deliveryReport.files, verification: deliveryReport.verification, risks: [], acceptance_passed: true },
  delivery_report: deliveryReport,
  test_agent_execution_plan_summary: testAgentExecutionPlanTextSummary,
  testAgentExecutionPlanSummary: testAgentExecutionPlanTextSummary,
  test_agent_execution_plan: testAgentExecutionPlanFixture,
  testAgentExecutionPlan: testAgentExecutionPlanFixture,
  plan_mode: renderedPlanMode,
  plan_alignment: renderedPlanAlignment,
  user_handoff: renderedUserHandoff,
  change_summary: renderedChangeSummary,
  actions: [],
  technical: {
    trace_id: 'trace-task-visible',
    execution_ids: ['exec-render-1'],
    session_ids: ['session-render-1'],
    display_stream: taskDecision.display_stream,
    plan_alignment: renderedPlanAlignment,
    change_summary: renderedChangeSummary,
    user_handoff: renderedUserHandoff,
    test_agent_execution_plan: testAgentExecutionPlanFixture,
  },
}

const internalUserRequestSummaryCard = {
  version: 1,
  visible: true,
  task_id: 'task-internal-user-request-guard',
  title: '内部推进状态',
  goal: '执行成员提交结果后再统一验收。',
  phase: 'executing',
  phase_label: '执行中',
  progress: 46,
  active_agents: ['web'],
  agents: [{ name: '前端 · web', status: 'running', summary: '正在实现筛选 UI', blockers: [] }],
  user_request_summary: {
    schema: 'ccm-main-agent-internal-progress-summary-v1',
    title: '需要你处理',
    status: 'in_progress',
    status_label: '处理中',
    headline: '等待执行成员提交结果说明，然后我会验收并总结。',
    next_action: '等待执行成员提交结果说明，然后我会验收并总结。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
  },
  next_action: '等待执行成员提交结果说明，然后我会验收并总结。',
  technical: {
    user_request_summary: {
      schema: 'ccm-main-agent-internal-progress-summary-v1',
      headline: '等待执行成员提交结果说明，然后我会验收并总结。',
    },
  },
}

const explicitUserRequestSummaryCard = {
  version: 1,
  visible: true,
  task_id: 'task-explicit-user-request-visible',
  title: '等待你确认验收方式',
  goal: '确认后继续做真实验收。',
  phase: 'needs_user',
  phase_label: '需要你确认',
  progress: 72,
  active_agents: [],
  agents: [],
  user_request_summary: {
    schema: 'ccm-main-agent-user-request-summary-v1',
    title: '需要你处理',
    status: 'waiting_user',
    status_label: '等待你回复',
    headline: '需要你确认是否允许继续使用测试环境变量做验收。',
    question: '是否允许我使用你提供的测试环境变量继续验收？',
    next_action: '请回复确认或取消；确认后我会继续验收并总结结果。',
    answer_suggestions: ['确认继续', '先取消'],
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
  },
  next_action: '等待你确认验收方式。',
}

const groupWaitingUserTaskCard = {
  version: 1,
  visible: true,
  task_id: 'task-group-waiting-user-resume',
  title: '登录恢复真实验收',
  goal: '完成登录恢复的真实验收，并在复核通过后给出最终总结。',
  phase: 'needs_user',
  phase_label: '需要你确认',
  progress: 72,
  active_agents: [],
  agents: [{ name: 'TestAgent', status: 'blocked', summary: '等待测试环境条件后继续独立复核。', blockers: [] }],
  blockers: ['还缺少可用的测试环境条件。'],
  user_request_summary: {
    schema: 'ccm-main-agent-user-request-summary-v1',
    title: '需要你补充信息',
    status: 'waiting_user',
    status_label: '等待你回复',
    headline: '我已保留当前任务进度，收到测试条件后会继续复核。',
    question: '请补充测试环境地址和可用测试账号。',
    next_action: '收到后会沿用原任务、执行成员上下文和验收标准继续。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
  },
  next_action: '请补充任务所需条件。',
  actions: [
    { id: 'supplement', label: '补充确认', kind: 'continue', tone: 'primary' },
    { id: 'cancel', label: '停止', kind: 'cancel', tone: 'danger' },
  ],
  technical: {
    trace_id: 'trace-group-waiting-user-resume',
    session_ids: ['session-web-resumable', 'session-test-agent-resumable'],
  },
}

const groupClarificationMessageFixture = {
  id: 'fixture-group-clarification-message',
  role: 'assistant',
  agent: 'coordinator',
  content: '我需要先确认一下：这次是只改前端入口，还是也要补后端接口？',
  timestamp: now,
  clarification_summary: {
    schema: 'ccm-group-main-agent-clarification-summary-v1',
    title: '需要你补充信息',
    status: 'waiting_user',
    status_label: '等待你回复',
    headline: '我已暂停派发，先确认一个关键问题。',
    question: '这次是只改前端入口，还是也要补后端接口？',
    reason: '需要确认影响范围。',
    answer_suggestions: ['只改前端入口', '前后端都改'],
    next_action: '你回复后，我会接着原请求继续判断和生成计划。',
    display_policy: { user_visible: true, show_todo: false, technical_details_default_collapsed: true, hide_internal_protocols: true },
  },
  clarification_context: {
    schema: 'ccm-group-clarification-context-v1',
    id: 'fixture-group-clarification-request',
    status: 'pending',
    group_id: 'fixture-group-clarification',
    response_message_id: 'fixture-group-clarification-message',
    original_message: '修复登录状态恢复逻辑，完成修改、测试和最终总结。',
    original_user_message: '修复登录状态恢复逻辑，完成修改、测试和最终总结。',
    original_message_for_agent: '修复登录状态恢复逻辑，完成修改、测试和最终总结。',
    question: '这次是只改前端入口，还是也要补后端接口？',
    message_mode: 'project_task',
    target_project: 'all',
    force_task: true,
    trace_id: 'trace-group-clarification-root',
    created_at: now,
  },
}

const taskStatusFallbackCard = {
  version: 1,
  visible: true,
  task_id: 'task-status-fallback-copy',
  title: '共享任务卡状态文案',
  goal: '验证内部缺口不会显示成用户待办。',
  phase: 'executing',
  phase_label: '执行中',
  progress: 38,
  display_stream: {
    schema: 'ccm-streamlined-display-v2',
    user_visible_text: '我正在补齐验收证据并排查失败动作。',
    tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: '执行队列 2 项，1 项待补齐，1 项待排查' },
  },
  work_items: [
    { id: 'wi-fallback-blocked', subject: '补齐验收证据', owner: 'qa', target: 'qa', status: 'blocked', evidence: [], blockers: ['缺少真实浏览器验收证据'], blockedBy: [], attempt: 1 },
    { id: 'wi-fallback-failed', subject: '复核失败动作', owner: 'web', target: 'web', status: 'failed', evidence: [], blockers: ['命令执行失败'], blockedBy: [], attempt: 1 },
  ],
  work_item_summary: {
    total: 2,
    counts: { blocked: 1, failed: 1 },
    next_claimable: [],
    all_completed: false,
  },
  agent_progress_summary: {
    schema: 'ccm-child-agent-progress-summary-v1',
    title: '执行成员进展',
    status: 'needs_attention',
    headline: '1 个执行成员还缺验收证据，我会继续补齐。',
    rows: [
      { agent: 'qa', role: '测试', status: 'blocked', summary: '缺少真实浏览器验收证据', current_focus: '补齐真实浏览器验收证据', evidence: [], blockers: ['缺少真实浏览器验收证据'], next_action: '我会继续补齐验收证据' },
    ],
    next_action: '补齐验收证据后再进入最终总结。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
  },
  agent_questions: [
    {
      id: 'qa-status-fallback',
      from: '前端',
      to: '测试',
      status: 'waiting',
      label: '等待确认',
      summary: '测试成员需要确认真实浏览器验收证据。',
      question: '是否已经有真实浏览器验收记录？',
      answer: '还没有，正在补齐。',
      next_action: '补齐后再进入最终总结。',
      badges: ['验收证据'],
    },
  ],
  recovery_summary: {
    schema: 'ccm-main-agent-recovery-summary-v1',
    title: '恢复接续',
    status: 'active',
    headline: '我已恢复这轮任务上下文，会先补齐缺口再继续总结。',
    revalidated: { goal: true, state: true, acceptance: false },
    preserved: ['已恢复计划和当前执行队列'],
    remaining_gaps: ['真实浏览器验收证据'],
    next_action: '继续补齐验收证据。',
  },
  completed: ['已恢复任务上下文'],
  blockers: ['真实浏览器验收证据待补齐'],
  next_action: '补齐验收证据并排查失败动作后再总结。',
  technical: { trace_id: 'trace-status-fallback-copy' },
}

const startupAutoRecoveryTodo = [
  { id: 'restore_task_context', content: '恢复任务上下文并重新核对', activeForm: '已恢复任务上下文并重新核对', status: 'completed', evidence: ['原计划、执行队列和验收条件已恢复'] },
  { id: 'continue_execution', content: '继续执行剩余任务', activeForm: '正在继续执行剩余任务', status: 'in_progress', evidence: ['已重新进入原任务执行队列'] },
  { id: 'verify_and_summarize', content: '完成验收并总结', activeForm: '等待完成验收并总结', status: 'pending', evidence: ['完成后必须核对改动、验证和剩余风险'] },
]

const startupAutoRecoveryCard = {
  version: 1,
  visible: true,
  task_id: 'task-startup-auto-recovery',
  title: '登录状态恢复任务',
  goal: '完成登录状态恢复修改、验证和最终总结。',
  phase: 'planning',
  phase_label: '正在接续',
  progress: 34,
  active_agents: ['前端 · web 正在继续执行'],
  agents: [{ name: '前端 · web', status: 'running', summary: '已恢复原任务上下文，正在继续修改和验证' }],
  recovery_summary: {
    schema: 'ccm-main-agent-recovery-summary-v1',
    title: '恢复接续',
    status: 'active',
    status_label: '已自动接上',
    mode: 'startup_auto_recovery',
    headline: '服务重启后，我已自动接上这轮任务，并重新核对目标、当前状态和验收条件。',
    revalidated: { goal: true, state: true, acceptance: true },
    preserved: ['已保留你之前确认的执行授权', '保留 1 个执行成员会话上下文', '恢复 2 个执行队列工作项'],
    remaining_gaps: ['真实浏览器验收仍待执行'],
    next_action: '我会沿用原计划和执行上下文继续推进，完成后再给你最终总结。',
    technical: {
      decision_code: 'authorized_incomplete_task',
      decision_reason: 'persisted queue evidence',
      authorization_evidence: ['intake_confirmed', 'queued_at', 'started_at'],
      recovery_checks: 1,
      lease_recovery_count: 1,
    },
  },
  live_todo_plan: {
    source: 'ccm-live-task-todo',
    visible: true,
    items: startupAutoRecoveryTodo,
  },
  mainAgentDecision: {
    version: 1,
    kind: 'task',
    mode: 'project_task',
    show_todo: true,
    goal: '完成登录状态恢复修改、验证和最终总结。',
    phase: 'execute',
    phase_label: '正在执行',
    current_step: '正在继续执行剩余任务',
    decision: {
      selected_actions: ['inspect_task_status', 'create_project_task'],
      reason: '服务重启后继续执行已经确认并入队的原任务。',
      dispatch_policy: {
        reason: '原任务授权仍然有效，继续同一任务上下文。',
        nextStep: '继续执行剩余修改和验证，完成后给出最终总结。',
      },
    },
    verify: { passed: false, status: 'in_progress' },
    todo_plan: {
      source: 'ccm-live-task-todo',
      title: '我准备这样处理',
      steps: startupAutoRecoveryTodo,
      display_policy: { user_visible: true },
    },
    user_plan_steps: startupAutoRecoveryTodo,
    display_stream: {
      schema: 'ccm-streamlined-display-v2',
      user_visible_text: '我已接上重启前的任务，正在从原计划继续执行。',
    },
  },
  completed: ['已恢复原计划和执行上下文', '已重新核对目标、当前状态和验收条件'],
  blockers: [],
  next_action: '继续执行剩余修改和验证，完成后给出最终总结。',
  technical: {
    trace_id: 'trace-startup-auto-recovery-hidden',
    recovery_policy: 'risk_tiered_authorization_preserving',
    decision_code: 'authorized_incomplete_task',
    authorization_evidence: ['intake_confirmed', 'queued_at', 'started_at'],
  },
}

const workQueueCard = {
  version: 1,
  visible: true,
  task_id: 'task-queue-1',
  title: '跨端负责人筛选',
  goal: '后端提供筛选接口后，前端接入负责人筛选 UI。',
  phase: 'executing',
  phase_label: '正在修改',
  progress: 58,
  active_agents: ['前端 · web 等待派发'],
  agents: [
    { name: '后端 · api', status: 'done', summary: '负责人筛选接口已完成' },
    { name: '前端 · web', status: 'pending', summary: '前置接口完成后可继续接入 UI' },
  ],
  work_items: [
    { id: 'wi-api', subject: '提供 owner 筛选接口', activeForm: '已完成 owner 筛选接口', owner: 'api', target: 'api', status: 'completed', evidence: ['接口契约已确认'], blockedBy: [], attempt: 1 },
    { id: 'wi-web', subject: '接入 owner 筛选 UI', activeForm: '等待接入 owner 筛选 UI', owner: 'web', target: 'web', status: 'pending', evidence: [], blockedBy: ['api'], attempt: 1 },
  ],
  work_item_summary: {
    total: 2,
    counts: { completed: 1, pending: 1 },
    next_claimable: [{ id: 'wi-web', target: 'web', subject: '接入 owner 筛选 UI', activeForm: '等待接入 owner 筛选 UI' }],
    dependency_summary: {
      schema: 'ccm-main-agent-work-item-dependency-summary-v1',
      title: '依赖与派发',
      status: 'ready_to_dispatch',
      status_label: '1 项可派发',
      headline: '1 个工作项已经解锁，可以继续派发。',
      rows: [{
        id: 'wi-web',
        target: 'web',
        subject: '接入 owner 筛选 UI',
        status: 'pending',
        dependency_count: 1,
        open_dependency_count: 0,
        label: 'web 的前置依赖已完成，可以进入下一步',
        next_action: '可以派发给对应子 Agent 继续执行。',
      }],
      next_action: '优先派发已解锁工作项，并继续监听前置任务状态。',
      display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
    },
    all_completed: false,
  },
  work_item_unlock_summary: {
    schema: 'ccm-main-agent-work-item-unlock-summary-v1',
    title: '前置完成，下一步已解锁',
    status: 'auto_dispatch_deferred',
    status_label: '已自动接上',
    headline: 'api 完成后，“接入 owner 筛选 UI”已经解锁，主 Agent 已自动接上派发。',
    rows: [{ id: 'wi-web', target: 'web', owner: 'web', subject: '接入 owner 筛选 UI', label: 'web 的前置依赖已完成，可以进入下一步' }],
    next_claimable: [{ id: 'wi-web', target: 'web', owner: 'web', subject: '接入 owner 筛选 UI', activeForm: '等待接入 owner 筛选 UI' }],
    next_action: '当前执行轮结束后，主 Agent 会继续派发这个已解锁工作项。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
    technical: { completed_agent: 'api', unlocked_work_item_ids: ['wi-web'], auto_dispatch: { deferred: true } },
  },
  work_item_claim_summary: {
    schema: 'ccm-main-agent-work-item-claim-summary-v1',
    title: '派发状态',
    status: 'agent_busy',
    status_label: '继续等待',
    headline: 'web 正在处理“修复登录状态恢复”，“接入 owner 筛选 UI”会继续等待。',
    next_action: '当前工作完成后，主 Agent 会重新检查并派发这个工作项。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
    technical: { reason_code: 'agent_busy', work_item_id: 'wi-web', busy_work_item_id: 'wi-login' },
  },
  completion_readiness_summary: {
    schema: 'ccm-main-agent-completion-readiness-v1',
    title: '完成前收尾',
    status: 'blocked',
    status_label: '尚未收尾',
    headline: '还有 1 个工作项未完成，1 个子 Agent 会话仍在处理，主 Agent 不会提前宣布完成。',
    rows: [{ target: 'web', subject: '接入 owner 筛选 UI', status: 'in_progress', status_label: '执行中' }],
    open_session_count: 1,
    unresolved_work_item_count: 1,
    next_action: '先完成或处理这些工作项；全部收敛后再做最终总结。',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
    technical: { unresolved_work_item_ids: ['wi-web'], open_session_ids: ['session-hidden'] },
  },
  agent_progress_summary: {
    schema: 'ccm-child-agent-progress-summary-v1',
    title: '子 Agent 进展摘要',
    status: 'running',
    status_label: '跟踪中',
    headline: '2 个子 Agent 的进展已汇总，主 Agent 会继续跟踪文件、验证和结果。',
    rows: [
      { agent: 'api', role: '后端', status: 'completed', status_label: '已完成', summary: '负责人筛选接口已完成', current_focus: '提供 owner 筛选接口', evidence: [{ id: 'files', label: '文件', value: '1 个', detail: 'backend/server.ts' }], blockers: [], next_action: '等待主 Agent 纳入验收和最终总结' },
      { agent: 'web', role: '前端', status: 'pending', status_label: '等待中', summary: '等待派发：接入 owner 筛选 UI', current_focus: '接入 owner 筛选 UI', evidence: [], blockers: [], next_action: '等待前置条件满足后派发' },
    ],
    next_action: '等待子 Agent 继续提交结果说明和验证',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
  },
  agent_coordination: {
    schema: 'ccm-main-child-agent-coordination-v1',
    title: '协作状态',
    status: 'needs_attention',
    health: 72,
    child_plan_review: {
      schema: 'ccm-child-agent-plan-review-v1',
      title: '子 Agent 执行计划',
      status: 'needs_revision',
      status_label: '需调整',
      headline: '1 个子 Agent 的执行计划还不够清楚，主 Agent 会先要求补齐目标、范围或验证安排。',
      rows: [
        { agent: 'web', status: 'needs_revision', status_label: '需调整', understood_goal: '', planned_scope: [], verification_plan: [], unclear: ['需要明确 owner 筛选 UI 范围'], reason: '接单说明缺少目标或计划范围' },
      ],
      next_action: '先要求对应子 Agent 重写接单计划，再继续执行或验收。',
      display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
    },
    memory_gate_summary: {
      required: true,
      status: 'missing_receipt_reference',
      summary: '结果说明缺少记忆使用声明。',
      rows: [
        { agent: 'web', status: 'missing_receipt_reference', reason: '结果说明缺少记忆使用声明。' },
      ],
    },
  },
  continuation_status: {
    schema: 'ccm-main-agent-continuation-status-v1',
    title: '下一步派发已接上',
    status: 'queued',
    status_label: '已入队',
    headline: '主 Agent 已接收 web 的已解锁工作项，只推进这一小步。',
    kind: 'supplement',
    kind_label: '补充要求',
    strategy: 'continue_next_work_item',
    route_label: '继续派发已解锁工作项',
    target: 'web',
    reason: '接入 owner 筛选 UI',
    handoff_steps: [
      { id: 'capture', label: '已记录补充要求', detail: '接入 owner 筛选 UI' },
      { id: 'preserve_context', label: '保留已有上下文', detail: 'api 前置接口和当前验收结果会继续作为判断依据。' },
      { id: 'continue', label: '继续同一任务', detail: '主 Agent 会复用原任务证据继续执行，完成后重新验收并总结。' },
    ],
    next_action: '主 Agent 会复用原任务证据继续执行，完成后重新验收并总结。',
    at: now,
  },
  receipt_rework_summary: {
    schema: 'ccm-main-agent-receipt-rework-summary-v1',
    title: '结果复检',
    status: 'needs_rework',
    status_label: '1 个缺口',
    headline: 'web 的结果说明还需要补齐，主 Agent 不会把这轮直接判定完成。',
    gaps: [{
      id: 'weak_receipt',
      target: 'web',
      title: '要求补充高质量结果说明',
      reason: '结果说明质量缺少：已执行验证、声明记忆使用',
      missing: ['已执行验证', '声明记忆使用'],
      tone: 'warning',
      action: { kind: 'targeted_rework', id: 'weak_receipt', title: '要求补充高质量结果说明', target: 'web', reason: '结果说明质量缺少：已执行验证、声明记忆使用', tone: 'warning', label: '要求补充高质量结果说明' },
    }],
    next_action: '可以按单个结果说明缺口定向补充；补齐后主 Agent 会重新验收并汇总。',
  },
  acceptance_review: {
    title: '主 Agent 验收',
    status: 'reviewing',
    headline: '还缺 3 项证据，不能宣布完成',
    checks: [
      { id: 'ack_gate', label: '接单说明完整', ok: false, detail: '还有 1 个接单说明需要补齐目标、范围和验证安排' },
      { id: 'memory_gate_receipt', label: '记忆使用声明', ok: false, detail: '还有 1 条记忆使用声明需要补齐' },
      { id: 'api_microcompact_receipt', label: '上下文压缩计划使用说明', ok: false, detail: '还有 1 个上下文压缩计划缺少使用状态' },
    ],
    missing: ['接单说明完整', '记忆使用声明', '上下文压缩计划使用说明'],
    next_action: '继续返工或补齐缺失证据后再验收',
    technical: {
      raw_gate_checks: [
        { id: 'ack_gate', detail: 'ACK raw detail' },
        { id: 'memory_gate_receipt', detail: '记忆 gate raw detail' },
        { id: 'api_microcompact_receipt', detail: 'API microcompact edit plan raw detail' },
      ],
    },
  },
  progress_checkpoints: {
    schema: 'ccm-main-agent-progress-checkpoints-v1',
    title: '关键进展',
    display_policy: { user_visible: true, raw_events_default_collapsed: true },
    items: [
      { id: 'cp-recovery', label: '主 Agent 已接上恢复任务', detail: '目标、状态与验收条件已重新核对。', status: 'done', phase: 'planning' },
      { id: 'cp-receipt', label: 'web：提交结果说明', detail: '已完成页面改动并提交结果状态。', status: 'done', phase: 'executing' },
      { id: 'cp-rework', label: '主 Agent 已发起定向补充', detail: '补齐 npm test 证据。', status: 'active', phase: 'rework' },
      { id: 'cp-supervisor', label: '全局监工已安排返工', detail: '已按交付缺口重派 web。', status: 'active', phase: 'rework' },
    ],
  },
  display_stream: {
    schema: 'ccm-streamlined-display-v2',
    user_visible_text: 'api 前置接口已完成，web 已解锁，可以继续派发。',
    tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: 'receipt-status 1 条，协作通道 2 个' },
  },
  completed: ['api 前置接口已完成，等待 web 结果说明'],
  blockers: [],
  next_action: '把已解锁的 web 工作项派发给前端 Agent。',
  delivery: { headline: '已有前置交付，下一步可以接入前端。', files: [], verification: [], risks: [], acceptance_passed: false },
  delivery_report: {
    schema: 'ccm-main-agent-delivery-report-v1',
    title: '历史结果说明交付摘要',
    status: 'needs_rework',
    status_label: '结果说明待补',
    headline: '结构化结果说明质量不足，trace_id=legacy-secret',
    sections: [
      { id: 'legacy_receipt', title: '结果说明质量', items: ['web 结果说明缺少验证', 'CCM_AGENT_RECEIPT raw payload trace_id=legacy-secret should stay folded'] },
      { id: 'next', title: '下一步', items: ['补充结果说明后继续验收'] },
    ],
    next_action: '补充结果说明后继续验收',
  },
  actions: [],
  technical: { trace_id: 'trace-work-queue', execution_ids: ['exec-api'], session_ids: [] },
}

const workItemVerificationReminderCard = {
  ...workQueueCard,
  task_id: 'task-work-item-verification-reminder',
  title: '执行队列验收提醒',
  goal: '多个实现工作项已经完成，主 Agent 需要在最终总结前补齐真实验收。',
  phase: 'reviewing',
  phase_label: '等待验收',
  progress: 82,
  active_agents: ['主 Agent 正在补齐验收'],
  work_items: [
    { id: 'wi-api', subject: '实现接口参数兼容', owner: 'api', target: 'api', status: 'completed', evidence: ['接口兼容逻辑已完成'], blockedBy: [], attempt: 1 },
    { id: 'wi-web', subject: '接入前端筛选控件', owner: 'web', target: 'web', status: 'completed', evidence: ['筛选控件已接入'], blockedBy: [], attempt: 1 },
    { id: 'wi-doc', subject: '整理交付说明', owner: 'docs', target: 'docs', status: 'completed', evidence: ['交付说明已整理'], blockedBy: [], attempt: 1 },
  ],
  work_item_summary: {
    total: 3,
    counts: { completed: 3 },
    next_claimable: [],
    all_completed: true,
    verification_nudge: true,
    verification_reminder: {
      schema: 'ccm-main-agent-work-item-verification-reminder-v1',
      status: 'needs_verification_work_item',
      title: '执行队列还缺验收',
      headline: '工作项都完成了，但还没有看到专门的验证/验收工作项或验证证据。',
      reason: '3 个以上工作项全部完成时，需要在最终总结前补一次真实验收。',
      next_action: '主 Agent 会补齐验收或说明无法验证的原因，再给出最终交付总结。',
      display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
    },
  },
  agent_progress_summary: {
    ...workQueueCard.agent_progress_summary,
    headline: '3 个工作项都已完成，主 Agent 正在补齐最终验收证据。',
    rows: [
      { agent: 'api', role: '后端', status: 'completed', status_label: '已完成', summary: '接口参数兼容已完成', current_focus: '实现接口参数兼容', evidence: [], blockers: [], next_action: '等待主 Agent 验收' },
      { agent: 'web', role: '前端', status: 'completed', status_label: '已完成', summary: '筛选控件已接入', current_focus: '接入前端筛选控件', evidence: [], blockers: [], next_action: '等待主 Agent 验收' },
    ],
    next_action: '补齐真实验收后再输出最终总结',
  },
  display_stream: {
    schema: 'ccm-streamlined-display-v2',
    user_visible_text: '执行队列已经收敛，最终总结前还需要补齐验收。',
    tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: '协作通道 3 个，验收证据待补' },
  },
  completed: ['接口参数兼容已完成', '筛选控件已接入', '交付说明已整理'],
  next_action: '先补齐验收，再生成最终总结。',
  delivery: { headline: '已有实现结果，验收证据仍在补齐。', files: [], verification: [], risks: ['缺少真实验收证据'], acceptance_passed: false },
}

const receiptResolvedCard = {
  ...workQueueCard,
  task_id: 'task-receipt-resolved',
  title: '负责人筛选结果复检',
  phase: 'reviewing',
  phase_label: '正在运行测试',
  progress: 86,
  active_agents: ['主 Agent 正在最终验收'],
  agents: [
    { name: '后端 · api', status: 'done', summary: '负责人筛选接口已完成' },
    { name: '前端 · web', status: 'done', summary: '已补充验证和记忆声明' },
  ],
  work_items: workQueueCard.work_items.map(item => item.id === 'wi-web' ? { ...item, status: 'completed', evidence: ['已补充验证和记忆声明'] } : item),
  work_item_summary: { total: 2, counts: { completed: 2 }, all_completed: true, next_claimable: [] },
  agent_progress_summary: {
    schema: 'ccm-child-agent-progress-summary-v1',
    title: '子 Agent 进展摘要',
    status: 'completed',
    status_label: '已收齐',
    headline: '2 个子 Agent 的结果已收齐，主 Agent 正在整理验收和交付总结。',
    rows: [
      { agent: 'api', role: '后端', status: 'completed', status_label: '已完成', summary: '负责人筛选接口已完成', current_focus: '提供 owner 筛选接口', evidence: [{ id: 'files', label: '文件', value: '1 个', detail: 'backend/server.ts' }], blockers: [], next_action: '等待主 Agent 纳入验收和最终总结' },
      { agent: 'web', role: '前端', status: 'completed', status_label: '已完成', summary: '已补充验证和记忆声明', current_focus: '接入 owner 筛选 UI', evidence: [{ id: 'verification', label: '验证', value: '1 项', detail: 'npm test' }], blockers: [], next_action: '等待主 Agent 纳入验收和最终总结' },
    ],
    next_action: '主 Agent 会把这些结果合并进最终总结',
    display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true },
  },
  receipt_rework_summary: {
    schema: 'ccm-main-agent-receipt-rework-summary-v1',
    title: '结果复检',
    status: 'passed',
    status_label: '已通过',
    headline: 'web 的结果说明已完成复检，主 Agent 会继续收敛最终交付。',
    gaps: [],
    active_rework: [],
    resolved: [{
      target: 'web',
      title: '结果说明已补齐',
      reason: '结果说明评分 100，主 Agent 已重新验收。',
      status: 'passed',
      at: now,
    }],
    next_action: '继续执行剩余验收；如果所有检查通过，主 Agent 会输出最终总结。',
  },
  display_stream: {
    schema: 'ccm-streamlined-display-v2',
    user_visible_text: 'web 已补齐结果说明，主 Agent 正在做最终验收。',
    tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: '结果复检已通过，等待最终总结' },
  },
  completed: ['web 已补齐结果说明'],
  blockers: [],
  next_action: '等待主 Agent 完成最终验收总结。',
}

const goalRevisionContinuationCard = {
  ...workQueueCard,
  task_id: 'task-goal-revision-continuation',
  title: '支付流程目标调整',
  goal: '原任务正在处理支付流程，现在用户要求保留旧支付表，只新增兼容字段。',
  phase: 'executing',
  phase_label: '重新核对',
  progress: 42,
  active_agents: ['主 Agent 正在重新核对计划'],
  agents: [
    { name: '后端 · api', status: 'running', summary: '当前轮执行中，等待主 Agent 接住目标调整' },
    { name: '前端 · web', status: 'pending', summary: '等待新的计划边界' },
  ],
  continuation_status: {
    schema: 'ccm-main-agent-continuation-status-v1',
    title: '目标调整已接收',
    status: 'interrupting',
    status_label: '正在停止当前轮',
    headline: '主 Agent 已收到新的目标边界，会先停止可能跑偏的当前执行轮，再重新核对计划。',
    kind: 'revise_goal',
    kind_label: '目标调整',
    strategy: 'replan_same_task',
    route_label: '先停止当前轮再重核计划',
    replan_required: true,
    interrupt_current_run: true,
    reason: '先保留旧支付表，只新增兼容字段。',
    handoff_steps: [
      { id: 'capture', label: '已记录新的目标边界', detail: '先保留旧支付表，只新增兼容字段。' },
      { id: 'preserve_context', label: '保留已有上下文', detail: '已完成的文件、验证和子 Agent 结果说明会继续作为判断依据。' },
      { id: 'interrupt_and_replan', label: '停止当前轮并重核计划', detail: '主 Agent 正在停止当前执行轮；停止后会重新核对目标、影响范围和验收条件，再按新目标继续。' },
    ],
    next_action: '主 Agent 正在停止当前执行轮；停止后会重新核对目标、影响范围和验收条件，再按新目标继续。',
    at: now,
  },
  acceptance_review: {
    title: '主 Agent 验收',
    status: 'reviewing',
    headline: '还缺 3 项证据，不能宣布完成',
    checks: [
      { id: 'ack_gate', label: '接单说明完整', ok: false, detail: '还有 1 个接单说明需要补齐目标、范围和验证安排' },
      { id: 'memory_gate_receipt', label: '记忆使用声明', ok: false, detail: '还有 1 条记忆使用声明需要补齐' },
      { id: 'api_microcompact_receipt', label: '上下文压缩计划使用说明', ok: false, detail: '还有 1 个上下文压缩计划缺少使用状态' },
    ],
    missing: ['接单说明完整', '记忆使用声明', '上下文压缩计划使用说明'],
    next_action: '继续返工或补齐缺失证据后再验收',
    technical: {
      raw_gate_checks: [
        { id: 'ack_gate', detail: 'ACK raw detail' },
        { id: 'memory_gate_receipt', detail: '记忆 gate raw detail' },
        { id: 'api_microcompact_receipt', detail: 'API microcompact edit plan raw detail' },
      ],
    },
  },
  progress_checkpoints: {
    schema: 'ccm-main-agent-progress-checkpoints-v1',
    title: '关键进展',
    display_policy: { user_visible: true, raw_events_default_collapsed: true },
    items: [
      { id: 'cp-running', label: '当前执行轮仍在收尾', detail: '主 Agent 不会丢掉已返回的上下文。', status: 'active', phase: 'executing' },
      { id: 'cp-goal-revision', label: '用户调整了目标边界', detail: '本轮结束后会先重核计划。', status: 'warning', phase: 'rework' },
    ],
  },
  display_stream: {
    schema: 'ccm-streamlined-display-v2',
    user_visible_text: '目标调整已收到，主 Agent 会在当前轮结束后重新核对计划。',
    tool_use_summary: { type: 'streamlined_tool_use_summary', tool_summary: '目标调整已记录，等待当前执行轮结束' },
  },
  completed: ['已接收目标调整'],
  blockers: ['等待当前执行轮结束后重核计划'],
  next_action: '当前执行轮结束后，先重新核对计划，再继续执行。',
}

const mainAgentStatus = {
  schema: 'ccm-group-main-agent-status-v1',
  phase: 'completed',
  label: '已完成',
  task_id: 'task-render-1',
  running_child_agents: [],
  open_qa_count: 0,
  latest_progress_checkpoint: {
    id: 'completion-task-render-1',
    label: '任务交付完成',
    detail: '登录状态刷新后的恢复逻辑已经完成。',
    status: 'done',
    phase: 'completed',
    task_id: 'task-render-1',
  },
  recent_progress_checkpoints: [
    { id: 'cp-dispatch', label: '已派发给子 Agent', detail: 'web 正在修改登录状态恢复逻辑。', status: 'done', phase: 'executing' },
    { id: 'cp-review', label: '已检查交付质量', detail: '主 Agent 已核对文件变更和验证结果。', status: 'done', phase: 'reviewing' },
    { id: 'completion-task-render-1', label: '任务交付完成', detail: '登录状态刷新后的恢复逻辑已经完成。', status: 'done', phase: 'completed' },
  ],
  completion_summary: {
    schema: 'ccm-group-main-agent-completion-summary-v1',
    title: '修复登录状态刷新问题',
    status: 'done',
    status_label: '已完成',
    headline: '登录状态刷新后的恢复逻辑已经完成。',
    file_change_count: 2,
    verification_count: 1,
    risk_count: 0,
    next_action: '可以查看改动详情，或继续补充新的要求。',
  },
  pickup_summary: deliveryReport.pickup_summary,
  pickupSummary: deliveryReport.pickup_summary,
  latest_delivery_summary: {
    actual_file_change_count: 2,
    external_runner_verification_count: 1,
    delivery_report: deliveryReport,
    pickup_summary: deliveryReport.pickup_summary,
  },
}

const groupChildAgentActiveSummary = {
  schema: 'ccm-group-child-agent-status-summary-v1',
  title: '执行成员等待情况',
  status: 'needs_attention',
  status_label: '需补齐',
  completed_agents: ['api'],
  running_agents: ['web'],
  waiting_agents: [],
  attention_agents: ['qa'],
  summary_text: '已回传：api；处理中：web；待补齐：qa',
  next_action: '主 Agent 会先处理待补齐的验证证据，再汇总验收和最终总结。',
  rows: [
    { agent: 'api', status: 'completed', status_label: '已回传结果', detail: '接口筛选参数已补齐。' },
    { agent: 'web', status: 'running', status_label: '处理中', detail: '正在接入 owner 筛选 UI。' },
    { agent: 'qa', status: 'blocked', status_label: '待补齐', detail: '等待补充筛选场景验证证据。' },
  ],
}

const mainAgentActiveStatus = {
  schema: 'ccm-group-main-agent-status-v1',
  phase: 'executing',
  label: '正在处理',
  task_id: 'task-active-todo',
  latest_task_title: '接入负责人筛选',
  active_task_count: 1,
  running_child_agents: ['前端 · web 正在处理'],
  child_agent_status_summary: groupChildAgentActiveSummary,
  childAgentStatusSummary: groupChildAgentActiveSummary,
  current_todo_summary: {
    schema: 'ccm-group-main-agent-current-todo-v1',
    title: '我正在这样处理',
    task_id: 'task-active-todo',
    task_title: '接入负责人筛选',
    step_id: 'child_agent_execution',
    label: 'web 正在执行',
    active_form: '子 Agent 正在执行',
    detail: 'web 正在接入 owner 筛选 UI。',
    recent_action: '已派发给子 Agent',
    needs_action: '',
    needsAction: '',
    status: 'in_progress',
    status_label: '进行中',
    progress_label: '4/7',
    completed_count: 4,
    total_count: 7,
    next_action: '等待子 Agent 提交结果说明，然后主 Agent 会验收并总结。',
  },
  latest_progress_checkpoint: {
    id: 'cp-active-web',
    label: 'web 正在修改负责人筛选',
    detail: '主 Agent 已派发任务，等待子 Agent 提交结构化结果说明。',
    status: 'active',
    phase: 'executing',
    task_id: 'task-active-todo',
  },
  recent_progress_checkpoints: [
    { id: 'cp-plan-active', label: '主 Agent 已制定协作计划', detail: '已确认由 web 接入筛选 UI。', status: 'done', phase: 'planning' },
    { id: 'cp-dispatch-active', label: '已派发给子 Agent', detail: 'web 正在处理。', status: 'done', phase: 'dispatching' },
    { id: 'cp-active-web', label: 'web 正在修改负责人筛选', detail: '等待结果说明。', status: 'active', phase: 'executing' },
  ],
  progress_refresh_summary: {
    schema: 'ccm-group-main-agent-progress-refresh-v1',
    title: '进度刷新提醒',
    status: 'needs_refresh',
    status_label: '需要接续',
    headline: 'web 已经一段时间没有新的可展示进展，主 Agent 会先刷新状态，再决定继续等待、重派或定向补充。',
    current_state: 'web 已经一段时间没有新的可展示进展，主 Agent 会先刷新状态，再决定继续等待、重派或定向补充。',
    review_items: ['最后进展：web 正在修改负责人筛选', '待确认：web 是否仍在处理「接入 owner 筛选 UI」', 'trace_id=hidden-progress-refresh'],
    next_action: '先刷新任务卡；如果仍没有新结果，就重新派发或定向补充。',
    display_policy: { user_visible: true, show_for_ordinary_conversation: false, technical_details_default_collapsed: true, hide_internal_protocols: true },
  },
  open_qa_count: 1,
  blockers: [],
  needs: [],
  updated_at: now,
}

const mainAgentArchivedTodoStatus = {
  schema: 'ccm-group-main-agent-status-v1',
  phase: 'completed',
  label: '已完成',
  task_id: 'task-archived-current-todo',
  latest_task_title: '主 Agent 与 TestAgent 对接',
  active_task_count: 0,
  running_child_agents: [],
  current_todo_summary: {
    schema: 'ccm-group-main-agent-current-todo-v1',
    title: '群聊主 Agent 当前计划',
    task_id: 'task-archived-current-todo',
    task_title: '主 Agent 与 TestAgent 对接',
    step_id: 'summarize',
    label: '总结交付',
    active_form: '正在总结交付',
    detail: '计划已全部完成，主视图应只保留最终总结。',
    status: 'completed',
    status_label: '已完成',
    progress_label: '4/4',
    completed_count: 4,
    total_count: 4,
    next_action: '可以继续补充新要求，主 Agent 会重新形成新的计划。',
    display_policy: {
      user_visible: true,
      technical_details_default_collapsed: true,
      hide_internal_protocols: true,
      archive_completed_todo: true,
      visible_when_completed: false,
    },
  },
  completion_summary: {
    status: 'completed',
    status_label: '已完成',
    headline: '主 Agent 与 TestAgent 的连接闭环已经完成，Todo 已归档。',
    file_change_count: 0,
    verification_count: 1,
    risk_count: 0,
    next_action: '可以继续补充新要求。',
  },
  latest_progress_checkpoint: {
    id: 'cp-archived-current-todo',
    label: '已整理本轮总结',
    detail: '已完成计划、执行、TestAgent 复核和最终总结。',
    status: 'done',
    phase: 'completed',
    task_id: 'task-archived-current-todo',
  },
  open_qa_count: 0,
  blockers: [],
  needs: [],
  updated_at: now,
}

const planRevisionCard = {
  version: 1,
  visible: true,
  task_id: 'task-plan-revision',
  title: '调整支付流程',
  goal: '调整支付流程时先确认影响范围。',
  phase: 'needs_user',
  phase_label: '待确认',
  progress: 18,
  active_agents: [],
  agents: [],
  plan_mode: {
    title: '执行前计划',
    mode: 'cc-style-plan-mode',
    requires_confirmation: true,
    auto_continue: false,
    risk: { level: 'high', summary: '涉及支付数据结构，需要先确认执行边界。', reasons: ['数据结构调整', '多项目协作'] },
    revision: {
      status: 'revision_requested',
      count: 1,
      feedback: '先保留旧支付表，只新增兼容字段。',
      next_step: '请重新确认调整后的执行前计划；确认后才会派发子 Agent。',
    },
    needs_clarification: false,
    clarification_questions: [
      {
        id: 'compatibility_boundary',
        question: '是否需要兼容旧数据、旧接口或现有配置？',
        reason: '支付流程改动需要明确兼容策略。',
        examples: ['必须兼容旧接口', '可以只做新逻辑'],
        status: 'answered_by_revision',
        answer: '先保留旧支付表，只新增兼容字段。',
      },
    ],
    impact_scope: { projects: ['api', 'web'], areas: ['后端接口与数据契约', '前端页面与交互'], multi_agent: true },
    read_only_exploration: { summary: '只读代码快照和本地知识库召回已用于评估。', projects: ['api', 'web'], knowledge_used: true, code_snapshot_used: true },
    acceptance: ['必须有结构化结果说明', '必须有文件变更和验证证据', '已纳入用户调整意见：先保留旧支付表，只新增兼容字段。'],
    permission_boundaries: ['确认前不得修改文件', '调整后的计划重新确认前不得派发子 Agent 或修改文件'],
  },
  completed: ['已完成只读探索'],
  blockers: ['等待你确认调整后的执行前计划'],
  next_action: '请确认执行前计划，确认后才会派发子 Agent',
  actions: [
    { id: 'confirm_plan', label: '确认执行', kind: 'confirm_plan', tone: 'primary' },
    { id: 'revise_plan', label: '调整计划', kind: 'revise_plan', tone: 'warning' },
    { id: 'cancel', label: '取消任务', kind: 'cancel', tone: 'danger' },
  ],
  technical: { trace_id: 'trace-plan-revision' },
}

const confirmedPlanFollowupCard = {
  version: 1,
  visible: true,
  task_id: 'task-plan-confirmed-followup',
  title: '调整支付流程',
  goal: '按已确认的计划调整支付流程，并保留旧支付表兼容字段。',
  phase: 'executing',
  phase_label: '按计划执行',
  progress: 36,
  active_agents: ['后端 · api 正在执行', '前端 · web 等待接口契约'],
  agents: [
    { name: '后端 · api', status: 'running', summary: '正在新增兼容字段和接口契约' },
    { name: '前端 · web', status: 'pending', summary: '等待后端契约后接入结算页' },
  ],
  plan_mode: {
    title: '执行前计划',
    mode: 'cc-style-plan-mode',
    requires_confirmation: false,
    auto_continue: true,
    confirmation_status: 'confirmed',
    accepted_at: now,
    confirmed_at: now,
    accepted_feedback: '同时更新 README 中的支付兼容说明。',
    risk: { level: 'high', summary: '已按你确认后的边界进入执行，仍会在完成前核对支付兼容风险。', reasons: ['支付流程', '兼容旧数据'] },
    steps: [
      { id: 'understand_goal', label: '理解需求与验收目标', detail: '已确认需要保留旧支付表，只新增兼容字段。', status: 'completed' },
      { id: 'dispatch_sub_agents', label: '派发子 Agent 工作单', detail: 'api 正在执行后端兼容字段，web 等待契约。', status: 'in_progress' },
      { id: 'verify_and_summarize', label: '验收结果并总结给用户', detail: '完成后逐项核对改动、验证和 README 说明。', status: 'pending' },
    ],
    impact_scope: { projects: ['api', 'web'], areas: ['后端接口与数据契约', '前端结算页', 'README 兼容说明'], multi_agent: true },
    read_only_exploration: { summary: '只读探索已完成，支付表、接口和结算页都在影响范围内。', projects: ['api', 'web'], knowledge_used: true, code_snapshot_used: true },
    acceptance: ['旧支付表仍保留', '新增兼容字段并更新接口契约', 'README 写清支付兼容说明', '最终总结前逐项核对验收标准'],
    plan_execution_followup: {
      schema: 'ccm-main-agent-plan-execution-followup-v1',
      status: 'confirmed_tracking',
      title: '计划已确认，正在按计划执行',
      headline: '主 Agent 会带着你的补充要求推进执行，并在最终总结前逐项核对验收标准。',
      accepted_at: now,
      accepted_feedback: '同时更新 README 中的支付兼容说明。',
      next_action: '等待子 Agent 结果说明、文件改动和验证证据；如有偏离，主 Agent 会先返工再总结。',
      display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
    },
  },
  work_items: [
    { id: 'wi-api-pay', subject: '新增支付兼容字段', owner: 'api', target: 'api', status: 'running', evidence: [], blockedBy: [], attempt: 1 },
    { id: 'wi-web-pay', subject: '结算页接入兼容提示', owner: 'web', target: 'web', status: 'pending', evidence: [], blockedBy: ['api'], attempt: 1 },
    { id: 'wi-doc-pay', subject: '更新 README 兼容说明', owner: 'docs', target: 'docs', status: 'pending', evidence: [], blockedBy: ['api'], attempt: 1 },
  ],
  work_item_summary: { total: 3, counts: { running: 1, pending: 2 }, all_completed: false },
  completed: ['执行前计划已确认', '用户补充要求已记录'],
  blockers: [],
  next_action: '等待子 Agent 返回结果说明和验证证据，主 Agent 再验收并总结。',
  actions: [],
  technical: {
    trace_id: 'trace-plan-confirmed-followup',
    raw_payload: 'CCM_AGENT_RECEIPT raw payload should stay folded',
  },
}

const globalHistoryMessage = {
  role: 'assistant',
  content: '登录状态刷新后的恢复逻辑已经完成。',
  timestamp: now,
  type: 'global_agent_result',
  agenticRun: {
    id: 'global-run-render-1',
    status: 'completed',
    user_message: '全局检查登录状态刷新问题并完成修复',
    tool_calls: 1,
    final_reply: deliveryReport.markdown || deliveryReport.headline,
    final_delivery_report: deliveryReport,
    final_report: {
      delivery_report: deliveryReport,
      summary: deliveryReport.headline,
      plan_mode: renderedPlanMode,
      plan_alignment: renderedPlanAlignment,
      actual_file_changes: renderedChangeFiles,
      verification: ['npm run test:login-state'],
      acceptance_gate_passed: true,
    },
    plan_mode: renderedPlanMode,
    plan_alignment: renderedPlanAlignment,
    work_items: [
      { id: 'global-wi-web', subject: '修复登录状态恢复', owner: 'web', target: 'web', status: 'completed', evidence: ['登录状态恢复逻辑已完成'], filesChanged: ['frontend/src/stores/login.js'], verification: ['npm run test:login-state'] },
    ],
    mainAgentDecision: taskCompletedDecision,
    main_agent_decision: taskCompletedDecision,
    display_stream: {
      schema: 'ccm-streamlined-display-v2',
      user_visible_text: deliveryReport.headline,
      delivery_report: deliveryReport,
      main_agent_decision: taskCompletedDecision,
    },
    progress_checkpoints: {
      schema: 'ccm-main-agent-live-checkpoints-v1',
      items: [
        { id: 'global-cp-complete', label: '全局主 Agent 已整理交付总结', detail: deliveryReport.headline, status: 'done', phase: 'completed' },
      ],
    },
  },
}
const globalHistoryCard = globalAgentRunTaskCard(globalHistoryMessage)

const globalTestAgentUnknownCoverageSummary = {
  schema: 'ccm-main-agent-independent-review-summary-v1',
  title: '独立复核',
  status: 'needs_user',
  status_label: '等你确认',
  headline: '独立复核需要人工确认，我会先暂停最终验收。',
  rows: [
    'TestAgent：等你确认',
    '待确认：验收条件待确认：登录恢复验收需要真实浏览器证据',
  ],
  next_action: '等待你确认复核标记的问题。',
  display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
}

const globalTestAgentUnknownCoverageMessage = {
  role: 'assistant',
  content: '独立复核需要人工确认，我会先暂停最终验收。',
  timestamp: now,
  type: 'global_agent_result',
  agenticRun: {
    id: 'global-run-test-agent-unknown-coverage',
    status: 'waiting_user',
    phase: 'needs_user',
    user_message: '让 TestAgent 复核登录恢复交付',
    tool_calls: 1,
    final_reply: '独立复核需要人工确认，我会先暂停最终验收。',
    independent_review_summary: globalTestAgentUnknownCoverageSummary,
    independentReviewSummary: globalTestAgentUnknownCoverageSummary,
    test_agent_review_summary: globalTestAgentUnknownCoverageSummary,
    testAgentReviewSummary: globalTestAgentUnknownCoverageSummary,
    independent_review: globalTestAgentUnknownCoverageSummary.rows,
    independentReview: globalTestAgentUnknownCoverageSummary.rows,
    final_report: {
      summary: 'TestAgent 报告还有待确认的验收条件，本轮不能直接验收完成。',
      risks: ['验收条件待确认：登录恢复验收需要真实浏览器证据'],
      independent_review_summary: globalTestAgentUnknownCoverageSummary,
      independentReviewSummary: globalTestAgentUnknownCoverageSummary,
      independent_review: globalTestAgentUnknownCoverageSummary.rows,
      independentReview: globalTestAgentUnknownCoverageSummary.rows,
      acceptance_gate_passed: false,
      technical: {
        schema: 'ccm-test-agent-report-v1',
        status: 'passed',
        recommendation: 'accept',
        acceptanceCoverage: [{ criterion: '登录恢复验收需要真实浏览器证据', status: 'unknown', evidence: [] }],
        report_json: 'C:/tmp/test-agent-artifacts/global-unknown/report.json',
        artifact_manifest: 'C:/tmp/test-agent-artifacts/global-unknown/artifact-manifest.json',
      },
    },
  },
}
const globalTestAgentUnknownCoverageCard = globalAgentRunTaskCard(globalTestAgentUnknownCoverageMessage)

const globalTestAgentNotVerifiedCoverageSummary = {
  schema: 'ccm-main-agent-independent-review-summary-v1',
  title: '独立复核',
  status: 'needs_rework',
  status_label: '需返工',
  headline: '独立复核发现未通过项，我会先安排返工，再重新验收。',
  rows: [
    'TestAgent：需返工',
    '待返工：必检项：浏览器流程未覆盖：浏览器流程没有实际执行证据',
    '待返工：验收条件未通过：登录恢复验证必须通过',
  ],
  next_action: '先处理复核指出的缺口，再重新执行验收。',
  display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
}

const globalTestAgentNotVerifiedCoverageMessage = {
  role: 'assistant',
  content: '独立复核发现未通过项，我会先安排返工，再重新验收。',
  timestamp: now,
  type: 'global_agent_result',
  agenticRun: {
    id: 'global-run-test-agent-not-verified-coverage',
    status: 'failed',
    phase: 'failed',
    user_message: '让 TestAgent 复核登录恢复交付',
    tool_calls: 1,
    final_reply: 'TestAgent 复核指出仍有未覆盖项，我会先安排返工，再重新验收。',
    independent_review_summary: globalTestAgentNotVerifiedCoverageSummary,
    independentReviewSummary: globalTestAgentNotVerifiedCoverageSummary,
    test_agent_review_summary: globalTestAgentNotVerifiedCoverageSummary,
    testAgentReviewSummary: globalTestAgentNotVerifiedCoverageSummary,
    independent_review: globalTestAgentNotVerifiedCoverageSummary.rows,
    independentReview: globalTestAgentNotVerifiedCoverageSummary.rows,
    final_report: {
      summary: 'TestAgent 复核指出仍有未覆盖项，需要先返工。',
      risks: ['必检项：浏览器流程未覆盖', '验收条件未通过：登录恢复验证必须通过'],
      independent_review_summary: globalTestAgentNotVerifiedCoverageSummary,
      independentReviewSummary: globalTestAgentNotVerifiedCoverageSummary,
      independent_review: globalTestAgentNotVerifiedCoverageSummary.rows,
      independentReview: globalTestAgentNotVerifiedCoverageSummary.rows,
      acceptance_gate_passed: false,
      technical: {
        schema: 'ccm-test-agent-report-v1',
        status: 'passed',
        recommendation: 'accept',
        requiredCheckCoverage: [{ check: 'browser_e2e', status: 'not_verified', missingReason: '浏览器流程没有实际执行证据', evidence: [] }],
        acceptanceCoverage: [{ criterion: '登录恢复验证必须通过', status: 'not_verified', evidence: [] }],
        report_json: 'C:/tmp/test-agent-artifacts/global-not-verified/report.json',
        artifact_manifest: 'C:/tmp/test-agent-artifacts/global-not-verified/artifact-manifest.json',
      },
    },
  },
}
const globalTestAgentNotVerifiedCoverageCard = globalAgentRunTaskCard(globalTestAgentNotVerifiedCoverageMessage)

const globalTestAgentLatestEvidenceRecheckSummary = {
  schema: 'ccm-main-agent-independent-review-summary-v1',
  title: '独立复核',
  status: 'needs_recheck',
  status_label: '需复验',
  headline: 'TestAgent 的复核证据还没有闭环，我会先补齐检查并重新复验。',
  rows: [
    'TestAgent：需复验',
    '操作结果验证：共核对 1 次页面操作，1 次暂时无法确认效果。',
    '场景“提交登录表单”中有 1 次操作暂时无法确认页面效果，需要补齐可观察结果后重新复验。',
    '浏览器会话恢复：共检查 1 次恢复过程，1 次为避免重复副作用未自动重试。',
    '场景“提交登录表单”中有 1 次操作为避免重复点击或提交而没有自动重试；这不代表实现失败，需要在安全条件下重新复验。',
    '边界与异常验证：本轮缺少与当前目标相关的边界或异常检查。',
    '需要在 TestAgent 工作单中补充至少一项与当前目标相关的边界或异常检查，并重新运行复核。',
  ],
  next_action: '补齐可观察结果或目标关联的边界检查后，重新运行 TestAgent 复核。',
  display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
}

const globalTestAgentLatestEvidenceRecheckMessage = {
  role: 'assistant',
  content: globalTestAgentLatestEvidenceRecheckSummary.headline,
  timestamp: now,
  type: 'global_agent_result',
  agenticRun: {
    id: 'global-run-test-agent-latest-evidence-recheck',
    status: 'running',
    phase: 'reviewing',
    user_message: '重新核对 TestAgent 的浏览器操作、恢复和边界证据',
    tool_calls: 1,
    final_reply: globalTestAgentLatestEvidenceRecheckSummary.headline,
    independent_review_summary: globalTestAgentLatestEvidenceRecheckSummary,
    independentReviewSummary: globalTestAgentLatestEvidenceRecheckSummary,
    test_agent_review_summary: globalTestAgentLatestEvidenceRecheckSummary,
    testAgentReviewSummary: globalTestAgentLatestEvidenceRecheckSummary,
    independent_review: globalTestAgentLatestEvidenceRecheckSummary.rows,
    independentReview: globalTestAgentLatestEvidenceRecheckSummary.rows,
    final_report: {
      summary: globalTestAgentLatestEvidenceRecheckSummary.headline,
      risks: ['浏览器操作效果、会话恢复和目标关联边界证据尚未闭环。'],
      independent_review_summary: globalTestAgentLatestEvidenceRecheckSummary,
      independentReviewSummary: globalTestAgentLatestEvidenceRecheckSummary,
      independent_review: globalTestAgentLatestEvidenceRecheckSummary.rows,
      independentReview: globalTestAgentLatestEvidenceRecheckSummary.rows,
      acceptance_gate_passed: false,
      technical: {
        schema: 'ccm-test-agent-report-v1',
        status: 'passed',
        recommendation: 'accept',
        browserActionEffectSummary: {
          provider: 'playwright',
          url: 'http://127.0.0.1:5173/login?token=hidden',
          actionTypes: { click: 1 },
          changedSignals: { page_text: 0 },
        },
        browserRecoverySummary: {
          notRetried: 1,
          events: [{ rawSessionId: 'global-recheck-session-hidden', reason: 'unsafe duplicate side effect' }],
        },
        adversarialEvidenceSummary: {
          status: 'missing',
          probeTypes: ['duplicate_submit'],
          target: 'http://127.0.0.1:5173/login?token=hidden',
        },
        report_json: 'C:/tmp/test-agent-artifacts/global-recheck/report.json',
      },
    },
  },
}
const globalTestAgentLatestEvidenceRecheckCard = globalAgentRunTaskCard(globalTestAgentLatestEvidenceRecheckMessage)

const globalPostReviewSpotCheckRecheckSummary = {
  schema: 'ccm-main-agent-post-review-spot-check-summary-v1',
  title: '完成前抽查',
  status: 'needs_recheck',
  status_label: '需复验',
  headline: 'TestAgent 已通过，但我的完成前抽查有 1 项结果不一致。',
  rows: ['已抽查 2 项验证，1 项结果一致，1 项不一致'],
  next_action: '我会沿用原复核工作单重新运行 TestAgent，并再次抽查关键验证。',
  display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
}

const globalPostReviewSpotCheckRecheck = {
  schema: 'ccm-main-agent-post-review-spot-check-v1',
  required: true,
  pass: false,
  status: 'needs_recheck',
  report_id: 'global-private-spot-check-report',
  work_order_id: 'global-private-spot-check-work-order',
  candidate_count: 2,
  selected_count: 2,
  executed_count: 2,
  passed_count: 1,
  mismatch_count: 1,
  checks: [{
    command: 'node scripts/private-global-check.mjs',
    cwd: 'D:/private/global-project',
    review_exit_code: 0,
    observed_exit_code: 3,
    review_output_preview: 'claimed pass',
    observed_output_preview: 'private global check failed',
    observed_output_file: 'D:/private/global-project/.ccm-output/spot-check.log',
    matches_review: false,
  }],
  issues: ['复跑结果与 TestAgent 的通过结论不一致。'],
  headline: globalPostReviewSpotCheckRecheckSummary.headline,
  next_action: globalPostReviewSpotCheckRecheckSummary.next_action,
}

const globalPostReviewSpotCheckRecheckMessage = {
  role: 'assistant',
  content: globalPostReviewSpotCheckRecheckSummary.headline,
  timestamp: now,
  type: 'global_agent_result',
  agenticRun: {
    id: 'global-run-post-review-spot-check-recheck',
    status: 'running',
    phase: 'reviewing',
    user_message: '完成 TestAgent 复核后再抽查关键验证',
    tool_calls: 1,
    final_reply: globalPostReviewSpotCheckRecheckSummary.headline,
    post_review_spot_check_summary: globalPostReviewSpotCheckRecheckSummary,
    postReviewSpotCheckSummary: globalPostReviewSpotCheckRecheckSummary,
    post_review_spot_check: globalPostReviewSpotCheckRecheck,
    postReviewSpotCheck: globalPostReviewSpotCheckRecheck,
    independent_review_summary: {
      schema: 'ccm-main-agent-independent-review-summary-v1',
      title: '独立复核',
      status: 'needs_rework',
      status_label: '需复验',
      headline: globalPostReviewSpotCheckRecheckSummary.headline,
      rows: ['TestAgent：已通过', '完成前抽查：1 项结果不一致，需要同一个 TestAgent 重新复验。'],
      next_action: globalPostReviewSpotCheckRecheckSummary.next_action,
      display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
    },
    final_report: {
      summary: globalPostReviewSpotCheckRecheckSummary.headline,
      risks: ['完成前抽查尚未一致，本轮不能宣布完成。'],
      acceptance_gate_passed: false,
      post_review_spot_check_summary: globalPostReviewSpotCheckRecheckSummary,
      technical: {
        post_review_spot_check: globalPostReviewSpotCheckRecheck,
      },
    },
  },
}
const globalPostReviewSpotCheckRecheckCard = globalAgentRunTaskCard(globalPostReviewSpotCheckRecheckMessage)

const globalDirectDispatchSummary = {
  schema: 'ccm-main-agent-dispatch-launch-summary-v1',
  source: 'global-agent-direct-dispatch',
  title: '已派发的工作',
  count_label: '1 个执行目标',
  headline: '全局主 Agent 已把这次需求交给 1 个执行目标：dev-group。',
  rows: [
    {
      id: 'global-dispatch-send_group_cmd-dev-group',
      kind: 'group',
      agent: 'dev-group',
      role: '群聊主 Agent',
      task: '修复登录状态恢复逻辑，并在任务卡里持续更新计划、执行和最终总结。',
      reason: '全局主 Agent 判断该需求需要群聊主 Agent 接管并继续拆分执行。',
      depends_on: [],
      status: 'dispatched',
      status_label: '已进入任务链路',
    },
  ],
  acceptance: ['下游 Agent 需要给出用户能看懂的处理结果、验证情况和风险。'],
  next_action: '后续进度以群聊任务卡的计划、执行和最终总结为准。',
  technical_hint: '全局运行 ID、Trace、原始工作单和底层执行记录默认收在技术详情里。',
  display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false, show_when_plan_archived: true },
}

const setupGlobalAgentFixtureState = () => {
  const streamDispatchSummary = {
    ...globalDirectDispatchSummary,
    rows: globalDirectDispatchSummary.rows.map(row => ({
      ...row,
      reason: 'CCM_AGENT_RECEIPT raw payload should stay inside technical details.',
    })),
  }
  const streamPlanMode = {
    ...renderedPlanMode,
    source: 'global-main-agent-plan-mode-v1',
    schema: 'ccm-global-main-agent-plan-mode-v1',
    requirement: '给开发群派发任务，修复登录状态恢复逻辑',
    requires_confirmation: true,
    auto_continue: false,
    confirmation_status: 'awaiting_confirmation',
    risk: { level: 'medium', summary: '发送群聊指令需要你确认后才会执行。', reasons: ['会改变协作状态', '需要派发给群聊主 Agent'] },
    steps: [
      { id: 'global-plan-step-1', label: '确认目标和影响范围', detail: '先核对登录状态恢复任务要交给哪个群聊。', status: 'completed' },
      { id: 'global-plan-step-2', label: '等待用户确认', detail: '确认前不会发送群聊指令。', status: 'in_progress' },
      { id: 'global-plan-step-3', label: '派发群聊主 Agent 并总结', detail: '执行后说明派发目标、验收标准和下一步。', status: 'pending' },
    ],
    next_step: '等待你确认执行前计划；确认后继续执行并总结。',
  }
  const autoStreamPlanMode = {
    ...streamPlanMode,
    requirement: '我明确授权给开发群派发任务，修复登录状态恢复逻辑',
    requires_confirmation: false,
    auto_continue: true,
    confirmation_status: 'auto_continue',
    risk: { level: 'medium', summary: '已在当前授权范围内继续执行。', reasons: ['用户已明确授权', '仍会在完成后总结结果'] },
    steps: [
      { id: 'global-plan-step-1', label: '确认目标和授权范围', detail: '用户已明确授权发送群聊指令。', status: 'completed' },
      { id: 'global-plan-step-2', label: '派发群聊主 Agent', detail: '正在把任务交给 dev-group。', needs_action: '等待执行成员提交结果说明，然后我会验收并总结。', status: 'in_progress' },
      { id: 'global-plan-step-3', label: '检查结果并总结', detail: '完成后说明派发目标、验收标准和下一步。', status: 'pending' },
    ],
    next_step: '继续执行计划，并在完成后给出总结。',
  }
  const blockedStreamTodoPlan = {
    schema: 'ccm-main-agent-workchain-todo-v1',
    source: 'global-stream',
    title: '全局主 Agent 当前计划',
    steps: [
      { id: 'scope', label: '确认验收范围', active_form: '已确认验收范围', status: 'completed' },
      {
        id: 'evidence-gap',
        label: '补齐验收证据',
        active_form: '正在补齐验收证据',
        detail: '缺少真实浏览器验收记录，我会继续补齐证据。',
        needs_action: '等待执行成员提交结果说明，然后我会验收并总结。',
        status: 'blocked',
      },
      { id: 'summary', label: '整理最终总结', active_form: '等待整理最终总结', status: 'pending' },
    ],
    next_action: '补齐真实验证或复核证据后再总结。',
    display_policy: {
      user_visible: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      show_for_ordinary_conversation: false,
    },
  }
  const globalCompletedArchivedTodoPlan = {
    schema: 'ccm-main-agent-workchain-todo-v1',
    source: 'global-stream',
    title: '全局主 Agent 当前计划',
    steps: [
      { id: 'understand', label: '确认目标和影响范围', active_form: '正在确认目标和影响范围', status: 'completed' },
      { id: 'dispatch', label: '派发群聊主 Agent', active_form: '正在派发群聊主 Agent', status: 'completed' },
      { id: 'verify', label: '核对 TestAgent 复核和验证结果', active_form: '正在核对 TestAgent 复核和验证结果', status: 'completed' },
      { id: 'summary', label: '整理最终总结', active_form: '正在整理最终总结', status: 'completed' },
    ],
    visible_steps: [],
    visibleSteps: [],
    completed_count: 4,
    total_count: 4,
    progress_label: '4/4',
    verification: ['TestAgent 独立复核已通过'],
    independent_review: ['TestAgent：已通过'],
    display_policy: {
      user_visible: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      archive_completed_todo: true,
      archiveCompletedTodo: true,
      visible_when_completed: false,
      visibleWhenCompleted: false,
    },
  }
  const globalSupervisingTodoPlan = {
    schema: 'ccm-main-agent-workchain-todo-v1',
    source: 'global-supervision',
    title: '全局任务当前计划',
    steps: [
      { id: 'understand', label: '确认目标和影响范围', active_form: '已确认目标和影响范围', status: 'completed' },
      { id: 'dispatch', label: '派发执行目标', active_form: '已派发执行目标', status: 'completed' },
      { id: 'track', label: '跟踪执行和验收', active_form: '正在跟踪执行和验收', detail: '持续等待执行成员提交结果，并进行 TestAgent 复核。', status: 'in_progress' },
      { id: 'summary', label: '整理最终总结', active_form: '等待整理最终总结', status: 'pending' },
    ],
    next_action: '继续跟踪执行、验收和最终总结。',
    display_policy: {
      user_visible: true,
      technical_default_collapsed: true,
      hide_internal_protocols: true,
      show_for_ordinary_conversation: false,
    },
  }
  const globalSupervisingWorkchain = {
    schema: 'ccm-main-agent-workchain-v1',
    surface: 'global',
    mode: 'execute',
    phase: 'execute',
    status: 'supervising',
    user_visible_text: '任务已派发，正在持续跟踪执行和验收。',
    todo_plan: globalSupervisingTodoPlan,
    todoPlan: globalSupervisingTodoPlan,
    completion_summary: {
      headline: '任务仍在执行中，这还不是完成结果。',
      next_action: '继续跟踪执行、验收和最终总结。',
      evidence: ['已派发 2 个执行目标'],
      risks: [],
    },
    technical_details: [{
      id: 'ids',
      title: '运行标识',
      items: [
        { label: 'Mission', value: 'fixture-mission-running' },
        { label: 'Supervisor', value: 'fixture-supervisor-running' },
      ],
    }],
  }
  const globalSupervisingDecision = {
    version: 2,
    mode: 'delegation',
    todo_plan: globalSupervisingTodoPlan,
    todoPlan: globalSupervisingTodoPlan,
    user_plan_steps: globalSupervisingTodoPlan.steps,
  }
  globalSupervisingFixtureRun = {
    id: 'global-supervising-goal-revision-run',
    trace_id: 'trace-global-supervising-goal-revision',
    session_id: 'global-stream-fixture',
    source: 'web',
    status: 'supervising',
    phase: 'execute',
    supervision_state: 'monitoring',
    mission_id: 'fixture-mission-running',
    supervisor_id: 'fixture-supervisor-running',
    explicit_write_authorization: true,
    user_message: '修复登录状态恢复逻辑并完成验收',
    original_user_message: '修复登录状态恢复逻辑并完成验收',
    final_reply: '任务已派发，正在持续跟踪执行和验收。',
    tool_calls: 1,
    model_calls: 2,
    todo_plan: globalSupervisingTodoPlan,
    todoPlan: globalSupervisingTodoPlan,
    workchain: globalSupervisingWorkchain,
    display_stream: {
      schema: 'ccm-streamlined-display-v2',
      user_visible_text: globalSupervisingWorkchain.user_visible_text,
      workchain: globalSupervisingWorkchain,
      todo_plan: globalSupervisingTodoPlan,
      todoPlan: globalSupervisingTodoPlan,
      technical_details: globalSupervisingWorkchain.technical_details,
      main_agent_decision: globalSupervisingDecision,
      mainAgentDecision: globalSupervisingDecision,
    },
    final_report: {
      summary: '任务仍在执行中，这还不是完成结果。',
      next_action: '继续跟踪执行、验收和最终总结。',
    },
    user_steer_history: [],
    created_at: now,
    updated_at: now,
  }
  globalSupervisingFixtureMission = {
    id: 'fixture-mission-running',
    status: 'in_progress',
    business_goal: '修复登录状态恢复逻辑并完成验收',
    status_detail: '正在持续跟踪执行和验收。',
    mission_summary: { all_passed: false, pending: 2 },
    collaboration_state: {},
    todo_plan: globalSupervisingTodoPlan,
    todoPlan: globalSupervisingTodoPlan,
  }
  globalAgentFixtureSessions = [
    {
      id: 'global-stream-fixture',
      name: '全局流式派发',
      createdAt: now,
      updatedAt: now,
      messages: [
        {
          role: 'user',
          content: '你是谁？',
          timestamp: now,
        },
        {
          role: 'assistant',
          type: 'global_stream',
          streaming: false,
          content: '🧠 理解需求：这是普通问话，不创建任务。\n✍️ 组织回复：直接回答用户。',
          timestamp: now,
          streamEvents: [
            { tone: 'running', icon: '🧠', title: '理解需求', text: '这是普通问话，直接回答用户。' },
            { tone: 'ok', icon: '✍️', title: '组织回复', text: '不创建 Todo，也不派发给下游 Agent。' },
          ],
        },
        {
          role: 'user',
          content: '给开发群派发任务，修复登录状态恢复逻辑',
          timestamp: now,
        },
        {
          role: 'assistant',
          type: 'global_stream',
          streaming: false,
          content: '🔐 等待授权确认：发送群聊指令需要确认。',
          timestamp: now,
          streamEvents: [
            { tone: 'running', icon: '🧭', title: '形成行动计划', text: '已整理执行前计划，确认后再发送群聊指令。' },
            { tone: 'waiting', icon: '🔐', title: '等待授权确认', text: '这个操作需要你确认后才会继续。' },
          ],
          agenticRun: {
            id: 'global-plan-stream-run',
            status: 'waiting_confirmation',
            phase: 'needs_confirmation',
            user_message: '给开发群派发任务，修复登录状态恢复逻辑',
            original_user_message: '给开发群派发任务，修复登录状态恢复逻辑',
            final_reply: '发送群聊指令需要确认后才能继续。',
            pending_tool: { name: 'send_group_cmd', risk: 'write', signature: 'send_group_cmd:dev-group' },
            plan_mode: streamPlanMode,
            planMode: streamPlanMode,
            confirmation_summary: {
              schema: 'ccm-global-main-agent-confirmation-summary-v1',
              title: '等待授权确认',
              headline: '全局主 Agent 已准备执行“发送群聊主 Agent 指令”，确认前不会执行这一步。',
              question: '是否允许全局主 Agent 继续执行这一步？',
              next_action: '使用卡片按钮确认或取消；确认后会继续执行并给出结果总结。',
              display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_todo: false },
            },
          },
        },
        {
          role: 'user',
          content: '我明确授权给开发群派发任务，修复登录状态恢复逻辑',
          timestamp: now,
        },
        {
          role: 'assistant',
          type: 'global_stream',
          streaming: true,
          content: '🧭 执行前计划已整理：继续执行计划，并在完成后给出总结。',
          timestamp: now,
          streamEvents: [
            { tone: 'running', icon: '🧭', title: '执行前计划已整理', text: '继续执行计划，并在完成后给出总结。' },
            { tone: 'running', icon: '🛠️', title: '执行动作', text: '正在发送协作群指令。' },
            { tone: 'ok', icon: '✅', title: '动作已返回', text: '发送协作群指令已返回结果，我正在检查。' },
          ],
          agenticRun: {
            id: 'global-auto-plan-stream-run',
            status: 'running',
            phase: 'execute',
            user_message: '我明确授权给开发群派发任务，修复登录状态恢复逻辑',
            original_user_message: '我明确授权给开发群派发任务，修复登录状态恢复逻辑',
            final_reply: '',
            pending_tool: null,
            plan_mode: autoStreamPlanMode,
            planMode: autoStreamPlanMode,
          },
        },
        {
          role: 'assistant',
          type: 'global_stream',
          streaming: true,
          content: '🧪 当前步骤：正在补齐验收证据。',
          timestamp: now,
          streamEvents: [
            { tone: 'waiting', icon: '🧪', title: '补齐验收证据', text: '缺少真实浏览器验收记录，我会继续补齐证据。' },
          ],
          todo_plan: blockedStreamTodoPlan,
          todoPlan: blockedStreamTodoPlan,
          agenticRun: {
            id: 'global-blocked-current-todo-run',
            status: 'running',
            phase: 'execute',
            user_message: '继续补齐真实验收证据后再总结',
            original_user_message: '继续补齐真实验收证据后再总结',
            final_reply: '',
            todo_plan: blockedStreamTodoPlan,
            todoPlan: blockedStreamTodoPlan,
          },
        },
        {
          role: 'assistant',
          type: 'global_stream',
          streaming: false,
          content: '✅ 动作已返回：发送历史协作群指令已返回结果，我正在检查。',
          timestamp: now,
          streamEvents: [
            { tone: 'running', icon: '🛠️', title: '执行工具', text: '正在发送历史协作群指令。' },
            { tone: 'ok', icon: '✅', title: '工具完成', text: '发送历史协作群指令已完成，正在检查结果。' },
          ],
        },
        {
          role: 'assistant',
          type: 'global_stream',
          streaming: false,
          content: '⚠️ 执行动作遇到问题：发送协作群指令执行遇到问题，我正在重新判断下一步。',
          timestamp: now,
          streamEvents: [
            { tone: 'running', icon: '🛠️', title: '执行动作', text: '正在发送协作群指令。' },
            { tone: 'error', icon: '⚠️', title: '执行遇到问题', text: '发送协作群指令执行遇到问题，我正在重新判断下一步。' },
          ],
        },
        {
          role: 'user',
          content: '确认，继续派发',
          timestamp: now,
        },
        {
          role: 'assistant',
          type: 'global_stream',
          streaming: true,
          content: '📨 已派发的工作：dev-group 已进入任务链路。',
          timestamp: now,
          streamEvents: [
            { tone: 'running', icon: '🧭', title: '形成行动计划', text: '已判断需要群聊主 Agent 接管并继续拆分执行。' },
            { tone: 'ok', icon: '📨', title: '已派发的工作', text: '全局主 Agent 已把这次需求交给 dev-group。下一步等待群聊任务卡更新。' },
          ],
          dispatch_launch_summary: streamDispatchSummary,
          dispatchLaunchSummary: streamDispatchSummary,
          progress_refresh_summary: {
            schema: 'ccm-global-main-agent-progress-refresh-v1',
            title: '进度刷新提醒',
            status: 'needs_refresh',
            status_label: '需要接续',
            headline: 'dev-group 的群聊任务卡已经一段时间没有新的可展示进展，全局主 Agent 会主动刷新状态。',
            current_state: 'dev-group 的群聊任务卡已经一段时间没有新的可展示进展，全局主 Agent 会主动刷新状态。',
            review_items: ['关注对象：dev-group', '接续要点：刷新群聊任务卡后继续验收', 'trace_id=hidden-global-refresh'],
            next_action: '先刷新群聊任务卡；如果仍没有新结果，就继续等待或定向补充。',
            display_policy: { user_visible: true, show_for_ordinary_conversation: false, technical_details_default_collapsed: true, hide_internal_protocols: true },
          },
        },
        {
          role: 'user',
          content: '继续让 TestAgent 独立复核这次交付',
          timestamp: now,
        },
        {
          role: 'assistant',
          type: 'global_stream',
          streaming: true,
          content: '✅ TestAgent 复核计划：TestAgent 复核计划预检未通过，主 Agent 会先修复交接信息再执行。',
          timestamp: now,
          streamEvents: [
            { tone: 'running', icon: '🧭', title: '形成行动计划', text: '已判断需要 TestAgent 做独立复核。' },
            { tone: 'waiting', icon: '✅', title: 'TestAgent 复核计划', text: 'TestAgent 复核计划预检未通过，主 Agent 会先修复交接信息再执行。' },
          ],
          agenticRun: {
            id: 'global-test-agent-plan-stream-run',
            status: 'running',
            phase: 'execute',
            user_message: '继续让 TestAgent 独立复核这次交付',
            original_user_message: '继续让 TestAgent 独立复核这次交付',
            final_reply: '',
            tool_calls: 1,
            test_agent_execution_plan_summary: 'TestAgent 复核计划：1 个项目，0 个命令，0 个 HTTP 检查，0 个浏览器检查；预期证据：结构化报告、证据清单、复核结论',
            testAgentExecutionPlanSummary: 'TestAgent 复核计划：1 个项目，0 个命令，0 个 HTTP 检查，0 个浏览器检查；预期证据：结构化报告、证据清单、复核结论',
            test_agent_execution_plan: testAgentBlockedExecutionPlanFixture,
            testAgentExecutionPlan: testAgentBlockedExecutionPlanFixture,
          },
        },
        {
          role: 'user',
          content: 'TestAgent 复核完成后把结论同步给我',
          timestamp: now,
        },
        {
          role: 'assistant',
          type: 'global_stream',
          streaming: true,
          content: '✅ 独立复核：TestAgent/独立复核已检查交付证据，主 Agent 可以继续做最终验收。',
          timestamp: now,
          streamEvents: [
            { tone: 'running', icon: '✅', title: 'TestAgent 复核计划', text: 'TestAgent 已生成复核计划，主 Agent 会按计划启动独立复核。' },
            { tone: 'ok', icon: '✅', title: '独立复核', text: 'TestAgent/独立复核已检查交付证据，主 Agent 可以继续做最终验收。' },
          ],
          agenticRun: {
            id: 'global-test-agent-review-stream-run',
            status: 'running',
            phase: 'execute',
            user_message: 'TestAgent 复核完成后把结论同步给我',
            original_user_message: 'TestAgent 复核完成后把结论同步给我',
            final_reply: '',
            tool_calls: 1,
            test_agent_execution_plan_summary: testAgentExecutionPlanTextSummary,
            testAgentExecutionPlanSummary: testAgentExecutionPlanTextSummary,
            test_agent_execution_plan: testAgentExecutionPlanFixture,
            testAgentExecutionPlan: testAgentExecutionPlanFixture,
            independent_review_summary: {
              schema: 'ccm-main-agent-independent-review-summary-v1',
              title: '独立复核',
              status: 'passed',
              status_label: '已通过',
              headline: 'TestAgent/独立复核已检查交付证据，主 Agent 可以继续做最终验收。',
              rows: ['TestAgent：已通过', '登录态浏览器验收：共执行 2 项登录检查，2 项通过，覆盖 2 个已登录会话。', '多人协作浏览器验收：共执行 2 个场景，2 个通过，覆盖 4 个会话角色，包含 2 组并行动作，核对 2 项跨会话结果。', '真实浏览器验收：共执行 2 个流程，2 个通过，覆盖 2 条验收条件。', '验证证据：npm run test:login-state', '文件上传：已验证 2 个上传文件（notes.txt、meta.json）', '文件下载：已验证 1 个下载文件（tasks.csv）', '浏览器交互：已执行 2 个操作、3 个断言，未发现失败步骤', '浏览器网络：记录 4 个请求、4 个响应，未发现网络错误'],
              next_action: '继续核对交付总结、改动和验证结果。',
              display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
            },
            independentReviewSummary: {
              schema: 'ccm-main-agent-independent-review-summary-v1',
              title: '独立复核',
              status: 'passed',
              status_label: '已通过',
              headline: 'TestAgent/独立复核已检查交付证据，主 Agent 可以继续做最终验收。',
              rows: ['TestAgent：已通过', '登录态浏览器验收：共执行 2 项登录检查，2 项通过，覆盖 2 个已登录会话。', '多人协作浏览器验收：共执行 2 个场景，2 个通过，覆盖 4 个会话角色，包含 2 组并行动作，核对 2 项跨会话结果。', '真实浏览器验收：共执行 2 个流程，2 个通过，覆盖 2 条验收条件。', '验证证据：npm run test:login-state', '文件上传：已验证 2 个上传文件（notes.txt、meta.json）', '文件下载：已验证 1 个下载文件（tasks.csv）', '浏览器交互：已执行 2 个操作、3 个断言，未发现失败步骤', '浏览器网络：记录 4 个请求、4 个响应，未发现网络错误'],
              next_action: '继续核对交付总结、改动和验证结果。',
              display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
            },
            independent_review: ['TestAgent：已通过 - 已复核登录恢复逻辑和验证记录，未发现阻塞风险。', '登录态浏览器验收：共执行 2 项登录检查，2 项通过，覆盖 2 个已登录会话。', '多人协作浏览器验收：共执行 2 个场景，2 个通过，覆盖 4 个会话角色，包含 2 组并行动作，核对 2 项跨会话结果。', '真实浏览器验收：共执行 2 个流程，2 个通过，覆盖 2 条验收条件。', '文件上传：已验证 2 个上传文件（notes.txt、meta.json）', '文件下载：已验证 1 个下载文件（tasks.csv）', '浏览器交互：已执行 2 个操作、3 个断言，未发现失败步骤', '浏览器网络：记录 4 个请求、4 个响应，未发现网络错误'],
            independentReview: ['TestAgent：已通过 - 已复核登录恢复逻辑和验证记录，未发现阻塞风险。', '登录态浏览器验收：共执行 2 项登录检查，2 项通过，覆盖 2 个已登录会话。', '多人协作浏览器验收：共执行 2 个场景，2 个通过，覆盖 4 个会话角色，包含 2 组并行动作，核对 2 项跨会话结果。', '真实浏览器验收：共执行 2 个流程，2 个通过，覆盖 2 条验收条件。', '文件上传：已验证 2 个上传文件（notes.txt、meta.json）', '文件下载：已验证 1 个下载文件（tasks.csv）', '浏览器交互：已执行 2 个操作、3 个断言，未发现失败步骤', '浏览器网络：记录 4 个请求、4 个响应，未发现网络错误'],
            test_agent_report: groupLiveTestAgentReviewMergedCard.technical.test_agent_report,
            testAgentReport: groupLiveTestAgentReviewMergedCard.technical.test_agent_report,
            post_review_spot_check_summary: groupLiveTestAgentReviewMergedCard.post_review_spot_check_summary,
            postReviewSpotCheckSummary: groupLiveTestAgentReviewMergedCard.post_review_spot_check_summary,
            post_review_spot_check: groupLiveTestAgentReviewMergedCard.technical.post_review_spot_check,
            postReviewSpotCheck: groupLiveTestAgentReviewMergedCard.technical.post_review_spot_check,
          },
        },
        {
          role: 'user',
          content: '如果 TestAgent 发现没通过，要告诉我怎么返工',
          timestamp: now,
        },
        {
          role: 'assistant',
          type: 'global_stream',
          streaming: false,
          content: '⚠️ 独立复核未通过：TestAgent 发现未通过项，我会先安排返工，再重新验收。',
          timestamp: now,
          streamEvents: [
            { tone: 'running', icon: '✅', title: '读取独立复核', text: 'TestAgent 已返回复核结论。' },
            { tone: 'warning', icon: '⚠️', title: '需要返工', text: '独立复核发现未通过项，我会先安排返工，再重新验收。' },
          ],
          agenticRun: {
            id: 'global-test-agent-review-failed-run',
            status: 'failed',
            phase: 'failed',
            user_message: '如果 TestAgent 发现没通过，要告诉我怎么返工',
            original_user_message: '如果 TestAgent 发现没通过，要告诉我怎么返工',
            final_reply: 'TestAgent 独立复核未通过，我会先把失败检查项带回给原实现成员返工；返工完成后会自动沿用原工作单重新运行 TestAgent 复核。',
            tool_calls: 1,
            independent_review_summary: testAgentFailedReviewSummary,
            independentReviewSummary: testAgentFailedReviewSummary,
            test_agent_review_summary: testAgentFailedReviewSummary,
            testAgentReviewSummary: testAgentFailedReviewSummary,
            independent_review: testAgentFailedReviewSummary.rows,
            independentReview: testAgentFailedReviewSummary.rows,
            final_report: {
              summary: 'TestAgent 独立复核未通过，需要先返工。',
              risks: ['命令验证未通过', '登录恢复验收条件未通过'],
              independent_review_summary: testAgentFailedReviewSummary,
              independentReviewSummary: testAgentFailedReviewSummary,
              independent_review: testAgentFailedReviewSummary.rows,
              independentReview: testAgentFailedReviewSummary.rows,
              acceptance_gate_passed: false,
              technical: {
                verdict: 'failed',
                recommendation: 'rework',
                browserActionEffectSummary: {
                  provider: 'playwright',
                  url: 'http://127.0.0.1:5173/login?token=hidden',
                  actionTypes: { click: 1 },
                  changedSignals: { page_text: 0, network: 0 },
                },
                adversarialEvidenceSummary: {
                  provider: 'playwright',
                  probeType: 'duplicate_submit',
                  target: 'http://127.0.0.1:5173/login?token=hidden',
                  rawSessionId: 'global-failed-review-session-hidden',
                },
                report_json: 'C:/tmp/test-agent-artifacts/failed/report.json',
                verdict_json: 'C:/tmp/test-agent-artifacts/failed/verdict.json',
                artifact_manifest: 'C:/tmp/test-agent-artifacts/failed/artifact-manifest.json',
              },
            },
          },
        },
        {
          role: 'assistant',
          type: 'global_stream',
          streaming: true,
          content: '📨 派发状态：web 正在处理现有工作，下一项会继续等待。',
          timestamp: now,
          streamEvents: [
            { tone: 'waiting', icon: '📨', title: '派发状态', text: 'web 正在处理现有工作，下一项会继续等待。' },
          ],
          agenticRun: {
            id: 'global-work-item-claim-waiting-run',
            status: 'running',
            phase: 'execute',
            user_message: '继续派发前端筛选工作项',
            original_user_message: '继续派发前端筛选工作项',
            final_reply: '',
            tool_calls: 1,
            work_items: [
              { id: 'global-wi-login', subject: '修复登录状态恢复', activeForm: '正在修复登录状态恢复', owner: 'web', target: 'web', status: 'in_progress', blockedBy: [], attempt: 1 },
              { id: 'global-wi-filter', subject: '接入 owner 筛选 UI', activeForm: '等待接入 owner 筛选 UI', owner: 'web', target: 'web-filter', status: 'pending', blockedBy: [], attempt: 1 },
            ],
            work_item_summary: {
              total: 2,
              counts: { in_progress: 1, pending: 1 },
              next_claimable: [{ id: 'global-wi-filter', target: 'web-filter', subject: '接入 owner 筛选 UI', activeForm: '等待接入 owner 筛选 UI' }],
              all_completed: false,
            },
            work_item_unlock_summary: {
              schema: 'ccm-main-agent-work-item-unlock-summary-v1',
              title: '前置完成，下一步已解锁',
              status: 'auto_dispatch_deferred',
              status_label: '已自动接上',
              headline: 'api 完成后，“接入 owner 筛选 UI”已经解锁，主 Agent 已自动接上派发。',
              rows: [{ id: 'global-wi-filter', target: 'web-filter', owner: 'web', subject: '接入 owner 筛选 UI', label: 'web-filter 的前置依赖已完成，可以进入下一步' }],
              next_claimable: [{ id: 'global-wi-filter', target: 'web-filter', owner: 'web', subject: '接入 owner 筛选 UI', activeForm: '等待接入 owner 筛选 UI' }],
              next_action: '当前执行轮结束后，主 Agent 会继续派发这个已解锁工作项。',
              display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
              technical: { completed_agent: 'api', unlocked_work_item_ids: ['global-wi-filter'], auto_dispatch: { deferred: true } },
            },
            work_item_claim_summary: {
              schema: 'ccm-main-agent-work-item-claim-summary-v1',
              title: '派发状态',
              status: 'agent_busy',
              status_label: '继续等待',
              headline: 'web 正在处理“修复登录状态恢复”，“接入 owner 筛选 UI”会继续等待。',
              next_action: '当前工作完成后，主 Agent 会重新检查并派发这个工作项。',
              display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
              technical: { reason_code: 'agent_busy', work_item_id: 'global-wi-filter', busy_work_item_id: 'global-wi-login' },
            },
            completion_readiness_summary: {
              schema: 'ccm-main-agent-completion-readiness-v1',
              title: '完成前收尾',
              status: 'blocked',
              status_label: '尚未收尾',
              headline: '还有 1 个工作项未完成，1 个子 Agent 会话仍在处理，主 Agent 不会提前宣布完成。',
              rows: [{ target: 'web-filter', subject: '接入 owner 筛选 UI', status: 'pending', status_label: '等待开始' }],
              open_session_count: 1,
              unresolved_work_item_count: 1,
              next_action: '先完成或处理这些工作项；全部收敛后再做最终总结。',
              display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
              technical: { unresolved_work_item_ids: ['global-wi-filter'], open_session_ids: ['global-session-hidden'] },
            },
          },
        },
        {
          role: 'assistant',
          type: 'global_stream',
          streaming: false,
          content: '✅ 全局 Todo 已归档：最终总结已整理。',
          timestamp: now,
          streamEvents: [
            { tone: 'ok', icon: '✅', title: '全局 Todo 已归档', text: '计划、执行、TestAgent 复核和总结都已完成。' },
          ],
          todo_plan: globalCompletedArchivedTodoPlan,
          todoPlan: globalCompletedArchivedTodoPlan,
          agenticRun: {
            id: 'global-completed-archived-todo-run',
            status: 'completed',
            phase: 'completed',
            user_message: '完成后把全局 Todo 收起，只保留总结',
            original_user_message: '完成后把全局 Todo 收起，只保留总结',
            final_reply: '全局主 Agent 已完成本轮处理，Todo 已归档，最终总结已整理。',
            todo_plan: globalCompletedArchivedTodoPlan,
            todoPlan: globalCompletedArchivedTodoPlan,
            final_report: {
              summary: '全局主 Agent 已完成本轮处理，Todo 已归档，最终总结已整理。',
              verification: ['TestAgent 独立复核已通过'],
              independent_review: ['TestAgent：已通过', '多人协作浏览器验收：共执行 2 个场景，2 个通过，覆盖 4 个会话角色，包含 2 组并行动作，核对 2 项跨会话结果。', '真实浏览器验收：共执行 2 个流程，2 个通过，覆盖 2 条验收条件。', '文件上传：已验证 2 个上传文件（notes.txt、meta.json）', '文件下载：已验证 1 个下载文件（tasks.csv）', '浏览器交互：已执行 2 个操作、3 个断言，未发现失败步骤', '浏览器网络：记录 4 个请求、4 个响应，未发现网络错误'],
              acceptance_gate_passed: true,
            },
            final_delivery_report: {
              headline: '全局主 Agent 已完成本轮处理，Todo 已归档，最终总结已整理。',
              status: 'done',
              status_label: '已完成',
              verification: ['TestAgent 独立复核已通过'],
              acceptance: ['主 Agent 已纳入复核结论。'],
            },
          },
        },
        {
          role: 'user',
          content: '修复登录状态恢复逻辑并完成验收',
          timestamp: now,
        },
        {
          role: 'assistant',
          type: 'global_stream',
          streaming: false,
          content: '📡 持续跟进中：任务已派发，正在持续跟踪执行和验收。',
          timestamp: now,
          streamEvents: [
            { tone: 'running', icon: '📡', title: '持续跟进中', text: '任务已派发，正在持续跟踪执行和验收。' },
          ],
          globalMissionSupervisor: {
            id: 'fixture-supervisor-running',
            mission_id: 'fixture-mission-running',
            global_run_id: globalSupervisingFixtureRun.id,
            status: 'monitoring',
            phase: 'supervising',
          },
          agenticRun: globalSupervisingFixtureRun,
        },
        {
          id: 'global-mission-notification:fixture-mission-waiting:waiting_user',
          role: 'assistant',
          type: 'global_mission_waiting_user',
          missionNotificationState: 'waiting_user',
          content: '「登录恢复真实验收」暂时停在需要你处理的位置。\n需要补充：请提供测试环境的登录地址和可用测试账号；收到后我会继续复核和总结。',
          timestamp: now,
          globalMission: {
            id: 'fixture-mission-waiting',
            trace_id: 'trace-global-waiting-hidden',
            title: '登录恢复真实验收',
            business_goal: '完成登录恢复的真实浏览器验收并给出最终总结',
            status: 'in_progress',
            status_detail: '任务正在等待测试条件，收到后会继续执行。',
            mission_summary: { total: 1, passed: 0, blocked: 1 },
          },
          globalMissionChildren: [],
          globalMissionSupervisor: {
            id: 'fixture-supervisor-waiting-hidden',
            status: 'waiting_user',
            incidents: [{ type: 'waiting_user', reason: '请提供测试环境的登录地址和可用测试账号；收到后我会继续复核和总结。' }],
          },
        },
        {
          id: 'global-mission-notification:fixture-mission-cancelled:cancelled',
          role: 'assistant',
          type: 'global_mission_terminal',
          missionNotificationState: 'cancelled',
          content: '「旧版登录兼容清理」已取消，我已保留停止前的进度；需要时可以重新发起。',
          timestamp: now,
          globalMission: {
            id: 'fixture-mission-cancelled',
            trace_id: 'trace-global-cancelled-hidden',
            title: '旧版登录兼容清理',
            business_goal: '移除旧版登录兼容逻辑',
            status: 'cancelled',
            status_detail: '任务已按你的要求取消，停止前的进度已保留。',
            mission_summary: { total: 1, passed: 0, blocked: 0 },
          },
          globalMissionChildren: [],
          globalMissionSupervisor: {
            id: 'fixture-supervisor-cancelled-hidden',
            status: 'cancelled',
          },
        },
      ],
    },
  ]
  localStorage.setItem(GLOBAL_AGENT_SESSIONS_KEY, JSON.stringify(globalAgentFixtureSessions))
  localStorage.setItem(GLOBAL_AGENT_CURRENT_ID_KEY, 'global-stream-fixture')
}

const globalDirectDispatchReport = {
  schema: 'ccm-main-agent-delivery-report-v1',
  title: '全局直派群聊主 Agent',
  status: 'done',
  status_label: '已派发',
  headline: '群聊主 Agent 已收到全局工作单，并按任务链路接管。',
  sections: [
    { id: 'completed', title: '处理结果', items: ['需求已派发到 dev-group，当前不代表最终交付完成。'] },
    { id: 'next', title: '下一步', items: ['后续进度以群聊任务卡的计划、执行和最终总结为准。'] },
  ],
  files: [],
  verification: ['已创建群聊任务链路'],
  acceptance: ['主 Agent 验收：当前仅确认已派发，最终验收等待下游任务完成。'],
  risks: ['这只是已派发，不代表需求已经完成。'],
  next_action: '后续进度以群聊任务卡的计划、执行和最终总结为准。',
  display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false },
}

const globalDirectDispatchMessage = {
  role: 'assistant',
  content: '群聊主 Agent 已收到全局工作单，并按任务链路接管。',
  timestamp: now,
  type: 'global_agent_result',
  agenticRun: {
    id: 'global-run-direct-dispatch',
    status: 'completed',
    user_message: '给开发群派发任务，修复登录状态恢复逻辑',
    tool_calls: 1,
    final_reply: '群聊主 Agent 已收到全局工作单，并按任务链路接管。',
    final_delivery_report: globalDirectDispatchReport,
    final_report: { delivery_report: globalDirectDispatchReport, summary: globalDirectDispatchReport.headline },
    display_stream: {
      schema: 'ccm-streamlined-display-v2',
      user_visible_text: globalDirectDispatchReport.headline,
      delivery_report: globalDirectDispatchReport,
      dispatch_launch_summary: globalDirectDispatchSummary,
    },
  },
}
const globalDirectDispatchCard = globalAgentRunTaskCard(globalDirectDispatchMessage)

const globalSingleProjectDispatchSummary = {
  schema: 'ccm-main-agent-dispatch-launch-summary-v1',
  source: 'global-agent-direct-dispatch',
  title: '已派发的工作',
  count_label: '1 个执行目标',
  headline: '我已把这次需求交给 backend-api，并开始持续跟进执行和验收。',
  rows: [
    {
      id: 'global-dispatch-send_project_cmd-backend-api',
      kind: 'project',
      agent: 'backend-api',
      role: '项目执行成员',
      task: '修复登录恢复逻辑，运行项目验证，并在独立复核通过后总结。',
      reason: '该需求适合由指定项目执行，我会继续跟进独立复核和最终验收。',
      depends_on: [],
      status: 'running',
      status_label: '已进入持续监督',
    },
  ],
  acceptance: [
    '项目执行成员需要说明实际动作、文件变化、验证结果和风险。',
    'TestAgent 独立复核和完成前抽查通过后才能输出最终总结。',
  ],
  next_action: '等待项目执行结果；随后运行 TestAgent 独立复核和完成前抽查。',
  display_policy: { user_text_first: true, technical_default_collapsed: true, hide_internal_protocols: true, show_for_ordinary_conversation: false, show_when_plan_archived: true },
}

const globalSingleProjectDispatchMessage = {
  role: 'assistant',
  content: '单项目任务已进入持续监督；当前只是已派发，不代表最终完成。',
  timestamp: now,
  type: 'global_agent_result',
  agenticRun: {
    id: 'global-run-single-project-supervised',
    status: 'supervising',
    phase: 'execute',
    user_message: '给 backend-api 修复登录恢复逻辑并完成独立验收',
    tool_calls: 1,
    mission_id: 'mission-single-project-private',
    supervisor_id: 'supervisor-single-project-private',
    supervision_state: 'monitoring',
    final_reply: '单项目任务已进入持续监督；当前只是已派发，不代表最终完成。',
    final_report: {
      summary: '单项目任务已进入持续监督。',
      next_action: '等待项目执行结果；随后运行 TestAgent 独立复核和完成前抽查。',
      technical_content: 'ccm-test-agent-handoff-v1 trace_id=single-project-secret raw payload',
    },
    display_stream: {
      schema: 'ccm-streamlined-display-v2',
      user_visible_text: '单项目任务已进入持续监督；当前只是已派发，不代表最终完成。',
      dispatch_launch_summary: globalSingleProjectDispatchSummary,
      technical_details: ['ccm-test-agent-handoff-v1 trace_id=single-project-secret raw payload'],
    },
  },
}
const globalSingleProjectDispatchCard = globalAgentRunTaskCard(globalSingleProjectDispatchMessage)

const globalFailedHistoryMessage = {
  role: 'assistant',
  content: '任务没有完成，原因已整理。',
  timestamp: now,
  type: 'global_agent_result',
  agenticRun: {
    id: 'global-run-render-failed',
    status: 'failed',
    goal: '修复登录状态刷新问题',
    user_message: '修复登录状态刷新问题',
    tool_calls: 1,
    error: '缺少测试环境变量',
    final_report: { risks: '需要补齐 .env.test 后再验收' },
  },
}
const globalFailedHistoryCard = globalAgentRunTaskCard(globalFailedHistoryMessage)

const internalProtocolFailureMessage = {
  role: 'assistant',
  content: '任务没有完成，排障信息已整理。',
  timestamp: now,
  type: 'global_agent_result',
  agenticRun: {
    id: 'global-run-render-internal-failure',
    status: 'failed',
    goal: '同步支付状态',
    user_message: '同步支付状态',
    tool_calls: 1,
    error: 'CCM_AGENT_RECEIPT failed raw payload trace_id=exec-hidden-failure denied',
    final_report: { risks: ['Runtime Kernel failed session_id=session-hidden-failure'] },
  },
}
const internalProtocolFailureCard = globalAgentRunTaskCard(internalProtocolFailureMessage)

const globalCancelledHistoryMessage = {
  role: 'assistant',
  content: '用户取消了本轮任务。',
  timestamp: now,
  type: 'global_agent_result',
  agenticRun: {
    id: 'global-run-render-cancelled',
    status: 'cancelled',
    goal: '整理自动化任务列表',
    user_message: '整理自动化任务列表',
    tool_calls: 1,
    final_reply: '本轮任务已按要求停止。',
  },
}
const globalCancelledHistoryCard = globalAgentRunTaskCard(globalCancelledHistoryMessage)

const agentQaVisibleMessage = {
  id: 'qa-visible-message',
  role: 'assistant',
  type: 'agent_qa',
  agent: 'web',
  content: '',
  qa: {
    id: 'qa-visible-message',
    kind: 'question',
    from_agent: 'web',
    to_agent: 'qa',
    target: 'qa',
    status: 'waiting',
    type: 'request_review',
    blocking: true,
    question: '是否已经有真实浏览器验收记录？',
    answer: '',
    content: '',
    execution_id: 'exec-hidden-qa',
    routing: { strategy: 'ask_agent' },
    permission_contract: { mode: 'advisory_read_only' },
    answer_evidence: ['trace_id=hidden-agent-qa'],
  },
}

const childEvents = [
  { kind: 'status', time: now, text: '准备读取相关文件' },
  { kind: 'tool', time: now, text: 'Read LoginStore.vue' },
  { kind: 'output', time: now, text: 'CCM_AGENT_RECEIPT raw payload should be hidden from normal users' },
  { kind: 'done', time: now, text: '完成登录状态恢复修改，等待主 Agent 验收' },
]

const FixtureApp = {
  components: { MainAgentDecisionCard, TaskExperienceCard, GroupMainAgentStatusCard, ProjectTaskIntakeMessage, TaskCollaborationCard, AgentCodeChangeDrawer, AgentQaMessage, GlobalAgent, ChatComposer, AgentExecutionMessage },
  setup() {
    setupGlobalAgentFixtureState()
    window.__ccmLastTaskAction = null
    const childSummary = computed(() => summarizeWorkEvents(childEvents))
    const compactWorkText = (text) => sanitizeUserFacingAgentText(text, '执行成员正在执行。', 220)
    const agentDisplayName = (agent) => ({ web: '前端', qa: '测试' }[agent] || agent || '执行成员')
    const ordinaryMultilineMessage = {
      role: 'assistant',
      agent: 'coordinator',
      content: '你好啊！我在呢。\n\n你可以直接问我：\n- 查系统信息\n- 听歌\n- 处理项目任务',
    }
    const codeDrawer = ref({
      visible: false,
      title: '',
      subtitle: '',
      project: '',
      fileChanges: null,
      files: [],
      selectedPath: '',
    })
    const handleTaskAction = (action) => {
      window.__ccmLastTaskAction = action
      if (action?.kind !== 'view_changes') return
      const files = Array.isArray(action.files) ? action.files : []
      codeDrawer.value = {
        visible: true,
        title: action.label || 'Agent 代码改动',
        subtitle: '真实点击任务卡改动明细打开',
        project: action.project || files.find(item => item?.project)?.project || '',
        fileChanges: { files, count: files.length },
        files,
        selectedPath: action.selectedPath || files[0]?.path || '',
      }
    }
    const closeCodeDrawer = () => {
      codeDrawer.value = { ...codeDrawer.value, visible: false }
    }
    const groupWaitingCard = ref({ ...groupWaitingUserTaskCard })
    const groupWaitingInput = ref('')
    const groupWaitingTarget = ref(null)
    const groupWaitingMessages = ref([])
    const beginGroupWaitingInput = (_msg, card, action = {}) => {
      groupWaitingTarget.value = {
        taskId: action.task_id || card.task_id,
        groupId: 'fixture-group-waiting-user',
        title: card.title,
      }
      groupWaitingInput.value = ''
      nextTick(() => document.getElementById('fixtureGroupWaitingInput')?.focus())
    }
    const groupWaitingTaskAction = createGroupTaskCardActionHandler({
      getTaskCard: () => groupWaitingCard.value,
      getCurrentGroup: () => ({ id: 'fixture-group-waiting-user', name: '登录协作群' }),
      beginTaskInput: beginGroupWaitingInput,
    })
    const handleGroupWaitingTaskAction = (action) => groupWaitingTaskAction({
      task_id: groupWaitingCard.value.task_id,
      taskCard: groupWaitingCard.value,
    }, action)
    const submitGroupWaitingSupplement = () => {
      const message = groupWaitingInput.value.trim()
      if (!message || !groupWaitingTarget.value) return
      const fields = buildWaitingUserTaskContinuationFields(groupWaitingTarget.value)
      window.__ccmLastGroupWaitingContinuationPayload = {
        group_id: groupWaitingTarget.value.groupId,
        message,
        client_message_id: 'fixture-group-waiting-user-message',
        ...fields,
      }
      groupWaitingMessages.value.push({ id: 'fixture-group-waiting-user-message', content: message })
      groupWaitingCard.value = {
        ...groupWaitingCard.value,
        phase: 'reworking',
        phase_label: '正在继续',
        progress: 76,
        active_agents: ['正在沿用原任务继续复核和验收'],
        agents: [{ name: 'TestAgent', status: 'pending', summary: '任务条件已收到，等待重新复核。', blockers: [] }],
        blockers: [],
        user_request_summary: null,
        next_action: '继续使用原任务证据完成复核、验收和最终总结。',
        continuation_status: {
          schema: 'ccm-main-agent-continuation-status-v1',
          title: '任务条件已补充',
          status: 'queued',
          status_label: '已入队',
          headline: '我已收到任务所需条件，会在同一任务里继续处理。',
          kind: 'supplement',
          kind_label: '任务条件',
          route_label: '并入同一任务',
          reason: '用户已补充任务所需条件',
          next_action: '我会复用原任务证据继续执行，完成后重新验收并总结。',
        },
        actions: [
          { id: 'supplement', label: '追加要求', kind: 'continue', tone: 'primary' },
          { id: 'cancel', label: '停止', kind: 'cancel', tone: 'danger' },
        ],
      }
      groupWaitingInput.value = ''
      groupWaitingTarget.value = null
    }
    const groupClarificationMessage = ref({
      ...groupClarificationMessageFixture,
      clarification_summary: { ...groupClarificationMessageFixture.clarification_summary },
      clarification_context: { ...groupClarificationMessageFixture.clarification_context },
    })
    const groupClarificationInput = ref('')
    const groupClarificationTarget = ref({
      requestId: groupClarificationMessageFixture.clarification_context.id,
      messageId: groupClarificationMessageFixture.id,
      groupId: groupClarificationMessageFixture.clarification_context.group_id,
      title: groupClarificationMessageFixture.clarification_summary.question,
      messageMode: groupClarificationMessageFixture.clarification_context.message_mode,
    })
    const groupClarificationUserMessages = ref([])
    const groupClarificationResumedCard = ref(null)
    const submitGroupClarificationResponse = () => {
      const answer = groupClarificationInput.value.trim()
      if (!answer || !groupClarificationTarget.value) return
      const fields = buildGroupClarificationResponseFields(groupClarificationTarget.value)
      window.__ccmLastGroupClarificationPayload = {
        group_id: groupClarificationTarget.value.groupId,
        message: answer,
        client_message_id: 'fixture-group-clarification-answer',
        ...fields,
      }
      groupClarificationUserMessages.value.push({ id: 'fixture-group-clarification-answer', content: answer })
      groupClarificationMessage.value = {
        ...groupClarificationMessage.value,
        clarification_summary: {
          ...groupClarificationMessage.value.clarification_summary,
          status: 'resolved',
          status_label: '已补充',
        },
        clarification_context: {
          ...groupClarificationMessage.value.clarification_context,
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          answer_message_id: 'fixture-group-clarification-answer',
        },
      }
      groupClarificationResumedCard.value = {
        version: 1,
        visible: true,
        task_id: 'fixture-group-clarification-task',
        title: '修复登录状态恢复逻辑',
        goal: `修复登录状态恢复逻辑，完成修改、测试和最终总结。补充说明：${answer}`,
        phase: 'planning',
        phase_label: '正在分析',
        progress: 18,
        active_agents: ['正在根据补充范围整理执行计划'],
        agents: [],
        blockers: [],
        next_action: '计划确认后安排前端和后端执行成员，并在完成后运行 TestAgent 复核。',
        todo_plan: {
          title: '当前计划',
          steps: [
            { id: 'understand', label: '合并原始需求与补充范围', active_form: '已确认前后端都需要修改', status: 'completed' },
            { id: 'plan', label: '整理前后端执行计划', active_form: '正在整理前后端执行计划', status: 'in_progress' },
            { id: 'verify', label: '执行测试、独立复核和最终总结', active_form: '等待执行与验收', status: 'pending' },
          ],
        },
        actions: [{ id: 'cancel', label: '停止', kind: 'cancel', tone: 'danger' }],
        technical: { trace_id: 'trace-group-clarification-root', clarification_request_id: fields.clarification_request_id },
      }
      groupClarificationInput.value = ''
      groupClarificationTarget.value = null
    }
    return { conversationDecision, ordinaryMultilineMessage, taskDecision, taskCompletedDecision, taskMissingVerificationDecision, taskCard, internalUserRequestSummaryCard, explicitUserRequestSummaryCard, taskStatusFallbackCard, startupAutoRecoveryCard, planGapDeliveryCard, groupIntakeMessage, workQueueCard, workchainTodoCard, workchainCompletedArchivedCard, workchainQualityFollowupCard, ordinaryWorkchainTodoCard, testAgentBlockedPlanCard, testAgentFailedReviewCard, groupLiveTestAgentReviewMergedCard, workItemVerificationReminderCard, receiptResolvedCard, goalRevisionContinuationCard, planRevisionCard, confirmedPlanFollowupCard, mainAgentStatus, mainAgentActiveStatus, mainAgentArchivedTodoStatus, globalHistoryCard, globalTestAgentUnknownCoverageCard, globalTestAgentNotVerifiedCoverageCard, globalTestAgentLatestEvidenceRecheckCard, globalPostReviewSpotCheckRecheckCard, globalDirectDispatchCard, globalSingleProjectDispatchCard, globalFailedHistoryCard, internalProtocolFailureCard, globalCancelledHistoryCard, agentQaVisibleMessage, agentDisplayName, childEvents, childSummary, compactWorkText, codeDrawer, handleTaskAction, closeCodeDrawer, groupWaitingCard, groupWaitingInput, groupWaitingTarget, groupWaitingMessages, handleGroupWaitingTaskAction, submitGroupWaitingSupplement, groupClarificationMessage, groupClarificationInput, groupClarificationTarget, groupClarificationUserMessages, groupClarificationResumedCard, submitGroupClarificationResponse }
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

      <section id="case-ordinary-multiline-reply" class="fixture-case">
        <h2>普通问话多行回复</h2>
        <AgentExecutionMessage
          :msg="ordinaryMultilineMessage"
          :display-content="ordinaryMultilineMessage.content"
          :status="{ tone: 'idle', label: '回复' }"
          agent-initials="AI"
          agent-display-name="协调者"
        />
      </section>

      <section id="case-task-plan-missing-verification" class="fixture-case">
        <h2>任务计划缺验收提醒</h2>
        <MainAgentDecisionCard :decision="taskMissingVerificationDecision" />
      </section>

      <section id="case-task-card" class="fixture-case">
        <h2>任务卡</h2>
        <GroupMainAgentStatusCard :status="mainAgentStatus" :latestDecision="taskDecision" />
        <TaskExperienceCard :card="taskCard" @action="handleTaskAction" />
        <div id="case-delivery-plan-gap" style="margin-top:14px">
          <h2>交付总结计划缺口</h2>
          <TaskExperienceCard :card="planGapDeliveryCard" @action="handleTaskAction" />
        </div>
        <div id="case-workchain-todo-card" style="margin-top:14px">
          <h2>Workchain Todo 桥接</h2>
          <TaskExperienceCard :card="workchainTodoCard" @action="handleTaskAction" />
        </div>
        <div id="case-workchain-completed-archived" style="margin-top:14px">
          <h2>Workchain Todo 完成归档</h2>
          <TaskExperienceCard :card="workchainCompletedArchivedCard" @action="handleTaskAction" />
        </div>
        <div id="case-workchain-quality-followup" style="margin-top:14px">
          <h2>Workchain 总结补齐</h2>
          <TaskExperienceCard :card="workchainQualityFollowupCard" @action="handleTaskAction" />
        </div>
        <div id="case-workchain-ordinary-hidden" style="margin-top:14px">
          <h2>普通问话 Workchain Todo 隐藏</h2>
          <TaskExperienceCard :card="ordinaryWorkchainTodoCard" @action="handleTaskAction" />
        </div>
        <div id="case-user-request-summary-guard" style="margin-top:14px">
          <h2>用户待办摘要守门</h2>
          <TaskExperienceCard :card="internalUserRequestSummaryCard" @action="handleTaskAction" />
          <TaskExperienceCard :card="explicitUserRequestSummaryCard" @action="handleTaskAction" />
        </div>
        <div id="case-task-status-fallback-copy" style="margin-top:14px">
          <h2>共享任务卡状态文案</h2>
          <TaskExperienceCard :card="taskStatusFallbackCard" @action="handleTaskAction" />
        </div>
        <div id="case-startup-auto-recovery" style="margin-top:14px">
          <h2>服务重启自动接续</h2>
          <TaskExperienceCard :card="startupAutoRecoveryCard" @action="handleTaskAction" />
        </div>
        <div id="case-test-agent-plan-blocked" style="margin-top:14px">
          <h2>TestAgent 计划预检受阻</h2>
          <TaskExperienceCard :card="testAgentBlockedPlanCard" @action="handleTaskAction" />
        </div>
        <div id="case-test-agent-review-failed" style="margin-top:14px">
          <h2>TestAgent 复核返工</h2>
          <TaskExperienceCard :card="testAgentFailedReviewCard" @action="handleTaskAction" />
        </div>
        <div id="case-group-live-test-agent-review-merged" style="margin-top:14px">
          <h2>群聊流式 TestAgent 复核合并</h2>
          <TaskExperienceCard :card="groupLiveTestAgentReviewMergedCard" @action="handleTaskAction" />
        </div>
        <div id="case-work-item-next" style="margin-top:14px">
          <h2>执行队列后续派发</h2>
          <TaskExperienceCard :card="workQueueCard" @action="handleTaskAction" />
          <div id="case-work-item-verification-reminder" style="margin-top:14px">
            <h2>执行队列验收提醒</h2>
            <TaskExperienceCard :card="workItemVerificationReminderCard" @action="handleTaskAction" />
          </div>
          <div id="case-receipt-rework-resolved" style="margin-top:14px">
            <h2>结果补充已复检</h2>
            <TaskExperienceCard :card="receiptResolvedCard" @action="handleTaskAction" />
          </div>
          <div id="case-goal-revision-continuation" style="margin-top:14px">
            <h2>目标调整接续</h2>
            <TaskExperienceCard :card="goalRevisionContinuationCard" @action="handleTaskAction" />
          </div>
          <div id="case-plan-revision" style="margin-top:14px">
            <h2>计划退回调整</h2>
            <TaskExperienceCard :card="planRevisionCard" @action="handleTaskAction" />
          </div>
          <div id="case-plan-confirmed-followup" style="margin-top:14px">
            <h2>计划确认后执行跟进</h2>
            <TaskExperienceCard :card="confirmedPlanFollowupCard" @action="handleTaskAction" />
          </div>
        </div>
        <div id="case-global-history-completion" style="margin-top:14px">
          <h2>全局历史完成态</h2>
          <TaskExperienceCard :card="globalHistoryCard" context="global" @action="handleTaskAction" />
        </div>
        <div id="case-global-test-agent-coverage-relay" style="margin-top:14px">
          <h2>全局 TestAgent 复核覆盖提醒</h2>
          <TaskExperienceCard :card="globalTestAgentUnknownCoverageCard" context="global" @action="handleTaskAction" />
          <TaskExperienceCard :card="globalTestAgentNotVerifiedCoverageCard" context="global" @action="handleTaskAction" />
          <TaskExperienceCard :card="globalTestAgentLatestEvidenceRecheckCard" context="global" @action="handleTaskAction" />
          <div id="case-global-post-review-spot-check-recheck" style="margin-top:14px">
            <h2>全局完成前抽查需复验</h2>
            <TaskExperienceCard :card="globalPostReviewSpotCheckRecheckCard" context="global" @action="handleTaskAction" />
          </div>
        </div>
        <div id="case-global-direct-dispatch" style="margin-top:14px">
          <h2>全局直派已接管</h2>
          <TaskExperienceCard :card="globalDirectDispatchCard" context="global" @action="handleTaskAction" />
        </div>
        <div id="case-global-single-project-supervision" style="margin-top:14px">
          <h2>全局单项目持续监督</h2>
          <TaskExperienceCard :card="globalSingleProjectDispatchCard" context="global" @action="handleTaskAction" />
        </div>
        <div id="case-global-history-terminal" style="margin-top:14px">
          <h2>全局历史失败/取消态</h2>
          <TaskExperienceCard :card="globalFailedHistoryCard" context="global" @action="handleTaskAction" />
          <TaskExperienceCard :card="globalCancelledHistoryCard" context="global" @action="handleTaskAction" />
          <div id="case-internal-failure-surfaces" style="margin-top:14px">
            <div id="case-global-internal-failure">
              <TaskExperienceCard :card="internalProtocolFailureCard" context="global" @action="handleTaskAction" />
            </div>
            <div id="case-group-internal-failure" style="margin-top:14px">
              <TaskExperienceCard :card="internalProtocolFailureCard" context="group" @action="handleTaskAction" />
            </div>
          </div>
        </div>
      </section>

      <section id="case-group-main-current-todo" class="fixture-case">
        <h2>协作群当前步骤</h2>
        <GroupMainAgentStatusCard :status="mainAgentActiveStatus" :latestDecision="taskDecision" />
        <div id="case-group-main-current-todo-archived" style="margin-top:14px">
          <h2>群聊当前 Todo 完成归档</h2>
          <GroupMainAgentStatusCard :status="mainAgentArchivedTodoStatus" :latestDecision="taskCompletedDecision" />
        </div>
      </section>

      <section id="case-group-task-intake-plan" class="fixture-case">
        <h2>群聊任务接管计划</h2>
        <ProjectTaskIntakeMessage :msg="groupIntakeMessage" :display-content="groupIntakeMessage.content" :accent-style="{ '--agent-accent': '#2563eb' }">
          <TaskCollaborationCard :card="groupIntakeMessage.taskCard" :runtime="groupIntakeMessage.taskRuntime" @action="handleTaskAction" />
        </ProjectTaskIntakeMessage>
      </section>

      <section id="case-group-waiting-user-resume" class="fixture-case">
        <h2>群聊等待补充后继续原任务</h2>
        <div v-for="item in groupWaitingMessages" :key="item.id" class="fixture-group-user-message" :data-message-id="item.id">{{ item.content }}</div>
        <TaskCollaborationCard :card="groupWaitingCard" @action="handleGroupWaitingTaskAction" />
        <ChatComposer
          v-model="groupWaitingInput"
          input-id="fixtureGroupWaitingInput"
          :files="[]"
          :placeholder="groupWaitingTarget ? '补充当前任务需要的信息，发送后会沿用原任务继续执行和验收...' : '输入消息...'"
          :send-label="groupWaitingTarget ? '提交并继续' : '发送 ➤'"
          @send="submitGroupWaitingSupplement"
        >
          <template v-if="groupWaitingTarget" #prefix>
            <div class="fixture-task-supplement-context">
              <span>正在补充</span>
              <strong>{{ groupWaitingTarget.title }}</strong>
            </div>
          </template>
        </ChatComposer>
      </section>

      <section id="case-group-clarification-resume" class="fixture-case">
        <h2>群聊澄清后接回原始需求</h2>
        <AgentExecutionMessage
          :msg="groupClarificationMessage"
          :display-content="groupClarificationMessage.content"
          :status="{ tone: 'idle', label: '等待补充' }"
          agent-initials="AI"
          agent-display-name="协调者"
        />
        <div v-for="item in groupClarificationUserMessages" :key="item.id" class="fixture-group-user-message" :data-message-id="item.id">{{ item.content }}</div>
        <TaskExperienceCard v-if="groupClarificationResumedCard" :card="groupClarificationResumedCard" context="group" />
        <ChatComposer
          v-model="groupClarificationInput"
          input-id="fixtureGroupClarificationInput"
          :files="[]"
          :placeholder="groupClarificationTarget ? '补充主 Agent 刚才询问的信息，发送后会接着原请求继续判断...' : '输入消息...'"
          :send-label="groupClarificationTarget ? '提交补充' : '发送 ➤'"
          @send="submitGroupClarificationResponse"
        >
          <template v-if="groupClarificationTarget" #prefix>
            <div class="fixture-task-supplement-context">
              <span>正在回答</span>
              <strong>{{ groupClarificationTarget.title }}</strong>
            </div>
          </template>
        </ChatComposer>
      </section>

      <section id="case-agent-qa-message" class="fixture-case">
        <h2>协作问答消息</h2>
        <AgentQaMessage
          :msg="agentQaVisibleMessage"
          :accent-style="{ '--agent-accent': '#2563eb' }"
          :get-agent-display-name="agentDisplayName"
        />
      </section>

      <section id="case-child-agent" class="fixture-case">
        <h2>执行成员摘要</h2>
        <details class="agent-work-events running" style="--agent-accent:#2563eb">
          <summary class="work-events-head">
            <div class="work-head-main">
              <span class="work-agent-dot"></span>
              <span class="work-title">执行成员执行摘要</span>
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

      <section id="case-global-stream-live" class="fixture-case">
        <h2>全局流式派发进度</h2>
        <div class="global-agent-fixture-frame">
          <GlobalAgent />
        </div>
      </section>
      <AgentCodeChangeDrawer
        :visible="codeDrawer.visible"
        :title="codeDrawer.title"
        :subtitle="codeDrawer.subtitle"
        :project="codeDrawer.project"
        :fileChanges="codeDrawer.fileChanges"
        :files="codeDrawer.files"
        :selectedPath="codeDrawer.selectedPath"
        @close="closeCodeDrawer"
      />
    </main>
  `,
}

createApp(FixtureApp).mount('#app')
