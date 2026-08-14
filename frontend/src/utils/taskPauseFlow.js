import { resolveTaskMutationGuard } from './taskMutationGuard.js'

const postPauseAction = async (endpoint, task, extra = {}) => {
  const id = String(task?.task_id || task?.taskId || task?.id || '')
  if (!id) throw new Error('当前任务没有可控制的任务 ID')
  const guard = await resolveTaskMutationGuard(id, task)
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id,
      ...guard,
      pauseSequence: task?.pauseSequence || task?.pause_status?.pauseSequence || task?.pauseStatus?.pauseSequence || task?.pause_control?.pauseSequence || 0,
      ...extra,
    }),
  })
  const payload = await response.json()
  if (!response.ok || payload?.success === false) throw new Error(payload?.error || '任务暂停操作失败')
  return payload
}

export const requestTaskPause = task => postPauseAction('/api/tasks/pause', task)
export const resumePausedTask = task => postPauseAction('/api/tasks/resume-paused', task)
export const forceInterruptPausedTask = task => postPauseAction('/api/tasks/interrupt', task, { reason: '安全暂停超过30秒后由用户强制中断' })
