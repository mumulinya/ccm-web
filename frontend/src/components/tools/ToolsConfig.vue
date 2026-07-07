<script setup>
import { ref, onMounted, computed } from 'vue'
import { toolsApi } from '../../api/index.js'
import { toast, confirmDialog } from '../../utils/toast.js'

const mcpTools = ref([])
const skills = ref([])
const customSkills = ref([]) // 本地物理加载的高级 Customization Skills
const currentFilter = ref('core') // 默认展示 'core' 内置工具
const toolStatus = ref({ mcp: [], skills: [], servers: [] })
const authorizationInventory = ref({ summary: { totalScopes: 0, projects: 0, groups: 0, configuredScopes: 0, ready: 0, needsAttention: 0, requestedMcp: 0, requestedSkill: 0, missingMcpServers: 0, missingMcpTools: 0, missingSkills: 0, invalidMcpGrants: 0, scopesWithRuntime: 0, scopesWithoutRuntime: 0, runtimeSnapshots: 0, runtimeOverallReady: 0, runtimeDeliveryReady: 0, runtimeCliReady: 0, runtimeCatalogStale: 0, runtimeDispatchBlocked: 0, runtimeNeedsResync: 0 }, scopes: [] })
const authorizationInventoryLoading = ref(false)
const runtimeReadiness = ref({ summary: { total: 0, ready: 0, deliveryReady: 0, runtimeReady: 0 }, readiness: [] })
const runtimeReadinessLoading = ref(false)
const runtimeResyncing = ref(false)
const authorizationRuntimeResyncing = ref('')
const toolInvocationAudit = ref({ summary: { totalReturned: 0, toolCalls: 0, successfulToolCalls: 0, failedToolCalls: 0, skillInvocations: 0, unauthorized: 0, loopsFinished: 0 }, items: [] })
const toolInvocationAuditLoading = ref(false)
const toolInvocationAuditFilter = ref({})
const toolChainVerification = ref({ summary: { totalScopes: 0, configuredScopes: 0, verified: 0, readyNotObserved: 0, needsAttention: 0, authorizationBlocked: 0, runtimeMissing: 0, runtimeNeedsResync: 0, unauthorizedAttempts: 0, observedInvocations: 0 }, gate: {}, rows: [] })
const toolChainVerificationLoading = ref(false)

// 抽屉状态
const showDrawer = ref(false)
const drawerSkill = ref(null)

// 折叠展开的 MCP 服务器列表
const expandedMcp = ref({})

// 商城与一键下载状态
const marketplaceItems = ref([])
const marketplaceSources = ref([])
const selectedSource = ref('local')
const marketplaceFilter = ref('all')
const customSourceUrl = ref('')
const customSourceLabel = ref('')
const loadedCustomSourceUrl = ref('')
const loadedCustomSourceLabel = ref('')
const smitheryKey = ref('')
const needSmitheryKey = ref(false)
const isSavingKey = ref(false)
const isSavingSource = ref(false)
const showMarketplacePreview = ref(false)
const marketplacePreview = ref(null)
const previewLoading = ref(false)
const marketplaceLastImpact = ref(null)
const marketplaceLastRuntimeImpact = ref(null)
const marketplaceLastRuntimeResync = ref(null)
const marketplaceOperations = ref([])
const marketplaceOperationsSummary = ref({ totalReturned: 0, actionCounts: {}, impactedScopes: 0, impactedRuntimeSnapshots: 0, runtimeResynced: 0, runtimeResyncFailed: 0, truncated: false })
const marketplaceOperationsLoading = ref(false)

// 弹窗状态
const showAddMcp = ref(false)
const showAddSkill = ref(false)

// 新建表单
const newMcp = ref({ name: '', description: '', command: '', env: '' })
const newSkill = ref({ name: '', description: '', prompt: '' })

// 静态定义的系统核心内置工具列表
const coreToolsList = [
  {
    name: 'view_file',
    emoji: '🔍',
    category: '文件 I/O',
    security: '受控授权',
    securityClass: 'sec-warning',
    desc: '读取并检索本地文件内容。支持普通文本文件的行段提取，以及图片、PDF、Word/Excel、音视频等媒体资源的底层预览与结构提取。',
    params: [
      { name: 'AbsolutePath', type: 'String (必填)', desc: '要查看文件的绝对物理路径。' },
      { name: 'StartLine', type: 'Number (可选)', desc: '查看文本文件时的起始行号（1-indexed）。' },
      { name: 'EndLine', type: 'Number (可选)', desc: '查看文本文件时的结束行号（1-indexed）。' }
    ],
    example: 'await view_file({ AbsolutePath: "C:/project/src/main.js", StartLine: 1, EndLine: 100 })'
  },
  {
    name: 'replace_file_content',
    emoji: '✏️',
    category: '代码重写',
    security: '写入确认',
    securityClass: 'sec-danger',
    desc: '对本地文件中的单个连续代码片段执行替换修改。需要提供完全精确的目标内容匹配（包含缩进和换行符），以防止代码错位。',
    params: [
      { name: 'TargetFile', type: 'String (必填)', desc: '目标文件的绝对路径。' },
      { name: 'TargetContent', type: 'String (必填)', desc: '要被替换的精确现有代码段（必须完全一致，包含缩进）。' },
      { name: 'ReplacementContent', type: 'String (必填)', desc: '替换后的完整 drop-in 代码内容。' }
    ],
    example: 'await replace_file_content({ TargetFile: "C:/src/app.js", TargetContent: "const a = 1;", ReplacementContent: "const a = 2;" })'
  },
  {
    name: 'run_command',
    emoji: '💻',
    category: '命令行执行',
    security: '高危确认',
    securityClass: 'sec-danger',
    desc: '在系统宿主环境下执行 shell 指令。支持 Windows PowerShell 及 Unix Bash，可接收实时输出并返回终端当前目录。',
    params: [
      { name: 'CommandLine', type: 'String (必填)', desc: '要在终端执行的完整命令行字符串。' },
      { name: 'Cwd', type: 'String (必填)', desc: '命令执行时的当前工作目录路径。' }
    ],
    example: 'await run_command({ CommandLine: "npm run test", Cwd: "C:/my-project" })'
  },
  {
    name: 'search_web',
    emoji: '🌐',
    category: '搜索引擎',
    security: '自动执行',
    securityClass: 'sec-success',
    desc: '无感调用搜索引擎检索外部互联网资源与最新技术文档。支持通过 query 词条进行多维度查询。',
    params: [
      { name: 'query', type: 'String (必填)', desc: '检索词或检索问题。' }
    ],
    example: 'await search_web({ query: "Vue 3 reactive read-only update logic" })'
  },
  {
    name: 'invoke_subagent',
    emoji: '🤖',
    category: '协同分工',
    security: '受控授权',
    securityClass: 'sec-warning',
    desc: '在后台创建并派发多名拥有特定角色分工的子 Agent 协作处理任务。可进行并发搜索或分布式编译。',
    params: [
      { name: 'Subagents', type: 'Array (必填)', desc: '子 Agent 的声明数组，包含 TypeName, Role, Prompt 等。' }
    ],
    example: 'await invoke_subagent({ Subagents: [{ TypeName: "research", Role: "代码审查员", Prompt: "审查 main.js" }] })'
  }
]

const loadTools = async () => {
  const [mcpData, skillData] = await Promise.all([
    toolsApi.mcp.list(),
    toolsApi.skills.list()
  ])
  mcpTools.value = (mcpData.tools || []).map(t => ({ ...t, type: 'mcp', enabled: t.enabled !== false }))
  skills.value = (skillData.skills || []).map(s => ({ ...s, type: 'skill', enabled: s.enabled !== false }))
  
  // 加载系统物理 Customization Skills
  try {
    const res = await toolsApi.skills.listCustomizations()
    if (res.success) {
      customSkills.value = res.skills || []
    }
  } catch (e) {
    console.error('加载系统高级技能失败:', e)
  }

  // 加载工具连接状态
  try {
    const res = await fetch('/api/tools/status')
    const data = await res.json()
    if (data.success) toolStatus.value = data
  } catch {}
  await Promise.all([
    loadRuntimeReadiness(false),
    loadAuthorizationInventory(),
    loadToolInvocationAudit(),
    loadToolChainVerification()
  ])

  // 重置激活状态
  needSmitheryKey.value = false
  await loadMarketplaceSources()
  await loadMarketplaceOperations()
  if (!['local', 'github', 'smithery', 'custom'].includes(selectedSource.value)
    && !marketplaceSources.value.some(source => source.id === selectedSource.value)) {
    selectedSource.value = 'local'
  }

  // 加载外部商城资源
  const sourceForLoad = selectedSource.value
  const customUrlForLoad = customSourceUrl.value.trim()
  const customLabelForLoad = customSourceLabel.value.trim()
  if (sourceForLoad !== 'custom') {
    loadedCustomSourceUrl.value = ''
    loadedCustomSourceLabel.value = ''
  }
  if (sourceForLoad === 'custom' && !customUrlForLoad) {
    marketplaceItems.value = []
    return
  }
  try {
    const res = await toolsApi.marketplace.list(sourceForLoad, customUrlForLoad)
    if (res.success) {
      if (res.needKey) {
        needSmitheryKey.value = true
        marketplaceItems.value = []
        try {
          const cfg = await toolsApi.smithery.getKey()
          if (cfg.key) smitheryKey.value = cfg.key
        } catch {}
      } else {
        if (sourceForLoad === 'custom' && customUrlForLoad) {
          loadedCustomSourceUrl.value = customUrlForLoad
          loadedCustomSourceLabel.value = customLabelForLoad
        }
        marketplaceItems.value = (res.items || []).map(item => ({
          ...item,
          installing: false,
          uninstalling: false,
          impactLoading: false,
          authorizationImpact: null,
          runtimeImpact: null,
          runtimeResync: null,
          previewing: false,
          sourceNeedsSave: sourceForLoad === 'custom' && !!customUrlForLoad
        }))
        if (res.error) {
          toast.warning(res.error)
        }
      }
    } else {
      toast.error(res.error || '获取商城列表失败')
    }
  } catch (e) {
    toast.error('获取商城列表失败: ' + e.message)
  }
}

const loadMarketplaceSources = async () => {
  const res = await toolsApi.marketplace.sources()
  if (res.success) {
    marketplaceSources.value = res.sources || []
  }
}

const loadMarketplaceOperations = async () => {
  marketplaceOperationsLoading.value = true
  try {
    const res = await toolsApi.marketplace.operations(20)
    if (res.success) {
      marketplaceOperations.value = res.items || []
      marketplaceOperationsSummary.value = res.summary || { totalReturned: 0, actionCounts: {}, impactedScopes: 0, impactedRuntimeSnapshots: 0, runtimeResynced: 0, runtimeResyncFailed: 0, truncated: false }
    }
  } catch (e) {
    console.error('加载商城操作审计失败:', e)
  } finally {
    marketplaceOperationsLoading.value = false
  }
}

const loadAuthorizationInventory = async () => {
  authorizationInventoryLoading.value = true
  try {
    const res = await toolsApi.authorizationInventory()
    if (res.success) {
      authorizationInventory.value = {
        generatedAt: res.generatedAt || '',
        summary: res.summary || authorizationInventory.value.summary,
        scopes: res.scopes || []
      }
    }
  } catch (e) {
    console.error('加载工具授权总览失败:', e)
  } finally {
    authorizationInventoryLoading.value = false
  }
}

const normalizeInvocationAuditFilter = (filter = {}) => {
  const payload = filter && typeof filter === 'object' ? filter : {}
  const normalized = {}
  ;['runtime', 'project', 'projectName', 'projectAlias', 'groupId', 'taskId', 'category', 'source'].forEach((key) => {
    if (payload[key]) normalized[key] = String(payload[key])
  })
  if (Array.isArray(payload.projectAliases) && payload.projectAliases.length) {
    normalized.projectAliases = payload.projectAliases.map(item => String(item)).filter(Boolean)
  }
  return normalized
}

const loadToolInvocationAudit = async (filter = undefined) => {
  toolInvocationAuditLoading.value = true
  try {
    const nextFilter = filter === undefined
      ? normalizeInvocationAuditFilter(toolInvocationAuditFilter.value)
      : normalizeInvocationAuditFilter(filter)
    toolInvocationAuditFilter.value = nextFilter
    const res = await toolsApi.invocationAudit({ limit: 80, ...nextFilter })
    if (res.success) {
      toolInvocationAudit.value = {
        summary: res.summary || toolInvocationAudit.value.summary,
        items: res.items || [],
        files: res.files || {},
        filters: res.filters || nextFilter
      }
    }
  } catch (e) {
    console.error('加载工具调用审计失败:', e)
  } finally {
    toolInvocationAuditLoading.value = false
  }
}

const loadToolChainVerification = async () => {
  toolChainVerificationLoading.value = true
  try {
    const res = await toolsApi.chainVerification()
    if (res.success) {
      toolChainVerification.value = {
        generatedAt: res.generatedAt || '',
        summary: res.summary || toolChainVerification.value.summary,
        gate: res.gate || {},
        rows: res.rows || []
      }
    }
  } catch (e) {
    console.error('加载工具链路验收失败:', e)
  } finally {
    toolChainVerificationLoading.value = false
  }
}

const loadRuntimeReadiness = async (deep = false) => {
  runtimeReadinessLoading.value = true
  try {
    const res = await toolsApi.runtimeReadiness(deep)
    if (res.success) runtimeReadiness.value = res
  } catch (e) {
    console.error('加载运行时就绪状态失败:', e)
  } finally {
    runtimeReadinessLoading.value = false
  }
}

const authorizationSummary = computed(() => authorizationInventory.value.summary || {})
const authorizationScopes = computed(() => authorizationInventory.value.scopes || [])
const authorizationMissingTotal = (row) => {
  const audit = row?.audit_summary || {}
  return Number(audit.missing_mcp_servers || 0)
    + Number(audit.missing_mcp_tools || 0)
    + Number(audit.missing_skills || 0)
    + Number(audit.invalid_mcp_grants || 0)
}

const authorizationScopeLabel = (scope) => scope === 'group' ? '群聊' : '项目'
const authorizationStatusLabel = (row) => row?.authorization_readiness?.dispatchReady === false ? '需处理' : '可派发'

const authorizationMissingText = (row) => {
  const audit = row?.audit_summary || {}
  const parts = []
  if (audit.missing_mcp_servers) parts.push(`MCP Server ${audit.missing_mcp_servers}`)
  if (audit.missing_mcp_tools) parts.push(`MCP Tool ${audit.missing_mcp_tools}`)
  if (audit.missing_skills) parts.push(`Skill ${audit.missing_skills}`)
  if (audit.invalid_mcp_grants) parts.push(`无效授权 ${audit.invalid_mcp_grants}`)
  return parts.length ? parts.join(' · ') : '无缺失'
}

const authorizationUnavailableRows = (row) => {
  const unavailable = row?.authorization_readiness?.unavailable || {}
  const mcpRows = Array.isArray(unavailable.mcp) ? unavailable.mcp : []
  const skillRows = Array.isArray(unavailable.skill) ? unavailable.skill : []
  return [
    ...mcpRows.map(item => ({
      type: 'MCP',
      name: item.tool ? `${item.server}/${item.tool}` : (item.server || item.raw || '-'),
      state: item.state || 'unknown'
    })),
    ...skillRows.map(item => ({
      type: 'Skill',
      name: item.name || '-',
      state: item.state || 'unknown'
    }))
  ].slice(0, 8)
}

const authorizationGrantPreview = (row, type) => {
  const grants = Array.isArray(row?.tools?.[type]) ? row.tools[type] : []
  return grants.slice(0, 8)
}

const authorizationGrantTitle = (row, type) => {
  const grants = Array.isArray(row?.tools?.[type]) ? row.tools[type] : []
  return grants.join(', ')
}

const authorizationRuntimeSummaryText = (row) => {
  const summary = row?.runtime?.summary || {}
  const total = Number(summary.total || 0)
  if (!total) return '暂无运行时快照'
  return `${Number(summary.overallReady || 0)}/${total} 可用 · 待处理 ${Number(summary.needsResync || 0)}`
}

