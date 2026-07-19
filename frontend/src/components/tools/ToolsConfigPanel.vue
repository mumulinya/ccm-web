<script setup>
import { ref, onMounted, computed } from 'vue'
import {
  Activity,
  Blocks,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  Cpu,
  ExternalLink,
  LayoutDashboard,
  ListChecks,
  Package,
  PackageOpen,
  Plug,
  RefreshCw,
  ScrollText,
  Search,
  Server,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TriangleAlert,
  Wrench,
} from '@lucide/vue'
import { toolsApi } from '../../api/index.js'
import { toast, confirmDialog } from '../../utils/toast.js'
import EmptyState from '../common/EmptyState.vue'
import LoadingSkeleton from '../common/LoadingSkeleton.vue'
import ToolControlOverview from './ToolControlOverview.vue'
import McpServerEditor from './McpServerEditor.vue'
import SkillMarkdownViewer from './SkillMarkdownViewer.vue'
import InternalMcpCatalog from './InternalMcpCatalog.vue'

const emit = defineEmits(['navigate'])

const mcpTools = ref([])
const internalMcpCatalog = ref({ items: [], summary: { total: 0, ready: 0, needs_configuration: 0, unavailable: 0, tools: 0 } })
const internalMcpLoading = ref(false)
const skills = ref([])
const customSkills = ref([]) // 本地物理加载的高级 Customization Skills
const currentFilter = ref('overview')
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
const realCliMatrix = ref({ status: 'not_run', complete: false, running: false, results: [] })
const realCliMatrixLoading = ref(false)
const goalAudit = ref({ status: 'loading', complete: false, requirements: [] })
const goalAuditLoading = ref(false)

// 抽屉状态
const showDrawer = ref(false)
const drawerSkill = ref(null)
const openingSkillManual = ref('')

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
const marketplaceLoading = ref(false)
const marketplaceError = ref('')
const marketplaceQuery = ref('')
const marketplaceCategory = ref('all')
const marketplaceSort = ref('popular')
const marketplacePagination = ref({ page: 1, pageSize: 12, total: 0, totalPages: 1, hasPrevious: false, hasNext: false })
const marketplaceSourceStatus = ref(null)
let marketplaceRequestSequence = 0

// 弹窗状态
const showAddMcp = ref(false)
const showAddSkill = ref(false)
const editingMcp = ref(null)

// 新建表单
const newSkill = ref({ name: '', description: '', prompt: '' })

const isInternalSkill = (skill) => skill?.origin === 'internal'
  || skill?.scope === 'ccm-internal'
  || skill?.immutable === true
  || skill?.systemManaged === true
const internalSkills = computed(() => skills.value.filter(isInternalSkill))
const externalSkills = computed(() => skills.value.filter(skill => !isInternalSkill(skill)))
const internalMcpNames = computed(() => new Set((internalMcpCatalog.value.items || []).map(item => item.name)))
const isBundledInternalMcp = (item) => item?.type === 'mcp' && internalMcpNames.value.has(item.name)
const externalSkillLabel = (skill) => skill?.origin === 'external' || skill?.sourceType === 'marketplace'
  ? '外部下载'
  : '用户创建'

const sectionMeta = computed(() => ({
  overview: ['工具运行概况', '查看连接、授权与 Agent 执行链路的整体健康状态'],
  core: ['内置核心工具', '由 CCM 提供并受系统管理的基础工具'],
  'internal-mcp': ['内部 MCP', '随项目安装并由 CCM 管理的 MCP 服务'],
  mcp: ['外部 MCP', '配置外部服务及客户端连接'],
  authorization: ['授权总览', '核对项目与群聊可使用的 MCP 和 Skill'],
  'chain-verification': ['链路验收', '验证授权、运行时与真实调用是否完整贯通'],
  'invocation-audit': ['调用审计', '查看子 Agent 最近的工具与 Skill 调用记录'],
  runtime: ['Agent 运行时', '检查第三方 Agent 的 CLI、授权交付与目录同步状态'],
  'custom-skills': ['外部 Skill 包', '管理下载到本机的 Skill 包'],
  'custom-prompt': ['Skill 管理', '管理内置和外部 Prompt Skill'],
  marketplace: ['技能商城', '发现并安装可用的 Skill 与 MCP'],
}[currentFilter.value] || ['工具与技能', '管理 Agent 可使用的能力']))

