<script setup>
import { computed } from 'vue'

const props = defineProps({
  presentation: { type: Object, default: () => ({}) },
  navigation: { type: Array, default: () => [] },
})
const emit = defineEmits(['navigate'])

const outcome = computed(() => props.presentation?.outcome || {})
const acceptance = computed(() => outcome.value.acceptance || {})
const statusLabel = value => ({ running: '进行中', completed: '已完成', failed: '失败', blocked: '需要处理', cancelled: '已取消' }[value] || value || '状态未知')
const linkLabel = link => link.relation === 'source' ? `返回${link.title || '来源会话'}` : `打开${link.title || '目标会话'}`
</script>

<template>
  <section class="replay-executive" :class="outcome.status || 'running'">
    <div class="outcome-main">
      <div class="outcome-heading">
        <span class="outcome-mark" aria-hidden="true"></span>
        <div>
          <small>{{ statusLabel(outcome.status) }}</small>
          <h2>{{ outcome.headline || '任务回放' }}</h2>
        </div>
      </div>
      <p>{{ outcome.summary || '系统正在整理这项任务的可验证过程。' }}</p>
      <div class="outcome-next"><b>{{ outcome.status === 'running' ? '下一步' : '建议' }}</b><span>{{ outcome.nextAction || '查看任务过程与验证证据' }}</span></div>
      <div v-if="navigation.length" class="outcome-navigation">
        <button v-for="link in navigation" :key="link.linkId || `${link.relation}-${link.scope}-${link.exactSessionId}`" type="button" :disabled="link.available === false" :title="link.unavailableReason || ''" @click="emit('navigate', link)">{{ linkLabel(link) }}</button>
      </div>
    </div>
    <dl class="outcome-facts">
      <div><dt>当前阶段</dt><dd>{{ outcome.currentStageLabel || '已结束' }}</dd></div>
      <div><dt>验收覆盖</dt><dd>{{ acceptance.satisfied || 0 }} / {{ acceptance.total || 0 }}</dd></div>
      <div :class="{ warn: outcome.unresolvedIssueCount }"><dt>未解决问题</dt><dd>{{ outcome.unresolvedIssueCount || 0 }}</dd></div>
      <div :class="{ warn: acceptance.stale }"><dt>陈旧证据</dt><dd>{{ acceptance.stale || 0 }}</dd></div>
    </dl>
  </section>
</template>

<style scoped>
.replay-executive{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,34%);gap:18px;margin-bottom:14px;padding:17px 18px;border:1px solid var(--border-color);border-left:4px solid #2563eb;border-radius:10px;background:linear-gradient(135deg,var(--surface),var(--bg-secondary))}.replay-executive.completed{border-left-color:#16a34a}.replay-executive.failed{border-left-color:#dc2626}.replay-executive.blocked{border-left-color:#d97706}.outcome-heading{display:flex;align-items:center;gap:10px}.outcome-mark{width:10px;height:10px;border-radius:50%;background:#2563eb;box-shadow:0 0 0 5px rgba(37,99,235,.12)}.completed .outcome-mark{background:#16a34a;box-shadow:0 0 0 5px rgba(22,163,74,.12)}.failed .outcome-mark{background:#dc2626}.blocked .outcome-mark{background:#d97706}.outcome-heading small{display:block;color:var(--text-muted);font-size:10px;font-weight:800}.outcome-heading h2{margin:2px 0 0;font-size:18px}.outcome-main>p{max-width:900px;margin:11px 0;color:var(--text-secondary);font-size:13px;line-height:1.65;white-space:pre-wrap}.outcome-next{display:flex;gap:9px;padding:8px 10px;border-radius:7px;background:var(--panel-muted);font-size:11px}.outcome-next b{flex:0 0 auto;color:var(--text-muted)}.outcome-next span{color:var(--text-primary)}.outcome-navigation{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.outcome-navigation button{padding:6px 9px;border:1px solid var(--border-color);border-radius:6px;background:var(--surface);color:var(--accent-blue);font-size:10px;font-weight:750;cursor:pointer}.outcome-navigation button:disabled{cursor:not-allowed;opacity:.55}.outcome-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));margin:0;border:1px solid var(--border-color);border-radius:8px;overflow:hidden}.outcome-facts>div{padding:10px;border-right:1px solid var(--border-color);border-bottom:1px solid var(--border-color)}.outcome-facts>div:nth-child(2n){border-right:0}.outcome-facts>div:nth-last-child(-n+2){border-bottom:0}.outcome-facts dt{color:var(--text-muted);font-size:9px}.outcome-facts dd{margin:4px 0 0;color:var(--text-primary);font-size:13px;font-weight:800}.outcome-facts .warn dd{color:#d97706}@media(max-width:800px){.replay-executive{grid-template-columns:1fr}.outcome-facts{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