const authorizationRuntimeStatusClass = (snapshot) => ({
  ready: snapshot?.overallReady === true,
  stale: snapshot?.catalogStale === true,
  blocked: snapshot?.dispatchReady === false || snapshot?.deliveryReady === false
})

const authorizationRuntimeStatusLabel = (snapshot) => {
  if (snapshot?.overallReady) return '可用'
  if (snapshot?.catalogStale) return '待重同步'
  if (snapshot?.dispatchReady === false) return '派发阻断'
  if (snapshot?.deliveryReady === false) return '交付异常'
  if (snapshot?.runtimeReady === false) return 'CLI 不可用'
  return '待检查'
}

const authorizationRuntimeTargetLabel = (snapshot) => {
  const project = snapshot?.projectName || '未关联项目'
  return snapshot?.groupId ? `${project} / 群聊 ${snapshot.groupId}` : project
}

const authorizationRuntimeTooltip = (snapshot) => {
  const bits = [
    `snapshot=${snapshot?.snapshotId || '-'}`,
    `requested MCP ${snapshot?.requested?.mcp || 0}`,
    `requested Skill ${snapshot?.requested?.skill || 0}`,
    snapshot?.dispatchReason ? `reason=${snapshot.dispatchReason}` : ''
  ].filter(Boolean)
  return bits.join(' · ')
}

const invocationAuditSummary = computed(() => toolInvocationAudit.value.summary || {})
const invocationAuditItems = computed(() => toolInvocationAudit.value.items || [])

const invocationAuditTime = (item) => {
  if (!item?.at) return '-'
  try {
    return new Date(item.at).toLocaleString()
  } catch {
    return item.at
  }
}

const invocationAuditTitle = (item) => {
  if (item.category === 'unauthorized') return item.skill ? `越权 Skill · ${item.skill}` : `越权 MCP · ${item.server || item.tool || '-'}`
  if (item.category === 'skill') return `Skill 调用 · ${item.skill || '-'}`
  if (item.category === 'tool') return `工具调用 · ${item.tool || '-'}`
  if (item.type === 'tool_loop_finished') return `工具循环结束 · ${item.termination || '-'}`
  return item.type || item.source || '审计事件'
}

const invocationAuditStatusLabel = (item) => {
  if (item.category === 'unauthorized') return '已拒绝'
  if (item.category === 'tool') return item.ok ? '成功' : '失败'
  if (item.category === 'skill') return item.ok ? '成功' : '失败'
  return item.termination || '记录'
}

const invocationAuditStatusClass = (item) => ({
  connected: ['tool', 'skill'].includes(item.category) && item.ok === true,
  failed: item.category === 'unauthorized' || (['tool', 'skill'].includes(item.category) && item.ok === false)
})

const invocationAuditMeta = (item) => {
  const bits = []
  if (item.runtime) bits.push(item.runtime)
  if (item.project) bits.push(`项目 ${item.project}`)
  if (item.groupId) bits.push(`群聊 ${item.groupId}`)
  if (item.taskId) bits.push(`任务 ${item.taskId}`)
  if (item.executionId) bits.push(`执行 ${item.executionId}`)
  if (item.invocationSource) bits.push(item.invocationSource)
  if (item.round) bits.push(`round ${item.round}`)
  if (item.toolCalls) bits.push(`toolCalls ${item.toolCalls}`)
  if (item.inputBytes) bits.push(`input ${item.inputBytes}B`)
  if (item.scope && (item.scope.mcp || item.scope.skill)) bits.push(`scope MCP ${item.scope.mcp || 0} / Skill ${item.scope.skill || 0}`)
  if (item.argumentsHash) bits.push(`args#${item.argumentsHash}`)
  if (item.contentHash) bits.push(`hash#${item.contentHash}`)
  if (item.rule) bits.push(item.rule)
  if (item.error) bits.push(item.error)
  return bits
}

const hasInvocationAuditFilter = computed(() => Object.values(toolInvocationAuditFilter.value || {}).some((value) => {
  if (Array.isArray(value)) return value.length > 0
  return !!value
}))

const invocationAuditFilterText = computed(() => {
  const filter = toolInvocationAuditFilter.value || {}
  const parts = []
  if (filter.runtime) parts.push(`运行时 ${filter.runtime}`)
  if (filter.project) parts.push(`项目 ${filter.project}`)
  if (filter.projectName) parts.push(`项目 ${filter.projectName}`)
  if (Array.isArray(filter.projectAliases) && filter.projectAliases.length) parts.push(`别名 ${filter.projectAliases.join(', ')}`)
  if (filter.groupId) parts.push(`群聊 ${filter.groupId}`)
  if (filter.taskId) parts.push(`任务 ${filter.taskId}`)
  if (filter.category) parts.push(`类型 ${filter.category}`)
  if (filter.source) parts.push(`来源 ${filter.source}`)
  return parts.join(' · ')
})

const openToolInvocationAudit = async (filter = {}) => {
  currentFilter.value = 'invocation-audit'
  await loadToolInvocationAudit(filter)
}

const clearToolInvocationAuditFilter = async () => {
  await openToolInvocationAudit({})
}

const chainVerificationSummary = computed(() => toolChainVerification.value.summary || {})
const chainVerificationGate = computed(() => toolChainVerification.value.gate || {})
const chainVerificationRows = computed(() => toolChainVerification.value.rows || [])

const chainVerificationGateLabel = computed(() => {
  const status = chainVerificationGate.value?.status || 'not_configured'
  const labels = {
    verified: '已验证可用',
    ready_unverified: '可派发但待观察',
    blocked: '派发阻断',
    not_configured: '未配置工具'
  }
  return labels[status] || status
})

const chainVerificationGateText = computed(() => {
  const gate = chainVerificationGate.value || {}
  const counts = gate.counts || {}
  if (gate.status === 'blocked') {
    return `阻断 ${Number(counts.blockingScopes || 0)} 个范围，需先处理授权、运行时或越权问题`
  }
  if (gate.status === 'ready_unverified') {
    return `可安全派发，仍有 ${Number(counts.pendingObservationScopes || 0)} 个范围缺少真实调用证据`
  }
  if (gate.status === 'verified') {
    return `已验证 ${Number(counts.verifiedScopes || 0)} 个配置范围，未发现阻断或越权`
  }
  return '暂无配置范围需要验收'
})

const chainVerificationGateClass = computed(() => ({
  warn: chainVerificationGate.value?.status === 'ready_unverified',
  danger: chainVerificationGate.value?.status === 'blocked',
  ready: chainVerificationGate.value?.status === 'verified'
}))

const chainVerificationStatusClass = (row) => ({
  connected: ['verified', 'ready_not_observed', 'not_configured'].includes(row?.status),
  failed: ['authorization_blocked', 'runtime_missing', 'runtime_needs_resync', 'unauthorized_attempts'].includes(row?.status),
  auth: row?.status === 'ready_not_observed'
})

const chainVerificationScopeLabel = (row) => row?.scope === 'group' ? '群聊' : '项目'

const chainVerificationRuntimeText = (row) => {
  const summary = row?.runtime?.summary || {}
  const total = Number(summary.total || 0)
  if (!total) return '暂无运行时快照'
  return `${Number(summary.overallReady || 0)}/${total} 可用 · 待处理 ${Number(summary.needsResync || 0)}`
}

const chainVerificationInvocationText = (row) => {
  const summary = row?.invocation?.summary || {}
  const observed = Number(summary.totalObserved || 0)
  if (!observed && !Number(summary.unauthorized || 0)) return '未观察到调用'
  return `调用 ${observed} · Skill ${Number(summary.skillInvocations || 0)} · 越权 ${Number(summary.unauthorized || 0)}`
}

const chainVerificationRecentTitle = (item) => invocationAuditTitle(item)

const chainVerificationAuditFilter = (row, category = '') => {
  const filter = {}
  if (row?.scope === 'group' && row.id) filter.groupId = row.id
  if (row?.scope === 'project' && row.id) {
    filter.project = row.id
    if (row.name && row.name !== row.id) filter.projectAliases = [row.name]
  }
  if (category) filter.category = category
  return filter
}

const chainVerificationActionKey = (row, action) => `${row?.scope || ''}:${row?.id || ''}:${action?.kind || ''}`

const chainVerificationActionLabel = (row, action) => {
  if (action?.kind === 'runtime_resync' && authorizationRuntimeResyncing.value === authorizationRuntimeResyncKey(row)) return '同步中'
  return action?.label || '处理'
}

const chainVerificationActionClass = (action) => ({
  'btn-primary': action?.kind === 'runtime_resync',
  'btn-outline': action?.kind !== 'runtime_resync'
})

const chainVerificationActionDisabled = (row, action) => action?.kind === 'runtime_resync' && !!authorizationRuntimeResyncing.value

const resyncChainVerificationRuntime = async (row, action = null) => {
  const payload = action?.resyncPayload || null
  await resyncAuthorizationRuntime(row, payload)
}

const runChainVerificationAction = async (row, action) => {
  if (action?.kind === 'open_authorization') {
    currentFilter.value = 'authorization'
    return
  }
  if (action?.kind === 'open_runtime') {
    currentFilter.value = 'runtime'
    return
  }
  if (action?.kind === 'open_invocation_audit') {
    await openToolInvocationAudit(action.filters || chainVerificationAuditFilter(row, action.category || ''))
    return
  }
  if (action?.kind === 'runtime_resync') {
    await resyncChainVerificationRuntime(row, action)
  }
}

const authorizationScopeRuntimeNeedsResync = (scope) => Number(scope?.runtime?.summary?.needsResync || 0) > 0
const authorizationRuntimeResyncKey = (scope = null) => scope ? `${scope.scope}:${scope.id}` : 'all'

const authorizationRuntimeResyncLabel = (scope = null) => {
  const key = authorizationRuntimeResyncKey(scope)
  if (authorizationRuntimeResyncing.value === key) return '同步中'
  return scope ? '重同步此范围' : '重同步待处理快照'
}

const resyncAuthorizationRuntime = async (scope = null, overridePayload = null) => {
  const key = authorizationRuntimeResyncKey(scope)
  const payload = overridePayload
    ? { staleOnly: true, limit: scope ? 20 : 50, ...overridePayload }
    : { staleOnly: true, limit: scope ? 20 : 50 }
  if (!overridePayload && scope?.scope === 'group') payload.groupId = scope.id
  if (!overridePayload && scope?.scope === 'project') payload.projectName = scope.id
  authorizationRuntimeResyncing.value = key
  try {
    const res = await toolsApi.runtimeResync(payload)
    if (!res.success) throw new Error(res.error || '运行时重同步失败')
    toast.success(`运行时重同步完成：${res.summary?.resynced || 0} 个已同步，${res.summary?.failed || 0} 个失败，${res.summary?.skipped || 0} 个跳过`, 6000)
    await Promise.all([
      loadAuthorizationInventory(),
      loadRuntimeReadiness(false),
      loadToolChainVerification(),
      loadMarketplaceOperations()
    ])
  } catch (e) {
    toast.error('运行时重同步失败: ' + e.message)
  } finally {
    authorizationRuntimeResyncing.value = ''
  }
}

const runtimeStatusLabel = (item) => {
  if (item.overallReady) return '可用'
  if (!item.deliveryReady) return '交付异常'
  if (!item.runtimeReady) return 'CLI 不可用'
  return '待检查'
}

const saveSmitheryKey = async () => {
  if (!smitheryKey.value.trim()) {
    toast.warning('请输入有效的 API Key')
    return
  }
  isSavingKey.value = true
  try {
    const res = await toolsApi.smithery.saveKey(smitheryKey.value.trim())
    if (res.success) {
      toast.success('Smithery API Key 保存成功，官方商城已激活！')
      needSmitheryKey.value = false
      await loadTools()
    } else {
      toast.error('保存失败: ' + res.error)
    }
  } catch (e) {
    toast.error('保存失败: ' + e.message)
  } finally {
    isSavingKey.value = false
  }
}

const onSourceChange = () => {
  if (selectedSource.value !== 'custom' || customSourceUrl.value) {
    loadTools()
  }
}

const selectedSavedSource = computed(() => {
  return marketplaceSources.value.find(source => source.id === selectedSource.value) || null
})

const customSourceNeedsSave = computed(() => {
  return selectedSource.value === 'custom' && !!loadedCustomSourceUrl.value && marketplaceItems.value.length > 0
})

const saveCustomMarketplaceSource = async () => {
  const sourceUrl = customSourceUrl.value.trim() || loadedCustomSourceUrl.value
  const sourceLabel = customSourceLabel.value.trim() || loadedCustomSourceLabel.value
  if (!sourceUrl) {
    toast.warning('请输入 HTTPS 商城 JSON、GitHub Skill 目录或 SKILL.md')
    return
  }
  isSavingSource.value = true
  try {
    const res = await toolsApi.marketplace.saveSource({
      label: sourceLabel,
      url: sourceUrl
    })
    if (!res.success) throw new Error(res.error || '保存来源失败')
    selectedSource.value = res.source.id
    customSourceUrl.value = ''
    customSourceLabel.value = ''
    loadedCustomSourceUrl.value = ''
    loadedCustomSourceLabel.value = ''
    toast.success(`已保存外部来源，读取到 ${res.itemCount || 0} 个条目`)
    await loadTools()
  } catch (e) {
    toast.error('保存来源失败: ' + e.message)
  } finally {
    isSavingSource.value = false
  }
}

const marketplaceInstallPayload = (item) => ({
  id: item?.id || '',
  type: item?.type || '',
  name: item?.name || '',
  source: item?.source || null,
  autoResync: true
})

const sameMarketplaceItem = (left, right) => {
  if (!left || !right) return false
  if (left.id && right.id && left.id === right.id && left.type === right.type) return true
  return left.type === right.type && left.name === right.name
}

const installButtonText = (item) => {
  if (item.installing) return item.sourceNeedsSave || customSourceNeedsSave.value ? '保存中' : '处理中'
  if (item.sourceNeedsSave || customSourceNeedsSave.value) return item.updateAvailable ? '保存来源并更新' : '保存来源并安装'
  return item.updateAvailable ? '更新' : '安装'
}

const marketplaceImpactGrantCount = (impact) => {
  const summary = impact?.summary || {}
  return Number(summary.mcpGrants || 0) + Number(summary.skillGrants || 0)
}

const hasMarketplaceImpact = (impact) => Number(impact?.summary?.scopeCount || 0) > 0

const marketplaceImpactSummaryText = (impact) => {
  const summary = impact?.summary || {}
  const scopeCount = Number(summary.scopeCount || 0)
  if (!scopeCount) return '未发现受影响的项目或群聊授权'
  return `影响 ${scopeCount} 个授权范围：项目 ${Number(summary.projects || 0)}，群聊 ${Number(summary.groups || 0)}，授权 ${marketplaceImpactGrantCount(impact)} 条`
}

const marketplaceImpactActionLabel = (impactOrAction) => {
  const action = typeof impactOrAction === 'string' ? impactOrAction : impactOrAction?.action
  if (action === 'install') return '安装'
  if (action === 'update') return '更新'
  if (action === 'uninstall') return '卸载'
  return '预检'
}

const marketplaceImpactScopeLabel = (scope) => scope?.scope === 'group' ? '群聊' : '项目'

const marketplaceImpactScopeGrants = (scope) => {
  const mcp = Array.isArray(scope?.grants?.mcp) ? scope.grants.mcp : []
  const skill = Array.isArray(scope?.grants?.skill) ? scope.grants.skill : []
  return [...mcp, ...skill].join(', ')
}

const hasMarketplaceRuntimeImpact = (impact) => Number(impact?.summary?.runtimeSnapshots || 0) > 0

