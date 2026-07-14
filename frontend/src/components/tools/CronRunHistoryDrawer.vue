<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  job: { type: Object, default: null }
})

const emit = defineEmits(['close', 'navigate', 'control'])
const expandedRunId = ref('')

const runs = computed(() => props.job?.run_history || [])

watch(() => [props.visible, props.job?.id, runs.value[0]?.id], () => {
  if (props.visible) expandedRunId.value = runs.value[0]?.id || ''
}, { immediate: true })

const statusLabel = (status) => ({
  triggering: '正在触发',
  running: '正在触发',
  running_task: '执行中',
  queued: '已排队',
  waiting: '等待处理',
  retry_waiting: '等待重试',
  done: '已完成',
  completed: '已完成',
  passed: '已通过',
  skipped: '已跳过',
  failed: '失败',
  cancelled: '已取消'
}[status] || status || '未知')

const triggerLabel = (trigger) => ({ manual: '手动触发', schedule: '计划触发', recovery: '停机补跑', retry: '失败重试', resume: '继续运行', legacy: '历史记录' }[trigger] || '计划触发')

const formatTime = (value) => {
  if (!value) return '尚未完成'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '时间未知' : date.toLocaleString('zh-CN', { hour12: false })
}

const durationLabel = (run) => {
  const start = Date.parse(run?.started_at || '')
  const end = Date.parse(run?.completed_at || '') || Date.now()
  if (!Number.isFinite(start)) return '耗时未知'
  const seconds = Math.max(0, Math.round((end - start) / 1000))
  if (seconds < 60) return `${seconds} 秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`
  return `${Math.floor(seconds / 3600)} 小时 ${Math.floor((seconds % 3600) / 60)} 分`
}

const toggleRun = (runId) => {
  expandedRunId.value = expandedRunId.value === runId ? '' : runId
}

const openTask = (task) => emit('navigate', { tab: 'tasks', taskId: task.id })

const openReplay = (task, preset = 'all') => emit('navigate', {
  tab: 'trace-replay',
  task_id: task.id,
  taskId: task.id,
  trace_id: task.trace_id || '',
  scope: 'orchestrator',
  preset
})

const todoStepLabel = (step) => ({
  completed: '已完成', done: '已完成', passed: '已完成', skipped: '已跳过',
  in_progress: '进行中', running: '进行中', reviewing: '验收中', reworking: '返工中',
  needs_confirmation: '待确认', failed: '失败', pending: '待执行'
}[step?.status] || step?.status || '待执行')

const canCancel = run => ['triggering', 'running', 'running_task', 'queued', 'waiting', 'retry_waiting'].includes(run?.status) && !run?.legacy
const canRetry = run => ['failed', 'retry_waiting'].includes(run?.status) && !run?.legacy
const canResume = run => ['waiting', 'cancelled'].includes(run?.status) && !run?.legacy
</script>

