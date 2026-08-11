<script setup>
const props = defineProps({
  chapters: { type: Array, default: () => [] },
  attempts: { type: Array, default: () => [] },
  issues: { type: Array, default: () => [] },
})
const emit = defineEmits(['select'])
const statusLabel = value => ({ pending: '尚未开始', running: '进行中', completed: '已完成', completed_with_history: '已完成 · 有历史问题', failed: '失败', blocked: '受阻' }[value] || value)
const durationLabel = value => {
  const ms = Number(value || 0)
  if (!ms) return ''
  if (ms < 1000) return `${ms}毫秒`
  if (ms < 60000) return `${Math.round(ms / 100) / 10}秒`
  return `${Math.floor(ms / 60000)}分${Math.round((ms % 60000) / 1000)}秒`
}
const attemptsFor = kind => kind === 'implementation' ? props.attempts : kind === 'rework' ? props.attempts.filter(row => row.attempt > 1 || row.failureReason) : []
const issuesFor = kind => kind === 'rework' || kind === 'verification' ? props.issues : []
</script>

<template>
  <section class="replay-chapters" aria-label="任务过程章节">
    <header><div><strong>任务过程</strong><span>按用户能够理解的六个阶段整理</span></div></header>
    <ol>
      <li v-for="(chapter,index) in chapters" :key="chapter.kind" :class="chapter.status">
        <span class="chapter-index">{{ index + 1 }}</span>
        <details :open="chapter.status === 'running' || chapter.status === 'failed' || chapter.status === 'blocked'">
          <summary>
            <span><strong>{{ chapter.title }}</strong><small>{{ chapter.summary }}</small></span>
            <em>{{ statusLabel(chapter.status) }}<template v-if="durationLabel(chapter.durationMs)"> · {{ durationLabel(chapter.durationMs) }}</template></em>
          </summary>
          <div class="chapter-detail">
            <p>{{ chapter.summary }}</p>
            <div v-if="attemptsFor(chapter.kind).length" class="attempt-list">
              <article v-for="row in attemptsFor(chapter.kind)" :key="`${row.workItemId}-${row.attempt}`">
                <div><strong>{{ row.project || row.agent || '执行成员' }}</strong><span>第 {{ row.attempt }} 轮 · {{ row.outcome || '状态未记录' }}</span></div>
                <p>{{ row.summary || row.repairScope }}</p>
                <small>{{ row.filesChanged || 0 }} 个文件 · {{ row.verificationCount || 0 }} 项验证</small>
                <b v-if="row.failureReason">{{ row.failureReason }}</b>
              </article>
            </div>
            <div v-if="issuesFor(chapter.kind).length" class="issue-list">
              <article v-for="issue in issuesFor(chapter.kind)" :key="issue.issueId" :class="issue.status">
                <div><strong>{{ issue.summary || '任务问题' }}</strong><em>{{ issue.status === 'open' ? '未解决' : issue.status === 'resolved' ? '已解决' : '已被后续结果替代' }}</em></div>
                <p v-if="issue.resolution">{{ issue.resolution }}</p>
              </article>
            </div>
            <button v-if="chapter.eventIds?.length" type="button" class="chapter-events" @click="emit('select', chapter)">查看本阶段 {{ chapter.eventIds.length }} 条时间线记录</button>
          </div>
        </details>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.replay-chapters{margin-bottom:14px;border:1px solid var(--border-color);border-radius:9px;background:var(--surface);overflow:hidden}.replay-chapters>header{padding:12px 14px;border-bottom:1px solid var(--border-color)}.replay-chapters>header strong{display:block;font-size:13px}.replay-chapters>header span{display:block;margin-top:2px;color:var(--text-muted);font-size:10px}.replay-chapters ol{margin:0;padding:0;list-style:none}.replay-chapters li{display:grid;grid-template-columns:34px minmax(0,1fr);position:relative;padding:0 13px}.replay-chapters li:not(:last-child):before{position:absolute;left:29px;top:35px;bottom:-10px;width:1px;background:var(--border-color);content:""}.chapter-index{display:grid;place-items:center;align-self:start;width:21px;height:21px;margin-top:14px;border-radius:50%;background:var(--panel-muted);color:var(--text-muted);font-size:9px;font-weight:800;z-index:1}.completed .chapter-index,.completed_with_history .chapter-index{background:rgba(22,163,74,.14);color:#16a34a}.running .chapter-index{background:rgba(37,99,235,.15);color:#2563eb}.failed .chapter-index{background:rgba(220,38,38,.14);color:#dc2626}.blocked .chapter-index{background:rgba(217,119,6,.14);color:#d97706}.replay-chapters details{min-width:0;border-bottom:1px solid var(--border-color)}.replay-chapters li:last-child details{border-bottom:0}.replay-chapters summary{display:flex;justify-content:space-between;gap:16px;padding:13px 0;cursor:pointer;list-style:none}.replay-chapters summary::-webkit-details-marker{display:none}.replay-chapters summary>span{min-width:0}.replay-chapters summary strong{display:block;font-size:12px}.replay-chapters summary small{display:block;margin-top:3px;color:var(--text-muted);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.replay-chapters summary em{flex:0 0 auto;color:var(--text-muted);font-size:10px;font-style:normal}.chapter-detail{display:grid;gap:9px;padding:0 0 12px}.chapter-detail>p{margin:0;color:var(--text-secondary);font-size:11px;line-height:1.55}.attempt-list,.issue-list{display:grid;gap:7px}.attempt-list article,.issue-list article{padding:8px 9px;border:1px solid var(--border-color);border-radius:7px;background:var(--bg-secondary)}.attempt-list article>div,.issue-list article>div{display:flex;justify-content:space-between;gap:10px}.attempt-list strong,.issue-list strong{font-size:10.5px}.attempt-list span,.issue-list em{color:var(--text-muted);font-size:9px;font-style:normal}.attempt-list p,.issue-list p{margin:4px 0 0;color:var(--text-secondary);font-size:10px}.attempt-list small{display:block;margin-top:5px;color:var(--text-muted);font-size:9px}.attempt-list b{display:block;margin-top:5px;color:#d97706;font-size:9px}.issue-list .open{border-left:3px solid #d97706}.issue-list .resolved{border-left:3px solid #16a34a}.chapter-events{justify-self:start;padding:5px 8px;border:1px solid var(--accent-blue);border-radius:6px;background:transparent;color:var(--accent-blue);font-size:9px;font-weight:750;cursor:pointer}@media(max-width:720px){.replay-chapters summary{display:grid;gap:5px}.replay-chapters summary small{white-space:normal}.replay-chapters summary em{justify-self:start}}
</style>