const marketplaceRuntimeImpactSummaryText = (impact) => {
  const summary = impact?.summary || {}
  const snapshots = Number(summary.runtimeSnapshots || 0)
  if (!snapshots) return '未发现受影响的运行时快照'
  return `影响 ${snapshots} 个运行时快照：待重同步 ${Number(summary.catalogStale || 0)}，派发阻断 ${Number(summary.dispatchBlocked || 0)}，交付异常 ${Number(summary.deliveryBlocked || 0)}`
}

const hasMarketplaceRuntimeResync = (resync) => {
  const summary = resync?.summary || {}
  return Number(summary.resynced || 0) + Number(summary.failed || 0) + Number(summary.skipped || 0) > 0 || resync?.success === false
}

const marketplaceRuntimeResyncSummaryText = (resync) => {
  if (!resync) return '未触发自动重同步'
  const summary = resync.summary || {}
  if (resync.success === false) return `自动重同步失败：${resync.error || '未知错误'}`
  return `自动重同步 ${Number(summary.resynced || 0)} 个，失败 ${Number(summary.failed || 0)} 个，跳过 ${Number(summary.skipped || 0)} 个`
}

const rememberMarketplaceImpact = (item, impact, runtimeImpact = null, runtimeResync = null) => {
  if (impact) {
    if (item) item.authorizationImpact = impact
    marketplaceLastImpact.value = impact
  }
  if (runtimeImpact) {
    if (item) item.runtimeImpact = runtimeImpact
    marketplaceLastRuntimeImpact.value = runtimeImpact
  }
  if (runtimeResync) {
    if (item) item.runtimeResync = runtimeResync
    marketplaceLastRuntimeResync.value = runtimeResync
  }
}

const fetchMarketplaceAuthorizationImpact = async (item, action) => {
  if (!item) return null
  item.impactLoading = true
  try {
    const res = await toolsApi.marketplace.authorizationImpact({
      type: item.type,
      name: item.name,
      action
    })
    if (!res.success) throw new Error(res.error || '授权影响预检失败')
    item.authorizationImpact = res.authorizationImpact || null
    return item.authorizationImpact
  } catch (e) {
    toast.warning('授权影响预检失败: ' + e.message, 5000)
    return null
  } finally {
    item.impactLoading = false
  }
}

const confirmMarketplaceActionWithImpact = async (item, action, impact) => {
  if (!hasMarketplaceImpact(impact)) return true
  const actionLabel = marketplaceImpactActionLabel(action)
  return confirmDialog(`"${item.name}" ${actionLabel}将${marketplaceImpactSummaryText(impact)}。继续${actionLabel}？`)
}

const marketplaceImpactToastSuffix = (impact) => hasMarketplaceImpact(impact)
  ? `，${marketplaceImpactSummaryText(impact)}`
  : ''

const marketplaceRuntimeToastSuffix = (impact) => hasMarketplaceRuntimeImpact(impact)
  ? `；${marketplaceRuntimeImpactSummaryText(impact)}`
  : ''

const marketplaceRuntimeResyncToastSuffix = (resync) => hasMarketplaceRuntimeResync(resync)
  ? `；${marketplaceRuntimeResyncSummaryText(resync)}`
  : ''

const marketplaceOperationTime = (operation) => {
  if (!operation?.at) return '-'
  try {
    return new Date(operation.at).toLocaleString()
  } catch {
    return operation.at
  }
}

const marketplaceOperationTitle = (operation) => {
  const type = operation?.type === 'mcp' ? 'MCP' : 'Skill'
  return `${marketplaceImpactActionLabel(operation)} ${type} · ${operation?.name || '-'}`
}

const marketplaceOperationVersionText = (operation) => {
  if (operation?.previousVersion && operation?.version) return `${operation.previousVersion} → ${operation.version}`
  return operation?.version || operation?.previousVersion || ''
}

const marketplaceRuntimeResyncPayload = (impact = null) => {
  const snapshots = Array.isArray(impact?.snapshots) ? impact.snapshots : []
  const snapshotIds = snapshots.map(snapshot => snapshot?.snapshotId).filter(Boolean)
  return {
    staleOnly: true,
    limit: snapshotIds.length ? Math.min(50, Math.max(1, snapshotIds.length)) : 30,
    ...(snapshotIds.length ? { snapshotIds } : {})
  }
}

const resyncRuntimeTools = async (impact = null) => {
  runtimeResyncing.value = true
  try {
    const res = await toolsApi.runtimeResync(marketplaceRuntimeResyncPayload(impact))
    if (!res.success) throw new Error(res.error || '运行时重同步失败')
    toast.success(`运行时重同步完成：${res.summary?.resynced || 0} 个已同步，${res.summary?.failed || 0} 个失败，${res.summary?.skipped || 0} 个跳过`, 6000)
    await Promise.all([loadRuntimeReadiness(false), loadMarketplaceOperations(), loadAuthorizationInventory(), loadToolChainVerification()])
  } catch (e) {
    toast.error('运行时重同步失败: ' + e.message)
  } finally {
    runtimeResyncing.value = false
  }
}

const saveCustomSourceAndInstall = async (item) => {
  const sourceUrl = loadedCustomSourceUrl.value || customSourceUrl.value.trim()
  const sourceLabel = loadedCustomSourceLabel.value || customSourceLabel.value.trim()
  if (!sourceUrl) {
    toast.warning('请先加载或保存外部来源')
    return
  }
  const isUpdate = item.updateAvailable === true
  item.installing = true
  try {
    const preflightImpact = isUpdate ? await fetchMarketplaceAuthorizationImpact(item, 'update') : null
    if (isUpdate && !(await confirmMarketplaceActionWithImpact(item, 'update', preflightImpact))) return
    const saved = await toolsApi.marketplace.saveSource({ label: sourceLabel, url: sourceUrl })
    if (!saved.success) throw new Error(saved.error || '保存来源失败')
    selectedSource.value = saved.source.id
    customSourceUrl.value = ''
    customSourceLabel.value = ''
    loadedCustomSourceUrl.value = ''
    loadedCustomSourceLabel.value = ''
    await loadMarketplaceSources()

    const listed = await toolsApi.marketplace.list(saved.source.id)
    if (!listed.success) throw new Error(listed.error || '重新读取来源失败')
    const canonical = (listed.items || []).find(candidate => sameMarketplaceItem(candidate, item))
    if (!canonical) throw new Error('保存后的来源中未找到该条目')
    const res = isUpdate
      ? await toolsApi.marketplace.update(marketplaceInstallPayload(canonical))
      : await toolsApi.marketplace.install(marketplaceInstallPayload(canonical))
    if (!res.success) throw new Error(res.error || `${isUpdate ? '更新' : '安装'}失败`)
    const impact = res.authorizationImpact || preflightImpact
    const runtimeImpact = res.runtimeImpact || null
    const runtimeResync = res.runtimeResync || null
    rememberMarketplaceImpact(item, impact, runtimeImpact, runtimeResync)
    toast.success(`"${item.name}" ${isUpdate || res.action === 'update' ? '更新' : '安装'}成功${marketplaceImpactToastSuffix(impact)}${marketplaceRuntimeToastSuffix(runtimeImpact)}${marketplaceRuntimeResyncToastSuffix(runtimeResync)}`, 6000)
    await loadTools()
  } catch (e) {
    toast.error(`${isUpdate ? '更新' : '安装'}失败: ` + e.message)
  } finally {
    item.installing = false
  }
}

const deleteSelectedMarketplaceSource = async () => {
  const source = selectedSavedSource.value
  if (!source) return
  const confirmed = await confirmDialog(`确定删除外部来源 "${source.label}"？已安装的 MCP/Skill 不会被卸载。`)
  if (!confirmed) return
  try {
    const res = await toolsApi.marketplace.deleteSource(source.id)
    if (!res.success) throw new Error(res.error || '删除来源失败')
    selectedSource.value = 'local'
    toast.success('外部来源已删除')
    await loadTools()
  } catch (e) {
    toast.error('删除来源失败: ' + e.message)
  }
}

const filteredTools = () => {
  if (marketplaceFilter.value === 'mcp') {
    return marketplaceItems.value.filter(item => item.type === 'mcp')
  }
  if (marketplaceFilter.value === 'skill') {
    return marketplaceItems.value.filter(item => item.type === 'skill')
  }
  return marketplaceItems.value
}

const isInstalled = (item) => {
  if (typeof item.installed === 'boolean') return item.installed
  if (item.type === 'mcp') {
    return mcpTools.value.some(t => t.name === item.name)
  } else {
    return skills.value.some(s => s.name === item.name)
  }
}

const installMarketTool = async (item) => {
  if (item.sourceNeedsSave || customSourceNeedsSave.value) {
    await saveCustomSourceAndInstall(item)
    return
  }
  item.installing = true
  try {
    const isUpdate = item.updateAvailable === true
    const preflightImpact = isUpdate ? await fetchMarketplaceAuthorizationImpact(item, 'update') : null
    if (isUpdate && !(await confirmMarketplaceActionWithImpact(item, 'update', preflightImpact))) return
    const res = isUpdate
      ? await toolsApi.marketplace.update(marketplaceInstallPayload(item))
      : await toolsApi.marketplace.install(marketplaceInstallPayload(item))
    if (res.success) {
      const impact = res.authorizationImpact || preflightImpact
      const runtimeImpact = res.runtimeImpact || null
      const runtimeResync = res.runtimeResync || null
      rememberMarketplaceImpact(item, impact, runtimeImpact, runtimeResync)
      toast.success(`"${item.name}" ${isUpdate || res.action === 'update' ? '更新' : '安装'}成功${marketplaceImpactToastSuffix(impact)}${marketplaceRuntimeToastSuffix(runtimeImpact)}${marketplaceRuntimeResyncToastSuffix(runtimeResync)}`, 6000)
      await loadTools()
    } else {
      toast.error(`${isUpdate ? '更新' : '安装'}失败: ` + (res.error || '未知错误'))
    }
  } catch (e) {
    toast.error('请求失败: ' + e.message)
  } finally {
    item.installing = false
  }
}

const previewMarketTool = async (item) => {
  item.previewing = true
  previewLoading.value = true
  marketplacePreview.value = { item, preview: null }
  showMarketplacePreview.value = true
  try {
    const res = await toolsApi.marketplace.preview(item)
    if (!res.success) throw new Error(res.error || '预览失败')
    marketplacePreview.value = { item, previewItem: res.item || null, preview: res.preview || {} }
  } catch (e) {
    showMarketplacePreview.value = false
    toast.error('预览失败: ' + e.message)
  } finally {
    item.previewing = false
    previewLoading.value = false
  }
}

const uninstallMarketTool = async (item) => {
  const preflightImpact = await fetchMarketplaceAuthorizationImpact(item, 'uninstall')
  const impactText = hasMarketplaceImpact(preflightImpact)
    ? `${marketplaceImpactSummaryText(preflightImpact)}。`
    : '未发现受影响的项目或群聊授权。'
  const confirmed = await confirmDialog(`确定卸载 "${item.name}"？${impactText} 群聊和项目中的授权配置会保留，但运行时会显示该工具缺失。`)
  if (!confirmed) return
  item.uninstalling = true
  try {
    const res = await toolsApi.marketplace.uninstall({ name: item.name, type: item.type, autoResync: true })
    if (!res.success) throw new Error(res.error || '卸载失败')
    const impact = res.authorizationImpact || preflightImpact
    const runtimeImpact = res.runtimeImpact || null
    const runtimeResync = res.runtimeResync || null
    rememberMarketplaceImpact(item, impact, runtimeImpact, runtimeResync)
    toast.success(`"${item.name}" 已卸载${marketplaceImpactToastSuffix(impact)}${marketplaceRuntimeToastSuffix(runtimeImpact)}${marketplaceRuntimeResyncToastSuffix(runtimeResync)}`, 6000)
    await loadTools()
  } catch (e) {
    toast.error('卸载失败: ' + e.message)
  } finally {
    item.uninstalling = false
  }
}

const sourceTrustLabel = (item) => {
  const trust = item.source?.trust
  if (trust === 'official') return '官方'
  if (trust === 'community') return '社区'
  return '自定义'
}

const previewRows = computed(() => {
  const preview = marketplacePreview.value?.preview || {}
  const proof = preview.sourceProof || marketplacePreview.value?.item?.sourceProof || {}
  const proofRows = proof.schema ? [
    ['来源证明', proof.schema],
    ['物料类型', proof.materialKind || '-'],
    ['物料 Hash', proof.materialHash || '-'],
    ['安装校验', proof.checksum || '-'],
    ['环境变量 Key', Array.isArray(proof.envKeys) && proof.envKeys.length ? proof.envKeys.join(', ') : '-'],
    ['Header Key', Array.isArray(proof.headerKeys) && proof.headerKeys.length ? proof.headerKeys.join(', ') : '-']
  ] : []
  if (marketplacePreview.value?.item?.type === 'mcp') {
    return [
      ['传输方式', preview.transport || '-'],
      ['可执行文件', preview.executable || '-'],
      ['参数', Array.isArray(preview.args) ? preview.args.join(' ') : '-'],
      ['远程地址', preview.url || '-'],
      ['环境变量', Array.isArray(preview.envKeys) ? preview.envKeys.join(', ') : '-'],
      ...proofRows
    ]
  }
  return [
    ['Skill 名称', preview.name || marketplacePreview.value?.item?.name || '-'],
    ['包类型', preview.packageBacked ? '完整目录包' : '单文件 Skill'],
    ['来源', preview.sourceUrl || marketplacePreview.value?.item?.sourceUrl || marketplacePreview.value?.item?.downloadUrl || '-'],
    ...proofRows
  ]
})

const getServerStatus = (name) => {
  const server = (toolStatus.value.servers || []).find(s => s.name === name)
  return server ? server.connected : false
}

const getServerStatusInfo = (name) => {
  return (toolStatus.value.servers || []).find(s => s.name === name) || { state: 'disconnected', connected: false, retryCount: 0 }
}

const serverStatusLabel = (server) => {
  if (server.connected || server.state === 'connected') return '● 已连接'
  if (server.state === 'auth_required') return '● 需授权'
  if (server.state === 'failed') return '● 失败'
  if (server.state === 'pending') return '● 连接中'
  return '○ 未连接'
}

const getAuthStatusInfo = (name) => {
  return getServerStatusInfo(name).auth || {}
}

const authStatusLabel = (auth) => {
  if (!auth || (!auth.authRequired && !auth.authConfigured)) return 'auth: none'
  if (auth.needsUserAuth) return 'auth: action_required'
  if (auth.authConfigured) return 'auth: configured'
  return 'auth: required'
}

const getSkillToolInfo = (name) => {
  return (toolStatus.value.skillTools || []).find(s => s.name === name) || {}
}

// 展开某个 MCP 服务器拥有的具体 Tools
const getMcpToolsList = (serverName) => {
  return (toolStatus.value.mcp || []).filter(t => t.server === serverName)
}

const toggleMcpExpanded = (name) => {
  expandedMcp.value[name] = !expandedMcp.value[name]
}

const toggleEnabled = async (type, tool) => {
  tool.enabled = !tool.enabled
  if (type === 'mcp') await toolsApi.mcp.create(tool)
  else await toolsApi.skills.create(tool)
}

const deleteTool = async (type, name) => {
  const confirmed = await confirmDialog(`确定删除工具 "${name}"？删除后无法恢复。`)
  if (!confirmed) return
  if (type === 'mcp') await toolsApi.mcp.delete(name)
  else await toolsApi.skills.delete(name)
  loadTools()
  toast.success('工具已删除')
}

const submitAddMcp = async () => {
  if (!newMcp.value.name) { toast.warning('请输入名称'); return }
  if (!newMcp.value.command) { toast.warning('请输入启动命令'); return }
  await toolsApi.mcp.create({ ...newMcp.value, enabled: true })
  showAddMcp.value = false
  newMcp.value = { name: '', description: '', command: '', env: '' }
  loadTools()
  toast.success('MCP 服务器添加成功')
}

