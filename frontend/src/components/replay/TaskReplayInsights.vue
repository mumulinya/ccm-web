<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  presentation: { type: Object, default: () => ({}) },
  section: { type: String, default: 'overview' },
})
const emit = defineEmits(['focus-event', 'handle-action'])
const expandedNodes = ref(new Set())
const integrity = computed(() => props.presentation?.integrity || {})
const causal = computed(() => props.presentation?.causalChain || { nodes: [], edges: [] })
const attempts = computed(() => props.presentation?.attemptComparisons || [])
const actions = computed(() => props.presentation?.actionCenter || [])
const integrityLabel = value => ({ complete: '记录完整', mostly_complete: '核心记录完整', partial: '记录存在缺口', legacy: '历史兼容记录' }[value] || '等待整理')
const kindLabel = value => ({ requirement: '需求', plan: '计划', agent: '项目 Agent', tool_batch: '工具批次', dependency: '跨项目依赖', file_change: '文件变化', verification: '验证', criterion: '验收标准', delivery: '交付' }[value] || value)
const statusLabel = value => ({ completed: '已完成', done: '已完成', passed: '通过', accepted: '已验收', success: '成功', running: '进行中', in_progress: '进行中', failed: '失败', blocked: '受阻', pending: '待执行', available: '已保存', satisfied: '已满足', stale: '已陈旧', not_run: '未运行' }[String(value || '').toLowerCase()] || value || '已记录')
const byId = computed(() => new Map((causal.value.nodes || []).map(node => [node.id, node])))
const inbound = id => (causal.value.edges || []).filter(edge => edge.to === id)
const roots = computed(() => (causal.value.nodes || []).filter(node => !inbound(node.id).length))
const children = id => (causal.value.edges || []).filter(edge => edge.from === id).map(edge => ({ ...byId.value.get(edge.to), relation: edge.relation })).filter(row => row.id)
const relationLabel = value => ({ planned_as: '规划为', assigned_to: '派发给', executed_by: '执行', changed: '产生改动', depends_on: '依赖', verified_by: '验证', satisfies: '满足', delivered_as: '交付为' }[value] || '关联')
const isExpanded = id => expandedNodes.value.has(id)
const toggle = id => {
  const next = new Set(expandedNodes.value)
  next.has(id) ? next.delete(id) : next.add(id)
  expandedNodes.value = next
}
const focusNode = node => {
  const eventId = node?.eventIds?.[0]
  if (eventId) emit('focus-event', eventId)
}
</script>

<template>
  <section v-if="section === 'overview'" class="replay-integrity" :class="integrity.level || 'partial'">
    <header>
      <div><span class="integrity-mark"></span><strong>{{ integrityLabel(integrity.level) }}</strong><small>基于当前任务账本的结构化来源判断，不使用伪精确百分比</small></div>
      <em>{{ integrity.observedSources?.length || 0 }} / {{ integrity.expectedSources?.length || 0 }} 类来源</em>
    </header>
    <div v-if="integrity.gaps?.length" class="integrity-gaps">
      <article v-for="gap in integrity.gaps" :key="`${gap.source}:${gap.label}`">
        <b>{{ gap.label }}</b><p>{{ gap.reason }}</p>
      </article>
    </div>
    <p v-else class="integrity-ok">需求、计划、执行、验证与终态交付记录均可验证。</p>
  </section>

  <section v-if="section === 'overview' && actions.length" class="replay-actions">
    <header><div><strong>需要处理</strong><small>操作能力由后端根据当前权限和任务状态提供</small></div><em>{{ actions.filter(row => row.enabled).length }} 项可执行</em></header>
    <div>
      <button v-for="action in actions" :key="action.id" type="button" :disabled="!action.enabled" :title="action.disabledReason || ''" @click="emit('handle-action', action)">
        <strong>{{ action.label }}</strong><small>{{ action.enabled ? '返回执行现场处理' : action.disabledReason || '当前不可执行' }}</small>
      </button>
    </div>
  </section>

  <section v-if="section === 'overview'" class="causal-chain">
    <header><div><strong>需求到交付的因果链</strong><small>只使用显式工作项、批次、依赖与证据引用建立关联</small></div><em>{{ causal.nodes?.length || 0 }} 个节点</em></header>
    <div v-if="!causal.nodes?.length" class="insight-empty">当前任务没有足够的结构化引用来建立因果链。</div>
    <div v-else class="causal-roots">
      <article v-for="root in roots" :key="root.id" class="causal-root">
        <button type="button" class="causal-row" @click="children(root.id).length ? toggle(root.id) : focusNode(root)">
          <span :class="['causal-dot', root.status]"></span><span><small>{{ kindLabel(root.kind) }}</small><strong>{{ root.title }}</strong></span><em>{{ statusLabel(root.status) }}</em><b v-if="children(root.id).length">{{ isExpanded(root.id) ? '−' : '+' }}</b>
        </button>
        <div v-if="isExpanded(root.id)" class="causal-children">
          <button v-for="child in children(root.id)" :key="`${root.id}:${child.id}`" type="button" @click="focusNode(child)">
            <span>{{ relationLabel(child.relation) }}</span><strong>{{ child.title }}</strong><small>{{ kindLabel(child.kind) }} · {{ statusLabel(child.status) }}</small>
          </button>
        </div>
      </article>
    </div>
  </section>

  <section v-if="section === 'attempts' && attempts.length" class="attempt-comparisons">
    <header><div><strong>尝试与返工对比</strong><small>失败尝试保留为历史证据，只有 accepted attempt 进入最终交付</small></div><em>{{ attempts.length }} 个工作项</em></header>
    <article v-for="group in attempts" :key="group.workItemId">
      <div class="attempt-title"><strong>{{ group.project || '执行工作项' }}</strong><small>{{ group.workItemId }}</small></div>
      <div class="attempt-grid">
        <div v-for="row in group.attempts" :key="row.attempt" :class="['attempt-card', { accepted: row.accepted, superseded: row.superseded }]">
          <header><b>第 {{ row.attempt }} 次</b><em>{{ row.accepted ? '已验收' : row.superseded ? '已替代' : statusLabel(row.status) }}</em></header>
          <p>{{ row.summary || row.failureReason || '未保存业务摘要' }}</p>
          <small>{{ row.filesChanged }} 个文件 · {{ row.verificationCount }} 项验证</small>
        </div>
      </div>
    </article>
  </section>
