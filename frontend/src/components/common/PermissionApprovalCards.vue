<script setup>
import { Check, ShieldAlert, X } from '@lucide/vue'

defineProps({
  requests: { type: Array, default: () => [] },
  busyId: { type: String, default: '' },
})

const emit = defineEmits(['approve', 'reject'])

const riskLabel = (risk) => ({ high: '高风险', medium: '需复核', low: '常规操作' }[risk] || '需确认')
</script>

<template>
  <section v-if="requests.length" class="permission-approval-list" aria-live="polite" aria-label="待处理权限申请">
    <article v-for="request in requests" :key="request.id" class="permission-approval-card">
      <div class="permission-approval-icon"><ShieldAlert :size="19" /></div>
      <div class="permission-approval-copy">
        <div class="permission-approval-heading">
          <strong>项目 Agent 需要你的确认</strong>
          <span :class="['permission-risk', request.risk]">{{ riskLabel(request.risk) }}</span>
        </div>
        <p>{{ request.project }} 请求执行 {{ request.operation }}</p>
        <small>{{ request.reason }}</small>
        <small v-if="request.riskReasons?.length" class="permission-risk-reason">{{ request.riskReasons.join('；') }}</small>
        <code v-if="request.command">{{ request.command }}</code>
      </div>
      <div class="permission-approval-actions">
        <button type="button" class="permission-icon-button reject" title="拒绝" :disabled="!!busyId" @click="emit('reject', request)">
          <X :size="17" /><span>拒绝</span>
        </button>
        <button type="button" class="permission-icon-button approve" title="批准一次，有效 15 分钟" :disabled="!!busyId" @click="emit('approve', request)">
          <Check :size="17" /><span>{{ busyId === request.id ? '处理中' : '批准一次' }}</span>
        </button>
      </div>
    </article>
  </section>
</template>

<style scoped>
.permission-approval-list { display: grid; gap: 8px; padding: 8px 16px 0; flex: 0 0 auto; }
.permission-approval-card { display: grid; grid-template-columns: 32px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 11px 12px; border: 1px solid color-mix(in srgb, #d97706 34%, var(--border-color)); border-radius: 8px; background: color-mix(in srgb, #f59e0b 7%, var(--bg-card)); box-shadow: 0 8px 24px rgba(120, 53, 15, .06); }
.permission-approval-icon { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 7px; color: #b45309; background: color-mix(in srgb, #f59e0b 15%, var(--bg-card)); }
.permission-approval-copy { min-width: 0; display: grid; gap: 3px; }
.permission-approval-heading { display: flex; align-items: center; gap: 8px; min-width: 0; }
.permission-approval-heading strong { color: var(--text-primary); font-size: 12.5px; }
.permission-risk { padding: 2px 6px; border-radius: 5px; color: #92400e; background: #fef3c7; font-size: 10px; font-weight: 800; white-space: nowrap; }
.permission-risk.high { color: #991b1b; background: #fee2e2; }
.permission-risk.low { color: #166534; background: #dcfce7; }
.permission-approval-copy p { margin: 0; color: var(--text-primary); font-size: 12px; line-height: 1.4; overflow-wrap: anywhere; }
.permission-approval-copy small { color: var(--text-secondary); font-size: 11px; line-height: 1.4; overflow-wrap: anywhere; }
.permission-risk-reason { color: #92400e !important; }
.permission-approval-copy code { display: block; max-width: 100%; padding: 4px 6px; overflow: hidden; color: var(--text-secondary); background: color-mix(in srgb, var(--text-primary) 5%, transparent); border-radius: 5px; font-size: 10.5px; text-overflow: ellipsis; white-space: nowrap; }
.permission-approval-actions { display: flex; gap: 6px; }
.permission-icon-button { height: 32px; display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 0 10px; border: 1px solid var(--border-color); border-radius: 7px; background: var(--bg-card); color: var(--text-primary); font-size: 11.5px; font-weight: 700; cursor: pointer; white-space: nowrap; }
.permission-icon-button:hover:not(:disabled) { border-color: #d97706; }
.permission-icon-button.approve { border-color: #2563eb; background: #2563eb; color: #fff; }
.permission-icon-button.reject { color: var(--text-secondary); }
.permission-icon-button:disabled { cursor: wait; opacity: .55; }
@media (max-width: 720px) {
  .permission-approval-list { padding-inline: 10px; }
  .permission-approval-card { grid-template-columns: 28px minmax(0, 1fr); align-items: start; }
  .permission-approval-icon { width: 28px; height: 28px; }
  .permission-approval-actions { grid-column: 1 / -1; }
  .permission-icon-button { flex: 1; }
}
</style>
