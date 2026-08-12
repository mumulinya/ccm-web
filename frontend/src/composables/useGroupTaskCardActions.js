import { toast, confirmDialog } from '../utils/toast.js'
import { buildGroupTaskKnowledgePayload, postKnowledgeCapture } from '../utils/knowledgeCapture.js'
import { resolveTaskMutationGuard, taskMutationGuardFromSource } from '../utils/taskMutationGuard.js'
import { stopTaskWithPreview } from '../utils/taskStopFlow.js'

const postTaskCardAction = async (path, body) => {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
  const payload = await response.json()
  if (!response.ok || payload.success === false) throw new Error(payload.error || `操作失败 (${response.status})`)
  return payload
}

export const buildWaitingUserTaskContinuationFields = (target = {}) => ({
  continuation_task_id: String(target.taskId || target.task_id || '').trim(),
  continuation_kind: 'supplement',
  resolve_waiting_user: true,
  interrupt_current_run: false,
  source: 'group_web_waiting_user_resolution',
  force_task: true,
  message_mode: 'project_task',
  auto_execute: true,
})

export const buildGroupClarificationResponseFields = (target = {}) => ({
  clarification_request_id: String(target.requestId || target.request_id || '').trim(),
  clarification_message_id: String(target.messageId || target.message_id || '').trim(),
  resolve_clarification: true,
  source: 'group_web_clarification_response',
  message_mode: String(target.messageMode || target.message_mode || 'conversation'),
})

