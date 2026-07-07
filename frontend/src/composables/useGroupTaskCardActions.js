import { toast, confirmDialog } from '../utils/toast.js'
import { buildGroupTaskKnowledgePayload, postKnowledgeCapture } from '../utils/knowledgeCapture.js'

const postTaskCardAction = async (path, body) => {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
  const payload = await response.json()
  if (!response.ok || payload.success === false) throw new Error(payload.error || `操作失败 (${response.status})`)
  return payload
}

export function createGroupTaskCardActionHandler(options = {}) {
  const {
    getTaskCard,
    getCurrentGroup,
    openCodeChangeDrawer,
    openPipelineViewer,
    openTraceReplay,
    loadMessages,
  } = options

  return async function handleTaskCardAction(msg, action) {
    const card = getTaskCard?.(msg)
    const id = card?.task_id || action?.task_id || msg?.task_id
    if (!id) return
    try {
      if (action.kind === 'view_changes') {
        const cardChangeFiles = action.files
          || card?.change_summary?.files
          || card?.changeSummary?.files
          || card?.delivery?.changes
          || card?.delivery?.files
          || []
        if (cardChangeFiles?.length) {
          const files = cardChangeFiles.map(item => {
            if (typeof item === 'string') return { path: item, project: action.project || msg.agent || msg.project || '', statusText: '变更', statusColor: '#64748b' }
            return { ...item, project: item.project || action.project || msg.agent || msg.project || '', statusText: item.statusText || item.status_label || item.status || '变更', statusColor: item.statusColor || item.status_color || '#64748b' }
          }).filter(item => item.path)
          return openCodeChangeDrawer?.(
            { files, count: files.length },
            { title: card?.title || '群聊 Agent 代码改动', subtitle: card?.goal || '', project: action.project || files.find(item => item.project)?.project || msg.agent || msg.project || '', files, selectedPath: action.selectedPath || files[0]?.path || '' }
          )
        }
        if (msg?.fileChanges?.files?.length) return openCodeChangeDrawer?.(msg.fileChanges, { title: card?.title || '群聊 Agent 代码改动', subtitle: card?.goal || '', project: msg.agent || msg.project || '' })
        return openPipelineViewer?.(msg)
      }
      if (action.kind === 'save_knowledge') {
        const data = await postKnowledgeCapture(buildGroupTaskKnowledgePayload({
          msg,
          card,
          group: getCurrentGroup?.(),
        }))
        toast.success(`已保存到知识库：${data.entry?.title || card?.title || '群聊任务'}`)
        return
      }
      if (action.kind === 'view_pipeline' || action.kind === 'view_report') return openPipelineViewer?.(msg)
      if (action.kind === 'view_trace') {
        openTraceReplay?.({ trace_id: action.trace_id || card?.technical?.trace_id || '', scope: action.scope || 'orchestrator' })
        return
      }
      if (action.kind === 'cancel') {
        if (!await confirmDialog(`确定取消任务“${card?.title || id}”？运行中的 Agent 会被安全终止。`)) return
        await postTaskCardAction('/api/tasks/cancel', { id, reason: '用户从群聊任务卡取消任务' })
      } else if (action.kind === 'confirm_plan') {
        const acceptFeedback = String(action.accept_feedback || action.acceptFeedback || action.feedback || '').trim()
        const confirmText = acceptFeedback
          ? `确认执行“${card?.title || id}”？主 Agent 会带着你的补充要求派发子 Agent。`
          : `确认执行“${card?.title || id}”？确认后主 Agent 才会派发子 Agent 开始修改。`
        if (!await confirmDialog(confirmText)) return
        await postTaskCardAction('/api/usability/intake/confirm', { id, ...(acceptFeedback ? { accept_feedback: acceptFeedback } : {}) })
      } else if (action.kind === 'revise_plan') {
        const feedback = window.prompt('希望主 Agent 怎么调整这份执行前计划？', action.feedback || '')
        if (!feedback?.trim()) return
        await postTaskCardAction('/api/usability/intake/revise', { id, feedback: feedback.trim() })
      } else if (action.kind === 'pause') {
        await postTaskCardAction('/api/tasks/update', { id, status: 'paused', is_paused: true, status_detail: '用户从群聊任务卡暂停' })
      } else if (action.kind === 'resume') {
        await postTaskCardAction('/api/tasks/update', { id, status: 'pending', is_paused: false, paused: false, status_detail: '用户从群聊任务卡恢复' })
        await postTaskCardAction('/api/tasks/queue', { task_id: id })
      } else if (action.kind === 'retry') {
        await postTaskCardAction('/api/tasks/retry', { id, reason: '用户从群聊任务卡重新派发', auto_execute: true })
      } else if (action.kind === 'switch_executor') {
        const runtime = window.prompt('切换执行器（claudecode / codex / cursor）：', 'codex')
        if (!runtime) return
        await postTaskCardAction('/api/tasks/switch-executor', { id, runtime: runtime.trim(), reason: '用户从群聊任务卡切换执行器', auto_execute: true })
      } else if (action.kind === 'queue') {
        await postTaskCardAction('/api/tasks/queue', { task_id: id })
      } else if (action.kind === 'gap_continue') {
        await postTaskCardAction('/api/tasks/continue-from-gaps', { id, source: 'user_gap_rework', auto_execute: true })
      } else if (action.kind === 'continue_work_item') {
        if (!await confirmDialog(`继续派发“${action.reason || action.target || '已解锁工作项'}”？主 Agent 会复用当前任务上下文，只推进这个工作项。`)) return
        await postTaskCardAction('/api/tasks/continue-from-gaps', {
          id,
          source: 'user_next_work_item',
          auto_execute: true,
          rework_kind: 'next_claimable_work_item',
          target: action.target || '',
          reason: action.reason || '',
          title: action.label || '继续派发已解锁工作项',
          request_id: `next-work-item:${id}:${action.work_item_id || action.target || action.reason || Date.now()}`,
        })
      } else if (action.kind === 'targeted_rework') {
        if (!await confirmDialog(`按“${action.title || action.label || '精准返工'}”继续任务？系统会复用原任务上下文，只处理这个缺口。`)) return
        await postTaskCardAction('/api/tasks/continue-from-gaps', {
          id,
          source: 'user_targeted_rework',
          auto_execute: true,
          rework_kind: action.id,
          target: action.target || '',
          reason: action.reason || '',
          title: action.title || action.label || '',
        })
      } else if (action.kind === 'confirm_done') {
        if (!await confirmDialog(`确定把任务“${card?.title || id}”标记为已处理？系统仍会执行后端验收校验。`)) return
        await postTaskCardAction('/api/tasks/update', { id, status: 'done', status_detail: '用户从 Todo 步骤确认已处理', completed_at: new Date().toISOString() })
      } else if (action.kind === 'continue') {
        const prompt = action.id === 'replan' ? '请重新检查目标、当前事实和验收标准，只调整未完成部分。' : window.prompt(card?.status === 'done' ? '继续修改什么？' : '追加要求：', '')
        if (!prompt) return
        await postTaskCardAction('/api/tasks/continue', { id, message: prompt, source: 'user', auto_execute: true })
      } else if (action.kind === 'rollback') {
        if (!await confirmDialog(`确定安全撤销任务“${card?.title || id}”的最近一轮改动？`)) return
        await postTaskCardAction('/api/tasks/rollback', { id, reason: '用户从群聊任务卡安全撤销' })
      } else {
        toast.info('该操作请在任务管理页的技术详情中执行')
        return
      }
      toast.success(`${action.label}已提交`)
      await loadMessages?.()
    } catch (error) {
      toast.error(error.message || `${action.label}失败`)
    }
  }
}