const submitAddSkill = async () => {
  if (!newSkill.value.name) { toast.warning('请输入名称'); return }
  await toolsApi.skills.create({ ...newSkill.value, enabled: true })
  showAddSkill.value = false
  newSkill.value = { name: '', description: '', prompt: '' }
  loadTools()
  toast.success('Skill 添加成功')
}

const testMcp = async (tool) => {
  toast.info('正在测试连接...')
  try {
    const res = await fetch('/api/tools/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: tool.command, args: tool.args || [], env: tool.env || '' })
    })
    const data = await res.json()
    if (data.success) {
      toast.success(`连接成功！发现 ${data.tools.length} 个工具: ${data.tools.join(', ')}`)
    } else {
      toast.error(`连接失败: ${data.error}`)
    }
  } catch (e) {
    toast.error('测试失败: ' + e.message)
  }
}

const reloadTools = async () => {
  toast.info('重新加载工具...')
  try {
    const res = await fetch('/api/tools/reload', { method: 'POST' })
    const data = await res.json()
    if (data.success) {
      toolStatus.value = data
      toast.success('工具已重新加载')
    }
  } catch (e) {
    toast.error('加载失败: ' + e.message)
  }
}

// 侧滑抽屉展示物理高级技能手册
const openSkillManual = (skill) => {
  drawerSkill.value = skill
  showDrawer.value = true
}

