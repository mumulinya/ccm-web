<script setup>
import { ChevronRight, FileStack, Sparkles } from '@lucide/vue'
import { reactive } from 'vue'

defineProps({
  backlogs: { type: Array, default: () => [] },
  collections: { type: Array, default: () => [] },
  counts: { type: Object, default: () => ({}) },
  collectionCounts: { type: Object, default: () => ({}) },
  importLoading: { type: Boolean, default: false },
  bulkDispatchLoading: { type: Boolean, default: false },
  importResult: { type: Object, default: null },
  bulkDispatchResult: { type: Object, default: null },
  statusLabel: { type: Object, default: () => ({}) },
  priorityLabel: { type: Object, default: () => ({}) },
  backlogState: { type: Function, required: true },
  backlogCount: { type: Function, required: true },
  backlogQualityText: { type: Function, required: true },
  backlogLatestHistory: { type: Function, required: true },
  backlogCanDispatch: { type: Function, required: true },
  backlogCanRestoreReady: { type: Function, required: true },
  dailyDevGroupCanExecute: { type: Function, required: true },
  dailyDevGroupReadinessMessage: { type: Function, required: true },
  formatBacklogTime: { type: Function, required: true },
})

const emit = defineEmits([
  'close',
  'import-shared-docs',
  'dispatch-ready',
  'dispatch',
  'restore-ready',
  'mark-blocked',
  'create-from-doc',
  'open-collection',
])

const collectionProgress = item => {
  const total = Number(item?.progress?.total || 0)
  if (!total) return item?.state === 'done' ? 100 : 0
  return Math.max(0, Math.min(100, Math.round((Number(item?.progress?.done || 0) / total) * 100)))
}

