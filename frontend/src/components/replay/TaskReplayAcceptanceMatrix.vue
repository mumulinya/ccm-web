<script setup>
defineProps({ rows: { type: Array, default: () => [] } })
const emit = defineEmits(['open-evidence'])
const statusLabel = value => ({ satisfied: '已满足', failed: '未通过', stale: '需重新核验', not_run: '未验证' }[value] || value)
const freshnessLabel = value => ({ current: '当前代码', stale: '证据已陈旧', unknown: '代码状态未证明' }[value] || value)
</script>

<template>
  <section class="acceptance-matrix" aria-label="验收标准覆盖">
    <header><div><strong>验收标准</strong><span>任务是否完成，以当前有效证据为准</span></div><em>{{ rows.filter(row => row.status === 'satisfied').length }} / {{ rows.length }} 已满足</em></header>
    <div v-if="!rows.length" class="acceptance-empty">此任务没有保存结构化验收标准，不能证明具体标准覆盖情况。</div>
    <div v-else class="acceptance-table" role="table">
      <div class="acceptance-head" role="row"><span>验收要求</span><span>结论</span><span>验证者与证据</span></div>
      <article v-for="row in rows" :key="row.criterionId" :class="row.status" role="row">
        <div><strong>{{ row.description }}</strong><p v-if="row.reason">{{ row.reason }}</p></div>
        <div><b>{{ statusLabel(row.status) }}</b><small>{{ freshnessLabel(row.freshness) }}</small></div>
        <div><span>{{ row.verifier || '未记录' }}</span><button v-for="id in row.evidenceIds || []" :key="id" type="button" @click="emit('open-evidence', id)">查看证据</button><small v-if="!row.evidenceIds?.length">没有可定位的证据</small></div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.acceptance-matrix{margin-bottom:14px;border:1px solid var(--border-color);border-radius:9px;background:var(--surface);overflow:hidden}.acceptance-matrix>header{display:flex;justify-content:space-between;gap:14px;align-items:center;padding:12px 14px;border-bottom:1px solid var(--border-color)}.acceptance-matrix header strong{display:block;font-size:13px}.acceptance-matrix header span{display:block;margin-top:2px;color:var(--text-muted);font-size:10px}.acceptance-matrix header em{color:var(--text-muted);font-size:10px;font-style:normal;font-weight:750}.acceptance-empty{padding:24px;color:var(--text-muted);font-size:11px;text-align:center}.acceptance-table{display:grid}.acceptance-head,.acceptance-table article{display:grid;grid-template-columns:minmax(260px,1.5fr) minmax(130px,.45fr) minmax(200px,.8fr);gap:12px;align-items:center;padding:9px 13px}.acceptance-head{background:var(--bg-secondary);color:var(--text-muted);font-size:9px;font-weight:800}.acceptance-table article{border-top:1px solid var(--border-color)}.acceptance-table article:first-of-type{border-top:0}.acceptance-table article>div{min-width:0}.acceptance-table strong{font-size:11px}.acceptance-table p{margin:3px 0 0;color:var(--text-muted);font-size:9px}.acceptance-table b{display:block;font-size:10px}.acceptance-table small{display:block;margin-top:3px;color:var(--text-muted);font-size:9px}.acceptance-table article.satisfied b{color:#16a34a}.acceptance-table article.failed b{color:#dc2626}.acceptance-table article.stale b,.acceptance-table article.not_run b{color:#d97706}.acceptance-table button{margin:4px 5px 0 0;padding:3px 6px;border:1px solid var(--accent-blue);border-radius:5px;background:transparent;color:var(--accent-blue);font-size:8.5px;cursor:pointer}@media(max-width:760px){.acceptance-head{display:none}.acceptance-table article{grid-template-columns:1fr}.acceptance-table article>div{padding-top:2px}}
</style>
