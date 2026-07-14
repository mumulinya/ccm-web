import { computed, onUnmounted, ref } from 'vue'

export function useMusicDownloadJobs(options = {}) {
  const downloadJobs = ref([])
  const downloadCenterOpen = ref(false)
  let pollTimer = null

  const activeDownloadCount = computed(() => downloadJobs.value.filter(job => ['queued', 'resolving', 'running'].includes(job.status)).length)

  const loadDownloadJobs = async () => {
    try {
      const res = await fetch('/api/music/download-jobs')
      const data = await res.json()
      if (data.success) downloadJobs.value = data.jobs || []
    } catch {}
    schedulePoll()
  }

  const schedulePoll = () => {
    clearTimeout(pollTimer)
    const delay = activeDownloadCount.value > 0 || downloadCenterOpen.value ? 1000 : 5000
    pollTimer = setTimeout(loadDownloadJobs, delay)
  }

  const createDownloadJob = async (item) => {
    if (!item?.downloadToken) throw new Error('该搜索结果已失效，请重新搜索')
    const source = item.type === 'netease' ? 'netease' : 'bilibili'
    const res = await fetch('/api/music/download-jobs', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, downloadToken: item.downloadToken })
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || '创建下载任务失败')
    await loadDownloadJobs()
    downloadCenterOpen.value = true
    return data.job
  }

  const updateJob = async (job, action) => {
    const res = await fetch(`/api/music/download-jobs/${encodeURIComponent(job.id)}/${action}`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || '更新下载任务失败')
    await loadDownloadJobs()
    return data.job
  }

  const cancelDownloadJob = (job) => updateJob(job, 'cancel')
  const retryDownloadJob = (job) => updateJob(job, 'retry')
  const clearFinishedDownloadJobs = async () => {
    const res = await fetch('/api/music/download-jobs', { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || '清理下载记录失败')
    downloadJobs.value = data.jobs || []
    return downloadJobs.value
  }

  const waitForJob = (id, timeoutMs = 15 * 60 * 1000) => new Promise((resolve, reject) => {
    const started = Date.now()
    const check = async () => {
      try {
        const res = await fetch(`/api/music/download-jobs/${encodeURIComponent(id)}`)
        const data = await res.json()
        const job = data.job
        if (!job) throw new Error(data.error || '下载任务不存在')
        if (job.status === 'done') { await options.onCompleted?.(job); resolve(job); return }
        if (job.status === 'failed' || job.status === 'cancelled') { reject(new Error(job.error || (job.status === 'cancelled' ? '下载已取消' : '下载失败'))); return }
        if (Date.now() - started > timeoutMs) { reject(new Error('等待下载完成超时，任务仍会在下载中心继续')); return }
        setTimeout(check, 800)
      } catch (error) { reject(error) }
    }
    check()
  })

  onUnmounted(() => clearTimeout(pollTimer))
  return { downloadJobs, downloadCenterOpen, activeDownloadCount, loadDownloadJobs, createDownloadJob, cancelDownloadJob, retryDownloadJob, clearFinishedDownloadJobs, waitForJob }
}