export function createGroupTaskCardActionHandler(options = {}) {
  const {
    getTaskCard,
    getCurrentGroup,
    openCodeChangeDrawer,
    openPipelineViewer,
    openTraceReplay,
    openTestTargets,
    beginTaskInput,
    loadMessages,
    navigateConversation,
  } = options

  return async function handleTaskCardAction(msg, action) {
    const card = getTaskCard?.(msg)
    const id = card?.task_id || action?.task_id || msg?.task_id
    if (!id) return
    try {
      const guard = await resolveTaskMutationGuard(id, card)
      if (action.kind === 'open_task_center') {
        navigateConversation?.({ tab: 'tasks', taskId: id })
        return
      }
      if (action.kind === 'open_source_session') {
        const response = await fetch(`/api/tasks/${encodeURIComponent(id)}/conversation-links`)
        const data = await response.json()
        if (!response.ok || data.success === false) throw new Error(data.error || '无法读取原任务会话')
        const link = (data.links || []).find(item => item.relation === 'source')
        if (!link?.available) throw new Error(link?.unavailableReason || '原全局会话不存在或无权访问')
        navigateConversation?.({ tab: 'global-agent', sessionId: link.exactSessionId, messageId: link.messageId || '', missionId: link.missionId || '' })
        return
      }
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
            { title: card?.title || '群聊代码改动', subtitle: card?.goal || '', project: action.project || files.find(item => item.project)?.project || msg.agent || msg.project || '', files, selectedPath: action.selectedPath || files[0]?.path || '' }
          )
        }
        if (msg?.fileChanges?.files?.length) return openCodeChangeDrawer?.(msg.fileChanges, { title: card?.title || '群聊代码改动', subtitle: card?.goal || '', project: msg.agent || msg.project || '' })
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
        openTraceReplay?.({
          task_id: action.task_id || card?.task_id || id,
          trace_id: action.trace_id || card?.technical?.trace_id || '',
          scope: action.scope || 'orchestrator',
          preset: action.preset || 'all',
          event_status: action.event_status || action.eventStatus || '',
          event_query: action.event_query || action.eventQuery || '',
          event_id: action.event_id || action.eventId || '',
          evidence_id: action.evidence_id || action.evidenceId || '',
        })
        return
      }
      if (action.kind === 'open_test_targets') {
        await openTestTargets?.()
        return
      }
      if (action.kind === 'interrupt') {
        if (!await confirmDialog(`确定停止“${card?.title || id}”当前这一轮执行吗？任务和子 Agent 会话会保留。`)) return
        await postTaskCardAction('/api/tasks/interrupt', { id, reason: '用户从群聊任务卡停止当前执行', ...guard })
      } else if (action.kind === 'resume_interrupted') {
        await postTaskCardAction('/api/tasks/resume-interrupted', { id, ...guard })
      } else if (action.kind === 'cancel') {
        const result = await stopTaskWithPreview({ ...card, id }, {
          reason: '用户从群聊任务卡停止任务', actor: 'group-task-card',
          onConflict: () => toast.info('任务状态已更新，请重新确认停止范围'),
        })
        if (!result) return
        toast.success(result.running ? '正在安全停止任务' : result.undoAvailable ? '任务已停止，可在 10 秒内撤销' : '任务已停止')
        await loadMessages?.()
        return
      } else if (action.kind === 'confirm_plan') {
        const acceptFeedback = String(action.accept_feedback || action.acceptFeedback || action.feedback || '').trim()
        const confirmText = acceptFeedback
          ? `确认执行“${card?.title || id}”？我会带着你的补充要求安排执行成员处理。`
          : `确认执行“${card?.title || id}”？确认后我才会安排执行成员开始修改。`
        if (!await confirmDialog(confirmText)) return
        await postTaskCardAction('/api/usability/intake/confirm', { id, ...guard, ...(acceptFeedback ? { accept_feedback: acceptFeedback } : {}) })
      } else if (action.kind === 'revise_plan') {
        const feedback = window.prompt('希望我怎么调整这份执行前计划？', action.feedback || '')
        if (!feedback?.trim()) return
        await postTaskCardAction('/api/usability/intake/revise', { id, feedback: feedback.trim(), ...guard })
      } else if (action.kind === 'pause') {
        await postTaskCardAction('/api/tasks/update', { id, status: 'paused', is_paused: true, status_detail: '用户从群聊任务卡暂停', ...guard })
      } else if (action.kind === 'resume') {
        const resumed = await postTaskCardAction('/api/tasks/update', { id, status: 'pending', is_paused: false, paused: false, status_detail: '用户从群聊任务卡恢复', ...guard })
        await postTaskCardAction('/api/tasks/queue', { task_id: id, ...taskMutationGuardFromSource(resumed.task || card) })
      } else if (action.kind === 'retry') {
        await postTaskCardAction('/api/tasks/retry', { id, reason: '用户从群聊任务卡重新派发', auto_execute: true, ...guard })
      } else if (action.kind === 'reconcile_delivery' || action.kind === 'recheck') {
        await postTaskCardAction('/api/tasks/reconcile-delivery', { id, ...guard })
      } else if (action.kind === 'resolve_permission') {
        navigateConversation?.({ tab: 'tools-config', taskId: id })
        return
      } else if (action.kind === 'takeover') {
        if (!await confirmDialog(`确定人工接管“${card?.title || id}”？系统会停止自动重跑并保留当前现场。`)) return
        await postTaskCardAction('/api/tasks/update', { id, status: 'manual_takeover', acceptance_state: 'recovery_required', status_detail: '用户从任务卡人工接管，已保留当前执行现场', ...guard })
      } else if (action.kind === 'switch_executor') {
        const runtime = window.prompt('切换执行器（claudecode / codex / cursor / gemini / opencode）：', 'codex')
        if (!runtime) return
        await postTaskCardAction('/api/tasks/switch-executor', { id, runtime: runtime.trim(), reason: '用户从群聊任务卡切换执行器', auto_execute: true, ...guard })
      } else if (action.kind === 'queue') {
        await postTaskCardAction('/api/tasks/queue', { task_id: id, ...guard })
      } else if (action.kind === 'gap_continue') {
        await postTaskCardAction('/api/tasks/continue-from-gaps', { id, source: 'user_gap_rework', auto_execute: true, ...guard })
      } else if (action.kind === 'approve_epic') {
        if (!await confirmDialog(`确认批准“${card?.title || id}”的整批变更并完成 Epic 交付？`)) return
        await postTaskCardAction('/api/tasks/requirement-epic/review', { id, operation: 'approve' })
      } else if (action.kind === 'continue_work_item') {
        if (!await confirmDialog(`继续安排“${action.reason || action.target || '已解锁工作项'}”？我会复用当前任务上下文，只推进这个工作项。`)) return
        const actionResult = await postTaskCardAction('/api/tasks/continue-from-gaps', {
          id,
          ...guard,
          source: 'user_next_work_item',
          auto_execute: true,
          rework_kind: 'next_claimable_work_item',
          work_item_id: action.work_item_id || '',
          target: action.target || '',
          reason: action.reason || '',
          title: action.label || '继续派发已解锁工作项',
          request_id: `next-work-item:${id}:${action.work_item_id || action.target || action.reason || Date.now()}`,
        })
        const claimSummary = actionResult.work_item_claim_summary || actionResult.workItemClaimSummary || null
        if (claimSummary?.headline) {
          if (actionResult.waiting === true || claimSummary.status !== 'claimed') toast.info(claimSummary.headline)
          else toast.success(claimSummary.headline)
          await loadMessages?.()
          return
        }
      } else if (action.kind === 'targeted_rework') {
        if (action.requirement_epic || card?.requirement_epic) {
          const items = card?.requirement_epic?.items || []
          const itemHint = items.map(item => `${item.item_key}: ${item.title}`).join('\n')
          const itemKey = window.prompt(`输入要退回的子任务 item_key：\n${itemHint}`, items[0]?.item_key || '')
          if (!itemKey?.trim()) return
          const feedback = window.prompt('说明需要返工的内容：', '')
          if (!feedback?.trim()) return
          await postTaskCardAction('/api/tasks/requirement-epic/review', { id, operation: 'rework', item_key: itemKey.trim(), feedback: feedback.trim() })
          await loadMessages?.()
          return
        }
        if (!await confirmDialog(`按“${action.title || action.label || '精准返工'}”继续任务？系统会复用原任务上下文，只处理这个缺口。`)) return
        await postTaskCardAction('/api/tasks/continue-from-gaps', {
          id,
          ...guard,
          source: 'user_targeted_rework',
          auto_execute: true,
          rework_kind: action.id,
          target: action.target || '',
          reason: action.reason || '',
          title: action.title || action.label || '',
        })
      } else if (action.kind === 'confirm_done') {
        if (!await confirmDialog(`确定把任务“${card?.title || id}”标记为已处理？系统仍会执行后端验收校验。`)) return
        await postTaskCardAction('/api/tasks/update', { id, status: 'done', status_detail: '用户从 Todo 步骤确认已处理', completed_at: new Date().toISOString(), ...guard })
      } else if (action.kind === 'continue') {
        if (card?.phase === 'needs_user' && beginTaskInput) {
          beginTaskInput(msg, card, { ...action, task_id: id })
          return
        }
        const preset = String(action.message || action.prompt || '').trim()
        const prompt = preset || (action.id === 'replan' ? '请重新检查目标、当前事实和验收标准，只调整未完成部分。' : window.prompt(card?.status === 'done' ? '继续修改什么？' : '追加要求：', ''))
        if (!prompt) return
        await postTaskCardAction('/api/tasks/continue', { id, message: prompt, source: action.source || 'user', auto_execute: true })
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
