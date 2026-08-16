<script setup>
import { Check, Clock3, Folder, ShieldAlert, Tag, X } from '@lucide/vue'

defineProps({
  requests: { type: Array, default: () => [] },
  busyId: { type: String, default: '' },
})

const emit = defineEmits(['approve', 'reject'])

const riskLabel = (risk) => ({ high: '高风险', medium: '需复核', low: '常规操作' }[risk] || '需确认')
const isTaskEditApproval = request => (request?.approvalScope || request?.approval_scope) === 'task' && request?.operation === 'workspace_edit_session'
const taskEditRiskLabel = request => request?.risk === 'high' ? riskLabel(request.risk) : '常规代码修改'
const requestTitle = request => isTaskEditApproval(request) ? '需要确认代码修改' : '需要确认权限申请'
const requestSubtitle = request => isTaskEditApproval(request)
  ? `项目子 Agent 准备修改 ${request.project || '当前项目'}`
  : `${request.project || '项目子 Agent'} 请求额外权限`
const operationLabel = request => ({
  workspace_edit_session: '完成当前任务所需的代码修改',
  workspace_write: '修改项目文件',
  dependency_install: '安装项目依赖',
  build: '运行项目构建',
  test: '运行项目测试',
  publish: '发布项目产物',
  production_deploy: '变更生产环境',
  secret_access: '访问密钥或凭据',
  privilege_elevation: '提升系统权限',
}[request?.operation] || request?.operation || '执行当前操作')
const approvalScopeLabel = request => isTaskEditApproval(request) ? '当前项目工作区' : (request?.paths?.length ? '申请中列出的目标范围' : '当前任务范围')
const approvalDurationLabel = request => isTaskEditApproval(request) ? '仅当前任务及其返工、复验有效' : '仅本次精确操作，限时有效'
const approveLabel = request => isTaskEditApproval(request) ? '允许当前任务修改' : '批准本次操作'
const purposeLabel = request => request?.reason || operationLabel(request)
</script>

<template>
  <section v-if="requests.length" class="permission-approval-list" aria-live="polite" aria-label="待处理权限申请">
    <article v-for="request in requests" :key="request.id" class="permission-approval-card">
      <div class="permission-approval-icon"><ShieldAlert :size="19" /></div>
      <div class="permission-approval-copy">
        <div class="permission-approval-heading">
          <strong>{{ requestTitle(request) }}</strong>
          <span :class="['permission-risk', request.risk]">{{ isTaskEditApproval(request) ? taskEditRiskLabel(request) : riskLabel(request.risk) }}</span>
        </div>
        <p class="permission-approval-subtitle">{{ requestSubtitle(request) }}</p>
        <dl class="permission-approval-scope">
          <div><dt><Tag :size="14" />用途</dt><dd>{{ purposeLabel(request) }}</dd></div>
          <div><dt><Folder :size="14" />允许范围</dt><dd>{{ approvalScopeLabel(request) }}</dd></div>
          <div><dt><Clock3 :size="14" />授权期限</dt><dd>{{ approvalDurationLabel(request) }}</dd></div>
        </dl>
        <div v-if="isTaskEditApproval(request)" class="permission-safety-note">
          <ShieldAlert :size="14" />
          <span>发布、密钥、提权和破坏性操作仍需单独确认</span>
        </div>
        <div v-else-if="request.riskReasons?.length" class="permission-safety-note" :class="{ danger: request.risk === 'high' }">
          <ShieldAlert :size="14" />
          <span>{{ request.riskReasons.join('；') }}</span>
        </div>
        <pre v-if="request.command" class="permission-command">{{ request.command }}</pre>
      </div>
      <div class="permission-approval-actions">
        <button type="button" class="permission-icon-button reject" title="拒绝" :disabled="!!busyId" @click="emit('reject', request)">
          <X :size="17" /><span>拒绝</span>
        </button>
        <button type="button" class="permission-icon-button approve" :title="approveLabel(request)" :disabled="!!busyId" @click="emit('approve', request)">
          <Check :size="17" /><span>{{ busyId === request.id ? '处理中' : approveLabel(request) }}</span>
        </button>
      </div>
    </article>
  </section>
</template>