<template>
  <div v-if="visible" class="run-drawer-overlay" @click.self="emit('close')">
    <aside class="run-drawer" role="dialog" aria-modal="true" aria-label="定时任务运行记录">
      <header class="run-drawer-header">
        <div>
          <span class="drawer-eyebrow">运行记录</span>
          <h2>{{ job?.name || '定时任务' }}</h2>
          <p>每次触发、任务派发、主 Agent 进度和 TestAgent 验收都会保留在这里。</p>
        </div>
        <button class="icon-button" type="button" title="关闭运行记录" aria-label="关闭运行记录" @click="emit('close')">&times;</button>
      </header>

      <div class="run-drawer-body">
        <div v-if="runs.length === 0" class="run-empty">
          <strong>还没有运行记录</strong>
          <span>首次触发后，这里会显示完整进度和验收入口。</span>
        </div>

        <section v-for="run in runs" :key="run.id" class="run-row" :class="`run-${run.status}`">
          <button class="run-summary" type="button" :aria-expanded="expandedRunId === run.id" @click="toggleRun(run.id)">
            <span class="run-status-dot" aria-hidden="true"></span>
            <span class="run-summary-main">
              <span class="run-summary-title">
                <strong>{{ statusLabel(run.status) }}</strong>
                <span>{{ triggerLabel(run.trigger) }}</span>
                <span v-if="run.legacy_summary" class="legacy-badge">历史摘要</span>
                <span v-else-if="run.attempt > 1">第 {{ run.attempt }} 次尝试</span>
                <span>{{ run.task_ids?.length || 0 }} 个任务</span>
              </span>
              <span class="run-summary-result">{{ run.result || '等待执行结果' }}</span>
            </span>
            <span class="run-summary-time">
              <time>{{ formatTime(run.started_at) }}</time>
              <small>{{ durationLabel(run) }}</small>
            </span>
            <span class="disclosure" aria-hidden="true">{{ expandedRunId === run.id ? '−' : '+' }}</span>
          </button>

          <div v-if="expandedRunId === run.id" class="run-detail">
            <p v-if="run.legacy_summary" class="legacy-notice">旧版本没有保存逐轮事件，这里只展示当时留下的最后状态，不能作为完整运行回放。</p>
            <div v-if="canCancel(run) || canRetry(run) || canResume(run)" class="run-controls">
              <button v-if="canRetry(run)" type="button" @click="emit('control', { action: 'retry', run })">{{ run.status === 'retry_waiting' ? '立即重试' : '重试本轮' }}</button>
              <button v-if="canResume(run)" type="button" @click="emit('control', { action: 'resume', run })">继续运行</button>
              <button v-if="canCancel(run)" type="button" class="danger" @click="emit('control', { action: 'cancel', run })">取消本轮</button>
              <span v-if="run.next_retry_at">计划重试：{{ formatTime(run.next_retry_at) }}</span>
            </div>
            <div v-if="run.tasks?.length" class="run-task-list">
              <article v-for="task in run.tasks" :key="task.id" class="run-task">
                <div class="task-heading">
                  <div>
                    <span class="task-status" :class="`task-${task.status}`">{{ statusLabel(task.status) }}</span>
                    <h3>{{ task.title }}</h3>
                  </div>
                  <div class="task-actions">
                    <button type="button" class="action-button" @click="openTask(task)">查看任务</button>
                    <button v-if="task.replay_available" type="button" class="action-button primary" @click="openReplay(task)">完整回放</button>
                  </div>
                </div>

                <p class="task-status-detail">{{ task.status_detail }}</p>

                <div class="agent-progress-grid">
                  <div v-if="task.todo" class="progress-section">
                    <span class="progress-label">Todo 计划</span>
                    <strong>{{ task.todo.completed }}/{{ task.todo.total }} 已完成</strong>
                    <p>{{ task.todo.current?.label || '等待下一步' }} · {{ todoStepLabel(task.todo.current) }}</p>
                    <details>
                      <summary>查看全部步骤</summary>
                      <ol class="todo-list">
                        <li v-for="step in task.todo.steps" :key="step.id" :class="`todo-${step.status}`">
                          <span>{{ step.label }}</span><small>{{ todoStepLabel(step) }}</small>
                        </li>
                      </ol>
                    </details>
                  </div>

                  <div class="progress-section">
                    <span class="progress-label">群聊主 Agent</span>
                    <strong>{{ task.main_agent?.headline || '正在跟进' }}</strong>
                    <p>{{ task.main_agent?.summary || '等待主 Agent 汇总' }}</p>
                  </div>

                  <div class="progress-section test-agent-section">
                    <span class="progress-label">TestAgent 验收</span>
                    <template v-if="task.test_agent">
                      <strong>{{ statusLabel(task.test_agent.status) }}{{ task.test_agent.recommendation ? ` · ${task.test_agent.recommendation}` : '' }}</strong>
                      <p>{{ task.test_agent.summary }}</p>
                      <div class="evidence-meta">
                        <span>{{ task.test_agent.run_count }} 次验证</span>
                        <span>{{ task.test_agent.screenshot_count }} 张截图</span>
                        <span>{{ task.test_agent.evidence_count }} 项证据</span>
                      </div>
                      <button type="button" class="evidence-button" @click="openReplay(task, 'test')">查看验证证据</button>
                    </template>
                    <p v-else>任务进入验收阶段后，验证结论和截图数量会显示在这里。</p>
                  </div>
                </div>
              </article>
            </div>
            <div v-else class="run-no-task">
              {{ run.status === 'skipped' ? '本次没有可认领需求，因此没有创建空任务。' : '任务正在创建，页面会自动刷新进度。' }}
            </div>

            <details class="run-technical">
              <summary>技术详情</summary>
              <dl>
                <div><dt>运行标识</dt><dd>{{ run.id }}</dd></div>
                <div><dt>开始时间</dt><dd>{{ formatTime(run.started_at) }}</dd></div>
                <div><dt>完成时间</dt><dd>{{ formatTime(run.completed_at) }}</dd></div>
                <div><dt>计划时间</dt><dd>{{ formatTime(run.scheduled_for) }}</dd></div>
                <div><dt>通知状态</dt><dd>{{ Object.entries(run.notifications || {}).map(([event, value]) => `${event}: ${value.status}`).join('；') || '未发送' }}</dd></div>
              </dl>
            </details>
          </div>
        </section>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.run-drawer-overlay { position: fixed; inset: 0; z-index: 10020; display: flex; justify-content: flex-end; background: rgba(15, 23, 42, .28); }
