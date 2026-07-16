import { globalMissionConversationState, upsertGlobalMissionConversationNotification } from './useGlobalAgentSessions.js'
import { getDeliveryReport } from '../utils/agentDisplay.js'
import { visibleGlobalText } from '../utils/globalAgentExecutionStream.js'

const missionStatusLabel = (mission) => {
  if (mission?.status === 'done') return '全部通过'
  const summary = mission?.mission_summary || {}
  if (summary.failed > 0) return '存在失败'
  if (summary.blocked > 0) return '待补齐'
  return '执行中'
}

const childStatusLabel = (child) => {
  if (child?.status === 'done' && child?.delivery_summary?.acceptance_gate_passed === true) return '验收通过'
  if (child?.status === 'done') return '等待总验收'
  if (child?.status === 'failed') return '执行失败'
  if (child?.status === 'in_progress') return '执行中'
  return '排队中'
}

export const __globalMissionTrackingTestHooks = { missionStatusLabel, childStatusLabel }

export function useGlobalMissionTracking(options = {}) {
  const missionPollTimers = new Map()
  const sessions = options.sessions
  const fetchImpl = options.fetchImpl || fetch
  const setIntervalImpl = options.setIntervalImpl || setInterval
  const clearIntervalImpl = options.clearIntervalImpl || clearInterval

  const stopMissionTracking = (missionId) => {
    const timer = missionPollTimers.get(missionId)
    if (timer) clearIntervalImpl(timer)
    missionPollTimers.delete(missionId)
  }

  const stopAllMissionTracking = () => {
    for (const timer of missionPollTimers.values()) clearIntervalImpl(timer)
    missionPollTimers.clear()
  }

  const formatMissionDeliveryReport = (report, fallback) => {
    if (!report) return fallback
    const deliveryReport = getDeliveryReport({ final_report: report, ...report })
    if (deliveryReport?.markdown || deliveryReport?.user_text) return deliveryReport.markdown || deliveryReport.user_text
    const visibleList = (values, empty) => {
      const rows = Array.isArray(values) ? values : values ? [values] : []
      return rows.length ? `\n- ${rows.map(item => visibleGlobalText(item, '信息已整理。', 260)).join('\n- ')}` : empty
    }
    const section = (label, values, empty) => `\n\n${label}：${visibleList(values, empty)}`
    return visibleGlobalText(report.summary || fallback, fallback, 420)
      + section('修改文件', report.files_modified, '无')
      + section('验证结果', report.verification_results, '无已执行验证证据')
      + section('合并结果', report.merge_commits, '无需独立 worktree 合并')
      + section('风险', report.risks, '未发现已知风险')
      + section('遗留项', report.remaining_items, '无')
  }

  const notificationContent = ({ state, mission, supervisor, run }) => {
    const title = visibleGlobalText(mission?.title || mission?.business_goal || '全局任务', '全局任务', 120)
    if (state === 'completed') {
      return run?.id
        ? options.formatRunVisibleReply(run, `「${title}」已通过全部交付验收。`)
        : formatMissionDeliveryReport(supervisor?.final_report, `「${title}」已通过全部交付验收。`)
    }
    if (state === 'cancelled') {
      return run?.id
        ? options.formatRunVisibleReply(run, `「${title}」已取消，后续执行和监督已经停止。`)
        : `「${title}」已取消，后续执行和监督已经停止。`
    }
    if (state === 'failed') {
      return run?.id
        ? options.formatRunVisibleReply(run, `「${title}」未完成，我已保留现有结果和失败原因。`)
        : `「${title}」未完成，我已保留现有结果和失败原因。`
    }
    if (state === 'waiting_user') {
      const reasons = (supervisor?.incidents || [])
        .filter(item => item?.type === 'waiting_user' && !item?.resolved_at && !item?.resolvedAt && item?.reason)
        .slice(-3)
        .map(item => visibleGlobalText(item.reason, '需要你补充一项信息。', 220))
      const fallback = [
        `「${title}」暂时停在需要你处理的位置。`,
        reasons.length ? `需要补充：${reasons.join('；')}` : '请查看任务卡中的待确认项；补充后我会继续执行、复核和总结。',
      ].join('\n')
      return run?.id ? options.formatRunVisibleReply(run, fallback) : fallback
    }
    return ''
  }

  const trackGlobalMission = (missionId, sessionId) => {
    if (!missionId || missionPollTimers.has(missionId)) return
    const refresh = async () => {
      try {
        const res = await fetchImpl('/api/global-agent/missions?id=' + encodeURIComponent(missionId))
        const data = await res.json()
        if (!res.ok || data.success === false) return
        const session = sessions.value.find(item => item.id === sessionId)
        if (!session) return
        const message = session.messages.find(item =>
          (item.type === 'global_mission' && item.globalMission?.id === missionId) || item.agenticRun?.mission_id === missionId
        )
        if (!message) return
        message.globalMission = data.mission
        message.globalMissionChildren = (data.children || []).map(task => ({ task, target: task.mission_target || null }))
        message.globalMissionSupervisor = data.supervisor || message.globalMissionSupervisor
        let currentRun = message.agenticRun || null
        if (message.agenticRun?.id) {
          try {
            const runRes = await fetchImpl('/api/global-agent/runs?id=' + encodeURIComponent(message.agenticRun.id))
            const runData = await runRes.json()
            if (runRes.ok && runData.run) {
              message.agenticRun = runData.run
              currentRun = runData.run
            }
          } catch {}
        }
        const state = globalMissionConversationState({ mission: data.mission, supervisor: data.supervisor, run: currentRun })
        if (state !== 'active') {
          const content = notificationContent({ state, mission: data.mission, supervisor: data.supervisor, run: currentRun })
          if (content) message.content = content
          const notification = upsertGlobalMissionConversationNotification(session.messages, {
            missionId,
            state,
            content,
            updatedAt: currentRun?.updated_at || data.supervisor?.updated_at || data.mission?.updated_at,
            extra: {
              globalMission: data.mission,
              globalMissionChildren: (data.children || []).map(task => ({ task, target: task.mission_target || null })),
              globalMissionSupervisor: data.supervisor || null,
            },
          })
          message.missionNotificationState = state
          if (notification.created && state === 'waiting_user') options.toast?.info?.('有一项全局任务需要你补充信息')
          if (['completed', 'failed', 'cancelled'].includes(state)) {
            message.finalNotified = true
            message.terminalNotified = true
            stopMissionTracking(missionId)
          }
        }
        options.saveHistory?.()
        options.scrollToBottom?.()
      } catch {}
    }
    missionPollTimers.set(missionId, setIntervalImpl(refresh, options.pollInterval || 4000))
    return refresh()
  }

  return {
    trackGlobalMission,
    stopMissionTracking,
    stopAllMissionTracking,
    missionStatusLabel,
    childStatusLabel,
  }
}
