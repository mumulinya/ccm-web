<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { toast, confirmDialog } from '../utils/toast.js'

const orchestratorDiagnostics = ref(null)
const orchestratorDiagnosticsLoading = ref(false)
const dailyDevRehearsal = ref(null)
const dailyDevRehearsalLoading = ref(false)
const dailyDevSmokeTask = ref(null)
const dailyDevSmokeStatus = ref(null)
const dailyDevSmokeLoading = ref(false)
const agentCliProbe = ref(null)
const agentCliProbeLoading = ref(false)
const agentCliProbeBatchLoading = ref(false)
const agentCliProbeBatch = ref(null)
const agentCliProbeTargetKey = ref('')
const agentCliProbeRecovery = ref(null)
const agentRecoveryMonitorRun = ref(null)
const agentRecoveryMonitorLoading = ref(false)
const dailyDevAutopilotRun = ref(null)
const dailyDevAutopilotLoading = ref(false)
const dailyDevCronEnsureRun = ref(null)
const dailyDevCronEnsureLoading = ref(false)
const inferredVerificationApplyRun = ref(null)
const inferredVerificationApplyLoading = ref(false)
const showAdvanced = ref(false)
const soakState = ref(null)
const soakReport = ref(null)
const soakLoading = ref(false)
const soakPreflight = ref(null)
let soakPollTimer = null

const soakProgress = computed(() => {
  const state = soakState.value
  if (!state?.started_at || !state?.ends_at) return 0
  const total = Date.parse(state.ends_at) - Date.parse(state.started_at)
  const elapsed = Date.now() - Date.parse(state.started_at)
  return total > 0 ? Math.max(0, Math.min(100, Math.round(elapsed / total * 100))) : 0
})

const formatSoakDuration = (ms) => {
  const value = Math.max(0, Number(ms || 0))
  const hours = Math.floor(value / 3600000)
  const minutes = Math.floor((value % 3600000) / 60000)
  return hours > 0 ? `${hours}小时 ${minutes}分钟` : `${minutes}分钟`
}

const formatBytesMb = (bytes) => `${(Number(bytes || 0) / 1024 / 1024).toFixed(1)} MB`

const loadSoakStatus = async (silent = true) => {
  try {
    const res = await fetch('/api/reliability/soak/status')
    const data = await res.json()
    if (!res.ok || data.success === false) throw new Error(data.error || '读取浸泡测试状态失败')
    soakState.value = data.state || null
    soakReport.value = data.report || null
    soakPreflight.value = data.state?.preflight || soakPreflight.value
  } catch (e) {
    if (!silent) toast.error(e.message || '读取浸泡测试状态失败')
  }
}

const startSoak = async () => {
  soakLoading.value = true
  try {
    const res = await fetch('/api/reliability/soak/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ duration_ms: 24 * 60 * 60 * 1000, interval_ms: 60 * 1000, clean_mode: true, reconcile_debt: true, startup_grace_seconds: 30 }) })
    const data = await res.json()
    if (!res.ok || data.success === false) throw new Error(data.error || '启动浸泡测试失败')
    if (data.blocked) {
      soakPreflight.value = data.preflight || null
      const missing = (data.preflight?.missing_feishu_connections || []).map(item => item.project || item.config).join('、')
      throw new Error(`干净验收前置条件未满足${missing ? `：未在线 ${missing}` : ''}`)
    }
    soakState.value = data.state
    soakPreflight.value = data.state?.preflight || null
    soakReport.value = null
    toast.success(data.already_running ? '生产级 24 小时验收已经在运行' : '生产级无人工重启 24 小时验收已启动')
  } catch (e) { toast.error(e.message || '启动浸泡测试失败') }
  soakLoading.value = false
}

const reconcileSoakDebt = async () => {
  soakLoading.value = true
  try {
    const res = await fetch('/api/reliability/debt/reconcile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: '用户从系统自检页面执行 9.0 稳定性债务清理' }) })
    const data = await res.json()
    if (!res.ok || data.success === false) throw new Error(data.error || '稳定性债务清理未完全通过')
    toast.success(`清理完成：任务 ${data.result?.recovered_tasks?.length || 0}，飞书锁 ${data.result?.removed_feishu_locks?.length || 0}`)
    await loadSoakStatus(true)
  } catch (e) { toast.error(e.message || '稳定性债务清理失败') }
  soakLoading.value = false
}

const stopSoak = async () => {
  const ok = await confirmDialog('确定提前停止本轮浸泡测试并生成部分报告吗？')
  if (!ok) return
  soakLoading.value = true
  try {
    const res = await fetch('/api/reliability/soak/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: '用户从系统自检页面提前停止' }) })
    const data = await res.json()
    if (!res.ok || data.success === false) throw new Error(data.error || '停止浸泡测试失败')
    await loadSoakStatus(false)
    toast.info('浸泡测试已停止，部分报告已生成')
  } catch (e) { toast.error(e.message || '停止浸泡测试失败') }
  soakLoading.value = false
}


const agentCliProbeTargetOptions = computed(() => {
  const groups = orchestratorDiagnostics.value?.groups || []
  return groups.flatMap(group => (group.members || [])
    .filter(member => member.configured && member.workDirExists && member.workDirWritable)
    .map(member => {
      const agentType = member.agentType || member.agent || 'claudecode'
      return {
        key: group.id + '::' + member.project,
        group_id: group.id,
        group_name: group.name || group.id,
        target_member: member.project,
        agent_type: agentType,
        label: (group.name || group.id) + ' / ' + member.project + ' (' + agentType + ')'
      }
    }))
})
  

const selectedAgentCliProbeTarget = computed(() => {
  return agentCliProbeTargetOptions.value.find(item => item.key === agentCliProbeTargetKey.value)
    || agentCliProbeTargetOptions.value[0]
    || null
})

const agentProbeTargets = computed(() => orchestratorDiagnostics.value?.agent_probe_matrix?.targets || [])

const agentProbeMatrixCounts = computed(() => orchestratorDiagnostics.value?.agent_probe_matrix || null)

const ensureAgentCliProbeTarget = () => {
  const options = agentCliProbeTargetOptions.value
  if (options.length === 0) {
    agentCliProbeTargetKey.value = ''
    return
  }
  if (!options.some(item => item.key === agentCliProbeTargetKey.value)) {
    const previousTarget = orchestratorDiagnostics.value?.checks
      ?.find(check => check.id === 'agent-cli-probe')
      ?.detail?.probe?.target
    const previousKey = previousTarget?.group_id && previousTarget?.project
      ? previousTarget.group_id + '::' + previousTarget.project
      : ''
    agentCliProbeTargetKey.value = options.some(item => item.key === previousKey) ? previousKey : options[0].key
  }
}

const loadOrchestratorConfig = async () => {
  try {
    const res = await fetch('/api/orchestrator/config')
    const data = await res.json()
    if (data.config) {
      orchestratorConfig.value = { ...orchestratorConfig.value, ...data.config, apiKey: '' }
    }
  } catch (e) {
    console.error('加载主 Agent 配置失败:', e)
  }
}

const loadOrchestratorDiagnostics = async () => {
  orchestratorDiagnosticsLoading.value = true
  try {
    const res = await fetch('/api/orchestrator/diagnostics')
    const data = await res.json()
    if (data.success) {
      orchestratorDiagnostics.value = data
      ensureAgentCliProbeTarget()
    } else {
      toast.error('自检失败: ' + (data.error || '未知错误'))
    }
  } catch (e) {
    toast.error('读取主 Agent 自检失败')
  }
  orchestratorDiagnosticsLoading.value = false
}

const runDailyDevRehearsal = async () => {
  dailyDevRehearsalLoading.value = true
  try {
    const res = await fetch('/api/orchestrator/daily-dev-rehearsal')
    const data = await res.json()
    if (data.success) {
      dailyDevRehearsal.value = data
      toast.success(data.pass ? '闭环演练通过' : '闭环演练未通过')
    } else {
      toast.error('闭环演练失败: ' + (data.error || '未知错误'))
    }
  } catch (e) {
    toast.error('运行闭环演练失败')
  }
  dailyDevRehearsalLoading.value = false
}

const createDailyDevSmokeTask = async () => {
  const ok = await confirmDialog('真实试运行会创建并入队一个业务开发任务，子 Agent 会实际新增或更新目标项目里的 ccm-daily-dev-smoke.md。确定继续？')
  if (!ok) return
  dailyDevSmokeLoading.value = true
  try {
    const res = await fetch('/api/orchestrator/daily-dev-smoke-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auto_execute: true })
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || data.message || '创建真实试运行任务失败')
    }
    dailyDevSmokeTask.value = data
    await loadDailyDevSmokeStatus(data.task?.id)
    if (data.queued) toast.success('真实试运行任务已入队')
    else toast.warning(data.queue_result?.message || '真实试运行任务已创建，但尚未入队')
  } catch (e) {
    toast.error(e.message || '创建真实试运行任务失败')
  }
  dailyDevSmokeLoading.value = false
}

const loadDailyDevSmokeStatus = async (taskId = '', options = {}) => {
  dailyDevSmokeLoading.value = true

  try {
    const query = taskId ? `?task_id=${encodeURIComponent(taskId)}` : ''
    const res = await fetch(`/api/orchestrator/daily-dev-smoke-status${query}`)
    const data = await res.json()
    if (!res.ok || !data.success) {
      throw new Error(data.error || data.message || '读取真实试运行状态失败')
    }
    dailyDevSmokeStatus.value = data
    if (!options.silent) {
      if (data.pass) toast.success('真实试运行已通过')
      else if (data.status !== 'no_task') toast.info(data.message || '真实试运行尚未通过')
    }
  } catch (e) {
    toast.error(e.message || '读取真实试运行状态失败')
  }
  dailyDevSmokeLoading.value = false
}

const runAgentCliProbe = async () => {
  agentCliProbeLoading.value = true
  try {
    const res = await fetch('/api/orchestrator/agent-cli-probe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectedAgentCliProbeTarget.value ? {
        group_id: selectedAgentCliProbeTarget.value.group_id,
        target_member: selectedAgentCliProbeTarget.value.target_member
      } : {})
    })
    const data = await res.json()
    agentCliProbe.value = data
    agentCliProbeRecovery.value = null
    if (data.success) {
      toast.success('执行通道探针通过')
      try {
        const resumeRes = await fetch('/api/tasks/watchdog/resume', { method: 'POST' })
        const resumeData = await resumeRes.json()
        agentCliProbeRecovery.value = resumeData
        if (resumeData.success) {
          const total = (resumeData.recovered || 0) + (resumeData.runtime_queued || 0) + (resumeData.gap_queued || 0)
          if (total > 0) toast.success(`已自动恢复 ${total} 个任务`)
        }
      } catch {}
      loadOrchestratorDiagnostics()
    } else if (data.blocked) {
      toast.warning(data.message || '执行通道仍不可用')
    } else {
      toast.error(data.error || data.message || '执行通道探针失败')
    }
  } catch (e) {
    toast.error('执行通道探针失败')
  }
  agentCliProbeLoading.value = false
}