const selectedSessions = reactive({})
const backlogKey = item => `${item.group_id}:${item.entry_id || item.name}`
const selectedSession = item => selectedSessions[backlogKey(item)] ?? item.target_session_id ?? ''
const selectSession = (item, value) => {
  selectedSessions[backlogKey(item)] = value
}
const sessionOptions = (item, kind) => (item.session_options || []).filter(session => (
  String(session.session_kind || session.sessionKind || 'conversation') === (kind === 'automation' ? 'automation' : 'conversation')
))
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal backlog-modal">
      <button class="modal-close" @click="emit('close')">&times;</button>
      <div class="backlog-heading">
        <span class="backlog-heading-icon"><FileStack :size="20" /></span>
        <div>
          <h3>业务需求池</h3>
          <p>保存待开发需求，也可以把一份文档拆成多个可独立执行和验收的任务。</p>
        </div>
        <button class="btn btn-primary smart-intake-button" @click="emit('create-from-doc')"><Sparkles :size="15" />上传资料并智能拆分</button>
      </div>
      <div class="backlog-stats">
        <span>需求集合 {{ collections.length }}</span>
        <span>待补充 {{ backlogCount('needs_user') }}</span>
        <span>可接活 {{ backlogCount('ready') }}</span>
        <span>已派发 {{ backlogCount('planned', 'dispatched', 'queued') }}</span>
        <span>执行中 {{ backlogCount('running', 'in_progress') }}</span>
        <span>验收中 {{ backlogCount('reviewing') }}</span>
        <span>阻塞/失败 {{ backlogCount('blocked', 'failed') }}</span>
        <span>完成 {{ backlogCount('done') }}</span>
      </div>

      <section v-if="collections.length" class="collection-section">
        <div class="section-heading">
          <div><strong>文档需求集合</strong><span>模型拆分后形成的父任务与子任务，按依赖关系进入正式队列。</span></div>
          <span>{{ collectionCounts.running || 0 }} 个执行中</span>
        </div>
        <div class="collection-list">
          <button
            v-for="item in collections"
            :key="item.id"
            type="button"
            :class="['collection-item', item.state]"
            @click="emit('open-collection', item)"
          >
            <span class="collection-icon"><FileStack :size="17" /></span>
            <span class="collection-main">
              <span class="collection-title"><strong>{{ item.title }}</strong><em>{{ item.state_label }}</em></span>
              <small>{{ item.business_goal }}</small>
              <span class="collection-progress"><i :style="{ width: `${collectionProgress(item)}%` }"></i></span>
              <span class="collection-facts">
                <span>{{ item.progress.total }} 个任务</span>
                <span>完成 {{ item.progress.done }}</span>
                <span v-if="item.progress.running">执行中 {{ item.progress.running }}</span>
                <span v-if="item.progress.blocked">待处理 {{ item.progress.blocked }}</span>
                <span v-if="item.progress.failed">失败 {{ item.progress.failed }}</span>
                <span v-if="item.source_count">{{ item.source_count }} 份资料</span>
                <span v-if="item.target_labels?.length">{{ item.target_labels.join('、') }}</span>
              </span>
            </span>
            <ChevronRight :size="17" />
          </button>
        </div>
      </section>

      <div class="backlog-toolbar-grid">
        <div class="backlog-toolbar">
          <div>
            <strong>导入共享文档</strong>
            <span>把群聊里已有的 PRD、接口说明转成单条待开发需求，不会立即执行</span>
          </div>
          <button class="btn btn-outline btn-sm" :disabled="importLoading" @click="emit('import-shared-docs')">
            {{ importLoading ? '导入中...' : '导入共享文档' }}
          </button>
        </div>
        <div class="backlog-toolbar">
          <div>
            <strong>自动派发</strong>
            <span>批量派发传统需求卡；文档需求集合会按确认后的依赖图自动执行</span>
          </div>
          <button class="btn btn-primary btn-sm" :disabled="bulkDispatchLoading || !(counts.ready > 0)" @click="emit('dispatch-ready')">
            {{ bulkDispatchLoading ? '派发中...' : '派发可接活' }}
          </button>
        </div>
      </div>

      <div v-if="importResult || bulkDispatchResult" class="backlog-bulk-result">
        <template v-if="importResult">
          <span>导入 {{ importResult.imported || 0 }}</span>
          <span>跳过 {{ importResult.skipped || 0 }}</span>
        </template>
        <template v-if="bulkDispatchResult">
          <span>候选 {{ bulkDispatchResult.total_candidates || 0 }}</span>
          <span>派发 {{ bulkDispatchResult.dispatched || 0 }}</span>
          <span>入队 {{ bulkDispatchResult.queued || 0 }}</span>
          <span>失败 {{ bulkDispatchResult.failed || 0 }}</span>
        </template>
      </div>

      <div v-if="backlogs.length === 0" class="empty-mini">暂无业务开发需求池文件</div>
      <div v-else class="backlog-list">
        <div v-for="item in backlogs" :key="item.group_id + ':' + item.name" :class="['backlog-item', backlogState(item)]">
          <div class="backlog-main">
            <div class="backlog-title-row">
              <span :class="['backlog-status', backlogState(item)]">{{ item.state_label || statusLabel[backlogState(item)] || backlogState(item) }}</span>
              <strong>{{ item.title }}</strong>
              <span :class="'priority-tag priority-' + item.priority">{{ priorityLabel[item.priority] || item.priority }}</span>
            </div>
            <div class="backlog-goal">{{ item.business_goal }}</div>
            <div class="backlog-state-grid">
              <div><span>下一步</span><strong>{{ item.next_action || '等待系统推进' }}</strong></div>
              <div><span>负责人</span><strong>{{ item.owner || '主 Agent' }}</strong></div>
              <div><span>所属群聊</span><strong>{{ item.group_name }}</strong></div>
              <div class="backlog-session-field">
                <span>目标会话</span>
                <select
                  :value="selectedSession(item)"
                  :class="{ invalid: !item.target_session_valid && selectedSession(item) === item.target_session_id }"
                  aria-label="需求派发目标会话"
                  @change="selectSession(item, $event.target.value)"
                >
                  <option v-if="!item.target_session_valid && item.target_session_id" :value="item.target_session_id" disabled>原会话不可用，请改选</option>
                  <optgroup v-if="sessionOptions(item, 'conversation').length" label="普通会话"><option v-for="session in sessionOptions(item, 'conversation')" :key="session.id" :value="session.id">{{ session.title || session.id }}</option></optgroup>
                  <optgroup v-if="sessionOptions(item, 'automation').length" label="自动化任务会话"><option v-for="session in sessionOptions(item, 'automation')" :key="session.id" :value="session.id">{{ session.title || session.id }}</option></optgroup>
                </select>
              </div>
              <div><span>更新时间</span><strong>{{ formatBacklogTime(item.updated_at || item.created_at) }}</strong></div>
            </div>
            <div v-if="backlogQualityText(item)" :class="['backlog-readiness', item.quality?.pass ? 'ok' : 'warn']">
              {{ backlogQualityText(item) }}
            </div>
            <div :class="['backlog-readiness', dailyDevGroupCanExecute(item.group_id) ? 'ok' : 'warn']">
              {{ dailyDevGroupReadinessMessage(item.group_id) }}
            </div>
            <div v-if="item.question_to_user" class="backlog-result ask">需要用户补充：{{ item.question_to_user }}</div>
            <div v-if="item.blocker" class="backlog-result danger">阻塞原因：{{ item.blocker }}</div>
            <div v-else-if="item.last_result" class="backlog-result">{{ item.last_result }}</div>
            <div v-if="item.evidence?.length" class="backlog-evidence">
              <span v-for="entry in item.evidence" :key="entry">{{ entry }}</span>
            </div>
            <div v-if="backlogLatestHistory(item).length" class="backlog-history">
              <span v-for="history in backlogLatestHistory(item)" :key="history.at + history.state">
                {{ statusLabel[history.state] || history.state }} · {{ history.reason || '状态流转' }}
              </span>
            </div>
            <div class="backlog-meta">
              <span>{{ item.name }}</span>
              <span v-if="item.task_id">任务 {{ item.task_id }}</span>
              <span v-if="item.raw_status && item.raw_status !== backlogState(item)">原始状态 {{ item.raw_status }}</span>
            </div>
          </div>
          <div class="backlog-actions">
            <button v-if="backlogCanDispatch(item)" class="btn btn-primary btn-sm" :disabled="!dailyDevGroupCanExecute(item.group_id) || !selectedSession(item)" @click="emit('dispatch', item, selectedSession(item))">立即派发</button>
            <button v-if="backlogCanRestoreReady(item)" class="btn btn-outline btn-sm" @click="emit('restore-ready', item)">恢复可接活</button>
            <button v-if="backlogState(item) === 'ready'" class="btn btn-outline btn-sm" @click="emit('mark-blocked', item)">标记阻塞</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backlog-modal { min-width: min(1040px, calc(100vw - 32px)) !important; max-height: 86vh; overflow-y: auto; }
