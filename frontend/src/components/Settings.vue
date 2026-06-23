<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { projectsApi } from '../api/index.js'
import { toast, confirmDialog } from '../utils/toast.js'

// 激活的分栏面板
const activeSection = ref('feishu')

// 飞书配置
const config = ref({
  notification_channel: 'webhook',
  webhook_url: '',
  sign_key: '',
  enabled: false,
  webhook_ready: false,
  notification_ready: false,
  control_bot_enabled: false,
  control_bot_app_id: '',
  control_bot_app_secret: '',
  control_bot_ready: false
})

const openControlBotQr = () => {
  showQr.value = true
  qrUrl.value = ''
  qrImage.value = ''
  qrStatus.value = ''
  qrLoading.value = false
}

const startControlBotQrSetup = async () => {
  qrLoading.value = true
  qrStatus.value = '正在生成扫码链接...'
  qrUrl.value = ''
  qrImage.value = ''
  try {
    const res = await fetch('/api/feishu/control-bot/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'ccm-control-bot' })
    })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || '生成扫码链接失败')

    qrUrl.value = data.scan_url || ''
    qrImage.value = data.qr_image || ''
    qrStatus.value = data.scan_url || data.qr_image ? '请用飞书 App 扫码完成授权' : '扫码流程已启动，请根据命令输出完成授权'

    let checks = 0
    const poll = setInterval(async () => {
      checks += 1
      if (checks > 100) {
        clearInterval(poll)
        qrStatus.value = '❌ 扫码超时，请重试'
        qrLoading.value = false
        return
      }
      try {
        const configRes = await fetch('/api/feishu/config')
        const configData = await configRes.json()
        if (configData.config?.control_bot_app_id) {
          clearInterval(poll)
          config.value = configData.config
          await loadControlBotConnectionStatus()
          qrStatus.value = controlBotConnection.value.running ? '✅ 控制机器人应用凭证已配置，长连接已启动' : '✅ 控制机器人应用凭证已自动填入，请点击启动长连接'
          qrLoading.value = false
          toast.success(controlBotConnection.value.running ? '控制机器人长连接已启动' : '控制机器人应用凭证已配置')
        }
      } catch {}
    }, 3000)
  } catch (e) {
    qrStatus.value = '❌ ' + (e?.message || '生成扫码链接失败')
    qrLoading.value = false
  }
}

const loadControlBotConnectionStatus = async () => {
  try {
    const res = await fetch('/api/feishu/control-bot/status')
    const data = await res.json()
    controlBotConnection.value = data || { running: false, pid: null }
  } catch {
    controlBotConnection.value = { running: false, pid: null }
  }
}

const startControlBotConnection = async () => {
  controlBotConnectionLoading.value = true
  try {
    const saveRes = await fetch('/api/feishu/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config.value)
    })
    const saveData = await saveRes.json()
    if (!saveRes.ok || !saveData.success) throw new Error(saveData.error || '保存配置失败')
    const res = await fetch('/api/feishu/control-bot/start', { method: 'POST' })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || '启动长连接失败')
    controlBotConnection.value = data
    toast.success(data.message || '控制机器人长连接已启动')
    await loadConfig()
  } catch (e) {
    toast.error(e?.message || '启动控制机器人失败')
  } finally {
    controlBotConnectionLoading.value = false
  }
}

const stopControlBotConnection = async () => {
  controlBotConnectionLoading.value = true
  try {
    const res = await fetch('/api/feishu/control-bot/stop', { method: 'POST' })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || '停止长连接失败')
    controlBotConnection.value = data
    toast.success(data.message || '控制机器人已停止')
  } catch (e) {
    toast.error(e?.message || '停止控制机器人失败')
  } finally {
    controlBotConnectionLoading.value = false
  }
}

const projects = ref([])
const loading = ref(false)
const message = ref('')
const showQr = ref(false)
const qrUrl = ref('')
const qrImage = ref('')
const qrStatus = ref('')
const qrLoading = ref(false)
const controlBotConnection = ref({ running: false, pid: null })
const controlBotConnectionLoading = ref(false)
const knowledgeFiles = ref([])
const knowledgeLoading = ref(false)
const searchQuery = ref('')
const searchResults = ref(null)
const isSearching = ref(false)

// 统一大模型配置（群聊主 Agent / 音乐 Agent 共用）
const orchestratorConfig = ref({
  enabled: true,
  format: 'openai-compatible',
  apiUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: '',
  temperature: 0.2,
  timeoutMs: 120000,
  fallbackToRules: true,
  hasKey: false
})
const orchestratorLoading = ref(false)
const orchestratorTestMessage = ref('帮我排查登录页面调用接口失败的问题，前后端都看一下')
const orchestratorTestResult = ref('')
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

// 个性化设置状态
const themePreset = ref('default')
const pollingInterval = ref(10) // 默认 10s
const isLowPerf = ref(false) // 默认不开启 GPU 降级

const loadKnowledgeFiles = async () => {
  knowledgeLoading.value = true
  try {
    const res = await fetch('/api/rag/documents')
    const data = await res.json()
    knowledgeFiles.value = data.documents || []
  } catch (e) {
    toast.error('加载知识库文档失败')
  }
  knowledgeLoading.value = false
}