const runAgentCliProbeBatch = async () => {
  agentCliProbeBatchLoading.value = true
  try {
    const res = await fetch('/api/orchestrator/agent-cli-probe/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 10 })
    })
    const data = await res.json()
    agentCliProbeBatch.value = data
    if (data.success) {
      toast.success(`批量复检完成：通过 ${data.passed || 0}/${data.total || 0}`)
      try {
        const resumeRes = await fetch('/api/tasks/watchdog/resume', { method: 'POST' })
        const resumeData = await resumeRes.json()
        agentCliProbeRecovery.value = resumeData
      } catch {}
    } else if ((data.total || 0) === 0) {
      toast.info(data.message || '没有需要复检的项目 Agent')
    } else {
      toast.warning(data.message || `批量复检完成：通过 ${data.passed || 0}/${data.total || 0}`)
    }
    loadOrchestratorDiagnostics()
  } catch (e) {
    toast.error('批量复检执行通道失败')
  }
  agentCliProbeBatchLoading.value = false
}

const runAgentRecoveryMonitor = async () => {
  agentRecoveryMonitorLoading.value = true
  try {
    const res = await fetch('/api/orchestrator/agent-recovery-monitor/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    const data = await res.json()
    agentRecoveryMonitorRun.value = data
    if (data.success) {
      const recovered = Number(data.blocked_recovery?.recovered || 0)
      const retried = Number(data.runtime_recovery?.queued || 0)
      const continued = Number(data.blocked_recovery?.gap_queued || 0)
      if (data.skipped) toast.info(data.reason || '当前没有等待恢复的任务')
      else toast.success(`恢复监控已执行：恢复 ${recovered} 个，重试 ${retried} 个，续跑 ${continued} 个`)
    } else {
      toast.warning(data.message || data.probe?.message || data.error || '执行通道仍不可用')
    }
    loadOrchestratorDiagnostics()
  } catch (e) {
    toast.error('运行恢复监控失败')
  }
  agentRecoveryMonitorLoading.value = false
}

const runDailyDevAutopilot = async () => {
  dailyDevAutopilotLoading.value = true
  try {
    const res = await fetch('/api/orchestrator/daily-dev-autopilot/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        limit: 20,
        gap_continue_limit: 5,
        continue_gaps: true,
        import_shared_docs: true,
        auto_execute: true,
        only_executable_groups: true,
        requires_code_changes: true
      })
    })
    const data = await res.json()
    dailyDevAutopilotRun.value = data
    if (!data.success) throw new Error(data.error || '自动开发运行失败')
    if (data.outcome?.blocked) {
      toast.warning(data.outcome.message || '自动开发已创建任务，但执行通道阻塞')
    } else if (data.continued > 0) {
      toast.success(`自动开发已续跑 ${data.continued} 个缺口任务，入队 ${data.gap_queued || 0} 个`)
    } else if (data.dispatched > 0) {
      toast.success(`自动开发已派发 ${data.dispatched} 条需求，入队 ${data.queued || 0} 条`)
    } else if (data.imported > 0) {
      toast.info(`已导入 ${data.imported} 份文档，暂无可派发需求`)
    } else {
      toast.info('本次没有新的可派发需求')
    }
    loadOrchestratorDiagnostics()
  } catch (e) {
    toast.error(e.message || '自动开发运行失败')
  }
  dailyDevAutopilotLoading.value = false
}

const ensureDailyDevCronJobs = async () => {
  dailyDevCronEnsureLoading.value = true
  try {
    const res = await fetch('/api/orchestrator/daily-dev-autopilot/ensure-cron', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schedule: '*/30 * * * *',
        backlog_batch_limit: 3,
        gap_continue_limit: 3,
        import_shared_docs: true,
        continue_gaps: true,
        requires_code_changes: true

      })
    })
    const data = await res.json()
    dailyDevCronEnsureRun.value = data
    if (!res.ok || !data.success) throw new Error(data.error || '启用定时接活失败')
    const changed = Number(data.created || 0) + Number(data.enabled || 0)
    if (changed > 0) toast.success(`已启用 ${changed} 个定时接活任务`)
    else if (data.existing > 0) toast.info('可执行群聊已存在日常开发定时任务')
    else toast.warning('没有可启用的开发群聊，请先配置子 Agent 工作目录')
    loadOrchestratorDiagnostics()
  } catch (e) {
    toast.error(e.message || '启用定时接活失败')
  }
  dailyDevCronEnsureLoading.value = false
}

