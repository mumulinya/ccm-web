<script setup>
defineProps({ open: Boolean, jobs: { type: Array, default: () => [] } })
defineEmits(['close', 'cancel', 'retry', 'clear'])

const statusText = (job) => ({ queued: '等待中', resolving: '解析中', running: '下载中', done: '已完成', failed: '失败', cancelled: '已取消' }[job.status] || job.status)
</script>

<template>
  <div v-if="open" class="download-center" role="dialog" aria-label="下载中心">
    <header class="download-center__header">
      <div><strong>下载中心</strong><span>{{ jobs.length }} 个任务</span></div>
      <div class="download-center__commands"><button title="清理已结束任务" @click="$emit('clear')">清理</button><button class="icon-button" title="关闭" aria-label="关闭下载中心" @click="$emit('close')">×</button></div>
    </header>
    <div class="download-center__list">
      <div v-if="!jobs.length" class="download-center__empty">还没有下载任务</div>
      <article v-for="job in jobs" :key="job.id" class="download-job">
        <div class="download-job__main">
          <strong :title="job.title">{{ job.title }}</strong>
          <span>{{ job.artist }} · {{ statusText(job) }}</span>
          <small v-if="job.error" :title="job.error">{{ job.error }}</small>
        </div>
        <div class="download-job__progress" :class="{ indeterminate: job.progress == null && ['resolving', 'running'].includes(job.status) }">
          <i :style="{ width: `${job.progress == null ? 40 : job.progress}%` }"></i>
        </div>
        <div class="download-job__actions">
          <button v-if="['queued', 'resolving', 'running'].includes(job.status)" @click="$emit('cancel', job)">取消</button>
          <button v-if="['failed', 'cancelled'].includes(job.status)" @click="$emit('retry', job)">重试</button>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.download-center{position:fixed;z-index:1001;right:18px;bottom:92px;width:min(420px,calc(100vw - 24px));max-height:min(560px,70vh);display:flex;flex-direction:column;background:#16131f;border:1px solid #4a425d;border-radius:8px;box-shadow:0 18px 48px rgba(0,0,0,.5);color:#f4f0ff}.download-center__header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #332d40}.download-center__header div{display:flex;align-items:baseline;gap:8px}.download-center__header span{font-size:11px;color:#aaa0b9}.icon-button{width:30px;height:30px;border:0;background:transparent;color:#cec5db;font-size:22px;cursor:pointer}.download-center__list{overflow:auto;padding:6px}.download-center__empty{padding:28px;text-align:center;color:#90879c}.download-job{display:grid;grid-template-columns:1fr auto;gap:7px 10px;padding:10px;border-bottom:1px solid #2d2838}.download-job__main{min-width:0;display:flex;flex-direction:column;gap:2px}.download-job__main strong,.download-job__main span,.download-job__main small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.download-job__main span{font-size:11px;color:#aaa0b9}.download-job__main small{color:#ff8e9a}.download-job__progress{grid-column:1;height:3px;background:#302a3d;overflow:hidden}.download-job__progress i{display:block;height:100%;background:#49c5b6}.download-job__progress.indeterminate i{animation:slide 1.2s linear infinite}.download-job__actions{grid-column:2;grid-row:1/3;display:flex;align-items:center}.download-job__actions button{border:1px solid #5a506c;background:#24202e;color:#ddd5e8;padding:5px 9px;border-radius:4px;cursor:pointer}@keyframes slide{from{transform:translateX(-120%)}to{transform:translateX(300%)}}@media(max-width:600px){.download-center{right:12px;bottom:78px}}
.download-center__commands button{border:0;background:transparent;color:#aaa0b9;cursor:pointer}.download-center__commands .icon-button{color:#cec5db;font-size:22px}
</style>