<style scoped>
.permission-approval-list { display: grid; gap: 8px; padding: 9px 16px 0; flex: 0 0 auto; }
.permission-approval-card { position:relative; display: grid; grid-template-columns: 34px minmax(0, 1fr); gap: 11px; padding: 14px 15px 13px; overflow:hidden; border: 1px solid color-mix(in srgb, var(--border-color) 88%, transparent); border-radius: 10px; background: var(--bg-card); box-shadow: 0 5px 18px rgba(15, 23, 42, .045); }
.permission-approval-card::before { content:''; position:absolute; inset:0 auto 0 0; width:3px; background:#f59e0b; }
.permission-approval-icon { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 8px; color: #d97706; background: color-mix(in srgb, #f59e0b 11%, var(--bg-card)); }
.permission-approval-copy { min-width: 0; display: grid; gap: 7px; }
.permission-approval-heading { display: flex; align-items: center; gap: 8px; min-width: 0; }
.permission-approval-heading strong { color: var(--text-primary); font-size: 14px; }
.permission-risk { padding: 2px 6px; border-radius: 5px; color: var(--accent-yellow); background: var(--warning-soft); font-size: 10px; font-weight: 800; white-space: nowrap; }
.permission-risk.high { color: var(--accent-red); background: var(--danger-soft); }
.permission-risk.low { color: var(--accent-green); background: var(--success-soft); }
.permission-approval-subtitle { margin: -2px 0 1px; color: var(--text-secondary); font-size: 12px; line-height: 1.45; overflow-wrap: anywhere; }
.permission-approval-scope { display:grid; margin:2px 0 0; overflow:hidden; border:1px solid color-mix(in srgb,var(--border-color) 78%,transparent); border-radius:8px; }
.permission-approval-scope>div { display:grid; grid-template-columns:120px minmax(0,1fr); align-items:center; gap:12px; min-height:36px; padding:6px 10px; border-top:1px solid color-mix(in srgb,var(--border-color) 65%,transparent); }
.permission-approval-scope>div:first-child { border-top:0; }
.permission-approval-scope dt { display:flex; align-items:center; gap:7px; color:var(--text-secondary); font-size:11px; }
.permission-approval-scope dd { min-width:0; margin:0; color:var(--text-primary); font-size:11.5px; line-height:1.45; overflow-wrap:anywhere; }
.permission-safety-note { display:flex; align-items:flex-start; gap:7px; padding:8px 9px; border:1px solid color-mix(in srgb,#f59e0b 24%,var(--border-color)); border-radius:7px; color:#92400e; background:color-mix(in srgb,#f59e0b 6%,var(--bg-card)); font-size:10.5px; line-height:1.45; }
.permission-safety-note svg { flex:0 0 auto; margin-top:1px; }
.permission-safety-note.danger { color:var(--accent-red); border-color:color-mix(in srgb,var(--accent-red) 28%,var(--border-color)); background:var(--danger-soft); }
.permission-command { display:block; max-width:100%; margin:0; padding:6px 7px; overflow-x:auto; color:var(--text-secondary); background:color-mix(in srgb,var(--text-primary) 5%,transparent); border-radius:5px; font-size:10px; white-space:pre; }
.permission-approval-actions { grid-column:2; display:flex; justify-content:flex-end; gap:7px; padding-top:1px; }
.permission-icon-button { min-height: 34px; display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 0 12px; border: 1px solid var(--border-color); border-radius: 7px; background: var(--bg-card); color: var(--text-primary); font-size: 11.5px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.permission-icon-button:hover:not(:disabled) { border-color: #d97706; }
.permission-icon-button.approve { border-color: #2563eb; background: #2563eb; color: #fff; }
.permission-icon-button.reject { color: var(--text-secondary); }
.permission-icon-button:disabled { cursor: wait; opacity: .55; }
@media (max-width: 720px) {
  .permission-approval-list { padding-inline: 10px; }
  .permission-approval-card { grid-template-columns: 28px minmax(0, 1fr); align-items: start; padding:12px 11px; }
  .permission-approval-icon { width: 28px; height: 28px; }
  .permission-approval-heading { align-items:flex-start; flex-direction:column; gap:5px; }
  .permission-approval-scope>div { grid-template-columns:1fr; gap:2px; padding:7px 8px; }
  .permission-approval-actions { grid-column: 1 / -1; }
  .permission-icon-button { flex: 1; }
}
</style>