const applyInferredVerificationCommands = async () => {
  inferredVerificationApplyLoading.value = true
  try {
    const res = await fetch('/api/projects/verification-commands/apply-inferred', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overwrite: false })
    })
    const data = await res.json()
    inferredVerificationApplyRun.value = data
    if (!data.success) throw new Error(data.error || '初始化验证命令失败')
    if ((data.applied || 0) > 0) toast.success(`已初始化 ${data.applied} 个项目的验证命令`)
    else toast.info('暂无可自动初始化的验证命令')
    loadOrchestratorDiagnostics()
  } catch (e) {
    toast.error(e.message || '初始化验证命令失败')
  }
  inferredVerificationApplyLoading.value = false
}

const getDiagnosticStatusText = (status) => {
  if (status === 'ok') return '通过'
  if (status === 'warn') return '建议'
  return '阻塞'
}

const getReadinessText = (readiness) => {
  if (readiness === 'ready') return '可接活'
  if (readiness === 'partial') return '可接活，需完善'
  return '暂不可接活'
}

const getAutopilotModeText = (mode) => {
  if (mode === 'ready_to_continue') return '可续跑'
  if (mode === 'ready_to_dispatch') return '可派发'
  if (mode === 'ready_to_import') return '待导入'
  if (mode === 'waiting_input') return '等业务输入'
  return '阻塞'
}
const getReadinessHeadline = (diagnostics) => {
  if (!diagnostics) return '正在检查自动开发能力'
  if (diagnostics.readiness === 'ready') return '可以让主 Agent 自动接开发任务'
  if (diagnostics.readiness === 'partial') return '主 Agent 基本可用，但还有建议项'
  return '暂时不建议自动接开发任务'
}

const getReadinessDescription = (diagnostics) => {
  if (!diagnostics) return ''
  if (diagnostics.readiness === 'ready') return '模型、群聊、项目 Agent、验证和队列都已通过关键检查。'
  if (diagnostics.readiness === 'partial') return '核心链路可运行，但还有一些配置会影响稳定性。'
  return diagnostics.summary || '还有关键阻塞未处理，先按下面的建议完成检查。'
}

const getAutopilotPlainStatus = (autopilot) => {
  if (!autopilot) return '等待检查'
  if (autopilot.mode === 'ready_to_continue') return '有未完成任务可以继续推进'
  if (autopilot.mode === 'ready_to_dispatch') return '有业务需求可以派发给主 Agent'
  if (autopilot.mode === 'ready_to_import') return '有共享文档可以先导入成业务需求'
  if (autopilot.mode === 'waiting_input') return '系统已准备好，正在等待业务需求'
  return '自动开发入口被阻塞'
}

const getAutopilotPlainReason = (autopilot) => {
  const counts = autopilot?.counts || {}
  if (!autopilot) return ''
  if ((counts.agentProbeExecutable || 0) > 0 && (counts.agentProbeReady || 0) < (counts.agentProbeExecutable || 0)) {
    return '项目 Agent 还没有全部通过真实执行检查；通过后，主 Agent 才能放心把任务交给子 Agent。'
  }
  if ((counts.readyBacklogs || 0) === 0 && (counts.sharedFiles || 0) > 0) {
    return '当前没有 ready 状态的业务需求，但群聊里有共享文档，可以先导入需求池。'
  }
  if ((counts.verificationMissing || 0) > 0) {
    return '部分项目缺少验证命令，完成代码后可能无法自动验收。'
  }
  return autopilot.headline || '自动开发链路已完成检查。'
}

const getAutoDevChecklist = (autopilot) => {
  const counts = autopilot?.counts || {}
  const probeReady = counts.agentProbeReady || 0
  const probeTotal = counts.agentProbeExecutable || 0
  const verificationMissing = counts.verificationMissing || 0
  return [
    { key: 'groups', label: '可接任务的群聊', value: `${counts.executableGroups || 0} 个`, state: (counts.executableGroups || 0) > 0 ? 'ok' : 'warn', hint: '至少要有一个群聊绑定了可执行项目 Agent。' },

    { key: 'demand', label: '待开发需求', value: `${counts.readyBacklogs || 0} 个`, state: (counts.readyBacklogs || 0) > 0 ? 'ok' : ((counts.sharedFiles || 0) > 0 ? 'warn' : 'muted'), hint: 'ready 需求会被主 Agent 认领并派发。' },
    { key: 'docs', label: '可导入文档', value: `${counts.sharedFiles || 0} 个`, state: (counts.sharedFiles || 0) > 0 ? 'ok' : 'muted', hint: '共享文档可以转成业务需求。' },
    { key: 'schedule', label: '定时接活', value: `${counts.dailyDevCronJobs || 0} 个`, state: (counts.dailyDevCronJobs || 0) > 0 ? 'ok' : 'warn', hint: '定时任务会周期性检查需求池并派发。' },
    { key: 'verification', label: '项目验收命令', value: verificationMissing > 0 ? `缺 ${verificationMissing}` : `${counts.verificationConfigured || 0} 个`, state: verificationMissing > 0 ? 'warn' : 'ok', hint: '用于代码完成后的自动验证。' },
    { key: 'probe', label: '子 Agent 可运行', value: `${probeReady}/${probeTotal}`, state: probeTotal > 0 && probeReady === probeTotal ? 'ok' : 'fail', hint: '必须能真实调用项目 Agent，才适合自动开发。' },
  ]
}

const getRunnerDetail = (check) => check?.id === 'agent-process' ? check.detail?.externalRunner : null

const getChildProcessDetail = (check) => check?.id === 'agent-process' ? check.detail?.childProcess : null

const getProbeDetail = (check) => check?.id === 'agent-process' ? check.detail?.probe : null

const getAgentProbeCheckDetail = (check) => check?.id === 'agent-cli-probe' ? check.detail : null

const getRecoveryMonitorDetail = (check) => check?.id === 'agent-recovery-monitor' ? check.detail : null

const getWatchdogDetail = (check) => check?.id === 'task-watchdog' ? check.detail : null

const getProjectVerificationDetail = (check) => check?.id === 'project-verification' ? check.detail : null

const getWorkerProtocolDetail = (check) => check?.id === 'worker-notification-scratchpad' ? check.detail : null

const formatBooleanChecks = (checks = {}) => {
  return Object.entries(checks || {}).map(([key, value]) => ({
    key,
    ok: !!value,
    label: key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
  }))
}

const formatProbeState = (probe) => {
  if (!probe) return '未复检'
  if (probe.success) return '通过'
  if (probe.blocked) return '阻塞'
  return '失败'
}

const getAgentProbeStatusText = (target) => {
  if (target?.ready) return '可接单'
  if (!target?.configured) return '未配置'
  if (!target?.workDirExists) return '目录缺失'
  if (!target?.workDirWritable) return '不可写'
  if (target?.probeHealth?.failureRecent) return '最近失败'
  if (target?.probeHealth?.status === 'missing') return '未复检'
  if (target?.probeHealth?.status === 'stale_ok') return '已过期'
  if (target?.probeHealth?.status === 'stale_failed') return '失败过期'
  return '待复检'
}

const getAgentProbeStatusClass = (target) => {
  if (target?.ready) return 'ok'
  if (!target?.configured || !target?.workDirExists || !target?.workDirWritable) return 'fail'
  return 'warn'
}

const selectProbeTarget = (target) => {
  const key = target?.group_id && target?.project ? target.group_id + '::' + target.project : ''
  if (key) agentCliProbeTargetKey.value = key
}

const formatDuration = (ms) => {
  const value = Number(ms || 0)
  if (!value || value < 0) return '未知'
  if (value < 60 * 1000) return `${Math.max(1, Math.round(value / 1000))} 秒`
  if (value < 60 * 60 * 1000) return `${Math.round(value / 60000)} 分钟`
  return `${Math.round(value / 3600000)} 小时`
}