</template>

<style scoped>
.replay-integrity,.replay-actions,.causal-chain,.attempt-comparisons{margin:0 0 14px;border:1px solid var(--border-color);border-radius:9px;background:var(--surface);overflow:hidden}.replay-integrity{border-left:4px solid #16a34a}.replay-integrity.mostly_complete{border-left-color:#2563eb}.replay-integrity.partial,.replay-integrity.legacy{border-left-color:#d97706}.replay-integrity>header,.replay-actions>header,.causal-chain>header,.attempt-comparisons>header{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:11px 13px;border-bottom:1px solid var(--border-color)}header>div>strong,header>div>small{display:block}header>div>strong{font-size:12px}header>div>small{margin-top:2px;color:var(--text-muted);font-size:9.5px}header>em{color:var(--text-muted);font-size:10px;font-style:normal}.replay-integrity>header>div{display:grid;grid-template-columns:9px 1fr;column-gap:8px}.replay-integrity>header small{grid-column:2}.integrity-mark{grid-row:1/3;width:8px;height:8px;margin-top:3px;border-radius:50%;background:#16a34a}.partial .integrity-mark,.legacy .integrity-mark{background:#d97706}.integrity-gaps{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:1px;background:var(--border-color)}.integrity-gaps article{padding:10px 12px;background:var(--surface)}.integrity-gaps b{font-size:11px}.integrity-gaps p,.integrity-ok{margin:4px 0 0;color:var(--text-secondary);font-size:10.5px;line-height:1.5}.integrity-ok{padding:11px 13px;margin:0}.replay-actions>div{display:flex;flex-wrap:wrap;gap:7px;padding:10px 12px}.replay-actions button{display:grid;gap:2px;min-width:150px;padding:8px 10px;border:1px solid var(--border-color);border-radius:7px;background:var(--bg-primary);color:var(--text-primary);text-align:left;cursor:pointer}.replay-actions button:disabled{opacity:.55;cursor:not-allowed}.replay-actions button strong{font-size:11px}.replay-actions button small{color:var(--text-muted);font-size:9px}.insight-empty{padding:24px;color:var(--text-muted);font-size:11px;text-align:center}.causal-roots{display:grid}.causal-root{border-bottom:1px solid var(--border-color)}.causal-root:last-child{border-bottom:0}.causal-row{display:grid;grid-template-columns:9px minmax(0,1fr) auto 18px;align-items:center;gap:9px;width:100%;padding:10px 12px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}.causal-row:hover{background:var(--bg-secondary)}.causal-dot{width:8px;height:8px;border-radius:50%;background:#94a3b8}.causal-dot.completed,.causal-dot.done,.causal-dot.passed,.causal-dot.accepted,.causal-dot.satisfied{background:#16a34a}.causal-dot.running,.causal-dot.in_progress{background:#2563eb}.causal-dot.failed,.causal-dot.blocked{background:#dc2626}.causal-row span>small,.causal-row span>strong{display:block}.causal-row span>small{color:var(--text-muted);font-size:9px}.causal-row span>strong{margin-top:2px;font-size:11px}.causal-row>em{color:var(--text-muted);font-size:9.5px;font-style:normal}.causal-row>b{font-size:14px}.causal-children{display:grid;margin:0 12px 10px 29px;border-left:1px solid var(--border-color)}.causal-children button{display:grid;grid-template-columns:70px minmax(0,1fr) auto;gap:8px;padding:7px 10px;border:0;border-bottom:1px solid var(--border-color);background:transparent;color:inherit;text-align:left;cursor:pointer}.causal-children button:last-child{border-bottom:0}.causal-children span,.causal-children small{color:var(--text-muted);font-size:9px}.causal-children strong{font-size:10.5px}.attempt-comparisons>article{padding:10px 12px;border-bottom:1px solid var(--border-color)}.attempt-comparisons>article:last-child{border-bottom:0}.attempt-title{display:flex;gap:8px;align-items:baseline;margin-bottom:7px}.attempt-title strong{font-size:11px}.attempt-title small{color:var(--text-muted);font-size:9px}.attempt-grid{display:flex;gap:7px;overflow:auto}.attempt-card{flex:0 0 min(240px,75vw);padding:8px 9px;border:1px solid var(--border-color);border-radius:7px;background:var(--bg-primary)}.attempt-card.accepted{border-color:color-mix(in srgb,#16a34a 45%,var(--border-color));background:color-mix(in srgb,#16a34a 5%,var(--surface))}.attempt-card.superseded{opacity:.65}.attempt-card header{display:flex;justify-content:space-between}.attempt-card header b{font-size:10px}.attempt-card header em{font-size:9px}.attempt-card p{margin:6px 0;color:var(--text-secondary);font-size:10px;line-height:1.45}.attempt-card>small{color:var(--text-muted);font-size:9px}@media(max-width:720px){.causal-children button{grid-template-columns:1fr}.causal-children button span{font-weight:700}.replay-integrity>header,.replay-actions>header,.causal-chain>header,.attempt-comparisons>header{align-items:flex-start}.integrity-gaps{grid-template-columns:1fr}}
</style>