const deleteKnowledgeFile = async (name) => {
  const ok = await confirmDialog(`确定要删除文档「${name}」吗？删除后将无法基于该文档进行知识检索。`)
  if (!ok) return
  try {
    const res = await fetch(`/api/rag/document?name=${encodeURIComponent(name)}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) {
      toast.success('删除成功')
      loadKnowledgeFiles()
    } else {
      toast.error('删除失败: ' + (data.error || '未知错误'))
    }
  } catch (e) {
    toast.error('请求出错')
  }
}

const uploadKnowledgeFile = async (e) => {
  const files = e.target.files || []
  if (files.length === 0) return
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }
  knowledgeLoading.value = true
  try {
    const res = await fetch('/api/rag/upload', {
      method: 'POST',
      body: formData
    })
    const data = await res.json()
    if (data.success) {
      toast.success('文档上传并索引成功！')
      loadKnowledgeFiles()
    } else {
      toast.error('上传失败: ' + (data.error || '未知错误'))
    }
  } catch (e) {
    toast.error('文件上传出错')
  } finally {
    knowledgeLoading.value = false
    e.target.value = ''
  }
}

const testKnowledgeQuery = async () => {
  if (!searchQuery.value.trim()) {
    toast.warning('请输入搜索内容')
    return
  }
  isSearching.value = true
  searchResults.value = null
  try {
    const res = await fetch('/api/rag/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: searchQuery.value })
    })
    const data = await res.json()
    if (data.success) {
      searchResults.value = data
      toast.success('检索测试完成')
    } else {
      toast.error('检索失败: ' + (data.error || '未知错误'))
    }
  } catch (e) {
    toast.error('检索请求出错')
  }
  isSearching.value = false
}

const loadConfig = async () => {
  try {
    const res = await fetch('/api/feishu/config')
    const data = await res.json()
    config.value = data.config || {}
  } catch (e) {
    console.error('加载飞书配置失败:', e)
  }
}

const loadProjects = async () => {
  try {
    const data = await projectsApi.list()
    projects.value = data.projects || []
  } catch (e) {
    console.error('加载项目列表失败:', e)
  }
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

const loadPreferences = () => {
  themePreset.value = localStorage.getItem('theme-preset') || 'default'
  pollingInterval.value = parseInt(localStorage.getItem('app-polling-interval') || '10', 10)
  isLowPerf.value = localStorage.getItem('app-low-perf') === 'true'
}

const saveConfig = async () => {
  loading.value = true
  message.value = ''

  try {
    const res = await fetch('/api/feishu/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config.value)
    })
    const data = await res.json()

    if (data.success) {
      toast.success('飞书配置已保存！')
      await loadConfig()
    } else {
      toast.error('保存失败: ' + (data.error || '未知错误'))
    }
  } catch (e) {
    toast.error('保存出错')
  }
  loading.value = false
}

const testNotification = async () => {
  if (!config.value.webhook_url?.trim()) {
    toast.warning('请填写飞书群机器人 Webhook 地址')
    return
  }
  loading.value = true
  try {
    const saveRes = await fetch('/api/feishu/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config.value)
    })
    const saveData = await saveRes.json()
    if (!saveRes.ok || !saveData.success) throw new Error(saveData.error || '保存配置失败')
    const res = await fetch('/api/feishu/test', { method: 'POST' })
    const data = await res.json()
    if (!res.ok || !data.success) throw new Error(data.error || '测试通知发送失败')
    toast.success(data.message || '测试通知已发送')
    await loadConfig()
  } catch (e) {
    toast.error(e.message || '测试通知发送失败')
  } finally {
    loading.value = false
  }
}
const saveOrchestratorConfig = async () => {
  orchestratorLoading.value = true
  const payload = { ...orchestratorConfig.value }
  if (!payload.apiKey) delete payload.apiKey
  try {
    const res = await fetch('/api/orchestrator/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (data.success) {
      orchestratorConfig.value = { ...orchestratorConfig.value, ...data.config, apiKey: '' }
      toast.success('统一大模型配置已保存')
    } else {
      toast.error('保存失败: ' + (data.error || '未知错误'))
    }
  } catch (e) {
    toast.error('保存出错')
  } finally {
    orchestratorLoading.value = false
  }
}

const handleSettingsStorage = (e) => {
  if (!e || e.key === 'theme-preset' || e.key === 'app-low-perf' || e.key === 'app-polling-interval') {
    loadPreferences()
  }
}

onMounted(() => {
  loadConfig()
  loadControlBotConnectionStatus()
  loadOrchestratorConfig()
  loadOrchestratorDiagnostics()
  loadDailyDevSmokeStatus('', { silent: true })
  loadProjects()
  loadPreferences()
  loadKnowledgeFiles()
  window.addEventListener('storage', handleSettingsStorage)
})

onUnmounted(() => {
  window.removeEventListener('storage', handleSettingsStorage)
})
</script>

<template>
  <div class="settings">
    <div class="settings-layout">
      <!-- 左侧设置侧边导航 -->
      <div class="settings-sidebar">
        <div class="sidebar-header">
          <h3>⚙️ 系统控制台</h3>
          <span class="version-tag">v1.0.8</span>
        </div>
        <div class="nav-list">
          <button class="nav-item" :class="{ active: activeSection === 'feishu' }" @click="activeSection = 'feishu'">
            <span class="nav-icon">🔔</span>
            <span class="nav-label">飞书机器人</span>
          </button>
          <button class="nav-item" :class="{ active: activeSection === 'agent' }" @click="activeSection = 'agent'">
            <span class="nav-icon">🤖</span>
            <span class="nav-label">统一大模型配置</span>
          </button>
          <button class="nav-item" :class="{ active: activeSection === 'knowledge' }" @click="activeSection = 'knowledge'">
            <span class="nav-icon">📚</span>
            <span class="nav-label">本地知识库管理</span>
          </button>
          <button class="nav-item" :class="{ active: activeSection === 'perf' }" @click="activeSection = 'perf'">
            <span class="nav-icon">🎨</span>
            <span class="nav-label">个性化与体验</span>
          </button>
          <button class="nav-item" :class="{ active: activeSection === 'system' }" @click="activeSection = 'system'">
            <span class="nav-icon">ℹ️</span>
            <span class="nav-label">系统信息及重置</span>
          </button>
        </div>
      </div>

      <!-- 右侧设置配置面板 -->
      <div class="settings-panels">
        
        <!-- SECTION 1: 飞书通知 -->
        <transition name="fade" mode="out-in">
          <div v-if="activeSection === 'feishu'" class="settings-card">
            <div class="card-header">
              <span class="icon">🔔</span>
              <div>
                <div class="card-title">飞书机器人配置</div>
                <div class="card-desc">通知机器人负责推送结果，控制机器人负责接收指令并交给全局 Agent 执行</div>
              </div>
            </div>

            <!-- 飞书状态显示 -->
            <div class="status-box" :class="config.notification_ready ? 'success' : 'warning'">
              <span class="status-dot"></span>
              <div class="status-content">
                <div class="status-title">{{ config.notification_ready ? '飞书群机器人已就绪' : '飞书通知尚未配置完整' }}</div>
                <div class="status-desc">
                  {{ config.notification_ready ? '日报、周报和任务状态会发送到机器人所在群' : '填写机器人 Webhook 后即可发送测试通知' }}
                </div>
              </div>
            </div>

            <!-- 配置表单 -->
            <div class="form-group row-checkbox">
              <label class="switch-label">
                <input type="checkbox" v-model="config.enabled" class="switch-input">
                <span class="switch-slider"></span>
                <span class="switch-text">开启全局飞书消息推送</span>
              </label>
            </div>

            <div class="form-form feishu-direct-form">
              <div class="form-group">
                <label>飞书群机器人 Webhook</label>
                <input v-model="config.webhook_url" placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxxx" class="tech-input">
                <div class="form-hint">在飞书群里添加“自定义机器人”，复制机器人 Webhook 地址到这里</div>
              </div>

              <div class="form-group">
                <label>签名密钥（可选）</label>
                <input v-model="config.sign_key" type="password" placeholder="机器人开启签名校验时填写" class="tech-input">
              </div>

              <div class="btn-actions">
                <button class="btn btn-primary" @click="saveConfig" :disabled="loading">
                  {{ loading ? '保存中...' : '保存飞书配置' }}
                </button>
                <button class="btn btn-outline" @click="testNotification" :disabled="loading">发送测试通知</button>
              </div>

              <div class="auth-steps direct-steps">
                <h5>配置要求</h5>
                <ul>
                  <li>在目标飞书群添加自定义机器人，复制 Webhook 地址；</li>
                  <li>如果机器人开启了签名校验，把签名密钥填到这里；</li>
                  <li>保存后点击“发送测试通知”，日报、周报和任务状态会发送到机器人所在群；</li>
                  <li>这种方式不需要企业通讯录权限、应用授权或扫码。</li>
                </ul>
              </div>
              <section class="control-bot-section">
                <div class="control-bot-heading">
                  <div>
                    <h4>飞书控制机器人</h4>
                    <p>接收你在飞书里的业务需求和管理指令，交给全局 Agent 创建计划并派发执行。</p>
                  </div>
                  <span class="control-bot-state" :class="config.control_bot_ready ? 'ready' : 'pending'">
                    {{ config.control_bot_ready ? '已就绪' : '待配置' }}
                  </span>
                </div>

                <div class="form-group row-checkbox">
                  <label class="switch-label">
                    <input type="checkbox" v-model="config.control_bot_enabled" class="switch-input">
                    <span class="switch-slider"></span>
                    <span class="switch-text">开启飞书控制入口</span>
                  </label>
                </div>

                <div class="control-bot-quick-setup">
                  <div>
                    <strong>推荐：扫码自动配置应用凭证</strong>
                    <span>和项目管理页的飞书扫码配置一致，自动获取 App ID / Secret；收消息走 cc-connect 的飞书 WebSocket 长连接，不需要公网回调地址。</span>
                  </div>
                  <button class="btn btn-outline" type="button" @click="openControlBotQr">🤖 扫码配置</button>
                </div>

                <div class="form-grid">
                  <div class="form-group">
                    <label>控制机器人 App ID</label>
                    <input v-model="config.control_bot_app_id" placeholder="cli_xxxxxxxxxxxxxxxx" class="tech-input">
                  </div>
                  <div class="form-group">
                    <label>控制机器人 App Secret</label>
                    <input v-model="config.control_bot_app_secret" type="password" placeholder="飞书自建应用的 App Secret" class="tech-input">
                  </div>
                </div>

                <div class="websocket-mode-note">
                  <strong>接收消息方式：飞书 WebSocket 长连接</strong>
                  <span>与项目管理页的飞书机器人一致，cc-connect 会通过 App ID / Secret 建立长连接接收群消息，不需要 CCM 公网地址，也不需要配置事件回调 URL。</span>
                </div>

                <div class="control-bot-runtime" :class="controlBotConnection.running ? 'running' : 'stopped'">
                  <div>
                    <strong>{{ controlBotConnection.running ? '长连接运行中' : '长连接未启动' }}</strong>
                    <span>{{ controlBotConnection.running ? `PID: ${controlBotConnection.pid}` : '保存凭证后启动长连接，飞书消息才会进入全局 Agent。' }}</span>
                  </div>
                  <div class="runtime-actions">
                    <button class="btn btn-outline" type="button" :disabled="controlBotConnectionLoading" @click="loadControlBotConnectionStatus">刷新状态</button>
                    <button v-if="!controlBotConnection.running" class="btn btn-primary" type="button" :disabled="controlBotConnectionLoading" @click="startControlBotConnection">
                      {{ controlBotConnectionLoading ? '启动中...' : '启动长连接' }}
                    </button>
                    <button v-else class="btn btn-outline" type="button" :disabled="controlBotConnectionLoading" @click="stopControlBotConnection">
                      {{ controlBotConnectionLoading ? '停止中...' : '停止长连接' }}
                    </button>
                  </div>
                </div>

                <div class="btn-actions">
                  <button class="btn btn-primary" @click="saveConfig" :disabled="loading">
                    {{ loading ? '保存中...' : '保存控制机器人配置' }}
                  </button>
                </div>

                <div class="auth-steps direct-steps">
                  <h5>飞书开放平台配置要求</h5>
                  <ul>
                    <li>飞书应用需要开启“机器人”能力；</li>
                    <li>在“事件与回调”中添加 <code>im.message.receive_v1</code>，并选择 WebSocket 长连接模式；</li>
                    <li>把机器人加入目标群，在群里 @ 控制机器人发送需求；</li>
                    <li>执行回执仍由上方通知机器人 Webhook 统一推送。</li>
                  </ul>
                </div>
              </section>
            </div>
          </div>
        </transition>

        <!-- SECTION 2: 主 Agent 配置 -->
        <transition name="fade" mode="out-in">
          <div v-if="activeSection === 'agent'" class="settings-card">
            <div class="card-header">
              <span class="icon">🎯</span>
              <div>
                <div class="card-title">统一大模型配置</div>
                <div class="card-desc">群聊主 Agent 和音乐 Agent 共用这一套大模型 API 配置；项目子 Agent 仍按各自项目配置运行</div>
              </div>
            </div>

            <div class="status-box" :class="orchestratorConfig.enabled && orchestratorConfig.hasKey && orchestratorConfig.model ? 'success' : 'warning'">
              <span class="status-dot"></span>
              <div class="status-content">
                <div class="status-title">{{ orchestratorConfig.enabled ? (orchestratorConfig.hasKey && orchestratorConfig.model ? '已启用 LLM 主协调器' : '大模型协调器待完善配置') : 'LLM 主协调器已关闭' }}</div>
                <div class="status-desc">
                  {{ orchestratorConfig.hasKey ? '🔑 API 密钥已保存' : '⚠️ 未保存 API 密钥' }} | 模型：{{ orchestratorConfig.model || '未设定' }}
                </div>
              </div>
            </div>

            <div v-if="orchestratorDiagnostics" class="diagnostics-panel" :class="orchestratorDiagnostics.readiness">
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

              <div v-if="orchestratorDiagnostics.autopilot" class="auto-dev-summary" :class="orchestratorDiagnostics.autopilot.mode">
                <div class="auto-dev-summary-copy">
                  <strong>{{ getAutopilotPlainStatus(orchestratorDiagnostics.autopilot) }}</strong>
                  <span>{{ getAutopilotPlainReason(orchestratorDiagnostics.autopilot) }}</span>
                </div>
                <b>{{ getAutopilotModeText(orchestratorDiagnostics.autopilot.mode) }}</b>
              </div>

              <div v-if="orchestratorDiagnostics.autopilot" class="auto-dev-checklist">
                <div v-for="item in getAutoDevChecklist(orchestratorDiagnostics.autopilot)" :key="item.key" class="auto-dev-check" :class="item.state">
                  <div>
                    <strong>{{ item.label }}</strong>
                    <span>{{ item.hint }}</span>
                  </div>
                  <b>{{ item.value }}</b>
                </div>
              </div>

              <div v-if="orchestratorDiagnostics.autopilot?.next_actions?.length" class="auto-dev-next-actions">
                <strong>建议下一步</strong>
                <ul>
                  <li v-for="action in orchestratorDiagnostics.autopilot.next_actions" :key="action">{{ action }}</li>
                </ul>
              </div>

              <div v-if="orchestratorDiagnostics.autopilot" class="auto-dev-controls">
                <button class="btn btn-primary btn-sm" :disabled="dailyDevAutopilotLoading" @click="runDailyDevAutopilot">
                  {{ dailyDevAutopilotLoading ? '运行中...' : '试运行一次自动开发' }}
                </button>
                <button class="btn btn-outline btn-sm" :disabled="dailyDevCronEnsureLoading" @click="ensureDailyDevCronJobs">
                  {{ dailyDevCronEnsureLoading ? '启用中...' : '开启定时接活' }}
                </button>
                <button class="btn btn-outline btn-sm" :disabled="inferredVerificationApplyLoading || !(orchestratorDiagnostics.autopilot.counts?.verificationInferred > 0)" @click="applyInferredVerificationCommands">
                  {{ inferredVerificationApplyLoading ? '初始化中...' : '补齐验证命令' }}
                </button>
                <span>这些操作会使用需求池、共享文档、任务队列和项目 Agent 执行检查。</span>
              </div>

              <div v-if="dailyDevAutopilotRun || inferredVerificationApplyRun || dailyDevCronEnsureRun" class="auto-dev-run-results">
                <div v-if="dailyDevAutopilotRun" class="autopilot-run-result">
                  <span>续跑 {{ dailyDevAutopilotRun.continued || 0 }}</span>
                  <span>导入 {{ dailyDevAutopilotRun.imported || 0 }}</span>
                  <span>派发 {{ dailyDevAutopilotRun.dispatched || 0 }}</span>
                  <span>入队 {{ dailyDevAutopilotRun.queued || 0 }}</span>
                  <span>失败 {{ dailyDevAutopilotRun.failed || 0 }}</span>
                  <span>执行准入 {{ dailyDevAutopilotRun.can_auto_execute_daily_dev ? '通过' : '等待子 Agent 检查' }}</span>
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

              <div v-if="dailyDevAutopilotRun?.outcome" class="autopilot-outcome" :class="{ blocked: dailyDevAutopilotRun.outcome.blocked }">
                <strong>{{ dailyDevAutopilotRun.outcome.message }}</strong>
                <p v-if="dailyDevAutopilotRun.execution_readiness?.message" class="autopilot-readiness-message">
                  {{ dailyDevAutopilotRun.execution_readiness.message }}
                </p>
                <ul v-if="dailyDevAutopilotRun.outcome.next_actions?.length">
                  <li v-for="action in dailyDevAutopilotRun.outcome.next_actions" :key="action">{{ action }}</li>
                </ul>
              </div>

              <div v-if="orchestratorDiagnostics.autopilot?.recent_cron?.length" class="autopilot-cron">
                <span v-for="job in orchestratorDiagnostics.autopilot.recent_cron" :key="job.id">
                  {{ job.name }}：{{ job.last_result || job.last_status }}
                </span>
              </div>
              <div v-if="agentProbeTargets.length" class="agent-probe-matrix">
                <div class="agent-probe-matrix-head">
                  <div>
                    <strong>子 Agent 运行检查</strong>
                    <span>确认这些项目 Agent 能被真实调用。通过 {{ agentProbeMatrixCounts?.ready || 0 }}/{{ agentProbeMatrixCounts?.executable || 0 }} · 未检查 {{ agentProbeMatrixCounts?.missing || 0 }} · 结果过期 {{ agentProbeMatrixCounts?.stale || 0 }}</span>
                  </div>
                  <div class="agent-probe-actions">
                    <button class="btn btn-outline btn-sm" @click="runAgentCliProbe" :disabled="agentCliProbeLoading || agentCliProbeBatchLoading || !selectedAgentCliProbeTarget">
                      {{ agentCliProbeLoading ? '检查中...' : '检查所选' }}
                    </button>
                    <button class="btn btn-outline btn-sm" @click="runAgentCliProbeBatch" :disabled="agentCliProbeBatchLoading || agentCliProbeLoading || !(agentProbeMatrixCounts?.executable > 0)">
                      {{ agentCliProbeBatchLoading ? '批量检查中...' : '检查全部子 Agent' }}
                    </button>
                  </div>
                </div>
                <div v-if="agentCliProbeBatch" class="agent-probe-batch-result">
                  <span>批量复检 {{ agentCliProbeBatch.passed || 0 }}/{{ agentCliProbeBatch.total || 0 }}</span>
                  <span>失败 {{ agentCliProbeBatch.failed || 0 }}</span>
                  <span>跳过 {{ agentCliProbeBatch.skipped || 0 }}</span>
                </div>
                <div class="agent-probe-grid">
                  <button v-for="target in agentProbeTargets" :key="target.key || (target.group_id + target.project)" class="agent-probe-row" :class="[getAgentProbeStatusClass(target), { active: agentCliProbeTargetKey === target.group_id + '::' + target.project }]" @click="selectProbeTarget(target)">
                    <span class="agent-probe-state">{{ getAgentProbeStatusText(target) }}</span>
                    <span class="agent-probe-main">{{ target.group_name }} / {{ target.project }}</span>
                    <span class="agent-probe-sub">{{ target.agent_type }} · {{ target.command || '未记录命令' }}</span>
                    <span class="agent-probe-time">{{ formatRunnerAge(target.age_ms) }}</span>
                  </button>
                </div>
              </div>
              <div class="diagnostics-section-title">高级诊断明细</div>
              <div class="diagnostics-list">
                <div v-for="check in orchestratorDiagnostics.checks" :key="check.id" class="diagnostic-item" :class="check.status">
                  <span class="diagnostic-state">{{ getDiagnosticStatusText(check.status) }}</span>
                  <div class="diagnostic-copy">
                    <div class="diagnostic-label">{{ check.label }}</div>
                    <div class="diagnostic-message">{{ check.message }}</div>
                    <div v-if="getRunnerDetail(check)" class="runner-detail">
                      <div class="runner-grid">
                        <span>Runner：{{ formatRunnerState(getRunnerDetail(check)) }}</span>
                        <span>待处理：{{ getRunnerDetail(check).pending_requests || 0 }}</span>
                        <span>请求/结果：{{ getRunnerDetail(check).requests || 0 }} / {{ getRunnerDetail(check).results || 0 }}</span>
                        <span>最近：{{ formatRunnerAge(getRunnerDetail(check).last_result?.age_ms || getRunnerDetail(check).age_ms) }}</span>
                        <span>命令：{{ getRunnerDetail(check).last_result?.command || '未执行' }}</span>
                        <span>执行器：{{ getRunnerDetail(check).last_result?.runner || getRunnerDetail(check).runner || '未知' }}</span>
                        <span>探针：{{ formatProbeState(getProbeDetail(check)) }}</span>
                        <span>探针时间：{{ formatRunnerAge(getProbeDetail(check)?.age_ms) }}</span>
                      </div>
                      <div v-if="getProbeDetail(check)?.message" class="runner-probe" :class="getProbeDetail(check).success ? 'ok' : 'fail'">
                        {{ getProbeDetail(check).target?.project ? `目标 ${getProbeDetail(check).target.project}：` : '' }}{{ getProbeDetail(check).message }}
                      </div>
                      <div v-if="getRunnerDetail(check).last_result?.error" class="runner-error">
                        {{ getRunnerDetail(check).last_result.error }}
                      </div>
                      <div v-if="getRunnerDetail(check).last_result?.hint" class="runner-hint">
                        {{ getRunnerDetail(check).last_result.hint }}
                      </div>
                      <div v-if="getChildProcessDetail(check)?.error" class="runner-node-error">
                        Node 子进程：{{ getChildProcessDetail(check).error }}
                      </div>
                    </div>
                    <div v-if="getAgentProbeCheckDetail(check)" class="recovery-monitor-detail">
                      <div class="runner-grid">
                        <span>状态：{{ formatProbeState(getAgentProbeCheckDetail(check).probe) }}</span>
                        <span>健康：{{ getAgentProbeCheckDetail(check).probeHealth?.status || 'missing' }}</span>
                        <span>时间：{{ formatRunnerAge(getAgentProbeCheckDetail(check).probe?.age_ms) }}</span>
                        <span>目标：{{ getAgentProbeCheckDetail(check).probe?.target?.project || '未选择' }}</span>
                        <span>执行路径：{{ getAgentProbeCheckDetail(check).probe?.execution_path || getAgentProbeCheckDetail(check).probe?.readiness_mode || '未记录' }}</span>
                        <span>预期标记：{{ getAgentProbeCheckDetail(check).probe?.expected_marker || 'CCM_AGENT_PROBE_OK' }}</span>
                        <span>工作目录：{{ getAgentProbeCheckDetail(check).probe?.target?.work_dir || '未记录' }}</span>
                      </div>
                      <div v-if="getAgentProbeCheckDetail(check).probe?.message" class="runner-probe" :class="getAgentProbeCheckDetail(check).probe?.success ? 'ok' : 'fail'">
                        {{ getAgentProbeCheckDetail(check).probe.message }}
                      </div>
                      <pre v-if="formatProbePreview(getAgentProbeCheckDetail(check).probe?.output_preview)" class="probe-output">{{ formatProbePreview(getAgentProbeCheckDetail(check).probe?.output_preview) }}</pre>
                      <ul v-if="getAgentProbeCheckDetail(check).fix_actions?.length" class="runner-actions">
                        <li v-for="action in getAgentProbeCheckDetail(check).fix_actions" :key="action">{{ action }}</li>
                      </ul>
                    </div>
                    <div v-if="getRecoveryMonitorDetail(check)" class="recovery-monitor-detail">
                      <div class="runner-grid">
                        <span>监控：{{ formatRecoveryMonitorState(getRecoveryMonitorDetail(check)) }}</span>
                        <span>探针间隔：{{ formatDuration(getRecoveryMonitorDetail(check).interval_ms) }}</span>
                        <span>等待通道：{{ getRecoveryMonitorDetail(check).work?.blocked_pending?.length || 0 }}</span>
                        <span>可重试失败：{{ getRecoveryMonitorDetail(check).work?.runtime_failed?.length || 0 }}</span>
                      </div>
                      <div v-if="getRecoveryMonitorDetail(check).probe_in_flight" class="runner-probe">
                        后台正在复检执行通道，成功后会自动恢复队列
                      </div>
                    </div>
                    <div v-if="getWatchdogDetail(check)" class="recovery-monitor-detail">
                      <div class="runner-grid">
                        <span>待恢复：{{ getWatchdogDetail(check).stale_pending?.length || 0 }}</span>
                        <span>执行中断：{{ getWatchdogDetail(check).stalled_in_progress?.length || 0 }}</span>
                        <span>可按缺口续跑：{{ getWatchdogDetail(check).gap_rework?.length || 0 }}</span>
                        <span>执行失败：{{ getWatchdogDetail(check).runtime_failed?.length || 0 }}</span>
                      </div>
                    </div>
                    <div v-if="getProjectVerificationDetail(check)" class="verification-detail">
                      <div class="runner-grid">
                        <span>可检查：{{ getProjectVerificationDetail(check).total || 0 }}</span>
                        <span>已配置：{{ getProjectVerificationDetail(check).configured || 0 }}</span>
                        <span>自动推断：{{ getProjectVerificationDetail(check).inferred || 0 }}</span>
                        <span>缺失：{{ getProjectVerificationDetail(check).missing || 0 }}</span>
                      </div>
                      <div v-if="getProjectVerificationDetail(check).members?.length" class="verification-members">
                        <div v-for="member in getProjectVerificationDetail(check).members" :key="`${member.group}-${member.project}`" class="verification-member" :class="member.source">
                          <strong>{{ member.project || '未命名项目' }}</strong>
                          <span>{{ member.group || '未分组' }} · {{ formatVerificationSource(member.source) }}</span>
                          <code>{{ member.commands?.length ? member.commands.join('；') : '请在项目工具配置中填写验证命令' }}</code>
                        </div>
                      </div>
                    </div>
                    <div v-if="getWorkerProtocolDetail(check)" class="worker-protocol-detail">
                      <div class="worker-protocol-title">协议证据</div>
                      <div class="worker-protocol-grid">
                        <span
                          v-for="item in formatBooleanChecks(getWorkerProtocolDetail(check).taskNotificationChecks)"
                          :key="'notify-' + item.key"
                          :class="item.ok ? 'ok' : 'fail'"
                        >
                          {{ item.ok ? '通过' : '失败' }} · {{ item.label }}
                        </span>
                        <span
                          v-for="item in formatBooleanChecks(getWorkerProtocolDetail(check).scratchpadChecks)"
                          :key="'scratch-' + item.key"
                          :class="item.ok ? 'ok' : 'fail'"
                        >
                          {{ item.ok ? '通过' : '失败' }} · {{ item.label }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="showExecutionRecovery()" class="execution-recovery">
                <div class="execution-recovery-head">
                  <strong>执行通道恢复步骤</strong>
                  <span>{{ getExecutionRecoveryReason() }}</span>
                </div>
                <ol>
                  <li>在项目目录启动外部执行器：<code>npm run agent-runner:ps</code></li>
                  <li>在同一台机器确认 Claude CLI 可用：<code>claude -p</code></li>
                  <li>回到这里点击“复检执行通道”。探针通过后会自动触发看门狗恢复任务。</li>
                </ol>
              </div>
              <div v-if="agentCliProbeTargetOptions.length" class="probe-target-picker">
                <label>探针目标</label>
                <select v-model="agentCliProbeTargetKey">
                  <option v-for="target in agentCliProbeTargetOptions" :key="target.key" :value="target.key">
                    {{ target.label }}
                  </option>
                </select>
              </div>
              <div class="btn-actions">
                <button class="btn btn-outline" @click="loadOrchestratorDiagnostics" :disabled="orchestratorDiagnosticsLoading">
                  {{ orchestratorDiagnosticsLoading ? '自检中...' : '刷新闭环自检' }}
                </button>
                <button class="btn btn-outline" @click="runAgentCliProbe" :disabled="agentCliProbeLoading">
                  {{ agentCliProbeLoading ? '复检中...' : '复检执行通道' }}
                </button>
                <button class="btn btn-outline" @click="runAgentRecoveryMonitor" :disabled="agentRecoveryMonitorLoading">
                  {{ agentRecoveryMonitorLoading ? '恢复中...' : '立即恢复自动任务' }}
                </button>
                <button class="btn btn-primary" @click="runDailyDevRehearsal" :disabled="dailyDevRehearsalLoading">
                  {{ dailyDevRehearsalLoading ? '演练中...' : '运行闭环演练' }}
                </button>
                <button class="btn btn-outline" @click="createDailyDevSmokeTask" :disabled="dailyDevSmokeLoading">
                  {{ dailyDevSmokeLoading ? '创建中...' : '创建真实试运行任务' }}
                </button>
                <button class="btn btn-outline" @click="loadDailyDevSmokeStatus('', { silent: false })" :disabled="dailyDevSmokeLoading">
                  {{ dailyDevSmokeLoading ? '刷新中...' : '刷新试运行状态' }}
                </button>
              </div>
              <div v-if="agentCliProbe" class="probe-box" :class="agentCliProbe.success ? 'ok' : 'fail'">
                <div class="rehearsal-head">
                  <strong>{{ agentCliProbe.success ? '执行通道探针通过' : (agentCliProbe.blocked ? '执行通道仍阻塞' : '执行通道探针失败') }}</strong>
                  <span>{{ agentCliProbe.target?.project || agentCliProbe.readiness?.mode || '未执行' }}</span>
                </div>
                <div class="probe-message">{{ agentCliProbe.message || agentCliProbe.error }}</div>
                <div v-if="agentCliProbe.target" class="smoke-task-meta">
                  <span>群聊：{{ agentCliProbe.target.group_name }}</span>
                  <span>子 Agent：{{ agentCliProbe.target.project }}</span>
                  <span>命令类型：{{ agentCliProbe.target.agent_type }}</span>
                  <span>执行路径：{{ agentCliProbe.execution_path || agentCliProbe.readiness?.mode || '未记录' }}</span>
                  <span>预期标记：{{ agentCliProbe.expected_marker || 'CCM_AGENT_PROBE_OK' }}</span>
                  <span>工作目录：{{ agentCliProbe.target.work_dir || '未记录' }}</span>
                  <span>耗时：{{ agentCliProbe.duration_ms || 0 }}ms</span>
                </div>
                <div v-if="agentCliProbeRecovery" class="smoke-task-meta">
                  <span>卡住恢复：{{ agentCliProbeRecovery.recovered || 0 }}/{{ agentCliProbeRecovery.total_recoverable || 0 }}</span>
                  <span v-if="agentCliProbeRecovery.blocked_recovery">准入恢复：{{ agentCliProbeRecovery.blocked_recovery?.recovered || 0 }}/{{ agentCliProbeRecovery.blocked_recovery?.total_blocked || 0 }}</span>
                  <span>执行失败恢复：{{ agentCliProbeRecovery.runtime_queued || 0 }}/{{ agentCliProbeRecovery.runtime_failed_total || 0 }}</span>
                  <span>缺口续跑：{{ agentCliProbeRecovery.gap_queued || 0 }}/{{ agentCliProbeRecovery.gap_rework_total || 0 }}</span>
                  <span v-if="agentCliProbeRecovery.gap_continue_skipped_reason">续跑跳过：{{ agentCliProbeRecovery.gap_continue_skipped_reason }}</span>
                  <span v-if="agentCliProbeRecovery.runtime_retry_skipped_reason">跳过：{{ agentCliProbeRecovery.runtime_retry_skipped_reason }}</span>
                </div>
                <pre v-if="formatProbePreview(agentCliProbe.output_preview || agentCliProbe.output)" class="probe-output">{{ formatProbePreview(agentCliProbe.output_preview || agentCliProbe.output) }}</pre>
              </div>
              <div v-if="agentRecoveryMonitorRun" class="probe-box" :class="agentRecoveryMonitorRun.success ? 'ok' : 'fail'">
                <div class="rehearsal-head">
                  <strong>{{ agentRecoveryMonitorRun.success ? '恢复监控已执行' : '恢复监控未通过' }}</strong>
                  <span>{{ agentRecoveryMonitorRun.skipped ? '无需恢复' : (agentRecoveryMonitorRun.probe?.target?.project || agentRecoveryMonitorRun.probe?.readiness?.mode || '后台探针') }}</span>
                </div>
                <div class="probe-message">{{ agentRecoveryMonitorRun.reason || agentRecoveryMonitorRun.message || agentRecoveryMonitorRun.probe?.message || agentRecoveryMonitorRun.error }}</div>
                <div class="smoke-task-meta">
                  <span>等待通道：{{ agentRecoveryMonitorRun.work?.blocked_pending?.length || 0 }}</span>
                  <span>可重试失败：{{ agentRecoveryMonitorRun.work?.runtime_failed?.length || 0 }}</span>
                  <span>已恢复：{{ agentRecoveryMonitorRun.blocked_recovery?.recovered || 0 }}/{{ agentRecoveryMonitorRun.blocked_recovery?.total_blocked || 0 }}</span>
                  <span>已重试：{{ agentRecoveryMonitorRun.runtime_recovery?.queued || 0 }}/{{ agentRecoveryMonitorRun.runtime_recovery?.total_recoverable || 0 }}</span>
                </div>
              </div>
              <div v-if="dailyDevRehearsal" class="rehearsal-box" :class="dailyDevRehearsal.pass ? 'ok' : 'fail'">
                <div class="rehearsal-head">
                  <strong>{{ dailyDevRehearsal.pass ? '闭环演练通过' : '闭环演练未通过' }}</strong>
                  <span>{{ dailyDevRehearsal.group?.name || '未选择群聊' }}</span>
                </div>
                <div class="rehearsal-steps">
                  <span v-for="step in dailyDevRehearsal.steps" :key="step.id" :class="step.status">
                    {{ step.status === 'ok' ? '通过' : '失败' }} · {{ step.message }}
                  </span>
                </div>
                <div v-if="dailyDevRehearsal.worker_notification" class="smoke-task-meta">
                  <span>通知：{{ dailyDevRehearsal.worker_notification.status || 'unknown' }}</span>
                  <span>Worker：{{ dailyDevRehearsal.worker_notification.task_id || '未记录' }}</span>
                  <span>回执：{{ dailyDevRehearsal.worker_notification.receipt_status || 'missing' }}</span>
                  <span>{{ dailyDevRehearsal.scratchpad_context ? 'scratchpad 已生成' : 'scratchpad 未生成' }}</span>
                </div>
              </div>
              <div v-if="dailyDevSmokeTask" class="rehearsal-box ok">
                <div class="rehearsal-head">
                  <strong>真实试运行任务已创建</strong>
                  <span>{{ dailyDevSmokeTask.queued ? '已入队' : '未入队' }}</span>
                </div>
                <div class="smoke-task-meta">
                  <span>任务：{{ dailyDevSmokeTask.task?.title }}</span>
                  <span>ID：{{ dailyDevSmokeTask.task?.id }}</span>
                  <span>群聊：{{ dailyDevSmokeTask.group?.name || dailyDevSmokeTask.group?.id }}</span>
                  <span>子 Agent：{{ dailyDevSmokeTask.target_member }}</span>
                  <span>文件：{{ dailyDevSmokeTask.smoke_file }}</span>
                </div>
              </div>
              <div v-if="dailyDevSmokeStatus" class="rehearsal-box" :class="dailyDevSmokeStatus.pass ? 'ok' : 'fail'">
                <div class="rehearsal-head">
                  <strong>{{ dailyDevSmokeStatus.pass ? '真实试运行已通过' : '真实试运行未通过' }}</strong>
                  <span>{{ dailyDevSmokeStatus.status || 'unknown' }}</span>
                </div>
                <div class="probe-message">{{ dailyDevSmokeStatus.message }}</div>
                <div v-if="dailyDevSmokeStatus.task" class="smoke-task-meta">
                  <span>任务：{{ dailyDevSmokeStatus.task.id }}</span>
                  <span>状态：{{ dailyDevSmokeStatus.task.status }}</span>
                  <span>群聊：{{ dailyDevSmokeStatus.target?.group_name }}</span>
                  <span>子 Agent：{{ dailyDevSmokeStatus.target?.member }}</span>
                  <span>文件：{{ dailyDevSmokeStatus.target?.smoke_file }}</span>
                  <span>{{ dailyDevSmokeStatus.target?.file_exists ? '文件已存在' : '文件不存在' }}</span>
                </div>
                <div v-if="dailyDevSmokeStatus.evidence" class="rehearsal-steps">
                  <span :class="dailyDevSmokeStatus.evidence.task_done ? 'ok' : 'fail'">{{ dailyDevSmokeStatus.evidence.task_done ? '通过' : '缺失' }} · 任务完成</span>
                  <span :class="dailyDevSmokeStatus.evidence.file_exists ? 'ok' : 'fail'">{{ dailyDevSmokeStatus.evidence.file_exists ? '通过' : '缺失' }} · smoke 文件</span>
                  <span :class="dailyDevSmokeStatus.evidence.has_target_assignment ? 'ok' : 'fail'">{{ dailyDevSmokeStatus.evidence.has_target_assignment ? '通过' : '缺失' }} · 主 Agent 派发</span>
                  <span :class="dailyDevSmokeStatus.evidence.has_target_worker_notification ? 'ok' : 'fail'">{{ dailyDevSmokeStatus.evidence.worker_notification_count || 0 }} · Worker 通知</span>
                  <span :class="dailyDevSmokeStatus.evidence.coordination_plan_count > 0 ? 'ok' : 'fail'">{{ dailyDevSmokeStatus.evidence.coordination_plan_count || 0 }} · 协调计划</span>
                  <span :class="dailyDevSmokeStatus.evidence.actual_file_change_count > 0 ? 'ok' : 'fail'">{{ dailyDevSmokeStatus.evidence.actual_file_change_count || 0 }} · 实际变更</span>
                  <span :class="dailyDevSmokeStatus.evidence.has_done_receipt ? 'ok' : 'fail'">{{ dailyDevSmokeStatus.evidence.has_done_receipt ? '通过' : '缺失' }} · 子 Agent 回执</span>
                  <span :class="dailyDevSmokeStatus.evidence.has_final_review ? 'ok' : 'fail'">{{ dailyDevSmokeStatus.evidence.has_final_review ? '通过' : '缺失' }} · 主 Agent 复盘</span>
                  <span :class="dailyDevSmokeStatus.evidence.executed_verification_count > 0 ? 'ok' : 'fail'">{{ dailyDevSmokeStatus.evidence.executed_verification_count || 0 }} · 已执行验证</span>
                </div>
              </div>
            </div>

            <div class="form-group row-checkbox">
              <label class="switch-label">
                <input type="checkbox" v-model="orchestratorConfig.enabled" class="switch-input">
                <span class="switch-slider"></span>
                <span class="switch-text">启用统一大模型 API（群聊主 Agent / 音乐 Agent 共用）</span>
              </label>
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label>API 驱动格式</label>
                <select v-model="orchestratorConfig.format" class="tech-input">
                  <option value="auto">Auto (自适应检测)</option>
                  <option value="openai-compatible">OpenAI Compatible (如 DeepSeek, GPT)</option>
                  <option value="anthropic-compatible">Anthropic Compatible (Claude 官方接口)</option>
                </select>
              </div>
              <div class="form-group">
                <label>大模型 Model 标识</label>
                <input v-model="orchestratorConfig.model" placeholder="例如 deepseek-chat / gpt-4o" class="tech-input">
              </div>
            </div>

            <div class="form-group">
              <label>API 接口端点 (Base URL)</label>
              <input v-model="orchestratorConfig.apiUrl" placeholder="https://api.openai.com/v1" class="tech-input">
              <div class="form-hint">支持标准的 OpenAI Chat Completions 或 Anthropic 消息协议</div>
            </div>

            <div class="form-group">
              <label>API Key (密钥)</label>
              <input v-model="orchestratorConfig.apiKey" type="password" :placeholder="orchestratorConfig.hasKey ? '已保存，留空则不作修改' : '输入大模型 API Key'" class="tech-input">
            </div>

            <div class="form-grid">
              <div class="form-group">
                <label>温度系数 (Temperature)</label>
                <input v-model.number="orchestratorConfig.temperature" type="number" min="0" max="1" step="0.1" class="tech-input">
              </div>
              <div class="form-group">
                <label>调用超时限制 (毫秒)</label>
                <input v-model.number="orchestratorConfig.timeoutMs" type="number" min="5000" step="1000" class="tech-input">
              </div>
            </div>

            <div class="form-group row-checkbox">
              <label class="switch-label">
                <input type="checkbox" v-model="orchestratorConfig.fallbackToRules" class="switch-input">
                <span class="switch-slider"></span>
                <span class="switch-text">LLM 不可用时保留“规则主 Agent”继续计划和派单</span>
              </label>
            </div>

            <div class="test-orchestrator-section">
              <div class="form-group">
                <label>主 Agent 意图识别测试</label>
                <textarea v-model="orchestratorTestMessage" rows="3" placeholder="输入测试语，例如：帮我编写一个 React 的上传组件" class="tech-input"></textarea>
              </div>
              <div class="btn-actions">
                <button class="btn btn-primary" @click="saveOrchestratorConfig" :disabled="orchestratorLoading">
                  {{ orchestratorLoading ? '保存中...' : '💾 保存统一大模型配置' }}
                </button>
                <button class="btn btn-outline" @click="testOrchestrator" :disabled="orchestratorLoading">⚡ 测试意图识别</button>
              </div>
              <pre v-if="orchestratorTestResult" class="orchestrator-test-result">{{ orchestratorTestResult }}</pre>
            </div>
          </div>
        </transition>

        <!-- SECTION 3: 个性化与体验 -->
        <transition name="fade" mode="out-in">
          <div v-if="activeSection === 'perf'" class="settings-card">
            <div class="card-header">
              <span class="icon">🎨</span>
              <div>
                <div class="card-title">个性化与体验设置</div>
                <div class="card-desc">配置 Web 界面的主题艺术预设、数据自动轮询周期及针对性能的 GPU 加速开关</div>
              </div>
            </div>

            <!-- 主题预设选项 -->
            <div class="settings-subsection">
              <h4 class="sub-title">💎 科技霓虹艺术主题预设</h4>
              <div class="preset-grid">
                <!-- 预设 1 -->
                <div class="preset-card" :class="{ active: themePreset === 'default' }" @click="changeThemePreset('default')">
                  <div class="preset-preview bg-default">
                    <span class="dot-p p-blue"></span><span class="dot-p p-gray"></span>
                  </div>
                  <span class="preset-label">系统默认</span>
                </div>
                <!-- 预设 2 -->
                <div class="preset-card" :class="{ active: themePreset === 'deep-void' }" @click="changeThemePreset('deep-void')">
                  <div class="preset-preview bg-void">
                    <span class="dot-p p-cyan"></span><span class="dot-p p-dark"></span>
                  </div>
                  <span class="preset-label">深邃极客</span>
                </div>
                <!-- 预设 3 -->
                <div class="preset-card" :class="{ active: themePreset === 'cyberpunk' }" @click="changeThemePreset('cyberpunk')">
                  <div class="preset-preview bg-cyber">
                    <span class="dot-p p-pink"></span><span class="dot-p p-neon"></span>
                  </div>
                  <span class="preset-label">赛博之霓</span>
                </div>
                <!-- 预设 4 -->
                <div class="preset-card" :class="{ active: themePreset === 'deep-ocean' }" @click="changeThemePreset('deep-ocean')">
                  <div class="preset-preview bg-ocean">
                    <span class="dot-p p-indigo"></span><span class="dot-p p-teal"></span>
                  </div>
                  <span class="preset-label">深海探索</span>
                </div>
                <!-- 预设 5 -->
                <div class="preset-card" :class="{ active: themePreset === 'aurora' }" @click="changeThemePreset('aurora')">
                  <div class="preset-preview bg-aurora">
                    <span class="dot-p p-aurora-g"></span><span class="dot-p p-aurora-w"></span>
                  </div>
                  <span class="preset-label">极地流光</span>
                </div>
              </div>
            </div>

            <!-- 刷新时间配置 -->
            <div class="settings-subsection" style="margin-top:24px">
              <h4 class="sub-title">🔄 协作大屏自动刷新轮询周期</h4>
              <div class="polling-selector-wrap">
                <div class="polling-options">
                  <button v-for="sec in [5, 10, 30, 60, 0]" :key="sec" 
                    class="btn btn-sm btn-poll-opt" 
                    :class="{ active: pollingInterval === sec }"
                    @click="changePollingInterval(sec)">
                    {{ sec === 0 ? '⏸️ 停止刷新' : sec + ' 秒' }}
                  </button>
                </div>
                <div class="form-hint">修改后，仪表盘看板及性能监控数据将按照此时间间隔定期拉取最新协作状态。</div>
              </div>
            </div>

            <!-- 性能模式 -->
            <div class="settings-subsection" style="margin-top:24px">
              <h4 class="sub-title">⚡ 极速 GPU 硬件加速模式</h4>
              <div class="form-group row-checkbox">
                <label class="switch-label">
                  <input type="checkbox" v-model="isLowPerf" @change="changePerformanceMode" class="switch-input">
                  <span class="switch-slider"></span>
                  <div class="switch-text-block">
                    <span class="switch-text">启用低配硬件渲染加速</span>
                    <span class="switch-hint">（开启后将禁用全站毛玻璃磨砂 `backdrop-filter` 以及复杂的交互悬停缩放，能极大地为核显设备降温和提速）</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </transition>

        <!-- SECTION RAG: 本地知识库与文档问答 (RAG) -->
        <transition name="fade" mode="out-in">
          <div v-if="activeSection === 'knowledge'" class="settings-card">
            <div class="card-header">
              <span class="icon">📚</span>
              <div>
                <div class="card-title">本地知识库与文档问答 (RAG)</div>
                <div class="card-desc">上传本地开发文档和知识库，全局助手将在对话时自动检索匹配，作为大模型推理的参考上下文。</div>
              </div>
            </div>

            <!-- 上传部分 -->
            <div class="settings-subsection">
              <h4 class="sub-title">📥 上传新知识文档</h4>
              <div class="upload-dropzone" style="border: 2px dashed rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 24px; text-align: center; background: rgba(255, 255, 255, 0.02); transition: border-color 0.3s; position: relative;">
                <input type="file" multiple @change="uploadKnowledgeFile" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer;" :disabled="knowledgeLoading" />
                <div class="upload-inner" style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                  <span style="font-size: 32px;">📄</span>
                  <span style="font-size: 14px; color: var(--text-color, #ccc);">点击或拖拽文件到此处上传</span>
                  <span style="font-size: 12px; color: var(--text-muted, #888);">支持 .md, .txt, .js, .ts, .json, .java, .py, .go 等文本格式</span>
                </div>
              </div>
              <div v-if="knowledgeLoading" class="loading-bar" style="margin-top: 12px; font-size: 14px; color: var(--text-color, #ccc); display: flex; align-items: center; gap: 8px;">
                <span class="spinner-icon" style="animation: spin 1s linear infinite;">🔄</span> 正在解析并为文档构建索引中，请稍候...
              </div>
            </div>

            <!-- 文档列表 -->
            <div class="settings-subsection" style="margin-top: 24px;">
              <h4 class="sub-title">🗂️ 已归档的文档列表 ({{ knowledgeFiles.length }})</h4>
              <div v-if="knowledgeFiles.length === 0" class="empty-state" style="padding: 32px; text-align: center; color: var(--text-muted, #888); background: rgba(0,0,0,0.1); border-radius: 8px;">
                暂无已归档文档，请在上方上传文档以建立本地知识库。
              </div>
              <div v-else class="file-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto;">
                <div v-for="file in knowledgeFiles" :key="file.name" class="file-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 6px;">
                  <div class="file-info" style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                    <span style="font-size: 18px;">📄</span>
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      <div class="file-name" style="font-size: 14px; font-weight: 500; color: #eee;" :title="file.name">{{ file.name }}</div>
                      <div class="file-meta" style="font-size: 12px; color: #888;">
                        大小: {{ (file.size / 1024).toFixed(2) }} KB | 分片数: {{ file.chunksCount }} | 上传时间: {{ new Date(file.uploadedAt).toLocaleString() }}
                      </div>
                    </div>
                  </div>
                  <button class="btn btn-danger btn-sm" @click="deleteKnowledgeFile(file.name)" style="padding: 4px 10px; font-size: 12px;">
                    🗑️ 删除
                  </button>
                </div>
              </div>
            </div>

            <!-- 检索匹配测试 -->
            <div class="settings-subsection" style="margin-top: 24px;">
              <h4 class="sub-title">🔍 知识库相似度检索测试</h4>
              <div class="search-test-box" style="display: flex; gap: 8px; margin-bottom: 12px;">
                <input v-model="searchQuery" type="text" placeholder="输入你想测试检索的查询，如：'飞书通知配置'..." class="form-control" style="flex: 1; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 8px 12px; border-radius: 6px;" @keyup.enter="testKnowledgeQuery" />
                <button class="btn btn-primary" :disabled="isSearching" @click="testKnowledgeQuery" style="display: flex; align-items: center; gap: 6px;">
                  <span v-if="isSearching">🌀 检索中...</span>
                  <span v-else>🔍 检索匹配</span>
                </button>
              </div>

              <!-- 检索结果 -->
              <div v-if="searchResults" class="search-results-panel" style="background: rgba(0,0,0,0.2); border-radius: 8px; padding: 16px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="font-size: 13px; color: #888; margin-bottom: 12px; display: flex; justify-content: space-between;">
                  <span>检索成功，匹配到 {{ searchResults.results?.length || 0 }} 个高相关分片</span>
                  <span>用时: {{ searchResults.elapsedMs }}ms</span>
                </div>
                <div v-if="!searchResults.results || searchResults.results.length === 0" style="color: #ff9800; font-size: 14px; text-align: center; padding: 16px;">
                  没有找到匹配的知识分片。请确认查询内容或重新上传相关文档。
                </div>
                <div v-else style="display: flex; flex-direction: column; gap: 12px; max-height: 350px; overflow-y: auto;">
                  <div v-for="(res, idx) in searchResults.results" :key="idx" style="background: rgba(255,255,255,0.02); border-left: 3px solid #00bcd4; padding: 10px 12px; border-radius: 0 4px 4px 0;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #aaa; margin-bottom: 6px;">
                      <span>📄 来源: <strong>{{ res.source }}</strong></span>
                      <span style="color: #00bcd4; font-weight: bold;">得分: {{ res.score.toFixed(4) }}</span>
                    </div>
                    <pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px; color: #ddd; background: rgba(0,0,0,0.15); padding: 8px; border-radius: 4px; margin: 0;">{{ res.text }}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </transition>

        <!-- SECTION 4: 系统信息及重置 -->
        <transition name="fade" mode="out-in">
          <div v-if="activeSection === 'system'" class="settings-card">
            <div class="card-header">
              <span class="icon">ℹ️</span>
              <div>
                <div class="card-title">系统信息与配置清理</div>
                <div class="card-desc">查看平台基础指标数据，或在此一键将系统所有本地偏好恢复至出厂状态</div>
              </div>
            </div>

            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">控制台版本</div>
                <div class="info-value">v1.0.8</div>
              </div>
              <div class="info-item">
                <div class="info-label">核心底层框架</div>
                <div class="info-value">Vue 3 + Vite</div>
              </div>
              <div class="info-item">
                <div class="info-label">监控节点项目</div>
                <div class="info-value">{{ projects.length }} 个节点</div>
              </div>
              <div class="info-item">
                <div class="info-label">核心进程状态</div>
                <div class="info-value text-green">ONLINE</div>
              </div>
            </div>

            <div class="system-cleanup-section">
              <h4 class="cleanup-title">⚠️ 危险区域 (Danger Zone)</h4>
              <div class="cleanup-card">
                <div class="cleanup-left">
                  <span class="cleanup-label">清除全部本地存储并恢复默认</span>
                  <span class="cleanup-desc">这将永久清除存储于本地浏览器的全部菜单排版顺序、新增自定义外部链接、自定义分组、主题颜色配置以及刷新缓存，立即重启至初始状态。</span>
                </div>
                <button class="btn btn-danger" @click="clearSystemCache">🗑️ 恢复出厂设置</button>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <div v-if="showQr" class="modal-overlay" @click.self="showQr = false">
      <div class="modal control-bot-qr-modal">
        <button class="modal-close" @click="showQr = false">&times;</button>
        <h3>🤖 扫码配置飞书控制机器人</h3>
        <p class="modal-desc">扫码会自动创建/授权飞书应用，并把 App ID / Secret 写入全局控制机器人配置；收消息使用 cc-connect 的 WebSocket 长连接。</p>

        <div class="qr-setup-layout">
          <div class="qr-preview">
            <img v-if="qrImage" :src="qrImage" alt="飞书扫码二维码">
            <div v-else class="qr-area">
              <div class="qr-phone">📱</div>
              <div class="qr-hint">等待生成二维码</div>
            </div>
          </div>
          <div class="qr-setup-copy">
            <ol>
              <li>点击“生成扫码链接”</li>
              <li>用飞书 App 扫码并完成授权</li>
              <li>授权后自动回填控制机器人 App ID / Secret</li>
              <li>确认飞书应用事件订阅使用 WebSocket 长连接模式</li>
            </ol>
            <a v-if="qrUrl" class="scan-link" :href="qrUrl" target="_blank" rel="noreferrer">打开扫码链接</a>
            <div v-if="qrStatus" class="qr-status-text">{{ qrStatus }}</div>
          </div>
        </div>

        <div class="btn-actions">
          <button class="btn btn-primary" @click="startControlBotQrSetup" :disabled="qrLoading">
            {{ qrLoading ? '等待扫码中...' : '生成扫码链接' }}
          </button>
          <button class="btn btn-outline" @click="showQr = false">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings { padding: 24px; overflow-y: auto; height: 100%; }
.settings-layout { 
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 24px;
  max-width: 1200px;
  margin: 0;
}

/* 左导航 */
.settings-sidebar {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: fit-content;
}
.sidebar-header {
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(0,0,0,0.03);
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sidebar-header h3 { margin: 0; font-size: 13.5px; font-weight: 700; color: var(--text-primary); }
.version-tag { font-size: 9px; padding: 1px 5px; background: rgba(59, 130, 246, 0.08); color: var(--accent-blue); border-radius: 4px; font-family: 'Orbitron', monospace; font-weight: bold; }

.nav-list { display: flex; flex-direction: column; gap: 4px; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease-in-out;
}
.nav-item:hover {
  background: rgba(15, 23, 42, 0.03);
  color: var(--text-primary);
}
.nav-item.active {
  background: var(--gradient-blue);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

/* 右面板 */
.settings-panels {
  min-height: 480px;
}
.settings-card { 
  background: rgba(255, 255, 255, 0.45); 
  backdrop-filter: blur(25px); 
  border: 1px solid rgba(0, 0, 0, 0.04); 
  border-radius: 16px; 
  padding: 24px; 
  box-shadow: 0 8px 32px 0 rgba(15, 23, 42, 0.03); 
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.card-header { display: flex; align-items: center; gap: 12px; }
.icon { font-size: 28px; }
.card-title { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.card-desc { font-size: 11.5px; color: var(--text-muted); margin-top: 3px; }

/* 玻璃指示框 */
.status-box { 
  padding: 14px 16px; 
  border-radius: 12px; 
  display: flex; 
  align-items: center; 
  gap: 12px;
  position: relative;
  overflow: hidden;
}
.status-box.success { background: rgba(34, 197, 94, 0.06); border: 1px solid rgba(34, 197, 94, 0.12); }
.status-box.warning { background: rgba(234, 179, 8, 0.06); border: 1px solid rgba(234, 179, 8, 0.12); }
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  position: relative;
}
.success .status-dot { background: var(--accent-green); box-shadow: 0 0 8px var(--accent-green); animation: pulse-green 1.5s infinite alternate; }
.warning .status-dot { background: var(--accent-yellow); box-shadow: 0 0 8px var(--accent-yellow); animation: pulse-yellow 1.5s infinite alternate; }

@keyframes pulse-green { from { opacity: 0.5; } to { opacity: 1; } }
@keyframes pulse-yellow { from { opacity: 0.5; } to { opacity: 1; } }

.status-content { display: flex; flex-direction: column; gap: 2px; }
.status-title { font-size: 12.5px; font-weight: 700; color: var(--text-primary); }
.status-desc { font-size: 11px; color: var(--text-muted); }

/* 开关样式 */
.switch-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}
.switch-input { display: none; }
.switch-slider {
  width: 36px;
  height: 20px;
  background: rgba(0,0,0,0.1);
  border-radius: 10px;
  position: relative;
  transition: all 0.25s;
}
.switch-slider::before {
  content: '';
  width: 14px;
  height: 14px;
  background: #ffffff;
  border-radius: 50%;
  position: absolute;
  top: 3px;
  left: 3px;
  transition: all 0.25s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.switch-input:checked + .switch-slider { background: var(--accent-blue); }
.switch-input:checked + .switch-slider::before { left: 19px; }
.switch-text { font-size: 12.5px; font-weight: 700; color: var(--text-secondary); }
.switch-text-block { display: flex; flex-direction: column; gap: 2px; }
.switch-hint { font-size: 10.5px; color: var(--text-muted); }

/* 表单结构 */
.form-split { display: grid; grid-template-columns: 1fr 180px; gap: 20px; }
.form-form { display: flex; flex-direction: column; gap: 12px; }
.feishu-direct-form { max-width: 870px; }
.channel-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.channel-option {
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 12px 14px;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 5px;
  cursor: pointer;
  color: var(--text-primary);
  transition: all 0.18s ease;
}
.channel-option strong { font-size: 13px; }
.channel-option span { font-size: 11px; color: var(--text-muted); line-height: 1.45; }
.channel-option.active {
  border-color: var(--accent-blue);
  background: rgba(59, 130, 246, 0.08);
  box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.12) inset;
}
.receiver-grid { display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 12px; }
.direct-steps { margin-top: 4px; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; background: rgba(59, 130, 246, 0.04); }
.control-bot-section {
  margin-top: 22px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.control-bot-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.control-bot-heading h4 { margin: 0 0 5px; font-size: 15px; color: var(--text-primary); }
.control-bot-heading p { margin: 0; font-size: 12px; line-height: 1.55; color: var(--text-muted); }
.control-bot-state { flex: 0 0 auto; padding: 4px 9px; border-radius: 6px; font-size: 11px; font-weight: 700; }
.control-bot-state.ready { color: #087f5b; background: #e8f8f1; }
.control-bot-state.pending { color: #9a6700; background: #fff5d6; }
.control-bot-quick-setup {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 14px;
  border: 1px solid rgba(59, 130, 246, 0.18);
  border-radius: 12px;
  background: rgba(59, 130, 246, 0.06);
}
.control-bot-quick-setup strong { display: block; font-size: 13px; color: var(--text-primary); margin-bottom: 4px; }
.control-bot-quick-setup span { display: block; font-size: 11.5px; line-height: 1.5; color: var(--text-muted); }
.websocket-mode-note {
  padding: 11px 13px;
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 10px;
  background: rgba(16, 185, 129, 0.06);
}
.websocket-mode-note strong { display: block; margin-bottom: 4px; color: var(--text-primary); font-size: 12.5px; }
.websocket-mode-note span { display: block; color: var(--text-muted); font-size: 11.5px; line-height: 1.55; }
.control-bot-runtime {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.45);
}
.control-bot-runtime.running { border-color: rgba(16, 185, 129, 0.24); background: rgba(16, 185, 129, 0.07); }
.control-bot-runtime.stopped { border-color: rgba(245, 158, 11, 0.24); background: rgba(245, 158, 11, 0.06); }
.control-bot-runtime strong { display: block; font-size: 12.5px; color: var(--text-primary); margin-bottom: 4px; }
.control-bot-runtime span { display: block; font-size: 11.5px; color: var(--text-muted); }
.runtime-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.callback-field { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
.callback-copy { min-width: 64px; }
.auth-steps code { font-family: Consolas, monospace; font-size: 10px; }
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.18); backdrop-filter: blur(12px); display: flex; align-items: center; justify-content: center; z-index: 10001; }
.modal { background: rgba(255, 255, 255, 0.78) !important; backdrop-filter: blur(30px) !important; border: 1px solid rgba(0, 0, 0, 0.06) !important; border-radius: 16px !important; padding: 28px; width: min(560px, calc(100vw - 32px)); position: relative; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08), 0 0 30px rgba(59, 130, 246, 0.04) !important; max-height: 88vh; overflow-y: auto; }
.modal-close { position: absolute; top: 16px; right: 16px; width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.05); background: rgba(0,0,0,0.02); color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.modal h3 { margin: 0 0 8px; font-size: 16px; color: var(--text-primary); }
.modal-desc { margin: 0 0 18px; font-size: 12px; line-height: 1.6; color: var(--text-muted); }
.qr-setup-layout { display: grid; grid-template-columns: 170px minmax(0, 1fr); gap: 18px; align-items: center; margin-bottom: 18px; }
.qr-preview { display: flex; justify-content: center; }
.qr-preview img { width: 160px; height: 160px; object-fit: contain; border: 1px solid var(--border-color); border-radius: 12px; background: white; padding: 8px; }
.qr-setup-copy ol { margin: 0 0 12px; padding-left: 18px; font-size: 12px; line-height: 1.8; color: var(--text-secondary); }
.scan-link { display: inline-flex; margin-bottom: 10px; font-size: 12px; color: var(--accent-blue); text-decoration: none; font-weight: 700; }
@media (max-width: 760px) {
  .control-bot-heading { align-items: stretch; flex-direction: column; }
  .control-bot-state { align-self: flex-start; }
  .control-bot-section .form-grid { grid-template-columns: 1fr; }
  .control-bot-quick-setup { align-items: stretch; flex-direction: column; }
  .control-bot-runtime { align-items: stretch; flex-direction: column; }
  .runtime-actions { justify-content: flex-start; }
  .callback-field { grid-template-columns: 1fr; }
  .qr-setup-layout { grid-template-columns: 1fr; }
}
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 11.5px; font-weight: 700; color: var(--text-muted); }
.form-hint { font-size: 10.5px; color: var(--text-muted); }
.link-styled { color: var(--accent-blue); text-decoration: none; font-weight: 600; }
.link-styled:hover { text-decoration: underline; }

.tech-input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.8);
  color: var(--text-primary);
  font-size: 12.5px;
  outline: none;
  transition: all 0.2s;
  font-family: inherit;
}
.tech-input:focus {
  border-color: rgba(59, 130, 246, 0.4);
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.1);
  background: #ffffff;
}
textarea.tech-input { resize: vertical; line-height: 1.5; }

/* 扫码列 */
.qr-col { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; }
.qr-area {
  width: 150px;
  height: 150px;
  border: 2px dashed rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.45);
}
.qr-area:hover {
  border-color: var(--accent-blue);
  background: rgba(59, 130, 246, 0.03);
}
.qr-phone { font-size: 32px; opacity: 0.5; }
.qr-hint { font-size: 10.5px; color: var(--text-muted); font-weight: 600; }
.qr-status-text { font-size: 10px; color: var(--text-muted); text-align: center; }

/* 授权细节行 */
.auth-section { border-top: 1px solid rgba(0,0,0,0.03); padding-top: 14px; }
.auth-status-row { display: flex; justify-content: space-between; align-items: center; }
.auth-user-badge { font-size: 12px; font-weight: 700; color: var(--accent-green); background: rgba(34,197,94,0.08); padding: 4px 10px; border-radius: 6px; }
.auth-steps h5 { margin: 0 0 6px 0; font-size: 11.5px; font-weight: 700; color: var(--text-primary); }
.auth-steps ul { margin: 0; padding-left: 16px; font-size: 10.5px; color: var(--text-muted); line-height: 1.6; }

/* 主 Agent 测试区域 */
.test-orchestrator-section { display: flex; flex-direction: column; gap: 12px; border-top: 1px solid rgba(0,0,0,0.03); padding-top: 14px; }
.orchestrator-test-result {
  padding: 12px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.88);
  color: #dbeafe;
  white-space: pre-wrap;
  font-size: 11.5px;
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
  font-family: 'JetBrains Mono', monospace;
}

.diagnostics-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(59, 130, 246, 0.12);
  background: rgba(255,255,255,0.5);
}
.diagnostics-panel.ready { border-color: rgba(34,197,94,0.18); background: rgba(34,197,94,0.05); }
.diagnostics-panel.partial { border-color: rgba(234,179,8,0.2); background: rgba(234,179,8,0.05); }
.diagnostics-panel.blocked { border-color: rgba(239,68,68,0.18); background: rgba(239,68,68,0.05); }
.auto-dev-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 14px; border-radius: 10px; background: rgba(255,255,255,0.82); border: 1px solid rgba(15,23,42,0.06); }
.auto-dev-main { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.auto-dev-eyebrow { color: var(--accent-blue); font-size: 11px; font-weight: 800; }
.auto-dev-main h3 { margin: 0; color: var(--text-primary); font-size: 18px; line-height: 1.3; }
.auto-dev-main p { margin: 0; color: var(--text-secondary); font-size: 12px; line-height: 1.55; overflow-wrap: anywhere; }
.auto-dev-status { flex: 0 0 auto; padding: 6px 10px; border-radius: 8px; font-size: 12px; font-weight: 900; background: rgba(15,23,42,0.08); color: var(--text-primary); }
.auto-dev-status.ready { background: rgba(34,197,94,0.12); color: var(--accent-green); }
.auto-dev-status.partial { background: rgba(234,179,8,0.16); color: #854d0e; }
.auto-dev-status.blocked { background: rgba(239,68,68,0.12); color: #b91c1c; }
.auto-dev-summary { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 12px; border-radius: 9px; border: 1px solid rgba(15,23,42,0.06); background: rgba(255,255,255,0.72); }
.auto-dev-summary-copy { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.auto-dev-summary-copy strong { color: var(--text-primary); font-size: 13px; }
.auto-dev-summary-copy span { color: var(--text-secondary); font-size: 11.5px; line-height: 1.5; overflow-wrap: anywhere; }
.auto-dev-summary b { flex: 0 0 auto; padding: 4px 8px; border-radius: 7px; background: rgba(15,23,42,0.08); color: var(--text-primary); font-size: 11px; }
.auto-dev-summary.blocked { border-color: rgba(239,68,68,0.18); }
.auto-dev-summary.ready_to_dispatch, .auto-dev-summary.ready_to_continue { border-color: rgba(34,197,94,0.2); }
.auto-dev-checklist { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.auto-dev-check { min-width: 0; display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; padding: 10px; border-radius: 8px; border: 1px solid rgba(15,23,42,0.06); background: rgba(255,255,255,0.74); }
.auto-dev-check div { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.auto-dev-check strong { color: var(--text-primary); font-size: 11.5px; }
.auto-dev-check span { color: var(--text-muted); font-size: 10.5px; line-height: 1.45; overflow-wrap: anywhere; }
.auto-dev-check b { flex: 0 0 auto; color: var(--text-primary); font-size: 12px; }
.auto-dev-check.ok { border-color: rgba(34,197,94,0.2); }
.auto-dev-check.ok b { color: var(--accent-green); }
.auto-dev-check.warn { border-color: rgba(234,179,8,0.24); }
.auto-dev-check.warn b { color: #854d0e; }
.auto-dev-check.fail { border-color: rgba(239,68,68,0.22); }
.auto-dev-check.fail b { color: #b91c1c; }
.auto-dev-check.muted { opacity: 0.74; }
.auto-dev-next-actions { display: grid; gap: 5px; padding: 10px; border-radius: 8px; background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.12); }
.auto-dev-next-actions strong { color: var(--text-primary); font-size: 12px; }
.auto-dev-next-actions ul { margin: 0; padding-left: 18px; color: var(--text-secondary); font-size: 11.5px; line-height: 1.55; }
.auto-dev-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.auto-dev-controls span { color: var(--text-muted); font-size: 11px; line-height: 1.45; }
.auto-dev-run-results { display: grid; gap: 6px; }
.diagnostics-section-title { margin-top: 2px; color: var(--text-primary); font-size: 12px; font-weight: 900; }
.diagnostics-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.diagnostics-title { font-size: 12.5px; font-weight: 800; color: var(--text-primary); }
.diagnostics-summary { margin-top: 2px; font-size: 11px; color: var(--text-secondary); line-height: 1.5; }
.diagnostics-badge {
  flex: 0 0 auto;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
  background: rgba(15, 23, 42, 0.08);
  color: var(--text-primary);
}
.diagnostics-counts { display: flex; flex-wrap: wrap; gap: 6px; }
.diagnostics-counts span {
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(255,255,255,0.72);
  color: var(--text-muted);
  font-size: 10.5px;
  font-weight: 700;
}
.autopilot-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  background: rgba(255,255,255,0.72);
}
.autopilot-box.blocked { border-color: rgba(239,68,68,0.18); }
.autopilot-box.ready_to_continue { border-color: rgba(14,165,233,0.2); }
.autopilot-box.ready_to_dispatch { border-color: rgba(34,197,94,0.2); }
.autopilot-box.ready_to_import { border-color: rgba(59,130,246,0.18); }
.autopilot-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.autopilot-head div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.autopilot-head strong { font-size: 12px; color: var(--text-primary); }
.autopilot-head span { font-size: 11px; color: var(--text-secondary); line-height: 1.45; overflow-wrap: anywhere; }
.autopilot-head b { flex: 0 0 auto; padding: 3px 7px; border-radius: 6px; background: rgba(15,23,42,0.08); color: var(--text-primary); font-size: 10.5px; }
.autopilot-metrics { display: flex; flex-wrap: wrap; gap: 6px; }
.autopilot-metrics span,
.autopilot-cron span {
  padding: 3px 7px;
  border-radius: 6px;
  background: rgba(59,130,246,0.08);
  color: var(--text-secondary);
  font-size: 10.5px;
  font-weight: 700;
}
.autopilot-actions { display: grid; gap: 4px; }
.autopilot-actions strong { font-size: 11px; color: var(--text-primary); }
.autopilot-actions ul { margin: 0; padding-left: 18px; color: var(--text-secondary); font-size: 11px; line-height: 1.55; }
.autopilot-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.autopilot-controls span { color: var(--text-muted); font-size: 11px; }
.autopilot-run-result { display: flex; flex-wrap: wrap; gap: 6px; }
.autopilot-run-result span { padding: 3px 7px; border-radius: 6px; background: rgba(34,197,94,0.08); color: var(--accent-green); font-size: 10.5px; font-weight: 800; }
.autopilot-outcome { padding: 8px; border-radius: 8px; background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.12); }
.autopilot-outcome.blocked { background: rgba(234,179,8,0.08); border-color: rgba(234,179,8,0.24); }
.autopilot-outcome strong { display: block; color: var(--text-primary); font-size: 11.5px; margin-bottom: 4px; }
.autopilot-readiness-message { margin: 0 0 4px; color: var(--text-secondary); font-size: 11px; line-height: 1.5; overflow-wrap: anywhere; }
.autopilot-outcome ul { margin: 0; padding-left: 18px; color: var(--text-secondary); font-size: 11px; line-height: 1.5; }
.autopilot-cron { display: flex; flex-wrap: wrap; gap: 6px; }
.agent-probe-matrix {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  background: rgba(255,255,255,0.72);
}
.agent-probe-matrix-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.agent-probe-actions { flex: 0 0 auto; display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.agent-probe-batch-result { display: flex; flex-wrap: wrap; gap: 6px; }
.agent-probe-batch-result span { padding: 3px 7px; border-radius: 6px; background: rgba(14,165,233,0.08); color: var(--text-secondary); font-size: 10.5px; font-weight: 800; }
.agent-probe-matrix-head div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.agent-probe-matrix-head strong { font-size: 12px; color: var(--text-primary); }
.agent-probe-matrix-head span { font-size: 11px; color: var(--text-secondary); }
.agent-probe-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 7px; }
.agent-probe-row {
  min-width: 0;
  display: grid;
  grid-template-columns: 64px 1fr auto;
  grid-template-areas: "state main time" "state sub sub";
  align-items: center;
  gap: 3px 8px;
  padding: 8px;
  border-radius: 7px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(248,250,252,0.84);
  text-align: left;
  cursor: pointer;
}
.agent-probe-row.active { box-shadow: 0 0 0 2px rgba(59,130,246,0.18); }
.agent-probe-row.ok { border-color: rgba(34,197,94,0.22); }
.agent-probe-row.warn { border-color: rgba(234,179,8,0.28); }
.agent-probe-row.fail { border-color: rgba(239,68,68,0.22); }
.agent-probe-state { grid-area: state; justify-self: start; padding: 3px 6px; border-radius: 5px; background: #64748b; color: #fff; font-size: 10px; font-weight: 800; white-space: nowrap; }
.agent-probe-row.ok .agent-probe-state { background: var(--accent-green); }
.agent-probe-row.warn .agent-probe-state { background: var(--accent-yellow); color: #422006; }
.agent-probe-row.fail .agent-probe-state { background: #ef4444; }
.agent-probe-main { grid-area: main; min-width: 0; color: var(--text-primary); font-size: 11.5px; font-weight: 800; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agent-probe-sub { grid-area: sub; min-width: 0; color: var(--text-muted); font-size: 10.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agent-probe-time { grid-area: time; color: var(--text-muted); font-size: 10px; white-space: nowrap; }
.diagnostics-list { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.diagnostic-item {
  min-width: 0;
  display: flex;
  gap: 8px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  background: rgba(255,255,255,0.68);
}
.diagnostic-state {
  flex: 0 0 auto;
  width: 36px;
  text-align: center;
  padding: 2px 4px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 800;
  color: #ffffff;
  background: #64748b;
  align-self: flex-start;
}
.diagnostic-item.ok .diagnostic-state { background: var(--accent-green); }
.diagnostic-item.warn .diagnostic-state { background: var(--accent-yellow); color: #422006; }
.diagnostic-item.fail .diagnostic-state { background: #ef4444; }
.diagnostic-copy { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.diagnostic-label { font-size: 11.5px; font-weight: 800; color: var(--text-primary); }
.diagnostic-message { font-size: 10.5px; line-height: 1.5; color: var(--text-secondary); overflow-wrap: anywhere; }
.runner-detail {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-radius: 7px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  background: rgba(248, 250, 252, 0.78);
}
.runner-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 8px;
}
.runner-grid span,
.runner-error,
.runner-hint,
.runner-node-error {
  min-width: 0;
  font-size: 10px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.runner-grid span {
  color: var(--text-muted);
  font-weight: 700;
}
.runner-error {
  color: #b91c1c;
  font-family: 'JetBrains Mono', monospace;
}
.runner-probe {
  color: var(--text-secondary);
  font-weight: 700;
}
.runner-probe.ok { color: #047857; }
.runner-probe.fail { color: #b91c1c; }
.runner-actions {
  margin: 2px 0 0 16px;
  padding: 0;
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.runner-actions li + li { margin-top: 2px; }
.worker-protocol-detail {
  margin-top: 6px;
  display: grid;
  gap: 6px;
  padding: 8px;
  border-radius: 7px;
  border: 1px solid rgba(59, 130, 246, 0.12);
  background: rgba(59, 130, 246, 0.06);
}
.worker-protocol-title {
  font-size: 10.5px;
  font-weight: 800;
  color: var(--text-primary);
}
.worker-protocol-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.worker-protocol-grid span {
  padding: 2px 6px;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 800;
  overflow-wrap: anywhere;
}
.worker-protocol-grid span.ok {
  background: rgba(34, 197, 94, 0.1);
  color: var(--accent-green);
}
.worker-protocol-grid span.fail {
  background: rgba(239, 68, 68, 0.1);
  color: var(--accent-red);
}
.recovery-monitor-detail {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-radius: 7px;
  border: 1px solid rgba(34, 197, 94, 0.12);
  background: rgba(240, 253, 244, 0.62);
}
.verification-detail {
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px;
  border-radius: 7px;
  border: 1px solid rgba(59, 130, 246, 0.12);
  background: rgba(239, 246, 255, 0.72);
}
.verification-members {
  display: grid;
  gap: 5px;
}
.verification-member {
  display: grid;
  grid-template-columns: minmax(76px, 0.8fr) minmax(88px, 1fr);
  gap: 2px 8px;
  align-items: start;
  padding: 6px;
  border-radius: 6px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  background: rgba(255, 255, 255, 0.66);
}
.verification-member strong,
.verification-member span,
.verification-member code {
  min-width: 0;
  overflow-wrap: anywhere;
}
.verification-member strong {
  color: var(--text-primary);
  font-size: 10.5px;
}
.verification-member span {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 700;
}
.verification-member code {
  grid-column: 1 / -1;
  color: #075985;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  line-height: 1.45;
}
.verification-member.missing code { color: #b45309; }
.verification-member.configured { border-color: rgba(34, 197, 94, 0.16); }
.verification-member.inferred { border-color: rgba(59, 130, 246, 0.16); }
.verification-member.missing { border-color: rgba(234, 179, 8, 0.22); }
.runner-hint {
  color: #075985;
  font-weight: 700;
}
.runner-node-error {
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
}
.execution-recovery {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(234, 179, 8, 0.24);
  background: rgba(234, 179, 8, 0.08);
}
.execution-recovery-head {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.execution-recovery-head strong {
  font-size: 12px;
  color: #854d0e;
}
.execution-recovery-head span {
  font-size: 10.5px;
  color: var(--text-secondary);
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.execution-recovery ol {
  margin: 0;
  padding-left: 18px;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.65;
}
.execution-recovery code {
  padding: 1px 5px;
  border-radius: 5px;
  background: rgba(15,23,42,0.08);
  color: var(--text-primary);
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
}
.rehearsal-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255,255,255,0.62);
  border: 1px solid rgba(15,23,42,0.08);
}
.rehearsal-box.ok { border-color: rgba(34,197,94,0.2); }
.rehearsal-box.fail { border-color: rgba(239,68,68,0.2); }
.probe-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: rgba(255,255,255,0.62);
}
.probe-box.ok { border-color: rgba(34,197,94,0.2); }
.probe-box.fail { border-color: rgba(239,68,68,0.2); }
.probe-message {
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}
.probe-output {
  margin: 0;
  max-height: 120px;
  overflow: auto;
  padding: 8px;
  border-radius: 7px;
  background: rgba(15,23,42,0.06);
  color: var(--text-primary);
  font-size: 10px;
  line-height: 1.45;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.rehearsal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 11.5px;
  color: var(--text-primary);
}
.rehearsal-head span { color: var(--text-muted); font-weight: 700; }
.rehearsal-steps {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.rehearsal-steps span {
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 10.5px;
  line-height: 1.45;
  color: var(--text-secondary);
  background: rgba(255,255,255,0.72);
}
.rehearsal-steps span.ok { color: var(--accent-green); }
.rehearsal-steps span.fail { color: var(--accent-red); }
.smoke-task-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
}
.smoke-task-meta span {
  min-width: 0;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 10.5px;
  line-height: 1.45;
  color: var(--text-secondary);
  background: rgba(255,255,255,0.72);
  overflow-wrap: anywhere;
}

/* 主题预设网格 */
.settings-subsection { display: flex; flex-direction: column; gap: 10px; }
.sub-title { margin: 0; font-size: 12.5px; font-weight: 700; color: var(--text-primary); }
.preset-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
.preset-card {
  border: 1px solid rgba(0,0,0,0.04);
  background: rgba(255,255,255,0.4);
  padding: 8px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.preset-card:hover { transform: translateY(-2px); border-color: rgba(59, 130, 246, 0.15); background: rgba(255,255,255,0.7); }
.preset-card.active { border-color: var(--accent-blue); background: rgba(59, 130, 246, 0.03); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.08); }
.preset-preview {
  width: 100%;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.preset-label { font-size: 10.5px; font-weight: 700; color: var(--text-secondary); }

/* 主题预览色板 */
.bg-default { background: linear-gradient(135deg, #f8fafc, #cbd5e1); border: 1px solid rgba(0,0,0,0.06); }
.bg-void { background: linear-gradient(135deg, #1e293b, #0f172a); }
.bg-cyber { background: linear-gradient(135deg, #090514, #120e24); }
.bg-ocean { background: linear-gradient(135deg, #0f172a, #1e1b4b); }
.bg-aurora { background: linear-gradient(135deg, #f4fcf7, #e6f7ed); border: 1px solid rgba(16, 185, 129, 0.1); }

.dot-p { width: 6px; height: 6px; border-radius: 50%; }
.p-blue { background: #3b82f6; }
.p-gray { background: #64748b; }
.p-cyan { background: #06b6d4; }
.p-dark { background: #020617; }
.p-pink { background: #ec4899; }
.p-neon { background: #06b6d4; }
.p-indigo { background: #6366f1; }
.p-teal { background: #14b8a6; }
.p-aurora-g { background: #10b981; }
.p-aurora-w { background: #ffffff; }

/* 轮询刷新周期选项 */
.polling-options { display: flex; gap: 8px; flex-wrap: wrap; }
.btn-poll-opt {
  background: rgba(0,0,0,0.02);
  border: 1px solid rgba(0,0,0,0.04);
  color: var(--text-secondary);
  font-size: 11.5px;
  padding: 5px 12px;
  border-radius: 8px;
}
.btn-poll-opt.active {
  background: var(--gradient-blue);
  color: white;
  border-color: var(--accent-blue);
}

/* 系统信息及重置 */
.info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.info-item { padding: 12px; background: rgba(0,0,0,0.01); border: 1px solid rgba(0, 0, 0, 0.02); border-radius: 10px; text-align: center; }
.info-label { font-size: 10.5px; color: var(--text-muted); font-weight: 600; }
.info-value { font-size: 13px; color: var(--text-primary); margin-top: 4px; font-weight: 700; }
.text-green { color: var(--accent-green) !important; }

/* 危险区域 */
.system-cleanup-section { border-top: 1px solid rgba(0,0,0,0.03); padding-top: 16px; margin-top: 12px; }
.cleanup-title { margin: 0 0 10px 0; font-size: 12.5px; font-weight: 700; color: var(--accent-red); }
.cleanup-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(239, 68, 68, 0.03);
  border: 1px solid rgba(239, 68, 68, 0.08);
  border-radius: 12px;
  gap: 20px;
}
.cleanup-left { display: flex; flex-direction: column; gap: 4px; }
.cleanup-label { font-size: 12.5px; font-weight: 700; color: var(--text-primary); }
.cleanup-desc { font-size: 11px; color: var(--text-muted); line-height: 1.5; }

/* 按钮通用 */
.btn { padding: 8px 16px; border-radius: 10px; border: none; cursor: pointer; font-size: 12.5px; font-weight: 600; transition: all 0.2s; }
.btn-primary { background: var(--gradient-blue); color: #ffffff; }
.btn-primary:hover { opacity: 0.9; box-shadow: 0 4px 12px rgba(59,130,246,0.15); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-outline { background: transparent; border: 1px solid rgba(0, 0, 0, 0.08); color: var(--text-secondary); }
.btn-outline:hover { background: rgba(0,0,0,0.02); }
.btn-sm { padding: 5px 12px; font-size: 11.5px; border-radius: 8px; }
.btn-danger { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; white-space: nowrap; }
.btn-danger:hover { opacity: 0.9; box-shadow: 0 4px 12px rgba(239,68,68,0.15); }

.btn-actions { display: flex; gap: 8px; }

/* 过渡动画 */
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* 低性能 GPU 加速模式类覆盖 (用于 app 根节点) */
:global(.low-perf) * {
  backdrop-filter: none !important;
  animation-duration: 0.001s !important;
  transition-duration: 0.001s !important;
}

/* 暗色主题深度兼容 */
[data-theme="dark"] .settings-sidebar,
[data-theme="dark"] .settings-card,
[data-theme="dark"] .preset-card,
[data-theme="dark"] .info-item,
[data-theme="dark"] .qr-area {
  background: var(--surface) !important;
  border-color: var(--border-color) !important;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4) !important;
}
[data-theme="dark"] .sidebar-header {
  border-bottom-color: rgba(255,255,255,0.04) !important;
}
[data-theme="dark"] .nav-item:hover {
  background: rgba(255, 255, 255, 0.03);
}
[data-theme="dark"] .tech-input {
  background: var(--bg-primary) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
}
[data-theme="dark"] .btn-poll-opt {
  background: rgba(255,255,255,0.03);
  border-color: rgba(255,255,255,0.04);
  color: var(--text-muted);
}
[data-theme="dark"] .switch-slider {
  background: rgba(255,255,255,0.1);
}
[data-theme="dark"] .cleanup-card {
  background: rgba(239, 68, 68, 0.05);
  border-color: rgba(239, 68, 68, 0.15);
}
[data-theme="dark"] .diagnostics-panel,
[data-theme="dark"] .diagnostic-item,
[data-theme="dark"] .diagnostics-counts span,
[data-theme="dark"] .agent-probe-matrix,
[data-theme="dark"] .agent-probe-row {
  background: rgba(15, 23, 42, 0.45);
  border-color: var(--border-color);
}
[data-theme="dark"] .verification-detail,
[data-theme="dark"] .verification-member {
  background: rgba(15, 23, 42, 0.38);
  border-color: var(--border-color);
}

@media (max-width: 768px) {
  .settings-layout { grid-template-columns: 1fr; }
  .form-split { grid-template-columns: 1fr; }
  .receiver-grid, .channel-options { grid-template-columns: 1fr; }
  .qr-col { order: -1; }
  .info-grid { grid-template-columns: 1fr 1fr; }
  .diagnostics-head { flex-direction: column; }
  .diagnostics-list { grid-template-columns: 1fr; }
  .rehearsal-steps,
  .smoke-task-meta { grid-template-columns: 1fr; }
}
</style>