const formatRunnerAge = (ageMs) => {
  const ms = Number(ageMs || 0)
  if (!ms || ms < 0) return '未知'
  if (ms < 60 * 1000) return `${Math.max(1, Math.round(ms / 1000))} 秒前`
  if (ms < 60 * 60 * 1000) return `${Math.round(ms / 60000)} 分钟前`
  return `${Math.round(ms / 3600000)} 小时前`
}

const formatProbePreview = (value, max = 800) => {
  const text = String(value || '').trim()
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max)}...` : text
}

const formatRunnerState = (runner) => {
  if (!runner) return '未检测'
  if (runner.active) return '在线'
  if (runner.status && runner.status !== 'missing') return `离线 · ${runner.status}`
  return '未启动'
}

const formatRecoveryMonitorState = (detail) => {
  if (!detail) return '未检测'
  if (detail.probe_in_flight) return '探针中'
  return detail.active ? '运行中' : '未启动'
}

const formatVerificationSource = (source) => {
  if (source === 'configured') return '已配置'
  if (source === 'inferred') return '自动推断'
  return '缺失'
}

const getAgentProcessCheck = () => orchestratorDiagnostics.value?.checks?.find(check => check.id === 'agent-process') || null

const showExecutionRecovery = () => getAgentProcessCheck()?.status === 'fail'

const getExecutionRecoveryReason = () => {
  const check = getAgentProcessCheck()
  return check?.detail?.probe?.message || check?.detail?.externalRunner?.last_result?.error || check?.message || '执行通道不可用'
}

onMounted(() => {
  loadOrchestratorDiagnostics()
  loadDailyDevSmokeStatus('', { silent: true })
  loadSoakStatus()
  soakPollTimer = setInterval(() => loadSoakStatus(), 30000)
})

onUnmounted(() => {
  if (soakPollTimer) clearInterval(soakPollTimer)
  soakPollTimer = null
})
</script>

<template>
  <div class="system-diagnostics-page">
    <div class="settings-card aura-card">
      <div class="card-header">
        <div class="header-title-area">
          <span class="icon">🩺</span>
          <div>
            <div class="card-title">系统自检与就绪诊断</div>
            <div class="card-desc">对群聊主协调器、执行通道、外部执行器、子 Agent 连通性以及看门狗执行诊断体检</div>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn btn-outline btn-sm" @click="loadOrchestratorDiagnostics" :disabled="orchestratorDiagnosticsLoading">
            <span class="icon">🔄</span> {{ orchestratorDiagnosticsLoading ? '自检中...' : '刷新状态' }}
          </button>
          <button class="btn btn-outline btn-sm" @click="runAgentCliProbe" :disabled="agentCliProbeLoading">
            <span class="icon">⚡</span> {{ agentCliProbeLoading ? '复检中...' : '复检执行通道' }}
          </button>
          <button class="btn btn-outline btn-sm" @click="runAgentRecoveryMonitor" :disabled="agentRecoveryMonitorLoading">
            <span class="icon">🩹</span> {{ agentRecoveryMonitorLoading ? '恢复中...' : '恢复自动任务' }}
          </button>
          <div class="divider"></div>
          <button class="btn btn-primary btn-sm" @click="runDailyDevRehearsal" :disabled="dailyDevRehearsalLoading">
            <span class="icon">🎭</span> {{ dailyDevRehearsalLoading ? '演练中...' : '闭环演练' }}
          </button>
          <button class="btn btn-outline btn-sm" @click="createDailyDevSmokeTask" :disabled="dailyDevSmokeLoading">
            <span class="icon">🚀</span> {{ dailyDevSmokeLoading ? '创建中...' : '真实试运行' }}
          </button>
          <button class="btn btn-outline btn-sm" @click="loadDailyDevSmokeStatus('', { silent: false })" :disabled="dailyDevSmokeLoading">
            <span class="icon">📡</span> {{ dailyDevSmokeLoading ? '刷新中...' : '试运行状态' }}
          </button>
        </div>
      </div>

      <div class="glass-card soak-card" :class="soakState?.status || 'not-started'">
        <div class="soak-head">
          <div>
            <strong>生产级无人工重启稳定性验收 9.0</strong>
            <span v-if="soakState?.status === 'running'">冻结代码与配置，检查非预期重启、全部机器人、租约/幂等、事件循环和同进程内存趋势</span>
            <span v-else-if="soakReport?.summary">最近结论：{{ soakReport.summary.verdict }}</span>
            <span v-else>尚未启动首轮长期稳定性验证</span>
          </div>
          <b>{{ soakState?.status === 'running' ? '运行中' : soakState?.status === 'completed' ? '已完成' : soakState?.status === 'stopped' ? '已停止' : '未开始' }}</b>
        </div>

        <div v-if="soakState?.status === 'running'" class="soak-progress">
          <div><span>进度 {{ soakProgress }}%</span><span>剩余 {{ formatSoakDuration(soakState.remaining_ms) }}</span></div>
          <div class="soak-progress-track"><i :style="{ width: soakProgress + '%' }"></i></div>
        </div>

        <div v-if="soakState?.latest_sample" class="soak-metrics">
          <div><span>采样</span><strong>{{ soakState.samples_count || 0 }}</strong></div>
          <div><span>Server RSS</span><strong>{{ formatBytesMb(soakState.latest_sample.memory?.rss) }}</strong></div>
          <div><span>连续事件循环峰值</span><strong>{{ soakState.latest_sample.event_loop_delay_window_ms?.max || soakState.latest_sample.event_loop_lag_ms || 0 }} ms</strong></div>
          <div><span>Runner</span><strong>{{ soakState.latest_sample.runner?.healthy ? '正常' : '异常' }}</strong></div>
          <div><span>全部预期飞书</span><strong>{{ soakState.latest_sample.feishu?.active_connections || 0 }}/{{ soakState.latest_sample.feishu?.expected_connections || 0 }}</strong></div>
          <div><span>独立告警</span><strong>{{ (soakState.incidents || []).filter(item => item.severity !== 'info').length }}</strong></div>
        </div>

        <div v-if="soakReport?.summary" class="soak-report-summary">
          <span>Runner 可用率 {{ soakReport.summary.availability?.runner_percent || 0 }}%</span>
          <span>飞书可用率 {{ soakReport.summary.availability?.feishu_percent || 0 }}%</span>
          <span>重启 {{ soakReport.summary.restarts_observed || 0 }} 次</span>
          <span>非预期 {{ soakReport.summary.restart_classification?.unexpected_restarts || 0 }} 次</span>
          <span>连续 {{ soakReport.summary.single_process?.max_contiguous_hours || 0 }} 小时</span>
          <span>RSS 峰值 {{ formatBytesMb(soakReport.summary.memory?.rss?.max) }}</span>
          <span>运行期延迟峰值 {{ soakReport.summary.event_loop_lag_ms?.runtime_max || 0 }} ms</span>
        </div>

        <div v-if="soakState?.alerts?.length" class="soak-alerts">
          <div v-for="alert in soakState.alerts.slice(-4)" :key="alert.code" :class="alert.severity">
            <strong>{{ alert.code }}</strong><span>{{ alert.message }} · 独立事故 {{ alert.count || 1 }} 次 / 采样 {{ alert.observations || alert.count || 1 }} 次</span>
          </div>
        </div>

        <div v-if="soakPreflight && soakPreflight.ready === false" class="soak-alerts">
          <div class="critical"><strong>preflight_blocked</strong><span>Runner {{ soakPreflight.runner_healthy ? '正常' : '异常' }}；飞书 {{ soakPreflight.feishu_healthy ? '正常' : '未全部在线' }}；历史债务 {{ Object.values(soakPreflight.debt?.counts || {}).reduce((sum, value) => sum + Number(value || 0), 0) }} 项</span></div>
        </div>

        <div class="soak-actions">
          <button v-if="soakState?.status !== 'running'" class="btn btn-primary btn-sm" :disabled="soakLoading" @click="startSoak">{{ soakLoading ? '启动中...' : '启动干净 24 小时验收' }}</button>
          <button v-else class="btn btn-outline btn-sm" :disabled="soakLoading" @click="stopSoak">提前停止并生成报告</button>
          <button v-if="soakState?.status !== 'running'" class="btn btn-outline btn-sm" :disabled="soakLoading" @click="reconcileSoakDebt">清理稳定性债务</button>
          <button class="btn btn-outline btn-sm" :disabled="soakLoading" @click="loadSoakStatus(false)">刷新</button>
        </div>
      </div>
      
      <div v-if="orchestratorDiagnostics" class="diagnostics-dashboard">
        <!-- 核心区 -->
        <div class="dashboard-core">
          <div class="glass-card hero-card" :class="orchestratorDiagnostics.readiness">
            <div class="auto-dev-hero">
              <div class="auto-dev-main">
                <div class="auto-dev-eyebrow">自动开发就绪状态</div>
                <h3>{{ getReadinessHeadline(orchestratorDiagnostics) }}</h3>
                <p>{{ getReadinessDescription(orchestratorDiagnostics) }}</p>
              </div>
              <div class="auto-dev-status" :class="orchestratorDiagnostics.readiness">
                {{ getReadinessText(orchestratorDiagnostics.readiness) }}
              </div>
            </div>
          </div>

          <div v-if="orchestratorDiagnostics.autopilot" class="glass-card summary-card" :class="orchestratorDiagnostics.autopilot.mode">
            <div class="auto-dev-summary">
              <div class="auto-dev-summary-copy">
                <strong>{{ getAutopilotPlainStatus(orchestratorDiagnostics.autopilot) }}</strong>
                <span>{{ getAutopilotPlainReason(orchestratorDiagnostics.autopilot) }}</span>
              </div>
              <b>{{ getAutopilotModeText(orchestratorDiagnostics.autopilot.mode) }}</b>
            </div>
            
            <div class="auto-dev-checklist mt-3">
              <div v-for="item in getAutoDevChecklist(orchestratorDiagnostics.autopilot)" :key="item.key" class="auto-dev-check" :class="item.state">
                <div>
                  <strong>{{ item.label }}</strong>
                  <span>{{ item.hint }}</span>
                </div>
                <b>{{ item.value }}</b>
              </div>
            </div>

            <div v-if="orchestratorDiagnostics.autopilot?.next_actions?.length" class="auto-dev-next-actions mt-3">
              <strong>建议下一步</strong>
              <ul>
                <li v-for="action in orchestratorDiagnostics.autopilot.next_actions" :key="action">{{ action }}</li>
              </ul>
            </div>

            <div class="auto-dev-controls mt-3">
              <button class="btn btn-primary btn-sm" :disabled="dailyDevAutopilotLoading" @click="runDailyDevAutopilot">
                {{ dailyDevAutopilotLoading ? '运行中...' : '试运行一次自动开发' }}
              </button>
              <button class="btn btn-outline btn-sm" :disabled="dailyDevCronEnsureLoading" @click="ensureDailyDevCronJobs">
                {{ dailyDevCronEnsureLoading ? '启用中...' : '开启定时接活' }}
              </button>
              <button class="btn btn-outline btn-sm" :disabled="inferredVerificationApplyLoading || !(orchestratorDiagnostics.autopilot.counts?.verificationInferred > 0)" @click="applyInferredVerificationCommands">
                {{ inferredVerificationApplyLoading ? '初始化中...' : '补齐验证命令' }}
              </button>
            </div>

            <div v-if="dailyDevAutopilotRun || inferredVerificationApplyRun || dailyDevCronEnsureRun" class="auto-dev-run-results mt-3">
              <div v-if="dailyDevAutopilotRun" class="autopilot-run-result">
                <span>续跑 {{ dailyDevAutopilotRun.continued || 0 }}</span>
                <span>导入 {{ dailyDevAutopilotRun.imported || 0 }}</span>
                <span>派发 {{ dailyDevAutopilotRun.dispatched || 0 }}</span>
                <span>入队 {{ dailyDevAutopilotRun.queued || 0 }}</span>
                <span>失败 {{ dailyDevAutopilotRun.failed || 0 }}</span>
                <span>执行准入 {{ dailyDevAutopilotRun.can_auto_execute_daily_dev ? '通过' : '等待' }}</span>
              </div>
              <div v-if="inferredVerificationApplyRun" class="autopilot-run-result">
                <span>验证命令已补齐 {{ inferredVerificationApplyRun.applied || 0 }}</span>
                <span>已有配置 {{ inferredVerificationApplyRun.skipped_configured || 0 }}</span>
                <span>无法推断 {{ inferredVerificationApplyRun.missing_inferred || 0 }}</span>
              </div>
              <div v-if="dailyDevCronEnsureRun" class="autopilot-run-result">
                <span>新建定时 {{ dailyDevCronEnsureRun.created || 0 }}</span>
                <span>重新启用 {{ dailyDevCronEnsureRun.enabled || 0 }}</span>
                <span>已存在 {{ dailyDevCronEnsureRun.existing || 0 }}</span>
                <span>跳过群聊 {{ dailyDevCronEnsureRun.skipped || 0 }}</span>
              </div>
            </div>

            <div v-if="dailyDevAutopilotRun?.outcome" class="autopilot-outcome mt-3" :class="{ blocked: dailyDevAutopilotRun.outcome.blocked }">
              <strong>{{ dailyDevAutopilotRun.outcome.message }}</strong>
              <p v-if="dailyDevAutopilotRun.execution_readiness?.message" class="autopilot-readiness-message">
                {{ dailyDevAutopilotRun.execution_readiness.message }}
              </p>
              <ul v-if="dailyDevAutopilotRun.outcome.next_actions?.length">
                <li v-for="action in dailyDevAutopilotRun.outcome.next_actions" :key="action">{{ action }}</li>
              </ul>
            </div>

            <div v-if="orchestratorDiagnostics.autopilot?.recent_cron?.length" class="autopilot-cron mt-3">
              <span v-for="job in orchestratorDiagnostics.autopilot.recent_cron" :key="job.id">
                {{ job.name }}：{{ job.last_result || job.last_status }}
              </span>
            </div>
          </div>
        </div>

        <!-- 矩阵与测试区 -->
        <div class="dashboard-matrix">
          <div v-if="showExecutionRecovery()" class="glass-card execution-recovery mb-3">
            <div class="execution-recovery-head">
              <strong>执行通道恢复步骤</strong>
              <span>{{ getExecutionRecoveryReason() }}</span>
            </div>
            <ol>
              <li>在项目目录启动外部执行器：<code>npm run agent-runner:ps</code></li>
              <li>在同一台机器确认 Claude CLI 可用：<code>claude -p</code></li>
              <li>点击顶部“复检执行通道”。探针通过后会自动触发看门狗恢复任务。</li>
            </ol>
          </div>

          <div v-if="agentProbeTargets.length" class="glass-card agent-probe-matrix">
            <div class="agent-probe-matrix-head">
              <div>
                <strong>子 Agent 运行检查</strong>
                <span>检查项目 Agent 真实调用情况。通过 {{ agentProbeMatrixCounts?.ready || 0 }}/{{ agentProbeMatrixCounts?.executable || 0 }} · 未检查 {{ agentProbeMatrixCounts?.missing || 0 }}</span>
              </div>
              <div class="agent-probe-actions">
                <button class="btn btn-outline btn-sm" @click="runAgentCliProbeBatch" :disabled="agentCliProbeBatchLoading || agentCliProbeLoading || !(agentProbeMatrixCounts?.executable > 0)">
                  {{ agentCliProbeBatchLoading ? '批量检查中...' : '检查全部子 Agent' }}
                </button>
              </div>
            </div>
            
            <div v-if="agentCliProbeBatch" class="agent-probe-batch-result mt-2">
              <span>批量复检 {{ agentCliProbeBatch.passed || 0 }}/{{ agentCliProbeBatch.total || 0 }}</span>
              <span>失败 {{ agentCliProbeBatch.failed || 0 }}</span>
              <span>跳过 {{ agentCliProbeBatch.skipped || 0 }}</span>
            </div>

            <div class="agent-probe-grid mt-3">
              <button v-for="target in agentProbeTargets" :key="target.key || (target.group_id + target.project)" 
                      class="agent-probe-row" 
                      :class="[getAgentProbeStatusClass(target), { active: agentCliProbeTargetKey === (target.group_id + '::' + target.project) }]" 
                      @click="selectProbeTarget(target)">
                <span class="agent-probe-state">{{ getAgentProbeStatusText(target) }}</span>
                <span class="agent-probe-main">{{ target.group_name }} / {{ target.project }}</span>
                <span class="agent-probe-sub">{{ target.agent_type }} · {{ target.command || '未记录命令' }}</span>
                <span class="agent-probe-time">{{ formatRunnerAge(target.age_ms) }}</span>
              </button>
            </div>
          </div>

          <!-- 运行结果反馈区 -->
          <div class="run-results-area mt-3" v-if="agentCliProbe || agentRecoveryMonitorRun || dailyDevRehearsal || dailyDevSmokeTask || dailyDevSmokeStatus">
            <div v-if="agentCliProbe" class="glass-card probe-box mb-2" :class="agentCliProbe.success ? 'ok' : 'fail'">
              <div class="rehearsal-head">
                <strong>{{ agentCliProbe.success ? '执行通道探针通过' : (agentCliProbe.blocked ? '执行通道仍阻塞' : '执行通道探针失败') }}</strong>
                <span>{{ agentCliProbe.target?.project || agentCliProbe.readiness?.mode || '未执行' }}</span>
              </div>
              <div class="probe-message mt-2">{{ agentCliProbe.message || agentCliProbe.error }}</div>
              <div v-if="agentCliProbe.target" class="smoke-task-meta mt-2">
                <span>群聊：{{ agentCliProbe.target.group_name }}</span>
                <span>子 Agent：{{ agentCliProbe.target.project }}</span>
                <span>命令类型：{{ agentCliProbe.target.agent_type }}</span>
                <span>耗时：{{ agentCliProbe.duration_ms || 0 }}ms</span>
              </div>
              <div v-if="agentCliProbeRecovery" class="smoke-task-meta mt-2">
                <span>卡住恢复：{{ agentCliProbeRecovery.recovered || 0 }}/{{ agentCliProbeRecovery.total_recoverable || 0 }}</span>
                <span>失败恢复：{{ agentCliProbeRecovery.runtime_queued || 0 }}</span>
              </div>
              <pre v-if="formatProbePreview(agentCliProbe.output_preview || agentCliProbe.output)" class="probe-output mt-2">{{ formatProbePreview(agentCliProbe.output_preview || agentCliProbe.output) }}</pre>
            </div>

            <div v-if="agentRecoveryMonitorRun" class="glass-card probe-box mb-2" :class="agentRecoveryMonitorRun.success ? 'ok' : 'fail'">
              <div class="rehearsal-head">
                <strong>{{ agentRecoveryMonitorRun.success ? '恢复监控已执行' : '恢复监控未通过' }}</strong>
                <span>{{ agentRecoveryMonitorRun.skipped ? '无需恢复' : (agentRecoveryMonitorRun.probe?.target?.project || agentRecoveryMonitorRun.probe?.readiness?.mode || '后台探针') }}</span>
              </div>
              <div class="probe-message mt-2">{{ agentRecoveryMonitorRun.reason || agentRecoveryMonitorRun.message || agentRecoveryMonitorRun.probe?.message || agentRecoveryMonitorRun.error }}</div>
              <div class="smoke-task-meta mt-2">
                <span>等待通道：{{ agentRecoveryMonitorRun.work?.blocked_pending?.length || 0 }}</span>
                <span>已恢复：{{ agentRecoveryMonitorRun.blocked_recovery?.recovered || 0 }}</span>
              </div>
            </div>

            <div v-if="dailyDevRehearsal" class="glass-card rehearsal-box mb-2" :class="dailyDevRehearsal.pass ? 'ok' : 'fail'">
              <div class="rehearsal-head">
                <strong>{{ dailyDevRehearsal.pass ? '闭环演练通过' : '闭环演练未通过' }}</strong>
                <span>{{ dailyDevRehearsal.group?.name || '未选择群聊' }}</span>
              </div>
              <div class="rehearsal-steps mt-2">
                <span v-for="step in dailyDevRehearsal.steps" :key="step.id" :class="step.status">
                  {{ step.status === 'ok' ? '通过' : '失败' }} · {{ step.message }}
                </span>
              </div>
            </div>

            <div v-if="dailyDevSmokeStatus || dailyDevSmokeTask" class="glass-card rehearsal-box mb-2" :class="(dailyDevSmokeStatus?.pass || dailyDevSmokeTask) ? 'ok' : 'fail'">
              <div class="rehearsal-head">
                <strong>{{ dailyDevSmokeStatus?.pass ? '真实试运行已通过' : (dailyDevSmokeStatus ? '真实试运行未通过' : '真实试运行任务已创建') }}</strong>
                <span>{{ dailyDevSmokeStatus?.status || (dailyDevSmokeTask?.queued ? '已入队' : '未入队') }}</span>
              </div>
              <div class="probe-message mt-2">{{ dailyDevSmokeStatus?.message }}</div>
              <div class="smoke-task-meta mt-2">
                <span>任务ID：{{ dailyDevSmokeStatus?.task?.id || dailyDevSmokeTask?.task?.id }}</span>
                <span>状态：{{ dailyDevSmokeStatus?.task?.status || '已入队' }}</span>
              </div>
              <div v-if="dailyDevSmokeStatus?.evidence" class="rehearsal-steps mt-2">
                <span :class="dailyDevSmokeStatus.evidence.task_done ? 'ok' : 'fail'">{{ dailyDevSmokeStatus.evidence.task_done ? '通过' : '缺失' }} · 任务完成</span>
                <span :class="dailyDevSmokeStatus.evidence.file_exists ? 'ok' : 'fail'">{{ dailyDevSmokeStatus.evidence.file_exists ? '通过' : '缺失' }} · smoke 文件</span>
                <span :class="dailyDevSmokeStatus.evidence.has_done_receipt ? 'ok' : 'fail'">{{ dailyDevSmokeStatus.evidence.has_done_receipt ? '通过' : '缺失' }} · 子 Agent 回执</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 高级诊断明细折叠区 -->
      <div v-if="orchestratorDiagnostics" class="advanced-diagnostics-section mt-4">
        <button class="btn-toggle-advanced" @click="showAdvanced = !showAdvanced">
          <span>高级诊断明细 (Advanced Log Details)</span>
          <span class="icon">{{ showAdvanced ? '▲' : '▼' }}</span>
        </button>
        
        <div v-show="showAdvanced" class="diagnostics-list mt-3">
          <div v-for="check in orchestratorDiagnostics.checks" :key="check.id" class="diagnostic-item" :class="check.status">
            <span class="diagnostic-state">{{ getDiagnosticStatusText(check.status) }}</span>
            <div class="diagnostic-copy">
              <div class="diagnostic-label">{{ check.label }}</div>
              <div class="diagnostic-message">{{ check.message }}</div>
              
              <!-- Runner Detail -->
              <div v-if="getRunnerDetail(check)" class="runner-detail">
                <div class="runner-grid">
                  <span>Runner：{{ formatRunnerState(getRunnerDetail(check)) }}</span>
                  <span>请求：{{ getRunnerDetail(check).requests || 0 }}</span>
                  <span>最近：{{ formatRunnerAge(getRunnerDetail(check).last_result?.age_ms || getRunnerDetail(check).age_ms) }}</span>
                  <span>探针：{{ formatProbeState(getProbeDetail(check)) }}</span>
                </div>
                <div v-if="getProbeDetail(check)?.message" class="runner-probe" :class="getProbeDetail(check).success ? 'ok' : 'fail'">
                  {{ getProbeDetail(check).message }}
                </div>
                <div v-if="getRunnerDetail(check).last_result?.error" class="runner-error">
                  {{ getRunnerDetail(check).last_result.error }}
                </div>
                <div v-if="getChildProcessDetail(check)?.error" class="runner-node-error">
                  Node 子进程：{{ getChildProcessDetail(check).error }}
                </div>
              </div>

              <!-- Agent Probe Detail -->
              <div v-if="getAgentProbeCheckDetail(check)" class="recovery-monitor-detail">
                <div class="runner-grid">
                  <span>状态：{{ formatProbeState(getAgentProbeCheckDetail(check).probe) }}</span>
                  <span>健康：{{ getAgentProbeCheckDetail(check).probeHealth?.status || 'missing' }}</span>
                  <span>目标：{{ getAgentProbeCheckDetail(check).probe?.target?.project || '未选择' }}</span>
                </div>
                <div v-if="getAgentProbeCheckDetail(check).probe?.message" class="runner-probe" :class="getAgentProbeCheckDetail(check).probe?.success ? 'ok' : 'fail'">
                  {{ getAgentProbeCheckDetail(check).probe.message }}
                </div>
                <pre v-if="formatProbePreview(getAgentProbeCheckDetail(check).probe?.output_preview)" class="probe-output">{{ formatProbePreview(getAgentProbeCheckDetail(check).probe?.output_preview) }}</pre>
              </div>

              <!-- Recovery Monitor Detail -->
              <div v-if="getRecoveryMonitorDetail(check)" class="recovery-monitor-detail">
                <div class="runner-grid">
                  <span>监控：{{ formatRecoveryMonitorState(getRecoveryMonitorDetail(check)) }}</span>
                  <span>等待通道：{{ getRecoveryMonitorDetail(check).work?.blocked_pending?.length || 0 }}</span>
                </div>
              </div>

              <!-- Watchdog Detail -->
              <div v-if="getWatchdogDetail(check)" class="recovery-monitor-detail">
                <div class="runner-grid">
                  <span>待恢复：{{ getWatchdogDetail(check).stale_pending?.length || 0 }}</span>
                  <span>执行失败：{{ getWatchdogDetail(check).runtime_failed?.length || 0 }}</span>
                </div>
              </div>

              <!-- Project Verification Detail -->
              <div v-if="getProjectVerificationDetail(check)" class="verification-detail">
                <div class="runner-grid">
                  <span>已配置：{{ getProjectVerificationDetail(check).configured || 0 }}</span>
                  <span>缺失：{{ getProjectVerificationDetail(check).missing || 0 }}</span>
                </div>
                <div v-if="getProjectVerificationDetail(check).members?.length" class="verification-members">
                  <div v-for="member in getProjectVerificationDetail(check).members" :key="member.project" class="verification-member" :class="member.source">
                    <strong>{{ member.project || '未命名项目' }}</strong>
                    <span>{{ formatVerificationSource(member.source) }}</span>
                    <code>{{ member.commands?.length ? member.commands.join('；') : '未配置验证命令' }}</code>
                  </div>
                </div>
              </div>

              <!-- Worker Protocol Detail -->
              <div v-if="getWorkerProtocolDetail(check)" class="worker-protocol-detail">
                <div class="worker-protocol-grid">
                  <span v-for="item in formatBooleanChecks(getWorkerProtocolDetail(check).taskNotificationChecks)" :key="'notify-' + item.key" :class="item.ok ? 'ok' : 'fail'">
                    {{ item.ok ? '通过' : '失败' }} · {{ item.label }}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<style scoped>
.system-diagnostics-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  height: 100%;
  overflow-y: auto;
}

/* Glassmorphism Card Utilities */
.aura-card {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
  padding: 24px;
}
.glass-card {
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.02);
  padding: 16px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.glass-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.05);
}

/* Margin Utilities */
.mt-2 { margin-top: 8px; }
.mt-3 { margin-top: 16px; }
.mt-4 { margin-top: 24px; }
.mb-2 { margin-bottom: 8px; }
.mb-3 { margin-bottom: 16px; }

/* Header Layout */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  margin-bottom: 24px;
}
.header-title-area {
  display: flex;
  align-items: center;
  gap: 14px;
}
.header-title-area .icon { font-size: 28px; }
.card-title { font-size: 18px; font-weight: 800; color: var(--text-primary); }
.card-desc { font-size: 12.5px; color: var(--text-secondary); margin-top: 4px; }

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.header-actions .divider {
  width: 1px;
  height: 24px;
  background: rgba(15, 23, 42, 0.1);
  margin: 0 4px;
}

/* Dashboard Grid System */
.diagnostics-dashboard {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
.dashboard-core, .dashboard-matrix {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

@media (max-width: 1024px) {
  .diagnostics-dashboard {
    grid-template-columns: 1fr;
  }
}

/* AutoDev Hero (Core) */
.hero-card {
  position: relative;
  overflow: hidden;
}
.hero-card.ready { border-left: 4px solid var(--accent-green); background: rgba(34,197,94,0.05); }
.hero-card.partial { border-left: 4px solid var(--accent-yellow); background: rgba(234,179,8,0.05); }
.hero-card.blocked { border-left: 4px solid var(--accent-red); background: rgba(239,68,68,0.05); }

.auto-dev-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.auto-dev-main { display: flex; flex-direction: column; gap: 6px; }
.auto-dev-eyebrow { color: var(--accent-blue); font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
.auto-dev-main h3 { margin: 0; color: var(--text-primary); font-size: 20px; line-height: 1.3; }
.auto-dev-main p { margin: 0; color: var(--text-secondary); font-size: 13px; line-height: 1.6; }

.auto-dev-status { padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 900; background: rgba(15,23,42,0.08); color: var(--text-primary); }
.auto-dev-status.ready { background: rgba(34,197,94,0.12); color: var(--accent-green); }
.auto-dev-status.partial { background: rgba(234,179,8,0.16); color: #854d0e; }
.auto-dev-status.blocked { background: rgba(239,68,68,0.12); color: #b91c1c; }

/* Summary Card */
.summary-card {
  display: flex;
  flex-direction: column;
}
.soak-card { margin-top: 16px; padding: 16px; }
.soak-card.running { border-color: rgba(59, 130, 246, 0.28); }
.soak-card.completed { border-color: rgba(34, 197, 94, 0.28); }
.soak-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.soak-head > div { display: flex; flex-direction: column; gap: 4px; }
.soak-head strong { color: var(--text-primary); font-size: 14px; }
.soak-head span { color: var(--text-secondary); font-size: 12px; line-height: 1.5; }
.soak-head b { padding: 4px 10px; border-radius: 6px; background: rgba(100, 116, 139, 0.12); color: var(--text-secondary); font-size: 11px; white-space: nowrap; }
.soak-card.running .soak-head b { color: #1d4ed8; background: rgba(59, 130, 246, 0.12); }
.soak-card.completed .soak-head b { color: #15803d; background: rgba(34, 197, 94, 0.12); }
.soak-progress { margin-top: 14px; display: flex; flex-direction: column; gap: 7px; }
.soak-progress > div:first-child { display: flex; justify-content: space-between; gap: 12px; color: var(--text-secondary); font-size: 11px; }
.soak-progress-track { height: 7px; overflow: hidden; border-radius: 999px; background: rgba(100, 116, 139, 0.14); }
.soak-progress-track i { display: block; height: 100%; border-radius: inherit; background: var(--accent-blue); transition: width 0.25s ease; }
.soak-metrics { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; margin-top: 14px; }
.soak-metrics > div { display: flex; flex-direction: column; gap: 4px; padding: 9px 10px; border-radius: 8px; background: rgba(15, 23, 42, 0.045); }
.soak-metrics span { color: var(--text-muted); font-size: 10.5px; }
.soak-metrics strong { color: var(--text-primary); font-size: 12px; overflow-wrap: anywhere; }
.soak-report-summary { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.soak-report-summary span { padding: 5px 8px; border-radius: 6px; background: rgba(15, 23, 42, 0.05); color: var(--text-secondary); font-size: 11px; }
.soak-alerts { display: grid; gap: 6px; margin-top: 12px; }
.soak-alerts > div { display: flex; align-items: center; gap: 8px; padding: 7px 9px; border-radius: 7px; background: rgba(245, 158, 11, 0.08); color: var(--text-secondary); font-size: 11px; }
.soak-alerts > div.critical { background: rgba(239, 68, 68, 0.09); }
.soak-alerts strong { color: var(--text-primary); }
.soak-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
@media (max-width: 900px) { .soak-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 560px) { .soak-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } .soak-head { flex-direction: column; } }
.auto-dev-summary { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(15,23,42,0.06); }
.auto-dev-summary-copy strong { display: block; color: var(--text-primary); font-size: 14px; margin-bottom: 4px; }
.auto-dev-summary-copy span { color: var(--text-secondary); font-size: 12px; }
.auto-dev-summary b { padding: 4px 10px; border-radius: 6px; background: rgba(15,23,42,0.08); color: var(--text-primary); font-size: 11.5px; }

/* Checklist Grid */
.auto-dev-checklist { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.auto-dev-check { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 12px; border-radius: 8px; border: 1px solid rgba(15,23,42,0.06); background: rgba(255,255,255,0.4); }
.auto-dev-check div { display: flex; flex-direction: column; gap: 3px; }
.auto-dev-check strong { color: var(--text-primary); font-size: 12px; font-weight: 700; }
.auto-dev-check span { color: var(--text-muted); font-size: 10.5px; line-height: 1.4; }
.auto-dev-check b { font-size: 13px; font-weight: 800; }
.auto-dev-check.ok b { color: var(--accent-green); }
.auto-dev-check.warn b { color: #854d0e; }
.auto-dev-check.fail b { color: #b91c1c; }

/* Next Actions & Controls */
.auto-dev-next-actions { padding: 12px; border-radius: 8px; background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.15); }
.auto-dev-next-actions strong { color: var(--accent-blue); font-size: 12px; display: block; margin-bottom: 6px; }
.auto-dev-next-actions ul { margin: 0; padding-left: 20px; color: var(--text-primary); font-size: 12px; line-height: 1.6; }
.auto-dev-controls { display: flex; flex-wrap: wrap; gap: 8px; }

.autopilot-run-result { display: flex; flex-wrap: wrap; gap: 8px; }
.autopilot-run-result span { padding: 4px 8px; border-radius: 6px; background: rgba(34,197,94,0.1); color: var(--accent-green); font-size: 11px; font-weight: 800; }
.autopilot-outcome { padding: 12px; border-radius: 8px; background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.15); }
.autopilot-outcome.blocked { background: rgba(234,179,8,0.1); border-color: rgba(234,179,8,0.25); }
.autopilot-outcome strong { display: block; color: var(--text-primary); font-size: 13px; margin-bottom: 6px; }
.autopilot-readiness-message { color: var(--text-secondary); font-size: 12px; line-height: 1.5; margin: 0 0 6px; }

/* Matrix Section */
.agent-probe-matrix-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.agent-probe-matrix-head div { display: flex; flex-direction: column; gap: 4px; }
.agent-probe-matrix-head strong { font-size: 14px; color: var(--text-primary); }
.agent-probe-matrix-head span { font-size: 12px; color: var(--text-secondary); }

.agent-probe-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
.agent-probe-row {
  display: grid;
  grid-template-columns: 60px 1fr auto;
  grid-template-areas: "state main time" "state sub sub";
  align-items: center;
  gap: 4px 10px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255,255,255,0.4);
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}
.agent-probe-row:hover { background: rgba(255,255,255,0.8); }
.agent-probe-row.active { border-color: var(--accent-blue); box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }
.agent-probe-state { grid-area: state; padding: 4px 6px; border-radius: 6px; background: #64748b; color: #fff; font-size: 10px; font-weight: 800; text-align: center; }
.agent-probe-row.ok .agent-probe-state { background: var(--accent-green); }
.agent-probe-row.warn .agent-probe-state { background: var(--accent-yellow); color: #422006; }
.agent-probe-row.fail .agent-probe-state { background: var(--accent-red); }
.agent-probe-main { grid-area: main; color: var(--text-primary); font-size: 12.5px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agent-probe-sub { grid-area: sub; color: var(--text-muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agent-probe-time { grid-area: time; color: var(--text-muted); font-size: 10px; }

/* Advanced Details Section */
.btn-toggle-advanced {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 16px 20px;
  background: rgba(15, 23, 42, 0.04);
  border: 1px dashed rgba(15, 23, 42, 0.15);
  border-radius: 12px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-toggle-advanced:hover { background: rgba(15, 23, 42, 0.08); }

.diagnostics-list { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.diagnostic-item { display: flex; gap: 12px; padding: 14px; border-radius: 10px; border: 1px solid rgba(15, 23, 42, 0.08); background: rgba(255,255,255,0.4); }
.diagnostic-state { flex: 0 0 auto; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 800; color: #fff; background: #64748b; height: fit-content; }
.diagnostic-item.ok .diagnostic-state { background: var(--accent-green); }
.diagnostic-item.warn .diagnostic-state { background: var(--accent-yellow); color: #422006; }
.diagnostic-item.fail .diagnostic-state { background: var(--accent-red); }
.diagnostic-copy { display: flex; flex-direction: column; gap: 4px; width: 100%; }
.diagnostic-label { font-size: 13px; font-weight: 800; color: var(--text-primary); }
.diagnostic-message { font-size: 11.5px; line-height: 1.5; color: var(--text-secondary); }

/* Run Results */
.probe-box, .rehearsal-box { border-left: 4px solid #64748b; }
.probe-box.ok, .rehearsal-box.ok { border-left-color: var(--accent-green); }
.probe-box.fail, .rehearsal-box.fail { border-left-color: var(--accent-red); }
.rehearsal-head { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }
.rehearsal-head strong { color: var(--text-primary); }
.rehearsal-head span { color: var(--text-muted); font-size: 11px; }

/* Deep Dark Mode Adaptation */
[data-theme="dark"] .aura-card {
  background: rgba(15, 23, 42, 0.6);
  border-color: rgba(255, 255, 255, 0.08);
}
[data-theme="dark"] .glass-card {
  background: rgba(30, 41, 59, 0.6);
  border-color: rgba(255, 255, 255, 0.05);
}
[data-theme="dark"] .glass-card:hover {
  background: rgba(30, 41, 59, 0.8);
}
[data-theme="dark"] .auto-dev-check, 
[data-theme="dark"] .agent-probe-row,
[data-theme="dark"] .diagnostic-item {
  background: rgba(15, 23, 42, 0.5);
  border-color: rgba(255, 255, 255, 0.05);
}
[data-theme="dark"] .btn-toggle-advanced {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}
[data-theme="dark"] .btn-toggle-advanced:hover {
  background: rgba(255, 255, 255, 0.1);
}
[data-theme="dark"] .header-actions .divider {
  background: rgba(255, 255, 255, 0.1);
}
</style>