const runtimeNeedsAttention = computed(() => Math.max(
  0,
  Number(runtimeReadiness.value.summary?.total || 0) - Number(runtimeReadiness.value.summary?.ready || 0),
))
const runtimeRows = computed(() => [...(runtimeReadiness.value.readiness || [])].sort((left, right) => {
  if (left.overallReady !== right.overallReady) return left.overallReady ? 1 : -1
  return String(left.runtime || '').localeCompare(String(right.runtime || ''))
}))
const runtimeChecks = (item) => Array.isArray(item?.checks) ? item.checks : []
const runtimePassingChecks = (item) => runtimeChecks(item).filter(check => check?.ok).length
const runtimeFailedChecks = (item) => runtimeChecks(item).filter(check => !check?.ok)
const runtimeOrderedChecks = (item) => [...runtimeChecks(item)].sort((left, right) => Number(left?.ok) - Number(right?.ok))

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
  internalMcpLoading.value = true
  const [mcpData, skillData, internalMcpData] = await Promise.all([
    toolsApi.mcp.list(),
    toolsApi.skills.list(),
    toolsApi.internalMcp()
  ]).finally(() => { internalMcpLoading.value = false })
  mcpTools.value = (mcpData.tools || []).map(t => ({ ...t, type: 'mcp', enabled: t.enabled !== false }))
  skills.value = (skillData.skills || []).map(s => ({ ...s, type: 'skill', enabled: s.enabled !== false }))
  internalMcpCatalog.value = internalMcpData || { items: [], summary: {} }
  
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
    loadToolChainVerification(),
    loadRealCliMatrix(),
    loadGoalAudit()
  ])

  await loadMarketplaceSources()
  await loadMarketplaceOperations()
  if (!['local', 'github', 'skills-sh', 'smithery', 'custom'].includes(selectedSource.value)
    && !marketplaceSources.value.some(source => source.id === selectedSource.value)) {
    selectedSource.value = 'local'
  }
  await loadMarketplace()
}

const loadMarketplace = async () => {
  const requestId = ++marketplaceRequestSequence
  const sourceForLoad = selectedSource.value
  const customUrlForLoad = customSourceUrl.value.trim()
  const customLabelForLoad = customSourceLabel.value.trim()
  if (sourceForLoad !== 'custom') {
    loadedCustomSourceUrl.value = ''
    loadedCustomSourceLabel.value = ''
  }
  if (sourceForLoad === 'custom' && !customUrlForLoad) {
    marketplaceItems.value = []
    marketplaceError.value = ''
    marketplaceSourceStatus.value = null
    marketplacePagination.value = { page: 1, pageSize: 12, total: 0, totalPages: 1, hasPrevious: false, hasNext: false }
    return
  }
  marketplaceLoading.value = true
  marketplaceError.value = ''
  try {
    const res = await toolsApi.marketplace.list(sourceForLoad, customUrlForLoad, {
      query: marketplaceQuery.value.trim(),
      page: marketplacePagination.value.page,
      pageSize: marketplacePagination.value.pageSize,
      category: marketplaceCategory.value,
      sort: marketplaceSort.value
    })
    if (requestId !== marketplaceRequestSequence) return
    if (!res.success) throw new Error(res.error || '商城暂时不可用')
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
    marketplacePagination.value = res.pagination || { page: 1, pageSize: 12, total: marketplaceItems.value.length, totalPages: 1, hasPrevious: false, hasNext: false }
    marketplaceSourceStatus.value = res.sourceStatus || null
  } catch (e) {
    if (requestId !== marketplaceRequestSequence) return
    marketplaceItems.value = []
    marketplaceError.value = e.message || '商城暂时不可用，请稍后重试'
    marketplaceSourceStatus.value = null
  } finally {
    if (requestId === marketplaceRequestSequence) marketplaceLoading.value = false
  }
}

const loadGoalAudit = async () => {
  goalAuditLoading.value = true
  try { goalAudit.value = await toolsApi.goalAudit() }
  catch (error) { console.error('加载工具目标验收失败:', error) }
  finally { goalAuditLoading.value = false }
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

const loadRealCliMatrix = async () => {
  try {
    const res = await toolsApi.realCliMatrix.status()
    if (res.success) realCliMatrix.value = res
  } catch (e) {
    console.error('加载第三方 Agent 工具验收状态失败:', e)
  }
}

const waitForRealCliMatrix = async () => {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 3000))
    await loadRealCliMatrix()
    if (!realCliMatrix.value.running) return
  }
}