.backlog-heading{display:flex;align-items:center;gap:11px;padding-right:34px}.backlog-heading-icon{flex:0 0 auto;width:38px;height:38px;display:grid;place-items:center;border-radius:7px;background:color-mix(in srgb,var(--accent-blue) 10%,var(--surface));color:var(--accent-blue)}.backlog-heading>div{min-width:0;flex:1}.backlog-heading h3{margin:0}.backlog-heading p{margin:4px 0 0;color:var(--text-muted);font-size:11px}.smart-intake-button{display:inline-flex;align-items:center;justify-content:center;gap:6px;flex:0 0 auto}
.backlog-stats { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0 14px; }
.backlog-stats span { padding: 5px 9px; border-radius: 6px; background: rgba(15, 23, 42, 0.06); color: var(--text-secondary); font-size: 12px; font-weight: 700; }
.backlog-toolbar-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 12px; }
.backlog-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-width: 0; padding: 10px; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.12); background: rgba(59, 130, 246, 0.04); }
.backlog-toolbar > div { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.backlog-toolbar strong { color: var(--text-primary); font-size: 12.5px; }
.backlog-toolbar span { color: var(--text-muted); font-size: 11px; line-height: 1.45; overflow-wrap: anywhere; }
.backlog-bulk-result { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.backlog-bulk-result span { padding: 4px 8px; border-radius: 6px; background: rgba(34, 197, 94, 0.08); color: var(--accent-green); font-size: 11px; font-weight: 700; }
.collection-section{margin:0 0 14px;padding:12px;border:1px solid var(--border-color);border-radius:8px;background:var(--panel-muted)}.section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:9px}.section-heading>div{display:grid;gap:3px}.section-heading strong{color:var(--text-primary);font-size:12.5px}.section-heading span{color:var(--text-muted);font-size:10.5px}.collection-list{display:grid;gap:7px}.collection-item{width:100%;display:grid;grid-template-columns:34px minmax(0,1fr) 18px;align-items:center;gap:10px;padding:10px;border:1px solid var(--border-color);border-radius:7px;background:var(--surface);color:var(--text-primary);text-align:left;cursor:pointer}.collection-item:hover{border-color:color-mix(in srgb,var(--accent-blue) 38%,var(--border-color));background:color-mix(in srgb,var(--accent-blue) 3%,var(--surface))}.collection-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:7px;background:color-mix(in srgb,var(--accent-blue) 9%,var(--surface));color:var(--accent-blue)}.collection-main{min-width:0;display:grid;gap:5px}.collection-title{display:flex;align-items:center;gap:8px;min-width:0}.collection-title strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}.collection-title em{flex:0 0 auto;padding:2px 6px;border-radius:5px;background:var(--panel-muted);color:var(--text-muted);font-size:9.5px;font-style:normal;font-weight:800}.collection-item.running .collection-title em{background:color-mix(in srgb,var(--accent-blue) 11%,var(--surface));color:var(--accent-blue)}.collection-item.done .collection-title em{background:color-mix(in srgb,var(--accent-green) 10%,var(--surface));color:var(--accent-green)}.collection-item.failed .collection-title em,.collection-item.blocked .collection-title em{background:rgba(239,68,68,.09);color:#b42318}.collection-main>small{overflow:hidden;color:var(--text-secondary);font-size:10.5px;text-overflow:ellipsis;white-space:nowrap}.collection-progress{height:3px;overflow:hidden;border-radius:2px;background:var(--border-color)}.collection-progress i{display:block;height:100%;border-radius:inherit;background:var(--accent-blue)}.collection-item.done .collection-progress i{background:var(--accent-green)}.collection-facts{display:flex;flex-wrap:wrap;gap:4px 10px;color:var(--text-muted);font-size:9.5px}.collection-item>svg{color:var(--text-muted)}
.empty-mini { padding: 32px 12px; text-align: center; color: var(--text-muted); font-size: 13px; }
.backlog-list { display: flex; flex-direction: column; gap: 10px; }
.backlog-item { display: flex; justify-content: space-between; gap: 12px; padding: 12px; border: 1px solid var(--border-color); border-left: 4px solid rgba(100, 116, 139, 0.28); border-radius: 8px; background: var(--surface-subtle); }
.backlog-item.needs_user, .backlog-item.blocked, .backlog-item.failed { border-left-color: #f59e0b; }
.backlog-item.ready { border-left-color: #22c55e; }
.backlog-item.planned, .backlog-item.dispatched, .backlog-item.queued, .backlog-item.running, .backlog-item.in_progress, .backlog-item.reviewing { border-left-color: #3b82f6; }
.backlog-item.done { border-left-color: #94a3b8; opacity: 0.86; }
.backlog-main { min-width: 0; flex: 1; }
.backlog-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 6px; }
.backlog-title-row strong { max-width: 100%; color: var(--text-primary); font-size: 13px; overflow-wrap: anywhere; }
.backlog-status { flex-shrink: 0; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 800; background: rgba(100, 116, 139, 0.1); color: var(--text-muted); }
.backlog-status.needs_user, .backlog-status.blocked, .backlog-status.failed { background: rgba(234, 179, 8, 0.12); color: #854d0e; }
.backlog-status.ready { background: rgba(34, 197, 94, 0.1); color: var(--accent-green); }
.backlog-status.planned, .backlog-status.dispatched, .backlog-status.queued, .backlog-status.running, .backlog-status.in_progress, .backlog-status.reviewing { background: rgba(59, 130, 246, 0.1); color: var(--accent-blue); }
.backlog-status.running, .backlog-status.in_progress { animation: glow-pulse 1.8s infinite ease-in-out !important; }
.backlog-status.done { background: rgba(15, 23, 42, 0.06); color: var(--text-muted); }
.priority-tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 600; }
.priority-high { background: rgba(239,68,68,0.1); color: #ef4444; }
.priority-normal { background: rgba(59,130,246,0.1); color: #3b82f6; }
.priority-low { background: rgba(100,116,139,0.1); color: #64748b; }
.backlog-goal { color: var(--text-secondary); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
.backlog-state-grid { display: grid; grid-template-columns: 1.25fr 0.72fr 0.85fr 1.1fr 0.9fr; gap: 8px; margin-top: 10px; }
.backlog-state-grid > div { min-width: 0; padding: 8px; border-radius: 7px; background: rgba(15, 23, 42, 0.04); }
.backlog-state-grid span { display: block; margin-bottom: 3px; color: var(--text-muted); font-size: 10.5px; font-weight: 700; }
.backlog-state-grid strong { display: block; color: var(--text-primary); font-size: 11.5px; line-height: 1.35; overflow-wrap: anywhere; }
.backlog-session-field select{width:100%;min-width:0;height:28px;padding:0 24px 0 7px;border:1px solid var(--border-color);border-radius:6px;background:var(--surface);color:var(--text-primary);font-size:11px}.backlog-session-field select.invalid{border-color:#f59e0b;color:#b45309}
.backlog-meta { display: flex; flex-wrap: wrap; gap: 8px 12px; margin-top: 7px; color: var(--text-muted); font-size: 11px; }
.backlog-readiness { display: inline-flex; max-width: 100%; margin-top: 8px; margin-right: 6px; padding: 5px 8px; border-radius: 6px; font-size: 11px; line-height: 1.4; overflow-wrap: anywhere; }
.backlog-readiness.ok { border: 1px solid rgba(34, 197, 94, 0.16); background: rgba(34, 197, 94, 0.08); color: var(--accent-green); }
.backlog-readiness.warn { border: 1px solid rgba(234, 179, 8, 0.22); background: rgba(234, 179, 8, 0.09); color: #854d0e; }
.backlog-result { margin-top: 8px; padding: 7px 9px; border-radius: 6px; background: rgba(234, 179, 8, 0.08); color: #854d0e; font-size: 11px; line-height: 1.45; overflow-wrap: anywhere; }
.backlog-result.ask { background: rgba(59, 130, 246, 0.08); color: var(--accent-blue); }
.backlog-result.danger { background: rgba(239, 68, 68, 0.09); color: #b91c1c; }
.backlog-evidence, .backlog-history { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.backlog-evidence span, .backlog-history span { max-width: 100%; padding: 4px 7px; border-radius: 6px; background: rgba(15, 23, 42, 0.055); color: var(--text-secondary); font-size: 10.5px; line-height: 1.35; overflow-wrap: anywhere; }
.backlog-history span { background: rgba(59, 130, 246, 0.07); color: var(--accent-blue); }
.backlog-actions { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; flex-shrink: 0; }
@media (max-width: 900px) {
  .backlog-heading{align-items:flex-start;flex-wrap:wrap}.backlog-heading>div{flex-basis:calc(100% - 52px)}.smart-intake-button{width:100%}
  .backlog-item { flex-direction: column; }
  .backlog-actions { flex-direction: row; align-items: flex-start; flex-wrap: wrap; }
  .backlog-toolbar-grid, .backlog-state-grid { grid-template-columns: 1fr; }
  .backlog-toolbar { flex-direction: column; align-items: stretch; }
}

:global([data-theme="dark"] .backlog-item){
  background: var(--surface);
  border-color: var(--border-color);
}

:global([data-theme="dark"] .backlog-item:hover){
  border-color: rgba(59, 130, 246, 0.4);
}
</style>