// 极其简单且高性能的 Markdown 渲染器，支持 SKILL.md 文档展示
const renderMarkdown = (md) => {
  if (!md) return ''
  let html = md.replace(/^---\r?\n[\s\S]*?\r?\n---/, '') // 去除 YAML header
  html = html.replace(/\r\n/g, '\n')
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  // 渲染代码块
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    const lines = code.trim().split('\n')
    let lang = 'code'
    if (lines[0] && lines[0].length < 10 && !lines[0].includes(' ') && !lines[0].includes('(')) {
      lang = lines.shift()
    }
    return `<pre class="md-code font-mono"><code class="language-${lang}">${lines.join('\n')}</code></pre>`
  })

  // 渲染行内代码
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code font-mono">$1</code>')
  
  // 渲染标题
  html = html.replace(/^### (.*$)/gim, '<h4 class="md-h3">$1</h4>')
  html = html.replace(/^## (.*$)/gim, '<h3 class="md-h2">$1</h3>')
  html = html.replace(/^# (.*$)/gim, '<h2 class="md-h1">$1</h2>')
  
  // 渲染粗体
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  
  // 渲染列表项
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li class="md-li">$1</li>')
  
  // 渲染链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="md-link">$1</a>')
  
  // 渲染段落
  html = html.split('\n\n').map(p => {
    const trimmed = p.trim()
    if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('<li') || trimmed.startsWith('<ul')) {
      return p
    }
    return `<p class="md-p">${p.replace(/\n/g, '<br>')}</p>`
  }).join('\n')

  return html
}

onMounted(loadTools)
</script>

<template>
  <div class="tools-config">
    <!-- 顶部玻璃工具栏 -->
    <div class="toolbar">
      <div style="display:flex;gap:12px">
        <button v-if="currentFilter === 'mcp'" class="btn btn-primary btn-sm" @click="showAddMcp = true">+ MCP 服务器</button>
        <button v-if="currentFilter === 'custom-prompt'" class="btn btn-outline btn-sm" @click="showAddSkill = true">+ Prompt 技能</button>
        <button class="btn btn-outline btn-sm" @click="reloadTools">🔄 重载工具</button>
      </div>
      <span class="count">
        内置: {{ coreToolsList.length }} | MCP: {{ mcpTools.length }} | 授权: {{ authorizationSummary.configuredScopes || 0 }} | 技能书: {{ customSkills.length }}
      </span>
    </div>

    <div class="main-content">
      <!-- 左侧分类侧边栏 -->
      <div class="sidebar">
        <div class="sidebar-header">🛠️ 工具与技能中心</div>
        <div class="category-list">
          <div class="category-item" :class="{ active: currentFilter === 'core' }" @click="currentFilter = 'core'">
            <span>⚙️</span><span>内置核心工具</span>
            <span class="badge">{{ coreToolsList.length }}</span>
          </div>
          <div class="category-item" :class="{ active: currentFilter === 'mcp' }" @click="currentFilter = 'mcp'">
            <span>🔌</span><span>MCP 连接中心</span>
            <span class="badge">{{ mcpTools.length }}</span>
          </div>
          <div class="category-item" :class="{ active: currentFilter === 'authorization' }" @click="currentFilter = 'authorization'">
            <span>◈</span><span>授权总览</span>
            <span class="badge">{{ authorizationSummary.ready || 0 }}/{{ authorizationSummary.totalScopes || 0 }}</span>
          </div>
          <div class="category-item" :class="{ active: currentFilter === 'chain-verification' }" @click="currentFilter = 'chain-verification'">
            <span>◆</span><span>链路验收</span>
            <span class="badge">{{ chainVerificationSummary.verified || 0 }}/{{ chainVerificationSummary.configuredScopes || 0 }}</span>
          </div>
          <div class="category-item" :class="{ active: currentFilter === 'invocation-audit' }" @click="openToolInvocationAudit()">
            <span>◇</span><span>调用审计</span>
            <span class="badge">{{ invocationAuditSummary.unauthorized || 0 }}/{{ invocationAuditSummary.totalReturned || 0 }}</span>
          </div>
          <div class="category-item" :class="{ active: currentFilter === 'runtime' }" @click="currentFilter = 'runtime'">
            <span>◎</span><span>Agent 运行时</span>
            <span class="badge">{{ runtimeReadiness.summary.ready }}/{{ runtimeReadiness.summary.total }}</span>
          </div>
          <div class="category-item" :class="{ active: currentFilter === 'custom-skills' }" @click="currentFilter = 'custom-skills'">
            <span>🔮</span><span>系统高级技能书</span>
            <span class="badge">{{ customSkills.length }}</span>
          </div>
          <div class="category-item" :class="{ active: currentFilter === 'custom-prompt' }" @click="currentFilter = 'custom-prompt'">
            <span>⚡</span><span>自定义 Prompt 技能</span>
            <span class="badge">{{ skills.length }}</span>
          </div>
          <div class="category-item" :class="{ active: currentFilter === 'marketplace' }" @click="currentFilter = 'marketplace'">
            <span>🛒</span><span>技能商城</span>
          </div>
        </div>
      </div>

      <!-- 右侧内容展示面板 -->
      <div class="content">
        <div class="content-header">
          <span>
            {{ 
              currentFilter === 'core' ? '⚙️ 系统内置核心工具' : 
              currentFilter === 'mcp' ? '🔌 MCP 服务与客户端连接中心' : 
              currentFilter === 'authorization' ? '◈ 项目 / 群聊 MCP 与 Skill 授权总览' :
              currentFilter === 'chain-verification' ? '◆ MCP / Skill 子 Agent 链路验收报告' :
              currentFilter === 'invocation-audit' ? '◇ 子 Agent MCP / Skill 调用审计' :
              currentFilter === 'runtime' ? '◎ 子 Agent MCP / Skill 运行时就绪状态' :
              currentFilter === 'custom-skills' ? '🔮 物理加载系统高级技能书' :
              currentFilter === 'custom-prompt' ? '⚡ 用户自定义 Prompt 技能' :
              '🛒 技能与 MCP 一键安装市场' 
            }}
          </span>
          <button class="btn btn-outline btn-sm" @click="loadTools()">↻ 刷新</button>
        </div>

        <div class="tool-list">
          <!-- 1. ⚙️ 系统内置核心工具 -->
          <template v-if="currentFilter === 'core'">
            <div v-for="tool in coreToolsList" :key="tool.name" class="tool-card">
              <div class="tool-header">
                <div style="display:flex;align-items:flex-start;gap:12px;width:100%">
                  <span style="font-size:24px;line-height:1">{{ tool.emoji }}</span>
                  <div style="flex:1">
                    <div class="tool-name">
                      {{ tool.name }}
                      <span class="badge" style="background:rgba(59,130,246,0.1);color:var(--accent-blue)">{{ tool.category }}</span>
                      <span class="security-badge" :class="tool.securityClass">{{ tool.security }}</span>
                    </div>
                    <div class="tool-desc" style="margin-top:6px;font-size:12.5px;line-height:1.5;color:var(--text-secondary)">
                      {{ tool.desc }}
                    </div>

                    <!-- 参数说明 -->
                    <div class="core-tool-section">
                      <div class="section-lbl">📋 参数规格:</div>
                      <div class="params-grid">
                        <div v-for="param in tool.params" :key="param.name" class="param-row">
                          <span class="param-name font-mono">{{ param.name }}</span>
                          <span class="param-type font-mono">{{ param.type }}</span>
                          <span class="param-desc">{{ param.desc }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- 代码示例 -->
                    <div class="core-tool-section" style="margin-top:8px">
                      <div class="section-lbl">💻 最佳调用代码用例:</div>
                      <div class="tool-cmd font-mono" style="margin-top:4px">{{ tool.example }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- 2. 项目 / 群聊授权总览 -->
          <template v-if="currentFilter === 'authorization'">
            <div class="runtime-summary authorization-summary">
              <div><strong>{{ authorizationSummary.ready || 0 }}</strong><span>可派发范围</span></div>
              <div><strong>{{ authorizationSummary.needsAttention || 0 }}</strong><span>需处理范围</span></div>
              <div><strong>{{ authorizationSummary.requestedMcp || 0 }}</strong><span>MCP 授权</span></div>
              <div><strong>{{ authorizationSummary.requestedSkill || 0 }}</strong><span>Skill 授权</span></div>
              <div><strong>{{ authorizationSummary.runtimeSnapshots || 0 }}</strong><span>运行时快照</span></div>
              <div><strong>{{ authorizationSummary.runtimeNeedsResync || 0 }}</strong><span>运行时待处理</span></div>
              <button v-if="(authorizationSummary.runtimeNeedsResync || 0) > 0" class="btn btn-primary btn-sm" :disabled="!!authorizationRuntimeResyncing" @click="resyncAuthorizationRuntime()">
                {{ authorizationRuntimeResyncLabel() }}
              </button>
              <button class="btn btn-outline btn-sm" :disabled="authorizationInventoryLoading" @click="loadAuthorizationInventory">
                {{ authorizationInventoryLoading ? '刷新中...' : '刷新授权清单' }}
              </button>
            </div>
            <div class="authorization-status-strip" :class="{ warn: (authorizationSummary.needsAttention || 0) > 0 }">
              <span>项目 {{ authorizationSummary.projects || 0 }} · 群聊 {{ authorizationSummary.groups || 0 }} · 已配置 {{ authorizationSummary.configuredScopes || 0 }} · 空授权 {{ authorizationSummary.emptyScopes || 0 }}</span>
              <span>{{ authorizationMissingText({ audit_summary: { missing_mcp_servers: authorizationSummary.missingMcpServers, missing_mcp_tools: authorizationSummary.missingMcpTools, missing_skills: authorizationSummary.missingSkills, invalid_mcp_grants: authorizationSummary.invalidMcpGrants } }) }}</span>
              <span>运行时覆盖 {{ authorizationSummary.scopesWithRuntime || 0 }}/{{ authorizationSummary.totalScopes || 0 }} · stale {{ authorizationSummary.runtimeCatalogStale || 0 }} · blocked {{ authorizationSummary.runtimeDispatchBlocked || 0 }}</span>
            </div>
            <div v-if="authorizationScopes.length === 0" class="empty">
              <span class="icon">◈</span>
              <span>暂无项目或群聊授权配置。</span>
            </div>
            <div v-for="scope in authorizationScopes" :key="`${scope.scope}:${scope.id}`" class="tool-card authorization-card">
              <div class="runtime-card-head">
                <div>
                  <div class="tool-name">
                    {{ authorizationScopeLabel(scope.scope) }} · {{ scope.name || scope.id }}
                    <span class="conn-status" :class="{ connected: scope.authorization_readiness?.dispatchReady !== false, failed: scope.authorization_readiness?.dispatchReady === false }">{{ authorizationStatusLabel(scope) }}</span>
                  </div>
                  <div class="tool-desc font-mono">{{ scope.id }}</div>
                </div>
                <div class="authorization-card-side">
                  <div class="runtime-counts">
                    <span>MCP {{ scope.authorization_readiness?.available?.mcp || 0 }}/{{ scope.counts?.mcp || 0 }}</span>
                    <span>Skill {{ scope.authorization_readiness?.available?.skill || 0 }}/{{ scope.counts?.skill || 0 }}</span>
                    <span :class="{ danger: authorizationMissingTotal(scope) > 0 }">{{ authorizationMissingText(scope) }}</span>
                    <span :class="{ danger: (scope.runtime?.summary?.needsResync || 0) > 0 }">{{ authorizationRuntimeSummaryText(scope) }}</span>
                  </div>
                  <button v-if="authorizationScopeRuntimeNeedsResync(scope)" class="btn btn-outline btn-sm" :disabled="!!authorizationRuntimeResyncing" @click="resyncAuthorizationRuntime(scope)">
                    {{ authorizationRuntimeResyncLabel(scope) }}
                  </button>
                </div>
              </div>
              <div class="authorization-grants">
                <div>
                  <span>MCP</span>
                  <code v-if="authorizationGrantPreview(scope, 'mcp').length" :title="authorizationGrantTitle(scope, 'mcp')">{{ authorizationGrantPreview(scope, 'mcp').join(', ') }}</code>
                  <code v-else>未授权</code>
                </div>
                <div>
                  <span>Skill</span>
                  <code v-if="authorizationGrantPreview(scope, 'skill').length" :title="authorizationGrantTitle(scope, 'skill')">{{ authorizationGrantPreview(scope, 'skill').join(', ') }}</code>
                  <code v-else>未授权</code>
                </div>
              </div>
              <div v-if="authorizationUnavailableRows(scope).length" class="authorization-missing-list">
                <div v-for="item in authorizationUnavailableRows(scope)" :key="`${item.type}:${item.name}:${item.state}`">
                  <span>{{ item.type }}</span>
                  <code>{{ item.name }}</code>
                  <small>{{ item.state }}</small>
                </div>
              </div>
              <div v-if="scope.runtime?.snapshots?.length" class="authorization-runtime-list">
                <div v-for="snapshot in scope.runtime.snapshots.slice(0, 6)" :key="`${snapshot.runtime}:${snapshot.snapshotId}:${snapshot.projectName}:${snapshot.groupId}`" :class="authorizationRuntimeStatusClass(snapshot)" :title="authorizationRuntimeTooltip(snapshot)">
                  <span>{{ snapshot.runtime || '-' }}</span>
                  <code>{{ authorizationRuntimeTargetLabel(snapshot) }}</code>
                  <small>{{ authorizationRuntimeStatusLabel(snapshot) }}</small>
                </div>
              </div>
            </div>
          </template>

          <!-- 3. MCP / Skill 子 Agent 链路验收 -->
          <template v-if="currentFilter === 'chain-verification'">
            <div class="runtime-summary chain-verification-summary">
              <div><strong>{{ chainVerificationSummary.verified || 0 }}</strong><span>已观察到调用</span></div>
              <div><strong>{{ chainVerificationSummary.readyNotObserved || 0 }}</strong><span>就绪未调用</span></div>
              <div><strong>{{ chainVerificationSummary.needsAttention || 0 }}</strong><span>需处理范围</span></div>
              <div><strong>{{ chainVerificationSummary.runtimeNeedsResync || 0 }}</strong><span>待重同步</span></div>
              <div><strong>{{ chainVerificationSummary.unauthorizedAttempts || 0 }}</strong><span>越权尝试</span></div>
              <div><strong>{{ chainVerificationSummary.observedInvocations || 0 }}</strong><span>观察调用</span></div>
              <button class="btn btn-outline btn-sm" :disabled="toolChainVerificationLoading" @click="loadToolChainVerification">
                {{ toolChainVerificationLoading ? '刷新中...' : '刷新验收' }}
              </button>
            </div>
            <div class="authorization-status-strip" :class="{ warn: (chainVerificationSummary.needsAttention || 0) > 0 }">
              <span>授权阻断 {{ chainVerificationSummary.authorizationBlocked || 0 }} · 运行时缺失 {{ chainVerificationSummary.runtimeMissing || 0 }} · 运行时待处理 {{ chainVerificationSummary.runtimeNeedsResync || 0 }}</span>
              <span>配置范围 {{ chainVerificationSummary.configuredScopes || 0 }}/{{ chainVerificationSummary.totalScopes || 0 }}</span>
              <span>这份报告聚合授权清单、运行时快照和调用审计。</span>
            </div>
            <div class="authorization-status-strip chain-verification-gate-strip" :class="chainVerificationGateClass">
              <span>派发门禁：{{ chainVerificationGateLabel }}</span>
              <span>{{ chainVerificationGateText }}</span>
              <span>阻断 {{ chainVerificationGate.counts?.blockingScopes || 0 }} · 待观察 {{ chainVerificationGate.counts?.pendingObservationScopes || 0 }} · 已验证 {{ chainVerificationGate.counts?.verifiedScopes || 0 }}</span>
            </div>
            <div v-if="chainVerificationRows.length === 0" class="empty">
              <span class="icon">◆</span>
              <span>暂无可验收的项目或群聊工具链路。</span>
            </div>
            <div v-for="row in chainVerificationRows" :key="`${row.scope}:${row.id}`" class="tool-card chain-verification-card">
              <div class="runtime-card-head">
                <div>
                  <div class="tool-name">
                    {{ chainVerificationScopeLabel(row) }} · {{ row.name || row.id }}
                    <span class="conn-status" :class="chainVerificationStatusClass(row)">{{ row.statusLabel || row.status }}</span>
                  </div>
                  <div class="tool-desc font-mono">{{ row.id }}</div>
                </div>
                <div class="runtime-counts">
                  <span>MCP {{ row.counts?.mcp || 0 }}</span>
                  <span>Skill {{ row.counts?.skill || 0 }}</span>
                  <span :class="{ danger: row.authorization?.dispatchReady === false }">{{ row.authorization?.dispatchReady === false ? '授权需处理' : '授权可派发' }}</span>
                </div>
              </div>
              <div v-if="row.nextActions?.length" class="chain-verification-actions">
                <button
                  v-for="action in row.nextActions"
                  :key="chainVerificationActionKey(row, action)"
                  class="btn btn-sm"
                  :class="chainVerificationActionClass(action)"
                  :disabled="chainVerificationActionDisabled(row, action)"
                  @click="runChainVerificationAction(row, action)"
                >
                  {{ chainVerificationActionLabel(row, action) }}
                </button>
              </div>
              <div class="chain-verification-grid">
                <div>
                  <span>运行时</span>
                  <strong>{{ chainVerificationRuntimeText(row) }}</strong>
                </div>
                <div>
                  <span>调用审计</span>
                  <strong>{{ chainVerificationInvocationText(row) }}</strong>
                </div>
                <div>
                  <span>最近调用</span>
                  <strong>{{ row.invocation?.summary?.lastObservedAt || '暂无' }}</strong>
                </div>
              </div>
              <div v-if="row.invocation?.recent?.length" class="chain-verification-recent">
                <div v-for="item in row.invocation.recent.slice(0, 4)" :key="`${item.source}:${item.at}:${item.type}:${item.tool || item.skill || item.taskId}`">
                  <span>{{ invocationAuditTime(item) }}</span>
                  <code>{{ chainVerificationRecentTitle(item) }}</code>
                  <small>{{ invocationAuditStatusLabel(item) }}</small>
                </div>
              </div>
            </div>
          </template>

          <!-- 4. 子 Agent 工具调用审计 -->
          <template v-if="currentFilter === 'invocation-audit'">
            <div class="runtime-summary invocation-audit-summary">
              <div><strong>{{ invocationAuditSummary.totalReturned || 0 }}</strong><span>最近事件</span></div>
              <div><strong>{{ invocationAuditSummary.toolCalls || 0 }}</strong><span>MCP/工具调用</span></div>
              <div><strong>{{ invocationAuditSummary.skillInvocations || 0 }}</strong><span>Skill 调用</span></div>
              <div><strong>{{ invocationAuditSummary.failedToolCalls || 0 }}</strong><span>工具失败</span></div>
              <div><strong>{{ invocationAuditSummary.unauthorized || 0 }}</strong><span>越权拒绝</span></div>
              <div><strong>{{ invocationAuditSummary.loopsFinished || 0 }}</strong><span>循环结束</span></div>
              <button class="btn btn-outline btn-sm" :disabled="toolInvocationAuditLoading" @click="loadToolInvocationAudit()">
                {{ toolInvocationAuditLoading ? '刷新中...' : '刷新审计' }}
              </button>
            </div>
            <div v-if="hasInvocationAuditFilter" class="authorization-status-strip invocation-audit-filter-strip">
              <span>当前筛选：{{ invocationAuditFilterText }}</span>
              <button class="btn btn-outline btn-sm" :disabled="toolInvocationAuditLoading" @click="clearToolInvocationAuditFilter">
                清除筛选
              </button>
            </div>
            <div class="authorization-status-strip" :class="{ warn: (invocationAuditSummary.unauthorized || 0) > 0 }">
              <span>成功工具调用 {{ invocationAuditSummary.successfulToolCalls || 0 }} · 失败工具调用 {{ invocationAuditSummary.failedToolCalls || 0 }}</span>
              <span>Skill {{ invocationAuditSummary.skillInvocations || 0 }} · 越权拒绝 {{ invocationAuditSummary.unauthorized || 0 }}</span>
              <span>返回最近 {{ invocationAuditSummary.totalReturned || 0 }} 条脱敏审计</span>
            </div>
            <div v-if="invocationAuditItems.length === 0" class="empty">
              <span class="icon">◇</span>
              <span>暂无子 Agent 工具调用审计。</span>
            </div>
            <div v-for="item in invocationAuditItems" :key="`${item.source}:${item.at}:${item.type}:${item.tool || item.skill || item.server || item.taskId}`" class="tool-card invocation-audit-card">
              <div class="runtime-card-head">
                <div>
                  <div class="tool-name">
                    {{ invocationAuditTitle(item) }}
                    <span class="conn-status" :class="invocationAuditStatusClass(item)">{{ invocationAuditStatusLabel(item) }}</span>
                  </div>
                  <div class="tool-desc">{{ invocationAuditTime(item) }}</div>
                </div>
                <div class="runtime-counts">
                  <span>{{ item.source || '-' }}</span>
                  <span v-if="item.durationMs">{{ item.durationMs }}ms</span>
                  <span v-if="item.nativeSession">native</span>
                </div>
              </div>
              <div v-if="invocationAuditMeta(item).length" class="invocation-audit-meta">
                <span v-for="meta in invocationAuditMeta(item)" :key="meta">{{ meta }}</span>
              </div>
            </div>
          </template>

          <!-- 5. 子 Agent 运行时就绪状态 -->
          <template v-if="currentFilter === 'runtime'">
            <div class="runtime-summary">
              <div><strong>{{ runtimeReadiness.summary.ready }}</strong><span>完全可用</span></div>
              <div><strong>{{ runtimeReadiness.summary.deliveryReady }}</strong><span>授权交付正常</span></div>
              <div><strong>{{ runtimeReadiness.summary.runtimeReady }}</strong><span>CLI 可启动</span></div>
              <button class="btn btn-outline btn-sm" :disabled="runtimeReadinessLoading" @click="loadRuntimeReadiness(true)">
                {{ runtimeReadinessLoading ? '检查中...' : '执行深度探针' }}
              </button>
            </div>
            <div v-if="runtimeReadiness.readiness.length === 0" class="empty">
              <span class="icon">◎</span>
              <span>尚无运行时授权快照。群聊或项目 Agent 执行一次后会在这里显示。</span>
            </div>
            <div v-for="item in runtimeReadiness.readiness" :key="`${item.runtime}:${item.snapshotId}:${item.projectName}:${item.groupId}`" class="tool-card runtime-card">
              <div class="runtime-card-head">
                <div>
                  <div class="tool-name">
                    {{ item.runtime }}
                    <span class="conn-status" :class="{ connected: item.overallReady, failed: !item.deliveryReady }">{{ runtimeStatusLabel(item) }}</span>
                  </div>
                  <div class="tool-desc">{{ item.projectName || '未关联项目' }}<span v-if="item.groupId"> · 群聊 {{ item.groupId }}</span></div>
                </div>
                <div class="runtime-counts">
                  <span>MCP {{ item.synced.mcp.length }}/{{ item.requested.mcp.length }}</span>
                  <span>Skill {{ item.synced.skill.length }}/{{ item.requested.skill.length }}</span>
                </div>
              </div>
              <div class="mcp-runtime-status">
                <span>snapshot: {{ item.snapshotId || '-' }}</span>
                <span>CLI: {{ item.cli.command || '-' }}</span>
                <span v-if="item.cli.version">{{ item.cli.version }}</span>
                <span>checked: {{ item.checkedAt }}</span>
              </div>
              <div class="runtime-check-list">
                <div v-for="check in item.checks" :key="check.id" :class="{ failed: !check.ok }">
                  <span>{{ check.ok ? '通过' : '失败' }}</span>
                  <code>{{ check.id }}</code>
                  <small>{{ check.detail }}</small>
                </div>
              </div>
            </div>
          </template>

          <!-- 4. 🔌 MCP 服务连接中心 -->
          <template v-if="currentFilter === 'mcp'">
            <div v-if="mcpTools.length === 0" class="empty">
              <span class="icon">🔌</span>
              <span>暂无 MCP 配置，点击上方按钮新增</span>
            </div>
            <div v-for="tool in mcpTools" :key="tool.name" class="tool-card">
              <div class="tool-header">
                <div style="display:flex;align-items:flex-start;gap:12px;width:100%">
                  <span style="font-size:24px;line-height:1">🔌</span>
                  <div style="flex:1">
                    <div class="tool-name">
                      {{ tool.name }}
                      <span class="conn-status" :class="{ connected: getServerStatus(tool.name), failed: getServerStatusInfo(tool.name).state === 'failed', auth: getServerStatusInfo(tool.name).state === 'auth_required' }">
                        {{ serverStatusLabel(getServerStatusInfo(tool.name)) }}
                      </span>
                    </div>
                    <div class="tool-desc" style="margin-top:4px">{{ tool.description || '暂无描述' }}</div>
                    <div class="tool-cmd font-mono" style="margin-top:8px">{{ tool.command }}</div>
                    <div class="mcp-runtime-status">
                      <span>state: {{ getServerStatusInfo(tool.name).state || 'unknown' }}</span>
                      <span>tools: {{ getMcpToolsList(tool.name).length }}</span>
                      <span>retry: {{ getServerStatusInfo(tool.name).retryCount || 0 }}</span>
                      <span :class="{ danger: getAuthStatusInfo(tool.name).needsUserAuth }">{{ authStatusLabel(getAuthStatusInfo(tool.name)) }}</span>
                      <span v-if="getAuthStatusInfo(tool.name).refreshConfigured">refresh: configured</span>
                      <span v-if="getAuthStatusInfo(tool.name).tokenExpiresAt" :class="{ danger: getAuthStatusInfo(tool.name).tokenExpired }">expires: {{ getAuthStatusInfo(tool.name).tokenExpiresAt }}</span>
                      <span v-if="getAuthStatusInfo(tool.name).elicitationRequired" class="danger">elicitation: blocked</span>
                      <span v-if="getServerStatusInfo(tool.name).lastConnectedAt">connected: {{ getServerStatusInfo(tool.name).lastConnectedAt }}</span>
                      <span v-if="getServerStatusInfo(tool.name).error" class="danger">error: {{ getServerStatusInfo(tool.name).error }}</span>
                      <span v-if="getAuthStatusInfo(tool.name).message" :class="{ danger: getAuthStatusInfo(tool.name).needsUserAuth }">{{ getAuthStatusInfo(tool.name).message }}</span>
                    </div>
                    
                    <!-- 展开的工具列表 -->
                    <div v-if="getServerStatus(tool.name)" class="mcp-details-section">
                      <button class="btn btn-outline btn-sm mcp-expand-btn" @click="toggleMcpExpanded(tool.name)">
                        {{ expandedMcp[tool.name] ? '收起注册工具 ▲' : `查看注册工具 (${getMcpToolsList(tool.name).length} 个) ▼` }}
                      </button>

                      <div v-show="expandedMcp[tool.name]" class="mcp-tools-expand-box">
                        <div v-if="getMcpToolsList(tool.name).length === 0" class="empty-sm">该服务器未向系统注册任何工具。</div>
                        <div v-for="subt in getMcpToolsList(tool.name)" :key="subt.name" class="mcp-subtool-card">
                          <div class="subtool-name font-mono">🔧 {{ subt.name }}</div>
                          <div class="subtool-desc">{{ subt.description }}</div>
                          
                          <!-- schema参数表格 -->
                          <div v-if="subt.schema?.properties" class="subtool-schema">
                            <div class="schema-lbl font-mono">Arguments Schema:</div>
                            <div class="params-grid font-mono">
                              <div v-for="(val, key) in subt.schema.properties" :key="key" class="param-row">
                                <span class="param-name">{{ key }}</span>
                                <span class="param-type">{{ val.type || 'any' }}{{ subt.schema.required?.includes(key) ? ' (required)' : '' }}</span>
                                <span class="param-desc" style="color:var(--text-muted)">{{ val.description || '-' }}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div style="display:flex;gap:8px">
                    <button class="btn btn-outline btn-sm" @click="testMcp(tool)">测试连接</button>
                    <label class="toggle">
                      <input type="checkbox" :checked="tool.enabled" @change="toggleEnabled('mcp', tool)">
                      <span>启用</span>
                    </label>
                    <button class="btn btn-danger btn-sm" @click="deleteTool('mcp', tool.name)">删除</button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- 5. 🔮 物理加载系统高级技能书 -->
          <template v-if="currentFilter === 'custom-skills'">
            <div v-if="customSkills.length === 0" class="empty">
              <span class="icon">🔮</span>
              <span>未扫描到系统加载的 Customization 物理技能文件夹</span>
            </div>
            <div class="custom-skills-grid">
              <div v-for="skill in customSkills" :key="skill.id" class="skill-card-fancy">
                <div class="skill-card-header">
                  <span class="skill-icon">🔮</span>
                  <div class="skill-meta">
                    <div class="skill-name">{{ skill.name }}</div>
                    <div class="skill-id font-mono">skills/{{ skill.id }}</div>
                  </div>
                  <span class="badge" style="background:rgba(168,85,247,0.1);color:var(--accent-purple)">物理激活</span>
                </div>
                <div class="skill-card-body">
                  {{ skill.description || '暂无描述' }}
                </div>
                <div class="skill-card-footer">
                  <button class="btn btn-primary btn-sm btn-block" @click="openSkillManual(skill)">
                    📖 查看技能使用手册 (SKILL.md)
                  </button>
                </div>
              </div>
            </div>
          </template>

          <!-- 6. ⚡ 用户自定义 Prompt 技能 -->
          <template v-if="currentFilter === 'custom-prompt'">
            <div v-if="skills.length === 0" class="empty">
              <span class="icon">⚡</span>
              <span>暂无自定义 Prompt 技能，点击上方按钮新增</span>
            </div>
            <div v-for="tool in skills" :key="tool.name" class="tool-card">
              <div class="tool-header">
                <div style="display:flex;align-items:flex-start;gap:12px;width:100%">
                  <span style="font-size:24px;line-height:1">⚡</span>
                  <div style="flex:1">
                    <div class="tool-name">
                      {{ tool.name }}
                      <span class="security-badge sec-success">SkillTool</span>
                    </div>
                    <div class="tool-desc" style="margin-top:4px">{{ tool.description || '暂无描述' }}</div>
                    <div class="mcp-runtime-status">
                      <span>invoke: {{ getSkillToolInfo(tool.name).invokeToolName || 'invoke_skill' }}</span>
                      <span>tool: {{ getSkillToolInfo(tool.name).toolName || `skill:${tool.name}` }}</span>
                      <span v-if="getSkillToolInfo(tool.name).contentHash">hash: {{ getSkillToolInfo(tool.name).contentHash }}</span>
                      <span v-if="toolStatus.skillAuditFile">audit: {{ toolStatus.skillAuditFile }}</span>
                    </div>
                    <div class="tool-prompt" style="margin-top:8px">📝 {{ tool.prompt }}</div>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px">
                    <label class="toggle">
                      <input type="checkbox" :checked="tool.enabled" @change="toggleEnabled('skill', tool)">
                      <span>启用</span>
                    </label>
                    <button class="btn btn-danger btn-sm" @click="deleteTool('skill', tool.name)">删除</button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- 7. 🛒 技能与 MCP 一键安装市场 -->
          <template v-if="currentFilter === 'marketplace'">
            <div class="marketplace-source-selector">
              <span class="marketplace-source-label">🛒 商城数据源:</span>
              <select v-model="selectedSource" @change="onSourceChange">
                <option value="local">本地官方精选 (CCM Local)</option>
                <option value="github">社区精选源 (GitHub Remote)</option>
                <option value="smithery">Smithery 官方商店 (Smithery.ai)</option>
                <option v-for="source in marketplaceSources" :key="source.id" :value="source.id">
                  已保存：{{ source.label }}
                </option>
                <option value="custom">外部 URL / GitHub / SKILL.md</option>
              </select>
              <button v-if="selectedSavedSource" class="btn btn-danger btn-sm" @click="deleteSelectedMarketplaceSource">删除来源</button>

              <span class="marketplace-filter-label">🛠️ 类型筛选:</span>
              <div class="mfilter-tab">
                <button type="button" @click="marketplaceFilter = 'all'" :class="{ active: marketplaceFilter === 'all' }">全部</button>
                <button type="button" @click="marketplaceFilter = 'mcp'" :class="{ active: marketplaceFilter === 'mcp' }">MCP 服务器</button>
                <button type="button" @click="marketplaceFilter = 'skill'" :class="{ active: marketplaceFilter === 'skill' }">Skills</button>
              </div>
              <div v-if="selectedSavedSource" class="marketplace-saved-source">
                <span>{{ selectedSavedSource.url }}</span>
              </div>
              <div v-if="selectedSource === 'custom'" class="marketplace-custom-source">
                <input v-model="customSourceLabel" placeholder="来源名称，可选">
                <input v-model="customSourceUrl" placeholder="HTTPS 商城 JSON、GitHub Skill 目录或 SKILL.md" @keyup.enter="loadTools">
                <button class="btn btn-primary btn-sm" @click="loadTools">加载</button>
                <button class="btn btn-outline btn-sm" :disabled="isSavingSource" @click="saveCustomMarketplaceSource">
                  {{ isSavingSource ? '保存中' : '保存为来源' }}
                </button>
              </div>
              <div v-if="customSourceNeedsSave" class="marketplace-source-gate">
                <span>当前列表来自未保存的外部 URL。安装时会先保存来源，再由后端从该来源重新读取并校验条目。</span>
              </div>
            </div>

            <div v-if="marketplaceLastImpact" class="marketplace-impact-banner" :class="{ muted: !hasMarketplaceImpact(marketplaceLastImpact) }">
              <div class="marketplace-impact-head">
                <span>{{ marketplaceImpactActionLabel(marketplaceLastImpact) }}影响</span>
                <strong>{{ marketplaceImpactSummaryText(marketplaceLastImpact) }}</strong>
              </div>
              <div v-if="hasMarketplaceImpact(marketplaceLastImpact)" class="marketplace-impact-scopes">
                <span v-for="scope in marketplaceLastImpact.scopes.slice(0, 4)" :key="`${scope.scope}:${scope.id}`">
                  {{ marketplaceImpactScopeLabel(scope) }} · {{ scope.name || scope.id }}
                </span>
                <span v-if="marketplaceLastImpact.scopes.length > 4">+{{ marketplaceLastImpact.scopes.length - 4 }}</span>
                <span v-if="marketplaceLastImpact.truncated">已截断</span>
              </div>
            </div>

            <div v-if="marketplaceLastRuntimeImpact" class="marketplace-impact-banner runtime" :class="{ muted: !hasMarketplaceRuntimeImpact(marketplaceLastRuntimeImpact) }">
              <div class="marketplace-impact-head">
                <span>运行时同步</span>
                <strong>{{ marketplaceRuntimeImpactSummaryText(marketplaceLastRuntimeImpact) }}</strong>
                <button v-if="hasMarketplaceRuntimeImpact(marketplaceLastRuntimeImpact)" class="btn btn-outline btn-sm" :disabled="runtimeResyncing" @click="resyncRuntimeTools(marketplaceLastRuntimeImpact)">
                  {{ runtimeResyncing ? '同步中' : '重同步' }}
                </button>
              </div>
              <div v-if="hasMarketplaceRuntimeImpact(marketplaceLastRuntimeImpact)" class="marketplace-impact-scopes">
                <span v-for="snapshot in marketplaceLastRuntimeImpact.snapshots.slice(0, 4)" :key="`${snapshot.runtime}:${snapshot.snapshotId}`">
                  {{ snapshot.runtime }} · {{ snapshot.projectName || snapshot.groupId || snapshot.snapshotId }}
                </span>
                <span v-if="marketplaceLastRuntimeImpact.snapshots.length > 4">+{{ marketplaceLastRuntimeImpact.snapshots.length - 4 }}</span>
              </div>
            </div>

            <div v-if="marketplaceLastRuntimeResync" class="marketplace-impact-banner runtime" :class="{ muted: !hasMarketplaceRuntimeResync(marketplaceLastRuntimeResync) }">
              <div class="marketplace-impact-head">
                <span>自动重同步</span>
                <strong>{{ marketplaceRuntimeResyncSummaryText(marketplaceLastRuntimeResync) }}</strong>
              </div>
            </div>

            <div v-if="marketplaceOperations.length || marketplaceOperationsLoading" class="marketplace-operations-panel">
              <div class="marketplace-operations-header">
                <div>
                  <strong>最近商城操作</strong>
                  <span>{{ marketplaceOperationsSummary.totalReturned || 0 }} 条记录 · 影响授权 {{ marketplaceOperationsSummary.impactedScopes || 0 }} 个范围 · 运行时快照 {{ marketplaceOperationsSummary.impactedRuntimeSnapshots || 0 }} 个 · 自动同步 {{ marketplaceOperationsSummary.runtimeResynced || 0 }} 个</span>
                </div>
                <div class="marketplace-operations-actions">
                  <button v-if="marketplaceOperationsSummary.impactedRuntimeSnapshots" class="btn btn-outline btn-sm" :disabled="runtimeResyncing" @click="resyncRuntimeTools">
                    {{ runtimeResyncing ? '同步中' : '重同步运行时' }}
                  </button>
                  <button class="btn btn-outline btn-sm" :disabled="marketplaceOperationsLoading" @click="loadMarketplaceOperations">
                    {{ marketplaceOperationsLoading ? '刷新中' : '刷新' }}
                  </button>
                </div>
              </div>
              <div class="marketplace-operation-list">
                <div v-for="operation in marketplaceOperations.slice(0, 5)" :key="`${operation.at}:${operation.key}:${operation.action}`" class="marketplace-operation-row">
                  <div class="marketplace-operation-main">
                    <span class="marketplace-operation-title">{{ marketplaceOperationTitle(operation) }}</span>
                    <span class="marketplace-operation-time">{{ marketplaceOperationTime(operation) }}</span>
                  </div>
                  <div class="marketplace-operation-meta">
                    <span v-if="marketplaceOperationVersionText(operation)">v{{ marketplaceOperationVersionText(operation) }}</span>
                    <span v-if="operation.source?.label">{{ operation.source.label }}</span>
                    <span :class="{ warn: hasMarketplaceImpact(operation.authorizationImpact) }">{{ marketplaceImpactSummaryText(operation.authorizationImpact) }}</span>
                    <span :class="{ warn: hasMarketplaceRuntimeImpact(operation.runtimeImpact) }">{{ marketplaceRuntimeImpactSummaryText(operation.runtimeImpact) }}</span>
                    <span v-if="operation.runtimeResync" :class="{ warn: operation.runtimeResync.success === false || (operation.runtimeResync.summary?.failed || 0) > 0 }">{{ marketplaceRuntimeResyncSummaryText(operation.runtimeResync) }}</span>
                  </div>
                  <div v-if="hasMarketplaceImpact(operation.authorizationImpact)" class="marketplace-impact-scopes">
                    <span v-for="scope in operation.authorizationImpact.scopes.slice(0, 3)" :key="`${scope.scope}:${scope.id}`" :title="marketplaceImpactScopeGrants(scope)">
                      {{ marketplaceImpactScopeLabel(scope) }} · {{ scope.name || scope.id }}
                    </span>
                    <span v-if="operation.authorizationImpact.scopes.length > 3">+{{ operation.authorizationImpact.scopes.length - 3 }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Smithery API Key 激活浮窗 -->
            <div v-if="selectedSource === 'smithery' && needSmitheryKey" class="smithery-activation-card">
              <div style="font-size:14px;font-weight:600;color:var(--text-primary);display:flex;align-items:center;gap:6px">
                <span>🔑</span><span>激活 Smithery 官方应用商店</span>
              </div>
              <div style="font-size:12px;color:var(--text-muted);margin-top:6px;line-height:1.5">
                本地未检测到有效的 Smithery 密钥。请配置您的 API Key 以安全接入其官方注册中心。
                <a href="https://smithery.ai/account/api-keys" target="_blank">免费申请 API Key ↗</a>
              </div>
              <div style="display:flex;gap:8px;margin-top:14px;max-width:480px">
                <input v-model="smitheryKey" type="password" placeholder="请输入您的 Smithery Bearer API Key..." @keyup.enter="saveSmitheryKey">
                <button class="btn btn-primary btn-sm" :disabled="isSavingKey" @click="saveSmitheryKey">
                  {{ isSavingKey ? '正在激活...' : '激活并加载' }}
                </button>
              </div>
            </div>

            <div v-if="filteredTools().length === 0" class="empty">
              <span class="icon">📦</span>
              <span>暂无商城工具</span>
            </div>
            <div v-for="tool in filteredTools()" :key="tool.id || `${tool.type}:${tool.name}`" class="tool-card marketplace-tool">
              <div class="tool-header">
                <div class="marketplace-tool-main">
                  <span style="font-size:20px">{{ tool.type === 'mcp' ? '🔌' : '⚡' }}</span>
                  <div class="marketplace-tool-copy">
                    <div class="tool-name">
                      {{ tool.name }}
                      <span v-if="tool.author" style="font-size:11px;color:var(--text-muted);font-weight:normal;margin-left:6px">by {{ tool.author }}</span>
                    </div>
                    <div class="tool-desc">{{ tool.description || '' }}</div>
                    <div class="marketplace-meta">
                      <span>{{ tool.type === 'mcp' ? 'MCP' : 'Skill' }}</span>
                      <span>v{{ tool.version || '0.0.0' }}</span>
                      <span :class="`trust-${tool.source?.trust || 'custom'}`">{{ sourceTrustLabel(tool) }}来源</span>
                      <span v-if="tool.installedVersion">已装 v{{ tool.installedVersion }}</span>
                      <span v-if="tool.updateAvailable" class="update-ready">可更新</span>
                    </div>
                  </div>
                </div>
                <div class="marketplace-actions">
                  <button class="btn btn-outline btn-sm" :disabled="tool.previewing" @click="previewMarketTool(tool)">
                    {{ tool.previewing ? '读取中' : '预览' }}
                  </button>
                  <button v-if="!isInstalled(tool) || tool.updateAvailable" class="btn btn-primary btn-sm" :disabled="tool.installing" @click="installMarketTool(tool)">
                    {{ installButtonText(tool) }}
                  </button>
                  <button v-if="isInstalled(tool)" class="btn btn-danger btn-sm" :disabled="tool.uninstalling" @click="uninstallMarketTool(tool)">
                    {{ tool.uninstalling ? '卸载中' : '卸载' }}
                  </button>
                </div>
              </div>
              <div v-if="tool.impactLoading" class="marketplace-impact-inline muted">正在检查项目/群聊授权影响...</div>
              <div v-else-if="hasMarketplaceImpact(tool.authorizationImpact)" class="marketplace-impact-inline">
                <div class="marketplace-impact-head">
                  <span>{{ marketplaceImpactActionLabel(tool.authorizationImpact) }}预检</span>
                  <strong>{{ marketplaceImpactSummaryText(tool.authorizationImpact) }}</strong>
                </div>
                <div class="marketplace-impact-scopes">
                  <span v-for="scope in tool.authorizationImpact.scopes.slice(0, 3)" :key="`${scope.scope}:${scope.id}`" :title="marketplaceImpactScopeGrants(scope)">
                    {{ marketplaceImpactScopeLabel(scope) }} · {{ scope.name || scope.id }}
                  </span>
                  <span v-if="tool.authorizationImpact.scopes.length > 3">+{{ tool.authorizationImpact.scopes.length - 3 }}</span>
                </div>
              </div>
              <div v-if="hasMarketplaceRuntimeImpact(tool.runtimeImpact)" class="marketplace-impact-inline runtime">
                <div class="marketplace-impact-head">
                  <span>运行时同步</span>
                  <strong>{{ marketplaceRuntimeImpactSummaryText(tool.runtimeImpact) }}</strong>
                  <button class="btn btn-outline btn-sm" :disabled="runtimeResyncing" @click="resyncRuntimeTools(tool.runtimeImpact)">
                    {{ runtimeResyncing ? '同步中' : '重同步' }}
                  </button>
                </div>
              </div>
              <div v-if="tool.runtimeResync" class="marketplace-impact-inline runtime" :class="{ muted: !hasMarketplaceRuntimeResync(tool.runtimeResync) }">
                <div class="marketplace-impact-head">
                  <span>自动重同步</span>
                  <strong>{{ marketplaceRuntimeResyncSummaryText(tool.runtimeResync) }}</strong>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div v-if="showMarketplacePreview" class="modal-overlay" @click.self="showMarketplacePreview = false">
      <div class="modal marketplace-preview-modal">
        <button class="modal-close" @click="showMarketplacePreview = false">&times;</button>
        <h3>{{ marketplacePreview?.item?.name || '工具预览' }}</h3>
        <div v-if="previewLoading" class="empty-sm">正在读取并校验来源...</div>
        <template v-else>
          <div class="preview-summary">
            <span>{{ marketplacePreview?.item?.type === 'mcp' ? 'MCP' : 'Skill' }}</span>
            <span>v{{ marketplacePreview?.item?.version || '0.0.0' }}</span>
            <span>{{ sourceTrustLabel(marketplacePreview?.item || {}) }}来源</span>
          </div>
          <div class="preview-table">
            <div v-for="row in previewRows" :key="row[0]" class="preview-row">
              <span>{{ row[0] }}</span>
              <code>{{ row[1] }}</code>
            </div>
          </div>
          <pre v-if="marketplacePreview?.preview?.content" class="preview-content">{{ marketplacePreview.preview.content }}</pre>
          <div v-if="marketplacePreview?.preview?.note" class="form-hint">{{ marketplacePreview.preview.note }}</div>
          <div class="form-actions">
            <button class="btn btn-cancel" @click="showMarketplacePreview = false">关闭</button>
            <button class="btn btn-primary" :disabled="marketplacePreview?.item?.installing" @click="installMarketTool(marketplacePreview.item); showMarketplacePreview = false">
              {{ marketplacePreview?.item ? installButtonText(marketplacePreview.item) : '确认安装' }}
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- 侧拉抽屉：用于展示高级技能手册 SKILL.md -->
    <div class="drawer-overlay" :class="{ show: showDrawer }" @click.self="showDrawer = false">
      <div class="drawer" :class="{ show: showDrawer }">
        <div class="drawer-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:20px">📖</span>
            <div>
              <div class="drawer-title">{{ drawerSkill?.name }}</div>
              <div class="drawer-subtitle font-mono">skills/{{ drawerSkill?.id }}/SKILL.md</div>
            </div>
          </div>
          <button class="drawer-close" @click="showDrawer = false">&times;</button>
        </div>
        <div class="drawer-body">
          <div class="markdown-body" v-html="renderMarkdown(drawerSkill?.content)"></div>
        </div>
      </div>
    </div>

    <!-- 添加 MCP 弹窗 -->
    <div v-if="showAddMcp" class="modal-overlay" @click.self="showAddMcp = false">
      <div class="modal">
        <button class="modal-close" @click="showAddMcp = false">&times;</button>
        <h3>添加 MCP 服务器</h3>
        <div class="form-group">
          <label>名称</label>
          <input v-model="newMcp.name" placeholder="如 mcp-feishu">
        </div>
        <div class="form-group">
          <label>描述</label>
          <input v-model="newMcp.description" placeholder="简要描述功能">
        </div>
        <div class="form-group">
          <label>启动命令</label>
          <input v-model="newMcp.command" placeholder="如 npx @modelcontextprotocol/server-filesystem /path">
          <div class="form-hint">MCP 服务器的启动命令，会通过 stdio 通信</div>
        </div>
        <div class="form-group">
          <label>环境变量（可选）</label>
          <textarea v-model="newMcp.env" placeholder="KEY=value&#10;ANOTHER_KEY=value2" rows="3"></textarea>
          <div class="form-hint">每行一个 KEY=value 格式的环境变量</div>
        </div>
        <div class="form-actions">
          <button class="btn btn-cancel" @click="showAddMcp = false">取消</button>
          <button class="btn btn-primary" @click="submitAddMcp">添加</button>
        </div>
      </div>
    </div>

    <!-- 添加 Skill 弹窗 -->
    <div v-if="showAddSkill" class="modal-overlay" @click.self="showAddSkill = false">
      <div class="modal">
        <button class="modal-close" @click="showAddSkill = false">&times;</button>
        <h3>添加自定义 Prompt 技能</h3>
        <div class="form-group">
          <label>名称</label>
          <input v-model="newSkill.name" placeholder="如 code-review">
        </div>
        <div class="form-group">
          <label>描述</label>
          <input v-model="newSkill.description" placeholder="简要描述功能">
        </div>
        <div class="form-group">
          <label>Prompt 模板</label>
          <textarea v-model="newSkill.prompt" placeholder="请审查以下代码，关注安全性、性能 and 可维护性..." rows="5"></textarea>
          <div class="form-hint">Skill 执行时注入到 Agent 上下文的 prompt 模板</div>
        </div>
        <div class="form-actions">
          <button class="btn btn-cancel" @click="showAddSkill = false">取消</button>
          <button class="btn btn-primary" @click="submitAddSkill">添加</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tools-config { display: flex; flex-direction: column; height: 100%; position: relative; }
.toolbar { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; background: rgba(255, 255, 255, 0.25); border-bottom: 1px solid rgba(0, 0, 0, 0.05); flex-wrap: wrap; gap: 8px; }
.count { font-size: 11.5px; color: var(--text-muted); font-family: 'Share Tech Mono', monospace; }
.main-content { display: flex; flex: 1; overflow: hidden; }

/* 侧边栏样式 */
.sidebar { width: 220px; background: rgba(255, 255, 255, 0.15); border-right: 1px solid rgba(0, 0, 0, 0.05); display: flex; flex-direction: column; }
.sidebar-header { padding: 16px; font-size: 13px; font-weight: 600; color: var(--text-secondary); border-bottom: 1px solid rgba(0, 0, 0, 0.05); }
.category-list { padding: 8px; display: flex; flex-direction: column; gap: 4px; }
.category-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; cursor: pointer; color: var(--text-secondary); transition: all 0.25s; font-size: 12.5px; }
.category-item:hover { background: rgba(59, 130, 246, 0.04); color: var(--accent-blue); }
.category-item.active { background: rgba(59, 130, 246, 0.08); color: var(--accent-blue); font-weight: 600; }
.badge { font-size: 9.5px; padding: 2px 6px; background: rgba(0,0,0,0.04); border-radius: 4px; margin-left: auto; font-family: 'Share Tech Mono', monospace; color: var(--text-muted); }

/* 主内容区 */
.content { flex: 1; display: flex; flex-direction: column; overflow: hidden; container-type: inline-size; }
.content-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-bottom: 1px solid rgba(0, 0, 0, 0.05); font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.tool-list { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }

/* 卡片样式 */
.tool-card { background: rgba(255, 255, 255, 0.45); backdrop-filter: blur(25px); border: 1px solid rgba(0, 0, 0, 0.04); border-radius: 12px; padding: 18px; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
.tool-card:hover { border-color: rgba(59, 130, 246, 0.2); box-shadow: 0 8px 24px rgba(59, 130, 246, 0.04); transform: translateY(-1px); }
.tool-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.tool-name { font-size: 14px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.conn-status { font-size: 10.5px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: rgba(239, 68, 68, 0.08); color: var(--accent-red); }
.conn-status.connected { background: rgba(34, 197, 94, 0.08); color: var(--accent-green); }
.conn-status.failed { background: rgba(245, 158, 11, 0.12); color: #b45309; }
.conn-status.auth { background: rgba(59, 130, 246, 0.10); color: var(--accent-blue); }
.mcp-runtime-status { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; font-size:11px; color:var(--text-muted); }
.mcp-runtime-status span { max-width:100%; padding:2px 6px; border-radius:6px; background:rgba(148,163,184,.12); overflow-wrap:anywhere; }
.mcp-runtime-status .danger { color:#b91c1c; background:rgba(239,68,68,.1); }
.runtime-summary { display:flex; align-items:stretch; gap:10px; margin-bottom:12px; flex-wrap:wrap; }
.runtime-summary > div { min-width:130px; padding:10px 12px; border:1px solid var(--border-color); border-radius:6px; background:var(--bg-secondary); display:flex; flex-direction:column; gap:2px; }
.runtime-summary strong { font-size:18px; color:var(--text-primary); }
.runtime-summary span { font-size:11px; color:var(--text-muted); }
.runtime-summary .btn { margin-left:auto; align-self:center; }
.runtime-card { display:block; }
.runtime-card-head { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; }
.runtime-counts { display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; }
.runtime-counts span { padding:3px 7px; border-radius:5px; background:rgba(59,130,246,.08); color:var(--text-secondary); font-size:11px; }
.runtime-counts .danger { color:#b91c1c; background:rgba(239,68,68,.10); }
.runtime-check-list { display:grid; gap:6px; margin-top:10px; }
.runtime-check-list > div { display:grid; grid-template-columns:38px minmax(100px,150px) 1fr; gap:8px; align-items:start; padding:7px 8px; border-radius:5px; background:rgba(34,197,94,.07); color:var(--text-secondary); }
.runtime-check-list > div.failed { background:rgba(239,68,68,.08); color:#b91c1c; }
.runtime-check-list code { overflow-wrap:anywhere; color:inherit; }
.runtime-check-list small { overflow-wrap:anywhere; line-height:1.4; }
.authorization-summary { margin-bottom:10px; }
.authorization-status-strip { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:12px; padding:9px 11px; border:1px solid rgba(34,197,94,.16); border-radius:8px; background:rgba(34,197,94,.07); color:var(--text-secondary); font-size:11.5px; flex-wrap:wrap; }
.authorization-status-strip.warn { border-color:rgba(245,158,11,.22); background:rgba(245,158,11,.08); }
.authorization-status-strip.danger { border-color:rgba(239,68,68,.20); background:rgba(239,68,68,.08); }
.authorization-status-strip.ready { border-color:rgba(34,197,94,.22); background:rgba(34,197,94,.08); }
.authorization-card { display:block; }
.authorization-card-side { display:flex; flex-direction:column; align-items:flex-end; gap:8px; min-width:220px; }
.authorization-card-side .btn { align-self:flex-end; }
.authorization-grants { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:8px; margin-top:12px; }
.authorization-grants > div { min-width:0; padding:8px 10px; border-radius:8px; background:rgba(148,163,184,.10); border:1px solid rgba(0,0,0,.03); display:grid; gap:4px; }
.authorization-grants span { font-size:10.5px; font-weight:700; color:var(--text-muted); }
.authorization-grants code { color:var(--text-secondary); font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.authorization-missing-list { display:grid; gap:6px; margin-top:10px; }
.authorization-missing-list > div { display:grid; grid-template-columns:58px minmax(120px,1fr) minmax(80px,140px); gap:8px; align-items:center; padding:7px 8px; border-radius:6px; background:rgba(239,68,68,.08); color:#b91c1c; font-size:11px; }
.authorization-missing-list code { color:inherit; overflow-wrap:anywhere; }
.authorization-missing-list small { color:inherit; opacity:.82; overflow-wrap:anywhere; }
.authorization-runtime-list { display:grid; gap:6px; margin-top:10px; }
.authorization-runtime-list > div { display:grid; grid-template-columns:82px minmax(120px,1fr) minmax(72px,120px); gap:8px; align-items:center; padding:7px 8px; border-radius:6px; background:rgba(148,163,184,.10); color:var(--text-secondary); font-size:11px; }
.authorization-runtime-list > div.ready { background:rgba(34,197,94,.08); color:#15803d; }
.authorization-runtime-list > div.stale { background:rgba(245,158,11,.10); color:#b45309; }
.authorization-runtime-list > div.blocked { background:rgba(239,68,68,.08); color:#b91c1c; }
.authorization-runtime-list code { color:inherit; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.authorization-runtime-list small { color:inherit; opacity:.86; overflow-wrap:anywhere; }
.invocation-audit-summary { margin-bottom:10px; }
.invocation-audit-filter-strip { justify-content:flex-start; }
.invocation-audit-filter-strip .btn { margin-left:auto; }
.invocation-audit-card { display:block; }
.invocation-audit-meta { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:10px; font-size:10.5px; color:var(--text-muted); min-width:0; }
.invocation-audit-meta span { max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding:3px 7px; border-radius:5px; background:rgba(148,163,184,.12); }
.chain-verification-summary { margin-bottom:10px; }
.chain-verification-card { display:block; }
.chain-verification-gate-strip { font-weight:600; }
.chain-verification-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
.chain-verification-grid { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:8px; margin-top:12px; }
.chain-verification-grid > div { min-width:0; padding:9px 10px; border-radius:8px; background:rgba(148,163,184,.10); border:1px solid rgba(0,0,0,.03); display:grid; gap:4px; }
.chain-verification-grid span { font-size:10.5px; font-weight:700; color:var(--text-muted); }
.chain-verification-grid strong { font-size:11.5px; color:var(--text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.chain-verification-recent { display:grid; gap:6px; margin-top:10px; }
.chain-verification-recent > div { display:grid; grid-template-columns:150px minmax(120px,1fr) minmax(58px,90px); gap:8px; align-items:center; padding:7px 8px; border-radius:6px; background:rgba(148,163,184,.10); color:var(--text-secondary); font-size:11px; }
.chain-verification-recent code { color:inherit; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.chain-verification-recent small { color:inherit; opacity:.86; overflow-wrap:anywhere; }
@media (max-width: 720px) {
  .runtime-summary .btn { width:100%; margin-left:0; }
  .runtime-card-head { flex-direction:column; }
  .runtime-counts { justify-content:flex-start; }
  .authorization-card-side { width:100%; min-width:0; align-items:flex-start; }
  .authorization-card-side .btn { align-self:flex-start; }
  .runtime-check-list > div { grid-template-columns:38px 1fr; }
  .runtime-check-list small { grid-column:1 / -1; }
  .authorization-grants { grid-template-columns:1fr; }
  .authorization-missing-list > div { grid-template-columns:58px 1fr; }
  .authorization-missing-list small { grid-column:1 / -1; }
  .authorization-runtime-list > div { grid-template-columns:82px 1fr; }
  .authorization-runtime-list small { grid-column:1 / -1; }
  .invocation-audit-filter-strip .btn { width:100%; margin-left:0; }
  .invocation-audit-meta span { max-width:100%; }
  .chain-verification-grid { grid-template-columns:1fr; }
  .chain-verification-recent > div { grid-template-columns:1fr; }
}

.security-badge { font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; }
.sec-success { background: rgba(34, 197, 94, 0.08); color: var(--accent-green); }
.sec-warning { background: rgba(245, 158, 11, 0.08); color: var(--accent-yellow); }
.sec-danger { background: rgba(239, 68, 68, 0.08); color: var(--accent-red); }

.tool-desc { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }
.tool-cmd { font-size: 11px; color: var(--text-muted); font-family: 'JetBrains Mono', monospace; margin-top: 6px; padding: 8px 12px; background: rgba(0, 0, 0, 0.02); border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.04); overflow-x: auto; white-space: pre; }
.tool-prompt { font-size: 11px; color: var(--text-muted); margin-top: 6px; font-style: italic; background: rgba(0,0,0,0.01); padding: 8px; border-radius: 6px; }

/* 核心内置工具扩展参数 */
.core-tool-section { margin-top: 12px; border-top: 1px dashed rgba(0,0,0,0.03); padding-top: 10px; }
.section-lbl { font-size: 11.5px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; }
.params-grid { display: flex; flex-direction: column; gap: 4px; background: rgba(0,0,0,0.015); border-radius: 8px; padding: 8px 12px; border: 1px solid rgba(0,0,0,0.02); }
.param-row { display: grid; grid-template-columns: 180px 140px 1fr; gap: 8px; font-size: 11px; line-height: 1.4; border-bottom: 1px dashed rgba(0,0,0,0.02); padding: 4px 0; }
.param-row:last-child { border-bottom: none; }
.param-name { font-weight: 600; color: var(--accent-blue); }
.param-type { color: var(--text-muted); }
.param-desc { color: var(--text-secondary); }

/* MCP 子工具细节展示 */
.mcp-details-section { margin-top: 12px; border-top: 1px dashed rgba(0,0,0,0.04); padding-top: 10px; }
.mcp-expand-btn { padding: 4px 10px; font-size: 11px; border-radius: 6px; }
.mcp-tools-expand-box { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; background: rgba(0,0,0,0.01); border-radius: 8px; padding: 12px; border: 1px solid rgba(0,0,0,0.02); }
.mcp-subtool-card { border-bottom: 1px dashed rgba(0,0,0,0.03); padding-bottom: 10px; margin-bottom: 4px; }
.mcp-subtool-card:last-child { border-bottom: none; padding-bottom: 0; margin-bottom: 0; }
.subtool-name { font-size: 12.5px; font-weight: 700; color: var(--text-primary); }
.subtool-desc { font-size: 11.5px; color: var(--text-secondary); margin-top: 2px; }
.subtool-schema { margin-top: 8px; }
.schema-lbl { font-size: 10px; color: var(--text-muted); margin-bottom: 4px; }

/* 物理高级技能书网格 */
.custom-skills-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.skill-card-fancy { background: rgba(255,255,255,0.45); backdrop-filter: blur(25px); border: 1px solid rgba(0,0,0,0.04); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 12px; transition: all 0.25s; }
.skill-card-fancy:hover { border-color: rgba(168,85,247,0.25); box-shadow: 0 8px 24px rgba(168,85,247,0.05); transform: translateY(-1.5px); }
.skill-card-header { display: flex; align-items: center; gap: 10px; border-bottom: 1px dashed rgba(0,0,0,0.03); padding-bottom: 10px; }
.skill-icon { font-size: 24px; }
.skill-meta { flex: 1; min-width: 0; }
.skill-name { font-size: 13.5px; font-weight: 700; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.skill-id { font-size: 9.5px; color: var(--text-muted); margin-top: 1px; }
.skill-card-body { font-size: 12px; color: var(--text-secondary); line-height: 1.5; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.skill-card-footer { margin-top: auto; padding-top: 6px; }
.btn-block { width: 100%; display: block; text-align: center; }

/* 在线商城高级数据源选择器 */
.marketplace-source-selector { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; background: rgba(255,255,255,0.45); padding: 10px 16px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.04); flex-wrap: wrap; }
.marketplace-source-label, .marketplace-filter-label { font-size:12.5px; color:var(--text-secondary); font-weight:600; white-space:nowrap; }
.marketplace-source-selector select { min-width:0; max-width:100%; flex:1 1 240px; padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.08); background: #ffffff; font-size: 12px; color: var(--text-primary); outline: none; cursor: pointer; font-weight: 500; }
.marketplace-source-selector input { padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.08); background: #ffffff; font-size: 12px; outline: none; }
.marketplace-custom-source { display:flex; gap:6px; flex:1 1 100%; min-width:260px; flex-wrap:wrap; }
.marketplace-custom-source input:first-child { flex:1 1 160px; min-width:0; }
.marketplace-custom-source input:nth-child(2) { flex:3 1 320px; min-width:0; }
.marketplace-saved-source { flex:1 1 100%; min-width:0; font-size:11px; color:var(--text-muted); padding:6px 8px; border-radius:8px; background:rgba(148,163,184,.12); overflow-wrap:anywhere; }
.marketplace-source-gate { flex:1 1 100%; padding:7px 9px; border-radius:8px; background:rgba(59,130,246,.08); color:var(--text-secondary); font-size:11.5px; line-height:1.45; border:1px solid rgba(59,130,246,.12); }
.marketplace-tool-main { display:flex; align-items:flex-start; gap:10px; min-width:0; flex:1; }
.marketplace-tool-copy { min-width:0; }
.marketplace-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
.marketplace-meta { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:8px; font-size:10.5px; color:var(--text-muted); }
.marketplace-meta span { padding:2px 6px; border-radius:4px; background:rgba(148,163,184,.12); }
.marketplace-meta .trust-official { color:#047857; background:rgba(16,185,129,.10); }
.marketplace-meta .trust-community { color:#1d4ed8; background:rgba(59,130,246,.10); }
.marketplace-meta .trust-custom { color:#a16207; background:rgba(245,158,11,.12); }
.marketplace-meta .update-ready { color:#7c3aed; background:rgba(139,92,246,.12); }
.marketplace-impact-banner,
.marketplace-impact-inline { margin-bottom:14px; padding:10px 12px; border-radius:8px; background:rgba(14,165,233,.08); border:1px solid rgba(14,165,233,.16); color:var(--text-secondary); font-size:11.5px; line-height:1.45; }
.marketplace-impact-inline { margin:10px 0 0 30px; background:rgba(245,158,11,.08); border-color:rgba(245,158,11,.18); }
.marketplace-impact-banner.runtime,
.marketplace-impact-inline.runtime { background:rgba(99,102,241,.08); border-color:rgba(99,102,241,.18); }
.marketplace-impact-banner.muted,
.marketplace-impact-inline.muted { background:rgba(148,163,184,.10); border-color:rgba(148,163,184,.18); }
.marketplace-impact-head { display:flex; align-items:center; gap:8px; flex-wrap:wrap; min-width:0; }
.marketplace-impact-head span { font-weight:700; color:var(--text-primary); }
.marketplace-impact-head strong { font-weight:600; color:var(--text-secondary); overflow-wrap:anywhere; }
.marketplace-impact-scopes { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:7px; min-width:0; }
.marketplace-impact-scopes span { max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding:2px 6px; border-radius:4px; background:rgba(255,255,255,.55); color:var(--text-secondary); }
.marketplace-operations-panel { margin-bottom:16px; padding:12px; border-radius:8px; border:1px solid rgba(0,0,0,.06); background:rgba(255,255,255,.42); }
.marketplace-operations-header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; }
.marketplace-operations-header > div { display:flex; flex-direction:column; gap:2px; min-width:0; }
.marketplace-operations-actions { display:flex; align-items:center; flex-direction:row !important; gap:8px; flex:0 0 auto; }
.marketplace-operations-header strong { font-size:12.5px; color:var(--text-primary); }
.marketplace-operations-header span { font-size:11px; color:var(--text-muted); }
.marketplace-operation-list { display:grid; gap:8px; }
.marketplace-operation-row { padding:9px 10px; border-radius:8px; background:rgba(255,255,255,.42); border:1px solid rgba(0,0,0,.04); }
.marketplace-operation-main { display:flex; align-items:center; justify-content:space-between; gap:12px; min-width:0; }
.marketplace-operation-title { font-size:12px; font-weight:700; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.marketplace-operation-time { flex:0 0 auto; font-size:10.5px; color:var(--text-muted); }
.marketplace-operation-meta { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin-top:6px; font-size:10.5px; color:var(--text-muted); min-width:0; }
.marketplace-operation-meta span { max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding:2px 6px; border-radius:4px; background:rgba(148,163,184,.12); }
.marketplace-operation-meta .warn { color:#b45309; background:rgba(245,158,11,.13); }
.marketplace-preview-modal { max-width:680px; }
.preview-summary { display:flex; gap:6px; margin-bottom:14px; font-size:11px; color:var(--text-muted); }
.preview-summary span { padding:3px 7px; border-radius:4px; background:rgba(148,163,184,.12); }
.preview-table { border:1px solid rgba(0,0,0,.06); border-radius:8px; overflow:hidden; }
.preview-row { display:grid; grid-template-columns:120px minmax(0,1fr); gap:12px; padding:9px 12px; border-bottom:1px solid rgba(0,0,0,.05); font-size:11.5px; }
.preview-row:last-child { border-bottom:none; }
.preview-row > span { color:var(--text-muted); }
.preview-row code { color:var(--text-primary); overflow-wrap:anywhere; white-space:pre-wrap; }
.preview-content { max-height:320px; overflow:auto; margin:14px 0 0; padding:12px; border:1px solid rgba(0,0,0,.06); border-radius:8px; background:rgba(0,0,0,.025); color:var(--text-secondary); font-size:11px; line-height:1.5; white-space:pre-wrap; }
.mfilter-tab { display: flex; background: rgba(0,0,0,0.04); padding: 3px; border-radius: 8px; gap: 2px; }
.mfilter-tab button { padding: 4px 10px; border-radius: 6px; font-size: 11px; border: none; cursor: pointer; font-weight: 600; background: transparent; color: var(--text-secondary); transition: all 0.2s; }
.mfilter-tab button.active { background: #ffffff; color: var(--accent-blue); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
@container (max-width: 760px) {
  .marketplace-filter-label { margin-left:0; }
  .mfilter-tab { flex:1 1 100%; }
  .mfilter-tab button { flex:1; min-width:0; white-space:nowrap; }
  .marketplace-custom-source { min-width:0; }
  .marketplace-custom-source .btn { flex:1 1 120px; }
  .marketplace-tool .tool-header { display:grid; grid-template-columns:minmax(0,1fr); }
  .marketplace-actions { justify-content:flex-start; }
}

.smithery-activation-card { margin-bottom: 16px; background: rgba(255,255,255,0.45); backdrop-filter: blur(25px); border: 1px solid rgba(59,130,246,0.18); border-radius: 12px; padding: 20px; box-shadow: 0 8px 30px rgba(59,130,246,0.04); }
.smithery-activation-card a { color: var(--accent-blue); text-decoration: none; margin-left: 4px; font-weight: 600; }
.smithery-activation-card input { padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.08); background: #ffffff; font-size: 12.5px; outline: none; }

/* 侧滑抽屉样式 (Slide-out Drawer) */
.drawer-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.12); z-index: 10002; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; backdrop-filter: blur(4px); }
.drawer-overlay.show { opacity: 1; pointer-events: auto; }
.drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 85%; max-width: 580px; background: rgba(255, 255, 255, 0.75) !important; backdrop-filter: blur(35px) !important; border-left: 1px solid rgba(0, 0, 0, 0.06); box-shadow: -15px 0 40px rgba(15, 23, 42, 0.06); display: flex; flex-direction: column; transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); z-index: 10003; }
.drawer.show { transform: translateX(0); }
.drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 24px; border-bottom: 1px solid rgba(0, 0, 0, 0.05); }
.drawer-title { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.drawer-subtitle { font-size: 10px; color: var(--text-muted); margin-top: 2px; }
.drawer-close { width: 30px; height: 30px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.05); background: rgba(0,0,0,0.02); color: var(--text-secondary); cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; }
.drawer-body { flex: 1; overflow-y: auto; padding: 24px; }

/* Markdown 手册格式 */
.markdown-body { font-size: 12.5px; line-height: 1.6; color: var(--text-secondary); }
.markdown-body :deep(.md-h1) { font-size: 18px; font-weight: 700; color: var(--text-primary); border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 8px; margin: 0 0 16px; }
.markdown-body :deep(.md-h2) { font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 20px 0 12px; }
.markdown-body :deep(.md-h3) { font-size: 13.5px; font-weight: 700; color: var(--text-primary); margin: 16px 0 10px; }
.markdown-body :deep(.md-p) { margin: 0 0 12px; text-align: justify; }
.markdown-body :deep(.md-li) { margin-bottom: 6px; list-style-type: square; margin-left: 18px; }
.markdown-body :deep(.md-inline-code) { padding: 2px 5px; background: rgba(0,0,0,0.04); border-radius: 4px; font-size: 11.5px; color: var(--accent-blue); }
.markdown-body :deep(.md-code) { padding: 12px 16px; background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.04); border-radius: 10px; overflow-x: auto; margin: 12px 0; font-size: 11.5px; line-height: 1.4; color: var(--text-primary); }
.markdown-body :deep(.md-link) { color: var(--accent-blue); text-decoration: none; font-weight: 600; border-bottom: 1px dashed var(--accent-blue); }

/* 通用列表与弹窗等样式 */
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 260px; color: var(--text-muted); gap: 8px; font-size: 12.5px; }
.empty .icon { font-size: 36px; opacity: 0.3; }
.empty-sm { text-align: center; padding: 20px 10px; font-size: 11.5px; color: var(--text-muted); }
.modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.18); display: flex; align-items: center; justify-content: center; z-index: 10001; backdrop-filter: blur(12px); }
.modal { background: rgba(255, 255, 255, 0.75) !important; backdrop-filter: blur(30px) !important; border: 1px solid rgba(0, 0, 0, 0.06) !important; border-radius: 16px !important; padding: 28px; width: 90%; max-width: 480px; position: relative; box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08), 0 0 30px rgba(59, 130, 246, 0.04) !important; max-height: 88vh; overflow-y: auto; }
.modal h3 { margin: 0 0 20px; font-size: 14px; font-weight: 600; color: var(--text-primary); }
.modal-close { position: absolute; top: 16px; right: 16px; width: 28px; height: 28px; border-radius: 8px; border: 1px solid rgba(0, 0, 0, 0.05); background: rgba(0,0,0,0.02); color: var(--text-secondary); cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; }
.form-group { margin-bottom: 18px; }
.form-group label { display: block; font-size: 12.5px; color: var(--text-secondary); margin-bottom: 8px; font-weight: 500; }
.form-group input, .form-group textarea { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid rgba(0, 0, 0, 0.08); background: rgba(255, 255, 255, 0.8); color: var(--text-primary); font-size: 13px; outline: none; font-family: inherit; }
.form-group input:focus, .form-group textarea:focus { border-color: rgba(59, 130, 246, 0.3); box-shadow: 0 0 12px rgba(59, 130, 246, 0.12); }
.form-hint { font-size: 11px; color: var(--text-muted); margin-top: 6px; }
.form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; }
.btn { padding: 8px 16px; border-radius: 10px; border: none; cursor: pointer; font-size: 13px; transition: all 0.2s; font-weight: 500; }
.btn-primary { background: var(--gradient-blue); color: #ffffff; font-weight: 600; }
.btn-danger { background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.18); color: #dc2626; }
.btn-cancel { background: rgba(0,0,0,0.02); border: 1px solid rgba(0, 0, 0, 0.06); color: var(--text-secondary); }
.btn-outline { background: transparent; border: 1px solid rgba(0, 0, 0, 0.08); color: var(--text-secondary); }
.btn-sm { padding: 5px 10px; font-size: 11.5px; border-radius: 8px; }
.toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  user-select: none;
}
.toggle input {
  appearance: none;
  -webkit-appearance: none;
  width: 34px;
  height: 18px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 9px;
  position: relative;
  outline: none;
  cursor: pointer;
  transition: background 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
  margin: 0;
}
:global([data-theme="dark"]) .toggle input {
  background: rgba(255, 255, 255, 0.08);
}
.toggle input::before {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ffffff;
  top: 3px;
  left: 3px;
  transition: transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1.25), width 0.2s, left 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}
.toggle input:checked {
  background: var(--accent-blue);
}
.toggle input:checked::before {
  transform: translateX(16px);
}
.toggle:hover input::before {
  transform: scale(1.08);
}
.toggle:hover input:checked::before {
  transform: translateX(16px) scale(1.08);
}
.toggle:active input::before {
  width: 15px;
}
.toggle input:checked:active::before {
  transform: translateX(13px);
  width: 15px;
}

/* 暗色模式兼容 */
[data-theme="dark"] .sidebar,
[data-theme="dark"] .tool-card,
[data-theme="dark"] .skill-card-fancy,
[data-theme="dark"] .authorization-status-strip,
[data-theme="dark"] .authorization-grants > div,
[data-theme="dark"] .marketplace-source-selector,
[data-theme="dark"] .marketplace-saved-source,
[data-theme="dark"] .marketplace-source-gate,
[data-theme="dark"] .marketplace-impact-banner,
[data-theme="dark"] .marketplace-impact-inline,
[data-theme="dark"] .marketplace-operations-panel,
[data-theme="dark"] .marketplace-operation-row,
[data-theme="dark"] .invocation-audit-meta span,
[data-theme="dark"] .chain-verification-grid > div,
[data-theme="dark"] .chain-verification-recent > div,
[data-theme="dark"] .smithery-activation-card,
[data-theme="dark"] .drawer,
[data-theme="dark"] .params-grid,
[data-theme="dark"] .mcp-tools-expand-box {
  background: var(--surface) !important;
  border-color: var(--border-color) !important;
}
[data-theme="dark"] .category-item:hover {
  background: rgba(255,255,255,0.02) !important;
}
[data-theme="dark"] .category-item.active {
  background: rgba(255,255,255,0.05) !important;
}
[data-theme="dark"] .marketplace-source-selector select,
[data-theme="dark"] .marketplace-source-selector input,
[data-theme="dark"] .smithery-activation-card input,
[data-theme="dark"] .form-group input,
[data-theme="dark"] .form-group textarea {
  background: var(--bg-primary) !important;
  border-color: var(--border-color) !important;
  color: var(--text-primary) !important;
}
[data-theme="dark"] .markdown-body :deep(.md-code),
[data-theme="dark"] .tool-cmd {
  background: rgba(0, 0, 0, 0.25) !important;
  border-color: rgba(255,255,255,0.05) !important;
  color: #a7f3d0 !important;
}
[data-theme="dark"] .markdown-body :deep(.md-inline-code) {
  background: rgba(255, 255, 255, 0.06) !important;
}
[data-theme="dark"] .marketplace-impact-scopes span {
  background: rgba(255, 255, 255, 0.06);
}

@media (max-width: 820px) {
  .main-content { flex-direction: column; }
  .sidebar { width: 100% !important; border-right: none !important; border-bottom: 1px solid rgba(0, 0, 0, 0.05); }
  .category-list { display: flex; flex-direction: row; overflow-x: auto; padding: 6px; }
  .category-item { white-space: nowrap; }
  .drawer { width: 100% !important; }
  .marketplace-actions { width:100%; justify-content:flex-start; padding-left:30px; }
  .marketplace-impact-inline { margin-left:0; }
  .marketplace-operations-header,
  .marketplace-operation-main { align-items:flex-start; flex-direction:column; gap:6px; }
  .preview-row { grid-template-columns:1fr; gap:4px; }
}
</style>