const runRealCliMatrix = async () => {
  const confirmed = await confirmDialog('将依次调用 Claude Code、Cursor 和 Codex，真实验证 MCP 与 Skill。过程可能需要几分钟，是否继续？')
  if (!confirmed) return
  realCliMatrixLoading.value = true
  try {
    const res = await toolsApi.realCliMatrix.run()
    if (!res.success) throw new Error(res.error || '验收启动失败')
    realCliMatrix.value = res.status || realCliMatrix.value
    toast.success(res.accepted ? '真实工具验收已启动' : '真实工具验收正在运行')
    await waitForRealCliMatrix()
    await Promise.all([loadToolChainVerification(), loadRuntimeReadiness(false)])
    if (realCliMatrix.value.complete) toast.success('三种第三方 Agent 的 MCP 与 Skill 真实验收已通过', 6000)
    else toast.warning('真实工具验收未全部通过，请查看各运行时状态', 6000)
  } catch (e) {
    toast.error('真实工具验收失败: ' + e.message)
  } finally {
    realCliMatrixLoading.value = false
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
const authorizationConfiguredReady = computed(() => Math.max(0, Number(authorizationSummary.value.configuredScopes || 0) - Number(authorizationSummary.value.needsAttention || 0)))
const businessRuntimeSummary = computed(() => chainVerificationRows.value
  .filter(row => Number(row?.counts?.mcp || 0) + Number(row?.counts?.skill || 0) > 0)
  .reduce((summary, row) => ({
    total: summary.total + Number(row?.runtime?.summary?.total || 0),
    ready: summary.ready + Number(row?.runtime?.summary?.overallReady || 0),
  }), { total: 0, ready: 0 }))

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
  auth: ['ready_not_observed', 'verification_incomplete'].includes(row?.status)
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
  const mcp = summary.requiresMcp ? (summary.mcpVerified ? 'MCP 已通过' : 'MCP 未通过') : 'MCP 未配置'
  const skill = summary.requiresSkill ? (summary.skillVerified ? 'Skill 已通过' : 'Skill 未通过') : 'Skill 未配置'
  return `${mcp} · ${skill} · 越权 ${Number(summary.unauthorized || 0)}`
}

const realCliRuntimeLabel = (runtime) => ({ claudecode: 'Claude Code', cursor: 'Cursor', codex: 'Codex' }[runtime] || runtime || '-')
const realCliResultLabel = (row) => {
  if (realCliMatrix.value.running && !row.checked_at) return '等待中'
  if (row.success && row.fresh) return '真实调用已通过'
  if (row.success && !row.versionMatches) return 'CLI 已升级，需重验'
  if (row.success) return '证据已过期'
  if (row.cliAvailable === false) return 'CLI 不可用'
  return row.checked_at ? '真实调用未通过' : '尚未验收'
}
const realCliResultClass = (row) => ({ connected: row.success && row.fresh, auth: row.success && !row.fresh, failed: !!row.checked_at && !row.success })

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
    return
  }
  if (action?.kind === 'open_scope_real_task') {
    const scope = action.scope || row?.scope
    const scopeId = action.scopeId || row?.id || ''
    const scopeName = action.scopeName || row?.name || scopeId
    if (scope === 'group') {
      toast.info(`请在“${scopeName}”中执行一次会调用已授权 MCP 与 Skill 的真实任务，完成后验收状态会根据审计证据更新。`, 7000)
      emit('navigate', { tab: 'groups', groupId: scopeId })
      return
    }
    toast.info(`请在“${scopeName}”中执行一次会调用已授权 MCP 与 Skill 的真实任务，完成后验收状态会根据审计证据更新。`, 7000)
    emit('navigate', { tab: 'projects', project: scopeId })
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

const marketplaceOnlineSource = computed(() => ['skills-sh', 'smithery'].includes(selectedSource.value))

const marketplaceCategories = computed(() => selectedSource.value === 'skills-sh'
  ? [
      { id: 'all', label: '热门' },
      { id: 'development', label: '开发' },
      { id: 'design', label: '设计' },
      { id: 'data', label: '数据' },
      { id: 'writing', label: '写作' },
      { id: 'productivity', label: '效率' }
    ]
  : [
      { id: 'all', label: '全部' },
      { id: 'development', label: '开发' },
      { id: 'data', label: '数据' },
      { id: 'automation', label: '自动化' },
      { id: 'productivity', label: '效率' },
      { id: 'communication', label: '沟通' }
    ])

const marketplaceSearchPlaceholder = computed(() => selectedSource.value === 'skills-sh'
  ? '搜索 Skill，例如 React、测试、文档'
  : '搜索 MCP，例如 GitHub、浏览器、飞书')

const onSourceChange = () => {
  marketplaceQuery.value = ''
  marketplaceCategory.value = 'all'
  marketplaceSort.value = 'popular'
  marketplacePagination.value.page = 1
  if (selectedSource.value !== 'custom' || customSourceUrl.value) loadMarketplace()
}

const searchMarketplace = () => {
  marketplacePagination.value.page = 1
  loadMarketplace()
}

const selectMarketplaceCategory = (category) => {
  if (marketplaceCategory.value === category) return
  marketplaceCategory.value = category
  marketplacePagination.value.page = 1
  loadMarketplace()
}

const changeMarketplaceSort = () => {
  marketplacePagination.value.page = 1
  loadMarketplace()
}

const changeMarketplacePage = (page) => {
  const next = Math.max(1, Math.min(Number(page || 1), Number(marketplacePagination.value.totalPages || 1)))
  if (next === marketplacePagination.value.page) return
  marketplacePagination.value.page = next
  loadMarketplace()
}

const formatMarketplaceCount = (value) => {
  const count = Number(value || 0)
  if (count >= 1000000) return `${(count / 1000000).toFixed(count >= 10000000 ? 0 : 1)}m`
  if (count >= 1000) return `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}k`
  return String(count)
}

const marketplaceDisplayName = (item) => item?.displayName || item?.name || '未命名工具'

const marketplaceCanRefresh = (item) => marketplaceOnlineSource.value && isInstalled(item)

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
  if (item.updateAvailable) return '更新'
  if (marketplaceCanRefresh(item)) return '重新同步'
  return '安装'
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
  if (isBundledInternalMcp(item)) return true
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
    const isUpdate = item.updateAvailable === true || marketplaceCanRefresh(item)
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
  const previous = tool.enabled
  tool.enabled = !previous
  try {
    if (type === 'mcp') await toolsApi.mcp.create({ name: tool.name, enabled: tool.enabled })
    else await toolsApi.skills.create({ name: tool.name, enabled: tool.enabled })
    toast.success(tool.enabled ? '已启用并同步到运行时' : '已停用并同步到运行时')
    await loadTools()
  } catch (error) {
    tool.enabled = previous
    toast.error(`操作失败，已恢复原状态：${error.message}`)
  }
}