.run-drawer { width: min(760px, 100vw); height: 100%; display: flex; flex-direction: column; background: var(--surface); border-left: 1px solid var(--border-color); box-shadow: -18px 0 50px rgba(15, 23, 42, .16); }
.run-drawer-header { display: flex; justify-content: space-between; gap: 20px; padding: 22px 24px 18px; border-bottom: 1px solid var(--border-color); }
.drawer-eyebrow, .progress-label { display: block; color: var(--accent-blue, #2563eb); font-size: 11px; font-weight: 700; text-transform: uppercase; }
.run-drawer-header h2 { margin: 4px 0 5px; color: var(--text-primary); font-size: 20px; letter-spacing: 0; }
.run-drawer-header p { margin: 0; color: var(--text-muted); font-size: 12.5px; line-height: 1.5; }
.icon-button { flex: 0 0 34px; width: 34px; height: 34px; border: 1px solid var(--border-color); border-radius: 7px; background: var(--bg-primary); color: var(--text-secondary); cursor: pointer; font-size: 22px; line-height: 1; }
.run-drawer-body { flex: 1; overflow-y: auto; padding: 18px 24px 32px; }
.run-empty { min-height: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; color: var(--text-muted); }
.run-row { position: relative; border-bottom: 1px solid var(--border-color); }
.run-summary { width: 100%; display: grid; grid-template-columns: 12px minmax(0, 1fr) auto 22px; align-items: center; gap: 12px; padding: 16px 4px; border: 0; background: transparent; color: inherit; cursor: pointer; text-align: left; }
.run-status-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--text-muted); }
.run-running .run-status-dot, .run-triggering .run-status-dot, .run-running_task .run-status-dot { background: var(--accent-blue, #2563eb); box-shadow: 0 0 0 4px rgba(37, 99, 235, .12); }
.run-done .run-status-dot, .run-passed .run-status-dot { background: var(--accent-green, #16a34a); }
.run-failed .run-status-dot { background: var(--accent-red, #dc2626); }
.run-waiting .run-status-dot, .run-retry_waiting .run-status-dot { background: var(--accent-orange, #d97706); }
.run-summary-main { min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.run-summary-title { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; color: var(--text-muted); font-size: 11.5px; }
.run-summary-title strong { color: var(--text-primary); font-size: 13px; }
.run-summary-result { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary); font-size: 12.5px; }
.run-summary-time { display: flex; flex-direction: column; align-items: flex-end; color: var(--text-muted); font-size: 11.5px; white-space: nowrap; }
.run-summary-time small { margin-top: 3px; }
.disclosure { color: var(--text-muted); font-size: 18px; text-align: center; }
.run-detail { padding: 0 0 18px 25px; }
.run-controls { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; margin-bottom: 12px; }
.run-controls button { min-height: 31px; padding: 5px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--surface); color: var(--accent-blue, #2563eb); font-size: 11.5px; font-weight: 700; cursor: pointer; }
.run-controls button.danger { color: var(--accent-red, #dc2626); }
.run-controls span { color: var(--text-muted); font-size: 11px; }
.legacy-badge { padding: 2px 5px; border: 1px solid var(--border-color); border-radius: 4px; }
.legacy-notice { margin: 0 0 12px; padding: 9px 11px; border-left: 3px solid #d97706; background: rgba(217, 119, 6, .07); color: var(--text-secondary); font-size: 11.5px; line-height: 1.5; }
.run-task-list { display: flex; flex-direction: column; gap: 14px; }
.run-task { padding: 15px; border: 1px solid var(--border-color); border-radius: 8px; background: var(--bg-primary); }
.task-heading { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.task-heading h3 { margin: 5px 0 0; color: var(--text-primary); font-size: 14px; line-height: 1.4; letter-spacing: 0; }
.task-status { color: var(--text-muted); font-size: 10.5px; font-weight: 700; }
.task-done, .task-completed { color: var(--accent-green, #16a34a); }
.task-failed { color: var(--accent-red, #dc2626); }
.task-in_progress { color: var(--accent-blue, #2563eb); }
.task-actions { display: flex; gap: 7px; }
.action-button, .evidence-button { min-height: 30px; padding: 5px 10px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--surface); color: var(--text-secondary); font-size: 11.5px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.action-button.primary { border-color: rgba(37, 99, 235, .35); color: var(--accent-blue, #2563eb); }
.task-status-detail { margin: 11px 0; color: var(--text-secondary); font-size: 12.5px; line-height: 1.55; }
.agent-progress-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; border: 1px solid var(--border-color); background: var(--border-color); }
.progress-section { min-width: 0; padding: 12px; background: var(--surface); }
.progress-section strong { display: block; margin-top: 5px; color: var(--text-primary); font-size: 12px; line-height: 1.45; }
.progress-section p { margin: 5px 0 0; color: var(--text-muted); font-size: 11.5px; line-height: 1.5; overflow-wrap: anywhere; }
.progress-section details { margin-top: 8px; color: var(--text-muted); font-size: 11px; }
.progress-section summary, .run-technical summary { cursor: pointer; }
.todo-list { margin: 7px 0 0; padding-left: 18px; }
.todo-list li { margin: 4px 0; padding-left: 2px; }
.todo-list li small { display: block; color: var(--text-muted); }
.evidence-meta { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
.evidence-meta span { padding: 2px 6px; border-radius: 4px; background: rgba(37, 99, 235, .08); color: var(--accent-blue, #2563eb); font-size: 10.5px; }
.evidence-button { margin-top: 9px; color: var(--accent-blue, #2563eb); }
.run-no-task { padding: 14px; border: 1px dashed var(--border-color); border-radius: 7px; color: var(--text-muted); font-size: 12.5px; }
.run-technical { margin-top: 12px; color: var(--text-muted); font-size: 11.5px; }
.run-technical dl { margin: 8px 0 0; padding: 10px; background: var(--bg-primary); }
.run-technical dl div { display: grid; grid-template-columns: 80px minmax(0, 1fr); gap: 8px; margin: 4px 0; }
.run-technical dt { font-weight: 600; }
.run-technical dd { margin: 0; overflow-wrap: anywhere; }
@media (max-width: 720px) {
  .run-drawer-header, .run-drawer-body { padding-left: 16px; padding-right: 16px; }
  .run-summary { grid-template-columns: 10px minmax(0, 1fr) 20px; }
  .run-summary-time { grid-column: 2; align-items: flex-start; }
  .disclosure { grid-column: 3; grid-row: 1 / span 2; }
  .run-detail { padding-left: 0; }
  .task-heading { flex-direction: column; }
  .task-actions { width: 100%; }
  .task-actions .action-button { flex: 1; }
  .agent-progress-grid { grid-template-columns: 1fr; }
}
</style>