const deleteTool = async (type, name) => {
  try {
    const preview = await toolsApi.catalogImpact({ action: 'delete', type, name })
    const count = Number(preview.authorizationImpact?.summary?.scopeCount || 0)
    const impactText = count ? `当前有 ${count} 个项目或群聊正在使用它，删除后相关 Agent 将暂时无法调用。` : '当前没有项目或群聊依赖它。'
    const confirmed = await confirmDialog(`确定删除 "${name}"？${impactText}`)
    if (!confirmed) return
    if (type === 'mcp') await toolsApi.mcp.delete(name)
    else await toolsApi.skills.delete(name)
    await loadTools()
    toast.success('已删除并同步相关运行时')
  } catch (error) { toast.error(`删除失败，原配置已保留：${error.message}`) }
}

const openMcpEditor = (tool = null) => {
  editingMcp.value = tool ? { ...tool } : null
  showAddMcp.value = true
}

const closeMcpEditor = () => {
  showAddMcp.value = false
  editingMcp.value = null
}

const handleMcpSaved = async () => {
  await loadTools()
}

const submitAddSkill = async () => {
  if (!newSkill.value.name) { toast.warning('请输入名称'); return }
  try {
    await toolsApi.skills.create({ ...newSkill.value, enabled: true, createOnly: true })
    showAddSkill.value = false
    newSkill.value = { name: '', description: '', prompt: '' }
    await loadTools()
    toast.success('Skill 已添加并同步')
  } catch (error) { toast.error(`添加失败：${error.message}`) }
}

const testMcp = async (tool) => {
  toast.info('正在测试连接...')
  try {
    const data = await toolsApi.mcp.test({ name: tool.name })
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

const openCatalogSkillManual = async (skill) => {
  openingSkillManual.value = skill.name
  try {
    const res = await toolsApi.skills.getManual(skill.name)
    if (!res.success || !res.skill) throw new Error(res.error || 'Skill 手册加载失败')
    openSkillManual(res.skill)
  } catch (error) {
    toast.error(`无法查看 Skill：${error.message}`)
  } finally {
    openingSkillManual.value = ''
  }
}

onMounted(loadTools)
</script>

<template src="./ToolsConfig.template.html"></template>

<style scoped src="./ToolsConfig.css"></style>
